'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, Loader2, Send, User, MapPin, Phone, Briefcase, Clock, Cake } from 'lucide-react'

const COR = '#5b4fcf'

interface Dados {
  salao_nome: string
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

export default function CurriculoPublicoPage() {
  const params = useParams()
  const token = params?.token as string

  const [dados, setDados] = useState<Dados | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // dados pessoais preservados entre candidaturas
  const [nome, setNome] = useState('')
  const [estado, setEstado] = useState('')
  const [idade, setIdade] = useState('')
  const [telefone, setTelefone] = useState('')
  // por candidatura
  const [vaga, setVaga] = useState('')
  const [experiencia, setExperiencia] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const [enviados, setEnviados] = useState<string[]>([]) // vagas já enviadas
  const [modoOutra, setModoOutra] = useState(false)       // formulário só de vaga+exp
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
      setModoOutra(false)  // vai para a tela "deseja se candidatar a outra vaga?"
      setEnviando(false)
    } catch { setErroEnvio('Erro de conexão. Tente novamente.'); setEnviando(false) }
  }

  function candidatarOutra() {
    setVaga(''); setExperiencia(''); setErroEnvio('')
    setModoOutra(true)
  }

  const Label = ({ icon: Ic, children }: { icon: any; children: React.ReactNode }) => (
    <label className="flex items-center gap-1.5 text-[13px] font-bold mb-1.5" style={{ color: '#4a4760' }}><Ic size={14} style={{ color: COR }} />{children}</label>
  )
  const inputCls = 'w-full px-4 py-3 rounded-xl text-[15px] focus:outline-none'
  const inputSty = { background: '#fff', border: '1.5px solid #e6e3f2', color: '#1a1a1a' }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#f4f3fb' }}><Loader2 className="animate-spin" style={{ color: COR }} size={32} /></div>
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f4f3fb' }}>
      <div className="text-center"><p className="text-lg font-bold text-[#1a1a1a]">{error}</p><p className="text-sm text-[#767069] mt-1">Confira o link com o salão.</p></div>
    </div>
  )

  // Tela final (não quer se candidatar a mais nada)
  if (finalizado) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(180deg,#f4f3fb,#eef0f6)' }}>
      <div className="max-w-md w-full rounded-3xl p-8 text-center" style={{ background: '#fff', boxShadow: '0 20px 60px rgba(91,79,207,.18)' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#10b98120' }}><CheckCircle size={34} style={{ color: '#059669' }} /></div>
        <h1 className="text-xl font-bold text-[#1a1a1a] mb-2">Candidatura enviada! 🎉</h1>
        <p className="text-sm text-[#767069]">Recebemos {enviados.length === 1 ? 'sua candidatura' : `suas ${enviados.length} candidaturas`} para <strong>{enviados.join(', ')}</strong>. Se o seu perfil combinar com uma vaga, o <strong>{dados?.salao_nome}</strong> vai entrar em contato pelo WhatsApp. Boa sorte! 💜</p>
      </div>
    </div>
  )

  // Tela "deseja se candidatar a outra vaga?" (após um envio, antes de escolher)
  const telaPergunta = enviados.length > 0 && !modoOutra
  if (telaPergunta) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(180deg,#f4f3fb,#eef0f6)' }}>
      <div className="max-w-md w-full rounded-3xl p-8 text-center" style={{ background: '#fff', boxShadow: '0 20px 60px rgba(91,79,207,.18)' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#10b98120' }}><CheckCircle size={34} style={{ color: '#059669' }} /></div>
        <h1 className="text-lg font-bold text-[#1a1a1a] mb-1">Candidatura para <span style={{ color: COR }}>{enviados[enviados.length - 1]}</span> enviada!</h1>
        <p className="text-sm text-[#767069] mb-6">Deseja se candidatar a outra vaga?</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={candidatarOutra} className="py-3 rounded-xl text-sm font-bold text-white" style={{ background: COR }}>Sim, outra vaga</button>
          <button onClick={() => setFinalizado(true)} className="py-3 rounded-xl text-sm font-bold" style={{ background: '#fff', color: '#767069', border: '1.5px solid #e6e3f2' }}>Não, finalizar</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'linear-gradient(180deg,#f4f3fb,#eef0f6)' }}>
      <div className="max-w-md mx-auto">
        {/* Cabeçalho */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-bold mb-3" style={{ background: '#fff', color: COR, boxShadow: '0 4px 14px rgba(91,79,207,.14)' }}>💼 Trabalhe conosco</div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">{dados?.salao_nome}</h1>
          <p className="text-sm text-[#767069] mt-1">{modoOutra ? 'Escolha a nova vaga e o tempo de experiência.' : 'Preencha seus dados para se candidatar.'}</p>
        </div>

        <div className="rounded-3xl p-6 space-y-4" style={{ background: '#fff', boxShadow: '0 20px 60px rgba(91,79,207,.14)' }}>
          {/* Dados pessoais (ocultos no modo "outra vaga", já preservados) */}
          {!modoOutra && (
            <>
              <div>
                <Label icon={User}>Nome completo</Label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" className={inputCls} style={inputSty} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label icon={MapPin}>Onde mora</Label>
                  <select value={estado} onChange={e => setEstado(e.target.value)} className={inputCls} style={inputSty}>
                    <option value="">Estado…</option>
                    {dados?.estados.map(e => <option key={e.uf} value={e.uf}>{e.nome}</option>)}
                  </select>
                </div>
                <div>
                  <Label icon={Cake}>Idade</Label>
                  <input value={idade} onChange={e => setIdade(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" placeholder="Ex: 28" className={inputCls} style={inputSty} />
                </div>
              </div>
              <div>
                <Label icon={Phone}>Telefone com DDD</Label>
                <input value={telefone} onChange={e => setTelefone(maskTel(e.target.value))} inputMode="tel" placeholder="(61) 99999-9999" className={inputCls} style={inputSty} />
              </div>
            </>
          )}
          {modoOutra && (
            <div className="rounded-xl p-3 text-[12px]" style={{ background: '#f7f6fb', color: '#4a4760' }}>
              Candidatando como <strong>{nome}</strong> · {estado} · {idade} anos. Escolha a nova vaga abaixo.
            </div>
          )}

          {/* Vaga + experiência (sempre) */}
          <div>
            <Label icon={Briefcase}>Vaga para se candidatar</Label>
            <select value={vaga} onChange={e => setVaga(e.target.value)} className={inputCls} style={inputSty}>
              <option value="">Selecione a vaga…</option>
              {dados?.vagas.map(v => <option key={v} value={v} disabled={enviados.includes(v)}>{v}{enviados.includes(v) ? ' (já enviada)' : ''}</option>)}
            </select>
          </div>
          <div>
            <Label icon={Clock}>Tempo de experiência na área</Label>
            <select value={experiencia} onChange={e => setExperiencia(e.target.value)} className={inputCls} style={inputSty}>
              <option value="">Selecione…</option>
              {dados?.experiencias.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>

          {erroEnvio && <p className="text-[13px] text-center" style={{ color: '#dc2626' }}>{erroEnvio}</p>}

          <button onClick={enviar} disabled={enviando}
            className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white flex items-center justify-center gap-2 transition-all"
            style={{ background: COR, opacity: enviando ? .7 : 1 }}>
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Enviar candidatura
          </button>
        </div>
        <p className="text-center text-[11px] text-[#a8a6b4] mt-4">Seus dados são usados apenas para o processo seletivo do salão.</p>
      </div>
    </div>
  )
}
