'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, CheckCircle2, Clock3, Trash2, PackageCheck, Inbox } from 'lucide-react'
import { STATUS_ESTER, type PedidoEster } from '@/lib/esterilizacaoFluxo'

const COR = '#5b4fcf'

export default function EsterilizacaoFluxoAdmin({ profsSalao = [] }: { profsSalao?: any[] }) {
  const [pedidos, setPedidos] = useState<PedidoEster[]>([])
  const [loading, setLoading] = useState(true)
  const [recebendo, setRecebendo] = useState<string | null>(null)   // id em recebimento
  const [rQtd, setRQtd] = useState(''); const [rObs, setRObs] = useState('')
  // registro avulso (quem não solicitou)
  const [avProf, setAvProf] = useState(''); const [avQtd, setAvQtd] = useState(''); const [avObs, setAvObs] = useState('')
  const [enviandoAv, setEnviandoAv] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const d = await fetch('/api/salon/esterilizacao-fluxo').then(r => r.ok ? r.json() : null)
      setPedidos(Array.isArray(d?.pedidos) ? d.pedidos : [])
    } catch { /* mantém */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  // profsSalao vem como { id, nome, telefone } — o nome já é apelido||nome_completo.
  const profs = profsSalao.filter(p => (p.nome || '').trim() && p.nome !== '—')
  const nomeProf = (p: any) => p.nome || p.apelido || p.nome_completo || 'Profissional'

  async function acao(id: string, corpo: any, msg: string) {
    try {
      const res = await fetch('/api/salon/esterilizacao-fluxo', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...corpo }) })
      if (res.ok) { toast.success(msg); setRecebendo(null); setRQtd(''); setRObs(''); carregar() }
      else { const e = await res.json().catch(() => null); toast.error(e?.error || 'Erro') }
    } catch { toast.error('Erro de conexão') }
  }

  async function registrarAvulso() {
    const n = Math.max(0, Math.round(Number(avQtd) || 0))
    if (!avProf || !n) { toast('Escolha a profissional e a quantidade', { icon: '' }); return }
    setEnviandoAv(true)
    try {
      const res = await fetch('/api/salon/esterilizacao-fluxo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profissionalId: avProf, qtdRecebida: n, obsRecebimento: avObs.trim() }) })
      if (res.ok) { toast.success('Registrado. A profissional foi avisada.'); setAvProf(''); setAvQtd(''); setAvObs(''); carregar() }
      else { const e = await res.json().catch(() => null); toast.error(e?.error || 'Erro') }
    } catch { toast.error('Erro de conexão') }
    setEnviandoAv(false)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este registro?')) return
    try {
      const res = await fetch(`/api/salon/esterilizacao-fluxo?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Excluído'); carregar() } else toast.error('Erro ao excluir')
    } catch { toast.error('Erro de conexão') }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div>

  const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }

  return (
    <div>
      {/* Registro avulso — quem deixou sem solicitar */}
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 16, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Inbox size={18} style={{ color: '#b45309' }} />
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#92400e', margin: 0 }}>Registrar sem solicitação (a profissional deixou, mas não pediu pelo sistema)</h3>
        </div>
        <p style={{ fontSize: 12, color: '#92400e', margin: '0 0 12px' }}>A profissional recebe um aviso de que a quantidade não foi informada por ela — o salão não se responsabiliza pela quantidade.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
          <select value={avProf} onChange={e => setAvProf(e.target.value)} style={inp}>
            <option value="">Selecione a profissional…</option>
            {profs.map(p => <option key={p.id} value={p.id}>{nomeProf(p)}{p.cargo ? ` — ${p.cargo}` : ''}</option>)}
          </select>
          <input value={avQtd} onChange={e => setAvQtd(e.target.value)} placeholder="Qtd. recebida" inputMode="numeric" style={inp} />
        </div>
        <input value={avObs} onChange={e => setAvObs(e.target.value)} placeholder="Observação (opcional)" style={{ ...inp, width: '100%', marginBottom: 10 }} />
        <button onClick={registrarAvulso} disabled={enviandoAv} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none', background: '#b45309', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', opacity: enviandoAv ? .6 : 1 }}>
          {enviandoAv ? <Loader2 size={14} className="animate-spin" /> : <Inbox size={14} />} Registrar e avisar
        </button>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>Alicates para esterilizar</h3>
      {pedidos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13.5, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>Nenhum pedido no momento.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pedidos.map(p => {
            const si = STATUS_ESTER[p.status]
            const divergencia = p.origem === 'profissional' && typeof p.qtdRecebida === 'number' && p.qtdRecebida !== p.qtdEnviada
            return (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {p.status === 'concluido' ? <CheckCircle2 size={16} color="#16a34a" /> : <Clock3 size={16} color={si.cor} />}
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e' }}>{p.profNome}</span>
                  <span style={{ fontSize: 12.5, color: '#374151' }}>
                    {p.origem === 'salao' ? `deixou ${p.qtdRecebida} (sem solicitar)` : `enviou ${p.qtdEnviada} alicate(s)`}
                    {typeof p.qtdRecebida === 'number' && p.origem === 'profissional' ? ` · recebido: ${p.qtdRecebida}` : ''}
                    {typeof p.qtdEntregue === 'number' ? ` · entregue: ${p.qtdEntregue}` : ''}
                  </span>
                  {/* Data do pedido — é por ela que o painel "Atendimentos x
                      Esterilização" sabe a que mês este alicate pertence. */}
                  {(p.dataEnvio || p.dataRecebimento || p.dataEntrega) && (
                    <span style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 700 }}>
                      {p.dataEnvio || p.dataRecebimento || p.dataEntrega}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: si.bg, color: si.cor }}>{si.label}</span>
                  <button onClick={() => excluir(p.id)} title="Excluir" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 2 }}><Trash2 size={14} /></button>
                </div>

                {divergencia && <div style={{ marginTop: 6, fontSize: 12, color: '#b45309' }}>Divergência: informou {p.qtdEnviada}, recebido {p.qtdRecebida}.</div>}
                {p.obsRecebimento && <div style={{ marginTop: 6, fontSize: 12, color: '#374151' }}><b>Obs.:</b> {p.obsRecebimento}</div>}

                {/* Ação: RECEBER (pedido enviado pela profissional) */}
                {p.status === 'enviado' && (
                  recebendo === p.id ? (
                    <div style={{ marginTop: 10, background: '#f7f6fb', borderRadius: 10, padding: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 8 }}>
                        <input value={rQtd} onChange={e => setRQtd(e.target.value)} placeholder={`Recebido (informou ${p.qtdEnviada})`} inputMode="numeric" style={inp} />
                        <input value={rObs} onChange={e => setRObs(e.target.value)} placeholder="Observação (ex.: divergência)" style={inp} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => acao(p.id, { acao: 'receber', qtdRecebida: Number(rQtd) || p.qtdEnviada, obsRecebimento: rObs }, 'Recebimento confirmado!')} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>OK, recebido</button>
                        <button onClick={() => { setRecebendo(null); setRQtd(''); setRObs('') }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#6b6860', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setRecebendo(p.id); setRQtd(String(p.qtdEnviada || '')); setRObs('') }} style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: 'none', background: COR, color: '#fff', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>
                      <PackageCheck size={14} /> Confirmar recebimento
                    </button>
                  )
                )}

                {/* Ação: ENTREGAR (esterilizado) */}
                {p.status === 'recebido' && (
                  <button onClick={() => acao(p.id, { acao: 'entregar', qtdEntregue: p.qtdRecebida }, 'Marcado como entregue. A profissional vai confirmar.')} style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>
                    <CheckCircle2 size={14} /> Marcar como entregue ({p.qtdRecebida})
                  </button>
                )}

                {p.status === 'entregue' && <div style={{ marginTop: 8, fontSize: 12, color: '#7c3aed', fontWeight: 700 }}>Aguardando a profissional confirmar o recebimento.</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
