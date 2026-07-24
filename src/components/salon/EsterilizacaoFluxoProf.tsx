'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Send, ShieldCheck, CheckCircle2, Clock3, AlertTriangle } from 'lucide-react'
import { STATUS_ESTER, type PedidoEster } from '@/lib/esterilizacaoFluxo'

const COR = '#5b4fcf'

export default function EsterilizacaoFluxoProf() {
  const [pedidos, setPedidos] = useState<PedidoEster[]>([])
  const [loading, setLoading] = useState(true)
  const [qtd, setQtd] = useState('')
  const [enviando, setEnviando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const d = await fetch('/api/salon/esterilizacao-fluxo').then(r => r.ok ? r.json() : null)
      setPedidos(Array.isArray(d?.pedidos) ? d.pedidos : [])
    } catch { /* mantém */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function enviar() {
    const n = Math.max(0, Math.round(Number(qtd) || 0))
    if (!n) { toast('Informe a quantidade de alicates', { icon: '✍️' }); return }
    setEnviando(true)
    try {
      const res = await fetch('/api/salon/esterilizacao-fluxo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qtdEnviada: n }) })
      if (res.ok) { toast.success('Enviado! O salão vai confirmar o recebimento.'); setQtd(''); carregar() }
      else { const e = await res.json().catch(() => null); toast.error(e?.error || 'Erro ao enviar') }
    } catch { toast.error('Erro de conexão') }
    setEnviando(false)
  }

  async function confirmar(id: string) {
    try {
      const res = await fetch('/api/salon/esterilizacao-fluxo', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, acao: 'confirmar' }) })
      if (res.ok) { toast.success('Recebimento confirmado!'); carregar() }
      else toast.error('Erro ao confirmar')
    } catch { toast.error('Erro de conexão') }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div>

  const aConfirmar = pedidos.filter(p => p.status === 'entregue')

  return (
    <div>
      {/* Confirmações pendentes em destaque */}
      {aConfirmar.map(p => (
        <div key={p.id} style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 14, padding: '14px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <CheckCircle2 size={22} color="#7c3aed" />
          <div style={{ flex: 1, minWidth: 180 }}>
            <strong style={{ fontSize: 13.5, color: '#6d28d9' }}>Entregue {p.qtdEntregue} alicate(s) esterilizado(s)</strong>
            <div style={{ fontSize: 12, color: '#374151' }}>Confira e confirme o recebimento.</div>
          </div>
          <button onClick={() => confirmar(p.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            <CheckCircle2 size={15} /> Confirmar recebimento
          </button>
        </div>
      ))}

      {/* Enviar alicates para esterilizar */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 18, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <ShieldCheck size={18} style={{ color: COR }} />
          <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Enviar alicates para esterilização</h3>
        </div>
        <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 14px' }}>Informe quantos alicates você está deixando. O salão confirma o recebimento e avisa quando estiver pronto.</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 5 }}>Quantidade de alicates</label>
            <input value={qtd} onChange={e => setQtd(e.target.value)} placeholder="0" inputMode="numeric"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #d0cdc7', fontSize: 15 }} />
          </div>
          <button onClick={enviar} disabled={enviando} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 20px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: enviando ? .6 : 1 }}>
            {enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Enviar
          </button>
        </div>
      </div>

      {/* Histórico */}
      <h3 style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>Meus envios</h3>
      {pedidos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13.5, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
          Nenhum envio ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pedidos.map(p => {
            const si = STATUS_ESTER[p.status]
            return (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {p.status === 'concluido' ? <CheckCircle2 size={16} color="#16a34a" /> : p.status === 'entregue' ? <CheckCircle2 size={16} color="#7c3aed" /> : <Clock3 size={16} color="#b45309" />}
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
                    {p.origem === 'salao'
                      ? `Registrado pelo salão · ${p.qtdRecebida} recebido(s)`
                      : `Enviei ${p.qtdEnviada} alicate(s)`}
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{p.dataEnvio || p.dataRecebimento}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: si.bg, color: si.cor }}>{si.label}</span>
                </div>
                {typeof p.qtdRecebida === 'number' && p.origem === 'profissional' && p.qtdRecebida !== p.qtdEnviada && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} /> O salão recebeu <b>{p.qtdRecebida}</b> (você informou {p.qtdEnviada}).
                  </div>
                )}
                {p.obsRecebimento && (
                  <div style={{ marginTop: 8, fontSize: 12.5, color: '#374151', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px' }}>
                    <b>Observação do salão:</b> {p.obsRecebimento}
                  </div>
                )}
                {p.origem === 'salao' && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px' }}>
                    ⚠️ Estes alicates foram registrados pelo salão porque não houve solicitação sua pelo sistema. A quantidade não foi informada por você.
                  </div>
                )}
                {p.status === 'entregue' && (
                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => confirmar(p.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>
                      <CheckCircle2 size={14} /> Confirmar recebimento de {p.qtdEntregue}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
