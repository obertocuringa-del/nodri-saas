'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, X } from 'lucide-react'

interface ProfSalao { id: string; nome: string }
interface ColBebida { id: string; nome: string }
interface Doc { colunas: ColBebida[]; cells: Record<string, string> }

const PADRAO: ColBebida[] = [{ id: 'cafe', nome: 'Café' }, { id: 'cha', nome: 'Chá' }, { id: 'capuccino', nome: 'Capuccino' }]
function mesAtual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const rid = () => Math.random().toString(36).slice(2, 8)

export default function ListaBebidas({ profsSalao }: { profsSalao: ProfSalao[] }) {
  const [mes, setMes] = useState(mesAtual())
  const [colunas, setColunas] = useState<ColBebida[]>(PADRAO)
  const [cells, setCells] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d: Doc | null = await fetch(`/api/salon/grid?chave=bebidas_${mes}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.colunas) && d.colunas.length) { setColunas(d.colunas); setCells(d.cells || {}) }
      else { setColunas(PADRAO); setCells({}) }
    } catch { setColunas(PADRAO); setCells({}) }
    setDirty(false); setLoading(false)
  }, [mes])
  useEffect(() => { carregar() }, [carregar])

  function setCell(profId: string, colId: string, v: string) { setCells(p => ({ ...p, [`${profId}::${colId}`]: v })); setDirty(true) }
  function addColuna() { setColunas(c => [...c, { id: rid(), nome: 'Nova bebida' }]); setDirty(true) }
  function delColuna(id: string) { setColunas(c => c.length <= 1 ? c : c.filter(x => x.id !== id)); setDirty(true) }
  function renColuna(id: string, nome: string) { setColunas(c => c.map(x => x.id === id ? { ...x, nome } : x)); setDirty(true) }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: `bebidas_${mes}`, doc: { colunas, cells } }) })
      if (res.ok) { toast.success('Salvo!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function imprimir() {
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const head = colunas.map(c => `<th>${esc(c.nome)}</th>`).join('')
    const body = profsSalao.map(p => `<tr><td class="nm">${esc(p.nome)}</td>${colunas.map(c => `<td>${esc(cells[`${p.id}::${c.id}`] || '')}</td>`).join('')}</tr>`).join('')
    const css = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px}h1{text-align:center;font-size:15px;color:#5b4fcf;margin-bottom:8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px 6px;text-align:center}th{background:#f1eefb;color:#3b2e7a}.nm{text-align:left;font-weight:700;background:#faf9ff}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Consumo de Bebidas</title><style>${css}</style></head><body><h1>CONSUMO DE BEBIDAS — ${esc(mes.split('-').reverse().join('/'))}</h1><table><thead><tr><th>Profissional</th>${head}</tr></thead><tbody>${body}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: '#6b6860' }}>Mês:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />
        <button onClick={addColuna} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Plus size={14} /> Adicionar bebida</button>
        <div style={{ flex: 1 }} />
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>
      <p style={{ fontSize: 12, color: '#6b6860', marginBottom: 10 }}>Os nomes vêm <strong>automaticamente do cadastro</strong> de profissionais. Preencha o consumo em cada célula (ex: número de xícaras). Lembre de <strong>Salvar</strong>.</p>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> :
        profsSalao.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>Nenhum profissional cadastrado ainda.</div> : (
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 8 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 360 }}>
              <thead>
                <tr>
                  <th style={{ ...thSt, position: 'sticky', left: 0, background: '#f1eefb', zIndex: 2, minWidth: 130, textAlign: 'left' }}>Profissional</th>
                  {colunas.map(c => (
                    <th key={c.id} style={{ ...thSt, minWidth: 110 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input value={c.nome} onChange={e => renColuna(c.id, e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 800, fontSize: 13, color: '#3b2e7a', outline: 'none' }} />
                        <button onClick={() => delColuna(c.id)} title="Remover" style={{ border: 'none', background: 'transparent', color: '#a99', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profsSalao.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...tdSt, fontWeight: 700, background: '#faf9ff', textAlign: 'left', position: 'sticky', left: 0, zIndex: 1 }}>{p.nome}</td>
                    {colunas.map(c => (
                      <td key={c.id} style={tdSt}>
                        <input value={cells[`${p.id}::${c.id}`] || ''} onChange={e => setCell(p.id, c.id, e.target.value)} style={{ width: '100%', border: '1px solid transparent', borderRadius: 4, padding: '5px 4px', textAlign: 'center', outline: 'none', fontSize: 13 }} onFocus={e => (e.currentTarget.style.border = '2px solid #5b4fcf')} onBlur={e => (e.currentTarget.style.border = '1px solid transparent')} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}

const thSt: React.CSSProperties = { border: '1px solid #ddd6f5', padding: '6px 8px', fontSize: 12, color: '#1a1a1a' }
const tdSt: React.CSSProperties = { border: '1px solid #ece9e2', padding: 2, textAlign: 'center' }
