'use client'

// Ponto de Equilíbrio do mês, com o quanto já foi atingido.
//
// Mesmas fórmulas da aba Ponto de Equilíbrio da Calculadora — aqui a leitura é
// mês a mês e com o alerta do ritmo: no mês corrente, compara o quanto do mês
// já passou com o quanto do PE já foi coberto.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react'
import GradeMeses from './GradeMeses'
import { MESES, anosDisponiveis, moeda, pct, resumoDoMes } from '@/lib/calcFinanceiro'

interface Registro { ano: number; mes: number; dados: any }

export default function PontoEquilibrioMes() {
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

  const doMes = useMemo(() => (a: number, m: number) =>
    resumoDoMes(historico.find(h => Number(h.ano) === a && Number(h.mes) === m)?.dados), [historico])

  const r = doMes(ano, mes)
  const atingido = r.pe > 0 ? r.faturamento / r.pe : 0
  const falta = Math.max(0, r.pe - r.faturamento)
  const ehMesCorrente = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const doMesPassado = ehMesCorrente ? hoje.getDate() / diasNoMes : 1

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
        titulo="Ponto de Equilíbrio"
        subtitulo="Quanto o salão precisa faturar para não ter prejuízo, mês a mês."
        ano={ano} anos={anosDisponiveis(historico)} onAno={setAno}
        mesSel={mes} onMes={setMes}
        info={m => {
          const x = doMes(ano, m)
          const a = x.pe > 0 ? x.faturamento / x.pe : 0
          return {
            valor: x.temDados && x.pe > 0 ? pct(a) : '—',
            cor: a >= 1 ? '#15803d' : a >= 0.8 ? '#f59e0b' : '#dc2626',
            temDados: x.temDados && x.pe > 0,
            sub: x.temDados && x.pe > 0 ? `PE ${moeda(x.pe)}` : undefined,
          }
        }}
        acoes={
          <a href="/salon/calculadora-custo" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#5b4fcf', textDecoration: 'none' }}>
            Abrir Calculadora <ExternalLink size={12} />
          </a>
        }
      />

      {!r.temDados || r.pe <= 0 ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 30 }}>
          {MESES[mes - 1]}/{ano} não tem custo operacional e margem preenchidos na Calculadora, então não dá para calcular o ponto de equilíbrio.
        </p>
      ) : (
        <>
          {/* O alerta: onde está o faturamento em relação ao PE */}
          <div style={{
            background: atingido >= 1 ? '#f0fdf4' : '#fff7ed',
            border: `1.5px solid ${atingido >= 1 ? '#16a34a' : '#f59e0b'}`,
            borderRadius: 12, padding: '13px 16px', marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
              {atingido >= 1 ? <CheckCircle2 size={17} color="#16a34a" /> : <AlertTriangle size={17} color="#f59e0b" />}
              <span style={{ fontSize: 14, fontWeight: 900, color: atingido >= 1 ? '#15803d' : '#b45309' }}>
                {ehMesCorrente && <>Dia {hoje.getDate()} e </>}
                você atingiu {pct(atingido)} do ponto de equilíbrio
              </span>
            </div>

            <div style={{ position: 'relative', height: 12, borderRadius: 99, background: '#f0eee8', overflow: 'hidden', marginBottom: 7 }}>
              <div style={{ width: `${Math.min(100, atingido * 100)}%`, height: '100%', background: atingido >= 1 ? '#16a34a' : atingido >= 0.8 ? '#f59e0b' : '#dc2626', transition: 'width .3s' }} />
              {ehMesCorrente && (
                // Marca de quanto do mês já passou: se a barra está atrás dela,
                // o ritmo não fecha o mês.
                <div title="Quanto do mês já passou" style={{ position: 'absolute', top: 0, bottom: 0, left: `${doMesPassado * 100}%`, width: 2, background: '#1a1a1a', opacity: .55 }} />
              )}
            </div>

            <div style={{ fontSize: 12.5, color: '#4b5563', fontWeight: 600 }}>
              {atingido >= 1
                ? <>Passou do equilíbrio em <b style={{ color: '#15803d' }}>{moeda(r.faturamento - r.pe)}</b>. O resultado do mês está em {moeda(r.resultadoOp)}.</>
                : <>Faltam <b style={{ color: '#b45309' }}>{moeda(falta)}</b> para cobrir os custos.
                  {ehMesCorrente && <> Já se passaram {pct(doMesPassado)} do mês
                    {atingido < doMesPassado ? <b style={{ color: '#dc2626' }}> — o ritmo está abaixo do necessário.</b> : <b style={{ color: '#15803d' }}> — o ritmo está à frente.</b>}
                  </>}
                </>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <Kpi l="Ponto de equilíbrio" v={moeda(r.pe)} sub="faturamento mínimo do mês" c="#10b981" />
            <Kpi l={`PE com lucro de ${pct(r.lucroDesejadoPct)}`} v={moeda(r.peLucro)} sub="cobrir custos e ainda lucrar" c="#7c6fe0" />
            <Kpi l="Faturamento do mês" v={moeda(r.faturamento)} sub={`margem de ${pct(r.margemPct)}`} c="#0891b2" />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {r.numProfs > 0 && <Kpi l="PE por profissional" v={moeda(r.pe / r.numProfs)} sub={`${r.numProfs} profissionais`} c="#6b6860" />}
            {r.areaM2 > 0 && <Kpi l="PE por m²" v={moeda(r.pe / r.areaM2)} sub={`${r.areaM2} m²`} c="#6b6860" />}
            <Kpi l="Custo operacional" v={moeda(r.custoOp)} sub="indiretas + provisão + depreciação" c="#f59e0b" />
            <Kpi l="Capital de giro sugerido" v={moeda(r.capitalGiro)} sub="3 meses de custo operacional" c="#6b6860" />
          </div>
        </>
      )}
    </div>
  )
}
