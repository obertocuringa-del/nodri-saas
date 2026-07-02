'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Settings, CheckCircle, X, Zap, Play, Search, ChevronDown, ArrowRight, LogOut, Menu, Wrench, Lock, Eye } from 'lucide-react'
import ChatWidget from './ChatWidget'
import toast from 'react-hot-toast'
import type { ModuloComStatus, Notificacao } from '@/types'
import { chaveModulo } from '@/lib/permissoes'

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
  permissoes?: string[] | null
  nomeUsuario?: string | null
}

if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes shimmer { 0% { background-position: 0% 0 } 100% { background-position: 300% 0 } }
    @keyframes pulseDot { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.4); opacity: 0.6 } }
    @keyframes nodriPulseBtn { 0%,100% { box-shadow: 0 0 0 0 rgba(234,179,8,0); opacity:1 } 50% { box-shadow: 0 0 0 5px rgba(234,179,8,0.25); opacity:0.85 } }
    .nodri-salon-bg { background-color: #edeef0 !important; }
  `
  if (!document.getElementById('nodri-animations')) { style.id = 'nodri-animations'; document.head.appendChild(style) }
}

export default function SalonDashboard({ salaoNome, plano, modulos, notificacoes, totalAtivos, totalModulos, permissoes = null, nomeUsuario = null }: Props) {
  const ehSub = Array.isArray(permissoes)
  const pode = (chave: string) => !ehSub || (permissoes as string[]).includes(chave)
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'bloqueados'>('ativos')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Lembrete de compromissos do Calendário (faltam até 2 dias) — abre ao abrir o app
  const [lembretesCal, setLembretesCal] = useState<{ id: string; data: string; texto: string }[]>([])
  const [lembreteCalAberto, setLembreteCalAberto] = useState(true)
  useEffect(() => {
    fetch('/api/salon/grid?chave=calendario').then(r => r.ok ? r.json() : null).then(d => {
      if (!d || !Array.isArray(d.eventos)) return
      const h = new Date(); h.setHours(0, 0, 0, 0)
      const prox = d.eventos.filter((e: any) => { const [y, m, dd] = String(e.data).split('-').map(Number); const n = Math.round((new Date(y, m - 1, dd).getTime() - h.getTime()) / 86400000); return n >= 0 && n <= 2 })
      if (prox.length) setLembretesCal(prox)
    }).catch(() => { })
  }, [])
  // KPIs da tela inicial (fontes leves) — mostra do cache na hora e atualiza em 2º plano
  const lerKpi = (k: string): number | null => { try { const c = JSON.parse(localStorage.getItem('nodri_kpis') || '{}'); return typeof c[k] === 'number' ? c[k] : null } catch { return null } }
  const salvarKpi = (patch: Record<string, number>) => { try { const c = JSON.parse(localStorage.getItem('nodri_kpis') || '{}'); localStorage.setItem('nodri_kpis', JSON.stringify({ ...c, ...patch })) } catch { /* */ } }
  const [kpiAtivos, setKpiAtivos] = useState<number | null>(() => lerKpi('ativos'))
  const [kpiNiver, setKpiNiver] = useState<number | null>(() => lerKpi('niver'))
  const [kpiPend, setKpiPend] = useState<number | null>(() => lerKpi('pend'))
  useEffect(() => {
    const mes = new Date().getMonth() + 1
    fetch('/api/profissionais?leve=1').then(r => r.ok ? r.json() : []).then((arr: any[]) => {
      const lista = Array.isArray(arr) ? arr : []
      const ativos = lista.filter(p => p.ativo !== false && !p.is_departamento)
      const niver = ativos.filter(p => { const d = String(p.data_aniversario || ''); const m = Number(d.slice(5, 7)); return m === mes }).length
      setKpiAtivos(ativos.length); setKpiNiver(niver); salvarKpi({ ativos: ativos.length, niver })
    }).catch(() => { })
    fetch('/api/pendencias').then(r => r.ok ? r.json() : []).then((arr: any[]) => {
      const n = (Array.isArray(arr) ? arr : []).filter((p: any) => !p.resolvido).length
      setKpiPend(n); salvarKpi({ pend: n })
    }).catch(() => { })
  }, [])
  const [notifDismissed, setNotifDismissed] = useState(false)
  const [notifIndex, setNotifIndex] = useState(0)
  const [busca, setBusca] = useState('')
  const [buscaRes, setBuscaRes] = useState<{ tipo: string; titulo: string; trecho: string; rota: string }[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscaFoco, setBuscaFoco] = useState(false)
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

  // ── Busca global (páginas + conteúdo salvo + serviços + profissionais) ──
  const PAGINAS_BUSCA = [
    { nome: 'Profissionais', rota: '/salon/profissionais', palavras: 'profissional cadastro cnpj clt avaliar ficha entrevista materiais perfil horarios contrato distrato certificados carreira aniversario' },
    { nome: 'Serviços do Salão', rota: '/salon/servicos', palavras: 'servico preco comissao valor' },
    { nome: 'Lista de Espera', rota: '/salon/lista-espera', palavras: 'espera fila cliente' },
    { nome: 'Aniversariantes do Mês', rota: '/salon/aniversariantes', palavras: 'aniversario niver parabens whatsapp' },
    { nome: 'Salão Administrativo', rota: '/salon/administrativo', palavras: 'administrativo listas telefones ata reuniao escala feriados senhas pop pacotes tratamentos bebidas alicates produtos corte mechas pigmentacao realinhamento cafe' },
    { nome: 'Check List', rota: '/salon/checklist', palavras: 'checklist check list abertura fechamento intermediario dosagem gerente limpeza manutencao demanda' },
    { nome: 'Relatórios', rota: '/salon/relatorios', palavras: 'relatorio analise faturamento' },
  ]
  useEffect(() => {
    const q = busca.trim()
    if (q.length < 2) { setBuscaRes([]); return }
    const nq = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const t = setTimeout(async () => {
      setBuscando(true)
      const pageHits = PAGINAS_BUSCA.filter(p => (p.nome + ' ' + p.palavras).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(nq)).map(p => ({ tipo: 'Página', titulo: p.nome, trecho: '', rota: p.rota }))
      let api: any[] = []
      try { api = await fetch('/api/salon/busca?q=' + encodeURIComponent(q)).then(r => r.ok ? r.json() : []) } catch { /* */ }
      setBuscaRes([...pageHits, ...(Array.isArray(api) ? api : [])])
      setBuscando(false)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca])

  // ── SUITE NODRI: junta os 4 módulos do app desktop em um único card ──────
  const SUITE_NODRI_NOMES = ['confirmar agendamento', 'enviar feedback', 'enviar lista', 'enviar lista c/ arquivo']
  const ehModuloSuite = (nome: string) => SUITE_NODRI_NOMES.includes((nome || '').toLowerCase().trim())
  const modulosSuite = modulos.filter(m => ehModuloSuite(m.nome))
  const moduloSuiteUnificado: ModuloComStatus | null = modulosSuite.length > 0 ? {
    ...modulosSuite[0],
    id: 'suite-nodri',
    nome: 'Suite NODRI',
    descricao: 'Confirmar Agendamento, Enviar Feedback, Enviar Lista e Enviar Lista c/ Arquivo — tudo em um só aplicativo.',
    versao: '1.0',
    habilitado: modulosSuite.some(m => m.habilitado),
    em_manutencao: modulosSuite.some(m => !!m.em_manutencao),
    msg_manutencao: modulosSuite.find(m => !!m.em_manutencao)?.msg_manutencao,
  } : null

  // Lista exibida: suite no lugar do primeiro dos 4; os outros 3 saem da grade
  const modulosBase: ModuloComStatus[] = (() => {
    if (!moduloSuiteUnificado) return modulos
    const lista: ModuloComStatus[] = []
    let inserido = false
    for (const m of modulos) {
      if (ehModuloSuite(m.nome)) {
        if (!inserido) { lista.push(moduloSuiteUnificado); inserido = true }
      } else lista.push(m)
    }
    return lista
  })()

  // Contadores exibidos consideram a Suite NODRI como 1 módulo só
  const totalModulosExibidos = modulosBase.length
  const totalAtivosExibidos = modulosBase.filter(m => m.habilitado).length

  const modulosFiltrados = modulosBase.filter(m => {
    // FIX: combinação correta de filtro status + busca por nome
    const passaFiltro = filtro === 'ativos' ? m.habilitado : filtro === 'bloqueados' ? !m.habilitado : true
    const passaBusca = !busca || m.nome.toLowerCase().includes(busca.toLowerCase())
    // Suite: visível se o usuário tiver permissão em qualquer um dos 4 módulos
    const passaPermissao = m.id === 'suite-nodri'
      ? modulosSuite.some(s => pode(chaveModulo(s.nome)))
      : pode(chaveModulo(m.nome))
    return passaFiltro && passaBusca && passaPermissao
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
    // Suite NODRI: abre o aplicativo instalado via protocolo nodri://
    if (modulo.id === 'suite-nodri') {
      if (!modulo.habilitado) {
        toast('Entre em contato para ativar este módulo.')
        return
      }
      window.location.href = 'nodri://abrir'
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
    <div className="nodri-salon-bg h-screen flex flex-col overflow-hidden">

      {/* ANÚNCIO — compromissos do Calendário chegando (faltam até 2 dias) */}
      {lembretesCal.length > 0 && lembreteCalAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, maxWidth: 420, width: '100%', overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}>
            <div style={{ background: 'linear-gradient(135deg,#ef4444,#db2777)', color: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>📅 Compromissos chegando!</span>
              <button onClick={() => setLembreteCalAberto(false)} style={{ border: 'none', background: 'rgba(255,255,255,.25)', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 20 }}>
              {lembretesCal.map(e => {
                const [y, m, dd] = e.data.split('-').map(Number); const h = new Date(); h.setHours(0, 0, 0, 0)
                const n = Math.round((new Date(y, m - 1, dd).getTime() - h.getTime()) / 86400000)
                return (
                  <div key={e.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #f0eee8' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: n === 0 ? '#dc2626' : '#f59e0b', borderRadius: 20, padding: '3px 10px', height: 'fit-content', whiteSpace: 'nowrap' }}>{n === 0 ? 'HOJE' : n === 1 ? 'AMANHÃ' : `${n} DIAS`}</span>
                    <span style={{ fontSize: 14, color: '#1a1a1a' }}>{e.texto}</span>
                  </div>
                )
              })}
              <button onClick={() => { setLembreteCalAberto(false); window.location.href = '/salon/calendario' }} style={{ marginTop: 14, width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Ver no Calendário</button>
            </div>
          </div>
        </div>
      )}

      {/* FAIXA DE IMPERSONAÇÃO */}
      {impersonandoNome && (
        <div className="flex items-center justify-between px-4 py-2 text-[12px] font-bold z-[60] sticky top-0"
          style={{ background: '#854d0e', color: '#92400e', borderBottom: '2px solid #ca8a04' }}>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1"><Eye size={13} /> Você está acessando como cliente:</span>
            <span className="px-2 py-0.5 rounded font-black" style={{ background: '#ca8a04', color: '#1a1a1a' }}>{impersonandoNome}</span>
            <span style={{ color: '#92400e', fontWeight: 'normal' }}>— Sessão temporária (2h)</span>
          </div>
          <button onClick={voltarAoAdmin}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-[11px] transition-all hover:brightness-110"
            style={{ background: '#faf9f7', color: '#92400e', border: '1px solid #ca8a04' }}>
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
          bg-nodri-surface border-r border-nodri-border flex flex-col
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

          <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-0.5">

            {/* MÓDULOS */}
            <p className="text-[10px] font-bold text-nodri-t1 uppercase tracking-[2px] px-2 pb-1 border-b border-nodri-border mb-1">Módulos</p>
            {[
              { label: 'TODOS OS MÓDULOS', onClick: () => setFiltro('todos'), active: filtro === 'todos' && busca === '' },
              { label: 'ATIVOS',           onClick: () => setFiltro('ativos'), active: filtro === 'ativos' },
              { label: 'BLOQUEADOS',       onClick: () => setFiltro('bloqueados'), active: filtro === 'bloqueados' },
            ].map(item => (
              <button key={item.label} onClick={item.onClick}
                className={`w-full text-left px-3 py-2 rounded-md text-[11px] font-medium tracking-wide transition-colors ${item.active ? 'bg-black/6 text-nodri-t1' : 'text-nodri-t3 hover:text-nodri-t2 hover:bg-black/4'}`}>
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-[11px] font-medium tracking-wide transition-colors ${openDropdown === cat ? 'bg-black/6 text-nodri-t1' : 'text-nodri-t3 hover:text-nodri-t2 hover:bg-black/4'}`}>
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
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium text-nodri-t3 hover:text-nodri-t1 hover:bg-black/4 transition-colors truncate uppercase">
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
            {[
              { href: '/salon/feedback', label: 'Feedback de Cliente', chave: 'feedback_cliente' },
              { href: '/salon/feedback-profissional', label: 'Feedback Profissional', chave: 'feedback_prof' },
              { href: '/salon/servicos', label: 'Serviços', chave: 'servicos' },
              { href: '/salon/lista-espera', label: 'Lista de Espera', chave: 'lista_espera' },
              { href: '/salon/administrativo', label: 'Salão Administrativo', chave: 'administrativo' },
              { href: '/salon/checklist', label: 'Check List', chave: 'checklist' },
              { href: '/salon/calendario', label: 'Calendário', chave: 'calendario' },
              { href: '/salon/calendario-mkt', label: 'Calendário de Marketing', chave: 'calendario_mkt' },
              { href: '/salon/notificacoes', label: 'Notificações (Profissionais)', chave: 'profissionais' },
              { href: '/salon/consultoria', label: 'Consultoria IA', chave: 'ia' },
              { href: '/salon/auditoria', label: 'Log de Auditoria', chave: 'cfg_auditoria' },
              { href: '/salon/usuarios', label: 'Usuários & Acessos', chave: 'cfg_usuarios' },
            ].filter(item => pode(item.chave)).map(item => (
              <a key={item.href} href={item.href}
                className="w-full flex items-center px-3 py-2 rounded-md text-[11px] font-medium tracking-wide uppercase transition-colors text-nodri-t2 hover:text-nodri-t1 hover:bg-black/5">
                {item.label}
              </a>
            ))}
          </nav>

          {/* Rodapé da sidebar */}
          <div className="p-2 border-t border-nodri-border space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-nodri-surface rounded-lg border border-nodri-border">
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
                <span className="text-[11px] text-nodri-t2 hidden sm:inline"><span className="text-nodri-cyan font-bold">{totalAtivosExibidos}</span>/{totalModulosExibidos}</span>
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
                      style={{ background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.45)', color: '#b45309', animation: 'nodriPulseBtn 1.8s ease-in-out infinite' }}>
                      Atualização
                    </a>
                  )}
                </div>
              )}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nodri-t3" />
                <input type="text" placeholder="Buscar tudo..." value={busca} onChange={e => setBusca(e.target.value)}
                  onFocus={() => setBuscaFoco(true)} onBlur={() => setTimeout(() => setBuscaFoco(false), 200)}
                  className="bg-nodri-card border border-nodri-border rounded-lg pl-7 pr-3 py-1.5 text-[11px] outline-none focus:border-nodri-cyan/40 w-36 sm:w-56" />
                {buscaFoco && busca.trim().length >= 2 && (
                  <div style={{ position: 'absolute', top: '115%', right: 0, zIndex: 60, width: 380, maxWidth: '85vw', maxHeight: 440, overflowY: 'auto', background: '#fff', border: '1px solid #e0ddd8', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,.18)', padding: 6 }}>
                    {buscando && <div style={{ padding: 10, fontSize: 12, color: '#9ca3af' }}>Buscando…</div>}
                    {!buscando && buscaRes.length === 0 && <div style={{ padding: 10, fontSize: 12, color: '#9ca3af' }}>Nada encontrado para “{busca}”.</div>}
                    {buscaRes.map((r, i) => (
                      <a key={i} href={r.rota}
                        style={{ display: 'block', padding: '8px 10px', borderRadius: 8, textDecoration: 'none', color: '#1a1a1a' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#5b4fcf', background: '#f0eefb', borderRadius: 6, padding: '1px 6px', flexShrink: 0 }}>{r.tipo}</span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{r.titulo}</span>
                        </div>
                        {r.trecho && <div style={{ fontSize: 11, color: '#6b6860', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.trecho}</div>}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-nodri-cyan/7 border border-nodri-cyan/17 rounded-lg text-[10.5px] text-nodri-cyan font-bold">
                <CheckCircle size={12} />{totalAtivosExibidos}/{totalModulosExibidos}
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
                style={{ background: '#ffffff', border: '1px solid #e0ddd8', borderLeft: `3px solid ${borderColor}` }}>
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

          {/* PAINEL DE KPIs — resumo do dia (clicável) */}
          {busca.trim() === '' && (
            <div className="px-5 mt-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              {[
                { perm: 'profissionais', href: '/salon/profissionais', emoji: '👥', label: 'Profissionais ativos', valor: kpiAtivos, cor: '#5b4fcf' },
                { perm: 'aniversariantes', href: '/salon/aniversariantes', emoji: '🎂', label: 'Aniversariantes do mês', valor: kpiNiver, cor: '#db2777' },
                { perm: 'pendencias', href: '/salon/pendencias', emoji: '⚠️', label: 'Pendências abertas', valor: kpiPend, cor: '#ea580c' },
                { perm: 'calendario', href: '/salon/calendario', emoji: '📅', label: 'Compromissos (2 dias)', valor: lembretesCal.length, cor: '#0891b2' },
              ].filter(k => pode(k.perm)).map(k => (
                <a key={k.perm} href={k.href} style={{ textDecoration: 'none', background: '#fff', border: '1px solid #e8e6e0', borderLeft: `4px solid ${k.cor}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.08)')} onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  <span style={{ fontSize: 24 }}>{k.emoji}</span>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: k.cor, lineHeight: 1 }}>{k.valor == null ? '—' : k.valor}</div>
                    <div style={{ fontSize: 11.5, color: '#6b6860', fontWeight: 600, marginTop: 2 }}>{k.label}</div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* MODULES GRID */}
          <div className="flex-1 px-3 sm:px-5 py-4 pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {modulosFiltrados.map(modulo => {
            const emManutencao = !!modulo.em_manutencao
            return (
            <div key={modulo.id}
              className="p-4 flex flex-col cursor-pointer transition-all hover:-translate-y-0.5 relative overflow-hidden rounded-xl"
              style={{
                background: '#ffffff',
                border: emManutencao ? '1.5px solid #fca5a5' : modulo.habilitado ? '1.5px solid #e8e6e0' : '1.5px solid #e8e6e0',
                borderLeft: emManutencao ? '4px solid #ef4444' : modulo.habilitado ? '4px solid #16a34a' : '4px solid #d1d5db',
                opacity: modulo.habilitado || emManutencao ? 1 : 0.55,
              }}>

              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: '#f5f4f0', color: '#767069', border: '1px solid #e8e6e0' }}>
                  v{modulo.versao}
                </span>
                {emManutencao && <span style={{ fontSize: 9, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>MANUTENÇÃO</span>}
              </div>

              <div className="font-syne font-bold text-[13px] uppercase tracking-wide leading-snug mb-1.5"
                style={{ color: emManutencao ? '#dc2626' : '#1a1a1a' }}>
                {modulo.nome}
              </div>
              <p className="text-[10px] leading-relaxed mb-4 flex-1" style={{ color: '#767069' }}>
                {modulo.descricao}
              </p>

              <div className="flex items-center justify-between gap-2 mt-auto">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: emManutencao ? '#ef4444' : modulo.habilitado ? '#16a34a' : '#9ca3af' }} />
                  <span className="text-[9.5px] font-semibold"
                    style={{ color: emManutencao ? '#dc2626' : modulo.habilitado ? '#15803d' : '#767069' }}>
                    {emManutencao ? 'Indisponível' : modulo.habilitado ? 'Ativado' : 'Bloqueado'}
                  </span>
                </div>

                <button onClick={() => handleAbrir(modulo)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all"
                  style={emManutencao ? {
                    background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5',
                  } : modulo.habilitado ? {
                    background: '#5b4fcf', color: '#ffffff', border: 'none',
                  } : {
                    background: '#f0eeff', color: '#5b4fcf', border: '1px solid #c4b5fd',
                  }}>
                  {emManutencao
                    ? <><Wrench size={9} /> Ver</>
                    : modulo.habilitado
                      ? <><Play size={9} fill="#ffffff" /> Abrir</>
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
                  <span style={{ fontSize: 12, color: '#6b6860', marginLeft: 4 }}>{mostrarAlertasIA ? '▲' : '▼'}</span>
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
                      <button onClick={() => setMostrarAlertasIA(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6860', fontSize: 16 }}>✕</button>
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
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6860', fontSize: 13, padding: '0 0 0 4px' }}>✕</button>
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

