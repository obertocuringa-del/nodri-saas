'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Plus, Save, Printer, Trash2, ArrowLeft } from 'lucide-react'
import { MODELO_AVAL_DEFAULT, CLASSIF_AVAL, classificarAval, type CatAval, type Faixa } from './avaliacaoModelo'

const ESCALA = [{ n: 1, l: 'Muito abaixo' }, { n: 2, l: 'Abaixo' }, { n: 3, l: 'Dentro do esperado' }, { n: 4, l: 'Acima' }, { n: 5, l: 'Excelente' }]
const TEMPOS = ['Menos de 6 meses', '6 meses a 1 ano', '1 a 2 anos', '2 a 5 anos', 'Mais de 5 anos']

interface Avaliacao { id: string; data: string; tempo: string; respostas: Record<string, number>; obs: string; perspectiva?: string }
const PERSPECTIVAS = ['Gestor (líder)', 'Colega de equipe', 'Cliente', 'Autoavaliação']
const corPersp = (p?: string) => p === 'Cliente' ? '#db2777' : p === 'Colega de equipe' ? '#0891b2' : p === 'Autoavaliação' ? '#ea580c' : '#5b4fcf'

function calcular(respostas: Record<string, number>, secoes: CatAval[]) {
  const sec = secoes.map(s => {
    const notas = s.criterios.map(cr => respostas[`${s.id}:${cr.id}`]).filter(n => n != null) as number[]
    const avg = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0
    return { titulo: s.titulo, cor: s.cor, pct: Math.round(avg / 5 * 100) }
  })
  const todas = Object.values(respostas)
  const overallAvg = todas.length ? todas.reduce((a, b) => a + b, 0) / todas.length : 0
  return { secoes: sec, overallPct: Math.round(overallAvg / 5 * 100), overall10: Math.round(overallAvg / 5 * 100) / 10 }
}

function Gauge({ pct, cor, label }: { pct: number; cor: string; label: string }) {
  const r = 34, c = 2 * Math.PI * r, off = c - (pct / 100) * c
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width="86" height="86" viewBox="0 0 86 86">
        <circle cx="43" cy="43" r={r} fill="none" stroke="#eee" strokeWidth="8" />
        <circle cx="43" cy="43" r={r} fill="none" stroke={cor} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 43 43)" />
        <text x="43" y="48" textAnchor="middle" fontSize="18" fontWeight="800" fill={cor}>{pct}%</text>
      </svg>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textAlign: 'center', maxWidth: 110 }}>{label}</span>
    </div>
  )
}

export default function AvaliarProfissional({ profissionalId, profissionalNome, soResultado }: { profissionalId: string; profissionalNome: string; soResultado?: boolean }) {
  const [secoes, setSecoes] = useState<CatAval[]>([])
  const [faixas, setFaixas] = useState<Faixa[]>(CLASSIF_AVAL)
  const [historico, setHistorico] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'lista' | 'form' | 'resultado'>('lista')
  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [tempo, setTempo] = useState('2 a 5 anos')
  const [perspectiva, setPerspectiva] = useState(PERSPECTIVAS[0])
  const [dataAval, setDataAval] = useState(() => new Date().toISOString().slice(0, 10))
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [vendo, setVendo] = useState<Avaliacao | null>(null)

  const carregar = useCallback(async () => {
    try {
      const [p, modelo] = await Promise.all([
        fetch(`/api/profissionais/${profissionalId}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/salon/grid?chave=avaliacao_modelo').then(r => r.ok ? r.json() : null).catch(() => null),
      ])
      setSecoes(modelo && Array.isArray(modelo.categorias) && modelo.categorias.length ? modelo.categorias : MODELO_AVAL_DEFAULT.categorias)
      setFaixas(modelo && Array.isArray(modelo.classificacao) && modelo.classificacao.length ? modelo.classificacao : CLASSIF_AVAL)
      let arr: Avaliacao[] = []
      try { arr = Array.isArray(p?.avaliacoes) ? p.avaliacoes : (p?.avaliacoes ? JSON.parse(p.avaliacoes) : []) } catch { arr = [] }
      setHistorico(arr.sort((a, b) => (b.data || '').localeCompare(a.data || '')))
    } catch { setSecoes(MODELO_AVAL_DEFAULT.categorias) }
    setLoading(false)
  }, [profissionalId])
  useEffect(() => { carregar() }, [carregar])

  const TOTAL = secoes.reduce((a, s) => a + s.criterios.length, 0)
  const totalRespondidas = Object.keys(respostas).length

  function novaAvaliacao() {
    setRespostas({}); setObs(''); setTempo('2 a 5 anos'); setPerspectiva(PERSPECTIVAS[0]); setDataAval(new Date().toISOString().slice(0, 10)); setVendo(null); setView('form')
  }

  async function salvar() {
    if (totalRespondidas < TOTAL) { toast.error(`Responda todos os ${TOTAL} critérios antes de salvar.`); return }
    setSalvando(true)
    const nova: Avaliacao = { id: Date.now().toString(), data: dataAval, tempo, perspectiva, respostas, obs }
    const novoHist = [nova, ...historico]
    try {
      const res = await fetch(`/api/profissionais/${profissionalId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avaliacoes: novoHist }) })
      if (res.ok) { toast.success('Avaliação salva!'); setHistorico(novoHist); setView('lista') } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta avaliação?')) return
    const novoHist = historico.filter(a => a.id !== id)
    try {
      const res = await fetch(`/api/profissionais/${profissionalId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avaliacoes: novoHist }) })
      if (res.ok) { toast.success('Excluída'); setHistorico(novoHist) } else toast.error('Erro')
    } catch { toast.error('Erro') }
  }

  function imprimir(av: Avaliacao) {
    const r = calcular(av.respostas, secoes)
    const cl = classificarAval(r.overallPct, faixas)
    const linhas = secoes.map(s => {
      const notas = s.criterios.map(cr => av.respostas[`${s.id}:${cr.id}`]).filter(n => n != null) as number[]
      const avg = notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length / 5 * 100) : 0
      return `<div class="sec"><h3 style="color:${s.cor}">${s.titulo} <span style="font-weight:400;color:#666;font-size:11px">— média ${avg}%</span></h3>${s.criterios.map(cr => `<div class="cri"><span>${cr.texto.replace(/</g, '&lt;')}</span><b>${av.respostas[`${s.id}:${cr.id}`] ?? '-'} / 5</b></div>`).join('')}</div>`
    }).join('')
    const css = `@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:12px}.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #5b4fcf;padding-bottom:8px;margin-bottom:12px}.brand{font-size:22px;font-weight:900;color:#5b4fcf}.score{background:${cl.cor};color:#fff;border-radius:12px;padding:14px 18px;text-align:center;margin-bottom:14px}.score b{font-size:30px}.sec{margin-bottom:12px;break-inside:avoid}h3{font-size:13px;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:5px}.cri{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dotted #eee}.obs{background:#faf9f7;border-radius:8px;padding:10px;margin-top:10px;font-size:11px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Avaliação ${profissionalNome}</title><style>${css}</style></head><body><div class="hd"><div class="brand">NODRI</div><div style="text-align:right;font-size:11px"><strong>Avaliação de Profissional</strong><br>${profissionalNome} · ${av.data.split('-').reverse().join('/')}</div></div><div class="score"><div>${cl.emoji} ${cl.txt}</div><b>${r.overall10.toFixed(1)}</b> / 10 &nbsp; (${r.overallPct}%)</div>${linhas}${av.obs ? `<div class="obs"><strong>Observações:</strong> ${av.obs.replace(/</g, '&lt;')}</div>` : ''}<script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>

  // ── RESULTADO ──
  if (view === 'resultado' || vendo) {
    const av = vendo || { id: 'tmp', data: dataAval, tempo, respostas, obs }
    const r = calcular(av.respostas, secoes)
    const cl = classificarAval(r.overallPct, faixas)
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <button onClick={() => { setVendo(null); setView(vendo ? 'lista' : 'form') }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 13 }}><ArrowLeft size={15} /> Voltar</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => imprimir(av)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
            {view === 'resultado' && !vendo && <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>}
          </div>
        </div>
        <div style={{ background: cl.cor, borderRadius: 16, padding: '20px', color: '#fff', textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{cl.emoji} {cl.txt}</div>
          <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>{r.overall10.toFixed(1)}<span style={{ fontSize: 18, opacity: .8 }}> / 10</span></div>
          <div style={{ fontSize: 13, opacity: .9, marginTop: 4 }}>Pontuação geral: {r.overallPct}% · {profissionalNome} · {av.data.split('-').reverse().join('/')}{av.perspectiva ? ` · ${av.perspectiva}` : ''}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: '18px', marginBottom: 14 }}>
          {r.secoes.map((s, i) => <Gauge key={i} pct={s.pct} cor={s.cor} label={s.titulo} />)}
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>📊 Média por categoria</h3>
          {r.secoes.map((s, i) => {
            const c = classificarAval(s.pct, faixas)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid #f0eee8' : 'none', flexWrap: 'wrap' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: s.cor, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 150, fontSize: 13, color: '#1a1a1a' }}>{s.titulo}</span>
                <div style={{ flex: '1 1 100px', minWidth: 70, height: 8, background: '#eee', borderRadius: 5, overflow: 'hidden' }}><div style={{ width: `${s.pct}%`, height: '100%', background: s.cor }} /></div>
                <span style={{ fontWeight: 800, fontSize: 14, color: s.cor, width: 46, textAlign: 'right' }}>{s.pct}%</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: c.cor, minWidth: 130, textAlign: 'right' }}>{c.emoji} {c.txt}</span>
              </div>
            )
          })}
        </div>
        {av.obs && <div style={{ background: '#faf9f7', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#374151' }}><strong>Observações:</strong> {av.obs}</div>}
      </div>
    )
  }

  // ── FORMULÁRIO ──
  if (view === 'form') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => setView('lista')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 13 }}><ArrowLeft size={15} /> Voltar</button>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{totalRespondidas}/{TOTAL} respondidos</span>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16, marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div><label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 4 }}>Data da Avaliação</label><input type="date" value={dataAval} onChange={e => setDataAval(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 4 }}>Tempo de Empresa</label><select value={tempo} onChange={e => setTempo(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }}>{TEMPOS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 4 }}>Quem está avaliando (360°)</label><select value={perspectiva} onChange={e => setPerspectiva(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${corPersp(perspectiva)}`, color: corPersp(perspectiva), fontWeight: 700, fontSize: 13 }}>{PERSPECTIVAS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        </div>
        {secoes.map((s, si) => (
          <div key={s.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ background: s.cor, color: '#fff', padding: '10px 16px', fontWeight: 800, fontSize: 14 }}>{si + 1}. {s.titulo}</div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {ESCALA.map(e => <span key={e.n} style={{ fontSize: 10, fontWeight: 700, color: '#6b6860', background: '#f0eee8', borderRadius: 6, padding: '3px 8px' }}>{e.n} = {e.l}</span>)}
              </div>
              {s.criterios.map((cr, ci) => {
                const key = `${s.id}:${cr.id}`, val = respostas[key]
                return (
                  <div key={cr.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: ci > 0 ? '1px solid #f0eee8' : 'none', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, color: '#1a1a1a', flex: 1, minWidth: 160 }}>{cr.texto}</span>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {ESCALA.map(e => (
                        <button key={e.n} onClick={() => setRespostas(p => ({ ...p, [key]: e.n }))} title={e.l}
                          style={{ width: 34, height: 34, borderRadius: 8, border: val === e.n ? 'none' : '1.5px solid #d0cdc7', background: val === e.n ? s.cor : '#fff', color: val === e.n ? '#fff' : '#6b6860', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>{e.n}</button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 5 }}>Observações (opcional)</label>
          <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} placeholder="Pontos fortes, pontos a desenvolver, plano de ação..." style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
        <button onClick={() => setView('resultado')} disabled={totalRespondidas < TOTAL} style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: totalRespondidas < TOTAL ? '#cbd5e1' : 'linear-gradient(135deg,#7c3aed,#5b4fcf)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: totalRespondidas < TOTAL ? 'not-allowed' : 'pointer' }}>
          {totalRespondidas < TOTAL ? `Responda os ${TOTAL} critérios (${totalRespondidas}/${TOTAL})` : 'Ver Resultado →'}
        </button>
      </div>
    )
  }

  // ── LISTA / HISTÓRICO ──
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px' }}>Avaliações de {profissionalNome}</h3>
          <p style={{ fontSize: 13, color: '#6b6860', margin: 0 }}>{soResultado ? 'Veja o resultado das suas avaliações.' : `Avalie ${TOTAL} critérios em ${secoes.length} áreas (1 a 5). Os critérios vêm de “Perfil e Avaliação de Desempenho”.`}</p>
        </div>
        {!soResultado && <button onClick={novaAvaliacao} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#5b4fcf)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}><Plus size={16} /> Nova Avaliação</button>}
      </div>

      {/* ── EVOLUÇÃO POR CATEGORIA (comparativo no tempo) ── */}
      {historico.length >= 2 && (() => {
        const cron = [...historico].sort((a, b) => (a.data || '').localeCompare(b.data || ''))
        const calcs = cron.map(av => ({ data: av.data, ...calcular(av.respostas, secoes) }))
        const fmt = (d: string) => (d || '').split('-').reverse().slice(0, 2).join('/')
        const seta = (d: number) => d > 0 ? '↑' : d < 0 ? '↓' : '→'
        const corDelta = (d: number) => d > 0 ? '#16a34a' : d < 0 ? '#dc2626' : '#9ca3af'
        const thE: React.CSSProperties = { padding: '6px 8px', fontSize: 11, color: '#6b6860', borderBottom: '2px solid #e8e6e0', whiteSpace: 'nowrap', textAlign: 'center' }
        const tdE: React.CSSProperties = { padding: '6px 8px', fontSize: 12, borderBottom: '1px solid #f0eee8', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap' }
        return (
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 14, overflowX: 'auto' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px' }}>📈 Evolução por categoria</h3>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 10px' }}>Comparativo de cada categoria ao longo das avaliações. Δ = variação da primeira para a última.</p>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 320 }}>
              <thead><tr><th style={{ ...thE, textAlign: 'left' }}>Categoria</th>{calcs.map((c, i) => <th key={i} style={thE}>{fmt(c.data)}</th>)}<th style={thE}>Δ</th></tr></thead>
              <tbody>
                {secoes.map((s, si) => {
                  const vals = calcs.map(c => c.secoes[si]?.pct ?? 0)
                  const delta = vals[vals.length - 1] - vals[0]
                  return (
                    <tr key={s.id}>
                      <td style={{ ...tdE, textAlign: 'left', color: '#1a1a1a', fontWeight: 600 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: s.cor, marginRight: 6 }} />{s.titulo}</td>
                      {vals.map((v, i) => <td key={i} style={{ ...tdE, color: classificarAval(v, faixas).cor }}>{v}%</td>)}
                      <td style={{ ...tdE, color: corDelta(delta) }}>{seta(delta)} {Math.abs(delta)}%</td>
                    </tr>
                  )
                })}
                <tr>
                  <td style={{ ...tdE, textAlign: 'left', fontWeight: 900, color: '#1a1a1a', background: '#faf9f7' }}>GERAL</td>
                  {calcs.map((c, i) => <td key={i} style={{ ...tdE, fontWeight: 900, background: '#faf9f7', color: classificarAval(c.overallPct, faixas).cor }}>{c.overallPct}%</td>)}
                  {(() => { const d = calcs[calcs.length - 1].overallPct - calcs[0].overallPct; return <td style={{ ...tdE, fontWeight: 900, background: '#faf9f7', color: corDelta(d) }}>{seta(d)} {Math.abs(d)}%</td> })()}
                </tr>
              </tbody>
            </table>
          </div>
        )
      })()}

      {historico.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
          {soResultado ? 'Você ainda não tem avaliações registradas.' : <>Nenhuma avaliação ainda. Clique em <strong>Nova Avaliação</strong> para começar.</>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {historico.map(av => {
            const r = calcular(av.respostas, secoes); const cl = classificarAval(r.overallPct, faixas)
            return (
              <div key={av.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ width: 54, height: 54, borderRadius: 12, background: cl.cor, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{r.overall10.toFixed(1)}</span>
                  <span style={{ fontSize: 9, opacity: .85 }}>/ 10</span>
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 800, color: cl.cor, fontSize: 14 }}>{cl.emoji} {cl.txt}</div>
                  <div style={{ fontSize: 12, color: '#6b6860' }}>{av.data.split('-').reverse().join('/')} · {av.tempo}</div>
                  {av.perspectiva && <span style={{ display: 'inline-block', marginTop: 3, fontSize: 10, fontWeight: 800, color: '#fff', background: corPersp(av.perspectiva), borderRadius: 20, padding: '2px 8px' }}>{av.perspectiva}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setVendo(av)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Ver</button>
                  {!soResultado && <button onClick={() => excluir(av.id)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
