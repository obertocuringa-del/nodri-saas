'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Plus, Trash2, Pencil, X, Printer, Wallet, Send, CheckCircle2, RotateCcw, Package } from 'lucide-react'
import { useIsMobile } from '@/lib/useIsMobile'
import { getLogoSalao } from '@/lib/logoSalao'
import { parseBRLNumber } from '@/lib/kitsShared'

const COR = '#5b4fcf'

interface ItemDef { chave: string; label: string; cor: string }
const ITENS: ItemDef[] = [
  { chave: 'penteador_branco', label: 'Penteador Branco', cor: '#f5f5f4' },
  { chave: 'penteador_preto', label: 'Penteador Preto', cor: '#1a1a1a' },
  { chave: 'capa_corte', label: 'Capa de Corte', cor: '#5b4fcf' },
  { chave: 'robe', label: 'Robe', cor: '#db2777' },
  { chave: 'toalha_branca', label: 'Toalha Branca', cor: '#f5f5f4' },
  { chave: 'toalha_preta', label: 'Toalha Preta', cor: '#1a1a1a' },
]
const labelDe = (chave: string) => ITENS.find(i => i.chave === chave)?.label || chave

interface ConfigItem { precoUnitario: number; estoque: number }
type Config = Record<string, ConfigItem>
const configVazia = (): Config => Object.fromEntries(ITENS.map(i => [i.chave, { precoUnitario: 0, estoque: 0 }]))

interface Registro {
  id: string
  item: string
  data: string
  qtdEnviada: number
  qtdRecebida: number
  qtdDevolvida: number
  precoUnitario: number // snapshot do preço no momento do registro
  observacao: string
}

const rid = () => Math.random().toString(36).slice(2, 9)
function mesAtual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function hojeBR() { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` }
function brToIso(s: string) { const m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : '' }
function isoToBr(s: string) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : s }
function fmtBRL(n: number) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function EnxovaisLista() {
  const mobile = useIsMobile()
  const [mes, setMes] = useState(mesAtual())
  const [cfg, setCfg] = useState<Config>(configVazia())
  const [precosStr, setPrecosStr] = useState<Record<string, string>>({})
  const [addEstoqueStr, setAddEstoqueStr] = useState<Record<string, string>>({})
  const [salvandoCfg, setSalvandoCfg] = useState(false)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [modal, setModal] = useState<Registro | null>(null)

  const chaveMes = `enxovais_registros_${mes}`

  const carregarConfig = useCallback(async () => {
    try {
      const d = await fetch('/api/salon/grid?chave=enxovais_config').then(r => r.ok ? r.json() : null)
      const itens = d?.itens && typeof d.itens === 'object' ? d.itens : {}
      const nova = configVazia()
      for (const i of ITENS) if (itens[i.chave]) nova[i.chave] = { precoUnitario: Number(itens[i.chave].precoUnitario) || 0, estoque: Number(itens[i.chave].estoque) || 0 }
      setCfg(nova)
      setPrecosStr(Object.fromEntries(ITENS.map(i => [i.chave, nova[i.chave].precoUnitario ? String(nova[i.chave].precoUnitario).replace('.', ',') : ''])))
    } catch { /* mantém vazio */ }
  }, [])
  useEffect(() => { carregarConfig() }, [carregarConfig])

  const carregarRegistros = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chaveMes)}`).then(r => r.ok ? r.json() : null)
      setRegistros(Array.isArray(d?.registros) ? d.registros : [])
      setDirty(false)
    } catch { setRegistros([]); setDirty(false) }
    setLoading(false)
  }, [chaveMes])
  useEffect(() => { carregarRegistros() }, [carregarRegistros])

  async function salvarConfig() {
    setSalvandoCfg(true)
    try {
      const nova: Config = {}
      for (const i of ITENS) nova[i.chave] = { precoUnitario: parseBRLNumber(precosStr[i.chave] || ''), estoque: cfg[i.chave]?.estoque || 0 }
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'enxovais_config', doc: { itens: nova } }) })
      if (res.ok) { toast.success('Preços salvos!'); setCfg(nova) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvandoCfg(false)
  }

  async function adicionarEstoque(chave: string) {
    const add = Math.round(Number(addEstoqueStr[chave]) || 0)
    if (!add) return
    const nova: Config = { ...cfg, [chave]: { precoUnitario: cfg[chave]?.precoUnitario || 0, estoque: (cfg[chave]?.estoque || 0) + add } }
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'enxovais_config', doc: { itens: nova } }) })
      if (res.ok) { setCfg(nova); setAddEstoqueStr(prev => ({ ...prev, [chave]: '' })); toast.success('Estoque atualizado!') }
      else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
  }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: chaveMes, doc: { registros } }) })
      if (res.ok) { toast.success('Registros salvos!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function abrirNovo() { setModal({ id: rid(), item: ITENS[0].chave, data: hojeBR(), qtdEnviada: 0, qtdRecebida: 0, qtdDevolvida: 0, precoUnitario: cfg[ITENS[0].chave]?.precoUnitario || 0, observacao: '' }) }
  function abrirEditar(r: Registro) { setModal({ ...r }) }
  function salvarModal() {
    if (!modal) return
    if (!modal.qtdEnviada && !modal.qtdRecebida && !modal.qtdDevolvida) { toast('Informe ao menos uma quantidade', { icon: '✍️' }); return }
    const comPreco = { ...modal, precoUnitario: cfg[modal.item]?.precoUnitario || modal.precoUnitario || 0 }
    setRegistros(prev => prev.some(x => x.id === comPreco.id) ? prev.map(x => x.id === comPreco.id ? comPreco : x) : [...prev, comPreco])
    setDirty(true); setModal(null)
  }
  function excluir(id: string) {
    if (!confirm('Remover este registro?')) return
    setRegistros(prev => prev.filter(x => x.id !== id)); setDirty(true)
  }

  const totalEnviado = registros.reduce((s, r) => s + r.qtdEnviada, 0)
  const totalRecebido = registros.reduce((s, r) => s + r.qtdRecebida, 0)
  const totalDevolvido = registros.reduce((s, r) => s + r.qtdDevolvida, 0)
  const valorBruto = registros.reduce((s, r) => s + r.qtdEnviada * r.precoUnitario, 0)
  const valorDevolvido = registros.reduce((s, r) => s + r.qtdDevolvida * r.precoUnitario, 0)
  const valorLiquido = valorBruto - valorDevolvido

  const porItem = ITENS.map(i => {
    const doItem = registros.filter(r => r.item === i.chave)
    return {
      ...i,
      enviado: doItem.reduce((s, r) => s + r.qtdEnviada, 0),
      recebido: doItem.reduce((s, r) => s + r.qtdRecebida, 0),
      devolvido: doItem.reduce((s, r) => s + r.qtdDevolvida, 0),
    }
  }).filter(i => i.enviado > 0 || i.recebido > 0 || i.devolvido > 0)

  async function imprimir() {
    const logoSalao = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const periodo = mes.split('-').reverse().join('/')
    const linhasItem = porItem.map(i => `<tr><td>${esc(i.label)}</td><td class="c">${i.enviado}</td><td class="c">${i.recebido}</td><td class="c">${i.devolvido}</td></tr>`).join('')
    const linhasReg = registros.map(r => `<tr><td>${esc(r.data)}</td><td>${esc(labelDe(r.item))}</td><td class="c">${r.qtdEnviada}</td><td class="c">${r.qtdRecebida}</td><td class="c">${r.qtdDevolvida}</td><td class="c">R$ ${esc(fmtBRL(r.qtdEnviada * r.precoUnitario))}</td></tr>`).join('')
    const cab = logoSalao ? `<img src="${logoSalao}" class="logo"/>` : `<div class="brand">NODRI</div>`
    const css = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${COR};padding-bottom:10px;margin-bottom:6px}.logo{max-height:56px;max-width:200px;object-fit:contain}.brand{font-size:22px;font-weight:900;color:${COR};letter-spacing:1px}h1{text-align:center;font-size:17px;font-weight:900;margin:12px 0 2px;text-transform:uppercase}.sub{text-align:center;font-size:11px;color:#888;margin-bottom:16px}.stats{display:flex;gap:8px;margin-bottom:18px}.stat{flex:1;border:1px solid #e5e2db;border-radius:10px;padding:9px 10px;background:#faf9f7}.stat b{display:block;font-size:16px;color:${COR}}.stat span{font-size:9.5px;color:#888;text-transform:uppercase}h2{font-size:12.5px;color:${COR};margin:16px 0 6px;text-transform:uppercase;border-bottom:1.5px solid ${COR};padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-bottom:6px}th,td{border:1px solid #f0ede6;padding:6px 8px;text-align:left}th{background:#f6f4ff;color:${COR};border-bottom:2px solid ${COR};font-size:9.5px;text-transform:uppercase}td.c,th.c{text-align:center}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Enxovais — ${esc(periodo)}</title><style>${css}</style></head><body><div class="hd">${cab}<span style="font-size:10px;color:#777">${new Date().toLocaleDateString('pt-BR')}</span></div><h1>Controle de Enxovais</h1><div class="sub">${esc(periodo)}</div><div class="stats"><div class="stat"><b>${totalEnviado}</b><span>Enviados</span></div><div class="stat"><b>${totalRecebido}</b><span>Recebidos</span></div><div class="stat"><b>${totalDevolvido}</b><span>Devolvidos</span></div><div class="stat"><b>R$ ${fmtBRL(valorLiquido)}</b><span>Total líquido</span></div></div><h2>Por item</h2><table><thead><tr><th>Item</th><th class="c">Enviado</th><th class="c">Recebido</th><th class="c">Devolvido</th></tr></thead><tbody>${linhasItem}</tbody></table><h2>Registros do mês</h2><table><thead><tr><th>Data</th><th>Item</th><th class="c">Enviado</th><th class="c">Recebido</th><th class="c">Devolvido</th><th class="c">Valor</th></tr></thead><tbody>${linhasReg}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=1000,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div>
      <style>{`
        .enx-table tbody tr:nth-child(even) { background:#fbfbfa; }
        .enx-table tbody tr:hover { background:#f5f4fd; }
        .enx-dot { display:inline-block; width:10px; height:10px; border-radius:50%; border:1px solid #d0cdc7; margin-right:6px; vertical-align:middle; }
      `}</style>

      {/* ── Preço por lavagem ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a1a', margin: '0 0 12px' }}>💲 Valor unitário por lavagem</h3>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(6, 1fr)', gap: 10, marginBottom: 12 }}>
          {ITENS.map(i => (
            <div key={i.chave}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 700, color: '#6b6860', marginBottom: 5 }}><span className="enx-dot" style={{ background: i.cor }} />{i.label}</label>
              <input value={precosStr[i.chave] || ''} onChange={e => setPrecosStr(prev => ({ ...prev, [i.chave]: e.target.value }))} inputMode="decimal" placeholder="0,00" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />
            </div>
          ))}
        </div>
        <button onClick={salvarConfig} disabled={salvandoCfg} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 9, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvandoCfg ? '...' : <><Save size={14} /> Salvar preços</>}</button>
      </div>

      {/* ── Estoque ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a1a', margin: '0 0 12px' }}><Package size={15} style={{ verticalAlign: -2, marginRight: 5 }} />Estoque</h3>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: 10 }}>
          {ITENS.map(i => (
            <div key={i.chave} style={{ background: '#faf9f7', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#6b6860', display: 'flex', alignItems: 'center' }}><span className="enx-dot" style={{ background: i.cor }} />{i.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a1a' }}>{cfg[i.chave]?.estoque || 0}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input value={addEstoqueStr[i.chave] || ''} onChange={e => setAddEstoqueStr(prev => ({ ...prev, [i.chave]: e.target.value }))} placeholder="+Qtd" style={{ width: 56, padding: '6px 8px', borderRadius: 7, border: '1.5px solid #d0cdc7', fontSize: 12.5 }} />
                <button onClick={() => adicionarEstoque(i.chave)} style={{ padding: '6px 10px', borderRadius: 7, border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer' }}><Plus size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mês + ações ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '10px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860' }}>Mês:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 9px', borderRadius: 8, border: '1px solid #d0cdc7', fontSize: 13 }} />
        <div style={{ flex: 1 }} />
        {dirty && !salvando && <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Alterações não salvas</span>}
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir A4</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
        <button onClick={abrirNovo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Registrar</button>
      </div>

      {/* ── Dashboard ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon={<Send size={16} />} label="Enviados" value={String(totalEnviado)} sub="no mês" />
        <StatCard icon={<CheckCircle2 size={16} />} label="Recebidos" value={String(totalRecebido)} sub="no mês" cor="#16a34a" />
        <StatCard icon={<RotateCcw size={16} />} label="Devolvidos" value={String(totalDevolvido)} sub="não pagos" cor="#dc2626" />
        <StatCard icon={<Wallet size={16} />} label="Total líquido a pagar" value={`R$ ${fmtBRL(valorLiquido)}`} sub={`bruto R$ ${fmtBRL(valorBruto)} − devolvido R$ ${fmtBRL(valorDevolvido)}`} cor="#16a34a" />
      </div>

      {/* ── Por item ── */}
      {porItem.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>📊 Por item — {mes.split('-').reverse().join('/')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {porItem.map(i => (
              <div key={i.chave} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', borderRadius: 10, background: '#faf9f7', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 13, color: '#1a1a1a', minWidth: 150, display: 'flex', alignItems: 'center' }}><span className="enx-dot" style={{ background: i.cor }} />{i.label}</strong>
                <span style={{ fontSize: 12, color: '#374151' }}>Enviado: <strong>{i.enviado}</strong></span>
                <span style={{ fontSize: 12, color: '#16a34a' }}>Recebido: <strong>{i.recebido}</strong></span>
                <span style={{ fontSize: 12, color: '#dc2626' }}>Devolvido: <strong>{i.devolvido}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Registros ── */}
      <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>🧺 Registros do mês</h3>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div> : (
        registros.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
            Nenhum registro ainda. Clique em <strong style={{ color: COR }}>+ Registrar</strong> para começar.
          </div>
        ) : mobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {registros.map(r => (
              <div key={r.id} style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>{r.data}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => abrirEditar(r)} style={iconBtn('#5b4fcf')}><Pencil size={13} /></button>
                    <button onClick={() => excluir(r.id)} style={iconBtn('#dc2626')}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14.5, color: '#1a1a1a', marginBottom: 6, display: 'flex', alignItems: 'center' }}><span className="enx-dot" style={{ background: ITENS.find(i => i.chave === r.item)?.cor }} />{labelDe(r.item)}</div>
                <div style={{ fontSize: 12.5, color: '#374151' }}>Enviado: {r.qtdEnviada} · Recebido: {r.qtdRecebida} · Devolvido: {r.qtdDevolvida}</div>
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{r.observacao}</span>
                  <strong style={{ fontSize: 14, color: '#16a34a' }}>R$ {fmtBRL(r.qtdEnviada * r.precoUnitario)}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, overflowX: 'auto' }}>
            <table className="enx-table" style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Item', 'Data', 'Enviado', 'Recebido', 'Devolvido', 'Valor', 'Observação', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: i >= 2 && i <= 5 ? 'center' : 'left', padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #e8e6e0', background: '#faf9f7' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registros.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f0eee8' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1a1a1a', display: 'flex', alignItems: 'center' }}><span className="enx-dot" style={{ background: ITENS.find(i => i.chave === r.item)?.cor }} />{labelDe(r.item)}</td>
                    <td style={{ padding: '12px 16px', color: '#6b6860', fontSize: 12.5 }}>{r.data}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#374151' }}>{r.qtdEnviada}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#16a34a' }}>{r.qtdRecebida}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#dc2626' }}>{r.qtdDevolvida}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>R$ {fmtBRL(r.qtdEnviada * r.precoUnitario)}</td>
                    <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 12.5 }}>{r.observacao || '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => abrirEditar(r)} style={iconBtn('#5b4fcf')}><Pencil size={13} /></button>
                      <button onClick={() => excluir(r.id)} style={iconBtn('#dc2626')}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#1a1a1a' }}>{registros.some(x => x.id === modal.id) ? '✏️ Editar registro' : '🧺 Registrar movimento'}</h3>
              <button onClick={() => setModal(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>

            <Campo label="Item">
              <select value={modal.item} onChange={e => setModal({ ...modal, item: e.target.value })} style={inputSt}>
                {ITENS.map(i => <option key={i.chave} value={i.chave}>{i.label}</option>)}
              </select>
            </Campo>

            <Campo label="Data">
              <input type="date" value={brToIso(modal.data)} onChange={e => setModal({ ...modal, data: isoToBr(e.target.value) })} style={inputSt} />
            </Campo>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Campo label="Enviado">
                <input value={modal.qtdEnviada || ''} onChange={e => setModal({ ...modal, qtdEnviada: Math.max(0, Math.round(Number(e.target.value) || 0)) })} placeholder="0" style={inputSt} />
              </Campo>
              <Campo label="Recebido">
                <input value={modal.qtdRecebida || ''} onChange={e => setModal({ ...modal, qtdRecebida: Math.max(0, Math.round(Number(e.target.value) || 0)) })} placeholder="0" style={inputSt} />
              </Campo>
              <Campo label="Devolvido">
                <input value={modal.qtdDevolvida || ''} onChange={e => setModal({ ...modal, qtdDevolvida: Math.max(0, Math.round(Number(e.target.value) || 0)) })} placeholder="0" style={inputSt} />
              </Campo>
            </div>

            <div style={{ background: '#f6f4ff', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: '#5b4fcf', fontWeight: 700 }}>Valor deste envio</span>
              <strong style={{ fontSize: 16, color: '#5b4fcf' }}>R$ {fmtBRL((modal.qtdEnviada || 0) * (cfg[modal.item]?.precoUnitario || 0))}</strong>
            </div>

            <Campo label="Observação">
              <input value={modal.observacao} onChange={e => setModal({ ...modal, observacao: e.target.value })} placeholder="Opcional" style={inputSt} />
            </Campo>

            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
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
      <div style={{ fontSize: 19, fontWeight: 900, color: '#1a1a1a', lineHeight: 1.15 }}>{value}</div>
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
