'use client'

// Espelho anual do Custo Operacional: mostra, de janeiro a dezembro do ano
// escolhido, o que cada mês tem lançado na Calculadora.
//
// Nada é digitado aqui — os valores vêm da Calculadora e são recalculados com
// a MESMA fórmula que ela usa (Indiretas + Provisão + Depreciação), para não
// existir um segundo número que possa divergir do original.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const num = (v: any) => parseFloat(String(v ?? '0').replace(',', '.')) || 0
const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface Registro { ano: number; mes: number; dados: any }

/** Mesma conta da Calculadora: Indiretas + Provisão + Depreciação (84 meses). */
function custoOperacional(dados: any) {
  const indiretas = (dados?.despInd || []).reduce((s: number, d: any) => s + num(d.valor), 0)
    + (dados?.extrasDespInd || []).reduce((s: number, d: any) => s + num(d.valor), 0)
  const provisao = num(dados?.sal13) + num(dados?.ferias) + num(dados?.fgtsR)
  const depreciacao = num(dados?.totalDeprec) / 84
  return { indiretas, provisao, depreciacao, total: indiretas + provisao + depreciacao }
}

export default function PrevisaoDespesasAno() {
  const [historico, setHistorico] = useState<Registro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ano, setAno] = useState(new Date().getFullYear())

  useEffect(() => {
    fetch('/api/salon/calculadora', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setHistorico(Array.isArray(d?.historico) ? d.historico : []))
      .catch(() => setHistorico([]))
      .finally(() => setCarregando(false))
  }, [])

  const anos = useMemo(() => {
    const s = new Set<number>(historico.map(h => Number(h.ano)).filter(Boolean))
    s.add(new Date().getFullYear())
    return [...s].sort((a, b) => b - a)
  }, [historico])

  const linhas = useMemo(() => MESES.map((nome, i) => {
    const reg = historico.find(h => Number(h.ano) === ano && Number(h.mes) === i + 1)
    const c = reg ? custoOperacional(reg.dados) : null
    return { nome, mes: i + 1, faturamento: reg ? num(reg.dados?.fat) : 0, ...(c || { indiretas: 0, provisao: 0, depreciacao: 0, total: 0 }), temDados: !!reg }
  }), [historico, ano])

  const totalAno = linhas.reduce((s, l) => s + l.total, 0)
  const mesesComDados = linhas.filter(l => l.temDados).length
  const media = mesesComDados ? totalAno / mesesComDados : 0

  if (carregando) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={20} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  const Col = ({ v, forte = false }: { v: number; forte?: boolean }) => (
    <td style={{ padding: '9px 10px', textAlign: 'right', fontSize: 12.5, color: forte ? '#1a1a1a' : '#6b6860', fontWeight: forte ? 800 : 500, whiteSpace: 'nowrap' }}>
      {v > 0 ? moeda(v) : '—'}
    </td>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Previsão de despesas — {ano}</h2>
          <p style={{ fontSize: 12, color: '#6b6860', margin: '2px 0 0' }}>
            Espelho do Custo Operacional de cada mês, direto da Calculadora.
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <select value={ano} onChange={e => setAno(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 9, border: '1.5px solid #e0ddd8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <a href="/salon/calculadora-custo" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#5b4fcf', textDecoration: 'none' }}>
          Abrir Calculadora <ExternalLink size={12} />
        </a>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        {[
          { l: 'Total do ano', v: totalAno, c: '#f59e0b' },
          { l: `Média por mês (${mesesComDados} ${mesesComDados === 1 ? 'mês' : 'meses'})`, v: media, c: '#0891b2' },
        ].map(k => (
          <div key={k.l} style={{ flex: 1, minWidth: 190, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '11px 14px' }}>
            <div style={{ fontSize: 10.5, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>{k.l}</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: k.c }}>{moeda(k.v)}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr style={{ background: '#faf9f7' }}>
              {['Mês', 'Indiretas', 'Provisão', 'Depreciação', 'Custo Operacional', 'Faturamento'].map((h, i) => (
                <th key={h} style={{ padding: '9px 10px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10.5, color: '#6b6860', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #e8e6e0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map(l => (
              <tr key={l.mes} style={{ borderBottom: '1px solid #f2f0ec', background: l.temDados ? undefined : '#fcfcfb' }}>
                <td style={{ padding: '9px 10px', fontSize: 12.5, fontWeight: 700, color: l.temDados ? '#1a1a1a' : '#c4c0b8' }}>{l.nome}</td>
                <Col v={l.indiretas} /><Col v={l.provisao} /><Col v={l.depreciacao} />
                <Col v={l.total} forte /><Col v={l.faturamento} />
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#faf9f7' }}>
              <td style={{ padding: '10px', fontSize: 12, fontWeight: 900, color: '#1a1a1a' }}>TOTAL</td>
              <Col v={linhas.reduce((s, l) => s + l.indiretas, 0)} forte />
              <Col v={linhas.reduce((s, l) => s + l.provisao, 0)} forte />
              <Col v={linhas.reduce((s, l) => s + l.depreciacao, 0)} forte />
              <Col v={totalAno} forte />
              <Col v={linhas.reduce((s, l) => s + l.faturamento, 0)} forte />
            </tr>
          </tfoot>
        </table>
      </div>

      {mesesComDados === 0 && (
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 20 }}>
          Nenhum mês de {ano} preenchido na Calculadora ainda.
        </p>
      )}
    </div>
  )
}
