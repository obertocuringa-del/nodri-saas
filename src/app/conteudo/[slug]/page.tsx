'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Home, Loader2, Download, ExternalLink, FileText, BarChart3, CheckCircle, HelpCircle, Construction, Video, Printer, ClipboardCheck, X } from 'lucide-react'
import { getLogoSalao } from '@/lib/logoSalao'
import { categoriaDoCargo } from '@/components/salon/PopsProfissional'
import { AVALIACOES_POP } from '@/lib/popAvaliacoes'
import ModalAvaliarPop from '@/components/salon/ModalAvaliarPop'

// Impressão A4 elegante do conteúdo da página (POPs, guias)
async function imprimirConteudoA4(titulo: string) {
  const alvo = document.getElementById('conteudo-imprimivel')
  const corpo = alvo ? alvo.innerHTML : ''
  if (!corpo) return
  const logo = await getLogoSalao()
  const hoje = new Date().toLocaleDateString('pt-BR')
  const esc = (v: string) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const css = `
@page{size:A4 portrait;margin:18mm 16mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#33313f;font-size:12px;line-height:1.65;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hd{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #5b4fcf;padding-bottom:10px;margin-bottom:18px}
.hd .logo{max-height:54px;max-width:190px;object-fit:contain}
.hd .brand{font-size:22px;font-weight:900;color:#5b4fcf;letter-spacing:1px}
.hd .dt{font-size:10px;color:#8480a0;text-align:right}
.ft{margin-top:22px;border-top:1px solid #ececf2;padding-top:8px;text-align:center;font-size:9px;color:#a8a6b4}
h1{font-size:20px;color:#2a2350;margin:0 0 4px;font-weight:800}
h2{font-size:14.5px;color:#5b4fcf;margin:22px 0 8px;padding-bottom:6px;border-bottom:1.5px solid #efedf6;font-weight:700;break-after:avoid}
h3{font-size:11px;color:#8480a0;margin:12px 0 4px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;break-after:avoid}
p{margin:6px 0}
ul,ol{margin:6px 0 6px 22px}
li{margin:3px 0;break-inside:avoid}
blockquote{border-left:3px solid #5b4fcf;background:#f7f6fb;padding:9px 15px;margin:10px 0;font-style:italic;color:#4a4760;border-radius:0 8px 8px 0;break-inside:avoid}
strong{color:#2a2350}
h2,h3,blockquote{break-inside:avoid}
h2{break-before:auto}`
  const cab = logo ? `<img src="${logo}" class="logo"/>` : `<div class="brand">NODRI</div>`
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(titulo)}</title><style>${css}</style></head><body>`
    + `<div class="hd">${cab}<div class="dt"><strong>${esc(titulo)}</strong><br>${hoje}</div></div>`
    + `${corpo}`
    + `<div class="ft">Documento gerado em ${hoje}${logo ? '' : ' pelo Sistema NODRI'}</div>`
    + `<script>window.onload=function(){window.print()}</script></body></html>`
  const w = window.open('', '_blank', 'width=1000,height=760'); if (!w) return
  w.document.write(html); w.document.close(); w.focus()
}

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
            className="flex items-center gap-3 p-4 nodri-card border border-nodri-border hover:border-nodri-cyan/40 transition group">
            <FileText size={30} className="text-nodri-t2 shrink-0" />
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
            className="flex items-center gap-3 p-4 nodri-card border border-nodri-border hover:border-nodri-green/40 transition group">
            <BarChart3 size={30} className="text-nodri-green shrink-0" />
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
          <h3 className="font-syne font-bold text-[12px] text-nodri-cyan mb-3 uppercase tracking-wider flex items-center gap-1.5"><CheckCircle size={13} /> Checklist</h3>
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
          <h3 className="font-syne font-bold text-[12px] text-nodri-cyan mb-3 uppercase tracking-wider flex items-center gap-1.5"><HelpCircle size={13} /> Perguntas Frequentes</h3>
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
  // Páginas com vários documentos (ex.: Recepção) — qual está aberto
  const [docSel, setDocSel] = useState(0)
  // Avaliação de POP: profissionais da categoria + modal
  const [profs, setProfs] = useState<{ id: string; nome: string; cargo: string }[]>([])
  const [avalDoc, setAvalDoc] = useState<any | null>(null)

  useEffect(() => {
    fetch(`/api/conteudo/${slug}`)
      .then(r => r.json())
      .then(d => { setDados(d); setLoading(false) })
  }, [slug])

  // Carrega profissionais e filtra pela categoria da página (slug)
  useEffect(() => {
    const cat = ['manicure', 'cabelereiro', 'recepcao'].includes(String(slug)) ? String(slug) : null
    if (!cat) return
    fetch('/api/profissionais?ativo=true&leve=1', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((lista: any) => {
        if (!Array.isArray(lista)) return
        setProfs(lista
          .filter((p: any) => !p.is_departamento && categoriaDoCargo(p.cargo) === cat)
          .map((p: any) => ({ id: String(p.id), nome: (p.apelido || p.nome_completo || '').trim(), cargo: p.cargo || '' }))
          .filter((p: any) => p.nome))
      })
      .catch(() => {})
  }, [slug])

  if (loading) return (
    <div className="min-h-screen bg-nodri-dark flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-nodri-cyan" />
    </div>
  )

  if (dados?.conteudo?.oculto) return (
    <div className="min-h-screen bg-nodri-dark flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-4"><Construction size={48} className="text-nodri-amber" /></div>
        <h2 className="font-syne font-bold text-lg mb-2">Página em construção</h2>
        <p className="text-nodri-t3 text-sm">Este conteúdo está sendo preparado.</p>
        <button onClick={() => router.back()} className="mt-4 text-nodri-cyan text-sm hover:underline">← Voltar</button>
      </div>
    </div>
  )

  const titulo = dados?.titulo || String(slug).replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
  const blocos: any[] = dados?.conteudo?.blocos || []
  const docsPagina: any[] = Array.isArray(dados?.conteudo?.docs) ? dados.conteudo.docs : []
  const tituloImpressao = docsPagina.length ? (docsPagina[Math.min(docSel, docsPagina.length - 1)]?.titulo || titulo) : titulo
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
        <div className="flex-1" />
        <button onClick={() => imprimirConteudoA4(tituloImpressao)}
          className="flex items-center gap-1.5 shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-nodri-border text-nodri-t2 hover:text-nodri-cyan hover:border-nodri-cyan/40 transition">
          <Printer size={14} /> Imprimir
        </button>
      </div>

      <style>{`
        .pop-doc{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#33313f;font-size:14.5px;line-height:1.7}
        .pop-doc>*:first-child{margin-top:0}
        .pop-doc h1{font-size:24px;color:#2a2350;font-weight:800;margin:0 0 4px}
        .pop-doc h2{font-size:16.5px;color:#5b4fcf;font-weight:700;margin:30px 0 10px;padding-bottom:7px;border-bottom:2px solid #efedf6}
        .pop-doc h3{font-size:12.5px;color:#8480a0;font-weight:700;margin:16px 0 6px;text-transform:uppercase;letter-spacing:.6px}
        .pop-doc p{margin:8px 0}
        .pop-doc ul,.pop-doc ol{margin:8px 0;padding-left:24px}
        .pop-doc ul{list-style:disc}.pop-doc ol{list-style:decimal}
        .pop-doc li{margin:4px 0}
        .pop-doc blockquote{border-left:3px solid #5b4fcf;background:#f7f6fb;padding:10px 16px;margin:12px 0;border-radius:0 10px 10px 0;font-style:italic;color:#4a4760}
        .pop-doc strong{color:#2a2350;font-weight:700}
      `}</style>

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
          <div id="conteudo-imprimivel" className="flex flex-wrap gap-4">
            {blocos.map((bloco: any) => (
              <RenderBloco key={bloco.id} bloco={bloco} />
            ))}
          </div>
        ) : Array.isArray(dados?.conteudo?.docs) && dados.conteudo.docs.length > 0 ? (
          /* Vários documentos (POPs) com sidebar de navegação */
          <div className="flex gap-6 items-start flex-col lg:flex-row">
            <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-20">
              <div className="nodri-card overflow-hidden">
                <p className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-nodri-t3 border-b border-nodri-border">
                  Processos deste setor
                </p>
                {dados.conteudo.docs.map((doc: any, i: number) => (
                  <button key={doc.id || i}
                    onClick={() => { setDocSel(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className={`w-full text-left px-4 py-3 text-[13px] border-b border-nodri-border last:border-b-0 transition-colors ${
                      docSel === i ? 'bg-nodri-surface text-nodri-cyan font-bold' : 'text-nodri-t2 hover:text-nodri-cyan hover:bg-nodri-surface/50'
                    }`}>
                    <span className="flex items-center gap-2">
                      <FileText size={14} className="shrink-0" />
                      {doc.titulo}
                    </span>
                  </button>
                ))}
              </div>
            </aside>
            <div className="flex-1 min-w-0 w-full">
              {/* Botão Avaliar profissional — só nas páginas de categoria (manicure/cabelereiro/recepcao)
                  e só para POPs que têm modelo de avaliação cadastrado (POPs informativos não avaliam). */}
              {['manicure', 'cabelereiro', 'recepcao'].includes(String(slug))
                && !!AVALIACOES_POP[dados.conteudo.docs[Math.min(docSel, dados.conteudo.docs.length - 1)]?.id] && (
                <div className="mx-auto mb-3 flex justify-end" style={{ maxWidth: 840 }}>
                  <button onClick={() => setAvalDoc(dados.conteudo.docs[Math.min(docSel, dados.conteudo.docs.length - 1)])}
                    className="flex items-center gap-2 text-[13px] font-bold px-4 py-2 rounded-lg transition"
                    style={{ background: '#5b4fcf', color: '#fff' }}>
                    <ClipboardCheck size={15} /> Avaliar profissional
                  </button>
                </div>
              )}
              <div className="mx-auto" style={{ maxWidth: 840, background: '#ffffff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,.28)' }}>
                <div style={{ height: 6, background: 'linear-gradient(90deg,#5b4fcf,#7c6fe0)' }} />
                <div id="conteudo-imprimivel" className="pop-doc" style={{ padding: '40px 48px' }}
                  dangerouslySetInnerHTML={{ __html: dados.conteudo.docs[Math.min(docSel, dados.conteudo.docs.length - 1)]?.texto || '' }} />
              </div>
            </div>
          </div>
        ) : dados?.conteudo?.texto ? (
          /* Documento (POP / guia) — folha branca limpa e legível */
          <div className="mx-auto" style={{ maxWidth: 840, background: '#ffffff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,.28)' }}>
            <div style={{ height: 6, background: 'linear-gradient(90deg,#5b4fcf,#7c6fe0)' }} />
            <div id="conteudo-imprimivel" className="pop-doc" style={{ padding: '40px 48px' }}
              dangerouslySetInnerHTML={{ __html: dados.conteudo.texto }} />
          </div>
        ) : (
          !embedUrl && (
            <div className="nodri-card p-10 text-center">
              <div className="flex justify-center mb-3"><Video size={36} className="text-nodri-t3" /></div>
              <p className="text-nodri-t2 text-sm">Conteúdo sendo preparado pelo administrador.</p>
            </div>
          )
        )}
      </div>

      {avalDoc && (
        <ModalAvaliarPop doc={avalDoc} profs={profs} onClose={() => setAvalDoc(null)} />
      )}
    </div>
  )
}

// ─── Modal: avaliação PONTUADA do profissional (seções com peso, Sim/Não) ────
