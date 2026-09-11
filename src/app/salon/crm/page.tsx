'use client'

// ── CRM NODRI — a tela ──────────────────────────────────────────────────────
//
// O desenho segue a pergunta que a recepção faz ao chegar: "o que eu tenho
// que fazer agora?". Por isso a coluna da esquerda não é uma lista de
// conversas em ordem de chegada — é uma FILA DE TRABALHO, com o que precisa
// de resposta em cima e o tempo de espera contado só dentro do expediente.
//
// Três colunas: a fila, a conversa, e o que o NODRI já sabe sobre a cliente.

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, RefreshCw, Send, Search, Link2, Power, Clock, User, X, Check, Settings, Tag, Paperclip, FileText, BarChart3, Eye, Mic, Square, CornerUpLeft } from 'lucide-react'
import { enviarArquivo } from '@/lib/enviarArquivo'
import { useIsMobile } from '@/lib/useIsMobile'
import {
  ESTADOS, estadoPor, telefoneBonito, minutosUteis, tempoCurto,
  urgenciaPorMinutos, CORES_URGENCIA, donoAtivo, type EstadoConversa,
} from '@/lib/crm'

type Conversa = any
type Mensagem = any

// Cliente nova e a pessoa que nunca foi atendida no salao. O relogio descobre
// isso sozinho cruzando o telefone com os atendimentos, e marca a etiqueta.
// Ela NUNCA some atras do estado: "cliente nova e esta sem resposta" e uma
// informacao diferente de "cliente antiga e esta sem resposta", e a primeira
// e a que se perde para sempre se ninguem responder.
const ETIQUETA_NOVA = 'cliente nova'
const ehNova = (c: any) => Array.isArray(c?.contato?.etiquetas) && c.contato.etiquetas.includes(ETIQUETA_NOVA)

export default function CrmPage() {
  // `canalLido` separa "ainda não sei" de "sei que está desconectado".
  // Sem essa distinção, a tela abria mostrando o QR por uma fração de segundo
  // antes de a resposta chegar — e quem já tinha escaneado achava que ia ter
  // que escanear de novo toda vez.
  const [canalLido, setCanalLido] = useState(false)
  const [canal, setCanal] = useState<any>({ situacao: 'desconectado' })
  const [modelos, setModelos] = useState<any[]>([])
  const [motivos, setMotivos] = useState<any[]>([])
  const [origens, setOrigens] = useState<any[]>([])
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [aberta, setAberta] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  // 'fila' = precisa de resposta e e de agora. 'antigas' = a cliente falou por
  // ultimo e ficou para tras. As duas sao 'acao_necessaria' no banco: o que
  // separa e a idade, e isso e decisao de tela, nao de estado.
  const [filtro, setFiltroCru] = useState<'fila' | 'antigas' | 'novas' | 'todas' | EstadoConversa>('fila')
  const setFiltro = (f: any) => { setFiltroCru(f); setMotivoFiltro('') }
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [anexando, setAnexando] = useState(false)
  const [citando, setCitando] = useState<Mensagem | null>(null)
  const escolherArquivo = useRef<HTMLInputElement>(null)
  const [fecharAberto, setFecharAberto] = useState(false)
  const [motivoFiltro, setMotivoFiltro] = useState('')
  const fimDaConversa = useRef<HTMLDivElement>(null)
  // No celular nao cabem tres colunas. Vira uma de cada vez: a fila, e quando
  // a pessoa abre uma conversa, a conversa -- com um botao para voltar. A
  // ficha da cliente vira um painel que se abre por cima.
  const noCelular = useIsMobile(860)
  const [fichaAberta, setFichaAberta] = useState(false)

  // ── Carregamento ──────────────────────────────────────────────────────────
  async function puxarCanal() {
    try {
      const r = await fetch('/api/crm/canal')
      if (!r.ok) return
      const d = await r.json()
      setCanal(d.canal || { situacao: 'desconectado' })
      setModelos(d.modelos || [])
      setMotivos(d.motivos || [])
      setOrigens(d.origens || [])
    } catch {} finally { setCanalLido(true) }
  }

  async function puxarConversas() {
    try {
      const r = await fetch('/api/crm/conversas')
      if (!r.ok) return
      const d = await r.json()
      setConversas(d.conversas || [])
    } catch {} finally { setCarregando(false) }
  }

  async function abrirConversa(c: Conversa) {
    setAberta(c); setMensagens([]); setFecharAberto(false); setCitando(null)
    try {
      // Assumir primeiro: a trava vale desde o instante em que a pessoa abre,
      // não depois que as mensagens carregam.
      fetch('/api/crm/conversas', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, acao: 'assumir' }),
      })
      const r = await fetch(`/api/crm/mensagens?conversa=${c.id}`)
      const d = await r.json()
      setMensagens(d.mensagens || [])
      setConversas(prev => prev.map(x => x.id === c.id ? { ...x, nao_lidas: 0 } : x))
    } catch {}
  }

  useEffect(() => { puxarCanal(); puxarConversas() }, [])

  // ── Sincronia entre os computadores ───────────────────────────────────────
  //
  // O CRM e usado em dois ou tres computadores ao mesmo tempo. Se a recepcao
  // responde no balcao, quem esta na sala precisa ver aquilo logo -- senao as
  // duas respondem a mesma cliente, que e o defeito que a trava de dono existe
  // para evitar. Cinco segundos e o intervalo que faz a tela parecer viva sem
  // castigar o banco: a lista da fila e pequena e tem indice.
  useEffect(() => {
    const esperandoQr = canal.situacao === 'aguardando_qr' || canal.situacao === 'conectando'
    const t = setInterval(() => {
      // Aba escondida nao precisa de nada: economiza banco e bateria do
      // computador que ficou aberto num canto o dia inteiro.
      if (document.hidden) return
      if (esperandoQr) { puxarCanal(); return }
      puxarConversas()
      puxarCanal()
    }, esperandoQr ? 3000 : 5000)
    return () => clearInterval(t)
  }, [canal.situacao])

  // A conversa ABERTA tambem se atualiza sozinha. Sem isto, a mensagem que a
  // cliente manda enquanto a tela esta aberta so apareceria ao fechar e abrir
  // de novo -- e a pessoa ficaria olhando para uma conversa parada achando que
  // a cliente sumiu.
  useEffect(() => {
    if (!aberta?.id) return
    const t = setInterval(async () => {
      if (document.hidden) return
      try {
        const r = await fetch(`/api/crm/mensagens?conversa=${aberta.id}&ler=0`)
        if (!r.ok) return
        const d = await r.json()
        const chegaram = d.mensagens || []
        // So troca o estado quando mudou de verdade: substituir a lista a cada
        // cinco segundos faria a conversa piscar e perder a rolagem.
        setMensagens(atual => atual.length === chegaram.length ? atual : chegaram)
      } catch {}
    }, 5000)
    return () => clearInterval(t)
  }, [aberta?.id])

  useEffect(() => {
    fimDaConversa.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length])

  // ── Avisar que chegou mensagem ────────────────────────────────────────────
  //
  // A recepcao nao fica olhando a tela: ela atende, cobra, atende de novo. Se
  // o CRM so mostra a mensagem para quem estiver olhando, ele perde para a
  // notificacao do celular, que e exatamente o que ele veio substituir.
  //
  // Dois avisos que funcionam com a aba no fundo: o TITULO da aba e um toque
  // curto. Nada de pedir permissao de notificacao do navegador -- e um
  // dialogo a mais para a recepcao clicar em "bloquear" no primeiro dia.
  const totalNaoLidas = useMemo(
    () => conversas.reduce((t, c) => t + (c.nao_lidas || 0), 0), [conversas])
  const naoLidasAntes = useRef(0)

  // O titulo original vem do layout do NODRI (o nome do salao) e e escrito
  // DEPOIS da primeira renderizacao. Guardar e reescrever a cada volta da
  // lista e o que faz o contador sobreviver a isso -- na primeira versao ele
  // era escrito uma vez e o Next apagava logo em seguida.
  const tituloOriginal = useRef('')
  useEffect(() => {
    if (!tituloOriginal.current) tituloOriginal.current = document.title
    const base = tituloOriginal.current || 'CRM · WhatsApp'
    const quer = totalNaoLidas > 0 ? `(${totalNaoLidas}) ${base}` : base
    if (document.title !== quer) document.title = quer
  }, [totalNaoLidas, conversas])

  useEffect(() => {
    const antes = naoLidasAntes.current
    naoLidasAntes.current = totalNaoLidas
    // So toca quando SUBIU, e nunca na primeira carga: abrir o CRM de manha
    // com trinta pendencias nao pode virar um alarme.
    if (antes === 0 || totalNaoLidas <= antes) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const vol = ctx.createGain()
      osc.connect(vol); vol.connect(ctx.destination)
      osc.frequency.value = 880
      vol.gain.setValueAtTime(0.0001, ctx.currentTime)
      vol.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01)
      vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28)
      osc.start(); osc.stop(ctx.currentTime + 0.3)
      setTimeout(() => ctx.close().catch(() => {}), 600)
    } catch {}
  }, [totalNaoLidas])

  // ── A fila ────────────────────────────────────────────────────────────────
  const agora = Date.now()
  const comTempo = useMemo(() => conversas.map(c => {
    const min = c.aguardando_desde
      ? minutosUteis(new Date(c.aguardando_desde), new Date(agora))
      : 0
    // Passou de tres dias sem resposta, deixou de ser a fila de hoje: vai
    // para "Sem resposta". Continua sendo trabalho, mas nao pode enterrar
    // quem escreveu agora de manha.
    const antiga = estadoPor(c.estado).naFila && min > 3 * 24 * 60
    return { ...c, _min: min, _urg: urgenciaPorMinutos(min), _antiga: antiga }
  }), [conversas, agora])

  const visiveis = useMemo(() => {
    let lista = comTempo
    if (filtro === 'fila') lista = lista.filter(c => estadoPor(c.estado).naFila && !c._antiga)
    else if (filtro === 'antigas') lista = lista.filter(c => c._antiga)
    else if (filtro === 'novas') lista = lista.filter(ehNova)
    else if (filtro !== 'todas') lista = lista.filter(c => c.estado === filtro)
    if (filtro === 'sem_conversao' && motivoFiltro) {
      lista = lista.filter(c => c.motivo_perda === motivoFiltro)
    }
    if (busca.trim()) {
      const q = busca.trim().toLowerCase()
      lista = lista.filter(c => {
        const ct = c.contato || {}
        return [ct.nome, ct.nome_agenda, ct.cliente_nome, ct.telefone, c.assunto, c.ultima_previa]
          .some((v: any) => String(v || '').toLowerCase().includes(q))
      })
    }
    // Quem espera há mais tempo aparece primeiro — é a ordem do trabalho,
    // não a ordem de chegada.
    return [...lista].sort((a, b) => {
      const fa = estadoPor(a.estado).naFila ? 0 : 1
      const fb = estadoPor(b.estado).naFila ? 0 : 1
      if (fa !== fb) return fa - fb
      // Cliente nova na frente: e a que nao volta se ficar sem resposta.
      const na = ehNova(a) ? 0 : 1
      const nb = ehNova(b) ? 0 : 1
      if (na !== nb) return na - nb
      if (b._min !== a._min) return b._min - a._min
      return new Date(b.ultima_em || 0).getTime() - new Date(a.ultima_em || 0).getTime()
    })
  }, [comTempo, filtro, busca, motivoFiltro])

  const contagem = useMemo(() => {
    const naFila = comTempo.filter(c => estadoPor(c.estado).naFila && !c._antiga)
    return {
      fila: naFila.length,
      antigas: comTempo.filter(c => c._antiga).length,
      criticas: naFila.filter(c => c._urg === 'critico').length,
      aguardando: comTempo.filter(c => c.estado === 'aguardando').length,
      followUp: comTempo.filter(c => c.estado === 'follow_up').length,
      pausadas: comTempo.filter(c => c.estado === 'pausada').length,
      agendadas: comTempo.filter(c => c.estado === 'agendado').length,
      perdidas: comTempo.filter(c => c.estado === 'sem_conversao').length,
      novas: comTempo.filter(ehNova).length,
    }
  }, [comTempo])

  // Por que se perdeu, com quantas. É este quadro que vira ação comercial:
  // quem caiu por preço recebe promoção, quem caiu por horário recebe encaixe.
  const porMotivo = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of comTempo) {
      if (c.estado !== 'sem_conversao') continue
      const k = c.motivo_perda || 'Sem motivo registrado'
      m.set(k, (m.get(k) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [comTempo])

  // ── Ações ─────────────────────────────────────────────────────────────────
  async function enviar(midia?: { url: string; tipo: string }) {
    const t = texto.trim()
    if ((!t && !midia) || !aberta || enviando) return
    setEnviando(true)
    try {
      const r = await fetch('/api/crm/mensagens', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversa: aberta.id, texto: t,
          midia_url: midia?.url || null, tipo: midia?.tipo || 'texto',
          responde_a: citando?.id || null,
        }),
      })
      if (r.ok) {
        setTexto(''); setCitando(null)
        const rm = await fetch(`/api/crm/mensagens?conversa=${aberta.id}`)
        setMensagens((await rm.json()).mensagens || [])
        puxarConversas()
      } else {
        alert((await r.json().catch(() => ({}))).error || 'Não consegui enviar.')
      }
    } catch { alert('Não consegui enviar.') } finally { setEnviando(false) }
  }

  // ── Gravar áudio ──────────────────────────────────────────────────────────
  //
  // Metade do que um salão responde é mais rápido de falar do que de escrever:
  // "o mechas leva quatro horas e depende do estado do fio". Obrigar a
  // recepção a gravar no celular e anexar aqui seria devolver o problema que
  // o CRM veio resolver.
  //
  // O formato depende do navegador. Onde houver ogg/opus a mensagem vai como
  // áudio de voz de verdade; onde só houver webm ela vai como arquivo de
  // áudio, que toca do mesmo jeito no WhatsApp mas sem a onda azul.
  const gravador = useRef<MediaRecorder | null>(null)
  const pedacos = useRef<Blob[]>([])
  const [gravando, setGravando] = useState(false)

  function formatoDeAudio(): string {
    const tenta = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    for (const t of tenta) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t)) return t
    }
    return ''
  }

  async function gravarAudio() {
    if (gravando) { gravador.current?.stop(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = formatoDeAudio()
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      pedacos.current = []
      rec.ondataavailable = e => { if (e.data.size) pedacos.current.push(e.data) }
      rec.onstop = async () => {
        // Solta o microfone SEMPRE. Sem isto a luzinha da câmera/microfone
        // fica acesa no computador da recepção o dia inteiro.
        stream.getTracks().forEach(t => t.stop())
        setGravando(false)
        const blob = new Blob(pedacos.current, { type: mime || 'audio/webm' })
        if (blob.size < 1200) return       // clique sem querer, não vira mensagem
        const ext = (mime || '').includes('ogg') ? 'ogg' : (mime || '').includes('mp4') ? 'm4a' : 'webm'
        const arquivo = new File([blob], `audio_${Date.now()}.${ext}`, { type: blob.type })
        setAnexando(true)
        try {
          const { url } = await enviarArquivo(arquivo)
          await enviar({ url, tipo: 'audio' })
        } catch (e: any) {
          alert(e?.message || 'Não consegui enviar o áudio.')
        } finally { setAnexando(false) }
      }
      gravador.current = rec
      rec.start()
      setGravando(true)
    } catch {
      alert('Não consegui usar o microfone. Verifique a permissão do navegador.')
    }
  }

  // ── Anexo ─────────────────────────────────────────────────────────────────
  // O arquivo sobe primeiro para o NODRI e só depois entra na fila de envio.
  // Assim a mensagem nasce com um endereço que a ponte consegue buscar mesmo
  // se o navegador fechar no segundo seguinte.
  async function anexar(file: File) {
    if (!aberta || anexando) return
    setAnexando(true)
    try {
      const { url, type } = await enviarArquivo(file)
      const m = String(type || file.type || '')
      const tipo = m.startsWith('image/') ? 'imagem'
        : m.startsWith('video/') ? 'video'
        : m.startsWith('audio/') ? 'audio'
        : 'documento'
      await enviar({ url, tipo })
    } catch (e: any) {
      alert(e?.message || 'Não consegui enviar o arquivo.')
    } finally { setAnexando(false) }
  }

  // Acrescenta uma linha ao que ja esta escrito, em vez de substituir: a
  // recepcao monta "corte 80, escova 60" clicando, que e como ela responde
  // de verdade.
  function inserirNoTexto(linha: string) {
    setTexto(t => (t.trim() ? t.replace(/\s+$/, '') + '\n' + linha : linha))
  }

  async function marcarNaoLida() {
    if (!aberta) return
    const id = aberta.id
    // Fecha a conversa junto. Marcar como nao lida e deixar ela aberta na
    // tela e uma contradicao: a releitura automatica continuaria rolando por
    // cima e a pessoa ficaria olhando para algo que disse nao ter visto.
    setAberta(null); setMensagens([])
    await fetch('/api/crm/conversas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, acao: 'nao_lida' }),
    }).catch(() => {})
    puxarConversas()
  }

  async function mudarOrigem(origem: string) {
    if (!aberta) return
    setAberta({ ...aberta, origem })
    setConversas(prev => prev.map(x => x.id === aberta.id ? { ...x, origem } : x))
    await fetch('/api/crm/conversas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: aberta.id, origem }),
    }).catch(() => {})
  }

  async function mudarEstado(estado: EstadoConversa, extra: any = {}) {
    if (!aberta) return
    const r = await fetch('/api/crm/conversas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: aberta.id, estado, ...extra }),
    })
    if (!r.ok) { alert((await r.json().catch(() => ({}))).error || 'Não consegui mudar.'); return }
    setAberta({ ...aberta, estado, ...extra })
    setFecharAberto(false)
    puxarConversas()
  }

  async function conectar(acao: 'conectar' | 'desconectar') {
    if (acao === 'desconectar' && !confirm('Desconectar o WhatsApp do CRM? Para voltar será preciso escanear o QR de novo.')) return
    await fetch('/api/crm/canal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao }),
    })
    puxarCanal()
  }

  const conectado = canal.situacao === 'conectado'

  return (
    // Coluna de tela inteira: o cabecalho ocupa o que precisar e o resto fica
    // com o que sobrar. Antes o corpo descontava 53px na mao, e bastou o
    // cabecalho ganhar uma segunda linha para a conversa vazar para baixo da
    // dobra.
    <div className="h-screen flex flex-col" style={{ background: '#faf9f7' }}>
      {/* ── Barra ── */}
      <div className="flex-shrink-0 z-20 border-b" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
        {/* A barra global de busca flutua no canto direito, por cima de tudo
            (z-45). Sem esta folga, o selo de conexao, a engrenagem e o
            atualizar ficam DEBAIXO dela: existem, aparecem no HTML, e ninguem
            consegue clicar. */}
        <div className="px-4 py-2 flex items-center gap-3"
          style={{ paddingRight: noCelular ? 16 : 340 }}>
          <a href="/salon" className="p-1.5 rounded-lg flex-shrink-0" style={{ color: '#6b6860' }} title="Voltar"><ArrowLeft size={17} /></a>
          <div className="min-w-0 flex-shrink-0">
            <h1 className="font-bold text-[15px] leading-tight" style={{ color: '#1a1a1a' }}>CRM · WhatsApp</h1>
            <p className="text-[11.5px]" style={{ color: '#8f877f' }}>
              {conectado
                ? <>Conectado{canal.numero ? ` · ${telefoneBonito(canal.numero)}` : ''}</>
                : 'WhatsApp não conectado'}
            </p>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 flex-shrink-0">
            <SeloConexao canal={canal} />
            {/* Com nome, nao so um icone: a engrenagem sozinha ninguem acha --
                e nao achou mesmo. */}
            <a href="/salon/crm/painel" title="Painel: conversao, motivos de perda e tempo de resposta"
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
              style={{ background: '#e6f1eb', color: '#2f6b4f' }}>
              <BarChart3 size={13} /> Painel
            </a>
            <a href="/salon/crm/config" title="Configurar mensagens prontas, precos e motivos"
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
              style={{ background: '#f1eefc', color: '#5b4fcf' }}>
              <Settings size={13} /> Configurar
            </a>
            <button onClick={() => { puxarCanal(); puxarConversas() }} title="Atualizar"
              className="p-1.5 rounded-lg" style={{ color: '#6b6860' }}><RefreshCw size={15} /></button>
          </div>
        </div>

        {/* Linha propria para as abas. Tentei encaixa-las na linha do titulo e,
            numa janela estreita, "Preciso agir (27)" virou tres linhas de uma
            palavra cada. Linha inteira para elas resolve em qualquer largura, e
            so a linha de cima precisa desviar da busca global. */}
        {conectado && (
          <div className="px-4 pb-2 flex gap-1 flex-wrap">
            <Aba ativo={filtro === 'fila'} onClick={() => setFiltro('fila')}
              texto={`Preciso agir${contagem.fila ? ` (${contagem.fila})` : ''}`} destaque={contagem.criticas > 0} />
            {contagem.novas > 0 && (
              <Aba ativo={filtro === 'novas'} onClick={() => setFiltro('novas')}
                texto={`Clientes novas (${contagem.novas})`} />
            )}
            {contagem.antigas > 0 && (
              <Aba ativo={filtro === 'antigas'} onClick={() => setFiltro('antigas')}
                texto={`Sem resposta (${contagem.antigas})`} />
            )}
            <Aba ativo={filtro === 'aguardando'} onClick={() => setFiltro('aguardando')}
              texto={`Aguardando (${contagem.aguardando})`} />
            {contagem.followUp > 0 && (
              <Aba ativo={filtro === 'follow_up'} onClick={() => setFiltro('follow_up')}
                texto={`Follow-up (${contagem.followUp})`} />
            )}
            {contagem.pausadas > 0 && (
              <Aba ativo={filtro === 'pausada'} onClick={() => setFiltro('pausada')}
                texto={`Pausadas (${contagem.pausadas})`} />
            )}
            {contagem.agendadas > 0 && (
              <Aba ativo={filtro === 'agendado'} onClick={() => setFiltro('agendado')}
                texto={`Agendadas (${contagem.agendadas})`} />
            )}
            {contagem.perdidas > 0 && (
              <Aba ativo={filtro === 'sem_conversao'} onClick={() => setFiltro('sem_conversao')}
                texto={`Não fechou (${contagem.perdidas})`} />
            )}
            <Aba ativo={filtro === 'todas'} onClick={() => setFiltro('todas')} texto="Todas" />
          </div>
        )}
      </div>

      {!canalLido ? (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <p className="text-[13px]" style={{ color: '#8f877f' }}>Verificando a conexao...</p>
        </div>
      ) : !conectado ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <TelaConexao canal={canal} onConectar={() => conectar('conectar')} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex">
          {/* ── Fila ── */}
          <aside className={`${noCelular ? (aberta ? 'hidden' : 'w-full') : 'w-[344px]'} flex-shrink-0 border-r flex flex-col`}
            style={{ background: '#fff', borderColor: '#e8e6e0' }}>
            <div className="p-3 border-b" style={{ borderColor: '#e8e6e0' }}>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#8f877f' }} />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] focus:outline-none"
                  style={{ background: '#faf9f7', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />
              </div>
              {/* Perdemos 40 nao e informacao. Perdemos 22 por preco e 11 por
                  falta de horario no sabado sao duas acoes diferentes.
                  Uma LISTA, nao uma fileira de botoes: o salao pode ter vinte
                  motivos, e vinte botoes empurrariam a fila para fora da tela.
                  Ordenada pela quantidade, porque o motivo que mais aparece e
                  o que merece a proxima decisao. */}
              {filtro === 'sem_conversao' && porMotivo.length > 0 && (
                <select value={motivoFiltro} onChange={e => setMotivoFiltro(e.target.value)}
                  className="mt-2 w-full px-2.5 py-2 rounded-lg text-[12px] font-bold focus:outline-none"
                  style={{ background: '#fff', border: '1px solid #e8e6e0', color: '#1a1a1a' }}>
                  <option value="">Todos os motivos ({contagem.perdidas})</option>
                  {porMotivo.map(([nome, qtd]) => (
                    <option key={nome} value={nome}>{nome} — {qtd}</option>
                  ))}
                </select>
              )}
              {contagem.criticas > 0 && filtro === 'fila' && (
                <p className="mt-2 text-[11px] font-bold" style={{ color: '#b4322a' }}>
                  {contagem.criticas} esperando há mais de 1 hora
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {carregando && <p className="p-4 text-[12.5px]" style={{ color: '#8f877f' }}>Carregando...</p>}
              {!carregando && visiveis.length === 0 && (
                <p className="p-4 text-[12.5px]" style={{ color: '#8f877f' }}>
                  {filtro === 'fila' ? 'Nada esperando resposta. Fila limpa.'
                    : filtro === 'antigas' ? 'Nenhuma conversa parada para tras.'
                    : 'Nenhuma conversa aqui.'}
                </p>
              )}
              {visiveis.map(c => (
                <ItemFila key={c.id} c={c} ativo={aberta?.id === c.id} onClick={() => abrirConversa(c)} />
              ))}
            </div>
          </aside>

          {/* ── Conversa ── */}
          <main className={`${noCelular && !aberta ? 'hidden' : 'flex-1'} flex flex-col min-w-0`} style={{ background: '#f2efec' }}>
            {!aberta ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <div className="rounded-full flex items-center justify-center"
                  style={{ width: 52, height: 52, background: '#e8e6e0' }}>
                  <Send size={20} style={{ color: '#b5aca4' }} />
                </div>
                <p className="text-[13.5px] font-bold" style={{ color: '#6b6860' }}>Escolha uma conversa</p>
                <p className="text-[12px]" style={{ color: '#8f877f' }}>A fila da esquerda está na ordem do trabalho.</p>
              </div>
            ) : (
              <>
                <CabecalhoConversa c={aberta} onEstado={mudarEstado} onOrigem={mudarOrigem}
                  onNaoLida={marcarNaoLida}
                  noCelular={noCelular}
                  onVoltar={() => setAberta(null)}
                  onFicha={() => setFichaAberta(true)}
                  fecharAberto={fecharAberto} setFecharAberto={setFecharAberto}
                  motivos={motivos} origens={origens} />

                <div className="flex-1 overflow-y-auto px-5 py-4" style={{ background: '#f2efec' }}>
                  <div className="mx-auto" style={{ maxWidth: 720 }}>
                  {mensagens.map((m, i) => (
                    <div key={m.id}>
                      {/* Separador de dia. Sem ele, uma conversa de seis meses
                          vira um bloco unico e ninguem sabe se "amanha as 15h"
                          foi combinado ontem ou em marco. */}
                      {diaMudou(mensagens[i - 1], m) && <SeparadorDia em={m.criado_em} />}
                      <Balao m={m} onCitar={() => setCitando(m)}
                        citada={m.responde_a ? mensagens.find(x => x.id === m.responde_a) : null} />
                    </div>
                  ))}
                  <div ref={fimDaConversa} />
                  </div>
                </div>

                <div className="border-t px-4 py-3" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
                  {citando && (
                    <div className="mb-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                      style={{ background: '#f1eefc', borderLeft: '3px solid #5b4fcf' }}>
                      <CornerUpLeft size={13} style={{ color: '#5b4fcf' }} />
                      <span className="text-[11.5px] truncate flex-1" style={{ color: '#6b6860' }}>
                        Respondendo: {citando.texto || `[${citando.tipo}]`}
                      </span>
                      <button onClick={() => setCitando(null)} title="Cancelar"
                        className="p-0.5" style={{ color: '#8f877f' }}><X size={13} /></button>
                    </div>
                  )}
                  <PainelPrecos onInserir={inserirNoTexto} />
                  {modelos.length > 0 && (
                    <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
                      {modelos.map(m => (
                        <button key={m.id} onClick={() => setTexto(m.texto)} title={m.texto}
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap flex-shrink-0"
                          style={{ background: '#f1eefc', color: '#5b4fcf', border: '1px solid #5b4fcf25' }}>
                          {m.nome}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 items-end">
                    <input ref={escolherArquivo} type="file" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) anexar(f); e.target.value = '' }} />
                    <button onClick={() => escolherArquivo.current?.click()} disabled={anexando || gravando}
                      title="Anexar foto, áudio ou documento"
                      className="px-3 py-2.5 rounded-xl disabled:opacity-40"
                      style={{ background: '#faf9f7', border: '1px solid #e8e6e0', color: '#6b6860' }}>
                      <Paperclip size={15} />
                    </button>
                    <button onClick={gravarAudio} disabled={anexando}
                      title={gravando ? 'Parar e enviar o áudio' : 'Gravar um áudio'}
                      className="px-3 py-2.5 rounded-xl disabled:opacity-40"
                      style={gravando
                        ? { background: '#b4322a', color: '#fff', border: '1px solid #b4322a' }
                        : { background: '#faf9f7', border: '1px solid #e8e6e0', color: '#6b6860' }}>
                      {gravando ? <Square size={15} /> : <Mic size={15} />}
                    </button>
                    <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2}
                      onKeyDown={e => {
                        if (e.key !== 'Enter' || e.shiftKey) return
                        e.preventDefault()
                        // Atalho: "/oi" vira a mensagem de boas-vindas inteira.
                        // O campo `atalho` das mensagens prontas existia e nao
                        // era usado por nada -- quem digita rapido nao quer
                        // tirar a mao do teclado para clicar num botao.
                        const m = texto.trim().match(/^\/(\S+)$/)
                        const pronta = m && modelos.find(x =>
                          String(x.atalho || '').toLowerCase() === m[1].toLowerCase())
                        if (pronta) { setTexto(pronta.texto); return }
                        enviar()
                      }}
                      placeholder="Escreva a resposta... (Enter envia · Shift+Enter quebra linha · /atalho abre a mensagem pronta)"
                      className="flex-1 px-3.5 py-3 rounded-xl text-[13.5px] resize-none focus:outline-none"
                      style={{ background: '#faf9f7', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />
                    <button onClick={() => enviar()} disabled={!texto.trim() || enviando}
                      className="px-4 py-3 rounded-xl font-bold text-[13px] flex items-center gap-1.5 disabled:opacity-40"
                      style={{ background: '#5b4fcf', color: '#fff' }}>
                      <Send size={14} />{anexando ? 'Anexando' : enviando ? 'Enviando' : 'Enviar'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </main>

          {/* ── O que o NODRI já sabe ── */}
          {aberta && !noCelular && <PainelCliente c={aberta} />}
          {aberta && noCelular && fichaAberta && (
            <div className="fixed inset-0 z-30 flex" onClick={() => setFichaAberta(false)}>
              <div className="flex-1" style={{ background: 'rgba(26,22,20,.35)' }} />
              <div onClick={e => e.stopPropagation()} className="h-full overflow-y-auto"
                style={{ width: 300, maxWidth: '86vw', background: '#fff', boxShadow: '-6px 0 24px rgba(0,0,0,.14)' }}>
                <PainelCliente c={aberta} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════

function SeloConexao({ canal }: { canal: any }) {
  const mapa: Record<string, { t: string; cor: string; fundo: string }> = {
    conectado:     { t: 'Conectado',    cor: '#2f6b4f', fundo: '#e6f1eb' },
    aguardando_qr: { t: 'Aguardando QR',cor: '#9a6b12', fundo: '#fbf1df' },
    conectando:    { t: 'Conectando',   cor: '#9a6b12', fundo: '#fbf1df' },
    caiu:          { t: 'Conexão caiu', cor: '#b4322a', fundo: '#fbebe9' },
    desconectado:  { t: 'Desconectado', cor: '#6b6860', fundo: '#f0ece7' },
  }
  let s = mapa[canal.situacao] || mapa.desconectado
  // Conectado no papel mas sem sinal da ponte é conexão caída. Dizer a verdade
  // aqui evita o salão descobrir pelo cliente que ficou sem resposta.
  if (canal.situacao === 'conectado' && canal.ponte_viva === false) s = mapa.caiu
  return (
    <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold"
      style={{ background: s.fundo, color: s.cor }}>{s.t}</span>
  )
}

function TelaConexao({ canal, onConectar }: { canal: any; onConectar: () => void }) {
  const esperandoQr = canal.situacao === 'aguardando_qr' || canal.situacao === 'conectando'
  return (
    <div className="max-w-lg mx-auto px-5 py-10">
      <div className="rounded-2xl border p-7" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
        <h2 className="font-bold text-[19px] mb-1.5" style={{ color: '#1a1a1a' }}>Conectar o WhatsApp do salão</h2>
        <p className="text-[13px] mb-5" style={{ color: '#6b6860' }}>
          O número continua funcionando normalmente no celular, com os grupos. O CRM entra
          como mais um aparelho conectado — igual ao WhatsApp Web.
        </p>

        {canal.qr ? (
          <div className="text-center">
            <div className="inline-block p-3 rounded-xl" style={{ background: '#fff', border: '1px solid #e8e6e0' }}>
              {/* A ponte manda o QR já como imagem pronta. */}
              <img src={canal.qr} alt="QR code para conectar o WhatsApp" width={232} height={232} />
            </div>
            <p className="text-[12.5px] mt-4" style={{ color: '#6b6860' }}>
              No celular: <strong>WhatsApp → Aparelhos conectados → Conectar aparelho</strong>
            </p>
            <p className="text-[11px] mt-1.5" style={{ color: '#8f877f' }}>
              O código vira a cada minuto. Se sumir, ele aparece de novo sozinho.
            </p>
          </div>
        ) : esperandoQr ? (
          <div className="text-center py-8">
            <p className="text-[13px] font-bold" style={{ color: '#9a6b12' }}>Preparando o código...</p>
            <p className="text-[12px] mt-1.5" style={{ color: '#8f877f' }}>
              Se demorar mais de um minuto, o serviço de conexão pode estar fora do ar.
            </p>
          </div>
        ) : (
          <button onClick={onConectar}
            className="w-full py-3 rounded-xl font-bold text-[13.5px] flex items-center justify-center gap-2"
            style={{ background: '#5b4fcf', color: '#fff' }}>
            <Link2 size={16} /> Gerar o QR code
          </button>
        )}

        {canal.erro && (
          <p className="mt-4 text-[12px] px-3 py-2 rounded-lg"
            style={{ background: '#fbebe9', color: '#b4322a' }}>{canal.erro}</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
        <h3 className="font-bold text-[13px] mb-2" style={{ color: '#1a1a1a' }}>Como funciona</h3>
        <ol className="text-[12.5px] space-y-1.5 pl-4 list-decimal" style={{ color: '#6b6860' }}>
          <li>Você escaneia uma vez. A conexão fica de pé sozinha.</li>
          <li>As conversas passam a aparecer aqui, organizadas por quem precisa de resposta.</li>
          <li>Quem escreve é sempre a recepção — o sistema não manda nada sozinho.</li>
          <li>Outro computador pode entrar no NODRI e trabalhar na mesma fila.</li>
        </ol>
      </div>
    </div>
  )
}

// Cor propria, que nao e a de nenhum estado: e uma informacao de outro eixo.
// Cliente nova que fica sem resposta nao volta -- nao existe segunda chance
// com quem nunca foi atendido.
function SeloNova() {
  return (
    <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: '#c94d8a', color: '#fff', letterSpacing: '0.03em' }}>
      CLIENTE NOVA
    </span>
  )
}

function Aba({ ativo, onClick, texto, destaque }: any) {
  return (
    <button onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12px] font-bold transition"
      style={ativo
        ? { background: '#5b4fcf', color: '#fff' }
        : { background: destaque ? '#fbebe9' : '#faf9f7', color: destaque ? '#b4322a' : '#6b6860' }}>
      {texto}
    </button>
  )
}

function ItemFila({ c, ativo, onClick }: any) {
  const est = estadoPor(c.estado)
  const ct = c.contato || {}
  const nome = ct.nome || ct.nome_agenda || ct.cliente_nome || telefoneBonito(ct.telefone)
  const urg = CORES_URGENCIA[c._urg as keyof typeof CORES_URGENCIA]
  const dono = donoAtivo(c.dono_ate) ? c.dono_nome : null
  const nova = ehNova(c)
  return (
    <button onClick={onClick}
      className="w-full text-left px-4 py-3 flex gap-3 transition relative"
      style={{
        background: ativo ? '#f1eefc' : 'transparent',
        borderBottom: '1px solid #f2f2f5',
      }}>
      {/* Faixa de urgencia na borda. A cor mora na lateral e nao no fundo: um
          fundo vermelho numa lista de cem linhas cansa a vista em dez minutos
          e para de significar coisa alguma. */}
      {est.naFila && (
        <span className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: urg.cor, opacity: c._min > 0 ? 1 : 0.25 }} />
      )}

      <Avatar nome={nome} nova={nova} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-[13.5px] truncate" style={{ color: '#1a1a1a' }}>{nome}</span>
          <div className="flex-1" />
          {est.naFila && c._min > 0 && (
            <span className="text-[10px] font-bold flex-shrink-0 flex items-center gap-0.5"
              style={{ color: urg.cor, fontVariantNumeric: 'tabular-nums' }}>
              <Clock size={9} />{tempoCurto(c._min)}
            </span>
          )}
          {c.nao_lidas > 0 && (
            <span className="text-[9.5px] font-bold px-1.5 rounded-full flex-shrink-0"
              style={{ background: '#b4322a', color: '#fff' }}>{c.nao_lidas}</span>
          )}
        </div>

        <p className="text-[12px] truncate mt-1" style={{ color: '#7d756d' }}>
          {c.ultima_de === 'salao' ? 'Você: ' : ''}{c.ultima_previa || '—'}
        </p>

        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {/* A etiqueta aparece SEMPRE, inclusive na fila. E o que permite abrir
              "Todas" e ver de relance que nao sobrou conversa sem direcao. */}
          <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: est.cor, background: est.fundo }}>
            {est.rotulo}{c.motivo_perda ? ` · ${c.motivo_perda}` : ''}
          </span>
          {nova && <SeloNova />}
          {dono && (
            <span className="text-[9.5px] flex items-center gap-0.5" style={{ color: '#8f877f' }}>
              <User size={9} />{dono}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// Iniciais em vez de foto. O WhatsApp nao entrega a foto da cliente pela
// ponte, e um circulo cinza igual em cem linhas nao ajuda ninguem a achar a
// conversa. A cor sai do proprio nome, entao a mesma pessoa tem sempre a
// mesma cor e a lista fica reconhecivel de relance.
const CORES_AVATAR = ['#5b4fcf', '#0f766e', '#b4322a', '#9a6b12', '#2f6b4f', '#7c3aed', '#0369a1', '#b45309']

function Avatar({ nome, nova, tamanho = 34 }: { nome: string; nova?: boolean; tamanho?: number }) {
  const limpo = String(nome || '').trim()
  const partes = limpo.split(/\s+/).filter(p => /[a-zA-ZÀ-ú]/.test(p))
  // Contato sem nome no WhatsApp vem como "(61) 9672-6153". Os dois ultimos
  // digitos ali nao sao iniciais de ninguem: sao ruido que a lista inteira
  // repete. Melhor a silhueta, que ao menos diz "essa eu ainda nao sei quem e".
  const iniciais = partes.length
    ? (partes[0][0] + (partes[1]?.[0] || '')).toUpperCase()
    : null
  let soma = 0
  for (let i = 0; i < limpo.length; i++) soma += limpo.charCodeAt(i)
  // Quem ainda nao tem nome fica em cinza: a cor existe para distinguir
  // pessoas, e sete circulos coloridos com silhueta dentro nao distinguem
  // ninguem -- so fazem a lista parecer cheia de gente diferente.
  const cor = iniciais ? CORES_AVATAR[soma % CORES_AVATAR.length] : '#b5aca4'
  return (
    <div className="rounded-full flex-shrink-0 flex items-center justify-center font-bold relative"
      style={{
        width: tamanho, height: tamanho, background: cor, color: '#fff',
        fontSize: tamanho * 0.36, letterSpacing: '0.02em',
      }}>
      {iniciais || <User size={tamanho * 0.5} strokeWidth={2.2} />}
      {nova && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full"
          style={{ width: 10, height: 10, background: '#c94d8a', border: '2px solid #fff' }} />
      )}
    </div>
  )
}

function CabecalhoConversa({ c, onEstado, onOrigem, onNaoLida, onVoltar, onFicha, noCelular, fecharAberto, setFecharAberto, motivos, origens }: any) {
  const ct = c.contato || {}
  const nome = ct.nome || ct.nome_agenda || ct.cliente_nome || telefoneBonito(ct.telefone)
  const est = estadoPor(c.estado)
  return (
    <div className="border-b px-5 py-3" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
      <div className="flex items-center gap-3 flex-wrap">
        {noCelular && (
          <button onClick={onVoltar} title="Voltar para a fila"
            className="p-1.5 rounded-lg -ml-1" style={{ color: '#6b6860' }}>
            <ArrowLeft size={18} />
          </button>
        )}
        <Avatar nome={nome} nova={ehNova(c)} tamanho={38} />
        <div className="min-w-0">
          <p className="font-bold text-[15.5px] leading-tight" style={{ color: '#1a1a1a' }}>{nome}</p>
          <p className="text-[11.5px]" style={{ color: '#8f877f' }}>{telefoneBonito(ct.telefone)}</p>
        </div>
        {/* O motivo faz parte do estado: "Sem conversão" sozinho não diz nada,
            e era justamente o motivo que a pessoa acabou de escolher. */}
        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold"
          style={{ background: est.fundo, color: est.cor }}>
          {est.rotulo}{c.motivo_perda ? ` · ${c.motivo_perda}` : ''}
        </span>
        {ehNova(c) && <SeloNova />}
        {noCelular && (
          <button onClick={onFicha} title="A cliente"
            className="ml-auto px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1"
            style={{ background: '#f1eefc', color: '#5b4fcf' }}>
            <User size={12} /> Ficha
          </button>
        )}
        <div className="flex-1" />
        <div className="flex gap-1.5 flex-wrap">
          <BotaoAcao onClick={() => onEstado('agendado')} cor="#2f6b4f" fundo="#e6f1eb" icone={<Check size={12} />} texto="Agendou" />
          <BotaoAcao onClick={() => onEstado('aguardando')} cor="#9a6b12" fundo="#fbf1df" texto="Aguardando cliente" />
          <BotaoAcao onClick={() => onEstado('follow_up', { prazo: new Date(Date.now() + 864e5).toISOString() })}
            cor="#c2603a" fundo="#fbeee8" texto="Follow-up amanhã" />
          <BotaoAcao onClick={() => onEstado('pausada', { prazo: new Date(Date.now() + 7 * 864e5).toISOString() })}
            cor="#5b4fcf" fundo="#f1eefc" texto="Pausar 7 dias" />
          <BotaoAcao onClick={() => setFecharAberto(!fecharAberto)} cor="#6b6860" fundo="#f0ece7"
            icone={fecharAberto ? <X size={12} /> : undefined} texto="Não fechou" />
          <BotaoAcao onClick={onNaoLida} cor="#6b6860" fundo="#f0ece7"
            icone={<Eye size={12} />} texto="Não li ainda" />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {c.proxima_acao && (
          <p className="text-[11.5px]" style={{ color: '#6b6860' }}>
            <strong>Próxima ação:</strong> {c.proxima_acao}
          </p>
        )}
        <div className="flex-1" />
        {/* Origem na conversa, nao no contato: a mesma cliente pode voltar por
            um anuncio hoje e por indicacao daqui a um ano, e sao duas
            oportunidades com origens diferentes. */}
        <label className="text-[11px] flex items-center gap-1.5" style={{ color: '#8f877f' }}>
          Veio de
          <select value={c.origem || ''} onChange={e => onOrigem(e.target.value)}
            className="px-2 py-1 rounded-lg text-[11px] font-bold focus:outline-none"
            style={{ background: c.origem ? '#f1eefc' : '#faf9f7', color: c.origem ? '#5b4fcf' : '#8f877f', border: '1px solid #e8e6e0' }}>
            <option value="">não informado</option>
            {(origens || []).map((o: any) => <option key={o.id} value={o.nome}>{o.nome}</option>)}
          </select>
        </label>
      </div>

      {/* Fechar sem motivo é o que transforma "perdemos 40" em informação inútil. */}
      {fecharAberto && (
        <div className="mt-3 p-3 rounded-xl" style={{ background: '#faf9f7' }}>
          <p className="text-[11.5px] font-bold mb-2" style={{ color: '#1a1a1a' }}>Por que não fechou?</p>
          <div className="flex gap-1.5 flex-wrap">
            {motivos.map((m: any) => (
              <button key={m.id} onClick={() => onEstado('sem_conversao', { motivo_perda: m.nome })}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                style={{ background: '#fff', border: '1px solid #e8e6e0', color: '#6b6860' }}>
                {m.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BotaoAcao({ onClick, cor, fundo, texto, icone }: any) {
  return (
    <button onClick={onClick}
      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
      style={{ background: fundo, color: cor }}>
      {icone}{texto}
    </button>
  )
}

const DIA = (d: any) => d ? new Date(d).toDateString() : ''
const diaMudou = (antes: any, agora: any) => DIA(antes?.criado_em) !== DIA(agora?.criado_em)

function SeparadorDia({ em }: { em: string }) {
  const d = new Date(em)
  const hoje = new Date()
  const ontem = new Date(Date.now() - 864e5)
  const rotulo = d.toDateString() === hoje.toDateString() ? 'Hoje'
    : d.toDateString() === ontem.toDateString() ? 'Ontem'
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: d.getFullYear() === hoje.getFullYear() ? undefined : 'numeric' })
  return (
    <div className="flex justify-center my-3">
      <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold"
        style={{ background: '#fff', color: '#7d756d', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}>
        {rotulo}
      </span>
    </div>
  )
}

function Balao({ m, onCitar, citada }: { m: Mensagem; onCitar?: () => void; citada?: Mensagem | null }) {
  const meu = m.direcao === 'saida'
  const hora = m.criado_em
    ? new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : ''
  return (
    <div className={`flex mb-1.5 group ${meu ? 'justify-end' : 'justify-start'}`}>
      {/* O botao de citar so aparece no balao sob o cursor. Um icone fixo em
          cada mensagem polui uma conversa de duzentas linhas. */}
      {meu && onCitar && (
        <button onClick={onCitar} title="Responder citando"
          className="opacity-0 group-hover:opacity-100 transition self-center mr-1 p-1"
          style={{ color: '#8f877f' }}><CornerUpLeft size={13} /></button>
      )}
      <div className="max-w-[68%] px-3 py-2"
        style={m.em_massa
          // Disparo de lista não é resposta para aquela pessoa. Fica com a
          // cara de recado colado, para ninguém ler como se fosse atendimento.
          ? { background: '#faf7ef', color: '#6b6860', border: '1px dashed #d8c9a6',
              borderRadius: 14 }
          : {
              background: meu ? '#5b4fcf' : '#fff',
              color: meu ? '#fff' : '#1a1a1a',
              boxShadow: meu ? '0 1px 2px rgba(91,79,207,.25)' : '0 1px 2px rgba(26,22,20,.09)',
              // Canto "mordido" do lado de quem falou, como todo mensageiro
              // faz: diz de quem é a fala antes de a pessoa ler a cor.
              borderRadius: meu ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            }}>
        {m.em_massa && (
          <p className="text-[9.5px] font-bold mb-1" style={{ color: '#9a6b12' }}>ENVIO EM MASSA</p>
        )}
        {/* A mensagem citada, dentro do balao. Sem ela, "pode sim" no meio de
            cinco perguntas nao diz a qual delas o salao respondeu. */}
        {citada && (
          <div className="mb-1.5 px-2 py-1 rounded text-[11.5px] truncate"
            style={{
              background: meu ? 'rgba(255,255,255,.16)' : '#f1eefc',
              borderLeft: `3px solid ${meu ? 'rgba(255,255,255,.55)' : '#5b4fcf'}`,
              opacity: 0.92,
            }}>
            {citada.texto || `[${citada.tipo}]`}
          </div>
        )}
        <Anexo m={m} />
        {m.texto && !(m.midia_url && /^\[(imagem|audio|video|figurinha|documento)\]$/.test(m.texto)) && (
          <p className="text-[14px] leading-[1.45] whitespace-pre-wrap break-words">{m.texto}</p>
        )}
        <p className="text-[9.5px] mt-1 text-right" style={{ opacity: 0.65 }}>
          {hora}
          {meu && m.situacao === 'na_fila' && ' · na fila'}
          {meu && m.situacao === 'falhou' && ' · falhou'}
          {meu && m.autor_nome ? ` · ${m.autor_nome}` : ''}
        </p>
      </div>
      {!meu && onCitar && (
        <button onClick={onCitar} title="Responder citando"
          className="opacity-0 group-hover:opacity-100 transition self-center ml-1 p-1"
          style={{ color: '#8f877f' }}><CornerUpLeft size={13} /></button>
      )}
    </div>
  )
}

// ── O que o NODRI já sabe sobre quem está escrevendo ────────────────────────
// É esta coluna que separa o CRM de "mais uma caixa de entrada": nenhum CRM
// genérico consegue mostrar isso, porque o dado é do próprio sistema.
function PainelCliente({ c }: { c: Conversa }) {
  const [dados, setDados] = useState<any>(null)
  const ct = c.contato || {}
  const nomeBusca = ct.cliente_nome || ct.nome || ct.nome_agenda || ''

  useEffect(() => {
    let vivo = true
    setDados(null)
    if (!nomeBusca) return
    fetch(`/api/relatorios/cliente-detalhe?cliente=${encodeURIComponent(nomeBusca)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (vivo) setDados(d) })
      .catch(() => {})
    return () => { vivo = false }
  }, [nomeBusca])

  return (
    <aside className="w-[288px] flex-shrink-0 border-l overflow-y-auto"
      style={{ background: '#fff', borderColor: '#e8e6e0' }}>
      <div className="p-4">
        <FichaContato ct={ct} />
        <h3 className="font-bold text-[12px] mb-3 mt-4" style={{ color: '#1a1a1a' }}>No sistema</h3>

        {!nomeBusca && (
          <p className="text-[11.5px]" style={{ color: '#8f877f' }}>
            Contato ainda não ligado a uma cliente do relatório.
          </p>
        )}

        {nomeBusca && !dados && (
          <p className="text-[11.5px]" style={{ color: '#8f877f' }}>Procurando o histórico...</p>
        )}

        {dados && (
          <div className="space-y-2.5">
            <Linha rotulo="Visitas" valor={dados.total_visitas ?? '—'} />
            <Linha rotulo="Última visita" valor={dados.ultima_visita || '—'} />
            <Linha rotulo="Já gastou" valor={dados.faturamento != null
              ? `R$ ${Number(dados.faturamento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} />
            <Linha rotulo="Frequência" valor={dados.freq_media_dias
              ? `a cada ${Math.round(dados.freq_media_dias)} dias` : '—'} />
            {Array.isArray(dados.servicos) && dados.servicos.length > 0 && (
              <div className="pt-2">
                <p className="text-[10.5px] font-bold mb-1" style={{ color: '#8f877f' }}>COSTUMA FAZER</p>
                {dados.servicos.slice(0, 5).map((s: any, i: number) => (
                  <p key={i} className="text-[11.5px]" style={{ color: '#6b6860' }}>
                    {s.nome} · {s.vezes}x
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {Array.isArray(ct.etiquetas) && ct.etiquetas.length > 0 && (
          <div className="mt-4 pt-3 border-t" style={{ borderColor: '#e8e6e0' }}>
            <p className="text-[10.5px] font-bold mb-1.5" style={{ color: '#8f877f' }}>ETIQUETAS</p>
            <div className="flex gap-1 flex-wrap">
              {ct.etiquetas.map((e: string, i: number) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[10.5px] font-bold"
                  style={{ background: '#f1eefc', color: '#5b4fcf' }}>{e}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: any }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-[11.5px]" style={{ color: '#8f877f' }}>{rotulo}</span>
      <span className="text-[12px] font-bold text-right" style={{ color: '#1a1a1a' }}>{valor}</span>
    </div>
  )
}

// ── Preço na mão, sem decorar e sem sair da tela ────────────────────────────
//
// "Quanto custa?" é a pergunta mais feita e a mais cara de responder errado.
// Quem decora erra, quem vai procurar demora, e preço errado dito por escrito
// no WhatsApp vira discussão no caixa.
//
// Três toques: Serviço ou Produto → a categoria (ou a marca) → o item. Cada
// item clicado acrescenta uma linha ao que já está escrito, porque a recepção
// responde "corte 80, escova 60" e não uma coisa de cada vez.
//
// Os valores vêm do catálogo do próprio NODRI. Mexeu lá, mudou aqui no mesmo
// instante — não existe segunda lista para alguém esquecer de atualizar.
function PainelPrecos({ onInserir }: { onInserir: (linha: string) => void }) {
  const [aberto, setAberto] = useState(false)
  const [dados, setDados] = useState<any>(null)
  const [lado, setLado] = useState<'servicos' | 'produtos'>('servicos')
  const [grupo, setGrupo] = useState<string>('')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    if (!aberto || dados) return
    fetch('/api/crm/precos').then(r => r.ok ? r.json() : null)
      .then(d => setDados(d || { servicos: [], produtos: [] })).catch(() => {})
  }, [aberto, dados])

  const grupos: any[] = (dados?.[lado] || [])
  const atual = grupos.find(g => g.grupo === grupo) || null

  const achados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return null
    const fora: any[] = []
    for (const g of grupos) {
      for (const it of g.itens) {
        if (String(it.nome || '').toLowerCase().includes(q)) fora.push({ ...it, grupo: g.grupo })
      }
    }
    return fora.slice(0, 40)
  }, [busca, grupos])

  const linha = (it: any) =>
    `${it.nome} — ${it.apartir ? 'a partir de ' : ''}R$ ${Number(it.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)}
        className="mb-2 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1"
        style={{ background: '#e6f1eb', color: '#2f6b4f', border: '1px solid #2f6b4f25' }}>
        <Tag size={12} /> Preços
      </button>
    )
  }

  return (
    <div className="mb-2 rounded-xl border p-2.5" style={{ background: '#fdfcfa', borderColor: '#e8e6e0' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <button onClick={() => { setLado('servicos'); setGrupo('') }}
          className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
          style={lado === 'servicos' ? { background: '#2f6b4f', color: '#fff' } : { background: '#fff', color: '#6b6860', border: '1px solid #e8e6e0' }}>
          Serviço
        </button>
        <button onClick={() => { setLado('produtos'); setGrupo('') }}
          className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
          style={lado === 'produtos' ? { background: '#2f6b4f', color: '#fff' } : { background: '#fff', color: '#6b6860', border: '1px solid #e8e6e0' }}>
          Produto
        </button>
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder={lado === 'servicos' ? 'Buscar serviço...' : 'Buscar produto...'}
          className="flex-1 min-w-0 px-2.5 py-1 rounded-lg text-[11.5px] focus:outline-none"
          style={{ background: '#fff', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />
        <button onClick={() => { setAberto(false); setBusca(''); setGrupo('') }} title="Fechar"
          className="p-1 rounded-lg" style={{ color: '#8f877f' }}><X size={13} /></button>
      </div>

      {!dados && <p className="text-[11.5px]" style={{ color: '#8f877f' }}>Carregando o catálogo...</p>}

      {dados && grupos.length === 0 && (
        <p className="text-[11.5px]" style={{ color: '#8f877f' }}>
          {lado === 'servicos'
            ? 'Nenhum serviço com preço no catálogo. Cadastre em Serviços.'
            : 'Nenhum produto com preço no catálogo. Cadastre em Produtos.'}
        </p>
      )}

      {/* Buscar corta a árvore: quem já sabe o nome não deve navegar. */}
      {achados && (
        <div className="flex gap-1 flex-wrap max-h-40 overflow-y-auto">
          {achados.length === 0 && <p className="text-[11.5px]" style={{ color: '#8f877f' }}>Nada com esse nome.</p>}
          {achados.map((it, i) => (
            <BotaoPreco key={i} texto={`${it.nome} · R$ ${Number(it.preco).toFixed(2).replace('.', ',')}`}
              onClick={() => onInserir(linha(it))} />
          ))}
        </div>
      )}

      {!achados && dados && !atual && grupos.length > 0 && (
        <div className="flex gap-1 flex-wrap max-h-40 overflow-y-auto">
          {grupos.map(g => (
            <button key={g.grupo} onClick={() => setGrupo(g.grupo)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
              style={{ background: '#fff', color: '#1a1a1a', border: '1px solid #e8e6e0' }}>
              {g.grupo} <span style={{ color: '#8f877f' }}>({g.itens.length})</span>
            </button>
          ))}
        </div>
      )}

      {!achados && atual && (
        <>
          <button onClick={() => setGrupo('')}
            className="text-[11px] font-bold mb-1.5" style={{ color: '#5b4fcf' }}>
            ← {atual.grupo}
          </button>
          <div className="flex gap-1 flex-wrap max-h-40 overflow-y-auto">
            {atual.itens.map((it: any, i: number) => (
              <BotaoPreco key={i} texto={`${it.nome} · ${it.apartir ? 'a partir de ' : ''}R$ ${Number(it.preco).toFixed(2).replace('.', ',')}`}
                onClick={() => onInserir(linha(it))} />
            ))}
          </div>
        </>
      )}

      <p className="text-[10px] mt-2" style={{ color: '#8f877f' }}>
        Clicar acrescenta uma linha na resposta. Nada sai daqui sem você clicar em Enviar.
      </p>
    </div>
  )
}

function BotaoPreco({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="px-2.5 py-1 rounded-lg text-[11px] text-left"
      style={{ background: '#fff', color: '#1a1a1a', border: '1px solid #e8e6e0' }}>
      {texto}
    </button>
  )
}


// ── O anexo dentro do balão ─────────────────────────────────────────────────
//
// A foto que a cliente mandou precisa APARECER. Mostrar "[imagem]" obriga
// quem está no CRM a pegar o celular para ver o cabelo que ela mandou — e aí
// o CRM virou um passo a mais no atendimento, não um a menos.
function Anexo({ m }: { m: Mensagem }) {
  const url = m.midia_url
  if (!url) return null

  if (m.tipo === 'imagem' || m.tipo === 'figurinha') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block mb-1">
        <img src={url} alt="Anexo da conversa" loading="lazy"
          className="rounded-lg max-w-full" style={{ maxHeight: 260 }} />
      </a>
    )
  }
  if (m.tipo === 'video') {
    return <video src={url} controls className="rounded-lg max-w-full mb-1" style={{ maxHeight: 260 }} />
  }
  if (m.tipo === 'audio') {
    // Áudio de cliente é onde mora metade da informação de um salão. Tocar
    // aqui dentro evita a viagem até o celular.
    return <audio src={url} controls className="mb-1" style={{ maxWidth: 240 }} />
  }
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="flex items-center gap-1.5 mb-1 text-[12px] font-bold underline">
      <FileText size={13} /> Abrir arquivo
    </a>
  )
}


// ── A ficha da cliente ──────────────────────────────────────────────────────
//
// "Alérgica a amônia." "Não gosta que mexam na franja." "Sempre atrasa 20
// minutos." Isso hoje mora na cabeça de quem atende e some quando a pessoa
// sai de férias. Aqui fica no contato, vale para sempre e aparece para quem
// abrir a conversa daqui a um ano.
//
// O nome também é editável: o WhatsApp entrega "Mari 💅" e é a recepção que
// sabe que ali é a Mariana Prates.
function FichaContato({ ct }: { ct: any }) {
  const [nome, setNome] = useState(ct.nome || '')
  const [obs, setObs] = useState(ct.observacao || '')
  const [gravando, setGravando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  // Trocar de conversa tem que trocar a ficha. Sem isto, a observação de uma
  // cliente apareceria na tela de outra — que é pior do que não ter ficha.
  useEffect(() => {
    setNome(ct.nome || ''); setObs(ct.observacao || ''); setSalvo(false)
  }, [ct.id])

  const mudou = (nome || '') !== (ct.nome || '') || (obs || '') !== (ct.observacao || '')

  async function salvar() {
    if (!ct.id || gravando) return
    setGravando(true)
    try {
      const r = await fetch('/api/crm/contato', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ct.id, nome, observacao: obs }),
      })
      if (r.ok) { ct.nome = nome; ct.observacao = obs; setSalvo(true) }
      else alert((await r.json().catch(() => ({}))).error || 'Não consegui salvar.')
    } finally { setGravando(false) }
  }

  return (
    <div>
      <h3 className="font-bold text-[12px] mb-2" style={{ color: '#1a1a1a' }}>A cliente</h3>
      <input value={nome} onChange={e => { setNome(e.target.value); setSalvo(false) }}
        placeholder="Nome da cliente"
        className="w-full px-2.5 py-1.5 rounded-lg text-[12px] mb-2 focus:outline-none"
        style={{ background: '#fdfcfa', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />
      <textarea value={obs} onChange={e => { setObs(e.target.value); setSalvo(false) }} rows={4}
        placeholder="O que lembrar dela: alergia, preferência, o que não pode fazer..."
        className="w-full px-2.5 py-2 rounded-lg text-[11.5px] resize-none focus:outline-none"
        style={{ background: '#fdfcfa', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />
      {(mudou || salvo) && (
        <button onClick={salvar} disabled={gravando || !mudou}
          className="mt-1.5 w-full py-1.5 rounded-lg text-[11.5px] font-bold disabled:opacity-50"
          style={{ background: salvo && !mudou ? '#e6f1eb' : '#5b4fcf', color: salvo && !mudou ? '#2f6b4f' : '#fff' }}>
          {gravando ? 'Salvando...' : salvo && !mudou ? 'Salvo' : 'Salvar'}
        </button>
      )}
    </div>
  )
}
