'use client'

import { useState, useEffect } from 'react'
import type { ChaveModulo } from './planosModulos'

// Hook dos módulos contratados, no mesmo formato do usePermissoes.
//   undefined → ainda carregando (não decida nada nesse estado)
//   string[]  → chaves dos módulos ativos
//
// Enquanto carrega, `tem()` responde true. É de propósito: a alternativa é
// piscar "contrate o plano X" por um instante para quem JÁ contratou, e esse
// susto é pior do que mostrar a seção meio segundo antes da hora. Quem
// realmente bloqueia é o servidor — isto aqui só decide o que desenhar.
export function useModulos() {
  const [modulos, setModulos] = useState<ChaveModulo[] | undefined>(undefined)

  useEffect(() => {
    let vivo = true
    fetch('/api/salon/meus-modulos')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!vivo) return
        setModulos(Array.isArray(d?.modulos) ? d.modulos : [])
      })
      .catch(() => { if (vivo) setModulos([]) })
    return () => { vivo = false }
  }, [])

  const tem = (chave: ChaveModulo) => modulos === undefined ? true : modulos.includes(chave)
  return { modulos, tem, carregado: modulos !== undefined }
}
