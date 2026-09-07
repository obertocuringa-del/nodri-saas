'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Search, BookOpen, ChevronRight, TrendingUp, Users, ShoppingBag,
  Calendar, DollarSign, Briefcase, ConciergeBell, ShieldCheck, Compass, X,
  Route, Printer,
} from 'lucide-react'

// ── Academia: organizada por assunto ────────────────────────────────────────
//
// A tela antiga despejava todos os artigos numa lista só, um bloco atrás do
// outro. Com 26 artigos aquilo ainda se lia; passando de 70, virou rolagem sem
// fim — e "está tudo aqui" na prática vira "não acho nada".
//
// Agora são três estados, e a tela mostra um de cada vez:
//
//   1. INÍCIO      — por onde começar + os assuntos, em cartões
//   2. ASSUNTO     — só os artigos daquele assunto
//   3. BUSCA       — resultado plano, com o assunto marcado em cada item
//
// A escolha do assunto vem antes da lista porque é assim que a pergunta chega:
// o dono não procura "artigo 34", procura "aquilo de comissão".

const CATEGORIAS = [
  {
    key: 'gestao', label: 'Gestão do Negócio', icon: Briefcase,
    desc: 'Por onde começar, quanto custa abrir, os erros que quebram.',
    cor: 'from-slate-500 to-slate-700', bg: 'bg-slate-50', borda: 'border-slate-200', texto: 'text-slate-700',
  },
  {
    key: 'financeiro', label: 'Gestão Financeira', icon: DollarSign,
    desc: 'Custo, preço, margem e caixa — os números que mandam.',
    cor: 'from-emerald-500 to-emerald-700', bg: 'bg-emerald-50', borda: 'border-emerald-200', texto: 'text-emerald-700',
  },
  {
    key: 'equipe', label: 'Gestão de Equipe', icon: Users,
    desc: 'Contratar, treinar, avaliar e liderar sem virar refém.',
    cor: 'from-blue-500 to-blue-700', bg: 'bg-blue-50', borda: 'border-blue-200', texto: 'text-blue-700',
  },
  {
    key: 'recepcao', label: 'Recepção', icon: ConciergeBell,
    desc: 'Quem está no balcão decide a ocupação da agenda.',
    cor: 'from-rose-500 to-rose-700', bg: 'bg-rose-50', borda: 'border-rose-200', texto: 'text-rose-700',
  },
  {
    key: 'atendimento', label: 'Atendimento e Vendas', icon: ShoppingBag,
    desc: 'A experiência que faz a cliente voltar e indicar.',
    cor: 'from-pink-500 to-pink-700', bg: 'bg-pink-50', borda: 'border-pink-200', texto: 'text-pink-700',
  },
  {
    key: 'marketing', label: 'Marketing e Vendas', icon: TrendingUp,
    desc: 'Encher a agenda e trazer de volta quem sumiu.',
    cor: 'from-violet-500 to-violet-700', bg: 'bg-violet-50', borda: 'border-violet-200', texto: 'text-violet-700',
  },
  {
    key: 'operacao', label: 'Operação e Agenda', icon: Calendar,
    desc: 'A rotina que faz o salão funcionar sem você.',
    cor: 'from-amber-500 to-amber-700', bg: 'bg-amber-50', borda: 'border-amber-200', texto: 'text-amber-700',
  },
  {
    key: 'patrimonio', label: 'Patrimônio e Risco', icon: ShieldCheck,
    desc: 'O salão como bem: o que vale e o que pode dar processo.',
    cor: 'from-teal-500 to-teal-700', bg: 'bg-teal-50', borda: 'border-teal-200', texto: 'text-teal-700',
  },
]

// Trilha de entrada. Casada por título: se algum não existir no banco, some da
// lista sem quebrar nada — a tela nunca depende de um artigo específico.
const COMECE_POR_AQUI = [
  'Gestão de salão: por onde começar',
  'Como separar as finanças do salão das suas',
  'Como calcular o ponto de equilíbrio do seu salão',
  'Como precificar serviços corretamente',
  'Os 7 erros de gestão que quebram um salão',
]

interface Artigo {
  id: string
  categoria: string
  titulo: string
  resumo: string
  emoji: string
  ordem: number
}

export default function AcademiaPage() {
  const router = useRouter()
  const [artigos, setArtigos] = useState<Artigo[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/academia')
      .then(r => r.json())
      .then(d => { setArtigos(d.artigos || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const termo = busca.trim().toLowerCase()

  const resultadosBusca = useMemo(() => {
    if (!termo) return []
    return artigos.filter(a =>
      a.titulo.toLowerCase().includes(termo) ||
      (a.resumo || '').toLowerCase().includes(termo)
    )
  }, [artigos, termo])

  const porCategoria = useMemo(() => {
    const m: Record<string, Artigo[]> = {}
    for (const a of artigos) (m[a.categoria] ||= []).push(a)
    return m
  }, [artigos])

  const inicio = useMemo(() => {
    const achar = (t: string) => artigos.find(a => a.titulo === t)
    return COMECE_POR_AQUI.map(achar).filter(Boolean) as Artigo[]
  }, [artigos])

  const catAberta = CATEGORIAS.find(c => c.key === categoriaAtiva) || null
  const abrir = (id: string) => router.push(`/salon/academia/${id}`)

  // Assuntos que existem de fato no banco. Categoria vazia não vira cartão —
  // cartão que abre numa lista vazia é pior do que não existir.
  const categoriasComArtigo = CATEGORIAS.filter(c => (porCategoria[c.key] || []).length > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#4b3fb5] to-[#5b4fcf] text-white px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => (catAberta ? setCategoriaAtiva(null) : router.back())}
            className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> {catAberta ? 'Todos os assuntos' : 'Voltar'}
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-nodri-amber/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen size={22} className="text-nodri-amber" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Academia NODRI</h1>
              <p className="text-white/60 text-xs">
                {artigos.length} artigos · {categoriasComArtigo.length} assuntos
              </p>
            </div>
          </div>

          <p className="text-white/70 text-sm mt-2">
            Conhecimento prático para você crescer seu salão com estratégia.
          </p>

          <div className="mt-4 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Buscar por assunto, título ou palavra..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-9 py-2.5 text-white placeholder-white/40 text-sm focus:outline-none focus:border-nodri-amber/50"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                aria-label="Limpar busca"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-nodri-amber border-t-transparent rounded-full animate-spin" />
          </div>
        ) : termo ? (
          /* ── 3. BUSCA ──────────────────────────────────────────────────── */
          <>
            <p className="text-sm text-gray-500 mb-3">
              {resultadosBusca.length === 0
                ? 'Nenhum artigo encontrado.'
                : `${resultadosBusca.length} ${resultadosBusca.length === 1 ? 'resultado' : 'resultados'} para "${busca.trim()}"`}
            </p>
            {resultadosBusca.length === 0 ? (
              <VazioBusca />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {resultadosBusca.map(a => (
                  <CardArtigo key={a.id} artigo={a} onClick={() => abrir(a.id)} mostrarCategoria />
                ))}
              </div>
            )}
          </>
        ) : catAberta ? (
          /* ── 2. UM ASSUNTO ─────────────────────────────────────────────── */
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${catAberta.cor} flex items-center justify-center flex-shrink-0`}>
                <catAberta.icon size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-gray-800 leading-tight">{catAberta.label}</h2>
                <p className="text-xs text-gray-500">{catAberta.desc}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {(porCategoria[catAberta.key] || []).map(a => (
                <CardArtigo key={a.id} artigo={a} onClick={() => abrir(a.id)} />
              ))}
            </div>
          </>
        ) : (
          /* ── 1. INÍCIO ─────────────────────────────────────────────────── */
          <>
            {/* Trilhas e materiais vem ANTES da lista de artigos: sao os dois
                caminhos de quem chega sem pergunta formada. Quem ja sabe o que
                procura usa a busca la em cima e nem passa por aqui. */}
            <div className="grid gap-3 sm:grid-cols-2 mb-7">
              <button
                onClick={() => router.push('/salon/academia/trilhas')}
                className="text-left bg-gradient-to-br from-[#4b3fb5] to-[#5b4fcf] text-white rounded-2xl p-4 hover:shadow-lg transition group flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Route size={21} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm">Trilhas</p>
                  <p className="text-white/70 text-xs leading-snug">
                    Caminhos na ordem certa, com marcação de lido.
                  </p>
                </div>
                <ChevronRight size={18} className="text-white/50 flex-shrink-0" />
              </button>

              <button
                onClick={() => router.push('/salon/academia/materiais')}
                className="text-left bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition group flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-nodri-cyan to-[#0891b2] flex items-center justify-center flex-shrink-0">
                  <Printer size={21} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-800 text-sm group-hover:text-nodri-cyan transition-colors">
                    Materiais para imprimir
                  </p>
                  <p className="text-gray-500 text-xs leading-snug">
                    Fichas e formulários em branco, com a sua logo.
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
              </button>
            </div>

            {inicio.length > 0 && (
              <section className="mb-7">
                <div className="flex items-center gap-2 mb-3">
                  <Compass size={16} className="text-nodri-amber" />
                  <h2 className="font-bold text-gray-800 text-sm">Comece por aqui</h2>
                </div>
                <p className="text-xs text-gray-500 mb-3 -mt-1">
                  Na ordem. Cada um usa o resultado do anterior.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {inicio.map((a, i) => (
                    <button
                      key={a.id}
                      onClick={() => abrir(a.id)}
                      className="w-full text-left bg-white rounded-xl border border-gray-200 p-3.5 flex items-center gap-3 hover:shadow-md hover:border-nodri-amber/40 transition group"
                    >
                      <span className="w-7 h-7 rounded-lg bg-nodri-amber/10 text-nodri-amber font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="flex-1 min-w-0 font-semibold text-gray-800 text-sm group-hover:text-nodri-cyan transition-colors">
                        {a.titulo}
                      </span>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-nodri-amber flex-shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} className="text-gray-400" />
              <h2 className="font-bold text-gray-800 text-sm">Escolha um assunto</h2>
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {categoriasComArtigo.map(cat => {
                const Icon = cat.icon
                const qtd = (porCategoria[cat.key] || []).length
                return (
                  <button
                    key={cat.key}
                    onClick={() => setCategoriaAtiva(cat.key)}
                    className={`text-left bg-white rounded-2xl border ${cat.borda} p-4 hover:shadow-lg transition group flex flex-col`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.cor} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={19} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-800 text-sm leading-tight group-hover:text-nodri-cyan transition-colors">
                          {cat.label}
                        </p>
                        <p className={`text-xs font-semibold ${cat.texto}`}>
                          {qtd} {qtd === 1 ? 'artigo' : 'artigos'}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{cat.desc}</p>
                  </button>
                )
              })}
            </div>

            {categoriasComArtigo.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum artigo disponível ainda</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CardArtigo({ artigo, onClick, mostrarCategoria }: {
  artigo: Artigo; onClick: () => void; mostrarCategoria?: boolean
}) {
  const cat = CATEGORIAS.find(c => c.key === artigo.categoria)
  return (
    <button
      onClick={onClick}
      className={`w-full h-full text-left bg-white rounded-xl border ${cat?.borda || 'border-gray-200'} p-4 flex items-center gap-3 hover:shadow-md transition group`}
    >
      <div className="flex-1 min-w-0">
        {mostrarCategoria && cat && (
          <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${cat.texto}`}>{cat.label}</p>
        )}
        <p className="font-semibold text-gray-800 text-sm leading-snug group-hover:text-nodri-cyan transition-colors">
          {artigo.titulo}
        </p>
        {artigo.resumo && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{artigo.resumo}</p>
        )}
      </div>
      <ChevronRight size={16} className="text-gray-300 group-hover:text-nodri-amber flex-shrink-0 transition-colors" />
    </button>
  )
}

function VazioBusca() {
  return (
    <div className="text-center py-14 text-gray-400">
      <Search size={36} className="mx-auto mb-3 opacity-30" />
      <p className="font-medium text-gray-500">Nada encontrado com esse termo</p>
      <p className="text-sm mt-1">Tente uma palavra mais curta, como "comissão" ou "preço".</p>
    </div>
  )
}
