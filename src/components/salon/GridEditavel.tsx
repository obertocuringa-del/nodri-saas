'use client'

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, Trash2, Bold, Italic, Type, PaintBucket, AlignLeft, AlignCenter, AlignRight, Square } from 'lucide-react'

export type Cell = { t: string; b?: boolean; i?: boolean; cor?: string; tam?: number; bg?: string; cs?: number; rs?: number; h?: boolean; al?: 'left' | 'center' | 'right'; bd?: boolean }
export type Tabela = { titulo: string; cabecalho: Cell[]; linhas: Cell[][]; larguras?: number[]; alturas?: number[] }
export type Doc = { tabelas: Tabela[] }
type Sel = { ti: number; ri: number; ci: number } // ri = -1 → cabeçalho

export const cel = (t = ''): Cell => ({ t })

const CORES = ['#1a1a1a', '#dc2626', '#ea580c', '#16a34a', '#0891b2', '#5b4fcf', '#db2777', '#a16207']
const FUNDOS = ['#fecaca', '#fed7aa', '#fef08a', '#bbf7d0', '#a5f3fc', '#ddd6fe', '#fbcfe8', '#e5e7eb']
const TAMANHOS = [10, 12, 14, 16, 18, 22]
const LARG_PADRAO = 160

function mesAtual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function cssCell(cell: Cell): React.CSSProperties {
  return { fontWeight: cell.b ? 700 : 400, fontStyle: cell.i ? 'italic' : 'normal', color: cell.cor || '#1a1a1a', fontSize: (cell.tam || 13) + 'px', textAlign: cell.al || 'left' }
}
// Borda da célula: quando marcada, fica forte (visível e na impressão)
function bordaCell(cell: Cell, padrao: string): string { return cell.bd ? '2px solid #555' : padrao }

// Textarea que cresce com o conteúdo (quebra de linha automática, nada escondido)
function AutoTextarea({ value, onChange, onFocus, style }: { value: string; onChange: (v: string) => void; onFocus: () => void; style: React.CSSProperties }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }, [value])
  return <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} onFocus={onFocus} rows={1}
    style={{ resize: 'none', overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4, fontFamily: 'inherit', ...style }} />
}

export default function GridEditavel({ chave, defaultDoc, defaultDocFn, mensal, landscape, corTema = '#5b4fcf' }: { chave: string; defaultDoc?: Doc; defaultDocFn?: (mes: string) => Doc; mensal?: boolean; landscape?: boolean; corTema?: string }) {
  const [mes, setMes] = useState(mesAtual())
  const [doc, setDoc] = useState<Doc>(() => defaultDocFn ? defaultDocFn(mesAtual()) : (defaultDoc || { tabelas: [] }))
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<Sel | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)

  const chaveEfetiva = mensal ? `${chave}_${mes}` : chave
  const baseDoc = useCallback(() => defaultDocFn ? defaultDocFn(mes) : JSON.parse(JSON.stringify(defaultDoc || { tabelas: [] })), [mes, defaultDocFn, defaultDoc])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chaveEfetiva)}`).then(r => r.ok ? r.json() : null)
      setDoc(d && Array.isArray(d.tabelas) ? d : baseDoc())
    } catch { setDoc(baseDoc()) }
    setDirty(false); setSel(null); setLoading(false)
  }, [chaveEfetiva, baseDoc])
  useEffect(() => { carregar() }, [carregar])

  function mut(fn: (d: Doc) => void) { setDoc(prev => { const n: Doc = JSON.parse(JSON.stringify(prev)); fn(n); return n }); setDirty(true) }
  const getCell = (s: Sel): Cell | undefined => { const tab = doc.tabelas[s.ti]; if (!tab) return undefined; return s.ri === -1 ? tab.cabecalho[s.ci] : tab.linhas[s.ri]?.[s.ci] }
  function setCellAt(s: Sel, patch: Partial<Cell>) { mut(d => { const tab = d.tabelas[s.ti]; const cell = s.ri === -1 ? tab.cabecalho[s.ci] : tab.linhas[s.ri][s.ci]; Object.assign(cell, patch) }) }
  function aplicar(patch: Partial<Cell> | ((cell: Cell) => Partial<Cell>)) {
    if (!sel) { toast('Clique numa célula primeiro', { icon: '👆' }); return }
    const cur = getCell(sel); if (!cur) return
    setCellAt(sel, typeof patch === 'function' ? patch(cur) : patch)
  }
  function addLinha(ti: number) { mut(d => { const t = d.tabelas[ti]; t.linhas.push(t.cabecalho.map(() => cel(''))) }) }
  function delLinha(ti: number, ri: number) { mut(d => { d.tabelas[ti].linhas.splice(ri, 1) }) }
  function addColuna(ti: number) { mut(d => { const t = d.tabelas[ti]; t.cabecalho.push(cel('Nova coluna')); t.linhas.forEach(l => l.push(cel(''))); if (t.larguras) t.larguras.push(LARG_PADRAO) }) }
  function delColuna(ti: number, ci: number) { mut(d => { const t = d.tabelas[ti]; if (t.cabecalho.length <= 1) return; t.cabecalho.splice(ci, 1); t.linhas.forEach(l => l.splice(ci, 1)); if (t.larguras) t.larguras.splice(ci, 1) }) }
  // ── Mesclar células (colspan/rowspan) ──
  const rowOf = (t: Tabela, r: number) => r === -1 ? t.cabecalho : t.linhas[r]
  function mesclarDir(s: Sel) {
    mut(d => {
      const t = d.tabelas[s.ti]; const anchor = rowOf(t, s.ri)[s.ci]; if (!anchor || anchor.h) return
      const cs = (anchor.cs || 1) + 1, rs = anchor.rs || 1
      if (s.ci + cs - 1 >= rowOf(t, s.ri).length) { return }
      for (let r = s.ri; r < s.ri + rs; r++) { const cell = rowOf(t, r)?.[s.ci + cs - 1]; if (cell) cell.h = true }
      anchor.cs = cs
    })
  }
  function mesclarBaixo(s: Sel) {
    if (s.ri < 0) { toast('Mescle para baixo só nas linhas (não no cabeçalho)', { icon: '👆' }); return }
    mut(d => {
      const t = d.tabelas[s.ti]; const anchor = t.linhas[s.ri][s.ci]; if (!anchor || anchor.h) return
      const cs = anchor.cs || 1, rs = (anchor.rs || 1) + 1
      if (s.ri + rs - 1 >= t.linhas.length) { return }
      for (let c = s.ci; c < s.ci + cs; c++) { const cell = t.linhas[s.ri + rs - 1]?.[c]; if (cell) cell.h = true }
      anchor.rs = rs
    })
  }
  function desmesclar(s: Sel) {
    mut(d => {
      const t = d.tabelas[s.ti]; const anchor = rowOf(t, s.ri)[s.ci]; if (!anchor) return
      const cs = anchor.cs || 1, rs = anchor.rs || 1
      for (let r = s.ri; r < s.ri + rs; r++) for (let c = s.ci; c < s.ci + cs; c++) {
        if (r === s.ri && c === s.ci) continue
        const cell = rowOf(t, r)?.[c]; if (cell) cell.h = false
      }
      anchor.cs = 1; anchor.rs = 1
    })
  }
  function addTabela() { mut(d => { d.tabelas.push({ titulo: 'NOVO BLOCO', cabecalho: [cel('Coluna 1'), cel('Coluna 2'), cel('Coluna 3')], linhas: Array.from({ length: 4 }, () => [cel(''), cel(''), cel('')]), larguras: [220, 320, 180] }) }) }
  function delTabela(ti: number) { if (!confirm('Excluir este bloco inteiro?')) return; mut(d => { d.tabelas.splice(ti, 1) }) }
  const largura = (t: Tabela, ci: number) => t.larguras?.[ci] ?? LARG_PADRAO

  function iniciarResize(ti: number, ci: number, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX
    const startW = largura(doc.tabelas[ti], ci)
    const move = (ev: MouseEvent) => {
      const w = Math.max(60, startW + (ev.clientX - startX))
      setDoc(prev => { const n: Doc = JSON.parse(JSON.stringify(prev)); const t = n.tabelas[ti]; if (!t.larguras) t.larguras = t.cabecalho.map(() => LARG_PADRAO); t.larguras[ci] = w; return n })
      setDirty(true)
    }
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up)
  }

  const altura = (t: Tabela, ri: number) => t.alturas?.[ri]
  function iniciarResizeLinha(ti: number, ri: number, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    const startY = e.clientY
    const startH = altura(doc.tabelas[ti], ri) ?? 40
    const move = (ev: MouseEvent) => {
      const h = Math.max(30, startH + (ev.clientY - startY))
      setDoc(prev => { const n: Doc = JSON.parse(JSON.stringify(prev)); const t = n.tabelas[ti]; if (!t.alturas) t.alturas = t.linhas.map(() => 0); t.alturas[ri] = h; return n })
      setDirty(true)
    }
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up)
  }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: chaveEfetiva, doc }) })
      if (res.ok) { toast.success('Ajustes salvos!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function imprimir() {
    const esc = (v: string) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
    const sty = (cell: Cell) => `font-weight:${cell.b ? 700 : 400};font-style:${cell.i ? 'italic' : 'normal'};color:${cell.cor || '#1a1a1a'};font-size:${cell.tam || 13}px;text-align:${cell.al || 'left'};${cell.bg ? `background:${cell.bg};` : ''}${cell.bd ? 'border:2px solid #333;' : ''}`
    const tabelas = doc.tabelas.map(t => {
      const cols = t.cabecalho.map((_, ci) => `<col style="width:${largura(t, ci)}px">`).join('')
      const sp = (cc: Cell) => `${cc.cs && cc.cs > 1 ? ` colspan="${cc.cs}"` : ''}${cc.rs && cc.rs > 1 ? ` rowspan="${cc.rs}"` : ''}`
      const head = t.cabecalho.map(cc => cc.h ? '' : `<th${sp(cc)} style="${sty(cc)}">${esc(cc.t)}</th>`).join('')
      const body = t.linhas.map(r => `<tr>${r.map(cc => cc.h ? '' : `<td${sp(cc)} style="${sty(cc)}">${esc(cc.t)}</td>`).join('')}</tr>`).join('')
      return `<h2>${esc(t.titulo)}</h2><table><colgroup>${cols}</colgroup><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
    }).join('')
    const css = `@page{size:A4 ${landscape ? 'landscape' : 'portrait'};margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e}.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${corTema};padding-bottom:8px;margin-bottom:14px}.brand{font-size:22px;font-weight:900;color:${corTema}}h2{font-size:14px;color:${corTema};margin:14px 0 6px;text-transform:uppercase;letter-spacing:.5px}table{width:100%;border-collapse:collapse;margin-bottom:6px;table-layout:fixed}th,td{border:1px solid #ccc;padding:5px 8px;font-size:11px;text-align:left;vertical-align:top;word-break:break-word;white-space:pre-wrap}th{background:#f1eefb;color:#3b2e7a}tr{break-inside:avoid}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const titulo = mensal ? `${doc.tabelas[0]?.titulo || 'Lista'} — ${mes.split('-').reverse().join('/')}` : (doc.tabelas[0]?.titulo || 'Lista')
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(titulo)}</title><style>${css}</style></head><body><div class="hd"><div class="brand">NODRI</div><div style="text-align:right;font-size:11px"><strong>${esc(titulo)}</strong><br>${new Date().toLocaleDateString('pt-BR')}</div></div>${tabelas}<script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=1000,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  const selCell = sel ? getCell(sel) : undefined
  const cellBox = (cell: Cell, s: Sel) => {
    const ativo = sel && sel.ti === s.ti && sel.ri === s.ri && sel.ci === s.ci
    return <AutoTextarea value={cell.t} onFocus={() => setSel(s)} onChange={v => setCellAt(s, { t: v })}
      style={{ width: '100%', border: ativo ? `2px solid ${corTema}` : '1px solid transparent', borderRadius: 4, padding: '5px 7px', background: 'transparent', outline: 'none', ...cssCell(cell) }} />
  }

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '10px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <div className="nodri-grid-ctrls" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
        {mensal && <><label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860' }}>Mês:</label><input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #d0cdc7', fontSize: 12 }} /><span style={{ width: 1, height: 20, background: '#eee' }} /></>}
        <button onClick={() => aplicar(c => ({ b: !c.b }))} disabled={!sel} title="Negrito" style={fmtBtn(!!selCell?.b, corTema)}><Bold size={15} /></button>
        <button onClick={() => aplicar(c => ({ i: !c.i }))} disabled={!sel} title="Itálico" style={fmtBtn(!!selCell?.i, corTema)}><Italic size={15} /></button>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', marginLeft: 4 }}>Texto</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {CORES.map(cor => <button key={cor} onClick={() => aplicar({ cor })} disabled={!sel} title={cor} style={{ width: 17, height: 17, borderRadius: '50%', background: cor, border: selCell?.cor === cor ? '2px solid #1a1a1a' : '1px solid #ddd', cursor: sel ? 'pointer' : 'not-allowed', padding: 0 }} />)}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#9ca3af', marginLeft: 4 }}><PaintBucket size={12} />Fundo</span>
        <div style={{ display: 'flex', gap: 3 }}>
          {FUNDOS.map(bg => <button key={bg} onClick={() => aplicar({ bg })} disabled={!sel} title={bg} style={{ width: 17, height: 17, borderRadius: 4, background: bg, border: selCell?.bg === bg ? '2px solid #1a1a1a' : '1px solid #ddd', cursor: sel ? 'pointer' : 'not-allowed', padding: 0 }} />)}
          <button onClick={() => aplicar({ bg: undefined })} disabled={!sel} title="Sem cor de fundo" style={{ width: 17, height: 17, borderRadius: 4, background: '#fff', border: '1px solid #ddd', cursor: sel ? 'pointer' : 'not-allowed', fontSize: 11, lineHeight: '14px', color: '#dc2626' }}>×</button>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 4 }}><Type size={14} color="#9ca3af" />
          <select value={selCell?.tam || 13} onChange={e => aplicar({ tam: Number(e.target.value) })} disabled={!sel} style={{ padding: '5px 6px', borderRadius: 6, border: '1px solid #d0cdc7', fontSize: 12 }}>
            {TAMANHOS.map(t => <option key={t} value={t}>{t}px</option>)}
          </select>
        </span>
        <span style={{ width: 1, height: 20, background: '#eee', margin: '0 2px' }} />
        <button onClick={() => sel && mesclarDir(sel)} disabled={!sel} title="Mesclar com a célula à direita" style={{ ...fmtBtn(false, corTema), fontSize: 15, fontWeight: 800 }}>⬌</button>
        <button onClick={() => sel && mesclarBaixo(sel)} disabled={!sel} title="Mesclar com a célula abaixo" style={{ ...fmtBtn(false, corTema), fontSize: 15, fontWeight: 800 }}>⬍</button>
        <button onClick={() => sel && desmesclar(sel)} disabled={!sel} title="Desmesclar célula" style={{ ...fmtBtn(false, corTema), fontSize: 13, fontWeight: 800 }}>⊟</button>
        <span style={{ width: 1, height: 20, background: '#eee', margin: '0 2px' }} />
        <button onClick={() => aplicar({ al: 'left' })} disabled={!sel} title="Alinhar à esquerda" style={fmtBtn(selCell?.al === 'left' || (!!sel && !selCell?.al), corTema)}><AlignLeft size={15} /></button>
        <button onClick={() => aplicar({ al: 'center' })} disabled={!sel} title="Centralizar" style={fmtBtn(selCell?.al === 'center', corTema)}><AlignCenter size={15} /></button>
        <button onClick={() => aplicar({ al: 'right' })} disabled={!sel} title="Alinhar à direita" style={fmtBtn(selCell?.al === 'right', corTema)}><AlignRight size={15} /></button>
        <button onClick={() => aplicar(c => ({ bd: !c.bd }))} disabled={!sel} title="Borda da célula (ligar/desligar)" style={fmtBtn(!!selCell?.bd, corTema)}><Square size={15} /></button>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir A4</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>
      <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 10px' }}>Clique numa célula para: <strong>negrito/itálico</strong>, <strong>cor</strong> e <strong>fundo</strong>, <strong>alinhar</strong>, <strong>mesclar/desmesclar</strong> e <strong>borda</strong>. Para <strong>aumentar o tamanho</strong>: arraste a faixa roxa à direita do título (largura da coluna) ou a faixa cinza no fim da linha (altura da linha).</p>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: corTema }} /></div> :
        doc.tabelas.map((t, ti) => (
          <div key={ti} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 14, marginBottom: 16, overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input value={t.titulo} onFocus={() => setSel(null)} onChange={e => mut(d => { d.tabelas[ti].titulo = e.target.value })}
                style={{ fontSize: 15, fontWeight: 800, color: corTema, border: 'none', outline: 'none', background: 'transparent', textTransform: 'uppercase', flex: 1 }} />
              {doc.tabelas.length > 1 && <button onClick={() => delTabela(ti)} title="Excluir bloco" style={{ border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}><Trash2 size={12} /> Bloco</button>}
            </div>
            <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: t.cabecalho.reduce((a, _, ci) => a + largura(t, ci), 0) + 38 }}>
              <colgroup>
                {t.cabecalho.map((_, ci) => <col key={ci} style={{ width: largura(t, ci) }} />)}
                <col style={{ width: 38 }} />
              </colgroup>
              <thead>
                <tr>
                  {t.cabecalho.map((cc, ci) => cc.h ? null : (
                    <th key={ci} colSpan={cc.cs || 1} rowSpan={cc.rs || 1} style={{ background: cc.bg || '#f1eefb', border: bordaCell(cc, '1px solid #ddd6f5'), padding: 2, position: 'relative', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>{cellBox(cc, { ti, ri: -1, ci })}<button onClick={() => delColuna(ti, ci)} title="Remover coluna" style={{ border: 'none', background: 'transparent', color: '#a99', cursor: 'pointer', padding: 2, flexShrink: 0 }}>×</button></div>
                      <div onMouseDown={e => iniciarResize(ti, ci, e)} title="Arraste para aumentar/diminuir a largura da coluna" style={{ position: 'absolute', top: 0, right: 0, width: 7, height: '100%', cursor: 'col-resize', zIndex: 5, background: '#d8d4f0' }} />
                    </th>
                  ))}
                  <th style={{ border: '1px solid #ddd6f5', background: '#f1eefb', padding: 0, verticalAlign: 'top' }}><button onClick={() => addColuna(ti)} title="Adicionar coluna" style={{ border: 'none', background: 'transparent', color: corTema, cursor: 'pointer', width: '100%', padding: '6px 0' }}><Plus size={14} /></button></th>
                </tr>
              </thead>
              <tbody>
                {t.linhas.map((linha, ri) => (
                  <tr key={ri}>
                    {linha.map((cc, ci) => cc.h ? null : <td key={ci} colSpan={cc.cs || 1} rowSpan={cc.rs || 1} style={{ border: bordaCell(cc, '1px solid #eee'), padding: 2, background: cc.bg || 'transparent', verticalAlign: 'top', height: altura(t, ri) || undefined }}>{cellBox(cc, { ti, ri, ci })}</td>)}
                    <td style={{ border: '1px solid #eee', textAlign: 'center', padding: 0, verticalAlign: 'top', position: 'relative' }}>
                      <button onClick={() => delLinha(ti, ri)} title="Remover linha" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 6 }}><Trash2 size={13} /></button>
                      <div onMouseDown={e => iniciarResizeLinha(ti, ri, e)} title="Arraste para aumentar/diminuir a altura da linha" style={{ position: 'absolute', left: 0, right: 0, bottom: -3, height: 9, cursor: 'row-resize', zIndex: 5, background: '#e6e2db' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => addLinha(ti)} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px dashed #d0cdc7', background: '#faf9f7', color: '#6b6860', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><Plus size={13} /> Adicionar linha</button>
          </div>
        ))}

      {!loading && <button onClick={addTabela} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: `1px dashed ${corTema}`, background: '#f6f4ff', color: corTema, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Adicionar novo bloco/tabela</button>}
    </div>
  )
}

function fmtBtn(ativo: boolean, cor: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 7, border: ativo ? 'none' : '1px solid #d0cdc7', background: ativo ? cor : '#fff', color: ativo ? '#fff' : '#374151', cursor: 'pointer' }
}

