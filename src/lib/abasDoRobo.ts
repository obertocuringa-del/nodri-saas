import fs from 'fs/promises'
import path from 'path'

// ── As abas do Chrome do robô ───────────────────────────────────────────────
//
// Cada salão que roda no servidor tem UM Chrome, e dentro dele deveriam viver
// duas abas, não mais:
//
//   1. a da COLETA     -- o robô do relatório abre, lê o relatório do dia e
//                         fecha. Enquanto está lendo, não se pode encostar.
//   2. a da AUTOMAÇÃO  -- a extensão mantém aberta no relatório 0051, que é de
//                         onde saem feedback, confirmação e aviso ao
//                         profissional.
//
// 01/10/2026 o Chrome do Rouge estava com VINTE E TRÊS: quatro cópias do 0051
// e catorze em branco. Cada cópia do 0051 é uma página pesada (tabelão, chat
// do Avec, tutorial) rodando sozinha para sempre. Somadas, comiam 58% do único
// núcleo do servidor: as telas do NODRI abriam em 3 a 5 segundos. Fechadas, a
// página inicial voltou a 0,39 s.
//
// Por isso esta peça existe: contar as abas de cada salão, dizer para que
// serve cada uma, e deixar fechar da tela as que estão sobrando -- sem nunca
// oferecer o fechamento das duas que estão trabalhando.
//
// O Chrome de cada salão escuta numa porta de depuração só em 127.0.0.1, e o
// robô grava o número em perfis/<salão>/porta. Como o NODRI roda na MESMA
// máquina, dá para perguntar a ele quais abas existem sem nada exposto para
// fora.

const PERFIS = process.env.ROBO_PERFIS || '/home/nodri/robo/perfis'
const ESPERADAS = 2

export type PapelAba = 'automacao' | 'coleta' | 'sobrando'

export interface Aba {
  id: string
  titulo: string
  url: string
  papel: PapelAba
  porque: string
  pode_fechar: boolean
}

export interface AbasDoSalao {
  salao_id: string
  porta: number | null
  erro: string | null
  abas: Aba[]
  sobrando: number
}

/** A porta de depuração que o robô gravou para este salão. */
export async function portaDoSalao(salaoId: string): Promise<number | null> {
  try {
    const txt = await fs.readFile(path.join(PERFIS, salaoId, 'porta'), 'utf8')
    const n = Number(String(txt).trim())
    return Number.isFinite(n) && n > 0 ? n : null
  } catch { return null }
}

function papelDaAba(url: string, urlAutomacao: string, jaTemAutomacao: boolean): { papel: PapelAba; porque: string } {
  const limpa = String(url || '').replace(/^https?:\/\//, '')
  const alvo = String(urlAutomacao || 'admin.avec.beauty/admin/relatorio/0051').replace(/^https?:\/\//, '')

  if (limpa.startsWith(alvo)) {
    return jaTemAutomacao
      ? { papel: 'sobrando', porque: 'Cópia repetida do relatório da automação.' }
      : { papel: 'automacao', porque: 'É daqui que saem feedback, confirmação e aviso ao profissional.' }
  }
  // Qualquer outro relatório do Avec é do robô da coleta -- e coleta em
  // andamento não se interrompe pela metade.
  if (/admin\.avec\.beauty\/admin\/relatorio\//.test(limpa)) {
    return { papel: 'coleta', porque: 'O robô do relatório está usando esta aba.' }
  }
  if (!url || url === 'about:blank') {
    return { papel: 'sobrando', porque: 'Aba em branco, sem uso.' }
  }
  return { papel: 'sobrando', porque: 'Não faz parte do trabalho do robô.' }
}

/** Lê as abas de um salão. Não fecha nada. */
export async function abasDoSalao(salaoId: string, urlAutomacao: string): Promise<AbasDoSalao> {
  const porta = await portaDoSalao(salaoId)
  if (!porta) return { salao_id: salaoId, porta: null, erro: 'Este salão não roda no servidor.', abas: [], sobrando: 0 }

  let lista: any[]
  try {
    const r = await fetch(`http://127.0.0.1:${porta}/json/list`, { signal: AbortSignal.timeout(8000) })
    lista = await r.json()
  } catch {
    return { salao_id: salaoId, porta, erro: 'O Chrome do robô não respondeu.', abas: [], sobrando: 0 }
  }

  const paginas = (Array.isArray(lista) ? lista : []).filter((t: any) => t?.type === 'page')
  const abas: Aba[] = []
  let jaTemAutomacao = false
  for (const t of paginas) {
    const { papel, porque } = papelDaAba(t.url, urlAutomacao, jaTemAutomacao)
    if (papel === 'automacao') jaTemAutomacao = true
    abas.push({
      id: String(t.id || ''),
      titulo: String(t.title || '').slice(0, 80),
      url: String(t.url || '').slice(0, 160),
      papel, porque,
      pode_fechar: papel === 'sobrando',
    })
  }
  // Nunca deixar o Chrome sem aba nenhuma: ele se encerra e o robô precisa
  // reabrir o navegador inteiro.
  if (abas.length && abas.every(a => a.pode_fechar)) abas[0].pode_fechar = false

  return { salao_id: salaoId, porta, erro: null, abas, sobrando: abas.filter(a => a.pode_fechar).length }
}

/** Fecha UMA aba, e só se ela estiver sobrando. Devolve o que aconteceu. */
export async function fecharAba(salaoId: string, urlAutomacao: string, abaId: string): Promise<{ ok: boolean; motivo: string }> {
  const estado = await abasDoSalao(salaoId, urlAutomacao)
  if (estado.erro) return { ok: false, motivo: estado.erro }
  const alvo = estado.abas.find(a => a.id === abaId)
  if (!alvo) return { ok: false, motivo: 'Essa aba não existe mais.' }
  if (!alvo.pode_fechar) return { ok: false, motivo: 'Esta aba está trabalhando: ' + alvo.porque }
  try {
    await fetch(`http://127.0.0.1:${estado.porta}/json/close/${encodeURIComponent(abaId)}`, {
      signal: AbortSignal.timeout(8000),
    })
    return { ok: true, motivo: 'Aba fechada.' }
  } catch {
    return { ok: false, motivo: 'O Chrome do robô não respondeu.' }
  }
}

/** Fecha TODAS as que estão sobrando, de uma vez. */
export async function fecharSobrando(salaoId: string, urlAutomacao: string): Promise<{ fechadas: number; motivo: string }> {
  const estado = await abasDoSalao(salaoId, urlAutomacao)
  if (estado.erro) return { fechadas: 0, motivo: estado.erro }
  let fechadas = 0
  for (const a of estado.abas) {
    if (!a.pode_fechar) continue
    try {
      await fetch(`http://127.0.0.1:${estado.porta}/json/close/${encodeURIComponent(a.id)}`, {
        signal: AbortSignal.timeout(8000),
      })
      fechadas++
    } catch { /* segue para a próxima */ }
  }
  return { fechadas, motivo: fechadas ? `${fechadas} aba(s) fechada(s).` : 'Não havia aba sobrando.' }
}

export const ABAS_ESPERADAS = ESPERADAS
