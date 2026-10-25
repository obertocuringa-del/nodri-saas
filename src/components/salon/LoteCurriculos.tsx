'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Loader2, Plus, Trash2 } from 'lucide-react'
import type { Curriculo } from '@/lib/curriculosShared'
import { chaveTelefone, normalizarTelefone } from '@/lib/crm'

// ── Mensagem para vários candidatos, com muitas mensagens diferentes ────────
//
// O dono cadastra quantas mensagens quiser; o sistema reveza, sem repetir o
// mesmo texto em duas pessoas seguidas, e varia a saudação quando faltam
// mensagens. O envio é espaçado (25 a 45 s) e limitado (20 por vez, 40 por dia):
// é a variação JUNTO com o espaçamento que protege o número do WhatsApp.
// Nada sai sem o clique de Enviar.

const COR = '#5b4fcf'
const LIMITE = 20

// Modelos de partida para "Pedir currículo". Sem nome de salão: valem para qualquer um.
const MODELOS_PEDIDO = [
  'Olá, {nome}! Tudo bem? Vimos que você se interessou pela vaga de {vaga}. Pode nos enviar o seu currículo por aqui, em PDF ou foto?',
  'Oi, {nome}! Recebemos o seu cadastro para {vaga}. Para seguirmos, poderia mandar o seu currículo por aqui mesmo?',
  'Olá, {nome}, tudo bem? Sobre a vaga de {vaga}: pode nos enviar o seu currículo atualizado? Pode ser PDF ou foto.',
  'Oi, {nome}! Gostaríamos de conhecer melhor o seu perfil para a vaga de {vaga}. Consegue enviar o seu currículo por aqui?',
  'Olá, {nome}! Para avançarmos com a sua candidatura a {vaga}, precisamos do seu currículo. Pode mandar por aqui?',
]

export default function LoteCurriculos({ onFechar, onEnviado, candidatos, vagas, marcados, jaTemConversa, pedirCurriculo }: {
  onFechar: () => void
  onEnviado: () => void
  candidatos: Curriculo[]
  vagas: string[]
  marcados: string[]
  jaTemConversa: (c: Curriculo) => boolean
  pedirCurriculo: boolean
}) {
  const [modo, setModo] = useState<'marcados' | 'vaga'>(marcados.length && !pedirCurriculo ? 'marcados' : 'vaga')
  const [vaga, setVaga] = useState(vagas[0] || '')
  const [modelos, setModelos] = useState<string[]>([''])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<null | { enviados: number; minutos: number; variados: boolean; pulados: { nome: string; motivo: string }[] }>(null)

  // Carrega as mensagens que o salão já cadastrou; se não há, parte dos modelos de pedido.
  useEffect(() => {
    fetch('/api/crm/curriculos', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const salvos: string[] = d?.config?.modelos || []
        setModelos(pedirCurriculo ? (salvos.length ? salvos : MODELOS_PEDIDO) : (salvos.length ? salvos : ['']))
      }).catch(() => setModelos(pedirCurriculo ? MODELOS_PEDIDO : ['']))
  }, [pedirCurriculo])

  // Quem recebe: os marcados, ou a vaga inteira (quem ainda não foi chamado primeiro, no máximo 20).
  const destinatarios = useMemo(() => {
    if (modo === 'marcados') return candidatos.filter(c => marcados.includes(c.id))
    const daVaga = candidatos.filter(c => c.vaga === vaga)
    const ordem = [...daVaga].sort((a, b) => Number(jaTemConversa(a)) - Number(jaTemConversa(b)))
    return ordem
  }, [modo, vaga, candidatos, marcados, jaTemConversa])

  const vaiReceber = destinatarios.slice(0, LIMITE)
  const preenchidos = modelos.map(m => m.trim()).filter(Boolean)

  const enviar = async () => {
    setEnviando(true); setErro('')
    try {
      const r = await fetch('/api/crm/curriculos', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'enviar', ids: vaiReceber.map(c => c.id), modelos: preenchidos }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setErro(d?.error || 'Não foi possível enviar.'); return }
      setResultado({ enviados: d.enviados, minutos: d.minutos, variados: !!d.variados, pulados: d.pulados || [] })
      onEnviado()
    } catch { setErro('Sem conexão com o servidor.') } finally { setEnviando(false) }
  }

  const primeiro = vaiReceber[0]
  const previa = primeiro && preenchidos[0]
    ? preenchidos[0].replace(/\{nome\}/gi, primeiro.nome.trim().split(/\s+/)[0]).replace(/\{vaga\}/gi, primeiro.vaga)
    : ''

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(20,16,14,.55)' }}>
      <div className="w-full max-w-2xl rounded-2xl flex flex-col" style={{ background: '#fff', color: '#2b2320', maxHeight: '92vh' }}>
        <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: '#e9ddd6' }}>
          <p className="font-bold text-[16px] flex-1">{pedirCurriculo ? 'Pedir currículo' : 'Mensagem para candidatos'}</p>
          <button onClick={onFechar} aria-label="Fechar" className="p-2 rounded-lg"><X size={18} /></button>
        </div>

        {resultado ? (
          <div className="p-5 space-y-3">
            <p className="font-bold text-[15px]">Mensagens na fila</p>
            <p className="text-[13px]">
              {resultado.enviados} mensagem{resultado.enviados === 1 ? '' : 'ns'} {resultado.enviados === 1 ? 'vai' : 'vão'} sair espaçadas, em cerca de {resultado.minutos} minuto{resultado.minutos === 1 ? '' : 's'}, pelo WhatsApp do salão.
              As respostas aparecem na conversa de cada candidato.
            </p>
            {resultado.variados && (
              <p className="text-[12px] rounded-lg p-3" style={{ background: '#fffbeb', color: '#78350f' }}>
                Havia menos mensagens do que pessoas, então o sistema variou a saudação e o fecho das repetidas. Cadastrando mais mensagens, a variação fica ainda maior.
              </p>
            )}
            {resultado.pulados.length > 0 && (
              <div className="text-[12px] rounded-lg p-3" style={{ background: '#fffbeb', color: '#78350f' }}>
                <p className="font-bold mb-1">Não enviadas:</p>
                {resultado.pulados.map((p, i) => <p key={i}>{p.nome}: {p.motivo}</p>)}
              </div>
            )}
            <div className="flex justify-end"><button onClick={onFechar} className="px-4 py-2 rounded-lg text-[13px] font-bold" style={{ background: COR, color: '#fff' }}>Fechar</button></div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
                    <select value={vaga} onChange={e => setVaga(e.target.value)} className="px-2 py-1.5 rounded-lg text-[13px] border" style={{ borderColor: '#e6e3f2' }}>
                      {vagas.map(v => <option key={v} value={v}>{v} ({candidatos.filter(c => c.vaga === v).length})</option>)}
                    </select>
                  )}
                </div>
                <p className="text-[12px] mt-1.5" style={{ color: destinatarios.length > LIMITE ? '#b45309' : '#6e625c' }}>
                  {vaiReceber.length === 0 ? 'Nenhum candidato nesta escolha.'
                    : destinatarios.length > LIMITE
                      ? `${destinatarios.length} candidatos: o envio é de ${LIMITE} por vez (quem ainda não foi chamado vai primeiro). Repita depois para o restante.`
                      : `${vaiReceber.length} candidato(s) vão receber.`}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide flex-1" style={{ color: '#6e625c' }}>Mensagens ({preenchidos.length})</p>
                  {pedirCurriculo && (
                    <button onClick={() => setModelos(MODELOS_PEDIDO)} className="text-[11.5px] font-bold underline" style={{ color: COR }}>usar os modelos de pedido de currículo</button>
                  )}
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
                        className="flex-1 px-3 py-2 rounded-lg text-[13px] border" style={{ borderColor: '#e6e3f2', background: '#faf9fe' }} />
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
              <p className="text-[11.5px]" style={{ color: '#6e625c' }}>Limites de proteção: 20 pessoas por vez e 40 por dia, com 25 a 45 segundos entre uma mensagem e outra.</p>
              {!!erro && <p className="text-[12.5px] font-bold px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#b91c1c' }}>{erro}</p>}
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2" style={{ borderColor: '#e9ddd6' }}>
              <button onClick={onFechar} disabled={enviando} className="px-4 py-2 rounded-lg text-[13px] font-bold border" style={{ borderColor: '#e6e3f2' }}>Cancelar</button>
              <button onClick={enviar} disabled={enviando || !vaiReceber.length || !preenchidos.length}
                className="px-4 py-2 rounded-lg text-[13px] font-bold disabled:opacity-50 flex items-center gap-2" style={{ background: COR, color: '#fff' }}>
                {enviando && <Loader2 size={14} className="animate-spin" />} Enviar para {vaiReceber.length}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
