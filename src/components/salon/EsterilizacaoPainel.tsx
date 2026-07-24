'use client'

import { useState } from 'react'
import { ShieldCheck, BarChart3 } from 'lucide-react'
import EsterilizacaoFluxoAdmin from './EsterilizacaoFluxoAdmin'
import EsterilizacaoLista from './EsterilizacaoLista'

// Junta, numa página só, o FLUXO de solicitação de esterilização e o painel
// "Atendimentos x Esterilização" (cruzamento) que antes era uma aba separada.
export default function EsterilizacaoPainel({ profsSalao = [] }: { profsSalao?: any[] }) {
  const [sub, setSub] = useState<'solicitacoes' | 'cruzamento'>('solicitacoes')

  const tab = (k: 'solicitacoes' | 'cruzamento', label: string, Ic: any) => (
    <button onClick={() => setSub(k)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10,
        border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800,
        background: sub === k ? '#5b4fcf' : '#f0eee8', color: sub === k ? '#fff' : '#6b6860',
      }}>
      <Ic size={15} /> {label}
    </button>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {tab('solicitacoes', 'Solicitações', ShieldCheck)}
        {tab('cruzamento', 'Atendimentos x Esterilização', BarChart3)}
      </div>
      {sub === 'solicitacoes'
        ? <EsterilizacaoFluxoAdmin profsSalao={profsSalao} />
        : <EsterilizacaoLista chave="esterilizacao" profsSalao={profsSalao} />}
    </div>
  )
}
