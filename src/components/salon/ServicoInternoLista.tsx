'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, Trash2, Pencil, Search, X, Package, Users, Wallet, CalendarClock } from 'lucide-react'
import { getLogoSalao } from '@/lib/logoSalao'
import { useIsMobile } from '@/lib/useIsMobile'
import { cel, type Cell } from './GridEditavel'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { quinzenaDeHoje, labelQuinzena, nomeQuinzena, dataNaQuinzena, type Quinzena } from '@/lib/quinzena'

interface ProfSalao { id: string; nome: string; telefone?: string }
interface Item { id: string; data: string; produto: string; quantidade: string; unidade: string; profissional: string; valor: string }

const UNIDADES = ['g', 'ml', 'un', 'kg', 'L', 'cx', 'pct']
const COR = '#5b4fcf'
const TITULO_TABELA = 'SERVIÇO INTERNO / PRODUTOS UTILIZADOS'

function mesAtual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const rid = () => Math.random().toString(36).slice(2, 9)
function hojeBR() { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` }
function brToIso(s: string) { const m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : '' }
function isoToBr(s: string) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : s }

// Quantidade + Unidade eram um único texto livre (ex: "40g"); mantém compatível
// com o que já está salvo, separando pra exibir e voltando a juntar ao salvar.
function parseQtd(s: string): { quantidade: string; unidade: string } {
  const m = String(s || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/)
  if (!m) return { quantidade: '', unidade: s || '' }
  return { quantidade: m[1], unidade: (m[2] || '').trim() }
}
function fmtQtd(q: string, u: string) {
  const qt = (q || '').trim(), un = (u || '').trim()
  if (!qt) return un
  if (!un) return qt
  return /^[a-zA-Zçãáéíóú%]+$/.test(un) && un.length <= 3 ? `${qt}${un}` : `${qt} ${un}`
}
function parseValor(s: string): number {
  const n = Number(String(s || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}
function fmtBRL(n: number) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function ServicoInternoLista({ chave = 'servinterno', profsSalao = [] }: { chave?: string; profsSalao?: ProfSalao[] }) {
  const mobile = useIsMobile()
  const [mes, setMes] = useState(mesAtual())
  const [quinzena, setQuinzena] = useState<Quinzena>(quinzenaDeHoje())
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Serviços Internos') // avisa "Deseja salvar?" antes de sair sem salvar
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState<Item | null>(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('')

  const chaveEfetiva = `${chave}_${mes}`
  const herdouLegado = useRef(false)

  const linhasParaItems = (linhas: Cell[][]): Item[] =>
    linhas.filter(l => l.some(c => (c?.t || '').trim())).map(l => {
      const { quantidade, unidade } = parseQtd(l[2]?.t || '')
      return { id: rid(), data: l[0]?.t || '', produto: l[1]?.t || '', quantidade, unidade, profissional: l[3]?.t || '', valor: l[4]?.t || '' }
    })

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chaveEfetiva)}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.tabelas) && d.tabelas[0]) {
        setItems(linhasParaItems(d.tabelas[0].linhas || [])); setDirty(false)
      } else {
        // Compatibilidade: se nunca salvou neste mês, herda um conteúdo antigo
        // (de antes da lista virar mensal) só na 1ª vez, sem perder nada.
        const legado = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chave)}`).then(r => r.ok ? r.json() : null)
        const linhasLegado = legado && Array.isArray(legado.tabelas) ? (legado.tabelas[0]?.linhas || []) : []
        if (linhasLegado.some((l: Cell[]) => l.some(c => (c?.t || '').trim()))) {
          setItems(linhasParaItems(linhasLegado)); herdouLegado.current = true; setDirty(true)
        } else { setItems([]); setDirty(false) }
      }
    } catch { setItems([]); setDirty(false) }
    setLoading(false)
  }, [chaveEfetiva, chave])
  useEffect(() => { carregar() }, [carregar])

  const limparLegadoSePreciso = useCallback(() => {
    if (!herdouLegado.current) return
    herdouLegado.current = false
    fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, doc: { tabelas: [] } }) }).catch(() => { })
  }, [chave])

  async function salvar() {
    setSalvando(true)
    try {
      const tabela = {
        titulo: TITULO_TABELA,
        cabecalho: [cel('Data'), cel('Produto'), cel('Quantidade'), cel('Profissional'), cel('Valor')],
        linhas: items.map(it => [cel(it.data), cel(it.produto), cel(fmtQtd(it.quantidade, it.unidade)), cel(it.profissional), cel(it.valor)]),
      }
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: chaveEfetiva, doc: { tabelas: [tabela] } }) })
      if (res.ok) {
        toast.success('Lista salva!'); setDirty(false); limparLegadoSePreciso()
        setUltimaAtualizacao(new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))
      } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function abrirNovo() { setModal({ id: rid(), data: hojeBR(), produto: '', quantidade: '', unidade: '', profissional: '', valor: '' }) }
  function abrirEditar(it: Item) { setModal({ ...it }) }
  function salvarModal() {
    if (!modal) return
    if (!modal.produto.trim()) { toast('Informe o produto', { icon: '✍️' }); return }
    setItems(prev => prev.some(x => x.id === modal.id) ? prev.map(x => x.id === modal.id ? modal : x) : [...prev, modal])
    setDirty(true); setModal(null)
  }
  function excluir(id: string) {
    if (!confirm('Remover este item?')) return
    setItems(prev => prev.filter(x => x.id !== id)); setDirty(true)
  }

  // Só os lançamentos da quinzena escolhida (o mês inteiro fica salvo; a virada
  // "zera" a vista e o histórico segue acessível pelo seletor de quinzena).
  const itensPeriodo = items.filter(it => dataNaQuinzena(it.data, mes, quinzena))
  const buscaN = busca.trim().toLowerCase()
  const itensFiltrados = buscaN ? itensPeriodo.filter(it => it.produto.toLowerCase().includes(buscaN) || it.profissional.toLowerCase().includes(buscaN)) : itensPeriodo

  const valorTotal = itensPeriodo.reduce((a, it) => a + parseValor(it.valor), 0)
  const profissionaisEnvolvidos = new Set(itensPeriodo.map(it => it.profissional.trim()).filter(Boolean)).size
  const produtosSugeridos = Array.from(new Set(items.map(it => it.produto).filter(Boolean)))

  function trocarQuinzena(q: Quinzena) {
    if (q === quinzena) return
    setQuinzena(q)
  }

  // ── Resumo por profissional (total devido) — soma tudo de cada um na quinzena ──
  const resumoProf = (() => {
    const mapa = new Map<string, { nome: string; total: number; itens: number }>()
    itensPeriodo.forEach(it => {
      const nome = it.profissional.trim()
      if (!nome) return
      const chave = nome.toLowerCase()
      const r = mapa.get(chave) || { nome, total: 0, itens: 0 }
      r.total += parseValor(it.valor); r.itens += 1
      mapa.set(chave, r)
    })
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total)
  })()

  async function imprimir() {
    const logoSalao = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const linhas = itensPeriodo.map(it => `<tr><td>${esc(it.data)}</td><td>${esc(it.produto)}</td><td>${esc(fmtQtd(it.quantidade, it.unidade))}</td><td>${esc(it.profissional)}</td><td>R$ ${esc(it.valor)}</td></tr>`).join('')
    const cab = logoSalao ? `<img src="${logoSalao}" style="max-height:54px;max-width:190px;object-fit:contain"/>` : `<div style="font-size:22px;font-weight:900;color:${COR}">NODRI</div>`
    const css = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px}.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${COR};padding-bottom:8px;margin-bottom:12px}h1{font-size:15px;margin-bottom:10px;text-transform:uppercase}table{width:100%;border-collapse:collapse}th,td{border:1px solid #f0ede6;text-align:left;padding:6px 8px}th{background:#f6f4ff;color:${COR};border-bottom:2px solid ${COR};font-size:10px;text-transform:uppercase}tfoot td{background:#f6f4ff;color:${COR};font-weight:800;border-top:2px solid ${COR}}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const resumoLinhas = resumoProf.map(r => `<tr><td class="nm">${esc(r.nome)}</td><td style="text-align:right;font-weight:800;color:#15803d">R$ ${fmtBRL(r.total)}</td></tr>`).join('')
    const resumoHtml = resumoProf.length ? `<h1 style="margin-top:22px">TOTAL DEVIDO POR PROFISSIONAL</h1><table class="resumo"><thead><tr><th>Profissional</th><th style="text-align:right">Total devido</th></tr></thead><tbody>${resumoLinhas}</tbody><tfoot><tr><td>TOTAL GERAL</td><td style="text-align:right">R$ ${fmtBRL(valorTotal)}</td></tr></tfoot></table>` : ''
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Serviço Interno</title><style>${css}.resumo .nm{font-weight:700}.resumo td{font-size:12px}</style></head><body><div class="hd">${cab}<span style="font-size:10px;color:#777">${new Date().toLocaleDateString('pt-BR')}</span></div><h1>${esc(TITULO_TABELA)} — ${esc(nomeQuinzena(quinzena))} (${esc(labelQuinzena(mes, quinzena))})</h1><table><thead><tr><th>Data</th><th>Produto</th><th>Quantidade</th><th>Profissional</th><th>Valor</th></tr></thead><tbody>${linhas}</tbody><tfoot><tr><td colspan="4">TOTAL</td><td>R$ ${fmtBRL(valorTotal)}</td></tr></tfoot></table>${resumoHtml}<script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div>
      <style>{`
        .svcint-table tbody tr:nth-child(even) { background:#fbfbfa; }
        .svcint-table tbody tr:hover { background:#f5f4fd; }
        .svcint-card:hover { box-shadow:0 4px 14px rgba(0,0,0,.08); border-color:#d9d5f5; }
      `}</style>

      {/* ── Barra de controles ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '10px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860' }}>Mês:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 9px', borderRadius: 8, border: '1px solid #d0cdc7', fontSize: 13 }} />
        <div style={{ display: 'inline-flex', border: '1px solid #d0cdc7', borderRadius: 8, overflow: 'hidden' }}>
          {([1, 2, 0] as const).map(q => (
            <button key={q} onClick={() => trocarQuinzena(q)}
              style={{ padding: '7px 10px', border: 'none', background: quinzena === q ? '#5b4fcf' : '#fff', color: quinzena === q ? '#fff' : '#6b6860', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {q === 0 ? 'Mês inteiro' : `${q}ª quinz.`}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#5b4fcf', background: '#f0eefb', borderRadius: 20, padding: '4px 10px', whiteSpace: 'nowrap' }}>{labelQuinzena(mes, quinzena)}</span>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto, profissional..."
            style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 8, border: '1px solid #d0cdc7', fontSize: 13 }} />
        </div>
        <div style={{ flex: 1 }} />
        {dirty && !salvando && <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Alterações não salvas</span>}
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir A4</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
        <button onClick={abrirNovo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Adicionar Produto</button>
      </div>

      {/* ── Dashboard resumido ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon={<Package size={16} />} label="Produtos utilizados" value={String(items.length)} sub="itens cadastrados" />
        <StatCard icon={<Wallet size={16} />} label="Valor total" value={`R$ ${fmtBRL(valorTotal)}`} sub="total no período" cor="#16a34a" />
        <StatCard icon={<Users size={16} />} label="Profissionais" value={String(profissionaisEnvolvidos)} sub="envolvidos" cor="#2563eb" />
        <StatCard icon={<CalendarClock size={16} />} label="Última atualização" value={ultimaAtualizacao ? ultimaAtualizacao.split(' ')[0] : '—'} sub={ultimaAtualizacao || 'ainda não salvo agora'} cor="#b45309" />
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div> : (
        itensFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
            {items.length === 0 ? <>Nenhum produto ainda. Clique em <strong style={{ color: COR }}>+ Adicionar Produto</strong> para começar.</>
              : itensPeriodo.length === 0 ? <>Nenhum lançamento na <strong>{nomeQuinzena(quinzena)}</strong> ({labelQuinzena(mes, quinzena)}). Veja em <strong>Mês inteiro</strong> ou na outra quinzena.</>
              : 'Nenhum item encontrado para essa busca.'}
          </div>
        ) : mobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {itensFiltrados.map(it => (
              <div key={it.id} className="svcint-card" style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: 14, transition: 'box-shadow .15s, border-color .15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>{it.data}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => abrirEditar(it)} style={iconBtn('#5b4fcf')}><Pencil size={13} /></button>
                    <button onClick={() => excluir(it.id)} style={iconBtn('#dc2626')}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14.5, color: '#1a1a1a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Package size={14} color={COR} /> {it.produto}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12.5 }}>
                  <div><span style={{ color: '#9ca3af' }}>Quantidade</span><br /><strong>{fmtQtd(it.quantidade, it.unidade) || '—'}</strong></div>
                  <div><span style={{ color: '#9ca3af' }}>Profissional</span><br /><strong>{it.profissional || '—'}</strong></div>
                </div>
                <div style={{ marginTop: 10, padding: '8px 10px', background: '#f0fdf4', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>VALOR</span>
                  <strong style={{ fontSize: 15, color: '#16a34a' }}>R$ {it.valor || '0,00'}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, overflowX: 'auto' }}>
            <table className="svcint-table" style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Produto', 'Profissional', 'Quantidade', 'Valor', 'Data', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: i >= 3 && i <= 4 ? 'center' : 'left', padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #e8e6e0', background: '#faf9f7' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itensFiltrados.map(it => (
                  <tr key={it.id} style={{ borderBottom: '1px solid #f0eee8' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}><Package size={14} color={COR} /> {it.produto}</td>
                    <td style={{ padding: '12px 16px', color: '#374151' }}>{it.profissional || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#374151' }}>{fmtQtd(it.quantidade, it.unidade) || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>R$ {it.valor || '0,00'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b6860', fontSize: 12.5 }}>{it.data || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => abrirEditar(it)} style={iconBtn('#5b4fcf')}><Pencil size={13} /></button>
                      <button onClick={() => excluir(it.id)} style={iconBtn('#dc2626')}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Total devido por profissional (soma de todos os lançamentos de cada um) ── */}
      {!loading && resumoProf.length > 0 && (
        <div style={{ marginTop: 18, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}>
            <Users size={16} color="#16a34a" />
            <strong style={{ fontSize: 13.5, color: '#15803d' }}>Total devido por profissional</strong>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: '#6b6860' }}>{resumoProf.length} profissional{resumoProf.length > 1 ? 'is' : ''}</span>
          </div>
          <div>
            {resumoProf.map((r, i) => (
              <div key={r.nome} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderTop: i === 0 ? 'none' : '1px solid #f0eee8' }}>
                <span style={{ fontWeight: 700, color: '#1a1a1a', fontSize: 13.5, flex: 1 }}>{r.nome}</span>
                <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{r.itens} item{r.itens > 1 ? 's' : ''}</span>
                <strong style={{ fontSize: 15, color: '#16a34a', minWidth: 96, textAlign: 'right' }}>R$ {fmtBRL(r.total)}</strong>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: '2px solid #dcfce7', background: '#f6fef9' }}>
              <span style={{ fontWeight: 900, color: '#15803d', fontSize: 13.5, flex: 1 }}>TOTAL GERAL</span>
              <strong style={{ fontSize: 16, color: '#15803d', minWidth: 96, textAlign: 'right' }}>R$ {fmtBRL(valorTotal)}</strong>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#1a1a1a' }}>{items.some(x => x.id === modal.id) ? '✏️ Editar produto' : '🧴 Adicionar produto'}</h3>
              <button onClick={() => setModal(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>

            <Campo label="Produto">
              <input list="svcint-produtos" value={modal.produto} onChange={e => setModal({ ...modal, produto: e.target.value })} placeholder="Pesquisar produto..." autoFocus style={inputSt} />
              <datalist id="svcint-produtos">{produtosSugeridos.map(p => <option key={p} value={p} />)}</datalist>
            </Campo>

            <Campo label="Profissional">
              <input list="svcint-profs" value={modal.profissional} onChange={e => setModal({ ...modal, profissional: e.target.value })} placeholder="Selecionar ou digitar..." style={inputSt} />
              <datalist id="svcint-profs">{profsSalao.map(p => <option key={p.id} value={p.nome} />)}</datalist>
            </Campo>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Campo label="Quantidade">
                <input value={modal.quantidade} onChange={e => setModal({ ...modal, quantidade: e.target.value })} placeholder="Ex: 40" style={inputSt} />
              </Campo>
              <Campo label="Unidade">
                <input list="svcint-unidades" value={modal.unidade} onChange={e => setModal({ ...modal, unidade: e.target.value })} placeholder="g, ml, un..." style={inputSt} />
                <datalist id="svcint-unidades">{UNIDADES.map(u => <option key={u} value={u} />)}</datalist>
              </Campo>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Campo label="Valor (R$)">
                <input value={modal.valor} onChange={e => setModal({ ...modal, valor: e.target.value })} placeholder="0,00" style={inputSt} />
              </Campo>
              <Campo label="Data">
                <input type="date" value={brToIso(modal.data)} onChange={e => setModal({ ...modal, data: isoToBr(e.target.value) })} style={inputSt} />
              </Campo>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarModal} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub, cor = COR }: { icon: React.ReactNode; label: string; value: string; sub: string; cor?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, color: cor }}>{icon}<span style={{ fontSize: 11.5, fontWeight: 700, color: '#6b6860' }}>{label}</span></div>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a1a', lineHeight: 1.15 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b6860', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const inputSt: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 9, border: '1.5px solid #d0cdc7', fontSize: 13.5, fontFamily: 'inherit' }
function iconBtn(cor: string): React.CSSProperties { return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: cor, cursor: 'pointer' } }
