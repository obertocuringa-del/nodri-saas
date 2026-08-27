'use client'
import { useState, useMemo } from 'react'
import { Share2, CalendarCheck, Check } from 'lucide-react'
import type { AcaoPublica } from '@/lib/vitrineCliente'
import { mensagemInteresseAcao, linkWhatsapp } from '@/lib/vitrineCliente'

// Ações comerciais como o cliente vê: os mesmos filtros da tela interna
// (todas / ativas / futuras / encerradas + categoria), mas o card mostra só
// imagem, descrição e categoria. O texto de "como lançar no sistema" é
// instrução para a equipe e não chega aqui.

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'ativa', label: 'Ativas' },
  { id: 'agendada', label: 'Futuras' },
  { id: 'encerrada', label: 'Encerradas' },
] as const

const CORES: Record<string, { bg: string; cor: string; label: string }> = {
  ativa: { bg: '#ec489922', cor: '#db2777', label: 'Ativa' },
  agendada: { bg: '#8b5cf622', cor: '#7c3aed', label: 'Em breve' },
  encerrada: { bg: '#6b728022', cor: '#4b5563', label: 'Encerrada' },
}

export default function VitrineAcoes({ acoes, salao, whatsapp }: {
  acoes: AcaoPublica[]
  salao: string
  whatsapp: string | null
}) {
  const [filtro, setFiltro] = useState<string>('ativa')
  const [categoria, setCategoria] = useState('')
  const [selecionadas, setSelecionadas] = useState<string[]>([])

  const categorias = useMemo(
    () => [...new Set(acoes.map(a => a.categoria).filter(Boolean))].sort(),
    [acoes])

  const lista = useMemo(() => acoes.filter(a =>
    (filtro === 'todas' || a.status === filtro) &&
    (!categoria || a.categoria === categoria)
  ), [acoes, filtro, categoria])

  function alternar(id: string) {
    setSelecionadas(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  /** Uma promoção só, ou o pacote que o cliente marcou. */
  function agendar(alvo?: AcaoPublica) {
    const itens = alvo ? [alvo] : acoes.filter(a => selecionadas.includes(a.id))
    if (!itens.length) return
    const texto = itens.length === 1
      ? mensagemInteresseAcao(salao, itens[0].titulo, itens[0].descricao)
      : [`Olá, ${salao}! Vi estas promoções na página de vocês e gostaria de agendar:`, '',
         ...itens.map(i => `• ${i.titulo}${i.descricao ? ` — ${i.descricao}` : ''}`)].join('\n')
    window.open(linkWhatsapp(whatsapp, texto), '_blank')
  }

  function compartilhar(a: AcaoPublica) {
    const texto = [a.titulo, a.descricao].filter(Boolean).join('\n\n')
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.share) {
      navigator.share({ title: a.titulo, text: texto, url }).catch(() => { /* cancelou */ })
    } else {
      window.open(linkWhatsapp(null, `${texto}\n\n${url}`), '_blank')
    }
  }

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
        {FILTROS.map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            className={'shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all border '
              + (filtro === f.id
                ? 'bg-[var(--vt-cor)] text-white border-transparent'
                : 'bg-white text-gray-600 border-gray-200')}>
            {f.label}
          </button>
        ))}
      </div>

      {categorias.length > 0 && (
        <select value={categoria} onChange={e => setCategoria(e.target.value)}
          className="w-full mb-4 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-700 outline-none">
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )}

      {lista.length === 0 && (
        <p className="text-center text-gray-500 text-[13px] py-10">
          Nenhuma promoção por aqui no momento. Volte em breve!
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {lista.map(a => {
          const c = CORES[a.status] || CORES.ativa
          const marcada = selecionadas.includes(a.id)
          return (
            <div key={a.id}
              className={'bg-white rounded-2xl overflow-hidden border transition-all '
                + (marcada ? 'border-[var(--vt-cor)] ring-2 ring-[var(--vt-cor)]/20' : 'border-gray-200')}>
              {a.capa && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.capa} alt={a.titulo} className="w-full aspect-[4/3] object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                    style={{ background: c.bg, color: c.cor }}>{c.label}</span>
                  {a.categoria && <span className="text-[11px] text-gray-500">{a.categoria}</span>}
                </div>

                <h3 className="font-bold text-[15px] text-gray-900 mb-1">{a.titulo}</h3>
                {a.descricao && (
                  <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">{a.descricao}</p>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <button onClick={() => agendar(a)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--vt-cor)] text-white py-2.5 rounded-xl text-[13px] font-semibold">
                    <CalendarCheck size={15} /> Quero agendar
                  </button>
                  <button onClick={() => compartilhar(a)} title="Compartilhar"
                    className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500">
                    <Share2 size={16} />
                  </button>
                  <button onClick={() => alternar(a.id)} title="Selecionar"
                    className={'w-11 h-11 shrink-0 flex items-center justify-center rounded-xl border transition-all '
                      + (marcada ? 'bg-[var(--vt-cor)] border-transparent text-white' : 'border-gray-200 text-gray-400')}>
                    <Check size={16} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Barra do pacote: aparece só quando o cliente marca mais de uma, e
          manda todas numa mensagem só em vez de uma conversa por promoção. */}
      {selecionadas.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 shadow-lg z-30">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <span className="text-[13px] text-gray-600">
              {selecionadas.length} selecionada{selecionadas.length > 1 ? 's' : ''}
            </span>
            <button onClick={() => setSelecionadas([])} className="text-[12px] text-gray-400 underline">limpar</button>
            <button onClick={() => agendar()}
              className="ml-auto flex items-center gap-1.5 bg-[var(--vt-cor)] text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold">
              <CalendarCheck size={15} /> Agendar selecionadas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
