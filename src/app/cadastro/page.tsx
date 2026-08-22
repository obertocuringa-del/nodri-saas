'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, X, CreditCard, ClipboardList } from 'lucide-react'

// ── ATENÇÃO: o preço NÃO mora mais aqui ─────────────────────────────────────
//
// Existia uma tabela fixa com os três planos antigos (Básico 100,
// Profissional 200, Premium 300) e um fallback para o Básico. Quando os
// planos viraram Inicial/Essencial/Gestão/Completo, nenhum nome batia mais —
// e TODOS caíam no fallback. A tela de pagamento mostrava R$ 100 para o plano
// Gestão, e cobraria R$ 100 de quem escolhesse o Completo, de R$ 300.
//
// Agora vem de /api/planos-publicos, a mesma fonte da vitrine. Enquanto
// carrega, e se o plano não for encontrado, o pagamento fica BLOQUEADO: um
// preço errado aqui é dinheiro cobrado a menos, sem ninguém perceber.
const CORES_PLANO = ['#3498db', '#5b4fcf', '#9b59b6', '#f39c12']

interface PlanoInfo { nome: string; preco: number; cor: string }

const inp: React.CSSProperties = {
  width: '100%', background: '#ffffff', border: '1px solid #e8e6e0',
  borderRadius: 10, padding: '12px 14px', color: '#1a1a1a', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = { fontSize: 12, color: '#6b6860', marginBottom: 6, display: 'block' }

function CadastroInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const planoNome = searchParams.get('plano') || ''
  const [planoInfo, setPlanoInfo] = useState<PlanoInfo | null>(null)
  const [planoErro, setPlanoErro] = useState('')

  useEffect(() => {
    fetch('/api/planos-publicos')
      .then(r => r.ok ? r.json() : [])
      .then((lista: any[]) => {
        const norm = (t: string) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
        const i = (Array.isArray(lista) ? lista : []).findIndex((p: any) => norm(p.nome) === norm(planoNome))
        if (i < 0) { setPlanoErro('Plano não encontrado. Volte e escolha um plano na página inicial.'); return }
        setPlanoInfo({ nome: lista[i].nome, preco: lista[i].preco, cor: CORES_PLANO[i % CORES_PLANO.length] })
      })
      .catch(() => setPlanoErro('Não foi possível carregar o plano. Tente novamente em instantes.'))
  }, [planoNome])

  const [form, setForm] = useState({
    nome_salao: '', responsavel: '', cidade: '',
    email: '', telefone: '', dia_vencimento: '5', cupom: '',
  })
  const [cupomStatus, setCupomStatus] = useState<null | { valido: boolean; percentual: number; mensagem: string }>(null)
  const [validandoCupom, setValidandoCupom] = useState(false)
  const [metodo, setMetodo] = useState<null | 'cartao' | 'pix'>(null)
  const [loading, setLoading] = useState(false)
  const [etapa, setEtapa] = useState<'form' | 'pagamento' | 'pix'>('form')

  const desconto = cupomStatus?.valido ? cupomStatus.percentual : 0
  const precoFinal = planoInfo ? Math.round(planoInfo.preco * (1 - desconto / 100)) : 0

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
    // Trava dupla: o botão já fica desabilitado sem plano, mas cobrar valor
    // errado é o tipo de erro que ninguém percebe até fechar o mês.
    if (!planoInfo) { setPlanoErro('Plano não carregado. Recarregue a página antes de pagar.'); return }
    setLoading(true)
    setMetodo(metodoPag)
    try {
      const res = await fetch('/api/assinatura/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plano: planoInfo.nome,
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
      // O Asaas devolve a URL do checkout dele. O cartão é digitado lá, nunca
      // aqui: guardar dado de cartão exigiria certificação PCI.
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.erro || 'Não foi possível iniciar a assinatura. Tente novamente.')
      }
    } catch {
      alert('Erro ao conectar com o servidor.')
    }
    setLoading(false)
  }



  const cardBtn = (onClick: () => void, disabled: boolean, children: React.ReactNode) => (
    <button onClick={onClick} disabled={disabled} style={{
      background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: 14,
      padding: '18px 20px', cursor: disabled ? 'not-allowed' : 'pointer',
      textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: 16,
      width: '100%', transition: 'border-color 0.2s', opacity: disabled ? 0.6 : 1,
    }}>{children}</button>
  )

  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif', background: '#f5f4f0', minHeight: '100vh', color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 540 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ background: 'linear-gradient(135deg, #5b4fcf, #f43f8e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 28, fontWeight: 900, marginBottom: 6 }}>NODRI</div>
          <div style={{ color: '#888', fontSize: 13 }}>
            {etapa === 'form' && 'Preencha seus dados para continuar'}
            {etapa === 'pagamento' && 'Como deseja pagar?'}
            {etapa === 'pix' && 'Pague via PIX para ativar seu plano'}
          </div>
        </div>

        {/* Sem plano carregado não há preço confiável — e cobrar um valor
            errado é pior do que fazer a pessoa esperar dois segundos. */}
        {planoErro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '16px 20px', marginBottom: 22, color: '#dc2626', fontSize: 14 }}>
            {planoErro}{' '}
            <a href="/landing#planos" style={{ color: '#dc2626', fontWeight: 700 }}>Ver planos</a>
          </div>
        )}
        {!planoInfo && !planoErro && (
          <div style={{ background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: 14, padding: '18px 20px', marginBottom: 22, color: '#6b6860', fontSize: 14 }}>
            Carregando o plano…
          </div>
        )}

        {/* Resumo do plano */}
        {planoInfo && (
        <div style={{ background: '#ffffff', border: `1px solid ${planoInfo.cor}50`, borderRadius: 14, padding: '14px 20px', marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>Plano selecionado</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: planoInfo.cor }}>{planoInfo.nome}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {desconto > 0 && planoInfo && <div style={{ fontSize: 11, color: '#666', textDecoration: 'line-through' }}>R${planoInfo.preco}/mês</div>}
            <div style={{ fontSize: 22, fontWeight: 900 }}>R${precoFinal}<span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>/mês</span></div>
            {desconto > 0 && <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>-{desconto}% de desconto</div>}
          </div>
        </div>
        )}

        {/*  ETAPA 1: FORMULÁRIO  */}
        {etapa === 'form' && (
          <div style={{ background: '#ffffff', border: '1px solid #e0ddd8', borderRadius: 16, padding: 28 }}>

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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <input style={{ ...inp, flex: 1 }} placeholder="Ex: NODRI20"
                  value={form.cupom}
                  onChange={e => { setForm(p => ({ ...p, cupom: e.target.value.toUpperCase() })); setCupomStatus(null) }}
                  onKeyDown={e => e.key === 'Enter' && validarCupom()} />
                <button onClick={validarCupom} disabled={validandoCupom || !form.cupom.trim()}
                  style={{ background: '#f5f4f0', border: '1px solid #e0ddd8', borderRadius: 10, padding: '0 16px', color: '#6b6860', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap', opacity: validandoCupom ? 0.6 : 1 }}>
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
              style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #5b4fcf, #f43f8e)', color: 'white', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              Continuar para Pagamento →
            </button>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button onClick={() => router.push('/landing#planos')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12 }}>
                ← Voltar e escolher outro plano
              </button>
            </div>
          </div>
        )}

        {/*  ETAPA 2: ASSINATURA  */}
        {/* Um caminho só. A escolha entre cartão e PIX existia porque cada
            compra era avulsa; assinatura recorrente é no cartão, senão o
            cliente teria de pagar na mão todo mês — que é justamente o que
            se está resolvendo. */}
        {etapa === 'pagamento' && (
          <div style={{ background: '#ffffff', border: '1px solid #e0ddd8', borderRadius: 16, padding: 28 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700 }}>Assinatura mensal</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b6860', lineHeight: 1.6 }}>
              A cobrança é feita automaticamente todo mês no cartão. Você pode cancelar quando quiser,
              e o acesso segue até o fim do período já pago.
            </p>

            {cardBtn(() => pagar('cartao'), !planoInfo || loading, (
              <>
                <CreditCard size={30} color="#aaa" />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#1a1a1a', fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
                    Assinar por R${precoFinal}/mês
                  </div>
                  <div style={{ color: '#888', fontSize: 12 }}>Cartão de crédito — ambiente seguro do Asaas</div>
                </div>
                {loading && <span style={{ color: '#888', fontSize: 12 }}>Aguarde...</span>}
              </>
            ))}

            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <button onClick={() => setEtapa('form')} style={{ background: 'none', border: 'none', color: '#6b6860', fontSize: 13, cursor: 'pointer' }}>
                ← Voltar e editar dados
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div style={{ background: '#f5f4f0', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Carregando...</div>}>
      <CadastroInner />
    </Suspense>
  )
}
