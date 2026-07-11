'use client'

import { useState } from 'react'

const COR = '#5b4fcf'

export const normaliza = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
export const mesmoNome = (a: string, b: string) => normaliza(a) === normaliza(b)

// Um nome "está" numa lista de escalados (texto livre, nomes separados por / ou vírgula)
// se aparecer como um dos pedaços — evita falso positivo tipo "ANA" casar com "MARIANA".
export function nomeNaLista(nome: string, lista: string): boolean {
  const alvo = normaliza(nome)
  if (!alvo) return false
  return lista.split(/[/,]/).map(normaliza).some(n => n === alvo)
}

// Célula com chips dos nomes escalados + botão "+" que abre uma lista suspensa
// do cadastro pra escolher, em vez de digitar o nome na mão. O valor continua
// sendo salvo como texto "Nome / Nome" pra manter compatibilidade com o que
// já existia (mesmo formato que a impressão e o formato antigo usam).
export function SeletorNomes({ value, onChange, opcoes }: { value: string; onChange: (v: string) => void; opcoes: string[] }) {
  const [aberto, setAberto] = useState(false)
  const nomes = value ? value.split('/').map(s => s.trim()).filter(Boolean) : []
  function add(nome: string) {
    onChange([...nomes, nome].join(' / '))
    setAberto(false)
  }
  function remover(nome: string) {
    onChange(nomes.filter(n => n !== nome).join(' / '))
  }
  const disponiveis = opcoes.filter(o => !nomes.some(n => mesmoNome(n, o)))
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', minHeight: 26 }}>
        {nomes.map(n => (
          <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#f0eefb', color: COR, fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 20, whiteSpace: 'nowrap' }}>
            {n}
            <button type="button" onClick={() => remover(n)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: COR, fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
          </span>
        ))}
        <button type="button" onClick={() => setAberto(v => !v)} title="Adicionar profissional" style={{ border: '1px dashed #d0cdc7', background: 'transparent', borderRadius: 20, width: 20, height: 20, cursor: 'pointer', fontSize: 13, color: '#9ca3af', lineHeight: 1, flexShrink: 0 }}>+</button>
      </div>
      {aberto && (
        <>
          <div onClick={() => setAberto(false)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />
          <div style={{ position: 'absolute', zIndex: 30, top: '100%', left: 0, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.15)', minWidth: 170, maxHeight: 220, overflowY: 'auto', marginTop: 3 }}>
            {disponiveis.length === 0 ? <div style={{ padding: 8, fontSize: 12, color: '#9ca3af' }}>Sem opções</div> : disponiveis.map(o => (
              <div key={o} onClick={() => add(o)} style={{ padding: '7px 10px', fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' }} onMouseEnter={e => (e.currentTarget.style.background = '#f8f7ff')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{o}</div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
