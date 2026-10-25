import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, crmBloqueado } from '@/lib/apiAuth'
import { MINUTOS_DONO } from '@/lib/crm'
import {
  garantirPastaCurriculos, candidatosPorId, conversaDoCandidato, conversasDosCandidatos,
  resumoPorTelefone, enviadasHoje, primeiroNome, MAX_POR_LOTE, MAX_POR_DIA,
} from '@/lib/crmCurriculos'

export const dynamic = 'force-dynamic'

// ── Candidatos dentro do CRM ────────────────────────────────────────────────
//
// GET   resumo por telefone (tem conversa? tem mensagem nova?) para a lista.
// POST  { acao: 'abrir', id }          abre (ou cria) a conversa do candidato.
//       { acao: 'enviar', ids, texto } mensagem para vários, em fila, devagar.
//
// Nada aqui guarda conversa própria: tudo cai em crm_conversas/crm_mensagens e
// sai pela mesma ponte do WhatsApp. Ver src/lib/crmCurriculos.ts.

async function permitido() {
  const sess = await getSessao()
  if (!sess) return { erro: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  if (await crmBloqueado()) {
    return { erro: NextResponse.json({ error: 'Este acesso não tem o CRM liberado. Peça ao dono em Usuários e Permissões.' }, { status: 403 }) }
  }
  return { sess }
}

export async function GET() {
  const { sess, erro } = await permitido()
  if (erro) return erro
  const conversas = await conversasDosCandidatos(sess!.salaoId)
  return NextResponse.json({ por_telefone: resumoPorTelefone(conversas) })
}

export async function POST(req: NextRequest) {
  const { sess, erro } = await permitido()
  if (erro) return erro
  const salaoId = sess!.salaoId
  const body = await req.json().catch(() => ({}))

  if (body?.acao === 'abrir') {
    const [c] = await candidatosPorId([String(body?.id || '')])
    if (!c) return NextResponse.json({ error: 'Candidato não encontrado.' }, { status: 404 })
    await garantirPastaCurriculos(salaoId)
    const r = await conversaDoCandidato(salaoId, c)
    if (!r) return NextResponse.json({ error: 'Este currículo está sem telefone válido.' }, { status: 400 })
    return NextResponse.json({ ok: true, conversa: r.conversa })
  }

  if (body?.acao === 'enviar') {
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : []
    const modelo = String(body?.texto || '').trim()
    if (!modelo) return NextResponse.json({ error: 'Escreva a mensagem.' }, { status: 400 })
    if (!ids.length) return NextResponse.json({ error: 'Escolha pelo menos um candidato.' }, { status: 400 })
    if (ids.length > MAX_POR_LOTE) {
      return NextResponse.json({ error: `No máximo ${MAX_POR_LOTE} pessoas por vez, para o WhatsApp não bloquear o número.` }, { status: 400 })
    }

    const jaHoje = await enviadasHoje(salaoId)
    if (jaHoje + ids.length > MAX_POR_DIA) {
      return NextResponse.json({
        error: `Limite do dia: ${MAX_POR_DIA} mensagens para candidatos (já saíram ${jaHoje}). Continue amanhã.`,
      }, { status: 429 })
    }

    await garantirPastaCurriculos(salaoId)
    const candidatos = await candidatosPorId(ids)
    const quem = sess!.nome || 'Salão'
    const ate24h = new Date(Date.now() - 24 * 3600e3).toISOString()

    // Uma mensagem a cada 25-45 s: a ponte só pega a que já venceu (criado_em),
    // então elas saem espaçadas, como uma pessoa escrevendo.
    let quando = Date.now()
    const enviados: string[] = []
    const pulados: { nome: string; motivo: string }[] = []

    for (const c of candidatos) {
      try {
        const texto = modelo
          .replace(/\{nome\}/gi, primeiroNome(c.nome))
          .replace(/\{vaga\}/gi, c.vaga)
        const r = await conversaDoCandidato(salaoId, c)
        if (!r) { pulados.push({ nome: c.nome, motivo: 'sem telefone válido' }); continue }

        // Mesma mensagem para a mesma pessoa em 24 h: não manda de novo.
        const { count } = await supabaseAdmin.from('crm_mensagens').select('id', { count: 'exact', head: true })
          .eq('conversa_id', r.conversa).eq('direcao', 'saida').eq('texto', texto).gte('criado_em', ate24h)
        if (count) { pulados.push({ nome: c.nome, motivo: 'já recebeu esta mensagem hoje' }); continue }

        const { error: e1 } = await supabaseAdmin.from('crm_mensagens').insert({
          salao_id: salaoId, conversa_id: r.conversa, direcao: 'saida', texto, tipo: 'texto',
          situacao: 'na_fila', autor_id: sess!.usuarioId || null, autor_nome: quem,
          criado_em: new Date(quando).toISOString(),
        })
        if (e1) { pulados.push({ nome: c.nome, motivo: 'erro ao enfileirar' }); continue }

        const agora = new Date().toISOString()
        await supabaseAdmin.from('crm_conversas').update({
          aguardando_desde: null, ultima_em: agora, ultima_de: 'salao',
          ultima_previa: texto.slice(0, 120), nao_lidas: 0,
          dono_id: sess!.usuarioId || null, dono_nome: quem,
          dono_ate: new Date(Date.now() + MINUTOS_DONO * 60000).toISOString(),
          atualizado_em: agora,
        }).eq('id', r.conversa)
        await supabaseAdmin.from('crm_eventos').insert({
          salao_id: salaoId, conversa_id: r.conversa, tipo: 'respondeu',
          autor_id: sess!.usuarioId || null, autor_nome: quem, detalhe: 'Mensagem em lote (Currículos)',
        })
        enviados.push(c.nome)
        quando += (25 + Math.floor(Math.random() * 21)) * 1000
      } catch {
        pulados.push({ nome: c.nome, motivo: 'erro inesperado' })
      }
    }

    return NextResponse.json({
      ok: true, enviados: enviados.length, pulados,
      minutos: Math.max(1, Math.ceil((quando - Date.now()) / 60000)),
    })
  }

  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 })
}
