'use client'
import { useCallback, useEffect, useState } from 'react'
import { Download, Loader2, EyeOff, Tag, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

// O cadastro de serviços conversando com a TABELA DE PREÇOS do Avec.
//
// O cartão âmbar que fica logo acima responde outra pergunta: "o que foi
// ATENDIDO e não está cadastrado". Este responde "o que o salão OFERECE e não
// está cadastrado" — pega o serviço que entrou no cardápio e ninguém pediu
// ainda, que o outro não tem como ver.
//
// Nada entra sozinho. A lista aparece, o dono manda importar. Criar cem linhas
// caladas no cadastro é o tipo de coisa que ninguém desfaz depois.

export interface DadosDaTabela {
  temTabela: boolean
  itensNaTabela?: number
  novos: { servico: string; categoria: string; preco: number }[]
  foraDaTabela: { id: string; nome: string; categoria: string }[]
  marcados: string[]
}

const VAZIO: DadosDaTabela = { temTabela: false, novos: [], foraDaTabela: [], marcados: [] }
const reais = (n: number) => `R$ ${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

export default function ServicosDaTabela({ recarregar, aoMudar }: {
  /** Muda quando a lista de serviços muda, para reconferir depois de salvar. */
  recarregar?: number
  /** Devolve os dados para a página pintar os selos verde e vermelho. */
  aoMudar?: (d: DadosDaTabela) => void
}) {
  const [d, setD] = useState<DadosDaTabela>(VAZIO)
  const [ocupado, setOcupado] = useState('')
  const [verTodos, setVerTodos] = useState(false)
  const [verFora, setVerFora] = useState(false)

  const buscar = useCallback(async () => {
    try {
      const r = await fetch('/api/servicos/tabela', { credentials: 'include' })
      if (!r.ok) return
      const nova: DadosDaTabela = { ...VAZIO, ...(await r.json()) }
      setD(nova)
      aoMudar?.(nova)
    } catch { /* sem tabela ainda: o cartão simplesmente não aparece */ }
  }, [aoMudar])

  useEffect(() => { buscar() }, [buscar, recarregar])

  async function importar() {
    setOcupado('importar')
    try {
      const r = await fetch('/api/servicos/tabela', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'importar', itens: d.novos }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Falha ao importar')
      toast.success(`${j.criados} serviço(s) cadastrado(s). Eles ficam em verde até você configurar.`)
      await buscar()
    } catch (e: any) {
      toast.error(e?.message || 'Não consegui importar')
    }
    setOcupado('')
  }

  async function dispensar(nome: string) {
    setOcupado(nome)
    try {
      await fetch('/api/servicos/tabela', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'dispensar', nome }),
      })
      await buscar()
    } catch { toast.error('Não consegui dispensar') }
    setOcupado('')
  }

  if (!d.temTabela) return null
  if (!d.novos.length && !d.foraDaTabela.length) return null

  const novosMostrados = verTodos ? d.novos : d.novos.slice(0, 5)
  const foraMostrados = verFora ? d.foraDaTabela : d.foraDaTabela.slice(0, 5)

  return (
    <div className="mb-6 space-y-3">
      {/* ── Está na tabela e não no cadastro ─────────────────────────────── */}
      {d.novos.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start gap-2.5 mb-3">
            <Tag size={16} className="text-emerald-700 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-emerald-900">
                {d.novos.length === 1
                  ? '1 serviço da tabela de preços não está cadastrado aqui'
                  : `${d.novos.length} serviços da tabela de preços não estão cadastrados aqui`}
              </p>
              <p className="text-[11px] text-emerald-800/80 mt-0.5 leading-relaxed">
                Vieram do relatório de preços do Avec. Entram com <b>nome, categoria e
                preço</b> e ficam marcados em verde até você abrir e completar comissão,
                observação e quem faz.
              </p>
            </div>
            <button onClick={importar} disabled={!!ocupado}
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-lg text-[11px] font-bold shrink-0 disabled:opacity-50">
              {ocupado === 'importar' ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Cadastrar {d.novos.length}
            </button>
          </div>

          <div className="space-y-1.5">
            {novosMostrados.map(n => (
              <div key={n.servico} className="flex items-center gap-2 bg-white border border-emerald-200/70 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-nodri-t1 truncate">{n.servico}</p>
                  <p className="text-[10.5px] text-nodri-t3">
                    {n.preco > 0 ? reais(n.preco) : 'sem preço na tabela'}
                    {n.categoria ? ` · ${n.categoria}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {d.novos.length > 5 && (
            <button onClick={() => setVerTodos(v => !v)}
              className="mt-2 text-[11px] text-emerald-800 font-semibold underline">
              {verTodos ? 'Mostrar menos' : `Ver os outros ${d.novos.length - 5}`}
            </button>
          )}
        </div>
      )}

      {/* ── Está no cadastro e sumiu da tabela ───────────────────────────── */}
      {d.foraDaTabela.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-2.5 mb-3">
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-red-900">
                {d.foraDaTabela.length === 1
                  ? '1 serviço cadastrado não está na tabela de preços'
                  : `${d.foraDaTabela.length} serviços cadastrados não estão na tabela de preços`}
              </p>
              <p className="text-[11px] text-red-800/80 mt-0.5 leading-relaxed">
                Provavelmente saíram do cardápio do Avec. <b>Isto é sugestão, não
                exclusão</b> — confira antes de apagar. Se for combo, serviço interno ou
                cortesia, que nunca esteve na tabela, use <b>não é da tabela</b>.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            {foraMostrados.map(f => (
              <div key={f.id} className="flex items-center gap-2 bg-white border border-red-200/70 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-nodri-t1 truncate">{f.nome}</p>
                  {f.categoria && <p className="text-[10.5px] text-nodri-t3">{f.categoria}</p>}
                </div>
                <button onClick={() => dispensar(f.nome)} disabled={ocupado === f.nome}
                  title="Nunca esteve na tabela — pare de avisar"
                  className="flex items-center gap-1 border border-nodri-border bg-white px-2.5 py-1.5 rounded-lg text-[11px] text-nodri-t2 shrink-0 disabled:opacity-50">
                  {ocupado === f.nome ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />}
                  não é da tabela
                </button>
              </div>
            ))}
          </div>

          {d.foraDaTabela.length > 5 && (
            <button onClick={() => setVerFora(v => !v)}
              className="mt-2 text-[11px] text-red-800 font-semibold underline">
              {verFora ? 'Mostrar menos' : `Ver os outros ${d.foraDaTabela.length - 5}`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
