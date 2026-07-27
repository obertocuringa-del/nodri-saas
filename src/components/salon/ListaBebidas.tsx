'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, X } from 'lucide-react'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { quinzenaDeHoje, labelQuinzena } from '@/lib/quinzena'

interface ProfSalao { id: string; nome: string }
interface ColBebida { id: string; nome: string; preco?: string }
interface Doc { colunas: ColBebida[]; cells: Record<string, string> }

const PADRAO: ColBebida[] = [{ id: 'cafe', nome: 'Café', preco: '' }, { id: 'cha', nome: 'Chá', preco: '' }, { id: 'capuccino', nome: 'Capuccino', preco: '' }]
function mesAtual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const rid = () => Math.random().toString(36).slice(2, 8)
function parseValor(s: string): number {
  const n = Number(String(s || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}
function fmtBRL(n: number) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

// Não listar buckets administrativos (não são profissionais que consomem)
const ADMIN_RE = /(administra|financeir|ger[êe]nci|recep)/i
export default function ListaBebidas({ profsSalao }: { profsSalao: ProfSalao[] }) {
  const profsLista = (profsSalao || []).filter(p => !ADMIN_RE.test(p.nome || ''))
  const [mes, setMes] = useState(mesAtual())
  const [quinzena, setQuinzena] = useState<1 | 2>(quinzenaDeHoje())
  const [colunas, setColunas] = useState<ColBebida[]>(PADRAO)
  const [cells, setCells] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Bebidas') // avisa "Deseja salvar?" antes de sair sem salvar

  const chaveQ = (q: number) => `bebidas_${mes}_q${q}`

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const get = (chave: string): Promise<Doc | null> => fetch(`/api/salon/grid?chave=${chave}`).then(r => r.ok ? r.json() : null).catch(() => null)
      const d = await get(chaveQ(quinzena))
      if (d && Array.isArray(d.colunas) && d.colunas.length) {
        setColunas(d.colunas.map(c => ({ ...c, preco: c.preco || '' }))); setCells(d.cells || {})
      } else {
        // Grade da quinzena ainda não existe. Herda a LISTA de bebidas + preços
        // (contagens zeradas). Na transição, a 1ª quinzena recebe o que já
        // existia na grade mensal antiga (bebidas_${mes}); a 2ª começa limpa.
        const outra = await get(chaveQ(quinzena === 1 ? 2 : 1))
        const legado = await get(`bebidas_${mes}`)
        if (quinzena === 1 && legado && Array.isArray(legado.colunas) && legado.colunas.length && Object.keys(legado.cells || {}).length) {
          setColunas(legado.colunas.map(c => ({ ...c, preco: c.preco || '' }))); setCells(legado.cells || {})
        } else {
          const template = (outra && Array.isArray(outra.colunas) && outra.colunas.length) ? outra
            : (legado && Array.isArray(legado.colunas) && legado.colunas.length) ? legado : null
          setColunas(template ? template.colunas.map(c => ({ ...c, preco: c.preco || '' })) : PADRAO)
          setCells({})
        }
      }
    } catch { setColunas(PADRAO); setCells({}) }
    setDirty(false); setLoading(false)
  }, [mes, quinzena])
  useEffect(() => { carregar() }, [carregar])

  function setCell(profId: string, colId: string, v: string) { setCells(p => ({ ...p, [`${profId}::${colId}`]: v })); setDirty(true) }
  function incCell(profId: string, colId: string, delta: number) {
    const key = `${profId}::${colId}`
    setCells(p => { const nv = Math.max(0, (Number(p[key]) || 0) + delta); return { ...p, [key]: nv ? String(nv) : '' } }); setDirty(true)
  }
  function addColuna() { setColunas(c => [...c, { id: rid(), nome: 'Nova bebida', preco: '' }]); setDirty(true) }
  function delColuna(id: string) { setColunas(c => c.length <= 1 ? c : c.filter(x => x.id !== id)); setDirty(true) }
  function renColuna(id: string, nome: string) { setColunas(c => c.map(x => x.id === id ? { ...x, nome } : x)); setDirty(true) }
  function setPreco(id: string, preco: string) { setColunas(c => c.map(x => x.id === id ? { ...x, preco } : x)); setDirty(true) }
  function trocarQuinzena(q: 1 | 2) {
    if (q === quinzena) return
    if (dirty && !confirm('Você tem alterações não salvas nesta quinzena. Trocar mesmo assim? (as alterações serão descartadas)')) return
    setQuinzena(q)
  }

  // Valor de uma célula = quantidade × preço da bebida
  const valorCell = (profId: string, col: ColBebida) => (Number(cells[`${profId}::${col.id}`]) || 0) * parseValor(col.preco || '')
  const totalProf = (profId: string) => colunas.reduce((s, c) => s + valorCell(profId, c), 0)
  const totalColuna = (col: ColBebida) => profsLista.reduce((s, p) => s + valorCell(p.id, col), 0)
  const totalGeral = profsLista.reduce((s, p) => s + totalProf(p.id), 0)
  const temPreco = colunas.some(c => parseValor(c.preco || '') > 0)

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: chaveQ(quinzena), doc: { colunas, cells } }) })
      if (res.ok) { toast.success('Salvo!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function imprimir() {
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const head = colunas.map(c => `<th>${esc(c.nome)}${parseValor(c.preco || '') > 0 ? `<br><span class="pr">R$ ${fmtBRL(parseValor(c.preco || ''))}</span>` : ''}</th>`).join('')
    const body = profsLista.map(p => `<tr><td class="nm">${esc(p.nome)}</td>${colunas.map(c => `<td>${esc(cells[`${p.id}::${c.id}`] || '')}</td>`).join('')}${temPreco ? `<td class="tot">R$ ${fmtBRL(totalProf(p.id))}</td>` : ''}</tr>`).join('')
    const foot = temPreco ? `<tfoot><tr><td class="nm">TOTAL</td>${colunas.map(c => `<td>R$ ${fmtBRL(totalColuna(c))}</td>`).join('')}<td class="tot">R$ ${fmtBRL(totalGeral)}</td></tr></tfoot>` : ''
    const css = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px}h1{text-align:center;font-size:15px;color:#5b4fcf;margin-bottom:8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #f0ede6;padding:5px 7px;text-align:center}th{background:#f6f4ff;color:#5b4fcf;border-bottom:2px solid #5b4fcf;font-size:10px;text-transform:uppercase;letter-spacing:.3px}.pr{font-size:9px;color:#16a34a;font-weight:700}.nm{text-align:left;font-weight:700;background:#faf9f7}.tot{font-weight:800;color:#16a34a;background:#f0fdf4}tfoot td{font-weight:800;background:#f6f4ff;color:#5b4fcf;border-top:2px solid #5b4fcf}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Consumo de Bebidas</title><style>${css}</style></head><body><h1>CONSUMO DE BEBIDAS — ${esc(quinzena)}ª QUINZENA (${esc(labelQuinzena(mes, quinzena))})</h1><table><thead><tr><th>Profissional</th>${head}${temPreco ? '<th>Total devido</th>' : ''}</tr></thead><tbody>${body}</tbody>${foot}</table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: '#6b6860' }}>Mês:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />
        <div style={{ display: 'inline-flex', border: '1.5px solid #d0cdc7', borderRadius: 8, overflow: 'hidden' }}>
          {([1, 2] as const).map(q => (
            <button key={q} onClick={() => trocarQuinzena(q)}
              style={{ padding: '7px 11px', border: 'none', background: quinzena === q ? '#5b4fcf' : '#fff', color: quinzena === q ? '#fff' : '#6b6860', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
              {q}ª quinzena
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#5b4fcf', background: '#f0eefb', borderRadius: 20, padding: '4px 11px' }}>{labelQuinzena(mes, quinzena)}</span>
        <button onClick={addColuna} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Plus size={14} /> Adicionar bebida</button>
        <div style={{ flex: 1 }} />
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>
      <p style={{ fontSize: 12, color: '#6b6860', marginBottom: 10 }}>Os nomes vêm <strong>automaticamente do cadastro</strong> de profissionais. Preencha o consumo da <strong>{quinzena}ª quinzena ({labelQuinzena(mes, quinzena)})</strong> e cadastre o <strong>valor de cada bebida</strong> (no cabeçalho) — o sistema soma o <strong>total devido</strong> de cada um. Cada quinzena é separada e fica no histórico. Lembre de <strong>Salvar</strong>.</p>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> :
        profsLista.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>Nenhum profissional cadastrado ainda.</div> : (
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 8 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 360 }}>
              <thead>
                <tr>
                  <th style={{ ...thSt, position: 'sticky', left: 0, background: '#faf9f7', zIndex: 2, minWidth: 130, textAlign: 'left' }}>Profissional</th>
                  {colunas.map(c => (
                    <th key={c.id} style={{ ...thSt, minWidth: 118 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input value={c.nome} onChange={e => renColuna(c.id, e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 800, fontSize: 13, color: '#374151', outline: 'none' }} />
                        <button onClick={() => delColuna(c.id)} title="Remover" style={{ border: 'none', background: 'transparent', color: '#a99', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>R$</span>
                        <input value={c.preco || ''} onChange={e => setPreco(c.id, e.target.value)} placeholder="0,00" inputMode="decimal"
                          style={{ width: 58, border: '1px solid #d8e8d8', borderRadius: 6, background: '#f0fdf4', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#15803d', outline: 'none', padding: '3px 4px' }} />
                      </div>
                    </th>
                  ))}
                  {temPreco && <th style={{ ...thSt, minWidth: 110, background: '#f0fdf4', color: '#15803d' }}>Total devido</th>}
                </tr>
              </thead>
              <tbody>
                {profsLista.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...tdSt, fontWeight: 700, background: '#fff', textAlign: 'left', position: 'sticky', left: 0, zIndex: 1 }}>{p.nome}</td>
                    {colunas.map(c => {
                      const qt = Number(cells[`${p.id}::${c.id}`]) || 0
                      const val = valorCell(p.id, c)
                      return (
                        <td key={c.id} style={tdSt}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            <button onClick={() => incCell(p.id, c.id, -1)} disabled={qt === 0} style={{ ...stepBtn, opacity: qt === 0 ? .4 : 1 }}>−</button>
                            <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 800, fontSize: 15, color: qt ? '#5b4fcf' : '#c4c0b8' }}>{qt}</span>
                            <button onClick={() => incCell(p.id, c.id, 1)} style={stepBtn}>+</button>
                          </div>
                          {val > 0 && <div style={{ fontSize: 10.5, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>R$ {fmtBRL(val)}</div>}
                        </td>
                      )
                    })}
                    {temPreco && <td style={{ ...tdSt, background: '#f0fdf4' }}><strong style={{ fontSize: 14, color: '#15803d' }}>R$ {fmtBRL(totalProf(p.id))}</strong></td>}
                  </tr>
                ))}
              </tbody>
              {temPreco && (
                <tfoot>
                  <tr>
                    <td style={{ ...tdSt, fontWeight: 800, textAlign: 'left', background: '#faf9f7', position: 'sticky', left: 0, zIndex: 1 }}>TOTAL</td>
                    {colunas.map(c => <td key={c.id} style={{ ...tdSt, fontWeight: 800, color: '#5b4fcf', background: '#faf9f7' }}>R$ {fmtBRL(totalColuna(c))}</td>)}
                    <td style={{ ...tdSt, fontWeight: 900, color: '#15803d', background: '#e9fbef' }}>R$ {fmtBRL(totalGeral)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
    </div>
  )
}

const thSt: React.CSSProperties = { borderBottom: '2px solid #e8e6e0', padding: '10px 8px', fontSize: 11, fontWeight: 700, color: '#6b6860', background: '#faf9f7', textTransform: 'uppercase', letterSpacing: '.4px' }
const tdSt: React.CSSProperties = { borderBottom: '1px solid #f0eee8', padding: '6px 4px', textAlign: 'center' }
const stepBtn: React.CSSProperties = { width: 26, height: 26, borderRadius: 7, border: '1px solid #d8d4f0', background: '#f5f3ff', color: '#5b4fcf', fontSize: 16, fontWeight: 800, cursor: 'pointer', lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
