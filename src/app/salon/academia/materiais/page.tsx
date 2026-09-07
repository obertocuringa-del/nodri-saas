'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer, FileText, BookOpen } from 'lucide-react'
import { MATERIAIS, type Material } from '@/lib/academiaMateriais'
import { abrirImpressaoA4 } from '@/lib/impressaoA4'

// ── Materiais para imprimir ─────────────────────────────────────────────────
//
// A folha em branco é o par prático do artigo: o artigo explica, o material é
// o que vai para a mesa. O A4 e o cabeçalho com a logo do salão vivem em
// @/lib/impressaoA4, compartilhados com a impressão de artigo.

const imprimirMaterial = (m: Material) => abrirImpressaoA4(m.titulo, m.corpo, m.quando)

interface Artigo { id: string; titulo: string }

export default function MateriaisPage() {
  const router = useRouter()
  const [artigos, setArtigos] = useState<Artigo[]>([])

  useEffect(() => {
    fetch('/api/academia')
      .then(r => r.json())
      .then(d => setArtigos(d.artigos || []))
      .catch(() => {})
  }, [])

  const idDoArtigo = (titulo?: string) =>
    titulo ? artigos.find(a => a.titulo === titulo)?.id : undefined

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#4b3fb5] to-[#5b4fcf] text-white px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.push('/salon/academia')}
            className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Academia
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-nodri-amber/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Printer size={22} className="text-nodri-amber" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold">Materiais para imprimir</h1>
              <p className="text-white/60 text-xs">{MATERIAIS.length} documentos em branco</p>
            </div>
          </div>

          <p className="text-white/70 text-sm mt-2">
            Fichas e formulários prontos, com a sua logo no cabeçalho. Na caixa
            de impressão, escolha "Salvar como PDF" para guardar o arquivo.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 pb-10">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {MATERIAIS.map(m => {
            const artId = idDoArtigo(m.artigo)
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-nodri-cyan to-[#0891b2] flex items-center justify-center flex-shrink-0">
                    <FileText size={17} className="text-white" />
                  </div>
                  <p className="font-bold text-gray-800 text-sm leading-tight flex-1 min-w-0">{m.titulo}</p>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed mb-2">{m.descricao}</p>
                <p className="text-[11px] text-gray-400 italic mb-3 flex-1">{m.quando}</p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => imprimirMaterial(m)}
                    className="flex items-center gap-2 bg-nodri-cyan hover:brightness-105 text-white font-semibold px-3.5 py-2 rounded-xl text-xs transition"
                  >
                    <Printer size={14} /> Imprimir / PDF
                  </button>

                  {artId && (
                    <button
                      onClick={() => router.push(`/salon/academia/${artId}`)}
                      className="flex items-center gap-1.5 text-gray-500 hover:text-nodri-cyan font-medium px-2 py-2 rounded-xl text-xs transition"
                      title={m.artigo}
                    >
                      <BookOpen size={14} /> Como usar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
