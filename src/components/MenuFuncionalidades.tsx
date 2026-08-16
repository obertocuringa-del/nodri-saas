'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const MARINHO = '#0d2a56'

interface Func { slug: string; categoria: string; nome: string }

// ── Menu de funcionalidades do topo ─────────────────────────────────────────
//
// Abre um painel com as categorias lado a lado e as funcionalidades de cada
// uma. Só aparece quando existe alguma cadastrada — botão que abre painel
// vazio é pior do que botão nenhum.
export default function MenuFuncionalidades() {
  const [itens, setItens] = useState<Func[]>([])
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/funcionalidades')
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setItens(d) })
      .catch(() => { /* o botão some */ })
  }, [])

  // Fecha ao clicar fora e ao apertar Esc — num painel que cobre a página,
  // não ter saída óbvia irrita mais do que ajuda.
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  if (!itens.length) return null

  // Agrupa preservando a ordem que veio do banco.
  const categorias: { nome: string; itens: Func[] }[] = []
  for (const f of itens) {
    const c = categorias.find(x => x.nome === f.categoria)
    if (c) c.itens.push(f)
    else categorias.push({ nome: f.categoria, itens: [f] })
  }

  return (
    <div ref={caixa} className="nodri-menu-func" style={{ position: 'relative' }}>
      <button onClick={() => setAberto(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          padding: '10px 20px', borderRadius: 10,
          border: `2px solid ${MARINHO}`, background: aberto ? MARINHO : 'transparent',
          color: aberto ? '#fff' : MARINHO, fontWeight: 800, fontSize: 13,
          fontFamily: 'inherit',
        }}>
        FUNCIONALIDADES
        <ChevronDown size={14} style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {aberto && (
        <div className="nodri-menu-painel" style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #e3e8f0', borderRadius: 16,
          boxShadow: '0 22px 60px rgba(13,42,86,.16)',
          padding: 22, minWidth: 'min(92vw, 700px)', maxWidth: '92vw',
          display: 'grid', gap: 22,
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          // No celular as categorias viram uma coluna so e a lista passa da
          // altura da tela: sem rolagem propria, as ultimas ficavam fora do
          // alcance e o painel parecia cortado.
          maxHeight: 'min(70vh, 560px)', overflowY: 'auto',
        }}>
          {categorias.map(cat => (
            <div key={cat.nome}>
              <div style={{
                fontSize: 12, fontWeight: 800, color: '#046b85',
                textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12,
              }}>{cat.nome}</div>
              {cat.itens.map(f => (
                <a key={f.slug} href={`/funcionalidade/${f.slug}`}
                  style={{
                    display: 'block', padding: '8px 10px', marginLeft: -10,
                    borderRadius: 8, textDecoration: 'none',
                    color: MARINHO, fontSize: 13.5, fontWeight: 600, lineHeight: 1.4,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f2f7fb' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  {f.nome}
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
