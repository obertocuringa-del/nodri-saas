'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, Trash2, Pencil, Search, X, Wrench, Users, CheckCircle2, Clock3, RotateCcw } from 'lucide-react'
import { getLogoSalao } from '@/lib/logoSalao'
import { useIsMobile } from '@/lib/useIsMobile'
import { cel, type Cell } from './GridEditavel'

interface ProfSalao { id: string; nome: string; telefone?: string }
interface Item { id: string; dataRecebido: string; responsavel: string; profissional: string; quantidade: string; dataDevolucao: string; assinatura: string }

const COR = '#5b4fcf'
const TITULO_TABELA = 'CONTROLE DE ALICATES'

const rid = () => Math.random().toString(36).slice(2, 9)
function hojeBR() { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` }
function brToIso(s: string) { const m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : '' }
function isoToBr(s: string) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : s }

export default function ControleAlicatesLista({ chave = 'alicates', profsSalao = [] }: { chave?: string; profsSalao?: ProfSalao[] }) {
  const mobile = useIsMobile()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState<Item | null>(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  const linhasParaItems = (linhas: Cell[][]): Item[] =>
    linhas.filter(l => l.some(c => (c?.t || '').trim())).map(l => ({
      id: rid(), dataRecebido: l[0]?.t || '', responsavel: l[1]?.t || '', profissional: l[2]?.t || '', quantidade: l[3]?.t || '', dataDevolucao: l[4]?.t || '', assinatura: l[5]?.t || '',
    }))

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chave)}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.tabelas) && d.tabelas[0]) setItems(linhasParaItems(d.tabelas[0].linhas || []))
      else setItems([])
      setDirty(false)
    } catch { setItems([]); setDirty(false) }
    setLoading(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    setSalvando(true)
    try {
      const tabela = {
        titulo: TITULO_TABELA,
        cabecalho: [cel('Data recebido'), cel('Responsável por receber'), cel('Profissional'), cel('Quantidade'), cel('Data da devolução'), cel('Assinatura')],
        linhas: items.map(it => [cel(it.dataRecebido), cel(it.responsavel), cel(it.profissional), cel(it.quantidade), cel(it.dataDevolucao), cel(it.assinatura)]),
      }
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, doc: { tabelas: [tabela] } }) })
      if (res.ok) {
        toast.success('Lista salva!'); setDirty(false)
        setUltimaAtualizacao(new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))
      } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function abrirNovo() { setModal({ id: rid(), dataRecebido: hojeBR(), responsavel: '', profissional: '', quantidade: '1', dataDevolucao: '', assinatura: '' }) }
  function abrirEditar(it: Item) { setModal({ ...it }) }
  function salvarModal() {
    if (!modal) return
    if (!modal.profissional.trim()) { toast('Informe o profissional', { icon: '✍️' }); return }
    setItems(prev => prev.some(x => x.id === modal.id) ? prev.map(x => x.id === modal.id ? modal : x) : [...prev, modal])
    setDirty(true); setModal(null)
  }
  function excluir(id: string) {
    if (!confirm('Remover este registro?')) return
    setItems(prev => prev.filter(x => x.id !== id)); setDirty(true)
  }
  function marcarDevolvido(id: string) { setItems(prev => prev.map(x => x.id === id ? { ...x, dataDevolucao: hojeBR() } : x)); setDirty(true) }
  function reabrir(id: string) { setItems(prev => prev.map(x => x.id === id ? { ...x, dataDevolucao: '' } : x)); setDirty(true) }

  const buscaN = busca.trim().toLowerCase()
  const itensFiltrados = buscaN ? items.filter(it => it.profissional.toLowerCase().includes(buscaN) || it.responsavel.toLowerCase().includes(buscaN)) : items

  const pendentes = items.filter(it => !it.dataDevolucao.trim()).length
  const devolvidos = items.length - pendentes
  const profissionaisEnvolvidos = new Set(items.map(it => it.profissional.trim()).filter(Boolean)).size

  async function imprimir() {
    const logoSalao = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const linhas = items.map(it => `<tr><td>${esc(it.dataRecebido)}</td><td>${esc(it.responsavel)}</td><td>${esc(it.profissional)}</td><td>${esc(it.quantidade)}</td><td>${esc(it.dataDevolucao) || '—'}</td><td>${esc(it.assinatura)}</td></tr>`).join('')
    const cab = logoSalao ? `<img src="${logoSalao}" style="max-height:54px;max-width:190px;object-fit:contain"/>` : `<div style="font-size:22px;font-weight:900;color:${COR}">NODRI</div>`
    const css = `@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px}.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${COR};padding-bottom:8px;margin-bottom:12px}h1{font-size:15px;margin-bottom:10px;text-transform:uppercase}table{width:100%;border-collapse:collapse}th,td{border:1px solid #f0ede6;text-align:left;padding:6px 8px}th{background:#f6f4ff;color:${COR};border-bottom:2px solid ${COR};font-size:10px;text-transform:uppercase}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Controle de Alicates</title><style>${css}</style></head><body><div class="hd">${cab}<span style="font-size:10px;color:#777">${new Date().toLocaleDateString('pt-BR')}</span></div><h1>${esc(TITULO_TABELA)}</h1><table><thead><tr><th>Recebido</th><th>Responsável</th><th>Profissional</th><th>Qtd</th><th>Devolução</th><th>Assinatura</th></tr></thead><tbody>${linhas}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div>
      <style>{`
        .alic-table tbody tr:nth-child(even) { background:#fbfbfa; }
        .alic-table tbody tr:hover { background:#f5f4fd; }
        .alic-card:hover { box-shadow:0 4px 14px rgba(0,0,0,.08); border-color:#d9d5f5; }
      `}</style>

      {/* ── Barra de controles ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '10px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar profissional, responsável..."
            style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8, border: '1px solid #d0cdc7', fontSize: 13 }} />
        </div>
        <div style={{ flex: 1 }} />
        {dirty && !salvando && <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Alterações não salvas</span>}
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir A4</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
        <button onClick={abrirNovo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Registrar Empréstimo</button>
      </div>

      {/* ── Dashboard resumido ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon={<Wrench size={16} />} label="Total de registros" value={String(items.length)} sub="alicates controlados" />
        <StatCard icon={<Clock3 size={16} />} label="Pendentes" value={String(pendentes)} sub="aguardando devolução" cor="#dc2626" />
        <StatCard icon={<CheckCircle2 size={16} />} label="Devolvidos" value={String(devolvidos)} sub="já retornaram" cor="#16a34a" />
        <StatCard icon={<Users size={16} />} label="Profissionais" value={String(profissionaisEnvolvidos)} sub="envolvidos" cor="#2563eb" />
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div> : (
        itensFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
            {items.length === 0 ? <>Nenhum alicate registrado ainda. Clique em <strong style={{ color: COR }}>+ Registrar Empréstimo</strong> para começar.</> : 'Nenhum registro encontrado para essa busca.'}
          </div>
        ) : mobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {itensFiltrados.map(it => {
              const pendente = !it.dataDevolucao.trim()
              return (
                <div key={it.id} className="alic-card" style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: 14, transition: 'box-shadow .15s, border-color .15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>Recebido em {it.dataRecebido || '—'}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => abrirEditar(it)} style={iconBtn('#5b4fcf')}><Pencil size={13} /></button>
                      <button onClick={() => excluir(it.id)} style={iconBtn('#dc2626')}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: '#1a1a1a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Wrench size={14} color={COR} /> {it.profissional}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12.5 }}>
                    <div><span style={{ color: '#9ca3af' }}>Quantidade</span><br /><strong>{it.quantidade || '—'}</strong></div>
                    <div><span style={{ color: '#9ca3af' }}>Responsável</span><br /><strong>{it.responsavel || '—'}</strong></div>
                  </div>
                  <div style={{ marginTop: 10, padding: '8px 10px', background: pendente ? '#fef2f2' : '#f0fdf4', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: pendente ? '#dc2626' : '#16a34a' }}>{pendente ? '🔴 PENDENTE' : `✓ DEVOLVIDO ${it.dataDevolucao}`}</span>
                    {pendente
                      ? <button onClick={() => marcarDevolvido(it.id)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Marcar devolvido</button>
                      : <button onClick={() => reabrir(it.id)} title="Reabrir" style={iconBtn('#6b6860')}><RotateCcw size={13} /></button>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, overflowX: 'auto' }}>
            <table className="alic-table" style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Profissional', 'Responsável', 'Quantidade', 'Recebido', 'Situação', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: i >= 2 && i <= 4 ? 'center' : 'left', padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #e8e6e0', background: '#faf9f7' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itensFiltrados.map(it => {
                  const pendente = !it.dataDevolucao.trim()
                  return (
                    <tr key={it.id} style={{ borderBottom: '1px solid #f0eee8' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}><Wrench size={14} color={COR} /> {it.profissional}</td>
                      <td style={{ padding: '12px 16px', color: '#374151' }}>{it.responsavel || '—'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#374151' }}>{it.quantidade || '—'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b6860', fontSize: 12.5 }}>{it.dataRecebido || '—'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {pendente
                          ? <button onClick={() => marcarDevolvido(it.id)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>🔴 Pendente — marcar devolvido</button>
                          : <button onClick={() => reabrir(it.id)} title="Clique para reabrir" style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>✓ Devolvido {it.dataDevolucao}</button>}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => abrirEditar(it)} style={iconBtn('#5b4fcf')}><Pencil size={13} /></button>
                        <button onClick={() => excluir(it.id)} style={iconBtn('#dc2626')}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#1a1a1a' }}>{items.some(x => x.id === modal.id) ? '✏️ Editar registro' : '🔧 Registrar empréstimo'}</h3>
              <button onClick={() => setModal(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>

            <Campo label="Profissional">
              <input list="alic-profs" value={modal.profissional} onChange={e => setModal({ ...modal, profissional: e.target.value })} placeholder="Selecionar ou digitar..." autoFocus style={inputSt} />
              <datalist id="alic-profs">{profsSalao.map(p => <option key={p.id} value={p.nome} />)}</datalist>
            </Campo>

            <Campo label="Responsável por receber">
              <input value={modal.responsavel} onChange={e => setModal({ ...modal, responsavel: e.target.value })} placeholder="Quem entregou o alicate" style={inputSt} />
            </Campo>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Campo label="Quantidade">
                <input value={modal.quantidade} onChange={e => setModal({ ...modal, quantidade: e.target.value })} placeholder="Ex: 1" style={inputSt} />
              </Campo>
              <Campo label="Data recebido">
                <input type="date" value={brToIso(modal.dataRecebido)} onChange={e => setModal({ ...modal, dataRecebido: isoToBr(e.target.value) })} style={inputSt} />
              </Campo>
            </div>

            <Campo label="Data da devolução (deixe vazio se ainda não devolveu)">
              <input type="date" value={brToIso(modal.dataDevolucao)} onChange={e => setModal({ ...modal, dataDevolucao: isoToBr(e.target.value) })} style={inputSt} />
            </Campo>

            <Campo label="Assinatura / observação">
              <input value={modal.assinatura} onChange={e => setModal({ ...modal, assinatura: e.target.value })} placeholder="Opcional" style={inputSt} />
            </Campo>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarModal} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub, cor = COR }: { icon: React.ReactNode; label: string; value: string; sub: string; cor?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, color: cor }}>{icon}<span style={{ fontSize: 11.5, fontWeight: 700, color: '#6b6860' }}>{label}</span></div>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a1a', lineHeight: 1.15 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b6860', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const inputSt: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 9, border: '1.5px solid #d0cdc7', fontSize: 13.5, fontFamily: 'inherit' }
function iconBtn(cor: string): React.CSSProperties { return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: cor, cursor: 'pointer' } }
