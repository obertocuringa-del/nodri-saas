'use client'

// A pagina mantem a moldura (voltar/fundo) e o conteudo vem do painel, que e o
// mesmo usado dentro do setor Processo/Qualidade.

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import CheckProconPainel from '@/components/salon/CheckProconPainel'

export default function CheckProconPage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: '#f4f3fa' }}>
      <nav style={{ background: 'white', borderBottom: '1px solid #ece9f7', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}><ArrowLeft size={16} /> Voltar</button>
      </nav>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
        <CheckProconPainel />
      </div>
    </div>
  )
}
