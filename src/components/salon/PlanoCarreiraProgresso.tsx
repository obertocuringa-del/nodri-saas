'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Loader2, CheckCircle2, Circle, AlertCircle, ChevronRight, ClipboardCheck, PartyPopper, History } from 'lucide-react'
import { usePermissoes } from '@/lib/usePermissoes'

interface Nivel {
  id: string; emoji: string; titulo: string; cor: string
  perfil: string; atividades: string; certificados: string
  indicadores: string; comissionamento: string; beneficios: string; meta: string
}
interface PlanoDoc { intro: string; niveis: Nivel[] }
interface RevisaoHist { data: string; nivelId: string; nivelTitulo: string; aprovado: boolean; observacao: string }
interface ProgressoDoc { nivelId: string; manuais: Record<string, boolean>; historico: RevisaoHist[] }

const linhas = (s: string) => (s || '').split('\n').map(l => l.trim()).filter(Boolean)

function extrairReais(txt: string): number | null {
  const m = txt.match(/R\$\s?([\d.]+)(?:,(\d{2}))?/)
  if (!m) return null
  return Number(m[1].replace(/\./g, '')) + (m[2] ? Number(m[2]) / 100 : 0)
}
function extrairPercentual(txt: string): number | null {
  const m = txt.match(/(\d{1,3})\s?%/)
  return m ? Number(m[1]) : null
}
function extrairAnos(txt: string): number | null {
  const m = txt.match(/(\d+)\s*ano/i)
  return m ? Number(m[1]) : null
}
function fmtReais(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }

type TipoAuto = 'faturamento' | 'ticket' | 'retorno' | 'avaliacao' | 'tempo'
function classificar(linhaSemAsterisco: string): { tipo: TipoAuto; meta: number } | null {
  const l = linhaSemAsterisco.toLowerCase()
  if (l.includes('faturamento bruto')) { const meta = extrairReais(linhaSemAsterisco); return meta != null ? { tipo: 'faturamento', meta } : null }
  if (l.includes('ticket')) { const meta = extrairReais(linhaSemAsterisco); return meta != null ? { tipo: 'ticket', meta } : null }
  if (l.includes('taxa de retorno')) { const meta = extrairPercentual(linhaSemAsterisco); return meta != null ? { tipo: 'retorno', meta } : null }
  if (l.includes('avalia') && (l.includes('80%') || l.includes('técnica') || l.includes('tecnica'))) { const meta = extrairPercentual(linhaSemAsterisco) ?? 80; return { tipo: 'avaliacao', meta } }
  if (l.includes('tempo de experiência') || l.includes('tempo de experiencia')) { const meta = extrairAnos(linhaSemAsterisco); return meta != null ? { tipo: 'tempo', meta } : null }
  return null
}
const ROTULO_TIPO: Record<TipoAuto, string> = { faturamento: 'Faturamento bruto médio mensal', ticket: 'Ticket médio', retorno: 'Taxa de retorno (estimativa)', avaliacao: 'Avaliação técnica/comportamental', tempo: 'Tempo de experiência' }

function ultimosMeses(qtd: number, offsetMeses: number) {
  const hoje = new Date()
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() - offsetMeses, 1)
  const inicio = new Date(fim.getFullYear(), fim.getMonth() - (qtd - 1), 1)
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return { inicio: fmt(inicio), fim: fmt(fim) }
}

export default function PlanoCarreiraProgresso({ profissionalId, somenteLeitura }: { profissionalId: string; somenteLeitura?: boolean }) {
  const { ehSub } = usePermissoes()
  const bloqueado = !!somenteLeitura || ehSub
  const [plano, setPlano] = useState<PlanoDoc | null>(null)
  const [progresso, setProgresso] = useState<ProgressoDoc>({ nivelId: 'n1', manuais: {}, historico: [] })
  const [reais, setReais] = useState<{ faturamentoMensal: number | null; ticket: number | null; retorno: number | null; avaliacao: number | null; tempoAnos: number | null }>({ faturamentoMensal: null, ticket: null, retorno: null, avaliacao: null, tempoAnos: null })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [revisaoAberta, setRevisaoAberta] = useState(false)
  const [obsRevisao, setObsRevisao] = useState('')
  const [aprovarRevisao, setAprovarRevisao] = useState(true)
  const [verHistorico, setVerHistorico] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [planoDoc, progDoc, prof] = await Promise.all([
        fetch('/api/salon/grid?chave=plano_carreira_pj').then(r => r.ok ? r.json() : null),
        fetch(`/api/salon/grid?chave=plano_carreira_prof_${profissionalId}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/profissionais/${profissionalId}`).then(r => r.ok ? r.json() : null),
      ])
      if (planoDoc && Array.isArray(planoDoc.niveis)) setPlano(planoDoc)
      if (progDoc && progDoc.nivelId) setProgresso({ nivelId: progDoc.nivelId, manuais: progDoc.manuais || {}, historico: Array.isArray(progDoc.historico) ? progDoc.historico : [] })

      // Avaliação mais recente (mesma conta usada no Ranking de Avaliações)
      let avaliacaoPct: number | null = null
      try {
        const avs = Array.isArray(prof?.avaliacoes) ? prof.avaliacoes : (prof?.avaliacoes ? JSON.parse(prof.avaliacoes) : [])
        const ultima = [...avs].sort((a: any, b: any) => (b.data || '').localeCompare(a.data || ''))[0]
        if (ultima?.respostas) {
          const vals = Object.values(ultima.respostas) as number[]
          if (vals.length) avaliacaoPct = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length / 5 * 100)
        }
      } catch { /* */ }

      let tempoAnos: number | null = null
      if (prof?.data_admissao) {
        const dias = (Date.now() - new Date(prof.data_admissao).getTime()) / 86400000
        tempoAnos = dias > 0 ? dias / 365.25 : null
      }

      // Métricas financeiras (faturamento, ticket, retorno) — últimos 12 meses
      let faturamentoMensal: number | null = null, ticket: number | null = null, retorno: number | null = null
      try {
        const p2 = ultimosMeses(12, 0); const p1 = ultimosMeses(12, 12)
        const m = await fetch(`/api/profissionais/${profissionalId}/metricas?p1_inicio=${p1.inicio}&p1_fim=${p1.fim}&p2_inicio=${p2.inicio}&p2_fim=${p2.fim}`).then(r => r.ok ? r.json() : null)
        if (m?.historico_fat?.length) faturamentoMensal = m.historico_fat.reduce((s: number, h: any) => s + Number(h.faturamento || 0), 0) / m.historico_fat.length
        if (m?.fat_p2?.ticket_medio) ticket = Number(m.fat_p2.ticket_medio)
        if (m?.fidelizacao_fat?.taxa_fidelizacao != null) retorno = Number(m.fidelizacao_fat.taxa_fidelizacao)
      } catch { /* */ }

      setReais({ faturamentoMensal, ticket, retorno, avaliacao: avaliacaoPct, tempoAnos })
    } catch { /* */ }
    setLoading(false)
  }, [profissionalId])
  useEffect(() => { carregar() }, [carregar])

  const nivelIdx = plano ? Math.max(0, plano.niveis.findIndex(n => n.id === progresso.nivelId)) : 0
  const nivel = plano?.niveis[nivelIdx]
  const proximoNivel = plano?.niveis[nivelIdx + 1]

  const itens = useMemo(() => {
    if (!nivel) return []
    return linhas(nivel.indicadores).map((linhaOriginal, i) => {
      const obrig = linhaOriginal.startsWith('*')
      const texto = linhaOriginal.replace(/^\*/, '')
      const auto = classificar(texto)
      const key = `${nivel.id}:${i}`
      if (!auto) return { key, texto, obrig, auto: false as const, atingido: !!progresso.manuais[key] }
      const atualMap: Record<TipoAuto, number | null> = { faturamento: reais.faturamentoMensal, ticket: reais.ticket, retorno: reais.retorno, avaliacao: reais.avaliacao, tempo: reais.tempoAnos }
      const atual = atualMap[auto.tipo]
      const atingido = atual != null && atual >= auto.meta
      return { key, texto, obrig, auto: true as const, tipo: auto.tipo, meta: auto.meta, atual, atingido }
    })
  }, [nivel, reais, progresso.manuais])

  const totalOk = itens.filter(i => i.atingido).length
  const pct = itens.length ? Math.round(totalOk / itens.length * 100) : 0

  async function persistir(novo: ProgressoDoc) {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: `plano_carreira_prof_${profissionalId}`, doc: novo }) })
      if (res.ok) setProgresso(novo); else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function toggleManual(key: string) {
    if (bloqueado) return
    persistir({ ...progresso, manuais: { ...progresso.manuais, [key]: !progresso.manuais[key] } })
  }

  function confirmarRevisao() {
    if (!nivel) return
    const registro: RevisaoHist = { data: new Date().toISOString(), nivelId: nivel.id, nivelTitulo: nivel.titulo, aprovado: aprovarRevisao, observacao: obsRevisao }
    const novo: ProgressoDoc = { ...progresso, historico: [registro, ...progresso.historico] }
    if (aprovarRevisao && proximoNivel) { novo.nivelId = proximoNivel.id }
    persistir(novo)
    toast.success(aprovarRevisao ? (proximoNivel ? `Promovido(a) para ${proximoNivel.titulo}! 🎉` : 'Revisão registrada!') : 'Revisão registrada.')
    setRevisaoAberta(false); setObsRevisao('')
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={22} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>
  if (!plano || !nivel) return <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>O plano de carreira ainda não foi configurado.</div>

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ background: `linear-gradient(135deg, ${nivel.cor}, ${nivel.cor}cc)`, borderRadius: 14, padding: '16px 20px', color: '#fff', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: .85, textTransform: 'uppercase', letterSpacing: '.4px' }}>Nível atual</div>
            <div style={{ fontSize: 19, fontWeight: 900 }}>{nivel.emoji} {nivel.titulo}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 900 }}>{pct}%</div>
            <div style={{ fontSize: 11, opacity: .85 }}>{totalOk} de {itens.length} critérios</div>
          </div>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,.3)', borderRadius: 5, overflow: 'hidden', marginTop: 10 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#fff', transition: 'width .3s' }} />
        </div>
        {proximoNivel && <div style={{ fontSize: 12, marginTop: 8, opacity: .9 }}>Próximo nível: {proximoNivel.emoji} <strong>{proximoNivel.titulo}</strong></div>}
      </div>

      {pct === 100 && proximoNivel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: '#15803d', fontWeight: 700, fontSize: 13.5 }}>
          <PartyPopper size={18} /> Todos os critérios foram atingidos — pronto(a) para evoluir para {proximoNivel.titulo}!
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>Requisitos para evoluir</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {itens.map(it => (
            <div key={it.key} onClick={() => !it.auto && toggleManual(it.key)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 8, background: it.obrig ? '#fff7ed' : '#faf9f7', border: it.obrig ? '1px solid #fed7aa' : '1px solid #f0eee8', cursor: (!it.auto && !bloqueado) ? 'pointer' : 'default' }}>
              {it.atingido ? <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} /> : (it.auto && it.atual == null) ? <AlertCircle size={16} color="#9ca3af" style={{ flexShrink: 0, marginTop: 1 }} /> : <Circle size={16} color="#d0cdc7" style={{ flexShrink: 0, marginTop: 1 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, color: it.obrig ? '#9a3412' : '#374151', fontWeight: it.obrig ? 700 : 400 }}>{it.texto}</span>
                {it.obrig && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#c2410c', marginLeft: 6 }}>· OBRIGATÓRIO</span>}
                {it.auto && (
                  <div style={{ fontSize: 11, color: it.atual == null ? '#9ca3af' : it.atingido ? '#16a34a' : '#dc2626', fontWeight: 700, marginTop: 2 }}>
                    {ROTULO_TIPO[it.tipo]} — {it.atual == null ? 'sem dados suficientes ainda' : it.tipo === 'faturamento' || it.tipo === 'ticket' ? `atual ${fmtReais(it.atual)} · meta ${fmtReais(it.meta)}` : it.tipo === 'tempo' ? `atual ${it.atual.toFixed(1)} ano(s) · meta ${it.meta} ano(s)` : `atual ${it.atual.toFixed(0)}% · meta ${it.meta}%`}
                  </div>
                )}
                {!it.auto && !bloqueado && <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 2 }}>Clique para marcar manualmente</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: '1 1 200px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#15803d', textTransform: 'uppercase', marginBottom: 3 }}>💰 Comissionamento</div>
          <div style={{ fontSize: 13, color: '#15803d', fontWeight: 700 }}>{nivel.comissionamento}</div>
        </div>
        {nivel.beneficios && (
          <div style={{ flex: '1 1 200px', background: '#f0eefb', border: '1px solid #ddd6fb', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#5b4fcf', textTransform: 'uppercase', marginBottom: 3 }}>🎁 Benefícios</div>
            <div style={{ fontSize: 12.5, color: '#4c3fa8' }}>{linhas(nivel.beneficios).map((l, li) => <div key={li}>{l}</div>)}</div>
          </div>
        )}
      </div>

      {!bloqueado && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setRevisaoAberta(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><ClipboardCheck size={15} /> Registrar revisão de carreira</button>
          {progresso.historico.length > 0 && (
            <button onClick={() => setVerHistorico(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><History size={15} /> Histórico ({progresso.historico.length})</button>
          )}
        </div>
      )}

      {verHistorico && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {progresso.historico.map((h, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ fontWeight: 800, color: h.aprovado ? '#16a34a' : '#dc2626' }}>{h.aprovado ? '✓ Aprovado' : '✗ Não aprovado'} — {h.nivelTitulo}</span>
                <span style={{ color: '#9ca3af' }}>{new Date(h.data).toLocaleDateString('pt-BR')}</span>
              </div>
              {h.observacao && <div style={{ fontSize: 12.5, color: '#374151', marginTop: 4 }}>{h.observacao}</div>}
            </div>
          ))}
        </div>
      )}

      {revisaoAberta && (
        <div onClick={() => setRevisaoAberta(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px' }}>📋 Revisão de carreira — {nivel.titulo}</h3>
            <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 14px' }}>Data: {new Date().toLocaleDateString('pt-BR')} · {totalOk} de {itens.length} critérios atingidos ({pct}%)</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setAprovarRevisao(true)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: aprovarRevisao ? 'none' : '1.5px solid #d0cdc7', background: aprovarRevisao ? '#16a34a' : '#fff', color: aprovarRevisao ? '#fff' : '#6b6860', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>✓ Aprovado{proximoNivel ? ' — promover' : ''}</button>
              <button onClick={() => setAprovarRevisao(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: !aprovarRevisao ? 'none' : '1.5px solid #d0cdc7', background: !aprovarRevisao ? '#dc2626' : '#fff', color: !aprovarRevisao ? '#fff' : '#6b6860', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>✗ Não aprovado</button>
            </div>
            <textarea value={obsRevisao} onChange={e => setObsRevisao(e.target.value)} rows={3} placeholder="Observações da revisão (opcional)..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #d0cdc7', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={confirmarRevisao} disabled={salvando} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : 'Confirmar'}</button>
              <button onClick={() => setRevisaoAberta(false)} style={{ padding: '11px 16px', borderRadius: 10, border: '1.5px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {!bloqueado && plano.niveis.length > 1 && (
        <div style={{ marginTop: 16, fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ChevronRight size={13} /> Precisa ajustar o nível manualmente? Use o botão de revisão acima (não aprovar mantém o nível; aprovar avança para o próximo).
        </div>
      )}
    </div>
  )
}
