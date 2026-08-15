'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, ChevronRight, MessageSquare, Star } from 'lucide-react'
import { avaliarLiberacao, type Criterio } from '@/lib/feedbackCriterio'

type TipoPergunta = 'escala' | 'multipla_escolha' | 'texto' | 'sim_nao' | 'grid'

interface Pergunta {
  id: string
  titulo: string
  tipo: TipoPergunta
  opcoes: string[]
  obrigatoria: boolean
  ordem: number
  criterio?: Criterio | null
}

interface FormData {
  id: string
  token: string
  titulo: string
  descricao: string
  cor_primaria: string
  salao_nome: string
  perguntas: Pergunta[]
  google_link?: string
  google_mensagem?: string
}

const COMENTARIO_KEY = '__comentario__'

export default function AvaliacaoPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [form, setForm] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [respostas, setRespostas] = useState<Record<string, unknown>>({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  // 'perguntas' -> so o formulario e o botao da ultima pergunta
  // 'comentario' -> cliente nao passou na regra e ganhou o campo de comentario
  const [fase, setFase] = useState<'perguntas' | 'comentario'>('perguntas')
  // Convite do Google: so aparece depois do envio, e so para quem passou.
  const [convite, setConvite] = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/feedback/public/slug/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return }
        setForm(data)
        if (data.salao_nome) document.title = `Avaliação - ${data.salao_nome}`
        setLoading(false)
      })
      .catch(() => { setError('Erro ao carregar formulário.'); setLoading(false) })
  }, [slug])

  useEffect(() => {
    const btn = document.getElementById('whatsapp-float-btn')
    if (btn) btn.style.display = 'none'
    return () => { if (btn) btn.style.display = '' }
  }, [])

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

  // Confere as obrigatorias. Devolve true quando pode seguir.
  function obrigatoriasOk(): boolean {
    if (!form) return false
    for (const p of form.perguntas) {
      if (!p.obrigatoria) continue
      const r = respostas[p.id]
      if (r === undefined || r === null || r === '') {
        setErroEnvio(`Por favor responda: "${p.titulo}"`)
        return false
      }
    }
    setErroEnvio('')
    return true
  }

  // Botao "ultima pergunta importante": decide o caminho.
  //
  // Passou na regra -> envia na hora e convida para avaliar no Google. O
  // cliente satisfeito nao precisa escrever nada, e cada campo a mais nesse
  // ponto e uma chance a menos de ele chegar ao Google.
  //
  // Nao passou -> nada e enviado ainda; abre o comentario. Quem esta
  // insatisfeito tem o que dizer, e esse texto vale mais para o salao do que
  // uma estrela publica.
  async function ultimaPergunta() {
    if (!form) return
    if (!obrigatoriasOk()) return

    const { liberado } = avaliarLiberacao(form.perguntas, respostas)
    const temLink = !!(form.google_link || '').trim()

    // Sem link configurado nao ha para onde mandar: cai no comentario.
    if (liberado && temLink) {
      const ok = await enviar()
      if (ok) setConvite(true)
      return
    }
    setFase('comentario')
  }

  async function enviar(sobrescreve?: Record<string, unknown>): Promise<boolean> {
    if (!form) return false
    if (!obrigatoriasOk()) return false
    // O que vai no corpo e calculado aqui, e nao lido do estado depois de um
    // setResposta: o React so aplica o novo estado no proximo render, entao
    // "enviar sem comentario" acabaria mandando o texto que o cliente pediu
    // para descartar.
    const payload = sobrescreve ? { ...respostas, ...sobrescreve } : respostas
    setEnviando(true)
    try {
      const res = await fetch(`/api/feedback/public/${form.token}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados: payload }),
      })
      if (res.ok) { setEnviado(true); setEnviando(false); return true }
      const data = await res.json()
      setErroEnvio(data.error || 'Erro ao enviar respostas.')
    } catch {
      setErroEnvio('Erro de conexão. Tente novamente.')
    }
    setEnviando(false)
    return false
  }

  const cor = form?.cor_primaria || '#be185d'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff1f5 0%, #fdf4ff 50%, #f0f9ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: `3px solid ${cor}30`,
            borderTop: `3px solid ${cor}`,
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Carregando avaliação...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff1f5 0%, #fdf4ff 50%, #f0f9ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>😕</div>
          <h1 style={{ color: '#1a1a1a', fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Formulário indisponível</h1>
          <p style={{ color: '#6b7280', fontSize: 15 }}>{error}</p>
        </div>
      </div>
    )
  }

  if (enviado) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff1f5 0%, #fdf4ff 50%, #f0f9ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: `linear-gradient(135deg, ${cor}, ${cor}99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 28px',
            boxShadow: `0 20px 60px ${cor}40`,
          }}>
            <CheckCircle size={44} color="white" />
          </div>
          {/* Quem passou na regra nao ve "Muito obrigado": o convite ocupa a
              tela inteira. O agradecimento generico competia com o pedido e
              empurrava o botao do Google para baixo, onde metade das pessoas
              nem rolava. Quem NAO recebe convite continua vendo o
              agradecimento normal. */}
          {convite && !!(form?.google_link || '').trim() ? (
            <>
              <p style={{ color: '#1a1a1a', fontWeight: 700, fontSize: 17, lineHeight: 1.6, marginBottom: 10 }}>
                {form?.google_mensagem
                  || 'Poderia avaliar seu atendimento no Google? Assim conseguimos crescer ainda mais e levar seu feedback, trazendo mais confiança para outros clientes.'}
              </p>
              <p style={{ color: '#6b7280', fontSize: 14, fontWeight: 600, lineHeight: 1.6, marginBottom: 20 }}>
                Deixe uma mensagem positiva clicando aqui em <b style={{ color: cor }}>Avaliar no Google</b>
              </p>
              <a href={form?.google_link} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 9,
                  padding: '16px 34px', borderRadius: 15, textDecoration: 'none',
                  background: `linear-gradient(135deg, ${cor}, ${cor}cc)`,
                  color: 'white', fontWeight: 700, fontSize: 15.5,
                  boxShadow: `0 8px 26px ${cor}40`,
                }}>
                <Star size={18} fill="white" /> Avaliar no Google
              </a>
            </>
          ) : (
            <>
              <h1 style={{ color: '#1a1a1a', fontWeight: 800, fontSize: 28, marginBottom: 12, letterSpacing: '-0.5px' }}>
                Muito obrigado!
              </h1>
              <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.7 }}>
                Sua avaliação foi enviada com sucesso.<br />
                Sua opinião nos ajuda a oferecer uma<br />experiência ainda melhor para você.
              </p>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 28 }}>
            {[1,2,3,4,5].map(i => (
              <span key={i} style={{ fontSize: 28 }}>⭐</span>
            ))}
          </div>
          {form?.salao_nome && (
            <p style={{ marginTop: 24, color: '#6b7280', fontSize: 13 }}>
              — {form.salao_nome}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (!form) return null

  const nomeIniciais = form.salao_nome
    ? form.salao_nome.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'S'

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .card-pergunta { animation: fadeUp 0.4s ease both; }
        .opcao-btn:hover { transform: translateX(4px); }
        .opcao-btn { transition: all 0.18s ease; }
        .radio-circle { transition: all 0.15s ease; }
        textarea:focus { outline: none; }
        input:focus { outline: none; }
        .enviar-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px var(--cor-shadow) !important; }
        .enviar-btn { transition: all 0.2s ease; }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #fff1f5 0%, #fdf4ff 40%, #f5f3ff 70%, #eff6ff 100%)' }}>

        <div style={{ height: 4, background: `linear-gradient(90deg, ${cor}, ${cor}80, #a855f7, #60a5fa)` }} />

        <div style={{ background: 'white', borderBottom: '1px solid #f3e8ff', padding: '24px 20px', textAlign: 'center', boxShadow: '0 1px 20px rgba(0,0,0,0.04)' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `linear-gradient(135deg, ${cor}, ${cor}80)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            fontWeight: 800, fontSize: 20, color: 'white',
            boxShadow: `0 8px 24px ${cor}40`,
            letterSpacing: 1,
          }}>
            {nomeIniciais}
          </div>
          {form.salao_nome && (
            <p style={{ fontSize: 13, fontWeight: 600, color: cor, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              {form.salao_nome}
            </p>
          )}
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.3px', marginBottom: 6 }}>
            {form.titulo}
          </h1>
          {form.descricao && (
            <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
              {form.descricao}
            </p>
          )}
          <p style={{ fontSize: 12, color: '#ef4444', marginTop: 10 }}>
            * Campos obrigatórios
          </p>
        </div>

        <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 0' }}>
          {form.perguntas.map((pergunta, idx) => (
            <div key={pergunta.id} className="card-pergunta" style={{
              background: 'white',
              borderRadius: 20,
              padding: '28px 28px',
              marginBottom: 16,
              boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
              border: '1px solid rgba(255,255,255,0.8)',
              animationDelay: `${idx * 0.07}s`,
            }}>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.5 }}>
                  {pergunta.titulo}
                  {pergunta.obrigatoria && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                </p>
              </div>

              {pergunta.tipo === 'escala' && (
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {Array.from({ length: 11 }, (_, i) => i).map(n => {
                      const selected = respostas[pergunta.id] === String(n)
                      const isPromotor = n >= 9
                      const isNeutro = n === 7 || n === 8
                      const bgSel = isPromotor ? '#16a34a' : isNeutro ? '#ca8a04' : n === 0 ? '#dc2626' : cor
                      return (
                        <button key={n} onClick={() => setResposta(pergunta.id, String(n))}
                          style={{
                            width: 44, height: 44, borderRadius: 12,
                            fontWeight: 700, fontSize: 15, cursor: 'pointer', border: 'none',
                            background: selected ? bgSel : '#f9fafb',
                            color: selected ? 'white' : '#6b7280',
                            boxShadow: selected ? `0 4px 16px ${bgSel}50` : '0 1px 4px rgba(0,0,0,0.08)',
                            transform: selected ? 'scale(1.12)' : 'scale(1)',
                            transition: 'all 0.18s ease',
                          }}>
                          {n}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>Não voltaria</span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>Com certeza voltaria</span>
                  </div>
                </div>
              )}

              {pergunta.tipo === 'multipla_escolha' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pergunta.opcoes.map(opcao => {
                    const selected = respostas[pergunta.id] === opcao
                    return (
                      <button key={opcao} onClick={() => setResposta(pergunta.id, opcao)}
                        className="opcao-btn"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '14px 18px', borderRadius: 14, cursor: 'pointer',
                          background: selected ? `${cor}10` : '#f9fafb',
                          border: `2px solid ${selected ? cor : '#f3f4f6'}`,
                          textAlign: 'left', width: '100%',
                          boxShadow: selected ? `0 4px 20px ${cor}20` : 'none',
                        }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${selected ? cor : '#d1d5db'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: selected ? cor : 'white',
                          transition: 'all 0.15s',
                        }}>
                          {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: selected ? 600 : 400, color: selected ? '#faf9f7' : '#374151' }}>
                          {opcao}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {pergunta.tipo === 'texto' && (
                <textarea
                  value={(respostas[pergunta.id] as string) || ''}
                  onChange={e => setResposta(pergunta.id, e.target.value)}
                  placeholder="Escreva sua resposta aqui..."
                  rows={4}
                  style={{
                    width: '100%', border: '2px solid #f3f4f6', borderRadius: 14,
                    padding: '14px 16px', fontSize: 14, color: '#1a1a1a',
                    background: '#f9fafb', resize: 'none', fontFamily: 'inherit',
                    lineHeight: 1.6, transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = cor}
                  onBlur={e => e.target.style.borderColor = '#f3f4f6'}
                />
              )}

              {pergunta.tipo === 'sim_nao' && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', paddingBottom: 8, fontSize: 12, fontWeight: 600, color: '#6b7280', paddingRight: 16 }}></th>
                        <th style={{ textAlign: 'center', paddingBottom: 8, fontSize: 12, fontWeight: 700, color: '#16a34a', width: 60 }}>SIM</th>
                        <th style={{ textAlign: 'center', paddingBottom: 8, fontSize: 12, fontWeight: 700, color: '#dc2626', width: 60 }}>NÃO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pergunta.opcoes.map((item, i) => {
                        const resp = (respostas[pergunta.id] as Record<string, string>)?.[item]
                        return (
                          <tr key={item} style={{ background: i % 2 === 0 ? '#fafafa' : 'white', borderRadius: 10 }}>
                            <td style={{ padding: '12px 16px 12px 0', fontSize: 14, color: '#374151', fontWeight: 450 }}>{item}</td>
                            <td style={{ padding: '12px 0', textAlign: 'center' }}>
                              <button onClick={() => setRespostaSimNao(pergunta.id, item, 'sim')} style={{
                                width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                background: resp === 'sim' ? '#16a34a' : '#f3f4f6',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                                boxShadow: resp === 'sim' ? '0 4px 12px #16a34a40' : 'none',
                                transition: 'all 0.15s',
                              }}>
                                {resp === 'sim' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'white' }} />}
                              </button>
                            </td>
                            <td style={{ padding: '12px 0', textAlign: 'center' }}>
                              <button onClick={() => setRespostaSimNao(pergunta.id, item, 'nao')} style={{
                                width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                background: resp === 'nao' ? '#dc2626' : '#f3f4f6',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                                boxShadow: resp === 'nao' ? '0 4px 12px #dc262640' : 'none',
                                transition: 'all 0.15s',
                              }}>
                                {resp === 'nao' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'white' }} />}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {pergunta.tipo === 'grid' && (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 6, paddingRight: 4 }}>
                    {[1,2,3,4,5].map(n => (
                      <div key={n} style={{ width: 36, textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{n}</div>
                    ))}
                  </div>
                  {pergunta.opcoes.map((item, i) => {
                    const gridResp = (respostas[pergunta.id] as Record<string, string>) || {}
                    return (
                      <div key={item} style={{
                        display: 'flex', alignItems: 'center',
                        padding: '10px 0', borderBottom: i < pergunta.opcoes.length - 1 ? '1px solid #f3f4f6' : 'none',
                      }}>
                        <span style={{ flex: 1, fontSize: 13, color: '#374151', paddingRight: 12, lineHeight: 1.4 }}>{item}</span>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          {[1,2,3,4,5].map(n => {
                            const sel = gridResp[item] === String(n)
                            const selColor = n >= 4 ? '#16a34a' : n >= 3 ? '#ca8a04' : '#dc2626'
                            return (
                              <button key={n} onClick={() => setRespostaGrid(pergunta.id, item, String(n))}
                                style={{
                                  width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
                                  background: sel ? selColor : '#f3f4f6',
                                  boxShadow: sel ? `0 4px 12px ${selColor}40` : 'none',
                                  transform: sel ? 'scale(1.15)' : 'scale(1)',
                                  transition: 'all 0.15s',
                                }} />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>1 = Ruim</span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>5 = Excelente</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* O comentario deixou de ser um campo sempre aberto. Ele e a saida
              de quem NAO passou na regra: em vez de convidar para o Google,
              o salao pergunta o que houve. Quem passou nem chega aqui. */}
          {fase === 'comentario' && (
          <div className="card-pergunta" style={{
            background: 'white',
            borderRadius: 20,
            padding: '28px 28px',
            marginBottom: 16,
            boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
            border: `2px solid ${cor}20`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${cor}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <MessageSquare size={18} color={cor} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
                Quer deixar um comentário sobre seu atendimento? <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 13 }}>(opcional)</span>
              </p>
            </div>
            <textarea
              value={(respostas[COMENTARIO_KEY] as string) || ''}
              onChange={e => setResposta(COMENTARIO_KEY, e.target.value)}
              placeholder="Conte-nos mais sobre sua experiência. Sugestões, elogios ou qualquer observação são muito bem-vindos..."
              rows={5}
              style={{
                width: '100%', border: `2px solid ${cor}20`, borderRadius: 14,
                padding: '16px 18px', fontSize: 14, color: '#1a1a1a',
                background: `${cor}05`, resize: 'none', fontFamily: 'inherit',
                lineHeight: 1.7, transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = cor}
              onBlur={e => e.target.style.borderColor = `${cor}20`}
            />
          </div>
          )}

          {erroEnvio && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14,
              padding: '14px 18px', marginBottom: 16, fontSize: 14, color: '#dc2626',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ⚠️ {erroEnvio}
            </div>
          )}

          {fase === 'perguntas' ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 40 }}>
              <button onClick={ultimaPergunta} disabled={enviando} className="enviar-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, textAlign: 'center',
                  padding: '18px 34px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${cor}, ${cor}cc)`,
                  color: 'white', fontWeight: 800, fontSize: 15, letterSpacing: '0.3px',
                  boxShadow: `0 8px 30px ${cor}40`,
                  opacity: enviando ? 0.7 : 1,
                  '--cor-shadow': `${cor}60`,
                } as React.CSSProperties}>
                {enviando ? (
                  <>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', animation: 'spin 0.7s linear infinite' }} />
                    Enviando...
                  </>
                ) : (
                  <>
                    CLIQUE AQUI PARA UMA ÚLTIMA PERGUNTA IMPORTANTE
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 40 }}>
              {/* Um botao so. Eram dois - "com comentario" e "sem comentario" -
                  e a escolha nao mudava nada para quem responde: o campo ja e
                  opcional, entao vai o que estiver escrito. Duas saidas para o
                  mesmo lugar so faziam a pessoa parar para decidir. */}
              <button onClick={() => enviar()} disabled={enviando} className="enviar-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '16px 40px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${cor}, ${cor}cc)`,
                  color: 'white', fontWeight: 700, fontSize: 15,
                  boxShadow: `0 8px 30px ${cor}40`,
                  opacity: enviando ? 0.7 : 1,
                  '--cor-shadow': `${cor}60`,
                } as React.CSSProperties}>
                {enviando ? (
                  <>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', animation: 'spin 0.7s linear infinite' }} />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar feedback
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}

          <div style={{ textAlign: 'center', paddingBottom: 32 }}>
            <p style={{ fontSize: 12, color: '#6b6860' }}>
              Formulário criado com <span style={{ fontWeight: 700, color: '#6b7280' }}>NODRI</span> · Gestão de Salões de Beleza
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
