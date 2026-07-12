'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, Trash2, RefreshCw } from 'lucide-react'
import { getLogoSalao } from '@/lib/logoSalao'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

interface Item { id: string; nome: string; valor: string }
// cor determinística p/ o avatar do card (mesmo nome = mesma cor)
const PALETA = [
  { bg: '#f0eefb', fg: '#5b4fcf' }, { bg: '#e1f5ee', fg: '#0f6e56' }, { bg: '#fbeaf0', fg: '#993556' },
  { bg: '#faece7', fg: '#993c1d' }, { bg: '#e6f1fb', fg: '#185fa5' }, { bg: '#faeeda', fg: '#854f0b' },
]
function corDoNome(nome: string) {
  let h = 0; for (const ch of (nome || '?')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETA[h % PALETA.length]
}
function iniciais(nome: string) {
  return (nome || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() || '?'
}
interface Servico { id: string; nome: string; preco?: string; preco_fixo?: number | null; preco_min?: number | null }
const rid = () => Math.random().toString(36).slice(2, 8)
const norm = (s: string) => (s || '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')
// Preço vem da página de Serviços: usa preço fixo ou, se variável, "a partir de"
function fmtServ(s: Servico): string {
  const v = Number(s.preco_fixo ?? s.preco_min ?? s.preco ?? 0)
  if (!v) return ''
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ListaPrecoServicos({ chave = 'precos_servicos', titulo = 'Serviços Internos — Valores', comLogo = false }: { chave?: string; titulo?: string; comLogo?: boolean }) {
  const [itens, setItens] = useState<Item[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [logo, setLogo] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Valores de Serviços') // avisa "Deseja salvar?" antes de sair sem salvar
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const servs: Servico[] = await fetch('/api/servicos').then(r => r.ok ? r.json() : [])
      setServicos(Array.isArray(servs) ? servs : [])
      const servsArr = Array.isArray(servs) ? servs : []
      const salvo = await fetch(`/api/salon/grid?chave=${chave}`).then(r => r.ok ? r.json() : null)
      if (salvo && Array.isArray(salvo.itens) && salvo.itens.length) {
        // Preenche automaticamente o valor (da página de Serviços) onde ainda estiver vazio
        const precoPorNome = new Map(servsArr.map(s => [norm(s.nome), fmtServ(s)]))
        const merged = salvo.itens.map((it: Item) => ({ ...it, valor: (it.valor && String(it.valor).trim()) ? it.valor : (precoPorNome.get(norm(it.nome)) || '') }))
        setItens(merged); setLogo(salvo.logo || '')
      }
      else setItens(servsArr.map(s => ({ id: s.id || rid(), nome: s.nome || '', valor: fmtServ(s) })))
    } catch { setItens([]) }
    setDirty(false); setLoading(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return }
    if (f.size > 1.5 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 1,5 MB)'); return }
    const reader = new FileReader(); reader.onload = () => { setLogo(String(reader.result || '')); setDirty(true) }; reader.readAsDataURL(f)
  }

  function upd(id: string, campo: 'nome' | 'valor', v: string) { setItens(i => i.map(x => x.id === id ? { ...x, [campo]: v } : x)); setDirty(true) }
  function add() { setItens(i => [...i, { id: rid(), nome: '', valor: '' }]); setDirty(true) }
  function del(id: string) { setItens(i => i.filter(x => x.id !== id)); setDirty(true) }
  function addServico(s: Servico) { setItens(i => [...i, { id: s.id || rid(), nome: s.nome || '', valor: fmtServ(s) }]); setDirty(true); setPickerOpen(false) }

  const disponiveis = servicos.filter(s => !itens.some(i => i.id === s.id))

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, doc: { itens, logo } }) })
      if (res.ok) { toast.success('Salvo!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  async function imprimir() {
    const logoImpressao = logo || await getLogoSalao() // logo do documento > logo do salão > marca
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // impressão no MESMO visual dos cards da tela
    const cards = itens.map(it => {
      const cor = corDoNome(it.nome)
      return `<div class="card" style="border-top-color:${cor.fg}">
        <div class="topo">
          <span class="av" style="background:${cor.bg};color:${cor.fg}">${esc(iniciais(it.nome))}</span>
          <span class="nm">${esc(it.nome)}</span>
        </div>
        <div class="val" style="background:${cor.bg}">
          <span class="vl" style="color:${cor.fg}">VALOR</span>
          <b style="color:${cor.fg}">${esc(it.valor || '—')}</b>
        </div>
      </div>`
    }).join('')
    const cab = logoImpressao ? `<img src="${logoImpressao}" class="logo"/>` : `<div class="brand">NODRI</div>`
    const hoje = new Date().toLocaleDateString('pt-BR')
    const css = `
@page{size:A4 portrait;margin:12mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hd{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #5b4fcf;padding-bottom:10px;margin-bottom:6px}
.logo{max-height:58px;max-width:200px;object-fit:contain}
.brand{font-size:24px;font-weight:900;color:#5b4fcf;letter-spacing:1px}
.hd .dt{font-size:10px;color:#777;text-align:right}
h1{text-align:center;font-size:19px;font-weight:900;color:#1a1a2e;margin:10px 0 2px;text-transform:uppercase;letter-spacing:.5px}
.sub{text-align:center;font-size:10px;color:#888;margin-bottom:14px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.card{border:1px solid #e5e2db;border-top:3px solid #5b4fcf;border-radius:10px;padding:8px 9px;break-inside:avoid;background:#fff}
.topo{display:flex;align-items:center;gap:7px;margin-bottom:7px}
.av{width:26px;height:26px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;flex-shrink:0}
.nm{font-weight:700;font-size:10.5px;line-height:1.25;word-break:break-word}
.val{display:flex;align-items:center;justify-content:space-between;border-radius:8px;padding:5px 9px}
.vl{font-size:8px;font-weight:800;letter-spacing:.5px}
.val b{font-size:12.5px;font-weight:800}
.ft{margin-top:14px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:8px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(titulo)}</title><style>${css}</style></head><body>
<div class="hd">${cab}<div class="dt"><b>${esc(titulo)}</b><br>${hoje}</div></div>
<h1>${esc(titulo.toUpperCase())}</h1>
<div class="sub">${itens.length} serviços · valores vigentes em ${hoje}</div>
<div class="grid">${cards}</div>
<div class="ft">${logoImpressao ? `Documento gerado em ${hoje}` : `Documento gerado pelo Sistema NODRI · ${hoje}`}</div>
<script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=1000,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div>
      {comLogo && (
        <div style={{ marginBottom: 12 }}>
          <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} style={{ display: 'none' }} />
          {logo ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="logo" style={{ maxHeight: 56, maxWidth: 180, objectFit: 'contain' }} />
              <button onClick={() => fileRef.current?.click()} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#5b4fcf', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Trocar</button>
              <button onClick={() => { setLogo(''); setDirty(true) }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Remover</button>
            </div>
          ) : <button onClick={() => fileRef.current?.click()} style={{ padding: '12px 18px', borderRadius: 12, border: '2px dashed #c9c4f0', background: '#f6f4ff', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🖼️ Anexar logo</button>}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#5b4fcf', margin: 0, flex: 1, minWidth: 160 }}>{titulo}</h3>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setPickerOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Plus size={14} /> Adicionar da lista de serviços</button>
          {pickerOpen && (
            <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 30, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.15)', minWidth: 240, maxHeight: 300, overflowY: 'auto', padding: 6 }}>
              {disponiveis.length === 0 ? <div style={{ padding: 10, fontSize: 12, color: '#9ca3af' }}>Todos os serviços já estão na lista.</div> :
                disponiveis.map(s => { const pv = fmtServ(s); return <button key={s.id} onClick={() => addServico(s)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, borderRadius: 6 }} onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{s.nome}{pv ? ` — ${pv}` : ''}</button> })}
            </div>
          )}
        </div>
        <button onClick={carregar} title="Recarregar dos serviços" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><RefreshCw size={14} /></button>
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>
      <p style={{ fontSize: 12, color: '#6b6860', marginBottom: 10 }}>Os itens vêm da página <strong>Serviços do Salão</strong>. O <strong>valor</strong> é editável. Use <strong>Adicionar da lista</strong> (mostra só o que ainda não está aqui), edite o nome ou <strong>exclua</strong> à vontade.</p>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> : (
        <>
          {/* Busca + contador */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔎 Buscar serviço..."
              style={{ flex: 1, minWidth: 200, maxWidth: 340, padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e0ddd8', fontSize: 13, outline: 'none', background: '#fff' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#5b4fcf')} onBlur={e => (e.currentTarget.style.borderColor = '#e0ddd8')} />
            <span style={{ fontSize: 12, fontWeight: 800, color: '#5b4fcf', background: '#f0eefb', padding: '5px 12px', borderRadius: 20 }}>{itens.length} itens</span>
          </div>

          {/* Grade de cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
            {itens.filter(it => !busca || norm(it.nome).includes(norm(busca))).map(it => {
              const cor = corDoNome(it.nome)
              return (
                <div key={it.id}
                  style={{ position: 'relative', background: '#fff', border: '1px solid #e8e6e0', borderTop: `3px solid ${cor.fg}`, borderRadius: 14, padding: '12px 14px', transition: 'box-shadow .15s, transform .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,.10)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, background: cor.bg, color: cor.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{iniciais(it.nome)}</span>
                    <input value={it.nome} onChange={e => upd(it.id, 'nome', e.target.value)} placeholder="Nome do serviço"
                      style={{ flex: 1, minWidth: 0, border: '1px solid transparent', borderRadius: 6, padding: '5px 6px', outline: 'none', fontSize: 13.5, fontWeight: 700, color: '#1a1a1a', background: 'transparent' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#c9c4f0')} onBlur={e => (e.currentTarget.style.borderColor = 'transparent')} />
                    <button onClick={() => del(it.id)} title="Excluir"
                      style={{ border: 'none', background: 'transparent', color: '#d4cfc7', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')} onMouseLeave={e => (e.currentTarget.style.color = '#d4cfc7')}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: cor.bg, borderRadius: 10, padding: '7px 12px' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: cor.fg, textTransform: 'uppercase', letterSpacing: '.4px' }}>Valor</span>
                    <input value={it.valor} onChange={e => upd(it.id, 'valor', e.target.value)} placeholder="R$ 0,00"
                      style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: 15.5, fontWeight: 800, color: cor.fg, background: 'transparent', textAlign: 'right' }} />
                  </div>
                </div>
              )
            })}

            {/* Card de adicionar */}
            <button onClick={add}
              style={{ minHeight: 104, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, border: '2px dashed #c9c4f0', background: '#faf9ff', color: '#5b4fcf', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = '#faf9ff')}>
              <Plus size={20} /> Adicionar item manual
            </button>
          </div>

          {busca && itens.filter(it => norm(it.nome).includes(norm(busca))).length === 0 && (
            <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>Nenhum serviço encontrado para &quot;{busca}&quot;.</div>
          )}
        </>
      )}
    </div>
  )
}
