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
const ORDEM_PADRAO: SecaoTipo[] = ['video','texto','imagens','tabela','colunas','checklist','faq','pdf','excel','downloads']

export default function ConteudoPage() {
  const { slug } = useParams()
  const router = useRouter()
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checks, setChecks] = useState<boolean[]>([])
  const [faqAberto, setFaqAberto] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/conteudo/${slug}`).then(r => r.json()).then(d => { setDados(d); setLoading(false) })
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
        <h2 className="font-syne font-bold text-lg mb-2">Em construção</h2>
        <button onClick={() => router.back()} className="mt-4 text-nodri-cyan text-sm hover:underline">← Voltar</button>
      </div>
    </div>
  )

  const titulo = dados?.titulo || String(slug).replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
  const c = dados?.conteudo || {}
  const ordem: SecaoTipo[] = c.ordem_secoes || ORDEM_PADRAO

  const renderVideo = () => {
    const e = getYoutubeEmbed(dados?.video_url || '')
    if (!e) return null
    return (
      <div className="nodri-card overflow-hidden">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe src={e} allowFullScreen className="absolute inset-0 w-full h-full" style={{ border: 'none' }} />
        </div>
      </div>
    )
  }

  const renderTexto = () => {
    if (!c.texto) return null
    return (
      <div className="nodri-card p-6">
        <div className="text-nodri-t1 text-sm leading-relaxed [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
          dangerouslySetInnerHTML={{ __html: c.texto }} />
      </div>
    )
  }

  const renderImagens = () => {
    const imgs: any[] = c.imagens || []
    if (!imgs.length) return null
    return (
      <div className="space-y-4">
        {imgs.map((img: any) => (
          <div key={img.id} className="nodri-card p-3 flex justify-center">
            <img src={img.url} alt="Imagem" className="rounded-lg object-contain" style={{ width: img.largura || '100%', maxHeight: 500 }} />
          </div>
        ))}
      </div>
    )
  }

  const renderTabela = () => {
    if (!c.tabela?.data?.length) return null
    return (
      <div className="nodri-card p-4 overflow-x-auto">
        <table className="border-collapse w-full text-sm">
          <tbody>
            {c.tabela.data.map((row: string[], li: number) => (
              <tr key={li} className={li === 0 ? 'bg-nodri-surface' : ''}>
                {row.map((cell: string, ci: number) => (
                  <td key={ci} className={`border border-nodri-border px-3 py-2 ${li === 0 ? 'font-bold text-nodri-cyan' : 'text-nodri-t1'}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderColunas = () => {
    const cols: any[] = c.colunas || []
    if (!cols.length) return null
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
        {cols.map((col: any) => (
          <div key={col.id} className="nodri-card p-4 text-sm text-nodri-t1 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: col.conteudo }} />
        ))}
      </div>
    )
  }

  const renderChecklist = () => {
    const list: string[] = c.checklist || []
    if (!list.length) return null
    return (
      <div className="nodri-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare size={14} className="text-nodri-green" />
          <span className="font-bold text-xs text-nodri-green uppercase">Checklist</span>
        </div>
        <div className="space-y-2">
          {list.map((item: string, i: number) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={checks[i] || false}
                onChange={() => { const a = [...checks]; a[i] = !a[i]; setChecks(a) }}
                className="w-4 h-4 accent-nodri-cyan" />
              <span className={`text-sm ${checks[i] ? 'line-through text-nodri-t3' : 'text-nodri-t1'}`}>{item}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  const renderFaq = () => {
    const list: any[] = c.faq || []
    if (!list.length) return null
    return (
      <div className="nodri-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={14} className="text-nodri-amber" />
          <span className="font-bold text-xs text-nodri-amber uppercase">Perguntas Frequentes</span>
        </div>
        <div className="space-y-2">
          {list.map((item: any, i: number) => (
            <div key={i} className="border border-nodri-border rounded-lg overflow-hidden">
              <button onClick={() => setFaqAberto(faqAberto === i ? null : i)}
                className="w-full flex justify-between px-4 py-3 text-left hover:bg-nodri-surface transition-colors">
                <span className="text-sm font-medium text-nodri-t1">{item.pergunta}</span>
                <span className="text-nodri-t3">{faqAberto === i ? '−' : '+'}</span>
              </button>
              {faqAberto === i && (
                <div className="px-4 pb-4 pt-3 text-xs text-nodri-t2 border-t border-nodri-border bg-nodri-surface/50">{item.resposta}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderPdf = () => {
    const pdfs: any[] = c.arquivos_pdf || []
    if (!pdfs.length) return null
    return (
      <div className="space-y-3">
        {pdfs.map((pdf: any) => (
          <a key={pdf.id} href={pdf.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 nodri-card border border-nodri-border hover:border-nodri-red/40 transition-all group">
            <span className="text-3xl">📄</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-nodri-t1">{pdf.nome}</div>
              <div className="text-xs text-nodri-t3">Clique para abrir o PDF</div>
            </div>
            <ExternalLink size={14} className="text-nodri-t3" />
          </a>
        ))}
      </div>
    )
  }

  const renderExcel = () => {
    const excels: any[] = c.arquivos_excel || []
    if (!excels.length) return null
    return (
      <div className="space-y-3">
        {excels.map((ex: any) => (
          <a key={ex.id} href={ex.url} download
            className="flex items-center gap-3 p-4 nodri-card border border-nodri-border hover:border-nodri-green/40 transition-all group">
            <span className="text-3xl">📊</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-nodri-t1">{ex.nome}</div>
              <div className="text-xs text-nodri-t3">Baixar planilha</div>
            </div>
            <Download size={14} className="text-nodri-t3" />
          </a>
        ))}
      </div>
    )
  }

  const renderDownloads = () => {
    const list: any[] = c.downloads || []
    if (!list.length) return null
    return (
      <div className="nodri-card p-4">
        <h3 className="font-bold text-xs text-nodri-blue uppercase mb-3">⬇️ Downloads</h3>
        {list.map((item: any, i: number) => (
          <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-nodri-cyan hover:underline py-1">
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
        <button onClick={() => router.back()} className="flex items-center gap-2 text-nodri-t2 hover:text-nodri-cyan transition-colors text-sm">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="w-px h-5 bg-nodri-border" />
        <h1 className="font-syne font-bold text-[15px] uppercase tracking-wide">{titulo}</h1>
      </div>
      <div className="max-w-4xl mx-auto px-5 py-8 space-y-5">
        {ordem.map((tipo: SecaoTipo) => {
          const content = renderers[tipo]?.()
          if (!content) return null
          return <div key={tipo}>{content}</div>
        })}
        {!dados?.existe && !c.texto && !dados?.video_url && (
          <div className="nodri-card p-10 text-center">
            <div className="text-4xl mb-3">🎬</div>
            <p className="text-nodri-t2 text-sm">Conteúdo sendo preparado.</p>
          </div>
        )}
      </div>
    </div>
  )
}
