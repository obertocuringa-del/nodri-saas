// ── O nome da cliente escrito na própria mensagem ───────────────────────────
//
// A agenda do WhatsApp chega incompleta, e em conta nova quase não chega:
// medido em 12/09/2026, três contatos ganharam nome em meia hora e 276 das 300
// conversas apareciam na fila como "Contato 315487". A recepção não sabe com
// quem está falando.
//
// Só que o salão escreve o nome da cliente em toda mensagem que manda:
// "Olá KATARINA,", "TELMA, boa tarde!". O nome estava ali o tempo todo.
//
// Isto vive num arquivo próprio porque duas partes precisam da MESMA regra: a
// porta da ponte, para a mensagem que está chegando agora, e a arrumação, para
// o que já está gravado. Duas cópias divergiriam, e divergir aqui significa a
// mesma cliente com dois nomes.

// Palavras que NUNCA são o nome da cliente, mesmo caindo onde o nome cairia.
// Sem esta lista, "Olá, tudo bem?" criaria uma cliente chamada "Tudo" -- e
// nome errado na fila é pior que número, porque parece certo.
const NAO_E_NOME = new Set([
  'bom', 'boa', 'tudo', 'como', 'voce', 'você', 'obrigada', 'obrigado', 'sim',
  'nao', 'não', 'ok', 'claro', 'tenho', 'temos', 'sou', 'eu', 'me', 'para',
  'pra', 'por', 'favor', 'senhora', 'senhor', 'cliente', 'amiga', 'amor',
  'querida', 'linda', 'flor', 'entao', 'então', 'ainda', 'ja', 'já',
  'desculpe', 'oi', 'ola', 'olá', 'sei', 'ver', 'vou', 'vamos', 'aqui',
  'hoje', 'amanha', 'amanhã', 'bem', 'dia', 'tarde', 'noite', 'tem', 'esta',
  'está', 'meu', 'minha', 'nome', 'chamo', 'gente', 'equipe', 'time',
  'salao', 'salão', 'pessoal', 'galera', 'pode', 'posso', 'preciso',
])

const SAUDACAO = /^(?:ol[aá]|oi|e a[ií]|bom dia|boa tarde|boa noite)[\s,!]+/i
const NOME_DEPOIS = /^([\p{Lu}][\p{L}]{1,28}(?:\s+[\p{Lu}][\p{L}]{1,28})?)\s*[,!\n]/u
const NOME_ANTES = /^([\p{Lu}][\p{L}]{1,28}(?:\s+[\p{Lu}][\p{L}]{1,28})?)\s*,\s*(?:bom dia|boa tarde|boa noite|tudo bem)/iu

function aceitavel(n: string): string | null {
  const nome = String(n || '').trim().replace(/\s+/g, ' ')
  if (nome.length < 2 || nome.length > 30) return null
  if (/[0-9@]/.test(nome)) return null
  if (nome.split(' ').some(p => NAO_E_NOME.has(p.toLowerCase()))) return null
  return nome
}

/**
 * Devolve o nome da cliente quando a mensagem do salão o carrega, ou null.
 *
 * Conferido contra 18 frases reais do Rouge: as oito que devem virar nome
 * ("Olá KATARINA,", "TELMA, boa tarde!", "Olá *LUCIANA*, tudo bem?") e as dez
 * que não devem ("Oi claro, da sim.", "Olá, tudo bem?", "Olá Me chamo Ruth").
 *
 * Use SÓ em mensagem que saiu do salão, e SÓ quando o contato não tem nome.
 */
export function nomeNaMensagem(t: string): string | null {
  const txt = String(t || '').replace(/[*_~]/g, '').trim()
  const sem = txt.replace(SAUDACAO, '')
  if (sem !== txt) {
    const m = sem.match(NOME_DEPOIS)
    if (m) return aceitavel(m[1])
  }
  const m2 = txt.match(NOME_ANTES)
  if (m2) return aceitavel(m2[1])
  return null
}
