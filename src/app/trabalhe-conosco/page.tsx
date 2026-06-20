'use client'
import { useState } from 'react'
import { User, Mail, Phone, CreditCard, Key, Loader2, CheckCircle, Copy, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TrabalheConoscoPage() {
  const [form, setForm] = useState({ nome: '', cpf: '', email: '', telefone: '', chave_pix: '' })
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<{ cupom: string; link: string } | null>(null)

  function formatCPF(v: string) {
    return v.replace(/\D/g, '').slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome || !form.cpf || !form.email || !form.chave_pix) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setLoading(true)
    const res = await fetch('/api/afiliados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setResultado({ cupom: data.cupom, link: data.link })
    } else {
      toast.error(data.error || 'Erro ao cadastrar. Tente novamente.')
    }
  }

  function copiar(texto: string, label: string) {
    navigator.clipboard.writeText(texto)
    toast.success(`${label} copiado!`)
  }

  return (
    <div className="min-h-screen bg-nodri-dark">
      {/* Header */}
      <nav className="bg-nodri-surface border-b border-nodri-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-black text-sm"
            style={{ background: 'linear-gradient(135deg,#5b4fcf,#5b4fcf)' }}>N</div>
          <div>
            <div className="font-syne font-bold text-sm">NODRI</div>
            <div className="text-[9px] text-nodri-cyan tracking-wider uppercase">Programa de Afiliados</div>
          </div>
        </div>
        <a href="/landing" className="text-nodri-t3 text-xs hover:text-nodri-cyan transition-colors">← Voltar</a>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {!resultado ? (
          <>
            {/* Hero */}
            <div className="text-center mb-10">
              <div className="text-5xl mb-4"></div>
              <h1 className="font-syne font-black text-3xl mb-3">Trabalhe Conosco</h1>
              <p className="text-nodri-t2 text-base leading-relaxed max-w-lg mx-auto">
                Indique o NODRI e ganhe <strong className="text-nodri-cyan">40% de comissão</strong> em cada venda realizada com o seu cupom exclusivo.
              </p>
            </div>

            {/* Cards de benefícios */}
            <div className="grid grid-cols-3 gap-3 mb-10">
              {[
                { emoji: '', titulo: '40% de Comissão', desc: 'Em cada venda que você indicar' },
                { emoji: '', titulo: 'Link Exclusivo', desc: 'Seu link personalizado para divulgar' },
                { emoji: '', titulo: 'Pagamento via Pix', desc: 'Receba diretamente na sua conta' },
              ].map(b => (
                <div key={b.titulo} className="nodri-card p-4 text-center">
                  <div className="text-2xl mb-2">{b.emoji}</div>
                  <div className="font-syne font-bold text-[12px] text-nodri-t1 mb-1">{b.titulo}</div>
                  <div className="text-[10px] text-nodri-t3">{b.desc}</div>
                </div>
              ))}
            </div>

            {/* Formulário */}
            <div className="nodri-card p-8">
              <h2 className="font-syne font-bold text-lg mb-6">Cadastre-se gratuitamente</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Nome completo *</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                    <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                      placeholder="Seu nome completo" required
                      className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">CPF *</label>
                    <div className="relative">
                      <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                      <input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: formatCPF(e.target.value) }))}
                        placeholder="000.000.000-00" required maxLength={14}
                        className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Telefone</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                      <input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                        placeholder="(00) 00000-0000"
                        className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Email *</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="seu@email.com" required
                      className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Chave Pix *</label>
                  <div className="relative">
                    <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                    <input value={form.chave_pix} onChange={e => setForm(p => ({ ...p, chave_pix: e.target.value }))}
                      placeholder="CPF, email, telefone ou chave aleatória" required
                      className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
                  </div>
                  <p className="text-[10px] text-nodri-t3 mt-1">Suas comissões serão enviadas para esta chave Pix</p>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-nodri-cyan text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all text-[14px] mt-2">
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Cadastrando...</> : 'Quero ser Afiliado!'}
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Tela de sucesso */
          <div className="nodri-card p-10 text-center">
            <CheckCircle size={56} className="text-nodri-green mx-auto mb-4" />
            <h2 className="font-syne font-black text-2xl mb-2">Cadastro realizado!</h2>
            <p className="text-nodri-t2 text-sm mb-8 leading-relaxed">
              Seu cupom e link exclusivos foram gerados. <br />Enviamos também por email com todas as instruções.
            </p>

            {/* Cupom */}
            <div className="bg-nodri-surface border-2 border-dashed border-nodri-cyan rounded-xl p-6 mb-4">
              <p className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-2">Seu cupom exclusivo</p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono font-black text-2xl text-nodri-cyan tracking-widest">{resultado.cupom}</span>
                <button onClick={() => copiar(resultado.cupom, 'Cupom')}
                  className="p-2 bg-nodri-cyan/10 border border-nodri-cyan/30 rounded-lg text-nodri-cyan hover:bg-nodri-cyan/20 transition-all">
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Link */}
            <div className="bg-nodri-surface border border-nodri-border rounded-xl p-4 mb-6">
              <p className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-2">Seu link de divulgação</p>
              <div className="flex items-center gap-2">
                <span className="flex-1 font-mono text-[11px] text-nodri-purple text-left break-all">{resultado.link}</span>
                <button onClick={() => copiar(resultado.link, 'Link')}
                  className="p-2 bg-nodri-purple/10 border border-nodri-purple/30 rounded-lg text-nodri-purple hover:bg-nodri-purple/20 transition-all shrink-0">
                  <Copy size={14} />
                </button>
                <a href={resultado.link} target="_blank" rel="noopener noreferrer"
                  className="p-2 bg-nodri-border rounded-lg text-nodri-t3 hover:text-nodri-cyan transition-all shrink-0">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="bg-nodri-cyan/5 border border-nodri-cyan/20 rounded-xl p-4 text-left">
              <p className="text-[12px] font-bold text-nodri-cyan mb-2">Como usar:</p>
              <ul className="text-[11px] text-nodri-t2 space-y-1 leading-relaxed">
                <li>• Compartilhe o link ou cupom com seus contatos</li>
                <li>• Quando comprarem usando seu cupom, você ganha <strong className="text-nodri-cyan">40%</strong></li>
                <li>• O pagamento é feito via Pix automaticamente</li>
              </ul>
            </div>

            <a href="/landing" className="mt-6 inline-block text-nodri-t3 text-xs hover:text-nodri-cyan transition-colors">
              ← Voltar ao início
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
