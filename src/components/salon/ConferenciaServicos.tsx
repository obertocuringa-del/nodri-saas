'use client'
import { useState, useEffect } from 'react'
import { AlertTriangle, Plus, EyeOff, Loader2, ChevronDown, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

// Aviso no topo de Serviços do Salão: o que a planilha tem e o cadastro não.
//
// O salão cadastra um procedimento novo no sistema dele e esquece de cadastrar
// aqui. Ele passa a aparecer nos relatórios e continua fora da tabela de
// preços, da vitrine e das comissões — e ninguém descobre, porque não há por
// que ir procurar. Este cartão vai atrás.
//
// Confere toda vez que a página abre, e não só depois de importar: assim
// também pega o que entrou nas importações anteriores.

interface Ausente { nome: string; categoria: string; valorSugerido: number | null; atendimentos: number }
interface Divergente {
  nome: string; servicoId: string; cadastrado: number
  tipo: 'fixo' | 'minimo'; cobrado: number; atendimentos: number
}

export interface PreenchimentoServico {
  nome: string
  categoria: string
  preco: string
}

const reais = (n: number) => `R$ ${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

export default function ConferenciaServicos({ categorias, aoCadastrar, recarregar }: {
  categorias: string[]
  aoCadastrar: (dados: PreenchimentoServico) => void
  /** Muda quando a lista de serviços muda, para reconferir depois de salvar. */
  recarregar?: number
}) {
  const [ausentes, setAusentes] = useState<Ausente[]>([])
  const [divergentes, setDivergentes] = useState<Divergente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [verValores, setVerValores] = useState(false)
  const [verTodos, setVerTodos] = useState(false)

  useEffect(() => {
    fetch('/api/servicos/conferencia')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        setAusentes(Array.isArray(d?.ausentes) ? d.ausentes : [])
        setDivergentes(Array.isArray(d?.divergentes) ? d.divergentes : [])
      })
      .catch(() => { /* sem planilha ainda: o cartão simplesmente não aparece */ })
      .finally(() => setCarregando(false))
  }, [recarregar])

  async function ignorar(nome: string) {
    setOcupado(nome)
    try {
      const r = await fetch('/api/servicos/conferencia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      if (!r.ok) { toast.error('Não consegui salvar'); return }
      const d = await r.json()
      setAusentes(d.ausentes || [])
      setDivergentes(d.divergentes || [])
      toast.success('Não aviso mais sobre esse nome.')
    } catch { toast.error('Erro de conexão') }
    finally { setOcupado(null) }
  }

  // A categoria da planilha nem sempre é uma das do NODRI ("Shampoo" x
  // "Nutrição e Tratamento"): só aproveita quando bate, senão deixa o dono
  // escolher no formulário.
  function categoriaConhecida(cat: string): string {
    const igual = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    return categorias.find(c => igual(c) === igual(cat)) || ''
  }

  // Mesmo motivo do cartão dos profissionais: sumir enquanto carrega parece
  // que o aviso não existe.
  if (carregando) {
    return (
      <div className="mb-6 flex items-center gap-2 bg-nodri-surface border border-nodri-border rounded-xl px-4 py-3 text-[12px] text-nodri-t3">
        <Loader2 size={14} className="animate-spin" />
        Conferindo a planilha contra os serviços cadastrados…
      </div>
    )
  }
  if (!ausentes.length && !divergentes.length) return null

  const mostrados = verTodos ? ausentes : ausentes.slice(0, 5)

  return (
    <div className="mb-6 space-y-3">
      {ausentes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2.5 mb-3">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-amber-900">
                {ausentes.length === 1
                  ? '1 serviço da planilha não está cadastrado aqui'
                  : `${ausentes.length} serviços da planilha não estão cadastrados aqui`}
              </p>
              <p className="text-[11px] text-amber-800/80 mt-0.5 leading-relaxed">
                Foram atendidos e não aparecem na tabela de preços, na página do
                cliente nem no cálculo de comissão. Se já existe com outro nome,
                use <b>Já tenho</b> e o aviso some.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            {mostrados.map(a => (
              <div key={a.nome}
                className="flex items-center gap-2 bg-white border border-amber-200/70 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-nodri-t1 truncate">{a.nome}</p>
                  <p className="text-[10.5px] text-nodri-t3">
                    {a.atendimentos} atendimento{a.atendimentos === 1 ? '' : 's'}
                    {a.valorSugerido ? ` · normalmente ${reais(a.valorSugerido)}` : ''}
                    {a.categoria ? ` · ${a.categoria}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => aoCadastrar({
                    nome: a.nome,
                    categoria: categoriaConhecida(a.categoria),
                    preco: a.valorSugerido ? String(a.valorSugerido) : '',
                  })}
                  className="flex items-center gap-1 bg-nodri-cyan text-black px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0">
                  <Plus size={12} /> Cadastrar
                </button>
                <button onClick={() => ignorar(a.nome)} disabled={ocupado === a.nome}
                  title="Já existe aqui com outro nome"
                  className="flex items-center gap-1 border border-nodri-border bg-white px-2.5 py-1.5 rounded-lg text-[11px] text-nodri-t2 shrink-0 disabled:opacity-50">
                  {ocupado === a.nome ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />}
                  Já tenho
                </button>
              </div>
            ))}
          </div>

          {ausentes.length > 5 && (
            <button onClick={() => setVerTodos(v => !v)}
              className="mt-2 text-[11px] text-amber-800 font-semibold underline">
              {verTodos ? 'Mostrar menos' : `Ver os outros ${ausentes.length - 5}`}
            </button>
          )}
        </div>
      )}

      {divergentes.length > 0 && (
        <div className="bg-nodri-card border border-nodri-border rounded-xl p-4">
          {/* Só informa. Diferença quase sempre é desconto ou promoção do dia,
              e virar cobrança automática de correção faria o dono "arrumar" um
              preço que estava certo. */}
          <button onClick={() => setVerValores(v => !v)}
            className="w-full flex items-center gap-2.5 text-left">
            <TrendingUp size={15} className="text-nodri-t3 shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-nodri-t1">
                {divergentes.length === 1
                  ? '1 serviço foi cobrado ACIMA do valor cadastrado'
                  : `${divergentes.length} serviços foram cobrados ACIMA do valor cadastrado`}
              </p>
              <p className="text-[11px] text-nodri-t3 mt-0.5">
                Estes serviços <b>existem no cadastro</b> — não é falta de cadastro. Cobraram mais do que o preço daqui, então o preço cadastrado pode ter ficado para trás. Cobrança abaixo do cadastrado não entra: é o aumento que você já fez e o histórico ainda não mostra.
              </p>
            </div>
            <ChevronDown size={15}
              className={'text-nodri-t3 shrink-0 transition-transform ' + (verValores ? 'rotate-180' : '')} />
          </button>

          {verValores && (
            <div className="mt-3 space-y-1.5">
              {divergentes.map(d => (
                <div key={d.servicoId}
                  className="flex items-center gap-2 bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-nodri-t1 truncate">{d.nome}</p>
                    {/* "Está cadastrado" na frente de propósito: sem isso a linha
                        se parece com a do aviso de cima e já foi lida como "não
                        tenho esse serviço", quando diz o contrário. */}
                    <p className="text-[10.5px] text-nodri-t3">
                      <span className="text-green-700 font-semibold">Está cadastrado</span>
                      {d.tipo === 'fixo' ? ' por ' : ' a partir de '}{reais(d.cadastrado)}
                      {' — cobrado '}{reais(d.cobrado)} em {d.atendimentos} atendimento{d.atendimentos === 1 ? '' : 's'}.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
