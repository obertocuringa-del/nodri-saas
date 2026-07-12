'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Plus, Trash2, Check, X, BarChart3, Copy, RotateCcw, Pencil, Calendar, ArrowRightLeft, ArrowDownAZ } from 'lucide-react'
import toast from 'react-hot-toast'
import { CHECKLIST_DEFAULT, FREQUENCIAS } from '@/components/salon/checklistDefaults'
import { usePermissoes } from '@/lib/usePermissoes'
import { useIsMobile } from '@/lib/useIsMobile'

// Ordem dos períodos: Diário, Semanal, Quinzenal, Mensal, Trimestral
const ordemFreq = (f: string) => { const i = FREQUENCIAS.indexOf(f); return i < 0 ? 99 : i }

interface Demanda { id: string; texto: string; freq: string; feito: boolean; dias?: string[] }
interface Categoria { id: string; nome: string; demandas: Demanda[] }
interface Doc { categorias: Categoria[] }

const rid = () => Math.random().toString(36).slice(2, 8)
const norm = (s: string) => (s || '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')
const buildDefault = (): Doc => ({ categorias: CHECKLIST_DEFAULT.map(c => ({ id: rid(), nome: c.nome, demandas: c.demandas.map(t => ({ id: rid(), texto: t, freq: 'Diário', feito: false })) })) })
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const FREQ_COR: Record<string, { bg: string; bd: string; txt: string }> = {
  'Diário': { bg: '#f0fdf4', bd: '#16a34a', txt: '#15803d' },
  'Semanal': { bg: '#ecfeff', bd: '#0891b2', txt: '#0e7490' },
  'Quinzenal': { bg: '#f5f3ff', bd: '#7c3aed', txt: '#6d28d9' },
  'Mensal': { bg: '#fff7ed', bd: '#ea580c', txt: '#c2410c' },
  'Trimestral': { bg: '#fdf2f8', bd: '#db2777', txt: '#be185d' },
}

export default function ChecklistPage() {
  const router = useRouter()
  const { ehSub } = usePermissoes()
  const isMobile = useIsMobile()
  const soLeitura = ehSub // usuário criado pelo salão: só visualiza (sem alterar/excluir) até liberação
  const [doc, setDoc] = useState<Doc>({ categorias: [] })
  const [catSel, setCatSel] = useState(0)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [verRelatorio, setVerRelatorio] = useState(false)
  const [verComuns, setVerComuns] = useState(false)
  const [diasOpen, setDiasOpen] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const d = await fetch('/api/salon/grid?chave=checklist').then(r => r.ok ? r.json() : null)
      setDoc(d && Array.isArray(d.categorias) ? d : buildDefault())
    } catch { setDoc(buildDefault()) }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  function mut(fn: (d: Doc) => void) { setDoc(prev => { const n: Doc = JSON.parse(JSON.stringify(prev)); fn(n); return n }); setDirty(true) }

  function toggleFeito(ci: number, di: number) { mut(d => { d.categorias[ci].demandas[di].feito = !d.categorias[ci].demandas[di].feito }) }
  function setDemanda(ci: number, di: number, campo: 'texto' | 'freq', v: string) { mut(d => { (d.categorias[ci].demandas[di] as any)[campo] = v; if (campo === 'freq') d.categorias[ci].demandas.sort((a, b) => ordemFreq(a.freq) - ordemFreq(b.freq)) }) }
  function organizarCategoria(ci: number) { mut(d => { d.categorias[ci].demandas.sort((a, b) => ordemFreq(a.freq) - ordemFreq(b.freq)) }); toast.success('Organizado por período (Diário → Semanal → ...)') }
  function organizarAZ(ci: number) { mut(d => { d.categorias[ci].demandas.sort((a, b) => norm(a.texto).localeCompare(norm(b.texto))) }); toast.success('Organizado em ordem alfabética — repare se aparecerem itens parecidos/repetidos') }
  function toggleDia(ci: number, di: number, dia: string) {
    mut(d => {
      const dem = d.categorias[ci].demandas[di]
      if (!dem.dias) dem.dias = []
      const idx = dem.dias.indexOf(dia)
      if (idx >= 0) dem.dias.splice(idx, 1); else dem.dias.push(dia)
    })
  }
  async function transferirDemanda(demandaId: string, categoriaDestinoId: string) {
    const novoDoc: Doc = JSON.parse(JSON.stringify(doc))
    let item: Demanda | null = null
    for (const c of novoDoc.categorias) {
      const idx = c.demandas.findIndex((x: Demanda) => x.id === demandaId)
      if (idx >= 0) { item = c.demandas.splice(idx, 1)[0]; break }
    }
    const destino = novoDoc.categorias.find(c => c.id === categoriaDestinoId)
    if (!item || !destino) return
    destino.demandas.push(item)
    setDoc(novoDoc); setTransferOpen(null)
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'checklist', doc: novoDoc }) })
      if (res.ok) { toast.success(`Transferido para "${destino.nome}"!`); setDirty(false) } else toast.error('Erro ao transferir')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }
  function addDemanda(ci: number) { mut(d => { d.categorias[ci].demandas.push({ id: rid(), texto: '', freq: 'Diário', feito: false }) }) }
  function delDemanda(ci: number, di: number) { mut(d => { d.categorias[ci].demandas.splice(di, 1) }) }
  function addCategoria() { mut(d => { d.categorias.push({ id: rid(), nome: 'Nova categoria', demandas: [] }) }); setCatSel(doc.categorias.length) }
  function renCategoria(ci: number, v: string) { mut(d => { d.categorias[ci].nome = v }) }
  function delCategoria(ci: number) { if (!confirm('Excluir esta categoria e todas as suas demandas?')) return; mut(d => { d.categorias.splice(ci, 1) }); setCatSel(0) }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'checklist', doc }) })
      if (res.ok) { toast.success('Check list salvo!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }
  function limparMarcacoes() { if (!confirm('Desmarcar todas as demandas (começar um novo dia)?')) return; mut(d => { d.categorias.forEach(c => c.demandas.forEach(x => x.feito = false)) }) }

  // Relatório
  const relat = doc.categorias.map(c => { const tot = c.demandas.length; const ok = c.demandas.filter(x => x.feito).length; return { nome: c.nome, tot, ok, pct: tot ? Math.round(ok / tot * 100) : 0 } })
  const totGeral = relat.reduce((a, b) => a + b.tot, 0)
  const okGeral = relat.reduce((a, b) => a + b.ok, 0)
  const pctGeral = totGeral ? Math.round(okGeral / totGeral * 100) : 0

  // Demandas em comum (mesmo texto em mais de uma categoria)
  const mapa: Record<string, { texto: string; cats: Set<string> }> = {}
  doc.categorias.forEach(c => c.demandas.forEach(dem => { const k = norm(dem.texto); if (!k) return; if (!mapa[k]) mapa[k] = { texto: dem.texto, cats: new Set() }; mapa[k].cats.add(c.nome) }))
  const comuns = Object.values(mapa).filter(x => x.cats.size > 1).sort((a, b) => b.cats.size - a.cats.size)

  const cat = doc.categorias[catSel]

  return (
    <div className="nodri-salon-bg" style={{ minHeight: '100vh' }}>
      <nav style={{ background: '#faf9f7', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40, flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}>✅ Check List Diário</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => { setVerComuns(v => !v); setVerRelatorio(false) }} style={btnNav(verComuns)}><Copy size={14} /> Demandas em comum</button>
        <button onClick={() => { setVerRelatorio(v => !v); setVerComuns(false) }} style={btnNav(verRelatorio)}><BarChart3 size={14} /> Relatório</button>
        {!soLeitura && <button onClick={limparMarcacoes} style={btnNav(false)}><RotateCcw size={14} /> Limpar</button>}
        {!soLeitura && <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar geral</>}</button>}
        {soLeitura && <span style={{ fontSize: 12, color: '#6b6860', background: '#f1eefb', border: '1px solid #ddd6f5', borderRadius: 8, padding: '6px 12px' }}>👁️ Somente visualização</span>}
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 size={26} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> : (<>
          {/* Resumo geral sempre visível */}
          <div style={{ background: 'linear-gradient(135deg,#7c3aed,#5b4fcf)', borderRadius: 14, padding: '14px 18px', color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{pctGeral}%</div>
            <div style={{ fontSize: 13 }}>{okGeral} de {totGeral} demandas feitas hoje<br /><span style={{ opacity: .85 }}>em {doc.categorias.length} categorias</span></div>
          </div>

          {/* Legenda de cores por período */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, fontSize: 11 }}>
            {FREQUENCIAS.map(f => { const c = FREQ_COR[f]; return <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#6b6860' }}><span style={{ width: 12, height: 12, borderRadius: 3, background: c.bg, border: `2px solid ${c.bd}` }} />{f}</span> })}
          </div>

          {verRelatorio && (
            <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 10px' }}>📊 Relatório unificado</h3>
              {relat.map((r, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}><span style={{ fontWeight: 700 }}>{r.nome}</span><span style={{ color: '#6b6860' }}>{r.ok}/{r.tot} · {r.pct}%</span></div>
                  <div style={{ height: 8, background: '#eee', borderRadius: 5, overflow: 'hidden' }}><div style={{ width: `${r.pct}%`, height: '100%', background: r.pct === 100 ? '#16a34a' : '#5b4fcf' }} /></div>
                </div>
              ))}
            </div>
          )}

          {verComuns && (
            <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 6px' }}>🔁 Demandas em comum entre categorias</h3>
              <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 10px' }}>Demandas iguais que aparecem em mais de uma categoria.</p>
              {comuns.length === 0 ? <p style={{ fontSize: 13, color: '#9ca3af' }}>Nenhuma demanda repetida entre categorias.</p> :
                comuns.map((c, i) => (
                  <div key={i} style={{ borderBottom: '1px solid #f0eee8', padding: '8px 0' }}>
                    <div style={{ fontSize: 13, color: '#1a1a1a' }}>{c.texto}</div>
                    <div style={{ fontSize: 11, color: '#5b4fcf', fontWeight: 700, marginTop: 2 }}>{Array.from(c.cats).join('  ·  ')}</div>
                  </div>
                ))}
            </div>
          )}

          {/* Abas de categorias — no celular vira caixa suspensa (economiza tela) */}
          {isMobile ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <select value={catSel} onChange={e => setCatSel(Number(e.target.value))}
                style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 12, border: '1.5px solid #5b4fcf', background: '#f0eefb', color: '#1a1a1a', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                {doc.categorias.map((c, i) => {
                  const ok = c.demandas.filter(x => x.feito).length
                  return <option key={c.id} value={i}>{c.nome} — {ok}/{c.demandas.length}</option>
                })}
              </select>
              {!soLeitura && <button onClick={addCategoria} title="Nova categoria" style={{ padding: '12px 14px', borderRadius: 12, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 14, fontWeight: 800, cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}><Plus size={16} /></button>}
            </div>
          ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {doc.categorias.map((c, i) => {
              const ok = c.demandas.filter(x => x.feito).length
              return (
                <button key={c.id} onClick={() => setCatSel(i)} style={{ padding: '8px 14px', borderRadius: 10, border: catSel === i ? 'none' : '1.5px solid #e0ddd8', background: catSel === i ? '#1a1a1a' : '#fff', color: catSel === i ? '#fff' : '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {c.nome} <span style={{ opacity: .7, fontSize: 11 }}>{ok}/{c.demandas.length}</span>
                </button>
              )
            })}
            {!soLeitura && <button onClick={addCategoria} style={{ padding: '8px 14px', borderRadius: 10, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Plus size={14} /> Categoria</button>}
          </div>
          )}

          {cat && (
            <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Pencil size={14} color="#9ca3af" />
                <input value={cat.nome} readOnly={soLeitura} onChange={e => renCategoria(catSel, e.target.value)} style={{ flex: 1, fontSize: 16, fontWeight: 800, color: '#5b4fcf', border: 'none', borderBottom: '1px solid #eee', outline: 'none', padding: '2px 0' }} />
                {!soLeitura && <button onClick={() => organizarCategoria(catSel)} title="Organizar por período (Diário, Semanal, Quinzenal...)" style={{ border: '1px solid #c9c4f0', background: '#f6f4ff', color: '#5b4fcf', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>↕ Organizar por período</button>}
                {!soLeitura && <button onClick={() => organizarAZ(catSel)} title="Organizar em ordem alfabética (ajuda a achar duplicadas)" style={{ border: '1px solid #c9c4f0', background: '#f6f4ff', color: '#5b4fcf', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowDownAZ size={13} /> Organizar A-Z</button>}
                {!soLeitura && <button onClick={() => delCategoria(catSel)} title="Excluir categoria" style={{ border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Trash2 size={12} /> Categoria</button>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cat.demandas.map((dem, di) => {
                  const fc = FREQ_COR[dem.freq] || FREQ_COR['Diário']
                  return (
                  <div key={dem.id} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start', gap: 8, padding: isMobile ? '10px' : '6px 8px', borderRadius: isMobile ? 12 : 8, borderLeft: `4px solid ${fc.bd}`, background: dem.feito ? '#f0fdf4' : fc.bg, flexWrap: isMobile ? undefined : 'wrap' }}>
                    {/* Linha 1: feito + texto */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
                      <button onClick={() => !soLeitura && toggleFeito(catSel, di)} disabled={soLeitura} title="Feito?" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: 'none', background: dem.feito ? '#16a34a' : '#e5e7eb', color: dem.feito ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 800, cursor: soLeitura ? 'default' : 'pointer', flexShrink: 0, width: 70, justifyContent: 'center', marginTop: 2 }}>
                        {dem.feito ? <><Check size={13} /> Sim</> : <><X size={13} /> Não</>}
                      </button>
                      <AutoTextarea value={dem.texto} onChange={v => setDemanda(catSel, di, 'texto', v)} feito={dem.feito} readOnly={soLeitura} />
                    </div>

                    {/* Linha 2 (celular) / mesma linha (PC): frequência, dias, transferir, excluir */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', paddingLeft: isMobile ? 78 : 0 }}>
                    <select value={dem.freq} disabled={soLeitura} onChange={e => setDemanda(catSel, di, 'freq', e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: `1.5px solid ${fc.bd}`, background: '#fff', color: fc.txt, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                      {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>

                    {!soLeitura && (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button onClick={() => setDiasOpen(diasOpen === dem.id ? null : dem.id)} title="Dias da semana (opcional)"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid ' + (dem.dias?.length ? '#5b4fcf' : '#d0cdc7'), background: dem.dias?.length ? '#f0eefb' : '#fff', color: dem.dias?.length ? '#5b4fcf' : '#6b6860', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                          <Calendar size={12} /> {dem.dias && dem.dias.length ? dem.dias.join(', ') : 'Dias'}
                        </button>
                        {diasOpen === dem.id && (<>
                          <div onClick={() => setDiasOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 59 }} />
                          <div style={{ position: 'absolute', top: '110%', ...(isMobile ? { left: 0 } : { right: 0 }), zIndex: 60, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.15)', padding: 8, display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: isMobile ? 240 : undefined }}>
                            {DIAS_SEMANA.map(dia => {
                              const on = !!dem.dias?.includes(dia)
                              return <button key={dia} onClick={() => toggleDia(catSel, di, dia)} style={{ border: 'none', borderRadius: 6, padding: '6px 8px', fontSize: 11, fontWeight: 800, cursor: 'pointer', background: on ? '#5b4fcf' : '#f3f2ee', color: on ? '#fff' : '#6b6860' }}>{dia}</button>
                            })}
                          </div>
                        </>)}
                      </div>
                    )}

                    {!soLeitura && (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button onClick={() => setTransferOpen(transferOpen === dem.id ? null : dem.id)} title="Transferir para outra categoria"
                          style={{ border: '1px solid #d0cdc7', background: '#fff', color: '#6b6860', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                          <ArrowRightLeft size={13} />
                        </button>
                        {transferOpen === dem.id && (<>
                          <div onClick={() => setTransferOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 59 }} />
                          <div style={{ position: 'absolute', top: '110%', ...(isMobile ? { left: 0 } : { right: 0 }), zIndex: 60, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.15)', minWidth: 200, maxHeight: 260, overflowY: 'auto', padding: 6 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', padding: '4px 8px' }}>Mover para...</div>
                            {doc.categorias.filter(c => c.id !== cat.id).map(c => (
                              <button key={c.id} onClick={() => transferirDemanda(dem.id, c.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, borderRadius: 6 }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{c.nome}</button>
                            ))}
                          </div>
                        </>)}
                      </div>
                    )}

                    {!soLeitura && <button onClick={() => delDemanda(catSel, di)} title="Excluir demanda" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 6, flexShrink: 0 }}><Trash2 size={13} /></button>}
                    </div>
                  </div>
                  )
                })}
              </div>
              {!soLeitura && <button onClick={() => addDemanda(catSel)} style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px dashed #d0cdc7', background: '#faf9f7', color: '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Plus size={14} /> Adicionar demanda</button>}
            </div>
          )}
        </>)}
      </div>
    </div>
  )
}

// Campo de texto que cresce com o conteúdo e quebra linha (demandas grandes não cortam)
function AutoTextarea({ value, onChange, feito, readOnly }: { value: string; onChange: (v: string) => void; feito: boolean; readOnly?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }, [value])
  return <textarea ref={ref} value={value} readOnly={readOnly} onChange={e => onChange(e.target.value)} placeholder="Descreva a demanda" rows={1}
    style={{ flex: 1, minWidth: 180, border: '1px solid transparent', borderRadius: 4, padding: '6px 8px', fontSize: 13, background: 'transparent', outline: 'none', resize: 'none', overflow: 'hidden', lineHeight: 1.4, fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word', textDecoration: feito ? 'line-through' : 'none', color: feito ? '#6b7280' : '#1a1a1a' }} />
}

function btnNav(ativo: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, background: ativo ? '#5b4fcf' : 'transparent', border: '1px solid ' + (ativo ? '#5b4fcf' : '#d0cdc7'), borderRadius: 8, padding: '6px 12px', color: ativo ? '#fff' : '#6b6860', cursor: 'pointer', fontSize: 13 }
}
