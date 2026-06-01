'use client'
import { useState, useEffect } from 'react'
import { Plus, Save, Trash2, Loader2, Youtube, FileText, CheckSquare, HelpCircle, Download, ChevronDown, ChevronUp, Eye, EyeOff, Edit3, FolderPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface SubItem { titulo: string; slug: string; oculto?: boolean }
interface MenuCategoria { categoria: string; itens: SubItem[] }

interface Submenu {
  slug: string
  titulo: string
  video_url: string
  conteudo: {
    texto?: string
    checklist?: string[]
    faq?: { pergunta: string; resposta: string }[]
    downloads?: { nome: string; url: string }[]
  }
  oculto?: boolean
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
  { categoria: 'Gestao de Pessoas', itens: [
    { titulo: 'Manual Integracao Profissional', slug: 'manual-integracao-profissional' },
    { titulo: 'Processo Atendimento Profissionais', slug: 'processo-atendimento-profissionais' },
    { titulo: 'Processo Atendimento Recepcao', slug: 'processo-atendimento-recepcao' },
    { titulo: 'Descricao de Cargos', slug: 'descricao-cargos' },
    { titulo: 'Avaliacao 360 Profissionais', slug: 'avaliacao-360-profissionais' },
    { titulo: 'Metas Individuais', slug: 'metas-individuais' },
    { titulo: 'Guia para Entrevista', slug: 'guia-entrevista' },
    { titulo: 'Atrasos Profissionais', slug: 'atrasos-profissionais' },
  ]},
  { categoria: 'Gestao Financeira', itens: [
    { titulo: 'Comissao Ideal', slug: 'comissao-ideal' },
    { titulo: 'Reforma Tributaria', slug: 'reforma-tributaria' },
    { titulo: 'Capital de Giro e Reserva', slug: 'capital-giro-reserva' },
    { titulo: 'Calcular Reserva Financeira', slug: 'calcular-reserva-financeira' },
    { titulo: 'Calculadora Depreciacao', slug: 'calculadora-depreciacao' },
    { titulo: 'Aluguel de Cadeira', slug: 'aluguel-de-cadeira' },
    { titulo: 'Precificar Servicos', slug: 'precificar-servicos' },
    { titulo: 'Ponto de Equilibrio', slug: 'ponto-de-equilibrio' },
  ]},
  { categoria: 'Marketing', itens: [
    { titulo: '4 Pilares do Marketing', slug: '4-pilares-marketing' },
    { titulo: 'Planejar a Meta', slug: 'planejar-a-meta' },
    { titulo: 'Acoes Comerciais', slug: 'acoes-comerciais' },
    { titulo: 'Acoes Sazonais', slug: 'acoes-sazonais' },
    { titulo: 'Scripts Personalizadas', slug: 'scripts-personalizadas' },
  ]},
]

function gerarSlug(titulo: string) {
  return titulo.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
}

export default function EditorSubmenus() {
  const [menus, setMenus] = useState<MenuCategoria[]>(MENUS_INICIAIS)
  const [categoriaAtiva, setCategoriaAtiva] = useState(MENUS_INICIAIS[0].categoria)
  const [slugAtivo, setSlugAtivo] = useState<string | null>(null)
  const [dados, setDados] = useState<Submenu | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // Modais
  const [showNovoItem, setShowNovoItem] = useState(false)
  const [showNovaCategoria, setShowNovaCategoria] = useState(false)
  const [novoItem, setNovoItem] = useState({ titulo: '', slug: '' })
  const [novaCategoria, setNovaCategoria] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function abrirEditor(slug: string, titulo: string) {
    setSlugAtivo(slug)
    setLoading(true)
    const res = await fetch(`/api/conteudo/${slug}`)
    const data = await res.json()
    setDados({
      slug,
      titulo: data.titulo || titulo,
      video_url: data.video_url || '',
      conteudo: data.conteudo || { texto: '', checklist: [], faq: [], downloads: [] },
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
    const res = await fetch(`/api/conteudo/${slug}`, { method: 'DELETE' })
    // Remove da lista local
    setMenus(prev => prev.map(m => ({
      ...m, itens: m.itens.filter(i => i.slug !== slug)
    })))
    if (slugAtivo === slug) { setSlugAtivo(null); setDados(null) }
    setConfirmDelete(null)
    toast.success('Página excluída!')
  }

  async function toggleOculto() {
    if (!dados) return
    const novoOculto = !dados.oculto
    setDados({ ...dados, oculto: novoOculto })
    // Salva imediatamente
    await fetch(`/api/conteudo/${dados.slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: dados.titulo,
        video_url: dados.video_url,
        conteudo: { ...dados.conteudo, oculto: novoOculto },
      }),
    })
    toast.success(novoOculto ? '🙈 Página ocultada' : '👁 Página visível')
  }

  function adicionarItem() {
    if (!novoItem.titulo) { toast.error('Digite o título'); return }
    const slug = novoItem.slug || gerarSlug(novoItem.titulo)
    setMenus(prev => prev.map(m => m.categoria === categoriaAtiva
      ? { ...m, itens: [...m.itens, { titulo: novoItem.titulo, slug }] }
      : m
    ))
    setNovoItem({ titulo: '', slug: '' })
    setShowNovoItem(false)
    toast.success(`Página "${novoItem.titulo}" criada!`)
  }

  function adicionarCategoria() {
    if (!novaCategoria.trim()) { toast.error('Digite o nome da categoria'); return }
    if (menus.find(m => m.categoria === novaCategoria)) { toast.error('Categoria já existe'); return }
    setMenus(prev => [...prev, { categoria: novaCategoria, itens: [] }])
    setCategoriaAtiva(novaCategoria)
    setNovaCategoria('')
    setShowNovaCategoria(false)
    toast.success(`Categoria "${novaCategoria}" criada!`)
  }

  function excluirCategoria(cat: string) {
    if (!confirm(`Excluir a categoria "${cat}" e todas as suas páginas?`)) return
    setMenus(prev => prev.filter(m => m.categoria !== cat))
    if (categoriaAtiva === cat) setCategoriaAtiva(menus[0]?.categoria || '')
    toast.success('Categoria excluída!')
  }

  // Checklist
  const addCheck = () => dados && setDados({ ...dados, conteudo: { ...dados.conteudo, checklist: [...(dados.conteudo.checklist || []), ''] } })
  const updCheck = (i: number, v: string) => { if (!dados) return; const a = [...(dados.conteudo.checklist || [])]; a[i] = v; setDados({ ...dados, conteudo: { ...dados.conteudo, checklist: a } }) }
  const delCheck = (i: number) => dados && setDados({ ...dados, conteudo: { ...dados.conteudo, checklist: (dados.conteudo.checklist || []).filter((_, j) => j !== i) } })

  // FAQ
  const addFaq = () => dados && setDados({ ...dados, conteudo: { ...dados.conteudo, faq: [...(dados.conteudo.faq || []), { pergunta: '', resposta: '' }] } })
  const updFaq = (i: number, f: 'pergunta' | 'resposta', v: string) => { if (!dados) return; const a = [...(dados.conteudo.faq || [])]; a[i] = { ...a[i], [f]: v }; setDados({ ...dados, conteudo: { ...dados.conteudo, faq: a } }) }
  const delFaq = (i: number) => dados && setDados({ ...dados, conteudo: { ...dados.conteudo, faq: (dados.conteudo.faq || []).filter((_, j) => j !== i) } })

  // Downloads
  const addDl = () => dados && setDados({ ...dados, conteudo: { ...dados.conteudo, downloads: [...(dados.conteudo.downloads || []), { nome: '', url: '' }] } })
  const updDl = (i: number, f: 'nome' | 'url', v: string) => { if (!dados) return; const a = [...(dados.conteudo.downloads || [])]; a[i] = { ...a[i], [f]: v }; setDados({ ...dados, conteudo: { ...dados.conteudo, downloads: a } }) }
  const delDl = (i: number) => dados && setDados({ ...dados, conteudo: { ...dados.conteudo, downloads: (dados.conteudo.downloads || []).filter((_, j) => j !== i) } })

  const categoriaAtual = menus.find(m => m.categoria === categoriaAtiva)

  return (
    <div className="flex gap-4 h-full min-h-0">

      {/* SIDEBAR */}
      <div className="w-64 shrink-0 space-y-1 overflow-y-auto pb-4">

        {/* Cabeçalho sidebar */}
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

        {/* Modal nova categoria */}
        {showNovaCategoria && (
          <div className="nodri-card p-3 space-y-2 mb-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-nodri-purple font-bold uppercase">Nova Categoria</p>
              <button onClick={() => setShowNovaCategoria(false)}><X size={11} className="text-nodri-t3" /></button>
            </div>
            <input placeholder="Ex: Gestão de Clientes" value={novaCategoria}
              onChange={e => setNovaCategoria(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarCategoria()}
              className="w-full bg-nodri-surface border border-nodri-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-nodri-purple" />
            <button onClick={adicionarCategoria} className="w-full bg-nodri-purple text-white text-[10px] font-bold py-1.5 rounded hover:brightness-110">Criar Categoria</button>
          </div>
        )}

        {/* Modal novo item */}
        {showNovoItem && (
          <div className="nodri-card p-3 space-y-2 mb-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-nodri-cyan font-bold uppercase">Nova Página em: {categoriaAtiva}</p>
              <button onClick={() => setShowNovoItem(false)}><X size={11} className="text-nodri-t3" /></button>
            </div>
            <input placeholder="Título da página" value={novoItem.titulo}
              onChange={e => setNovoItem(p => ({ ...p, titulo: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && adicionarItem()}
              className="w-full bg-nodri-surface border border-nodri-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-nodri-cyan" />
            <input placeholder="Slug (auto)" value={novoItem.slug}
              onChange={e => setNovoItem(p => ({ ...p, slug: e.target.value }))}
              className="w-full bg-nodri-surface border border-nodri-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-nodri-cyan font-mono" />
            <button onClick={adicionarItem} className="w-full bg-nodri-cyan text-black text-[10px] font-bold py-1.5 rounded hover:brightness-110">Criar Página</button>
          </div>
        )}

        {/* Categorias e itens */}
        {menus.map(menu => (
          <div key={menu.categoria}>
            <div className="flex items-center gap-1">
              <button onClick={() => setCategoriaAtiva(menu.categoria)}
                className={`flex-1 flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] font-bold transition-all ${categoriaAtiva === menu.categoria ? 'bg-nodri-cyan/10 text-nodri-cyan border border-nodri-cyan/20' : 'text-nodri-t2 hover:text-nodri-t1 hover:bg-white/3'}`}>
                <span className="truncate">{menu.categoria}</span>
                <span className="text-[9px] opacity-60 ml-1">{menu.itens.length}</span>
                {categoriaAtiva === menu.categoria ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
              {categoriaAtiva === menu.categoria && (
                <button onClick={() => excluirCategoria(menu.categoria)}
                  title="Excluir categoria"
                  className="p-1 text-nodri-t3 hover:text-nodri-red transition-colors rounded">
                  <Trash2 size={10} />
                </button>
              )}
            </div>

            {categoriaAtiva === menu.categoria && (
              <div className="ml-2 mt-1 space-y-0.5">
                {menu.itens.map(item => (
                  <div key={item.slug} className="flex items-center gap-1 group">
                    <button onClick={() => abrirEditor(item.slug, item.titulo)}
                      className={`flex-1 text-left px-2.5 py-1.5 rounded text-[10.5px] transition-all truncate ${slugAtivo === item.slug ? 'bg-nodri-purple/10 text-nodri-purple border border-nodri-purple/20' : 'text-nodri-t3 hover:text-nodri-t1 hover:bg-white/2'} ${item.oculto ? 'opacity-40 italic' : ''}`}>
                      {item.oculto && '🙈 '}{item.titulo}
                    </button>
                    {/* Excluir item */}
                    <button onClick={() => setConfirmDelete(item.slug)}
                      title="Excluir página"
                      className="opacity-0 group-hover:opacity-100 p-1 text-nodri-t3 hover:text-nodri-red transition-all rounded shrink-0">
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
                {menu.itens.length === 0 && (
                  <p className="text-[10px] text-nodri-t3 px-2.5 py-1 italic">Nenhuma página. Clique em + para criar.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="nodri-card p-6 max-w-sm w-full mx-4">
            <h3 className="font-syne font-bold text-[14px] mb-2 text-nodri-red">⚠️ Excluir página?</h3>
            <p className="text-nodri-t2 text-[12px] mb-4">Esta ação não pode ser desfeita. O conteúdo será permanentemente removido.</p>
            <div className="flex gap-3">
              <button onClick={() => excluirPagina(confirmDelete)}
                className="flex-1 py-2 bg-nodri-red text-white font-bold rounded-lg text-[12px] hover:brightness-110">
                Excluir
              </button>
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 border border-nodri-border text-nodri-t2 rounded-lg text-[12px] hover:text-nodri-t1">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDITOR PRINCIPAL */}
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
          <div className="space-y-4 pb-8">
            {/* Header */}
            <div className="nodri-card p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-syne font-bold text-[13px]">{dados.titulo}</div>
                <div className="text-[10px] text-nodri-t3 font-mono">/conteudo/{dados.slug}</div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* Ocultar/Mostrar */}
                <button onClick={toggleOculto}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[11px] font-bold transition-all ${dados.oculto ? 'border-nodri-amber/40 text-nodri-amber bg-nodri-amber/10 hover:bg-nodri-amber/20' : 'border-nodri-green/40 text-nodri-green bg-nodri-green/10 hover:bg-nodri-green/20'}`}>
                  {dados.oculto ? <><EyeOff size={12} /> Oculta (em criação)</> : <><Eye size={12} /> Visível</>}
                </button>
                {/* Visualizar */}
                <a href={`/conteudo/${dados.slug}`} target="_blank"
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-nodri-border text-nodri-t2 hover:text-nodri-cyan rounded-lg text-[11px] transition-all">
                  <Eye size={12} /> Ver
                </a>
                {/* Excluir */}
                <button onClick={() => setConfirmDelete(dados.slug)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-nodri-red/30 text-nodri-red bg-nodri-red/5 hover:bg-nodri-red/15 rounded-lg text-[11px] transition-all">
                  <Trash2 size={12} /> Excluir
                </button>
                {/* Salvar */}
                <button onClick={salvar} disabled={saving}
                  className="flex items-center gap-1.5 bg-nodri-cyan text-black px-4 py-1.5 rounded-lg text-[11px] font-bold hover:brightness-110 disabled:opacity-50 transition-all">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
                </button>
              </div>
            </div>

            {/* Status oculto */}
            {dados.oculto && (
              <div className="bg-nodri-amber/10 border border-nodri-amber/30 rounded-xl p-3 text-[12px] text-nodri-amber flex items-center gap-2">
                🙈 <strong>Página oculta</strong> — Apenas você (Admin) consegue ver. Clientes não verão esta página no menu.
              </div>
            )}

            {/* Título */}
            <div className="nodri-card p-4">
              <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Título da Página</label>
              <input value={dados.titulo} onChange={e => setDados({ ...dados, titulo: e.target.value })}
                className="w-full bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[13px] font-syne font-bold outline-none focus:border-nodri-cyan transition-colors" />
            </div>

            {/* Vídeo */}
            <div className="nodri-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Youtube size={14} className="text-red-500" />
                <label className="text-[11px] font-bold uppercase tracking-wider">Vídeo do YouTube</label>
              </div>
              <input value={dados.video_url} onChange={e => setDados({ ...dados, video_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[12px] font-mono outline-none focus:border-nodri-cyan transition-colors" />
              {dados.video_url && (() => {
                const m = dados.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
                return m ? (
                  <div className="mt-3 rounded-lg overflow-hidden relative" style={{ paddingBottom: '35%' }}>
                    <iframe src={`https://www.youtube.com/embed/${m[1]}`}
                      className="absolute inset-0 w-full h-full rounded-lg" style={{ border: 'none' }} allowFullScreen />
                  </div>
                ) : <p className="text-nodri-red text-[11px] mt-1">⚠️ Link inválido do YouTube</p>
              })()}
            </div>

            {/* Texto */}
            <div className="nodri-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-nodri-cyan" />
                <label className="text-[11px] font-bold uppercase tracking-wider">Texto de Orientação</label>
              </div>
              <textarea value={dados.conteudo.texto || ''} rows={8}
                onChange={e => setDados({ ...dados, conteudo: { ...dados.conteudo, texto: e.target.value } })}
                placeholder="Escreva as orientações... (suporta HTML: <b>negrito</b>, <i>itálico</i>, <br> para quebra de linha)"
                className="w-full bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-nodri-cyan transition-colors resize-none leading-relaxed" />
            </div>

            {/* Checklist */}
            <div className="nodri-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare size={14} className="text-nodri-green" />
                  <label className="text-[11px] font-bold uppercase tracking-wider">Checklist</label>
                </div>
                <button onClick={addCheck} className="flex items-center gap-1 text-[10px] bg-nodri-green/10 text-nodri-green border border-nodri-green/30 px-2 py-1 rounded hover:bg-nodri-green/20">
                  <Plus size={10} /> Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {(dados.conteudo.checklist || []).map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={item} onChange={e => updCheck(i, e.target.value)} placeholder={`Item ${i + 1}`}
                      className="flex-1 bg-nodri-surface border border-nodri-border rounded px-2.5 py-1.5 text-[12px] outline-none focus:border-nodri-cyan" />
                    <button onClick={() => delCheck(i)} className="p-1.5 text-nodri-red hover:bg-nodri-red/10 rounded"><Trash2 size={12} /></button>
                  </div>
                ))}
                {!(dados.conteudo.checklist?.length) && <p className="text-nodri-t3 text-[11px] text-center py-1">Nenhum item.</p>}
              </div>
            </div>

            {/* FAQ */}
            <div className="nodri-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle size={14} className="text-nodri-amber" />
                  <label className="text-[11px] font-bold uppercase tracking-wider">FAQ</label>
                </div>
                <button onClick={addFaq} className="flex items-center gap-1 text-[10px] bg-nodri-amber/10 text-nodri-amber border border-nodri-amber/30 px-2 py-1 rounded hover:bg-nodri-amber/20">
                  <Plus size={10} /> Adicionar
                </button>
              </div>
              <div className="space-y-3">
                {(dados.conteudo.faq || []).map((item, i) => (
                  <div key={i} className="bg-nodri-surface rounded-lg p-3 border border-nodri-border space-y-2">
                    <div className="flex gap-2">
                      <input value={item.pergunta} onChange={e => updFaq(i, 'pergunta', e.target.value)} placeholder="Pergunta"
                        className="flex-1 bg-nodri-card border border-nodri-border rounded px-2.5 py-1.5 text-[12px] font-medium outline-none focus:border-nodri-cyan" />
                      <button onClick={() => delFaq(i)} className="p-1.5 text-nodri-red hover:bg-nodri-red/10 rounded"><Trash2 size={12} /></button>
                    </div>
                    <textarea value={item.resposta} onChange={e => updFaq(i, 'resposta', e.target.value)} placeholder="Resposta" rows={2}
                      className="w-full bg-nodri-card border border-nodri-border rounded px-2.5 py-1.5 text-[11px] outline-none focus:border-nodri-cyan resize-none" />
                  </div>
                ))}
                {!(dados.conteudo.faq?.length) && <p className="text-nodri-t3 text-[11px] text-center py-1">Nenhuma pergunta.</p>}
              </div>
            </div>

            {/* Downloads */}
            <div className="nodri-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Download size={14} className="text-nodri-blue" />
                  <label className="text-[11px] font-bold uppercase tracking-wider">Downloads</label>
                </div>
                <button onClick={addDl} className="flex items-center gap-1 text-[10px] bg-nodri-blue/10 text-nodri-blue border border-nodri-blue/30 px-2 py-1 rounded hover:bg-nodri-blue/20">
                  <Plus size={10} /> Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {(dados.conteudo.downloads || []).map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={item.nome} onChange={e => updDl(i, 'nome', e.target.value)} placeholder="Nome do arquivo"
                      className="w-36 bg-nodri-surface border border-nodri-border rounded px-2.5 py-1.5 text-[12px] outline-none focus:border-nodri-cyan" />
                    <input value={item.url} onChange={e => updDl(i, 'url', e.target.value)} placeholder="https://..."
                      className="flex-1 bg-nodri-surface border border-nodri-border rounded px-2.5 py-1.5 text-[12px] font-mono outline-none focus:border-nodri-cyan" />
                    <button onClick={() => delDl(i)} className="p-1.5 text-nodri-red hover:bg-nodri-red/10 rounded"><Trash2 size={12} /></button>
                  </div>
                ))}
                {!(dados.conteudo.downloads?.length) && <p className="text-nodri-t3 text-[11px] text-center py-1">Nenhum download.</p>}
              </div>
            </div>

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
