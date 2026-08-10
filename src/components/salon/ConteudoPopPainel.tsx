'use client'

// Mostra UM POP de uma página de conteúdo (recepcao / manicure / cabelereiro)
// dentro do setor, sem sair da página. A lista de POPs fica na sidebar do setor,
// como sub-itens — por isso aqui só renderizamos o documento escolhido.

import { useEffect, useState } from 'react'
import { Loader2, Printer } from 'lucide-react'

interface DocPop { id?: string; titulo?: string; texto?: string; html?: string }

export interface PopDeConteudo { id: string; titulo: string }

/** Busca a lista de POPs de um slug. Usada pela sidebar para montar os sub-itens. */
export async function listarPopsDoConteudo(slug: string): Promise<PopDeConteudo[]> {
  try {
    const d = await fetch(`/api/conteudo/${slug}`).then(r => r.ok ? r.json() : null)
    const docs = d?.conteudo?.docs
    if (!Array.isArray(docs)) return []
    return docs.map((doc: DocPop, i: number) => ({
      id: String(doc.id ?? i),
      titulo: String(doc.titulo || `Documento ${i + 1}`),
    }))
  } catch { return [] }
}

export default function ConteudoPopPainel({ slug, docId }: { slug: string; docId: string }) {
  const [html, setHtml] = useState('')
  const [titulo, setTitulo] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    fetch(`/api/conteudo/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!vivo) return
        const docs: DocPop[] = Array.isArray(d?.conteudo?.docs) ? d.conteudo.docs : []
        const achado = docs.find((doc, i) => String(doc.id ?? i) === String(docId)) || docs[0]
        setHtml(String(achado?.texto || achado?.html || d?.conteudo?.texto || ''))
        setTitulo(String(achado?.titulo || ''))
      })
      .catch(() => { if (vivo) setHtml('') })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [slug, docId])

  function imprimir() {
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    w.document.write(`<html><head><meta charset="utf-8"><title>${titulo}</title></head><body>${html}<script>window.onload=function(){window.print()}<\/script></body></html>`)
    w.document.close(); w.focus()
  }

  if (carregando) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={20} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  if (!html) return <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>Conteúdo não encontrado.</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button onClick={imprimir}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
          <Printer size={13} /> Imprimir
        </button>
      </div>
      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,.10)' }}>
        <div style={{ height: 6, background: 'linear-gradient(90deg,#5b4fcf,#7c6fe0)' }} />
        <div className="pop-doc" style={{ padding: '32px 34px' }} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  )
}
