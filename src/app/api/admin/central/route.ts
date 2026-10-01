import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { lerAgenda, CHAVE_AGENDA } from '@/lib/roboRelatorio'
import { lerRobo, CHAVE_ROBO } from '@/lib/crmRoboAvec'
import { lerServidor, pedidosPendentes, pedirReinicio, ALVOS, type Alvo } from '@/lib/servidorCentral'

export const dynamic = 'force-dynamic'

// ── Central do servidor (painel master > Robô do relatório) ─────────────────
//
// Pedido do dono (01/10/2026): numa tela só, saber se está tudo funcionando
// em TODOS os salões -- coleta, extensão, CRM, ponte, servidor e vigias --
// com verde/vermelho, o salão com problema e o motivo, e botões de reiniciar
// sem precisar entrar na Hostinger.
//
// Cada bloco devolve: cor (verde, amarelo, vermelho, cinza), um resumo de uma
// linha e a lista do que tem por salão. O pior salão manda na cor do bloco.

type Cor = 'verde' | 'amarelo' | 'vermelho' | 'cinza'
interface Item { salao?: string; cor: Cor; texto: string; detalhe?: string }
interface Bloco { cor: Cor; resumo: string; itens: Item[]; extra?: any }

const MIN = 60_000
const PESO: Record<Cor, number> = { cinza: 0, verde: 1, amarelo: 2, vermelho: 3 }
const pior = (cores: Cor[], vazio: Cor = 'cinza'): Cor =>
  cores.length ? cores.reduce((a, b) => (PESO[b] > PESO[a] ? b : a), 'verde' as Cor) : vazio
const horaSP = (d: Date | number | string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(d))
const dataHoraSP = (d: Date | number | string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(d))
const diaSP = (d: Date | number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(d))
const ha = (ms: number) => {
  const m = Math.round(ms / MIN)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return h < 48 ? `${h}h${String(m % 60).padStart(2, '0')}` : `${Math.floor(h / 24)} dias`
}
const primeiraLinha = (s: string) => String(s || '').split('\n')[0].slice(0, 220)

async function master() {
  const token = cookies().get('nodri_token')?.value
  const p = token ? await verifyJWT(token) : null
  return p && p.role === 'master' ? p : null
}

export async function GET() {
  if (!(await master())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const agora = Date.now()
  const hoje = diaSP(agora)
  const h = horaSP(agora)
  const expediente = h >= '07:30' && h <= '21:30'
  const inicioDoDia = new Date(`${hoje}T00:00:00-03:00`).toISOString()

  const [{ data: saloes }, { data: cfgs }, { data: canais }, { data: coletas }, servidor, pedidos, { data: msgsHoje }, { data: falhas }, { data: presas }] = await Promise.all([
    supabaseAdmin.from('saloes').select('id, nome, is_modelo'),
    supabaseAdmin.from('salao_config').select('salao_id, chave, valor').in('chave', [
      CHAVE_AGENDA, CHAVE_ROBO, 'crm_automacao_feedback', 'crm_automacao_feedback_estado', 'crm_campanhas', 'crm_campanhas_estado', 'nodri_saude',
    ]),
    supabaseAdmin.from('crm_canais').select('salao_id, situacao, visto_em, numero, erro'),
    supabaseAdmin.from('robo_coletas').select('salao_id, inicio, fim, situacao, motivo').order('inicio', { ascending: false }).limit(400),
    lerServidor(),
    pedidosPendentes(),
    supabaseAdmin.from('crm_mensagens').select('salao_id, autor_nome')
      .eq('direcao', 'saida').gte('criado_em', inicioDoDia)
      .in('autor_nome', ['Confirmação automática', 'Avisar o profissional que a cliente chegou', 'Automação de feedback', 'Envio automático'])
      .limit(10000),
    supabaseAdmin.from('crm_mensagens').select('salao_id').eq('situacao', 'falhou').gte('criado_em', new Date(agora - 24 * 60 * MIN).toISOString()).limit(5000),
    supabaseAdmin.from('crm_mensagens').select('salao_id').in('situacao', ['na_fila', 'enviando']).lt('criado_em', new Date(agora - 20 * MIN).toISOString()).limit(5000),
  ])

  const nome = new Map((saloes || []).filter((s: any) => !s.is_modelo).map((s: any) => [s.id, s.nome as string]))
  const cfg = (salao: string, chave: string) => (cfgs || []).find((c: any) => c.salao_id === salao && c.chave === chave)?.valor
  const conta = (lista: any[] | null, salao: string, autor?: string) =>
    (lista || []).filter((m: any) => m.salao_id === salao && (!autor || m.autor_nome === autor)).length

  // ── Servidor ───────────────────────────────────────────────────────────────
  const visto = servidor.vigia_em ? new Date(servidor.vigia_em).getTime() : 0
  const procs = servidor.processos || []
  const caidos = procs.filter(p => p.status && p.status !== 'online')
  const servidorBloco: Bloco = !visto
    ? { cor: 'cinza', resumo: 'O vigia ainda não mandou notícia. Rode o PUBLICAR para instalar.', itens: [] }
    : agora - visto > 3 * MIN
      ? { cor: 'vermelho', resumo: `Sem notícia do servidor há ${ha(agora - visto)} (último sinal ${dataHoraSP(visto)}).`, itens: [] }
      : { cor: caidos.length ? 'vermelho' : 'verde', resumo: caidos.length ? `${caidos.map(p => p.nome).join(', ')} fora do ar` : 'Ativo', itens: [] }
  const bootMs = servidor.boot ? new Date(servidor.boot.replace(' ', 'T') + '-03:00').getTime() : 0
  servidorBloco.extra = {
    vigia_em: servidor.vigia_em,
    boot: servidor.boot,
    ligado_ha: bootMs ? ha(agora - bootMs) : null,
    carga: servidor.carga, mem_total: servidor.mem_total, mem_usada: servidor.mem_usada,
    disco_total: servidor.disco_total, disco_usado: servidor.disco_usado,
    processos: procs.map(p => ({ ...p, ha: p.desde ? ha(agora - p.desde) : null })),
    historico: [...(servidor.historico || [])].reverse().slice(0, 20).map(x => ({ ...x, quando: dataHoraSP(x.em), nome: ALVOS[x.alvo] || x.alvo })),
    pedidos: pedidos.map(p => ({ ...p, nome: ALVOS[p.alvo] || p.alvo, quando: dataHoraSP(p.em) })),
    hostinger: 'https://hpanel.hostinger.com/vps/2012627/overview',
  }

  // ── Coleta de relatórios ───────────────────────────────────────────────────
  const coletaItens: Item[] = []
  for (const [id, n] of nome) {
    const ag = lerAgenda(cfg(id, CHAVE_AGENDA))
    if (!ag.ligado) continue
    const minhas = (coletas || []).filter((c: any) => c.salao_id === id)
    const ult: any = minhas[0]
    if (!ult) { coletaItens.push({ salao: n, cor: 'amarelo', texto: 'Ligada, mas ainda não rodou nenhuma vez.' }); continue }
    const ini = new Date(ult.inicio).getTime()
    // Horário marcado que já passou (30 min de folga) sem coleta começar depois.
    const perdido = (ag.horarios || []).filter((x: string) => x <= horaSP(agora - 30 * MIN) && x >= '00:00')
      .map((x: string) => new Date(`${hoje}T${x}:00-03:00`).getTime())
      .filter((t: number) => t > ini + 5 * MIN && agora - t < 12 * 60 * MIN)
      .sort((a: number, b: number) => b - a)[0]
    if (ult.situacao === 'erro') {
      coletaItens.push({ salao: n, cor: 'vermelho', texto: `A coleta das ${horaSP(ini)} deu erro.`, detalhe: primeiraLinha(ult.motivo) })
    } else if (ult.situacao === 'rodando' && agora - ini > 40 * MIN) {
      coletaItens.push({ salao: n, cor: 'vermelho', texto: `A coleta das ${horaSP(ini)} está rodando há ${ha(agora - ini)} (o normal é 15 min): travou.` })
    } else if (perdido) {
      coletaItens.push({ salao: n, cor: 'vermelho', texto: `A coleta das ${horaSP(perdido)} não começou.`, detalhe: `Última: ${dataHoraSP(ini)} (${ult.situacao}).` })
    } else if (ult.situacao === 'aguardando') {
      coletaItens.push({ salao: n, cor: 'amarelo', texto: `A coleta das ${horaSP(ini)} está aguardando a sua aprovação.`, detalhe: primeiraLinha(ult.motivo) })
    } else {
      coletaItens.push({ salao: n, cor: 'verde', texto: `Última coleta ${dataHoraSP(ini)}: ${ult.situacao}.` })
    }
  }
  const coletaCor = pior(coletaItens.map(i => i.cor))
  const coletaBloco: Bloco = {
    cor: coletaCor, itens: coletaItens,
    resumo: !coletaItens.length ? 'Nenhum salão com coleta ligada.'
      : coletaCor === 'verde' ? `Tudo certo nos ${coletaItens.length} salão(ões).`
      : `${coletaItens.filter(i => i.cor !== 'verde').length} salão(ões) com problema.`,
  }

  // ── Extensão (lê o Avec: aviso ao profissional, confirmação, feedback) ──────
  const extItens: Item[] = []
  for (const [id, n] of nome) {
    const robo = lerRobo(cfg(id, CHAVE_ROBO))
    const fbCfg = cfg(id, 'crm_automacao_feedback') || {}
    const camps = (cfg(id, 'crm_campanhas')?.campanhas || []).filter((c: any) => c.ligada)
    if (!robo.no_servidor && !fbCfg.ligada && !camps.length) continue
    const est = cfg(id, 'crm_automacao_feedback_estado') || {}
    const cest = cfg(id, 'crm_campanhas_estado') || {}
    const leituras = [est?.ultimo?.em, ...Object.values(cest).map((e: any) => e?.ultimo?.em)]
      .filter(Boolean).map((x: any) => new Date(x).getTime()).filter(x => x > 0)
    const leu = leituras.length ? Math.max(...leituras) : 0
    const vis = est?.visto_em ? new Date(est.visto_em).getTime() : 0
    const onde = est?.origem === 'servidor' ? 'no servidor' : est?.origem === 'salao' ? 'no computador do salão' : ''
    const hojeTxt = `Hoje: ${conta(msgsHoje, id, 'Confirmação automática')} confirmações, ${conta(msgsHoje, id, 'Avisar o profissional que a cliente chegou')} avisos ao profissional, ${conta(msgsHoje, id, 'Automação de feedback')} feedbacks, ${conta(msgsHoje, id, 'Envio automático')} do envio automático.`
    const erros = [est?.ultimo?.erro, ...Object.values(cest).map((e: any) => e?.ultimo?.erro)].filter(Boolean) as string[]
    if (!expediente) {
      extItens.push({ salao: n, cor: 'cinza', texto: `Fora do horário de conferência (07:30 às 21:30). Último sinal ${vis ? dataHoraSP(vis) : 'nunca'}.`, detalhe: hojeTxt })
    } else if (!vis || agora - vis > 10 * MIN) {
      extItens.push({ salao: n, cor: 'vermelho', texto: `Sem sinal da extensão ${onde} há ${vis ? ha(agora - vis) : 'muito tempo'}.`, detalhe: `Nada sai: aviso ao profissional, confirmação e feedback. ${hojeTxt}` })
    } else if (!leu || agora - leu > 20 * MIN) {
      extItens.push({ salao: n, cor: 'vermelho', texto: `A extensão ${onde} está ligada, mas não lê o Avec desde ${leu ? dataHoraSP(leu) : 'nunca'}.`, detalhe: `Provável aba do Avec travada ou sessão caída. ${hojeTxt}` })
    } else if (erros.length) {
      extItens.push({ salao: n, cor: 'amarelo', texto: `Lendo, mas com erro: ${primeiraLinha(erros[0])}`, detalhe: hojeTxt })
    } else {
      extItens.push({ salao: n, cor: 'verde', texto: `Lendo o Avec ${onde} (última leitura ${horaSP(leu)}${est?.abas_avec != null ? `, ${est.abas_avec} janelas abertas` : ''}).`, detalhe: hojeTxt })
    }
  }
  const extCor = pior(extItens.map(i => i.cor))
  const extBloco: Bloco = {
    cor: extCor, itens: extItens,
    resumo: !extItens.length ? 'Nenhum salão usa a extensão.'
      : extCor === 'vermelho' ? `${extItens.filter(i => i.cor === 'vermelho').length} salão(ões) parados.`
      : extCor === 'cinza' ? 'Fora do horário de conferência.' : extCor === 'amarelo' ? 'Funcionando, com avisos.' : 'Tudo lendo e enviando.',
  }

  // ── CRM e ponte ───────────────────────────────────────────────────────────
  const crmItens: Item[] = []
  const ponteItens: Item[] = []
  for (const c of (canais || []) as any[]) {
    const n = nome.get(c.salao_id)
    if (!n) continue
    const vis = c.visto_em ? new Date(c.visto_em).getTime() : 0
    const f = conta(falhas, c.salao_id), p = conta(presas, c.salao_id)
    if (c.situacao === 'desconectado') {
      crmItens.push({ salao: n, cor: 'cinza', texto: 'WhatsApp desconectado (o salão não usa ou tirou o QR).' })
      continue
    }
    if (c.situacao !== 'conectado') crmItens.push({ salao: n, cor: 'vermelho', texto: `WhatsApp: ${c.situacao}.`, detalhe: 'Precisa ler o QR Code de novo no CRM.' })
    else if (c.erro) crmItens.push({ salao: n, cor: 'vermelho', texto: 'Conectado, mas com problema.', detalhe: primeiraLinha(c.erro) })
    else if (p) crmItens.push({ salao: n, cor: 'amarelo', texto: `${p} mensagem(ns) parada(s) na fila há mais de 20 min.` })
    else if (f) crmItens.push({ salao: n, cor: 'amarelo', texto: `${f} mensagem(ns) falharam nas últimas 24h.`, detalhe: 'No CRM, a mensagem que falhou tem o botão Reenviar.' })
    else crmItens.push({ salao: n, cor: 'verde', texto: `Conectado${c.numero ? ` (${c.numero})` : ''}, mensagens saindo normalmente.` })

    ponteItens.push(!vis || agora - vis > 5 * MIN
      ? { salao: n, cor: 'vermelho', texto: `Sem sinal da ponte há ${vis ? ha(agora - vis) : 'muito tempo'}.`, detalhe: 'Mensagens podem não estar chegando nem saindo.' }
      : { salao: n, cor: 'verde', texto: `Ponte respondendo (sinal às ${horaSP(vis)}).` })
  }
  const crmCor = pior(crmItens.map(i => i.cor))
  const crmBloco: Bloco = {
    cor: crmCor, itens: crmItens,
    resumo: crmCor === 'verde' ? 'Funcionando em todos os salões.' : crmCor === 'cinza' ? 'Nenhum salão com WhatsApp conectado.'
      : `${crmItens.filter(i => i.cor === 'vermelho' || i.cor === 'amarelo').length} salão(ões) com atenção.`,
  }
  const pProc = procs.find(x => /^ponte/.test(x.nome))
  const ponteCor = pior([...ponteItens.map(i => i.cor), ...(pProc && pProc.status !== 'online' ? ['vermelho' as Cor] : [])])
  const ponteBloco: Bloco = {
    cor: ponteCor, itens: ponteItens,
    resumo: ponteCor === 'verde' ? `Ativa${pProc?.desde ? ` há ${ha(agora - pProc.desde)}` : ''}.` : ponteCor === 'cinza' ? 'Sem salão usando.' : 'Com problema.',
    extra: pProc ? { status: pProc.status, reinicios: pProc.reinicios, ha: pProc.desde ? ha(agora - pProc.desde) : null, mem: pProc.mem } : null,
  }

  // ── Vigias ────────────────────────────────────────────────────────────────
  const vigiaVivo = !!visto && agora - visto <= 3 * MIN
  const vigiaCor: Cor = !visto ? 'cinza' : vigiaVivo ? 'verde' : 'vermelho'
  const reiniciosHoje = (servidor.historico || []).filter(x => diaSP(new Date(x.em).getTime()) === hoje)
  const roboProc = procs.find(x => x.nome === 'robo-avec')
  const presasTotal = (presas || []).length
  const aguardando = (coletas || []).filter((c: any) => c.situacao === 'aguardando').length
  const vigias: Item[] = [
    { cor: vigiaCor, texto: 'Vigia do servidor', detalhe: vigiaVivo ? `Rodando a cada minuto (último ${horaSP(visto)}).` : visto ? `Parou: último sinal ${dataHoraSP(visto)}.` : 'Ainda não instalado: rode o PUBLICAR.' },
    { cor: vigiaCor, texto: 'Vigia do site — evita o site fora do ar', detalhe: 'Se o site não responde 3 vezes seguidas, religa o NODRI e o nginx.' },
    { cor: vigiaCor, texto: 'Vigia do robô do Avec — evita aviso, confirmação e feedback parados', detalhe: `Das 07:30 às 21:30: sem sinal por 10 min ou sem ler o Avec por 20 min, religa. Hoje: ${reiniciosHoje.filter(x => x.alvo === 'robo').length} vez(es).` },
    { cor: vigiaCor, texto: 'Vigia da ponte — evita WhatsApp mudo', detalhe: `Sem sinal por 5 min, religa. Hoje: ${reiniciosHoje.filter(x => x.alvo === 'ponte').length} vez(es).` },
    { cor: !procs.length ? 'cinza' : caidos.length ? 'vermelho' : 'verde', texto: 'pm2 — evita programa que morre', detalhe: procs.length ? (caidos.length ? `Fora do ar: ${caidos.map(p => p.nome).join(', ')}` : `${procs.length} programas no ar.`) : 'Sem dados do servidor ainda.' },
    { cor: roboProc?.desde && diaSP(roboProc.desde) === hoje ? 'verde' : roboProc ? 'amarelo' : 'cinza', texto: 'Religamento diário do robô (5h) — evita Chrome acumulando memória', detalhe: roboProc?.desde ? `Robô no ar desde ${dataHoraSP(roboProc.desde)}.` : 'Sem dados do servidor ainda.' },
    { cor: presasTotal ? 'amarelo' : 'verde', texto: 'Mensagem presa — evita mensagem perdida sem ninguém saber', detalhe: presasTotal ? `${presasTotal} mensagem(ns) parada(s) há mais de 20 min.` : 'Mensagem presa por mais de 15 min vira "falhou" e ganha o botão Reenviar.' },
    { cor: 'verde', texto: 'Saúde do WhatsApp — evita bloqueio do número', detalhe: 'O envio automático pausa sozinho se o WhatsApp estiver desconectado ou com falhas seguidas.' },
    { cor: aguardando ? 'amarelo' : 'verde', texto: 'Conferência da coleta — evita relatório errado aplicado', detalhe: aguardando ? `${aguardando} coleta(s) esperando a sua aprovação.` : 'Cada relatório baixado é conferido com a tela do Avec antes de aplicar.' },
    { cor: 'cinza', texto: 'Monitor externo (GitHub) — avisa se o site cair', detalhe: 'Roda fora do servidor, em horários irregulares; abre um aviso no GitHub. Não dá para conferir daqui.' },
  ]
  const vigiasBloco: Bloco = {
    cor: pior(vigias.filter(v => v.cor !== 'cinza').map(v => v.cor), 'cinza'), itens: vigias,
    resumo: vigiaVivo ? `${vigias.length} vigias; o do servidor está rodando.` : 'O vigia do servidor não está rodando.',
  }

  return NextResponse.json({
    agora: dataHoraSP(agora),
    blocos: { coleta: coletaBloco, extensao: extBloco, crm: crmBloco, ponte: ponteBloco, servidor: servidorBloco, vigias: vigiasBloco },
  })
}

export async function POST(req: NextRequest) {
  const quem = await master()
  if (!quem) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  if (b.acao === 'reiniciar' && b.alvo in ALVOS) {
    await pedirReinicio(b.alvo as Alvo, String((quem as any).nome || (quem as any).email || 'master'))
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
