'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Plus, Trash2, PartyPopper } from 'lucide-react'
import { SeletorNomes } from './SeletorNomes'

interface FeriadoItem { id: string; nome: string; data: string; horario: string; fechado: boolean; profissionais: string; obs: string }
interface Profissional { id: string; nome_completo: string; apelido: string; ativo?: boolean }

const COR = '#5b4fcf'
const rid = () => Math.random().toString(36).slice(2, 9)
const nomeDe = (p: Profissional) => p.apelido || p.nome_completo || '—'

// Lista padrão usada enquanto nada foi salvo ainda (mesmos feriados que já
// apareciam na versão antiga desta página) — só entra em uso local, some
// assim que o usuário salvar pela 1ª vez com os dados reais.
const FERIADOS_PADRAO: FeriadoItem[] = [
  { id: rid(), nome: 'Carnaval', data: '02, 03 e 04/03/2026', horario: '', fechado: true, profissionais: '', obs: '' },
  { id: rid(), nome: 'Tira Dentes', data: '21/04/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Dia do Trabalhador', data: '01/05/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Sete de Setembro', data: '07/09/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Nossa Senhora', data: '12/10/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Finados', data: '02/11/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Proclamação da República', data: '15/11/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Consciência Negra', data: '20/11/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Natal', data: '24/12/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Ano Novo', data: '31/12/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
]

// Lê o formato antigo (GridEditavel — tabelas/linhas), usado antes desta página
// ser modernizada, só na 1ª vez que não encontrar o formato novo salvo.
function migrarFormatoAntigo(doc: any): FeriadoItem[] | null {
  const linhas = doc?.tabelas?.[0]?.linhas
  if (!Array.isArray(linhas)) return null
  return linhas.filter((l: any[]) => (l[0]?.t || '').trim()).map((l: any[]) => ({
    id: rid(),
    nome: l[0]?.t || '',
    data: l[1]?.t || '',
    horario: /fechado/i.test(l[2]?.t || '') ? '' : (l[2]?.t || ''),
    fechado: /fechado/i.test(l[2]?.t || '') || /fechado/i.test(l[4]?.t || ''),
    profissionais: l[3]?.t || '',
    obs: l[4]?.t || '',
  }))
}

export default function EscalaFeriadosLista({ chave = 'feriados' }: { chave?: string }) {
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [feriados, setFeriados] = useState<FeriadoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    fetch('/api/profissionais').then(r => r.ok ? r.json() : []).then((arr: any[]) => setProfissionais(Array.isArray(arr) ? arr : [])).catch(() => {})
  }, [])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chave)}`).then(r => r.ok ? r.json() : null)
      const lista: FeriadoItem[] = Array.isArray(d?.feriados) ? d.feriados : (migrarFormatoAntigo(d) || FERIADOS_PADRAO)
      setFeriados(lista)
      setDirty(false)
    } catch { /* mantém o que já tinha */ }
    setLoading(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  function editar(id: string, patch: Partial<FeriadoItem>) {
    setFeriados(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f)); setDirty(true)
  }
  function adicionar() {
    setFeriados(prev => [...prev, { id: rid(), nome: '', data: '', horario: '', fechado: false, profissionais: '', obs: '' }]); setDirty(true)
  }
  function remover(id: string) {
    setFeriados(prev => prev.filter(f => f.id !== id)); setDirty(true)
  }

  const nomesProfissionais = profissionais.filter(p => p.ativo !== false).map(nomeDe)

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, doc: { feriados } }) })
      if (res.ok) { toast.success('Escala de feriados salva!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  return (
    <div>
      <style>{`
        .fer-table { width:100%; border-collapse:collapse; min-width:900px; }
        .fer-table th { text-align:left; font-size:11px; font-weight:800; color:#6b6860; text-transform:uppercase; letter-spacing:.3px; padding:10px 12px; background:#faf9f7; border-bottom:1px solid #e8e6e0; }
        .fer-table td { padding:8px 10px; border-bottom:1px solid #f0eee8; vertical-align:middle; }
        .fer-table tbody tr:nth-child(even) { background:#fbfbfa; }
        .fer-input { width:100%; border:1px solid transparent; background:transparent; outline:none; font-family:inherit; padding:6px 7px; border-radius:6px; font-size:13px; }
        .fer-input:focus, .fer-input:hover { border-color:#d0cdc7; background:#fff; }
      `}</style>

      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '10px 12px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><PartyPopper size={16} color={COR} /> Escala de Feriados</h2>
        <div style={{ flex: 1 }} />
        {dirty && !salvando && <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Alterações não salvas</span>}
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div> : (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16 }}>
          <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '0 0 12px' }}>Os feriados marcados aqui aparecem automaticamente no card "Feriados" da Escala de Trabalho, no mês correspondente. Marque "Fechado" quando o salão não abrir.</p>
          {feriados.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Nenhum feriado cadastrado ainda.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="fer-table">
                <thead><tr><th style={{ width: 170 }}>Feriado</th><th style={{ width: 150 }}>Data</th><th style={{ width: 90 }}>Fechado?</th><th style={{ width: 140 }}>Horário</th><th>Profissionais escalados</th><th style={{ width: 200 }}>Obs</th><th style={{ width: 36 }} /></tr></thead>
                <tbody>
                  {feriados.map(f => (
                    <tr key={f.id}>
                      <td><input value={f.nome} onChange={e => editar(f.id, { nome: e.target.value })} className="fer-input" style={{ fontWeight: 700 }} placeholder="Nome do feriado" /></td>
                      <td><input value={f.data} onChange={e => editar(f.id, { data: e.target.value })} className="fer-input" placeholder="dd/mm/aaaa" /></td>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" checked={f.fechado} onChange={e => editar(f.id, { fechado: e.target.checked })} style={{ width: 18, height: 18, cursor: 'pointer' }} /></td>
                      <td>{f.fechado ? <span style={{ fontSize: 11, fontWeight: 800, color: '#0891b2' }}>FECHADO</span> : <input value={f.horario} onChange={e => editar(f.id, { horario: e.target.value })} className="fer-input" placeholder="10:00 às 18:00" />}</td>
                      <td>{f.fechado ? <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span> : <SeletorNomes value={f.profissionais} onChange={v => editar(f.id, { profissionais: v })} opcoes={nomesProfissionais} />}</td>
                      <td><input value={f.obs} onChange={e => editar(f.id, { obs: e.target.value })} className="fer-input" placeholder="—" /></td>
                      <td style={{ textAlign: 'center' }}><button onClick={() => remover(f.id)} title="Remover" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626', padding: 4 }}><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={adicionar} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '7px 12px', borderRadius: 8, border: `1.5px dashed ${COR}`, background: '#f8f7ff', color: COR, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}><Plus size={14} /> Adicionar feriado</button>
        </div>
      )}
    </div>
  )
}
