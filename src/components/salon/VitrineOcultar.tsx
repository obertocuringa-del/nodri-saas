'use client'
import { useState, useEffect, useMemo } from 'react'
import { Eye, EyeOff, ChevronDown, Loader2, Save, Search } from 'lucide-react'
import toast from 'react-hot-toast'

// O que a cliente vê na tabela de preços do link.
//
// Ocultar, e não excluir: o serviço continua inteiro no salão — preço,
// comissão, histórico. Aqui se decide apenas o que se anuncia, porque nem
// tudo que o salão faz vai para a vitrine (serviço interno, combo antigo,
// procedimento que só se faz com hora marcada).
//
// O que some daqui também some do agendamento: ninguém pode pedir o que não
// está no cardápio.

interface Servico { id: string; categoria: string; nome: string }

export default function VitrineOcultar({ aoFechar }: { aoFechar?: () => void }) {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [ocultosServ, setOcultosServ] = useState<Set<string>>(new Set())
  const [ocultasCat, setOcultasCat] = useState<Set<string>>(new Set())
  const [abertas, setAbertas] = useState<Record<string, boolean>>({})
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/servicos').then(r => (r.ok ? r.json() : [])),
      fetch('/api/salon/vitrine').then(r => (r.ok ? r.json() : null)),
    ]).then(([srv, cfg]) => {
      setServicos(Array.isArray(srv) ? srv : [])
      setOcultosServ(new Set(cfg?.config?.ocultos?.servicos || []))
      setOcultasCat(new Set(cfg?.config?.ocultos?.categorias || []))
    }).catch(() => toast.error('Não consegui carregar os serviços'))
      .finally(() => setCarregando(false))
  }, [])

  const grupos = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const lista = q
      ? servicos.filter(s => s.nome.toLowerCase().includes(q) || (s.categoria || '').toLowerCase().includes(q))
      : servicos
    const mapa = new Map<string, Servico[]>()
    for (const s of lista) {
      const c = s.categoria || 'Outros'
      if (!mapa.has(c)) mapa.set(c, [])
      mapa.get(c)!.push(s)
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [servicos, busca])

  function alternarServico(id: string) {
    setOcultosServ(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function alternarCategoria(cat: string) {
    setOcultasCat(prev => {
      const n = new Set(prev)
      n.has(cat) ? n.delete(cat) : n.add(cat)
      return n
    })
  }

  async function salvar() {
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/vitrine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'ocultos',
          servicos: [...ocultosServ],
          categorias: [...ocultasCat],
        }),
      })
      if (!r.ok) { toast.error('Não foi possível salvar'); return }
      toast.success('Pronto! A página do cliente já mostra só o que você escolheu.')
      aoFechar?.()
    } catch { toast.error('Erro de conexão') }
    finally { setSalvando(false) }
  }

  const totalOculto = ocultosServ.size
  const visiveis = servicos.filter(s =>
    !ocultosServ.has(s.id) && !ocultasCat.has(s.categoria || 'Outros')).length

  if (carregando) {
    return <div className="flex items-center gap-2 text-nodri-t3 text-[12px] py-4">
      <Loader2 size={13} className="animate-spin" /> Carregando serviços...
    </div>
  }

  return (
    <div>
      <p className="text-[11px] text-nodri-t3 mb-3 leading-relaxed">
        Desmarque o que <b>não</b> deve aparecer no link. Nada é apagado do
        sistema — o serviço continua aqui dentro com preço e comissão. O que
        você ocultar também não pode ser pedido no agendamento.
      </p>

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nodri-t3" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar serviço ou categoria..."
            className="w-full nodri-input text-[12px] pl-8" />
        </div>
        <span className="text-[11px] text-nodri-t3 whitespace-nowrap">
          {visiveis} visível{visiveis === 1 ? '' : 'eis'}
          {(totalOculto || ocultasCat.size) ? ` · ${totalOculto + ocultasCat.size} oculto(s)` : ''}
        </span>
      </div>

      <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
        {grupos.map(([cat, itens]) => {
          const catOculta = ocultasCat.has(cat)
          return (
            <div key={cat} className={'border rounded-lg overflow-hidden '
              + (catOculta ? 'border-nodri-border bg-nodri-surface opacity-60' : 'border-nodri-border')}>
              <div className="flex items-center gap-2 px-3 py-2">
                <button onClick={() => setAbertas(p => ({ ...p, [cat]: !p[cat] }))}
                  className="flex items-center gap-2 flex-1 text-left">
                  <ChevronDown size={14}
                    className={'text-nodri-t3 transition-transform ' + (abertas[cat] ? '' : '-rotate-90')} />
                  <span className="font-semibold text-[12px] text-gray-900 uppercase tracking-wide">{cat}</span>
                  <span className="text-[10px] text-nodri-t3">{itens.length}</span>
                </button>

                {/* Ocultar a categoria inteira: mais rápido que desmarcar 30
                    serviços um a um quando a seção toda é interna. */}
                <button onClick={() => alternarCategoria(cat)}
                  title={catOculta ? 'Mostrar categoria' : 'Ocultar categoria inteira'}
                  className={'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold '
                    + (catOculta ? 'bg-gray-200 text-gray-600' : 'bg-nodri-cyan/15 text-nodri-purple')}>
                  {catOculta ? <EyeOff size={11} /> : <Eye size={11} />}
                  {catOculta ? 'Oculta' : 'Visível'}
                </button>
              </div>

              {abertas[cat] && !catOculta && (
                <div className="border-t border-nodri-border">
                  {itens.map(s => {
                    const oculto = ocultosServ.has(s.id)
                    return (
                      <button key={s.id} onClick={() => alternarServico(s.id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left border-b border-nodri-border/40 last:border-0">
                        {oculto ? <EyeOff size={12} className="text-nodri-t3 shrink-0" />
                                : <Eye size={12} className="text-nodri-cyan shrink-0" />}
                        <span className={'text-[12px] flex-1 ' + (oculto ? 'text-nodri-t3 line-through' : 'text-nodri-t1')}>
                          {s.nome}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={salvar} disabled={salvando}
        className="mt-3 flex items-center gap-1.5 bg-nodri-cyan text-black px-4 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50">
        {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
        Salvar o que aparece
      </button>
    </div>
  )
}
