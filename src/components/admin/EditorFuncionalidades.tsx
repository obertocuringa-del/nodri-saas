'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Save, Loader2, ExternalLink, ChevronDown } from 'lucide-react'
import CampoTextoRico from '@/components/admin/CampoTextoRico'
import { comoBotao } from '@/lib/acessibilidade'

// ── Editor de funcionalidades ───────────────────────────────────────────────
//
// Cada funcionalidade vira uma página própria em /funcionalidade/<slug> e uma
// linha no menu do topo da vitrine, agrupada pela categoria.
//
// A categoria é texto livre, não uma lista fixa: escrever o mesmo nome em duas
// funcionalidades já as agrupa. Uma tabela de categorias separada só criaria
// um cadastro a mais para manter.

const inp = 'w-full px-3 py-2 rounded-lg bg-nodri-surface border border-nodri-border text-[12px] text-nodri-t1 outline-none focus:border-nodri-cyan'
const lbl = 'text-[10px] font-bold text-nodri-t3 uppercase tracking-wider mb-1 block'

interface Func {
  id: string; categoria: string; nome: string; slug: string
  etiqueta?: string; titulo: string; descricao?: string
  destaques?: { titulo: string; desc?: string }[]
  video_url?: string; imagem_url?: string; botao_texto?: string
  midias?: { tipo?: 'imagem' | 'video'; url: string }[]; intervalo?: number
  ordem_categoria?: number; ordem?: number; ativo?: boolean
}

export default function EditorFuncionalidades() {
  const [itens, setItens] = useState<Func[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)

  async function carregar() {
    try {
      const d = await fetch('/api/funcionalidades').then(r => r.ok ? r.json() : [])
      setItens(Array.isArray(d) ? d : [])
    } catch { /* lista vazia */ }
    setCarregando(false)
  }
  useEffect(() => { carregar() }, [])

  const set = (id: string, campo: string, valor: any) =>
    setItens(prev => prev.map(f => f.id === id ? { ...f, [campo]: valor } : f))

  async function criar() {
    const r = await fetch('/api/funcionalidades', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoria: 'Nova categoria', nome: 'Nova funcionalidade', titulo: 'Nova funcionalidade' }),
    })
    const d = await r.json()
    if (!r.ok) { toast.error(d?.erro || 'Não foi possível criar'); return }
    setItens(prev => [...prev, d])
    setAberto(d.id)
  }

  async function salvar(f: Func) {
    setSalvando(f.id)
    const r = await fetch('/api/funcionalidades', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    })
    setSalvando(null)
    if (r.ok) toast.success('Funcionalidade salva')
    else { const d = await r.json().catch(() => ({} as any)); toast.error(d?.erro || 'Não foi possível salvar') }
  }

  async function excluir(f: Func) {
    if (!confirm(`Excluir "${f.nome}"? A página dela sai do ar.`)) return
    const r = await fetch(`/api/funcionalidades?id=${f.id}`, { method: 'DELETE' })
    if (r.ok) { setItens(prev => prev.filter(x => x.id !== f.id)); toast.success('Excluída') }
    else toast.error('Não foi possível excluir')
  }

  if (carregando) return <div className="nodri-card p-6 text-center text-nodri-t3 text-sm">Carregando…</div>

  return (
    <div className="flex flex-col gap-2 pb-8">
      <div className="nodri-card p-4">
        <h3 className="font-syne font-bold text-[12px] text-nodri-cyan mb-1.5">Funcionalidades da vitrine</h3>
        <p className="text-[11px] text-nodri-t2 leading-relaxed">
          Cada uma vira uma página em <b>/funcionalidade/…</b> e entra no menu <b>FUNCIONALIDADES</b> do
          topo do site, agrupada pela categoria. Para agrupar duas, basta escrever a mesma categoria nas duas.
          Se não houver nenhuma cadastrada, o botão do menu não aparece.
        </p>
      </div>

      {itens.map(f => {
        const expandido = aberto === f.id
        return (
          <div key={f.id} className="nodri-card p-3">
            <div {...comoBotao} className="flex items-center gap-2 cursor-pointer" onClick={() => setAberto(expandido ? null : f.id)}>
              <ChevronDown size={14} className={`text-nodri-t3 transition-transform ${expandido ? 'rotate-180' : ''}`} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold text-nodri-t1 truncate">{f.nome}</div>
                <div className="text-[10px] text-nodri-t3">{f.categoria} · /{f.slug}</div>
              </div>
              <a href={`/funcionalidade/${f.slug}`} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-nodri-t3 hover:text-nodri-cyan p-1"><ExternalLink size={13} /></a>
              <button onClick={e => { e.stopPropagation(); excluir(f) }} className="text-nodri-red p-1"><Trash2 size={13} /></button>
            </div>

            {expandido && (
              <div className="grid gap-2.5 mt-3 pt-3 border-t border-nodri-border">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={lbl}>Categoria (agrupa no menu)</label>
                    <input className={inp} value={f.categoria} onChange={e => set(f.id, 'categoria', e.target.value)} /></div>
                  <div><label className={lbl}>Nome no menu</label>
                    <input className={inp} value={f.nome} onChange={e => set(f.id, 'nome', e.target.value)} /></div>
                </div>

                <div><label className={lbl}>Etiqueta (pílula acima do título)</label>
                  <input className={inp} value={f.etiqueta || ''} placeholder="Ex.: Conheça o financeiro"
                    onChange={e => set(f.id, 'etiqueta', e.target.value)} /></div>

                <div><label className={lbl}>Título grande da página</label>
                  <textarea className={inp + ' resize-none'} rows={2} value={f.titulo}
                    onChange={e => set(f.id, 'titulo', e.target.value)} /></div>

                <div><label className={lbl}>Descrição</label>
                  <CampoTextoRico valor={f.descricao || ''} onChange={v => set(f.id, 'descricao', v)} /></div>

                {/* Fotos e vídeos, na ordem em que aparecem. Um link por
                    linha; vídeo do YouTube é reconhecido sozinho pelo endereço. */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={lbl + ' mb-0'}>Fotos e vídeos</label>
                    <button onClick={() => set(f.id, 'midias', [...(f.midias || []), { url: '' }])}
                      className="text-[10px] text-nodri-cyan font-bold">+ Adicionar</button>
                  </div>
                  {(f.midias || []).map((m, i) => (
                    <div key={i} className="flex gap-1.5 mb-1.5">
                      <input className={inp} value={m.url}
                        placeholder="Link da foto ou do vídeo do YouTube"
                        onChange={e => {
                          const arr = [...(f.midias || [])]; arr[i] = { ...arr[i], url: e.target.value }
                          set(f.id, 'midias', arr)
                        }} />
                      <button onClick={() => set(f.id, 'midias', (f.midias || []).filter((_, j) => j !== i))}
                        className="text-nodri-red p-1 shrink-0"><Trash2 size={11} /></button>
                    </div>
                  ))}
                  <p className="text-[10px] text-nodri-t3 mt-1">
                    Tamanho ideal: 1280 × 720 px (16:9), até 500 KB — é o formato que cabe na tela sem o visitante precisar rolar. Fora dessa proporção a imagem é cortada nas bordas em vez de distorcer.<br />
                    Com mais de uma, viram carrossel com setas. Vídeo não troca sozinho — ninguém
                    gosta de perder o vídeo no meio. Sem nenhuma, o texto ocupa a página inteira.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div><label className={lbl}>Trocar a cada (segundos)</label>
                    <input className={inp} type="number" min={2} value={f.intervalo ?? 5}
                      onChange={e => set(f.id, 'intervalo', Number(e.target.value))} /></div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={lbl + ' mb-0'}>Destaques (cards pequenos)</label>
                    <button onClick={() => set(f.id, 'destaques', [...(f.destaques || []), { titulo: '', desc: '' }])}
                      className="text-[10px] text-nodri-cyan font-bold">+ Adicionar</button>
                  </div>
                  {(f.destaques || []).map((d, i) => (
                    <div key={i} className="flex gap-1.5 mb-1.5 items-start">
                      <div className="grid gap-1.5 flex-1">
                        <input className={inp} value={d.titulo} placeholder="Título — ex.: Ponto de equilíbrio"
                          onChange={e => {
                            const arr = [...(f.destaques || [])]; arr[i] = { ...arr[i], titulo: e.target.value }
                            set(f.id, 'destaques', arr)
                          }} />
                        <input className={inp} value={d.desc || ''} placeholder="Descrição (opcional) — o que esse item resolve"
                          onChange={e => {
                            const arr = [...(f.destaques || [])]; arr[i] = { ...arr[i], desc: e.target.value }
                            set(f.id, 'destaques', arr)
                          }} />
                      </div>
                      <button onClick={() => set(f.id, 'destaques', (f.destaques || []).filter((_, j) => j !== i))}
                        className="text-nodri-red p-1 shrink-0"><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div><label className={lbl}>Texto do botão</label>
                    <input className={inp} value={f.botao_texto || 'Abrir'}
                      onChange={e => set(f.id, 'botao_texto', e.target.value)} /></div>
                  <div><label className={lbl}>Ordem da categoria</label>
                    <input className={inp} type="number" value={f.ordem_categoria ?? 0}
                      onChange={e => set(f.id, 'ordem_categoria', Number(e.target.value))} /></div>
                  <div><label className={lbl}>Ordem na categoria</label>
                    <input className={inp} type="number" value={f.ordem ?? 0}
                      onChange={e => set(f.id, 'ordem', Number(e.target.value))} /></div>
                </div>

                <button onClick={() => salvar(f)} disabled={salvando === f.id}
                  className="px-4 py-2 rounded-lg bg-nodri-cyan text-white text-[11.5px] font-bold flex items-center gap-1.5 disabled:opacity-50 w-fit">
                  {salvando === f.id ? <><Loader2 size={12} className="animate-spin" /> Salvando…</> : <><Save size={12} /> Salvar</>}
                </button>
              </div>
            )}
          </div>
        )
      })}

      <button onClick={criar}
        className="px-4 py-2.5 rounded-lg bg-nodri-cyan text-white text-[12px] font-bold flex items-center gap-2 w-fit">
        <Plus size={14} /> Nova funcionalidade
      </button>
    </div>
  )
}
