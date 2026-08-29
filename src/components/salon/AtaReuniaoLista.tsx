'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Plus, Trash2, Pencil, X, Printer, FileText, CheckCircle2, Users } from 'lucide-react'
import { getLogoSalao } from '@/lib/logoSalao'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

interface ProfSalao { id: string; nome: string; telefone?: string }
interface PautaItem { id: string; ponto: string; responsavel: string; acontecimento?: string; decisao: string; feito?: boolean; feitoEm?: string }
interface Assinatura { id: string; nome: string; assinado: boolean; assinadoEm: string }
interface Ata { id: string; titulo: string; data: string; pauta: PautaItem[]; assinaturas: Assinatura[] }

const COR = '#5b4fcf'
const rid = () => Math.random().toString(36).slice(2, 9)
function mesAtual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function hojeBR() { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` }
function agoraHM() { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
function brToIso(s: string) { const m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : '' }
function isoToBr(s: string) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : s }

function novaAta(): Ata {
  return {
    id: rid(), titulo: 'Reunião de Equipe', data: hojeBR(),
    pauta: Array.from({ length: 3 }, () => ({ id: rid(), ponto: '', responsavel: '', acontecimento: '', decisao: '', feito: false, feitoEm: '' })),
    assinaturas: [],
  }
}

// Campo da pauta que cresce com o texto.
//
// Era um <input>: a linha é fina, e o que passava da largura sumia para o
// lado. Quem escrevia "foi definido o salário e os benefícios..." via só o
// começo e não tinha como conferir o resto sem clicar e navegar com a seta.
// Numa ata isso é grave: o texto é o registro.
function CampoAta({ valor, aoMudar, placeholder, estilo }: {
  valor: string
  aoMudar: (v: string) => void
  placeholder?: string
  estilo?: React.CSSProperties
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Zera antes de medir: sem isso a altura só cresce, e apagar texto deixaria
  // a linha alta com espaço em branco embaixo.
  const ajustar = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  // Também ao montar e quando o texto vem do servidor — ata que abre com
  // conteúdo já escrito precisa nascer no tamanho certo, sem ninguém digitar.
  useEffect(() => { ajustar() }, [valor, ajustar])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={valor}
      onChange={e => aoMudar(e.target.value)}
      onInput={ajustar}
      placeholder={placeholder}
      className="ata-input ata-campo"
      style={{ fontSize: 13, ...estilo }}
    />
  )
}
export default function AtaReuniaoLista({ chave = 'ata', profsSalao = [] }: { chave?: string; profsSalao?: ProfSalao[] }) {
  const [mes, setMes] = useState(mesAtual())
  const [atas, setAtas] = useState<Ata[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Ata de Reunião') // avisa "Deseja salvar?" antes de sair sem salvar

  const chaveMes = `${chave}_${mes}`

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chaveMes)}`).then(r => r.ok ? r.json() : null)
      setAtas(Array.isArray(d?.atas) ? d.atas : [])
      setDirty(false)
    } catch { setAtas([]); setDirty(false) }
    setLoading(false)
  }, [chaveMes])
  useEffect(() => { carregar() }, [carregar])

  function mut(fn: (as: Ata[]) => Ata[]) { setAtas(prev => fn(JSON.parse(JSON.stringify(prev)))); setDirty(true) }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: chaveMes, doc: { atas } }) })
      if (res.ok) { toast.success('Atas salvas!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function adicionarAta() { mut(as => [novaAta(), ...as]) }
  function excluirAta(id: string) { if (!confirm('Excluir esta ata inteira?')) return; mut(as => as.filter(a => a.id !== id)) }
  function editarAta(id: string, patch: Partial<Ata>) { mut(as => as.map(a => a.id === id ? { ...a, ...patch } : a)) }

  function addPauta(ataId: string) { mut(as => as.map(a => a.id === ataId ? { ...a, pauta: [...a.pauta, { id: rid(), ponto: '', responsavel: '', acontecimento: '', decisao: '', feito: false, feitoEm: '' }] } : a)) }
  function delPauta(ataId: string, itemId: string) { mut(as => as.map(a => a.id === ataId ? { ...a, pauta: a.pauta.filter(p => p.id !== itemId) } : a)) }
  function editPauta(ataId: string, itemId: string, patch: Partial<PautaItem>) {
    mut(as => as.map(a => a.id === ataId ? { ...a, pauta: a.pauta.map(p => p.id === itemId ? { ...p, ...patch } : p) } : a))
  }
  // "Foi feito" segue o mesmo padrão de assinar/desfazer: carimba data e hora
  // ao marcar, e apaga o carimbo se desmarcar — nunca guarda os dois estados.
  function marcarFeito(ataId: string, itemId: string, valor: boolean) {
    editPauta(ataId, itemId, { feito: valor, feitoEm: valor ? `${hojeBR()} ${agoraHM()}` : '' })
  }

  function addAssinatura(ataId: string, nome: string) {
    if (!nome.trim()) return
    mut(as => as.map(a => a.id === ataId ? { ...a, assinaturas: [...a.assinaturas, { id: rid(), nome, assinado: false, assinadoEm: '' }] } : a))
  }
  function delAssinatura(ataId: string, sigId: string) { mut(as => as.map(a => a.id === ataId ? { ...a, assinaturas: a.assinaturas.filter(s => s.id !== sigId) } : a)) }
  function assinar(ataId: string, sigId: string) {
    mut(as => as.map(a => a.id === ataId ? { ...a, assinaturas: a.assinaturas.map(s => s.id === sigId ? { ...s, assinado: true, assinadoEm: `${hojeBR()} ${agoraHM()}` } : s) } : a))
  }
  function desfazerAssinatura(ataId: string, sigId: string) {
    mut(as => as.map(a => a.id === ataId ? { ...a, assinaturas: a.assinaturas.map(s => s.id === sigId ? { ...s, assinado: false, assinadoEm: '' } : s) } : a))
  }

  async function imprimirAta(a: Ata) {
    const logoSalao = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Agora dá para dar Enter dentro do campo; sem isto a quebra sumia e o
    // papel saía com tudo emendado numa linha só.
    const escL = (v: any) => esc(v).replace(/\n/g, '<br>')
    const linhasPauta = a.pauta.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${escL(p.ponto)}</td><td>${escL(p.responsavel)}</td><td>${escL(p.acontecimento || '')}</td><td>${escL(p.decisao)}</td><td class="c">${p.feito ? `✓ ${esc(p.feitoEm || '')}` : ''}</td></tr>`).join('')
    const linhasAssin = a.assinaturas.map(s => `<tr><td>${esc(s.nome)}</td><td class="sig"></td><td class="c">${s.assinado ? `✓ ${esc(s.assinadoEm)}` : ''}</td></tr>`).join('')
    const cab = logoSalao ? `<img src="${logoSalao}" class="logo"/>` : `<div class="brand">NODRI</div>`
    // Paisagem: com Acontecimento e Foi feito a pauta passou a ter 6 colunas,
    // e em retrato o texto de cada uma quebrava em tira estreita.
    const css = `@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px}.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${COR};padding-bottom:10px;margin-bottom:14px}.logo{max-height:56px;max-width:200px;object-fit:contain}.brand{font-size:22px;font-weight:900;color:${COR}}h1{font-size:17px;margin-bottom:2px;text-transform:uppercase}.sub{font-size:11px;color:#888;margin-bottom:18px}h2{font-size:12.5px;color:${COR};margin:16px 0 6px;text-transform:uppercase;border-bottom:1.5px solid ${COR};padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-bottom:6px}th,td{border:1px solid #f0ede6;padding:7px 9px;text-align:left;vertical-align:top}th{background:#f6f4ff;color:${COR};border-bottom:2px solid ${COR};font-size:9.5px;text-transform:uppercase}td.c,th.c{text-align:center}td.sig{width:180px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(a.titulo)}</title><style>${css}</style></head><body><div class="hd">${cab}<span style="font-size:10px;color:#777">${new Date().toLocaleDateString('pt-BR')}</span></div><h1>${esc(a.titulo)}</h1><div class="sub">Data da reunião: ${esc(a.data)}</div><h2>Pauta</h2><table><thead><tr><th class="c">Nº</th><th>Ponto</th><th>Responsável</th><th>Acontecimento</th><th>Decisão / Encaminhamento</th><th class="c">Foi feito</th></tr></thead><tbody>${linhasPauta}</tbody></table><h2>Assinaturas</h2><table><thead><tr><th>Profissional</th><th>Assinatura</th><th class="c">Confirmado no sistema</th></tr></thead><tbody>${linhasAssin}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=1000,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div>
      <style>{`
        .ata-input { width:100%; border:none; background:transparent; outline:none; font-family:inherit; padding:6px 4px; }
        .ata-input:focus { background:#f6f4ff; border-radius:6px; }
        /* overflow:hidden porque a altura é ajustada no código: com barra de
           rolagem própria a medida do conteúdo sai errada e a linha fica curta. */
        .ata-campo { resize:none; overflow:hidden; display:block; line-height:1.45; min-height:30px; }
        .ata-pauta-table td { border-bottom:1px solid #f0eee8; vertical-align:top; }
        .ata-pauta-table th { text-align:left; font-size:11px; font-weight:800; color:#6b6860; text-transform:uppercase; letter-spacing:.3px; padding:8px 6px; background:#faf9f7; }
      `}</style>

      {/* ── Mês + ações ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '10px 12px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860' }}>Mês:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 9px', borderRadius: 8, border: '1px solid #d0cdc7', fontSize: 13 }} />
        <div style={{ flex: 1 }} />
        {dirty && !salvando && <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Alterações não salvas</span>}
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
        <button onClick={adicionarAta} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Nova Ata</button>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div> : (
        atas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
            Nenhuma ata neste mês ainda. Clique em <strong style={{ color: COR }}>+ Nova Ata</strong> para começar.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {atas.map(a => (
              <div key={a.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 16, overflow: 'hidden' }}>
                {/* Cabeçalho da ata */}
                <div style={{ background: '#f6f4ff', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <FileText size={18} color={COR} />
                  <input value={a.titulo} onChange={e => editarAta(a.id, { titulo: e.target.value })} className="ata-input" style={{ flex: '1 1 200px', fontSize: 15, fontWeight: 800, color: '#1a1a1a' }} placeholder="Título da reunião" />
                  <input type="date" value={brToIso(a.data)} onChange={e => editarAta(a.id, { data: isoToBr(e.target.value) })} style={{ padding: '6px 9px', borderRadius: 7, border: '1.5px solid #d0cdc7', fontSize: 12.5 }} />
                  <button onClick={() => imprimirAta(a)} title="Imprimir esta ata" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><Printer size={13} /> Imprimir</button>
                  <button onClick={() => excluirAta(a.id)} title="Excluir ata" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 6 }}><Trash2 size={15} /></button>
                </div>

                {/* Pauta */}
                <div style={{ padding: 18 }}>
                  <h4 style={{ fontSize: 12.5, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: '.3px', margin: '0 0 8px' }}>Pauta</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="ata-pauta-table" style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ width: 36 }}>Nº</th>
                          <th>Ponto a apresentar</th>
                          <th style={{ width: 130 }}>Responsável</th>
                          <th style={{ width: 160 }}>Acontecimento</th>
                          <th>Decisão / Encaminhamento</th>
                          <th style={{ width: 175 }}>Foi feito</th>
                          <th style={{ width: 30 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.pauta.map((p, i) => (
                          <tr key={p.id}>
                            <td style={{ textAlign: 'center', color: '#9ca3af', fontWeight: 700, fontSize: 12.5 }}>{i + 1}</td>
                            <td><CampoAta valor={p.ponto} aoMudar={v => editPauta(a.id, p.id, { ponto: v })} placeholder="Assunto discutido..." /></td>
                            <td><CampoAta valor={p.responsavel} aoMudar={v => editPauta(a.id, p.id, { responsavel: v })} placeholder="Quem" /></td>
                            <td><CampoAta valor={p.acontecimento || ''} aoMudar={v => editPauta(a.id, p.id, { acontecimento: v })} placeholder="O que aconteceu..." /></td>
                            <td><CampoAta valor={p.decisao} aoMudar={v => editPauta(a.id, p.id, { decisao: v })} placeholder="O que ficou definido..." /></td>
                            <td>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 4px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={!!p.feito} onChange={e => marcarFeito(a.id, p.id, e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: COR, flexShrink: 0 }} />
                                {p.feito && p.feitoEm && (
                                  <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', whiteSpace: 'nowrap' }}>{p.feitoEm}</span>
                                )}
                              </label>
                            </td>
                            <td><button onClick={() => delPauta(a.id, p.id)} style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}><X size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={() => addPauta(a.id)} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px dashed #d0cdc7', background: '#faf9f7', color: '#6b6860', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><Plus size={12} /> Adicionar ponto</button>
                </div>

                {/* Assinaturas */}
                <div style={{ padding: '0 18px 18px' }}>
                  <h4 style={{ fontSize: 12.5, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: '.3px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}><Users size={13} /> Assinaturas dos profissionais</h4>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 10px' }}>Passe o dispositivo — cada profissional confirma a própria assinatura clicando em "Assinar".</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {a.assinaturas.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 9, background: s.assinado ? '#f0fdf4' : '#faf9f7', border: `1px solid ${s.assinado ? '#bbf7d0' : '#eceae4'}`, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 13, color: '#1a1a1a', flex: '1 1 140px' }}>{s.nome}</strong>
                        {s.assinado ? (
                          <>
                            <span style={{ fontSize: 11.5, fontWeight: 800, color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={13} /> Assinado às {s.assinadoEm}</span>
                            <button onClick={() => desfazerAssinatura(a.id, s.id)} style={{ fontSize: 11, color: '#9ca3af', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>desfazer</button>
                          </>
                        ) : (
                          <button onClick={() => assinar(a.id, s.id)} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: COR, color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Assinar</button>
                        )}
                        <button onClick={() => delAssinatura(a.id, s.id)} title="Remover" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                  <SeletorAdicionarAssinatura profsSalao={profsSalao} jaAdicionados={a.assinaturas.map(s => s.nome)} onAdicionar={nome => addAssinatura(a.id, nome)} />
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

function SeletorAdicionarAssinatura({ profsSalao, jaAdicionados, onAdicionar }: { profsSalao: ProfSalao[]; jaAdicionados: string[]; onAdicionar: (nome: string) => void }) {
  const [nome, setNome] = useState('')
  const disponiveis = profsSalao.filter(p => !jaAdicionados.includes(p.nome))
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input list="ata-profs" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do profissional..." style={{ flex: '1 1 200px', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />
      <datalist id="ata-profs">{disponiveis.map(p => <option key={p.id} value={p.nome} />)}</datalist>
      <button onClick={() => { onAdicionar(nome); setNome('') }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}><Plus size={13} /> Adicionar à lista</button>
    </div>
  )
}
