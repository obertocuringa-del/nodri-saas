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
  /**
   * Rodapé da arte: os destaques do salão e o endereço.
   *
   * Vazios por padrão, e preenchidos no painel de cada salão. Nenhum
   * exemplo fica no código: modelo com dado de um salão já nasceu em salão
   * novo uma vez, e endereço errado numa arte que circula no WhatsApp é
   * cliente batendo na porta errada.
   */
  destaques?: string
  endereco?: string
}

export const CFG_PADRAO: CfgCupons = {
  ativo: false, validoAte: null, percentual: 10, destaques: '', endereco: '',
}

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

/**
 * `data_comanda` para 'AAAA-MM-DD'.
 *
 * ATENÇÃO: em `atendimentos_raw` a data é TEXTO em DD/MM/AAAA -- as 131.505
 * linhas da base, sem exceção. Tratar esse campo como ISO foi o que deixou a
 * regra de primeira visita sem funcionar nenhuma vez: o filtro de formato
 * descartava toda data, a lista voltava vazia, e QUALQUER cliente antiga
 * passava como "primeira vez no salão". Pego em 04/10/2026 com uma cliente
 * que tinha comanda desde 2024.
 *
 * Pelo mesmo motivo nunca se ordena esse campo no banco: como texto, 31/01
 * vem depois de 30/09, porque a comparação começa pelo DIA.
 */
export function dataComandaISO(bruto: string | null | undefined): string | null {
  const s = String(bruto || '').trim()
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
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
  return !!(await ultimaVisita(salaoId, telefone))
}

/**
 * A ÚLTIMA vez que esse telefone foi atendido, ou null.
 *
 * Separada de `visitasDoTelefone` porque é ela que roda no balcão, com a
 * recepção e a cliente esperando: pede uma linha, não o histórico inteiro.
 * Para por telefone porque nome repete -- o salão tem homônimas.
 *
 * Depende de `idx_atend_celular` e `idx_atend_telefone`. Sem o segundo, a
 * consulta na coluna `telefone` varria as 131 mil linhas: 4,2 segundos
 * medidos em 04/10/2026, contra 0,14 ms com o índice.
 */
export async function ultimaVisita(salaoId: string, telefone: string): Promise<string | null> {
  const grafias = grafiasDoTelefone(normalizarTelefone(telefone))
  if (!grafias.length) return null

  // SEM `order by` de propósito.
  //
  // Com `order by data_comanda desc limit 1`, o planner prefere o índice de
  // DATA e varre as comandas do salão de trás para frente filtrando telefone
  // -- 99 ms descartando 865 linhas, e muito pior para quem veio há um ano,
  // porque a varredura só para quando acha. Sem a ordenação ele usa o índice
  // composto de telefone, devolve só as comandas daquela pessoa (Index Only
  // Scan, nenhuma linha descartada) e quem escolhe a mais recente é o JS.
  //
  // Medido em 04/10/2026 contra 131 mil linhas.
  const [c, f] = await Promise.all(['celular', 'telefone'].map(col =>
    supabaseAdmin
      .from('atendimentos_raw').select('data_comanda')
      .eq('salao_id', salaoId).in(col, grafias)
      .limit(400),
  ))

  let maior: string | null = null
  for (const r of [...(c.data || []), ...(f.data || [])]) {
    const d = dataComandaISO((r as any).data_comanda)
    if (d && (!maior || d > maior)) maior = d
  }
  return maior
}

/** Datas em que esse telefone foi atendido, da mais nova para a mais velha.
 *  Usada pela sincronização, que precisa do histórico; no balcão use
 *  `ultimaVisita`, que pede uma linha só. */
export async function visitasDoTelefone(salaoId: string, telefone: string): Promise<string[]> {
  const grafias = grafiasDoTelefone(normalizarTelefone(telefone))
  if (!grafias.length) return []
  const datas = new Set<string>()
  // Mesma razão de `ultimaVisita`: sem `order by`, o índice composto de
  // telefone é usado e nenhuma linha é descartada.
  for (const col of ['celular', 'telefone'] as const) {
    const { data } = await supabaseAdmin
      .from('atendimentos_raw').select('data_comanda')
      .eq('salao_id', salaoId).in(col, grafias)
      .limit(400)
    for (const r of data || []) {
      const d = dataComandaISO((r as any).data_comanda)
      if (d) datas.add(d)
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
  // So o que o codigo pode conter. Sem esta limpeza, `%` e `_` chegavam ao
  // `ilike` como CURINGAS: digitar "%" na busca da recepcao traria um cupom
  // que ninguem pediu -- o de outra cliente.
  const limpo = String(codigo || '').toUpperCase().replace(/[^A-Z0-9-]/g, '')
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
  /** Por que recusou, em uma palavra: a tela muda o texto conforme o caso. */
  causa?: 'proprio' | 'ja_usou' | 'ja_cliente' | 'telefone'
  /** Quando já usou: quando foi e por quem tinha sido indicada. */
  detalhe?: { data: string; donoNome: string }
  /**
   * Última vez que essa pessoa foi atendida no salão.
   *
   * É o que encerra a conversa no balcão: dizer "você já é cliente" sem a
   * data vira discussão; com a data, não há o que discutir.
   */
  ultimaVisita?: string | null
  /** Nome que o salão já tem para esse telefone, para a tela preencher. */
  nomeConhecido?: string | null
}

/**
 * As checagens que rodam ANTES de registrar o uso. Separadas do registro
 * porque a tela mostra o resultado antes de a recepção confirmar.
 */
export async function conferirUso(
  salaoId: string, cupom: Cupom, telefoneIndicada: string,
): Promise<ResultadoValidacao> {
  const chave = chaveTelefone(telefoneIndicada)
  if (!chave) return { ok: false, causa: 'telefone', motivo: 'Telefone inválido.' }

  // 1. Ninguém usa o próprio cupom. É o furo mais óbvio e o mais tentado.
  if (chave === cupom.dono_chave) {
    return {
      ok: false, causa: 'proprio',
      motivo: 'Este é o cupom da própria pessoa — não dá para usar em si mesma.',
    }
  }

  // 2. Uma vez por pessoa, valendo para QUALQUER cupom. Se a Maria já veio
  //    com o código da Ana, não volta com o da Joana.
  const { data: uso } = await supabaseAdmin
    .from('cupom_indicacao_usos')
    .select('validado_em, atendida_em, cupom_id, situacao')
    .eq('salao_id', salaoId).eq('indicada_chave', chave).maybeSingle()
  if (uso) {
    const { data: antigo } = await supabaseAdmin
      .from('cupom_indicacao').select('dono_nome').eq('id', (uso as any).cupom_id).maybeSingle()
    return {
      ok: false, causa: 'ja_usou',
      motivo: 'Esta cliente já usou cupom de indicação.',
      detalhe: {
        data: String((uso as any).atendida_em || (uso as any).validado_em || '').slice(0, 10),
        donoNome: (antigo as any)?.dono_nome || '',
      },
    }
  }

  // 3. A promoção é de primeira visita — é o que a arte promete. A data da
  //    última visita vai junto: a recepção precisa poder mostrar.
  //
  // As duas perguntas em paralelo, e a da visita pede uma linha só. Isto roda
  // com a cliente parada no balcão: encadear as consultas somaria a espera de
  // cada uma.
  const [visita, nomeConhecido] = await Promise.all([
    ultimaVisita(salaoId, telefoneIndicada),
    nomeNoCrm(salaoId, telefoneIndicada),
  ])
  if (visita) {
    return {
      ok: false, causa: 'ja_cliente',
      motivo: 'Esta cliente já tem atendimento no salão. O cupom vale só na primeira visita.',
      ultimaVisita: visita,
      nomeConhecido,
    }
  }

  return { ok: true, ultimaVisita: null, nomeConhecido }
}

export async function registrarUso(
  salaoId: string, cupom: Cupom, nome: string, telefone: string, por: string,
): Promise<ResultadoValidacao> {
  const conferido = await conferirUso(salaoId, cupom, telefone)
  if (!conferido.ok) return conferido

  // Validar JA conta como veio, e o credito da dona nasce aqui.
  //
  // Antes isto nascia como 'apresentou' e so virava credito quando o robo
  // achasse a comanda -- o que deixava a tela zerada logo depois de a
  // recepcao validar. Mas a recepcao valida com a cliente na frente dela, no
  // atendimento: esperar o robo confirmar e desconfiar do proprio caixa.
  //
  // A protecao nao se perde, so muda de lugar: nasce PRESUMIDA e
  // `sincronizar` confere depois contra a comanda. Quem apareceu vira
  // confirmada; quem validou e foi embora sem se atender perde o credito.
  const { error } = await supabaseAdmin.from('cupom_indicacao_usos').insert({
    salao_id: salaoId,
    cupom_id: cupom.id,
    indicada_nome: String(nome || '').trim().slice(0, 80) || 'Cliente',
    indicada_telefone: normalizarTelefone(telefone),
    indicada_chave: chaveTelefone(telefone),
    situacao: 'presumida',
    atendida_em: hojeISO(),
    validado_por: String(por || '').slice(0, 60),
  })
  // O índice único é a palavra final: entre conferir e gravar, outro caixa
  // pode ter registrado a mesma pessoa.
  if (error) return { ok: false, motivo: 'Esta cliente já usou cupom de indicação.' }
  return { ok: true }
}

/** Desfaz uma validacao. Para quando a cliente desistiu na hora, ou o caixa
 *  errou o telefone -- sem isto o cupom dela ficaria queimado para sempre. */
export async function removerUso(salaoId: string, usoId: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('cupom_indicacao_usos')
    .delete().eq('salao_id', salaoId).eq('id', usoId)
  return !error
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
/**
 * Dias de tolerancia antes de revogar um credito presumido.
 *
 * 3 porque a coleta do Avec roda por dia e pode atrasar: revogar no dia
 * seguinte castigaria quem compareceu so porque o dado ainda nao chegou.
 */
const DIAS_PARA_CONFERIR = 3

function somarDias(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Ate que dia a coleta do Avec ja trouxe comanda deste salao.
 *
 * E a prova de que o silencio sobre uma cliente significa "nao veio", e nao
 * "o robo ainda nao coletou". Sem isto, robo parado viraria credito revogado
 * de quem compareceu -- e o robo ja ficou parado aqui.
 */
async function coletaAte(salaoId: string): Promise<string | null> {
  // NAO ordena por `data_comanda`: o campo e texto DD/MM/AAAA e ordenar
  // assim compara o DIA primeiro -- 31/01/2023 sairia na frente de
  // 01/10/2026. As colunas `ano` e `mes` sao numericas e tem indice proprio,
  // entao o mes mais novo sai por elas; so dentro dele e que se olha o dia.
  const { data: topo } = await supabaseAdmin
    .from('atendimentos_raw').select('ano, mes')
    .eq('salao_id', salaoId)
    .order('ano', { ascending: false }).order('mes', { ascending: false })
    .limit(1)
  const ano = Number((topo || [])[0]?.ano)
  const mes = Number((topo || [])[0]?.mes)
  if (!ano || !mes) return null

  // Em paginas, nao num `limit` chutado. O maior mes da base ja tem 4.207
  // linhas; com teto de 5.000 bastava um mes cheio para a leitura cortar
  // antes do ultimo dia -- e a cobertura voltaria menor do que e, segurando
  // revogacoes para sempre.
  let maior: string | null = null
  for (let de = 0; de < 40_000; de += 1000) {
    const { data } = await supabaseAdmin
      .from('atendimentos_raw').select('data_comanda')
      .eq('salao_id', salaoId).eq('ano', ano).eq('mes', mes)
      .range(de, de + 999)
    for (const r of data || []) {
      const d = dataComandaISO((r as any).data_comanda)
      if (d && (!maior || d > maior)) maior = d
    }
    if (!data || data.length < 1000) break
  }
  return maior
}

export async function sincronizar(salaoId: string): Promise<{
  confirmadas: number; revogadas: number; creditosBaixados: number
}> {
  let confirmadas = 0
  let revogadas = 0
  let creditosBaixados = 0

  // ── (a) conferir quem a recepcao validou ─────────────────────────────────
  //
  // O credito ja nasceu no balcao. Aqui so se confere contra a comanda.
  const cobertura = await coletaAte(salaoId)

  const { data: presumidas } = await supabaseAdmin
    .from('cupom_indicacao_usos')
    .select('id, indicada_telefone, validado_em')
    .eq('salao_id', salaoId).eq('situacao', 'presumida').limit(500)

  for (const u of presumidas || []) {
    const desde = String((u as any).validado_em || '').slice(0, 10)
    const visitas = await visitasDoTelefone(salaoId, (u as any).indicada_telefone)
    // Comanda anterior a validacao nao serve: seria justamente o caso que a
    // regra de primeira visita deveria ter barrado.
    const achou = visitas.filter(d => !desde || d >= desde).pop()

    if (achou) {
      await supabaseAdmin.from('cupom_indicacao_usos')
        .update({ situacao: 'confirmada', atendida_em: achou }).eq('id', (u as any).id)
      confirmadas++
      continue
    }

    // Revogar SO quando o banco ja tem os dias daquele periodo. Sem esta
    // conferencia, atraso de coleta tiraria credito de quem compareceu.
    const limite = somarDias(desde, DIAS_PARA_CONFERIR)
    if (cobertura && cobertura >= limite) {
      await supabaseAdmin.from('cupom_indicacao_usos')
        .update({ situacao: 'nao_compareceu' }).eq('id', (u as any).id)
      revogadas++
    }
  }

  // ── (b) donas com saldo que foram ao salao depois de ganhar o credito ────
  const { data: cupons } = await supabaseAdmin
    .from('cupom_indicacao').select('id, dono_telefone').eq('salao_id', salaoId).limit(2000)

  for (const c of cupons || []) {
    const saldo = await saldoDoCupom(salaoId, (c as any).id)
    if (saldo.saldo <= 0) continue

    const visitas = await visitasDoTelefone(salaoId, (c as any).dono_telefone)
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

  return { confirmadas, revogadas, creditosBaixados }
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

  // 'presumida' vale credito desde o clique da recepcao; 'confirmada' e a
  // mesma coisa ja checada contra a comanda. So 'nao_compareceu' fica de
  // fora -- quem validou e foi embora sem se atender.
  const valem = (usos || []).filter((u: any) => u.situacao !== 'nao_compareceu')
  const datas = valem.map((u: any) => String(u.atendida_em || '').slice(0, 10)).filter(Boolean).sort()
  const usados = (creditos || []).length

  return {
    indicadas: (usos || []).length,
    compareceram: valem.length,
    usados,
    saldo: Math.max(0, valem.length - usados),
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
