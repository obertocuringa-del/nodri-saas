'use client'

// ── Envio automático (Mais Relatórios) ──────────────────────────────────────
//
// Configura os envios de recuperação/promoção por lista. Quem manda é o
// relógio do servidor (src/lib/crmDisparos.ts): uma mensagem por vez, no
// ritmo escolhido aqui, só um envio ligado por vez, e sempre esperando a
// confirmação/feedback terminarem de sair.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Play, Pause, Pencil, Trash2, RotateCcw, Send, Plus, X, Clock, Users, MessageCircle, CheckCircle2 } from 'lucide-react'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

type Publico = { dias_min: number; dias_max: number; servicos: string[]; segmento: 'todos' | 'vip' | 'regular' | 'novo' }
type Disparo = {
  id?: string; nome: string; ligado?: boolean; publico: Publico; mensagens: string[]
  janela_ini: string; janela_fim: string; dias_semana: number[]; intervalo_min: number; max_dia: number; trava_dias: number
  ciclo?: number
  estado?: { situacao?: string; ultimo_envio_em?: string | null; enviados_dia?: number; dia?: string; concluido_em?: string | null } | null
  resumo?: { total: number; enviadas: number; faltam: number; sem_celular: number; bloqueados: number; responderam: number; voltaram: number; por_dia: number }
}

const ROXO = '#5b4fcf'
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const INTERVALOS = [10, 15, 20, 30, 40, 45, 60, 90, 120, 180]

// Sem {servico}: sem serviço escolhido no filtro, o campo pega um serviço
// qualquer da cliente ("complemento keune"), e a frase sai estranha.
const MSG_RECUPERAR = 'Oi *{cliente}*, tudo bem?\n\nFaz um tempinho que você não vem aqui no salão e sentimos sua falta. Que tal agendar um horário essa semana?\n\nSe quiser, é só me responder aqui que eu vejo um horário bom para você.'
const MSG_PROMO = 'Oi *{cliente}*, tudo bem?\n\nComo você já faz {servico} com a gente, separei uma condição especial para você este mês.\n\nQuer que eu veja um horário?'

const MODELOS: { rotulo: string; desc: string; d: Partial<Disparo> }[] = [
  { rotulo: 'Recuperar perdidas', desc: 'Não vêm há 90 a 365 dias', d: { nome: 'Recuperar perdidas', publico: { dias_min: 90, dias_max: 365, servicos: [], segmento: 'todos' }, mensagens: [MSG_RECUPERAR] } },
  { rotulo: 'Clientes em risco', desc: 'Não vêm há 45 a 90 dias', d: { nome: 'Clientes em risco', publico: { dias_min: 45, dias_max: 90, servicos: [], segmento: 'todos' }, mensagens: [MSG_RECUPERAR] } },
  { rotulo: 'Promoção por serviço', desc: 'Quem faz os serviços escolhidos', d: { nome: 'Promoção', publico: { dias_min: 0, dias_max: 0, servicos: [], segmento: 'todos' }, mensagens: [MSG_PROMO] } },
  { rotulo: 'VIP', desc: 'As clientes que mais gastam', d: { nome: 'VIP', publico: { dias_min: 0, dias_max: 0, servicos: [], segmento: 'vip' }, mensagens: [''] } },
]

const NOVO: Disparo = {
  nome: '', publico: { dias_min: 90, dias_max: 365, servicos: [], segmento: 'todos' }, mensagens: [MSG_RECUPERAR],
  janela_ini: '09:00', janela_fim: '21:00', dias_semana: [1, 2, 3, 4, 5, 6], intervalo_min: 30, max_dia: 20, trava_dias: 30,
}

const min = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** Todas as contas do ritmo, as mesmas do servidor. */
function contas(d: Disparo, faltam: number) {
  const janela = Math.max(0, min(d.janela_fim) - min(d.janela_ini))
  const cabem = Math.floor(janela / d.intervalo_min) + 1
  const porDia = Math.max(0, Math.min(d.max_dia, cabem))
  const terminaAs = hhmm(min(d.janela_ini) + Math.max(0, porDia - 1) * d.intervalo_min)
  const intervaloParaMax = d.max_dia > 1 ? Math.floor(janela / (d.max_dia - 1)) : janela
  const diasDeEnvio = porDia ? Math.ceil(faltam / porDia) : 0
  // Data de término: conta só os dias da semana marcados.
  let fim: Date | null = null
  if (porDia && d.dias_semana.length && faltam > 0) {
    const dt = new Date(); let n = 0
    for (let i = 0; i < 3650 && n < diasDeEnvio; i++) {
      if (i > 0) dt.setDate(dt.getDate() + 1)
      if (d.dias_semana.includes(dt.getDay())) n++
    }
    fim = dt
  }
  return { cabem, porDia, terminaAs, intervaloParaMax, diasDeEnvio, fim }
}

export default function EnvioAutomatico() {
  const [lista, setLista] = useState<Disparo[] | null>(null)
  const [servicos, setServicos] = useState<{ nome: string; clientes: number }[]>([])
  const [editando, setEditando] = useState<Disparo | null>(null)
  const [original, setOriginal] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState('')

  async function carregar() {
    const r = await fetch('/api/crm/disparos', { cache: 'no-store' })
    const d = r.ok ? await r.json() : { disparos: [], servicos: [] }
    setLista(d.disparos || []); setServicos(d.servicos || [])
  }
  useEffect(() => { carregar(); const t = setInterval(carregar, 60000); return () => clearInterval(t) }, [])

  const sujo = !!editando && JSON.stringify(editando) !== original
  useGuardaSalvar(sujo, 'Envio automático')

  function abrirEditor(d: Disparo) {
    const copia = JSON.parse(JSON.stringify(d)); delete copia.estado; delete copia.resumo
    setEditando(copia); setOriginal(JSON.stringify(copia))
  }

  async function acao(corpo: any, ok?: string) {
    setOcupado(corpo.acao + (corpo.id || ''))
    const r = await fetch('/api/crm/disparos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
    const d = await r.json().catch(() => ({}))
    setOcupado('')
    if (!r.ok) { alert(d.error || 'Não consegui.'); return null }
    if (ok) { setAviso(ok); setTimeout(() => setAviso(''), 4000) }
    await carregar()
    return d
  }

  async function ligar(d: Disparo, on: boolean) {
    if (on) {
      const outro = (lista || []).find(x => x.ligado && x.id !== d.id)
      if (outro && !confirm(`Só um envio fica ligado por vez. Ligar "${d.nome}" vai pausar "${outro.nome}". Continuar?`)) return
    }
    await acao({ acao: 'ligar', id: d.id, ligado: on }, on ? 'Envio ligado.' : 'Envio pausado.')
  }

  if (editando) {
    return <Editor d={editando} setD={setEditando} servicos={servicos} sujo={sujo}
      onCancelar={() => { if (!sujo || confirm('Descartar as alterações?')) setEditando(null) }}
      onSalvar={async () => {
        const r = await acao({ acao: 'salvar', disparo: editando }, 'Envio salvo.')
        if (r) setEditando(null)
      }} />
  }

  return (
    <div>
      <div style={{ background: '#fff', border: '1.5px solid #e0ddd8', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a' }}>Envio automático pelo WhatsApp</div>
            <div style={{ fontSize: 12.5, color: '#6b6860', marginTop: 4, lineHeight: 1.5 }}>
              Escolha uma lista de clientes e a mensagem; o sistema manda uma por vez, no ritmo que você definir, da cliente
              que veio mais recente para a mais antiga. Quem já recebeu não recebe de novo, só um envio fica ligado por vez e
              ele sempre espera a confirmação e o feedback terminarem de sair.
            </div>
          </div>
          <button onClick={() => abrirEditor({ ...NOVO })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: ROXO, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={15} /> Novo envio
          </button>
        </div>
        {aviso && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: '#2f6b4f' }}>{aviso}</div>}
      </div>

      {!lista && <div style={{ padding: 30, textAlign: 'center', color: '#6b6860' }}><Loader2 className="animate-spin" size={18} /> Carregando...</div>}
      {lista && !lista.length && (
        <div style={{ background: '#fff', border: '1.5px dashed #e0ddd8', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>Comece por um modelo:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {MODELOS.map(m => (
              <button key={m.rotulo} onClick={() => abrirEditor({ ...NOVO, ...m.d } as Disparo)}
                style={{ textAlign: 'left', background: '#faf9f7', border: '1.5px solid #e0ddd8', borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: ROXO }}>{m.rotulo}</div>
                <div style={{ fontSize: 11.5, color: '#6b6860', marginTop: 2 }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {(lista || []).map(d => {
          const r = d.resumo
          const pct = r && r.total ? Math.round(r.enviadas / r.total * 100) : 0
          const c = contas(d, r?.faltam || 0)
          const concluido = !!d.estado?.concluido_em && !d.ligado
          return (
            <div key={d.id} style={{ background: '#fff', border: `1.5px solid ${d.ligado ? '#b9b2ee' : '#e0ddd8'}`, borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: '#1a1a1a' }}>{d.nome}</div>
                <span className={d.ligado ? 'animate-pulse' : ''} style={{ fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 999,
                  background: d.ligado ? '#e7f1e9' : concluido ? '#eceaf9' : '#f1efe8', color: d.ligado ? '#2f6b4f' : concluido ? ROXO : '#8f877f' }}>
                  {d.ligado ? 'Ligado' : concluido ? 'Concluído' : 'Pausado'}
                </span>
                {(d.ciclo || 1) > 1 && <span style={{ fontSize: 11, color: '#8f877f' }}>ciclo {d.ciclo}</span>}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {d.ligado ? (
                    <button onClick={() => ligar(d, false)} disabled={!!ocupado} style={botao('#fff', '#9a6b12', '#e8c9a6')}><Pause size={13} /> Pausar</button>
                  ) : (
                    <button onClick={() => ligar(d, true)} disabled={!!ocupado} style={botao(ROXO, '#fff', ROXO)}><Play size={13} /> Ligar</button>
                  )}
                  <button onClick={() => abrirEditor(d)} style={botao('#fff', '#1a1a1a', '#e0ddd8')}><Pencil size={13} /> Editar</button>
                  {(concluido || (r && r.enviadas > 0)) && !d.ligado && (
                    <button onClick={() => { if (confirm('Reiniciar o ciclo? Todas as clientes da lista voltam a poder receber este envio.')) acao({ acao: 'reiniciar', id: d.id }, 'Ciclo reiniciado.') }}
                      style={botao('#fff', '#1a1a1a', '#e0ddd8')}><RotateCcw size={13} /> Reiniciar ciclo</button>
                  )}
                  {!d.ligado && (
                    <button onClick={() => { if (confirm(`Excluir "${d.nome}"?`)) acao({ acao: 'excluir', id: d.id }, 'Excluído.') }}
                      style={botao('#fff', '#b4322a', '#f0cfc9')}><Trash2 size={13} /></button>
                  )}
                </div>
              </div>

              {d.ligado && d.estado?.situacao && (
                <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: /Pausado|Limite|Encerrado/.test(d.estado.situacao) ? '#9a6b12' : '#2f6b4f', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} /> {d.estado.situacao}
                </div>
              )}

              {r && (
                <>
                  <div style={{ height: 8, background: '#f1efe8', borderRadius: 99, margin: '12px 0 6px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: ROXO, borderRadius: 99 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: '#6b6860' }}>
                    <span><b style={{ color: '#1a1a1a' }}>{r.enviadas}</b> de {r.total} enviadas ({pct}%)</span>
                    <span><b style={{ color: '#1a1a1a' }}>{r.faltam}</b> faltam</span>
                    <span><MessageCircle size={12} style={{ verticalAlign: -2 }} /> <b style={{ color: '#1a1a1a' }}>{r.responderam}</b> responderam</span>
                    <span><CheckCircle2 size={12} style={{ verticalAlign: -2 }} /> <b style={{ color: '#2f6b4f' }}>{r.voltaram}</b> voltaram ao salão</span>
                    <span><Users size={12} style={{ verticalAlign: -2 }} /> {c.porDia} por dia</span>
                    {c.fim && r.faltam > 0 && <span>termina por volta de <b style={{ color: '#1a1a1a' }}>{c.fim.toLocaleDateString('pt-BR')}</b></span>}
                    {!!r.sem_celular && <span style={{ color: '#a09a90' }}>{r.sem_celular} sem celular (fora)</span>}
                    {!!r.bloqueados && <span style={{ color: '#a09a90' }}>{r.bloqueados} pediram para sair</span>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function botao(fundo: string, cor: string, borda: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, background: fundo, color: cor, border: `1.5px solid ${borda}`, borderRadius: 8, padding: '6px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
}
const rotulo: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 5 }
const campo: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1.5px solid #e0ddd8', borderRadius: 8, fontSize: 13, color: '#1a1a1a', background: '#fff' }
const secao: React.CSSProperties = { background: '#fff', border: '1.5px solid #e0ddd8', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }
const tituloSecao: React.CSSProperties = { fontSize: 13.5, fontWeight: 800, color: '#1a1a1a', marginBottom: 12 }

function Editor({ d, setD, servicos, sujo, onCancelar, onSalvar }: {
  d: Disparo; setD: (d: Disparo) => void; servicos: { nome: string; clientes: number }[]; sujo: boolean
  onCancelar: () => void; onSalvar: () => Promise<void>
}) {
  const [previa, setPrevia] = useState<any>(null)
  const [carregandoPrevia, setCarregandoPrevia] = useState(false)
  const [buscaServ, setBuscaServ] = useState('')
  const [telTeste, setTelTeste] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [simulando, setSimulando] = useState(false)
  const [simulacao, setSimulacao] = useState<any>(null)
  const pub = d.publico
  const set = (p: Partial<Disparo>) => setD({ ...d, ...p })
  const setPub = (p: Partial<Publico>) => setD({ ...d, publico: { ...pub, ...p } })

  // Prévia com meio segundo de folga depois da última mudança.
  const chave = JSON.stringify([pub, d.mensagens])
  const timer = useRef<any>(null)
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setCarregandoPrevia(true)
      const r = await fetch('/api/crm/disparos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'previa', disparo: d }) })
      setPrevia(r.ok ? await r.json() : null)
      setCarregandoPrevia(false)
    }, 500)
    return () => clearTimeout(timer.current)
  }, [chave]) // eslint-disable-line react-hooks/exhaustive-deps

  const c = contas(d, previa?.total || 0)
  const servFiltrados = useMemo(() => {
    const q = buscaServ.trim().toLowerCase()
    return servicos.filter(s => !pub.servicos.includes(s.nome) && (!q || s.nome.toLowerCase().includes(q))).slice(0, 30)
  }, [servicos, buscaServ, pub.servicos])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={onCancelar} style={botao('#fff', '#1a1a1a', '#e0ddd8')}><X size={13} /> Voltar</button>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{d.id ? 'Editar envio' : 'Novo envio'}</div>
      </div>

      {/* 1. Público */}
      <div style={secao}>
        <div style={tituloSecao}>1. Para quem enviar</div>
        {!d.id && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {MODELOS.map(m => (
              <button key={m.rotulo} onClick={() => setD({ ...d, ...m.d, mensagens: m.d.mensagens?.[0] ? m.d.mensagens : d.mensagens } as Disparo)}
                style={{ ...botao('#faf9f7', ROXO, '#e0ddd8'), borderRadius: 999 }}>{m.rotulo}</button>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
          <label><span style={rotulo}>Nome do envio</span>
            <input value={d.nome} onChange={e => set({ nome: e.target.value })} placeholder="Ex.: Recuperar perdidas" style={campo} /></label>
          <label><span style={rotulo}>Sem vir há pelo menos (dias)</span>
            <input type="number" min={0} value={pub.dias_min} onChange={e => setPub({ dias_min: Number(e.target.value) || 0 })} style={campo} /></label>
          <label><span style={rotulo}>E no máximo (dias, 0 = sem limite)</span>
            <input type="number" min={0} value={pub.dias_max} onChange={e => setPub({ dias_max: Number(e.target.value) || 0 })} style={campo} /></label>
          <label><span style={rotulo}>Tipo de cliente</span>
            <select value={pub.segmento} onChange={e => setPub({ segmento: e.target.value as any })} style={campo}>
              <option value="todos">Todas</option><option value="vip">VIP</option><option value="regular">Regulares</option><option value="novo">Vieram 1 vez</option>
            </select></label>
        </div>
        {pub.dias_min >= 90 && (!pub.dias_max || pub.dias_max > 540) && (
          <div style={{ fontSize: 11.5, color: '#9a6b12', marginTop: 8 }}>
            Cliente sumida há mais de 1 ano e meio quase nunca volta e é quem mais denuncia a mensagem como spam. Vale colocar um limite máximo.
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <span style={rotulo}>Fez algum destes serviços (vazio = qualquer serviço)</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {pub.servicos.map(s => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eceaf9', color: ROXO, fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 999 }}>
                {s} <button onClick={() => setPub({ servicos: pub.servicos.filter(x => x !== s) })} style={{ color: ROXO, display: 'inline-flex' }}><X size={12} /></button>
              </span>
            ))}
          </div>
          <input value={buscaServ} onChange={e => setBuscaServ(e.target.value)} placeholder="Procurar serviço (modelagem, mega...)" style={{ ...campo, maxWidth: 360 }} />
          {buscaServ.trim() && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
              {servFiltrados.map(s => (
                <button key={s.nome} onClick={() => { setPub({ servicos: [...pub.servicos, s.nome] }); setBuscaServ('') }}
                  style={{ ...botao('#fff', '#1a1a1a', '#e0ddd8'), fontWeight: 600 }}>{s.nome} <span style={{ color: '#a09a90' }}>{s.clientes}</span></button>
              ))}
              {!servFiltrados.length && <span style={{ fontSize: 12, color: '#a09a90' }}>Nenhum serviço com esse nome.</span>}
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, background: '#faf9f7', borderRadius: 10, padding: '10px 12px', fontSize: 12.5 }}>
          {carregandoPrevia && !previa ? <span style={{ color: '#6b6860' }}><Loader2 size={13} className="animate-spin" /> Contando...</span> : previa && (
            <>
              <b style={{ fontSize: 15, color: ROXO }}>{previa.total}</b> clientes nesta lista
              {!!previa.sem_celular && <span style={{ color: '#a09a90' }}> · {previa.sem_celular} sem celular válido ficam de fora</span>}
              <div style={{ color: '#6b6860', marginTop: 3 }}>Ordem de envio: da visita mais recente para a mais antiga. As primeiras:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {(previa.amostra || []).map((a: any) => (
                  <span key={a.cliente} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 7, padding: '3px 8px', fontSize: 11.5 }}>
                    {a.cliente} <span style={{ color: '#a09a90' }}>· {a.dias}d</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Mensagem */}
      <div style={secao}>
        <div style={tituloSecao}>2. Mensagem</div>
        <div style={{ fontSize: 12, color: '#6b6860', marginBottom: 10, lineHeight: 1.5 }}>
          Campos que se preenchem sozinhos: <code>{'{cliente}'}</code> primeiro nome, <code>{'{servico}'}</code> o serviço escolhido
          no filtro acima (use só quando escolher serviço),
          {' '}<code>{'{dias}'}</code> há quantos dias não vem, <code>{'{ultima_visita}'}</code> a data. Escreva 2 ou 3 versões
          diferentes: o sistema alterna entre elas, e o WhatsApp desconfia menos de texto que não é idêntico.
        </div>
        {d.mensagens.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={rotulo}>Versão {i + 1}</span>
              {d.mensagens.length > 1 && <button onClick={() => set({ mensagens: d.mensagens.filter((_, j) => j !== i) })} style={{ fontSize: 11.5, color: '#b4322a', fontWeight: 700 }}>remover</button>}
            </div>
            <textarea value={m} rows={5} onChange={e => set({ mensagens: d.mensagens.map((x, j) => j === i ? e.target.value : x) })}
              style={{ ...campo, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
            {previa?.amostra?.[i] && m.trim() && (
              <div style={{ fontSize: 11.5, color: '#6b6860', background: '#e7f1e9', borderRadius: 8, padding: '8px 10px', marginTop: 4, whiteSpace: 'pre-wrap' }}>
                <b>Como chega para {previa.amostra[i].cliente.split(' ')[0]}:</b>{'\n'}{previa.amostra[i].mensagem}
              </div>
            )}
          </div>
        ))}
        {d.mensagens.length < 3 && (
          <button onClick={() => set({ mensagens: [...d.mensagens, ''] })} style={botao('#fff', ROXO, '#e0ddd8')}><Plus size={13} /> Outra versão</button>
        )}
      </div>

      {/* 3. Ritmo */}
      <div style={secao}>
        <div style={tituloSecao}>3. Ritmo (é isso que evita bloqueio)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <label><span style={rotulo}>Começa às</span><input type="time" value={d.janela_ini} onChange={e => set({ janela_ini: e.target.value })} style={campo} /></label>
          <label><span style={rotulo}>Para às</span><input type="time" value={d.janela_fim} onChange={e => set({ janela_fim: e.target.value })} style={campo} /></label>
          <label><span style={rotulo}>Uma mensagem a cada</span>
            <select value={d.intervalo_min} onChange={e => set({ intervalo_min: Number(e.target.value) })} style={campo}>
              {[...new Set([...INTERVALOS, d.intervalo_min])].sort((a, b) => a - b).map(v => <option key={v} value={v}>{v < 60 ? `${v} min` : `${v / 60} h`.replace('.5', ',5')}</option>)}
            </select></label>
          <label><span style={rotulo}>Máximo por dia</span><input type="number" min={1} max={300} value={d.max_dia} onChange={e => set({ max_dia: Number(e.target.value) || 1 })} style={campo} /></label>
          <label><span style={rotulo}>Não mandar para quem recebeu algo nos últimos (dias)</span>
            <input type="number" min={0} max={180} value={d.trava_dias} onChange={e => set({ trava_dias: Number(e.target.value) || 0 })} style={campo} /></label>
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={rotulo}>Dias da semana</span>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {DIAS.map((n, i) => {
              const on = d.dias_semana.includes(i)
              return <button key={n} onClick={() => set({ dias_semana: on ? d.dias_semana.filter(x => x !== i) : [...d.dias_semana, i].sort() })}
                style={{ ...botao(on ? ROXO : '#fff', on ? '#fff' : '#6b6860', on ? ROXO : '#e0ddd8'), minWidth: 48, justifyContent: 'center' }}>{n}</button>
            })}
          </div>
        </div>

        <div style={{ marginTop: 14, background: '#f5f3ff', border: '1px solid #dcd7fa', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, lineHeight: 1.7, color: '#1a1a1a' }}>
          <div>Das <b>{d.janela_ini}</b> às <b>{d.janela_fim}</b>, uma a cada <b>{d.intervalo_min} min</b>: cabem <b>{c.cabem}</b> por dia.</div>
          {d.max_dia > c.cabem ? (
            <div style={{ color: '#9a6b12', fontWeight: 700 }}>
              Você pediu {d.max_dia} por dia, mas nesse ritmo só cabem {c.cabem}. Para mandar {d.max_dia}, o intervalo precisa ser de no máximo {c.intervaloParaMax} min.
            </div>
          ) : (
            <div>Com o máximo de <b>{d.max_dia}</b> por dia, a última sai por volta das <b>{c.terminaAs}</b>.</div>
          )}
          {previa && previa.total > 0 && c.porDia > 0 && (
            <div>A lista de <b>{previa.total}</b> clientes leva uns <b>{c.diasDeEnvio}</b> dias de envio{c.fim ? <> e termina por volta de <b>{c.fim.toLocaleDateString('pt-BR')}</b></> : null}.</div>
          )}
          {d.max_dia > 50 && <div style={{ color: '#9a6b12' }}>Mais de 50 por dia aumenta o risco de bloqueio. Comece com 20 e suba aos poucos.</div>}
        </div>
      </div>

      {/* 4. Teste e salvar */}
      <div style={secao}>
        <div style={tituloSecao}>4. Testar antes de ligar</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={telTeste} onChange={e => setTelTeste(e.target.value)} placeholder="Seu celular com DDD" style={{ ...campo, maxWidth: 220 }} />
          <button disabled={testando || !telTeste.trim()} onClick={async () => {
            setTestando(true)
            const r = await fetch('/api/crm/disparos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'teste', disparo: d, telefone: telTeste }) })
            const j = await r.json().catch(() => ({}))
            setTestando(false)
            alert(r.ok ? `Teste enviado: ${j.enviadas} mensagem(ns), com os dados da primeira cliente da lista. Confira no seu WhatsApp.` : (j.error || 'Não consegui enviar o teste.'))
          }} style={botao('#fff', ROXO, '#dcd7fa')}>
            {testando ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Enviar teste
          </button>
          <span style={{ fontSize: 11.5, color: '#a09a90' }}>Manda cada versão da mensagem para este número. Ninguém da lista recebe.</span>
        </div>
        <div style={{ marginTop: 12 }}>
          <button disabled={simulando} onClick={async () => {
            setSimulando(true)
            const r = await fetch('/api/crm/disparos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'simular', disparo: d }) })
            setSimulacao(r.ok ? await r.json() : { erro: true })
            setSimulando(false)
          }} style={botao('#fff', '#1a1a1a', '#e0ddd8')}>
            {simulando ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />} Simular: quem receberia agora?
          </button>
          {simulacao && !simulacao.erro && (
            <div style={{ marginTop: 8, fontSize: 12.5, background: '#faf9f7', borderRadius: 10, padding: '10px 12px', lineHeight: 1.6 }}>
              {simulacao.travas?.length ? <div style={{ color: '#9a6b12', fontWeight: 700 }}>Agora não sairia: {simulacao.travas.join('; ')}.</div>
                : <div style={{ color: '#2f6b4f', fontWeight: 700 }}>Se estivesse ligado, sairia agora.</div>}
              {simulacao.proxima
                ? <div>Próxima da fila: <b>{simulacao.proxima.cliente}</b> ({simulacao.proxima.dias} dias sem vir).</div>
                : <div>Ninguém disponível na lista agora.</div>}
              {!!simulacao.puladas?.length && (
                <div style={{ color: '#6b6860' }}>Puladas antes dela: {simulacao.puladas.map((p: any) => `${p.cliente} (${p.motivo})`).join(', ')}.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 30 }}>
        <button onClick={onCancelar} style={botao('#fff', '#1a1a1a', '#e0ddd8')}>Cancelar</button>
        <button disabled={salvando || !d.nome.trim() || !d.mensagens.some(m => m.trim())} onClick={async () => { setSalvando(true); await onSalvar(); setSalvando(false) }}
          style={{ ...botao(ROXO, '#fff', ROXO), padding: '9px 20px', fontSize: 13, opacity: (!d.nome.trim() || !d.mensagens.some(m => m.trim())) ? 0.5 : 1 }}>
          {salvando ? <Loader2 size={14} className="animate-spin" /> : null} {sujo ? 'Salvar' : 'Salvo'}
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: '#a09a90', textAlign: 'right', marginTop: -22, marginBottom: 30 }}>Depois de salvar, ligue o envio na lista.</div>
    </div>
  )
}
