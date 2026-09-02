'use client'

/**
 * As medalhas da profissional, no alto do portal dela.
 *
 * É a primeira coisa que ela vê ao abrir — o que já conquistou, antes de
 * qualquer cobrança. Uma medalha por corrida em que bateu a meta.
 *
 * Passar o mouse mostra de qual corrida é. No celular não existe passar o
 * mouse, então tocar abre a mesma legenda embaixo — sem isso a medalha viraria
 * um enfeite mudo justo em quem mais usa o portal pelo telefone.
 */

import { useEffect, useState } from 'react'
import { Medal } from 'lucide-react'

interface MedalhaCorrida { id: string; titulo: string }

export default function MedalhasTopo({ profId }: { profId?: string }) {
  const [minhas, setMinhas] = useState<MedalhaCorrida[]>([])
  const [aberta, setAberta] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    fetch('/api/salon/corridas', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!vivo || !d) return
        const alvo = profId || d.voceId
        if (!alvo) return
        const minha = (Array.isArray(d.medalhas) ? d.medalhas : []).find((m: any) => m.profId === alvo)
        setMinhas(Array.isArray(minha?.corridas) ? minha.corridas : [])
      })
      .catch(() => { /* sem medalha não é erro: a fileira simplesmente não aparece */ })
    return () => { vivo = false }
  }, [profId])

  // Quem ainda não ganhou nada não vê um vazio dizendo isso.
  if (!minhas.length) return null

  const titulo = aberta ? minhas.find(m => m.id === aberta)?.titulo : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        {minhas.map(m => {
          const ativa = aberta === m.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setAberta(x => x === m.id ? null : m.id)}
              title={m.titulo}
              aria-label={`Medalha da corrida ${m.titulo}`}
              style={{
                width: 26, height: 26, borderRadius: 9, flexShrink: 0, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${ativa ? '#d97706' : 'rgba(217,119,6,.35)'}`,
                background: ativa ? '#f59e0b' : 'rgba(245,158,11,.16)',
                color: ativa ? '#fff' : '#d97706',
                transition: 'transform .15s, background-color .15s, color .15s',
                transform: ativa ? 'translateY(-2px)' : undefined,
              }}
            >
              <Medal size={14} />
            </button>
          )
        })}
        <span style={{ fontSize: 11.5, fontWeight: 800, color: '#d97706', marginLeft: 2 }}>
          {minhas.length} {minhas.length === 1 ? 'medalha' : 'medalhas'}
        </span>
      </div>
      {titulo && (
        <div style={{ fontSize: 11.5, color: 'var(--txt2)', lineHeight: 1.3 }}>
          Medalha de <b>{titulo}</b>
        </div>
      )}
    </div>
  )
}
