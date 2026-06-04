'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Upload, BarChart2, Users, TrendingUp, TrendingDown, Minus, Star, MessageSquare, Calendar, ChevronDown, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── tipos ─────────────────────────────────────────────────────────────────
interface ResumoMensal {
  ano: number; mes: number; periodo: string
  faturamento_total: number; ticket_medio: number
  clientes_atendidos: number; clientes_novos: number
  faturamento_servicos: number; faturamento_produtos: number
}
interface ItemComparativo { nome: string; atual: number; anterior: number }
interface Feedback { profissional: string; tipo: string; oque_houve: string; comentario: string; data: string }
interface ProfPagamento { profissional: string; categoria: string; valor_a_pagar: number }
interface TaxaRetorno { total_clientes: number; clientes_retornaram: number; taxa_retorno: number }

interface DadosImportados {
  resumo_mensal: ResumoMensal[]
  servicos: ItemComparativo[]
  produtos: ItemComparativo[]
  feedbacks: Feedback[]
  prof_pagamentos: ProfPagamento[]
  taxa_retorno_salao: TaxaRetorno[]
  periodos: { ano: number; mes: number; data_inicio: string; data_fim: string }[]
}

// ─── helpers ───────────────────────────────────────────────────────────────
const moeda = (v: number) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const pct = (atual: number, ant: number) => ant === 0 ? (atual > 0 ? 100 : 0) : ((atual - ant) / ant) * 100
const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const STORAGE_KEY = 'nodri_relatorios_data'

function crescClass(p: number) {
  if (p >= 15) return { bg: '#10b98115', border: '#10b98140', text: '#10b981', icon: <TrendingUp size={14} /> }
  if (p >= 5) return { bg: '#06b6d415', border: '#06b6d440', text: '#06b6d4', icon: <TrendingUp size={14} /> }
  if (p >= -5) return { bg: '#f59e0b15', border: '#f59e0b40', text: '#f59e0b', icon: <Minus size={14} /> }
  if (p >= -15) return { bg: '#f9731615', border: '#f9731640', text: '#f97316', icon: <TrendingDown size={14} /> }
  return { bg: '#ef444415', border: '#ef444440', text: '#ef4444', icon: <TrendingDown size={14} /> }
}

// ─── componente ────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const [dados, setDados] = useState<DadosImportados | null>(null)
  const [periodoAtual, setPeriodoAtual] = useState<{ ano: number; mes: number } | null>(null)
  const [aba, setAba] = useState<'geral' | 'profissionais' | 'feedbacks'>('geral')
  const [loading, setLoading] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [buscaProf, setBuscaProf] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Carregar dados do localStorage ao montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as DadosImportados
        setDados(parsed)
        // selecionar período mais recente
        if (parsed.resumo_mensal?.length) {
          const ultimo = parsed.resumo_mensal[parsed.resumo_mensal.length - 1]
          setPeriodoAtual({ ano: ultimo.ano, mes: ultimo.mes })
        }
      }
    } catch { }
  }, [])

  async function importarExcel(file: File) {
    setLoading(true)
    try {
      // Carregar SheetJS dinamicamente (pacote npm)
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'buffer' })

      function parseSheet(name: string) {
        const ws = wb.Sheets[name]
        if (!ws) return []
        return XLSX.utils.sheet_to_json(ws, { defval: '' })
      }

      const rmRaw = parseSheet('RESUMO_MENSAL') as any[]
      const srvRaw = parseSheet('SERVICOS') as any[]
      const prdRaw = parseSheet('PRODUTOS') as any[]
      const fbRaw = parseSheet('FEEDBACK') as any[]
      const ppRaw = parseSheet('PROF_PAGAMENTOS') as any[]
      const trRaw = parseSheet('TAXA_RETORNO_SALAO') as any[]
      const perRaw = parseSheet('PERIODOS') as any[]

      // Mapear RESUMO_MENSAL — pode ter 2+ períodos (atual + anterior)
      const resumo: ResumoMensal[] = rmRaw.map((r: any) => ({
        ano: Number(r.ano || 0), mes: Number(r.mes || 0),
        periodo: String(r.periodo || ''),
        faturamento_total: Number(r.faturamento_total || 0),
        ticket_medio: Number(r.ticket_medio || 0),
        clientes_atendidos: Number(r.clientes_atendidos || 0),
        clientes_novos: Number(r.clientes_novos || 0),
        faturamento_servicos: Number(r.faturamento_servicos || 0),
        faturamento_produtos: Number(r.faturamento_produtos || 0),
      }))

      // Agrupar serviços por período (atual = último, anterior = penúltimo período)
      const anosOrd = [...new Set(rmRaw.map((r: any) => `${r.ano}-${r.mes}`))].sort()
      const periAtual = anosOrd[anosOrd.length - 1]
      const periAnt = anosOrd[anosOrd.length - 2] || ''

      function buildComparativo(raw: any[], nomeKey: string, qtdKey: string): ItemComparativo[] {
        const map = new Map<string, { atual: number; anterior: number }>()
        raw.forEach((r: any) => {
          const chave = `${r.ano}-${r.mes}`
          const nome = String(r[nomeKey] || '').toUpperCase().trim()
          if (!nome) return
          const qtd = Number(r[qtdKey] || 0)
          if (!map.has(nome)) map.set(nome, { atual: 0, anterior: 0 })
          const entry = map.get(nome)!
          if (chave === periAtual) entry.atual += qtd
          else if (chave === periAnt) entry.anterior += qtd
        })
        return [...map.entries()]
          .map(([nome, v]) => ({ nome, ...v }))
          .sort((a, b) => b.atual - a.atual)
      }

      const servicos = buildComparativo(srvRaw, 'servico', 'quantidade')
      const produtos = buildComparativo(prdRaw, 'produto', 'quantidade')

      const feedbacks: Feedback[] = fbRaw.map((r: any) => ({
        profissional: String(r.profissional || ''),
        tipo: String(r.tipo || ''),
        oque_houve: String(r.oque_houve || ''),
        comentario: String(r.comentario || ''),
        data: String(r.data || ''),
      }))

      const profPagamentos: ProfPagamento[] = ppRaw.map((r: any) => ({
        profissional: String(r.profissional || ''),
        categoria: String(r.categoria || ''),
        valor_a_pagar: Number(r.valor_a_pagar || 0),
      }))

      const taxaRetorno: TaxaRetorno[] = trRaw.map((r: any) => ({
        total_clientes: Number(r.total_clientes || 0),
        clientes_retornaram: Number(r.clientes_retornaram || 0),
        taxa_retorno: Number(r.taxa_retorno || 0),
      }))

      const periodos = perRaw.map((r: any) => ({
        ano: Number(r.ano || 0), mes: Number(r.mes || 0),
        data_inicio: String(r.data_inicio || ''), data_fim: String(r.data_fim || ''),
      }))

      const importados: DadosImportados = { resumo_mensal: resumo, servicos, produtos, feedbacks, prof_pagamentos: profPagamentos, taxa_retorno_salao: taxaRetorno, periodos }

      // Salvar no localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(importados))
      setDados(importados)

      if (resumo.length) {
        const ult = resumo[resumo.length - 1]
        setPeriodoAtual({ ano: ult.ano, mes: ult.mes })
      }

      setShowImport(false)
      toast.success(`✅ Dados importados! ${resumo.length} período(s), ${servicos.length} serviços, ${feedbacks.length} feedbacks.`)
    } catch (e: any) {
      console.error(e)
      toast.error('Erro ao importar planilha. Verifique se é o arquivo base_dados_nodri.xlsx correto.')
    } finally { setLoading(false) }
  }

  // ─── dados derivados ────────────────────────────────────────────────────
  const resumoAtual = dados?.resumo_mensal?.find(r => r.ano === periodoAtual?.ano && r.mes === periodoAtual?.mes)
  const todos = dados?.resumo_mensal || []
  const idxAtual = todos.findIndex(r => r.ano === periodoAtual?.ano && r.mes === periodoAtual?.mes)
  const resumoAnt = idxAtual > 0 ? todos[idxAtual - 1] : null

  const taxa = dados?.taxa_retorno_salao?.[0]

  const profAtual = dados?.prof_pagamentos?.filter(p => {
    // filtra pelo período atual aproximado — como não temos ano/mes na tabela simplificada, usa todos
    return true
  }).sort((a, b) => b.valor_a_pagar - a.valor_a_pagar) || []

  const feedsPositivos = (dados?.feedbacks || []).filter(f => f.tipo?.toUpperCase() === 'POSITIVO')
  const feedsNegativos = (dados?.feedbacks || []).filter(f => f.tipo?.toUpperCase() === 'NEGATIVO')

  const profFiltrados = profAtual.filter(p => p.profissional.toLowerCase().includes(buscaProf.toLowerCase()))

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', fontFamily: 'Segoe UI, sans-serif' }}>

      {/* TOP BAR */}
      <div style={{ background: '#0d1117', borderBottom: '1px solid #1e293b', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/salon" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>
          <ArrowLeft size={15} /> Voltar
        </a>
        <span style={{ color: '#1e293b' }}>|</span>
        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '14px' }}>📊 Relatórios</span>

        {/* Seletor de período */}
        {dados && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={14} color="#7c5cfc" />
            <select value={`${periodoAtual?.ano}-${periodoAtual?.mes}`}
              onChange={e => { const [a, m] = e.target.value.split('-'); setPeriodoAtual({ ano: +a, mes: +m }) }}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', padding: '5px 10px', fontSize: '12px', outline: 'none' }}>
              {todos.map(r => <option key={`${r.ano}-${r.mes}`} value={`${r.ano}-${r.mes}`}>{MESES[r.mes]}/{r.ano}</option>)}
            </select>
            <button onClick={() => setShowImport(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '5px 12px', color: '#7c5cfc', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
              <Upload size={13} /> Importar
            </button>
          </div>
        )}
      </div>

      {/* SEM DADOS — TELA DE BOAS VINDAS */}
      {!dados && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ maxWidth: '480px', textAlign: 'center' }}>
            <FileSpreadsheet size={64} style={{ margin: '0 auto 20px', display: 'block' }} color="#7c5cfc" />
            <h2 style={{ color: '#e2e8f0', fontSize: '22px', fontWeight: 700, margin: '0 0 12px' }}>Importe sua Planilha de Dados</h2>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.7, margin: '0 0 24px' }}>
              Faça o upload do arquivo <strong style={{ color: '#94a3b8' }}>base_dados_nodri.xlsx</strong> gerado pelo sistema Nodri para visualizar os relatórios completos do seu salão.
            </p>
            <button onClick={() => setShowImport(true)}
              style={{ background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)', color: 'white', border: 'none', borderRadius: '10px', padding: '14px 32px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={18} /> Importar Planilha
            </button>
            <p style={{ color: '#475569', fontSize: '11px', marginTop: '12px' }}>Os dados ficam salvos localmente no seu navegador.</p>
          </div>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      {dados && resumoAtual && (
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>

          {/* HEADER PERÍODO */}
          <div style={{ background: 'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)', borderRadius: '12px', padding: '20px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #ff9a00, #ff5e00, #ff0066)' }} />
            <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 700, margin: '0 0 6px' }}>SISTEMA NODRI</h1>
            <p style={{ color: '#e6e6fa', fontSize: '13px', margin: 0 }}>
              📊 Período: <strong>{MESES[resumoAtual.mes]}/{resumoAtual.ano}</strong>
              {resumoAnt && <> &nbsp;|&nbsp; Comparado com: <strong>{MESES[resumoAnt.mes]}/{resumoAnt.ano}</strong></>}
            </p>
          </div>

          {/* ABAS */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#0d1117', borderRadius: '10px', padding: '4px', width: 'fit-content', border: '1px solid #1e293b' }}>
            {(['geral', 'profissionais', 'feedbacks'] as const).map(a => (
              <button key={a} onClick={() => setAba(a)}
                style={{ padding: '8px 20px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: aba === a ? 'linear-gradient(135deg, #7c5cfc, #f43f8e)' : 'transparent', color: aba === a ? 'white' : '#64748b' }}>
                {a === 'geral' ? '📈 Geral' : a === 'profissionais' ? '👥 Profissionais' : '⭐ Feedbacks'}
              </button>
            ))}
          </div>

          {/* ── ABA GERAL ── */}
          {aba === 'geral' && (
            <div>
              {/* CARDS COMPARATIVO */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {[
                  { label: 'Faturamento Total', atual: resumoAtual.faturamento_total, ant: resumoAnt?.faturamento_total || 0, fmt: moeda, icon: '💰' },
                  { label: 'Ticket Médio', atual: resumoAtual.ticket_medio, ant: resumoAnt?.ticket_medio || 0, fmt: moeda, icon: '🎟️' },
                  { label: 'Clientes Atendidos', atual: resumoAtual.clientes_atendidos, ant: resumoAnt?.clientes_atendidos || 0, fmt: (v: number) => v.toString(), icon: '👥' },
                  { label: 'Clientes Novos', atual: resumoAtual.clientes_novos, ant: resumoAnt?.clientes_novos || 0, fmt: (v: number) => v.toString(), icon: '🆕' },
                  { label: 'Fat. Serviços', atual: resumoAtual.faturamento_servicos, ant: resumoAnt?.faturamento_servicos || 0, fmt: moeda, icon: '✂️' },
                  { label: 'Fat. Produtos', atual: resumoAtual.faturamento_produtos, ant: resumoAnt?.faturamento_produtos || 0, fmt: moeda, icon: '📦' },
                ].map(card => {
                  const p = resumoAnt ? pct(card.atual, card.ant) : 0
                  const c = crescClass(p)
                  return (
                    <div key={card.label} style={{ background: '#0d1117', border: `1px solid ${c.border}`, borderLeft: `4px solid ${c.text}`, borderRadius: '10px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{card.icon} {card.label}</span>
                        {resumoAnt && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: 700, color: c.text, background: c.bg, padding: '2px 8px', borderRadius: '20px' }}>{c.icon} {p > 0 ? '+' : ''}{p.toFixed(1)}%</span>}
                      </div>
                      <div style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800 }}>{card.fmt(card.atual)}</div>
                      {resumoAnt && <div style={{ color: '#475569', fontSize: '11px', marginTop: '4px' }}>Ant: {card.fmt(card.ant)}</div>}
                    </div>
                  )
                })}
              </div>

              {/* TAXA DE RETORNO */}
              {taxa && (
                <div style={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: `conic-gradient(#7c5cfc ${taxa.taxa_retorno * 3.6}deg, #1e293b 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c5cfc', fontSize: '12px', fontWeight: 800 }}>{taxa.taxa_retorno.toFixed(0)}%</div>
                  </div>
                  <div>
                    <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '15px' }}>Taxa de Retorno de Clientes</div>
                    <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>{taxa.clientes_retornaram} de {taxa.total_clientes} clientes retornaram</div>
                  </div>
                </div>
              )}

              {/* SERVIÇOS */}
              <div style={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <h3 style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 700, margin: '0 0 16px', paddingBottom: '10px', borderBottom: '2px solid #26d0ce' }}>✂️ Serviços Vendidos</h3>
                <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dados.servicos.slice(0, 30).map((s, i) => {
                    const p = pct(s.atual, s.anterior); const c = crescClass(p)
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`, borderLeft: `4px solid ${c.text}`, borderRadius: '8px', gap: '12px' }}>
                        <span style={{ color: '#475569', fontSize: '11px', width: '20px', flexShrink: 0 }}>#{i + 1}</span>
                        <span style={{ flex: 1, color: '#e2e8f0', fontSize: '13px', fontWeight: 600 }}>{s.nome}</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '14px' }}>{s.atual}</span>
                        {s.anterior > 0 && <span style={{ color: '#475569', fontSize: '11px' }}>ant: {s.anterior}</span>}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, color: c.text, background: '#00000040', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                          {c.icon} {s.anterior === 0 && s.atual > 0 ? 'NOVO' : `${p > 0 ? '+' : ''}${p.toFixed(1)}%`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* PRODUTOS */}
              <div style={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
                <h3 style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 700, margin: '0 0 16px', paddingBottom: '10px', borderBottom: '2px solid #26d0ce' }}>📦 Produtos Vendidos</h3>
                <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dados.produtos.slice(0, 20).map((p, i) => {
                    const pc = pct(p.atual, p.anterior); const c = crescClass(pc)
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', background: c.bg, border: `1px solid ${c.border}`, borderLeft: `4px solid ${c.text}`, borderRadius: '8px', gap: '12px' }}>
                        <span style={{ color: '#475569', fontSize: '11px', width: '20px', flexShrink: 0 }}>#{i + 1}</span>
                        <span style={{ flex: 1, color: '#e2e8f0', fontSize: '13px', fontWeight: 600 }}>{p.nome}</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '14px' }}>{p.atual}</span>
                        {p.anterior > 0 && <span style={{ color: '#475569', fontSize: '11px' }}>ant: {p.anterior}</span>}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 700, color: c.text, background: '#00000040', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                          {c.icon} {p.anterior === 0 && p.atual > 0 ? 'NOVO' : `${pc > 0 ? '+' : ''}${pc.toFixed(1)}%`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── ABA PROFISSIONAIS ── */}
          {aba === 'profissionais' && (
            <div>
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <input value={buscaProf} onChange={e => setBuscaProf(e.target.value)} placeholder="🔍 Buscar profissional..."
                  style={{ width: '100%', background: '#0d1117', border: '1px solid #1e293b', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#e2e8f0', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profFiltrados.map((p, i) => (
                  <div key={i} style={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                      {(p.profissional[0] || '?').toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '14px' }}>{p.profissional}</div>
                      <div style={{ color: '#7c5cfc', fontSize: '11px', marginTop: '2px' }}>{p.categoria || 'Profissional'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#10b981', fontWeight: 800, fontSize: '16px' }}>{moeda(p.valor_a_pagar)}</div>
                      <div style={{ color: '#475569', fontSize: '10px' }}>a pagar</div>
                    </div>
                  </div>
                ))}
                {profFiltrados.length === 0 && <p style={{ color: '#475569', textAlign: 'center', padding: '40px' }}>Nenhum profissional encontrado</p>}
              </div>
            </div>
          )}

          {/* ── ABA FEEDBACKS ── */}
          {aba === 'feedbacks' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* POSITIVOS */}
                <div>
                  <h3 style={{ color: '#10b981', fontSize: '14px', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={16} /> Positivos ({feedsPositivos.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
                    {feedsPositivos.slice(0, 50).map((f, i) => (
                      <div key={i} style={{ background: '#10b98110', border: '1px solid #10b98130', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600 }}>{f.profissional}</span>
                          <span style={{ color: '#475569', fontSize: '10px' }}>{f.data}</span>
                        </div>
                        <div style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>{f.oque_houve}</div>
                        {f.comentario && <div style={{ color: '#94a3b8', fontSize: '11px', lineHeight: 1.5, fontStyle: 'italic' }}>"{f.comentario}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
                {/* NEGATIVOS */}
                <div>
                  <h3 style={{ color: '#ef4444', fontSize: '14px', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={16} /> Negativos ({feedsNegativos.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
                    {feedsNegativos.slice(0, 50).map((f, i) => (
                      <div key={i} style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>{f.profissional}</span>
                          <span style={{ color: '#475569', fontSize: '10px' }}>{f.data}</span>
                        </div>
                        <div style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>{f.oque_houve}</div>
                        {f.comentario && <div style={{ color: '#94a3b8', fontSize: '11px', lineHeight: 1.5, fontStyle: 'italic' }}>"{f.comentario}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL IMPORTAR */}
      {showImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }}>
          <div style={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 700, margin: 0 }}>📥 Importar Planilha</h2>
              <button onClick={() => setShowImport(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>
              Selecione o arquivo <strong style={{ color: '#94a3b8' }}>base_dados_nodri.xlsx</strong>. Os dados do período serão importados e sobreporão apenas aquele período.
            </p>
            <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #334155', borderRadius: '10px', padding: '32px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#7c5cfc')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#334155')}>
              <Upload size={32} style={{ margin: '0 auto 10px', display: 'block', color: '#7c5cfc' }} />
              <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>Clique para selecionar</p>
              <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>base_dados_nodri.xlsx</p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) importarExcel(f) }} />
            {loading && <p style={{ color: '#7c5cfc', textAlign: 'center', marginTop: '16px', fontSize: '13px' }}>⏳ Processando planilha...</p>}
          </div>
        </div>
      )}
    </div>
  )
}
