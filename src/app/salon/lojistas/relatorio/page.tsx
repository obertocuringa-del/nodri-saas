'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { voltar } from '@/lib/historicoNav'
import { ArrowLeft, BarChart3, Users, UserPlus, Calendar, ShieldCheck, ShieldOff, Cake, MessageCircle, TrendingUp, Tag, ClipboardList } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import { linkWhatsappSalao } from '@/lib/lojistaFormatters'

const COR = '#5b4fcf'
const COR2 = '#0f766e'
const CORES_PIZZA = [COR, '#c94d8a', '#16a34a', '#2563eb', COR2, '#dc2626', '#9333ea', '#b45309']

interface Relatorio {
  totais: { total: number; novos_este_mes: number; cadastros_hoje: number; ativos: number; inativos: number }
  crescimento: { mes: string; qtd: number }[]
  segmentos: { segmento: string; qtd: number }[]
  servicos: { nome: string; qtd: number; percentual: number }[]
  aniversariantes: { hoje: number; semana: number; mes: number }
  grupo: { entraram: number; nao_entraram: number; percentual: number }
}

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function RelatorioLojistasPage() {
  const router = useRouter()
  const [dados, setDados] = useState<Relatorio | null>(null)
  const [loading, setLoading] = useState(true)
  const [telefoneSalao, setTelefoneSalao] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch('/api/salon/lojistas/relatorio').then(r => r.json())
      setDados(d)
    } catch { /* mostra tela vazia */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  // O botão flutuante global é do suporte da NODRI — aqui o correto é o WhatsApp do próprio salão.
  useEffect(() => {
    const btn = document.getElementById('whatsapp-float-btn')
    if (btn) btn.style.display = 'none'
    fetch('/api/salon/perfil').then(r => r.ok ? r.json() : null).then(salao => { if (salao?.telefone) setTelefoneSalao(salao.telefone) }).catch(() => {})
    return () => { if (btn) btn.style.display = '' }
  }, [])

  const estilosGlobais = (
    <style>{`
      @keyframes relFadeUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
      .rel-card { animation: relFadeUp 0.35s ease both; transition: box-shadow 0.2s ease, transform 0.2s ease; }
      .rel-card:hover { box-shadow: 0 10px 32px rgba(30,20,60,0.1); }
      .rel-kpi { transition: transform 0.15s ease, box-shadow 0.15s ease; }
      .rel-kpi:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(30,20,60,0.1); }
      .recharts-tooltip-wrapper { outline: none !important; }
      @media (max-width: 860px) {
        .rel-grid2 { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 640px) {
        .rel-kpis { grid-template-columns: repeat(2, 1fr) !important; }
      }
    `}</style>
  )

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f3fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${COR}30`, borderTop: `3px solid ${COR}`, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }
  if (!dados) {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f3fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>Não foi possível carregar o relatório.</p>
      </div>
    )
  }

  const crescimentoFmt = dados.crescimento.map(c => ({ ...c, label: `${MESES_ABREV[Number(c.mes.slice(5, 7)) - 1]}/${c.mes.slice(2, 4)}` }))
  const CustomTooltip = tooltipStyle

  const linkZapSalao = linkWhatsappSalao(telefoneSalao)

  return (
    <div style={{ minHeight: '100vh', background: '#f4f3fa' }}>
      {estilosGlobais}
      {linkZapSalao && (
        <a href={linkZapSalao} target="_blank" rel="noopener noreferrer" title="Falar com o salão no WhatsApp"
          style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, width: 52, height: 52, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,211,102,0.5)' }}>
          <MessageCircle size={26} color="white" />
        </a>
      )}

      <nav style={{ background: 'white', borderBottom: '1px solid #ece9f7', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => voltar(router, '/salon/lojistas')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 18, background: '#e0ddd8' }} />
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${COR}, ${COR2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BarChart3 size={16} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a', lineHeight: 1.2 }}>Relatório de Lojistas</div>
          <div style={{ fontSize: 11.5, color: '#9ca3af' }}>Indicadores do programa de parcerias</div>
        </div>
      </nav>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* KPIs */}
        <div className="rel-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
          <Kpi icone={<Users size={17} color={COR} />} corFundo={`${COR}15`} label="Total de Lojistas" valor={dados.totais.total} />
          <Kpi icone={<UserPlus size={17} color="#16a34a" />} corFundo="#16a34a15" label="Novos este mês" valor={dados.totais.novos_este_mes} />
          <Kpi icone={<Calendar size={17} color="#2563eb" />} corFundo="#2563eb15" label="Cadastros hoje" valor={dados.totais.cadastros_hoje} />
          <Kpi icone={<ShieldCheck size={17} color="#16a34a" />} corFundo="#16a34a15" label="Ativos" valor={dados.totais.ativos} />
          <Kpi icone={<ShieldOff size={17} color="#dc2626" />} corFundo="#dc262615" label="Inativos" valor={dados.totais.inativos} />
        </div>

        <div className="rel-grid2" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>

          {/* CRESCIMENTO */}
          <SecaoRelatorio titulo="Crescimento" subtitulo="Cadastros nos últimos 12 meses" icone={<TrendingUp size={16} color="white" />} cor={COR}>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={crescimentoFmt} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0eef9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#f0eef9' }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={CustomTooltip} />
                <Line type="monotone" dataKey="qtd" name="Cadastros" stroke={COR} strokeWidth={3} dot={{ r: 3.5, fill: COR, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </SecaoRelatorio>

          {/* SEGMENTOS */}
          <SecaoRelatorio titulo="Segmentos" subtitulo="Distribuição das lojas parceiras" icone={<Tag size={16} color="white" />} cor={COR2}>
            {dados.segmentos.length === 0 ? <SemDados /> : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={dados.segmentos} dataKey="qtd" nameKey="segmento" cx="50%" cy="50%" innerRadius={45} outerRadius={82} paddingAngle={2} cornerRadius={4}>
                    {dados.segmentos.map((_, i) => <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} stroke="white" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip content={CustomTooltip} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {dados.segmentos.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center', marginTop: 4 }}>
                {dados.segmentos.slice(0, 8).map((s, i) => (
                  <span key={s.segmento} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#6b7280', fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: CORES_PIZZA[i % CORES_PIZZA.length] }} />
                    {s.segmento} <b style={{ color: '#374151' }}>({s.qtd})</b>
                  </span>
                ))}
              </div>
            )}
          </SecaoRelatorio>
        </div>

        {/* SERVIÇOS MAIS PROCURADOS */}
        <SecaoRelatorio titulo="Serviços Mais Procurados" subtitulo="Ranking de interesse entre os lojistas" icone={<ClipboardList size={16} color="white" />} cor={COR}>
          {dados.servicos.length === 0 ? <SemDados /> : (
            <ResponsiveContainer width="100%" height={Math.max(220, dados.servicos.length * 32)}>
              <BarChart data={dados.servicos} layout="vertical" margin={{ top: 4, right: 30, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0eef9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#f0eef9' }} tickLine={false} />
                <YAxis type="category" dataKey="nome" width={170} tick={{ fontSize: 11.5, fill: '#374151', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip content={CustomTooltip} />
                <Bar dataKey="qtd" name="Interesse" fill={COR} radius={[0, 8, 8, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SecaoRelatorio>

        <div className="rel-grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

          {/* ANIVERSARIANTES */}
          <SecaoRelatorio titulo="Aniversariantes" icone={<Cake size={16} color="white" />} cor={COR}>
            <div style={{ display: 'flex', gap: 12 }}>
              <MiniStat label="Hoje" valor={dados.aniversariantes.hoje} />
              <MiniStat label="Em 7 dias" valor={dados.aniversariantes.semana} />
              <MiniStat label="Neste mês" valor={dados.aniversariantes.mes} />
            </div>
          </SecaoRelatorio>

          {/* PARTICIPAÇÃO NO GRUPO */}
          <SecaoRelatorio titulo="Participação no Grupo" icone={<MessageCircle size={16} color="white" />} cor="#16a34a">
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ v: dados.grupo.entraram }, { v: dados.grupo.nao_entraram }]} dataKey="v" innerRadius={32} outerRadius={46} startAngle={90} endAngle={-270} cornerRadius={6} paddingAngle={dados.grupo.nao_entraram > 0 && dados.grupo.entraram > 0 ? 3 : 0}>
                      <Cell fill="#16a34a" />
                      <Cell fill="#f0eef9" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#1a1a1a' }}>{dados.grupo.percentual}%</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Legenda cor="#16a34a" texto={<><b>{dados.grupo.entraram}</b> entraram no grupo</>} />
                <Legenda cor="#d1d5db" texto={<><b>{dados.grupo.nao_entraram}</b> ainda não entraram</>} />
              </div>
            </div>
          </SecaoRelatorio>
        </div>
      </div>
    </div>
  )
}

function tooltipStyle({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #ece9f7', borderRadius: 10, padding: '8px 12px', boxShadow: '0 8px 24px rgba(30,20,60,0.12)', fontSize: 12 }}>
      {label && <div style={{ fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: '#6b7280', fontWeight: 600 }}>
          {p.name || p.payload?.segmento || p.payload?.nome}: <b style={{ color: '#1a1a1a' }}>{p.value}</b>
          {p.payload?.percentual !== undefined ? ` · ${p.payload.percentual}%` : ''}
        </div>
      ))}
    </div>
  )
}

function Kpi({ icone, corFundo, label, valor }: { icone: React.ReactNode; corFundo: string; label: string; valor: number }) {
  return (
    <div className="rel-card rel-kpi" style={{ background: 'white', borderRadius: 14, padding: '16px 16px', boxShadow: '0 2px 12px rgba(30,20,60,0.05)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: corFundo, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{icone}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.1 }}>{valor}</div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function SecaoRelatorio({ titulo, subtitulo, icone, cor, children }: { titulo: string; subtitulo?: string; icone: React.ReactNode; cor: string; children: React.ReactNode }) {
  return (
    <div className="rel-card" style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 14px rgba(30,20,60,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icone}</div>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: '#1a1a1a' }}>{titulo}</div>
          {subtitulo && <div style={{ fontSize: 11.5, color: '#9ca3af' }}>{subtitulo}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}

function MiniStat({ label, valor }: { label: string; valor: number }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', background: '#f4f3fa', borderRadius: 12, padding: '16px 8px' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: COR }}>{valor}</div>
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginTop: 4 }}>{label}</div>
    </div>
  )
}

function Legenda({ cor, texto }: { cor: string; texto: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#374151' }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: cor, flexShrink: 0 }} />
      {texto}
    </div>
  )
}

function SemDados() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: 13 }}>
      Ainda sem dados suficientes para mostrar aqui.
    </div>
  )
}
