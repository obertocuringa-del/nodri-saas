'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Save, Loader2, ExternalLink } from 'lucide-react'
import { LANDING_PADRAO } from '@/lib/landingDefaults'

// ── Editor da página inicial ────────────────────────────────────────────────
//
// Tudo o que aparece em nodri.com.br se edita aqui. Antes, metade da página
// era texto fixo no código: cards de dores, comparação com o concorrente,
// destaques do topo. Mudar qualquer um deles exigia programador.
//
// "Seções extras" é o que resolve o futuro: você cria um bloco novo — título,
// texto, cards e botão — e ele aparece na página sem ninguém tocar em código.

const inp = 'w-full px-3 py-2 rounded-lg bg-nodri-surface border border-nodri-border text-[12px] text-nodri-t1 outline-none focus:border-nodri-cyan'
const lbl = 'text-[10px] font-bold text-nodri-t3 uppercase tracking-wider mb-1 block'

export default function EditorVitrine() {
  const [cfg, setCfg] = useState<any>(LANDING_PADRAO)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    fetch('/api/landing-config')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && typeof d === 'object') setCfg({ ...LANDING_PADRAO, ...d }) })
      .catch(() => { /* fica com o padrão */ })
      .finally(() => setCarregando(false))
  }, [])

  const set = (k: string, v: any) => setCfg((p: any) => ({ ...p, [k]: v }))

  // Edita um item de lista sem mexer nos outros.
  function setItem(chave: string, i: number, campo: string | null, valor: any) {
    setCfg((p: any) => {
      const arr = [...(p[chave] || [])]
      arr[i] = campo ? { ...arr[i], [campo]: valor } : valor
      return { ...p, [chave]: arr }
    })
  }
  const addItem = (chave: string, vazio: any) => setCfg((p: any) => ({ ...p, [chave]: [...(p[chave] || []), vazio] }))
  const delItem = (chave: string, i: number) => setCfg((p: any) => ({ ...p, [chave]: (p[chave] || []).filter((_: any, j: number) => j !== i) }))

  async function salvar() {
    setSalvando(true)
    const r = await fetch('/api/landing-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    setSalvando(false)
    if (r.ok) { toast.success('Página inicial salva'); return }
    // Mensagem do servidor, nao um "nao foi possivel" que nao ajuda ninguem
    // a descobrir o que houve.
    const e = await r.json().catch(() => ({} as any))
    toast.error(`Não salvou (${r.status}): ${e?.error || 'motivo desconhecido'}`, { duration: 8000 })
  }

  if (carregando) return <div className="nodri-card p-6 text-center text-nodri-t3 text-sm">Carregando…</div>

  return (
    <div className="flex flex-col gap-3 pb-24">
      {/* TOPO */}
      <Bloco titulo="Topo da página">
        <Campo rotulo="Etiqueta pequena" v={cfg.hero_etiqueta} on={(v: string) => set('hero_etiqueta', v)} />
        <Campo rotulo="Título principal" v={cfg.hero_titulo} on={(v: string) => set('hero_titulo', v)} area />
        <Campo rotulo="Texto abaixo do título" v={cfg.hero_subtitulo} on={(v: string) => set('hero_subtitulo', v)} area />
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo="Botão principal" v={cfg.hero_botao} on={(v: string) => set('hero_botao', v)} />
          <Campo rotulo="Botão secundário" v={cfg.hero_botao2} on={(v: string) => set('hero_botao2', v)} />
        </div>
        <Campo rotulo="Frase de rodapé do topo" v={cfg.hero_rodape} on={(v: string) => set('hero_rodape', v)} />

        {/* Fotos do topo. Vazio = fica a ilustração do painel. */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className={lbl + ' mb-0'}>Fotos e vídeos do topo</span>
            <button onClick={() => addItem('hero_midias', { url: '' })}
              className="text-[10px] text-nodri-cyan font-bold">+ Adicionar</button>
          </div>
          {(cfg.hero_midias || []).map((m: any, i: number) => (
            <div key={i} className="flex gap-1.5 mb-1.5">
              <input className={inp} value={m.url} placeholder="Link da foto ou do vídeo do YouTube"
                onChange={e => setItem('hero_midias', i, 'url', e.target.value)} />
              <button onClick={() => delItem('hero_midias', i)}
                className="text-nodri-red p-1 shrink-0"><Trash2 size={11} /></button>
            </div>
          ))}
          <p className="text-[10px] text-nodri-t3 mt-1">
            Foto: 1200 × 1500 px (4:5, em pé), até 500 KB — a foto preenche a coluna inteira do topo, da barra até o fim da tela. Foto deitada também serve: o que sobra é cortado nas bordas, nunca distorcido.<br />
            Vídeo do YouTube: continua 16:9 e entra alinhado com o começo do texto do lado.<br />
            Sem nenhuma, o topo mostra a ilustração do painel. Com mais de uma, vira carrossel.
          </p>
        </div>

        <div className="w-40">
          <Campo rotulo="Trocar a cada (segundos)" v={String(cfg.hero_intervalo ?? 5)}
            on={(v: string) => set('hero_intervalo', Number(v) || 5)} />
        </div>

        <Lista titulo="Três destaques" itens={cfg.destaques || []}
          add={() => addItem('destaques', { titulo: 'Novo', desc: '' })}
          del={(i: number) => delItem('destaques', i)}
          render={(d: any, i: number) => (
            <>
              <input className={inp} value={d.titulo} placeholder="Título"
                onChange={e => setItem('destaques', i, 'titulo', e.target.value)} />
              <input className={inp} value={d.desc} placeholder="Descrição"
                onChange={e => setItem('destaques', i, 'desc', e.target.value)} />
            </>
          )} />
      </Bloco>

      {/* DORES */}
      <Bloco titulo="Seção “Se você se reconhece aqui”">
        <Campo rotulo="Título" v={cfg.dores_titulo} on={(v: string) => set('dores_titulo', v)} area />
        <Campo rotulo="Subtítulo" v={cfg.dores_subtitulo} on={(v: string) => set('dores_subtitulo', v)} area />
        <Lista titulo="Cards" itens={cfg.dores || []}
          add={() => addItem('dores', { titulo: 'Nova dor', desc: '' })}
          del={(i: number) => delItem('dores', i)}
          render={(d: any, i: number) => (
            <>
              <input className={inp} value={d.titulo} placeholder="Título do card"
                onChange={e => setItem('dores', i, 'titulo', e.target.value)} />
              <textarea className={inp + ' resize-none'} rows={2} value={d.desc} placeholder="Descrição"
                onChange={e => setItem('dores', i, 'desc', e.target.value)} />
            </>
          )} />
      </Bloco>

      {/* COMPARAÇÃO */}
      <Bloco titulo="Comparação com os concorrentes">
        <Campo rotulo="Título (use | para quebrar a linha)" v={cfg.comparacao_titulo} on={(v: string) => set('comparacao_titulo', v)} area />
        <Campo rotulo="Subtítulo" v={cfg.comparacao_subtitulo} on={(v: string) => set('comparacao_subtitulo', v)} area />
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Campo rotulo="Coluna 1 — título" v={cfg.comparacao_col1_titulo} on={(v: string) => set('comparacao_col1_titulo', v)} />
            <ListaTexto chave="comparacao_col1" itens={cfg.comparacao_col1 || []}
              setItem={setItem} add={addItem} del={delItem} />
          </div>
          <div>
            <Campo rotulo="Coluna 2 — título" v={cfg.comparacao_col2_titulo} on={(v: string) => set('comparacao_col2_titulo', v)} />
            <ListaTexto chave="comparacao_col2" itens={cfg.comparacao_col2 || []}
              setItem={setItem} add={addItem} del={delItem} />
          </div>
        </div>
      </Bloco>

      {/* BENEFÍCIOS */}
      <Bloco titulo="Seção de benefícios">
        <Campo rotulo="Título" v={cfg.beneficios_titulo} on={(v: string) => set('beneficios_titulo', v)} area />
        <Lista titulo="Cards" itens={cfg.beneficios || []}
          add={() => addItem('beneficios', { emoji: '', titulo: 'Novo', desc: '' })}
          del={(i: number) => delItem('beneficios', i)}
          render={(b: any, i: number) => (
            <>
              <input className={inp} value={b.titulo} placeholder="Título"
                onChange={e => setItem('beneficios', i, 'titulo', e.target.value)} />
              <textarea className={inp + ' resize-none'} rows={2} value={b.desc} placeholder="Descrição"
                onChange={e => setItem('beneficios', i, 'desc', e.target.value)} />
            </>
          )} />
      </Bloco>

      {/* SEÇÕES EXTRAS */}
      <Bloco titulo="Seções extras (criadas por você)">
        <p className="text-[11px] text-nodri-t2 leading-relaxed mb-3">
          Cada seção vira um bloco novo na página, logo antes do formulário de contato.
          Use para o que a gente ainda vai acrescentar — depoimentos, perguntas frequentes,
          um vídeo, uma promoção. Sem precisar de programador.
        </p>
        {(cfg.blocos_extras || []).map((b: any, i: number) => (
          <div key={i} className="rounded-lg border border-nodri-border p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-nodri-t1">Seção {i + 1}</span>
              <button onClick={() => delItem('blocos_extras', i)} className="text-nodri-red p-1"><Trash2 size={12} /></button>
            </div>
            <Campo rotulo="Título" v={b.titulo} on={(v: string) => setItem('blocos_extras', i, 'titulo', v)} />
            <Campo rotulo="Texto" v={b.subtitulo || ''} on={(v: string) => setItem('blocos_extras', i, 'subtitulo', v)} area />
            <div className="grid grid-cols-3 gap-2">
              <Campo rotulo="Texto do botão" v={b.botao_texto || ''} on={(v: string) => setItem('blocos_extras', i, 'botao_texto', v)} />
              <Campo rotulo="Link do botão" v={b.botao_link || ''} on={(v: string) => setItem('blocos_extras', i, 'botao_link', v)} />
              <div>
                <label className={lbl}>Fundo</label>
                <select className={inp} value={b.fundo || 'claro'}
                  onChange={e => setItem('blocos_extras', i, 'fundo', e.target.value)}>
                  <option value="claro">Cinza claro</option>
                  <option value="branco">Branco</option>
                  <option value="marinho">Azul marinho</option>
                </select>
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-nodri-t3 uppercase">Cards</span>
                <button onClick={() => {
                  const cards = [...(b.cards || []), { titulo: 'Novo card', desc: '' }]
                  setItem('blocos_extras', i, 'cards', cards)
                }} className="text-[10px] text-nodri-cyan font-bold">+ Adicionar card</button>
              </div>
              {(b.cards || []).map((card: any, j: number) => (
                <div key={j} className="flex gap-2 mb-1.5">
                  <input className={inp} value={card.titulo} placeholder="Título"
                    onChange={e => {
                      const cards = [...(b.cards || [])]; cards[j] = { ...cards[j], titulo: e.target.value }
                      setItem('blocos_extras', i, 'cards', cards)
                    }} />
                  <input className={inp} value={card.desc} placeholder="Descrição"
                    onChange={e => {
                      const cards = [...(b.cards || [])]; cards[j] = { ...cards[j], desc: e.target.value }
                      setItem('blocos_extras', i, 'cards', cards)
                    }} />
                  <button onClick={() => {
                    const cards = (b.cards || []).filter((_: any, k: number) => k !== j)
                    setItem('blocos_extras', i, 'cards', cards)
                  }} className="text-nodri-red p-1 shrink-0"><Trash2 size={11} /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
        <button onClick={() => addItem('blocos_extras', { titulo: 'Nova seção', subtitulo: '', cards: [], fundo: 'claro' })}
          className="px-3 py-1.5 rounded-lg bg-nodri-cyan text-white text-[11px] font-bold flex items-center gap-1.5">
          <Plus size={12} /> Adicionar seção
        </button>
      </Bloco>

      {/* CONTATO E AFILIADOS */}
      <Bloco titulo="Formulário de contato">
        <Campo rotulo="Título" v={cfg.contato_titulo} on={(v: string) => set('contato_titulo', v)} />
        <Campo rotulo="Texto" v={cfg.contato_subtitulo} on={(v: string) => set('contato_subtitulo', v)} area />
      </Bloco>

      <Bloco titulo="Seção de afiliados">
        <Campo rotulo="Título" v={cfg.afiliados_titulo} on={(v: string) => set('afiliados_titulo', v)} />
        <Campo rotulo="Texto" v={cfg.afiliados_subtitulo} on={(v: string) => set('afiliados_subtitulo', v)} area />
        <Campo rotulo="Texto do botão" v={cfg.afiliados_botao} on={(v: string) => set('afiliados_botao', v)} />
        <ListaChips itens={cfg.afiliados_chips || []} setItem={setItem} add={addItem} del={delItem} />
      </Bloco>

      {/* BARRA DE SALVAR — fixa, para não precisar rolar até o fim */}
      <div className="sticky bottom-0 bg-nodri-card border-t border-nodri-border p-3 flex items-center gap-2 -mx-1">
        <a href="/" target="_blank" rel="noopener noreferrer"
          className="px-3 py-2 rounded-lg border border-nodri-border text-nodri-t2 text-[11.5px] font-bold flex items-center gap-1.5">
          <ExternalLink size={12} /> Ver a página
        </a>
        <button onClick={salvar} disabled={salvando}
          className="flex-1 px-4 py-2.5 rounded-lg bg-nodri-cyan text-white text-[12.5px] font-bold flex items-center justify-center gap-2 disabled:opacity-50">
          {salvando ? <><Loader2 size={13} className="animate-spin" /> Salvando…</> : <><Save size={13} /> Salvar página inicial</>}
        </button>
      </div>
    </div>
  )
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="nodri-card p-4">
      <h3 className="font-syne font-bold text-[12px] text-nodri-cyan mb-3">{titulo}</h3>
      <div className="grid gap-2.5">{children}</div>
    </div>
  )
}

function Campo({ rotulo, v, on, area }: { rotulo: string; v: string; on: (v: string) => void; area?: boolean }) {
  return (
    <div>
      <label className={lbl}>{rotulo}</label>
      {area
        ? <textarea className={inp + ' resize-none'} rows={2} value={v || ''} onChange={e => on(e.target.value)} />
        : <input className={inp} value={v || ''} onChange={e => on(e.target.value)} />}
    </div>
  )
}

function Lista({ titulo, itens, add, del, render }: {
  titulo: string; itens: any[]; add: () => void; del: (i: number) => void
  render: (item: any, i: number) => React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={lbl + ' mb-0'}>{titulo}</span>
        <button onClick={add} className="text-[10px] text-nodri-cyan font-bold">+ Adicionar</button>
      </div>
      {itens.map((item, i) => (
        <div key={i} className="flex gap-2 items-start mb-2">
          <div className="grid gap-1.5 flex-1">{render(item, i)}</div>
          <button onClick={() => del(i)} className="text-nodri-red p-1 shrink-0"><Trash2 size={11} /></button>
        </div>
      ))}
    </div>
  )
}

function ListaTexto({ chave, itens, setItem, add, del }: any) {
  return (
    <div className="mt-2">
      {itens.map((t: string, i: number) => (
        <div key={i} className="flex gap-1.5 mb-1.5">
          <input className={inp} value={t} onChange={e => setItem(chave, i, null, e.target.value)} />
          <button onClick={() => del(chave, i)} className="text-nodri-red p-1 shrink-0"><Trash2 size={11} /></button>
        </div>
      ))}
      <button onClick={() => add(chave, 'Novo item')} className="text-[10px] text-nodri-cyan font-bold">+ Adicionar item</button>
    </div>
  )
}

function ListaChips({ itens, setItem, add, del }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={lbl + ' mb-0'}>Chips de destaque</span>
        <button onClick={() => add('afiliados_chips', { emoji: '', texto: 'Novo' })} className="text-[10px] text-nodri-cyan font-bold">+ Adicionar</button>
      </div>
      {itens.map((c: any, i: number) => (
        <div key={i} className="flex gap-1.5 mb-1.5">
          <input className={inp + ' w-14 text-center'} value={c.emoji}
            onChange={e => setItem('afiliados_chips', i, 'emoji', e.target.value)} />
          <input className={inp} value={c.texto}
            onChange={e => setItem('afiliados_chips', i, 'texto', e.target.value)} />
          <button onClick={() => del('afiliados_chips', i)} className="text-nodri-red p-1 shrink-0"><Trash2 size={11} /></button>
        </div>
      ))}
    </div>
  )
}
