'use client'

import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import {
  type CorridaInterna, type LinhaRanking,
  metricaInfo, statusCorrida, STATUS_CORRIDA, periodoLabel, MEDALHAS,
} from '@/lib/corridasInternas'
import { Ranking } from './CorridasInternas'

// Card "Corrida Interna" do portal do profissional — só leitura.
// `destacarId` = id do profissional a destacar (quando o salão abre o perfil).
export default function CorridasProf({ destacarId }: { destacarId?: string }) {
  const [corridas, setCorridas] = useState<CorridaInterna[]>([])
  const [rankings, setRankings] = useState<Record<string, LinhaRanking[]>>({})
  const [voceId, setVoceId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/salon/corridas', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setCorridas(Array.isArray(d.corridas) ? d.corridas : [])
        setRankings(d.rankings && typeof d.rankings === 'object' ? d.rankings : {})
        setVoceId(d.voceId || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const destacar = voceId || destacarId || ''

  if (loading) return <div style={{ textAlign: 'center', padding: 36, color: '#9ca3af' }}>Carregando corridas…</div>

  if (!corridas.length) {
    return (
      <div style={{ textAlign: 'center', padding: '46px 20px', color: '#6b6860', background: '#fff', border: '1.5px dashed #e5e3dd', borderRadius: 14 }}>
        <Trophy size={34} style={{ margin: '0 auto 10px', color: '#d1d5db' }} />
        <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Nenhuma corrida no momento</p>
        <p style={{ fontSize: 13, margin: 0 }}>Quando o salão criar uma competição, ela aparece aqui.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {corridas.map(c => {
        const info = metricaInfo(c.metrica)
        const st = statusCorrida(c)
        const sinfo = STATUS_CORRIDA[st]
        const ranking = rankings[c.id] || []
        const minha = destacar ? ranking.find(l => l.profId === destacar) : undefined
        return (
          <div key={c.id} style={{ background: '#fff', border: '1.5px solid #e8e6e0', borderLeft: '4px solid #16a34a', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{info.emoji}</span>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>{c.titulo}</h3>
                <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 9px', borderRadius: 20, background: sinfo.bg, color: sinfo.cor }}>{sinfo.label}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b6860' }}>{info.label} · {periodoLabel(c)}</div>
              {c.premio && <div style={{ fontSize: 12.5, color: '#b45309', fontWeight: 700, marginTop: 3 }}>{c.premio}</div>}
            </div>

            {minha && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#dcfce7,#d1fae5)', border: '1.5px solid #16a34a', borderRadius: 10, padding: '10px 14px' }}>
                <span style={{ fontSize: 22 }}>{minha.pos <= 3 ? MEDALHAS[minha.pos - 1] : ''}</span>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#15803d' }}>
                  Você está em <b>{minha.pos}º lugar</b>{ranking.length > 1 ? ` de ${ranking.length}` : ''}
                  {typeof minha.pctMeta === 'number' && (minha.bateuMeta ? ' — meta batida! ✓' : ` — ${minha.pctMeta}% da meta`)}
                </div>
              </div>
            )}

            {c.descricao && <div style={{ fontSize: 12, color: '#57534e', whiteSpace: 'pre-wrap', background: '#faf9f7', borderRadius: 8, padding: '8px 10px' }}>{c.descricao}</div>}

            <Ranking ranking={ranking} c={c} destacarId={destacar} />
          </div>
        )
      })}
    </div>
  )
}
