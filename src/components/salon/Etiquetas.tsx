'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Printer, Users, Truck } from 'lucide-react'

const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function Etiquetas() {
  const [cat, setCat] = useState<'profissionais' | 'fornecedores'>('profissionais')
  const [profs, setProfs] = useState<string[]>([])
  const [forns, setForns] = useState<string[]>([])
  const [cols, setCols] = useState(4)
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([
        fetch('/api/profissionais?ativo=true').then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/salon/despesas-catalogo', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      ])
      const nomesP = (Array.isArray(p) ? p : []).filter((x: any) => x.ativo !== false && !x.is_departamento).map((x: any) => (x.apelido || x.nome_completo || '').trim()).filter(Boolean)
      setProfs(Array.from(new Set(nomesP)).sort())
      const desp = (d && Array.isArray(d.despesas)) ? d.despesas : []
      const nomesF = desp.filter((x: any) => x.categoria === 'indireta').map((x: any) => (x.nome || '').trim()).filter(Boolean)
      setForns(Array.from(new Set(nomesF)).sort())
    } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const nomes = cat === 'profissionais' ? profs : forns

  function imprimir() {
    const cells = nomes.map(n => `<td>${esc(n.toUpperCase())}</td>`)
    // completa a última linha para a borda fechar certinho
    const resto = cells.length % cols
    if (resto) for (let i = 0; i < cols - resto; i++) cells.push('<td></td>')
    let body = ''
    for (let i = 0; i < cells.length; i += cols) body += `<tr>${cells.slice(i, i + cols).join('')}</tr>`
    const css = `@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif}table{width:100%;border-collapse:collapse;table-layout:fixed}td{border:1.5px solid #000;height:90px;text-align:center;vertical-align:middle;font-size:18px;font-weight:800;padding:6px;word-break:break-word}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Etiquetas — ${cat}</title><style>${css}</style></head><body><table><tbody>${body || '<tr><td>Sem nomes</td></tr>'}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=800'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#5b4fcf', margin: 0, flex: 1, minWidth: 160 }}>🏷️ Etiquetas</h3>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860' }}>Colunas:</label>
        <select value={cols} onChange={e => setCols(Number(e.target.value))} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }}>
          {[2, 3, 4, 5].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={imprimir} disabled={nomes.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: nomes.length ? '#16a34a' : '#cbd5e1', color: '#fff', fontSize: 13, fontWeight: 800, cursor: nomes.length ? 'pointer' : 'not-allowed' }}><Printer size={14} /> Imprimir / PDF</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={() => setCat('profissionais')} style={tab(cat === 'profissionais')}><Users size={15} /> Profissionais ({profs.length})</button>
        <button onClick={() => setCat('fornecedores')} style={tab(cat === 'fornecedores')}><Truck size={15} /> Fornecedores ({forns.length})</button>
      </div>

      <p style={{ fontSize: 12, color: '#6b6860', marginBottom: 12 }}>Etiquetas com <strong>borda</strong> para recortar e colar em armários e pastas. {cat === 'fornecedores' ? 'Os fornecedores vêm das Despesas Indiretas da Calculadora.' : 'Os profissionais ativos vêm do cadastro.'}</p>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> :
        nomes.length === 0 ? <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>{cat === 'fornecedores' ? 'Nenhum fornecedor cadastrado nas Despesas Indiretas.' : 'Nenhum profissional ativo cadastrado.'}</div> : (
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 10, overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, minWidth: cols * 120 }}>
              {nomes.map((n, i) => (
                <div key={i} style={{ border: '1.5px solid #1a1a1a', minHeight: 78, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontWeight: 800, fontSize: 15, padding: 8, wordBreak: 'break-word', margin: '-0.75px' }}>{n.toUpperCase()}</div>
              ))}
            </div>
          </div>
        )}
    </div>
  )
}

function tab(ativo: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: ativo ? 'none' : '1.5px solid #e0ddd8', background: ativo ? '#5b4fcf' : '#fff', color: ativo ? '#fff' : '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
}
