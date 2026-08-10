'use client'

// Cabeçalho com seletor de ano + os 12 meses em cards clicáveis.
// Usado pelo DRE, pelo Ponto de Equilíbrio e pelo Fluxo de Caixa, para as três
// telas abrirem e navegarem exatamente do mesmo jeito.

import { ReactNode } from 'react'
import { MESES } from '@/lib/calcFinanceiro'

export interface InfoMes {
  valor: string
  cor: string
  temDados: boolean
  sub?: string
  /** 0 a 1 — enche a barrinha do card. Sem isso, o card não mostra barra. */
  barra?: number
  /** Aparece como aviso discreto no canto do card (ex.: mês sem despesas) */
  alerta?: string
}

interface Props {
  titulo: string
  subtitulo?: string
  icone?: ReactNode
  ano: number
  anos: number[]
  onAno: (a: number) => void
  mesSel: number
  onMes: (m: number) => void
  info: (mes: number) => InfoMes
  acoes?: ReactNode
}

export default function GradeMeses({ titulo, subtitulo, icone, ano, anos, onAno, mesSel, onMes, info, acoes }: Props) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          {icone && (
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,#5b4fcf,#7c6fe0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              {icone}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a1a', margin: 0, letterSpacing: '-.2px' }}>{titulo}</h2>
            {subtitulo && <p style={{ fontSize: 12, color: '#8a8680', margin: '3px 0 0', lineHeight: 1.35 }}>{subtitulo}</p>}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 12 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {acoes}
          <select value={ano} onChange={e => onAno(Number(e.target.value))}
            style={{ padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e0ddd8', background: '#fff', fontSize: 13, fontWeight: 800, color: '#1a1a1a', cursor: 'pointer' }}>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(138px, 1fr))', gap: 8 }}>
        {MESES.map((nome, i) => {
          const m = i + 1
          const d = info(m)
          const at = mesSel === m
          return (
            <button key={m} onClick={() => onMes(m)} title={`${nome} de ${ano}`}
              style={{
                position: 'relative', textAlign: 'left', cursor: 'pointer', borderRadius: 12,
                padding: '10px 12px 11px', overflow: 'hidden',
                background: at ? '#fff' : d.temDados ? '#fff' : '#fbfbfa',
                border: at ? '1.5px solid #5b4fcf' : '1px solid #eae8e3',
                boxShadow: at ? '0 4px 14px rgba(91,79,207,.16)' : 'none',
                transition: 'box-shadow .15s, border-color .15s',
              }}>
              {/* faixa de cor: identifica o mês selecionado sem depender só da borda */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: at ? '#5b4fcf' : d.temDados ? d.cor : 'transparent', opacity: at ? 1 : .35 }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <span style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: '.6px', textTransform: 'uppercase', color: at ? '#5b4fcf' : d.temDados ? '#8a8680' : '#c9c5be' }}>
                  {nome}
                </span>
                {d.alerta && <span title={d.alerta} style={{ fontSize: 10, color: '#f59e0b', lineHeight: 1 }}>▲</span>}
              </div>

              <div style={{ fontSize: 14.5, fontWeight: 900, letterSpacing: '-.3px', color: d.temDados ? d.cor : '#d7d5cf', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {d.valor}
              </div>

              {d.sub && (
                <div style={{ fontSize: 10, color: '#a8a49d', fontWeight: 700, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.sub}</div>
              )}

              {typeof d.barra === 'number' && d.temDados && (
                <div style={{ height: 4, borderRadius: 99, background: '#f2f0ec', overflow: 'hidden', marginTop: 7 }}>
                  <div style={{ width: `${Math.max(3, Math.min(100, d.barra * 100))}%`, height: '100%', background: d.cor, borderRadius: 99 }} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
