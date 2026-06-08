'use client'
import { useState, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Color } from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, GripVertical, Youtube, FileText, Image as ImageIcon, Table as TableIcon, Columns, Upload, ChevronUp, ChevronDown, Maximize2, Minimize2 } from 'lucide-react'
import toast from 'react-hot-toast'

export type BlocoTipo = 'texto' | 'imagem' | 'video' | 'pdf' | 'excel' | 'tabela' | 'colunas' | 'checklist' | 'faq'

export interface Bloco {
  id: string
  tipo: BlocoTipo
  conteudo: any
  largura?: number // % de 25-100
  altura?: number
}

//  BARRA DE FERRAMENTAS RICH TEXT 
function BarraFerramentas({ editor }: { editor: any }) {
  if (!editor) return null
  const btn = (ativo: boolean, onClick: () => void, label: string, children: React.ReactNode) => (
    <button title={label} onClick={onClick}
      className={`px-2 py-1 rounded text-[11px] transition-all ${ativo ? 'bg-nodri-cyan text-black font-bold' : 'text-nodri-t2 hover:bg-white/10 hover:text-nodri-t1'}`}>
      {children}
    </button>
  )
  return (
    <div className="flex flex-wrap gap-0.5 p-2 bg-nodri-card border-b border-nodri-border rounded-t-lg">
      {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'Negrito', <b>B</b>)}
      {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'Itálico', <i>I</i>)}
      {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'Sublinhado', <u>U</u>)}
      {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), 'Tachado', <s>S</s>)}
      <div className="w-px h-5 bg-nodri-border mx-1 self-center" />
      {btn(editor.isActive({ textAlign: 'left' }), () => editor.chain().focus().setTextAlign('left').run(), 'Esquerda', '')}
      {btn(editor.isActive({ textAlign: 'center' }), () => editor.chain().focus().setTextAlign('center').run(), 'Centro', '↔')}
      {btn(editor.isActive({ textAlign: 'right' }), () => editor.chain().focus().setTextAlign('right').run(), 'Direita', '')}
      <div className="w-px h-5 bg-nodri-border mx-1 self-center" />
      {btn(editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', 'H1')}
      {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', 'H2')}
      {btn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', 'H3')}
      <div className="w-px h-5 bg-nodri-border mx-1 self-center" />
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), 'Lista', '• Lista')}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), 'Numerada', '1. Lista')}
      {btn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), 'Citação', '" "')}
      <div className="w-px h-5 bg-nodri-border mx-1 self-center" />
      <label className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-nodri-t2 hover:bg-white/10 cursor-pointer" title="Cor do texto">
        
        <input type="color" className="w-0 h-0 opacity-0" onChange={e => editor.chain().focus().setColor(e.target.value).run()} />
      </label>
      <label className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-nodri-t2 hover:bg-white/10 cursor-pointer" title="Destaque">
        
        <input type="color" className="w-0 h-0 opacity-0" onChange={e => editor.chain().focus().setHighlight({ color: e.target.value }).run()} />
      </label>
      <div className="w-px h-5 bg-nodri-border mx-1 self-center" />
      <select onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}
        className="bg-nodri-surface border border-nodri-border rounded px-1 py-0.5 text-[10px] text-nodri-t2 outline-none">
        <option value="">Fonte padrão</option>
        <option value="Arial">Arial</option>
        <option value="Georgia">Georgia</option>
        <option value="'Courier New'">Courier New</option>
        <option value="Verdana">Verdana</option>
        <option value="'Times New Roman'">Times New Roman</option>
      </select>
    </div>
  )
}

//  BLOCO TEXTO RICO 
function BlocoTexto({ bloco, onChange }: { bloco: Bloco; onChange: (c: any) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit, Underline, TextStyle, Color, FontFamily,
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Image, TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
    ],
    content: bloco.conteudo?.html || '',
    onUpdate: ({ editor }) => onChange({ html: editor.getHTML() }),
  })
  return (
    <div className="border border-nodri-border rounded-lg overflow-hidden">
      <BarraFerramentas editor={editor} />
      <div className="flex gap-1 p-1 bg-nodri-card border-b border-nodri-border">
        <button onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className="text-[10px] px-2 py-1 border border-nodri-border rounded text-nodri-t3 hover:text-nodri-cyan hover:border-nodri-cyan/30 transition-all">
          + Tabela
        </button>
        {editor?.isActive('table') && <>
          <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="text-[10px] px-2 py-1 border border-nodri-border rounded text-nodri-t3 hover:text-nodri-cyan">+Col</button>
          <button onClick={() => editor.chain().focus().addRowAfter().run()} className="text-[10px] px-2 py-1 border border-nodri-border rounded text-nodri-t3 hover:text-nodri-cyan">+Linha</button>
          <button onClick={() => editor.chain().focus().deleteTable().run()} className="text-[10px] px-2 py-1 border border-nodri-red/30 rounded text-nodri-red hover:bg-nodri-red/10">Del Tabela</button>
        </>}
      </div>
      <EditorContent editor={editor} className="min-h-[120px] p-3 text-[13px] text-nodri-t1 prose prose-invert max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_table]:border-collapse [&_td]:border [&_td]:border-nodri-border [&_td]:p-2 [&_th]:border [&_th]:border-nodri-border [&_th]:p-2 [&_th]:bg-nodri-surface" />
    </div>
  )
}

//  BLOCO IMAGEM 
function BlocoImagem({ bloco, onChange }: { bloco: Bloco; onChange: (c: any) => void }) {
  const [uploading, setUploading] = useState(false)
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('tipo', 'imagem')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.url) { onChange({ url: data.url, legenda: bloco.conteudo?.legenda || '' }); toast.success('Imagem enviada!') }
    else toast.error('Erro ao enviar imagem')
  }
  return (
    <div className="space-y-2">
      {bloco.conteudo?.url ? (
        <div>
          <img src={bloco.conteudo.url} alt="imagem" className="max-w-full rounded-lg max-h-64 object-contain" />
          <input value={bloco.conteudo.legenda || ''} onChange={e => onChange({ ...bloco.conteudo, legenda: e.target.value })}
            placeholder="Legenda da imagem (opcional)"
            className="mt-2 w-full bg-nodri-surface border border-nodri-border rounded px-2 py-1.5 text-[12px] outline-none focus:border-nodri-cyan" />
          <button onClick={() => onChange({ url: '', legenda: '' })} className="mt-1 text-[10px] text-nodri-red hover:underline">Remover imagem</button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-nodri-border rounded-lg p-8 cursor-pointer hover:border-nodri-cyan/40 transition-all">
          {uploading ? <span className="text-nodri-t3 text-[12px]">Enviando...</span> : <>
            <ImageIcon size={28} className="text-nodri-t3" />
            <span className="text-nodri-t3 text-[12px]">Clique para enviar imagem</span>
            <span className="text-nodri-t3 text-[10px]">JPG, PNG, GIF, WebP</span>
          </>}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      )}
    </div>
  )
}

//  BLOCO VÍDEO YOUTUBE 
function BlocoVideo({ bloco, onChange }: { bloco: Bloco; onChange: (c: any) => void }) {
  const embedUrl = (() => {
    const url = bloco.conteudo?.url || ''
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
    return m ? `https://www.youtube.com/embed/${m[1]}` : ''
  })()
  return (
    <div className="space-y-2">
      <input value={bloco.conteudo?.url || ''} onChange={e => onChange({ url: e.target.value })}
        placeholder="Cole o link do YouTube aqui..."
        className="w-full bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[12px] font-mono outline-none focus:border-nodri-cyan" />
      {embedUrl && (
        <div className="relative w-full rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
          <iframe src={embedUrl} className="absolute inset-0 w-full h-full" style={{ border: 'none' }} allowFullScreen />
        </div>
      )}
    </div>
  )
}

//  BLOCO ARQUIVO (PDF / EXCEL) 
function BlocoArquivo({ bloco, onChange, tipo }: { bloco: Bloco; onChange: (c: any) => void; tipo: 'pdf' | 'excel' }) {
  const [uploading, setUploading] = useState(false)
  const accept = tipo === 'pdf' ? '.pdf' : '.xlsx,.xls,.csv'
  const label = tipo === 'pdf' ? 'PDF' : 'Excel/Planilha'
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('tipo', tipo)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.url) { onChange({ url: data.url, nome: file.name }); toast.success(`${label} enviado!`) }
    else toast.error(`Erro ao enviar ${label}`)
  }
  return (
    <div>
      {bloco.conteudo?.url ? (
        <div className="flex items-center gap-3 p-3 bg-nodri-surface border border-nodri-border rounded-lg">
          <span className="text-2xl">{tipo === 'pdf' ? '' : ''}</span>
          <a href={bloco.conteudo.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-[12px] text-nodri-cyan hover:underline truncate">{bloco.conteudo.nome}</a>
          <button onClick={() => onChange({ url: '', nome: '' })} className="text-nodri-red text-[10px] hover:underline">Remover</button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-nodri-border rounded-lg p-8 cursor-pointer hover:border-nodri-cyan/40 transition-all">
          {uploading ? <span className="text-nodri-t3 text-[12px]">Enviando...</span> : <>
            <Upload size={28} className="text-nodri-t3" />
            <span className="text-nodri-t3 text-[12px]">Clique para enviar {label}</span>
            <span className="text-nodri-t3 text-[10px]">{accept}</span>
          </>}
          <input type="file" accept={accept} className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      )}
    </div>
  )
}

//  BLOCO COLUNAS 
function BlocoColunas({ bloco, onChange }: { bloco: Bloco; onChange: (c: any) => void }) {
  const cols = bloco.conteudo?.colunas || ['', '']
  const setCols = (arr: string[]) => onChange({ colunas: arr })
  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center mb-2">
        <span className="text-[10px] text-nodri-t3">Colunas:</span>
        {[2,3].map(n => (
          <button key={n} onClick={() => setCols(Array(n).fill(''))}
            className={`text-[10px] px-2 py-1 rounded border transition-all ${cols.length === n ? 'bg-nodri-cyan text-black border-nodri-cyan' : 'border-nodri-border text-nodri-t3 hover:text-nodri-t1'}`}>
            {n} colunas
          </button>
        ))}
      </div>
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
        {cols.map((col: string, i: number) => (
          <textarea key={i} value={col} onChange={e => { const arr = [...cols]; arr[i] = e.target.value; setCols(arr) }}
            rows={4} placeholder={`Coluna ${i + 1}`}
            className="bg-nodri-surface border border-nodri-border rounded p-2 text-[12px] text-nodri-t1 outline-none focus:border-nodri-cyan resize-none" />
        ))}
      </div>
    </div>
  )
}

//  ITEM SORTÁVEL 
function BlocoSortavel({ bloco, onRemove, onUpdate, onResize }: {
  bloco: Bloco
  onRemove: () => void
  onUpdate: (c: any) => void
  onResize: (w: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bloco.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const [expandido, setExpandido] = useState(true)

  const TIPOS_LABEL: Record<BlocoTipo, string> = {
    texto: ' Texto Rico', imagem: '️ Imagem', video: ' Vídeo YouTube',
    pdf: ' PDF', excel: ' Excel', tabela: ' Tabela', colunas: '⊞ Colunas',
    checklist: ' Checklist', faq: ' FAQ',
  }

  return (
    <div ref={setNodeRef} style={{ ...style, width: `${bloco.largura || 100}%` }} className="nodri-card border border-nodri-border/60 hover:border-nodri-cyan/30 transition-all">
      {/* Header do bloco */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-nodri-border bg-nodri-surface rounded-t-xl">
        <button {...attributes} {...listeners} className="text-nodri-t3 hover:text-nodri-t1 cursor-grab active:cursor-grabbing">
          <GripVertical size={14} />
        </button>
        <span className="text-[11px] font-medium text-nodri-t2 flex-1">{TIPOS_LABEL[bloco.tipo]}</span>

        {/* Largura */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-nodri-t3">Largura:</span>
          {[25, 50, 75, 100].map(w => (
            <button key={w} onClick={() => onResize(w)}
              className={`text-[9px] px-1.5 py-0.5 rounded transition-all ${(bloco.largura || 100) === w ? 'bg-nodri-cyan text-black font-bold' : 'text-nodri-t3 hover:text-nodri-t1 border border-nodri-border'}`}>
              {w}%
            </button>
          ))}
        </div>

        <button onClick={() => setExpandido(p => !p)} className="text-nodri-t3 hover:text-nodri-t1">
          {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <button onClick={onRemove} className="text-nodri-t3 hover:text-nodri-red transition-colors">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Conteúdo do bloco */}
      {expandido && (
        <div className="p-3">
          {bloco.tipo === 'texto' && <BlocoTexto bloco={bloco} onChange={onUpdate} />}
          {bloco.tipo === 'imagem' && <BlocoImagem bloco={bloco} onChange={onUpdate} />}
          {bloco.tipo === 'video' && <BlocoVideo bloco={bloco} onChange={onUpdate} />}
          {bloco.tipo === 'pdf' && <BlocoArquivo bloco={bloco} onChange={onUpdate} tipo="pdf" />}
          {bloco.tipo === 'excel' && <BlocoArquivo bloco={bloco} onChange={onUpdate} tipo="excel" />}
          {bloco.tipo === 'colunas' && <BlocoColunas bloco={bloco} onChange={onUpdate} />}
          {bloco.tipo === 'checklist' && (
            <div className="space-y-2">
              {(bloco.conteudo?.itens || []).map((item: string, i: number) => (
                <div key={i} className="flex gap-2">
                  <input value={item} onChange={e => { const arr = [...(bloco.conteudo?.itens || [])]; arr[i] = e.target.value; onUpdate({ itens: arr }) }}
                    className="flex-1 bg-nodri-surface border border-nodri-border rounded px-2 py-1.5 text-[12px] outline-none focus:border-nodri-cyan" placeholder={`Item ${i+1}`} />
                  <button onClick={() => { const arr = (bloco.conteudo?.itens || []).filter((_: any, j: number) => j !== i); onUpdate({ itens: arr }) }} className="text-nodri-red p-1 rounded"><Trash2 size={11} /></button>
                </div>
              ))}
              <button onClick={() => onUpdate({ itens: [...(bloco.conteudo?.itens || []), ''] })} className="text-[10px] text-nodri-cyan hover:underline">+ Adicionar item</button>
            </div>
          )}
          {bloco.tipo === 'faq' && (
            <div className="space-y-3">
              {(bloco.conteudo?.itens || []).map((item: any, i: number) => (
                <div key={i} className="bg-nodri-surface p-3 rounded-lg border border-nodri-border space-y-2">
                  <input value={item.pergunta || ''} onChange={e => { const arr = [...(bloco.conteudo?.itens || [])]; arr[i] = { ...arr[i], pergunta: e.target.value }; onUpdate({ itens: arr }) }}
                    className="w-full bg-nodri-card border border-nodri-border rounded px-2 py-1.5 text-[12px] font-medium outline-none focus:border-nodri-cyan" placeholder="Pergunta" />
                  <textarea value={item.resposta || ''} onChange={e => { const arr = [...(bloco.conteudo?.itens || [])]; arr[i] = { ...arr[i], resposta: e.target.value }; onUpdate({ itens: arr }) }} rows={2}
                    className="w-full bg-nodri-card border border-nodri-border rounded px-2 py-1.5 text-[12px] outline-none focus:border-nodri-cyan resize-none" placeholder="Resposta" />
                  <button onClick={() => { const arr = (bloco.conteudo?.itens || []).filter((_: any, j: number) => j !== i); onUpdate({ itens: arr }) }} className="text-[10px] text-nodri-red hover:underline">Remover</button>
                </div>
              ))}
              <button onClick={() => onUpdate({ itens: [...(bloco.conteudo?.itens || []), { pergunta: '', resposta: '' }] })} className="text-[10px] text-nodri-cyan hover:underline">+ Adicionar pergunta</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

//  EDITOR PRINCIPAL 
interface EditorBlocosProps {
  blocos: Bloco[]
  onChange: (blocos: Bloco[]) => void
}

function gerarId() { return Math.random().toString(36).slice(2) }

const TIPOS_DISPONIVEIS: { tipo: BlocoTipo; label: string; icone: string }[] = [
  { tipo: 'texto', label: 'Texto Rico', icone: '' },
  { tipo: 'imagem', label: 'Imagem', icone: '️' },
  { tipo: 'video', label: 'Vídeo YouTube', icone: '' },
  { tipo: 'pdf', label: 'PDF', icone: '' },
  { tipo: 'excel', label: 'Excel/Planilha', icone: '' },
  { tipo: 'colunas', label: 'Colunas', icone: '⊞' },
  { tipo: 'checklist', label: 'Checklist', icone: '' },
  { tipo: 'faq', label: 'FAQ', icone: '' },
]

export default function EditorBlocos({ blocos, onChange }: EditorBlocosProps) {
  const [showMenu, setShowMenu] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function adicionarBloco(tipo: BlocoTipo) {
    const novo: Bloco = { id: gerarId(), tipo, conteudo: {}, largura: 100 }
    onChange([...blocos, novo])
    setShowMenu(false)
  }

  function removerBloco(id: string) {
    onChange(blocos.filter(b => b.id !== id))
  }

  function atualizarBloco(id: string, conteudo: any) {
    onChange(blocos.map(b => b.id === id ? { ...b, conteudo } : b))
  }

  function redimensionarBloco(id: string, largura: number) {
    onChange(blocos.map(b => b.id === id ? { ...b, largura } : b))
  }

  function handleDragEnd(event: any) {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = blocos.findIndex(b => b.id === active.id)
      const newIndex = blocos.findIndex(b => b.id === over.id)
      onChange(arrayMove(blocos, oldIndex, newIndex))
    }
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocos.map(b => b.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-wrap gap-3">
            {blocos.map(bloco => (
              <BlocoSortavel
                key={bloco.id}
                bloco={bloco}
                onRemove={() => removerBloco(bloco.id)}
                onUpdate={(c) => atualizarBloco(bloco.id, c)}
                onResize={(w) => redimensionarBloco(bloco.id, w)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Menu adicionar bloco */}
      <div className="relative">
        <button onClick={() => setShowMenu(p => !p)}
          className="flex items-center gap-2 w-full py-2.5 border-2 border-dashed border-nodri-border rounded-xl text-nodri-t3 hover:border-nodri-cyan/40 hover:text-nodri-cyan transition-all text-[12px] justify-center">
          <Plus size={14} /> Adicionar bloco
        </button>
        {showMenu && (
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-nodri-card border border-nodri-border rounded-xl shadow-2xl p-3 z-50 grid grid-cols-4 gap-2">
            {TIPOS_DISPONIVEIS.map(t => (
              <button key={t.tipo} onClick={() => adicionarBloco(t.tipo)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-nodri-border hover:border-nodri-cyan/30 hover:bg-nodri-cyan/5 transition-all">
                <span className="text-xl">{t.icone}</span>
                <span className="text-[10px] text-nodri-t2 text-center">{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
