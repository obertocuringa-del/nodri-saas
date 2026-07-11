'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, MessageCircle, Trash2, X, Clock, AlertTriangle, DollarSign, Users, Check, Loader2, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'

const moeda = (v: number) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Horários de 30 em 30 min (07:00 às 21:00) pra escolher em vez de digitar.
const HORARIOS_ESPERA: string[] = (() => {
  const out: string[] = []
  for (let h = 7; h <= 21; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 21) out.push(`${String(h).padStart(2, '0')}:30`)
  }
  return out
})()

interface Servico { nome: string; preco: number }
interface Item {
  id: string; cliente_nome: string; telefone?: string; servicos: Servico[]
  data_desejada?: string; horario_desejado?: string; categoria: string; status: string
  observacao?: string; criado_em: string; atendida_em?: string
}

const STATUS = [
  { id: 'aguardando', label: 'Aguardando', cor: '#5b4fcf' },
  { id: 'contatada', label: 'Contatada', cor: '#0891b2' },
  { id: 'remarcada', label: 'Remarcada', cor: '#d97706' },
  { id: 'atendida', label: 'Atendida', cor: '#16a34a' },
  { id: 'perdida', label: 'Perdida', cor: '#9ca3af' },
]
const statusInfo = (s: string) => STATUS.find(x => x.id === s) || STATUS[0]
const ativo = (s: string) => s === 'aguardando' || s === 'contatada' || s === 'remarcada'

// Cor pela urgência (tempo na fila) — só para itens ativos
function urgencia(horas: number) {
  if (horas < 24) return { cor: '#16a34a', bg: '#f0fdf4', label: 'Seguro' }
  if (horas < 48) return { cor: '#d97706', bg: '#fffbeb', label: 'Atenção' }
  if (horas < 72) return { cor: '#ea580c', bg: '#fff7ed', label: 'Risco de perda' }
  return { cor: '#dc2626', bg: '#fef2f2', label: 'Quase perdido' }
}
function tempoFila(criadoEm: string): { horas: number; texto: string } {
  const h = Math.max(0, (Date.now() - new Date(criadoEm).getTime()) / 3600000)
  if (h < 1) return { horas: h, texto: 'agora há pouco' }
  if (h < 24) return { horas: h, texto: `${Math.floor(h)}h na fila` }
  return { horas: h, texto: `${Math.floor(h / 24)}d ${Math.floor(h % 24)}h na fila` }
}
const totalServ = (s: Servico[]) => (s || []).reduce((a, x) => a + (Number(x.preco) || 0), 0)
const primeiroNome = (n: string) => (n || '').trim().split(/\s+/)[0]
const normTxt = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

export default function ListaEsperaPage() {
  const router = useRouter()
  const [lista, setLista] = useState<Item[]>([])
  const [servicosCat, setServicosCat] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'ativas' | 'espera' | 'nao_agendada' | 'finalizadas'>('ativas')
  const [modal, setModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  // form
  const [fNome, setFNome] = useState('')
  const [fTel, setFTel] = useState('')
  const [fServs, setFServs] = useState<Servico[]>([])
  const [fData, setFData] = useState('')
  const [fHora, setFHora] = useState('')
  const [fCat, setFCat] = useState('espera')
  const [fObs, setFObs] = useState('')
  const [buscaServ, setBuscaServ] = useState('')

  const carregar = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        fetch('/api/salon/lista-espera').then(r => r.ok ? r.json() : { lista: [] }).catch(() => ({ lista: [] })),
        fetch('/api/servicos').then(r => r.ok ? r.json() : []).catch(() => []),
      ])
      const lst = a.lista || []
      setLista(lst)
      try { localStorage.setItem('nodri_lista_espera', JSON.stringify(lst)) } catch { /* */ }
      const srv = Array.isArray(b) ? b.filter((s: any) => s.ativo !== false) : []
      setServicosCat(srv)
      try { localStorage.setItem('nodri_servicos_cache', JSON.stringify(srv)) } catch { /* */ }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])
  useEffect(() => {
    // Mostra o cache na hora (sem espera) e atualiza em segundo plano
    try {
      const c = localStorage.getItem('nodri_lista_espera'); if (c) { setLista(JSON.parse(c)); setLoading(false) }
      const s = localStorage.getItem('nodri_servicos_cache'); if (s) setServicosCat(JSON.parse(s))
    } catch { /* */ }
    carregar()
  }, [carregar])

  function limparForm() { setEditId(null); setFNome(''); setFTel(''); setFServs([]); setFData(''); setFHora(''); setFCat('espera'); setFObs(''); setBuscaServ('') }

  function abrirEdicao(it: Item) {
    setEditId(it.id)
    setFNome(it.cliente_nome || '')
    setFTel(it.telefone || '')
    setFServs(Array.isArray(it.servicos) ? it.servicos : [])
    setFData(it.data_desejada ? String(it.data_desejada).slice(0, 10) : '')
    setFHora(it.horario_desejado || '')
    setFCat(it.categoria || 'espera')
    setFObs(it.observacao || '')
    setModal(true)
  }

  async function salvar() {
    if (!fNome.trim()) { toast.error('Informe o nome da cliente'); return }
    setSalvando(true)
    try {
      const dados = { cliente_nome: fNome, telefone: fTel, servicos: fServs, data_desejada: fData || null, horario_desejado: fHora, categoria: fCat, observacao: fObs }
      const res = editId
        ? await fetch('/api/salon/lista-espera', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, ...dados }) })
        : await fetch('/api/salon/lista-espera', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d?.error || 'Erro ao salvar'); setSalvando(false); return }
      const saved = await res.json().catch(() => null)
      toast.success(editId ? 'Alterações salvas!' : 'Cliente adicionada à fila!')
      // Atualização instantânea na tela (sem esperar o recarregamento pesado)
      if (saved && saved.id) setLista(prev => editId ? prev.map(x => x.id === saved.id ? saved : x) : [...prev, saved])
      limparForm(); setModal(false); setSalvando(false)
      carregar() // sincroniza em segundo plano
      return
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  async function atualizar(id: string, patch: any) {
    // Atualização instantânea na tela; sincroniza em segundo plano
    setLista(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x))
    try {
      const res = await fetch('/api/salon/lista-espera', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) })
      if (!res.ok) { toast.error('Erro'); carregar(); return }
      carregar()
    } catch { toast.error('Erro de conexão') }
  }

  async function excluir(id: string) {
    if (!confirm('Remover esta cliente da lista de espera?')) return
    try { await fetch('/api/salon/lista-espera?id=' + id, { method: 'DELETE' }); await carregar() } catch { /* */ }
  }

  function chamarWhats(it: Item) {
    const fone = String(it.telefone || '').replace(/\D/g, '')
    if (!fone) { toast.error('Cliente sem telefone'); return }
    const numero = fone.startsWith('55') ? fone : '55' + fone
    const msg = `Olá *${primeiroNome(it.cliente_nome)}*! 💛 Surgiu um horário disponível para você${it.servicos?.length ? ' (' + it.servicos.map(s => s.nome).join(', ') + ')' : ''}. Deseja confirmar?`
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank')
    if (it.status === 'aguardando') atualizar(it.id, { status: 'contatada' })
  }

  function precoServ(s: any) { return Number(s?.preco_fixo) || Number(s?.preco_min) || 0 }
  function addServ(nome: string) {
    if (!nome) return
    const s = servicosCat.find((x: any) => x.nome === nome)
    if (!s) return
    if (fServs.some(x => x.nome === s.nome)) return
    setFServs(p => [...p, { nome: s.nome, preco: precoServ(s) }])
    setBuscaServ('')
  }

  // Métricas (só itens ativos)
  const ativos = lista.filter(i => ativo(i.status))
  const receitaFila = ativos.reduce((a, i) => a + totalServ(i.servicos), 0)
  const emRisco = ativos.filter(i => tempoFila(i.criado_em).horas >= 48).length

  // Filtro de exibição
  const exibidos = lista.filter(i => {
    if (filtro === 'ativas') return ativo(i.status)
    if (filtro === 'espera') return ativo(i.status) && i.categoria === 'espera'
    if (filtro === 'nao_agendada') return ativo(i.status) && i.categoria === 'nao_agendada'
    if (filtro === 'finalizadas') return !ativo(i.status)
    return true
  }).sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())

  const card = (icon: any, label: string, valor: string, cor: string) => (
    <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '14px 16px', flex: '1 1 150px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6b6860', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>{icon}{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor }}>{valor}</div>
    </div>
  )

  return (
    <div className="nodri-salon-bg" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <nav style={{ background: '#faf9f7', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}>
          <ArrowLeft size={16} /> Voltar
        </button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}>📋 Lista de Espera</span>
        <button onClick={() => { limparForm(); setModal(true) }}
          style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#0891b2,#5b4fcf)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={15} /> Nova
        </button>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
        {/* Métricas */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          {card(<DollarSign size={13} />, 'Receita em fila', moeda(receitaFila), '#16a34a')}
          {card(<Users size={13} />, 'Aguardando', String(ativos.length), '#5b4fcf')}
          {card(<AlertTriangle size={13} />, 'Em risco (+48h)', String(emRisco), emRisco > 0 ? '#dc2626' : '#9ca3af')}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {([['ativas', 'Ativas'], ['espera', '🟡 Lista de Espera'], ['nao_agendada', '🔴 Não Agendada'], ['finalizadas', 'Finalizadas']] as const).map(([id, lbl]) => (
            <button key={id} onClick={() => setFiltro(id)}
              style={{ padding: '7px 13px', borderRadius: 20, border: filtro === id ? '1.5px solid #0891b2' : '1.5px solid #e0ddd8', background: filtro === id ? '#ecfeff' : '#fff', color: filtro === id ? '#0891b2' : '#6b6860', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {lbl}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 size={26} className="animate-spin" style={{ color: '#0891b2' }} /></div>
        ) : exibidos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#9ca3af', fontSize: 14 }}>
            {filtro === 'finalizadas' ? 'Nenhuma cliente finalizada ainda.' : 'Nenhuma cliente na fila. Clique em "Nova" para adicionar.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {exibidos.map(it => {
              const ativa = ativo(it.status)
              const t = tempoFila(it.criado_em)
              const u = urgencia(t.horas)
              const si = statusInfo(it.status)
              const borda = ativa ? u.cor : '#e0ddd8'
              const fundo = ativa ? u.bg : '#fff'
              return (
                <div key={it.id} style={{ background: fundo, border: `1px solid ${borda}`, borderLeft: `5px solid ${borda}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}>{it.cliente_nome}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: si.cor, background: si.cor + '18', padding: '2px 8px', borderRadius: 20 }}>{si.label.toUpperCase()}</span>
                      </div>
                      {it.telefone && <div style={{ fontSize: 12, color: '#0891b2', marginTop: 2 }}>📱 {it.telefone}</div>}
                      {it.servicos?.length > 0 && (
                        <div style={{ fontSize: 12, color: '#374151', marginTop: 5 }}>
                          💅 {it.servicos.map(s => s.nome).join(' + ')}
                          {totalServ(it.servicos) > 0 && <strong style={{ color: '#16a34a' }}> · {moeda(totalServ(it.servicos))}</strong>}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6, fontSize: 11, color: '#6b6860' }}>
                        {it.data_desejada && <span>📅 {it.data_desejada.split('-').reverse().join('/')}{it.horario_desejado ? ' ' + it.horario_desejado : ''}</span>}
                        {ativa && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: u.cor, fontWeight: 700 }}><Clock size={11} /> {t.texto} · {u.label}</span>}
                        {!ativa && it.atendida_em && it.status === 'atendida' && <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ baixada automaticamente</span>}
                      </div>
                      {it.observacao && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' }}>{it.observacao}</div>}
                    </div>
                    {/* Ações */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
                      {ativa && (
                        <button onClick={() => chamarWhats(it)}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          <MessageCircle size={13} /> Chamar
                        </button>
                      )}
                      <select value={it.status} onChange={e => atualizar(it.id, { status: e.target.value })}
                        style={{ padding: '6px 8px', borderRadius: 8, border: '1.5px solid #e0ddd8', fontSize: 12, color: '#374151', background: '#fff', cursor: 'pointer' }}>
                        {STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => abrirEdicao(it)} title="Editar"
                          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px 8px', borderRadius: 8, border: '1px solid #e0ddd8', background: '#fff', color: '#5b4fcf', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          <Pencil size={12} /> Editar
                        </button>
                        <button onClick={() => excluir(it.id)} title="Remover"
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px 8px', borderRadius: 8, border: '1px solid #f0dede', background: '#fff', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 18 }}>
          💡 Quando você reimportar os atendimentos, quem já foi atendida sai da fila automaticamente.
        </p>
      </div>

      {/* Modal nova cliente */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>{editId ? 'Editar cliente' : 'Adicionar à lista de espera'}</h3>
              <button onClick={() => setModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 4 }}>👤 Nome da cliente *</label>
            <input value={fNome} onChange={e => setFNome(e.target.value)} placeholder="Ex: Maria Silva"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 14, marginBottom: 12 }} />

            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 4 }}>📱 Telefone (WhatsApp)</label>
            <input value={fTel} onChange={e => setFTel(e.target.value)} placeholder="(00) 00000-0000"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 14, marginBottom: 12 }} />

            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 4 }}>💅 Serviços desejados</label>
            {servicosCat.length === 0 ? (
              <div style={{ fontSize: 11, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px', marginBottom: 12 }}>
                Nenhum serviço cadastrado. Cadastre na aba <strong>Serviços</strong> para escolher aqui.
              </div>
            ) : (
              <div style={{ position: 'relative', marginBottom: fServs.length ? 8 : 12 }}>
                <input value={buscaServ} onChange={e => setBuscaServ(e.target.value)} placeholder="🔍 Digite para buscar o serviço…"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 14 }} />
                {buscaServ.trim() && (() => {
                  const achados = servicosCat.filter((s: any) => normTxt(s.nome).includes(normTxt(buscaServ)) && !fServs.some(x => x.nome === s.nome)).slice(0, 12)
                  return (
                    <div style={{ position: 'absolute', top: '104%', left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.15)', maxHeight: 230, overflowY: 'auto' }}>
                      {achados.length === 0 ? <div style={{ padding: 12, fontSize: 12, color: '#9ca3af' }}>Nenhum serviço encontrado.</div> :
                        achados.map((s: any) => <button key={s.id} onClick={() => addServ(s.nome)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }} onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{s.nome}{precoServ(s) ? ` — ${moeda(precoServ(s))}` : ''}</button>)}
                    </div>
                  )
                })()}
              </div>
            )}
            {fServs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {fServs.map((s, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0eefb', color: '#5b4fcf', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
                    {s.nome}{s.preco > 0 ? ` (${moeda(s.preco)})` : ''}
                    <button onClick={() => setFServs(p => p.filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#5b4fcf', display: 'flex' }}><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 4 }}>📅 Data desejada</label>
                <input type="date" value={fData} onChange={e => setFData(e.target.value)}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 4 }}>⏰ Horário</label>
                <select value={fHora} onChange={e => setFHora(e.target.value)}
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, background: '#fff' }}>
                  <option value="">Selecione...</option>
                  {fHora && !HORARIOS_ESPERA.includes(fHora) && <option value={fHora}>{fHora}</option>}
                  {HORARIOS_ESPERA.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 4 }}>🏷 Categoria</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {([['espera', '🟡 Lista de Espera'], ['nao_agendada', '🔴 Não Agendada']] as const).map(([id, lbl]) => (
                <button key={id} onClick={() => setFCat(id)}
                  style={{ flex: 1, padding: '9px', borderRadius: 8, border: fCat === id ? '2px solid #0891b2' : '1.5px solid #d0cdc7', background: fCat === id ? '#ecfeff' : '#fff', color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{lbl}</button>
              ))}
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 4 }}>Observação (opcional)</label>
            <textarea value={fObs} onChange={e => setFObs(e.target.value)} rows={2}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', marginBottom: 16 }} />

            <button onClick={salvar} disabled={salvando || !fNome.trim()}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: (!fNome.trim() || salvando) ? '#d1d5db' : 'linear-gradient(135deg,#0891b2,#5b4fcf)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: (!fNome.trim() || salvando) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {salvando ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : <><Check size={16} /> {editId ? 'Salvar alterações' : 'Adicionar à fila'}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
