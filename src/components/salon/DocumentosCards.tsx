'use client'

// Página de documentos em cards (ex.: Licenças e Contratos Administrativos).
//
// Cada documento é um card: um título que diz o tipo, o arquivo anexado
// (PDF, Word, Excel, imagem ou vídeo), e as ações — abrir, baixar e
// compartilhar por WhatsApp ou e-mail. Salvo em salao_config na chave passada.

import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react'
import toast from 'react-hot-toast'
import {
  Loader2, Plus, Trash2, Upload, Download, Share2, MessageCircle, Mail,
  FileText, FileSpreadsheet, FileVideo, FileImage, File as FileIcon, X,
} from 'lucide-react'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { enviarArquivo as subirArquivo } from '@/lib/enviarArquivo'

interface Doc { id: string; titulo: string; obs?: string; url?: string; filename?: string; tipo?: string; data?: string }
const rid = () => Math.random().toString(36).slice(2, 9)
const hojeISO = () => new Date().toLocaleDateString('en-CA')

/** Ícone e rótulo pela extensão/tipo do arquivo. */
function infoArquivo(d: Doc): { icone: any; cor: string; rotulo: string } {
  const nome = (d.filename || '').toLowerCase()
  const t = (d.tipo || '').toLowerCase()
  if (/\.pdf$/.test(nome) || t.includes('pdf')) return { icone: FileText, cor: '#dc2626', rotulo: 'PDF' }
  if (/\.(xlsx?|csv)$/.test(nome) || t.includes('sheet') || t.includes('excel')) return { icone: FileSpreadsheet, cor: '#16a34a', rotulo: 'Planilha' }
  if (/\.docx?$/.test(nome) || t.includes('word') || t.includes('document')) return { icone: FileText, cor: '#2563eb', rotulo: 'Word' }
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(nome) || t.startsWith('video')) return { icone: FileVideo, cor: '#7c3aed', rotulo: 'Vídeo' }
  if (/\.(png|jpe?g|gif|webp|heic)$/.test(nome) || t.startsWith('image')) return { icone: FileImage, cor: '#db2777', rotulo: 'Imagem' }
  return { icone: FileIcon, cor: '#6b7280', rotulo: 'Arquivo' }
}

export default function DocumentosCards({ chave, titulo, subtitulo, corTema = '#5b4fcf' }: {
  chave: string; titulo: string; subtitulo?: string; corTema?: string
}) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [subindo, setSubindo] = useState<string | null>(null)
  const [compartilhar, setCompartilhar] = useState<Doc | null>(null)
  useGuardaSalvar(dirty, titulo)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${chave}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.itens)) setDocs(d.itens)
    } catch { /* */ }
    setDirty(false); setLoading(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  const salvar = useCallback(async (lista?: Doc[]) => {
    const dados = lista || docs
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave, doc: { itens: dados } }),
      })
      if (res.ok) { toast.success('Salvo!'); setDirty(false) } else toast.error('Não foi possível salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }, [chave, docs])

  function add() { setDocs(l => [{ id: rid(), titulo: '', data: hojeISO() }, ...l]); setDirty(true) }
  function setCampo(id: string, campo: keyof Doc, v: string) { setDocs(l => l.map(d => d.id === id ? { ...d, [campo]: v } : d)); setDirty(true) }
  function remover(id: string) { if (!confirm('Excluir este documento?')) return; const lista = docs.filter(d => d.id !== id); setDocs(lista); salvar(lista) }

  async function anexar(id: string, file: File | null) {
    if (!file) return
    setSubindo(id)
    try {
      const d = await subirArquivo(file)
      const lista = docs.map(x => x.id === id ? { ...x, url: d.url, filename: d.filename, tipo: d.type } : x)
      setDocs(lista); salvar(lista); toast.success('Arquivo anexado!')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro de conexão') }
    setSubindo(null)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
      <Loader2 size={26} className="animate-spin" style={{ color: corTema }} />
    </div>
  )

  return (
    <div>
      <style>{`
        .doc-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(215px, 1fr)); gap:14px; }
        @media (max-width:640px){ .doc-grid { grid-template-columns:1fr 1fr; gap:10px; } }
        .doc-card { background:#fff; border:1px solid #eceae4; border-radius:16px; overflow:hidden;
          display:flex; flex-direction:column; transition:box-shadow .18s, transform .18s; }
        .doc-card:hover { box-shadow:0 10px 26px rgba(20,15,45,.10); transform:translateY(-2px); }
        .doc-card:hover .doc-lixo { opacity:1; }
        .doc-lixo { opacity:0; transition:opacity .15s; }
        .doc-tit { width:100%; border:1px solid transparent; background:transparent; outline:none;
          font-size:14px; font-weight:800; color:#1a1a2e; padding:3px 6px; border-radius:7px; }
        .doc-tit:hover, .doc-tit:focus { border-color:#e0ddd8; background:#fbfbfa; }
        .doc-obs { width:100%; border:1px solid transparent; background:transparent; outline:none;
          font-size:11.5px; color:#8a8680; padding:2px 6px; border-radius:6px; }
        .doc-obs:hover, .doc-obs:focus { border-color:#e0ddd8; background:#fbfbfa; }
        .doc-acao { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:5px;
          padding:9px 0; border:none; font-size:12px; font-weight:800; cursor:pointer; text-decoration:none; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h2 style={{ fontSize: 19, fontWeight: 900, color: '#1a1a2e', margin: 0, letterSpacing: '-.3px' }}>{titulo}</h2>
          <p style={{ fontSize: 12.5, color: '#8a8680', margin: '3px 0 0' }}>{subtitulo || 'Anexe cada documento e compartilhe por WhatsApp ou e-mail.'}</p>
        </div>
        <button onClick={add}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 18px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${corTema},#7c6fe0)`, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
          <Plus size={17} /> Novo documento
        </button>
        <button onClick={() => salvar()} disabled={salvando || !dirty}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 16px', borderRadius: 12, border: 'none', background: dirty ? '#16a34a' : '#d7d5cf', color: '#fff', fontSize: 13, fontWeight: 800, cursor: dirty ? 'pointer' : 'default' }}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '46px 20px', background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 16 }}>
          <FileText size={30} style={{ color: '#d7d5cf', display: 'inline' }} />
          <p style={{ color: '#8a8680', fontSize: 13.5, fontWeight: 700, margin: '8px 0 0' }}>Nenhum documento ainda.</p>
          <p style={{ color: '#a8a49d', fontSize: 12, margin: '4px 0 0' }}>Clique em “Novo documento” para anexar o primeiro.</p>
        </div>
      ) : (
        <div className="doc-grid">
          {docs.map(d => {
            const info = infoArquivo(d)
            const Icone = info.icone
            const ehImagem = info.rotulo === 'Imagem' && d.url
            return (
              <div key={d.id} className="doc-card">
                {/* Prévia: a própria imagem quando é imagem; senão, o ícone do
                    tipo sobre um fundo na cor dele. Clicar abre o arquivo. */}
                <div style={{ position: 'relative', aspectRatio: '16 / 10', background: d.url ? info.cor + '10' : '#f7f6f3', overflow: 'hidden' }}>
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noopener noreferrer" title="Abrir arquivo"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      {ehImagem
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={d.url} alt={d.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <Icone size={40} style={{ color: info.cor, opacity: .85 }} />}
                    </a>
                  ) : (
                    <button onClick={() => fileRefs.current[d.id]?.click()}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', height: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: '#b9b4a8' }}>
                      <Upload size={24} />
                      <span style={{ fontSize: 11.5, fontWeight: 700 }}>Anexar arquivo</span>
                    </button>
                  )}

                  {d.url && (
                    <span style={{ position: 'absolute', top: 8, left: 8, background: info.cor, color: '#fff', fontSize: 9, fontWeight: 900, letterSpacing: '.5px', padding: '3px 8px', borderRadius: 99 }}>
                      {info.rotulo.toUpperCase()}
                    </span>
                  )}
                  <button className="doc-lixo" onClick={() => remover(d.id)} title="Excluir"
                    style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 99, border: 'none', background: 'rgba(255,255,255,.92)', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.12)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>

                <div style={{ padding: '10px 9px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <input className="doc-tit" value={d.titulo} onChange={e => setCampo(d.id, 'titulo', e.target.value)}
                    placeholder="Nome do documento" />
                  <input className="doc-obs" value={d.obs || ''} onChange={e => setCampo(d.id, 'obs', e.target.value)}
                    placeholder="Validade, nº, órgão…" />
                  {d.filename && (
                    <div style={{ fontSize: 10, color: '#b9b4a8', padding: '3px 6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.filename}</div>
                  )}
                </div>

                <input ref={el => { fileRefs.current[d.id] = el }} type="file" style={{ display: 'none' }}
                  onChange={e => { anexar(d.id, e.target.files?.[0] || null); e.currentTarget.value = '' }} />

                <div style={{ display: 'flex', borderTop: '1px solid #f2f0ec' }}>
                  {d.url ? (
                    <>
                      <a className="doc-acao" href={`${d.url}?download=${encodeURIComponent(d.filename || 'arquivo')}`} target="_blank" rel="noopener noreferrer"
                        style={{ background: '#fff', color: '#6b6860', borderRight: '1px solid #f2f0ec' }}>
                        <Download size={14} /> Baixar
                      </a>
                      <button className="doc-acao" onClick={() => setCompartilhar(d)} style={{ background: '#fff', color: '#16a34a' }}>
                        <Share2 size={14} /> Enviar
                      </button>
                    </>
                  ) : (
                    <button className="doc-acao" onClick={() => fileRefs.current[d.id]?.click()} disabled={subindo === d.id}
                      style={{ background: '#fff', color: corTema }}>
                      {subindo === d.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Anexar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {compartilhar && <ModalCompartilhar doc={compartilhar} onClose={() => setCompartilhar(null)} />}
    </div>
  )
}

function ModalCompartilhar({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const [enviando, setEnviando] = useState(false)
  const titulo = doc.titulo || doc.filename || 'Documento'
  const url = doc.url || ''
  const texto = `*${titulo}*${doc.obs ? `\n${doc.obs}` : ''}`

  /** Baixa o arquivo do storage e devolve como File, para poder anexar. */
  async function pegarArquivo(): Promise<File | null> {
    try {
      const r = await fetch(url)
      if (!r.ok) return null
      const blob = await r.blob()
      return new File([blob], doc.filename || 'documento', { type: blob.type || 'application/octet-stream' })
    } catch { return null }
  }

  // Manda o ARQUIVO, não o link. No celular abre o menu de compartilhar do
  // sistema (WhatsApp, e-mail, Drive…) com o arquivo anexado. No computador,
  // onde o navegador não deixa anexar, baixa o arquivo e abre o WhatsApp com
  // o texto — aí é só arrastar o arquivo para a conversa.
  async function enviarArquivo() {
    setEnviando(true)
    const file = await pegarArquivo()
    const nav = navigator as any
    if (file && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], text: texto })
        setEnviando(false); onClose(); return
      } catch { /* cancelou ou falhou → cai no download */ }
    }
    if (file) {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(file); a.download = doc.filename || 'documento'
      a.click(); URL.revokeObjectURL(a.href)
      try { await navigator.clipboard?.writeText(texto) } catch { /* segue */ }
      toast('Arquivo baixado e texto copiado — anexe na conversa.', { icon: '📎', duration: 6000 })
    } else {
      toast.error('Não foi possível baixar o arquivo. Use “Copiar link”.')
    }
    setEnviando(false); onClose()
  }

  const whatsLink = () => { window.open(`https://wa.me/?text=${encodeURIComponent(`${texto}\n\n${url}`)}`, '_blank', 'noopener'); onClose() }
  const email = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(titulo)}&body=${encodeURIComponent(`${doc.obs ? doc.obs + '\n\n' : ''}${url}`)}`
    onClose()
  }
  const copiar = () => { navigator.clipboard?.writeText(url).then(() => { toast.success('Link copiado!'); onClose() }).catch(() => toast.error('Não foi possível copiar')) }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(20,15,45,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: 22, width: 'min(400px,100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <b style={{ fontSize: 16, color: '#1a1a2e' }}>Compartilhar documento</b>
          <button onClick={onClose} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b6860' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 12.5, color: '#8a857c', margin: '0 0 16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <button onClick={enviarArquivo} disabled={enviando} style={botao('#16a34a', '#dcfce7')}>
            {enviando ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
            <span style={{ textAlign: 'left' }}>
              Enviar o arquivo
              <span style={{ display: 'block', fontSize: 10.5, fontWeight: 600, opacity: .8 }}>Vai o documento, não o link</span>
            </span>
          </button>
          <button onClick={whatsLink} style={botao('#16a34a', '#f0fdf4')}><MessageCircle size={18} /> WhatsApp com o link</button>
          <button onClick={email} style={botao('#4f46e5', '#eef2ff')}><Mail size={18} /> E-mail com o link</button>
          <button onClick={copiar} style={botao('#6b7280', '#f3f4f6')}><FileText size={18} /> Copiar link</button>
        </div>
        <p style={{ fontSize: 11, color: '#a8a49d', margin: '14px 0 0', lineHeight: 1.5 }}>
          No celular, “Enviar o arquivo” abre o compartilhamento do sistema com o documento já anexado. No computador o
          navegador não deixa anexar direto: o arquivo é baixado e o texto copiado, aí é só arrastar para a conversa.
        </p>
      </div>
    </div>
  )
}

function botao(cor: string, fundo: string): CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 12, border: 'none', background: fundo, color: cor, fontSize: 14, fontWeight: 800, cursor: 'pointer', width: '100%' }
}
