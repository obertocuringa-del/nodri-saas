'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Loader2, Plus, Trash2 } from 'lucide-react'
import type { Curriculo } from '@/lib/curriculosShared'

// ── Mensagem para vários candidatos: mensagens diferentes + ritmo de envio ──
//
// O dono cadastra quantas mensagens quiser; o sistema reveza, sem repetir o
// mesmo texto em duas pessoas seguidas, e varia a saudação quando faltam
// mensagens. O RITMO é a mesma sistemática do Envio automático: janela de
// horário, uma mensagem a cada X minutos, máximo por dia e dias da semana.
// Cada mensagem fica agendada para o seu horário e sai sozinha, sem ninguém
// precisar clicar de novo -- é isso, junto com a variação, que protege o número
// do WhatsApp. Nada é agendado sem o clique em Agendar o envio.

const COR = '#5b4fcf'
const LIMITE = 100

// Modelos de partida (valem para "Pedir currículo" e para "Enviar mensagem"). Sem nome de salão.
const MODELOS_PEDIDO = [
  'Olá, {nome}! Tudo bem? Vimos que você se interessou pela vaga de {vaga}. Pode nos enviar o seu currículo por aqui, em PDF ou foto?',
  'Oi, {nome}! Recebemos o seu cadastro para {vaga}. Para seguirmos, poderia mandar o seu currículo por aqui mesmo?',
  'Olá, {nome}, tudo bem? Sobre a vaga de {vaga}: pode nos enviar o seu currículo atualizado? Pode ser PDF ou foto.',
  'Oi, {nome}! Gostaríamos de conhecer melhor o seu perfil para a vaga de {vaga}. Consegue enviar o seu currículo por aqui?',
  'Olá, {nome}! Para avançarmos com a sua candidatura a {vaga}, precisamos do seu currículo. Pode mandar por aqui?',
]

interface Ritmo { janela_ini: string; janela_fim: string; intervalo_min: number; max_dia: number; dias_semana: number[] }
const RITMO_INICIAL: Ritmo = { janela_ini: '09:00', janela_fim: '20:00', intervalo_min: 20, max_dia: 20, dias_semana: [1, 2, 3, 4, 5, 6] }
// 0 = domingo ... 6 = sábado (igual ao Envio automático)
const DIAS = [[1, 'seg'], [2, 'ter'], [3, 'qua'], [4, 'qui'], [5, 'sex'], [6, 'sáb'], [0, 'dom']] as const
const NOME_DIA: Record<number, string> = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sáb' }

function resumoDosDias(d: number[]): string {
  const ord = [1, 2, 3, 4, 5, 6, 0].filter(x => d.includes(x))
  if (ord.length === 7) return 'todos os dias'
  // faixa seguida (seg a sáb) ou lista
  const emSequencia = ord.every((x, i) => i === 0 || ((ord[i - 1] + 1) % 7 === x))
  if (ord.length >= 3 && emSequencia) return `${NOME_DIA[ord[0]]} a ${NOME_DIA[ord[ord.length - 1]]}`
  return ord.map(x => NOME_DIA[x]).join(', ')
}

export default function LoteCurriculos({ onFechar, onEnviado, candidatos, vagas, marcados, jaTemConversa, pedirCurriculo, contatosDe, episodioDias }: {
  onFechar: () => void
  onEnviado: () => void
  candidatos: Curriculo[]
  vagas: string[]
  marcados: string[]
  jaTemConversa: (c: Curriculo) => boolean
  pedirCurriculo: boolean
  /** Quantas vezes já se entrou em contato com o candidato (episódios de conversa). */
  contatosDe: (c: Curriculo) => number
  episodioDias: number
}) {
  const [modo, setModo] = useState<'marcados' | 'vaga'>(marcados.length && !pedirCurriculo ? 'marcados' : 'vaga')
  const [vaga, setVaga] = useState(vagas[0] || '')
  // Quem receber, pelo número de vezes que já foi contatado.
  const [faixa, setFaixa] = useState<'todos' | 'nunca' | 'um' | 'dois' | 'tres'>('todos')
  const [modelos, setModelos] = useState<string[]>(MODELOS_PEDIDO)
  const [ritmo, setRitmo] = useState<Ritmo>(RITMO_INICIAL)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<null | { enviados: number; variados: boolean; primeira: string; ultima: string; dias: number; pulados: { nome: string; motivo: string }[] }>(null)

  // Carrega as mensagens e o ritmo que o salão já usou. Sem mensagens salvas, parte dos modelos prontos
  // (nos dois botões: Pedir currículo e Enviar mensagem).
  useEffect(() => {
    fetch('/api/crm/curriculos', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const salvos: string[] = d?.config?.modelos || []
        setModelos(salvos.length ? salvos : MODELOS_PEDIDO)
        if (d?.config?.ritmo) setRitmo({ ...RITMO_INICIAL, ...d.config.ritmo })
      }).catch(() => {})
  }, [])

  // Quem recebe: os marcados, ou a vaga inteira (quem ainda não foi chamado vai primeiro).
  const base = useMemo(() => {
    if (modo === 'marcados') return candidatos.filter(c => marcados.includes(c.id))
    const daVaga = candidatos.filter(c => c.vaga === vaga)
    return [...daVaga].sort((a, b) => Number(jaTemConversa(a)) - Number(jaTemConversa(b)))
  }, [modo, vaga, candidatos, marcados, jaTemConversa])
  const naFaixa = (c: Curriculo, f: typeof faixa) => {
    const n = contatosDe(c)
    return f === 'todos' ? true : f === 'nunca' ? n === 0 : f === 'um' ? n === 1 : f === 'dois' ? n === 2 : n >= 3
  }
  const FAIXAS = [['todos', 'Todos'], ['nunca', 'Nunca contatados'], ['um', 'Contatados 1 vez'], ['dois', 'Contatados 2 vezes'], ['tres', 'Contatados 3 ou mais']] as const
  const destinatarios = useMemo(() => base.filter(c => naFaixa(c, faixa)), [base, faixa, contatosDe])   // eslint-disable-line react-hooks/exhaustive-deps

  const vaiReceber = destinatarios.slice(0, LIMITE)
  const preenchidos = modelos.map(m => m.trim()).filter(Boolean)
  const setR = (p: Partial<Ritmo>) => setRitmo(r => ({ ...r, ...p }))
  const alternarDia = (d: number) => setR({ dias_semana: ritmo.dias_semana.includes(d) ? ritmo.dias_semana.filter(x => x !== d) : [...ritmo.dias_semana, d] })

  const ritmoValido = ritmo.janela_fim > ritmo.janela_ini && ritmo.intervalo_min >= 2 && ritmo.max_dia >= 1 && ritmo.dias_semana.length > 0
  const frase = `das ${ritmo.janela_ini} às ${ritmo.janela_fim}, uma a cada ${ritmo.intervalo_min} min, até ${ritmo.max_dia} por dia, ${resumoDosDias(ritmo.dias_semana)}`
  const diasNecessarios = Math.ceil(vaiReceber.length / Math.max(1, ritmo.max_dia))

  const enviar = async () => {
    setEnviando(true); setErro('')
    try {
      const r = await fetch('/api/crm/curriculos', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'enviar', ids: vaiReceber.map(c => c.id), modelos: preenchidos, ritmo }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setErro(d?.error || 'Não foi possível agendar.'); return }
      setResultado({ enviados: d.enviados, variados: !!d.variados, primeira: d.primeira || '', ultima: d.ultima || '', dias: d.dias || 0, pulados: d.pulados || [] })
      onEnviado()
    } catch { setErro('Sem conexão com o servidor.') } finally { setEnviando(false) }
  }

  const primeiro = vaiReceber[0]
  const previa = primeiro && preenchidos[0]
    ? preenchidos[0].replace(/\{nome\}/gi, primeiro.nome.trim().split(/\s+/)[0]).replace(/\{vaga\}/gi, primeiro.vaga)
    : ''

  const campo = 'px-2 py-1.5 rounded-lg text-[13px] border'
  const bordaCampo = { borderColor: '#e6e3f2' }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(20,16,14,.55)' }}>
      <div className="w-full max-w-2xl rounded-2xl flex flex-col" style={{ background: '#fff', color: '#2b2320', maxHeight: '92vh' }}>
        <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: '#e9ddd6' }}>
          <p className="font-bold text-[16px] flex-1">{pedirCurriculo ? 'Pedir currículo' : 'Mensagem para candidatos'}</p>
          <button onClick={onFechar} aria-label="Fechar" className="p-2 rounded-lg"><X size={18} /></button>
        </div>

        {resultado ? (
          <div className="p-5 space-y-3">
            <p className="font-bold text-[15px]">Envio agendado</p>
            <p className="text-[13px]">
              {resultado.enviados} mensagem{resultado.enviados === 1 ? '' : 'ns'} {resultado.enviados === 1 ? 'foi agendada' : 'foram agendadas'} no ritmo escolhido, pelo WhatsApp do salão.
              {resultado.primeira && <> A primeira sai <strong>{resultado.primeira}</strong>{resultado.enviados > 1 && <>; a última, <strong>{resultado.ultima}</strong> ({resultado.dias} dia{resultado.dias === 1 ? '' : 's'})</>}.</>}
              {' '}As respostas aparecem na conversa de cada candidato. Para cancelar o que ainda não saiu, use o aviso de mensagens agendadas na tela de Currículos.
            </p>
            {resultado.variados && (
              <p className="text-[12px] rounded-lg p-3" style={{ background: '#fffbeb', color: '#78350f' }}>
                Havia menos mensagens do que pessoas, então o sistema variou a saudação e o fecho das repetidas. Cadastrando mais mensagens, a variação fica ainda maior.
              </p>
            )}
            {resultado.pulados.length > 0 && (
              <div className="text-[12px] rounded-lg p-3" style={{ background: '#fffbeb', color: '#78350f' }}>
                <p className="font-bold mb-1">Não agendadas:</p>
                {resultado.pulados.map((p, i) => <p key={i}>{p.nome}: {p.motivo}</p>)}
              </div>
            )}
            <div className="flex justify-end"><button onClick={onFechar} className="px-4 py-2 rounded-lg text-[13px] font-bold" style={{ background: COR, color: '#fff' }}>Fechar</button></div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: '#6e625c' }}>Para quem</p>
                <div className="flex gap-2 flex-wrap items-center">
                  {marcados.length > 0 && (
                    <button onClick={() => setModo('marcados')} className="px-3 py-1.5 rounded-lg text-[12px] font-bold border"
                      style={{ background: modo === 'marcados' ? COR : '#fff', color: modo === 'marcados' ? '#fff' : COR, borderColor: COR + '55' }}>Os {marcados.length} marcados</button>
                  )}
                  <button onClick={() => setModo('vaga')} className="px-3 py-1.5 rounded-lg text-[12px] font-bold border"
                    style={{ background: modo === 'vaga' ? COR : '#fff', color: modo === 'vaga' ? '#fff' : COR, borderColor: COR + '55' }}>Uma vaga inteira</button>
                  {modo === 'vaga' && (
                    <select value={vaga} onChange={e => setVaga(e.target.value)} className={campo} style={bordaCampo}>
                      {vagas.map(v => <option key={v} value={v}>{v} ({candidatos.filter(c => c.vaga === v).length})</option>)}
                    </select>
                  )}
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wide mt-3 mb-1.5" style={{ color: '#6e625c' }}>Quem receber</p>
                <div className="flex gap-2 flex-wrap items-center">
                  {FAIXAS.map(([k, nome]) => {
                    const qtd = base.filter(c => naFaixa(c, k)).length
                    return (
                      <button key={k} onClick={() => setFaixa(k)} className="px-3 py-1.5 rounded-lg text-[12px] font-bold border"
                        style={{ background: faixa === k ? COR : '#fff', color: faixa === k ? '#fff' : COR, borderColor: COR + '55' }}>{nome} ({qtd})</button>
                    )
                  })}
                </div>
                <p className="text-[11px] mt-1.5" style={{ color: '#6e625c' }}>
                  Cada contato é um episódio de conversa: mensagens com menos de {episodioDias} dias entre si contam como um só.
                </p>
                <p className="text-[12px] mt-1.5" style={{ color: destinatarios.length > LIMITE ? '#b45309' : '#6e625c' }}>
                  {vaiReceber.length === 0 ? 'Nenhum candidato nesta escolha.'
                    : destinatarios.length > LIMITE
                      ? `${destinatarios.length} candidatos: cada pedido leva até ${LIMITE} (quem ainda não foi chamado vai primeiro). Repita depois para o restante.`
                      : `${vaiReceber.length} candidato(s) vão receber.`}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide flex-1" style={{ color: '#6e625c' }}>Mensagens ({preenchidos.length})</p>
                  <button onClick={() => setModelos(MODELOS_PEDIDO)} className="text-[11.5px] font-bold underline" style={{ color: COR }}>usar os modelos prontos de pedido de currículo</button>
                </div>
                <p className="text-[11.5px] mb-2" style={{ color: '#6e625c' }}>
                  Use <strong>{'{nome}'}</strong> (primeiro nome) e <strong>{'{vaga}'}</strong>. O sistema reveza as mensagens: duas pessoas seguidas nunca recebem o mesmo texto.
                  Quanto mais mensagens, mais seguro para o número do WhatsApp.
                </p>
                <div className="space-y-2">
                  {modelos.map((m, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <textarea value={m} rows={2} onChange={e => setModelos(l => l.map((x, k) => k === i ? e.target.value : x))}
                        placeholder={`Mensagem ${i + 1}`}
                        className="flex-1 px-3 py-2 rounded-lg text-[13px] border" style={{ ...bordaCampo, background: '#faf9fe' }} />
                      {modelos.length > 1 && (
                        <button onClick={() => setModelos(l => l.filter((_, k) => k !== i))} aria-label="Remover mensagem" className="p-2 rounded-lg" style={{ color: '#b91c1c' }}><Trash2 size={15} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setModelos(l => [...l, ''])} disabled={modelos.length >= 40}
                  className="mt-2 flex items-center gap-1.5 text-[12px] font-bold disabled:opacity-50" style={{ color: COR }}><Plus size={14} /> Adicionar outra mensagem</button>
                {previa && <p className="mt-3 text-[12px] rounded-lg p-2" style={{ background: '#f4f2fc', color: '#4a4760' }}><strong>Prévia:</strong> {previa}</p>}
                {preenchidos.length > 0 && vaiReceber.length > preenchidos.length && (
                  <p className="mt-2 text-[12px]" style={{ color: '#b45309' }}>
                    Há {vaiReceber.length} pessoas e {preenchidos.length} mensagem(ns): o sistema vai variar a saudação e o fecho das repetidas.
                  </p>
                )}
              </div>

              {/* Ritmo de envio: a mesma sistemática do Envio automático */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: '#faf9fe', border: '1px solid #e6e3f2' }}>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#6e625c' }}>Ritmo de envio (proteção contra bloqueio)</p>
                  <p className="text-[11.5px] mt-0.5" style={{ color: '#6e625c' }}>
                    É a mesma sistemática de segurança do Envio automático pelo WhatsApp: mensagens diferentes, espaço entre uma e outra, horário e limite por dia.
                    Cada mensagem sai sozinha no seu horário, e o sistema varia um pouco o tempo para não parecer robô.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="text-[11.5px] flex flex-col gap-1" style={{ color: '#6e625c' }}>Horário inicial
                    <input type="time" value={ritmo.janela_ini} onChange={e => setR({ janela_ini: e.target.value })} className={campo} style={bordaCampo} />
                  </label>
                  <label className="text-[11.5px] flex flex-col gap-1" style={{ color: '#6e625c' }}>Horário final
                    <input type="time" value={ritmo.janela_fim} onChange={e => setR({ janela_fim: e.target.value })} className={campo} style={bordaCampo} />
                  </label>
                  <label className="text-[11.5px] flex flex-col gap-1" style={{ color: '#6e625c' }}>Uma a cada (min)
                    <input type="number" min={2} max={720} value={ritmo.intervalo_min} onChange={e => setR({ intervalo_min: Math.max(0, Number(e.target.value) || 0) })} className={campo} style={bordaCampo} />
                  </label>
                  <label className="text-[11.5px] flex flex-col gap-1" style={{ color: '#6e625c' }}>Máximo por dia
                    <input type="number" min={1} max={100} value={ritmo.max_dia} onChange={e => setR({ max_dia: Math.max(0, Number(e.target.value) || 0) })} className={campo} style={bordaCampo} />
                  </label>
                </div>
                <div>
                  <p className="text-[11.5px] mb-1" style={{ color: '#6e625c' }}>Dias de envio</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {DIAS.map(([d, nome]) => {
                      const on = ritmo.dias_semana.includes(d)
                      return (
                        <button key={d} onClick={() => alternarDia(d)} className="px-3 py-1 rounded-full text-[12px] font-bold border"
                          style={{ background: on ? COR : '#fff', color: on ? '#fff' : '#4a4760', borderColor: on ? COR : '#e6e3f2' }}>{nome}</button>
                      )
                    })}
                  </div>
                </div>
                <p className="text-[12px] font-bold" style={{ color: ritmoValido ? '#2b2320' : '#b91c1c' }}>
                  {ritmoValido
                    ? `Resumo: ${frase}.${vaiReceber.length > 0 ? ` Para ${vaiReceber.length} pessoa(s), são cerca de ${diasNecessarios} dia(s) de envio.` : ''}`
                    : 'Confira: o horário final precisa ser depois do inicial, o intervalo de pelo menos 2 minutos e ao menos um dia marcado.'}
                </p>
              </div>
              {!!erro && <p className="text-[12.5px] font-bold px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#b91c1c' }}>{erro}</p>}
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2" style={{ borderColor: '#e9ddd6' }}>
              <button onClick={onFechar} disabled={enviando} className="px-4 py-2 rounded-lg text-[13px] font-bold border" style={bordaCampo}>Cancelar</button>
              <button onClick={enviar} disabled={enviando || !vaiReceber.length || !preenchidos.length || !ritmoValido}
                className="px-4 py-2 rounded-lg text-[13px] font-bold disabled:opacity-50 flex items-center gap-2" style={{ background: COR, color: '#fff' }}>
                {enviando && <Loader2 size={14} className="animate-spin" />} Agendar o envio para {vaiReceber.length}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
