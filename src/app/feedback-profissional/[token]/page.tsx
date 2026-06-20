'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, ChevronRight } from 'lucide-react'

interface FormData {
  id: string; titulo: string; salao_nome: string
  profissionais: { id: string; nome: string }[]
  ocorridos: { id: string; descricao: string }[]
}

export default function FeedbackProfissionalPublico() {
  const params = useParams()
  const token = params?.token as string
  const [form, setForm] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')

  const [profissionalId, setProfissionalId] = useState('')
  const [profissionalNome, setProfissionalNome] = useState('')
  const [tipo, setTipo] = useState<'positivo' | 'negativo' | ''>('')
  const [ocorridoId, setOcorridoId] = useState('')
  const [ocorridoDescricao, setOcorridoDescricao] = useState('')
  const [descricao, setDescricao] = useState('')

  useEffect(() => {
    fetch(`/api/feedback-prof/public/${token}`).then(r => r.json()).then(d => {
      if (d.error) { setError(d.error); setLoading(false); return }
      setForm(d); setLoading(false)
    }).catch(() => { setError('Erro ao carregar.'); setLoading(false) })
  }, [token])

  function selectProf(id: string) {
    setProfissionalId(id)
    setProfissionalNome(form?.profissionais.find(p => p.id === id)?.nome || '')
  }

  function selectOcorrido(id: string) {
    setOcorridoId(id)
    setOcorridoDescricao(form?.ocorridos.find(o => o.id === id)?.descricao || '')
  }

  async function enviar() {
    if (!profissionalId || !tipo || !ocorridoId) {
      setErroEnvio('Preencha todos os campos obrigatórios.'); return
    }
    setErroEnvio(''); setEnviando(true)
    const res = await fetch(`/api/feedback-prof/public/${token}/responder`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profissional_id: profissionalId, profissional_nome: profissionalNome, tipo, ocorrido_id: ocorridoId, ocorrido_descricao: ocorridoDescricao, descricao }),
    })
    if (res.ok) setEnviado(true)
    else { const d = await res.json(); setErroEnvio(d.error || 'Erro ao enviar.') }
    setEnviando(false)
  }

  const COR = '#7c3aed'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f5f3ff,#ede9fe,#faf5ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${COR}30`, borderTop: `3px solid ${COR}`, animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 52, marginBottom: 16 }}></div>
        <h1 style={{ color: '#1a1a1a', fontWeight: 700, fontSize: 20 }}>Formulário indisponível</h1>
        <p style={{ color: '#6b7280', marginTop: 8 }}>{error}</p></div>
    </div>
  )

  if (enviado) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 380, padding: 24 }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', background: `linear-gradient(135deg,${COR},${COR}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: `0 20px 60px ${COR}40` }}>
          <CheckCircle size={42} color="white" />
        </div>
        <h1 style={{ color: '#1a1a1a', fontWeight: 800, fontSize: 26, marginBottom: 10 }}>Registro salvo!</h1>
        <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.7 }}>O feedback do profissional foi registrado com sucesso.</p>
        <button onClick={() => { setProfissionalId(''); setProfissionalNome(''); setTipo(''); setOcorridoId(''); setOcorridoDescricao(''); setDescricao(''); setEnviado(false) }}
          style={{ marginTop: 24, padding: '12px 28px', borderRadius: 12, border: 'none', cursor: 'pointer', background: COR, color: 'white', fontWeight: 700, fontSize: 14 }}>
          Registrar outro
        </button>
      </div>
    </div>
  )

  if (!form) return null

  const nomeIniciais = form.salao_nome ? form.salao_nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'S'

  return (
    <>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.card{animation:fadeUp .35s ease both;}select:focus,textarea:focus{outline:none;}`}</style>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#f5f3ff 0%,#ede9fe 40%,#faf5ff 70%,#f0fdf4 100%)' }}>
        <div style={{ height: 4, background: `linear-gradient(90deg,${COR},#a855f7,#06b6d4)` }} />

        {/* HEADER */}
        <div style={{ background: 'white', borderBottom: '1px solid #f3e8ff', padding: '24px 20px', textAlign: 'center', boxShadow: '0 1px 20px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg,${COR},${COR}80)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontWeight: 800, fontSize: 20, color: 'white', boxShadow: `0 8px 24px ${COR}40` }}>
            {nomeIniciais}
          </div>
          {form.salao_nome && <p style={{ fontSize: 12, fontWeight: 700, color: COR, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>{form.salao_nome}</p>}
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>{form.titulo}</h1>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Registre ocorrências de forma rápida e objetiva</p>
          <p style={{ fontSize: 11, color: '#ef4444', marginTop: 8 }}>* Campos obrigatórios</p>
        </div>

        <div style={{ maxWidth: 580, margin: '0 auto', padding: '20px 16px 40px' }}>

          {/* PROFISSIONAL */}
          <div className="card" style={{ background: 'white', borderRadius: 20, padding: 28, marginBottom: 14, boxShadow: '0 2px 20px rgba(0,0,0,0.06)', animationDelay: '0s' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 14 }}>Profissional <span style={{ color: '#ef4444' }}>*</span></p>
            <select value={profissionalId} onChange={e => selectProf(e.target.value)}
              style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: `2px solid ${profissionalId ? COR : '#f3f4f6'}`, fontSize: 14, color: profissionalId ? '#faf9f7' : '#6b7280', background: '#f9fafb', fontFamily: 'inherit', cursor: 'pointer' }}>
              <option value="">Escolher profissional...</option>
              {form.profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>

          {/* POSITIVO / NEGATIVO */}
          <div className="card" style={{ background: 'white', borderRadius: 20, padding: 28, marginBottom: 14, boxShadow: '0 2px 20px rgba(0,0,0,0.06)', animationDelay: '.07s' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 14 }}>Positivo ou Negativo? <span style={{ color: '#ef4444' }}>*</span></p>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['positivo', 'negativo'] as const).map(t => {
                const sel = tipo === t
                const cor = t === 'positivo' ? '#16a34a' : '#dc2626'
                return (
                  <button key={t} onClick={() => setTipo(t)} style={{
                    flex: 1, padding: '16px', borderRadius: 14, border: `2px solid ${sel ? cor : '#f3f4f6'}`,
                    background: sel ? `${cor}10` : '#f9fafb', cursor: 'pointer', fontWeight: 700, fontSize: 15,
                    color: sel ? cor : '#6b7280', transition: 'all .15s', boxShadow: sel ? `0 4px 20px ${cor}20` : 'none',
                  }}>
                    {t === 'positivo' ? ' POSITIVO' : ' NEGATIVO'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* O QUE HOUVE */}
          <div className="card" style={{ background: 'white', borderRadius: 20, padding: 28, marginBottom: 14, boxShadow: '0 2px 20px rgba(0,0,0,0.06)', animationDelay: '.14s' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 14 }}>O que houve? <span style={{ color: '#ef4444' }}>*</span></p>
            <select value={ocorridoId} onChange={e => selectOcorrido(e.target.value)}
              style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: `2px solid ${ocorridoId ? COR : '#f3f4f6'}`, fontSize: 14, color: ocorridoId ? '#faf9f7' : '#6b7280', background: '#f9fafb', fontFamily: 'inherit', cursor: 'pointer' }}>
              <option value="">Escolher ocorrido...</option>
              {form.ocorridos.map(o => <option key={o.id} value={o.id}>{o.descricao}</option>)}
            </select>
          </div>

          {/* DESCRIÇÃO */}
          <div className="card" style={{ background: 'white', borderRadius: 20, padding: 28, marginBottom: 14, boxShadow: '0 2px 20px rgba(0,0,0,0.06)', border: `2px solid ${COR}15`, animationDelay: '.21s' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 14 }}>Descreva o ocorrido <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 400 }}>(opcional)</span></p>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva com mais detalhes o que aconteceu..."
              rows={4}
              style={{ width: '100%', border: `2px solid ${COR}20`, borderRadius: 14, padding: '14px 16px', fontSize: 14, color: '#1a1a1a', background: `${COR}05`, resize: 'none', fontFamily: 'inherit', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = COR}
              onBlur={e => e.target.style.borderColor = `${COR}20`} />
          </div>

          {erroEnvio && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '14px 18px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
              ️ {erroEnvio}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={enviar} disabled={enviando}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 36px', borderRadius: 16, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${COR},${COR}cc)`, color: 'white', fontWeight: 700, fontSize: 15, boxShadow: `0 8px 30px ${COR}40`, opacity: enviando ? .7 : 1 }}>
              {enviando ? 'Salvando...' : <><span>Salvar registro</span><ChevronRight size={18}/></>}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <p style={{ fontSize: 11, color: '#6b6860' }}>Formulário criado com <strong style={{ color: '#6b7280' }}>NODRI</strong> · Gestão de Salões</p>
          </div>
        </div>
      </div>
    </>
  )
}
