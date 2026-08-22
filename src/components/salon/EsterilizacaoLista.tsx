'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, Trash2, Pencil, X, Sparkles, ShieldCheck, ShieldAlert, Users, Scissors, RotateCcw, ChevronDown, ChevronUp, Clock3 } from 'lucide-react'
import { useIsMobile } from '@/lib/useIsMobile'
import { getLogoSalao } from '@/lib/logoSalao'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import {
  type EsterilizacaoItem as Item, mesAtualEster as mesAtual, hojeBR, brToIso, isoToBr, mesmoProf, ridEster as rid,
  linhasParaEsterilizacaoItems, esterilizacaoItemsParaTabela,
} from '@/lib/esterilizacaoShared'
import { STATUS_ESTER, type PedidoEster } from '@/lib/esterilizacaoFluxo'

interface ProfSalao { id: string; nome: string; telefone?: string }
interface LinhaCruzamento { nome: string; atendimentos: number; esterilizacoes: number; registros: number; servicos: string[] }

const COR = '#5b4fcf'

// ── Alicates que passaram pelo FLUXO de solicitações ────────────────────────
// A esterilização acontece em dois lugares: o lançamento manual desta página e
// o fluxo da aba "Solicitações" (a profissional envia → o salão recebe →
// entrega). O painel precisa somar OS DOIS, senão quem só usa o fluxo aparece
// como "Nunca registrou" mesmo tendo alicates esterilizados.

/** Mês (YYYY-MM) do pedido — pela data mais representativa que ele tiver. */
function mesDoPedido(p: PedidoEster): string {
  const br = p.dataEnvio || p.dataRecebimento || p.dataEntrega || ''
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}`
  if (!p.em) return ''
  const d = new Date(p.em)
  return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
/** Quantidade que conta: o que o salão conferiu vale mais que o informado. */
function qtdDoPedido(p: PedidoEster): number {
  const v = [p.qtdRecebida, p.qtdEntregue, p.qtdEnviada].find(x => typeof x === 'number')
  return Number(v || 0)
}
/** Material ainda no salão (não voltou para a profissional). */
const pendenteNoSalao = (p: PedidoEster) => p.status === 'enviado' || p.status === 'recebido'
const dataDoPedido = (p: PedidoEster) => p.dataEnvio || p.dataRecebimento || p.dataEntrega || ''

export default function EsterilizacaoLista({ chave = 'esterilizacao', profsSalao = [] }: { chave?: string; profsSalao?: ProfSalao[] }) {
  const mobile = useIsMobile()
  const [mes, setMes] = useState(mesAtual())
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Esterilização') // avisa "Deseja salvar?" antes de sair sem salvar
  const [modal, setModal] = useState<Item | null>(null)
  const [cruzamento, setCruzamento] = useState<LinhaCruzamento[]>([])
  const [fluxo, setFluxo] = useState<PedidoEster[]>([])
  const [loadingCruzamento, setLoadingCruzamento] = useState(true)
  const [aberto, setAberto] = useState<string | null>(null)

  const chaveEfetiva = `${chave}_${mes}`

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chaveEfetiva)}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.tabelas) && d.tabelas[0]) setItems(linhasParaEsterilizacaoItems(d.tabelas[0].linhas || []))
      else setItems([])
      setDirty(false)
    } catch { setItems([]); setDirty(false) }
    setLoading(false)
  }, [chaveEfetiva])
  useEffect(() => { carregar() }, [carregar])

  const carregarCruzamento = useCallback(async () => {
    setLoadingCruzamento(true)
    try {
      const [ano, mesNum] = mes.split('-').map(Number)
      const d = await fetch(`/api/relatorios/esterilizacao?ano=${ano}&mes=${mesNum}`).then(r => r.ok ? r.json() : null)
      setCruzamento(Array.isArray(d?.profissionais) ? d.profissionais.map((p: any) => ({ nome: p.profissional, atendimentos: p.atendimentos, esterilizacoes: 0, registros: 0, servicos: Object.keys(p.servicos || {}) })) : [])
    } catch { setCruzamento([]) }
    setLoadingCruzamento(false)
  }, [mes])
  useEffect(() => { carregarCruzamento() }, [carregarCruzamento])

  // Pedidos do fluxo (aba "Solicitações"). Vêm todos; filtramos pelo mês aqui.
  useEffect(() => {
    fetch('/api/salon/esterilizacao-fluxo')
      .then(r => r.ok ? r.json() : null)
      .then(d => setFluxo(Array.isArray(d?.pedidos) ? d.pedidos : []))
      .catch(() => setFluxo([]))
  }, [])

  async function salvar() {
    setSalvando(true)
    try {
      const tabela = esterilizacaoItemsParaTabela(items)
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: chaveEfetiva, doc: { tabelas: [tabela] } }) })
      if (res.ok) { toast.success('Registros salvos!'); setDirty(false) }
      else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function abrirNovo() { setModal({ id: rid(), profissional: '', quantidade: '1', data: hojeBR(), dataDevolucao: '', observacao: '' }) }
  function abrirEditar(it: Item) { setModal({ ...it }) }
  function salvarModal() {
    if (!modal) return
    if (!modal.profissional.trim()) { toast('Informe o profissional', { icon: '' }); return }
    setItems(prev => prev.some(x => x.id === modal.id) ? prev.map(x => x.id === modal.id ? modal : x) : [...prev, modal])
    setDirty(true); setModal(null)
  }
  function excluir(id: string) {
    if (!confirm('Remover este registro?')) return
    setItems(prev => prev.filter(x => x.id !== id)); setDirty(true)
  }
  function marcarDevolvido(id: string) { setItems(prev => prev.map(x => x.id === id ? { ...x, dataDevolucao: hojeBR() } : x)); setDirty(true) }
  function reabrir(id: string) { setItems(prev => prev.map(x => x.id === id ? { ...x, dataDevolucao: '' } : x)); setDirty(true) }

  async function imprimir() {
    const logoSalao = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const periodo = mes.split('-').reverse().join('/')

    const linhasPainel = linhas.map(l => {
      const critico = l.atendimentos > 0 && l.registros === 0
      const atencao = !critico && l.registros > 0 && l.esterilizacoes < l.atendimentos
      const situacao = critico ? 'Nunca registrou' : atencao ? 'Abaixo do esperado' : '✓ Em dia'
      const classe = critico ? 'crit' : atencao ? 'atn' : 'ok'
      return `<tr class="${classe}"><td>${esc(l.nome)}</td><td class="c">${l.atendimentos}</td><td class="c">${l.esterilizacoes}</td><td>${esc(l.servicos.join(', '))}</td><td class="c situacao">${situacao}</td></tr>`
    }).join('')

    const linhasRegistros = items.map(it => {
      const pendente = !it.dataDevolucao.trim()
      return `<tr><td>${esc(it.profissional)}</td><td class="c">${esc(it.quantidade)}</td><td class="c">${esc(it.data)}</td><td class="c">${pendente ? 'Pendente' : `✓ ${esc(it.dataDevolucao)}`}</td><td>${esc(it.observacao)}</td></tr>`
    }).join('')

    // Os alicates do fluxo de solicitações entram na mesma tabela — são
    // esterilização registrada igual aos lançamentos manuais.
    const linhasFluxo = fluxoDoMes.map(p => {
      const st = STATUS_ESTER[p.status]?.label || p.status
      const obs = [p.obsRecebimento, '(via Solicitações)'].filter(Boolean).join(' ')
      return `<tr><td>${esc(p.profNome)}</td><td class="c">${qtdDoPedido(p)}</td><td class="c">${esc(dataDoPedido(p))}</td><td class="c">${esc(st)}</td><td>${esc(obs)}</td></tr>`
    }).join('')

    const cab = logoSalao ? `<img src="${logoSalao}" class="logo"/>` : `<div class="brand">NODRI</div>`
    const css = `
@page{size:A4 portrait;margin:12mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${COR};padding-bottom:10px;margin-bottom:6px}
.logo{max-height:56px;max-width:200px;object-fit:contain}
.brand{font-size:22px;font-weight:900;color:${COR};letter-spacing:1px}
.hd .dt{font-size:10px;color:#777;text-align:right}
h1{text-align:center;font-size:17px;font-weight:900;color:#1a1a2e;margin:12px 0 2px;text-transform:uppercase;letter-spacing:.4px}
.sub{text-align:center;font-size:11px;color:#888;margin-bottom:16px}
.stats{display:flex;gap:8px;margin-bottom:18px}
.stat{flex:1;border:1px solid #e5e2db;border-radius:10px;padding:9px 10px;background:#faf9f7}
.stat b{display:block;font-size:16px;color:${COR}}
.stat span{font-size:9.5px;color:#888;text-transform:uppercase;letter-spacing:.3px}
h2{font-size:12.5px;color:${COR};margin:16px 0 6px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1.5px solid ${COR};padding-bottom:4px}
table{width:100%;border-collapse:collapse;margin-bottom:6px}
th,td{border:1px solid #f0ede6;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#f6f4ff;color:${COR};border-bottom:2px solid ${COR};font-size:9.5px;text-transform:uppercase;letter-spacing:.3px}
td.c,th.c{text-align:center}
tbody tr:nth-child(even) td{background:#fbfaf8}
tr.crit td{background:#fef2f2!important}
tr.atn td{background:#fffbeb!important}
tr.crit .situacao{color:#dc2626;font-weight:800}
tr.atn .situacao{color:#b45309;font-weight:800}
tr.ok .situacao{color:#16a34a;font-weight:800}
.vazio{color:#9ca3af;font-style:italic;padding:10px 0}
`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Esterilização — ${esc(periodo)}</title><style>${css}</style></head><body>
<div class="hd">${cab}<span class="dt">${new Date().toLocaleDateString('pt-BR')}</span></div>
<h1>Controle de Esterilização</h1>
<div class="sub">Manicure, pedicure e sobrancelha — ${esc(periodo)}</div>
<div class="stats">
  <div class="stat"><b>${totalAtendimentos}</b><span>Atendimentos c/ alicate</span></div>
  <div class="stat"><b>${totalEsterilizacoes}</b><span>Esterilizações registradas</span></div>
  <div class="stat"><b>${pendentesDevolucao}</b><span>Pendentes de devolução</span></div>
  <div class="stat"><b>${emAlerta}</b><span>Profissionais em alerta</span></div>
</div>
<h2>Atendimentos x Esterilização</h2>
${linhas.length ? `<table><thead><tr><th>Profissional</th><th class="c">Atendimentos</th><th class="c">Esterilizações</th><th>Serviços considerados</th><th class="c">Situação</th></tr></thead><tbody>${linhasPainel}</tbody></table>` : '<div class="vazio">Nenhum atendimento de manicure/pedicure/sobrancelha neste mês.</div>'}
<h2>Registros de Esterilização</h2>
${items.length || fluxoDoMes.length ? `<table><thead><tr><th>Profissional</th><th class="c">Quantidade</th><th class="c">Enviado em</th><th class="c">Devolução</th><th>Observação</th></tr></thead><tbody>${linhasRegistros}${linhasFluxo}</tbody></table>` : '<div class="vazio">Nenhum registro de esterilização neste mês.</div>'}
<script>window.onload=function(){window.print()}</script>
</body></html>`
    const w = window.open('', '_blank', 'width=1000,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  // Pedidos do fluxo que caem no mês selecionado (o resto fica de fora da conta).
  const fluxoDoMes = fluxo.filter(p => mesDoPedido(p) === mes)
  const fluxoForaDoMes = fluxo.length - fluxoDoMes.length

  // Combina o cruzamento (atendimentos vindos dos Relatórios) com as
  // esterilizações registradas — TANTO as lançadas manualmente aqui QUANTO as
  // que passaram pelo fluxo de solicitações —, casando o nome do profissional
  // de forma flexível (o nome importado do Excel nem sempre é igual ao apelido).
  const linhas: LinhaCruzamento[] = cruzamento.map(c => {
    const doProf = items.filter(it => mesmoProf(it.profissional, c.nome))
    const manual = doProf.reduce((s, it) => s + (Number(String(it.quantidade).replace(',', '.')) || 0), 0)
    const doFluxo = fluxoDoMes.filter(p => mesmoProf(p.profNome, c.nome))
    const viaFluxo = doFluxo.reduce((s, p) => s + qtdDoPedido(p), 0)
    return { ...c, esterilizacoes: manual + viaFluxo, registros: doProf.length + doFluxo.length }
  }).sort((a, b) => b.atendimentos - a.atendimentos)

  const totalAtendimentos = linhas.reduce((s, l) => s + l.atendimentos, 0)
  const totalEsterilizacoes = items.reduce((s, it) => s + (Number(String(it.quantidade).replace(',', '.')) || 0), 0)
    + fluxoDoMes.reduce((s, p) => s + qtdDoPedido(p), 0)
  const emAlerta = linhas.filter(l => l.atendimentos > 0 && l.registros === 0).length
  const pendentesDevolucao = items.filter(it => !it.dataDevolucao.trim()).length
    + fluxoDoMes.filter(pendenteNoSalao).length
  const profissionaisEnvolvidos = new Set(items.map(it => it.profissional.trim()).filter(Boolean)).size

  return (
    <div>
      <style>{`
        .ester-table tbody tr:nth-child(even) { background:#fbfbfa; }
        .ester-table tbody tr:hover { background:#f5f4fd; }
        .ester-card:hover { box-shadow:0 4px 14px rgba(0,0,0,.08); border-color:#d9d5f5; }
      `}</style>

      {/* ── Barra de controles ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '10px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860' }}>Mês:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 9px', borderRadius: 8, border: '1px solid #d0cdc7', fontSize: 13 }} />
        <div style={{ flex: 1 }} />
        {dirty && !salvando && <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Alterações não salvas</span>}
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir A4</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
        <button onClick={abrirNovo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Registrar Esterilização</button>
      </div>

      <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 16px' }}>
        Cruza os atendimentos de manicure, pedicure e sobrancelha (mesmo dado dos Relatórios) com as esterilizações registradas — tanto os lançamentos desta página quanto os alicates da aba <strong>Solicitações</strong>. Clique em cada profissional no painel abaixo para ver quais serviços entraram na conta.
      </p>

      {/* A comparação só faz sentido dentro do MESMO mês: atendimentos de agosto
          x esterilizações de agosto. Quando existem pedidos de outros meses, o
          aviso evita que o número pareça errado. */}
      {fluxoForaDoMes > 0 && (
        <p style={{ fontSize: 12, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '9px 12px', margin: '0 0 16px' }}>
          Existe(m) <strong>{fluxoForaDoMes}</strong> pedido(s) de alicate na aba Solicitações com data de <strong>outro mês</strong> — eles não entram nesta conta, que é só de {mes.split('-').reverse().join('/')}. A data de cada pedido aparece na aba Solicitações.
        </p>
      )}

      {/* ── Dashboard resumido ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon={<Scissors size={16} />} label="Atendimentos c/ alicate" value={String(totalAtendimentos)} sub="manicure, pedicure, sobrancelha" />
        <StatCard icon={<Sparkles size={16} />} label="Esterilizações registradas" value={String(totalEsterilizacoes)} sub="itens de material" cor="#16a34a" />
        <StatCard icon={<Clock3 size={16} />} label="Pendentes de devolução" value={String(pendentesDevolucao)} sub="material ainda não voltou" cor={pendentesDevolucao > 0 ? '#b45309' : '#16a34a'} />
        <StatCard icon={<ShieldAlert size={16} />} label="Em alerta" value={String(emAlerta)} sub="atenderam e não registraram" cor={emAlerta > 0 ? '#dc2626' : '#16a34a'} />
      </div>

      {/* ── Painel comparativo ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px' }}>Atendimentos x Esterilização — {mes.split('-').reverse().join('/')}</h3>
        {loadingCruzamento || loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><Loader2 size={20} className="animate-spin" style={{ color: COR }} /></div> :
          linhas.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', padding: '16px 0' }}>Nenhum atendimento de manicure/pedicure/sobrancelha encontrado nos Relatórios para este mês.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {linhas.map(l => {
                const critico = l.atendimentos > 0 && l.registros === 0
                const atencao = !critico && l.registros > 0 && l.esterilizacoes < l.atendimentos
                const ok = !critico && !atencao
                const cor = critico ? '#dc2626' : atencao ? '#b45309' : '#16a34a'
                const bg = critico ? '#fef2f2' : atencao ? '#fffbeb' : '#f0fdf4'
                const expandido = aberto === l.nome
                return (
                  <div key={l.nome} style={{ borderRadius: 10, background: bg, overflow: 'hidden' }}>
                    <div onClick={() => setAberto(expandido ? null : l.nome)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', flexWrap: 'wrap', cursor: 'pointer' }}>
                      {critico ? <ShieldAlert size={16} color={cor} /> : ok ? <ShieldCheck size={16} color={cor} /> : <ShieldAlert size={16} color={cor} />}
                      <strong style={{ fontSize: 13.5, color: '#1a1a1a', minWidth: 120 }}>{l.nome}</strong>
                      <span style={{ fontSize: 12, color: '#374151' }}>{l.atendimentos} atendimento{l.atendimentos !== 1 ? 's' : ''}</span>
                      <span style={{ fontSize: 12, color: '#374151' }}>· {l.esterilizacoes} esterilizaç{l.esterilizacoes !== 1 ? 'ões' : 'ão'} registrada{l.esterilizacoes !== 1 ? 's' : ''}</span>
                      <div style={{ flex: 1 }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: cor }}>{critico ? 'Nunca registrou' : atencao ? 'Abaixo do esperado' : '✓ Em dia'}</span>
                      {expandido ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
                    </div>
                    {expandido && (
                      <div style={{ padding: '0 12px 12px 40px', fontSize: 12, color: '#6b6860' }}>
                        <strong style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.3px' }}>Serviços considerados no cálculo:</strong>
                        <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                          {l.servicos.map(s => <li key={s}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
      </div>

      {/* ── Alicates vindos do fluxo de solicitações (só leitura) ── */}
      {fluxoDoMes.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px' }}>Alicates pelo fluxo de solicitações — {mes.split('-').reverse().join('/')}</h3>
          <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 10px' }}>Já contam no painel acima. Para receber, entregar ou excluir, use a aba <strong>Solicitações</strong>.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {fluxoDoMes.map(p => {
              const si = STATUS_ESTER[p.status]
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 9, background: '#faf9f7' }}>
                  <strong style={{ fontSize: 13, color: '#1a1a1a', minWidth: 120 }}>{p.profNome}</strong>
                  <span style={{ fontSize: 12, color: '#374151' }}>{qtdDoPedido(p)} alicate(s)</span>
                  {dataDoPedido(p) && <span style={{ fontSize: 12, color: '#9ca3af' }}>{dataDoPedido(p)}</span>}
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: si.bg, color: si.cor }}>{si.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Lista de registros ── */}
      <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>Registros de esterilização do mês</h3>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div> : (
        items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
            Nenhum registro ainda. Clique em <strong style={{ color: COR }}>+ Registrar Esterilização</strong> para começar.
          </div>
        ) : mobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(it => {
              const pendente = !it.dataDevolucao.trim()
              return (
                <div key={it.id} className="ester-card" style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>Enviado em {it.data}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => abrirEditar(it)} style={iconBtn('#5b4fcf')}><Pencil size={13} /></button>
                      <button onClick={() => excluir(it.id)} style={iconBtn('#dc2626')}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: '#1a1a1a', marginBottom: 6 }}>{it.profissional}</div>
                  <div style={{ fontSize: 12.5, color: '#374151' }}>Quantidade de material: <strong>{it.quantidade || '—'}</strong></div>
                  {it.observacao && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>{it.observacao}</div>}
                  <div style={{ marginTop: 10, padding: '8px 10px', background: pendente ? '#fef2f2' : '#f0fdf4', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: pendente ? '#dc2626' : '#16a34a' }}>{pendente ? 'PENDENTE' : `✓ DEVOLVIDO ${it.dataDevolucao}`}</span>
                    {pendente
                      ? <button onClick={() => marcarDevolvido(it.id)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Marcar devolvido</button>
                      : <button onClick={() => reabrir(it.id)} title="Reabrir" style={iconBtn('#6b6860')}><RotateCcw size={13} /></button>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, overflowX: 'auto' }}>
            <table className="ester-table" style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Profissional', 'Quantidade', 'Enviado em', 'Situação', 'Observação', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 1 || i === 2 || i === 3 ? 'center' : 'left', padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #e8e6e0', background: '#faf9f7' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(it => {
                  const pendente = !it.dataDevolucao.trim()
                  return (
                    <tr key={it.id} style={{ borderBottom: '1px solid #f0eee8' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1a1a1a' }}>{it.profissional}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#374151' }}>{it.quantidade || '—'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b6860', fontSize: 12.5 }}>{it.data || '—'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {pendente
                          ? <button onClick={() => marcarDevolvido(it.id)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Pendente — marcar devolvido</button>
                          : <button onClick={() => reabrir(it.id)} title="Clique para reabrir" style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>✓ Devolvido {it.dataDevolucao}</button>}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 12.5 }}>{it.observacao || '—'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => abrirEditar(it)} style={iconBtn('#5b4fcf')}><Pencil size={13} /></button>
                        <button onClick={() => excluir(it.id)} style={iconBtn('#dc2626')}><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#1a1a1a' }}>{items.some(x => x.id === modal.id) ? 'Editar registro' : 'Registrar esterilização'}</h3>
              <button onClick={() => setModal(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>

            <Campo label="Profissional">
              <input list="ester-profs" value={modal.profissional} onChange={e => setModal({ ...modal, profissional: e.target.value })} placeholder="Selecionar ou digitar..." autoFocus style={inputSt} />
              <datalist id="ester-profs">{profsSalao.map(p => <option key={p.id} value={p.nome} />)}</datalist>
            </Campo>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Campo label="Quantidade de material">
                <input value={modal.quantidade} onChange={e => setModal({ ...modal, quantidade: e.target.value })} placeholder="Ex: 3" style={inputSt} />
              </Campo>
              <Campo label="Enviado em">
                <input type="date" value={brToIso(modal.data)} onChange={e => setModal({ ...modal, data: isoToBr(e.target.value) })} style={inputSt} />
              </Campo>
            </div>

            <Campo label="Data da devolução (deixe vazio se ainda não voltou)">
              <input type="date" value={brToIso(modal.dataDevolucao)} onChange={e => setModal({ ...modal, dataDevolucao: isoToBr(e.target.value) })} style={inputSt} />
            </Campo>

            <Campo label="Observação">
              <input value={modal.observacao} onChange={e => setModal({ ...modal, observacao: e.target.value })} placeholder="Opcional" style={inputSt} />
            </Campo>

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
