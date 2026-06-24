import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getAtendimentosRaw } from '@/lib/atendimentosCache'

// Configuração da recuperação de clientes
const BONUS_PCT = 5      // % do valor da visita de retorno que vira bônus da recepção
const JANELA_DIAS = 10   // dias para a trava do botão E para atribuir o retorno à mensagem

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

function parseBR(s: string): number {
  if (!s) return 0
  if (s.includes('/')) { const [d, m, y] = s.split('/'); return new Date(`${y}-${m}-${d}`).getTime() || 0 }
  return new Date(s).getTime() || 0
}

// Cria a tabela de contatos se ainda não existir (idempotente)
async function ensureTable() {
  const sql = `CREATE TABLE IF NOT EXISTS clientes_contatos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    salao_id uuid NOT NULL,
    cliente_nome text NOT NULL,
    celular text,
    origem text,
    recepcionista_id uuid,
    recepcionista_nome text,
    mensagem text,
    contato_em timestamptz DEFAULT now(),
    criado_em timestamptz DEFAULT now()
  )`
  try { await supabaseAdmin.rpc('exec_sql', { sql }) } catch {}
}

async function carregarContatos(salaoId: string) {
  await ensureTable()
  const { data } = await supabaseAdmin
    .from('clientes_contatos')
    .select('id, cliente_nome, celular, origem, recepcionista_id, recepcionista_nome, mensagem, contato_em')
    .eq('salao_id', salaoId)
    .order('contato_em', { ascending: false })
  return data || []
}

async function carregarAtendimentos(salaoId: string) {
  // Cache compartilhado: relê o banco só quando os dados mudam.
  return getAtendimentosRaw(salaoId)
}

export async function GET(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const tipo = new URL(req.url).searchParams.get('tipo') || 'status'

  try {
    // Recepcionistas = profissionais com cargo "Recepção"
    if (tipo === 'recepcionistas') {
      const { data } = await supabaseAdmin
        .from('profissionais')
        .select('id, nome_completo, apelido, cargo')
        .eq('salao_id', salaoId)
        .eq('ativo', true)
      const recep = (data || []).filter((p: any) => (p.cargo || '').toLowerCase().includes('recep'))
        .map((p: any) => ({ id: p.id, nome: p.apelido || p.nome_completo }))
      return NextResponse.json(recep)
    }

    // Status dos botões: cliente_nome -> data do último contato dentro da janela (para travar)
    if (tipo === 'status') {
      const contatos = await carregarContatos(salaoId)
      const limite = Date.now() - JANELA_DIAS * 86400000
      const travados: Record<string, { contato_em: string; recepcionista: string }> = {}
      const contagem: Record<string, number> = {}        // quantas vezes cada cliente já foi contatado
      const ultimo_contato: Record<string, string> = {}  // data do último contato
      for (const c of contatos) {
        contagem[c.cliente_nome] = (contagem[c.cliente_nome] || 0) + 1
        const t = new Date(c.contato_em).getTime()
        if (t >= limite && !travados[c.cliente_nome]) {
          travados[c.cliente_nome] = { contato_em: c.contato_em, recepcionista: c.recepcionista_nome || '' }
        }
        if (!ultimo_contato[c.cliente_nome] || t > new Date(ultimo_contato[c.cliente_nome]).getTime()) {
          ultimo_contato[c.cliente_nome] = c.contato_em
        }
      }
      return NextResponse.json({ janela_dias: JANELA_DIAS, travados, contagem, ultimo_contato })
    }

    // Recuperados: cruza contatos com atendimentos_raw (retorno em até JANELA_DIAS após o contato)
    if (tipo === 'recuperados') {
      const [contatos, atend] = await Promise.all([carregarContatos(salaoId), carregarAtendimentos(salaoId)])
      // visitas por cliente (data -> valor do dia)
      const visitasPorCliente: Record<string, Array<{ ts: number; data: string; valor: number }>> = {}
      const valorDia: Record<string, number> = {}
      for (const r of atend) {
        const nome = (r.cliente || '').trim(); if (!nome) continue
        const data = r.data_comanda || ''; if (!data) continue
        const ts = parseBR(data)
        const chave = nome + '|' + data
        valorDia[chave] = (valorDia[chave] || 0) + (Number(r.total) || Number(r.valor) || 0)
        if (!visitasPorCliente[nome]) visitasPorCliente[nome] = []
        if (!visitasPorCliente[nome].some(v => v.data === data)) visitasPorCliente[nome].push({ ts, data, valor: 0 })
      }
      for (const nome in visitasPorCliente) {
        visitasPorCliente[nome].forEach(v => { v.valor = valorDia[nome + '|' + v.data] || 0 })
        visitasPorCliente[nome].sort((a, b) => a.ts - b.ts)
      }

      const recuperados: any[] = []
      const usados = new Set<string>() // evita contar o mesmo contato 2x
      for (const c of contatos) {
        const nome = c.cliente_nome
        const tContato = new Date(c.contato_em).getTime()
        const visitas = visitasPorCliente[nome] || []
        // visita de retorno: primeira visita APÓS o contato, dentro da janela
        const retorno = visitas.find(v => v.ts > tContato && v.ts <= tContato + JANELA_DIAS * 86400000)
        if (!retorno) continue
        const chaveUnica = nome + '|' + retorno.data
        if (usados.has(chaveUnica)) continue
        usados.add(chaveUnica)
        // dias ausente = entre a última visita ANTES do contato e o retorno
        const ultimaAntes = [...visitas].reverse().find(v => v.ts < tContato)
        const diasAusente = ultimaAntes ? Math.round((retorno.ts - ultimaAntes.ts) / 86400000) : null
        const bonus = Math.round(retorno.valor * (BONUS_PCT / 100) * 100) / 100
        recuperados.push({
          cliente_nome: nome,
          recepcionista_nome: c.recepcionista_nome || '—',
          origem: c.origem || '',
          contato_em: c.contato_em,
          data_retorno: retorno.data,
          dias_ausente: diasAusente,
          valor_retorno: Math.round(retorno.valor * 100) / 100,
          bonus,
        })
      }

      // Estatísticas + ranking por recepcionista
      const totalContatos = contatos.length
      const totalRecuperados = recuperados.length
      const taxaConversao = totalContatos > 0 ? Math.round((totalRecuperados / totalContatos) * 1000) / 10 : 0
      const faturamentoRecuperado = Math.round(recuperados.reduce((s, r) => s + r.valor_retorno, 0) * 100) / 100
      const totalBonus = Math.round(recuperados.reduce((s, r) => s + r.bonus, 0) * 100) / 100
      const rankingMap: Record<string, { contatos: number; recuperados: number; bonus: number }> = {}
      for (const c of contatos) {
        const r = c.recepcionista_nome || '—'
        if (!rankingMap[r]) rankingMap[r] = { contatos: 0, recuperados: 0, bonus: 0 }
        rankingMap[r].contatos++
      }
      for (const r of recuperados) {
        const k = r.recepcionista_nome || '—'
        if (!rankingMap[k]) rankingMap[k] = { contatos: 0, recuperados: 0, bonus: 0 }
        rankingMap[k].recuperados++; rankingMap[k].bonus += r.bonus
      }
      const ranking = Object.entries(rankingMap).map(([nome, v]) => ({
        nome, ...v, bonus: Math.round(v.bonus * 100) / 100,
        taxa: v.contatos > 0 ? Math.round((v.recuperados / v.contatos) * 1000) / 10 : 0,
      })).sort((a, b) => b.recuperados - a.recuperados)

      return NextResponse.json({
        bonus_pct: BONUS_PCT, janela_dias: JANELA_DIAS,
        total_contatos: totalContatos, total_recuperados: totalRecuperados,
        taxa_conversao: taxaConversao, faturamento_recuperado: faturamentoRecuperado, total_bonus: totalBonus,
        roi: totalBonus > 0 ? Math.round((faturamentoRecuperado / totalBonus) * 10) / 10 : 0,
        ranking, recuperados: recuperados.sort((a, b) => parseBR(b.data_retorno) - parseBR(a.data_retorno)),
      })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}

// Registra um contato (clique no botão WhatsApp)
export async function POST(req: NextRequest) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  try {
    await ensureTable()
    const body = await req.json()
    const { cliente_nome, celular, origem, recepcionista_id, recepcionista_nome, mensagem } = body
    if (!cliente_nome) return NextResponse.json({ error: 'cliente_nome obrigatório' }, { status: 400 })
    if (!recepcionista_nome) return NextResponse.json({ error: 'recepcionista obrigatória' }, { status: 400 })

    const { error } = await supabaseAdmin.from('clientes_contatos').insert({
      salao_id: salaoId,
      cliente_nome,
      celular: celular || null,
      origem: origem || null,
      recepcionista_id: recepcionista_id || null,
      recepcionista_nome,
      mensagem: mensagem || null,
      contato_em: new Date().toISOString(),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, travado_ate: new Date(Date.now() + JANELA_DIAS * 86400000).toISOString() })
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
