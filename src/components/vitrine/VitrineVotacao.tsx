'use client'
import { useState, useEffect, useMemo } from 'react'
import { ChevronRight, ChevronDown, Check, Send, Loader2, Trophy } from 'lucide-react'
import type { ServicoPublico } from '@/lib/vitrineCliente'
import { agruparPorCategoria } from '@/lib/vitrineCliente'

// Enquete: o cliente marca o que gostaria de ver em promoção. Aqui NÃO se
// mostra preço de propósito — a pergunta é "o que você quer", e um valor ao
// lado empurra a resposta para o mais barato.

interface Ranking { nome: string; votos: number }

export default function VitrineVotacao({ servicos, token }: {
  servicos: ServicoPublico[]
  token: string
}) {
  const [abertas, setAbertas] = useState<Record<string, boolean>>({})
  const [escolhidos, setEscolhidos] = useState<string[]>([])
  const [livre, setLivre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [jaVotou, setJaVotou] = useState(false)
  const [ranking, setRanking] = useState<Ranking[]>([])

  const chaveLocal = `nodri_voto_${token}`

  useEffect(() => {
    try { if (localStorage.getItem(chaveLocal)) setJaVotou(true) } catch { /* modo privado */ }
    carregarRanking()
  }, [])

  function carregarRanking() {
    fetch(`/api/vitrine/${token}/votos`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (Array.isArray(d?.ranking)) setRanking(d.ranking) })
      .catch(() => { /* o ranking é extra; sem ele a votação segue */ })
  }

  const grupos = useMemo(() => agruparPorCategoria(servicos), [servicos])
  const maior = ranking[0]?.votos || 1

  function alternar(nome: string) {
    setEscolhidos(p => p.includes(nome) ? p.filter(x => x !== nome) : [...p, nome])
  }

  async function enviar() {
    if (!escolhidos.length && !livre.trim()) return
    setEnviando(true)
    try {
      const r = await fetch(`/api/vitrine/${token}/votos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servicos: escolhidos, livre: livre.trim() }),
      })
      const d = await r.json()
      if (r.ok) {
        if (Array.isArray(d.ranking)) setRanking(d.ranking)
        try { localStorage.setItem(chaveLocal, String(Date.now())) } catch { /* modo privado */ }
        setJaVotou(true)
        setEscolhidos([])
        setLivre('')
      }
    } catch { /* silencioso: o cliente tenta de novo */ }
    finally { setEnviando(false) }
  }

  return (
    <div>
      {jaVotou ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center mb-5">
          <Check size={22} className="mx-auto text-[var(--vt-cor)] mb-2" />
          <p className="text-[14px] font-semibold text-gray-900">Obrigado pelo seu voto!</p>
          <p className="text-[12px] text-gray-500 mt-1">
            Sua sugestão foi registrada e ajuda a decidir as próximas promoções.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[13px] text-gray-600 mb-4 leading-relaxed">
            Escolha os serviços que você gostaria de ver em promoção. Sua opinião
            ajuda a decidir as próximas campanhas.
          </p>

          <div className="space-y-2 mb-4">
            {grupos.map(([cat, itens]) => (
              <div key={cat} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button onClick={() => setAbertas(p => ({ ...p, [cat]: !p[cat] }))}
                  className="w-full flex items-center gap-2 px-4 py-3.5 text-left">
                  {abertas[cat] ? <ChevronDown size={16} className="text-gray-400 shrink-0" />
                                : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                  <span className="font-bold text-[13px] text-gray-900 uppercase tracking-wide flex-1">{cat}</span>
                  <span className="text-[11px] text-gray-400">{itens.length}</span>
                </button>

                {abertas[cat] && (
                  <div className="border-t border-gray-100">
                    {itens.map(s => {
                      const marcado = escolhidos.includes(s.nome)
                      return (
                        <button key={s.id} onClick={() => alternar(s.nome)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-gray-50 last:border-0">
                          <span className={'w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-all '
                            + (marcado ? 'bg-[var(--vt-cor)] border-transparent' : 'border-gray-300')}>
                            {marcado && <Check size={13} className="text-white" />}
                          </span>
                          <span className="text-[13px] text-gray-800">{s.nome}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
            <label className="text-[12px] font-semibold text-gray-700 block mb-2">
              Não achou o que queria? Escreva aqui:
            </label>
            <textarea value={livre} onChange={e => setLivre(e.target.value)}
              placeholder="Ex: gostaria de promoção em cronograma capilar"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[var(--vt-cor)] resize-none h-20" />
          </div>

          <button onClick={enviar} disabled={enviando || (!escolhidos.length && !livre.trim())}
            className="w-full flex items-center justify-center gap-2 bg-[var(--vt-cor)] text-white py-3 rounded-xl text-[14px] font-semibold disabled:opacity-40">
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {enviando ? 'Enviando' : 'Enviar minha sugestão'}
          </button>
        </>
      )}

      {ranking.length > 0 && (
        <div className="mt-6">
          <h3 className="flex items-center gap-2 font-bold text-[13px] text-gray-900 mb-3">
            <Trophy size={15} className="text-[var(--vt-cor)]" /> Mais pedidos
          </h3>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2.5">
            {ranking.slice(0, 10).map((r, i) => (
              <div key={r.nome}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[11px] text-gray-400 w-4">{i + 1}º</span>
                  <span className="text-[13px] text-gray-800 flex-1">{r.nome}</span>
                  <span className="text-[12px] font-bold text-gray-900">{r.votos}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-6">
                  <div className="h-full bg-[var(--vt-cor)] rounded-full"
                    style={{ width: `${Math.max(4, (r.votos / maior) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
