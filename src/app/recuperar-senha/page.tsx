'use client'
import { useState } from 'react'
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    const res = await fetch('/api/auth/recuperar-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (res.ok) setEnviado(true)
    else toast.error('Erro ao enviar. Tente novamente.')
  }

  return (
    <div className="min-h-screen bg-nodri-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="nodri-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-black" style={{ background: 'linear-gradient(135deg,#5b4fcf,#5b4fcf)' }}>N</div>
            <div>
              <div className="font-syne font-bold text-lg">NODRI</div>
              <div className="text-[10px] text-nodri-cyan tracking-wider uppercase">Recuperação de Senha</div>
            </div>
          </div>

          {enviado ? (
            <div className="text-center py-6">
              <CheckCircle size={48} className="text-nodri-green mx-auto mb-4" />
              <h2 className="font-syne font-bold text-lg mb-2">Email enviado!</h2>
              <p className="text-nodri-t2 text-sm leading-relaxed mb-6">
                Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha em até 2 minutos.
              </p>
              <p className="text-nodri-t3 text-xs mb-6">Verifique também a caixa de spam.</p>
              <a href="/login" className="flex items-center justify-center gap-2 text-nodri-cyan text-sm hover:underline">
                <ArrowLeft size={14} /> Voltar para o login
              </a>
            </div>
          ) : (
            <>
              <h2 className="font-syne font-bold text-xl mb-2">Esqueceu sua senha?</h2>
              <p className="text-nodri-t2 text-sm mb-6 leading-relaxed">
                Digite seu email e enviaremos um link para você criar uma nova senha.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Email cadastrado</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-9 pr-3 py-2.5 text-[13px] text-nodri-t1 outline-none focus:border-nodri-cyan transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 bg-nodri-cyan text-black font-bold rounded-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  Enviar Link de Recuperação
                </button>
              </form>
              <div className="mt-6 text-center">
                <a href="/login" className="flex items-center justify-center gap-2 text-nodri-t3 text-sm hover:text-nodri-cyan transition-colors">
                  <ArrowLeft size={14} /> Voltar para o login
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
