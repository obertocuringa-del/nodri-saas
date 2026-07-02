'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, Trash2, Bold, Italic, Type } from 'lucide-react'

type Cell = { t: string; b?: boolean; i?: boolean; cor?: string; tam?: number }
type Tabela = { titulo: string; cabecalho: Cell[]; linhas: Cell[][] }
type Doc = { tabelas: Tabela[] }
type Sel = { ti: number; ri: number; ci: number } // ri = -1 → célula do cabeçalho

const c = (t = ''): Cell => ({ t })

const PADRAO: Doc = {
  tabelas: [
    {
      titulo: 'MATERIAIS PROFISSIONAIS',
      cabecalho: [c('Material'), c('Qtd'), c('Quem fornece'), c('Observação')],
      linhas: [
        [c('Tesoura de corte'), c('1'), c('Profissional'), c('')],
        [c('Secador'), c('1'), c('Salão'), c('')],
        [c('Prancha / Babyliss'), c('1'), c('Profissional'), c('')],
        [c('Escovas e pentes'), c('—'), c('Profissional'), c('')],
        [c('Capa de corte'), c('2'), c('Salão'), c('')],
        [c('Produtos de coloração'), c('—'), c('Profissional'), c('')],
      ],
    },
    {
      titulo: 'MATERIAIS MANICURES',
      cabecalho: [c('Material'), c('Qtd'), c('Quem fornece'), c('Observação')],
      linhas: [
        [c('Alicate'), c('1'), c('Profissional'), c('')],
        [c('Esmaltes'), c('—'), c('Profissional'), c('')],
        [c('Acetona / removedor'), c('—'), c('Salão'), c('')],
        [c('Lixas e palitos'), c('—'), c('Profissional'), c('')],
        [c('Toalhas'), c('4'), c('Salão'), c('')],
        [c('Alcool 70%'), c('—'), c('Salão'), c('')],
      ],
    },
  ],
}

const CORES = ['#1a1a1a', '#dc2626', '#ea580c', '#16a34a', '#0891b2', '#5b4fcf', '#db2777', '#a16207']
const TAMANHOS = [10, 12, 14, 16, 18, 22]

function cssCell(cell: Cell): React.CSSProperties {
  return { fontWeight: cell.b ? 700 : 400, fontStyle: cell.i ? 'italic' : 'normal', color: cell.cor || '#1a1a1a', fontSize: (cell.tam || 13) + 'px' }
}

export default function MateriaisTrabalho() {
  const [doc, setDoc] = useState<Doc>(PADRAO)
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<Sel | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const d = await fetch('/api/salon/materiais').then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.tabelas)) setDoc(d)
    } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  function mut(fn: (d: Doc) => void) {
    setDoc(prev => { const n: Doc = JSON.parse(JSON.stringify(prev)); fn(n); return n }); setDirty(true)
  }
  const getCell = (s: Sel): Cell | undefined => {
    const tab = doc.tabelas[s.ti]; if (!tab) return undefined
    return s.ri === -1 ? tab.cabecalho[s.ci] : tab.linhas[s.ri]?.[s.ci]
  }
  function setCellAt(s: Sel, patch: Partial<Cell>) {
    mut(d => {
      const tab = d.tabelas[s.ti]; const cell = s.ri === -1 ? tab.cabecalho[s.ci] : tab.linhas[s.ri][s.ci]
      Object.assign(cell, patch)
    })
  }
  function aplicar(patch: Partial<Cell> | ((cell: Cell) => Partial<Cell>)) {
    if (!sel) { toast('Clique numa célula primeiro', { icon: '👆' }); return }
    const cur = getCell(sel); if (!cur) return
    setCellAt(sel, typeof patch === 'function' ? patch(cur) : patch)
  }

  function addLinha(ti: number) { mut(d => { const t = d.tabelas[ti]; t.linhas.push(t.cabecalho.map(() => c(''))) }) }
  function delLinha(ti: number, ri: number) { mut(d => { d.tabelas[ti].linhas.splice(ri, 1) }) }
  function addColuna(ti: number) { mut(d => { const t = d.tabelas[ti]; t.cabecalho.push(c('Nova coluna')); t.linhas.forEach(l => l.push(c(''))) }) }
  function delColuna(ti: number, ci: number) { mut(d => { const t = d.tabelas[ti]; if (t.cabecalho.length <= 1) return; t.cabecalho.splice(ci, 1); t.linhas.forEach(l => l.splice(ci, 1)) }) }
  function addTabela() { mut(d => { d.tabelas.push({ titulo: 'NOVA TABELA', cabecalho: [c('Coluna 1'), c('Coluna 2')], linhas: [[c(''), c('')]] }) }) }
  function delTabela(ti: number) { if (!confirm('Excluir esta tabela inteira?')) return; mut(d => { d.tabelas.splice(ti, 1) }) }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/materiais', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc) })
      if (res.ok) { toast.success('Ajustes salvos!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function imprimir() {
    const esc = (v: string) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const sty = (cell: Cell) => `font-weight:${cell.b ? 700 : 400};font-style:${cell.i ? 'italic' : 'normal'};color:${cell.cor || '#1a1a1a'};font-size:${cell.tam || 13}px`
    const tabelas = doc.tabelas.map(t => {
      const head = t.cabecalho.map(cc => `<th style="${sty(cc)}">${esc(cc.t)}</th>`).join('')
      const body = t.linhas.map(r => `<tr>${r.map(cc => `<td style="${sty(cc)}">${esc(cc.t)}</td>`).join('')}</tr>`).join('')
      return `<h2>${esc(t.titulo)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
    }).join('')
    const css = `@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e}.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #ec4899;padding-bottom:8px;margin-bottom:14px}.brand{font-size:22px;font-weight:900;color:#ec4899}h2{font-size:14px;color:#ec4899;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.5px}table{width:100%;border-collapse:collapse;margin-bottom:6px;break-inside:avoid}th{background:#fce7f3;color:#9d174d;text-align:left;padding:7px 10px;border:1px solid #f3c5dc;font-size:12px}td{padding:6px 10px;border:1px solid #eee}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Materiais para Trabalho</title><style>${css}</style></head><body><div class="hd"><div class="brand">NODRI</div><div style="text-align:right;font-size:11px"><strong>Materiais para Trabalho</strong><br>${new Date().toLocaleDateString('pt-BR')}</div></div>${tabelas}<script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=1000,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#ec4899' }} /></div>

  const selCell = sel ? getCell(sel) : undefined
  const cellBox = (cell: Cell, s: Sel) => {
    const ativo = sel && sel.ti === s.ti && sel.ri === s.ri && sel.ci === s.ci
    return (
      <input value={cell.t} onFocus={() => setSel(s)} onChange={e => setCellAt(s, { t: e.target.value })}
        style={{ width: '100%', border: ativo ? '2px solid #ec4899' : '1px solid transparent', borderRadius: 4, padding: '5px 7px', background: 'transparent', outline: 'none', ...cssCell(cell) }} />
    )
  }

  return (
    <div>
      {/* Barra de ferramentas fixa */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '10px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginRight: 2 }}>Formatar célula:</span>
        <button onClick={() => aplicar(cell => ({ b: !cell.b }))} disabled={!sel} title="Negrito" style={fmtBtn(!!selCell?.b)}><Bold size={15} /></button>
        <button onClick={() => aplicar(cell => ({ i: !cell.i }))} disabled={!sel} title="Itálico" style={fmtBtn(!!selCell?.i)}><Italic size={15} /></button>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', padding: '0 4px', borderLeft: '1px solid #eee', borderRight: '1px solid #eee', margin: '0 2px' }}>
          {CORES.map(cor => <button key={cor} onClick={() => aplicar({ cor })} disabled={!sel} title={cor} style={{ width: 18, height: 18, borderRadius: '50%', background: cor, border: selCell?.cor === cor ? '2px solid #1a1a1a' : '1px solid #ddd', cursor: sel ? 'pointer' : 'not-allowed', padding: 0 }} />)}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Type size={14} color="#9ca3af" />
          <select value={selCell?.tam || 13} onChange={e => aplicar({ tam: Number(e.target.value) })} disabled={!sel} style={{ padding: '5px 6px', borderRadius: 6, border: '1px solid #d0cdc7', fontSize: 12 }}>
            {TAMANHOS.map(t => <option key={t} value={t}>{t}px</option>)}
          </select>
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir A4</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar ajustes</>}</button>
      </div>

      <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 14px' }}>Clique em qualquer célula para editar o texto. Selecione uma célula e use a barra acima para <strong>negrito, itálico, cor e tamanho</strong>. Adicione/remova linhas e colunas pelos botões. Lembre de <strong>Salvar ajustes</strong>. Impressão sai em <strong>A4 horizontal</strong>.</p>

      {doc.tabelas.map((t, ti) => (
        <div key={ti} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 14, marginBottom: 16, overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <input value={t.titulo} onFocus={() => setSel(null)} onChange={e => mut(d => { d.tabelas[ti].titulo = e.target.value })}
              style={{ fontSize: 15, fontWeight: 800, color: '#ec4899', border: 'none', outline: 'none', background: 'transparent', textTransform: 'uppercase', flex: 1, minWidth: 120 }} />
            <button onClick={() => delTabela(ti)} title="Excluir tabela" style={{ border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Trash2 size={12} /> Tabela</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr>
                {t.cabecalho.map((cc, ci) => (
                  <th key={ci} style={{ background: '#faf9f7', border: '1px solid #eceae4', borderBottom: '2px solid #e8e6e0', padding: 2, verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {cellBox(cc, { ti, ri: -1, ci })}
                      <button onClick={() => delColuna(ti, ci)} title="Remover coluna" style={{ border: 'none', background: 'transparent', color: '#d16ba5', cursor: 'pointer', padding: 2, flexShrink: 0 }}>×</button>
                    </div>
                  </th>
                ))}
                <th style={{ width: 38, border: '1px solid #eceae4', borderBottom: '2px solid #e8e6e0', background: '#faf9f7', padding: 0 }}>
                  <button onClick={() => addColuna(ti)} title="Adicionar coluna" style={{ border: 'none', background: 'transparent', color: '#ec4899', cursor: 'pointer', width: '100%', height: '100%', padding: '6px 0' }}><Plus size={14} /></button>
                </th>
              </tr>
            </thead>
            <tbody>
              {t.linhas.map((linha, ri) => (
                <tr key={ri}>
                  {linha.map((cc, ci) => (
                    <td key={ci} style={{ border: '1px solid #f0eee8', padding: 2 }}>{cellBox(cc, { ti, ri, ci })}</td>
                  ))}
                  <td style={{ border: '1px solid #f0eee8', textAlign: 'center', padding: 0 }}>
                    <button onClick={() => delLinha(ti, ri)} title="Remover linha" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: '6px' }}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => addLinha(ti)} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px dashed #d0cdc7', background: '#faf9f7', color: '#6b6860', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><Plus size={13} /> Adicionar linha</button>
        </div>
      ))}

      <button onClick={addTabela} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1px dashed #ec4899', background: '#fdf2f8', color: '#be185d', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Adicionar nova tabela</button>
    </div>
  )
}

function fmtBtn(ativo: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 7, border: ativo ? 'none' : '1px solid #d0cdc7', background: ativo ? '#ec4899' : '#fff', color: ativo ? '#fff' : '#374151', cursor: 'pointer' }
}
