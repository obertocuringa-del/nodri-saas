'use client'
import { useEffect, useState } from 'react'
import { X, Loader2, AlertTriangle } from 'lucide-react'

// ─── Comportamento da profissional (últimos 2 meses) ────────────────────────
// Abre a partir do pedido de empréstimo, pra o Financeiro decidir olhando o
// histórico. Usa a MESMA fonte e a MESMA fórmula da aba Ocorrências do perfil
// (/api/profissionais/[id]/metricas) — dois números diferentes de "perda" no
// sistema seria pior do que não ter nenhum.

interface Feedback { id: string; tipo?: string; ocorrido_descricao?: string; descricao?: string; criado_em: string }
interface Metricas {
  feedbacks?: Feedback[]
  ocorrencias?: { tipo: string; total: number }[]
  fat_p2?: { faturamento?: number; dias_trabalhados?: number }
  mix_receita?: { servico: string; quantidade: number }[]
  feedbacks_p2_total?: number
}

const MESES = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const fmtR = (n: number) => `R$ ${(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dataBR = (iso: string) => { try { return new Date(iso).toLocaleDateString('pt-BR') } catch { return '' } }

// Falta ao TRABALHO. Treinamento/reunião/curso não são falta de comportamento.
const EXCLUIR_FALTA = ['treinamento', 'reunião', 'reuniao', 'curso', 'capacitação', 'capacitacao', 'palestra', 'evento']

function mesRef(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

export default function ComportamentoProfissional({ profId, nome, onFechar }: {
  profId: string
  nome: string
  onFechar: () => void
}) {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [met, setMet] = useState<Metricas | null>(null)
  const [servicos, setServicos] = useState<any[]>([])
  const [habilitados, setHabilitados] = useState<string[]>([])

  // Últimos 2 meses (o atual e o anterior); o período anterior é exigido pela
  // API, mas não é exibido aqui.
  const hoje = new Date()
  const p2f = mesRef(hoje)
  const p2i = mesRef(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1))
  const p1f = mesRef(new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1))
  const p1i = mesRef(new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1))
  const periodoTxt = `${MESES[Number(p2i.slice(5))]} e ${MESES[Number(p2f.slice(5))]}/${p2f.slice(0, 4)}`

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const qs = new URLSearchParams({ p1_inicio: p1i, p1_fim: p1f, p2_inicio: p2i, p2_fim: p2f })
        const [rM, rS, rP] = await Promise.all([
          fetch(`/api/profissionais/${profId}/metricas?${qs}`, { credentials: 'include' }),
          fetch('/api/servicos', { credentials: 'include' }),
          fetch(`/api/profissionais/${profId}`, { credentials: 'include' }),
        ])
        if (!vivo) return
        if (!rM.ok) { setErro('Não consegui carregar o histórico desta profissional.'); setCarregando(false); return }
        setMet(await rM.json())
        if (rS.ok) { const d = await rS.json(); if (Array.isArray(d)) setServicos(d) }
        if (rP.ok) { const d = await rP.json(); if (Array.isArray(d?.servicos_habilitados)) setHabilitados(d.servicos_habilitados) }
      } catch { if (vivo) setErro('Erro de conexão ao buscar o histórico.') }
      if (vivo) setCarregando(false)
    })()
    return () => { vivo = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profId])

  // A API devolve `ocorrencias` e `feedbacks` somando P1 + P2 (é assim que a
  // aba do perfil usa). Como aqui P2 já são 2 meses, usar o campo pronto
  // trazia 4 MESES de ocorrências — foi o que fez o número não bater.
  // Então filtramos pela data e recontamos só o que é dos últimos 2 meses.
  const limite = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).getTime()
  const feedbacks = (met?.feedbacks || []).filter(f => {
    const t = new Date(f.criado_em).getTime()
    return Number.isFinite(t) && t >= limite
  })
  const ocorrencias = (() => {
    const mapa: Record<string, number> = {}
    for (const f of feedbacks) { const k = f.ocorrido_descricao || 'Outro'; mapa[k] = (mapa[k] || 0) + 1 }
    return Object.entries(mapa).map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total)
  })()

  const faltas = ocorrencias
    .filter(o => { const t = (o.tipo || '').toLowerCase(); return t.includes('falta') && !EXCLUIR_FALTA.some(ex => t.includes(ex)) })
    .reduce((s, o) => s + o.total, 0)
  const atrasos = ocorrencias.find(o => (o.tipo || '').toLowerCase().includes('atraso'))?.total || 0

  const fatDia = (met?.fat_p2?.faturamento || 0) / Math.max(met?.fat_p2?.dias_trabalhados || 1, 1)

  // Comissão média ponderada pelo que ela realmente fez no período; sem
  // histórico, cai na média dos serviços habilitados dela.
  let qtdMix = 0, comissaoPonderada = 0
  for (const item of (met?.mix_receita || [])) {
    const serv = servicos.find(s => String(s.nome || '').toUpperCase() === String(item.servico || '').toUpperCase())
    if (serv?.comissao_valor) { qtdMix += item.quantidade; comissaoPonderada += serv.comissao_valor * item.quantidade }
  }
  const hab = servicos.filter(s => habilitados.includes(s.id) && (s.comissao_valor || 0) > 0)
  const comissaoMedia = qtdMix > 0
    ? comissaoPonderada / qtdMix
    : hab.length > 0 ? hab.reduce((s, x) => s + (x.comissao_valor || 0), 0) / hab.length : 0

  const perdaFaltas = fatDia * faltas
  const perdaAtrasos = comissaoMedia * atrasos
  const perdaTotal = perdaFaltas + perdaAtrasos

  const caixa = (cor: string, bg: string, bd: string, rot: string, valor: string, sub: string) => (
    <div style={{ flex: '1 1 150px', background: bg, border: `1px solid ${bd}`, borderRadius: 12, padding: '11px 13px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, color: cor, textTransform: 'uppercase', letterSpacing: .4 }}>{rot}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: cor, marginTop: 3 }}>{valor}</div>
      <div style={{ fontSize: 10.5, color: '#6b6860', marginTop: 2 }}>{sub}</div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}
      onClick={onFechar}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} style={{ color: '#b45309' }} />
          <div>
            <h3 style={{ fontSize: 15.5, fontWeight: 800, margin: 0, color: '#1a1a1a' }}>Comportamento — {nome}</h3>
            <p style={{ fontSize: 11.5, color: '#6b6860', margin: '2px 0 0' }}>Últimos 2 meses ({periodoTxt})</p>
          </div>
          <button onClick={onFechar} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#767069' }}><X size={18} /></button>
        </div>

        {carregando ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', fontSize: 13, padding: '26px 0', justifyContent: 'center' }}>
            <Loader2 size={16} className="animate-spin" /> Carregando histórico…
          </div>
        ) : erro ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '10px 12px', fontSize: 12.5 }}>{erro}</div>
        ) : (
          <>
            {/* Números do período */}
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              {caixa('#b91c1c', '#fef2f2', '#fecaca', 'Perda estimada', fmtR(perdaTotal), 'receita não gerada')}
              {caixa('#b45309', '#fffbeb', '#fde68a', 'Ocorrências', String(feedbacks.length), `${faltas} falta(s) · ${atrasos} atraso(s)`)}
              {caixa('#1d4ed8', '#eff6ff', '#bfdbfe', 'Faturamento/dia', fmtR(fatDia), 'média do período')}
            </div>

            {perdaTotal > 0 && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '9px 12px', fontSize: 11.5, color: '#9a3412', lineHeight: 1.7 }}>
                {faltas > 0 && <div>Faltas: {faltas} × {fmtR(fatDia)} por dia = <strong>{fmtR(perdaFaltas)}</strong></div>}
                {atrasos > 0 && <div>Atrasos: {atrasos} × {fmtR(comissaoMedia)} de comissão = <strong>{fmtR(perdaAtrasos)}</strong> <span style={{ color: '#b45309' }}>(cada atraso conta como 1 cliente perdido)</span></div>}
              </div>
            )}

            {/* Resumo por tipo */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Resumo das ocorrências</div>
              {ocorrencias.length === 0 ? (
                <p style={{ fontSize: 12.5, color: '#9ca3af', margin: 0 }}>Nenhuma ocorrência registrada no período.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {ocorrencias.map(o => {
                    const t = (o.tipo || '').toLowerCase()
                    const grave = t.includes('falta') || t.includes('atraso') || t.includes('reclama')
                    return (
                      <div key={o.tipo} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#faf9f7', borderRadius: 8, padding: '6px 10px' }}>
                        <span style={{ fontSize: 12.5, color: '#1a1a1a', flex: 1 }}>{o.tipo}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: grave ? '#b91c1c' : '#6b6860', background: grave ? '#fef2f2' : '#f0efec', padding: '2px 9px', borderRadius: 999 }}>{o.total}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Ocorrências escritas */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>
                Ocorrências registradas ({feedbacks.length})
              </div>
              {feedbacks.length === 0 ? (
                <p style={{ fontSize: 12.5, color: '#9ca3af', margin: 0 }}>Nada registrado nestes 2 meses.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {feedbacks.map(f => {
                    const neg = String(f.tipo || '').toLowerCase().includes('neg')
                    return (
                      <div key={f.id} style={{ background: '#fff', border: `1px solid ${neg ? '#fecaca' : '#e8e6e0'}`, borderLeft: `3px solid ${neg ? '#ef4444' : '#cbd5e1'}`, borderRadius: 10, padding: '8px 11px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: neg ? '#b91c1c' : '#374151' }}>{f.ocorrido_descricao || 'Ocorrência'}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#9ca3af' }}>{dataBR(f.criado_em)}</span>
                        </div>
                        {f.descricao && <p style={{ fontSize: 12, color: '#4b5563', margin: '4px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{f.descricao}</p>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <p style={{ fontSize: 10.5, color: '#9ca3af', margin: 0, lineHeight: 1.6 }}>
              A perda é uma <strong>estimativa</strong>: falta × faturamento médio por dia dela, e atraso × comissão média dos serviços que ela fez no período. É o mesmo cálculo da aba Ocorrências do perfil.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
