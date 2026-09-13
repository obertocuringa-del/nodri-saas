// ── Automação de feedback: relatório do Avec → mensagem no WhatsApp ─────────
//
// A regra do CRM continua sendo "quem escreve é gente". Esta é a única
// exceção, e foi decisão do dono (13/09/2026): a cliente pagou, a comanda
// fechou, ela recebe o pedido de feedback. Uma mensagem por celular por dia,
// personalizada, para quem acabou de sair do salão -- é o que a recepção já
// mandava à mão, só que sem esquecer ninguém.
//
// Quem lê o Avec é a extensão do Chrome (extensao-feedback-avec/), no
// computador da recepção. Ela manda para cá as linhas do relatório 0051 do
// dia; aqui se decide QUEM recebe e se enfileira a mensagem para a ponte
// mandar. A extensão não decide nada e não guarda nada.
//
// Tudo que o dono pode querer mudar mora em salao_config, não no código: as
// duas mensagens, os status que contam, o intervalo, os endereços do Avec.
// A senha do Avec NÃO mora aqui -- fica na extensão, no computador do salão.

import { supabaseAdmin } from '@/lib/supabase'
import { normalizarTelefone, chaveTelefone, proximaAcaoPadrao, PASSIVAS_DO_DISPARO } from '@/lib/crm'
import { acharOuCriarContato } from '@/lib/crmContatos'

export const CHAVE_CFG = 'crm_automacao_feedback'
export const CHAVE_ESTADO = 'crm_automacao_feedback_estado'

export interface ConfigAutomacao {
  ligada: boolean
  intervalo_seg: number
  url_relatorio: string
  url_login: string
  /** status do relatório que valem como "pagou": Pago, Finalizado… */
  statuses: string[]
  msg1: string
  msg2: string
  /** a chave que a extensão apresenta; gerada aqui, colada lá */
  chave: string
  fuso: string
}

export interface EstadoAutomacao {
  visto_em: string | null
  ultimo: {
    em: string
    lidas: number
    elegiveis: number
    enviadas: number
    puladas: number
    erro: string | null
  } | null
  /** 'AAAA-MM-DD' → celulares que já receberam naquele dia */
  enviados: Record<string, string[]>
}

// Padrão genérico: nada de dado de salão aqui (regra do NODRI). O dono troca
// o texto na tela de configuração; {cliente} é o primeiro nome, {salao} o
// nome do salão.
export const CONFIG_PADRAO: ConfigAutomacao = {
  ligada: false,
  intervalo_seg: 60,
  url_relatorio: 'https://admin.avec.beauty/admin/relatorio/0051',
  url_login: '',
  statuses: ['Pago', 'Finalizado'],
  msg1: 'Olá *{cliente}*, tudo bem?',
  msg2: 'Passando pra agradecer pela sua visita aqui no *{salao}*, foi um prazer te atender!\n\n'
      + 'Sua opinião é muito importante pra gente melhorar cada vez mais nosso atendimento.\n\n'
      + 'Você pode me contar rapidinho como foi sua experiência?',
  chave: '',
  fuso: 'America/Sao_Paulo',
}

export function gerarChave(): string {
  const b = new Uint8Array(24)
  crypto.getRandomValues(b)
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

export function lerConfig(bruto: any): ConfigAutomacao {
  const b = bruto || {}
  const intervalo = Number(b.intervalo_seg)
  return {
    ligada: b.ligada === true,
    // Menos de 30s é martelar o Avec à toa; mais de 1h a cliente já foi embora
    // da cabeça dela.
    intervalo_seg: Number.isFinite(intervalo) ? Math.min(Math.max(Math.round(intervalo), 30), 3600) : 60,
    url_relatorio: String(b.url_relatorio || CONFIG_PADRAO.url_relatorio).trim(),
    url_login: String(b.url_login || '').trim(),
    statuses: Array.isArray(b.statuses) && b.statuses.length
      ? b.statuses.map((s: any) => String(s || '').trim()).filter(Boolean)
      : [...CONFIG_PADRAO.statuses],
    msg1: String(b.msg1 ?? CONFIG_PADRAO.msg1),
    msg2: String(b.msg2 ?? CONFIG_PADRAO.msg2),
    chave: String(b.chave || ''),
    fuso: String(b.fuso || CONFIG_PADRAO.fuso),
  }
}

export async function carregarConfig(salaoId: string): Promise<ConfigAutomacao> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_CFG).maybeSingle()
  return lerConfig(data?.valor)
}

export async function gravarConfig(salaoId: string, cfg: ConfigAutomacao) {
  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_CFG, valor: cfg, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
}

export async function carregarEstado(salaoId: string): Promise<EstadoAutomacao> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_ESTADO).maybeSingle()
  const v = data?.valor || {}
  return {
    visto_em: v.visto_em || null,
    ultimo: v.ultimo || null,
    enviados: (v.enviados && typeof v.enviados === 'object') ? v.enviados : {},
  }
}

export async function gravarEstado(salaoId: string, est: EstadoAutomacao) {
  // Só os últimos 7 dias: o registro existe para não repetir hoje, não para
  // guardar histórico -- o histórico está nas mensagens.
  const dias = Object.keys(est.enviados).sort().slice(-7)
  const enviados: Record<string, string[]> = {}
  for (const d of dias) enviados[d] = est.enviados[d]
  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_ESTADO,
    valor: { ...est, enviados }, atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
}

/** A extensão se apresenta com a chave; daqui sai o salão dono dela. */
export async function salaoPelaChave(chave: string): Promise<string | null> {
  const c = String(chave || '').trim()
  if (c.length < 32) return null
  const { data } = await supabaseAdmin.from('salao_config').select('salao_id')
    .eq('chave', CHAVE_CFG).eq('valor->>chave', c).limit(1)
  return (data || [])[0]?.salao_id || null
}

/** Hoje no fuso do salão, nos dois formatos: 'dd/mm/aaaa' (Avec) e 'aaaa-mm-dd'. */
export function hojeNoFuso(fuso: string) {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: fuso || 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(new Date())
  const g = (t: string) => partes.find(p => p.type === t)?.value || ''
  return { br: `${g('day')}/${g('month')}/${g('year')}`, iso: `${g('year')}-${g('month')}-${g('day')}` }
}

const semAcento = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

/** Só o primeiro nome, como está no Avec. "MARIA JOSE DA SILVA" → "MARIA". */
export function primeiroNome(nome: string): string {
  return String(nome || '').trim().split(/\s+/)[0] || ''
}

export function preencherAutomacao(modelo: string, cliente: string, salao: string): string {
  return String(modelo || '').replace(/\{cliente\}/g, cliente).replace(/\{salao\}/g, salao).trim()
}

export interface LinhaRelatorio {
  data: string      // 'dd/mm/aaaa'
  hora?: string
  cliente: string
  celular: string
  status: string
  numero?: string
}

/**
 * Decide quem recebe e enfileira. Devolve o resumo do ciclo.
 *
 * Uma mensagem POR CELULAR por dia -- não por nome, porque duas Marias no
 * mesmo dia é rotina, e não por agendamento, porque a mesma cliente faz
 * cabelo às 10h e unha às 14h e só pode ser agradecida uma vez.
 */
export async function processarRelatorio(salaoId: string, linhas: LinhaRelatorio[], erroExtensao?: string | null) {
  const cfg = await carregarConfig(salaoId)
  const est = await carregarEstado(salaoId)
  const agora = new Date()
  const agoraIso = agora.toISOString()
  const hoje = hojeNoFuso(cfg.fuso)
  est.visto_em = agoraIso

  const resumo = { em: agoraIso, lidas: linhas.length, elegiveis: 0, enviadas: 0, puladas: 0, erro: erroExtensao || null }

  if (!cfg.ligada) {
    est.ultimo = { ...resumo, erro: erroExtensao || 'Automação desligada' }
    await gravarEstado(salaoId, est)
    return { ligada: false, ...resumo }
  }

  const { data: salao } = await supabaseAdmin.from('saloes').select('nome').eq('id', salaoId).maybeSingle()
  const nomeSalao = String(salao?.nome || '').trim()

  const statusOk = new Set(cfg.statuses.map(semAcento))
  const jaHoje = new Set(est.enviados[hoje.iso] || [])
  const vistosNesteCiclo = new Set<string>()

  for (const l of linhas) {
    if (!statusOk.has(semAcento(l.status))) continue
    if (String(l.data || '').trim() !== hoje.br) continue
    const tel = normalizarTelefone(l.celular)
    if (!tel || tel.replace(/\D/g, '').length < 12) continue
    resumo.elegiveis++
    const k = chaveTelefone(tel)
    if (jaHoje.has(k) || vistosNesteCiclo.has(k)) { resumo.puladas++; continue }
    vistosNesteCiclo.add(k)

    const nome = String(l.cliente || '').trim()
    const primeiro = primeiroNome(nome)
    const contato = await acharOuCriarContato(salaoId, l.celular, nome || undefined, null)
    if (!contato) { resumo.puladas++; continue }

    // Conversa aberta da cliente, se houver; senão nasce uma na pasta Feedback,
    // importada (feedback não é oportunidade que o salão gerou).
    const { data: abertas } = await supabaseAdmin
      .from('crm_conversas').select('id, estado, nao_lidas')
      .eq('salao_id', salaoId).eq('contato_id', contato.id)
      .not('estado', 'in', '("agendado","confirmado","sem_conversao","desmarcou")')
      .order('ultima_em', { ascending: false }).limit(1)
    let conversa: any = (abertas || [])[0] || null

    const m1 = preencherAutomacao(cfg.msg1, primeiro, nomeSalao)
    const m2 = preencherAutomacao(cfg.msg2, primeiro, nomeSalao)
    const previa = (m2 || m1).slice(0, 120)

    if (!conversa) {
      const { data: nova } = await supabaseAdmin.from('crm_conversas').insert({
        salao_id: salaoId, contato_id: contato.id,
        estado: 'feedback', importada: true,
        proxima_acao: proximaAcaoPadrao('feedback'),
        ultima_em: agoraIso, ultima_de: 'salao', ultima_previa: previa, nao_lidas: 0,
      }).select('id, estado, nao_lidas').maybeSingle()
      conversa = nova
    } else {
      const patch: any = { ultima_em: agoraIso, ultima_de: 'salao', ultima_previa: previa, atualizado_em: agoraIso }
      // Mesma regra do disparo: só sai de pasta passiva. Quem está em Preciso
      // agir ou Follow-up continua lá -- o feedback vai, mas a pergunta dela
      // não é enterrada.
      if (PASSIVAS_DO_DISPARO.includes(conversa.estado)) {
        patch.estado = 'feedback'
        patch.proxima_acao = proximaAcaoPadrao('feedback')
        patch.aguardando_desde = null
      }
      await supabaseAdmin.from('crm_conversas').update(patch).eq('id', conversa.id)
    }
    if (!conversa) { resumo.puladas++; continue }

    // Duas mensagens, nesta ordem. A ponte manda por criado_em, então a
    // segunda nasce um segundo depois da primeira.
    const fila = [m1, m2].filter(Boolean).map((texto, i) => ({
      salao_id: salaoId, conversa_id: conversa!.id,
      direcao: 'saida', texto, tipo: 'texto', situacao: 'na_fila',
      autor_nome: 'Automação de feedback', em_massa: false,
      criado_em: new Date(agora.getTime() + i * 1000).toISOString(),
    }))
    const { error } = await supabaseAdmin.from('crm_mensagens').insert(fila)
    if (error) { resumo.puladas++; resumo.erro = String(error.message).slice(0, 200); continue }

    await supabaseAdmin.from('crm_eventos').insert({
      salao_id: salaoId, conversa_id: conversa.id, tipo: 'respondeu',
      de_estado: conversa.estado, para_estado: 'feedback',
      autor_nome: 'Automação de feedback', detalhe: `Comanda ${l.status} no Avec`,
    })

    jaHoje.add(k)
    resumo.enviadas++
  }

  est.enviados[hoje.iso] = [...jaHoje]
  est.ultimo = resumo
  await gravarEstado(salaoId, est)
  return { ligada: true, ...resumo }
}
