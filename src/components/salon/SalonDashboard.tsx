'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Settings, CheckCircle, X, Zap, Play, Search, ChevronDown, ArrowRight, LogOut, Menu, Wrench, Lock, Eye } from 'lucide-react'
import ChatWidget from './ChatWidget'
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
    @keyframes nodriPulseBtn { 0%,100% { box-shadow: 0 0 0 0 rgba(234,179,8,0); opacity:1 } 50% { box-shadow: 0 0 0 5px rgba(234,179,8,0.25); opacity:0.85 } }
    .nodri-salon-bg { background-color: #000000 !important; }
  `
  if (!document.getElementById('nodri-animations')) { style.id = 'nodri-animations'; document.head.appendChild(style) }
}

export default function SalonDashboard({ salaoNome, plano, modulos, notificacoes, totalAtivos, totalModulos }: Props) {
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'bloqueados'>('ativos')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifDismissed, setNotifDismissed] = useState(false)
  const [notifIndex, setNotifIndex] = useState(0)
  const [busca, setBusca] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [configPrograma, setConfigPrograma] = useState<{ link: string; link_atualizacao: string; atualizacao_ativa: boolean } | null>(null)
  const [alertasIA, setAlertasIA] = useState<{ tipo: string; titulo: string; mensagem: string; icone: string; pct?: number; diasRestantes?: number }[]>([])
  const [alertasDismissed, setAlertasDismissed] = useState<Set<string>>(new Set())
  const [mostrarAlertasIA, setMostrarAlertasIA] = useState(false)

  useEffect(() => {
    fetch('/api/config/programa')
      .then(r => r.json())
      .then(d => {
        if (d && typeof d === 'object' && !Array.isArray(d)) setConfigPrograma(d)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/ia/alertas')
      .then(r => r.json())
      .then(d => { if (d.alertas) setAlertasIA(d.alertas) })
      .catch(() => {})
  }, [])
  const TABS_FIXAS = ['Todos os Módulos', 'Manual do Usuário', 'Dicas Nodri', 'Feedback de Cliente', 'Feedback Profissional']
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

        // Categorias ocultas — usadas para remover itens de menus fixos também
        const categoriasOcultas = new Set(
          estrutura.filter((c: any) => c.oculto).map((c: any) => norm(c.categoria))
        )

        for (const cat of estrutura) {
          if (!cat.itens?.length) continue
          // verifica se é categoria já existente (por nome normalizado)
          const chaveExistente = Object.keys(MENU_LINKS).find(k => norm(k) === norm(cat.categoria))
          const chave = chaveExistente || cat.categoria

          // categoria oculta: remove do menu fixo e não adiciona nova aba
          if (cat.oculto) {
            delete links[chave]
            continue
          }

          // se for categoria nova, adiciona como aba extra
          if (!chaveExistente && !TABS_FIXAS.some(t => norm(t) === norm(cat.categoria))) {
            if (!novasAbas.includes(chave)) novasAbas.push(chave)
          }

          const existentes = new Set((links[chave] || []).map((l: any) => norm(l.title)))
          const novos = cat.itens
            .filter((item: any) => !item.oculto)
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

  // Módulos que abrem página web em vez de lançar programa local
  const MODULO_WEB_SLUG: Array<{ chaves: string[]; url: string }> = [
    { chaves: ['academia nodri'], url: '/salon/academia' },
    { chaves: ['custo operacional', 'calculadora / financeira', 'calculadora/financeira'], url: '/salon/calculadora-custo' },
    { chaves: ['profissionais'], url: '/salon/profissionais' },
    { chaves: ['relatórios', 'relatorios'], url: '/salon/relatorios' },
  ]
  function getModuloWebUrl(nome: string): string | null {
    const norm = nome.toLowerCase().trim()
    return MODULO_WEB_SLUG.find(m => m.chaves.some(c => norm.includes(c)))?.url ?? null
  }

  function handleAbrir(modulo: ModuloComStatus) {
    // Em manutenção — bloqueia mesmo que habilitado
    if (modulo.em_manutencao) {
      toast(modulo.msg_manutencao || 'Módulo em manutenção. Voltaremos em breve!', {
        icon: '🔧',
        style: { background: '#fff0f0', color: '#ff4444', border: '1px solid #ff4444', fontWeight: 'bold' },
        duration: 4000,
      })
      return
    }
    const webUrl = getModuloWebUrl(modulo.nome)
    if (webUrl) {
      window.location.href = webUrl
      return
    }
    if (!modulo.habilitado) {
      toast('Entre em contato para ativar este módulo.')
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
            <span className="flex items-center gap-1"><Eye size={13} /> Você está acessando como cliente:</span>
            <span className="px-2 py-0.5 rounded font-black" style={{ background: '#ca8a04', color: '#faf9f7' }}>{impersonandoNome}</span>
            <span style={{ color: '#fde68a', fontWeight: 'normal' }}>— Sessão temporária (2h)</span>
          </div>
          <button onClick={voltarAoAdmin}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-[11px] transition-all hover:brightness-110"
            style={{ background: '#faf9f7', color: '#fbbf24', border: '1px solid #ca8a04' }}>
            ← Voltar ao Admin
          </button>
        </div>
      )}

      {/* LAYOUT PRINCIPAL: SIDEBAR + CONTEÚDO */}
      <div className="flex flex-1 overflow-hidden">

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── SIDEBAR ── */}
        <aside ref={dropdownRef} className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          w-[260px] lg:w-[210px] min-w-[210px]
          bg-nodri-surface border-r border-nodri-border flex flex-col overflow-y-auto
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>

          {/* Logo */}
          <div className="px-4 py-4 border-b border-nodri-border flex items-center gap-2.5">
            <img src="/logo.png" alt="NODRI" className="w-8 h-8 rounded-lg object-contain" />
            <div>
              <div className="font-syne font-bold text-[13px]">NODRI</div>
              <div className="text-[8px] text-nodri-pink tracking-[1.5px] uppercase">Estilo & Beleza</div>
            </div>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-0.5">

            {/* MÓDULOS */}
            <p className="text-[10px] font-bold text-nodri-t1 uppercase tracking-[2px] px-2 pb-1 border-b border-nodri-border mb-1">Módulos</p>
            {[
              { label: 'TODOS OS MÓDULOS', onClick: () => setFiltro('todos'), active: filtro === 'todos' && busca === '' },
              { label: 'ATIVOS',           onClick: () => setFiltro('ativos'), active: filtro === 'ativos' },
              { label: 'BLOQUEADOS',       onClick: () => setFiltro('bloqueados'), active: filtro === 'bloqueados' },
            ].map(item => (
              <button key={item.label} onClick={item.onClick}
                className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-medium tracking-wide transition-colors ${item.active ? 'bg-white/6 text-nodri-t1' : 'text-nodri-t3 hover:text-nodri-t2 hover:bg-white/3'}`}>
                {item.label}
              </button>
            ))}

            {/* CONTEÚDO */}
            <div className="pt-4 pb-1">
              <p className="text-[10px] font-bold text-nodri-t1 uppercase tracking-[2px] px-2 pb-1 border-b border-nodri-border mb-1">Conteúdo</p>
            </div>
            {TODAS_CATEGORIAS.map(cat => (
              <div key={cat}>
                <button onClick={() => setOpenDropdown(openDropdown === cat ? null : cat)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-[11px] font-medium tracking-wide transition-colors ${openDropdown === cat ? 'bg-white/6 text-nodri-t1' : 'text-nodri-t3 hover:text-nodri-t2 hover:bg-white/3'}`}>
                  <span className="truncate uppercase">{cat}</span>
                  <ChevronDown size={11} className={`shrink-0 transition-transform ml-1 ${openDropdown === cat ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === cat && menuDinamico[cat] && (
                  <div className="ml-3 mt-0.5 mb-1 border-l border-nodri-border pl-2 space-y-0.5">
                    {menuDinamico[cat].map((item, i) => {
                      const slug = item.url?.startsWith('/conteudo/') ? item.url.replace('/conteudo/', '') :
                        item.title.toLowerCase().replace(/^\d+\.\s*/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
                      return (
                        <a key={i} href={`/conteudo/${slug}`}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium text-nodri-t3 hover:text-nodri-t1 hover:bg-white/3 transition-colors truncate uppercase">
                          <ArrowRight size={9} className="shrink-0 opacity-50" />{item.title.replace(/^\d+\.\s*/, '')}
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* FERRAMENTAS */}
            <div className="pt-4 pb-1">
              <p className="text-[10px] font-bold text-nodri-t1 uppercase tracking-[2px] px-2 pb-1 border-b border-nodri-border mb-1">Ferramentas</p>
            </div>
            <a href="/salon/feedback"
              className="w-full flex items-center px-3 py-2 rounded-md text-[11px] font-medium tracking-wide text-nodri-pink hover:bg-nodri-pink/8 transition-colors uppercase">
              Feedback de Cliente
            </a>
            <a href="/salon/feedback-profissional"
              className="w-full flex items-center px-3 py-2 rounded-md text-[11px] font-medium tracking-wide text-nodri-purple hover:bg-nodri-purple/8 transition-colors uppercase">
              Feedback Profissional
            </a>
            <a href="/salon/pendencias"
              className="w-full flex items-center px-3 py-2 rounded-md text-[11px] font-medium tracking-wide uppercase transition-colors"
              style={{ color: '#f97316' }}>
              Pendências
            </a>
            <a href="/salon/servicos"
              className="w-full flex items-center px-3 py-2 rounded-md text-[11px] font-medium tracking-wide text-nodri-purple hover:bg-nodri-purple/8 transition-colors uppercase">
              Serviços
            </a>
          </nav>

          {/* Rodapé da sidebar */}
          <div className="p-2 border-t border-nodri-border space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-white/3 rounded-lg border border-nodri-border">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #5b4fcf, #f43f8e)' }}>{initials}</div>
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
          <div className="border-b border-nodri-border bg-nodri-surface/50 sticky top-0 z-10">
            <div className="px-3 lg:px-5 py-2.5 flex items-center gap-2 lg:gap-3">
              {/* Hamburger mobile */}
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg text-nodri-t2 hover:text-nodri-cyan">
                <Menu size={18} />
              </button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h1 className="font-syne font-bold text-[13px] text-nodri-t1 truncate">Módulos</h1>
                <span className="text-[11px] text-nodri-t2 hidden sm:inline"><span className="text-nodri-cyan font-semibold">{totalAtivos}</span>/{totalModulos}</span>
              </div>
              {configPrograma?.link && (
                <div className="hidden md:flex items-center gap-2">
                  <a href={configPrograma.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition-all hover:brightness-110"
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', color: '#5b4fcf' }}>
                    Baixar Programa
                  </a>
                  {configPrograma.atualizacao_ativa && configPrograma.link_atualizacao && (
                    <a href={configPrograma.link_atualizacao} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] font-bold"
                      style={{ background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.45)', color: '#facc15', animation: 'nodriPulseBtn 1.8s ease-in-out infinite' }}>
                      Atualização
                    </a>
                  )}
                </div>
              )}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nodri-t3" />
                <input type="text" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)}
                  className="bg-nodri-card border border-nodri-border rounded-lg pl-7 pr-3 py-1.5 text-[11px] outline-none focus:border-nodri-cyan/40 w-28 sm:w-40" />
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-nodri-cyan/7 border border-nodri-cyan/17 rounded-lg text-[10.5px] text-nodri-cyan font-semibold">
                <CheckCircle size={12} />{totalAtivos}/{totalModulos}
              </div>
            </div>
          </div>

          {/* NOTIFICATION BANNER */}
          {notificacoes.length > 0 && !notifDismissed && (() => {
            const notif = notificacoes[notifIndex % notificacoes.length]
            const tipo = (notif as any).tipo || 'info'
            const borderColor = tipo === 'success' ? '#22c55e' : tipo === 'warning' ? '#eab308' : tipo === 'danger' ? '#ef4444' : '#6366f1'
            const iconColor = borderColor
            return (
              <div className="mx-5 mt-3 rounded-lg flex overflow-hidden"
                style={{ background: 'var(--nodri-card, #f5f4f0)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${borderColor}` }}>
                <div className="flex items-center gap-3 px-4 py-2.5 flex-1 min-w-0">
                  <Bell size={14} style={{ color: iconColor }} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: iconColor }}>Aviso do Sistema</span>
                      <span className="text-[10px] text-nodri-t3 ml-auto">{new Date(notif.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</span>
                    </div>
                    <p className="text-[12px] text-nodri-t1 leading-snug truncate">{notif.mensagem}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 shrink-0">
                  {notificacoes.length > 1 && (
                    <button onClick={() => setNotifIndex(i => i + 1)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-nodri-t3 hover:text-nodri-t1 transition-all">
                      {(notifIndex % notificacoes.length) + 1}/{notificacoes.length}
                    </button>
                  )}
                  <button onClick={() => setNotifDismissed(true)}
                    className="p-1.5 rounded text-nodri-t3 hover:text-nodri-t1 transition-all">
                    <X size={13} />
                  </button>
                </div>
              </div>
            )
          })()}

          {/* MODULES GRID */}
          <div className="flex-1 px-3 sm:px-5 py-4 pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {modulosFiltrados.map(modulo => {
            const emManutencao = !!modulo.em_manutencao
            return (
            <div key={modulo.id}
              className="p-4 flex flex-col cursor-pointer transition-all hover:-translate-y-0.5 relative overflow-hidden rounded-xl border"
              style={{
                background: emManutencao ? '#fff0f0' : modulo.habilitado ? '#e6f7ef' : '#f5f4f0',
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
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#6b6860', border: '1px solid rgba(255,255,255,0.06)' }}>
                  v{modulo.versao}
                </span>
              </div>

              <div className="font-syne font-bold text-[13px] uppercase tracking-wide leading-snug mb-1.5"
                style={{ color: emManutencao ? '#f87171' : modulo.habilitado ? '#d1fae5' : '#6b6860' }}>
                {modulo.nome}
              </div>
              <p className="text-[10px] leading-relaxed mb-4 flex-1" style={{ color: '#6b6860' }}>
                {modulo.descricao}
              </p>

              <div className="flex items-center justify-between gap-2 mt-auto">
                {/* Badge de status */}
                {emManutencao ? (
                  <div className="flex items-center gap-1">
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}>
                      <Wrench size={9} /> MANUTENÇÃO
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: modulo.habilitado ? '#059669' : '#ef4444',
                        boxShadow: modulo.habilitado ? '0 0 6px rgba(110,231,183,0.5)' : 'none'
                      }} />
                    <span className="text-[9.5px] font-medium"
                      style={{ color: modulo.habilitado ? '#059669' : '#ef4444' }}>
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
                    color: '#3a3835',
                    border: '1px solid rgba(255,255,255,0.1)',
                  } : {
                    background: 'transparent',
                    color: '#8b5cf6',
                    border: '1px solid rgba(139,92,246,0.3)',
                  }}>
                  {emManutencao
                    ? <><Wrench size={9} /> Indisponível</>
                    : modulo.habilitado
                      ? <><Play size={9} fill="#3a3835" /> Abrir</>
                      : <><Zap size={9} /> Ativar</>}
                </button>
              </div>
            </div>
            )
          })}
        </div>
          {modulosFiltrados.length === 0 && (
            <div className="text-center py-16" style={{ color: '#6b6860' }}>
              <div className="flex justify-center mb-3"><Search size={32} className="text-nodri-t3" /></div>
              <p className="text-sm">Nenhum módulo encontrado</p>
            </div>
          )}
          </div>

          {/* Alertas do dia — card único pulsando com dropdown */}
          {alertasIA.filter(a => !alertasDismissed.has(a.titulo)).length > 0 && (() => {
            const ativos = alertasIA.filter(a => !alertasDismissed.has(a.titulo))
            const temCritico = ativos.some(a => a.tipo === 'critico')
            const pulseColor = temCritico ? '#ef4444' : '#f59e0b'

            return (
              <div style={{ padding: '0 24px 28px', position: 'relative' }}>
                {/* Card pulsando */}
                <button
                  onClick={() => setMostrarAlertasIA(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: '#faf9f7', border: `1.5px solid ${pulseColor}40`,
                    borderRadius: 12, padding: '10px 16px', cursor: 'pointer',
                    boxShadow: mostrarAlertasIA ? `0 0 0 3px ${pulseColor}20` : 'none',
                    transition: 'box-shadow 0.2s',
                  }}>
                  {/* Ponto pulsando */}
                  <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10, flexShrink: 0 }}>
                    <span style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: pulseColor, opacity: 0.6,
                      animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                    }}/>
                    <span style={{ position: 'relative', borderRadius: '50%', width: 10, height: 10, background: pulseColor }}/>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>⚡ Alertas do dia</span>
                  <span style={{ fontSize: 11, fontWeight: 600, background: `${pulseColor}20`, color: pulseColor, padding: '2px 10px', borderRadius: 99 }}>
                    {ativos.length}
                  </span>
                  <span style={{ fontSize: 12, color: '#e8e6e0', marginLeft: 4 }}>{mostrarAlertasIA ? '▲' : '▼'}</span>
                </button>

                {/* Dropdown */}
                {mostrarAlertasIA && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    maxWidth: 460, maxHeight: 420, overflowY: 'auto',
                    background: '#faf9f7', border: '0.5px solid #f0ede8',
                    borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    marginTop: 6,
                  }}>
                    <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #f0ede8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#6b6860' }}>{ativos.length} alertas ativos</span>
                      <button onClick={() => setMostrarAlertasIA(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e8e6e0', fontSize: 16 }}>✕</button>
                    </div>
                    {ativos.map(alerta => {
                      const isCritico = alerta.tipo === 'critico'
                      const isInfo = alerta.tipo === 'info'
                      const accentColor = isCritico ? '#ef4444' : isInfo ? '#22c55e' : '#f59e0b'
                      const pillBg = isCritico ? 'rgba(239,68,68,0.12)' : isInfo ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)'
                      const pillColor = isCritico ? '#f87171' : isInfo ? '#4ade80' : '#fbbf24'
                      const pillLabel = isCritico ? 'Crítico' : isInfo ? 'Meta batida' : 'Risco'
                      return (
                        <div key={alerta.titulo} style={{
                          padding: '10px 16px', borderBottom: '0.5px solid #f0ede8',
                          borderLeft: `3px solid ${accentColor}`, display: 'flex', flexDirection: 'column', gap: 6,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', flex: 1 }}>{alerta.titulo}</span>
                            <span style={{ fontSize: 10, background: pillBg, color: pillColor, padding: '1px 7px', borderRadius: 99, flexShrink: 0 }}>{pillLabel}</span>
                            <button onClick={() => setAlertasDismissed(prev => new Set([...prev, alerta.titulo]))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e8e6e0', fontSize: 13, padding: '0 0 0 4px' }}>✕</button>
                          </div>
                          {alerta.pct !== undefined && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 4, background: '#f0ede8', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(alerta.pct, 100)}%`, height: '100%', background: accentColor, borderRadius: 99 }}/>
                              </div>
                              <span style={{ fontSize: 11, color: '#6b6860', minWidth: 28, textAlign: 'right' }}>{alerta.pct}%</span>
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: '#6b6860' }}>
                            {alerta.diasRestantes !== undefined ? `📅 ${alerta.diasRestantes} dias restantes` : alerta.mensagem}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}}`}</style>
              </div>
            )
          })()}
        </main>
      </div>
      <ChatWidget />
    </div>
  )
}

