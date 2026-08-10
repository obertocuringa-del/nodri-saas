'use client'

// Ponto de Equilíbrio do mês, com o quanto já foi atingido.
//
// Mesmas fórmulas da aba Ponto de Equilíbrio da Calculadora — aqui a leitura é
// mês a mês e com o alerta do ritmo: no mês corrente, compara o quanto do mês
// já passou com o quanto do PE já foi coberto.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, ExternalLink, AlertTriangle, CheckCircle2, Scale } from 'lucide-react'
import GradeMeses from './GradeMeses'
import { MESES, anosDisponiveis, moeda, pct, realPorMes, resumoDoMes } from '@/lib/calcFinanceiro'

interface Registro { ano: number; mes: number; dados: any }

export default function PontoEquilibrioMes() {
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
  const doMes = useMemo(() => (a: number, m: number) =>
    resumoDoMes(historico.find(h => Number(h.ano) === a && Number(h.mes) === m)?.dados, real.get(`${a}-${m}`)),
    [historico, real])

  const r = doMes(ano, mes)
  const atingido = r.pe > 0 ? r.faturamento / r.pe : 0
  const falta = Math.max(0, r.pe - r.faturamento)
  const ehMesCorrente = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const doMesPassado = ehMesCorrente ? hoje.getDate() / diasNoMes : 1
  // Custo operacional zerado é sinal de mês sem despesa lançada: o PE sai
  // baixíssimo e a leitura fica otimista demais.
  const semDespesas = r.temDados && r.custoOp === 0

  if (carregando) return (
    <div style={{ padding: 50, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={22} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  const ok = atingido >= 1
  const corBarra = ok ? '#16a34a' : atingido >= .8 ? '#f59e0b' : '#dc2626'

  return (
    <div>
      <GradeMeses
        titulo="Ponto de Equilíbrio"
        subtitulo="Quanto o salão precisa faturar para não ter prejuízo, mês a mês."
        icone={<Scale size={19} />}
        ano={ano} anos={anosDisponiveis(historico, real)} onAno={setAno}
        mesSel={mes} onMes={setMes}
        info={m => {
          const x = doMes(ano, m)
          const a = x.pe > 0 ? x.faturamento / x.pe : 0
          const vale = x.temDados && x.pe > 0
          return {
            valor: vale ? pct(a) : '—',
            cor: a >= 1 ? '#16a34a' : a >= .8 ? '#f59e0b' : '#dc2626',
            temDados: vale,
            sub: vale ? `PE ${moeda(x.pe)}` : undefined,
            barra: vale ? Math.min(1, a) : undefined,
            alerta: x.temDados && x.custoOp === 0 ? 'Mês sem despesas na Calculadora' : undefined,
          }
        }}
        acoes={
          <a href="/salon/calculadora-custo" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e0ddd8', background: '#fff', fontSize: 12.5, fontWeight: 800, color: '#5b4fcf', textDecoration: 'none' }}>
            Calculadora <ExternalLink size={12} />
          </a>
        }
      />

      {!r.temDados || r.pe <= 0 ? (
        <div style={{ textAlign: 'center', padding: '44px 20px', background: '#fff', border: '1px dashed #e0ddd8', borderRadius: 14 }}>
          <p style={{ color: '#8a8680', fontSize: 13.5, fontWeight: 700, margin: 0 }}>Não dá para calcular o ponto de equilíbrio de {MESES[mes - 1]}.</p>
          <p style={{ color: '#a8a49d', fontSize: 12, margin: '5px 0 0' }}>Falta o custo operacional do mês na Calculadora (despesas fixas).</p>
        </div>
      ) : (
        <>
          {semDespesas && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '9px 13px', marginBottom: 11, fontSize: 12, color: '#4b5563', fontWeight: 600, lineHeight: 1.45 }}>
              <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
              <span><b>{MESES[mes - 1]} não tem despesas fixas lançadas na Calculadora.</b> O ponto de equilíbrio sai baixo demais e o percentual abaixo fica otimista.</span>
            </div>
          )}

          {/* O painel principal: onde está o faturamento em relação ao PE */}
          <div style={{
            background: ok ? 'linear-gradient(135deg,#f0fdf4,#fff)' : 'linear-gradient(135deg,#fff7ed,#fff)',
            border: `1.5px solid ${ok ? '#86efac' : '#fed7aa'}`,
            borderRadius: 16, padding: '18px 20px', marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
              {ok ? <CheckCircle2 size={19} color="#16a34a" /> : <AlertTriangle size={19} color="#f59e0b" />}
              <span style={{ fontSize: 13, fontWeight: 800, color: ok ? '#15803d' : '#b45309', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                {ehMesCorrente ? `Dia ${hoje.getDate()} de ${MESES[mes - 1]}` : `${MESES[mes - 1]} de ${ano}`}
              </span>
            </div>

            <div style={{ fontSize: 38, fontWeight: 900, color: ok ? '#15803d' : '#b45309', letterSpacing: '-1.5px', lineHeight: 1.05, marginBottom: 3 }}>
              {pct(atingido)}
            </div>
            <div style={{ fontSize: 12.5, color: '#6b6860', fontWeight: 700, marginBottom: 13 }}>do ponto de equilíbrio atingido</div>

            <div style={{ position: 'relative', height: 16, borderRadius: 99, background: '#f0eee8', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${Math.min(100, atingido * 100)}%`, height: '100%', background: corBarra, borderRadius: 99, transition: 'width .35s' }} />
              {ehMesCorrente && (
                // Traço de quanto do mês já passou: barra atrás dele = ritmo
                // insuficiente para fechar o mês no azul.
                <div title="Quanto do mês já passou" style={{ position: 'absolute', top: -2, bottom: -2, left: `${doMesPassado * 100}%`, width: 2.5, background: '#1a1a1a', opacity: .5, borderRadius: 99 }} />
              )}
            </div>

            {ehMesCorrente && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#a8a49d', fontWeight: 700, marginBottom: 11 }}>
                <span>{moeda(r.faturamento)} faturado</span>
                <span>meta {moeda(r.pe)}</span>
              </div>
            )}

            <div style={{ fontSize: 13, color: '#4b5563', fontWeight: 600, lineHeight: 1.5 }}>
              {ok
                ? <>Passou do equilíbrio em <b style={{ color: '#15803d' }}>{moeda(r.faturamento - r.pe)}</b>. O resultado do mês está em <b>{moeda(r.resultadoOp)}</b>.</>
                : <>Faltam <b style={{ color: '#b45309' }}>{moeda(falta)}</b> para cobrir os custos.
                  {ehMesCorrente && <> Já se passaram {pct(doMesPassado)} do mês
                    {atingido < doMesPassado
                      ? <b style={{ color: '#dc2626' }}> — o ritmo está abaixo do necessário.</b>
                      : <b style={{ color: '#15803d' }}> — o ritmo está à frente.</b>}
                  </>}
                </>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
            <Kpi rotulo="Ponto de equilíbrio" valor={moeda(r.pe)} nota="faturamento mínimo do mês" cor="#10b981" fundo="#f0fdf4" destaque />
            <Kpi rotulo={`PE com lucro de ${pct(r.lucroDesejadoPct)}`} valor={moeda(r.peLucro)} nota="cobrir custos e ainda lucrar" cor="#7c6fe0" fundo="#f5f3ff" />
            <Kpi rotulo="Faturamento do mês" valor={moeda(r.faturamento)} nota={`margem de ${pct(r.margemPct)}`} cor="#0891b2" fundo="#ecfeff" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(178px, 1fr))', gap: 10 }}>
            {r.numProfs > 0 && <Kpi rotulo="PE por profissional" valor={moeda(r.pe / r.numProfs)} nota={`${r.numProfs} profissionais`} cor="#4b5563" fundo="#fff" />}
            {r.areaM2 > 0 && <Kpi rotulo="PE por m²" valor={moeda(r.pe / r.areaM2)} nota={`${r.areaM2} m² de salão`} cor="#4b5563" fundo="#fff" />}
            <Kpi rotulo="Custo operacional" valor={moeda(r.custoOp)} nota="indiretas + provisão + depreciação" cor="#b45309" fundo="#fff" />
            <Kpi rotulo="Capital de giro sugerido" valor={moeda(r.capitalGiro)} nota="3 meses de custo operacional" cor="#4b5563" fundo="#fff" />
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ rotulo, valor, nota, cor, fundo, destaque }: {
  rotulo: string; valor: string; nota?: string; cor: string; fundo: string; destaque?: boolean
}) {
  return (
    <div style={{ background: fundo, border: `1px solid ${destaque ? cor + '55' : '#eae8e3'}`, borderRadius: 13, padding: '13px 16px' }}>
      <div style={{ fontSize: 10, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 4 }}>{rotulo}</div>
      <div style={{ fontSize: destaque ? 21 : 18, fontWeight: 900, color: cor, letterSpacing: '-.5px', lineHeight: 1.15 }}>{valor}</div>
      {nota && <div style={{ fontSize: 11, color: '#a8a49d', fontWeight: 700, marginTop: 3 }}>{nota}</div>}
    </div>
  )
}
