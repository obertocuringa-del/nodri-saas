'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Settings, CheckCircle, X, Zap, Play, Search, ChevronDown, ArrowRight, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import type { ModuloComStatus, Notificacao } from '@/types'

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

if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes shimmer { 0% { background-position: 0% 0 } 100% { background-position: 300% 0 } }
    @keyframes pulseDot { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.4); opacity: 0.6 } }
    .nodri-salon-bg { background-color: #000000 !important; }
  `
  if (!document.getElementById('nodri-animations')) { style.id = 'nodri-animations'; document.head.appendChild(style) }
}

export default function SalonDashboard({ salaoNome, plano, modulos, notificacoes, totalAtivos, totalModulos }: Props) {
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'bloqueados'>('todos')
  const [notifDismissed, setNotifDismissed] = useState(false)
  const [notifIndex, setNotifIndex] = useState(0)
  const [busca, setBusca] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const TABS_FIXAS = ['Todos os Módulos', 'Manual do Usuário', 'Dicas Nodri', 'Gestão de Pessoas', 'Gestão Financeira', 'Marketing', 'Feedback de Cliente', 'Feedback Profissional']
  const [menuDinamico, setMenuDinamico] = useState<Record<string, { title: string; url: string }[]>>(MENU_LINKS)
  const [tabsExtras, setTabsExtras] = useState<string[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Carrega páginas e categorias criadas no Editor de Páginas do admin
  useEffect(() => {
    fetch('/api/menu-estrutura')
      .then(r => r.json())
      .then((estrutura: any[] | null) => {
        if (!estrutura || !Array.isArray(estrutura) || estrutura.length === 0) return
        const links: Record<string, { title: string; url: string }[]> = { ...MENU_LINKS }
        const novasAbas: string[] = []

        function norm(s: string) {
          return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        }

        for (const cat of estrutura) {
          if (!cat.itens?.length) continue
          // verifica se é categoria já existente (por nome normalizado)
          const chaveExistente = Object.keys(MENU_LINKS).find(k => norm(k) === norm(cat.categoria))
          const chave = chaveExistente || cat.categoria

          // se for categoria nova, adiciona como aba extra
          if (!chaveExistente && !TABS_FIXAS.some(t => norm(t) === norm(cat.categoria))) {
            if (!novasAbas.includes(chave)) novasAbas.push(chave)
          }

          const existentes = new Set((links[chave] || []).map((l: any) => norm(l.title)))
          const novos = cat.itens
            .filter((item: any) => !existentes.has(norm(item.titulo)))
            .map((item: any) => ({ title: item.titulo, url: `/conteudo/${item.slug}` }))
          links[chave] = [...(links[chave] || []), ...novos]
        }
        setMenuDinamico(links)
        setTabsExtras(novasAbas)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (notificacoes.length <= 1) return
    const timer = setInterval(() => setNotifIndex(i => i + 1), 5000)
    return () => clearInterval(timer)
  }, [notificacoes.length])

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
    // FIX: combinação correta de filtro status + busca por nome
    const passaFiltro = filtro === 'ativos' ? m.habilitado : filtro === 'bloqueados' ? !m.habilitado : true
    const passaBusca = !busca || m.nome.toLowerCase().includes(busca.toLowerCase())
    return passaFiltro && passaBusca
  })

  function handleLogout() { window.location.href = '/logout' }

  // Detecta se admin está impersonando
  const [impersonandoNome, setImpersonandoNome] = useState<string | null>(null)
  useEffect(() => {
    const nome = localStorage.getItem('nodri_impersonando')
    if (nome) setImpersonandoNome(nome)
  }, [])

  function voltarAoAdmin() {
    const adminToken = localStorage.getItem('nodri_admin_token')
    if (adminToken) {
      document.cookie = `nodri_token=${adminToken}; path=/; max-age=604800`
    }
    localStorage.removeItem('nodri_admin_token')
    localStorage.removeItem('nodri_impersonando')
    window.location.href = '/admin'
  }

  const MODULO_SLUG: Record<string, string> = {
    'Confirmar Agendamento':         'confirmacao_agendamento',
    'Baixar Música YouTube':         'baixar-musica',
    'Bloqueio Sem Preferência':      'bloqueio',
    'Enviar Feedback':               'enviar-feedback',
    'Enviar Lista':                  'enviar-lista',
    'Enviar Lista c/ Arquivo':       'mensagem-foto',
    'Relatório Profissional':        'relatorio-profissional',
    'Faturamento Diário':            'faturamento-diario',
    'Ver Feedback Cliente':          'ver-feedback-cliente',
    'Calcular Reserva Financeira':   'calcular-reserva',
    'Calculadora Depreciação':       'calculadora-depreciacao',
    'Avaliar Profissional':          'avaliar-profissional',
    'Aluguel de Cadeira':            'aluguel-cadeira',
    'Precificar Serviços':           'precificar-servicos',
  }

  function handleAbrir(modulo: ModuloComStatus) {
    // Em manutenção — bloqueia mesmo que habilitado
    if (modulo.em_manutencao) {
      toast(modulo.msg_manutencao || '🔧 Módulo em manutenção. Voltaremos em breve!', {
        icon: '🔧',
        style: { background: '#1a0000', color: '#ff4444', border: '1px solid #ff4444', fontWeight: 'bold' },
        duration: 4000,
      })
      return
    }
    if (!modulo.habilitado) {
      toast('Entre em contato para ativar este módulo.', { icon: '🔒' })
      return
    }
    const slug = MODULO_SLUG[modulo.nome] || modulo.nome.toLowerCase().replace(/ /g, '-')
    fetch(`http://127.0.0.1:47200/launch/${slug}`, { mode: 'no-cors' }).catch(() => {})
  }

  const planoLabel = plano === 'premium' ? 'Plano Premium' : plano === 'profissional' ? 'Plano Profissional' : 'Plano Básico'
  const initials = salaoNome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const TABS = [...TABS_FIXAS, ...tabsExtras]

  const CATEGORIAS_CONTEUDO = TABS_FIXAS.filter(t => t !== 'Todos os Módulos' && t !== 'Feedback de Cliente' && t !== 'Feedback Profissional')
  const TODAS_CATEGORIAS = [...CATEGORIAS_CONTEUDO, ...tabsExtras]

  return (
    <div className="nodri-salon-bg min-h-screen flex flex-col">

      {/* FAIXA DE IMPERSONAÇÃO */}
      {impersonandoNome && (
        <div className="flex items-center justify-between px-4 py-2 text-[12px] font-bold z-[60] sticky top-0"
          style={{ background: '#854d0e', color: '#fef3c7', borderBottom: '2px solid #ca8a04' }}>
          <div className="flex items-center gap-2">
            <span>👁️ Você está acessando como cliente:</span>
            <span className="px-2 py-0.5 rounded font-black" style={{ background: '#ca8a04', color: '#1c1917' }}>{impersonandoNome}</span>
            <span style={{ color: '#fde68a', fontWeight: 'normal' }}>— Sessão temporária (2h)</span>
          </div>
          <button onClick={voltarAoAdmin}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-[11px] transition-all hover:brightness-110"
            style={{ background: '#1c1917', color: '#fbbf24', border: '1px solid #ca8a04' }}>
            ← Voltar ao Admin
          </button>
        </div>
      )}

      {/* LAYOUT PRINCIPAL: SIDEBAR + CONTEÚDO */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ── */}
        <aside ref={dropdownRef} className="w-[210px] min-w-[210px] bg-nodri-surface border-r border-nodri-border flex flex-col overflow-y-auto">

          {/* Logo */}
          <div className="px-4 py-4 border-b border-nodri-border flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-syne font-black text-sm text-black"
              style={{ background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)' }}>N</div>
            <div>
              <div className="font-syne font-bold text-[13px]">NODRI</div>
              <div className="text-[8px] text-nodri-pink tracking-[1.5px] uppercase">Estilo & Beleza</div>
            </div>
          </div>

          <nav className="flex-1 p-2 space-y-0.5">

            {/* MÓDULOS */}
            <p className="text-[9px] text-nodri-t3 uppercase tracking-widest px-2.5 py-1.5 font-medium mt-1">Módulos</p>
            <button onClick={() => setFiltro('todos')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11.5px] border transition-all ${filtro === 'todos' && busca === '' ? 'bg-nodri-cyan/9 text-nodri-cyan border-nodri-cyan/17' : 'text-nodri-t2 border-transparent hover:bg-white/4 hover:text-nodri-t1'}`}>
              ⚡ Todos os Módulos
            </button>
            <button onClick={() => setFiltro('ativos')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11.5px] border transition-all ${filtro === 'ativos' ? 'bg-nodri-cyan/9 text-nodri-cyan border-nodri-cyan/17' : 'text-nodri-t2 border-transparent hover:bg-white/4 hover:text-nodri-t1'}`}>
              ✅ Ativos
            </button>
            <button onClick={() => setFiltro('bloqueados')}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11.5px] border transition-all ${filtro === 'bloqueados' ? 'bg-nodri-cyan/9 text-nodri-cyan border-nodri-cyan/17' : 'text-nodri-t2 border-transparent hover:bg-white/4 hover:text-nodri-t1'}`}>
              🔒 Bloqueados
            </button>

            {/* CONTEÚDO */}
            <p className="text-[9px] text-nodri-t3 uppercase tracking-widest px-2.5 py-1.5 font-medium mt-3">Conteúdo</p>
            {TODAS_CATEGORIAS.map(cat => (
              <div key={cat}>
                <button onClick={() => setOpenDropdown(openDropdown === cat ? null : cat)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11.5px] border transition-all ${openDropdown === cat ? 'bg-nodri-cyan/9 text-nodri-cyan border-nodri-cyan/17' : 'text-nodri-t2 border-transparent hover:bg-white/4 hover:text-nodri-t1'}`}>
                  <span className="truncate">{cat}</span>
                  <ChevronDown size={11} className={`shrink-0 transition-transform ${openDropdown === cat ? 'rotate-180 text-nodri-cyan' : ''}`} />
                </button>
                {openDropdown === cat && menuDinamico[cat] && (
                  <div className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l border-nodri-border pl-2">
                    {menuDinamico[cat].map((item, i) => {
                      const slug = item.url?.startsWith('/conteudo/') ? item.url.replace('/conteudo/', '') :
                        item.title.toLowerCase().replace(/^\d+\.\s*/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
                      return (
                        <a key={i} href={`/conteudo/${slug}`}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[10.5px] text-nodri-t3 hover:text-nodri-cyan hover:bg-white/3 transition-all truncate">
                          <ArrowRight size={9} className="shrink-0" />{item.title.replace(/^\d+\.\s*/, '')}
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* FERRAMENTAS */}
            <p className="text-[9px] text-nodri-t3 uppercase tracking-widest px-2.5 py-1.5 font-medium mt-3">Ferramentas</p>
            <a href="/salon/feedback"
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11.5px] border border-transparent text-nodri-pink hover:bg-nodri-pink/8 hover:border-nodri-pink/20 transition-all">
              ⭐ Feedback de Cliente
            </a>
            <a href="/salon/feedback-profissional"
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11.5px] border border-transparent text-nodri-purple hover:bg-nodri-purple/8 hover:border-nodri-purple/20 transition-all">
              👥 Feedback Profissional
            </a>
          </nav>

          {/* Rodapé da sidebar */}
          <div className="p-2 border-t border-nodri-border space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-white/3 rounded-lg border border-nodri-border">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)' }}>{initials}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-medium truncate">{salaoNome}</div>
                <div className="text-[9px] text-nodri-purple">{planoLabel}</div>
              </div>
            </div>
            <div className="flex gap-1">
              <button className="relative flex-1 h-7 bg-nodri-card border border-nodri-border rounded-lg flex items-center justify-center text-nodri-t2 hover:text-nodri-cyan transition-all">
                <Bell size={13} />
                {notificacoes.length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-nodri-red rounded-full" />}
              </button>
              <a href="/salon/perfil" className="flex-1 h-7 bg-nodri-card border border-nodri-border rounded-lg flex items-center justify-center text-nodri-t2 hover:text-nodri-cyan transition-all">
                <Settings size={13} />
              </a>
              <button onClick={handleLogout} title="Sair"
                className="flex-1 h-7 bg-nodri-card border border-nodri-border rounded-lg flex items-center justify-center text-nodri-t3 hover:text-nodri-red hover:border-nodri-red/30 transition-all">
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </aside>

        {/* ── CONTEÚDO PRINCIPAL ── */}
        <main className="flex-1 overflow-y-auto flex flex-col">

          {/* Barra superior fina */}
          <div className="px-5 py-2.5 border-b border-nodri-border bg-nodri-surface/50 flex items-center gap-3 sticky top-0 z-10">
            <div className="flex items-center gap-2 flex-1">
              <h1 className="font-syne font-bold text-[13px] text-nodri-t1">Módulos do Sistema</h1>
              <span className="text-[11px] text-nodri-t2"><span className="text-nodri-cyan font-semibold">{totalAtivos}</span>/{totalModulos} ativados</span>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nodri-t3" />
              <input type="text" placeholder="Buscar módulo..." value={busca} onChange={e => setBusca(e.target.value)}
                className="bg-nodri-card border border-nodri-border rounded-lg pl-7 pr-3 py-1.5 text-[11px] outline-none focus:border-nodri-cyan/40 w-40" />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-nodri-cyan/7 border border-nodri-cyan/17 rounded-lg text-[10.5px] text-nodri-cyan font-semibold">
              <CheckCircle size={12} />{totalAtivos}/{totalModulos} ativos
            </div>
          </div>

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
                      <span style={{ background: '#6366f1', color: '#fff', fontSize: '8px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px' }}>NOVO</span>
                      {notificacoes.length > 1 && <span style={{ fontSize: '9px', color: '#8b5cf6', fontWeight: 600 }}>{(notifIndex % notificacoes.length) + 1}/{notificacoes.length}</span>}
                      <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: 'auto' }}>{new Date(notif.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', lineHeight: 1.45 }}>{notif.mensagem}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {notificacoes.length > 1 && (
                      <button onClick={() => setNotifIndex(i => i + 1)}
                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', color: '#6366f1' }}>›</button>
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

          {/* MODULES GRID */}
          <div className="flex-1 px-5 py-4 pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {modulosFiltrados.map(modulo => {
            const emManutencao = !!modulo.em_manutencao
            return (
            <div key={modulo.id}
              className="p-4 flex flex-col cursor-pointer transition-all hover:-translate-y-0.5 relative overflow-hidden rounded-xl border"
              style={{
                background: emManutencao ? '#1a0a0a' : modulo.habilitado ? '#0a1f14' : '#111318',
                borderColor: emManutencao ? 'rgba(239,68,68,0.35)' : modulo.habilitado ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)',
                opacity: emManutencao ? 0.9 : modulo.habilitado ? 1 : 0.5,
                boxShadow: modulo.habilitado && !emManutencao ? 'inset 0 0 30px rgba(34,197,94,0.04)' : undefined,
              }}>

              {/* Faixa de manutenção ou ativo no topo */}
              {emManutencao && (
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: '#ef4444' }} />
              )}
              {modulo.habilitado && !emManutencao && (
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'rgba(34,197,94,0.4)' }} />
              )}

              <div className="flex justify-end mb-3">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}>
                  v{modulo.versao}
                </span>
              </div>

              <div className="font-syne font-bold text-[13px] uppercase tracking-wide leading-snug mb-1.5"
                style={{ color: emManutencao ? '#f87171' : modulo.habilitado ? '#d1fae5' : '#475569' }}>
                {modulo.nome}
              </div>
              <p className="text-[10px] leading-relaxed mb-4 flex-1" style={{ color: '#475569' }}>
                {modulo.descricao}
              </p>

              <div className="flex items-center justify-between gap-2 mt-auto">
                {/* Badge de status */}
                {emManutencao ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}>
                      🔧 MANUTENÇÃO
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: modulo.habilitado ? '#6ee7b7' : '#ef4444',
                        boxShadow: modulo.habilitado ? '0 0 6px rgba(110,231,183,0.5)' : 'none'
                      }} />
                    <span className="text-[9.5px] font-medium"
                      style={{ color: modulo.habilitado ? '#6ee7b7' : '#ef4444' }}>
                      {modulo.habilitado ? 'Ativado' : 'Bloqueado'}
                    </span>
                  </div>
                )}

                {/* Botão */}
                <button onClick={() => handleAbrir(modulo)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all"
                  style={emManutencao ? {
                    background: 'rgba(239,68,68,0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.3)',
                  } : modulo.habilitado ? {
                    background: 'rgba(255,255,255,0.08)',
                    color: '#f1f5f9',
                    border: '1px solid rgba(255,255,255,0.1)',
                  } : {
                    background: 'transparent',
                    color: '#8b5cf6',
                    border: '1px solid rgba(139,92,246,0.3)',
                  }}>
                  {emManutencao
                    ? <>🔧 Indisponível</>
                    : modulo.habilitado
                      ? <><Play size={9} fill="#f1f5f9" /> Abrir</>
                      : <><Zap size={9} /> Ativar</>}
                </button>
              </div>
            </div>
            )
          })}
        </div>
          {modulosFiltrados.length === 0 && (
            <div className="text-center py-16" style={{ color: '#475569' }}>
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-sm">Nenhum módulo encontrado</p>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  )
}
