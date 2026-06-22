'use client'

import { useEffect, useState } from 'react'
import { Loader2, Printer, Sparkles } from 'lucide-react'

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

type Prof = Record<string, any>

interface Metrica { k: string; t: string; low?: boolean; fmt: (v: number) => string }
interface Tema { titulo: string; cols: Metrica[] }

const rs = (v: number) => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR')
const n1 = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })

const TEMAS: Tema[] = [
  { titulo: '📊 Desempenho', cols: [
    { k: 'faturamento', t: 'Faturamento', fmt: rs },
    { k: 'ticket_medio', t: 'Ticket médio', fmt: rs },
    { k: 'servicos', t: 'Serviços', fmt: n1 },
    { k: 'produtos', t: 'Produtos', fmt: n1 },
  ]},
  { titulo: '👥 Atendimento', cols: [
    { k: 'preferencia', t: 'Preferência', fmt: n1 },
    { k: 'sem_preferencia', t: 'Sem preferência', fmt: n1 },
    { k: 'dias_trabalhados', t: 'Dias trabalhados', fmt: n1 },
    { k: 'ocupacao', t: 'Ocupação', fmt: (v) => n1(v) + '%' },
  ]},
  { titulo: '⚡ Eficiência', cols: [
    { k: 'fat_dia', t: 'Faturam./dia', fmt: rs },
    { k: 'serv_dia', t: 'Serviços/dia', fmt: n1 },
    { k: 'ticket_servico', t: 'Ticket/serviço', fmt: rs },
  ]},
  { titulo: '⚠️ Ocorrências', cols: [
    { k: 'ocorr_negativas', t: 'Negativas', low: true, fmt: n1 },
    { k: 'ocorr_positivas', t: 'Positivas', fmt: n1 },
    { k: 'faltas', t: 'Faltas', low: true, fmt: n1 },
    { k: 'atrasos', t: 'Atrasos', low: true, fmt: n1 },
  ]},
  { titulo: '👑 Dependência', cols: [
    { k: 'pct_salao', t: '% do salão', fmt: (v) => n1(v) + '%' },
    { k: 'fat_gerado', t: 'Faturam. gerado', fmt: rs },
    { k: 'clientes_fieis', t: 'Clientes fiéis', fmt: n1 },
  ]},
]

function rankearTema(profs: Prof[], tema: Tema) {
  const rank: Record<string, Record<string, number>> = {}
  for (const c of tema.cols) {
    const ord = [...profs].sort((a, b) => c.low ? (a[c.k] - b[c.k]) : (b[c.k] - a[c.k]))
    rank[c.k] = {}
    ord.forEach((p, i) => { rank[c.k][p.id] = i + 1 })
  }
  const geral: Record<string, number> = {}
  for (const p of profs) geral[p.id] = tema.cols.reduce((s, c) => s + rank[c.k][p.id], 0) / tema.cols.length
  const ordenados = [...profs].sort((a, b) => geral[a.id] - geral[b.id])
  return { rank, geral, ordenados }
}

const medalBg: Record<number, string> = { 1: '#FAEEDA', 2: '#F1EFE8', 3: '#FAECE7' }
const medalTx: Record<number, string> = { 1: '#854F0B', 2: '#444441', 3: '#993C1D' }

export default function RankingUnificado({ ano, mes }: { ano: number; mes: number }) {
  const [profs, setProfs] = useState<Prof[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [diag, setDiag] = useState('')
  const [loadDiag, setLoadDiag] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/relatorios/ranking?ano=${ano}&mes=${mes}`)
      .then(r => r.ok ? r.json() : { profissionais: [] })
      .then(d => setProfs(d.profissionais || []))
      .catch(() => setProfs([]))
      .finally(() => setLoading(false))
  }, [ano, mes])

  function pill(r: number) {
    const bg = medalBg[r] || 'transparent', tx = medalTx[r] || '#9ca3af'
    return `<span style="display:inline-block;min-width:18px;font-size:10px;padding:1px 5px;border-radius:20px;background:${bg};color:${tx}">${r}º</span>`
  }

  function tabelasHTML(forPrint: boolean): string {
    if (!profs || !profs.length) return '<p style="color:#6b7280">Sem dados para o período.</p>'
    const th = 'padding:7px 9px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;border-bottom:1.5px solid #e5e7eb;white-space:nowrap'
    let out = ''
    for (const tema of TEMAS) {
      const { rank, geral, ordenados } = rankearTema(profs, tema)
      out += `<div style="margin-bottom:${forPrint ? 14 : 18}px;break-inside:avoid">`
      out += `<div style="font-size:14px;font-weight:600;color:#1a1a1a;margin-bottom:6px">${tema.titulo}</div>`
      out += `<div style="overflow-x:auto;border:1px solid #e5e7eb;border-radius:10px"><table style="border-collapse:collapse;width:100%;font-size:12px"><thead><tr>`
      out += `<th style="${th};text-align:left">Profissional</th><th style="${th};text-align:left">Cargo</th>`
      out += tema.cols.map(c => `<th style="${th}">${c.low ? '↓ ' : ''}${c.t}</th>`).join('')
      out += `<th style="${th};background:#f5f4f0">Geral</th></tr></thead><tbody>`
      ordenados.forEach((p, idx) => {
        const bg = idx % 2 ? '#faf9f7' : '#ffffff'
        out += `<tr style="background:${bg}"><td style="padding:7px 9px;text-align:left;white-space:nowrap;color:#1a1a1a">${idx + 1}. ${p.nome}</td>`
        out += `<td style="padding:7px 9px;text-align:left;color:#6b7280;font-size:11px">${p.cargo}</td>`
        for (const c of tema.cols) {
          out += `<td style="padding:7px 9px;text-align:right;border-bottom:1px solid #f0eee8"><div style="color:#1a1a1a">${c.fmt(p[c.k])}</div><div style="margin-top:2px">${pill(rank[c.k][p.id])}</div></td>`
        }
        out += `<td style="padding:7px 9px;text-align:right;background:#f5f4f0;border-bottom:1px solid #f0eee8"><div style="font-weight:700;color:#1a1a1a">${idx + 1}º</div><div style="font-size:10px;color:#9ca3af">méd ${geral[p.id].toFixed(1)}</div></td>`
        out += `</tr>`
      })
      out += `</tbody></table></div></div>`
    }
    return out
  }

  function imprimir() {
    const win = window.open('', '_blank', 'width=1200,height=800')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ranking Unificado — ${MESES[mes]}/${ano}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { font-family: Arial, Helvetica, sans-serif; box-sizing: border-box; }
        body { margin: 0; padding: 16px; color: #1a1a1a; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        .sub { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; }
        @media print { .noprint { display: none; } }
      </style></head><body>
      <h1>Ranking Unificado de Profissionais</h1>
      <div class="sub">${MESES[mes]}/${ano} · ${profs?.length || 0} profissionais · gerado pelo NODRI</div>
      ${tabelasHTML(true)}
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
      </body></html>`)
    win.document.close()
  }

  async function gerarDiagnostico() {
    if (loadDiag || !profs?.length) return
    setLoadDiag(true)
    setDiag('')
    // Resumo compacto dos rankings para a IA
    const resumo = TEMAS.map(tema => {
      const { ordenados, geral } = rankearTema(profs, tema)
      const linhas = ordenados.map((p, i) => `${i + 1}º ${p.nome} (${p.cargo})`).join(', ')
      return `${tema.titulo}: ${linhas}`
    }).join('\n')
    const prompt = `Você é a NODRI IA. Abaixo está o ranking dos profissionais do salão em ${MESES[mes]}/${ano}, por tema.\n\n${resumo}\n\nFaça um DIAGNÓSTICO gerencial curto e direto: quem são os destaques, quem precisa de atenção, padrões por tema e 3 ações práticas. Sem repetir a lista inteira.`
    try {
      const res = await fetch('/api/ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: [{ role: 'user', content: prompt }], modo: 'gestor' }),
      })
      if (!res.ok || !res.body) {
        let msg = 'Não foi possível gerar o diagnóstico. Verifique a configuração da IA.'
        try { const d = await res.json(); if (d?.error) msg = d.error } catch {}
        setDiag(msg); setLoadDiag(false); return
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += dec.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const json = line.slice(5).trim()
          if (!json) continue
          try { const p = JSON.parse(json); if (p.token) setDiag(prev => prev + p.token) } catch {}
        }
      }
    } catch { setDiag('Erro de conexão ao gerar o diagnóstico.') }
    setLoadDiag(false)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ marginRight: 'auto' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Relatório Unificado de Profissionais</h2>
          <p style={{ fontSize: 12, color: '#6b6860', margin: '2px 0 0' }}>{MESES[mes]}/{ano} · {profs?.length || 0} profissionais · ranking por métrica</p>
        </div>
        <button onClick={imprimir}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid #d0cdc7', background: '#fff', color: '#1a1a1a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Printer size={15} /> Imprimir (A4)
        </button>
        <button onClick={gerarDiagnostico} disabled={loadDiag}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#5b4fcf,#f43f8e)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: loadDiag ? 0.7 : 1 }}>
          {loadDiag ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Diagnóstico
        </button>
      </div>

      {(diag || loadDiag) && (
        <div style={{ background: '#f0eefb', border: '1.5px solid #c4bef0', borderRadius: 14, padding: 18, marginBottom: 18, whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, color: '#1a1a1a' }}>
          <div style={{ fontWeight: 700, color: '#5b4fcf', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={14} /> Diagnóstico da IA</div>
          {diag || 'Analisando...'}
        </div>
      )}

      <div dangerouslySetInnerHTML={{ __html: tabelasHTML(false) }} />
    </div>
  )
}
