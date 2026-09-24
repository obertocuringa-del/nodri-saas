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
  downloadMediaMessage,
  ALL_WA_PATCH_NAMES,
  USyncQuery,
  USyncUser,
  BufferJSON,
} from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import sharp from 'sharp'
import pino from 'pino'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const NODRI   = (process.env.NODRI_URL || 'https://www.nodri.com.br').replace(/\/+$/, '')
const CHAVE   = process.env.CRM_PONTE_CHAVE || ''
const PASTA   = process.env.CRM_SESSOES_DIR || './sessoes'
// 21/09/2026: a Vercel pausou o site por excesso de chamadas no plano gratis;
// no mesmo dia o dono foi para o Pro (sem teto) e pediu a frequencia de volta.
const CICLO   = Number(process.env.CRM_CICLO_MS || 4000)
// A fila de saida tem ritmo proprio, bem mais curto. Quem clica em Enviar
// espera a mensagem sair AGORA: com o laco geral de 4 segundos a resposta
// chegava na cliente com ate 4 segundos de atraso, e a recepcao ficava olhando
// para a tela sem saber se tinha funcionado. O laco geral continua largo
// porque o que ele faz -- conferir canais, bater relogio -- nao tem pressa.
const CICLO_FILA = Number(process.env.CRM_CICLO_FILA_MS || 1000)

if (!CHAVE) {
  console.error('[ponte] CRM_PONTE_CHAVE não definida. Sem ela o NODRI recusa a conexão.')
  process.exit(1)
}

// Quem sou eu. Vai junto no pedido de canais e e o que permite ao NODRI dar a
// posse a uma ponte so: duas abrindo a mesma sessao de WhatsApp brigam entre
// si e derrubam a conexao do salao. O nome da maquina entra para a mensagem
// de erro dizer ALGUMA coisa util quando isso acontecer.
const EU = process.env.CRM_PONTE_ID || `${os.hostname()}`

// ── O log do Baileys passa por aqui antes de ir para a tela ─────────────────
//
// Ele registra "failed to decrypt message" toda vez que chega uma mensagem que
// a ponte não consegue abrir. Em 15/09/2026 foram centenas por dia, e ninguém
// viu: a tela dizia "Conectado" e o CRM não recebia nada. Contar essas linhas
// por salão é o que permite à ponte perceber sozinha que a sessão apodreceu e
// avisar na tela (ver vigiarSaude), em vez de esperar alguém ler 15 MB de log.
const contadores = new Map()   // salaoId -> { naoAbriu: n }
const saidaDoLog = {
  write(linha) {
    if (linha.includes('failed to decrypt message')) {
      try {
        const j = JSON.parse(linha)
        const c = contadores.get(j.salao)
        if (c) c.naoAbriu++
      } catch {}
    }
    process.stdout.write(linha)
  },
}
const log = pino({ level: process.env.LOG_LEVEL || 'warn' }, saidaDoLog)
// ── O log fala em NOME, não em código ───────────────────────────────────────
//
// Uma linha dizendo "96de3e30-65a3-497e-af6b-8d6fd718ea37 gerou QR" não responde
// a pergunta que importa na hora do aperto: QUAL salão é esse? Em 15/09/2026 eu
// li o log errado por causa disso e quase avisei que o Rouge tinha caído,
// quando o que gerava QR era outro salão. O NODRI manda o nome junto com a
// lista de canais, e é ele que aparece aqui.
const nomeDoSalao = new Map()
const legivel = x => (typeof x === 'string' && nomeDoSalao.has(x))
  ? `${nomeDoSalao.get(x)} [${x.slice(0, 8)}]`
  : x
const registro = (...a) => console.log(new Date().toLocaleTimeString('pt-BR'), '[ponte]', ...a.map(legivel))

/** Sessões vivas, uma por salão. */
const sessoes = new Map()
// Quedas seguidas sem abrir, por salão. Ver o recuo em connection.update.
const quedasSeguidas = new Map()

// Salão que pediu o CRM e não escaneou: até quando não insistir.
// salaoId -> instante (ms) em que pode tentar de novo.
const semNinguem = new Map()
// Códigos gerados por salão. Fica FORA do registro da sessão de propósito: o
// WhatsApp derruba a conexão a cada ~2 minutos (motivo 408) e a ponte reabre
// com um registro novo. Contando lá dentro, o número voltava a zero a cada
// queda e o limite nunca era alcançado -- medido em 12/09/2026: 254 códigos em
// três minutos, sem a pausa nunca disparar.
const qrsPorSalao = new Map()
// Quem já conectou alguma vez desde que a ponte subiu. Um salão que estava no
// ar e caiu é um salão de verdade, com gente querendo escanear de volta: esse
// ganha muito mais tempo antes de a ponte descansar. Quem nunca conectou é o
// que clicou em "Iniciar CRM" e sumiu.
//
// Gravado em disco porque a lista em memória nasce vazia a cada reinício — e
// reiniciar a ponte logo depois de um logout é exatamente o momento em que o
// salão está na frente da tela esperando o código. Tratá-lo como "novo" ali
// daria três minutos de código e vinte de silêncio.
const ARQ_CONHECIDOS = path.join(PASTA, 'conhecidos.json')
const jaConectou = new Set((() => {
  try { return JSON.parse(fs.readFileSync(ARQ_CONHECIDOS, 'utf8')) } catch { return [] }
})())
function lembrarConhecido(salaoId) {
  if (jaConectou.has(salaoId)) return
  jaConectou.add(salaoId)
  try {
    fs.mkdirSync(PASTA, { recursive: true })
    fs.writeFileSync(ARQ_CONHECIDOS, JSON.stringify([...jaConectou]), 'utf8')
  } catch {}
}
const QR_SALAO_VIVO = Number(process.env.CRM_QR_MAX_VIVO || 60)   // ~20 min
const QR_SALAO_NOVO = Number(process.env.CRM_QR_MAX || 10)        // ~3 min
const ESPERA_SEM_QR = Number(process.env.CRM_QR_ESPERA_MS || 20 * 60000)

// Quantas mensagens enviadas ficam guardadas para poder reenviar. O pedido de
// reenvio chega minutos depois, no máximo horas -- 300 cobre um dia inteiro de
// recepção com folga, e é memória de sobra (só o conteúdo, não a mídia).
const ULTIMAS_ENVIADAS = 300

// ── Memória por salão que sobrevive à reconexão e ao reinício ───────────────
//
// Duas listas moram aqui, e as duas ficavam em lugar errado:
//
// `enviadas` -- o conteúdo do que saiu, para reenviar quando o aparelho da
// cliente pede. Ficava DENTRO do registro da sessão, e o registro nasce de
// novo a cada queda (em 15/09/2026 o WhatsApp derrubou a conexão a cada ~50
// minutos, motivo 500). O pedido de reenvio chegava depois da queda, a ponte
// respondia "não está mais guardada" e na tela da cliente ficava "Aguardando
// mensagem" para sempre. Visto no log em 15/09 18:09, 16/09 00:43 e 02:05.
//
// `pendentes` -- mensagem de cliente que chegou enquanto o NODRI estava fora
// de alcance ("fetch failed"). Era descartada com um registro no log e nada
// mais: 21 mensagens de cliente sumiram assim em 14/09/2026. Agora fica na
// fila e é reentregue na volta seguinte, na ordem em que chegou.
//
// Em disco porque reiniciar a ponte é rotina (o Windows atualiza, alguém fecha
// a janela) e nenhum dos dois pedidos espera. Fora da pasta de credenciais de
// propósito: Desconectar apaga a pasta, e o que está pendente de entrega não
// pode ir junto.
const memorias = new Map()   // salaoId -> { enviadas: Map, pendentes: [] }
const arquivoMemoria = salaoId => path.join(PASTA, `memoria-${salaoId}.json`)

function memoriaDe(salaoId) {
  let m = memorias.get(salaoId)
  if (m) return m
  m = { enviadas: new Map(), pendentes: [], gravar: null }
  try {
    const bruto = JSON.parse(fs.readFileSync(arquivoMemoria(salaoId), 'utf8'), BufferJSON.reviver)
    for (const [id, conteudo] of bruto?.enviadas || []) m.enviadas.set(id, conteudo)
    if (Array.isArray(bruto?.pendentes)) m.pendentes = bruto.pendentes
  } catch { /* primeira vez, ou arquivo estragado: começa vazio */ }
  memorias.set(salaoId, m)
  return m
}

/** Grava com um respiro de 1 s: dez envios seguidos viram uma escrita só. */
function salvarMemoria(salaoId) {
  const m = memoriaDe(salaoId)
  if (m.gravar) return
  m.gravar = setTimeout(() => {
    m.gravar = null
    try {
      fs.mkdirSync(PASTA, { recursive: true })
      fs.writeFileSync(arquivoMemoria(salaoId), JSON.stringify({
        enviadas: [...m.enviadas.entries()],
        pendentes: m.pendentes,
      }, BufferJSON.replacer), 'utf8')
    } catch (e) {
      registro(salaoId, 'falha ao gravar a memória:', e.message)
    }
  }, 1000)
}

/**
 * Guarda o conteúdo de uma mensagem que acabou de sair, para conseguir
 * reenviá-la se o aparelho da cliente pedir (ver getMessage, em
 * abrirDeVerdade). Para foto e áudio isto NÃO guarda o arquivo: guarda o
 * ponteiro que o WhatsApp já subiu, então é barato.
 */
function guardarEnviada(salaoId, id, conteudo) {
  if (!id || !conteudo) return
  const m = memoriaDe(salaoId)
  m.enviadas.set(id, conteudo)
  // Map guarda a ordem de inserção, então a primeira chave é sempre a mais
  // velha -- dá uma fila que se limpa sozinha, sem biblioteca nenhuma.
  while (m.enviadas.size > ULTIMAS_ENVIADAS) {
    m.enviadas.delete(m.enviadas.keys().next().value)
  }
  salvarMemoria(salaoId)
}

// Teto da fila de reentrega. Mais que isso é o NODRI fora do ar por horas, e
// aí o problema não é a ponte -- mas as primeiras 500 ainda merecem chegar.
const TETO_PENDENTES = 500

/** Entrega uma mensagem ao NODRI; se ele estiver fora de alcance, guarda para a volta seguinte. */
async function entregarAoNodri(salaoId, corpo) {
  try {
    await nodri('?acao=entrada', { method: 'POST', body: JSON.stringify(corpo) })
    return true
  } catch (e) {
    const m = memoriaDe(salaoId)
    // Erro do proprio pedido (400, 401, 404) nao melhora tentando de novo;
    // rede fora e servidor com erro passageiro (402, 5xx...) valem a fila.
    if (!VALE_REENTREGA(e)) throw e
    if (m.pendentes.length >= TETO_PENDENTES) m.pendentes.shift()
    m.pendentes.push(corpo)
    salvarMemoria(salaoId)
    registro(salaoId, `NODRI fora de alcance — mensagem guardada para reentrega (${m.pendentes.length} na fila)`)
    return false
  }
}

// O que vale guardar para reentrega: rede fora, OU o servidor respondendo
// com erro passageiro. Em 21/09/2026 a Vercel pausou o site por cobranca e
// respondia 402 a tudo; como 402 nao era "rede fora", a ponte descartou tres
// horas de mensagens de cliente -- ficaram so no celular. Agora 402, 408,
// 429 e 5xx entram na fila; 400/401/403/404 (erro do proprio pedido) nao.
const VALE_REENTREGA = e =>
  /fetch failed|ECONN|ETIMEDOUT|ENOTFOUND|socket hang up|network/i.test(e.message)
  || /^(402|408|425|429|5\d\d)\b/.test(e.message)

/** A fila de reentrega, na ordem em que chegou. Para na primeira falha. */
async function reentregarPendentes(salaoId) {
  const m = memoriaDe(salaoId)
  if (!m.pendentes.length) return
  let entregues = 0
  while (m.pendentes.length) {
    const corpo = m.pendentes[0]
    try {
      // `reentregue`: o NODRI conta e mostra na tela "N mensagens chegaram
      // enquanto o CRM estava fora do ar e foram entregues agora".
      await nodri('?acao=entrada', { method: 'POST', body: JSON.stringify({ ...corpo, reentregue: true }) })
    } catch (e) {
      if (VALE_REENTREGA(e)) break
      registro(salaoId, 'reentrega recusada pelo NODRI, descartando:', e.message)
    }
    m.pendentes.shift()
    entregues++
  }
  salvarMemoria(salaoId)
  if (entregues) registro(salaoId, `${entregues} mensagem(ns) reentregue(s) ao NODRI; ${m.pendentes.length} ainda na fila`)
}

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

// ── Endereco de cliente ─────────────────────────────────────────────────────
//
// O WhatsApp passou a enderecar conversa por um id anonimo -- o LID, que
// termina em "@lid" -- em vez do telefone. Contas novas vem so assim. Filtrar
// por "@s.whatsapp.net" descartava o historico INTEIRO de um numero moderno:
// chegavam 115 conversas por lote e nenhuma passava.
//
// O telefone continua vindo, num campo a parte da conversa (`pnJid`). Entao
// aceitar os dois enderecos e traduzir o LID para telefone e o que faz o
// historico existir.
const ehTelefone = jid => String(jid || '').endsWith('@s.whatsapp.net')
const ehLid = jid => String(jid || '').endsWith('@lid')
const ehCliente = jid => ehTelefone(jid) || ehLid(jid)

/** LID -> telefone, montado com o que o proprio lote entrega. */
function mapaDeTelefones(chats = [], contacts = []) {
  const mapa = new Map()
  const guardar = (de, para) => { if (de && para && ehTelefone(para)) mapa.set(de, para) }
  for (const c of chats) {
    const tel = ehTelefone(c?.id) ? c.id : (c?.pnJid || null)
    guardar(c?.id, tel)
    guardar(c?.lidJid, tel)
  }
  for (const c of contacts) {
    guardar(c?.id, c?.jid)
    guardar(c?.lid, c?.jid)
  }
  return mapa
}

const segundos = m => Number(m?.messageTimestamp?.low ?? m?.messageTimestamp ?? 0)

async function mandarHistorico(salaoId, { chats = [], contacts = [], messages = [] }) {
  if (!chats.length && !messages.length) {
    registro(salaoId, 'lote de histórico veio vazio — nada a importar')
    return
  }

  const paraTelefone = mapaDeTelefones(chats, contacts)
  // Telefone quando o WhatsApp entrega; senao o proprio LID serve de
  // identidade. Exigir telefone aqui era jogar fora o historico INTEIRO das
  // contas novas -- 5.053 conversas descartadas num unico lote.
  const resolver = jid => ehTelefone(jid) ? jid : (paraTelefone.get(jid) || jid || null)
  // O LID de quem foi resolvido para telefone vai JUNTO. É ele que liga a
  // conversa nova ao contato que já existia só com o id anônimo: sem isso o
  // NODRI criava a mesma pessoa duas vezes -- uma com LID, outra com número.
  const lidDe = new Map()   // telefone@s.whatsapp.net -> lid
  for (const [de, para] of paraTelefone) if (ehLid(de)) lidDe.set(para, de)

  // Nome de agenda por número, para a conversa não abrir como "556199...".
  const nomes = new Map()
  for (const c of contacts) {
    const chave = (ehTelefone(c?.jid) ? c.jid : null) || resolver(c?.id) || resolver(c?.lid)
    if (!chave) continue
    const nome = c.name || c.notify || c.verifiedName || null
    if (nome) nomes.set(soNumero(chave), nome)
  }

  // Agrupa as mensagens por conversa.
  const porJid = new Map()
  let semTelefone = 0
  for (const m of messages) {
    const bruto = m?.key?.remoteJid || ''
    if (!ehCliente(bruto)) continue
    const jid = resolver(bruto)
    if (!jid) continue
    if (!ehTelefone(jid)) semTelefone++
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
    if (!ehCliente(c?.id)) continue
    const jid = resolver(c.id)
    if (!jid) continue
    if (!porJid.has(jid)) porJid.set(jid, [])
    if (c.name && !nomes.has(soNumero(jid))) nomes.set(soNumero(jid), c.name)
  }
  if (semTelefone) {
    registro(salaoId, `${semTelefone} mensagem(ns) vieram só com o id anônimo (LID) — entram com o nome, e o número aparece quando a cliente escrever ao vivo`)
  }

  const conversas = []
  for (const [jid, msgs] of porJid) {
    msgs.sort((a, b) => a.em - b.em)
    const temTelefone = ehTelefone(jid)
    conversas.push({
      telefone: temTelefone ? soNumero(jid) : null,
      lid: temTelefone ? (lidDe.get(jid) || null) : jid,
      nome: nomes.get(soNumero(jid)) || null,
      mensagens: msgs.slice(-MSGS_POR_CONVERSA),
    })
  }
  if (!conversas.length) {
    registro(salaoId, 'lote sem conversa de cliente (só grupo/status) — nada a importar')
    return
  }

  for (let i = 0; i < conversas.length; i += CONVERSAS_POR_ENVIO) {
    const fatia = conversas.slice(i, i + CONVERSAS_POR_ENVIO)
    try {
      const r = await nodri('?acao=historico', {
        method: 'POST',
        body: JSON.stringify({ salao_id: salaoId, conversas: fatia }),
      })
      registro(salaoId, `histórico: ${fatia.length} conversas enviadas`,
        r?.criadas != null ? `(${r.criadas} novas, ${r.mensagens ?? 0} mensagens)` : '',
        r?.erro ? `ERRO DO BANCO: ${r.erro}` : '')
    } catch (e) {
      registro(salaoId, 'falha ao enviar histórico:', e.message)
    }
  }
}

// ── Mídia ───────────────────────────────────────────────────────────────────
//
// Foto, áudio e documento sobem DIRETO para o storage, com uma URL que o NODRI
// assina na hora. A ponte nunca vê a chave do banco: ela roda no computador do
// salão, e chave de serviço em computador de salão é chave vazada com data
// marcada.
//
// Teto de tamanho porque o CRM é para conversa, não para guardar o vídeo de
// 80 MB que alguém mandou. O que passar do teto vira um aviso na conversa em
// vez de sumir sem explicação.
const TETO_MIDIA = 20 * 1024 * 1024

const EXTENSAO = {
  imagem: 'jpg', audio: 'ogg', video: 'mp4', figurinha: 'webp', documento: 'bin',
}

// ── Foto da cliente entra comprimida ────────────────────────────────────────
//
// 24/09/2026: o Supabase cortou o projeto inteiro por estourar a cota de
// EGRESS (download), e o CRM ficou fora do ar em pleno expediente. Eram 36 MB
// de arquivo guardado gerando GIGABYTES baixados: a foto original sai do
// storage de novo a cada vez que alguem abre a conversa.
//
// Foto de celular chega com 2 a 5 MB e 4000 px de largura para ser vista num
// balao de 400 px. Reduzir na entrada corta o download proporcionalmente,
// TODAS as vezes que aquela foto for aberta dali para a frente.
//
// Só imagem: audio e video passam intactos (recomprimir audio de voz estraga,
// e video exigiria ffmpeg no computador do salao).
const LARGURA_MAX = 1600
const QUALIDADE = 80

async function comprimirSeForImagem(salaoId, buffer, tipo, mime) {
  if (tipo !== 'imagem') return { buffer, mime }
  try {
    const menor = await sharp(buffer)
      .rotate()                                            // respeita o EXIF do celular
      .resize({ width: LARGURA_MAX, withoutEnlargement: true })
      .jpeg({ quality: QUALIDADE, mozjpeg: true })
      .toBuffer()
    // Só troca se valeu a pena: imagem ja pequena pode sair maior em JPEG.
    if (menor.length < buffer.length) {
      registro(salaoId, `foto comprimida: ${Math.round(buffer.length / 1024)} kB -> ${Math.round(menor.length / 1024)} kB`)
      return { buffer: menor, mime: 'image/jpeg' }
    }
  } catch (e) {
    registro(salaoId, 'não consegui comprimir a foto, subindo original:', e.message)
  }
  return { buffer, mime }
}

async function guardarMidia(salaoId, m, tipo) {
  try {
    const buffer = await downloadMediaMessage(m, 'buffer', {}, { logger: log, reuploadRequest: undefined })
    if (!buffer?.length) return null
    if (buffer.length > TETO_MIDIA) {
      registro(salaoId, `mídia de ${Math.round(buffer.length / 1048576)} MB acima do teto — não guardada`)
      return null
    }

    const doc = m.message?.documentMessage
    const nome = doc?.fileName || `${tipo}_${Date.now()}.${EXTENSAO[tipo] || 'bin'}`
    const mime = doc?.mimetype
      || m.message?.imageMessage?.mimetype
      || m.message?.audioMessage?.mimetype
      || m.message?.videoMessage?.mimetype
      || 'application/octet-stream'

    const pronto = await comprimirSeForImagem(salaoId, buffer, tipo, mime)

    const { signedUrl, publicUrl } = await nodri('?acao=midia-url', {
      method: 'POST',
      body: JSON.stringify({ salao_id: salaoId, nome }),
    })
    // `cache-control` de um ano: o caminho do arquivo carrega a hora em que ele
    // nasceu (`${Date.now()}_${nome}`), entao aquele endereco NUNCA muda de
    // conteudo. Sem este cabecalho o Supabase serve com uma hora de validade e
    // o navegador rebaixa a mesma foto a tarde inteira -- foi isso que estourou
    // a cota de egress em 24/09/2026.
    const r = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'content-type': pronto.mime,
        'x-upsert': 'true',
        'cache-control': 'public, max-age=31536000, immutable',
      },
      body: pronto.buffer,
    })
    if (!r.ok) { registro(salaoId, 'falha ao guardar mídia:', r.status); return null }
    return publicUrl
  } catch (e) {
    registro(salaoId, 'falha ao baixar mídia:', e.message)
    return null
  }
}

// ── Uma sessão ──────────────────────────────────────────────────────────────

async function abrirSessao(salaoId) {
  if (sessoes.has(salaoId)) return sessoes.get(salaoId)

  // ── A vaga e reservada ANTES de qualquer await ────────────────────────────
  //
  // O laco roda a cada 4 segundos e chamava esta funcao sem esperar. Como as
  // duas primeiras linhas de trabalho aqui SAO awaits (uma delas busca a
  // versao do WhatsApp pela rede), duas voltas seguidas passavam pelo
  // `sessoes.has` antes de qualquer uma gravar, e abriam DOIS sockets para o
  // mesmo salao, na mesma pasta de credenciais.
  //
  // Os dois pareiam ao mesmo tempo, gravam credencial por cima um do outro, e
  // o WhatsApp aborta a sincronia inicial. Resultado na tela: conecta, aparece
  // o numero certo, e nao vem conversa nenhuma -- que foi exatamente o que
  // aconteceu ao ligar o telefone do salao. No log dava para ver: "QR gerado"
  // duas vezes no mesmo segundo.
  const registroSessao = {
    sock: null, salaoId, conectado: false, fechando: false,
    // ── Sinais vitais desta conexão. Ver vigiarSaude() ─────────────────────
    abertoEm: 0,         // quando a conexão abriu (ms)
    eventos: 0,          // mensagens que o WhatsApp entregou à ponte nesta conexão
    naoAbriu: 0,         // mensagens que chegaram cifradas e a ponte não conseguiu abrir
    alertou: false,      // já avisou a tela que a sessão está doente
  }
  sessoes.set(salaoId, registroSessao)
  contadores.set(salaoId, registroSessao)

  try {
    return await abrirDeVerdade(salaoId, registroSessao)
  } catch (e) {
    sessoes.delete(salaoId)     // deu errado: libera a vaga para a proxima volta
    throw e
  }
}

async function abrirDeVerdade(salaoId, registroSessao) {
  const pasta = path.join(PASTA, salaoId)
  fs.mkdirSync(pasta, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(pasta)
  const { version } = await fetchLatestBaileysVersion()

  // Nós de mensagem que vieram da fila do servidor (offline), por id. Serve
  // para dois consertos abaixo: negar reenvio ao lixo velho e tirá-lo da fila.
  const nosDaFila = new Map()
  const meuNumero = () => new Set([
    soNumero(registroSessao.sock?.user?.id), soNumero(registroSessao.sock?.user?.lid),
  ].filter(Boolean))
  const ehMinhaVelha = (id) => {
    const no = nosDaFila.get(id)
    return !!no && meuNumero().has(soNumero(no.attrs?.from))
  }

  // ── Reenvio: não para o que o próprio salão mandou dias atrás ─────────────
  //
  // Para cada mensagem que não abre o Baileys pede reenvio ao remetente, até
  // cinco vezes, com 250 ms entre um pedido e outro, dentro de uma fila que
  // também segura a decifração. Com 1.900 mensagens velhas do próprio celular
  // que nunca vão abrir, isso são oito minutos de fila a cada reconexão -- e a
  // conexão caía por keep-alive (408) aos dois. Este contador diz ao Baileys
  // "já tentou o máximo" para mensagem VELHA do PRÓPRIO SALÃO; para mensagem
  // de cliente ele conta de verdade, e o reenvio continua existindo.
  const contadorReal = new Map()
  const contadorDeReenvio = {
    get(chave) {
      const id = String(chave || '').split(':')[0]
      if (ehMinhaVelha(id)) return 99
      return contadorReal.get(chave)
    },
    set(chave, valor) { contadorReal.set(chave, valor); return true },
    del(chave) { return contadorReal.delete(chave) ? 1 : 0 },
  }

  const sock = makeWASocket({
    version,
    auth: state,
    msgRetryCounterCache: contadorDeReenvio,
    // Filho com o id do salão: é o que deixa saidaDoLog contar por salão as
    // mensagens que chegaram e não abriram.
    logger: log.child({ salao: salaoId }),
    printQRInTerminal: false,
    // Aparece assim na lista de "Aparelhos conectados" do celular, para o
    // salão saber o que é aquilo e não desconectar por engano.
    browser: ['NODRI CRM', 'Chrome', '1.0.0'],
    // Pedir o histórico é o que faz o CRM abrir já com as conversas que o
    // salão tem no celular, em vez de uma tela vazia esperando alguém
    // escrever. O WhatsApp manda o que ele guardou; não é o histórico
    // inteiro de anos, é o que o aparelho ainda tem.
    syncFullHistory: true,
    // O WhatsApp manda o historico em lotes e o Baileys pode descartar alguns
    // conforme o tipo. Dizer explicitamente que queremos TODOS evita o caso em
    // que o pareamento ocorre, a conexao abre e nao chega conversa nenhuma --
    // que foi exatamente o que aconteceu com o numero do salao.
    shouldSyncHistoryMessage: () => true,
    markOnlineOnConnect: false,   // não rouba as notificações do celular
    // ── A mensagem que a cliente não conseguiu abrir ────────────────────────
    //
    // Quando o aparelho da cliente não consegue decifrar uma mensagem -- e
    // isso acontece sozinho: telefone que ficou horas offline, aparelho novo,
    // sessão do Signal que saiu de passo -- ele NÃO avisa a dona do telefone.
    // Ele pede a mensagem de novo para quem enviou, por baixo do pano. Quem
    // enviou precisa ter o conteúdo guardado para reencriptar e mandar outra
    // vez.
    //
    // Sem isto configurado, o Baileys responde `undefined` e desiste em
    // silêncio (nem no log aparece, porque ele registra em debug). Na tela da
    // cliente fica para sempre "Aguardando esta mensagem. Isso pode levar um
    // tempo. Saiba mais" -- mesmo a mensagem tendo saído daqui.
    //
    // É também a explicação de aparecer no computador e não no celular: são
    // duas sessões de criptografia diferentes do MESMO contato. Uma decifrou,
    // a outra pediu de novo e não teve resposta.
    getMessage: async (chave) => {
      const guardada = memoriaDe(salaoId).enviadas.get(chave?.id)
      // Fica no log porque é invisível de todo o resto: ninguém no salão vê
      // que uma cliente não conseguiu abrir a mensagem. Se um dia voltar a
      // aparecer "Aguardando esta mensagem", é esta linha que diz se a ponte
      // foi chamada e se tinha o que reenviar.
      registro(salaoId, guardada
        ? `aparelho pediu de novo a mensagem ${chave?.id} — reenviando`
        : `aparelho pediu a mensagem ${chave?.id}, que não está mais guardada`)
      return guardada || undefined
    },
  })

  registroSessao.sock = sock

  sock.ev.on('creds.update', saveCreds)

  // ── O que o servidor diz sobre a fila que ficou esperando ──────────────────
  //
  // Ao reconectar, o WhatsApp primeiro entrega o que ficou na fila ("offline")
  // e só depois avisa que acabou -- e é esse aviso que solta os eventos
  // segurados pelo Baileys. Em 15/09/2026 o aviso não veio por três dias.
  // Estas duas linhas no log são o que permite ver ISSO em vez de adivinhar.
  //
  // ── A fila de 8.480 que ninguém pedia ─────────────────────────────────────
  //
  // Medido em 18/09/2026 09:16: {"count":"8480","message":"2670","receipt":
  // "3140","notification":"2648"}. O Baileys responde ao aviso pedindo um lote
  // de CEM e nunca pede o resto. O servidor entrega os cem, fica esperando o
  // próximo pedido, e enquanto espera não manda nada ao vivo. Foi isso que
  // deixou o CRM surdo por três dias depois de o notebook dormir: a fila
  // passou de cem, e a cada reconexão vinham mais cem e mais nada.
  //
  // Aqui o pedido do Baileys sai e entra o nosso, com o tamanho da fila
  // inteira. Quem tem 8.480 esperando quer os 8.480.
  const pedirLoteInteiro = (n) => {
    const a = n?.content?.[0]?.attrs || {}
    const total = Math.max(100, Math.min(Number(a.count) || 0, 50000))
    registro(salaoId, 'fila do servidor:', JSON.stringify(a), `— pedindo ${total} de uma vez`)
    try {
      sock.sendNode({ tag: 'ib', attrs: {}, content: [{ tag: 'offline_batch', attrs: { count: String(total) } }] })
    } catch (e) {
      registro(salaoId, 'falha ao pedir a fila do servidor:', e.message)
    }
  }
  if (sock.ws?.removeAllListeners && sock.ws?.on) {
    sock.ws.removeAllListeners('CB:ib,,offline_preview')
    sock.ws.on('CB:ib,,offline_preview', pedirLoteInteiro)
  }

  // ── O lixo que a fila devolve para sempre ─────────────────────────────────
  //
  // Medido em 18/09/2026 09:42: a fila trazia 1.913 mensagens que o próprio
  // celular do salão mandou dias atrás e que a ponte NÃO consegue abrir ("No
  // matching sessions"). O Baileys pede reenvio cinco vezes, desiste, e nunca
  // confirma o recebimento -- então o servidor guarda tudo e entrega de novo
  // a cada reconexão. Cada reconexão virava dois minutos de decifração
  // falhando, o keep-alive vencia (408), reconectava, e recomeçava: 1.914,
  // 1.920, 1.930... a fila só crescia.
  //
  // Mensagem do PRÓPRIO SALÃO que veio da fila velha e não abriu não tem
  // conserto e não faz falta: é histórico que o celular já tem. A ponte
  // confirma o recebimento ao servidor (o mesmo `ack` que o Baileys manda para
  // mensagem ignorada) e ela sai da fila de vez. Mensagem de CLIENTE que não
  // abriu continua com o Baileys, que pede reenvio -- e o reenvio costuma abrir.
  //
  // O `ack` sai NA HORA em que o nó chega, para tudo que veio da fila -- não
  // depois de decifrar. O Baileys 6.7 só "confirma" mensagem pelo recibo de
  // entrega (quando abre) ou pelo pedido de reenvio (quando não abre); o que
  // não abre e não tem mais reenvio fica sem resposta nenhuma, e o servidor,
  // esperando 1.700 respostas, para de atender qualquer pergunta nossa até
  // o keep-alive vencer (408 aos dois minutos, medido três vezes seguidas em
  // 18/09/2026 09:44-09:55). O ack é o que o WhatsApp Web manda para todo
  // stanza de mensagem; o recibo de entrega continua indo por fora.
  sock.ws?.on?.('CB:message', (no) => {
    if (!no?.attrs?.offline || !no.attrs.id) return
    nosDaFila.set(no.attrs.id, no)
    while (nosDaFila.size > 5000) nosDaFila.delete(nosDaFila.keys().next().value)
    sock.sendMessageAck(no).catch(() => {})
  })
  const descartarDaFila = (chave) => {
    const no = chave?.id ? nosDaFila.get(chave.id) : null
    if (!no) return false
    nosDaFila.delete(chave.id)
    return true
  }
  sock.ws?.on?.('CB:ib,,offline', (n) => {
    const a = n?.content?.[0]?.attrs || {}
    registro(salaoId, 'fila do servidor entregue:', JSON.stringify(a))
  })

  // ── Nomes ─────────────────────────────────────────────────────────────────
  //
  // "Sem nome" repetido na lista nao deixa ninguem escolher uma conversa. O
  // WhatsApp manda os nomes por fora das mensagens, nestes dois eventos -- e
  // e a unica fonte deles quando a conversa e endereçada por LID: ali a
  // mensagem que o salao envia nao carrega nome nenhum do destinatario.
  const mandarNomes = async (lista) => {
    const nomes = []
    for (const c of lista || []) {
      const nome = c?.name || c?.notify || c?.verifiedName
      if (!nome) continue
      const id = c?.id || ''
      if (!ehCliente(id)) continue
      nomes.push({
        telefone: ehTelefone(id) ? soNumero(id) : (ehTelefone(c?.jid) ? soNumero(c.jid) : null),
        lid: ehLid(id) ? id : (c?.lid || null),
        nome: String(nome).slice(0, 120),
      })
    }
    if (!nomes.length) return
    try {
      const r = await nodri('?acao=nomes', {
        method: 'POST',
        body: JSON.stringify({ salao_id: salaoId, contatos: nomes }),
      })
      if (r?.atualizados) registro(salaoId, `${r.atualizados} contato(s) ganharam nome`)
    } catch (e) {
      registro(salaoId, 'falha ao mandar nomes:', e.message)
    }
  }

  sock.ev.on('contacts.upsert', c => { mandarNomes(c).catch(() => {}) })
  sock.ev.on('contacts.update', c => { mandarNomes(c).catch(() => {}) })

  // O WhatsApp revela o telefone por tras de um id anonimo em algumas
  // situacoes -- e o Baileys avisa aqui. Escutar isto e de graca e nao tem
  // risco nenhum: nao consultamos nada, so aproveitamos o que ele conta.
  sock.ev.on('chats.phoneNumberShare', ({ lid, jid }) => {
    if (!lid || !ehTelefone(jid)) return
    registro(salaoId, 'WhatsApp revelou o telefone de', String(lid).split('@')[0])
    nodri('?acao=nomes', {
      method: 'POST',
      body: JSON.stringify({
        salao_id: salaoId,
        contatos: [{ telefone: soNumero(jid), lid }],
      }),
    }).catch(() => {})
  })

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u

    if (qr) {
      // ── Quem nunca escaneia não pode ficar pedindo QR a noite inteira ─────
      //
      // Um salão que clicou em "Iniciar CRM" e nunca leu o código fica com a
      // linha em `crm_canais`, e a ponte reabria a sessão para ele a cada 20
      // segundos, para sempre. Em 11/09/2026 foram 989 QRs em tres horas de um
      // salão sem ninguém do outro lado -- tudo saindo do MESMO IP de onde sai
      // a conexão que está funcionando. Isso é exatamente o comportamento que
      // faz o WhatsApp desconfiar do endereço.
      //
      // Depois de QR_ANTES_DE_DESISTIR o socket fecha e o salão volta para a
      // fila normal: a próxima volta reabre e ele ganha códigos novos. Quem
      // está de fato na frente da tela escaneia muito antes disso.
      const teto = jaConectou.has(salaoId) ? QR_SALAO_VIVO : QR_SALAO_NOVO
      const quantos = (qrsPorSalao.get(salaoId) || 0) + 1
      qrsPorSalao.set(salaoId, quantos)
      if (quantos > teto) {
        registro(salaoId, `${teto} códigos sem ninguém escanear — parando por ${Math.round(ESPERA_SEM_QR / 60000)} min`)
        qrsPorSalao.delete(salaoId)
        // Encerra o socket SEM apagar nada. fecharSessao() serve para quando o
        // salão desconecta de verdade: ela faz logout e apaga a pasta de
        // credenciais. Aqui é só uma pausa.
        registroSessao.fechando = true
        try { sock.end() } catch {}
        sessoes.delete(salaoId)
        semNinguem.set(salaoId, Date.now() + ESPERA_SEM_QR)
        return
      }
      // O NODRI mostra a imagem direto na tela, então a ponte já manda pronta.
      const imagem = await QRCode.toDataURL(qr, { margin: 1, width: 320 }).catch(() => null)
      if (imagem) {
        registro(salaoId, 'QR gerado')
        await avisar(salaoId, { situacao: 'aguardando_qr', qr: imagem })
      }
    }

    if (connection === 'open') {
      registroSessao.conectado = true
      registroSessao.abertoEm = Date.now()
      quedasSeguidas.delete(salaoId)
      // Escanearam: a contagem zera e este salão passa a ser "de verdade".
      qrsPorSalao.delete(salaoId)
      semNinguem.delete(salaoId)
      lembrarConhecido(salaoId)

      // ── Pedir a agenda ────────────────────────────────────────────────────
      //
      // O nome e o telefone das clientes moram na AGENDA do aparelho, que o
      // WhatsApp guarda no "app state" -- e nao no historico de conversas. Sem
      // pedir isso, a lista fica cheia de "Contato 857578" mesmo quando o
      // salao tem a pessoa salva no celular.
      //
      // E uma operacao normal, a mesma que o WhatsApp Web faz ao abrir: nao e
      // consulta em massa nem enumeracao. Roda uma vez por conexao.
      setTimeout(() => {
        registro(salaoId, 'pedindo a agenda de contatos ao WhatsApp...')
        sock.resyncAppState(ALL_WA_PATCH_NAMES, false)
          .then(() => registro(salaoId, 'agenda pedida — os nomes chegam pelos eventos de contato'))
          .catch(e => registro(salaoId, 'falha ao pedir a agenda:', e.message))
      }, 8000)

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
        // O que saiu pelo aparelho antigo não serve para reenviar pelo novo:
        // são identidades diferentes. A fila de reentrega fica.
        memoriaDe(salaoId).enviadas.clear()
        salvarMemoria(salaoId)
        await avisar(salaoId, { situacao: 'desconectado', qr: null, numero: null })
        return
      }

      if (registroSessao.fechando) return   // fomos nós que mandamos fechar

      // ── Recuo quando a rede está fora ─────────────────────────────────────
      //
      // 18/09/2026, 12:04 às 13:33: o Wi-Fi do notebook caiu por 89 minutos e
      // a ponte tentou reabrir a cada 3 segundos -- 1.749 tentativas, 1.749
      // linhas de log, e nada que pudesse dar certo. Queda atrás de queda sem
      // nunca abrir dobra a espera, até meio minuto; abriu, volta aos 3 s.
      const seguidas = (quedasSeguidas.get(salaoId) || 0) + 1
      quedasSeguidas.set(salaoId, seguidas)
      const espera = Math.min(3000 * 2 ** Math.min(seguidas - 1, 4), 30000)
      registro(salaoId, 'conexão caiu, motivo', motivo, seguidas > 1 ? `— reabrindo em ${espera / 1000} s (${seguidas}ª seguida)` : '— reabrindo')
      await avisar(salaoId, { situacao: 'conectando' })
      setTimeout(() => abrirSessao(salaoId).catch(e => registro(salaoId, 'falha ao reabrir:', e.message)), espera)
    }
  })

  // ── O histórico que já existe no celular ──────────────────────────────────
  // Chega em lotes logo depois do pareamento. É isto que faz o CRM abrir com
  // as conversas do salão em vez de uma tela em branco.
  sock.ev.on('messaging-history.set', async (lote) => {
    // Registra SEMPRE, mesmo quando vem vazio. Silencio aqui foi o que me
    // deixou sem saber se o WhatsApp nao mandou nada ou se a importacao
    // falhou -- duas causas diferentes com o mesmo sintoma na tela.
    registro(salaoId, `histórico recebido: ${(lote?.chats || []).length} conversas, ` +
      `${(lote?.messages || []).length} mensagens, ${(lote?.contacts || []).length} contatos` +
      (lote?.syncType != null ? ` (tipo ${lote.syncType})` : '') +
      (lote?.progress != null ? ` ${lote.progress}%` : ''))
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
        const bruto = m.key?.remoteJid || ''
        // Mensagem que chegou cifrada e não abriu: o Baileys entrega um
        // "toco" sem conteúdo. Contar e seguir -- é o sinal que vigiarSaude lê.
        if (!m.message && m.messageStubType) {
          registroSessao.naoAbriu++
          if (m.key?.fromMe && type === 'append' && descartarDaFila(m.key)) {
            registroSessao.descartadas = (registroSessao.descartadas || 0) + 1
          }
          continue
        }
        // Mensagem de verdade, aberta: a sessão está sã. Se a tela estava com
        // o aviso de sessão doente, ele já não vale -- limpa e volta a vigiar.
        registroSessao.eventos++
        if (registroSessao.alertou) {
          registroSessao.alertou = false
          avisar(salaoId, { erro: null }).catch(() => {})
        }
        // O que o salão mandou pelo celular TAMBÉM entra. Sem isso a conversa
        // no CRM fica pela metade: aparece a pergunta da cliente e não a
        // resposta, e quem abre a tela não sabe se alguém já falou com ela.
        const deMim = !!m.key?.fromMe
        if (bruto.endsWith('@g.us')) continue          // grupo
        if (bruto === 'status@broadcast') continue     // status
        if (!ehCliente(bruto)) continue                // canal, newsletter, o que for

        // Conversa endereçada por LID: o telefone vem em outro campo da
        // própria mensagem, posto ali por quem decodificou o pacote.
        // A conversa e identificada por quem esta DO OUTRO LADO -- o
        // remoteJid -- nunca por quem enviou.
        //
        // `senderPn` so serve quando a mensagem e DA CLIENTE: ai ele e o
        // numero dela. Numa mensagem que o salao mandou, senderPn e o numero
        // do PROPRIO SALAO, e usar ele arquivaria a resposta numa conversa do
        // salao consigo mesmo. Era por isso que responder pelo celular nao
        // atualizava a fila: a resposta entrava, mas no lugar errado.
        // Telefone: o endereco quando ja e telefone; senao o que o WhatsApp
        // tiver anexado ao pacote. `senderPn` so vale quando a mensagem NAO e
        // do salao (ali ele e o numero de quem enviou, ou seja, o proprio
        // salao). `participantPn` as vezes vem nas duas direcoes.
        const tel = ehTelefone(bruto) ? bruto
          : (deMim ? (m.key?.participantPn || null)
                   : (m.key?.senderPn || m.key?.participantPn || null))
        const lid = ehLid(bruto) ? bruto : null
        if (!tel && !lid) continue

        // ── Edição que chega como MENSAGEM, não como atualização ──────────
        //
        // O WhatsApp entrega edição de dois jeitos: em messages.update (já
        // tratado abaixo) e, mais comum hoje, como uma mensagem nova cujo
        // conteúdo é um protocolMessage tipo 14 apontando para a original.
        // Esse caminho caía no "evento vazio" e era descartado em silêncio:
        // a cliente corrigiu "deilcao" para "depilação" às 10:02 e o CRM
        // seguiu mostrando o errado (22/09/2026, caso ANA).
        const pm = m.message?.protocolMessage || m.message?.editedMessage?.message?.protocolMessage
        if (pm?.editedMessage) {
          const idOriginal = pm.key?.id
          const novo = textoDaMensagem({ message: pm.editedMessage })
          if (idOriginal && novo) {
            nodri('?acao=edicao', {
              method: 'POST',
              body: JSON.stringify({ salao_id: salaoId, id_whatsapp: idOriginal, texto: novo }),
            }).then(r => registro(salaoId, r?.ok ? 'mensagem editada (upsert)' : 'edição sem mensagem correspondente', idOriginal, '—', novo.slice(0, 40)))
              .catch(e => registro(salaoId, 'falha ao repassar edição:', e.message))
          }
          continue
        }

        const texto = textoDaMensagem(m)
        const tipo = tipoDaMensagem(m)
        if (!texto && tipo === 'texto') continue       // evento vazio

        // A foto que a cliente mandou vira foto na tela, não "[imagem]". Sem
        // isso, quem abre o CRM tem que pegar o celular para ver o cabelo que
        // ela mandou — e aí o CRM virou um passo a mais, não um a menos.
        const midia = tipo === 'texto' ? null : await guardarMidia(salaoId, m, tipo)

        const entregou = await entregarAoNodri(salaoId, {
          salao_id: salaoId,
          telefone: tel ? soNumero(tel) : null,
          lid: lid || null,
          nome: deMim ? null : (m.pushName || null),
          texto: texto || `[${tipo}]`,
          tipo,
          midia_url: midia,
          id_whatsapp: m.key?.id || null,
          direcao: deMim ? 'saida' : 'entrada',
          // Lista de transmissão. O NODRI usa isto para não deixar um
          // disparo apagar a pergunta da cliente que ainda está sem
          // resposta — quem decide é lá, a ponte só conta o que viu.
          em_massa: !!m.broadcast,
          // Hora do aparelho (segundos). Depois de uma queda chegam centenas
          // de uma vez; sem isto o NODRI datava tudo com a hora da chegada.
          em: segundos(m) || null,
        })
        // A marca de lista de transmissão fica dita no log. O campo existe no
        // protocolo, mas se ele vem preenchido de verdade neste fluxo só se
        // sabe olhando um disparo real -- e é o que decide se dá para parar de
        // adivinhar disparo por texto repetido.
        registro(salaoId, deMim ? 'saída para' : 'entrada de', soNumero(tel || lid),
          m.broadcast ? '[LISTA DE TRANSMISSÃO] —' : '—', texto.slice(0, 40),
          entregou ? '' : '(na fila de reentrega)')
      } catch (e) {
        registro(salaoId, 'falha ao entregar mensagem:', e.message)
      }
    }
  })

  // ── O que aconteceu com o que a ponte mandou ──────────────────────────────
  //
  // "Enviada" no CRM queria dizer só "saiu da ponte". Em 15/09/2026 saíram 62
  // mensagens assim, com um tique, e boa parte nunca abriu no aparelho da
  // cliente -- e ninguém no salão tinha como saber. O WhatsApp conta o resto
  // da história por aqui: chegou no aparelho (dois tiques), foi lida (azul).
  // A ponte só repassa; a tela do CRM mostra.
  //
  // 3 = chegou no aparelho, 4 = lida, 5 = áudio ouvido. Abaixo de 3 (1 pendente,
  // 2 o servidor recebeu) não muda nada na tela.
  sock.ev.on('messages.update', (atualizacoes) => {
    const itens = []
    for (const u of atualizacoes || []) {
      // ── Mensagem editada ──────────────────────────────────────────────────
      //
      // A cliente manda, corrige e manda de novo -- e o CRM ficava com o texto
      // velho para sempre (18/09/2026). O WhatsApp avisa a edição como uma
      // atualização da mensagem original, com o texto novo dentro.
      const editada = u?.update?.message?.editedMessage?.message
      if (editada && u?.key?.id) {
        const texto = textoDaMensagem({ message: editada })
        if (texto) {
          nodri('?acao=edicao', {
            method: 'POST',
            body: JSON.stringify({ salao_id: salaoId, id_whatsapp: u.key.id, texto }),
          }).then(r => { if (r?.ok) registro(salaoId, 'mensagem editada', u.key.id, '—', texto.slice(0, 40)) })
            .catch(e => registro(salaoId, 'falha ao repassar edição:', e.message))
        }
        continue
      }
      const st = Number(u?.update?.status)
      if (!u?.key?.fromMe || !u.key.id || !(st >= 3)) continue
      itens.push({ id_whatsapp: u.key.id, situacao: st >= 4 ? 'lida' : 'entregue' })
    }
    if (!itens.length) return
    nodri('?acao=status', {
      method: 'POST',
      body: JSON.stringify({ salao_id: salaoId, itens }),
    }).catch(e => registro(salaoId, 'falha ao repassar status de entrega:', e.message))
  })

  // ── A curtida ───────────────────────────────────────────────────────────────
  //
  // No dia a dia a cliente não responde "ok": ela põe um joinha na mensagem.
  // Isso é um "sim" (pedido do dono, 18/09/2026) -- e a ponte jogava fora,
  // porque reação não tem texto. Vai para o NODRI com QUAL mensagem ela
  // curtiu, que é o que decide se aquilo confirma um horário ou é só um "vi".
  // Reação vazia é a cliente tirando a curtida.
  sock.ev.on('messages.reaction', (lista) => {
    for (const r of lista || []) {
      try {
        const alvo = r?.key            // a mensagem que recebeu a reação
        const reacao = r?.reaction     // { text, key: { id, remoteJid, fromMe, participant... } }
        if (!alvo?.id || !reacao?.key) continue
        const bruto = reacao.key.remoteJid || alvo.remoteJid || ''
        if (bruto.endsWith('@g.us') || bruto === 'status@broadcast' || !ehCliente(bruto)) continue
        const deMim = !!reacao.key.fromMe
        const tel = ehTelefone(bruto) ? bruto : (deMim ? null : (reacao.key.senderPn || reacao.key.participantPn || null))
        const lid = ehLid(bruto) ? bruto : null
        nodri('?acao=reacao', {
          method: 'POST',
          body: JSON.stringify({
            salao_id: salaoId,
            telefone: tel ? soNumero(tel) : null,
            lid,
            direcao: deMim ? 'saida' : 'entrada',
            id_whatsapp: reacao.key.id || null,
            alvo_id_whatsapp: alvo.id,
            emoji: String(reacao.text || ''),
          }),
        }).then(x => {
          if (x?.ok && !deMim) registro(salaoId, 'reação de', soNumero(tel || lid), reacao.text ? `— ${reacao.text}` : '— (tirou a reação)', x.confirmou ? '(vale como confirmação)' : '')
        }).catch(e => registro(salaoId, 'falha ao repassar reação:', e.message))
      } catch (e) {
        registro(salaoId, 'falha na reação:', e.message)
      }
    }
  })

  return registroSessao
}

// ── Fechar a sessão: com ou sem apagar as credenciais ────────────────────────
//
// Caso real, 14/09/2026 às 09:24: os DOIS salões sumiram da lista do NODRI
// no mesmo segundo e voltaram 85 segundos depois. A ponte fez logout no
// WhatsApp e apagou as credenciais dos dois -- e o salão amanheceu no QR.
// Não foi o WhatsApp (não houve 401): foi esta função, chamada porque a
// lista veio vazia por um instante (banco fora do ar, ou outra ponte que
// assumiu por uma volta e morreu).
//
// Sumir da lista é sinal FRACO. Apagar credencial é ação FORTE e sem volta.
// As duas não se combinam: sumiu da lista, fecha o socket e guarda tudo; o
// salão volta à lista, reconecta sem QR. Só apaga quando o NODRI diz, com
// todas as letras, que o salão clicou em Desconectar (`situacao:
// 'desconectado'`).
async function fecharSessao(salaoId, { apagar = false } = {}) {
  const s = sessoes.get(salaoId)
  if (!s) return
  s.fechando = true
  if (apagar) { try { await s.sock?.logout() } catch {} }
  try { s.sock?.end() } catch {}
  sessoes.delete(salaoId)
  if (apagar) {
    fs.rmSync(path.join(PASTA, salaoId), { recursive: true, force: true })
    memoriaDe(salaoId).enviadas.clear()
    salvarMemoria(salaoId)
    registro(salaoId, 'sessão encerrada e credenciais apagadas (Desconectar no NODRI)')
  } else {
    registro(salaoId, 'sessão fechada; credenciais guardadas para reconectar sem QR')
  }
}

// ── A fila de saída ─────────────────────────────────────────────────────────

/**
 * O que sai pelo WhatsApp. Texto puro quando não há anexo; com anexo, o tipo
 * certo — foto entra como foto, áudio como áudio de verdade (ptt), documento
 * com o nome preservado. Mandar tudo como documento "funciona" e entrega uma
 * conversa horrível para a cliente.
 */
function corpoDoEnvio(msg) {
  const url = msg.midia_url
  if (!url) return { text: msg.texto || '' }
  const legenda = (msg.texto || '').trim()
  const tipo = msg.tipo || 'documento'

  if (tipo === 'imagem') return { image: { url }, caption: legenda || undefined }
  if (tipo === 'video')  return { video: { url }, caption: legenda || undefined }
  if (tipo === 'audio') {
    // O WhatsApp só trata como áudio de voz (com a onda e a bolinha) o que
    // vem em ogg/opus. Mandar webm como ptt entrega um áudio que não toca em
    // metade dos aparelhos — então webm vai como arquivo de áudio comum, que
    // toca em todos, só sem a onda.
    const ext = String(url).split('?')[0].split('.').pop()?.toLowerCase() || ''
    if (ext === 'ogg') return { audio: { url }, mimetype: 'audio/ogg; codecs=opus', ptt: true }
    if (ext === 'm4a' || ext === 'mp4') return { audio: { url }, mimetype: 'audio/mp4' }
    return { audio: { url }, mimetype: 'audio/webm' }
  }
  return {
    document: { url },
    fileName: msg.nome_arquivo || legenda || 'arquivo',
    mimetype: msg.mime || 'application/octet-stream',
    caption: legenda || undefined,
  }
}

// ── A fila de todos os salões numa pergunta só ──────────────────────────────
//
// Antes cada salão conectado tinha a própria pergunta ao NODRI, uma por
// segundo. Com dois salões ninguém nota; com cinquenta são cinquenta consultas
// por segundo ao banco -- quatro milhões por dia, quase todas para ouvir "não
// tem nada". Somado à mídia, foi o que estourou a cota do Supabase em
// 24/09/2026 e derrubou o CRM inteiro.
//
// Agora a ponte pergunta UMA vez e distribui. O custo no banco para de crescer
// junto com o número de salões.
async function buscarFilasDeTodos(ids) {
  if (!ids.length) return {}
  try {
    const r = await nodri(`?saloes=${encodeURIComponent(ids.join(','))}`)
    if (r?.filas) return r.filas
  } catch (e) {
    registro('falha ao buscar as filas:', e.message)
  }
  return {}
}

async function despacharFila(salaoId, fila) {
  const s = sessoes.get(salaoId)
  if (!s?.conectado || !s.sock) return
  if (!fila?.length) return

  for (const msg of fila) {
    try {
      // ── O LID vem primeiro; o telefone é o reserva ───────────────────────
      //
      // Era o contrário, e o contrário era a causa do "Aguardando esta
      // mensagem" na tela da cliente. Medido no log de 11/09/2026: depois de
      // a ponte passar a responder o pedido de reenvio, doze destinatários
      // receberam sem um único pedido -- todos endereçados por LID. O ÚNICO
      // endereçado por telefone (556185081274) pediu reenvio em TODAS as
      // mensagens, sempre em menos de um segundo, e nem o reenvio abria,
      // porque ele saía pelo mesmo endereço errado.
      //
      // A conta do salão é das novas, que o WhatsApp endereça por LID. Falar
      // com ela pelo telefone monta a sessão com a identidade errada e o
      // aparelho não consegue decifrar. O telefone continua aqui para o
      // contato que só tem número e nunca escreveu -- aí não há LID para usar.
      let jid = msg.lid || (msg.telefone ? `${msg.telefone}@s.whatsapp.net` : null)
      if (!jid) { registro(salaoId, 'mensagem sem endereço de destino — pulada'); continue }

      // ── Sem LID, pergunta ao WhatsApp qual é o endereço certo ─────────────
      //
      // Caso real, DANIEL, 19/09/2026: o cadastro tinha 61 99699-7744 e o
      // WhatsApp dele é o mesmo número SEM o nono dígito (conta antiga,
      // 61 9699-7744). Cinco avisos "seu cliente chegou" saíram com um tique
      // só e nunca chegaram -- o endereço 5561996997744 não existe. A CLEIDE
      // estava na mesma situação. Com telefone e sem LID, o onWhatsApp diz
      // qual dos dois formatos existe e, se a conta for das novas, devolve
      // o LID -- que é o endereço que não pede reenvio.
      if (!msg.lid && msg.telefone) {
        const certo = await enderecoDoTelefone(s, salaoId, msg.telefone)
        if (certo && certo !== jid) { registro(salaoId, 'endereço de', msg.telefone, 'é', certo); jid = certo }
      }

      // ── Editar, apagar, reagir ────────────────────────────────────────────
      //
      // Não é mensagem nova: é uma ação em cima de uma que já existe. A chave
      // da original vem em `citada` (id do WhatsApp e se foi nossa). O
      // WhatsApp só aceita editar e apagar o que saiu daqui; reagir vale para
      // qualquer uma.
      if (String(msg.tipo || '').startsWith('acao_')) {
        const chave = { remoteJid: jid, id: msg.citada?.id_whatsapp, fromMe: !!msg.citada?.minha }
        if (!chave.id) throw new Error('a mensagem original não tem id do WhatsApp')
        let feita
        if (msg.tipo === 'acao_editar') feita = await s.sock.sendMessage(jid, { text: msg.texto || '', edit: chave })
        else if (msg.tipo === 'acao_apagar') feita = await s.sock.sendMessage(jid, { delete: chave })
        else if (msg.tipo === 'acao_reagir') feita = await s.sock.sendMessage(jid, { react: { text: msg.texto || '', key: chave } })
        else throw new Error('ação desconhecida: ' + msg.tipo)
        registro(salaoId, msg.tipo.replace('acao_', ''), 'em', chave.id, 'para', soNumero(jid))
        await nodri('?acao=confirmar', {
          method: 'POST',
          body: JSON.stringify({ salao_id: salaoId, mensagem_id: msg.id, enviada: true, id_whatsapp: feita?.key?.id || null }),
        })
        continue
      }
      // Citacao: o WhatsApp so precisa da chave da mensagem original e de um
      // texto para o balaozinho. A ponte nao guarda historico, entao monta o
      // minimo que o protocolo aceita com o que o NODRI mandou junto.
      const opcoes = msg.citada ? {
        quoted: {
          key: { remoteJid: jid, id: msg.citada.id_whatsapp, fromMe: !!msg.citada.minha },
          message: { conversation: String(msg.citada.texto || '').slice(0, 300) || ' ' },
        },
      } : undefined
      const enviada = await s.sock.sendMessage(jid, corpoDoEnvio(msg), opcoes)
      // Guardada ANTES de confirmar: o pedido de reenvio pode chegar no
      // segundo seguinte, e chegar antes de a mensagem estar guardada seria
      // exatamente o caso que este código existe para cobrir.
      guardarEnviada(salaoId, enviada?.key?.id, enviada?.message)
      // Fica no log. Sem esta linha o envio pelo CRM era invisível aqui, e em
      // 18/09/2026 não deu para dizer se um teste tinha saído ou não.
      registro(salaoId, 'enviada para', soNumero(jid), '—', String(msg.texto || `[${msg.tipo}]`).slice(0, 40),
        'id', enviada?.key?.id || '?')
      await nodri('?acao=confirmar', {
        method: 'POST',
        body: JSON.stringify({
          salao_id: salaoId, mensagem_id: msg.id,
          enviada: true, id_whatsapp: enviada?.key?.id || null,
        }),
      })
      // Respiro ENTRE mensagens: ritmo de gente digitando é o que mantém o
      // uso parecido com o de uma pessoa, e é a melhor defesa que existe aqui.
      // Só entre uma e a próxima -- esperar depois da última seria segurar a
      // volta seguinte por 1,2 segundo sem motivo, e é o envio seguinte que
      // pagaria a conta.
      if (msg !== fila[fila.length - 1]) await new Promise(r => setTimeout(r, 1200))
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
    canais = (await nodri(`?acao=canais&ponte=${encodeURIComponent(EU)}`)).canais || []
  } catch (e) {
    registro('NODRI fora de alcance:', e.message)
    return
  }

  // Quem o NODRI mandou desligar de vez vem na lista com 'desconectado'
  // (NODRI novo); quem só sumiu da lista pode ser banco fora do ar ou outra
  // ponte -- e isso não apaga nada.
  // Guarda o nome antes de qualquer registro desta volta, para as linhas de
  // baixo já saírem legíveis.
  for (const c of canais) {
    if (c.salao_id && c.nome) nomeDoSalao.set(c.salao_id, c.nome)
  }

  const desligar = new Set(canais.filter(c => c.situacao === 'desconectado').map(c => c.salao_id))
  const querem = new Set(canais.filter(c => c.situacao !== 'desconectado').map(c => c.salao_id))

  for (const salaoId of sessoes.keys()) {
    if (desligar.has(salaoId)) {
      registro(salaoId, 'o salão clicou em Desconectar no NODRI — encerrando de vez')
    } else if (!querem.has(salaoId)) {
      registro(salaoId, 'saiu da lista do NODRI — outra ponte assumiu ou o NODRI oscilou. Fechando sem apagar nada.')
    }
  }

  // Abre o que falta
  for (const c of canais) {
    if (c.situacao === 'desconectado') continue
    if (!sessoes.has(c.salao_id)) {
      // Ainda de castigo por ninguém ter escaneado. Ver QR_ANTES_DE_DESISTIR.
      const espera = semNinguem.get(c.salao_id)
      if (espera && Date.now() < espera) continue
      semNinguem.delete(c.salao_id)
      registro(c.salao_id, 'abrindo sessão')
      abrirSessao(c.salao_id).catch(e => {
        registro(c.salao_id, 'falha ao abrir:', e.message)
        avisar(c.salao_id, { situacao: 'caiu', erro: String(e.message).slice(0, 200) })
      })
    }
  }

  // Fecha o que o salão desligou pelo NODRI
  for (const salaoId of [...sessoes.keys()]) {
    if (desligar.has(salaoId)) await fecharSessao(salaoId, { apagar: true })
    else if (!querem.has(salaoId)) await fecharSessao(salaoId)
  }

  // ── Cruzar por telefone, no sentido que o WhatsApp aceita ─────────────────
  //
  // Perguntar "qual o telefone deste id anônimo" o WhatsApp recusa -- medido:
  // 60 perguntas, 60 recusas. Mas ele responde o contrário. Então a ponte vai
  // pelo outro lado: pega os telefones que o salão já tem no histórico de
  // atendimento, pergunta o id de cada um, e quem bater com um contato sem
  // número ganha o número.
  //
  // Devagar de propósito: uma leva de 20 por minuto. Consulta em massa é
  // exatamente o comportamento que faz o WhatsApp bloquear -- e o que está em
  // jogo é o número do salão, não um detalhe de produto.
  await resolverPorTelefone()

  // Sinal de vida + fila de saída. O sinal é o que permite a tela dizer
  // "conexão caiu" em vez de fingir que está tudo bem quando a ponte morreu.
  for (const [salaoId, s] of sessoes) {
    if (s.conectado) {
      await vigiarSaude(salaoId, s)
      await reentregarPendentes(salaoId)
      // Sinal de vida SEM mandar situacao. Mandando 'conectado' a cada quatro
      // segundos, a ponte desfazia o "Desconectar" que o salao acabara de
      // clicar: o NODRI gravava 'desconectado', a volta seguinte gravava
      // 'conectado' por cima, e a tela voltava sozinha para conectado sem
      // ninguem entender. Quem declara conexao e o evento de abrir a sessao,
      // que acontece uma vez; o resto e so dizer "estou viva".
      avisar(salaoId, {}).catch(() => {})
    }
  }
}

// ── A sessão está viva de verdade? ──────────────────────────────────────────
//
// "Conectado" no topo da tela não diz nada. Em 15/09/2026 o CRM ficou três
// dias conectado e surdo: o WhatsApp entregava as mensagens, a ponte não
// conseguia abrir nenhuma (centenas de "failed to decrypt" no log), o servidor
// derrubava a conexão a cada ~50 minutos com erro 500, e a tela seguia verde.
// Ninguém percebeu até uma cliente reclamar.
//
// Dois sinais, e os dois se medem sem perguntar nada ao WhatsApp:
//
// 1. O BUFFER PRESO. O Baileys segura os eventos numa fila enquanto faz a
//    sincronia inicial e só solta depois. Se a sincronia falha no meio (a
//    conexão cai, o pedido dá "Timed Out"), o estado dele fica travado e a fila
//    nunca é solta -- as mensagens chegam, decifram, e ficam guardadas para
//    sempre sem chegar aqui. Ele expõe `isBuffering()`; se passou de 45 s de
//    conexão aberta e ainda está segurando, a ponte solta na mão.
//
// 2. A SESSÃO PODRE. Mensagens chegam e não abrem ("No matching sessions",
//    "Key used already"), e nenhuma abre. Isso não se conserta daqui: só
//    pareando de novo. O que a ponte pode fazer é DIZER na tela, em vez de
//    fingir que está tudo bem.
const SEGUNDOS_BUFFER = 45
const MINIMO_NAO_ABRIU = 12
const AVISO_SESSAO_PODRE =
  'A sessão do WhatsApp está corrompida: as mensagens chegam e o CRM não consegue abri-las. ' +
  'Clique em Desconectar e leia o QR de novo com o celular do salão.'

/**
 * Solta o buffer do Baileys quando ele fica preso. Roda no laço de 1 s (junto
 * com a fila de saída), porque cada mensagem que chega pela fila "offline" do
 * servidor liga o buffer de novo -- e esperar 4 s por mensagem é 4 s a mais
 * de atraso para a recepção ver a pergunta da cliente.
 */
function soltarBufferPreso(salaoId, s) {
  const sock = s.sock
  if (!sock || !s.abertoEm || !s.conectado) return
  const abertaHa = Date.now() - s.abertoEm
  if (abertaHa <= SEGUNDOS_BUFFER * 1000) return
  if (typeof sock.ev?.isBuffering !== 'function' || !sock.ev.isBuffering()) return
  // Uma linha por minuto, não uma por mensagem: o log é para ler.
  if (!s.soltouEm || Date.now() - s.soltouEm > 60000) {
    registro(salaoId, `o Baileys segurava os eventos (${Math.round(abertaHa / 1000)} s de conexão) — soltando na mão`)
    s.soltouEm = Date.now()
  }
  try { sock.ev.flush() } catch (e) { registro(salaoId, 'falha ao soltar os eventos:', e.message) }
}

async function vigiarSaude(salaoId, s) {
  const sock = s.sock
  if (!sock || !s.abertoEm) return
  const abertaHa = Date.now() - s.abertoEm

  soltarBufferPreso(salaoId, s)

  // Um resumo por minuto do que a fila velha trouxe, só quando há o que dizer.
  if ((s.descartadas || 0) !== (s.descartadasDitas || 0) && (!s.resumoEm || Date.now() - s.resumoEm > 60000)) {
    registro(salaoId, `${s.descartadas} mensagem(ns) velha(s) do próprio celular não abriram e foram tiradas da fila do servidor; ${s.eventos} abriram`)
    s.descartadasDitas = s.descartadas
    s.resumoEm = Date.now()
  }

  // Cifradas que não abriram, sem NENHUMA que tenha aberto: sessão podre.
  // O mínimo existe porque uma ou duas falhas acontecem em sessão sã (aparelho
  // que trocou de chave, mensagem velha na fila) e não são motivo de alarme.
  // Cinco minutos de folga: logo depois de reconectar vem a fila velha do
  // servidor, cheia de mensagem antiga que já não abre mesmo (sessão girou),
  // e isso não é doença -- em 18/09/2026 foram 91 velhas para 6 boas na
  // primeira leva. Doença é passar cinco minutos sem UMA abrir.
  if (!s.alertou && s.eventos === 0 && s.naoAbriu >= MINIMO_NAO_ABRIU && abertaHa > 5 * 60000) {
    s.alertou = true
    registro(salaoId, `${s.naoAbriu} mensagens chegaram cifradas e nenhuma abriu — avisando a tela que a sessão precisa ser pareada de novo`)
    await avisar(salaoId, { erro: AVISO_SESSAO_PODRE })
  }
}

// ── O relógio ───────────────────────────────────────────────────────────────
//
// Uma vez por minuto a ponte pede ao NODRI que ande com o relógio do CRM:
// pausa que venceu, cliente que não respondeu, conversa que virou atendimento.
// Mora aqui porque a ponte é a única coisa que fica ligada o tempo todo — a
// Vercel acorda, responde e morre.
//
// A ponte não sabe NENHUMA dessas regras, e é de propósito: mudar prazo de
// follow-up tem que ser um deploy do NODRI, não uma visita ao servidor.
let relogioEm = 0
async function baterRelogio() {
  if (Date.now() - relogioEm < 60000) return
  relogioEm = Date.now()
  try {
    const r = await nodri('?acao=relogio', { method: 'POST', body: JSON.stringify({}) })
    for (const [salao, f] of Object.entries(r?.saloes || {})) {
      const mexeu = f && Object.values(f).some(v => typeof v === 'number' && v > 0)
      if (mexeu) registro(salao, 'relógio:', JSON.stringify(f))
      if (f?.erro) registro(salao, 'relógio falhou:', f.erro)
    }
  } catch (e) {
    registro('relógio fora de alcance:', e.message)
  }
}

// ── Descobrir quem e quem, pelo telefone ────────────────────────────────────
//
// Ritmo que se ajusta ao que o WhatsApp aceita. As duas primeiras levas
// voltaram com 19 e 17 ids; depois vieram zeros seguidos -- o WhatsApp comeca
// a limitar quem consulta muito, e insistir contra o limite e como se ganha um
// bloqueio. O que esta em jogo e o numero do salao, nao a velocidade da
// varredura.
//
// Entao: leva que volta vazia dobra a espera, ate meia hora. Leva que volta
// com id volta ao ritmo de cinco minutos. Sem ninguem para vigiar.
const ESPERA_MIN = 5 * 60000
const ESPERA_MAX = 30 * 60000
let esperaAtual = ESPERA_MIN
let resolvendoEm = 0

// ── DESLIGADA por padrão ────────────────────────────────────────────────────
//
// Medido em 12/09/2026, cinco levas seguidas depois da reconexão:
//
//   13:20  +40 conferidos   0 com id
//   13:30  +21              0 com id
//   13:50  +40              0 com id
//   14:20   +2              0 com id
//   14:50  +23              0 com id
//
// 897 telefones perguntados, ZERO respostas. O WhatsApp simplesmente não
// responde mais essa consulta nesta conta. O recuo automático está fazendo o
// trabalho dele (já chegou aos trinta minutos), mas o saldo é claro: a única
// coisa que a varredura ainda produz é pedido não solicitado ao WhatsApp, e é
// exatamente isso que faz um número ser limitado ou bloqueado.
//
// E o telefone passou a vir por um caminho melhor: o relógio casa o contato
// com o histórico do salão pelo nome e traz o celular de lá -- sem perguntar
// nada a ninguém.
//
// Fica ligável por variável de ambiente para o dia em que o WhatsApp voltar a
// responder. Enquanto responder zero, não vale o risco do número do salão.
const VARREDURA_LIGADA = process.env.CRM_VARREDURA === '1'

async function resolverPorTelefone() {
  if (!VARREDURA_LIGADA) return
  if (Date.now() - resolvendoEm < esperaAtual) return
  resolvendoEm = Date.now()

  for (const [salaoId, s] of sessoes) {
    if (!s.conectado || !s.sock) continue
    try {
      const { telefones, ja_conferidos, posicao } = await nodri('?acao=resolver-lids', {
        method: 'POST', body: JSON.stringify({ salao_id: salaoId }),
      })
      if (!telefones?.length) continue

      // onWhatsApp e o sentido que o WhatsApp aceita: telefone -> id.
      const jids = telefones.map(t => `${t}@s.whatsapp.net`)
      const res = await s.sock.onWhatsApp(...jids)

      const pares = telefones.map(t => {
        const achado = (res || []).find(r => soNumero(r?.jid) === soNumero(t))
        return { telefone: t, lid: achado?.lid || null }
      })

      const r = await nodri('?acao=guardar-lids', {
        method: 'POST', body: JSON.stringify({ salao_id: salaoId, pares }),
      })
      const comId = pares.filter(p => p.lid).length
      if (comId === 0) {
        esperaAtual = Math.min(esperaAtual * 2, ESPERA_MAX)
      } else {
        esperaAtual = ESPERA_MIN
      }
      registro(salaoId, `telefones: +${telefones.length} conferidos (${ja_conferidos} no total, ` +
        `varredura em ${posicao}), ${comId} com id, ${r?.ligados || 0} ganharam o número` +
        (comId === 0 ? ` — WhatsApp não respondeu, próxima leva em ${Math.round(esperaAtual / 60000)} min` : ''))
    } catch (e) {
      registro(salaoId, 'falha ao cruzar telefones:', e.message)
    }
  }
}

registro(`ligando — NODRI em ${NODRI}, sessões em ${path.resolve(PASTA)}`)
await volta()
setInterval(() => {
  volta().catch(e => registro('erro na volta:', e.message))
  baterRelogio().catch(() => {})
}, CICLO)

// ── Telefone → endereço que existe no WhatsApp ──────────────────────────────
//
// Guarda o que já perguntou (por sessão) para não consultar o WhatsApp a cada
// mensagem. Erro ou demora (5 s) devolve nulo e o envio segue pelo telefone
// como antes -- isto nunca pode travar a fila.
async function enderecoDoTelefone(s, salaoId, telefone) {
  const cache = s.enderecos || (s.enderecos = new Map())
  if (cache.has(telefone)) return cache.get(telefone)
  const candidatos = [telefone]
  // 55 + DDD + 9 + 8 dígitos: conta antiga pode ser o mesmo número sem o 9
  if (telefone.length === 13 && telefone.startsWith('55') && telefone[4] === '9') {
    candidatos.push(telefone.slice(0, 4) + telefone.slice(5))
  }
  let achado = null
  try {
    const res = await Promise.race([
      s.sock.onWhatsApp(...candidatos.map(t => `${t}@s.whatsapp.net`)),
      new Promise((_, rej) => setTimeout(() => rej(new Error('onWhatsApp demorou')), 5000)),
    ])
    const existe = (res || []).find(r => r && r.exists)
    if (existe) {
      achado = existe.lid || existe.jid || null
      if (existe.lid) {
        // O NODRI guarda o LID e da próxima vez já vem na fila.
        nodri('?acao=guardar-lids', {
          method: 'POST', body: JSON.stringify({ salao_id: salaoId, pares: [{ telefone, lid: existe.lid }] }),
        }).catch(() => {})
      }
    }
  } catch (e) {
    registro(salaoId, 'não consegui conferir o endereço de', telefone + ':', e.message)
    return null                                    // sem cache: tenta de novo na próxima
  }
  cache.set(telefone, achado)
  return achado
}

// ── A fila de saida, no seu proprio ritmo ───────────────────────────────────
// `despachando` impede duas voltas ao mesmo tempo: sem isso, um envio lento
// deixaria a volta seguinte pegar a MESMA mensagem e manda-la duas vezes.
let despachando = false
setInterval(async () => {
  if (despachando) return
  despachando = true
  try {
    const conectados = []
    for (const [salaoId, s] of sessoes) {
      if (!s.conectado) continue
      soltarBufferPreso(salaoId, s)
      conectados.push(salaoId)
    }
    if (!conectados.length) return

    // UMA pergunta para todos, em vez de uma por salão. Ver buscarFilasDeTodos.
    const filas = await buscarFilasDeTodos(conectados)
    for (const salaoId of conectados) {
      const fila = filas[salaoId]
      if (fila?.length) await despacharFila(salaoId, fila)
    }
  } catch (e) {
    registro('erro ao despachar:', e.message)
  } finally { despachando = false }
}, CICLO_FILA)

process.on('SIGINT', async () => {
  registro('encerrando...')
  for (const [, s] of sessoes) { try { s.sock?.end() } catch {} }
  process.exit(0)
})
