'use client'

// ── Automação de feedback (Avec → WhatsApp) ─────────────────────────────────
//
// O interruptor que manda nos dois lados: desligou aqui, a extensão do Chrome
// no computador da recepção para na próxima volta, sem ninguém ir até lá.
//
// Tudo que o dono pode querer trocar está nesta tela -- mensagens, status,
// intervalo, endereços. O que NÃO está aqui, de propósito, é a senha do Avec:
// ela fica na extensão, e o NODRI nunca a vê.

import { useEffect, useState } from 'react'
import { Copy, RefreshCw, Save } from 'lucide-react'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

type Config = {
  ligada: boolean
  intervalo_seg: number
  url_relatorio: string
  url_login: string
  statuses: string[]
  msg1: string
  msg2: string
  chave: string
  fuso: string
}
type Estado = {
  visto_em: string | null
  ultimo: { em: string; lidas: number; elegiveis: number; enviadas: number; puladas: number; erro: string | null } | null
  enviados_hoje: number
}

function haQuanto(iso: string | null): string {
  if (!iso) return 'nunca'
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 48) return `há ${h} h`
  return `há ${Math.floor(h / 24)} dias`
}

export default function AutomacaoFeedback() {
  const [dono, setDono] = useState(false)
  const [cfg, setCfg] = useState<Config | null>(null)
  const [salvo, setSalvo] = useState<Config | null>(null)
  const [estado, setEstado] = useState<Estado | null>(null)
  const [hoje, setHoje] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [statusTexto, setStatusTexto] = useState('')

  const mudou = !!cfg && !!salvo && JSON.stringify({ ...cfg, ligada: false }) !== JSON.stringify({ ...salvo, ligada: false })
  useGuardaSalvar(mudou, 'Automação de feedback')

  async function carregar() {
    const d = await fetch('/api/crm/automacao', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null)
    if (!d?.config) return
    setCfg(d.config); setSalvo(d.config); setEstado(d.estado); setHoje(d.hoje || ''); setDono(!!d.dono)
    setStatusTexto((d.config.statuses || []).join(', '))
  }
  useEffect(() => { carregar() }, [])
  // A saúde da extensão muda sozinha; a tela acompanha sem recarregar.
  useEffect(() => {
    const t = setInterval(async () => {
      const d = await fetch('/api/crm/automacao', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null)
      if (d?.estado) setEstado(d.estado)
    }, 30000)
    return () => clearInterval(t)
  }, [])

  async function gravar(parcial: Partial<Config>) {
    if (!cfg) return
    setSalvando(true); setAviso('')
    try {
      const novo = { ...cfg, ...parcial, statuses: statusTexto.split(',').map(s => s.trim()).filter(Boolean) }
      const r = await fetch('/api/crm/automacao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: novo }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setAviso(j.error || 'Não consegui salvar.'); return }
      setCfg(j.config); setSalvo(j.config); setStatusTexto((j.config.statuses || []).join(', '))
      setAviso(parcial.ligada === undefined ? 'Salvo.' : (j.config.ligada ? 'Automação LIGADA.' : 'Automação desligada.'))
    } finally { setSalvando(false) }
  }

  async function novaChave() {
    if (!confirm('Gerar uma chave nova invalida a atual: a extensão instalada para de funcionar até receber a nova. Continuar?')) return
    const r = await fetch('/api/crm/automacao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'nova_chave' }),
    })
    const j = await r.json().catch(() => ({}))
    if (r.ok && j.config) { setCfg(j.config); setSalvo(j.config) }
  }

  if (!cfg) return null

  const campo = 'w-full px-2.5 py-1.5 rounded-lg text-[12.5px] focus:outline-none'
  const estiloCampo = { background: '#fdfcfa', border: '1px solid #e8e6e0', color: '#1a1a1a' }
  const vista = estado?.visto_em ? haQuanto(estado.visto_em) : 'nunca'
  const vistaRecente = !!estado?.visto_em && Date.now() - new Date(estado.visto_em).getTime() < 5 * 60000

  return (
    <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: cfg.ligada ? '#bfd9c8' : '#e8e6e0' }}>
      <div className="flex items-center gap-3 mb-1">
        <h2 className="font-bold text-[15px]" style={{ color: '#1a1a1a' }}>Automação de feedback</h2>
        <div className="flex-1" />
        <button onClick={() => gravar({ ligada: !cfg.ligada })} disabled={salvando || !dono}
          className="px-3 py-1.5 rounded-lg text-[12px] font-bold disabled:opacity-40"
          style={cfg.ligada ? { background: '#2f6b4f', color: '#fff' } : { background: '#f0ece7', color: '#6b6860' }}>
          {cfg.ligada ? 'LIGADA — clique para desligar' : 'Desligada — clique para ligar'}
        </button>
      </div>
      <p className="text-[12px] mb-3" style={{ color: '#8f877f' }}>
        Quando a comanda da cliente fica como paga no Avec, ela recebe o pedido de feedback no WhatsApp,
        uma vez por celular por dia. Quem lê o Avec é a extensão do Chrome no computador da recepção;
        quem escolhe a quem mandar é o NODRI. Nasce desligada.
      </p>

      {/* ── Saúde ── */}
      <div className="rounded-xl px-3 py-2 mb-4 text-[12px] flex flex-wrap gap-x-4 gap-y-1"
        style={{ background: vistaRecente ? '#e7f1e9' : '#fbf2e0', color: vistaRecente ? '#2f6b4f' : '#9a6b12' }}>
        <span><strong>Extensão vista:</strong> {vista}</span>
        <span><strong>Feedbacks hoje ({hoje}):</strong> {estado?.enviados_hoje ?? 0}</span>
        {estado?.ultimo && (
          <span><strong>Último ciclo:</strong> {estado.ultimo.lidas} linhas, {estado.ultimo.elegiveis} pagas,{' '}
            {estado.ultimo.enviadas} enviadas{estado.ultimo.erro ? ` — ${estado.ultimo.erro}` : ''}</span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-[11.5px] font-bold mb-1" style={{ color: '#6b6860' }}>Endereço do relatório no Avec</label>
          <input className={campo} style={estiloCampo} value={cfg.url_relatorio}
            onChange={e => setCfg({ ...cfg, url_relatorio: e.target.value })} />
        </div>
        <div>
          <label className="block text-[11.5px] font-bold mb-1" style={{ color: '#6b6860' }}>Endereço de login do Avec (se cair, a extensão entra por aqui)</label>
          <input className={campo} style={estiloCampo} value={cfg.url_login} placeholder="https://admin.avec.beauty/seusalao/admin"
            onChange={e => setCfg({ ...cfg, url_login: e.target.value })} />
        </div>
        <div>
          <label className="block text-[11.5px] font-bold mb-1" style={{ color: '#6b6860' }}>Status que valem como pago (separe por vírgula)</label>
          <input className={campo} style={estiloCampo} value={statusTexto} onChange={e => setStatusTexto(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11.5px] font-bold mb-1" style={{ color: '#6b6860' }}>Conferir o Avec a cada (segundos, mínimo 30)</label>
          <input className={campo} style={estiloCampo} type="number" min={30} max={3600} value={cfg.intervalo_seg}
            onChange={e => setCfg({ ...cfg, intervalo_seg: Number(e.target.value) || 60 })} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11.5px] font-bold mb-1" style={{ color: '#6b6860' }}>
            1ª mensagem — <span className="font-normal">{'{cliente}'} vira o primeiro nome, {'{salao}'} o nome do salão</span>
          </label>
          <textarea className={campo} style={{ ...estiloCampo, minHeight: 44 }} value={cfg.msg1}
            onChange={e => setCfg({ ...cfg, msg1: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11.5px] font-bold mb-1" style={{ color: '#6b6860' }}>2ª mensagem</label>
          <textarea className={campo} style={{ ...estiloCampo, minHeight: 140 }} value={cfg.msg2}
            onChange={e => setCfg({ ...cfg, msg2: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <button onClick={() => gravar({})} disabled={salvando || !dono || !mudou}
          className="px-4 py-2 rounded-lg text-[12.5px] font-bold flex items-center gap-1.5 disabled:opacity-40"
          style={{ background: '#1a1a1a', color: '#fff' }}>
          <Save size={13} /> {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        {aviso && <span className="text-[12px]" style={{ color: '#2f6b4f' }}>{aviso}</span>}
        {!dono && <span className="text-[12px]" style={{ color: '#9a6b12' }}>Só o dono do salão altera esta parte.</span>}
      </div>

      {/* ── Chave da extensão ── */}
      <div className="mt-5 pt-4" style={{ borderTop: '1px solid #f0ece7' }}>
        <label className="block text-[11.5px] font-bold mb-1" style={{ color: '#6b6860' }}>
          Chave da extensão — cole nas opções da extensão "NODRI — Feedback Avec" no Chrome da recepção
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px] break-all"
            style={{ background: '#f7f5f0', color: '#1a1a1a' }}>{cfg.chave || '— será gerada ao salvar —'}</code>
          <button onClick={() => { navigator.clipboard?.writeText(cfg.chave || '') }} disabled={!cfg.chave} title="Copiar"
            className="p-2 rounded-lg disabled:opacity-40" style={{ background: '#f0ece7', color: '#1a1a1a' }}><Copy size={14} /></button>
          {dono && (
            <button onClick={novaChave} title="Gerar outra chave"
              className="p-2 rounded-lg" style={{ background: '#f0ece7', color: '#b4322a' }}><RefreshCw size={14} /></button>
          )}
        </div>
        <p className="text-[11.5px] mt-2" style={{ color: '#8f877f' }}>
          O e-mail e a senha do Avec são digitados nas opções da extensão, no computador do salão. Não passam pelo NODRI.
        </p>
      </div>
    </section>
  )
}
