'use client'

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Video, ShieldCheck, AlertTriangle } from 'lucide-react'

type Salao = { id: string; nome: string }

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const cx: React.CSSProperties = {
  background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 20, marginBottom: 16,
}
const rot: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase',
  color: '#9e9b94', marginBottom: 10,
}
const sel: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid #d8d5cf',
  fontSize: 14, background: '#fff', color: '#1a1a1a',
}

export default function SalaoGravacaoPainel({ saloes }: { saloes: Salao[] }) {
  const anoAtual = new Date().getFullYear()
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  // Julho e agosto do ano passado e deste ano: é a comparação que mostra
  // evolução na tela, que é o que faz sentido gravar.
  const [meses, setMeses] = useState<string[]>([
    `${anoAtual - 1}-7`, `${anoAtual - 1}-8`, `${anoAtual}-7`, `${anoAtual}-8`,
  ])
  const [paginas, setPaginas] = useState(true)
  const [rodando, setRodando] = useState(false)
  const [saida, setSaida] = useState<any>(null)

  const anos = [anoAtual - 1, anoAtual]
  const mesmo = origem && destino && origem === destino
  const pronto = origem && destino && !mesmo && meses.length > 0

  const nomeDe = (id: string) => saloes.find(s => s.id === id)?.nome || ''

  function alterna(ano: number, mes: number) {
    const k = `${ano}-${mes}`
    setMeses(v => v.includes(k) ? v.filter(x => x !== k) : [...v, k])
  }

  const periodos = useMemo(
    () => meses.map(k => {
      const [a, m] = k.split('-').map(Number)
      return { ano: a, mes: m }
    }).sort((x, y) => x.ano - y.ano || x.mes - y.mes),
    [meses]
  )

  async function gerar() {
    if (!pronto) return
    const aviso = `Isto vai APAGAR os dados atuais de "${nomeDe(destino)}" e gravar no lugar `
      + `uma cópia alterada de "${nomeDe(origem)}".\n\n`
      + `"${nomeDe(origem)}" não será tocado.\n\nConfirma?`
    if (!confirm(aviso)) return

    setRodando(true)
    setSaida(null)
    try {
      const r = await fetch('/api/admin/salao-gravacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origem_id: origem, destino_id: destino,
          periodos, copiar_paginas: paginas,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Falha na cópia')
      setSaida(j)
      toast.success('Salão de gravação pronto')
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível gerar')
    } finally {
      setRodando(false)
    }
  }

  return (
    <div>
      <div style={cx}>
        <div style={rot}>1. De onde e para onde</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#6b6860' }}>
              Origem (só leitura)
            </div>
            <select value={origem} onChange={e => setOrigem(e.target.value)} style={sel}>
              <option value="">selecione o salão real</option>
              {saloes.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#6b6860' }}>
              Destino (será sobrescrito)
            </div>
            <select value={destino} onChange={e => setDestino(e.target.value)} style={sel}>
              <option value="">selecione o salão de gravação</option>
              {saloes.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
        </div>
        {mesmo && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, padding: '10px 12px',
                        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 9,
                        fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>
            <AlertTriangle size={16} /> Origem e destino são o mesmo salão. Escolha salões diferentes.
          </div>
        )}
      </div>

      <div style={cx}>
        <div style={rot}>2. Quais meses</div>
        {anos.map(ano => (
          <div key={ano} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#6b6860', marginBottom: 7 }}>{ano}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {MESES.map((nome, i) => {
                const m = i + 1
                const on = meses.includes(`${ano}-${m}`)
                return (
                  <button key={m} onClick={() => alterna(ano, m)}
                    style={{
                      padding: '7px 13px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5,
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5,
                      border: `1px solid ${on ? '#5b4fcf' : '#ddd9d3'}`,
                      background: on ? '#5b4fcf' : '#fff', color: on ? '#fff' : '#6b6860',
                    }}>
                    {nome}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={paginas} onChange={e => setPaginas(e.target.checked)} />
          Copiar também as páginas do salão (check lists, POPs, calculadora, calendário)
        </label>
      </div>

      <div style={{ ...cx, background: '#f5f3ff', borderColor: '#ddd6fe' }}>
        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <ShieldCheck size={18} style={{ color: '#5b4fcf', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: '#4c1d95' }}>
            <b>O que sai transformado:</b> nome, telefone e CPF de cliente viram dados fictícios
            antes de gravar — o dado real não chega ao destino. Nome de profissional vira
            pseudônimo. Cada comanda tem o valor alterado entre −12% e +12%, e os relatórios são
            escalados junto para os totais continuarem batendo.
            <br />
            <b>O salão de origem não é alterado:</b> nele a rota só faz leitura.
          </div>
        </div>
      </div>

      <button onClick={gerar} disabled={!pronto || rodando}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 9, padding: '13px 26px',
          borderRadius: 11, border: 'none', fontSize: 14.5, fontWeight: 800,
          cursor: pronto && !rodando ? 'pointer' : 'not-allowed',
          background: pronto && !rodando ? '#5b4fcf' : '#cbc9c4', color: '#fff',
        }}>
        {rodando ? <><Loader2 size={17} className="animate-spin" /> Gerando…</> : <><Video size={17} /> Gerar salão de gravação</>}
      </button>

      {saida && (
        <div style={{ ...cx, marginTop: 18, borderColor: '#bbf7d0', background: '#f0fdf4' }}>
          <div style={{ ...rot, color: '#15803d' }}>Pronto</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.8, color: '#14532d' }}>
            <b>{saida.origem}</b> → <b>{saida.destino}</b><br />
            Meses: {(saida.periodos || []).join(', ')}<br />
            {saida.feito?.comandas ?? 0} comandas · {saida.feito?.profissionais ?? 0} profissionais ·{' '}
            {saida.feito?.clientes ?? 0} clientes · {saida.feito?.relatorios ?? 0} relatórios
            {saida.feito?.paginas ? ` · ${saida.feito.paginas} páginas` : ''}<br />
            Variação média aplicada: {saida.variacao_media}
          </div>
          {Array.isArray(saida.equivalencia_profissionais) && saida.equivalencia_profissionais.length > 0 && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: '#15803d' }}>
                Quem virou quem ({saida.equivalencia_profissionais.length} profissionais)
              </summary>
              <div style={{ marginTop: 9, fontSize: 12.5, color: '#166534', display: 'grid',
                            gridTemplateColumns: '1fr 1fr', gap: '3px 18px' }}>
                {saida.equivalencia_profissionais.map((p: any, i: number) => (
                  <div key={i}>{p.de} → <b>{p.para}</b></div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
