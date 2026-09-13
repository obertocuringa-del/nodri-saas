// ─────────────────────────────────────────────────────────────────────────────
// SERVICE WORKER — o relógio da automação de feedback.
//
// De tempos em tempos (o NODRI diz de quanto em quanto): pergunta ao NODRI se
// a automação está ligada, garante UMA aba do Avec em segundo plano, manda o
// avec.js ler o relatório do dia e entrega as linhas ao NODRI. Quem decide a
// quem mandar mensagem é o NODRI; aqui não há regra de negócio.
//
// ── A aba é uma só ─────────────────────────────────────────────────────────
//
// Não se abre uma aba por ciclo: a primeira volta cria uma aba de trabalho
// (fora de foco) e as seguintes só recarregam essa mesma. Se alguém fechar,
// a próxima volta abre outra. A aba que a recepção usa não é tocada.
//
// ── Se o Avec deslogou ─────────────────────────────────────────────────────
//
// O avec.js reconhece a tela de login. Aí este arquivo manda entrar com o
// e-mail e a senha que o dono digitou nas opções da extensão -- guardados só
// neste computador -- e volta para o relatório. Se o login falhar (senha
// errada, código por SMS, captcha), o ciclo termina com o motivo escrito e a
// tela do NODRI mostra "Erro: …" em vez de fingir que está tudo bem.
// ─────────────────────────────────────────────────────────────────────────────

const NODRI = 'https://www.nodri.com.br'
const AVEC = 'https://admin.avec.beauty/'
const ALARME = 'nodri-feedback'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function guardado() {
  return chrome.storage.local.get(['chave', 'email', 'senha', 'abaId', 'ocupado_desde'])
}

async function saude(patch) {
  const { saude: atual } = await chrome.storage.local.get('saude')
  await chrome.storage.local.set({ saude: { ...(atual || {}), em: new Date().toISOString(), ...patch } })
}

/** Só endereço do próprio Avec: a URL vem do painel e um erro lá não pode abrir outro site logado. */
function urlAvec(bruta, padrao) {
  try {
    const u = new URL(String(bruta || ''))
    if (u.protocol === 'https:' && u.hostname.endsWith('avec.beauty')) return u.href
  } catch { /* inválida */ }
  return padrao
}

async function nodri(caminho, opts = {}, chave) {
  const r = await fetch(NODRI + caminho, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-nodri-chave': chave, ...(opts.headers || {}) },
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `NODRI respondeu ${r.status}`)
  return j
}

function perguntar(abaId, msg) {
  return new Promise(resolve => {
    try {
      chrome.tabs.sendMessage(abaId, msg, r => {
        if (chrome.runtime.lastError) return resolve(null)
        resolve(r || null)
      })
    } catch { resolve(null) }
  })
}

function esperarCarregar(abaId, ms = 40000) {
  return new Promise(resolve => {
    const fim = Date.now() + ms
    const ver = () => {
      chrome.tabs.get(abaId, aba => {
        if (chrome.runtime.lastError || !aba) return resolve(false)
        if (aba.status === 'complete') return resolve(true)
        if (Date.now() > fim) return resolve(false)
        setTimeout(ver, 400)
      })
    }
    ver()
  })
}

/** O content script pode não estar pronto logo depois do load; insiste um pouco. */
async function perguntarComPaciencia(abaId, msg, tentativas = 8) {
  for (let i = 0; i < tentativas; i++) {
    const r = await perguntar(abaId, msg)
    if (r) return r
    await sleep(700)
  }
  return null
}

/** A aba de trabalho: a mesma de sempre, ou uma nova se sumiu. */
async function abaDeTrabalho(url) {
  const { abaId } = await guardado()
  if (abaId) {
    const existe = await new Promise(res => chrome.tabs.get(abaId, t => res(chrome.runtime.lastError ? null : t)))
    if (existe && String(existe.url || '').startsWith(AVEC)) {
      await chrome.tabs.update(abaId, { url })
      return abaId
    }
  }
  const nova = await chrome.tabs.create({ url, active: false })
  await chrome.storage.local.set({ abaId: nova.id })
  return nova.id
}

async function entrarNoAvec(abaId, cfg, dados) {
  if (!dados.email || !dados.senha) throw new Error('Avec deslogado e sem e-mail/senha nas opções da extensão')
  const urlLogin = urlAvec(cfg.url_login, '')
  if (!urlLogin) throw new Error('Avec deslogado e sem endereço de login configurado no NODRI')
  await chrome.tabs.update(abaId, { url: urlLogin })
  await esperarCarregar(abaId)
  const r = await perguntarComPaciencia(abaId, { tipo: 'logar', email: dados.email, senha: dados.senha })
  if (!r || !r.ok) throw new Error(r?.erro || 'A tela de login não respondeu')
  // O login redireciona; espera assentar antes de ir ao relatório.
  await sleep(2500)
  await esperarCarregar(abaId)
  const onde = await perguntarComPaciencia(abaId, { tipo: 'onde-estou' })
  if (!onde || onde.login) throw new Error('O Avec não aceitou o login (senha errada, ou pede código/captcha)')
}

let rodando = false

async function ciclo() {
  if (rodando) return
  rodando = true
  const dados = await guardado()
  try {
    if (!dados.chave) { await saude({ texto: 'Sem chave: cole a chave do NODRI nas opções.' }); return }

    const cfg = await nodri('/api/crm/automacao/extensao', { method: 'GET' }, dados.chave)
    await reagendar(cfg.intervalo_seg)
    if (!cfg.ligada) { await saude({ texto: 'Automação desligada no NODRI. Nada a fazer.', erro: null }); return }

    const urlRel = urlAvec(cfg.url_relatorio, AVEC + 'admin/relatorio/0051')
    const abaId = await abaDeTrabalho(urlRel)
    await esperarCarregar(abaId)

    let onde = await perguntarComPaciencia(abaId, { tipo: 'onde-estou' })
    if (!onde) throw new Error('A aba do Avec não respondeu (página não carregou?)')
    if (onde.login) {
      await saude({ texto: 'Avec deslogado — entrando de novo…' })
      await entrarNoAvec(abaId, cfg, dados)
      await chrome.tabs.update(abaId, { url: urlRel })
      await esperarCarregar(abaId)
      onde = await perguntarComPaciencia(abaId, { tipo: 'onde-estou' })
      if (!onde || onde.login) throw new Error('Continuou na tela de login depois de entrar')
    }

    const lido = await perguntarComPaciencia(abaId, { tipo: 'ler-0051', data: cfg.hoje }, 3)
    if (!lido) throw new Error('O relatório não respondeu')
    if (!lido.ok) {
      await nodri('/api/crm/automacao/extensao', { method: 'POST', body: JSON.stringify({ linhas: [], erro: lido.erro }) }, dados.chave)
      throw new Error(lido.erro || 'Não consegui ler o relatório')
    }

    const r = await nodri('/api/crm/automacao/extensao', {
      method: 'POST', body: JSON.stringify({ linhas: lido.linhas }),
    }, dados.chave)
    await saude({
      texto: `OK — ${lido.linhas.length} linha(s) de ${cfg.hoje}; NODRI enfileirou ${r.enviadas || 0}.`,
      lidas: r.lidas, elegiveis: r.elegiveis, enviadas: r.enviadas, erro: r.erro || null,
    })
  } catch (e) {
    const msg = String(e?.message || e)
    await saude({ texto: 'Falhou.', erro: msg })
    // Avisa o NODRI para o dono ver o erro no painel, se a chave existir.
    if (dados.chave) {
      try {
        await nodri('/api/crm/automacao/extensao', { method: 'POST', body: JSON.stringify({ linhas: [], erro: msg }) }, dados.chave)
      } catch { /* sem rede: fica só aqui */ }
    }
  } finally {
    rodando = false
  }
}

async function reagendar(segundos) {
  // O Chrome não aceita alarme abaixo de 30s; o NODRI já limita ao mesmo piso.
  const min = Math.max(0.5, (Number(segundos) || 60) / 60)
  const atual = await chrome.alarms.get(ALARME)
  if (atual && Math.abs((atual.periodInMinutes || 0) - min) < 0.01) return
  await chrome.alarms.create(ALARME, { periodInMinutes: min, delayInMinutes: min })
}

chrome.alarms.onAlarm.addListener(a => { if (a.name === ALARME) ciclo() })
chrome.runtime.onInstalled.addListener(() => { reagendar(60); ciclo() })
chrome.runtime.onStartup.addListener(() => { reagendar(60); ciclo() })
chrome.runtime.onMessage.addListener(msg => {
  if (msg?.tipo === 'rodar-agora') ciclo()
  if (msg?.tipo === 'reagendar') reagendar(60)
})
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage())
