'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PONTOS DE EBULIÇÃO
//
// O manual de "o que fazer quando der problema": briga entre profissionais,
// cliente que não quer pagar, energia que caiu, sistema fora do ar. Cada caso
// tem um título e os passos de como resolver.
//
// A tela é uma sanfona de propósito: são quase 60 casos, e quem abre esta
// página está com o problema acontecendo na frente. Ver 60 títulos e abrir só
// o que interessa é mais rápido do que rolar 300 linhas de texto corrido — por
// isso também tem busca, que filtra por título e pelo conteúdo dos passos.
//
// Tudo editável na própria página: bloco novo, ponto novo, passo novo.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Plus, Trash2, ChevronDown, ChevronRight, Search, Pencil, Check, Flame, ClipboardPaste } from 'lucide-react'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

interface Ponto { id: string; titulo: string; passos: string[] }
interface Bloco { id: string; nome: string; pontos: Ponto[] }
interface Doc { blocos: Bloco[] }

const COR = '#dc2626'
const rid = () => 'pe' + Math.random().toString(36).slice(2, 9)
const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function PontosEbulicao({ chave = 'pontos_ebulicao' }: { chave?: string }) {
  const [doc, setDoc] = useState<Doc>({ blocos: [] })
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [editando, setEditando] = useState(false)
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const [busca, setBusca] = useState('')
  const [importando, setImportando] = useState(false)
  const [textoColado, setTextoColado] = useState('')
  useGuardaSalvar(dirty, 'Pontos de Ebulição')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${chave}`, { credentials: 'include' })
        .then(r => (r.ok ? r.json() : null))
      setDoc(d && Array.isArray(d.blocos) ? d : { blocos: [] })
    } catch { setDoc({ blocos: [] }) }
    setDirty(false); setCarregando(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave, doc }),
      })
      if (r.ok) { setDirty(false); toast.success('Salvo!') } else toast.error('Não foi possível salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function mut(fn: (d: Doc) => void) {
    setDoc(prev => { const n: Doc = JSON.parse(JSON.stringify(prev)); fn(n); return n })
    setDirty(true)
  }

  const alterna = (id: string) => setAbertos(a => {
    const n = new Set(a); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  // A busca olha título E passos: quem procura "energia" quer achar o caso
  // mesmo que a palavra só apareça no meio da solução.
  const filtrado = useMemo(() => {
    const q = norm(busca.trim())
    if (!q) return doc.blocos
    return doc.blocos
      .map(b => ({ ...b, pontos: b.pontos.filter(p => norm(p.titulo + ' ' + p.passos.join(' ')).includes(q)) }))
      .filter(b => b.pontos.length > 0 || norm(b.nome).includes(q))
  }, [doc.blocos, busca])

  const totalPontos = doc.blocos.reduce((t, b) => t + b.pontos.length, 0)

  /**
   * Importa de um texto colado do Word.
   *
   * O documento de origem não usa estilos de título — o que separa um caso do
   * outro é a linha estar em MAIÚSCULAS. Então a regra é essa: linha toda em
   * maiúscula vira TÍTULO; as linhas seguintes viram os passos dele. Linha em
   * maiúscula sem passos até o próximo título é tratada como BLOCO (seção).
   *
   * Acrescenta ao que já existe: nada do que estava na tela é apagado.
   */
  function importarTexto() {
    const linhas = textoColado.split(/?
/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
    if (!linhas.length) { toast.error('Cole o texto antes de importar'); return }

    const ehTitulo = (t: string) => {
      const letras = t.replace(/[^A-Za-zÀ-ÿ]/g, '')
      if (letras.length < 4 || t.length > 130) return false
      const maiusc = letras.split('').filter(c => c === c.toUpperCase()).length
      return maiusc / letras.length > 0.85
    }
    const limpar = (t: string) => t.replace(/^["'\-–—•\s]+/, '').replace(/[\s\-–—:"]+$/, '').trim()

    const novos: Bloco[] = []
    let bloco: Bloco | null = null
    let ponto: Ponto | null = null

    for (const bruta of linhas) {
      const linha = limpar(bruta)
      if (!linha) continue
      if (ehTitulo(linha)) {
        // título anterior que ficou sem passo nenhum era, na verdade, seção
        if (ponto && ponto.passos.length === 0 && bloco) {
          bloco.pontos = bloco.pontos.filter(p => p.id !== ponto!.id)
          bloco = { id: rid(), nome: ponto.titulo, pontos: [] }
          novos.push(bloco)
          ponto = null
        }
        if (!bloco) { bloco = { id: rid(), nome: 'GERAL', pontos: [] }; novos.push(bloco) }
        ponto = { id: rid(), titulo: linha, passos: [] }
        bloco.pontos.push(ponto)
        continue
      }
      if (ponto) ponto.passos.push(linha.replace(/^\d+[ºª°]?\s*[-–—.)]?\s*/, '').trim())
    }

    const qtd = novos.reduce((t, b) => t + b.pontos.length, 0)
    if (!qtd) { toast.error('Não encontrei títulos em maiúsculas no texto'); return }

    mut(d => { d.blocos = [...d.blocos, ...novos.filter(b => b.pontos.length > 0)] })
    setImportando(false); setTextoColado('')
    toast.success(`${qtd} situações importadas — confira e clique em Salvar`)
  }

  if (carregando) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={20} className="animate-spin" style={{ color: '#a8a49d' }} /></div>
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '14px 16px', borderBottom: '1px solid #f2f0ec' }}>
        <Flame size={18} style={{ color: COR }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a2e' }}>Pontos de Ebulição</div>
          <div style={{ fontSize: 11.5, color: '#8a8680' }}>
            {totalPontos} situações · clique no título para ver como resolver
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {editando && (
          <button onClick={() => setImportando(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #e0ddd8', background: '#fff', borderRadius: 9, padding: '8px 13px', fontSize: 12, fontWeight: 800, color: '#6b6860', cursor: 'pointer' }}>
            <ClipboardPaste size={13} /> Importar do Word
          </button>
        )}
        <button onClick={() => setEditando(e => !e)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #e0ddd8', background: editando ? '#f0eefb' : '#fff', borderRadius: 9, padding: '8px 13px', fontSize: 12, fontWeight: 800, color: editando ? '#5b4fcf' : '#6b6860', cursor: 'pointer' }}>
          {editando ? <><Check size={13} /> Concluir edição</> : <><Pencil size={13} /> Editar</>}
        </button>
        {dirty && (
          <button onClick={salvar} disabled={salvando}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: '#16a34a', color: '#fff', borderRadius: 9, padding: '8px 15px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
            {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar
          </button>
        )}
      </div>

      {importando && (
        <div onClick={() => setImportando(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,18,30,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 14, padding: 18, width: 'min(680px, 100%)' }}>
            <p style={{ fontWeight: 900, fontSize: 14, marginBottom: 4 }}>Importar do Word</p>
            <p style={{ fontSize: 12.5, color: '#6b6860', marginBottom: 10 }}>
              Abra o documento, selecione tudo (Ctrl+A), copie (Ctrl+C) e cole aqui.
              As linhas <b>em maiúsculas</b> viram os títulos; as linhas abaixo de cada título viram os passos.
              O que já está na página não é apagado.
            </p>
            <textarea value={textoColado} onChange={e => setTextoColado(e.target.value)} rows={10}
              placeholder="Cole aqui o conteúdo do documento…"
              style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid #e0ddd8', fontSize: 12.5, lineHeight: 1.5, fontFamily: 'inherit', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={importarTexto}
                style={{ flex: 1, border: 'none', background: COR, color: '#fff', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                Importar
              </button>
              <button onClick={() => { setImportando(false); setTextoColado('') }}
                style={{ border: '1px solid #e0ddd8', background: '#fff', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 800, color: '#6b6860', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f7f6f3', position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 27, top: '50%', transform: 'translateY(-50%)', color: '#a8a49d' }} />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Procurar situação… (ex.: energia, briga, cliente não quer pagar)"
          style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, border: '1px solid #e0ddd8', fontSize: 13, outline: 'none' }} />
      </div>

      <div style={{ padding: '10px 16px 18px' }}>
        {filtrado.length === 0 && (
          <p style={{ textAlign: 'center', color: '#a8a49d', fontSize: 13, padding: '30px 0' }}>
            {doc.blocos.length === 0 ? 'Nenhum ponto cadastrado ainda.' : 'Nada encontrado com esse termo.'}
          </p>
        )}

        {filtrado.map(bloco => (
          <div key={bloco.id} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {editando ? (
                <input value={bloco.nome}
                  onChange={e => mut(d => { const b = d.blocos.find(x => x.id === bloco.id); if (b) b.nome = e.target.value })}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid #e0ddd8', fontSize: 12.5, fontWeight: 900, color: COR, letterSpacing: '.4px' }} />
              ) : (
                <div style={{ fontSize: 12, fontWeight: 900, color: COR, letterSpacing: '.6px', textTransform: 'uppercase' }}>{bloco.nome}</div>
              )}
              <div style={{ flex: 1, height: 1, background: '#f2f0ec' }} />
              <span style={{ fontSize: 11, color: '#a8a49d' }}>{bloco.pontos.length}</span>
              {editando && (
                <button onClick={() => mut(d => { d.blocos = d.blocos.filter(x => x.id !== bloco.id) })}
                  title="Excluir bloco inteiro"
                  style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 2 }}><Trash2 size={13} /></button>
              )}
            </div>

            {bloco.pontos.map(ponto => {
              const aberto = abertos.has(ponto.id) || !!busca.trim()
              return (
                <div key={ponto.id} style={{ border: '1px solid #eceae4', borderRadius: 11, marginBottom: 7, overflow: 'hidden', background: aberto ? '#fffdfd' : '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: editando ? 'default' : 'pointer' }}
                    onClick={() => !editando && alterna(ponto.id)}>
                    {!editando && (aberto ? <ChevronDown size={15} style={{ color: COR, flexShrink: 0 }} /> : <ChevronRight size={15} style={{ color: '#a8a49d', flexShrink: 0 }} />)}
                    {editando ? (
                      <input value={ponto.titulo}
                        onChange={e => mut(d => { const p = d.blocos.find(b => b.id === bloco.id)?.pontos.find(x => x.id === ponto.id); if (p) p.titulo = e.target.value })}
                        style={{ flex: 1, padding: '6px 9px', borderRadius: 8, border: '1px solid #e0ddd8', fontSize: 13, fontWeight: 700 }} />
                    ) : (
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{ponto.titulo}</span>
                    )}
                    {!editando && ponto.passos.length > 0 && (
                      <span style={{ fontSize: 10.5, color: '#a8a49d', whiteSpace: 'nowrap' }}>{ponto.passos.length} passos</span>
                    )}
                    {editando && (
                      <button onClick={() => mut(d => { const b = d.blocos.find(x => x.id === bloco.id); if (b) b.pontos = b.pontos.filter(x => x.id !== ponto.id) })}
                        style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 2 }}><Trash2 size={13} /></button>
                    )}
                  </div>

                  {(aberto || editando) && (
                    <div style={{ padding: '2px 14px 12px 34px', borderTop: '1px solid #f7f6f3' }}>
                      {ponto.passos.map((passo, i) => (
                        <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '5px 0' }}>
                          <span style={{ fontSize: 11, fontWeight: 900, color: COR, minWidth: 16, paddingTop: 2 }}>{i + 1}</span>
                          {editando ? (
                            <>
                              <textarea value={passo} rows={2}
                                onChange={e => mut(d => { const p = d.blocos.find(b => b.id === bloco.id)?.pontos.find(x => x.id === ponto.id); if (p) p.passos[i] = e.target.value })}
                                style={{ flex: 1, padding: '6px 9px', borderRadius: 8, border: '1px solid #e0ddd8', fontSize: 12.5, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit' }} />
                              <button onClick={() => mut(d => { const p = d.blocos.find(b => b.id === bloco.id)?.pontos.find(x => x.id === ponto.id); if (p) p.passos.splice(i, 1) })}
                                style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 2 }}><Trash2 size={12} /></button>
                            </>
                          ) : (
                            <span style={{ fontSize: 12.5, color: '#3f3a35', lineHeight: 1.6 }}>{passo}</span>
                          )}
                        </div>
                      ))}
                      {editando && (
                        <button onClick={() => mut(d => { const p = d.blocos.find(b => b.id === bloco.id)?.pontos.find(x => x.id === ponto.id); if (p) p.passos.push('') })}
                          style={{ marginTop: 6, border: '1px dashed #d0cdc7', background: '#faf9f7', borderRadius: 8, padding: '5px 11px', fontSize: 11.5, fontWeight: 700, color: '#6b6860', cursor: 'pointer' }}>
                          + Passo
                        </button>
                      )}
                      {!editando && ponto.passos.length === 0 && (
                        <p style={{ fontSize: 12, color: '#a8a49d', margin: '4px 0' }}>Sem passos escritos ainda.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {editando && (
              <button onClick={() => mut(d => { const b = d.blocos.find(x => x.id === bloco.id); if (b) b.pontos.push({ id: rid(), titulo: 'NOVA SITUAÇÃO', passos: [''] }) })}
                style={{ border: '1px dashed #d0cdc7', background: '#faf9f7', borderRadius: 9, padding: '7px 13px', fontSize: 12, fontWeight: 800, color: '#6b6860', cursor: 'pointer' }}>
                <Plus size={12} style={{ display: 'inline', marginRight: 4 }} /> Situação neste bloco
              </button>
            )}
          </div>
        ))}

        {editando && (
          <button onClick={() => mut(d => { d.blocos.push({ id: rid(), nome: 'NOVO BLOCO', pontos: [] }) })}
            style={{ border: 'none', background: COR, color: '#fff', borderRadius: 10, padding: '9px 16px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
            <Plus size={13} style={{ display: 'inline', marginRight: 5 }} /> Novo bloco
          </button>
        )}
      </div>
    </div>
  )
}
