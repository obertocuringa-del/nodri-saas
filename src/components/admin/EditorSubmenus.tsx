'use client'
import { useState, useEffect } from 'react'
import { Plus, Save, Trash2, Loader2, Youtube, FileText, CheckSquare, HelpCircle, Download, ChevronDown, ChevronUp, Eye, Edit3 } from 'lucide-react'
import toast from 'react-hot-toast'

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
  categoria?: string
  existe?: boolean
}

const MENUS_PADRAO = [
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
    { titulo: 'Manual de Integracao do Profissional', slug: 'manual-integracao-profissional' },
    { titulo: 'Processo de Atendimento Profissionais', slug: 'processo-atendimento-profissionais' },
    { titulo: 'Processo de Atendimento Recepcao', slug: 'processo-atendimento-recepcao' },
    { titulo: 'Descricao de Cargos', slug: 'descricao-cargos' },
    { titulo: 'Avaliacao 360 Profissionais', slug: 'avaliacao-360-profissionais' },
    { titulo: 'Metas Individuais', slug: 'metas-individuais' },
    { titulo: 'Guia para Entrevista', slug: 'guia-entrevista' },
    { titulo: 'Atrasos Profissionais', slug: 'atrasos-profissionais' },
  ]},
  { categoria: 'Gestao Financeira', itens: [
    { titulo: 'Como Definir a Comissao Ideal', slug: 'comissao-ideal' },
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

export default function EditorSubmenus() {
  const [categoriaAtiva, setCategoriaAtiva] = useState(MENUS_PADRAO[0].categoria)
  const [slugAtivo, setSlugAtivo] = useState<string | null>(null)
  const [dados, setDados] = useState<Submenu | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [novoMenu, setNovoMenu] = useState({ titulo: '', categoria: '', slug: '' })
  const [showNovoMenu, setShowNovoMenu] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [menus, setMenus] = useState(MENUS_PADRAO)

  async function abrirEditor(slug: string, titulo: string, categoria: string) {
    setSlugAtivo(slug)
    setLoading(true)
    const res = await fetch(`/api/conteudo/${slug}`)
    const data = await res.json()
    setDados({
      slug,
      titulo: data.titulo || titulo,
      video_url: data.video_url || '',
      conteudo: data.conteudo || { texto: '', checklist: [], faq: [], downloads: [] },
      categoria,
      existe: data.existe,
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
        conteudo: dados.conteudo,
        categoria: dados.categoria,
      }),
    })
    setSaving(false)
    if (res.ok) toast.success('✅ Conteúdo salvo com sucesso!')
    else toast.error('Erro ao salvar')
  }

  function addChecklist() {
    if (!dados) return
    setDados({ ...dados, conteudo: { ...dados.conteudo, checklist: [...(dados.conteudo.checklist || []), ''] } })
  }
  function updateChecklist(i: number, val: string) {
    if (!dados) return
    const arr = [...(dados.conteudo.checklist || [])]
    arr[i] = val
    setDados({ ...dados, conteudo: { ...dados.conteudo, checklist: arr } })
  }
  function removeChecklist(i: number) {
    if (!dados) return
    setDados({ ...dados, conteudo: { ...dados.conteudo, checklist: (dados.conteudo.checklist || []).filter((_, j) => j !== i) } })
  }

  function addFaq() {
    if (!dados) return
    setDados({ ...dados, conteudo: { ...dados.conteudo, faq: [...(dados.conteudo.faq || []), { pergunta: '', resposta: '' }] } })
  }
  function updateFaq(i: number, field: 'pergunta' | 'resposta', val: string) {
    if (!dados) return
    const arr = [...(dados.conteudo.faq || [])]
    arr[i] = { ...arr[i], [field]: val }
    setDados({ ...dados, conteudo: { ...dados.conteudo, faq: arr } })
  }
  function removeFaq(i: number) {
    if (!dados) return
    setDados({ ...dados, conteudo: { ...dados.conteudo, faq: (dados.conteudo.faq || []).filter((_, j) => j !== i) } })
  }

  function addDownload() {
    if (!dados) return
    setDados({ ...dados, conteudo: { ...dados.conteudo, downloads: [...(dados.conteudo.downloads || []), { nome: '', url: '' }] } })
  }
  function updateDownload(i: number, field: 'nome' | 'url', val: string) {
    if (!dados) return
    const arr = [...(dados.conteudo.downloads || [])]
    arr[i] = { ...arr[i], [field]: val }
    setDados({ ...dados, conteudo: { ...dados.conteudo, downloads: arr } })
  }
  function removeDownload(i: number) {
    if (!dados) return
    setDados({ ...dados, conteudo: { ...dados.conteudo, downloads: (dados.conteudo.downloads || []).filter((_, j) => j !== i) } })
  }

  function adicionarNovoSubmenu() {
    if (!novoMenu.titulo || !novoMenu.categoria) { toast.error('Preencha título e categoria'); return }
    const slug = novoMenu.slug || novoMenu.titulo.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-')
    const catExistente = menus.find(m => m.categoria === novoMenu.categoria)
    if (catExistente) {
      setMenus(prev => prev.map(m => m.categoria === novoMenu.categoria
        ? { ...m, itens: [...m.itens, { titulo: novoMenu.titulo, slug }] }
        : m
      ))
    } else {
      setMenus(prev => [...prev, { categoria: novoMenu.categoria, itens: [{ titulo: novoMenu.titulo, slug }] }])
    }
    setNovoMenu({ titulo: '', categoria: '', slug: '' })
    setShowNovoMenu(false)
    toast.success(`Submenu "${novoMenu.titulo}" adicionado!`)
  }

  const categoriaAtual = menus.find(m => m.categoria === categoriaAtiva)

  return (
    <div className="flex gap-4 h-full">
      {/* SIDEBAR — Lista de submenus */}
      <div className="w-64 shrink-0 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <div className="font-syne font-bold text-[12px] text-nodri-cyan">📋 Páginas de Conteúdo</div>
          <button onClick={() => setShowNovoMenu(true)}
            className="flex items-center gap-1 text-[10px] bg-nodri-cyan text-black px-2 py-1 rounded font-bold hover:brightness-110">
            <Plus size={10} /> Novo
          </button>
        </div>

        {/* Novo submenu */}
        {showNovoMenu && (
          <div className="nodri-card p-3 space-y-2 mb-3">
            <p className="text-[10px] text-nodri-cyan font-bold uppercase">Novo Submenu</p>
            <input placeholder="Título da página" value={novoMenu.titulo}
              onChange={e => setNovoMenu(p => ({ ...p, titulo: e.target.value }))}
              className="w-full bg-nodri-surface border border-nodri-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-nodri-cyan" />
            <input placeholder="Categoria (ex: Dicas Nodri)" value={novoMenu.categoria}
              onChange={e => setNovoMenu(p => ({ ...p, categoria: e.target.value }))}
              className="w-full bg-nodri-surface border border-nodri-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-nodri-cyan" />
            <input placeholder="Slug (opcional, gerado auto)" value={novoMenu.slug}
              onChange={e => setNovoMenu(p => ({ ...p, slug: e.target.value }))}
              className="w-full bg-nodri-surface border border-nodri-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-nodri-cyan font-mono" />
            <div className="flex gap-2">
              <button onClick={adicionarNovoSubmenu} className="flex-1 bg-nodri-cyan text-black text-[10px] font-bold py-1.5 rounded hover:brightness-110">Adicionar</button>
              <button onClick={() => setShowNovoMenu(false)} className="flex-1 border border-nodri-border text-nodri-t3 text-[10px] py-1.5 rounded hover:text-nodri-t1">Cancelar</button>
            </div>
          </div>
        )}

        {/* Categorias */}
        {menus.map(menu => (
          <div key={menu.categoria}>
            <button onClick={() => setCategoriaAtiva(menu.categoria)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] font-bold transition-all ${categoriaAtiva === menu.categoria ? 'bg-nodri-cyan/10 text-nodri-cyan border border-nodri-cyan/20' : 'text-nodri-t2 hover:text-nodri-t1 hover:bg-white/3'}`}>
              {menu.categoria}
              {categoriaAtiva === menu.categoria ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {categoriaAtiva === menu.categoria && (
              <div className="ml-2 mt-1 space-y-0.5">
                {menu.itens.map(item => (
                  <button key={item.slug} onClick={() => abrirEditor(item.slug, item.titulo, menu.categoria)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-[10.5px] transition-all ${slugAtivo === item.slug ? 'bg-nodri-purple/10 text-nodri-purple border border-nodri-purple/20' : 'text-nodri-t3 hover:text-nodri-t1 hover:bg-white/2'}`}>
                    {item.titulo}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* EDITOR PRINCIPAL */}
      <div className="flex-1 overflow-y-auto">
        {!slugAtivo ? (
          <div className="nodri-card p-10 text-center h-full flex flex-col items-center justify-center">
            <Edit3 size={40} className="text-nodri-t3 mb-4" />
            <p className="text-nodri-t2 text-sm font-medium">Selecione uma página para editar</p>
            <p className="text-nodri-t3 text-xs mt-1">Clique em qualquer item da lista ao lado</p>
          </div>
        ) : loading ? (
          <div className="nodri-card p-10 text-center">
            <Loader2 size={28} className="animate-spin text-nodri-cyan mx-auto" />
            <p className="text-nodri-t3 text-xs mt-3">Carregando conteúdo...</p>
          </div>
        ) : dados ? (
          <div className="space-y-4">
            {/* Header do editor */}
            <div className="nodri-card p-4 flex items-center justify-between">
              <div>
                <div className="font-syne font-bold text-[13px] text-nodri-t1">{dados.titulo}</div>
                <div className="text-[10px] text-nodri-t3 font-mono mt-0.5">/{dados.slug}</div>
              </div>
              <div className="flex gap-2">
                <a href={`/conteudo/${dados.slug}`} target="_blank"
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-nodri-border text-nodri-t2 hover:text-nodri-cyan rounded-lg text-[11px] transition-all">
                  <Eye size={12} /> Visualizar
                </a>
                <button onClick={salvar} disabled={saving}
                  className="flex items-center gap-1.5 bg-nodri-cyan text-black px-4 py-1.5 rounded-lg text-[11px] font-bold hover:brightness-110 disabled:opacity-50 transition-all">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Salvar
                </button>
              </div>
            </div>

            {/* Título da página */}
            <div className="nodri-card p-4">
              <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Título da Página</label>
              <input value={dados.titulo} onChange={e => setDados({ ...dados, titulo: e.target.value })}
                className="w-full bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[13px] text-nodri-t1 outline-none focus:border-nodri-cyan transition-colors font-syne font-bold" />
            </div>

            {/* Vídeo YouTube */}
            <div className="nodri-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Youtube size={14} className="text-red-500" />
                <label className="text-[11px] font-bold text-nodri-t1 uppercase tracking-wider">Vídeo do YouTube</label>
              </div>
              <input value={dados.video_url} onChange={e => setDados({ ...dados, video_url: e.target.value })}
                placeholder="Cole o link do YouTube aqui (ex: https://youtube.com/watch?v=...)"
                className="w-full bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none focus:border-nodri-cyan transition-colors font-mono" />
              {dados.video_url && (
                <div className="mt-3 rounded-lg overflow-hidden" style={{ paddingBottom: '30%', position: 'relative' }}>
                  {(() => {
                    const match = dados.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
                    const embedUrl = match ? `https://www.youtube.com/embed/${match[1]}` : ''
                    return embedUrl ? (
                      <iframe src={embedUrl} className="absolute inset-0 w-full h-full rounded-lg" style={{ border: 'none' }} allowFullScreen />
                    ) : <p className="text-nodri-red text-[11px] mt-1">Link inválido</p>
                  })()}
                </div>
              )}
            </div>

            {/* Texto de orientação */}
            <div className="nodri-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-nodri-cyan" />
                <label className="text-[11px] font-bold text-nodri-t1 uppercase tracking-wider">Texto de Orientação</label>
              </div>
              <textarea
                value={dados.conteudo.texto || ''}
                onChange={e => setDados({ ...dados, conteudo: { ...dados.conteudo, texto: e.target.value } })}
                rows={8}
                placeholder="Escreva as orientações para o cliente aqui..."
                className="w-full bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none focus:border-nodri-cyan transition-colors resize-none leading-relaxed"
              />
              <p className="text-[10px] text-nodri-t3 mt-1">Suporta HTML básico: &lt;b&gt;negrito&lt;/b&gt;, &lt;i&gt;itálico&lt;/i&gt;, &lt;br&gt; para quebra de linha</p>
            </div>

            {/* Checklist */}
            <div className="nodri-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare size={14} className="text-nodri-green" />
                  <label className="text-[11px] font-bold text-nodri-t1 uppercase tracking-wider">Checklist</label>
                </div>
                <button onClick={addChecklist} className="flex items-center gap-1 text-[10px] bg-nodri-green/10 text-nodri-green border border-nodri-green/30 px-2 py-1 rounded hover:bg-nodri-green/20">
                  <Plus size={10} /> Adicionar item
                </button>
              </div>
              <div className="space-y-2">
                {(dados.conteudo.checklist || []).map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={item} onChange={e => updateChecklist(i, e.target.value)}
                      placeholder={`Item ${i + 1}`}
                      className="flex-1 bg-nodri-surface border border-nodri-border rounded px-2.5 py-1.5 text-[12px] text-nodri-t1 outline-none focus:border-nodri-cyan" />
                    <button onClick={() => removeChecklist(i)} className="text-nodri-red hover:bg-nodri-red/10 p-1.5 rounded"><Trash2 size={12} /></button>
                  </div>
                ))}
                {(dados.conteudo.checklist || []).length === 0 && (
                  <p className="text-nodri-t3 text-[11px] text-center py-2">Nenhum item. Clique em "Adicionar item".</p>
                )}
              </div>
            </div>

            {/* FAQ */}
            <div className="nodri-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle size={14} className="text-nodri-amber" />
                  <label className="text-[11px] font-bold text-nodri-t1 uppercase tracking-wider">Perguntas Frequentes (FAQ)</label>
                </div>
                <button onClick={addFaq} className="flex items-center gap-1 text-[10px] bg-nodri-amber/10 text-nodri-amber border border-nodri-amber/30 px-2 py-1 rounded hover:bg-nodri-amber/20">
                  <Plus size={10} /> Adicionar
                </button>
              </div>
              <div className="space-y-3">
                {(dados.conteudo.faq || []).map((item, i) => (
                  <div key={i} className="bg-nodri-surface rounded-lg p-3 border border-nodri-border space-y-2">
                    <div className="flex gap-2">
                      <input value={item.pergunta} onChange={e => updateFaq(i, 'pergunta', e.target.value)}
                        placeholder="Pergunta"
                        className="flex-1 bg-nodri-card border border-nodri-border rounded px-2.5 py-1.5 text-[12px] font-medium text-nodri-t1 outline-none focus:border-nodri-cyan" />
                      <button onClick={() => removeFaq(i)} className="text-nodri-red hover:bg-nodri-red/10 p-1.5 rounded"><Trash2 size={12} /></button>
                    </div>
                    <textarea value={item.resposta} onChange={e => updateFaq(i, 'resposta', e.target.value)}
                      placeholder="Resposta"
                      rows={2}
                      className="w-full bg-nodri-card border border-nodri-border rounded px-2.5 py-1.5 text-[11px] text-nodri-t2 outline-none focus:border-nodri-cyan resize-none" />
                  </div>
                ))}
                {(dados.conteudo.faq || []).length === 0 && (
                  <p className="text-nodri-t3 text-[11px] text-center py-2">Nenhuma pergunta. Clique em "Adicionar".</p>
                )}
              </div>
            </div>

            {/* Downloads */}
            <div className="nodri-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Download size={14} className="text-nodri-blue" />
                  <label className="text-[11px] font-bold text-nodri-t1 uppercase tracking-wider">Links de Download</label>
                </div>
                <button onClick={addDownload} className="flex items-center gap-1 text-[10px] bg-nodri-blue/10 text-nodri-blue border border-nodri-blue/30 px-2 py-1 rounded hover:bg-nodri-blue/20">
                  <Plus size={10} /> Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {(dados.conteudo.downloads || []).map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={item.nome} onChange={e => updateDownload(i, 'nome', e.target.value)}
                      placeholder="Nome do arquivo"
                      className="w-40 bg-nodri-surface border border-nodri-border rounded px-2.5 py-1.5 text-[12px] text-nodri-t1 outline-none focus:border-nodri-cyan" />
                    <input value={item.url} onChange={e => updateDownload(i, 'url', e.target.value)}
                      placeholder="https://..."
                      className="flex-1 bg-nodri-surface border border-nodri-border rounded px-2.5 py-1.5 text-[12px] text-nodri-t2 outline-none focus:border-nodri-cyan font-mono" />
                    <button onClick={() => removeDownload(i)} className="text-nodri-red hover:bg-nodri-red/10 p-1.5 rounded"><Trash2 size={12} /></button>
                  </div>
                ))}
                {(dados.conteudo.downloads || []).length === 0 && (
                  <p className="text-nodri-t3 text-[11px] text-center py-2">Nenhum download. Clique em "Adicionar".</p>
                )}
              </div>
            </div>

            {/* Botão salvar final */}
            <button onClick={salvar} disabled={saving}
              className="w-full py-3 bg-nodri-cyan text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all text-[13px] mb-4">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Salvar Conteúdo</>}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
