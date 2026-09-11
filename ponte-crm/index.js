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
  USyncQuery,
  USyncUser,
} from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import pino from 'pino'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const NODRI   = (process.env.NODRI_URL || 'https://www.nodri.com.br').replace(/\/+$/, '')
const CHAVE   = process.env.CRM_PONTE_CHAVE || ''
const PASTA   = process.env.CRM_SESSOES_DIR || './sessoes'
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
      lid: temTelefone ? null : jid,
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

    const { signedUrl, publicUrl } = await nodri('?acao=midia-url', {
      method: 'POST',
      body: JSON.stringify({ salao_id: salaoId, nome }),
    })
    const r = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'content-type': mime, 'x-upsert': 'true' },
      body: buffer,
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
  const registroSessao = { sock: null, salaoId, conectado: false, fechando: false }
  sessoes.set(salaoId, registroSessao)

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
    // O WhatsApp manda o historico em lotes e o Baileys pode descartar alguns
    // conforme o tipo. Dizer explicitamente que queremos TODOS evita o caso em
    // que o pareamento ocorre, a conexao abre e nao chega conversa nenhuma --
    // que foi exatamente o que aconteceu com o numero do salao.
    shouldSyncHistoryMessage: () => true,
    markOnlineOnConnect: false,   // não rouba as notificações do celular
  })

  registroSessao.sock = sock

  sock.ev.on('creds.update', saveCreds)

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
        const tel = ehTelefone(bruto) ? bruto : (deMim ? null : (m.key?.senderPn || null))
        const lid = ehLid(bruto) ? bruto : null
        if (!tel && !lid) continue

        const texto = textoDaMensagem(m)
        const tipo = tipoDaMensagem(m)
        if (!texto && tipo === 'texto') continue       // evento vazio

        // A foto que a cliente mandou vira foto na tela, não "[imagem]". Sem
        // isso, quem abre o CRM tem que pegar o celular para ver o cabelo que
        // ela mandou — e aí o CRM virou um passo a mais, não um a menos.
        const midia = tipo === 'texto' ? null : await guardarMidia(salaoId, m, tipo)

        await nodri('?acao=entrada', {
          method: 'POST',
          body: JSON.stringify({
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
          }),
        })
        registro(salaoId, deMim ? 'saída para' : 'entrada de', soNumero(tel || lid), '—', texto.slice(0, 40))
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
  try { await s.sock?.logout() } catch {}
  try { s.sock?.end() } catch {}
  sessoes.delete(salaoId)
  fs.rmSync(path.join(PASTA, salaoId), { recursive: true, force: true })
  registro(salaoId, 'sessão encerrada')
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

async function despacharFila(salaoId) {
  const s = sessoes.get(salaoId)
  if (!s?.conectado || !s.sock) return

  let fila = []
  try {
    fila = (await nodri(`?salao=${salaoId}`)).fila || []
  } catch (e) {
    registro(salaoId, 'falha ao buscar a fila:', e.message)
    return
  }

  for (const msg of fila) {
    try {
      // Endereco de envio: telefone quando existe, senao o proprio LID --
      // que e um endereco valido do WhatsApp e o unico que temos para quem
      // veio do historico de uma conta nova.
      const jid = msg.telefone ? `${msg.telefone}@s.whatsapp.net` : msg.lid
      if (!jid) { registro(salaoId, 'mensagem sem endereço de destino — pulada'); continue }
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

  const querem = new Set(canais.map(c => c.salao_id))

  // O NODRI parou de entregar um salao que esta aberto aqui: outra ponte pegou
  // a posse. Fechar e o certo -- duas conexoes no mesmo numero se derrubam --
  // mas em silencio isso vira "o WhatsApp caiu sozinho", entao fica dito.
  for (const salaoId of sessoes.keys()) {
    if (!querem.has(salaoId)) {
      // Duas causas possiveis e nao da para distinguir daqui: o salao clicou
      // em Desconectar, ou outra ponte pegou a posse. Dizer as duas e melhor
      // que chutar uma -- na primeira versao eu afirmava "outra ponte assumiu"
      // e o log acusava um culpado que nao existia.
      registro(salaoId, 'saiu da lista do NODRI — desconectado pelo salão, ou outra ponte assumiu. Rode a ponte em UM computador só.')
    }
  }

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

async function resolverPorTelefone() {
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

// ── A fila de saida, no seu proprio ritmo ───────────────────────────────────
// `despachando` impede duas voltas ao mesmo tempo: sem isso, um envio lento
// deixaria a volta seguinte pegar a MESMA mensagem e manda-la duas vezes.
let despachando = false
setInterval(async () => {
  if (despachando) return
  despachando = true
  try {
    for (const [salaoId, s] of sessoes) {
      if (s.conectado) await despacharFila(salaoId)
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
