'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, X, Loader2, Check, CheckCheck, Clock } from 'lucide-react'

// ── Chat enxuto de candidatos ───────────────────────────────────────────────
//
// Só o necessário para conversar: as mensagens e uma caixa para responder.
// Sem pastas, sem preços, sem mídias, sem ficha. Fala com /api/crm/curriculos,
// que lê e grava nas mesmas tabelas do CRM -- o que se escreve aqui aparece lá,
// e a resposta do candidato aparece aqui. O CRM principal não é tocado.

const COR = '#5b4fcf'

interface Msg {
  id: string; direcao: 'entrada' | 'saida'; texto: string | null; tipo: string
  midia_url: string | null; situacao: string | null; criado_em: string; autor_nome: string | null
}

const hora = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
const dia = (iso: string) => {
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) } catch { return '' }
}

export default function ChatCurriculos({ conversaId, nome, telefone, vaga, onFechar }: {
  conversaId: string; nome: string; telefone: string; vaga: string; onFechar?: () => void
}) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [carregando, setCarregando] = useState(true)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const fim = useRef<HTMLDivElement>(null)
  const caixa = useRef<HTMLTextAreaElement>(null)

  const buscar = async () => {
    try {
      const r = await fetch(`/api/crm/curriculos?conversa=${conversaId}`, { credentials: 'include' })
      if (!r.ok) return
      const d = await r.json()
      const novas: Msg[] = d.mensagens || []
      // Só troca quando algo mudou (nova mensagem, ou a situação de envio): senão
      // a tela piscaria e perderia a rolagem a cada volta.
      setMsgs(atual => {
        const assina = (l: Msg[]) => l.map(m => `${m.id}|${m.situacao}|${(m.texto || '').length}`).join(';')
        return assina(atual) === assina(novas) ? atual : novas
      })
    } catch { /* tenta na próxima volta */ } finally { setCarregando(false) }
  }

  useEffect(() => {
    setMsgs([]); setCarregando(true); setErro(''); setTexto('')
    buscar()
    const t = setInterval(buscar, 3000)
    setTimeout(() => caixa.current?.focus(), 50)
    return () => clearInterval(t)
  }, [conversaId])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length])

  const enviar = async () => {
    const t = texto.trim()
    if (!t || enviando) return
    setEnviando(true); setErro('')
    try {
      const r = await fetch('/api/crm/curriculos', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'responder', conversa: conversaId, texto: t }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setErro(d?.error || 'Não foi possível enviar.'); return }
      setTexto('')
      buscar()
    } catch { setErro('Sem conexão com o servidor.') } finally { setEnviando(false) }
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#f6f1ee' }}>
      <div className="flex-shrink-0 px-4 py-3 border-b flex items-center gap-3" style={{ background: '#fff', borderColor: '#e9ddd6' }}>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[14px] truncate" style={{ color: '#2b2320' }}>{nome}</p>
          <p className="text-[11.5px] truncate" style={{ color: '#9a8c85' }}>{telefone} · vaga: {vaga}</p>
        </div>
        {onFechar && (
          <button onClick={onFechar} aria-label="Fechar a conversa" className="p-2 rounded-lg" style={{ color: '#6e625c' }}><X size={18} /></button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto" style={{ maxWidth: 640 }}>
          {carregando && <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: COR }} /></div>}
          {!carregando && msgs.length === 0 && (
            <p className="text-center text-[12.5px] py-10" style={{ color: '#9a8c85' }}>Nenhuma mensagem ainda. Escreva a primeira abaixo.</p>
          )}
          {msgs.map((m, i) => {
            const meu = m.direcao === 'saida'
            const novoDia = i === 0 || dia(msgs[i - 1].criado_em) !== dia(m.criado_em)
            const semTexto = !m.texto || /^\[(imagem|audio|video|figurinha|documento)\]$/.test(m.texto)
            return (
              <div key={m.id}>
                {novoDia && <p className="text-center text-[11px] my-3" style={{ color: '#9a8c85' }}>{dia(m.criado_em)}</p>}
                <div className={`flex mb-1.5 ${meu ? 'justify-end' : 'justify-start'}`}>
                  <div className="rounded-2xl px-3 py-2 max-w-[80%]"
                    style={{ background: meu ? '#e6e1fa' : '#fff', color: '#2b2320', border: '1px solid ' + (meu ? '#d3cbf3' : '#e9ddd6') }}>
                    {m.midia_url && (m.tipo === 'imagem' || m.tipo === 'figurinha') && (
                      <a href={m.midia_url} target="_blank" rel="noreferrer"><img src={m.midia_url} alt="Imagem enviada" className="rounded-lg mb-1" style={{ maxHeight: 220 }} /></a>
                    )}
                    {m.midia_url && m.tipo === 'audio' && <audio controls src={m.midia_url} className="mb-1" style={{ maxWidth: 240 }} />}
                    {m.midia_url && m.tipo === 'video' && <video controls src={m.midia_url} className="rounded-lg mb-1" style={{ maxHeight: 220 }} />}
                    {m.midia_url && m.tipo === 'documento' && (
                      <a href={m.midia_url} target="_blank" rel="noreferrer" className="block text-[12px] font-bold underline mb-1">Abrir arquivo</a>
                    )}
                    {!semTexto && <p className="text-[13.5px] whitespace-pre-wrap break-words">{m.texto}</p>}
                    {semTexto && !m.midia_url && <p className="text-[12px]" style={{ color: '#9a8c85' }}>{m.texto}</p>}
                    <p className="text-[10px] mt-0.5 text-right flex items-center justify-end gap-1" style={{ color: '#9a8c85' }}>
                      {hora(m.criado_em)}
                      {meu && (m.situacao === 'na_fila' ? <Clock size={10} />
                        : m.situacao === 'lida' ? <CheckCheck size={11} style={{ color: COR }} />
                        : <Check size={11} />)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={fim} />
        </div>
      </div>

      <div className="flex-shrink-0 border-t px-4 py-3" style={{ background: '#fff', borderColor: '#e9ddd6' }}>
        {!!erro && <p className="text-[12px] font-bold mb-2" style={{ color: '#b91c1c' }}>{erro}</p>}
        <div className="mx-auto flex items-end gap-2" style={{ maxWidth: 640 }}>
          <textarea ref={caixa} value={texto} onChange={e => setTexto(e.target.value)} rows={2}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
            placeholder="Escreva a resposta... (Enter envia, Shift+Enter quebra a linha)"
            className="flex-1 px-3 py-2 rounded-xl text-[13.5px] focus:outline-none resize-none"
            style={{ background: '#f6f1ee', border: '1px solid #e9ddd6', color: '#2b2320' }} />
          <button onClick={enviar} disabled={enviando || !texto.trim()} aria-label="Enviar"
            className="p-3 rounded-xl disabled:opacity-50" style={{ background: COR, color: '#fff' }}>
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
