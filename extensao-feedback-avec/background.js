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

/**
 * Navega e espera a página NOVA carregar. `chrome.tabs.update` volta antes
 * de a navegação começar, e `esperarCarregar` via a página VELHA já em
 * "complete" -- aí a pergunta seguinte era respondida pelo documento antigo,
 * que estava morrendo. Aqui se espera o evento de carregamento desta
 * navegação, com um teto para não travar se o Avec engasgar.
 */
function navegar(abaId, url, ms = 45000) {
  return new Promise(resolve => {
    let pronto = false
    const encerrar = (ok) => {
      if (pronto) return
      pronto = true
      clearTimeout(fim)
      chrome.tabs.onUpdated.removeListener(ouvir)
      resolve(ok)
    }
    const fim = setTimeout(() => encerrar(false), ms)
    const ouvir = (id, info) => {
      if (id === abaId && info.status === 'complete') encerrar(true)
    }
    chrome.tabs.onUpdated.addListener(ouvir)
    chrome.tabs.update(abaId, { url }).catch(() => encerrar(false))
  })
}

// ── O grupo "NODRI robô" ────────────────────────────────────────────────────
//
// 26/09/2026: o Chrome da recepção tinha ~20 abas do Avec abertas. A aba de
// trabalho se perdia (Chrome reiniciado às 06:00 troca o número de todas as
// abas; página de erro de rede sai do endereço do Avec) e a extensão abria
// outra, sem nunca fechar a velha -- que o Chrome recarregava e deixava no
// admin do Avec, onde a limpeza não olhava. Agora a aba de trabalho mora num
// grupo de abas próprio, recolhido. O grupo sobrevive ao reinício do Chrome,
// então a extensão sempre reconhece a SUA aba, reaproveita e fecha as sobras
// -- sem encostar nas abas do Avec que a recepção usa, que ficam fora dele.
const GRUPO = 'NODRI robô'

async function gruposNodri() {
  try { return (await chrome.tabGroups.query({ title: GRUPO })).map(g => g.id) } catch { return [] }
}

async function abasDoGrupo() {
  const grupos = await gruposNodri()
  if (!grupos.length) return []
  const abas = await chrome.tabs.query({})
  return abas.filter(t => grupos.includes(t.groupId))
}

/** Põe a aba no grupo (cria o grupo se não existir) e deixa recolhido. */
async function guardarNoGrupo(abaId) {
  try {
    const aba = await infoDaAba(abaId)
    if (!aba) return
    const grupos = await gruposNodri()
    if (grupos.includes(aba.groupId)) return
    const alvo = grupos.length
      ? (await chrome.tabGroups.get(grupos[0]))
      : null
    const gid = await chrome.tabs.group(alvo && alvo.windowId === aba.windowId
      ? { tabIds: [abaId], groupId: alvo.id }
      : { tabIds: [abaId] })
    await chrome.tabGroups.update(gid, { title: GRUPO, color: 'grey', collapsed: true })
  } catch { /* sem permissão de grupo (versão antiga): segue sem grupo */ }
}

/** A aba de trabalho: a mesma de sempre, a do grupo, ou uma nova se sumiu. */
async function abaDeTrabalho(url) {
  const { abaId } = await guardado()
  const grupos = await gruposNodri()
  if (abaId) {
    const existe = await infoDaAba(abaId)
    // A aba vale mesmo fora do admin: com a sessão vencida o Avec joga a aba
    // para www.avec.app, e exigir o endereço do admin aqui abria uma aba NOVA a
    // cada ciclo (uma a cada 30 s) enquanto a antiga ficava lá, parada.
    // Dentro do grupo ela vale em qualquer endereço (página de erro de rede
    // inclusive): o grupo prova que é nossa.
    if (existe && (grupos.includes(existe.groupId) || /avec\.(beauty|app)/.test(String(existe.url || '')))) {
      await guardarNoGrupo(abaId)
      await navegar(abaId, url)
      return abaId
    }
  }
  // O número guardado não serve mais (Chrome reiniciou): adota a aba do grupo.
  const doGrupo = (await abasDoGrupo())[0]
  if (doGrupo) {
    await chrome.storage.local.set({ abaId: doGrupo.id })
    await navegar(doGrupo.id, url)
    return doGrupo.id
  }
  const nova = await chrome.tabs.create({ url, active: false })
  await chrome.storage.local.set({ abaId: nova.id })
  await saude({ aba_nova: { em: new Date().toISOString(), antiga: abaId || null } })
  await guardarNoGrupo(nova.id)
  await esperarCarregar(nova.id)
  return nova.id
}

/**
 * "Fechar abas extras" clicado no NODRI: fecha TODA aba do Avec, menos a de
 * trabalho e a que está na frente da recepção (aba ativa de cada janela) --
 * essa pode ter um agendamento pela metade. Fixadas também ficam.
 */
async function fecharAbasExtrasDoAvec() {
  try {
    const { abaId } = await guardado()
    const abas = await chrome.tabs.query({ url: ['https://admin.avec.beauty/*', 'https://www.avec.app/*', 'https://avec.app/*'] })
    const fechar = abas.filter(t => t.id !== abaId && !t.active && !t.pinned).map(t => t.id)
    if (fechar.length) await chrome.tabs.remove(fechar)
    await saude({ limpeza: { em: new Date().toISOString(), fechadas: fechar.length } })
  } catch { /* segue */ }
}

/** Quantas abas do Avec o Chrome tem abertas (vai para o painel do NODRI). */
async function contarAbasAvec() {
  try {
    const abas = await chrome.tabs.query({ url: ['https://admin.avec.beauty/*', 'https://www.avec.app/*', 'https://avec.app/*'] })
    return abas.length
  } catch { return -1 }
}

/**
 * Sessão vencida não cai na tela de login: o Avec manda a aba para
 * www.avec.app, o site público, onde a extensão não roda. O content script não
 * responde, e o ciclo morria em "A aba do Avec não respondeu" (18/09/2026,
 * o dia inteiro). Aqui se olha o ENDEREÇO da aba: fora do admin é deslogado.
 */
async function foraDoAdmin(abaId) {
  const aba = await new Promise(res => chrome.tabs.get(abaId, t => res(chrome.runtime.lastError ? null : t)))
  const url = String(aba?.url || '')
  return !url.startsWith(AVEC)
}

async function infoDaAba(abaId) {
  return new Promise(res => chrome.tabs.get(abaId, t => res(chrome.runtime.lastError ? null : t)))
}

/**
 * Depois de clicar em "Acessar conta": espera a tela de login SAIR DO LUGAR.
 *
 * Era uma pausa fixa de 2,5 s. O Avec leva mais que isso para validar e
 * redirecionar, e a extensão perguntava cedo demais, via o campo de senha
 * ainda na tela e concluía "não aceitou o login" -- e no ciclo seguinte
 * fazia tudo de novo (18/09/2026). Agora pergunta a cada segundo, por até
 * 40 s, e só desiste quando a tela de login continua lá com todo esse tempo
 * -- aí é senha errada, código por SMS ou captcha, e o aviso que o próprio
 * Avec escreveu na tela vai junto no erro.
 */
async function esperarSairDoLogin(abaId, ms = 60000) {
  const fim = Date.now() + ms
  let ultimo = null
  // 26/09/2026: "saiu do login" numa única olhada podia ser a página no meio
  // da troca (sem campo de senha ainda desenhado). Agora precisa de DUAS
  // olhadas seguidas, com a página carregada, fora da tela de login.
  let seguidas = 0
  while (Date.now() < fim) {
    await sleep(1000)
    const aba = await infoDaAba(abaId)
    if (!aba) throw new Error('A aba do Avec foi fechada no meio do login')
    if (aba.status !== 'complete') { seguidas = 0; continue }
    const onde = await perguntar(abaId, { tipo: 'onde-estou' })
    if (onde) {
      ultimo = onde
      if (!onde.login) {
        seguidas++
        if (seguidas >= 2) return onde
        await sleep(1500)
      } else seguidas = 0
      continue
    }
    seguidas = 0
    // Sem resposta do content script: ou a página está trocando (normal), ou
    // o Avec mandou para fora do admin (site público) -- aí não entrou.
    const url = String(aba.url || '')
    if (url && !url.startsWith(AVEC) && !/avec\.beauty/.test(url)) {
      throw new Error('Depois de entrar, o Avec mandou para ' + url.slice(0, 80))
    }
  }
  throw new Error(ultimo?.erro
    ? 'O Avec não aceitou o login: ' + ultimo.erro
    : 'A tela de login não saiu do lugar em 60 s (senha errada, código por SMS ou captcha?)')
}

/**
 * Entra no Avec (se precisar) e chega na página pedida, com paciência.
 *
 * 26/09/2026, pedido do dono: com o Avec instável, depois de "Acessar conta"
 * o sistema ainda está abrindo quando a extensão já pula para o relatório --
 * o Avec devolve a tela de login e o ciclo morria em "Continuou na tela de
 * login depois de entrar". Agora, depois de entrar:
 *   1) espera o painel do Avec assentar (5 s além do carregamento);
 *   2) vai à página pedida e pergunta com mais paciência;
 *   3) se o Avec ainda devolver o login, espera mais (5, 10, 15 s) e tenta a
 *      página de novo -- é a sessão terminando de se firmar, não senha errada;
 *   4) só depois de três voltas faz o login inteiro mais uma vez, e só então
 *      desiste com o erro.
 */
async function chegarLogado(abaId, cfg, dados, url) {
  for (let login = 1; login <= 2; login++) {
    await saude({ texto: login === 1 ? 'Avec deslogado — entrando de novo…' : 'Avec ainda na tela de login — entrando mais uma vez…' })
    await entrarNoAvec(abaId, cfg, dados)
    await sleep(5000)
    for (let volta = 1; volta <= 3; volta++) {
      await navegar(abaId, url)
      await esperarCarregar(abaId)
      let onde = await perguntarComPaciencia(abaId, { tipo: 'onde-estou' }, 15)
      if (!onde && await foraDoAdmin(abaId)) onde = { login: true, fora: true }
      if (onde && !onde.login) return onde
      await saude({ texto: `Entrou, mas o Avec ainda não abriu a página (tentativa ${volta} de 3)…` })
      await sleep(5000 * volta)
    }
  }
  throw new Error('Continuou na tela de login depois de entrar (duas vezes, com espera)')
}

async function entrarNoAvec(abaId, cfg, dados) {
  if (!dados.email || !dados.senha) throw new Error('Avec deslogado e sem e-mail/senha nas opções da extensão')
  const urlLogin = urlAvec(cfg.url_login, '')
  if (!urlLogin) throw new Error('Avec deslogado e sem endereço de login configurado no NODRI')
  // 1) o endereço de login, e espera a tela carregar de verdade
  await navegar(abaId, urlLogin)
  await sleep(1500)
  // 2) e-mail, senha e o botão -- o content script faz os três
  const r = await perguntarComPaciencia(abaId, { tipo: 'logar', email: dados.email, senha: dados.senha }, 12)
  if (!r || !r.ok) throw new Error(r?.erro || 'A tela de login não respondeu')
  await saude({ texto: 'Entrando no Avec — esperando a tela de login sair…' })
  // 3) a pausa de verdade: até a tela de login ir embora
  await esperarSairDoLogin(abaId)
  // 4) a página inicial assenta antes de ir ao relatório
  await sleep(2000)
  await esperarCarregar(abaId)
}

/**
 * As abas que sobraram. A versão 1.0 abria uma aba nova a cada ciclo quando o
 * Avec jogava a de trabalho para o site público -- em 18/09/2026 a recepção
 * amanheceu com dezenas de abas "avec.app". Fecha as que estão no site
 * público E não são a aba ativa: ninguém trabalha no site público do Avec, e
 * a aba de trabalho é uma só.
 */
async function fecharAbasSobrando() {
  try {
    const { abaId } = await guardado()
    const abas = await chrome.tabs.query({ url: ['https://www.avec.app/*', 'https://avec.app/*'] })
    const fechar = abas.filter(t => t.id !== abaId && !t.active && !t.pinned).map(t => t.id)
    // Dentro do grupo "NODRI robô" só pode existir UMA aba: a de trabalho.
    // Se o número guardado se perdeu, a primeira do grupo vira a de trabalho.
    const grupo = await abasDoGrupo()
    const manter = grupo.some(t => t.id === abaId) ? abaId : grupo[0]?.id
    for (const t of grupo) if (t.id !== manter && !t.active && !fechar.includes(t.id)) fechar.push(t.id)
    if (fechar.length) await chrome.tabs.remove(fechar)
  } catch { /* sem permissão ou sem aba: segue */ }
}

let rodando = false

async function ciclo() {
  if (rodando) return
  rodando = true
  const dados = await guardado()
  try {
    if (!dados.chave) { await saude({ texto: 'Sem chave: cole a chave do NODRI nas opções.' }); return }
    await fecharAbasSobrando()

    const cfg = await nodri('/api/crm/automacao/extensao', {
      method: 'GET',
      headers: {
        'x-nodri-abas': String(await contarAbasAvec()),
        'x-nodri-versao': chrome.runtime.getManifest().version,
      },
    }, dados.chave)
    if (cfg.limpar_abas) await fecharAbasExtrasDoAvec()
    await reagendar(cfg.intervalo_seg)

    // ── A tarefa da vez ─────────────────────────────────────────────────────
    // O NODRI é quem tem o relógio. Se ele mandou uma tarefa, ela vem primeiro
    // -- confirmação e aviso ao profissional são mais urgentes que o feedback.
    if (cfg.tarefa) {
      await executarTarefa(cfg, dados)
      return
    }

    if (!cfg.ligada) { await saude({ texto: 'Automação desligada no NODRI. Nada a fazer.', erro: null }); return }

    const urlRel = urlAvec(cfg.url_relatorio, AVEC + 'admin/relatorio/0051')
    const abaId = await abaDeTrabalho(urlRel)
    await esperarCarregar(abaId)

    let onde = await perguntarComPaciencia(abaId, { tipo: 'onde-estou' })
    if (!onde && await foraDoAdmin(abaId)) onde = { login: true, fora: true }
    if (!onde) throw new Error('A aba do Avec não respondeu (página não carregou?)')
    if (onde.login) onde = await chegarLogado(abaId, cfg, dados, urlRel)

    const lido = await lerComSegundaChance(abaId, cfg.hoje)
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

// ─────────────────────────────────────────────────────────────────────────────
// AS OUTRAS TAREFAS
//
// A extensão não decide nada: o NODRI manda `cfg.tarefa` dizendo o que fazer,
// em que data e com quais status. Aqui só se executa e se devolve o resultado.
// ─────────────────────────────────────────────────────────────────────────────

async function prepararAba(cfg, dados, url) {
  const abaId = await abaDeTrabalho(url)
  await esperarCarregar(abaId)
  let onde = await perguntarComPaciencia(abaId, { tipo: 'onde-estou' })
  if (!onde && await foraDoAdmin(abaId)) onde = { login: true, fora: true }
  if (!onde) throw new Error('A aba do Avec não respondeu')
  if (onde.login) await chegarLogado(abaId, cfg, dados, url)
  return abaId
}

/**
 * Lê o 0051; se a tela não estava pronta, recarrega e tenta UMA vez mais.
 * Às 17:01 de 18/09/2026 o Avec demorou a montar os campos de data e a
 * leitura voltou "não achei os campos" -- sem segunda chance, o disparo de
 * confirmação do dia inteiro morreu nessa volta.
 */
async function lerComSegundaChance(abaId, data) {
  let lido = await perguntarComPaciencia(abaId, { tipo: 'ler-0051', data }, 3)
  if (lido && lido.ok) return lido
  await saude({ texto: 'O relatório não estava pronto — recarregando para tentar de novo…' })
  const aba = await infoDaAba(abaId)
  await navegar(abaId, String(aba?.url || AVEC + 'admin/relatorio/0051'))
  await sleep(3000)
  lido = await perguntarComPaciencia(abaId, { tipo: 'ler-0051', data }, 3)
  return lido
}

async function executarTarefa(cfg, dados) {
  const t = cfg.tarefa
  try {
    // ── Campanha: ler o relatório de um dia e devolver as linhas ────────────
    if (t.tipo === 'campanha') {
      const url = urlAvec(t.url_relatorio || cfg.url_relatorio, AVEC + 'admin/relatorio/0051')
      const abaId = await prepararAba(cfg, dados, url)
      const lido = await lerComSegundaChance(abaId, t.data)
      if (!lido || !lido.ok) throw new Error(lido?.erro || 'Não consegui ler o relatório')

      const r = await nodri('/api/crm/automacao/extensao', {
        method: 'POST',
        body: JSON.stringify({
          campanha_id: t.campanha_id, linhas: lido.linhas,
          horario_cumprido: t.horario_cumprido || undefined,
        }),
      }, dados.chave)
      // Quando nada sai, a tela tem que dizer POR QUE. "enfileirou 0" sozinho
      // vira "não funciona" e alguém perde uma hora procurando.
      let porque = ''
      if (!r.enviadas && r.elegiveis) {
        if (r.sem_telefone) {
          porque = ` — ${r.sem_telefone} sem telefone no cadastro`
          if (r.sem_cadastro && r.sem_cadastro.length) porque += `: ${r.sem_cadastro.slice(0, 4).join(', ')}`
        } else {
          porque = ' — todos já receberam hoje'
        }
      }
      await saude({
        texto: `${t.nome}: ${lido.linhas.length} linha(s) de ${t.data}; ${r.elegiveis || 0} no filtro; enfileirou ${r.enviadas || 0}${porque}.`,
        lidas: r.lidas, elegiveis: r.elegiveis, enviadas: r.enviadas, erro: r.erro || null,
      })
      return
    }

    // ── Marcar Confirmado no Avec ───────────────────────────────────────────
    if (t.tipo === 'confirmar_avec') {
      const url = urlAvec(t.url_relatorio || cfg.url_relatorio, AVEC + 'admin/relatorio/0051')
      const abaId = await prepararAba(cfg, dados, url)

      // 1) achar pela PLANILHA (telefone é único; o quadro pagina e corta nome)
      //
      // Amanhã primeiro (é o dia da confirmação automática); não achou, hoje.
      // A recepção manda confirmação do MESMO dia pelo celular ("18/09 às
      // 17:00"), a cliente responde "confirmo", e a extensão procurava só em
      // amanhã: "Não achei o agendamento dela em 19/09" (18/09/2026, 13:38).
      // Cancelado não conta: se o único agendamento dela está cancelado, não
      // há o que confirmar.
      const so = s => String(s || '').replace(/\D+/g, '').replace(/^55/, '').replace(/^(\d{2})9(\d{8})$/, '$1$2')
      const alvo = so(t.telefone)
      const valida = l => so(l.celular) === alvo && !/cancelad|faltou/i.test(l.status || '')
      const datas = [...new Set([t.data, cfg.amanha, cfg.hoje].filter(Boolean))]
      let linha = null
      for (const data of datas) {
        const lido = await lerComSegundaChance(abaId, data)
        if (!lido || !lido.ok) throw new Error(lido?.erro || 'Não consegui ler o relatório')
        linha = (lido.linhas || []).find(valida)
        if (linha) break
      }
      if (!linha) throw new Error('Não achei agendamento dela em ' + datas.join(' nem '))
      if (/confirmad/i.test(linha.status || '')) {
        // Já estava confirmado: para o NODRI isso é sucesso, e a cliente recebe
        // o retorno do mesmo jeito.
        await nodri('/api/crm/automacao/extensao', {
          method: 'POST',
          body: JSON.stringify({ pedido_id: t.pedido_id, marcado: true, data: linha.data, hora: linha.hora, profissional: linha.profissional }),
        }, dados.chave)
        await saude({ texto: `Confirmação: ${linha.cliente} já estava confirmada.`, erro: null })
        return
      }

      // 2) ir à agenda daquele dia e marcar
      const urlAgenda = AVEC + 'admin/agenda'
      await navegar(abaId, urlAgenda)
      await sleep(2000)
      const marcou = await perguntarComPaciencia(abaId, {
        tipo: 'marcar-confirmado',
        data: linha.data, hora: linha.hora,
        profissional: linha.profissional, telefone: t.telefone,
      }, 3)

      await nodri('/api/crm/automacao/extensao', {
        method: 'POST',
        body: JSON.stringify({
          pedido_id: t.pedido_id, marcado: !!(marcou && marcou.ok),
          erro: marcou && marcou.ok ? null : (marcou?.erro || 'A agenda não respondeu'),
          data: linha.data, hora: linha.hora, profissional: linha.profissional,
        }),
      }, dados.chave)

      await saude({
        texto: marcou?.ok
          ? `Confirmado no Avec: ${linha.cliente} ${linha.data} ${linha.hora}.`
          : `Não consegui confirmar ${linha.cliente}: ${marcou?.erro || 'sem resposta'}`,
        erro: marcou?.ok ? null : (marcou?.erro || 'sem resposta'),
      })
      return
    }

    await saude({ texto: 'Tarefa desconhecida: ' + t.tipo, erro: null })
  } catch (e) {
    const msg = String(e?.message || e)
    await saude({ texto: `Falhou em "${t.nome || t.tipo}".`, erro: msg })
    try {
      await nodri('/api/crm/automacao/extensao', {
        method: 'POST',
        body: JSON.stringify(
          t.tipo === 'confirmar_avec'
            ? { pedido_id: t.pedido_id, marcado: false, erro: msg }
            : { campanha_id: t.campanha_id, linhas: [], erro: msg, horario_cumprido: t.horario_cumprido || undefined },
        ),
      }, dados.chave)
    } catch { /* sem rede: fica no painel da extensão */ }
  }
}
