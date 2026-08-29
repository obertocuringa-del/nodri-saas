'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Play, Pause, Trophy, X, Medal } from 'lucide-react'
import {
  type CorridaInterna, type LinhaRanking, type MetricaCorrida,
  METRICAS_CORRIDA, METRICAS_ESCOLHIVEIS, metricaInfo, statusCorrida, STATUS_CORRIDA,
  periodoLabel, formataValor, MEDALHAS, ridC,
} from '@/lib/corridasInternas'
import { useModulos } from '@/lib/useModulos'
import AvisoPlano from './AvisoPlano'

const CSS = `
.ci-wrap { display:flex; flex-direction:column; gap:16px }
.ci-cards { display:grid; grid-template-columns:1fr 1fr; gap:14px }
.ci-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px }
@media (max-width:720px){
  .ci-cards { grid-template-columns:1fr }
  .ci-form-grid { grid-template-columns:1fr }
}
.ci-inp { width:100%; padding:9px 11px; border:1.5px solid #e5e3dd; border-radius:9px; font-size:13px; background:#fff; color:#1a1a1a }
.ci-inp:focus { outline:none; border-color:#16a34a }
.ci-lbl { font-size:11px; font-weight:800; color:#6b6860; text-transform:uppercase; letter-spacing:.4px; margin-bottom:5px; display:block }
`

interface ProfLeve { id: string; nome: string }

export default function CorridasInternas() {
  const [corridas, setCorridas] = useState<CorridaInterna[]>([])
  const [rankings, setRankings] = useState<Record<string, LinhaRanking[]>>({})
  const [medalhas, setMedalhas] = useState<{ profId: string; nome: string; total: number; corridas: { id: string; titulo: string }[] }[]>([])
  const [profs, setProfs] = useState<ProfLeve[]>([])
  const [servicosRel, setServicosRel] = useState<{ nome: string; quantidade: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<CorridaInterna | null>(null)
  const [saving, setSaving] = useState(false)
  const { tem, carregado: carregouModulos } = useModulos()
  const temRelatorios = tem('relatorios')

  async function carregar() {
    setLoading(true)
    try {
      const r = await fetch('/api/salon/corridas', { credentials: 'include' })
      const d = await r.json()
      setCorridas(Array.isArray(d.corridas) ? d.corridas : [])
      setRankings(d.rankings && typeof d.rankings === 'object' ? d.rankings : {})
      setMedalhas(Array.isArray(d.medalhas) ? d.medalhas : [])
    } catch { toast.error('Não foi possível carregar as corridas') }
    setLoading(false)
  }
  useEffect(() => { carregar() }, [])
  useEffect(() => {
    fetch('/api/profissionais?leve=1').then(r => r.ok ? r.json() : []).then((arr: any[]) => {
      const lista = (Array.isArray(arr) ? arr : [])
        .filter(p => p.ativo !== false && !p.is_departamento)
        .map(p => ({ id: p.id, nome: p.apelido || p.nome_completo || p.nome || 'Profissional' }))
      setProfs(lista)
    }).catch(() => {})
    fetch('/api/salon/corridas/servicos', { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d && Array.isArray(d.servicos)) setServicosRel(d.servicos)
    }).catch(() => {})
  }, [])

  async function salvarLista(lista: CorridaInterna[]) {
    setSaving(true)
    try {
      const r = await fetch('/api/salon/corridas', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ corridas: lista }),
      })
      if (!r.ok) throw new Error()
      setCorridas(lista)
      await carregar()
      return true
    } catch { toast.error('Erro ao salvar'); return false }
    finally { setSaving(false) }
  }

  function novo() {
    const hoje = new Date()
    const ym = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
    setEdit({ id: ridC(), titulo: '', metrica: 'faturamento', de: ym, ate: ym, topPremiado: 3, ocultarValores: true, ativa: true, criadoEm: Date.now() })
  }

  async function salvarCorrida(c: CorridaInterna) {
    if (!c.titulo.trim()) { toast.error('Dê um nome à corrida'); return }
    if (metricaInfo(c.metrica).precisaServico && !c.servico?.trim()) { toast.error('Informe o nome do serviço'); return }
    if (c.de > c.ate) { toast.error('O período final não pode ser antes do inicial'); return }
    const existe = corridas.some(x => x.id === c.id)
    const lista = existe ? corridas.map(x => x.id === c.id ? c : x) : [c, ...corridas]
    const ok = await salvarLista(lista)
    if (ok) { setEdit(null); toast.success(existe ? 'Corrida atualizada' : 'Corrida criada!') }
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta corrida?')) return
    await salvarLista(corridas.filter(c => c.id !== id))
  }
  async function toggleAtiva(c: CorridaInterna) {
    await salvarLista(corridas.map(x => x.id === c.id ? { ...x, ativa: !x.ativa } : x))
  }

  return (
    <div className="ci-wrap">
      <style>{CSS}</style>

      {/* A corrida é da versão base, mas o ranking sai de `relatorio_periodos`
          — a tabela que a importação dos Relatórios preenche. Sem o módulo,
          o salão criaria a competição e veria todo mundo zerado, sem saber se
          o problema é o sistema ou se ninguém pontuou. */}
      {carregouModulos && !temRelatorios && (
        <AvisoPlano compacto modulo="relatorios" oQue="O ranking automático da corrida" />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 13, color: '#6b6860', lineHeight: 1.5, margin: 0 }}>
            Crie competições entre os profissionais. O <b>ranking é automático</b>, puxado do relatório importado.
            As corridas <b>publicadas</b> aparecem no portal de cada profissional no card <b>Corrida Interna</b>.
          </p>
        </div>
        <button onClick={novo}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Plus size={16} /> Nova corrida
        </button>
      </div>

      {/* Quadro de medalhas — uma medalha por corrida em que a pessoa bateu a
          meta. Fica acima das corridas porque é o acumulado do ano; cada
          corrida abaixo é só a disputa do momento. */}
      {!loading && medalhas.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 16, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Medal size={17} style={{ color: '#d97706' }} />
            <span style={{ fontSize: 14, fontWeight: 900, color: '#92400e' }}>Quadro de medalhas</span>
          </div>
          <p style={{ fontSize: 11.5, color: '#a16207', margin: '0 0 12px', lineHeight: 1.5 }}>
            Uma medalha por corrida em que a profissional bateu a meta. Todo mundo
            vê este quadro no portal — inclusive as medalhas das colegas.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {medalhas.map((m, i) => (
              <div key={m.profId} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1px solid #fef3c7', borderRadius: 10, padding: '8px 11px' }}>
                <span style={{ width: 24, textAlign: 'center', fontSize: 12.5, fontWeight: 900, color: '#a16207' }}>{i + 1}º</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}</span>
                <span title={m.corridas.map(c => c.titulo).join(', ')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fef3c7', color: '#92400e', borderRadius: 99, padding: '3px 10px', fontSize: 12.5, fontWeight: 900, whiteSpace: 'nowrap' }}>
                  <Medal size={13} /> {m.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Carregando…</div>
      ) : corridas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '46px 20px', color: '#6b6860', background: '#fff', border: '1.5px dashed #e5e3dd', borderRadius: 14 }}>
          <Trophy size={34} style={{ margin: '0 auto 10px', color: '#d1d5db' }} />
          <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Nenhuma corrida ainda</p>
          <p style={{ fontSize: 13, margin: 0 }}>Clique em <b>Nova corrida</b> para criar a primeira competição.</p>
        </div>
      ) : (
        <div className="ci-cards">
          {corridas.map(c => (
            <CardCorrida key={c.id} c={c} ranking={rankings[c.id] || []}
              onEdit={() => setEdit(c)} onExcluir={() => excluir(c.id)} onToggle={() => toggleAtiva(c)} />
          ))}
        </div>
      )}

      {edit && (
        <FormCorrida corrida={edit} profs={profs} servicosRel={servicosRel} saving={saving}
          onCancel={() => setEdit(null)} onSalvar={salvarCorrida} />
      )}
    </div>
  )
}

// ── Card de uma corrida (visão do salão) ──
function CardCorrida({ c, ranking, onEdit, onExcluir, onToggle }: {
  c: CorridaInterna; ranking: LinhaRanking[]
  onEdit: () => void; onExcluir: () => void; onToggle: () => void
}) {
  const st = statusCorrida(c)
  const info = metricaInfo(c.metrica)
  const sinfo = STATUS_CORRIDA[st]
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e8e6e0', borderLeft: '4px solid #16a34a', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{info.emoji}</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>{c.titulo}</h3>
            <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 9px', borderRadius: 20, background: sinfo.bg, color: sinfo.cor }}>{sinfo.label}</span>
          </div>
          <div style={{ fontSize: 12, color: '#6b6860' }}>
            {info.label} · {periodoLabel(c)}
            {typeof c.meta === 'number' && c.meta > 0 && <> · meta {formataValor(c.metrica, c.meta)}</>}
          </div>
          {c.premio && <div style={{ fontSize: 12.5, color: '#b45309', fontWeight: 700, marginTop: 3 }}>{c.premio}</div>}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={onToggle} title={c.ativa ? 'Pausar (esconder dos profissionais)' : 'Publicar'} style={btnIco}>{c.ativa ? <Pause size={15} /> : <Play size={15} />}</button>
          <button onClick={onEdit} title="Editar" style={btnIco}><Pencil size={15} /></button>
          <button onClick={onExcluir} title="Excluir" style={{ ...btnIco, color: '#dc2626' }}><Trash2 size={15} /></button>
        </div>
      </div>

      {c.descricao && <div style={{ fontSize: 12, color: '#57534e', whiteSpace: 'pre-wrap', background: '#faf9f7', borderRadius: 8, padding: '8px 10px' }}>{c.descricao}</div>}

      <Ranking ranking={ranking} c={c} />
    </div>
  )
}

// ── Ranking (usado no salão e reaproveitável) ──
function Ranking({ ranking, c, destacarId }: { ranking: LinhaRanking[]; c: CorridaInterna; destacarId?: string }) {
  if (!ranking.length) {
    return <div style={{ fontSize: 12.5, color: '#9ca3af', textAlign: 'center', padding: '14px 8px', background: '#faf9f7', borderRadius: 8 }}>
      Sem dados do período ainda — importe o relatório dos meses da corrida.
    </div>
  }
  const top = c.topPremiado || 3
  const esconder = !!c.ocultarValores
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {ranking.map(l => {
        const noPodio = l.pos <= top
        const eu = destacarId && l.profId === destacarId
        return (
          <div key={l.profId} style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 9,
            background: eu ? '#dcfce7' : noPodio ? '#f0fdf4' : '#fafafa',
            border: eu ? '1.5px solid #16a34a' : '1px solid #f0eee8',
          }}>
            <span style={{ width: 26, textAlign: 'center', fontSize: l.pos <= 3 ? 16 : 12.5, fontWeight: 900, color: '#6b6860' }}>
              {l.pos <= 3 ? MEDALHAS[l.pos - 1] : `${l.pos}º`}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: eu || noPodio ? 800 : 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {l.nome}{eu ? ' (você)' : ''}
            </span>
            {typeof l.pctMeta === 'number' && (
              <span style={{ fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 20, background: l.bateuMeta ? '#16a34a' : '#e5e7eb', color: l.bateuMeta ? '#fff' : '#6b7280' }}>
                {l.bateuMeta ? '✓ bateu' : `${l.pctMeta}%`}
              </span>
            )}
            {!esconder && (
              <span style={{ fontSize: 13, fontWeight: 900, color: '#15803d', whiteSpace: 'nowrap' }}>{formataValor(c.metrica, l.valor)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
export { Ranking }

// ── Formulário (modal) ──
function FormCorrida({ corrida, profs, servicosRel, saving, onCancel, onSalvar }: {
  corrida: CorridaInterna; profs: ProfLeve[]; servicosRel: { nome: string; quantidade: number }[]; saving: boolean
  onCancel: () => void; onSalvar: (c: CorridaInterna) => void
}) {
  const [c, setC] = useState<CorridaInterna>(corrida)
  const set = (patch: Partial<CorridaInterna>) => setC(v => ({ ...v, ...patch }))
  const info = metricaInfo(c.metrica)
  const todos = !c.participantes || c.participantes.length === 0

  function toggleProf(id: string) {
    const atual = new Set(c.participantes || [])
    if (atual.has(id)) atual.delete(id); else atual.add(id)
    set({ participantes: Array.from(atual) })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 560, width: '100%', margin: 'auto', overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}>
        <div style={{ background: 'linear-gradient(135deg,#16a34a,#0891b2)', color: '#fff', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 900, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={18} /> {corrida.titulo ? 'Editar corrida' : 'Nova corrida'}</span>
          <button onClick={onCancel} style={{ border: 'none', background: 'rgba(255,255,255,.25)', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="ci-lbl">Nome da corrida *</label>
            <input className="ci-inp" value={c.titulo} onChange={e => set({ titulo: e.target.value })} placeholder="Ex.: Quem mais faturar em Julho" autoFocus />
          </div>

          <div>
            <label className="ci-lbl">O que conta (métrica) *</label>
            <select className="ci-inp" value={c.metrica} onChange={e => set({ metrica: e.target.value as MetricaCorrida })}>
              {/* Só as escolhíveis: as ocultas seguem calculando para as corridas
                  antigas que já as usam, mas não se cria disputa nova com elas. */}
              {METRICAS_ESCOLHIVEIS.map(m => <option key={m.chave} value={m.chave}>{m.emoji} {m.label}</option>)}
              {/* A métrica desta corrida, se for uma das aposentadas, precisa
                  aparecer no menu — senão abrir para editar já trocaria a métrica
                  dela sem ninguém pedir. */}
              {METRICAS_CORRIDA.filter(m => m.oculta && m.chave === c.metrica)
                .map(m => <option key={m.chave} value={m.chave}>{m.label} (aposentada)</option>)}
            </select>
            <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 4 }}>{info.desc}</div>
          </div>

          {info.precisaServico && (
            <div>
              <label className="ci-lbl">Nome do serviço *</label>
              <input className="ci-inp" value={c.servico || ''} onChange={e => set({ servico: e.target.value })}
                list="ci-servicos-sugestoes" placeholder="Ex.: Escova Progressiva" />
              {servicosRel.length > 0 && (
                <datalist id="ci-servicos-sugestoes">
                  {servicosRel.map(s => <option key={s.nome} value={s.nome} />)}
                </datalist>
              )}
              <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 4 }}>
                Digite igual ao nome do serviço no sistema. O ranking conta sozinho quantos foram vendidos — mesmo que a corrida comece com zero (igual às Ações Comerciais).
              </div>
            </div>
          )}

          <div className="ci-form-grid">
            <div>
              <label className="ci-lbl">Mês inicial *</label>
              <input type="month" className="ci-inp" value={c.de} onChange={e => set({ de: e.target.value })} />
            </div>
            <div>
              <label className="ci-lbl">Mês final *</label>
              <input type="month" className="ci-inp" value={c.ate} onChange={e => set({ ate: e.target.value })} />
            </div>
          </div>

          <div className="ci-form-grid">
            <div>
              <label className="ci-lbl">Meta a bater (opcional)</label>
              <input type="number" className="ci-inp" value={c.meta ?? ''} onChange={e => set({ meta: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder={info.unidade === 'R$' ? 'Ex.: 15000' : 'Ex.: 50'} />
            </div>
            <div>
              <label className="ci-lbl">Pódio destacado</label>
              <input type="number" min={1} max={10} className="ci-inp" value={c.topPremiado ?? 3} onChange={e => set({ topPremiado: Math.max(1, Number(e.target.value) || 3) })} />
            </div>
          </div>

          <div>
            <label className="ci-lbl">Prêmio (opcional)</label>
            <input className="ci-inp" value={c.premio || ''} onChange={e => set({ premio: e.target.value })} placeholder="Ex.: R$ 200 + folga na sexta" />
          </div>

          <div>
            <label className="ci-lbl">Regras / observação (opcional)</label>
            <textarea className="ci-inp" style={{ minHeight: 64, resize: 'vertical' }} value={c.descricao || ''} onChange={e => set({ descricao: e.target.value })} placeholder="Explique como funciona, critério de desempate, etc." />
          </div>

          <div>
            <label className="ci-lbl">Quem participa</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              <button type="button" onClick={() => set({ participantes: [] })}
                style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', border: '1.5px solid', borderColor: todos ? '#16a34a' : '#e5e3dd', background: todos ? '#dcfce7' : '#fff', color: todos ? '#15803d' : '#6b6860' }}>
                Todos os profissionais
              </button>
            </div>
            {!todos && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profs.map(p => {
                  const sel = (c.participantes || []).includes(p.id)
                  return (
                    <button key={p.id} type="button" onClick={() => toggleProf(p.id)}
                      style={{ fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 20, cursor: 'pointer', border: '1.5px solid', borderColor: sel ? '#16a34a' : '#e5e3dd', background: sel ? '#dcfce7' : '#fff', color: sel ? '#15803d' : '#6b6860' }}>
                      {sel ? '✓ ' : ''}{p.nome}
                    </button>
                  )
                })}
              </div>
            )}
            {todos && profs.length > 0 && (
              <button type="button" onClick={() => set({ participantes: profs.map(p => p.id) })}
                style={{ fontSize: 11.5, color: '#0891b2', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                escolher só alguns
              </button>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13, color: '#57534e' }}>
            <input type="checkbox" checked={!!c.ocultarValores} onChange={e => set({ ocultarValores: e.target.checked })} style={{ width: 17, height: 17 }} />
            Esconder os números dos colegas (o profissional vê só as posições)
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 13, color: '#57534e' }}>
            <input type="checkbox" checked={c.ativa} onChange={e => set({ ativa: e.target.checked })} style={{ width: 17, height: 17 }} />
            Publicar agora (aparece no portal dos profissionais)
          </label>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onCancel} style={{ padding: '10px 18px', borderRadius: 10, border: '1.5px solid #e5e3dd', background: '#fff', color: '#6b6860', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={() => onSalvar(c)} disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? .6 : 1 }}>
              {saving ? 'Salvando…' : 'Salvar corrida'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const btnIco: React.CSSProperties = { width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid #e5e3dd', background: '#fff', color: '#6b6860', cursor: 'pointer' }
