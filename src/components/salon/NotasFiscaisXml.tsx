'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  Loader2, Download, Save, Play, Square, CheckCircle2, XCircle, AlertTriangle,
  FileArchive, Puzzle, Settings2,
} from 'lucide-react'

// ── XML das Notas Fiscais ──────────────────────────────────────────────────
//
// O NODRI monta o pedido; quem conversa com o Avec é a extensão do Chrome.
// Mesmo arranjo das guias do MEI, e pelo mesmo motivo: um site não pode
// mexer em outro, e o navegador da pessoa é o único lugar onde a sessão do
// Avec existe.
//
// O que a extensão faz lá dentro: preenche o período, marca "Emissão",
// escolhe o status "Emitidas" e o tipo de nota, manda mostrar 500 por página
// e clica em Buscar. Depois, para cada linha, BUSCA o XML em vez de clicar
// no botão -- o link aponta para consulta.invoicy.com.br e abre na mesma
// aba, então clicar derrubaria a página no meio da fila. Buscando, o
// conteúdo vem para a mão e dá para conferir se é mesmo um XML antes de
// contar como baixado.

const CHAVE_CFG = 'nf_xml_cfg'
const CHAVE_HIST = 'nf_xml_hist'

const DA_PAGINA = 'nodri-nfxml'
const DA_EXT = 'nodri-nfxml-ext'

type Tipo = 'produto' | 'servico'
type EstadoItem = 'espera' | 'ok' | 'erro'

interface Cfg {
  pausaSeg: number
  tentativas: number
  molde: string
  nomeZip: string
}

const CFG_PADRAO: Cfg = {
  pausaSeg: 1,
  tentativas: 3,
  molde: '{nome} - {comanda} - {valor} - {emissao}',
  nomeZip: 'Notas {tipo} {inicio} a {fim}',
}

interface Linha {
  nome: string
  comanda: string
  valor: string
  emissao: string
  temXml: boolean
  estado: EstadoItem
  msg?: string
  arquivo?: string
}

/** Primeiro e último dia do mês passado: é o período que se fecha. */
function mesPassado() {
  const h = new Date()
  const ini = new Date(h.getFullYear(), h.getMonth() - 1, 1)
  const fim = new Date(h.getFullYear(), h.getMonth(), 0)
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { ini: iso(ini), fim: iso(fim) }
}

const brDe = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso
}

export default function NotasFiscaisXml() {
  const padrao = mesPassado()

  const [tipo, setTipo] = useState<Tipo>('produto')
  const [dataIni, setDataIni] = useState(padrao.ini)
  const [dataFim, setDataFim] = useState(padrao.fim)
  const [cfg, setCfg] = useState<Cfg>(CFG_PADRAO)
  const [cfgSalva, setCfgSalva] = useState<Cfg>(CFG_PADRAO)
  const [ajustes, setAjustes] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const [extStatus, setExtStatus] = useState<'checando' | 'ok' | 'ausente'>('checando')
  const [extVersao, setExtVersao] = useState('')

  const [rodando, setRodando] = useState(false)
  const [etapa, setEtapa] = useState('')
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [totalTela, setTotalTela] = useState('')
  const [resumo, setResumo] = useState<{ ok: number; erros: number; zip?: string; erro?: string } | null>(null)
  const linhasRef = useRef<Linha[]>([])

  const sujo = JSON.stringify(cfg) !== JSON.stringify(cfgSalva)

  // ── Configuração guardada ──
  useEffect(() => {
    fetch(`/api/salon/grid?chave=${CHAVE_CFG}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d && typeof d === 'object') {
          const c = { ...CFG_PADRAO, ...d }
          setCfg(c); setCfgSalva(c)
        }
      })
      .catch(() => { })
      .finally(() => setCarregando(false))
  }, [])

  async function salvarCfg() {
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: CHAVE_CFG, doc: cfg }),
      })
      if (!r.ok) throw new Error('falhou')
      setCfgSalva(cfg)
      toast.success('Ajustes salvos')
    } catch { toast.error('Não deu para salvar.') } finally { setSalvando(false) }
  }

  // ── Handshake com a extensão ──
  const pingar = useCallback(() => {
    setExtStatus('checando')
    let respondeu = false
    const ouvir = (ev: MessageEvent) => {
      if (ev.source !== window) return
      const d = ev.data
      if (d?.fonte === DA_EXT && d?.tipo === 'pong') {
        respondeu = true
        setExtVersao(String(d.versao || ''))
        setExtStatus('ok')
      }
    }
    window.addEventListener('message', ouvir)
    window.postMessage({ fonte: DA_PAGINA, tipo: 'ping' }, window.location.origin)
    setTimeout(() => {
      window.removeEventListener('message', ouvir)
      if (!respondeu) setExtStatus('ausente')
    }, 1200)
  }, [])
  useEffect(() => { pingar() }, [pingar])

  // ── Relatos da extensão ──
  useEffect(() => {
    const ouvir = (ev: MessageEvent) => {
      if (ev.source !== window) return
      const d = ev.data
      if (d?.fonte !== DA_EXT) return

      if (d.tipo === 'etapa') setEtapa(String(d.msg || ''))

      if (d.tipo === 'lista') {
        const novas: Linha[] = (d.itens || []).map((i: any) => ({
          nome: i.nome, comanda: i.comanda, valor: i.valor, emissao: i.emissao,
          temXml: !!i.temXml, estado: 'espera' as EstadoItem,
        }))
        linhasRef.current = novas
        setLinhas(novas)
        setTotalTela(String(d.totalTela || ''))
        setEtapa(`${novas.length} nota(s) encontrada(s). Baixando…`)
      }

      if (d.tipo === 'item') {
        const i = Number(d.i)
        const atual = [...linhasRef.current]
        if (atual[i]) {
          if (d.tentando) {
            atual[i] = { ...atual[i], msg: d.msg }
          } else {
            atual[i] = {
              ...atual[i],
              estado: d.ok ? 'ok' : 'erro',
              msg: d.ok ? '' : String(d.msg || 'não deu para baixar'),
              arquivo: d.arquivo,
            }
          }
          linhasRef.current = atual
          setLinhas(atual)
        }
      }

      if (d.tipo === 'fim') {
        setRodando(false)
        setEtapa('')
        if (d.erro) {
          setResumo({ ok: d.ok || 0, erros: d.erros || 0, erro: String(d.erro) })
          toast.error(String(d.erro))
          return
        }
        if (d.cancelado) { setResumo(null); toast('Cancelado.'); return }
        if (d.vazio) {
          setResumo({ ok: 0, erros: 0 })
          setTotalTela(String(d.totalTela || ''))
          toast('Nenhuma nota emitida nesse período.')
          return
        }
        const r = { ok: Number(d.ok || 0), erros: Number(d.erros || 0), zip: String(d.zip || '') }
        setResumo(r)
        if (d.totalTela) setTotalTela(String(d.totalTela))
        guardarHistorico({ ...r, tipo, dataIni, dataFim, totalTela: d.totalTela || '' })
        if (r.erros === 0) toast.success(`${r.ok} XML(s) no arquivo ${r.zip}`)
        else toast(`${r.ok} baixados, ${r.erros} com problema.`, { icon: '' })
      }
    }
    window.addEventListener('message', ouvir)
    return () => window.removeEventListener('message', ouvir)
    // tipo/dataIni/dataFim entram no histórico: o ouvinte precisa dos atuais
  }, [tipo, dataIni, dataFim])

  // Guarda o resumo de cada busca. É daqui que sai, depois, o comparativo
  // entre produto e serviço — sem isso a segunda busca não teria com o que
  // comparar.
  async function guardarHistorico(r: any) {
    try {
      const atual = await fetch(`/api/salon/grid?chave=${CHAVE_HIST}`, { credentials: 'include' })
        .then(x => (x.ok ? x.json() : null)).catch(() => null)
      const lista = Array.isArray(atual?.registros) ? atual.registros : []
      lista.unshift({ ...r, em: new Date().toISOString() })
      await fetch('/api/salon/grid', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: CHAVE_HIST, doc: { registros: lista.slice(0, 60) } }),
      })
    } catch (e) { console.warn('[NODRI] histórico de NF não gravado:', e) }
  }

  function iniciar() {
    if (extStatus !== 'ok') { toast.error('Extensão do Chrome não encontrada.'); return }
    if (!dataIni || !dataFim) { toast.error('Escolha o período.'); return }
    if (dataIni > dataFim) { toast.error('A data de início é depois da data final.'); return }

    const nomeZip = (cfg.nomeZip || CFG_PADRAO.nomeZip)
      .split('{tipo}').join(tipo === 'produto' ? 'Produto' : 'Servico')
      .split('{inicio}').join(brDe(dataIni))
      .split('{fim}').join(brDe(dataFim))

    setRodando(true); setResumo(null); setLinhas([]); linhasRef.current = []
    setTotalTela(''); setEtapa('Falando com a extensão…')

    window.postMessage({
      fonte: DA_PAGINA, tipo: 'iniciar',
      job: {
        tipo, dataIni, dataFim,
        pausaMs: Math.round(Math.max(0, Math.min(30, cfg.pausaSeg)) * 1000),
        tentativas: cfg.tentativas,
        molde: cfg.molde,
        nomeZip,
      },
    }, window.location.origin)
  }

  function cancelar() {
    window.postMessage({ fonte: DA_PAGINA, tipo: 'cancelar' }, window.location.origin)
    setRodando(false); setEtapa('')
  }

  if (carregando) {
    return <div className="flex items-center gap-2 text-nodri-t3 text-[13px] p-6">
      <Loader2 size={15} className="animate-spin" /> Carregando…
    </div>
  }

  const prontas = linhas.filter(l => l.estado === 'ok').length
  const falhas = linhas.filter(l => l.estado === 'erro').length

  return (
    <div className="space-y-4">
      {/* ── A extensão ── */}
      {extStatus !== 'ok' && (
        <div className="border border-amber-500/40 bg-amber-500/10 rounded-xl p-3 space-y-2">
          <p className="text-[12.5px] font-bold text-amber-700 flex items-center gap-1.5">
            <Puzzle size={14} />
            {extStatus === 'checando' ? 'Procurando a extensão…' : 'Extensão do Chrome não encontrada'}
          </p>
          {extStatus === 'ausente' && (
            <>
              <p className="text-[11.5px] text-nodri-t2 leading-relaxed">
                Esta tela não fala com o Avec sozinha — quem faz isso é uma extensão
                que roda no seu Chrome, onde a sua sessão do Avec já está aberta.
                Baixe, descompacte numa pasta, abra <b>chrome://extensions</b>,
                ligue o <b>Modo do desenvolvedor</b> e use <b>Carregar sem compactação</b>
                apontando para a pasta.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <a href="/extensao-nf-xml.zip" download
                  className="flex items-center gap-1.5 bg-nodri-cyan text-black px-3 py-1.5 rounded-lg text-[12px] font-bold">
                  <Download size={13} /> Baixar a extensão
                </a>
                <button onClick={pingar}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-bold border border-nodri-border text-nodri-t2">
                  Já instalei — procurar de novo
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── O pedido ── */}
      <div className="border border-nodri-border rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-bold text-nodri-t2 w-24">Tipo de nota</span>
          {([['produto', 'Produto'], ['servico', 'Serviço']] as const).map(([v, rot]) => (
            <button key={v} onClick={() => setTipo(v)} disabled={rodando}
              className={'px-3 py-1.5 rounded-lg text-[12px] font-bold border transition disabled:opacity-50 '
                + (tipo === v
                  ? 'border-nodri-cyan text-nodri-cyan bg-nodri-cyan/10'
                  : 'border-nodri-border text-nodri-t2')}>
              {rot}
            </button>
          ))}
          {tipo === 'servico' && (
            <span className="text-[11px] text-amber-600">
              Serviço ainda não foi testado contra o Avec — o produto é que foi.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-bold text-nodri-t2 w-24">Período</span>
          <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} disabled={rodando}
            className="bg-nodri-surface border border-nodri-border rounded-lg px-2.5 py-1.5 text-[12.5px] outline-none focus:border-nodri-cyan disabled:opacity-50" />
          <span className="text-[12px] text-nodri-t3">até</span>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} disabled={rodando}
            className="bg-nodri-surface border border-nodri-border rounded-lg px-2.5 py-1.5 text-[12.5px] outline-none focus:border-nodri-cyan disabled:opacity-50" />
          <span className="text-[11px] text-nodri-t3">pela data de emissão</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          {!rodando ? (
            <button onClick={iniciar} disabled={extStatus !== 'ok'}
              className="flex items-center gap-1.5 bg-nodri-cyan text-black px-4 py-2 rounded-lg text-[12.5px] font-bold disabled:opacity-40">
              <Play size={14} /> Buscar e baixar os XMLs
            </button>
          ) : (
            <button onClick={cancelar}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-bold border border-red-400 text-red-500">
              <Square size={13} /> Parar
            </button>
          )}
          <button onClick={() => setAjustes(v => !v)}
            className={'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold border border-nodri-border transition '
              + (ajustes ? 'text-nodri-cyan' : 'text-nodri-t2')}>
            <Settings2 size={13} /> Ajustes
          </button>
          {extStatus === 'ok' && (
            <span className="text-[11px] text-nodri-t3 ml-auto">Extensão v{extVersao}</span>
          )}
        </div>

        <p className="text-[11px] text-nodri-t3 leading-relaxed">
          Deixe o Avec aberto e com a sua conta conectada. Se a tela de Notas
          Fiscais não estiver aberta, a extensão abre sozinha.
        </p>
      </div>

      {/* ── Ajustes ── */}
      {ajustes && (
        <div className="border border-nodri-border rounded-xl p-3 space-y-3 bg-nodri-surface">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[11.5px] font-bold text-nodri-t2 mb-1">Pausa entre uma nota e outra</p>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={30} step={0.5} value={cfg.pausaSeg}
                  onChange={e => setCfg({ ...cfg, pausaSeg: Number(e.target.value) })}
                  className="w-20 bg-nodri-bg border border-nodri-border rounded-lg px-2 py-1.5 text-[12.5px] outline-none focus:border-nodri-cyan" />
                <span className="text-[12px] text-nodri-t3">segundos</span>
              </div>
            </div>
            <div>
              <p className="text-[11.5px] font-bold text-nodri-t2 mb-1">Tentativas por nota</p>
              <input type="number" min={1} max={5} value={cfg.tentativas}
                onChange={e => setCfg({ ...cfg, tentativas: Number(e.target.value) })}
                className="w-20 bg-nodri-bg border border-nodri-border rounded-lg px-2 py-1.5 text-[12.5px] outline-none focus:border-nodri-cyan" />
            </div>
          </div>

          <div>
            <p className="text-[11.5px] font-bold text-nodri-t2 mb-1">Nome de cada arquivo</p>
            <input value={cfg.molde} onChange={e => setCfg({ ...cfg, molde: e.target.value })}
              className="w-full bg-nodri-bg border border-nodri-border rounded-lg px-2.5 py-1.5 text-[12.5px] outline-none focus:border-nodri-cyan" />
            <p className="text-[10.5px] text-nodri-t3 mt-1">
              {'{nome}'} {'{comanda}'} {'{valor}'} {'{emissao}'} {'{rps}'} — o .xml entra sozinho no fim.
            </p>
          </div>

          <div>
            <p className="text-[11.5px] font-bold text-nodri-t2 mb-1">Nome do arquivo .zip</p>
            <input value={cfg.nomeZip} onChange={e => setCfg({ ...cfg, nomeZip: e.target.value })}
              className="w-full bg-nodri-bg border border-nodri-border rounded-lg px-2.5 py-1.5 text-[12.5px] outline-none focus:border-nodri-cyan" />
            <p className="text-[10.5px] text-nodri-t3 mt-1">{'{tipo}'} {'{inicio}'} {'{fim}'}</p>
          </div>

          <p className="text-[10.5px] text-nodri-t3 leading-relaxed">
            A pausa existe porque internet ruim derruba download. Se alguma
            nota falhar, a extensão tenta de novo esperando mais a cada vez —
            e só conta como baixada quando o conteúdo que voltou é mesmo um XML.
          </p>

          {sujo && (
            <button onClick={salvarCfg} disabled={salvando}
              className="flex items-center gap-1.5 bg-nodri-cyan text-black px-3.5 py-1.5 rounded-lg text-[12px] font-bold disabled:opacity-50">
              {salvando ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar ajustes
            </button>
          )}
        </div>
      )}

      {/* ── Andamento ── */}
      {etapa && (
        <p className="text-[12.5px] text-nodri-t2 flex items-center gap-2">
          <Loader2 size={13} className="animate-spin text-nodri-cyan" /> {etapa}
        </p>
      )}

      {!!linhas.length && (
        <div className="border border-nodri-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-2 bg-nodri-surface border-b border-nodri-border text-[11.5px] flex-wrap">
            <span className="font-bold text-nodri-t2">{linhas.length} nota(s)</span>
            <span className="text-emerald-600 font-bold">{prontas} prontas</span>
            {!!falhas && <span className="text-red-500 font-bold">{falhas} com problema</span>}
            {totalTela && <span className="text-nodri-t3 ml-auto">{totalTela}</span>}
          </div>
          <div className="max-h-[46vh] overflow-y-auto divide-y divide-nodri-border/60">
            {linhas.map((l, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-1.5">
                <span className="shrink-0 mt-0.5">
                  {l.estado === 'ok' ? <CheckCircle2 size={13} className="text-emerald-600" />
                    : l.estado === 'erro' ? <XCircle size={13} className="text-red-500" />
                      : <span className="inline-block w-[13px] h-[13px] rounded-full border border-nodri-border" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-nodri-t1 truncate">
                    {l.comanda} · {l.nome}
                  </p>
                  <p className="text-[10.5px] text-nodri-t3">
                    {l.valor} · {l.emissao}
                    {l.msg ? <span className="text-red-500"> — {l.msg}</span> : null}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Resultado ── */}
      {resumo && (
        <div className={'border rounded-xl p-3 '
          + (resumo.erro ? 'border-red-400/50 bg-red-500/5'
            : resumo.erros ? 'border-amber-500/40 bg-amber-500/10'
              : 'border-emerald-500/40 bg-emerald-500/5')}>
          {resumo.erro ? (
            <p className="text-[12.5px] text-red-600 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {resumo.erro}
            </p>
          ) : (
            <>
              <p className="text-[13px] font-bold text-nodri-t1 flex items-center gap-2">
                <FileArchive size={15} className="text-nodri-cyan" />
                {resumo.zip || 'Busca concluída'}
              </p>
              <p className="text-[11.5px] text-nodri-t2 mt-1">
                {resumo.ok} XML(s) no arquivo
                {resumo.erros ? ` · ${resumo.erros} não vieram` : ''}
                {totalTela ? ` · ${totalTela}` : ''}
              </p>
              <p className="text-[10.5px] text-nodri-t3 mt-1.5 leading-relaxed">
                O .zip foi para a pasta de downloads do Chrome.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
