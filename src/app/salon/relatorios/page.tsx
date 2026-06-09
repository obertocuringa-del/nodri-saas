'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Upload, TrendingUp, TrendingDown, Minus, Calendar, FileSpreadsheet, ChevronUp, ChevronDown, ChevronsUpDown, Target, BarChart2, Settings } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── TIPOS ──────────────────────────────────────────────────────────────────
interface ResumoMensal { ano: number; mes: number; periodo: string; faturamento_total: number; ticket_medio: number; clientes_atendidos: number; clientes_novos: number; faturamento_servicos: number; faturamento_produtos: number }
interface FatDiario { ano: number; mes: number; data: string; dia_semana: string; valor: number }
interface ItemServico { ano: number; mes: number; servico: string; quantidade: number }
interface ItemProduto { ano: number; mes: number; produto: string; quantidade: number }
interface ProfPag { ano: number; mes: number; profissional: string; categoria: string; valor_a_pagar: number }
interface MetaRow { ano: number; mes: number; meta_faturamento: number; meta_clientes: number; meta_ticket: number; alcancado_faturamento: number; alcancado_clientes: number; alcancado_ticket: number }
interface Feedback { ano: number; mes: number; profissional: string; tipo: string; oque_houve: string; comentario: string; data: string }
interface ProfCadastrado { id: string; nome_completo: string; apelido?: string; cargo?: string }

// ─── RESOLVER NOME/APELIDO ──────────────────────────────────────────────────
// Normaliza string: maiúsculo, sem acento, sem espaço extra
function norm(s: string): string {
  return (s || '').toUpperCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}

// Resolve qualquer variação de nome/apelido para o nome_completo oficial
// Ex: "VERA" → "Vera Oliveira" | "VERA OLIVEIRA" → "Vera Oliveira" | "BELA" → "Kimberly Rodrigues Silva"
function resolverNome(nome: string, profs: ProfCadastrado[]): string {
  if (!nome || !profs.length) return nome
  const n = norm(nome)
  for (const p of profs) {
    const nomeN = norm(p.nome_completo)
    const apelidoN = norm(p.apelido || '')
    // Correspondência exata com nome completo ou apelido
    if (n === nomeN || (apelidoN && n === apelidoN)) return p.nome_completo
    // Nome do Excel contém o apelido (ex: "VERA OLIVEIRA" contém "VERA")
    if (apelidoN && n.includes(apelidoN) && apelidoN.length >= 3) return p.nome_completo
    // Apelido contém o nome do Excel
    if (apelidoN && apelidoN.includes(n) && n.length >= 3) return p.nome_completo
    // Nome completo começa com o que veio do Excel
    if (nomeN.startsWith(n) && n.length >= 4) return p.nome_completo
    // O que veio do Excel começa com o nome completo
    if (n.startsWith(nomeN) && nomeN.length >= 4) return p.nome_completo
  }
  return nome // sem correspondência — retorna original
}

interface DadosBase {
  resumo_mensal: ResumoMensal[]
  faturamento_diario: FatDiario[]
  servicos: ItemServico[]
  produtos: ItemProduto[]
  prof_pagamentos: ProfPag[]
  metas: MetaRow[]
  feedbacks: Feedback[]
  periodos: { ano: number; mes: number; data_inicio: string; data_fim: string }[]
}

interface ItemComp { nome: string; p1: number; p2: number; diff: number; pct: number }
interface ResumoPeriodo { fat_total: number; ticket: number; clientes: number; novos: number; fat_srv: number; fat_prd: number }

// ─── HELPERS ────────────────────────────────────────────────────────────────
const moeda = (v: number) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MESES_FULL = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const STORAGE_KEY = 'nodri_relatorios_v2'
const META_KEY = 'nodri_metas_config'

function calcPct(p1: number, p2: number) { return p2 === 0 ? (p1 > 0 ? 100 : 0) : ((p1 - p2) / p2) * 100 }

function corPct(p: number): { bg: string; text: string; border: string; Icon: any } {
  if (p >= 15) return { bg: '#10b98112', text: '#10b981', border: '#10b98130', Icon: TrendingUp }
  if (p >= 5)  return { bg: '#06b6d412', text: '#06b6d4', border: '#06b6d430', Icon: TrendingUp }
  if (p >= -5) return { bg: '#f59e0b12', text: '#f59e0b', border: '#f59e0b30', Icon: Minus }
  if (p >= -15)return { bg: '#f9731612', text: '#f97316', border: '#f9731630', Icon: TrendingDown }
  return { bg: '#ef444412', text: '#ef4444', border: '#ef444430', Icon: TrendingDown }
}

function Badge({ pct, p1, p2 }: { pct: number; p1: number; p2: number }) {
  const { text, bg, Icon } = corPct(pct)
  const isNovo = p2 === 0 && p1 > 0
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: text, background: bg, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {isNovo ? 'NOVO' : <><Icon size={10} />{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</>}
    </span>
  )
}

// Filtra resumo_mensal por período de datas (inclusive)
function filtrarResumo(dados: ResumoMensal[], de: string, ate: string): ResumoMensal[] {
  const [dY, dM] = de.split('-').map(Number)
  const [aY, aM] = ate.split('-').map(Number)
  return dados.filter(r => {
    const rVal = r.ano * 100 + r.mes
    return rVal >= dY * 100 + dM && rVal <= aY * 100 + aM
  })
}

function filtrarServicos(dados: ItemServico[], de: string, ate: string): ItemServico[] {
  const [dY, dM] = de.split('-').map(Number)
  const [aY, aM] = ate.split('-').map(Number)
  return dados.filter(r => {
    const v = r.ano * 100 + r.mes
    return v >= dY * 100 + dM && v <= aY * 100 + aM
  })
}

function filtrarProdutos(dados: ItemProduto[], de: string, ate: string): ItemProduto[] {
  const [dY, dM] = de.split('-').map(Number)
  const [aY, aM] = ate.split('-').map(Number)
  return dados.filter(r => {
    const v = r.ano * 100 + r.mes
    return v >= dY * 100 + dM && v <= aY * 100 + aM
  })
}

function somarResumo(rows: ResumoMensal[]): ResumoPeriodo {
  const base = rows.reduce((acc, r) => ({
    fat_total: acc.fat_total + r.faturamento_total,
    ticket: acc.ticket + r.ticket_medio,
    clientes: acc.clientes + r.clientes_atendidos,
    novos: acc.novos + r.clientes_novos,
    fat_srv: acc.fat_srv + r.faturamento_servicos,
    fat_prd: acc.fat_prd + r.faturamento_produtos,
  }), { fat_total: 0, ticket: 0, clientes: 0, novos: 0, fat_srv: 0, fat_prd: 0 })
  // CORREÇÃO 4: Faturamento Serviços = Total − Produtos (igual ao Python: fat_servicos = fat_geral - fat_produtos)
  const fat_prd_final = base.fat_prd
  const fat_srv_final = base.fat_srv > 0 ? base.fat_srv : base.fat_total - fat_prd_final
  return {
    ...base,
    ticket: rows.length > 0 ? base.ticket / rows.length : 0,
    fat_srv: fat_srv_final,
  }
}

function agruparItens(rows: { nome: string; qtd: number }[]): Map<string, number> {
  const map = new Map<string, number>()
  rows.forEach(r => { map.set(r.nome, (map.get(r.nome) || 0) + r.qtd) })
  return map
}

function buildComparativo(p1Map: Map<string, number>, p2Map: Map<string, number>, invertido = false): ItemComp[] {
  const nomes = new Set<string>([...Array.from(p1Map.keys()), ...Array.from(p2Map.keys())])
  const result: ItemComp[] = []
  nomes.forEach(nome => {
    const v1 = p1Map.get(nome) || 0
    const v2 = p2Map.get(nome) || 0
    // Modo personalizado: P2 − P1 (P2 é o período que queremos avaliar)
    // Modo automático:    P1 − P2 (P1 é o período atual vs P2 ano anterior)
    const diff = invertido ? v2 - v1 : v1 - v2
    const pct  = invertido ? calcPct(v2, v1) : calcPct(v1, v2)
    result.push({ nome, p1: v1, p2: v2, diff, pct })
  })
  return result
}

// ─── COMPONENTE TABELA COMPARATIVA ──────────────────────────────────────────
type SortKey = 'nome' | 'p1' | 'p2' | 'diff' | 'pct'

function TabelaComp({ title, items, label1, label2 }: { title: string; items: ItemComp[]; label1: string; label2: string }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'p1', dir: -1 })
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(30)

  const sorted = [...items]
    .filter(i => !busca || i.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => {
      const va = sort.key === 'nome' ? a.nome : a[sort.key]
      const vb = sort.key === 'nome' ? b.nome : b[sort.key]
      return sort.dir * (va < vb ? -1 : va > vb ? 1 : 0)
    })

  const exibidos = sorted.slice(0, limite)

  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th onClick={() => setSort(s => ({ key: k, dir: s.key === k ? (-s.dir as 1 | -1) : -1 }))}
      style={{ padding: '10px 12px', fontSize: 11, color: '#64748b', fontWeight: 600, textAlign: k === 'nome' ? 'left' : 'right', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', background: '#060d18', borderBottom: '1px solid #1e293b' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {children}
        {sort.key === k ? (sort.dir === -1 ? <ChevronDown size={11} /> : <ChevronUp size={11} />) : <ChevronsUpDown size={11} style={{ opacity: 0.3 }} />}
      </span>
    </th>
  )

  return (
    <div style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #1e293b' }}>
        <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, margin: 0, flex: 1 }}>{title}</h3>
        <span style={{ fontSize: 11, color: '#475569' }}>{sorted.length} itens</span>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="filtrar..."
          style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#e2e8f0', outline: 'none', width: 140 }} />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <Th k="nome">Item</Th>
              <Th k="p1">{label1}</Th>
              <Th k="p2">{label2}</Th>
              <Th k="diff">Diferença</Th>
              <Th k="pct">Variação</Th>
            </tr>
          </thead>
          <tbody>
            {exibidos.map((item, i) => {
              const { bg, text, border } = corPct(item.pct)
              return (
                <tr key={i} style={{ borderBottom: '1px solid #0d1520', background: i % 2 === 0 ? 'transparent' : '#060d1810' }}>
                  <td style={{ padding: '9px 12px', color: '#cbd5e1', fontWeight: 500, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.nome}>{item.nome}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: '#e2e8f0', fontWeight: 700 }}>{item.p1}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: '#64748b' }}>{item.p2}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: item.diff >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{item.diff > 0 ? '+' : ''}{item.diff}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}><Badge pct={item.pct} p1={item.p1} p2={item.p2} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {sorted.length > limite && (
        <div style={{ padding: '10px 16px', textAlign: 'center' }}>
          <button onClick={() => setLimite(l => l + 30)} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '6px 16px', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
            Ver mais ({sorted.length - limite} restantes)
          </button>
        </div>
      )}
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const [dados, setDados] = useState<DadosBase | null>(null)
  const [profsCadastrados, setProfsCadastrados] = useState<ProfCadastrado[]>([])
  const [aba, setAba] = useState<'geral' | 'metas' | 'profissionais' | 'feedbacks' | 'meta_prof'>('geral')
  const [loading, setLoading] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Modo de comparação: 'auto' = mesmo mês ano anterior | 'custom' = datas manuais
  const [modo, setModo] = useState<'auto' | 'custom'>('auto')

  // Período 1 (atual) — selecionado por mês/ano
  const [p1Mes, setP1Mes] = useState(new Date().getMonth() + 1)
  const [p1Ano, setP1Ano] = useState(new Date().getFullYear())

  // Período custom
  const [p1De, setP1De] = useState('')
  const [p1Ate, setP1Ate] = useState('')
  const [p2De, setP2De] = useState('')
  const [p2Ate, setP2Ate] = useState('')

  // Metas
  const [metaValor, setMetaValor] = useState('')
  const [metaTipo, setMetaTipo] = useState<'valor' | 'pct'>('valor')
  const [metaPct, setMetaPct] = useState('5')
  const [metaSalva, setMetaSalva] = useState(0)

  // Carregar dados — Supabase primeiro, localStorage como fallback
  useEffect(() => {
    async function carregarDados() {
      try {
        // 1. Tenta carregar do localStorage imediatamente (para resposta rápida)
        const cached = localStorage.getItem(STORAGE_KEY)
        if (cached) {
          const d = JSON.parse(cached) as DadosBase
          setDados(d)
          aplicarPeriodoMaisRecente(d)
        }

        // 2. Busca do Supabase (fonte de verdade) — paralelo
        const [resRel, resProfs] = await Promise.all([
          fetch('/api/relatorios'),
          fetch('/api/profissionais'),
        ])

        if (resProfs.ok) {
          const profs = await resProfs.json()
          if (Array.isArray(profs)) setProfsCadastrados(profs)
        }

        if (resRel.ok) {
          const d = await resRel.json() as DadosBase
          if (d.resumo_mensal?.length) {
            setDados(d)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
            aplicarPeriodoMaisRecente(d)
          }
        }
      } catch { }

      try {
        const m = localStorage.getItem(META_KEY)
        if (m) { const md = JSON.parse(m); setMetaSalva(md.valor || 0) }
      } catch { }
    }

    function aplicarPeriodoMaisRecente(d: DadosBase) {
      if (d.resumo_mensal?.length) {
        const ult = d.resumo_mensal.reduce((a, b) => (a.ano * 100 + a.mes > b.ano * 100 + b.mes ? a : b))
        setP1Mes(ult.mes); setP1Ano(ult.ano)
        const ym    = `${ult.ano}-${String(ult.mes).padStart(2, '0')}`
        const ymAnt = `${ult.ano - 1}-${String(ult.mes).padStart(2, '0')}`
        setP1De(ym + '-01');    setP1Ate(ym + '-31')
        setP2De(ymAnt + '-01'); setP2Ate(ymAnt + '-31')
      }
    }

    carregarDados()
  }, [])

  // ── Calcula último dia real do mês (sem 31 fixo) ──
  const ultimoDiaMes = (ano: number, mes: number): string => {
    // new Date(ano, mes, 0) = último dia do mês anterior = último dia de 'mes'
    const ultimo = new Date(ano, mes, 0).getDate()
    return String(ultimo).padStart(2, '0')
  }

  // Períodos derivados
  const periodoAuto1 = `${p1Ano}-${String(p1Mes).padStart(2, '0')}`
  const periodoAuto2 = `${p1Ano - 1}-${String(p1Mes).padStart(2, '0')}`

  const [de1, ate1] = modo === 'auto'
    ? [`${periodoAuto1}-01`, `${periodoAuto1}-${ultimoDiaMes(p1Ano, p1Mes)}`]
    : [p1De, p1Ate]
  const [de2, ate2] = modo === 'auto'
    ? [`${periodoAuto2}-01`, `${periodoAuto2}-${ultimoDiaMes(p1Ano - 1, p1Mes)}`]
    : [p2De, p2Ate]

  // Dados calculados
  const resumo1 = dados ? filtrarResumo(dados.resumo_mensal, de1, ate1) : []
  const resumo2 = dados ? filtrarResumo(dados.resumo_mensal, de2, ate2) : []
  const r1 = somarResumo(resumo1)
  const r2 = somarResumo(resumo2)

  const srv1 = dados ? filtrarServicos(dados.servicos, de1, ate1) : []
  const srv2 = dados ? filtrarServicos(dados.servicos, de2, ate2) : []
  const prd1 = dados ? filtrarProdutos(dados.produtos, de1, ate1) : []
  const prd2 = dados ? filtrarProdutos(dados.produtos, de2, ate2) : []

  const mapSrv1 = agruparItens(srv1.map(s => ({ nome: s.servico, qtd: s.quantidade })))
  const mapSrv2 = agruparItens(srv2.map(s => ({ nome: s.servico, qtd: s.quantidade })))
  const mapPrd1 = agruparItens(prd1.map(s => ({ nome: s.produto, qtd: s.quantidade })))
  const mapPrd2 = agruparItens(prd2.map(s => ({ nome: s.produto, qtd: s.quantidade })))

  // Modo personalizado inverte: P2−P1 (P2 é o período a avaliar)
  // Modo automático mantém: P1−P2 (P1 = atual, P2 = mesmo mês ano anterior)
  const invertirTabelas = modo === 'custom'
  const compSrv = buildComparativo(mapSrv1, mapSrv2, invertirTabelas)
  const compPrd = buildComparativo(mapPrd1, mapPrd2, invertirTabelas)

  const top10Cresc = [...compSrv, ...compPrd].filter(i => i.p2 > 0).sort((a, b) => b.pct - a.pct).slice(0, 10)
  const top10Queda = [...compSrv, ...compPrd].filter(i => i.p2 > 0).sort((a, b) => a.pct - b.pct).slice(0, 10)

  // ── METAS ──
  // P2 → dados do período ANTERIOR (usado para calcular pesos por dia da semana)
  const fatDiarioP2 = dados ? dados.faturamento_diario.filter(r => {
    const v = r.ano * 100 + r.mes
    const [dY, dM] = (de2 || '2000-01').split('-').map(Number)
    const [aY, aM] = (ate2 || '2000-01').split('-').map(Number)
    return v >= dY * 100 + dM && v <= aY * 100 + aM
  }) : []

  // P1 → dados do período ATUAL (usado para mostrar REALIZADO no calendário)
  const fatDiarioP1 = dados ? dados.faturamento_diario.filter(r => {
    const v = r.ano * 100 + r.mes
    const [dY, dM] = (de1 || '2000-01').split('-').map(Number)
    const [aY, aM] = (ate1 || '2000-01').split('-').map(Number)
    return v >= dY * 100 + dM && v <= aY * 100 + aM
  }) : []

  const realizado = r1.fat_total
  const metaTotal = (() => {
    if (metaSalva > 0) return metaSalva
    if (metaTipo === 'pct' && r2.fat_total > 0) return r2.fat_total * (1 + parseFloat(metaPct || '0') / 100)
    return parseFloat(metaValor.replace(',', '.')) || 0
  })()
  const progresso = metaTotal > 0 ? Math.min((realizado / metaTotal) * 100, 100) : 0
  // CORREÇÃO 1: Python usa × 1.3 (30% acima da meta), não 1.05
  const superMeta = metaTotal * 1.3
  const restante = Math.max(metaTotal - realizado, 0)

  const DIAS_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

  // Helper: normaliza data para dd/mm/yyyy
  const normalizarData = (data: string): string => {
    if (!data) return ''
    if (data.includes('-') && data.length === 10) {
      const [y, m, d] = data.split('-')
      return `${d}/${m}/${y}`
    }
    return data
  }

  // ── PESOS: calculados a partir do P2 (período anterior) ──
  const valoresPorDiaSemana = new Map<string, number[]>()
  fatDiarioP2.forEach(d => {
    const key = normalizarData(d.data)
    if (!key) return
    const [dd, mm, yyyy] = key.split('/')
    const dt = new Date(`${yyyy}-${mm}-${dd}T12:00:00`)
    const ds = DIAS_PT[dt.getDay()]
    const lista = valoresPorDiaSemana.get(ds) || []
    lista.push(d.valor)
    valoresPorDiaSemana.set(ds, lista)
  })

  const totalFatP2 = fatDiarioP2.reduce((s, d) => s + d.valor, 0)

  // média do dia da semana / total (exatamente como Python: np.mean(valores) / total_anterior)
  const pesoPorDiaSemana = new Map<string, number>()
  valoresPorDiaSemana.forEach((valores, ds) => {
    const media = valores.reduce((s, v) => s + v, 0) / valores.length
    pesoPorDiaSemana.set(ds, totalFatP2 > 0 ? media / totalFatP2 : 1 / 7)
  })

  // ── CALENDÁRIO: gerado com datas de P1 (período atual) ──
  // Realizado vem de P1
  const realizadoMapP1 = new Map<string, number>()
  fatDiarioP1.forEach(d => {
    const key = normalizarData(d.data)
    if (key) realizadoMapP1.set(key, d.valor)
  })

  // Gera TODOS os dias do período P1, do dia 1 ao último dia do mês (sem overflow)
  const todosDiasCalendario = (() => {
    if (!de1 || !ate1) return [] as Array<{ data: string; diaSemana: string; valor: number }>
    const result: Array<{ data: string; diaSemana: string; valor: number }> = []
    const start = new Date(de1 + 'T12:00:00')
    const end   = new Date(ate1 + 'T12:00:00')
    const cur   = new Date(start)
    // Limitar ao mesmo mês de início (evita overflow)
    const mesInicio = start.getMonth()
    const anoInicio = start.getFullYear()
    while (cur <= end && (cur.getMonth() === mesInicio || cur.getFullYear() === anoInicio)) {
      if (cur.getMonth() !== mesInicio) break  // sai ao mudar de mês
      const dd   = String(cur.getDate()).padStart(2, '0')
      const mm   = String(cur.getMonth() + 1).padStart(2, '0')
      const yyyy = String(cur.getFullYear())
      const key  = `${dd}/${mm}/${yyyy}`
      const diaSemana = DIAS_PT[cur.getDay()]
      const valor = realizadoMapP1.get(key) ?? 0
      result.push({ data: key, diaSemana, valor })
      cur.setDate(cur.getDate() + 1)
    }
    return result
  })()

  const hoje = new Date()
  hoje.setHours(23, 59, 59, 0)

  // ── META por dia: distribui restante pelos dias futuros com peso ──
  // (mesmo algoritmo do Python calcular_metas_periodo_atual)
  const getMetaDia = (dataStr: string, diaSemana: string): number => {
    if (!metaTotal || !totalFatP2) return 0
    const [dd, mm, yyyy] = dataStr.split('/')
    const dt = new Date(`${yyyy}-${mm}-${dd}T12:00:00`)
    if (dt <= hoje) return 0  // dia passado ou realizado — sem necessidade

    // Dias futuros do calendário P1
    const diasFuturos = todosDiasCalendario.filter(d => {
      const [dd2, mm2, yyyy2] = d.data.split('/')
      return new Date(`${yyyy2}-${mm2}-${dd2}T12:00:00`) > hoje
    })

    // Agrupa dias futuros por dia da semana e conta ocorrências
    const contagemFuturo = new Map<string, number>()
    diasFuturos.forEach(d => {
      contagemFuturo.set(d.diaSemana, (contagemFuturo.get(d.diaSemana) || 0) + 1)
    })

    // Peso total dos dias restantes
    let pesoTotalRestante = 0
    contagemFuturo.forEach((_, ds) => {
      pesoTotalRestante += (pesoPorDiaSemana.get(ds) || 1 / 7)
    })
    if (pesoTotalRestante === 0) return 0

    const pesoDia = pesoPorDiaSemana.get(diaSemana) || 1 / 7
    const countDiaSemana = contagemFuturo.get(diaSemana) || 1
    const valorParaEsteDiaSemana = restante * (pesoDia / pesoTotalRestante)
    return valorParaEsteDiaSemana / countDiaSemana
  }

  const diasTotais = todosDiasCalendario.length

  // Labels dos períodos
  const label1 = modo === 'auto'
    ? `${MESES_FULL[p1Mes]}/${p1Ano}`
    : (p1De ? `${p1De.split('-').reverse().join('/')} a ${p1Ate.split('-').reverse().join('/')}` : 'Período 1')
  const label2 = modo === 'auto'
    ? `${MESES_FULL[p1Mes]}/${p1Ano - 1}`
    : (p2De ? `${p2De.split('-').reverse().join('/')} a ${p2Ate.split('-').reverse().join('/')}` : 'Período 2')

  // ── IMPORTAR EXCEL ──
  async function importarExcel(file: File) {
    setLoading(true)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'buffer' })

      const parseSheet = (name: string): any[] => {
        const ws = wb.Sheets[name]
        if (!ws) return []
        return XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[]
      }

      const rmRaw = parseSheet('RESUMO_MENSAL')
      const fdRaw = parseSheet('FATURAMENTO_DIARIO')
      const srvRaw = parseSheet('SERVICOS')
      const prdRaw = parseSheet('PRODUTOS')
      const ppRaw = parseSheet('PROF_PAGAMENTOS')
      const mtRaw = parseSheet('METAS')
      const fbRaw = parseSheet('FEEDBACK')
      const perRaw = parseSheet('PERIODOS')

      // Detectar período do arquivo para merge inteligente
      const novosPeriodos = Array.from(new Set(rmRaw.map((r: any) => `${r.ano}-${r.mes}`))).map((p: any) => {
        const [a, m] = p.split('-')
        return { ano: Number(a), mes: Number(m) }
      })

      // Carregar dados existentes
      let base: DadosBase = { resumo_mensal: [], faturamento_diario: [], servicos: [], produtos: [], prof_pagamentos: [], metas: [], feedbacks: [], periodos: [] }
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) base = JSON.parse(saved)
      } catch { }

      // Remover registros dos períodos que serão sobrescritos
      const filtrarFora = (arr: any[]) => arr.filter((r: any) => !novosPeriodos.some(p => p.ano === Number(r.ano) && p.mes === Number(r.mes)))

      const novo: DadosBase = {
        resumo_mensal: [...filtrarFora(base.resumo_mensal), ...rmRaw.map((r: any) => ({ ano: +r.ano, mes: +r.mes, periodo: r.periodo || '', faturamento_total: +r.faturamento_total || 0, ticket_medio: +r.ticket_medio || 0, clientes_atendidos: +r.clientes_atendidos || 0, clientes_novos: +r.clientes_novos || 0, faturamento_servicos: +r.faturamento_servicos || 0, faturamento_produtos: +r.faturamento_produtos || 0 }))],
        faturamento_diario: [...filtrarFora(base.faturamento_diario), ...fdRaw.map((r: any) => ({ ano: +r.ano, mes: +r.mes, data: String(r.data || ''), dia_semana: String(r.dia_semana || ''), valor: +r.valor || 0 }))],
        servicos: [...filtrarFora(base.servicos), ...srvRaw.map((r: any) => ({ ano: +r.ano, mes: +r.mes, servico: String(r.servico || '').toUpperCase().trim(), quantidade: +r.quantidade || 0 }))],
        produtos: [...filtrarFora(base.produtos), ...prdRaw.map((r: any) => ({ ano: +r.ano, mes: +r.mes, produto: String(r.produto || '').toUpperCase().trim(), quantidade: +r.quantidade || 0 }))],
        prof_pagamentos: [...filtrarFora(base.prof_pagamentos), ...ppRaw.map((r: any) => ({ ano: +r.ano, mes: +r.mes, profissional: String(r.profissional || ''), categoria: String(r.categoria || ''), valor_a_pagar: +r.valor_a_pagar || 0 }))],
        metas: [...filtrarFora(base.metas), ...mtRaw.map((r: any) => ({ ano: +r.ano, mes: +r.mes, meta_faturamento: +r.meta_faturamento || 0, meta_clientes: +r.meta_clientes || 0, meta_ticket: +r.meta_ticket || 0, alcancado_faturamento: +r.alcancado_faturamento || 0, alcancado_clientes: +r.alcancado_clientes || 0, alcancado_ticket: +r.alcancado_ticket || 0 }))],
        feedbacks: [...base.feedbacks.filter((f: any) => !fbRaw.some((nr: any) => nr.data === f.data && nr.profissional === f.profissional)), ...fbRaw.map((r: any) => ({ ano: +r.ano || 0, mes: +r.mes || 0, profissional: String(r.profissional || ''), tipo: String(r.tipo || ''), oque_houve: String(r.oque_houve || ''), comentario: String(r.comentario || ''), data: String(r.data || '') }))],
        periodos: [...base.periodos.filter((p: any) => !novosPeriodos.some(n => n.ano === p.ano && n.mes === p.mes)), ...perRaw.map((r: any) => ({ ano: +r.ano, mes: +r.mes, data_inicio: String(r.data_inicio || ''), data_fim: String(r.data_fim || '') }))],
      }

      // ── Salvar no Supabase (fonte de verdade) ──
      // Monta array de períodos para enviar à API
      const periodos_dados = novosPeriodos.map(p => ({
        ano:  p.ano,
        mes:  p.mes,
        data_inicio: perRaw.find((r: any) => +r.ano === p.ano && +r.mes === p.mes)?.data_inicio || '',
        data_fim:    perRaw.find((r: any) => +r.ano === p.ano && +r.mes === p.mes)?.data_fim    || '',
        resumo_mensal:      novo.resumo_mensal.filter(r => r.ano === p.ano && r.mes === p.mes),
        faturamento_diario: novo.faturamento_diario.filter(r => r.ano === p.ano && r.mes === p.mes),
        servicos:           novo.servicos.filter(r => r.ano === p.ano && r.mes === p.mes),
        produtos:           novo.produtos.filter(r => r.ano === p.ano && r.mes === p.mes),
        prof_pagamentos:    novo.prof_pagamentos.filter(r => r.ano === p.ano && r.mes === p.mes),
        metas:              novo.metas.filter(r => r.ano === p.ano && r.mes === p.mes),
      }))

      const apiRes = await fetch('/api/relatorios/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodos_dados, feedbacks: novo.feedbacks }),
      })

      if (!apiRes.ok) {
        const err = await apiRes.json()
        console.error('Erro ao salvar no Supabase:', err)
        toast.error('Dados importados localmente, mas erro ao salvar no servidor.')
      }

      // ── Atualizar localStorage como cache ──
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novo))
      setDados(novo)

      const ult = novo.resumo_mensal.length ? novo.resumo_mensal.reduce((a, b) => (a.ano * 100 + a.mes > b.ano * 100 + b.mes ? a : b)) : null
      if (ult) { setP1Mes(ult.mes); setP1Ano(ult.ano) }

      setShowImport(false)
      toast.success(`${novosPeriodos.map(p => `${MESES_FULL[p.mes]}/${p.ano}`).join(', ')} importado e salvo no banco! ${srvRaw.length} serviços, ${prdRaw.length} produtos.`)
    } catch (e: any) {
      console.error(e)
      toast.error('Erro ao importar. Verifique se é o base_dados_nodri.xlsx correto.')
    } finally { setLoading(false) }
  }

  function salvarMeta() {
    const val = metaTipo === 'pct' ? r2.fat_total * (1 + parseFloat(metaPct || '0') / 100) : parseFloat(metaValor.replace(',', '.')) || 0
    localStorage.setItem(META_KEY, JSON.stringify({ valor: val, tipo: metaTipo }))
    setMetaSalva(val)
    toast.success(`Meta salva: ${moeda(val)}`)
  }

  // Anos disponíveis para o seletor
  const anosDisp = dados ? Array.from(new Set(dados.resumo_mensal.map(r => r.ano))).sort((a, b) => b - a) : [new Date().getFullYear()]
  const mesesDisp = dados ? Array.from(new Set(dados.resumo_mensal.filter(r => r.ano === p1Ano).map(r => r.mes))).sort((a, b) => a - b) : []

  // ── RENDER ──
  const semDados = !dados

  return (
    <div style={{ minHeight: '100vh', background: '#020817', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#e2e8f0' }}>

      {/* ── TOP BAR ── */}
      <div style={{ background: '#0a0f1a', borderBottom: '1px solid #1e293b', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 20, overflowX: 'auto', flexWrap: 'wrap' }}>
        <a href="/salon" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={15} /> Voltar
        </a>
        <span style={{ color: '#1e293b' }}>|</span>
        <BarChart2 size={16} color="#7c5cfc" />
        <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14 }}>Relatórios Gerenciais</span>

        {dados && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

            {/* Modo de comparação */}
            <div style={{ display: 'flex', background: '#111827', borderRadius: 7, border: '1px solid #1e293b', padding: 2, gap: 2 }}>
              {(['auto', 'custom'] as const).map(m => (
                <button key={m} onClick={() => setModo(m)} style={{ padding: '4px 12px', borderRadius: 5, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: modo === m ? '#7c5cfc' : 'transparent', color: modo === m ? 'white' : '#64748b' }}>
                  {m === 'auto' ? 'Automático' : 'Personalizado'}
                </button>
              ))}
            </div>

            {modo === 'auto' ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select value={p1Mes} onChange={e => setP1Mes(+e.target.value)} style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, color: '#e2e8f0', padding: '5px 8px', fontSize: 12, outline: 'none' }}>
                  {(mesesDisp.length ? mesesDisp : Array.from({ length: 12 }, (_, i) => i + 1)).map(m => <option key={m} value={m}>{MESES_FULL[m]}</option>)}
                </select>
                <select value={p1Ano} onChange={e => setP1Ano(+e.target.value)} style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, color: '#e2e8f0', padding: '5px 8px', fontSize: 12, outline: 'none' }}>
                  {anosDisp.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <span style={{ fontSize: 11, color: '#475569' }}>vs {MESES[p1Mes]}/{p1Ano - 1}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: '#7c5cfc', fontWeight: 700 }}>P1</span>
                  <input type="date" value={p1De} onChange={e => setP1De(e.target.value)} style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, color: '#e2e8f0', padding: '4px 6px', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 10, color: '#475569' }}>a</span>
                  <input type="date" value={p1Ate} onChange={e => setP1Ate(e.target.value)} style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, color: '#e2e8f0', padding: '4px 6px', fontSize: 11, outline: 'none' }} />
                </div>
                <span style={{ fontSize: 11, color: '#334155' }}>vs</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, color: '#06b6d4', fontWeight: 700 }}>P2</span>
                  <input type="date" value={p2De} onChange={e => setP2De(e.target.value)} style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, color: '#e2e8f0', padding: '4px 6px', fontSize: 11, outline: 'none' }} />
                  <span style={{ fontSize: 10, color: '#475569' }}>a</span>
                  <input type="date" value={p2Ate} onChange={e => setP2Ate(e.target.value)} style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, color: '#e2e8f0', padding: '4px 6px', fontSize: 11, outline: 'none' }} />
                </div>
              </div>
            )}

            <button onClick={() => setShowImport(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '5px 12px', color: '#7c5cfc', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              <Upload size={13} /> Importar
            </button>
          </div>
        )}
      </div>

      {/* SEM DADOS */}
      {semDados && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ maxWidth: 440, textAlign: 'center' }}>
            <FileSpreadsheet size={56} style={{ margin: '0 auto 16px', display: 'block', color: '#7c5cfc' }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>Importe seus Dados</h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>
              Faça upload do <strong style={{ color: '#94a3b8' }}>base_dados_nodri.xlsx</strong> gerado pelo sistema Nodri para visualizar os relatórios completos.
            </p>
            <button onClick={() => setShowImport(true)} style={{ background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)', color: 'white', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Upload size={16} /> Importar Planilha
            </button>
            <p style={{ color: '#334155', fontSize: 11, marginTop: 10 }}>Dados salvos localmente no navegador. A importação é por período — não apaga outros meses.</p>
          </div>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      {dados && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* ABAS */}
          <div style={{ padding: '12px 20px 0', display: 'flex', gap: 4, borderBottom: '1px solid #1e293b' }}>
            {([['geral', 'Geral'], ['metas', 'Metas'], ['meta_prof', 'Meta Prof.']] as const).map(([id, lbl]) => (
              <button key={id} onClick={() => setAba(id as any)}
                style={{ padding: '8px 18px', border: 'none', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: aba === id ? '#0a0f1a' : 'transparent', color: aba === id ? '#e2e8f0' : '#475569', borderBottom: aba === id ? '2px solid #7c5cfc' : '2px solid transparent', marginBottom: -1 }}>
                {lbl}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', padding: '6px 0', fontSize: 11, color: '#334155', alignSelf: 'center' }}>
              <span style={{ color: '#7c5cfc', fontWeight: 600 }}>{label1}</span>
              <span style={{ margin: '0 6px' }}>vs</span>
              <span style={{ color: '#06b6d4', fontWeight: 600 }}>{label2}</span>
            </div>
          </div>

          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>

            {/* ════════ ABA GERAL ════════ */}
            {aba === 'geral' && (
              <div>
                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {[
                    { lbl: 'Faturamento Total', v1: r1.fat_total, v2: r2.fat_total, fmt: moeda, ico: '' },
                    { lbl: 'Ticket Médio', v1: r1.ticket, v2: r2.ticket, fmt: moeda, ico: '' },
                    { lbl: 'Clientes Atendidos', v1: r1.clientes, v2: r2.clientes, fmt: (v: number) => v.toLocaleString('pt-BR'), ico: '' },
                    { lbl: 'Clientes Novos', v1: r1.novos, v2: r2.novos, fmt: (v: number) => v.toLocaleString('pt-BR'), ico: '' },
                    { lbl: 'Fat. Serviços', v1: r1.fat_srv, v2: r2.fat_srv, fmt: moeda, ico: '' },
                    { lbl: 'Fat. Produtos', v1: r1.fat_prd, v2: r2.fat_prd, fmt: moeda, ico: '' },
                  ].map(card => {
                    const p = calcPct(card.v1, card.v2)
                    const { bg, text, border, Icon } = corPct(p)
                    return (
                      <div key={card.lbl} style={{ background: '#0a0f1a', border: `1px solid ${border}`, borderLeft: `3px solid ${text}`, borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{card.ico} {card.lbl}</span>
                          {r2.fat_total > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: text, background: bg, padding: '1px 6px', borderRadius: 20 }}><Icon size={10} />{p > 0 ? '+' : ''}{p.toFixed(1)}%</span>}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginBottom: 2 }}>{card.fmt(card.v1)}</div>
                        {r2.fat_total > 0 && <div style={{ fontSize: 11, color: '#334155' }}>Ant: {card.fmt(card.v2)}</div>}
                      </div>
                    )
                  })}
                </div>

                {/* TOP 10 crescimento e queda lado a lado */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: '#0a0f1a', border: '1px solid #10b98130', borderRadius: 12, padding: 16 }}>
                    <h3 style={{ color: '#10b981', fontSize: 13, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={14} /> Top 10 Maiores Crescimentos</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {top10Cresc.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, color: '#334155', width: 16, flexShrink: 0 }}>#{i + 1}</span>
                          <span style={{ flex: 1, fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.nome}>{item.nome}</span>
                          <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 700, flexShrink: 0 }}>{item.p1}</span>
                          <Badge pct={item.pct} p1={item.p1} p2={item.p2} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: '#0a0f1a', border: '1px solid #ef444430', borderRadius: 12, padding: 16 }}>
                    <h3 style={{ color: '#ef4444', fontSize: 13, fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><TrendingDown size={14} /> Top 10 Maiores Quedas</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {top10Queda.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, color: '#334155', width: 16, flexShrink: 0 }}>#{i + 1}</span>
                          <span style={{ flex: 1, fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.nome}>{item.nome}</span>
                          <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 700, flexShrink: 0 }}>{item.p1}</span>
                          <Badge pct={item.pct} p1={item.p1} p2={item.p2} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tabelas completas */}
                <TabelaComp title="Serviços Vendidos" items={compSrv} label1={label1} label2={label2} />
                <TabelaComp title="Produtos Vendidos" items={compPrd} label1={label1} label2={label2} />
              </div>
            )}

            {/* ════════ ABA METAS ════════ */}
            {aba === 'metas' && (
              <div>
                {/* Configuração da meta */}
                <div style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                  <h3 style={{ color: '#7c5cfc', fontSize: 14, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}><Settings size={15} /> Configurar Meta</h3>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', background: '#111827', borderRadius: 7, border: '1px solid #1e293b', padding: 2, gap: 2 }}>
                      <button onClick={() => setMetaTipo('valor')} style={{ padding: '5px 14px', borderRadius: 5, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: metaTipo === 'valor' ? '#7c5cfc' : 'transparent', color: metaTipo === 'valor' ? 'white' : '#64748b' }}>Valor fixo</button>
                      <button onClick={() => setMetaTipo('pct')} style={{ padding: '5px 14px', borderRadius: 5, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: metaTipo === 'pct' ? '#7c5cfc' : 'transparent', color: metaTipo === 'pct' ? 'white' : '#64748b' }}>% sobre ano anterior</button>
                    </div>
                    {metaTipo === 'valor' ? (
                      <input value={metaValor} onChange={e => setMetaValor(e.target.value)} placeholder="Ex: 250000"
                        style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, padding: '6px 12px', fontSize: 13, color: '#e2e8f0', outline: 'none', width: 160 }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input value={metaPct} onChange={e => setMetaPct(e.target.value)} placeholder="5"
                          style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 6, padding: '6px 12px', fontSize: 13, color: '#e2e8f0', outline: 'none', width: 80 }} />
                        <span style={{ color: '#64748b', fontSize: 13 }}>% acima de {moeda(r2.fat_total)} = <strong style={{ color: '#7c5cfc' }}>{moeda(r2.fat_total * (1 + parseFloat(metaPct || '0') / 100))}</strong></span>
                      </div>
                    )}
                    <button onClick={salvarMeta} style={{ background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)', color: 'white', border: 'none', borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      Salvar Meta
                    </button>
                  </div>
                </div>

                {/* KPIs de metas */}
                {metaTotal > 0 ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
                      {[
                        { lbl: 'Meta Total', val: moeda(metaTotal), cor: '#7c5cfc' },
                        { lbl: 'Realizado', val: moeda(realizado), cor: '#10b981' },
                        { lbl: 'Restante', val: moeda(restante), cor: restante > 0 ? '#f59e0b' : '#10b981' },
                        { lbl: 'Progresso', val: `${progresso.toFixed(1)}%`, cor: progresso >= 100 ? '#10b981' : progresso >= 80 ? '#06b6d4' : '#f59e0b' },
                        { lbl: 'Super Meta (+30%)', val: moeda(superMeta), cor: '#f43f8e' },
                        { lbl: 'vs Ano Anterior', val: `${calcPct(realizado, r2.fat_total) > 0 ? '+' : ''}${calcPct(realizado, r2.fat_total).toFixed(1)}%`, cor: calcPct(realizado, r2.fat_total) >= 0 ? '#10b981' : '#ef4444' },
                      ].map(card => (
                        <div key={card.lbl} style={{ background: '#0a0f1a', border: `1px solid ${card.cor}30`, borderLeft: `3px solid ${card.cor}`, borderRadius: 10, padding: '14px 16px' }}>
                          <div style={{ fontSize: 11, color: '#475569', marginBottom: 6, fontWeight: 600 }}>{card.lbl}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: card.cor }}>{card.val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Barra de progresso */}
                    <div style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Progresso da Meta</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: progresso >= 100 ? '#10b981' : '#7c5cfc' }}>{progresso.toFixed(1)}%</span>
                      </div>
                      <div style={{ height: 12, background: '#1e293b', borderRadius: 20, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progresso}%`, background: progresso >= 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #7c5cfc, #f43f8e)', borderRadius: 20, transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#475569' }}>
                        <span>{moeda(realizado)} realizado</span>
                        <span>Meta: {moeda(metaTotal)}</span>
                      </div>
                    </div>

                    {/* Tabela comparativo histórico */}
                    <div style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                      <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>Comparativo Histórico</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <tbody>
                          {[
                            { lbl: 'Ano anterior', val: moeda(r2.fat_total), cor: '#64748b' },
                            { lbl: 'Atual', val: moeda(realizado), cor: '#e2e8f0' },
                            { lbl: 'Diferença', val: `${realizado - r2.fat_total >= 0 ? '+' : ''}${moeda(realizado - r2.fat_total)}`, cor: realizado >= r2.fat_total ? '#10b981' : '#ef4444' },
                            { lbl: 'Variação', val: `${calcPct(realizado, r2.fat_total) > 0 ? '+' : ''}${calcPct(realizado, r2.fat_total).toFixed(2)}%`, cor: calcPct(realizado, r2.fat_total) >= 0 ? '#10b981' : '#ef4444' },
                            { lbl: 'Meta definida', val: moeda(metaTotal), cor: '#7c5cfc' },
                            { lbl: 'Super Meta (+5%)', val: moeda(superMeta), cor: '#f43f8e' },
                          ].map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                              <td style={{ padding: '10px 0', color: '#475569', fontWeight: 500 }}>{row.lbl}</td>
                              <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 700, color: row.cor, fontSize: 15 }}>{row.val}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Calendário — período ATUAL (P1) com REALIZADO; META calculada por pesos do P2 */}
                    {todosDiasCalendario.length > 0 && (
                      <div style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
                        <h3 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>FATURAMENTO DIÁRIO E METAS — {label1.toUpperCase()}</h3>
                        <p style={{ color: '#475569', fontSize: 11, margin: '0 0 16px' }}>Período atual. META e SUPER META calculadas por peso do dia da semana com base em {label2}.</p>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
                            <thead>
                              <tr style={{ background: '#060d18' }}>
                                {[
                                  { lbl: 'Data',             align: 'left'  },
                                  { lbl: 'Dia da Semana',    align: 'left'  },
                                  { lbl: 'Necessidade Base', align: 'right' },
                                  { lbl: 'Status',           align: 'center'},
                                  { lbl: 'Realizado',        align: 'right' },
                                  { lbl: 'META',             align: 'right' },
                                  { lbl: 'SUPER META',       align: 'right' },
                                ].map(h => (
                                  <th key={h.lbl} style={{ padding: '9px 12px', textAlign: h.align as any, color: '#64748b', fontWeight: 700, fontSize: 11, borderBottom: '2px solid #1e293b', whiteSpace: 'nowrap' }}>{h.lbl}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {todosDiasCalendario.map((d, i) => {
                                // META: calculada pelos pesos do P2, aplicada nos dias FUTUROS do P1
                                const metaDia      = getMetaDia(d.data, d.diaSemana)
                                // SUPER META = × 1.3 (igual ao Python linha 3407)
                                const superMetaDia = metaDia > 0 ? metaDia * 1.3 : 0
                                // Status com todos os 4 estados do Python
                                const [dd2, mm2, yyyy2] = d.data.split('/')
                                const dataDia  = new Date(`${yyyy2}-${mm2}-${dd2}T12:00:00`)
                                const isHoje   = dataDia.toDateString() === new Date().toDateString()
                                const isFuturo = dataDia > hoje
                                let status: string; let statusCor: string; let statusBg: string
                                if (d.valor > 0) {
                                  status = 'REALIZADO';     statusCor = '#10b981'; statusBg = '#10b98115'
                                } else if (isHoje) {
                                  status = 'HOJE';          statusCor = '#3b82f6'; statusBg = '#3b82f615'
                                } else if (isFuturo) {
                                  status = 'FUTURO';        statusCor = '#94a3b8'; statusBg = '#94a3b810'
                                } else {
                                  status = 'NAO REALIZADO'; statusCor = '#ef4444'; statusBg = '#ef444415'
                                }
                                return (
                                  <tr key={i} style={{ borderBottom: '1px solid #0d1520', background: i % 2 === 0 ? 'transparent' : '#060d1808' }}>
                                    <td style={{ padding: '8px 12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{d.data}</td>
                                    <td style={{ padding: '8px 12px', color: '#64748b',  whiteSpace: 'nowrap' }}>{d.diaSemana}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#334155' }}>{moeda(metaDia)}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', background: statusBg, color: statusCor }}>{status}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: d.valor > 0 ? '#10b981' : '#334155', fontWeight: 700 }}>{moeda(d.valor)}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: metaDia > 0 ? '#3b82f6' : '#334155', fontWeight: metaDia > 0 ? 700 : 400 }}>{moeda(metaDia)}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: superMetaDia > 0 ? '#ef4444' : '#334155', fontWeight: superMetaDia > 0 ? 700 : 400 }}>{moeda(superMetaDia)}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        <p style={{ color: '#334155', fontSize: 11, marginTop: 12, padding: '10px 0 0', borderTop: '1px solid #1e293b' }}>
                          <strong style={{ color: '#475569' }}>Nota:</strong> As metas diárias são calculadas respeitando o peso de cada dia da semana com base no histórico do período anterior. A SUPER META é calculada automaticamente como 5% acima da META.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
                    <Target size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: 14 }}>Configure uma meta acima para ver o painel completo.</p>
                  </div>
                )}
              </div>
            )}

            {/* ════════ ABA META PROFISSIONAIS ════════ */}
            {aba === 'meta_prof' && (() => {
              const MESES_PT_FULL = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

              // 1. Carrega meta total do localStorage
              let metaTotalProf = 0
              let metaAviso = ''
              try {
                const m = localStorage.getItem(META_KEY)
                if (m) {
                  const md = JSON.parse(m)
                  // md.valor já é sempre o valor final calculado (seja fixo ou % sobre ano anterior)
                  metaTotalProf = md.valor || 0
                }
              } catch { }
              if (metaTotalProf === 0) metaAviso = 'Meta total não configurada. Configure na aba Metas.'

              // 2. Profissionais ativos via profsCadastrados (já carregado)
              const profsAtivos = profsCadastrados.filter(p => p.nome_completo)
              const totalProfsAtivos = profsAtivos.length || 1

              // 3. Todos os períodos disponíveis (para média histórica)
              const periodosFat: { ano: number; mes: number; fat: number }[] = []
              dados.resumo_mensal.forEach(rm => {
                periodosFat.push({ ano: rm.ano, mes: rm.mes, fat: rm.faturamento_total })
              })

              // Período de referência — apenas para o badge "já bateu"
              let periodoRef: { ano: number; mes: number; fat: number } | null = null
              let metaBatida = false
              if (metaTotalProf > 0 && periodosFat.length > 0) {
                const acima = periodosFat.filter(p => p.fat >= metaTotalProf)
                if (acima.length > 0) {
                  periodoRef = acima.reduce((a, b) => (a.ano * 100 + a.mes > b.ano * 100 + b.mes ? a : b))
                  metaBatida = true
                } else {
                  periodoRef = periodosFat.reduce((a, b) => a.fat > b.fat ? a : b)
                }
              } else if (periodosFat.length > 0) {
                periodoRef = periodosFat.reduce((a, b) => a.fat > b.fat ? a : b)
              }

              // 4. Média histórica de comissão por profissional (TODOS os meses)
              // Ratio histórico: comissões totais / faturamento bruto total (para converter meta bruta → meta comissão)
              const totalFatHistorico = periodosFat.reduce((s, p) => s + p.fat, 0) || 1
              const totalComissoesHistorico = dados.prof_pagamentos.reduce((s, p) => s + p.valor_a_pagar, 0)
              const ratioComissoes = totalComissoesHistorico / totalFatHistorico
              const metaEmComissoes = metaTotalProf > 0
                ? metaTotalProf * ratioComissoes
                : totalComissoesHistorico / (periodosFat.length || 1)

              // 5. prof_pagamentos do período selecionado (p1Ano/p1Mes)
              const ppAtual = dados.prof_pagamentos.filter(p => p.ano === p1Ano && p.mes === p1Mes)

              // Helper de match de nome
              function matchNome(pNorm: string, apelido: string, nome: string) {
                return pNorm === apelido || pNorm === nome ||
                  (apelido.length >= 3 && pNorm.includes(apelido)) ||
                  (apelido.length >= 3 && apelido.includes(pNorm))
              }

              // 6. Calcula média mensal histórica de comissão por profissional ativo
              // Usa TODOS os meses disponíveis, não apenas o período de referência
              const mediaHistoricaMap = new Map<string, number>() // profId → média mensal comissão
              const mesesComDados = new Set(dados.prof_pagamentos.map(p => `${p.ano}-${p.mes}`)).size || 1

              profsAtivos.forEach(prof => {
                const ap = norm(prof.apelido || prof.nome_completo)
                const nm = norm(prof.nome_completo)
                const matches = dados.prof_pagamentos.filter(p => matchNome(norm(p.profissional), ap, nm) && p.valor_a_pagar > 0)
                if (matches.length > 0) {
                  // Soma total dividido pelo número de meses em que ele apareceu
                  const mesesAtivos = new Set(matches.map(p => `${p.ano}-${p.mes}`)).size
                  const somaComissoes = matches.reduce((s, p) => s + p.valor_a_pagar, 0)
                  mediaHistoricaMap.set(prof.id, somaComissoes / mesesAtivos)
                }
              })

              // Pico histórico por profissional: maior valor_a_pagar em um único mês
              const picoHistoricoMap = new Map<string, { valor: number; ano: number; mes: number }>()
              profsAtivos.forEach(prof => {
                const ap = norm(prof.apelido || prof.nome_completo)
                const nm = norm(prof.nome_completo)
                const matches = dados.prof_pagamentos.filter(p => matchNome(norm(p.profissional), ap, nm) && p.valor_a_pagar > 0)
                if (matches.length > 0) {
                  const pico = matches.reduce((a, b) => a.valor_a_pagar > b.valor_a_pagar ? a : b)
                  picoHistoricoMap.set(prof.id, { valor: pico.valor_a_pagar, ano: pico.ano, mes: pico.mes })
                }
              })

              // Média histórica por cargo (para profissionais sem histórico)
              const mediaCargoPorHistorico = new Map<string, number>()
              // Pico por cargo: maior pico individual dentro da categoria
              const picoCargoPorHistorico = new Map<string, { valor: number; ano: number; mes: number }>()
              const cargosTodos = [...new Set(profsAtivos.map(p => norm(p.cargo || '')))]
              cargosTodos.forEach(cargo => {
                if (!cargo) return
                const vals: number[] = []
                let picoCargo: { valor: number; ano: number; mes: number } | null = null
                profsAtivos.forEach(prof => {
                  if (norm(prof.cargo || '') !== cargo) return
                  const val = mediaHistoricaMap.get(prof.id)
                  if (val !== undefined && val > 0) vals.push(val)
                  const pico = picoHistoricoMap.get(prof.id)
                  if (pico && (!picoCargo || pico.valor > picoCargo.valor)) picoCargo = pico
                })
                if (vals.length > 0) mediaCargoPorHistorico.set(cargo, vals.reduce((s, v) => s + v, 0) / vals.length)
                if (picoCargo) picoCargoPorHistorico.set(cargo, picoCargo)
              })
              const mediaGeralHistorica = mediaHistoricaMap.size > 0
                ? [...mediaHistoricaMap.values()].reduce((s, v) => s + v, 0) / mediaHistoricaMap.size
                : metaEmComissoes / (profsAtivos.length || 1)

              // Profissionais que estavam no período de referência (para badge)
              const profsNoPeriodoRef = new Set<string>()
              if (periodoRef) {
                const ppRef = dados.prof_pagamentos.filter(p => p.ano === periodoRef!.ano && p.mes === periodoRef!.mes && p.valor_a_pagar > 0)
                profsAtivos.forEach(prof => {
                  const ap = norm(prof.apelido || prof.nome_completo)
                  const nm = norm(prof.nome_completo)
                  if (ppRef.find(p => matchNome(norm(p.profissional), ap, nm))) profsNoPeriodoRef.add(prof.id)
                })
              }

              const periodoRefLabel = periodoRef ? `${MESES_PT_FULL[periodoRef.mes]}/${periodoRef.ano}` : '—'

              // 7. Monta resultado com média histórica como peso
              interface MetaProf { prof: ProfCadastrado; peso: number; meta: number; realizado: number; fonte: string; estavaRef: boolean; pico: { valor: number; ano: number; mes: number } | null; picoLabel: string }
              const resultado: MetaProf[] = profsAtivos.map(prof => {
                const apelidoProf = norm(prof.apelido || prof.nome_completo)
                const nomeProf = norm(prof.nome_completo)
                const cargo = norm(prof.cargo || '')

                let mediaProf = 0
                let fonte = ''
                let pico: { valor: number; ano: number; mes: number } | null = null
                let picoLabel = ''
                const estavaRef = profsNoPeriodoRef.has(prof.id)

                if (mediaHistoricaMap.has(prof.id)) {
                  mediaProf = mediaHistoricaMap.get(prof.id)!
                  const mesesProf = new Set(dados.prof_pagamentos.filter(p => matchNome(norm(p.profissional), apelidoProf, nomeProf) && p.valor_a_pagar > 0).map(p => `${p.ano}-${p.mes}`)).size
                  fonte = `Média de ${mesesProf} mês${mesesProf !== 1 ? 'es' : ''} histórico${mesesProf !== 1 ? 's' : ''}`
                  pico = picoHistoricoMap.get(prof.id) || null
                  if (pico) picoLabel = `Seu maior faturamento foi ${moeda(pico.valor)} em ${MESES_PT_FULL[pico.mes]}/${pico.ano}`
                } else if (mediaCargoPorHistorico.has(cargo)) {
                  mediaProf = mediaCargoPorHistorico.get(cargo)!
                  fonte = `Média histórica de ${prof.cargo || 'categoria'}`
                  pico = picoCargoPorHistorico.get(cargo) || null
                  if (pico) picoLabel = `Maior média de ${prof.cargo || 'categoria'} foi ${moeda(pico.valor)} em ${MESES_PT_FULL[pico.mes]}/${pico.ano}`
                } else {
                  mediaProf = mediaGeralHistorica
                  fonte = 'Média histórica geral'
                }

                // Realizado no período selecionado
                const ppProfAtual = ppAtual.find(p => matchNome(norm(p.profissional), apelidoProf, nomeProf))
                const realizado2 = ppProfAtual?.valor_a_pagar || 0

                return { prof, peso: mediaProf, meta: 0, realizado: realizado2, fonte, estavaRef, pico, picoLabel }
              })

              // 8. Normaliza e aplica metaEmComissoes
              const somaPesos = resultado.reduce((s, r) => s + r.peso, 0)
              resultado.forEach(r => {
                const proporcao = somaPesos > 0 ? r.peso / somaPesos : 1 / totalProfsAtivos
                r.meta = metaEmComissoes * proporcao
              })

              // 9. Ordena por meta decrescente
              resultado.sort((a, b) => b.meta - a.meta)
              const somaMetasIndividuais = resultado.reduce((s, r) => s + r.meta, 0)

              return (
                <div>
                  {/* Card header com meta total e período de referência */}
                  <div style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 4 }}>META TOTAL DO SALÃO (BRUTO)</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#7c5cfc' }}>{metaTotalProf > 0 ? moeda(metaTotalProf) : '—'}</div>
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>Meta em comissão: {moeda(metaEmComissoes)} · Base: média histórica de todos os meses</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, marginBottom: 4 }}>PERÍODO DE REFERÊNCIA</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{periodoRefLabel}</div>
                      </div>
                      <div style={{ marginLeft: 'auto' }}>
                        {metaTotalProf > 0 && periodoRef && (
                          metaBatida ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#10b98120', border: '1px solid #10b98140', color: '#10b981', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20 }}>
                              Meta já foi batida em {periodoRefLabel}
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f59e0b20', border: '1px solid #f59e0b40', color: '#f59e0b', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20 }}>
                              Meta nunca batida — mais próximo: {periodoRefLabel}
                            </span>
                          )
                        )}
                        {metaAviso && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ef444420', border: '1px solid #ef444440', color: '#ef4444', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20 }}>
                            {metaAviso}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tabela de metas por profissional */}
                  <div style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#060d18' }}>
                          {['PROFISSIONAL', 'CARGO', 'META', 'REALIZADO', '%'].map((h, hi) => (
                            <th key={h} style={{ padding: '12px 16px', fontSize: 11, color: '#64748b', fontWeight: 700, textAlign: hi >= 2 ? 'right' : 'left', borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.flatMap((r, i) => {
                          const pct = r.meta > 0 ? Math.min((r.realizado / r.meta) * 100, 100) : 0
                          const barCor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
                          const nomeMostra = r.prof.apelido || r.prof.nome_completo
                          const rows: any[] = []
                          rows.push(
                            <tr key={`row-${i}`} style={{ borderBottom: (r.estavaRef || r.fonte) ? 'none' : '1px solid #0d1520', background: i % 2 === 0 ? 'transparent' : '#060d1808' }}>
                              <td style={{ padding: '10px 16px', color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                                    {(nomeMostra[0] || '?').toUpperCase()}
                                  </div>
                                  {nomeMostra.toUpperCase()}
                                </div>
                              </td>
                              <td style={{ padding: '10px 16px', color: '#64748b', fontSize: 12 }}>{r.prof.cargo || '—'}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: '#7c5cfc', fontWeight: 700 }}>{moeda(r.meta)}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', color: r.realizado > 0 ? '#10b981' : '#334155', fontWeight: r.realizado > 0 ? 700 : 400 }}>{moeda(r.realizado)}</td>
                              <td style={{ padding: '10px 16px', textAlign: 'right', minWidth: 120 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                                  <span style={{ color: barCor, fontWeight: 700, fontSize: 13, minWidth: 38, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                                  <div style={{ width: 60, height: 6, background: '#1e293b', borderRadius: 10, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: barCor, borderRadius: 10, transition: 'width 0.4s ease' }} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )
                          if (r.estavaRef || r.fonte || r.picoLabel) {
                            rows.push(
                              <tr key={`badge-${i}`} style={{ borderBottom: '1px solid #0d1520', background: i % 2 === 0 ? 'transparent' : '#060d1808' }}>
                                <td colSpan={5} style={{ padding: '2px 16px 8px 56px', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                  {r.estavaRef && periodoRef && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: metaBatida ? '#10b981' : '#f59e0b', background: metaBatida ? '#10b98115' : '#f59e0b15', border: `1px solid ${metaBatida ? '#10b98130' : '#f59e0b30'}`, padding: '2px 8px', borderRadius: 20 }}>
                                      {metaBatida ? `Voce ja bateu em ${periodoRefLabel}` : `Mais proximo: ${periodoRefLabel}`}
                                    </span>
                                  )}
                                  {r.fonte && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#06b6d4', background: '#06b6d415', border: '1px solid #06b6d430', padding: '2px 8px', borderRadius: 20 }}>
                                      {r.fonte}
                                    </span>
                                  )}
                                  {r.picoLabel && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#a78bfa', background: '#a78bfa15', border: '1px solid #a78bfa30', padding: '2px 8px', borderRadius: 20 }}>
                                      {r.picoLabel}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          }
                          return rows
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Rodapé */}
                  <div style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Soma das metas individuais:</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#7c5cfc' }}>{moeda(somaMetasIndividuais)}</span>
                    {metaEmComissoes > 0 && Math.abs(somaMetasIndividuais - metaEmComissoes) > 1 && (
                      <span style={{ fontSize: 11, color: '#f59e0b', marginLeft: 8 }}>(diferença de {moeda(Math.abs(somaMetasIndividuais - metaEmComissoes))} por arredondamento)</span>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* ════════ ABA PROFISSIONAIS ════════ */}
            {aba === 'profissionais' && (() => {
              // Agrupa por nome oficial (resolve nome/apelido → mesmo profissional)
              const profMap = new Map<string, { nome: string; categoria: string; valor: number }>()
              dados.prof_pagamentos
                .filter(p => { const v = p.ano * 100 + p.mes; return v >= +de1.slice(0,4)*100 + +de1.slice(5,7) && v <= +ate1.slice(0,4)*100 + +ate1.slice(5,7) })
                .forEach(p => {
                  const nomeOficial = resolverNome(p.profissional, profsCadastrados)
                  const ex = profMap.get(nomeOficial)
                  if (ex) ex.valor += p.valor_a_pagar
                  else profMap.set(nomeOficial, { nome: nomeOficial, categoria: p.categoria, valor: p.valor_a_pagar })
                })
              const lista = Array.from(profMap.values()).sort((a, b) => b.valor - a.valor)
              return (
                <div>
                  {lista.map((p, i) => (
                    <div key={i} style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{(p.nome[0] || '?').toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>{p.nome}</div>
                        <div style={{ color: '#475569', fontSize: 11 }}>{p.categoria}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#10b981', fontWeight: 800, fontSize: 15 }}>{moeda(p.valor)}</div>
                        <div style={{ color: '#475569', fontSize: 10 }}>a pagar</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* ════════ ABA FEEDBACKS ════════ */}
            {aba === 'feedbacks' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[['POSITIVO', '#10b981'], ['NEGATIVO', '#ef4444']].map(([tipo, cor]) => {
                  // Resolve nome/apelido nos feedbacks
                  const items = dados.feedbacks
                    .filter(f => f.tipo?.toUpperCase() === tipo)
                    .map(f => ({ ...f, profissional: resolverNome(f.profissional, profsCadastrados) }))
                  return (
                    <div key={tipo}>
                      <h3 style={{ color: cor, fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{tipo} ({items.length})</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 600, overflowY: 'auto' }}>
                        {items.slice(0, 60).map((f, i) => (
                          <div key={i} style={{ background: '#0a0f1a', border: `1px solid ${cor}25`, borderLeft: `3px solid ${cor}`, borderRadius: 8, padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ color: cor, fontSize: 12, fontWeight: 600 }}>{f.profissional}</span>
                              <span style={{ color: '#334155', fontSize: 10 }}>{f.data}</span>
                            </div>
                            <div style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600, marginBottom: 3 }}>{f.oque_houve}</div>
                            {f.comentario && <div style={{ color: '#64748b', fontSize: 11, lineHeight: 1.5, fontStyle: 'italic' }}>"{f.comentario}"</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── MODAL IMPORTAR ── */}
      {showImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, margin: 0 }}>Importar Planilha</h2>
              <button onClick={() => setShowImport(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
              Selecione o <strong style={{ color: '#94a3b8' }}>base_dados_nodri.xlsx</strong>. Os dados do período importado <strong style={{ color: '#7c5cfc' }}>substituirão apenas aquele período</strong> — outros meses não são afetados.
            </p>
            <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #1e293b', borderRadius: 10, padding: 32, textAlign: 'center', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#7c5cfc')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}>
              <Upload size={32} style={{ margin: '0 auto 10px', display: 'block', color: '#7c5cfc' }} />
              <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Clique para selecionar</p>
              <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>base_dados_nodri.xlsx</p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) importarExcel(f) }} />
            {loading && <p style={{ color: '#7c5cfc', textAlign: 'center', marginTop: 16, fontSize: 13 }}>Processando planilha...</p>}
          </div>
        </div>
      )}
    </div>
  )
}
