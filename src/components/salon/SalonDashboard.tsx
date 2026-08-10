'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Settings, CheckCircle, X, Zap, Play, Search, ChevronDown, ArrowRight, LogOut, Menu, Wrench, Lock, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import type { ModuloComStatus, Notificacao } from '@/types'
import { chaveModulo } from '@/lib/permissoes'
import ChatWidget from './ChatWidget'

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
    @keyframes nodriKpiPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.5) } 50% { box-shadow: 0 0 0 10px rgba(22,163,74,0) } }
    @keyframes nodriRedPulse { 0%,100% { background:#fef2f2 } 50% { background:#fee2e2 } }
    .nodri-salon-bg { background-color: #edeef0 !important; }
  `
  if (!document.getElementById('nodri-animations')) { style.id = 'nodri-animations'; document.head.appendChild(style) }
}

export default function SalonDashboard({ salaoNome, plano, modulos, notificacoes, totalAtivos, totalModulos, permissoes = null, nomeUsuario = null }: Props) {
  const ehSub = Array.isArray(permissoes)
  const pode = (chave: string) => !ehSub || (permissoes as string[]).includes(chave)
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'bloqueados'>('ativos')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Lembrete de compromissos dos DOIS calendários (faltam até 2 dias) — abre ao abrir o app
  type CalEvt = { id: string; data: string; texto: string; dias: number }
  const [lembretesCal, setLembretesCal] = useState<CalEvt[]>([])       // Central
  const [lembretesMkt, setLembretesMkt] = useState<CalEvt[]>([])       // Marketing
  // Começa FECHADO: o aviso de compromissos não abre mais sozinho ao entrar
  // (o selo com o número continua no card Calendário). Evita cobrir a tela.
  const [lembreteCalAberto, setLembreteCalAberto] = useState(false)
  const [seletorCalAberto, setSeletorCalAberto] = useState(false)      // menu que abre ao clicar no card
  useEffect(() => {
    const h = new Date(); h.setHours(0, 0, 0, 0)
    const proximos = (eventos: any[]): CalEvt[] => (Array.isArray(eventos) ? eventos : [])
      .map((e: any) => { const [y, m, dd] = String(e.data).split('-').map(Number); const dias = Math.round((new Date(y, m - 1, dd).getTime() - h.getTime()) / 86400000); return { id: e.id, data: e.data, texto: e.texto || '', dias } })
      .filter(e => e.dias >= 0 && e.dias <= 2)
      .sort((a, b) => a.dias - b.dias)
    fetch('/api/salon/grid?chave=calendario').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.eventos) setLembretesCal(proximos(d.eventos)) }).catch(() => { })
    fetch('/api/salon/grid?chave=calendario_mkt').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.eventos) setLembretesMkt(proximos(d.eventos)) }).catch(() => { })
  }, [])
  const totalCompromissos = lembretesCal.length + lembretesMkt.length

  // Alerta do Check List na sidebar: tarefas marcadas para HOJE (dia da semana) e não feitas.
  // Mesma lógica da página (feito_em dentro da janela do período), resumida aqui.
  const [checklistAlertas, setChecklistAlertas] = useState(0)
  // Alertas que fazem menu piscar: kits pedidos e nao separados, e pedidos
  // abertos vindos do portal da profissional
  const [kitsPendentes, setKitsPendentes] = useState(0)
  const [esterPendentes, setEsterPendentes] = useState(0)
  const [solicAbertas, setSolicAbertas] = useState(0)
  useEffect(() => {
    const buscar = () => fetch('/api/salon/alertas', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setKitsPendentes(Number(d.kitsPendentes) || 0); setEsterPendentes(Number(d.esterPendentes) || 0); setSolicAbertas(Number(d.solicitacoes) || 0) } })
      .catch(() => {})
    buscar()
    const t = setInterval(buscar, 60000)   // renova sozinho a cada minuto
    return () => clearInterval(t)
  }, [])
  // Badge de currículos novos (desde a última visita do dono à página)
  const [curriculosNovos, setCurriculosNovos] = useState(0)
  useEffect(() => {
    fetch('/api/salon/curriculos?count=1', { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d && typeof d.novos === 'number') setCurriculosNovos(d.novos)
    }).catch(() => {})
  }, [])
  useEffect(() => {
    fetch('/api/salon/grid?chave=checklist').then(r => r.ok ? r.json() : null).then(d => {
      if (!d || !Array.isArray(d.categorias)) return
      const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      const hojeAb = DIAS[new Date().getDay()]
      const ini = (freq: string): number => {
        const a = new Date(); const d = new Date(a.getFullYear(), a.getMonth(), a.getDate())
        if (freq === 'Semanal') { d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime() }
        if (freq === 'Quinzenal') return new Date(d.getFullYear(), d.getMonth(), d.getDate() <= 15 ? 1 : 16).getTime()
        if (freq === 'Mensal') return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
        if (freq === 'Trimestral') return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).getTime()
        if (freq === 'Semestral') return new Date(d.getFullYear(), d.getMonth() < 6 ? 0 : 6, 1).getTime()
        if (freq === 'Anual') return new Date(d.getFullYear(), 0, 1).getTime()
        return d.getTime()
      }
      let n = 0
      for (const c of d.categorias) for (const dem of (c.demandas || [])) {
        const feitoOk = dem.feito_em && new Date(dem.feito_em).getTime() >= ini(dem.freq)
        if (dem.texto?.trim() && Array.isArray(dem.dias) && dem.dias.includes(hojeAb) && !feitoOk) n++
      }
      setChecklistAlertas(n)
    }).catch(() => { })
  }, [])
  // KPIs da tela inicial (fontes leves) — mostra do cache na hora e atualiza em 2º plano
  const lerKpi = (k: string): number | null => { try { const c = JSON.parse(localStorage.getItem('nodri_kpis') || '{}'); return typeof c[k] === 'number' ? c[k] : null } catch { return null } }
  const salvarKpi = (patch: Record<string, number>) => { try { const c = JSON.parse(localStorage.getItem('nodri_kpis') || '{}'); localStorage.setItem('nodri_kpis', JSON.stringify({ ...c, ...patch })) } catch { /* */ } }
  const [kpiAtivos, setKpiAtivos] = useState<number | null>(() => lerKpi('ativos'))
  const [kpiNiver, setKpiNiver] = useState<number | null>(() => lerKpi('niver'))
  const [kpiPend, setKpiPend] = useState<number | null>(() => lerKpi('pend'))
  const [kpiFb, setKpiFb] = useState<number | null>(() => lerKpi('fb'))
  // Boletos vencidos (Calculadora → fila do FINANCEIRO)
  const [kpiBoletos, setKpiBoletos] = useState<number | null>(() => lerKpi('boletos'))
  const [kpiBoletosVlr, setKpiBoletosVlr] = useState<number>(() => lerKpi('boletosVlr') ?? 0)
  const [finId, setFinId] = useState('')   // id do setor FINANCEIRO, p/ o card abrir direto lá
  const [fbNovos, setFbNovos] = useState(0) // respostas novas desde a última visita → card pisca
  const [fbFormId, setFbFormId] = useState<string>('') // formulário p/ abrir direto os resultados
  useEffect(() => {
    const mes = new Date().getMonth() + 1
    fetch('/api/profissionais?leve=1').then(r => r.ok ? r.json() : []).then((arr: any[]) => {
      const lista = Array.isArray(arr) ? arr : []
      const ativos = lista.filter(p => p.ativo !== false && !p.is_departamento)
      const niver = ativos.filter(p => { const d = String(p.data_aniversario || ''); const m = Number(d.slice(5, 7)); return m === mes }).length
      setKpiAtivos(ativos.length); setKpiNiver(niver); salvarKpi({ ativos: ativos.length, niver })
      const fin = lista.find(p => p.is_departamento && String(p.nome_completo || '').toUpperCase().includes('FINANCEIRO'))
      if (fin?.id) setFinId(String(fin.id))
    }).catch(() => { })
    fetch('/api/salon/boletos?resumo=1').then(r => r.ok ? r.json() : null).then(d => {
      if (!d || typeof d.vencidos !== 'number') return
      setKpiBoletos(d.vencidos); setKpiBoletosVlr(Number(d.vencidosValor) || 0)
      salvarKpi({ boletos: d.vencidos, boletosVlr: Number(d.vencidosValor) || 0 })
    }).catch(() => { })
    fetch('/api/pendencias').then(r => r.ok ? r.json() : []).then((arr: any[]) => {
      const n = (Array.isArray(arr) ? arr : []).filter((p: any) => !p.resolvido).length
      setKpiPend(n); salvarKpi({ pend: n })
    }).catch(() => { })
    fetch('/api/feedback/contagem').then(r => r.ok ? r.json() : null).then(d => {
      if (!d || typeof d.total !== 'number') return
      setKpiFb(d.total); salvarKpi({ fb: d.total })
      if (d.formulario_id) setFbFormId(String(d.formulario_id))
      try {
        const visto = localStorage.getItem('nodri_fb_visto')
        if (visto === null) localStorage.setItem('nodri_fb_visto', String(d.total))
        else setFbNovos(Math.max(0, d.total - Number(visto)))
      } catch { /* */ }
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
  useEffect(() => {
    fetch('/api/config/programa')
      .then(r => r.json())
      .then(d => {
        if (d && typeof d === 'object' && !Array.isArray(d)) setConfigPrograma(d)
      })
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
    { nome: 'Ações Comerciais', rota: '/salon/acoes-comerciais', palavras: 'acao comercial campanha promocao marketing divulgacao whatsapp material combo' },
    { nome: 'Corridas Internas', rota: '/salon/corridas', palavras: 'corrida interna competicao ranking meta premio disputa gamificacao desafio' },
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

  // O card PROFISSIONAIS saiu da tela inicial: as secoes dele foram para os
  // setores (organograma) e a lista/ficha continua em /salon/profissionais.
  const ehCardProfissionais = (nome: string) => nome.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').trim() === 'profissionais'

  const modulosFiltrados = modulosBase.filter(m => {
    if (ehCardProfissionais(m.nome)) return false
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

  // 'Processo de Atendimento' saiu do menu principal: esses POPs agora vivem
  // no setor PROCESSO/QUALIDADE (organograma). As paginas continuam as mesmas.
  const ehProcessoAtendimento = (c: string) => c.toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').includes('PROCESSO DE ATENDIMENTO')
  const TODAS_CATEGORIAS = [...CATEGORIAS_CONTEUDO, ...tabsExtras].filter(c => !ehProcessoAtendimento(c))

  return (
    <div className="nodri-salon-bg nodri-sem-whats h-screen flex flex-col overflow-hidden">

      {/* ANÚNCIO — compromissos dos DOIS calendários chegando (faltam até 2 dias) */}
      {totalCompromissos > 0 && lembreteCalAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, maxWidth: 440, width: '100%', overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,.35)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'linear-gradient(135deg,#ef4444,#db2777)', color: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>📅 Compromissos chegando! ({totalCompromissos})</span>
              <button onClick={() => setLembreteCalAberto(false)} style={{ border: 'none', background: 'rgba(255,255,255,.25)', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto' }}>
              {[
                { nome: 'Calendário Central', href: '/salon/calendario', cor: '#0891b2', evts: lembretesCal, perm: 'calendario' },
                { nome: 'Calendário de Marketing', href: '/salon/calendario-mkt', cor: '#db2777', evts: lembretesMkt, perm: 'calendario_mkt' },
              ].filter(c => c.evts.length > 0 && pode(c.perm)).map(c => (
                <div key={c.href} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: c.cor, letterSpacing: '.4px', marginBottom: 6 }}>{c.nome} · {c.evts.length}</div>
                  {c.evts.map(e => (
                    <div key={e.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid #f0eee8' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: e.dias === 0 ? '#dc2626' : '#f59e0b', borderRadius: 20, padding: '3px 10px', height: 'fit-content', whiteSpace: 'nowrap' }}>{e.dias === 0 ? 'HOJE' : e.dias === 1 ? 'AMANHÃ' : `${e.dias} DIAS`}</span>
                      <span style={{ fontSize: 14, color: '#1a1a1a' }}>{e.texto}</span>
                    </div>
                  ))}
                  <button onClick={() => { setLembreteCalAberto(false); window.location.href = c.href }} style={{ marginTop: 8, padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${c.cor}`, background: '#fff', color: c.cor, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Ver {c.nome} →</button>
                </div>
              ))}
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
              { href: '/salon/acoes-comerciais', label: 'Ações Comerciais', chave: 'acoes_comerciais' },
              { href: '/salon/corridas', label: 'Corridas Internas', chave: 'corridas' },
              { href: '/salon/lista-espera', label: 'Lista de Espera', chave: 'lista_espera' },
              // Administração abre o ORGANOGRAMA: as ferramentas foram distribuídas
              // para os setores, e é por lá que se chega em cada uma agora.
              { href: '/salon/pendencias', label: 'Administração', chave: 'administrativo' },
              // Check List saiu daqui: cada categoria vive no seu setor (organograma).
              // A visao geral continua em /salon/checklist por link direto.
              { href: '/salon/curriculos', label: 'Currículos', chave: 'curriculos' },
              // Calendário, Calendário MKT, Lojistas, Check Procon e Log de Auditoria
              // vivem dentro dos SETORES (organograma) — tirados daqui para desafogar.
              { href: '/salon/notificacoes', label: 'Notificações (Profissionais)', chave: 'profissionais' },
              { href: '/salon/consultoria', label: 'Consultoria IA', chave: 'ia' },
              { href: '/salon/usuarios', label: 'Usuários & Acessos', chave: 'cfg_usuarios' },
            ].filter(item => pode(item.chave)).map(item => {
              const alerta = item.chave === 'checklist' && checklistAlertas > 0
              // O Administrativo é onde se separa kit E onde se recebe alicate
              // pra esterilizar — os dois pedidos chegam da profissional e os dois
              // precisam avisar, senão ela fica esperando sem ninguém saber.
              const alertaKits = item.chave === 'administrativo' && (kitsPendentes > 0 || esterPendentes > 0)
              const novoCur = item.chave === 'curriculos' && curriculosNovos > 0
              const destaque = alerta || novoCur || alertaKits
              const cor = (alerta || alertaKits) ? '#dc2626' : '#5b4fcf'
              const badgeAdm = [
                kitsPendentes > 0 ? `🧰 ${kitsPendentes}` : '',
                esterPendentes > 0 ? `✂️ ${esterPendentes}` : '',
              ].filter(Boolean).join(' ')
              const badgeTxt = alerta ? `⚠ ${checklistAlertas}`
                : alertaKits ? badgeAdm
                : `${curriculosNovos} novo${curriculosNovos > 1 ? 's' : ''}`
              return (
              <a key={item.href} href={item.href}
                className="w-full flex items-center px-3 py-2 rounded-md text-[11px] font-medium tracking-wide uppercase transition-colors hover:bg-black/5"
                style={destaque ? { color: cor, fontWeight: 800, animation: 'nodriRedPulse 1.6s ease-in-out infinite' } : { color: undefined }}>
                <span className={destaque ? '' : 'text-nodri-t2 hover:text-nodri-t1'} style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
                {destaque && (
                  <span style={{ background: cor, color: '#fff', fontSize: 9.5, fontWeight: 900, borderRadius: 99, padding: '2px 7px', whiteSpace: 'nowrap', animation: 'pulseDot 1.2s infinite' }}>{badgeTxt}</span>
                )}
              </a>
              )
            })}
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
              {/* Busca ultra inteligente (a mesma de todas as páginas — Ctrl+K) */}
              <button onClick={() => window.dispatchEvent(new Event('nodri-abrir-busca'))} title="Buscar em todo o sistema (Ctrl+K)"
                className="flex items-center gap-2 bg-nodri-card border border-nodri-border rounded-lg pl-2.5 pr-3 py-1.5 text-[11px] text-nodri-t3 w-36 sm:w-56 hover:border-nodri-cyan/40 transition-colors">
                <Search size={13} className="text-nodri-t3 shrink-0" />
                <span className="flex-1 text-left truncate">Buscar tudo...</span>
                <span className="hidden sm:inline text-[9px] border border-nodri-border rounded px-1 text-nodri-t3">Ctrl+K</span>
              </button>
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
                { perm: 'profissionais', href: '/salon/profissionais', emoji: '👥', label: 'Profissionais ativos', valor: kpiAtivos, cor: '#5b4fcf', badge: 0 },
                { perm: 'aniversariantes', href: '/salon/aniversariantes', emoji: '🎂', label: 'Aniversariantes do mês', valor: kpiNiver, cor: '#db2777', badge: 0 },
                { perm: 'pendencias', href: '/salon/pendencias', emoji: '⚠️', label: 'Pendências abertas', valor: kpiPend, cor: '#ea580c', badge: 0, alerta: solicAbertas > 0, sub: solicAbertas > 0 ? `${solicAbertas} pedido(s) do portal esperando` : '' },
                { perm: 'calendario', href: '/salon/calendario', emoji: '📅', label: 'Calendário', valor: totalCompromissos, cor: '#0891b2', badge: 0, seletor: true as const },
                { perm: 'feedback_cliente', href: fbFormId ? `/salon/feedback/resultados/${fbFormId}` : '/salon/feedback', emoji: '⭐', label: 'Feedbacks de clientes', valor: kpiFb, cor: '#16a34a', badge: fbNovos },
                { perm: 'calculadora', href: finId ? `/salon/departamentos/${finId}` : '/salon/profissionais', emoji: '📄', label: 'Boletos vencidos', valor: kpiBoletos, cor: '#dc2626', badge: 0, alerta: (kpiBoletos || 0) > 0, sub: (kpiBoletos || 0) > 0 ? `R$ ${kpiBoletosVlr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a pagar` : 'tudo em dia' },
              ].filter(k => pode(k.perm)).map(k => {
                // Card de Compromissos: abre um seletor (Central / Marketing) em vez de navegar
                if ((k as any).seletor) {
                  const temAviso = totalCompromissos > 0
                  return (
                    <div key={k.perm} style={{ position: 'relative' }}>
                      {seletorCalAberto && <div onClick={() => setSeletorCalAberto(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />}
                      <button onClick={() => setSeletorCalAberto(o => !o)}
                        style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: temAviso ? '#ecfeff' : '#fff', border: temAviso ? '1px solid #67e8f9' : '1px solid #e8e6e0', borderLeft: `4px solid ${k.cor}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', animation: temAviso ? 'nodriKpiPulse 1.6s ease-in-out infinite' : undefined }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.08)')} onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 22, fontWeight: 900, color: k.cor, lineHeight: 1 }}>{k.valor}</div>
                          <div style={{ fontSize: 11.5, color: '#6b6860', fontWeight: 600, marginTop: 2 }}>{k.label}</div>
                        </div>
                        <span style={{ color: '#5b4fcf', fontSize: 12, transition: 'transform .15s', transform: seletorCalAberto ? 'rotate(180deg)' : 'none' }}>▼</span>
                        {temAviso && <span style={{ position: 'absolute', top: -9, right: -6, background: '#0891b2', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 99, whiteSpace: 'nowrap', boxShadow: '0 3px 10px rgba(8,145,178,.4)' }}>{totalCompromissos}</span>}
                      </button>

                      {seletorCalAberto && (
                        <div style={{ position: 'absolute', top: '108%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 12, boxShadow: '0 14px 40px rgba(0,0,0,.18)', overflow: 'hidden', minWidth: 260 }}>
                          {[
                            { chave: 'central', href: '/salon/calendario', emoji: '🗓️', nome: 'Calendário Central', cor: '#0891b2', bg: '#ecfeff', bd: '#67e8f9', evts: lembretesCal },
                            { chave: 'mkt', href: '/salon/calendario-mkt', emoji: '📢', nome: 'Calendário de Marketing', cor: '#db2777', bg: '#fdf2f8', bd: '#f9a8d4', evts: lembretesMkt },
                          ].filter(c => c.chave === 'central' ? pode('calendario') : pode('calendario_mkt')).map((c, i) => {
                            const tem = c.evts.length > 0
                            return (
                              <a key={c.chave} href={c.href}
                                style={{ display: 'block', textDecoration: 'none', padding: '12px 14px', borderTop: i > 0 ? '1px solid #f0eee8' : 'none', background: tem ? c.bg : '#fff', cursor: 'pointer' }}
                                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(.97)')} onMouseLeave={e => (e.currentTarget.style.filter = 'none')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 800, color: tem ? c.cor : '#9ca3af' }}>{c.nome}</span>
                                  {tem
                                    ? <span style={{ background: c.cor, color: '#fff', fontSize: 11, fontWeight: 900, borderRadius: 99, padding: '2px 9px' }}>{c.evts.length}</span>
                                    : <span style={{ fontSize: 11, color: '#9ca3af' }}>tudo em dia</span>}
                                  <span style={{ color: tem ? c.cor : '#c4c0b8', fontSize: 13 }}>→</span>
                                </div>
                                {tem && (
                                  <div style={{ marginTop: 6, paddingLeft: 25, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {c.evts.slice(0, 3).map(e => (
                                      <div key={e.id} style={{ fontSize: 11.5, color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        <span style={{ fontWeight: 800, color: e.dias === 0 ? '#dc2626' : '#b45309' }}>{e.dias === 0 ? 'Hoje' : e.dias === 1 ? 'Amanhã' : `Em ${e.dias}d`}:</span> {e.texto}
                                      </div>
                                    ))}
                                    {c.evts.length > 3 && <div style={{ fontSize: 11, color: '#9ca3af' }}>+{c.evts.length - 3} mais…</div>}
                                  </div>
                                )}
                              </a>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }
                return (
                <a key={k.perm} href={k.href}
                  onClick={() => { if (k.perm === 'feedback_cliente') { try { localStorage.setItem('nodri_fb_visto', String(kpiFb ?? 0)) } catch { /* */ } } }}
                  style={{ textDecoration: 'none', background: (k as any).alerta ? '#fef2f2' : k.badge > 0 ? '#f0fdf4' : '#fff', border: (k as any).alerta ? '1px solid #fca5a5' : k.badge > 0 ? '1px solid #86efac' : '1px solid #e8e6e0', borderLeft: `4px solid ${k.cor}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', animation: (k.badge > 0 || (k as any).alerta) ? 'nodriKpiPulse 1.6s ease-in-out infinite' : undefined }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.08)')} onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: k.cor, lineHeight: 1 }}>{k.valor == null ? '—' : k.valor}</div>
                    <div style={{ fontSize: 11.5, color: '#6b6860', fontWeight: 600, marginTop: 2 }}>{k.label}</div>
                    {(k as any).sub && <div style={{ fontSize: 10.5, color: (k as any).alerta ? '#dc2626' : '#9ca3af', fontWeight: 600, marginTop: 1 }}>{(k as any).sub}</div>}
                  </div>
                  {k.badge > 0 && (
                    <span style={{ position: 'absolute', top: -9, right: -6, background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 99, animation: 'pulseDot 1.2s infinite', whiteSpace: 'nowrap', boxShadow: '0 3px 10px rgba(22,163,74,.4)' }}>
                      +{k.badge} novo{k.badge > 1 ? 's' : ''}
                    </span>
                  )}
                </a>
                )
              })}
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


        </main>
      </div>
      {/* Chat da IA: voltou a pedido. A bolha do WhatsApp segue escondida pela
          classe nodri-sem-whats no container — sao dois botoes diferentes. */}
      <ChatWidget />
    </div>
  )
}

