'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, ChevronRight, Star } from 'lucide-react'

type TipoPergunta = 'escala' | 'multipla_escolha' | 'texto' | 'sim_nao' | 'grid'

interface Pergunta {
  id: string
  titulo: string
  tipo: TipoPergunta
  opcoes: string[]
  obrigatoria: boolean
  ordem: number
}

interface FormData {
  id: string
  titulo: string
  descricao: string
  cor_primaria: string
  salao_nome: string
  perguntas: Pergunta[]
}

export default function FeedbackPublicoPage() {
  const params = useParams()
  const token = params?.token as string

  const [form, setForm] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [respostas, setRespostas] = useState<Record<string, unknown>>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`/api/feedback/public/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return }
        setForm(data)
        setLoading(false)
      })
      .catch(() => { setError('Erro ao carregar formulário.'); setLoading(false) })
  }, [token])

  function setResposta(id: string, valor: unknown) {
    setRespostas(prev => ({ ...prev, [id]: valor }))
  }

  function setRespostaGrid(id: string, item: string, nota: string) {
    setRespostas(prev => {
      const atual = (prev[id] as Record<string, string>) || {}
      return { ...prev, [id]: { ...atual, [item]: nota } }
    })
  }

  function setRespostaSimNao(id: string, item: string, valor: 'sim' | 'nao') {
    setRespostas(prev => {
      const atual = (prev[id] as Record<string, string>) || {}
      return { ...prev, [id]: { ...atual, [item]: valor } }
    })
  }

  async function enviar() {
    if (!form) return
    // Valida obrigatórias
    for (const p of form.perguntas) {
      if (!p.obrigatoria) continue
      const r = respostas[p.id]
      if (r === undefined || r === null || r === '') {
        setErroEnvio(`Por favor responda: "${p.titulo}"`)
        return
      }
      if (p.tipo === 'grid' && typeof r === 'object') {
        // grid não é obrigatório por item, só verifica que algum foi respondido
      }
    }
    setErroEnvio('')
    setEnviando(true)
    try {
      const res = await fetch(`/api/feedback/public/${token}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados: respostas }),
      })
      if (res.ok) {
        setEnviado(true)
      } else {
        const data = await res.json()
        setErroEnvio(data.error || 'Erro ao enviar respostas.')
      }
    } catch {
      setErroEnvio('Erro de conexão. Tente novamente.')
    }
    setEnviando(false)
  }

  const cor = form?.cor_primaria || '#e11d48'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fdf2f4' }}>
        <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: `${cor} transparent ${cor} ${cor}` }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fdf2f4' }}>
        <div className="text-center p-8 max-w-sm">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-gray-800 font-bold text-xl mb-2">Formulário indisponível</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fdf2f4' }}>
        <div className="text-center p-8 max-w-sm">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: cor }}>
            <CheckCircle size={40} color="white" />
          </div>
          <h1 className="text-gray-800 font-bold text-2xl mb-3">Obrigado!</h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Sua avaliação foi enviada com sucesso.<br />
            Sua opinião é muito importante para nós continuarmos melhorando!
          </p>
          <div className="flex justify-center gap-1 mt-6">
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={24} fill={cor} color={cor} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!form) return null

  return (
    <div className="min-h-screen pb-10" style={{ background: '#fdf2f4' }}>
      {/* HEADER COLORIDO */}
      <div className="h-3 w-full" style={{ background: cor }} />

      <div className="max-w-[640px] mx-auto px-4 pt-6">
        {/* CARD TÍTULO */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
          <div className="h-2" style={{ background: cor }} />
          <div className="p-6">
            <h1 className="text-gray-900 font-bold text-2xl mb-2">{form.titulo}</h1>
            {form.salao_nome && (
              <p className="text-xs font-semibold mb-2" style={{ color: cor }}>{form.salao_nome}</p>
            )}
            {form.descricao && (
              <p className="text-gray-500 text-sm leading-relaxed">{form.descricao}</p>
            )}
            <p className="text-xs text-red-500 mt-3">* Indica pergunta obrigatória</p>
          </div>
        </div>

        {/* PERGUNTAS */}
        {form.perguntas.map((pergunta, idx) => (
          <div key={pergunta.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
            <div className="mb-4">
              <span className="text-gray-900 font-medium text-[15px] leading-snug">
                {pergunta.titulo}
                {pergunta.obrigatoria && <span className="text-red-500 ml-1">*</span>}
              </span>
            </div>

            {/* ESCALA 0-10 */}
            {pergunta.tipo === 'escala' && (
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {Array.from({ length: 11 }, (_, i) => i).map(n => (
                    <button key={n} onClick={() => setResposta(pergunta.id, String(n))}
                      className="w-10 h-10 rounded-full text-sm font-semibold transition-all border-2"
                      style={{
                        background: respostas[pergunta.id] === String(n) ? cor : 'transparent',
                        color: respostas[pergunta.id] === String(n) ? 'white' : '#374151',
                        borderColor: respostas[pergunta.id] === String(n) ? cor : '#e5e7eb',
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                  <span>0 = Não voltaria</span>
                  <span>10 = Com certeza voltaria</span>
                </div>
              </div>
            )}

            {/* MÚLTIPLA ESCOLHA */}
            {pergunta.tipo === 'multipla_escolha' && (
              <div className="space-y-2">
                {pergunta.opcoes.map(opcao => (
                  <button key={opcao} onClick={() => setResposta(pergunta.id, opcao)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all border-2"
                    style={{
                      background: respostas[pergunta.id] === opcao ? `${cor}12` : 'transparent',
                      borderColor: respostas[pergunta.id] === opcao ? cor : '#e5e7eb',
                      color: '#374151',
                    }}>
                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: respostas[pergunta.id] === opcao ? cor : '#d1d5db' }}>
                      {respostas[pergunta.id] === opcao && (
                        <div className="w-2 h-2 rounded-full" style={{ background: cor }} />
                      )}
                    </div>
                    <span className="text-sm">{opcao}</span>
                  </button>
                ))}
              </div>
            )}

            {/* TEXTO LIVRE */}
            {pergunta.tipo === 'texto' && (
              <textarea
                value={(respostas[pergunta.id] as string) || ''}
                onChange={e => setResposta(pergunta.id, e.target.value)}
                placeholder="Digite sua resposta..."
                rows={4}
                className="w-full border-b-2 border-gray-200 bg-transparent px-0 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none resize-none transition-colors focus:border-gray-500"
                style={{ borderBottomColor: (respostas[pergunta.id] as string) ? cor : undefined }}
              />
            )}

            {/* SIM / NÃO */}
            {pergunta.tipo === 'sim_nao' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-4 w-full"></th>
                      <th className="text-center text-xs font-semibold pb-2 px-4 whitespace-nowrap" style={{ color: cor }}>SIM</th>
                      <th className="text-center text-xs font-semibold pb-2 px-4 whitespace-nowrap text-gray-400">NÃO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pergunta.opcoes.map(item => {
                      const resp = (respostas[pergunta.id] as Record<string, string>)?.[item]
                      return (
                        <tr key={item}>
                          <td className="py-2.5 pr-4 text-gray-700 text-sm">{item}</td>
                          <td className="py-2.5 px-4 text-center">
                            <button onClick={() => setRespostaSimNao(pergunta.id, item, 'sim')}
                              className="w-5 h-5 rounded-full border-2 mx-auto flex items-center justify-center transition-all"
                              style={{ borderColor: resp === 'sim' ? cor : '#d1d5db', background: resp === 'sim' ? cor : 'transparent' }}>
                              {resp === 'sim' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </button>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button onClick={() => setRespostaSimNao(pergunta.id, item, 'nao')}
                              className="w-5 h-5 rounded-full border-2 mx-auto flex items-center justify-center transition-all"
                              style={{ borderColor: resp === 'nao' ? '#64748b' : '#d1d5db', background: resp === 'nao' ? '#64748b' : 'transparent' }}>
                              {resp === 'nao' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* GRID 1-5 */}
            {pergunta.tipo === 'grid' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-4"></th>
                      {[1, 2, 3, 4, 5].map(n => (
                        <th key={n} className="text-center text-xs font-semibold pb-2 px-2 whitespace-nowrap text-gray-500">
                          {n}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pergunta.opcoes.map(item => {
                      const gridResp = (respostas[pergunta.id] as Record<string, string>) || {}
                      return (
                        <tr key={item}>
                          <td className="py-2.5 pr-4 text-gray-700 text-sm">{item}</td>
                          {[1, 2, 3, 4, 5].map(n => (
                            <td key={n} className="py-2.5 px-2 text-center">
                              <button onClick={() => setRespostaGrid(pergunta.id, item, String(n))}
                                className="w-5 h-5 rounded-full border-2 mx-auto flex items-center justify-center transition-all"
                                style={{
                                  borderColor: gridResp[item] === String(n) ? cor : '#d1d5db',
                                  background: gridResp[item] === String(n) ? cor : 'transparent',
                                }}>
                                {gridResp[item] === String(n) && <div className="w-2 h-2 rounded-full bg-white" />}
                              </button>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-[calc(50%_-_80px)]">
                  <span>1 = Ruim</span>
                  <span>5 = Excelente</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ERRO */}
        {erroEnvio && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-600">
            {erroEnvio}
          </div>
        )}

        {/* BOTÃO ENVIAR */}
        <div className="flex justify-end pb-8">
          <button onClick={enviar} disabled={enviando}
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-70 shadow-lg"
            style={{ background: cor, boxShadow: `0 4px 20px ${cor}50` }}>
            {enviando ? 'Enviando...' : 'Enviar respostas'}
            {!enviando && <ChevronRight size={16} />}
          </button>
        </div>

        {/* FOOTER */}
        <div className="text-center text-[10px] text-gray-400 pb-6">
          Formulário criado com <span className="font-bold">NODRI</span> · Gestão de Salões de Beleza
        </div>
      </div>
    </div>
  )
}
