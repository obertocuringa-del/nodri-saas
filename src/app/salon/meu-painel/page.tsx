'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PainelResumoProf from '@/components/salon/PainelResumoProf'

// Atalho: leva o profissional para o próprio perfil completo (onde está a aba Início).
export default function MeuPainel() {
  const router = useRouter()
  const [pid, setPid] = useState('')
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.profissionalId) router.replace(`/salon/profissionais/${d.profissionalId}`)
    }).catch(() => { })
  }, [router])
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}>
      <PainelResumoProf onIrAba={(a) => { if (pid) router.push(`/salon/profissionais/${pid}`) }} />
    </div>
  )
}
