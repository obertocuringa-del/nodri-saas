'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Loader2, Trash2, FileText, Image as Imagem, Mic, Video, HardDrive, ExternalLink } from 'lucide-react'

// ── Arquivos que os candidatos mandaram ─────────────────────────────────────
//
// Separados por vaga, com o peso de cada um e o total. Excluir apaga o arquivo
// do armazenamento (a conversa fica, com "arquivo removido"). Aqui também fica
// o botão da exclusão automática: LIGADO ou DESLIGADO, e depois de quantos dias.
// O que o dono não ligar, o sistema não apaga.

const COR = '#5b4fcf'
const tamanho = (b: number) => b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : b >= 1024 ? `${Math.round(b / 1024)} KB` : b > 0 ? `${b} B` : '—'

interface Item { mensagem: string; conversa: string; candidato: string; vaga: string; tipo: string; nome: string; url: string; bytes: number; criado_em: string }
interface Limpeza { ligado: boolean; dias: number }

const Icone = ({ tipo }: { tipo: string }) =>
  tipo === 'imagem' ? <Imagem size={16} /> : tipo === 'audio' ? <Mic size={16} /> : tipo === 'video' ? <Video size={16} /> : <FileText size={16} />

export default function ArquivosCurriculos({ onFechar }: { onFechar: () => void }) {
  const [itens, setItens] = useState<Item[] | null>(null)
  const [bytes, setBytes] = useState(0)
  const [limpeza, setLimpeza] = useState<Limpeza>({ ligado: false, dias: 60 })
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [dias, setDias] = useState(60)
  const [trabalhando, setTrabalhando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')

  const carregar = async () => {
    setErro('')
    try {
      const [a, c] = await Promise.all([
        fetch('/api/crm/curriculos?arquivos=1', { credentials: 'include' }),
        fetch('/api/crm/curriculos', { credentials: 'include' }),
      ])
      if (!a.ok) throw new Error()
      const da = await a.json(); setItens(da.itens || []); setBytes(da.bytes || 0)
      if (c.ok) { const dc = await c.json(); if (dc?.config?.limpeza) { setLimpeza(dc.config.limpeza); setDias(dc.config.limpeza.dias) } }
    } catch { setErro('Não foi possível ler os arquivos.') }
  }
  useEffect(() => { carregar() }, [])

  const porVaga = useMemo(() => {
    const m = new Map<string, Item[]>()
    for (const i of itens || []) { const l = m.get(i.vaga) || []; l.push(i); m.set(i.vaga, l) }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [itens])

  const post = async (corpo: any) => {
    const r = await fetch('/api/crm/curriculos', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d?.error || 'Não foi possível concluir.')
    return d
  }

  const excluir = async (mensagens: string[], descricao: string) => {
    if (!mensagens.length) return
    if (!confirm(`Excluir ${descricao}? O arquivo é apagado de vez; a conversa fica, com a mensagem "arquivo removido".`)) return
    setTrabalhando(true); setAviso(''); setErro('')
    try {
      const d = await post({ acao: 'excluir_arquivos', mensagens })
      setAviso(`${d.removidos} arquivo(s) excluído(s), ${tamanho(d.bytes)} liberados.`)
      setMarcados(new Set()); await carregar()
    } catch (e: any) { setErro(e.message) } finally { setTrabalhando(false) }
  }

  const excluirAntigos = async () => {
    if (!confirm(`Excluir os arquivos de candidatos com mais de ${dias} dias?`)) return
    setTrabalhando(true); setAviso(''); setErro('')
    try {
      const d = await post({ acao: 'excluir_arquivos', antes_de_dias: dias })
      setAviso(`${d.removidos} arquivo(s) excluído(s), ${tamanho(d.bytes)} liberados.`)
      await carregar()
    } catch (e: any) { setErro(e.message) } finally { setTrabalhando(false) }
  }

  const salvarLimpeza = async (novo: Limpeza) => {
    setLimpeza(novo); setErro('')
    try { await post({ acao: 'config', limpeza: novo }) } catch (e: any) { setErro(e.message) }
  }

  const alternar = (id: string) => setMarcados(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(20,16,14,.55)' }}>
      <div className="w-full max-w-3xl rounded-2xl flex flex-col" style={{ background: '#fff', color: '#2b2320', maxHeight: '90vh' }}>
        <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: '#e9ddd6' }}>
          <HardDrive size={20} style={{ color: COR }} />
          <div className="flex-1">
            <p className="font-bold text-[16px]">Arquivos dos candidatos</p>
            <p className="text-[12px]" style={{ color: '#6e625c' }}>
              {itens ? `${itens.length} arquivo(s) · ${tamanho(bytes)} no armazenamento` : 'Calculando o peso...'}
            </p>
          </div>
          <button onClick={onFechar} aria-label="Fechar" className="p-2 rounded-lg"><X size={18} /></button>
        </div>

        {/* Exclusão automática: o botão de ligar e desligar */}
        <div className="px-5 py-3 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: '#e9ddd6', background: '#faf9fe' }}>
          <button role="switch" aria-checked={limpeza.ligado} onClick={() => salvarLimpeza({ ...limpeza, ligado: !limpeza.ligado })}
            className="relative w-11 h-6 rounded-full transition" style={{ background: limpeza.ligado ? COR : '#cfcbd9' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: limpeza.ligado ? 22 : 2 }} />
          </button>
          <div className="flex-1 min-w-[220px]">
            <p className="text-[13px] font-bold">Exclusão automática {limpeza.ligado ? 'ligada' : 'desligada'}</p>
            <p className="text-[11.5px]" style={{ color: '#6e625c' }}>
              {limpeza.ligado ? `Todo dia, o sistema apaga os arquivos de candidatos com mais de ${limpeza.dias} dias.` : 'Nada é apagado sozinho. Você exclui na mão aqui embaixo.'}
            </p>
          </div>
          <label className="text-[12px] flex items-center gap-1.5" style={{ color: '#6e625c' }}>
            depois de
            <input type="number" min={7} max={365} value={limpeza.dias}
              onChange={e => setLimpeza(l => ({ ...l, dias: Math.max(7, Math.min(365, Number(e.target.value) || 60)) }))}
              onBlur={() => salvarLimpeza(limpeza)}
              className="w-16 px-2 py-1 rounded-lg border text-[13px]" style={{ borderColor: '#e6e3f2' }} /> dias
          </label>
        </div>

        {/* Exclusão manual em lote */}
        <div className="px-5 py-2.5 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: '#e9ddd6' }}>
          <label className="text-[12px] flex items-center gap-1.5" style={{ color: '#6e625c' }}>
            Excluir mais antigos que
            <input type="number" min={7} max={365} value={dias} onChange={e => setDias(Math.max(7, Number(e.target.value) || 60))}
              className="w-16 px-2 py-1 rounded-lg border text-[13px]" style={{ borderColor: '#e6e3f2' }} /> dias
          </label>
          <button onClick={excluirAntigos} disabled={trabalhando || !itens?.length}
            className="px-3 py-1.5 rounded-lg text-[12px] font-bold disabled:opacity-50" style={{ background: '#f59e0b', color: '#fff' }}>Excluir antigos</button>
          <div className="flex-1" />
          <button onClick={() => excluir([...marcados], `${marcados.size} arquivo(s) marcado(s)`)} disabled={trabalhando || marcados.size === 0}
            className="px-3 py-1.5 rounded-lg text-[12px] font-bold disabled:opacity-50" style={{ background: '#dc2626', color: '#fff' }}>Excluir marcados ({marcados.size})</button>
        </div>

        {!!aviso && <p className="mx-5 mt-3 text-[12.5px] font-bold px-3 py-2 rounded-lg" style={{ background: '#f0fdf4', color: '#166534' }}>{aviso}</p>}
        {!!erro && <p className="mx-5 mt-3 text-[12.5px] font-bold px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#b91c1c' }}>{erro}</p>}

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {!itens && !erro && <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin" style={{ color: COR }} /></div>}
          {itens && itens.length === 0 && <p className="text-center text-[13px] py-10" style={{ color: '#9a8c85' }}>Nenhum arquivo de candidato guardado.</p>}
          {porVaga.map(([vaga, lista]) => (
            <div key={vaga} className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[12px] font-bold uppercase tracking-wide flex-1" style={{ color: COR }}>
                  {vaga} · {lista.length} arquivo(s) · {tamanho(lista.reduce((t, i) => t + i.bytes, 0))}
                </p>
                <button onClick={() => excluir(lista.map(i => i.mensagem), `todos os ${lista.length} arquivo(s) de ${vaga}`)} disabled={trabalhando}
                  className="text-[11px] font-bold underline disabled:opacity-50" style={{ color: '#b91c1c' }}>Excluir todos desta vaga</button>
              </div>
              <div className="rounded-xl border divide-y" style={{ borderColor: '#e9ddd6' }}>
                {lista.map(i => (
                  <div key={i.mensagem} className="px-3 py-2 flex items-center gap-3">
                    <input type="checkbox" checked={marcados.has(i.mensagem)} onChange={() => alternar(i.mensagem)} className="w-4 h-4 shrink-0" style={{ accentColor: COR }} aria-label={`Marcar ${i.nome}`} />
                    <span style={{ color: '#6e625c' }}><Icone tipo={i.tipo} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold truncate">{i.nome}</p>
                      <p className="text-[11.5px] truncate" style={{ color: '#9a8c85' }}>{i.candidato} · {new Date(i.criado_em).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className="text-[12px] shrink-0" style={{ color: '#6e625c' }}>{tamanho(i.bytes)}</span>
                    <a href={i.url} target="_blank" rel="noreferrer" title="Abrir" className="p-1.5 rounded-lg shrink-0" style={{ color: COR }}><ExternalLink size={15} /></a>
                    <button onClick={() => excluir([i.mensagem], `o arquivo ${i.nome}`)} disabled={trabalhando} title="Excluir" className="p-1.5 rounded-lg shrink-0 disabled:opacity-50" style={{ color: '#b91c1c' }}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
