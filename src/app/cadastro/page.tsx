'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, X, CreditCard, ClipboardList } from 'lucide-react'

const PLANOS_INFO: Record<string, { preco: number; cor: string }> = {
  'Básico':       { preco: 100, cor: '#3498db' },
  'Profissional': { preco: 200, cor: '#9b59b6' },
  'Premium':      { preco: 300, cor: '#f39c12' },
}

const inp: React.CSSProperties = {
  width: '100%', background: '#1a1a1a', border: '1px solid #333',
  borderRadius: 10, padding: '12px 14px', color: 'white', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = { fontSize: 12, color: '#888', marginBottom: 6, display: 'block' }

function CadastroInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const planoNome = searchParams.get('plano') || 'Básico'
  const planoInfo = PLANOS_INFO[planoNome] || PLANOS_INFO['Básico']

  const [form, setForm] = useState({
    nome_salao: '', responsavel: '', cidade: '',
    email: '', telefone: '', dia_vencimento: '5', cupom: '',
  })
  const [cupomStatus, setCupomStatus] = useState<null | { valido: boolean; percentual: number; mensagem: string }>(null)
  const [validandoCupom, setValidandoCupom] = useState(false)
  const [metodo, setMetodo] = useState<null | 'cartao' | 'pix'>(null)
  const [loading, setLoading] = useState(false)
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [etapa, setEtapa] = useState<'form' | 'pagamento' | 'pix'>('form')

  const desconto = cupomStatus?.valido ? cupomStatus.percentual : 0
  const precoFinal = Math.round(planoInfo.preco * (1 - desconto / 100))

  async function validarCupom() {
    if (!form.cupom.trim()) return
    setValidandoCupom(true)
    try {
      const res = await fetch(`/api/cupons/validar?codigo=${encodeURIComponent(form.cupom.trim())}`)
      const data = await res.json()
      setCupomStatus(data)
    } catch {
      setCupomStatus({ valido: false, percentual: 0, mensagem: 'Erro ao validar cupom' })
    }
    setValidandoCupom(false)
  }

  const formValido = () => form.nome_salao && form.responsavel && form.cidade && form.email && form.telefone && form.dia_vencimento

  async function pagar(metodoPag: 'cartao' | 'pix') {
    setLoading(true)
    setMetodo(metodoPag)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plano: planoNome,
          metodo: metodoPag,
          nome_salao: form.nome_salao,
          responsavel: form.responsavel,
          cidade: form.cidade,
          email: form.email,
          telefone: form.telefone,
          dia_vencimento: parseInt(form.dia_vencimento),
          cupom: cupomStatus?.valido ? form.cupom : null,
          desconto_percentual: desconto,
          preco_final: precoFinal,
        }),
      })
      const data = await res.json()
      if (metodoPag === 'cartao' && data.init_point) {
        window.location.href = data.init_point
      } else if (metodoPag === 'pix' && data.qr_code) {
        setPixData({ qr_code: data.qr_code, qr_code_base64: data.qr_code_base64 })
        setEtapa('pix')
      } else {
        alert(data.erro || 'Erro ao processar pagamento. Tente novamente.')
      }
    } catch {
      alert('Erro ao conectar com o servidor.')
    }
    setLoading(false)
  }

  async function copiarChave() {
    if (!pixData?.qr_code) return
    await navigator.clipboard.writeText(pixData.qr_code)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const cardBtn = (onClick: () => void, disabled: boolean, children: React.ReactNode) => (
    <button onClick={onClick} disabled={disabled} style={{
      background: '#1a1a1a', border: '1px solid #333', borderRadius: 14,
      padding: '18px 20px', cursor: disabled ? 'not-allowed' : 'pointer',
      textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: 16,
      width: '100%', transition: 'border-color 0.2s', opacity: disabled ? 0.6 : 1,
    }}>{children}</button>
  )

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#0f0f0f', minHeight: '100vh', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 540 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 28, fontWeight: 900, marginBottom: 6 }}>NODRI</div>
          <div style={{ color: '#888', fontSize: 13 }}>
            {etapa === 'form' && 'Preencha seus dados para continuar'}
            {etapa === 'pagamento' && 'Como deseja pagar?'}
            {etapa === 'pix' && 'Pague via PIX para ativar seu plano'}
          </div>
        </div>

        {/* Resumo do plano */}
        <div style={{ background: '#1a1a1a', border: `1px solid ${planoInfo.cor}50`, borderRadius: 14, padding: '14px 20px', marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Plano selecionado</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: planoInfo.cor }}>{planoNome}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {desconto > 0 && <div style={{ fontSize: 11, color: '#666', textDecoration: 'line-through' }}>R${planoInfo.preco}/mês</div>}
            <div style={{ fontSize: 22, fontWeight: 900 }}>R${precoFinal}<span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>/mês</span></div>
            {desconto > 0 && <div style={{ fontSize: 11, color: '#2ecc71', fontWeight: 700 }}>-{desconto}% de desconto</div>}
          </div>
        </div>

        {/*  ETAPA 1: FORMULÁRIO  */}
        {etapa === 'form' && (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 28 }}>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label style={lbl}>Nome do Salão *</label>
                <input style={inp} placeholder="Ex: Salão Bella" value={form.nome_salao} onChange={e => setForm(p => ({ ...p, nome_salao: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Responsável *</label>
                <input style={inp} placeholder="Seu nome" value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Cidade *</label>
              <input style={inp} placeholder="Ex: São Paulo - SP" value={form.cidade} onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label style={lbl}>Email *</label>
                <input type="email" style={inp} placeholder="seu@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Telefone com DDD *</label>
                <input style={inp} placeholder="(11) 99999-9999" value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Dia de vencimento da fatura *</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.dia_vencimento} onChange={e => setForm(p => ({ ...p, dia_vencimento: e.target.value }))}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={String(d)}>Todo dia {d}</option>
                ))}
              </select>
            </div>

            {/* Cupom */}
            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Código de desconto (opcional)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inp, flex: 1 }} placeholder="Ex: NODRI20"
                  value={form.cupom}
                  onChange={e => { setForm(p => ({ ...p, cupom: e.target.value.toUpperCase() })); setCupomStatus(null) }}
                  onKeyDown={e => e.key === 'Enter' && validarCupom()} />
                <button onClick={validarCupom} disabled={validandoCupom || !form.cupom.trim()}
                  style={{ background: '#222', border: '1px solid #444', borderRadius: 10, padding: '0 16px', color: '#aaa', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', opacity: validandoCupom ? 0.6 : 1 }}>
                  {validandoCupom ? '...' : 'Aplicar'}
                </button>
              </div>
              {cupomStatus && (
                <div style={{ marginTop: 6, fontSize: 12, color: cupomStatus.valido ? '#2ecc71' : '#e74c3c' }}>
                  {cupomStatus.valido ? <><CheckCircle size={12} className="inline mr-1" />{cupomStatus.mensagem}</> : <><X size={12} className="inline mr-1" />{cupomStatus.mensagem}</>}
                </div>
              )}
            </div>

            <button onClick={() => { if (!formValido()) { alert('Preencha todos os campos obrigatórios'); return }; setEtapa('pagamento') }}
              style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)', color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              Continuar para Pagamento →
            </button>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button onClick={() => router.push('/landing#planos')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12 }}>
                ← Voltar e escolher outro plano
              </button>
            </div>
          </div>
        )}

        {/*  ETAPA 2: ESCOLHA DE PAGAMENTO  */}
        {etapa === 'pagamento' && (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 28 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700 }}>Como deseja pagar?</h3>
            <div style={{ display: 'grid', gap: 12 }}>

              {/* Cartão */}
              {cardBtn(() => pagar('cartao'), loading && metodo === 'cartao', (
                <>
                  <CreditCard size={30} color="#aaa" />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 14, marginBottom: 3 }}>Cartão de Crédito / Débito</div>
                    <div style={{ color: '#888', fontSize: 12 }}>Visa, Mastercard, Elo — via Mercado Pago</div>
                  </div>
                  {loading && metodo === 'cartao' && <span style={{ color: '#888', fontSize: 12 }}>Aguarde...</span>}
                </>
              ))}

              {/* PIX */}
              {cardBtn(() => pagar('pix'), loading && metodo === 'pix', (
                <>
                  <div style={{ width: 38, height: 38, background: '#00b894', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'white', fontWeight: 700, fontSize: 14 }}>PIX</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 14, marginBottom: 3 }}>PIX</div>
                    <div style={{ color: '#888', fontSize: 12 }}>Aprovação imediata — escaneie o QR Code ou copie a chave</div>
                  </div>
                  {loading && metodo === 'pix' && <span style={{ color: '#888', fontSize: 12 }}>Gerando...</span>}
                </>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={() => setEtapa('form')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12 }}>
                ← Voltar e editar dados
              </button>
            </div>
          </div>
        )}

        {/*  ETAPA 3: PIX QR CODE  */}
        {etapa === 'pix' && pixData && (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 20 }}>
              Pague <strong style={{ color: 'white' }}>R${precoFinal}</strong> para ativar o Plano <strong style={{ color: planoInfo.cor }}>{planoNome}</strong>
            </div>

            {/* QR Code */}
            <div style={{ display: 'inline-block', background: 'white', padding: 14, borderRadius: 16, marginBottom: 20 }}>
              <img
                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                alt="QR Code PIX"
                style={{ width: 200, height: 200, display: 'block' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Ou copie a chave PIX Copia e Cola:</div>
              <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: '#aaa', wordBreak: 'break-all', marginBottom: 10, textAlign: 'left' as const, maxHeight: 64, overflow: 'hidden' }}>
                {pixData.qr_code.slice(0, 120)}...
              </div>
              <button onClick={copiarChave}
                style={{ background: copiado ? '#27ae60' : '#222', border: `1px solid ${copiado ? '#27ae60' : '#444'}`, borderRadius: 10, padding: '10px 28px', color: copiado ? 'white' : '#ddd', cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.2s' }}>
                {copiado ? <><CheckCircle size={14} style={{display:'inline',marginRight:4}} />Chave copiada!</> : <><ClipboardList size={14} style={{display:'inline',marginRight:4}} />Copiar Chave PIX</>}
              </button>
            </div>

            <div style={{ background: '#0a2a1a', border: '1px solid #1a4a2a', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#2ecc71' }}>
              <CheckCircle size={13} style={{display:'inline',marginRight:4}} />Após o pagamento você receberá um email de confirmação em <strong>{form.email}</strong>
            </div>

            <div style={{ marginTop: 16, fontSize: 11, color: '#555' }}>
              O acesso é liberado automaticamente após confirmação do pagamento
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0f0f0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Carregando...</div>}>
      <CadastroInner />
    </Suspense>
  )
}
