'use client'

// Coffee breaks e encontros internos — planejamento de cada evento.
//
// A tela abre no ano corrente com os 12 meses; cada evento fica guardado no mês
// da sua data. Tudo é editável e tudo pode ser acrescentado ou excluído: as
// listas do cardápio, os itens de custo, os responsáveis e o cronograma.
// Salvo em salao_config na chave demanda_coffee_breaks.

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Loader2, Save, Plus, Trash2, ArrowLeft, Printer, CalendarDays, Users, Wallet, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { getLogoSalao } from '@/lib/logoSalao'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const OBJETIVOS = ['Treinamento de equipe', 'Reunião interna', 'Evento para clientes',
  'Inauguração', 'Workshop', 'Evento com fornecedor/marca', 'Comemoração', 'Café de boas-vindas']

const PUBLICOS = ['Equipe', 'Clientes', 'Convidados', 'Fornecedores', 'Misto']

/** Faixas de orçamento por pessoa — só referência, o valor é livre. */
const FAIXAS = [
  { ate: 20, nome: 'Básico', cor: '#6b7280' },
  { ate: 30, nome: 'Bom', cor: '#0891b2' },
  { ate: 45, nome: 'Completo', cor: '#16a34a' },
  { ate: Infinity, nome: 'Premium', cor: '#7c3aed' },
]

const rid = () => Math.random().toString(36).slice(2, 9)
const num = (v: any) => parseFloat(String(v ?? '0').replace(',', '.')) || 0
const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface ItemLista { id: string; texto: string; on: boolean }
interface Grupo { id: string; titulo: string; itens: ItemLista[] }
interface Custo { id: string; item: string; qtd: string; valor: string }
interface Resp { id: string; papel: string; nome: string }
interface Etapa { id: string; hora: string; oque: string }

interface Evento {
  id: string
  nome: string
  data: string          // yyyy-mm-dd
  hora: string
  local: string
  objetivo: string
  publico: string
  pessoas: string
  duracao: string       // em horas
  orcPessoa: string
  observacoes: string
  cardapio: Grupo[]
  restricoes: Grupo[]
  apresentacao: Grupo[]
  custos: Custo[]
  responsaveis: Resp[]
  cronograma: Etapa[]
}

const g = (titulo: string, itens: string[]): Grupo =>
  ({ id: rid(), titulo, itens: itens.map(t => ({ id: rid(), texto: t, on: false })) })

const CARDAPIO_PADRAO = (): Grupo[] => [
  g('Bebidas', ['Café', 'Café com leite', 'Chá', 'Água', 'Água com gás', 'Suco', 'Refrigerante']),
  g('Salgados', ['Mini croissant', 'Mini sanduíches', 'Pão de queijo', 'Quiches', 'Folhados', 'Mini salgados']),
  g('Doces', ['Mini bolo', 'Brownie', 'Cookies', 'Mini tortinhas', 'Docinhos']),
  g('Opções leves', ['Frutas', 'Iogurte', 'Granola', 'Castanhas', 'Sanduíches leves']),
]
const RESTRICOES_PADRAO = (): Grupo[] => [
  g('Restrições alimentares', ['Vegetarianos', 'Veganos', 'Intolerância à lactose', 'Alergia a castanhas', 'Restrição ao glúten', 'Diabetes / outros cuidados']),
]
const APRESENTACAO_PADRAO = (): Grupo[] => [
  g('Montagem e apresentação', ['Bandejas', 'Suportes de alturas diferentes', 'Guardanapos', 'Xícaras', 'Copos', 'Pegadores', 'Plaquinhas identificando os alimentos', 'Flor ou elemento decorativo discreto', 'Identidade visual do salão', 'Mesa limpa e organizada']),
]
const RESP_PADRAO = (): Resp[] => ['Compra', 'Montagem', 'Café', 'Reposição', 'Limpeza', 'Encerramento']
  .map(p => ({ id: rid(), papel: p, nome: '' }))
const CRONO_PADRAO = (): Etapa[] => [
  { id: rid(), hora: '', oque: 'Início da montagem' },
  { id: rid(), hora: '', oque: 'Bebidas e alimentos preparados' },
  { id: rid(), hora: '', oque: 'Conferência geral' },
  { id: rid(), hora: '', oque: 'Mesa pronta' },
  { id: rid(), hora: '', oque: 'Chegada dos convidados' },
  { id: rid(), hora: '', oque: 'Reposição' },
  { id: rid(), hora: '', oque: 'Encerramento' },
  { id: rid(), hora: '', oque: 'Desmontagem e limpeza' },
]

function eventoNovo(ano: number, mes: number): Evento {
  return {
    id: rid(), nome: '', data: `${ano}-${String(mes).padStart(2, '0')}-01`, hora: '', local: '',
    objetivo: OBJETIVOS[0], publico: PUBLICOS[0], pessoas: '', duracao: '3', orcPessoa: '', observacoes: '',
    cardapio: CARDAPIO_PADRAO(), restricoes: RESTRICOES_PADRAO(), apresentacao: APRESENTACAO_PADRAO(),
    custos: [{ id: rid(), item: '', qtd: '', valor: '' }],
    responsaveis: RESP_PADRAO(), cronograma: CRONO_PADRAO(),
  }
}

export default function CoffeeBreaks() {
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [abertoId, setAbertoId] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Coffee breaks')

  useEffect(() => {
    fetch('/api/salon/grid?chave=demanda_coffee_breaks', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && Array.isArray(d.eventos)) setEventos(d.eventos) })
      .catch(() => { })
      .finally(() => setCarregando(false))
  }, [])

  const salvar = useCallback(async () => {
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'demanda_coffee_breaks', doc: { eventos } }),
      })
      if (r.ok) { setDirty(false); toast.success('Salvo!') } else toast.error('Não foi possível salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }, [eventos])

  const anos = useMemo(() => {
    const s = new Set<number>(eventos.map(e => Number(String(e.data).slice(0, 4))).filter(Boolean))
    s.add(hoje.getFullYear())
    return [...s].sort((a, b) => b - a)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos])

  const doMes = eventos.filter(e => String(e.data).slice(0, 7) === `${ano}-${String(mes).padStart(2, '0')}`)
  const aberto = eventos.find(e => e.id === abertoId)

  // ── Edição ───────────────────────────────────────────────────────────────
  const mudar = (id: string, campo: keyof Evento, valor: any) => {
    setEventos(l => l.map(e => e.id === id ? { ...e, [campo]: valor } : e)); setDirty(true)
  }
  function novoEvento() {
    const e = eventoNovo(ano, mes)
    setEventos(l => [...l, e]); setAbertoId(e.id); setDirty(true)
  }
  function duplicar(ev: Evento) {
    const copia: Evento = JSON.parse(JSON.stringify(ev))
    copia.id = rid(); copia.nome = `${ev.nome || 'Evento'} (cópia)`
    setEventos(l => [...l, copia]); setAbertoId(copia.id); setDirty(true)
    toast.success('Evento duplicado')
  }
  function excluirEvento(id: string) {
    if (!confirm('Excluir este evento inteiro?')) return
    setEventos(l => l.filter(e => e.id !== id)); setAbertoId(''); setDirty(true)
  }

  // Listas com checkbox (cardápio, restrições, apresentação)
  function mudarGrupos(evId: string, campo: 'cardapio' | 'restricoes' | 'apresentacao', fn: (gs: Grupo[]) => Grupo[]) {
    setEventos(l => l.map(e => e.id === evId ? { ...e, [campo]: fn(e[campo]) } : e)); setDirty(true)
  }

  if (carregando) return (
    <div style={{ padding: 46, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={21} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  const btnSalvar = (
    <button onClick={salvar} disabled={salvando || !dirty}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: dirty ? '#16a34a' : '#d7d5cf', color: '#fff', fontSize: 13, fontWeight: 800, cursor: dirty ? 'pointer' : 'default' }}>
      <Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
    </button>
  )

  // ── Totais de um evento ──────────────────────────────────────────────────
  function totais(ev: Evento) {
    const total = ev.custos.reduce((s, c) => s + num(c.qtd) * num(c.valor), 0)
    const pessoas = num(ev.pessoas)
    const porPessoa = pessoas > 0 ? total / pessoas : 0
    const orcado = pessoas * num(ev.orcPessoa)
    return { total, pessoas, porPessoa, orcado, sobra: orcado - total }
  }

  // ── Impressão ────────────────────────────────────────────────────────────
  async function imprimir(ev: Evento) {
    const t = totais(ev)
    const logo = await getLogoSalao()
    // Imprime TODAS as categorias e TODOS os itens, marcando o que foi
    // selecionado (☑) e o que não foi (☐) — vira um checklist completo para
    // usar na hora, não só o resumo do que já foi escolhido.
    const grupos = (gs: Grupo[]) => gs.filter(gr => gr.itens.length).map(gr => {
      const feitos = gr.itens.filter(i => i.on).length
      return `<div class="bloco"><h2>${esc(gr.titulo)} <span class="cnt">${feitos}/${gr.itens.length}</span></h2><ul>${gr.itens.map(i => `<li class="${i.on ? 'on' : 'off'}"><span class="bx">${i.on ? '☑' : '☐'}</span>${esc(i.texto)}</li>`).join('')}</ul></div>`
    }).join('')

    const custos = ev.custos.filter(c => c.item.trim() || num(c.valor) > 0 || num(c.qtd) > 0)
    const tabCustos = custos.length ? `
      <div class="bloco"><h2>Controle de custo</h2>
      <table><thead><tr><th>Item</th><th class="r">Qtd</th><th class="r">Valor un.</th><th class="r">Total</th></tr></thead>
      <tbody>${custos.map(c => `<tr><td>${esc(c.item) || '—'}</td><td class="r">${esc(c.qtd) || '—'}</td><td class="r">${num(c.valor) ? moeda(num(c.valor)) : '—'}</td><td class="r"><b>${moeda(num(c.qtd) * num(c.valor))}</b></td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="3"><b>TOTAL</b></td><td class="r"><b>${moeda(t.total)}</b></td></tr>
      ${t.pessoas > 0 ? `<tr><td colspan="3">Custo por pessoa (${t.pessoas} ${t.pessoas === 1 ? 'pessoa' : 'pessoas'})</td><td class="r"><b>${moeda(t.porPessoa)}</b></td></tr>` : ''}
      ${t.orcado > 0 ? `<tr><td colspan="3">Orçado (${moeda(num(ev.orcPessoa))} × ${t.pessoas})</td><td class="r"><b>${moeda(t.orcado)}</b></td></tr><tr><td colspan="3">${t.sobra >= 0 ? 'Sobra do orçamento' : 'Passou do orçamento'}</td><td class="r"><b style="color:${t.sobra >= 0 ? '#15803d' : '#b91c1c'}">${moeda(Math.abs(t.sobra))}</b></td></tr>` : ''}</tfoot>
      </table></div>` : ''

    // Quanto comprar — só quando há pessoas para calcular
    const horas = num(ev.duracao) || 3
    const tabCompra = t.pessoas > 0 ? `
      <div class="bloco"><h2>Quanto comprar — ${t.pessoas} pessoas em ${horas}h</h2>
      <table><tbody>
        <tr><td>Salgados</td><td class="r"><b>${Math.round(t.pessoas * 5)} a ${Math.round(t.pessoas * 7)} un.</b></td></tr>
        <tr><td>Doces</td><td class="r"><b>${t.pessoas * 2} a ${t.pessoas * 3} un.</b></td></tr>
        <tr><td>Frutas</td><td class="r"><b>${t.pessoas} porções</b></td></tr>
        <tr><td>Bebidas</td><td class="r"><b>${(t.pessoas * 0.5).toFixed(1)} a ${(t.pessoas * 0.7).toFixed(1)} L</b></td></tr>
        <tr><td>Café</td><td class="r"><b>${t.pessoas * 2} a ${t.pessoas * 3} xícaras</b></td></tr>
      </tbody></table></div>` : ''

    const resp = ev.responsaveis.filter(r => r.papel.trim())
    const tabResp = resp.length ? `
      <div class="bloco"><h2>Quem cuida da operação</h2>
      <table><tbody>${resp.map(r => `<tr><td style="width:42%">${esc(r.papel)}</td><td><b>${esc(r.nome) || '_______________'}</b></td></tr>`).join('')}</tbody></table></div>` : ''

    const crono = ev.cronograma.filter(c => c.hora.trim() || c.oque.trim())
    const tabCrono = crono.length ? `
      <div class="bloco"><h2>Cronograma</h2>
      <table><tbody>${crono.map(c => `<tr><td style="width:70px"><b>${esc(c.hora) || '—'}</b></td><td>${esc(c.oque)}</td></tr>`).join('')}</tbody></table></div>` : ''

    const css = `@page{size:A4 portrait;margin:13mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a2e}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #5b4fcf;padding-bottom:9px;margin-bottom:14px}
.brand{font-size:22px;font-weight:900;color:#5b4fcf;letter-spacing:1px}
.logo{max-height:56px;max-width:200px;object-fit:contain}
.tt{text-align:right;font-size:10px;color:#666}
.tt strong{font-size:14px;color:#1a1a2e;display:block}
.chips{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}
.chip{background:#f0eefb;border:1px solid #ddd6f5;border-radius:20px;padding:5px 12px;font-size:10px}
.chip b{color:#5b4fcf}
.kpis{display:flex;gap:9px;margin-bottom:15px}
.kpi{flex:1;border:1px solid #e8e6e0;border-radius:9px;padding:9px 12px}
.kpi span{display:block;font-size:8.5px;color:#888;text-transform:uppercase;letter-spacing:.6px;font-weight:700}
.kpi b{font-size:16px;color:#1a1a2e}
.cols{display:flex;gap:16px;align-items:flex-start}
.col{flex:1}
.bloco{margin-bottom:13px;break-inside:avoid}
h2{font-size:11.5px;color:#5b4fcf;border-bottom:1px solid #e5e3de;padding-bottom:4px;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px;display:flex;justify-content:space-between;align-items:baseline}
.cnt{font-size:9px;color:#a8a49d;font-weight:400;letter-spacing:0}
ul{list-style:none}
li{padding:2.5px 0;font-size:10.5px;display:flex;align-items:flex-start;gap:6px}
.bx{font-size:12px;line-height:1.15;flex-shrink:0}
li.on{color:#15803d;font-weight:600}
li.on .bx{color:#16a34a}
li.off{color:#8a8680}
li.off .bx{color:#c9c5be}
table{width:100%;border-collapse:collapse;font-size:10px}
th{background:#5b4fcf;color:#fff;text-align:left;padding:6px 8px;font-size:9.5px}
td{padding:5px 8px;border-bottom:1px solid #eee}
tbody tr:nth-child(even) td{background:#faf9ff}
tfoot td{border-top:2px solid #5b4fcf;background:#f0eefb;padding:7px 8px}
.r{text-align:right}
.obs{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:9px 12px;font-size:10.5px;margin-top:4px}
.rodape{margin-top:16px;border-top:1px solid #eee;padding-top:7px;font-size:8.5px;color:#999;text-align:center}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`

    const dataFmt = ev.data ? ev.data.split('-').reverse().join('/') : '—'
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(ev.nome || 'Coffee break')}</title><style>${css}</style></head><body>
<div class="hd">${logo ? `<img src="${logo}" class="logo"/>` : `<div class="brand">NODRI</div>`}
<div class="tt"><strong>${esc(ev.nome || 'Coffee break')}</strong>${esc(ev.objetivo)} · ${dataFmt}${ev.hora ? ` às ${esc(ev.hora)}` : ''}</div></div>

<div class="chips">
  ${ev.local ? `<span class="chip"><b>${esc(ev.local)}</b></span>` : ''}
  <span class="chip"><b>${esc(ev.objetivo)}</b></span>
  <span class="chip">Público: <b>${esc(ev.publico)}</b></span>
  ${ev.duracao ? `<span class="chip">Duração: <b>${esc(ev.duracao)}h</b></span>` : ''}
</div>

<div class="kpis">
  <div class="kpi"><span>Pessoas</span><b>${t.pessoas || '—'}</b></div>
  <div class="kpi"><span>Orçamento por pessoa</span><b>${num(ev.orcPessoa) ? moeda(num(ev.orcPessoa)) : '—'}</b></div>
  <div class="kpi"><span>Custo total</span><b>${moeda(t.total)}</b></div>
  <div class="kpi"><span>Custo por pessoa</span><b>${t.porPessoa ? moeda(t.porPessoa) : '—'}</b></div>
</div>

<div class="cols">
  <div class="col">${grupos(ev.cardapio)}${grupos(ev.restricoes)}${tabCompra}</div>
  <div class="col">${grupos(ev.apresentacao)}${tabResp}${tabCrono}</div>
</div>
${tabCustos}
${ev.observacoes ? `<div class="bloco"><h2>Observações</h2><div class="obs">${esc(ev.observacoes).replace(/\n/g, '<br>')}</div></div>` : ''}
<div class="rodape">Gerado em ${new Date().toLocaleDateString('pt-BR')} · Coffee breaks e encontros internos</div>
<script>window.onload=function(){window.print()}<\/script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return
    w.document.write(html); w.document.close(); w.focus()
  }

  // ═══ LISTA DE EVENTOS ═════════════════════════════════════════════════════
  if (!aberto) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Coffee breaks e encontros internos</h2>
          <p style={{ fontSize: 12, color: '#6b6860', margin: '2px 0 0' }}>
            {doMes.length ? `${doMes.length} ${doMes.length === 1 ? 'evento' : 'eventos'} em ${MESES[mes - 1]}` : `Nenhum evento em ${MESES[mes - 1]}`}
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <select value={mes} onChange={e => setMes(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 9, border: '1.5px solid #e0ddd8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={ano} onChange={e => setAno(Number(e.target.value))}
          style={{ padding: '8px 12px', borderRadius: 9, border: '1.5px solid #e0ddd8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={novoEvento}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
          <Plus size={15} /> Novo evento
        </button>
        {btnSalvar}
      </div>

      {doMes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '44px 20px', background: '#fff', border: '1px dashed #e0ddd8', borderRadius: 14 }}>
          <CalendarDays size={26} style={{ color: '#d7d5cf', display: 'inline' }} />
          <p style={{ color: '#8a8680', fontSize: 13.5, fontWeight: 700, margin: '8px 0 0' }}>Nenhum evento em {MESES[mes - 1]} de {ano}.</p>
          <p style={{ color: '#a8a49d', fontSize: 12, margin: '4px 0 0' }}>Clique em “Novo evento” para planejar o próximo.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 11 }}>
          {doMes.map(ev => {
            const t = totais(ev)
            const faixa = FAIXAS.find(f => num(ev.orcPessoa) <= f.ate)!
            return (
              <div key={ev.id} onClick={() => setAbertoId(ev.id)}
                style={{ background: '#fff', border: '1px solid #eae8e3', borderRadius: 13, padding: '13px 15px', cursor: 'pointer', borderTop: '3px solid #5b4fcf' }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#1a1a1a', marginBottom: 2 }}>{ev.nome || 'Evento sem nome'}</div>
                <div style={{ fontSize: 11.5, color: '#8a8680', fontWeight: 700, marginBottom: 9 }}>
                  {ev.objetivo} · {ev.data ? ev.data.split('-').reverse().join('/') : '—'}{ev.hora ? ` às ${ev.hora}` : ''}
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11.5, color: '#4b5563', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Users size={12} /> {t.pessoas || '—'} pessoas
                  </span>
                  <span style={{ fontSize: 11.5, color: '#4b5563', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Wallet size={12} /> {moeda(t.total)}
                  </span>
                  {num(ev.orcPessoa) > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: faixa.cor, borderRadius: 99, padding: '2px 9px' }}>{faixa.nome}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ═══ FORMULÁRIO DO EVENTO ═════════════════════════════════════════════════
  const ev = aberto
  const t = totais(ev)
  const pessoas = t.pessoas
  const horas = num(ev.duracao) || 3
  const faixa = FAIXAS.find(f => num(ev.orcPessoa) <= f.ate)!

  const campo: CSSProperties = { padding: '8px 11px', borderRadius: 9, border: '1.5px solid #e0ddd8', fontSize: 13, width: '100%', background: '#fff' }
  const rotulo: CSSProperties = { fontSize: 10, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 4 }

  /** Lista com checkbox: acrescentar, marcar e excluir. */
  function Lista(campoNome: 'cardapio' | 'restricoes' | 'apresentacao') {
    return (
      <>
        {ev[campoNome].map(gr => (
          <div key={gr.id} style={{ background: '#fff', border: '1px solid #eae8e3', borderRadius: 12, padding: 13, marginBottom: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input value={gr.titulo}
                onChange={e => mudarGrupos(ev.id, campoNome, gs => gs.map(x => x.id === gr.id ? { ...x, titulo: e.target.value } : x))}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12, fontWeight: 900, letterSpacing: '.4px', color: '#1a1a1a' }} />
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#a8a49d' }}>{gr.itens.filter(i => i.on).length}/{gr.itens.length}</span>
              <button onClick={() => { if (confirm('Excluir esta categoria inteira?')) mudarGrupos(ev.id, campoNome, gs => gs.filter(x => x.id !== gr.id)) }}
                style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 2 }}><Trash2 size={12} /></button>
            </div>
            {gr.itens.map(it => (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: '1px solid #f7f6f3' }}>
                <input type="checkbox" checked={it.on}
                  onChange={e => mudarGrupos(ev.id, campoNome, gs => gs.map(x => x.id === gr.id ? { ...x, itens: x.itens.map(y => y.id === it.id ? { ...y, on: e.target.checked } : y) } : x))}
                  style={{ width: 15, height: 15, accentColor: '#16a34a', cursor: 'pointer', flexShrink: 0 }} />
                <input value={it.texto}
                  onChange={e => mudarGrupos(ev.id, campoNome, gs => gs.map(x => x.id === gr.id ? { ...x, itens: x.itens.map(y => y.id === it.id ? { ...y, texto: e.target.value } : y) } : x))}
                  placeholder="Item…"
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: it.on ? '#15803d' : '#374151', fontWeight: it.on ? 700 : 500 }} />
                <button onClick={() => mudarGrupos(ev.id, campoNome, gs => gs.map(x => x.id === gr.id ? { ...x, itens: x.itens.filter(y => y.id !== it.id) } : x))}
                  style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 2, flexShrink: 0 }}><Trash2 size={11} /></button>
              </div>
            ))}
            <button onClick={() => mudarGrupos(ev.id, campoNome, gs => gs.map(x => x.id === gr.id ? { ...x, itens: [...x.itens, { id: rid(), texto: '', on: false }] } : x))}
              style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 11.5, fontWeight: 800, padding: '5px 11px', borderRadius: 8, cursor: 'pointer' }}>
              <Plus size={11} /> Item
            </button>
          </div>
        ))}
        <button onClick={() => mudarGrupos(ev.id, campoNome, gs => [...gs, g('NOVA CATEGORIA', [])])}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px dashed #9ca3af', background: '#fff', color: '#4b5563', fontSize: 11.5, fontWeight: 800, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>
          <Plus size={12} /> Categoria
        </button>
      </>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 13 }}>
        <button onClick={() => setAbertoId('')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', color: '#6b6860', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
          <ArrowLeft size={15} /> Eventos
        </button>
        <span style={{ fontWeight: 900, fontSize: 16 }}>{ev.nome || 'Novo evento'}</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => duplicar(ev)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 10, border: '1.5px solid #e0ddd8', background: '#fff', color: '#4b5563', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
          <Copy size={13} /> Duplicar
        </button>
        <button onClick={() => imprimir(ev)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
          <Printer size={13} /> Imprimir
        </button>
        {btnSalvar}
        <button onClick={() => excluirEvento(ev.id)} title="Excluir evento"
          style={{ border: '1.5px solid #fecaca', background: '#fff', color: '#dc2626', borderRadius: 10, padding: '9px 11px', cursor: 'pointer' }}><Trash2 size={14} /></button>
      </div>

      {/* 1 e 2 — identificação, objetivo e público */}
      <div style={{ background: '#fff', border: '1px solid #eae8e3', borderRadius: 13, padding: 15, marginBottom: 11 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 11 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={rotulo}>Nome do evento</label>
            <input value={ev.nome} onChange={e => mudar(ev.id, 'nome', e.target.value)} placeholder="Ex.: Treinamento de coloração" style={{ ...campo, fontWeight: 800 }} />
          </div>
          <div>
            <label style={rotulo}>Objetivo</label>
            <select value={ev.objetivo} onChange={e => mudar(ev.id, 'objetivo', e.target.value)} style={campo}>
              {OBJETIVOS.map(o => <option key={o}>{o}</option>)}
              {!OBJETIVOS.includes(ev.objetivo) && <option>{ev.objetivo}</option>}
            </select>
          </div>
          <div>
            <label style={rotulo}>Público</label>
            <select value={ev.publico} onChange={e => mudar(ev.id, 'publico', e.target.value)} style={campo}>
              {PUBLICOS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div><label style={rotulo}>Data</label><input type="date" value={ev.data} onChange={e => mudar(ev.id, 'data', e.target.value)} style={campo} /></div>
          <div><label style={rotulo}>Horário</label><input type="time" value={ev.hora} onChange={e => mudar(ev.id, 'hora', e.target.value)} style={campo} /></div>
          <div><label style={rotulo}>Duração (horas)</label><input type="number" value={ev.duracao} onChange={e => mudar(ev.id, 'duracao', e.target.value)} style={campo} /></div>
          <div><label style={rotulo}>Nº de pessoas</label><input type="number" value={ev.pessoas} onChange={e => mudar(ev.id, 'pessoas', e.target.value)} style={campo} /></div>
          <div><label style={rotulo}>Local</label><input value={ev.local} onChange={e => mudar(ev.id, 'local', e.target.value)} placeholder="Onde vai acontecer" style={campo} /></div>
          <div>
            <label style={rotulo}>Orçamento por pessoa</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <input type="number" value={ev.orcPessoa} onChange={e => mudar(ev.id, 'orcPessoa', e.target.value)} placeholder="R$" style={campo} />
              {num(ev.orcPessoa) > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: faixa.cor, borderRadius: 99, padding: '4px 10px', whiteSpace: 'nowrap' }}>{faixa.nome}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6 — quanto comprar (calculado) */}
      {pessoas > 0 && (
        <div style={{ background: '#f8f8fc', border: '1px solid #ddd6f5', borderRadius: 13, padding: '13px 15px', marginBottom: 11 }}>
          <div style={{ fontSize: 11.5, fontWeight: 900, color: '#5b4fcf', marginBottom: 8, letterSpacing: '.4px' }}>
            QUANTO COMPRAR — sugestão para {pessoas} pessoas em {horas}h
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 9 }}>
            {[
              { l: 'Salgados', v: `${Math.round(pessoas * 5)} a ${Math.round(pessoas * 7)} un.` },
              { l: 'Doces', v: `${pessoas * 2} a ${pessoas * 3} un.` },
              { l: 'Frutas', v: `${pessoas} porções` },
              { l: 'Bebidas', v: `${(pessoas * 0.5).toFixed(1)} a ${(pessoas * 0.7).toFixed(1)} L` },
              { l: 'Café', v: `${pessoas * 2} a ${pessoas * 3} xícaras` },
            ].map(k => (
              <div key={k.l} style={{ background: '#fff', border: '1px solid #eae8e3', borderRadius: 10, padding: '9px 12px' }}>
                <div style={{ fontSize: 9.5, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px' }}>{k.l}</div>
                <div style={{ fontSize: 13.5, fontWeight: 900, color: '#1a1a1a' }}>{k.v}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10.5, color: '#8a8680', margin: '8px 0 0' }}>
            Base para 3h. Evento de manhã costuma pedir mais café e menos doce; à tarde, o contrário — ajuste conforme o horário.
          </p>
        </div>
      )}

      {/* 4 e 5 — cardápio, restrições e apresentação */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 11, marginBottom: 11 }}>
        <div>
          <Secao titulo="O que servir" />
          {Lista('cardapio')}
          <div style={{ height: 11 }} />
          <Secao titulo="Restrições alimentares" />
          {Lista('restricoes')}
        </div>
        <div>
          <Secao titulo="Apresentação e montagem" />
          {Lista('apresentacao')}
        </div>
      </div>

      {/* 7 — controle de custo */}
      <div style={{ background: '#fff', border: '1px solid #eae8e3', borderRadius: 13, padding: 15, marginBottom: 11 }}>
        <div style={{ fontSize: 11.5, fontWeight: 900, color: '#1a1a1a', marginBottom: 9, letterSpacing: '.4px' }}>CONTROLE DE CUSTO</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
            <thead>
              <tr style={{ background: '#fbfbfa' }}>
                {['Item', 'Qtd', 'Valor un.', 'Total', ''].map((h, i) => (
                  <th key={h + i} style={{ padding: '8px 9px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '1px solid #eae8e3' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ev.custos.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f7f6f3' }}>
                  <td style={{ padding: '5px 6px' }}>
                    <input value={c.item} onChange={e => mudar(ev.id, 'custos', ev.custos.map(x => x.id === c.id ? { ...x, item: e.target.value } : x))}
                      placeholder="Ex.: Pão de queijo" style={{ ...campo, padding: '6px 9px', fontSize: 12.5 }} />
                  </td>
                  <td style={{ padding: '5px 6px', width: 90 }}>
                    <input type="number" value={c.qtd} onChange={e => mudar(ev.id, 'custos', ev.custos.map(x => x.id === c.id ? { ...x, qtd: e.target.value } : x))}
                      style={{ ...campo, padding: '6px 9px', fontSize: 12.5, textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '5px 6px', width: 110 }}>
                    <input type="number" value={c.valor} onChange={e => mudar(ev.id, 'custos', ev.custos.map(x => x.id === c.id ? { ...x, valor: e.target.value } : x))}
                      style={{ ...campo, padding: '6px 9px', fontSize: 12.5, textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '5px 9px', textAlign: 'right', fontSize: 13, fontWeight: 900, color: '#1a1a1a', whiteSpace: 'nowrap' }}>
                    {moeda(num(c.qtd) * num(c.valor))}
                  </td>
                  <td style={{ padding: '5px 6px', width: 34 }}>
                    <button onClick={() => mudar(ev.id, 'custos', ev.custos.filter(x => x.id !== c.id))}
                      style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 3 }}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={() => mudar(ev.id, 'custos', [...ev.custos, { id: rid(), item: '', qtd: '', valor: '' }])}
          style={{ marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 11.5, fontWeight: 800, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>
          <Plus size={11} /> Acrescentar item
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 9, marginTop: 12 }}>
          <Kpi rotulo="Custo total" valor={moeda(t.total)} cor="#1a1a1a" />
          <Kpi rotulo="Custo por pessoa" valor={t.porPessoa ? moeda(t.porPessoa) : '—'} cor="#0891b2" />
          <Kpi rotulo="Orçado" valor={t.orcado ? moeda(t.orcado) : '—'} cor="#8a8680" />
          <Kpi rotulo={t.sobra >= 0 ? 'Sobra do orçamento' : 'Passou do orçamento'}
            valor={t.orcado ? moeda(Math.abs(t.sobra)) : '—'} cor={t.sobra >= 0 ? '#15803d' : '#dc2626'} />
        </div>
      </div>

      {/* 8 e 9 — responsáveis e cronograma */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 11, marginBottom: 11 }}>
        <div style={{ background: '#fff', border: '1px solid #eae8e3', borderRadius: 13, padding: 15 }}>
          <div style={{ fontSize: 11.5, fontWeight: 900, color: '#1a1a1a', marginBottom: 9, letterSpacing: '.4px' }}>QUEM CUIDA DA OPERAÇÃO</div>
          {ev.responsaveis.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0', borderTop: '1px solid #f7f6f3' }}>
              <input value={r.papel} onChange={e => mudar(ev.id, 'responsaveis', ev.responsaveis.map(x => x.id === r.id ? { ...x, papel: e.target.value } : x))}
                placeholder="Função" style={{ ...campo, padding: '6px 9px', fontSize: 12, width: '42%', fontWeight: 700 }} />
              <input value={r.nome} onChange={e => mudar(ev.id, 'responsaveis', ev.responsaveis.map(x => x.id === r.id ? { ...x, nome: e.target.value } : x))}
                placeholder="Quem?" style={{ ...campo, padding: '6px 9px', fontSize: 12, flex: 1 }} />
              <button onClick={() => mudar(ev.id, 'responsaveis', ev.responsaveis.filter(x => x.id !== r.id))}
                style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 2 }}><Trash2 size={11} /></button>
            </div>
          ))}
          <button onClick={() => mudar(ev.id, 'responsaveis', [...ev.responsaveis, { id: rid(), papel: '', nome: '' }])}
            style={{ marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 11.5, fontWeight: 800, padding: '5px 11px', borderRadius: 8, cursor: 'pointer' }}>
            <Plus size={11} /> Responsável
          </button>
          <p style={{ fontSize: 10.5, color: '#a8a49d', margin: '9px 0 0', lineHeight: 1.45 }}>
            Quem organiza o evento não deve ficar preso à reposição da mesa — separe as funções.
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #eae8e3', borderRadius: 13, padding: 15 }}>
          <div style={{ fontSize: 11.5, fontWeight: 900, color: '#1a1a1a', marginBottom: 9, letterSpacing: '.4px' }}>CRONOGRAMA</div>
          {ev.cronograma.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0', borderTop: '1px solid #f7f6f3' }}>
              <input type="time" value={c.hora} onChange={e => mudar(ev.id, 'cronograma', ev.cronograma.map(x => x.id === c.id ? { ...x, hora: e.target.value } : x))}
                style={{ ...campo, padding: '6px 8px', fontSize: 12, width: 108, fontWeight: 800 }} />
              <input value={c.oque} onChange={e => mudar(ev.id, 'cronograma', ev.cronograma.map(x => x.id === c.id ? { ...x, oque: e.target.value } : x))}
                placeholder="O que acontece" style={{ ...campo, padding: '6px 9px', fontSize: 12, flex: 1 }} />
              <button onClick={() => mudar(ev.id, 'cronograma', ev.cronograma.filter(x => x.id !== c.id))}
                style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 2 }}><Trash2 size={11} /></button>
            </div>
          ))}
          <button onClick={() => mudar(ev.id, 'cronograma', [...ev.cronograma, { id: rid(), hora: '', oque: '' }])}
            style={{ marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 11.5, fontWeight: 800, padding: '5px 11px', borderRadius: 8, cursor: 'pointer' }}>
            <Plus size={11} /> Etapa
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #eae8e3', borderRadius: 13, padding: 15 }}>
        <label style={rotulo}>Observações</label>
        <textarea value={ev.observacoes} onChange={e => mudar(ev.id, 'observacoes', e.target.value)} rows={3}
          placeholder="Combinados, contatos de fornecedor, o que deu certo ou errado…"
          style={{ ...campo, resize: 'vertical', lineHeight: 1.5 }} />
      </div>
    </div>
  )
}

function Secao({ titulo }: { titulo: string }) {
  return <div style={{ fontSize: 11.5, fontWeight: 900, color: '#1a1a1a', marginBottom: 8, letterSpacing: '.4px' }}>{titulo.toUpperCase()}</div>
}

function Kpi({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) {
  return (
    <div style={{ background: '#fbfbfa', border: '1px solid #eae8e3', borderRadius: 10, padding: '9px 12px' }}>
      <div style={{ fontSize: 9.5, color: '#8a8680', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px' }}>{rotulo}</div>
      <div style={{ fontSize: 15.5, fontWeight: 900, color: cor, letterSpacing: '-.3px' }}>{valor}</div>
    </div>
  )
}
