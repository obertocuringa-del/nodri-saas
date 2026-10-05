'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Ticket } from 'lucide-react'

// ── Primeira coisa que a cliente vê ao abrir o link ─────────────────────────
//
// A aba do cupom não se anuncia sozinha: quem chega pelo WhatsApp vem ver
// promoção e não tem por que clicar numa aba que não sabe o que faz. Este
// cartão conta, em três linhas, que indicar dá desconto -- e sai do caminho.
//
// Aparece UMA vez por aparelho. Repetir a cada visita vira propaganda da
// própria casa para quem já entendeu, e a pessoa passa a fechar sem ler.
//
// Nada aqui bloqueia a navegação de verdade: fechar devolve a página inteira,
// e quem ignorar não perde nada.

const LIDO = 'nodri_cupom_boasvindas'

interface Props {
  percentual: number
  nomeSalao: string
  /** Leva para a aba do cupom quando a cliente aceita o convite. */
  onAbrirCupom: () => void
}

interface Papel {
  x: number; y: number; vx: number; vy: number
  giro: number; vgiro: number; cor: string; l: number; a: number
}

// Confete desenhado em canvas, não com cem divs animadas: cem elementos no
// DOM travam celular antigo, que é onde esta página mais abre.
function Confete() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    // Respeita quem pediu menos animação no sistema. Não é detalhe: para
    // parte das pessoas movimento na tela causa enjoo de verdade.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const L = cv.clientWidth, A = cv.clientHeight
    cv.width = L * dpr; cv.height = A * dpr
    ctx.scale(dpr, dpr)

    const cores = ['#5b4fcf', '#8b7ff0', '#f0c419', '#e8743b', '#f3ebe3']
    const papeis: Papel[] = Array.from({ length: 70 }, () => ({
      x: Math.random() * L,
      y: -20 - Math.random() * A * 0.6,
      vx: (Math.random() - 0.5) * 1.6,
      vy: 1.6 + Math.random() * 2.4,
      giro: Math.random() * Math.PI,
      vgiro: (Math.random() - 0.5) * 0.22,
      cor: cores[Math.floor(Math.random() * cores.length)],
      l: 5 + Math.random() * 6,
      a: 1,
    }))

    let quadro = 0
    let vivo = true
    const DURACAO = 150                   // ~2,5 s a 60 quadros

    function passo() {
      if (!vivo || !ctx) return
      ctx.clearRect(0, 0, L, A)
      quadro++
      for (const p of papeis) {
        p.x += p.vx; p.y += p.vy; p.giro += p.vgiro
        p.vy += 0.012                      // gravidade leve
        if (quadro > DURACAO * 0.6) p.a = Math.max(0, p.a - 0.015)
        ctx.save()
        ctx.globalAlpha = p.a
        ctx.translate(p.x, p.y)
        ctx.rotate(p.giro)
        ctx.fillStyle = p.cor
        ctx.fillRect(-p.l / 2, -p.l / 4, p.l, p.l / 2)
        ctx.restore()
      }
      if (quadro < DURACAO) requestAnimationFrame(passo)
      else ctx.clearRect(0, 0, L, A)
    }
    requestAnimationFrame(passo)
    return () => { vivo = false }
  }, [])

  return (
    <canvas ref={ref} aria-hidden
      className="pointer-events-none absolute inset-0 w-full h-full" />
  )
}

export default function BoasVindasCupom({ percentual, nomeSalao, onAbrirCupom }: Props) {
  const [aberto, setAberto] = useState(false)
  const [saindo, setSaindo] = useState(false)

  useEffect(() => {
    // localStorage pode estourar em aba anônima ou com dados bloqueados.
    // Nesse caso o cartão simplesmente aparece de novo -- nada quebra.
    let jaViu = false
    try { jaViu = localStorage.getItem(LIDO) === '1' } catch { /* sem storage */ }
    if (!jaViu) {
      // Um respiro antes de aparecer: surgir junto com a página parece erro
      // de carregamento, e a pessoa fecha por reflexo.
      const t = setTimeout(() => setAberto(true), 650)
      return () => clearTimeout(t)
    }
  }, [])

  function fechar(irParaCupom = false) {
    try { localStorage.setItem(LIDO, '1') } catch { /* sem storage */ }
    setSaindo(true)
    setTimeout(() => {
      setAberto(false)
      if (irParaCupom) onAbrirCupom()
    }, 220)
  }

  // Enquanto o cartão está aberto, Esc fecha e a página atrás não rola.
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', esc)
    return () => {
      document.body.style.overflow = antes
      window.removeEventListener('keydown', esc)
    }
  }, [aberto])

  if (!aberto) return null

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="bv-titulo"
      onClick={() => fechar()}
      className={'fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 '
        + 'bg-black/45 backdrop-blur-[2px] transition-opacity duration-200 '
        + (saindo ? 'opacity-0' : 'opacity-100')}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={'relative w-full sm:max-w-sm bg-white overflow-hidden '
          // No celular sobe do rodapé e encosta na borda, que é como todo
          // aplicativo de telefone se comporta; no computador vira cartão.
          + 'rounded-t-[22px] sm:rounded-[22px] '
          + 'transition-all duration-200 '
          + (saindo ? 'translate-y-3 opacity-0 sm:scale-95' : 'translate-y-0 opacity-100')}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Confete />

        <button onClick={() => fechar()} aria-label="Fechar"
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center
                     text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
          <X size={19} />
        </button>

        <div className="relative px-6 pt-9 pb-7 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--vt-cor)]/10 flex items-center justify-center mx-auto mb-4">
            <Ticket size={26} className="text-[var(--vt-cor)]" />
          </div>

          <p id="bv-titulo" className="font-bold text-[20px] leading-snug text-gray-900">
            Você sabia que indicar<br />dá desconto?
          </p>

          <div className="text-[14px] text-gray-600 leading-relaxed mt-3 space-y-2.5">
            <p>
              Na aba <b className="text-gray-900">Cupom de indicação</b> você gera o
              seu cupom e compartilha com quem quiser.
            </p>
            <p>
              A cada amiga que vier, você ganha <b className="text-gray-900">{percentual}% de
              desconto</b> para usar numa visita sua.
            </p>
          </div>

          <p className="text-[12px] text-gray-400 mt-4 leading-relaxed">
            O desconto de quem você indicar vale só na primeira visita dela.
          </p>

          <button onClick={() => fechar(true)}
            className="w-full mt-6 py-3.5 rounded-xl font-semibold text-[15px] text-white bg-[var(--vt-cor)]">
            Gerar meu cupom
          </button>
          <button onClick={() => fechar()}
            className="w-full mt-1.5 py-2.5 text-[13px] text-gray-500">
            Ver as promoções
          </button>
        </div>
      </div>
    </div>
  )
}
