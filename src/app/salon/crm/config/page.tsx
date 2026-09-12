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
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Eye, EyeOff } from 'lucide-react'
import { ESTADOS } from '@/lib/crm'
import {
  ESTADOS_VAZIO, CORES_ESTADO, chaveDoExtra, ehEstadoDoSalao,
  type ConfigEstados,
} from '@/lib/crmEstados'

type Item = { id?: string; nome: string; texto?: string; atalho?: string; ativo?: boolean }

export default function ConfigCrmPage() {
  const [modelos, setModelos] = useState<Item[]>([])
  const [motivos, setMotivos] = useState<Item[]>([])
  const [origens, setOrigens] = useState<Item[]>([])
  const [desmarques, setDesmarques] = useState<Item[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<'' | 'modelos' | 'motivos' | 'origens' | 'desmarques'>('')
  const [aviso, setAviso] = useState('')
  const [limpando, setLimpando] = useState(false)
  // Os botoes da faixa: o que o salao escondeu, renomeou e criou.
  const [estados, setEstados] = useState<ConfigEstados>(ESTADOS_VAZIO)
  const [salvandoEstados, setSalvandoEstados] = useState(false)

  async function recomecar() {
    if (!confirm(
      'Isto apaga TODAS as conversas, mensagens e contatos do CRM e pede para escanear ' +
      'o QR de novo.\n\nAs mensagens prontas, os motivos e as origens continuam.\n\n' +
      'Tem certeza?'
    )) return
    setLimpando(true)
    try {
      const r = await fetch('/api/crm/canal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'recomecar' }),
      })
      if (r.ok) { window.location.href = '/salon/crm' }
      else setAviso((await r.json().catch(() => ({}))).error || 'Não consegui limpar.')
    } finally { setLimpando(false) }
  }

  useEffect(() => {
    fetch('/api/crm/config')
      .then(r => r.ok ? r.json() : { modelos: [], motivos: [], origens: [] })
      .then(d => { setModelos(d.modelos || []); setMotivos(d.motivos || []); setOrigens(d.origens || []); setDesmarques(d.desmarques || []); setEstados(d.estados || ESTADOS_VAZIO) })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  async function salvar(lista: 'modelos' | 'motivos' | 'origens' | 'desmarques') {
    setSalvando(lista); setAviso('')
    try {
      const itens = lista === 'modelos' ? modelos : lista === 'motivos' ? motivos : lista === 'origens' ? origens : desmarques
      const r = await fetch('/api/crm/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lista, itens }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setAviso(d.error || 'Não consegui salvar.'); return }
      setAviso(lista === 'modelos' ? 'Mensagens salvas.' : lista === 'motivos' ? 'Motivos salvos.' : lista === 'origens' ? 'Origens salvas.' : 'Motivos de desmarque salvos.')
      // Relê: o servidor é quem dá o id dos itens novos, e sem ele a próxima
      // gravação criaria tudo de novo em vez de atualizar.
      const novo = await fetch('/api/crm/config').then(x => x.json()).catch(() => null)
      if (novo) { setModelos(novo.modelos || []); setMotivos(novo.motivos || []); setOrigens(novo.origens || []); setDesmarques(novo.desmarques || []) }
    } finally { setSalvando('') }
  }

  // ── Os botões da faixa ────────────────────────────────────────────────────
  async function salvarEstados(cfg: ConfigEstados) {
    setEstados(cfg)
    setSalvandoEstados(true); setAviso('')
    try {
      const r = await fetch('/api/crm/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lista: 'estados', estados: cfg }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setAviso(d.error || 'Não consegui salvar.'); return }
      setAviso('Botões salvos.')
    } finally { setSalvandoEstados(false) }
  }

  const ajusteDe = (chave: string) => estados.ajustes.find(a => a.chave === chave)

  function mexerNoAjuste(chave: string, patch: Partial<{ rotulo: string; oculto: boolean }>) {
    const outros = estados.ajustes.filter(a => a.chave !== chave)
    const atual = ajusteDe(chave) || { chave }
    salvarEstados({ ...estados, ajustes: [...outros, { ...atual, ...patch }] })
  }

  function criarBotao() {
    const nome = prompt('Nome do botão novo (ex.: Orçamento enviado):')
    if (!nome || !nome.trim()) return
    const cor = CORES_ESTADO[estados.extras.length % CORES_ESTADO.length]
    salvarEstados({
      ...estados,
      extras: [...estados.extras, {
        chave: chaveDoExtra(nome) + '_' + Date.now().toString(36).slice(-3),
        rotulo: nome.trim().slice(0, 40),
        cor: cor.cor, fundo: cor.fundo,
        ordem: estados.extras.length,
      }],
    })
  }

  function excluirBotao(chave: string) {
    if (!confirm(
      'Excluir este botão?\n\nAs conversas que estiverem nessa pasta NÃO se perdem — ' +
      'elas continuam lá e voltam a aparecer se você criar o botão de novo.'
    )) return
    salvarEstados({ ...estados, extras: estados.extras.filter(e => e.chave !== chave) })
  }

  const mover = (lista: Item[], set: (v: Item[]) => void, i: number, passo: number) => {
    const j = i + passo
    if (j < 0 || j >= lista.length) return
    const novo = [...lista]
    ;[novo[i], novo[j]] = [novo[j], novo[i]]
    set(novo)
  }

  return (
    <div className="min-h-screen" style={{ background: '#faf9f7' }}>
      <div className="sticky top-0 z-20 border-b" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
        <div className="px-4 py-2.5 flex items-center gap-3" style={{ paddingRight: 340 }}>
          <a href="/salon/crm" className="p-1.5 rounded-lg" style={{ color: '#6b6860' }} title="Voltar ao CRM">
            <ArrowLeft size={17} />
          </a>
          <div>
            <h1 className="font-bold text-[14px] leading-tight" style={{ color: '#1a1a1a' }}>Configuração do CRM</h1>
            <p className="text-[11px]" style={{ color: '#8f877f' }}>Mensagens prontas e motivos de não fechamento</p>
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
        <p className="p-8 text-[13px]" style={{ color: '#8f877f' }}>Carregando...</p>
      ) : (
        <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">

          {/* ── Os botões da faixa ── */}
          <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-bold text-[15px]" style={{ color: '#1a1a1a' }}>Botões da conversa</h2>
              <div className="flex-1" />
              <button onClick={criarBotao} disabled={salvandoEstados}
                className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1 disabled:opacity-40"
                style={{ background: '#f1eefc', color: '#5b4fcf' }}>
                <Plus size={13} /> Novo botão
              </button>
            </div>
            <p className="text-[12px] mb-4" style={{ color: '#8f877f' }}>
              São os botões que aparecem em cima da conversa. Salva sozinho a cada mudança.
            </p>

            {/* A diferença entre os dois grupos precisa estar dita, senão o
                salão espera do botão que criou a mesma automação dos de
                fábrica -- e some uma conversa que ele achava que voltaria. */}
            <div className="rounded-xl p-3 mb-4" style={{ background: '#FBF2E0', border: '1px solid #e8d9b0' }}>
              <p className="text-[12px] leading-relaxed" style={{ color: '#6b6860' }}>
                <strong style={{ color: '#9a6b12' }}>Os de fábrica</strong> você pode esconder e
                renomear, mas o comportamento fica: é neles que o sistema mexe sozinho — pausa que
                vence vira follow-up, cliente que sumiu vira follow-up, atendimento vira agendado.
                <br />
                <strong style={{ color: '#9a6b12' }}>Os que você criar</strong> são pastas que só se
                mexem na mão. O sistema nunca põe nem tira ninguém delas — não prometo automação
                que ninguém escreveu.
              </p>
            </div>

            <p className="text-[11px] font-bold mb-2" style={{ color: '#8f877f' }}>DE FÁBRICA</p>
            <div className="space-y-2 mb-5">
              {ESTADOS.filter(e => e.chave !== 'acao_necessaria').map(e => {
                const aj = ajusteDe(e.chave)
                const oculto = !!aj?.oculto
                return (
                  <div key={e.chave} className="flex items-center gap-2 rounded-xl border p-2"
                    style={{ borderColor: '#e8e6e0', background: oculto ? '#faf9f7' : '#fff' }}>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex-shrink-0"
                      style={{ background: e.fundo, color: e.cor, opacity: oculto ? .45 : 1 }}>
                      {aj?.rotulo || e.acao || e.rotulo}
                    </span>
                    <input
                      value={aj?.rotulo ?? ''}
                      onChange={ev => mexerNoAjuste(e.chave, { rotulo: ev.target.value })}
                      placeholder={`Renomear (hoje: ${e.acao || e.rotulo})`}
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-[12px] focus:outline-none"
                      style={{ background: '#faf9f7', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />
                    <button onClick={() => mexerNoAjuste(e.chave, { oculto: !oculto })}
                      title={oculto ? 'Mostrar este botão' : 'Esconder este botão'}
                      className="p-1.5 rounded-lg flex-shrink-0"
                      style={{ color: oculto ? '#b4322a' : '#6b6860' }}>
                      {oculto ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                )
              })}
            </div>

            <p className="text-[11px] font-bold mb-2" style={{ color: '#8f877f' }}>OS SEUS</p>
            {estados.extras.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: '#8f877f' }}>
                Nenhum ainda. Clique em “Novo botão”.
              </p>
            ) : (
              <div className="space-y-2">
                {estados.extras.map((e, i) => (
                  <div key={e.chave} className="flex items-center gap-2 rounded-xl border p-2"
                    style={{ borderColor: '#e8e6e0', background: '#fff' }}>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex-shrink-0"
                      style={{ background: e.fundo, color: e.cor }}>{e.rotulo}</span>
                    <input value={e.rotulo}
                      onChange={ev => {
                        const novos = [...estados.extras]
                        novos[i] = { ...e, rotulo: ev.target.value.slice(0, 40) }
                        setEstados({ ...estados, extras: novos })
                      }}
                      onBlur={() => salvarEstados(estados)}
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg text-[12px] focus:outline-none"
                      style={{ background: '#faf9f7', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />
                    <select value={e.cor}
                      onChange={ev => {
                        const c = CORES_ESTADO.find(x => x.cor === ev.target.value) || CORES_ESTADO[0]
                        const novos = [...estados.extras]
                        novos[i] = { ...e, cor: c.cor, fundo: c.fundo }
                        salvarEstados({ ...estados, extras: novos })
                      }}
                      className="px-2 py-1.5 rounded-lg text-[11.5px] focus:outline-none flex-shrink-0"
                      style={{ background: '#faf9f7', border: '1px solid #e8e6e0', color: '#1a1a1a' }}>
                      {CORES_ESTADO.map(c => <option key={c.cor} value={c.cor}>{c.nome}</option>)}
                    </select>
                    <button onClick={() => excluirBotao(e.chave)} title="Excluir este botão"
                      className="p-1.5 rounded-lg flex-shrink-0" style={{ color: '#b4322a' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Mensagens prontas ── */}
          <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-bold text-[15px]" style={{ color: '#1a1a1a' }}>Mensagens prontas</h2>
              <div className="flex-1" />
              <button onClick={() => setModelos([...modelos, { nome: '', texto: '' }])}
                className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1"
                style={{ background: '#f1eefc', color: '#5b4fcf' }}>
                <Plus size={13} /> Nova
              </button>
              <button onClick={() => salvar('modelos')} disabled={salvando === 'modelos'}
                className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1 disabled:opacity-40"
                style={{ background: '#5b4fcf', color: '#fff' }}>
                <Save size={13} />{salvando === 'modelos' ? 'Salvando' : 'Salvar'}
              </button>
            </div>
            <p className="text-[12px] mb-2" style={{ color: '#8f877f' }}>
              Aparecem como botões acima do campo de resposta. Use colchetes para o que muda
              a cada cliente — [dia], [hora], [valor] — para quem responde lembrar de trocar.
            </p>

            {/* As duas peças que o sistema preenche sozinho. Precisam estar
                ditas aqui, com o aviso de não traduzir nem reescrever: uma
                chave alterada não dá erro nenhum — ela simplesmente vai para a
                cliente escrita como está. */}
            <div className="rounded-xl p-3 mb-4" style={{ background: '#FBF2E0', border: '1px solid #e8d9b0' }}>
              <p className="text-[12px] font-bold mb-1" style={{ color: '#9a6b12' }}>
                Duas coisas o sistema preenche sozinho
              </p>
              <p className="text-[12px] leading-relaxed" style={{ color: '#6b6860' }}>
                <code style={{ background: '#fff', padding: '1px 5px', borderRadius: 4 }}>{'{cliente}'}</code>{' '}
                vira o primeiro nome de quem está do outro lado. Se o contato ainda não
                tem nome, some sem deixar buraco: <em>“Olá {'{cliente}'}, tudo bem?”</em> sai
                como <em>“Olá, tudo bem?”</em>.
                <br />
                <code style={{ background: '#fff', padding: '1px 5px', borderRadius: 4 }}>{'{atendente}'}</code>{' '}
                vira o nome de quem está na recepção. A lista sai do cadastro de
                Profissionais, cargo <strong>Recepcionista</strong> — quem entra e sai da
                equipe é atualizado lá, e não aqui.
                <br />
                <strong style={{ color: '#9a6b12' }}>Escreva as duas exatamente assim</strong>, com as
                chaves e em minúsculas. Trocada ou traduzida, ela não dá erro: vai para a
                cliente escrita do jeito que estiver.
              </p>
            </div>

            {modelos.length === 0 && (
              <p className="text-[12.5px]" style={{ color: '#8f877f' }}>Nenhuma mensagem. Clique em Nova.</p>
            )}

            <div className="space-y-3">
              {modelos.map((m, i) => (
                <div key={i} className="rounded-xl border p-3" style={{ borderColor: '#e8e6e0', background: '#fdfcfa' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex flex-col" style={{ color: '#b5aca4' }}>
                      <button onClick={() => mover(modelos, setModelos, i, -1)} title="Subir"
                        className="leading-none text-[10px]">▲</button>
                      <button onClick={() => mover(modelos, setModelos, i, 1)} title="Descer"
                        className="leading-none text-[10px]">▼</button>
                    </div>
                    <input value={m.nome} onChange={e => {
                      const n = [...modelos]; n[i] = { ...m, nome: e.target.value }; setModelos(n)
                    }} placeholder="Nome do botão (ex.: Responder preço)"
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-[12.5px] font-bold focus:outline-none"
                      style={{ background: '#fff', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />
                    <input value={m.atalho || ''} onChange={e => {
                      const n = [...modelos]; n[i] = { ...m, atalho: e.target.value }; setModelos(n)
                    }} placeholder="atalho"
                      className="w-24 px-2.5 py-1.5 rounded-lg text-[12px] focus:outline-none"
                      style={{ background: '#fff', border: '1px solid #e8e6e0', color: '#6b6860' }} />
                    <button onClick={() => setModelos(modelos.filter((_, k) => k !== i))} title="Apagar"
                      className="p-1.5 rounded-lg" style={{ color: '#b4322a' }}><Trash2 size={14} /></button>
                  </div>
                  <textarea value={m.texto || ''} rows={3} onChange={e => {
                    const n = [...modelos]; n[i] = { ...m, texto: e.target.value }; setModelos(n)
                  }} placeholder="O texto que vai para a cliente"
                    className="w-full px-2.5 py-2 rounded-lg text-[12.5px] resize-none focus:outline-none"
                    style={{ background: '#fff', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />
                </div>
              ))}
            </div>
          </section>

          {/* ── Motivos de não fechamento ── */}
          <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-bold text-[15px]" style={{ color: '#1a1a1a' }}>Por que não fechou</h2>
              <div className="flex-1" />
              <button onClick={() => setMotivos([...motivos, { nome: '' }])}
                className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1"
                style={{ background: '#f1eefc', color: '#5b4fcf' }}>
                <Plus size={13} /> Novo
              </button>
              <button onClick={() => salvar('motivos')} disabled={salvando === 'motivos'}
                className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1 disabled:opacity-40"
                style={{ background: '#5b4fcf', color: '#fff' }}>
                <Save size={13} />{salvando === 'motivos' ? 'Salvando' : 'Salvar'}
              </button>
            </div>
            <p className="text-[12px] mb-4" style={{ color: '#8f877f' }}>
              É o motivo que vira ação: quem caiu por preço recebe promoção, quem caiu por
              horário recebe encaixe. Motivo genérico demais não vira nada.
            </p>

            <div className="space-y-2">
              {motivos.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-col" style={{ color: '#b5aca4' }}>
                    <button onClick={() => mover(motivos, setMotivos, i, -1)} className="leading-none text-[10px]">▲</button>
                    <button onClick={() => mover(motivos, setMotivos, i, 1)} className="leading-none text-[10px]">▼</button>
                  </div>
                  <input value={m.nome} onChange={e => {
                    const n = [...motivos]; n[i] = { ...m, nome: e.target.value }; setMotivos(n)
                  }} placeholder="Ex.: Achou caro"
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-[12.5px] focus:outline-none"
                    style={{ background: '#fdfcfa', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />
                  <button onClick={() => setMotivos(motivos.filter((_, k) => k !== i))} title="Apagar"
                    className="p-1.5 rounded-lg" style={{ color: '#b4322a' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </section>

          {/* ── Por que desmarcou ── */}
          <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-bold text-[15px]" style={{ color: '#1a1a1a' }}>Por que desmarcou</h2>
              <div className="flex-1" />
              <button onClick={() => setDesmarques([...desmarques, { nome: '' }])}
                className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1"
                style={{ background: '#F1EEFC', color: '#5b4fcf' }}>
                <Plus size={13} /> Novo
              </button>
              <button onClick={() => salvar('desmarques')} disabled={salvando === 'desmarques'}
                className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1 disabled:opacity-40"
                style={{ background: '#5b4fcf', color: '#fff' }}>
                <Save size={13} />{salvando === 'desmarques' ? 'Salvando' : 'Salvar'}
              </button>
            </div>
            <p className="text-[12px] mb-4" style={{ color: '#8f877f' }}>
              Lista separada da de "não fechou", de propósito: quem desmarca já tinha decidido vir.
              O que a faz desistir depois é outra coisa, e exige outra resposta do salão.
            </p>
            <div className="space-y-2">
              {desmarques.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-col" style={{ color: '#b5aca4' }}>
                    <button onClick={() => mover(desmarques, setDesmarques, i, -1)} className="leading-none text-[10px]">▲</button>
                    <button onClick={() => mover(desmarques, setDesmarques, i, 1)} className="leading-none text-[10px]">▼</button>
                  </div>
                  <input value={m.nome} onChange={e => {
                    const n = [...desmarques]; n[i] = { ...m, nome: e.target.value }; setDesmarques(n)
                  }} placeholder="Ex.: Imprevisto no trabalho"
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-[12.5px] focus:outline-none"
                    style={{ background: '#fdfcfa', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />
                  <button onClick={() => setDesmarques(desmarques.filter((_, k) => k !== i))} title="Apagar"
                    className="p-1.5 rounded-lg" style={{ color: '#b4322a' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </section>

          {/* ── De onde a cliente veio ── */}
          <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="font-bold text-[15px]" style={{ color: '#1a1a1a' }}>De onde a cliente veio</h2>
              <div className="flex-1" />
              <button onClick={() => setOrigens([...origens, { nome: '' }])}
                className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1"
                style={{ background: '#f1eefc', color: '#5b4fcf' }}>
                <Plus size={13} /> Nova
              </button>
              <button onClick={() => salvar('origens')} disabled={salvando === 'origens'}
                className="px-3 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center gap-1 disabled:opacity-40"
                style={{ background: '#5b4fcf', color: '#fff' }}>
                <Save size={13} />{salvando === 'origens' ? 'Salvando' : 'Salvar'}
              </button>
            </div>
            <p className="text-[12px] mb-4" style={{ color: '#8f877f' }}>
              Sem isto o salão sabe quanto gastou em anúncio e não sabe o que voltou — que é a
              conta que decide o orçamento do mês seguinte. O painel mostra a conversão por origem.
            </p>

            <div className="space-y-2">
              {origens.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex flex-col" style={{ color: '#b5aca4' }}>
                    <button onClick={() => mover(origens, setOrigens, i, -1)} className="leading-none text-[10px]">▲</button>
                    <button onClick={() => mover(origens, setOrigens, i, 1)} className="leading-none text-[10px]">▼</button>
                  </div>
                  <input value={m.nome} onChange={e => {
                    const n = [...origens]; n[i] = { ...m, nome: e.target.value }; setOrigens(n)
                  }} placeholder="Ex.: Tráfego pago"
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-[12.5px] focus:outline-none"
                    style={{ background: '#fdfcfa', border: '1px solid #e8e6e0', color: '#1a1a1a' }} />
                  <button onClick={() => setOrigens(origens.filter((_, k) => k !== i))} title="Apagar"
                    className="p-1.5 rounded-lg" style={{ color: '#b4322a' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </section>

          {/* ── Recomecar ── */}
          <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8d9b0' }}>
            <h2 className="font-bold text-[15px] mb-1" style={{ color: '#9a6b12' }}>Trocou o WhatsApp do salão?</h2>
            <p className="text-[12px] mb-4" style={{ color: '#6b6860' }}>
              Quando o número conectado muda, as conversas do aparelho anterior continuam aqui e
              passam a mentir. Não existe botão de atualizar que resolva: o WhatsApp só entrega o
              histórico <strong>no momento em que você escaneia o QR</strong>. O caminho é limpar e
              escanear de novo com o número certo.
              <br /><br />
              Isto apaga conversas, mensagens e contatos. <strong>Não apaga</strong> as mensagens
              prontas, os motivos nem as origens desta página.
            </p>
            <button onClick={recomecar} disabled={limpando}
              className="px-4 py-2.5 rounded-lg text-[12.5px] font-bold disabled:opacity-50"
              style={{ background: '#9a6b12', color: '#fff' }}>
              {limpando ? 'Limpando...' : 'Limpar tudo e escanear de novo'}
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
