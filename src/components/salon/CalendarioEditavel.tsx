'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Plus, Trash2, X, CalendarDays, ChevronLeft, ChevronRight, Bell, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { getLogoSalao } from '@/lib/logoSalao'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

interface Evento { id: string; data: string; texto: string; responsavel?: string }
const rid = () => Math.random().toString(36).slice(2, 8)
const SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const hojeStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const diasAte = (data: string) => { const [y, m, d] = data.split('-').map(Number); const alvo = new Date(y, m - 1, d); const h = new Date(); h.setHours(0, 0, 0, 0); return Math.round((alvo.getTime() - h.getTime()) / 86400000) }

export default function CalendarioEditavel({ chave, titulo, comResponsavel, camposGrandes, corTema = '#5b4fcf', mostrarLembrete, embutido }: { chave: string; titulo: string; comResponsavel?: boolean; camposGrandes?: boolean; corTema?: string; mostrarLembrete?: boolean; embutido?: boolean }) {
  const router = useRouter()
  // Regra nova (jul/2026): liberou = pode ver E salvar. Quem chega nesta tela
  // já tem a permissão do calendário, então edita normalmente.
  const somenteLeitura = false
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Calendário') // avisa "Deseja salvar?" antes de sair sem salvar
  const [ref, setRef] = useState(() => { const d = new Date(); return { ano: d.getFullYear(), mes: d.getMonth() } })
  const [selDia, setSelDia] = useState<string | null>(null)
  const [novoTexto, setNovoTexto] = useState('')
  const [novoResp, setNovoResp] = useState('')
  const [lembreteAberto, setLembreteAberto] = useState(true)

  const carregar = useCallback(async () => {
    try {
      const d = await fetch(`/api/salon/grid?chave=${chave}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.eventos)) setEventos(d.eventos)
    } catch { /* */ }
    setLoading(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  async function salvar(lista?: Evento[]) {
    const dados = lista || eventos
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, doc: { eventos: dados } }) })
      if (res.ok) { toast.success('Salvo!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function eventosDoDia(data: string) { return eventos.filter(e => e.data === data) }
  function abrirDia(data: string) {
    setSelDia(data); setNovoTexto(''); setNovoResp('')
    const lista = eventosDoDia(data)
    if (lista.length > 1) toast(`📌 ${lista.length} compromissos neste dia`, { icon: '📅' })
  }
  function addEvento() {
    if (!selDia || !novoTexto.trim()) { toast.error('Escreva o compromisso'); return }
    const novo: Evento = { id: rid(), data: selDia, texto: novoTexto.trim(), responsavel: novoResp.trim() || undefined }
    const lista = [...eventos, novo]
    setEventos(lista); setNovoTexto(''); setNovoResp(''); setDirty(true); salvar(lista)
  }
  function removerEvento(id: string) {
    const lista = eventos.filter(e => e.id !== id)
    setEventos(lista); setDirty(true); salvar(lista)
  }

  async function imprimir() {
    const logoSalao = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
    const ordenados = [...eventos].sort((a, b) => a.data.localeCompare(b.data))
    const body = ordenados.map(e => `<tr><td class="d">${esc(e.data.split('-').reverse().join('/'))}</td><td>${esc(e.texto)}</td>${comResponsavel ? `<td>${esc(e.responsavel || '')}</td>` : ''}</tr>`).join('')
    const colResp = comResponsavel ? '<th>Responsável</th>' : ''
    const css = `@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:12px}.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${corTema};padding-bottom:8px;margin-bottom:14px}.brand{font-size:22px;font-weight:900;color:${corTema}}table{width:100%;border-collapse:collapse}th,td{border:none;border-bottom:1px solid #eee;padding:7px 9px;text-align:left;vertical-align:top;word-break:break-word;white-space:pre-wrap}th{background:#f6f4ff;color:${corTema};border-bottom:2px solid ${corTema};font-size:10px;text-transform:uppercase;letter-spacing:.4px}tbody tr:nth-child(even) td{background:#fbfaf8}.d{white-space:nowrap;font-weight:700;width:110px}tr{break-inside:avoid}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(titulo)}</title><style>${css}</style></head><body><div class="hd">${logoSalao ? `<img src="${logoSalao}" style="max-height:60px;max-width:210px;object-fit:contain"/>` : `<div class="brand">NODRI</div>`}<div style="text-align:right;font-size:11px"><strong>${esc(titulo)}</strong><br>${new Date().toLocaleDateString('pt-BR')}</div></div><table><thead><tr><th>Data</th><th>Compromisso</th>${colResp}</tr></thead><tbody>${body || `<tr><td colspan="3">Nenhum compromisso.</td></tr>`}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  const diasNoMes = new Date(ref.ano, ref.mes + 1, 0).getDate()
  const primDiaSemana = new Date(ref.ano, ref.mes, 1).getDay()
  const mesStr = (d: number) => `${ref.ano}-${String(ref.mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const mudarMes = (delta: number) => { let m = ref.mes + delta, a = ref.ano; if (m < 0) { m = 11; a-- } if (m > 11) { m = 0; a++ } setRef({ ano: a, mes: m }); setSelDia(null) }

  // Próximos compromissos (faltam até 2 dias)
  const proximos = eventos.filter(e => { const n = diasAte(e.data); return n >= 0 && n <= 2 }).sort((a, b) => a.data.localeCompare(b.data))

  if (loading) return <div className={embutido ? '' : 'nodri-salon-bg'} style={{ minHeight: embutido ? 120 : '100vh', display: 'flex', justifyContent: 'center', paddingTop: embutido ? 30 : 80 }}><Loader2 size={26} className="animate-spin" style={{ color: corTema }} /></div>

  return (
    <div className={embutido ? '' : 'nodri-salon-bg'} style={embutido ? {} : { minHeight: '100vh' }}>
      {!embutido ? (
      <nav style={{ background: '#faf9f7', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}><CalendarDays size={15} style={{ display: 'inline', verticalAlign: -2, marginRight: 6, color: corTema }} />{titulo}</span>
        <div style={{ flex: 1 }} />
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
      </nav>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><Printer size={13} /> Imprimir</button>
        </div>
      )}

      <div style={{ maxWidth: 820, margin: '0 auto', padding: embutido ? 0 : 16 }}>
        {/* Lembrete (faltam até 2 dias) */}
        {mostrarLembrete && proximos.length > 0 && lembreteAberto && (
          <div style={{ background: 'linear-gradient(135deg,#ef4444,#db2777)', color: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 16, position: 'relative' }}>
            <button onClick={() => setLembreteAberto(false)} style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'rgba(255,255,255,.25)', color: '#fff', borderRadius: 8, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, marginBottom: 8 }}><Bell size={16} /> Compromissos chegando!</div>
            {proximos.map(e => { const n = diasAte(e.data); return (
              <div key={e.id} style={{ fontSize: 13, marginBottom: 3 }}>📌 <strong>{n === 0 ? 'HOJE' : n === 1 ? 'AMANHÃ' : `em ${n} dias`}</strong> — {e.texto}{e.responsavel ? ` (${e.responsavel})` : ''}</div>
            ) })}
          </div>
        )}

        {/* Cabeçalho do mês */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 14 }}>
          <button onClick={() => mudarMes(-1)} style={navBtn}><ChevronLeft size={18} /></button>
          <span style={{ fontWeight: 800, fontSize: 17, color: '#1a1a1a', minWidth: 180, textAlign: 'center' }}>{MESES[ref.mes]} {ref.ano}</span>
          <button onClick={() => mudarMes(1)} style={navBtn}><ChevronRight size={18} /></button>
        </div>

        {/* Grade do calendário — completa; no celular rola de lado mantendo o tamanho legível */}
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div className="nodri-cal-wrap" style={{ minWidth: 540 }}>
            <div className="nodri-cal-7" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
              {SEM.map(s => <div key={s} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#9ca3af', padding: '5px 0' }}>{s}</div>)}
            </div>
            <div className="nodri-cal-7" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
              {Array.from({ length: primDiaSemana }).map((_, i) => <div key={'e' + i} />)}
              {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(d => {
                const data = mesStr(d)
                const tem = eventosDoDia(data)
                const ehHoje = data === hojeStr()
                const sel = selDia === data
                return (
                  <button key={d} onClick={() => abrirDia(data)}
                    style={{ minHeight: 66, borderRadius: 8, border: sel ? `2px solid ${corTema}` : '1px solid #ece9e2', background: tem.length ? '#fef2f2' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', padding: '5px 6px', position: 'relative', textAlign: 'left', overflow: 'hidden' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: ehHoje ? '#fff' : (tem.length ? '#dc2626' : '#374151'), alignSelf: 'flex-start', ...(ehHoje ? { background: corTema, borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}) }}>{d}</span>
                    {tem.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, marginTop: 3, color: '#dc2626', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{tem.length > 1 ? `📌 ${tem.length} compromissos` : tem[0].texto}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Card do dia selecionado (modal — abre por cima, sem precisar rolar) */}
        {selDia && (
          <div onClick={() => setSelDia(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={ev => ev.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f0eee8', position: 'sticky', top: 0, background: '#fff' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: corTema, margin: 0 }}>📅 {selDia.split('-').reverse().join('/')}</h3>
                <button onClick={() => setSelDia(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
              </div>
              <div style={{ padding: 18 }}>
                {eventosDoDia(selDia).length === 0 && <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 10px' }}>Nenhum compromisso neste dia.</p>}
                {eventosDoDia(selDia).map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px', borderRadius: 8, background: '#faf9f7', marginBottom: 8 }}>
                    <span style={{ color: '#dc2626', flexShrink: 0 }}>📌</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: '#1a1a1a', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{e.texto}</div>
                      {e.responsavel && <div style={{ fontSize: 11, color: corTema, fontWeight: 700, marginTop: 2, wordBreak: 'break-word' }}>👤 {e.responsavel}</div>}
                    </div>
                    {!somenteLeitura && <button onClick={() => removerEvento(e.id)} title="Remover" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', flexShrink: 0 }}><Trash2 size={14} /></button>}
                  </div>
                ))}

                {/* Adicionar (oculto para usuário somente leitura) */}
                {!somenteLeitura && (
                  <div style={{ marginTop: 8, borderTop: '1px dashed #e8e6e0', paddingTop: 12 }}>
                    {comResponsavel && <input value={novoResp} onChange={e => setNovoResp(e.target.value)} placeholder="Responsável" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, marginBottom: 8 }} />}
                    {camposGrandes
                      ? <textarea value={novoTexto} onChange={e => setNovoTexto(e.target.value)} placeholder="Descreva a ação / compromisso..." rows={4} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
                      : <input value={novoTexto} onChange={e => setNovoTexto(e.target.value)} placeholder="Compromisso..." style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />}
                    <button onClick={addEvento} disabled={salvando} style={{ marginTop: 8, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 16px', borderRadius: 8, border: 'none', background: corTema, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Adicionar e salvar</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Próximos compromissos (agenda) */}
        {(() => {
          const futuros = eventos.filter(e => diasAte(e.data) >= 0).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 20)
          if (!futuros.length) return null
          return (
            <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: corTema, margin: '0 0 10px' }}>📋 Próximos compromissos</h3>
              {futuros.map(e => {
                const n = diasAte(e.data)
                const badge = n === 0 ? 'HOJE' : n === 1 ? 'AMANHÃ' : `${n} dias`
                const cor = n <= 2 ? '#dc2626' : '#0891b2'
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0eee8' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: cor, borderRadius: 20, padding: '3px 9px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>{badge}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{e.data.split('-').reverse().join('/')}</div>
                      <div style={{ fontSize: 13, color: '#1a1a1a', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{e.texto}</div>
                      {e.responsavel && <div style={{ fontSize: 11, color: corTema, fontWeight: 700, marginTop: 2, wordBreak: 'break-word' }}>👤 {e.responsavel}</div>}
                    </div>
                    {!somenteLeitura && <button onClick={() => removerEvento(e.id)} title="Remover" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', flexShrink: 0 }}><Trash2 size={14} /></button>}
                  </div>
                )
              })}
            </div>
          )
        })()}

        <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 14 }}>Dias com compromisso ficam <span style={{ color: '#dc2626', fontWeight: 700 }}>em vermelho</span>. Clique numa data para adicionar, ver ou remover. {salvando && '· salvando...'}</p>
      </div>
    </div>
  )
}

const navBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, border: '1px solid #e0ddd8', background: '#fff', color: '#6b6860', cursor: 'pointer' }
