'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, CheckCircle2, AlertCircle, Send } from 'lucide-react'

interface Profissional { id: string; nome_completo: string; apelido: string; cargo: string }

export default function PendenciaPublicaPage() {
  const { salaoId } = useParams() as { salaoId: string }
  const [salaoNome, setSalaoNome] = useState('')
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const [profId, setProfId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [dataLimite, setDataLimite] = useState('')

  useEffect(() => {
    fetch(`/api/pendencias/publico/${salaoId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErro('Salão não encontrado.'); setLoading(false); return }
        setSalaoNome(d.salao_nome)
        setProfissionais(d.profissionais)
        setLoading(false)
      })
      .catch(() => { setErro('Erro ao carregar.'); setLoading(false) })
  }, [salaoId])

  async function enviar() {
    if (!profId) { setErro('Selecione seu nome.'); return }
    if (!mensagem.trim()) { setErro('Descreva a pendência.'); return }
    setErro('')
    setEnviando(true)
    const res = await fetch(`/api/pendencias/publico/${salaoId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profissional_id: profId, mensagem, data_limite: dataLimite || null })
    })
    setEnviando(false)
    if (res.ok) {
      setEnviado(true)
    } else {
      const e = await res.json().catch(() => ({}))
      setErro(e.error || 'Erro ao enviar.')
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0e17', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={28} style={{ color: '#06b6d4', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  if (enviado) return (
    <div style={{ minHeight: '100vh', background: '#0a0e17', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <CheckCircle2 size={56} style={{ color: '#10b981', margin: '0 auto 16px', display: 'block' }} />
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Pendência enviada!</h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>Sua solicitação foi registrada com sucesso e será analisada pela equipe.</p>
        <button onClick={() => { setEnviado(false); setMensagem(''); setDataLimite(''); setProfId('') }}
          style={{ background: 'linear-gradient(135deg, #7c5cfc, #06b6d4)', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
          Enviar outra
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e17', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '24px' }}>
            📋
          </div>
          <h1 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 700, margin: '0 0 4px' }}>Registrar Pendência</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>{salaoNome}</p>
        </div>

        {/* Form */}
        <div style={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Profissional */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontWeight: 600 }}>
              Seu nome *
            </label>
            <select value={profId} onChange={e => setProfId(e.target.value)}
              style={{ width: '100%', background: '#161b27', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: profId ? '#e2e8f0' : '#475569', outline: 'none' }}>
              <option value="">Selecione seu nome...</option>
              {profissionais.map(p => (
                <option key={p.id} value={p.id}>
                  {p.apelido || p.nome_completo}{p.cargo ? ` — ${p.cargo}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Mensagem */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontWeight: 600 }}>
              Pendência / Solicitação *
            </label>
            <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} rows={4}
              placeholder="Descreva sua pendência ou solicitação..."
              style={{ width: '100%', background: '#161b27', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#e2e8f0', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {/* Data limite */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontWeight: 600 }}>
              Data limite (opcional)
            </label>
            <input type="date" value={dataLimite} onChange={e => setDataLimite(e.target.value)}
              style={{ width: '100%', background: '#161b27', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Erro */}
          {erro && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#ef444415', border: '1px solid #ef444430', borderRadius: '8px' }}>
              <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#ef4444' }}>{erro}</span>
            </div>
          )}

          {/* Botão */}
          <button onClick={enviar} disabled={enviando}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #7c5cfc, #06b6d4)', color: 'white', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 700, cursor: enviando ? 'not-allowed' : 'pointer', opacity: enviando ? 0.7 : 1 }}>
            {enviando ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
            {enviando ? 'Enviando...' : 'Enviar Pendência'}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#334155', fontSize: '11px', marginTop: '16px' }}>
          Powered by Nodri
        </p>
      </div>
    </div>
  )
}
