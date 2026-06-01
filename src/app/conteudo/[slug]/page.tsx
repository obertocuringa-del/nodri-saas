'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Download, ExternalLink, CheckSquare, HelpCircle } from 'lucide-react'

function getYoutubeEmbed(url: string) {
  if (!url) return ''
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  return m ? `https://www.youtube.com/embed/${m[1]}` : ''
}

type SecaoTipo = 'video' | 'texto' | 'imagens' | 'tabela' | 'colunas' | 'checklist' | 'faq' | 'pdf' | 'excel' | 'downloads'
const ORDEM_PADRAO: SecaoTipo[] = ['video', 'texto', 'imagens', 'tabela', 'colunas', 'checklist', 'faq', 'pdf', 'excel', 'downloads']

export default function ConteudoPage() {
  const { slug } = useParams()
  const router = useRouter()
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checks, setChecks] = useState<boolean[]>([])
  const [faqAberto, setFaqAberto] = useState<number | null>(null)

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
  const c = dados?.conteudo || {}
  const ordem: SecaoTipo[] = c.ordem_secoes || ORDEM_PADRAO

  function renderVideo() {
    const embedUrl = getYoutubeEmbed(dados?.video_url || '')
    if (!embedUrl) return null
    return (
      <div className="nodri-card overflow-hidden">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe src={embedUrl} allowFullScreen className="absolute inset-0 w-full h-full" style={{ border: 'none' }} />
        </div>
      </div>
    )
  }

  function renderTexto() {
    if (!c.texto) return null
    return (
      <div className="nodri-card p-6">
        <div className="prose prose-invert max-w-none text-nodri-t1 text-[13px] leading-relaxed
          [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline
          [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-nodri-border [&_td]:p-2
          [&_th]:border [&_th]:border-nodri-border [&_th]:p-2 [&_th]:bg-nodri-surface [&_th]:font-bold
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-nodri-cyan [&_h1]:mb-3
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2
          [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
          dangerouslySetInnerHTML={{ __html: c.texto }} />
      </div>
    )
  }

  function renderImagens() {
    const imagens: { id: string; url: string; largura: string }[] = c.imagens || []
    if (!imagens.length) return null
    return (
      <div className="space-y-4">
        {imagens.map(img => (
          <div key={img.id} className="nodri-card p-3 flex justify-center">
            <img src={img.url} alt="Imagem da página" className="rounded-lg object-contain"
              style={{ width: img.largura || '100%', maxHeight: 500 }} />
          </div>
        ))}
      </div>
    )
  }

  function renderTabela() {
    const tabela = c.tabela
    if (!tabela?.data?.length) return null
    return (
      <div className="nodri-card p-4 overflow-x-auto">
        <table className="border-collapse w-full text-[13px]">
          <tbody>
            {tabela.data.map((row: string[], li: number) => (
              <tr key={li} className={li === 0 ? 'bg-nodri-surface' : 'hover:bg-nodri-surface/30 transition-colors'}>
                {row.map((cell: string, ci: number) => (
                  <td key={ci} className={`border border-nodri-border px-3 py-2 ${li === 0 ? 'font-bold text-nodri-cyan' : 'text-nodri-t1'}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function renderColunas() {
    const colunas: { id: string; conteudo: string }[] = c.colunas || []
    if (!colunas.length) return null
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${colunas.length}, 1fr)` }}>
        {colunas.map(col => (
          <div key={col.id} className="nodri-card p-4 text-[13px] text-nodri-t1 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: col.conteudo }} />
        ))}
      </div>
    )
  }

  function renderChecklist() {
    const list: string[] = c.checklist || []
    if (!list.length) return null
    return (
      <div className="nodri-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare size={14} className="text-nodri-green" />
          <h3 className="font-syne font-bold text-[12px] text-nodri-green uppercase tracking-wider">Checklist</h3>
        </div>
        <div className="space-y-2">
          {list.map((item, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" checked={checks[i] || false}
                onChange={() => { const a = [...checks]; a[i] = !a[i]; setChecks(a) }}
                className="w-4 h-4 rounded accent-nodri-cyan" />
              <span className={`text-[13px] transition-colors ${checks[i] ? 'line-through text-nodri-t3' : 'text-nodri-t1 group-hover:text-nodri-cyan'}`}>
                {item}
              </span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  function renderFaq() {
    const list: { pergunta: string; resposta: string }[] = c.faq || []
    if (!list.length) return null
    return (
      <div className="nodri-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={14} className="text-nodri-amber" />
          <h3 className="font-syne font-bold text-[12px] text-nodri-amber uppercase tracking-wider">Perguntas Frequentes</h3>
        </div>
        <div className="space-y-2">
          {list.map((item, i) => (
            <div key={i} className="border border-nodri-border rounded-lg overflow-hidden">
              <button onClick={() => setFaqAberto(faqAberto === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-nodri-surface transition-colors">
                <span className="text-[13px] font-medium text-nodri-t1">{item.pergunta}</span>
                <span className="text-nodri-t3 text-lg">{faqAberto === i ? '−' : '+'}</span>
              </button>
              {faqAberto === i && (
                <div className="px-4 pb-4 text-[12px] text-nodri-t2 leading-relaxed border-t border-nodri-border bg-nodri-surface/50 pt-3">
                  {item.resposta}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderPdf() {
    const pdfs: { id: string; nome: string; url: string }[] = c.arquivos_pdf || []
    if (!pdfs.length) return null
    return (
      <div className="space-y-3">
        {pdfs.map(pdf => (
          <a key={pdf.id} href={pdf.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 nodri-card border border-nodri-border hover:border-nodri-red/40 transition-all group">
            <span className="text-3xl">📄</span>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-nodri-t1 group-hover:text-nodri-cyan transition-colors">{pdf.nome}</div>
              <div className="text-[10px] text-nodri-t3">Clique para abrir o PDF</div>
            </div>
            <ExternalLink size={14} className="text-nodri-t3 group-hover:text-nodri-cyan" />
          </a>
        ))}
      </div>
    )
  }

  function renderExcel() {
    const excels: { id: string; nome: string; url: string }[] = c.arquivos_excel || []
    if (!excels.length) return null
    return (
      <div className="space-y-3">
        {excels.map(ex => (
          <a key={ex.id} href={ex.url} download
            className="flex items-center gap-3 p-4 nodri-card border border-nodri-border hover:border-nodri-green/40 transition-all group">
            <span className="text-3xl">📊</span>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-nodri-t1 group-hover:text-nodri-green transition-colors">{ex.nome}</div>
              <div className="text-[10px] text-nodri-t3">Clique para baixar a planilha</div>
            </div>
            <Download size={14} className="text-nodri-t3 group-hover:text-nodri-green" />
          </a>
        ))}
      </div>
    )
  }

  function renderDownloads() {
    const list: { nome: string; url: string }[] = c.downloads || []
    if (!list.length) return null
    return (
      <div className="nodri-card p-4 space-y-2">
        <h3 className="font-syne font-bold text-[12px] text-nodri-blue uppercase tracking-wider mb-3">⬇️ Downloads</h3>
        {list.map((item, i) => (
          <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-[13px] text-nodri-cyan hover:underline py-1">
            <Download size={13} /> {item.nome}
          </a>
        ))}
      </div>
    )
  }

  const renderers: Record<SecaoTipo, () => React.ReactNode> = {
    video: renderVideo, texto: renderTexto, imagens: renderImagens,
    tabela: renderTabela, colunas: renderColunas, checklist: renderChecklist,
    faq: renderFaq, pdf: renderPdf, excel: renderExcel, downloads: renderDownloads,
  }

  return (
    <div className="min-h-screen bg-nodri-dark text-nodri-t1">
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-nodri-t2 hover:text-nodri-cyan transition-colors text-sm font-medium">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="w-px h-5 bg-nodri-border" />
        <h1 className="font-syne font-bold text-[15px] uppercase tracking-wide">{titulo}</h1>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-8 space-y-5">
        {ordem.map(tipo => {
          const render = renderers[tipo]
          if (!render) return null
          const content = render()
          if (!content) return null
          return <div key={tipo}>{content}</div>
        })}
        {!dados?.existe && !c.texto && !dados?.video_url && (
          <div className="nodri-card p-10 text-center">
            <div className="text-4xl mb-3">🎬</div>
            <p className="text-nodri-t2 text-sm">Conteúdo sendo preparado pelo administrador.</p>
          </div>
        )}
      </div>
    </div>
  )
}
