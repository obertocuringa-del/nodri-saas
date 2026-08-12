'use client'

// Pedidos de Compra — a decisão do Financeiro.
//
// Junta os pedidos enviados por todas as áreas do estoque e oferece as três
// saídas: aprovar (o setor compra), não aprovar (arquiva) ou assumir a compra.
// A decisão é gravada no documento da área de origem, então volta para a tela
// de quem pediu, e o setor é avisado por uma pendência.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Check, X, ShoppingCart, Clock, Inbox } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  AREAS_COMPRAS, STATUS_PEDIDO, chavePedidos, moeda, num,
  type Pedido, type StatusPedido,
} from '@/lib/comprasEstoque'

interface PedidoComArea extends Pedido { areaId: string; areaNome: string }

export default function PedidosCompraFinanceiro() {
  const [pedidos, setPedidos] = useState<PedidoComArea[]>([])
  const [carregando, setCarregando] = useState(true)
  const [agindo, setAgindo] = useState('')
  const [verTodos, setVerTodos] = useState(false)
  const [setorCompras, setSetorCompras] = useState<{ id: string } | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const [docs, ps] = await Promise.all([
        Promise.all(AREAS_COMPRAS.map(a =>
          fetch(`/api/salon/grid?chave=${chavePedidos(a.id)}`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null).catch(() => null)
            .then(d => ({ area: a, doc: d })))),
        fetch('/api/profissionais', { credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
      ])
      const todos: PedidoComArea[] = []
      for (const { area, doc } of docs) {
        for (const p of (doc?.pedidos || [])) {
          if (p.status === 'rascunho') continue     // ainda não foi enviado
          todos.push({ ...p, areaId: area.id, areaNome: area.titulo })
        }
      }
      todos.sort((a, b) => (b.enviadoEm || b.criadoEm || 0) - (a.enviadoEm || a.criadoEm || 0))
      setPedidos(todos)
      const comp = (Array.isArray(ps) ? ps : []).find((p: any) => p.is_departamento && /COMPRAS|ESTOQUE/i.test(p.nome_completo || ''))
      if (comp) setSetorCompras({ id: comp.id })
    } catch { /* mantém */ }
    setCarregando(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const aguardando = useMemo(() => pedidos.filter(p => p.status === 'enviado'), [pedidos])
  const assumidos = useMemo(() => pedidos.filter(p => p.status === 'financeiro_compra'), [pedidos])
  const visiveis = verTodos ? pedidos : pedidos.filter(p => p.status === 'enviado' || p.status === 'financeiro_compra')

  /** Grava a decisão no documento da área e avisa o setor por pendência. */
  async function decidir(p: PedidoComArea, status: StatusPedido, motivo?: string) {
    setAgindo(p.id)
    try {
      const chave = chavePedidos(p.areaId)
      const doc = await fetch(`/api/salon/grid?chave=${chave}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null)
      if (!doc) { toast.error('Não foi possível abrir o pedido'); setAgindo(''); return }
      const novo = {
        ...doc,
        pedidos: (doc.pedidos || []).map((x: Pedido) => x.id === p.id
          ? { ...x, status, decididoEm: Date.now(), motivo: motivo || '' } : x),
      }
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave, doc: novo }),
      })
      if (!r.ok) { toast.error('Não foi possível salvar a decisão'); setAgindo(''); return }

      // Avisa quem pediu
      if (setorCompras && status !== 'financeiro_compra') {
        const texto = status === 'aprovado'
          ? `PEDIDO APROVADO — ${p.areaNome}\n${p.descricao}${num(p.valor) > 0 ? `\nValor: ${moeda(num(p.valor))}` : ''}\n\nVocê está autorizado a comprar.`
          : `PEDIDO NÃO APROVADO — ${p.areaNome}\n${p.descricao}${motivo ? `\nMotivo: ${motivo}` : ''}\n\nO pedido foi arquivado.`
        await fetch('/api/pendencias', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profissional_id: setorCompras.id, mensagem: texto, origem: `compras:${p.areaId}` }),
        }).catch(() => { })
      }

      setPedidos(l => l.map(x => x.id === p.id ? { ...x, status, decididoEm: Date.now(), motivo: motivo || '' } : x))
      toast.success(status === 'aprovado' ? 'Aprovado!' : status === 'negado' ? 'Pedido negado' : 'Compra assumida pelo Financeiro')
    } catch { toast.error('Erro de conexão') }
    setAgindo('')
  }

  function negar(p: PedidoComArea) {
    const motivo = prompt('Motivo de não aprovar (opcional):') ?? ''
    decidir(p, 'negado', motivo.trim())
  }

  if (carregando) return (
    <div style={{ padding: 46, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={21} className="animate-spin" style={{ display: 'inline' }} /> Carregando pedidos…
    </div>
  )

  const totalAguardando = aguardando.reduce((s, p) => s + num(p.valor), 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, flexWrap: 'wrap', marginBottom: 13 }}>
        <div style={{ flex: 1, minWidth: 190 }}>
          <h2 style={{ fontSize: 19, fontWeight: 900, color: '#1a1a2e', margin: 0, letterSpacing: '-.3px' }}>Pedidos de Compra</h2>
          <p style={{ fontSize: 12.5, color: '#8a8680', margin: '3px 0 0' }}>
            Pedidos enviados pelo Compras/Estoque esperando sua decisão.
          </p>
        </div>
        <button onClick={() => setVerTodos(v => !v)}
          style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e0ddd8', background: '#fff', color: '#4b5563', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
          {verTodos ? 'Só os pendentes' : 'Ver todos'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 10, marginBottom: 13 }}>
        <Kpi icone={<Clock size={17} />} n={aguardando.length} rotulo="Aguardando decisão" cor={aguardando.length ? '#b45309' : '#15803d'} fundo={aguardando.length ? '#fffbeb' : '#f0fdf4'} />
        <Kpi icone={<ShoppingCart size={17} />} n={assumidos.length} rotulo="Você vai comprar" cor="#5b4fcf" fundo="#f5f3ff" />
        <Kpi texto={moeda(totalAguardando)} rotulo="Valor aguardando" cor="#1a1a2e" fundo="#fff" icone={<Inbox size={17} />} />
      </div>

      {visiveis.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '44px 20px', background: '#fff', border: '1px dashed #e0ddd8', borderRadius: 14 }}>
          <Inbox size={26} style={{ color: '#d7d5cf', display: 'inline' }} />
          <p style={{ color: '#8a8680', fontSize: 13.5, fontWeight: 700, margin: '8px 0 0' }}>Nenhum pedido esperando decisão.</p>
          <p style={{ color: '#a8a49d', fontSize: 12, margin: '4px 0 0' }}>Os pedidos enviados pelo Compras/Estoque aparecem aqui.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {visiveis.map(p => {
            const st = STATUS_PEDIDO[p.status]
            return (
              <div key={p.id} style={{ background: st.fundo, border: `1.5px solid ${st.borda}`, borderRadius: 13, padding: '13px 15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 7 }}>
                  <span style={{ background: st.cor, color: '#fff', fontSize: 9.5, fontWeight: 900, letterSpacing: '.4px', padding: '3px 9px', borderRadius: 99 }}>{st.rotulo}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#5b4fcf', background: '#f0eefb', borderRadius: 99, padding: '3px 10px' }}>{p.areaNome}</span>
                  <div style={{ flex: 1 }} />
                  {p.enviadoEm && <span style={{ fontSize: 10.5, color: '#a8a49d' }}>enviado em {new Date(p.enviadoEm).toLocaleDateString('pt-BR')}</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: '#1a1a2e', flex: 1, minWidth: 150 }}>{p.descricao || 'Sem descrição'}</span>
                  {num(p.valor) > 0 && <span style={{ fontSize: 17, fontWeight: 900, color: '#15803d' }}>{moeda(num(p.valor))}</span>}
                </div>
                {p.motivo && <p style={{ fontSize: 11.5, color: '#b91c1c', margin: '2px 0 0' }}>Motivo: {p.motivo}</p>}

                {p.status === 'enviado' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
                    <button onClick={() => decidir(p, 'aprovado')} disabled={agindo === p.id}
                      style={btn('#16a34a', '#fff')}>
                      {agindo === p.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />} Aprovar
                    </button>
                    <button onClick={() => negar(p)} disabled={agindo === p.id}
                      style={btn('#fff', '#dc2626', '#fecaca')}>
                      <X size={14} /> Não aprovar
                    </button>
                    <button onClick={() => decidir(p, 'financeiro_compra')} disabled={agindo === p.id}
                      style={btn('#fff', '#5b4fcf', '#ddd6f5')}>
                      <ShoppingCart size={14} /> Eu mesmo comprarei
                    </button>
                  </div>
                )}

                {p.status === 'financeiro_compra' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11.5, color: '#5b4fcf', fontWeight: 700 }}>Você assumiu esta compra — resolva e marque quando comprar.</span>
                    <button onClick={() => decidir(p, 'comprado')} disabled={agindo === p.id} style={btn('#16a34a', '#fff')}>
                      <Check size={14} /> Comprei
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p style={{ fontSize: 11.5, color: '#a8a49d', margin: '11px 4px 0', lineHeight: 1.5 }}>
        <b>Aprovar</b> autoriza o setor a comprar. <b>Não aprovar</b> arquiva o pedido. <b>Eu mesmo comprarei</b> passa a
        responsabilidade para o Financeiro — o pedido continua aqui até você marcar como comprado. Nos dois primeiros casos, o
        Compras/Estoque recebe o aviso como pendência.
      </p>
    </div>
  )
}

function btn(fundo: string, cor: string, borda?: string) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 15px', borderRadius: 9,
    border: borda ? `1.5px solid ${borda}` : 'none', background: fundo, color: cor,
    fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
  } as const
}

function Kpi({ icone, n, texto, rotulo, cor, fundo }: { icone: any; n?: number; texto?: string; rotulo: string; cor: string; fundo: string }) {
  return (
    <div style={{ background: fundo, border: '1px solid #eceae4', borderRadius: 13, padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: cor + '1e', color: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icone}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: texto ? 15 : 20, fontWeight: 900, color: cor, lineHeight: 1.1 }}>{texto ?? n}</div>
        <div style={{ fontSize: 10.5, color: '#8a8680', fontWeight: 700 }}>{rotulo}</div>
      </div>
    </div>
  )
}
