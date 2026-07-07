'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BarChart3, Users, UserPlus, Calendar, ShieldCheck, ShieldOff, Cake, MessageCircle } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'

const COR = '#5b4fcf'
const CORES_PIZZA = ['#5b4fcf', '#c94d8a', '#16a34a', '#2563eb', '#b45309', '#dc2626', '#0891b2', '#9333ea']

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

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch('/api/salon/lojistas/relatorio').then(r => r.json())
      setDados(d)
    } catch { /* mostra tela vazia */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Carregando...</div>
  if (!dados) return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Não foi possível carregar o relatório.</div>

  const crescimentoFmt = dados.crescimento.map(c => ({ ...c, label: `${MESES_ABREV[Number(c.mes.slice(5, 7)) - 1]}/${c.mes.slice(2, 4)}` }))

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7' }}>
      <nav style={{ background: '#faf9f7', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/salon/lojistas')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={16} color={COR} /> Relatório — Lojistas</span>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <Kpi icone={<Users size={16} color={COR} />} label="Total de Lojistas" valor={dados.totais.total} />
          <Kpi icone={<UserPlus size={16} color="#16a34a" />} label="Novos este mês" valor={dados.totais.novos_este_mes} />
          <Kpi icone={<Calendar size={16} color="#2563eb" />} label="Cadastros hoje" valor={dados.totais.cadastros_hoje} />
          <Kpi icone={<ShieldCheck size={16} color="#16a34a" />} label="Ativos" valor={dados.totais.ativos} />
          <Kpi icone={<ShieldOff size={16} color="#dc2626" />} label="Inativos" valor={dados.totais.inativos} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>

          {/* CRESCIMENTO */}
          <div style={card}>
            <h2 style={cardTitulo}>Crescimento (últimos 12 meses)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={crescimentoFmt} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0eee9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip formatter={(v: any) => [v, 'Cadastros']} labelStyle={{ color: '#1a1a1a', fontWeight: 700 }} />
                <Line type="monotone" dataKey="qtd" stroke={COR} strokeWidth={2.5} dot={{ r: 3, fill: COR }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* SEGMENTOS */}
          <div style={card}>
            <h2 style={cardTitulo}>Segmentos</h2>
            {dados.segmentos.length === 0 ? <SemDados /> : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={dados.segmentos} dataKey="qtd" nameKey="segmento" cx="50%" cy="50%" outerRadius={80} label={(e: any) => e.segmento}>
                    {dados.segmentos.map((_, i) => <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* SERVIÇOS MAIS PROCURADOS */}
          <div style={{ ...card, gridColumn: '1 / -1' }}>
            <h2 style={cardTitulo}>Serviços Mais Procurados</h2>
            {dados.servicos.length === 0 ? <SemDados /> : (
              <>
                <ResponsiveContainer width="100%" height={Math.max(220, dados.servicos.length * 34)}>
                  <BarChart data={dados.servicos} layout="vertical" margin={{ top: 4, right: 30, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0eee9" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis type="category" dataKey="nome" width={160} tick={{ fontSize: 11, fill: '#374151' }} />
                    <Tooltip formatter={(v: any, _n: any, p: any) => [`${v} lojista(s) · ${p.payload.percentual}%`, 'Interesse']} />
                    <Bar dataKey="qtd" fill={COR} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          {/* ANIVERSARIANTES */}
          <div style={card}>
            <h2 style={cardTitulo}><Cake size={15} style={{ verticalAlign: -2 }} /> Aniversariantes</h2>
            <div style={{ display: 'flex', gap: 12 }}>
              <MiniStat label="Hoje" valor={dados.aniversariantes.hoje} />
              <MiniStat label="Em 7 dias" valor={dados.aniversariantes.semana} />
              <MiniStat label="Neste mês" valor={dados.aniversariantes.mes} />
            </div>
          </div>

          {/* PARTICIPAÇÃO NO GRUPO */}
          <div style={card}>
            <h2 style={cardTitulo}><MessageCircle size={15} style={{ verticalAlign: -2 }} /> Participação no Grupo</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ v: dados.grupo.entraram }, { v: dados.grupo.nao_entraram }]} dataKey="v" innerRadius={30} outerRadius={44} startAngle={90} endAngle={-270}>
                      <Cell fill="#16a34a" />
                      <Cell fill="#f3f4f6" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}>{dados.grupo.percentual}%</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, color: '#374151' }}><b style={{ color: '#16a34a' }}>{dados.grupo.entraram}</b> entraram no grupo</span>
                <span style={{ fontSize: 13, color: '#374151' }}><b style={{ color: '#9ca3af' }}>{dados.grupo.nao_entraram}</b> ainda não entraram</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Kpi({ icone, label, valor }: { icone: React.ReactNode; label: string; valor: number }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e8e6e0', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>{icone}<span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{label}</span></div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a' }}>{valor}</div>
    </div>
  )
}

function MiniStat({ label, valor }: { label: string; valor: number }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', background: '#f6f4ff', borderRadius: 10, padding: '12px 8px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: COR }}>{valor}</div>
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function SemDados() {
  return <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>Ainda sem dados suficientes.</div>
}

const card: React.CSSProperties = { background: 'white', border: '1px solid #e8e6e0', borderRadius: 14, padding: 18 }
const cardTitulo: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: '#1a1a1a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }
