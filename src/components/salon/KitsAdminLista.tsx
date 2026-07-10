'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Package, Hand, Footprints, Wallet, Clock3, CheckCircle2, Trash2 } from 'lucide-react'
import { useIsMobile } from '@/lib/useIsMobile'
import { mesmoProf, type KitsSolicitacao, type KitsConfig } from '@/lib/kitsShared'

const COR = '#5b4fcf'

interface LinhaCruzamento { nome: string; atendimentosMao: number; atendimentosPe: number; pedidosMao: number; pedidosPe: number }

function mesAtualKits() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function fmtBRL(n: number) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function KitsAdminLista() {
  const mobile = useIsMobile()
  const [mes, setMes] = useState(mesAtualKits())
  const [cfg, setCfg] = useState<KitsConfig>({ precoMao: 0, precoPe: 0 })
  const [salvandoCfg, setSalvandoCfg] = useState(false)
  const [solicitacoes, setSolicitacoes] = useState<KitsSolicitacao[]>([])
  const [atendimentos, setAtendimentos] = useState<{ profissional: string; atendimentosMao: number; atendimentosPe: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/kits/config').then(r => r.ok ? r.json() : null).then(d => { if (d) setCfg(d) }).catch(() => { })
  }, [])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [ano, mesNum] = mes.split('-').map(Number)
      const [sol, atend] = await Promise.all([
        fetch(`/api/kits/solicitacoes?mes=${mes}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/relatorios/kits-atendimentos?ano=${ano}&mes=${mesNum}`).then(r => r.ok ? r.json() : null),
      ])
      setSolicitacoes(Array.isArray(sol?.solicitacoes) ? sol.solicitacoes : [])
      setAtendimentos(Array.isArray(atend?.profissionais) ? atend.profissionais : [])
    } catch { setSolicitacoes([]); setAtendimentos([]) }
    setLoading(false)
  }, [mes])
  useEffect(() => { carregar() }, [carregar])

  async function salvarConfig() {
    setSalvandoCfg(true)
    try {
      const res = await fetch('/api/kits/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) })
      if (res.ok) toast.success('Preços salvos!'); else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvandoCfg(false)
  }

  async function marcarSeparado(id: string) {
    try {
      const res = await fetch('/api/kits/solicitacoes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, mes }) })
      if (res.ok) { toast.success('Separado! A profissional foi avisada.'); carregar() }
      else toast.error('Erro ao marcar separado')
    } catch { toast.error('Erro de conexão') }
  }

  async function excluirSolicitacao(id: string) {
    if (!confirm('Remover esta solicitação?')) return
    try {
      const res = await fetch(`/api/kits/solicitacoes?id=${id}&mes=${mes}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Removida!'); carregar() }
      else toast.error('Erro ao remover')
    } catch { toast.error('Erro de conexão') }
  }

  const linhas: LinhaCruzamento[] = atendimentos.map(a => {
    const doProf = solicitacoes.filter(s => mesmoProf(s.profissionalNome, a.profissional))
    return {
      nome: a.profissional, atendimentosMao: a.atendimentosMao, atendimentosPe: a.atendimentosPe,
      pedidosMao: doProf.reduce((s, x) => s + x.kitsMao, 0), pedidosPe: doProf.reduce((s, x) => s + x.kitsPe, 0),
    }
  })

  const pendentes = solicitacoes.filter(s => s.status === 'pendente')
  const separados = solicitacoes.filter(s => s.status === 'separado')
  const valorTotal = solicitacoes.reduce((s, x) => s + x.valor, 0)

  return (
    <div>
      <style>{`
        .kits-table tbody tr:nth-child(even) { background:#fbfbfa; }
        .kits-table tbody tr:hover { background:#f5f4fd; }
      `}</style>

      {/* ── Configuração de preço ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 18 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a1a', margin: '0 0 12px' }}>💲 Preço por kit</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b6860', marginBottom: 5 }}>Kit Mão (R$)</label>
            <input value={cfg.precoMao || ''} onChange={e => setCfg({ ...cfg, precoMao: Number(e.target.value) || 0 })} placeholder="0,00" style={{ width: 120, padding: '9px 11px', borderRadius: 9, border: '1.5px solid #d0cdc7', fontSize: 13.5 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b6860', marginBottom: 5 }}>Kit Pé (R$)</label>
            <input value={cfg.precoPe || ''} onChange={e => setCfg({ ...cfg, precoPe: Number(e.target.value) || 0 })} placeholder="0,00" style={{ width: 120, padding: '9px 11px', borderRadius: 9, border: '1.5px solid #d0cdc7', fontSize: 13.5 }} />
          </div>
          <button onClick={salvarConfig} disabled={salvandoCfg} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 16px', borderRadius: 9, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', height: 38 }}>{salvandoCfg ? '...' : <><Save size={14} /> Salvar preço</>}</button>
        </div>
        <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '10px 0 0' }}>A profissional vê esse valor antes de pedir, pra saber quanto vai pagar.</p>
      </div>

      {/* ── Mês ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860' }}>Mês:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 9px', borderRadius: 8, border: '1px solid #d0cdc7', fontSize: 13 }} />
      </div>

      {/* ── Dashboard ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon={<Package size={16} />} label="Solicitações" value={String(solicitacoes.length)} sub="no mês" />
        <StatCard icon={<Clock3 size={16} />} label="Pendentes" value={String(pendentes.length)} sub="aguardando separar" cor={pendentes.length > 0 ? '#b45309' : '#16a34a'} />
        <StatCard icon={<CheckCircle2 size={16} />} label="Separados" value={String(separados.length)} sub="prontos" cor="#16a34a" />
        <StatCard icon={<Wallet size={16} />} label="Valor total" value={`R$ ${fmtBRL(valorTotal)}`} sub="a receber" cor="#16a34a" />
      </div>

      {/* ── Cruzamento atendimentos x pedidos ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px' }}>📊 Atendimentos x Pedidos — {mes.split('-').reverse().join('/')}</h3>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Loader2 size={20} className="animate-spin" style={{ color: COR }} /></div> :
          linhas.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', padding: '16px 0' }}>Nenhum atendimento de manicure/pedicure encontrado nos Relatórios para este mês.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {linhas.map(l => (
                <div key={l.nome} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', borderRadius: 10, background: '#faf9f7', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 13.5, color: '#1a1a1a', minWidth: 130 }}>{l.nome}</strong>
                  <span style={{ fontSize: 12, color: '#374151', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Hand size={13} color={COR} /> {l.atendimentosMao} atend. / {l.pedidosMao} pedido{l.pedidosMao !== 1 ? 's' : ''}</span>
                  <span style={{ fontSize: 12, color: '#374151', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Footprints size={13} color={COR} /> {l.atendimentosPe} atend. / {l.pedidosPe} pedido{l.pedidosPe !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* ── Lista de solicitações ── */}
      <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>📦 Solicitações do mês</h3>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div> : (
        solicitacoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
            Nenhuma solicitação de kit neste mês ainda.
          </div>
        ) : mobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {solicitacoes.map(s => (
              <div key={s.id} style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>{s.data}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: s.status === 'pendente' ? '#b45309' : '#16a34a' }}>{s.status === 'pendente' ? '⏳ Pendente' : '✓ Separado'}</span>
                    <button onClick={() => excluirSolicitacao(s.id)} title="Remover" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 2 }}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14.5, color: '#1a1a1a', marginBottom: 6 }}>{s.profissionalNome}</div>
                <div style={{ fontSize: 12.5, color: '#374151' }}>{s.kitsMao} kit(s) mão · {s.kitsPe} kit(s) pé</div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 14, color: '#16a34a' }}>R$ {fmtBRL(s.valor)}</strong>
                  {s.status === 'pendente' && <button onClick={() => marcarSeparado(s.id)} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Marcar separado</button>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, overflowX: 'auto' }}>
            <table className="kits-table" style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Profissional', 'Kits mão', 'Kits pé', 'Valor', 'Data', 'Situação', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: i >= 1 && i <= 4 ? 'center' : 'left', padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #e8e6e0', background: '#faf9f7' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {solicitacoes.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f0eee8' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1a1a1a' }}>{s.profissionalNome}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#374151' }}>{s.kitsMao}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#374151' }}>{s.kitsPe}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>R$ {fmtBRL(s.valor)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b6860', fontSize: 12.5 }}>{s.data}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {s.status === 'pendente'
                        ? <button onClick={() => marcarSeparado(s.id)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#fffbeb', color: '#b45309', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>⏳ Pendente — marcar separado</button>
                        : <span style={{ padding: '5px 10px', borderRadius: 7, background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 800 }}>✓ Separado {s.dataSeparado}</span>}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button onClick={() => excluirSolicitacao(s.id)} title="Remover" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 4 }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub, cor = COR }: { icon: React.ReactNode; label: string; value: string; sub: string; cor?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, color: cor }}>{icon}<span style={{ fontSize: 11.5, fontWeight: 700, color: '#6b6860' }}>{label}</span></div>
      <div style={{ fontSize: 19, fontWeight: 900, color: '#1a1a1a', lineHeight: 1.15 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>
    </div>
  )
}
