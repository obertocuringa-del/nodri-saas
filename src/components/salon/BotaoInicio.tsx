'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Home } from 'lucide-react'

export default function BotaoInicio() {
  const router = useRouter()
  const pathname = usePathname()
  // Não mostra na própria página inicial
  if (pathname === '/salon') return null
  return (
    <button onClick={() => router.push('/salon')} aria-label="Ir para a página inicial"
      style={{
        position: 'fixed', left: 16, bottom: 16, zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '9px 16px', borderRadius: 24, border: 'none',
        background: '#5b4fcf', color: '#fff', fontSize: 13, fontWeight: 700,
        cursor: 'pointer', boxShadow: '0 4px 16px rgba(91,79,207,0.4)',
      }}>
      <Home size={16} /> Início
    </button>
  )
}
