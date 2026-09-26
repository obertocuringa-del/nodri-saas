'use client'

// ── As automações do Avec, configuráveis sem código ─────────────────────────
//
// Cada campanha é um disparo pelo relatório: qual dia, quais status, quando
// roda, para quem e o que manda. Mais o reconhecimento da resposta da cliente
// ("confirmo") que marca Confirmado no Avec.
//
// Tudo nasce DESLIGADO. Ligar é decisão do dono, e cada uma liga sozinha.

import { useEffect, useState } from 'react'
import { Save, Plus, Trash2 } from 'lucide-react'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

type Quando = { tipo: 'intervalo' | 'horarios'; segundos?: number; horarios?: string[] }
type Campanha = {
  id: string; nome: string; ligada: boolean
  dia: 'hoje' | 'amanha'
  statuses: string[]
  quando: Quando
  destinatario: 'cliente' | 'profissional'
  mensagens: string[]
  espacamento_seg: number
  pasta: string
}
type Confirmacao = { ligada: boolean; palavras: string[]; resposta: string; url_relatorio: string }

function haQuanto(iso?: string | null) {
  if (!iso) return 'nunca'
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  return h < 48 ? `há ${h} h` : `há ${Math.floor(h / 24)} dias`
}

export default function Campanhas() {
  const [campanhas, setCampanhas] = useState<Campanha[] | null>(null)
  const [salvo, setSalvo] = useState('')
  const [estados, setEstados] = useState<Record<string, any>>({})
  const [conf, setConf] = useState<Confirmacao | null>(null)
  const [palavrasTxt, setPalavrasTxt] = useState('')
  const [datas, setDatas] = useState({ hoje: '', amanha: '' })
  const [fila, setFila] = useState(0)
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState('')

  const mudou = !!campanhas && JSON.stringify(campanhas) !== salvo
  useGuardaSalvar(mudou, 'Envios pela agenda')

  async function carregar() {
    const d = await fetch('/api/crm/campanhas', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null).catch(() => null)
    if (!d?.campanhas) return
    setCampanhas(d.campanhas); setSalvo(JSON.stringify(d.campanhas))
    setEstados(d.estados || {}); setConf(d.confirmacao || null)
    setPalavrasTxt((d.confirmacao?.palavras || []).join(', '))
    setDatas({ hoje: d.hoje, amanha: d.amanha }); setFila(d.fila_confirmacao || 0)
  }
  useEffect(() => { carregar() }, [])
  useEffect(() => {
    const t = setInterval(async () => {
      const d = await fetch('/api/crm/campanhas', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null).catch(() => null)
      if (d?.estados) { setEstados(d.estados); setFila(d.fila_confirmacao || 0) }
    }, 30000)
    return () => clearInterval(t)
  }, [])

  async function gravar(lista: Campanha[]) {
    setSalvando(true); setAviso('')
    try {
      const r = await fetch('/api/crm/campanhas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campanhas: lista }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setAviso(j.error || 'Não consegui salvar.'); return }
      setCampanhas(j.campanhas); setSalvo(JSON.stringify(j.campanhas)); setAviso('Salvo.')
    } finally { setSalvando(false) }
  }

  async function gravarConf(parcial: Partial<Confirmacao>) {
    if (!conf) return
    setSalvando(true)
    try {
      const novo = {
        ...conf, ...parcial,
        palavras: palavrasTxt.split(',').map(s => s.trim()).filter(Boolean),
      }
      const r = await fetch('/api/crm/campanhas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmacao: novo }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j.confirmacao) {
        setConf(j.confirmacao); setPalavrasTxt((j.confirmacao.palavras || []).join(', '))
        setAviso(parcial.ligada === undefined ? 'Salvo.' : (j.confirmacao.ligada ? 'Confirmação automática LIGADA.' : 'Confirmação automática desligada.'))
      }
    } finally { setSalvando(false) }
  }

  if (!campanhas) return null

  const campo = 'w-full px-2.5 py-1.5 rounded-lg text-[12.5px] focus:outline-none'
  const est = { background: '#fdfcfa', border: '1px solid #e8e6e0', color: '#1a1a1a' }
  const rotulo = { color: '#6b6860' }
  const troca = (i: number, patch: Partial<Campanha>) =>
    setCampanhas(cs => (cs || []).map((c, k) => k === i ? { ...c, ...patch } : c))

  return (
    <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
      <h2 className="font-bold text-[15px]" style={{ color: '#1a1a1a' }}>Envios pela agenda</h2>
      <p className="text-[12px] mb-4" style={{ color: '#8f877f' }}>
        Cada um consulta a agenda do salão e manda a mensagem na hora certa. Todas nascem desligadas,
        e cada uma liga separado. Hoje é {datas.hoje} · amanhã é {datas.amanha}.
      </p>

      <div className="space-y-4">
        {campanhas.map((c, i) => {
          const e = estados[c.id]
          const u = e?.ultimo
          return (
            <div key={c.id} className="rounded-xl border p-4"
              style={{ borderColor: c.ligada ? '#bfd9c8' : '#e8e6e0', background: c.ligada ? '#fbfdfb' : '#fdfcfa' }}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <input value={c.nome} onChange={ev => troca(i, { nome: ev.target.value })}
                  className="font-bold text-[13.5px] px-2 py-1 rounded-lg flex-1 min-w-[180px]"
                  style={{ background: 'transparent', border: '1px solid transparent', color: '#1a1a1a' }} />
                <button onClick={() => gravar(campanhas.map((x, k) => k === i ? { ...x, ligada: !x.ligada } : x))}
                  disabled={salvando}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold disabled:opacity-40"
                  style={c.ligada ? { background: '#2f6b4f', color: '#fff' } : { background: '#f0ece7', color: '#6b6860' }}>
                  {c.ligada ? 'LIGADA' : 'Desligada'}
                </button>
                <button onClick={() => setCampanhas(cs => (cs || []).filter((_, k) => k !== i))}
                  title="Apagar" className="p-1.5 rounded-lg" style={{ color: '#b4322a' }}><Trash2 size={14} /></button>
              </div>

              {u && (
                <p className="text-[11.5px] mb-3 px-2 py-1 rounded-lg inline-block"
                  style={{ background: u.erro ? '#fbf2e0' : '#e7f1e9', color: u.erro ? '#9a6b12' : '#2f6b4f' }}>
                  {haQuanto(u.em)}: {u.lidas} linhas · {u.elegiveis} no filtro · <strong>{u.enviadas} enviadas</strong>
                  {u.erro ? ` — ${u.erro}` : ''}
                </p>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold mb-1" style={rotulo}>Olha o dia</label>
                  <select className={campo} style={est} value={c.dia}
                    onChange={ev => troca(i, { dia: ev.target.value as any })}>
                    <option value="hoje">Hoje ({datas.hoje})</option>
                    <option value="amanha">Amanhã ({datas.amanha})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1" style={rotulo}>Manda para</label>
                  <select className={campo} style={est} value={c.destinatario}
                    onChange={ev => troca(i, { destinatario: ev.target.value as any })}>
                    <option value="cliente">A cliente</option>
                    <option value="profissional">O profissional</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold mb-1" style={rotulo}>Status que entram (separe por vírgula)</label>
                  <input className={campo} style={est} value={c.statuses.join(', ')}
                    onChange={ev => troca(i, { statuses: ev.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1" style={rotulo}>Quando roda</label>
                  <select className={campo} style={est} value={c.quando.tipo}
                    onChange={ev => troca(i, { quando: ev.target.value === 'horarios'
                      ? { tipo: 'horarios', horarios: c.quando.horarios || ['17:00'] }
                      : { tipo: 'intervalo', segundos: c.quando.segundos || 60 } })}>
                    <option value="intervalo">De tempos em tempos</option>
                    <option value="horarios">Em horários fixos</option>
                  </select>
                </div>
                <div>
                  {c.quando.tipo === 'intervalo' ? (
                    <>
                      <label className="block text-[11px] font-bold mb-1" style={rotulo}>A cada (segundos, mínimo 15)</label>
                      <input type="number" min={15} className={campo} style={est} value={c.quando.segundos || 60}
                        onChange={ev => troca(i, { quando: { tipo: 'intervalo', segundos: Number(ev.target.value) || 60 } })} />
                    </>
                  ) : (
                    <>
                      <label className="block text-[11px] font-bold mb-1" style={rotulo}>Horários (separe por vírgula)</label>
                      <input className={campo} style={est} value={(c.quando.horarios || []).join(', ')}
                        onChange={ev => troca(i, { quando: { tipo: 'horarios', horarios: ev.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                        placeholder="17:00, 20:50" />
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1" style={rotulo}>Espaço entre um envio e outro (seg)</label>
                  <input type="number" min={0} max={300} className={campo} style={est} value={c.espacamento_seg}
                    onChange={ev => troca(i, { espacamento_seg: Number(ev.target.value) || 0 })} />
                  <p className="text-[10.5px] mt-1" style={{ color: '#8f877f' }}>
                    Sem espaço, 60 mensagens saem num piscar e o WhatsApp entende como lista.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold mb-1" style={rotulo}>
                    Mensagens — <span className="font-normal">{'{cliente} {profissional} {data} {hora} {servicos} {salao} {atendente}'}</span>
                  </label>
                  {(c.mensagens.length ? c.mensagens : ['']).map((m, j) => (
                    <textarea key={j} className={campo} style={{ ...est, minHeight: 70, marginBottom: 6 }} value={m}
                      onChange={ev => troca(i, { mensagens: c.mensagens.map((x, k) => k === j ? ev.target.value : x) })} />
                  ))}
                  <button onClick={() => troca(i, { mensagens: [...c.mensagens, ''] })}
                    className="text-[11.5px] font-bold px-2 py-1 rounded-lg"
                    style={{ background: '#f0ece7', color: '#1a1a1a' }}>+ outra mensagem</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button onClick={() => gravar(campanhas)} disabled={salvando || !mudou}
          className="px-4 py-2 rounded-lg text-[12.5px] font-bold flex items-center gap-1.5 disabled:opacity-40"
          style={{ background: '#1a1a1a', color: '#fff' }}>
          <Save size={13} /> {salvando ? 'Salvando...' : 'Salvar envios'}
        </button>
        <button onClick={() => setCampanhas(cs => [...(cs || []), {
          id: 'c' + Date.now().toString(36), nome: 'Novo envio', ligada: false,
          dia: 'hoje', statuses: [], quando: { tipo: 'intervalo', segundos: 60 },
          destinatario: 'cliente', mensagens: [''], espacamento_seg: 8, pasta: '',
        }])} className="px-3 py-2 rounded-lg text-[12px] font-bold flex items-center gap-1"
          style={{ background: '#f0ece7', color: '#1a1a1a' }}><Plus size={13} /> Nova</button>
        {aviso && <span className="text-[12px]" style={{ color: '#2f6b4f' }}>{aviso}</span>}
      </div>

      {/* ── Reconhecer a resposta da cliente ── */}
      {conf && (
        <div className="mt-6 pt-5" style={{ borderTop: '1px solid #f0ece7' }}>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold text-[14px]" style={{ color: '#1a1a1a' }}>Quando a cliente confirma</h3>
            <div className="flex-1" />
            <button onClick={() => gravarConf({ ligada: !conf.ligada })} disabled={salvando}
              className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold disabled:opacity-40"
              style={conf.ligada ? { background: '#2f6b4f', color: '#fff' } : { background: '#f0ece7', color: '#6b6860' }}>
              {conf.ligada ? 'LIGADA' : 'Desligada'}
            </button>
          </div>
          <p className="text-[12px] mb-3" style={{ color: '#8f877f' }}>
            Se a resposta bater com a lista, o NODRI marca <strong>Confirmado</strong> na agenda e só então
            manda o retorno para a cliente. Se não bater — ou se a marcação falhar — a conversa vai para
            <strong> Preciso agir</strong> e ninguém recebe nada.
            {fila > 0 && <> Agora tem <strong>{fila}</strong> na fila.</>}
          </p>

          <label className="block text-[11px] font-bold mb-1" style={rotulo}>
            Palavras que valem como confirmação (separe por vírgula)
          </label>
          <textarea className={campo} style={{ ...est, minHeight: 60 }} value={palavrasTxt}
            onChange={ev => setPalavrasTxt(ev.target.value)} />
          <p className="text-[10.5px] mt-1 mb-3" style={{ color: '#8f877f' }}>
            São pedaços, não frases: &quot;confirma&quot; já pega Confirmado, Confirmar e Confirmo. Mensagem com
            &quot;não&quot;, &quot;cancela&quot; ou &quot;remarcar&quot; nunca conta, e texto longo também não —
            quem escreve um parágrafo está explicando algo, e isso é caso de gente ler.
          </p>

          <label className="block text-[11px] font-bold mb-1" style={rotulo}>O que responder depois de confirmar</label>
          <textarea className={campo} style={{ ...est, minHeight: 90 }} value={conf.resposta}
            onChange={ev => setConf({ ...conf, resposta: ev.target.value })} />

          <button onClick={() => gravarConf({})} disabled={salvando}
            className="mt-3 px-4 py-2 rounded-lg text-[12.5px] font-bold flex items-center gap-1.5 disabled:opacity-40"
            style={{ background: '#1a1a1a', color: '#fff' }}>
            <Save size={13} /> Salvar
          </button>
        </div>
      )}
    </section>
  )
}
