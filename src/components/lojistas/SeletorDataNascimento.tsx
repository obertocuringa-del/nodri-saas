'use client'

import { useState, useEffect } from 'react'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

interface Props {
  value: string // 'YYYY-MM-DD' ou ''
  onChange: (v: string) => void
}

// Três seletores simples (dia/mês/ano) em vez do <input type="date"> nativo:
// no celular cada <select> abre a roda de rolagem do próprio sistema (iOS/Android),
// bem mais fácil para quem tem dificuldade de navegar até um ano distante no calendário.
export default function SeletorDataNascimento({ value, onChange }: Props) {
  const partes = value ? value.split('-') : ['', '', '']
  const [ano, setAno] = useState(partes[0] || '')
  const [mes, setMes] = useState(partes[1] || '')
  const [dia, setDia] = useState(partes[2] || '')

  useEffect(() => {
    const p = value ? value.split('-') : ['', '', '']
    setAno(p[0] || ''); setMes(p[1] || ''); setDia(p[2] || '')
  }, [value])

  const anoAtual = new Date().getFullYear()
  const anos = Array.from({ length: 100 }, (_, i) => String(anoAtual - i))
  const diasNoMes = (m: string, a: string) => new Date(Number(a) || anoAtual, Number(m) || 12, 0).getDate()
  const dias = Array.from({ length: diasNoMes(mes, ano) }, (_, i) => String(i + 1).padStart(2, '0'))

  function emitir(d: string, m: string, a: string) {
    onChange(d && m && a ? `${a}-${m}-${d}` : '')
  }

  function mudarDia(v: string) { setDia(v); emitir(v, mes, ano) }
  function mudarMes(v: string) {
    const max = diasNoMes(v, ano)
    const diaClipado = dia && Number(dia) > max ? String(max).padStart(2, '0') : dia
    setMes(v); setDia(diaClipado); emitir(diaClipado, v, ano)
  }
  function mudarAno(v: string) {
    const max = diasNoMes(mes, v)
    const diaClipado = dia && Number(dia) > max ? String(max).padStart(2, '0') : dia
    setAno(v); setDia(diaClipado); emitir(diaClipado, mes, v)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.3fr 1fr', gap: 8 }}>
      <select value={dia} onChange={e => mudarDia(e.target.value)} style={selectStyle}>
        <option value="">Dia</option>
        {dias.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select value={mes} onChange={e => mudarMes(e.target.value)} style={selectStyle}>
        <option value="">Mês</option>
        {MESES.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
      </select>
      <select value={ano} onChange={e => mudarAno(e.target.value)} style={selectStyle}>
        <option value="">Ano</option>
        {anos.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  width: '100%', border: '2px solid #f3f4f6', borderRadius: 12, padding: '11px 10px',
  fontSize: 14, color: '#1a1a1a', background: '#f9fafb', fontFamily: 'inherit', outline: 'none',
}
