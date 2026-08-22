'use client'

// Conferência de caixas por dia.
// Escolhe o ano → o mês → o dia; em cada dia entram os caixas conferidos, com
// o responsável (profissional CLT), a marcação de conferido e o resultado
// (OK ou inconsistente). Inconsistência abre o campo do que aconteceu e vira
// PENDÊNCIA no topo, que só sai depois de escrever a resolução e finalizar.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Save, Plus, Trash2, AlertTriangle, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

interface Caixa {
  id: string
  responsavel: string
  conferido: boolean
  status: '' | 'ok' | 'inconsistente'
  descricao: string      // o que aconteceu (quando inconsistente)
  resolucao: string      // como foi resolvido
  finalizado: boolean    // só true depois de resolver
}
type Doc = Record<string, Caixa[]>   // chave: "2026-08-15"

const rid = () => Math.random().toString(36).slice(2, 9)
const diasDoMes = (ano: number, mes: number) => new Date(ano, mes, 0).getDate()
const dois = (n: number) => String(n).padStart(2, '0')

export default function ConferenciaCaixas() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mesAberto, setMesAberto] = useState(hoje.getMonth() + 1)
  const [diaAberto, setDiaAberto] = useState('')
  const [doc, setDoc] = useState<Doc>({})
  const [clts, setClts] = useState<{ id: string; nome: string }[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [resolvendo, setResolvendo] = useState('')   // "data|idCaixa"
  useGuardaSalvar(dirty, 'Conferência de caixas')

  useEffect(() => {
    Promise.all([
      fetch('/api/salon/grid?chave=conferencia_caixas', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/profissionais', { credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([d, profs]) => {
      if (d && typeof d === 'object') setDoc(d as Doc)
      const lista = Array.isArray(profs) ? profs : []
      // Responsável pelo caixa: profissionais CLT (recepção/administrativo)
      const clt = lista.filter((p: any) => !p.is_departamento && p.ativo !== false
        && String(p.vinculo || '').toUpperCase().includes('CLT'))
      const base = clt.length ? clt : lista.filter((p: any) => !p.is_departamento && p.ativo !== false)
      setClts(base.map((p: any) => ({ id: p.id, nome: p.apelido || p.nome_completo || '—' })))
    }).finally(() => setCarregando(false))
  }, [])

  const salvar = useCallback(async (docNovo?: Doc) => {
    const alvo = docNovo || doc
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'conferencia_caixas', doc: alvo }),
      })
      if (r.ok) { setDirty(false); toast.success('Salvo!') } else toast.error('Não foi possível salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }, [doc])

  function mudarCaixa(data: string, id: string, campo: keyof Caixa, valor: any) {
    setDoc(d => ({
      ...d,
      [data]: (d[data] || []).map(c => c.id === id ? { ...c, [campo]: valor } : c),
    }))
    setDirty(true)
  }

  function addCaixa(data: string) {
    setDoc(d => ({
      ...d,
      [data]: [...(d[data] || []), { id: rid(), responsavel: '', conferido: false, status: '', descricao: '', resolucao: '', finalizado: false }],
    }))
    setDirty(true)
  }

  function delCaixa(data: string, id: string) {
    setDoc(d => ({ ...d, [data]: (d[data] || []).filter(c => c.id !== id) }))
    setDirty(true)
  }

  // Pendências: inconsistências ainda não finalizadas
  const pendencias = useMemo(() => {
    const out: { data: string; caixa: Caixa }[] = []
    for (const [data, caixas] of Object.entries(doc)) {
      for (const c of caixas || []) if (c.status === 'inconsistente' && !c.finalizado) out.push({ data, caixa: c })
    }
    return out.sort((a, b) => a.data.localeCompare(b.data))
  }, [doc])

  if (carregando) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={20} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  const anos = [ano - 2, ano - 1, ano, ano + 1].filter((v, i, a) => a.indexOf(v) === i)
  const totalDias = diasDoMes(ano, mesAberto)
  const dataBR = (d: string) => d.split('-').reverse().join('/')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Conferência de caixas</h2>
          <p style={{ fontSize: 12, color: '#6b6860', margin: '2px 0 0' }}>Escolha o mês e o dia para lançar a conferência.</p>
        </div>
        <div style={{ flex: 1 }} />
        <select value={ano} onChange={e => { setAno(Number(e.target.value)); setDiaAberto('') }}
          style={{ padding: '8px 12px', borderRadius: 9, border: '1.5px solid #e0ddd8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={() => salvar()} disabled={salvando || !dirty}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: dirty ? '#16a34a' : '#d7d5cf', color: '#fff', fontSize: 13, fontWeight: 700, cursor: dirty ? 'pointer' : 'default' }}>
          <Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {/* CAIXAS PENDENTES — some só depois de resolver e finalizar */}
      {pendencias.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={16} color="#dc2626" />
            <span style={{ fontWeight: 900, fontSize: 13.5, color: '#b91c1c' }}>
              {pendencias.length} caixa{pendencias.length > 1 ? 's' : ''} pendente{pendencias.length > 1 ? 's' : ''}
            </span>
          </div>
          {pendencias.map(({ data, caixa }) => {
            const chave = `${data}|${caixa.id}`
            const aberta = resolvendo === chave
            return (
              <div key={chave} style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 10, padding: '9px 12px', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 12.5 }}>{dataBR(data)}</span>
                  <span style={{ fontSize: 12, color: '#6b6860' }}>{caixa.responsavel || 'sem responsável'}</span>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => setResolvendo(aberta ? '' : chave)}
                    style={{ border: 'none', background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 800, padding: '5px 12px', borderRadius: 8, cursor: 'pointer' }}>
                    {aberta ? 'Fechar' : 'Resolver'}
                  </button>
                </div>
                {caixa.descricao && <p style={{ fontSize: 12, color: '#4b5563', margin: '5px 0 0' }}><strong>O que aconteceu:</strong> {caixa.descricao}</p>}
                {aberta && (
                  <div style={{ marginTop: 8 }}>
                    <textarea value={caixa.resolucao} onChange={e => mudarCaixa(data, caixa.id, 'resolucao', e.target.value)}
                      rows={2} placeholder="Como foi resolvido?"
                      style={{ width: '100%', border: '1px solid #e0ddd8', borderRadius: 8, padding: '7px 10px', fontSize: 12.5, resize: 'vertical' }} />
                    <button
                      onClick={() => {
                        if (!caixa.resolucao.trim()) { toast.error('Escreva como foi resolvido'); return }
                        const novo: Doc = { ...doc, [data]: (doc[data] || []).map(c => c.id === caixa.id ? { ...c, finalizado: true } : c) }
                        setDoc(novo); setResolvendo(''); salvar(novo)
                      }}
                      style={{ marginTop: 6, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 800, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}>
                      ✓ Finalizar demanda
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MESES */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {MESES.map((nome, i) => {
          const ativo = mesAberto === i + 1
          return (
            <button key={nome} onClick={() => { setMesAberto(i + 1); setDiaAberto('') }}
              style={{ padding: '7px 13px', borderRadius: 9, border: ativo ? 'none' : '1.5px solid #e0ddd8', background: ativo ? '#1a1a1a' : '#fff', color: ativo ? '#fff' : '#6b6860', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
              {nome}
            </button>
          )
        })}
      </div>

      {/* DIAS do mês escolhido */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
        {Array.from({ length: totalDias }, (_, i) => i + 1).map(dia => {
          const data = `${ano}-${dois(mesAberto)}-${dois(dia)}`
          const caixas = doc[data] || []
          const temInconsistencia = caixas.some(c => c.status === 'inconsistente' && !c.finalizado)
          const ativo = diaAberto === data
          return (
            <button key={dia} onClick={() => setDiaAberto(ativo ? '' : data)}
              style={{ width: 38, height: 34, borderRadius: 8, border: ativo ? 'none' : `1.5px solid ${temInconsistencia ? '#fca5a5' : caixas.length ? '#86efac' : '#e0ddd8'}`, background: ativo ? '#5b4fcf' : temInconsistencia ? '#fef2f2' : caixas.length ? '#f0fdf4' : '#fff', color: ativo ? '#fff' : '#4b5563', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
              {dia}
            </button>
          )
        })}
      </div>

      {/* CAIXAS DO DIA */}
      {diaAberto && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>{dataBR(diaAberto)}</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => addCaixa(diaAberto)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 12, fontWeight: 800, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>
              <Plus size={13} /> Adicionar caixa
            </button>
          </div>

          {(doc[diaAberto] || []).length === 0 && (
            <p style={{ fontSize: 12.5, color: '#9ca3af', textAlign: 'center', padding: 14 }}>Nenhum caixa lançado neste dia.</p>
          )}

          {(doc[diaAberto] || []).map((c, i) => (
            <div key={c.id} style={{ border: `1px solid ${c.status === 'inconsistente' && !c.finalizado ? '#fecaca' : '#e8e6e0'}`, borderRadius: 10, padding: '11px 13px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>Caixa {i + 1}</span>
                <select value={c.responsavel} onChange={e => mudarCaixa(diaAberto, c.id, 'responsavel', e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e0ddd8', fontSize: 12.5, minWidth: 180 }}>
                  <option value="">Responsável…</option>
                  {clts.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                </select>
                <div style={{ flex: 1 }} />
                {c.finalizado && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 9px', borderRadius: 99 }}><Check size={11} /> RESOLVIDO</span>}
                <button onClick={() => delCaixa(diaAberto, c.id)} title="Excluir caixa"
                  style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 3 }}><Trash2 size={13} /></button>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                  <input type="checkbox" checked={c.conferido} onChange={e => mudarCaixa(diaAberto, c.id, 'conferido', e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: '#5b4fcf', cursor: 'pointer' }} />
                  Conferido
                </label>
                {([['ok', 'OK'], ['inconsistente', 'Inconsistente']] as const).map(([v, rot]) => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: c.status === v ? 800 : 600, color: c.status === v ? (v === 'ok' ? '#15803d' : '#b91c1c') : '#4b5563', cursor: 'pointer' }}>
                    <input type="radio" name={`st-${c.id}`} checked={c.status === v} onChange={() => mudarCaixa(diaAberto, c.id, 'status', v)}
                      style={{ width: 14, height: 14, accentColor: v === 'ok' ? '#16a34a' : '#dc2626', cursor: 'pointer' }} />
                    {rot}
                  </label>
                ))}
              </div>

              {/* Inconsistente → abre o campo do que aconteceu */}
              {c.status === 'inconsistente' && (
                <textarea value={c.descricao} onChange={e => mudarCaixa(diaAberto, c.id, 'descricao', e.target.value)}
                  rows={2} placeholder="O que aconteceu?"
                  style={{ width: '100%', marginTop: 8, border: '1px solid #fecaca', borderRadius: 8, padding: '7px 10px', fontSize: 12.5, resize: 'vertical', background: '#fffbfb' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
