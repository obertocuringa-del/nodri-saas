'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, MessageCircle, LogOut, CheckCircle, Loader2 } from 'lucide-react'

const PLANOS = [
  { nome: 'Básico', slug: 'basico', preco: 97, cor: '#3498db', modulos: ['Confirmar Agendamento', 'Enviar Feedback', 'Enviar Lista', 'Enviar Lista c/ Arquivo', 'Baixar Música YouTube'] },
  { nome: 'Profissional', slug: 'profissional', preco: 197, cor: '#9b59b6', destaque: true, modulos: ['Todos do Básico', 'Bloqueio Sem Preferência', 'Ver Feedback Cliente', 'Relatório Profissional', 'Faturamento Diário', 'Calcular Reserva Financeira'] },
  { nome: 'Premium', slug: 'premium', preco: 297, cor: '#f39c12', modulos: ['Todos do Profissional', 'Calculadora Depreciação', 'Avaliar Profissional', 'Aluguel de Cadeira', 'Precificar Serviços'] },
]

export default function RenovarLicencaPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [salaoNome, setSalaoNome] = useState('')

  useEffect(() => {
    // Tenta pegar nome do salão
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => { if (d?.salaoNome) setSalaoNome(d.salaoNome) })
  }, [])

  async function renovar(planoSlug: string) {
    setLoading(planoSlug)
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plano: planoSlug, renovacao: true }),
    })
    const data = await res.json()
    setLoading(null)
    if (data.init_point) window.location.href = data.init_point
    else alert('Erro ao gerar link de pagamento. Entre em contato via WhatsApp.')
  }

  return (
    <div className="min-h-screen bg-nodri-dark flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-black mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg,#00e5c8,#7c5cfc)' }}>N</div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <AlertTriangle size={20} className="text-nodri-amber" />
            <h1 className="font-syne font-black text-2xl">Acesso Suspenso</h1>
          </div>
          <p className="text-nodri-t2 text-sm max-w-md mx-auto leading-relaxed">
            {salaoNome ? `Olá, ${salaoNome}! ` : ''}Sua licença venceu ou foi suspensa. Escolha um plano abaixo para reativar o acesso imediatamente.
          </p>
        </div>

        {/* Planos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {PLANOS.map(plano => (
            <div key={plano.slug}
              className={`nodri-card p-6 flex flex-col transition-all ${plano.destaque ? 'border-2' : ''}`}
              style={{ borderColor: plano.destaque ? plano.cor : undefined }}>
              {plano.destaque && (
                <div className="text-center mb-3">
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ background: plano.cor, color: '#fff' }}>MAIS POPULAR</span>
                </div>
              )}
              <h3 className="font-syne font-black text-lg mb-1" style={{ color: plano.cor }}>{plano.nome}</h3>
              <div className="mb-4">
                <span className="font-black text-3xl">R${plano.preco}</span>
                <span className="text-nodri-t3 text-sm">/mês</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plano.modulos.map(m => (
                  <li key={m} className="flex items-center gap-2 text-[12px] text-nodri-t2">
                    <CheckCircle size={12} style={{ color: plano.cor, flexShrink: 0 }} /> {m}
                  </li>
                ))}
              </ul>
              <button onClick={() => renovar(plano.slug)} disabled={loading === plano.slug}
                className="w-full py-3 font-bold rounded-xl text-white flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all text-[13px]"
                style={{ background: plano.cor }}>
                {loading === plano.slug ? <><Loader2 size={15} className="animate-spin" /> Aguarde...</> : <><RefreshCw size={14} /> Reativar — R${plano.preco}/mês</>}
              </button>
            </div>
          ))}
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="https://wa.me/5561982195214?text=Preciso renovar minha licença NODRI"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all text-[13px]">
            <MessageCircle size={15} /> Falar com Suporte
          </a>
          <a href="/logout"
            className="flex items-center justify-center gap-2 px-6 py-3 border border-nodri-border text-nodri-t2 font-bold rounded-xl hover:text-nodri-red hover:border-nodri-red/30 transition-all text-[13px]">
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
