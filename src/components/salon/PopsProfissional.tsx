'use client'
// ─── POPs por categoria no perfil do profissional + Avaliação POP ───────────
// - categoriaDoCargo: mapeia o cargo do profissional para a página de POPs
// - extrairChecklistPop: gera o checklist de avaliação AUTOMATICAMENTE a partir
//   do HTML do POP (usa as seções "Checklist de Auditoria"; senão, todos os ☐)
// - PopsDoProfissional: aba "POPs" (documentos da categoria, leitura)
// - AvaliacaoPop: aba "Avaliação POP" (histórico com data, gráfico, estatísticas
//   e botão "Como melhorar" respondido pela IA)
import { useEffect, useMemo, useState } from 'react'
import { FileText, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

export type CategoriaPop = 'manicure' | 'cabelereiro' | 'recepcao'

export function categoriaDoCargo(cargo?: string | null): CategoriaPop | null {
  const c = (cargo || '').toLowerCase()
  if (/manicure|pedicure|nail/.test(c)) return 'manicure'
  if (/cabele|hair|terapeuta|assistente|auxiliar|colorista|barbeiro|escova/.test(c)) return 'cabelereiro'
  if (/recep/.test(c)) return 'recepcao'
  return null
}

export const ROTULO_CATEGORIA: Record<CategoriaPop, string> = {
  manicure: 'Manicure / Pedicure',
  cabelereiro: 'Cabeleireiro / Terapeuta Capilar / Assistente',
  recepcao: 'Recepção',
}

export interface GrupoChecklist { secao: string; itens: string[] }

// Gera o checklist de avaliação a partir do HTML do POP.
// 1º: seções "Checklist de Auditoria" (h2) com seus h3 como sub-seções.
// 2º (fallback): todos os itens ☐ do documento, agrupados pelo último título visto.
export function extrairChecklistPop(html: string): GrupoChecklist[] {
  if (typeof window === 'undefined' || !html) return []
  const dom = new DOMParser().parseFromString(html, 'text/html')
  const grupos: GrupoChecklist[] = []
  const addItens = (secao: string, ul: Element) => {
    const itens = Array.from(ul.querySelectorAll('li'))
      .map(li => (li.textContent || '').trim())
      .filter(t => t.startsWith('☐'))
      .map(t => t.replace(/^☐\s*/, ''))
    if (!itens.length) return
    const g = grupos.find(x => x.secao === secao)
    if (g) g.itens.push(...itens)
    else grupos.push({ secao, itens: [...itens] })
  }
  const h2s = Array.from(dom.querySelectorAll('h2'))
  const auditorias = h2s.filter(h => /checklist de auditoria/i.test(h.textContent || ''))
  for (const h2 of auditorias) {
    let secao = (h2.textContent || 'Checklist').replace(/^\d+\.\s*/, '').replace(/checklist de auditoria/i, '').replace(/[()—-]/g, ' ').trim() || 'Geral'
    let el: Element | null = h2.nextElementSibling
    while (el && el.tagName !== 'H2') {
      if (el.tagName === 'H3') secao = (el.textContent || '').trim()
      if (el.tagName === 'UL') addItens(secao, el)
      el = el.nextElementSibling
    }
  }
  if (!grupos.length) {
    let secao = 'Geral'
    for (const el of Array.from(dom.body.querySelectorAll('h2,h3,ul'))) {
      if (el.tagName === 'H2' || el.tagName === 'H3') { secao = (el.textContent || '').replace(/^\d+\.\s*/, '').trim(); continue }
      addItens(secao, el)
    }
  }
  return grupos
}

// Estilo compartilhado do documento (mesma "folha branca" das páginas de conteúdo)
export const POP_DOC_CSS = `
.pop-doc{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#33313f;font-size:14.5px;line-height:1.7}
.pop-doc>*:first-child{margin-top:0}
.pop-doc h1{font-size:24px;color:#2a2350;font-weight:800;margin:0 0 4px}
.pop-doc h2{font-size:16.5px;color:#5b4fcf;font-weight:700;margin:30px 0 10px;padding-bottom:7px;border-bottom:2px solid #efedf6}
.pop-doc h3{font-size:12.5px;color:#8480a0;font-weight:700;margin:16px 0 6px;text-transform:uppercase;letter-spacing:.6px}
.pop-doc p{margin:8px 0}
.pop-doc ul,.pop-doc ol{margin:8px 0;padding-left:24px}
.pop-doc ul{list-style:disc}.pop-doc ol{list-style:decimal}
.pop-doc li{margin:4px 0}
.pop-doc blockquote{border-left:3px solid #5b4fcf;background:#f7f6fb;padding:10px 16px;margin:12px 0;border-radius:0 10px 10px 0;font-style:italic;color:#4a4760}
.pop-doc strong{color:#2a2350;font-weight:700}
`

export interface DocPop { id: string; titulo: string; texto: string }

export function usePopsDaCategoria(categoria: CategoriaPop | null) {
  const [docs, setDocs] = useState<DocPop[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!categoria) { setLoading(false); return }
    fetch(`/api/conteudo/${categoria}`)
      .then(r => r.json())
      .then(d => setDocs(Array.isArray(d?.conteudo?.docs) ? d.conteudo.docs : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [categoria])
  return { docs, loading }
}

// ─── Combinado: POPs + Avaliação POP com sub-abas internas ──────────────────
export function PopsEAvaliacao({ cargo, profId, profNome }: { cargo?: string | null; profId: string; profNome: string }) {
  const [sub, setSub] = useState<'processos' | 'avaliacoes'>('processos')
  const Pill = ({ id, label }: { id: 'processos' | 'avaliacoes'; label: string }) => (
    <button onClick={() => setSub(id)}
      className="text-[13px] font-bold px-4 py-2 rounded-lg transition"
      style={{ background: sub === id ? '#5b4fcf' : '#fff', color: sub === id ? '#fff' : '#5b4fcf', border: '1.5px solid #5b4fcf40' }}>
      {label}
    </button>
  )
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Pill id="processos" label="Processos (POPs)" />
        <Pill id="avaliacoes" label="Avaliação POP" />
      </div>
      {sub === 'processos'
        ? <PopsDoProfissional cargo={cargo} />
        : <AvaliacaoPop profId={profId} profNome={profNome} cargo={cargo} />}
    </div>
  )
}

// ─── Aba "POPs" — documentos da categoria do profissional ────────────────────
export function PopsDoProfissional({ cargo }: { cargo?: string | null }) {
  const categoria = categoriaDoCargo(cargo)
  const { docs, loading } = usePopsDaCategoria(categoria)
  const [aberto, setAberto] = useState(0)

  if (!categoria) return (
    <div className="nodri-card p-8 text-center">
      <p className="text-sm text-nodri-t2">O cargo deste profissional (<strong>{cargo || 'não informado'}</strong>) ainda não está associado a uma categoria de POPs.</p>
      <p className="text-[12px] text-nodri-t3 mt-2">Categorias reconhecidas: manicure/pedicure · cabeleireiro/terapeuta capilar/assistente · recepção.</p>
    </div>
  )
  if (loading) return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan" /></div>
  if (!docs.length) return (
    <div className="nodri-card p-8 text-center">
      <p className="text-sm text-nodri-t2">Ainda não há POPs cadastrados para <strong>{ROTULO_CATEGORIA[categoria]}</strong>.</p>
    </div>
  )

  const docAberto = docs[Math.min(aberto, docs.length - 1)]

  return (
    <div className="space-y-4">
      <style>{POP_DOC_CSS}</style>
      <div className="nodri-card px-4 py-3 text-[12px] text-nodri-t2">
        POPs da categoria <strong className="text-nodri-cyan">{ROTULO_CATEGORIA[categoria]}</strong> — novos POPs criados para esta categoria aparecem aqui automaticamente.
      </div>
      <div className="flex gap-4 items-start flex-col lg:flex-row">
        <aside className="w-full lg:w-72 shrink-0">
          <div className="nodri-card overflow-hidden">
            {docs.map((doc, i) => (
              <button key={doc.id || i} onClick={() => setAberto(i)}
                className={`w-full text-left px-4 py-3 text-[13px] border-b border-nodri-border last:border-b-0 transition-colors ${aberto === i ? 'bg-nodri-surface text-nodri-cyan font-bold' : 'text-nodri-t2 hover:text-nodri-cyan'}`}>
                <span className="flex items-center gap-2"><FileText size={14} className="shrink-0" />{doc.titulo}</span>
              </button>
            ))}
          </div>
        </aside>
        <div className="flex-1 min-w-0 w-full">
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,.18)' }}>
            <div style={{ height: 6, background: 'linear-gradient(90deg,#5b4fcf,#7c6fe0)' }} />
            <div className="pop-doc" style={{ padding: '32px 36px' }} dangerouslySetInnerHTML={{ __html: docAberto?.texto || '' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Aba "Avaliação POP" — histórico com gráfico, estatísticas e IA ─────────
export interface RespostaAval { secao: string; item: string; ok: boolean }
export interface AvaliacaoPopItem {
  id: number; popId: string; popTitulo: string; categoria: string
  data: string; respostas: RespostaAval[]; pct: number
}

const corPct = (p: number) => p >= 80 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444'

export function AvaliacaoPop({ profId, profNome, cargo }: { profId: string; profNome: string; cargo?: string | null }) {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoPopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [aberta, setAberta] = useState<number | null>(null)
  const [iaTexto, setIaTexto] = useState<Record<number, string>>({})
  const [iaLoading, setIaLoading] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/salon/grid?chave=avaliacao_pop_${profId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setAvaliacoes(Array.isArray(d?.avaliacoes) ? d.avaliacoes : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [profId])

  const ordenadas = useMemo(() => [...avaliacoes].sort((a, b) => (b.data || '').localeCompare(a.data || '')), [avaliacoes])

  // Usa as seções pontuadas salvas (novo formato); se não houver, cai no cálculo por respostas.
  const statsPorSecao = (av: AvaliacaoPopItem): { secao: string; total: number; ok: number; pct: number }[] => {
    if (Array.isArray((av as any).secoes) && (av as any).secoes.length) {
      return (av as any).secoes
        .filter((s: any) => s.aplica !== false)
        .map((s: any) => ({ secao: s.titulo, total: s.total ?? 0, ok: s.sim ?? 0, pct: s.pontos ? Math.round((s.nota / s.pontos) * 100) : 0 }))
    }
    const map = new Map<string, { total: number; ok: number }>()
    for (const r of av.respostas || []) {
      const s = map.get(r.secao) || { total: 0, ok: 0 }
      s.total++; if (r.ok) s.ok++
      map.set(r.secao, s)
    }
    return Array.from(map.entries()).map(([secao, s]) => ({ secao, total: s.total, ok: s.ok, pct: s.total ? Math.round((s.ok / s.total) * 100) : 0 }))
  }

  async function comoMelhorar(av: AvaliacaoPopItem) {
    setIaLoading(av.id)
    setIaTexto(p => ({ ...p, [av.id]: '' }))
    try {
      const naoConformes = (av.respostas || []).filter(r => !r.ok)
      const porSecao = statsPorSecao(av).map(s => `- ${s.secao}: ${s.ok}/${s.total} (${s.pct}%)`).join('\n')
      const itens = naoConformes.map(r => `- [${r.secao}] ${r.item}`).join('\n') || '(nenhum — avaliação 100%)'
      const comp = Array.isArray((av as any).comportamental)
        ? (av as any).comportamental.filter((c: any) => c.nota > 0).map((c: any) => `- ${c.criterio}: ${c.nota}/5`).join('\n')
        : ''
      const prompt = `Você é a NODRI IA, especialista em gestão e treinamento de equipes de salão de beleza.

O(a) profissional ${profNome} foi avaliado(a) no processo "${av.popTitulo}" em ${new Date(av.data).toLocaleDateString('pt-BR')} e obteve ${av.pct}% de conformidade.

RESULTADO POR SEÇÃO:
${porSecao}

ITENS NÃO CONFORMES:
${itens}
${comp ? `\nAVALIAÇÃO COMPORTAMENTAL (1 a 5):\n${comp}\n` : ''}

Gere um PLANO DE MELHORIA prático e direto, em português, com:
1. As 3 prioridades de treinamento (com base nos itens não conformes)
2. Como treinar cada ponto na prática (ações concretas no dia a dia do salão)
3. Frases de feedback construtivo para a conversa com o(a) profissional (sem tom de bronca)
4. Meta sugerida para a próxima avaliação
Seja específico e use os itens reais listados acima.`
      const res = await fetch('/api/ia/chat', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: [{ role: 'user', content: prompt }], modo: 'calculadora' }),
      })
      if (!res.ok || !res.body) { setIaTexto(p => ({ ...p, [av.id]: 'Servidor da IA ocupado — tente novamente em instantes.' })); return }
      const reader = res.body.getReader(); const dec = new TextDecoder('utf-8', { fatal: false })
      let buf = '', txt = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          try { const d = JSON.parse(line.slice(5).trim()); if (d.token) { txt += d.token; setIaTexto(p => ({ ...p, [av.id]: txt })) } } catch {}
        }
      }
    } catch { setIaTexto(p => ({ ...p, [av.id]: 'Erro de conexão com a IA. Tente novamente.' })) }
    finally { setIaLoading(null) }
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan" /></div>

  if (!ordenadas.length) return (
    <div className="nodri-card p-8 text-center">
      <p className="text-sm text-nodri-t2">Nenhuma avaliação de POP registrada ainda.</p>
      <p className="text-[12px] text-nodri-t3 mt-2">Para avaliar: abra o POP da categoria em <strong>Processo de Atendimento</strong> e clique em <strong>“Avaliar profissional”</strong>.</p>
    </div>
  )

  // evolução: média das últimas avaliações por data (mini resumo)
  const media = Math.round(ordenadas.reduce((s, a) => s + (a.pct || 0), 0) / ordenadas.length)

  return (
    <div className="space-y-4">
      <div className="nodri-card px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <p className="text-[12px] text-nodri-t2"><strong className="text-nodri-t1">{ordenadas.length}</strong> avaliação(ões) de POP · Média geral:</p>
        <span className="text-lg font-bold" style={{ color: corPct(media) }}>{media}%</span>
      </div>
      {ordenadas.map(av => {
        const stats = statsPorSecao(av)
        const naoConformes = (av.respostas || []).filter(r => !r.ok)
        const expandida = aberta === av.id
        return (
          <div key={av.id} className="nodri-card overflow-hidden">
            <button onClick={() => setAberta(expandida ? null : av.id)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-nodri-t1 truncate">{av.popTitulo}</p>
                <p className="text-[11px] text-nodri-t3">
                  {new Date(av.data).toLocaleDateString('pt-BR')} às {new Date(av.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {(av as any).faixa ? ` · ${(av as any).faixa}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xl font-bold" style={{ color: corPct(av.pct) }}>{av.pct}%</span>
                {expandida ? <ChevronUp size={16} className="text-nodri-t3" /> : <ChevronDown size={16} className="text-nodri-t3" />}
              </div>
            </button>
            {expandida && (
              <div className="border-t border-nodri-border px-4 py-4 space-y-4">
                {/* Gráfico por seção */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-nodri-t3 mb-2">Conformidade por seção</p>
                  <div className="space-y-2">
                    {stats.map(s => (
                      <div key={s.secao}>
                        <div className="flex items-center justify-between text-[11px] mb-0.5">
                          <span className="text-nodri-t2 truncate pr-2">{s.secao}</span>
                          <span className="font-bold shrink-0" style={{ color: corPct(s.pct) }}>{s.ok}/{s.total} · {s.pct}%</span>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(128,128,150,.18)' }}>
                          <div className="h-full rounded-full transition" style={{ width: `${s.pct}%`, background: corPct(s.pct) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Avaliação comportamental (1 a 5) */}
                {Array.isArray((av as any).comportamental) && (av as any).comportamental.some((c: any) => c.nota > 0) && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-nodri-t3 mb-2">
                      Comportamental · média <span style={{ color: corPct(((av as any).mediaComportamental || 0) * 20) }}>{(av as any).mediaComportamental || 0} / 5</span>
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {(av as any).comportamental.map((c: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="text-nodri-t2 truncate pr-2">{c.criterio}</span>
                          <span className="font-bold shrink-0" style={{ color: c.nota ? corPct(c.nota * 20) : 'inherit' }}>{c.nota || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Itens não conformes */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-nodri-t3 mb-2">
                    {naoConformes.length ? `Itens não conformes (${naoConformes.length})` : 'Todos os itens conformes!'}
                  </p>
                  {naoConformes.length > 0 && (
                    <ul className="space-y-1">
                      {naoConformes.map((r, i) => (
                        <li key={i} className="text-[12px] text-nodri-t2 flex gap-2">
                          <span className="text-red-400 shrink-0">✕</span>
                          <span><span className="text-nodri-t3">[{r.secao}]</span> {r.item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Como melhorar (IA) */}
                <div>
                  <button onClick={() => comoMelhorar(av)} disabled={iaLoading === av.id}
                    className="flex items-center gap-2 text-[12px] font-bold px-4 py-2 rounded-lg transition"
                    style={{ background: '#5b4fcf', color: '#fff', opacity: iaLoading === av.id ? .7 : 1 }}>
                    {iaLoading === av.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Como melhorar
                  </button>
                  {iaTexto[av.id] && (
                    <div className="mt-3 rounded-xl p-4 text-[13px] leading-relaxed text-nodri-t1" style={{ background: 'rgba(91,79,207,.08)', border: '1px solid rgba(91,79,207,.25)' }}
                      dangerouslySetInnerHTML={{ __html: iaTexto[av.id].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
