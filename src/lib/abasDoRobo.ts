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

function papelDaAba(
  url: string, urlAutomacao: string, jaTemAutomacao: boolean,
  coletaRodando: boolean, jaTemColeta: boolean,
): { papel: PapelAba; porque: string } {
  const limpa = String(url || '').replace(/^https?:\/\//, '')
  const alvo = String(urlAutomacao || 'admin.avec.beauty/admin/relatorio/0051').replace(/^https?:\/\//, '')

  if (limpa.startsWith(alvo)) {
    return jaTemAutomacao
      ? { papel: 'sobrando', porque: 'Cópia repetida do relatório da automação.' }
      : { papel: 'automacao', porque: 'É daqui que saem feedback, confirmação e aviso ao profissional.' }
  }
  // Qualquer outro relatório do Avec é do robô da coleta. Só que ele lê UM
  // relatório por vez, numa aba só: se houver duas, uma é sobra de uma coleta
  // anterior que não fechou. E se NENHUMA coleta estiver rodando agora, todas
  // são sobra -- o NODRI sabe disso porque registra cada coleta em
  // `robo_coletas` (situação "rodando").
  if (/admin\.avec\.beauty\/admin\/relatorio\//.test(limpa)) {
    if (!coletaRodando) {
      return { papel: 'sobrando', porque: 'Sobra de uma coleta que já terminou (não há coleta rodando agora).' }
    }
    return jaTemColeta
      ? { papel: 'sobrando', porque: 'O robô lê um relatório por vez: esta é sobra de uma coleta anterior.' }
      : { papel: 'coleta', porque: 'O robô do relatório está usando esta aba agora.' }
  }
  if (!url || url === 'about:blank') {
    return { papel: 'sobrando', porque: 'Aba em branco, sem uso.' }
  }
  // ── Qualquer outra página do Avec é trabalho em andamento ────────────────
  //
  // A extensão não vive só no 0051: para marcar "Confirmado" ela leva a
  // PRÓPRIA aba de trabalho para a agenda do Avec, e fica lá até a volta
  // seguinte trazer de volta. Se a agenda contasse como sobra, a limpeza
  // automática fecharia a aba da extensão no meio da marcação -- a cliente
  // mandou "confirmo" e ficaria sem o "Combinado".
  //
  // O mesmo vale para a tela de login: sessão caída manda a aba para lá, e é
  // justamente de lá que a extensão entra de novo sozinha.
  if (/avec\.(beauty|app)/.test(limpa)) {
    return { papel: 'automacao', porque: 'A extensão está usando esta aba (agenda ou login do Avec).' }
  }
  return { papel: 'sobrando', porque: 'Não faz parte do trabalho do robô.' }
}

/** Lê as abas de um salão. Não fecha nada. */
export async function abasDoSalao(salaoId: string, urlAutomacao: string, coletaRodando = false): Promise<AbasDoSalao> {
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
  let jaTemColeta = false
  for (const t of paginas) {
    const { papel, porque } = papelDaAba(t.url, urlAutomacao, jaTemAutomacao, coletaRodando, jaTemColeta)
    if (papel === 'automacao') jaTemAutomacao = true
    if (papel === 'coleta') jaTemColeta = true
    abas.push({
      id: String(t.id || ''),
      titulo: String(t.title || '').slice(0, 80),
      url: String(t.url || '').slice(0, 160),
      papel, porque,
      pode_fechar: papel === 'sobrando',
    })
  }
  // ── Coleta rodando: não se fecha NADA ────────────────────────────────────
  //
  // O robô da coleta percorre uma LISTA de relatórios, um de cada vez -- 0017,
  // 0021, 0031, 0032, 0041, 0042, 0083, 0126 -- e nessa lista está também o
  // 0051, o mesmo da extensão. Com uma coleta em andamento não há como saber,
  // de fora, se um 0051 aberto é o da extensão ou o que o coletor está lendo
  // agora. Fechar o errado estraga a coleta do dia inteiro.
  //
  // Como a coleta leva uns 15 minutos e roda de hora em hora, sobra tempo de
  // sobra para limpar depois. Então: enquanto está coletando, ninguém encosta.
  if (coletaRodando) {
    for (const a of abas) {
      if (!a.pode_fechar) continue
      a.pode_fechar = false
      a.porque = 'Tem coleta rodando agora: só dá para fechar quando ela terminar.'
    }
  }

  // Nunca deixar o Chrome sem aba nenhuma: ele se encerra e o robô precisa
  // reabrir o navegador inteiro.
  if (abas.length && abas.every(a => a.pode_fechar)) abas[0].pode_fechar = false

  return { salao_id: salaoId, porta, erro: null, abas, sobrando: abas.filter(a => a.pode_fechar).length }
}

/** Fecha UMA aba, e só se ela estiver sobrando. Devolve o que aconteceu. */
export async function fecharAba(salaoId: string, urlAutomacao: string, abaId: string, coletaRodando = false): Promise<{ ok: boolean; motivo: string }> {
  const estado = await abasDoSalao(salaoId, urlAutomacao, coletaRodando)
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
export async function fecharSobrando(salaoId: string, urlAutomacao: string, coletaRodando = false): Promise<{ fechadas: number; motivo: string }> {
  const estado = await abasDoSalao(salaoId, urlAutomacao, coletaRodando)
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
