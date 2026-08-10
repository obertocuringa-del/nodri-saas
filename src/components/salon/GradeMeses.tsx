'use client'

// Cabeçalho com seletor de ano + os 12 meses em cards clicáveis.
// Usado pelo DRE, pelo Ponto de Equilíbrio e pelo Fluxo de Caixa, para as três
// telas abrirem e navegarem exatamente do mesmo jeito.

import { ReactNode } from 'react'
import { MESES } from '@/lib/calcFinanceiro'

export interface InfoMes { valor: string; cor: string; temDados: boolean; sub?: string }

interface Props {
  titulo: string
  subtitulo?: string
  ano: number
  anos: number[]
  onAno: (a: number) => void
  mesSel: number
  onMes: (m: number) => void
  info: (mes: number) => InfoMes
  acoes?: ReactNode
}

export default function GradeMeses({ titulo, subtitulo, ano, anos, onAno, mesSel, onMes, info, acoes }: Props) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>{titulo} — {ano}</h2>
          {subtitulo && <p style={{ fontSize: 12, color: '#6b6860', margin: '2px 0 0' }}>{subtitulo}</p>}
        </div>
        <div style={{ flex: 1 }} />
        {acoes}
        <select value={ano} onChange={e => onAno(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 9, border: '1.5px solid #e0ddd8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
        {MESES.map((nome, i) => {
          const m = i + 1
          const d = info(m)
          const at = mesSel === m
          return (
            <button key={m} onClick={() => onMes(m)}
              style={{
                textAlign: 'left', cursor: 'pointer', borderRadius: 11, padding: '9px 12px',
                background: at ? '#f0eefb' : d.temDados ? '#fff' : '#fcfcfb',
                border: at ? '1.5px solid #5b4fcf' : '1.5px solid #e8e6e0',
              }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: at ? '#5b4fcf' : d.temDados ? '#1a1a1a' : '#c4c0b8', marginBottom: 2 }}>{nome}</div>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: d.temDados ? d.cor : '#d7d5cf', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.valor}</div>
              {d.sub && <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, marginTop: 1 }}>{d.sub}</div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
