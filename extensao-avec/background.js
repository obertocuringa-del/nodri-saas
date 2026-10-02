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
  // `origem` só é gravada pelo robô do servidor ('servidor'); no computador do
  // salão ela não existe e vale 'salao'.
  return chrome.storage.local.get(['chave', 'email', 'senha', 'abaId', 'ocupado_desde', 'origem'])
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
  // Prazo no fetch: se o NODRI estiver fora do ar ou lento, esta chamada
  // esperava para sempre e levava a volta inteira junto.
  const r = await fetch(NODRI + caminho, {
    ...opts,
    signal: AbortSignal.timeout(25000),
    headers: { 'Content-Type': 'application/json', 'x-nodri-chave': chave, ...(opts.headers || {}) },
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `NODRI respondeu ${r.status}`)
  return j
}

// ── A pergunta que ficava esperando para sempre ─────────────────────────────
//
// 01/10/2026: o salão passou o dia sem feedback, sem confirmação e sem aviso
// ao profissional, com a extensão marcando "vista agora" na tela. A causa
// estava AQUI.
//
// `chrome.tabs.sendMessage` só chama de volta quando a aba responde ou quando
// a porta fecha. Se o content script atende, diz "vou responder depois"
// (devolve true) e morre no meio -- página pesada, recarregou, deu erro --
// a porta NÃO fecha e esta Promise nunca se resolve. Daí para cima trava
// tudo: `perguntarComPaciencia` espera, o ciclo espera, `rodando` nunca
// volta para false, nada é enviado e NADA é registrado -- nem erro, porque
// não se chega ao catch. Por fora parece saúde: o GET de cada volta continua
// saindo e a tela diz "extensão vista agora".
//
// Era a única espera sem prazo do arquivo: esperarCarregar tem 40 s, navegar
// tem 45 s, esperarSairDoLogin tem 60 s. Agora esta tem o dela. Vencido o
// prazo, devolve null -- que é a mesma coisa que a aba já devolvia quando não
// respondia, então todo o código acima continua funcionando igual: tenta de
// novo, e no fim avisa o erro em vez de emudecer.
function perguntar(abaId, msg, ms = 10000) {
  return new Promise(resolve => {
    let fechou = false
    const terminar = (r) => {
      if (fechou) return
      fechou = true
      clearTimeout(prazo)
      resolve(r)
    }
    const prazo = setTimeout(() => terminar(null), ms)
    try {
      chrome.tabs.sendMessage(abaId, msg, r => {
        if (chrome.runtime.lastError) return terminar(null)
        terminar(r || null)
      })
    } catch { terminar(null) }
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

/**
 * O content script pode não estar pronto logo depois do load; insiste um pouco.
 * O `ms` é o prazo de CADA pergunta -- leitura de relatório ganha mais tempo
 * que uma pergunta simples, e nenhuma espera para sempre.
 */
async function perguntarComPaciencia(abaId, msg, tentativas = 8, ms = 10000) {
  for (let i = 0; i < tentativas; i++) {
    const r = await perguntar(abaId, msg, ms)
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

// ── Não recarregar o que já está na tela ────────────────────────────────────
//
// Até 01/10/2026 a aba era RECARREGADA a cada volta, mesmo já estando no
// endereço pedido. Era esse o custo da volta inteira: recarregar o 0051 faz o
// Avec remontar a aplicação do zero -- de 30 s a 3 min --, contra 5 a 15 s da
// leitura em si (escrever as duas datas, clicar Buscar, esperar a tabela).
// Medido no nginx em 01/10: voltas de 39 s a 195 s, com a leitura sendo a
// menor parte.
//
// Isso importa porque o aviso ao profissional tem alguém esperando do outro
// lado: a cliente já está sentada e ele ainda não sabe. Aproveitar a aba que
// já está aberta e logada é o que transforma a volta em segundos.
//
// Duas rédeas, para a página não apodrecer na tela:
//   - a cada 15 minutos ela é recarregada de qualquer jeito (sessão do Avec,
//     memória da aplicação, tela que envelhece);
//   - quem chama ainda pergunta "onde-estou" logo em seguida e cai no caminho
//     do login se a sessão tiver vencido; e `lerComSegundaChance` recarrega a
//     página sozinho se a leitura não vier.
const RECARGA_MS = 15 * 60_000

/** Mesma página? Compara origem e caminho; busca e âncora não contam. */
function mesmaPagina(a, b) {
  try {
    const x = new URL(String(a)), y = new URL(String(b))
    const limpo = p => String(p || '').replace(/\/+$/, '')
    return x.origin === y.origin && limpo(x.pathname) === limpo(y.pathname)
  } catch { return false }
}

async function aproveitaAba(aba, url) {
  if (!aba || aba.status !== 'complete') return false
  if (!mesmaPagina(aba.url, url)) return false
  const { carregadaEm } = await chrome.storage.local.get('carregadaEm')
  return !!carregadaEm && Date.now() - carregadaEm < RECARGA_MS
}

/** Navega e anota a hora, que é o que segura a recarga dos 15 minutos. */
async function navegarEAnotar(abaId, url) {
  const ok = await navegar(abaId, url)
  await chrome.storage.local.set({ carregadaEm: Date.now() })
  return ok
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
      if (await aproveitaAba(existe, url)) return abaId
      await navegarEAnotar(abaId, url)
      return abaId
    }
  }
  // O número guardado não serve mais (Chrome reiniciou): adota a aba do grupo.
  const doGrupo = (await abasDoGrupo())[0]
  if (doGrupo) {
    await chrome.storage.local.set({ abaId: doGrupo.id })
    await navegarEAnotar(doGrupo.id, url)
    return doGrupo.id
  }
  const nova = await chrome.tabs.create({ url, active: false })
  await chrome.storage.local.set({ abaId: nova.id, carregadaEm: Date.now() })
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
      await navegarEAnotar(abaId, url)
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
  await navegarEAnotar(abaId, urlLogin)
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
    const guarda = await guardado()
    const abaId = guarda.abaId
    const abas = await chrome.tabs.query({ url: ['https://www.avec.app/*', 'https://avec.app/*'] })
    const fechar = abas.filter(t => t.id !== abaId && !t.active && !t.pinned).map(t => t.id)
    // Dentro do grupo "NODRI robô" só pode existir UMA aba: a de trabalho.
    // Se o número guardado se perdeu, a primeira do grupo vira a de trabalho.
    const grupo = await abasDoGrupo()
    const manter = grupo.some(t => t.id === abaId) ? abaId : grupo[0]?.id
    for (const t of grupo) if (t.id !== manter && !t.active && !fechar.includes(t.id)) fechar.push(t.id)

    // ── As abas que de fato vazavam ──────────────────────────────────────────
    //
    // 01/10/2026: o Chrome do servidor estava com 23 abas -- quatro cópias do
    // relatório 0051 e catorze em branco. Cada cópia do 0051 é uma página
    // pesada (tabelão, chat do Avec, tutorial) rodando sozinha para sempre.
    // Somadas, comiam 58% do único núcleo do servidor e 41% da memória: as
    // telas do NODRI levavam 3 a 5 segundos para abrir.
    //
    // A limpeza antiga só olhava `avec.app` e o grupo. Mas o relatório mora em
    // `admin.avec.beauty`, e aba em branco não estava em lista nenhuma --
    // então ninguém fechava nem uma nem outra.
    //
    // O cuidado aqui é não encostar nas abas do ROBÔ DO RELATÓRIO, que divide
    // este mesmo Chrome e usa os relatórios 003x. Por isso só se fecha o
    // endereço que é nosso (o relatório da automação) e as abas em branco.
    const nosso = String(guarda.url_relatorio || 'admin.avec.beauty/admin/relatorio/0051')
      .replace(/^https?:\/\//, '')
    const todas = await chrome.tabs.query({})
    for (const t of todas) {
      if (t.id === abaId || t.id === manter || t.active || t.pinned) continue
      if (fechar.includes(t.id)) continue
      const u = String(t.url || '')
      const ehNosso = nosso && u.replace(/^https?:\/\//, '').startsWith(nosso)
      const ehBranco = u === '' || u === 'about:blank'
      if (ehNosso || ehBranco) fechar.push(t.id)
    }
    // Nunca fechar tudo: Chrome sem aba nenhuma se encerra e o robô precisa
    // reabrir o navegador inteiro.
    if (fechar.length >= todas.length) fechar.pop()

    if (fechar.length) await chrome.tabs.remove(fechar)
  } catch { /* sem permissão ou sem aba: segue */ }
}

let rodando = false
let rodandoDesde = 0

// ── Manter o programinha da extensão acordado enquanto a volta corre ────────
//
// Esta é a causa de o salão passar o dia sem mandar nada (01/10/2026).
//
// A extensão não é um programa que fica rodando: o Chrome acorda o
// "service worker" quando o alarme toca e o ENCERRA depois de cerca de 30
// segundos sem chamada de sistema. E esperar uma aba responder, ou dormir
// entre tentativas, NÃO conta como chamada de sistema.
//
// Uma volta de verdade -- abrir a aba, esperar o Avec montar a tabela, ler,
// mandar para o NODRI -- passa fácil desses 30 segundos. Então o Chrome
// matava a extensão no meio do serviço. Sem erro, sem registro, sem aviso:
// de fora parecia tudo bem, porque o alarme seguinte acordava ela de novo,
// ela perguntava ao NODRI o que fazer (o GET que aparecia no registro), e
// morria no mesmo lugar. Era a volta eterna que travou o dia inteiro.
//
// Uma chamada barata a cada 20 segundos reinicia esse relógio e segura a
// extensão de pé até a volta acabar. Para assim que acaba -- fora da volta
// ela continua dormindo, como o Chrome espera.
function manterAcordado() {
  const t = setInterval(() => {
    try { chrome.runtime.getPlatformInfo(() => void chrome.runtime.lastError) } catch { /* segue */ }
  }, 20000)
  return () => clearInterval(t)
}

async function ciclo() {
  // ── A trava que não destravava ────────────────────────────────────────────
  //
  // `rodando` só volta a false no finally lá embaixo. Se a volta anterior
  // ficou pendurada numa espera sem fim (ver `perguntar`), o finally nunca
  // roda e esta extensão fica muda para sempre, sem erro nenhum. O prazo de
  // `perguntar` já resolve a causa; isto aqui é o cinto de segurança: depois
  // de 5 minutos, uma volta que não terminou é dada como perdida e a próxima
  // pode começar. Nenhuma volta honesta chega perto disso.
  if (rodando && Date.now() - rodandoDesde < 5 * 60_000) return
  rodando = true
  rodandoDesde = Date.now()
  const pararDeSegurar = manterAcordado()
  const dados = await guardado()
  try {
    if (!dados.chave) { await saude({ texto: 'Sem chave: cole a chave do NODRI nas opções.' }); return }
    await fecharAbasSobrando()

    const cfg = await nodri('/api/crm/automacao/extensao', {
      method: 'GET',
      headers: {
        'x-nodri-abas': String(await contarAbasAvec()),
        'x-nodri-versao': chrome.runtime.getManifest().version,
        'x-nodri-origem': dados.origem === 'servidor' ? 'servidor' : 'salao',
      },
    }, dados.chave)
    // ── Mandada parar: obedece o ritmo ANTES de dormir ──────────────────────
    //
    // Quem lê o Avec é um só -- o servidor ou o computador do salão, nunca os
    // dois. O que fica de fora recebe "fique parada" aqui. Só que o `return`
    // vinha ANTES do reagendar: a extensão parada continuava perguntando de
    // minuto em minuto, para sempre. Umas 1.400 perguntas por dia que não
    // servem para nada -- e que em 01/10/2026 encheram o registro do servidor
    // e fizeram o diagnóstico de um dia parado apontar para o lugar errado.
    //
    // Agora ela obedece o prazo que o NODRI mandar antes de dormir. O NODRI
    // manda um prazo largo para quem está parada, e o normal para quem
    // trabalha. Virar o interruptor continua acordando a outra em minutos.
    // Guarda o ritmo e o endereço do relatório: a limpeza de abas e o relógio
    // do modo servidor precisam deles ANTES da próxima conversa com o NODRI.
    try {
      await chrome.storage.local.set({
        intervalo_seg: Number(cfg.intervalo_seg) || 60,
        url_relatorio: String(cfg.url_relatorio || ''),
      })
    } catch { /* segue */ }
    await reagendar(cfg.intervalo_seg)
    if (cfg.parada) { await saude({ texto: cfg.parada, erro: null }); return }
    if (cfg.limpar_abas) await fecharAbasExtrasDoAvec()

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
    pararDeSegurar()
    rodando = false
  }
}

async function reagendar(segundos) {
  // O Chrome não aceita alarme abaixo de 30s; o NODRI já limita ao mesmo piso.
  const min = Math.max(0.5, (Number(segundos) || 60) / 60)
  // No servidor o relógio de verdade é o nosso; o alarme fica de reserva.
  tocarNoRitmo(segundos)
  const atual = await chrome.alarms.get(ALARME)
  if (atual && Math.abs((atual.periodInMinutes || 0) - min) < 0.01) return
  await chrome.alarms.create(ALARME, { periodInMinutes: min, delayInMinutes: min })
}

// ── O relógio do Chrome do servidor ────────────────────────────────────────
//
// 01/10/2026: o NODRI mandava "volte a cada 30 segundos" e a extensão voltava
// a cada DEZ MINUTOS. O alarme do Chrome é a causa: numa máquina sem ninguém
// mexendo -- que é exatamente o servidor, com a tela virtual -- o Chrome
// entende que está ocioso e segura os alarmes das extensões. Na recepção, com
// gente usando o computador, isso não aparece.
//
// Então, SÓ no servidor, a extensão para de depender do alarme: fica acordada
// e marca o tempo com o próprio relógio. É aceitável aqui porque esse Chrome
// existe unicamente para isto; no computador do salão nada muda, e o alarme
// continua valendo como rede de segurança nos dois casos.
let relogioServidor = null
let modoServidor = false

function tocarNoRitmo(segundos) {
  if (!modoServidor) return
  const ms = Math.max(30, Number(segundos) || 30) * 1000
  if (relogioServidor) clearInterval(relogioServidor)
  relogioServidor = setInterval(() => { ciclo() }, ms)
}

;(async () => {
  try {
    const d = await guardado()
    if (d.origem !== 'servidor') return
    modoServidor = true
    manterAcordado()                 // sem parar: aqui ela não pode dormir
    tocarNoRitmo(d.intervalo_seg || 30)
    ciclo()
  } catch { /* sem nada guardado ainda: o alarme assume */ }
})()

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
// Ler o 0051 é a pergunta mais demorada que existe aqui: a aba troca as datas,
// manda buscar e espera a tabela montar. Por isso 30 s de prazo, contra os
// 10 s das perguntas simples -- o suficiente para o Avec devagar, e ainda com
// hora para acabar.
async function lerComSegundaChance(abaId, data) {
  let lido = await perguntarComPaciencia(abaId, { tipo: 'ler-0051', data }, 3, 30000)
  if (lido && lido.ok) return lido
  await saude({ texto: 'O relatório não estava pronto — recarregando para tentar de novo…' })
  const aba = await infoDaAba(abaId)
  await navegarEAnotar(abaId, String(aba?.url || AVEC + 'admin/relatorio/0051'))
  await sleep(3000)
  lido = await perguntarComPaciencia(abaId, { tipo: 'ler-0051', data }, 3, 30000)
  return lido
}

async function executarTarefa(cfg, dados) {
  const t = cfg.tarefa
  try {
    // ── Campanha: ler o relatório de um dia e devolver as linhas ────────────
    if (t.tipo === 'campanha') {
      const url = urlAvec(t.url_relatorio || cfg.url_relatorio, AVEC + 'admin/relatorio/0051')
      // Três relógios, porque "está lento" sem número é chute. O aviso ao
      // profissional tem gente esperando, e daqui sai onde o tempo foi parar:
      // preparar a aba (abrir/logar), ler o relatório, e falar com o NODRI.
      const tAba = Date.now()
      const abaId = await prepararAba(cfg, dados, url)
      const msAba = Date.now() - tAba
      const tLer = Date.now()
      const lido = await lerComSegundaChance(abaId, t.data)
      const msLer = Date.now() - tLer
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
      const seg = ms => (ms / 1000).toFixed(1).replace('.', ',')
      await saude({
        texto: `${t.nome}: ${lido.linhas.length} linha(s) de ${t.data}; ${r.elegiveis || 0} no filtro; enfileirou ${r.enviadas || 0}${porque}.`
          + ` [aba ${seg(msAba)}s · ler ${seg(msLer)}s`
          + (lido.ms_busca != null ? ` (busca ${seg(lido.ms_busca)}s por ${lido.busca_por})` : '') + ']',
        lidas: r.lidas, elegiveis: r.elegiveis, enviadas: r.enviadas, erro: r.erro || null,
        tempos: { aba_ms: msAba, ler_ms: msLer, busca_ms: lido.ms_busca ?? null, busca_por: lido.busca_por || null },
      })
      return
    }

    // ── Marcar Confirmado no Avec (uma ou VÁRIAS numa volta) ────────────────
    //
    // O NODRI manda `t.pedidos` com até cinco. O caro aqui nunca foi o pedido:
    // é a VOLTA -- abrir a aba, logar, esperar o 0051 montar a tabela. Isso
    // custa de 40 s a 3 min e era pago uma vez por cliente, com a fila andando
    // de um em um (01/10/2026: 15 na fila, meia hora de salão em silêncio).
    //
    // Lendo cada dia UMA vez e guardando as linhas, casar o 2º, o 3º e o 4º
    // telefone é instantâneo; só a marcação na agenda se repete. `t.pedido_id`
    // sozinho continua funcionando, para não depender da ordem da atualização.
    if (t.tipo === 'confirmar_avec') {
      const url = urlAvec(t.url_relatorio || cfg.url_relatorio, AVEC + 'admin/relatorio/0051')
      const abaId = await prepararAba(cfg, dados, url)

      const pedidos = Array.isArray(t.pedidos) && t.pedidos.length
        ? t.pedidos
        : [{ pedido_id: t.pedido_id, telefone: t.telefone, nome: t.nome, data: t.data }]

      // 1) achar pela PLANILHA (telefone é único; o quadro pagina e corta nome)
      //
      // Amanhã primeiro (é o dia da confirmação automática); não achou, hoje.
      // A recepção manda confirmação do MESMO dia pelo celular ("18/09 às
      // 17:00"), a cliente responde "confirmo", e a extensão procurava só em
      // amanhã: "Não achei o agendamento dela em 19/09" (18/09/2026, 13:38).
      // Cancelado não conta: se o único agendamento dela está cancelado, não
      // há o que confirmar.
      const so = s => String(s || '').replace(/\D+/g, '').replace(/^55/, '').replace(/^(\d{2})9(\d{8})$/, '$1$2')
      const datas = [...new Set([...pedidos.map(p => p.data), cfg.amanha, cfg.hoje].filter(Boolean))]

      // Cada dia é lido UMA vez e as linhas ficam na mão para todos os pedidos.
      const porDia = new Map()
      const lerDia = async (data) => {
        if (porDia.has(data)) return porDia.get(data)
        const lido = await lerComSegundaChance(abaId, data)
        if (!lido || !lido.ok) throw new Error(lido?.erro || 'Não consegui ler o relatório')
        const linhas = lido.linhas || []
        porDia.set(data, linhas)
        return linhas
      }

      // 2) a agenda é aberta UMA vez, e só se sobrar alguém para marcar.
      let naAgenda = false
      const irParaAgenda = async () => {
        if (naAgenda) return
        await navegarEAnotar(abaId, AVEC + 'admin/agenda')
        await sleep(2000)
        naAgenda = true
      }

      const feitos = []
      for (const p of pedidos) {
        if (!p || !p.pedido_id) continue
        // Um pedido que falha não derruba os outros da volta: cada um responde
        // por si ao NODRI, que é quem conta as tentativas.
        try {
          const alvo = so(p.telefone)
          const valida = l => so(l.celular) === alvo && !/cancelad|faltou/i.test(l.status || '')
          // O dia do próprio pedido primeiro; depois os outros já lidos.
          const ordem = [...new Set([p.data, ...datas].filter(Boolean))]
          let linha = null
          for (const data of ordem) {
            linha = (await lerDia(data)).find(valida)
            if (linha) break
          }
          if (!linha) throw new Error('Não achei agendamento dela em ' + ordem.join(' nem '))

          if (/confirmad/i.test(linha.status || '')) {
            // Já estava confirmado: para o NODRI isso é sucesso, e a cliente
            // recebe o retorno do mesmo jeito.
            await nodri('/api/crm/automacao/extensao', {
              method: 'POST',
              body: JSON.stringify({ pedido_id: p.pedido_id, marcado: true, data: linha.data, hora: linha.hora, profissional: linha.profissional }),
            }, dados.chave)
            feitos.push(`${linha.cliente} (já estava)`)
            continue
          }

          await irParaAgenda()
          const marcou = await perguntarComPaciencia(abaId, {
            tipo: 'marcar-confirmado',
            data: linha.data, hora: linha.hora,
            profissional: linha.profissional, telefone: p.telefone,
          }, 3)

          await nodri('/api/crm/automacao/extensao', {
            method: 'POST',
            body: JSON.stringify({
              pedido_id: p.pedido_id, marcado: !!(marcou && marcou.ok),
              erro: marcou && marcou.ok ? null : (marcou?.erro || 'A agenda não respondeu'),
              data: linha.data, hora: linha.hora, profissional: linha.profissional,
            }),
          }, dados.chave)
          feitos.push(marcou?.ok ? `${linha.cliente} ${linha.hora}` : `${linha.cliente}: ${marcou?.erro || 'sem resposta'}`)
        } catch (e) {
          const msg = String(e?.message || e)
          await nodri('/api/crm/automacao/extensao', {
            method: 'POST',
            body: JSON.stringify({ pedido_id: p.pedido_id, marcado: false, erro: msg }),
          }, dados.chave).catch(() => {})
          feitos.push(`${p.nome || p.telefone}: ${msg}`)
        }
      }

      await saude({ texto: `Confirmação no Avec (${feitos.length}): ${feitos.join('; ')}`, erro: null })
      return
    }

    await saude({ texto: 'Tarefa desconhecida: ' + t.tipo, erro: null })
  } catch (e) {
    const msg = String(e?.message || e)
    await saude({ texto: `Falhou em "${t.nome || t.tipo}".`, erro: msg })
    try {
      if (t.tipo === 'confirmar_avec') {
        // Falhou antes do laço (a aba não abriu, o login não passou): TODOS os
        // pedidos da volta foram entregues e nenhum respondeu. Cada um precisa
        // da sua resposta, senão ficam parados até o prazo de 10 minutos do
        // NODRI vencer -- e aí levam uma tentativa falha sem terem sido
        // tentados de verdade.
        const ids = Array.isArray(t.pedidos) && t.pedidos.length
          ? t.pedidos.map(p => p.pedido_id)
          : [t.pedido_id]
        for (const id of ids) {
          if (!id) continue
          await nodri('/api/crm/automacao/extensao', {
            method: 'POST',
            body: JSON.stringify({ pedido_id: id, marcado: false, erro: msg }),
          }, dados.chave).catch(() => {})
        }
      } else {
        await nodri('/api/crm/automacao/extensao', {
          method: 'POST',
          body: JSON.stringify({ campanha_id: t.campanha_id, linhas: [], erro: msg, horario_cumprido: t.horario_cumprido || undefined }),
        }, dados.chave)
      }
    } catch { /* sem rede: fica no painel da extensão */ }
  }
}
