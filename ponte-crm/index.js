// ════════════════════════════════════════════════════════════════════════════
// PONTE CRM NODRI
//
// Segura a sessão de WhatsApp de cada salão e carrega mensagem de um lado para
// o outro. Só isso.
//
// ── Por que ela existe ──────────────────────────────────────────────────────
// O NODRI roda na Vercel, que trabalha por função efêmera: o código acorda,
// responde e morre. É ótimo para uma tela e impossível para uma sessão de
// WhatsApp, que precisa de conexão viva 24 horas esperando mensagem chegar.
//
// ── O que ela NÃO faz ───────────────────────────────────────────────────────
// Nenhuma regra de negócio. Estado da conversa, dono, prazo, SLA e motivo de
// perda ficam no NODRI, onde se corrige com um deploy em vez de mexer em
// servidor. Se um dia esta ponte for trocada por outra tecnologia, nada da
// inteligência do CRM se perde.
//
// ── Grupos ficam de fora, de propósito ──────────────────────────────────────
// O CRM é para conversa com cliente. O grupo da equipe, o grupo dos
// fornecedores e as listas de transmissão continuam só no celular — trazer
// isso para a fila da recepção enterraria o que importa.
// ════════════════════════════════════════════════════════════════════════════

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import pino from 'pino'
import fs from 'node:fs'
import path from 'node:path'

const NODRI   = (process.env.NODRI_URL || 'https://www.nodri.com.br').replace(/\/+$/, '')
const CHAVE   = process.env.CRM_PONTE_CHAVE || ''
const PASTA   = process.env.CRM_SESSOES_DIR || './sessoes'
const CICLO   = Number(process.env.CRM_CICLO_MS || 4000)

if (!CHAVE) {
  console.error('[ponte] CRM_PONTE_CHAVE não definida. Sem ela o NODRI recusa a conexão.')
  process.exit(1)
}

const log = pino({ level: process.env.LOG_LEVEL || 'warn' })
const registro = (...a) => console.log(new Date().toLocaleTimeString('pt-BR'), '[ponte]', ...a)

/** Sessões vivas, uma por salão. */
const sessoes = new Map()

// ── Conversa com o NODRI ────────────────────────────────────────────────────

async function nodri(caminho, opcoes = {}) {
  const r = await fetch(`${NODRI}/api/crm/ponte${caminho}`, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', 'x-crm-chave': CHAVE, ...(opcoes.headers || {}) },
  })
  if (!r.ok) throw new Error(`${r.status} ${await r.text().catch(() => '')}`.slice(0, 200))
  return r.json()
}

const avisar = (salaoId, dados) =>
  nodri('?acao=situacao', { method: 'POST', body: JSON.stringify({ salao_id: salaoId, ...dados }) })
    .catch(e => registro('falha ao avisar situação:', e.message))

// ── Telefone ────────────────────────────────────────────────────────────────

/** '5561999998888@s.whatsapp.net' -> '5561999998888' */
const soNumero = jid => String(jid || '').split('@')[0].split(':')[0].replace(/\D+/g, '')

/** O texto da mensagem, seja qual for o formato em que ele veio. */
function textoDaMensagem(m) {
  const c = m?.message
  if (!c) return ''
  return c.conversation
    || c.extendedTextMessage?.text
    || c.imageMessage?.caption
    || c.videoMessage?.caption
    || c.documentMessage?.caption
    || ''
}

function tipoDaMensagem(m) {
  const c = m?.message || {}
  if (c.imageMessage) return 'imagem'
  if (c.audioMessage || c.pttMessage) return 'audio'
  if (c.videoMessage) return 'video'
  if (c.documentMessage) return 'documento'
  if (c.stickerMessage) return 'figurinha'
  return 'texto'
}

// ── O histórico que já existe no celular ────────────────────────────────────
//
// Depois do pareamento o WhatsApp despeja o que o aparelho guardou, em lotes.
// A ponte transforma isso no formato do CRM e manda para o NODRI, que decide
// o estado de cada conversa. Aqui não há regra de negócio nenhuma — só
// tradução, como no resto da ponte.
//
// Grupo, status e canal ficam de fora, igual à mensagem que chega ao vivo.
// Só cliente, que é para o que o CRM serve.

const MSGS_POR_CONVERSA = 40   // o suficiente para entender o assunto
const CONVERSAS_POR_ENVIO = 20 // lote pequeno: um erro não derruba tudo

const ehCliente = jid => String(jid || '').endsWith('@s.whatsapp.net')

const segundos = m => Number(m?.messageTimestamp?.low ?? m?.messageTimestamp ?? 0)

async function mandarHistorico(salaoId, { chats = [], contacts = [], messages = [] }) {
  if (!chats.length && !messages.length) return

  // Nome de agenda por número, para a conversa não abrir como "556199...".
  const nomes = new Map()
  for (const c of contacts) {
    if (!ehCliente(c?.id)) continue
    const nome = c.name || c.notify || c.verifiedName || null
    if (nome) nomes.set(soNumero(c.id), nome)
  }

  // Agrupa as mensagens por conversa.
  const porJid = new Map()
  for (const m of messages) {
    const jid = m?.key?.remoteJid || ''
    if (!ehCliente(jid)) continue
    const texto = textoDaMensagem(m)
    const tipo = tipoDaMensagem(m)
    if (!texto && tipo === 'texto') continue
    if (!porJid.has(jid)) porJid.set(jid, [])
    porJid.get(jid).push({
      direcao: m.key?.fromMe ? 'saida' : 'entrada',
      texto: texto || `[${tipo}]`,
      tipo,
      id_whatsapp: m.key?.id || null,
      em: segundos(m),
    })
    if (!nomes.has(soNumero(jid)) && m.pushName) nomes.set(soNumero(jid), m.pushName)
  }

  // Uma conversa pode aparecer na lista de chats sem nenhuma mensagem no lote:
  // vale trazer mesmo assim, senão o contato some da tela sem explicação.
  for (const c of chats) {
    if (ehCliente(c?.id) && !porJid.has(c.id)) porJid.set(c.id, [])
    if (ehCliente(c?.id) && c.name && !nomes.has(soNumero(c.id))) nomes.set(soNumero(c.id), c.name)
  }

  const conversas = []
  for (const [jid, msgs] of porJid) {
    msgs.sort((a, b) => a.em - b.em)
    conversas.push({
      telefone: soNumero(jid),
      nome: nomes.get(soNumero(jid)) || null,
      mensagens: msgs.slice(-MSGS_POR_CONVERSA),
    })
  }
  if (!conversas.length) return

  for (let i = 0; i < conversas.length; i += CONVERSAS_POR_ENVIO) {
    const fatia = conversas.slice(i, i + CONVERSAS_POR_ENVIO)
    try {
      const r = await nodri('?acao=historico', {
        method: 'POST',
        body: JSON.stringify({ salao_id: salaoId, conversas: fatia }),
      })
      registro(salaoId, `histórico: ${fatia.length} conversas enviadas`, r?.criadas != null ? `(${r.criadas} novas)` : '')
    } catch (e) {
      registro(salaoId, 'falha ao enviar histórico:', e.message)
    }
  }
}

// ── Uma sessão ──────────────────────────────────────────────────────────────

async function abrirSessao(salaoId) {
  if (sessoes.has(salaoId)) return sessoes.get(salaoId)

  const pasta = path.join(PASTA, salaoId)
  fs.mkdirSync(pasta, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(pasta)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: log,
    printQRInTerminal: false,
    // Aparece assim na lista de "Aparelhos conectados" do celular, para o
    // salão saber o que é aquilo e não desconectar por engano.
    browser: ['NODRI CRM', 'Chrome', '1.0.0'],
    // Pedir o histórico é o que faz o CRM abrir já com as conversas que o
    // salão tem no celular, em vez de uma tela vazia esperando alguém
    // escrever. O WhatsApp manda o que ele guardou; não é o histórico
    // inteiro de anos, é o que o aparelho ainda tem.
    syncFullHistory: true,
    markOnlineOnConnect: false,   // não rouba as notificações do celular
  })

  const registroSessao = { sock, salaoId, conectado: false, fechando: false }
  sessoes.set(salaoId, registroSessao)

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u

    if (qr) {
      // O NODRI mostra a imagem direto na tela, então a ponte já manda pronta.
      const imagem = await QRCode.toDataURL(qr, { margin: 1, width: 320 }).catch(() => null)
      if (imagem) {
        registro(salaoId, 'QR gerado')
        await avisar(salaoId, { situacao: 'aguardando_qr', qr: imagem })
      }
    }

    if (connection === 'open') {
      registroSessao.conectado = true
      const numero = soNumero(sock.user?.id)
      registro(salaoId, 'conectado como', numero)
      await avisar(salaoId, {
        situacao: 'conectado', qr: null, erro: null,
        numero, nome_exibicao: sock.user?.name || null,
      })
    }

    if (connection === 'close') {
      registroSessao.conectado = false
      const motivo = lastDisconnect?.error?.output?.statusCode
      sessoes.delete(salaoId)

      // Sessão derrubada de propósito (o salão desconectou pelo celular, ou
      // pelo NODRI). Apagar as credenciais é obrigatório: reusá-las faria a
      // ponte tentar entrar para sempre com uma chave que não vale mais.
      if (motivo === DisconnectReason.loggedOut) {
        registro(salaoId, 'desconectado no celular — credenciais apagadas')
        fs.rmSync(pasta, { recursive: true, force: true })
        await avisar(salaoId, { situacao: 'desconectado', qr: null, numero: null })
        return
      }

      if (registroSessao.fechando) return   // fomos nós que mandamos fechar

      registro(salaoId, 'conexão caiu, motivo', motivo, '— reabrindo')
      await avisar(salaoId, { situacao: 'conectando' })
      setTimeout(() => abrirSessao(salaoId).catch(e => registro(salaoId, 'falha ao reabrir:', e.message)), 3000)
    }
  })

  // ── O histórico que já existe no celular ──────────────────────────────────
  // Chega em lotes logo depois do pareamento. É isto que faz o CRM abrir com
  // as conversas do salão em vez de uma tela em branco.
  sock.ev.on('messaging-history.set', async (lote) => {
    try {
      await mandarHistorico(salaoId, lote)
    } catch (e) {
      registro(salaoId, 'falha ao importar histórico:', e.message)
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // 'notify' é mensagem nova com o aparelho ligado. 'append' é a fila que
    // estava esperando — mensagem que chegou enquanto a ponte estava fora do
    // ar, ou logo antes do pareamento terminar. Ignorar 'append' foi o que
    // fez a primeira mensagem de teste sumir sem deixar rastro.
    if (type !== 'notify' && type !== 'append') return
    registro(salaoId, `chegaram ${messages.length} evento(s) de mensagem (${type})`)
    for (const m of messages) {
      try {
        const jid = m.key?.remoteJid || ''
        if (m.key?.fromMe) continue                    // o que o próprio salão mandou
        if (jid.endsWith('@g.us')) continue            // grupo
        if (jid === 'status@broadcast') continue       // status
        if (!jid.endsWith('@s.whatsapp.net')) continue // canal, newsletter, o que for

        const texto = textoDaMensagem(m)
        const tipo = tipoDaMensagem(m)
        if (!texto && tipo === 'texto') continue       // evento vazio

        await nodri('?acao=entrada', {
          method: 'POST',
          body: JSON.stringify({
            salao_id: salaoId,
            telefone: soNumero(jid),
            nome: m.pushName || null,
            texto: texto || `[${tipo}]`,
            tipo,
            id_whatsapp: m.key?.id || null,
          }),
        })
        registro(salaoId, 'entrada de', soNumero(jid), '—', texto.slice(0, 40))
      } catch (e) {
        registro(salaoId, 'falha ao entregar mensagem:', e.message)
      }
    }
  })

  return registroSessao
}

async function fecharSessao(salaoId) {
  const s = sessoes.get(salaoId)
  if (!s) return
  s.fechando = true
  try { await s.sock.logout() } catch {}
  try { s.sock.end() } catch {}
  sessoes.delete(salaoId)
  fs.rmSync(path.join(PASTA, salaoId), { recursive: true, force: true })
  registro(salaoId, 'sessão encerrada')
}

// ── A fila de saída ─────────────────────────────────────────────────────────

async function despacharFila(salaoId) {
  const s = sessoes.get(salaoId)
  if (!s?.conectado) return

  let fila = []
  try {
    fila = (await nodri(`?salao=${salaoId}`)).fila || []
  } catch (e) {
    registro(salaoId, 'falha ao buscar a fila:', e.message)
    return
  }

  for (const msg of fila) {
    try {
      const jid = `${msg.telefone}@s.whatsapp.net`
      const enviada = await s.sock.sendMessage(jid, { text: msg.texto })
      await nodri('?acao=confirmar', {
        method: 'POST',
        body: JSON.stringify({
          salao_id: salaoId, mensagem_id: msg.id,
          enviada: true, id_whatsapp: enviada?.key?.id || null,
        }),
      })
      // Respiro entre mensagens: ritmo de gente digitando é o que mantém o
      // uso parecido com o de uma pessoa, e é a melhor defesa que existe aqui.
      await new Promise(r => setTimeout(r, 1200))
    } catch (e) {
      registro(salaoId, 'falha ao enviar:', e.message)
      await nodri('?acao=confirmar', {
        method: 'POST',
        body: JSON.stringify({
          salao_id: salaoId, mensagem_id: msg.id, enviada: false, erro: String(e.message).slice(0, 200),
        }),
      }).catch(() => {})
    }
  }
}

// ── O laço ──────────────────────────────────────────────────────────────────

async function volta() {
  let canais = []
  try {
    canais = (await nodri('?acao=canais')).canais || []
  } catch (e) {
    registro('NODRI fora de alcance:', e.message)
    return
  }

  const querem = new Set(canais.map(c => c.salao_id))

  // Abre o que falta
  for (const c of canais) {
    if (!sessoes.has(c.salao_id)) {
      registro(c.salao_id, 'abrindo sessão')
      abrirSessao(c.salao_id).catch(e => {
        registro(c.salao_id, 'falha ao abrir:', e.message)
        avisar(c.salao_id, { situacao: 'caiu', erro: String(e.message).slice(0, 200) })
      })
    }
  }

  // Fecha o que o salão desligou pelo NODRI
  for (const salaoId of [...sessoes.keys()]) {
    if (!querem.has(salaoId)) await fecharSessao(salaoId)
  }

  // Sinal de vida + fila de saída. O sinal é o que permite a tela dizer
  // "conexão caiu" em vez de fingir que está tudo bem quando a ponte morreu.
  for (const [salaoId, s] of sessoes) {
    if (s.conectado) {
      avisar(salaoId, { situacao: 'conectado' }).catch(() => {})
      await despacharFila(salaoId)
    }
  }
}

registro(`ligando — NODRI em ${NODRI}, sessões em ${path.resolve(PASTA)}`)
await volta()
setInterval(() => { volta().catch(e => registro('erro na volta:', e.message)) }, CICLO)

process.on('SIGINT', async () => {
  registro('encerrando...')
  for (const [, s] of sessoes) { try { s.sock.end() } catch {} }
  process.exit(0)
})
