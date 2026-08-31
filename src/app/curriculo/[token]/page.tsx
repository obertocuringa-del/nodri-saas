'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, Loader2, Send, User, MapPin, Phone, Briefcase, Clock, Cake, Sparkles } from 'lucide-react'

const COR = '#5b4fcf'
const COR2 = '#8b5cf6'

interface Dados {
  vagas: string[]
  experiencias: string[]
  estados: { uf: string; nome: string }[]
}

const maskTel = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const inputCls = 'w-full px-4 py-3.5 rounded-2xl text-[15px] focus:outline-none transition'
const inputSty: React.CSSProperties = { background: '#f7f6fc', border: '2px solid transparent', color: '#1a1a1a' }
const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = COR; e.currentTarget.style.background = '#fff' }
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = '#f7f6fc' }

// Componentes fora do render (senão o input perde o foco a cada tecla)
function Campo({ icon: Ic, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-2 text-[13px] font-bold mb-2" style={{ color: '#3a3550' }}>
        <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#f0eefb' }}><Ic size={14} style={{ color: COR }} /></span>
        {label}
      </label>
      {children}
    </div>
  )
}
function Fundo({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen py-8 px-4 flex items-center justify-center" style={{ background: 'radial-gradient(1200px 500px at 50% -10%, #ece9fb 0%, #f4f3fb 45%, #eef0f6 100%)' }}>
      {children}
    </div>
  )
}

export default function CurriculoPublicoPage() {
  const params = useParams()
  const token = params?.token as string

  const [dados, setDados] = useState<Dados | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [nome, setNome] = useState('')
  const [estado, setEstado] = useState('')
  const [idade, setIdade] = useState('')
  const [telefone, setTelefone] = useState('')
  const [vaga, setVaga] = useState('')
  const [experiencia, setExperiencia] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const [enviados, setEnviados] = useState<string[]>([])
  const [modoOutra, setModoOutra] = useState(false)
  const [finalizado, setFinalizado] = useState(false)

  useEffect(() => {
    const btn = document.getElementById('whatsapp-float-btn')
    if (btn) btn.style.display = 'none'
    return () => { if (btn) btn.style.display = '' }
  }, [])

  useEffect(() => {
    if (!token) return
    fetch(`/api/curriculos/public/${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setDados(d); setLoading(false) })
      .catch(() => { setError('Não foi possível carregar. Tente novamente.'); setLoading(false) })
  }, [token])

  async function enviar() {
    setErroEnvio('')
    if (!nome.trim() || nome.trim().length < 2) return setErroEnvio('Informe seu nome completo.')
    if (!estado) return setErroEnvio('Selecione o estado onde mora.')
    if (!idade || +idade < 14) return setErroEnvio('Informe sua idade.')
    if (telefone.replace(/\D/g, '').length < 10) return setErroEnvio('Informe um telefone com DDD válido.')
    if (!vaga) return setErroEnvio('Selecione a vaga.')
    if (!experiencia) return setErroEnvio('Selecione o tempo de experiência.')
    setEnviando(true)
    try {
      const res = await fetch(`/api/curriculos/public/${token}/enviar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), estado, idade: +idade, telefone, vaga, experiencia }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setErroEnvio(d.error || 'Erro ao enviar. Tente novamente.'); setEnviando(false); return }
      setEnviados(e => [...e, vaga])
      setModoOutra(false)
      setEnviando(false)
    } catch { setErroEnvio('Erro de conexão. Tente novamente.'); setEnviando(false) }
  }

  function candidatarOutra() { setVaga(''); setExperiencia(''); setErroEnvio(''); setModoOutra(true) }

  if (loading) return <Fundo><Loader2 className="animate-spin" style={{ color: COR }} size={34} /></Fundo>
  if (error) return <Fundo><div className="text-center"><p className="text-lg font-bold text-[#1a1a1a]">{error}</p><p className="text-sm text-[#767069] mt-1">Confira o link novamente.</p></div></Fundo>

  if (finalizado) return (
    <Fundo>
      <div className="max-w-md w-full rounded-[28px] p-9 text-center" style={{ background: '#fff', boxShadow: '0 24px 70px rgba(91,79,207,.2)' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg,#10b98120,#5b4fcf20)' }}><CheckCircle size={40} style={{ color: '#059669' }} /></div>
        <h1 className="text-2xl font-extrabold text-[#1a1a1a] mb-2">Tudo certo!</h1>
        <p className="text-[15px] text-[#767069] leading-relaxed">Recebemos {enviados.length === 1 ? 'sua candidatura' : `suas ${enviados.length} candidaturas`} para <strong style={{ color: COR }}>{enviados.join(', ')}</strong>.<br />Se o seu perfil combinar com a vaga, entraremos em contato pelo WhatsApp. Boa sorte!</p>
      </div>
    </Fundo>
  )

  if (enviados.length > 0 && !modoOutra) return (
    <Fundo>
      <div className="max-w-md w-full rounded-[28px] p-9 text-center" style={{ background: '#fff', boxShadow: '0 24px 70px rgba(91,79,207,.2)' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'linear-gradient(135deg,#10b98120,#5b4fcf20)' }}><CheckCircle size={40} style={{ color: '#059669' }} /></div>
        <h1 className="text-xl font-extrabold text-[#1a1a1a] mb-1">Candidatura enviada!</h1>
        <p className="text-[14px] text-[#767069] mb-1">Você se candidatou para <span style={{ color: COR, fontWeight: 700 }}>{enviados[enviados.length - 1]}</span>.</p>
        <p className="text-[15px] font-bold text-[#3a3550] mb-6 mt-4">Deseja se candidatar a outra vaga?</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={candidatarOutra} className="py-3.5 rounded-2xl text-[15px] font-bold text-white" style={{ background: `linear-gradient(135deg,${COR},${COR2})` }}>Sim, outra vaga</button>
          <button onClick={() => setFinalizado(true)} className="py-3.5 rounded-2xl text-[15px] font-bold" style={{ background: '#f4f3fc', color: '#767069' }}>Não, finalizar</button>
        </div>
      </div>
    </Fundo>
  )

  return (
    <Fundo>
      <div className="max-w-md w-full">
        <div className="rounded-[28px] overflow-hidden" style={{ background: '#fff', boxShadow: '0 24px 70px rgba(91,79,207,.18)' }}>
          {/* Hero */}
          <div className="px-8 pt-9 pb-8 text-center relative" style={{ background: `linear-gradient(135deg,${COR},${COR2})` }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(4px)' }}>
              <Briefcase size={30} color="#fff" />
            </div>
            <h1 className="text-[26px] font-extrabold text-white leading-tight">Trabalhe Conosco</h1>
            <p className="text-[14px] mt-1.5" style={{ color: 'rgba(255,255,255,.9)' }}>
              {modoOutra ? 'Escolha a nova vaga e sua experiência.' : 'Faça parte da nossa equipe'}
            </p>
          </div>

          <div className="px-7 py-7 space-y-5">
            {!modoOutra ? (
              <>
                <Campo icon={User} label="Nome completo">
                  <input value={nome} onChange={e => setNome(e.target.value)} onFocus={onFocus} onBlur={onBlur} placeholder="Seu nome completo" className={inputCls} style={inputSty} />
                </Campo>
                <div className="grid grid-cols-2 gap-3">
                  <Campo icon={MapPin} label="Onde mora">
                    <select value={estado} onChange={e => setEstado(e.target.value)} onFocus={onFocus} onBlur={onBlur} className={inputCls} style={inputSty}>
                      <option value="">Estado…</option>
                      {dados?.estados.map(e => <option key={e.uf} value={e.uf}>{e.nome}</option>)}
                    </select>
                  </Campo>
                  <Campo icon={Cake} label="Idade">
                    <input value={idade} onChange={e => setIdade(e.target.value.replace(/\D/g, '').slice(0, 3))} onFocus={onFocus} onBlur={onBlur} inputMode="numeric" placeholder="Ex: 28" className={inputCls} style={inputSty} />
                  </Campo>
                </div>
                <Campo icon={Phone} label="Telefone com DDD">
                  <input value={telefone} onChange={e => setTelefone(maskTel(e.target.value))} onFocus={onFocus} onBlur={onBlur} inputMode="tel" placeholder="(61) 99999-9999" className={inputCls} style={inputSty} />
                </Campo>
              </>
            ) : (
              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: '#f0eefb' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#fff' }}><User size={16} style={{ color: COR }} /></div>
                <p className="text-[13px]" style={{ color: '#4a4760' }}><strong>{nome}</strong> · {estado} · {idade} anos</p>
              </div>
            )}

            <Campo icon={Briefcase} label="Vaga para se candidatar">
              <select value={vaga} onChange={e => setVaga(e.target.value)} onFocus={onFocus} onBlur={onBlur} className={inputCls} style={inputSty}>
                <option value="">Selecione a vaga…</option>
                {dados?.vagas.map(v => <option key={v} value={v} disabled={enviados.includes(v)}>{v}{enviados.includes(v) ? ' (já enviada)' : ''}</option>)}
              </select>
            </Campo>
            <Campo icon={Clock} label="Tempo de experiência na área">
              <select value={experiencia} onChange={e => setExperiencia(e.target.value)} onFocus={onFocus} onBlur={onBlur} className={inputCls} style={inputSty}>
                <option value="">Selecione…</option>
                {dados?.experiencias.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </Campo>

            {erroEnvio && <div className="rounded-xl px-4 py-2.5 text-[13px] text-center font-medium" style={{ background: '#fef2f2', color: '#dc2626' }}>{erroEnvio}</div>}

            <button onClick={enviar} disabled={enviando}
              className="w-full py-4 rounded-2xl text-[16px] font-bold text-white flex items-center justify-center gap-2 transition"
              style={{ background: `linear-gradient(135deg,${COR},${COR2})`, opacity: enviando ? .7 : 1, boxShadow: '0 10px 24px rgba(91,79,207,.32)' }}>
              {enviando ? <Loader2 size={19} className="animate-spin" /> : <Send size={18} />} Enviar candidatura
            </button>
          </div>
        </div>
        <p className="text-center text-[11px] text-[#a8a6b4] mt-4 flex items-center justify-center gap-1"><Sparkles size={11} /> Seus dados são usados apenas para o processo seletivo.</p>
      </div>
    </Fundo>
  )
}
