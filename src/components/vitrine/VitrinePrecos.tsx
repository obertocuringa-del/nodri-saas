'use client'
import { useState, useMemo } from 'react'
import { ChevronDown, Search, AlertCircle } from 'lucide-react'
import type { ServicoPublico } from '@/lib/vitrineCliente'
import { agruparPorCategoria } from '@/lib/vitrineCliente'

// Tabela de preços.
//
// A versão anterior empilhava os serviços dentro de uma caixa só, separados
// por um fio: no celular virava um bloco de texto, tudo com o mesmo peso, e
// não dava para achar um serviço batendo o olho. Agora cada serviço é uma
// faixa própria, com o nome em cima e o preço embaixo — em vez de disputarem
// a mesma linha, onde "A partir de R$ 368,00" espremia o nome do serviço.
//
// A observação sai em âmbar: ela quase sempre é a ressalva que evita
// discussão no caixa ("varia com a quantidade de produto"), e em cinza-claro
// ninguém lia.

export default function VitrinePrecos({ servicos }: { servicos: ServicoPublico[] }) {
  // Uma categoria aberta por vez: com várias abertas a tela vira uma lista
  // longa demais e o cliente perde de vista onde estava.
  const [categoriaAberta, setAberta] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return servicos
    return servicos.filter(s =>
      s.nome.toLowerCase().includes(q) || s.categoria.toLowerCase().includes(q))
  }, [servicos, busca])

  const grupos = useMemo(() => agruparPorCategoria(filtrados), [filtrados])
  const buscando = busca.trim().length > 0

  if (!servicos.length) {
    return <p className="text-center text-gray-500 text-[13px] py-10">A tabela de preços ainda não foi publicada.</p>
  }

  return (
    <div>
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar serviço..."
          className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-3 py-3 text-[14px] outline-none focus:border-[var(--vt-cor)] shadow-sm" />
      </div>

      {grupos.length === 0 && (
        <p className="text-center text-gray-500 text-[13px] py-10">Nenhum serviço encontrado.</p>
      )}

      <div className="space-y-3">
        {grupos.map(([cat, itens]) => {
          const aberta = buscando || categoriaAberta === cat
          return (
            <div key={cat}>
              {/* A categoria é o botão graúdo; os serviços descem por baixo
                  dela como itens soltos, e não dentro de outra caixa. */}
              <button onClick={() => setAberta(a => (a === cat ? null : cat))}
                className={'w-full flex items-center gap-3 px-4 py-3.5 text-left bg-white rounded-2xl border transition shadow-sm '
                  + (aberta ? 'border-[var(--vt-cor)]' : 'border-gray-200')}>
                <span className="font-bold text-[13px] text-gray-900 uppercase tracking-wide flex-1">{cat}</span>
                <span className="text-[11px] text-gray-400 tabular-nums">{itens.length}</span>
                <ChevronDown size={16}
                  className={'text-gray-400 shrink-0 transition-transform ' + (aberta ? 'rotate-180' : '')} />
              </button>

              {aberta && (
                <div className="mt-2 space-y-2 pl-2">
                  {itens.map(s => (
                    <div key={s.id}
                      className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm
                                 border-l-[3px] border-l-[var(--vt-cor)]">
                      <p className="text-[14px] text-gray-900 font-medium leading-snug">{s.nome}</p>

                      {(s.precoFixo || s.precoMin) && (
                        <p className="mt-1 flex items-baseline gap-1.5">
                          {!s.precoFixo && s.precoMin && (
                            <span className="text-[11px] text-gray-400">a partir de</span>
                          )}
                          <span className="text-[15px] font-bold text-[var(--vt-cor)] tabular-nums">
                            R$ {Number(s.precoFixo || s.precoMin).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </p>
                      )}

                      {s.observacao && (
                        <p className="flex items-start gap-1.5 mt-2 text-[11.5px] text-amber-700 bg-amber-50
                                      border border-amber-100 rounded-lg px-2 py-1.5 leading-relaxed">
                          <AlertCircle size={13} className="shrink-0 mt-[1px]" />
                          <span>{s.observacao}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-gray-400 text-center mt-6 leading-relaxed">
        Valores sujeitos a alteração. Serviços marcados com “a partir de” variam
        conforme o comprimento do cabelo e o material usado.
      </p>
    </div>
  )
}
