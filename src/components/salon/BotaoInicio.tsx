'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Home } from 'lucide-react'

export default function BotaoInicio() {
  const router = useRouter()
  const pathname = usePathname()
  const [hover, setHover] = useState(false)
  // Não mostra na própria página inicial
  if (pathname === '/salon') return null
  return (
    <button onClick={() => router.push('/salon')} aria-label="Ir para a página inicial" title="Início"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        // Ícone compacto e DISCRETO no canto inferior esquerdo: fica translúcido
        // (dá pra ver através) e só fica sólido ao passar o mouse — assim não
        // atrapalha a leitura dos dados em nenhuma página/aba.
        position: 'fixed', left: 14, bottom: 14, zIndex: 9999,
        width: 38, height: 38, borderRadius: '50%', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#5b4fcf', color: '#fff', cursor: 'pointer',
        opacity: hover ? 1 : 0.4,
        boxShadow: '0 3px 12px rgba(91,79,207,0.35)',
        transition: 'opacity .15s',
      }}>
      <Home size={17} />
    </button>
  )
}
