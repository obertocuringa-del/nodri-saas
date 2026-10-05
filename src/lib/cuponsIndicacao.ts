import { supabaseAdmin } from '@/lib/supabase'
import { normalizarTelefone, chaveTelefone } from '@/lib/crm'
import { grafiasDoTelefone } from '@/lib/crmContatos'

// ── Cupons de indicação ─────────────────────────────────────────────────────
//
// A cliente pega um cupom na página pública e distribui para quem quiser.
// Quem chega com ele ganha 10% na PRIMEIRA visita; a dona ganha um crédito
// de 10% por indicada que realmente foi atendida, e gasta um crédito por
// visita dela.
//
// Três regras seguram o módulo inteiro:
//
//  1. A identidade é o TELEFONE. Nome repete — o salão tem homônimas —, e foi
//     por telefone que juntamos as 28 fichas duplicadas do CRM em 02/10.
//  2. A trava de uso é na PESSOA INDICADA, não no código. O código da Ana
//     serve para quantas pessoas ela quiser; o que não pode é a mesma pessoa
//     usar duas vezes.
//  3. Crédito nasce de comanda, não de promessa. Quem apresenta o cupom e vai
//     embora não faturou nada para o salão.

export const CHAVE_CFG = 'cupons_indicacao_cfg'

export interface CfgCupons {
  /** Liga a aba na página pública. */
  ativo: boolean
  /**
   * Último dia em que a INDICADA pode usar o cupom, 'AAAA-MM-DD'.
   *
   * Vale para gerar e para validar. Não vale para o crédito que a dona já
   * juntou: por decisão do salão, o que ela ganhou em outubro ela gasta
   * depois. O que morre na data é o desconto de primeira visita.
   */
  validoAte: string | null
  /** Quanto a arte promete. Guardado para a tela não mentir se mudar. */
  percentual: number
}

export const CFG_PADRAO: CfgCupons = { ativo: false, validoAte: null, percentual: 10 }

export async function getCfg(salaoId: string): Promise<CfgCupons> {
  const { data } = await supabaseAdmin
    .from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_CFG).maybeSingle()
  const v = (data as any)?.valor
  return v && typeof v === 'object' ? { ...CFG_PADRAO, ...v } : { ...CFG_PADRAO }
}

export async function salvarCfg(salaoId: string, cfg: CfgCupons) {
  return supabaseAdmin.from('salao_config').upsert(
    { salao_id: salaoId, chave: CHAVE_CFG, valor: cfg, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
}

/** Hoje em São Paulo, 'AAAA-MM-DD'. O servidor roda em UTC: depois das 21h
 *  ele já virou o dia, e um crédito usado à noite cairia na data de amanhã. */
export function hojeISO(): string {
  return new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)
}

export function campanhaVencida(cfg: CfgCupons): boolean {
  return !!cfg.validoAte && hojeISO() > cfg.validoAte
}

// ── O código ────────────────────────────────────────────────────────────────
//
// Precisa ser ditável por telefone e difícil de errar. Por isso leva as
// letras do nome na frente (a cliente reconhece o próprio cupom) e um sufixo
// de alfabeto reduzido: sem O, I, 0 e 1, que ninguém distingue ao ouvir.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function prefixoDoNome(nome: string): string {
  const limpo = String(nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z]/g, '')
  return (limpo.slice(0, 3) || 'RGE').padEnd(3, 'X')
}

function sufixo(n = 4): string {
  let s = ''
  for (let i = 0; i < n; i++) s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
  return s
}

// ── Já é cliente do salão? ──────────────────────────────────────────────────
//
// A promoção é de PRIMEIRA visita, e a arte diz isso. Sem esta checagem,
// cliente antiga pega o cupom de uma amiga e tira 10% — e a promoção vira
// desconto geral para a casa inteira.
//
// Procura por todas as grafias do mesmo celular (com 55 e sem, com nono
// dígito e sem), que é como o Avec devolve: nunca igual duas vezes.
export async function jaEhCliente(salaoId: string, telefone: string): Promise<boolean> {
  const grafias = grafiasDoTelefone(normalizarTelefone(telefone))
  if (!grafias.length) return false

  // Duas colunas guardam telefone em `atendimentos_raw`, e nem toda planilha
  // preenche as duas. Conferir só uma deixa passar metade dos casos.
  for (const col of ['celular', 'telefone'] as const) {
    const { count } = await supabaseAdmin
      .from('atendimentos_raw')
      .select('id', { count: 'exact', head: true })
      .eq('salao_id', salaoId)
      .in(col, grafias)
    if ((count || 0) > 0) return true
  }
  return false
}

/** Datas em que esse telefone foi atendido, da mais nova para a mais velha. */
export async function visitasDoTelefone(salaoId: string, telefone: string): Promise<string[]> {
  const grafias = grafiasDoTelefone(normalizarTelefone(telefone))
  if (!grafias.length) return []
  const datas = new Set<string>()
  for (const col of ['celular', 'telefone'] as const) {
    const { data } = await supabaseAdmin
      .from('atendimentos_raw').select('data_comanda')
      .eq('salao_id', salaoId).in(col, grafias)
      .order('data_comanda', { ascending: false }).limit(400)
    for (const r of data || []) {
      const d = String((r as any).data_comanda || '').slice(0, 10)
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) datas.add(d)
    }
  }
  return [...datas].sort().reverse()
}

// ── Pegar o cupom ───────────────────────────────────────────────────────────

export interface Cupom {
  id: string
  codigo: string
  dono_nome: string
  dono_telefone: string
  dono_chave: string
}

export async function acharCupomPorTelefone(salaoId: string, telefone: string): Promise<Cupom | null> {
  const chave = chaveTelefone(telefone)
  if (!chave) return null
  const { data } = await supabaseAdmin
    .from('cupom_indicacao').select('id, codigo, dono_nome, dono_telefone, dono_chave')
    .eq('salao_id', salaoId).eq('dono_chave', chave).maybeSingle()
  return (data as any) || null
}

export async function acharCupomPorCodigo(salaoId: string, codigo: string): Promise<Cupom | null> {
  const limpo = String(codigo || '').trim().toUpperCase().replace(/\s+/g, '')
  if (!limpo) return null
  const { data } = await supabaseAdmin
    .from('cupom_indicacao').select('id, codigo, dono_nome, dono_telefone, dono_chave')
    .eq('salao_id', salaoId).ilike('codigo', limpo).maybeSingle()
  return (data as any) || null
}

/** Nome da pessoa no CRM, se ela já for conhecida do salão. */
export async function nomeNoCrm(salaoId: string, telefone: string): Promise<string | null> {
  const grafias = grafiasDoTelefone(normalizarTelefone(telefone))
  if (!grafias.length) return null
  const { data } = await supabaseAdmin
    .from('crm_contatos').select('nome, telefone')
    .eq('salao_id', salaoId).in('telefone', grafias).limit(10)
  const alvo = chaveTelefone(telefone)
  const achado = (data || []).find((c: any) => c.telefone && chaveTelefone(c.telefone) === alvo)
  const nome = String((achado as any)?.nome || '').trim()
  return nome || null
}

/**
 * Cria o cupom, ou devolve o que já existe.
 *
 * Nunca gera um segundo código para a mesma pessoa: ela já distribuiu o
 * primeiro, e trocar deixaria quem recebeu com um papel que não vale nada.
 */
export async function criarCupom(salaoId: string, nome: string, telefone: string): Promise<Cupom | null> {
  const existente = await acharCupomPorTelefone(salaoId, telefone)
  if (existente) return existente

  const tel = normalizarTelefone(telefone)
  const chave = chaveTelefone(telefone)
  if (!chave) return null
  const limpo = String(nome || '').trim().slice(0, 80) || 'Cliente'

  // Até cinco tentativas: o sufixo é aleatório e pode bater com um existente.
  // Quem decide se bateu é o índice único, não uma consulta antes — entre
  // consultar e gravar cabe outra pessoa gerando o mesmo código.
  for (let i = 0; i < 5; i++) {
    const codigo = `${prefixoDoNome(limpo)}-${sufixo()}`
    const { data, error } = await supabaseAdmin
      .from('cupom_indicacao')
      .insert({ salao_id: salaoId, codigo, dono_nome: limpo, dono_telefone: tel, dono_chave: chave })
      .select('id, codigo, dono_nome, dono_telefone, dono_chave').maybeSingle()
    if (!error && data) return data as any
    // Corrida: outra aba criou o cupom desta mesma pessoa no meio do caminho.
    const agora = await acharCupomPorTelefone(salaoId, telefone)
    if (agora) return agora
  }
  return null
}

// ── Validar no balcão ───────────────────────────────────────────────────────

export interface ResultadoValidacao {
  ok: boolean
  motivo?: string
  /** Quando já usou: quando foi e por quem tinha sido indicada. */
  detalhe?: { data: string; donoNome: string }
}

/**
 * As checagens que rodam ANTES de registrar o uso. Separadas do registro
 * porque a tela mostra o resultado antes de a recepção confirmar.
 */
export async function conferirUso(
  salaoId: string, cupom: Cupom, telefoneIndicada: string,
): Promise<ResultadoValidacao> {
  const chave = chaveTelefone(telefoneIndicada)
  if (!chave) return { ok: false, motivo: 'Telefone inválido.' }

  // 1. Ninguém usa o próprio cupom. É o furo mais óbvio e o mais tentado.
  if (chave === cupom.dono_chave) {
    return { ok: false, motivo: 'Este é o cupom da própria pessoa — não dá para usar em si mesma.' }
  }

  // 2. Uma vez por pessoa, valendo para QUALQUER cupom. Se a Maria já veio
  //    com o código da Ana, não volta com o da Joana.
  const { data: uso } = await supabaseAdmin
    .from('cupom_indicacao_usos')
    .select('validado_em, atendida_em, cupom_id')
    .eq('salao_id', salaoId).eq('indicada_chave', chave).maybeSingle()
  if (uso) {
    const { data: antigo } = await supabaseAdmin
      .from('cupom_indicacao').select('dono_nome').eq('id', (uso as any).cupom_id).maybeSingle()
    return {
      ok: false,
      motivo: 'Esta cliente já usou cupom de indicação.',
      detalhe: {
        data: String((uso as any).atendida_em || (uso as any).validado_em || '').slice(0, 10),
        donoNome: (antigo as any)?.dono_nome || '',
      },
    }
  }

  // 3. A promoção é de primeira visita — é o que a arte promete.
  if (await jaEhCliente(salaoId, telefoneIndicada)) {
    return { ok: false, motivo: 'Esta cliente já tem atendimento no salão. O cupom vale só na primeira visita.' }
  }

  return { ok: true }
}

export async function registrarUso(
  salaoId: string, cupom: Cupom, nome: string, telefone: string, por: string,
): Promise<ResultadoValidacao> {
  const conferido = await conferirUso(salaoId, cupom, telefone)
  if (!conferido.ok) return conferido

  const { error } = await supabaseAdmin.from('cupom_indicacao_usos').insert({
    salao_id: salaoId,
    cupom_id: cupom.id,
    indicada_nome: String(nome || '').trim().slice(0, 80) || 'Cliente',
    indicada_telefone: normalizarTelefone(telefone),
    indicada_chave: chaveTelefone(telefone),
    validado_por: String(por || '').slice(0, 60),
  })
  // O índice único é a palavra final: entre conferir e gravar, outro caixa
  // pode ter registrado a mesma pessoa.
  if (error) return { ok: false, motivo: 'Esta cliente já usou cupom de indicação.' }
  return { ok: true }
}

// ── Sincronizar com o que o Avec já trouxe ──────────────────────────────────
//
// Dois cruzamentos, e os dois existem porque passo manual não acontece — foi
// a lição do vigia que nunca rodou e da fila que ficou parada.
//
//  a) a indicada apresentou o cupom e depois foi atendida → o crédito da dona
//     nasce aqui, não no balcão;
//  b) a dona foi ao salão e tinha saldo → o crédito é consumido aqui, mesmo
//     que a recepção esqueça de marcar.
//
// Roda sob demanda (sempre que a tela de validação abre) e também por cron.
// Sob demanda porque a Central já mostrou que confiar só no cron custa caro.
export async function sincronizar(salaoId: string): Promise<{ atendidas: number; creditosBaixados: number }> {
  let atendidas = 0
  let creditosBaixados = 0

  // (a) quem apresentou e ainda não consta como atendida
  const { data: pendentes } = await supabaseAdmin
    .from('cupom_indicacao_usos')
    .select('id, indicada_telefone, validado_em')
    .eq('salao_id', salaoId).eq('situacao', 'apresentou').limit(500)

  for (const u of pendentes || []) {
    const visitas = await visitasDoTelefone(salaoId, (u as any).indicada_telefone)
    // Só conta visita a partir do dia em que ela apresentou o cupom. Uma
    // comanda anterior seria justamente o caso que a regra de primeira visita
    // deveria ter barrado.
    const desde = String((u as any).validado_em || '').slice(0, 10)
    const valida = visitas.filter(d => !desde || d >= desde).pop()
    if (valida) {
      await supabaseAdmin.from('cupom_indicacao_usos')
        .update({ situacao: 'atendida', atendida_em: valida }).eq('id', (u as any).id)
      atendidas++
    }
  }

  // (b) donas com saldo que foram ao salão depois de ganhar o crédito
  const { data: cupons } = await supabaseAdmin
    .from('cupom_indicacao').select('id, dono_telefone').eq('salao_id', salaoId).limit(2000)

  for (const c of cupons || []) {
    const saldo = await saldoDoCupom(salaoId, (c as any).id)
    if (saldo.saldo <= 0) continue

    const visitas = await visitasDoTelefone(salaoId, (c as any).dono_telefone)
    // Visitas que ainda não têm crédito baixado, e só as que aconteceram
    // depois de existir crédito para gastar: não se desconta retroativo.
    const { data: jaUsados } = await supabaseAdmin
      .from('cupom_indicacao_creditos').select('usado_em').eq('cupom_id', (c as any).id)
    const usadas = new Set((jaUsados || []).map((r: any) => String(r.usado_em).slice(0, 10)))

    const desde = saldo.primeiroCreditoEm
    const candidatas = visitas
      .filter(d => !usadas.has(d) && (!desde || d >= desde))
      .sort()                                    // da mais antiga para a mais nova
      .slice(0, saldo.saldo)                     // nunca mais do que ela tem

    for (const dia of candidatas) {
      const { error } = await supabaseAdmin.from('cupom_indicacao_creditos')
        .insert({ salao_id: salaoId, cupom_id: (c as any).id, usado_em: dia, origem: 'automatico' })
      if (!error) creditosBaixados++
    }
  }

  return { atendidas, creditosBaixados }
}

export interface Saldo {
  indicadas: number
  compareceram: number
  usados: number
  saldo: number
  /** Dia do primeiro crédito ganho — antes dele não há o que descontar. */
  primeiroCreditoEm: string | null
}

export async function saldoDoCupom(salaoId: string, cupomId: string): Promise<Saldo> {
  const { data: usos } = await supabaseAdmin
    .from('cupom_indicacao_usos').select('situacao, atendida_em')
    .eq('salao_id', salaoId).eq('cupom_id', cupomId).limit(2000)
  const { data: creditos } = await supabaseAdmin
    .from('cupom_indicacao_creditos').select('usado_em')
    .eq('salao_id', salaoId).eq('cupom_id', cupomId).limit(2000)

  const atendidas = (usos || []).filter((u: any) => u.situacao === 'atendida')
  const datas = atendidas.map((u: any) => String(u.atendida_em || '').slice(0, 10)).filter(Boolean).sort()
  const compareceram = atendidas.length
  const usados = (creditos || []).length

  return {
    indicadas: (usos || []).length,
    compareceram,
    usados,
    saldo: Math.max(0, compareceram - usados),
    primeiroCreditoEm: datas[0] || null,
  }
}

/** A recepção marcou que a dona usou o desconto hoje. */
export async function gastarCredito(salaoId: string, cupomId: string): Promise<{ ok: boolean; motivo?: string }> {
  const saldo = await saldoDoCupom(salaoId, cupomId)
  if (saldo.saldo <= 0) return { ok: false, motivo: 'Sem crédito disponível.' }
  const { error } = await supabaseAdmin.from('cupom_indicacao_creditos')
    .insert({ salao_id: salaoId, cupom_id: cupomId, usado_em: hojeISO(), origem: 'manual' })
  // Índice único por dia: o desconto é um por visita, e dois cliques no mesmo
  // dia são o mesmo desconto.
  if (error) return { ok: false, motivo: 'O desconto de hoje já foi registrado.' }
  return { ok: true }
}
