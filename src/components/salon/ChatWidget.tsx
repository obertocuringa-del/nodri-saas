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
    blocos.push(`<pre style="background:#ffffff;border:1px solid #30363d;border-radius:10px;padding:14px 16px;overflow-x:auto;font-size:12.5px;line-height:1.7;margin:12px 0"><code style="color:#1a1a1a;font-family:'Fira Mono',monospace">${code.trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`)
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
        table += `<thead><tr>${cells.map(c => `<th style="padding:10px 14px;background:#1c2128;color:#1a1a1a;font-weight:600;text-align:left;font-size:12px;border-bottom:2px solid #f59e0b;white-space:nowrap">${c.trim()}</th>`).join('')}</tr></thead><tbody>`
      } else {
        const bg = rowIdx % 2 === 0 ? '#ffffff' : '#faf9f7'
        table += `<tr style="background:${bg}">${cells.map(c => `<td style="padding:9px 14px;border-bottom:1px solid #f0ede8;color:#6b6860;font-size:13px">${c.trim()}</td>`).join('')}</tr>`
        rowIdx++
      }
    }
    table += '</tbody></table></div>'
    return table
  })

  // Linhas separadoras
  html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #f0ede8;margin:16px 0"/>')
  html = html.replace(/^═{3,}$/gm, '<hr style="border:none;border-top:2px solid #30363d;margin:20px 0"/>')

  // Títulos com visual destacado
  html = html.replace(/^#### (.+)$/gm, '<p style="font-size:13px;font-weight:700;color:#6b6860;margin:12px 0 4px;text-transform:uppercase;letter-spacing:.5px">$1</p>')
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:700;color:#1a1a1a;margin:18px 0 8px;display:flex;align-items:center;gap:8px"><span style="width:3px;height:16px;background:#f59e0b;border-radius:2px;display:inline-block;flex-shrink:0"></span>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size:17px;font-weight:700;color:#1a1a1a;margin:22px 0 10px;padding-bottom:8px;border-bottom:2px solid #f59e0b44">$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:700;color:#1a1a1a;margin:22px 0 12px">$1</h1>')

  // Linhas com emoji no início (seções da IA: 📊 **Título**)
  html = html.replace(/^([\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}])\s*\*\*(.+?)\*\*/gmu, (_, emoji, titulo) =>
    `<div style="display:flex;align-items:center;gap:10px;margin:18px 0 10px;padding:10px 14px;background:#1c2128;border-radius:10px;border-left:3px solid #f59e0b"><span style="font-size:20px;flex-shrink:0">${emoji}</span><span style="color:#1a1a1a;font-weight:700;font-size:15px">${titulo}</span></div>`
  )
  html = html.replace(/^([\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}])\s+(.+)$/gmu, (_, emoji, rest) =>
    `<div style="display:flex;gap:10px;align-items:flex-start;margin:8px 0"><span style="font-size:17px;flex-shrink:0;line-height:1.5">${emoji}</span><span style="color:#6b6860;line-height:1.7">${rest}</span></div>`
  )

  // Listas não-ordenadas
  html = html.replace(/((?:^[ \t]*[*\-•]\s.+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => l.replace(/^[ \t]*[*\-•]\s/, '').trim()).filter(Boolean)
    return '<ul style="margin:10px 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px">' +
      items.map(i => `<li style="display:flex;gap:10px;align-items:flex-start;color:#6b6860;line-height:1.7"><span style="color:#b45309;flex-shrink:0;font-size:16px;line-height:1.4">›</span><span>${i}</span></li>`).join('') +
      '</ul>'
  })

  // Listas ordenadas
  html = html.replace(/((?:^\d+\.\s.+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => l.replace(/^\d+\.\s/, '').trim()).filter(Boolean)
    return '<ol style="margin:10px 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px">' +
      items.map((item, idx) => `<li style="display:flex;gap:10px;align-items:flex-start;color:#6b6860;line-height:1.7"><span style="color:#b45309;flex-shrink:0;font-weight:700;font-size:13px;min-width:22px;background:#1c2128;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;margin-top:2px">${idx+1}</span><span>${item}</span></li>`).join('') +
      '</ol>'
  })

  // Negrito e itálico
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong style="color:#fff"><em>$1</em></strong>')
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1a1a1a;font-weight:600">$1</strong>')
  html = html.replace(/__(.*?)__/g, '<strong style="color:#1a1a1a;font-weight:600">$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em style="color:#adbac7">$1</em>')

  // Quebras de linha → parágrafos
  html = html.replace(/\n\n+/g, '</p><p style="margin:10px 0;color:#6b6860;line-height:1.8">')
  html = html.replace(/\n/g, '<br/>')
  html = `<p style="margin:0;color:#6b6860;line-height:1.8;font-size:14px">${html}</p>`

  // Restaura blocos de código
  blocos.forEach((b, i) => { html = html.replace(`\x00BLOCO${i}\x00`, b) })

  return html
}

interface Prompt {
  id: string
  titulo: string
  script: string
}

const PROMPTS_KEY = 'nodri_prompts_salvos'

function carregarPrompts(): Prompt[] {
  try { return JSON.parse(localStorage.getItem(PROMPTS_KEY) || '[]') } catch { return [] }
}

function salvarPrompts(prompts: Prompt[]) {
  localStorage.setItem(PROMPTS_KEY, JSON.stringify(prompts))
}

export default function ChatWidget({ profissionalId, modoEmbarcado }: { profissionalId?: string; modoEmbarcado?: boolean } = {}) {
  const [aberto, setAberto] = useState(!!modoEmbarcado)
  const [telaCheia, setTelaCheia] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [conversaId, setConversaId] = useState<string | null>(null)
  const [iniciado, setIniciado] = useState(false)
  const [copiados, setCopiados] = useState<Set<number>>(new Set())
  const [gravandoVoz, setGravandoVoz] = useState(false)
  const [sidebarChatAberta, setSidebarChatAberta] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)

  const iniciarVoz = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { alert('Seu navegador não suporta reconhecimento de voz. Use Chrome.'); return }
    if (gravandoVoz) { recognitionRef.current?.stop(); return }
    const rec = new SpeechRecognition()
    rec.lang = 'pt-BR'
    rec.continuous = false
    rec.interimResults = false
    rec.onstart = () => setGravandoVoz(true)
    rec.onend = () => setGravandoVoz(false)
    rec.onerror = () => setGravandoVoz(false)
    rec.onresult = (e: any) => {
      const texto = e.results[0][0].transcript
      setInput(prev => prev ? prev + ' ' + texto : texto)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    recognitionRef.current = rec
    rec.start()
  }

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Biblioteca de prompts
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Prompt | null>(null)
  const [formTitulo, setFormTitulo] = useState('')
  const [formScript, setFormScript] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => { setPrompts(carregarPrompts()) }, [])

  const abrirNovo = () => { setEditando(null); setFormTitulo(''); setFormScript(''); setModalAberto(true) }
  const abrirEditar = (p: Prompt) => { setEditando(p); setFormTitulo(p.titulo); setFormScript(p.script); setModalAberto(true) }
  const fecharModal = () => { setModalAberto(false); setEditando(null) }

  const salvarPrompt = () => {
    if (!formTitulo.trim() || !formScript.trim()) return
    const novos = editando
      ? prompts.map(p => p.id === editando.id ? { ...p, titulo: formTitulo.trim(), script: formScript.trim() } : p)
      : [...prompts, { id: Date.now().toString(), titulo: formTitulo.trim(), script: formScript.trim() }]
    setPrompts(novos)
    salvarPrompts(novos)
    fecharModal()
  }

  const excluirPrompt = (id: string) => {
    const novos = prompts.filter(p => p.id !== id)
    setPrompts(novos)
    salvarPrompts(novos)
    setConfirmDelete(null)
  }

  const usarPrompt = (p: Prompt) => { setInput(p.script); setTimeout(() => inputRef.current?.focus(), 50) }

  useEffect(() => {
    if (aberto && !iniciado) {
      setMensagens([{
        role: 'assistant',
        content: profissionalId
          ? 'Olá! Sou a NODRI IA. Tenho acesso aos seus dados aqui no sistema. Como posso te ajudar hoje?'
          : 'Olá! Sou a NODRI IA, sua diretora executiva virtual. Tenho acesso completo aos dados do seu salão. Como posso te ajudar hoje?'
      }])
      setIniciado(true)
    }
  }, [aberto, iniciado, profissionalId])

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
          ...(profissionalId ? { profissional_id: profissionalId } : { modo: 'gestor' }),
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
  }, [input, carregando, mensagens, conversaId, profissionalId])

  const limpar = () => {
    setMensagens([{ role: 'assistant', content: 'Olá! Sou a NODRI IA. Como posso te ajudar?' }])
    setConversaId(null)
    setCopiados(new Set())
  }

  const copiarMensagem = (texto: string, idx: number) => {
    // Copia HTML formatado (para colar no Word com formatação) + texto puro como fallback
    const html = renderMarkdown(texto)
    const htmlLimpo = `
      <html><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111;line-height:1.6">
        <style>
          table{border-collapse:collapse;width:100%;margin:12px 0}
          th{background:#1a1a2e;color:#fff;padding:8px 12px;text-align:left;font-size:10pt}
          td{padding:7px 12px;border:1px solid #ddd;font-size:10pt}
          tr:nth-child(even) td{background:#f9f9f9}
          h1{font-size:16pt;color:#1a1a2e;border-bottom:2px solid #f59e0b;padding-bottom:4px}
          h2{font-size:14pt;color:#1a1a2e;border-bottom:1px solid #f59e0b;padding-bottom:3px}
          h3{font-size:12pt;color:#1a1a2e}
          ul{margin:8px 0;padding-left:20px}
          li{margin:4px 0}
          hr{border:none;border-top:1px solid #ddd;margin:12px 0}
        </style>
        ${html}
      </body></html>`

    try {
      const blob = new Blob([htmlLimpo], { type: 'text/html' })
      const blobText = new Blob([texto], { type: 'text/plain' })
      const item = new ClipboardItem({ 'text/html': blob, 'text/plain': blobText })
      navigator.clipboard.write([item]).then(() => {
        setCopiados(prev => new Set(prev).add(idx))
        setTimeout(() => setCopiados(prev => { const s = new Set(prev); s.delete(idx); return s }), 2000)
      })
    } catch {
      // Fallback: copia texto puro se ClipboardItem não for suportado
      navigator.clipboard.writeText(texto).then(() => {
        setCopiados(prev => new Set(prev).add(idx))
        setTimeout(() => setCopiados(prev => { const s = new Set(prev); s.delete(idx); return s }), 2000)
      })
    }
  }

  const CSS_IMPRESSAO = `
    @page { size: A4; margin: 18mm 16mm 20mm 16mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #1a1a2e; line-height: 1.55; background: #fff; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #5b4fcf; padding-bottom: 10px; margin-bottom: 16px; }
    .header-brand { font-size: 18pt; font-weight: 900; color: #5b4fcf; letter-spacing: -0.5px; }
    .header-brand span { color: #5b4fcf; }
    .header-meta { text-align: right; font-size: 8.5pt; color: #555; line-height: 1.4; }
    .header-meta strong { display: block; font-size: 10pt; color: #1a1a2e; }
    h1, h2, h3 { font-weight: 800; color: #1a1a2e; }
    h1 { font-size: 13pt; border-bottom: 2px solid #5b4fcf; padding-bottom: 5px; margin-bottom: 10px; color: #5b4fcf; }
    h2 { font-size: 11pt; background: linear-gradient(90deg,#f3f0ff,transparent); padding: 4px 8px; border-left: 4px solid #5b4fcf; margin: 12px 0 6px; color: #3d2070; }
    h3 { font-size: 10pt; color: #3d2070; margin: 8px 0 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 6px 0 10px; }
    th { background: #5b4fcf; color: #fff; padding: 5px 8px; text-align: left; font-weight: 700; font-size: 9pt; }
    td { padding: 4px 8px; border-bottom: 1px solid #e8e8f0; vertical-align: top; }
    tr:nth-child(even) td { background: #f8f7ff; }
    ul, ol { padding-left: 18px; margin: 4px 0 8px; }
    li { margin-bottom: 3px; }
    strong { font-weight: 700; color: #1a1a2e; }
    p { margin: 4px 0 8px; }
    hr { border: none; border-top: 1px solid #e8e8f0; margin: 10px 0; }
    .footer { margin-top: 28px; border-top: 2px solid #e8e8f0; padding-top: 18px; }
    .signature-area { display: flex; gap: 32px; margin-top: 10px; }
    .signature-block { flex: 1; }
    .signature-line { border-bottom: 1.5px solid #555; margin-bottom: 5px; height: 32px; }
    .signature-label { font-size: 8.5pt; color: #555; text-align: center; }
    .footer-note { font-size: 7.5pt; color: #999; text-align: center; margin-top: 14px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  `

  const imprimirMensagem = (conteudo: string) => {
    const hoje = new Date()
    const dataStr = `${hoje.getDate()} de ${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][hoje.getMonth()]} de ${hoje.getFullYear()}`
    // Converte markdown para HTML semântico para impressão
    const htmlConteudo = conteudo
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/^#{1}\s+(.+)$/gm,'<h1>$1</h1>')
      .replace(/^#{2}\s+(.+)$/gm,'<h2>$1</h2>')
      .replace(/^#{3}\s+(.+)$/gm,'<h3>$1</h3>')
      .replace(/^---+$/gm,'<hr/>')
      .replace(/(\|.+\|\n?)+/g, (block) => {
        const rows = block.trim().split('\n').filter(r => r.trim())
        const isSep = (r: string) => /^\|[\s\-:|]+\|$/.test(r.trim())
        let t = '<table>'
        let head = true
        for (const row of rows) {
          if (isSep(row)) { head = false; t += '<tbody>'; continue }
          const cells = row.split('|').filter((_,i,a) => i > 0 && i < a.length - 1)
          t += head ? `<thead><tr>${cells.map(c=>`<th>${c.trim()}</th>`).join('')}</tr></thead>` : `<tr>${cells.map(c=>`<td>${c.trim()}</td>`).join('')}</tr>`
        }
        return t + '</tbody></table>'
      })
      .replace(/^[•\-\*]\s+(.+)$/gm,'<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
      .replace(/^□\s+(.+)$/gm,'<li style="list-style:none">☐ $1</li>')
      .replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br/>')
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>NODRI IA</title><style>${CSS_IMPRESSAO}</style></head><body>
      <div class="header"><div class="header-brand">NOD<span>RI</span></div>
      <div class="header-meta"><strong>NODRI IA — Análise</strong>Emitido em ${dataStr}<br/><span style="color:#5b4fcf;font-weight:700">Documento Confidencial</span></div></div>
      <div>${htmlConteudo}</div>
      <div class="footer">
        <div class="signature-area">
          <div class="signature-block"><div class="signature-line"></div><div class="signature-label">Assinatura do Profissional</div></div>
          <div class="signature-block"><div class="signature-line"></div><div class="signature-label">Assinatura do Gestor</div></div>
          <div class="signature-block"><div class="signature-line"></div><div class="signature-label">Data de Ciência<br/>${dataStr}</div></div>
        </div>
        <div class="footer-note">Gerado automaticamente pela NODRI IA com base nos dados operacionais do salão.</div>
      </div>
      <script>window.onload=function(){window.print()}</script></body></html>`
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px;top:-9999px;'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) { document.body.removeChild(iframe); return }
    doc.open(); doc.write(html); doc.close()
    setTimeout(() => { iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1000) }, 400)
  }

  const imprimir = () => {
    const hoje = new Date()
    const dataStr = `${hoje.getDate()} de ${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][hoje.getMonth()]} de ${hoje.getFullYear()}`
    const conteudo = mensagens.map(m =>
      m.role === 'user'
        ? `<div style="margin:16px 0;padding:12px 16px;background:#f3f4f6;border-radius:12px;border-left:4px solid #f59e0b"><strong>Você:</strong><br/>${m.content}</div>`
        : `<div style="margin:16px 0;padding:12px 16px;background:#fff;border-radius:12px;border-left:4px solid #1a1a2e"><strong>NODRI IA:</strong><br/>${renderMarkdown(m.content)}</div>`
    ).join('')
    const html = `<!DOCTYPE html><html><head><title>NODRI IA — Conversa</title>
      <style>${CSS_IMPRESSAO}body{max-width:800px;margin:40px auto}</style></head>
      <body><div class="header"><div class="header-brand">NOD<span>RI</span></div>
      <div class="header-meta"><strong>Conversa NODRI IA</strong>${dataStr}</div></div>
      ${conteudo}</body></html>`
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px;top:-9999px;'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) { document.body.removeChild(iframe); return }
    doc.open(); doc.write(html); doc.close()
    setTimeout(() => { iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1000) }, 400)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  const sugestoesProfissional = [
    { titulo: 'Minhas metas', prompt: 'Quem já bateu a meta esse mês, quem ainda pode bater, quem está longe e quem definitivamente não vai bater? Me dá o ranking completo com o que ainda dá tempo de fazer.' },
    { titulo: 'Meu faturamento', prompt: 'Me mostre meu histórico de faturamento mês a mês, meu ticket médio, quantidade de serviços realizados e minha tendência atual.' },
    { titulo: 'Minhas ocorrências', prompt: 'Quais são minhas ocorrências registradas? Mostre tipos, datas e quantidades. O que elas indicam sobre meu perfil?' },
    { titulo: 'Minha posição na equipe', prompt: 'Como estou posicionado em relação à equipe? Mostre minha posição em faturamento, ticket médio e ocupação sem revelar nomes dos colegas.' },
  ]

  const sugestoesGestor = [
    { titulo: '💰 Melhor profissional', prompt: 'Qual profissional trouxe mais resultado financeiro nos últimos 3 meses e por quê?\n\nAnalise todos os profissionais dos últimos 90 dias.\n\nConsidere: faturamento total, comissão gerada, ticket médio, quantidade de atendimentos, ocupação.\n\nApresente um ranking completo. Identifique o profissional que trouxe o maior resultado financeiro e explique detalhadamente os fatores que contribuíram para seu desempenho.\n\nMostre: valor faturado, percentual de participação no faturamento do salão, principais serviços vendidos, principais diferenciais em relação aos demais.\n\nNão utilize opiniões. Baseie-se exclusivamente nos dados encontrados no sistema.' },
    { titulo: '📊 Serviços subaproveitados', prompt: 'Quais serviços têm o maior ticket médio e estão sendo pouco vendidos?\n\nAnalise todos os serviços cadastrados. Identifique: ticket médio, frequência de venda, receita gerada, comissão gerada.\n\nMonte um ranking dos serviços com maior ticket médio e baixa participação nas vendas.\n\nCalcule: potencial de faturamento perdido, potencial de comissão perdida.\n\nInforme quais serviços deveriam receber prioridade comercial nas próximas semanas.' },
    { titulo: '📅 Comparativo anual', prompt: 'Comparando este mês com o mesmo mês do ano passado, o salão cresceu ou regrediu?\n\nCompare: faturamento, ticket médio, quantidade de clientes, clientes recorrentes, ocupação.\n\nCalcule crescimento ou redução percentual. Explique os principais fatores responsáveis pela variação.' },
    { titulo: '📆 Faturamento por dia', prompt: 'Qual é o faturamento médio por dia da semana e qual dia é mais fraco?\n\nAnalise os últimos 12 meses. Calcule: faturamento médio por dia da semana, ticket médio por dia, quantidade média de clientes, ocupação média.\n\nIdentifique: melhor dia, pior dia, oportunidades de melhoria.' },
    { titulo: '💡 Simulação +10% ticket', prompt: 'Se eu aumentar 10% no ticket médio de cada profissional, quanto a mais entraria por mês?\n\nCalcule: ticket médio atual, faturamento atual, projeção com aumento de 10%.\n\nApresente: impacto por profissional, impacto total no salão. Mostre quais profissionais possuem maior potencial de crescimento.' },
    { titulo: '⚠️ Abaixo do potencial', prompt: 'Qual profissional está abaixo do potencial e o que está travando o desempenho dele?\n\nAnalise: histórico de faturamento, ocupação, ticket médio, retenção, ocorrências, evolução.\n\nIdentifique o profissional com maior diferença entre potencial e resultado atual. Explique o que está limitando seu crescimento e quanto ele poderia faturar se corrigisse os principais gargalos.' },
    { titulo: '📈 Ranking de ocupação', prompt: 'Quem tem a maior taxa de ocupação e quem tem a menor?\n\nAnalise toda a equipe. Mostre ranking de ocupação e diferença entre os extremos. Explique os fatores que diferenciam os profissionais com maior e menor ocupação.' },
    { titulo: '📉 Quedas de faturamento', prompt: 'Algum profissional teve queda de faturamento nos últimos 2 meses?\n\nCompare os últimos dois meses. Identifique: quem teve queda, valor perdido, percentual de queda. Investigue possíveis causas utilizando todos os dados disponíveis.' },
    { titulo: '🚨 Ocorrências da equipe', prompt: 'Qual profissional possui o maior número de ocorrências negativas?\n\nAnalise: atrasos, faltas, saídas antecipadas, advertências, feedbacks negativos. Apresente ranking completo. Explique quais tipos de ocorrências são mais recorrentes.' },
    { titulo: '🔴 Desempenho crítico', prompt: 'Se eu precisasse desligar um profissional por desempenho, quem seria o principal candidato?\n\nAnalise: faturamento, ocupação, retenção, ocorrências, evolução, impacto para o negócio.\n\nIdentifique o profissional com desempenho mais crítico. Justifique tecnicamente. Apresente também os riscos dessa decisão.' },
    { titulo: '🗓️ Meses mais fracos', prompt: 'Quais meses do ano historicamente são os mais fracos?\n\nAnalise todos os anos disponíveis. Identifique meses mais fortes e mais fracos. Apresente tendências históricas. Sugira ações preventivas.' },
    { titulo: '🔍 Serviço que sumiu', prompt: 'Existe algum serviço que era muito vendido e desapareceu do histórico?\n\nAnalise toda a série histórica. Identifique serviços que perderam relevância e o percentual da queda. Investigue possíveis causas.' },
    { titulo: '🔄 Retorno de clientes', prompt: 'Qual é o intervalo médio de retorno dos clientes?\n\nCalcule: retorno médio geral, retorno por categoria, retorno por profissional. Compare com o intervalo considerado ideal. Identifique riscos de perda de clientes.' },
    { titulo: '🕐 Horários ociosos', prompt: 'Existem horários ou dias com baixa ocupação?\n\nAnalise: horários, dias, meses. Identifique períodos ociosos. Sugira oportunidades promocionais.' },
    { titulo: '🚀 Como crescer 20%', prompt: 'Se eu quiser aumentar 20% no faturamento, qual é o caminho mais rápido?\n\nAnalise: ticket médio, ocupação, serviços, profissionais.\n\nApresente um plano estratégico priorizado. Mostre: impacto esperado, tempo estimado, dificuldade de execução.' },
    { titulo: '🎯 Serviços para impulsionar', prompt: 'Quais serviços devo impulsionar nas próximas semanas?\n\nAnalise: histórico de vendas, sazonalidade, ticket médio, comissão, tendência de crescimento. Monte ranking dos serviços prioritários.' },
    { titulo: '💤 Capacidade ociosa', prompt: 'Existe algum profissional com capacidade ociosa?\n\nAnalise: ocupação, potencial produtivo. Mostre quem poderia atender mais clientes. Estime o faturamento adicional possível.' },
    { titulo: '🛑 O que parar de fazer', prompt: 'O que os dados mostram que eu deveria parar de fazer imediatamente?\n\nAnalise: serviços pouco rentáveis, horários improdutivos, processos ineficientes. Liste os itens que estão consumindo recursos sem gerar resultado.' },
    { titulo: '🟢 Diagnóstico geral', prompt: 'Me dê um diagnóstico geral do salão.\n\nAnalise toda a operação. Separe em:\n🟢 O que está funcionando bem\n🟡 O que precisa melhorar\n🔴 O que exige ação imediata\n\nPriorize os riscos por impacto financeiro.' },
    { titulo: '⚫ Maior ameaça', prompt: 'Qual é a maior ameaça ao negócio hoje?\n\nAnalise: financeiro, comercial, operacional, recursos humanos, retenção de clientes, dependência de profissionais.\n\nIdentifique a ameaça mais relevante. Explique: probabilidade, impacto, consequências, plano de mitigação.' },
    { titulo: '🏆 Ranking de metas', prompt: 'Quem já bateu a meta esse mês, quem ainda pode bater, quem está longe e quem definitivamente não vai bater?\n\nAnalise todos os profissionais. Classifique em:\n🟢 Meta atingida\n🔵 Alta probabilidade de atingir\n🟡 Possibilidade moderada\n🔴 Baixa probabilidade\n⚫ Praticamente impossível atingir\n\nMonte ranking completo. Para cada profissional informe: meta, resultado atual, percentual atingido, valor faltante, probabilidade estimada, principais ações para aumentar as chances de sucesso.' },
  ]

  const sugestoesAtivas = profissionalId ? sugestoesProfissional : sugestoesGestor

  const fechar = () => {
    if (!modoEmbarcado) { setAberto(false); setTelaCheia(false) }
  }

  // Estilos do container: fixo quando floating, relativo quando embutido
  const containerStyle: React.CSSProperties = modoEmbarcado
    ? { position: 'relative', width: '100%', height: isMobile ? 'calc(100dvh - 120px)' : 'calc(100vh - 108px)', minHeight: 400, display: 'flex', flexDirection: 'column', background: '#ffffff', overflow: 'hidden' }
    : { position: 'fixed', inset: 0, width: '100vw', height: isMobile ? '100dvh' : '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff', border: 'none', overflow: 'hidden', zIndex: 10001 }

  return (
    <>
      {/* Botão flutuante — apenas no modo normal (não embutido) */}
      {!modoEmbarcado && !aberto && (
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

      {/* Janela do chat */}
      {aberto && (
        <div style={containerStyle}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#faf9f7', borderBottom: '1px solid #f0ede8', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Botão menu mobile */}
              {isMobile && (
                <button onClick={() => setSidebarChatAberta(v => !v)}
                  style={{ width: 34, height: 34, background: sidebarChatAberta ? '#f59e0b' : '#f0ede8', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}
                  title="Perguntas salvas"
                >
                  <span style={{ fontSize: 16, color: sidebarChatAberta ? '#000' : '#6b6860' }}>☰</span>
                </button>
              )}
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#000', flexShrink: 0 }}>N</div>
              <div>
                <p style={{ color: '#1a1a1a', fontWeight: 700, fontSize: telaCheia ? 16 : 14, margin: 0 }}>NODRI IA</p>
                <p style={{ color: '#15803d', fontSize: 11, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} /> Online
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={imprimir} title="Imprimir conversa" style={{ padding: '6px 8px', background: 'transparent', border: '1px solid #30363d', borderRadius: 8, cursor: 'pointer', color: '#6b6860', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <Printer size={14} /><span className="hidden sm:inline">Imprimir</span>
              </button>
              <button onClick={limpar} title="Limpar conversa" style={{ padding: '6px 8px', background: 'transparent', border: '1px solid #30363d', borderRadius: 8, cursor: 'pointer', color: '#6b6860', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <Trash2 size={14} /><span className="hidden sm:inline">Limpar</span>
              </button>
              {!modoEmbarcado && (
                <button onClick={fechar} title="Fechar" style={{ padding: '6px 8px', background: 'transparent', border: '1px solid #30363d', borderRadius: 8, cursor: 'pointer', color: '#6b6860', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <X size={14} /><span className="hidden sm:inline">Fechar</span>
                </button>
              )}
            </div>
          </div>

          {/* Layout: sidebar + chat */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

          {/* Overlay mobile para fechar sidebar ao clicar fora */}
          {isMobile && sidebarChatAberta && (
            <div onClick={() => setSidebarChatAberta(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 30 }}
            />
          )}

          {/* ── Sidebar Esquerda — Biblioteca de Prompts ── */}
          <div style={isMobile ? {
            width: 260, flexShrink: 0, background: '#faf9f7', borderRight: '1px solid #f0ede8',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            position: 'absolute', top: 0, left: sidebarChatAberta ? 0 : -260, bottom: 0, zIndex: 40,
            transition: 'left 0.25s ease',
          } : {
            width: 260, flexShrink: 0, background: '#faf9f7', borderRight: '1px solid #f0ede8',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Cabeçalho sidebar */}
            <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', textTransform: 'uppercase', letterSpacing: 1 }}>Perguntas Salvas</span>
              <button onClick={abrirNovo} title="Nova pergunta"
                style={{ width: 26, height: 26, borderRadius: 6, background: '#f59e0b', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: '#000', lineHeight: 1 }}>+</button>
            </div>
            {/* Lista */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
              {prompts.length === 0 && (
                <div style={{ padding: '16px 8px', textAlign: 'center' }}>
                  <p style={{ color: '#6b6860', fontSize: 12, lineHeight: 1.6, margin: 0 }}>Nenhuma pergunta salva ainda.<br/>Clique no <strong style={{ color: '#b45309' }}>+</strong> para criar.</p>
                </div>
              )}
              {prompts.map(p => (
                <div key={p.id}
                  style={{ borderRadius: 8, padding: '8px 10px', marginBottom: 4, background: '#ffffff', border: '1px solid #f0ede8', display: 'flex', alignItems: 'center', gap: 6, group: 'true' } as any}>
                  <button onClick={() => { usarPrompt(p); if (isMobile) setSidebarChatAberta(false) }} title={p.script}
                    style={{ flex: 1, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#6b6860', fontSize: 12, lineHeight: 1.4, padding: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {p.titulo}
                  </button>
                  <button onClick={() => abrirEditar(p)} title="Editar"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b6860', padding: '2px 4px', fontSize: 13, lineHeight: 1, flexShrink: 0 }}>✏</button>
                  {confirmDelete === p.id
                    ? <span style={{ display: 'flex', gap: 2 }}>
                        <button onClick={() => excluirPrompt(p.id)} style={{ background: '#ef4444', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#fff', fontSize: 10, padding: '2px 5px' }}>Sim</button>
                        <button onClick={() => setConfirmDelete(null)} style={{ background: '#f0ede8', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#6b6860', fontSize: 10, padding: '2px 5px' }}>Não</button>
                      </span>
                    : <button onClick={() => setConfirmDelete(p.id)} title="Excluir"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b6860', padding: '2px 4px', fontSize: 13, lineHeight: 1, flexShrink: 0 }}>✕</button>
                  }
                </div>
              ))}

              {/* Seção de perguntas inteligentes fixas */}
              <div style={{ marginTop: prompts.length > 0 ? 12 : 0, paddingTop: prompts.length > 0 ? 12 : 0, borderTop: prompts.length > 0 ? '1px solid #f0ede8' : 'none' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#6b6860', textTransform: 'uppercase', letterSpacing: 1, margin: '0 2px 8px' }}>
                  {profissionalId ? 'Análises rápidas' : 'Análises inteligentes'}
                </p>
                {sugestoesAtivas.map(s => (
                  <div key={s.titulo}
                    style={{ borderRadius: 8, padding: '7px 10px', marginBottom: 4, background: '#ffffff', border: '1px solid #f0ede8', cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onClick={() => { setInput(s.prompt); setTimeout(() => inputRef.current?.focus(), 50); if (isMobile) setSidebarChatAberta(false) }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#f59e0b')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#f0ede8')}
                  >
                    <span style={{ fontSize: 12, color: '#6b6860', lineHeight: 1.4, display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {s.titulo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Área do chat ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Mensagens */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 12px' : '24px max(24px, calc(50% - 400px))', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {mensagens.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 20 }}>
                {/* Rótulo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#000', flexShrink: 0 }}>N</div>
                  )}
                  <span style={{ fontSize: 12, color: '#6b6860', fontWeight: 600 }}>
                    {msg.role === 'assistant' ? 'NODRI IA' : 'Você'}
                  </span>
                  {msg.role === 'user' && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#6b6860' }}>U</div>
                  )}
                </div>

                {/* Balão */}
                <div style={{
                  maxWidth: telaCheia ? '760px' : '88%',
                  width: msg.role === 'assistant' ? '100%' : 'auto',
                  padding: msg.role === 'user' ? '10px 16px' : '14px 18px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#faf9f7',
                  border: msg.role === 'assistant' ? '1px solid #f0ede8' : 'none',
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
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'transparent', border: '1px solid #f0ede8', borderRadius: 6, cursor: 'pointer', color: copiados.has(i) ? '#22c55e' : '#6b6860', fontSize: 11, transition: 'all 0.2s' }}
                    >
                      {copiados.has(i) ? <Check size={12} /> : <Copy size={12} />}
                      {copiados.has(i) ? 'Copiado!' : 'Copiar'}
                    </button>
                    <button
                      onClick={() => imprimirMensagem(msg.content)}
                      title="Imprimir esta mensagem"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'transparent', border: '1px solid #f0ede8', borderRadius: 6, cursor: 'pointer', color: '#6b6860', fontSize: 11, transition: 'all 0.2s' }}
                    >
                      <Printer size={12} />
                      Imprimir
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
                  <span style={{ fontSize: 12, color: '#6b6860', fontWeight: 600 }}>NODRI IA</span>
                </div>
                <div style={{ padding: '14px 18px', background: '#faf9f7', border: '1px solid #f0ede8', borderRadius: '4px 18px 18px 18px' }}>
                  <Loader2 size={16} color="#f59e0b" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>


          {/* Input */}
          <div style={{ padding: isMobile ? '10px 12px' : '16px max(24px, calc(50% - 400px))', borderTop: '1px solid #f0ede8', background: '#faf9f7', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, background: '#ffffff', border: '1px solid #30363d', borderRadius: 14, padding: '10px 14px', transition: 'border-color 0.2s' }}
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
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#1a1a1a', fontSize: 14, lineHeight: 1.6, resize: 'none', minHeight: 24, maxHeight: 140, fontFamily: 'inherit' }}
                rows={1}
              />
              <button
                onClick={iniciarVoz}
                title={gravandoVoz ? 'Parar gravação' : 'Falar com a IA'}
                style={{ width: 36, height: 36, borderRadius: 10, background: gravandoVoz ? 'linear-gradient(135deg,#ef4444,#dc2626)' : '#f0ede8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
              >
                <span style={{ fontSize: 16 }}>{gravandoVoz ? '⏹' : '🎤'}</span>
              </button>
              <button
                onClick={() => enviar()}
                disabled={!input.trim() || carregando}
                style={{ width: 36, height: 36, borderRadius: 10, background: input.trim() && !carregando ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#f0ede8', border: 'none', cursor: input.trim() && !carregando ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
              >
                {carregando
                  ? <Loader2 size={16} color="#6b6860" style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={16} color={input.trim() ? '#000' : '#6b6860'} />
                }
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#6b6860', margin: '6px 0 0', textAlign: 'center' }}>
              NODRI IA pode cometer erros. Verifique informações importantes.
            </p>
          </div>
          </div>{/* fim área chat */}
          </div>{/* fim layout */}
        </div>
      )}

      {/* ── Modal Nova/Editar Pergunta ── */}
      {modalAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#faf9f7', border: '1px solid #30363d', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: 16, fontWeight: 700 }}>
                {editando ? 'Editar Pergunta' : 'Nova Pergunta'}
              </h3>
              <button onClick={fecharModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b6860', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6860', textTransform: 'uppercase', letterSpacing: .5 }}>Título (aparece na lista)</label>
              <input value={formTitulo} onChange={e => setFormTitulo(e.target.value)}
                placeholder="Ex: Análise da equipe completa"
                style={{ background: '#ffffff', border: '1px solid #30363d', borderRadius: 8, padding: '10px 14px', color: '#1a1a1a', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6860', textTransform: 'uppercase', letterSpacing: .5 }}>Script completo (enviado ao chat)</label>
              <textarea value={formScript} onChange={e => setFormScript(e.target.value)} rows={6}
                placeholder="Ex: Faça uma análise completa da equipe com faturamento, ocorrências e ranking de cada profissional no período atual. Apresente em tabela e destaque pontos de atenção."
                style={{ background: '#ffffff', border: '1px solid #30363d', borderRadius: 8, padding: '10px 14px', color: '#1a1a1a', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6 }} />
              <p style={{ margin: 0, fontSize: 11, color: '#6b6860' }}>O script é o texto completo enviado à IA. O título é só um atalho para você identificar.</p>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={fecharModal}
                style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #30363d', borderRadius: 8, cursor: 'pointer', color: '#6b6860', fontSize: 14 }}>
                Cancelar
              </button>
              <button onClick={salvarPrompt} disabled={!formTitulo.trim() || !formScript.trim()}
                style={{ padding: '9px 20px', background: formTitulo.trim() && formScript.trim() ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#f0ede8', border: 'none', borderRadius: 8, cursor: formTitulo.trim() && formScript.trim() ? 'pointer' : 'default', color: formTitulo.trim() && formScript.trim() ? '#000' : '#e8e6e0', fontWeight: 700, fontSize: 14 }}>
                {editando ? 'Salvar alterações' : 'Criar pergunta'}
              </button>
            </div>
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
