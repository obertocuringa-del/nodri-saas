'use client'
import { useState, useEffect } from 'react'
import { Loader2, Trash2, Plus, ArrowLeft, Pencil, Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Servico {
  id: string
  categoria: string
  nome: string
  preco_fixo: number | null
  preco_min: number | null
  comissao_valor: number | null
  observacao: string | null
  ciclo_retorno_dias: number | null
  ativo: boolean
}

const inputCls = "w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-nodri-cyan/40 transition-colors text-nodri-t1"
const labelCls = "text-[10px] text-nodri-t3 uppercase tracking-wider mb-1 block"

const CATEGORIAS = [
  'Coloração', 'Complementos', 'Corte e Barba', 'Depilação',
  'Estética Corporal', 'Estética Facial', 'Finalização', 'Maquiagem',
  'Massagem', 'Nutrição e Tratamento', 'Penteado e Realinhamento',
  'Remoção de Tatuagem', 'Sobrancelhas e Cílios', 'Unhas', 'Outros'
]

function fmtPreco(s: Servico) {
  if (s.preco_fixo) return `R$ ${Number(s.preco_fixo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  if (s.preco_min) return `A partir de R$ ${Number(s.preco_min).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  return '—'
}

export default function ServicosPage() {
  const router = useRouter()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriasAbertas, setCategoriasAbertas] = useState<Record<string, boolean>>({})
  const [editando, setEditando] = useState<Servico | null>(null)
  const [novo, setNovo] = useState(false)
  const [form, setForm] = useState({ categoria: '', nome: '', preco_tipo: 'fixo', preco: '', comissao_valor: '', observacao: '', ciclo_retorno_dias: '' })
  const [salvando, setSalvando] = useState(false)
  const [deletando, setDeletando] = useState<string | null>(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const res = await fetch('/api/servicos')
    const data = await res.json()
    setServicos(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const categorias = [...new Set(servicos.map(s => s.categoria))].sort()

  function toggleCategoria(cat: string) {
    setCategoriasAbertas(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  function iniciarNovo() {
    setForm({ categoria: CATEGORIAS[0], nome: '', preco_tipo: 'fixo', preco: '', comissao_valor: '', observacao: '', ciclo_retorno_dias: '' })
    setEditando(null)
    setNovo(true)
  }

  function iniciarEdicao(s: Servico) {
    setEditando(s)
    setNovo(false)
    setForm({
      categoria: s.categoria,
      nome: s.nome,
      preco_tipo: s.preco_fixo ? 'fixo' : 'min',
      preco: String(s.preco_fixo || s.preco_min || ''),
      comissao_valor: String(s.comissao_valor || ''),
      observacao: s.observacao || '',
      ciclo_retorno_dias: String(s.ciclo_retorno_dias || '')
    })
  }

  function cancelar() {
    setEditando(null)
    setNovo(false)
  }

  async function salvar() {
    if (!form.nome || !form.categoria) return toast.error('Preencha categoria e nome')
    setSalvando(true)
    const preco_fixo = form.preco_tipo === 'fixo' ? parseFloat(form.preco) || null : null
    const preco_min = form.preco_tipo === 'min' ? parseFloat(form.preco) || null : null
    const comissao_valor = parseFloat(form.comissao_valor) || null
    const ciclo_retorno_dias = parseInt(form.ciclo_retorno_dias) || null

    try {
      if (novo) {
        const res = await fetch('/api/servicos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, preco_fixo, preco_min, comissao_valor, ciclo_retorno_dias })
        })
        if (!res.ok) throw new Error()
        toast.success('Serviço adicionado!')
      } else if (editando) {
        const res = await fetch('/api/servicos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editando.id, ...form, preco_fixo, preco_min, comissao_valor, ciclo_retorno_dias, ativo: editando.ativo })
        })
        if (!res.ok) throw new Error()
        toast.success('Serviço atualizado!')
      }
      cancelar()
      await carregar()
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id: string) {
    if (!confirm('Excluir este serviço?')) return
    setDeletando(id)
    try {
      const res = await fetch(`/api/servicos?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Serviço excluído')
      await carregar()
    } catch {
      toast.error('Erro ao excluir')
    } finally {
      setDeletando(null)
    }
  }

  async function toggleAtivo(s: Servico) {
    await fetch('/api/servicos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...s, ativo: !s.ativo })
    })
    await carregar()
  }

  return (
    <div className="min-h-screen bg-nodri-bg text-nodri-t1">
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-nodri-card transition-colors text-nodri-t3 hover:text-nodri-t1">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-[16px] font-bold text-nodri-t1">Serviços do Salão</h1>
            <p className="text-[11px] text-nodri-t3">{servicos.length} serviços cadastrados</p>
          </div>
          <button
            onClick={iniciarNovo}
            className="ml-auto flex items-center gap-2 bg-nodri-cyan/10 border border-nodri-cyan/30 text-nodri-cyan px-3 py-2 rounded-lg text-[11px] font-medium hover:bg-nodri-cyan/20 transition-colors"
          >
            <Plus size={14} />
            Novo Serviço
          </button>
        </div>

        {/* Formulário novo / edição */}
        {(novo || editando) && (
          <div className="bg-nodri-card border border-nodri-border rounded-xl p-4 mb-6 space-y-3">
            <h2 className="text-[13px] font-semibold text-nodri-t1">{novo ? 'Novo Serviço' : 'Editar Serviço'}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Categoria</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className={inputCls}>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Nome do Serviço</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={inputCls} placeholder="Ex: Manicure" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Tipo de Preço</label>
                <select value={form.preco_tipo} onChange={e => setForm(f => ({ ...f, preco_tipo: e.target.value }))} className={inputCls}>
                  <option value="fixo">Preço Fixo</option>
                  <option value="min">A partir de</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Valor (R$)</label>
                <input type="number" value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))} className={inputCls} placeholder="0,00" step="0.01" />
              </div>
              <div>
                <label className={labelCls}>Comissão Líquida (R$)</label>
                <input type="number" value={form.comissao_valor} onChange={e => setForm(f => ({ ...f, comissao_valor: e.target.value }))} className={inputCls} placeholder="0,00" step="0.01" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Observação (opcional)</label>
              <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} className={inputCls} placeholder="Ex: variações disponíveis" />
            </div>

            <div>
              <label className={labelCls}>Ciclo de retorno (dias)</label>
              <input type="number" min="1" value={form.ciclo_retorno_dias} onChange={e => setForm(f => ({ ...f, ciclo_retorno_dias: e.target.value }))} className={inputCls} placeholder="Ex: 7 para manicure, 90 para realinhamento" />
              <p className="text-[10px] text-nodri-t3 mt-1">Usado na análise de clientes perdidos — tempo mínimo para considerar a cliente como perdida</p>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={salvar} disabled={salvando} className="flex items-center gap-2 bg-nodri-cyan/10 border border-nodri-cyan/30 text-nodri-cyan px-4 py-2 rounded-lg text-[11px] font-medium hover:bg-nodri-cyan/20 transition-colors disabled:opacity-50">
                {salvando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Salvar
              </button>
              <button onClick={cancelar} className="flex items-center gap-2 bg-nodri-card border border-nodri-border text-nodri-t3 px-4 py-2 rounded-lg text-[11px] font-medium hover:text-nodri-t1 transition-colors">
                <X size={13} /> Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-nodri-t3">
            <Loader2 size={20} className="animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <div className="space-y-2">
            {categorias.map(cat => {
              const itens = servicos.filter(s => s.categoria === cat)
              const aberta = categoriasAbertas[cat] !== false
              return (
                <div key={cat} className="bg-nodri-card border border-nodri-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleCategoria(cat)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/2 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {aberta ? <ChevronDown size={14} className="text-nodri-t3" /> : <ChevronRight size={14} className="text-nodri-t3" />}
                      <span className="text-[12px] font-semibold text-nodri-t1 uppercase tracking-wide">{cat}</span>
                    </div>
                    <span className="text-[10px] text-nodri-t3 bg-nodri-border/40 px-2 py-0.5 rounded-full">{itens.length}</span>
                  </button>

                  {aberta && (
                    <div className="border-t border-nodri-border divide-y divide-nodri-border/40">
                      {itens.map(s => (
                        <div key={s.id} className={`flex items-center gap-3 px-4 py-2.5 ${!s.ativo ? 'opacity-40' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-nodri-t1 truncate">{s.nome}</p>
                            {s.observacao && <p className="text-[10px] text-nodri-t3">{s.observacao}</p>}
                          </div>
                          <span className="text-[12px] font-medium text-nodri-cyan whitespace-nowrap">{fmtPreco(s)}</span>
                          {s.comissao_valor && (
                            <span className="text-[10px] text-green-400 whitespace-nowrap">
                              comissão R$ {Number(s.comissao_valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleAtivo(s)}
                              title={s.ativo ? 'Desativar' : 'Ativar'}
                              className={`w-8 h-4 rounded-full transition-colors ${s.ativo ? 'bg-nodri-cyan/40' : 'bg-nodri-border'}`}
                            >
                              <div className={`w-3 h-3 rounded-full bg-white mx-auto transition-transform ${s.ativo ? 'translate-x-1.5' : '-translate-x-1.5'}`} />
                            </button>
                            <button onClick={() => iniciarEdicao(s)} className="p-1.5 rounded-md hover:bg-nodri-border/40 text-nodri-t3 hover:text-nodri-t1 transition-colors">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => excluir(s.id)} disabled={deletando === s.id} className="p-1.5 rounded-md hover:bg-red-500/10 text-nodri-t3 hover:text-red-400 transition-colors">
                              {deletando === s.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
