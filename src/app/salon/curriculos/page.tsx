'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Home, Loader2, ChevronDown, ChevronUp, Copy, Check, Filter, Trash2, MessageCircle, Plus, Pencil, X, Settings } from 'lucide-react'
import { EXPERIENCIAS, ESTADOS_BR, whatsappLink, type Curriculo } from '@/lib/curriculosShared'
import { useRouter } from 'next/navigation'
import { voltar } from '@/lib/historicoNav'

const COR = '#5b4fcf'
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const nomeUF = (uf: string) => ESTADOS_BR.find(e => e.uf === uf)?.nome || uf

export default function CurriculosPage() {
  const router = useRouter()
  const [itens, setItens] = useState<Curriculo[]>([])
  // A lista de vagas e GLOBAL do NODRI e vem do servidor: o que um salao
  // acrescenta vale para todos, no formulario publico e nesta tela.
  const [vagas, setVagas] = useState<string[]>([])           // as configuradas
  const [vagasExibir, setVagasExibir] = useState<string[]>([])  // + as que ainda tem candidato
  const [gerindo, setGerindo] = useState(false)
  const [novaVaga, setNovaVaga] = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [salvandoVaga, setSalvandoVaga] = useState(false)
  const [erroVaga, setErroVaga] = useState('')
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const [abertas, setAbertas] = useState<Set<string>>(new Set())
  // filtros por vaga: { vaga: { estados:Set, exps:Set, meses:Set } }
  const [filtros, setFiltros] = useState<Record<string, { estados: Set<string>; exps: Set<string>; meses: Set<string> }>>({})
  const [filtroAberto, setFiltroAberto] = useState<string | null>(null)

  const carregar = () => {
    fetch('/api/salon/curriculos', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setItens(d.itens || []); setLink(d.link || ''); setVagas(d.vagas || []); setVagasExibir(d.vagasExibir || d.vagas || []) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    carregar()
    // marca como vistos (zera o badge da sidebar)
    fetch('/api/salon/curriculos', { method: 'POST', credentials: 'include' }).catch(() => {})
  }, [])

  const toggle = (v: string) => setAbertas(s => { const n = new Set(s); n.has(v) ? n.delete(v) : n.add(v); return n })

  const filtroDe = (v: string) => filtros[v] || { estados: new Set<string>(), exps: new Set<string>(), meses: new Set<string>() }
  const setF = (v: string, campo: 'estados' | 'exps' | 'meses', valor: string) => {
    setFiltros(prev => {
      const atual = { estados: new Set(filtroDe(v).estados), exps: new Set(filtroDe(v).exps), meses: new Set(filtroDe(v).meses) }
      atual[campo].has(valor) ? atual[campo].delete(valor) : atual[campo].add(valor)
      return { ...prev, [v]: atual }
    })
  }
  const limparF = (v: string) => setFiltros(prev => ({ ...prev, [v]: { estados: new Set(), exps: new Set(), meses: new Set() } }))

  const porVaga = useMemo(() => {
    const map: Record<string, Curriculo[]> = {}
    for (const v of vagasExibir) map[v] = []
    for (const c of itens) { (map[c.vaga] = map[c.vaga] || []).push(c) }
    for (const v in map) map[v].sort((a, b) => b.criado_em.localeCompare(a.criado_em))
    return map
  }, [itens, vagasExibir])

  const aplicarFiltro = (v: string, lista: Curriculo[]) => {
    const f = filtroDe(v)
    return lista.filter(c => {
      if (f.estados.size && !f.estados.has(c.estado)) return false
      if (f.exps.size && !f.exps.has(c.experiencia)) return false
      if (f.meses.size) { const m = String(new Date(c.criado_em).getMonth()); if (!f.meses.has(m)) return false }
      return true
    })
  }

  // Toda mudanca de vaga passa pelo servidor, que e quem valida nome repetido e
  // impede apagar vaga com candidato. A tela so reflete o que ele devolveu.
  const acaoVaga = async (body: Record<string, string>) => {
    setSalvandoVaga(true); setErroVaga('')
    try {
      const r = await fetch('/api/salon/curriculos', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setErroVaga(d?.error || 'Nao foi possivel salvar.'); return false }
      setVagas(d.vagas || []); setVagasExibir(d.vagasExibir || d.vagas || [])
      if (Array.isArray(d.itens)) setItens(d.itens)
      return true
    } catch {
      setErroVaga('Sem conexao com o servidor.'); return false
    } finally { setSalvandoVaga(false) }
  }
  const criar = async () => { if (await acaoVaga({ acao: 'criar', nome: novaVaga })) setNovaVaga('') }
  const renomear = async (de: string) => { if (await acaoVaga({ acao: 'renomear', nome: de, novo: editNome })) setEditando(null) }
  const remover = async (nome: string) => {
    if (!confirm(`Excluir a vaga "${nome}"? Ela sai do formulario para TODOS os saloes.`)) return
    await acaoVaga({ acao: 'excluir', nome })
  }

  const copiarLink = () => { navigator.clipboard?.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1600) }
  const excluir = async (id: string) => {
    if (!confirm('Excluir este currículo?')) return
    await fetch(`/api/salon/curriculos?id=${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {})
    setItens(s => s.filter(c => c.id !== id))
  }

  const mesesPresentes = (lista: Curriculo[]) => [...new Set(lista.map(c => new Date(c.criado_em).getMonth()))].sort((a, b) => a - b)
  const estadosPresentes = (lista: Curriculo[]) => [...new Set(lista.map(c => c.estado))].sort()

  return (
    <div className="min-h-screen bg-nodri-dark text-nodri-t1">
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3">
        <button onClick={() => voltar(router)} className="flex items-center gap-2 text-nodri-t2 hover:text-nodri-cyan text-sm font-medium"><ArrowLeft size={16} /> Voltar</button>
        <div className="w-px h-5 bg-nodri-border" />
        <a href="/salon" className="flex items-center gap-1.5 text-nodri-t3 hover:text-nodri-cyan text-[12px]"><Home size={14} /> Início</a>
        <div className="w-px h-5 bg-nodri-border" />
        <h1 className="font-syne font-bold text-[15px] uppercase tracking-wide">Currículos</h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Link público */}
        <div className="nodri-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-nodri-t3 mb-2">Link do formulário (envie para os candidatos)</p>
          <div className="flex gap-2">
            <input readOnly value={link} className="flex-1 px-3 py-2 rounded-lg text-[12px] text-nodri-t1 bg-nodri-surface border border-nodri-border" />
            <button onClick={copiarLink} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold" style={{ background: COR, color: '#fff' }}>
              {copiado ? <Check size={14} /> : <Copy size={14} />}{copiado ? 'Copiado!' : 'Copiar'}
            </button>
            {link && <a href={link} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg text-[12px] font-bold text-nodri-cyan border border-nodri-border">Abrir</a>}
          </div>
          <p className="text-[11px] text-nodri-t3 mt-2">Qualquer pessoa com o link pode preencher (nome, estado, idade, telefone, vaga e experiência).</p>
        </div>

        {/* Vagas do formulário — lista compartilhada por todos os salões */}
        <div className="nodri-card p-4">
          <button onClick={() => { setGerindo(g => !g); setErroVaga(''); setEditando(null) }}
            className="w-full flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-nodri-t3">
              <Settings size={13} /> Vagas do formulário
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#5b4fcf20', color: COR }}>{vagas.length}</span>
              {gerindo ? <ChevronUp size={16} className="text-nodri-t3" /> : <ChevronDown size={16} className="text-nodri-t3" />}
            </span>
          </button>

          {gerindo && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-nodri-t3">
                Esta lista vale para <strong>todos os salões</strong> e aparece no formulário público na hora.
                Nomes repetidos não são aceitos, e vaga com candidato inscrito não pode ser excluída.
              </p>

              {vagas.map(v => (
                <div key={v} className="flex items-center gap-2">
                  {editando === v ? (
                    <>
                      <input autoFocus value={editNome} onChange={e => setEditNome(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') renomear(v); if (e.key === 'Escape') setEditando(null) }}
                        className="flex-1 px-3 py-2 rounded-lg text-[13px] text-nodri-t1 bg-nodri-surface border border-nodri-border" />
                      <button onClick={() => renomear(v)} disabled={salvandoVaga}
                        className="px-3 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50" style={{ background: COR, color: '#fff' }}>Salvar</button>
                      <button onClick={() => setEditando(null)} className="p-2 rounded-lg text-nodri-t3 border border-nodri-border"><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 px-3 py-2 rounded-lg text-[13px] text-nodri-t1 bg-nodri-surface border border-nodri-border">{v}</span>
                      <button onClick={() => { setEditando(v); setEditNome(v); setErroVaga('') }} title="Renomear"
                        className="p-2 rounded-lg text-nodri-t2 border border-nodri-border"><Pencil size={14} /></button>
                      <button onClick={() => remover(v)} disabled={salvandoVaga} title="Excluir"
                        className="p-2 rounded-lg border border-nodri-border disabled:opacity-50" style={{ color: '#dc2626' }}><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <input value={novaVaga} onChange={e => setNovaVaga(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') criar() }}
                  placeholder="Nome da nova vaga (ex.: Barista)"
                  className="flex-1 px-3 py-2 rounded-lg text-[13px] text-nodri-t1 bg-nodri-surface border border-nodri-border" />
                <button onClick={criar} disabled={salvandoVaga || novaVaga.trim().length < 2}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50" style={{ background: COR, color: '#fff' }}>
                  {salvandoVaga ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Adicionar
                </button>
              </div>

              {!!erroVaga && (
                <p className="text-[12px] font-bold px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#b91c1c' }}>{erroVaga}</p>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={26} className="animate-spin text-nodri-cyan" /></div>
        ) : (
          <div className="space-y-3">
            {vagasExibir.map(vaga => {
              const todos = porVaga[vaga] || []
              const lista = aplicarFiltro(vaga, todos)
              const aberta = abertas.has(vaga)
              const f = filtroDe(vaga)
              const filtrando = f.estados.size + f.exps.size + f.meses.size > 0
              const mediaIdade = lista.length ? Math.round(lista.reduce((s, c) => s + c.idade, 0) / lista.length) : 0
              return (
                <div key={vaga} className="nodri-card overflow-hidden">
                  <button onClick={() => toggle(vaga)} className="w-full flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {aberta ? <ChevronUp size={16} className="text-nodri-t3 shrink-0" /> : <ChevronDown size={16} className="text-nodri-t3 shrink-0" />}
                      <span className="font-bold text-[14px] text-nodri-t1 truncate">{vaga}</span>
                    </div>
                    <span className="text-[12px] font-bold shrink-0 px-2.5 py-1 rounded-full" style={{ background: todos.length ? '#5b4fcf20' : 'rgba(128,128,150,.15)', color: todos.length ? COR : '#767069' }}>
                      {todos.length} {todos.length === 1 ? 'candidato' : 'candidatos'}
                    </span>
                  </button>

                  {aberta && (
                    <div className="border-t border-nodri-border">
                      {todos.length === 0 ? (
                        <p className="px-4 py-6 text-center text-[13px] text-nodri-t3">Nenhum candidato para esta vaga ainda.</p>
                      ) : (
                        <>
                          {/* Barra de filtros */}
                          <div className="px-4 py-3 border-b border-nodri-border">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button onClick={() => setFiltroAberto(filtroAberto === vaga ? null : vaga)}
                                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg"
                                style={{ background: filtrando ? COR : '#fff', color: filtrando ? '#fff' : COR, border: '1px solid ' + COR + '40' }}>
                                <Filter size={12} /> Filtros{filtrando ? ` (${f.estados.size + f.exps.size + f.meses.size})` : ''}
                              </button>
                              <span className="text-[11px] text-nodri-t3">Mostrando <strong className="text-nodri-t1">{lista.length}</strong> de {todos.length}</span>
                              {lista.length > 0 && <span className="text-[11px] text-nodri-t3">· Idade média: <strong className="text-nodri-t1">{mediaIdade} anos</strong></span>}
                              {filtrando && <button onClick={() => limparF(vaga)} className="text-[11px] text-nodri-t3 underline">limpar</button>}
                            </div>
                            {filtroAberto === vaga && (
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <FiltroGrupo titulo="Estado (mora em)" opcoes={estadosPresentes(todos).map(uf => ({ v: uf, l: `${nomeUF(uf)} (${uf})` }))} sel={f.estados} onToggle={o => setF(vaga, 'estados', o)} />
                                <FiltroGrupo titulo="Experiência" opcoes={EXPERIENCIAS.filter(x => todos.some(c => c.experiencia === x)).map(x => ({ v: x, l: x }))} sel={f.exps} onToggle={o => setF(vaga, 'exps', o)} />
                                <FiltroGrupo titulo="Mês de envio" opcoes={mesesPresentes(todos).map(m => ({ v: String(m), l: MESES[m] }))} sel={f.meses} onToggle={o => setF(vaga, 'meses', o)} />
                              </div>
                            )}
                          </div>

                          {/* Candidatos */}
                          <div className="divide-y divide-nodri-border">
                            {lista.map(c => (
                              <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-bold text-[14px] text-nodri-t1 truncate">{c.nome}</p>
                                  <p className="text-[11.5px] text-nodri-t3">
                                    {nomeUF(c.estado)} ({c.estado}) · {c.idade} anos · {c.experiencia} · {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <a href={whatsappLink(c.telefone)} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: '#25D366' }}>
                                    <MessageCircle size={14} /> WhatsApp
                                  </a>
                                  <button onClick={() => excluir(c.id)} className="p-1.5 rounded-lg text-nodri-t3 hover:text-red-400"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            ))}
                            {lista.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-nodri-t3">Nenhum candidato com esses filtros.</p>}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function FiltroGrupo({ titulo, opcoes, sel, onToggle }: { titulo: string; opcoes: { v: string; l: string }[]; sel: Set<string>; onToggle: (v: string) => void }) {
  if (!opcoes.length) return <div><p className="text-[10px] font-bold uppercase tracking-wider text-nodri-t3 mb-1.5">{titulo}</p><p className="text-[11px] text-nodri-t3">—</p></div>
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-nodri-t3 mb-1.5">{titulo}</p>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map(o => {
          const on = sel.has(o.v)
          return (
            <button key={o.v} onClick={() => onToggle(o.v)}
              className="text-[11px] px-2.5 py-1 rounded-full font-medium transition"
              style={{ background: on ? COR : '#fff', color: on ? '#fff' : '#4a4760', border: '1px solid ' + (on ? COR : '#e6e3f2') }}>
              {o.l}
            </button>
          )
        })}
      </div>
    </div>
  )
}
