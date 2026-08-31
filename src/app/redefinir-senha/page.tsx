'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Lock, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

function RedefinirSenhaForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (senha !== confirmar) { toast.error('As senhas não coincidem'); return }
    if (senha.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return }
    setLoading(true)
    const res = await fetch('/api/auth/redefinir-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nova_senha: senha }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) setSucesso(true)
    else toast.error(data.error || 'Erro ao redefinir senha')
  }

  if (!token) return (
    <div className="text-center py-6">
      <p className="text-nodri-red mb-4">Link inválido ou expirado.</p>
      <a href="/recuperar-senha" className="text-nodri-cyan hover:underline">Solicitar novo link</a>
    </div>
  )

  return sucesso ? (
    <div className="text-center py-6">
      <CheckCircle size={48} className="text-nodri-green mx-auto mb-4" />
      <h2 className="font-syne font-bold text-lg mb-2">Senha redefinida!</h2>
      <p className="text-nodri-t2 text-sm mb-6">Sua senha foi alterada com sucesso.</p>
      <a href="/login" className="flex items-center justify-center gap-2 bg-nodri-cyan text-black font-bold py-3 px-6 rounded-lg hover:brightness-110 transition">
        Fazer Login
      </a>
    </div>
  ) : (
    <>
      <h2 className="font-syne font-bold text-xl mb-2">Nova senha</h2>
      <p className="text-nodri-t2 text-sm mb-6">Digite e confirme sua nova senha abaixo.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Nova senha</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
            <input type={showSenha ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} required minLength={6}
              className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-9 pr-9 py-2.5 text-[13px] text-nodri-t1 outline-none focus:border-nodri-cyan transition-colors" />
            <button type="button" onClick={() => setShowSenha(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-nodri-t3 hover:text-nodri-t1">
              {showSenha ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Confirmar senha</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
            <input type={showSenha ? 'text' : 'password'} value={confirmar} onChange={e => setConfirmar(e.target.value)} required minLength={6}
              className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-9 pr-3 py-2.5 text-[13px] text-nodri-t1 outline-none focus:border-nodri-cyan transition-colors" />
          </div>
        </div>
        <button type="submit" disabled={loading || !senha || !confirmar}
          className="w-full py-3 bg-nodri-cyan text-black font-bold rounded-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
          Redefinir Senha
        </button>
      </form>
      <div className="mt-6 text-center">
        <a href="/login" className="flex items-center justify-center gap-2 text-nodri-t3 text-sm hover:text-nodri-cyan transition-colors">
          <ArrowLeft size={14} /> Voltar para o login
        </a>
      </div>
    </>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <div className="min-h-screen bg-nodri-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="nodri-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-black" style={{ background: 'linear-gradient(135deg,#5b4fcf,#5b4fcf)' }}>N</div>
            <div>
              <div className="font-syne font-bold text-lg">NODRI</div>
              <div className="text-[10px] text-nodri-cyan tracking-wider uppercase">Redefinir Senha</div>
            </div>
          </div>
          <Suspense fallback={<div className="text-nodri-t3 text-sm">Carregando...</div>}>
            <RedefinirSenhaForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
