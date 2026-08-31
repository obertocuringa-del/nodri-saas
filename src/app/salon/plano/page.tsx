'use client'
import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, Check, ArrowUp, ArrowDown, AlertTriangle, CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { PLANOS_NODRI, moduloPorChave } from '@/lib/planosModulos'

// ── O cliente troca o próprio plano ─────────────────────────────────────────
//
// A tela diz, ANTES de confirmar, o que acontece com o dinheiro e o que
// acontece com o acesso — porque as duas coisas não andam juntas: subir
// libera na hora e o valor novo entra na próxima fatura; descer mantém o
// acesso maior até o fim do mês já pago. Sem dizer isso, quem desce acha que
// perdeu o que pagou e abre chamado.

interface Plano { id: string; nome: string; slug: string; preco: number }

export default function PlanoDoSalaoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [planos, setPlanos] = useState<Plano[]>([])
  const [atualId, setAtualId] = useState<string | null>(null)
  const [temAssinatura, setTemAssinatura] = useState(false)
  const [confirmar, setConfirmar] = useState<Plano | null>(null)

  function carregar() {
    setLoading(true)
    fetch('/api/salon/plano')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        setPlanos(d.planos || [])
        setAtualId(d.planoAtualId || null)
        setTemAssinatura(!!d.temAssinatura)
      })
      .catch(() => toast.error('Não foi possível carregar seus planos'))
      .finally(() => setLoading(false))
  }
  useEffect(carregar, [])

  const atual = planos.find(p => p.id === atualId) || null

  async function trocar(plano: Plano) {
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano: plano.slug }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.erro || 'Não foi possível trocar de plano'); return }
      toast.success(d.mensagem || 'Plano alterado', { duration: 8000 })
      setConfirmar(null)
      carregar()
      // O menu do painel é montado a partir dos módulos liberados. Quando o
      // acesso muda agora, ele precisa ser remontado — senão o cliente paga
      // mais e continua vendo o menu antigo até sair e entrar de novo.
      if (d.acessoLiberadoAgora) setTimeout(() => router.refresh(), 400)
    } catch { toast.error('Erro de conexão') }
    finally { setSalvando(false) }
  }

  /** O que este plano entrega, em nome de gente. */
  function itensDoPlano(slug: string, nome: string): string[] {
    const p = PLANOS_NODRI.find(x => x.slug === slug)
      || PLANOS_NODRI.find(x => x.nome.toLowerCase() === (nome || '').toLowerCase())
    if (!p) return []
    return p.modulos.map(c => moduloPorChave(c)?.rotulo).filter(Boolean) as string[]
  }

  return (
    <div className="min-h-screen bg-nodri-dark">
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/salon')} className="flex items-center gap-2 text-nodri-t2 hover:text-nodri-cyan transition-colors text-sm">
          <ArrowLeft size={16} /> Voltar ao painel
        </button>
        <div className="w-px h-5 bg-nodri-border" />
        <h1 className="font-syne font-bold text-[15px]">Meu Plano</h1>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-8">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-nodri-cyan" /></div>
        ) : (
          <>
            {atual && (
              <div className="nodri-card p-4 mb-6 flex items-center gap-3">
                <CreditCard size={18} className="text-nodri-cyan shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">
                    Seu plano hoje: {atual.nome} — R$ {atual.preco}/mês
                  </p>
                  <p className="text-[11px] text-nodri-t3">
                    {temAssinatura
                      ? 'A cobrança é automática no seu cartão, todo mês.'
                      : 'Este salão não tem cobrança automática ligada.'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {planos.map(p => {
                const ehAtual = p.id === atualId
                const sobe = atual ? p.preco > atual.preco : false
                const itens = itensDoPlano(p.slug, p.nome)
                return (
                  <div key={p.id} className={'nodri-card p-5 flex flex-col ' + (ehAtual ? 'ring-2 ring-nodri-cyan' : '')}>
                    <div className="flex items-baseline justify-between mb-1">
                      <h2 className="font-syne font-bold text-[15px] text-gray-900">{p.nome}</h2>
                      {ehAtual && <span className="text-[10px] uppercase tracking-wider text-nodri-cyan font-bold">Atual</span>}
                    </div>
                    <p className="text-[22px] font-bold text-gray-900 mb-3">
                      R$ {p.preco}<span className="text-[12px] font-normal text-nodri-t3">/mês</span>
                    </p>

                    <ul className="space-y-1.5 mb-5 flex-1">
                      {itens.map(i => (
                        <li key={i} className="flex items-start gap-2 text-[12px] text-nodri-t2">
                          <Check size={13} className="text-nodri-cyan shrink-0 mt-0.5" /> {i}
                        </li>
                      ))}
                    </ul>

                    {ehAtual ? (
                      <button disabled className="w-full py-2.5 rounded-lg text-[12px] font-semibold bg-nodri-surface text-nodri-t3 border border-nodri-border cursor-default">
                        Plano atual
                      </button>
                    ) : (
                      <button onClick={() => setConfirmar(p)} disabled={salvando}
                        className={'w-full py-2.5 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 '
                          + (sobe ? 'bg-nodri-cyan text-black hover:brightness-110'
                                  : 'bg-nodri-surface text-nodri-t2 border border-nodri-border hover:border-nodri-cyan')}>
                        {sobe ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                        {sobe ? 'Mudar para este plano' : 'Descer para este plano'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {confirmar && atual && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !salvando && setConfirmar(null)}>
          <div className="nodri-card p-5 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-syne font-bold text-[15px] text-gray-900 mb-1">
              Mudar de {atual.nome} para {confirmar.nome}?
            </h3>
            <p className="text-[12px] text-nodri-t3 mb-4">
              R$ {atual.preco}/mês → <b className="text-gray-900">R$ {confirmar.preco}/mês</b>
            </p>

            {confirmar.preco > atual.preco ? (
              <div className="flex gap-2 p-3 rounded-lg bg-green-50 border border-green-200 mb-4">
                <ArrowUp size={15} className="text-green-700 shrink-0 mt-0.5" />
                <p className="text-[12px] text-green-900 leading-relaxed">
                  O acesso novo é liberado <b>agora</b>. Você aproveita o resto deste mês sem pagar
                  diferença — os R$ {confirmar.preco} entram só na próxima fatura.
                </p>
              </div>
            ) : (
              <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4">
                <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[12px] text-amber-900 leading-relaxed">
                  Você já pagou este mês no plano {atual.nome}, então <b>continua com o acesso de
                  hoje até o fim do período pago</b>. Na próxima fatura entram juntos o valor de
                  R$ {confirmar.preco} e o acesso do plano {confirmar.nome}.
                </p>
              </div>
            )}

            <p className="text-[11px] text-nodri-t3 mb-4">
              Seu cartão continua o mesmo — não é preciso digitar nada de novo.
            </p>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmar(null)} disabled={salvando}
                className="px-4 py-2 rounded-lg text-[12px] text-nodri-t2 border border-nodri-border disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={() => trocar(confirmar)} disabled={salvando}
                className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-nodri-cyan text-black hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5">
                {salvando && <Loader2 size={13} className="animate-spin" />}
                {salvando ? 'Alterando' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
