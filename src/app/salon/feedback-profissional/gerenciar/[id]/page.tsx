'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Search, Trash2, Edit2, Check, X, ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import toast from 'react-hot-toast'

interface Resposta {
  id: string
  profissional_nome: string
  tipo: 'positivo' | 'negativo' | 'acompanhamento'
  ocorrido_descricao: string
  descricao: string | null
  criado_em: string
}

interface Editando {
  id: string
  profissional_nome: string
  tipo: 'positivo' | 'negativo' | 'acompanhamento'
  ocorrido_descricao: string
  descricao: string
}

export default function GerenciarFeedbacksPage() {
  const params = useParams()
  const router = useRouter()
  const formulario_id = params?.id as string

  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [busca, setBusca] = useState('')
  const [buscaInput, setBuscaInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Editando | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [profissionais, setProfissionais] = useState<string[]>([])
  const [ocorridos, setOcorridos] = useState<string[]>([])
  // Filtros: meses (YYYY-MM) e ocorrência; e resumo por categoria
  const [mesesSel, setMesesSel] = useState<string[]>([])
  const [ocorridoSel, setOcorridoSel] = useState('')
  const [showResumo, setShowResumo] = useState(false)
  const [resumo, setResumo] = useState<any | null>(null)
  const [loadResumo, setLoadResumo] = useState(false)

  const LIMIT = 50
  const totalPages = Math.ceil(total / LIMIT)

  const MES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const ultimosMeses = (() => {
    const arr: string[] = []
    const hoje = new Date()
    for (let i = 0; i < 24; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return arr
  })()
  const labelMes = (ym: string) => { const [y, m] = ym.split('-'); return `${MES_ABREV[Number(m) - 1]}/${y.slice(2)}` }
  function toggleMes(ym: string) {
    setMesesSel(prev => prev.includes(ym) ? prev.filter(x => x !== ym) : [...prev, ym])
    setPage(1)
  }

  const fetchRespostas = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ formulario_id, page: String(page), busca })
    if (ocorridoSel) qs.set('ocorrido', ocorridoSel)
    if (mesesSel.length) qs.set('meses', mesesSel.join(','))
    const res = await fetch(`/api/feedback-prof/respostas?${qs}`)
    if (res.ok) {
      const d = await res.json()
      setRespostas(d.respostas)
      setTotal(d.total)
    }
    setLoading(false)
  }, [formulario_id, page, busca, ocorridoSel, mesesSel])

  const fetchResumo = useCallback(async () => {
    setLoadResumo(true)
    const qs = new URLSearchParams({ formulario_id })
    if (ocorridoSel) qs.set('ocorrido', ocorridoSel)
    if (mesesSel.length) qs.set('meses', mesesSel.join(','))
    const res = await fetch(`/api/feedback-prof/resumo?${qs}`)
    if (res.ok) setResumo(await res.json()); else setResumo(null)
    setLoadResumo(false)
  }, [formulario_id, ocorridoSel, mesesSel])

  useEffect(() => { fetchRespostas() }, [fetchRespostas])
  useEffect(() => { if (showResumo) fetchResumo() }, [showResumo, fetchResumo])

  useEffect(() => {
    fetch('/api/feedback-prof/profissionais').then(r => r.json()).then(d => setProfissionais(d.map((p: { nome: string }) => p.nome)))
    fetch('/api/feedback-prof/ocorridos').then(r => r.json()).then(d => setOcorridos(d.map((o: { descricao: string }) => o.descricao)))
  }, [])

  function iniciarEdicao(r: Resposta) {
    setEditando({
      id: r.id,
      profissional_nome: r.profissional_nome,
      tipo: r.tipo,
      ocorrido_descricao: r.ocorrido_descricao,
      descricao: r.descricao || '',
    })
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvando(true)
    const res = await fetch('/api/feedback-prof/respostas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editando),
    })
    if (res.ok) {
      toast.success('Feedback atualizado!')
      setEditando(null)
      fetchRespostas()
    } else {
      toast.error('Erro ao salvar')
    }
    setSalvando(false)
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir feedback de ${nome}?`)) return
    const res = await fetch('/api/feedback-prof/respostas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      toast.success('Excluído!')
      fetchRespostas()
    } else {
      toast.error('Erro ao excluir')
    }
  }

  function aplicarBusca() {
    setBusca(buscaInput)
    setPage(1)
  }

  // Impressão A4 do RESUMO por categoria — HTML próprio e estilizado (não clona a
  // tela, pois o Tailwind não carrega na janela de impressão). Cada categoria e
  // cada profissional não quebram no meio da página.
  const printFbRef = useRef<HTMLDivElement>(null)
  async function imprimirFb() {
    // Garante os dados do resumo (mesmo que a seção não esteja aberta na tela)
    let dados = resumo
    if (!dados) {
      const qs = new URLSearchParams({ formulario_id })
      if (ocorridoSel) qs.set('ocorrido', ocorridoSel)
      if (mesesSel.length) qs.set('meses', mesesSel.join(','))
      try { const r = await fetch(`/api/feedback-prof/resumo?${qs}`); if (r.ok) dados = await r.json() } catch {}
    }
    if (!dados || !dados.categorias?.length) { alert('Nada para imprimir com o filtro atual.'); return }

    const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const filtros: string[] = []
    if (mesesSel.length) filtros.push('Meses: ' + mesesSel.slice().sort().map(labelMes).join(', '))
    if (ocorridoSel) filtros.push('Ocorrência: ' + esc(ocorridoSel))

    const cats = dados.categorias.map((cat: any) => {
      const profs = cat.profissionais.map((pf: any) => `
        <div class="prof">
          <div class="prof-hd"><span class="prof-nome">${esc(pf.nome)}</span><span class="prof-tot">${pf.total} · ${pf.positivos}+ / ${pf.negativos}-</span></div>
          <div class="badges">${pf.ocorrencias.map((o: any) => `<span class="bdg">${esc(o.ocorrencia)} <b>${o.qtd}</b></span>`).join('')}</div>
        </div>`).join('')
      const resumoCat = cat.resumo_ocorrencias.map((o: any) => `<span class="bdg bdg-cat">${esc(o.ocorrencia)} <b>${o.qtd}</b></span>`).join('')
      return `
        <div class="cat">
          <div class="cat-hd"><span class="cat-nome">${esc(cat.categoria)}</span><span class="cat-tot">${cat.total} ocorrências · ${cat.positivos} pos · ${cat.negativos} neg</span></div>
          <div class="cat-body">
            ${profs}
            <div class="cat-resumo"><div class="cat-resumo-lbl">Resumo da categoria — ${esc(cat.categoria)}</div><div class="badges">${resumoCat}</div></div>
          </div>
        </div>`
    }).join('')

    // Busca TODOS os registros detalhados (todas as páginas) com os filtros atuais
    const baseQs = new URLSearchParams({ formulario_id, busca })
    if (ocorridoSel) baseQs.set('ocorrido', ocorridoSel)
    if (mesesSel.length) baseQs.set('meses', mesesSel.join(','))
    let registros: any[] = []
    try {
      const q1 = new URLSearchParams(baseQs); q1.set('page', '1')
      const r1 = await fetch(`/api/feedback-prof/respostas?${q1}`)
      if (r1.ok) {
        const d1 = await r1.json()
        registros = d1.respostas || []
        const pages = Math.ceil((d1.total || 0) / 50)
        if (pages > 1) {
          const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => {
            const qp = new URLSearchParams(baseQs); qp.set('page', String(i + 2))
            return fetch(`/api/feedback-prof/respostas?${qp}`).then(r => r.ok ? r.json() : { respostas: [] }).catch(() => ({ respostas: [] }))
          }))
          for (const d of rest) registros = registros.concat(d.respostas || [])
        }
      }
    } catch {}

    const fmtData = (s: string) => { try { const d = new Date(s); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }
    const linhasReg = registros.map((r: any) => `<tr><td class="nw">${fmtData(r.criado_em)}</td><td><b>${esc(r.profissional_nome)}</b></td><td class="nw">${r.tipo === 'positivo' ? '<span class="tp tp-pos">+ POS</span>' : r.tipo === 'acompanhamento' ? '<span class="tp">ACOMP.</span>' : '<span class="tp tp-neg">− NEG</span>'}</td><td>${esc(r.ocorrido_descricao)}</td><td class="desc">${esc(r.descricao || '—')}</td></tr>`).join('')
    const tabelaReg = registros.length ? `<h2 class="h2">Registros detalhados (${registros.length})</h2><table class="reg"><thead><tr><th>Data</th><th>Profissional</th><th>Tipo</th><th>Ocorrência</th><th>Descrição</th></tr></thead><tbody>${linhasReg}</tbody></table>` : ''

    const css = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px;margin:0;line-height:1.45}h1{font-size:18px;color:#5b4fcf;margin:0 0 3px}.sub{font-size:11px;color:#6b6860;margin-bottom:14px}.cat{border:1px solid #e3e0f5;border-radius:10px;overflow:hidden;margin-bottom:14px;break-inside:avoid;page-break-inside:avoid}.cat-hd{background:#f0eefb;padding:7px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px}.cat-nome{font-weight:800;color:#5b4fcf;font-size:13px}.cat-tot{font-size:10.5px;color:#555;white-space:nowrap}.cat-body{padding:8px 12px}.prof{padding:7px 0;border-bottom:1px solid #f0eee8;break-inside:avoid;page-break-inside:avoid}.prof:last-child{border-bottom:none}.prof-hd{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:5px}.prof-nome{font-weight:700;font-size:12px}.prof-tot{font-size:10px;color:#888;white-space:nowrap}.badges{display:flex;flex-wrap:wrap;gap:5px}.bdg{background:#f5f4f0;color:#555;border-radius:20px;padding:2px 9px;font-size:10px;white-space:nowrap}.bdg b{color:#1a1a2e}.bdg-cat{background:#ede9fe;color:#5b21b6}.cat-resumo{margin-top:9px;padding-top:8px;border-top:1.5px dashed #d8d4ef}.cat-resumo-lbl{font-size:11px;font-weight:700;color:#5b4fcf;margin-bottom:5px}.h2{font-size:14px;color:#5b4fcf;margin:20px 0 8px;border-bottom:2px solid #ede9fe;padding-bottom:4px;break-after:avoid}table.reg{width:100%;border-collapse:collapse;font-size:10px}table.reg thead{display:table-header-group}table.reg th{background:#f0eefb;color:#5b4fcf;text-align:left;padding:5px 8px;border-bottom:1px solid #ddd}table.reg td{padding:4px 8px;border-bottom:1px solid #eee;vertical-align:top}table.reg tr{break-inside:avoid;page-break-inside:avoid}table.reg tr:nth-child(even) td{background:#faf9ff}.nw{white-space:nowrap}.desc{color:#555;font-style:italic}.tp{font-size:8px;font-weight:700;padding:1px 6px;border-radius:10px;white-space:nowrap}.tp-pos{background:#dcfce7;color:#15803d}.tp-neg{background:#fee2e2;color:#b91c1c}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Feedbacks NODRI</title><style>${css}</style></head><body><h1>NODRI — Feedbacks por Categoria</h1><div class="sub">Gerado em ${new Date().toLocaleDateString('pt-BR')}${filtros.length ? ' &nbsp;·&nbsp; ' + filtros.join(' &nbsp;·&nbsp; ') : ''}</div>${cats}${tabelaReg}</body></html>`
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(html); win.document.close(); win.focus()
    setTimeout(() => win.print(), 400)
  }

  return (
    <div className="nodri-salon-bg min-h-screen">
      <nav className="bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3 sticky top-0 z-50">
        <button onClick={() => router.push('/salon/feedback-profissional')}
          className="flex items-center gap-1.5 text-nodri-t2 hover:text-nodri-t1 text-sm">
          <ArrowLeft size={15} /> Feedback Profissional
        </button>
        <div className="w-px h-4 bg-nodri-border" />
        <span className="font-syne font-bold text-sm text-nodri-t1">Gerenciar Feedbacks</span>
        <span className="text-[11px] text-nodri-t3 ml-1">— editar e excluir registros</span>
        <button onClick={imprimirFb} title="Imprimir a página inteira em A4"
          className="ml-auto hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white"
          style={{ background: '#5b4fcf' }}>
          <Printer size={14} /> Imprimir tudo
        </button>
      </nav>

      <div className="p-4 max-w-5xl mx-auto space-y-4" ref={printFbRef}>
        {/* Busca */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border"
            style={{ background: '#ffffff', borderColor: 'rgba(0,0,0,.1)' }}>
            <Search size={13} className="text-nodri-t3 shrink-0" />
            <input
              value={buscaInput}
              onChange={e => setBuscaInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && aplicarBusca()}
              placeholder="Buscar por nome do profissional..."
              className="flex-1 bg-transparent text-[12px] text-nodri-t1 outline-none placeholder:text-nodri-t3"
            />
          </div>
          <button onClick={aplicarBusca} className="px-4 py-2 rounded-xl text-[12px] font-semibold"
            style={{ background: 'rgba(34,211,238,.1)', color: '#0891b2', border: '1px solid rgba(34,211,238,.25)' }}>
            Buscar
          </button>
          {busca && (
            <button onClick={() => { setBusca(''); setBuscaInput(''); setPage(1) }}
              className="px-3 py-2 rounded-xl text-[12px]"
              style={{ background: '#f5f4f0', color: '#767069', border: '1px solid rgba(0,0,0,.1)' }}>
              Limpar
            </button>
          )}
        </div>

        {/* Filtros: ocorrência + meses + resumo */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <select value={ocorridoSel} onChange={e => { setOcorridoSel(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-xl border text-[12px] text-nodri-t1 outline-none"
              style={{ background: '#fff', borderColor: 'rgba(0,0,0,.12)' }}>
              <option value="">Todas as ocorrências</option>
              {ocorridos.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <button onClick={() => setShowResumo(v => !v)} className="px-3 py-2 rounded-xl text-[12px] font-semibold"
              style={{ background: 'rgba(91,79,207,.1)', color: '#5b4fcf', border: '1px solid rgba(91,79,207,.25)' }}>
              {showResumo ? 'Ocultar resumo' : 'Resumo por categoria'}
            </button>
            {(mesesSel.length > 0 || ocorridoSel) && (
              <button onClick={() => { setMesesSel([]); setOcorridoSel(''); setPage(1) }}
                className="px-3 py-2 rounded-xl text-[12px]" style={{ background: 'rgba(0,0,0,.04)', color: '#767069' }}>
                Limpar filtros
              </button>
            )}
          </div>
          <div>
            <div className="text-[10px] text-nodri-t3 mb-1">Filtrar por mês/ano (pode escolher vários):</div>
            {/* Mobile: lista suspensa que adiciona/remove meses */}
            <div className="sm:hidden">
              <select value="" onChange={e => { if (e.target.value) toggleMes(e.target.value) }}
                className="w-full px-3 py-2 rounded-lg border text-[12px] text-nodri-t1 bg-white"
                style={{ borderColor: 'rgba(0,0,0,.12)' }}>
                <option value="">+ Adicionar mês/ano…</option>
                {ultimosMeses.map(ym => <option key={ym} value={ym}>{mesesSel.includes(ym) ? '✓ ' : ''}{labelMes(ym)}</option>)}
              </select>
              {mesesSel.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {mesesSel.map(ym => (
                    <button key={ym} onClick={() => toggleMes(ym)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                      style={{ background: '#5b4fcf', color: '#fff', border: '1px solid #5b4fcf' }}>
                      {labelMes(ym)} ✕
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Desktop: grade de chips */}
            <div className="hidden sm:flex flex-wrap gap-1.5">
              {ultimosMeses.map(ym => {
                const on = mesesSel.includes(ym)
                return (
                  <button key={ym} onClick={() => toggleMes(ym)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                    style={{ background: on ? '#5b4fcf' : '#fff', color: on ? '#fff' : '#767069', border: on ? '1px solid #5b4fcf' : '1px solid rgba(0,0,0,.12)' }}>
                    {labelMes(ym)}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Resumo por categoria (individual + categoria) */}
        {showResumo && (
          <div className="pcard rounded-2xl border p-4" style={{ background: '#fff', borderColor: 'rgba(0,0,0,.07)' }}>
            <h3 className="font-syne font-bold text-[13px] text-nodri-t1 mb-3">Resumo por categoria</h3>
            {loadResumo ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-t-nodri-cyan rounded-full animate-spin" /></div>
            ) : !resumo || resumo.categorias.length === 0 ? (
              <div className="text-center py-6 text-nodri-t3 text-[12px]">Nenhuma ocorrência para o filtro selecionado.</div>
            ) : (
              <div className="space-y-4">
                {resumo.categorias.map((cat: any) => (
                  <div key={cat.categoria} className="border rounded-xl overflow-hidden" style={{ borderColor: 'rgba(0,0,0,.08)' }}>
                    <div className="px-3 py-2 flex items-center justify-between flex-wrap gap-1" style={{ background: '#f0eefb' }}>
                      <span className="font-bold text-[12px]" style={{ color: '#5b4fcf' }}>{cat.categoria}</span>
                      <span className="text-[11px] text-nodri-t2">{cat.total} ocorrências · {cat.positivos} pos · {cat.negativos} neg</span>
                    </div>
                    <div className="p-3 space-y-3">
                      {cat.profissionais.map((pf: any) => (
                        <div key={pf.nome}>
                          <div className="flex items-center justify-between text-[12px] font-semibold text-nodri-t1">
                            <span>{pf.nome}</span>
                            <span className="text-[11px] text-nodri-t3">{pf.total} · {pf.positivos}+ / {pf.negativos}-</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {pf.ocorrencias.map((o: any) => (
                              <span key={o.ocorrencia} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#f5f4f0', color: '#6b6860' }}>
                                {o.ocorrencia}: <strong>{o.qtd}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 mt-1 border-t" style={{ borderColor: 'rgba(0,0,0,.06)' }}>
                        <div className="text-[11px] font-bold text-nodri-t2 mb-1">Resumo da categoria — {cat.categoria}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.resumo_ocorrencias.map((o: any) => (
                            <span key={o.ocorrencia} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#ede9fe', color: '#5b21b6' }}>
                              {o.ocorrencia}: <strong>{o.qtd}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contagem */}
        <div className="flex items-center justify-between text-[11px] text-nodri-t3">
          <span>{total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</span>
          {totalPages > 1 && (
            <span>Página {page} de {totalPages}</span>
          )}
        </div>

        {/* Tabela */}
        <div className="pcard rounded-2xl border overflow-hidden" style={{ background: '#ffffff', borderColor: 'rgba(0,0,0,.07)' }}>
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-t-nodri-cyan rounded-full animate-spin" /></div>
          ) : respostas.length === 0 ? (
            <div className="text-center py-16 text-nodri-t3 text-sm">Nenhum registro encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ background: '#faf9f7' }}>
                    <th className="text-left px-4 py-3 text-nodri-t3 font-semibold">Data</th>
                    <th className="text-left px-4 py-3 text-nodri-t3 font-semibold">Profissional</th>
                    <th className="text-center px-4 py-3 text-nodri-t3 font-semibold">Tipo</th>
                    <th className="text-left px-4 py-3 text-nodri-t3 font-semibold">Ocorrência</th>
                    <th className="text-left px-4 py-3 text-nodri-t3 font-semibold">Descrição</th>
                    <th className="text-center px-4 py-3 text-nodri-t3 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-nodri-border/20">
                  {respostas.map(r => (
                    <tr key={r.id} className="hover:bg-nodri-surface/20 transition-colors">
                      {editando?.id === r.id ? (
                        <>
                          <td className="px-4 py-3 text-nodri-t3 text-[10px] whitespace-nowrap">
                            {new Date(r.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                          </td>
                          <td className="px-4 py-3">
                            <select value={editando.profissional_nome}
                              onChange={e => setEditando({ ...editando, profissional_nome: e.target.value })}
                              className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none w-full">
                              {profissionais.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select value={editando.tipo}
                              onChange={e => setEditando({ ...editando, tipo: e.target.value as 'positivo' | 'negativo' | 'acompanhamento' })}
                              className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none">
                              <option value="positivo">Positivo</option>
                              <option value="negativo">Negativo</option>
                              <option value="acompanhamento">Acompanhamento</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select value={editando.ocorrido_descricao}
                              onChange={e => setEditando({ ...editando, ocorrido_descricao: e.target.value })}
                              className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none w-full">
                              {ocorridos.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input value={editando.descricao}
                              onChange={e => setEditando({ ...editando, descricao: e.target.value })}
                              className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none w-full"
                              placeholder="Descrição (opcional)" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-center">
                              <button onClick={salvarEdicao} disabled={salvando}
                                className="p-1.5 rounded-lg disabled:opacity-50"
                                style={{ background: 'rgba(34,197,94,.15)', color: '#15803d' }}>
                                <Check size={13} />
                              </button>
                              <button onClick={() => setEditando(null)}
                                className="p-1.5 rounded-lg"
                                style={{ background: 'rgba(239,68,68,.1)', color: '#dc2626' }}>
                                <X size={13} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-nodri-t3 text-[10px] whitespace-nowrap">
                            {new Date(r.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                            <div className="text-[9px]">{new Date(r.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-nodri-t1">{r.profissional_nome}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${r.tipo === 'positivo' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                              {r.tipo === 'positivo' ? '+ POS' : '- NEG'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-nodri-t2">{r.ocorrido_descricao}</td>
                          <td className="px-4 py-3 text-nodri-t3 italic min-w-[180px] whitespace-normal break-words">
                            {r.descricao || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-center">
                              <button onClick={() => iniciarEdicao(r)}
                                className="p-1.5 rounded-lg"
                                style={{ background: 'rgba(250,204,21,.1)', color: '#b45309' }}>
                                <Edit2 size={12} />
                              </button>
                              <button onClick={() => excluir(r.id, r.profissional_nome)}
                                className="p-1.5 rounded-lg"
                                style={{ background: 'rgba(239,68,68,.1)', color: '#dc2626' }}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg disabled:opacity-30"
              style={{ background: '#f5f4f0', color: '#767069' }}>
              <ChevronLeft size={14} />
            </button>
            <span className="text-[12px] text-nodri-t2 px-3">Página {page} de {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg disabled:opacity-30"
              style={{ background: '#f5f4f0', color: '#767069' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
