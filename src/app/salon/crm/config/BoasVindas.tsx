'use client'
// ── Boas-vindas automáticas com o link de agendamento ───────────────────────
//
// Liga/desliga, texto e link. A regra de QUANDO mandar (só quem entra em
// contato, 1 por dia, sem tirar da fila) mora em src/lib/crmBoasVindas.ts e
// está escrita aqui na tela, para a recepção saber o que esperar.
import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { preencherBoasVindas, saudacaoDoMomento, SAUDACAO_PADRAO, type SaudacaoCfg } from '@/lib/crmBoasVindasTexto'

type Cfg = { ligada: boolean; texto: string; link: string; texto_padrao?: string; saudacao: SaudacaoCfg }

export default function BoasVindas() {
  const [cfg, setCfg] = useState<Cfg | null>(null)
  const [salvo, setSalvo] = useState<Cfg | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    fetch('/api/crm/config', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.boas_vindas) return
        const c = { ...d.boas_vindas, saudacao: { ...SAUDACAO_PADRAO, ...(d.boas_vindas.saudacao || {}) } }
        setCfg(c); setSalvo(c)
      })
      .catch(() => {})
  }, [])

  const mudou = !!cfg && !!salvo && (cfg.texto !== salvo.texto || cfg.link !== salvo.link
    || JSON.stringify(cfg.saudacao) !== JSON.stringify(salvo.saudacao))

  async function gravar(parcial: Partial<Cfg>) {
    if (!cfg) return
    const novo = { ...cfg, ...parcial }
    setSalvando(true); setAviso('')
    try {
      const r = await fetch('/api/crm/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lista: 'boas_vindas', ligada: novo.ligada, texto: novo.texto, link: novo.link, saudacao: novo.saudacao }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setAviso(j.error || 'Não consegui salvar.'); return }
      setCfg(novo); setSalvo(novo)
      setAviso(parcial.ligada === undefined ? 'Salvo.' : (novo.ligada ? 'Boas-vindas LIGADAS.' : 'Boas-vindas desligadas.'))
    } finally { setSalvando(false) }
  }

  if (!cfg) return null

  // A prévia usa o MESMO código que a ponte usa na hora de mandar.
  const saudAgora = saudacaoDoMomento(cfg.saudacao)
  const previaComNome = preencherBoasVindas(cfg.texto, { salao: 'Rouge Hair', link: cfg.link || '(link)', cliente: 'Bruna', saudacao: saudAgora })
  const previaSemNome = preencherBoasVindas(cfg.texto, { salao: 'Rouge Hair', link: cfg.link || '(link)', cliente: '', saudacao: saudAgora })
  const usaCampos = /\{cliente\}|\{saudacao\}/i.test(cfg.texto)
  const usaSaudacao = /\{saudacao\}/i.test(cfg.texto)
  const saud = (parcial: Partial<SaudacaoCfg>) => setCfg({ ...cfg, saudacao: { ...cfg.saudacao, ...parcial } })
  const campoSt = { background: '#faf9f7', border: '1px solid #e8e6e0', color: '#1a1a1a' }

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
        Texto da mensagem <span className="font-normal" style={{ color: '#8f877f' }}>— campos: {'{cliente}'} (primeiro nome, se ela tiver), {'{saudacao}'} (bom dia / boa tarde / boa noite pela hora), {'{salao}'} e {'{link}'} (se não puser, o link vai no fim)</span>
      </label>
      <textarea value={cfg.texto} onChange={e => setCfg({ ...cfg, texto: e.target.value })} rows={4}
        className="w-full px-3 py-2 rounded-lg text-[12.5px] resize-y focus:outline-none leading-relaxed"
        style={{ background: '#faf9f7', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />

      {/* Saudação pela hora: as palavras e os cortes. Só valem quando o texto
          usa {saudacao}; por isso ficam apagados quando não usa. */}
      <div className="mt-3 rounded-xl p-3" style={{ background: '#faf9f7', border: '1px solid #e8e6e0', opacity: usaSaudacao ? 1 : 0.55 }}>
        <p className="text-[11.5px] font-bold mb-2" style={{ color: '#6b6860' }}>
          Saudação pela hora (Brasília){!usaSaudacao && <span className="font-normal" style={{ color: '#8f877f' }}> — o texto acima não usa {'{saudacao}'}, então isto não entra</span>}
        </p>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[11px]" style={{ color: '#8f877f' }}>até as</span>
          <input type="number" min={1} max={23} value={cfg.saudacao.ate_bom_dia} onChange={e => saud({ ate_bom_dia: Number(e.target.value) })}
            className="w-[52px] px-2 py-1 rounded-lg text-[12px] text-center focus:outline-none" style={campoSt} />
          <span className="text-[11px]" style={{ color: '#8f877f' }}>h:</span>
          <input value={cfg.saudacao.bom_dia} onChange={e => saud({ bom_dia: e.target.value })} placeholder="bom dia"
            className="w-[110px] px-2 py-1 rounded-lg text-[12px] focus:outline-none" style={campoSt} />
          <span className="text-[11px] ml-1" style={{ color: '#8f877f' }}>· até as</span>
          <input type="number" min={2} max={23} value={cfg.saudacao.ate_boa_tarde} onChange={e => saud({ ate_boa_tarde: Number(e.target.value) })}
            className="w-[52px] px-2 py-1 rounded-lg text-[12px] text-center focus:outline-none" style={campoSt} />
          <span className="text-[11px]" style={{ color: '#8f877f' }}>h:</span>
          <input value={cfg.saudacao.boa_tarde} onChange={e => saud({ boa_tarde: e.target.value })} placeholder="boa tarde"
            className="w-[110px] px-2 py-1 rounded-lg text-[12px] focus:outline-none" style={campoSt} />
          <span className="text-[11px] ml-1" style={{ color: '#8f877f' }}>· depois:</span>
          <input value={cfg.saudacao.boa_noite} onChange={e => saud({ boa_noite: e.target.value })} placeholder="boa noite"
            className="w-[110px] px-2 py-1 rounded-lg text-[12px] focus:outline-none" style={campoSt} />
        </div>
        {cfg.saudacao.ate_bom_dia >= cfg.saudacao.ate_boa_tarde && (
          <p className="text-[11px] mt-1.5" style={{ color: '#b4322a' }}>A hora do "bom dia" tem que ser menor que a do "boa tarde". Assim, volta ao padrão (12h e 18h) ao salvar.</p>
        )}
      </div>

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

      <p className="text-[11px] font-bold mt-4 mb-1" style={{ color: '#8f877f' }}>
        COMO A CLIENTE VAI RECEBER{usaCampos && <span className="font-normal"> — agora é &ldquo;{saudAgora}&rdquo;; o nome vem do cadastro do salão ou do WhatsApp dela (só o primeiro, e só se parecer nome de gente)</span>}
      </p>
      {usaCampos ? (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <div>
            <p className="text-[10.5px] font-bold mb-1" style={{ color: '#2f6b4f' }}>Cliente com nome (ex.: Bruna)</p>
            <pre className="text-[12px] whitespace-pre-wrap rounded-xl px-3 py-2 leading-relaxed"
              style={{ background: '#e6f1eb', color: '#1a1a1a', fontFamily: 'inherit' }}>{previaComNome}</pre>
          </div>
          <div>
            <p className="text-[10.5px] font-bold mb-1" style={{ color: '#2f6b4f' }}>Cliente sem nome</p>
            <pre className="text-[12px] whitespace-pre-wrap rounded-xl px-3 py-2 leading-relaxed"
              style={{ background: '#e6f1eb', color: '#1a1a1a', fontFamily: 'inherit' }}>{previaSemNome}</pre>
          </div>
        </div>
      ) : (
        <pre className="text-[12px] whitespace-pre-wrap rounded-xl px-3 py-2 leading-relaxed"
          style={{ background: '#e6f1eb', color: '#1a1a1a', fontFamily: 'inherit' }}>{previaSemNome}</pre>
      )}
    </section>
  )
}
