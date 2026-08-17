'use client'

// Pedidos de Compra — a decisão do Financeiro.
//
// Junta os pedidos enviados por todas as áreas do estoque e oferece as três
// saídas: aprovar (o setor compra), não aprovar (arquiva) ou assumir a compra.
// A decisão é gravada no documento da área de origem, então volta para a tela
// de quem pediu, e o setor é avisado por uma pendência.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Check, X, ShoppingCart, Clock, Inbox, AlertTriangle, CheckCircle2, TrendingDown, Share2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  AREAS_COMPRAS, STATUS_PEDIDO, chavePedidos, moeda, num,
  textoWhatsPedido, textoWhatsTodos, abrirWhats,
  type Pedido, type StatusPedido,
} from '@/lib/comprasEstoque'
import { MESES, realPorMes, resumoDoMes, pct } from '@/lib/calcFinanceiro'

interface PedidoComArea extends Pedido { areaId: string; areaNome: string }

export default function PedidosCompraFinanceiro() {
  const [pedidos, setPedidos] = useState<PedidoComArea[]>([])
  const [carregando, setCarregando] = useState(true)
  const [agindo, setAgindo] = useState('')
  const [verTodos, setVerTodos] = useState(false)
  const [setorCompras, setSetorCompras] = useState<{ id: string } | null>(null)
  const [financeiro, setFinanceiro] = useState<{ historico: any[]; rel: any } | null>(null)
  const [decisao, setDecisao] = useState<{ pedido: PedidoComArea; status: StatusPedido } | null>(null)
  // Lista de 28 itens aberta empurrava a decisão para fora da tela e escondia
  // os outros pedidos. Fica fechada, mostrando só o começo, e abre no clique.
  const [aberto, setAberto] = useState<Record<string, boolean>>({})

  // Nome do salão só para assinar a mensagem do WhatsApp.
  const [nomeSalao, setNomeSalao] = useState<string | undefined>(undefined)
  useEffect(() => {
    fetch('/api/salon/perfil', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.nome) setNomeSalao(d.nome) })
      .catch(() => { /* a mensagem sai sem o nome */ })
  }, [])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const [docs, ps, calc, rel] = await Promise.all([
        Promise.all(AREAS_COMPRAS.map(a =>
          fetch(`/api/salon/grid?chave=${chavePedidos(a.id)}`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null).catch(() => null)
            .then(d => ({ area: a, doc: d })))),
        fetch('/api/profissionais', { credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/salon/calculadora', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/relatorios', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      ])
      setFinanceiro({ historico: Array.isArray(calc?.historico) ? calc.historico : [], rel })
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

  /**
   * Orientação do mês: junta o que o DRE e o Ponto de Equilíbrio já sabem e
   * responde a pergunta que o Financeiro tem na mão — dá para aprovar agora?
   * Nada é decidido pelo sistema; ele só coloca o número do lado do pedido.
   */
  const orientacao = useMemo(() => {
    if (!financeiro) return null
    const hoje = new Date()
    const ano = hoje.getFullYear(), mes = hoje.getMonth() + 1
    const real = realPorMes(financeiro.rel)
    const reg = financeiro.historico.find(h => Number(h.ano) === ano && Number(h.mes) === mes)
    const r = resumoDoMes(reg?.dados, real.get(`${ano}-${mes}`))
    if (!r.temDados) return null

    const diasNoMes = new Date(ano, mes, 0).getDate()
    const doMesPassado = hoje.getDate() / diasNoMes
    const atingidoPE = r.pe > 0 ? r.faturamento / r.pe : 0
    const faltaPE = Math.max(0, r.pe - r.faturamento)
    const pedidosTotal = aguardando.reduce((s, p) => s + num(p.valor), 0)
    // Quanto os pedidos pesam sobre o que sobrou no mês
    const pesoNoResultado = r.resultadoOp > 0 ? pedidosTotal / r.resultadoOp : null

    let tom: 'bom' | 'atencao' | 'ruim'
    let titulo: string
    let texto: string

    if (r.resultadoOp < 0) {
      tom = 'ruim'
      titulo = 'O mês está no vermelho'
      texto = `O resultado de ${MESES[mes - 1]} está negativo em ${moeda(Math.abs(r.resultadoOp))}. Aprovar compras agora aumenta o prejuízo — libere só o que não dá para esperar.`
    } else if (atingidoPE < 1 && atingidoPE < doMesPassado) {
      tom = 'ruim'
      titulo = 'Ainda não cobriu os custos, e o ritmo está atrasado'
      texto = `Faltam ${moeda(faltaPE)} para o ponto de equilíbrio e já se passaram ${pct(doMesPassado)} do mês. No ritmo atual o mês não fecha no azul — aprove só o essencial.`
    } else if (atingidoPE < 1) {
      tom = 'atencao'
      titulo = 'Ainda falta cobrir os custos do mês'
      texto = `Faltam ${moeda(faltaPE)} para o ponto de equilíbrio, mas o faturamento está à frente do calendário. Dá para aprovar o necessário, segurando o que puder esperar o fechamento.`
    } else if (pesoNoResultado !== null && pesoNoResultado > 0.3) {
      tom = 'atencao'
      titulo = 'Os custos já estão cobertos, mas os pedidos pesam'
      texto = `Os pedidos somam ${moeda(pedidosTotal)} — ${pct(pesoNoResultado)} de tudo que sobrou no mês (${moeda(r.resultadoOp)}). Vale aprovar por prioridade, não tudo de uma vez.`
    } else {
      tom = 'bom'
      titulo = 'Mês no azul — há folga para aprovar'
      texto = `O ponto de equilíbrio já foi coberto e sobraram ${moeda(r.resultadoOp)}.${pedidosTotal > 0 ? ` Os pedidos somam ${moeda(pedidosTotal)}${pesoNoResultado !== null ? `, ${pct(pesoNoResultado)} dessa sobra` : ''}.` : ''}`
    }

    return {
      tom, titulo, texto, mes: MESES[mes - 1], dia: hoje.getDate(), diasNoMes, doMesPassado,
      faturamento: r.faturamento, pe: r.pe, atingidoPE, resultado: r.resultadoOp,
      margemPct: r.margemPct, pedidosTotal, pesoNoResultado, diasImportados: r.diasImportados,
    }
  }, [financeiro, aguardando])

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

      // A pendência no Financeiro só continua aberta quando ELE assumiu a
      // compra — é o único caso em que ainda há algo para ele fazer. Aprovar e
      // negar já são a decisão pronta, então a pendência se resolve sozinha.
      if (p.pendenciaId && status !== 'financeiro_compra') {
        await fetch(`/api/pendencias/${p.pendenciaId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolvido: true }),
        }).catch(() => { })
      }

      // Avisa quem pediu, sempre com a observação junto — um "não" seco deixa
      // o setor sem saber se insiste, se espera ou se muda o pedido.
      if (setorCompras && status !== 'comprado') {
        const cab = status === 'aprovado' ? 'PEDIDO APROVADO'
          : status === 'negado' ? 'PEDIDO NÃO APROVADO'
            : 'O FINANCEIRO VAI COMPRAR'
        const fim = status === 'aprovado' ? 'Você está autorizado a comprar.'
          : status === 'negado' ? 'O pedido foi arquivado.'
            : 'Não precisa comprar — o Financeiro assumiu.'
        const texto = `${cab} — ${p.areaNome}\n${p.descricao}`
          + (num(p.valor) > 0 ? `\nValor: ${moeda(num(p.valor))}` : '')
          + (motivo ? `\n\nObservação do Financeiro: ${motivo}` : '')
          + `\n\n${fim}`
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

  /** Confirma a decisão com a observação escrita no modal. */
  function confirmarDecisao(obs: string) {
    if (!decisao) return
    const { pedido, status } = decisao
    setDecisao(null)
    decidir(pedido, status, obs.trim())
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
        {/* Uma mensagem só com a compra inteira: quem vai ao mercado recebe
            tudo de uma vez, separado por setor, em vez de um zap por pedido. */}
        {visiveis.length > 0 && (
          <button onClick={() => abrirWhats(textoWhatsTodos(visiveis, nomeSalao))}
            title="Junta todos os pedidos da tela numa mensagem só"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
            <Share2 size={14} /> Compartilhar tudo ({visiveis.length})
          </button>
        )}
        <button onClick={() => setVerTodos(v => !v)}
          style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid #e0ddd8', background: '#fff', color: '#4b5563', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
          {verTodos ? 'Só os pendentes' : 'Ver todos'}
        </button>
      </div>

      {/* Orientação do mês — o contexto financeiro na hora de decidir */}
      {orientacao && (() => {
        const t = orientacao.tom
        const cor = t === 'bom' ? '#16a34a' : t === 'atencao' ? '#b45309' : '#dc2626'
        const fundo = t === 'bom' ? '#f0fdf4' : t === 'atencao' ? '#fffbeb' : '#fef2f2'
        const borda = t === 'bom' ? '#bbf7d0' : t === 'atencao' ? '#fde68a' : '#fecaca'
        const Icone = t === 'bom' ? CheckCircle2 : t === 'ruim' ? TrendingDown : AlertTriangle
        return (
          <div style={{ background: fundo, border: `1.5px solid ${borda}`, borderRadius: 14, padding: '15px 17px', marginBottom: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <Icone size={18} color={cor} />
              <span style={{ fontSize: 14.5, fontWeight: 900, color: cor }}>{orientacao.titulo}</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#8a8680', whiteSpace: 'nowrap' }}>
                {orientacao.mes.toUpperCase()} · DIA {orientacao.dia} DE {orientacao.diasNoMes}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.55, margin: '0 0 12px', fontWeight: 500 }}>{orientacao.texto}</p>

            {/* Faturamento contra o ponto de equilíbrio */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 800, color: '#6b6860', marginBottom: 4 }}>
                <span>{moeda(orientacao.faturamento)} faturado</span>
                <span>ponto de equilíbrio {moeda(orientacao.pe)}</span>
              </div>
              <div style={{ position: 'relative', height: 10, borderRadius: 99, background: '#fff', border: '1px solid ' + borda, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, orientacao.atingidoPE * 100)}%`, height: '100%', background: cor, opacity: .85 }} />
                <div title="quanto do mês já passou" style={{ position: 'absolute', top: -2, bottom: -2, left: `${orientacao.doMesPassado * 100}%`, width: 2, background: '#1a1a2e', opacity: .45 }} />
              </div>
              <div style={{ fontSize: 10, color: '#8a8680', marginTop: 3 }}>
                {pct(orientacao.atingidoPE)} do ponto de equilíbrio · o traço marca {pct(orientacao.doMesPassado)} do mês
                {orientacao.diasImportados > 0 && ` · ${orientacao.diasImportados} dias importados do avec`}
              </div>
            </div>

            {/* Números que sustentam a orientação */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 9 }}>
              <Dado rotulo="Resultado do mês" valor={moeda(orientacao.resultado)} cor={orientacao.resultado >= 0 ? '#15803d' : '#dc2626'} nota={`margem de ${pct(orientacao.margemPct)}`} />
              <Dado rotulo="Aguardando decisão" valor={String(aguardando.length)} cor="#b45309" nota={moeda(orientacao.pedidosTotal)} />
              <Dado rotulo="Você vai comprar" valor={String(assumidos.length)} cor="#5b4fcf" nota="assumidos por você" />
              {orientacao.pesoNoResultado !== null && (
                <Dado rotulo="Peso dos pedidos" valor={pct(orientacao.pesoNoResultado)} cor={orientacao.pesoNoResultado > 0.3 ? '#dc2626' : '#15803d'} nota="do que sobrou no mês" />
              )}
            </div>
          </div>
        )
      })()}

      {/* Sem dados do mês na Calculadora/avec: mostra ao menos os contadores */}
      {!orientacao && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 10, marginBottom: 13 }}>
          <Kpi icone={<Clock size={17} />} n={aguardando.length} rotulo="Aguardando decisão" cor={aguardando.length ? '#b45309' : '#15803d'} fundo={aguardando.length ? '#fffbeb' : '#f0fdf4'} />
          <Kpi icone={<ShoppingCart size={17} />} n={assumidos.length} rotulo="Você vai comprar" cor="#5b4fcf" fundo="#f5f3ff" />
          <Kpi texto={moeda(totalAguardando)} rotulo="Valor aguardando" cor="#1a1a2e" fundo="#fff" icone={<Inbox size={17} />} />
        </div>
      )}

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
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: '#1a1a2e', flex: 1, minWidth: 150 }}>
                    {p.tipo === 'lista' && <span style={{ fontSize: 10, fontWeight: 900, color: '#5b4fcf', background: '#fff', border: '1px solid #ddd6f5', borderRadius: 99, padding: '2px 8px', marginRight: 7 }}>LISTA</span>}
                    {p.descricao || 'Sem descrição'}
                  </span>
                  {num(p.valor) > 0 && (
                    <span style={{ fontSize: 17, fontWeight: 900, color: '#15803d' }}>
                      {moeda(num(p.valor))}
                      {p.tipo === 'lista' && <span style={{ fontSize: 10, fontWeight: 700, color: '#8a8680', marginLeft: 5 }}>orçado</span>}
                    </span>
                  )}
                </div>

                {/* Quando é a lista inteira, mostra item por item — os
                    primeiros seis, e o resto sob um clique. */}
                {p.tipo === 'lista' && !!p.itens?.length && (() => {
                  const itens = p.itens || []
                  const mostrarTodos = aberto[p.id]
                  const visiveis = mostrarTodos ? itens : itens.slice(0, 6)
                  const unidades = itens.reduce((t, i) => t + (num(i.comprar) || 0), 0)
                  return (
                    <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 10, padding: '8px 11px', margin: '7px 0 2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6, marginBottom: 4, borderBottom: '1px solid #f2f0ec' }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#6b6860', letterSpacing: '.3px' }}>
                          {itens.length} {itens.length === 1 ? 'ITEM' : 'ITENS'}
                        </span>
                        <span style={{ fontSize: 11, color: '#a8a49d' }}>· {unidades} unidades no total</span>
                      </div>
                      {visiveis.map(i => (
                        <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '3px 0', fontSize: 12, borderBottom: '1px solid #f7f6f3' }}>
                          <span style={{ flex: 1, fontWeight: 700, color: '#374151', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.nome}</span>
                          <span style={{ fontSize: 10.5, color: '#a8a49d', whiteSpace: 'nowrap' }}>mín. {i.minimo || 0} · atual {i.atual || 0}</span>
                          <span style={{ fontWeight: 900, color: '#5b4fcf', whiteSpace: 'nowrap' }}>comprar {i.comprar}</span>
                        </div>
                      ))}
                      {itens.length > 6 && (
                        <button onClick={() => setAberto(a => ({ ...a, [p.id]: !mostrarTodos }))}
                          style={{ marginTop: 6, border: 'none', background: 'transparent', color: '#5b4fcf', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0 }}>
                          {mostrarTodos
                            ? <><ChevronUp size={12} /> Mostrar menos</>
                            : <><ChevronDown size={12} /> Ver os outros {itens.length - 6} itens</>}
                        </button>
                      )}
                    </div>
                  )
                })()}

                {p.motivo && <p style={{ fontSize: 11.5, color: '#b91c1c', margin: '2px 0 0' }}>Motivo: {p.motivo}</p>}

                {/* Quem compra quase nunca é quem decide: a lista vai por
                    WhatsApp com os itens e as quantidades já formatados. */}
                <button onClick={() => abrirWhats(textoWhatsPedido(p, nomeSalao))}
                  style={{ marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#25D366', color: '#fff', border: 'none', borderRadius: 9, padding: '7px 13px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                  <Share2 size={13} /> Enviar no WhatsApp
                </button>

                {p.status === 'enviado' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
                    <button onClick={() => setDecisao({ pedido: p, status: 'aprovado' })} disabled={agindo === p.id}
                      style={btn('#16a34a', '#fff')}>
                      {agindo === p.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />} Aprovar
                    </button>
                    <button onClick={() => setDecisao({ pedido: p, status: 'negado' })} disabled={agindo === p.id}
                      style={btn('#fff', '#dc2626', '#fecaca')}>
                      <X size={14} /> Não aprovar
                    </button>
                    <button onClick={() => setDecisao({ pedido: p, status: 'financeiro_compra' })} disabled={agindo === p.id}
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
        responsabilidade para o Financeiro — o pedido continua aqui até você marcar como comprado. Em qualquer das três, o
        Compras/Estoque recebe o aviso com a sua observação.
      </p>

      {decisao && <ModalDecisao decisao={decisao} onCancelar={() => setDecisao(null)} onConfirmar={confirmarDecisao} />}
    </div>
  )
}

/* ─────────────── Modal: decidir com observação ─────────────── */
function ModalDecisao({ decisao, onCancelar, onConfirmar }: {
  decisao: { pedido: PedidoComArea; status: StatusPedido }
  onCancelar: () => void
  onConfirmar: (obs: string) => void
}) {
  const [obs, setObs] = useState('')
  const { pedido, status } = decisao
  const info = status === 'aprovado'
    ? { titulo: 'Aprovar pedido', cor: '#16a34a', fundo: '#f0fdf4', dica: 'Ex.: pode comprar, mas peça desconto à vista.', botao: 'Aprovar' }
    : status === 'negado'
      ? { titulo: 'Não aprovar pedido', cor: '#dc2626', fundo: '#fef2f2', dica: 'Ex.: deixa para comprar no mês que vem.', botao: 'Não aprovar' }
      : { titulo: 'Assumir a compra', cor: '#5b4fcf', fundo: '#f5f3ff', dica: 'Ex.: eu compro no fornecedor novo na sexta.', botao: 'Vou comprar' }

  return (
    <div onClick={onCancelar} style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(20,15,45,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: 22, width: 'min(440px,100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <b style={{ fontSize: 16.5, color: info.cor }}>{info.titulo}</b>
          <button onClick={onCancelar} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b6860' }}><X size={18} /></button>
        </div>

        <div style={{ background: info.fundo, borderRadius: 10, padding: '9px 12px', margin: '8px 0 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: '#8a8680', letterSpacing: '.4px' }}>{pedido.areaNome.toUpperCase()} · #{pedido.id.slice(0, 4).toUpperCase()}</div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a2e' }}>{pedido.descricao}</div>
          {num(pedido.valor) > 0 && <div style={{ fontSize: 15, fontWeight: 900, color: info.cor }}>{moeda(num(pedido.valor))}</div>}
        </div>

        <label style={{ fontSize: 11, fontWeight: 800, color: '#6b6860', display: 'block', marginBottom: 5 }}>
          OBSERVAÇÃO PARA O SETOR <span style={{ fontWeight: 600, color: '#a8a49d' }}>(opcional)</span>
        </label>
        <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} autoFocus
          placeholder={info.dica}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e0ddd8', fontSize: 13, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
        <p style={{ fontSize: 11, color: '#a8a49d', margin: '6px 0 0', lineHeight: 1.45 }}>
          O que você escrever aqui chega junto com o aviso para o Compras/Estoque.
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onCancelar} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e0ddd8', background: '#fff', color: '#6b6860', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => onConfirmar(obs)} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: info.cor, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>{info.botao}</button>
        </div>
      </div>
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

/** Número seco dentro do painel de orientação. */
function Dado({ rotulo, valor, cor, nota }: { rotulo: string; valor: string; cor: string; nota?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 10, padding: '9px 12px' }}>
      <div style={{ fontSize: 9.5, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px' }}>{rotulo}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: cor, letterSpacing: '-.3px', lineHeight: 1.2 }}>{valor}</div>
      {nota && <div style={{ fontSize: 10, color: '#a8a49d', fontWeight: 700 }}>{nota}</div>}
    </div>
  )
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
