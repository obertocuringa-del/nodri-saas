'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Save, Loader2, ExternalLink, ArrowUp, ArrowDown } from 'lucide-react'
import { LANDING_PADRAO } from '@/lib/landingDefaults'
import { urlDeImagem, idDoYoutube } from '@/components/Carrossel'

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

  // Sobe ou desce um item da lista. A ordem do array E a ordem que a pagina
  // mostra, entao mexer aqui e a unica forma de escolher qual arte aparece
  // primeiro no topo do site.
  function moveItem(chave: string, i: number, passo: number) {
    setCfg((p: any) => {
      const arr = [...(p[chave] || [])]
      const j = i + passo
      if (j < 0 || j >= arr.length) return p
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { ...p, [chave]: arr }
    })
  }

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
        {/* ── Voltar à abertura recomendada ────────────────────────────────
            Os textos do topo ficam salvos no banco e ganham dos do código.
            Sem este botão, trocar a abertura significava reescrever cinco
            campos à mão — e não havia caminho de volta se alguém apagasse
            uma frase boa.

            Ele mexe SÓ na abertura (etiqueta, título, texto e os três
            destaques). Tudo que você escreveu no resto da página — dores,
            comparação, benefícios, contato, afiliados, rodapé — fica como
            está. Um "restaurar tudo" apagaria meses de escrita por um
            clique errado.

            E ele não salva sozinho: preenche os campos e deixa você ler
            antes de clicar em Salvar. */}
        <button
          onClick={() => {
            if (!confirm('Isto substitui a etiqueta, o título, o texto de abertura e os três destaques pelos recomendados.\n\nO resto da página não é tocado. Nada é salvo até você clicar em Salvar.\n\nContinuar?')) return
            setCfg((p: any) => ({
              ...p,
              hero_etiqueta: LANDING_PADRAO.hero_etiqueta,
              hero_titulo: LANDING_PADRAO.hero_titulo,
              hero_subtitulo: LANDING_PADRAO.hero_subtitulo,
              destaques: JSON.parse(JSON.stringify(LANDING_PADRAO.destaques)),
            }))
          }}
          className="w-full mb-2 px-3 py-2 rounded-lg border border-nodri-cyan text-nodri-cyan text-[11px] font-bold hover:bg-nodri-cyan/10 transition">
          Usar a abertura recomendada
        </button>
        <p className="text-[10px] text-nodri-t3 -mt-1 mb-2">
          Preenche só o topo (etiqueta, título, texto e destaques) com a versão
          recomendada. O resto da página fica intacto e nada é salvo até você
          clicar em Salvar.
        </p>

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
          {(cfg.hero_midias || []).map((m: any, i: number) => {
            const yt = idDoYoutube(m.url || '')
            const total = (cfg.hero_midias || []).length
            return (
            <div key={i} className="flex gap-1.5 mb-1.5 items-center">
              {/* A ordem aqui e a ordem no site. Sem o numero e a miniatura,
                  escolher qual arte abre a pagina era abrir link por link. */}
              <span className="shrink-0 w-5 h-5 rounded-full bg-nodri-cyan/15 text-nodri-cyan text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
              <div className="shrink-0 w-11 h-11 rounded-lg border border-nodri-border bg-nodri-surface overflow-hidden flex items-center justify-center">
                {yt
                  ? <img src={`https://img.youtube.com/vi/${yt}/default.jpg`} alt="" className="w-full h-full object-cover" />
                  : m.url?.trim()
                    ? <img src={urlDeImagem(m.url)} alt="" className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                    : <span className="text-[9px] text-nodri-t3">vazio</span>}
              </div>
              <input className={inp} value={m.url} placeholder="Link da foto ou do vídeo do YouTube"
                onChange={e => setItem('hero_midias', i, 'url', e.target.value)} />
              {/* Foto de salao fica bem preenchendo o quadro; arte, nao —
                  preencher come as bordas, que e onde ficam titulo e rodape. */}
              <label className="flex items-center gap-1 text-[10px] text-nodri-t2 shrink-0 cursor-pointer" title="Marque para artes e infográficos: a imagem aparece completa, sem cortar as bordas">
                <input type="checkbox" checked={!!m.inteira}
                  onChange={e => setItem('hero_midias', i, 'inteira', e.target.checked)} />
                inteira
              </label>
              <button onClick={() => moveItem('hero_midias', i, -1)} disabled={i === 0}
                title="Mostrar antes" className="text-nodri-t2 p-1 shrink-0 disabled:opacity-25"><ArrowUp size={12} /></button>
              <button onClick={() => moveItem('hero_midias', i, 1)} disabled={i === total - 1}
                title="Mostrar depois" className="text-nodri-t2 p-1 shrink-0 disabled:opacity-25"><ArrowDown size={12} /></button>
              <button onClick={() => delItem('hero_midias', i)}
                className="text-nodri-red p-1 shrink-0"><Trash2 size={11} /></button>
            </div>
            )
          })}
          <p className="text-[10px] text-nodri-t3 mt-1">
            <strong>Imagem:</strong> <strong>1200 × 1100 px</strong> (quase quadrada), até 500 KB. A altura do espaço acompanha a altura da janela de quem visita — nessa proporção a arte se ajusta bem em qualquer tela.<br />
            <strong>Foto</strong> (deixe <strong>inteira</strong> desmarcada): preenche o espaço todo e as <strong>bordas são aparadas</strong> — deixe o que importa no centro. Nunca distorce.<br />
            <strong>Arte, infográfico ou print</strong> (marque <strong>inteira</strong>): aparece por completo, sem cortar nada. A moldura passa a ter o tamanho da arte, centralizada no espaço — em janela mais baixa ela encolhe junto, em vez de ter as pontas comidas. O layout da página não muda.<br />
            <strong>Ordem:</strong> o número na frente é a ordem em que aparecem no site. Use as setas para subir e descer — a de número 1 é a que abre a página.<br />
            <strong>Vídeo do YouTube:</strong> 16:9, e entra alinhado com a primeira linha do texto do lado.<br />
            Sem nenhuma mídia, o topo mostra a ilustração do painel que já vem no sistema. Com mais de uma, vira carrossel.
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

      {/* PÁGINA DO AFILIADO — /trabalhe-conosco, inteira editável aqui */}
      <Bloco titulo="Rodapé do site">
        <p className="text-[10px] text-nodri-t3 -mt-1">
          Identificação da empresa no fim da página. Campo que você deixar em
          branco simplesmente não aparece no site.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo="Nome no rodapé" v={cfg.footer_logo} on={(v: string) => set('footer_logo', v)} />
          <Campo rotulo="Frase abaixo do nome" v={cfg.footer_texto} on={(v: string) => set('footer_texto', v)} />
          <Campo rotulo="Razão social" v={cfg.footer_razao_social} on={(v: string) => set('footer_razao_social', v)} />
          <Campo rotulo="CNPJ" v={cfg.footer_cnpj} on={(v: string) => set('footer_cnpj', v)} />
          <Campo rotulo="E-mail de contato" v={cfg.footer_email} on={(v: string) => set('footer_email', v)} />
          <Campo rotulo="WhatsApp (só números, com DDI)" v={cfg.footer_whatsapp} on={(v: string) => set('footer_whatsapp', v)} />
        </div>
        <Campo rotulo="Endereço" v={cfg.footer_endereco} on={(v: string) => set('footer_endereco', v)} />
        <Campo rotulo="Frase de direitos autorais" v={cfg.footer_direitos} on={(v: string) => set('footer_direitos', v)} />
      </Bloco>

      <Bloco titulo="Página do afiliado (/trabalhe-conosco)">
        <p className="text-[10px] text-nodri-t3 -mt-1">
          É a página que abre no botão “Quero ser Afiliado”. O que estiver entre **dois asteriscos** aparece na cor da marca.
        </p>
        <Campo rotulo="Título" v={cfg.afiliado_pg_titulo} on={(v: string) => set('afiliado_pg_titulo', v)} />
        <Campo rotulo="Texto de abertura" v={cfg.afiliado_pg_subtitulo} on={(v: string) => set('afiliado_pg_subtitulo', v)} area />

        <Lista titulo="Cartões de vantagem"
          itens={cfg.afiliado_pg_cards || []}
          add={() => addItem('afiliado_pg_cards', { titulo: 'Novo', desc: '' })}
          del={(i: number) => delItem('afiliado_pg_cards', i)}
          render={(c: any, i: number) => (
            <>
              <input className={inp} value={c.titulo} placeholder="Título"
                onChange={e => setItem('afiliado_pg_cards', i, 'titulo', e.target.value)} />
              <input className={inp} value={c.desc} placeholder="Descrição"
                onChange={e => setItem('afiliado_pg_cards', i, 'desc', e.target.value)} />
            </>
          )} />

        <Campo rotulo="Título do formulário" v={cfg.afiliado_pg_form_titulo} on={(v: string) => set('afiliado_pg_form_titulo', v)} />
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo="Rótulo: nome" v={cfg.afiliado_pg_rot_nome} on={(v: string) => set('afiliado_pg_rot_nome', v)} />
          <Campo rotulo="Rótulo: CPF" v={cfg.afiliado_pg_rot_cpf} on={(v: string) => set('afiliado_pg_rot_cpf', v)} />
          <Campo rotulo="Rótulo: telefone" v={cfg.afiliado_pg_rot_telefone} on={(v: string) => set('afiliado_pg_rot_telefone', v)} />
          <Campo rotulo="Rótulo: email" v={cfg.afiliado_pg_rot_email} on={(v: string) => set('afiliado_pg_rot_email', v)} />
          <Campo rotulo="Rótulo: chave Pix" v={cfg.afiliado_pg_rot_pix} on={(v: string) => set('afiliado_pg_rot_pix', v)} />
          <Campo rotulo="Texto do botão" v={cfg.afiliado_pg_botao} on={(v: string) => set('afiliado_pg_botao', v)} />
        </div>
        <Campo rotulo="Aviso embaixo da chave Pix" v={cfg.afiliado_pg_dica_pix} on={(v: string) => set('afiliado_pg_dica_pix', v)} />

        <div className="border-t border-nodri-border pt-2.5 mt-1">
          <span className={lbl}>Tela depois do cadastro</span>
          <Campo rotulo="Título" v={cfg.afiliado_pg_sucesso_titulo} on={(v: string) => set('afiliado_pg_sucesso_titulo', v)} />
          <Campo rotulo="Texto" v={cfg.afiliado_pg_sucesso_texto} on={(v: string) => set('afiliado_pg_sucesso_texto', v)} area />
          <div className="grid grid-cols-2 gap-2">
            <Campo rotulo="Rótulo do cupom" v={cfg.afiliado_pg_sucesso_cupom} on={(v: string) => set('afiliado_pg_sucesso_cupom', v)} />
            <Campo rotulo="Rótulo do link" v={cfg.afiliado_pg_sucesso_link} on={(v: string) => set('afiliado_pg_sucesso_link', v)} />
          </div>
          <Campo rotulo="Título do 'Como usar'" v={cfg.afiliado_pg_como_usar_titulo} on={(v: string) => set('afiliado_pg_como_usar_titulo', v)} />
          <span className={lbl + ' mt-2'}>Itens do &quot;Como usar&quot;</span>
          <ListaTexto chave="afiliado_pg_como_usar" itens={cfg.afiliado_pg_como_usar || []}
            setItem={setItem} add={addItem} del={delItem} />
        </div>
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
