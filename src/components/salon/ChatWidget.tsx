'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Trash2, Loader2, ChevronDown } from 'lucide-react'

interface Mensagem {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatWidget() {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [conversaId, setConversaId] = useState<string | null>(null)
  const [iniciado, setIniciado] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (aberto && !iniciado) {
      setMensagens([{
        role: 'assistant',
        content: 'Olá! Sou a NODRI IA, sua diretora executiva virtual. Tenho acesso completo aos dados do seu salão. Como posso te ajudar hoje?'
      }])
      setIniciado(true)
    }
  }, [aberto, iniciado])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  useEffect(() => {
    if (aberto) setTimeout(() => inputRef.current?.focus(), 100)
  }, [aberto])

  const enviar = async () => {
    const texto = input.trim()
    if (!texto || carregando) return

    const novasMensagens: Mensagem[] = [...mensagens, { role: 'user', content: texto }]
    setMensagens(novasMensagens)
    setInput('')
    setCarregando(true)

    try {
      const res = await fetch('/api/ia/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagens: novasMensagens.filter(m => m.role !== 'assistant' || novasMensagens.indexOf(m) > 0),
          conversa_id: conversaId,
          modo: 'gestor'
        })
      })

      if (!res.ok) {
        const err = await res.json()
        setMensagens(prev => [...prev, { role: 'assistant', content: err.error || 'Erro ao processar. Tente novamente.' }])
        return
      }

      let resposta = ''
      setMensagens(prev => [...prev, { role: 'assistant', content: '' }])

      const reader = res.body!.getReader()
      const dec = new TextDecoder('utf-8', { fatal: false })
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          try {
            const d = JSON.parse(line.slice(5).trim())
            if (d.token) {
              resposta += d.token
              setMensagens(prev => {
                const atualizado = [...prev]
                atualizado[atualizado.length - 1] = { role: 'assistant', content: resposta }
                return atualizado
              })
            }
            if (d.conversa_id) setConversaId(d.conversa_id)
          } catch {}
        }
      }
    } catch (e: any) {
      setMensagens(prev => [...prev, { role: 'assistant', content: 'Erro de conexão. Tente novamente.' }])
    } finally {
      setCarregando(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const limpar = () => {
    setMensagens([{
      role: 'assistant',
      content: 'Olá! Sou a NODRI IA. Como posso te ajudar?'
    }])
    setConversaId(null)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  // Formata markdown básico
  const formatarTexto = (texto: string) => {
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110"
        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
        title="NODRI IA"
      >
        {aberto
          ? <ChevronDown size={24} className="text-black" />
          : <MessageCircle size={24} className="text-black" />
        }
        {!aberto && mensagens.length === 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-black animate-pulse" />
        )}
      </button>

      {/* Janela do chat */}
      {aberto && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] flex flex-col bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden"
          style={{ height: '520px' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800"
            style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-black"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>N</div>
              <div>
                <p className="text-white text-sm font-semibold">NODRI IA</p>
                <p className="text-green-400 text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" /> Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={limpar} title="Nova conversa"
                className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white">
                <Trash2 size={14} />
              </button>
              <button onClick={() => setAberto(false)}
                className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
            {mensagens.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black mr-2 flex-shrink-0 mt-1"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>N</div>
                )}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-500 text-black rounded-tr-sm'
                      : 'bg-gray-800 text-gray-100 rounded-tl-sm'
                  }`}
                  dangerouslySetInnerHTML={{ __html: msg.content ? formatarTexto(msg.content) : '<span class="opacity-40">...</span>' }}
                />
              </div>
            ))}
            {carregando && mensagens[mensagens.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black mr-2 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>N</div>
                <div className="bg-gray-800 px-3 py-2 rounded-2xl rounded-tl-sm">
                  <Loader2 size={14} className="text-amber-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Sugestões rápidas */}
          {mensagens.length <= 1 && (
            <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
              {['Como está o salão?', 'Quem faturou mais?', 'Ver ocorrências'].map(s => (
                <button key={s} onClick={() => { setInput(s); setTimeout(enviar, 50) }}
                  className="flex-shrink-0 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-full border border-gray-700 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-800 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Digite sua pergunta..."
              rows={1}
              disabled={carregando}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none disabled:opacity-50 transition-colors"
              style={{ maxHeight: '100px', overflowY: 'auto' }}
            />
            <button
              onClick={enviar}
              disabled={!input.trim() || carregando}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 hover:scale-105 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              {carregando
                ? <Loader2 size={16} className="text-black animate-spin" />
                : <Send size={16} className="text-black" />
              }
            </button>
          </div>
        </div>
      )}
    </>
  )
}
