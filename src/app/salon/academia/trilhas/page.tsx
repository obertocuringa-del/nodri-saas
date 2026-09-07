'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Route, Check, ChevronRight, BookOpen } from 'lucide-react'
import { TRILHAS, type Trilha } from '@/lib/academiaTrilhas'
import { lerLidos, alternarLido } from '@/lib/academiaLidos'

// ── Trilhas ─────────────────────────────────────────────────────────────────
//
// Dois estados: a lista de trilhas com o progresso de cada uma, e a trilha
// aberta com os artigos na ordem.
//
// A montagem casa TÍTULO do lib com o artigo que veio do banco. Título que não
// existir no banco some da trilha em vez de virar item quebrado — assim a
// página continua de pé mesmo num ambiente com catálogo parcial.

interface Artigo { id: string; titulo: string; resumo: string; categoria: string }

export default function TrilhasPage() {
  const router = useRouter()
  const [artigos, setArtigos] = useState<Artigo[]>([])
  const [loading, setLoading] = useState(true)
  const [lidos, setLidos] = useState<string[]>([])
  const [aberta, setAberta] = useState<Trilha | null>(null)

  useEffect(() => {
    setLidos(lerLidos())
    fetch('/api/academia')
      .then(r => r.json())
      .then(d => { setArtigos(d.artigos || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const porTitulo = useMemo(() => {
    const m: Record<string, Artigo> = {}
    for (const a of artigos) m[a.titulo] = a
    return m
  }, [artigos])

  // Só entram os artigos que existem de fato no banco.
  const montar = (t: Trilha) => t.artigos.map(tit => porTitulo[tit]).filter(Boolean) as Artigo[]

  const progresso = (t: Trilha) => {
    const lista = montar(t)
    const feitos = lista.filter(a => lidos.includes(a.titulo)).length
    return { feitos, total: lista.length, pct: lista.length ? Math.round((feitos / lista.length) * 100) : 0 }
  }

  const alternar = (titulo: string) => setLidos(alternarLido(titulo))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#4b3fb5] to-[#5b4fcf] text-white px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => (aberta ? setAberta(null) : router.push('/salon/academia'))}
            className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> {aberta ? 'Todas as trilhas' : 'Academia'}
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-nodri-amber/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Route size={22} className="text-nodri-amber" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">{aberta ? aberta.nome : 'Trilhas'}</h1>
              <p className="text-white/60 text-xs">
                {aberta
                  ? `${montar(aberta).length} artigos, na ordem`
                  : `${TRILHAS.length} caminhos prontos`}
              </p>
            </div>
          </div>

          <p className="text-white/70 text-sm mt-2">
            {aberta ? aberta.para : 'Cada trilha resolve um problema inteiro. Os artigos vêm na ordem em que um usa o resultado do anterior.'}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-nodri-amber border-t-transparent rounded-full animate-spin" />
          </div>
        ) : aberta ? (
          /* ── Trilha aberta ─────────────────────────────────────────────── */
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <p className="text-sm text-gray-600 mb-3">{aberta.resumo}</p>
              <Barra {...progresso(aberta)} cor={aberta.cor} />
            </div>

            <div className="space-y-2">
              {montar(aberta).map((a, i) => {
                const lido = lidos.includes(a.titulo)
                return (
                  <div
                    key={a.id}
                    className={`bg-white rounded-xl border ${lido ? 'border-emerald-200' : aberta.borda} p-3.5 flex items-start gap-3 transition`}
                  >
                    <button
                      onClick={() => alternar(a.titulo)}
                      aria-label={lido ? 'Marcar como não lido' : 'Marcar como lido'}
                      title={lido ? 'Marcar como não lido' : 'Marcar como lido'}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border-2 transition ${
                        lido
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-200 text-gray-300 hover:border-nodri-amber'
                      }`}
                    >
                      {lido ? <Check size={15} /> : <span className="text-xs font-bold">{i + 1}</span>}
                    </button>

                    <button
                      onClick={() => router.push(`/salon/academia/${a.id}`)}
                      className="flex-1 min-w-0 text-left group"
                    >
                      <p className={`font-semibold text-sm leading-snug transition-colors ${
                        lido ? 'text-gray-400 line-through' : 'text-gray-800 group-hover:text-nodri-cyan'
                      }`}>
                        {a.titulo}
                      </p>
                      {a.resumo && !lido && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.resumo}</p>
                      )}
                    </button>

                    <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
                  </div>
                )
              })}
            </div>

            {montar(aberta).length === 0 && (
              <div className="text-center py-14 text-gray-400">
                <BookOpen size={36} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Os artigos desta trilha ainda não estão disponíveis.</p>
              </div>
            )}
          </>
        ) : (
          /* ── Lista de trilhas ──────────────────────────────────────────── */
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {TRILHAS.map(t => {
              const p = progresso(t)
              if (p.total === 0) return null
              return (
                <button
                  key={t.slug}
                  onClick={() => setAberta(t)}
                  className={`text-left bg-white rounded-2xl border ${t.borda} p-4 hover:shadow-lg transition group flex flex-col`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <p className="font-bold text-gray-800 text-sm leading-tight group-hover:text-nodri-cyan transition-colors">
                      {t.nome}
                    </p>
                    <span className={`text-xs font-bold flex-shrink-0 ${p.pct === 100 ? 'text-emerald-600' : t.texto}`}>
                      {p.feitos}/{p.total}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3 flex-1">{t.resumo}</p>
                  <Barra {...p} cor={t.cor} />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Barra({ feitos, total, pct, cor }: { feitos: number; total: number; pct: number; cor: string }) {
  return (
    <div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${pct === 100 ? 'from-emerald-500 to-emerald-600' : cor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-gray-400 mt-1.5">
        {pct === 100 ? 'Trilha concluída' : feitos === 0 ? `${total} artigos` : `${feitos} de ${total} lidos`}
      </p>
    </div>
  )
}
