'use client'
import { useState } from 'react'
import { Mail, CreditCard, Loader2, LogOut, Copy, TrendingUp, DollarSign, Users, Award, Tag, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PainelAfiliadoPage() {
  const [etapa, setEtapa] = useState<'login' | 'painel'>('login')
  const [form, setForm] = useState({ email: '', cpf: '' })
  const [loading, setLoading] = useState(false)
  const [afiliado, setAfiliado] = useState<any>(null)
  const [ranking, setRanking] = useState<any[]>([])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/afiliados/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email.toLowerCase(), cpf: form.cpf }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setAfiliado(data.afiliado)
      setRanking(data.ranking || [])
      setEtapa('painel')
    } else toast.error(data.error || 'Email ou CPF inválido')
  }

  function copiar(texto: string, label: string) {
    navigator.clipboard.writeText(texto)
    toast.success(`${label} copiado!`)
  }

  const taxaConversao = afiliado?.total_cliques > 0
    ? ((afiliado.total_vendas / afiliado.total_cliques) * 100).toFixed(1)
    : '0.0'

  const posicaoRanking = ranking.findIndex((r: any) => r.id === afiliado?.id) + 1

  if (etapa === 'login') return (
    <div className="min-h-screen bg-nodri-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl text-black mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#00e5c8,#7c5cfc)' }}>N</div>
          <h1 className="font-syne font-black text-xl">Painel do Afiliado</h1>
          <p className="text-nodri-t3 text-xs mt-1">Entre com seu email e CPF cadastrados</p>
        </div>
        <div className="nodri-card p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required
                  placeholder="seu@email.com"
                  className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-8 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">CPF</label>
              <div className="relative">
                <CreditCard size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-nodri-t3" />
                <input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} required
                  placeholder="000.000.000-00"
                  className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-8 pr-3 py-2.5 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-nodri-cyan text-black font-bold rounded-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50">
              {loading ? <Loader2 size={15} className="animate-spin" /> : 'Entrar no Painel'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <a href="/trabalhe-conosco" className="text-nodri-t3 text-xs hover:text-nodri-cyan">Ainda não é afiliado? Cadastre-se →</a>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-nodri-dark">
      {/* Header */}
      <nav className="bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm text-black"
            style={{ background: 'linear-gradient(135deg,#00e5c8,#7c5cfc)' }}>N</div>
          <div>
            <div className="font-syne font-bold text-sm">NODRI Afiliados</div>
            <div className="text-[11px] text-nodri-cyan">Olá, {afiliado?.nome?.split(' ')[0]}!</div>
          </div>
        </div>
        <button onClick={() => setEtapa('login')} className="flex items-center gap-1.5 text-nodri-t3 text-xs hover:text-nodri-red transition-colors">
          <LogOut size={13} /> Sair
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Cards principais */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <TrendingUp size={16} className="text-nodri-cyan" />, label: 'Total de Vendas', value: afiliado?.total_vendas || 0 },
            { icon: <Users size={16} className="text-nodri-blue" />, label: 'Cliques no Link', value: afiliado?.total_cliques || 0 },
            { icon: <TrendingUp size={16} className="text-nodri-green" />, label: 'Taxa de Conversão', value: `${taxaConversao}%` },
            { icon: <Award size={16} className="text-nodri-amber" />, label: 'Ranking', value: posicaoRanking > 0 ? `#${posicaoRanking}` : '—' },
          ].map(c => (
            <div key={c.label} className="nodri-card p-4 text-center">
              <div className="flex justify-center mb-2">{c.icon}</div>
              <div className="font-syne font-black text-xl">{c.value}</div>
              <div className="text-[11px] text-nodri-t3 mt-1">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Financeiro */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="nodri-card p-5 text-center">
            <div className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1">A Receber</div>
            <div className="font-syne font-black text-2xl text-nodri-amber">R${Number(afiliado?.valor_acumulado || 0).toFixed(2)}</div>
            <div className="text-[11px] text-nodri-t3 mt-1">Comissão pendente</div>
          </div>
          <div className="nodri-card p-5 text-center">
            <div className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1">Já Recebido</div>
            <div className="font-syne font-black text-2xl text-nodri-green">R${Number(afiliado?.valor_pago || 0).toFixed(2)}</div>
            <div className="text-[11px] text-nodri-t3 mt-1">Total pago</div>
          </div>
          <div className="nodri-card p-5 text-center">
            <div className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1">Sua Comissão</div>
            <div className="font-syne font-black text-2xl text-nodri-cyan">{afiliado?.comissao_percentual || 40}%</div>
            <div className="text-[11px] text-nodri-t3 mt-1">Por venda</div>
          </div>
        </div>

        {/* Cupom e Link */}
        <div className="nodri-card p-5 space-y-4">
          <div className="font-syne font-bold text-[13px] text-nodri-cyan flex items-center gap-1.5"><Tag size={13} /> Seus Dados de Afiliado</div>
          <div>
            <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Cupom Exclusivo</label>
            <div className="flex items-center gap-2 bg-nodri-surface border-2 border-dashed border-nodri-cyan rounded-xl px-4 py-3">
              <span className="flex-1 font-mono font-black text-lg text-nodri-cyan tracking-widest">{afiliado?.cupom}</span>
              <button onClick={() => copiar(afiliado?.cupom, 'Cupom')}
                className="p-2 bg-nodri-cyan/10 border border-nodri-cyan/30 text-nodri-cyan rounded-lg hover:bg-nodri-cyan/20">
                <Copy size={14} />
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Link de Divulgação</label>
            <div className="flex items-center gap-2 bg-nodri-surface border border-nodri-border rounded-xl px-3 py-2.5">
              <span className="flex-1 font-mono text-[11px] text-nodri-purple break-all">{afiliado?.link}</span>
              <button onClick={() => copiar(afiliado?.link, 'Link')}
                className="p-2 bg-nodri-purple/10 border border-nodri-purple/30 text-nodri-purple rounded-lg hover:bg-nodri-purple/20 shrink-0">
                <Copy size={14} />
              </button>
            </div>
          </div>
          <div className="bg-nodri-surface rounded-lg p-3 text-[11px] text-nodri-t2">
            <strong className="text-nodri-t1">Chave Pix para recebimento:</strong> <span className="font-mono text-nodri-cyan">{afiliado?.chave_pix}</span>
          </div>
        </div>

        {/* Ranking */}
        {ranking.length > 0 && (
          <div className="nodri-card p-5">
            <div className="font-syne font-bold text-[13px] text-nodri-amber mb-4 flex items-center gap-1.5"><Trophy size={13} /> Ranking de Afiliados</div>
            <div className="space-y-2">
              {ranking.slice(0, 10).map((af: any, i: number) => (
                <div key={af.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${af.id === afiliado?.id ? 'bg-nodri-cyan/5 border border-nodri-cyan/20' : 'bg-nodri-surface'}`}>
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full font-black text-[13px] ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-amber-600 text-white' : 'bg-nodri-card text-nodri-t3'}`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[12px] font-medium">{af.nome}</span>
                  <span className="text-[11px] text-nodri-t3">{af.total_vendas} vendas</span>
                  <span className="text-[11px] font-bold text-nodri-green">R${Number(af.valor_acumulado + af.valor_pago).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pix */}
        {Number(afiliado?.valor_acumulado) > 0 && (
          <div className="bg-nodri-amber/10 border border-nodri-amber/30 rounded-xl p-4 text-[12px] text-nodri-amber">
            <DollarSign size={13} className="inline mr-1" /> Você tem <strong>R${Number(afiliado?.valor_acumulado).toFixed(2)}</strong> de comissão pendente. O pagamento será enviado via Pix para <strong>{afiliado?.chave_pix}</strong> em breve.
          </div>
        )}
      </div>
    </div>
  )
}
