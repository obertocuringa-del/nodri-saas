'use client'

import { useState } from 'react'
import { Star, X } from 'lucide-react'

// Cinco estrelas clicáveis: a avaliação do candidato depois de ler o currículo
// ou entrevistar. A nota é do candidato e vale para todos os salões. Clicar na
// estrela grava; o X pequeno limpa. `onChange` recebe 0 a 5.

const OURO = '#d4a017'

export default function EstrelasCandidato({ valor, onChange, tamanho = 15, somenteLeitura = false }: {
  valor: number
  onChange?: (n: number) => void
  tamanho?: number
  somenteLeitura?: boolean
}) {
  const [passando, setPassando] = useState(0)
  const mostra = passando || valor
  const podeEditar = !somenteLeitura && !!onChange
  return (
    <span className="inline-flex items-center gap-0.5" role={podeEditar ? 'radiogroup' : 'img'}
      aria-label={valor ? `Avaliação: ${valor} de 5 estrelas` : 'Sem avaliação'}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" disabled={!podeEditar}
          onClick={e => { e.stopPropagation(); onChange?.(n) }}
          onMouseEnter={() => podeEditar && setPassando(n)} onMouseLeave={() => setPassando(0)}
          aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`} title={podeEditar ? `${n} ${n === 1 ? 'estrela' : 'estrelas'}` : undefined}
          className="p-0 leading-none disabled:cursor-default" style={{ cursor: podeEditar ? 'pointer' : 'default' }}>
          <Star size={tamanho} strokeWidth={1.8} style={{ color: n <= mostra ? OURO : '#c9c3d6', fill: n <= mostra ? OURO : 'transparent' }} />
        </button>
      ))}
      {podeEditar && valor > 0 && (
        <button type="button" onClick={e => { e.stopPropagation(); onChange?.(0) }} aria-label="Limpar a avaliação" title="Limpar a avaliação"
          className="ml-1 p-0.5 rounded" style={{ color: '#9a8c85' }}><X size={Math.max(11, tamanho - 3)} /></button>
      )}
    </span>
  )
}
