'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Edit2, Trash2, Eye, EyeOff,
  Save, X, BookOpen, Search, ChevronDown, ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIAS = [
  { key: 'gestao',      label: ' Gestão do Negócio' },
  { key: 'financeiro',   label: ' Gestão Financeira' },
  { key: 'marketing',   label: ' Marketing e Vendas' },
  { key: 'equipe',      label: ' Gestão de Equipe' },
  { key: 'atendimento', label: ' Atendimento e Vendas' },
  { key: 'operacao',    label: ' Operação e Agenda' },
]


interface Artigo {
  id: string
  categoria: string
  titulo: string
  resumo: string
  conteudo: string
  emoji: string
  ordem: number
  ativo: boolean
  criado_em: string
}

const ARTIGO_VAZIO: Omit<Artigo, 'id' | 'criado_em'> = {
  categoria: 'financeiro',
  titulo: '',
  resumo: '',
  conteudo: '',
  emoji: '',
  ordem: 0,
  ativo: true,
}

export default function AdminAcademiaPage() {
  const router = useRouter()
  const [artigos, setArtigos] = useState<Artigo[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState('')
  const [modal, setModal] = useState<'novo' | 'editar' | null>(null)
  const [form, setForm] = useState<Omit<Artigo, 'id' | 'criado_em'>>(ARTIGO_VAZIO)
  const [editId, setEditId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)

  const carregar = async () => {
    setLoading(true)
    const r = await fetch('/api/academia?todos=1')
    const d = await r.json()
    setArtigos(d.artigos || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const abrirNovo = () => {
    setForm(ARTIGO_VAZIO)
    setEditId(null)
    setModal('novo')
  }

  const abrirEditar = (a: Artigo) => {
    setForm({ categoria: a.categoria, titulo: a.titulo, resumo: a.resumo, conteudo: a.conteudo, emoji: a.emoji, ordem: a.ordem, ativo: a.ativo })
    setEditId(a.id)
    setModal('editar')
  }

  const salvar = async () => {
    if (!form.titulo.trim()) return toast.error('Título obrigatório')
    if (!form.conteudo.trim()) return toast.error('Conteúdo obrigatório')
    setSalvando(true)
    try {
      const url = editId ? `/api/academia/${editId}` : '/api/academia'
      const method = editId ? 'PUT' : 'POST'
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      toast.success(editId ? 'Artigo atualizado!' : 'Artigo criado!')
      setModal(null)
      carregar()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const toggleAtivo = async (a: Artigo) => {
    const r = await fetch(`/api/academia/${a.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !a.ativo })
    })
    const d = await r.json()
    if (d.error) return toast.error(d.error)
    toast.success(a.ativo ? 'Artigo ocultado' : 'Artigo visível')
    carregar()
  }

  const excluir = async (id: string, titulo: string) => {
    if (!confirm(`Excluir "${titulo}"? Esta ação não pode ser desfeita.`)) return
    const r = await fetch(`/api/academia/${id}`, { method: 'DELETE' })
    const d = await r.json()
    if (d.error) return toast.error(d.error)
    toast.success('Artigo excluído')
    carregar()
  }

  const artigosFiltrados = artigos.filter(a => {
    const matchBusca = !busca || a.titulo.toLowerCase().includes(busca.toLowerCase())
    const matchCat = !catFiltro || a.categoria === catFiltro
    return matchBusca && matchCat
  })

  const porCategoria = CATEGORIAS.map(c => ({
    ...c,
    artigos: artigosFiltrados.filter(a => a.categoria === c.key)
  }))

  return (
    <div className="min-h-screen bg-gray-950 text-gray-900">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <ArrowLeft size={18} className="text-gray-500" />
            </button>
            <BookOpen size={20} className="text-amber-700" />
            <div>
              <h1 className="font-bold text-gray-900">Academia NODRI</h1>
              <p className="text-xs text-gray-500">{artigos.length} artigos · {artigos.filter(a => a.ativo).length} visíveis</p>
            </div>
          </div>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Plus size={16} /> Novo Artigo
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Filtros */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar artigos..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <select
            value={catFiltro}
            onChange={e => setCatFiltro(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
          >
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        {/* Lista por categoria */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {porCategoria.map(cat => (
              <div key={cat.key} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Cabeçalho da categoria */}
                <div
                  className="flex items-center justify-between px-5 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandido(expandido === cat.key ? null : cat.key)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{cat.label}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{cat.artigos.length}</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{cat.artigos.filter(a => a.ativo).length} visíveis</span>
                  </div>
                  {expandido === cat.key ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                </div>

                {/* Artigos da categoria */}
                {(expandido === cat.key || !catFiltro && !busca ? expandido === cat.key : true) && cat.artigos.length > 0 && (
                  <div className="divide-y divide-gray-800">
                    {cat.artigos.map(a => (
                      <div key={a.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50/30 transition-colors ${!a.ativo ? 'opacity-50' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{a.titulo}</p>
                          {a.resumo && <p className="text-xs text-gray-500 truncate">{a.resumo}</p>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${a.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
                            {a.ativo ? 'Visível' : 'Oculto'}
                          </span>
                          <button onClick={() => toggleAtivo(a)} title={a.ativo ? 'Ocultar' : 'Mostrar'}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-amber-700">
                            {a.ativo ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          <button onClick={() => abrirEditar(a)} title="Editar"
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-blue-700">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => excluir(a.id, a.titulo)} title="Excluir"
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-red-700">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botão adicionar na categoria */}
                <button
                  onClick={() => { setForm({ ...ARTIGO_VAZIO, categoria: cat.key }); setEditId(null); setModal('novo') }}
                  className="w-full flex items-center gap-2 px-5 py-2.5 text-xs text-gray-500 hover:text-amber-700 hover:bg-gray-50/50 transition-colors"
                >
                  <Plus size={13} /> Adicionar artigo em {cat.label}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-3xl my-8">
            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-900">{modal === 'novo' ? 'Novo Artigo' : 'Editar Artigo'}</h2>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-500">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Linha 1: Categoria + Emoji + Ordem */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
                  >
                    {CATEGORIAS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ordem</label>
                  <input
                    type="number"
                    value={form.ordem}
                    onChange={e => setForm(f => ({ ...f, ordem: Number(e.target.value) }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Título *</label>
                <input
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ex: Como calcular o ponto de equilíbrio"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Resumo */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Resumo (aparece na listagem)</label>
                <input
                  value={form.resumo}
                  onChange={e => setForm(f => ({ ...f, resumo: e.target.value }))}
                  placeholder="Uma frase que descreve o artigo"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Conteúdo */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Conteúdo * <span className="text-gray-600">(suporta ## título, • lista, **negrito**)</span>
                </label>
                <textarea
                  value={form.conteudo}
                  onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                  rows={16}
                  placeholder={`## Título da seção\n\nTexto normal do parágrafo.\n\n• Item da lista\n• Outro item\n\n**Texto em negrito**`}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-500 font-mono resize-y"
                />
              </div>

              {/* Visibilidade */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.ativo ? 'bg-green-500' : 'bg-gray-100'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.ativo ? 'left-5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm text-gray-600">{form.ativo ? 'Visível para os salões' : 'Oculto (só admin vê)'}</span>
              </div>
            </div>

            {/* Footer modal */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
              >
                <Save size={15} /> {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
