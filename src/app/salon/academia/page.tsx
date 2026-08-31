'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, BookOpen, ChevronRight, TrendingUp, Users, ShoppingBag, Calendar, DollarSign } from 'lucide-react'

const CATEGORIAS = [
  { key: 'financeiro',   label: 'Gestão Financeira',   emoji: '', icon: DollarSign,  cor: 'from-emerald-500 to-emerald-700', bg: 'bg-emerald-50', borda: 'border-emerald-200' },
  { key: 'marketing',   label: 'Marketing e Vendas',   emoji: '', icon: TrendingUp,   cor: 'from-violet-500 to-violet-700',  bg: 'bg-violet-50',  borda: 'border-violet-200' },
  { key: 'equipe',      label: 'Gestão de Equipe',     emoji: '', icon: Users,        cor: 'from-blue-500 to-blue-700',      bg: 'bg-blue-50',    borda: 'border-blue-200' },
  { key: 'atendimento', label: 'Atendimento e Vendas', emoji: '', icon: ShoppingBag,  cor: 'from-pink-500 to-pink-700',      bg: 'bg-pink-50',    borda: 'border-pink-200' },
  { key: 'operacao',    label: 'Operação e Agenda',    emoji: '', icon: Calendar,     cor: 'from-amber-500 to-amber-700',    bg: 'bg-amber-50',   borda: 'border-amber-200' },
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

  const artigosFiltrados = artigos.filter(a => {
    const matchBusca = !busca || a.titulo.toLowerCase().includes(busca.toLowerCase()) || (a.resumo || '').toLowerCase().includes(busca.toLowerCase())
    const matchCat = !categoriaAtiva || a.categoria === categoriaAtiva
    return matchBusca && matchCat
  })

  const artigosPorCategoria = CATEGORIAS.map(cat => ({
    ...cat,
    artigos: artigosFiltrados.filter(a => a.categoria === cat.key)
  }))

  const totalArtigos = artigos.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4b3fb5] to-[#5b4fcf] text-white px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-nodri-amber/20 rounded-xl flex items-center justify-center">
              <BookOpen size={22} className="text-nodri-amber" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Academia NODRI</h1>
              <p className="text-white/60 text-xs">{totalArtigos} artigos · 5 categorias</p>
            </div>
          </div>
          <p className="text-white/70 text-sm mt-2">
            Conhecimento prático para você crescer seu salão com estratégia.
          </p>

          {/* Busca */}
          <div className="mt-4 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Buscar artigos..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-white/40 text-sm focus:outline-none focus:border-nodri-amber/50"
            />
          </div>
        </div>
      </div>

      {/* Filtros de categoria */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setCategoriaAtiva(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${!categoriaAtiva ? 'bg-nodri-cyan text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            Todos
          </button>
          {CATEGORIAS.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategoriaAtiva(categoriaAtiva === cat.key ? null : cat.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${categoriaAtiva === cat.key ? 'bg-nodri-cyan text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-nodri-amber border-t-transparent rounded-full animate-spin" />
          </div>
        ) : artigosPorCategoria.every(c => c.artigos.length === 0) ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum artigo encontrado</p>
            <p className="text-sm mt-1">Tente outra busca</p>
          </div>
        ) : (
          <div className="space-y-8">
            {artigosPorCategoria.map(cat => {
              if (cat.artigos.length === 0) return null
              const Icon = cat.icon
              return (
                <div key={cat.key}>
                  {/* Cabeçalho da categoria */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.cor} flex items-center justify-center`}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <h2 className="font-bold text-gray-800">{cat.label}</h2>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cat.artigos.length}</span>
                  </div>

                  {/* Lista de artigos */}
                  <div className="space-y-2">
                    {cat.artigos.map(artigo => (
                      <button
                        key={artigo.id}
                        onClick={() => router.push(`/salon/academia/${artigo.id}`)}
                        className={`w-full text-left bg-white rounded-xl border ${cat.borda} p-4 flex items-center gap-3 hover:shadow-md transition group`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm group-hover:text-nodri-cyan transition-colors">{artigo.titulo}</p>
                          {artigo.resumo && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{artigo.resumo}</p>}
                        </div>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-nodri-amber flex-shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
