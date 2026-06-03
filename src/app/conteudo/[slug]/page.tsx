'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Home, Loader2, Download, ExternalLink } from 'lucide-react'

function getYoutubeEmbed(url: string) {
  if (!url) return ''
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : ''
}

// Renderiza cada bloco para o cliente
function RenderBloco({ bloco }: { bloco: any }) {
  const [checks, setChecks] = useState<boolean[]>([])
  const [faqAberto, setFaqAberto] = useState<number | null>(null)

  const style: React.CSSProperties = {
    width: bloco.largura ? `${bloco.largura}%` : '100%',
  }

  switch (bloco.tipo) {

    case 'texto':
      return (
        <div style={style} className="nodri-card p-5">
          <div className="prose prose-invert max-w-none text-nodri-t1 text-[13px] leading-relaxed
            [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-nodri-border [&_td]:p-2
            [&_th]:border [&_th]:border-nodri-border [&_th]:p-2 [&_th]:bg-nodri-surface [&_th]:font-bold
            [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-nodri-cyan [&_h1]:mb-3
            [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-nodri-t1 [&_h2]:mb-2
            [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-nodri-t1 [&_h3]:mb-2
            [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
            [&_blockquote]:border-l-4 [&_blockquote]:border-nodri-cyan [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-nodri-t2
            [&_strong]:text-nodri-t1 [&_em]:italic [&_u]:underline [&_s]:line-through"
            dangerouslySetInnerHTML={{ __html: bloco.conteudo?.html || '' }}
          />
        </div>
      )

    case 'imagem':
      if (!bloco.conteudo?.url) return null
      return (
        <div style={style} className="nodri-card p-3">
          <img src={bloco.conteudo.url} alt={bloco.conteudo.legenda || 'imagem'} className="w-full rounded-lg object-contain max-h-96" />
          {bloco.conteudo.legenda && <p className="text-[11px] text-nodri-t3 text-center mt-2">{bloco.conteudo.legenda}</p>}
        </div>
      )

    case 'video':
      const embedUrl = getYoutubeEmbed(bloco.conteudo?.url || '')
      if (!embedUrl) return null
      return (
        <div style={style} className="nodri-card overflow-hidden">
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe src={embedUrl} allowFullScreen className="absolute inset-0 w-full h-full" style={{ border: 'none' }} />
          </div>
        </div>
      )

    case 'pdf':
      if (!bloco.conteudo?.url) return null
      return (
        <div style={style}>
          <a href={bloco.conteudo.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 nodri-card border border-nodri-border hover:border-nodri-cyan/40 transition-all group">
            <span className="text-3xl">📄</span>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-nodri-t1 group-hover:text-nodri-cyan transition-colors">{bloco.conteudo.nome || 'Abrir PDF'}</div>
              <div className="text-[10px] text-nodri-t3">Clique para abrir</div>
            </div>
            <ExternalLink size={14} className="text-nodri-t3 group-hover:text-nodri-cyan" />
          </a>
        </div>
      )

    case 'excel':
      if (!bloco.conteudo?.url) return null
      return (
        <div style={style}>
          <a href={bloco.conteudo.url} download
            className="flex items-center gap-3 p-4 nodri-card border border-nodri-border hover:border-nodri-green/40 transition-all group">
            <span className="text-3xl">📊</span>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-nodri-t1 group-hover:text-nodri-green transition-colors">{bloco.conteudo.nome || 'Baixar planilha'}</div>
              <div className="text-[10px] text-nodri-t3">Clique para baixar</div>
            </div>
            <Download size={14} className="text-nodri-t3 group-hover:text-nodri-green" />
          </a>
        </div>
      )

    case 'colunas':
      const cols = bloco.conteudo?.colunas || []
      if (!cols.length) return null
      return (
        <div style={{ ...style, display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`, gap: '12px' }}>
          {cols.map((col: string, i: number) => (
            <div key={i} className="nodri-card p-4 text-[13px] text-nodri-t1 leading-relaxed whitespace-pre-wrap">{col}</div>
          ))}
        </div>
      )

    case 'checklist':
      const itens = bloco.conteudo?.itens || []
      return (
        <div style={style} className="nodri-card p-5">
          <h3 className="font-syne font-bold text-[12px] text-nodri-cyan mb-3 uppercase tracking-wider">✅ Checklist</h3>
          <div className="space-y-2">
            {itens.map((item: string, i: number) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={checks[i] || false}
                  onChange={() => { const a = [...checks]; a[i] = !a[i]; setChecks(a) }}
                  className="w-4 h-4 rounded accent-nodri-cyan" />
                <span className={`text-[13px] transition-colors ${checks[i] ? 'line-through text-nodri-t3' : 'text-nodri-t1 group-hover:text-nodri-cyan'}`}>{item}</span>
              </label>
            ))}
          </div>
        </div>
      )

    case 'faq':
      const faqItens = bloco.conteudo?.itens || []
      return (
        <div style={style} className="nodri-card p-5">
          <h3 className="font-syne font-bold text-[12px] text-nodri-cyan mb-3 uppercase tracking-wider">❓ Perguntas Frequentes</h3>
          <div className="space-y-2">
            {faqItens.map((item: any, i: number) => (
              <div key={i} className="border border-nodri-border rounded-lg overflow-hidden">
                <button onClick={() => setFaqAberto(faqAberto === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-nodri-surface transition-colors">
                  <span className="text-[13px] font-medium text-nodri-t1">{item.pergunta}</span>
                  <span className="text-nodri-t3 text-lg">{faqAberto === i ? '−' : '+'}</span>
                </button>
                {faqAberto === i && (
                  <div className="px-4 pb-3 text-[12px] text-nodri-t2 leading-relaxed border-t border-nodri-border bg-nodri-surface/50">
                    {item.resposta}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )

    default:
      return null
  }
}

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

  const titulo = dados?.titulo || String(slug).replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
  const blocos: any[] = dados?.conteudo?.blocos || []
  const embedUrl = getYoutubeEmbed(dados?.video_url || '')

  // Se tem blocos novos, usa o novo sistema
  const temBlocos = blocos.length > 0

  return (
    <div className="min-h-screen bg-nodri-dark text-nodri-t1">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-nodri-t2 hover:text-nodri-cyan transition-colors text-sm font-medium shrink-0">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="w-px h-5 bg-nodri-border shrink-0" />
        <a href="/salon" className="flex items-center gap-1.5 text-nodri-t3 hover:text-nodri-cyan transition-colors text-[12px] font-medium shrink-0">
          <Home size={14} /> Início
        </a>
        <div className="w-px h-5 bg-nodri-border shrink-0" />
        <h1 className="font-syne font-bold text-[15px] uppercase tracking-wide truncate">{titulo}</h1>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-8">

        {/* Vídeo principal (campo legado) */}
        {!temBlocos && embedUrl && (
          <div className="nodri-card overflow-hidden mb-6">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe src={embedUrl} allowFullScreen className="absolute inset-0 w-full h-full" style={{ border: 'none' }} />
            </div>
          </div>
        )}

        {/* NOVO: Blocos avançados */}
        {temBlocos ? (
          <div className="flex flex-wrap gap-4">
            {blocos.map((bloco: any) => (
              <RenderBloco key={bloco.id} bloco={bloco} />
            ))}
          </div>
        ) : (
          /* Legado: conteúdo antigo */
          <div className="space-y-6">
            {dados?.conteudo?.texto && (
              <div className="nodri-card p-6">
                <div className="prose prose-invert max-w-none text-nodri-t1 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: dados.conteudo.texto }} />
              </div>
            )}
            {!dados?.existe && !embedUrl && (
              <div className="nodri-card p-10 text-center">
                <div className="text-4xl mb-3">🎬</div>
                <p className="text-nodri-t2 text-sm">Conteúdo sendo preparado pelo administrador.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
