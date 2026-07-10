'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Plus, Trash2, Pencil, X, Sparkles, ShieldCheck, ShieldAlert, Users, Scissors } from 'lucide-react'
import { useIsMobile } from '@/lib/useIsMobile'
import { cel, type Cell } from './GridEditavel'

interface ProfSalao { id: string; nome: string; telefone?: string }
interface Item { id: string; profissional: string; quantidade: string; data: string; observacao: string }
interface LinhaCruzamento { nome: string; atendimentos: number; esterilizacoes: number; registros: number; servicos: string[] }

const COR = '#5b4fcf'
const TITULO_TABELA = 'REGISTRO DE ESTERILIZAÇÃO'

const rid = () => Math.random().toString(36).slice(2, 9)
function mesAtual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function hojeBR() { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` }
function brToIso(s: string) { const m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : '' }
function isoToBr(s: string) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : s }
function normaliza(s: string) { return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim() }
function mesmoProf(a: string, b: string) { const na = normaliza(a), nb = normaliza(b); if (!na || !nb) return false; return na === nb || na.includes(nb) || nb.includes(na) }

export default function EsterilizacaoLista({ chave = 'esterilizacao', profsSalao = [] }: { chave?: string; profsSalao?: ProfSalao[] }) {
  const mobile = useIsMobile()
  const [mes, setMes] = useState(mesAtual())
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [modal, setModal] = useState<Item | null>(null)
  const [cruzamento, setCruzamento] = useState<LinhaCruzamento[]>([])
  const [loadingCruzamento, setLoadingCruzamento] = useState(true)

  const chaveEfetiva = `${chave}_${mes}`

  const linhasParaItems = (linhas: Cell[][]): Item[] =>
    linhas.filter(l => l.some(c => (c?.t || '').trim())).map(l => ({
      id: rid(), profissional: l[0]?.t || '', quantidade: l[1]?.t || '', data: l[2]?.t || '', observacao: l[3]?.t || '',
    }))

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chaveEfetiva)}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.tabelas) && d.tabelas[0]) setItems(linhasParaItems(d.tabelas[0].linhas || []))
      else setItems([])
      setDirty(false)
    } catch { setItems([]); setDirty(false) }
    setLoading(false)
  }, [chaveEfetiva])
  useEffect(() => { carregar() }, [carregar])

  const carregarCruzamento = useCallback(async () => {
    setLoadingCruzamento(true)
    try {
      const [ano, mesNum] = mes.split('-').map(Number)
      const d = await fetch(`/api/relatorios/esterilizacao?ano=${ano}&mes=${mesNum}`).then(r => r.ok ? r.json() : null)
      setCruzamento(Array.isArray(d?.profissionais) ? d.profissionais.map((p: any) => ({ nome: p.profissional, atendimentos: p.atendimentos, esterilizacoes: 0, registros: 0, servicos: Object.keys(p.servicos || {}) })) : [])
    } catch { setCruzamento([]) }
    setLoadingCruzamento(false)
  }, [mes])
  useEffect(() => { carregarCruzamento() }, [carregarCruzamento])

  async function salvar() {
    setSalvando(true)
    try {
      const tabela = {
        titulo: TITULO_TABELA,
        cabecalho: [cel('Profissional'), cel('Quantidade'), cel('Data'), cel('Observação')],
        linhas: items.map(it => [cel(it.profissional), cel(it.quantidade), cel(it.data), cel(it.observacao)]),
      }
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: chaveEfetiva, doc: { tabelas: [tabela] } }) })
      if (res.ok) { toast.success('Registros salvos!'); setDirty(false) }
      else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function abrirNovo() { setModal({ id: rid(), profissional: '', quantidade: '1', data: hojeBR(), observacao: '' }) }
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

  // Combina o cruzamento (atendimentos vindos dos Relatórios) com as
  // esterilizações registradas nesta lista, casando o nome do profissional
  // de forma flexível (o nome importado do Excel nem sempre é igual ao apelido).
  const linhas: LinhaCruzamento[] = cruzamento.map(c => {
    const doProf = items.filter(it => mesmoProf(it.profissional, c.nome))
    const esterilizacoes = doProf.reduce((s, it) => s + (Number(String(it.quantidade).replace(',', '.')) || 0), 0)
    return { ...c, esterilizacoes, registros: doProf.length }
  }).sort((a, b) => b.atendimentos - a.atendimentos)

  const totalAtendimentos = linhas.reduce((s, l) => s + l.atendimentos, 0)
  const totalEsterilizacoes = items.reduce((s, it) => s + (Number(String(it.quantidade).replace(',', '.')) || 0), 0)
  const emAlerta = linhas.filter(l => l.atendimentos > 0 && l.registros === 0).length
  const profissionaisEnvolvidos = new Set(items.map(it => it.profissional.trim()).filter(Boolean)).size

  return (
    <div>
      <style>{`
        .ester-table tbody tr:nth-child(even) { background:#fbfbfa; }
        .ester-table tbody tr:hover { background:#f5f4fd; }
        .ester-card:hover { box-shadow:0 4px 14px rgba(0,0,0,.08); border-color:#d9d5f5; }
      `}</style>

      {/* ── Barra de controles ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '10px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860' }}>Mês:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 9px', borderRadius: 8, border: '1px solid #d0cdc7', fontSize: 13 }} />
        <div style={{ flex: 1 }} />
        {dirty && !salvando && <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Alterações não salvas</span>}
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
        <button onClick={abrirNovo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Registrar Esterilização</button>
      </div>

      <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 16px' }}>
        Cruza os atendimentos de manicure, pedicure e sobrancelha (mesmo dado dos Relatórios) com as esterilizações que você registrar aqui, pra ajudar a enxergar quem está deixando de esterilizar entre os clientes.
      </p>

      {/* ── Dashboard resumido ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon={<Scissors size={16} />} label="Atendimentos c/ alicate" value={String(totalAtendimentos)} sub="manicure, pedicure, sobrancelha" />
        <StatCard icon={<Sparkles size={16} />} label="Esterilizações registradas" value={String(totalEsterilizacoes)} sub="itens de material" cor="#16a34a" />
        <StatCard icon={<Users size={16} />} label="Profissionais no registro" value={String(profissionaisEnvolvidos)} sub="lançaram esterilização" cor="#2563eb" />
        <StatCard icon={<ShieldAlert size={16} />} label="Em alerta" value={String(emAlerta)} sub="atenderam e não registraram" cor={emAlerta > 0 ? '#dc2626' : '#16a34a'} />
      </div>

      {/* ── Painel comparativo ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px' }}>📊 Atendimentos x Esterilização — {mes.split('-').reverse().join('/')}</h3>
        {loadingCruzamento || loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Loader2 size={20} className="animate-spin" style={{ color: COR }} /></div> :
          linhas.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', padding: '16px 0' }}>Nenhum atendimento de manicure/pedicure/sobrancelha encontrado nos Relatórios para este mês.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {linhas.map(l => {
                const critico = l.atendimentos > 0 && l.registros === 0
                const atencao = !critico && l.registros > 0 && l.esterilizacoes < l.atendimentos
                const ok = !critico && !atencao
                const cor = critico ? '#dc2626' : atencao ? '#b45309' : '#16a34a'
                const bg = critico ? '#fef2f2' : atencao ? '#fffbeb' : '#f0fdf4'
                return (
                  <div key={l.nome} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: bg, flexWrap: 'wrap' }}>
                    {critico ? <ShieldAlert size={16} color={cor} /> : ok ? <ShieldCheck size={16} color={cor} /> : <ShieldAlert size={16} color={cor} />}
                    <strong style={{ fontSize: 13.5, color: '#1a1a1a', minWidth: 120 }}>{l.nome}</strong>
                    <span style={{ fontSize: 12, color: '#374151' }}>{l.atendimentos} atendimento{l.atendimentos !== 1 ? 's' : ''}</span>
                    <span style={{ fontSize: 12, color: '#374151' }}>· {l.esterilizacoes} esterilizaç{l.esterilizacoes !== 1 ? 'ões' : 'ão'} registrada{l.esterilizacoes !== 1 ? 's' : ''}</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: cor }}>{critico ? '🔴 Nunca registrou' : atencao ? '🟡 Abaixo do esperado' : '✓ Em dia'}</span>
                  </div>
                )
              })}
            </div>
          )}
      </div>

      {/* ── Lista de registros ── */}
      <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>🧽 Registros de esterilização do mês</h3>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div> : (
        items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
            Nenhum registro ainda. Clique em <strong style={{ color: COR }}>+ Registrar Esterilização</strong> para começar.
          </div>
        ) : mobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(it => (
              <div key={it.id} className="ester-card" style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>{it.data}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => abrirEditar(it)} style={iconBtn('#5b4fcf')}><Pencil size={13} /></button>
                    <button onClick={() => excluir(it.id)} style={iconBtn('#dc2626')}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14.5, color: '#1a1a1a', marginBottom: 6 }}>{it.profissional}</div>
                <div style={{ fontSize: 12.5, color: '#374151' }}>Quantidade de material: <strong>{it.quantidade || '—'}</strong></div>
                {it.observacao && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>{it.observacao}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, overflowX: 'auto' }}>
            <table className="ester-table" style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Profissional', 'Quantidade', 'Data', 'Observação', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 1 || i === 2 ? 'center' : 'left', padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #e8e6e0', background: '#faf9f7' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id} style={{ borderBottom: '1px solid #f0eee8' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1a1a1a' }}>{it.profissional}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#374151' }}>{it.quantidade || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b6860', fontSize: 12.5 }}>{it.data || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 12.5 }}>{it.observacao || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => abrirEditar(it)} style={iconBtn('#5b4fcf')}><Pencil size={13} /></button>
                      <button onClick={() => excluir(it.id)} style={iconBtn('#dc2626')}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#1a1a1a' }}>{items.some(x => x.id === modal.id) ? '✏️ Editar registro' : '🧽 Registrar esterilização'}</h3>
              <button onClick={() => setModal(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>

            <Campo label="Profissional">
              <input list="ester-profs" value={modal.profissional} onChange={e => setModal({ ...modal, profissional: e.target.value })} placeholder="Selecionar ou digitar..." autoFocus style={inputSt} />
              <datalist id="ester-profs">{profsSalao.map(p => <option key={p.id} value={p.nome} />)}</datalist>
            </Campo>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Campo label="Quantidade de material">
                <input value={modal.quantidade} onChange={e => setModal({ ...modal, quantidade: e.target.value })} placeholder="Ex: 3" style={inputSt} />
              </Campo>
              <Campo label="Data">
                <input type="date" value={brToIso(modal.data)} onChange={e => setModal({ ...modal, data: isoToBr(e.target.value) })} style={inputSt} />
              </Campo>
            </div>

            <Campo label="Observação">
              <input value={modal.observacao} onChange={e => setModal({ ...modal, observacao: e.target.value })} placeholder="Opcional" style={inputSt} />
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
