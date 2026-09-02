'use client'
import { useState, useMemo } from 'react'
import { Share2, CalendarCheck, Check, ChevronDown } from 'lucide-react'
import type { AcaoPublica, ServicoPublico, ProfissionalPublico } from '@/lib/vitrineCliente'
import { linkWhatsapp } from '@/lib/vitrineCliente'
import ModalAgendarAcao from './ModalAgendarAcao'

// Ações comerciais como o cliente vê: o card mostra só imagem, descrição e
// categoria. O texto de "como lançar no sistema" é instrução para a equipe e
// não chega aqui.
//
// Os filtros são "Todas" e "Encerradas", só. Havia também "Ativas" e
// "Futuras": a cliente abria o link, caía num filtro e não achava a promoção
// que tinha visto no story, porque ela estava na outra aba. Em "Todas" ela vê
// tudo o que o salão publicou — que é o ponto de mandar o link.

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'encerrada', label: 'Encerradas' },
] as const

const CORES: Record<string, { bg: string; cor: string; label: string }> = {
  ativa: { bg: '#ec489922', cor: '#db2777', label: 'Ativa' },
  agendada: { bg: '#8b5cf622', cor: '#7c3aed', label: 'Em breve' },
  encerrada: { bg: '#6b728022', cor: '#4b5563', label: 'Encerrada' },
}

export default function VitrineAcoes({ acoes, servicos, profissionais, whatsapp, horario }: {
  acoes: AcaoPublica[]
  servicos: ServicoPublico[]
  profissionais: ProfissionalPublico[]
  whatsapp: string | null
  /** Faixa de atendimento do salão; ausente cai no padrão. */
  horario?: { abertura: string; fechamento: string } | null
}) {
  // Abre em "Todas". Era 'ativa', que com a aba de Ativas removida deixaria a
  // cliente presa: nenhum botão apareceria marcado e ela não teria como voltar
  // a ver tudo.
  const [filtro, setFiltro] = useState<string>('todas')
  const [categoria, setCategoria] = useState('')
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  // Uma descricao aberta por vez — varias abertas devolvem o muro de texto.
  const [detalhe, setDetalhe] = useState<string | null>(null)
  // O que o cliente vai agendar: uma promoção ou o pacote marcado.
  const [agendando, setAgendando] = useState<AcaoPublica[] | null>(null)

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

  /** Abre o fluxo de dia/hora/profissional para uma promoção ou para o
   *  pacote marcado — o mesmo caminho do "Agendar agora". */
  function agendar(alvo?: AcaoPublica) {
    const itens = alvo ? [alvo] : acoes.filter(a => selecionadas.includes(a.id))
    if (itens.length) setAgendando(itens)
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
            className={'shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition border '
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

      {/* Duas colunas já no celular: um card por linha ocupava a tela inteira
          para uma promoção só, e era preciso rolar muito para ver o que existe.
          Com metade da largura o card muda de forma — selecionar vira uma
          marca sobre a imagem, e só sobram dois botões embaixo, que é o que
          cabe em ~180px. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {lista.map(a => {
          const c = CORES[a.status] || CORES.ativa
          const marcada = selecionadas.includes(a.id)
          return (
            <div key={a.id}
              className={'bg-white rounded-2xl overflow-hidden border transition flex flex-col '
                + (marcada ? 'border-[var(--vt-cor)] ring-2 ring-[var(--vt-cor)]/20' : 'border-gray-200')}>

              {/* A arte aparece INTEIRA, como o profissional já a vê.
                  Estava em 4/3 recortando pelo centro, e a arte do salão é 4/5:
                  o topo e o rodapé sumiam — justamente onde ficam o nome da
                  promoção e a validade. Mesmo truque da tela do profissional: a
                  própria arte desfocada preenche a sobra, e a de cima entra
                  inteira por object-contain. */}
              <div className="relative aspect-[4/5] bg-gray-900 overflow-hidden">
                {a.capa && (<>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.capa} alt="" aria-hidden
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl brightness-50" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.capa} alt={a.titulo}
                    className="relative w-full h-full object-contain" />
                </>)}
                <button onClick={() => alternar(a.id)} title="Selecionar"
                  className={'absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full border shadow-sm transition '
                    + (marcada
                      ? 'bg-[var(--vt-cor)] border-transparent text-white'
                      : 'bg-white/90 border-gray-200 text-gray-400')}>
                  <Check size={15} />
                </button>
              </div>

              <div className="p-3 sm:p-4 flex flex-col flex-1">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                    style={{ background: c.bg, color: c.cor }}>{c.label}</span>
                  {a.categoria && <span className="text-[10px] sm:text-[11px] text-gray-500 truncate">{a.categoria}</span>}
                </div>

                <h3 className="font-bold text-[13px] sm:text-[15px] text-gray-900 mb-1 leading-snug">{a.titulo}</h3>

                {/* Preço com hierarquia: o cheio riscado e discreto, o final
                    grande e vermelho. Digitado dentro do título, tudo isso saía
                    do mesmo tamanho e na mesma cor. */}
                {a.preco && (
                  <div className="flex items-baseline gap-1.5 flex-wrap mb-1.5">
                    {a.preco.de && (
                      <span className="text-[11px] sm:text-[12px] text-gray-400 line-through">{a.preco.de}</span>
                    )}
                    <span className="text-[16px] sm:text-[19px] font-extrabold text-red-600 leading-none">{a.preco.por}</span>
                    {a.preco.descontoPct !== null && (
                      <span className="text-[9.5px] sm:text-[10.5px] font-extrabold text-white bg-green-600 rounded-full px-1.5 py-0.5">
                        -{a.preco.descontoPct}%
                      </span>
                    )}
                    {a.preco.parcela && (
                      <span className="w-full text-[10.5px] sm:text-[12px] text-gray-600">ou {a.preco.parcela}</span>
                    )}
                  </div>
                )}

                {/* A descrição fica guardada atrás de um toque.
                    Aberta em todos os cards ao mesmo tempo, cada um ficava de
                    uma altura e a página virava um muro de texto — o que a
                    cliente procura primeiro é a arte e o preço. */}
                {a.descricao && (
                  <div className="mb-1">
                    <button onClick={() => setDetalhe(d => (d === a.id ? null : a.id))}
                      className="flex items-center gap-1 text-[11px] sm:text-[12px] font-semibold text-[var(--vt-cor)]">
                      {detalhe === a.id ? 'Ocultar detalhes' : 'Ver detalhes'}
                      <ChevronDown size={13}
                        className={'transition-transform ' + (detalhe === a.id ? 'rotate-180' : '')} />
                    </button>
                    {detalhe === a.id && (
                      <p className="mt-1.5 text-[11.5px] sm:text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">
                        {a.descricao}
                      </p>
                    )}
                  </div>
                )}

                {/* mt-auto: com cards de alturas diferentes na mesma linha, os
                    botões ficam alinhados no pé em vez de flutuarem no meio. */}
                <div className="flex items-center gap-1.5 mt-auto pt-3">
                  <button onClick={() => agendar(a)}
                    className="flex-1 min-w-0 flex items-center justify-center gap-1 bg-[var(--vt-cor)] text-white py-2.5 rounded-xl text-[11.5px] sm:text-[13px] font-semibold">
                    <CalendarCheck size={14} className="shrink-0" />
                    <span className="truncate">Quero agendar</span>
                  </button>
                  <button onClick={() => compartilhar(a)} title="Compartilhar"
                    className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500">
                    <Share2 size={15} />
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
          <div className="max-w-5xl mx-auto flex items-center gap-3">
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

      {agendando && (
        <ModalAgendarAcao
          titulos={agendando.map(a => a.titulo)}
          descricao={agendando.length === 1 ? agendando[0].descricao : undefined}
          servicos={servicos}
          profissionais={profissionais}
          whatsapp={whatsapp}
          horario={horario}
          onFechar={() => { setAgendando(null); setSelecionadas([]) }}
        />
      )}
    </div>
  )
}
