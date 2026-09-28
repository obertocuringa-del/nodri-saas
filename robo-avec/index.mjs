// ─────────────────────────────────────────────────────────────────────────────
// ROBÔ DO AVEC — roda no servidor NODRI (pm2 "robo-avec", dentro do xvfb-run)
//
// Um Chrome por salão, cada um com a SUA pasta de perfil (cookies, login do
// Avec, abas): um salão não enxerga o outro. Todos usam a MESMA pasta da
// extensão (extensao-feedback-avec) -- atualizar a extensão é trocar essa
// pasta uma vez; o robô percebe a versão nova e reabre os Chromes.
//
// A cada minuto pergunta ao NODRI (/api/crm/robo, chave de serviço) quais
// salões estão com "rodar no servidor" ligado:
//   - salão novo na lista  -> cria o perfil, abre o Chrome, grava na extensão
//                              a chave do salão, o login do Avec e origem=servidor;
//   - login/chave mudou     -> grava de novo (o dono salvou outra senha na tela);
//   - salão saiu da lista   -> fecha o Chrome dele;
//   - Chrome caiu           -> abre de novo na volta seguinte.
//
// O robô não lê o Avec nem decide nada: quem faz isso é a extensão, igual ao
// computador do salão. Ele só mantém os Chromes de pé e configurados.
// ─────────────────────────────────────────────────────────────────────────────

import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const NODRI = process.env.NODRI_URL || 'https://www.nodri.com.br'
const CHAVE = process.env.CRM_PONTE_CHAVE || ''
const EXT = process.env.ROBO_EXTENSAO || '/home/nodri/robo/extensao'
const PERFIS = process.env.ROBO_PERFIS || '/home/nodri/robo/perfis'
const VOLTA_MS = 60_000

/** salao_id -> { browser, assinatura, versao, extId, nome } */
const abertos = new Map()

const log = (...a) => console.log(new Date().toLocaleTimeString('pt-BR'), '[robo]', ...a)
const sleep = ms => new Promise(r => setTimeout(r, ms))

function versaoDaExtensao() {
  return JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8')).version
}

function assinatura(s) {
  return crypto.createHash('sha256').update([s.chave, s.email, s.senha].join('\n')).digest('hex')
}

async function listarSaloes() {
  const r = await fetch(NODRI + '/api/crm/robo', { headers: { 'x-crm-chave': CHAVE }, cache: 'no-store' })
  if (!r.ok) throw new Error('NODRI respondeu ' + r.status)
  return (await r.json()).saloes || []
}

/** O id da extensão sai do endereço do service worker dela. */
async function idDaExtensao(browser) {
  const alvo = await browser.waitForTarget(
    t => t.type() === 'service_worker' && /^chrome-extension:\/\/[a-p]{32}\/background\.js$/.test(t.url()),
    { timeout: 30_000 })
  return new URL(alvo.url()).host
}

/**
 * Grava chave, login e origem na extensão e pede uma volta agora. Pela página
 * de opções da própria extensão (tem chrome.storage), que não dorme como o
 * service worker.
 */
async function configurar(aberto, s) {
  const pag = await aberto.browser.newPage()
  try {
    await pag.goto(`chrome-extension://${aberto.extId}/opcoes.html`, { waitUntil: 'load', timeout: 30_000 })
    await pag.evaluate(async d => {
      await chrome.storage.local.set(d)
      try { await chrome.runtime.sendMessage({ tipo: 'rodar-agora' }) } catch { /* sem ouvinte ainda */ }
    }, { chave: s.chave, email: s.email, senha: s.senha, origem: 'servidor' })
  } finally {
    await pag.close().catch(() => {})
  }
}

/** Porta estável por salão (9300-9799), sem colidir com outro salão aberto. */
function portaDoSalao(id) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const usadas = new Set()
  for (const d of fs.existsSync(PERFIS) ? fs.readdirSync(PERFIS) : []) {
    if (d === id) continue
    try { usadas.add(Number(fs.readFileSync(path.join(PERFIS, d, 'porta'), 'utf8'))) } catch { /* sem porta */ }
  }
  let p = 9300 + (h % 500)
  while (usadas.has(p)) p = 9300 + ((p - 9300 + 1) % 500)
  return p
}

async function abrir(s) {
  const dir = path.join(PERFIS, s.salao_id)
  fs.mkdirSync(dir, { recursive: true })
  // Chrome que morreu de mau jeito deixa a trava do perfil para trás.
  for (const f of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
    try { fs.rmSync(path.join(dir, f), { force: true }) } catch { /* segue */ }
  }
  // Porta fixa por salão: o robô do RELATÓRIO (robo-relatorio/) se conecta a
  // ESTE Chrome, numa aba própria, aproveitando o login do Avec (28/09/2026).
  // Só escuta em 127.0.0.1 -- de fora do servidor ninguém alcança.
  const porta = portaDoSalao(s.salao_id)
  fs.writeFileSync(path.join(dir, 'porta'), String(porta))
  const browser = await puppeteer.launch({
    headless: false,                 // tela virtual do xvfb-run: o Avec vê um Chrome normal
    userDataDir: dir,
    enableExtensions: [EXT],
    defaultViewport: null,
    args: [
      '--no-first-run', '--no-default-browser-check', '--disable-dev-shm-usage',
      '--lang=pt-BR', '--window-size=1366,900', '--disable-features=Translate',
      '--disable-session-crashed-bubble', '--hide-crash-restore-bubble',
      `--remote-debugging-port=${porta}`, '--remote-debugging-address=127.0.0.1',
    ],
  })
  const extId = await idDaExtensao(browser)
  const aberto = { browser, assinatura: '', versao: versaoDaExtensao(), extId, nome: s.nome }
  browser.on('disconnected', () => {
    if (abertos.get(s.salao_id) === aberto) {
      abertos.delete(s.salao_id)
      log(`${s.nome}: Chrome fechou -- reabre na próxima volta`)
    }
  })
  abertos.set(s.salao_id, aberto)
  log(`${s.nome}: Chrome aberto (extensão ${aberto.versao}, perfil ${dir})`)
  return aberto
}

async function fechar(salaoId, motivo) {
  const a = abertos.get(salaoId)
  if (!a) return
  abertos.delete(salaoId)
  await a.browser.close().catch(() => {})
  log(`${a.nome}: Chrome fechado (${motivo})`)
}

async function volta() {
  const saloes = await listarSaloes()
  const versao = versaoDaExtensao()
  const ids = new Set(saloes.map(s => s.salao_id))

  for (const id of [...abertos.keys()]) {
    if (!ids.has(id)) await fechar(id, 'desligado no NODRI')
    else if (abertos.get(id).versao !== versao) await fechar(id, `extensão nova ${versao}`)
  }

  for (const s of saloes) {
    try {
      const a = abertos.get(s.salao_id) || await abrir(s)
      const ass = assinatura(s)
      if (a.assinatura !== ass) {
        await configurar(a, s)
        a.assinatura = ass
        log(`${s.nome}: extensão configurada (chave + login do Avec)`)
      }
    } catch (e) {
      log(`${s.nome}: falhou -- ${e?.message || e}`)
      await fechar(s.salao_id, 'erro ao abrir')
    }
  }
}

async function principal() {
  if (!CHAVE) { log('sem CRM_PONTE_CHAVE no ambiente -- parado'); process.exit(1) }
  log(`ligado; extensão ${versaoDaExtensao()} em ${EXT}`)
  for (;;) {
    try { await volta() } catch (e) { log('volta falhou:', e?.message || e) }
    await sleep(VOLTA_MS)
  }
}

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, async () => {
    for (const id of [...abertos.keys()]) await fechar(id, 'robô desligando')
    process.exit(0)
  })
}

principal()
