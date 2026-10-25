'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Home, Loader2, ChevronDown, ChevronUp, Copy, Check, Filter, Trash2, MessageCircle, Plus, Pencil, X, Settings, Paperclip, Send, Phone, ExternalLink } from 'lucide-react'
import { EXPERIENCIAS, ESTADOS_BR, type Curriculo } from '@/lib/curriculosShared'
import { chaveTelefone, normalizarTelefone } from '@/lib/crm'
import { voltar } from '@/lib/historicoNav'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/lib/useIsMobile'
import ChatCurriculos from '@/components/salon/ChatCurriculos'
import ArquivosCurriculos from '@/components/salon/ArquivosCurriculos'
import LoteCurriculos from '@/components/salon/LoteCurriculos'

const COR = '#5b4fcf'
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const nomeUF = (uf: string) => ESTADOS_BR.find(e => e.uf === uf)?.nome || uf

type Resumo = { conversa: string; estado: string; nao_lidas: number; ultima_em: string | null; ultima_de: string | null }
type DoPrincipal = { conversa: string; nome: string; telefone: string; vaga: string; nao_lidas: number; ultima_em: string | null; ultima_de: string | null; previa: string }
type Conversa = { id: string; nome: string; telefone: string; vaga: string }

export default function CurriculosPage() {
  const router = useRouter()
  const [itens, setItens] = useState<Curriculo[]>([])
  // A lista de vagas e GLOBAL do NODRI e vem do servidor: o que um salao
  // acrescenta vale para todos, no formulario publico e nesta tela.
  const [vagas, setVagas] = useState<string[]>([])           // as configuradas
  const [vagasExibir, setVagasExibir] = useState<string[]>([])  // + as que ainda tem candidato
  const [gerindo, setGerindo] = useState(false)
  const [configAberta, setConfigAberta] = useState(false)    // o card "Configurações" nasce fechado
  const [novaVaga, setNovaVaga] = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [salvandoVaga, setSalvandoVaga] = useState(false)
  const [erroVaga, setErroVaga] = useState('')
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const [copiadoVagas, setCopiadoVagas] = useState(false)
  const [abertas, setAbertas] = useState<Set<string>>(new Set())
  // filtros por vaga: { vaga: { estados:Set, exps:Set, meses:Set } }
  const [filtros, setFiltros] = useState<Record<string, { estados: Set<string>; exps: Set<string>; meses: Set<string> }>>({})
  const [filtroAberto, setFiltroAberto] = useState<string | null>(null)

  // Conversas: as mesmas do CRM, por um chat enxuto. Nada de conversa é guardado aqui.
  const [resumo, setResumo] = useState<Record<string, Resumo>>({})
  const [principal, setPrincipal] = useState<DoPrincipal[]>([])
  const [aba, setAba] = useState<'formulario' | 'principal'>('formulario')
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set())
  const [lote, setLote] = useState<null | 'mensagem' | 'pedir'>(null)
  const [arquivosAberto, setArquivosAberto] = useState(false)
  const [agendadas, setAgendadas] = useState(0)        // mensagens de candidatos ainda na fila, para sair no horário
  const [cancelando, setCancelando] = useState(false)
  const [abrindo, setAbrindo] = useState<string | null>(null)
  const [erroConversa, setErroConversa] = useState('')
  // Tela larga: lista à esquerda e a conversa à direita. Estreita: a conversa abre por cima.
  const estreita = useIsMobile(1100)
  const [conversaAberta, setConversaAberta] = useState<Conversa | null>(null)

  const carregar = () => {
    fetch('/api/salon/curriculos', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setItens(d.itens || []); setLink(d.link || ''); setVagas(d.vagas || []); setVagasExibir(d.vagasExibir || d.vagas || []) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  const carregarResumo = () => {
    fetch('/api/crm/curriculos', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.por_telefone) setResumo(d.por_telefone); if (Array.isArray(d?.principal)) setPrincipal(d.principal); if (typeof d?.agendadas === 'number') setAgendadas(d.agendadas) })
      .catch(() => {})
  }
  useEffect(() => {
    carregar()
    carregarResumo()
    const t = setInterval(carregarResumo, 15000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    // Uma vez só: marca como vistos (zera o badge da sidebar)
    fetch('/api/salon/curriculos', { method: 'POST', credentials: 'include' }).catch(() => {})
    // E garante a pasta Currículos no CRM (configuração apenas), para o botão existir lá.
    fetch('/api/crm/curriculos', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'preparar' }),
    }).catch(() => {})
  }, [])

  const doCandidato = (c: Curriculo): Resumo | undefined => resumo[chaveTelefone(normalizarTelefone(c.telefone))]
  const novasFormulario = Object.values(resumo).reduce((t, r) => t + (r.nao_lidas || 0), 0)
  const novasPrincipal = principal.reduce((t, p) => t + (p.nao_lidas || 0), 0)

  // Abre a conversa do candidato (cria o contato e a conversa na pasta Currículos, se for a primeira vez).
  const conversar = async (c: Curriculo) => {
    setAbrindo(c.id); setErroConversa('')
    try {
      const r = await fetch('/api/crm/curriculos', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'abrir', id: c.id }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d?.conversa) { setErroConversa(d?.error || 'Não foi possível abrir a conversa.'); return }
      setConversaAberta({ id: d.conversa, nome: c.nome, telefone: c.telefone, vaga: c.vaga }); carregarResumo()
    } catch { setErroConversa('Sem conexão com o servidor.') } finally { setAbrindo(null) }
  }

  // Quem escreveu para o telefone principal: a conversa já existe, só abre.
  const abrirDoPrincipal = (p: DoPrincipal) => {
    setConversaAberta({ id: p.conversa, nome: p.nome, telefone: p.telefone, vaga: p.vaga })
    setPrincipal(l => l.map(x => x.conversa === p.conversa ? { ...x, nao_lidas: 0 } : x))
  }

  // A vaga de quem escreveu pelo telefone principal fica guardada só aqui, na tela de Currículos.
  const escolherVaga = async (p: DoPrincipal, vaga: string) => {
    setPrincipal(l => l.map(x => x.conversa === p.conversa ? { ...x, vaga } : x))
    if (conversaAberta?.id === p.conversa) setConversaAberta({ ...conversaAberta, vaga })
    await fetch('/api/crm/curriculos', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'triagem', conversa: p.conversa, vaga }),
    }).catch(() => {})
  }

  // Cancela o que ainda não saiu (só mensagens de candidatos agendadas para o futuro).
  const cancelarAgendadas = async () => {
    if (!confirm(`Cancelar as ${agendadas} mensagens agendadas que ainda não saíram? As que já foram enviadas não são afetadas.`)) return
    setCancelando(true)
    try {
      await fetch('/api/crm/curriculos', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'cancelar_agendados' }),
      })
      carregarResumo()
    } catch { /* o aviso some quando a próxima leitura confirmar */ } finally { setCancelando(false) }
  }

  const alternar = (id: string) => setEscolhidos(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const alternarTodos = (lista: Curriculo[]) => setEscolhidos(s => {
    const n = new Set(s)
    const todos = lista.length > 0 && lista.every(c => n.has(c.id))
    lista.forEach(c => todos ? n.delete(c.id) : n.add(c.id))
    return n
  })

  const toggle = (v: string) => setAbertas(s => { const n = new Set(s); n.has(v) ? n.delete(v) : n.add(v); return n })

  const filtroDe = (v: string) => filtros[v] || { estados: new Set<string>(), exps: new Set<string>(), meses: new Set<string>() }
  const setF = (v: string, campo: 'estados' | 'exps' | 'meses', valor: string) => {
    setFiltros(prev => {
      const atual = { estados: new Set(filtroDe(v).estados), exps: new Set(filtroDe(v).exps), meses: new Set(filtroDe(v).meses) }
      atual[campo].has(valor) ? atual[campo].delete(valor) : atual[campo].add(valor)
      return { ...prev, [v]: atual }
    })
  }
  const limparF = (v: string) => setFiltros(prev => ({ ...prev, [v]: { estados: new Set(), exps: new Set(), meses: new Set() } }))

  const porVaga = useMemo(() => {
    const map: Record<string, Curriculo[]> = {}
    for (const v of vagasExibir) map[v] = []
    for (const c of itens) { (map[c.vaga] = map[c.vaga] || []).push(c) }
    for (const v in map) map[v].sort((a, b) => b.criado_em.localeCompare(a.criado_em))
    return map
  }, [itens, vagasExibir])

  const aplicarFiltro = (v: string, lista: Curriculo[]) => {
    const f = filtroDe(v)
    return lista.filter(c => {
      if (f.estados.size && !f.estados.has(c.estado)) return false
      if (f.exps.size && !f.exps.has(c.experiencia)) return false
      if (f.meses.size) { const m = String(new Date(c.criado_em).getMonth()); if (!f.meses.has(m)) return false }
      return true
    })
  }

  // Toda mudanca de vaga passa pelo servidor, que e quem valida nome repetido e
  // impede apagar vaga com candidato. A tela so reflete o que ele devolveu.
  const acaoVaga = async (body: Record<string, string>) => {
    setSalvandoVaga(true); setErroVaga('')
    try {
      const r = await fetch('/api/salon/curriculos', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setErroVaga(d?.error || 'Nao foi possivel salvar.'); return false }
      setVagas(d.vagas || []); setVagasExibir(d.vagasExibir || d.vagas || [])
      if (Array.isArray(d.itens)) setItens(d.itens)
      return true
    } catch {
      setErroVaga('Sem conexao com o servidor.'); return false
    } finally { setSalvandoVaga(false) }
  }
  const criar = async () => { if (await acaoVaga({ acao: 'criar', nome: novaVaga })) setNovaVaga('') }
  const renomear = async (de: string) => { if (await acaoVaga({ acao: 'renomear', nome: de, novo: editNome })) setEditando(null) }
  const remover = async (nome: string) => {
    if (!confirm(`Excluir a vaga "${nome}"? Ela sai do formulario para TODOS os saloes.`)) return
    await acaoVaga({ acao: 'excluir', nome })
  }

  const copiarLink = () => { navigator.clipboard?.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1600) }
  const excluir = async (id: string) => {
    if (!confirm('Excluir este currículo?')) return
    await fetch(`/api/salon/curriculos?id=${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {})
    setItens(s => s.filter(c => c.id !== id))
  }

  const mesesPresentes = (lista: Curriculo[]) => [...new Set(lista.map(c => new Date(c.criado_em).getMonth()))].sort((a, b) => a - b)
  const estadosPresentes = (lista: Curriculo[]) => [...new Set(lista.map(c => c.estado))].sort()

  const vagasDaLista = vagasExibir.length ? vagasExibir : vagas

  return (
    <div className="min-h-screen bg-nodri-dark text-nodri-t1">
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3">
        <button onClick={() => voltar(router)} className="flex items-center gap-2 text-nodri-t2 hover:text-nodri-cyan text-sm font-medium"><ArrowLeft size={16} /> Voltar</button>
        <div className="w-px h-5 bg-nodri-border" />
        <a href="/salon" className="flex items-center gap-1.5 text-nodri-t3 hover:text-nodri-cyan text-[12px]"><Home size={14} /> Início</a>
        <div className="w-px h-5 bg-nodri-border" />
        <h1 className="font-syne font-bold text-[15px] uppercase tracking-wide">Currículos</h1>
        <div className="flex-1" />
        {/* A página pública de vagas ("Trabalhe conosco"): é a que o Google lista e a que se divulga. */}
        <a href="/vagas" target="_blank" rel="noopener noreferrer" title="Abrir a página pública de vagas (Trabalhe conosco)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border"
          style={{ borderColor: COR + '55', color: COR, background: '#fff', marginRight: (novasFormulario + novasPrincipal) > 0 ? 0 : 330 }}>
          <ExternalLink size={14} /> Página de vagas
        </a>
        {(novasFormulario + novasPrincipal) > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold" style={{ background: '#fef3c7', color: '#92400e', marginRight: 330 }}>
            <MessageCircle size={14} /> {novasFormulario + novasPrincipal} resposta{(novasFormulario + novasPrincipal) > 1 ? 's' : ''} nova{(novasFormulario + novasPrincipal) > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex" style={!estreita ? { height: 'calc(100vh - 62px)' } : undefined}>
        <div className={!estreita ? 'w-[540px] flex-shrink-0 overflow-y-auto border-r border-nodri-border' : 'flex-1'}>
          <div className={estreita ? 'max-w-4xl mx-auto px-4 py-6 space-y-4' : 'px-4 py-5 space-y-4'}>

            {/* Configurações: link do formulário e vagas, num card só e fechado */}
            <div className="nodri-card p-4">
              <button onClick={() => setConfigAberta(a => !a)} className="w-full flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-nodri-t3"><Settings size={13} /> Configurações</span>
                {configAberta ? <ChevronUp size={16} className="text-nodri-t3" /> : <ChevronDown size={16} className="text-nodri-t3" />}
              </button>

              {configAberta && (
                <div className="mt-4 space-y-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-nodri-t3 mb-2">Link do formulário (envie para os candidatos)</p>
                    <div className="flex gap-2">
                      <input readOnly value={link} className="flex-1 min-w-0 px-3 py-2 rounded-lg text-[12px] text-nodri-t1 bg-nodri-surface border border-nodri-border" />
                      <button onClick={copiarLink} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold" style={{ background: COR, color: '#fff' }}>
                        {copiado ? <Check size={14} /> : <Copy size={14} />}{copiado ? 'Copiado!' : 'Copiar'}
                      </button>
                      {link && <a href={link} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg text-[12px] font-bold text-nodri-cyan border border-nodri-border">Abrir</a>}
                    </div>
                    <p className="text-[11px] text-nodri-t3 mt-2">Qualquer pessoa com o link pode preencher (nome, estado, idade, telefone, vaga e experiência).</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-nodri-t3 mb-2">Página pública de vagas (Trabalhe conosco)</p>
                    <div className="flex gap-2">
                      <input readOnly value="https://www.nodri.com.br/vagas" className="flex-1 min-w-0 px-3 py-2 rounded-lg text-[12px] text-nodri-t1 bg-nodri-surface border border-nodri-border" />
                      <button onClick={() => { navigator.clipboard?.writeText('https://www.nodri.com.br/vagas'); setCopiadoVagas(true); setTimeout(() => setCopiadoVagas(false), 1600) }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold" style={{ background: COR, color: '#fff' }}>
                        {copiadoVagas ? <Check size={14} /> : <Copy size={14} />}{copiadoVagas ? 'Copiado!' : 'Copiar'}
                      </button>
                      <a href="/vagas" target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg text-[12px] font-bold text-nodri-cyan border border-nodri-border">Abrir</a>
                    </div>
                    <p className="text-[11px] text-nodri-t3 mt-2">Lista as vagas abaixo, com QR code e botão de compartilhar, e aparece no Google. Vaga nova ou removida aqui aparece lá sozinha.</p>
                  </div>

                  <div>
                    <button onClick={() => { setGerindo(g => !g); setErroVaga(''); setEditando(null) }} className="w-full flex items-center justify-between gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-nodri-t3">Vagas do formulário</span>
                      <span className="flex items-center gap-2">
                        <span className="text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#5b4fcf20', color: COR }}>{vagas.length}</span>
                        {gerindo ? <ChevronUp size={16} className="text-nodri-t3" /> : <ChevronDown size={16} className="text-nodri-t3" />}
                      </span>
                    </button>

                    {gerindo && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[11px] text-nodri-t3">
                          Esta lista vale para <strong>todos os salões</strong> e aparece no formulário público na hora.
                          Nomes repetidos não são aceitos, e vaga com candidato inscrito não pode ser excluída.
                        </p>
                        {vagas.map(v => (
                          <div key={v} className="flex items-center gap-2">
                            {editando === v ? (
                              <>
                                <input autoFocus value={editNome} onChange={e => setEditNome(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') renomear(v); if (e.key === 'Escape') setEditando(null) }}
                                  className="flex-1 px-3 py-2 rounded-lg text-[13px] text-nodri-t1 bg-nodri-surface border border-nodri-border" />
                                <button onClick={() => renomear(v)} disabled={salvandoVaga}
                                  className="px-3 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50" style={{ background: COR, color: '#fff' }}>Salvar</button>
                                <button onClick={() => setEditando(null)} className="p-2 rounded-lg text-nodri-t3 border border-nodri-border"><X size={14} /></button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 px-3 py-2 rounded-lg text-[13px] text-nodri-t1 bg-nodri-surface border border-nodri-border">{v}</span>
                                <button onClick={() => { setEditando(v); setEditNome(v); setErroVaga('') }} title="Renomear"
                                  className="p-2 rounded-lg text-nodri-t2 border border-nodri-border"><Pencil size={14} /></button>
                                <button onClick={() => remover(v)} disabled={salvandoVaga} title="Excluir"
                                  className="p-2 rounded-lg border border-nodri-border disabled:opacity-50" style={{ color: '#dc2626' }}><Trash2 size={14} /></button>
                              </>
                            )}
                          </div>
                        ))}
                        <div className="flex items-center gap-2 pt-1">
                          <input value={novaVaga} onChange={e => setNovaVaga(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') criar() }}
                            placeholder="Nome da nova vaga (ex.: Barista)"
                            className="flex-1 px-3 py-2 rounded-lg text-[13px] text-nodri-t1 bg-nodri-surface border border-nodri-border" />
                          <button onClick={criar} disabled={salvandoVaga || novaVaga.trim().length < 2}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50" style={{ background: COR, color: '#fff' }}>
                            {salvandoVaga ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Adicionar
                          </button>
                        </div>
                        {!!erroVaga && (
                          <p className="text-[12px] font-bold px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#b91c1c' }}>{erroVaga}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ferramentas: arquivos (clipe), pedir currículo, e as duas listas */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setArquivosAberto(true)} title="Arquivos que os candidatos mandaram: peso e exclusão"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold border" style={{ borderColor: COR + '55', color: COR, background: '#fff' }}>
                <Paperclip size={14} /> Arquivos
              </button>
              <button onClick={() => setLote('pedir')} title="Pedir o currículo para os candidatos de uma vaga"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold" style={{ background: COR, color: '#fff' }}>
                <Send size={14} /> Pedir currículo
              </button>
              {agendadas > 0 && (
                <span className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold" style={{ background: '#fef3c7', color: '#92400e' }}>
                  {agendadas} mensage{agendadas === 1 ? 'm agendada' : 'ns agendadas'}
                  <button onClick={cancelarAgendadas} disabled={cancelando} className="underline disabled:opacity-50">{cancelando ? 'cancelando...' : 'cancelar'}</button>
                </span>
              )}
            </div>

            <div className="flex gap-1 border-b border-nodri-border">
              {([['formulario', 'Candidatos do formulário', novasFormulario], ['principal', 'Pelo telefone principal', novasPrincipal]] as const).map(([k, nome, n]) => (
                <button key={k} onClick={() => setAba(k)}
                  className={`px-3 py-2 text-[12.5px] font-bold border-b-2 -mb-px flex items-center gap-1.5 ${k === 'principal' && n > 0 && aba !== k ? 'animate-pulse' : ''}`}
                  style={{ borderColor: aba === k ? COR : 'transparent', color: aba === k ? COR : '#767069' }}>
                  {nome}
                  {k === 'principal' && principal.length > 0 && (
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded-full" style={{ background: n > 0 ? '#fef3c7' : '#5b4fcf20', color: n > 0 ? '#92400e' : COR }}>
                      {n > 0 ? `${n} nova${n > 1 ? 's' : ''}` : principal.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {!!erroConversa && (
              <p className="text-[12px] font-bold px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#b91c1c' }}>{erroConversa}</p>
            )}

            {aba === 'principal' ? (
              <div className="space-y-2">
                <p className="text-[11.5px] text-nodri-t3">
                  Pessoas que escreveram para o telefone principal do salão e foram movidas, no CRM, para a pasta <strong>Currículos</strong>.
                  Escolha a vaga de cada uma. A escolha fica só aqui.
                </p>
                {principal.length === 0 && (
                  <p className="text-[13px] text-nodri-t3 px-1 py-6 text-center">Ninguém por aqui ainda. No CRM, use o botão Currículos na conversa da pessoa para ela aparecer nesta lista.</p>
                )}
                {principal.map(p => (
                  <div key={p.conversa} className="nodri-card p-3 flex items-center gap-3"
                    style={p.nao_lidas > 0 ? { borderColor: '#f59e0b', boxShadow: '0 0 0 2px #fde68a' } : undefined}>
                    <Phone size={16} className="text-nodri-t3 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[14px] truncate">{p.nome}</p>
                      <p className="text-[11.5px] text-nodri-t3 truncate">{p.previa || p.telefone}</p>
                    </div>
                    <select value={p.vaga} onChange={e => escolherVaga(p, e.target.value)}
                      className="px-2 py-1.5 rounded-lg text-[12px] border bg-nodri-surface border-nodri-border text-nodri-t1">
                      <option value="">Escolher vaga</option>
                      {vagasDaLista.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <button onClick={() => abrirDoPrincipal(p)}
                      className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: COR }}>
                      <MessageCircle size={14} /> {p.nao_lidas > 0 ? 'Responder' : 'Abrir'}
                    </button>
                  </div>
                ))}
              </div>
            ) : loading ? (
              <div className="flex justify-center py-10"><Loader2 size={26} className="animate-spin text-nodri-cyan" /></div>
            ) : (
              <div className="space-y-3">
                {vagasExibir.map(vaga => {
                  const todos = porVaga[vaga] || []
                  const lista = aplicarFiltro(vaga, todos)
                  const aberta = abertas.has(vaga)
                  const f = filtroDe(vaga)
                  const filtrando = f.estados.size + f.exps.size + f.meses.size > 0
                  const mediaIdade = lista.length ? Math.round(lista.reduce((s, c) => s + c.idade, 0) / lista.length) : 0
                  return (
                    <div key={vaga} className="nodri-card overflow-hidden">
                      <button onClick={() => toggle(vaga)} className="w-full flex items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {aberta ? <ChevronUp size={16} className="text-nodri-t3 shrink-0" /> : <ChevronDown size={16} className="text-nodri-t3 shrink-0" />}
                          <span className="font-bold text-[14px] text-nodri-t1 truncate">{vaga}</span>
                        </div>
                        <span className="text-[12px] font-bold shrink-0 px-2.5 py-1 rounded-full" style={{ background: todos.length ? '#5b4fcf20' : 'rgba(128,128,150,.15)', color: todos.length ? COR : '#767069' }}>
                          {todos.length} {todos.length === 1 ? 'candidato' : 'candidatos'}
                        </span>
                      </button>

                      {aberta && (
                        <div className="border-t border-nodri-border">
                          {todos.length === 0 ? (
                            <p className="px-4 py-6 text-center text-[13px] text-nodri-t3">Nenhum candidato para esta vaga ainda.</p>
                          ) : (
                            <>
                              <div className="px-4 py-3 border-b border-nodri-border">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button onClick={() => setFiltroAberto(filtroAberto === vaga ? null : vaga)}
                                    className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg"
                                    style={{ background: filtrando ? COR : '#fff', color: filtrando ? '#fff' : COR, border: '1px solid ' + COR + '40' }}>
                                    <Filter size={12} /> Filtros{filtrando ? ` (${f.estados.size + f.exps.size + f.meses.size})` : ''}
                                  </button>
                                  <span className="text-[11px] text-nodri-t3">Mostrando <strong className="text-nodri-t1">{lista.length}</strong> de {todos.length}</span>
                                  <button onClick={() => alternarTodos(lista)}
                                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ background: '#fff', color: COR, border: '1px solid ' + COR + '40' }}>
                                    {lista.length > 0 && lista.every(c => escolhidos.has(c.id)) ? 'Desmarcar todos' : 'Selecionar todos'}
                                  </button>
                                  {lista.length > 0 && <span className="text-[11px] text-nodri-t3">· Idade média: <strong className="text-nodri-t1">{mediaIdade} anos</strong></span>}
                                  {filtrando && <button onClick={() => limparF(vaga)} className="text-[11px] text-nodri-t3 underline">limpar</button>}
                                </div>
                                {filtroAberto === vaga && (
                                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <FiltroGrupo titulo="Estado (mora em)" opcoes={estadosPresentes(todos).map(uf => ({ v: uf, l: `${nomeUF(uf)} (${uf})` }))} sel={f.estados} onToggle={o => setF(vaga, 'estados', o)} />
                                    <FiltroGrupo titulo="Experiência" opcoes={EXPERIENCIAS.filter(x => todos.some(c => c.experiencia === x)).map(x => ({ v: x, l: x }))} sel={f.exps} onToggle={o => setF(vaga, 'exps', o)} />
                                    <FiltroGrupo titulo="Mês de envio" opcoes={mesesPresentes(todos).map(m => ({ v: String(m), l: MESES[m] }))} sel={f.meses} onToggle={o => setF(vaga, 'meses', o)} />
                                  </div>
                                )}
                              </div>

                              <div className="divide-y divide-nodri-border">
                                {lista.map(c => {
                                  const r = doCandidato(c)
                                  return (
                                    <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <input type="checkbox" checked={escolhidos.has(c.id)} onChange={() => alternar(c.id)}
                                          aria-label={`Selecionar ${c.nome}`} className="w-4 h-4 shrink-0 cursor-pointer" style={{ accentColor: COR }} />
                                        <div className="min-w-0">
                                          <p className="font-bold text-[14px] text-nodri-t1 truncate">{c.nome}</p>
                                          <p className="text-[11.5px] text-nodri-t3">
                                            {nomeUF(c.estado)} ({c.estado}) · {c.idade} anos · {c.experiencia} · {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {r && r.nao_lidas > 0 && (
                                          <span className="text-[11px] font-bold px-2 py-1 rounded-full animate-pulse" style={{ background: '#fef3c7', color: '#92400e' }}>respondeu</span>
                                        )}
                                        {r && r.nao_lidas === 0 && r.ultima_de === 'salao' && (
                                          <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: '#5b4fcf20', color: COR }}>aguardando resposta</span>
                                        )}
                                        <button onClick={() => conversar(c)} disabled={abrindo === c.id}
                                          className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-60" style={{ background: COR }}>
                                          {abrindo === c.id ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />} {r && r.nao_lidas > 0 ? 'Responder' : 'Conversar'}
                                        </button>
                                        <button onClick={() => excluir(c.id)} className="p-1.5 rounded-lg text-nodri-t3 hover:text-red-400"><Trash2 size={14} /></button>
                                      </div>
                                    </div>
                                  )
                                })}
                                {lista.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-nodri-t3">Nenhum candidato com esses filtros.</p>}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {!estreita && (
          <div className="flex-1 min-w-0 h-full">
            {conversaAberta ? (
              <ChatCurriculos key={conversaAberta.id} conversaId={conversaAberta.id} nome={conversaAberta.nome}
                telefone={conversaAberta.telefone} vaga={conversaAberta.vaga} onFechar={() => setConversaAberta(null)} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2" style={{ background: '#fdfbf7' }}>
                <MessageCircle size={30} style={{ color: '#c3b39a' }} />
                <p className="text-[14px] font-bold" style={{ color: '#4a453f' }}>Escolha um candidato</p>
                <p className="text-[12.5px] text-center px-6" style={{ color: '#9a8c85' }}>Clique em Conversar na lista ao lado.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tela estreita: a conversa abre por cima, em tela cheia */}
      {estreita && conversaAberta && (
        <div className="fixed inset-0 z-40">
          <ChatCurriculos key={conversaAberta.id} conversaId={conversaAberta.id} nome={conversaAberta.nome}
            telefone={conversaAberta.telefone} vaga={conversaAberta.vaga} onFechar={() => setConversaAberta(null)} />
        </div>
      )}

      {/* Barra de seleção: aparece quando há candidatos marcados */}
      {escolhidos.size > 0 && !lote && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg" style={{ background: '#2b2320', color: '#fff' }}>
          <span className="text-[13px] font-bold">{escolhidos.size} selecionado{escolhidos.size > 1 ? 's' : ''}</span>
          <button onClick={() => setLote('mensagem')} className="px-3 py-1.5 rounded-lg text-[12px] font-bold" style={{ background: COR, color: '#fff' }}>Enviar mensagem</button>
          <button onClick={() => setEscolhidos(new Set())} className="text-[12px] underline opacity-80">Limpar</button>
        </div>
      )}

      {lote && (
        <LoteCurriculos pedirCurriculo={lote === 'pedir'} marcados={[...escolhidos]} candidatos={itens} vagas={vagasDaLista}
          jaTemConversa={c => !!doCandidato(c)}
          onEnviado={() => { setEscolhidos(new Set()); carregarResumo() }}
          onFechar={() => setLote(null)} />
      )}
      {arquivosAberto && <ArquivosCurriculos onFechar={() => setArquivosAberto(false)} />}
    </div>
  )
}

function FiltroGrupo({ titulo, opcoes, sel, onToggle }: { titulo: string; opcoes: { v: string; l: string }[]; sel: Set<string>; onToggle: (v: string) => void }) {
  if (!opcoes.length) return <div><p className="text-[10px] font-bold uppercase tracking-wider text-nodri-t3 mb-1.5">{titulo}</p><p className="text-[11px] text-nodri-t3">—</p></div>
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-nodri-t3 mb-1.5">{titulo}</p>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map(o => {
          const on = sel.has(o.v)
          return (
            <button key={o.v} onClick={() => onToggle(o.v)}
              className="text-[11px] px-2.5 py-1 rounded-full font-medium transition"
              style={{ background: on ? COR : '#fff', color: on ? '#fff' : '#4a4760', border: '1px solid ' + (on ? COR : '#e6e3f2') }}>
              {o.l}
            </button>
          )
        })}
      </div>
    </div>
  )
}
