'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Trash2, Loader2, ChevronDown, Maximize2, Minimize2, Copy, Check, Printer } from 'lucide-react'

interface Mensagem {
  role: 'user' | 'assistant'
  content: string
}

// Renderiza markdown completo: tabelas, listas, títulos, código, negrito, itálico
function renderMarkdown(texto: string): string {
  if (!texto) return '<span style="opacity:0.4">...</span>'

  let html = texto

  // Escapa HTML
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Blocos de código
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre style="background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px;overflow-x:auto;font-size:12px;line-height:1.6;margin:8px 0"><code style="color:#e6edf3;font-family:monospace">${code.trim()}</code></pre>`
  )
  html = html.replace(/`([^`]+)`/g, '<code style="background:#0d1117;border:1px solid #30363d;border-radius:4px;padding:2px 6px;font-size:12px;font-family:monospace;color:#79c0ff">$1</code>')

  // Tabelas
  html = html.replace(/(\|.+\|\n)+/g, (block) => {
    const rows = block.trim().split('\n').filter(r => r.trim())
    const isSep = (r: string) => /^\|[-| :]+\|$/.test(r.trim())
    let table = '<div style="overflow-x:auto;margin:10px 0"><table style="width:100%;border-collapse:collapse;font-size:13px">'
    let isHead = true
    for (const row of rows) {
      if (isSep(row)) { isHead = false; continue }
      const cells = row.split('|').filter((_, i, a) => i > 0 && i < a.length - 1)
      const tag = isHead ? 'th' : 'td'
      const style = isHead
        ? 'padding:8px 12px;border:1px solid #30363d;background:#161b22;color:#e6edf3;font-weight:600;text-align:left;font-size:12px'
        : 'padding:8px 12px;border:1px solid #21262d;color:#c9d1d9;font-size:12px'
      const trStyle = isHead ? '' : 'style="background:#0d1117"'
      table += `<tr ${trStyle}>${cells.map(c => `<${tag} style="${style}">${c.trim()}</${tag}>`).join('')}</tr>`
    }
    table += '</table></div>'
    return table
  })

  // Títulos
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;color:#e6edf3;margin:14px 0 6px;padding-bottom:4px;border-bottom:1px solid #21262d">$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:700;color:#e6edf3;margin:16px 0 8px;padding-bottom:6px;border-bottom:1px solid #30363d">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:18px;font-weight:700;color:#e6edf3;margin:16px 0 10px">$1</h1>')

  // Linhas separadoras
  html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #21262d;margin:12px 0"/>')
  html = html.replace(/^═{3,}$/gm, '<hr style="border:none;border-top:2px solid #30363d;margin:16px 0"/>')

  // Listas não-ordenadas
  html = html.replace(/((?:^[ \t]*[-•]\s.+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => l.replace(/^[ \t]*[-•]\s/, '').trim())
    return '<ul style="margin:8px 0 8px 4px;padding:0;list-style:none">' +
      items.map(i => `<li style="display:flex;gap:8px;align-items:flex-start;padding:3px 0;color:#c9d1d9;line-height:1.6"><span style="color:#f59e0b;flex-shrink:0;margin-top:2px">•</span><span>${i}</span></li>`).join('') +
      '</ul>'
  })

  // Listas ordenadas
  html = html.replace(/((?:^\d+\.\s.+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => l.replace(/^\d+\.\s/, '').trim())
    return '<ol style="margin:8px 0 8px 4px;padding:0;list-style:none;counter-reset:item">' +
      items.map((item, idx) => `<li style="display:flex;gap:8px;align-items:flex-start;padding:3px 0;color:#c9d1d9;line-height:1.6"><span style="color:#f59e0b;flex-shrink:0;font-weight:700;min-width:20px">${idx + 1}.</span><span>${item}</span></li>`).join('') +
      '</ol>'
  })

  // Negrito e itálico
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em style="color:#e6edf3">$1</em></strong>')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e6edf3;font-weight:600">$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em style="color:#adbac7">$1</em>')

  // Emojis com seção destacada (linha começa com emoji + texto)
  html = html.replace(/^([\u{1F300}-\u{1FFFF}]|[☀-⟿])\s+(.+)$/gmu, (_, emoji, rest) =>
    `<div style="display:flex;gap:8px;align-items:flex-start;margin:10px 0"><span style="font-size:18px;flex-shrink:0">${emoji}</span><span style="color:#e6edf3;font-weight:500">${rest}</span></div>`
  )

  // Quebras de linha
  html = html.replace(/\n\n/g, '</p><p style="margin:8px 0;color:#c9d1d9;line-height:1.7">')
  html = html.replace(/\n/g, '<br/>')
  html = `<p style="margin:0;color:#c9d1d9;line-height:1.7">${html}</p>`

  return html
}

export default function ChatWidget() {
  const [aberto, setAberto] = useState(false)
  const [telaCheia, setTelaCheia] = useState(true)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [conversaId, setConversaId] = useState<string | null>(null)
  const [iniciado, setIniciado] = useState(false)
  const [copiados, setCopiados] = useState<Set<number>>(new Set())
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
    if (aberto) setTimeout(() => inputRef.current?.focus(), 150)
  }, [aberto, telaCheia])

  const enviar = useCallback(async (textoOverride?: string) => {
    const texto = (textoOverride ?? input).trim()
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
    } catch {
      setMensagens(prev => [...prev, { role: 'assistant', content: 'Erro de conexão. Tente novamente.' }])
    } finally {
      setCarregando(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [input, carregando, mensagens, conversaId])

  const limpar = () => {
    setMensagens([{ role: 'assistant', content: 'Olá! Sou a NODRI IA. Como posso te ajudar?' }])
    setConversaId(null)
    setCopiados(new Set())
  }

  const copiarMensagem = (texto: string, idx: number) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiados(prev => new Set(prev).add(idx))
      setTimeout(() => setCopiados(prev => { const s = new Set(prev); s.delete(idx); return s }), 2000)
    })
  }

  const imprimir = () => {
    const janela = window.open('', '_blank')
    if (!janela) return
    const conteudo = mensagens.map(m =>
      m.role === 'user'
        ? `<div style="margin:16px 0;padding:12px 16px;background:#f3f4f6;border-radius:12px;border-left:4px solid #f59e0b"><strong>Você:</strong><br/>${m.content}</div>`
        : `<div style="margin:16px 0;padding:12px 16px;background:#fff;border-radius:12px;border-left:4px solid #1a1a2e"><strong>NODRI IA:</strong><br/>${renderMarkdown(m.content)}</div>`
    ).join('')
    janela.document.write(`<!DOCTYPE html><html><head><title>NODRI IA — Conversa</title>
      <style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#111;font-size:14px;line-height:1.6}
      h1{color:#1a1a2e;border-bottom:2px solid #f59e0b;padding-bottom:8px}
      table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}
      pre{background:#f3f4f6;padding:12px;border-radius:6px;overflow-x:auto}code{font-family:monospace}
      @media print{body{margin:20px}}</style></head>
      <body><h1>NODRI IA — Relatório de Conversa</h1>
      <p style="color:#666;font-size:12px">${new Date().toLocaleString('pt-BR')}</p>${conteudo}</body></html>`)
    janela.document.close()
    setTimeout(() => janela.print(), 500)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  const sugestoes = ['Como está o salão?', 'Quem faturou mais?', 'Ver ocorrências', 'Análise da equipe']

  // ── Dimensões do chat
  const chatStyle: React.CSSProperties = telaCheia
    ? { position: 'fixed', inset: 0, width: '100vw', height: '100vh', borderRadius: 0, zIndex: 10001 }
    : { position: 'fixed', width: '420px', maxWidth: 'calc(100vw - 24px)', height: '580px', bottom: '162px', right: '24px', borderRadius: '20px', zIndex: 10000 }

  return (
    <>
      {/* Botão flutuante */}
      {!telaCheia && (
        <button
          onClick={() => setAberto(v => !v)}
          className="fixed flex items-center justify-center transition-all duration-300 hover:scale-110"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', width: 56, height: 56, borderRadius: '50%', bottom: 90, right: 24, zIndex: 10000, border: 'none', cursor: 'pointer', boxShadow: '0 4px 24px rgba(245,158,11,0.4)' }}
          title="NODRI IA"
        >
          {aberto ? <ChevronDown size={24} color="#000" /> : <MessageCircle size={24} color="#000" />}
          {!aberto && (
            <span style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, background: '#22c55e', borderRadius: '50%', border: '2px solid #000' }} />
          )}
        </button>
      )}

      {/* Janela do chat */}
      {(aberto || telaCheia) && (
        <div style={{ ...chatStyle, display: 'flex', flexDirection: 'column', background: '#0d1117', border: '1px solid #21262d', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: telaCheia ? '14px 24px' : '12px 16px', background: '#161b22', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#000', flexShrink: 0 }}>N</div>
              <div>
                <p style={{ color: '#e6edf3', fontWeight: 700, fontSize: telaCheia ? 16 : 14, margin: 0 }}>NODRI IA</p>
                <p style={{ color: '#22c55e', fontSize: 11, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} /> Online
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={imprimir} title="Imprimir conversa" style={{ padding: '6px 8px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <Printer size={14} /> {telaCheia && <span>Imprimir</span>}
              </button>
              <button onClick={limpar} title="Nova conversa" style={{ padding: '6px 8px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <Trash2 size={14} /> {telaCheia && <span>Limpar</span>}
              </button>
              <button onClick={() => setTelaCheia(v => !v)} title={telaCheia ? 'Minimizar' : 'Tela cheia'} style={{ padding: '6px 8px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                {telaCheia ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {telaCheia && <span>Minimizar</span>}
              </button>
              {!telaCheia && (
                <button onClick={() => setAberto(false)} style={{ padding: '6px 8px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#8b949e' }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Mensagens */}
          <div style={{ flex: 1, overflowY: 'auto', padding: telaCheia ? '24px max(24px, calc(50% - 380px))' : '16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {mensagens.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 20 }}>
                {/* Rótulo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#000', flexShrink: 0 }}>N</div>
                  )}
                  <span style={{ fontSize: 12, color: '#8b949e', fontWeight: 600 }}>
                    {msg.role === 'assistant' ? 'NODRI IA' : 'Você'}
                  </span>
                  {msg.role === 'user' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#21262d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#8b949e' }}>U</div>
                  )}
                </div>

                {/* Balão */}
                <div style={{
                  maxWidth: telaCheia ? '760px' : '88%',
                  width: msg.role === 'assistant' ? '100%' : 'auto',
                  padding: msg.role === 'user' ? '10px 16px' : '14px 18px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#161b22',
                  border: msg.role === 'assistant' ? '1px solid #21262d' : 'none',
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: msg.role === 'user' ? '#000' : '#c9d1d9',
                  wordBreak: 'break-word',
                }}>
                  {msg.role === 'user'
                    ? <span style={{ fontWeight: 500 }}>{msg.content}</span>
                    : <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  }
                </div>

                {/* Ações da mensagem IA */}
                {msg.role === 'assistant' && msg.content && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, paddingLeft: 4 }}>
                    <button
                      onClick={() => copiarMensagem(msg.content, i)}
                      title="Copiar mensagem"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'transparent', border: '1px solid #21262d', borderRadius: 6, cursor: 'pointer', color: copiados.has(i) ? '#22c55e' : '#8b949e', fontSize: 11, transition: 'all 0.2s' }}
                    >
                      {copiados.has(i) ? <Check size={12} /> : <Copy size={12} />}
                      {copiados.has(i) ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Indicador de digitação */}
            {carregando && mensagens[mensagens.length - 1]?.role !== 'assistant' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#000' }}>N</div>
                  <span style={{ fontSize: 12, color: '#8b949e', fontWeight: 600 }}>NODRI IA</span>
                </div>
                <div style={{ padding: '14px 18px', background: '#161b22', border: '1px solid #21262d', borderRadius: '4px 18px 18px 18px' }}>
                  <Loader2 size={16} color="#f59e0b" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Sugestões */}
          {mensagens.length <= 1 && (
            <div style={{ padding: telaCheia ? '0 max(24px, calc(50% - 380px)) 12px' : '0 16px 10px', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
              {sugestoes.map(s => (
                <button key={s} onClick={() => enviar(s)}
                  style={{ fontSize: 12, background: '#161b22', border: '1px solid #30363d', color: '#8b949e', padding: '6px 14px', borderRadius: 20, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = '#f59e0b'; (e.target as HTMLButtonElement).style.color = '#f59e0b' }}
                  onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = '#30363d'; (e.target as HTMLButtonElement).style.color = '#8b949e' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: telaCheia ? '16px max(24px, calc(50% - 380px))' : '12px 16px', borderTop: '1px solid #21262d', background: '#161b22', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, background: '#0d1117', border: '1px solid #30363d', borderRadius: 14, padding: '10px 14px', transition: 'border-color 0.2s' }}
              onFocus={() => {}} >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
                }}
                onKeyDown={onKeyDown}
                placeholder="Pergunte algo sobre seu salão... (Enter para enviar, Shift+Enter para nova linha)"
                disabled={carregando}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e6edf3', fontSize: 14, lineHeight: 1.6, resize: 'none', minHeight: 24, maxHeight: 140, fontFamily: 'inherit' }}
                rows={1}
              />
              <button
                onClick={() => enviar()}
                disabled={!input.trim() || carregando}
                style={{ width: 36, height: 36, borderRadius: 10, background: input.trim() && !carregando ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#21262d', border: 'none', cursor: input.trim() && !carregando ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
              >
                {carregando
                  ? <Loader2 size={16} color="#8b949e" style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={16} color={input.trim() ? '#000' : '#8b949e'} />
                }
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#484f58', margin: '6px 0 0', textAlign: 'center' }}>
              NODRI IA pode cometer erros. Verifique informações importantes.
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        ::-webkit-scrollbar { width: 4px } ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px }
      `}</style>
    </>
  )
}
