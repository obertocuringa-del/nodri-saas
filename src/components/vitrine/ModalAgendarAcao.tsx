'use client'
import { useState, useMemo } from 'react'
import { X, Send, Check, ChevronRight, ChevronDown } from 'lucide-react'
import SeletorQuando from './SeletorQuando'
import type { ServicoPublico, ProfissionalPublico, EscolhaAgendamento } from '@/lib/vitrineCliente'
import {
  precoDoServico, agruparPorCategoria, mensagemAgendamento, linkWhatsapp,
} from '@/lib/vitrineCliente'

// Pedir uma promoção, passo a passo.
//
// O caminho é uma etapa por vez, e cada uma só aparece quando a anterior foi
// respondida: dia → hora → profissional → "quer mais alguma coisa?" → serviços.
// Numa tela de celular, mostrar tudo de uma vez faz o cliente rolar sem saber
// o que falta; assim ele sempre vê só a pergunta da vez.
//
// A promoção NÃO tem serviço vinculado, então a preferência aqui é escolhida
// entre quem atende cliente — a rota já tira setores e a equipe CLT. E dá para
// marcar mais de um: um combo pode juntar cabelo, mão e massagem, cada parte
// com uma pessoa. Já nos serviços avulsos somados depois, a lista é filtrada
// por quem está habilitado naquele serviço.

type Etapa = 'quando' | 'profissional' | 'mais' | 'servicos'

export default function ModalAgendarAcao({
  titulos, descricao, servicos, profissionais, whatsapp, onFechar,
}: {
  titulos: string[]
  descricao?: string
  servicos: ServicoPublico[]
  profissionais: ProfissionalPublico[]
  whatsapp: string | null
  onFechar: () => void
}) {
  const [etapa, setEtapa] = useState<Etapa>('quando')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  // Vários profissionais: uma promoção pode juntar cabelo, mão e massagem,
  // e cada parte ser de uma pessoa diferente.
  const [profsPromo, setProfsPromo] = useState<string[]>([])
  // A lista de nomes só abre depois do "Sim". Mostrando os nomes junto com a
  // pergunta, a tela já respondia por quem não tinha preferencia nenhuma.
  const [querPreferencia, setQuerPreferencia] = useState(false)

  // Serviços somados depois da promoção
  const [abertas, setAbertas] = useState<Record<string, boolean>>({})
  const [extras, setExtras] = useState<Record<string, EscolhaAgendamento>>({})
  const [perguntando, setPerguntando] = useState<string | null>(null)
  const [mostrarNomes, setMostrarNomes] = useState(false)

  const grupos = useMemo(() => agruparPorCategoria(servicos), [servicos])
  const listaExtras = Object.values(extras)

  function quemFaz(servicoId: string): ProfissionalPublico[] {
    const habilitados = profissionais.filter(p => p.servicos.includes(servicoId))
    // Ninguém marcado para o serviço: mostra todos, em vez de abrir vazio.
    return habilitados.length ? habilitados : profissionais
  }

  function alternarServico(s: ServicoPublico) {
    const jaTinha = !!extras[s.id]
    setExtras(prev => {
      const novo = { ...prev }
      if (novo[s.id]) { delete novo[s.id]; return novo }
      novo[s.id] = { chave: s.id, nome: s.nome, preco: precoDoServico(s), profissional: null }
      return novo
    })
    if (!jaTinha) setPerguntando(s.id)
  }

  function definirProfExtra(id: string, nome: string | null) {
    setExtras(prev => prev[id] ? { ...prev, [id]: { ...prev[id], profissional: nome } } : prev)
    setPerguntando(null)
    setMostrarNomes(false)
  }

  function enviar() {
    const comQuem = profsPromo.length ? profsPromo.join(', ') : null
    const escolhas: EscolhaAgendamento[] = [
      ...titulos.map(t => ({ chave: `acao:${t}`, nome: t, preco: null, profissional: comQuem })),
      ...listaExtras,
    ]
    const texto = mensagemAgendamento({ data, hora, escolhas, descricao })
    window.open(linkWhatsapp(whatsapp, texto), '_blank')
    onFechar()
  }

  const servicoEmPergunta = perguntando ? servicos.find(s => s.id === perguntando) : null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onFechar}>
      <div className="bg-[#f7f7f8] w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-start gap-2 z-10">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[14px] text-gray-900">Quero agendar</p>
            <p className="text-[12px] text-gray-500 mt-0.5 truncate">
              {titulos.length > 1 ? `${titulos.length} promoções` : titulos[0]}
            </p>
          </div>
          <button onClick={onFechar} className="text-gray-400 shrink-0"><X size={19} /></button>
        </div>

        <div className="p-4">
          {/* ── 1. Dia e hora ── */}
          {etapa === 'quando' && (
            <>
              <SeletorQuando data={data} hora={hora} onData={setData} onHora={setHora} />
              {data && hora && (
                <button onClick={() => setEtapa('profissional')}
                  className="w-full bg-[var(--vt-cor)] text-white py-3 rounded-xl text-[14px] font-semibold">
                  Continuar
                </button>
              )}
            </>
          )}

          {/* ── 2. Profissional da promoção ── */}
          {etapa === 'profissional' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="font-bold text-[14px] text-gray-900 mb-1">Tem preferência por profissional?</p>
              <p className="text-[12px] text-gray-500 mb-4">{titulos[0]}</p>

              {!querPreferencia ? (
                <div className="flex gap-2">
                  <button onClick={() => { setProfsPromo([]); setEtapa('mais') }}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600">
                    Não tenho preferência
                  </button>
                  <button onClick={() => setQuerPreferencia(true)}
                    className="flex-1 py-3 rounded-xl bg-[var(--vt-cor)] text-white text-[13px] font-semibold">
                    Sim
                  </button>
                </div>
              ) : (
                <>
              <p className="text-[11px] text-gray-400 mb-3">
                Pode escolher mais de um — marque quem você quer para cada parte.
              </p>

              <div className="space-y-1.5 max-h-64 overflow-y-auto mb-3">
                {profissionais.map(p => {
                  const marcado = profsPromo.includes(p.nome)
                  return (
                    <button key={p.id}
                      onClick={() => setProfsPromo(prev =>
                        prev.includes(p.nome) ? prev.filter(x => x !== p.nome) : [...prev, p.nome])}
                      className={'w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-[13px] font-semibold border transition-all '
                        + (marcado
                          ? 'bg-[var(--vt-cor)] text-white border-transparent'
                          : 'bg-white text-gray-700 border-gray-200')}>
                      <span className={'w-5 h-5 shrink-0 rounded-md border flex items-center justify-center '
                        + (marcado ? 'bg-white/25 border-white/40' : 'border-gray-300')}>
                        {marcado && <Check size={13} className="text-white" />}
                      </span>
                      {p.nome}
                    </button>
                  )
                })}
                {profissionais.length === 0 && (
                  <p className="text-[12px] text-gray-400 text-center py-3">
                    Nenhum profissional disponível. Siga sem preferência.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setQuerPreferencia(false); setProfsPromo([]) }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-600">
                  Voltar
                </button>
                <button onClick={() => setEtapa('mais')} disabled={profsPromo.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--vt-cor)] text-white text-[13px] font-semibold disabled:opacity-40">
                  Continuar
                </button>
              </div>
                </>
              )}
            </div>
          )}

          {/* ── 3. Quer somar outro procedimento? ── */}
          {etapa === 'mais' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="font-bold text-[14px] text-gray-900 mb-4">
                Gostaria de agendar mais outro procedimento?
              </p>
              <div className="flex gap-2">
                <button onClick={enviar}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600">
                  Não, enviar
                </button>
                <button onClick={() => setEtapa('servicos')}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--vt-cor)] text-white text-[13px] font-semibold">
                  Sim
                </button>
              </div>
            </div>
          )}

          {/* ── 4. Serviços avulsos ──
              Sem a categoria de combos/promoções: ele já veio de uma, e
              repeti-la aqui só criaria pedido duplicado. */}
          {etapa === 'servicos' && (
            <>
              <p className="font-bold text-[13px] text-gray-900 mb-2 px-1">Selecione o serviço</p>
              <div className="space-y-2 mb-4">
                {grupos.map(([cat, itens]) => (
                  <div key={cat} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <button onClick={() => setAbertas(p => ({ ...p, [cat]: !p[cat] }))}
                      className="w-full flex items-center gap-2 px-4 py-3.5 text-left">
                      {abertas[cat] ? <ChevronDown size={16} className="text-gray-400 shrink-0" />
                                    : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                      <span className="font-bold text-[13px] text-gray-900 uppercase tracking-wide flex-1">{cat}</span>
                      <span className="text-[11px] text-gray-400">{itens.length}</span>
                    </button>

                    {abertas[cat] && (
                      <div className="border-t border-gray-100">
                        {itens.map(s => {
                          const marcado = !!extras[s.id]
                          const preco = precoDoServico(s)
                          return (
                            <div key={s.id} className="border-b border-gray-50 last:border-0">
                              <button onClick={() => alternarServico(s)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left">
                                <span className={'w-5 h-5 shrink-0 rounded-md border flex items-center justify-center '
                                  + (marcado ? 'bg-[var(--vt-cor)] border-transparent' : 'border-gray-300')}>
                                  {marcado && <Check size={13} className="text-white" />}
                                </span>
                                <span className="text-[13px] text-gray-800 flex-1">{s.nome}</span>
                                {preco && <span className="text-[12px] font-semibold text-gray-700 whitespace-nowrap">{preco}</span>}
                              </button>
                              {marcado && extras[s.id]?.profissional && (
                                <p className="px-4 pb-2 -mt-1 ml-8 text-[11px] text-[var(--vt-cor)]">
                                  com {extras[s.id].profissional}
                                  <button onClick={() => setPerguntando(s.id)} className="ml-2 underline text-gray-400">trocar</button>
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={enviar}
                className="w-full flex items-center justify-center gap-2 bg-[var(--vt-cor)] text-white py-3 rounded-xl text-[14px] font-semibold">
                <Send size={16} /> Enviar agendamento
              </button>
            </>
          )}
        </div>
      </div>

      {/* Preferência de profissional para um serviço avulso */}
      {perguntando && servicoEmPergunta && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-3"
          onClick={e => { e.stopPropagation(); setPerguntando(null); setMostrarNomes(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-2 mb-1">
              <h3 className="font-bold text-[15px] text-gray-900 flex-1">Tem preferência por profissional?</h3>
              <button onClick={() => { setPerguntando(null); setMostrarNomes(false) }} className="text-gray-400"><X size={18} /></button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">{servicoEmPergunta.nome}</p>

            {/* Mesma regra da promoção: os nomes só aparecem depois do "Sim". */}
            {!mostrarNomes ? (
              <div className="flex gap-2">
                <button onClick={() => definirProfExtra(perguntando, null)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600">
                  Não tenho preferência
                </button>
                <button onClick={() => setMostrarNomes(true)}
                  className="flex-1 py-3 rounded-xl bg-[var(--vt-cor)] text-white text-[13px] font-semibold">
                  Sim
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {quemFaz(servicoEmPergunta.id).map(p => (
                  <button key={p.id} onClick={() => definirProfExtra(perguntando, p.nome)}
                    className="w-full py-2.5 rounded-xl bg-[var(--vt-cor)] text-white text-[13px] font-semibold">
                    {p.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
