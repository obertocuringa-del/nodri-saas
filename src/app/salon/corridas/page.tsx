'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Home } from 'lucide-react'
import { voltar } from '@/lib/historicoNav'
import CorridasInternas from '@/components/salon/CorridasInternas'

export default function CorridasPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-nodri-bg">
      <header className="nodri-linha-1 flex items-center gap-3 px-4 py-3 border-b border-nodri-border bg-nodri-card sticky top-0 z-30">
        <button onClick={() => voltar(router)} className="flex items-center gap-2 text-nodri-t2 hover:text-nodri-cyan text-sm font-medium"><ArrowLeft size={16} /> Voltar</button>
        <a href="/salon" className="flex items-center gap-1 text-nodri-t2 hover:text-nodri-cyan text-sm font-medium"><Home size={15} /> Início</a>
        <span className="text-nodri-border">|</span>
        <h1 className="font-syne font-bold text-[15px] uppercase tracking-wide">Corridas Internas</h1>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <CorridasInternas />
      </main>
    </div>
  )
}
