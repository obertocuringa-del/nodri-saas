import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { lerAgenda, CHAVE_AGENDA } from '@/lib/roboRelatorio'
import { lerRobo, CHAVE_ROBO } from '@/lib/crmRoboAvec'
import { lerServidor, pedidosPendentes, pedirReinicio, ALVOS, type Alvo } from '@/lib/servidorCentral'
import { abasDoSalao, fecharAba, fecharSobrando, ABAS_ESPERADAS } from '@/lib/abasDoRobo'

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
interface Item {
  salao?: string; cor: Cor; texto: string; detalhe?: string
  // Para a tela poder agir no salão certo (ligar/desligar o CRM, fechar aba).
  salao_id?: string
  crm_ligado?: boolean
  /** Quantas mensagens estão esperando a ponte neste salão (fila inteira). */
  fila?: number
  /**
   * QUEM falhou, e não só quantos.
   *
   * "1 mensagem falhou nas últimas 24h" obriga a abrir o CRM e caçar qual.
   * Com o nome e o começo do texto dá para ir direto -- e o link já abre a
   * conversa certa, onde fica o botão Reenviar.
   */
  falhou?: Array<{ id: string; nome: string; previa: string; quando: string; reenvios: number; desistiu: boolean }>
}
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

  const [{ data: saloes }, { data: cfgs }, { data: canais }, { data: coletas }, servidor, pedidos, { data: msgsHoje }, { data: falhas }, { data: presas }, { data: naFila }] = await Promise.all([
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
    supabaseAdmin.from('crm_mensagens').select('id, salao_id, conversa_id, texto, criado_em, reenvios').eq('situacao', 'falhou').gte('criado_em', new Date(agora - 24 * 60 * MIN).toISOString()).order('criado_em', { ascending: false }).limit(5000),
    supabaseAdmin.from('crm_mensagens').select('salao_id').in('situacao', ['na_fila', 'enviando']).lt('criado_em', new Date(agora - 20 * MIN).toISOString()).limit(5000),
    // A fila INTEIRA de cada salão (não só a parada há 20 min). É o número que
    // importa quando o WhatsApp cai: enquanto ele está fora, o que estiver
    // aqui sai TUDO junto na reconexão -- a ponte pede a fila a cada segundo e
    // leva 20 por vez. Foi o que quase aconteceu em 03/10/2026, com 243.
    supabaseAdmin.from('crm_mensagens').select('salao_id').eq('situacao', 'na_fila').limit(5000),
  ])

  const nome = new Map((saloes || []).filter((s: any) => !s.is_modelo).map((s: any) => [s.id, s.nome as string]))

  // ── Quem é a cliente de cada mensagem que falhou ────────────────────────
  //
  // Uma consulta a mais, e só quando há falha -- que é o caso raro. Sem ela
  // a Central diz "1 mensagem falhou" e deixa a pessoa caçar qual no CRM.
  const clienteDaConversa = new Map<string, string>()
  const idsConversa = Array.from(new Set(((falhas || []) as any[]).map(m => m.conversa_id).filter(Boolean)))
  if (idsConversa.length) {
    const { data: convs } = await supabaseAdmin
      .from('crm_conversas').select('id, contato_id').in('id', idsConversa.slice(0, 200))
    const idsContato = Array.from(new Set((convs || []).map((c: any) => c.contato_id).filter(Boolean)))
    const { data: contatos } = idsContato.length
      ? await supabaseAdmin.from('crm_contatos').select('id, cliente_nome, nome, telefone').in('id', idsContato)
      : { data: [] as any[] }
    const porContato = new Map((contatos || []).map((c: any) =>
      [c.id, String(c.cliente_nome || c.nome || c.telefone || 'sem nome')]))
    for (const c of (convs || []) as any[]) {
      clienteDaConversa.set(c.id, porContato.get(c.contato_id) || 'sem nome')
    }
  }
  const falhasDoSalao = (salao: string) => ((falhas || []) as any[])
    .filter(m => m.salao_id === salao)
    .slice(0, 12)
    .map(m => ({
      id: String(m.id),
      nome: clienteDaConversa.get(m.conversa_id) || 'sem nome',
      previa: String(m.texto || '').replace(/\s+/g, ' ').trim().slice(0, 70),
      quando: m.criado_em ? dataHoraSP(new Date(m.criado_em).getTime()) : '',
      reenvios: Number(m.reenvios || 0),
      // 3 é o teto do vigia (ver saudeSistema). Chegou lá, ele parou de
      // tentar e a mensagem está esperando uma decisão de gente.
      desistiu: Number(m.reenvios || 0) >= 3,
    }))
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

  // ── Abas do Chrome ────────────────────────────────────────────────────────
  //
  // Duas abas por salão, e só: a da COLETA (robô do relatório) e a da
  // AUTOMAÇÃO (o 0051 que a extensão lê). Mais que isso é vazamento, e
  // vazamento aqui custa caro: em 01/10/2026 vinte e três abas comeram 58% do
  // único núcleo do servidor e as telas do NODRI passaram a abrir em 3 a 5
  // segundos. Ver src/lib/abasDoRobo.ts.
  const abasItens: Item[] = []
  const abasPorSalao: Record<string, any> = {}
  for (const [id, n] of nome) {
    const robo = lerRobo(cfg(id, CHAVE_ROBO))
    if (!robo.no_servidor) continue
    const urlRel = String((cfg(id, 'crm_automacao_feedback') || {}).url_relatorio || '')
    // Coleta rodando AGORA? Se não houver, toda aba de relatório que não seja
    // a da automação é sobra -- o robô lê um relatório por vez, numa aba só.
    const rodando = (coletas || []).some((c: any) => c.salao_id === id && c.situacao === 'rodando')
    const r = await abasDoSalao(id, urlRel, rodando)
    abasPorSalao[id] = r
    if (r.erro) {
      abasItens.push({ salao: n, salao_id: id, cor: 'cinza', texto: r.erro })
      continue
    }
    const total = r.abas.length
    const trabalhando = r.abas.filter(a => !a.pode_fechar).length
    const detalhe = r.abas
      .map(a => `${a.papel === 'automacao' ? 'AUTOMAÇÃO' : a.papel === 'coleta' ? 'COLETA' : 'sobrando'} — ${a.url || 'em branco'} (${a.porque})`)
      .join(' | ')
    if (total > ABAS_ESPERADAS && r.sobrando > 0) {
      abasItens.push({
        salao: n, salao_id: id, cor: 'vermelho',
        texto: `${total} abas abertas (o certo são ${ABAS_ESPERADAS}). ${r.sobrando} dá para fechar; ${trabalhando} está(ão) trabalhando.`,
        detalhe,
      })
    } else {
      abasItens.push({ salao: n, salao_id: id, cor: 'verde', texto: `${total} aba(s) — nenhuma sobrando.`, detalhe })
    }
  }
  const abasCor = pior(abasItens.map(i => i.cor))
  const abasBloco: Bloco = {
    cor: abasCor, itens: abasItens,
    resumo: !abasItens.length ? 'Nenhum salão roda no servidor.'
      : abasCor === 'vermelho' ? `${abasItens.filter(i => i.cor === 'vermelho').length} salão(ões) com aba sobrando.`
      : abasCor === 'cinza' ? 'Sem resposta do Chrome.' : 'Duas abas, como tem que ser.',
    extra: { porSalao: abasPorSalao, esperadas: ABAS_ESPERADAS },
  }

  // ── CRM e ponte ───────────────────────────────────────────────────────────
  const crmItens: Item[] = []
  const ponteItens: Item[] = []
  for (const c of (canais || []) as any[]) {
    const n = nome.get(c.salao_id)
    if (!n) continue
    const vis = c.visto_em ? new Date(c.visto_em).getTime() : 0
    const f = conta(falhas, c.salao_id), p = conta(presas, c.salao_id)
    const naFilaDele = conta(naFila, c.salao_id)
    if (c.situacao === 'desconectado') {
      crmItens.push({ salao: n, salao_id: c.salao_id, crm_ligado: c.situacao !== 'desconectado', fila: naFilaDele, cor: 'cinza', texto: 'WhatsApp desconectado (o salão não usa ou tirou o QR).' })
      continue
    }
    // ── Esperando o QR não é defeito ─────────────────────────────────────────
    //
    // Salão que nunca chegou a conectar (sem número, parado em aguardando_qr)
    // fica esperando alguém encostar o celular na tela -- e isso pode levar
    // dias. Em 01/10/2026 o salão "Luan Leal" nessa situação deixava a Central
    // com CRM e Ponte em VERMELHO o tempo todo, com o WhatsApp do Rouge
    // funcionando perfeitamente. Vermelho que vive aceso deixa de ser aviso.
    //
    // E a ponte é UMA só para todos: cobrar sinal de um canal que nunca
    // conectou é acusar a ponte de todo mundo por causa de quem não começou.
    if (c.situacao === 'aguardando_qr' && !c.numero) {
      crmItens.push({ salao: n, salao_id: c.salao_id, crm_ligado: c.situacao !== 'desconectado', fila: naFilaDele, cor: 'cinza', texto: 'Esperando ler o QR Code (o salão ainda não conectou).' })
      continue
    }
    if (c.situacao !== 'conectado') crmItens.push({ salao: n, salao_id: c.salao_id, crm_ligado: c.situacao !== 'desconectado', fila: naFilaDele, cor: 'vermelho', texto: `WhatsApp: ${c.situacao}.`, detalhe: 'Precisa ler o QR Code de novo no CRM.' })
    else if (c.erro) crmItens.push({ salao: n, salao_id: c.salao_id, crm_ligado: c.situacao !== 'desconectado', fila: naFilaDele, cor: 'vermelho', texto: 'Conectado, mas com problema.', detalhe: primeiraLinha(c.erro) })
    else if (p) crmItens.push({ salao: n, salao_id: c.salao_id, crm_ligado: c.situacao !== 'desconectado', fila: naFilaDele, cor: 'amarelo', texto: `${p} mensagem(ns) parada(s) na fila há mais de 20 min.` })
    else if (f) crmItens.push({ salao: n, salao_id: c.salao_id, crm_ligado: c.situacao !== 'desconectado', fila: naFilaDele, cor: 'amarelo', texto: `${f} mensagem(ns) falharam nas últimas 24h.`, detalhe: 'O vigia reenvia sozinho até 3 vezes. O que passou disso está marcado e espera você.', falhou: falhasDoSalao(c.salao_id) })
    else crmItens.push({ salao: n, salao_id: c.salao_id, crm_ligado: c.situacao !== 'desconectado', fila: naFilaDele, cor: 'verde', texto: `Conectado${c.numero ? ` (${c.numero})` : ''}, mensagens saindo normalmente.` })

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

  // O que os dois vigias novos acharam na última volta. Quem decide e conserta
  // é o saudeSistema (de minuto em minuto); aqui só se mostra o que ficou
  // escrito, para a tela não ter uma opinião própria sobre o mesmo assunto.
  const avisosConfirmacao: string[] = []
  let filaParada = 0
  // `nome` já é o mapa dos salões de verdade (sem o MODELO), que é o certo
  // aqui: o modelo não tem WhatsApp nem confirmação para falhar.
  for (const [id, nomeSalao] of nome) {
    for (const p of ((cfg(id, 'nodri_saude') as any)?.problemas || [])) {
      const motivo = String(p?.motivo || '')
      if (/hor[áa]rio de \d{2}:\d{2}/i.test(motivo)) {
        avisosConfirmacao.push(nome.size > 1 ? `${nomeSalao}: ${motivo}` : motivo)
      }
      const presa = motivo.match(/^(\d+) mensagem\(ns\) parada/)
      if (presa) filaParada += Number(presa[1]) || 0
    }
  }
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
    // ── Os dois de 02/10/2026 ───────────────────────────────────────────────
    //
    // Pedido do dono: toda automação precisa de autocorreção. Estes dois
    // fecham os buracos que sobravam -- os dois casos em que o salão ficava
    // sem a mensagem e nada ficava vermelho em lugar nenhum.
    {
      cor: avisosConfirmacao.length ? 'amarelo' : 'verde',
      texto: 'Vigia da confirmação do dia — evita o disparo das 17:00 falhar calado',
      detalhe: avisosConfirmacao.length
        ? avisosConfirmacao.join(' · ')
        : 'Horário que venceu e não saiu aparece aqui. Se o robô desistir sem mandar ninguém, o vigia libera uma segunda rodada (quem já recebeu não recebe de novo).',
    },
    {
      cor: filaParada ? 'vermelho' : 'verde',
      texto: 'Vigia da fila do WhatsApp — evita ponte viva que parou de entregar',
      detalhe: filaParada
        ? `${filaParada} mensagem(ns) esperando há mais de 10 min com a ponte conectada: o vigia religa a ponte.`
        : 'Mensagem parada há mais de 10 min com a ponte "conectada" religa a ponte. "Sem sinal" só pega a ponte caída; esta pega a que está de pé e muda.',
    },
  ]
  const vigiasBloco: Bloco = {
    cor: pior(vigias.filter(v => v.cor !== 'cinza').map(v => v.cor), 'cinza'), itens: vigias,
    resumo: vigiaVivo ? `${vigias.length} vigias; o do servidor está rodando.` : 'O vigia do servidor não está rodando.',
  }

  return NextResponse.json({
    agora: dataHoraSP(agora),
    blocos: { coleta: coletaBloco, extensao: extBloco, crm: crmBloco, ponte: ponteBloco, abas: abasBloco, servidor: servidorBloco, vigias: vigiasBloco },
  })
}

export async function POST(req: NextRequest) {
  const quem = await master()
  if (!quem) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  // ── Reenviar daqui, sem entrar no salão ─────────────────────────────────
  //
  // Quem olha a Central está logado como master, não como salão: o link para
  // /salon/crm não abriria nada. E o motivo de existir a Central é não ter de
  // entrar salão por salão.
  //
  // Faz o MESMO que o botão Reenviar do CRM: a própria linha volta para a
  // fila, sem duplicar o balão na conversa. A trava de "só o que falhou"
  // continua valendo -- aqui ela é a única, já que não há salão na sessão
  // para escopar.
  if (b.acao === 'reenviar_mensagem' && b.id) {
    const { data: m } = await supabaseAdmin
      .from('crm_mensagens').select('id, situacao, direcao').eq('id', String(b.id)).maybeSingle()
    if (!m) return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })
    if (m.direcao !== 'saida' || m.situacao !== 'falhou') {
      return NextResponse.json({ error: 'Só dá para reenviar mensagem que falhou' }, { status: 400 })
    }
    await supabaseAdmin.from('crm_mensagens').update({
      situacao: 'na_fila', erro: null, enviado_em: null, criado_em: new Date().toISOString(),
    }).eq('id', String(b.id))
    return NextResponse.json({ ok: true })
  }

  if (b.acao === 'reiniciar' && b.alvo in ALVOS) {
    await pedirReinicio(b.alvo as Alvo, String((quem as any).nome || (quem as any).email || 'master'))
    return NextResponse.json({ ok: true })
  }

  // ── Ligar e desligar o CRM de um salão ───────────────────────────────────
  //
  // Salão que nunca leu o QR fica em `aguardando_qr` para sempre -- e a ponte,
  // obediente, gera um QR novo a cada vinte segundos, sem parar, por dias. É
  // trabalho à toa num servidor de um núcleo só, e o WhatsApp não gosta de
  // quem pede pareamento sem parar.
  //
  // Desligar põe o canal em `desconectado`, que a ponte entende como "não é
  // para abrir sessão deste salão". Ligar devolve para `aguardando_qr`, e o QR
  // volta a aparecer no CRM do salão.
  //
  // Não apaga conversa nenhuma: isso é o botão "Recomeçar" do próprio CRM, e
  // continua sendo só de lá.
  if (b.acao === 'crm_ligar' || b.acao === 'crm_desligar') {
    const salaoId = String(b.salao_id || '')
    if (!salaoId) return NextResponse.json({ error: 'Salão não informado' }, { status: 400 })
    const ligar = b.acao === 'crm_ligar'
    const { error } = await supabaseAdmin.from('crm_canais').update({
      situacao: ligar ? 'aguardando_qr' : 'desconectado',
      qr: null,
      erro: null,
      ...(ligar ? {} : { sessao: null, numero: null }),
      atualizado_em: new Date().toISOString(),
    }).eq('salao_id', salaoId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      ok: true,
      texto: ligar
        ? 'CRM ligado: o QR Code volta a aparecer no CRM deste salão.'
        : 'CRM desligado: a ponte para de gerar QR para este salão.',
    })
  }

  // ── Esvaziar a fila do WhatsApp de um salão ──────────────────────────────
  //
  // Pedido do dono (03/10/2026), depois do bloqueio do número do Rouge: ele
  // quer resolver sozinho se acontecer de novo com outro salão.
  //
  // Por que isto existe: com o WhatsApp fora, o que está na fila NÃO sai -- e
  // quando a ponte reconecta, sai TUDO de uma vez, porque ela pede a fila a
  // cada segundo e leva 20 por vez. Em 02/10 eram 243 mensagens esperando;
  // soltar aquilo junto repetiria o disparo que causou o bloqueio, e o
  // conteúdo já estava vencido (confirmação de um dia que passou, feedback de
  // dois dias, aviso de cliente que já foi embora).
  //
  // NÃO apaga nada: a mensagem vira `cancelada`, com o motivo escrito, e
  // aparece na conversa como "não enviada". O histórico fica inteiro.
  if (b.acao === 'crm_esvaziar_fila') {
    const salaoId = String(b.salao_id || '')
    if (!salaoId) return NextResponse.json({ error: 'Salão não informado' }, { status: 400 })
    const porQuem = (quem as any)?.email || 'o dono'
    const agoraBR = dataHoraSP(Date.now())
    const { data, error } = await supabaseAdmin.from('crm_mensagens')
      .update({
        situacao: 'cancelada',
        erro: `Fila esvaziada por ${porQuem} em ${agoraBR}, pela Central. Mensagem de automação só vale se puder sair na hora; soltar a fila acumulada de uma vez é o caminho mais curto para o WhatsApp bloquear o número.`,
      })
      .eq('salao_id', salaoId).eq('situacao', 'na_fila')
      .select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const n = (data || []).length
    return NextResponse.json({
      ok: true,
      texto: n
        ? `${n} mensagem(ns) saíram da fila e aparecem na conversa como "não enviada". Nada foi apagado.`
        : 'A fila deste salão já estava vazia.',
    })
  }

  // ── Fechar aba do Chrome do robô ─────────────────────────────────────────
  // Só fecha o que está sobrando: aba da coleta em andamento e aba da
  // automação nunca aparecem como fecháveis, e a última aba do Chrome também
  // não (sem aba nenhuma o Chrome se encerra e o robô reabre tudo).
  if (b.acao === 'abas_fechar' || b.acao === 'abas_limpar') {
    const salaoId = String(b.salao_id || '')
    if (!salaoId) return NextResponse.json({ error: 'Salão não informado' }, { status: 400 })
    const { data } = await supabaseAdmin.from('salao_config').select('valor')
      .eq('salao_id', salaoId).eq('chave', 'crm_automacao_feedback').maybeSingle()
    const urlRel = String((data?.valor as any)?.url_relatorio || '')
    const { data: emCurso } = await supabaseAdmin.from('robo_coletas')
      .select('salao_id').eq('salao_id', salaoId).eq('situacao', 'rodando').limit(1)
    const rodando = !!(emCurso && emCurso.length)
    if (b.acao === 'abas_limpar') {
      const r = await fecharSobrando(salaoId, urlRel, rodando)
      return NextResponse.json({ ok: r.fechadas > 0, texto: r.motivo })
    }
    const r = await fecharAba(salaoId, urlRel, String(b.aba_id || ''), rodando)
    return NextResponse.json({ ok: r.ok, texto: r.motivo })
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
