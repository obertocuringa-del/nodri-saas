// ── Boas-vindas: o texto, sem banco ─────────────────────────────────────────
//
// Só funções puras, para a tela de configuração montar a prévia com o MESMO
// código que a ponte usa na hora de mandar. O que precisa de banco fica em
// crmBoasVindas.ts.
//
// Pedido do dono (21/09/2026): chamar a cliente pelo nome quando o nome
// existe, e dar bom dia / boa tarde / boa noite conforme a hora -- tudo
// regulável em CRM > Configurar. Os campos são {cliente} e {saudacao}; quem
// não puser no texto, não recebe.

export interface SaudacaoCfg {
  bom_dia: string
  boa_tarde: string
  boa_noite: string
  /** "bom dia" vale até esta hora (exclusive). */
  ate_bom_dia: number
  /** "boa tarde" vale até esta hora (exclusive); depois é "boa noite". */
  ate_boa_tarde: number
}

export const SAUDACAO_PADRAO: SaudacaoCfg = {
  bom_dia: 'bom dia', boa_tarde: 'boa tarde', boa_noite: 'boa noite',
  ate_bom_dia: 12, ate_boa_tarde: 18,
}

export function lerSaudacao(bruto: any): SaudacaoCfg {
  const b = bruto || {}
  const hora = (v: any, padrao: number) => {
    const n = Number(v)
    return Number.isInteger(n) && n >= 0 && n <= 23 ? n : padrao
  }
  const cfg: SaudacaoCfg = {
    bom_dia: String(b.bom_dia ?? SAUDACAO_PADRAO.bom_dia).trim().slice(0, 40),
    boa_tarde: String(b.boa_tarde ?? SAUDACAO_PADRAO.boa_tarde).trim().slice(0, 40),
    boa_noite: String(b.boa_noite ?? SAUDACAO_PADRAO.boa_noite).trim().slice(0, 40),
    ate_bom_dia: hora(b.ate_bom_dia, SAUDACAO_PADRAO.ate_bom_dia),
    ate_boa_tarde: hora(b.ate_boa_tarde, SAUDACAO_PADRAO.ate_boa_tarde),
  }
  // Corte invertido (tarde antes do dia) não faz sentido: volta ao padrão.
  if (cfg.ate_bom_dia >= cfg.ate_boa_tarde) {
    cfg.ate_bom_dia = SAUDACAO_PADRAO.ate_bom_dia
    cfg.ate_boa_tarde = SAUDACAO_PADRAO.ate_boa_tarde
  }
  return cfg
}

/** Hora cheia em Brasília, seja onde for que o servidor esteja. */
export function horaEmBrasilia(agora: Date = new Date()): number {
  try {
    const h = new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(agora)
    const n = Number(String(h).replace(/\D/g, ''))
    return Number.isFinite(n) ? n % 24 : agora.getHours()
  } catch { return agora.getHours() }
}

export function saudacaoDoMomento(cfg: SaudacaoCfg, agora: Date = new Date()): string {
  const h = horaEmBrasilia(agora)
  if (h < cfg.ate_bom_dia) return cfg.bom_dia
  if (h < cfg.ate_boa_tarde) return cfg.boa_tarde
  return cfg.boa_noite
}

// ── Primeiro nome, só se parecer nome de gente ──────────────────────────────
//
// O nome do cadastro do salão vem primeiro; sem ele, o nome que a pessoa usa
// no WhatsApp. Ali aparece de tudo: "(61) 9672-6153", "CLAUDIA - BODYTECH",
// emoji, "Dra. Ana". A peneira é simples e conservadora -- na dúvida, vai sem
// nome, que é o texto que já saía antes. "Olá 61, bom dia!" não pode sair.
export function primeiroNomeSeguro(...candidatos: (string | null | undefined)[]): string {
  for (const c of candidatos) {
    const bruto = String(c || '').trim()
    if (!bruto) continue
    if (/\d/.test(bruto)) continue                       // telefone, "Maria 2"
    // "Dra. Ana Paula" → pula o tratamento e pega "Ana".
    const pedacos = bruto.split(/[\s\-–/|,]+/).filter(Boolean)
    let primeiro = ''
    for (const p of pedacos) {
      const limpo = p.replace(/[^\p{L}'’]/gu, '')       // tira emoji, ponto, parêntese
      if (!limpo) continue
      if (/^(sr|sra|dr|dra|srta|dona|seu|prof|profa)$/i.test(limpo)) continue
      primeiro = limpo
      break
    }
    if (primeiro.length < 2 || primeiro.length > 20) continue
    // "BRUNA" e "bruna" viram "Bruna"; "Ana" fica "Ana".
    const baixo = primeiro.toLocaleLowerCase('pt-BR')
    return baixo.charAt(0).toLocaleUpperCase('pt-BR') + baixo.slice(1)
  }
  return ''
}

/**
 * Preenche o texto. Os campos vazios somem e a pontuação se acerta sozinha:
 *   "Olá {cliente}, {saudacao}!"  →  "Olá Bruna, bom dia!"
 *                                    "Olá, bom dia!"      (sem nome)
 *                                    "Olá Bruna!"         (sem saudação)
 *                                    "Olá!"               (sem os dois)
 */
export function preencherBoasVindas(
  texto: string,
  dados: { salao?: string; link?: string; cliente?: string; saudacao?: string },
): string {
  let t = String(texto || '')
    .replace(/\{salao\}/gi, dados.salao || 'salão')
    .replace(/\{cliente\}/gi, dados.cliente || '')
    .replace(/\{saudacao\}/gi, dados.saudacao || '')
  if (/\{link\}/i.test(t)) t = t.replace(/\{link\}/gi, dados.link || '')
  else if (dados.link) t = t.replace(/\s+$/, '') + '\n' + dados.link
  return t
    // ", !" e " , ," que sobram de campo vazio: "Olá , !" → "Olá!"
    .replace(/[ \t]*,[ \t]*(?=[,!?.;:])/g, '')
    // espaço antes de pontuação: "Olá , bom dia" → "Olá, bom dia"
    .replace(/[ \t]+([,.!?;:])/g, '$1')
    // espaço dobrado no lugar do campo
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .trim()
}
