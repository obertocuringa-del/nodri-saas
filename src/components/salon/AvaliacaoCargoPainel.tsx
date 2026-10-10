'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  Loader2, Save, Plus, Trash2, ChevronUp, ChevronDown, X, Link2, Copy, ShieldAlert,
  Lock, Unlock, BarChart3, ListChecks, Printer, ChevronRight,
} from 'lucide-react'
import type { DocCargo } from '@/lib/descricaoCargoModelo'
import {
  type FichaAval, type CriterioAval, type RodadaAval, type TipoAvaliador,
  TIPOS_AVALIADOR, ROTULO_TIPO, fichaVazia, lerFicha,
  novoIdCrit, porSecao, calcular, corDaNota, NOTA_QUE_PEDE_MOTIVO,
} from '@/lib/avaliacaoCargoModelo'

// ── Avaliação 360 do cargo: o painel de dentro ─────────────────────────────
//
// Três coisas num lugar só, porque são três passos da mesma tarefa:
//
//   FICHA      — quais pontos se avalia. Nasce da descrição de cargo com um
//                clique e dali em diante é texto editável como qualquer
//                outro: acrescentar, apagar, mudar de ordem.
//   AVALIAÇÕES — cada vez que se abre uma, o sistema congela a ficha e gera
//                um link. O link é público de propósito: a colega de equipe
//                que vai responder não tem conta no NODRI.
//   RESULTADO  — média por ponto e por voz, e principalmente a DIFERENÇA
//                entre como a pessoa se vê e como os outros a veem.

const chaveFicha = (setorId: string) => `aval_cargo_${setorId}`

/** Dois pontos com a mesma letra são o mesmo ponto, mesmo escritos diferente. */
const norma = (s: string) => s.toLowerCase().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

type Aba = 'ficha' | 'rodadas' | 'resultado'

export default function AvaliacaoCargoPainel({ setorId, doc, salao, onFechar }: {
  setorId: string
  /** A descrição de cargo aberta na tela: é dela que saem os pontos. */
  doc: DocCargo
  salao?: string
  onFechar: () => void
}) {
  const [aba, setAba] = useState<Aba>('ficha')
  const [ficha, setFicha] = useState<FichaAval>(() => fichaVazia(doc.cargo))
  const [rodadas, setRodadas] = useState<RodadaAval[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sujo, setSujo] = useState(false)
  const [verRodada, setVerRodada] = useState<string>('')

  const carregar = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([
        fetch(`/api/salon/grid?chave=${chaveFicha(setorId)}`).then(x => (x.ok ? x.json() : null)),
        fetch(`/api/salon/avaliacao-cargo?setor=${setorId}`).then(x => (x.ok ? x.json() : null)),
      ])
      setFicha(lerFicha(f, doc.cargo))
      const lista: RodadaAval[] = r?.rodadas || []
      setRodadas(lista)
      // Com avaliação já aberta, o que interessa é o resultado, não a ficha.
      if (lista.length) { setAba('resultado'); setVerRodada(lista[0].id) }
    } catch { /* fica o vazio */ }
    setCarregando(false)
  }, [setorId, doc.cargo])
  useEffect(() => { carregar() }, [carregar])

  function mexer(fn: (f: FichaAval) => FichaAval) {
    setFicha(f => fn(structuredClone(f)))
    setSujo(true)
  }

  async function salvarFicha() {
    setSalvando(true)
    const paraGravar = { ...ficha, atualizado_em: new Date().toISOString() }
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: chaveFicha(setorId), doc: paraGravar }),
      })
      if (!r.ok) { toast.error('Não deu para salvar a ficha.'); return }
      setFicha(paraGravar); setSujo(false)
      toast.success('Ficha salva')
    } catch { toast.error('Sem conexão.') } finally { setSalvando(false) }
  }

  const rodadaAtual = useMemo(
    () => rodadas.find(r => r.id === verRodada) || rodadas[0] || null,
    [rodadas, verRodada],
  )

  if (carregando) {
    return (
      <div className="border border-nodri-border rounded-xl p-6 flex items-center gap-2 text-nodri-t3 text-[13px]">
        <Loader2 size={15} className="animate-spin" /> Abrindo a avaliação…
      </div>
    )
  }

  return (
    <div className="border border-nodri-border rounded-xl overflow-hidden">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-nodri-border bg-nodri-surface">
        <BarChart3 size={15} className="text-nodri-cyan shrink-0" />
        <p className="text-[13px] font-bold text-nodri-t1 flex-1 min-w-0 truncate">
          Avaliação 360 — {ficha.cargo || doc.cargo}
        </p>
        {sujo && (
          <button onClick={salvarFicha} disabled={salvando}
            className="flex items-center gap-1.5 bg-nodri-cyan text-black px-3 py-1.5 rounded-lg text-[11.5px] font-bold disabled:opacity-50">
            {salvando ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar ficha
          </button>
        )}
        <button onClick={onFechar} title="Fechar"
          className="text-nodri-t3 hover:text-nodri-t1 p-1"><X size={16} /></button>
      </div>

      {/* ── Abas ── */}
      <div className="flex border-b border-nodri-border text-[12px] font-bold">
        {([
          ['ficha', 'Pontos avaliados', <ListChecks key="i" size={13} />],
          ['rodadas', `Avaliações${rodadas.length ? ` (${rodadas.length})` : ''}`, <Link2 key="i" size={13} />],
          ['resultado', 'Resultado', <BarChart3 key="i" size={13} />],
        ] as const).map(([k, rot, ic]) => (
          <button key={k} onClick={() => setAba(k as Aba)}
            className={'flex items-center justify-center gap-1.5 flex-1 px-2 py-2.5 transition '
              + (aba === k
                ? 'text-nodri-cyan border-b-2 border-nodri-cyan'
                : 'text-nodri-t3 hover:text-nodri-t2')}>
            {ic} <span className="truncate">{rot}</span>
          </button>
        ))}
      </div>

      <div className="p-3">
        {aba === 'ficha' && (
          <AbaFicha ficha={ficha} doc={doc} mexer={mexer} />
        )}
        {aba === 'rodadas' && (
          <AbaRodadas setorId={setorId} ficha={ficha} rodadas={rodadas}
            recarregar={carregar} onVer={id => { setVerRodada(id); setAba('resultado') }} />
        )}
        {aba === 'resultado' && (
          <AbaResultado rodadas={rodadas} atual={rodadaAtual}
            onTrocar={setVerRodada} salao={salao} />
        )}
      </div>
    </div>
  )
}

// ══ Aba 1: os pontos ═══════════════════════════════════════════════════════

function AbaFicha({ ficha, doc, mexer }: {
  ficha: FichaAval
  doc: DocCargo
  mexer: (fn: (f: FichaAval) => FichaAval) => void
}) {
  const [novo, setNovo] = useState('')
  const [novaSecao, setNovaSecao] = useState('')

  const secoesExistentes = Array.from(new Set(ficha.criterios.map(c => c.secao))).filter(Boolean)

  function acrescentar() {
    const texto = novo.trim()
    if (!texto) return
    mexer(f => ({
      ...f,
      criterios: [...f.criterios, {
        id: novoIdCrit(), texto,
        secao: novaSecao.trim() || 'Geral',
        para: ['auto', 'gerente', 'equipe'],
      }],
    }))
    setNovo('')
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11.5px] font-bold text-nodri-t2 mb-1.5">Texto de abertura (opcional)</p>
        <textarea value={ficha.apresentacao || ''} rows={2}
          onChange={e => mexer(f => ({ ...f, apresentacao: e.target.value }))}
          placeholder="O que quem for avaliar lê antes de começar. Ex.: a nota é sobre o semestre, não sobre a última semana."
          className="w-full bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[12.5px] outline-none focus:border-nodri-cyan resize-y leading-relaxed" />
      </div>

      {!ficha.criterios.length ? (
        <div className="text-center py-9 border border-dashed border-nodri-border rounded-xl">
          <p className="text-[13px] text-nodri-t3 mb-1">Nenhum ponto na ficha ainda.</p>
          <p className="text-[11.5px] text-nodri-t3">
            Use "Acrescentar um ponto", no fim desta aba, para escrever o primeiro.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {porSecao(ficha).map(g => (
            <div key={g.secao}>
              <p className="text-[10.5px] font-bold text-nodri-cyan uppercase tracking-wider mb-1.5">
                {g.secao}
              </p>
              <div className="space-y-1.5">
                {g.criterios.map(c => {
                  const i = ficha.criterios.findIndex(x => x.id === c.id)
                  return (
                    <LinhaCriterio key={c.id} c={c}
                      primeiro={i === 0} ultimo={i === ficha.criterios.length - 1}
                      secoes={secoesExistentes}
                      onMudar={novo => mexer(f => { f.criterios[i] = novo; return f })}
                      onApagar={() => mexer(f => { f.criterios.splice(i, 1); return f })}
                      onMover={d => mexer(f => {
                        const j = i + d
                        if (j < 0 || j >= f.criterios.length) return f
                        ;[f.criterios[i], f.criterios[j]] = [f.criterios[j], f.criterios[i]]
                        return f
                      })} />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Acrescentar à mão ── */}
      <div className="border-t border-nodri-border pt-3 space-y-2">
        <p className="text-[11.5px] font-bold text-nodri-t2">Acrescentar um ponto</p>
        <div className="flex gap-2 flex-wrap">
          <input value={novo} onChange={e => setNovo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') acrescentar() }}
            placeholder="Ex.: Resolve o problema do cliente sem passar adiante"
            className="flex-1 min-w-[180px] bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[12.5px] outline-none focus:border-nodri-cyan" />
          <input value={novaSecao} onChange={e => setNovaSecao(e.target.value)}
            list="secoes-aval" placeholder="Seção"
            className="w-[130px] bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[12.5px] outline-none focus:border-nodri-cyan" />
          <datalist id="secoes-aval">
            {secoesExistentes.map(s => <option key={s} value={s} />)}
          </datalist>
          <button onClick={acrescentar} disabled={!novo.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold border border-nodri-border text-nodri-t2 disabled:opacity-40">
            <Plus size={14} /> Incluir
          </button>
        </div>
      </div>
    </div>
  )
}

function LinhaCriterio({ c, primeiro, ultimo, secoes, onMudar, onApagar, onMover }: {
  c: CriterioAval
  primeiro: boolean
  ultimo: boolean
  secoes: string[]
  onMudar: (c: CriterioAval) => void
  onApagar: () => void
  onMover: (d: number) => void
}) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="border border-nodri-border rounded-lg bg-nodri-surface">
      <div className="flex items-start gap-1.5 p-2">
        <div className="flex-1 min-w-0">
          <textarea value={c.texto} rows={1}
            onChange={e => onMudar({ ...c, texto: e.target.value })}
            className="w-full bg-transparent text-[12.5px] outline-none resize-none leading-relaxed min-h-[34px] py-1" />
          {c.critico && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-500/15 px-1.5 py-0.5 rounded">
              <ShieldAlert size={10} /> não negociável
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => setAberto(v => !v)} title="Quem responde / seção"
            className={'p-1 rounded ' + (aberto ? 'text-nodri-cyan' : 'text-nodri-t3 hover:text-nodri-cyan')}>
            <ChevronRight size={13} className={aberto ? 'rotate-90 transition' : 'transition'} />
          </button>
          <button onClick={() => onMover(-1)} disabled={primeiro}
            className="p-1 text-nodri-t3 hover:text-nodri-t1 disabled:opacity-25"><ChevronUp size={13} /></button>
          <button onClick={() => onMover(1)} disabled={ultimo}
            className="p-1 text-nodri-t3 hover:text-nodri-t1 disabled:opacity-25"><ChevronDown size={13} /></button>
          <button onClick={onApagar} title="Apagar este ponto"
            className="p-1 text-nodri-t3 hover:text-red-500"><Trash2 size={13} /></button>
        </div>
      </div>

      {aberto && (
        <div className="px-2 pb-2 pt-1 border-t border-nodri-border/60 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-nodri-t3">Responde:</span>
            {TIPOS_AVALIADOR.map(t => {
              const on = c.para.includes(t.tipo)
              return (
                <button key={t.tipo}
                  onClick={() => onMudar({
                    ...c,
                    para: on ? c.para.filter(p => p !== t.tipo) : [...c.para, t.tipo],
                  })}
                  className={'px-2 py-0.5 rounded-full text-[11px] font-bold border transition '
                    + (on
                      ? 'border-nodri-cyan text-nodri-cyan bg-nodri-cyan/10'
                      : 'border-nodri-border text-nodri-t3')}>
                  {t.rotulo}
                </button>
              )
            })}
          </div>
          {!c.para.length && (
            <p className="text-[11px] text-amber-600">
              Sem ninguém marcado, este ponto não aparece para nenhum avaliador.
            </p>
          )}
          <label className="flex items-start gap-2 text-[11.5px] text-nodri-t2 cursor-pointer">
            <input type="checkbox" checked={!!c.critico} className="mt-0.5"
              onChange={e => onMudar({ ...c, critico: e.target.checked })} />
            <span>
              <b>Não negociável.</b> Nota baixa aqui aparece em separado no
              resultado, fora da média — média de 8 esconde um 2 em
              honestidade, e é justamente esse 2 que precisa ser visto.
            </span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-nodri-t3 shrink-0">Seção:</span>
            <input value={c.secao} list="secoes-aval"
              onChange={e => onMudar({ ...c, secao: e.target.value })}
              className="flex-1 bg-nodri-bg border border-nodri-border rounded px-2 py-1 text-[11.5px] outline-none focus:border-nodri-cyan" />
          </div>
          <p className="text-[10.5px] text-nodri-t3 leading-relaxed">
            Deixe fora da equipe o que ela não tem como saber — valor de
            comissão, documento, conversa fechada. Nota chutada vira média.
          </p>
        </div>
      )}
    </div>
  )
}

// ══ Aba 2: as avaliações abertas ═══════════════════════════════════════════

function AbaRodadas({ setorId, ficha, rodadas, recarregar, onVer }: {
  setorId: string
  ficha: FichaAval
  rodadas: RodadaAval[]
  recarregar: () => void
  onVer: (id: string) => void
}) {
  const [titulo, setTitulo] = useState('')
  const [avaliado, setAvaliado] = useState('')
  const [abrindo, setAbrindo] = useState(false)

  async function abrir() {
    if (!ficha.criterios.length) {
      toast.error('Monte a ficha de pontos antes de abrir a avaliação.'); return
    }
    setAbrindo(true)
    try {
      const r = await fetch('/api/salon/avaliacao-cargo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setorId, cargo: ficha.cargo,
          titulo: titulo.trim() || `Avaliação de ${new Date().toLocaleDateString('pt-BR')}`,
          avaliado: avaliado.trim() || null, ficha,
        }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error || 'Não deu para abrir.'); return }
      toast.success('Avaliação aberta — o link já funciona')
      setTitulo(''); setAvaliado('')
      recarregar()
    } catch { toast.error('Sem conexão.') } finally { setAbrindo(false) }
  }

  async function trancar(id: string, aberta: boolean) {
    const r = await fetch('/api/salon/avaliacao-cargo', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, aberta }),
    })
    if (!r.ok) { toast.error('Não deu para mudar.'); return }
    toast.success(aberta ? 'Reaberta' : 'Encerrada')
    recarregar()
  }

  async function apagar(id: string, titulo: string) {
    if (!confirm(`Apagar "${titulo}" e todas as respostas dela? Isso não volta.`)) return
    const r = await fetch(`/api/salon/avaliacao-cargo?id=${id}`, { method: 'DELETE' })
    if (!r.ok) { const d = await r.json().catch(() => null); toast.error(d?.error || 'Não deu para apagar.'); return }
    toast.success('Apagada')
    recarregar()
  }

  return (
    <div className="space-y-3">
      {/* ── Abrir ── */}
      <div className="border border-nodri-border rounded-xl p-3 space-y-2 bg-nodri-surface">
        <p className="text-[12px] font-bold text-nodri-t2">Abrir uma avaliação</p>
        <div className="flex gap-2 flex-wrap">
          <input value={titulo} onChange={e => setTitulo(e.target.value)}
            placeholder="Nome. Ex.: Avaliação semestral 2026.2"
            className="flex-1 min-w-[170px] bg-nodri-bg border border-nodri-border rounded-lg px-3 py-2 text-[12.5px] outline-none focus:border-nodri-cyan" />
          <input value={avaliado} onChange={e => setAvaliado(e.target.value)}
            placeholder="Quem está sendo avaliado (opcional)"
            className="flex-1 min-w-[170px] bg-nodri-bg border border-nodri-border rounded-lg px-3 py-2 text-[12.5px] outline-none focus:border-nodri-cyan" />
        </div>
        <button onClick={abrir} disabled={abrindo || !ficha.criterios.length}
          className="flex items-center gap-1.5 bg-nodri-cyan text-black px-4 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50">
          {abrindo ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
          {ficha.criterios.length
            ? `Abrir com ${ficha.criterios.length} ${ficha.criterios.length === 1 ? 'ponto' : 'pontos'}`
            : 'Monte a ficha primeiro'}
        </button>
        <p className="text-[11px] text-nodri-t3 leading-relaxed">
          Ao abrir, os pontos de hoje são guardados dentro dela. Mexer na ficha
          depois não muda o que já foi respondido aqui.
        </p>
      </div>

      {!rodadas.length ? (
        <p className="text-[12.5px] text-nodri-t3 text-center py-5">
          Nenhuma avaliação aberta ainda.
        </p>
      ) : rodadas.map(r => (
        <CartaoRodada key={r.id} r={r}
          onVer={() => onVer(r.id)}
          onTrancar={() => trancar(r.id, !r.aberta)}
          onApagar={() => apagar(r.id, r.titulo)} />
      ))}
    </div>
  )
}

function CartaoRodada({ r, onVer, onTrancar, onApagar }: {
  r: RodadaAval
  onVer: () => void
  onTrancar: () => void
  onApagar: () => void
}) {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  // Um link por papel, cada um com o seu token sorteado. Não existe link
  // "geral" de propósito: se a pessoa pudesse escolher na tela de onde está
  // avaliando, o gerente responderia em nome da equipe e a média do grupo
  // viraria o que ele quisesse.
  const LINKS: Array<{ tipo: TipoAvaliador; rotulo: string; token: string }> = [
    { tipo: 'auto', rotulo: 'Autoavaliação', token: r.token_auto },
    { tipo: 'gerente', rotulo: 'Gerente', token: r.token_gerente },
    { tipo: 'equipe', rotulo: 'Equipe', token: r.token_equipe },
  ]
  const link = (token: string) => `${base}/avaliar/${token}`

  function copiar(url: string, oque: string) {
    navigator.clipboard?.writeText(url)
      .then(() => toast.success(`Link ${oque} copiado`))
      .catch(() => toast.error('Não deu para copiar — selecione o endereço à mão.'))
  }

  const n = (r.respostas || []).length

  return (
    <div className="border border-nodri-border rounded-xl p-3 space-y-2.5">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-nodri-t1">{r.titulo}</p>
          <p className="text-[11.5px] text-nodri-t3 mt-0.5">
            {r.avaliado ? `${r.avaliado} · ` : ''}
            {new Date(r.criado_em).toLocaleDateString('pt-BR')} ·{' '}
            {n ? `${n} ${n === 1 ? 'resposta' : 'respostas'}` : 'sem resposta ainda'}
          </p>
        </div>
        <span className={'text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0 '
          + (r.aberta ? 'bg-emerald-500/15 text-emerald-700' : 'bg-nodri-border text-nodri-t3')}>
          {r.aberta ? 'aberta' : 'encerrada'}
        </span>
      </div>

      {r.aberta && (
        <div className="space-y-2">
          <p className="text-[11px] text-nodri-t3 leading-relaxed">
            Um link para cada um. Mande o de baixo para quem vai responder
            naquele papel — o link já diz ao sistema de onde a resposta vem,
            e quem recebe não escolhe nem precisa de login.
          </p>
          {LINKS.map(l => (
            <div key={l.tipo}>
              <p className="text-[10.5px] font-bold text-nodri-cyan uppercase tracking-wide mb-1">
                {l.rotulo}
              </p>
              <div className="flex items-center gap-1.5 bg-nodri-surface border border-nodri-border rounded-lg px-2.5 py-1.5">
                <Link2 size={12} className="text-nodri-t3 shrink-0" />
                <input readOnly value={l.token ? link(l.token) : 'gerando…'}
                  onClick={e => e.currentTarget.select()}
                  className="flex-1 min-w-0 bg-transparent text-[11.5px] text-nodri-t2 outline-none" />
                <button onClick={() => copiar(link(l.token), l.rotulo.toLowerCase())}
                  title={`Copiar o link de ${l.rotulo}`} disabled={!l.token}
                  className="text-nodri-t3 hover:text-nodri-cyan p-0.5 shrink-0 disabled:opacity-30">
                  <Copy size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={onVer}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold border border-nodri-border text-nodri-t2 hover:border-nodri-cyan hover:text-nodri-cyan">
          <BarChart3 size={12} /> Ver resultado
        </button>
        <button onClick={onTrancar}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold border border-nodri-border text-nodri-t2">
          {r.aberta ? <><Lock size={12} /> Encerrar</> : <><Unlock size={12} /> Reabrir</>}
        </button>
        <button onClick={onApagar}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold text-nodri-t3 hover:text-red-500 ml-auto">
          <Trash2 size={12} /> Apagar
        </button>
      </div>
    </div>
  )
}

// ══ Aba 3: o resultado ═════════════════════════════════════════════════════

function AbaResultado({ rodadas, atual, onTrocar, salao }: {
  rodadas: RodadaAval[]
  atual: RodadaAval | null
  onTrocar: (id: string) => void
  salao?: string
}) {
  if (!atual) {
    return <p className="text-[12.5px] text-nodri-t3 text-center py-6">
      Abra uma avaliação para ver resultado.
    </p>
  }

  const respostas = atual.respostas || []
  const r = calcular(atual.ficha, respostas)

  // As maiores diferenças entre a autoavaliação e o resto: é onde a conversa
  // de feedback rende. Só vale quando os dois lados responderam.
  const lacunas = r.linhas
    .filter(l => l.diferenca != null && Math.abs(l.diferenca) >= 1.5)
    .sort((a, b) => Math.abs(b.diferenca!) - Math.abs(a.diferenca!))
    .slice(0, 6)

  const comentarios = respostas.filter(x => x.comentario)

  function imprimir() {
    const w = window.open('', '_blank', 'width=920,height=780')
    if (!w) { toast.error('O navegador bloqueou a janela de impressão.'); return }
    w.document.write(folhaResultado(atual!, r, salao))
    w.document.close(); w.focus()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {rodadas.length > 1 && (
          <select value={atual.id} onChange={e => onTrocar(e.target.value)}
            className="flex-1 min-w-[160px] bg-nodri-surface border border-nodri-border rounded-lg px-2.5 py-2 text-[12px] outline-none">
            {rodadas.map(x => (
              <option key={x.id} value={x.id}>
                {x.titulo} — {new Date(x.criado_em).toLocaleDateString('pt-BR')}
              </option>
            ))}
          </select>
        )}
        <button onClick={imprimir}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold border border-nodri-border text-nodri-t2 ml-auto">
          <Printer size={13} /> Imprimir
        </button>
      </div>

      {!respostas.length ? (
        <p className="text-[12.5px] text-nodri-t3 text-center py-6 border border-dashed border-nodri-border rounded-xl">
          Ninguém respondeu ainda. O link está na aba Avaliações.
        </p>
      ) : (
        <>
          {/* ── As três médias ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['auto', 'gerente', 'equipe'] as TipoAvaliador[]).map(t => (
              <Cartao key={t} rotulo={ROTULO_TIPO[t]}
                valor={r.geral[t]?.media ?? null}
                abaixo={`${r.respondentes[t]} ${r.respondentes[t] === 1 ? 'resposta' : 'respostas'}`} />
            ))}
            <Cartao rotulo="Média geral" valor={r.geralTotal?.media ?? null}
              abaixo={`${respostas.length} no total`} destaque />
          </div>

          {/* ── O que não pode ser diluído na média ── */}
          {!!r.criticos.length && (
            <div className="border border-red-400/50 bg-red-500/5 rounded-xl p-3">
              <p className="text-[12px] font-bold text-red-700 flex items-center gap-1.5">
                <ShieldAlert size={14} /> Pontos não negociáveis com nota baixa
              </p>
              <p className="text-[11px] text-nodri-t3 mt-1 mb-2.5 leading-relaxed">
                Fora da média de propósito. Isto não decide nada sozinho: é o
                que precisa ser <b>apurado com fato</b>, conversando com quem
                avaliou e com a pessoa avaliada.
              </p>
              <div className="space-y-2">
                {r.criticos.map(l => {
                  const exemplos = respostas
                    .filter(x => typeof x.notas?.[l.criterio.id] === 'number'
                              && x.notas[l.criterio.id] <= NOTA_QUE_PEDE_MOTIVO)
                    .map(x => ({ tipo: x.tipo, nota: x.notas[l.criterio.id], texto: x.observacoes?.[l.criterio.id] }))
                  return (
                    <div key={l.criterio.id} className="bg-nodri-surface rounded-lg p-2.5">
                      <p className="text-[12.5px] font-bold text-nodri-t1">{l.criterio.texto}</p>
                      <p className="text-[11px] text-nodri-t3 mt-0.5">
                        menor nota de fora: <b className="text-red-600">{l.menorDeFora?.toFixed(1)}</b>
                        {l.geral ? ` · média ${l.geral.media.toFixed(1)}` : ''}
                      </p>
                      {exemplos.map((e, i) => (
                        <p key={i} className="text-[11.5px] text-nodri-t2 border-l-2 border-red-400/60 pl-2 py-1 mt-1.5 leading-relaxed">
                          <b className="text-nodri-t3">{ROTULO_TIPO[e.tipo]} deu {e.nota}:</b> {e.texto || '(sem exemplo)'}
                        </p>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Onde as visões divergem ── */}
          {!!lacunas.length && (
            <div className="border border-nodri-border rounded-xl p-3">
              <p className="text-[12px] font-bold text-nodri-t2 mb-1">
                Onde a visão de dentro e a de fora não batem
              </p>
              <p className="text-[11px] text-nodri-t3 mb-2.5 leading-relaxed">
                Diferença entre a autoavaliação e a média de gerente e equipe.
                É aqui que a conversa de feedback rende mais.
              </p>
              <div className="space-y-1.5">
                {lacunas.map(l => (
                  <div key={l.criterio.id} className="flex items-start gap-2">
                    <span className={'text-[11.5px] font-bold px-1.5 py-0.5 rounded shrink-0 tabular-nums '
                      + (l.diferenca! > 0
                        ? 'bg-amber-500/15 text-amber-700'
                        : 'bg-sky-500/15 text-sky-700')}>
                      {l.diferenca! > 0 ? '+' : ''}{l.diferenca!.toFixed(1)}
                    </span>
                    <span className="text-[12px] text-nodri-t2 leading-snug">{l.criterio.texto}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10.5px] text-nodri-t3 mt-2.5 leading-relaxed">
                Positivo: a pessoa se vê melhor do que os outros a veem.
                Negativo: ela se cobra mais do que os outros cobram.
              </p>
            </div>
          )}

          {/* ── Ponto por ponto ── */}
          {porSecao(atual.ficha).map(g => (
            <div key={g.secao} className="border border-nodri-border rounded-xl overflow-hidden">
              <p className="text-[10.5px] font-bold text-nodri-cyan uppercase tracking-wider px-3 py-2 bg-nodri-surface border-b border-nodri-border">
                {g.secao}
              </p>
              <div className="divide-y divide-nodri-border/60">
                {g.criterios.map(c => {
                  const l = r.linhas.find(x => x.criterio.id === c.id)
                  if (!l) return null
                  const obsDoPonto = respostas
                    .map(x => ({ tipo: x.tipo, texto: x.observacoes?.[c.id] }))
                    .filter(x => x.texto)
                  return (
                    <div key={c.id} className="px-3 py-2.5">
                      <div className="flex items-start gap-2">
                        <p className="text-[12.5px] text-nodri-t1 leading-snug flex-1">{c.texto}</p>
                        <span className="text-[14px] font-bold tabular-nums shrink-0"
                          style={{ color: corDaNota(l.geral?.media) }}>
                          {l.geral ? l.geral.media.toFixed(1) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {(['auto', 'gerente', 'equipe'] as TipoAvaliador[]).map(t => (
                          <span key={t} className="text-[11px] text-nodri-t3">
                            {ROTULO_TIPO[t]}:{' '}
                            <b className="tabular-nums" style={{ color: corDaNota(l.por[t]?.media) }}>
                              {l.por[t] ? l.por[t]!.media.toFixed(1) : '—'}
                            </b>
                          </span>
                        ))}
                      </div>
                      {!!obsDoPonto.length && (
                        <div className="mt-2 space-y-1">
                          {obsDoPonto.map((o, i) => (
                            <p key={i} className="text-[11.5px] text-nodri-t2 bg-nodri-surface border-l-2 border-nodri-cyan/50 pl-2 py-1 leading-relaxed">
                              <b className="text-nodri-t3">{ROTULO_TIPO[o.tipo]}:</b> {o.texto}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* ── Comentários gerais ── */}
          {!!comentarios.length && (
            <div className="border border-nodri-border rounded-xl p-3">
              <p className="text-[12px] font-bold text-nodri-t2 mb-2">O que escreveram no fim</p>
              <div className="space-y-2">
                {comentarios.map(x => (
                  <div key={x.id} className="bg-nodri-surface rounded-lg p-2.5">
                    <p className="text-[10.5px] font-bold text-nodri-cyan uppercase tracking-wide mb-1">
                      {ROTULO_TIPO[x.tipo]}{x.avaliador ? ` · ${x.avaliador}` : ''}
                    </p>
                    <p className="text-[12.5px] text-nodri-t2 leading-relaxed whitespace-pre-wrap">
                      {x.comentario}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Cartao({ rotulo, valor, abaixo, destaque }: {
  rotulo: string
  valor: number | null
  abaixo: string
  destaque?: boolean
}) {
  return (
    <div className={'rounded-xl p-2.5 border '
      + (destaque ? 'border-nodri-cyan bg-nodri-cyan/5' : 'border-nodri-border')}>
      <p className="text-[10.5px] font-bold text-nodri-t3 uppercase tracking-wide truncate">{rotulo}</p>
      <p className="text-[22px] font-bold leading-tight tabular-nums mt-0.5"
        style={{ color: corDaNota(valor) }}>
        {valor == null ? '—' : valor.toFixed(1)}
      </p>
      <p className="text-[10.5px] text-nodri-t3">{abaixo}</p>
    </div>
  )
}

// ── A folha do resultado ──────────────────────────────────────────────────
// Separada do visual da tela porque papel não rola: título não fica sozinho
// no pé, e uma seção não se parte no meio.

function folhaResultado(
  r: RodadaAval,
  c: ReturnType<typeof calcular>,
  salao?: string,
): string {
  const esc = (v: any) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const num = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1))

  const cabecalhoTipos = (['auto', 'gerente', 'equipe'] as TipoAvaliador[])
    .map(t => `<div class="box"><span class="rot">${ROTULO_TIPO[t]}</span>
      <span class="val" style="color:${corDaNota(c.geral[t]?.media)}">${num(c.geral[t]?.media)}</span>
      <span class="sub">${c.respondentes[t]} resp.</span></div>`).join('')

  const secoes = porSecao(r.ficha).map(g => {
    const linhas = g.criterios.map(cr => {
      const l = c.linhas.find(x => x.criterio.id === cr.id)
      if (!l) return ''
      return `<tr>
        <td>${esc(cr.texto)}</td>
        <td class="n" style="color:${corDaNota(l.por.auto?.media)}">${num(l.por.auto?.media)}</td>
        <td class="n" style="color:${corDaNota(l.por.gerente?.media)}">${num(l.por.gerente?.media)}</td>
        <td class="n" style="color:${corDaNota(l.por.equipe?.media)}">${num(l.por.equipe?.media)}</td>
        <td class="n b" style="color:${corDaNota(l.geral?.media)}">${num(l.geral?.media)}</td>
      </tr>`
    }).join('')
    return `<h2>${esc(g.secao)}</h2>
      <table><thead><tr><th>Ponto avaliado</th><th>Auto</th><th>Gerente</th><th>Equipe</th><th>Média</th></tr></thead>
      <tbody>${linhas}</tbody></table>`
  }).join('')

  const hoje = new Date().toLocaleDateString('pt-BR')

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>${esc(r.cargo)} — ${esc(r.titulo)}</title><style>
@page{size:A4 portrait;margin:15mm 14mm 16mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Calibri,Arial,sans-serif;color:#23262f;font-size:10.5pt;line-height:1.5;orphans:2;widows:2}
.cabeca{border-bottom:2.5px solid #5b4fcf;padding-bottom:8px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end;gap:14px}
.cabeca .t{font-size:17pt;font-weight:800;line-height:1.15}
.cabeca .s{font-size:8pt;letter-spacing:2.2px;text-transform:uppercase;color:#7a756d;margin-top:3px}
.cabeca .d{font-size:8.5pt;color:#5b4fcf;font-weight:700;text-align:right;white-space:nowrap}
.resumo{display:flex;gap:9px;margin-bottom:16px}
.box{flex:1;border:1px solid #dcd8d2;border-radius:7px;padding:7px 9px}
.box .rot{display:block;font-size:7.5pt;text-transform:uppercase;letter-spacing:1px;color:#7a756d;font-weight:700}
.box .val{display:block;font-size:19pt;font-weight:800;line-height:1.1}
.box .sub{display:block;font-size:7.5pt;color:#9a948c}
h2{font-size:10pt;font-weight:800;color:#5b4fcf;text-transform:uppercase;letter-spacing:.6px;margin:14px 0 5px;break-after:avoid;page-break-after:avoid}
table{width:100%;border-collapse:collapse;break-inside:avoid;page-break-inside:avoid}
th{font-size:7.5pt;text-transform:uppercase;letter-spacing:.7px;color:#7a756d;text-align:right;border-bottom:1px solid #dcd8d2;padding:3px 5px}
th:first-child{text-align:left}
td{padding:4px 5px;border-bottom:1px solid #f0ece6;vertical-align:top}
td.n{text-align:right;font-weight:700;white-space:nowrap;width:48px}
td.b{border-left:1px solid #f0ece6}
.rodape{margin-top:18px;border-top:1px solid #e8e4de;padding-top:5px;font-size:7.5pt;color:#9a948c;display:flex;justify-content:space-between}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
@media screen{body{max-width:190mm;margin:0 auto;padding:15mm 14mm}}
</style></head><body>
<div class="cabeca">
  <div><div class="t">${esc(r.cargo)}</div><div class="s">Avaliação 360${r.avaliado ? ` · ${esc(r.avaliado)}` : ''}</div></div>
  <div class="d">${esc(salao || '')}<br>${esc(r.titulo)}</div>
</div>
<div class="resumo">${cabecalhoTipos}
  <div class="box" style="border-color:#5b4fcf"><span class="rot">Geral</span>
  <span class="val" style="color:${corDaNota(c.geralTotal?.media)}">${num(c.geralTotal?.media)}</span>
  <span class="sub">${(r.respostas || []).length} no total</span></div>
</div>
${secoes || '<p><i>Sem resposta.</i></p>'}
<div class="rodape"><span>${esc(salao || '')}</span><span>Impresso em ${hoje}</span></div>
<script>window.onload=function(){setTimeout(function(){window.print()},220)}</script>
</body></html>`
}
