'use client'
import { useState, useEffect, useMemo, CSSProperties } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Check, Trash2, CornerUpRight, Wallet, X, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import BoletosFinanceiro from '@/components/salon/BoletosFinanceiro'
import ComportamentoProfissional from '@/components/salon/ComportamentoProfissional'

interface Prof { id: string; nome_completo: string; apelido?: string; cargo?: string; ativo?: boolean; is_departamento?: boolean; departamento_cor?: string }
interface Emprestimo { valor: number; motivo: string; status: 'pendente' | 'negado' | 'liberado'; motivoNegado?: string; modo?: string; parcelas?: { valor: number; data: string; label: string }[]; liberadoEm?: string }
interface Demanda {
  id: string; profissional_id: string; mensagem: string; data_limite: string | null
  resolvido: boolean; resolvido_em: string | null; criado_em: string
  solicitante_id?: string | null; solicitante_nome?: string | null
  resposta?: string | null; prioridade?: string | null; origem?: string | null
  tipo?: string | null; emprestimo?: Emprestimo | null
  situacao?: string | null; prazo?: string | null
  conversa?: { id: string; em: number; autor: string; lado: string; texto: string; situacao?: string | null; prazo?: string | null }[] | null
}

// Situação da pendência: diz de quem é a bola. 'aberta' é o estado de quem
// chegou e ninguém tocou ainda — por isso nem tem selo.
function SIT_COR(sit?: string | null) {
  switch (sit) {
    case 'andamento':  return { c: '#1d4ed8', bg: '#eff6ff' }
    case 'aguardando': return { c: '#b45309', bg: '#fffbeb' }
    case 'agendada':   return { c: '#6b21a8', bg: '#f5f3ff' }
    case 'resolvida':  return { c: '#047857', bg: '#ecfdf5' }
    case 'recusada':   return { c: '#b91c1c', bg: '#fef2f2' }
    default:           return { c: '#6b6860', bg: '#f5f4f0' }
  }
}
function SIT_LABEL(sit?: string | null, prazo?: string | null) {
  const d = prazo ? String(prazo).slice(0, 10).split('-').reverse().join('/') : ''
  switch (sit) {
    case 'andamento':  return 'EM ANDAMENTO'
    case 'aguardando': return 'AGUARDANDO QUEM PEDIU'
    case 'agendada':   return d ? `AGENDADA P/ ${d}` : 'AGENDADA'
    case 'resolvida':  return 'RESOLVIDA'
    case 'recusada':   return 'NÃO SERÁ FEITA'
    default:           return ''
  }
}

function iconeDe(nome: string) {
  return nome === 'ADMINISTRATIVO' ? '🗂️' : nome === 'FINANCEIRO' ? '💰' : nome === 'RECEPÇÃO' ? '🛎️' : nome === 'GERÊNCIA' ? '🏢' : '🏢'
}

export default function DepartamentoPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [dep, setDep] = useState<Prof | null>(null)
  const [profs, setProfs] = useState<Prof[]>([])
  const [demandas, setDemandas] = useState<Demanda[]>([])
  const [loading, setLoading] = useState(true)
  const [ehDono, setEhDono] = useState(false)   // só o salão principal exclui/transfere
  // Qual lista está aberta embaixo dos contadores (null = tudo recolhido)
  // Tudo fechado ao abrir a página — o usuário escolhe o que quer ver
  const [secao, setSecao] = useState<'abertas' | 'resolvidas' | 'total' | null>(null)
  const [verDia, setVerDia] = useState(false)  // lista do dia também começa fechada

  // Resolver com resposta
  const [respondendo, setRespondendo] = useState<string | null>(null)
  const [respostaTxt, setRespostaTxt] = useState('')
  // Transferir
  const [transferindo, setTransferindo] = useState<string | null>(null)
  const [destino, setDestino] = useState('')
  // Conversa da pendência (quem pediu x quem recebeu)
  const [conversando, setConversando] = useState<string | null>(null)
  const [msgTxt, setMsgTxt] = useState('')
  const [msgSit, setMsgSit] = useState('andamento')
  const [msgPrazo, setMsgPrazo] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)

  async function enviarMensagem(d: Demanda) {
    if (!msgTxt.trim() && !msgSit) { toast.error('Escreva algo ou escolha a situação'); return }
    if (msgSit === 'agendada' && !msgPrazo) { toast.error('Escolha a data prometida'); return }
    setEnviandoMsg(true)
    try {
      const res = await fetch(`/api/pendencias/${d.id}/conversa`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: msgTxt.trim(), situacao: msgSit, prazo: msgPrazo }),
      })
      if (res.ok) {
        const at = await res.json()
        setDemandas(prev => prev.map(x => x.id === d.id ? { ...x, ...at } : x))
        setMsgTxt(''); setMsgPrazo('')
        toast.success(d.solicitante_id ? 'Enviado — quem pediu foi avisado' : 'Registrado')
      } else {
        const e = await res.json().catch(() => ({}))
        toast.error(e.error || 'Não foi possível enviar')
      }
    } catch { toast.error('Erro de conexão') }
    setEnviandoMsg(false)
  }

  async function carregar() {
    try {
      const [profList, pend, me] = await Promise.all([
        fetch('/api/profissionais').then(r => r.ok ? r.json() : []),
        fetch(`/api/pendencias?profissional_id=${id}`).then(r => r.ok ? r.json() : []),
        fetch('/api/auth/me').then(r => r.ok ? r.json() : null).catch(() => null),
      ])
      const lista: Prof[] = Array.isArray(profList) ? profList : []
      setProfs(lista)
      setDep(lista.find(p => p.id === id) || null)
      setDemandas(Array.isArray(pend) ? pend : [])
      setEhDono(me?.role === 'salon')
    } catch { toast.error('Erro ao carregar') }
    setLoading(false)
  }
  useEffect(() => { carregar() }, [id])

  const departamentos = useMemo(() => profs.filter(p => p.is_departamento && p.id !== id), [profs, id])
  const profissionais = useMemo(() => profs.filter(p => !p.is_departamento && p.ativo !== false), [profs])

  // Pedidos de empréstimo pendentes vão sempre no topo (urgência do financeiro)
  const pesoTopo = (d: Demanda) => (d.tipo === 'emprestimo' && d.emprestimo?.status === 'pendente' ? 0 : d.prioridade === 'urgente' ? 1 : 2)
  const abertas = demandas.filter(d => !d.resolvido).sort((a, b) => pesoTopo(a) - pesoTopo(b))
  const resolvidas = demandas.filter(d => d.resolvido)

  // Pendências do dia: o que vence hoje, o que já venceu e os pedidos de
  // empréstimo esperando resposta — o que não pode passar batido hoje.
  const hojeISO = (() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}` })()
  const doDia = abertas.filter(d =>
    (d.tipo === 'emprestimo' && d.emprestimo?.status === 'pendente') ||
    (!!d.data_limite && String(d.data_limite).slice(0, 10) <= hojeISO)
  )

  async function resolver(d: Demanda) {
    const res = await fetch(`/api/pendencias/${d.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolvido: true, resposta: respostaTxt.trim() || undefined }),
    })
    if (res.ok) {
      const at = await res.json()
      setDemandas(prev => prev.map(x => x.id === d.id ? { ...x, ...at } : x))
      setRespondendo(null); setRespostaTxt('')
      toast.success(d.solicitante_id ? 'Resolvida! O solicitante foi avisado.' : 'Resolvida!')
    } else toast.error('Erro ao resolver')
  }

  async function reabrir(d: Demanda) {
    const res = await fetch(`/api/pendencias/${d.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolvido: false }) })
    if (res.ok) { const at = await res.json(); setDemandas(prev => prev.map(x => x.id === d.id ? { ...x, ...at } : x)); toast.success('Reaberta') }
    else toast.error('Erro')
  }

  async function excluir(d: Demanda) {
    if (!confirm('Excluir esta demanda?')) return
    const res = await fetch(`/api/pendencias/${d.id}`, { method: 'DELETE' })
    if (res.ok) { setDemandas(prev => prev.filter(x => x.id !== d.id)); toast.success('Excluída') }
    else toast.error('Erro ao excluir')
  }

  async function transferir(d: Demanda) {
    if (!destino) { toast.error('Escolha o destino'); return }
    const res = await fetch(`/api/pendencias/${d.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profissional_id: destino }) })
    if (res.ok) {
      setDemandas(prev => prev.filter(x => x.id !== d.id)) // saiu deste setor
      setTransferindo(null); setDestino('')
      const alvo = profs.find(p => p.id === destino)
      toast.success(`Transferida para ${alvo?.nome_completo || 'destino'}`)
    } else toast.error('Erro ao transferir')
  }

  const cor = dep?.departamento_cor || '#5b4fcf'
  // O bloco de boletos vive só no setor financeiro (é lá que se paga conta)
  const ehFinanceiro = (dep?.nome_completo || '').trim().toUpperCase().includes('FINANCEIRO')

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf9f7' }}><Loader2 className="animate-spin" style={{ color: '#5b4fcf' }} /></div>

  function DemandaCard({ d }: { d: Demanda }) {
    if (d.tipo === 'emprestimo') return <EmprestimoCard d={d} onDone={carregar} />
    const urgente = d.prioridade === 'urgente'
    const vencida = !d.resolvido && d.data_limite && new Date(d.data_limite + 'T23:59:59') < new Date()
    return (
      <div style={{ background: '#fff', border: `1px solid ${d.resolvido ? '#d1fae5' : urgente ? '#fecaca' : '#e8e6e0'}`, borderLeft: `4px solid ${d.resolvido ? '#22c55e' : urgente ? '#ef4444' : cor}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          {d.origem === 'solicitacao' && d.solicitante_nome && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#5b4fcf', background: '#f0eefb', padding: '2px 8px', borderRadius: 999 }}>👤 {d.solicitante_nome}</span>
          )}
          {urgente && !d.resolvido && <span style={{ fontSize: 10, fontWeight: 800, color: '#b91c1c', background: '#fef2f2', padding: '2px 8px', borderRadius: 999 }}>URGENTE</span>}
          {d.situacao && d.situacao !== 'aberta' && (
            <span style={{ fontSize: 10, fontWeight: 800, color: SIT_COR(d.situacao).c, background: SIT_COR(d.situacao).bg, padding: '2px 8px', borderRadius: 999 }}>{SIT_LABEL(d.situacao, d.prazo)}</span>
          )}
          {d.resolvido && <span style={{ fontSize: 10, fontWeight: 800, color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: 999 }}>RESOLVIDA</span>}
          {vencida && <span style={{ fontSize: 10, fontWeight: 800, color: '#b91c1c', background: '#fef2f2', padding: '2px 8px', borderRadius: 999 }}>VENCIDA</span>}
          <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 'auto' }}>{new Date(d.criado_em).toLocaleDateString('pt-BR')}</span>
        </div>
        <p style={{ fontSize: 13.5, color: '#1a1a1a', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{d.mensagem}</p>
        {d.resposta && <p style={{ fontSize: 12, color: '#047857', margin: '8px 0 0', background: '#f0fdf4', padding: '6px 10px', borderRadius: 8 }}>💬 {d.resposta}</p>}

        {/* Resolver com resposta */}
        {respondendo === d.id ? (
          <div style={{ marginTop: 10 }}>
            <textarea value={respostaTxt} onChange={e => setRespostaTxt(e.target.value)} rows={2} autoFocus placeholder="Resposta (opcional) — vai na notificação do solicitante"
              style={{ width: '100%', border: '1px solid #c9c4f0', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', resize: 'none' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={() => resolver(d)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Concluir</button>
              <button onClick={() => { setRespondendo(null); setRespostaTxt('') }} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        ) : transferindo === d.id ? (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={destino} onChange={e => setDestino(e.target.value)} style={{ flex: 1, minWidth: 180, border: '1px solid #c9c4f0', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}>
              <option value="">Transferir para…</option>
              <optgroup label="── Setores ──">
                {departamentos.map(p => <option key={p.id} value={p.id}>{iconeDe(p.nome_completo)} {p.nome_completo}</option>)}
              </optgroup>
              <optgroup label="── Profissionais ──">
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.apelido || p.nome_completo}{p.cargo ? ` — ${p.cargo}` : ''}</option>)}
              </optgroup>
            </select>
            <button onClick={() => transferir(d)} style={{ background: cor, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Transferir</button>
            <button onClick={() => { setTransferindo(null); setDestino('') }} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {!d.resolvido && <button onClick={() => { setRespondendo(d.id); setRespostaTxt(''); setTransferindo(null) }} style={btn('#16a34a')}><Check size={13} /> Feito / Responder</button>}
            <button onClick={() => { setConversando(conversando === d.id ? null : d.id); setMsgTxt(''); setMsgSit(d.situacao && d.situacao !== 'aberta' ? d.situacao : 'andamento'); setMsgPrazo(d.prazo || ''); setRespondendo(null); setTransferindo(null) }}
              style={{ ...btnGhost(), color: '#5b4fcf', borderColor: '#c9c4f0' }}>
              💬 Conversar{(d.conversa?.length || 0) > 0 ? ` (${d.conversa!.length})` : ''}
            </button>
            {!d.resolvido && ehDono && <button onClick={() => { setTransferindo(d.id); setDestino(''); setRespondendo(null) }} style={btn(cor)}><CornerUpRight size={13} /> Transferir</button>}
            {d.resolvido && ehDono && <button onClick={() => reabrir(d)} style={btnGhost()}>Reabrir</button>}
            {ehDono && <button onClick={() => excluir(d)} style={{ ...btnGhost(), color: '#dc2626', marginLeft: 'auto' }}><Trash2 size={13} /></button>}
          </div>
        )}

        {/* Conversa: histórico + resposta com situação */}
        {conversando === d.id && (
          <div style={{ marginTop: 12, borderTop: '1px solid #ede9e2', paddingTop: 12 }}>
            {(d.conversa?.length || 0) === 0 && (
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 10px' }}>Nenhuma mensagem ainda. Escreva abaixo o que está acontecendo com esta pendência.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: 260, overflowY: 'auto' }}>
              {(d.conversa || []).map(m => {
                const doSetor = m.lado !== 'solicitante'
                return (
                  <div key={m.id} style={{ alignSelf: doSetor ? 'flex-end' : 'flex-start', maxWidth: '86%',
                    background: doSetor ? '#f0eefb' : '#f5f4f0', border: `1px solid ${doSetor ? '#ddd6f5' : '#e8e6e0'}`,
                    borderRadius: 12, padding: '8px 11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: doSetor ? '#5b4fcf' : '#6b6860' }}>{m.autor}</span>
                      {m.situacao && <span style={{ fontSize: 9.5, fontWeight: 800, color: SIT_COR(m.situacao).c, background: SIT_COR(m.situacao).bg, padding: '1px 7px', borderRadius: 999 }}>{SIT_LABEL(m.situacao, m.prazo)}</span>}
                      <span style={{ fontSize: 9.5, color: '#9ca3af', marginLeft: 'auto' }}>{new Date(m.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {m.texto && <p style={{ fontSize: 12.5, color: '#374151', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.texto}</p>}
                  </div>
                )
              })}
            </div>

            <textarea value={msgTxt} onChange={e => setMsgTxt(e.target.value)} rows={2}
              placeholder="Escreva o que falta, o que já foi feito ou até quando resolve…"
              style={{ width: '100%', border: '1px solid #c9c4f0', borderRadius: 10, padding: '9px 11px', fontSize: 13, outline: 'none', resize: 'none' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={msgSit} onChange={e => setMsgSit(e.target.value)}
                style={{ border: '1px solid #dedad4', borderRadius: 8, padding: '7px 9px', fontSize: 12.5, fontWeight: 700, background: '#fff', cursor: 'pointer' }}>
                <option value="andamento">Estou resolvendo</option>
                <option value="aguardando">Aguardando quem pediu</option>
                <option value="agendada">Fica pra data…</option>
                <option value="resolvida">Resolvida</option>
                <option value="recusada">Não será feita</option>
              </select>
              {msgSit === 'agendada' && (
                <input type="date" value={msgPrazo} onChange={e => setMsgPrazo(e.target.value)}
                  style={{ border: '1px solid #dedad4', borderRadius: 8, padding: '7px 9px', fontSize: 12.5 }} />
              )}
              <button disabled={enviandoMsg} onClick={() => enviarMensagem(d)}
                style={{ ...btn('#5b4fcf'), marginLeft: 'auto', opacity: enviandoMsg ? .6 : 1 }}>
                {enviandoMsg ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7' }}>
      <nav style={{ background: '#fff', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/salon/profissionais')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Profissionais</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontSize: 22 }}>{dep ? iconeDe(dep.nome_completo) : '🏢'}</span>
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}>{dep?.nome_completo || 'Departamento'}</span>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
        {/* Fila de boletos — só no setor FINANCEIRO */}
        {ehFinanceiro && <BoletosFinanceiro cor={cor} />}

        {/* PENDÊNCIAS DO DIA — o que precisa de ação hoje fica em cima e sempre
            aberto; o resto vive nos contadores recolhíveis abaixo. */}
        {doDia.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            {/* Recolhível também: com a lista fechada, os contadores ficam
                logo abaixo, sem precisar rolar a página inteira. */}
            <button onClick={() => setVerDia(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: '#b91c1c', transform: verDia ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▼</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: .5 }}>
                🔔 Pendências do dia ({doDia.length})
              </span>
            </button>
            {verDia && doDia.map(d => <DemandaCard key={d.id} d={d} />)}
          </div>
        )}

        {/* Resumo — clicar abre a lista embaixo, clicar de novo recolhe */}
        <div className="nodri-cards-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
          {([
            { id: 'abertas' as const, l: 'Abertas', v: abertas.length, c: '#f59e0b' },
            { id: 'resolvidas' as const, l: 'Resolvidas', v: resolvidas.length, c: '#22c55e' },
            { id: 'total' as const, l: 'Total', v: demandas.length, c: cor },
          ]).map(x => {
            const ativo = secao === x.id
            return (
              <button key={x.l} onClick={() => setSecao(s => s === x.id ? null : x.id)}
                title={ativo ? 'Clique para recolher' : 'Clique para ver a lista'}
                style={{ background: ativo ? '#faf9f7' : '#fff', border: `1px solid ${ativo ? x.c : '#e8e6e0'}`, boxShadow: ativo ? `inset 0 0 0 1px ${x.c}40` : 'none', borderRadius: 12, padding: 12, textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>{x.l}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: x.c }}>{x.v}</div>
              </button>
            )
          })}
        </div>

        {!secao && demandas.length > 0 && (
          <p style={{ textAlign: 'center', fontSize: 11.5, color: '#9ca3af', margin: '0 0 8px' }}>Toque num dos cards acima para ver a lista.</p>
        )}

        {secao === 'abertas' && (abertas.length > 0 ? (<>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Abertas ({abertas.length})</p>
          {abertas.map(d => <DemandaCard key={d.id} d={d} />)}
        </>) : (
          <p style={{ textAlign: 'center', fontSize: 12.5, color: '#9ca3af', padding: '14px 0' }}>Sem pendências abertas. Tudo resolvido. 👏</p>
        ))}

        {secao === 'resolvidas' && (resolvidas.length > 0 ? (<>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: .5, margin: '0 0 8px' }}>Resolvidas ({resolvidas.length})</p>
          {resolvidas.map(d => <DemandaCard key={d.id} d={d} />)}
        </>) : (
          <p style={{ textAlign: 'center', fontSize: 12.5, color: '#9ca3af', padding: '14px 0' }}>Nada resolvido ainda.</p>
        ))}

        {secao === 'total' && (<>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: .5, margin: '0 0 8px' }}>Todas ({demandas.length})</p>
          {[...abertas, ...resolvidas].map(d => <DemandaCard key={d.id} d={d} />)}
        </>)}

        {demandas.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            <p style={{ margin: 0 }}>Sem pendências neste departamento.</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>As solicitações enviadas para cá aparecem aqui.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function btn(cor: string): CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, background: cor, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
}
function btnGhost(): CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', color: '#6b6860', border: '1px solid #e0ddd8', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
}

const fmtR = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
function parseNum(s: string): number {
  const n = Number(String(s || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}
const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const isoBR = (iso: string) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso }
function addMonths(d: Date, n: number) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }

// Card de pedido de empréstimo: aceitar/negar e, ao aceitar, parcelar por
// mês/quinzena com datas de débito. Ao liberar, o servidor lança na calculadora.
function EmprestimoCard({ d, onDone }: { d: Demanda; onDone: () => void }) {
  const emp = d.emprestimo || ({ valor: 0, motivo: '', status: 'pendente' } as Emprestimo)
  const total = Number(emp.valor) || 0
  const [fase, setFase] = useState<'idle' | 'negar' | 'aceitar'>('idle')
  const [motivoNegado, setMotivoNegado] = useState('')
  const [dividir, setDividir] = useState<boolean | null>(null)
  const [modo, setModo] = useState<'mes' | 'quinzena'>('mes')
  const [qtd, setQtd] = useState('2')
  const [parcelas, setParcelas] = useState<{ valor: string; data: string }[]>([])
  const [enviando, setEnviando] = useState(false)
  const [verComportamento, setVerComportamento] = useState(false)

  function gerar(n: number, m: 'mes' | 'quinzena') {
    const hoje = new Date()
    const cent = Math.round(total * 100)
    const base = Math.floor(cent / Math.max(1, n))
    const arr = Array(n).fill(base); arr[n - 1] = cent - base * (n - 1)
    setParcelas(arr.map((c, i) => ({ valor: fmtR(c / 100), data: toISO(m === 'quinzena' ? addDays(hoje, i * 15) : addMonths(hoje, i)) })))
  }
  function escolherDividir(v: boolean) {
    setDividir(v)
    if (!v) setParcelas([{ valor: fmtR(total), data: toISO(new Date()) }])
    else gerar(Math.max(2, Number(qtd) || 2), modo)
  }
  function setParcela(i: number, campo: 'valor' | 'data', v: string) {
    setParcelas(p => p.map((x, idx) => idx === i ? { ...x, [campo]: v } : x))
  }

  async function decidir(acao: 'negar' | 'liberar') {
    setEnviando(true)
    try {
      const payload: any = { id: d.id, acao }
      if (acao === 'negar') payload.motivoNegado = motivoNegado.trim()
      else { payload.modo = modo; payload.parcelas = parcelas.map(p => ({ valor: parseNum(p.valor), data: p.data })) }
      const res = await fetch('/api/salon/emprestimo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) { toast.success(acao === 'negar' ? 'Empréstimo negado — profissional avisado' : 'Liberado! Lançado na calculadora e profissional avisado'); onDone() }
      else { const e = await res.json().catch(() => ({})); toast.error(e.error || 'Erro') }
    } catch { toast.error('Erro de conexão') }
    setEnviando(false)
  }

  const somaParcelas = parcelas.reduce((s, p) => s + parseNum(p.valor), 0)
  const difere = Math.abs(somaParcelas - total) > 0.01
  const faltaData = parcelas.some(p => !p.data)

  const borda = emp.status === 'liberado' ? '#bbf7d0' : emp.status === 'negado' ? '#fecaca' : '#c4b5fd'
  return (
    <div style={{ background: '#fff', border: `1px solid ${borda}`, borderLeft: `4px solid ${emp.status === 'liberado' ? '#22c55e' : emp.status === 'negado' ? '#ef4444' : '#7c3aed'}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', padding: '2px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Wallet size={12} /> EMPRÉSTIMO</span>
        {d.solicitante_nome && <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', background: '#f0f9ff', padding: '2px 8px', borderRadius: 999 }}>👤 {d.solicitante_nome}</span>}
        {emp.status === 'pendente' && <span style={{ fontSize: 10, fontWeight: 800, color: '#b91c1c', background: '#fef2f2', padding: '2px 8px', borderRadius: 999 }}>AGUARDANDO</span>}
        {emp.status === 'liberado' && <span style={{ fontSize: 10, fontWeight: 800, color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: 999 }}>APROVADO</span>}
        {emp.status === 'negado' && <span style={{ fontSize: 10, fontWeight: 800, color: '#b91c1c', background: '#fef2f2', padding: '2px 8px', borderRadius: 999 }}>NEGADO</span>}
        <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 'auto' }}>{new Date(d.criado_em).toLocaleDateString('pt-BR')}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: '#15803d' }}>R$ {fmtR(total)}</span>
      </div>
      {emp.motivo && <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 4px' }}><strong>Motivo:</strong> {emp.motivo}</p>}

      {emp.status === 'negado' && emp.motivoNegado && <p style={{ fontSize: 12, color: '#b91c1c', margin: '6px 0 0', background: '#fef2f2', padding: '6px 10px', borderRadius: 8 }}>Negado: {emp.motivoNegado}</p>}
      {emp.status === 'liberado' && Array.isArray(emp.parcelas) && (
        <div style={{ marginTop: 8, background: '#f0fdf4', borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#15803d', marginBottom: 6 }}>Lançado na calculadora — {emp.parcelas.length} {emp.parcelas.length > 1 ? (emp.modo === 'quinzena' ? 'quinzenas' : 'parcelas') : 'parcela'}</div>
          {emp.parcelas.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#374151', padding: '2px 0' }}>
              <span>{p.label} · {p.data}</span><strong style={{ color: '#15803d' }}>R$ {fmtR(p.valor)}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Ações — só enquanto pendente */}
      {emp.status === 'pendente' && fase === 'idle' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={() => { setFase('aceitar'); setDividir(null) }} style={{ ...btn('#16a34a'), padding: '9px 16px', fontSize: 13 }}><Check size={14} /> Aceitar</button>
          <button onClick={() => setFase('negar')} style={{ ...btn('#dc2626'), padding: '9px 16px', fontSize: 13 }}><X size={14} /> Negar</button>
          {/* Histórico dela antes de decidir emprestar */}
          {d.solicitante_id && (
            <button onClick={() => setVerComportamento(true)} style={{ ...btnGhost(), padding: '9px 14px', fontSize: 13, color: '#b45309', borderColor: '#fde68a', background: '#fffbeb' }}>
              📋 Comportamento
            </button>
          )}
        </div>
      )}

      {verComportamento && d.solicitante_id && (
        <ComportamentoProfissional profId={d.solicitante_id} nome={d.solicitante_nome || 'Profissional'} onFechar={() => setVerComportamento(false)} />
      )}

      {emp.status === 'pendente' && fase === 'negar' && (
        <div style={{ marginTop: 12 }}>
          <textarea value={motivoNegado} onChange={e => setMotivoNegado(e.target.value)} rows={2} autoFocus placeholder="Motivo da recusa (opcional) — vai na notificação do profissional"
            style={{ width: '100%', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', resize: 'none' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button disabled={enviando} onClick={() => decidir('negar')} style={{ ...btn('#dc2626'), opacity: enviando ? .6 : 1 }}>Confirmar recusa</button>
            <button onClick={() => setFase('idle')} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      {emp.status === 'pendente' && fase === 'aceitar' && (
        <div style={{ marginTop: 12, background: '#faf9ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: 12 }}>
          {dividir === null ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Quer dividir o valor?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => escolherDividir(true)} style={btn('#7c3aed')}>Sim, parcelar</button>
                <button onClick={() => escolherDividir(false)} style={btnGhost()}>Não, à vista</button>
                <button onClick={() => setFase('idle')} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}>Voltar</button>
              </div>
            </>
          ) : (
            <>
              {dividir && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                  <div style={{ display: 'inline-flex', border: '1px solid #d8d4f0', borderRadius: 8, overflow: 'hidden' }}>
                    <button onClick={() => { setModo('mes'); gerar(Math.max(2, Number(qtd) || 2), 'mes') }} style={{ padding: '6px 12px', border: 'none', background: modo === 'mes' ? '#7c3aed' : '#fff', color: modo === 'mes' ? '#fff' : '#6b6860', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Meses</button>
                    <button onClick={() => { setModo('quinzena'); gerar(Math.max(2, Number(qtd) || 2), 'quinzena') }} style={{ padding: '6px 12px', border: 'none', background: modo === 'quinzena' ? '#7c3aed' : '#fff', color: modo === 'quinzena' ? '#fff' : '#6b6860', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Quinzenas</button>
                  </div>
                  <label style={{ fontSize: 12.5, color: '#374151' }}>Quantas?</label>
                  <input type="number" min={2} max={36} value={qtd} onChange={e => { setQtd(e.target.value); const n = Math.max(2, Number(e.target.value) || 2); gerar(n, modo) }} style={{ width: 64, border: '1px solid #d8d4f0', borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
                </div>
              )}
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#6b21a8', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={13} /> Datas de débito {modo === 'quinzena' && dividir ? '(quinzenas)' : ''}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {parcelas.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {dividir && <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', width: 34 }}>{i + 1}/{parcelas.length}</span>}
                    <span style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>R$</span>
                    <input value={p.valor} onChange={e => setParcela(i, 'valor', e.target.value)} style={{ width: 90, border: '1px solid #dcfce7', background: '#f6fef9', borderRadius: 8, padding: '6px 8px', fontSize: 13, fontWeight: 700, color: '#15803d' }} />
                    <input type="date" value={p.data} onChange={e => setParcela(i, 'data', e.target.value)} style={{ flex: 1, border: '1px solid #d8d4f0', borderRadius: 8, padding: '6px 8px', fontSize: 12.5 }} />
                  </div>
                ))}
              </div>
              {difere && <div style={{ fontSize: 11, color: '#b45309', marginTop: 6 }}>⚠ A soma das parcelas (R$ {fmtR(somaParcelas)}) está diferente do total (R$ {fmtR(total)}).</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                <button disabled={enviando || faltaData || !parcelas.length} onClick={() => decidir('liberar')} style={{ ...btn('#16a34a'), padding: '9px 16px', fontSize: 13, opacity: (enviando || faltaData) ? .6 : 1 }}>Liberar empréstimo</button>
                <button onClick={() => setDividir(null)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 12, cursor: 'pointer' }}>Voltar</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
