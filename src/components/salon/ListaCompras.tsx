'use client'

// Lista de compra de uma área do estoque + os pedidos daquela área.
//
// Duas partes na mesma tela:
//  1) a lista do que precisa repor — item, mínimo, atual e quanto comprar
//     (calculado sozinho, mas editável), com orçamento opcional no fim;
//  2) os pedidos de compra — cada um com valor e um destino: ou vai para o
//     Financeiro decidir, ou já é marcado como comprado.
//
// Quando um pedido vai para o Financeiro, ele vira PENDÊNCIA no setor
// Financeiro (mesmo fluxo das outras solicitações) e fica esperando decisão.
// A decisão é tomada na tela "Pedidos de Compra" do Financeiro e volta para cá
// como aprovado, negado ou assumido por eles.

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Loader2, Save, Plus, Trash2, Send, ShoppingCart, Check, Clock, X, CircleDollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { type Pedido, type ItemLista, rid, num, moeda, STATUS_PEDIDO, chavePedidos } from '@/lib/comprasEstoque'

interface Doc { itens: ItemLista[]; orcamento?: string; pedidos: Pedido[] }

export default function ListaCompras({ area, titulo }: { area: string; titulo: string }) {
  const [doc, setDoc] = useState<Doc>({ itens: [], pedidos: [] })
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [enviando, setEnviando] = useState('')
  const [dirty, setDirty] = useState(false)
  const [setorFinanceiro, setSetorFinanceiro] = useState<{ id: string; nome: string } | null>(null)
  useGuardaSalvar(dirty, titulo)

  const chave = chavePedidos(area)

  useEffect(() => {
    Promise.all([
      fetch(`/api/salon/grid?chave=${chave}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/profissionais', { credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([d, ps]) => {
      if (d && typeof d === 'object') setDoc({ itens: d.itens || [], orcamento: d.orcamento || '', pedidos: d.pedidos || [] })
      const fin = (Array.isArray(ps) ? ps : []).find((p: any) => p.is_departamento && /FINANCEIRO/i.test(p.nome_completo || ''))
      if (fin) setSetorFinanceiro({ id: fin.id, nome: fin.nome_completo })
    }).finally(() => setCarregando(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  const salvar = useCallback(async (novo?: Doc) => {
    const dados = novo || doc
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave, doc: dados }),
      })
      if (r.ok) { setDirty(false); if (!novo) toast.success('Salvo!') } else toast.error('Não foi possível salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }, [chave, doc])

  // ── Lista ────────────────────────────────────────────────────────────────
  const mudarItem = (id: string, campo: keyof ItemLista, v: string) => {
    setDoc(d => ({ ...d, itens: d.itens.map(i => i.id === id ? { ...i, [campo]: v } : i) })); setDirty(true)
  }
  const addItem = () => { setDoc(d => ({ ...d, itens: [...d.itens, { id: rid(), nome: '', minimo: '', atual: '', comprar: '' }] })); setDirty(true) }
  const delItem = (id: string) => { setDoc(d => ({ ...d, itens: d.itens.filter(i => i.id !== id) })); setDirty(true) }

  /** Sugestão de quanto comprar: o que falta para chegar no mínimo. */
  const sugestao = (i: ItemLista) => Math.max(0, num(i.minimo) - num(i.atual))

  const abaixoDoMinimo = useMemo(() => doc.itens.filter(i => i.nome.trim() && num(i.atual) < num(i.minimo)).length, [doc.itens])

  // ── Pedidos ──────────────────────────────────────────────────────────────
  const mudarPedido = (id: string, campo: keyof Pedido, v: any) => {
    setDoc(d => ({ ...d, pedidos: d.pedidos.map(p => p.id === id ? { ...p, [campo]: v } : p) })); setDirty(true)
  }
  const addPedido = () => {
    setDoc(d => ({ ...d, pedidos: [{ id: rid(), descricao: '', valor: '', status: 'rascunho', criadoEm: Date.now() }, ...d.pedidos] }))
    setDirty(true)
  }
  const delPedido = (id: string) => {
    if (!confirm('Excluir este pedido?')) return
    setDoc(d => ({ ...d, pedidos: d.pedidos.filter(p => p.id !== id) })); setDirty(true)
  }

  /** Cria a pendência no Financeiro. Devolve o id, ou '' se falhar. */
  async function abrirPendencia(mensagem: string): Promise<string | null> {
    if (!setorFinanceiro) { toast.error('Setor Financeiro não encontrado'); return null }
    const r = await fetch('/api/pendencias', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profissional_id: setorFinanceiro.id, mensagem, origem: `compras:${area}`, prioridade: 'alta' }),
    })
    if (!r.ok) { toast.error('Não foi possível enviar ao Financeiro'); return null }
    const pend = await r.json().catch(() => null)
    return pend?.id || ''
  }

  /** Manda o pedido avulso para o Financeiro decidir. */
  async function enviarAoFinanceiro(p: Pedido) {
    if (!p.descricao.trim()) { toast.error('Descreva o pedido antes de enviar'); return }
    setEnviando(p.id)
    try {
      const msg = `PEDIDO DE COMPRA — ${titulo}\n${p.descricao}${num(p.valor) > 0 ? `\nValor: ${moeda(num(p.valor))}` : ''}\n\nDecida em Financeiro › Pedidos de Compra.`
      const id = await abrirPendencia(msg)
      if (id === null) { setEnviando(''); return }
      const novo: Doc = {
        ...doc,
        pedidos: doc.pedidos.map(x => x.id === p.id
          ? { ...x, status: 'enviado' as const, tipo: 'pedido' as const, enviadoEm: Date.now(), pendenciaId: id, area, areaTitulo: titulo }
          : x),
      }
      setDoc(novo); await salvar(novo)
      toast.success('Enviado ao Financeiro!')
    } catch { toast.error('Erro de conexão') }
    setEnviando('')
  }

  /** Manda a LISTA DE COMPRA inteira — vira um pedido do tipo lista, com uma
   *  cópia dos itens no estado em que estavam no envio. */
  async function enviarListaAoFinanceiro() {
    const aComprar = doc.itens.filter(i => i.nome.trim() && (num(i.comprar) > 0 || sugestao(i) > 0))
    if (!aComprar.length) { toast.error('Nenhum item para comprar nesta lista'); return }
    setEnviando('lista')
    try {
      const linhas = aComprar.map(i => `• ${i.nome} — comprar ${num(i.comprar) || sugestao(i)} (mín. ${i.minimo || 0}, atual ${i.atual || 0})`).join('\n')
      const orc = num(doc.orcamento || '')
      const msg = `LISTA DE COMPRA — ${titulo}\n${linhas}${orc > 0 ? `\n\nOrçamento: ${moeda(orc)}` : ''}\n\nDecida em Financeiro › Pedidos de Compra.`
      const id = await abrirPendencia(msg)
      if (id === null) { setEnviando(''); return }
      const pedidoLista: Pedido = {
        id: rid(), descricao: `Lista de compra — ${aComprar.length} ${aComprar.length === 1 ? 'item' : 'itens'}`,
        valor: doc.orcamento || '', status: 'enviado', tipo: 'lista',
        itens: aComprar.map(i => ({ ...i, comprar: String(num(i.comprar) || sugestao(i)) })),
        criadoEm: Date.now(), enviadoEm: Date.now(), pendenciaId: id, area, areaTitulo: titulo,
      }
      const novo: Doc = { ...doc, pedidos: [pedidoLista, ...doc.pedidos] }
      setDoc(novo); await salvar(novo)
      toast.success('Lista enviada ao Financeiro!')
    } catch { toast.error('Erro de conexão') }
    setEnviando('')
  }

  function marcarComprado(p: Pedido) {
    const novo: Doc = { ...doc, pedidos: doc.pedidos.map(x => x.id === p.id ? { ...x, status: 'comprado' as const, compradoEm: Date.now() } : x) }
    setDoc(novo); salvar(novo); toast.success('Marcado como compra feita')
  }

  if (carregando) return (
    <div style={{ padding: 46, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={21} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  const totalPedidos = doc.pedidos.filter(p => p.status !== 'negado').reduce((s, p) => s + num(p.valor), 0)

  return (
    <div>
      <style>{`
        .lc-tab { width:100%; border-collapse:collapse; min-width:560px; }
        .lc-tab th { text-align:left; font-size:10px; font-weight:800; color:#8a8680; text-transform:uppercase;
          letter-spacing:.5px; padding:9px 10px; background:#fbfbfa; border-bottom:1px solid #eceae4; white-space:nowrap; }
        .lc-tab td { padding:5px 8px; border-bottom:1px solid #f4f2ee; }
        .lc-in { width:100%; padding:7px 9px; border-radius:8px; border:1.5px solid #e8e6e0; font-size:12.5px; background:#fff; }
        .lc-in:focus { outline:none; border-color:#5b4fcf; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, flexWrap: 'wrap', marginBottom: 13 }}>
        <div style={{ flex: 1, minWidth: 190 }}>
          <h2 style={{ fontSize: 19, fontWeight: 900, color: '#1a1a2e', margin: 0, letterSpacing: '-.3px' }}>{titulo}</h2>
          <p style={{ fontSize: 12.5, color: '#8a8680', margin: '3px 0 0' }}>
            Lista de reposição e pedidos de compra desta área.
            {abaixoDoMinimo > 0 && <b style={{ color: '#dc2626' }}> {abaixoDoMinimo} {abaixoDoMinimo === 1 ? 'item abaixo' : 'itens abaixo'} do mínimo.</b>}
          </p>
        </div>
        <button onClick={() => salvar()} disabled={salvando || !dirty}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 11, border: 'none', background: dirty ? '#16a34a' : '#d7d5cf', color: '#fff', fontSize: 13, fontWeight: 800, cursor: dirty ? 'pointer' : 'default' }}>
          <Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {/* ── 1. Lista de compra ── */}
      <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, overflow: 'hidden', marginBottom: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 15px', borderBottom: '1px solid #f2f0ec' }}>
          <ShoppingCart size={15} style={{ color: '#5b4fcf' }} />
          <span style={{ fontSize: 12.5, fontWeight: 900, color: '#1a1a2e' }}>LISTA DE COMPRA</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="lc-tab">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ width: 110 }}>Qtd. mínima</th>
                <th style={{ width: 110 }}>Qtd. atual</th>
                <th style={{ width: 130 }}>Qtd. a comprar</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {doc.itens.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 26, color: '#a8a49d', fontSize: 12.5 }}>Nenhum item ainda. Clique em “Acrescentar item”.</td></tr>
              )}
              {doc.itens.map(i => {
                const falta = num(i.atual) < num(i.minimo) && i.nome.trim()
                const sug = sugestao(i)
                return (
                  <tr key={i.id} style={{ background: falta ? '#fffbfb' : undefined }}>
                    <td><input className="lc-in" value={i.nome} onChange={e => mudarItem(i.id, 'nome', e.target.value)} placeholder="Nome do produto" style={{ fontWeight: 700 }} /></td>
                    <td><input className="lc-in" type="number" value={i.minimo} onChange={e => mudarItem(i.id, 'minimo', e.target.value)} placeholder="0" style={{ textAlign: 'center' }} /></td>
                    <td>
                      <input className="lc-in" type="number" value={i.atual} onChange={e => mudarItem(i.id, 'atual', e.target.value)} placeholder="0"
                        style={{ textAlign: 'center', color: falta ? '#dc2626' : undefined, fontWeight: falta ? 800 : 500 }} />
                    </td>
                    <td>
                      <input className="lc-in" type="number" value={i.comprar} onChange={e => mudarItem(i.id, 'comprar', e.target.value)}
                        placeholder={String(sug)} style={{ textAlign: 'center', fontWeight: 800 }} />
                      {sug > 0 && String(sug) !== String(i.comprar).trim() && (
                        <div style={{ fontSize: 9.5, color: '#8a8680', textAlign: 'center', marginTop: 1 }}>
                          sugestão {sug}
                          <button onClick={() => mudarItem(i.id, 'comprar', String(sug))}
                            style={{ marginLeft: 4, border: 'none', background: 'transparent', color: '#5b4fcf', fontWeight: 800, cursor: 'pointer', fontSize: 9.5, textDecoration: 'underline', padding: 0 }}>usar</button>
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => delItem(i.id)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 3 }}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 15px', borderTop: '1px solid #f2f0ec', flexWrap: 'wrap' }}>
          <button onClick={addItem}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 12, fontWeight: 800, padding: '7px 13px', borderRadius: 9, cursor: 'pointer' }}>
            <Plus size={12} /> Acrescentar item
          </button>
          <div style={{ flex: 1 }} />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#6b6860' }}>
            Orçamento (opcional):
            <input type="number" value={doc.orcamento || ''} onChange={e => { setDoc(d => ({ ...d, orcamento: e.target.value })); setDirty(true) }}
              placeholder="R$ 0,00" style={{ width: 120, padding: '7px 9px', borderRadius: 8, border: '1.5px solid #e8e6e0', fontSize: 12.5, fontWeight: 800, textAlign: 'right' }} />
          </label>
          {/* A lista também pode ir para o Financeiro, do mesmo jeito que um
              pedido avulso — lá ela chega com todos os itens. */}
          <button onClick={enviarListaAoFinanceiro} disabled={enviando === 'lista'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 12, fontWeight: 800, padding: '8px 14px', borderRadius: 9, cursor: 'pointer' }}>
            {enviando === 'lista' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Enviar lista ao Financeiro
          </button>
        </div>
      </div>

      {/* ── 2. Pedidos de compra ── */}
      <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 15px', borderBottom: '1px solid #f2f0ec', flexWrap: 'wrap' }}>
          <CircleDollarSign size={15} style={{ color: '#16a34a' }} />
          <span style={{ fontSize: 12.5, fontWeight: 900, color: '#1a1a2e' }}>PEDIDOS DE COMPRA</span>
          <div style={{ flex: 1 }} />
          {totalPedidos > 0 && <span style={{ fontSize: 11.5, fontWeight: 800, color: '#6b6860' }}>Total: {moeda(totalPedidos)}</span>}
          <button onClick={addPedido}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 12, fontWeight: 800, padding: '7px 13px', borderRadius: 9, cursor: 'pointer' }}>
            <Plus size={12} /> Novo pedido
          </button>
        </div>

        <div style={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {doc.pedidos.length === 0 && (
            <p style={{ textAlign: 'center', padding: 22, color: '#a8a49d', fontSize: 12.5, margin: 0 }}>
              Nenhum pedido ainda. Ex.: “Pedido de dosagem” com o valor, e envie ao Financeiro.
            </p>
          )}
          {doc.pedidos.map(p => {
            const st = STATUS_PEDIDO[p.status]
            const travado = p.status !== 'rascunho'
            return (
              <div key={p.id} style={{ border: `1.5px solid ${st.borda}`, background: st.fundo, borderRadius: 12, padding: '11px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ background: st.cor, color: '#fff', fontSize: 9.5, fontWeight: 900, letterSpacing: '.4px', padding: '3px 9px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                    {st.rotulo}
                  </span>
                  {p.decididoEm && <span style={{ fontSize: 10.5, color: '#8a8680' }}>em {new Date(p.decididoEm).toLocaleDateString('pt-BR')}</span>}
                  <div style={{ flex: 1 }} />
                  <button onClick={() => delPedido(p.id)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 2 }}><Trash2 size={13} /></button>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '3 1 220px', minWidth: 170 }}>
                    <label style={rot}>O que está pedindo</label>
                    <input className="lc-in" value={p.descricao} disabled={travado}
                      onChange={e => mudarPedido(p.id, 'descricao', e.target.value)}
                      placeholder="Ex.: Pedido de dosagem" style={{ fontWeight: 700 }} />
                  </div>
                  <div style={{ flex: '0 1 140px' }}>
                    <label style={rot}>Valor</label>
                    <input className="lc-in" type="number" value={p.valor} disabled={travado}
                      onChange={e => mudarPedido(p.id, 'valor', e.target.value)}
                      placeholder="R$ 0,00" style={{ textAlign: 'right', fontWeight: 800 }} />
                  </div>
                </div>

                {p.status === 'rascunho' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => enviarAoFinanceiro(p)} disabled={enviando === p.id}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 12, fontWeight: 800, padding: '8px 14px', borderRadius: 9, cursor: 'pointer' }}>
                      {enviando === p.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Enviar ao Financeiro
                    </button>
                    <button onClick={() => marcarComprado(p)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1.5px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', fontSize: 12, fontWeight: 800, padding: '8px 14px', borderRadius: 9, cursor: 'pointer' }}>
                      <Check size={13} /> Compra já feita
                    </button>
                  </div>
                )}

                {p.status === 'enviado' && (
                  <p style={{ fontSize: 11.5, color: '#b45309', fontWeight: 700, margin: '9px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={13} /> Aguardando a decisão do Financeiro.
                  </p>
                )}
                {p.status === 'aprovado' && (
                  <p style={{ fontSize: 11.5, color: '#15803d', fontWeight: 700, margin: '9px 0 0' }}>
                    ✅ Aprovado — você está autorizado a comprar.
                    <button onClick={() => marcarComprado(p)}
                      style={{ marginLeft: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 800, padding: '5px 11px', borderRadius: 8, cursor: 'pointer' }}>
                      Marcar como comprado
                    </button>
                  </p>
                )}
                {p.status === 'negado' && (
                  <p style={{ fontSize: 11.5, color: '#b91c1c', fontWeight: 700, margin: '9px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <X size={13} /> Não aprovado pelo Financeiro. Pedido arquivado.{p.motivo ? ` Motivo: ${p.motivo}` : ''}
                  </p>
                )}
                {p.status === 'financeiro_compra' && (
                  <p style={{ fontSize: 11.5, color: '#5b4fcf', fontWeight: 700, margin: '9px 0 0' }}>
                    🛒 O Financeiro assumiu a compra — não precisa comprar.
                  </p>
                )}
                {p.status === 'comprado' && (
                  <p style={{ fontSize: 11.5, color: '#15803d', fontWeight: 700, margin: '9px 0 0' }}>✅ Compra feita.</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const rot: CSSProperties = { fontSize: 10, fontWeight: 800, color: '#8a8680', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 3 }
