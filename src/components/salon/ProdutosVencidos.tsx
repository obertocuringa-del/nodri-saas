'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Plus, X, Sparkles, Filter, Trash2, CheckSquare, Square, Printer } from 'lucide-react'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

// ── Produtos e tintas parados na prateleira ─────────────────────────────────
//
// Tinta e produto moram na MESMA lista, com uma coluna que muda de significado
// conforme o tipo: em tinta é a numeração, em produto é o tipo do produto.
// Separar em duas tabelas obrigaria a dosadora a decidir onde lançar antes de
// lançar, e a filtrar duas vezes por marca — que é o filtro que ela usa.

interface Item {
  id: string
  tipo: 'tinta' | 'produto'
  numeracao: string      // tinta: "7.1", "louro escuro"
  tipoProduto: string    // produto: "shampoo", "máscara"
  marca: string
  quantidade: string
  observacao: string
}

interface Acao {
  titulo?: string
  itens_envolvidos?: string
  como_fazer?: string
  prazo?: string
  retorno?: string
}
interface RespostaIA {
  resumo?: string
  prejuizo_estimado?: string
  acoes?: Acao[]
  descarte?: { item?: string; motivo?: string }[]
  evitar_repetir?: string[]
  escopo?: string
  analisados?: number
}

const COR = '#5b4fcf'
const rid = () => Math.random().toString(36).slice(2, 9)

const novoItem = (tipo: Item['tipo'] = 'tinta'): Item => ({
  id: rid(), tipo, numeracao: '', tipoProduto: '', marca: '', quantidade: '', observacao: '',
})

const inp: React.CSSProperties = {
  width: '100%', border: 'none', background: 'transparent', outline: 'none',
  fontFamily: 'inherit', fontSize: 13, padding: '6px 4px',
}

export default function ProdutosVencidos({ chave = 'produtos_vencidos' }: { chave?: string }) {
  const [itens, setItens] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [filtroMarca, setFiltroMarca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'' | 'tinta' | 'produto'>('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [iaCarregando, setIaCarregando] = useState<'' | 'todos' | 'selecionados'>('')
  const [ia, setIa] = useState<RespostaIA | null>(null)

  useGuardaSalvar(dirty, 'Produtos Vencidos')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chave)}`).then(r => r.ok ? r.json() : null)
      setItens(Array.isArray(d?.itens) ? d.itens : [])
      setDirty(false)
    } catch { setItens([]); setDirty(false) }
    setLoading(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  function mut(fn: (v: Item[]) => Item[]) { setItens(prev => fn(prev)); setDirty(true) }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave, doc: { itens } }),
      })
      if (res.ok) { toast.success('Lista salva!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function add(tipo: Item['tipo']) { mut(v => [...v, novoItem(tipo)]) }
  function edit(id: string, patch: Partial<Item>) { mut(v => v.map(i => i.id === id ? { ...i, ...patch } : i)) }
  function del(id: string) {
    mut(v => v.filter(i => i.id !== id))
    setSel(s => { const n = new Set(s); n.delete(id); return n })
  }

  const marcas = useMemo(
    () => Array.from(new Set(itens.map(i => i.marca.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [itens])

  const visiveis = useMemo(() => itens.filter(i =>
    (!filtroMarca || i.marca.trim().toLowerCase() === filtroMarca.toLowerCase()) &&
    (!filtroTipo || i.tipo === filtroTipo)
  ), [itens, filtroMarca, filtroTipo])

  // Só conta o que está selecionado E aparecendo: selecionar, filtrar e mandar
  // para a IA um item que sumiu da tela seria o tipo de surpresa que faz a
  // pessoa desconfiar do resultado.
  const selVisiveis = useMemo(() => visiveis.filter(i => sel.has(i.id)), [visiveis, sel])
  const todosVisiveisMarcados = visiveis.length > 0 && selVisiveis.length === visiveis.length

  function alternarTodos() {
    setSel(s => {
      const n = new Set(s)
      if (todosVisiveisMarcados) visiveis.forEach(i => n.delete(i.id))
      else visiveis.forEach(i => n.add(i.id))
      return n
    })
  }

  const totalUn = (lista: Item[]) => lista.reduce((s, i) => s + (Number(i.quantidade) || 0), 0)

  async function pedirIA(escopo: 'todos' | 'selecionados') {
    const base = escopo === 'selecionados' ? selVisiveis : itens
    const limpos = base.filter(i => i.marca.trim() || i.numeracao.trim() || i.tipoProduto.trim())
    if (!limpos.length) {
      toast.error(escopo === 'selecionados'
        ? 'Selecione ao menos um item preenchido.'
        : 'Cadastre ao menos um item antes de pedir sugestões.')
      return
    }
    setIaCarregando(escopo)
    setIa(null)
    try {
      const res = await fetch('/api/salon/produtos-vencidos/ia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escopo,
          itens: limpos.map(i => ({
            tipo: i.tipo, numeracao: i.numeracao, tipoProduto: i.tipoProduto,
            marca: i.marca, quantidade: i.quantidade, observacao: i.observacao,
          })),
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Falha na IA')
      setIa(j)
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível gerar as sugestões')
    } finally {
      setIaCarregando('')
    }
  }

  function imprimirIA() {
    if (!ia) return
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const acoes = (ia.acoes || []).map((a, i) => `
      <div class="ac">
        <h3>${i + 1}. ${esc(a.titulo)} <span class="pz">${esc(a.prazo)}</span></h3>
        <p><b>Itens:</b> ${esc(a.itens_envolvidos)}</p>
        <p><b>Como fazer:</b> ${esc(a.como_fazer)}</p>
        <p><b>Retorno:</b> ${esc(a.retorno)}</p>
      </div>`).join('')
    const desc = (ia.descarte || []).map(d => `<li><b>${esc(d.item)}</b> — ${esc(d.motivo)}</li>`).join('')
    const evi = (ia.evitar_repetir || []).map(e => `<li>${esc(e)}</li>`).join('')
    const css = `@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:12px;line-height:1.5}
      h1{font-size:18px;color:${COR};margin-bottom:4px}
      .sub{color:#888;font-size:11px;margin-bottom:14px}
      h2{font-size:13px;color:${COR};margin:16px 0 7px;border-bottom:1.5px solid ${COR};padding-bottom:4px;text-transform:uppercase}
      .ac{border:1px solid #e8e6e0;border-radius:8px;padding:10px 12px;margin-bottom:9px}
      .ac h3{font-size:13px;margin-bottom:5px}
      .pz{font-size:10px;background:#f0eefb;color:${COR};padding:2px 8px;border-radius:99px;margin-left:6px}
      .ac p{margin-bottom:3px}
      li{margin-bottom:4px;margin-left:16px}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Plano de ação — produtos parados</title><style>${css}</style></head><body>
      <h1>Produtos parados — plano de ação</h1>
      <div class="sub">${esc(ia.analisados)} itens analisados · gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
      <p>${esc(ia.resumo)}</p>
      ${ia.prejuizo_estimado ? `<p style="margin-top:6px"><b>Parado hoje:</b> ${esc(ia.prejuizo_estimado)}</p>` : ''}
      <h2>Ações</h2>${acoes}
      ${desc ? `<h2>Descarte</h2><ul>${desc}</ul>` : ''}
      ${evi ? `<h2>Para não repetir</h2><ul>${evi}</ul>` : ''}
      <script>window.onload=function(){window.print()}<\/script></body></html>`
    const w = window.open('', '_blank', 'width=1000,height=700'); if (!w) return
    w.document.write(html); w.document.close(); w.focus()
  }

  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
    borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Loader2 size={24} className="animate-spin" style={{ color: COR }} />
    </div>
  )

  return (
    <div>
      <style>{`
        .pv-tab th { text-align:left; font-size:11px; font-weight:800; color:#6b6860;
          text-transform:uppercase; letter-spacing:.3px; padding:8px 6px; background:#faf9f7; }
        .pv-tab td { border-bottom:1px solid #f0eee8; vertical-align:top; padding:2px 6px; }
        .pv-tab input:focus, .pv-tab select:focus { background:#f6f4ff; border-radius:6px; }
      `}</style>

      {/* ── Barra de ações ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0',
                    borderRadius: 12, padding: '10px 12px', marginBottom: 14, display: 'flex',
                    alignItems: 'center', gap: 8, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <button onClick={() => add('tinta')} style={{ ...btn, background: COR, color: '#fff' }}>
          <Plus size={14} /> Tinta
        </button>
        <button onClick={() => add('produto')} style={{ ...btn, background: '#0891b2', color: '#fff' }}>
          <Plus size={14} /> Produto
        </button>
        <div style={{ flex: 1 }} />
        {dirty && !salvando && <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Alterações não salvas</span>}
        <button onClick={salvar} disabled={salvando}
          style={{ ...btn, background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff' }}>
          {salvando ? '...' : <><Save size={14} /> Salvar</>}
        </button>
      </div>

      {/* ── Filtros ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12,
                    background: '#faf9f7', border: '1px solid #eceae4', borderRadius: 10, padding: '9px 12px' }}>
        <Filter size={14} style={{ color: COR }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: '#6b6860' }}>Marca:</span>
        <select value={filtroMarca} onChange={e => setFiltroMarca(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #d0cdc7', fontSize: 13, background: '#fff' }}>
          <option value="">todas ({marcas.length})</option>
          {marcas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#6b6860', marginLeft: 6 }}>Tipo:</span>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)}
          style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #d0cdc7', fontSize: 13, background: '#fff' }}>
          <option value="">tudo</option>
          <option value="tinta">só tintas</option>
          <option value="produto">só produtos</option>
        </select>
        {(filtroMarca || filtroTipo) && (
          <button onClick={() => { setFiltroMarca(''); setFiltroTipo('') }}
            style={{ fontSize: 12, color: COR, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
            limpar filtro
          </button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#6b6860' }}>
          <b>{visiveis.length}</b> {visiveis.length === 1 ? 'item' : 'itens'} · <b>{totalUn(visiveis)}</b> un.
          {selVisiveis.length > 0 && <> · <b style={{ color: COR }}>{selVisiveis.length} selecionado{selVisiveis.length === 1 ? '' : 's'}</b></>}
        </span>
      </div>

      {/* ── Tabela ── */}
      {itens.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14,
                      background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
          Nenhum item na lista. Use <strong style={{ color: COR }}>+ Tinta</strong> ou <strong style={{ color: '#0891b2' }}>+ Produto</strong> para começar.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="pv-tab" style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: 38 }}>
                    <button onClick={alternarTodos} title="Selecionar todos os visíveis"
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: COR, padding: 0 }}>
                      {todosVisiveisMarcados ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </th>
                  <th style={{ width: 110 }}>Tipo</th>
                  <th style={{ width: 190 }}>Numeração / Produto</th>
                  <th style={{ width: 160 }}>Marca</th>
                  <th style={{ width: 90 }}>Qtd.</th>
                  <th>Observação</th>
                  <th style={{ width: 34 }}></th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map(i => {
                  const marcado = sel.has(i.id)
                  return (
                    <tr key={i.id} style={{ background: marcado ? '#f6f4ff' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => setSel(s => { const n = new Set(s); n.has(i.id) ? n.delete(i.id) : n.add(i.id); return n })}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: marcado ? COR : '#c9c6c0', padding: 0 }}>
                          {marcado ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </td>
                      <td>
                        <select value={i.tipo} onChange={e => edit(i.id, { tipo: e.target.value as Item['tipo'] })}
                          style={{ ...inp, fontWeight: 700, color: i.tipo === 'tinta' ? COR : '#0891b2', cursor: 'pointer' }}>
                          <option value="tinta">Tinta</option>
                          <option value="produto">Produto</option>
                        </select>
                      </td>
                      <td>
                        {i.tipo === 'tinta' ? (
                          <input value={i.numeracao} onChange={e => edit(i.id, { numeracao: e.target.value })}
                            placeholder="Ex: 7.1, 6.0, louro escuro" style={inp} />
                        ) : (
                          <input value={i.tipoProduto} onChange={e => edit(i.id, { tipoProduto: e.target.value })}
                            placeholder="Ex: shampoo, máscara, óleo" style={inp} />
                        )}
                      </td>
                      <td>
                        <input value={i.marca} onChange={e => edit(i.id, { marca: e.target.value })}
                          list="pv-marcas" placeholder="Marca" style={inp} />
                      </td>
                      <td>
                        <input value={i.quantidade} onChange={e => edit(i.id, { quantidade: e.target.value.replace(/[^\d]/g, '') })}
                          inputMode="numeric" placeholder="0" style={{ ...inp, textAlign: 'center', fontWeight: 700 }} />
                      </td>
                      <td>
                        <input value={i.observacao} onChange={e => edit(i.id, { observacao: e.target.value })}
                          placeholder="Tem muito parado? Está vencido? Desde quando?" style={inp} />
                      </td>
                      <td>
                        <button onClick={() => del(i.id)} title="Remover"
                          style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}>
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <datalist id="pv-marcas">{marcas.map(m => <option key={m} value={m} />)}</datalist>
          </div>
          {visiveis.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Nenhum item com esse filtro.
            </div>
          )}
        </div>
      )}

      {/* ── IA ── */}
      <div style={{ marginTop: 18, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 14, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Sparkles size={17} style={{ color: COR }} />
          <strong style={{ fontSize: 14, color: '#4c1d95' }}>O que fazer com o que está parado</strong>
        </div>
        <p style={{ fontSize: 12.5, color: '#5b21b6', marginBottom: 12, lineHeight: 1.5 }}>
          A IA lê a lista e devolve ações concretas: promoção, combo, uso interno, treinamento ou descarte.
          Produto vencido nunca é sugerido para uso em cliente.
        </p>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          <button onClick={() => pedirIA('todos')} disabled={!!iaCarregando}
            style={{ ...btn, background: COR, color: '#fff', opacity: iaCarregando ? .6 : 1, padding: '10px 18px' }}>
            {iaCarregando === 'todos'
              ? <><Loader2 size={15} className="animate-spin" /> Analisando…</>
              : <><Sparkles size={15} /> Sugerir com a lista toda ({itens.length})</>}
          </button>
          <button onClick={() => pedirIA('selecionados')} disabled={!!iaCarregando || selVisiveis.length === 0}
            style={{
              ...btn, padding: '10px 18px',
              background: selVisiveis.length ? '#0891b2' : '#cbc9c4', color: '#fff',
              cursor: selVisiveis.length && !iaCarregando ? 'pointer' : 'not-allowed',
              opacity: iaCarregando ? .6 : 1,
            }}>
            {iaCarregando === 'selecionados'
              ? <><Loader2 size={15} className="animate-spin" /> Analisando…</>
              : <><Sparkles size={15} /> Sugerir só com os selecionados ({selVisiveis.length})</>}
          </button>
        </div>

        {ia && (
          <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
                             color: COR, background: '#f0eefb', padding: '4px 10px', borderRadius: 99 }}>
                {ia.escopo === 'selecionados' ? 'Selecionados' : 'Lista toda'} · {ia.analisados} itens
              </span>
              <div style={{ flex: 1 }} />
              <button onClick={imprimirIA}
                style={{ ...btn, background: '#fff', color: '#374151', border: '1px solid #d0cdc7', fontSize: 12 }}>
                <Printer size={13} /> Imprimir plano
              </button>
              <button onClick={() => setIa(null)} title="Fechar"
                style={{ border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>

            {ia.resumo && <p style={{ fontSize: 13.5, color: '#1a1a1a', lineHeight: 1.6, marginBottom: 8 }}>{ia.resumo}</p>}
            {ia.prejuizo_estimado && (
              <p style={{ fontSize: 12.5, color: '#b45309', fontWeight: 600, marginBottom: 14 }}>
                Parado hoje: {ia.prejuizo_estimado}
              </p>
            )}

            {(ia.acoes || []).map((a, n) => (
              <div key={n} style={{ border: '1px solid #eceae4', borderRadius: 10, padding: 13, marginBottom: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 13.5, color: '#1a1a1a' }}>{n + 1}. {a.titulo}</strong>
                  {a.prazo && (
                    <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5,
                                   color: COR, background: '#f0eefb', padding: '3px 9px', borderRadius: 99 }}>{a.prazo}</span>
                  )}
                </div>
                {a.itens_envolvidos && <p style={{ fontSize: 12.5, color: '#6b6860', marginBottom: 4 }}><b>Itens:</b> {a.itens_envolvidos}</p>}
                {a.como_fazer && <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, marginBottom: 4 }}>{a.como_fazer}</p>}
                {a.retorno && <p style={{ fontSize: 12.5, color: '#15803d' }}><b>Retorno:</b> {a.retorno}</p>}
              </div>
            ))}

            {!!(ia.descarte || []).length && (
              <div style={{ marginTop: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 13 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#b91c1c', marginBottom: 7 }}>
                  Descarte
                </div>
                {(ia.descarte || []).map((d, n) => (
                  <p key={n} style={{ fontSize: 12.5, color: '#7f1d1d', marginBottom: 4 }}>
                    <b>{d.item}</b> — {d.motivo}
                  </p>
                ))}
              </div>
            )}

            {!!(ia.evitar_repetir || []).length && (
              <div style={{ marginTop: 10, background: '#f0fdf4', border: '1px solid #cdeed8', borderRadius: 10, padding: 13 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#15803d', marginBottom: 7 }}>
                  Para não repetir
                </div>
                {(ia.evitar_repetir || []).map((e, n) => (
                  <p key={n} style={{ fontSize: 12.5, color: '#14532d', marginBottom: 4 }}>— {e}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
