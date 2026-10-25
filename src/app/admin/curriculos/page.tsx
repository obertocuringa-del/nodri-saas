'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, Trash2, HardDrive } from 'lucide-react'

// ── Peso dos arquivos de candidatos, em todos os salões ─────────────────────
// Tela do master. Mostra quanto os currículos e anexos de candidatos ocupam no
// armazenamento, por salão, e deixa esvaziar -- tudo ou só o mais antigo.

const mb = (b: number) => b >= 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : `${(b / 1048576).toFixed(1)} MB`

interface Linha { id: string; nome: string; modelo: boolean; arquivos: number; bytes: number; mais_antigo: string | null; limpeza: { ligado: boolean; dias: number } }

export default function AdminCurriculosArquivos() {
  const [d, setD] = useState<{ saloes: Linha[]; total_bytes: number; total_arquivos: number } | null>(null)
  const [erro, setErro] = useState('')
  const [dias, setDias] = useState(60)
  const [apagando, setApagando] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')

  const carregar = () => {
    setErro('')
    fetch('/api/admin/curriculos-arquivos', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setD).catch(() => setErro('Não foi possível ler o armazenamento.'))
  }
  useEffect(carregar, [])

  const apagar = async (salao: string, nome: string, antes?: number) => {
    const o = antes ? `os arquivos de candidatos com mais de ${antes} dias` : 'TODOS os arquivos de candidatos'
    if (!confirm(`Apagar ${o} de ${nome}? As conversas ficam, mas os arquivos somem e não voltam.`)) return
    setApagando(salao + (antes || 'tudo')); setAviso('')
    try {
      const r = await fetch('/api/admin/curriculos-arquivos', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salao, ...(antes ? { antes_de_dias: antes } : {}) }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setAviso(j?.error || 'Não foi possível apagar.'); return }
      setAviso(`${j.removidos} arquivo(s) apagado(s), ${mb(j.bytes)} liberados.`)
      carregar()
    } finally { setApagando(null) }
  }

  return (
    <div className="min-h-screen bg-nodri-dark text-nodri-t1">
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3">
        <a href="/admin" className="flex items-center gap-2 text-nodri-t2 hover:text-nodri-cyan text-sm font-medium"><ArrowLeft size={16} /> Admin</a>
        <div className="w-px h-5 bg-nodri-border" />
        <h1 className="font-syne font-bold text-[15px] uppercase tracking-wide">Currículos · armazenamento</h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {erro && <p className="text-[13px] font-bold" style={{ color: '#b91c1c' }}>{erro}</p>}
        {!d && !erro && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan" /></div>}
        {d && (
          <>
            <div className="nodri-card p-4 flex items-center gap-4 flex-wrap">
              <HardDrive size={28} className="text-nodri-cyan" />
              <div>
                <p className="text-[24px] font-bold leading-none">{mb(d.total_bytes)}</p>
                <p className="text-[12px] text-nodri-t3">{d.total_arquivos} arquivo(s) de candidatos em {d.saloes.length} salão(ões)</p>
              </div>
              <div className="flex-1" />
              <label className="text-[12px] text-nodri-t3 flex items-center gap-2">
                Apagar mais antigos que
                <input type="number" min={7} max={365} value={dias} onChange={e => setDias(Math.max(7, Number(e.target.value) || 60))}
                  className="w-16 px-2 py-1 rounded-lg text-[13px] bg-nodri-surface border border-nodri-border text-nodri-t1" /> dias
              </label>
              <button onClick={() => apagar('todos', 'TODOS os salões', dias)} disabled={!!apagando}
                className="px-3 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50" style={{ background: '#f59e0b', color: '#fff' }}>Todos os salões: só os antigos</button>
              <button onClick={() => apagar('todos', 'TODOS os salões')} disabled={!!apagando}
                className="px-3 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50" style={{ background: '#dc2626', color: '#fff' }}>Todos os salões: tudo</button>
            </div>
            {!!aviso && <p className="text-[13px] font-bold px-3 py-2 rounded-lg" style={{ background: '#f0fdf4', color: '#166534' }}>{aviso}</p>}

            <div className="nodri-card overflow-hidden">
              <table className="w-full text-[13px]">
                <thead><tr className="text-left text-nodri-t3 text-[11px] uppercase tracking-wide">
                  <th className="px-4 py-2">Salão</th><th className="px-2 py-2">Arquivos</th><th className="px-2 py-2">Peso</th>
                  <th className="px-2 py-2">Mais antigo</th><th className="px-2 py-2">Exclusão automática</th><th />
                </tr></thead>
                <tbody>
                  {d.saloes.map(s => (
                    <tr key={s.id} className="border-t border-nodri-border">
                      <td className="px-4 py-2 font-bold">{s.nome}{s.modelo ? ' (modelo)' : ''}</td>
                      <td className="px-2 py-2">{s.arquivos}</td>
                      <td className="px-2 py-2">{mb(s.bytes)}</td>
                      <td className="px-2 py-2">{s.mais_antigo ? new Date(s.mais_antigo).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-2 py-2">{s.limpeza.ligado ? `ligada, ${s.limpeza.dias} dias` : 'desligada'}</td>
                      <td className="px-2 py-2 text-right">
                        <button onClick={() => apagar(s.id, s.nome)} disabled={!!apagando || s.arquivos === 0} title="Apagar tudo deste salão"
                          className="p-1.5 rounded-lg text-nodri-t3 hover:text-red-400 disabled:opacity-30"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
