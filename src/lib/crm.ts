// ── CRM NODRI — as regras que valem no servidor e na tela ───────────────────
//
// Tudo que decide COMPORTAMENTO mora aqui: os estados, o relógio do SLA e a
// normalização do telefone. A tela e as rotas importam daqui, para não haver
// duas versões da mesma regra divergindo com o tempo.

export type EstadoConversa =
  | 'acao_necessaria'
  | 'aguardando'
  | 'follow_up'
  | 'pausada'
  | 'agendado'
  | 'sem_conversao'

export interface DefEstado {
  chave: EstadoConversa
  rotulo: string
  cor: string
  fundo: string
  /** Aparece na fila de trabalho da recepção? */
  naFila: boolean
  /** O relógio do SLA corre neste estado? */
  contaTempo: boolean
  explica: string
}

export const ESTADOS: DefEstado[] = [
  { chave: 'acao_necessaria', rotulo: 'Ação necessária', cor: '#B4322A', fundo: '#FBEBE9',
    naFila: true,  contaTempo: true,
    explica: 'A cliente falou por último. Alguém precisa responder.' },
  { chave: 'aguardando', rotulo: 'Aguardando cliente', cor: '#9A6B12', fundo: '#FBF1DF',
    naFila: false, contaTempo: false,
    explica: 'O salão respondeu. A bola está com a cliente.' },
  { chave: 'follow_up', rotulo: 'Follow-up', cor: '#C2603A', fundo: '#FBEEE8',
    naFila: true,  contaTempo: false,
    explica: 'A cliente não respondeu no prazo. Vale retomar.' },
  { chave: 'pausada', rotulo: 'Em pausa', cor: '#5B4FCF', fundo: '#EFEDFB',
    naFila: false, contaTempo: false,
    explica: 'A cliente pediu para falar depois. Volta sozinha na data.' },
  { chave: 'agendado', rotulo: 'Agendado', cor: '#2F6B4F', fundo: '#E6F1EB',
    naFila: false, contaTempo: false,
    explica: 'Virou horário marcado. Oportunidade ganha.' },
  { chave: 'sem_conversao', rotulo: 'Sem conversão', cor: '#575D68', fundo: '#EFEFF2',
    naFila: false, contaTempo: false,
    explica: 'Fechada sem agendamento, com o motivo registrado.' },
]

export const estadoPor = (c: string): DefEstado =>
  ESTADOS.find(e => e.chave === c) || ESTADOS[0]

// ── O telefone ──────────────────────────────────────────────────────────────
//
// O mesmo número aparece de cinco jeitos: +55 (61) 99999-8888, 5561999998888,
// 61999998888, 6199998888. Sem normalizar, a mesma cliente vira várias pessoas
// e a estatística mente.
//
// O nono dígito é a parte chata: celular no Brasil ganhou um 9 na frente, mas
// registros antigos e alguns aparelhos ainda mandam sem. A chave de comparação
// remove esse 9 justamente para os dois formatos caírem no mesmo contato.

/** Só dígitos, sempre com o 55 na frente. É o que se guarda. */
export function normalizarTelefone(bruto: string | null | undefined): string {
  let d = String(bruto || '').replace(/\D+/g, '')
  if (!d) return ''
  if (d.length > 13) d = d.slice(-13)            // corta lixo de prefixo
  if (!d.startsWith('55') && (d.length === 10 || d.length === 11)) d = '55' + d
  return d
}

/** Chave de comparação: sem o nono dígito, para 61 9 9999 e 61 9999 casarem. */
export function chaveTelefone(bruto: string | null | undefined): string {
  const d = normalizarTelefone(bruto)
  if (d.length === 13 && d.startsWith('55') && d[4] === '9') {
    return d.slice(0, 4) + d.slice(5)            // tira o nono dígito
  }
  return d
}

/** (61) 99999-8888 — para mostrar na tela. */
export function telefoneBonito(bruto: string | null | undefined): string {
  const d = normalizarTelefone(bruto)
  const s = d.startsWith('55') ? d.slice(2) : d
  if (s.length === 11) return `(${s.slice(0,2)}) ${s.slice(2,7)}-${s.slice(7)}`
  if (s.length === 10) return `(${s.slice(0,2)}) ${s.slice(2,6)}-${s.slice(6)}`
  return bruto ? String(bruto) : ''
}

// ── O relógio ───────────────────────────────────────────────────────────────
//
// "8 minutos aguardando" não significa nada às 3 da manhã. Se o relógio correr
// fora do expediente, a fila abre toda segunda com um mar de vermelho falso —
// e a equipe aprende a ignorar o vermelho, que é o pior resultado possível.
//
// Por isso o tempo de espera só conta DENTRO do horário de funcionamento.

export interface JanelaDia { abre: string; fecha: string }        // '09:00', '20:00'
export type HorarioSemana = Record<number, JanelaDia | null>       // 0=domingo

/** Padrão de salão, usado enquanto o salão não configurar o próprio. */
export const HORARIO_PADRAO: HorarioSemana = {
  0: null,
  1: { abre: '09:00', fecha: '20:00' },
  2: { abre: '09:00', fecha: '20:00' },
  3: { abre: '09:00', fecha: '20:00' },
  4: { abre: '09:00', fecha: '20:00' },
  5: { abre: '09:00', fecha: '20:00' },
  6: { abre: '09:00', fecha: '18:00' },
}

const emMinutos = (hhmm: string) => {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Minutos de expediente entre dois instantes.
 *
 * Percorre dia a dia somando só a parte que cai dentro da janela de cada um.
 * O teto de 60 dias existe para uma conversa esquecida em 2024 não virar um
 * laço de vinte mil voltas ao abrir a tela.
 */
export function minutosUteis(de: Date, ate: Date, horario: HorarioSemana = HORARIO_PADRAO): number {
  if (!de || !ate || ate <= de) return 0
  let total = 0
  const cursor = new Date(de)
  for (let dia = 0; dia < 60; dia++) {
    const janela = horario[cursor.getDay()]
    if (janela) {
      const inicioDia = new Date(cursor); inicioDia.setHours(0, 0, 0, 0)
      const abre  = new Date(inicioDia.getTime() + emMinutos(janela.abre)  * 60000)
      const fecha = new Date(inicioDia.getTime() + emMinutos(janela.fecha) * 60000)
      const ini = de  > abre  ? de  : abre
      const fim = ate < fecha ? ate : fecha
      if (fim > ini) total += Math.round((fim.getTime() - ini.getTime()) / 60000)
    }
    cursor.setDate(cursor.getDate() + 1)
    cursor.setHours(0, 0, 0, 0)
    if (cursor > ate) break
  }
  return total
}

/** Faixas de urgência da fila. O vermelho tem que significar alguma coisa. */
export type Urgencia = 'novo' | 'atencao' | 'critico'

export function urgenciaPorMinutos(min: number): Urgencia {
  if (min >= 60) return 'critico'
  if (min >= 15) return 'atencao'
  return 'novo'
}

export const CORES_URGENCIA: Record<Urgencia, { cor: string; rotulo: string }> = {
  novo:    { cor: '#2F6B4F', rotulo: 'agora' },
  atencao: { cor: '#9A6B12', rotulo: 'esperando' },
  critico: { cor: '#B4322A', rotulo: 'atrasado' },
}

/** "8 min", "1h12", "2d" — curto, para caber na lista. */
export function tempoCurto(min: number): string {
  if (min < 1) return 'agora'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) {
    const m = min % 60
    return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
  }
  return `${Math.floor(h / 24)}d`
}

// ── O relógio ───────────────────────────────────────────────────────────────
//
// A recepção esquece. Então o sistema não pode depender dela para lembrar: o
// que dá para decidir sozinho é decidido sozinho. Nada disto manda mensagem —
// só muda o estado e devolve a conversa para a fila na hora certa.

/** Respondeu e a cliente não voltou neste tanto de expediente: vira follow-up. */
export const HORAS_UTEIS_FOLLOW_UP = 9      // um dia de salão

/** Conversa parada há mais de isto sai da fila de hoje e vai para "Sem resposta". */
export const DIAS_SEM_RESPOSTA = 3

// ── Trava de dono ───────────────────────────────────────────────────────────
//
// Duas recepcionistas respondendo a mesma cliente, com informação diferente,
// é o defeito mais comum de caixa de entrada compartilhada. Abrir a conversa
// reserva ela por alguns minutos; a reserva se renova enquanto a pessoa está
// ali e expira sozinha se ela sair sem fechar.
export const MINUTOS_DONO = 5

export function donoAtivo(dono_ate: string | null | undefined): boolean {
  if (!dono_ate) return false
  return new Date(dono_ate).getTime() > Date.now()
}

// ── Sugestão de próxima ação ────────────────────────────────────────────────
// A conversa nunca pode ficar sem resposta para "o que precisa acontecer
// agora?". Quando ninguém escreveu nada, o sistema propõe pelo estado.
export function proximaAcaoPadrao(estado: EstadoConversa): string {
  switch (estado) {
    case 'acao_necessaria': return 'Responder a cliente'
    case 'aguardando':      return 'Aguardar resposta'
    case 'follow_up':       return 'Retomar a conversa'
    case 'pausada':         return 'Voltar a falar na data combinada'
    case 'agendado':        return 'Confirmar o horário na agenda'
    case 'sem_conversao':   return 'Nenhuma'
  }
}

/** Motivos de perda de fábrica — semeados no salão que ainda não tem os seus. */
export const MOTIVOS_PERDA_PADRAO = [
  'Preço',
  'Não tinha horário',
  'Queria outro profissional',
  'Queria outra data',
  'Cliente não respondeu',
  'Cliente desistiu',
  'Só queria informação',
  'Motivo desconhecido',
]

/** Mensagens prontas de fábrica. Sem dado de salão nenhum — só o esqueleto. */
export const MODELOS_PADRAO = [
  { nome: 'Boas-vindas', atalho: 'oi', texto: 'Oi! Que bom te ver por aqui. Me conta o que você tem vontade de fazer que eu te ajudo.' },
  { nome: 'Enviar horários', atalho: 'horarios', texto: 'Tenho [dia] às [hora] e [dia] às [hora]. Qual fica melhor para você?' },
  { nome: 'Responder preço', atalho: 'preco', texto: 'Começa em R$ [valor]. O valor muda pelo comprimento e pelo estado do fio, por isso a gente avalia antes — assim você não tem surpresa na hora de pagar.' },
  { nome: 'Retomar contato', atalho: 'retomar', texto: 'Passei para avisar que consegui um encaixe [dia] às [hora]. Quer que eu segure para você?' },
  { nome: 'Confirmar', atalho: 'confirmar', texto: 'Perfeito, está reservado! Te espero [dia] às [hora]. Qualquer coisa é só me chamar por aqui.' },
]
