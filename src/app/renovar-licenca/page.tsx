'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, MessageCircle, LogOut, CheckCircle, Loader2 } from 'lucide-react'

// Esta lista era fixa, com planos de R$ 97/197/297 — valores que não existiam
// nem no sistema antigo (a landing cobrava 100/200/300) nem no novo. O salão
// vencido via preço de uma coisa e pagaria outra, e o botão chamava a rota de
// checkout do Mercado Pago, que não existe mais: dava erro e ele ficava sem
// como voltar.
//
// Agora vem da mesma fonte da vitrine.
interface PlanoVitrine {
  nome: string; slug: string; preco: number; resumo: string
  novidades: string[]; herda: string | null; destaque: boolean
}
const CORES = ['#3498db', '#5b4fcf', '#9b59b6', '#f39c12']

export default function RenovarLicencaPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [salaoNome, setSalaoNome] = useState('')
  const [PLANOS, setPlanos] = useState<PlanoVitrine[]>([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    // Tenta pegar nome do salão
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => { if (d?.salaoNome) setSalaoNome(d.salaoNome) })
    fetch('/api/planos-publicos').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setPlanos(d) }).catch(() => {})
  }, [])

  async function renovar(planoSlug: string) {
    setLoading(planoSlug); setErro('')
    try {
      const res = await fetch('/api/assinatura/renovar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planoSlug }),
      })
      const data = await res.json()
      setLoading(null)
      // O checkout é do Asaas: o cartão é digitado lá, nunca aqui.
      if (data.url) window.location.href = data.url
      else setErro(data.erro || 'Não foi possível gerar o pagamento. Fale com o suporte pelo WhatsApp.')
    } catch {
      setLoading(null)
      setErro('Erro de conexão. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-nodri-dark flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-black mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#5b4fcf,#5b4fcf)' }}>N</div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <AlertTriangle size={20} className="text-nodri-amber" />
            <h1 className="font-syne font-black text-2xl">Acesso Suspenso</h1>
          </div>
          <p className="text-nodri-t2 text-sm max-w-md mx-auto leading-relaxed">
            {salaoNome ? `Olá, ${salaoNome}! ` : ''}Sua licença venceu ou foi suspensa. Escolha um plano abaixo para reativar o acesso imediatamente.
          </p>
        </div>

        {/* Planos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {PLANOS.map((plano, i) => {
            const cor = CORES[i % CORES.length]
            return (
            <div key={plano.slug}
              className={`nodri-card p-5 flex flex-col transition ${plano.destaque ? 'border-2' : ''}`}
              style={{ borderColor: plano.destaque ? cor : undefined }}>
              {plano.destaque && (
                <div className="text-center mb-3">
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ background: cor, color: '#fff' }}>MAIS ESCOLHIDO</span>
                </div>
              )}
              <h3 className="font-syne font-black text-base mb-1" style={{ color: cor }}>{plano.nome}</h3>
              <div className="mb-3">
                <span className="font-black text-3xl">R${plano.preco}</span>
                <span className="text-nodri-t3 text-sm">/mês</span>
              </div>
              <ul className="space-y-2 mb-5 flex-1">
                {plano.herda && (
                  <li className="flex items-center gap-2 text-[12px] text-nodri-t3 font-semibold">
                    <CheckCircle size={12} style={{ color: cor, flexShrink: 0 }} /> Tudo do {plano.herda}
                  </li>
                )}
                {plano.novidades.map(m => (
                  <li key={m} className="flex items-center gap-2 text-[12px] text-nodri-t2">
                    <CheckCircle size={12} style={{ color: cor, flexShrink: 0 }} /> {m}
                  </li>
                ))}
              </ul>
              <button onClick={() => renovar(plano.slug)} disabled={!!loading}
                className="w-full py-3 font-bold rounded-xl text-white flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition text-[13px]"
                style={{ background: cor }}>
                {loading === plano.slug ? <><Loader2 size={15} className="animate-spin" /> Aguarde...</> : <><RefreshCw size={14} /> Assinar — R${plano.preco}/mês</>}
              </button>
            </div>
            )
          })}
        </div>

        {PLANOS.length === 0 && (
          <div className="nodri-card p-6 text-center text-nodri-t2 text-sm mb-6">Carregando planos…</div>
        )}

        {erro && (
          <div className="nodri-card p-4 text-center text-[13px] mb-6" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
            {erro}
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="https://wa.me/5561982195214?text=Preciso renovar minha licença NODRI"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition text-[13px]">
            <MessageCircle size={15} /> Falar com Suporte
          </a>
          <a href="/logout"
            className="flex items-center justify-center gap-2 px-6 py-3 border border-nodri-border text-nodri-t2 font-bold rounded-xl hover:text-nodri-red hover:border-nodri-red/30 transition text-[13px]">
            <LogOut size={15} /> Sair
          </a>
        </div>

        <p className="text-center text-nodri-t3 text-xs mt-6">
          Após o pagamento, seu acesso é liberado automaticamente em segundos.
        </p>
      </div>
    </div>
  )
}
