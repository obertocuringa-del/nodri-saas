'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function ConteudoPage() {
  const { slug } = useParams()
  const router = useRouter()
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/conteudo/${slug}`)
      .then(r => r.json())
      .then(d => { setDados(d); setLoading(false) })
  }, [slug])

  if (loading) return (
    <div className="min-h-screen bg-nodri-dark flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-nodri-cyan" />
    </div>
  )

  // Página oculta — só mostra para admin
  if (dados?.conteudo?.oculto) return (
    <div className="min-h-screen bg-nodri-dark flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h2 className="font-syne font-bold text-lg mb-2">Página em construção</h2>
        <p className="text-nodri-t3 text-sm">Este conteúdo está sendo preparado.</p>
        <button onClick={() => router.back()} className="mt-4 text-nodri-cyan text-sm hover:underline">← Voltar</button>
      </div>
    </div>
  )

  const tituloFormatado = dados?.titulo || String(slug).replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())

  // Extrai URL embed do YouTube
  function getYoutubeEmbed(url: string) {
    if (!url) return ''
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
    return match ? `https://www.youtube.com/embed/${match[1]}` : ''
  }

  const embedUrl = getYoutubeEmbed(dados?.video_url || '')
  const conteudo = dados?.conteudo || {}

  return (
    <div className="min-h-screen bg-nodri-dark text-nodri-t1">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-nodri-t2 hover:text-nodri-cyan transition-colors text-sm font-medium">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="w-px h-5 bg-nodri-border" />
        <h1 className="font-syne font-bold text-[15px] text-nodri-t1 uppercase tracking-wide">{tituloFormatado}</h1>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-8 space-y-8">

        {/* Vídeo YouTube */}
        {embedUrl && (
          <div className="nodri-card overflow-hidden">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={embedUrl}
                title={tituloFormatado}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                style={{ border: 'none' }}
              />
            </div>
          </div>
        )}

        {!embedUrl && !dados?.existe && (
          <div className="nodri-card p-10 text-center">
            <div className="text-4xl mb-3">🎬</div>
            <p className="text-nodri-t2 text-sm">Conteúdo sendo preparado pelo administrador.</p>
          </div>
        )}

        {/* Texto / Descrição */}
        {conteudo?.texto && (
          <div className="nodri-card p-6">
            <div
              className="prose prose-invert max-w-none text-nodri-t1 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: conteudo.texto }}
            />
          </div>
        )}

        {/* Checklist */}
        {conteudo?.checklist?.length > 0 && (
          <div className="nodri-card p-6">
            <h2 className="font-syne font-bold text-[13px] text-nodri-cyan mb-4 uppercase tracking-wider">✅ Checklist</h2>
            <div className="space-y-2">
              {conteudo.checklist.map((item: string, i: number) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded accent-nodri-cyan" />
                  <span className="text-[13px] text-nodri-t1 group-hover:text-nodri-cyan transition-colors">{item}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        {conteudo?.faq?.length > 0 && (
          <div className="nodri-card p-6">
            <h2 className="font-syne font-bold text-[13px] text-nodri-cyan mb-4 uppercase tracking-wider">❓ Perguntas Frequentes</h2>
            <div className="space-y-4">
              {conteudo.faq.map((item: any, i: number) => (
                <div key={i} className="border-b border-nodri-border pb-4 last:border-0 last:pb-0">
                  <p className="font-semibold text-[13px] text-nodri-t1 mb-1">{item.pergunta}</p>
                  <p className="text-[12px] text-nodri-t2 leading-relaxed">{item.resposta}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Downloads */}
        {conteudo?.downloads?.length > 0 && (
          <div className="nodri-card p-6">
            <h2 className="font-syne font-bold text-[13px] text-nodri-cyan mb-4 uppercase tracking-wider">📥 Downloads</h2>
            <div className="space-y-2">
              {conteudo.downloads.map((item: any, i: number) => (
                <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-nodri-surface border border-nodri-border rounded-lg hover:border-nodri-cyan/40 transition-all group">
                  <span className="text-xl">📄</span>
                  <span className="text-[13px] text-nodri-t1 group-hover:text-nodri-cyan transition-colors flex-1">{item.nome}</span>
                  <ArrowLeft size={12} className="rotate-[135deg] text-nodri-t3 group-hover:text-nodri-cyan" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Imagens */}
        {conteudo?.imagens?.length > 0 && (
          <div className="nodri-card p-6">
            <h2 className="font-syne font-bold text-[13px] text-nodri-cyan mb-4 uppercase tracking-wider">🖼️ Imagens</h2>
            <div className="grid grid-cols-2 gap-3">
              {conteudo.imagens.map((src: string, i: number) => (
                <img key={i} src={src} alt={`Imagem ${i + 1}`} className="rounded-lg w-full object-cover" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
