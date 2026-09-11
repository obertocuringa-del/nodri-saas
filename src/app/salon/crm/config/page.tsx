'use client'

// ── Configuração do CRM ─────────────────────────────────────────────────────
//
// Duas listas que o salão precisa poder mexer sem pedir para ninguém: as
// mensagens prontas e os motivos de "Não fechou".
//
// O motivo não é enfeite: é ele que transforma "perdemos 40" em "perdemos 22
// por preço e 11 por falta de horário no sábado" — que são dois problemas com
// soluções opostas. Uma lista de motivos mal feita estraga o relatório inteiro,
// por isso ela mora aqui e não num código que só eu mexo.

import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Trash2, GripVertical, Save } from 'lucide-react'

type Item = { id?: string; nome: string; texto?: string; atalho?: string; ativo?: boolean }

export default function ConfigCrmPage() {
  const [modelos, setModelos] = useState<Item[]>([])
  const [motivos, setMotivos] = useState<Item[]>([])
  const [origens, setOrigens] = useState<Item[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<'' | 'modelos' | 'motivos' | 'origens'>('')
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    fetch('/api/crm/config')
      .then(r => r.ok ? r.json() : { modelos: [], motivos: [], origens: [] })
      .then(d => { setModelos(d.modelos || []); setMotivos(d.motivos || []); setOrigens(d.origens || []) })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  async function salvar(lista: 'modelos' | 'motivos' | 'origens') {
    setSalvando(lista); setAviso('')
    try {
      const itens = lista === 'modelos' ? modelos : lista === 'motivos' ? motivos : origens
      const r = await fetch('/api/crm/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lista, itens }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setAviso(d.error || 'Não consegui salvar.'); return }
      setAviso(lista === 'modelos' ? 'Mensagens salvas.' : lista === 'motivos' ? 'Motivos salvos.' : 'Origens salvas.')
      // Relê: o servidor é quem dá o id dos itens novos, e sem ele a próxima
      // gravação criaria tudo de novo em vez de atualizar.
      const novo = await fetch('/api/crm/config').then(x => x.json()).catch(() => null)
      if (novo) { setModelos(novo.modelos || []); setMotivos(novo.motivos || []); setOrigens(novo.origens || []) }
    } finally { setSalvando('') }
  }

  const mover = (lista: Item[], set: (v: Item[]) => void, i: number, passo: number) => {
    const j = i + passo
    if (j < 0 || j >= lista.length) return
    const novo = [...lista]
    ;[novo[i], novo[j]] = [novo[j], novo[i]]
    set(novo)
  }

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f7' }}>
      <div className="sticky top-0 z-20 border-b" style={{ background: '#fff', borderColor: '#e5e5ea' }}>
        <div className="px-4 py-2.5 flex items-center gap-3" style={{ paddingRight: 340 }}>
          <a href="/salon/crm" className="p-1.5 rounded-lg" style={{ color: '#575d68' }} title="Voltar ao CRM">
            <ArrowLeft size={17} />
          </a>
          <div>
            <h1 className="font-bold text-[14px] leading-tight" style={{ color: '#14161b' }}>Configuração do CRM</h1>
            <p className="text-[11px]" style={{ color: '#868c97' }}>Mensagens prontas e motivos de não fechamento</p>
          </div>
        </div>
      </div>

      {aviso && (
        <div className="max-w-4xl mx-auto px-5 pt-4">
          <p className="text-[12.5px] px-3 py-2 rounded-lg"
            style={{ background: '#e6f1eb', color: '#2f6b4f' }}>{aviso}</p>
        </div>
      )}

      {carregando ? (
        <p className="p-8 text-[13px]" style={{ color: '#868c97' }}>Carregando...</p>
      ) : (
        <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">

          {/* ── Mensagens prontas ── */}
          <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e5e5ea' }}>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-bold text-[15px]" style={{ color: '#14161b' }}>Mensagens prontas</h2>
              <div className="flex-1" />
              <button onClick={() => setModelos([...modelos, { nome: '', texto: '' }])}
                className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1"
                style={{ background: '#efedfb', color: '#5b4fcf' }}>
                <Plus size={13} /> Nova
              </button>
              <button onClick={() => salvar('modelos')} disabled={salvando === 'modelos'}
                className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1 disabled:opacity-40"
                style={{ background: '#5b4fcf', color: '#fff' }}>
                <Save size={13} />{salvando === 'modelos' ? 'Salvando' : 'Salvar'}
              </button>
            </div>
            <p className="text-[12px] mb-4" style={{ color: '#868c97' }}>
              Aparecem como botões acima do campo de resposta. Use colchetes para o que muda
              a cada cliente — [dia], [hora], [valor] — para quem responde lembrar de trocar.
            </p>

            {modelos.length === 0 && (
              <p className="text-[12.5px]" style={{ color: '#868c97' }}>Nenhuma mensagem. Clique em Nova.</p>
            )}

            <div className="space-y-3">
              {modelos.map((m, i) => (
                <div key={i} className="rounded-xl border p-3" style={{ borderColor: '#e5e5ea', background: '#fbfbfd' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex flex-col" style={{ color: '#b0b4bd' }}>
                      <button onClick={() => mover(modelos, setModelos, i, -1)} title="Subir"
                        className="leading-none text-[10px]">▲</button>
                      <button onClick={() => mover(modelos, setModelos, i, 1)} title="Descer"
                        className="leading-none text-[10px]">▼</button>
                    </div>
                    <input value={m.nome} onChange={e => {
                      const n = [...modelos]; n[i] = { ...m, nome: e.target.value }; setModelos(n)
                    }} placeholder="Nome do botão (ex.: Responder preço)"
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-[12.5px] font-bold focus:outline-none"
                      style={{ background: '#fff', border: '1px solid #e5e5ea', color: '#14161b' }} />
                    <input value={m.atalho || ''} onChange={e => {
                      const n = [...modelos]; n[i] = { ...m, atalho: e.target.value }; setModelos(n)
                    }} placeholder="atalho"
                      className="w-24 px-2.5 py-1.5 rounded-lg text-[12px] focus:outline-none"
                      style={{ background: '#fff', border: '1px solid #e5e5ea', color: '#575d68' }} />
                    <button onClick={() => setModelos(modelos.filter((_, k) => k !== i))} title="Apagar"
                      className="p-1.5 rounded-lg" style={{ color: '#b4322a' }}><Trash2 size={14} /></button>
                  </div>
                  <textarea value={m.texto || ''} rows={3} onChange={e => {
                    const n = [...modelos]; n[i] = { ...m, texto: e.target.value }; setModelos(n)
                  }} placeholder="O texto que vai para a cliente"
                    className="w-full px-2.5 py-2 rounded-lg text-[12.5px] resize-none focus:outline-none"
                    style={{ background: '#fff', border: '1px solid #e5e5ea', color: '#14161b' }} />
                </div>
              ))}
            </div>
          </section>

          {/* ── Motivos de não fechamento ── */}
          <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e5e5ea' }}>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-bold text-[15px]" style={{ color: '#14161b' }}>Por que não fechou</h2>
              <div className="flex-1" />
              <button onClick={() => setMotivos([...motivos, { nome: '' }])}
                className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1"
                style={{ background: '#efedfb', color: '#5b4fcf' }}>
                <Plus size={13} /> Novo
              </button>
              <button onClick={() => salvar('motivos')} disabled={salvando === 'motivos'}
                className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1 disabled:opacity-40"
                style={{ background: '#5b4fcf', color: '#fff' }}>
                <Save size={13} />{salvando === 'motivos' ? 'Salvando' : 'Salvar'}
              </button>
            </div>
            <p className="text-[12px] mb-4" style={{ color: '#868c97' }}>
              É o motivo que vira ação: quem caiu por preço recebe promoção, quem caiu por
              horário recebe encaixe. Motivo genérico demais não vira nada.
            </p>

            <div className="space-y-2">
              {motivos.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-col" style={{ color: '#b0b4bd' }}>
                    <button onClick={() => mover(motivos, setMotivos, i, -1)} className="leading-none text-[10px]">▲</button>
                    <button onClick={() => mover(motivos, setMotivos, i, 1)} className="leading-none text-[10px]">▼</button>
                  </div>
                  <input value={m.nome} onChange={e => {
                    const n = [...motivos]; n[i] = { ...m, nome: e.target.value }; setMotivos(n)
                  }} placeholder="Ex.: Achou caro"
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-[12.5px] focus:outline-none"
                    style={{ background: '#fbfbfd', border: '1px solid #e5e5ea', color: '#14161b' }} />
                  <button onClick={() => setMotivos(motivos.filter((_, k) => k !== i))} title="Apagar"
                    className="p-1.5 rounded-lg" style={{ color: '#b4322a' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </section>

          {/* ── De onde a cliente veio ── */}
          <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e5e5ea' }}>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-bold text-[15px]" style={{ color: '#14161b' }}>De onde a cliente veio</h2>
              <div className="flex-1" />
              <button onClick={() => setOrigens([...origens, { nome: '' }])}
                className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1"
                style={{ background: '#efedfb', color: '#5b4fcf' }}>
                <Plus size={13} /> Nova
              </button>
              <button onClick={() => salvar('origens')} disabled={salvando === 'origens'}
                className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1 disabled:opacity-40"
                style={{ background: '#5b4fcf', color: '#fff' }}>
                <Save size={13} />{salvando === 'origens' ? 'Salvando' : 'Salvar'}
              </button>
            </div>
            <p className="text-[12px] mb-4" style={{ color: '#868c97' }}>
              Sem isto o salão sabe quanto gastou em anúncio e não sabe o que voltou — que é a
              conta que decide o orçamento do mês seguinte. O painel mostra a conversão por origem.
            </p>

            <div className="space-y-2">
              {origens.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-col" style={{ color: '#b0b4bd' }}>
                    <button onClick={() => mover(origens, setOrigens, i, -1)} className="leading-none text-[10px]">▲</button>
                    <button onClick={() => mover(origens, setOrigens, i, 1)} className="leading-none text-[10px]">▼</button>
                  </div>
                  <input value={m.nome} onChange={e => {
                    const n = [...origens]; n[i] = { ...m, nome: e.target.value }; setOrigens(n)
                  }} placeholder="Ex.: Tráfego pago"
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-[12.5px] focus:outline-none"
                    style={{ background: '#fbfbfd', border: '1px solid #e5e5ea', color: '#14161b' }} />
                  <button onClick={() => setOrigens(origens.filter((_, k) => k !== i))} title="Apagar"
                    className="p-1.5 rounded-lg" style={{ color: '#b4322a' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
