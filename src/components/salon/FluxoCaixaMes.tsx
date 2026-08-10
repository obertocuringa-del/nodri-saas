'use client'

// Fluxo de caixa mês a mês, com projeção dos meses que ainda não têm relatório
// — a projeção usa a MÉDIA dos meses já realizados no ano (o "faturamento
// atual"), então ela muda sozinha conforme o salão fatura.
//
// Depreciação fica de fora de propósito: é custo, mas não sai do caixa.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, ExternalLink, Printer, Wallet, AlertTriangle } from 'lucide-react'
import GradeMeses from './GradeMeses'
import { MESES, MESES_CURTO, anosDisponiveis, moeda, num, realPorMes, resumoDoMes } from '@/lib/calcFinanceiro'

interface Registro { ano: number; mes: number; dados: any }

export default function FluxoCaixaMes() {
  const hoje = new Date()
  const [historico, setHistorico] = useState<Registro[]>([])
  const [rel, setRel] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)

  useEffect(() => {
    Promise.all([
      fetch('/api/salon/calculadora', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/relatorios', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([calc, relatorios]) => {
      setHistorico(Array.isArray(calc?.historico) ? calc.historico : [])
      setRel(relatorios)
    }).finally(() => setCarregando(false))
  }, [])

  const real = useMemo(() => realPorMes(rel), [rel])
  const registro = (a: number, m: number) => historico.find(h => Number(h.ano) === a && Number(h.mes) === m)

  // Caixa de cada mês do ano: o que entrou, o que saiu e o que sobrou.
  // Só conta como realizado o mês que tem faturamento vindo do avec — o campo
  // da Calculadora é média mensal e inflaria a projeção.
  const linhas = useMemo(() => MESES.map((nome, i) => {
    const r = resumoDoMes(registro(ano, i + 1)?.dados, real.get(`${ano}-${i + 1}`))
    const saidas = r.diretas + r.indiretas + r.provisao + r.outras
    return {
      mes: i + 1, nome, entradas: r.faturamento, saidas,
      saldo: r.faturamento - saidas, realizado: r.faturamentoReal,
      semDespesas: r.faturamentoReal && r.custoOp === 0, r,
    }
  }), [historico, real, ano])

  // Média do que já aconteceu no ano — é a base da projeção.
  const realizados = linhas.filter(l => l.realizado && l.entradas > 0)
  const mediaEnt = realizados.length ? realizados.reduce((s, l) => s + l.entradas, 0) / realizados.length : 0
  const mediaSai = realizados.length ? realizados.reduce((s, l) => s + l.saidas, 0) / realizados.length : 0

  // Projeção: mês sem relatório herda a média. Acumula para mostrar o caixa
  // chegando (ou faltando) ao longo do ano.
  let acumulado = 0
  const projecao = linhas.map(l => {
    const usaReal = l.realizado && l.entradas > 0
    const ent = usaReal ? l.entradas : mediaEnt
    const sai = usaReal ? l.saidas : mediaSai
    acumulado += ent - sai
    return { ...l, entProj: ent, saiProj: sai, saldoProj: ent - sai, acumulado, projetado: !usaReal }
  })

  const atual = projecao.find(l => l.mes === mes)!
  const totalAno = projecao[11].acumulado
  const mesesSemDespesas = projecao.filter(l => l.semDespesas).length
  const maiorSaldo = Math.max(1, ...projecao.map(l => Math.abs(l.saldoProj)))

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
    <div style={{ padding: 50, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={22} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  return (
    <div>
      <GradeMeses
        titulo="Fluxo de caixa"
        subtitulo={realizados.length
          ? `Entradas e comissões do avec. Meses sem relatório são projetados pela média de ${realizados.length} ${realizados.length === 1 ? 'mês realizado' : 'meses realizados'}.`
          : 'Importe o relatório de um mês em Relatórios para o fluxo começar a projetar.'}
        icone={<Wallet size={19} />}
        ano={ano} anos={anosDisponiveis(historico, real)} onAno={setAno}
        mesSel={mes} onMes={setMes}
        info={m => {
          const l = projecao[m - 1]
          const vale = l.realizado || mediaEnt > 0
          return {
            valor: vale ? moeda(l.saldoProj) : '—',
            cor: l.saldoProj >= 0 ? '#16a34a' : '#dc2626',
            temDados: vale,
            sub: l.projetado ? 'projetado' : 'realizado',
            barra: vale ? Math.abs(l.saldoProj) / maiorSaldo : undefined,
            alerta: l.semDespesas ? 'Mês sem despesas na Calculadora' : undefined,
          }
        }}
        acoes={
          <>
            <a href="/salon/calculadora-custo" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e0ddd8', background: '#fff', fontSize: 12.5, fontWeight: 800, color: '#5b4fcf', textDecoration: 'none' }}>
              Calculadora <ExternalLink size={12} />
            </a>
            <button onClick={() => window.print()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
              <Printer size={13} /> Imprimir
            </button>
          </>
        }
      />

      {mesesSemDespesas > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '9px 13px', marginBottom: 11, fontSize: 12, color: '#4b5563', fontWeight: 600, lineHeight: 1.45 }}>
          <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <b>{mesesSemDespesas} {mesesSemDespesas === 1 ? 'mês está' : 'meses estão'} sem despesas fixas na Calculadora</b> (marcados com ▲).
            Neles só entram as comissões, então o saldo aparece bem maior do que foi de verdade — e isso também puxa a projeção para cima.
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 14 }}>
        <Kpi rotulo={`Entradas · ${MESES[mes - 1]}`} valor={moeda(atual.entProj)} nota={atual.projetado ? 'projetado pela média' : 'realizado'} cor="#0891b2" fundo="#ecfeff" />
        <Kpi rotulo={`Saídas · ${MESES[mes - 1]}`} valor={moeda(atual.saiProj)} nota="comissões + fixas + provisão" cor="#b45309" fundo="#fffbeb" />
        <Kpi rotulo="Saldo do mês" valor={moeda(atual.saldoProj)} nota={`acumulado: ${moeda(atual.acumulado)}`} cor={atual.saldoProj >= 0 ? '#15803d' : '#b91c1c'} fundo={atual.saldoProj >= 0 ? '#f0fdf4' : '#fef2f2'} destaque />
        <Kpi rotulo="Fecha o ano em" valor={moeda(totalAno)} nota="realizado + projetado" cor={totalAno >= 0 ? '#15803d' : '#b91c1c'} fundo="#fff" />
      </div>

      {/* Gráfico do saldo de cada mês: barra cheia = realizado, listrada = projeção */}
      {(mediaEnt > 0 || realizados.length > 0) && (
        <div style={{ background: '#fff', border: '1px solid #eae8e3', borderRadius: 14, padding: '14px 16px 10px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, fontWeight: 900, color: '#1a1a1a', letterSpacing: '.3px' }}>SALDO POR MÊS</span>
            <div style={{ flex: 1 }} />
            <Legenda cor="#16a34a" texto="realizado" />
            <Legenda cor="#c7d2d6" texto="projetado" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 116 }}>
            {projecao.map(l => {
              const alt = Math.max(3, (Math.abs(l.saldoProj) / maiorSaldo) * 100)
              const neg = l.saldoProj < 0
              const cor = l.projetado ? '#c7d2d6' : neg ? '#dc2626' : '#16a34a'
              return (
                <button key={l.mes} onClick={() => setMes(l.mes)} title={`${l.nome}: ${moeda(l.saldoProj)}`}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 5, height: '100%', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
                  <div style={{
                    width: '100%', height: `${alt}%`, minHeight: 3, borderRadius: '5px 5px 2px 2px',
                    background: cor, opacity: l.mes === mes ? 1 : .62,
                    outline: l.mes === mes ? '2px solid #5b4fcf' : 'none', outlineOffset: 1,
                  }} />
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: l.mes === mes ? '#5b4fcf' : '#a8a49d' }}>{MESES_CURTO[l.mes - 1]}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #eae8e3', borderRadius: 14, overflowX: 'auto', marginBottom: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr style={{ background: '#fbfbfa' }}>
              {['Mês', 'Entradas', 'Saídas', 'Saldo', 'Acumulado'].map((h, i) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', borderBottom: '1px solid #eae8e3', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projecao.map(l => (
              <tr key={l.mes} onClick={() => setMes(l.mes)}
                style={{ borderBottom: '1px solid #f7f6f3', cursor: 'pointer', background: l.mes === mes ? '#f7f6fd' : undefined }}>
                <td style={{ padding: '9px 12px', fontSize: 12.5, fontWeight: 800, color: l.projetado ? '#a8a49d' : '#1a1a1a', whiteSpace: 'nowrap' }}>
                  {MESES_CURTO[l.mes - 1]}
                  {l.projetado && <Tag texto="projetado" />}
                  {l.semDespesas && <Tag texto="sem despesas" alerta />}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12.5, color: '#6b6860' }}>{l.entProj > 0 ? moeda(l.entProj) : '—'}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12.5, color: '#6b6860' }}>{l.saiProj > 0 ? moeda(l.saiProj) : '—'}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12.5, fontWeight: 800, color: l.saldoProj >= 0 ? '#15803d' : '#dc2626' }}>{(l.entProj || l.saiProj) ? moeda(l.saldoProj) : '—'}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12.5, fontWeight: 900, color: l.acumulado >= 0 ? '#15803d' : '#dc2626' }}>{(mediaEnt > 0 || l.realizado) ? moeda(l.acumulado) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {boletos.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #eae8e3', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            <span style={{ fontSize: 11.5, fontWeight: 900, color: '#1a1a1a', letterSpacing: '.3px' }}>VENCIMENTOS DE {MESES[mes - 1].toUpperCase()}</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 99, padding: '2px 9px' }}>
              {boletos.length} · {moeda(boletos.reduce((s, b) => s + b.valor, 0))}
            </span>
          </div>
          {boletos.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid #f7f6f3', fontSize: 12.5 }}>
              <span style={{ color: '#a8a49d', fontWeight: 800, whiteSpace: 'nowrap', fontSize: 11.5 }}>{b.venc.split('-').reverse().join('/')}</span>
              <span style={{ flex: 1, color: '#374151', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.nome}</span>
              <span style={{ fontWeight: 900, color: '#b45309', whiteSpace: 'nowrap' }}>{moeda(b.valor)}</span>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 11.5, color: '#a8a49d', margin: '11px 4px 0', lineHeight: 1.5 }}>
        A depreciação não entra: é custo, mas não sai do caixa. As saídas são comissões, custos diretos, despesas fixas, provisão e outras despesas.
      </p>
    </div>
  )
}

// ── Peças da tela ──────────────────────────────────────────────────────────

function Kpi({ rotulo, valor, nota, cor, fundo, destaque }: {
  rotulo: string; valor: string; nota?: string; cor: string; fundo: string; destaque?: boolean
}) {
  return (
    <div style={{ background: fundo, border: `1px solid ${destaque ? cor + '55' : '#eae8e3'}`, borderRadius: 13, padding: '13px 16px' }}>
      <div style={{ fontSize: 10, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 4 }}>{rotulo}</div>
      <div style={{ fontSize: destaque ? 21 : 18.5, fontWeight: 900, color: cor, letterSpacing: '-.5px', lineHeight: 1.15 }}>{valor}</div>
      {nota && <div style={{ fontSize: 11, color: '#a8a49d', fontWeight: 700, marginTop: 3 }}>{nota}</div>}
    </div>
  )
}

function Tag({ texto, alerta }: { texto: string; alerta?: boolean }) {
  return (
    <span style={{
      marginLeft: 6, fontSize: 9, fontWeight: 800, letterSpacing: '.3px',
      color: alerta ? '#b45309' : '#a8a49d',
      background: alerta ? '#fffbeb' : 'transparent',
      border: `1px solid ${alerta ? '#fde68a' : '#eae8e3'}`,
      borderRadius: 99, padding: '1px 7px', whiteSpace: 'nowrap',
    }}>{texto}</span>
  )
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#8a8680', fontWeight: 700 }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: cor }} />{texto}
    </span>
  )
}
