// ── Quanto tempo cada procedimento ocupa a agenda ───────────────────────────
//
// Não é um número só. Muito procedimento tem PAUSA no meio -- aplica o produto,
// espera processar, volta e finaliza -- e durante a espera o profissional está
// livre para atender outra pessoa. Tratar progressiva como "90 minutos
// cravados" bloqueia a agenda errado e joga fora meia hora de profissional.
//
//   Progressiva -> [30 ocupado] [30 livre] [30 ocupado]
//                  span de 90 min, ocupação de 60
//
// Procedimento simples é o mesmo modelo com a pausa em zero: [60 ocupado].
//
// ── Onde mora ───────────────────────────────────────────────────────────────
//
// Em `salao_config`, chave `servicos_tempos`, mapeado pelo ID do serviço -- e
// não numa coluna nova de `salao_servicos`. Mudança de esquema neste banco
// exige SQL colado à mão no Supabase, e isto não precisava esperar por isso.
//
// ── O limite, dito aqui para não se perder ──────────────────────────────────
//
// Quem marca de verdade é o Avec, e lá a duração é um número só, contíguo (não
// existe pausa no cadastro dele). Então um horário que só encaixa por causa da
// pausa pode ser recusado na hora de marcar. Foi decisão do dono manter o tempo
// aqui mesmo assim, e resolver o encaixe pelo NODRI.

import { supabaseAdmin } from '@/lib/supabase'

export const CHAVE_TEMPOS = 'servicos_tempos'

export interface TempoServico {
  /** minutos de trabalho antes da pausa */
  trabalha1: number
  /** minutos de espera em que o profissional fica livre (0 = sem pausa) */
  pausa: number
  /** minutos de trabalho depois da pausa (0 = acaba na primeira parte) */
  trabalha2: number
}

export type MapaTempos = Record<string, TempoServico>

export const TEMPO_VAZIO: TempoServico = { trabalha1: 0, pausa: 0, trabalha2: 0 }

const nMin = (v: any) => {
  const n = Math.round(Number(v))
  // Teto de 12h: número maior aqui é dedo escorregando, e um serviço de 6000
  // minutos esconderia a agenda inteira do profissional.
  return Number.isFinite(n) && n > 0 ? Math.min(n, 720) : 0
}

export function lerTempo(bruto: any): TempoServico {
  return {
    trabalha1: nMin(bruto?.trabalha1),
    pausa: nMin(bruto?.pausa),
    trabalha2: nMin(bruto?.trabalha2),
  }
}

export function lerMapa(bruto: any): MapaTempos {
  const saida: MapaTempos = {}
  if (bruto && typeof bruto === 'object') {
    for (const [id, v] of Object.entries(bruto)) {
      const t = lerTempo(v)
      // Serviço sem nenhum tempo não ocupa espaço na configuração.
      if (t.trabalha1 || t.trabalha2) saida[id] = t
    }
  }
  return saida
}

export async function carregarTempos(salaoId: string): Promise<MapaTempos> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_TEMPOS).maybeSingle()
  return lerMapa(data?.valor)
}

export async function gravarTempos(salaoId: string, mapa: MapaTempos) {
  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId,
    chave: CHAVE_TEMPOS,
    valor: mapa,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: 'salao_id,chave' })
}

/** Está configurado? Sem o primeiro trecho de trabalho, não dá para encaixar nada. */
export const temTempo = (t?: TempoServico | null) => !!t && t.trabalha1 > 0

/**
 * Os trechos na ordem, com quem ocupa a agenda e quem não ocupa. É desta lista
 * que a busca por horário vive: cada trecho `ocupa` precisa cair em cima de
 * espaço livre do profissional; os que não ocupam podem cair em cima de
 * qualquer coisa, porque ele está liberado ali.
 */
export function blocosDoTempo(t: TempoServico): { min: number; ocupa: boolean }[] {
  const blocos: { min: number; ocupa: boolean }[] = []
  if (t.trabalha1 > 0) blocos.push({ min: t.trabalha1, ocupa: true })
  if (t.pausa > 0 && t.trabalha2 > 0) blocos.push({ min: t.pausa, ocupa: false })
  if (t.trabalha2 > 0) blocos.push({ min: t.trabalha2, ocupa: true })
  return blocos
}

/** Do começo ao fim, incluindo a pausa. É o que a cliente sente de duração. */
export const spanTotal = (t: TempoServico) =>
  blocosDoTempo(t).reduce((s, b) => s + b.min, 0)

/** Só o que prende o profissional. É o que a agenda dele perde. */
export const minutosOcupados = (t: TempoServico) =>
  blocosDoTempo(t).filter(b => b.ocupa).reduce((s, b) => s + b.min, 0)

/** "1h30" / "45 min" */
export function emHoras(min: number): string {
  if (!min) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (!h) return `${m} min`
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

/** Frase curta para a tela: "1h30 na cadeira, 1h de profissional (pausa de 30)" */
export function descreverTempo(t?: TempoServico | null): string {
  if (!temTempo(t)) return 'sem tempo configurado'
  const span = spanTotal(t!)
  const ocup = minutosOcupados(t!)
  if (span === ocup) return emHoras(span)
  return `${emHoras(span)} no total · ${emHoras(ocup)} de profissional (pausa de ${emHoras(t!.pausa)})`
}
