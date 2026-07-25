'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Loader2, Plus, Search, Copy, MessageCircle, Images, Pencil, Trash2, X, Star,
  ChevronLeft, ChevronRight, Share2, BarChart3, Megaphone, Eye, Save,
} from 'lucide-react'
import {
  CATEGORIAS_ACOES, STATUS_INFO, statusCampanha, capaDaCampanha, textoCampanha, textoCampanhas, rid,
  type Campanha, type ArquivoCampanha,
} from '@/lib/acoesComerciais'

const ROXO = '#5b4fcf'
const ROSA = '#db2777'

// CSS responsivo do módulo (bonito no celular e no PC).
const ACOES_CSS = `
.ac-head { display:flex; align-items:flex-start; gap:12px; margin-bottom:14px; }
.ac-chips { display:flex; gap:8px; overflow-x:auto; padding-bottom:6px; margin-bottom:10px; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
.ac-chips::-webkit-scrollbar { display:none; }
.ac-status { display:flex; align-items:center; gap:8px; margin-bottom:18px; }
.ac-status > div:first-child { flex:1; min-width:0; }
.ac-status > div:last-child { flex-shrink:0; }
.ac-cards { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:16px; }
.ac-acoes { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:0 12px 10px; }
.ac-acoes button { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:10px 4px; border-radius:12px; border:none; cursor:pointer; font-size:11.5px; font-weight:700; line-height:1.1; text-align:center; }
@media (max-width: 560px) {
  .ac-head { flex-wrap:wrap; }
  .ac-nova { width:100%; }
  .ac-status { flex-direction:column; align-items:stretch; }
  .ac-cards { grid-template-columns:1fr; }
}
`

const dataURLparaBlob = (url: string): Blob => {
  const [meta, b64] = url.split(',')
  const mime = /:(.*?);/.exec(meta)?.[1] || 'image/png'
  const bin = atob(b64 || '')
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}
const fmtData = (iso?: string) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR') : ''

export default function AcoesComerciais({ soLeitura = false }: { soLeitura?: boolean }) {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [fCategoria, setFCategoria] = useState('')
  const [fStatus, setFStatus] = useState<'todas' | 'ativa' | 'agendada' | 'encerrada'>('todas')
  const [ordem, setOrdem] = useState<'recentes' | 'compartilhadas'>('recentes')
  const [aberta, setAberta] = useState<Campanha | null>(null)
  const [editando, setEditando] = useState<Campanha | null>(null)
  const [vendidos, setVendidos] = useState<Record<string, number>>({})
  const [verShares, setVerShares] = useState<Campanha | null>(null)   // placar de quem compartilhou
  const [arqModal, setArqModal] = useState<Campanha | null>(null)     // selecionar arquivos direto do card
  const [modoSel, setModoSel] = useState(false)                       // multi-seleção p/ enviar juntas
  const [selec, setSelec] = useState<Set<string>>(new Set())

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [d, v] = await Promise.all([
        fetch('/api/salon/acoes-comerciais').then(r => r.ok ? r.json() : null),
        fetch('/api/salon/acoes-comerciais/vendidos').then(r => r.ok ? r.json() : null),
      ])
      setCampanhas(Array.isArray(d?.campanhas) ? d.campanhas : [])
      setVendidos(v?.vendidos && typeof v.vendidos === 'object' ? v.vendidos : {})
    } catch { /* mantém */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  // Persiste a lista inteira (só dono). Otimista: atualiza local e envia.
  const salvarLista = useCallback(async (lista: Campanha[]) => {
    setCampanhas(lista)
    const res = await fetch('/api/salon/acoes-comerciais', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campanhas: lista }),
    })
    if (!res.ok) { toast.error('Erro ao salvar'); carregar() }
  }, [carregar])

  const bumpMetrica = useCallback((id: string, metrica: 'views' | 'shares') => {
    setCampanhas(cs => cs.map(c => c.id === id ? { ...c, [metrica]: (c[metrica] || 0) + 1 } : c))
    fetch('/api/salon/acoes-comerciais', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, metrica }) }).catch(() => {})
  }, [])

  const filtradas = useMemo(() => {
    const q = busca.toLowerCase().trim()
    let arr = campanhas.filter(c => {
      const st = statusCampanha(c)
      if (fStatus === 'ativa' && st !== 'ativa') return false
      if (fStatus === 'agendada' && st !== 'agendada') return false
      if (fStatus === 'encerrada' && st !== 'encerrada') return false
      if (fCategoria && c.categoria !== fCategoria) return false
      if (q && !(`${c.titulo} ${c.descricao} ${c.categoria}`.toLowerCase().includes(q))) return false
      return true
    })
    arr = [...arr].sort((a, b) => ordem === 'compartilhadas' ? (b.shares || 0) - (a.shares || 0) : (b.criadoEm || 0) - (a.criadoEm || 0))
    return arr
  }, [campanhas, busca, fStatus, fCategoria, ordem])

  const totalAtivas = campanhas.filter(c => statusCampanha(c) === 'ativa').length
  const totalShares = campanhas.reduce((s, c) => s + (c.shares || 0), 0)
  const totalViews = campanhas.reduce((s, c) => s + (c.views || 0), 0)

  function novaCampanha() {
    setEditando({ id: rid(), titulo: '', descricao: '', comoFunciona: '', categoria: CATEGORIAS_ACOES[0], ativa: true, arquivos: [], views: 0, shares: 0, criadoEm: Date.now() })
  }
  function salvarCampanha(c: Campanha) {
    if (!c.titulo.trim()) { toast.error('Dê um título à campanha'); return }
    const existe = campanhas.some(x => x.id === c.id)
    const lista = existe ? campanhas.map(x => x.id === c.id ? c : x) : [c, ...campanhas]
    salvarLista(lista); setEditando(null); toast.success('Campanha salva!')
  }
  function excluir(id: string) {
    if (!confirm('Excluir esta campanha?')) return
    salvarLista(campanhas.filter(c => c.id !== id)); toast.success('Excluída')
  }

  function abrir(c: Campanha) { setAberta(c); bumpMetrica(c.id, 'views') }

  function toggleSel(id: string) { setSelec(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  // Compartilhar VÁRIAS campanhas juntas para o mesmo cliente: junta os textos
  // (copiados) e todas as imagens num envio só.
  async function compartilharSelecionadas() {
    const cs = campanhas.filter(c => selec.has(c.id))
    if (!cs.length) return
    const texto = textoCampanhas(cs)
    const arqs = cs.flatMap(c => c.arquivos.map(a => ({ url: a.url, nome: a.nome })))
    if (arqs.length) await enviarArquivos(arqs, texto)
    else { window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank') }
    cs.forEach(c => bumpMetrica(c.id, 'shares'))
    setModoSel(false); setSelec(new Set())
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={26} className="animate-spin" style={{ color: ROXO }} /></div>

  return (
    <div className="ac-root">
      <style>{ACOES_CSS}</style>

      {/* Cabeçalho */}
      <div className="ac-head">
        <div style={{ flex: 1, minWidth: 180 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a2e', margin: 0, letterSpacing: -.4 }}>Ações Comerciais</h1>
          <p style={{ color: '#767069', fontSize: 13, margin: '4px 0 0' }}>
            {soLeitura ? 'Campanhas prontas para você divulgar aos clientes.' : 'Crie campanhas e materiais para toda a equipe divulgar.'}
          </p>
        </div>
        {!soLeitura && (
          <button onClick={novaCampanha} className="ac-nova" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 18px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${ROXO},${ROSA})`, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            <Plus size={17} /> Nova Campanha
          </button>
        )}
      </div>

      {/* Busca — linha própria, largura total */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar campanha..."
          style={{ width: '100%', padding: '11px 12px 11px 36px', borderRadius: 12, border: '1px solid #e0ddd8', fontSize: 14, background: '#fff' }} />
      </div>

      {/* Categorias — rolagem horizontal (não quebra linha no celular) */}
      <div className="ac-chips">
        {['', ...CATEGORIAS_ACOES].map(cat => (
          <button key={cat || 'todas'} onClick={() => setFCategoria(cat)}
            style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              border: fCategoria === cat ? `1.5px solid ${ROXO}` : '1px solid #e5e2dc',
              background: fCategoria === cat ? '#f2f0ff' : '#fff', color: fCategoria === cat ? ROXO : '#6b6860' }}>
            {cat || 'Todas'}
          </button>
        ))}
      </div>

      {/* Status + ordem + seleção */}
      <div className="ac-status">
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {([['todas', 'Todas'], ['ativa', 'Ativas'], ['agendada', 'Futuras'], ['encerrada', 'Encerradas']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFStatus(k)}
              style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: fStatus === k ? '#1a1a2e' : '#f0eee8', color: fStatus === k ? '#fff' : '#6b6860' }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setOrdem(o => o === 'recentes' ? 'compartilhadas' : 'recentes')}
            style={{ flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid #e0ddd8', background: '#fff', color: '#6b6860', whiteSpace: 'nowrap' }}>
            {ordem === 'recentes' ? '↕ Recentes' : '↕ Compartilhadas'}
          </button>
          <button onClick={() => { setModoSel(m => !m); setSelec(new Set()) }}
            style={{ flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: modoSel ? ROXO : '#eef2ff', color: modoSel ? '#fff' : ROXO, whiteSpace: 'nowrap' }}>
            {modoSel ? '✕ Cancelar' : '☑ Selecionar'}
          </button>
        </div>
      </div>

      {/* Grade de cards */}
      {filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 14 }}>
          {campanhas.length === 0 ? (soLeitura ? 'Nenhuma campanha publicada ainda.' : 'Nenhuma campanha ainda. Clique em “Nova Campanha”.') : 'Nenhuma campanha para esse filtro.'}
        </div>
      ) : (
        <div className="ac-cards">
          {filtradas.map(c => <CardCampanha key={c.id} c={c} soLeitura={soLeitura}
            vendidos={vendidos[c.id]} modoSel={modoSel} selecionada={selec.has(c.id)}
            onToggleSel={() => toggleSel(c.id)}
            onAbrir={() => modoSel ? toggleSel(c.id) : abrir(c)}
            onEditar={() => setEditando(c)} onExcluir={() => excluir(c.id)}
            onCopiar={() => copiarTexto(c)} onWhats={() => compartilharTexto(c, bumpMetrica)}
            onSelecArquivos={() => setArqModal(c)}
            onTudo={() => compartilharArquivos(c, c.arquivos.map(a => a.id), true, () => bumpMetrica(c.id, 'shares'))}
            onVerShares={() => setVerShares(c)} />)}
        </div>
      )}

      {/* Barra flutuante de seleção múltipla */}
      {modoSel && selec.size > 0 && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 55, background: '#1a1a2e', color: '#fff', borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 12px 34px rgba(0,0,0,.3)' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{selec.size} selecionada(s)</span>
          <button onClick={compartilharSelecionadas} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            <Share2 size={15} /> Enviar juntas ao cliente
          </button>
        </div>
      )}

      {/* Rodapé de estatísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 22 }}>
        <MiniStat icon={<Megaphone size={18} />} n={totalAtivas} label="Campanhas ativas" cor={ROSA} />
        <MiniStat icon={<Share2 size={18} />} n={totalShares} label="Compartilhamentos" cor="#16a34a" />
        <MiniStat icon={<Eye size={18} />} n={totalViews} label="Visualizações" cor={ROXO} />
      </div>

      {aberta && <PainelCampanha c={aberta} soLeitura={soLeitura} vendidos={vendidos[aberta.id]} onClose={() => setAberta(null)} onEditar={() => { setEditando(aberta); setAberta(null) }} onShare={() => bumpMetrica(aberta.id, 'shares')} onVerShares={() => setVerShares(aberta)} />}
      {editando && !soLeitura && <ModalEditar inicial={editando} onSalvar={salvarCampanha} onClose={() => setEditando(null)} />}
      {verShares && <ModalPlacarShares c={verShares} onClose={() => setVerShares(null)} />}
      {arqModal && <ModalArquivos c={arqModal} onClose={() => setArqModal(null)} onShare={() => bumpMetrica(arqModal.id, 'shares')} />}
    </div>
  )
}

/* ─────────────── Placar: quem compartilhou e quantas vezes ─────────────── */
function ModalPlacarShares({ c, onClose }: { c: Campanha; onClose: () => void }) {
  const linhas = Object.values(c.sharesPor || {}).sort((a, b) => b.n - a.n)
  const total = linhas.reduce((s, x) => s + x.n, 0) || c.shares || 0
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(20,15,45,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: 20, width: 'min(420px,100%)', maxHeight: '84vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <b style={{ fontSize: 16, color: '#1a1a2e' }}>Quem compartilhou</b>
          <button onClick={onClose} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b6860' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 12.5, color: '#8a857c', margin: '0 0 14px' }}>{c.titulo} · {total} compartilhamento(s)</p>
        {linhas.length === 0 ? (
          <p style={{ fontSize: 13.5, color: '#8a857c', textAlign: 'center', padding: 20 }}>Ninguém compartilhou ainda.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {linhas.map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: '#f7f6fb' }}>
                <span style={{ width: 30, height: 30, borderRadius: 999, background: ROXO + '20', color: ROXO, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{(u.nome || '?').charAt(0).toUpperCase()}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a2e' }}>{u.nome}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.papel}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#16a34a' }}>{u.n}×</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────── Card ─────────────── */
function CardCampanha({ c, soLeitura, vendidos, modoSel, selecionada, onToggleSel, onAbrir, onEditar, onExcluir, onCopiar, onWhats, onSelecArquivos, onTudo, onVerShares }: {
  c: Campanha; soLeitura: boolean; vendidos?: number; modoSel?: boolean; selecionada?: boolean; onToggleSel?: () => void
  onAbrir: () => void; onEditar: () => void; onExcluir: () => void; onCopiar: () => void; onWhats: () => void
  onSelecArquivos: () => void; onTudo: () => void; onVerShares?: () => void
}) {
  const capa = capaDaCampanha(c)
  const st = statusCampanha(c)
  const si = STATUS_INFO[st]
  return (
    <div style={{ background: '#fff', border: selecionada ? `2px solid ${ROXO}` : '1px solid #eceae4', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <button onClick={onAbrir} style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', border: 'none', cursor: 'pointer', padding: 0, background: capa ? '#000' : '#f0eee8', overflow: 'hidden' }}>
        {capa
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={capa.url} alt={c.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#b9b4a8' }}><Images size={34} /></div>}
        <span style={{ position: 'absolute', top: 10, left: 10, padding: '3px 10px', borderRadius: 999, fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: .5, background: si.bg, color: si.cor, backdropFilter: 'blur(4px)' }}>{si.label}</span>
        {modoSel && (
          <span style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 999, background: selecionada ? ROXO : 'rgba(255,255,255,.9)', color: selecionada ? '#fff' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>{selecionada ? '✓' : ''}</span>
        )}
      </button>
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.25 }}>{c.titulo || 'Sem título'}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: ROSA, margin: '3px 0 8px' }}>{c.categoria}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#8a857c', marginTop: 'auto', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Images size={13} /> {c.arquivos.length}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Eye size={13} /> {c.views || 0}</span>
          {/* Compartilhamentos — clicável: abre o placar de quem compartilhou */}
          <button onClick={e => { e.stopPropagation(); onVerShares?.() }} title="Ver quem compartilhou" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#8a857c', padding: 0, fontSize: 12 }}>
            <Share2 size={13} /> {c.shares || 0}
          </button>
          {/* Serviços vendidos (do relatório), ao lado do compartilhar */}
          <span title="Serviços vendidos no período (relatório)" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#16a34a', fontWeight: 800 }}>💰 {vendidos ?? 0}</span>
        </div>
      </div>
      {/* Mesmos 4 botões de enviar que aparecem ao abrir a campanha — direto no card */}
      <div className="ac-acoes">
        <button title="Copia toda a descrição" onClick={onCopiar} style={{ background: '#f4f3f8', color: '#4b5563' }}><Copy size={17} /> Copiar</button>
        <button title="Enviar só o texto" onClick={onWhats} style={{ background: '#dcfce7', color: '#16a34a' }}><MessageCircle size={17} /> Texto</button>
        <button title="Escolher arquivos" onClick={onSelecArquivos} style={{ background: '#fce7f3', color: ROSA }}><Images size={17} /> Arquivos</button>
        <button title="Texto + arquivos" onClick={onTudo} style={{ background: '#eef2ff', color: ROXO }}><Share2 size={17} /> Tudo</button>
      </div>
      {!soLeitura && (
        <div style={{ display: 'flex', gap: 8, padding: '0 12px 12px' }}>
          <button title="Editar" onClick={onEditar} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', borderRadius: 10, border: 'none', background: '#f4f3f8', color: '#4b5563', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><Pencil size={14} /> Editar</button>
          <button title="Excluir" onClick={onExcluir} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 0', borderRadius: 10, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><Trash2 size={14} /> Excluir</button>
        </div>
      )}
    </div>
  )
}

function MiniStat({ icon, n, label, cor }: { icon: React.ReactNode; n: number; label: string; cor: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: cor + '18', color: cor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e' }}>{n}</div>
        <div style={{ fontSize: 12, color: '#8a857c' }}>{label}</div>
      </div>
    </div>
  )
}

/* ─────────────── Ações de texto / compartilhar ─────────────── */
function copiarTexto(c: Campanha) {
  navigator.clipboard?.writeText(textoCampanha(c)).then(() => toast.success('Texto copiado!')).catch(() => toast.error('Não foi possível copiar'))
}
function compartilharTexto(c: Campanha, bump?: (id: string, m: 'views' | 'shares') => void) {
  window.open(`https://wa.me/?text=${encodeURIComponent(textoCampanha(c))}`, '_blank')
  bump?.(c.id, 'shares')
}
// Compartilha arquivos de UMA campanha (ou de várias, quando `textoExtra` já vem
// montado). O WhatsApp NÃO aceita imagem + legenda pelo compartilhamento do
// navegador — a legenda é sempre descartada. Por isso, sempre que houver texto,
// ele é COPIADO para a área de transferência e o usuário cola como legenda.
async function compartilharArquivos(c: Campanha, ids: string[], comTexto: boolean, bump?: () => void) {
  const sel = c.arquivos.filter(a => ids.includes(a.id))
  if (!sel.length) { toast('Selecione ao menos um arquivo', { icon: '📷' }); return }
  await enviarArquivos(sel.map(a => ({ url: a.url, nome: a.nome })), comTexto ? textoCampanha(c) : '')
  bump?.()
}

// Núcleo de envio: compartilha os arquivos e copia o texto (para colar como legenda).
async function enviarArquivos(arqs: { url: string; nome: string }[], texto: string) {
  if (texto) { try { await navigator.clipboard?.writeText(texto) } catch { /* segue */ } }
  const files = arqs.map(a => { const b = dataURLparaBlob(a.url); return new File([b], a.nome || 'imagem.png', { type: b.type }) })
  const nav = navigator as any
  if (nav.canShare && nav.canShare({ files })) {
    try {
      await nav.share({ files })
      if (texto) toast('Imagem(ns) no WhatsApp. O texto foi COPIADO — cole como legenda.', { icon: '📋', duration: 6000 })
      return
    } catch { /* cancelou ou não deu → baixa */ }
  }
  // PC / sem compartilhamento de arquivo: baixa as imagens.
  arqs.forEach(a => { const link = document.createElement('a'); link.href = a.url; link.download = a.nome || 'imagem.png'; link.click() })
  toast(texto ? 'Imagens baixadas e texto COPIADO — anexe no WhatsApp e cole o texto.' : 'Imagens baixadas — anexe no WhatsApp.', { icon: '📥', duration: 6000 })
}

/* ─────────────── Painel/detalhe da campanha ─────────────── */
function PainelCampanha({ c, soLeitura, vendidos, onClose, onEditar, onShare, onVerShares }: { c: Campanha; soLeitura: boolean; vendidos?: number; onClose: () => void; onEditar: () => void; onShare: () => void; onVerShares?: () => void }) {
  const [idx, setIdx] = useState(0)
  const [tela, setTela] = useState(false)      // fullscreen
  const [modalArq, setModalArq] = useState(false)
  const capaIdx = Math.min(idx, Math.max(0, c.arquivos.length - 1))
  const atual = c.arquivos[capaIdx]

  const box: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: '1px solid #e8e6e0', background: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(20,15,45,.55)', display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 100%)', height: '100%', background: '#faf9fc', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', position: 'sticky', top: 0, background: '#faf9fc', zIndex: 2, borderBottom: '1px solid #eee' }}>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b6860' }}><X size={20} /></button>
          <span style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 999, fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase', background: STATUS_INFO[statusCampanha(c)].bg, color: STATUS_INFO[statusCampanha(c)].cor }}>{STATUS_INFO[statusCampanha(c)].label}</span>
          {!soLeitura && <button onClick={onEditar} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: ROXO, fontWeight: 700, fontSize: 13 }}><Pencil size={15} /></button>}
        </div>

        <div style={{ padding: '10px 20px 30px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a2e', margin: '4px 0 2px' }}>{c.titulo}</h2>
          <p style={{ fontSize: 12.5, color: '#8a857c', margin: '0 0 14px' }}>{c.criadoEm ? `Criada em ${new Date(c.criadoEm).toLocaleDateString('pt-BR')}` : ''}{c.dataFim ? ` · válida até ${fmtData(c.dataFim)}` : ''}</p>

          {/* Galeria */}
          {atual ? (
            <div>
              <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={atual.url} alt={c.titulo} onClick={() => setTela(true)} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', cursor: 'zoom-in', display: 'block' }} />
                {c.arquivos.length > 1 && <>
                  <NavBtn dir="left" onClick={() => setIdx(i => (i - 1 + c.arquivos.length) % c.arquivos.length)} />
                  <NavBtn dir="right" onClick={() => setIdx(i => (i + 1) % c.arquivos.length)} />
                </>}
              </div>
              {c.arquivos.length > 1 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {c.arquivos.map((a, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={a.id} src={a.url} alt="" onClick={() => setIdx(i)} style={{ width: 66, height: 66, objectFit: 'cover', borderRadius: 10, cursor: 'pointer', flexShrink: 0, border: i === capaIdx ? `2px solid ${ROXO}` : '2px solid transparent' }} />
                  ))}
                </div>
              )}
            </div>
          ) : <div style={{ height: 140, borderRadius: 14, background: '#f0eee8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b9b4a8' }}><Images size={30} /></div>}

          {/* Texto */}
          <div style={{ marginTop: 18 }}>
            {c.descricao?.trim() && <p style={{ fontSize: 14.5, color: '#3a3550', lineHeight: 1.6, margin: '0 0 10px' }}>{c.descricao}</p>}
            {c.comoFunciona?.trim() && <>
              <p style={{ fontSize: 11.5, fontWeight: 800, color: ROXO, letterSpacing: .5, margin: '0 0 4px' }}>COMO FUNCIONA</p>
              <p style={{ fontSize: 14, color: '#4a4560', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>{c.comoFunciona}</p>
            </>}
          </div>

          {/* Botões */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
            <button onClick={() => copiarTexto(c)} style={box}><Copy size={17} color={ROXO} /><span><b style={{ fontSize: 13 }}>Copiar texto</b><br /><span style={{ fontSize: 11, color: '#8a857c' }}>Copia toda a descrição</span></span></button>
            <button onClick={() => { compartilharTexto(c); onShare() }} style={box}><MessageCircle size={17} color="#16a34a" /><span><b style={{ fontSize: 13 }}>Compartilhar texto</b><br /><span style={{ fontSize: 11, color: '#8a857c' }}>Enviar só o texto</span></span></button>
            <button onClick={() => setModalArq(true)} style={box}><Images size={17} color={ROSA} /><span><b style={{ fontSize: 13 }}>Selecionar arquivos</b><br /><span style={{ fontSize: 11, color: '#8a857c' }}>Escolher o que enviar</span></span></button>
            <button onClick={() => { compartilharArquivos(c, c.arquivos.map(a => a.id), true, onShare) }} style={box}><Share2 size={17} color={ROXO} /><span><b style={{ fontSize: 13 }}>Compartilhar tudo</b><br /><span style={{ fontSize: 11, color: '#8a857c' }}>Texto + arquivos</span></span></button>
          </div>

          {/* Estatísticas */}
          <div style={{ marginTop: 18 }}>
            <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16 }}>
              <p style={{ fontSize: 11.5, fontWeight: 800, color: ROXO, letterSpacing: .5, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><BarChart3 size={14} /> ESTATÍSTICAS</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center' }}>
                <div><div style={{ fontSize: 22, fontWeight: 900, color: '#16a34a' }}>{vendidos ?? 0}</div><div style={{ fontSize: 11, color: '#8a857c' }}>Serviços vendidos</div></div>
                <div><div style={{ fontSize: 22, fontWeight: 900, color: ROXO }}>{c.views || 0}</div><div style={{ fontSize: 11, color: '#8a857c' }}>Visualizações</div></div>
                <button onClick={onVerShares} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: ROSA }}>{c.shares || 0}</div><div style={{ fontSize: 11, color: ROXO, fontWeight: 700 }}>Compartilhamentos ›</div>
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '12px 0 0', textAlign: 'center' }}>
                Serviços vendidos: soma do serviço <b>“{c.titulo}”</b> no relatório, no período da campanha.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen */}
      {tela && atual && (
        <div onClick={() => setTela(false)} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,.94)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setTela(false)} style={{ position: 'absolute', top: 20, right: 20, border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff', borderRadius: 999, width: 40, height: 40, cursor: 'pointer' }}><X size={20} /></button>
          {c.arquivos.length > 1 && <NavBtn dir="left" grande onClick={(e) => { e?.stopPropagation(); setIdx(i => (i - 1 + c.arquivos.length) % c.arquivos.length) }} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={atual.url} alt="" onClick={e => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain' }} />
          {c.arquivos.length > 1 && <NavBtn dir="right" grande onClick={(e) => { e?.stopPropagation(); setIdx(i => (i + 1) % c.arquivos.length) }} />}
        </div>
      )}

      {/* Modal de seleção de arquivos */}
      {modalArq && <ModalArquivos c={c} onClose={() => setModalArq(false)} onShare={onShare} />}
    </div>
  )
}

/* ─────────────── Modal: selecionar arquivos para enviar ─────────────── */
function ModalArquivos({ c, onClose, onShare }: { c: Campanha; onClose: () => void; onShare?: () => void }) {
  const [sel, setSel] = useState<string[]>(c.arquivos.map(a => a.id))
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 96, background: 'rgba(20,15,45,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: 20, width: 'min(440px,100%)', maxHeight: '86vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <b style={{ fontSize: 16, color: '#1a1a2e' }}>Compartilhar arquivos</b>
          <button onClick={onClose} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b6860' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 12, color: '#8a857c', margin: '0 0 12px' }}>{c.titulo}</p>
        {c.arquivos.length === 0 ? <p style={{ fontSize: 13, color: '#8a857c' }}>Esta campanha não tem arquivos.</p> : (
          <>
            <button onClick={() => setSel(sel.length === c.arquivos.length ? [] : c.arquivos.map(a => a.id))} style={{ fontSize: 12.5, fontWeight: 700, color: ROXO, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, marginBottom: 8 }}>
              {sel.length === c.arquivos.length ? 'Limpar seleção' : 'Selecionar todos'}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: 8, marginBottom: 14 }}>
              {c.arquivos.map(a => {
                const on = sel.includes(a.id)
                return (
                  <button key={a.id} onClick={() => setSel(s => on ? s.filter(x => x !== a.id) : [...s, a.id])} style={{ position: 'relative', border: on ? `2.5px solid ${ROXO}` : '2px solid #eee', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', padding: 0, aspectRatio: '1', background: '#000' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: on ? 1 : .7 }} />
                    {on && <span style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 999, background: ROXO, color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { compartilharArquivos(c, sel, false, onShare); onClose() }} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Enviar arquivos</button>
              <button onClick={() => { compartilharArquivos(c, sel, true, onShare); onClose() }} style={{ flex: 1, padding: 11, borderRadius: 10, border: 'none', background: ROXO, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Arquivos + texto</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function NavBtn({ dir, onClick, grande }: { dir: 'left' | 'right'; onClick: (e?: React.MouseEvent) => void; grande?: boolean }) {
  const s = grande ? 48 : 34
  const off = grande ? 18 : 8
  const st: React.CSSProperties = { position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: s, height: s, borderRadius: 999, border: 'none', background: 'rgba(255,255,255,.85)', color: '#1a1a2e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }
  if (dir === 'left') st.left = off; else st.right = off
  return (
    <button onClick={onClick} style={st}>
      {dir === 'left' ? <ChevronLeft size={grande ? 26 : 18} /> : <ChevronRight size={grande ? 26 : 18} />}
    </button>
  )
}

/* ─────────────── Modal criar/editar ─────────────── */
function ModalEditar({ inicial, onSalvar, onClose }: { inicial: Campanha; onSalvar: (c: Campanha) => void; onClose: () => void }) {
  const [c, setC] = useState<Campanha>(inicial)
  const fileRef = useRef<HTMLInputElement>(null)
  const up = (campo: keyof Campanha, v: any) => setC(x => ({ ...x, [campo]: v }))

  function addImagens(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(f => {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name}: só imagens nesta etapa`); return }
      if (f.size > 1.4 * 1024 * 1024) { toast.error(`${f.name}: imagem acima de 1,4 MB`); return }
      const r = new FileReader()
      r.onload = () => {
        const arq: ArquivoCampanha = { id: rid(), tipo: 'imagem', url: String(r.result || ''), nome: f.name }
        setC(x => ({ ...x, arquivos: [...x.arquivos, arq], capaId: x.capaId || arq.id }))
      }
      r.readAsDataURL(f)
    })
  }
  function removerArq(id: string) { setC(x => ({ ...x, arquivos: x.arquivos.filter(a => a.id !== id), capaId: x.capaId === id ? x.arquivos.find(a => a.id !== id)?.id : x.capaId })) }

  const lab: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', margin: '12px 0 4px' }
  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #d0cdc7', fontSize: 14 }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(20,15,45,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: 'min(600px,100%)', maxHeight: '90vh', overflowY: 'auto', padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <b style={{ fontSize: 18, color: '#1a1a2e' }}>{inicial.titulo ? 'Editar campanha' : 'Nova campanha'}</b>
          <button onClick={onClose} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b6860' }}><X size={20} /></button>
        </div>

        <label style={lab}>Título (use o mesmo nome de um serviço, para contabilizar)</label>
        <input value={c.titulo} onChange={e => up('titulo', e.target.value)} placeholder="Ex.: Promoção Escova Premium" style={inp} />

        <label style={lab}>Descrição resumida (aparece no card)</label>
        <input value={c.descricao} onChange={e => up('descricao', e.target.value)} placeholder="Uma frase curta" style={inp} />

        <label style={lab}>Como funciona</label>
        <textarea value={c.comoFunciona} onChange={e => up('comoFunciona', e.target.value)} rows={4} placeholder={'Ex.: Na compra da Escova, 50% de desconto na Hidratação.\nVálido até 31/08.'} style={{ ...inp, resize: 'vertical' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lab}>Categoria</label>
            <select value={c.categoria} onChange={e => up('categoria', e.target.value)} style={inp}>
              {CATEGORIAS_ACOES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label style={lab}>Publicar (visível para os profissionais)</label>
            <button onClick={() => up('ativa', !c.ativa)} style={{ ...inp, textAlign: 'left', cursor: 'pointer', background: c.ativa ? '#f0fdf4' : '#fef2f2', color: c.ativa ? '#16a34a' : '#dc2626', fontWeight: 700, border: `1.5px solid ${c.ativa ? '#bbf7d0' : '#fecaca'}` }}>
              {c.ativa ? '✓ Publicada' : '○ Rascunho (oculta)'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={lab}>Início</label><input type="date" value={c.dataInicio || ''} onChange={e => up('dataInicio', e.target.value)} style={inp} /></div>
          <div><label style={lab}>Fim (validade)</label><input type="date" value={c.dataFim || ''} onChange={e => up('dataFim', e.target.value)} style={inp} /></div>
        </div>

        <label style={lab}>Imagens da campanha (a 1ª/estrela é a capa)</label>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => { addImagens(e.target.files); if (fileRef.current) fileRef.current.value = '' }} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} style={{ ...inp, border: '2px dashed #c9c4f0', background: '#f6f4ff', color: ROXO, fontWeight: 700, cursor: 'pointer' }}>
          🖼️ Adicionar imagens (JPG/PNG/WEBP até 1,4 MB cada)
        </button>
        {c.arquivos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: 8, marginTop: 10 }}>
            {c.arquivos.map(a => (
              <div key={a.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: c.capaId === a.id ? `2.5px solid ${ROXO}` : '2px solid #eee', aspectRatio: '1', background: '#000' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button title="Definir como capa" onClick={() => up('capaId', a.id)} style={{ position: 'absolute', top: 3, left: 3, border: 'none', borderRadius: 999, width: 22, height: 22, cursor: 'pointer', background: c.capaId === a.id ? ROXO : 'rgba(255,255,255,.85)', color: c.capaId === a.id ? '#fff' : '#6b6860', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Star size={12} /></button>
                <button title="Remover" onClick={() => removerArq(a.id)} style={{ position: 'absolute', top: 3, right: 3, border: 'none', borderRadius: 999, width: 22, height: 22, cursor: 'pointer', background: 'rgba(220,38,38,.9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #d0cdc7', background: '#fff', color: '#6b6860', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => onSalvar(c)} style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 12, borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${ROXO},${ROSA})`, color: '#fff', fontWeight: 800, cursor: 'pointer' }}><Save size={16} /> Salvar campanha</button>
        </div>
      </div>
    </div>
  )
}
