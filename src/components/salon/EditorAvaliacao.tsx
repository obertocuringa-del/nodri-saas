'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Plus, Trash2, RotateCcw, GripVertical } from 'lucide-react'
import { MODELO_AVAL_DEFAULT, CLASSIF_AVAL, type ModeloAval } from './avaliacaoModelo'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

const CHAVE = 'avaliacao_modelo'
const rid = () => 'a' + Math.random().toString(36).slice(2, 8)

export default function EditorAvaliacao() {
  const [doc, setDoc] = useState<ModeloAval>({ categorias: [] })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Perfil de Avaliação') // avisa "Deseja salvar?" antes de sair sem salvar

  const carregar = useCallback(async () => {
    try {
      const d = await fetch(`/api/salon/grid?chave=${CHAVE}`).then(r => r.ok ? r.json() : null)
      setDoc(d && Array.isArray(d.categorias) ? d : MODELO_AVAL_DEFAULT)
    } catch { setDoc(MODELO_AVAL_DEFAULT) }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  function mut(fn: (d: ModeloAval) => void) { setDoc(prev => { const n: ModeloAval = JSON.parse(JSON.stringify(prev)); fn(n); return n }); setDirty(true) }
  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: CHAVE, doc }) })
      if (res.ok) { toast.success('Modelo salvo! Já vale na aba Avaliar de todos os profissionais.'); setDirty(false) } else { const e = await res.json().catch(() => ({})); toast.error(e?.error || 'Erro ao salvar') }
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function setFaixa(i: number, campo: 'min' | 'txt' | 'cor' | 'emoji', val: string | number) { mut(d => { const list = d.classificacao || (d.classificacao = JSON.parse(JSON.stringify(CLASSIF_AVAL))); (list[i] as any)[campo] = val }) }
  const totalCrit = doc.categorias.reduce((a, c) => a + c.criterios.length, 0)

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={26} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>Perfil e Avaliação de Desempenho</h2>
          <p style={{ fontSize: 13, color: '#6b6860', margin: 0 }}>Edite as categorias e os critérios. <strong>O que você salvar aqui vira a pontuação da aba “Avaliar” de todos os profissionais.</strong> ({totalCrit} critérios)</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { if (confirm('Restaurar o modelo padrão? Substitui o conteúdo atual — salve depois.')) { setDoc(JSON.parse(JSON.stringify(MODELO_AVAL_DEFAULT))); setDirty(true) } }} style={btnSec}><RotateCcw size={14} /> Restaurar modelo</button>
          <button onClick={salvar} disabled={salvando} style={{ ...btnPrim, background: dirty ? '#16a34a' : '#a3b3a3' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
        </div>
      </div>

      {doc.categorias.map((c, ci) => (
        <div key={c.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: c.cor, padding: '10px 14px' }}>
            <input type="color" value={c.cor} onChange={e => mut(d => { d.categorias[ci].cor = e.target.value })} title="Cor da categoria" style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }} />
            <input value={c.titulo} onChange={e => mut(d => { d.categorias[ci].titulo = e.target.value })} style={{ flex: 1, background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 6, padding: '7px 10px', color: '#fff', fontWeight: 800, fontSize: 14, outline: 'none' }} />
            <button onClick={() => { if (confirm('Excluir esta categoria e seus critérios?')) mut(d => { d.categorias.splice(ci, 1) }) }} title="Excluir categoria" style={{ border: 'none', background: 'rgba(255,255,255,.2)', color: '#fff', borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}><Trash2 size={14} /></button>
          </div>
          <div style={{ padding: 12 }}>
            {c.criterios.map((cr, cj) => (
              <div key={cr.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <GripVertical size={14} color="#cbd5e1" />
                <input value={cr.texto} onChange={e => mut(d => { d.categorias[ci].criterios[cj].texto = e.target.value })} placeholder="Critério avaliado…" style={{ flex: 1, border: '1px solid #e8e6e0', borderRadius: 6, padding: '8px 10px', fontSize: 13, outline: 'none' }} />
                <button onClick={() => mut(d => { d.categorias[ci].criterios.splice(cj, 1) })} title="Excluir critério" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 4 }}><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={() => mut(d => { d.categorias[ci].criterios.push({ id: rid(), texto: '' }) })} style={{ ...btnDashed, marginTop: 4 }}><Plus size={13} /> Adicionar critério</button>
          </div>
        </div>
      ))}

      <button onClick={() => mut(d => { d.categorias.push({ id: rid(), titulo: 'NOVA CATEGORIA', cor: '#5b4fcf', criterios: [{ id: rid(), texto: '' }] }) })} style={btnDashed}><Plus size={15} /> Adicionar categoria</button>

      <div style={{ marginTop: 18, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0891b2', margin: '0 0 4px' }}>Classificação final (editável)</h3>
        <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 12px' }}>Cada critério vale de 1 a 5. Defina as faixas de % e o rótulo de cada nível.</p>
        {(doc.classificacao || CLASSIF_AVAL).map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#6b6860' }}>a partir de</span>
            <input type="number" min={0} max={100} value={c.min} onChange={e => setFaixa(i, 'min', Number(e.target.value))} style={{ width: 64, padding: '7px 8px', borderRadius: 6, border: '1px solid #d0cdc7', fontSize: 13, textAlign: 'center' }} />
            <span style={{ fontSize: 12, color: '#6b6860' }}>%</span>
            <input value={c.emoji} onChange={e => setFaixa(i, 'emoji', e.target.value)} style={{ width: 44, padding: '7px 8px', borderRadius: 6, border: '1px solid #d0cdc7', fontSize: 15, textAlign: 'center' }} />
            <input value={c.txt} onChange={e => setFaixa(i, 'txt', e.target.value)} placeholder="Rótulo" style={{ flex: 1, minWidth: 160, padding: '7px 10px', borderRadius: 6, border: '1px solid #d0cdc7', fontSize: 13 }} />
            <input type="color" value={c.cor} onChange={e => setFaixa(i, 'cor', e.target.value)} title="Cor" style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }} />
            <button onClick={() => mut(d => { const list = d.classificacao || (d.classificacao = JSON.parse(JSON.stringify(CLASSIF_AVAL))); list.splice(i, 1) })} title="Remover faixa" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 4 }}><Trash2 size={14} /></button>
          </div>
        ))}
        <button onClick={() => mut(d => { const list = d.classificacao || (d.classificacao = JSON.parse(JSON.stringify(CLASSIF_AVAL))); list.push({ min: 0, txt: 'Novo nível', cor: '#5b4fcf', emoji: '•' }) })} style={{ ...btnDashed, marginTop: 4 }}><Plus size={13} /> Adicionar faixa</button>
      </div>
    </div>
  )
}

const btnPrim: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 16px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
const btnSec: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 10, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnDashed: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px dashed #5b4fcf', background: '#f6f4ff', color: '#5b4fcf', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
