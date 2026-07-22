'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Home, Loader2, Download, ExternalLink, FileText, BarChart3, CheckCircle, HelpCircle, Construction, Video, Printer, ClipboardCheck, X } from 'lucide-react'
import { getLogoSalao } from '@/lib/logoSalao'
import { categoriaDoCargo } from '@/components/salon/PopsProfissional'
import { AVALIACOES_POP, faixaResultado, type ModeloAvaliacao } from '@/lib/popAvaliacoes'

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
            className="flex items-center gap-3 p-4 nodri-card border border-nodri-border hover:border-nodri-cyan/40 transition-all group">
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
            className="flex items-center gap-3 p-4 nodri-card border border-nodri-border hover:border-nodri-green/40 transition-all group">
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
          className="flex items-center gap-1.5 shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-nodri-border text-nodri-t2 hover:text-nodri-cyan hover:border-nodri-cyan/40 transition-all">
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
              {/* Botão Avaliar profissional — só nas páginas de categoria (manicure/cabelereiro/recepcao) */}
              {['manicure', 'cabelereiro', 'recepcao'].includes(String(slug)) && (
                <div className="mx-auto mb-3 flex justify-end" style={{ maxWidth: 840 }}>
                  <button onClick={() => setAvalDoc(dados.conteudo.docs[Math.min(docSel, dados.conteudo.docs.length - 1)])}
                    className="flex items-center gap-2 text-[13px] font-bold px-4 py-2 rounded-lg transition-all"
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
function ModalAvaliarPop({ doc, profs, onClose }: { doc: any; profs: { id: string; nome: string; cargo: string }[]; onClose: () => void }) {
  const [profId, setProfId] = useState('')
  const modelo: ModeloAvaliacao | undefined = AVALIACOES_POP[doc?.id]
  const [respostas, setRespostas] = useState<Record<string, 'sim' | 'nao'>>({})
  const [naoAplica, setNaoAplica] = useState<Record<number, boolean>>({})
  const [comp, setComp] = useState<Record<number, number>>({})
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const chave = (si: number, ii: number) => `${si}-${ii}`

  // Cálculo da nota
  const calc = useMemo(() => {
    if (!modelo) return { secoes: [] as any[], obtido: 0, possivel: 0, pct: 0 }
    let obtido = 0, possivel = 0
    const secoes = modelo.secoes.map((s, si) => {
      const aplica = !(s.condicional && naoAplica[si])
      const total = s.itens.length
      const sim = s.itens.reduce((a, _it, ii) => a + (respostas[chave(si, ii)] === 'sim' ? 1 : 0), 0)
      const nota = aplica && total ? (sim / total) * s.pontos : 0
      if (aplica) { obtido += nota; possivel += s.pontos }
      return { titulo: s.titulo, pontos: s.pontos, aplica, sim, total, nota: Math.round(nota * 10) / 10 }
    })
    const pct = possivel > 0 ? Math.round((obtido / possivel) * 100) : 0
    return { secoes, obtido: Math.round(obtido * 10) / 10, possivel, pct }
  }, [modelo, respostas, naoAplica])

  const faixa = faixaResultado(calc.pct)

  // Média comportamental (notas 1 a 5) — não entra na pontuação dos 100
  const mediaComp = useMemo(() => {
    const notas = (modelo?.comportamental || []).map((_c, i) => comp[i]).filter(n => !!n) as number[]
    if (!notas.length) return 0
    return Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10
  }, [modelo, comp])

  async function salvar() {
    if (!profId) { setMsg('Selecione um profissional.'); return }
    if (!modelo) return
    setSalvando(true); setMsg('')
    const respDetalhe: { secao: string; item: string; ok: boolean }[] = []
    modelo.secoes.forEach((s, si) => {
      if (s.condicional && naoAplica[si]) return
      s.itens.forEach((item, ii) => respDetalhe.push({ secao: s.titulo, item, ok: respostas[chave(si, ii)] === 'sim' }))
    })
    const nova = {
      id: Date.now(),
      popId: doc.id, popTitulo: doc.titulo, categoria: '',
      data: new Date().toISOString(),
      pct: calc.pct, obtido: calc.obtido, possivel: calc.possivel,
      faixa: faixa.label,
      secoes: calc.secoes.map(s => ({ titulo: s.titulo, pontos: s.pontos, nota: s.nota, sim: s.sim, total: s.total, aplica: s.aplica })),
      respostas: respDetalhe,
      comportamental: (modelo.comportamental || []).map((criterio, i) => ({ criterio, nota: comp[i] || 0 })),
      mediaComportamental: mediaComp,
    }
    try {
      const atualRes = await fetch(`/api/salon/grid?chave=avaliacao_pop_${profId}`, { credentials: 'include' })
      const atual = atualRes.ok ? await atualRes.json() : null
      const lista = Array.isArray(atual?.avaliacoes) ? atual.avaliacoes : []
      const res = await fetch('/api/salon/grid', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: `avaliacao_pop_${profId}`, doc: { avaliacoes: [...lista, nova] } }),
      })
      if (!res.ok) { setMsg('Erro ao salvar. Tente novamente.'); setSalvando(false); return }
      setMsg('✅ Avaliação salva! Veja em Perfil do profissional → POPs → Avaliação POP.')
      setTimeout(onClose, 1500)
    } catch { setMsg('Erro de conexão.'); setSalvando(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.6)' }} onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden flex flex-col" style={{ background: '#faf9f7', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#e8e6e0', background: '#fff' }}>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#5b4fcf' }}>Avaliar processo</p>
            <p className="text-sm font-bold text-[#1a1a1a] truncate">{doc.titulo}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: '#767069' }}><X size={18} /></button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          <label className="text-xs font-bold block mb-1" style={{ color: '#767069' }}>Profissional</label>
          {profs.length === 0 ? (
            <p className="text-xs mb-3 rounded-lg p-3" style={{ background: '#f59e0b15', color: '#92400e' }}>Nenhum profissional desta categoria encontrado. Verifique o cargo dos profissionais.</p>
          ) : (
            <select value={profId} onChange={e => setProfId(e.target.value)}
              className="w-full mb-4 px-3 py-2.5 rounded-xl text-sm text-[#1a1a1a] focus:outline-none" style={{ background: '#fff', border: '1.5px solid #5b4fcf40' }}>
              <option value="">— Selecione —</option>
              {profs.map(p => <option key={p.id} value={p.id}>{p.nome}{p.cargo ? ` (${p.cargo})` : ''}</option>)}
            </select>
          )}

          {!modelo ? (
            <p className="text-xs rounded-lg p-3" style={{ background: '#f59e0b15', color: '#92400e' }}>
              A avaliação deste POP ainda não foi cadastrada. Envie o modelo de avaliação (seções e itens) para este POP e ele aparece aqui.
            </p>
          ) : (
            <div className="space-y-3">
              {modelo.secoes.map((s, si) => {
                const c = calc.secoes[si]
                const desativada = s.condicional && naoAplica[si]
                return (
                  <div key={si} className="rounded-xl overflow-hidden border" style={{ borderColor: '#e8e6e0', background: '#fff', opacity: desativada ? .55 : 1 }}>
                    <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: '#f7f6fb' }}>
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold" style={{ color: '#5b4fcf' }}>{si + 1}. {s.titulo} <span style={{ color: '#767069', fontWeight: 500 }}>({s.pontos} pts)</span></p>
                        {s.nota && <p className="text-[10px]" style={{ color: '#8a8699' }}>{s.nota}</p>}
                      </div>
                      <span className="text-[12px] font-bold shrink-0" style={{ color: desativada ? '#a8a6b4' : (c.nota >= s.pontos * 0.8 ? '#059669' : c.nota >= s.pontos * 0.6 ? '#b45309' : '#b91c1c') }}>
                        {desativada ? 'N/A' : `${c.nota} / ${s.pontos}`}
                      </span>
                    </div>
                    {s.condicional && (
                      <label className="flex items-center gap-2 px-3 py-1.5 text-[11px] cursor-pointer" style={{ color: '#767069', borderBottom: '1px solid #f0eef7' }}>
                        <input type="checkbox" checked={!!naoAplica[si]} onChange={() => setNaoAplica(m => ({ ...m, [si]: !m[si] }))} className="accent-purple-600" />
                        Não se aplica nesta avaliação (não conta pontos)
                      </label>
                    )}
                    {!desativada && (
                      <div className="divide-y" style={{ borderColor: '#f2f0f7' }}>
                        {s.itens.map((item, ii) => {
                          const val = respostas[chave(si, ii)]
                          return (
                            <div key={ii} className="flex items-center justify-between gap-2 px-3 py-2">
                              <span className="text-[12.5px] flex-1" style={{ color: '#3a3835' }}>{item}</span>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => setRespostas(r => ({ ...r, [chave(si, ii)]: 'sim' }))}
                                  className="w-11 py-1 rounded-lg text-[11px] font-bold" style={{ background: val === 'sim' ? '#10b981' : '#f0f0f2', color: val === 'sim' ? '#fff' : '#767069' }}>Sim</button>
                                <button onClick={() => setRespostas(r => ({ ...r, [chave(si, ii)]: 'nao' }))}
                                  className="w-11 py-1 rounded-lg text-[11px] font-bold" style={{ background: val === 'nao' ? '#ef4444' : '#f0f0f2', color: val === 'nao' ? '#fff' : '#767069' }}>Não</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Avaliação comportamental (1 a 5) — não soma nos 100 pontos */}
              {!!modelo.comportamental?.length && (
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#e8e6e0', background: '#fff' }}>
                  <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: '#f7f6fb' }}>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold" style={{ color: '#5b4fcf' }}>Avaliação Comportamental</p>
                      <p className="text-[10px]" style={{ color: '#8a8699' }}>Nota de 1 a 5 · não entra nos 100 pontos</p>
                    </div>
                    <span className="text-[12px] font-bold shrink-0" style={{ color: mediaComp >= 4 ? '#059669' : mediaComp >= 3 ? '#b45309' : mediaComp ? '#b91c1c' : '#a8a6b4' }}>
                      Média {mediaComp || '—'}
                    </span>
                  </div>
                  <div className="divide-y" style={{ borderColor: '#f2f0f7' }}>
                    {modelo.comportamental.map((criterio, ci) => (
                      <div key={ci} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="text-[12.5px] flex-1" style={{ color: '#3a3835' }}>{criterio}</span>
                        <div className="flex gap-1 shrink-0">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button key={n} onClick={() => setComp(c => ({ ...c, [ci]: n }))}
                              className="w-7 py-1 rounded-lg text-[11px] font-bold"
                              style={{ background: comp[ci] === n ? '#5b4fcf' : '#f0f0f2', color: comp[ci] === n ? '#fff' : '#767069' }}>{n}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé: nota final + faixa + salvar */}
        {modelo && (
          <div className="px-5 py-3 border-t" style={{ borderColor: '#e8e6e0', background: '#fff' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold" style={{ color: faixa.cor }}>{calc.pct}%</span>
                <span className="text-[12px] font-bold px-2 py-1 rounded-full" style={{ background: faixa.cor + '20', color: faixa.cor }}>{faixa.emoji} {faixa.label}</span>
              </div>
              <span className="text-[11px] text-right" style={{ color: '#767069' }}>
                {calc.obtido} de {calc.possivel} pts
                {!!modelo.comportamental?.length && <><br />Comportamental: <b>{mediaComp || '—'}</b> / 5</>}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px]" style={{ color: msg.startsWith('✅') ? '#059669' : '#b91c1c' }}>{msg}</span>
              <button onClick={salvar} disabled={salvando || !profId}
                className="flex items-center gap-2 text-sm font-bold px-5 py-2 rounded-xl transition-all"
                style={{ background: '#5b4fcf', color: '#fff', opacity: (salvando || !profId) ? .5 : 1 }}>
                {salvando ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />} Salvar avaliação
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
