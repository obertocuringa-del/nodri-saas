'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShieldCheck, Printer, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { ITENS_PROCON } from '@/lib/proconItens'

const COR = '#5b4fcf'

interface EstadoItem { conforme?: boolean; observacao?: string }
type Estado = Record<string, EstadoItem>

export default function CheckProconPage() {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/salon/checkprocon').then(r => r.ok ? r.json() : null).then(d => setEstado(d || {})).finally(() => setLoading(false))
  }, [])

  const salvar = useCallback((novoEstado: Estado) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSalvando(true)
      try {
        const res = await fetch('/api/salon/checkprocon', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoEstado) })
        if (!res.ok) toast.error('Erro ao salvar')
      } catch { toast.error('Erro de conexão') }
      setSalvando(false)
    }, 700)
  }, [])

  function alternarConforme(id: string, valor: boolean | undefined) {
    setEstado(prev => {
      const novo = { ...prev, [id]: { ...prev[id], conforme: valor } }
      salvar(novo)
      return novo
    })
  }

  function mudarObservacao(id: string, texto: string) {
    setEstado(prev => {
      const novo = { ...prev, [id]: { ...prev[id], observacao: texto } }
      salvar(novo)
      return novo
    })
  }

  const totalConforme = Object.values(estado).filter(e => e.conforme === true).length
  const totalNaoConforme = Object.values(estado).filter(e => e.conforme === false).length

  if (loading) return <div style={{ minHeight: '100vh', background: '#f4f3fa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Carregando...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#f4f3fa' }}>
      <style>{`
        @media print {
          .cp-no-print { display: none !important; }
          body { background: white !important; }
          .cp-page { background: white !important; box-shadow: none !important; padding: 0 !important; }
          .cp-item { break-inside: avoid; border: none !important; padding: 6px 0 !important; }
          .cp-obs-input { border: none !important; border-bottom: 1px solid #ccc !important; }
        }
        .cp-item input[type="text"]:focus { border-color: ${COR} !important; }
      `}</style>

      <nav className="cp-no-print" style={{ background: 'white', borderBottom: '1px solid #ece9f7', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40, flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 18, background: '#e0ddd8' }} />
        <div style={{ width: 30, height: 30, borderRadius: 9, background: COR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={16} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a', lineHeight: 1.2 }}>Check Procon</div>
          <div style={{ fontSize: 11.5, color: '#9ca3af' }}>{salvando ? 'Salvando...' : 'Salvo automaticamente'}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: COR, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Printer size={14} /> Imprimir
        </button>
      </nav>

      <div className="cp-page" style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>

        <div style={{ background: 'white', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 2px 14px rgba(30,20,60,0.05)' }}>
          <h1 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', marginBottom: 6 }}>Checklist de conformidade PROCON/DF</h1>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 12 }}>
            Itens conferidos em fiscalizações do PROCON/DF (Lei nº 8.078/1990 — Código de Defesa do Consumidor). Marque cada item como conforme ou não conforme e anote observações para se preparar antes de uma fiscalização.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: 20 }}>{totalConforme} conforme(s)</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '4px 10px', borderRadius: 20 }}>{totalNaoConforme} não conforme(s)</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', background: '#f3f4f6', padding: '4px 10px', borderRadius: 20 }}>{ITENS_PROCON.length - totalConforme - totalNaoConforme} sem marcar</span>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: '8px 20px', boxShadow: '0 2px 14px rgba(30,20,60,0.05)' }}>
          {ITENS_PROCON.map(item => {
            const subitem = item.id.includes('.')
            const st = estado[item.id] || {}
            const statusTexto = st.conforme === true ? 'CONFORME' : st.conforme === false ? 'NÃO CONFORME' : ''
            const statusCor = st.conforme === true ? '#16a34a' : st.conforme === false ? '#dc2626' : '#9ca3af'
            return (
              <div key={item.id} className="cp-item" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #f0eef9', marginLeft: subitem ? 22 : 0 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: COR, minWidth: 34, marginTop: 2 }}>{item.id}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.5 }}>{item.texto}</p>
                  <input
                    className="cp-obs-input"
                    type="text"
                    placeholder="Observação (opcional)"
                    value={st.observacao || ''}
                    onChange={e => mudarObservacao(item.id, e.target.value)}
                    style={{ width: '100%', border: '1px solid #e5e2f0', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, outline: 'none', marginTop: 6 }}
                  />
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: statusCor, minWidth: 78, marginTop: 8, textAlign: 'right' }}>{statusTexto}</span>
                <div className="cp-no-print" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => alternarConforme(item.id, st.conforme === true ? undefined : true)}
                    title="Marcar conforme"
                    style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${st.conforme === true ? '#16a34a' : '#e5e2f0'}`, background: st.conforme === true ? '#16a34a' : 'white', color: st.conforme === true ? 'white' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => alternarConforme(item.id, st.conforme === false ? undefined : false)}
                    title="Marcar não conforme"
                    style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${st.conforme === false ? '#dc2626' : '#e5e2f0'}`, background: st.conforme === false ? '#dc2626' : 'white', color: st.conforme === false ? 'white' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
