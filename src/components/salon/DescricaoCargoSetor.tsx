'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Loader2, Save, Printer, Plus, Trash2, ChevronUp, ChevronDown, Pencil, Eye, X,
  Settings2,
} from 'lucide-react'
import {
  type DocCargo, type BlocoCargo,
  TIPOS_BLOCO, blocoVazio, docVazio, lerDoc, novoId,
} from '@/lib/descricaoCargoModelo'
import {
  folhaParaImprimir, IMPRESSAO_PADRAO, CORES_IMPRESSAO, type OpcoesImpressao,
} from '@/lib/documentoBlocosImpressao'

// ── Documento em blocos de um setor ────────────────────────────────────────
//
// Serve a qualquer documento do setor -- descrição de cargo, POP, política.
// Quem decide qual é o `docId`: a mesma tela, o mesmo editor, arquivos
// separados no banco.
//
// Duas telas na mesma página: LER e EDITAR.
//
// Ler é o que se mostra numa entrevista ou se cola na parede -- o documento
// limpo, em seções, sem campo de formulário no meio atrapalhando a leitura.
// Editar é onde se acrescenta um dever, corrige uma palavra, muda um bloco
// de lugar.
//
// Guardado por SETOR + DOCUMENTO, em `salao_config`: cada setor tem os seus,
// e o do Coordenador não se mistura com o do Responsável por Processos.

const chaveDo = (profId: string, docId: string) => `${docId}_${profId}`
const chaveImpressao = (profId: string, docId: string) => `nodri_impr_${docId}_${profId}`

export default function DescricaoCargoSetor({ profId, nomeSetor, docId = 'descricao_cargo', rotulo = 'Descrição de cargo', salao, logo }: {
  profId: string
  nomeSetor: string
  /** Prefixo da chave no banco. Documentos diferentes, arquivos diferentes. */
  docId?: string
  /** O que vai no subtítulo da folha impressa. */
  rotulo?: string
  salao?: string
  logo?: string | null
}) {
  const [impr, setImpr] = useState<OpcoesImpressao>(IMPRESSAO_PADRAO)
  const [painelImpr, setPainelImpr] = useState(false)
  const [doc, setDoc] = useState<DocCargo>(() => docVazio(nomeSetor))
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [sujo, setSujo] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const d = await fetch(`/api/salon/grid?chave=${chaveDo(profId, docId)}`).then(r => (r.ok ? r.json() : null))
      setDoc(lerDoc(d, nomeSetor))
    } catch { /* fica o vazio */ }
    setCarregando(false)
  }, [profId, nomeSetor, docId])
  useEffect(() => { carregar() }, [carregar])

  // As preferências de impressão são de quem imprime, não do documento:
  // ficam no aparelho. Em janela anônima o acesso falha e vale o padrão.
  useEffect(() => {
    try {
      const g = localStorage.getItem(chaveImpressao(profId, docId))
      if (g) setImpr({ ...IMPRESSAO_PADRAO, ...JSON.parse(g) })
    } catch { /* vale o padrão */ }
  }, [profId, docId])

  function mudarImpr(novo: OpcoesImpressao) {
    setImpr(novo)
    try { localStorage.setItem(chaveImpressao(profId, docId), JSON.stringify(novo)) } catch { /* */ }
  }

  // Sai da página com alteração não salva: o navegador pergunta antes.
  useEffect(() => {
    if (!sujo) return
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [sujo])

  function mexer(fn: (d: DocCargo) => DocCargo) {
    setDoc(d => fn(structuredClone(d)))
    setSujo(true)
  }

  async function salvar() {
    setSalvando(true)
    const paraGravar = { ...doc, atualizado_em: new Date().toISOString() }
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: chaveDo(profId, docId), doc: paraGravar }),
      })
      if (!r.ok) { toast.error('Não deu para salvar.'); return }
      setDoc(paraGravar); setSujo(false)
      toast.success('Descrição salva')
    } catch {
      toast.error('Sem conexão.')
    } finally {
      setSalvando(false)
    }
  }

  function imprimir() {
    const html = folhaParaImprimir(doc, impr, { salao, logo, subtitulo: rotulo })
    const w = window.open('', '_blank', 'width=900,height=760')
    if (!w) { toast.error('O navegador bloqueou a janela de impressão.'); return }
    w.document.write(html); w.document.close(); w.focus()
  }

  if (carregando) {
    return <div className="flex items-center gap-2 text-nodri-t3 text-[13px] p-6">
      <Loader2 size={15} className="animate-spin" /> Carregando…
    </div>
  }

  return (
    <div className="space-y-4">
      {/* ── Barra de ações ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <input value={doc.cargo} disabled={!editando}
            onChange={e => mexer(d => ({ ...d, cargo: e.target.value }))}
            placeholder="Nome do cargo"
            className={'w-full font-syne font-bold text-[17px] bg-transparent outline-none '
              + (editando ? 'border-b border-nodri-border focus:border-nodri-cyan' : 'border-b border-transparent')} />
          {doc.atualizado_em && (
            <p className="text-[11px] text-nodri-t3 mt-0.5">
              Atualizada em {new Date(doc.atualizado_em).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>

        <button onClick={() => setEditando(v => !v)}
          className={'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold border transition shrink-0 '
            + (editando
              ? 'border-nodri-border text-nodri-t2'
              : 'border-nodri-cyan text-nodri-cyan hover:bg-nodri-cyan/10')}>
          {editando ? <><Eye size={14} /> Ver pronto</> : <><Pencil size={14} /> Editar</>}
        </button>

        <div className="flex items-center shrink-0">
          <button onClick={imprimir}
            className="flex items-center gap-1.5 px-3 py-2 rounded-l-lg text-[12px] font-bold border border-nodri-border text-nodri-t2">
            <Printer size={14} /> Imprimir
          </button>
          <button onClick={() => setPainelImpr(v => !v)} title="Ajustar a impressão"
            className={'px-2 py-2 rounded-r-lg text-[12px] border border-l-0 border-nodri-border transition '
              + (painelImpr ? 'text-nodri-cyan' : 'text-nodri-t3 hover:text-nodri-cyan')}>
            <Settings2 size={14} />
          </button>
        </div>

        {/* Só aparece com alteração pendente: botão de salvar sempre aceso
            deixa de significar alguma coisa. */}
        {sujo && (
          <button onClick={salvar} disabled={salvando}
            className="flex items-center gap-1.5 bg-nodri-cyan text-black px-4 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50 shrink-0">
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
          </button>
        )}
      </div>

      {/* ── Ajustes da folha ──
          Impressão é outro meio: não tem rolagem, a página tem borda física,
          e o que quebra no lugar errado não se conserta rolando. Por isso as
          opções mexem no que importa no papel. */}
      {painelImpr && (
        <div className="border border-nodri-border rounded-xl p-3 space-y-3 bg-nodri-surface">
          <p className="text-[11.5px] font-bold text-nodri-t2">Como a folha sai</p>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-nodri-t2 w-20">Cor</span>
            {CORES_IMPRESSAO.map(c => (
              <button key={c.cor} title={c.nome}
                onClick={() => mudarImpr({ ...impr, cor: c.cor })}
                className={'w-7 h-7 rounded-full border-2 transition '
                  + (impr.cor === c.cor ? 'border-nodri-t1 scale-110' : 'border-transparent')}
                style={{ background: c.cor }} />
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-nodri-t2 w-20">Letra</span>
            <input type="range" min={9} max={14} step={0.5} value={impr.tamanho}
              onChange={e => mudarImpr({ ...impr, tamanho: Number(e.target.value) })}
              className="flex-1 max-w-[180px]" />
            <span className="text-[12px] text-nodri-t3 w-14">{impr.tamanho} pt</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {([
              ['comLogo', 'Logo do salão no topo'],
              ['comNumeracao', 'Data no rodapé'],
              ['comAssinatura', 'Linhas de assinatura no fim'],
              ['quebrarSecoes', 'Cada seção numa folha'],
            ] as const).map(([k, rot]) => (
              <label key={k} className="flex items-center gap-2 text-[12px] text-nodri-t2">
                <input type="checkbox" checked={!!impr[k]}
                  onChange={e => mudarImpr({ ...impr, [k]: e.target.checked })} />
                {rot}
              </label>
            ))}
          </div>

          <p className="text-[11px] text-nodri-t3 leading-relaxed">
            Título nunca fica sozinho no pé da página, e lista ou destaque não
            se parte ao meio — isso já é automático. "Cada seção numa folha"
            serve para o POP virar cartaz na parede.
          </p>
        </div>
      )}

      {sujo && (
        <p className="text-[11.5px] text-amber-600 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
          Há alterações não salvas.
        </p>
      )}

      {/* ── O documento ── */}
      {!doc.blocos.length ? (
        <div className="text-center py-12 border border-dashed border-nodri-border rounded-xl">
          <p className="text-[13px] text-nodri-t3 mb-3">Esta descrição de cargo ainda está vazia.</p>
          {!editando && (
            <button onClick={() => setEditando(true)}
              className="bg-nodri-cyan text-black px-4 py-2 rounded-lg text-[12px] font-bold">
              Começar a escrever
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {doc.blocos.map((b, i) => (
            <Bloco key={b.id} b={b} editando={editando}
              primeiro={i === 0} ultimo={i === doc.blocos.length - 1}
              onMudar={novo => mexer(d => { d.blocos[i] = novo; return d })}
              onSubir={() => mexer(d => {
                const [x] = d.blocos.splice(i, 1); d.blocos.splice(i - 1, 0, x); return d
              })}
              onDescer={() => mexer(d => {
                const [x] = d.blocos.splice(i, 1); d.blocos.splice(i + 1, 0, x); return d
              })}
              onExcluir={() => {
                if (!confirm('Excluir este bloco?')) return
                mexer(d => { d.blocos.splice(i, 1); return d })
              }}
              onDuplicar={() => mexer(d => {
                d.blocos.splice(i + 1, 0, { ...structuredClone(b), id: novoId() }); return d
              })} />
          ))}
        </div>
      )}

      {/* ── O que dá para acrescentar ── */}
      {editando && (
        <div className="border border-nodri-border rounded-xl p-3">
          <p className="text-[11.5px] font-bold text-nodri-t2 mb-2">Acrescentar</p>
          <div className="flex gap-2 flex-wrap">
            {TIPOS_BLOCO.map(t => (
              <button key={t.tipo} title={t.ajuda}
                onClick={() => mexer(d => { d.blocos.push(blocoVazio(t.tipo)); return d })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-nodri-border text-[12px] text-nodri-t2 hover:border-nodri-cyan hover:text-nodri-cyan transition">
                <Plus size={13} /> {t.rotulo}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-nodri-t3 mt-2 leading-relaxed">
            Passe o mouse em cada botão para ver onde usar.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Um bloco ───────────────────────────────────────────────────────────────

function Bloco({ b, editando, primeiro, ultimo, onMudar, onSubir, onDescer, onExcluir, onDuplicar }: {
  b: BlocoCargo
  editando: boolean
  primeiro: boolean
  ultimo: boolean
  onMudar: (b: BlocoCargo) => void
  onSubir: () => void
  onDescer: () => void
  onExcluir: () => void
  onDuplicar: () => void
}) {
  const campo = 'w-full bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-nodri-cyan'

  if (b.tipo === 'divisor') {
    return (
      <div className="flex items-center gap-2">
        <hr className="flex-1 border-nodri-border" />
        {editando && <Ferramentas {...{ primeiro, ultimo, onSubir, onDescer, onExcluir, onDuplicar }} />}
      </div>
    )
  }

  // ── Modo leitura: o documento como se imprime ──
  if (!editando) {
    return (
      <div>
        {b.titulo.trim() && (
          <h3 className="font-syne font-bold text-[13px] uppercase tracking-wide text-nodri-purple mb-1.5">
            {b.titulo}
          </h3>
        )}
        {b.tipo === 'destaque' && (
          <div className="bg-nodri-surface border-l-[3px] border-nodri-purple rounded-r-lg px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap">
            {b.corpo}
          </div>
        )}
        {b.tipo === 'texto' && (
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-nodri-t1">{b.corpo}</p>
        )}
        {(b.tipo === 'lista' || b.tipo === 'checklist') && (
          <ul className="space-y-1">
            {(b.itens || []).filter(i => i.trim()).map((i, k) => (
              <li key={k} className="flex gap-2 text-[13px] leading-relaxed">
                <span className={'shrink-0 ' + (b.tipo === 'checklist' ? 'text-green-600' : 'text-nodri-purple')}>
                  {b.tipo === 'checklist' ? '✓' : '•'}
                </span>
                <span>{i}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  // ── Modo edição ──
  return (
    <div className="border border-nodri-border rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-nodri-t3 bg-nodri-surface px-2 py-1 rounded shrink-0">
          {TIPOS_BLOCO.find(t => t.tipo === b.tipo)?.rotulo}
        </span>
        <input value={b.titulo} onChange={e => onMudar({ ...b, titulo: e.target.value })}
          placeholder="Título (opcional)"
          className="flex-1 min-w-0 bg-transparent border-b border-nodri-border focus:border-nodri-cyan outline-none text-[13px] font-bold py-1" />
        <Ferramentas {...{ primeiro, ultimo, onSubir, onDescer, onExcluir, onDuplicar }} />
      </div>

      {(b.tipo === 'texto' || b.tipo === 'destaque') && (
        <textarea value={b.corpo || ''} onChange={e => onMudar({ ...b, corpo: e.target.value })}
          rows={Math.max(3, String(b.corpo || '').split('\n').length)}
          placeholder="Escreva aqui…" className={campo + ' resize-y leading-relaxed'} />
      )}

      {(b.tipo === 'lista' || b.tipo === 'checklist') && (
        <div className="space-y-1.5">
          {(b.itens || []).map((it, k) => (
            <div key={k} className="flex items-center gap-2">
              <span className={'shrink-0 text-[13px] ' + (b.tipo === 'checklist' ? 'text-green-600' : 'text-nodri-purple')}>
                {b.tipo === 'checklist' ? '✓' : '•'}
              </span>
              <input value={it}
                onChange={e => {
                  const itens = [...(b.itens || [])]; itens[k] = e.target.value
                  onMudar({ ...b, itens })
                }}
                onKeyDown={e => {
                  // Enter cria o próximo item: escrever vinte deveres clicando
                  // em "+ item" vinte vezes é trabalho que a tecla já faz.
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const itens = [...(b.itens || [])]; itens.splice(k + 1, 0, '')
                    onMudar({ ...b, itens })
                  }
                }}
                placeholder="Item…" className={campo + ' py-1.5'} />
              <button onClick={() => {
                const itens = [...(b.itens || [])]; itens.splice(k, 1)
                onMudar({ ...b, itens: itens.length ? itens : [''] })
              }} title="Remover item" className="text-nodri-t3 hover:text-red-400 shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
          <button onClick={() => onMudar({ ...b, itens: [...(b.itens || []), ''] })}
            className="text-[11.5px] text-nodri-cyan font-bold flex items-center gap-1 mt-1">
            <Plus size={12} /> item
          </button>
        </div>
      )}
    </div>
  )
}

function Ferramentas({ primeiro, ultimo, onSubir, onDescer, onExcluir, onDuplicar }: {
  primeiro: boolean; ultimo: boolean
  onSubir: () => void; onDescer: () => void; onExcluir: () => void; onDuplicar: () => void
}) {
  const b = 'p-1 text-nodri-t3 hover:text-nodri-cyan disabled:opacity-25 disabled:hover:text-nodri-t3'
  return (
    <div className="flex items-center shrink-0">
      <button onClick={onSubir} disabled={primeiro} title="Subir" className={b}><ChevronUp size={15} /></button>
      <button onClick={onDescer} disabled={ultimo} title="Descer" className={b}><ChevronDown size={15} /></button>
      <button onClick={onDuplicar} title="Duplicar" className={b}><Plus size={15} /></button>
      <button onClick={onExcluir} title="Excluir" className="p-1 text-nodri-t3 hover:text-red-400"><Trash2 size={15} /></button>
    </div>
  )
}
