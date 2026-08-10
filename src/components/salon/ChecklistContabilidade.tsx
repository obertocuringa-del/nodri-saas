'use client'

// Check list do que é enviado à contabilidade, mês a mês.
// Os 12 meses aparecem como cards com uma barrinha de progresso: vermelho
// enquanto falta algo, verde quando tudo foi enviado. As categorias e os itens
// são os mesmos para todos os meses (dá para acrescentar e excluir); o que muda
// de um mês para o outro é o que já foi marcado como enviado.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Save, Plus, Trash2, ArrowLeft, Check, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

/** Categorias e itens que já vêm prontos na primeira vez que a tela abre. */
const PADRAO: [string, string[]][] = [
  ['RECEITAS / FATURAMENTO', [
    'Relatório de faturamento do mês',
    'Relatório de vendas de serviços',
    'Relatório de vendas de produtos',
    'Notas fiscais emitidas (Avec)',
    'Notas fiscais canceladas (Avec)',
    'Notas fiscais estornadas, se houver',
    'Relatório de recebimentos por cartão',
    'Relatório de Pix',
    'Relatório de dinheiro',
    'Relatório de outros meios de pagamento',
    'Relatório de contas a receber',
  ]],
  ['PROFISSIONAIS-PARCEIROS', [
    'Nome / CNPJ de cada profissional ativo',
    'Valor líquido a pagar ao parceiro',
    'Comprovante do pagamento',
    'Nota fiscal emitida pelo profissional para o salão',
    'Distrato de parceiro',
  ]],
  ['COMPROVANTES DE PAGAMENTO — IMPOSTOS E GUIAS', [
    'DAS / Simples Nacional',
    'ISS, quando aplicável',
    'INSS',
    'IRRF, quando aplicável',
  ]],
  ['BANCOS', [
    'Extrato bancário completo do mês',
    'Extrato de investimentos, se houver',
    'Comprovantes de transferências',
    'TED',
    'Pix',
    'Empréstimos',
    'Financiamentos',
    'Aplicações e resgates',
    'Comprovantes de depósitos',
  ]],
  ['CARTÕES', [
    'Relatório das vendas no cartão',
    'Relatório de recebimentos',
    'Taxas cobradas pelas operadoras',
    'Antecipações',
    'Cancelamentos',
    'Estornos',
    'Comprovantes / relatórios das operadoras',
  ]],
  ['DESPESAS / CONTAS PAGAS', [
    'Relatório mensal de despesas diretas',
  ]],
  ['FOLHA / FUNCIONÁRIOS', [
    'Comprovante de pagamento',
    'Folha de pagamento',
    'Pró-labore',
    'Férias',
    'Rescisões',
    '13º salário',
    'Encargos',
    'FGTS',
    'INSS',
    'IRRF',
  ]],
]

interface Item { id: string; texto: string }
interface Grupo { id: string; titulo: string; itens: Item[] }
interface Doc {
  grupos: Grupo[]
  marcados: Record<string, Record<string, boolean>>   // "2026-8" → { itemId: true }
}

const rid = () => Math.random().toString(36).slice(2, 9)

// Mesma regra da tela Guias MEI (CNPJ dos Profissionais): fora dela ficam as
// categorias administrativas, a recepção e quem é CLT.
const CATS_ADMIN = ['ADMINISTRATIVO', 'FINANCEIRO', 'GERENCIA']
const normCat = (s: string) => (s || '').toUpperCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
function foraDoCnpj(p: any) {
  const cg = normCat(p.cargo || ''), nm = normCat(p.nome_completo || '')
  return CATS_ADMIN.includes(cg) || CATS_ADMIN.includes(nm)
    || cg.startsWith('RECEP') || nm.startsWith('RECEP') || normCat(p.vinculo || '') === 'CLT'
}
const vazio = (): Doc => ({
  grupos: PADRAO.map(([titulo, itens]) => ({ id: rid(), titulo, itens: itens.map(t => ({ id: rid(), texto: t })) })),
  marcados: {},
})

/** Aceita o formato antigo (lista solta de itens) sem perder o que já foi marcado. */
function normalizar(d: any): Doc | null {
  if (!d || typeof d !== 'object') return null
  if (Array.isArray(d.grupos)) return { grupos: d.grupos, marcados: d.marcados || {} }
  if (Array.isArray(d.itens)) {
    const marcados = d.marcados || {}
    const temMarca = Object.values(marcados).some((m: any) => m && Object.values(m).some(Boolean))
    // Lista antiga sem nada marcado: era só o rascunho inicial, entra o padrão
    // novo. Se já tinha marcação, a lista antiga vira uma categoria à parte para
    // não perder o histórico, e as categorias novas entram junto.
    const base = vazio()
    if (!temMarca) return { ...base, marcados }
    return { grupos: [{ id: rid(), titulo: 'LISTA ANTERIOR', itens: d.itens }, ...base.grupos], marcados }
  }
  return null
}

export default function ChecklistContabilidade() {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mesAberto, setMesAberto] = useState(0)      // 0 = mostrando os cards
  const [doc, setDoc] = useState<Doc>(vazio())
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Check list da contabilidade')

  // Só para o item "Nome / CNPJ de cada profissional ativo", que tem o atalho
  // de mandar a relação pronta no WhatsApp. É a mesma lista da tela Guias MEI
  // (CNPJ dos Profissionais), com o mesmo status e a mesma observação.
  const [profs, setProfs] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/profissionais', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(d => setProfs(Array.isArray(d) ? d.filter((p: any) => !p.is_departamento && p.ativo !== false && !foraDoCnpj(p)) : []))
      .catch(() => { })
  }, [])

  /** O item pede a lista de profissionais ativos com CNPJ? */
  const ehRelacaoProfissionais = (t: string) => /cnpj/i.test(t) && /ativ/i.test(t)

  function enviarRelacaoProfissionais() {
    if (!profs.length) { alert('Nenhum profissional PJ ativo encontrado.'); return }
    const linha = '━━━━━━━━━━━━━━━'
    const corpo = profs
      .map(p => ({
        nome: String(p.nome_completo || p.apelido || '—').toUpperCase(),
        cnpj: String(p.cnpj || '').trim(),
        status: (p.cnpj_status === 'pendente' || !p.cnpj) ? 'Pendente' : 'OK / Ativo',
        obs: String(p.cnpj_observacao || '').trim(),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((p, i) => {
        const l = [`${i + 1}. *${p.nome}*`, `    CNPJ: ${p.cnpj || 'PENDENTE DE CRIAÇÃO'}`, `    Status: ${p.status}`]
        if (p.obs) l.push(`    Obs.: ${p.obs}`)
        return l.join('\n')
      })
      .join('\n')
    const texto = [
      '*SEGUE A RELAÇÃO DE PROFISSIONAIS ATIVOS*',
      linha,
      corpo,
      linha,
      `*Total: ${profs.length} ${profs.length === 1 ? 'profissional ativo' : 'profissionais ativos'}*`,
    ].join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener')
  }

  useEffect(() => {
    fetch('/api/salon/grid?chave=checklist_contabilidade', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { const n = normalizar(d); if (n) setDoc(n) })
      .catch(() => { })
      .finally(() => setCarregando(false))
  }, [])

  const salvar = useCallback(async () => {
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'checklist_contabilidade', doc }),
      })
      if (r.ok) { setDirty(false); toast.success('Salvo!') } else toast.error('Não foi possível salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }, [doc])

  const chave = (m: number) => `${ano}-${m}`
  const totalItens = useMemo(() => doc.grupos.reduce((s, g) => s + g.itens.length, 0), [doc.grupos])
  const feitosDe = (m: number) => {
    const mk = doc.marcados[chave(m)] || {}
    return doc.grupos.reduce((s, g) => s + g.itens.filter(i => mk[i.id]).length, 0)
  }

  function marcar(m: number, itemId: string, v: boolean) {
    setDoc(d => ({ ...d, marcados: { ...d.marcados, [chave(m)]: { ...(d.marcados[chave(m)] || {}), [itemId]: v } } }))
    setDirty(true)
  }
  const mapGrupos = (fn: (g: Grupo) => Grupo) => { setDoc(d => ({ ...d, grupos: d.grupos.map(fn) })); setDirty(true) }

  function addItem(gid: string) { mapGrupos(g => g.id === gid ? { ...g, itens: [...g.itens, { id: rid(), texto: '' }] } : g) }
  function mudarItem(gid: string, id: string, texto: string) {
    mapGrupos(g => g.id === gid ? { ...g, itens: g.itens.map(i => i.id === id ? { ...i, texto } : i) } : g)
  }
  function delItem(gid: string, id: string) {
    if (!confirm('Excluir este item do check list?')) return
    mapGrupos(g => g.id === gid ? { ...g, itens: g.itens.filter(i => i.id !== id) } : g)
  }
  function mudarTitulo(gid: string, titulo: string) { mapGrupos(g => g.id === gid ? { ...g, titulo } : g) }
  function addGrupo() {
    setDoc(d => ({ ...d, grupos: [...d.grupos, { id: rid(), titulo: 'NOVA CATEGORIA', itens: [] }] }))
    setDirty(true)
  }
  function delGrupo(gid: string) {
    if (!confirm('Excluir esta categoria inteira, com os itens dela?')) return
    setDoc(d => ({ ...d, grupos: d.grupos.filter(g => g.id !== gid) })); setDirty(true)
  }

  const anos = useMemo(() => [ano - 2, ano - 1, ano, ano + 1].filter((v, i, a) => a.indexOf(v) === i), [ano])

  if (carregando) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={20} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  const btnSalvar = (
    <button onClick={salvar} disabled={salvando || !dirty}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: dirty ? '#16a34a' : '#d7d5cf', color: '#fff', fontSize: 13, fontWeight: 700, cursor: dirty ? 'pointer' : 'default' }}>
      <Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
    </button>
  )

  // ── Tela de um mês ────────────────────────────────────────────────────
  if (mesAberto > 0) {
    const mk = doc.marcados[chave(mesAberto)] || {}
    const feitos = feitosDe(mesAberto)
    const completo = totalItens > 0 && feitos === totalItens
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <button onClick={() => setMesAberto(0)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', color: '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <ArrowLeft size={15} /> Meses
          </button>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{MESES[mesAberto - 1]}/{ano}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: completo ? '#15803d' : '#b91c1c' }}>{feitos}/{totalItens} enviados</span>
          <div style={{ flex: 1 }} />
          {btnSalvar}
        </div>

        {doc.grupos.map(g => {
          const fg = g.itens.filter(i => mk[i.id]).length
          const okG = g.itens.length > 0 && fg === g.itens.length
          return (
            <div key={g.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input value={g.titulo} onChange={e => mudarTitulo(g.id, e.target.value)}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 900, letterSpacing: '.4px', color: okG ? '#15803d' : '#1a1a1a' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: okG ? '#15803d' : '#b91c1c', whiteSpace: 'nowrap' }}>{fg}/{g.itens.length}</span>
                <button onClick={() => delGrupo(g.id)} title="Excluir categoria"
                  style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 3 }}><Trash2 size={13} /></button>
              </div>

              {g.itens.map(item => {
                const on = !!mk[item.id]
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderTop: '1px solid #f2f0ec' }}>
                    <input type="checkbox" checked={on} onChange={e => marcar(mesAberto, item.id, e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: '#16a34a', cursor: 'pointer', flexShrink: 0 }} />
                    <input value={item.texto} onChange={e => mudarItem(g.id, item.id, e.target.value)} placeholder="Descreva o item…"
                      style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: on ? '#15803d' : '#374151', fontWeight: on ? 700 : 500, textDecoration: on ? 'line-through' : 'none', background: 'transparent' }} />
                    {ehRelacaoProfissionais(item.texto) && (
                      <button onClick={enviarRelacaoProfissionais} title="Enviar a relação dos profissionais ativos no WhatsApp"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', borderRadius: 7, background: '#25d366', color: '#fff', fontSize: 10.5, fontWeight: 800, padding: '4px 9px', cursor: 'pointer', flexShrink: 0 }}>
                        <MessageCircle size={12} /> Enviar
                      </button>
                    )}
                    <button onClick={() => delItem(g.id, item.id)} title="Excluir item"
                      style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 3, flexShrink: 0 }}><Trash2 size={13} /></button>
                  </div>
                )
              })}

              <button onClick={() => addItem(g.id)}
                style={{ marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 12, fontWeight: 800, padding: '6px 12px', borderRadius: 9, cursor: 'pointer' }}>
                <Plus size={12} /> Acrescentar item
              </button>
            </div>
          )
        })}

        <button onClick={addGrupo}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px dashed #9ca3af', background: '#fff', color: '#4b5563', fontSize: 12.5, fontWeight: 800, padding: '8px 14px', borderRadius: 9, cursor: 'pointer' }}>
          <Plus size={13} /> Acrescentar categoria
        </button>
      </div>
    )
  }

  // ── Os 12 meses ───────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Check list da contabilidade — {ano}</h2>
          <p style={{ fontSize: 12, color: '#6b6860', margin: '2px 0 0' }}>
            {doc.grupos.length} categorias, {totalItens} itens. Clique no mês para marcar o que já foi enviado.
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <select value={ano} onChange={e => setAno(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 9, border: '1.5px solid #e0ddd8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {btnSalvar}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
        {MESES.map((nome, i) => {
          const m = i + 1
          const feitos = feitosDe(m)
          const pct = totalItens ? Math.round((feitos / totalItens) * 100) : 0
          const completo = totalItens > 0 && feitos === totalItens
          return (
            <button key={m} onClick={() => setMesAberto(m)}
              style={{ textAlign: 'left', background: completo ? '#f0fdf4' : '#fff', border: `1.5px solid ${completo ? '#16a34a' : feitos > 0 ? '#fca5a5' : '#e8e6e0'}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 13.5, color: completo ? '#15803d' : '#1a1a1a' }}>{nome}</span>
                <div style={{ flex: 1 }} />
                {completo
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 99 }}><Check size={11} /> OK</span>
                  : <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 800 }}>{feitos}/{totalItens}</span>}
              </div>
              <div style={{ height: 8, borderRadius: 99, background: '#f0eee8', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: completo ? '#16a34a' : '#dc2626', transition: 'width .25s' }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
