'use client'

import { useEffect, useState } from 'react'
import { Trophy, Medal, ChevronDown, ChevronRight } from 'lucide-react'
import {
  type CorridaInterna, type LinhaRanking, type ResumoGrupo,
  metricaInfo, statusCorrida, STATUS_CORRIDA, periodoLabel,
  ritmoQueFalta, mesCorrente,
} from '@/lib/corridasInternas'
import { Ranking } from './CorridasInternas'
import CorridaGrupo from './CorridaGrupo'
import { comoBotao } from '@/lib/acessibilidade'


const real = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * O que a profissional precisa saber sobre a PROPRIA corrida.
 *
 * A posicao sozinha nao ajuda ninguem a agir: saber que esta em 3o lugar nao
 * diz o que fazer amanha de manha. Meta, feito, quanto falta e quanto por dia
 * dizem. Por isso este bloco so existe na linha dela — o numero da colega nem
 * chega ao navegador.
 *
 * Os dias vem da escala que o salao configurou na corrida. Sem escala, a conta
 * divide pelos dias do calendario, e a tela avisa que e por dia corrido — meta
 * diaria menor do que a real, se ela nao trabalha todo dia.
 */
function MinhaMeta({ c, minha }: { c: CorridaInterna; minha: LinhaRanking }) {
  const meta = Number(minha.metaPessoal || 0)
  if (!(meta > 0)) return null

  const feito = Number(minha.valor || 0)
  const bateu = feito >= meta
  const pct = Math.min(Math.round((feito / meta) * 100), 100)
  const ritmo = mesCorrente(c) ? ritmoQueFalta(meta, feito, minha.diasTrabalho) : null

  const selo = (rotulo: string, valor: string, cor: string) => (
    <div style={{ flex: '1 1 108px', minWidth: 96, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, padding: '8px 11px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 900, color: '#9ca3af', letterSpacing: .5, textTransform: 'uppercase' }}>{rotulo}</div>
      <div style={{ fontSize: 14.5, fontWeight: 900, color: cor, fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
    </div>
  )

  return (
    <div style={{ background: '#faf9f7', border: '1.5px solid #e8e6e0', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, fontWeight: 900, color: '#1a1a1a' }}>Sua meta nesta corrida</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: bateu ? '#15803d' : '#6b6860' }}>
          {bateu ? 'meta batida' : `${pct}% da meta`}
        </span>
      </div>

      <div style={{ height: 9, background: '#e8e6e0', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: bateu ? '#16a34a' : '#5b4fcf', borderRadius: 99 }} />
      </div>

      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {selo('Meta', real(meta), '#1a1a1a')}
        {selo('Você fez', real(feito), '#15803d')}
        {selo('Falta', bateu ? '—' : real(meta - feito), bateu ? '#9ca3af' : '#b45309')}
        {ritmo && !bateu && selo('Dias que faltam', String(ritmo.dias), '#1a1a1a')}
        {ritmo && !bateu && selo('Por dia', real(ritmo.porDia), '#b91c1c')}
      </div>

      {ritmo && !bateu && (
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 7, lineHeight: 1.5 }}>
          {ritmo.estimado
            ? `Contando ${minha.diasTrabalho} dia(s) de trabalho no mês — folgas já descontadas.`
            : 'Contando dias corridos. Se você folga durante a semana, o valor por dia é maior do que este.'}
        </div>
      )}
    </div>
  )
}

// Card "Corrida Interna" do portal do profissional — só leitura.
// `destacarId` = id do profissional a destacar (quando o salão abre o perfil).
export default function CorridasProf({ destacarId }: { destacarId?: string }) {
  const [corridas, setCorridas] = useState<CorridaInterna[]>([])
  const [rankings, setRankings] = useState<Record<string, LinhaRanking[]>>({})
  const [medalhas, setMedalhas] = useState<{ profId: string; nome: string; total: number; corridas: { id: string; titulo: string }[] }[]>([])
  const [resumos, setResumos] = useState<Record<string, ResumoGrupo>>({})
  const [voceId, setVoceId] = useState('')
  const [loading, setLoading] = useState(true)
  // Uma por vez, todas fechadas ao abrir — mesma regra da tela do salão.
  const [aberta, setAberta] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/salon/corridas', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setCorridas(Array.isArray(d.corridas) ? d.corridas : [])
        setRankings(d.rankings && typeof d.rankings === 'object' ? d.rankings : {})
        setMedalhas(Array.isArray(d.medalhas) ? d.medalhas : [])
        setResumos(d.resumosGrupo && typeof d.resumosGrupo === 'object' ? d.resumosGrupo : {})
        setVoceId(d.voceId || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const destacar = voceId || destacarId || ''

  if (loading) return <div style={{ textAlign: 'center', padding: 36, color: '#9ca3af' }}>Carregando corridas…</div>

  // O quadro fica fora do "não há corrida": medalha é histórico, e some-lo
  // junto com as disputas apagaria o que a pessoa já conquistou toda vez que
  // o salão ficasse um tempo sem criar corrida nova.
  const quadro = medalhas.length > 0 ? (
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 15 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <Medal size={17} style={{ color: '#d97706' }} />
        <span style={{ fontSize: 14, fontWeight: 900, color: '#92400e' }}>Quadro de medalhas</span>
      </div>
      <p style={{ fontSize: 11.5, color: '#a16207', margin: '0 0 11px', lineHeight: 1.5 }}>
        Uma medalha para cada corrida em que a meta foi batida.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {medalhas.map((m, i) => {
          const eu = destacar && m.profId === destacar
          return (
            <div key={m.profId} style={{ display: 'flex', alignItems: 'center', gap: 9, background: eu ? '#fef3c7' : '#fff', border: eu ? '1.5px solid #f59e0b' : '1px solid #fef3c7', borderRadius: 10, padding: '8px 11px' }}>
              <span style={{ width: 24, textAlign: 'center', fontSize: 12.5, fontWeight: 900, color: '#a16207' }}>{i + 1}º</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: eu ? 900 : 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.nome}{eu ? ' (você)' : ''}
              </span>
              <span title={m.corridas.map(c => c.titulo).join(', ')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fef3c7', color: '#92400e', borderRadius: 99, padding: '3px 10px', fontSize: 12.5, fontWeight: 900, whiteSpace: 'nowrap' }}>
                <Medal size={13} /> {m.total}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  ) : null

  if (!corridas.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {quadro}
      <div style={{ textAlign: 'center', padding: '46px 20px', color: '#6b6860', background: '#fff', border: '1.5px dashed #e5e3dd', borderRadius: 14 }}>
        <Trophy size={34} style={{ margin: '0 auto 10px', color: '#d1d5db' }} />
        <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Nenhuma corrida no momento</p>
        <p style={{ fontSize: 13, margin: 0 }}>Quando o salão criar uma competição, ela aparece aqui.</p>
      </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {quadro}
      {corridas.map(c => {
        const info = metricaInfo(c.metrica)
        const st = statusCorrida(c)
        const sinfo = STATUS_CORRIDA[st]
        const ranking = rankings[c.id] || []
        const minha = destacar ? ranking.find(l => l.profId === destacar) : undefined
        return (
          <div key={c.id} style={{ background: '#fff', border: '1.5px solid #e8e6e0', borderLeft: '4px solid #16a34a', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div {...comoBotao} onClick={() => setAberta(x => x === c.id ? null : c.id)}
              aria-expanded={aberta === c.id} title={aberta === c.id ? 'Fechar' : 'Abrir'} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
                {aberta === c.id ? <ChevronDown size={16} style={{ color: '#16a34a', flexShrink: 0 }} /> : <ChevronRight size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />}
                <span style={{ fontSize: 18 }}>{info.emoji}</span>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>{c.titulo}</h3>
                <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 9px', borderRadius: 20, background: sinfo.bg, color: sinfo.cor }}>{sinfo.label}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6b6860' }}>
                {c.modo === 'grupo' ? 'Em grupo · cada uma contra a própria meta' : info.label} · {periodoLabel(c)}
              </div>
              {c.premio && <div style={{ fontSize: 12.5, color: '#b45309', fontWeight: 700, marginTop: 3 }}>{c.premio}</div>}
            </div>

            {aberta === c.id && (<>
            {/* Na corrida em grupo não há pódio — dizer "3º lugar" contradiria a
                regra da disputa, que é justamente não ter vencedor. */}
            {minha && c.modo === 'grupo' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#dcfce7,#d1fae5)', border: '1.5px solid #16a34a', borderRadius: 10, padding: '10px 14px' }}>
                <Trophy size={20} style={{ color: minha.bateuMeta ? '#d97706' : '#16a34a', flexShrink: 0 }} />
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#15803d' }}>
                  {minha.bateuMeta
                    ? 'Você bateu a sua meta!'
                    : `Você está com ${minha.pctMeta ?? 0}% da sua meta`}
                </div>
              </div>
            )}
            {minha && c.modo !== 'grupo' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#dcfce7,#d1fae5)', border: '1.5px solid #16a34a', borderRadius: 10, padding: '10px 14px' }}>
                {/* Vinha de MEDALHAS, que virou lista de textos vazios quando os
                    emojis saíram: sobrava um espaço de 22px desenhando nada. */}
                <Trophy size={20} style={{ color: minha.pos <= 3 ? '#d97706' : '#16a34a', flexShrink: 0 }} />
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#15803d' }}>
                  {/* `deQuantos` manda quando ele vem: na corrida de meta
                      individual chega uma linha so, e contar o que chegou diria
                      "de 1". */}
                  Você está em <b>{minha.pos}º lugar</b>{(() => {
                    const total = minha.deQuantos ?? ranking.length
                    return total > 1 ? ` de ${total}` : ''
                  })()}
                  {/* Corrida de "menos é melhor" não tem % da meta — só o teto
                      cumprido ou não. Sem isto, quem estava dentro do limite não
                      via nada e parecia que a corrida não tinha alvo. */}
                  {typeof minha.pctMeta === 'number'
                    ? (minha.bateuMeta ? ' — meta batida!' : ` — ${minha.pctMeta}% da meta`)
                    : (minha.bateuMeta ? ' — dentro do limite!' : '')}
                </div>
              </div>
            )}

            {minha && c.modo !== 'grupo' && <MinhaMeta c={c} minha={minha} />}

            {c.descricao && <div style={{ fontSize: 12, color: '#57534e', whiteSpace: 'pre-wrap', background: '#faf9f7', borderRadius: 8, padding: '8px 10px' }}>{c.descricao}</div>}

            {/* Corrida de meta individual, vista pela propria profissional: sem
                lista de colegas. Ela ja tem acima a posicao e o painel da meta
                dela, que e o que serve para agir. O dono continua com a lista
                inteira, aqui e na tela do salao — `voceId` so vem preenchido
                quando quem olha e a profissional. */}
            {c.modo === 'grupo'
              ? <CorridaGrupo c={c} ranking={ranking} resumo={resumos[c.id]} />
              : (voceId && c.metaIndividual && c.metrica === 'faturamento')
                ? null
                : <Ranking ranking={ranking} c={c} destacarId={destacar} soPosicoes={c.ocultarValores} />}
            </>)}
          </div>
        )
      })}
    </div>
  )
}
