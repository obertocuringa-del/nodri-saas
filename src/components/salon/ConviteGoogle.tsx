'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Star, Save, Loader2, Link as LinkIcon } from 'lucide-react'
import {
  modoPadraoDoTipo, resumoCriterio,
  type Criterio, type TipoPergunta,
} from '@/lib/feedbackCriterio'

interface Pergunta {
  id: string
  titulo: string
  tipo: TipoPergunta
  opcoes: string[]
  criterio?: Criterio | null
}

// Convite para avaliar no Google: onde o salão diz QUEM merece receber o
// convite e PARA ONDE o convite leva.
//
// O critério mora em cada pergunta, não numa lista fixa aqui. É o que faz a
// regra sobreviver à edição do formulário: o salão pode renomear, reordenar
// ou trocar as perguntas que a liberação continua valendo, porque ela anda
// junto com a pergunta e não com a posição dela.
export default function ConviteGoogle({ perguntas, onMudou }: { perguntas: Pergunta[]; onMudou?: () => void }) {
  const [link, setLink] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [salvandoCfg, setSalvandoCfg] = useState(false)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const [local, setLocal] = useState<Record<string, Criterio | null>>({})

  useEffect(() => {
    fetch('/api/feedback/google')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setLink(d.link || ''); setMensagem(d.mensagem || '') } })
      .catch(() => { /* a tela abre com os campos vazios */ })
  }, [])

  useEffect(() => {
    const m: Record<string, Criterio | null> = {}
    for (const p of perguntas) m[p.id] = p.criterio ?? null
    setLocal(m)
  }, [perguntas])

  async function salvarConfig() {
    setSalvandoCfg(true)
    const r = await fetch('/api/feedback/google', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link, mensagem }),
    })
    setSalvandoCfg(false)
    if (r.ok) toast.success(link ? 'Convite do Google salvo' : 'Convite desligado (link vazio)')
    else { const e = await r.json().catch(() => ({})); toast.error(e.error || 'Não foi possível salvar') }
  }

  async function salvarCriterio(p: Pergunta, criterio: Criterio | null) {
    setSalvandoId(p.id)
    const r = await fetch(`/api/feedback/perguntas/${p.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ criterio }),
    })
    setSalvandoId(null)
    if (r.ok) { toast.success('Critério salvo'); onMudou?.(); return }
    // Falha típica: o ALTER TABLE que cria a coluna `criterio` ainda não
    // rodou. Dizer isso é melhor do que um "erro ao salvar" que faz o salão
    // achar que perdeu a configuração.
    const e = await r.json().catch(() => ({} as any))
    toast.error(
      String(e?.error || '').toLowerCase().includes('criterio')
        ? 'O banco ainda não tem a coluna do critério. Rode sql/feedback_google.sql.'
        : (e?.error || 'Não foi possível salvar o critério'),
    )
  }

  function mudar(id: string, c: Criterio | null) {
    setLocal(prev => ({ ...prev, [id]: c }))
  }

  // Texto não tem como indicar satisfação por conta própria — fica de fora.
  const elegiveis = perguntas.filter(p => p.tipo !== 'texto')
  const comCriterio = elegiveis.filter(p => !!local[p.id]).length

  return (
    <div className="nodri-card p-4 mt-4">
      <div className="flex items-center gap-2 mb-1">
        <Star size={15} className="text-nodri-amber" />
        <h3 className="font-syne font-bold text-[12.5px] text-nodri-t1">Convite para avaliar no Google</h3>
      </div>
      <p className="text-[11px] text-nodri-t2 leading-relaxed mb-4">
        No fim do formulário o cliente clica em <b>“Clique aqui para uma última pergunta importante”</b>.
        Se as respostas dele baterem com os critérios abaixo, a avaliação é enviada na hora e ele recebe
        o convite para avaliar no Google. Se não baterem, ele ganha o campo de comentário — e nada de
        convite.
      </p>

      {/* ── Para onde o convite leva ─────────────────────────────────────── */}
      <div className="rounded-lg border border-nodri-border p-3 mb-4">
        <label className="text-[10px] font-bold text-nodri-t3 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
          <LinkIcon size={11} /> Link do seu Google
        </label>
        <input value={link} onChange={e => setLink(e.target.value)}
          placeholder="https://g.page/r/..."
          className="w-full px-3 py-2 rounded-lg bg-nodri-surface border border-nodri-border text-[12px] text-nodri-t1" />
        <p className="text-[10px] text-nodri-t3 mt-1">
          Deixe vazio para desligar o convite. Nesse caso todo cliente segue pelo comentário.
        </p>

        <label className="text-[10px] font-bold text-nodri-t3 uppercase tracking-wider mt-3 mb-1.5 block">
          Mensagem do convite
        </label>
        <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} rows={3}
          className="w-full px-3 py-2 rounded-lg bg-nodri-surface border border-nodri-border text-[12px] text-nodri-t1 resize-none" />

        <button onClick={salvarConfig} disabled={salvandoCfg}
          className="mt-3 px-4 py-2 rounded-lg bg-nodri-cyan text-white text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50">
          {salvandoCfg ? <><Loader2 size={12} className="animate-spin" /> Salvando…</> : <><Save size={12} /> Salvar link e mensagem</>}
        </button>
      </div>

      {/* ── Quem merece o convite ────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] font-bold text-nodri-t1">Quem recebe o convite</span>
        <span className="text-[10px] text-nodri-t3">{comCriterio} de {elegiveis.length} perguntas na regra</span>
      </div>

      {comCriterio === 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 mb-2 text-[10.5px] text-amber-800">
          Nenhum critério marcado ainda — enquanto estiver assim, ninguém recebe o convite.
          É de propósito: sem regra, o seguro é não mandar cliente insatisfeito avaliar em público.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {elegiveis.map(p => {
          const c = local[p.id] ?? null
          const ativo = !!c
          return (
            <div key={p.id} className={`rounded-lg border p-3 ${ativo ? 'border-nodri-cyan/40 bg-nodri-cyan/5' : 'border-nodri-border'}`}>
              <div className="flex items-start gap-2">
                <input type="checkbox" checked={ativo} className="accent-nodri-cyan mt-0.5"
                  onChange={e => mudar(p.id, e.target.checked ? modoPadraoDoTipo(p.tipo) : null)} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] text-nodri-t1 font-medium leading-snug">{p.titulo}</div>
                  <div className="text-[10px] text-nodri-t3 mt-0.5">{resumoCriterio(c)}</div>

                  {c?.modo === 'escala_min' && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10.5px] text-nodri-t2">Nota mínima</span>
                      <input type="number" min={0} max={10} value={c.min}
                        onChange={e => mudar(p.id, { modo: 'escala_min', min: Number(e.target.value) })}
                        className="w-16 px-2 py-1 rounded-md bg-nodri-surface border border-nodri-border text-[11px] text-nodri-t1" />
                    </div>
                  )}

                  {c?.modo === 'grid_min' && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10.5px] text-nodri-t2">Nota mínima em cada item avaliado</span>
                      <input type="number" min={1} max={5} value={c.min}
                        onChange={e => mudar(p.id, { modo: 'grid_min', min: Number(e.target.value) })}
                        className="w-16 px-2 py-1 rounded-md bg-nodri-surface border border-nodri-border text-[11px] text-nodri-t1" />
                    </div>
                  )}

                  {c?.modo === 'opcoes_ok' && (
                    <div className="mt-2">
                      <div className="text-[10.5px] text-nodri-t2 mb-1">Marque só as respostas que liberam:</div>
                      <div className="flex flex-col gap-1">
                        {p.opcoes.map(o => (
                          <label key={o} className="flex items-center gap-1.5 text-[10.5px] text-nodri-t1">
                            <input type="checkbox" className="accent-nodri-cyan"
                              checked={c.aceitas.includes(o)}
                              onChange={e => mudar(p.id, {
                                modo: 'opcoes_ok',
                                aceitas: e.target.checked ? [...c.aceitas, o] : c.aceitas.filter(x => x !== o),
                              })} />
                            {o}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {c?.modo === 'sim_obrigatorio' && (
                    <div className="mt-2">
                      <div className="text-[10.5px] text-nodri-t2 mb-1">
                        Marque só o que é problema de verdade. Item não marcado nunca bloqueia:
                      </div>
                      <div className="flex flex-col gap-1">
                        {p.opcoes.map(o => (
                          <label key={o} className="flex items-center gap-1.5 text-[10.5px] text-nodri-t1">
                            <input type="checkbox" className="accent-nodri-cyan"
                              checked={c.itens.includes(o)}
                              onChange={e => mudar(p.id, {
                                modo: 'sim_obrigatorio',
                                itens: e.target.checked ? [...c.itens, o] : c.itens.filter(x => x !== o),
                              })} />
                            {o}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <button onClick={() => salvarCriterio(p, c)} disabled={salvandoId === p.id}
                    className="mt-2 px-3 py-1.5 rounded-md border border-nodri-border text-[10.5px] text-nodri-t2 hover:bg-nodri-surface disabled:opacity-50 flex items-center gap-1.5">
                    {salvandoId === p.id ? <><Loader2 size={10} className="animate-spin" /> Salvando…</> : <><Save size={10} /> Salvar esta pergunta</>}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
