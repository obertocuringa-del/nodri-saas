'use client'
import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, ChevronLeft, Clock, CalendarDays } from 'lucide-react'
import { horariosDoDia, dataPorExtenso } from '@/lib/vitrineCliente'

// Escolha de dia e hora, usada nos dois caminhos que levam ao WhatsApp: o
// "Agendar agora" e o "Quero agendar" de uma promoção. Fica num componente só
// para os dois se comportarem igual — se um dia o calendário mudar, muda nos
// dois de uma vez.
//
// Depois de escolher, o calendário recolhe: em tela de celular ele ocupa quase
// tudo, e o que vem depois ficaria fora da vista.

export default function SeletorQuando({ data, hora, onData, onHora }: {
  data: string
  hora: string
  onData: (v: string) => void
  onHora: (v: string) => void
}) {
  const hoje = new Date()
  const [mes, setMes] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1))
  const [abertaHora, setAbertaHora] = useState(false)

  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

  const diasDoMes = useMemo(() => {
    const ano = mes.getFullYear(), m = mes.getMonth()
    const primeiro = new Date(ano, m, 1).getDay()
    const total = new Date(ano, m + 1, 0).getDate()
    const celulas: Array<string | null> = Array(primeiro).fill(null)
    for (let d = 1; d <= total; d++) {
      celulas.push(`${ano}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return celulas
  }, [mes])

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays size={16} className="text-[var(--vt-cor)]" />
          <span className="font-bold text-[13px] text-gray-900">Escolha o dia</span>
          {data && (
            <span className="ml-auto text-[12px] font-semibold text-[var(--vt-cor)]">
              {dataPorExtenso(data)}
            </span>
          )}
        </div>

        {!data ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400">
                <ChevronLeft size={16} />
              </button>
              <span className="text-[13px] font-semibold text-gray-800 capitalize">
                {mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                <div key={i} className="text-[10px] text-gray-400 py-1">{d}</div>
              ))}
              {diasDoMes.map((iso, i) => {
                if (!iso) return <div key={i} />
                const passado = iso < hojeISO
                return (
                  <button key={iso} disabled={passado} onClick={() => onData(iso)}
                    className={'aspect-square rounded-lg text-[13px] transition-all '
                      + (passado ? 'text-gray-300' : 'text-gray-700 hover:bg-gray-100')}>
                    {Number(iso.slice(-2))}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <button onClick={() => { onData(''); onHora('') }}
            className="text-[12px] text-gray-500 underline">trocar data</button>
        )}
      </div>

      {data && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-3">
          <button onClick={() => setAbertaHora(v => !v)} className="w-full flex items-center gap-2">
            <Clock size={16} className="text-[var(--vt-cor)]" />
            <span className="font-bold text-[13px] text-gray-900">Horário desejado</span>
            <span className="ml-auto text-[13px] font-semibold text-[var(--vt-cor)]">{hora || 'escolher'}</span>
            {abertaHora ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
          </button>

          {abertaHora && (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mt-3 max-h-56 overflow-y-auto">
                {horariosDoDia().map(h => (
                  <button key={h} onClick={() => { onHora(h); setAbertaHora(false) }}
                    className={'py-2 rounded-lg text-[12px] transition-all border '
                      + (hora === h ? 'bg-[var(--vt-cor)] text-white border-transparent'
                                    : 'border-gray-200 text-gray-600')}>
                    {h}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                A confirmação do horário é feita pelo salão no WhatsApp.
              </p>
            </>
          )}
        </div>
      )}
    </>
  )
}
