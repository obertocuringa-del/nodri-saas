'use client'

// ── CRM NODRI — a tela ──────────────────────────────────────────────────────
//
// O desenho segue a pergunta que a recepção faz ao chegar: "o que eu tenho
// que fazer agora?". Por isso a coluna da esquerda não é uma lista de
// conversas em ordem de chegada — é uma FILA DE TRABALHO, com o que precisa
// de resposta em cima e o tempo de espera contado só dentro do expediente.
//
// Três colunas: a fila, a conversa, e o que o NODRI já sabe sobre a cliente.

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, RefreshCw, Send, Search, Link2, Power, Clock, User, X, Check } from 'lucide-react'
import {
  ESTADOS, estadoPor, telefoneBonito, minutosUteis, tempoCurto,
  urgenciaPorMinutos, CORES_URGENCIA, donoAtivo, type EstadoConversa,
} from '@/lib/crm'

type Conversa = any
type Mensagem = any

export default function CrmPage() {
  const [canal, setCanal] = useState<any>({ situacao: 'desconectado' })
  const [modelos, setModelos] = useState<any[]>([])
  const [motivos, setMotivos] = useState<any[]>([])
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [aberta, setAberta] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'fila' | 'todas' | EstadoConversa>('fila')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [fecharAberto, setFecharAberto] = useState(false)
  const fimDaConversa = useRef<HTMLDivElement>(null)

  // ── Carregamento ──────────────────────────────────────────────────────────
  async function puxarCanal() {
    try {
      const r = await fetch('/api/crm/canal')
      if (!r.ok) return
      const d = await r.json()
      setCanal(d.canal || { situacao: 'desconectado' })
      setModelos(d.modelos || [])
      setMotivos(d.motivos || [])
    } catch {}
  }

  async function puxarConversas() {
    try {
      const r = await fetch('/api/crm/conversas')
      if (!r.ok) return
      const d = await r.json()
      setConversas(d.conversas || [])
    } catch {} finally { setCarregando(false) }
  }

  async function abrirConversa(c: Conversa) {
    setAberta(c); setMensagens([]); setFecharAberto(false)
    try {
      // Assumir primeiro: a trava vale desde o instante em que a pessoa abre,
      // não depois que as mensagens carregam.
      fetch('/api/crm/conversas', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, acao: 'assumir' }),
      })
      const r = await fetch(`/api/crm/mensagens?conversa=${c.id}`)
      const d = await r.json()
      setMensagens(d.mensagens || [])
      setConversas(prev => prev.map(x => x.id === c.id ? { ...x, nao_lidas: 0 } : x))
    } catch {}
  }

  useEffect(() => { puxarCanal(); puxarConversas() }, [])

  // Enquanto não há conexão, o QR muda a cada minuto: olhar de perto.
  // Conectado, um ritmo tranquilo basta e não castiga o banco.
  useEffect(() => {
    const rapido = canal.situacao === 'aguardando_qr' || canal.situacao === 'conectando'
    const t = setInterval(() => {
      puxarCanal()
      if (!rapido) puxarConversas()
    }, rapido ? 3000 : 15000)
    return () => clearInterval(t)
  }, [canal.situacao])

  useEffect(() => {
    fimDaConversa.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length])

  // ── A fila ────────────────────────────────────────────────────────────────
  const agora = Date.now()
  const comTempo = useMemo(() => conversas.map(c => {
    const min = c.aguardando_desde
      ? minutosUteis(new Date(c.aguardando_desde), new Date(agora))
      : 0
    return { ...c, _min: min, _urg: urgenciaPorMinutos(min) }
  }), [conversas, agora])

  const visiveis = useMemo(() => {
    let lista = comTempo
    if (filtro === 'fila') lista = lista.filter(c => estadoPor(c.estado).naFila)
    else if (filtro !== 'todas') lista = lista.filter(c => c.estado === filtro)
    if (busca.trim()) {
      const q = busca.trim().toLowerCase()
      lista = lista.filter(c => {
        const ct = c.contato || {}
        return [ct.nome, ct.nome_agenda, ct.cliente_nome, ct.telefone, c.assunto, c.ultima_previa]
          .some((v: any) => String(v || '').toLowerCase().includes(q))
      })
    }
    // Quem espera há mais tempo aparece primeiro — é a ordem do trabalho,
    // não a ordem de chegada.
    return [...lista].sort((a, b) => {
      const fa = estadoPor(a.estado).naFila ? 0 : 1
      const fb = estadoPor(b.estado).naFila ? 0 : 1
      if (fa !== fb) return fa - fb
      if (b._min !== a._min) return b._min - a._min
      return new Date(b.ultima_em || 0).getTime() - new Date(a.ultima_em || 0).getTime()
    })
  }, [comTempo, filtro, busca])

  const contagem = useMemo(() => {
    const naFila = comTempo.filter(c => estadoPor(c.estado).naFila)
    return {
      fila: naFila.length,
      criticas: naFila.filter(c => c._urg === 'critico').length,
      aguardando: comTempo.filter(c => c.estado === 'aguardando').length,
      followUp: comTempo.filter(c => c.estado === 'follow_up').length,
    }
  }, [comTempo])

  // ── Ações ─────────────────────────────────────────────────────────────────
  async function enviar() {
    const t = texto.trim()
    if (!t || !aberta || enviando) return
    setEnviando(true)
    try {
      const r = await fetch('/api/crm/mensagens', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversa: aberta.id, texto: t }),
      })
      if (r.ok) {
        setTexto('')
        const rm = await fetch(`/api/crm/mensagens?conversa=${aberta.id}`)
        setMensagens((await rm.json()).mensagens || [])
        puxarConversas()
      } else {
        alert((await r.json().catch(() => ({}))).error || 'Não consegui enviar.')
      }
    } catch { alert('Não consegui enviar.') } finally { setEnviando(false) }
  }

  async function mudarEstado(estado: EstadoConversa, extra: any = {}) {
    if (!aberta) return
    const r = await fetch('/api/crm/conversas', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: aberta.id, estado, ...extra }),
    })
    if (!r.ok) { alert((await r.json().catch(() => ({}))).error || 'Não consegui mudar.'); return }
    setAberta({ ...aberta, estado, ...extra })
    setFecharAberto(false)
    puxarConversas()
  }

  async function conectar(acao: 'conectar' | 'desconectar') {
    if (acao === 'desconectar' && !confirm('Desconectar o WhatsApp do CRM? Para voltar será preciso escanear o QR de novo.')) return
    await fetch('/api/crm/canal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao }),
    })
    puxarCanal()
  }

  const conectado = canal.situacao === 'conectado'

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f7' }}>
      {/* ── Barra ── */}
      <div className="sticky top-0 z-20 border-b" style={{ background: '#fff', borderColor: '#e5e5ea' }}>
        <div className="px-4 py-2.5 flex items-center gap-3">
          <a href="/salon" className="p-1.5 rounded-lg" style={{ color: '#575d68' }} title="Voltar"><ArrowLeft size={17} /></a>
          <div className="min-w-0">
            <h1 className="font-bold text-[14px] leading-tight" style={{ color: '#14161b' }}>CRM · WhatsApp</h1>
            <p className="text-[11px]" style={{ color: '#868c97' }}>
              {conectado
                ? <>Conectado{canal.numero ? ` · ${telefoneBonito(canal.numero)}` : ''}</>
                : 'WhatsApp não conectado'}
            </p>
          </div>
          <div className="flex-1" />
          <SeloConexao canal={canal} />
          <button onClick={() => { puxarCanal(); puxarConversas() }} title="Atualizar"
            className="p-1.5 rounded-lg" style={{ color: '#575d68' }}><RefreshCw size={15} /></button>
        </div>
      </div>

      {!conectado ? (
        <TelaConexao canal={canal} onConectar={() => conectar('conectar')} />
      ) : (
        <div className="flex" style={{ height: 'calc(100vh - 53px)' }}>
          {/* ── Fila ── */}
          <aside className="w-[330px] flex-shrink-0 border-r flex flex-col" style={{ background: '#fff', borderColor: '#e5e5ea' }}>
            <div className="p-3 border-b" style={{ borderColor: '#e5e5ea' }}>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#868c97' }} />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-[12.5px] focus:outline-none"
                  style={{ background: '#f5f5f7', border: '1px solid #e5e5ea', color: '#14161b' }} />
              </div>
              <div className="flex gap-1 flex-wrap">
                <Aba ativo={filtro === 'fila'} onClick={() => setFiltro('fila')}
                  texto={`Preciso agir${contagem.fila ? ` (${contagem.fila})` : ''}`} destaque={contagem.criticas > 0} />
                <Aba ativo={filtro === 'aguardando'} onClick={() => setFiltro('aguardando')} texto={`Aguardando (${contagem.aguardando})`} />
                <Aba ativo={filtro === 'todas'} onClick={() => setFiltro('todas')} texto="Todas" />
              </div>
              {contagem.criticas > 0 && filtro === 'fila' && (
                <p className="mt-2 text-[11px] font-bold" style={{ color: '#b4322a' }}>
                  {contagem.criticas} esperando há mais de 1 hora
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {carregando && <p className="p-4 text-[12.5px]" style={{ color: '#868c97' }}>Carregando...</p>}
              {!carregando && visiveis.length === 0 && (
                <p className="p-4 text-[12.5px]" style={{ color: '#868c97' }}>
                  {filtro === 'fila' ? 'Nada esperando resposta. Fila limpa.' : 'Nenhuma conversa aqui.'}
                </p>
              )}
              {visiveis.map(c => (
                <ItemFila key={c.id} c={c} ativo={aberta?.id === c.id} onClick={() => abrirConversa(c)} />
              ))}
            </div>
          </aside>

          {/* ── Conversa ── */}
          <main className="flex-1 flex flex-col min-w-0" style={{ background: '#f5f5f7' }}>
            {!aberta ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[13px]" style={{ color: '#868c97' }}>Escolha uma conversa à esquerda.</p>
              </div>
            ) : (
              <>
                <CabecalhoConversa c={aberta} onEstado={mudarEstado}
                  fecharAberto={fecharAberto} setFecharAberto={setFecharAberto} motivos={motivos} />

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {mensagens.map(m => <Balao key={m.id} m={m} />)}
                  <div ref={fimDaConversa} />
                </div>

                <div className="border-t p-3" style={{ background: '#fff', borderColor: '#e5e5ea' }}>
                  {modelos.length > 0 && (
                    <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
                      {modelos.map(m => (
                        <button key={m.id} onClick={() => setTexto(m.texto)} title={m.texto}
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap flex-shrink-0"
                          style={{ background: '#efedfb', color: '#5b4fcf', border: '1px solid #5b4fcf25' }}>
                          {m.nome}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 items-end">
                    <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                      placeholder="Escreva a resposta... (Enter envia, Shift+Enter quebra linha)"
                      className="flex-1 px-3 py-2.5 rounded-xl text-[13px] resize-none focus:outline-none"
                      style={{ background: '#f5f5f7', border: '1px solid #e5e5ea', color: '#14161b' }} />
                    <button onClick={enviar} disabled={!texto.trim() || enviando}
                      className="px-4 py-2.5 rounded-xl font-bold text-[12.5px] flex items-center gap-1.5 disabled:opacity-40"
                      style={{ background: '#5b4fcf', color: '#fff' }}>
                      <Send size={14} />{enviando ? 'Enviando' : 'Enviar'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </main>

          {/* ── O que o NODRI já sabe ── */}
          {aberta && <PainelCliente c={aberta} />}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════

function SeloConexao({ canal }: { canal: any }) {
  const mapa: Record<string, { t: string; cor: string; fundo: string }> = {
    conectado:     { t: 'Conectado',    cor: '#2f6b4f', fundo: '#e6f1eb' },
    aguardando_qr: { t: 'Aguardando QR',cor: '#9a6b12', fundo: '#fbf1df' },
    conectando:    { t: 'Conectando',   cor: '#9a6b12', fundo: '#fbf1df' },
    caiu:          { t: 'Conexão caiu', cor: '#b4322a', fundo: '#fbebe9' },
    desconectado:  { t: 'Desconectado', cor: '#575d68', fundo: '#efeff2' },
  }
  let s = mapa[canal.situacao] || mapa.desconectado
  // Conectado no papel mas sem sinal da ponte é conexão caída. Dizer a verdade
  // aqui evita o salão descobrir pelo cliente que ficou sem resposta.
  if (canal.situacao === 'conectado' && canal.ponte_viva === false) s = mapa.caiu
  return (
    <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold"
      style={{ background: s.fundo, color: s.cor }}>{s.t}</span>
  )
}

function TelaConexao({ canal, onConectar }: { canal: any; onConectar: () => void }) {
  const esperandoQr = canal.situacao === 'aguardando_qr' || canal.situacao === 'conectando'
  return (
    <div className="max-w-lg mx-auto px-5 py-10">
      <div className="rounded-2xl border p-7" style={{ background: '#fff', borderColor: '#e5e5ea' }}>
        <h2 className="font-bold text-[19px] mb-1.5" style={{ color: '#14161b' }}>Conectar o WhatsApp do salão</h2>
        <p className="text-[13px] mb-5" style={{ color: '#575d68' }}>
          O número continua funcionando normalmente no celular, com os grupos. O CRM entra
          como mais um aparelho conectado — igual ao WhatsApp Web.
        </p>

        {canal.qr ? (
          <div className="text-center">
            <div className="inline-block p-3 rounded-xl" style={{ background: '#fff', border: '1px solid #e5e5ea' }}>
              {/* A ponte manda o QR já como imagem pronta. */}
              <img src={canal.qr} alt="QR code para conectar o WhatsApp" width={232} height={232} />
            </div>
            <p className="text-[12.5px] mt-4" style={{ color: '#575d68' }}>
              No celular: <strong>WhatsApp → Aparelhos conectados → Conectar aparelho</strong>
            </p>
            <p className="text-[11px] mt-1.5" style={{ color: '#868c97' }}>
              O código vira a cada minuto. Se sumir, ele aparece de novo sozinho.
            </p>
          </div>
        ) : esperandoQr ? (
          <div className="text-center py-8">
            <p className="text-[13px] font-bold" style={{ color: '#9a6b12' }}>Preparando o código...</p>
            <p className="text-[12px] mt-1.5" style={{ color: '#868c97' }}>
              Se demorar mais de um minuto, o serviço de conexão pode estar fora do ar.
            </p>
          </div>
        ) : (
          <button onClick={onConectar}
            className="w-full py-3 rounded-xl font-bold text-[13.5px] flex items-center justify-center gap-2"
            style={{ background: '#5b4fcf', color: '#fff' }}>
            <Link2 size={16} /> Gerar o QR code
          </button>
        )}

        {canal.erro && (
          <p className="mt-4 text-[12px] px-3 py-2 rounded-lg"
            style={{ background: '#fbebe9', color: '#b4322a' }}>{canal.erro}</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e5e5ea' }}>
        <h3 className="font-bold text-[13px] mb-2" style={{ color: '#14161b' }}>Como funciona</h3>
        <ol className="text-[12.5px] space-y-1.5 pl-4 list-decimal" style={{ color: '#575d68' }}>
          <li>Você escaneia uma vez. A conexão fica de pé sozinha.</li>
          <li>As conversas passam a aparecer aqui, organizadas por quem precisa de resposta.</li>
          <li>Quem escreve é sempre a recepção — o sistema não manda nada sozinho.</li>
          <li>Outro computador pode entrar no NODRI e trabalhar na mesma fila.</li>
        </ol>
      </div>
    </div>
  )
}

function Aba({ ativo, onClick, texto, destaque }: any) {
  return (
    <button onClick={onClick}
      className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition"
      style={ativo
        ? { background: '#5b4fcf', color: '#fff' }
        : { background: destaque ? '#fbebe9' : '#f5f5f7', color: destaque ? '#b4322a' : '#575d68' }}>
      {texto}
    </button>
  )
}

function ItemFila({ c, ativo, onClick }: any) {
  const est = estadoPor(c.estado)
  const ct = c.contato || {}
  const nome = ct.nome || ct.nome_agenda || ct.cliente_nome || telefoneBonito(ct.telefone)
  const urg = CORES_URGENCIA[c._urg as keyof typeof CORES_URGENCIA]
  const dono = donoAtivo(c.dono_ate) ? c.dono_nome : null
  return (
    <button onClick={onClick}
      className="w-full text-left px-3 py-2.5 border-b transition"
      style={{ borderColor: '#f0f0f3', background: ativo ? '#efedfb' : 'transparent' }}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: est.cor }} />
        <span className="font-bold text-[12.5px] truncate flex-1" style={{ color: '#14161b' }}>{nome}</span>
        {c.nao_lidas > 0 && (
          <span className="text-[9.5px] font-bold px-1.5 rounded-full flex-shrink-0"
            style={{ background: '#b4322a', color: '#fff' }}>{c.nao_lidas}</span>
        )}
      </div>
      <p className="text-[11.5px] truncate pl-3.5" style={{ color: '#868c97' }}>
        {c.ultima_de === 'salao' ? 'Você: ' : ''}{c.ultima_previa || '—'}
      </p>
      <div className="flex items-center gap-2 pl-3.5 mt-1">
        {est.naFila && c._min > 0 && (
          <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: urg.cor }}>
            <Clock size={9} />{tempoCurto(c._min)}
          </span>
        )}
        {dono && (
          <span className="text-[10px] flex items-center gap-1" style={{ color: '#5b4fcf' }}>
            <User size={9} />{dono}
          </span>
        )}
        {!est.naFila && (
          <span className="text-[10px]" style={{ color: est.cor }}>{est.rotulo}</span>
        )}
      </div>
    </button>
  )
}

function CabecalhoConversa({ c, onEstado, fecharAberto, setFecharAberto, motivos }: any) {
  const ct = c.contato || {}
  const nome = ct.nome || ct.nome_agenda || ct.cliente_nome || telefoneBonito(ct.telefone)
  const est = estadoPor(c.estado)
  return (
    <div className="border-b px-5 py-3" style={{ background: '#fff', borderColor: '#e5e5ea' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-bold text-[14px] leading-tight" style={{ color: '#14161b' }}>{nome}</p>
          <p className="text-[11.5px]" style={{ color: '#868c97' }}>{telefoneBonito(ct.telefone)}</p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold"
          style={{ background: est.fundo, color: est.cor }}>{est.rotulo}</span>
        <div className="flex-1" />
        <div className="flex gap-1.5 flex-wrap">
          <BotaoAcao onClick={() => onEstado('agendado')} cor="#2f6b4f" fundo="#e6f1eb" icone={<Check size={12} />} texto="Agendou" />
          <BotaoAcao onClick={() => onEstado('follow_up', { prazo: new Date(Date.now() + 864e5).toISOString() })}
            cor="#c2603a" fundo="#fbeee8" texto="Follow-up amanhã" />
          <BotaoAcao onClick={() => onEstado('pausada', { prazo: new Date(Date.now() + 7 * 864e5).toISOString() })}
            cor="#5b4fcf" fundo="#efedfb" texto="Pausar 7 dias" />
          <BotaoAcao onClick={() => setFecharAberto(!fecharAberto)} cor="#575d68" fundo="#efeff2"
            icone={fecharAberto ? <X size={12} /> : undefined} texto="Não fechou" />
        </div>
      </div>

      {c.proxima_acao && (
        <p className="text-[11.5px] mt-2" style={{ color: '#575d68' }}>
          <strong>Próxima ação:</strong> {c.proxima_acao}
        </p>
      )}

      {/* Fechar sem motivo é o que transforma "perdemos 40" em informação inútil. */}
      {fecharAberto && (
        <div className="mt-3 p-3 rounded-xl" style={{ background: '#f5f5f7' }}>
          <p className="text-[11.5px] font-bold mb-2" style={{ color: '#14161b' }}>Por que não fechou?</p>
          <div className="flex gap-1.5 flex-wrap">
            {motivos.map((m: any) => (
              <button key={m.id} onClick={() => onEstado('sem_conversao', { motivo_perda: m.nome })}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                style={{ background: '#fff', border: '1px solid #e5e5ea', color: '#575d68' }}>
                {m.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BotaoAcao({ onClick, cor, fundo, texto, icone }: any) {
  return (
    <button onClick={onClick}
      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
      style={{ background: fundo, color: cor }}>
      {icone}{texto}
    </button>
  )
}

function Balao({ m }: { m: Mensagem }) {
  const meu = m.direcao === 'saida'
  const hora = m.criado_em
    ? new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : ''
  return (
    <div className={`flex mb-2 ${meu ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[68%] px-3 py-2 rounded-2xl"
        style={{ background: meu ? '#5b4fcf' : '#fff', color: meu ? '#fff' : '#14161b',
                 border: meu ? 'none' : '1px solid #e5e5ea' }}>
        <p className="text-[13px] whitespace-pre-wrap break-words">{m.texto}</p>
        <p className="text-[9.5px] mt-1 text-right" style={{ opacity: 0.65 }}>
          {hora}
          {meu && m.situacao === 'na_fila' && ' · na fila'}
          {meu && m.situacao === 'falhou' && ' · falhou'}
          {meu && m.autor_nome ? ` · ${m.autor_nome}` : ''}
        </p>
      </div>
    </div>
  )
}

// ── O que o NODRI já sabe sobre quem está escrevendo ────────────────────────
// É esta coluna que separa o CRM de "mais uma caixa de entrada": nenhum CRM
// genérico consegue mostrar isso, porque o dado é do próprio sistema.
function PainelCliente({ c }: { c: Conversa }) {
  const [dados, setDados] = useState<any>(null)
  const ct = c.contato || {}
  const nomeBusca = ct.cliente_nome || ct.nome || ct.nome_agenda || ''

  useEffect(() => {
    let vivo = true
    setDados(null)
    if (!nomeBusca) return
    fetch(`/api/relatorios/cliente-detalhe?cliente=${encodeURIComponent(nomeBusca)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (vivo) setDados(d) })
      .catch(() => {})
    return () => { vivo = false }
  }, [nomeBusca])

  return (
    <aside className="w-[268px] flex-shrink-0 border-l overflow-y-auto"
      style={{ background: '#fff', borderColor: '#e5e5ea' }}>
      <div className="p-4">
        <h3 className="font-bold text-[12px] mb-3" style={{ color: '#14161b' }}>No sistema</h3>

        {!nomeBusca && (
          <p className="text-[11.5px]" style={{ color: '#868c97' }}>
            Contato ainda não ligado a uma cliente do relatório.
          </p>
        )}

        {nomeBusca && !dados && (
          <p className="text-[11.5px]" style={{ color: '#868c97' }}>Procurando o histórico...</p>
        )}

        {dados && (
          <div className="space-y-2.5">
            <Linha rotulo="Visitas" valor={dados.total_visitas ?? '—'} />
            <Linha rotulo="Última visita" valor={dados.ultima_visita || '—'} />
            <Linha rotulo="Já gastou" valor={dados.faturamento != null
              ? `R$ ${Number(dados.faturamento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} />
            <Linha rotulo="Frequência" valor={dados.freq_media_dias
              ? `a cada ${Math.round(dados.freq_media_dias)} dias` : '—'} />
            {Array.isArray(dados.servicos) && dados.servicos.length > 0 && (
              <div className="pt-2">
                <p className="text-[10.5px] font-bold mb-1" style={{ color: '#868c97' }}>COSTUMA FAZER</p>
                {dados.servicos.slice(0, 5).map((s: any, i: number) => (
                  <p key={i} className="text-[11.5px]" style={{ color: '#575d68' }}>
                    {s.nome} · {s.vezes}x
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {Array.isArray(ct.etiquetas) && ct.etiquetas.length > 0 && (
          <div className="mt-4 pt-3 border-t" style={{ borderColor: '#e5e5ea' }}>
            <p className="text-[10.5px] font-bold mb-1.5" style={{ color: '#868c97' }}>ETIQUETAS</p>
            <div className="flex gap-1 flex-wrap">
              {ct.etiquetas.map((e: string, i: number) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[10.5px] font-bold"
                  style={{ background: '#efedfb', color: '#5b4fcf' }}>{e}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: any }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-[11.5px]" style={{ color: '#868c97' }}>{rotulo}</span>
      <span className="text-[12px] font-bold text-right" style={{ color: '#14161b' }}>{valor}</span>
    </div>
  )
}
