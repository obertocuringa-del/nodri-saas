'use client'

// Faturamento de cada profissional no mês, para enviar à contabilidade.
//
// O valor vem do relatório 0123 que já é importado do avec (Pagamentos por
// profissional) — nada é digitado aqui e nada foi mexido na importação.
//
// Conta: A pagar + coluna "descontos" do relatório (que vem com sinal:
// negativo abate, positivo acrescenta, vazio não mexe) − desconto fixo da casa.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Printer } from 'lucide-react'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const DESCONTO_PADRAO = 60   // o que a casa desconta de cada profissional

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const norm = (s: string) => (s || '').toUpperCase().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')

interface Pagamento { ano: number; mes: number; profissional: string; valor_a_pagar: number; desconto?: number }

export default function FaturamentoProfissionaisPJ() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [profs, setProfs] = useState<any[]>([])
  const [desconto, setDesconto] = useState(DESCONTO_PADRAO)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/relatorios', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/profissionais', { credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([rel, ps]) => {
      setPagamentos(Array.isArray(rel?.prof_pagamentos) ? rel.prof_pagamentos : [])
      setProfs(Array.isArray(ps) ? ps.filter((p: any) => !p.is_departamento) : [])
    }).finally(() => setCarregando(false))
  }, [])

  // Profissionais PJ (têm CNPJ) — são os que emitem nota para a contabilidade
  const linhas = useMemo(() => {
    const doMes = pagamentos.filter(p => Number(p.ano) === ano && Number(p.mes) === mes)
    const soma = new Map<string, number>()
    const somaDesc = new Map<string, number>()
    for (const p of doMes) {
      const k = norm(p.profissional)
      soma.set(k, (soma.get(k) || 0) + (Number(p.valor_a_pagar) || 0))
      somaDesc.set(k, (somaDesc.get(k) || 0) + (Number(p.desconto) || 0))
    }
    const pj = profs.filter(p => String(p.cnpj || '').trim() && p.ativo !== false)
    const base = pj.length ? pj : profs.filter(p => p.ativo !== false)
    return base.map(p => {
      const nome = p.apelido || p.nome_completo || '—'
      const k1 = norm(nome), k2 = norm(p.nome_completo || '')
      const aPagar = soma.get(k1) ?? soma.get(k2) ?? 0
      // O relatorio traz a coluna "descontos" com sinal: negativo abate do
      // A pagar, positivo acrescenta, vazio nao mexe em nada.
      const descRel = somaDesc.get(k1) ?? somaDesc.get(k2) ?? 0
      return { id: p.id, nome, cnpj: p.cnpj || '', aPagar, descRel, liquido: aPagar > 0 ? aPagar + descRel - desconto : 0 }
    }).sort((a, b) => b.aPagar - a.aPagar)
  }, [pagamentos, profs, ano, mes, desconto])

  const totAPagar = linhas.reduce((s, l) => s + l.aPagar, 0)
  const totDesc = linhas.reduce((s, l) => s + (l.aPagar > 0 ? l.descRel : 0), 0)
  const totLiquido = linhas.reduce((s, l) => s + l.liquido, 0)
  const comValor = linhas.filter(l => l.aPagar > 0).length
  const anos = [ano - 2, ano - 1, ano, ano + 1].filter((v, i, a) => a.indexOf(v) === i)

  if (carregando) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={20} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Faturamento dos profissionais</h2>
          <p style={{ fontSize: 12, color: '#6b6860', margin: '2px 0 0' }}>
            Vem do relatório de pagamentos importado do avec. {comValor} com valor em {MESES[mes - 1]}/{ano}.
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <select value={mes} onChange={e => setMes(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 9, border: '1.5px solid #e0ddd8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={ano} onChange={e => setAno(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 9, border: '1.5px solid #e0ddd8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b6860', fontWeight: 700 }}>
          − R$
          <input type="number" value={desconto} onChange={e => setDesconto(Number(e.target.value) || 0)}
            style={{ width: 62, padding: '7px 8px', borderRadius: 8, border: '1.5px solid #e0ddd8', fontSize: 12.5, fontWeight: 700 }} />
        </label>
        <button onClick={() => window.print()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
          <Printer size={13} /> Imprimir
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
          <thead>
            <tr style={{ background: '#faf9f7' }}>
              {['Profissional', 'CNPJ', 'A pagar (relatório)', 'Descontos', `Faturamento (− ${moeda(desconto)})`].map((h, i) => (
                <th key={h} style={{ padding: '9px 11px', textAlign: i > 1 ? 'right' : 'left', fontSize: 10.5, color: '#6b6860', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #e8e6e0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #f2f0ec' }}>
                <td style={{ padding: '9px 11px', fontSize: 12.5, fontWeight: 700, color: l.aPagar > 0 ? '#1a1a1a' : '#c4c0b8' }}>{l.nome}</td>
                <td style={{ padding: '9px 11px', fontSize: 11.5, color: '#6b6860' }}>{l.cnpj || '—'}</td>
                <td style={{ padding: '9px 11px', textAlign: 'right', fontSize: 12.5, color: '#6b6860' }}>{l.aPagar > 0 ? moeda(l.aPagar) : '—'}</td>
                <td style={{ padding: '9px 11px', textAlign: 'right', fontSize: 12.5, fontWeight: l.descRel ? 700 : 500, color: l.descRel < 0 ? '#b91c1c' : l.descRel > 0 ? '#15803d' : '#c4c0b8' }}>
                  {l.descRel ? `${l.descRel > 0 ? '+' : '−'} ${moeda(Math.abs(l.descRel))}` : '—'}
                </td>
                <td style={{ padding: '9px 11px', textAlign: 'right', fontSize: 13, fontWeight: 900, color: l.liquido > 0 ? '#15803d' : '#c4c0b8' }}>{l.liquido > 0 ? moeda(l.liquido) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#faf9f7' }}>
              <td colSpan={2} style={{ padding: '10px 11px', fontSize: 12, fontWeight: 900 }}>TOTAL</td>
              <td style={{ padding: '10px 11px', textAlign: 'right', fontSize: 12.5, fontWeight: 800, color: '#6b6860' }}>{moeda(totAPagar)}</td>
              <td style={{ padding: '10px 11px', textAlign: 'right', fontSize: 12.5, fontWeight: 800, color: totDesc < 0 ? '#b91c1c' : '#15803d' }}>{totDesc ? `${totDesc > 0 ? '+' : '−'} ${moeda(Math.abs(totDesc))}` : '—'}</td>
              <td style={{ padding: '10px 11px', textAlign: 'right', fontSize: 13.5, fontWeight: 900, color: '#15803d' }}>{moeda(totLiquido)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {comValor === 0 && (
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 20 }}>
          Sem pagamentos importados para {MESES[mes - 1]}/{ano}. Importe o relatório do mês em Relatórios.
        </p>
      )}
    </div>
  )
}
