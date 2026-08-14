'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PROCEDIMENTOS DO SETOR
//
// Nem tudo que veio nos manuais dos setores é conferência. Boa parte é
// "COMO LIDAR COM A DEMANDA" — o passo a passo de uma situação (cliente não
// gostou do procedimento, análise de causa raiz, escala de correção…).
// Isso não cabe num check list: não se marca "feito" todo mês, se CONSULTA na
// hora em que a situação acontece.
//
// Então essas categorias saem do check list e viram PÁGINA aqui, listadas como
// sub-itens da sidebar do setor. Nada foi excluído: as duas listas nascem do
// mesmo arquivo de origem (checklist*Defaults.ts), separadas por `tipo`.
//
// As páginas são EDITÁVEIS: o texto do código é só o ponto de partida. Ao
// salvar, tudo passa a viver em salao_config (chave `manual_<setor>`), e é de
// lá que a sidebar e a página passam a ler.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { Printer, ListChecks, Loader2, Save, Plus, Trash2, Pencil, Eye, RotateCcw } from 'lucide-react'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { MANUAIS_COORDENACAO } from '@/lib/checklistCoordenacaoDefaults'
import { MANUAIS_PROCESSOS } from '@/lib/checklistProcessosDefaults'

export interface BlocoManual { subtitulo?: string; itens: string[] }
export interface PaginaManual { titulo: string; blocos: BlocoManual[] }

// Texto de partida (código). Só vale enquanto o setor não salvar nada.
const PADRAO: Record<string, PaginaManual[]> = {
  coordenacao: MANUAIS_COORDENACAO,
  processos: MANUAIS_PROCESSOS,
}
const chaveDoc = (chave: string) => `manual_${chave}`

/** Avisa a sidebar que as páginas mudaram (criou/excluiu/renomeou). */
export const EVENTO_MANUAIS = 'nodri:manuais-mudou'
const avisarSidebar = (chave: string) => {
  try { window.dispatchEvent(new CustomEvent(EVENTO_MANUAIS, { detail: chave })) } catch { /* ok */ }
}

const clonar = (p: PaginaManual[]): PaginaManual[] => JSON.parse(JSON.stringify(p))

async function lerPaginas(chave: string): Promise<PaginaManual[]> {
  try {
    const d = await fetch(`/api/salon/grid?chave=${chaveDoc(chave)}`).then(r => r.ok ? r.json() : null)
    if (d && Array.isArray(d.paginas)) return d.paginas
  } catch { /* cai no padrão */ }
  return clonar(PADRAO[chave] || [])
}

/** Páginas de procedimento de um setor — usada pela sidebar para os sub-itens. */
export async function listarManuais(chave: string): Promise<{ id: string; titulo: string }[]> {
  const paginas = await lerPaginas(chave)
  return paginas.map((p, i) => ({ id: String(i), titulo: p.titulo || `Procedimento ${i + 1}` }))
}

const COR = '#5b4fcf'

export default function ManualSetorPainel({ chave, indice }: { chave: string; indice: string }) {
  const i = Number(indice) || 0
  const [paginas, setPaginas] = useState<PaginaManual[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [modo, setModo] = useState<'ver' | 'editar'>('ver')
  useGuardaSalvar(dirty, 'Procedimento')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setPaginas(await lerPaginas(chave))
    setDirty(false); setCarregando(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  const pagina = paginas[i]

  // Grava a lista inteira (a página é uma posição dentro dela).
  async function gravar(lista: PaginaManual[], msg = 'Salvo!') {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: chaveDoc(chave), doc: { paginas: lista } }),
      })
      if (res.ok) { toast.success(msg); setDirty(false); avisarSidebar(chave) }
      else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function mut(fn: (l: PaginaManual[]) => void) {
    setPaginas(prev => { const n = clonar(prev); fn(n); return n }); setDirty(true)
  }

  const setTitulo = (v: string) => mut(l => { l[i].titulo = v })
  const setSubtitulo = (bi: number, v: string) => mut(l => { l[i].blocos[bi].subtitulo = v })
  const setItem = (bi: number, ii: number, v: string) => mut(l => { l[i].blocos[bi].itens[ii] = v })
  const addItem = (bi: number) => mut(l => { l[i].blocos[bi].itens.push('') })
  const delItem = (bi: number, ii: number) => mut(l => { l[i].blocos[bi].itens.splice(ii, 1) })
  const addBloco = () => mut(l => { l[i].blocos.push({ subtitulo: '', itens: [''] }) })
  function delBloco(bi: number) {
    if (!confirm('Excluir esta seção e todos os passos dela?')) return
    mut(l => { l[i].blocos.splice(bi, 1) })
  }

  async function novaPagina() {
    const nome = prompt('Nome do novo procedimento:')?.trim()
    if (!nome) return
    const lista = [...clonar(paginas), { titulo: nome, blocos: [{ subtitulo: '', itens: [''] }] }]
    setPaginas(lista)
    await gravar(lista, 'Página criada! Abra pela sidebar.')
  }

  async function excluirPagina() {
    if (!pagina) return
    if (!confirm(`Excluir a página "${pagina.titulo}"?\n\nEla sai da sidebar deste setor. Dá para recriar depois em "+ Nova página" ou voltar tudo com "Restaurar padrão".`)) return
    const lista = clonar(paginas); lista.splice(i, 1)
    setPaginas(lista)
    await gravar(lista, 'Página excluída.')
  }

  async function restaurarPadrao() {
    if (!confirm('Restaurar TODAS as páginas de procedimento deste setor para o texto original?\n\nAs edições feitas aqui serão perdidas.')) return
    const lista = clonar(PADRAO[chave] || [])
    setPaginas(lista)
    await gravar(lista, 'Páginas restauradas.')
  }

  function imprimir() {
    if (!pagina) return
    const esc = (v: string) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const corpo = pagina.blocos.map(b => `
      ${b.subtitulo ? `<h2>${esc(b.subtitulo)}</h2>` : ''}
      <ol>${b.itens.filter(x => x.trim()).map(x => `<li>${esc(x)}</li>`).join('')}</ol>`).join('')
    const css = `@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11.5px;line-height:1.5}
h1{font-size:17px;font-weight:900;text-transform:uppercase;border-bottom:3px solid ${COR};padding-bottom:8px;margin-bottom:14px;color:${COR}}
h2{font-size:12px;font-weight:800;color:#374151;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.4px}
ol{padding-left:22px}li{margin-bottom:4px;break-inside:avoid}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(pagina.titulo)}</title><style>${css}</style></head><body>
<h1>${esc(pagina.titulo)}</h1>${corpo}
<script>window.onload=function(){window.print()}<\/script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  if (carregando) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={20} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  if (!pagina) return (
    <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>
      <p style={{ marginBottom: 14 }}>Esta página não existe mais (pode ter sido excluída). Escolha outra na sidebar.</p>
      <button onClick={restaurarPadrao} style={btn('#fff', '#6b6860', '1px solid #d0cdc7')}><RotateCcw size={14} /> Restaurar padrão</button>
    </div>
  )

  const totalPassos = pagina.blocos.reduce((s, b) => s + b.itens.filter(x => x.trim()).length, 0)
  const editando = modo === 'editar'

  return (
    <div>
      {/* Barra de ações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 900, color: COR, background: '#f0eefb', borderRadius: 20, padding: '5px 12px', letterSpacing: '.4px' }}>
          <ListChecks size={13} /> PROCEDIMENTO
        </span>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{totalPassos} passos</span>
        {dirty && <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Alterações não salvas</span>}
        <div style={{ flex: 1 }} />

        <div style={{ display: 'inline-flex', border: '1.5px solid #d8d4f0', borderRadius: 9, overflow: 'hidden' }}>
          <button onClick={() => setModo('ver')} style={aba(!editando)}><Eye size={14} /> Ver</button>
          <button onClick={() => setModo('editar')} style={aba(editando)}><Pencil size={14} /> Editar</button>
        </div>

        {editando && <button onClick={novaPagina} style={btn('#f0eefb', COR, '1px dashed ' + COR)}><Plus size={14} /> Nova página</button>}
        {editando && <button onClick={restaurarPadrao} title="Volta todas as páginas deste setor ao texto original" style={btn('#fff', '#6b6860', '1px solid #d0cdc7')}><RotateCcw size={14} /></button>}
        {editando && <button onClick={excluirPagina} style={btn('#fff', '#dc2626', '1px solid #fca5a5')}><Trash2 size={14} /> Excluir página</button>}
        <button onClick={imprimir} style={btn('#fff', '#374151', '1px solid #d0cdc7')}><Printer size={14} /> Imprimir A4</button>
        <button onClick={() => gravar(paginas)} disabled={salvando}
          style={{ ...btn(dirty ? '#16a34a' : '#a3b3a3', '#fff', 'none'), fontWeight: 800 }}>
          {salvando ? '...' : <><Save size={14} /> Salvar</>}
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,.08)', border: '1px solid #eceae4' }}>
        <div style={{ height: 6, background: `linear-gradient(90deg,${COR},#7c6fe0)` }} />
        <div style={{ padding: '26px 30px' }}>
          {editando ? (
            <input value={pagina.titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título do procedimento"
              style={{ width: '100%', fontSize: 20, fontWeight: 900, color: '#1a1a2e', border: '1px solid #e0ddd8', borderRadius: 10, padding: '8px 12px', outline: 'none', marginBottom: 8 }} />
          ) : (
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', margin: '0 0 4px', lineHeight: 1.25 }}>{pagina.titulo}</h2>
          )}
          <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '0 0 20px' }}>
            Este é um procedimento — o passo a passo de como lidar com a demanda. Não se marca &quot;feito&quot;: serve de referência no momento da situação.
          </p>

          {pagina.blocos.map((b, bi) => (
            <div key={bi} style={{ marginBottom: 22 }}>
              {editando ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <input value={b.subtitulo || ''} onChange={e => setSubtitulo(bi, e.target.value)} placeholder="Subtítulo da seção (opcional)"
                    style={{ flex: 1, fontSize: 13, fontWeight: 800, color: COR, textTransform: 'uppercase', border: '1px solid #e0ddd8', borderRadius: 8, padding: '7px 10px', outline: 'none' }} />
                  <button onClick={() => delBloco(bi)} title="Excluir seção" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 5 }}><Trash2 size={15} /></button>
                </div>
              ) : b.subtitulo ? (
                <h3 style={{ fontSize: 13, fontWeight: 900, color: COR, textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 10px', paddingBottom: 6, borderBottom: '1.5px solid #f0eefb' }}>
                  {b.subtitulo}
                </h3>
              ) : null}

              <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {b.itens.map((it, ii) => (
                  (!editando && !it.trim()) ? null : (
                    <li key={ii} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 12px', borderRadius: 10, background: '#faf9f7', border: '1px solid #f0eee8' }}>
                      <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, background: '#f0eefb', color: COR, fontSize: 11.5, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{ii + 1}</span>
                      {editando ? (
                        <>
                          <AutoTextarea value={it} onChange={v => setItem(bi, ii, v)} />
                          <button onClick={() => delItem(bi, ii)} title="Excluir passo" style={{ border: 'none', background: 'transparent', color: '#d4cfc7', cursor: 'pointer', padding: 3, flexShrink: 0 }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')} onMouseLeave={e => (e.currentTarget.style.color = '#d4cfc7')}><Trash2 size={13} /></button>
                        </>
                      ) : (
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: '#1f2937', lineHeight: 1.45 }}>{it}</span>
                      )}
                    </li>
                  )
                ))}
              </ol>

              {editando && (
                <button onClick={() => addItem(bi)} style={{ ...btn('#faf9ff', COR, '1px dashed #c9c4f0'), marginTop: 8, fontSize: 12 }}><Plus size={13} /> Passo</button>
              )}
            </div>
          ))}

          {editando && (
            <button onClick={addBloco} style={{ ...btn('#faf9f7', '#6b6860', '1px dashed #d0cdc7'), marginTop: 4 }}><Plus size={14} /> Adicionar seção</button>
          )}
        </div>
      </div>
    </div>
  )
}

// Campo que cresce com o texto (passos longos não ficam cortados)
function AutoTextarea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }, [value])
  return <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} placeholder="Descreva o passo" rows={1}
    style={{ flex: 1, minWidth: 0, border: '1px solid transparent', borderRadius: 6, padding: '2px 6px', fontSize: 13.5, background: 'transparent', outline: 'none', resize: 'none', overflow: 'hidden', lineHeight: 1.45, fontFamily: 'inherit', color: '#1f2937' }}
    onFocus={e => (e.currentTarget.style.borderColor = '#c9c4f0')} onBlur={e => (e.currentTarget.style.borderColor = 'transparent')} />
}

function btn(bg: string, cor: string, border: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border, background: bg, color: cor, fontSize: 13, fontWeight: 700, cursor: 'pointer' }
}
function aba(ativo: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', border: 'none', background: ativo ? COR : '#fff', color: ativo ? '#fff' : '#6b6860', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
}
