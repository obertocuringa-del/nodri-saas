'use client'

import { useEffect, useState } from 'react'
import { Loader2, Printer, Sparkles } from 'lucide-react'

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

type Prof = Record<string, any>
interface Metrica { k: string; t: string; low?: boolean; fmt: (v: number) => string }
interface Tema { titulo: string; cols?: Metrica[]; dynamic?: 'ocorr' }

const rs = (v: number) => 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR')
const n1 = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })

const TEMAS: Tema[] = [
  { titulo: '📊 Desempenho', cols: [
    { k: 'faturamento', t: 'Faturamento', fmt: rs },
    { k: 'ticket_medio', t: 'Ticket', fmt: rs },
    { k: 'servicos', t: 'Serviços', fmt: n1 },
    { k: 'produtos', t: 'Produtos', fmt: n1 },
  ]},
  { titulo: '👥 Atendimento', cols: [
    { k: 'preferencia', t: 'Preferência', fmt: n1 },
    { k: 'sem_preferencia', t: 'Sem pref.', fmt: n1 },
    { k: 'dias_trabalhados', t: 'Dias', fmt: n1 },
    { k: 'ocupacao', t: 'Ocupação', fmt: (v) => n1(v) + '%' },
  ]},
  { titulo: '⚡ Eficiência', cols: [
    { k: 'fat_dia', t: 'Faturam./dia', fmt: rs },
    { k: 'serv_dia', t: 'Serviços/dia', fmt: n1 },
    { k: 'ticket_servico', t: 'Ticket/serviço', fmt: rs },
  ]},
  { titulo: '⚠️ Ocorrências', dynamic: 'ocorr' },
  { titulo: '👑 Dependência', cols: [
    { k: 'pct_salao', t: '% do salão', fmt: (v) => n1(v) + '%' },
    { k: 'fat_gerado', t: 'Faturam. gerado (valor cheio)', fmt: rs },
    { k: 'clientes_fieis', t: 'Clientes c/ preferência', fmt: n1 },
  ]},
  { titulo: '❤️ Fidelização', cols: [
    { k: 'clientes_perdidos', t: 'Atendeu e não fidelizou', low: true, fmt: n1 },
  ]},
  { titulo: '🎯 Meta', cols: [
    { k: 'meta_pct', t: '% atingimento', fmt: (v) => n1(v) + '%' },
    { k: 'falta', t: 'Quanto falta', low: true, fmt: rs },
  ]},
]

function heat(i: number, total: number): [string, string] {
  const t = i / Math.max(total - 1, 1)
  if (t <= 0.34) return ['#E1F5EE', '#0F6E56']
  if (t <= 0.67) return ['#FAEEDA', '#854F0B']
  return ['#FCEBEB', '#A32D2D']
}

// Paleta de cores para os tipos de ocorrência (um quadradinho por tipo)
const CORES_OC = [
  { bg: '#E6F1FB', tx: '#185FA5' }, { bg: '#FCEBEB', tx: '#A32D2D' }, { bg: '#EAF3DE', tx: '#3B6D11' },
  { bg: '#FAEEDA', tx: '#854F0B' }, { bg: '#EEEDFE', tx: '#534AB7' }, { bg: '#FBEAF0', tx: '#993556' },
  { bg: '#E1F5EE', tx: '#0F6E56' }, { bg: '#FAECE7', tx: '#993C1D' }, { bg: '#F1EFE8', tx: '#5F5E5A' },
  { bg: '#D3E5F7', tx: '#0C447C' }, { bg: '#F7D9C7', tx: '#712B13' }, { bg: '#D9F0E5', tx: '#085041' },
]

export default function RankingUnificado({ ano, mes }: { ano: number; mes: number }) {
  const [anoSel, setAnoSel] = useState(ano)
  const [mesSel, setMesSel] = useState(mes)
  const [profs, setProfs] = useState<Prof[] | null>(null)
  const [ocorrTipos, setOcorrTipos] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [diag, setDiag] = useState('')
  const [loadDiag, setLoadDiag] = useState(false)

  const anoAtual = new Date().getFullYear()
  const anosDisp = [anoAtual, anoAtual - 1, anoAtual - 2]

  useEffect(() => {
    setLoading(true)
    setDiag('')
    fetch(`/api/relatorios/ranking?ano=${anoSel}&mes=${mesSel}`)
      .then(r => r.ok ? r.json() : { profissionais: [] })
      .then(d => { setProfs(d.profissionais || []); setOcorrTipos(d.ocorrencias_tipos || []) })
      .catch(() => { setProfs([]); setOcorrTipos([]) })
      .finally(() => setLoading(false))
  }, [anoSel, mesSel])

  function tabelasHTML(): string {
    if (!profs || !profs.length) return '<p style="color:#6b7280">Sem dados para o período.</p>'
    const cargos: Record<string, Prof[]> = {}
    for (const p of profs) { (cargos[p.cargo] = cargos[p.cargo] || []).push(p) }
    let out = ''
    for (const [cargo, arr] of Object.entries(cargos)) {
      out += `<div style="margin-bottom:20px;break-inside:avoid">`
      out += `<div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:10px;border-bottom:2px solid #5b4fcf;padding-bottom:4px">${cargo} · ${arr.length}</div>`
      for (const tema of TEMAS) {
        out += `<div style="margin-bottom:16px;break-inside:avoid;border:1px solid #d8d4e8;border-radius:12px;overflow:hidden">`
        out += `<div style="background:#e7e3f3;border-bottom:1px solid #d8d4e8;padding:9px 12px;font-size:13px;font-weight:700;color:#3a3550">${tema.titulo}</div>`
        out += `<div style="padding:10px 12px;background:#ffffff">`

        // Tema dinâmico: Ocorrências — quadradinhos coloridos por tipo, ordenado pela soma total
        if (tema.dynamic === 'ocorr') {
          if (!ocorrTipos.length) { out += `<div style="font-size:11px;color:#9ca3af;padding:4px 0">Nenhuma ocorrência registrada no período.</div></div></div>`; continue }
          const corDe = (t: string) => CORES_OC[Math.max(0, ocorrTipos.indexOf(t)) % CORES_OC.length]
          // Legenda
          out += `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;font-size:10px;color:#6b7280">`
          for (const t of ocorrTipos) { const c = corDe(t); out += `<span style="display:flex;align-items:center;gap:4px"><span style="width:11px;height:11px;border-radius:3px;background:${c.bg};border:1px solid ${c.tx}"></span>${t}</span>` }
          out += `</div>`
          // Linhas por profissional, ordenadas pela soma total (maior → menor)
          const ord = [...arr].sort((a, b) => (b.ocorr_total || 0) - (a.ocorr_total || 0))
          ord.forEach((p, i) => {
            const tiposP = Object.keys(p.ocorr || {}).sort((a, b) => p.ocorr[b] - p.ocorr[a])
            out += `<div style="display:flex;align-items:center;gap:8px;padding:7px 4px;border-top:1px solid #f0eee8">`
              + `<span style="font-size:10px;color:#9ca3af;min-width:16px">${i + 1}º</span>`
              + `<span style="font-size:12px;color:#1a1a1a;min-width:130px">${p.nome}</span>`
              + `<span style="display:flex;flex-wrap:wrap;gap:4px;flex:1">`
              + (tiposP.length ? tiposP.map(t => { const c = corDe(t); return `<span title="${t}: ${p.ocorr[t]}" style="display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:20px;padding:0 5px;border-radius:5px;background:${c.bg};color:${c.tx};font-size:11px;font-weight:700;border:1px solid ${c.tx}">${p.ocorr[t]}</span>` }).join('') : `<span style="font-size:11px;color:#9ca3af">—</span>`)
              + `</span>`
              + `<span style="font-size:11px;font-weight:700;color:#1a1a1a;min-width:60px;text-align:right">Total ${p.ocorr_total || 0}</span>`
              + `</div>`
          })
          out += `</div></div>`
          continue
        }

        // Temas normais — colunas-ranking com heatmap
        const cols = tema.cols!
        out += `<div style="display:grid;grid-template-columns:repeat(${cols.length},minmax(0,1fr));gap:8px">`
        for (const c of cols) {
          const ord = [...arr].sort((a, b) => c.low ? (a[c.k] - b[c.k]) : (b[c.k] - a[c.k]))
          out += `<div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">`
          out += `<div style="background:#f5f4f0;padding:6px 8px;font-size:11px;font-weight:600;color:#1a1a1a;text-align:center">${c.low ? '↓ ' : ''}${c.t}</div>`
          ord.forEach((p, i) => {
            const [bg, tx] = heat(i, ord.length)
            out += `<div style="display:flex;align-items:center;gap:5px;padding:6px 8px;border-top:1px solid #f0eee8">`
              + `<span style="font-size:10px;color:#9ca3af;min-width:14px">${i + 1}º</span>`
              + `<span style="font-size:11px;color:#1a1a1a;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nome}</span>`
              + `<span style="font-size:10px;background:${bg};color:${tx};border-radius:5px;padding:2px 5px;white-space:nowrap">${c.fmt(p[c.k])}</span>`
              + `</div>`
          })
          out += `</div>`
        }
        out += `</div></div></div>`
      }
      out += `</div>`
    }
    return out
  }

  function imprimir() {
    const win = window.open('', '_blank', 'width=1200,height=800')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ranking Unificado — ${MESES[mesSel]}/${anoSel}</title>
      <style>
        @page { size: A4 landscape; margin: 9mm; }
        * { font-family: Arial, Helvetica, sans-serif; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; padding: 14px; color: #1a1a1a; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        .sub { font-size: 12px; color: #6b7280; margin-bottom: 14px; }
      </style></head><body>
      <h1>Ranking Unificado de Profissionais</h1>
      <div class="sub">${MESES[mesSel]}/${anoSel} · ${profs?.length || 0} profissionais · gerado pelo NODRI</div>
      ${tabelasHTML()}
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
      </body></html>`)
    win.document.close()
  }

  async function gerarDiagnostico() {
    if (loadDiag || !profs?.length) return
    setLoadDiag(true)
    setDiag('')
    const resumo = profs.map(p =>
      `${p.nome} (${p.cargo}): faturamento ${rs(p.faturamento)}, ticket ${rs(p.ticket_medio)}, ${p.servicos} serviços, ocupação ${n1(p.ocupacao)}%, ${p.preferencia} preferência, ${p.ocorr_total || 0} ocorrências, ${p.clientes_perdidos} perdidos, meta ${n1(p.meta_pct)}% (falta ${rs(p.falta)}), ${n1(p.pct_salao)}% do salão (bruto)`
    ).join('\n')
    const prompt = `Você é a NODRI IA. Abaixo estão as métricas dos profissionais do salão em ${MESES[mesSel]}/${anoSel}:\n\n${resumo}\n\nFaça um DIAGNÓSTICO gerencial curto e direto, comparando cada profissional DENTRO do seu cargo: destaques, quem precisa de atenção, padrões por cargo e 3 ações práticas. Não repita a lista inteira.`
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
          try { const pp = JSON.parse(json); if (pp.token) setDiag(prev => prev + pp.token) } catch {}
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
          <p style={{ fontSize: 12, color: '#6b6860', margin: '2px 0 0' }}>{profs?.length || 0} profissionais · ranking por métrica e por cargo</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select value={mesSel} onChange={e => setMesSel(Number(e.target.value))}
            style={{ background: '#fff', border: '1.5px solid #d0cdc7', borderRadius: 8, color: '#1a1a1a', padding: '7px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))}
            style={{ background: '#fff', border: '1.5px solid #d0cdc7', borderRadius: 8, color: '#1a1a1a', padding: '7px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {anosDisp.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#6b6860' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: '#E1F5EE' }} />topo</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: '#FAEEDA' }} />meio</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: '#FCEBEB' }} />fim</span>
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

      <div dangerouslySetInnerHTML={{ __html: tabelasHTML() }} />
    </div>
  )
}
