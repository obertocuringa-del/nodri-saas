'use client'

import { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, Trash2, ChevronUp, ChevronDown, BookOpen, Pencil, Eye } from 'lucide-react'
import { getLogoSalao } from '@/lib/logoSalao'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { NORMA_CONDUTA_BLOCOS } from '@/lib/normaConduta'

const CHAVE = 'norma_conduta'
const ROXO = '#5b4fcf'
const rid = () => Math.random().toString(36).slice(2, 8)

interface Bloco { id: string; titulo: string; corpo: string }

/* ── Interpreta o texto do bloco em linhas tipadas (para render e impressão) ── */
type Linha =
  | { t: 'sub'; v: string }      // subtítulo em caixa alta (FINALIDADE, RESPONSABILIDADE…)
  | { t: 'item'; v: string }     // • item
  | { t: 'sub-item'; v: string } // – sub-item
  | { t: 'fala'; v: string }     // "frase entre aspas"
  | { t: 'p'; v: string }        // parágrafo
  | { t: 'vazio' }

function analisar(corpo: string): Linha[] {
  return corpo.split('\n').map<Linha>(raw => {
    const l = raw.trim()
    if (!l) return { t: 'vazio' }
    if (l.startsWith('•')) return { t: 'item', v: l.replace(/^•\s*/, '') }
    if (l.startsWith('–') || l.startsWith('-')) return { t: 'sub-item', v: l.replace(/^[–-]\s*/, '') }
    if (l.startsWith('"') && l.endsWith('"')) return { t: 'fala', v: l.slice(1, -1) }
    // linha curta toda em maiúsculas = subtítulo
    if (l.length < 60 && l === l.toUpperCase() && /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(l)) return { t: 'sub', v: l }
    return { t: 'p', v: l }
  })
}

/* ── Um bloco renderizado como documento ── */
function BlocoLeitura({ bloco, n }: { bloco: Bloco; n: number }) {
  const linhas = useMemo(() => analisar(bloco.corpo), [bloco.corpo])
  return (
    <section id={`nc-${n}`} style={{ marginBottom: 34, scrollMarginTop: 90 }}>
      <h2 style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 17, fontWeight: 800,
        color: '#1a1a2e', margin: '0 0 12px', lineHeight: 1.35,
      }}>
        <span style={{
          flexShrink: 0, width: 26, height: 26, borderRadius: 8, background: ROXO, color: '#fff',
          fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
        }}>{n + 1}</span>
        <span>{bloco.titulo}</span>
      </h2>
      <div style={{ borderLeft: `3px solid ${ROXO}22`, paddingLeft: 18 }}>
        {linhas.map((l, i) => {
          if (l.t === 'vazio') return <div key={i} style={{ height: 10 }} />
          if (l.t === 'sub') return (
            <p key={i} style={{ fontSize: 12, fontWeight: 800, color: ROXO, letterSpacing: .6, margin: '14px 0 6px' }}>{l.v}</p>
          )
          if (l.t === 'item') {
            const m = l.v.match(/^([^:]{3,70}):\s*([\s\S]*)$/)
            return (
              <div key={i} style={{ display: 'flex', gap: 10, margin: '0 0 9px' }}>
                <span style={{ color: ROXO, fontWeight: 900, lineHeight: 1.7 }}>·</span>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: '#3a3550' }}>
                  {m ? <><strong style={{ color: '#1a1a2e' }}>{m[1]}:</strong> {m[2]}</> : l.v}
                </p>
              </div>
            )
          }
          if (l.t === 'sub-item') return (
            <div key={i} style={{ display: 'flex', gap: 9, margin: '0 0 7px 22px' }}>
              <span style={{ color: '#9b95c9', lineHeight: 1.7 }}>–</span>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#4a4560' }}>{l.v}</p>
            </div>
          )
          if (l.t === 'fala') return (
            <p key={i} style={{
              margin: '4px 0 10px 22px', padding: '9px 14px', background: '#f7f6fb', borderRadius: '0 8px 8px 0',
              borderLeft: `3px solid ${ROXO}`, fontSize: 14, fontStyle: 'italic', color: '#4a4560', lineHeight: 1.6,
            }}>&ldquo;{l.v}&rdquo;</p>
          )
          return <p key={i} style={{ margin: '0 0 9px', fontSize: 14.5, lineHeight: 1.75, color: '#3a3550', textAlign: 'justify' }}>{l.v}</p>
        })}
      </div>
    </section>
  )
}

function AutoTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }, [value])
  return <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} rows={1}
    style={{
      width: '100%', resize: 'none', overflow: 'hidden', whiteSpace: 'pre-wrap', lineHeight: 1.6,
      fontFamily: 'inherit', fontSize: 13.5, color: '#1a1a2e', border: '1px solid #e0ddd8',
      borderRadius: 10, padding: '12px 14px', background: '#fff', outline: 'none',
    }} />
}

export default function NormaConduta() {
  const [titulo, setTitulo] = useState('Manual de Conduta')
  const [blocos, setBlocos] = useState<Bloco[]>(() => NORMA_CONDUTA_BLOCOS.map(b => ({ id: rid(), ...b })))
  const [logo, setLogo] = useState('')
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [auto, setAuto] = useState<'idle' | 'salvando' | 'salvo'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)
  useGuardaSalvar(dirty, 'Norma de Conduta')

  const carregar = useCallback(async () => {
    try {
      const d = await fetch(`/api/salon/grid?chave=${CHAVE}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.blocos) && d.blocos.length) {
        setTitulo(d.titulo || 'Manual de Conduta'); setBlocos(d.blocos); setLogo(d.logo || '')
      }
    } catch { /* mantém o padrão */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const salvar = useCallback(async (silencioso = false) => {
    if (!silencioso) setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: CHAVE, doc: { titulo, blocos, logo } }),
      })
      if (res.ok) { if (!silencioso) toast.success('Salvo!'); setDirty(false); setAuto('salvo') }
      else if (!silencioso) toast.error('Erro ao salvar')
    } catch { if (!silencioso) toast.error('Erro de conexão') }
    if (!silencioso) setSalvando(false)
  }, [titulo, blocos, logo])

  // auto-save 2s depois de parar de digitar
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!dirty || loading) return
    if (timer.current) clearTimeout(timer.current)
    setAuto('salvando')
    timer.current = setTimeout(() => { salvar(true) }, 2000)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [dirty, loading, salvar])

  function upd(id: string, campo: 'titulo' | 'corpo', v: string) {
    setBlocos(b => b.map(x => x.id === id ? { ...x, [campo]: v } : x)); setDirty(true)
  }
  function add() { setBlocos(b => [...b, { id: rid(), titulo: 'Novo tópico', corpo: '' }]); setDirty(true) }
  function del(id: string) { if (!confirm('Excluir este tópico?')) return; setBlocos(b => b.filter(x => x.id !== id)); setDirty(true) }
  function mover(id: string, dir: -1 | 1) {
    setBlocos(b => { const i = b.findIndex(x => x.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= b.length) return b; const n = [...b];[n[i], n[j]] = [n[j], n[i]]; return n })
    setDirty(true)
  }
  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return }
    if (f.size > 1.5 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 1,5 MB)'); return }
    const r = new FileReader(); r.onload = () => { setLogo(String(r.result || '')); setDirty(true) }; r.readAsDataURL(f)
  }

  async function imprimir() {
    const lg = logo || await getLogoSalao()
    const esc = (v: string) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const corpo = blocos.map((b, n) => {
      const linhas = analisar(b.corpo).map(l => {
        if (l.t === 'vazio') return '<div class="sp"></div>'
        if (l.t === 'sub') return `<p class="sub">${esc(l.v)}</p>`
        if (l.t === 'item') {
          const m = l.v.match(/^([^:]{3,70}):\s*([\s\S]*)$/)
          return `<p class="it">${m ? `<b>${esc(m[1])}:</b> ${esc(m[2])}` : esc(l.v)}</p>`
        }
        if (l.t === 'sub-item') return `<p class="si">${esc(l.v)}</p>`
        if (l.t === 'fala') return `<p class="fa">&ldquo;${esc(l.v)}&rdquo;</p>`
        return `<p class="tx">${esc(l.v)}</p>`
      }).join('')
      return `<section class="bl"><h2><i>${n + 1}</i>${esc(b.titulo)}</h2>${linhas}</section>`
    }).join('')
    const sumario = blocos.map((b, n) => `<li>${n + 1}. ${esc(b.titulo)}</li>`).join('')
    const css = `@page{size:A4 portrait;margin:16mm 15mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#25203d;font-size:11pt;line-height:1.6}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${ROXO};padding-bottom:9px;margin-bottom:16px}
.hd img{max-height:58px;max-width:210px;object-fit:contain}
.brand{font-size:23px;font-weight:900;color:${ROXO};letter-spacing:1px}
h1{font-size:19pt;text-align:center;color:#1a1a2e;margin:6px 0 4px;font-weight:800}
.lead{text-align:center;color:#6b6880;font-size:10pt;margin-bottom:18px}
.sum{background:#f7f6fb;border:1px solid #e6e3f2;border-radius:10px;padding:14px 20px;margin-bottom:22px;break-inside:avoid}
.sum b{display:block;color:${ROXO};font-size:10pt;letter-spacing:1px;margin-bottom:7px}
.sum ol{list-style:none;columns:2;column-gap:26px;font-size:9.5pt;color:#4a4560}
.sum li{margin:2px 0;break-inside:avoid}
.bl{margin-bottom:16px;break-inside:avoid}
h2{font-size:12.5pt;color:#1a1a2e;font-weight:800;margin-bottom:7px;display:flex;align-items:center;gap:8px}
h2 i{background:${ROXO};color:#fff;font-style:normal;font-size:9pt;font-weight:800;min-width:19px;height:19px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center}
.tx{text-align:justify;margin-bottom:6px}
.sub{font-weight:800;color:${ROXO};font-size:9.5pt;letter-spacing:.5px;margin:9px 0 4px}
.it{margin:0 0 5px 12px;text-indent:-12px}
.it:before{content:'· ';color:${ROXO};font-weight:900}
.si{margin:0 0 4px 26px;color:#4a4560;font-size:10.5pt}
.si:before{content:'– ';color:#9b95c9}
.fa{margin:3px 0 7px 22px;padding:6px 12px;background:#f7f6fb;border-left:3px solid ${ROXO};font-style:italic;color:#4a4560;break-inside:avoid}
.sp{height:5px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const cab = lg ? `<img src="${lg}"/>` : `<div class="brand">NODRI</div>`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(titulo)}</title><style>${css}</style></head><body>
<div class="hd">${cab}<div style="text-align:right;font-size:9.5pt;color:#6b6880">${new Date().toLocaleDateString('pt-BR')}</div></div>
<h1>${esc(titulo)}</h1><p class="lead">Documento de leitura obrigatória — parceria entre Profissional e Salão</p>
<div class="sum"><b>ÍNDICE</b><ol>${sumario}</ol></div>
${corpo}<script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=980,height=740'); if (!w) return
    w.document.write(html); w.document.close(); w.focus()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={26} className="animate-spin" style={{ color: ROXO }} /></div>

  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 15px', borderRadius: 10,
    border: '1px solid #e0ddd8', background: '#fff', color: '#3a3550', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Barra de ações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => setEditando(e => !e)} style={{ ...btn, background: editando ? ROXO : '#fff', color: editando ? '#fff' : '#3a3550', borderColor: editando ? ROXO : '#e0ddd8' }}>
          {editando ? <><Eye size={15} /> Ver documento</> : <><Pencil size={15} /> Editar</>}
        </button>
        <button onClick={imprimir} style={btn}><Printer size={15} /> Imprimir</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {auto === 'salvando' && <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700 }}>Salvando…</span>}
          {auto === 'salvo' && !dirty && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>✓ Salvo</span>}
          {editando && (
            <button onClick={() => salvar()} disabled={salvando}
              style={{ ...btn, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff' }}>
              {salvando ? '…' : <><Save size={15} /> Salvar</>}
            </button>
          )}
        </div>
      </div>

      {editando ? (
        /* ─────────── MODO EDIÇÃO ─────────── */
        <div>
          <div style={{ marginBottom: 14 }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} style={{ display: 'none' }} />
            {logo ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="logo" style={{ maxHeight: 52, maxWidth: 180, objectFit: 'contain' }} />
                <button onClick={() => fileRef.current?.click()} style={{ ...btn, padding: '6px 12px', fontSize: 12, color: ROXO }}>Trocar</button>
                <button onClick={() => { setLogo(''); setDirty(true) }} style={{ ...btn, padding: '6px 12px', fontSize: 12, color: '#dc2626', borderColor: '#fca5a5' }}>Remover</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} style={{ ...btn, padding: '12px 18px', border: '2px dashed #c9c4f0', background: '#f6f4ff', color: ROXO }}>
                Anexar logo do salão (aparece na impressão)
              </button>
            )}
          </div>

          <input value={titulo} onChange={e => { setTitulo(e.target.value); setDirty(true) }}
            style={{ fontSize: 19, fontWeight: 800, color: '#1a1a2e', border: 'none', background: 'transparent', outline: 'none', width: '100%', marginBottom: 14 }} />

          {blocos.map((b, i) => (
            <div key={b.id} style={{ background: '#fdfdfc', border: '1px solid #e8e6e0', borderRadius: 14, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, background: ROXO, color: '#fff', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                <input value={b.titulo} onChange={e => upd(b.id, 'titulo', e.target.value)}
                  style={{ flex: 1, fontSize: 14.5, fontWeight: 800, color: '#1a1a2e', border: 'none', background: 'transparent', outline: 'none' }} />
                <button onClick={() => mover(b.id, -1)} style={{ ...btn, padding: 6 }}><ChevronUp size={14} /></button>
                <button onClick={() => mover(b.id, 1)} style={{ ...btn, padding: 6 }}><ChevronDown size={14} /></button>
                <button onClick={() => del(b.id)} style={{ ...btn, padding: 6, color: '#dc2626', borderColor: '#fca5a5' }}><Trash2 size={14} /></button>
              </div>
              <AutoTextarea value={b.corpo} onChange={v => upd(b.id, 'corpo', v)} />
            </div>
          ))}
          <button onClick={add} style={{ ...btn, border: `2px dashed ${ROXO}55`, color: ROXO, width: '100%', justifyContent: 'center', padding: 12 }}>
            <Plus size={15} /> Adicionar tópico
          </button>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '10px 0 0' }}>
            Dica de formatação: use <strong>•</strong> no início da linha para virar item, <strong>–</strong> para sub-item, texto entre <strong>&quot;aspas&quot;</strong> vira citação e uma linha curta em MAIÚSCULAS vira subtítulo.
          </p>
        </div>
      ) : (
        /* ─────────── MODO LEITURA ─────────── */
        <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 34px rgba(30,20,80,.10)', border: '1px solid #eeecf6' }}>
          <div style={{ height: 6, background: `linear-gradient(90deg,${ROXO},#7c6fe0)` }} />

          {/* Capa */}
          <div style={{ padding: '30px 40px 24px', borderBottom: '1px solid #f0eef7', textAlign: 'center' }}>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="logo" style={{ maxHeight: 54, maxWidth: 190, objectFit: 'contain', marginBottom: 14 }} />
            )}
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', margin: 0, letterSpacing: -.3 }}>{titulo}</h1>
            <p style={{ fontSize: 13, color: '#6b6880', margin: '8px 0 0' }}>
              Documento de leitura obrigatória — parceria entre Profissional e Salão
            </p>
          </div>

          {/* Índice */}
          <div style={{ padding: '20px 40px', background: '#faf9fd', borderBottom: '1px solid #f0eef7' }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 800, color: ROXO, letterSpacing: 1.2, margin: '0 0 10px' }}>
              <BookOpen size={14} /> ÍNDICE
            </p>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '3px 22px' }}>
              {blocos.map((b, i) => (
                <li key={b.id}>
                  <a href={`#nc-${i}`} style={{ fontSize: 13, color: '#4a4560', textDecoration: 'none', display: 'block', padding: '3px 0', lineHeight: 1.4 }}
                    onMouseEnter={e => { e.currentTarget.style.color = ROXO }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#4a4560' }}>
                    <span style={{ color: ROXO, fontWeight: 800, marginRight: 6 }}>{i + 1}.</span>{b.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </div>

          {/* Corpo */}
          <div style={{ padding: '30px 40px 38px' }}>
            {blocos.map((b, i) => <BlocoLeitura key={b.id} bloco={b} n={i} />)}
          </div>
        </div>
      )}
    </div>
  )
}
