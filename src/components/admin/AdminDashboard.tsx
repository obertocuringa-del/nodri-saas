'use client'

import { useState, useRef, useEffect } from 'react'
import { LogOut, Bell, Plus, Building, CreditCard, Puzzle, Users, BarChart3, Settings, RefreshCw, X, Send, Edit, Lock, Unlock, Loader2, ChevronDown, Check, Link, Save, Trash2, ExternalLink, Eye, EyeOff, AlertTriangle, Search, Zap, Tag, FolderOpen, Wrench, LogIn, Bot, GraduationCap, ClipboardList, DollarSign, Home, CheckCircle, AlertCircle, Clock, ShoppingBag, Key, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Salao, Modulo, Notificacao, Plano, Cupom } from '@/types'
import Contatos from './Contatos'
import EditorVitrine from './EditorVitrine'
import EditorFuncionalidades from './EditorFuncionalidades'
import { LANDING_PADRAO } from '@/lib/landingDefaults'
import { MODULOS_NODRI, chaveDoModulo, planoMinimoPara } from '@/lib/planosModulos'

interface Props {
  saloes: Salao[]
  modulos: Modulo[]
  notificacoes: Notificacao[]
  planos: Plano[]
}

const TIPO_COLOR: Record<string, string> = {
  info: 'bg-nodri-blue', success: 'bg-nodri-green', warning: 'bg-nodri-amber', danger: 'bg-nodri-red',
}
const STATUS_CLASS: Record<string, string> = {
  ativo: 'bg-nodri-green/10 text-nodri-green', bloqueado: 'bg-nodri-red/10 text-nodri-red',
  vencido: 'bg-nodri-amber/10 text-nodri-amber', trial: 'bg-nodri-blue/10 text-nodri-blue',
}
const PLANO_CLASS: Record<string, string> = {
  basico: 'bg-nodri-t3/20 text-nodri-t2', profissional: 'bg-nodri-blue/10 text-nodri-blue', premium: 'bg-nodri-cyan/10 text-nodri-cyan',
}


const DEFAULT_LANDING = LANDING_PADRAO

export default function AdminDashboard({ saloes: initialSaloes, modulos: initialModulos, notificacoes, planos: initialPlanos }: Props) {
  const [saloes, setSaloes] = useState(initialSaloes)
  const [planos, setPlanos] = useState(initialPlanos)
  const [localModulos, setLocalModulos] = useState(initialModulos)

  //  MÓDULOS CRUD 
  const [showNovoModulo, setShowNovoModulo] = useState(false)
  const [editModulo, setEditModulo] = useState<Modulo | null>(null)
  const [moduloForm, setModuloForm] = useState({ nome: '', slug: '', descricao: '', versao: '1.0.0', icone: '', cor_classe: '', categoria: '', ordem: '0' })
  const [savingModulo, setSavingModulo] = useState(false)
  const [togglingManutencao, setTogglingManutencao] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string>('saloes')
  const [modCtrlSalao, setModCtrlSalao] = useState<Salao | null>(null)
  const [modulosAtivos, setModulosAtivos] = useState<Set<string>>(new Set())
  // Assinatura (Asaas) do salão selecionado
  const [assinSalao, setAssinSalao] = useState<Salao | null>(null)
  const [assinPlano, setAssinPlano] = useState('')
  const [assinBusy, setAssinBusy] = useState(false)
  const [assinLink, setAssinLink] = useState('')
  const [assinMsg, setAssinMsg] = useState('')
  const [notifMsg, setNotifMsg] = useState('')
  const [notifTipo, setNotifTipo] = useState<'info'|'success'|'warning'|'danger'>('info')
  const [notifDestinatarios, setNotifDestinatarios] = useState<string[]>([])
  const [configPrograma, setConfigPrograma] = useState({ link: '', link_atualizacao: '', atualizacao_ativa: false })
  const [savingPrograma, setSavingPrograma] = useState(false)
  const [showDestinatarios, setShowDestinatarios] = useState(false)
  const [sending, setSending] = useState(false)
  const [localNotifs, setLocalNotifs] = useState(notificacoes)
  const [showNovoSalao, setShowNovoSalao] = useState(false)
  const [savingMods, setSavingMods] = useState(false)
  const [formSalao, setFormSalao] = useState({ nome: '', responsavel: '', email: '', telefone: '', plano_id: '', licenca_vencimento: '', senha_acesso: '', observacoes: '' })
  const [savingSalao, setSavingSalao] = useState(false)

  const [editSalao, setEditSalao] = useState<Salao | null>(null)
  const [editForm, setEditForm] = useState({ nome: '', responsavel: '', email: '', telefone: '', plano_id: '', licenca_vencimento: '', status: '', nova_senha: '', observacoes: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingSalao, setDeletingSalao] = useState(false)
  const [editTab, setEditTab] = useState<'dados'|'acesso'|'perigo'>('dados')

  const [showNovoPlano, setShowNovoPlano] = useState(false)
  const [editPlano, setEditPlano] = useState<Plano | null>(null)
  const [planoForm, setPlanoForm] = useState({ nome: '', slug: '', descricao: '', preco: '', max_usuarios: '' })
  const [savingPlano, setSavingPlano] = useState(false)

  const [editNotif, setEditNotif] = useState<Notificacao | null>(null)
  const [editNotifMsg, setEditNotifMsg] = useState('')
  const [savingNotif, setSavingNotif] = useState(false)
  const [deletingNotif, setDeletingNotif] = useState<string | null>(null)

  //  LANDING PAGE EDITOR 
  const [landingConfig, setLandingConfig] = useState<typeof DEFAULT_LANDING | null>(null)
  const [savingLanding, setSavingLanding] = useState(false)

  //  CUPONS 
  const [cupons, setCupons] = useState<Cupom[]>([])
  const [cuponForm, setCuponForm] = useState({ percentual: '', codigo: '' })
  const [savingCupon, setSavingCupon] = useState(false)
  const [loadingCupons, setLoadingCupons] = useState(false)

  //  COMPRA DETALHE 
  const [selectedCompra, setSelectedCompra] = useState<Record<string, any> | null>(null as Record<string, any> | null)

  //  IA CONFIG 
  const [iaConfig, setIaConfig] = useState({ api_key: '', modelo: 'claude-haiku-4-5', instrucoes_base: '', api_key_salva: false })
  const [iaConfigLoading, setIaConfigLoading] = useState(false)
  const [showIaKey, setShowIaKey] = useState(false)
  const [tavilyKeys, setTavilyKeys] = useState<string[]>([])
  const [novaKeyTavily, setNovaKeyTavily] = useState('')
  const [tavilySaving, setTavilySaving] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDestinatarios(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Landing e Cupons eram abas: os dados carregavam no clique do botao.
  // Virando secao propria, o clique sumiu — sem isto as telas abririam vazias.
  useEffect(() => {
    if (activeSection === 'landing' && !landingConfig) loadLandingConfig()
    if (activeSection === 'cupons' && cupons.length === 0) loadCupons()
  }, [activeSection])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeSection === 'ia') {
      setIaConfigLoading(true)
      fetch('/api/admin/ia-config')
        .then(r => r.json())
        .then(d => {
          setIaConfig({ api_key: '', modelo: d.modelo || 'gemini-1.5-flash', instrucoes_base: d.instrucoes_base || '', api_key_salva: d.api_key_salva ?? false })
          setTavilyKeys(d.tavily_keys || [])
        })
        .catch(() => {})
        .finally(() => setIaConfigLoading(false))
    }
  }, [activeSection])

  function handleLogout() { window.location.href = '/logout' }

  async function openModCtrl(salao: Salao) {
    setModCtrlSalao(salao)
    const res = await fetch(`/api/salons/${salao.id}/modules`)
    const data = await res.json()
    setModulosAtivos(new Set(data.habilitados || []))
  }

  // ── Os 5 módulos como o cliente enxerga ──────────────────────────────────
  // No banco a Suite NODRI são 4 linhas. O modal mostrava as 8 cruas, com o
  // nome cortado em duas palavras: dois cartões ficavam escritos "ENVIAR
  // LISTA" e não dava para saber qual era qual, e 'CALCULADORA / FINANCEIRA'
  // aparecia como 'CALCULADORA /'. Agora é uma chave por módulo vendido, com
  // o nome inteiro e o plano a que ele pertence.
  const modulosLogicos = MODULOS_NODRI
    .map(mn => ({ ...mn, ids: localModulos.filter(m => chaveDoModulo(m.nome) === mn.chave).map(m => m.id) }))
    .filter(x => x.ids.length > 0)

  function toggleModuloLogico(ids: string[]) {
    const newSet = new Set(modulosAtivos)
    // Ligado só quando TODAS as linhas estão ligadas — a Suite não pode ficar
    // pela metade, senão o salão abre o app com parte das funções faltando.
    if (ids.every(id => newSet.has(id))) ids.forEach(id => newSet.delete(id))
    else ids.forEach(id => newSet.add(id))
    setModulosAtivos(newSet)
  }

  // Quantos dos 5 o salão tem. A lista mostrava "—/8" fixo para todo mundo.
  function contarModulos(salao: Salao): number {
    const linhas: any[] = Array.isArray((salao as any).salao_modulos) ? (salao as any).salao_modulos : []
    const chaves = new Set<string>()
    for (const l of linhas) {
      if (!l?.ativo) continue
      const nome = localModulos.find(m => m.id === l.modulo_id)?.nome
      const c = nome ? chaveDoModulo(nome) : null
      if (c) chaves.add(c)
    }
    return chaves.size
  }

  async function saveModulos() {
    if (!modCtrlSalao) return
    setSavingMods(true)
    const res = await fetch(`/api/salons/${modCtrlSalao.id}/modules`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habilitados: Array.from(modulosAtivos) }),
    })
    setSavingMods(false)
    if (res.ok) {
      // Espelha na lista o que acabou de ser gravado, senão a coluna "Módulos"
      // continua mostrando o número velho até alguém recarregar a página.
      const linhas = Array.from(modulosAtivos).map(id => ({ modulo_id: id, ativo: true }))
      setSaloes(prev => prev.map(s => s.id === modCtrlSalao.id ? { ...s, salao_modulos: linhas } as any : s))
      toast.success('Módulos atualizados!')
      setModCtrlSalao(null)
    }
    else toast.error('Erro ao salvar módulos')
  }

  async function acaoAssinatura(acao: 'link' | 'trocar' | 'cancelar') {
    if (!assinSalao) return
    setAssinBusy(true); setAssinMsg(''); setAssinLink('')
    try {
      const r = await fetch('/api/assinatura/gerenciar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salaoId: assinSalao.id, acao, planoSlug: assinPlano || undefined }),
      })
      const d = await r.json()
      if (!r.ok) { setAssinMsg(d.erro || 'Não foi possível concluir'); setAssinBusy(false); return }
      setAssinMsg(d.mensagem || 'Feito')
      if (d.url) setAssinLink(d.url)
      toast.success(d.mensagem || 'Feito')
    } catch { setAssinMsg('Erro de conexão') }
    setAssinBusy(false)
  }

  function openEditSalao(salao: Salao) {
    setEditSalao(salao)
    setEditTab('dados')
    setEditForm({
      nome: salao.nome, responsavel: salao.responsavel || '', email: salao.email,
      telefone: salao.telefone || '', plano_id: salao.plano_id || '',
      licenca_vencimento: salao.licenca_vencimento || '', status: salao.status,
      nova_senha: '', observacoes: salao.observacoes || '',
    })
    setShowDeleteConfirm(false)
    setDeleteConfirmText('')
  }

  async function saveEditSalao(e: React.FormEvent) {
    e.preventDefault()
    if (!editSalao) return
    setSavingEdit(true)
    const res = await fetch(`/api/salons/${editSalao.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    const data = await res.json()
    setSavingEdit(false)
    if (res.ok) {
      toast.success('Salão atualizado!')
      setSaloes(prev => prev.map(s => s.id === editSalao.id ? { ...s, ...data } : s))
      setEditSalao(null)
    } else toast.error(data.error || 'Erro ao salvar')
  }

  async function toggleBloqueio(salao: Salao) {
    const acao = salao.status === 'ativo' ? 'bloquear' : 'liberar'
    const res = await fetch(`/api/salons/${salao.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao }),
    })
    const data = await res.json()
    if (res.ok) {
      setSaloes(prev => prev.map(s => s.id === salao.id ? { ...s, ...data } : s))
      toast.success(acao === 'bloquear' ? 'Salão bloqueado!' : 'Salão liberado!')
      if (editSalao?.id === salao.id) setEditForm(p => ({ ...p, status: data.status }))
    } else toast.error('Erro ao alterar status')
  }

  async function toggleIA(salao: Salao) {
    const res = await fetch(`/api/admin/saloes/${salao.id}/ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ia_ativa: !salao.ia_ativa })
    })
    if (res.ok) {
      setSaloes(prev => prev.map(s => s.id === salao.id ? { ...s, ia_ativa: !s.ia_ativa } : s))
      if (editSalao?.id === salao.id) setEditSalao(prev => prev ? { ...prev, ia_ativa: !prev.ia_ativa } : prev)
      toast.success(salao.ia_ativa ? 'IA desativada' : 'IA ativada!')
    } else {
      toast.error('Erro ao alterar status da IA')
    }
  }

  async function liberarComNovaLicenca(salaoId: string, licenca_vencimento: string) {
    const res = await fetch(`/api/salons/${salaoId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'liberar', licenca_vencimento }),
    })
    const data = await res.json()
    if (res.ok) {
      setSaloes(prev => prev.map(s => s.id === salaoId ? { ...s, ...data } : s))
      toast.success('Acesso liberado com nova data de vencimento!')
    } else toast.error('Erro ao liberar acesso')
  }

  async function deleteSalao() {
    if (!editSalao || deleteConfirmText !== editSalao.nome) { toast.error('Nome incorreto!'); return }
    setDeletingSalao(true)
    const res = await fetch(`/api/salons/${editSalao.id}`, { method: 'DELETE' })
    setDeletingSalao(false)
    if (res.ok) { toast.success('Salão excluído!'); setSaloes(prev => prev.filter(s => s.id !== editSalao.id)); setEditSalao(null) }
    else toast.error('Erro ao excluir salão')
  }

  function toggleDestinatario(salaoId: string) {
    setNotifDestinatarios(prev => prev.includes(salaoId) ? prev.filter(id => id !== salaoId) : [...prev, salaoId])
  }

  async function sendNotification() {
    if (!notifMsg.trim()) return
    setSending(true)
    const paraTodos = notifDestinatarios.length === 0
    if (paraTodos) {
      const res = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem: notifMsg, para_todos: true, tipo: notifTipo }) })
      if (res.ok) { const nova = await res.json(); setLocalNotifs(prev => [nova, ...prev]); toast.success('Enviado para todos!') }
    } else {
      for (const salaoId of notifDestinatarios) {
        const res = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem: notifMsg, salao_id: salaoId, para_todos: false, tipo: notifTipo }) })
        if (res.ok) { const nova = await res.json(); setLocalNotifs(prev => [nova, ...prev]) }
      }
      toast.success(`Enviado para ${notifDestinatarios.length} salão(ões)!`)
    }
    setNotifMsg(''); setNotifDestinatarios([]); setSending(false)
  }

  async function handleEditNotif(notif: Notificacao) {
    setEditNotif(notif)
    setEditNotifMsg(notif.mensagem)
  }

  async function saveEditNotif() {
    if (!editNotif || !editNotifMsg.trim()) return
    setSavingNotif(true)
    const res = await fetch(`/api/notifications/${editNotif.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem: editNotifMsg }),
    })
    setSavingNotif(false)
    if (res.ok) {
      toast.success('Notificação atualizada!')
      setLocalNotifs(prev => prev.map(n => n.id === editNotif.id ? { ...n, mensagem: editNotifMsg } : n))
      setEditNotif(null)
    } else toast.error('Erro ao editar notificação')
  }

  async function deleteNotif(id: string) {
    if (!confirm('Excluir esta notificação?')) return
    setDeletingNotif(id)
    const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    setDeletingNotif(null)
    if (res.ok) { toast.success('Notificação excluída!'); setLocalNotifs(prev => prev.filter(n => n.id !== id)) }
    else toast.error('Erro ao excluir')
  }

  async function handleCadastrarSalao(e: React.FormEvent) {
    e.preventDefault()
    if (!formSalao.nome || !formSalao.email || !formSalao.senha_acesso) { toast.error('Nome, email e senha são obrigatórios'); return }
    setSavingSalao(true)
    const res = await fetch('/api/salons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formSalao) })
    const data = await res.json()
    setSavingSalao(false)
    if (res.ok) { toast.success('Salão cadastrado!'); setSaloes(prev => [data, ...prev]); setShowNovoSalao(false); setFormSalao({ nome: '', responsavel: '', email: '', telefone: '', plano_id: '', licenca_vencimento: '', senha_acesso: '', observacoes: '' }) }
    else toast.error(data.error || 'Erro ao cadastrar')
  }


  // Carrega config do programa na inicialização
  useEffect(() => {
    fetch('/api/config/programa').then(r => r.json()).then(d => {
      if (d) setConfigPrograma({ link: d.link || '', link_atualizacao: d.link_atualizacao || '', atualizacao_ativa: !!d.atualizacao_ativa })
    }).catch(() => {})
  }, [])

  // Sempre re-carrega módulos do banco ao entrar na seção
  useEffect(() => {
    if (activeSection === 'modulos') {
      fetch('/api/modulos').then(r => r.json()).then(data => {
        if (Array.isArray(data)) setLocalModulos(data)
      }).catch(() => {})
    }
  }, [activeSection])

  async function acessarComoCliente(salao: Salao) {
    const res = await fetch(`/api/admin/impersonate/${salao.id}`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Erro ao acessar salão'); return }
    // SEC-007: o servidor já trocou os cookies (httpOnly). O front não toca em
    // token nenhum — só guarda o NOME do salão, para mostrar a faixa de
    // "você está acessando como…". Nome não é credencial.
    localStorage.setItem('nodri_impersonando', salao.nome)
    toast.success(`Acessando como "${salao.nome}"...`)
    setTimeout(() => { window.location.href = '/salon' }, 800)
  }

  // ── SUITE NODRI: os 4 módulos do app desktop aparecem como um único card ──
  const SUITE_NODRI_NOMES = ['confirmar agendamento', 'enviar feedback', 'enviar lista', 'enviar lista c/ arquivo']
  const ehModuloSuite = (nome: string) => SUITE_NODRI_NOMES.includes((nome || '').toLowerCase().trim())
  const modulosSuite = localModulos.filter(m => ehModuloSuite(m.nome))
  const modulosSemSuite = localModulos.filter(m => !ehModuloSuite(m.nome))
  const suiteEmManutencao = modulosSuite.some(m => !!m.em_manutencao)

  async function toggleManutencaoSuite() {
    const novoEstado = !suiteEmManutencao
    setTogglingManutencao('suite-nodri')
    try {
      for (const m of modulosSuite) {
        await fetch(`/api/modulos/${m.id}/manutencao`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ em_manutencao: novoEstado }),
        })
      }
      setLocalModulos(prev => prev.map(m => ehModuloSuite(m.nome) ? { ...m, em_manutencao: novoEstado } : m))
      toast.success(novoEstado ? 'Suite NODRI em manutenção' : 'Suite NODRI liberada!')
    } catch {
      toast.error('Erro de conexão ao alterar manutenção')
    }
    setTogglingManutencao(null)
  }

  async function toggleManutencao(modulo: Modulo) {
    setTogglingManutencao(modulo.id)
    const novoEstado = !modulo.em_manutencao
    try {
      const res = await fetch(`/api/modulos/${modulo.id}/manutencao`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ em_manutencao: novoEstado }),
      })
      const data = await res.json()
      setTogglingManutencao(null)
      if (res.ok) {
        // usa o valor real retornado pelo banco
        const estadoReal = !!data.em_manutencao
        setLocalModulos(prev => prev.map(m => m.id === modulo.id ? { ...m, em_manutencao: estadoReal } : m))
        toast.success(!estadoReal ? `"${modulo.nome}" liberado!` : `"${modulo.nome}" em manutenção`)
      } else {
        toast.error(`Erro: ${data.error || 'Falha ao alterar'}`)
      }
    } catch (e) {
      setTogglingManutencao(null)
      toast.error('Erro de conexão ao alterar manutenção')
    }
  }

  function openEditPlano(plano: Plano) {
    setEditPlano(plano)
    setPlanoForm({ nome: plano.nome, slug: plano.slug, descricao: plano.descricao || '', preco: String(plano.preco), max_usuarios: String(plano.max_usuarios || 1) })
    setShowNovoPlano(true)
  }

  async function handleSavePlano(e: React.FormEvent) {
    e.preventDefault()
    if (!planoForm.nome || !planoForm.slug || !planoForm.preco) { toast.error('Nome, slug e preço são obrigatórios'); return }
    setSavingPlano(true)
    const url = editPlano ? `/api/plans/${editPlano.id}` : '/api/plans'
    const method = editPlano ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...planoForm, preco: parseFloat(planoForm.preco), max_usuarios: parseInt(planoForm.max_usuarios) || 1 }) })
    const data = await res.json()
    setSavingPlano(false)
    if (res.ok) {
      toast.success(editPlano ? 'Plano atualizado!' : 'Plano criado!')
      if (editPlano) setPlanos(prev => prev.map(p => p.id === editPlano.id ? data : p))
      else setPlanos(prev => [...prev, data])
      setShowNovoPlano(false); setEditPlano(null); setPlanoForm({ nome: '', slug: '', descricao: '', preco: '', max_usuarios: '' })
    } else toast.error(data.error || 'Erro ao salvar plano')
  }

  async function deletePlano(planoId: string) {
    if (!confirm('Excluir este plano?')) return
    const res = await fetch(`/api/plans/${planoId}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Plano excluído!'); setPlanos(prev => prev.filter(p => p.id !== planoId)) }
    else toast.error('Erro ao excluir plano')
  }

  //  LANDING EDITOR 
  async function loadLandingConfig() {
    try {
      const res = await fetch('/api/landing-config')
      if (res.ok) {
        const data = await res.json()
        // Merge com DEFAULT para garantir que campos novos apareçam
        setLandingConfig({ ...DEFAULT_LANDING, ...data })
      } else setLandingConfig(DEFAULT_LANDING)
    } catch { setLandingConfig(DEFAULT_LANDING) }
  }

  async function saveLandingConfig() {
    if (!landingConfig) return
    setSavingLanding(true)
    try {
      const res = await fetch('/api/landing-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(landingConfig),
      })
      if (res.ok) toast.success('Landing page salva com sucesso!')
      else toast.error('Erro ao salvar landing page')
    } catch { toast.error('Erro ao salvar') }
    setSavingLanding(false)
  }







  //  CUPONS 
  async function loadCupons() {
    setLoadingCupons(true)
    try {
      const res = await fetch('/api/cupons')
      if (res.ok) { const data = await res.json(); setCupons(data) }
    } catch { toast.error('Erro ao carregar cupons') }
    setLoadingCupons(false)
  }

  async function gerarCupon(e: React.FormEvent) {
    e.preventDefault()
    if (!cuponForm.percentual) return
    setSavingCupon(true)
    const res = await fetch('/api/cupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        percentual: parseInt(cuponForm.percentual),
        codigo_personalizado: cuponForm.codigo || undefined,
      }),
    })
    const data = await res.json()
    setSavingCupon(false)
    if (res.ok) {
      toast.success(`Cupom ${data.codigo} criado!`)
      setCupons(prev => [data, ...prev])
      setCuponForm({ percentual: '', codigo: '' })
    } else toast.error(data.error || 'Erro ao criar cupom')
  }

  async function toggleCupon(id: string, ativo: boolean) {
    const res = await fetch('/api/cupons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ativo: !ativo }),
    })
    if (res.ok) {
      setCupons(prev => prev.map(c => c.id === id ? { ...c, ativo: !c.ativo } : c))
      toast.success(ativo ? 'Cupom desativado' : 'Cupom reativado')
    } else toast.error('Erro ao alterar cupom')
  }

  async function deleteCupon(id: string) {
    if (!confirm('Excluir este cupom permanentemente?')) return
    const res = await fetch(`/api/cupons?id=${id}`, { method: 'DELETE' })
    if (res.ok) { setCupons(prev => prev.filter(c => c.id !== id)); toast.success('Cupom excluído') }
    else toast.error('Erro ao excluir cupom')
  }

  //  MÓDULOS 
  function resetModuloForm() {
    setModuloForm({ nome: '', slug: '', descricao: '', versao: '1.0.0', icone: '', cor_classe: '', categoria: '', ordem: '0' })
  }

  function openEditModulo(m: Modulo) {
    setEditModulo(m)
    setModuloForm({ nome: m.nome, slug: m.slug, descricao: m.descricao || '', versao: m.versao || '1.0.0', icone: m.icone || '', cor_classe: m.cor_classe || '', categoria: m.categoria || '', ordem: String(m.ordem || 0) })
    setShowNovoModulo(true)
  }

  async function handleSaveModulo(e: React.FormEvent) {
    e.preventDefault()
    if (!moduloForm.nome || !moduloForm.slug) { toast.error('Nome e slug são obrigatórios'); return }
    setSavingModulo(true)
    const method = editModulo ? 'PUT' : 'POST'
    const body = editModulo
      ? { ...moduloForm, id: editModulo.id, ordem: parseInt(moduloForm.ordem) || 0 }
      : { ...moduloForm, ordem: parseInt(moduloForm.ordem) || 0, ativo: true }
    const res = await fetch('/api/modulos', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setSavingModulo(false)
    if (res.ok) {
      toast.success(editModulo ? 'Módulo atualizado!' : 'Módulo criado!')
      if (editModulo) setLocalModulos(prev => prev.map(m => m.id === editModulo.id ? data : m))
      else setLocalModulos(prev => [...prev, data])
      setShowNovoModulo(false); setEditModulo(null); resetModuloForm()
    } else toast.error(data.error || 'Erro ao salvar módulo')
  }

  async function toggleManutencaoModulo(m: Modulo) {
    const res = await fetch('/api/modulos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, ativo: !m.ativo }),
    })
    const data = await res.json()
    if (res.ok) {
      setLocalModulos(prev => prev.map(mod => mod.id === m.id ? { ...mod, ativo: data.ativo } : mod))
      toast.success(m.ativo ? 'Módulo em manutenção!' : 'Manutenção encerrada!')
    } else toast.error('Erro ao alterar módulo')
  }

  async function deleteModulo(id: string) {
    if (!confirm('Excluir este módulo permanentemente? Esta ação não pode ser desfeita.')) return
    const res = await fetch(`/api/modulos?id=${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Módulo excluído!'); setLocalModulos(prev => prev.filter(m => m.id !== id)) }
    else toast.error('Erro ao excluir módulo')
  }

  function getTrialStatus(criado_em: string | Date) {
    const criado = new Date(criado_em)
    const expira = new Date(criado)
    expira.setDate(expira.getDate() + 7)
    const hoje = new Date()
    const dias = Math.ceil((expira.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    if (dias <= 0) return <span className="text-nodri-red font-semibold flex items-center gap-1"><AlertCircle size={11} /> Expirado</span>
    if (dias <= 2) return <span className="text-nodri-red font-semibold flex items-center gap-1"><AlertCircle size={11} /> {dias}d restante</span>
    if (dias <= 4) return <span className="text-nodri-amber font-semibold flex items-center gap-1"><Clock size={11} /> {dias}d restantes</span>
    return <span className="text-nodri-green font-semibold flex items-center gap-1"><Clock size={11} /> {dias}d restantes</span>
  }

  function PagamentosSection() {
    const [pags, setPags] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [filtro, setFiltro] = useState<'todos'|'pago'|'pendente'|'vencido'|'cancelado'>('todos')
    const [updatingId, setUpdatingId] = useState<string|null>(null)

    useEffect(() => {
      setLoading(true)
      const url = filtro === 'todos' ? '/api/pagamentos' : `/api/pagamentos?status=${filtro}`
      fetch(url).then(r => r.json()).then(d => { setPags(Array.isArray(d) ? d : []); setLoading(false) })
    }, [filtro])

    async function atualizarStatus(id: string, status: string, salaoId: string) {
      setUpdatingId(id)
      const res = await fetch('/api/pagamentos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, salao_id: salaoId }),
      })
      const data = await res.json()
      if (res.ok) {
        setPags(prev => prev.map(p => p.id === id ? { ...p, ...data } : p))
        toast.success(status === 'pago' ? 'Pago! Acesso liberado automaticamente.' : `Status atualizado para ${status}`)
      } else toast.error('Erro ao atualizar')
      setUpdatingId(null)
    }

    const STATUS_COR: Record<string, string> = { pago: 'text-nodri-green bg-nodri-green/10 border-nodri-green/20', pendente: 'text-nodri-amber bg-nodri-amber/10 border-nodri-amber/20', vencido: 'text-nodri-red bg-nodri-red/10 border-nodri-red/20', cancelado: 'text-nodri-t3 bg-nodri-t3/10 border-nodri-t3/20' }

    const totalPago = pags.filter(p => p.status === 'pago').reduce((a, p) => a + (p.valor || 0), 0)
    const totalPendente = pags.filter(p => p.status === 'pendente').reduce((a, p) => a + (p.valor || 0), 0)

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total de pagamentos', value: pags.length, icon: <CreditCard size={16} /> },
            { label: 'Pagos', value: pags.filter(p => p.status === 'pago').length, icon: <CheckCircle size={16} /> },
            { label: 'Pendentes', value: pags.filter(p => p.status === 'pendente').length, icon: <Clock size={16} /> },
            { label: 'Receita confirmada', value: `R$${totalPago.toFixed(2)}`, icon: <DollarSign size={16} /> },
          ].map(s => (
            <div key={s.label} className="nodri-card p-3">
              <div className="text-[9px] text-nodri-t3 uppercase tracking-widest mb-1">{s.label}</div>
              <div className="font-syne font-bold text-lg flex items-center gap-1.5 text-nodri-t2">{s.icon} <span className="text-nodri-t1">{s.value}</span></div>
            </div>
          ))}
        </div>

        <div className="nodri-card p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="font-syne font-bold text-[13px] text-nodri-cyan flex items-center gap-2">
              <CreditCard size={14} /> Histórico de Pagamentos
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(['todos','pago','pendente','vencido','cancelado'] as const).map(f => (
                <button key={f} onClick={() => setFiltro(f)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold capitalize border transition-all ${filtro === f ? 'bg-nodri-cyan text-black border-nodri-cyan' : 'border-nodri-border text-nodri-t2 hover:text-nodri-t1'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-nodri-t3" /></div>
          ) : pags.length === 0 ? (
            <div className="text-center py-8 text-nodri-t3 text-[12px]">Nenhum pagamento encontrado.</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {pags.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-nodri-surface rounded-xl border border-nodri-border hover:border-nodri-cyan/20 transition-all flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-medium text-[12px]">{p.salao?.nome || 'Salão'}</div>
                    <div className="text-[10px] text-nodri-t3">{p.salao?.email} · {p.plano?.nome}</div>
                  </div>
                  <div className="font-syne font-bold text-[14px]">R${Number(p.valor).toFixed(2)}</div>
                  <div className="text-[10px] text-nodri-t3">{new Date(p.data_vencimento).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_COR[p.status] || ''}`}>{p.status}</span>
                  <div className="flex gap-1.5">
                    {p.status !== 'pago' && (
                      <button onClick={() => atualizarStatus(p.id, 'pago', p.salao_id)} disabled={updatingId === p.id}
                        className="px-2 py-1 bg-nodri-green/10 border border-nodri-green/30 text-nodri-green text-[10px] font-bold rounded hover:bg-nodri-green/20 disabled:opacity-50">
                        {updatingId === p.id ? <Loader2 size={10} className="animate-spin" /> : <><CheckCircle size={10} className="inline mr-0.5" />Pago</>}
                      </button>
                    )}
                    {p.status === 'pendente' && (
                      <button onClick={() => atualizarStatus(p.id, 'cancelado', p.salao_id)} disabled={updatingId === p.id}
                        className="px-2 py-1 bg-nodri-red/10 border border-nodri-red/30 text-nodri-red text-[10px] font-bold rounded hover:bg-nodri-red/20 disabled:opacity-50">
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  function AfiliadosSection() {
    const [afiliados, setAfiliados] = useState<any[]>([])
    const [loadingAf, setLoadingAf] = useState(false)
    const [savingComissao, setSavingComissao] = useState<string | null>(null)
    const [descontoCliente, setDescontoCliente] = useState(10)
    const [savingConfig, setSavingConfig] = useState(false)

    useEffect(() => {
      setLoadingAf(true)
      fetch('/api/afiliados').then(r => r.json()).then(d => { setAfiliados(Array.isArray(d) ? d : []); setLoadingAf(false) })
      fetch('/api/afiliados/config').then(r => r.json()).then(d => { if (d?.percentual) setDescontoCliente(d.percentual) })
    }, [])

    async function salvarConfig() {
      setSavingConfig(true)
      await fetch('/api/afiliados/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ percentual: descontoCliente }) })
      setSavingConfig(false)
      toast.success('Desconto do cliente atualizado!')
    }

    async function toggleAtivo(af: any) {
      const res = await fetch('/api/afiliados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: af.id, ativo: !af.ativo }),
      })
      if (res.ok) {
        setAfiliados(prev => prev.map(a => a.id === af.id ? { ...a, ativo: !a.ativo } : a))
        toast.success(af.ativo ? 'Afiliado bloqueado!' : 'Afiliado desbloqueado!')
      } else toast.error('Erro ao alterar status')
    }

    async function excluirAfiliado(af: any) {
      if (!confirm(`Excluir o afiliado "${af.nome}" permanentemente?\nO cupom ${af.cupom} será desativado.`)) return
      const res = await fetch(`/api/afiliados?id=${af.id}`, { method: 'DELETE' })
      if (res.ok) {
        setAfiliados(prev => prev.filter(a => a.id !== af.id))
        toast.success('Afiliado excluído!')
      } else toast.error('Erro ao excluir')
    }

    async function marcarPago(af: any) {
      setSavingComissao(af.id)
      const res = await fetch('/api/afiliados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: af.id, valor_pago: (af.valor_pago || 0) + (af.valor_acumulado || 0), valor_acumulado: 0 }),
      })
      if (res.ok) {
        setAfiliados(prev => prev.map(a => a.id === af.id ? { ...a, valor_pago: (a.valor_pago || 0) + (a.valor_acumulado || 0), valor_acumulado: 0 } : a))
        toast.success('Pagamento registrado!')
      }
      setSavingComissao(null)
    }

    async function alterarComissao(af: any, novaComissao: number) {
      const res = await fetch('/api/afiliados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: af.id, comissao_percentual: novaComissao }),
      })
      if (res.ok) {
        setAfiliados(prev => prev.map(a => a.id === af.id ? { ...a, comissao_percentual: novaComissao } : a))
        toast.success('Comissão atualizada!')
      }
    }

    const totalAcumulado = afiliados.reduce((acc, a) => acc + (a.valor_acumulado || 0), 0)
    const totalPago = afiliados.reduce((acc, a) => acc + (a.valor_pago || 0), 0)
    const totalVendas = afiliados.reduce((acc, a) => acc + (a.total_vendas || 0), 0)

    return (
      <div className="space-y-4">

        {/* Configuração de desconto */}
        <div className="nodri-card p-4">
          <div className="font-syne font-bold text-[13px] text-nodri-cyan mb-3 flex items-center gap-2">
            <Tag size={14} /> Configuração do Programa de Afiliados
          </div>
          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">
                Desconto que o CLIENTE ganha ao usar cupom de afiliado
              </label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={50} value={descontoCliente}
                  onChange={e => setDescontoCliente(Number(e.target.value))}
                  className="w-20 bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[13px] font-bold outline-none focus:border-nodri-cyan text-center" />
                <span className="text-nodri-t2 font-bold">%</span>
                <span className="text-[11px] text-nodri-t3 ml-2">de desconto no plano para o cliente</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-nodri-t3 mb-2">Comissão padrão do afiliado: <strong className="text-nodri-cyan">40%</strong> sobre o valor pago pelo cliente (já com desconto)</div>
              <button onClick={salvarConfig} disabled={savingConfig}
                className="flex items-center gap-2 bg-nodri-cyan text-black px-4 py-2 rounded-lg text-[11px] font-bold hover:brightness-110 disabled:opacity-50">
                {savingConfig ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Salvar configuração
              </button>
            </div>
          </div>
          <div className="mt-3 p-3 bg-nodri-surface rounded-lg border border-nodri-border text-[11px] text-nodri-t2">
            <strong className="text-nodri-t1">Exemplo:</strong> Plano R$200 → Cliente paga <strong className="text-nodri-cyan">R${(200 * (1 - descontoCliente / 100)).toFixed(2)}</strong> ({descontoCliente}% off) → Afiliado ganha <strong className="text-nodri-green">R${(200 * (1 - descontoCliente / 100) * 0.4).toFixed(2)}</strong> (40% do valor pago)
          </div>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Afiliados cadastrados', value: afiliados.length },
            { label: 'Total de vendas', value: totalVendas },
            { label: 'A pagar (pendente)', value: `R$${totalAcumulado.toFixed(2)}`, red: totalAcumulado > 0 },
            { label: 'Total já pago', value: `R$${totalPago.toFixed(2)}` },
          ].map(s => (
            <div key={s.label} className="nodri-card p-3">
              <div className="text-[9px] text-nodri-t3 uppercase tracking-widest mb-1">{s.label}</div>
              <div className={`font-syne font-bold text-lg ${s.red ? 'text-nodri-amber' : ''}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Lista de afiliados */}
        <div className="nodri-card p-4">
          <div className="font-syne font-bold text-[13px] text-nodri-cyan mb-4 flex items-center gap-2">
            <Users size={14} /> Relatório de Afiliados
          </div>
          {loadingAf ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-nodri-t3" /></div>
          ) : afiliados.length === 0 ? (
            <div className="text-center py-8 text-nodri-t3 text-[12px]">Nenhum afiliado cadastrado ainda.</div>
          ) : (
            <div className="space-y-3">
              {afiliados.map(af => (
                <div key={af.id} className="bg-nodri-surface border border-nodri-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-syne font-bold text-[13px]">{af.nome}</div>
                      <div className="text-[11px] text-nodri-t3 mt-0.5">{af.email} · {af.telefone}</div>
                      <div className="text-[10px] text-nodri-t3 mt-0.5">CPF: {af.cpf} · Pix: <span className="text-nodri-cyan font-mono">{af.chave_pix}</span></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-[12px] bg-nodri-cyan/10 border border-nodri-cyan/30 text-nodri-cyan px-3 py-1 rounded-lg font-bold">{af.cupom}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                    <div className="bg-nodri-card rounded-lg p-2.5 text-center">
                      <div className="text-[9px] text-nodri-t3 uppercase">Vendas</div>
                      <div className="font-bold text-[15px]">{af.total_vendas || 0}</div>
                    </div>
                    <div className="bg-nodri-card rounded-lg p-2.5 text-center">
                      <div className="text-[9px] text-nodri-t3 uppercase">A Pagar</div>
                      <div className={`font-bold text-[15px] ${(af.valor_acumulado || 0) > 0 ? 'text-nodri-amber' : ''}`}>R${(af.valor_acumulado || 0).toFixed(2)}</div>
                    </div>
                    <div className="bg-nodri-card rounded-lg p-2.5 text-center">
                      <div className="text-[9px] text-nodri-t3 uppercase">Total Pago</div>
                      <div className="font-bold text-[15px] text-nodri-green">R${(af.valor_pago || 0).toFixed(2)}</div>
                    </div>
                    <div className="bg-nodri-card rounded-lg p-2.5 text-center">
                      <div className="text-[9px] text-nodri-t3 uppercase">Comissão</div>
                      <div className="flex items-center justify-center gap-1">
                        <input type="number" defaultValue={af.comissao_percentual || 40} min={1} max={100}
                          onBlur={e => alterarComissao(af, parseInt(e.target.value))}
                          className="w-12 bg-transparent text-center font-bold text-[14px] outline-none border-b border-nodri-border focus:border-nodri-cyan" />
                        <span className="text-[11px] text-nodri-t3">%</span>
                      </div>
                    </div>
                  </div>

                  {(af.valor_acumulado || 0) > 0 && (
                    <button onClick={() => marcarPago(af)} disabled={savingComissao === af.id}
                      className="mt-3 w-full py-2 bg-nodri-green/10 border border-nodri-green/30 text-nodri-green text-[12px] font-bold rounded-lg hover:bg-nodri-green/20 transition-all flex items-center justify-center gap-2">
                      {savingComissao === af.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Marcar R${(af.valor_acumulado || 0).toFixed(2)} como pago (Pix: {af.chave_pix})
                    </button>
                  )}

                  {/* Ações: bloquear/desbloquear e excluir */}
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => toggleAtivo(af)}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${af.ativo !== false ? 'bg-nodri-amber/10 border-nodri-amber/30 text-nodri-amber hover:bg-nodri-amber/20' : 'bg-nodri-green/10 border-nodri-green/30 text-nodri-green hover:bg-nodri-green/20'}`}>
                      {af.ativo !== false ? <><Lock size={11} /> Bloquear cupom</> : <><Unlock size={11} /> Desbloquear cupom</>}
                    </button>
                    <button onClick={() => excluirAfiliado(af)}
                      className="px-3 py-1.5 text-[11px] font-bold rounded-lg border border-nodri-red/30 bg-nodri-red/5 text-nodri-red hover:bg-nodri-red/15 transition-all flex items-center gap-1.5">
                      <Trash2 size={11} /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  function LogsSection() {
    const [logs, setLogs] = useState<any[]>([])
    const [loadingLogs, setLoadingLogs] = useState(false)
    useEffect(() => {
      setLoadingLogs(true)
      fetch('/api/logs').then(r => r.json()).then(d => { setLogs(Array.isArray(d) ? d : []); setLoadingLogs(false) })
    }, [])
    return (
      <div className="nodri-card p-4">
        <div className="font-syne font-bold text-[13px] text-nodri-cyan mb-4 flex items-center gap-2">
          <BarChart3 size={14} /> Logs de Auditoria
          <span className="text-[10px] text-nodri-t3 font-normal">({logs.length} registros)</span>
        </div>
        {loadingLogs ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-nodri-t3" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-nodri-t3 text-[12px]">Nenhum log registrado ainda.</div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 p-2.5 bg-nodri-surface rounded-lg border border-nodri-border text-[11px]">
                <span className="text-nodri-t3 shrink-0 font-mono text-[10px]">{new Date(log.criado_em).toLocaleString('pt-BR')}</span>
                <span className="text-nodri-cyan font-bold shrink-0">{log.acao}</span>
                <span className="text-nodri-t2">{log.usuario?.nome || 'Sistema'}</span>
                {log.salao?.nome && <span className="text-nodri-t3">→ {log.salao.nome}</span>}
                {log.ip && <span className="text-nodri-t3 ml-auto font-mono">{log.ip}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const navItems = [
    { id: 'saloes', icon: <Building size={14} />, label: 'Salões', badge: saloes.length },
    // Página própria (não é aba): define o salão modelo e alimenta ele
    { id: 'modelo', icon: <Building size={14} />, label: 'Salão modelo', rota: '/admin/modelo' },
    { id: 'contatos', icon: <Mail size={14} />, label: 'Contatos do site' },
    { id: 'funcionalidades', icon: <Zap size={14} />, label: 'Funcionalidades' },
    { id: 'planos', icon: <CreditCard size={14} />, label: 'Planos', badge: planos.length },
    { id: 'landing', icon: <Edit size={14} />, label: 'Editor Landing Page' },
    { id: 'cupons', icon: <Tag size={14} />, label: 'Cupons de Desconto' },
    { id: 'modulos', icon: <Puzzle size={14} />, label: 'Módulos' },
    { id: 'notifs', icon: <Bell size={14} />, label: 'Notificações', badge: localNotifs.filter(n => !n.lida).length, badgeRed: true },
    { id: 'pagamentos', icon: <CreditCard size={14} />, label: 'Pagamentos' },
    { id: 'afiliados', icon: <Users size={14} />, label: 'Afiliados' },
    { id: 'logs', icon: <BarChart3 size={14} />, label: 'Logs do Sistema' },
    { id: 'relatorios', icon: <BarChart3 size={14} />, label: 'Relatórios' },
    { id: 'config', icon: <Settings size={14} />, label: 'Configurações' },
    { id: 'ia', icon: <Bot size={14} />, label: 'IA' },
    { id: 'academia', icon: <GraduationCap size={14} />, label: 'Academia' },
    { id: 'programas', icon: <Wrench size={14} />, label: 'Programas' },
  ]

  return (
    <div className="flex h-screen bg-nodri-dark overflow-hidden">
      <aside className="w-[200px] min-w-[200px] bg-nodri-surface border-r border-nodri-border flex flex-col">
        <div className="px-4 py-4 border-b border-nodri-border flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-syne font-black text-sm text-black" style={{ background: 'linear-gradient(135deg, #5b4fcf, #5b4fcf)' }}>N</div>
          <div><div className="font-syne font-bold text-[13px]">NODRI</div><div className="text-[8px] text-nodri-cyan tracking-wider uppercase">Admin</div></div>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto space-y-0.5">
          <p className="text-[9px] text-nodri-t3 uppercase tracking-widest px-2.5 py-1.5 font-medium mt-1">Painel</p>
          {navItems.slice(0, 7).map(item => (
            <button key={item.id} onClick={() => { if ((item as any).rota) window.location.href = (item as any).rota; else setActiveSection(item.id) }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11.5px] border transition-all ${activeSection === item.id ? 'bg-nodri-cyan/9 text-nodri-cyan border-nodri-cyan/17' : 'text-nodri-t2 border-transparent hover:bg-white/4 hover:text-nodri-t1'}`}>
              {item.icon}<span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeRed ? 'bg-nodri-red text-gray-900' : 'bg-nodri-cyan text-black'}`}>{item.badge}</span>
              )}
            </button>
          ))}
          <p className="text-[9px] text-nodri-t3 uppercase tracking-widest px-2.5 py-1.5 font-medium mt-2">Sistema</p>
          {navItems.slice(7).map(item => (
            <button key={item.id} onClick={() => { if ((item as any).rota) window.location.href = (item as any).rota; else setActiveSection(item.id) }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11.5px] border transition-all ${activeSection === item.id ? 'bg-nodri-cyan/9 text-nodri-cyan border-nodri-cyan/17' : 'text-nodri-t2 border-transparent hover:bg-white/4 hover:text-nodri-t1'}`}>
              {item.icon}<span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-nodri-border">
          <div className="flex items-center gap-2 p-2 bg-white/3 rounded-lg border border-nodri-border">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-black" style={{ background: 'linear-gradient(135deg, #5b4fcf, #5b4fcf)' }}>AD</div>
            <div className="flex-1 min-w-0"><div className="text-[11px] font-medium truncate">Admin Master</div><div className="text-[9px] text-nodri-cyan">Acesso Total</div></div>
            <button onClick={handleLogout} title="Sair" className="text-nodri-t3 hover:text-nodri-red transition-colors"><LogOut size={13} /></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="px-5 py-3 border-b border-nodri-border bg-nodri-surface flex items-center gap-3 sticky top-0 z-20">
          <div>
            <div className="font-syne font-bold text-[15px]">
              {activeSection === 'planos' ? 'Gestão de Planos' : activeSection === 'modulos' ? 'Gestão de Módulos' : activeSection === 'ia' ? 'IA NODRI' : activeSection === 'contatos' ? 'Contatos do Site' : activeSection === 'funcionalidades' ? 'Funcionalidades da Vitrine' : 'Painel Admin Master'}
            </div>
            <div className="text-[11px] text-nodri-t2">
              {activeSection === 'planos' ? 'Planos, Landing Page e Cupons de Desconto' : activeSection === 'modulos' ? 'Criar, editar e gerenciar módulos do sistema' : activeSection === 'ia' ? 'Configuração global da IA e controle por salão' : activeSection === 'contatos' ? 'Quem procurou o NODRI pelo site — libere o acesso aos planos' : activeSection === 'funcionalidades' ? 'Páginas de funcionalidade e o menu do topo do site' : 'Controle total de salões, licenças e módulos'}
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="relative w-8 h-8 bg-nodri-card border border-nodri-border rounded-lg flex items-center justify-center text-nodri-t2 hover:text-nodri-cyan transition-all">
              <Bell size={14} />
              {localNotifs.filter(n => !n.lida).length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-nodri-red rounded-full" />}
            </button>
            {activeSection === 'planos' && (
              <button onClick={() => { setEditPlano(null); setPlanoForm({ nome: '', slug: '', descricao: '', preco: '', max_usuarios: '' }); setShowNovoPlano(true) }}
                className="flex items-center gap-1.5 bg-nodri-cyan text-black text-[11.5px] font-bold px-3 py-1.5 rounded-lg hover:brightness-110 transition-all">
                <Plus size={13} /> Novo Plano
              </button>
            )}
            {activeSection === 'modulos' && (
              <button onClick={() => { resetModuloForm(); setEditModulo(null); setShowNovoModulo(true) }}
                className="flex items-center gap-1.5 bg-nodri-cyan text-black text-[11.5px] font-bold px-3 py-1.5 rounded-lg hover:brightness-110 transition-all">
                <Plus size={13} /> Novo Módulo
              </button>
            )}
            {activeSection !== 'planos' && activeSection !== 'modulos' && activeSection !== 'ia' && activeSection !== 'contatos' && activeSection !== 'funcionalidades' && (
              <button onClick={() => setShowNovoSalao(true)} className="flex items-center gap-1.5 bg-nodri-cyan text-black text-[11.5px] font-bold px-3 py-1.5 rounded-lg hover:brightness-110 transition-all">
                <Plus size={13} /> Novo Salão
              </button>
            )}
          </div>
        </div>

        <div className="p-5 flex-1">

          {/* MÓDULOS */}
          {activeSection === 'modulos' && (
            <div className="space-y-4">
              {/* Manutenção de Módulos */}
              <div className="nodri-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-syne font-bold text-[13px] text-nodri-cyan flex items-center gap-2">
                    <Puzzle size={14} /> <Wrench size={13} className="inline" /> Manutenção de Módulos
                  </div>
                  {localModulos.some(m => m.em_manutencao) && (
                    <button onClick={async () => {
                      for (const m of localModulos.filter(x => x.em_manutencao)) {
                        await fetch(`/api/modulos/${m.id}/manutencao`, {
                          method: 'PUT', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ em_manutencao: false }),
                        })
                      }
                      setLocalModulos(prev => prev.map(m => ({ ...m, em_manutencao: false })))
                      toast.success('Manutenção encerrada em todos os módulos!')
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-nodri-green/10 border border-nodri-green/30 text-nodri-green text-[11px] font-bold rounded-lg hover:bg-nodri-green/20 transition-all">
                      <CheckCircle size={12} /> Encerrar Todos
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-nodri-t3 mb-4">Ative o modo manutenção para bloquear temporariamente um módulo para todos os salões</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {modulosSuite.length > 0 && (
                    <div className={`p-3 border rounded-xl transition-all ${suiteEmManutencao ? 'border-nodri-red/40 bg-nodri-red/5' : 'border-nodri-cyan/40 bg-nodri-cyan/5'}`}>
                      <div className="flex items-start justify-between mb-2 gap-1">
                        <div className="min-w-0">
                          <div className="font-bold text-[10px] uppercase leading-tight truncate">🚀 Suite NODRI</div>
                          <div className="text-[9px] text-nodri-t3">Confirmar Agend. · Feedback · Lista · Lista c/ Arquivo</div>
                        </div>
                        {suiteEmManutencao && <span className="text-[8px] bg-nodri-red text-gray-900 px-1.5 py-0.5 rounded font-bold shrink-0">MANUTENÇÃO</span>}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button onClick={toggleManutencaoSuite}
                          className={`flex-1 py-1 text-[9px] font-bold rounded border transition-all ${!suiteEmManutencao ? 'border-nodri-red/30 text-nodri-red bg-nodri-red/5 hover:bg-nodri-red/15' : 'border-nodri-green/30 text-nodri-green bg-nodri-green/5 hover:bg-nodri-green/15'}`}>
                          {!suiteEmManutencao ? <><Wrench size={9} /> Manutenção</> : <><CheckCircle size={9} /> Encerrar</>}
                        </button>
                      </div>
                    </div>
                  )}
                  {modulosSemSuite.map(m => (
                    <div key={m.id} className={`p-3 border rounded-xl transition-all ${m.em_manutencao ? 'border-nodri-red/40 bg-nodri-red/5' : 'border-nodri-border bg-nodri-surface'}`}>
                      <div className="flex items-start justify-between mb-2 gap-1">
                        <div className="min-w-0">
                          <div className="font-bold text-[10px] uppercase leading-tight truncate">{m.nome}</div>
                          <div className="text-[9px] text-nodri-t3">v{m.versao}</div>
                        </div>
                        {m.em_manutencao && <span className="text-[8px] bg-nodri-red text-gray-900 px-1.5 py-0.5 rounded font-bold shrink-0">MANUTENÇÃO</span>}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button onClick={() => toggleManutencao(m)}
                          className={`flex-1 py-1 text-[9px] font-bold rounded border transition-all ${!m.em_manutencao ? 'border-nodri-red/30 text-nodri-red bg-nodri-red/5 hover:bg-nodri-red/15' : 'border-nodri-green/30 text-nodri-green bg-nodri-green/5 hover:bg-nodri-green/15'}`}>
                          {!m.em_manutencao ? <><Wrench size={9} /> Manutenção</> : <><CheckCircle size={9} /> Encerrar</>}
                        </button>
                        <button onClick={() => openEditModulo(m)} title="Editar" className="p-1 border border-nodri-border rounded text-nodri-t3 hover:text-nodri-cyan hover:border-nodri-cyan/30 transition-all"><Edit size={10} /></button>
                        <button onClick={() => deleteModulo(m.id)} title="Excluir" className="p-1 border border-nodri-red/30 rounded text-nodri-red hover:bg-nodri-red/10 transition-all"><Trash2 size={10} /></button>
                      </div>
                    </div>
                  ))}
                  {localModulos.length === 0 && (
                    <div className="col-span-4 text-center py-8 text-nodri-t3 text-[12px]">Nenhum módulo cadastrado. Clique em "Novo Módulo" para começar.</div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total de Módulos', value: modulosSemSuite.length + (modulosSuite.length > 0 ? 1 : 0), icon: <Settings size={22} /> },
                  { label: 'Ativos', value: modulosSemSuite.filter(m => !m.em_manutencao).length + (modulosSuite.length > 0 && !suiteEmManutencao ? 1 : 0), icon: <CheckCircle size={22} /> },
                  { label: 'Em Manutenção', value: modulosSemSuite.filter(m => !!m.em_manutencao).length + (suiteEmManutencao ? 1 : 0), icon: <Wrench size={22} /> },
                ].map(s => (
                  <div key={s.label} className="nodri-card p-4 text-center">
                    <div className="flex justify-center mb-1 text-nodri-t2">{s.icon}</div>
                    <div className="font-syne font-bold text-xl">{s.value}</div>
                    <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EDITOR DE PÁGINAS */}
          {/* PAGAMENTOS */}
          {activeSection === 'pagamentos' && <PagamentosSection />}

          {/* AFILIADOS */}
          {activeSection === 'afiliados' && <AfiliadosSection />}

          {/* LOGS DO SISTEMA */}
          {activeSection === 'logs' && <LogsSection />}

          {/* PROGRAMAS (config remota da Suite) */}
          {activeSection === 'programas' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Wrench size={64} className="text-nodri-cyan" />
              <h2 className="text-xl font-bold text-gray-900">Programas — Configuração Remota</h2>
              <p className="text-gray-500 text-sm text-center max-w-md">XPaths, links de relatórios e tempos de espera da Suite NODRI. O que você salvar aqui vale para TODOS os clientes na próxima abertura do programa — sem reinstalar nada.</p>
              <a href="/admin/programas" className="bg-nodri-cyan hover:brightness-110 text-black font-semibold px-6 py-2.5 rounded-xl text-sm transition-all">
                Abrir Configuração
              </a>
            </div>
          )}

          {/* ACADEMIA */}
          {activeSection === 'academia' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <GraduationCap size={64} className="text-nodri-cyan" />
              <h2 className="text-xl font-bold text-gray-900">Academia NODRI</h2>
              <p className="text-gray-500 text-sm text-center max-w-xs">Gerencie os artigos da Academia: crie, edite, oculte e organize o conteúdo por categoria.</p>
              <a href="/admin/academia" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">
                Abrir Academia
              </a>
            </div>
          )}

          {/* PLANOS · LANDING · CUPONS — cada um virou item proprio da sidebar,
              em vez de aba dentro de Planos. O conteudo e o mesmo. */}
          {activeSection === 'contatos' && <Contatos />}

          {activeSection === 'funcionalidades' && <EditorFuncionalidades />}

          {(activeSection === 'planos' || activeSection === 'landing' || activeSection === 'cupons') && (
            <div>
              {/* ABA PLANOS */}
              {activeSection === 'planos' && (
                <div className="grid gap-3">
                  {planos.map(plano => (
                    <div key={plano.id} className="nodri-card p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[14px] font-bold text-black ${PLANO_CLASS[plano.slug as keyof typeof PLANO_CLASS] || 'bg-nodri-t3/20'}`}>{plano.nome[0]}</div>
                        <div>
                          <div className="font-syne font-bold text-[13px]">{plano.nome}</div>
                          <div className="text-[10px] text-nodri-t2">Slug: {plano.slug}</div>
                          {plano.descricao && <div className="text-[10px] text-nodri-t3 mt-0.5">{plano.descricao}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right"><div className="font-syne font-bold text-[15px]">R${plano.preco}</div><div className="text-[9px] text-nodri-t3">/mês</div></div>
                        <div className="text-right"><div className="text-[11px] font-medium flex items-center gap-1"><Users size={11} /> {plano.max_usuarios} usuário(s)</div></div>
                        <div className="flex gap-1.5">
                          <button onClick={() => openEditPlano(plano)} className="p-1.5 rounded-md border border-nodri-purple/40 text-nodri-purple bg-nodri-purple/7 hover:bg-nodri-purple/15 transition-all"><Edit size={11} /></button>
                          <button onClick={() => deletePlano(plano.id)} className="p-1.5 rounded-md border border-nodri-red/35 text-nodri-red bg-nodri-red/7 hover:bg-nodri-red/15 transition-all"><Trash2 size={11} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {planos.length === 0 && <div className="nodri-card p-8 text-center text-nodri-t3 text-sm">Nenhum plano cadastrado. Clique em "Novo Plano" para começar.</div>}
                </div>
              )}

              {/* ABA EDITOR LANDING PAGE */}
              {/* Editor antigo trocado pelo EditorVitrine: ele cobria só
                  metade da página (topo, benefícios, afiliados) e deixava
                  de fora os cards de dores, a comparação e os destaques,
                  que só se mudavam no código. O novo edita tudo e ainda
                  deixa criar seções novas sem programador. */}
              {activeSection === 'landing' && <EditorVitrine />}

              {/* ABA CUPONS DE DESCONTO */}
              {activeSection === 'cupons' && (
                <div className="space-y-5">
                  {/* Gerar novo cupom */}
                  <div className="nodri-card p-5">
                    <div className="font-syne font-bold text-[13px] text-nodri-cyan mb-4 flex items-center gap-2">
                      <Tag size={14} /> Gerar Novo Cupom de Desconto
                    </div>
                    <form onSubmit={gerarCupon} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Percentual de Desconto *</label>
                          <div className="flex items-center gap-2">
                            <input type="number" min="1" max="100" className="nodri-input flex-1"
                              placeholder="Ex: 20" value={cuponForm.percentual}
                              onChange={e => setCuponForm(p => ({ ...p, percentual: e.target.value }))} />
                            <span className="text-nodri-t2 font-bold text-[14px]">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1.5 block">Código personalizado (opcional)</label>
                          <input className="nodri-input" placeholder="Ex: PROMOCAO30 (ou deixe vazio)"
                            value={cuponForm.codigo}
                            onChange={e => setCuponForm(p => ({ ...p, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} />
                        </div>
                      </div>
                      {cuponForm.percentual && (
                        <div className="bg-nodri-cyan/5 border border-nodri-cyan/20 rounded-lg p-3 text-[11px] text-nodri-t2">
                          Exemplo de código gerado: <span className="font-mono font-bold text-nodri-cyan">{cuponForm.codigo || `NODRI${cuponForm.percentual}XXXX`}</span> — dará <strong className="text-nodri-cyan">{cuponForm.percentual}% de desconto</strong> para o cliente que usar na compra.
                        </div>
                      )}
                      <button type="submit" disabled={savingCupon || !cuponForm.percentual}
                        className="flex items-center gap-2 bg-nodri-cyan text-black px-5 py-2.5 rounded-lg text-[12px] font-bold hover:brightness-110 disabled:opacity-50 transition-all">
                        {savingCupon ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                        Gerar Cupom
                      </button>
                    </form>
                  </div>

                  {/* Lista de cupons */}
                  <div className="nodri-card p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-syne font-bold text-[12px] text-nodri-cyan flex items-center gap-1.5"><ClipboardList size={13} /> Cupons Criados</div>
                      <button onClick={loadCupons} className="text-[10px] text-nodri-t3 hover:text-nodri-t1 flex items-center gap-1">
                        <RefreshCw size={10} /> Atualizar
                      </button>
                    </div>
                    {loadingCupons ? (
                      <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-nodri-t3" /></div>
                    ) : cupons.length === 0 ? (
                      <div className="text-center py-8 text-nodri-t3 text-[12px]">Nenhum cupom criado ainda. Gere o primeiro acima.</div>
                    ) : (
                      <div className="space-y-2">
                        {cupons.map(c => (
                          <div key={c.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${c.ativo ? 'border-nodri-border bg-nodri-surface' : 'border-nodri-border/30 bg-nodri-card/50 opacity-60'}`}>
                            <div className="flex items-center gap-3">
                              <div className="font-mono font-bold text-[14px] text-nodri-cyan tracking-wider">{c.codigo}</div>
                              <div className="text-[10px] bg-nodri-cyan/10 text-nodri-cyan px-2 py-0.5 rounded-full font-bold">{c.percentual}% OFF</div>
                              {!c.ativo && <div className="text-[10px] bg-nodri-red/10 text-nodri-red px-2 py-0.5 rounded-full">Inativo</div>}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-[10px] text-nodri-t3">{c.usos_atual} uso(s)</div>
                              <div className="text-[10px] text-nodri-t3">{new Date(c.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
                              <button onClick={() => toggleCupon(c.id, c.ativo)} title={c.ativo ? 'Desativar' : 'Reativar'}
                                className={`p-1.5 rounded-md border transition-all ${c.ativo ? 'border-nodri-amber/40 text-nodri-amber bg-nodri-amber/7 hover:bg-nodri-amber/15' : 'border-nodri-green/40 text-nodri-green bg-nodri-green/7 hover:bg-nodri-green/15'}`}>
                                {c.ativo ? <Lock size={11} /> : <Unlock size={11} />}
                              </button>
                              <button onClick={() => deleteCupon(c.id)} className="p-1.5 rounded-md border border-nodri-red/35 text-nodri-red bg-nodri-red/7 hover:bg-nodri-red/15 transition-all">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ATUALIZAÇÕES */}

          {/* RELATÓRIOS */}
          {activeSection === 'relatorios' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total de Salões', value: saloes.length, icon: <Building size={22} /> },
                  { label: 'Ativos', value: saloes.filter(s => s.status === 'ativo').length, icon: <CheckCircle size={22} /> },
                  { label: 'Bloqueados', value: saloes.filter(s => s.status === 'bloqueado').length, icon: <Lock size={22} /> },
                  { label: 'Vencidos', value: saloes.filter(s => s.status === 'vencido').length, icon: <AlertCircle size={22} /> },
                  { label: 'Trial', value: saloes.filter(s => s.status === 'trial').length, icon: <Clock size={22} /> },
                  { label: 'Receita Mensal', value: `R$${saloes.filter(s => s.status === 'ativo' && s.plano).reduce((acc, s) => acc + (s.plano?.preco || 0), 0).toFixed(2)}`, icon: <DollarSign size={22} /> },
                ].map(r => (
                  <div key={r.label} className="nodri-card p-4 text-center">
                    <div className="flex justify-center mb-2 text-nodri-t2">{r.icon}</div>
                    <div className="font-syne font-bold text-xl">{r.value}</div>
                    <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mt-1">{r.label}</div>
                  </div>
                ))}
              </div>
              <div className="nodri-card p-4">
                <div className="font-syne font-bold text-[13px] mb-3 text-nodri-cyan flex items-center gap-1.5"><BarChart3 size={14} /> Salões por Plano</div>
                {['basico', 'profissional', 'premium'].map(slug => {
                  const count = saloes.filter(s => s.plano?.slug === slug).length
                  const pct = saloes.length ? Math.round((count / saloes.length) * 100) : 0
                  return (
                    <div key={slug} className="mb-3">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="capitalize text-nodri-t1 font-medium">{slug}</span>
                        <span className="text-nodri-t3">{count} salões ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-nodri-surface rounded-full overflow-hidden">
                        <div className="h-full bg-nodri-cyan rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* CONFIGURAÇÕES */}
          {/*  IA CONFIG  */}
          {activeSection === 'ia' && (
            <div className="space-y-5 max-w-xl">
              <div className="nodri-card p-5">
                <div className="font-syne font-bold text-[13px] text-nodri-cyan mb-4 flex items-center gap-1.5"><Bot size={14} /> Configuração da IA NODRI</div>
                {iaConfigLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-nodri-cyan" /></div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1 block">
                        API Key Gemini {iaConfig.api_key_salva && <span className="text-green-700 normal-case">(já configurada)</span>}
                      </label>
                      <div className="relative">
                        <input
                          type={showIaKey ? 'text' : 'password'}
                          value={iaConfig.api_key}
                          onChange={e => setIaConfig(p => ({ ...p, api_key: e.target.value }))}
                          placeholder={iaConfig.api_key_salva ? 'Deixe em branco para manter a atual' : 'Sua API Key do Google Gemini'}
                          className="nodri-input w-full pr-10"
                        />
                        <button type="button" onClick={() => setShowIaKey(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-nodri-t3 hover:text-nodri-t1">
                          {showIaKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-nodri-cyan hover:underline mt-1 block">Obter chave Gemini →</a>
                    </div>
                    <div>
                      <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1 block">Modelo</label>
                      <select className="nodri-input w-full" value={iaConfig.modelo} onChange={e => setIaConfig(p => ({ ...p, modelo: e.target.value }))}>
                        <option value="claude-haiku-4-5">Claude Haiku — Recomendado (R$0,25/mi tokens)</option>
                        <option value="claude-sonnet-4-5">Claude Sonnet — Alta qualidade (R$1,50/mi tokens)</option>
                        <option value="claude-opus-4-5">Claude Opus — Máxima qualidade (R$7,50/mi tokens)</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash — Opção Google</option>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash — Google pago</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1 block">
                        Instruções personalizadas — comportamento extra da IA (opcional)
                      </label>
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setIaConfig(p => ({ ...p, instrucoes_base: `Seja sempre cordial e use o nome do profissional ao cumprimentar.\nFoco principal: aumentar faturamento e fidelização de clientes.\nSempre sugira pelo menos uma ação prática ao final de cada resposta.\nUse linguagem simples e direta, sem termos técnicos desnecessários.` }))}
                          className="text-[10px] px-3 py-1 rounded bg-nodri-border hover:bg-nodri-cyan/20 text-nodri-t2 hover:text-nodri-cyan transition-all flex items-center gap-1"
                        >
                          <ClipboardList size={11} className="inline mr-1" /> Carregar Prompt Padrão
                        </button>
                        <span className="text-[9px] text-nodri-t3">ou escreva do zero abaixo</span>
                      </div>
                      <textarea
                        className="nodri-input w-full resize-none min-h-[300px]"
                        placeholder="Ex: Sempre cumprimente pelo nome. Foque em aumentar faturamento. Sugira promoções de fidelização..."
                        value={iaConfig.instrucoes_base}
                        onChange={e => setIaConfig(p => ({ ...p, instrucoes_base: e.target.value }))}
                      />
                      <p className="text-[9px] text-nodri-t3 mt-1">Estas instruções são adicionadas ao Prompt Mestre da IA e permitem personalizar o comportamento para todos os salões.</p>
                    </div>
                    <button
                      onClick={async () => {
                        setIaConfigLoading(true)
                        const res = await fetch('/api/admin/ia-config', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ api_key: iaConfig.api_key, modelo: iaConfig.modelo, instrucoes_base: iaConfig.instrucoes_base, ativo: true }),
                        })
                        setIaConfigLoading(false)
                        if (res.ok) {
                          toast.success('Configuração da IA salva!')
                          setIaConfig(p => ({ ...p, api_key: '', api_key_salva: p.api_key_salva || !!p.api_key }))
                        } else {
                          const d = await res.json()
                          toast.error(d.error || 'Erro ao salvar')
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nodri-cyan text-black text-[12px] font-bold hover:brightness-110">
                      <Save size={13} /> Salvar Configuração
                    </button>
                  </div>
                )}
              </div>

              {/* Keys Tavily — Busca na Internet */}
              <div className="nodri-card p-5">
                <div className="font-syne font-bold text-[13px] text-nodri-cyan mb-1 flex items-center gap-1.5"><Search size={14} /> Busca na Internet (Tavily)</div>
                <p className="text-[10px] text-nodri-t3 mb-4">Keys para a IA buscar técnicas de procedimentos e tendências de beleza na internet. O sistema rotaciona automaticamente quando uma key esgota.</p>

                {/* Lista de keys cadastradas */}
                <div className="space-y-2 mb-4">
                  {tavilyKeys.length === 0 && (
                    <p className="text-[10px] text-nodri-t3 italic">Nenhuma key cadastrada ainda.</p>
                  )}
                  {tavilyKeys.map((key, i) => (
                    <div key={i} className="flex items-center gap-2 bg-nodri-bg2 rounded-lg px-3 py-2">
                      <span className="text-[10px] text-green-700 font-bold w-16 flex-shrink-0">Key {i + 1}</span>
                      <span className="text-[10px] text-nodri-t2 flex-1 font-mono truncate">{key.slice(0, 12)}...{key.slice(-6)}</span>
                      <button
                        onClick={async () => {
                          const novas = tavilyKeys.filter((_, idx) => idx !== i)
                          const res = await fetch('/api/admin/ia-config', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tavily_keys: novas }),
                          })
                          if (res.ok) { setTavilyKeys(novas); toast.success('Key removida!') }
                          else toast.error('Erro ao remover key')
                        }}
                        className="text-red-700 hover:text-red-300 text-[10px] flex-shrink-0"
                      ></button>
                    </div>
                  ))}
                </div>

                {/* Adicionar nova key */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novaKeyTavily}
                    onChange={e => setNovaKeyTavily(e.target.value)}
                    placeholder="tvly-dev-xxxxxxxxxxxxxxxx"
                    className="nodri-input flex-1 text-[11px] font-mono"
                  />
                  <button
                    disabled={!novaKeyTavily.trim() || tavilySaving}
                    onClick={async () => {
                      setTavilySaving(true)
                      const novas = [...tavilyKeys, novaKeyTavily.trim()]
                      const res = await fetch('/api/admin/ia-config', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tavily_keys: novas }),
                      })
                      setTavilySaving(false)
                      if (res.ok) { setTavilyKeys(novas); setNovaKeyTavily(''); toast.success('Key adicionada!') }
                      else toast.error('Erro ao salvar key')
                    }}
                    className="px-3 py-2 rounded-lg bg-nodri-cyan text-black text-[11px] font-bold hover:brightness-110 disabled:opacity-40 flex-shrink-0"
                  >
                    {tavilySaving ? '...' : '+ Adicionar'}
                  </button>
                </div>
                <a href="https://tavily.com" target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-nodri-cyan hover:underline mt-2 block">Criar conta gratuita no Tavily →</a>
              </div>
            </div>
          )}

          {activeSection === 'config' && (
            <div className="space-y-4 max-w-xl">
              <div className="nodri-card p-5">
                <div className="font-syne font-bold text-[13px] text-nodri-cyan mb-4 flex items-center gap-1.5"><Settings size={14} /> Configurações do Sistema</div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1 block">WhatsApp de Suporte</label>
                    <input defaultValue="5561982195214" className="nodri-input w-full" placeholder="Ex: 5561999999999" />
                  </div>
                  <div>
                    <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1 block">Email de Contato</label>
                    <input defaultValue="nodriestiloebeleza@gmail.com" className="nodri-input w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1 block">% Comissão Padrão Afiliados</label>
                    <input type="number" defaultValue={40} min={1} max={100} className="nodri-input w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1 block">Link de Download do Programa</label>
                    <input defaultValue={process.env.NEXT_PUBLIC_LINK_DOWNLOAD || ''} placeholder="https://..." className="nodri-input w-full" />
                  </div>
                  <button onClick={() => toast.success('Configurações salvas!')} className="bg-nodri-cyan text-black font-bold px-5 py-2.5 rounded-lg text-[12px] hover:brightness-110">
                    Salvar Configurações
                  </button>
                </div>
              </div>

              {/* PROGRAMA COMPLEMENTAR */}
              <div className="nodri-card p-5">
                <div className="font-syne font-bold text-[13px] text-nodri-cyan mb-1 flex items-center gap-1.5"><Settings size={14} /> Programa Complementar</div>
                <p className="text-[10px] text-nodri-t3 mb-4">Configure o botão de download exibido para todos os salões na tela principal.</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1 block">Link — Baixar Programa Complementar</label>
                    <input value={configPrograma.link} onChange={e => setConfigPrograma(p => ({ ...p, link: e.target.value }))}
                      placeholder="https://..." className="nodri-input w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-1 block">Link — Baixar Atualização (quando disponibilizada)</label>
                    <input value={configPrograma.link_atualizacao} onChange={e => setConfigPrograma(p => ({ ...p, link_atualizacao: e.target.value }))}
                      placeholder="https://..." className="nodri-input w-full" />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={async () => {
                        const novoEstado = !configPrograma.atualizacao_ativa
                        setSavingPrograma(true)
                        const nova = { ...configPrograma, atualizacao_ativa: novoEstado }
                        await fetch('/api/config/programa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nova) })
                        setConfigPrograma(nova)
                        setSavingPrograma(false)
                        toast.success(novoEstado ? 'Atualização disponibilizada para todos os salões!' : 'Botão voltou ao modo normal')
                      }}
                      disabled={savingPrograma}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold transition-all ${configPrograma.atualizacao_ativa ? 'bg-green-500/15 border border-green-500/40 text-green-700 hover:bg-green-500/25' : 'bg-nodri-surface border border-nodri-border text-nodri-t2 hover:border-nodri-cyan/40 hover:text-nodri-cyan'}`}>
                      {configPrograma.atualizacao_ativa ? <><Zap size={12} /> Atualização ATIVA — Clique para desativar</> : <><RefreshCw size={12} /> Disponibilizar Atualização do Sistema</>}
                    </button>
                    <button
                      onClick={async () => {
                        setSavingPrograma(true)
                        try {
                          const res = await fetch('/api/config/programa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(configPrograma) })
                          const text = await res.text()
                          const data = text ? JSON.parse(text) : {}
                          if (!res.ok) { toast.error('Erro ao salvar: ' + (data.error || res.status)) }
                          else { toast.success('Links salvos!') }
                        } catch (e: any) {
                          toast.error('Erro: ' + e.message)
                        }
                        setSavingPrograma(false)
                      }}
                      disabled={savingPrograma}
                      className="bg-nodri-cyan text-black font-bold px-4 py-2 rounded-lg text-[11px] hover:brightness-110 disabled:opacity-50">
                      {savingPrograma ? 'Salvando...' : 'Salvar Links'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* DASHBOARD */}
          {/* Cards de estatistica + Central de Notificacoes: SO no Dashboard.
              Antes a condicao era uma lista de exclusoes, e toda secao nova
              nascia herdando esses blocos por esquecimento - foi o que fez
              Programas, Academia e IA aparecerem com os cards de saloes e
              licencas embaixo do proprio conteudo. Invertido: agora precisa
              dizer explicitamente que quer. */}
          {/* Cada bloco decide sozinho onde aparece — antes um unico `if`
              mandava nos tres, e por isso Saloes vinha com os cards e a
              Central junto, e Notificacoes vinha com os cards. */}
          {(activeSection === 'saloes' || activeSection === 'notifs') && (
            <>
              {/* Cards de estatistica: fora de Saloes e de Notificacoes */}
              {false && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Salões cadastrados', value: saloes.length, change: 'total' },
                  { label: 'Licenças ativas', value: saloes.filter(s => s.status === 'ativo').length, change: 'ativas agora' },
                  { label: 'Receita mensal', value: `R$${saloes.filter(s => s.status === 'ativo' && s.plano).reduce((acc, s) => acc + (s.plano?.preco || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, change: 'planos ativos' },
                  { label: 'Total de módulos', value: localModulos.length, change: 'disponíveis' },
                ].map(s => (
                  <div key={s.label} className="nodri-card p-3">
                    <div className="text-[9.5px] text-nodri-t3 uppercase tracking-widest mb-1">{s.label}</div>
                    <div className="font-syne font-bold text-lg">{s.value}</div>
                    <div className="text-[10px] mt-1 text-nodri-green">{s.change}</div>
                  </div>
                ))}
              </div>}

              {/* NOTIFICAÇÕES — só na própria seção */}
              {activeSection === 'notifs' && <div className="nodri-card p-4 mb-5">
                <div className="flex items-center gap-2 font-syne font-bold text-[12px] mb-3">
                  <Bell size={14} className="text-nodri-cyan" />
                  <span>Central de Notificações</span>
                  {localNotifs.filter(n => !n.lida).length > 0 && <span className="bg-nodri-red text-gray-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{localNotifs.filter(n => !n.lida).length}</span>}
                </div>

                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {localNotifs.length === 0 && <p className="text-[11px] text-nodri-t3 text-center py-2">Nenhuma notificação</p>}
                  {localNotifs.slice(0, 8).map(n => {
                    const isCompra = n.metadata?.tipo === 'compra'
                    return (
                      <div key={n.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border group hover:border-nodri-cyan/20 transition-all ${isCompra ? 'bg-nodri-green/5 border-nodri-green/20' : 'bg-nodri-surface border-nodri-border'}`}>
                        <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${isCompra ? 'bg-nodri-green' : TIPO_COLOR[n.tipo]}`} />
                        {editNotif?.id === n.id ? (
                          <div className="flex-1 flex gap-2">
                            <input value={editNotifMsg} onChange={e => setEditNotifMsg(e.target.value)}
                              className="flex-1 bg-nodri-card border border-nodri-cyan/40 rounded-md px-2 py-1 text-[11px] text-nodri-t1 outline-none"
                              onKeyDown={e => e.key === 'Enter' && saveEditNotif()} />
                            <button onClick={saveEditNotif} disabled={savingNotif} className="flex items-center gap-1 px-2 py-1 bg-nodri-cyan text-black text-[10px] font-bold rounded-md">
                              {savingNotif ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                            </button>
                            <button onClick={() => setEditNotif(null)} className="px-2 py-1 border border-nodri-border text-nodri-t3 text-[10px] rounded-md hover:text-nodri-t1">
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="text-[11px] flex-1 text-nodri-t1">
                              {n.mensagem}
                              {isCompra && (
                                <button onClick={() => setSelectedCompra(n.metadata ?? null)}
                                  className="ml-2 text-nodri-cyan text-[10px] hover:underline font-semibold">
                                  Ver Dados →
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-nodri-t3 shrink-0">{new Date(n.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button onClick={() => handleEditNotif(n)} className="w-6 h-6 flex items-center justify-center text-nodri-t3 hover:text-nodri-cyan transition-colors" title="Editar"><Edit size={10} /></button>
                              <button onClick={() => deleteNotif(n.id)} disabled={deletingNotif === n.id} className="w-6 h-6 flex items-center justify-center text-nodri-t3 hover:text-nodri-red transition-colors" title="Excluir">
                                {deletingNotif === n.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="border-t border-nodri-border pt-3">
                  <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-2 font-medium">Enviar Notificação</div>
                  <div className="relative mb-2" ref={dropdownRef}>
                    <button onClick={() => setShowDestinatarios(!showDestinatarios)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-nodri-card border border-nodri-border rounded-lg text-[11px] hover:border-nodri-cyan/30 transition-all">
                      <span className={notifDestinatarios.length === 0 ? 'text-nodri-t3' : 'text-nodri-t1'}>{notifDestinatarios.length === 0 ? 'Todos os salões' : `${notifDestinatarios.length} salão(ões) selecionado(s)`}</span>
                      <ChevronDown size={12} className={`text-nodri-t3 transition-transform ${showDestinatarios ? 'rotate-180' : ''}`} />
                    </button>
                    {showDestinatarios && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-nodri-card border border-nodri-border rounded-xl shadow-2xl z-50 py-1 max-h-48 overflow-y-auto">
                        <div onClick={() => { setNotifDestinatarios([]); setShowDestinatarios(false) }}
                          className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-nodri-surface transition-colors ${notifDestinatarios.length === 0 ? 'text-nodri-cyan' : 'text-nodri-t2'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${notifDestinatarios.length === 0 ? 'bg-nodri-cyan border-nodri-cyan' : 'border-nodri-border'}`}>{notifDestinatarios.length === 0 && <Check size={10} className="text-black" />}</div>
                          <span className="text-[11.5px] font-medium">Todos os salões</span>
                        </div>
                        {saloes.map(s => (
                          <div key={s.id} onClick={() => toggleDestinatario(s.id)} className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-nodri-surface transition-colors">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${notifDestinatarios.includes(s.id) ? 'bg-nodri-cyan border-nodri-cyan' : 'border-nodri-border'}`}>{notifDestinatarios.includes(s.id) && <Check size={10} className="text-black" />}</div>
                            <div><div className="text-[11.5px] text-nodri-t1">{s.nome}</div><div className="text-[10px] text-nodri-t3">{s.email}</div></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select value={notifTipo} onChange={e => setNotifTipo(e.target.value as any)} className="nodri-input w-28 text-[11px] shrink-0">
                      <option value="info">Info</option>
                      <option value="success">Sucesso</option>
                      <option value="warning">Aviso</option>
                      <option value="danger">Urgente</option>
                    </select>
                    <input type="text" value={notifMsg} onChange={e => setNotifMsg(e.target.value)}
                      placeholder="Ex: Boa tarde, teve atualização do whats app..."
                      className="nodri-input flex-1 text-[11px]"
                      onKeyDown={e => e.key === 'Enter' && sendNotification()} />
                    <button onClick={sendNotification} disabled={sending || !notifMsg.trim()}
                      className="flex items-center gap-1.5 bg-nodri-cyan text-black text-[11px] font-bold px-3 py-1.5 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all shrink-0">
                      {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Enviar
                    </button>
                  </div>
                </div>
              </div>}

              {/* TABELA SALÕES — só na própria seção */}
              {activeSection === 'saloes' && <div>
                <h2 className="font-syne font-bold text-[12.5px] mb-3">Salões Cadastrados</h2>
                <div className="nodri-card overflow-hidden">
                  <table className="w-full text-[11.5px]">
                    <thead>
                      <tr className="border-b border-nodri-border">
                        {['Salão', 'Plano', 'Status', 'Vencimento / Trial', 'Módulos', 'Ações'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] text-nodri-t3 uppercase tracking-wider font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {saloes.map(salao => (
                        <tr key={salao.id} className="border-b border-nodri-border/50 hover:bg-white/[0.01] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-gray-900 shrink-0" style={{ background: 'linear-gradient(135deg, #5b4fcf, #f43f8e)' }}>{salao.nome[0]}</div>
                              <div><div className="font-medium text-nodri-t1">{salao.nome}</div><div className="text-[10px] text-nodri-t2">{salao.email}</div></div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PLANO_CLASS[(salao as any).plano?.slug || 'basico']}`}>{(salao as any).plano?.nome || 'Básico'}</span></td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_CLASS[salao.status]}`}>{salao.status}</span></td>
                          <td className="px-4 py-3 text-[11px]">{salao.status === 'trial' ? getTrialStatus(salao.criado_em) : <span className="text-nodri-t2">{salao.licenca_vencimento ? new Date(salao.licenca_vencimento).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—'}</span>}</td>
                          <td className="px-4 py-3">
                            {(() => {
                              const n = contarModulos(salao)
                              const total = MODULOS_NODRI.length
                              const cor = n === 0 ? 'text-nodri-red' : n === total ? 'text-nodri-green' : 'text-nodri-amber'
                              return <span className={`font-semibold ${cor}`}>{n}<span className="text-nodri-t3 font-normal">/{total}</span></span>
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              <button onClick={() => openEditSalao(salao)} className="p-1.5 rounded-md border border-nodri-purple/40 text-nodri-purple bg-nodri-purple/7 hover:bg-nodri-purple/15 transition-all" title="Editar"><Edit size={11} /></button>
                              <button onClick={() => openModCtrl(salao)} className="flex items-center gap-1 px-2 py-1 rounded-md border border-nodri-cyan/35 text-nodri-cyan bg-nodri-cyan/7 text-[10px] font-semibold hover:bg-nodri-cyan/15 transition-all"><Puzzle size={10} /> Módulos</button>
                              <button onClick={() => { setAssinSalao(salao); setAssinPlano(''); setAssinLink(''); setAssinMsg('') }} className="flex items-center gap-1 px-2 py-1 rounded-md border border-nodri-green/35 text-nodri-green bg-nodri-green/7 text-[10px] font-semibold hover:bg-nodri-green/15 transition-all" title="Assinatura recorrente"><CreditCard size={10} /> Assinatura</button>
                              <button onClick={() => acessarComoCliente(salao)} className="flex items-center gap-1 px-2 py-1 rounded-md border border-nodri-amber/35 text-nodri-amber bg-nodri-amber/7 text-[10px] font-semibold hover:bg-nodri-amber/15 transition-all" title="Acessar como este cliente"><LogIn size={10} /> Acessar</button>
                              <button onClick={() => toggleBloqueio(salao)}
                                className={`p-1.5 rounded-md border transition-all ${salao.status === 'bloqueado' ? 'border-nodri-green/35 text-nodri-green bg-nodri-green/7 hover:bg-nodri-green/15' : 'border-nodri-red/35 text-nodri-red bg-nodri-red/7 hover:bg-nodri-red/15'}`}
                                title={salao.status === 'bloqueado' ? 'Desbloquear' : 'Bloquear'}>
                                {salao.status === 'bloqueado' ? <Unlock size={11} /> : <Lock size={11} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {saloes.length === 0 && <div className="text-center py-12 text-nodri-t3 text-sm">Nenhum salão cadastrado ainda</div>}
                </div>
              </div>}
            </>
          )}
        </div>
      </main>

      {/* MODAL COMPRA DETALHE */}
      {selectedCompra && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="nodri-card w-full max-w-md p-4 sm:p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div className="font-syne font-bold text-[14px] flex items-center gap-2">
                <ShoppingBag size={16} /> Dados da Compra
              </div>
              <button onClick={() => setSelectedCompra(null)} className="text-nodri-t3 hover:text-nodri-t1"><X size={16} /></button>
            </div>

            <div className="bg-nodri-green/8 border border-nodri-green/20 rounded-lg p-3 mb-4">
              <div className="text-[10px] text-nodri-t3 mb-1 uppercase tracking-wider">Plano comprado</div>
              <div className="font-bold text-[16px] text-nodri-green">{selectedCompra.plano}</div>
              <div className="text-[12px] text-nodri-t2 mt-0.5">
                {selectedCompra.desconto_percentual > 0
                  ? `R$${selectedCompra.preco_final}/mês (${selectedCompra.desconto_percentual}% desc. — cupom: ${selectedCompra.cupom})`
                  : `R$${selectedCompra.preco_final}/mês`}
              </div>
            </div>

            <div className="space-y-0 divide-y divide-nodri-border/50">
              {[
                { label: 'Nome do Salão', value: selectedCompra.nome_salao },
                { label: 'Responsável', value: selectedCompra.responsavel },
                { label: 'Cidade', value: selectedCompra.cidade },
                { label: 'Email', value: selectedCompra.email },
                { label: 'Telefone', value: selectedCompra.telefone },
                { label: 'Dia de Vencimento', value: selectedCompra.dia_vencimento ? `Todo dia ${selectedCompra.dia_vencimento}` : '—' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2.5">
                  <span className="text-[11px] text-nodri-t3">{item.label}</span>
                  <span className="text-[12px] font-medium text-nodri-t1">{item.value || '—'}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  const txt = `Salão: ${selectedCompra.nome_salao}\nResponsável: ${selectedCompra.responsavel}\nCidade: ${selectedCompra.cidade}\nEmail: ${selectedCompra.email}\nTelefone: ${selectedCompra.telefone}\nVencimento: Todo dia ${selectedCompra.dia_vencimento}\nPlano: ${selectedCompra.plano} — R$${selectedCompra.preco_final}/mês`
                  navigator.clipboard.writeText(txt)
                  toast.success('Dados copiados!')
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-nodri-border text-nodri-t2 rounded-lg text-[12px] hover:text-nodri-t1 hover:border-nodri-cyan/30 transition-all">
                <ClipboardList size={13} className="inline mr-1" /> Copiar Dados
              </button>
              <button
                onClick={() => {
                  setFormSalao(prev => ({
                    ...prev,
                    nome: selectedCompra.nome_salao || '',
                    responsavel: selectedCompra.responsavel || '',
                    email: selectedCompra.email || '',
                    telefone: selectedCompra.telefone || '',
                  }))
                  setSelectedCompra(null)
                  setShowNovoSalao(true)
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-nodri-cyan text-black rounded-lg text-[12px] font-bold hover:brightness-110 transition-all">
                <Plus size={13} /> Cadastrar Salão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO/EDITAR PLANO */}
      {showNovoPlano && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="nodri-card w-full max-w-md p-4 sm:p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div className="font-syne font-bold text-[14px] flex items-center gap-2"><CreditCard size={16} className="text-nodri-cyan" /> {editPlano ? 'Editar Plano' : 'Novo Plano'}</div>
              <button onClick={() => { setShowNovoPlano(false); setEditPlano(null) }} className="text-nodri-t3 hover:text-nodri-t1"><X size={16} /></button>
            </div>
            <form onSubmit={handleSavePlano} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="nodri-label block mb-1">Nome *</label><input className="nodri-input" placeholder="Ex: Premium" value={planoForm.nome} onChange={e => setPlanoForm(p => ({...p, nome: e.target.value}))} /></div>
                <div><label className="nodri-label block mb-1">Slug *</label><input className="nodri-input" placeholder="Ex: premium" value={planoForm.slug} onChange={e => setPlanoForm(p => ({...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')}))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="nodri-label block mb-1">Preço (R$) *</label><input type="number" step="0.01" className="nodri-input" placeholder="197.00" value={planoForm.preco} onChange={e => setPlanoForm(p => ({...p, preco: e.target.value}))} /></div>
                <div><label className="nodri-label block mb-1">Máx. Usuários</label><input type="number" className="nodri-input" placeholder="1" value={planoForm.max_usuarios} onChange={e => setPlanoForm(p => ({...p, max_usuarios: e.target.value}))} /></div>
              </div>
              <div><label className="nodri-label block mb-1">Descrição</label><textarea className="nodri-input resize-none h-16" placeholder="Descreva o plano..." value={planoForm.descricao} onChange={e => setPlanoForm(p => ({...p, descricao: e.target.value}))} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowNovoPlano(false); setEditPlano(null) }} className="nodri-btn-ghost text-[12px]">Cancelar</button>
                <button type="submit" disabled={savingPlano} className="nodri-btn-primary text-[12px] flex items-center gap-2">
                  {savingPlano ? <><Loader2 size={13} className="animate-spin" /> Salvando...</> : <><Save size={13} /> {editPlano ? 'Salvar Alterações' : 'Criar Plano'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO SALÃO */}
      {showNovoSalao && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="nodri-card w-full max-w-lg p-4 sm:p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div className="font-syne font-bold text-[14px] flex items-center gap-2"><Building size={16} className="text-nodri-cyan" /> Cadastrar Novo Salão</div>
              <button onClick={() => setShowNovoSalao(false)} className="text-nodri-t3 hover:text-nodri-t1"><X size={16} /></button>
            </div>
            <form onSubmit={handleCadastrarSalao} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="nodri-label block mb-1">Nome do Salão *</label><input className="nodri-input" placeholder="Ex: Salão Bella" value={formSalao.nome} onChange={e => setFormSalao(p => ({...p, nome: e.target.value}))} /></div>
                <div><label className="nodri-label block mb-1">Responsável</label><input className="nodri-input" placeholder="Nome do dono" value={formSalao.responsavel} onChange={e => setFormSalao(p => ({...p, responsavel: e.target.value}))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="nodri-label block mb-1">Email *</label><input type="email" className="nodri-input" placeholder="email@salao.com" value={formSalao.email} onChange={e => setFormSalao(p => ({...p, email: e.target.value}))} /></div>
                <div><label className="nodri-label block mb-1">Telefone</label><input className="nodri-input" placeholder="(11) 99999-9999" value={formSalao.telefone} onChange={e => setFormSalao(p => ({...p, telefone: e.target.value}))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="nodri-label block mb-1">Plano</label>
                  <select className="nodri-input" value={formSalao.plano_id} onChange={e => setFormSalao(p => ({...p, plano_id: e.target.value}))}>
                    <option value="">Selecionar plano</option>
                    {planos.map(p => <option key={p.id} value={p.id}>{p.nome} — R${p.preco}/mês</option>)}
                  </select>
                </div>
                <div><label className="nodri-label block mb-1">Vencimento</label><input type="date" className="nodri-input" value={formSalao.licenca_vencimento} onChange={e => setFormSalao(p => ({...p, licenca_vencimento: e.target.value}))} /></div>
              </div>
              <div><label className="nodri-label block mb-1">Senha de Acesso *</label><input type="password" className="nodri-input" placeholder="Senha do cliente" value={formSalao.senha_acesso} onChange={e => setFormSalao(p => ({...p, senha_acesso: e.target.value}))} /></div>
              <div><label className="nodri-label block mb-1">Observações</label><textarea className="nodri-input resize-none h-16" placeholder="Notas internas..." value={formSalao.observacoes} onChange={e => setFormSalao(p => ({...p, observacoes: e.target.value}))} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNovoSalao(false)} className="nodri-btn-ghost text-[12px]">Cancelar</button>
                <button type="submit" disabled={savingSalao} className="nodri-btn-primary text-[12px] flex items-center gap-2">
                  {savingSalao ? <><Loader2 size={13} className="animate-spin" /> Salvando...</> : <><Plus size={13} /> Cadastrar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR SALÃO */}
      {editSalao && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="nodri-card w-full max-w-lg animate-slide-up overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-nodri-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[14px] font-bold text-gray-900" style={{ background: 'linear-gradient(135deg, #5b4fcf, #f43f8e)' }}>{editSalao.nome[0]}</div>
                <div><div className="font-syne font-bold text-[13px]">{editSalao.nome}</div><div className="text-[10px] text-nodri-t3">{editSalao.email}</div></div>
              </div>
              <button onClick={() => setEditSalao(null)} className="text-nodri-t3 hover:text-nodri-t1"><X size={16} /></button>
            </div>
            <div className="flex border-b border-nodri-border">
              {[{ id: 'dados', label: 'Dados', icon: <ClipboardList size={12} className="inline mr-1" /> }, { id: 'acesso', label: 'Acesso', icon: <Key size={12} className="inline mr-1" /> }, { id: 'perigo', label: 'Perigo', icon: <AlertCircle size={12} className="inline mr-1" /> }].map(t => (
                <button key={t.id} onClick={() => setEditTab(t.id as any)}
                  className={`flex-1 py-2.5 text-[11.5px] font-medium border-b-2 transition-all ${editTab === t.id ? 'border-nodri-cyan text-nodri-cyan' : 'border-transparent text-nodri-t2 hover:text-nodri-t1'}`}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
            <form onSubmit={saveEditSalao}>
              <div className="p-5 space-y-3 max-h-96 overflow-y-auto">
                {editTab === 'dados' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="nodri-label block mb-1">Nome do Salão</label><input className="nodri-input" value={editForm.nome} onChange={e => setEditForm(p => ({...p, nome: e.target.value}))} /></div>
                      <div><label className="nodri-label block mb-1">Responsável</label><input className="nodri-input" value={editForm.responsavel} onChange={e => setEditForm(p => ({...p, responsavel: e.target.value}))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="nodri-label block mb-1">Email</label><input type="email" className="nodri-input" value={editForm.email} onChange={e => setEditForm(p => ({...p, email: e.target.value}))} /></div>
                      <div><label className="nodri-label block mb-1">Telefone</label><input className="nodri-input" value={editForm.telefone} onChange={e => setEditForm(p => ({...p, telefone: e.target.value}))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="nodri-label block mb-1">Plano</label>
                        <select className="nodri-input" value={editForm.plano_id} onChange={e => setEditForm(p => ({...p, plano_id: e.target.value}))}>
                          <option value="">Sem plano</option>
                          {planos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                      </div>
                      <div><label className="nodri-label block mb-1">Vencimento</label><input type="date" className="nodri-input" value={editForm.licenca_vencimento} onChange={e => setEditForm(p => ({...p, licenca_vencimento: e.target.value}))} /></div>
                    </div>
                    <div><label className="nodri-label block mb-1">Status</label>
                      <select className="nodri-input" value={editForm.status} onChange={e => setEditForm(p => ({...p, status: e.target.value}))}>
                        <option value="ativo">Ativo</option>
                        <option value="bloqueado">Bloqueado</option>
                        <option value="vencido">Vencido</option>
                        <option value="trial">Trial</option>
                      </select>
                    </div>
                    <div><label className="nodri-label block mb-1">Observações</label><textarea className="nodri-input resize-none h-16" value={editForm.observacoes} onChange={e => setEditForm(p => ({...p, observacoes: e.target.value}))} /></div>
                    {/* Toggle IA */}
                    <div className="flex items-center justify-between p-3 bg-nodri-surface rounded-xl border border-nodri-border">
                      <div>
                        <div className="text-[12px] font-semibold text-nodri-t1 flex items-center gap-1"><Bot size={12} /> IA NODRI</div>
                        <div className="text-[10px] text-nodri-t3">Liberar acesso à IA para este salão</div>
                      </div>
                      <button type="button" onClick={() => toggleIA(editSalao)}
                        className={`w-10 h-5 rounded-full relative transition-all ${editSalao.ia_ativa ? 'bg-nodri-cyan' : 'bg-nodri-border'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${editSalao.ia_ativa ? 'left-5' : 'left-0.5'}`}/>
                      </button>
                    </div>
                  </>
                )}
                {editTab === 'acesso' && (
                  <>
                    <div className="nodri-card p-3 bg-nodri-surface mb-2">
                      <div className="text-[11px] text-nodri-t2 mb-1">Email de acesso atual:</div>
                      <div className="font-medium text-nodri-t1 text-[12px]">{editSalao.email}</div>
                    </div>
                    <div>
                      <label className="nodri-label block mb-1">Nova Senha (deixe em branco para manter)</label>
                      <div className="relative">
                        <input type={showNovaSenha ? 'text' : 'password'} className="nodri-input pr-10"
                          placeholder="Digite nova senha..." value={editForm.nova_senha}
                          onChange={e => setEditForm(p => ({...p, nova_senha: e.target.value}))} />
                        <button type="button" onClick={() => setShowNovaSenha(!showNovaSenha)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-nodri-t3 hover:text-nodri-t2 transition-colors">
                          {showNovaSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="nodri-card p-3 border-nodri-amber/30 bg-nodri-amber/5">
                      <div className="text-[11px] text-nodri-amber flex items-center gap-2">
                        <AlertTriangle size={13} /> Após alterar a senha, o cliente precisará usar a nova senha no próximo login.
                      </div>
                    </div>
                  </>
                )}
                {editTab === 'perigo' && (
                  <div className="space-y-3">
                    <div className="nodri-card p-4 border-nodri-amber/30">
                      <div className="font-syne font-bold text-[12px] mb-1 flex items-center gap-2">
                        {editSalao.status === 'bloqueado' ? <Unlock size={13} className="text-nodri-green" /> : <Lock size={13} className="text-nodri-amber" />}
                        {editSalao.status === 'bloqueado' ? 'Desbloquear Salão' : 'Bloquear Salão'}
                      </div>
                      <p className="text-[11px] text-nodri-t2 mb-3">{editSalao.status === 'bloqueado' ? 'O salão está bloqueado. Clique para reativar o acesso.' : 'Bloquear impede o cliente de acessar o sistema. Pode ser desfeito.'}</p>
                      <button type="button" onClick={() => toggleBloqueio(editSalao)}
                        className={`px-4 py-2 rounded-lg text-[11.5px] font-bold transition-all ${editSalao.status === 'bloqueado' ? 'bg-nodri-green text-black hover:brightness-110' : 'border border-nodri-amber text-nodri-amber hover:bg-nodri-amber/10'}`}>
                        {editSalao.status === 'bloqueado' ? <><CheckCircle size={12} className="inline mr-1" /> Desbloquear Salão</> : <><Lock size={12} className="inline mr-1" /> Bloquear Salão</>}
                      </button>
                    </div>
                    <div className="nodri-card p-4 border-nodri-red/30 bg-nodri-red/3">
                      <div className="font-syne font-bold text-[12px] mb-1 flex items-center gap-2 text-nodri-red"><Trash2 size={13} /> Excluir Salão Permanentemente</div>
                      <p className="text-[11px] text-nodri-t2 mb-3">Esta ação é irreversível. Todos os dados do salão serão apagados.</p>
                      {!showDeleteConfirm ? (
                        <button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11.5px] font-bold border border-nodri-red text-nodri-red hover:bg-nodri-red/10 transition-all"><Trash2 size={12} /> Excluir este salão</button>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] text-nodri-red">Digite o nome do salão para confirmar: <strong>{editSalao.nome}</strong></p>
                          <input className="nodri-input border-nodri-red/50 text-[11px]" placeholder={`Digite "${editSalao.nome}" para confirmar`} value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }} className="nodri-btn-ghost text-[11px]">Cancelar</button>
                            <button type="button" onClick={deleteSalao} disabled={deletingSalao || deleteConfirmText !== editSalao.nome}
                              className="flex items-center gap-1.5 bg-nodri-red text-gray-900 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:brightness-110 disabled:opacity-40 transition-all">
                              {deletingSalao ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Excluir Definitivamente
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {editTab !== 'perigo' && (
                <div className="flex justify-end gap-2 px-5 py-3 border-t border-nodri-border">
                  <button type="button" onClick={() => setEditSalao(null)} className="nodri-btn-ghost text-[12px]">Cancelar</button>
                  <button type="submit" disabled={savingEdit} className="nodri-btn-primary text-[12px] flex items-center gap-2">
                    {savingEdit ? <><Loader2 size={13} className="animate-spin" /> Salvando...</> : <><Save size={13} /> Salvar Alterações</>}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVO/EDITAR MÓDULO */}
      {showNovoModulo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="nodri-card w-full max-w-lg p-4 sm:p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div className="font-syne font-bold text-[14px] flex items-center gap-2"><Puzzle size={16} className="text-nodri-cyan" /> {editModulo ? 'Editar Módulo' : 'Novo Módulo'}</div>
              <button onClick={() => { setShowNovoModulo(false); setEditModulo(null) }} className="text-nodri-t3 hover:text-nodri-t1"><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveModulo} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="nodri-label block mb-1">Nome *</label><input className="nodri-input" placeholder="Ex: Confirmar Agendamento" value={moduloForm.nome} onChange={e => setModuloForm(p => ({...p, nome: e.target.value}))} /></div>
                <div><label className="nodri-label block mb-1">Slug *</label><input className="nodri-input" placeholder="Ex: confirmacao_agendamento" value={moduloForm.slug} onChange={e => setModuloForm(p => ({...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '_')}))} /></div>
              </div>
              <div><label className="nodri-label block mb-1">Descrição</label><textarea className="nodri-input resize-none h-16" placeholder="Descreva o que o módulo faz..." value={moduloForm.descricao} onChange={e => setModuloForm(p => ({...p, descricao: e.target.value}))} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="nodri-label block mb-1">Versão</label><input className="nodri-input" placeholder="1.0.0" value={moduloForm.versao} onChange={e => setModuloForm(p => ({...p, versao: e.target.value}))} /></div>
                <div><label className="nodri-label block mb-1">Ícone (emoji)</label><input className="nodri-input text-center text-[18px]" placeholder="" value={moduloForm.icone} onChange={e => setModuloForm(p => ({...p, icone: e.target.value}))} /></div>
                <div><label className="nodri-label block mb-1">Ordem</label><input type="number" min="0" className="nodri-input" placeholder="0" value={moduloForm.ordem} onChange={e => setModuloForm(p => ({...p, ordem: e.target.value}))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="nodri-label block mb-1">Categoria</label><input className="nodri-input" placeholder="Ex: Comunicação" value={moduloForm.categoria} onChange={e => setModuloForm(p => ({...p, categoria: e.target.value}))} /></div>
                <div><label className="nodri-label block mb-1">Classe de Cor</label><input className="nodri-input" placeholder="Ex: text-nodri-cyan" value={moduloForm.cor_classe} onChange={e => setModuloForm(p => ({...p, cor_classe: e.target.value}))} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowNovoModulo(false); setEditModulo(null) }} className="nodri-btn-ghost text-[12px]">Cancelar</button>
                <button type="submit" disabled={savingModulo} className="nodri-btn-primary text-[12px] flex items-center gap-2">
                  {savingModulo ? <><Loader2 size={13} className="animate-spin" /> Salvando...</> : <><Save size={13} /> {editModulo ? 'Salvar Alterações' : 'Criar Módulo'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ASSINATURA */}
      {assinSalao && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-5 bg-nodri-card rounded-xl shadow-2xl border border-nodri-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-syne font-bold text-[13px] flex items-center gap-2"><CreditCard size={14} className="text-nodri-green" /><span className="text-nodri-t1">Assinatura recorrente</span></div>
                <div className="text-[10px] text-nodri-green mt-0.5">{assinSalao.nome}</div>
              </div>
              <button onClick={() => setAssinSalao(null)} className="text-nodri-t3 hover:text-nodri-t1"><X size={16} /></button>
            </div>

            <div className="text-[11px] text-nodri-t2 leading-relaxed mb-3">
              {(assinSalao as any).asaas_subscription_id
                ? <>Assinatura ativa no Asaas — situação <b>{(assinSalao as any).asaas_status || '—'}</b>.</>
                : <>Este salão ainda paga pelo modelo antigo, por data de vencimento. Gere o link e envie para ele cadastrar o cartão.</>}
            </div>

            {/* O cartão é digitado pelo dono do salão no ambiente do Asaas.
                Não existe migração automática: o que dá para automatizar é
                gerar o link; o resto depende de um clique dele. */}
            <label className="text-[10px] font-bold text-nodri-t3 uppercase tracking-wider block mb-1.5">Plano</label>
            <select value={assinPlano} onChange={e => setAssinPlano(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-nodri-surface border border-nodri-border text-[12px] text-nodri-t1 mb-3">
              <option value="">Manter o plano atual do salão</option>
              {planos.map((p: any) => (
                <option key={p.id} value={p.slug}>{p.nome} — R$ {p.preco}/mês</option>
              ))}
            </select>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => acaoAssinatura('link')} disabled={assinBusy}
                className="px-3 py-2 rounded-lg bg-nodri-green text-white text-[11px] font-bold disabled:opacity-50">
                {assinBusy ? 'Aguarde…' : 'Gerar link de assinatura'}
              </button>
              {(assinSalao as any).asaas_subscription_id && (
                <>
                  <button onClick={() => acaoAssinatura('trocar')} disabled={assinBusy || !assinPlano}
                    className="px-3 py-2 rounded-lg border border-nodri-border text-nodri-t2 text-[11px] font-bold disabled:opacity-40">
                    Trocar de plano
                  </button>
                  <button onClick={() => acaoAssinatura('cancelar')} disabled={assinBusy}
                    className="px-3 py-2 rounded-lg border border-nodri-red/40 text-nodri-red text-[11px] font-bold disabled:opacity-50">
                    Cancelar assinatura
                  </button>
                </>
              )}
            </div>

            {assinMsg && <div className="mt-3 text-[11px] text-nodri-t1">{assinMsg}</div>}
            {assinLink && (
              <div className="mt-2 p-2.5 rounded-lg bg-nodri-surface border border-nodri-border">
                <div className="text-[10px] text-nodri-t3 mb-1">Envie este link para o salão:</div>
                <div className="text-[11px] text-nodri-cyan break-all">{assinLink}</div>
                <button onClick={() => { navigator.clipboard.writeText(assinLink); toast.success('Link copiado') }}
                  className="mt-2 px-2.5 py-1 rounded-md border border-nodri-border text-[10px] text-nodri-t2">Copiar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL MÓDULOS */}
      {modCtrlSalao && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl p-5 bg-nodri-card rounded-xl shadow-2xl animate-slide-up border border-nodri-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-syne font-bold text-[13px] flex items-center gap-2"><Puzzle size={14} className="text-nodri-cyan" /><span className="text-nodri-t1">Controle de Módulos</span></div>
                <div className="text-[10px] text-nodri-cyan mt-0.5">{modCtrlSalao.nome}</div>
              </div>
              <button onClick={() => setModCtrlSalao(null)} className="text-nodri-t3 hover:text-nodri-t1 transition-colors"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {modulosLogicos.map(m => {
                const on = m.ids.every(id => modulosAtivos.has(id))
                const plano = planoMinimoPara(m.chave)
                return (
                  <div key={m.chave} onClick={() => toggleModuloLogico(m.ids)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${on ? 'border-nodri-cyan bg-nodri-cyan/10' : 'border-nodri-border bg-nodri-surface hover:border-nodri-cyan/30'}`}>
                    <div className="flex items-start gap-2">
                      <Settings size={13} className="text-nodri-t3 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10.5px] font-bold uppercase leading-tight text-nodri-t1">{m.rotulo}</div>
                        {plano && <div className="text-[9px] text-nodri-t3 mt-0.5">Plano {plano.nome} · R$ {plano.preco}</div>}
                      </div>
                      <div className={`w-7 h-3.5 rounded-full relative shrink-0 transition-colors ${on ? 'bg-nodri-cyan' : 'bg-nodri-border'}`}>
                        <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${on ? 'left-4' : 'left-0.5'}`} />
                      </div>
                    </div>
                    {/* A Suite são 4 programas numa chave só — dizer quais evita
                        a dúvida de estar ligando "meia Suite". */}
                    {m.ids.length > 1 && (
                      <div className="text-[9px] text-nodri-t3 mt-1.5 leading-snug">{m.nomesNoBanco.join(' · ')}</div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between items-center border-t border-nodri-border pt-3">
              <span className="text-[11px] text-nodri-t1 font-medium">{modulosLogicos.filter(m => m.ids.every(id => modulosAtivos.has(id))).length} de {modulosLogicos.length} módulos ativos</span>
              <div className="flex gap-2">
                <button onClick={() => setModCtrlSalao(null)} className="px-3 py-1.5 rounded-lg border border-nodri-border text-nodri-t2 text-[11px] hover:bg-nodri-surface transition-all">Cancelar</button>
                <button onClick={saveModulos} disabled={savingMods} className="px-3 py-1.5 rounded-lg bg-nodri-cyan text-black text-[11px] font-bold hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-1.5">
                  {savingMods ? <><Loader2 size={12} className="animate-spin" /> Salvando...</> : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

