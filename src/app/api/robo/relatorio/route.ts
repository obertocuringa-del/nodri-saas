import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { carregarRobo, decifrar } from '@/lib/crmRoboAvec'
import { carregarConfig as cfgAutomacao } from '@/lib/crmAutomacao'
import { CHAVE_AGENDA, lerAgenda, gravarAgenda, receberColeta, pedidoNaHora } from '@/lib/roboRelatorio'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ── Porta do robô do relatório (servidor) ───────────────────────────────────
// Quem chama é robo-relatorio/agendador.py, com a chave de serviço da ponte.
//   GET               -> salões com coleta ligada (ou "rodar agora" pedido),
//                        com login do Avec decifrado e endereço de login.
//   POST inicio       -> abre a linha da coleta (histórico do painel).
//   POST fim          -> Excel pronto (caminho no servidor): confere e importa.
//   POST erro         -> a coleta falhou; guarda o motivo.

function autorizado(req: NextRequest) {
  const esperada = process.env.CRM_PONTE_CHAVE || ''
  return !!esperada && req.headers.get('x-crm-chave') === esperada
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data } = await supabaseAdmin.from('salao_config').select('salao_id, valor').eq('chave', CHAVE_AGENDA)
  const ativos = (data || []).map((l: any) => ({ salao_id: l.salao_id as string, agenda: lerAgenda(l.valor) }))
    // Pedido com hora marcada só aparece para o robô quando a hora chega.
    .filter(l => l.agenda.ligado || pedidoNaHora(l.agenda))
  const { data: nomes } = await supabaseAdmin.from('saloes').select('id, nome').in('id', ativos.map(a => a.salao_id).concat(['00000000-0000-0000-0000-000000000000']))
  const nomeDe = new Map((nomes || []).map((s: any) => [s.id, s.nome]))
  const saloes = []
  for (const a of ativos) {
    const robo = await carregarRobo(a.salao_id)
    let senha = ''
    try { senha = robo.senha_cifra ? decifrar(robo.senha_cifra) : '' } catch { /* senha ilegível */ }
    const cfg = await cfgAutomacao(a.salao_id)
    saloes.push({
      salao_id: a.salao_id, nome: nomeDe.get(a.salao_id) || a.salao_id,
      horarios: a.agenda.ligado ? a.agenda.horarios : [], rodar_agora: pedidoNaHora(a.agenda),
      // 'MM/AAAA' só quando o dono escolheu um mês. Vazio = mês corrente, que
      // é o caminho de sempre: o agendador nem passa a variável adiante.
      mes_alvo: pedidoNaHora(a.agenda) ? (a.agenda.rodar_mes || '') : '',
      email: robo.email, senha, url_login: cfg.url_login || '',
    })
  }
  return NextResponse.json({ saloes, simultaneas: Number(process.env.ROBO_SIMULTANEAS || 1) })
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const b = await req.json().catch(() => ({}))

  if (b.acao === 'inicio') {
    const hoje = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    // A linha do histórico tem que nascer no mês que a coleta vai BUSCAR, não
    // no mês de hoje: é por `ano`/`mes` que a conferência compara com o que já
    // existe (receberColeta lê daqui) e que a importação apaga antes de
    // inserir. Nascer em outubro e importar setembro apagaria o mês errado.
    const alvo = String(b.mes_alvo || '').trim()
    const m = /^(\d{2})\/(\d{4})$/.exec(alvo)
    const ano = m ? Number(m[2]) : hoje.getFullYear()
    const mes = m ? Number(m[1]) : hoje.getMonth() + 1
    const { data } = await supabaseAdmin.from('robo_coletas').insert({
      salao_id: b.salao_id, ano, mes, origem: b.origem || 'agenda',
    }).select('id').maybeSingle()
    if (b.origem === 'rodar_agora') {
      const { data: cfg } = await supabaseAdmin.from('salao_config').select('valor')
        .eq('salao_id', b.salao_id).eq('chave', CHAVE_AGENDA).maybeSingle()
      // O mês sai junto com o pedido: um "rodar agora" depois deste não pode
      // herdar o mês escolhido para este.
      await gravarAgenda(b.salao_id, { ...lerAgenda(cfg?.valor), rodar_agora_em: null, rodar_mes: null, rodar_as: null })
    }
    return NextResponse.json({ ok: true, id: data?.id })
  }

  if (b.acao === 'erro') {
    await supabaseAdmin.from('robo_coletas').update({
      situacao: 'erro', motivo: String(b.motivo || 'erro').slice(0, 1000), fim: new Date().toISOString(),
    }).eq('id', b.id)
    return NextResponse.json({ ok: true })
  }

  if (b.acao === 'fim') {
    // O Excel está no disco do próprio servidor (o robô roda ao lado).
    const arq = String(b.arquivo || '')
    if (!arq.startsWith('/home/nodri/robo/') || !arq.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Arquivo fora da pasta do robô' }, { status: 400 })
    }
    try {
      const fs = await import('fs')
      const alertas = Array.isArray(b.alertas) ? b.alertas.map((x: any) => String(x).slice(0, 300)) : []
      const r = await receberColeta(b.id, b.salao_id, fs.readFileSync(arq), alertas)
      return NextResponse.json({ ok: true, ...r })
    } catch (e: any) {
      await supabaseAdmin.from('robo_coletas').update({
        situacao: 'erro', motivo: 'Falha ao conferir/importar: ' + String(e?.message || e).slice(0, 800), fim: new Date().toISOString(),
      }).eq('id', b.id)
      return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
