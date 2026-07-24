'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign, Target, Calendar, Trophy, Megaphone, ClipboardList, Moon, Sun, Bell,
  AlertTriangle, Users, Lightbulb, Package, UserMinus, Star, Sparkles, CalendarRange, User, ArrowRight, LogOut, Hand, X, Check, Send, BookOpen, ShieldCheck,
} from 'lucide-react'

// Tela inicial do profissional (estilo Nubank/Notion): saudação + central de notificações + atalhos.
// Sem cards grandes e sem emojis — ícones finos e elegantes. Tudo somente leitura.
export default function PainelResumoProf({ pid, nome, prof: profProp, onIrAba, temKits }: { pid?: string; nome?: string; prof?: any; onIrAba?: (aba: string) => void; temKits?: boolean }) {
  const [dark, setDark] = useState(false)
  const [nomeP, setNomeP] = useState(nome || '')
  const [prof, setProf] = useState<any>(profProp || null)
  const [notifs, setNotifs] = useState<any[]>([])
  const [notifIdx, setNotifIdx] = useState(0)
  const [fechadas, setFechadas] = useState<Set<string>>(new Set())
  const [meuId, setMeuId] = useState('')
  const [ehProf, setEhProf] = useState(false) // logado como profissional → mostra Sair
  const [pendAbertas, setPendAbertas] = useState(0)     // demandas recebidas não resolvidas
  const [compromissos2d, setCompromissos2d] = useState(0) // datas dos calendários faltando ≤ 2 dias
  const [escolherCal, setEscolherCal] = useState(false)  // seletor Geral / Marketing ao clicar no Calendário

  useEffect(() => { try { setDark(localStorage.getItem('mp_dark') === '1') } catch { } }, [])
  useEffect(() => { try { localStorage.setItem('mp_dark', dark ? '1' : '0') } catch { } }, [dark])
  // "Fechar" persiste: aviso pessoal (alvo = este profissional) é apagado no
  // servidor; aviso "todos" fica guardado no localStorage para não voltar ao recarregar.
  // "Já peguei" remove de vez (chama a API) — só faz sentido pro aviso de kit.
  const notifsVisiveis = notifs.filter(n => !fechadas.has(n.id))
  useEffect(() => { if (notifsVisiveis.length <= 1) return; const t = setInterval(() => setNotifIdx(i => (i + 1) % notifsVisiveis.length), 5000); return () => clearInterval(t) }, [notifsVisiveis.length])

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch('/api/auth/me').then(r => r.ok ? r.json() : null).catch(() => null)
        if (me?.role === 'profissional') setEhProf(true)
        let theId = pid
        if (!theId) {
          theId = me?.profissionalId; if (me?.nome) setNomeP(me.nome)
        }
        if (theId) {
          setMeuId(theId)
          // Restaura as notificações que o profissional já fechou (persistem entre recargas)
          try { const raw = localStorage.getItem('notif_fechadas_' + theId); if (raw) setFechadas(new Set(JSON.parse(raw))) } catch { }
        }
        const [p, no] = await Promise.all([
          profProp ? Promise.resolve(profProp) : (theId ? fetch(`/api/profissionais/${theId}`).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null)),
          fetch('/api/salon/notificacoes').then(r => r.ok ? r.json() : null).catch(() => null),
        ])
        if (p) setProf(p)
        setNotifs(Array.isArray(no?.notificacoes) ? no.notificacoes : [])

        // Alertas de piscar (igual à página inicial): demandas recebidas abertas + datas ≤ 2 dias
        if (theId) {
          fetch(`/api/pendencias?profissional_id=${theId}`).then(r => r.ok ? r.json() : []).then(d => {
            setPendAbertas(Array.isArray(d) ? d.filter((x: any) => !x.resolvido).length : 0)
          }).catch(() => { })
        }
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
        const proximos = (eventos: any[]): number => (Array.isArray(eventos) ? eventos : [])
          .map((e: any) => { const [y, m, dd] = String(e.data).split('-').map(Number); return Math.round((new Date(y, m - 1, dd).getTime() - hoje.getTime()) / 86400000) })
          .filter(dias => dias >= 0 && dias <= 2).length
        Promise.all([
          fetch('/api/salon/grid?chave=calendario').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/salon/grid?chave=calendario_mkt').then(r => r.ok ? r.json() : null).catch(() => null),
        ]).then(([cal, mkt]) => setCompromissos2d(proximos(cal?.eventos || []) + proximos(mkt?.eventos || [])))
      } catch { }
    })()
  }, [pid])

  const nomeCurto = (nomeP || prof?.apelido || prof?.nome_completo || 'Profissional').split(' ')[0]
  const cargo = prof?.cargo || 'Profissional'
  const foto = prof?.foto_url || ''
  const inicial = nomeCurto.charAt(0).toUpperCase()

  const vars: any = dark ? {
    '--bg': '#0f1117', '--card': '#1b1f2b', '--txt': '#eef0f6', '--txt2': '#9aa3b8', '--txt3': '#6b7488', '--bord': '#2a2f40', '--accent': '#8b7cff', '--accentSoft': '#2a2550',
  } : {
    '--bg': '#F8F9FC', '--card': '#ffffff', '--txt': '#1a1a2e', '--txt2': '#6b7280', '--txt3': '#9ca3af', '--bord': '#edeef3', '--accent': '#7c5cfc', '--accentSoft': '#f0edff',
  }

  const irAba = (aba: string) => { if (onIrAba) onIrAba(aba) }
  const oc: Record<string, boolean> = (prof?.acesso_oculto && typeof prof.acesso_oculto === 'object') ? prof.acesso_oculto : {}

  const AREAS: { aba: string; label: string; Ic: any; ocult?: string; so?: boolean }[] = [
    { aba: 'demandas', label: 'Solicitação', Ic: Send },
    { aba: 'kits', label: 'Kits Pé e Mão', Ic: Hand, so: !!temKits },
    { aba: 'ester_fluxo', label: 'Esterilização', Ic: ShieldCheck },
    { aba: 'faturamento', label: 'Faturamento', Ic: DollarSign },
    { aba: 'metas', label: 'Metas', Ic: Target, ocult: 'metas' },
    { aba: 'agendamentos', label: 'Agendamentos', Ic: Calendar },
    { aba: 'desempenho', label: 'Ocorrências', Ic: AlertTriangle },
    { aba: 'dependencia', label: 'Dependência', Ic: Users, ocult: 'dependencia' },
    { aba: 'oportunidades', label: 'Oportunidades', Ic: Lightbulb, ocult: 'oportunidades' },
    { aba: 'bundle', label: 'Combos que Vendem', Ic: Package },
    { aba: 'clientes-perdidos', label: 'Clientes Perdidos', Ic: UserMinus },
    { aba: 'corrida', label: 'Corrida Interna', Ic: Trophy },
    { aba: 'acoes', label: 'Ações Comerciais', Ic: Megaphone },
    { aba: 'avaliar', label: 'Avaliações', Ic: Star, ocult: 'avaliar' },
    { aba: 'pops', label: 'POPs & Avaliação', Ic: BookOpen, ocult: 'pops' },
    { aba: 'ia', label: 'IA / Assistente', Ic: Sparkles },
    { aba: 'calendario_mkt', label: 'Calendário', Ic: CalendarRange },
    { aba: 'cadastro', label: 'Cadastro', Ic: ClipboardList },
  ]
  // Esconde a área quando o acesso_oculto (já fundido com o padrão global do
  // salão pela API) marcar a chave. Usa a própria `aba` como chave — assim toda
  // área é controlável pelo painel global, e card novo já entra automaticamente.
  const areasVis = AREAS.filter(a => (a.so === undefined || a.so) && !oc[a.ocult || a.aba])

  const tempoAtras = (em: number) => {
    if (!em) return ''
    const s = Math.floor((Date.now() - em) / 1000)
    if (s < 60) return 'agora'
    if (s < 3600) return `há ${Math.floor(s / 60)} min`
    if (s < 86400) return `há ${Math.floor(s / 3600)} h`
    return `há ${Math.floor(s / 86400)} d`
  }
  const notifAtual = notifsVisiveis[notifIdx] || null
  const ehNotifKit = !!notifAtual?.texto?.includes('kits estão separados')

  function fechar(id: string) {
    setFechadas(prev => {
      const n = new Set(prev).add(id)
      try { if (meuId) localStorage.setItem('notif_fechadas_' + meuId, JSON.stringify([...n])) } catch { }
      return n
    })
    setNotifIdx(0)
    // Se a notificação é dirigida a este profissional (ex.: solicitação resolvida),
    // apaga no servidor para não voltar. Avisos "todos" ficam só no localStorage.
    const n = notifs.find(x => x.id === id)
    if (n && meuId && n.alvo === meuId) { fetch(`/api/salon/notificacoes?id=${id}`, { method: 'DELETE' }).catch(() => { }) }
  }
  async function jaPeguei(id: string) {
    setNotifs(prev => prev.filter(n => n.id !== id)); setNotifIdx(0)
    try { await fetch(`/api/salon/notificacoes?id=${id}`, { method: 'DELETE' }) } catch { }
  }

  return (
    <div className="pr-root" style={{ ...vars, background: 'var(--bg)', color: 'var(--txt)', borderRadius: 22, padding: 22 }}>
      <style>{`
        .pr-root{font-family:'Segoe UI',system-ui,-apple-system,sans-serif}
        .pr-root *{box-sizing:border-box}
        @keyframes prUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes prGlow{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.55)}50%{box-shadow:0 0 0 12px rgba(245,158,11,0)}}
        @keyframes prPulseRed{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.55)}50%{box-shadow:0 0 0 9px rgba(239,68,68,0)}}
        @keyframes prPulseCyan{0%,100%{box-shadow:0 0 0 0 rgba(8,145,178,.5)}50%{box-shadow:0 0 0 9px rgba(8,145,178,0)}}
        .pr-anim{animation:prUp .5s cubic-bezier(.2,.7,.3,1) both}
        .pr-avatar{width:54px;height:54px;border-radius:50%;object-fit:cover;background:linear-gradient(135deg,var(--accent),#b89bff);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:20px;flex-shrink:0}
        .pr-bell{width:46px;height:46px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--accent);color:#fff}
        .pr-dot{width:7px;height:7px;border-radius:50%;background:#cbb9f5;transition:all .3s;cursor:pointer}
        .pr-dot.on{background:var(--accent);width:20px;border-radius:99px}
        .pr-areas{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:14px}
        .pr-area{background:var(--card);border:1px solid var(--bord);border-radius:18px;padding:16px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:transform .2s,box-shadow .2s,border-color .2s}
        .pr-area:hover{transform:translateY(-4px);box-shadow:0 16px 32px rgba(91,79,207,.14);border-color:var(--accent)}
        .pr-area-ic{width:40px;height:40px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--accentSoft);color:var(--accent)}
        .pr-area-go{margin-left:auto;color:var(--txt3);opacity:0;transition:opacity .2s}
        .pr-area:hover .pr-area-go{opacity:1}
        @media(max-width:560px){.pr-areas{grid-template-columns:repeat(2,1fr);gap:10px}.pr-area{padding:13px;flex-direction:column;align-items:flex-start;gap:8px}.pr-area-go{display:none}}
      `}</style>

      {/* Saudação + modo escuro */}
      <div className="pr-anim" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        {foto ? <img src={foto} className="pr-avatar" alt="" /> : <span className="pr-avatar">{inicial}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Olá, {nomeCurto}</h2>
          <p style={{ color: 'var(--txt2)', margin: '2px 0 0', fontSize: 13 }}>{cargo}</p>
        </div>
        <button onClick={() => setDark(d => !d)} title={dark ? 'Modo claro' : 'Modo escuro'} style={{ width: 42, height: 42, borderRadius: 13, border: '1px solid var(--bord)', background: 'var(--card)', color: 'var(--txt2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        {ehProf && (
          <button onClick={() => { window.location.href = '/logout' }} title="Sair da conta"
            style={{ height: 42, padding: '0 14px', borderRadius: 13, border: '1px solid rgba(239,68,68,.4)', background: 'var(--card)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            <LogOut size={16} /> Sair
          </button>
        )}
      </div>

      {/* Central de notificações (o salão envia; giram sozinhas) */}
      <div className="pr-anim" style={{ animationDelay: '.05s', borderRadius: 20, padding: '16px 20px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 16, background: notifAtual ? (dark ? '#3a2f12' : '#fff7e6') : (dark ? '#1b1f2b' : '#ffffff'), border: `1px solid ${notifAtual ? '#f5c97a' : 'var(--bord)'}`, boxShadow: notifAtual ? '0 10px 30px rgba(245,158,11,.18)' : '0 10px 30px rgba(91,79,207,.08)', minHeight: 84 }}>
        <span className="pr-bell" style={{ background: notifAtual ? '#f59e0b' : 'var(--accent)', animation: notifAtual ? 'prGlow 1.5s ease-in-out infinite' : undefined }}><Bell size={22} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {notifAtual ? (
            <div key={notifIdx} style={{ animation: 'prUp .45s ease both' }}>
              <div style={{ color: 'var(--txt3)', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{notifAtual.de || 'Salão'} · {tempoAtras(notifAtual.em)} {notifsVisiveis.length > 1 ? `· ${notifIdx + 1}/${notifsVisiveis.length}` : ''}</div>
              <div style={{ color: 'var(--txt)', fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{notifAtual.texto}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {ehNotifKit && (
                  <button onClick={() => jaPeguei(notifAtual.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}><Check size={13} /> Já peguei</button>
                )}
                <button onClick={() => fechar(notifAtual.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, border: '1px solid var(--bord)', background: 'transparent', color: 'var(--txt2)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}><X size={13} /> Fechar</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ color: 'var(--txt2)', fontSize: 13, fontWeight: 600 }}>Central de avisos</div>
              <div style={{ color: 'var(--txt3)', fontSize: 13 }}>Você não tem novos avisos no momento.</div>
            </div>
          )}
          {notifsVisiveis.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {notifsVisiveis.map((_, i) => <span key={i} className={`pr-dot ${i === notifIdx ? 'on' : ''}`} onClick={() => setNotifIdx(i)} />)}
            </div>
          )}
        </div>
      </div>

      {/* Atalhos das áreas */}
      {onIrAba && (
        <div className="pr-anim" style={{ animationDelay: '.08s' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: '2px 4px 12px', color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Minhas áreas</h3>
          <div className="pr-areas">
            {areasVis.map(a => {
              const alertaPend = a.aba === 'demandas' && pendAbertas > 0
              const alertaCal = a.aba === 'calendario_mkt' && compromissos2d > 0
              const anim = alertaPend ? 'prPulseRed 1.4s ease-in-out infinite' : alertaCal ? 'prPulseCyan 1.4s ease-in-out infinite' : undefined
              const badge = alertaPend ? pendAbertas : alertaCal ? compromissos2d : 0
              return (
                <div key={a.aba} className="pr-area" onClick={() => a.aba === 'calendario_mkt' ? setEscolherCal(true) : irAba(a.aba)}
                  style={{ position: 'relative', ...(anim ? { animation: anim, borderColor: alertaPend ? '#ef4444' : '#0891b2' } : {}) }}>
                  <span className="pr-area-ic" style={alertaPend ? { background: '#fee2e2', color: '#dc2626' } : alertaCal ? { background: '#cffafe', color: '#0891b2' } : undefined}><a.Ic size={20} /></span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{a.label}</span>
                  {badge > 0 && <span style={{ position: 'absolute', top: -8, right: -6, background: alertaPend ? '#dc2626' : '#0891b2', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, boxShadow: '0 3px 10px rgba(0,0,0,.22)' }}>{alertaPend ? '⚠' : '🔔'} {badge}</span>}
                  <span className="pr-area-go"><ArrowRight size={16} /></span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Seletor de calendário: Geral ou Marketing */}
      {escolherCal && (
        <div onClick={() => setEscolherCal(false)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', color: 'var(--txt)', border: '1px solid var(--bord)', borderRadius: 18, padding: 20, width: '100%', maxWidth: 380, boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Qual calendário?</div>
            <div style={{ fontSize: 12.5, color: 'var(--txt2)', marginBottom: 16 }}>Escolha em qual calendário você quer entrar.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => { setEscolherCal(false); irAba('calendario') }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: 'var(--bg)', border: '1.5px solid #67e8f9', borderRadius: 14, padding: 14, cursor: 'pointer', color: 'var(--txt)' }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: '#cffafe', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Calendar size={20} /></span>
                <div><div style={{ fontWeight: 800, fontSize: 14 }}>Calendário Geral</div><div style={{ fontSize: 11.5, color: 'var(--txt2)' }}>Compromissos gerais do salão</div></div>
              </button>
              <button onClick={() => { setEscolherCal(false); irAba('calendario_mkt') }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: 'var(--bg)', border: '1.5px solid #f9a8d4', borderRadius: 14, padding: 14, cursor: 'pointer', color: 'var(--txt)' }}>
                <span style={{ width: 40, height: 40, borderRadius: 12, background: '#fce7f3', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CalendarRange size={20} /></span>
                <div><div style={{ fontWeight: 800, fontSize: 14 }}>Calendário de Marketing</div><div style={{ fontSize: 11.5, color: 'var(--txt2)' }}>Ações e campanhas</div></div>
              </button>
            </div>
            <button onClick={() => setEscolherCal(false)} style={{ marginTop: 14, width: '100%', background: 'transparent', border: 'none', color: 'var(--txt3)', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
