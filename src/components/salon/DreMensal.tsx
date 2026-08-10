'use client'

// DRE do mês — o resultado do salão numa tela só.
//
// Tudo vem da Calculadora (nada é digitado aqui) e é recalculado com as mesmas
// fórmulas dela. Ao lado de cada linha fica o mês anterior, para dar para ver
// na hora o que subiu e o que caiu.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Printer, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import GradeMeses from './GradeMeses'
import { MESES, anosDisponiveis, moeda, pct, resumoDoMes, type ResumoMes } from '@/lib/calcFinanceiro'

interface Registro { ano: number; mes: number; dados: any }

export default function DreMensal() {
  const hoje = new Date()
  const [historico, setHistorico] = useState<Registro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)

  useEffect(() => {
    fetch('/api/salon/calculadora', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setHistorico(Array.isArray(d?.historico) ? d.historico : []))
      .catch(() => setHistorico([]))
      .finally(() => setCarregando(false))
  }, [])

  const doMes = useMemo(() => {
    const busca = (a: number, m: number) => historico.find(h => Number(h.ano) === a && Number(h.mes) === m)
    return (a: number, m: number) => resumoDoMes(busca(a, m)?.dados)
  }, [historico])

  const r = doMes(ano, mes)
  const ant = mes === 1 ? doMes(ano - 1, 12) : doMes(ano, mes - 1)
  const rotuloAnt = mes === 1 ? `${MESES[11]}/${ano - 1}` : MESES[mes - 2]

  if (carregando) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={20} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  /** Uma linha do DRE. `tipo` só muda a cor e o recuo. */
  function Linha({ rotulo, campo, tipo = 'sub', sinal = '' }: {
    rotulo: string; campo: keyof ResumoMes; tipo?: 'titulo' | 'sub' | 'total'; sinal?: string
  }) {
    const v = Number(r[campo]) || 0
    const va = Number(ant[campo]) || 0
    const dif = v - va
    const subiu = dif > 0
    // Em despesa, subir é ruim; em receita e resultado, subir é bom.
    const ehDespesa = sinal === '−'
    const corDif = dif === 0 ? '#9ca3af' : (subiu === ehDespesa ? '#dc2626' : '#15803d')
    return (
      <tr style={{ borderBottom: '1px solid #f2f0ec', background: tipo === 'total' ? '#faf9f7' : undefined }}>
        <td style={{
          padding: tipo === 'sub' ? '7px 12px 7px 26px' : '10px 12px',
          fontSize: tipo === 'sub' ? 12.5 : 13,
          fontWeight: tipo === 'sub' ? 600 : 900,
          color: tipo === 'sub' ? '#4b5563' : '#1a1a1a',
        }}>{sinal && <span style={{ color: '#9ca3af', marginRight: 5 }}>{sinal}</span>}{rotulo}</td>
        <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: tipo === 'sub' ? 12.5 : 14, fontWeight: tipo === 'sub' ? 700 : 900, color: tipo === 'total' ? (v >= 0 ? '#15803d' : '#dc2626') : '#1a1a1a', whiteSpace: 'nowrap' }}>
          {moeda(v)}
        </td>
        <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11.5, color: '#9ca3af', whiteSpace: 'nowrap' }} className="no-mobile">
          {ant.temDados ? moeda(va) : '—'}
        </td>
        <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11.5, fontWeight: 800, color: corDif, whiteSpace: 'nowrap' }} className="no-mobile">
          {ant.temDados && dif !== 0
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              {subiu ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{moeda(Math.abs(dif))}
            </span>
            : '—'}
        </td>
      </tr>
    )
  }

  return (
    <div>
      <GradeMeses
        titulo="DRE — Resultado do mês"
        subtitulo="Vem da Calculadora, com as mesmas fórmulas dela. Clique no mês para ver."
        ano={ano} anos={anosDisponiveis(historico)} onAno={setAno}
        mesSel={mes} onMes={setMes}
        info={m => {
          const x = doMes(ano, m)
          return {
            valor: x.temDados ? moeda(x.resultadoOp) : '—',
            cor: x.resultadoOp >= 0 ? '#15803d' : '#dc2626',
            temDados: x.temDados,
            sub: x.temDados && x.faturamento > 0 ? pct(x.resultadoOpPct) : undefined,
          }
        }}
        acoes={
          <>
            <a href="/salon/calculadora-custo" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#5b4fcf', textDecoration: 'none' }}>
              Abrir Calculadora <ExternalLink size={12} />
            </a>
            <button onClick={() => window.print()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
              <Printer size={13} /> Imprimir
            </button>
          </>
        }
      />

      {!r.temDados ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 30 }}>
          {MESES[mes - 1]}/{ano} ainda não foi preenchido na Calculadora.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            {[
              { l: 'Faturamento', v: moeda(r.faturamento), c: '#0891b2' },
              { l: 'Margem operacional', v: `${moeda(r.margemR)} · ${pct(r.margemPct)}`, c: '#f59e0b' },
              { l: 'Resultado do mês', v: `${moeda(r.resultadoOp)} · ${pct(r.resultadoOpPct)}`, c: r.resultadoOp >= 0 ? '#16a34a' : '#dc2626' },
            ].map(k => (
              <div key={k.l} style={{ flex: 1, minWidth: 180, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '11px 14px' }}>
                <div style={{ fontSize: 10.5, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>{k.l}</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: k.c }}>{k.v}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
              <thead>
                <tr style={{ background: '#faf9f7' }}>
                  <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10.5, color: '#6b6860', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #e8e6e0' }}>
                    {MESES[mes - 1]}/{ano}
                  </th>
                  <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 10.5, color: '#6b6860', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #e8e6e0' }}>Valor</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 10.5, color: '#9ca3af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #e8e6e0', whiteSpace: 'nowrap' }} className="no-mobile">{rotuloAnt}</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right', fontSize: 10.5, color: '#9ca3af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #e8e6e0' }} className="no-mobile">Variação</th>
                </tr>
              </thead>
              <tbody>
                <Linha rotulo="FATURAMENTO" campo="faturamento" tipo="titulo" />
                <Linha rotulo="Custos diretos (imposto, produto, rateio, cartão)" campo="diretas" sinal="−" />
                <Linha rotulo="= MARGEM OPERACIONAL" campo="margemR" tipo="titulo" />
                <Linha rotulo="Despesas indiretas (fixas)" campo="indiretas" sinal="−" />
                <Linha rotulo="Provisão (13º, férias, FGTS)" campo="provisao" sinal="−" />
                <Linha rotulo="Depreciação" campo="depreciacao" sinal="−" />
                <Linha rotulo="= CUSTO OPERACIONAL" campo="custoOp" tipo="titulo" />
                <Linha rotulo="= RESULTADO OPERACIONAL" campo="resultadoOp" tipo="total" />
                <Linha rotulo="Outras despesas (equipamentos, distribuição)" campo="outras" sinal="−" />
                <Linha rotulo="= RESULTADO FINANCEIRO (caixa)" campo="resultadoFin" tipo="total" />
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '10px 2px 0' }}>
            O resultado financeiro soma a depreciação de volta, porque ela é um custo que não sai do caixa.
          </p>
        </>
      )}
    </div>
  )
}
