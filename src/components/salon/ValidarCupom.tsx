'use client'

import { useState, useEffect } from 'react'
import {
  Ticket, Loader2, Check, X, Search, UserCheck, Settings2, AlertTriangle, Undo2, UserX,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Balcão do cupom de indicação ────────────────────────────────────────────
//
// Mora aqui, atrás de login, e não na página do cliente: se a validação
// ficasse na vitrine, a própria cliente validaria o cupom dela no celular.
//
// Duas coisas acontecem nesta tela:
//   · a indicada chega com um código  → "Validar"
//   · a dona do cupom vem se atender  → "Usar desconto de hoje"
//
// Quem segura a regra é o servidor. Aqui só se mostra o que ele respondeu.

interface Uso {
  id: string
  indicada_nome: string
  indicada_telefone: string
  situacao: string
  validado_em: string
  atendida_em: string | null
}
interface Credito { usado_em: string; origem: string }
interface Saldo {
  indicadas: number; compareceram: number; usados: number; saldo: number
}
interface Dados {
  achou: boolean
  erro?: string
  cupom?: { id: string; codigo: string; nome: string; telefone: string }
  vencida?: boolean
  validoAte?: string | null
  percentual?: number
  saldo?: Saldo
  usos?: Uso[]
  creditos?: Credito[]
}

function dataBR(iso?: string | null): string {
  if (!iso) return ''
  const d = String(iso).slice(0, 10).split('-')
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : ''
}

function fone(v: string): string {
  const d = String(v || '').replace(/\D+/g, '').replace(/^55/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return v
}

export default function ValidarCupom() {
  const [aberto, setAberto] = useState(false)
  const [cfg, setCfg] = useState<{ ativo: boolean; validoAte: string | null; percentual: number } | null>(null)
  const [mostrandoCfg, setMostrandoCfg] = useState(false)

  const [busca, setBusca] = useState('')
  const [dados, setDados] = useState<Dados | null>(null)
  const [buscando, setBuscando] = useState(false)

  const [nomeNovo, setNomeNovo] = useState('')
  const [foneNovo, setFoneNovo] = useState('')
  const [validando, setValidando] = useState(false)
  const [recusa, setRecusa] = useState<{ motivo: string; detalhe?: any } | null>(null)
  // Segunda etapa da validação: o cupom bate, mas a PESSOA precisa ser nova.
  // Conferido enquanto digita, não só no clique -- a recepção tem que saber
  // antes de prometer desconto à cliente que está na frente dela.
  const [conferindo, setConferindo] = useState(false)
  const [pessoa, setPessoa] = useState<{
    ok: boolean; motivo?: string; causa?: string
    ultimaVisita?: string | null; nomeConhecido?: string | null
    detalhe?: { data: string; donoNome: string }
  } | null>(null)

  useEffect(() => {
    if (!aberto || cfg) return
    fetch('/api/salon/cupons?acao=cfg')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setCfg(d?.cfg || null))
      .catch(() => null)
  }, [aberto, cfg])

  async function buscar() {
    const v = busca.trim()
    if (!v) return
    setBuscando(true); setRecusa(null); setDados(null); setPessoa(null)
    try {
      // Dígito é telefone; o resto é código. Assim a recepção usa um campo só,
      // seja para conferir o cupom que a cliente trouxe ou para achar o da
      // dona que veio se atender.
      const soDigito = /^[\d\s()+-]+$/.test(v)
      const q = soDigito ? `telefone=${encodeURIComponent(v)}` : `codigo=${encodeURIComponent(v)}`
      const r = await fetch(`/api/salon/cupons?${q}`)
      setDados(await r.json())
    } catch {
      toast.error('Não deu para consultar agora.')
    } finally {
      setBuscando(false)
    }
  }

  // Confere a PESSOA assim que o telefone fica completo. Sem debounce porque
  // só dispara quando o número tem tamanho de telefone -- não a cada tecla.
  async function conferirPessoa(fone: string) {
    if (!dados?.cupom) return
    const dig = fone.replace(/\D+/g, '')
    if (dig.length < 10) { setPessoa(null); return }
    setConferindo(true)
    try {
      const r = await fetch('/api/salon/cupons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'conferir', codigo: dados.cupom.codigo, telefone: fone }),
      })
      const j = await r.json()
      setPessoa(j)
      // O salão já conhece o nome desse telefone: poupa a recepção de digitar
      // e evita grafia diferente da que já está na ficha.
      if (j.nomeConhecido && !nomeNovo.trim()) setNomeNovo(j.nomeConhecido)
    } catch {
      setPessoa(null)
    } finally {
      setConferindo(false)
    }
  }

  async function validar() {
    if (!dados?.cupom) return
    setValidando(true); setRecusa(null)
    try {
      const r = await fetch('/api/salon/cupons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'validar', codigo: dados.cupom.codigo, nome: nomeNovo, telefone: foneNovo }),
      })
      const j = await r.json()
      if (!j.ok) { setRecusa({ motivo: j.motivo || 'Não foi possível validar.', detalhe: j.detalhe }); return }
      toast.success('Cupom validado')
      setNomeNovo(''); setFoneNovo(''); setPessoa(null)
      setDados({ ...dados, saldo: j.saldo, usos: j.usos, creditos: j.creditos })
    } finally {
      setValidando(false)
    }
  }

  async function gastar() {
    if (!dados?.cupom) return
    const r = await fetch('/api/salon/cupons', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'gastar', codigo: dados.cupom.codigo }),
    })
    const j = await r.json()
    if (!j.ok) { toast.error(j.motivo || 'Não deu certo.'); }
    else toast.success('Desconto de hoje registrado')
    if (j.saldo) setDados({ ...dados, saldo: j.saldo, usos: j.usos, creditos: j.creditos })
  }

  async function desfazer(usoId: string, nome: string) {
    if (!dados?.cupom) return
    if (!confirm(`Desfazer a validacao de ${nome}? O cupom volta a valer para ela.`)) return
    const r = await fetch('/api/salon/cupons', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'remover', usoId, codigo: dados.cupom.codigo }),
    })
    const j = await r.json()
    if (!j.ok) { toast.error(j.motivo || 'Nao deu certo.'); return }
    toast.success('Validacao desfeita')
    setDados({ ...dados, saldo: j.saldo, usos: j.usos, creditos: j.creditos })
  }

  async function salvarCfg(novo: any) {
    const r = await fetch('/api/salon/cupons', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novo),
    })
    const j = await r.json()
    if (!r.ok) { toast.error(j?.error || 'Não deu para salvar.'); return }
    setCfg(j.cfg); toast.success('Salvo')
  }

  const campo = 'w-full bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-nodri-cyan'

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)}
        className="nodri-card w-full p-3 mb-4 flex items-center gap-2.5 text-left hover:border-nodri-cyan transition">
        <Ticket size={17} className="text-nodri-cyan shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[13px]">Validar cupom de indicação</p>
          <p className="text-[11.5px] text-nodri-t3">
            Confira o código que a cliente trouxe e acompanhe quem indicou quem.
          </p>
        </div>
      </button>
    )
  }

  return (
    <div className="nodri-card p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Ticket size={16} className="text-nodri-cyan shrink-0" />
        <h3 className="font-bold text-[13px] flex-1">Cupom de indicação</h3>
        <button onClick={() => setMostrandoCfg(v => !v)}
          className={'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-bold border transition '
            + (mostrandoCfg
              ? 'border-nodri-cyan text-nodri-cyan'
              : 'border-nodri-border text-nodri-t2 hover:border-nodri-cyan hover:text-nodri-cyan')}>
          <Settings2 size={13} /> Configurar
        </button>
        <button onClick={() => setAberto(false)} className="text-nodri-t3 hover:text-nodri-t1 p-1"><X size={15} /></button>
      </div>

      {/* ── Configuração (só o dono consegue salvar; o servidor recusa o resto) ── */}
      {mostrandoCfg && cfg && (
        <div className="bg-nodri-surface border border-nodri-border rounded-lg p-3 mb-3 space-y-2.5">
          <label className="flex items-center gap-2 text-[12.5px]">
            <input type="checkbox" checked={cfg.ativo}
              onChange={e => salvarCfg({ ...cfg, ativo: e.target.checked })} />
            Mostrar a aba de cupom na página do cliente
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] text-nodri-t2">Válido até</span>
            <input type="date" value={cfg.validoAte || ''}
              onChange={e => setCfg({ ...cfg, validoAte: e.target.value })}
              onBlur={() => salvarCfg(cfg)}
              className="bg-nodri-card border border-nodri-border rounded px-2 py-1 text-[12.5px]" />
            <span className="text-[12.5px] text-nodri-t2 ml-2">Desconto</span>
            <input type="number" min={1} max={100} value={cfg.percentual}
              onChange={e => setCfg({ ...cfg, percentual: Number(e.target.value) })}
              onBlur={() => salvarCfg(cfg)}
              className="bg-nodri-card border border-nodri-border rounded px-2 py-1 w-16 text-[12.5px]" />
            <span className="text-[12.5px] text-nodri-t2">%</span>
          </div>
          <p className="text-[11px] text-nodri-t3 leading-relaxed">
            A data trava gerar e validar cupom. O crédito que a cliente já juntou
            não vence junto: ela usa depois do prazo.
          </p>
        </div>
      )}

      {/* Desligado, nada do que esta abaixo serve para a cliente -- ela nem
          consegue tirar cupom. Entao o aviso vem antes da busca, com o
          proprio botao que resolve. */}
      {cfg && !cfg.ativo && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5 mb-3">
          <AlertTriangle size={15} className="text-amber-500 shrink-0" />
          <p className="text-[12px] text-nodri-t2 flex-1">
            A aba de cupom ainda <b>não aparece</b> para a cliente.
          </p>
          <button onClick={() => salvarCfg({ ...cfg, ativo: true })}
            className="bg-nodri-cyan text-black px-3 py-1.5 rounded-lg text-[11.5px] font-bold shrink-0">
            Ligar agora
          </button>
        </div>
      )}

      {/* ── Busca ── */}
      <div className="flex gap-2 mb-3">
        <input value={busca} onChange={e => setBusca(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && buscar()}
          placeholder="Código do cupom ou celular da cliente"
          className={campo} />
        <button onClick={buscar} disabled={buscando || !busca.trim()}
          className="flex items-center gap-1.5 bg-nodri-cyan text-black px-4 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50 shrink-0">
          {buscando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Buscar
        </button>
      </div>

      {dados && !dados.achou && (
        <p className="text-[12.5px] text-nodri-t3 bg-nodri-surface rounded-lg px-3 py-2.5">{dados.erro}</p>
      )}

      {dados?.achou && dados.cupom && dados.saldo && (
        <div className="space-y-3">
          {/* Verde grande: é o sinal que a recepção lê de longe, no balcão. */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Check size={16} className="text-green-500 shrink-0" />
              <span className="font-bold text-[13px] text-green-500">Cupom válido</span>
              <span className="font-mono text-[12px] text-nodri-t2 ml-auto">{dados.cupom.codigo}</span>
            </div>
            <p className="text-[14px] font-bold">{dados.cupom.nome}</p>
            <p className="text-[11.5px] text-nodri-t3">{fone(dados.cupom.telefone)}</p>
          </div>

          {dados.vencida && (
            <p className="flex items-start gap-2 text-[12px] text-amber-500 bg-amber-500/10 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              A campanha encerrou em {dataBR(dados.validoAte)}. Não dá para validar
              cupom novo, mas o crédito que ela já tem continua valendo.
            </p>
          )}

          {/* ── Placar ──
              Eram quatro quadros, com "Indicou" e "Vieram" sempre iguais: o
              sistema so conhece quem APARECEU no balcao -- nao existe lugar
              onde a dona cadastre as pessoas para quem mandou o codigo. Dois
              numeros iguais lado a lado so fazem duvidar dos dois. */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Vieram', dados.saldo.compareceram],
              ['Usados', dados.saldo.usados],
              ['Saldo', dados.saldo.saldo],
            ].map(([rot, n], i) => (
              <div key={rot as string}
                className={'rounded-lg py-2.5 ' + (i === 2 ? 'bg-nodri-cyan/10 border border-nodri-cyan/30' : 'bg-nodri-surface')}>
                <p className={'font-bold text-[21px] ' + (i === 2 ? 'text-nodri-cyan' : '')}>{n as number}</p>
                <p className="text-[10.5px] text-nodri-t3">{rot as string}</p>
              </div>
            ))}
          </div>

          {dados.saldo.saldo > 0 && (
            <button onClick={gastar}
              className="w-full bg-nodri-cyan text-black py-2.5 rounded-lg text-[12.5px] font-bold">
              {dados.cupom.nome.split(' ')[0]} está se atendendo — usar {dados.percentual}% hoje
            </button>
          )}

          {/* ── Validar quem chegou com o cupom ── */}
          {!dados.vencida && (
            <div className="border-t border-nodri-border pt-3">
              <p className="text-[12px] font-bold mb-2 flex items-center gap-1.5">
                <UserCheck size={14} className="text-nodri-cyan" /> Quem veio com este cupom
              </p>
              <div className="grid sm:grid-cols-2 gap-2 mb-2">
                <input value={nomeNovo} onChange={e => setNomeNovo(e.target.value)}
                  placeholder="Nome completo da cliente" className={campo} />
                <input value={foneNovo}
                  onChange={e => { setFoneNovo(e.target.value); setPessoa(null) }}
                  onBlur={e => conferirPessoa(e.target.value)}
                  placeholder="Celular com DDD" inputMode="tel" className={campo} />
              </div>

              {/* ── Segunda etapa: a PESSOA ──
                  O cupom bater não basta. A regra é primeira visita, então
                  quem decide é a ficha da cliente -- e a resposta precisa
                  trazer a DATA, que é o que encerra a conversa no balcão. */}
              {conferindo && (
                <p className="flex items-center gap-2 text-[12px] text-nodri-t3 mb-2">
                  <Loader2 size={13} className="animate-spin" /> Conferindo a cliente…
                </p>
              )}
              {pessoa && !conferindo && (
                pessoa.ok ? (
                  <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2.5 mb-2">
                    <Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-bold text-green-500">Primeira vez no salão</p>
                      <p className="text-[11.5px] text-nodri-t3">
                        Nenhum atendimento no histórico. O desconto vale.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 mb-2">
                    <UserX size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] font-bold text-red-400">
                        {pessoa.causa === 'ja_cliente' ? 'Cliente já cadastrada' : 'Cupom inválido para esta cliente'}
                      </p>
                      <p className="text-[11.5px] text-nodri-t2">{pessoa.motivo}</p>
                      {pessoa.nomeConhecido && (
                        <p className="text-[11.5px] text-nodri-t3 mt-0.5">Na ficha: {pessoa.nomeConhecido}</p>
                      )}
                      {pessoa.ultimaVisita && (
                        <p className="text-[11.5px] text-nodri-t3">
                          Última visita em <b>{dataBR(pessoa.ultimaVisita)}</b>
                        </p>
                      )}
                      {pessoa.detalhe?.data && (
                        <p className="text-[11.5px] text-nodri-t3">
                          Usou cupom em {dataBR(pessoa.detalhe.data)}
                          {pessoa.detalhe.donoNome && <> · indicada por {pessoa.detalhe.donoNome}</>}
                        </p>
                      )}
                    </div>
                  </div>
                )
              )}

              {recusa && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 mb-2">
                  <p className="text-[12.5px] text-red-400 font-semibold">{recusa.motivo}</p>
                  {recusa.detalhe?.data && (
                    <p className="text-[11.5px] text-nodri-t3 mt-0.5">
                      Usou em {dataBR(recusa.detalhe.data)}
                      {recusa.detalhe.donoNome && <> · indicada por {recusa.detalhe.donoNome}</>}
                    </p>
                  )}
                </div>
              )}

              {/* Travado enquanto a pessoa não passa na conferência: deixar
                  clicável só para o servidor recusar seria ensinar a recepção
                  a tentar e ver no que dá, na frente da cliente.
                  
                  Mas botão apagado sem dizer o motivo prende quem está no
                  balcão: o dono ficou com a tela verde, o botão morto e
                  nenhuma pista de que faltava o nome. Então o próprio botão
                  diz o que falta. */}
              {(() => {
                const semNome = nomeNovo.trim().length < 3
                const semFone = foneNovo.replace(/\D+/g, '').length < 10
                const recusada = !!pessoa && !pessoa.ok
                const travado = validando || conferindo || semNome || semFone || recusada
                const rotulo =
                  validando ? null
                  : conferindo ? 'Conferindo…'
                  : recusada ? 'Esta cliente não pode usar o cupom'
                  : semFone && semNome ? 'Preencha o nome e o celular da cliente'
                  : semFone ? 'Falta o celular da cliente'
                  : semNome ? 'Falta o nome da cliente'
                  : 'Validar e dar o desconto'
                return (
                  <button onClick={validar} disabled={travado}
                    className={'w-full py-2.5 rounded-lg text-[12.5px] font-bold border transition '
                      + (travado
                        ? 'border-nodri-border text-nodri-t3'
                        : 'border-nodri-cyan text-nodri-cyan hover:bg-nodri-cyan/10')}>
                    {validando ? <Loader2 size={14} className="animate-spin mx-auto" /> : rotulo}
                  </button>
                )
              })()}
            </div>
          )}

          {/* ── Extrato ──
              Uma linha do tempo so, no lugar de duas listas. E o que a
              recepcao mostra quando a dona diz "indiquei dez e voce nao
              contou nenhuma": da para ler o que entrou e o que saiu, em
              ordem, com data. */}
          {(!!dados.usos?.length || !!dados.creditos?.length) && (
            <div className="border-t border-nodri-border pt-3">
              <p className="text-[11.5px] text-nodri-t3 mb-1.5">Extrato</p>
              <div className="space-y-1">
                {[
                  ...(dados.usos || []).map(u => ({
                    tipo: 'veio' as const,
                    data: String(u.atendida_em || u.validado_em || '').slice(0, 10),
                    texto: `${u.indicada_nome} veio com o cupom`,
                    situacao: u.situacao,
                    id: u.id,
                    nome: u.indicada_nome,
                  })),
                  ...(dados.creditos || []).map(c => ({
                    tipo: 'usou' as const,
                    data: String(c.usado_em).slice(0, 10),
                    texto: `${dados.cupom!.nome.split(' ')[0]} usou o desconto`,
                    situacao: c.origem,
                    id: '',
                    nome: '',
                  })),
                ]
                  .sort((a, b) => b.data.localeCompare(a.data))
                  .map((l, i) => {
                    const fora = l.tipo === 'veio' && l.situacao === 'nao_compareceu'
                    return (
                      <div key={i} className="flex items-center gap-2 text-[12px] bg-nodri-surface rounded px-2.5 py-1.5">
                        <span className="text-nodri-t3 text-[11px] shrink-0 w-[42px]">{dataBR(l.data).slice(0, 5)}</span>
                        <span className={'flex-1 min-w-0 truncate ' + (fora ? 'line-through text-nodri-t3' : '')}>
                          {l.texto}
                        </span>
                        {l.tipo === 'veio' && l.situacao === 'presumida' && (
                          <span className="text-[10px] text-nodri-t3 shrink-0" title="Ainda nao conferido com a comanda">
                            a conferir
                          </span>
                        )}
                        {l.tipo === 'usou' && l.situacao === 'automatico' && (
                          <span className="text-[10px] text-nodri-t3 shrink-0">auto</span>
                        )}
                        <span className={'font-bold text-[12px] shrink-0 w-[22px] text-right '
                          + (fora ? 'text-nodri-t3' : l.tipo === 'veio' ? 'text-green-500' : 'text-nodri-t2')}>
                          {fora ? '0' : l.tipo === 'veio' ? '+1' : '\u22121'}
                        </span>
                        {l.tipo === 'veio' && !fora && (
                          <button onClick={() => desfazer(l.id, l.nome)} title="Desfazer esta validacao"
                            className="text-nodri-t3 hover:text-red-400 shrink-0"><Undo2 size={13} /></button>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
