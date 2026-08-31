'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Plus, Trash2, Pencil, X, Printer, Wallet, Send, CheckCircle2, RotateCcw, Package } from 'lucide-react'
import { useIsMobile } from '@/lib/useIsMobile'
import { getLogoSalao } from '@/lib/logoSalao'
import { parseBRLNumber } from '@/lib/kitsShared'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { comoBotao } from '@/lib/acessibilidade'

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

interface LinhaLote { enviado: string; recebido: string; devolvido: string }
interface ModalLote { data: string; observacao: string; linhas: Record<string, LinhaLote> }

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
  const [estoqueStr, setEstoqueStr] = useState<Record<string, string>>({})
  const [salvandoCfg, setSalvandoCfg] = useState(false)
  const [salvandoEstoque, setSalvandoEstoque] = useState(false)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Enxovais') // avisa "Deseja salvar?" antes de sair sem salvar
  const [modalLote, setModalLote] = useState<ModalLote | null>(null)
  const [expandido, setExpandido] = useState<Set<string>>(new Set())
  const [precosAberto, setPrecosAberto] = useState(false)
  const [estoqueAberto, setEstoqueAberto] = useState(false)

  const chaveMes = `enxovais_registros_${mes}`

  const carregarConfig = useCallback(async () => {
    try {
      const d = await fetch('/api/salon/grid?chave=enxovais_config').then(r => r.ok ? r.json() : null)
      const itens = d?.itens && typeof d.itens === 'object' ? d.itens : {}
      const nova = configVazia()
      for (const i of ITENS) if (itens[i.chave]) nova[i.chave] = { precoUnitario: Number(itens[i.chave].precoUnitario) || 0, estoque: Number(itens[i.chave].estoque) || 0 }
      setCfg(nova)
      setPrecosStr(Object.fromEntries(ITENS.map(i => [i.chave, nova[i.chave].precoUnitario ? String(nova[i.chave].precoUnitario).replace('.', ',') : ''])))
      setEstoqueStr(Object.fromEntries(ITENS.map(i => [i.chave, String(nova[i.chave].estoque || 0)])))
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

  async function salvarEstoque() {
    setSalvandoEstoque(true)
    try {
      const nova: Config = {}
      for (const i of ITENS) nova[i.chave] = { precoUnitario: cfg[i.chave]?.precoUnitario || 0, estoque: Math.max(0, Math.round(Number(estoqueStr[i.chave]) || 0)) }
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'enxovais_config', doc: { itens: nova } }) })
      if (res.ok) { toast.success('Estoque salvo!'); setCfg(nova) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvandoEstoque(false)
  }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: chaveMes, doc: { registros } }) })
      if (res.ok) { toast.success('Registros salvos!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  // Uma "visita" = todos os registros do mesmo dia. A empresa vem uma vez só e
  // mexe em tudo, então o lançamento é uma tela única com os 6 itens, em vez de
  // abrir um modal por item. O "Enviado" já vem sugerido com o estoque atual
  // (o que normalmente vai tudo sujo) — só ajusta se for diferente.
  function linhasVazias(): Record<string, LinhaLote> {
    const linhas: Record<string, LinhaLote> = {}
    for (const i of ITENS) linhas[i.chave] = { enviado: cfg[i.chave]?.estoque ? String(cfg[i.chave].estoque) : '', recebido: '', devolvido: '' }
    return linhas
  }
  function abrirNovo() { setModalLote({ data: hojeBR(), observacao: '', linhas: linhasVazias() }) }
  function abrirEditarVisita(data: string) {
    const regsData = registros.filter(r => r.data === data)
    const linhas: Record<string, LinhaLote> = {}
    for (const i of ITENS) {
      const ex = regsData.find(r => r.item === i.chave)
      linhas[i.chave] = { enviado: ex?.qtdEnviada ? String(ex.qtdEnviada) : '', recebido: ex?.qtdRecebida ? String(ex.qtdRecebida) : '', devolvido: ex?.qtdDevolvida ? String(ex.qtdDevolvida) : '' }
    }
    const observacao = regsData.find(r => r.observacao)?.observacao || ''
    setModalLote({ data, observacao, linhas })
  }
  function salvarModalLote() {
    if (!modalLote) return
    const dataAlvo = modalLote.data
    const semEssaData = registros.filter(r => r.data !== dataAlvo)
    const novos: Registro[] = []
    for (const i of ITENS) {
      const l = modalLote.linhas[i.chave]
      const enviado = Math.max(0, Math.round(Number(l.enviado) || 0))
      const recebido = Math.max(0, Math.round(Number(l.recebido) || 0))
      const devolvido = Math.max(0, Math.round(Number(l.devolvido) || 0))
      if (!enviado && !recebido && !devolvido) continue
      novos.push({ id: rid(), item: i.chave, data: dataAlvo, qtdEnviada: enviado, qtdRecebida: recebido, qtdDevolvida: devolvido, precoUnitario: cfg[i.chave]?.precoUnitario || 0, observacao: modalLote.observacao })
    }
    if (novos.length === 0) { toast('Informe ao menos uma quantidade em algum item', { icon: '' }); return }
    setRegistros([...semEssaData, ...novos])
    setDirty(true); setModalLote(null)
  }
  function excluirVisita(data: string) {
    if (!confirm('Remover todos os registros deste dia?')) return
    setRegistros(prev => prev.filter(r => r.data !== data)); setDirty(true)
  }
  function editarLinha(chave: string, patch: Partial<LinhaLote>) {
    setModalLote(prev => prev ? { ...prev, linhas: { ...prev.linhas, [chave]: { ...prev.linhas[chave], ...patch } } } : prev)
  }
  // Aviso (não bloqueia salvar) quando recebido+devolvido não bate com o enviado
  // daquele item nessa visita — ajuda a pegar erro de digitação na hora.
  function divergente(l: LinhaLote): boolean {
    const enviado = Math.round(Number(l.enviado) || 0)
    const recebido = Math.round(Number(l.recebido) || 0)
    const devolvido = Math.round(Number(l.devolvido) || 0)
    return enviado > 0 && (recebido + devolvido) !== enviado
  }
  function alternarExpandido(data: string) {
    setExpandido(prev => { const n = new Set(prev); n.has(data) ? n.delete(data) : n.add(data); return n })
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

  // Agrupa os registros (guardados um por item) por data — cada data representa
  // uma visita da empresa, já que ela mexe em todos os itens de uma vez só.
  const visitasDoMes = useMemo(() => {
    const porData = new Map<string, Registro[]>()
    for (const r of registros) {
      if (!porData.has(r.data)) porData.set(r.data, [])
      porData.get(r.data)!.push(r)
    }
    return Array.from(porData.entries()).map(([data, regs]) => ({
      data,
      regs,
      observacao: regs.find(r => r.observacao)?.observacao || '',
      enviado: regs.reduce((s, r) => s + r.qtdEnviada, 0),
      recebido: regs.reduce((s, r) => s + r.qtdRecebida, 0),
      devolvido: regs.reduce((s, r) => s + r.qtdDevolvida, 0),
      valor: regs.reduce((s, r) => s + r.qtdEnviada * r.precoUnitario, 0) - regs.reduce((s, r) => s + r.qtdDevolvida * r.precoUnitario, 0),
    })).sort((a, b) => brToIso(b.data).localeCompare(brToIso(a.data)))
  }, [registros])

  async function imprimir() {
    const logoSalao = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const periodo = mes.split('-').reverse().join('/')
    const linhasItem = porItem.map(i => `<tr><td>${esc(i.label)}</td><td class="c">${i.enviado}</td><td class="c">${i.recebido}</td><td class="c">${i.devolvido}</td></tr>`).join('')
    const linhasVisita = visitasDoMes.map(v => `<tr><td>${esc(v.data)}</td><td class="c">${v.regs.length}</td><td class="c">${v.enviado}</td><td class="c">${v.recebido}</td><td class="c">${v.devolvido}</td><td class="c">R$ ${esc(fmtBRL(v.valor))}</td></tr>`).join('')
    const linhasReg = registros.map(r => `<tr><td>${esc(r.data)}</td><td>${esc(labelDe(r.item))}</td><td class="c">${r.qtdEnviada}</td><td class="c">${r.qtdRecebida}</td><td class="c">${r.qtdDevolvida}</td><td class="c">R$ ${esc(fmtBRL(r.qtdEnviada * r.precoUnitario))}</td></tr>`).join('')
    const cab = logoSalao ? `<img src="${logoSalao}" class="logo"/>` : `<div class="brand">NODRI</div>`
    const css = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${COR};padding-bottom:10px;margin-bottom:6px}.logo{max-height:56px;max-width:200px;object-fit:contain}.brand{font-size:22px;font-weight:900;color:${COR};letter-spacing:1px}h1{text-align:center;font-size:17px;font-weight:900;margin:12px 0 2px;text-transform:uppercase}.sub{text-align:center;font-size:11px;color:#888;margin-bottom:16px}.stats{display:flex;gap:8px;margin-bottom:18px}.stat{flex:1;border:1px solid #e5e2db;border-radius:10px;padding:9px 10px;background:#faf9f7}.stat b{display:block;font-size:16px;color:${COR}}.stat span{font-size:9.5px;color:#888;text-transform:uppercase}h2{font-size:12.5px;color:${COR};margin:16px 0 6px;text-transform:uppercase;border-bottom:1.5px solid ${COR};padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-bottom:6px}th,td{border:1px solid #f0ede6;padding:6px 8px;text-align:left}th{background:#f6f4ff;color:${COR};border-bottom:2px solid ${COR};font-size:9.5px;text-transform:uppercase}td.c,th.c{text-align:center}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Enxovais — ${esc(periodo)}</title><style>${css}</style></head><body><div class="hd">${cab}<span style="font-size:10px;color:#777">${new Date().toLocaleDateString('pt-BR')}</span></div><h1>Controle de Enxovais</h1><div class="sub">${esc(periodo)}</div><div class="stats"><div class="stat"><b>${totalEnviado}</b><span>Enviados</span></div><div class="stat"><b>${totalRecebido}</b><span>Recebidos</span></div><div class="stat"><b>${totalDevolvido}</b><span>Devolvidos</span></div><div class="stat"><b>R$ ${fmtBRL(valorLiquido)}</b><span>Total líquido</span></div></div><h2>Por item</h2><table><thead><tr><th>Item</th><th class="c">Enviado</th><th class="c">Recebido</th><th class="c">Devolvido</th></tr></thead><tbody>${linhasItem}</tbody></table><h2>Visitas do mês</h2><table><thead><tr><th>Data</th><th class="c">Itens</th><th class="c">Enviado</th><th class="c">Recebido</th><th class="c">Devolvido</th><th class="c">Valor</th></tr></thead><tbody>${linhasVisita}</tbody></table><h2>Detalhe por item</h2><table><thead><tr><th>Data</th><th>Item</th><th class="c">Enviado</th><th class="c">Recebido</th><th class="c">Devolvido</th><th class="c">Valor</th></tr></thead><tbody>${linhasReg}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`
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
        <div {...comoBotao} onClick={() => setPrecosAberto(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: precosAberto ? COR : '#9ca3af', transition: 'transform .15s', transform: precosAberto ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>▶</span>
          <h3 style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Valor unitário por lavagem</h3>
          {!precosAberto && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: '#6b6860' }}>
              {ITENS.map(i => (
                <span key={i.chave} style={{ display: 'flex', alignItems: 'center' }}><span className="enx-dot" style={{ background: i.cor }} />R$ {precosStr[i.chave] || '0,00'}</span>
              ))}
            </div>
          )}
        </div>
        {precosAberto && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(6, 1fr)', gap: 10, margin: '12px 0' }}>
              {ITENS.map(i => (
                <div key={i.chave}>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 700, color: '#6b6860', marginBottom: 5 }}><span className="enx-dot" style={{ background: i.cor }} />{i.label}</label>
                  <input value={precosStr[i.chave] || ''} onChange={e => setPrecosStr(prev => ({ ...prev, [i.chave]: e.target.value }))} inputMode="decimal" placeholder="0,00" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />
                </div>
              ))}
            </div>
            <button onClick={salvarConfig} disabled={salvandoCfg} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 9, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvandoCfg ? '...' : <><Save size={14} /> Salvar preços</>}</button>
          </>
        )}
      </div>

      {/* ── Estoque ── */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div {...comoBotao} onClick={() => setEstoqueAberto(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: estoqueAberto ? COR : '#9ca3af', transition: 'transform .15s', transform: estoqueAberto ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>▶</span>
          <h3 style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a1a', margin: 0, display: 'flex', alignItems: 'center' }}><Package size={15} style={{ marginRight: 5 }} />Estoque</h3>
          {!estoqueAberto && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: '#6b6860' }}>
              {ITENS.map(i => (
                <span key={i.chave} style={{ display: 'flex', alignItems: 'center' }}><span className="enx-dot" style={{ background: i.cor }} />{cfg[i.chave]?.estoque || 0}</span>
              ))}
            </div>
          )}
        </div>
        {estoqueAberto && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(6, 1fr)', gap: 10, margin: '12px 0' }}>
              {ITENS.map(i => (
                <div key={i.chave}>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 700, color: '#6b6860', marginBottom: 5 }}><span className="enx-dot" style={{ background: i.cor }} />{i.label}</label>
                  <input value={estoqueStr[i.chave] || ''} onChange={e => setEstoqueStr(prev => ({ ...prev, [i.chave]: e.target.value }))} inputMode="numeric" placeholder="0" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />
                </div>
              ))}
            </div>
            <button onClick={salvarEstoque} disabled={salvandoEstoque} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 9, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvandoEstoque ? '...' : <><Save size={14} /> Salvar estoque</>}</button>
          </>
        )}
      </div>

      {/* ── Mês + ações (uma linha só; rola de lado no celular se faltar espaço) ── */}
      <div className="nodri-linha-rolavel" style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '10px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860' }}>Mês:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 9px', borderRadius: 8, border: '1px solid #d0cdc7', fontSize: 13 }} />
        <div style={{ flex: 1 }} />
        {dirty && !salvando && <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Alterações não salvas</span>}
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir A4</button>
        <button onClick={abrirNovo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Registrar</button>
        {/* Salvar por último: no celular ele gruda na borda direita (sempre visível) */}
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
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
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>Por item — {mes.split('-').reverse().join('/')}</h3>
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

      {/* ── Visitas (registros agrupados por dia) ── */}
      <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>Visitas do mês</h3>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div> : (
        visitasDoMes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
            Nenhum registro ainda. Clique em <strong style={{ color: COR }}>+ Registrar</strong> para começar.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visitasDoMes.map(v => {
              const aberta = expandido.has(v.data)
              return (
                <div key={v.data} style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, overflow: 'hidden' }}>
                  <div {...comoBotao} onClick={() => alternarExpandido(v.data)} style={{ display: 'flex', alignItems: 'center', gap: mobile ? 10 : 16, padding: '12px 16px', cursor: 'pointer', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: aberta ? COR : '#9ca3af', transition: 'transform .15s', transform: aberta ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>▶</span>
                    <strong style={{ fontSize: 14, color: '#1a1a1a', minWidth: 90 }}>{v.data}</strong>
                    <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{v.regs.length} {v.regs.length === 1 ? 'item' : 'itens'}</span>
                    <span style={{ fontSize: 12, color: '#374151' }}>Enviado: <strong>{v.enviado}</strong></span>
                    <span style={{ fontSize: 12, color: '#16a34a' }}>Recebido: <strong>{v.recebido}</strong></span>
                    <span style={{ fontSize: 12, color: '#dc2626' }}>Devolvido: <strong>{v.devolvido}</strong></span>
                    <div style={{ flex: 1 }} />
                    <strong style={{ fontSize: 14.5, color: '#16a34a' }}>R$ {fmtBRL(v.valor)}</strong>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => abrirEditarVisita(v.data)} style={iconBtn('#5b4fcf')}><Pencil size={13} /></button>
                      <button onClick={() => excluirVisita(v.data)} style={iconBtn('#dc2626')}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {aberta && (
                    <div style={{ borderTop: '1px solid #f0eee8', padding: '10px 16px 14px', background: '#faf9f7' }}>
                      {v.observacao && <div style={{ fontSize: 12, color: '#6b6860', marginBottom: 8 }}>{v.observacao}</div>}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {v.regs.map(r => (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', minWidth: 140, fontWeight: 700, color: '#1a1a1a' }}><span className="enx-dot" style={{ background: ITENS.find(i => i.chave === r.item)?.cor }} />{labelDe(r.item)}</span>
                            <span style={{ color: '#374151' }}>Enviado: {r.qtdEnviada}</span>
                            <span style={{ color: '#16a34a' }}>Recebido: {r.qtdRecebida}</span>
                            <span style={{ color: '#dc2626' }}>Devolvido: {r.qtdDevolvida}</span>
                            <span style={{ color: '#9ca3af' }}>R$ {fmtBRL(r.qtdEnviada * r.precoUnitario)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {modalLote && (
        <div onClick={() => setModalLote(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#1a1a1a' }}>{registros.some(r => r.data === modalLote.data) ? 'Editar visita' : 'Registrar movimento'}</h3>
              <button onClick={() => setModalLote(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>

            <Campo label="Data">
              <input type="date" value={brToIso(modalLote.data)} onChange={e => setModalLote({ ...modalLote, data: isoToBr(e.target.value) })} style={{ ...inputSt, maxWidth: 220 }} />
            </Campo>

            <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '0 0 10px' }}>O campo "Enviado" já vem sugerido com o estoque atual — ajuste se for diferente. Linhas em laranja indicam que Recebido + Devolvido não bate com o Enviado (confira antes de salvar).</p>

            <div style={{ overflowX: 'auto', marginBottom: 14 }}>
              <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Item', 'Enviado', 'Recebido', 'Devolvido'].map((h, i) => (
                      <th key={i} style={{ textAlign: i === 0 ? 'left' : 'center', padding: '6px 8px', fontSize: 10.5, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #e8e6e0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ITENS.map(i => {
                    const l = modalLote.linhas[i.chave]
                    const marcado = divergente(l)
                    return (
                      <tr key={i.chave} style={{ background: marcado ? '#fff7ed' : 'transparent' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 700, color: '#1a1a1a', fontSize: 12.5, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}><span className="enx-dot" style={{ background: i.cor }} />{i.label}</td>
                        <td style={{ padding: '6px 6px' }}><input value={l.enviado} onChange={e => editarLinha(i.chave, { enviado: e.target.value })} placeholder="0" style={{ ...inputSt, textAlign: 'center', padding: '7px 6px' }} /></td>
                        <td style={{ padding: '6px 6px' }}><input value={l.recebido} onChange={e => editarLinha(i.chave, { recebido: e.target.value })} placeholder="0" style={{ ...inputSt, textAlign: 'center', padding: '7px 6px' }} /></td>
                        <td style={{ padding: '6px 6px' }}><input value={l.devolvido} onChange={e => editarLinha(i.chave, { devolvido: e.target.value })} placeholder="0" style={{ ...inputSt, textAlign: 'center', padding: '7px 6px' }} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ background: '#f6f4ff', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: '#5b4fcf', fontWeight: 700 }}>Valor desta visita</span>
              <strong style={{ fontSize: 16, color: '#5b4fcf' }}>
                R$ {fmtBRL(ITENS.reduce((s, i) => {
                  const l = modalLote.linhas[i.chave]
                  const enviado = Math.round(Number(l.enviado) || 0), devolvido = Math.round(Number(l.devolvido) || 0)
                  return s + (enviado - devolvido) * (cfg[i.chave]?.precoUnitario || 0)
                }, 0))}
              </strong>
            </div>

            <Campo label="Observação">
              <input value={modalLote.observacao} onChange={e => setModalLote({ ...modalLote, observacao: e.target.value })} placeholder="Opcional" style={inputSt} />
            </Campo>

            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={() => setModalLote(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarModalLote} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>Salvar</button>
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
