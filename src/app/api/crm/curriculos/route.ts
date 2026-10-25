import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, crmBloqueado } from '@/lib/apiAuth'
import { MINUTOS_DONO } from '@/lib/crm'
import {
  garantirPastaCurriculos, candidatosPorId, conversaDoCandidato, conversasDosCandidatos,
  resumoPorTelefone, enviadasHoje, primeiroNome, MAX_POR_LOTE, MAX_POR_DIA,
  conversaDeCandidato, mensagensDoCandidato, PASTA_CURRICULOS,
  lerConfigCurriculos, salvarConfigCurriculos, conversasDoTelefonePrincipal, definirTriagem,
  arquivosDosCandidatos, excluirArquivos, distribuirModelos,
} from '@/lib/crmCurriculos'
import { ehEstadoDoSalao } from '@/lib/crmEstados'

export const dynamic = 'force-dynamic'

// ── Candidatos dentro do CRM ────────────────────────────────────────────────
//
// Tudo da tela de Currículos passa por aqui. Nada guarda conversa própria:
// grava em crm_conversas/crm_mensagens e sai pela mesma ponte do WhatsApp.
// O CRM principal não é tocado. Ver src/lib/crmCurriculos.ts.

async function permitido() {
  const sess = await getSessao()
  if (!sess) return { erro: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }
  if (await crmBloqueado()) {
    return { erro: NextResponse.json({ error: 'Este acesso não tem o CRM liberado. Peça ao dono em Usuários e Permissões.' }, { status: 403 }) }
  }
  return { sess }
}

const TIPOS_DE_MIDIA = ['imagem', 'video', 'audio', 'documento']

export async function GET(req: NextRequest) {
  const { sess, erro } = await permitido()
  if (erro) return erro
  const salaoId = sess!.salaoId
  const q = new URL(req.url).searchParams

  // ?conversa=<id>: as mensagens de UM candidato (e marca como lida).
  const conversaId = q.get('conversa')
  if (conversaId) {
    const conv = await conversaDeCandidato(salaoId, conversaId)
    if (!conv) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })
    if ((conv.nao_lidas || 0) > 0) {
      await supabaseAdmin.from('crm_conversas').update({ nao_lidas: 0 }).eq('id', conversaId)
    }
    return NextResponse.json({ mensagens: await mensagensDoCandidato(salaoId, conversaId) })
  }

  // ?arquivos=1: o que os candidatos mandaram, com o peso de cada um.
  if (q.get('arquivos')) {
    return NextResponse.json(await arquivosDosCandidatos(salaoId))
  }

  const conversas = await conversasDosCandidatos(salaoId)
  return NextResponse.json({
    por_telefone: resumoPorTelefone(conversas),
    principal: await conversasDoTelefonePrincipal(salaoId),
    config: await lerConfigCurriculos(salaoId),
  })
}

export async function POST(req: NextRequest) {
  const { sess, erro } = await permitido()
  if (erro) return erro
  const salaoId = sess!.salaoId
  const body = await req.json().catch(() => ({}))
  const quem = sess!.nome || 'Salão'

  // Cria a pasta "Currículos" no CRM do salão (só um registro de configuração),
  // para o botão aparecer na conversa de quem escreve para o telefone principal.
  if (body?.acao === 'preparar') {
    await garantirPastaCurriculos(salaoId)
    return NextResponse.json({ ok: true })
  }

  if (body?.acao === 'abrir') {
    const [c] = await candidatosPorId([String(body?.id || '')])
    if (!c) return NextResponse.json({ error: 'Candidato não encontrado.' }, { status: 404 })
    await garantirPastaCurriculos(salaoId)
    const r = await conversaDoCandidato(salaoId, c)
    if (!r) return NextResponse.json({ error: 'Este currículo está sem telefone válido.' }, { status: 400 })
    return NextResponse.json({ ok: true, conversa: r.conversa })
  }

  if (body?.acao === 'responder') {
    const texto = String(body?.texto || '').trim()
    const midia = String(body?.midia_url || '').trim() || null
    const tipo = midia ? (TIPOS_DE_MIDIA.includes(String(body?.tipo)) ? String(body.tipo) : 'documento') : 'texto'
    if (!texto && !midia) return NextResponse.json({ error: 'Escreva algo ou anexe um arquivo.' }, { status: 400 })
    const conv = await conversaDeCandidato(salaoId, String(body?.conversa || ''))
    if (!conv) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })
    const agora = new Date().toISOString()
    const { error: e1 } = await supabaseAdmin.from('crm_mensagens').insert({
      salao_id: salaoId, conversa_id: conv.id, direcao: 'saida', texto, tipo, midia_url: midia,
      situacao: 'na_fila', autor_id: sess!.usuarioId || null, autor_nome: quem,
    })
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })
    const patch: any = {
      aguardando_desde: null, ultima_em: agora, ultima_de: 'salao',
      ultima_previa: (texto || `[${tipo}]`).slice(0, 120), nao_lidas: 0, atualizado_em: agora,
    }
    // Candidato que escreveu antes de ser chamado está solto em "Preciso agir":
    // ao responder daqui ele vai para a pasta Currículos (cliente do salão não muda).
    if (!conv.contato?.cliente_nome && !ehEstadoDoSalao(conv.estado)) {
      patch.estado = PASTA_CURRICULOS; patch.proxima_acao = null; patch.fechada_em = null
    }
    await supabaseAdmin.from('crm_conversas').update(patch).eq('id', conv.id)
    await supabaseAdmin.from('crm_eventos').insert({
      salao_id: salaoId, conversa_id: conv.id, tipo: 'respondeu',
      autor_id: sess!.usuarioId || null, autor_nome: quem, detalhe: 'Currículos',
    })
    return NextResponse.json({ ok: true })
  }

  // Escolher a vaga de quem escreveu para o telefone principal.
  if (body?.acao === 'triagem') {
    const conv = await conversaDeCandidato(salaoId, String(body?.conversa || ''))
    if (!conv) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })
    await definirTriagem(salaoId, conv.id, String(body?.vaga || '').trim().slice(0, 60))
    return NextResponse.json({ ok: true })
  }

  if (body?.acao === 'config') {
    const novo = await salvarConfigCurriculos(salaoId, {
      ...(body?.limpeza ? { limpeza: body.limpeza } : {}),
      ...(Array.isArray(body?.modelos) ? { modelos: body.modelos } : {}),
    })
    return NextResponse.json({ ok: true, config: novo })
  }

  if (body?.acao === 'excluir_arquivos') {
    const ids: string[] = Array.isArray(body?.mensagens) ? body.mensagens.map(String) : []
    const dias = Number(body?.antes_de_dias) || undefined
    const r = await excluirArquivos(salaoId, ids, dias)
    return NextResponse.json({ ok: true, ...r })
  }

  if (body?.acao === 'enviar') {
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : []
    // Aceita uma lista de modelos (o sistema reveza) ou um texto só.
    const modelos: string[] = (Array.isArray(body?.modelos) ? body.modelos : [body?.texto])
      .map((x: any) => String(x || '').trim()).filter(Boolean)
    if (!modelos.length) return NextResponse.json({ error: 'Escreva a mensagem.' }, { status: 400 })
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
    if (body?.guardar_modelos !== false) await salvarConfigCurriculos(salaoId, { modelos }).catch(() => {})
    const candidatos = await candidatosPorId(ids)
    const { textos, variados } = distribuirModelos(modelos, candidatos.length)
    const ate24h = new Date(Date.now() - 24 * 3600e3).toISOString()

    // Uma mensagem a cada 25-45 s: a ponte só pega a que já venceu (criado_em),
    // então elas saem espaçadas, como uma pessoa escrevendo.
    let quando = Date.now()
    const enviados: string[] = []
    const pulados: { nome: string; motivo: string }[] = []

    for (let i = 0; i < candidatos.length; i++) {
      const c = candidatos[i]
      try {
        const texto = textos[i]
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
      ok: true, enviados: enviados.length, pulados, variados,
      minutos: Math.max(1, Math.ceil((quando - Date.now()) / 60000)),
    })
  }

  return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 })
}
