'use client'

import { useState, useEffect } from 'react'

// Detecta tela de celular (<= bp px). Começa em false (SSR) e ajusta ao montar.
export function useIsMobile(bp = 640): boolean {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= bp)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [bp])
  return mobile
}
