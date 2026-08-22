'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Send, Hand, Footprints, CheckCircle2, Clock3, CreditCard } from 'lucide-react'
import { ultimosMeses, parcelasMax, valorParcelas, type KitsSolicitacao, type KitsConfig } from '@/lib/kitsShared'

const COR = '#5b4fcf'

function mesAtualKits() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function fmtBRL(n: number) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function KitsProfissionalView() {
  const [cfg, setCfg] = useState<KitsConfig>({ precoMao: 0, precoPe: 0 })
  const [atendMao, setAtendMao] = useState(0)
  const [atendPe, setAtendPe] = useState(0)
  const [solicitacoes, setSolicitacoes] = useState<KitsSolicitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [kitsMao, setKitsMao] = useState('')
  const [kitsPe, setKitsPe] = useState('')
  const [parcelas, setParcelas] = useState(1) // parcelas escolhidas pela profissional

  const mes = mesAtualKits()

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const meses3 = ultimosMeses(mes, 3) // últimos 3 meses (incluindo o atual)
      const [c, atendPorMes, s] = await Promise.all([
        fetch('/api/kits/config').then(r => r.ok ? r.json() : null),
        Promise.all(meses3.map(m => {
          const [ano, mesNum] = m.split('-').map(Number)
          return fetch(`/api/relatorios/kits-atendimentos?ano=${ano}&mes=${mesNum}`).then(r => r.ok ? r.json() : null)
        })),
        fetch(`/api/kits/solicitacoes?mes=${mes}`).then(r => r.ok ? r.json() : null),
      ])
      if (c) setCfg(c)
      let somaMao = 0, somaPe = 0
      for (const a of atendPorMes) {
        const minha = Array.isArray(a?.profissionais) ? a.profissionais[0] : null
        somaMao += minha?.atendimentosMao || 0
        somaPe += minha?.atendimentosPe || 0
      }
      setAtendMao(Math.round(somaMao / 3))
      setAtendPe(Math.round(somaPe / 3))
      setSolicitacoes(Array.isArray(s?.solicitacoes) ? s.solicitacoes : [])
    } catch { /* mantém o que já tinha */ }
    setLoading(false)
  }, [mes])
  useEffect(() => { carregar() }, [carregar])

  const qtdMao = Math.max(0, Math.round(Number(kitsMao) || 0))
  const qtdPe = Math.max(0, Math.round(Number(kitsPe) || 0))
  const totalPreview = qtdMao * (cfg.precoMao || 0) + qtdPe * (cfg.precoPe || 0)

  // Parcelamento: máximo proporcional ao total de kits vs. média mensal (mão+pé).
  const mediaMensal = atendMao + atendPe
  const maxParc = useMemo(() => parcelasMax(qtdMao + qtdPe, mediaMensal), [qtdMao, qtdPe, mediaMensal])
  // Se o máximo cair abaixo do que estava escolhido (ex.: reduziu a quantidade), corrige.
  useEffect(() => { setParcelas(p => Math.min(Math.max(1, p), maxParc)) }, [maxParc])
  const valoresParc = useMemo(() => valorParcelas(totalPreview, parcelas), [totalPreview, parcelas])

  async function solicitar() {
    if (qtdMao === 0 && qtdPe === 0) { toast('Informe ao menos 1 kit', { icon: '' }); return }
    setEnviando(true)
    try {
      const res = await fetch('/api/kits/solicitacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kitsMao: qtdMao, kitsPe: qtdPe, parcelas }) })
      if (res.ok) { toast.success('Pedido enviado!'); setKitsMao(''); setKitsPe(''); setParcelas(1); carregar() }
      else { const d = await res.json().catch(() => null); toast.error(d?.error || 'Erro ao enviar pedido') }
    } catch { toast.error('Erro de conexão') }
    setEnviando(false)
  }

  const recemSeparado = solicitacoes.find(s => s.status === 'separado')

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div>

  return (
    <div>
      {recemSeparado && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '14px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={20} color="#16a34a" />
          <div>
            <strong style={{ fontSize: 13.5, color: '#16a34a' }}>Seus kits estão separados!</strong>
            <div style={{ fontSize: 12, color: '#374151' }}>{recemSeparado.kitsMao} kit(s) mão · {recemSeparado.kitsPe} kit(s) pé — R$ {fmtBRL(recemSeparado.valor)}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, color: COR }}><Hand size={16} /><span style={{ fontSize: 11.5, fontWeight: 700, color: '#6b6860' }}>Atendimentos de mão</span></div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>{atendMao}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>média/mês nos últimos 3 meses</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, color: COR }}><Footprints size={16} /><span style={{ fontSize: 11.5, fontWeight: 700, color: '#6b6860' }}>Atendimentos de pé</span></div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>{atendPe}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>média/mês nos últimos 3 meses</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 18, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px' }}>Solicitar kits</h3>
        <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 16px' }}>Kit mão: R$ {fmtBRL(cfg.precoMao)} · Kit pé: R$ {fmtBRL(cfg.precoPe)}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#6b6860', marginBottom: 5 }}><Hand size={13} /> Quantidade — mão</label>
            <input value={kitsMao} onChange={e => setKitsMao(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #d0cdc7', fontSize: 15 }} />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#6b6860', marginBottom: 5 }}><Footprints size={13} /> Quantidade — pé</label>
            <input value={kitsPe} onChange={e => setKitsPe(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #d0cdc7', fontSize: 15 }} />
          </div>
        </div>

        <div style={{ background: '#f6f4ff', borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
          {qtdMao > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', fontSize: 12.5, color: '#374151' }}>
              <span>{qtdMao} kit(s) mão × R$ {fmtBRL(cfg.precoMao || 0)}</span>
              <strong>R$ {fmtBRL(qtdMao * (cfg.precoMao || 0))}</strong>
            </div>
          )}
          {qtdPe > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', fontSize: 12.5, color: '#374151' }}>
              <span>{qtdPe} kit(s) pé × R$ {fmtBRL(cfg.precoPe || 0)}</span>
              <strong>R$ {fmtBRL(qtdPe * (cfg.precoPe || 0))}</strong>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: (qtdMao > 0 || qtdPe > 0) ? '1px solid #e0dbfa' : undefined }}>
            <span style={{ fontSize: 12.5, color: '#5b4fcf', fontWeight: 700 }}>Você vai pagar</span>
            <strong style={{ fontSize: 18, color: '#5b4fcf' }}>R$ {fmtBRL(totalPreview)}</strong>
          </div>
        </div>

        {/* Parcelamento — proporcional ao total de kits vs. média mensal */}
        {totalPreview > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, color: COR }}>
              <CreditCard size={15} />
              <span style={{ fontSize: 12.5, fontWeight: 800 }}>Parcelamento</span>
            </div>
            {maxParc <= 1 ? (
              <p style={{ fontSize: 12, color: '#6b6860', margin: 0 }}>
                Este pedido é <strong>à vista</strong> (1×). O parcelamento em mais vezes é liberado quando a quantidade atinge o dobro da sua média mensal ({mediaMensal} kits).
              </p>
            ) : (
              <>
                <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 10px' }}>
                  Você pode dividir em até <strong>{maxParc}×</strong> — ou escolher menos vezes:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Array.from({ length: maxParc }, (_, i) => i + 1).map(n => {
                    const sel = parcelas === n
                    const vP = valorParcelas(totalPreview, n)[0]
                    return (
                      <button key={n} type="button" onClick={() => setParcelas(n)}
                        style={{
                          flex: '1 1 120px', minWidth: 120, padding: '9px 10px', borderRadius: 9, cursor: 'pointer',
                          border: sel ? `2px solid ${COR}` : '1.5px solid #e0dbfa',
                          background: sel ? '#f6f4ff' : '#fff', textAlign: 'center',
                        }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: sel ? COR : '#374151' }}>{n === 1 ? 'À vista' : `${n}×`}</div>
                        <div style={{ fontSize: 11.5, color: '#6b6860', marginTop: 1 }}>
                          {n === 1 ? `R$ ${fmtBRL(totalPreview)}` : `de R$ ${fmtBRL(vP)}`}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <button onClick={solicitar} disabled={enviando} style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>{enviando ? '...' : <><Send size={15} /> Solicitar{parcelas > 1 ? ` — ${parcelas}×` : ''}</>}</button>
      </div>

      <h3 style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>Meus pedidos do mês</h3>
      {solicitacoes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13.5, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
          Nenhum pedido ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {solicitacoes.map(s => (
            <div key={s.id} style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {s.status === 'pendente' ? <Clock3 size={16} color="#b45309" /> : <CheckCircle2 size={16} color="#16a34a" />}
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700 }}>{s.data}</span>
              <span style={{ fontSize: 12.5, color: '#374151' }}>{s.kitsMao} kit(s) mão · {s.kitsPe} kit(s) pé</span>
              <div style={{ flex: 1 }} />
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: 13.5, color: '#16a34a' }}>R$ {fmtBRL(s.valor)}</strong>
                {(s.parcelas || 1) > 1 && <div style={{ fontSize: 11, color: '#5b4fcf', fontWeight: 700 }}>em {s.parcelas}× de R$ {fmtBRL(valorParcelas(s.valor, s.parcelas || 1)[0])}</div>}
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: s.status === 'pendente' ? '#b45309' : '#16a34a' }}>{s.status === 'pendente' ? 'Pendente' : 'Separado'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
