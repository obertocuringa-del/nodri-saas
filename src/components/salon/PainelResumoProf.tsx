'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Target, Calendar, Trophy, Megaphone, ClipboardList, Moon, Sun } from 'lucide-react'

const fmt$ = (v: number) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

// Resumo bonito (estilo Nubank/Notion) usado como aba "Início" do perfil do profissional.
// Recebe o id; busca os dados leves e exibe cards, timeline e donut. Tudo somente leitura.
export default function PainelResumoProf({ pid, nome, prof: profProp, onIrAba }: { pid?: string; nome?: string; prof?: any; onIrAba?: (aba: string) => void }) {
  const [dark, setDark] = useState(false)
  const [id, setId] = useState(pid || '')
  const [nomeP, setNomeP] = useState(nome || '')
  const [prof, setProf] = useState<any>(profProp || null)
  const [metr, setMetr] = useState<any>(null)
  const [metas, setMetas] = useState<any>(null)
  const [ag, setAg] = useState<any[]>([])
  const [acoes, setAcoes] = useState<{ campanha: string; status: string }[]>([])
  const [pend, setPend] = useState<{ titulo: string; status: string }[]>([])
  const [corrida, setCorrida] = useState<{ pontos: string; periodo: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { try { setDark(localStorage.getItem('mp_dark') === '1') } catch { } }, [])
  useEffect(() => { try { localStorage.setItem('mp_dark', dark ? '1' : '0') } catch { } }, [dark])

  useEffect(() => {
    (async () => {
      try {
        let theId = pid
        if (!theId) {
          const me = await fetch('/api/auth/me').then(r => r.ok ? r.json() : null)
          theId = me?.profissionalId; if (me?.nome) setNomeP(me.nome)
        }
        if (!theId) { setLoading(false); return }
        setId(theId)

        const hoje = new Date()
        const cur = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
        const prevD = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
        const prev = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`
        const hojeISO = hoje.toISOString().slice(0, 10)

        const [p, mt, mm, agr, ac, pe, co] = await Promise.all([
          profProp ? Promise.resolve(profProp) : fetch(`/api/profissionais/${theId}`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/profissionais/${theId}/metricas?p1_inicio=${prev}&p1_fim=${prev}&p2_inicio=${cur}&p2_fim=${cur}`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/profissionais/${theId}/metas`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/profissionais/${theId}/agendamentos?data=${encodeURIComponent(hojeISO)}`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/salon/grid?chave=acoes_comerciais_${theId}`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/pendencias?profissional_id=${theId}`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/salon/grid?chave=corrida_interna_${theId}`).then(r => r.ok ? r.json() : null).catch(() => null),
        ])
        if (p) setProf(p); setMetr(mt); setMetas(mm)
        setAg(Array.isArray(agr?.agendamentos) ? agr.agendamentos : [])
        const linhasAc = ac?.tabelas?.[0]?.linhas || []
        setAcoes(linhasAc.map((l: any[]) => ({ campanha: l?.[0]?.t || '', status: l?.[3]?.t || l?.[2]?.t || '' })).filter((x: any) => x.campanha).slice(0, 5))
        const pList = Array.isArray(pe) ? pe : (Array.isArray(pe?.pendencias) ? pe.pendencias : [])
        setPend(pList.filter((x: any) => !x.resolvido).map((x: any) => ({ titulo: x.titulo || x.descricao || x.texto || 'Pendência', status: x.em_andamento ? 'Em andamento' : 'Pendente' })).slice(0, 5))
        const linhasCo = co?.tabelas?.[0]?.linhas || []
        const linhaCo = linhasCo.find((l: any[]) => (l?.[2]?.t || '').trim())
        if (linhaCo) setCorrida({ pontos: linhaCo[2].t, periodo: linhaCo[3]?.t || '' })
      } catch { }
      setLoading(false)
    })()
  }, [pid])

  const nomeCurto = (nomeP || prof?.apelido || prof?.nome_completo || 'Profissional').split(' ')[0]
  const cargo = prof?.cargo || 'Profissional'
  const foto = prof?.foto_url || ''
  const inicial = nomeCurto.charAt(0).toUpperCase()

  const faturamento = metr?.fat_p2?.faturamento ?? metr?.p2?.faturamento ?? 0
  const fatAnterior = metr?.fat_p1?.faturamento ?? metr?.p1?.faturamento ?? 0
  const pctFat = fatAnterior > 0 ? ((faturamento - fatAnterior) / fatAnterior) * 100 : null
  const metaFinal = metas?.meta_final || 0
  const realizado = faturamento
  const pctMeta = metaFinal > 0 ? Math.min(Math.round((realizado / metaFinal) * 100), 999) : 0
  const agHoje = ag.length

  const horaDe = (a: any) => (a.hora || a.horario || a.hora_inicio || a.hora_reserva || a.hora_agendamento || '').toString().slice(0, 5)
  const agOrden = [...ag].sort((a, b) => horaDe(a).localeCompare(horaDe(b))).slice(0, 6)

  const vars: any = dark ? {
    '--bg': '#0f1117', '--card': '#1b1f2b', '--card2': '#222636', '--txt': '#eef0f6', '--txt2': '#9aa3b8', '--txt3': '#6b7488', '--bord': '#2a2f40', '--accent': '#8b7cff', '--accentSoft': '#2a2550',
  } : {
    '--bg': '#F8F9FC', '--card': '#ffffff', '--card2': '#f6f5ff', '--txt': '#1a1a2e', '--txt2': '#6b7280', '--txt3': '#9ca3af', '--bord': '#edeef3', '--accent': '#7c5cfc', '--accentSoft': '#f0edff',
  }

  const statusCor = (s: string): [string, string] => {
    const t = (s || '').toLowerCase()
    if (t.includes('confirm') || t.includes('ativ')) return ['#dcfce7', '#15803d']
    if (t.includes('andamento')) return ['#fef9c3', '#a16207']
    if (t.includes('planej')) return ['#e0e7ff', '#4338ca']
    return ['#fee2e2', '#b91c1c']
  }

  const R = 70, C = 2 * Math.PI * R
  const donutPct = Math.min(pctMeta, 100)
  const dashOffset = C * (1 - donutPct / 100)

  const irAba = (aba: string) => { if (onIrAba) onIrAba(aba) }

  return (
    <div className="pr-root" style={{ ...vars, background: 'var(--bg)', color: 'var(--txt)', borderRadius: 20, padding: 20 }}>
      <style>{`
        .pr-root{font-family:'Segoe UI',system-ui,-apple-system,sans-serif}
        .pr-root *{box-sizing:border-box}
        @keyframes prUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes prDash{from{stroke-dashoffset:${C}}to{stroke-dashoffset:${dashOffset}}}
        @keyframes prBar{from{width:0}}
        @keyframes prFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        .pr-anim{animation:prUp .55s cubic-bezier(.2,.7,.3,1) both}
        .pr-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px}
        .pr-grid2{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:16px;margin-bottom:20px}
        .pr-card{background:var(--card);border:1px solid var(--bord);border-radius:20px;padding:20px;box-shadow:0 10px 30px rgba(80,70,160,.08);transition:transform .25s,box-shadow .25s}
        .pr-card:hover{transform:translateY(-5px);box-shadow:0 18px 40px rgba(80,70,160,.16)}
        .pr-ic{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:var(--accentSoft);color:var(--accent)}
        .pr-bar{height:9px;border-radius:99px;background:var(--bord);overflow:hidden}
        .pr-bar>i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),#a78bfa);animation:prBar 1.1s cubic-bezier(.2,.7,.3,1) both}
        .pr-tl{position:relative;padding-left:26px}
        .pr-tl:before{content:'';position:absolute;left:7px;top:6px;bottom:6px;width:2px;background:var(--bord)}
        .pr-tl-item{position:relative;padding:10px 0}
        .pr-tl-dot{position:absolute;left:-23px;top:14px;width:11px;height:11px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px var(--accentSoft)}
        .pr-tag{font-size:11px;font-weight:800;padding:4px 10px;border-radius:99px;white-space:nowrap}
        .pr-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 0;border-bottom:1px solid var(--bord)}
        .pr-row:last-child{border-bottom:none}
        .pr-avatar{width:54px;height:54px;border-radius:50%;object-fit:cover;background:linear-gradient(135deg,var(--accent),#b89bff);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:20px;flex-shrink:0}
        @media(max-width:980px){.pr-cards{grid-template-columns:repeat(2,1fr);gap:12px}.pr-grid2{grid-template-columns:1fr;gap:14px}}
        @media(max-width:560px){.pr-cards{grid-template-columns:1fr}}
      `}</style>

      {/* Saudação + modo escuro */}
      <div className="pr-anim" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        {foto ? <img src={foto} className="pr-avatar" alt="" /> : <span className="pr-avatar">{inicial}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Olá, {nomeCurto}! <span style={{ display: 'inline-block', animation: 'prFloat 2.5s ease-in-out infinite' }}>👋</span></h2>
          <p style={{ color: 'var(--txt2)', margin: '2px 0 0', fontSize: 13 }}>{cargo} · vamos fazer mais um dia incrível!</p>
        </div>
        <button onClick={() => setDark(d => !d)} title={dark ? 'Modo claro' : 'Modo escuro'} style={{ width: 42, height: 42, borderRadius: 13, border: '1px solid var(--bord)', background: 'var(--card)', color: 'var(--txt2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
      </div>

      {/* Banner */}
      <div className="pr-anim" style={{ animationDelay: '.05s', borderRadius: 20, padding: '18px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(120deg,#efeaff,#f7f0ff 60%,#fdeffb)', border: '1px solid var(--bord)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#6b21a8', fontSize: 13, fontWeight: 600 }}>Foco na meta, confiança no processo</div>
          <div style={{ color: '#3b0764', fontSize: 19, fontWeight: 900 }}>Você é imbatível!</div>
        </div>
        <span style={{ fontSize: 42, animation: 'prFloat 3s ease-in-out infinite' }}>🚀</span>
      </div>

      {/* KPIs */}
      <div className="pr-cards">
        {[
          { aba: 'faturamento', ic: DollarSign, label: 'Faturamento', val: fmt$(faturamento), extra: pctFat != null ? <span style={{ color: pctFat >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700, fontSize: 12 }}>{pctFat >= 0 ? '+' : ''}{pctFat.toFixed(0)}% vs mês anterior</span> : <span style={{ color: 'var(--txt3)', fontSize: 12 }}>mês atual</span> },
          { aba: 'metas', ic: Target, label: 'Metas', val: `${pctMeta}%`, extra: <span style={{ color: 'var(--txt3)', fontSize: 12 }}>{fmt$(realizado)} de {fmt$(metaFinal)}</span> },
          { aba: 'agendamentos', ic: Calendar, label: 'Agendamentos hoje', val: String(agHoje), extra: <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>Ver agenda →</span> },
          { aba: 'corrida', ic: Trophy, label: 'Corrida Interna', val: corrida?.pontos ? `${corrida.pontos} pts` : '—', extra: <span style={{ color: 'var(--txt3)', fontSize: 12 }}>{corrida?.periodo || 'sua pontuação'}</span> },
        ].map((c, i) => (
          <div key={i} onClick={() => irAba(c.aba)} className="pr-card pr-anim" style={{ animationDelay: `${.1 + i * .06}s`, cursor: onIrAba ? 'pointer' : 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span className="pr-ic"><c.ic size={22} /></span>
              <span style={{ color: 'var(--txt2)', fontSize: 13, fontWeight: 600 }}>{c.label}</span>
            </div>
            <div style={{ fontSize: 25, fontWeight: 900, marginBottom: 6 }}>{c.val}</div>
            {c.extra}
          </div>
        ))}
      </div>

      {/* Linha 2 */}
      <div className="pr-grid2">
        {/* Agendamentos timeline */}
        <section className="pr-card pr-anim" style={{ animationDelay: '.16s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={18} color="var(--accent)" /> Próximos Agendamentos</h3>
            {onIrAba && <button onClick={() => irAba('agendamentos')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Ver tudo →</button>}
          </div>
          {agOrden.length === 0 ? <p style={{ color: 'var(--txt3)', fontSize: 14, padding: '20px 0', textAlign: 'center' }}>Nenhum agendamento para hoje. ✨</p> : (
            <div className="pr-tl">
              {agOrden.map((a, i) => {
                const [bg, cor] = statusCor(a.status)
                return (
                  <div key={i} className="pr-tl-item">
                    <span className="pr-tl-dot" />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--txt3)', fontWeight: 700 }}>{horaDe(a) || '—'}</div>
                        <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.cliente || a.cliente_nome || a.nome_cliente || 'Cliente'}</div>
                        <div style={{ color: 'var(--txt2)', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.servico || a.servicos || ''}</div>
                      </div>
                      {a.status && <span className="pr-tag" style={{ background: bg, color: cor }}>{cap(a.status)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Metas donut */}
        <section className="pr-card pr-anim" style={{ animationDelay: '.22s', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><Target size={18} color="var(--accent)" /> Metas do Mês</h3>
          <svg width="170" height="170" viewBox="0 0 180 180" style={{ display: 'block', margin: '0 auto' }}>
            <circle cx="90" cy="90" r={R} fill="none" stroke="var(--bord)" strokeWidth="14" />
            <circle cx="90" cy="90" r={R} fill="none" stroke="var(--accent)" strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={dashOffset} transform="rotate(-90 90 90)" style={{ animation: 'prDash 1.3s cubic-bezier(.2,.7,.3,1) both' }} />
            <text x="90" y="84" textAnchor="middle" fontSize="30" fontWeight="900" fill="var(--txt)">{donutPct}%</text>
            <text x="90" y="106" textAnchor="middle" fontSize="12" fill="var(--txt3)">da meta</text>
          </svg>
          <div style={{ fontSize: 21, fontWeight: 900, marginTop: 6 }}>{fmt$(realizado)}</div>
          <div style={{ color: 'var(--txt3)', fontSize: 13, marginBottom: 14 }}>de {fmt$(metaFinal)}</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}><span style={{ color: 'var(--txt2)' }}>Faturamento</span><strong>{donutPct}%</strong></div>
            <div className="pr-bar"><i style={{ width: `${donutPct}%` }} /></div>
          </div>
        </section>

        {/* Ações + Pendências */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="pr-card pr-anim" style={{ animationDelay: '.28s' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><Megaphone size={18} color="var(--accent)" /> Ações Comerciais</h3>
            {acoes.length === 0 ? <p style={{ color: 'var(--txt3)', fontSize: 13, margin: 0 }}>Nenhuma ação cadastrada.</p> :
              acoes.map((a, i) => { const [bg, cor] = statusCor(a.status); return <div key={i} className="pr-row"><span style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.campanha}</span>{a.status && <span className="pr-tag" style={{ background: bg, color: cor }}>{cap(a.status)}</span>}</div> })}
          </section>
          <section className="pr-card pr-anim" style={{ animationDelay: '.34s' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={18} color="var(--accent)" /> Pendências</h3>
            {pend.length === 0 ? <p style={{ color: 'var(--txt3)', fontSize: 13, margin: 0 }}>Tudo em dia! 🎉</p> :
              pend.map((p, i) => { const [bg, cor] = statusCor(p.status); return <div key={i} className="pr-row"><span style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titulo}</span><span className="pr-tag" style={{ background: bg, color: cor }}>{p.status}</span></div> })}
          </section>
        </div>
      </div>

      {/* Corrida */}
      <section className="pr-card pr-anim" style={{ animationDelay: '.4s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span className="pr-ic" style={{ background: 'linear-gradient(135deg,#fde68a,#fbbf24)', color: '#92400e' }}><Trophy size={22} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Corrida Interna</h3>
            <p style={{ margin: '2px 0 0', color: 'var(--txt2)', fontSize: 13 }}>{corrida?.periodo ? `Período: ${corrida.periodo}` : 'Sua pontuação atual'}</p>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent)' }}>{corrida?.pontos || '—'}{corrida?.pontos ? ' pts' : ''}</div>
        </div>
      </section>

      {loading && <div style={{ textAlign: 'center', color: 'var(--txt3)', fontSize: 13, marginTop: 16 }}>Carregando seus dados…</div>}
    </div>
  )
}
