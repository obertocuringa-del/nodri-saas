'use client'
import { useState, useEffect } from 'react'
import { Link2, Copy, Check, ExternalLink, Loader2, RefreshCw, Eye, EyeOff, Share2, Pencil, SlidersHorizontal, ChevronDown, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import VitrineOcultar from './VitrineOcultar'

// Painel do link público do cliente, no topo de Ações Comerciais.
//
// Fica aqui de propósito: é desta tela que sai o conteúdo que o cliente vê, e
// quem acabou de cadastrar uma promoção é quem quer mandar o link.

interface Cfg { token: string; slug?: string; ativo: boolean; criadoEm: number; horario?: { abertura: string; fechamento: string } }

export default function LinkVitrine() {
  const [cfg, setCfg] = useState<Cfg | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [confirmandoTroca, setConfirmandoTroca] = useState(false)
  const [editandoSlug, setEditandoSlug] = useState(false)
  const [novoSlug, setNovoSlug] = useState('')
  const [escolhendo, setEscolhendo] = useState(false)
  const [editandoHora, setEditandoHora] = useState(false)
  const [abre, setAbre] = useState('')
  const [fecha, setFecha] = useState('')
  // No celular este card fica recolhido: aberto, ele empurra as campanhas para
  // fora da tela, e o que se vem fazer aqui e cuidar das campanhas. No desktop
  // ha espaco de sobra e ele fica sempre aberto (ver `sm:` nas classes).
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    fetch('/api/salon/vitrine')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setCfg(d?.config || null))
      .catch(() => { /* sem link ainda */ })
      .finally(() => setCarregando(false))
  }, [])

  // O endereço divulgado é o slug legível; o token só aparece se por algum
  // motivo o slug ainda não existir.
  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  const url = cfg ? `${origem}/promocoes/${cfg.slug || cfg.token}` : ''

  async function acao(acao: string, extra?: Record<string, any>) {
    setOcupado(true)
    try {
      const r = await fetch('/api/salon/vitrine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, ...extra }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error || 'Não foi possível'); return }
      setCfg(d.config)
      setConfirmandoTroca(false)
      setEditandoSlug(false)
      if (acao === 'slug') {
        toast.success(d.ajustado
          ? `Esse endereço já estava em uso. Salvamos como /${d.config.slug}`
          : 'Endereço do link atualizado.')
        return
      }
      if (acao === 'criar') toast.success('Link criado! Já pode enviar para suas clientes.')
      if (acao === 'ligar') toast.success('Link no ar de novo.')
      if (acao === 'desligar') toast.success('Link fora do ar.')
      if (acao === 'novo-endereco') toast.success('Endereço novo gerado. O link antigo parou de funcionar.')
      if (acao === 'horario') { setEditandoHora(false); toast.success('Horário de atendimento salvo.') }
    } catch { toast.error('Erro de conexão') }
    finally { setOcupado(false) }
  }

  function copiar() {
    navigator.clipboard.writeText(url)
      .then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) })
      .catch(() => toast.error('Não consegui copiar'))
  }

  function compartilhar() {
    const texto = `Confira nossas promoções e agende pelo link:\n${url}`
    if (navigator.share) navigator.share({ text: texto }).catch(() => { /* cancelou */ })
    else window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  if (carregando) {
    return <div className="nodri-card p-4 mb-4 flex items-center gap-2 text-nodri-t3 text-[12px]">
      <Loader2 size={13} className="animate-spin" /> Carregando link do cliente...
    </div>
  }

  if (!cfg) {
    return (
      <div className="nodri-card p-4 mb-4">
        <div className="flex items-start gap-3">
          <Link2 size={18} className="text-nodri-cyan shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-syne font-bold text-[13px] text-gray-900">Página do cliente</p>
            <p className="text-[12px] text-nodri-t3 mt-0.5 leading-relaxed">
              Gere um link para suas clientes verem as promoções, a tabela de preços,
              sugerirem promoções e pedirem agendamento pelo WhatsApp. Elas não
              precisam de login.
            </p>
            <button onClick={() => acao('criar')} disabled={ocupado}
              className="mt-3 flex items-center gap-1.5 bg-nodri-cyan text-black px-4 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50">
              {ocupado ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />} Gerar link
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="nodri-card p-4 mb-4">
      {/* No celular o cabeçalho é o botão que abre; no desktop é só título. */}
      <button onClick={() => setAberto(v => !v)}
        className="w-full flex items-center gap-2 mb-2 text-left sm:cursor-default">
        <Link2 size={15} className="text-nodri-cyan shrink-0" />
        <p className="font-syne font-bold text-[13px] text-gray-900">
          <span className="sm:hidden">{aberto ? 'Página do cliente' : 'Configurar página do cliente'}</span>
          <span className="hidden sm:inline">Página do cliente</span>
        </p>
        <span className={'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ml-1 '
          + (cfg.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
          {cfg.ativo ? 'No ar' : 'Fora do ar'}
        </span>
        <ChevronDown size={15}
          className={'ml-auto text-nodri-t3 shrink-0 sm:hidden transition-transform ' + (aberto ? 'rotate-180' : '')} />
      </button>

      <div className={(aberto ? 'block' : 'hidden') + ' sm:block'}>

      <div className="flex items-center gap-2 bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 mb-2">
        <span className="flex-1 font-mono text-[11px] text-nodri-purple break-all">{url}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={copiar}
          className="flex items-center gap-1.5 bg-nodri-cyan text-black px-3 py-2 rounded-lg text-[12px] font-bold">
          {copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? 'Copiado' : 'Copiar'}
        </button>
        <button onClick={compartilhar}
          className="flex items-center gap-1.5 border border-nodri-border px-3 py-2 rounded-lg text-[12px] text-nodri-t2">
          <Share2 size={13} /> Compartilhar
        </button>
        <a href={url} target="_blank" rel="noreferrer"
          className="flex items-center gap-1.5 border border-nodri-border px-3 py-2 rounded-lg text-[12px] text-nodri-t2">
          <ExternalLink size={13} /> Ver como cliente
        </a>
        <button onClick={() => acao(cfg.ativo ? 'desligar' : 'ligar')} disabled={ocupado}
          className="flex items-center gap-1.5 border border-nodri-border px-3 py-2 rounded-lg text-[12px] text-nodri-t2 disabled:opacity-50">
          {cfg.ativo ? <EyeOff size={13} /> : <Eye size={13} />} {cfg.ativo ? 'Tirar do ar' : 'Colocar no ar'}
        </button>
        <button onClick={() => setEscolhendo(v => !v)} disabled={ocupado}
          className="flex items-center gap-1.5 border border-nodri-border px-3 py-2 rounded-lg text-[12px] text-nodri-t2 disabled:opacity-50">
          <SlidersHorizontal size={13} /> O que aparece
        </button>
        <button onClick={() => { setAbre(cfg.horario?.abertura || '09:00'); setFecha(cfg.horario?.fechamento || '19:00'); setEditandoHora(true) }} disabled={ocupado}
          className="flex items-center gap-1.5 border border-nodri-border px-3 py-2 rounded-lg text-[12px] text-nodri-t2 disabled:opacity-50">
          <Clock size={13} /> Horário de atendimento
        </button>
        <button onClick={() => { setNovoSlug(cfg.slug || ''); setEditandoSlug(true) }} disabled={ocupado}
          className="flex items-center gap-1.5 border border-nodri-border px-3 py-2 rounded-lg text-[12px] text-nodri-t2 disabled:opacity-50">
          <Pencil size={13} /> Editar endereço
        </button>
        <button onClick={() => setConfirmandoTroca(true)} disabled={ocupado}
          className="flex items-center gap-1.5 border border-nodri-border px-3 py-2 rounded-lg text-[12px] text-nodri-t3 disabled:opacity-50">
          <RefreshCw size={13} /> Gerar código novo
        </button>
      </div>

      {escolhendo && (
        <div className="mt-3 pt-3 border-t border-nodri-border">
          <VitrineOcultar aoFechar={() => setEscolhendo(false)} />
        </div>
      )}

      {editandoHora && (
        <div className="mt-3 p-3 rounded-lg bg-nodri-surface border border-nodri-border">
          <p className="text-[11px] text-nodri-t3 mb-2 leading-relaxed">
            De quando a quando a cliente pode pedir horário. Fora dessa faixa o
            horário nem aparece para ela escolher — e ninguém precisa dizer não depois.
          </p>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <label className="text-[11px] text-nodri-t2">Abre</label>
            <input type="time" value={abre} onChange={e => setAbre(e.target.value)} className="nodri-input text-[12px] w-[110px]" />
            <label className="text-[11px] text-nodri-t2">Fecha</label>
            <input type="time" value={fecha} onChange={e => setFecha(e.target.value)} className="nodri-input text-[12px] w-[110px]" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setEditandoHora(false)}
              className="px-3 py-1.5 rounded-lg border border-nodri-border text-[12px] text-nodri-t2">Cancelar</button>
            <button onClick={() => acao('horario', { abertura: abre, fechamento: fecha })} disabled={ocupado || !abre || !fecha}
              className="px-3 py-1.5 rounded-lg bg-nodri-cyan text-black text-[12px] font-bold disabled:opacity-50">
              Salvar horário
            </button>
            {/* Limpar volta ao padrão amplo em vez de deixar o link sem
                horário nenhum — sem faixa, ninguém consegue agendar. */}
            <button onClick={() => acao('horario', { abertura: '', fechamento: '' })} disabled={ocupado}
              className="px-3 py-1.5 rounded-lg border border-nodri-border text-[12px] text-nodri-t3">Voltar ao padrão (7h–23h)</button>
          </div>
          <p className="text-[10px] text-nodri-t3 mt-2">
            Os horários são oferecidos de 30 em 30 minutos a partir da abertura.
            {cfg.horario ? ` Hoje: das ${cfg.horario.abertura} às ${cfg.horario.fechamento}.` : ' Hoje: padrão de 7h às 23h.'}
          </p>
        </div>
      )}

      {editandoSlug && (
        <div className="mt-3 p-3 rounded-lg bg-nodri-surface border border-nodri-border">
          <p className="text-[11px] text-nodri-t3 mb-2">
            Escolha um endereço fácil de falar e digitar — é o que a cliente vê.
          </p>
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[11px] text-nodri-t3 font-mono">{origem}/promocoes/</span>
            <input value={novoSlug} onChange={e => setNovoSlug(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') acao('slug', { slug: novoSlug }) }}
              placeholder="rouge-hair" autoFocus
              className="flex-1 min-w-0 nodri-input text-[12px] font-mono" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditandoSlug(false)}
              className="px-3 py-1.5 rounded-lg border border-nodri-border text-[12px] text-nodri-t2">Cancelar</button>
            <button onClick={() => acao('slug', { slug: novoSlug })} disabled={ocupado || novoSlug.trim().length < 3}
              className="px-3 py-1.5 rounded-lg bg-nodri-cyan text-black text-[12px] font-bold disabled:opacity-50">
              Salvar endereço
            </button>
          </div>
          <p className="text-[10px] text-nodri-t3 mt-2">
            O endereço anterior para de funcionar assim que você salvar.
          </p>
        </div>
      )}

      {confirmandoTroca && (
        <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-[12px] text-amber-900 leading-relaxed mb-2">
            Gerar um endereço novo faz o link atual <b>parar de funcionar na hora</b>.
            Quem já recebeu o antigo não vai mais conseguir abrir. Use quando o link
            chegou a quem não devia.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmandoTroca(false)}
              className="px-3 py-1.5 rounded-lg border border-nodri-border text-[12px] text-nodri-t2">Cancelar</button>
            <button onClick={() => acao('novo-endereco')} disabled={ocupado}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[12px] font-semibold disabled:opacity-50">
              Gerar endereço novo
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-nodri-t3 mt-2.5 leading-relaxed">
        A página mostra as promoções <b>publicadas</b>, a tabela de preços e os
        profissionais habilitados em cada serviço. Rascunho não aparece.
      </p>

      </div>
    </div>
  )
}
