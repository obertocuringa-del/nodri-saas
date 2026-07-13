'use client'

import { useState, useEffect } from 'react'

// Hook de permissões para componentes client.
// perms === null  → dono (vê tudo)
// perms === undefined → carregando
// perms === string[] → sub-usuário (só o que está na lista)
export function usePermissoes() {
  const [perms, setPerms] = useState<string[] | null | undefined>(undefined)

  useEffect(() => {
    let vivo = true
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      if (!vivo) return
      if (d && d.role === 'sub') setPerms(Array.isArray(d.permissoes) ? d.permissoes : [])
      else setPerms(null)
    }).catch(() => { if (vivo) setPerms(null) })
    return () => { vivo = false }
  }, [])

  const pode = (chave: string) => (perms === null || perms === undefined) ? true : perms.includes(chave)
  // Modo Caixa: sub-usuário que só executa/adiciona (não edita nem exclui)
  const modoCaixa = Array.isArray(perms) && perms.includes('modo_caixa')
  return { pode, ehSub: Array.isArray(perms), modoCaixa, carregado: perms !== undefined }
}
