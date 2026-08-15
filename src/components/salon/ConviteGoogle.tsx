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
  const [salvando, setSalvando] = useState(false)
  const [local, setLocal] = useState<Record<string, Criterio | null>>({})
  // Copia do que esta gravado, para saber o que ainda nao foi salvo.
  const [linkSalvo, setLinkSalvo] = useState('')
  const [msgSalva, setMsgSalva] = useState('')

  useEffect(() => {
    fetch('/api/feedback/google')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setLink(d.link || ''); setLinkSalvo(d.link || '')
        setMensagem(d.mensagem || ''); setMsgSalva(d.mensagem || '')
      })
      .catch(() => { /* a tela abre com os campos vazios */ })
  }, [])

  useEffect(() => {
    const m: Record<string, Criterio | null> = {}
    for (const p of perguntas) m[p.id] = p.criterio ?? null
    setLocal(m)
  }, [perguntas])

  // UM botao salva tudo: o link, a mensagem e os criterios de todas as
  // perguntas. Antes era um botao por card - seis cliques para o que o salao
  // enxerga como uma configuracao unica. Deu no que tinha que dar: a tela
  // ficava toda preenchida e o banco continuava vazio, sem nenhum erro na
  // frente para avisar.
  async function salvarTudo() {
    setSalvando(true)
    const falhas: string[] = []

    const rCfg = await fetch('/api/feedback/google', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link, mensagem }),
    })
    if (!rCfg.ok) {
      const e = await rCfg.json().catch(() => ({} as any))
      falhas.push(e?.error || 'link do Google')
    }

    for (const p of perguntas) {
      // So manda o que mudou em relacao ao que veio do banco.
      const atual = local[p.id] ?? null
      const original = p.criterio ?? null
      if (JSON.stringify(atual) === JSON.stringify(original)) continue

      const r = await fetch(`/api/feedback/perguntas/${p.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criterio: atual }),
      })
      if (!r.ok) {
        const e = await r.json().catch(() => ({} as any))
        const msg = String(e?.error || '')
        falhas.push(
          msg.toLowerCase().includes('criterio')
            ? 'a coluna `criterio` ainda nao existe no banco (rode sql/feedback_google.sql)'
            : `${p.titulo}${msg ? ': ' + msg : ''}`,
        )
      }
    }

    setSalvando(false)
    if (falhas.length === 0) {
      setLinkSalvo(link); setMsgSalva(mensagem)
      toast.success('Regra do convite salva')
      onMudou?.()
      return
    }
    // Erro visivel e especifico. Silencio aqui e o que fez a configuracao
    // parecer salva sem estar.
    toast.error(`Nao salvou: ${falhas[0]}`, { duration: 6000 })
  }

  function mudar(id: string, c: Criterio | null) {
    setLocal(prev => ({ ...prev, [id]: c }))
  }

  // Texto não tem como indicar satisfação por conta própria — fica de fora.
  const elegiveis = perguntas.filter(p => p.tipo !== 'texto')
  const comCriterio = elegiveis.filter(p => !!local[p.id]).length

  // Ha algo diferente do que veio do banco?
  const criterioMudou = perguntas.some(
    p => JSON.stringify(local[p.id] ?? null) !== JSON.stringify(p.criterio ?? null),
  )
  const pendente = criterioMudou || link !== linkSalvo || mensagem !== msgSalva

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

                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Barra de salvar, colada no fim do painel. Enquanto houver mudanca nao
          gravada ela avisa - a tela nunca mais deve parecer configurada
          estando vazia no banco. */}
      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-nodri-border flex-wrap">
        <span className="text-[10.5px] text-nodri-t3">
          {pendente
            ? 'Você tem alterações que ainda não foram salvas.'
            : 'Tudo salvo.'}
        </span>
        <button onClick={salvarTudo} disabled={salvando || !pendente}
          className="px-5 py-2.5 rounded-lg bg-nodri-cyan text-white text-[11.5px] font-bold flex items-center gap-2 disabled:opacity-40">
          {salvando
            ? <><Loader2 size={13} className="animate-spin" /> Salvando…</>
            : <><Save size={13} /> Salvar regra do convite</>}
        </button>
      </div>
    </div>
  )
}
