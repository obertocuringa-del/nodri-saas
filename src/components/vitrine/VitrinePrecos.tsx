'use client'
import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, Search, Info } from 'lucide-react'
import type { ServicoPublico } from '@/lib/vitrineCliente'
import { precoDoServico, agruparPorCategoria } from '@/lib/vitrineCliente'

// Tabela de preços: espelho de Serviços do Salão, no mesmo formato de
// categoria que abre. A observação cadastrada no serviço aparece junto —
// é onde costuma estar a informação que evita a pergunta ("valor por sessão",
// "depende do comprimento").

export default function VitrinePrecos({ servicos }: { servicos: ServicoPublico[] }) {
  const [abertas, setAbertas] = useState<Record<string, boolean>>({})
  const [busca, setBusca] = useState('')

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return servicos
    return servicos.filter(s =>
      s.nome.toLowerCase().includes(q) || s.categoria.toLowerCase().includes(q))
  }, [servicos, busca])

  const grupos = useMemo(() => agruparPorCategoria(filtrados), [filtrados])
  // Buscando, as categorias abrem sozinhas: obrigar a clicar de novo depois de
  // digitar faz o resultado parecer vazio.
  const buscando = busca.trim().length > 0

  if (!servicos.length) {
    return <p className="text-center text-gray-500 text-[13px] py-10">A tabela de preços ainda não foi publicada.</p>
  }

  return (
    <div>
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar serviço..."
          className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-[var(--vt-cor)]" />
      </div>

      {grupos.length === 0 && (
        <p className="text-center text-gray-500 text-[13px] py-10">Nenhum serviço encontrado.</p>
      )}

      {/* Em tela larga as categorias ficam lado a lado: uma coluna única
          deixaria a lista longa demais para percorrer. */}
      <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 lg:items-start">
        {grupos.map(([cat, itens]) => {
          const aberta = buscando || abertas[cat]
          return (
            <div key={cat} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button onClick={() => setAbertas(p => ({ ...p, [cat]: !p[cat] }))}
                className="w-full flex items-center gap-2 px-4 py-3.5 text-left">
                {aberta ? <ChevronDown size={16} className="text-gray-400 shrink-0" />
                        : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                <span className="font-bold text-[13px] text-gray-900 uppercase tracking-wide flex-1">{cat}</span>
                <span className="text-[11px] text-gray-400">{itens.length}</span>
              </button>

              {aberta && (
                <div className="border-t border-gray-100">
                  {itens.map(s => {
                    const preco = precoDoServico(s)
                    return (
                      <div key={s.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-baseline gap-3">
                          <span className="text-[13px] text-gray-800 flex-1">{s.nome}</span>
                          {preco && (
                            <span className="text-[13px] font-bold text-gray-900 whitespace-nowrap">{preco}</span>
                          )}
                        </div>
                        {s.observacao && (
                          <p className="flex items-start gap-1.5 mt-1 text-[11px] text-gray-500 leading-relaxed">
                            <Info size={12} className="shrink-0 mt-0.5" /> {s.observacao}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-gray-400 text-center mt-5 leading-relaxed">
        Valores sujeitos a alteração. Serviços marcados com “a partir de” variam
        conforme o comprimento do cabelo e o material usado.
      </p>
    </div>
  )
}
