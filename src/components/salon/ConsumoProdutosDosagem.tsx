'use client'

// ─────────────────────────────────────────────────────────────────────────────
// CONSUMO DE PRODUTOS — DOSAGEM
//
// Registro de dosagem por atendimento. Cada linha é um serviço executado:
//   Data (automática) · Cliente · Profissional (PJ) · Serviço (dos cadastrados)
//   · Fórmula (com componentes: tinta, oxidante… e quantidade de cada)
//   · Quantidade (valor + unidade ml/g/kg…) · Dosadora (CLT).
//
// - Profissional  → puxa dos profissionais PJ (vínculo MEI / com CNPJ).
// - Serviço       → puxa dos serviços cadastrados (/api/servicos); aceita manual.
// - Dosadora      → puxa dos profissionais CLT.
// - Mês/ano       → seletor no topo; cada mês tem sua própria folha (chave mensal).
// Salva em salao_config via /api/salon/grid (uma chave por mês).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Plus, Trash2, RefreshCw } from 'lucide-react'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { getLogoSalao } from '@/lib/logoSalao'

interface Componente { id: string; nome: string; qtd: string; un: string }
interface Linha {
  id: string
  data: string          // yyyy-mm-dd
  cliente: string
  profissional: string
  servico: string
  formula: string        // nome da fórmula (ex.: "Fórmula X")
  componentes: Componente[]
  qtd: string
  un: string
  dosadora: string
}
interface Prof { id: string; nome_completo?: string; apelido?: string; ativo?: boolean; is_departamento?: boolean; vinculo?: string; cnpj?: string }
interface Servico { id: string; nome: string }

const rid = () => Math.random().toString(36).slice(2, 8)
const norm = (s: string) => (s || '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
const UNIDADES = ['ml', 'g', 'kg', 'mg', 'L', 'un', 'gotas']
const nomeProf = (p: Prof) => (p.apelido || p.nome_completo || '').trim()
const ehPJ = (p: Prof) => !p.is_departamento && p.ativo !== false && (String(p.vinculo || '').toUpperCase() === 'MEI' || !!String(p.cnpj || '').trim())
const ehCLT = (p: Prof) => !p.is_departamento && p.ativo !== false && String(p.vinculo || '').toUpperCase().includes('CLT')

// Mês atual no formato yyyy-MM (para o seletor <input type="month">)
function mesAtual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function rotuloMes(ym: string): string {
  const [a, m] = ym.split('-').map(Number)
  if (!a || !m) return ym
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
function brData(iso: string): string {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return d && m ? `${d}/${m}/${a}` : iso
}

const linhaVazia = (): Linha => ({
  id: rid(), data: hojeISO(), cliente: '', profissional: '', servico: '',
  formula: '', componentes: [], qtd: '', un: 'g', dosadora: '',
})

export default function ConsumoProdutosDosagem() {
  const [mes, setMes] = useState(mesAtual())
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [profs, setProfs] = useState<Prof[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Consumo de Produtos — Dosagem')

  const chave = `consumo_dosagem_${mes}`

  // Profissionais e serviços (não dependem do mês)
  useEffect(() => {
    fetch('/api/profissionais?ativo=true', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((l: Prof[]) => setProfs(Array.isArray(l) ? l : []))
      .catch(() => setProfs([]))
    fetch('/api/servicos')
      .then(r => r.ok ? r.json() : [])
      .then((l: Servico[]) => setServicos(Array.isArray(l) ? l : []))
      .catch(() => setServicos([]))
  }, [])

  // Folha do mês selecionado
  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const salvo = await fetch(`/api/salon/grid?chave=${chave}`).then(r => r.ok ? r.json() : null)
      const arr = salvo && Array.isArray(salvo.linhas) ? salvo.linhas : []
      // normaliza para garantir todos os campos
      setLinhas(arr.map((l: any) => ({
        id: String(l.id || rid()),
        data: l.data || hojeISO(),
        cliente: l.cliente || '',
        profissional: l.profissional || '',
        servico: l.servico || '',
        formula: l.formula || '',
        componentes: Array.isArray(l.componentes) ? l.componentes.map((c: any) => ({ id: String(c.id || rid()), nome: c.nome || '', qtd: c.qtd || '', un: c.un || 'g' })) : [],
        qtd: l.qtd || '',
        un: l.un || 'g',
        dosadora: l.dosadora || '',
      })))
    } catch { setLinhas([]) }
    setDirty(false); setLoading(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  const profsPJ = profs.filter(ehPJ)
  const profsCLT = profs.filter(ehCLT)

  function updLinha(id: string, patch: Partial<Linha>) {
    setLinhas(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l)); setDirty(true)
  }
  function addLinha() { setLinhas(ls => [...ls, linhaVazia()]); setDirty(true) }
  function delLinha(id: string) { setLinhas(ls => ls.filter(l => l.id !== id)); setDirty(true) }
  function addComp(linhaId: string) {
    setLinhas(ls => ls.map(l => l.id === linhaId ? { ...l, componentes: [...l.componentes, { id: rid(), nome: '', qtd: '', un: 'ml' }] } : l)); setDirty(true)
  }
  function updComp(linhaId: string, compId: string, patch: Partial<Componente>) {
    setLinhas(ls => ls.map(l => l.id === linhaId ? { ...l, componentes: l.componentes.map(c => c.id === compId ? { ...c, ...patch } : c) } : l)); setDirty(true)
  }
  function delComp(linhaId: string, compId: string) {
    setLinhas(ls => ls.map(l => l.id === linhaId ? { ...l, componentes: l.componentes.filter(c => c.id !== compId) } : l)); setDirty(true)
  }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, doc: { linhas } }) })
      if (res.ok) { toast.success('Salvo!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  async function imprimir() {
    const logo = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const linhasHtml = linhas.map(l => {
      const comps = l.componentes.filter(c => c.nome || c.qtd).map(c => `${esc(c.nome)} ${esc(c.qtd)}${esc(c.un)}`).join('<br>')
      const formula = [esc(l.formula), comps].filter(Boolean).join('<br>')
      return `<tr>
        <td>${esc(brData(l.data))}</td>
        <td>${esc(l.cliente)}</td>
        <td>${esc(l.profissional)}</td>
        <td>${esc(l.servico)}</td>
        <td>${formula || '—'}</td>
        <td class="r">${esc(l.qtd)}${esc(l.un)}</td>
        <td>${esc(l.dosadora)}</td>
      </tr>`
    }).join('')
    const cab = logo ? `<img src="${logo}" class="logo"/>` : `<div class="brand">NODRI</div>`
    const css = `@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hd{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #5b4fcf;padding-bottom:8px;margin-bottom:6px}
.logo{max-height:52px;max-width:180px;object-fit:contain}.brand{font-size:22px;font-weight:900;color:#5b4fcf}
h1{text-align:center;font-size:17px;font-weight:900;margin:8px 0 12px;text-transform:uppercase}
table{width:100%;border-collapse:collapse;font-size:10px}
th{background:#5b4fcf;color:#fff;padding:6px 7px;text-align:left;font-size:9.5px;text-transform:uppercase}
td{border:1px solid #ddd;padding:5px 7px;vertical-align:top}.r{text-align:right}
tr:nth-child(even) td{background:#f7f6fd}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Consumo de Produtos — Dosagem</title><style>${css}</style></head><body>
<div class="hd">${cab}<div style="font-size:10px;color:#777;text-align:right"><b>Consumo de Produtos — Dosagem</b><br>${esc(rotuloMes(mes))}</div></div>
<h1>Consumo de Produtos — Dosagem · ${esc(rotuloMes(mes))}</h1>
<table><thead><tr><th>Data</th><th>Cliente</th><th>Profissional</th><th>Serviço</th><th>Fórmula</th><th>Qtd</th><th>Dosadora</th></tr></thead><tbody>${linhasHtml || '<tr><td colspan="7" style="text-align:center;color:#999">Sem registros</td></tr>'}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=1100,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  // estilos reaproveitados
  const thSt: React.CSSProperties = { background: '#5b4fcf', color: '#fff', padding: '9px 10px', fontSize: 11.5, fontWeight: 800, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '.3px', whiteSpace: 'nowrap' }
  const tdSt: React.CSSProperties = { border: '1px solid #ece9f6', padding: 7, verticalAlign: 'top' }
  const inSt: React.CSSProperties = { width: '100%', border: '1px solid #e0ddd8', borderRadius: 8, padding: '7px 8px', fontSize: 13, outline: 'none', background: '#fff' }

  function SelectProf({ valor, lista, onChange, placeholder }: { valor: string; lista: Prof[]; onChange: (v: string) => void; placeholder: string }) {
    const nomes = lista.map(nomeProf).filter(Boolean)
    const faltando = valor && !nomes.includes(valor)
    return (
      <select value={valor} onChange={e => onChange(e.target.value)} style={{ ...inSt, cursor: 'pointer' }}>
        <option value="">{placeholder}</option>
        {faltando && <option value={valor}>{valor}</option>}
        {nomes.map((n, i) => <option key={i} value={n}>{n}</option>)}
      </select>
    )
  }

  return (
    <div>
      {/* Barra: mês + ações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Mês:&nbsp;
          <input type="month" value={mes} onChange={e => setMes(e.target.value || mesAtual())}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e0ddd8', fontSize: 13 }} />
        </label>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#5b4fcf', background: '#f0eefb', padding: '5px 12px', borderRadius: 20 }}>{linhas.length} registro(s)</span>
        <div style={{ flex: 1 }} />
        <button onClick={carregar} title="Recarregar" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><RefreshCw size={14} /></button>
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir A4</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 800, color: '#5b4fcf', margin: '0 0 4px' }}>Consumo de Produtos — Dosagem</h3>
      <p style={{ fontSize: 12, color: '#6b6860', marginBottom: 12 }}>
        A <strong>data</strong> vem automática (editável). <strong>Profissional</strong> puxa dos PJ e <strong>Dosadora</strong> dos CLT cadastrados.
        O <strong>Serviço</strong> puxa dos serviços cadastrados (pode digitar manual). Na <strong>Fórmula</strong>, use <em>+ produto</em> para lançar tinta, oxidante etc. com a quantidade de cada.
      </p>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> : (
        <>
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #ece9f6' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1120, background: '#fff' }}>
              <thead>
                <tr>
                  <th style={{ ...thSt, minWidth: 140 }}>Data</th>
                  <th style={{ ...thSt, minWidth: 130 }}>Cliente</th>
                  <th style={{ ...thSt, minWidth: 160 }}>Profissional</th>
                  <th style={{ ...thSt, minWidth: 160 }}>Serviço</th>
                  <th style={{ ...thSt, minWidth: 280 }}>Fórmula</th>
                  <th style={{ ...thSt, minWidth: 150 }}>Quantidade</th>
                  <th style={{ ...thSt, minWidth: 150 }}>Dosadora</th>
                  <th style={{ ...thSt, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 && (
                  <tr><td colSpan={8} style={{ ...tdSt, textAlign: 'center', color: '#9ca3af', padding: 24 }}>Nenhum registro neste mês. Clique em <strong>+ Adicionar registro</strong>.</td></tr>
                )}
                {linhas.map(l => (
                  <tr key={l.id}>
                    <td style={tdSt}>
                      <input type="date" value={l.data} onChange={e => updLinha(l.id, { data: e.target.value })} style={inSt} />
                    </td>
                    <td style={tdSt}>
                      <input value={l.cliente} onChange={e => updLinha(l.id, { cliente: e.target.value })} placeholder="Cliente" style={inSt} />
                    </td>
                    <td style={tdSt}>
                      {SelectProf({ valor: l.profissional, lista: profsPJ, onChange: v => updLinha(l.id, { profissional: v }), placeholder: 'Selecione (PJ)…' })}
                    </td>
                    <td style={tdSt}>
                      <input list="dosagem-servicos" value={l.servico} onChange={e => updLinha(l.id, { servico: e.target.value })} placeholder="Serviço" style={inSt} />
                    </td>
                    <td style={tdSt}>
                      <input value={l.formula} onChange={e => updLinha(l.id, { formula: e.target.value })} placeholder="Nome da fórmula (opcional)" style={{ ...inSt, marginBottom: 6 }} />
                      {l.componentes.map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
                          <input value={c.nome} onChange={e => updComp(l.id, c.id, { nome: e.target.value })} placeholder="Produto (tinta, oxidante…)" style={{ ...inSt, flex: 1, padding: '5px 7px', fontSize: 12 }} />
                          <input value={c.qtd} onChange={e => updComp(l.id, c.id, { qtd: e.target.value })} placeholder="Qtd" style={{ ...inSt, width: 54, padding: '5px 6px', fontSize: 12, textAlign: 'right' }} />
                          <input list="dosagem-unidades" value={c.un} onChange={e => updComp(l.id, c.id, { un: e.target.value })} style={{ ...inSt, width: 52, padding: '5px 5px', fontSize: 12 }} />
                          <button onClick={() => delComp(l.id, c.id)} title="Remover produto" style={{ border: 'none', background: 'transparent', color: '#d4cfc7', cursor: 'pointer', padding: 2 }} onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')} onMouseLeave={e => (e.currentTarget.style.color = '#d4cfc7')}><Trash2 size={13} /></button>
                        </div>
                      ))}
                      <button onClick={() => addComp(l.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: '1px dashed #c9c4f0', background: '#faf9ff', color: '#5b4fcf', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}><Plus size={12} /> produto</button>
                    </td>
                    <td style={tdSt}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input value={l.qtd} onChange={e => updLinha(l.id, { qtd: e.target.value })} placeholder="0" style={{ ...inSt, textAlign: 'right' }} />
                        <input list="dosagem-unidades" value={l.un} onChange={e => updLinha(l.id, { un: e.target.value })} style={{ ...inSt, width: 62 }} />
                      </div>
                    </td>
                    <td style={tdSt}>
                      {SelectProf({ valor: l.dosadora, lista: profsCLT, onChange: v => updLinha(l.id, { dosadora: v }), placeholder: 'Selecione (CLT)…' })}
                    </td>
                    <td style={{ ...tdSt, textAlign: 'center' }}>
                      <button onClick={() => delLinha(l.id)} title="Excluir linha" style={{ border: 'none', background: 'transparent', color: '#d4cfc7', cursor: 'pointer', padding: 4 }} onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')} onMouseLeave={e => (e.currentTarget.style.color = '#d4cfc7')}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* datalists compartilhados */}
          <datalist id="dosagem-servicos">{servicos.map(s => <option key={s.id} value={s.nome} />)}</datalist>
          <datalist id="dosagem-unidades">{UNIDADES.map(u => <option key={u} value={u} />)}</datalist>

          <button onClick={addLinha} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '10px 18px', borderRadius: 10, border: '2px dashed #c9c4f0', background: '#faf9ff', color: '#5b4fcf', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = '#faf9ff')}>
            <Plus size={16} /> Adicionar registro
          </button>
        </>
      )}
    </div>
  )
}
