'use client'
import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, Check, Send, X } from 'lucide-react'
import type { ServicoPublico, ProfissionalPublico, AcaoPublica, EscolhaAgendamento } from '@/lib/vitrineCliente'
import {
  precoDoServico, agruparPorCategoria, dataPorExtenso,
  mensagemAgendamento, linkWhatsapp,
} from '@/lib/vitrineCliente'
import SeletorQuando from './SeletorQuando'

// Agendar agora: data → hora → serviços (com preferência de profissional) →
// mensagem pronta no WhatsApp do salão.
//
// A página NÃO reserva horário: não existe agenda no sistema. Ela monta o
// pedido; quem confirma é a recepção. Por isso todos os horários aparecem, e o
// texto da tela evita prometer vaga.

const CAT_ACOES = 'Combos e promoções'

export default function VitrineAgendar({ servicos, profissionais, acoes, whatsapp }: {
  servicos: ServicoPublico[]
  profissionais: ProfissionalPublico[]
  acoes: AcaoPublica[]
  whatsapp: string | null
}) {
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  // Uma categoria aberta por vez: com várias abertas a tela vira uma lista
  // longa demais e o cliente perde de vista onde estava.
  const [aberta, setAberta] = useState<string | null>(null)
  const [escolhas, setEscolhas] = useState<Record<string, EscolhaAgendamento>>({})
  const [perguntando, setPerguntando] = useState<string | null>(null)
  const [mostrarNomes, setMostrarNomes] = useState(false)

  // Promoções vigentes entram como uma categoria a mais, para o cliente pedir
  // o combo sem sair da tela.
  const grupos = useMemo(() => {
    const base = agruparPorCategoria(servicos)
    const vigentes = acoes.filter(a => a.status === 'ativa')
    return vigentes.length ? [[CAT_ACOES, []] as [string, ServicoPublico[]], ...base] : base
  }, [servicos, acoes])

  const acoesVigentes = useMemo(() => acoes.filter(a => a.status === 'ativa'), [acoes])
  const marcados = Object.values(escolhas)
  const podeEnviar = !!data && !!hora && marcados.length > 0

  function quemFaz(servicoId: string): ProfissionalPublico[] {
    return profissionais.filter(p => p.servicos.includes(servicoId))
  }

  function alternarServico(chave: string, nome: string, preco: string | null, servicoId?: string) {
    setEscolhas(prev => {
      const novo = { ...prev }
      if (novo[chave]) { delete novo[chave]; return novo }
      novo[chave] = { chave, nome, preco, profissional: null }
      return novo
    })
    // Só pergunta por profissional quando alguém está habilitado para o
    // serviço — perguntar e abrir uma lista vazia é pior que não perguntar.
    if (!escolhas[chave] && servicoId && quemFaz(servicoId).length > 0) setPerguntando(chave)
  }

  function definirProfissional(chave: string, nome: string | null) {
    setEscolhas(prev => prev[chave] ? { ...prev, [chave]: { ...prev[chave], profissional: nome } } : prev)
    setPerguntando(null)
    setMostrarNomes(false)
  }

  function enviar() {
    if (!podeEnviar) return
    const texto = mensagemAgendamento({ data, hora, escolhas: marcados })
    window.open(linkWhatsapp(whatsapp, texto), '_blank')
  }

  const servicoEmPergunta = perguntando ? servicos.find(s => s.id === perguntando) : null

  return (
    <div className="pb-28">
      <SeletorQuando data={data} hora={hora} onData={setData} onHora={setHora} />

      {/* ── 3. Serviços ── */}
      {data && hora && (
        <div>
          <p className="font-bold text-[13px] text-gray-900 mb-2 px-1">Selecione o serviço</p>
          <div className="space-y-2">
            {grupos.map(([cat, itens]) => {
              const ehAcoes = cat === CAT_ACOES
              const qtd = ehAcoes ? acoesVigentes.length : itens.length
              return (
                <div key={cat} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <button onClick={() => setAberta(x => (x === cat ? null : cat))}
                    className="w-full flex items-center gap-2 px-4 py-3.5 text-left">
                    {aberta === cat ? <ChevronDown size={16} className="text-gray-400 shrink-0" />
                                  : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                    <span className="font-bold text-[13px] text-gray-900 uppercase tracking-wide flex-1">{cat}</span>
                    <span className="text-[11px] text-gray-400">{qtd}</span>
                  </button>

                  {aberta === cat && (
                    <div className="border-t border-gray-100">
                      {ehAcoes && acoesVigentes.map(a => {
                        const chave = `acao:${a.id}`
                        const marcado = !!escolhas[chave]
                        return (
                          <button key={a.id} onClick={() => alternarServico(chave, a.titulo, null)}
                            className="w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0">
                            <span className={'w-5 h-5 shrink-0 mt-0.5 rounded-md border flex items-center justify-center '
                              + (marcado ? 'bg-[var(--vt-cor)] border-transparent' : 'border-gray-300')}>
                              {marcado && <Check size={13} className="text-white" />}
                            </span>
                            <span className="flex-1">
                              <span className="block text-[13px] text-gray-800 font-medium">{a.titulo}</span>
                              {a.descricao && <span className="block text-[11px] text-gray-500 mt-0.5">{a.descricao}</span>}
                            </span>
                          </button>
                        )
                      })}

                      {!ehAcoes && itens.map(s => {
                        const marcado = !!escolhas[s.id]
                        const preco = precoDoServico(s)
                        const esc = escolhas[s.id]
                        return (
                          <div key={s.id} className="border-b border-gray-50 last:border-0">
                            <button onClick={() => alternarServico(s.id, s.nome, preco, s.id)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-left">
                              <span className={'w-5 h-5 shrink-0 rounded-md border flex items-center justify-center '
                                + (marcado ? 'bg-[var(--vt-cor)] border-transparent' : 'border-gray-300')}>
                                {marcado && <Check size={13} className="text-white" />}
                              </span>
                              <span className="text-[13px] text-gray-800 flex-1">{s.nome}</span>
                            </button>
                            {marcado && esc?.profissional && (
                              <p className="px-4 pb-2 -mt-1 ml-8 text-[11px] text-[var(--vt-cor)]">
                                com {esc.profissional}
                                <button onClick={() => setPerguntando(s.id)} className="ml-2 underline text-gray-400">trocar</button>
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
        </div>
      )}

      {/* ── Preferência de profissional ── */}
      {perguntando && servicoEmPergunta && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3"
          onClick={() => { setPerguntando(null); setMostrarNomes(false) }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-2 mb-1">
              <h3 className="font-bold text-[15px] text-gray-900 flex-1">Tem preferência por profissional?</h3>
              <button onClick={() => { setPerguntando(null); setMostrarNomes(false) }} className="text-gray-400"><X size={18} /></button>
            </div>
            <p className="text-[12px] text-gray-500 mb-4">{servicoEmPergunta.nome}</p>

            {/* A lista de nomes só abre depois do "Sim": mostrar os nomes junto
                com a pergunta já responde por quem não tem preferência. */}
            {!mostrarNomes ? (
              <div className="flex gap-2">
                <button onClick={() => definirProfissional(perguntando, null)}
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
                  <button key={p.id} onClick={() => definirProfissional(perguntando, p.nome)}
                    className="w-full py-2.5 rounded-xl bg-[var(--vt-cor)] text-white text-[13px] font-semibold">
                    {p.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Enviar ── */}
      {podeEnviar && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 shadow-lg z-30">
          <div className="max-w-5xl mx-auto">
            <p className="text-[11px] text-gray-500 mb-2">
              {marcados.length} procedimento{marcados.length > 1 ? 's' : ''} · <span className="capitalize">{dataPorExtenso(data)}</span> às {hora}
            </p>
            <button onClick={enviar}
              className="w-full flex items-center justify-center gap-2 bg-[var(--vt-cor)] text-white py-3 rounded-xl text-[14px] font-semibold">
              <Send size={16} /> Enviar agendamento
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
