'use client'

import { Fragment, useState, useEffect } from 'react'
import { Loader2, Search, Sparkles, Calculator, AlertTriangle, Users } from 'lucide-react'

const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const rs = (v: number) => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR')

function dow(data: string): number {
  if (!data || !data.includes('/')) return -1
  const [d, m, y] = data.split('/')
  // Data LOCAL (não usar "YYYY-MM-DD" que o JS interpreta como UTC e desloca 1 dia no Brasil)
  const dt = new Date(Number(y), Number(m) - 1, Number(d))
  return isNaN(dt.getTime()) ? -1 : dt.getDay()
}
function heat(v: number, max: number): [string, string] {
  if (max <= 0) return ['#f5f4f0', '#9ca3af']
  const t = v / max
  if (t >= 0.66) return ['#E1F5EE', '#0F6E56']
  if (t >= 0.33) return ['#FAEEDA', '#854F0B']
  return ['#FCEBEB', '#A32D2D']
}

export default function DiaSemanaReport() {
  const anoAtual = new Date().getFullYear()
  const [modo, setModo] = useState<'um' | 'comparar'>('um')
  const [dia, setDia] = useState(1)
  const [dia2, setDia2] = useState(6)
  const [ano, setAno] = useState(anoAtual)
  const [dados, setDados] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [pergunta, setPergunta] = useState('')
  const [resposta, setResposta] = useState('')
  const [loadIA, setLoadIA] = useState(false)
  const [mesExp, setMesExp] = useState<number | null>(null)
  const [diaFechar, setDiaFechar] = useState(0)
  const [redistPct, setRedistPct] = useState(60)
  // Análise de dependência do dia (exclusivos vs multidia) — dados reais
  const [dep, setDep] = useState<any | null>(null)
  const [depLoad, setDepLoad] = useState(false)

  async function carregar() {
    setLoading(true); setDados(null); setResposta('')
    try {
      const r = await fetch(`/api/relatorios/dia-semana?ano=${ano}`)
      const j = await r.json()
      setDados(j.dias || [])
    } catch { setDados([]) }
    setLoading(false)
  }

  // Busca a análise de dependência (exclusivos vs multidia) do dia escolhido no simulador
  async function carregarDependencia(diaIdx: number, anoRef: number) {
    setDepLoad(true); setDep(null)
    try {
      const r = await fetch(`/api/relatorios/dia-semana-dependencia?ano=${anoRef}&dia=${diaIdx}`)
      const j = await r.json()
      setDep(j?.error ? null : j)
    } catch { setDep(null) }
    setDepLoad(false)
  }
  // Recarrega a análise quando os dados são carregados ou o dia a fechar muda
  useEffect(() => {
    if (dados && dados.length) carregarDependencia(diaFechar, ano)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaFechar, dados])

  function dadosDoDia(diaIdx: number) {
    const lista = (dados || []).filter(d => dow(d.data) === diaIdx)
    const porMes: Record<number, any[]> = {}
    for (const d of lista) { (porMes[d.mes] = porMes[d.mes] || []).push(d) }
    const total = lista.reduce((s, d) => s + d.valor, 0)
    const media = lista.length ? total / lista.length : 0
    const vals = lista.map(d => d.valor)
    return { lista, porMes, total, media, max: vals.length ? Math.max(...vals) : 0, min: vals.length ? Math.min(...vals) : 0, count: lista.length }
  }

  function resumoSemana() {
    return DIAS.map((nome, i) => { const d = dadosDoDia(i); return `${nome}: ${d.count} dias, total ${rs(d.total)}, média ${rs(d.media)}` }).join('\n')
  }

  async function perguntarIA(texto: string) {
    if (loadIA || !dados || !texto.trim()) return
    setLoadIA(true); setResposta('')
    const det = Object.entries(dadosDoDia(dia).porMes).sort((a, b) => +a[0] - +b[0])
      .map(([m, arr]: any) => `${MESES[+m]}: ${rs(arr.reduce((s: number, x: any) => s + x.valor, 0))}`).join(' · ')
    const prompt = `Você é a NODRI IA, consultora de gestão de salão de beleza.\n\nDADOS JÁ CALCULADOS PELO SISTEMA (faturamento BRUTO por dia da semana, ano ${ano}):\n${resumoSemana()}\n\nDetalhe de ${DIAS[dia]} por mês: ${det}\n\nREGRA ABSOLUTA: use EXCLUSIVAMENTE os números acima. NUNCA invente, recalcule ou apresente valores diferentes dos fornecidos. NÃO monte tabelas de números — eles já estão na tela. Se precisar de um número que não está nos dados, diga que não tem. Seu papel é apenas INTERPRETAR e RECOMENDAR (texto), não calcular.\n\nPERGUNTA DO GESTOR: ${texto}\n\nResponda curto, direto e prático, focado no PARECER e nas AÇÕES.`
    try {
      const res = await fetch('/api/ia/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagens: [{ role: 'user', content: prompt }], modo: 'gestor' }) })
      if (res.ok && res.body) {
        const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''
        while (true) {
          const { done, value } = await reader.read(); if (done) break
          buf += dec.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop() || ''
          for (const l of lines) { if (!l.startsWith('data:')) continue; const j = l.slice(5).trim(); if (!j) continue; try { const p = JSON.parse(j); if (p.token) setResposta(prev => prev + p.token) } catch {} }
        }
      } else {
        let msg = `Não foi possível consultar a IA (status ${res.status}).`
        try { const d = await res.json(); if (d?.error) msg = d.error } catch {}
        setResposta(msg)
      }
    } catch (e: any) { setResposta('Erro de conexão com a IA: ' + (e?.message || '')) }
    setLoadIA(false)
  }

  const selStyle = { background: '#fff', border: '1.5px solid #d0cdc7', borderRadius: 8, color: '#1a1a1a', padding: '8px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' } as const
  const cardMetric = (label: string, valor: string, cor: string) => (
    <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '12px 14px', flex: '1 1 150px' }}>
      <div style={{ fontSize: 11, color: '#6b6860', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: cor }}>{valor}</div>
    </div>
  )

  const dd = dados ? dadosDoDia(dia) : null
  const dd2 = dados ? dadosDoDia(dia2) : null

  return (
    <div>
      {/* Modo */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['um', 'comparar'] as const).map(m => (
          <button key={m} onClick={() => { setModo(m); setResposta('') }}
            style={{ padding: '7px 16px', borderRadius: 8, border: modo === m ? '2px solid #5b4fcf' : '1.5px solid #e0ddd8', background: modo === m ? '#f0eefb' : 'transparent', color: modo === m ? '#5b4fcf' : '#6b6860', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {m === 'um' ? 'Um dia' : 'Comparar dois dias'}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end', background: '#f8f7f5', border: '1.5px solid #e0ddd8', borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <div><div style={{ fontSize: 11, color: '#6b6860', marginBottom: 4 }}>Dia da semana</div>
          <select value={dia} onChange={e => setDia(+e.target.value)} style={selStyle}>{DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></div>
        {modo === 'comparar' && (
          <div><div style={{ fontSize: 11, color: '#6b6860', marginBottom: 4 }}>Comparar com</div>
            <select value={dia2} onChange={e => setDia2(+e.target.value)} style={selStyle}>{DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></div>
        )}
        <div><div style={{ fontSize: 11, color: '#6b6860', marginBottom: 4 }}>Ano</div>
          <select value={ano} onChange={e => setAno(+e.target.value)} style={selStyle}>{[anoAtual, anoAtual - 1, anoAtual - 2].map(a => <option key={a} value={a}>{a}</option>)}</select></div>
        <button onClick={carregar} disabled={loading}
          style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Carregar
        </button>
      </div>

      {!dados && !loading && <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>Selecione o dia e o ano e clique em Carregar.</div>}
      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>}

      {dados && dados.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>Nenhum dado de faturamento diário para {ano}.</div>}

      {/* MODO UM DIA */}
      {dados && dados.length > 0 && modo === 'um' && dd && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {cardMetric(`Total nas ${DIAS[dia].toLowerCase()}s`, rs(dd.total), '#16a34a')}
            {cardMetric('Média por dia', rs(dd.media), '#5b4fcf')}
            {cardMetric('Melhor dia', rs(dd.max), '#0F6E56')}
            {cardMetric('Pior dia', rs(dd.min), '#A32D2D')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginBottom: 18 }}>
            {Object.entries(dd.porMes).sort((a, b) => +a[0] - +b[0]).map(([m, arr]: any) => {
              const totMes = arr.reduce((s: number, x: any) => s + x.valor, 0)
              return (
                <div key={m} style={{ border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ background: '#f5f4f0', padding: '7px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                    <span>{MESES[+m]}</span><span style={{ color: '#5b4fcf' }}>{rs(totMes)}</span>
                  </div>
                  {arr.sort((a: any, b: any) => a.data.localeCompare(b.data)).map((x: any, i: number) => {
                    const [bg, tx] = heat(x.valor, dd.max)
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', fontSize: 12, borderTop: '1px solid #f0eee8' }}>
                        <span style={{ color: '#767069' }}>{x.data}</span>
                        <span style={{ background: bg, color: tx, borderRadius: 5, padding: '2px 8px', fontWeight: 600 }}>{rs(x.valor)}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* MODO COMPARAR */}
      {dados && dados.length > 0 && modo === 'comparar' && dd && dd2 && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {cardMetric(`Total ${DIAS[dia].toLowerCase()}`, rs(dd.total), '#5b4fcf')}
            {cardMetric(`Total ${DIAS[dia2].toLowerCase()}`, rs(dd2.total), '#0891b2')}
            {cardMetric('Diferença', rs(Math.abs(dd.total - dd2.total)), dd.total >= dd2.total ? '#16a34a' : '#A32D2D')}
            {cardMetric('Vencedor', dd.total >= dd2.total ? DIAS[dia] : DIAS[dia2], '#16a34a')}
          </div>
          <div style={{ border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden', marginBottom: 18 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#f5f4f0' }}>
                {['Mês', DIAS[dia], DIAS[dia2], 'Diferença'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Mês' ? 'left' : 'right', fontSize: 11, color: '#6b6860', fontWeight: 600 }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {MESES.slice(1).map((nome, idx) => {
                  const mi = idx + 1
                  const arr1 = (dd.porMes[mi] || []).slice().sort((a: any, b: any) => a.data.localeCompare(b.data))
                  const arr2 = (dd2.porMes[mi] || []).slice().sort((a: any, b: any) => a.data.localeCompare(b.data))
                  const t1 = arr1.reduce((s: number, x: any) => s + x.valor, 0)
                  const t2 = arr2.reduce((s: number, x: any) => s + x.valor, 0)
                  if (t1 === 0 && t2 === 0) return null
                  const dif = t1 - t2
                  const aberto = mesExp === mi
                  const colDias = (titulo: string, cor: string, arr: any[]) => (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: cor, marginBottom: 4 }}>{titulo}</div>
                      {arr.length ? arr.map((x: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12, borderBottom: '1px solid #f0eee8' }}>
                          <span style={{ color: '#767069' }}>{x.data}</span><span style={{ color: '#1a1a1a', fontWeight: 600 }}>{rs(x.valor)}</span>
                        </div>
                      )) : <span style={{ fontSize: 11, color: '#9ca3af' }}>—</span>}
                    </div>
                  )
                  return (
                    <Fragment key={mi}>
                      <tr onClick={() => setMesExp(aberto ? null : mi)} style={{ borderTop: '1px solid #f0eee8', cursor: 'pointer', background: aberto ? '#f5f4f0' : 'transparent' }}>
                        <td style={{ padding: '7px 12px', color: '#1a1a1a', fontWeight: 600 }}>{aberto ? '▾' : '▸'} {nome}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', color: '#5b4fcf', fontWeight: 600 }}>{rs(t1)}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', color: '#0891b2', fontWeight: 600 }}>{rs(t2)}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'right', color: dif >= 0 ? '#16a34a' : '#A32D2D', fontWeight: 700 }}>{dif >= 0 ? '+' : ''}{rs(dif)}</td>
                      </tr>
                      {aberto && (
                        <tr style={{ background: '#faf9f7' }}>
                          <td colSpan={4} style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                              {colDias(DIAS[dia], '#5b4fcf', arr1)}
                              {colDias(DIAS[dia2], '#0891b2', arr2)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* SIMULADOR DE FECHAMENTO — calculado pelo sistema */}
      {dados && dados.length > 0 && (() => {
        const totFechar = dadosDoDia(diaFechar).total
        const perdaReal = totFechar * (1 - redistPct / 100)
        const recuperado = totFechar - perdaReal
        return (
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 12, flexWrap: 'wrap' }}>
              <Calculator size={15} color="#5b4fcf" /> Simulador de Fechamento
              <span style={{ fontSize: 10, color: '#15803d', fontWeight: 600, background: '#dcfce7', borderRadius: 6, padding: '2px 8px' }}>números calculados pelo sistema</span>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'end', marginBottom: 14 }}>
              <div><div style={{ fontSize: 11, color: '#6b6860', marginBottom: 4 }}>Fechar qual dia?</div>
                <select value={diaFechar} onChange={e => setDiaFechar(+e.target.value)} style={selStyle}>{DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></div>
              <div style={{ flex: '1 1 220px' }}>
                <div style={{ fontSize: 11, color: '#6b6860', marginBottom: 4 }}>Quantos clientes migram p/ outros dias? <strong style={{ color: '#5b4fcf' }}>{redistPct}%</strong></div>
                <input type="range" min={0} max={100} step={5} value={redistPct} onChange={e => setRedistPct(+e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {cardMetric(`Perda bruta ao fechar ${DIAS[diaFechar].toLowerCase()}`, rs(totFechar), '#A32D2D')}
              {cardMetric(`Recuperado com ${redistPct}% migrando`, rs(recuperado), '#16a34a')}
              {cardMetric('Perda REAL estimada', rs(perdaReal), '#d97706')}
            </div>
            <button onClick={() => perguntarIA(`O sistema calculou: fechar as ${DIAS[diaFechar].toLowerCase()}s no ano ${ano} dá perda BRUTA de ${rs(totFechar)}. Com ${redistPct}% dos clientes migrando para outros dias, a perda REAL fica em ${rs(perdaReal)}. Dê um parecer gerencial curto: vale a pena? riscos? como facilitar a migração? Use SOMENTE esses números.`)} disabled={loadIA}
              style={{ marginTop: 14, padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#5b4fcf,#f43f8e)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {loadIA ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Pedir parecer da IA
            </button>
          </div>
        )
      })()}

      {/* ANÁLISE DE DEPENDÊNCIA DO DIA — clientes exclusivos vs multidia (dados reais) */}
      {dados && dados.length > 0 && (() => {
        const totDia = dadosDoDia(diaFechar).total
        const pctRisco = dep?.pct_receita_risco ?? 0
        const receitaRisco = Math.round(totDia * pctRisco)
        const receitaRecup = Math.round(totDia - receitaRisco)
        const probCor = (p: string) => p === 'alta'
          ? { bg: '#dcfce7', tx: '#15803d', lbl: 'Alta' }
          : p === 'media' ? { bg: '#fef3c7', tx: '#854f0b', lbl: 'Média' } : { bg: '#fee2e2', tx: '#991b1b', lbl: 'Baixa' }
        return (
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 4, flexWrap: 'wrap' }}>
              <Users size={15} color="#5b4fcf" /> Análise de Dependência — {DIAS[diaFechar]}
              <span style={{ fontSize: 10, color: '#15803d', fontWeight: 600, background: '#dcfce7', borderRadius: 6, padding: '2px 8px' }}>comportamento real dos clientes</span>
            </div>
            <p style={{ fontSize: 11, color: '#6b6860', margin: '0 0 12px' }}>
              Quantos clientes dependem SÓ deste dia (receita em risco real) vs. quem também vem em outros dias (recuperável).
            </p>

            {depLoad && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Loader2 size={20} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>}

            {!depLoad && !dep && <div style={{ fontSize: 12, color: '#9ca3af', padding: 12 }}>Sem dados de atendimentos para calcular a dependência deste dia.</div>}

            {!depLoad && dep && dep.total_clientes > 0 && (
              <>
                {/* Cards principais */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                  {cardMetric('Clientes exclusivos', String(dep.exclusivos), '#A32D2D')}
                  {cardMetric('% Exclusivos', dep.pct_exclusivos + '%', '#d97706')}
                  {cardMetric('Clientes multidia', String(dep.multidia), '#16a34a')}
                  {cardMetric('Receita em risco', rs(receitaRisco), '#A32D2D')}
                  {cardMetric('Receita recuperável', rs(receitaRecup), '#16a34a')}
                </div>

                {/* Barra de distribuição */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', height: 22, borderRadius: 8, overflow: 'hidden', border: '1px solid #e8e6e0' }}>
                    <div style={{ width: `${dep.pct_exclusivos}%`, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                      {dep.pct_exclusivos >= 12 ? `${dep.pct_exclusivos}%` : ''}
                    </div>
                    <div style={{ flex: 1, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                      {(100 - dep.pct_exclusivos) >= 12 ? `${Math.round((100 - dep.pct_exclusivos) * 10) / 10}%` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b6860', marginTop: 4 }}>
                    <span>🟥 Exclusivos deste dia</span><span>🟩 Frequentam outros dias</span>
                  </div>
                </div>

                {/* Quadro impacto + migração */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginBottom: 14 }}>
                  <div style={{ border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><AlertTriangle size={13} /> Impacto de fechar {DIAS[diaFechar].toLowerCase()}</div>
                    {([['Faturamento atual', rs(totDia)], ['Clientes exclusivos', String(dep.exclusivos)], ['Receita em risco', rs(receitaRisco)], ['Receita recuperável', rs(receitaRecup)], ['Perda real estimada', rs(receitaRisco)]] as [string, string][]).map(([k, v], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#1a1a1a' }}>
                        <span style={{ color: '#6b6860' }}>{k}</span><strong>{v}</strong>
                      </div>
                    ))}
                  </div>
                  <div style={{ border: '1px solid #e8e6e0', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>Potencial de migração (estimativa) — exclusivos</div>
                    {([['alta', dep.migracao.alta], ['media', dep.migracao.media], ['baixa', dep.migracao.baixa]] as [string, number][]).map(([p, q]) => {
                      const c = probCor(p)
                      return (
                        <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0' }}>
                          <span style={{ background: c.bg, color: c.tx, borderRadius: 6, padding: '2px 8px', fontWeight: 600, fontSize: 11 }}>{c.lbl} probabilidade</span>
                          <strong>{q} clientes</strong>
                        </div>
                      )
                    })}
                    <p style={{ fontSize: 10, color: '#9ca3af', margin: '8px 0 0' }}>Heurística do sistema por frequência de visitas (não é IA).</p>
                  </div>
                </div>

                {/* Lista de exclusivos (irrecuperáveis sem ação) */}
                {dep.lista_exclusivos.length > 0 && (
                  <div style={{ border: '1px solid #e8e6e0', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{ background: '#fef2f2', padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#991b1b' }}>
                      Clientes que vêm SÓ {DIAS[diaFechar].toLowerCase()} — precisam ser migrados antes de fechar
                    </div>
                    <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead><tr style={{ background: '#faf9f7', position: 'sticky', top: 0 }}>
                          {['Cliente', 'Visitas', 'Última visita', 'Receita', 'Migração'].map(h => <th key={h} style={{ padding: '7px 12px', textAlign: h === 'Cliente' ? 'left' : 'right', fontSize: 11, color: '#6b6860', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {dep.lista_exclusivos.map((c: any, i: number) => {
                            const pc = probCor(c.prob_migracao)
                            return (
                              <tr key={i} style={{ borderTop: '1px solid #f0eee8' }}>
                                <td style={{ padding: '6px 12px', color: '#1a1a1a', fontWeight: 600 }}>{c.cliente}</td>
                                <td style={{ padding: '6px 12px', textAlign: 'right', color: '#767069' }}>{c.visitas}x</td>
                                <td style={{ padding: '6px 12px', textAlign: 'right', color: '#767069' }}>{c.ultima_visita || '—'}</td>
                                <td style={{ padding: '6px 12px', textAlign: 'right', color: '#1a1a1a', fontWeight: 600 }}>{rs(c.receita)}</td>
                                <td style={{ padding: '6px 12px', textAlign: 'right' }}><span style={{ background: pc.bg, color: pc.tx, borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{pc.lbl}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Parecer da IA com base na dependência real */}
                <button onClick={() => perguntarIA(`Análise de dependência do dia (dados reais do sistema, ano ${ano}): ao fechar as ${DIAS[diaFechar].toLowerCase()}s, o faturamento atual é ${rs(totDia)}. ${dep.exclusivos} clientes vêm SÓ neste dia (${dep.pct_exclusivos}% do total), representando ${rs(receitaRisco)} de receita REALMENTE em risco. ${dep.multidia} clientes também vêm em outros dias (${rs(receitaRecup)} recuperável). Migração estimada dos exclusivos: ${dep.migracao.alta} alta, ${dep.migracao.media} média, ${dep.migracao.baixa} baixa. Dê um parecer gerencial curto e um plano de migração desses ${dep.exclusivos} clientes exclusivos. Use SOMENTE esses números.`)} disabled={loadIA}
                  style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#5b4fcf,#f43f8e)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {loadIA ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Parecer da IA com base na dependência real
                </button>
              </>
            )}
          </div>
        )
      })()}

      {/* PERGUNTE À IA (parecer, não números) */}
      {dados && dados.length > 0 && (
        <div style={{ background: '#f0eefb', border: '1.5px solid #c4bef0', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#5b4fcf', marginBottom: 4 }}>
            <Sparkles size={15} /> Pergunte à IA
          </div>
          <p style={{ fontSize: 11, color: '#6b6860', margin: '0 0 10px' }}>A IA usa os números já calculados pelo sistema e responde só o parecer (não inventa valores).</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={pergunta} onChange={e => setPergunta(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') perguntarIA(pergunta) }}
              placeholder="ex: vale a pena abrir aos domingos? como atrair mais nas terças?" style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, color: '#1a1a1a' }} />
            <button onClick={() => perguntarIA(pergunta)} disabled={loadIA}
              style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#5b4fcf', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {loadIA ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Perguntar
            </button>
          </div>
          {(resposta || loadIA) && (
            <div style={{ background: '#fff', borderRadius: 10, padding: 14, marginTop: 12, whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, color: '#1a1a1a' }}>
              {resposta || 'Analisando...'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
