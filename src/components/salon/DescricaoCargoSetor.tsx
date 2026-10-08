'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Loader2, Save, Printer, Plus, Trash2, ChevronUp, ChevronDown, Pencil, Eye, X,
} from 'lucide-react'
import {
  type DocCargo, type BlocoCargo, type TipoBloco,
  TIPOS_BLOCO, blocoVazio, docVazio, lerDoc, novoId,
} from '@/lib/descricaoCargoModelo'

// ── Descrição de Cargo de um setor ─────────────────────────────────────────
//
// Duas telas na mesma página: LER e EDITAR.
//
// Ler é o que se mostra numa entrevista -- o documento limpo, em seções, sem
// campo de formulário no meio atrapalhando a leitura. Editar é onde se
// acrescenta um dever, corrige uma palavra, muda um bloco de lugar.
//
// Guardado por SETOR, em `salao_config`, na chave `descricao_cargo_<id>`:
// cada setor tem o seu, e o do Coordenador não se mistura com o do
// Responsável por Processos.

const chaveDo = (profId: string) => `descricao_cargo_${profId}`

export default function DescricaoCargoSetor({ profId, nomeSetor }: {
  profId: string
  nomeSetor: string
}) {
  const [doc, setDoc] = useState<DocCargo>(() => docVazio(nomeSetor))
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [sujo, setSujo] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const d = await fetch(`/api/salon/grid?chave=${chaveDo(profId)}`).then(r => (r.ok ? r.json() : null))
      setDoc(lerDoc(d, nomeSetor))
    } catch { /* fica o vazio */ }
    setCarregando(false)
  }, [profId, nomeSetor])
  useEffect(() => { carregar() }, [carregar])

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
        body: JSON.stringify({ chave: chaveDo(profId), doc: paraGravar }),
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
    const esc = (v: any) => String(v ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const corpoHtml = doc.blocos.map(b => {
      const t = b.titulo.trim() ? `<h2>${esc(b.titulo)}</h2>` : ''
      if (b.tipo === 'divisor') return '<hr>'
      if (b.tipo === 'destaque') {
        return `${t}<div class="destaque">${esc(b.corpo).replace(/\n/g, '<br>')}</div>`
      }
      if (b.tipo === 'lista' || b.tipo === 'checklist') {
        const marca = b.tipo === 'checklist' ? 'check' : 'bola'
        const lis = (b.itens || []).filter(i => i.trim())
          .map(i => `<li class="${marca}">${esc(i)}</li>`).join('')
        return `${t}<ul class="${marca}">${lis}</ul>`
      }
      return `${t}<p>${esc(b.corpo).replace(/\n/g, '<br>')}</p>`
    }).join('')

    const css = `@page{size:A4 portrait;margin:18mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2430;font-size:12.5px;line-height:1.65}
.hd{border-bottom:3px solid #5b4fcf;padding-bottom:10px;margin-bottom:18px}
.hd .cargo{font-size:21px;font-weight:800;color:#1f2430}
.hd .setor{font-size:12px;color:#6b6860;letter-spacing:2px;text-transform:uppercase;margin-top:2px}
h2{font-size:13.5px;font-weight:800;color:#5b4fcf;margin:18px 0 7px;text-transform:uppercase;letter-spacing:.5px}
p{margin-bottom:9px;text-align:justify}
ul{margin:0 0 10px 2px;list-style:none}
li{position:relative;padding-left:17px;margin-bottom:4px}
li.bola:before{content:'•';position:absolute;left:3px;color:#5b4fcf;font-weight:700}
li.check:before{content:'\\2713';position:absolute;left:0;color:#2F6B4F;font-weight:700}
.destaque{background:#f4f3fb;border-left:3px solid #5b4fcf;padding:10px 13px;margin-bottom:10px}
hr{border:none;border-top:1px solid #e0ddd8;margin:18px 0}
@media print{body{-webkit-print-color-adjust:exact}h2{break-after:avoid}}`

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">`
      + `<title>${esc(doc.cargo)}</title><style>${css}</style></head><body>`
      + `<div class="hd"><div class="cargo">${esc(doc.cargo)}</div>`
      + `<div class="setor">Descrição de cargo</div></div>`
      + (corpoHtml || '<p><i>Sem conteúdo.</i></p>')
      + `<script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700')
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

        <button onClick={imprimir}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold border border-nodri-border text-nodri-t2 shrink-0">
          <Printer size={14} /> Imprimir
        </button>

        {/* Só aparece com alteração pendente: botão de salvar sempre aceso
            deixa de significar alguma coisa. */}
        {sujo && (
          <button onClick={salvar} disabled={salvando}
            className="flex items-center gap-1.5 bg-nodri-cyan text-black px-4 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50 shrink-0">
            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
          </button>
        )}
      </div>

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
