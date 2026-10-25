'use client'

import { useState } from 'react'

// Único pedaço da página de vagas que precisa de JavaScript: copiar o link.
// Se o navegador negar a área de transferência, o botão avisa e o endereço
// continua visível ao lado para a pessoa copiar na mão.
export default function CopiarLink({ url, className, style }: { url: string; className?: string; style?: React.CSSProperties }) {
  const [estado, setEstado] = useState<'' | 'ok' | 'erro'>('')
  const copiar = async () => {
    try { await navigator.clipboard.writeText(url); setEstado('ok') } catch { setEstado('erro') }
    setTimeout(() => setEstado(''), 2200)
  }
  return (
    <button type="button" onClick={copiar} className={className} style={style}>
      {estado === 'ok' ? 'Link copiado' : estado === 'erro' ? 'Copie o endereço ao lado' : 'Copiar link'}
    </button>
  )
}
