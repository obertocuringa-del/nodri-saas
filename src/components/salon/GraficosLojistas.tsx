'use client'

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'

// ── Os três gráficos do relatório de lojistas ────────────────────────────────
//
// Eles moravam dentro da própria página. O problema não era o desenho: é que
// a biblioteca de gráficos (recharts) sozinha responde por mais da metade do
// peso daquela tela, e vinha junto com o HTML para quem só queria ver os
// números de cima — os KPIs, os aniversariantes, a lista.
//
// Separados num arquivo próprio, a página carrega primeiro e busca os
// gráficos depois, enquanto a pessoa já está lendo o resto.
//
// Por que um arquivo e não três `dynamic` soltos na página: a recharts olha o
// TIPO de cada filho para saber o que desenhar (isto é um eixo, isto é uma
// linha). Embrulhar <Line> ou <XAxis> em componente carregado sob demanda
// esconde esse tipo dela, e o gráfico sai vazio. O corte tem que ser no
// gráfico inteiro.

function Balao({ active, payload, label }: any) {
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

export function GraficoCrescimento({ dados, cor }: { dados: any[]; cor: string }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={dados} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0eef9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#f0eef9' }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <Tooltip content={Balao} />
        <Line type="monotone" dataKey="qtd" name="Cadastros" stroke={cor} strokeWidth={3} dot={{ r: 3.5, fill: cor, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function GraficoSegmentos({ dados, cores }: { dados: any[]; cores: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={dados} dataKey="qtd" nameKey="segmento" cx="50%" cy="50%" innerRadius={45} outerRadius={82} paddingAngle={2} cornerRadius={4}>
          {dados.map((_, i) => <Cell key={i} fill={cores[i % cores.length]} stroke="white" strokeWidth={2} />)}
        </Pie>
        <Tooltip content={Balao} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function GraficoServicos({ dados, cor }: { dados: any[]; cor: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, dados.length * 32)}>
      <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 30, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0eef9" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#f0eef9' }} tickLine={false} />
        <YAxis type="category" dataKey="nome" width={170} tick={{ fontSize: 11.5, fill: '#374151', fontWeight: 600 }} axisLine={false} tickLine={false} />
        <Tooltip content={Balao} />
        <Bar dataKey="qtd" name="Interesse" fill={cor} radius={[0, 8, 8, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Rosquinha pequena de participação (entrou no grupo x não entrou). */
export function GraficoParticipacao({ entraram, naoEntraram }: { entraram: number; naoEntraram: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={[{ v: entraram }, { v: naoEntraram }]} dataKey="v" innerRadius={32} outerRadius={46}
          startAngle={90} endAngle={-270} cornerRadius={6}
          paddingAngle={naoEntraram > 0 && entraram > 0 ? 3 : 0}>
          <Cell fill="#16a34a" />
          <Cell fill="#f0eef9" />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
