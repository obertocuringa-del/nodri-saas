'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, BookOpen, Clock } from 'lucide-react'

const CAT_LABEL: Record<string, string> = {
  financeiro: ' Gestão Financeira',
  marketing: ' Marketing e Vendas',
  equipe: ' Gestão de Equipe',
  atendimento: ' Atendimento e Vendas',
  operacao: ' Operação e Agenda',
}

interface Artigo {
  id: string
  categoria: string
  titulo: string
  resumo: string
  conteudo: string
  emoji: string
  criado_em: string
}

function renderConteudo(texto: string) {
  // Renderiza markdown básico
  const linhas = texto.split('\n')
  return linhas.map((linha, i) => {
    if (linha.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-gray-800 mt-6 mb-2">{linha.slice(3)}</h2>
    if (linha.startsWith('### ')) return <h3 key={i} className="text-base font-bold text-gray-700 mt-4 mb-1">{linha.slice(4)}</h3>
    if (linha.startsWith('• ') || linha.startsWith('- ')) return (
      <div key={i} className="flex gap-2 py-0.5">
        <span className="text-nodri-amber mt-1 flex-shrink-0">•</span>
        <span className="text-gray-700 text-sm">{formatarTexto(linha.slice(2))}</span>
      </div>
    )
    if (linha.match(/^\d+\./)) return (
      <div key={i} className="flex gap-2 py-0.5">
        <span className="text-nodri-amber font-bold text-sm flex-shrink-0 w-5">{linha.match(/^\d+/)?.[0]}.</span>
        <span className="text-gray-700 text-sm">{formatarTexto(linha.replace(/^\d+\./, '').trim())}</span>
      </div>
    )
    if (linha.startsWith('**') && linha.endsWith('**')) return <p key={i} className="font-bold text-gray-800 mt-3 mb-1 text-sm">{linha.slice(2, -2)}</p>
    if (linha === '') return <div key={i} className="h-2" />
    return <p key={i} className="text-gray-700 text-sm leading-relaxed">{formatarTexto(linha)}</p>
  })
}

function formatarTexto(texto: string) {
  // Negrito inline
  const partes = texto.split(/(\*\*[^*]+\*\*)/)
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-800">{parte.slice(2, -2)}</strong>
    }
    return parte
  })
}

export default function ArtigoPage() {
  const router = useRouter()
  const { id } = useParams()
  const [artigo, setArtigo] = useState<Artigo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/academia/${id}`)
      .then(r => r.json())
      .then(d => { setArtigo(d.artigo); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const tempoLeitura = artigo ? Math.max(1, Math.ceil(artigo.conteudo.split(' ').length / 200)) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-nodri-amber" />
            <span className="text-sm text-gray-500">Academia NODRI</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-nodri-amber border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !artigo ? (
        <div className="text-center py-20 text-gray-400">
          <p>Artigo não encontrado.</p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 py-6 pb-16">
          {/* Meta */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
              {CAT_LABEL[artigo.categoria] || artigo.categoria}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={12} /> {tempoLeitura} min de leitura
            </span>
          </div>

          {/* Título */}
          <div className="flex items-start gap-3 mb-4">
            <span className="text-4xl">{artigo.emoji}</span>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{artigo.titulo}</h1>
          </div>

          {/* Resumo */}
          {artigo.resumo && (
            <p className="text-gray-500 text-sm border-l-4 border-nodri-amber pl-3 mb-6 italic">
              {artigo.resumo}
            </p>
          )}

          {/* Conteúdo */}
          <div className="prose prose-sm max-w-none">
            {renderConteudo(artigo.conteudo)}
          </div>

          {/* Rodapé */}
          <div className="mt-10 pt-6 border-t border-gray-100 flex items-center gap-2">
            <div className="w-8 h-8 bg-nodri-amber/10 rounded-full flex items-center justify-center">
              <BookOpen size={14} className="text-nodri-amber" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">Academia NODRI</p>
              <p className="text-xs text-gray-400">Conhecimento para gestão de salões</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
