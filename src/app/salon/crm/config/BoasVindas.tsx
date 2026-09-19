'use client'
// ── Boas-vindas automáticas com o link de agendamento ───────────────────────
//
// Liga/desliga, texto e link. A regra de QUANDO mandar (só quem entra em
// contato, 1 por dia, sem tirar da fila) mora em src/lib/crmBoasVindas.ts e
// está escrita aqui na tela, para a recepção saber o que esperar.
import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'

type Cfg = { ligada: boolean; texto: string; link: string; texto_padrao?: string }

export default function BoasVindas() {
  const [cfg, setCfg] = useState<Cfg | null>(null)
  const [salvo, setSalvo] = useState<Cfg | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    fetch('/api/crm/config', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.boas_vindas) { setCfg(d.boas_vindas); setSalvo(d.boas_vindas) } })
      .catch(() => {})
  }, [])

  const mudou = !!cfg && !!salvo && (cfg.texto !== salvo.texto || cfg.link !== salvo.link)

  async function gravar(parcial: Partial<Cfg>) {
    if (!cfg) return
    const novo = { ...cfg, ...parcial }
    setSalvando(true); setAviso('')
    try {
      const r = await fetch('/api/crm/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lista: 'boas_vindas', ligada: novo.ligada, texto: novo.texto, link: novo.link }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setAviso(j.error || 'Não consegui salvar.'); return }
      setCfg(novo); setSalvo(novo)
      setAviso(parcial.ligada === undefined ? 'Salvo.' : (novo.ligada ? 'Boas-vindas LIGADAS.' : 'Boas-vindas desligadas.'))
    } finally { setSalvando(false) }
  }

  if (!cfg) return null

  const previa = cfg.texto
    .replace(/\{salao\}/gi, 'Rouge Hair')
    .replace(/\{link\}/gi, cfg.link || '(link)')
    + (/\{link\}/i.test(cfg.texto) || !cfg.link ? '' : '\n' + cfg.link)

  return (
    <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: cfg.ligada ? '#bfd9c8' : '#e8e6e0' }}>
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <h2 className="font-bold text-[15px] flex items-center gap-2" style={{ color: '#1a1a1a' }}>
          <Send size={15} /> Boas-vindas com link de agendamento
        </h2>
        <div className="flex-1" />
        <button onClick={() => gravar({ ligada: !cfg.ligada })} disabled={salvando}
          className="px-3 py-1.5 rounded-lg text-[12px] font-bold disabled:opacity-40"
          style={cfg.ligada ? { background: '#2f6b4f', color: '#fff' } : { background: '#f0ece7', color: '#6b6860' }}>
          {cfg.ligada ? 'LIGADA — clique para desligar' : 'Desligada — clique para ligar'}
        </button>
      </div>
      <p className="text-[12px] mb-4" style={{ color: '#8f877f' }}>
        Quando uma cliente <strong>entra em contato</strong> (primeira mensagem depois de 12 horas
        sem conversa, ou contato novo), o CRM responde na hora com este texto e o link. No meio de
        uma conversa em andamento não manda; &ldquo;obrigada&rdquo;, &ldquo;sim&rdquo; e respostas às
        automações também não. No máximo uma por cliente por dia. <strong>A conversa continua em
        Preciso agir</strong>: quem agenda é a recepção.
      </p>

      <label className="block text-[11.5px] font-bold mb-1" style={{ color: '#6b6860' }}>Link de agendamento</label>
      <input value={cfg.link} onChange={e => setCfg({ ...cfg, link: e.target.value })}
        placeholder="https://www.nodri.com.br/promocoes/seu-salao"
        className="w-full px-3 py-2 rounded-lg text-[12.5px] mb-3 focus:outline-none"
        style={{ background: '#faf9f7', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />

      <label className="block text-[11.5px] font-bold mb-1" style={{ color: '#6b6860' }}>
        Texto da mensagem <span className="font-normal" style={{ color: '#8f877f' }}>— use {'{salao}'} para o nome do salão e {'{link}'} para o link (se não puser, o link vai no fim)</span>
      </label>
      <textarea value={cfg.texto} onChange={e => setCfg({ ...cfg, texto: e.target.value })} rows={4}
        className="w-full px-3 py-2 rounded-lg text-[12.5px] resize-y focus:outline-none leading-relaxed"
        style={{ background: '#faf9f7', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <button onClick={() => gravar({})} disabled={!mudou || salvando}
          className="px-3 py-1.5 rounded-lg text-[12px] font-bold disabled:opacity-40"
          style={{ background: '#5b4fcf', color: '#fff' }}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        {cfg.texto_padrao && cfg.texto !== cfg.texto_padrao && (
          <button onClick={() => setCfg({ ...cfg, texto: cfg.texto_padrao! })}
            className="px-3 py-1.5 rounded-lg text-[12px]" style={{ background: '#f0ece7', color: '#6b6860' }}>
            Voltar ao texto padrão
          </button>
        )}
        {aviso && <span className="text-[12px]" style={{ color: aviso.includes('não') || aviso.includes('Não') ? '#b4322a' : '#2f6b4f' }}>{aviso}</span>}
      </div>

      <p className="text-[11px] font-bold mt-4 mb-1" style={{ color: '#8f877f' }}>COMO A CLIENTE VAI RECEBER</p>
      <pre className="text-[12px] whitespace-pre-wrap rounded-xl px-3 py-2 leading-relaxed"
        style={{ background: '#e6f1eb', color: '#1a1a1a', fontFamily: 'inherit' }}>{previa}</pre>
    </section>
  )
}
