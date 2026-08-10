'use client'

// Fluxo de caixa mês a mês, com projeção dos meses que ainda não têm nada
// lançado — a projeção usa a MÉDIA dos meses já realizados no ano (o
// "faturamento atual"), então ela muda sozinha conforme o salão fatura.
//
// Depreciação fica de fora de propósito: é custo, mas não sai do caixa.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, ExternalLink, Printer } from 'lucide-react'
import GradeMeses from './GradeMeses'
import { MESES, MESES_CURTO, anosDisponiveis, moeda, num, resumoDoMes } from '@/lib/calcFinanceiro'

interface Registro { ano: number; mes: number; dados: any }

export default function FluxoCaixaMes() {
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

  const registro = (a: number, m: number) => historico.find(h => Number(h.ano) === a && Number(h.mes) === m)

  // Caixa de cada mês do ano: o que entrou, o que saiu e o que sobrou.
  const linhas = useMemo(() => MESES.map((nome, i) => {
    const r = resumoDoMes(registro(ano, i + 1)?.dados)
    const saidas = r.diretas + r.indiretas + r.provisao + r.outras
    return { mes: i + 1, nome, entradas: r.faturamento, saidas, saldo: r.faturamento - saidas, realizado: r.temDados, r }
  }), [historico, ano])

  // Média do que já aconteceu no ano — é a base da projeção.
  const realizados = linhas.filter(l => l.realizado && l.entradas > 0)
  const mediaEnt = realizados.length ? realizados.reduce((s, l) => s + l.entradas, 0) / realizados.length : 0
  const mediaSai = realizados.length ? realizados.reduce((s, l) => s + l.saidas, 0) / realizados.length : 0

  // Projeção: mês sem lançamento herda a média. Acumula para mostrar o caixa
  // chegando (ou faltando) ao longo do ano.
  let acumulado = 0
  const projecao = linhas.map(l => {
    const ent = l.realizado && l.entradas > 0 ? l.entradas : mediaEnt
    const sai = l.realizado && l.entradas > 0 ? l.saidas : mediaSai
    acumulado += ent - sai
    return { ...l, entProj: ent, saiProj: sai, saldoProj: ent - sai, acumulado, projetado: !(l.realizado && l.entradas > 0) }
  })

  const atual = projecao.find(l => l.mes === mes)!
  const totalAno = projecao[11].acumulado

  // Boletos com vencimento dentro do mês escolhido, direto da Calculadora.
  const boletos = useMemo(() => {
    const d = registro(ano, mes)?.dados
    const todos = [...(d?.despInd || []), ...(d?.extrasDespInd || [])]
    return todos
      .filter((x: any) => String(x?.venc || '').trim() && num(x?.valor) > 0)
      .map((x: any) => ({ nome: String(x.nome || '—'), valor: num(x.valor), venc: String(x.venc).slice(0, 10) }))
      .sort((a, b) => a.venc.localeCompare(b.venc))
  }, [historico, ano, mes])

  if (carregando) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={20} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  const Kpi = ({ l, v, sub, c }: { l: string; v: string; sub?: string; c: string }) => (
    <div style={{ flex: 1, minWidth: 175, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '11px 14px' }}>
      <div style={{ fontSize: 10.5, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</div>
      <div style={{ fontSize: 17, fontWeight: 900, color: c }}>{v}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{sub}</div>}
    </div>
  )

  return (
    <div>
      <GradeMeses
        titulo="Fluxo de caixa"
        subtitulo={realizados.length
          ? `Meses sem lançamento são projetados pela média de ${realizados.length} ${realizados.length === 1 ? 'mês realizado' : 'meses realizados'}.`
          : 'Preencha um mês na Calculadora para o fluxo começar a projetar.'}
        ano={ano} anos={anosDisponiveis(historico)} onAno={setAno}
        mesSel={mes} onMes={setMes}
        info={m => {
          const l = projecao[m - 1]
          return {
            valor: mediaEnt > 0 || l.realizado ? moeda(l.saldoProj) : '—',
            cor: l.saldoProj >= 0 ? '#15803d' : '#dc2626',
            temDados: l.realizado || mediaEnt > 0,
            sub: l.projetado ? 'projetado' : 'realizado',
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

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <Kpi l={`Entradas · ${MESES[mes - 1]}`} v={moeda(atual.entProj)} sub={atual.projetado ? 'projetado pela média' : 'realizado'} c="#0891b2" />
        <Kpi l={`Saídas · ${MESES[mes - 1]}`} v={moeda(atual.saiProj)} sub="diretas + indiretas + provisão + outras" c="#f59e0b" />
        <Kpi l="Saldo do mês" v={moeda(atual.saldoProj)} sub={`acumulado no ano: ${moeda(atual.acumulado)}`} c={atual.saldoProj >= 0 ? '#16a34a' : '#dc2626'} />
        <Kpi l="Fecha o ano em" v={moeda(totalAno)} sub="realizado + projetado" c={totalAno >= 0 ? '#16a34a' : '#dc2626'} />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflowX: 'auto', marginBottom: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr style={{ background: '#faf9f7' }}>
              {['Mês', 'Entradas', 'Saídas', 'Saldo', 'Acumulado'].map((h, i) => (
                <th key={h} style={{ padding: '9px 11px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10.5, color: '#6b6860', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #e8e6e0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projecao.map(l => (
              <tr key={l.mes} onClick={() => setMes(l.mes)}
                style={{ borderBottom: '1px solid #f2f0ec', cursor: 'pointer', background: l.mes === mes ? '#f7f6fd' : undefined }}>
                <td style={{ padding: '8px 11px', fontSize: 12.5, fontWeight: 700, color: l.projetado ? '#9ca3af' : '#1a1a1a', whiteSpace: 'nowrap' }}>
                  {MESES_CURTO[l.mes - 1]}
                  {l.projetado && <span style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 800, color: '#9ca3af', border: '1px solid #e0ddd8', borderRadius: 99, padding: '1px 6px' }}>projetado</span>}
                </td>
                <td style={{ padding: '8px 11px', textAlign: 'right', fontSize: 12.5, color: '#6b6860' }}>{l.entProj > 0 ? moeda(l.entProj) : '—'}</td>
                <td style={{ padding: '8px 11px', textAlign: 'right', fontSize: 12.5, color: '#6b6860' }}>{l.saiProj > 0 ? moeda(l.saiProj) : '—'}</td>
                <td style={{ padding: '8px 11px', textAlign: 'right', fontSize: 12.5, fontWeight: 800, color: l.saldoProj >= 0 ? '#15803d' : '#dc2626' }}>{(l.entProj || l.saiProj) ? moeda(l.saldoProj) : '—'}</td>
                <td style={{ padding: '8px 11px', textAlign: 'right', fontSize: 12.5, fontWeight: 900, color: l.acumulado >= 0 ? '#15803d' : '#dc2626' }}>{(mediaEnt > 0 || l.realizado) ? moeda(l.acumulado) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {boletos.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>
            VENCIMENTOS DE {MESES[mes - 1].toUpperCase()}
            <span style={{ marginLeft: 7, fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>{boletos.length} · {moeda(boletos.reduce((s, b) => s + b.valor, 0))}</span>
          </div>
          {boletos.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderTop: '1px solid #f2f0ec', fontSize: 12.5 }}>
              <span style={{ color: '#9ca3af', fontWeight: 700, whiteSpace: 'nowrap' }}>{b.venc.split('-').reverse().join('/')}</span>
              <span style={{ flex: 1, color: '#374151', fontWeight: 600 }}>{b.nome}</span>
              <span style={{ fontWeight: 800, color: '#b45309', whiteSpace: 'nowrap' }}>{moeda(b.valor)}</span>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '10px 2px 0' }}>
        A depreciação não entra: é custo, mas não sai do caixa. As saídas são custos diretos, despesas indiretas, provisão e outras despesas.
      </p>
    </div>
  )
}
