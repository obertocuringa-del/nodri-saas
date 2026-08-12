'use client'

// Chancela dos Contratos — situação de cada profissional PJ.
//
// A coluna "Contrato" é só leitura: vem do campo "Profissional possui
// contrato?" do perfil (tem_contrato). As chancelas (Laboral e Patronal)
// são preenchidas aqui e ficam em salao_config na chave demanda_chancela.
// Cada chancela vale 1 ano — a tela calcula sozinha quando vence.

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Loader2, Save, Printer, ShieldCheck, AlertTriangle, FileWarning, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { getLogoSalao } from '@/lib/logoSalao'

const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const fmtBR = (iso?: string) => iso ? iso.split('-').reverse().join('/') : ''

/** Uma chancela vale 12 meses a partir da data em que foi feita. */
const VALIDADE_MESES = 12

interface Chancela { feita?: boolean; data?: string }
interface Registro { laboral?: Chancela; patronal?: Chancela; obs?: string }
type DocChancela = Record<string, Registro>   // id do profissional → registro

interface Prof {
  id: string; nome_completo?: string; apelido?: string; cnpj?: string
  vinculo?: string; ativo?: boolean; tem_contrato?: boolean; is_departamento?: boolean
}

/** Vencimento e quantos dias faltam, a partir da data da chancela. */
function situacao(c?: Chancela) {
  if (!c?.feita) return { estado: 'nao' as const, texto: 'Não chancelado', cor: '#dc2626', dias: null as number | null, vence: '' }
  if (!c.data) return { estado: 'semData' as const, texto: 'Sem data', cor: '#b45309', dias: null, vence: '' }
  const base = new Date(c.data + 'T00:00:00')
  const vence = new Date(base); vence.setMonth(vence.getMonth() + VALIDADE_MESES)
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const dias = Math.round((vence.getTime() - hoje.getTime()) / 86400000)
  const venceISO = vence.toLocaleDateString('en-CA')
  if (dias < 0) return { estado: 'vencida' as const, texto: `Vencida há ${Math.abs(dias)} dias`, cor: '#dc2626', dias, vence: venceISO }
  if (dias <= 30) return { estado: 'perto' as const, texto: `Vence em ${dias} dias`, cor: '#b45309', dias, vence: venceISO }
  return { estado: 'ok' as const, texto: `Faltam ${dias} dias`, cor: '#15803d', dias, vence: venceISO }
}

export default function ChancelaContratos() {
  const [profs, setProfs] = useState<Prof[]>([])
  const [doc, setDoc] = useState<DocChancela>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Chancela dos contratos')

  useEffect(() => {
    Promise.all([
      fetch('/api/profissionais', { credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/salon/grid?chave=demanda_chancela', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([ps, d]) => {
      setProfs(Array.isArray(ps) ? ps : [])
      if (d && typeof d === 'object') setDoc(d as DocChancela)
    }).finally(() => setCarregando(false))
  }, [])

  const salvar = useCallback(async () => {
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'demanda_chancela', doc }),
      })
      if (r.ok) { setDirty(false); toast.success('Salvo!') } else toast.error('Não foi possível salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }, [doc])

  // Só os PJ ativos — são eles que precisam de contrato e chancela.
  const lista = useMemo(() => profs
    .filter(p => !p.is_departamento && p.ativo !== false && (String(p.vinculo || '').toUpperCase() === 'MEI' || String(p.cnpj || '').trim()))
    .map(p => ({ ...p, nome: (p.nome_completo || p.apelido || '—') }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [profs])

  function marcar(id: string, qual: 'laboral' | 'patronal', campo: keyof Chancela, valor: any) {
    setDoc(d => {
      const at = d[id] || {}
      const ch = { ...(at[qual] || {}), [campo]: valor }
      // Marcar "sim" sem data preenche com hoje — evita chancela sem prazo.
      if (campo === 'feita' && valor && !ch.data) ch.data = new Date().toLocaleDateString('en-CA')
      return { ...d, [id]: { ...at, [qual]: ch } }
    })
    setDirty(true)
  }

  const semContrato = lista.filter(p => !p.tem_contrato).length
  const contarPend = (qual: 'laboral' | 'patronal') =>
    lista.filter(p => { const s = situacao(doc[p.id]?.[qual]); return s.estado === 'nao' || s.estado === 'vencida' }).length

  async function imprimir() {
    const logo = await getLogoSalao()
    const linhas = lista.map(p => {
      const l = situacao(doc[p.id]?.laboral), pt = situacao(doc[p.id]?.patronal)
      return `<tr>
        <td><b>${esc(p.nome)}</b><br><span class="cnpj">${esc(p.cnpj || 'sem CNPJ')}</span></td>
        <td class="c">${p.tem_contrato ? '<span class="ok">Com contrato</span>' : '<span class="pend">CONTRATO PENDENTE</span>'}</td>
        <td class="c">${l.estado === 'nao' ? '<span class="pend">Não</span>' : `${esc(fmtBR(doc[p.id]?.laboral?.data))}<br><span class="peq">vence ${esc(fmtBR(l.vence))}</span>`}</td>
        <td class="c">${pt.estado === 'nao' ? '<span class="pend">Não</span>' : `${esc(fmtBR(doc[p.id]?.patronal?.data))}<br><span class="peq">vence ${esc(fmtBR(pt.vence))}</span>`}</td>
      </tr>`
    }).join('')
    const css = `@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a2e}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #5b4fcf;padding-bottom:8px;margin-bottom:12px}
.brand{font-size:21px;font-weight:900;color:#5b4fcf}.logo{max-height:52px;max-width:190px;object-fit:contain}
.tt{text-align:right;font-size:10px;color:#666}.tt strong{font-size:14px;color:#1a1a2e;display:block}
table{width:100%;border-collapse:collapse;font-size:10.5px}
th{background:#5b4fcf;color:#fff;text-align:left;padding:7px 9px;font-size:10px}
td{padding:6px 9px;border-bottom:1px solid #eee;vertical-align:top}
tr:nth-child(even) td{background:#faf9ff}
.c{text-align:center}.cnpj{font-size:9px;color:#888}.peq{font-size:8.5px;color:#888}
.ok{color:#15803d;font-weight:700}.pend{color:#dc2626;font-weight:800}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Chancela dos Contratos</title><style>${css}</style></head><body>
<div class="hd">${logo ? `<img src="${logo}" class="logo"/>` : `<div class="brand">NODRI</div>`}<div class="tt"><strong>Chancela dos Contratos</strong>${lista.length} profissionais PJ · ${new Date().toLocaleDateString('pt-BR')}</div></div>
<table><thead><tr><th>Profissional</th><th class="c">Contrato</th><th class="c">Sindicato Laboral</th><th class="c">Sindicato Patronal</th></tr></thead><tbody>${linhas}</tbody></table>
<script>window.onload=function(){window.print()}<\/script></body></html>`
    const w = window.open('', '_blank', 'width=1000,height=700'); if (!w) return
    w.document.write(html); w.document.close(); w.focus()
  }

  if (carregando) return (
    <div style={{ padding: 46, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={21} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  return (
    <div>
      <style>{`
        .ch-tab { width:100%; border-collapse:collapse; min-width:760px; }
        .ch-tab th { text-align:left; font-size:10px; font-weight:800; color:#8a8680; text-transform:uppercase;
          letter-spacing:.5px; padding:9px 11px; background:#fbfbfa; border-bottom:1px solid #eceae4; white-space:nowrap; }
        .ch-tab td { padding:9px 11px; border-bottom:1px solid #f4f2ee; vertical-align:middle; }
        .ch-tab tbody tr:hover td { background:#fcfcfb; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, flexWrap: 'wrap', marginBottom: 13 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 19, fontWeight: 900, color: '#1a1a2e', margin: 0, letterSpacing: '-.3px' }}>Chancela dos Contratos</h2>
          <p style={{ fontSize: 12.5, color: '#8a8680', margin: '3px 0 0' }}>
            Profissionais PJ. O contrato vem do perfil; as chancelas valem {VALIDADE_MESES} meses e o prazo é contado sozinho.
          </p>
        </div>
        <button onClick={imprimir}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 15px', borderRadius: 11, border: '1.5px solid #e0ddd8', background: '#fff', color: '#4b5563', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
          <Printer size={14} /> Imprimir
        </button>
        <button onClick={salvar} disabled={salvando || !dirty}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 11, border: 'none', background: dirty ? '#16a34a' : '#d7d5cf', color: '#fff', fontSize: 13, fontWeight: 800, cursor: dirty ? 'pointer' : 'default' }}>
          <Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {/* Resumo — o que precisa de ação */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 13 }}>
        <Kpi icone={<ShieldCheck size={17} />} n={lista.length} rotulo="Profissionais PJ" cor="#5b4fcf" fundo="#f5f3ff" />
        <Kpi icone={<FileWarning size={17} />} n={semContrato} rotulo="Contrato pendente" cor={semContrato ? '#dc2626' : '#15803d'} fundo={semContrato ? '#fef2f2' : '#f0fdf4'} />
        <Kpi icone={<AlertTriangle size={17} />} n={contarPend('laboral')} rotulo="Laboral a resolver" cor={contarPend('laboral') ? '#b45309' : '#15803d'} fundo={contarPend('laboral') ? '#fffbeb' : '#f0fdf4'} />
        <Kpi icone={<AlertTriangle size={17} />} n={contarPend('patronal')} rotulo="Patronal a resolver" cor={contarPend('patronal') ? '#b45309' : '#15803d'} fundo={contarPend('patronal') ? '#fffbeb' : '#f0fdf4'} />
      </div>

      {lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '44px 20px', background: '#fff', border: '1px dashed #e0ddd8', borderRadius: 14 }}>
          <p style={{ color: '#8a8680', fontSize: 13.5, fontWeight: 700, margin: 0 }}>Nenhum profissional PJ ativo cadastrado.</p>
          <p style={{ color: '#a8a49d', fontSize: 12, margin: '4px 0 0' }}>Entram aqui os profissionais com vínculo MEI ou com CNPJ preenchido.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, overflowX: 'auto' }}>
          <table className="ch-tab">
            <thead>
              <tr>
                <th>Profissional</th>
                <th style={{ width: 150 }}>Contrato</th>
                <th style={{ width: 250 }}>Chancela — Sindicato Laboral</th>
                <th style={{ width: 250 }}>Chancela — Sindicato Patronal</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>{p.nome}</div>
                    <div style={{ fontSize: 10.5, color: '#a8a49d' }}>{p.cnpj || 'sem CNPJ'}</div>
                  </td>
                  <td>
                    {p.tem_contrato ? (
                      <span style={selo('#15803d', '#f0fdf4', '#bbf7d0')}><Check size={12} /> Com contrato</span>
                    ) : (
                      <span style={selo('#dc2626', '#fef2f2', '#fecaca')}><FileWarning size={12} /> CONTRATO PENDENTE</span>
                    )}
                  </td>
                  {(['laboral', 'patronal'] as const).map(qual => {
                    const ch = doc[p.id]?.[qual] || {}
                    const s = situacao(ch)
                    return (
                      <td key={qual}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: ch.feita ? '#15803d' : '#8a8680' }}>
                            <input type="checkbox" checked={!!ch.feita} onChange={e => marcar(p.id, qual, 'feita', e.target.checked)}
                              style={{ width: 15, height: 15, accentColor: '#16a34a', cursor: 'pointer' }} />
                            {ch.feita ? 'Sim' : 'Não'}
                          </label>
                          {ch.feita && (
                            <input type="date" value={ch.data || ''} onChange={e => marcar(p.id, qual, 'data', e.target.value)}
                              style={campoData} />
                          )}
                        </div>
                        {ch.feita && (
                          <div style={{ marginTop: 4, fontSize: 10.5, fontWeight: 800, color: s.cor }}>
                            {s.vence && <>próxima em {fmtBR(s.vence)} · </>}{s.texto}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: '#a8a49d', margin: '11px 4px 0', lineHeight: 1.5 }}>
        A coluna “Contrato” não é editável aqui: ela reflete o campo <b>“Profissional possui contrato?”</b> do perfil de cada
        profissional. Para mudá-la, ajuste no cadastro. Marcar uma chancela já preenche a data de hoje — e o prazo da próxima
        aparece automaticamente.
      </p>
    </div>
  )
}

const campoData: CSSProperties = { padding: '5px 8px', borderRadius: 7, border: '1.5px solid #e0ddd8', fontSize: 11.5, background: '#fff' }

function selo(cor: string, fundo: string, borda: string): CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 4, background: fundo, color: cor, border: `1px solid ${borda}`, borderRadius: 99, padding: '3px 10px', fontSize: 10.5, fontWeight: 900, whiteSpace: 'nowrap' }
}

function Kpi({ icone, n, rotulo, cor, fundo }: { icone: any; n: number; rotulo: string; cor: string; fundo: string }) {
  return (
    <div style={{ background: fundo, border: '1px solid #eceae4', borderRadius: 13, padding: '12px 15px', display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: cor + '1e', color: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icone}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: cor, lineHeight: 1 }}>{n}</div>
        <div style={{ fontSize: 10.5, color: '#8a8680', fontWeight: 700 }}>{rotulo}</div>
      </div>
    </div>
  )
}
