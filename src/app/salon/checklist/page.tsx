'use client'

import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Plus, Trash2, Check, X, BarChart3, Copy, RotateCcw, Pencil, Calendar, ArrowRightLeft, ArrowDownAZ, ChevronDown, CheckCircle2, HandCoins, Circle, Star, Route, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { CHECKLIST_DEFAULT, FREQUENCIAS } from '@/components/salon/checklistDefaults'
import { usePermissoes } from '@/lib/usePermissoes'
import { useIsMobile } from '@/lib/useIsMobile'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { useAutoSalvar } from '@/lib/autoSalvar'
import ConsolidadoDescontos from '@/components/salon/ConsolidadoDescontos'

interface Demanda { id: string; texto: string; freq: string; feito: boolean; dias?: string[]; feito_em?: string; historico?: string[]; fixa?: boolean; diaMes?: number }
interface Categoria { id: string; nome: string; demandas: Demanda[] }
interface Doc { categorias: Categoria[] }

const rid = () => Math.random().toString(36).slice(2, 8)
const norm = (s: string) => (s || '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')
const buildDefault = (): Doc => ({ categorias: CHECKLIST_DEFAULT.map(c => ({ id: rid(), nome: c.nome, demandas: c.demandas.map(t => ({ id: rid(), texto: t, freq: 'Diário', feito: false })) })) })
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const NOME_DIA = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO']

const FREQ_COR: Record<string, { bg: string; bd: string; txt: string }> = {
  'Diário': { bg: '#f0fdf4', bd: '#16a34a', txt: '#15803d' },
  'Semanal': { bg: '#ecfeff', bd: '#0891b2', txt: '#0e7490' },
  'Quinzenal': { bg: '#f5f3ff', bd: '#7c3aed', txt: '#6d28d9' },
  'Mensal': { bg: '#fff7ed', bd: '#ea580c', txt: '#c2410c' },
  'Trimestral': { bg: '#fdf2f8', bd: '#db2777', txt: '#be185d' },
  'Semestral': { bg: '#eef2ff', bd: '#4f46e5', txt: '#4338ca' },
  'Anual': { bg: '#fefce8', bd: '#ca8a04', txt: '#a16207' },
}
const ROTULO_PENDENTE: Record<string, string> = {
  'Diário': 'PENDENTE HOJE', 'Semanal': 'PENDENTE NESTA SEMANA', 'Quinzenal': 'PENDENTE NA QUINZENA',
  'Mensal': 'PENDENTE NO MÊS', 'Trimestral': 'PENDENTE NO TRIMESTRE', 'Semestral': 'PENDENTE NO SEMESTRE', 'Anual': 'PENDENTE NO ANO',
}

// ── Janelas de período (reset automático, sem robô agendado) ──
// Cada marcação guarda a data (feito_em). A tarefa conta como feita apenas se
// foi marcada DENTRO da janela atual do seu período: virou o dia/semana/
// quinzena/mês/trimestre, ela volta a aparecer como pendente sozinha.
function inicioJanela(freq: string): Date {
  const agora = new Date()
  const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  if (freq === 'Semanal') { const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return d } // começa na segunda
  if (freq === 'Quinzenal') return new Date(d.getFullYear(), d.getMonth(), d.getDate() <= 15 ? 1 : 16)
  if (freq === 'Mensal') return new Date(d.getFullYear(), d.getMonth(), 1)
  if (freq === 'Trimestral') return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)
  if (freq === 'Semestral') return new Date(d.getFullYear(), d.getMonth() < 6 ? 0 : 6, 1)
  if (freq === 'Anual') return new Date(d.getFullYear(), 0, 1)
  return d // Diário (e qualquer valor desconhecido)
}
const feitoNoPeriodo = (dem: Demanda): boolean => !!dem.feito_em && new Date(dem.feito_em) >= inicioJanela(dem.freq)

// Dia do mês da demanda (1–31) para ordenar. Usa o campo diaMes; se vazio, tenta
// achar um "DIA N" já escrito no texto. Sem dia → 99 (vai pro fim da lista).
const DIA_SEM = 99
function diaDoMes(dem: Demanda): number {
  if (dem.diaMes && dem.diaMes >= 1 && dem.diaMes <= 31) return dem.diaMes
  const m = (dem.texto || '').match(/\bdia\s+(\d{1,2})\b/i)
  const d = m ? Number(m[1]) : 0
  return (d >= 1 && d <= 31) ? d : DIA_SEM
}

// Registra a marcação de hoje no item (data + histórico p/ estatística)
function marcarAgora(dem: Demanda) {
  dem.feito = true
  dem.feito_em = new Date().toISOString()
  const hoje = new Date().toISOString().slice(0, 10)
  dem.historico = [...(dem.historico || []).filter(h => h !== hoje), hoje].slice(-90)
}

export default function ChecklistPage() {
  const router = useRouter()
  const { ehSub, modoCaixa } = usePermissoes()
  const isMobile = useIsMobile()
  // Sub comum EDITA (chegou aqui porque tem a permissão do Check List).
  // Só o MODO CAIXA fica restrito: executa (marca feito) e ADICIONA, mas não
  // edita nem exclui — soExecuta esconde os controles destrutivos.
  const soLeitura = false
  const soExecuta = ehSub && modoCaixa
  const [doc, setDoc] = useState<Doc>({ categorias: [] })
  const [catSel, setCatSel] = useState(0)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Check List') // avisa "Deseja salvar?" antes de sair sem salvar
  useAutoSalvar(dirty, () => salvar(true))  // e salva sozinho de qualquer jeito
  const [verRelatorio, setVerRelatorio] = useState(false)
  const [verComuns, setVerComuns] = useState(false)
  const [descontoOpen, setDescontoOpen] = useState(false)
  // "Fazer" = roteiro guiado (limpo, pra quem executa/cobre); "Editar" = configurar.
  // Sub/recepção não configura, então fica sempre no roteiro.
  const [modo, setModo] = useState<'fazer' | 'editar'>('fazer')
  const [diasOpen, setDiasOpen] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState<string | null>(null)
  // Posição dos menus flutuantes (fixos na tela — não são cortados pela rolagem interna dos cards)
  const [popPos, setPopPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  function ancorarPop(e: React.MouseEvent, larguraMenu: number) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopPos({ top: Math.min(r.bottom + 4, window.innerHeight - 300), left: Math.max(8, Math.min(r.left, window.innerWidth - larguraMenu - 8)) })
  }
  // Fecha os menus ao clicar em qualquer lugar fora deles — SEM engolir o clique
  // (nada de fundo invisível bloqueando a página: o clique seguinte funciona normal)
  useEffect(() => {
    if (!diasOpen && !transferOpen) return
    const h = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement
      if (alvo.closest?.('[data-pop-root]')) return
      setDiasOpen(null); setTransferOpen(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [diasOpen, transferOpen])
  // Cards por período: Diário nasce aberto (é o uso de toda hora), os demais fechados
  const [secoesAbertas, setSecoesAbertas] = useState<Record<string, boolean>>({ 'Diário': true })

  const carregar = useCallback(async () => {
    try {
      const d = await fetch('/api/salon/grid?chave=checklist').then(r => r.ok ? r.json() : null)
      const docNovo: Doc = d && Array.isArray(d.categorias) ? d : buildDefault()
      // Migração suave: marcações antigas (sem data) valem como feitas no período atual
      const agoraISO = new Date().toISOString()
      docNovo.categorias.forEach(c => c.demandas.forEach(x => { if (x.feito && !x.feito_em) x.feito_em = agoraISO }))
      setDoc(docNovo)
    } catch { setDoc(buildDefault()) }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  function mut(fn: (d: Doc) => void) { setDoc(prev => { const n: Doc = JSON.parse(JSON.stringify(prev)); fn(n); return n }); setDirty(true) }

  function toggleFeito(ci: number, di: number) {
    mut(d => {
      const dem = d.categorias[ci].demandas[di]
      if (feitoNoPeriodo(dem)) { dem.feito = false; delete dem.feito_em }
      else marcarAgora(dem)
    })
  }
  function toggleFixa(ci: number, di: number) { mut(d => { const dem = d.categorias[ci].demandas[di]; dem.fixa = !dem.fixa }) }
  function setDiaMes(ci: number, di: number, v: string) { mut(d => { const n = Number(v); (d.categorias[ci].demandas[di] as any).diaMes = (n >= 1 && n <= 31) ? n : undefined }) }
  function setDemanda(ci: number, di: number, campo: 'texto' | 'freq', v: string) { mut(d => { (d.categorias[ci].demandas[di] as any)[campo] = v }) }
  function organizarAZ(ci: number) { mut(d => { d.categorias[ci].demandas.sort((a, b) => norm(a.texto).localeCompare(norm(b.texto))) }); toast.success('Organizado em ordem alfabética — repare se aparecerem itens parecidos/repetidos') }
  function toggleDia(ci: number, di: number, dia: string) {
    mut(d => {
      const dem = d.categorias[ci].demandas[di]
      if (!dem.dias) dem.dias = []
      const idx = dem.dias.indexOf(dia)
      if (idx >= 0) dem.dias.splice(idx, 1); else dem.dias.push(dia)
    })
  }
  async function transferirDemanda(demandaId: string, categoriaDestinoId: string) {
    const novoDoc: Doc = JSON.parse(JSON.stringify(doc))
    let item: Demanda | null = null
    for (const c of novoDoc.categorias) {
      const idx = c.demandas.findIndex((x: Demanda) => x.id === demandaId)
      if (idx >= 0) { item = c.demandas.splice(idx, 1)[0]; break }
    }
    const destino = novoDoc.categorias.find(c => c.id === categoriaDestinoId)
    if (!item || !destino) return
    destino.demandas.push(item)
    setDoc(novoDoc); setTransferOpen(null)
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'checklist', doc: novoDoc }) })
      if (res.ok) { toast.success(`Transferido para "${destino.nome}"!`); setDirty(false) } else toast.error('Erro ao transferir')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }
  // "Marcar como feito" direto do Relatório: resolve e SALVA na hora
  async function marcarFeitoRelatorio(demId: string) {
    const novoDoc: Doc = JSON.parse(JSON.stringify(doc))
    for (const c of novoDoc.categorias) {
      const dem = c.demandas.find(x => x.id === demId)
      if (dem) { marcarAgora(dem); break }
    }
    setDoc(novoDoc)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'checklist', doc: novoDoc }) })
      if (res.ok) { toast.success('Feito! Pendência resolvida ✅'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
  }
  function addDemanda(ci: number, freq = 'Diário') { mut(d => { d.categorias[ci].demandas.push({ id: rid(), texto: '', freq, feito: false }) }); setSecoesAbertas(s => ({ ...s, [freq]: true })) }
  function delDemanda(ci: number, di: number) { mut(d => { d.categorias[ci].demandas.splice(di, 1) }) }
  function addCategoria() { mut(d => { d.categorias.push({ id: rid(), nome: 'Nova categoria', demandas: [] }) }); setCatSel(doc.categorias.length) }
  function renCategoria(ci: number, v: string) { mut(d => { d.categorias[ci].nome = v }) }
  function delCategoria(ci: number) { if (!confirm('Excluir esta categoria e todas as suas demandas?')) return; mut(d => { d.categorias.splice(ci, 1) }); setCatSel(0) }

  // silencioso = chamada do auto-save: grava sem avisar na tela
  async function salvar(silencioso = false) {
    if (!silencioso) setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'checklist', doc }) })
      if (res.ok) { if (!silencioso) toast.success('Check list salvo!'); setDirty(false) }
      else if (!silencioso) toast.error('Erro ao salvar')
    } catch { if (!silencioso) toast.error('Erro de conexão') }
    if (!silencioso) setSalvando(false)
  }
  function limparMarcacoes() {
    if (!confirm('Reinício forçado: desmarcar TODAS as demandas agora?\n\n(Normalmente não precisa — cada período zera sozinho: o diário vira à meia-noite, o semanal na segunda, o mensal no dia 1º...)')) return
    mut(d => { d.categorias.forEach(c => c.demandas.forEach(x => { x.feito = false; delete x.feito_em })) })
  }

  // ── Contadores por período atual ──
  const relat = doc.categorias.map(c => { const tot = c.demandas.length; const ok = c.demandas.filter(feitoNoPeriodo).length; return { nome: c.nome, tot, ok, pct: tot ? Math.round(ok / tot * 100) : 0 } })
  const totGeral = relat.reduce((a, b) => a + b.tot, 0)
  const okGeral = relat.reduce((a, b) => a + b.ok, 0)
  const pctGeral = totGeral ? Math.round(okGeral / totGeral * 100) : 0

  // ── ALERTA VERMELHO: tarefas marcadas para HOJE (dia da semana) e não feitas ──
  const hojeIdx = new Date().getDay()
  const hojeAbrev = DIAS_SEMANA[hojeIdx]
  const pendHoje: { dem: Demanda; cat: string; ci: number }[] = []
  doc.categorias.forEach((c, ci) => c.demandas.forEach(dem => {
    if (dem.texto.trim() && dem.dias?.includes(hojeAbrev) && !feitoNoPeriodo(dem)) pendHoje.push({ dem, cat: c.nome, ci })
  }))
  const pendPorCat: Record<number, number> = {}
  pendHoje.forEach(p => { pendPorCat[p.ci] = (pendPorCat[p.ci] || 0) + 1 })
  const temAlerta = pendHoje.length > 0
  // Nomes dos check lists (categorias) com pendência de hoje — para saber DE QUEM é
  const catsAlerta: [string, number][] = Object.entries(pendHoje.reduce((m, p) => { m[p.cat] = (m[p.cat] || 0) + 1; return m }, {} as Record<string, number>))

  // Demandas em comum (mesmo texto em mais de uma categoria)
  const mapa: Record<string, { texto: string; cats: Set<string> }> = {}
  doc.categorias.forEach(c => c.demandas.forEach(dem => { const k = norm(dem.texto); if (!k) return; if (!mapa[k]) mapa[k] = { texto: dem.texto, cats: new Set() }; mapa[k].cats.add(c.nome) }))
  const comuns = Object.values(mapa).filter(x => x.cats.size > 1).sort((a, b) => b.cats.size - a.cats.size)

  const cat = doc.categorias[catSel]

  // Linha de demanda (usada dentro dos cards por período).
  // Chamada como FUNÇÃO (não como <Componente/>) para o React não remontar a
  // linha a cada render — senão o campo de texto perderia o foco ao digitar.
  function LinhaDemanda({ dem, di }: { dem: Demanda; di: number }) {
    const fc = FREQ_COR[dem.freq] || FREQ_COR['Diário']
    const feitoOk = feitoNoPeriodo(dem)
    const alertaHoje = !!dem.dias?.includes(hojeAbrev) && !feitoOk
    return (
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start', gap: 8, padding: isMobile ? '10px' : '6px 8px', borderRadius: isMobile ? 12 : 8, borderLeft: `4px solid ${alertaHoje ? '#dc2626' : fc.bd}`, background: feitoOk ? '#f0fdf4' : alertaHoje ? '#fee2e2' : fc.bg, flexWrap: isMobile ? undefined : 'wrap' }}>
        {/* Linha 1: feito + texto */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
          <button onClick={() => !soLeitura && toggleFeito(catSel, di)} disabled={soLeitura} title="Feito?" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: 'none', background: feitoOk ? '#16a34a' : alertaHoje ? '#dc2626' : '#e5e7eb', color: feitoOk || alertaHoje ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 800, cursor: soLeitura ? 'default' : 'pointer', flexShrink: 0, width: 70, justifyContent: 'center', marginTop: 2 }}>
            {feitoOk ? <><Check size={13} /> Sim</> : <><X size={13} /> Não</>}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <AutoTextarea value={dem.texto} onChange={v => setDemanda(catSel, di, 'texto', v)} feito={feitoOk} readOnly={soLeitura || soExecuta} />
            {alertaHoje && <div style={{ fontSize: 10.5, fontWeight: 900, color: '#dc2626', paddingLeft: 8 }}>⚠ MARCADA PARA HOJE ({hojeAbrev.toUpperCase()}) — AINDA NÃO FEITA</div>}
          </div>
        </div>

        {/* Linha 2 (celular) / mesma linha (PC): frequência, dias, transferir, excluir */}
        <div className="nodri-linha-1" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'nowrap' }}>
          <select value={dem.freq} disabled={soLeitura || soExecuta} onChange={e => setDemanda(catSel, di, 'freq', e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: `1.5px solid ${fc.bd}`, background: '#fff', color: fc.txt, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
            {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          {!soLeitura && !soExecuta && (
            <div title="Dia do mês (opcional) — ordena a lista por dia" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, border: '1px solid ' + (dem.diaMes ? '#7c3aed' : '#d0cdc7'), background: dem.diaMes ? '#f5f3ff' : '#fff', borderRadius: 6, padding: '2px 4px 2px 7px', flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: dem.diaMes ? '#7c3aed' : '#9ca3af' }}>Dia</span>
              <input type="number" min={1} max={31} value={dem.diaMes || ''} onChange={e => setDiaMes(catSel, di, e.target.value)} placeholder="—"
                style={{ width: 34, border: 'none', background: 'transparent', textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#7c3aed', outline: 'none' }} />
            </div>
          )}

          {!soLeitura && !soExecuta && (
            <div data-pop-root style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={e => { ancorarPop(e, 300); setDiasOpen(diasOpen === dem.id ? null : dem.id) }} title="Dias da semana (opcional)"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid ' + (dem.dias?.length ? '#5b4fcf' : '#d0cdc7'), background: dem.dias?.length ? '#f0eefb' : '#fff', color: dem.dias?.length ? '#5b4fcf' : '#6b6860', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                <Calendar size={12} /> {dem.dias && dem.dias.length ? dem.dias.join(', ') : 'Dias'}
              </button>
              {diasOpen === dem.id && (<>
                <div style={{ position: 'fixed', top: popPos.top, left: popPos.left, zIndex: 60, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.15)', padding: 8, display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: isMobile ? 240 : 300 }}>
                  {DIAS_SEMANA.map(dia => {
                    const on = !!dem.dias?.includes(dia)
                    return <button key={dia} onClick={() => toggleDia(catSel, di, dia)} style={{ border: 'none', borderRadius: 6, padding: '6px 8px', fontSize: 11, fontWeight: 800, cursor: 'pointer', background: on ? '#5b4fcf' : '#f3f2ee', color: on ? '#fff' : '#6b6860' }}>{dia}</button>
                  })}
                </div>
              </>)}
            </div>
          )}

          {!soLeitura && !soExecuta && (
            <div data-pop-root style={{ position: 'relative', flexShrink: 0 }}>
              <button onClick={e => { ancorarPop(e, 230); setTransferOpen(transferOpen === dem.id ? null : dem.id) }} title="Transferir para outra categoria"
                style={{ border: '1px solid #d0cdc7', background: '#fff', color: '#6b6860', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                <ArrowRightLeft size={13} />
              </button>
              {transferOpen === dem.id && (<>
                <div style={{ position: 'fixed', top: popPos.top, left: popPos.left, zIndex: 60, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.15)', minWidth: 200, maxHeight: 260, overflowY: 'auto', padding: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', padding: '4px 8px' }}>Mover para...</div>
                  {doc.categorias.filter(c => c.id !== cat!.id).map(c => (
                    <button key={c.id} onClick={() => transferirDemanda(dem.id, c.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, borderRadius: 6 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{c.nome}</button>
                  ))}
                </div>
              </>)}
            </div>
          )}

          {!soLeitura && !soExecuta && <button onClick={() => toggleFixa(catSel, di)} title={dem.fixa ? 'Tirar da rotina fixa' : 'Fixar na rotina (aparece no topo do roteiro)'} style={{ border: 'none', background: 'transparent', color: dem.fixa ? '#f59e0b' : '#c4c0b8', cursor: 'pointer', padding: 6, flexShrink: 0 }}><Star size={14} fill={dem.fixa ? '#f59e0b' : 'none'} /></button>}
          {!soLeitura && !soExecuta && <button onClick={() => delDemanda(catSel, di)} title="Excluir demanda" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 6, flexShrink: 0 }}><Trash2 size={13} /></button>}
        </div>
      </div>
    )
  }

  // Linha limpa do modo Roteiro: círculo de feito + texto (sem controles de edição)
  function LinhaRoteiro({ dem, di, numero }: { dem: Demanda; di: number; numero?: number }) {
    const feitoOk = feitoNoPeriodo(dem)
    const alertaHoje = !!dem.dias?.includes(hojeAbrev) && !feitoOk
    const dd = diaDoMes(dem)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '11px 10px' : '10px 12px', borderRadius: 10, background: feitoOk ? '#f6faf6' : alertaHoje ? '#fee2e2' : '#fff', border: '1px solid ' + (feitoOk ? '#e3efe3' : alertaHoje ? '#fca5a5' : '#eceae4') }}>
        {numero != null && <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#eef0fb', color: '#5b4fcf', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{numero}</span>}
        <button onClick={() => !soLeitura && toggleFeito(catSel, di)} disabled={soLeitura} title="Feito?" style={{ border: 'none', background: 'transparent', cursor: soLeitura ? 'default' : 'pointer', padding: 0, flexShrink: 0, display: 'inline-flex', lineHeight: 0 }}>
          {feitoOk ? <CheckCircle2 size={24} color="#16a34a" /> : <Circle size={24} color={alertaHoje ? '#dc2626' : '#c4c0b8'} />}
        </button>
        {dd !== DIA_SEM && <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 900, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #e9d5ff', borderRadius: 7, padding: '3px 8px', whiteSpace: 'nowrap' }}>dia {dd}</span>}
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: feitoOk ? '#9ca3af' : '#1a1a1a', textDecoration: feitoOk ? 'line-through' : 'none', lineHeight: 1.35 }}>
          {dem.texto}
          {alertaHoje && <span style={{ display: 'block', fontSize: 10.5, fontWeight: 900, color: '#dc2626' }}>⚠ marcada para hoje</span>}
        </span>
      </div>
    )
  }

  return (
    <div className="nodri-salon-bg" style={{ minHeight: '100vh', background: temAlerta ? '#fbe9e9' : undefined, transition: 'background .4s' }}>
      {/* No celular a barra fixa global já mostra o título e o Salvar — a nav
          da página só aparece no computador (sem duplicação). */}
      {!isMobile && (
      <nav style={{ background: temAlerta ? '#fdf1f1' : '#faf9f7', borderBottom: temAlerta ? '1px solid #f3c8c8' : '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40, flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}>✅ Check List Diário</span>
        {!soLeitura && (
          <div style={{ display: 'inline-flex', border: '1.5px solid #d8d4f0', borderRadius: 9, overflow: 'hidden', marginLeft: 4 }}>
            <button onClick={() => setModo('fazer')} title="Roteiro guiado — para executar/cobrir" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', border: 'none', background: modo === 'fazer' ? '#5b4fcf' : '#fff', color: modo === 'fazer' ? '#fff' : '#6b6860', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Route size={14} /> Fazer</button>
            <button onClick={() => setModo('editar')} title="Configurar as demandas" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', border: 'none', background: modo === 'editar' ? '#5b4fcf' : '#fff', color: modo === 'editar' ? '#fff' : '#6b6860', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Settings2 size={14} /> Editar</button>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => { setVerComuns(v => !v); setVerRelatorio(false) }} style={btnNav(verComuns)}><Copy size={14} /> Demandas em comum</button>
        <button onClick={() => { setVerRelatorio(v => !v); setVerComuns(false) }} style={btnNav(verRelatorio)}><BarChart3 size={14} /> Relatório{temAlerta ? ' ⚠️' : ''}</button>
        {!soLeitura && !soExecuta && <button onClick={limparMarcacoes} title="Reinício forçado (os períodos já zeram sozinhos)" style={btnNav(false)}><RotateCcw size={14} /> Limpar</button>}
        {!soLeitura && <button onClick={() => salvar()} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar geral</>}</button>}
        {soLeitura && <span style={{ fontSize: 12, color: '#6b6860', background: '#f1eefb', border: '1px solid #ddd6f5', borderRadius: 8, padding: '6px 12px' }}>👁️ Somente visualização</span>}
        {soExecuta && <span style={{ fontSize: 12, color: '#b45309', background: '#fff7ed', border: '1px solid #fcd34d', borderRadius: 8, padding: '6px 12px' }}>🧾 Modo Caixa — só executa e adiciona</span>}
      </nav>
      )}

      {/* No computador o conteúdo usa a tela toda (sem trava de 1000px) */}
      <div style={{ margin: '0 auto', padding: isMobile ? 16 : '16px 28px' }}>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 size={26} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> : (<>

          {/* 💸 LANÇAR DESCONTO — fixo no topo: consolida o desconto mensal de cada
              profissional (bebidas + serviços internos + empréstimos) numa lista só */}
          {!soLeitura && (
            <button onClick={() => setDescontoOpen(true)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', border: 'none', borderRadius: 14, padding: isMobile ? '13px 15px' : '15px 18px', marginBottom: 14, cursor: 'pointer', boxShadow: '0 8px 22px rgba(22,163,74,.28)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,.22)', flexShrink: 0 }}><HandCoins size={22} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 15, fontWeight: 900, letterSpacing: '.2px' }}>💸 LANÇAR DESCONTO (mensal)</strong>
                <span style={{ fontSize: 12, opacity: .95 }}>Puxa tudo a ser descontado de cada profissional — bebidas, serviços internos e empréstimos — numa lista só.</span>
              </span>
              <span style={{ fontSize: 22, opacity: .9, flexShrink: 0 }}>›</span>
            </button>
          )}

          {/* Celular: alterna Roteiro (Fazer) x Editar */}
          {isMobile && !soLeitura && (
            <div style={{ display: 'flex', border: '1.5px solid #d8d4f0', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
              <button onClick={() => setModo('fazer')} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', border: 'none', background: modo === 'fazer' ? '#5b4fcf' : '#fff', color: modo === 'fazer' ? '#fff' : '#6b6860', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}><Route size={16} /> Fazer</button>
              <button onClick={() => setModo('editar')} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', border: 'none', background: modo === 'editar' ? '#5b4fcf' : '#fff', color: modo === 'editar' ? '#fff' : '#6b6860', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}><Settings2 size={16} /> Editar</button>
            </div>
          )}

          {/* Celular: linha única e harmônica de ações (o Salvar fica na barra fixa
              do topo; o botão real fica invisível aqui só para o topo acioná-lo) */}
          {isMobile && (
            <div className="nodri-linha-1" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => { setVerRelatorio(v => !v); setVerComuns(false) }} style={{ ...btnMob(verRelatorio), flex: 1 }}><BarChart3 size={14} /> Relatório{temAlerta ? ' ⚠️' : ''}</button>
              <button onClick={() => { setVerComuns(v => !v); setVerRelatorio(false) }} style={{ ...btnMob(verComuns), flex: 1 }}><Copy size={14} /> Em comum</button>
              {!soLeitura && !soExecuta && <button onClick={limparMarcacoes} title="Reinício forçado" style={{ ...btnMob(false), width: 44, justifyContent: 'center' }}><RotateCcw size={15} /></button>}
              {!soLeitura && <button onClick={() => salvar()} aria-hidden tabIndex={-1} style={{ display: 'none' }}><Save size={12} /> Salvar</button>}
            </div>
          )}

          {/* 🔴 ALERTA DO DIA — some sozinho quando a última for marcada como feita */}
          {temAlerta && (
            <button onClick={() => { setVerRelatorio(true); setVerComuns(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 18px', marginBottom: 16, cursor: 'pointer', boxShadow: '0 10px 28px rgba(220,38,38,.35)' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>⚠️</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 14.5, fontWeight: 900, letterSpacing: '.3px' }}>HOJE É {NOME_DIA[hojeIdx]} — {pendHoje.length} tarefa{pendHoje.length > 1 ? 's' : ''} de hoje ainda não {pendHoje.length > 1 ? 'foram feitas' : 'foi feita'}!</strong>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
                  {catsAlerta.map(([nome, n]) => (
                    <span key={nome} style={{ background: 'rgba(255,255,255,.22)', border: '1px solid rgba(255,255,255,.45)', borderRadius: 20, padding: '2px 10px', fontSize: 11.5, fontWeight: 800 }}>📋 {nome}{n > 1 ? ` · ${n}` : ''}</span>
                  ))}
                </span>
                <span style={{ fontSize: 12, opacity: .92 }}>Este aviso aparece para todos e só some quando tudo for marcado como feito. Toque aqui para ver e resolver.</span>
              </span>
            </button>
          )}

          {/* Resumo geral sempre visível — compacto no celular, com barra de progresso */}
          {isMobile ? (
            <div style={{ background: 'linear-gradient(135deg,#7c3aed,#5b4fcf)', borderRadius: 14, padding: '12px 16px', color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 26, fontWeight: 900, flexShrink: 0 }}>{pctGeral}%</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ height: 8, background: 'rgba(255,255,255,.28)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${pctGeral}%`, height: '100%', background: '#fff', transition: 'width .3s' }} />
                </div>
                <div style={{ fontSize: 11.5, marginTop: 5, opacity: .92 }}>{okGeral} de {totGeral} no período · zera sozinho a cada período</div>
              </div>
            </div>
          ) : (
          <div style={{ background: 'linear-gradient(135deg,#7c3aed,#5b4fcf)', borderRadius: 14, padding: '14px 18px', color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{pctGeral}%</div>
            <div style={{ fontSize: 13 }}>{okGeral} de {totGeral} demandas feitas no período<br /><span style={{ opacity: .85 }}>em {doc.categorias.length} categorias · cada período zera sozinho (dia, semana, quinzena, mês, trimestre, semestre, ano)</span></div>
          </div>
          )}

          {/* Legenda de cores por período (só no PC — no celular as cores já aparecem nos cards) */}
          {!isMobile && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, fontSize: 11 }}>
            {FREQUENCIAS.map(f => { const c = FREQ_COR[f]; return <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#6b6860' }}><span style={{ width: 12, height: 12, borderRadius: 3, background: c.bg, border: `2px solid ${c.bd}` }} />{f}</span> })}
          </div>
          )}

          {/* 📊 RELATÓRIO: progresso por categoria + pendências por período com resolução na hora */}
          {verRelatorio && (() => {
            const idsHoje = new Set(pendHoje.map(p => p.dem.id))
            const pendPorFreq: Record<string, { dem: Demanda; cat: string }[]> = {}
            FREQUENCIAS.forEach(f => { pendPorFreq[f] = [] })
            doc.categorias.forEach(c => c.demandas.forEach(dem => {
              if (dem.texto.trim() && !feitoNoPeriodo(dem) && !idsHoje.has(dem.id)) pendPorFreq[dem.freq]?.push({ dem, cat: c.nome })
            }))
            const totalPend = pendHoje.length + FREQUENCIAS.reduce((s, f) => s + pendPorFreq[f].length, 0)
            const feitas30 = (dem: Demanda) => {
              const corte = Date.now() - 30 * 864e5
              return (dem.historico || []).filter(h => new Date(h + 'T12:00:00').getTime() >= corte).length
            }
            const LinhaPend = ({ dem, cat: nomeCat, destaque }: { dem: Demanda; cat: string; destaque?: boolean }) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: destaque ? '#fee2e2' : '#faf9f7', marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: destaque ? 700 : 500 }}>{dem.texto}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{nomeCat}{dem.dias?.length ? ` · dias: ${dem.dias.join(', ')}` : ''}{dem.freq === 'Diário' && (dem.historico?.length || 0) > 0 ? ` · feita ${feitas30(dem)}× nos últimos 30 dias` : ''}</div>
                </div>
                {!soLeitura && (
                  <button onClick={() => marcarFeitoRelatorio(dem.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>
                    <CheckCircle2 size={13} /> Marcar como feito
                  </button>
                )}
              </div>
            )
            return (
              <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px' }}>📊 Relatório do período</h3>
                <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '0 0 12px' }}>Cada tarefa zera sozinha quando o período vira: diárias à meia-noite, semanais na segunda, quinzenais nos dias 1 e 16, mensais no dia 1º, trimestrais em jan/abr/jul/out, semestrais em jan/jul e anuais em janeiro.</p>
                {relat.map((r, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}><span style={{ fontWeight: 700 }}>{r.nome}{(pendPorCat[i] || 0) > 0 ? ' ⚠️' : ''}</span><span style={{ color: '#6b6860' }}>{r.ok}/{r.tot} · {r.pct}%</span></div>
                    <div style={{ height: 8, background: '#eee', borderRadius: 5, overflow: 'hidden' }}><div style={{ width: `${r.pct}%`, height: '100%', background: r.pct === 100 ? '#16a34a' : '#5b4fcf' }} /></div>
                  </div>
                ))}

                <div style={{ borderTop: '1px solid #f0eee8', margin: '16px 0 12px' }} />
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 10px' }}>⏰ Pendências por período {totalPend > 0 && <span style={{ fontSize: 12, background: '#fee2e2', color: '#dc2626', borderRadius: 10, padding: '2px 10px', marginLeft: 6 }}>{totalPend}</span>}</h3>

                {totalPend === 0 && <p style={{ fontSize: 13.5, color: '#16a34a', fontWeight: 700 }}>🎉 Nenhuma pendência no momento — tudo em dia!</p>}

                {pendHoje.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#dc2626', letterSpacing: '.4px', marginBottom: 6 }}>🔴 MARCADAS PARA HOJE ({NOME_DIA[hojeIdx]}) — {pendHoje.length}</div>
                    {pendHoje.map(p => <LinhaPend key={p.dem.id} dem={p.dem} cat={p.cat} destaque />)}
                  </div>
                )}

                {FREQUENCIAS.map(f => pendPorFreq[f].length > 0 && (
                  <div key={f} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: FREQ_COR[f].txt, letterSpacing: '.4px', marginBottom: 6 }}>{ROTULO_PENDENTE[f]} — {pendPorFreq[f].length}</div>
                    {pendPorFreq[f].map(p => <LinhaPend key={p.dem.id} dem={p.dem} cat={p.cat} />)}
                  </div>
                ))}
              </div>
            )
          })()}

          {verComuns && (
            <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 6px' }}>🔁 Demandas em comum entre categorias</h3>
              <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 10px' }}>Demandas iguais que aparecem em mais de uma categoria.</p>
              {comuns.length === 0 ? <p style={{ fontSize: 13, color: '#9ca3af' }}>Nenhuma demanda repetida entre categorias.</p> :
                comuns.map((c, i) => (
                  <div key={i} style={{ borderBottom: '1px solid #f0eee8', padding: '8px 0' }}>
                    <div style={{ fontSize: 13, color: '#1a1a1a' }}>{c.texto}</div>
                    <div style={{ fontSize: 11, color: '#5b4fcf', fontWeight: 700, marginTop: 2 }}>{Array.from(c.cats).join('  ·  ')}</div>
                  </div>
                ))}
            </div>
          )}

          {/* Abas de categorias — no celular vira caixa suspensa (economiza tela) */}
          {isMobile ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <select value={catSel} onChange={e => setCatSel(Number(e.target.value))}
                style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 12, border: '1.5px solid #5b4fcf', background: '#f0eefb', color: '#1a1a1a', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                {doc.categorias.map((c, i) => {
                  const ok = c.demandas.filter(feitoNoPeriodo).length
                  return <option key={c.id} value={i}>{(pendPorCat[i] || 0) > 0 ? '⚠️ ' : ''}{c.nome} — {ok}/{c.demandas.length}</option>
                })}
              </select>
              {!soLeitura && <button onClick={addCategoria} title="Nova categoria" style={{ padding: '12px 14px', borderRadius: 12, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 14, fontWeight: 800, cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}><Plus size={16} /></button>}
            </div>
          ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {doc.categorias.map((c, i) => {
              const ok = c.demandas.filter(feitoNoPeriodo).length
              const alertas = pendPorCat[i] || 0
              return (
                <button key={c.id} onClick={() => setCatSel(i)} style={{ padding: '8px 14px', borderRadius: 10, border: catSel === i ? 'none' : alertas > 0 ? '1.5px solid #fca5a5' : '1.5px solid #e0ddd8', background: catSel === i ? '#1a1a1a' : '#fff', color: catSel === i ? '#fff' : '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {c.nome} <span style={{ opacity: .7, fontSize: 11 }}>{ok}/{c.demandas.length}</span>
                  {alertas > 0 && <span style={{ marginLeft: 6, background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 900 }}>⚠ {alertas}</span>}
                </button>
              )
            })}
            {!soLeitura && <button onClick={addCategoria} style={{ padding: '8px 14px', borderRadius: 10, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Plus size={14} /> Categoria</button>}
          </div>
          )}

          {cat && modo === 'editar' && !soLeitura && (
            <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16 }}>
              <div className="nodri-linha-1" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <Pencil size={14} color="#9ca3af" style={{ flexShrink: 0 }} />
                <input value={cat.nome} readOnly={soLeitura || soExecuta} onChange={e => renCategoria(catSel, e.target.value)} style={{ flex: 1, minWidth: 100, fontSize: 16, fontWeight: 800, color: '#5b4fcf', border: 'none', borderBottom: '1px solid #eee', outline: 'none', padding: '2px 0' }} />
                {!soLeitura && !soExecuta && <button onClick={() => organizarAZ(catSel)} title="Organizar em ordem alfabética (ajuda a achar duplicadas)" style={{ border: '1px solid #c9c4f0', background: '#f6f4ff', color: '#5b4fcf', borderRadius: 8, padding: isMobile ? '7px 9px' : '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}><ArrowDownAZ size={14} />{!isMobile && ' Organizar A-Z'}</button>}
                {!soLeitura && !soExecuta && <button onClick={() => delCategoria(catSel)} title="Excluir categoria" style={{ border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: 8, padding: isMobile ? '7px 9px' : '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}><Trash2 size={13} />{!isMobile && ' Categoria'}</button>}
              </div>

              {/* ── Cards expansíveis por período ── */}
              {FREQUENCIAS.map(freq => {
                const itens = cat.demandas.map((dem, di) => ({ dem, di })).filter(x => x.dem.freq === freq)
                if (!itens.length) return null
                const fc = FREQ_COR[freq]
                const ok = itens.filter(x => feitoNoPeriodo(x.dem)).length
                const completo = ok === itens.length
                const aberto = !!secoesAbertas[freq]
                const alertas = itens.filter(x => x.dem.dias?.includes(hojeAbrev) && !feitoNoPeriodo(x.dem) && x.dem.texto.trim()).length
                // sem overflow:hidden no card — senão os menus "Dias" e "Mover para..." são cortados
                return (
                  <div key={freq} style={{ border: `1.5px solid ${completo ? '#bbf7d0' : alertas > 0 ? '#fca5a5' : '#e8e6e0'}`, borderRadius: 12, marginBottom: 10, background: '#fff' }}>
                    <button onClick={() => setSecoesAbertas(s => ({ ...s, [freq]: !aberto }))}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: 'none', borderRadius: aberto ? '11px 11px 0 0' : 11, background: completo ? '#ecfdf3' : fc.bg, cursor: 'pointer' }}>
                      <span style={{ width: 13, height: 13, borderRadius: 4, background: '#fff', border: `3.5px solid ${fc.bd}`, flexShrink: 0 }} />
                      <span style={{ fontWeight: 900, fontSize: 13.5, color: fc.txt, letterSpacing: '.5px' }}>{freq.toUpperCase()}</span>
                      {alertas > 0 && <span style={{ background: '#dc2626', color: '#fff', borderRadius: 10, padding: '2px 9px', fontSize: 10.5, fontWeight: 900, flexShrink: 0 }}>⚠ {alertas} de hoje</span>}
                      <span style={{ flex: 1 }} />
                      <span style={{ fontSize: 13, fontWeight: 900, color: completo ? '#16a34a' : fc.txt }}>{completo ? '✓ ' : ''}{ok}/{itens.length}</span>
                      <ChevronDown size={17} color={fc.txt} style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
                    </button>
                    {aberto && (
                      // Lista com rolagem própria (barra visível para arrastar com o mouse) —
                      // os menus Dias/Mover são fixos na tela, então não são cortados por ela
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, maxHeight: '62vh', overflowY: 'auto' }}>
                        {itens.map(({ dem, di }) => <Fragment key={dem.id}>{LinhaDemanda({ dem, di })}</Fragment>)}
                        {!soLeitura && <button onClick={() => addDemanda(catSel, freq)} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: `1px dashed ${fc.bd}`, background: fc.bg, color: fc.txt, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}><Plus size={13} /> Adicionar em {freq}</button>}
                      </div>
                    )}
                  </div>
                )
              })}

              {!soLeitura && <button onClick={() => addDemanda(catSel)} style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px dashed #d0cdc7', background: '#faf9f7', color: '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Plus size={14} /> Adicionar demanda</button>}
            </div>
          )}

          {/* ── MODO ROTEIRO (Fazer): guia limpo, rotina fixa no topo, feitos descem ── */}
          {cat && (modo === 'fazer' || soLeitura) && (() => {
            const todos = cat.demandas.map((dem, di) => ({ dem, di })).filter(x => x.dem.texto.trim())
            // pendentes primeiro; dentro disso, ordena por dia do mês (7, 15, 16…)
            const feitosDescem = (arr: { dem: Demanda; di: number }[]) => [...arr].sort((a, b) =>
              (Number(feitoNoPeriodo(a.dem)) - Number(feitoNoPeriodo(b.dem))) || (diaDoMes(a.dem) - diaDoMes(b.dem)))
            const fixas = feitosDescem(todos.filter(x => x.dem.fixa))
            const porFreq = FREQUENCIAS.map(freq => ({ freq, itens: feitosDescem(todos.filter(x => !x.dem.fixa && x.dem.freq === freq)) })).filter(g => g.itens.length)
            const proximo = [...fixas, ...porFreq.flatMap(g => g.itens)].find(x => !feitoNoPeriodo(x.dem))
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Route size={17} color="#5b4fcf" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#5b4fcf' }}>{cat.nome}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>siga a ordem e marque conforme faz</span>
                </div>

                {fixas.length > 0 && (
                  <div style={{ background: '#fff', border: '1.5px solid #d8d4f0', borderRadius: 12, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Star size={16} color="#f59e0b" fill="#f59e0b" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a1a' }}>Rotina fixa</span>
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>o essencial, sempre nesta ordem</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {fixas.map((x, idx) => <Fragment key={x.dem.id}>{LinhaRoteiro({ dem: x.dem, di: x.di, numero: idx + 1 })}</Fragment>)}
                    </div>
                  </div>
                )}

                {proximo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff7ed', border: '1px solid #fcd34d', borderRadius: 12, padding: '11px 14px' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 900, color: '#b45309', background: '#fef3c7', borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>PRÓXIMO</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{proximo.dem.texto}</span>
                    {!soLeitura && <button onClick={() => toggleFeito(catSel, proximo.di)} style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>Marcar feito</button>}
                  </div>
                )}

                {porFreq.map(({ freq, itens }) => {
                  const fc = FREQ_COR[freq]
                  const ok = itens.filter(x => feitoNoPeriodo(x.dem)).length
                  const completo = ok === itens.length
                  const aberto = secoesAbertas[freq] !== false
                  return (
                    <div key={freq} style={{ border: `1.5px solid ${completo ? '#bbf7d0' : '#e8e6e0'}`, borderRadius: 12, background: '#fff' }}>
                      <button onClick={() => setSecoesAbertas(s => ({ ...s, [freq]: !aberto }))}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: 'none', borderRadius: aberto ? '11px 11px 0 0' : 11, background: completo ? '#ecfdf3' : fc.bg, cursor: 'pointer' }}>
                        <span style={{ width: 11, height: 11, borderRadius: 4, background: '#fff', border: `3px solid ${fc.bd}`, flexShrink: 0 }} />
                        <span style={{ fontWeight: 900, fontSize: 13, color: fc.txt, letterSpacing: '.4px' }}>{freq.toUpperCase()}</span>
                        <span style={{ flex: 1 }} />
                        <span style={{ fontSize: 13, fontWeight: 900, color: completo ? '#16a34a' : fc.txt }}>{completo ? '✓ ' : ''}{ok}/{itens.length}</span>
                        <ChevronDown size={17} color={fc.txt} style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
                      </button>
                      {aberto && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10 }}>
                          {itens.map(x => <Fragment key={x.dem.id}>{LinhaRoteiro({ dem: x.dem, di: x.di })}</Fragment>)}
                        </div>
                      )}
                    </div>
                  )
                })}

                {todos.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13.5, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
                    Nenhuma demanda nesta categoria ainda.{!soLeitura && <> Use o modo <strong style={{ color: '#5b4fcf' }}>Editar</strong> para adicionar.</>}
                  </div>
                )}
              </div>
            )
          })()}
        </>)}
      </div>

      <ConsolidadoDescontos open={descontoOpen} onClose={() => setDescontoOpen(false)} />
    </div>
  )
}

// Campo de texto que cresce com o conteúdo e quebra linha (demandas grandes não cortam)
function AutoTextarea({ value, onChange, feito, readOnly }: { value: string; onChange: (v: string) => void; feito: boolean; readOnly?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }, [value])
  return <textarea ref={ref} value={value} readOnly={readOnly} onChange={e => onChange(e.target.value)} placeholder="Descreva a demanda" rows={1}
    style={{ width: '100%', border: '1px solid transparent', borderRadius: 4, padding: '6px 8px', fontSize: 13, background: 'transparent', outline: 'none', resize: 'none', overflow: 'hidden', lineHeight: 1.4, fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word', textDecoration: feito ? 'line-through' : 'none', color: feito ? '#6b7280' : '#1a1a1a' }} />
}

function btnNav(ativo: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, background: ativo ? '#5b4fcf' : 'transparent', border: '1px solid ' + (ativo ? '#5b4fcf' : '#d0cdc7'), borderRadius: 8, padding: '6px 12px', color: ativo ? '#fff' : '#6b6860', cursor: 'pointer', fontSize: 13 }
}

// Botões da linha de ações do celular (pílulas com fundo branco)
function btnMob(ativo: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: ativo ? '#5b4fcf' : '#fff', border: '1px solid ' + (ativo ? '#5b4fcf' : '#e0ddd8'), borderRadius: 10, padding: '10px 10px', color: ativo ? '#fff' : '#4b5563', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, minWidth: 0 }
}
