// ── Motor de disparo pelo relatório do Avec ─────────────────────────────────
//
// Três das automações do salão são a MESMA máquina com parâmetros diferentes:
//
//   Feedback          0051 de HOJE    · Pago/Finalizado          · a cada 60s
//   Confirmação       0051 de AMANHÃ  · Agendado/Confirmado/...  · 17:00 e 20:50
//   Aviso ao profis.  0051 de HOJE    · Aguardando/Em Atendim.   · a cada 30s
//
// Escrever as três separadas seria três códigos parecidos que divergem com o
// tempo -- daqui a uns meses um tem uma correção que o outro não tem. Então é
// um motor só, e cada uma é uma CAMPANHA configurada no NODRI. Quando o dono
// quiser uma quarta, ele cria na tela: não precisa de código.
//
// O que muda de uma para a outra:
//   dia           hoje | amanha
//   statuses      quais status do relatório entram
//   quando        intervalo de N segundos, ou horários fixos ('17:00','20:50')
//   destinatario  cliente (telefone do relatório) | profissional (cadastro)
//   mensagens     1 ou 2 textos, com {cliente} {data} {hora} {servicos} ...
//
// O que é IGUAL nas três, e por isso mora aqui:
//   - a trava de "uma vez por dia" por chave (telefone, ou prof+cliente+hora)
//   - o espaçamento entre um envio e outro
//   - a fila para a ponte mandar
//   - o painel de saúde

import { supabaseAdmin } from '@/lib/supabase'
import { normalizarTelefone, chaveTelefone, proximaAcaoPadrao, PASSIVAS_DO_DISPARO } from '@/lib/crm'
import { acharOuCriarContato } from '@/lib/crmContatos'

export const CHAVE_CAMPANHAS = 'crm_campanhas'
export const CHAVE_ESTADO = 'crm_campanhas_estado'

export type Dia = 'hoje' | 'amanha'
export type Destinatario = 'cliente' | 'profissional'

export interface Quando {
  tipo: 'intervalo' | 'horarios'
  /** tipo=intervalo: de quantos em quantos segundos */
  segundos?: number
  /** tipo=horarios: ['17:00', '20:50'] */
  horarios?: string[]
}

export interface Campanha {
  id: string
  nome: string
  ligada: boolean
  dia: Dia
  statuses: string[]
  quando: Quando
  destinatario: Destinatario
  /** 1 ou 2 mensagens, na ordem */
  mensagens: string[]
  /** segundos entre um envio e o seguinte, para não sair tudo num piscar */
  espacamento_seg: number
  /** a pasta do CRM onde a conversa cai (vazio = decide sozinho) */
  pasta: string
}

export interface EstadoCampanha {
  ultimo: { em: string; lidas: number; elegiveis: number; enviadas: number; puladas: number; erro: string | null } | null
  /** 'AAAA-MM-DD' → chaves já disparadas naquele dia */
  enviados: Record<string, string[]>
  /** 'AAAA-MM-DD' → horários fixos já cumpridos ('17:00') */
  horarios_feitos: Record<string, string[]>
  /** quando a campanha de intervalo rodou pela última vez */
  rodou_em: string | null
}

const num = (v: any, pad: number, min: number, max: number) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : pad
}

const semAcento = (s: string) => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const soHora = (s: string) => {
  const m = /(\d{1,2}):(\d{2})/.exec(String(s || ''))
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''
}

export function lerCampanha(bruto: any): Campanha | null {
  const b = bruto || {}
  const id = String(b.id || '').trim()
  if (!id) return null
  const q = b.quando || {}
  const horarios: string[] = Array.isArray(q.horarios)
    ? [...new Set(q.horarios.map((h: any) => soHora(h)).filter(Boolean) as string[])].sort()
    : []
  return {
    id,
    nome: String(b.nome || 'Campanha').slice(0, 60),
    ligada: b.ligada === true,
    dia: b.dia === 'amanha' ? 'amanha' : 'hoje',
    statuses: Array.isArray(b.statuses)
      ? b.statuses.map((s: any) => String(s || '').trim()).filter(Boolean) : [],
    quando: q.tipo === 'horarios'
      ? { tipo: 'horarios', horarios }
      // Piso de 15s: abaixo disso é martelar o Avec à toa.
      : { tipo: 'intervalo', segundos: num(q.segundos, 60, 15, 3600) },
    destinatario: b.destinatario === 'profissional' ? 'profissional' : 'cliente',
    mensagens: (Array.isArray(b.mensagens) ? b.mensagens : [])
      .map((m: any) => String(m || '')).filter(Boolean).slice(0, 3),
    espacamento_seg: num(b.espacamento_seg, 8, 0, 300),
    pasta: String(b.pasta || '').trim(),
  }
}

export async function carregarCampanhas(salaoId: string): Promise<Campanha[]> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_CAMPANHAS).maybeSingle()
  const lista = Array.isArray((data?.valor as any)?.campanhas) ? (data!.valor as any).campanhas : []
  return lista.map(lerCampanha).filter(Boolean) as Campanha[]
}

export async function gravarCampanhas(salaoId: string, campanhas: Campanha[]) {
  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_CAMPANHAS,
    valor: { campanhas }, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
}

export async function carregarEstados(salaoId: string): Promise<Record<string, EstadoCampanha>> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_ESTADO).maybeSingle()
  const v = (data?.valor as any) || {}
  const saida: Record<string, EstadoCampanha> = {}
  for (const [k, e] of Object.entries<any>(v)) {
    saida[k] = {
      ultimo: e?.ultimo || null,
      enviados: e?.enviados && typeof e.enviados === 'object' ? e.enviados : {},
      horarios_feitos: e?.horarios_feitos && typeof e.horarios_feitos === 'object' ? e.horarios_feitos : {},
      rodou_em: e?.rodou_em || null,
    }
  }
  return saida
}

export async function gravarEstados(salaoId: string, estados: Record<string, EstadoCampanha>) {
  // Só os últimos 3 dias de histórico: o registro existe para não repetir hoje.
  const limpo: Record<string, EstadoCampanha> = {}
  for (const [k, e] of Object.entries(estados)) {
    const enviados: Record<string, string[]> = {}
    for (const d of Object.keys(e.enviados).sort().slice(-3)) enviados[d] = e.enviados[d]
    const hf: Record<string, string[]> = {}
    for (const d of Object.keys(e.horarios_feitos).sort().slice(-3)) hf[d] = e.horarios_feitos[d]
    limpo[k] = { ...e, enviados, horarios_feitos: hf }
  }
  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_ESTADO,
    valor: limpo, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
}

/** Hoje e amanhã no fuso do salão, nos dois formatos. */
export function datasDoSalao(fuso = 'America/Sao_Paulo') {
  const fmt = (d: Date) => {
    const p = new Intl.DateTimeFormat('pt-BR', {
      timeZone: fuso, day: '2-digit', month: '2-digit', year: 'numeric',
    }).formatToParts(d)
    const g = (t: string) => p.find(x => x.type === t)?.value || ''
    return { br: `${g('day')}/${g('month')}/${g('year')}`, iso: `${g('year')}-${g('month')}-${g('day')}` }
  }
  const agora = new Date()
  return { hoje: fmt(agora), amanha: fmt(new Date(agora.getTime() + 864e5)) }
}

/** 'HH:MM' agora, no fuso do salão. */
export function horaAgora(fuso = 'America/Sao_Paulo') {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: fuso, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date())
}

/**
 * Esta campanha está na hora de rodar?
 *
 * Horário fixo não é "rodar exatamente às 17:00": é "já passou das 17:00 e
 * ainda não rodei hoje". Se o computador estiver desligado às 17:00 em ponto e
 * voltar 17:20, a campanha sai -- que é o certo. Mas não sai no dia seguinte
 * por causa de ontem, porque a marca é por dia.
 */
export function estaNaHora(c: Campanha, e: EstadoCampanha | undefined, fuso: string): { sim: boolean; horario?: string } {
  if (!c.ligada) return { sim: false }
  const { hoje } = datasDoSalao(fuso)

  if (c.quando.tipo === 'horarios') {
    const agora = horaAgora(fuso)
    const feitos = new Set(e?.horarios_feitos?.[hoje.iso] || [])
    // O mais tarde que já passou e ainda não foi cumprido.
    const pendente = (c.quando.horarios || [])
      .filter(h => h <= agora && !feitos.has(h))
      .sort().pop()
    return pendente ? { sim: true, horario: pendente } : { sim: false }
  }

  const seg = c.quando.segundos || 60
  if (!e?.rodou_em) return { sim: true }
  return { sim: Date.now() - new Date(e.rodou_em).getTime() >= seg * 1000 }
}

export interface LinhaRel {
  data: string
  hora: string
  cliente: string
  celular: string
  profissional: string
  servico: string
  status: string
}

const primeiroNome = (s: string) => String(s || '').trim().split(/\s+/)[0] || ''

function listar(itens: string[]): string {
  const u = [...new Set(itens.map(s => String(s || '').trim()).filter(Boolean))]
  if (!u.length) return 'atendimento'
  if (u.length === 1) return u[0]
  return u.slice(0, -1).join(', ') + ' e ' + u[u.length - 1]
}

export function preencher(modelo: string, d: Record<string, string>) {
  return String(modelo || '')
    .replace(/\{(\w+)\}/g, (_, k) => d[k] ?? '')
    // Campo vazio não pode deixar cicatriz: "Sou , recepcionista" saiu assim
    // para 20 clientes em 15/09/2026, porque {atendente} não existe em
    // campanha automática. Some a vírgula órfã e o espaço dobrado.
    .replace(/[ \t]+([,.!?;:])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/** Casa "VERA"/"SUELEN" do Avec com o cadastro do NODRI. */
function acharProfissional(nomeAvec: string, lista: any[]): any | null {
  const alvo = semAcento(nomeAvec)
  if (!alvo) return null
  const p1 = alvo.split(/\s+/)[0]
  return lista.find(p => semAcento(p.nome_completo) === alvo)
    || lista.find(p => semAcento(p.apelido) === alvo)
    || lista.find(p => semAcento(p.apelido).split(/\s+/)[0] === p1)
    || lista.find(p => semAcento(p.nome_completo).split(/\s+/)[0] === p1)
    || null
}

interface Alvo {
  chave: string
  telefone: string
  nomeContato: string
  dados: Record<string, string>
}

/**
 * Das linhas do relatório para a lista de quem recebe o quê.
 *
 * CLIENTE       agrupa por telefone: a mesma pessoa com cinco horários recebe
 *               UMA mensagem. O horário que vai na mensagem é o mais cedo do
 *               dia -- que é a hora em que ela precisa chegar.
 * PROFISSIONAL  agrupa por profissional + cliente + hora: cada profissional
 *               recebe o SEU horário, e os serviços daquele horário juntos.
 */
async function montarAlvos(
  salaoId: string, c: Campanha, linhas: LinhaRel[], dataBr: string, nomeSalao: string,
): Promise<{ alvos: Alvo[]; elegiveis: number; semTelefone: number; semCadastro: string[] }> {
  const statusOk = new Set(c.statuses.map(semAcento))
  const uteis = linhas.filter(l =>
    statusOk.has(semAcento(l.status)) && String(l.data || '').trim() === dataBr)

  if (c.destinatario === 'cliente') {
    const por = new Map<string, { nome: string; tel: string; horas: string[]; servicos: string[] }>()
    for (const l of uteis) {
      const tel = normalizarTelefone(l.celular)
      if (!tel || tel.replace(/\D/g, '').length < 12) continue
      const k = chaveTelefone(tel)
      const g = por.get(k)
      if (g) { g.horas.push(soHora(l.hora)); g.servicos.push(l.servico) }
      else por.set(k, { nome: String(l.cliente || '').trim(), tel, horas: [soHora(l.hora)], servicos: [l.servico] })
    }
    const alvos: Alvo[] = [...por.entries()].map(([k, g]) => {
      const hora = g.horas.filter(Boolean).sort()[0] || ''
      return {
        chave: k, telefone: g.tel, nomeContato: g.nome,
        dados: {
          cliente: primeiroNome(g.nome), cliente_completo: g.nome,
          data: dataBr, hora, servicos: listar(g.servicos), salao: nomeSalao,
        },
      }
    })
    return { alvos, elegiveis: uteis.length, semTelefone: 0, semCadastro: [] }
  }

  // ── profissional ──
  const { data: profs } = await supabaseAdmin
    .from('profissionais').select('id, nome_completo, apelido, telefone, ativo')
    .eq('salao_id', salaoId).eq('ativo', true).limit(300)

  const por = new Map<string, { prof: string; cliente: string; tel: string; hora: string; servicos: string[] }>()
  for (const l of uteis) {
    const prof = String(l.profissional || '').trim()
    if (!prof) continue
    const tel = normalizarTelefone(l.celular)
    const hora = soHora(l.hora)
    const k = `${semAcento(prof)}|${chaveTelefone(tel) || semAcento(l.cliente)}|${hora}`
    const g = por.get(k)
    if (g) g.servicos.push(l.servico)
    else por.set(k, { prof, cliente: String(l.cliente || '').trim(), tel, hora, servicos: [l.servico] })
  }

  const alvos: Alvo[] = []
  let semTelefone = 0
  // Quem não deu: separado entre "não achei no cadastro" e "achei mas sem
  // telefone" -- são dois consertos diferentes, e a tela precisa dizer qual.
  const semCadastro: string[] = []
  for (const [k, g] of por) {
    const p = acharProfissional(g.prof, profs || [])
    const telProf = normalizarTelefone(p?.telefone)
    if (!p || !telProf || telProf.replace(/\D/g, '').length < 12) {
      semTelefone++
      const motivo = !p ? `${g.prof} (não achei no cadastro)` : `${g.prof} (sem telefone)`
      if (!semCadastro.includes(motivo)) semCadastro.push(motivo)
      continue
    }
    alvos.push({
      chave: k, telefone: telProf, nomeContato: p.apelido || p.nome_completo,
      dados: {
        profissional: primeiroNome(p.apelido || p.nome_completo),
        cliente: g.cliente || 'sua cliente', cliente_completo: g.cliente,
        data: dataBr, hora: g.hora, servicos: listar(g.servicos), salao: nomeSalao,
      },
    })
  }
  return { alvos, elegiveis: uteis.length, semTelefone, semCadastro }
}

/**
 * Executa uma campanha em cima das linhas que a extensão leu.
 * `horarioCumprido` vem preenchido quando a campanha é de horário fixo, para
 * marcar aquele horário como feito no dia.
 */
export async function processarCampanha(
  salaoId: string, campanhaId: string, linhas: LinhaRel[],
  opts: { erro?: string | null; horarioCumprido?: string; fuso?: string; simular?: boolean } = {},
) {
  const fuso = opts.fuso || 'America/Sao_Paulo'
  const campanhas = await carregarCampanhas(salaoId)
  const c = campanhas.find(x => x.id === campanhaId)
  const estados = await carregarEstados(salaoId)
  const agoraIso = new Date().toISOString()

  const resumo = {
    em: agoraIso, lidas: linhas.length, elegiveis: 0, enviadas: 0, puladas: 0,
    // Zero sem motivo foi o que mais custou tempo neste projeto. Quando nada
    // sai, a tela tem que dizer POR QUE -- senão vira "não funciona" e alguém
    // passa uma hora procurando.
    sem_telefone: 0, sem_cadastro: [] as string[],
    erro: opts.erro || null,
  }
  if (!c) return { ...resumo, ok: false, erro: 'Campanha não encontrada' }

  const e: EstadoCampanha = estados[c.id] || { ultimo: null, enviados: {}, horarios_feitos: {}, rodou_em: null }
  e.rodou_em = agoraIso
  const { hoje, amanha } = datasDoSalao(fuso)
  const alvoData = c.dia === 'amanha' ? amanha : hoje

  // O horário fixo é marcado como cumprido MESMO se não houver ninguém para
  // mandar: senão a campanha tentaria de novo a cada volta até virar o dia.
  //
  // MAS não quando a extensão veio de mãos vazias por ERRO. Em 18/09/2026 às
  // 17:01 ela não achou os campos do relatório (o Avec demorou a montar a
  // tela), devolveu zero linhas com o erro escrito -- e o 17:00 foi marcado
  // como feito: nenhuma confirmação saiu e nada tentaria de novo até as
  // 20:50. Erro com zero linhas é "tenta de novo na próxima volta". Só depois
  // de cinco tentativas seguidas falhando o horário é dado por perdido, para
  // não ficar o dia inteiro martelando um Avec fora do ar.
  const TENTATIVAS_MAX = 5
  const falhouSemLer = !!opts.erro && linhas.length === 0 && !opts.simular
  if (opts.horarioCumprido) {
    const chaveTent = `${hoje.iso} ${opts.horarioCumprido}`
    const tent = ((e as any).tentativas_horario?.[chaveTent] || 0) + (falhouSemLer ? 1 : 0)
    ;(e as any).tentativas_horario = { [chaveTent]: tent }
    if (!falhouSemLer || tent >= TENTATIVAS_MAX) {
      const feitos = new Set(e.horarios_feitos[hoje.iso] || [])
      feitos.add(opts.horarioCumprido)
      e.horarios_feitos[hoje.iso] = [...feitos]
    }
  }

  // ── Simulação ─────────────────────────────────────────────────────────────
  //
  // Faz a conta toda e devolve QUEM receberia e o TEXTO exato, sem enfileirar
  // nada e sem marcar ninguém como já avisado. É o único jeito honesto de
  // testar automação que manda mensagem: errar na simulação não custa cliente.
  if (opts.simular) {
    const { data: s0 } = await supabaseAdmin.from('saloes').select('nome').eq('id', salaoId).maybeSingle()
    const { alvos, elegiveis, semTelefone } = await montarAlvos(
      salaoId, c, linhas, alvoData.br, String(s0?.nome || '').trim())
    const jaHoje = new Set(e.enviados[hoje.iso] || [])
    return {
      ok: true, simulacao: true, campanha: c.nome, ligada: c.ligada,
      dia: c.dia, data_alvo: alvoData.br,
      lidas: linhas.length, elegiveis, sem_telefone: semTelefone,
      ja_receberam_hoje: alvos.filter(a => jaHoje.has(a.chave)).length,
      mandaria_para: alvos.filter(a => !jaHoje.has(a.chave)).length,
      exemplos: alvos.filter(a => !jaHoje.has(a.chave)).slice(0, 4).map(a => ({
        para: a.nomeContato,
        telefone: a.telefone.slice(0, 4) + '****' + a.telefone.slice(-4),
        hora: a.dados.hora,
        servicos: a.dados.servicos,
        mensagens: c.mensagens.map(m => preencher(m, a.dados)),
      })),
    }
  }

  if (!c.ligada) {
    e.ultimo = { ...resumo, erro: opts.erro || 'Campanha desligada' }
    estados[c.id] = e
    await gravarEstados(salaoId, estados)
    return { ok: true, ligada: false, ...resumo }
  }

  const { data: salao } = await supabaseAdmin.from('saloes').select('nome').eq('id', salaoId).maybeSingle()
  const { alvos, elegiveis, semTelefone, semCadastro } = await montarAlvos(salaoId, c, linhas, alvoData.br, String(salao?.nome || '').trim())
  resumo.elegiveis = elegiveis
  resumo.puladas += semTelefone
  resumo.sem_telefone = semTelefone
  resumo.sem_cadastro = semCadastro

  // A marca é por DIA DO DISPARO, não pelo dia do agendamento: a confirmação de
  // amanhã sai hoje às 17h e não pode repetir hoje às 20:50.
  const jaHoje = new Set(e.enviados[hoje.iso] || [])

  // ── Em lotes paralelos, gravando a lista a cada lote ──────────────────────
  //
  // Um alvo por vez são cinco idas ao banco em fila; com 20 confirmações a
  // função passava de 60 s e a Vercel a matava no meio (504 em 15/09/2026
  // 17:00). As mensagens já estavam na fila -- mas a lista de quem recebeu
  // NÃO foi gravada, e às 20:50 as mesmas 20 clientes receberiam de novo.
  //
  // Agora seis alvos correm juntos, e a lista de quem recebeu é gravada ao
  // fim de cada lote. Se a função morrer, morre com a lista em dia.
  const LOTE = 6
  const fila = alvos.filter(a => {
    if (jaHoje.has(a.chave)) { resumo.puladas++; return false }
    return true
  })
  let posicao = 0
  const processarAlvo = async (a: Alvo) => {
    const contato = await acharOuCriarContato(salaoId, a.telefone, a.nomeContato || undefined, null)
    if (!contato) { resumo.puladas++; return }

    const textos = c.mensagens.map(m => preencher(m, a.dados)).filter(Boolean)
    if (!textos.length) { resumo.puladas++; return }
    const previa = (textos[textos.length - 1] || '').slice(0, 120)

    const { data: abertas } = await supabaseAdmin
      .from('crm_conversas').select('id, estado, nao_lidas')
      .eq('salao_id', salaoId).eq('contato_id', contato.id)
      .not('estado', 'in', '("agendado","confirmado","sem_conversao","desmarcou")')
      .order('ultima_em', { ascending: false }).limit(1)
    let conversa: any = (abertas || [])[0] || null

    // ── Uma conversa por cliente ────────────────────────────────────────────
    //
    // Sem conversa aberta, reusa a ÚLTIMA da cliente, mesmo encerrada, em vez
    // de criar outra. Antes nascia uma segunda conversa toda vez que a
    // recepção tinha marcado Agendado/Confirmado pouco antes do disparo (Ana,
    // 24/09/2026: confirmada às 18:57, a confirmação das 20:50 abriu outra).
    // Em 25/09/2026 eram 172 clientes com conversa repetida, até 6 cada.
    //
    // A janela é a MESMA da entrada de mensagem (DIAS_MESMA_CONVERSA em
    // api/crm/ponte): encerrada há até 7 dias é a mesma conversa; mais antiga
    // que isso, nasce outra -- é assim que o painel conta cliente que voltou.
    let reaberta = false
    if (!conversa) {
      const { data: ultimas } = await supabaseAdmin
        .from('crm_conversas').select('id, estado, nao_lidas, fechada_em, ultima_em')
        .eq('salao_id', salaoId).eq('contato_id', contato.id)
        .order('ultima_em', { ascending: false }).limit(1)
      const f: any = (ultimas || [])[0]
      const quando = f?.fechada_em || f?.ultima_em
      if (f && quando && new Date(quando).getTime() >= Date.now() - 7 * 864e5) {
        conversa = f
        reaberta = true
      }
    }

    const destino = c.pasta || (c.destinatario === 'profissional' ? 'aguardando' : 'confirmacao')

    if (!conversa) {
      const { data: nova } = await supabaseAdmin.from('crm_conversas').insert({
        salao_id: salaoId, contato_id: contato.id,
        estado: destino, importada: true,
        proxima_acao: proximaAcaoPadrao(destino as any),
        ultima_em: agoraIso, ultima_de: 'salao', ultima_previa: previa, nao_lidas: 0,
      }).select('id, estado').maybeSingle()
      conversa = nova
    } else {
      const patch: any = { ultima_em: agoraIso, ultima_de: 'salao', ultima_previa: previa, atualizado_em: agoraIso }
      // Mesma regra do disparo: só mexe em pasta passiva. Quem está em "Preciso
      // agir" ou Follow-up continua lá -- a pergunta dela não é enterrada.
      // A encerrada que foi reaproveitada vai para a pasta do disparo, como a
      // conversa nova ia -- a não ser que tenha mensagem dela sem ler: aí fica
      // onde está, e a tela continua mostrando em "Preciso agir".
      const reabre = reaberta && !((conversa.nao_lidas || 0) > 0)
      // Pasta "Conversa Finalizada" do salão (pedido do dono, 25/09/2026):
      // envio para CLIENTE tira de lá e leva para a pasta do disparo. Pasta do
      // salão segura a conversa, então a resposta que não era confirmação
      // ficava piscando lá dentro em vez de ir para "Preciso agir". A chave
      // nasce do nome (no Rouge, extra_cinversa_finalizada_6py). Profissionais
      // e as demais pastas do salão continuam intocadas.
      const daFinalizada = c.destinatario !== 'profissional'
        && /^extra_.*finaliz/.test(String(conversa.estado || ''))
      // Pasta Profissionais SEGURA a conversa (pedido do dono, 26/09/2026):
      // o aviso "seu cliente das 17:00" reabria a conversa encerrada da
      // VANESSA e a levava para Aguardando. Reabre, mas dentro da pasta.
      const pastaDeProfissional = /^extra_profissiona/.test(String(conversa.estado || ''))
      if (pastaDeProfissional) {
        if (reaberta) patch.fechada_em = null
      } else if (reabre || daFinalizada || PASSIVAS_DO_DISPARO.includes(conversa.estado) || conversa.estado === destino) {
        patch.estado = destino
        patch.proxima_acao = proximaAcaoPadrao(destino as any)
        patch.aguardando_desde = null
        if (reabre) patch.fechada_em = null
      }
      await supabaseAdmin.from('crm_conversas').update(patch).eq('id', conversa.id)
    }
    if (!conversa) { resumo.puladas++; return }

    // O espaçamento entra no `criado_em`: a ponte manda a fila em ordem, então
    // separar aqui separa lá. Sem isso, 60 confirmações saem num piscar e o
    // WhatsApp entende como disparo de lista. A posição na fila é tomada
    // ANTES das idas ao banco, para dois alvos paralelos não pegarem a mesma.
    const minhaPosicao = posicao++
    const base = Date.now() + minhaPosicao * c.espacamento_seg * 1000
    const mensagens = textos.map((texto, i) => ({
      salao_id: salaoId, conversa_id: conversa!.id,
      direcao: 'saida', texto, tipo: 'texto', situacao: 'na_fila',
      autor_nome: c.nome, em_massa: false,
      criado_em: new Date(base + i * 1000).toISOString(),
    }))
    const { error } = await supabaseAdmin.from('crm_mensagens').insert(mensagens)
    if (error) { resumo.puladas++; resumo.erro = String(error.message).slice(0, 200); return }

    jaHoje.add(a.chave)
    resumo.enviadas++
  }

  for (let i = 0; i < fila.length; i += LOTE) {
    await Promise.all(fila.slice(i, i + LOTE).map(a => processarAlvo(a).catch(e => {
      resumo.puladas++
      resumo.erro = String(e?.message || e).slice(0, 200)
    })))
    e.enviados[hoje.iso] = [...jaHoje]
    e.ultimo = resumo
    estados[c.id] = e
    await gravarEstados(salaoId, estados)
  }

  e.enviados[hoje.iso] = [...jaHoje]
  e.ultimo = resumo
  estados[c.id] = e
  await gravarEstados(salaoId, estados)
  return { ok: true, ligada: true, ...resumo }
}

// ── Campanhas de fábrica ────────────────────────────────────────────────────
//
// Nascem TODAS desligadas. Texto genérico, sem nome de salão nenhum: é a regra
// do NODRI, e foi ela que impediu a campanha de um salão de vazar para outro.

export function campanhasPadrao(): Campanha[] {
  return [
    {
      id: 'confirmacao_diaria',
      nome: 'Confirmação do dia seguinte',
      ligada: false,
      dia: 'amanha',
      statuses: ['Agendado', 'Confirmado', 'Aguardando', 'Em Atendimento', 'Finalizado'],
      quando: { tipo: 'horarios', horarios: ['17:00', '20:50'] },
      destinatario: 'cliente',
      mensagens: [
        'Olá *{cliente}*, tudo bem?\n\n'
        // Sem {atendente}: campanha automática não tem ninguém escrevendo, e o
        // campo vazio virava "Sou , recepcionista". {salao} continua, mas o
        // salão deve trocar pelo nome fantasia na tela (o cadastro guarda a
        // razão social, e "OLIVEIRA E SCHNEIDER LTDA" não é como a cliente o chama).
        + 'Sou da recepção do {salao}. Estou entrando em contato para confirmar o seu agendamento conosco:\n\n'
        + '*Data:* {data}\n*Horário:* {hora}.\n\nPodemos confirmar?',
      ],
      // 20 segundos = 3 por minuto. Ritmo pedido pelo dono para o WhatsApp não
      // entender o disparo de confirmação como lista.
      espacamento_seg: 20,
      pasta: 'confirmacao',
    },
    {
      id: 'aviso_profissional',
      nome: 'Avisar o profissional que a cliente chegou',
      ligada: false,
      dia: 'hoje',
      statuses: ['Aguardando', 'Em Atendimento'],
      quando: { tipo: 'intervalo', segundos: 30 },
      destinatario: 'profissional',
      mensagens: ['{profissional}, sua cliente das {hora}, *{cliente}* — {servicos} — já chegou.'],
      espacamento_seg: 3,
      pasta: '',
    },
  ]
}
