'use client'
import { useState, useRef, useEffect } from 'react'
import {
  Plus, Save, Trash2, Loader2, Youtube, FileText, CheckSquare, HelpCircle,
  Download, ChevronDown, ChevronUp, Eye, EyeOff, Edit3, FolderPlus, X,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Upload,
  GripVertical,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ─── Tipos ─── */
type SecaoTipo = 'video' | 'texto' | 'imagens' | 'tabela' | 'colunas' | 'checklist' | 'faq' | 'pdf' | 'excel' | 'downloads'

interface SubItem { titulo: string; slug: string; oculto?: boolean }
interface MenuCategoria { categoria: string; itens: SubItem[]; oculto?: boolean }

interface ConteudoSubmenu {
  texto?: string
  checklist?: string[]
  faq?: { pergunta: string; resposta: string }[]
  downloads?: { nome: string; url: string }[]
  imagens?: { id: string; url: string; largura: string }[]
  tabela?: { linhas: number; cols: number; data: string[][] } | null
  colunas?: { id: string; conteudo: string }[] | null
  arquivos_pdf?: { id: string; nome: string; url: string }[]
  arquivos_excel?: { id: string; nome: string; url: string }[]
  ordem_secoes?: SecaoTipo[]
  oculto?: boolean
}

interface Submenu {
  slug: string
  titulo: string
  video_url: string
  conteudo: ConteudoSubmenu
  oculto?: boolean
}

/* ─── Constantes ─── */
const SECOES_INFO: Record<SecaoTipo, { label: string; emoji: string }> = {
  video:     { label: 'Vídeo YouTube',    emoji: '▶️' },
  texto:     { label: 'Texto Rico',       emoji: '📝' },
  imagens:   { label: 'Imagens',          emoji: '🖼️' },
  tabela:    { label: 'Tabela',           emoji: '⊞' },
  colunas:   { label: 'Colunas',          emoji: '⫸' },
  checklist: { label: 'Checklist',        emoji: '✅' },
  faq:       { label: 'FAQ',              emoji: '❓' },
  pdf:       { label: 'PDF',              emoji: '📄' },
  excel:     { label: 'Excel / Planilha', emoji: '📊' },
  downloads: { label: 'Downloads',        emoji: '⬇️' },
}

const ORDEM_PADRAO: SecaoTipo[] = ['video', 'texto', 'imagens', 'tabela', 'colunas', 'checklist', 'faq', 'pdf', 'excel', 'downloads']

const FONTES = ['Inter', 'Arial', 'Georgia', 'Verdana', 'Courier New', 'Times New Roman']

function uid() { return Math.random().toString(36).slice(2, 9) }

function gerarSlug(titulo: string) {
  return titulo.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
}

const MENUS_INICIAIS: MenuCategoria[] = [
  { categoria: 'Manual do Usuário', itens: [
    { titulo: 'Confirmar Agendamento', slug: 'confirmar-agendamento' },
    { titulo: 'Bloqueio Sem Preferencia', slug: 'bloqueio-sem-preferencia' },
    { titulo: 'Enviar Feedback', slug: 'enviar-feedback' },
    { titulo: 'Ver Feedback Cliente', slug: 'ver-feedback-cliente' },
    { titulo: 'Enviar Lista', slug: 'enviar-lista' },
    { titulo: 'Enviar Lista C Arquivo', slug: 'enviar-lista-c-arquivo' },
    { titulo: 'Relatorio Profissional', slug: 'relatorio-profissional' },
    { titulo: 'Faturamento Diario', slug: 'faturamento-diario' },
    { titulo: 'Baixar Musica YouTube', slug: 'baixar-musica-youtube' },
    { titulo: 'Calcular Reserva Financeira', slug: 'calcular-reserva-financeira' },
    { titulo: 'Calcular Depreciacao', slug: 'calcular-depreciacao' },
    { titulo: 'Avaliar Profissional', slug: 'avaliar-profissional' },
    { titulo: 'Aluguel de Cadeira', slug: 'aluguel-de-cadeira' },
    { titulo: 'Precificar Servicos', slug: 'precificar-servicos' },
    { titulo: 'Solucao de Problemas', slug: 'solucao-de-problemas' },
    { titulo: 'Suporte Tecnico', slug: 'suporte-tecnico' },
  ]},
  { categoria: 'Dicas Nodri', itens: [
    { titulo: 'Planejar a Meta', slug: 'planejar-a-meta' },
    { titulo: 'Acoes Comerciais', slug: 'acoes-comerciais' },
    { titulo: 'Como Vender Mais', slug: 'como-vender-mais' },
    { titulo: 'Aniversarios Clientes', slug: 'aniversarios-clientes' },
    { titulo: 'Acoes Sazonais', slug: 'acoes-sazonais' },
    { titulo: 'Scripts Personalizadas', slug: 'scripts-personalizadas' },
    { titulo: 'Listas Promocionais', slug: 'listas-promocionais' },
  ]},
  { categoria: 'Gestão de Pessoas', itens: [
    { titulo: 'Manual Integracao Profissional', slug: 'manual-integracao-profissional' },
    { titulo: 'Processo Atendimento Profissionais', slug: 'processo-atendimento-profissionais' },
    { titulo: 'Processo Atendimento Recepcao', slug: 'processo-atendimento-recepcao' },
    { titulo: 'Descricao de Cargos', slug: 'descricao-cargos' },
    { titulo: 'Avaliacao 360 Profissionais', slug: 'avaliacao-360-profissionais' },
    { titulo: 'Metas Individuais', slug: 'metas-individuais' },
    { titulo: 'Guia para Entrevista', slug: 'guia-entrevista' },
    { titulo: 'Atrasos Profissionais', slug: 'atrasos-profissionais' },
  ]},
  { categoria: 'Gestão Financeira', itens: [
    { titulo: 'Comissao Ideal', slug: 'comissao-ideal' },
    { titulo: 'Reforma Tributaria', slug: 'reforma-tributaria' },
    { titulo: 'Capital de Giro e Reserva', slug: 'capital-giro-reserva' },
    { titulo: 'Calcular Reserva Financeira', slug: 'calcular-reserva-financeira-2' },
    { titulo: 'Calculadora Depreciacao', slug: 'calculadora-depreciacao' },
    { titulo: 'Aluguel de Cadeira', slug: 'aluguel-de-cadeira-2' },
    { titulo: 'Precificar Servicos', slug: 'precificar-servicos-2' },
    { titulo: 'Ponto de Equilibrio', slug: 'ponto-de-equilibrio' },
  ]},
  { categoria: 'Marketing', itens: [
    { titulo: '4 Pilares do Marketing', slug: '4-pilares-marketing' },
    { titulo: 'Planejar a Meta', slug: 'planejar-a-meta-2' },
    { titulo: 'Acoes Comerciais', slug: 'acoes-comerciais-2' },
    { titulo: 'Acoes Sazonais', slug: 'acoes-sazonais-2' },
    { titulo: 'Scripts Personalizadas', slug: 'scripts-personalizadas-2' },
  ]},
]

/* ══════════════════════════════════════════════════════ */
export default function EditorSubmenus() {
  const [menus, setMenus] = useState<MenuCategoria[]>(MENUS_INICIAIS)
  const [categoriaAtiva, setCategoriaAtiva] = useState(MENUS_INICIAIS[0].categoria)

  useEffect(() => {
    fetch('/api/menu-estrutura')
      .then(r => r.json())
      .then((d: MenuCategoria[] | null) => {
        if (d && Array.isArray(d) && d.length > 0) {
          setMenus(d)
          setCategoriaAtiva(d[0].categoria)
        }
      })
      .catch(() => {})
  }, [])
  const [slugAtivo, setSlugAtivo] = useState<string | null>(null)
  const [dados, setDados] = useState<Submenu | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)

  // Modais
  const [showNovoItem, setShowNovoItem] = useState(false)
  const [showNovaCategoria, setShowNovaCategoria] = useState(false)
  const [novoItem, setNovoItem] = useState({ titulo: '', slug: '' })
  const [novaCategoria, setNovaCategoria] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Edição inline de nomes
  const [editandoCategoria, setEditandoCategoria] = useState<string | null>(null)
  const [nomeCategoria, setNomeCategoria] = useState('')
  const [editandoItem, setEditandoItem] = useState<string | null>(null) // slug
  const [nomePagina, setNomePagina] = useState('')

  // Seções
  const [secoesColapsadas, setSecoesColapsadas] = useState(() => {
    const s = new Set<SecaoTipo>()
    s.add('pdf'); s.add('excel'); s.add('downloads')
    return s
  })
  const dragSecaoId = useRef<SecaoTipo | null>(null)
  const dragSecaoOver = useRef<SecaoTipo | null>(null)
  const [dragHighlight, setDragHighlight] = useState<SecaoTipo | null>(null)

  /* ── Persistência da estrutura do menu ── */
  async function saveEstrutura(novosMenus: MenuCategoria[]) {
    try {
      await fetch('/api/menu-estrutura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novosMenus),
      })
    } catch {}
  }

  /* ── Helpers globais ── */
  function getOrdem(): SecaoTipo[] { return dados?.conteudo?.ordem_secoes || ORDEM_PADRAO }

  // Helper: atualiza campos do conteudo sem depender de `dados` no closure (evita erro TS em async)
  function updC(updates: Partial<ConteudoSubmenu>) {
    setDados(prev => prev ? { ...prev, conteudo: { ...prev.conteudo, ...updates } } : null)
  }

  function reordenarSecao() {
    if (!dragSecaoId.current || !dragSecaoOver.current || dragSecaoId.current === dragSecaoOver.current) {
      dragSecaoId.current = null; dragSecaoOver.current = null; setDragHighlight(null); return
    }
    const ordem = [...getOrdem()]
    const fi = ordem.indexOf(dragSecaoId.current)
    const ti = ordem.indexOf(dragSecaoOver.current)
    const [item] = ordem.splice(fi, 1)
    ordem.splice(ti, 0, item)
    setDados(prev => prev ? { ...prev, conteudo: { ...prev.conteudo, ordem_secoes: ordem } } : null)
    dragSecaoId.current = null; dragSecaoOver.current = null; setDragHighlight(null)
  }

  function toggleColapso(tipo: SecaoTipo) {
    setSecoesColapsadas(prev => { const n = new Set(prev); n.has(tipo) ? n.delete(tipo) : n.add(tipo); return n })
  }

  /* ── Upload ── */
  async function handleUpload(key: string, file: File): Promise<string | null> {
    setUploadingKey(key)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('bucket', 'paginas')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) { setUploadingKey(null); return data.url }
      toast.error(data.error || 'Erro no upload')
    } catch { toast.error('Erro no upload') }
    setUploadingKey(null)
    return null
  }

  /* ── execCommand helper ── */
  function execCmd(cmd: string, val?: string) { document.execCommand(cmd, false, val) }

  /* ── API calls ── */
  async function abrirEditor(slug: string, titulo: string) {
    setSlugAtivo(slug); setLoading(true)
    const res = await fetch(`/api/conteudo/${slug}`)
    const data = await res.json()
    setDados({
      slug, titulo: data.titulo || titulo,
      video_url: data.video_url || '',
      conteudo: {
        texto: '', checklist: [], faq: [], downloads: [],
        imagens: [], tabela: null, colunas: null,
        arquivos_pdf: [], arquivos_excel: [],
        ...data.conteudo,
      },
      oculto: data.conteudo?.oculto || false,
    })
    setLoading(false)
  }

  async function salvar() {
    if (!dados || !slugAtivo) return
    setSaving(true)
    const res = await fetch(`/api/conteudo/${slugAtivo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: dados.titulo,
        video_url: dados.video_url,
        conteudo: { ...dados.conteudo, oculto: dados.oculto },
      }),
    })
    setSaving(false)
    if (res.ok) toast.success('✅ Salvo com sucesso!')
    else toast.error('Erro ao salvar')
  }

  async function excluirPagina(slug: string) {
    await fetch(`/api/conteudo/${slug}`, { method: 'DELETE' })
    const novosMenus = menus.map(m => ({ ...m, itens: m.itens.filter(i => i.slug !== slug) }))
    setMenus(novosMenus)
    saveEstrutura(novosMenus)
    if (slugAtivo === slug) { setSlugAtivo(null); setDados(null) }
    setConfirmDelete(null)
    toast.success('Página excluída!')
  }

  async function toggleOculto() {
    if (!dados) return
    const novoOculto = !dados.oculto
    setDados(prev => prev ? { ...prev, oculto: novoOculto } : null)
    await fetch(`/api/conteudo/${dados.slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: dados.titulo, video_url: dados.video_url, conteudo: { ...dados.conteudo, oculto: novoOculto } }),
    })
    toast.success(novoOculto ? '🙈 Página ocultada' : '👁 Página visível')
  }

  function adicionarItem() {
    if (!novoItem.titulo) { toast.error('Digite o título'); return }
    const slug = novoItem.slug || gerarSlug(novoItem.titulo)
    const novosMenus = menus.map(m => m.categoria === categoriaAtiva ? { ...m, itens: [...m.itens, { titulo: novoItem.titulo, slug }] } : m)
    setMenus(novosMenus)
    saveEstrutura(novosMenus)
    setNovoItem({ titulo: '', slug: '' }); setShowNovoItem(false)
    toast.success(`Página "${novoItem.titulo}" criada!`)
  }

  function adicionarCategoria() {
    if (!novaCategoria.trim()) { toast.error('Digite o nome'); return }
    if (menus.find(m => m.categoria === novaCategoria)) { toast.error('Já existe'); return }
    const novosMenus = [...menus, { categoria: novaCategoria, itens: [] }]
    setMenus(novosMenus)
    saveEstrutura(novosMenus)
    setCategoriaAtiva(novaCategoria); setNovaCategoria(''); setShowNovaCategoria(false)
    toast.success(`Categoria "${novaCategoria}" criada!`)
  }

  function excluirCategoria(cat: string) {
    if (!confirm(`Excluir a categoria "${cat}" e todas as suas páginas?`)) return
    const novosMenus = menus.filter(m => m.categoria !== cat)
    setMenus(novosMenus)
    saveEstrutura(novosMenus)
    if (categoriaAtiva === cat) setCategoriaAtiva(menus[0]?.categoria || '')
    toast.success('Categoria excluída!')
  }

  function salvarNomeCategoria(catAntiga: string) {
    if (!nomeCategoria.trim()) { setEditandoCategoria(null); return }
    const novosMenus = menus.map(m => m.categoria === catAntiga ? { ...m, categoria: nomeCategoria.trim() } : m)
    setMenus(novosMenus)
    saveEstrutura(novosMenus)
    if (categoriaAtiva === catAntiga) setCategoriaAtiva(nomeCategoria.trim())
    setEditandoCategoria(null)
    toast.success('Categoria renomeada!')
  }

  function salvarNomePagina(slug: string) {
    if (!nomePagina.trim()) { setEditandoItem(null); return }
    const novosMenus = menus.map(m => ({ ...m, itens: m.itens.map(i => i.slug === slug ? { ...i, titulo: nomePagina.trim() } : i) }))
    setMenus(novosMenus)
    saveEstrutura(novosMenus)
    if (dados?.slug === slug) setDados(prev => prev ? { ...prev, titulo: nomePagina.trim() } : null)
    setEditandoItem(null)
    toast.success('Página renomeada!')
  }

  /* ── Seção: VÍDEO ── */
  function renderVideo() {
    if (!dados) return null
    const m = dados.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
    return (
      <div className="space-y-3">
        <input value={dados.video_url} onChange={e => setDados(prev => prev ? { ...prev, video_url: e.target.value } : null)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[12px] font-mono outline-none focus:border-nodri-cyan transition-colors" />
        {m ? (
          <div className="rounded-lg overflow-hidden relative" style={{ paddingBottom: '40%' }}>
            <iframe src={`https://www.youtube.com/embed/${m[1]}`}
              className="absolute inset-0 w-full h-full rounded-lg" style={{ border: 'none' }} allowFullScreen />
          </div>
        ) : dados.video_url ? (
          <p className="text-nodri-red text-[11px]">⚠️ Link inválido do YouTube</p>
        ) : null}
      </div>
    )
  }

  /* ── Seção: TEXTO RICO ── */
  function renderTexto() {
    if (!dados) return null
    return (
      <div className="space-y-2">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 bg-nodri-surface border border-nodri-border rounded-lg">
          <button onMouseDown={e => { e.preventDefault(); execCmd('bold') }} title="Negrito"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-nodri-card text-nodri-t2 hover:text-nodri-cyan transition-colors"><Bold size={12} /></button>
          <button onMouseDown={e => { e.preventDefault(); execCmd('italic') }} title="Itálico"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-nodri-card text-nodri-t2 hover:text-nodri-cyan transition-colors"><Italic size={12} /></button>
          <button onMouseDown={e => { e.preventDefault(); execCmd('underline') }} title="Sublinhado"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-nodri-card text-nodri-t2 hover:text-nodri-cyan transition-colors"><Underline size={12} /></button>
          <div className="w-px h-5 bg-nodri-border mx-0.5" />
          <button onMouseDown={e => { e.preventDefault(); execCmd('justifyLeft') }} title="Esquerda"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-nodri-card text-nodri-t2 hover:text-nodri-cyan transition-colors"><AlignLeft size={12} /></button>
          <button onMouseDown={e => { e.preventDefault(); execCmd('justifyCenter') }} title="Centro"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-nodri-card text-nodri-t2 hover:text-nodri-cyan transition-colors"><AlignCenter size={12} /></button>
          <button onMouseDown={e => { e.preventDefault(); execCmd('justifyRight') }} title="Direita"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-nodri-card text-nodri-t2 hover:text-nodri-cyan transition-colors"><AlignRight size={12} /></button>
          <div className="w-px h-5 bg-nodri-border mx-0.5" />
          <button onMouseDown={e => { e.preventDefault(); execCmd('insertUnorderedList') }} title="Lista"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-nodri-card text-nodri-t2 hover:text-nodri-cyan transition-colors text-[11px] font-bold">• —</button>
          <div className="w-px h-5 bg-nodri-border mx-0.5" />
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-nodri-t3">Texto:</span>
            <input type="color" defaultValue="#e2e8f0"
              onChange={e => execCmd('foreColor', e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-nodri-border" title="Cor do texto" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-nodri-t3">Fundo:</span>
            <input type="color" defaultValue="#0f172a"
              onChange={e => execCmd('hiliteColor', e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-nodri-border" title="Cor de fundo" />
          </div>
          <div className="w-px h-5 bg-nodri-border mx-0.5" />
          <select onChange={e => execCmd('fontName', e.target.value)}
            className="text-[10px] bg-nodri-card border border-nodri-border rounded px-1.5 py-0.5 text-nodri-t2 outline-none h-7">
            {FONTES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select onChange={e => execCmd('fontSize', e.target.value)}
            className="text-[10px] bg-nodri-card border border-nodri-border rounded px-1.5 py-0.5 text-nodri-t2 outline-none h-7">
            <option value="1">Tiny</option>
            <option value="2">Pequeno</option>
            <option value="3">Normal</option>
            <option value="4">Médio</option>
            <option value="5">Grande</option>
            <option value="6">Maior</option>
            <option value="7">Enorme</option>
          </select>
        </div>
        {/* Editor */}
        <div
          contentEditable suppressContentEditableWarning
          onBlur={e => updC({ texto: e.currentTarget.innerHTML })}
          dangerouslySetInnerHTML={{ __html: dados.conteudo.texto || '' }}
          className="min-h-[140px] max-h-[400px] overflow-y-auto bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2.5 text-[13px] text-nodri-t1 outline-none focus:border-nodri-cyan transition-colors leading-relaxed"
          style={{ whiteSpace: 'pre-wrap' }}
        />
        <p className="text-[10px] text-nodri-t3">💡 Selecione o texto e use a barra acima para formatar</p>
      </div>
    )
  }

  /* ── Seção: IMAGENS ── */
  function renderImagens() {
    if (!dados) return null
    const imagens = dados.conteudo.imagens || []

    async function addImagem(file: File) {
      const url = await handleUpload('imagem', file)
      if (!url) return
      const novas = [...imagens, { id: uid(), url, largura: '100%' }]
      updC({ imagens: novas })
      toast.success('Imagem adicionada!')
    }

    function removeImagem(id: string) {
      updC({ imagens: imagens.filter(i => i.id !== id) })
    }

    function updateLargura(id: string, largura: string) {
      updC({ imagens: imagens.map(i => i.id === id ? { ...i, largura } : i) })
    }

    return (
      <div className="space-y-3">
        {/* Upload zone */}
        <label className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploadingKey === 'imagem' ? 'border-nodri-cyan/50 bg-nodri-cyan/5' : 'border-nodri-border hover:border-nodri-cyan/40'}`}>
          {uploadingKey === 'imagem' ? (
            <><Loader2 size={22} className="animate-spin text-nodri-cyan" /><span className="text-[12px] text-nodri-cyan">Enviando imagem...</span></>
          ) : (
            <><Upload size={22} className="text-nodri-t3" /><span className="text-[12px] text-nodri-t2 text-center">Clique para fazer upload de imagem<br /><span className="text-[10px] text-nodri-t3">PNG, JPG, GIF, WebP</span></span></>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && addImagem(e.target.files[0])} />
        </label>

        {/* Galeria */}
        {imagens.length > 0 && (
          <div className="space-y-3">
            {imagens.map(img => (
              <div key={img.id} className="p-3 bg-nodri-surface border border-nodri-border rounded-xl space-y-2">
                <div className="flex justify-end">
                  <button onClick={() => removeImagem(img.id)} className="text-nodri-t3 hover:text-nodri-red transition-colors"><X size={14} /></button>
                </div>
                <img src={img.url} alt="Imagem da página" className="rounded-lg border border-nodri-border"
                  style={{ width: img.largura, maxHeight: 300, objectFit: 'contain' }} />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-nodri-t3 shrink-0">Largura:</span>
                  <input type="range" min="20" max="100" value={parseInt(img.largura) || 100}
                    onChange={e => updateLargura(img.id, `${e.target.value}%`)} className="flex-1" />
                  <span className="text-[10px] text-nodri-cyan font-bold w-10 text-right">{img.largura}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {imagens.length === 0 && <p className="text-center text-nodri-t3 text-[11px] py-1">Nenhuma imagem adicionada.</p>}
      </div>
    )
  }

  /* ── Seção: TABELA ── */
  function renderTabela() {
    if (!dados) return null
    const tabela = dados.conteudo.tabela || { linhas: 3, cols: 3, data: Array(3).fill(null).map(() => Array(3).fill('')) }

    function save(t: typeof tabela) {
      updC({ tabela: t })
    }

    function setCell(li: number, ci: number, val: string) {
      const nd = tabela.data.map((row, ri) => ri === li ? row.map((c, cj) => cj === ci ? val : c) : row)
      save({ ...tabela, data: nd })
    }

    function addRow() {
      save({ ...tabela, linhas: tabela.linhas + 1, data: [...tabela.data, Array(tabela.cols).fill('')] })
    }

    function addCol() {
      save({ ...tabela, cols: tabela.cols + 1, data: tabela.data.map(row => [...row, '']) })
    }

    function removeRow(li: number) {
      if (tabela.linhas <= 1) return
      save({ ...tabela, linhas: tabela.linhas - 1, data: tabela.data.filter((_, i) => i !== li) })
    }

    function removeCol(ci: number) {
      if (tabela.cols <= 1) return
      save({ ...tabela, cols: tabela.cols - 1, data: tabela.data.map(row => row.filter((_, i) => i !== ci)) })
    }

    function initTabela() {
      updC({ tabela: { linhas: 3, cols: 3, data: Array(3).fill(null).map(() => Array(3).fill('')) } })
    }

    if (!dados.conteudo.tabela) {
      return (
        <div className="text-center py-6 space-y-3">
          <p className="text-nodri-t3 text-[12px]">Nenhuma tabela criada.</p>
          <button onClick={initTabela} className="flex items-center gap-2 mx-auto px-4 py-2 bg-nodri-purple/10 border border-nodri-purple/30 text-nodri-purple rounded-lg text-[12px] font-bold hover:bg-nodri-purple/20 transition-all">
            <Plus size={13} /> Criar Tabela (3×3)
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={addRow} className="flex items-center gap-1 text-[10px] px-2 py-1 bg-nodri-card border border-nodri-border rounded text-nodri-t2 hover:text-nodri-cyan hover:border-nodri-cyan/30 transition-all"><Plus size={9} /> Linha</button>
          <button onClick={addCol} className="flex items-center gap-1 text-[10px] px-2 py-1 bg-nodri-card border border-nodri-border rounded text-nodri-t2 hover:text-nodri-cyan hover:border-nodri-cyan/30 transition-all"><Plus size={9} /> Coluna</button>
          <button onClick={() => updC({ tabela: null })}
            className="flex items-center gap-1 text-[10px] px-2 py-1 bg-nodri-card border border-nodri-red/30 rounded text-nodri-red hover:bg-nodri-red/10 transition-all ml-auto"><Trash2 size={9} /> Remover Tabela</button>
        </div>
        <div className="overflow-x-auto">
          <table className="border-collapse w-full text-[12px]">
            <tbody>
              {tabela.data.map((row, li) => (
                <tr key={li} className="group/row">
                  {row.map((cell, ci) => (
                    <td key={ci} className={`border border-nodri-border p-0 ${li === 0 ? 'bg-nodri-surface' : ''}`}>
                      <input value={cell} onChange={e => setCell(li, ci, e.target.value)}
                        placeholder={li === 0 ? 'Cabeçalho' : '—'}
                        className={`w-full min-w-[80px] px-2 py-1.5 bg-transparent text-nodri-t1 outline-none focus:bg-nodri-cyan/5 transition-colors ${li === 0 ? 'font-bold text-nodri-cyan' : ''}`} />
                    </td>
                  ))}
                  <td className="border-0 pl-1">
                    <button onClick={() => removeRow(li)}
                      className="w-5 h-5 text-nodri-t3 hover:text-nodri-red opacity-0 group-hover/row:opacity-100 transition-all flex items-center justify-center shrink-0">
                      <X size={9} />
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                {tabela.data[0]?.map((_, ci) => (
                  <td key={ci} className="border-0 pt-1 text-center">
                    <button onClick={() => removeCol(ci)} className="w-5 h-5 mx-auto text-nodri-t3 hover:text-nodri-red transition-colors flex items-center justify-center"><X size={9} /></button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  /* ── Seção: COLUNAS ── */
  function renderColunas() {
    if (!dados) return null
    const colunas = dados.conteudo.colunas || null

    function initColunas() {
      updC({ colunas: [{ id: uid(), conteudo: 'Coluna 1' }, { id: uid(), conteudo: 'Coluna 2' }] })
    }

    if (!colunas) {
      return (
        <div className="text-center py-6 space-y-3">
          <p className="text-nodri-t3 text-[12px]">Nenhum layout de colunas criado.</p>
          <button onClick={initColunas} className="flex items-center gap-2 mx-auto px-4 py-2 bg-nodri-amber/10 border border-nodri-amber/30 text-nodri-amber rounded-lg text-[12px] font-bold hover:bg-nodri-amber/20 transition-all">
            <Plus size={13} /> Criar 2 Colunas
          </button>
        </div>
      )
    }

    function updateCol(id: string, html: string) {
      setDados(prev => {
        const cols = prev?.conteudo?.colunas
        if (!prev || !cols) return prev
        return { ...prev, conteudo: { ...prev.conteudo, colunas: cols.map(c => c.id === id ? { ...c, conteudo: html } : c) } }
      })
    }

    function addCol() {
      setDados(prev => {
        const cols = prev?.conteudo?.colunas
        if (!prev || !cols || cols.length >= 4) return prev
        return { ...prev, conteudo: { ...prev.conteudo, colunas: [...cols, { id: uid(), conteudo: `Coluna ${cols.length + 1}` }] } }
      })
    }

    function removeCol(id: string) {
      setDados(prev => {
        const cols = prev?.conteudo?.colunas
        if (!prev || !cols || cols.length <= 1) return prev
        return { ...prev, conteudo: { ...prev.conteudo, colunas: cols.filter(c => c.id !== id) } }
      })
    }

    return (
      <div className="space-y-2">
        <div className="flex gap-1.5">
          <button onClick={addCol} disabled={colunas.length >= 4}
            className="flex items-center gap-1 text-[10px] px-2 py-1 bg-nodri-card border border-nodri-border rounded text-nodri-t2 hover:text-nodri-amber hover:border-nodri-amber/30 transition-all disabled:opacity-30">
            <Plus size={9} /> Coluna ({colunas.length}/4)
          </button>
          <button onClick={() => updC({ colunas: null })}
            className="flex items-center gap-1 text-[10px] px-2 py-1 bg-nodri-card border border-nodri-red/30 rounded text-nodri-red hover:bg-nodri-red/10 transition-all ml-auto">
            <Trash2 size={9} /> Remover
          </button>
        </div>
        <div className="flex gap-2">
          {colunas.map(col => (
            <div key={col.id} className="flex-1 border border-nodri-border rounded-lg bg-nodri-surface relative group/col overflow-hidden">
              <div
                contentEditable suppressContentEditableWarning
                onBlur={e => updateCol(col.id, e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: col.conteudo }}
                className="min-h-[100px] text-[12px] text-nodri-t1 outline-none p-3 focus:bg-nodri-amber/3"
              />
              {colunas.length > 1 && (
                <button onClick={() => removeCol(col.id)}
                  className="absolute top-1 right-1 w-5 h-5 text-nodri-t3 hover:text-nodri-red opacity-0 group-hover/col:opacity-100 transition-all flex items-center justify-center rounded bg-nodri-card">
                  <X size={9} />
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-nodri-t3">💡 Clique dentro de cada coluna para editar</p>
      </div>
    )
  }

  /* ── Seção: CHECKLIST ── */
  function renderChecklist() {
    if (!dados) return null
    const list = dados.conteudo.checklist || []
    const upd = (a: string[]) => updC({ checklist: a })
    return (
      <div className="space-y-2">
        <button onClick={() => upd([...list, ''])}
          className="flex items-center gap-1 text-[10px] bg-nodri-green/10 text-nodri-green border border-nodri-green/30 px-2 py-1 rounded hover:bg-nodri-green/20">
          <Plus size={10} /> Adicionar item
        </button>
        {list.map((item, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-nodri-green mt-2 shrink-0">✓</span>
            <input value={item} onChange={e => { const a = [...list]; a[i] = e.target.value; upd(a) }} placeholder={`Item ${i + 1}`}
              className="flex-1 bg-nodri-surface border border-nodri-border rounded px-2.5 py-1.5 text-[12px] outline-none focus:border-nodri-cyan" />
            <button onClick={() => upd(list.filter((_, j) => j !== i))} className="p-1.5 text-nodri-red hover:bg-nodri-red/10 rounded"><Trash2 size={12} /></button>
          </div>
        ))}
        {list.length === 0 && <p className="text-nodri-t3 text-[11px] text-center py-1">Nenhum item.</p>}
      </div>
    )
  }

  /* ── Seção: FAQ ── */
  function renderFaq() {
    if (!dados) return null
    const list = dados.conteudo.faq || []
    const upd = (a: typeof list) => updC({ faq: a })
    return (
      <div className="space-y-3">
        <button onClick={() => upd([...list, { pergunta: '', resposta: '' }])}
          className="flex items-center gap-1 text-[10px] bg-nodri-amber/10 text-nodri-amber border border-nodri-amber/30 px-2 py-1 rounded hover:bg-nodri-amber/20">
          <Plus size={10} /> Adicionar pergunta
        </button>
        {list.map((item, i) => (
          <div key={i} className="bg-nodri-surface rounded-lg p-3 border border-nodri-border space-y-2">
            <div className="flex gap-2">
              <input value={item.pergunta} onChange={e => { const a = [...list]; a[i] = { ...a[i], pergunta: e.target.value }; upd(a) }} placeholder="Pergunta"
                className="flex-1 bg-nodri-card border border-nodri-border rounded px-2.5 py-1.5 text-[12px] font-medium outline-none focus:border-nodri-cyan" />
              <button onClick={() => upd(list.filter((_, j) => j !== i))} className="p-1.5 text-nodri-red hover:bg-nodri-red/10 rounded"><Trash2 size={12} /></button>
            </div>
            <textarea value={item.resposta} onChange={e => { const a = [...list]; a[i] = { ...a[i], resposta: e.target.value }; upd(a) }} placeholder="Resposta" rows={2}
              className="w-full bg-nodri-card border border-nodri-border rounded px-2.5 py-1.5 text-[11px] outline-none focus:border-nodri-cyan resize-none" />
          </div>
        ))}
        {list.length === 0 && <p className="text-nodri-t3 text-[11px] text-center py-1">Nenhuma pergunta.</p>}
      </div>
    )
  }

  /* ── Seção: PDF ── */
  function renderPdf() {
    if (!dados) return null
    const pdfs = dados.conteudo.arquivos_pdf || []

    async function addPdf(file: File) {
      const url = await handleUpload('pdf', file)
      if (!url) return
      const nome = file.name.replace(/\.[^.]+$/, '')
      updC({ arquivos_pdf: [...pdfs, { id: uid(), nome, url }] })
      toast.success('PDF adicionado!')
    }

    function removePdf(id: string) {
      updC({ arquivos_pdf: pdfs.filter(p => p.id !== id) })
    }

    return (
      <div className="space-y-3">
        <label className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploadingKey === 'pdf' ? 'border-nodri-red/50 bg-nodri-red/5' : 'border-nodri-border hover:border-nodri-red/40'}`}>
          {uploadingKey === 'pdf' ? (
            <><Loader2 size={22} className="animate-spin text-nodri-red" /><span className="text-[12px] text-nodri-red">Enviando PDF...</span></>
          ) : (
            <><span className="text-[28px]">📄</span><span className="text-[12px] text-nodri-t2 text-center">Clique para fazer upload de PDF<br /><span className="text-[10px] text-nodri-t3">.pdf</span></span></>
          )}
          <input type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && addPdf(e.target.files[0])} />
        </label>
        {pdfs.map(pdf => (
          <div key={pdf.id} className="flex items-center gap-3 p-3 bg-nodri-surface border border-nodri-border rounded-lg">
            <span className="text-[22px] shrink-0">📄</span>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-nodri-t1 truncate">{pdf.nome}</div>
              <a href={pdf.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-nodri-cyan hover:underline">Abrir PDF ↗</a>
            </div>
            <button onClick={() => removePdf(pdf.id)} className="text-nodri-t3 hover:text-nodri-red transition-colors shrink-0"><Trash2 size={13} /></button>
          </div>
        ))}
        {pdfs.length === 0 && !uploadingKey && <p className="text-center text-nodri-t3 text-[11px] py-1">Nenhum PDF adicionado.</p>}
      </div>
    )
  }

  /* ── Seção: EXCEL ── */
  function renderExcel() {
    if (!dados) return null
    const excels = dados.conteudo.arquivos_excel || []

    async function addExcel(file: File) {
      const url = await handleUpload('excel', file)
      if (!url) return
      const nome = file.name.replace(/\.[^.]+$/, '')
      updC({ arquivos_excel: [...excels, { id: uid(), nome, url }] })
      toast.success('Planilha adicionada!')
    }

    function removeExcel(id: string) {
      updC({ arquivos_excel: excels.filter(e => e.id !== id) })
    }

    return (
      <div className="space-y-3">
        <label className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploadingKey === 'excel' ? 'border-nodri-green/50 bg-nodri-green/5' : 'border-nodri-border hover:border-nodri-green/40'}`}>
          {uploadingKey === 'excel' ? (
            <><Loader2 size={22} className="animate-spin text-nodri-green" /><span className="text-[12px] text-nodri-green">Enviando planilha...</span></>
          ) : (
            <><span className="text-[28px]">📊</span><span className="text-[12px] text-nodri-t2 text-center">Clique para fazer upload de planilha Excel<br /><span className="text-[10px] text-nodri-t3">.xlsx, .xls, .csv</span></span></>
          )}
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files?.[0] && addExcel(e.target.files[0])} />
        </label>
        {excels.map(ex => (
          <div key={ex.id} className="flex items-center gap-3 p-3 bg-nodri-surface border border-nodri-border rounded-lg">
            <span className="text-[22px] shrink-0">📊</span>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-nodri-t1 truncate">{ex.nome}</div>
              <a href={ex.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-nodri-cyan hover:underline">Baixar planilha ↗</a>
            </div>
            <button onClick={() => removeExcel(ex.id)} className="text-nodri-t3 hover:text-nodri-red transition-colors shrink-0"><Trash2 size={13} /></button>
          </div>
        ))}
        {excels.length === 0 && !uploadingKey && <p className="text-center text-nodri-t3 text-[11px] py-1">Nenhuma planilha adicionada.</p>}
      </div>
    )
  }

  /* ── Seção: DOWNLOADS ── */
  function renderDownloads() {
    if (!dados) return null
    const list = dados.conteudo.downloads || []
    const upd = (a: typeof list) => updC({ downloads: a })
    return (
      <div className="space-y-2">
        <button onClick={() => upd([...list, { nome: '', url: '' }])}
          className="flex items-center gap-1 text-[10px] bg-nodri-blue/10 text-nodri-blue border border-nodri-blue/30 px-2 py-1 rounded hover:bg-nodri-blue/20">
          <Plus size={10} /> Adicionar link
        </button>
        {list.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input value={item.nome} onChange={e => { const a = [...list]; a[i] = { ...a[i], nome: e.target.value }; upd(a) }} placeholder="Nome"
              className="w-36 bg-nodri-surface border border-nodri-border rounded px-2.5 py-1.5 text-[12px] outline-none focus:border-nodri-cyan" />
            <input value={item.url} onChange={e => { const a = [...list]; a[i] = { ...a[i], url: e.target.value }; upd(a) }} placeholder="https://..."
              className="flex-1 bg-nodri-surface border border-nodri-border rounded px-2.5 py-1.5 text-[12px] font-mono outline-none focus:border-nodri-cyan" />
            <button onClick={() => upd(list.filter((_, j) => j !== i))} className="p-1.5 text-nodri-red hover:bg-nodri-red/10 rounded"><Trash2 size={12} /></button>
          </div>
        ))}
        {list.length === 0 && <p className="text-nodri-t3 text-[11px] text-center py-1">Nenhum link.</p>}
      </div>
    )
  }

  /* ─────────────── RENDER PRINCIPAL ─────────────── */
  const categoriaAtual = menus.find(m => m.categoria === categoriaAtiva)

  return (
    <div className="flex gap-4 h-full min-h-0">

      {/* ── SIDEBAR ── */}
      <div className="w-64 shrink-0 space-y-1 overflow-y-auto pb-4">
        <div className="flex items-center justify-between mb-3 sticky top-0 bg-nodri-dark py-1">
          <div className="font-syne font-bold text-[12px] text-nodri-cyan">📋 Páginas</div>
          <div className="flex gap-1">
            <button onClick={() => setShowNovaCategoria(true)} title="Nova categoria"
              className="p-1.5 bg-nodri-purple/10 border border-nodri-purple/30 text-nodri-purple rounded hover:bg-nodri-purple/20 transition-all">
              <FolderPlus size={11} />
            </button>
            <button onClick={() => setShowNovoItem(true)} title="Nova página"
              className="p-1.5 bg-nodri-cyan/10 border border-nodri-cyan/30 text-nodri-cyan rounded hover:bg-nodri-cyan/20 transition-all">
              <Plus size={11} />
            </button>
          </div>
        </div>

        {showNovaCategoria && (
          <div className="nodri-card p-3 space-y-2 mb-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-nodri-purple font-bold uppercase">Nova Categoria</p>
              <button onClick={() => setShowNovaCategoria(false)}><X size={11} className="text-nodri-t3" /></button>
            </div>
            <input placeholder="Ex: Gestão de Clientes" value={novaCategoria}
              onChange={e => setNovaCategoria(e.target.value)} onKeyDown={e => e.key === 'Enter' && adicionarCategoria()}
              className="w-full bg-nodri-surface border border-nodri-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-nodri-purple" />
            <button onClick={adicionarCategoria} className="w-full bg-nodri-purple text-white text-[10px] font-bold py-1.5 rounded hover:brightness-110">Criar Categoria</button>
          </div>
        )}

        {showNovoItem && (
          <div className="nodri-card p-3 space-y-2 mb-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-nodri-cyan font-bold uppercase">Nova Página — {categoriaAtiva}</p>
              <button onClick={() => setShowNovoItem(false)}><X size={11} className="text-nodri-t3" /></button>
            </div>
            <input placeholder="Título da página" value={novoItem.titulo}
              onChange={e => setNovoItem(p => ({ ...p, titulo: e.target.value }))} onKeyDown={e => e.key === 'Enter' && adicionarItem()}
              className="w-full bg-nodri-surface border border-nodri-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-nodri-cyan" />
            <input placeholder="Slug (auto)" value={novoItem.slug}
              onChange={e => setNovoItem(p => ({ ...p, slug: e.target.value }))}
              className="w-full bg-nodri-surface border border-nodri-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-nodri-cyan font-mono" />
            <button onClick={adicionarItem} className="w-full bg-nodri-cyan text-black text-[10px] font-bold py-1.5 rounded hover:brightness-110">Criar Página</button>
          </div>
        )}

        {menus.map(menu => (
          <div key={menu.categoria}>
            <div className="flex items-center gap-1">
              {editandoCategoria === menu.categoria ? (
                <div className="flex-1 flex gap-1">
                  <input autoFocus value={nomeCategoria} onChange={e => setNomeCategoria(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') salvarNomeCategoria(menu.categoria); if (e.key === 'Escape') setEditandoCategoria(null) }}
                    className="flex-1 bg-nodri-surface border border-nodri-cyan/50 rounded px-2 py-1 text-[11px] text-nodri-t1 outline-none" />
                  <button onClick={() => salvarNomeCategoria(menu.categoria)} className="p-1 text-nodri-cyan hover:bg-nodri-cyan/10 rounded"><Save size={10} /></button>
                  <button onClick={() => setEditandoCategoria(null)} className="p-1 text-nodri-t3 hover:text-nodri-t1 rounded"><X size={10} /></button>
                </div>
              ) : (
                <button onClick={() => setCategoriaAtiva(menu.categoria)}
                  className={`flex-1 flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] font-bold transition-all ${categoriaAtiva === menu.categoria ? 'bg-nodri-cyan/10 text-nodri-cyan border border-nodri-cyan/20' : 'text-nodri-t2 hover:text-nodri-t1 hover:bg-white/3'}`}>
                  <span className={`truncate ${menu.oculto ? 'opacity-40 italic' : ''}`}>{menu.oculto && '🙈 '}{menu.categoria}</span>
                  <span className="text-[9px] opacity-60 ml-1">{menu.itens.length}</span>
                  {categoriaAtiva === menu.categoria ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
              )}
              {categoriaAtiva === menu.categoria && editandoCategoria !== menu.categoria && (
                <>
                  <button onClick={() => { setEditandoCategoria(menu.categoria); setNomeCategoria(menu.categoria) }} title="Renomear"
                    className="p-1 text-nodri-t3 hover:text-nodri-cyan transition-colors rounded"><Edit3 size={10} /></button>
                  <button onClick={() => {
                    const novos = menus.map(m => m.categoria === menu.categoria ? { ...m, oculto: !m.oculto } : m)
                    setMenus(novos)
                    saveEstrutura(novos)
                    toast.success(menu.oculto ? '👁 Categoria visível' : '🙈 Categoria ocultada')
                  }} title={menu.oculto ? 'Mostrar categoria' : 'Ocultar categoria'}
                    className={`p-1 transition-colors rounded ${menu.oculto ? 'text-nodri-amber hover:text-nodri-t1' : 'text-nodri-t3 hover:text-nodri-amber'}`}>
                    {menu.oculto ? <Eye size={10} /> : <EyeOff size={10} />}
                  </button>
                  <button onClick={() => excluirCategoria(menu.categoria)} title="Excluir categoria"
                    className="p-1 text-nodri-t3 hover:text-nodri-red transition-colors rounded"><Trash2 size={10} /></button>
                </>
              )}
            </div>
            {categoriaAtiva === menu.categoria && (
              <div className="ml-2 mt-1 space-y-0.5">
                {menu.itens.map(item => (
                  <div key={item.slug} className="flex items-center gap-1 group">
                    {editandoItem === item.slug ? (
                      <div className="flex-1 flex gap-1">
                        <input autoFocus value={nomePagina} onChange={e => setNomePagina(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') salvarNomePagina(item.slug); if (e.key === 'Escape') setEditandoItem(null) }}
                          className="flex-1 bg-nodri-surface border border-nodri-purple/50 rounded px-2 py-1 text-[10.5px] outline-none" />
                        <button onClick={() => salvarNomePagina(item.slug)} className="p-1 text-nodri-cyan hover:bg-nodri-cyan/10 rounded"><Save size={10} /></button>
                        <button onClick={() => setEditandoItem(null)} className="p-1 text-nodri-t3 rounded"><X size={10} /></button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => abrirEditor(item.slug, item.titulo)}
                          className={`flex-1 text-left px-2.5 py-1.5 rounded text-[10.5px] transition-all truncate ${slugAtivo === item.slug ? 'bg-nodri-purple/10 text-nodri-purple border border-nodri-purple/20' : 'text-nodri-t3 hover:text-nodri-t1 hover:bg-white/2'} ${item.oculto ? 'opacity-40 italic' : ''}`}>
                          {item.oculto && '🙈 '}{item.titulo}
                        </button>
                        <button onClick={() => { setEditandoItem(item.slug); setNomePagina(item.titulo) }} title="Renomear"
                          className="opacity-0 group-hover:opacity-100 p-1 text-nodri-t3 hover:text-nodri-cyan transition-all rounded shrink-0"><Edit3 size={10} /></button>
                        <button onClick={() => setConfirmDelete(item.slug)} title="Excluir página"
                          className="opacity-0 group-hover:opacity-100 p-1 text-nodri-t3 hover:text-nodri-red transition-all rounded shrink-0"><Trash2 size={10} /></button>
                      </>
                    )}
                  </div>
                ))}
                {menu.itens.length === 0 && <p className="text-[10px] text-nodri-t3 px-2.5 py-1 italic">Nenhuma página. Clique em + para criar.</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="nodri-card p-6 max-w-sm w-full mx-4">
            <h3 className="font-syne font-bold text-[14px] mb-2 text-nodri-red">⚠️ Excluir página?</h3>
            <p className="text-nodri-t2 text-[12px] mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => excluirPagina(confirmDelete)} className="flex-1 py-2 bg-nodri-red text-white font-bold rounded-lg text-[12px] hover:brightness-110">Excluir</button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 border border-nodri-border text-nodri-t2 rounded-lg text-[12px] hover:text-nodri-t1">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDITOR PRINCIPAL ── */}
      <div className="flex-1 overflow-y-auto">
        {!slugAtivo ? (
          <div className="nodri-card p-10 text-center flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
            <Edit3 size={40} className="text-nodri-t3 mb-4" />
            <p className="text-nodri-t2 text-sm font-medium">Selecione uma página para editar</p>
            <p className="text-nodri-t3 text-xs mt-1">Use o painel ao lado para navegar ou criar novas páginas</p>
            <div className="mt-6 flex gap-3 flex-wrap justify-center">
              <button onClick={() => setShowNovaCategoria(true)}
                className="flex items-center gap-2 px-4 py-2 bg-nodri-purple/10 border border-nodri-purple/30 text-nodri-purple rounded-lg text-[12px] font-bold hover:bg-nodri-purple/20">
                <FolderPlus size={13} /> Nova Categoria
              </button>
              <button onClick={() => setShowNovoItem(true)}
                className="flex items-center gap-2 px-4 py-2 bg-nodri-cyan/10 border border-nodri-cyan/30 text-nodri-cyan rounded-lg text-[12px] font-bold hover:bg-nodri-cyan/20">
                <Plus size={13} /> Nova Página
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="nodri-card p-10 text-center"><Loader2 size={28} className="animate-spin text-nodri-cyan mx-auto" /></div>
        ) : dados ? (
          <div className="space-y-3 pb-8">

            {/* Header */}
            <div className="nodri-card p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-syne font-bold text-[13px]">{dados.titulo}</div>
                <div className="text-[10px] text-nodri-t3 font-mono">/conteudo/{dados.slug}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={toggleOculto}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[11px] font-bold transition-all ${dados.oculto ? 'border-nodri-amber/40 text-nodri-amber bg-nodri-amber/10 hover:bg-nodri-amber/20' : 'border-nodri-green/40 text-nodri-green bg-nodri-green/10 hover:bg-nodri-green/20'}`}>
                  {dados.oculto ? <><EyeOff size={12} /> Oculta</> : <><Eye size={12} /> Visível</>}
                </button>
                <a href={`/conteudo/${dados.slug}`} target="_blank"
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-nodri-border text-nodri-t2 hover:text-nodri-cyan rounded-lg text-[11px] transition-all">
                  <Eye size={12} /> Ver
                </a>
                <button onClick={() => setConfirmDelete(dados.slug)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-nodri-red/30 text-nodri-red bg-nodri-red/5 hover:bg-nodri-red/15 rounded-lg text-[11px] transition-all">
                  <Trash2 size={12} /> Excluir
                </button>
                <button onClick={salvar} disabled={saving}
                  className="flex items-center gap-1.5 bg-nodri-cyan text-black px-4 py-1.5 rounded-lg text-[11px] font-bold hover:brightness-110 disabled:opacity-50 transition-all">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
                </button>
              </div>
            </div>

            {dados.oculto && (
              <div className="bg-nodri-amber/10 border border-nodri-amber/30 rounded-xl p-3 text-[12px] text-nodri-amber flex items-center gap-2">
                🙈 <strong>Página oculta</strong> — Clientes não verão esta página no menu.
              </div>
            )}

            {/* Título da página */}
            <div className="nodri-card p-4">
              <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Título da Página</label>
              <input value={dados.titulo} onChange={e => setDados(prev => prev ? { ...prev, titulo: e.target.value } : null)}
                className="w-full bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[13px] font-syne font-bold outline-none focus:border-nodri-cyan transition-colors" />
            </div>

            {/* Dica de reordenação */}
            <div className="flex items-center gap-2 px-1">
              <GripVertical size={13} className="text-nodri-t3" />
              <span className="text-[10px] text-nodri-t3">Arraste o cabeçalho de cada seção para reordenar a página</span>
            </div>

            {/* Seções em ordem configurável */}
            {getOrdem().map(tipo => {
              const info = SECOES_INFO[tipo]
              const colapsada = secoesColapsadas.has(tipo)
              const highlighted = dragHighlight === tipo
              return (
                <div key={tipo}
                  draggable
                  onDragStart={() => { dragSecaoId.current = tipo }}
                  onDragEnter={() => { dragSecaoOver.current = tipo; setDragHighlight(tipo) }}
                  onDragEnd={reordenarSecao}
                  onDragOver={e => e.preventDefault()}
                  className={`nodri-card overflow-hidden transition-all ${highlighted ? 'ring-2 ring-nodri-cyan border-nodri-cyan' : ''}`}
                >
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-nodri-surface/60 border-b border-nodri-border cursor-pointer select-none hover:bg-nodri-surface transition-colors"
                    onClick={() => toggleColapso(tipo)}>
                    <div className="cursor-grab active:cursor-grabbing text-nodri-t3 hover:text-nodri-t2 shrink-0" onClick={e => e.stopPropagation()}>
                      <GripVertical size={15} />
                    </div>
                    <span className="text-base">{info.emoji}</span>
                    <span className="font-syne font-bold text-[11.5px] text-nodri-t1 flex-1">{info.label}</span>
                    <span className="text-[9px] text-nodri-t3 italic mr-1 hidden sm:inline">arrastar para reordenar</span>
                    {colapsada ? <ChevronDown size={13} className="text-nodri-t3 shrink-0" /> : <ChevronUp size={13} className="text-nodri-t3 shrink-0" />}
                  </div>
                  {!colapsada && (
                    <div className="p-4">
                      {tipo === 'video'     && renderVideo()}
                      {tipo === 'texto'     && renderTexto()}
                      {tipo === 'imagens'   && renderImagens()}
                      {tipo === 'tabela'    && renderTabela()}
                      {tipo === 'colunas'   && renderColunas()}
                      {tipo === 'checklist' && renderChecklist()}
                      {tipo === 'faq'       && renderFaq()}
                      {tipo === 'pdf'       && renderPdf()}
                      {tipo === 'excel'     && renderExcel()}
                      {tipo === 'downloads' && renderDownloads()}
                    </div>
                  )}
                </div>
              )
            })}

            <button onClick={salvar} disabled={saving}
              className="w-full py-3 bg-nodri-cyan text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all text-[13px]">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar Página</>}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

