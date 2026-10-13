'use client'

// Trocar a própria senha. Fica FORA de /salon de propósito: o profissional é
// redirecionado para o perfil dele em qualquer caminho /salon que não seja o
// dele, e o master é mandado para /admin. Aqui em cima, os quatro papéis
// chegam pela mesma porta.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MinhaSenhaPage() {
  const router = useRouter()
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [conf, setConf] = useState('')
  const [vendo, setVendo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [eu, setEu] = useState<any>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => (r.ok ? r.json() : null)).then(setEu).catch(() => {})
  }, [])

  const voltar = () => {
    if (eu?.role === 'master') router.push('/admin')
    else if (eu?.role === 'profissional') router.push('/salon/meu-painel')
    else router.push('/salon')
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (nova !== conf) { toast.error('A confirmação não bate com a senha nova.'); return }
    setSalvando(true)
    try {
      const r = await fetch('/api/auth/minha-senha', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atual, nova }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { toast.error(d?.error || 'Não foi possível trocar a senha.'); setSalvando(false); return }
      toast.success('Senha trocada. Use a nova no próximo login.')
      setAtual(''); setNova(''); setConf('')
      setTimeout(voltar, 900)
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  const campo: React.CSSProperties = {
    width: '100%', padding: '11px 40px 11px 12px', borderRadius: 9,
    border: '1.5px solid #d0cdc7', fontSize: 14, color: '#1a1a1a', outline: 'none',
  }
  const rotulo: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#6b6860',
    textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5,
  }

  const olho = (
    <button type="button" onClick={() => setVendo(v => !v)} aria-label={vendo ? 'Esconder' : 'Mostrar'}
      style={{ position: 'absolute', right: 8, top: 28, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
      {vendo ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', padding: '28px 16px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 430 }}>
        <button onClick={voltar}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6b6860', fontSize: 13, cursor: 'pointer', padding: '4px 0', marginBottom: 14 }}>
          <ArrowLeft size={15} /> Voltar
        </button>

        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
            <div style={{ background: '#f0eefb', borderRadius: 10, padding: 8, display: 'flex' }}><KeyRound size={18} color="#5b4fcf" /></div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Trocar minha senha</h1>
          </div>
          <p style={{ fontSize: 12.5, color: '#767069', margin: '0 0 18px', lineHeight: 1.5 }}>
            {eu?.nome ? <>Conectado como <strong style={{ color: '#1a1a1a' }}>{eu.nome}</strong>. </> : null}
            A senha nova vale no próximo login, aqui e no celular.
          </p>

          <form onSubmit={salvar}>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <label style={rotulo}>Senha atual</label>
              <input type={vendo ? 'text' : 'password'} value={atual} onChange={e => setAtual(e.target.value)}
                autoComplete="current-password" required style={campo} />
              {olho}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={rotulo}>Senha nova</label>
              <input type={vendo ? 'text' : 'password'} value={nova} onChange={e => setNova(e.target.value)}
                autoComplete="new-password" minLength={6} required style={{ ...campo, paddingRight: 12 }} />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Pelo menos 6 caracteres.</div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={rotulo}>Repita a senha nova</label>
              <input type={vendo ? 'text' : 'password'} value={conf} onChange={e => setConf(e.target.value)}
                autoComplete="new-password" minLength={6} required style={{ ...campo, paddingRight: 12 }} />
              {conf && nova !== conf && (
                <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>As duas não estão iguais.</div>
              )}
            </div>

            <button type="submit" disabled={salvando}
              style={{ width: '100%', background: '#5b4fcf', color: '#fff', border: 'none', borderRadius: 9, padding: '12px', fontSize: 14, fontWeight: 700, cursor: salvando ? 'default' : 'pointer', opacity: salvando ? 0.65 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              {salvando ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              {salvando ? 'Salvando…' : 'Trocar senha'}
            </button>
          </form>
        </div>

        <p style={{ fontSize: 11.5, color: '#9ca3af', textAlign: 'center', marginTop: 14, lineHeight: 1.6 }}>
          Esqueceu a senha e não consegue entrar? Use &quot;Esqueci minha senha&quot; na tela de login:
          o link vai para o e-mail do seu cadastro. Se não houver e-mail lá, quem redefine é o dono do salão.
        </p>
      </div>
    </div>
  )
}
