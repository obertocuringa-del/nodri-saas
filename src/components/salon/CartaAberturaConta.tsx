'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, X, Search, Upload } from 'lucide-react'

interface Prof { id: string; nome_completo?: string; apelido?: string; cpf?: string; rg?: string; endereco?: string; cargo?: string; data_admissao?: string }
const CHAVE = 'carta_abertura_conta'
const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
const fmtData = (s?: string) => s ? String(s).slice(0, 10).split('-').reverse().join('/') : ''
const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const MESES_EXT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const dataExtenso = () => { const d = new Date(); return `${d.getDate()} de ${MESES_EXT[d.getMonth()]} de ${d.getFullYear()}` }

export default function CartaAberturaConta({ onClose }: { onClose: () => void }) {
  const [profs, setProfs] = useState<Prof[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [selId, setSelId] = useState('')
  // Config (salva): logo + dados da empresa + banco/cidade
  const [logo, setLogo] = useState('')
  const [empresa, setEmpresa] = useState('OLIVEIRA E SCHNEIDER INSTITUTO DE BELEZA LTDA')
  const [cnpj, setCnpj] = useState('')
  const [banco, setBanco] = useState('Bradesco')
  const [cidade, setCidade] = useState('Brasília')
  const [salvandoCfg, setSalvandoCfg] = useState(false)
  // Salário (NÃO salva — editar a cada carta)
  const [salario, setSalario] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const carregar = useCallback(async () => {
    try {
      const [p, cfg] = await Promise.all([
        fetch('/api/profissionais').then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/salon/grid?chave=${CHAVE}`).then(r => r.ok ? r.json() : null).catch(() => null),
      ])
      setProfs(Array.isArray(p) ? p : [])
      if (cfg) { setLogo(cfg.logo || ''); setEmpresa(cfg.empresa || ''); setCnpj(cfg.cnpj || ''); setBanco(cfg.banco || 'Bradesco'); setCidade(cfg.cidade || 'Brasília (DF)') }
    } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function salvarCfg() {
    setSalvandoCfg(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: CHAVE, doc: { logo, empresa, cnpj, banco, cidade } }) })
      if (res.ok) toast.success('Dados da empresa salvos!'); else { const e = await res.json().catch(() => ({})); toast.error(e?.error || 'Erro ao salvar') }
    } catch { toast.error('Erro de conexão') }
    setSalvandoCfg(false)
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return }
    try {
      const fd = new FormData(); fd.append('arquivo', f)
      const res = await fetch('/api/salon/upload', { method: 'POST', body: fd })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(d?.error || 'Erro ao enviar logo'); return }
      setLogo(d.url); toast.success('Logo anexada! Clique em Salvar dados para guardar.')
    } catch { toast.error('Erro de conexão') }
  }

  const sel = profs.find(p => p.id === selId)
  const nome = sel?.nome_completo || sel?.apelido || ''

  function imprimir() {
    if (!sel) { toast.error('Selecione o funcionário'); return }
    const salTxt = salario.trim() ? esc(salario) : '____________ (preencher)'
    const css = `@page{size:A4 portrait;margin:25mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Times New Roman',Georgia,serif;color:#000;font-size:14px;line-height:1.7}.logo{text-align:center;margin-bottom:26px}.logo img{max-height:100px;max-width:280px;object-fit:contain}.data{text-align:right;margin-bottom:26px}.bloco{margin:16px 0}.sal{color:#dc2626;font-weight:800}.cargo{margin:6px 0;font-weight:700}.ass{margin-top:70px;text-align:center}.linha{border-top:1px solid #000;width:340px;margin:0 auto;padding-top:6px;font-size:13px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Carta de Abertura de Conta — ${esc(nome)}</title><style>${css}</style></head><body>
      ${logo ? `<div class="logo"><img src="${logo}" alt="logo"/></div>` : ''}
      <div class="data">${esc(cidade)}, ${dataExtenso()}.</div>
      <div class="bloco">Ao<br><strong>Banco ${esc(banco)}</strong><br>Att. Gerente</div>
      <p class="bloco"><strong>Assunto:</strong> Abertura de Conta para Crédito de Salário.</p>
      <p class="bloco">Prezado(a) senhor(a), apresentamos o(a) Sr.(a) <strong>${esc(nome)}</strong>, portador(a) do R.G. nº <strong>${esc(sel.rg || '____________')}</strong> e CPF nº <strong>${esc(sel.cpf || '____________')}</strong>, para abertura de uma Conta para Crédito de Salário. O(a) mesmo(a) é funcionário(a) da empresa <strong>${esc(empresa)}</strong>, sem mais, agradecemos.</p>
      <p class="cargo">CARGO: ${esc((sel.cargo || '').toUpperCase())}</p>
      <p class="cargo">SALÁRIO: <span class="sal">${salTxt}</span></p>
      <p class="bloco" style="margin-top:44px">Atenciosamente,</p>
      <div class="ass"><div class="linha">Carimbo e assinatura do Gerente Responsável</div></div>
      <script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=800'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  const filtradas = profs.filter(p => norm(p.nome_completo || p.apelido || '').includes(norm(busca)))

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f0eee8', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>📄 Carta de Abertura de Conta</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
        </div>

        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={26} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> : (
          <div style={{ padding: 18 }}>
            {/* 1) Funcionário */}
            <label style={lbl}>1) Funcionário (puxa os dados do cadastro)</label>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: '#9ca3af' }} />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar funcionário…" style={{ ...inp, paddingLeft: 32 }} />
            </div>
            <select value={selId} onChange={e => setSelId(e.target.value)} style={{ ...inp, marginBottom: 14 }}>
              <option value="">— selecionar funcionário —</option>
              {filtradas.map(p => <option key={p.id} value={p.id}>{p.nome_completo || p.apelido}</option>)}
            </select>

            {sel && (
              <div style={{ background: '#faf9f7', border: '1px solid #e8e6e0', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 13 }}>
                <div><strong>Nome:</strong> {nome || '—'}</div>
                <div><strong>CPF:</strong> {sel.cpf || '—'} &nbsp; <strong>RG:</strong> {sel.rg || '—'}</div>
                <div><strong>Endereço:</strong> {sel.endereco || '—'}</div>
                <div><strong>Cargo:</strong> {sel.cargo || '—'} &nbsp; <strong>Admissão:</strong> {fmtData(sel.data_admissao) || '—'}</div>
              </div>
            )}

            {/* 2) Salário (vermelho — editar manual) */}
            <label style={{ ...lbl, color: '#dc2626' }}>2) Salário (preencha manualmente — fica em vermelho na carta)</label>
            <input value={salario} onChange={e => setSalario(e.target.value)} placeholder="Ex: R$ 1.500,00" style={{ ...inp, marginBottom: 16, border: '2px solid #dc2626', color: '#dc2626', fontWeight: 700 }} />

            {/* 3) Dados da empresa + logo (salvos uma vez) */}
            <div style={{ borderTop: '1px dashed #e8e6e0', paddingTop: 14 }}>
              <label style={lbl}>3) Dados da empresa e logo <span style={{ color: '#9ca3af', fontWeight: 400 }}>(salva uma vez e reaproveita)</span></label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Razão social da empresa" style={{ ...inp, flex: '2 1 240px' }} />
                <input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="CNPJ" style={{ ...inp, flex: '1 1 140px' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                <input value={banco} onChange={e => setBanco(e.target.value)} placeholder="Banco" style={{ ...inp, flex: '1 1 140px' }} />
                <input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" style={{ ...inp, flex: '1 1 140px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} style={{ display: 'none' }} />
                <button onClick={() => fileRef.current?.click()} style={btnSec}><Upload size={14} /> {logo ? 'Trocar logo' : 'Anexar logo'}</button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {logo && <img src={logo} alt="logo" style={{ maxHeight: 40, maxWidth: 120, objectFit: 'contain', border: '1px solid #eee', borderRadius: 6, padding: 3 }} />}
                <button onClick={salvarCfg} disabled={salvandoCfg} style={{ ...btnSec, marginLeft: 'auto' }}>{salvandoCfg ? '...' : <><Save size={14} /> Salvar dados</>}</button>
              </div>
            </div>

            <button onClick={imprimir} disabled={!sel} style={{ marginTop: 18, width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: sel ? '#16a34a' : '#cbd5e1', color: '#fff', fontSize: 15, fontWeight: 800, cursor: sel ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Printer size={17} /> Gerar e baixar (PDF / imprimir)</button>
            <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>Abre a carta pronta com a logo e os dados. Para baixar em PDF, escolha “Salvar como PDF” na janela de impressão.</p>
          </div>
        )}
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#6b6860', marginBottom: 5 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }
const btnSec: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
