'use client'

// DRE do mês — o resultado do salão numa tela só.
//
// Tudo vem de dados que já existem (faturamento e comissões do relatório do
// avec, despesas da Calculadora) e é recalculado com as mesmas fórmulas dela.
// Cada linha tem uma barra proporcional ao faturamento, para dar para ver o
// peso de cada custo sem precisar comparar números.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Loader2, Printer, ExternalLink, TrendingUp, TrendingDown, BarChart3, AlertTriangle } from 'lucide-react'
import GradeMeses from './GradeMeses'
import { MESES, anosDisponiveis, moeda, pct, realPorMes, resumoDoMes, type ResumoMes } from '@/lib/calcFinanceiro'

interface Registro { ano: number; mes: number; dados: any }

/** Uma linha da cascata. */
interface Def {
  rotulo: string
  campo: keyof ResumoMes
  tipo: 'entrada' | 'custo' | 'subtotal' | 'resultado'
  cor: string
  ajuda?: string
}

const LINHAS: Def[] = [
  { rotulo: 'Faturamento', campo: 'faturamento', tipo: 'entrada', cor: '#0891b2', ajuda: 'Tudo que entrou no mês' },
  { rotulo: 'Profissionais', campo: 'profissionais', tipo: 'custo', cor: '#ef4444', ajuda: 'Comissões pagas no mês' },
  { rotulo: 'Outros custos diretos', campo: 'diretasOutras', tipo: 'custo', cor: '#f97316', ajuda: 'Imposto, produto, cartão' },
  { rotulo: 'Margem operacional', campo: 'margemR', tipo: 'subtotal', cor: '#f59e0b', ajuda: 'O que sobra para pagar os custos fixos' },
  { rotulo: 'Despesas indiretas', campo: 'indiretas', tipo: 'custo', cor: '#a855f7', ajuda: 'Aluguel, luz, salários — os fixos' },
  { rotulo: 'Provisão', campo: 'provisao', tipo: 'custo', cor: '#8b5cf6', ajuda: '13º, férias e FGTS guardados' },
  { rotulo: 'Depreciação', campo: 'depreciacao', tipo: 'custo', cor: '#6366f1', ajuda: 'Desgaste dos equipamentos' },
  { rotulo: 'Resultado operacional', campo: 'resultadoOp', tipo: 'resultado', cor: '#16a34a', ajuda: 'O lucro do mês' },
  { rotulo: 'Outras despesas', campo: 'outras', tipo: 'custo', cor: '#64748b', ajuda: 'Equipamentos, distribuição de sócios' },
  { rotulo: 'Resultado financeiro', campo: 'resultadoFin', tipo: 'resultado', cor: '#16a34a', ajuda: 'O que efetivamente sobra em caixa' },
]

export default function DreMensal() {
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
  const doMes = useMemo(() => {
    const busca = (a: number, m: number) => historico.find(h => Number(h.ano) === a && Number(h.mes) === m)
    return (a: number, m: number) => resumoDoMes(busca(a, m)?.dados, real.get(`${a}-${m}`))
  }, [historico, real])

  const r = doMes(ano, mes)
  const ant = mes === 1 ? doMes(ano - 1, 12) : doMes(ano, mes - 1)
  const rotuloAnt = mes === 1 ? `${MESES[11]}/${ano - 1}` : MESES[mes - 2]
  const semDespesas = r.temDados && r.custoOp === 0
  const diasNoMes = new Date(ano, mes, 0).getDate()

  if (carregando) return (
    <div style={{ padding: 50, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={22} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  return (
    <div>
      <GradeMeses
        titulo="DRE — Resultado do mês"
        subtitulo="Faturamento e comissões vêm do avec; as despesas, da Calculadora."
        icone={<BarChart3 size={19} />}
        ano={ano} anos={anosDisponiveis(historico, real)} onAno={setAno}
        mesSel={mes} onMes={setMes}
        info={m => {
          const x = doMes(ano, m)
          return {
            valor: x.temDados ? moeda(x.resultadoOp) : '—',
            cor: x.resultadoOp >= 0 ? '#16a34a' : '#dc2626',
            temDados: x.temDados,
            sub: x.temDados && x.faturamento > 0 ? `${pct(x.resultadoOpPct)} do faturamento` : undefined,
            barra: x.faturamento > 0 ? Math.max(0, x.resultadoOpPct) : undefined,
            alerta: x.temDados && x.custoOp === 0 ? 'Mês sem despesas lançadas na Calculadora' : undefined,
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

      {!r.temDados ? (
        <div style={{ textAlign: 'center', padding: '44px 20px', background: '#fff', border: '1px dashed #e0ddd8', borderRadius: 14 }}>
          <p style={{ color: '#8a8680', fontSize: 13.5, fontWeight: 700, margin: 0 }}>{MESES[mes - 1]} de {ano} ainda não tem dados.</p>
          <p style={{ color: '#a8a49d', fontSize: 12, margin: '5px 0 0' }}>Importe o relatório do mês em Relatórios ou preencha a Calculadora.</p>
        </div>
      ) : (
        <>
          {/* Avisos de leitura: de onde veio o número e o que falta nele */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 13 }}>
            <Aviso tom={r.faturamentoReal ? 'neutro' : 'atencao'}>
              {r.faturamentoReal
                ? <>Faturamento do relatório do avec{r.diasImportados > 0 && <> · <b>{r.diasImportados} de {diasNoMes} dias</b>{r.diasImportados < diasNoMes && <span style={{ color: '#b45309' }}> — mês ainda em andamento</span>}</>}</>
                : <>Sem relatório do avec em {MESES[mes - 1]}: o valor abaixo é a <b>média digitada na Calculadora</b>, não o realizado.</>}
            </Aviso>
            {semDespesas && (
              <Aviso tom="atencao">
                <b>{MESES[mes - 1]} não tem despesas lançadas na Calculadora</b> — sem aluguel, luz, salários. O resultado abaixo está mais alto do que a realidade.
              </Aviso>
            )}
          </div>

          {/* Os três números que respondem "como foi o mês" */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(196px, 1fr))', gap: 10, marginBottom: 14 }}>
            <Kpi rotulo="Faturamento" valor={moeda(r.faturamento)} cor="#0891b2" fundo="#ecfeff"
              nota={ant.temDados ? variacao(r.faturamento, ant.faturamento, false, rotuloAnt) : undefined} />
            <Kpi rotulo="Margem operacional" valor={moeda(r.margemR)} cor="#b45309" fundo="#fffbeb"
              nota={`${pct(r.margemPct)} do faturamento`} />
            <Kpi rotulo="Resultado do mês" valor={moeda(r.resultadoOp)} cor={r.resultadoOp >= 0 ? '#15803d' : '#b91c1c'} fundo={r.resultadoOp >= 0 ? '#f0fdf4' : '#fef2f2'}
              nota={`${pct(r.resultadoOpPct)} do faturamento`} destaque />
          </div>

          {/* Cascata: cada linha com barra proporcional ao faturamento */}
          <div style={{ background: '#fff', border: '1px solid #eae8e3', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderBottom: '1px solid #f2f0ec', background: '#fbfbfa' }}>
              <span style={{ fontSize: 11.5, fontWeight: 900, color: '#1a1a1a', letterSpacing: '.3px' }}>{MESES[mes - 1].toUpperCase()} / {ano}</span>
              <div style={{ flex: 1 }} />
              <span className="no-mobile" style={{ fontSize: 10.5, fontWeight: 800, color: '#a8a49d', textTransform: 'uppercase', letterSpacing: '.5px' }}>vs. {rotuloAnt}</span>
            </div>

            <div style={{ padding: '6px 16px 14px' }}>
              {LINHAS.map(def => {
                const v = Number(r[def.campo]) || 0
                const va = Number(ant[def.campo]) || 0
                const larg = r.faturamento > 0 ? Math.min(1, Math.abs(v) / r.faturamento) : 0
                const ehResultado = def.tipo === 'resultado'
                const ehSubtotal = def.tipo === 'subtotal'
                const forte = ehResultado || ehSubtotal
                const cor = ehResultado ? (v >= 0 ? '#16a34a' : '#dc2626') : def.cor

                return (
                  <div key={def.rotulo} style={{
                    padding: forte ? '11px 0 12px' : '8px 0',
                    borderTop: forte ? '1.5px solid #eae8e3' : '1px solid #f7f6f3',
                    marginTop: forte ? 4 : 0,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                      {def.tipo === 'custo' && <span style={{ color: '#c9c5be', fontWeight: 800, fontSize: 12 }}>−</span>}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: forte ? 13.5 : 12.5, fontWeight: forte ? 900 : 700, color: forte ? '#1a1a1a' : '#4b5563', letterSpacing: forte ? '-.1px' : 0 }}>
                          {def.rotulo}
                        </div>
                        {def.ajuda && <div style={{ fontSize: 10.5, color: '#a8a49d', marginTop: 1 }}>{def.ajuda}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: forte ? 16 : 13.5, fontWeight: 900, color: forte ? cor : '#1a1a1a', letterSpacing: '-.3px', whiteSpace: 'nowrap' }}>
                          {moeda(v)}
                        </div>
                        {r.faturamento > 0 && v !== 0 && (
                          <div style={{ fontSize: 10.5, color: '#a8a49d', fontWeight: 700 }}>{pct(Math.abs(v) / r.faturamento)}</div>
                        )}
                      </div>
                      <div className="no-mobile" style={{ width: 118, textAlign: 'right', flexShrink: 0 }}>
                        {ant.temDados
                          ? variacaoNode(v, va, def.tipo === 'custo')
                          : <span style={{ fontSize: 11, color: '#d7d5cf' }}>—</span>}
                      </div>
                    </div>

                    {larg > 0 && (
                      <div style={{ height: forte ? 6 : 4, borderRadius: 99, background: '#f5f4f0', overflow: 'hidden', marginTop: 6 }}>
                        <div style={{ width: `${Math.max(1.5, larg * 100)}%`, height: '100%', background: cor, borderRadius: 99 }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <p style={{ fontSize: 11.5, color: '#a8a49d', margin: '11px 4px 0', lineHeight: 1.5 }}>
            As barras mostram o peso de cada linha sobre o faturamento do mês. O resultado financeiro soma a depreciação de volta, porque ela é um custo que não sai do caixa.
          </p>
        </>
      )}
    </div>
  )
}

// ── Peças da tela ──────────────────────────────────────────────────────────

function Aviso({ tom, children }: { tom: 'neutro' | 'atencao'; children: ReactNode }) {
  const atencao = tom === 'atencao'
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      background: atencao ? '#fffbeb' : '#f8f8fc',
      border: `1px solid ${atencao ? '#fde68a' : '#eae8e3'}`,
      borderRadius: 10, padding: '9px 13px', fontSize: 12, color: '#4b5563', fontWeight: 600, lineHeight: 1.45,
    }}>
      {atencao && <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />}
      <span>{children}</span>
    </div>
  )
}

function Kpi({ rotulo, valor, cor, fundo, nota, destaque }: {
  rotulo: string; valor: string; cor: string; fundo: string; nota?: ReactNode; destaque?: boolean
}) {
  return (
    <div style={{
      background: fundo, border: `1px solid ${destaque ? cor + '55' : '#eae8e3'}`,
      borderRadius: 13, padding: '13px 16px',
    }}>
      <div style={{ fontSize: 10, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 4 }}>{rotulo}</div>
      <div style={{ fontSize: destaque ? 23 : 20, fontWeight: 900, color: cor, letterSpacing: '-.6px', lineHeight: 1.15 }}>{valor}</div>
      {nota && <div style={{ fontSize: 11, color: '#8a8680', fontWeight: 700, marginTop: 3 }}>{nota}</div>}
    </div>
  )
}

/** Texto curto de variação, para o rodapé do KPI. */
function variacao(v: number, va: number, ehCusto: boolean, rotulo: string) {
  const dif = v - va
  if (!va || dif === 0) return `${rotulo}: ${moeda(va)}`
  const bom = ehCusto ? dif < 0 : dif > 0
  return (
    <span style={{ color: bom ? '#15803d' : '#b91c1c', fontWeight: 800 }}>
      {dif > 0 ? '▲' : '▼'} {moeda(Math.abs(dif))} <span style={{ color: '#8a8680', fontWeight: 600 }}>vs. {rotulo}</span>
    </span>
  )
}

/** Seta + valor da variação, para a coluna da cascata. */
function variacaoNode(v: number, va: number, ehCusto: boolean) {
  const dif = v - va
  if (dif === 0) return <span style={{ fontSize: 11, color: '#d7d5cf' }}>—</span>
  const subiu = dif > 0
  const bom = ehCusto ? !subiu : subiu
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 800, color: bom ? '#15803d' : '#b91c1c' }}>
      {subiu ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{moeda(Math.abs(dif))}
    </span>
  )
}
