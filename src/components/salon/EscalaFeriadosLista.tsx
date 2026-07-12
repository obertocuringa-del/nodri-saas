'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Plus, Trash2, PartyPopper, Printer, MessageCircle, Mail, CalendarDays, Clock } from 'lucide-react'
import { getLogoSalao } from '@/lib/logoSalao'
import { SeletorNomes } from './SeletorNomes'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

interface FeriadoItem { id: string; nome: string; data: string; horario: string; fechado: boolean; profissionais: string; obs: string }
interface Profissional { id: string; nome_completo: string; apelido: string; ativo?: boolean }

const COR = '#5b4fcf'
const rid = () => Math.random().toString(36).slice(2, 9)
const nomeDe = (p: Profissional) => p.apelido || p.nome_completo || '—'

// Lista padrão usada enquanto nada foi salvo ainda (mesmos feriados que já
// apareciam na versão antiga desta página) — só entra em uso local, some
// assim que o usuário salvar pela 1ª vez com os dados reais.
const FERIADOS_PADRAO: FeriadoItem[] = [
  { id: rid(), nome: 'Carnaval', data: '02, 03 e 04/03/2026', horario: '', fechado: true, profissionais: '', obs: '' },
  { id: rid(), nome: 'Tira Dentes', data: '21/04/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Dia do Trabalhador', data: '01/05/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Sete de Setembro', data: '07/09/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Nossa Senhora', data: '12/10/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Finados', data: '02/11/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Proclamação da República', data: '15/11/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Consciência Negra', data: '20/11/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Natal', data: '24/12/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
  { id: rid(), nome: 'Ano Novo', data: '31/12/2026', horario: '10:00 às 18:00', fechado: false, profissionais: '', obs: '' },
]

// Lê o formato antigo (GridEditavel — tabelas/linhas), usado antes desta página
// ser modernizada, só na 1ª vez que não encontrar o formato novo salvo.
function migrarFormatoAntigo(doc: any): FeriadoItem[] | null {
  const linhas = doc?.tabelas?.[0]?.linhas
  if (!Array.isArray(linhas)) return null
  return linhas.filter((l: any[]) => (l[0]?.t || '').trim()).map((l: any[]) => ({
    id: rid(),
    nome: l[0]?.t || '',
    data: l[1]?.t || '',
    horario: /fechado/i.test(l[2]?.t || '') ? '' : (l[2]?.t || ''),
    fechado: /fechado/i.test(l[2]?.t || '') || /fechado/i.test(l[4]?.t || ''),
    profissionais: l[3]?.t || '',
    obs: l[4]?.t || '',
  }))
}

function textoCompartilhar(f: FeriadoItem): string {
  const linhas = [`📅 *Escala de Feriado — ${f.nome || '—'}*`, `Data: ${f.data || '—'}`]
  linhas.push(f.fechado ? 'Salão fechado' : `Horário: ${f.horario || '—'}`)
  if (!f.fechado) linhas.push(`Escalados: ${f.profissionais || '—'}`)
  if (f.obs) linhas.push(`Obs: ${f.obs}`)
  return linhas.join('\n')
}

export default function EscalaFeriadosLista({ chave = 'feriados' }: { chave?: string }) {
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [feriados, setFeriados] = useState<FeriadoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Escala de Feriados') // avisa "Deseja salvar?" antes de sair sem salvar

  useEffect(() => {
    fetch('/api/profissionais').then(r => r.ok ? r.json() : []).then((arr: any[]) => setProfissionais(Array.isArray(arr) ? arr : [])).catch(() => {})
  }, [])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chave)}`).then(r => r.ok ? r.json() : null)
      const lista: FeriadoItem[] = Array.isArray(d?.feriados) ? d.feriados : (migrarFormatoAntigo(d) || FERIADOS_PADRAO)
      setFeriados(lista)
      setDirty(false)
    } catch { /* mantém o que já tinha */ }
    setLoading(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  function editar(id: string, patch: Partial<FeriadoItem>) {
    setFeriados(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f)); setDirty(true)
  }
  function adicionar() {
    setFeriados(prev => [...prev, { id: rid(), nome: '', data: '', horario: '', fechado: false, profissionais: '', obs: '' }]); setDirty(true)
  }
  function remover(id: string) {
    if (!confirm('Remover este feriado?')) return
    setFeriados(prev => prev.filter(f => f.id !== id)); setDirty(true)
  }
  function compartilharWhats(f: FeriadoItem) {
    window.open(`https://wa.me/?text=${encodeURIComponent(textoCompartilhar(f))}`, '_blank')
  }
  function compartilharEmail(f: FeriadoItem) {
    window.open(`mailto:?subject=${encodeURIComponent('Escala de Feriado — ' + (f.nome || ''))}&body=${encodeURIComponent(textoCompartilhar(f))}`, '_blank')
  }

  const nomesProfissionais = profissionais.filter(p => p.ativo !== false).map(nomeDe)

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, doc: { feriados } }) })
      if (res.ok) { toast.success('Escala de feriados salva!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  async function imprimir() {
    const logoSalao = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const linhas = feriados.map(f => `<tr><td>${esc(f.nome)}</td><td>${esc(f.data)}</td><td class="c">${f.fechado ? '<span class="fechado">FECHADO</span>' : esc(f.horario)}</td><td>${f.fechado ? '—' : esc(f.profissionais)}</td><td>${esc(f.obs) || '—'}</td></tr>`).join('')
    const cab = logoSalao ? `<img src="${logoSalao}" class="logo"/>` : `<div class="brand">NODRI</div>`
    const css = `@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px}.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${COR};padding-bottom:10px;margin-bottom:10px}.logo{max-height:56px;max-width:200px;object-fit:contain}.brand{font-size:22px;font-weight:900;color:${COR}}h1{font-size:16px;margin-bottom:12px;text-transform:uppercase}table{width:100%;border-collapse:collapse}th,td{border:1px solid #f0ede6;padding:7px 9px;text-align:left;vertical-align:top}th{background:#f6f4ff;color:${COR};border-bottom:2px solid ${COR};font-size:9.5px;text-transform:uppercase}td.c,th.c{text-align:center}.fechado{color:#dc2626;font-weight:800}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Escala de Feriados</title><style>${css}</style></head><body><div class="hd">${cab}<span style="font-size:10px;color:#777">${new Date().toLocaleDateString('pt-BR')}</span></div><h1>Escala de Feriados</h1><table><thead><tr><th>Feriado</th><th>Data</th><th class="c">Horário</th><th>Escalados</th><th>Obs</th></tr></thead><tbody>${linhas}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=1100,height=750'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div>
      <style>{`
        .fer-input { width:100%; border:1px solid transparent; background:transparent; outline:none; font-family:inherit; padding:6px 7px; border-radius:6px; font-size:13px; }
        .fer-input:focus, .fer-input:hover { border-color:#d0cdc7; background:#fff; }
        .fer-card { background:#fff; border:1px solid #e8e6e0; border-radius:14px; padding:16px 18px; transition:box-shadow .15s, border-color .15s; }
        .fer-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.06); border-color:#d9d5f5; }
        .fer-iconbtn { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:8px; border:none; cursor:pointer; }
      `}</style>

      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '10px 12px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><PartyPopper size={16} color={COR} /> Escala de Feriados</h2>
        <div style={{ flex: 1 }} />
        {dirty && !salvando && <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Alterações não salvas</span>}
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir A4</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>

      <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '0 0 16px' }}>Os feriados marcados aqui aparecem automaticamente no card "Feriados" da Escala de Trabalho, no mês correspondente. Marque "Fechado" quando o salão não abrir, e use os botões de WhatsApp/E-mail pra avisar a equipe sobre um feriado específico.</p>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div> : (
        <>
          {feriados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
              Nenhum feriado cadastrado ainda. Clique em <strong style={{ color: COR }}>+ Adicionar feriado</strong> para começar.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {feriados.map(f => (
                <div key={f.id} className="fer-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px', minWidth: 160 }}>
                      <input value={f.nome} onChange={e => editar(f.id, { nome: e.target.value })} className="fer-input" style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a', padding: '4px 6px' }} placeholder="Nome do feriado" />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: '#9ca3af' }}>
                        <CalendarDays size={13} />
                        <input value={f.data} onChange={e => editar(f.id, { data: e.target.value })} className="fer-input" style={{ fontSize: 12.5, padding: '2px 4px' }} placeholder="dd/mm/aaaa" />
                      </div>
                    </div>

                    <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Fechado?</label>
                      <input type="checkbox" checked={f.fechado} onChange={e => editar(f.id, { fechado: e.target.checked })} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                    </div>

                    {f.fechado ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fef2f2', color: '#dc2626', fontWeight: 800, fontSize: 12, padding: '6px 12px', borderRadius: 20 }}>FECHADO</span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
                        <Clock size={13} color="#9ca3af" />
                        <input value={f.horario} onChange={e => editar(f.id, { horario: e.target.value })} className="fer-input" style={{ width: 140, fontSize: 12.5 }} placeholder="10:00 às 18:00" />
                      </div>
                    )}

                    <div style={{ flex: '1 1 260px', minWidth: 200 }}>
                      <label style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Profissionais escalados</label>
                      {f.fechado ? <span style={{ fontSize: 12.5, color: '#9ca3af' }}>—</span> : <SeletorNomes value={f.profissionais} onChange={v => editar(f.id, { profissionais: v })} opcoes={nomesProfissionais} />}
                    </div>

                    <div style={{ display: 'flex', gap: 4, flex: '0 0 auto', marginLeft: 'auto' }}>
                      <button onClick={() => compartilharWhats(f)} title="Compartilhar no WhatsApp" className="fer-iconbtn" style={{ background: '#e9f9ee', color: '#16a34a' }}><MessageCircle size={15} /></button>
                      <button onClick={() => compartilharEmail(f)} title="Compartilhar por e-mail" className="fer-iconbtn" style={{ background: '#eef2ff', color: '#4f46e5' }}><Mail size={15} /></button>
                      <button onClick={() => remover(f.id)} title="Remover" className="fer-iconbtn" style={{ background: '#fef2f2', color: '#dc2626' }}><Trash2 size={15} /></button>
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <input value={f.obs} onChange={e => editar(f.id, { obs: e.target.value })} className="fer-input" style={{ fontSize: 12.5, color: '#6b6860' }} placeholder="Observação (opcional)" />
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={adicionar} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 14, padding: '9px 14px', borderRadius: 10, border: `1.5px dashed ${COR}`, background: '#f8f7ff', color: COR, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Plus size={14} /> Adicionar feriado</button>
        </>
      )}
    </div>
  )
}
