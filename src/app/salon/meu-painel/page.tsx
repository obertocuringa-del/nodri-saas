'use client'

import { useState, useEffect } from 'react'
import { Home, DollarSign, Target, Calendar, Trophy, Megaphone, ClipboardList, Bell, Moon, Sun, LogOut, User, TrendingUp, ChevronRight, Sparkles } from 'lucide-react'

const fmt$ = (v: number) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

export default function MeuPainel() {
  const [dark, setDark] = useState(false)
  const [pid, setPid] = useState('')
  const [nome, setNome] = useState('')
  const [prof, setProf] = useState<any>(null)
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
        const me = await fetch('/api/auth/me').then(r => r.ok ? r.json() : null)
        const id = me?.profissionalId
        if (!id) { setLoading(false); return }
        setPid(id); setNome(me?.nome || '')

        const hoje = new Date()
        const cur = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
        const prevD = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
        const prev = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}`
        const hojeISO = hoje.toISOString().slice(0, 10)

        const [p, mt, mm, agr, ac, pe, co] = await Promise.all([
          fetch(`/api/profissionais/${id}`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/profissionais/${id}/metricas?p1_inicio=${prev}&p1_fim=${prev}&p2_inicio=${cur}&p2_fim=${cur}`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/profissionais/${id}/metas`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/profissionais/${id}/agendamentos?data=${encodeURIComponent(hojeISO)}`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/salon/grid?chave=acoes_comerciais_${id}`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/pendencias?profissional_id=${id}`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/salon/grid?chave=corrida_interna_${id}`).then(r => r.ok ? r.json() : null).catch(() => null),
        ])
        setProf(p); setMetr(mt); setMetas(mm)

        const agList = Array.isArray(agr?.agendamentos) ? agr.agendamentos : []
        setAg(agList)

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
  }, [])

  const nomeCurto = (nome || prof?.apelido || prof?.nome_completo || 'Profissional').split(' ')[0]
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

  // ── Tema ──
  const vars: any = dark ? {
    ['--bg' as any]: '#0f1117', ['--bg2' as any]: '#151823', ['--card' as any]: '#1b1f2b', ['--card2' as any]: '#222636',
    ['--txt' as any]: '#eef0f6', ['--txt2' as any]: '#9aa3b8', ['--txt3' as any]: '#6b7488', ['--bord' as any]: '#2a2f40',
    ['--accent' as any]: '#8b7cff', ['--accentSoft' as any]: '#2a2550', ['--shadow' as any]: '0 10px 30px rgba(0,0,0,.45)',
  } : {
    ['--bg' as any]: '#F8F9FC', ['--bg2' as any]: '#ffffff', ['--card' as any]: '#ffffff', ['--card2' as any]: '#f6f5ff',
    ['--txt' as any]: '#1a1a2e', ['--txt2' as any]: '#6b7280', ['--txt3' as any]: '#9ca3af', ['--bord' as any]: '#edeef3',
    ['--accent' as any]: '#7c5cfc', ['--accentSoft' as any]: '#f0edff', ['--shadow' as any]: '0 10px 30px rgba(80,70,160,.10)',
  }

  const NAV = [
    { ic: Home, label: 'Início', href: '#topo' },
    { ic: DollarSign, label: 'Faturamento', href: '#sec-fat' },
    { ic: Target, label: 'Metas', href: '#sec-metas' },
    { ic: Calendar, label: 'Agendamentos', href: '#sec-ag' },
    { ic: Megaphone, label: 'Ações Comerciais', href: '#sec-acoes' },
    { ic: ClipboardList, label: 'Pendências', href: '#sec-pend' },
    { ic: Trophy, label: 'Corrida Interna', href: '#sec-corrida' },
  ]

  const statusCor = (s: string) => {
    const t = (s || '').toLowerCase()
    if (t.includes('confirm')) return ['#dcfce7', '#15803d']
    if (t.includes('ativ')) return ['#dcfce7', '#15803d']
    if (t.includes('andamento')) return ['#fef9c3', '#a16207']
    if (t.includes('planej')) return ['#e0e7ff', '#4338ca']
    return ['#fee2e2', '#b91c1c']
  }

  // Donut
  const R = 70, C = 2 * Math.PI * R
  const donutPct = Math.min(pctMeta, 100)
  const dashOffset = C * (1 - donutPct / 100)

  return (
    <div className="mp-root" data-theme={dark ? 'dark' : 'light'} style={vars} id="topo">
      <style>{`
        .mp-root{min-height:100vh;background:var(--bg);color:var(--txt);font-family:'Segoe UI',system-ui,-apple-system,sans-serif;scroll-behavior:smooth;display:flex}
        .mp-root *{box-sizing:border-box}
        @keyframes mpUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes mpFade{from{opacity:0}to{opacity:1}}
        @keyframes mpPop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes mpDash{from{stroke-dashoffset:${C}}to{stroke-dashoffset:${dashOffset}}}
        @keyframes mpBar{from{width:0}}
        @keyframes mpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        .mp-anim{animation:mpUp .55s cubic-bezier(.2,.7,.3,1) both}
        .mp-side{width:248px;flex-shrink:0;background:var(--bg2);border-right:1px solid var(--bord);position:sticky;top:0;height:100vh;display:flex;flex-direction:column;padding:22px 16px;gap:6px;transition:background .3s}
        .mp-logo{display:flex;align-items:center;gap:10px;font-weight:900;font-size:19px;margin:0 8px 18px}
        .mp-logo-ic{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--accent),#b89bff);display:flex;align-items:center;justify-content:center;color:#fff}
        .mp-nav{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:13px;color:var(--txt2);font-weight:600;font-size:14px;text-decoration:none;transition:all .2s;cursor:pointer}
        .mp-nav:hover{background:var(--accentSoft);color:var(--accent);transform:translateX(3px)}
        .mp-nav.on{background:linear-gradient(135deg,var(--accent),#9b87ff);color:#fff;box-shadow:0 8px 20px rgba(124,92,252,.35)}
        .mp-main{flex:1;min-width:0;padding:26px 30px 60px}
        .mp-top{display:flex;align-items:center;gap:16px;margin-bottom:24px}
        .mp-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:22px}
        .mp-grid2{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:18px;margin-bottom:22px}
        .mp-card{background:var(--card);border:1px solid var(--bord);border-radius:20px;padding:22px;box-shadow:var(--shadow);transition:transform .25s,box-shadow .25s,background .3s}
        .mp-card:hover{transform:translateY(-5px);box-shadow:0 18px 40px rgba(80,70,160,.18)}
        .mp-ic{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:var(--accentSoft);color:var(--accent)}
        .mp-bar{height:9px;border-radius:99px;background:var(--bord);overflow:hidden}
        .mp-bar>i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),#a78bfa);animation:mpBar 1.1s cubic-bezier(.2,.7,.3,1) both}
        .mp-avatar{width:46px;height:46px;border-radius:50%;object-fit:cover;background:linear-gradient(135deg,var(--accent),#b89bff);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:18px;flex-shrink:0}
        .mp-tl{position:relative;padding-left:26px}
        .mp-tl:before{content:'';position:absolute;left:7px;top:6px;bottom:6px;width:2px;background:var(--bord)}
        .mp-tl-item{position:relative;padding:10px 0}
        .mp-tl-dot{position:absolute;left:-23px;top:14px;width:11px;height:11px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px var(--accentSoft)}
        .mp-tag{font-size:11px;font-weight:800;padding:4px 10px;border-radius:99px;white-space:nowrap}
        .mp-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 0;border-bottom:1px solid var(--bord)}
        .mp-row:last-child{border-bottom:none}
        .mp-icon-btn{width:42px;height:42px;border-radius:13px;border:1px solid var(--bord);background:var(--card);color:var(--txt2);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s}
        .mp-icon-btn:hover{color:var(--accent);border-color:var(--accent);transform:translateY(-2px)}
        .mp-hide-mob{display:flex}
        @media(max-width:980px){
          .mp-side{display:none}
          .mp-cards{grid-template-columns:repeat(2,1fr);gap:12px}
          .mp-grid2{grid-template-columns:1fr;gap:14px}
          .mp-main{padding:18px 14px 80px}
          .mp-card{padding:18px;border-radius:18px}
        }
        @media(max-width:560px){
          .mp-cards{grid-template-columns:1fr}
          .mp-hide-mob{display:none}
        }
      `}</style>

      {/* Sidebar (desktop) */}
      <aside className="mp-side">
        <div className="mp-logo"><span className="mp-logo-ic"><Sparkles size={18} /></span> Meu Painel</div>
        {NAV.map((n, i) => (
          <a key={i} href={n.href} className={`mp-nav ${i === 0 ? 'on' : ''}`}><n.ic size={18} /> {n.label}</a>
        ))}
        <div style={{ flex: 1 }} />
        <a href={`/salon/profissionais/${pid}`} className="mp-nav"><User size={18} /> Meu perfil completo</a>
        <a href="/logout" className="mp-nav" style={{ color: '#ef4444' }}><LogOut size={18} /> Sair</a>
      </aside>

      {/* Conteúdo */}
      <main className="mp-main">
        {/* Topbar */}
        <div className="mp-top mp-anim">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, lineHeight: 1.1 }}>Olá, {nomeCurto}! <span style={{ display: 'inline-block', animation: 'mpFloat 2.5s ease-in-out infinite' }}>👋</span></h1>
            <p style={{ color: 'var(--txt2)', margin: '4px 0 0', fontSize: 14 }}>Que bom te ver por aqui. Vamos fazer mais um dia incrível!</p>
          </div>
          <button className="mp-icon-btn" onClick={() => setDark(d => !d)} title={dark ? 'Modo claro' : 'Modo escuro'}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <div className="mp-icon-btn" title="Notificações" style={{ position: 'relative' }}><Bell size={18} />{(pend.length > 0) && <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {foto ? <img src={foto} className="mp-avatar" alt="" /> : <span className="mp-avatar">{inicial}</span>}
            <div className="mp-hide-mob">
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{nomeCurto}</div>
                <div style={{ color: 'var(--txt2)', fontSize: 12 }}>{cargo}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Banner motivacional */}
        <div className="mp-anim" style={{ animationDelay: '.05s', borderRadius: 22, padding: '20px 26px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(120deg,#efeaff 0%,#f7f0ff 60%,#fdeffb 100%)', border: '1px solid var(--bord)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#6b21a8', fontSize: 13, fontWeight: 600 }}>Foco na meta, confiança no processo</div>
            <div style={{ color: '#3b0764', fontSize: 20, fontWeight: 900 }}>Você é imbatível!</div>
          </div>
          <span style={{ fontSize: 44, animation: 'mpFloat 3s ease-in-out infinite' }}>🚀</span>
        </div>

        {/* KPI cards */}
        <div className="mp-cards">
          {[
            { id: 'sec-fat', ic: DollarSign, label: 'Faturamento', val: fmt$(faturamento), extra: pctFat != null ? <span style={{ color: pctFat >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700, fontSize: 12 }}>{pctFat >= 0 ? '+' : ''}{pctFat.toFixed(0)}% vs mês anterior</span> : <span style={{ color: 'var(--txt3)', fontSize: 12 }}>mês atual</span> },
            { id: 'sec-metas', ic: Target, label: 'Metas', val: `${pctMeta}%`, extra: <span style={{ color: 'var(--txt3)', fontSize: 12 }}>{fmt$(realizado)} de {fmt$(metaFinal)}</span> },
            { id: 'sec-ag', ic: Calendar, label: 'Agendamentos hoje', val: String(agHoje), extra: <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>Ver agenda ↓</span> },
            { id: 'sec-corrida', ic: Trophy, label: 'Corrida Interna', val: corrida?.pontos ? `${corrida.pontos} pts` : '—', extra: <span style={{ color: 'var(--txt3)', fontSize: 12 }}>{corrida?.periodo || 'sua pontuação'}</span> },
          ].map((c, i) => (
            <a key={i} href={`#${c.id}`} className="mp-card mp-anim" style={{ animationDelay: `${.1 + i * .06}s`, textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span className="mp-ic"><c.ic size={22} /></span>
                <span style={{ color: 'var(--txt2)', fontSize: 13, fontWeight: 600 }}>{c.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>{c.val}</div>
              {c.extra}
            </a>
          ))}
        </div>

        {/* Linha 2: Agendamentos | Metas donut | (Ações + Pendências) */}
        <div className="mp-grid2">
          {/* Próximos Agendamentos (timeline) */}
          <section id="sec-ag" className="mp-card mp-anim" style={{ animationDelay: '.16s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={18} color="var(--accent)" /> Próximos Agendamentos</h3>
            </div>
            {agOrden.length === 0 ? (
              <p style={{ color: 'var(--txt3)', fontSize: 14, padding: '20px 0', textAlign: 'center' }}>Nenhum agendamento para hoje. ✨</p>
            ) : (
              <div className="mp-tl">
                {agOrden.map((a, i) => {
                  const [bg, cor] = statusCor(a.status)
                  return (
                    <div key={i} className="mp-tl-item">
                      <span className="mp-tl-dot" />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: 'var(--txt3)', fontWeight: 700 }}>{horaDe(a) || '—'}</div>
                          <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.cliente || a.cliente_nome || a.nome_cliente || 'Cliente'}</div>
                          <div style={{ color: 'var(--txt2)', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.servico || a.servicos || ''}</div>
                        </div>
                        {a.status && <span className="mp-tag" style={{ background: bg, color: cor }}>{cap(a.status)}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Metas do Mês (donut) */}
          <section id="sec-metas" className="mp-card mp-anim" style={{ animationDelay: '.22s', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><Target size={18} color="var(--accent)" /> Metas do Mês</h3>
            <svg width="180" height="180" viewBox="0 0 180 180" style={{ display: 'block', margin: '0 auto' }}>
              <circle cx="90" cy="90" r={R} fill="none" stroke="var(--bord)" strokeWidth="14" />
              <circle cx="90" cy="90" r={R} fill="none" stroke="var(--accent)" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={dashOffset} transform="rotate(-90 90 90)"
                style={{ animation: 'mpDash 1.3s cubic-bezier(.2,.7,.3,1) both' }} />
              <text x="90" y="84" textAnchor="middle" fontSize="30" fontWeight="900" fill="var(--txt)">{donutPct}%</text>
              <text x="90" y="106" textAnchor="middle" fontSize="12" fill="var(--txt3)">da meta</text>
            </svg>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{fmt$(realizado)}</div>
            <div style={{ color: 'var(--txt3)', fontSize: 13, marginBottom: 14 }}>de {fmt$(metaFinal)}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}><span style={{ color: 'var(--txt2)' }}>Faturamento</span><strong>{donutPct}%</strong></div>
              <div className="mp-bar"><i style={{ width: `${donutPct}%` }} /></div>
            </div>
          </section>

          {/* Ações + Pendências empilhados */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <section id="sec-acoes" className="mp-card mp-anim" style={{ animationDelay: '.28s' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><Megaphone size={18} color="var(--accent)" /> Ações Comerciais</h3>
              {acoes.length === 0 ? <p style={{ color: 'var(--txt3)', fontSize: 13, margin: 0 }}>Nenhuma ação cadastrada.</p> :
                acoes.map((a, i) => {
                  const [bg, cor] = statusCor(a.status)
                  return <div key={i} className="mp-row"><span style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.campanha}</span>{a.status && <span className="mp-tag" style={{ background: bg, color: cor }}>{cap(a.status)}</span>}</div>
                })}
            </section>

            <section id="sec-pend" className="mp-card mp-anim" style={{ animationDelay: '.34s' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={18} color="var(--accent)" /> Pendências</h3>
              {pend.length === 0 ? <p style={{ color: 'var(--txt3)', fontSize: 13, margin: 0 }}>Tudo em dia! 🎉</p> :
                pend.map((p, i) => {
                  const [bg, cor] = statusCor(p.status)
                  return <div key={i} className="mp-row"><span style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titulo}</span><span className="mp-tag" style={{ background: bg, color: cor }}>{p.status}</span></div>
                })}
            </section>
          </div>
        </div>

        {/* Corrida Interna (sua pontuação) */}
        <section id="sec-corrida" className="mp-card mp-anim" style={{ animationDelay: '.4s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span className="mp-ic" style={{ background: 'linear-gradient(135deg,#fde68a,#fbbf24)', color: '#92400e' }}><Trophy size={22} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Corrida Interna</h3>
              <p style={{ margin: '2px 0 0', color: 'var(--txt2)', fontSize: 13 }}>{corrida?.periodo ? `Período: ${corrida.periodo}` : 'Sua pontuação atual'}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--accent)' }}>{corrida?.pontos || '—'}{corrida?.pontos ? ' pts' : ''}</div>
              <a href={`/salon/profissionais/${pid}`} style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}>Ver detalhes <ChevronRight size={13} /></a>
            </div>
          </div>
        </section>

        {loading && <div style={{ textAlign: 'center', color: 'var(--txt3)', fontSize: 13, marginTop: 20, animation: 'mpFade 1s' }}>Carregando seus dados…</div>}
      </main>
    </div>
  )
}
