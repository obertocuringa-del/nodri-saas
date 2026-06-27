'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('Preencha email e senha'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao fazer login')
      toast.success(`Bem-vindo, ${data.user.nome}!`)
      if (data.user.role === 'master') router.push('/admin')
      else router.push('/salon')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-nodri-dark px-4">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #5b4fcf 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-syne font-black text-2xl text-black"
              style={{ background: 'linear-gradient(135deg, #5b4fcf, #5b4fcf)' }}>N</div>
            <div className="text-left">
              <div className="font-syne font-bold text-xl text-nodri-t1">NODRI</div>
              <div className="text-[10px] text-nodri-cyan tracking-[2px] uppercase">Estilo & Beleza</div>
            </div>
          </div>
          <p className="text-nodri-t2 text-sm">Entre na sua conta para continuar</p>
        </div>

        {/* Card */}
        <div className="nodri-card p-6 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="nodri-label block mb-1.5">E-mail ou usuário</label>
              <input type="text" placeholder="seu@email.com ou seu usuário" value={email}
                onChange={e => setEmail(e.target.value)} className="nodri-input"
                autoComplete="username" disabled={loading} />
            </div>

            <div>
              <label className="nodri-label block mb-1.5">Senha</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="nodri-input pr-10" autoComplete="current-password" disabled={loading} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-nodri-t3 hover:text-nodri-t2 transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="nodri-btn-primary w-full flex items-center justify-center gap-2">
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Entrando...</>
                : <><LogIn size={16} /> Entrar no Sistema</>}
            </button>
          </form>

          {/* Fora do form para não interferir no submit */}
          <div className="mt-4 pt-4 border-t border-nodri-border flex items-center justify-between">
            <Link href="/recuperar-senha"
              className="text-nodri-cyan text-xs hover:underline font-semibold flex items-center gap-1">
              Esqueci minha senha
            </Link>
            <a href="https://wa.me/5561982195214" target="_blank" rel="noopener noreferrer"
              className="text-nodri-t3 text-xs hover:text-nodri-cyan transition-colors">
              Suporte
            </a>
          </div>
        </div>

        <p className="text-center text-nodri-t3 text-xs mt-6">
          © 2025 NODRI — Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
