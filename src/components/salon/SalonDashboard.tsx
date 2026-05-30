'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Settings, CheckCircle, X, Zap, Play, Search, ChevronDown, ExternalLink, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import type { ModuloComStatus, Notificacao } from '@/types'

const ICON_MAP: Record<string, string> = {
  'calendar-check': '📅', 'lock': '🔒', 'message-circle': '💬', 'eye': '👁',
  'send': '📤', 'paperclip': '📎', 'chart-bar': '📊', 'coin': '💰',
  'music': '🎵', 'piggy-bank': '🐷', 'calculator': '🧮', 'star': '⭐',
  'armchair': '🪑', 'tag': '🏷',
}

const COR_MAP: Record<string, string> = {
  cyan: 'bg-nodri-cyan/10 text-nodri-cyan', purple: 'bg-nodri-purple/10 text-nodri-purple',
  pink: 'bg-nodri-pink/10 text-nodri-pink', blue: 'bg-nodri-blue/10 text-nodri-blue',
  amber: 'bg-nodri-amber/10 text-nodri-amber', green: 'bg-nodri-green/10 text-nodri-green',
  red: 'bg-nodri-red/10 text-nodri-red',
}

const MENU_LINKS: Record<string, { title: string; url: string }[]> = {
  'Manual do Usuário': [
    { title: '1. CONFIRMAR AGENDAMENTO', url: 'https://www.exemplo.com/confirmar-agendamento' },
    { title: '2. BLOQUEIO SEM PREFERENCIA', url: 'https://www.exemplo.com/bloqueio-sem-preferencia' },
    { title: '3. ENVIAR FEEDBACK', url: 'https://www.exemplo.com/enviar-feedback' },
    { title: '4. VER FEEDBACK CLIENTE', url: 'https://www.exemplo.com/ver-feedback-cliente' },
    { title: '5. ENVIAR LISTA', url: 'https://www.exemplo.com/enviar-lista' },
    { title: '6. ENVIAR LISTA C/ ARQUIVO', url: 'https://www.exemplo.com/enviar-lista-arquivo' },
    { title: '7. RELATÓRIO PROFISSIONAL', url: 'https://www.exemplo.com/relatorio-profissional' },
    { title: '8. FATURAMENTO DIÁRIO', url: 'https://www.exemplo.com/faturamento-diario' },
    { title: '9. BAIXAR MUSICA YOUTUBE', url: 'https://www.exemplo.com/baixar-musica-youtube' },
    { title: '10. CALCULAR RESERVA FINANCEIRA', url: 'https://www.exemplo.com/calcular-reserva-financeira' },
    { title: '11. CALCULAR DEPRECIAÇÃO', url: 'https://www.exemplo.com/calculadora-depreciacao' },
    { title: '12. AVALIAR PROFISSIONAL', url: 'https://www.exemplo.com/avaliar-profissional' },
    { title: '13. ALUGUEL DE CADEIRA', url: 'https://www.exemplo.com/aluguel-cadeira' },
    { title: '14. PRECIFICAR SERVIÇOS', url: 'https://www.exemplo.com/precificar-servicos' },
    { title: '15. SOLUÇÃO DE PROBLEMAS', url: 'https://www.exemplo.com/solucao' },
    { title: '16. SUPORTE TÉCNICO', url: 'https://www.exemplo.com/suporte' },
  ],
  'Dicas Nodri': [
    { title: '1. PLANEJAR A META', url: 'https://www.exemplo.com/planejar-meta' },
    { title: '2. AÇÕES COMERCIAIS', url: 'https://www.exemplo.com/acoes-comerciais' },
    { title: '3. COMO VENDER MAIS', url: 'https://www.exemplo.com/como-vender-mais' },
    { title: '4. ANIVERSÁRIOS CLIENTES', url: 'https://www.exemplo.com/aniversarios-clientes' },
    { title: '5. AÇÕES SAZONAIS', url: 'https://www.exemplo.com/acoes-sazonais' },
    { title: '6. SCRIPTS PERSONALIZADAS', url: 'https://www.exemplo.com/scripts-personalizadas' },
    { title: '7. CONFIRMAR AGENDAMENTO', url: 'https://www.exemplo.com/confirmar-agendamento' },
    { title: '8. FEEDBACK CLIENTE', url: 'https://www.exemplo.com/feedback-cliente' },
    { title: '9. LISTAS PROMOCIONAIS', url: 'https://www.exemplo.com/listas-promocionais' },
    { title: '10. FATURAMENTO DIÁRIO', url: 'https://www.exemplo.com/faturamento-diario' },
  ],
  'Gestão de Pessoas': [
    { title: '1. MANUAL DE INTEGRAÇÃO DO PROFISSIONAL', url: 'https://www.exemplo.com/manual-integracao-profissional' },
    { title: '2. PROCESSO DE ATENDIMENTO PROFISSIONAIS', url: 'https://www.exemplo.com/processo-atendimento-profissionais' },
    { title: '3. PROCESSO DE ATENDIMENTO RECEPÇÃO', url: 'https://www.exemplo.com/processo-atendimento-recepcao' },
    { title: '4. DESCRIÇÃO DE CARGOS', url: 'https://www.exemplo.com/descricao-cargos' },
    { title: '5. AVALIAÇÃO 360 PROFISSIONAIS', url: 'https://www.exemplo.com/avaliacao-360-profissionais' },
    { title: '6. METAS INDIVIDUAIS', url: 'https://www.exemplo.com/metas-individuais' },
    { title: '7. GUIA PARA ENTREVISTA', url: 'https://www.exemplo.com/guia-entrevista' },
    { title: '8. BANCO DE CURRÍCULOS', url: 'https://www.exemplo.com/banco-curriculos' },
    { title: '9. AVALIAÇÃO 360 RECEPÇÃO', url: 'https://www.exemplo.com/avaliacao-360-recepcao' },
    { title: '10. FEEDBACK PROFISSIONAL', url: 'https://www.exemplo.com/feedback-profissional' },
    { title: '11. ATRASOS PROFISSIONAIS', url: 'https://www.exemplo.com/atrasos-profissionais' },
  ],
  'Gestão Financeira': [
    { title: '1. COMO DEFINIR A COMISSÃO IDEAL', url: 'https://www.exemplo.com/aula-comissao-ideal' },
    { title: '2. REFORMA TRIBUTÁRIA', url: 'https://www.exemplo.com/reforma-tributaria' },
    { title: '3. CAPITAL DE GIRO E RESERVA', url: 'https://www.exemplo.com/capital-giro-reserva-depreciacao' },
    { title: '4. 4 PILARES DO MARKETING', url: 'https://www.exemplo.com/4-pilares-marketing' },
    { title: '5. RELATÓRIO PROFISSIONAL', url: 'https://www.exemplo.com/relatorio-profissional' },
    { title: '6. CALCULAR RESERVA FINANCEIRA', url: 'https://www.exemplo.com/calcular-reserva-financeira' },
    { title: '7. CALCULADORA DEPRECIAÇÃO', url: 'https://www.exemplo.com/calculadora-depreciacao' },
    { title: '8. ALUGUEL DE CADEIRA', url: 'https://www.exemplo.com/aluguel-cadeira' },
    { title: '9. PRECIFICAR SERVIÇOS', url: 'https://www.exemplo.com/precificar-servicos' },
  ],
  'Marketing': [
    { title: '1. PLANEJAR A META', url: 'https://www.exemplo.com/planejar-meta' },
    { title: '2. AÇÕES COMERCIAIS', url: 'https://www.exemplo.com/acoes-comerciais' },
    { title: '3. COMO VENDER MAIS', url: 'https://www.exemplo.com/como-vender-mais' },
    { title: '4. ANIVERSÁRIOS CLIENTES', url: 'https://www.exemplo.com/aniversarios-clientes' },
    { title: '5. AÇÕES SAZONAIS', url: 'https://www.exemplo.com/acoes-sazonais' },
    { title: '6. SCRIPTS PERSONALIZADAS', url: 'https://www.exemplo.com/scripts-personalizadas' },
    { title: '7. CONFIRMAR AGENDAMENTO', url: 'https://www.exemplo.com/confirmar-agendamento' },
    { title: '8. FEEDBACK CLIENTE', url: 'https://www.exemplo.com/feedback-cliente' },
    { title: '9. LISTAS PROMOCIONAIS', url: 'https://www.exemplo.com/listas-promocionais' },
    { title: '10. FATURAMENTO DIÁRIO', url: 'https://www.exemplo.com/faturamento-diario' },
  ],
}

interface Props {
  salaoNome: string
  plano: string
  modulos: ModuloComStatus[]
  notificacoes: Notificacao[]
  totalAtivos: number
  totalModulos: number
}

// Inject shimmer animation + white bg override
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
    @keyframes pulseDot { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.3); opacity: 0.7 } }
    .nodri-salon-bg { background-color: #0a1f1a !important; }
  `
  if (!document.getElementById('nodri-animations')) { style.id = 'nodri-animations'; document.head.appendChild(style) }
}

export default function SalonDashboard({ salaoNome, plano, modulos, notificacoes, totalAtivos, totalModulos }: Props) {
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'bloqueados'>('todos')
  const [notifDismissed, setNotifDismissed] = useState(false)
  const [notifIndex, setNotifIndex] = useState(0)
  const [busca, setBusca] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Auto-rotate notifications every 5 seconds
  useEffect(() => {
    if (notificacoes.length <= 1) return
    const timer = setInterval(() => setNotifIndex(i => i + 1), 5000)
    return () => clearInterval(timer)
  }, [notificacoes.length])

  const primeiraNotif = notificacoes[0]

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const modulosFiltrados = modulos.filter(m => {
    if (filtro === 'ativos') return m.habilitado
    if (filtro === 'bloqueados') return !m.habilitado
    if (busca) return m.nome.toLowerCase().includes(busca.toLowerCase())
    return true
  })

  function handleLogout() {
    window.location.href = '/logout'
  }

  function handleAbrir(modulo: ModuloComStatus) {
    if (!modulo.habilitado) {
      toast('Entre em contato para ativar este módulo.', { icon: '🔒' })
      return
    }
    toast.success(`Abrindo ${modulo.nome}...`)
  }

  const planoLabel = plano === 'premium' ? 'Plano Premium' : plano === 'profissional' ? 'Plano Profissional' : 'Plano Básico'
  const initials = salaoNome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const TABS = ['Todos os Módulos', 'Manual do Usuário', 'Dicas Nodri', 'Gestão de Pessoas', 'Gestão Financeira', 'Marketing']

  return (
    <div className="nodri-salon-bg min-h-screen flex flex-col">

      {/* NAVBAR */}
      <nav className="bg-nodri-surface border-b border-nodri-border px-5 py-2.5 flex items-center gap-3 sticky top-0" style={{ zIndex: 50 }}>
        <div className="flex items-center gap-2.5 mr-2 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-syne font-black text-sm text-black"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)' }}>N</div>
          <div>
            <div className="font-syne font-bold text-sm text-nodri-t1 leading-none">NODRI</div>
            <div className="text-[8px] text-nodri-pink tracking-[1.5px] uppercase leading-none mt-0.5">Estilo & Beleza</div>
          </div>
        </div>

        <div className="w-px h-5 bg-nodri-border shrink-0" />

        <div ref={dropdownRef} className="flex gap-0.5 bg-nodri-card border border-nodri-border rounded-lg p-0.5">
          {TABS.map(tab => (
            <div key={tab} className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === tab ? null : tab)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                  openDropdown === tab
                    ? 'bg-nodri-surface text-nodri-cyan border border-nodri-cyan/30'
                    : 'text-nodri-t2 hover:text-nodri-t1 hover:bg-nodri-surface/50'
                }`}>
                {tab}
                {tab !== 'Todos os Módulos' && (
                  <ChevronDown size={10} className={`transition-transform duration-200 ${openDropdown === tab ? 'rotate-180 text-nodri-cyan' : ''}`} />
                )}
              </button>

              {openDropdown === tab && tab !== 'Todos os Módulos' && MENU_LINKS[tab] && (
                <div style={{ position: 'fixed', zIndex: 9999, marginTop: '4px' }}
                  className="bg-nodri-card border border-nodri-border rounded-xl shadow-2xl min-w-[300px] max-h-80 overflow-y-auto">
                  <div className="px-3 py-2 border-b border-nodri-border sticky top-0 bg-nodri-card">
                    <div className="text-[10px] font-bold text-nodri-cyan uppercase tracking-wider">{tab}</div>
                  </div>
                  {MENU_LINKS[tab].map((item, i) => (
                    <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center justify-between px-3 py-2.5 hover:bg-nodri-surface transition-colors group border-b border-nodri-border/30 last:border-0">
                      <span className="text-[11.5px] text-nodri-t2 group-hover:text-nodri-t1 transition-colors">{item.title}</span>
                      <ExternalLink size={11} className="text-nodri-t3 group-hover:text-nodri-cyan transition-colors shrink-0 ml-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <div className="relative hidden md:block">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nodri-t3" />
            <input type="text" placeholder="Buscar módulo..." value={busca} onChange={e => setBusca(e.target.value)}
              className="bg-nodri-card border border-nodri-border rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-nodri-t1 placeholder-nodri-t3 outline-none focus:border-nodri-cyan/40 w-36" />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-nodri-cyan/7 border border-nodri-cyan/17 rounded-lg text-[10.5px] text-nodri-cyan font-semibold">
            <CheckCircle size={12} />{totalAtivos}/{totalModulos} ativos
          </div>
          <button className="relative w-8 h-8 bg-nodri-card border border-nodri-border rounded-lg flex items-center justify-center text-nodri-t2 hover:text-nodri-cyan transition-all">
            <Bell size={14} />
            {notificacoes.length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-nodri-red rounded-full" />}
          </button>
          <button className="w-8 h-8 bg-nodri-card border border-nodri-border rounded-lg flex items-center justify-center text-nodri-t2 hover:text-nodri-cyan transition-all">
            <Settings size={14} />
          </button>
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-nodri-purple/8 border border-nodri-purple/20 rounded-lg">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)' }}>{initials}</div>
            <div className="hidden sm:block">
              <div className="text-[11px] font-medium text-nodri-t1 leading-none">{salaoNome}</div>
              <div className="text-[9px] text-nodri-purple leading-none mt-0.5">{planoLabel}</div>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-8 h-8 bg-nodri-card border border-nodri-border rounded-lg flex items-center justify-center text-nodri-t3 hover:text-nodri-red hover:border-nodri-red/30 transition-all" title="Sair">
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      {/* NOTIFICATION BANNER */}
      {notificacoes.length > 0 && !notifDismissed && (() => {
        const notif = notificacoes[notifIndex % notificacoes.length]
        return (
          <div className="mx-5 mt-3 rounded-xl overflow-hidden" style={{ boxShadow: '0 4px 32px rgba(99,102,241,0.25)' }}>
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: '#ffffff' }}>
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  <Bell size={18} color="#fff" />
                </div>
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2" style={{ background: '#ef4444', borderColor: '#fff', animation: 'pulseDot 1.5s ease infinite' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Aviso do Sistema</span>
                  <span style={{ background: '#6366f1', color: '#fff', fontSize: '8px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.5px' }}>NOVO</span>
                  {notificacoes.length > 1 && (
                    <span style={{ fontSize: '9px', color: '#8b5cf6', marginLeft: '4px', fontWeight: 600 }}>
                      {(notifIndex % notificacoes.length) + 1}/{notificacoes.length}
                    </span>
                  )}
                  <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: 'auto' }}>
                    {new Date(notif.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', lineHeight: 1.45 }}>{notif.mensagem}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {notificacoes.length > 1 && (
                  <button onClick={() => setNotifIndex(i => i + 1)}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', color: '#6366f1' }}
                    title="Próxima notificação">›</button>
                )}
                <button onClick={() => setNotifDismissed(true)}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={13} color="#64748b" />
                </button>
              </div>
            </div>
            <div style={{ height: '3px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899, #06b6d4, #6366f1)', backgroundSize: '300% 100%', animation: 'shimmer 3s linear infinite' }} />
          </div>
        )
      })()}

      {/* FILTERS */}
      <div className="px-5 pt-4 pb-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-syne font-bold text-[13px] text-nodri-t1">Módulos do Sistema</h1>
          <span className="text-[11px] text-nodri-t2"><span className="text-nodri-cyan font-semibold">{totalAtivos}</span>/{totalModulos} módulos ativados</span>
        </div>
        <div className="flex gap-1.5">
          {(['todos', 'ativos', 'bloqueados'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-md text-[10.5px] capitalize border transition-all ${filtro === f ? 'bg-nodri-cyan/9 border-nodri-cyan/25 text-nodri-cyan' : 'border-nodri-border text-nodri-t2 hover:text-nodri-t1'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* MODULES GRID */}
      <div className="flex-1 px-5 py-3 pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {modulosFiltrados.map(modulo => {
            const iconEmoji = ICON_MAP[modulo.icone] || '⚙️'
            const corClass = COR_MAP[modulo.cor_classe] || COR_MAP.cyan
            return (
              <div key={modulo.id}
                className={`nodri-card p-4 flex flex-col cursor-pointer transition-all hover:-translate-y-0.5 relative overflow-hidden ${modulo.habilitado ? 'border-nodri-cyan/35 bg-nodri-cyan/[0.03]' : 'opacity-60'}`}>
                {modulo.habilitado && <div className="absolute top-0 left-0 right-0 h-0.5 bg-nodri-cyan" />}
                <div className="flex items-start justify-between mb-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${corClass}`}>{iconEmoji}</div>
                  <span className="text-[9px] text-nodri-t3 bg-nodri-surface px-1.5 py-0.5 rounded-full border border-nodri-border">v{modulo.versao}</span>
                </div>
                <div className="font-syne font-bold text-[10.5px] uppercase tracking-wide text-nodri-t1 leading-snug mb-1.5">{modulo.nome}</div>
                <p className="text-[10px] text-nodri-t2 leading-relaxed mb-3 flex-1">{modulo.descricao}</p>
                <div className="flex items-center justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-1.5 text-[9.5px] font-semibold">
                    <span className={`w-1.5 h-1.5 rounded-full ${modulo.habilitado ? 'bg-nodri-green shadow-[0_0_6px_#22c55e]' : 'bg-nodri-red'}`} />
                    <span className={modulo.habilitado ? 'text-nodri-green' : 'text-nodri-red'}>{modulo.habilitado ? 'Ativado' : 'Bloqueado'}</span>
                  </div>
                  <button onClick={() => handleAbrir(modulo)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10.5px] font-bold transition-all ${modulo.habilitado ? 'bg-nodri-cyan text-black hover:brightness-110' : 'border border-nodri-pink text-nodri-pink hover:bg-nodri-pink/10'}`}>
                    {modulo.habilitado ? <><Play size={9} fill="black" /> Abrir</> : <><Zap size={9} /> Ativar</>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {modulosFiltrados.length === 0 && (
          <div className="text-center py-16 text-nodri-t3"><div className="text-4xl mb-3">🔍</div><p className="text-sm">Nenhum módulo encontrado</p></div>
        )}
      </div>
    </div>
  )
}
