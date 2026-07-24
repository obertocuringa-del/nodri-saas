'use client'

import { ArrowLeft, Home } from 'lucide-react'
import AcoesComerciais from '@/components/salon/AcoesComerciais'

export default function AcoesComerciaisPage() {
  return (
    <div className="min-h-screen bg-nodri-bg">
      <header className="nodri-linha-1 flex items-center gap-3 px-4 py-3 border-b border-nodri-border bg-nodri-card sticky top-0 z-30">
        <a href="/salon" className="flex items-center gap-2 text-nodri-t2 hover:text-nodri-cyan text-sm font-medium"><ArrowLeft size={16} /> Voltar</a>
        <a href="/salon" className="flex items-center gap-1 text-nodri-t2 hover:text-nodri-cyan text-sm font-medium"><Home size={15} /> Início</a>
        <span className="text-nodri-border">|</span>
        <h1 className="font-syne font-bold text-[15px] uppercase tracking-wide">Ações Comerciais</h1>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <AcoesComerciais />
      </main>
    </div>
  )
}
