'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, X, Loader2, Check, CheckCheck, Clock, Paperclip, Mic, Square, FileText, Download } from 'lucide-react'
import { enviarArquivo } from '@/lib/enviarArquivo'
import EstrelasCandidato from '@/components/salon/EstrelasCandidato'

// ── Chat enxuto de candidatos ───────────────────────────────────────────────
//
// Texto, áudio (gravar, ouvir e ler por escrito) e arquivos de qualquer tipo
// permitido. Sem pastas, preços, mídias sociais ou ficha. Fala com
// /api/crm/curriculos, que lê e grava nas mesmas tabelas do CRM -- o que se
// escreve aqui aparece lá, e a resposta do candidato aparece aqui. O envio de
// arquivo e a transcrição usam as mesmas rotas que o CRM já usa; o código do
// CRM principal não é tocado.

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
const nomeDoArquivo = (url: string) => {
  let n = url.split('?')[0].split('/').pop() || 'arquivo'
  try { n = decodeURIComponent(n) } catch { /* mantém */ }
  return n.replace(/^\d{10,}_/, '')
}

// Áudio com o botão "Ver o que está no áudio" -- a mesma rota do CRM
// (/api/crm/transcrever), que guarda a transcrição na própria mensagem.
function AudioComTexto({ m }: { m: Msg }) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const ver = async () => {
    if (aberto) { setAberto(false); return }
    setAberto(true)
    if (texto || carregando) return
    setCarregando(true); setErro('')
    try {
      const r = await fetch('/api/crm/transcrever', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: m.id }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) setErro(j.error || 'Não consegui transcrever.'); else setTexto(j.texto || '')
    } catch { setErro('Sem conexão. Tente de novo.') }
    setCarregando(false)
  }
  return (
    <div className="mb-1" style={{ maxWidth: 260 }}>
      <audio src={m.midia_url || ''} controls style={{ maxWidth: 240 }} />
      <button type="button" onClick={ver} className="flex items-center gap-1 mt-1 text-[11.5px] font-bold underline" style={{ opacity: 0.8 }}>
        <FileText size={12} /> {aberto ? 'Esconder texto' : 'Ver o que está no áudio'}
      </button>
      {aberto && (
        <div className="mt-1 px-2 py-1.5 rounded text-[13px] leading-[1.4] whitespace-pre-wrap break-words"
          style={{ background: 'rgba(0,0,0,.05)', borderLeft: `3px solid ${COR}` }}>
          {carregando ? 'Ouvindo o áudio...' : erro ? <span style={{ color: '#b3261e' }}>{erro}</span> : texto}
        </div>
      )}
    </div>
  )
}

/** Perfil do candidato (só de quem veio do formulário): estrelas e quantas vezes já foi contatado. */
export interface PerfilCandidato {
  estrelas: number; contatos: number; textoContatos: string; extra: number
  onEstrelas: (n: number) => void; onContato: (delta: number) => void
}

export default function ChatCurriculos({ conversaId, nome, telefone, vaga, onFechar, perfil }: {
  conversaId: string; nome: string; telefone: string; vaga: string; onFechar?: () => void; perfil?: PerfilCandidato
}) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [carregando, setCarregando] = useState(true)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [anexando, setAnexando] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState('')
  const fim = useRef<HTMLDivElement>(null)
  const caixa = useRef<HTMLTextAreaElement>(null)
  const escolher = useRef<HTMLInputElement>(null)
  const gravador = useRef<MediaRecorder | null>(null)
  const pedacos = useRef<Blob[]>([])

  const buscar = async () => {
    try {
      const r = await fetch(`/api/crm/curriculos?conversa=${conversaId}`, { credentials: 'include' })
      if (!r.ok) return
      const d = await r.json()
      const novas: Msg[] = d.mensagens || []
      // Só troca quando algo mudou (nova mensagem, ou a situação de envio): senão
      // a tela piscaria e perderia a rolagem a cada volta.
      setMsgs(atual => {
        const assina = (l: Msg[]) => l.map(m => `${m.id}|${m.situacao}|${m.midia_url ? 1 : 0}|${(m.texto || '').length}`).join(';')
        return assina(atual) === assina(novas) ? atual : novas
      })
    } catch { /* tenta na próxima volta */ } finally { setCarregando(false) }
  }

  useEffect(() => {
    setMsgs([]); setCarregando(true); setErro(''); setTexto('')
    buscar()
    const t = setInterval(buscar, 3000)
    setTimeout(() => caixa.current?.focus(), 50)
    return () => { clearInterval(t); try { gravador.current?.state === 'recording' && gravador.current.stop() } catch { /* ok */ } }
  }, [conversaId])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs.length])

  const mandar = async (corpo: { texto?: string; midia_url?: string; tipo?: string }) => {
    const r = await fetch('/api/crm/curriculos', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'responder', conversa: conversaId, ...corpo }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d?.error || 'Não foi possível enviar.')
    buscar()
  }

  const enviar = async () => {
    const t = texto.trim()
    if (!t || enviando) return
    setEnviando(true); setErro('')
    try { await mandar({ texto: t }); setTexto('') }
    catch (e: any) { setErro(e?.message || 'Sem conexão com o servidor.') }
    finally { setEnviando(false) }
  }

  // Arquivo de qualquer tipo aceito pelo NODRI: sobe pelo mesmo caminho do CRM.
  const anexar = async (file: File) => {
    if (anexando) return
    setAnexando(true); setErro('')
    try {
      const { url, type } = await enviarArquivo(file)
      const m = String(type || file.type || '')
      const tipo = m.startsWith('image/') ? 'imagem' : m.startsWith('video/') ? 'video' : m.startsWith('audio/') ? 'audio' : 'documento'
      await mandar({ midia_url: url, tipo })
    } catch (e: any) { setErro(e?.message || 'Não consegui enviar o arquivo.') }
    finally { setAnexando(false); if (escolher.current) escolher.current.value = '' }
  }

  // Gravar áudio: onde houver ogg/opus vai como áudio de voz; senão como arquivo de áudio.
  const formatoDeAudio = () => {
    for (const t of ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t)) return t
    }
    return ''
  }
  const gravar = async () => {
    if (gravando) { gravador.current?.stop(); return }
    setErro('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = formatoDeAudio()
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      pedacos.current = []
      rec.ondataavailable = e => { if (e.data.size) pedacos.current.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())      // solta o microfone sempre
        setGravando(false)
        const blob = new Blob(pedacos.current, { type: mime || 'audio/webm' })
        if (blob.size < 1200) return                   // clique sem querer
        const ext = (mime || '').includes('ogg') ? 'ogg' : (mime || '').includes('mp4') ? 'm4a' : 'webm'
        await anexar(new File([blob], `audio_${Date.now()}.${ext}`, { type: blob.type }))
      }
      gravador.current = rec
      rec.start(); setGravando(true)
    } catch { setErro('Não consegui usar o microfone. Verifique a permissão do navegador.') }
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#f6f1ee' }}>
      <div className="flex-shrink-0 px-4 py-3 border-b flex items-center gap-3" style={{ background: '#fff', borderColor: '#e9ddd6' }}>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[14px] truncate" style={{ color: '#2b2320' }}>{nome}</p>
          <p className="text-[11.5px] truncate" style={{ color: '#9a8c85' }}>{telefone}{vaga ? ` · vaga: ${vaga}` : ''}</p>
          {perfil && (
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <EstrelasCandidato valor={perfil.estrelas} onChange={perfil.onEstrelas} tamanho={16} />
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: perfil.contatos === 0 ? 'rgba(128,128,150,.15)' : '#5b4fcf20', color: perfil.contatos === 0 ? '#767069' : COR }}>{perfil.textoContatos}</span>
              <button onClick={() => perfil.onContato(1)} title="Marcar mais um contato (feito fora do sistema)"
                className="text-[11px] font-bold px-1.5 py-0.5 rounded border" style={{ borderColor: COR + '40', color: COR }}>+1</button>
              {perfil.extra !== 0 && (
                <button onClick={() => perfil.onContato(-1)} title="Tirar um contato do ajuste manual"
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded border" style={{ borderColor: '#e6e3f2', color: '#767069' }}>-1</button>
              )}
            </div>
          )}
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
                      <a href={m.midia_url} target="_blank" rel="noreferrer"><img src={m.midia_url} alt="Imagem enviada" loading="lazy" className="rounded-lg mb-1" style={{ maxHeight: 240 }} /></a>
                    )}
                    {m.midia_url && m.tipo === 'audio' && <AudioComTexto m={m} />}
                    {m.midia_url && m.tipo === 'video' && <video controls src={m.midia_url} className="rounded-lg mb-1" style={{ maxHeight: 240 }} />}
                    {m.midia_url && m.tipo === 'documento' && (
                      <a href={m.midia_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 text-[12.5px] font-bold mb-1 px-2 py-2 rounded-lg" style={{ background: 'rgba(0,0,0,.05)', color: '#2b2320' }}>
                        <FileText size={16} /> <span className="truncate" style={{ maxWidth: 220 }}>{nomeDoArquivo(m.midia_url)}</span> <Download size={14} />
                      </a>
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
        {(anexando || gravando) && (
          <p className="text-[12px] font-bold mb-2 flex items-center gap-2" style={{ color: COR }}>
            {gravando ? <><span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: '#dc2626' }} /> Gravando... clique no quadrado para enviar</>
              : <><Loader2 size={13} className="animate-spin" /> Enviando o arquivo...</>}
          </p>
        )}
        <div className="mx-auto flex items-end gap-2" style={{ maxWidth: 640 }}>
          <input ref={escolher} type="file" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) anexar(f) }} />
          <button onClick={() => escolher.current?.click()} disabled={anexando || gravando} aria-label="Anexar arquivo" title="Anexar arquivo (foto, PDF, documento...)"
            className="p-3 rounded-xl border disabled:opacity-50" style={{ borderColor: '#e9ddd6', color: '#6e625c' }}><Paperclip size={18} /></button>
          <button onClick={gravar} disabled={anexando} aria-label={gravando ? 'Parar e enviar o áudio' : 'Gravar áudio'} title={gravando ? 'Parar e enviar' : 'Gravar áudio'}
            className="p-3 rounded-xl border disabled:opacity-50"
            style={{ borderColor: gravando ? '#dc2626' : '#e9ddd6', color: gravando ? '#fff' : '#6e625c', background: gravando ? '#dc2626' : undefined }}>
            {gravando ? <Square size={18} /> : <Mic size={18} />}
          </button>
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
