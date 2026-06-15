'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Trash2, Loader2, ChevronDown, Maximize2, Minimize2, Copy, Check, Printer } from 'lucide-react'

interface Mensagem {
  role: 'user' | 'assistant'
  content: string
}

function renderMarkdown(texto: string): string {
  if (!texto) return '<span style="opacity:0.4">...</span>'

  // Extrai blocos especiais antes de escapar HTML
  const blocos: string[] = []
  let html = texto

  // Blocos de código — preserva antes de escapar
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => {
    const idx = blocos.length
    blocos.push(`<pre style="background:#0d1117;border:1px solid #30363d;border-radius:10px;padding:14px 16px;overflow-x:auto;font-size:12.5px;line-height:1.7;margin:12px 0"><code style="color:#e6edf3;font-family:'Fira Mono',monospace">${code.trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`)
    return `\x00BLOCO${idx}\x00`
  })

  // Escapa HTML restante
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Código inline
  html = html.replace(/`([^`]+)`/g, '<code style="background:#1c2128;border:1px solid #30363d;border-radius:5px;padding:2px 7px;font-size:12.5px;font-family:monospace;color:#79c0ff">$1</code>')

  // Tabelas — zebra striping e hover
  html = html.replace(/(\|.+\|\n?)+/g, (block) => {
    const rows = block.trim().split('\n').filter(r => r.trim())
    const isSep = (r: string) => /^\|[\s\-:|]+\|$/.test(r.trim())
    let table = '<div style="overflow-x:auto;margin:14px 0;border-radius:10px;border:1px solid #30363d;overflow:hidden"><table style="width:100%;border-collapse:collapse;font-size:13px">'
    let isHead = true
    let rowIdx = 0
    for (const row of rows) {
      if (isSep(row)) { isHead = false; continue }
      const cells = row.split('|').filter((_, i, a) => i > 0 && i < a.length - 1)
      if (isHead) {
        table += `<thead><tr>${cells.map(c => `<th style="padding:10px 14px;background:#1c2128;color:#e6edf3;font-weight:600;text-align:left;font-size:12px;border-bottom:2px solid #f59e0b;white-space:nowrap">${c.trim()}</th>`).join('')}</tr></thead><tbody>`
      } else {
        const bg = rowIdx % 2 === 0 ? '#0d1117' : '#111827'
        table += `<tr style="background:${bg}">${cells.map(c => `<td style="padding:9px 14px;border-bottom:1px solid #21262d;color:#c9d1d9;font-size:13px">${c.trim()}</td>`).join('')}</tr>`
        rowIdx++
      }
    }
    table += '</tbody></table></div>'
    return table
  })

  // Linhas separadoras
  html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #21262d;margin:16px 0"/>')
  html = html.replace(/^═{3,}$/gm, '<hr style="border:none;border-top:2px solid #30363d;margin:20px 0"/>')

  // Títulos com visual destacado
  html = html.replace(/^#### (.+)$/gm, '<p style="font-size:13px;font-weight:700;color:#8b949e;margin:12px 0 4px;text-transform:uppercase;letter-spacing:.5px">$1</p>')
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:700;color:#e6edf3;margin:18px 0 8px;display:flex;align-items:center;gap:8px"><span style="width:3px;height:16px;background:#f59e0b;border-radius:2px;display:inline-block;flex-shrink:0"></span>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:17px;font-weight:700;color:#e6edf3;margin:22px 0 10px;padding-bottom:8px;border-bottom:2px solid #f59e0b44">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:700;color:#e6edf3;margin:22px 0 12px">$1</h1>')

  // Linhas com emoji no início (seções da IA: 📊 **Título**)
  html = html.replace(/^([\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}])\s*\*\*(.+?)\*\*/gmu, (_, emoji, titulo) =>
    `<div style="display:flex;align-items:center;gap:10px;margin:18px 0 10px;padding:10px 14px;background:#1c2128;border-radius:10px;border-left:3px solid #f59e0b"><span style="font-size:20px;flex-shrink:0">${emoji}</span><span style="color:#e6edf3;font-weight:700;font-size:15px">${titulo}</span></div>`
  )
  html = html.replace(/^([\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}])\s+(.+)$/gmu, (_, emoji, rest) =>
    `<div style="display:flex;gap:10px;align-items:flex-start;margin:8px 0"><span style="font-size:17px;flex-shrink:0;line-height:1.5">${emoji}</span><span style="color:#c9d1d9;line-height:1.7">${rest}</span></div>`
  )

  // Listas não-ordenadas
  html = html.replace(/((?:^[ \t]*[*\-•]\s.+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => l.replace(/^[ \t]*[*\-•]\s/, '').trim()).filter(Boolean)
    return '<ul style="margin:10px 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px">' +
      items.map(i => `<li style="display:flex;gap:10px;align-items:flex-start;color:#c9d1d9;line-height:1.7"><span style="color:#f59e0b;flex-shrink:0;font-size:16px;line-height:1.4">›</span><span>${i}</span></li>`).join('') +
      '</ul>'
  })

  // Listas ordenadas
  html = html.replace(/((?:^\d+\.\s.+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => l.replace(/^\d+\.\s/, '').trim()).filter(Boolean)
    return '<ol style="margin:10px 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px">' +
      items.map((item, idx) => `<li style="display:flex;gap:10px;align-items:flex-start;color:#c9d1d9;line-height:1.7"><span style="color:#f59e0b;flex-shrink:0;font-weight:700;font-size:13px;min-width:22px;background:#1c2128;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;margin-top:2px">${idx+1}</span><span>${item}</span></li>`).join('') +
      '</ol>'
  })

  // Negrito e itálico
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong style="color:#fff"><em>$1</em></strong>')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e6edf3;font-weight:600">$1</strong>')
  html = html.replace(/__(.*?)__/g, '<strong style="color:#e6edf3;font-weight:600">$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em style="color:#adbac7">$1</em>')

  // Quebras de linha → parágrafos
  html = html.replace(/\n\n+/g, '</p><p style="margin:10px 0;color:#c9d1d9;line-height:1.8">')
  html = html.replace(/\n/g, '<br/>')
  html = `<p style="margin:0;color:#c9d1d9;line-height:1.8;font-size:14px">${html}</p>`

  // Restaura blocos de código
  blocos.forEach((b, i) => { html = html.replace(`\x00BLOCO${i}\x00`, b) })

  return html
}

export default function ChatWidget() {
  const [aberto, setAberto] = useState(false)
  const [telaCheia, setTelaCheia] = useState(false)
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

  const fechar = () => { setAberto(false); setTelaCheia(false) }

  return (
    <>
      {/* Botão flutuante — sempre visível quando chat fechado */}
      {!aberto && (
        <button
          onClick={() => { setAberto(true); setTelaCheia(true) }}
          className="fixed flex items-center justify-center transition-all duration-300 hover:scale-110"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', width: 56, height: 56, borderRadius: '50%', bottom: 90, right: 24, zIndex: 10000, border: 'none', cursor: 'pointer', boxShadow: '0 4px 24px rgba(245,158,11,0.4)', position: 'fixed' }}
          title="NODRI IA"
        >
          <MessageCircle size={24} color="#000" />
          <span style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, background: '#22c55e', borderRadius: '50%', border: '2px solid #000' }} />
        </button>
      )}

      {/* Janela do chat — sempre tela cheia */}
      {aberto && (
        <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d1117', border: 'none', overflow: 'hidden', zIndex: 10001 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: '#161b22', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
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
              <button onClick={imprimir} title="Imprimir conversa" style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #30363d', borderRadius: 8, cursor: 'pointer', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <Printer size={14} /><span>Imprimir</span>
              </button>
              <button onClick={limpar} title="Nova conversa" style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #30363d', borderRadius: 8, cursor: 'pointer', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <Trash2 size={14} /><span>Limpar</span>
              </button>
              <button onClick={fechar} title="Fechar" style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #30363d', borderRadius: 8, cursor: 'pointer', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <X size={14} /><span>Fechar</span>
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px max(24px, calc(50% - 400px))', display: 'flex', flexDirection: 'column', gap: 0 }}>
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
            <div style={{ padding: '0 max(24px, calc(50% - 400px)) 12px', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
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
          <div style={{ padding: '16px max(24px, calc(50% - 400px))', borderTop: '1px solid #21262d', background: '#161b22', flexShrink: 0 }}>
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
