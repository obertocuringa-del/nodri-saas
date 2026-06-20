'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Search, UserCheck, UserX, Edit2, Trash2, Upload, X, ChevronRight, Users, FileText, Briefcase, Clock, Award, BookOpen, FileSignature, AlertCircle, TrendingUp, Building2, Menu, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

interface Profissional {
  id: string
  nome_completo: string
  apelido?: string
  email?: string
  cpf?: string
  rg?: string
  cnpj?: string
  cargo?: string
  habilidades?: string
  endereco?: string
  data_aniversario?: string
  foto_url?: string
  cor_favorita?: string
  comida_favorita?: string
  animal_favorito?: string
  hobbies?: string
  um_sonho?: string
  contato_responsavel?: string
  certificados?: string
  ativo: boolean
  tem_contrato?: boolean
  perfil_pessoal_completo?: boolean
  dados_pessoais_completo?: boolean
  dados_profissionais_completo?: boolean
  is_departamento?: boolean
  departamento_cor?: string
  pendencias_abertas?: number
  criado_em: string
}

const SIDEBAR_ITEMS = [
  { id: 'cadastrar',    label: 'Cadastrar Profissional',          icon: Plus,           cor: '#5b4fcf', destaque: true },
  { id: 'lista',        label: 'Lista de Profissionais',          icon: Users,          cor: '#06b6d4' },
  { id: 'categorias',   label: 'Gerenciar Categorias',            icon: Award,          cor: '#f59e0b' },
  { id: 'abertura',     label: 'Abertura de Conta Bancária',      icon: Building2,      cor: '#10b981' },
  { id: 'cnpj',         label: 'CNPJ',                            icon: FileText,       cor: '#f59e0b' },
  { id: 'entrevista',   label: 'Ficha para Entrevista',           icon: Briefcase,      cor: '#3b82f6' },
  { id: 'contratacao',  label: 'Processo de Contratação',         icon: FileSignature,  cor: '#8b5cf6' },
  { id: 'materiais',    label: 'Materiais para Trabalho',         icon: BookOpen,       cor: '#ec4899' },
  { id: 'perfil',       label: 'Perfil Ideal de Profissional',    icon: UserCheck,      cor: '#14b8a6' },
  { id: 'horarios',     label: 'Horários e Folgas',               icon: Clock,          cor: '#f97316' },
  { id: 'distrato',     label: 'Distrato',                        icon: AlertCircle,    cor: '#ef4444' },
  { id: 'contrato',     label: 'Contrato de Trabalho',            icon: FileText,       cor: '#6366f1' },
  { id: 'certificados', label: 'Certificados',                    icon: Award,          cor: '#d946ef' },
  { id: 'carreira',     label: 'Plano de Carreira',               icon: TrendingUp,     cor: '#22c55e' },
]

const CONTEUDO_INFO: Record<string, { titulo: string; texto: string }> = {
  abertura:     { titulo: 'Abertura de Conta Bancária', texto: 'Oriente o profissional a abrir uma conta PJ no banco de sua preferência. Documentos necessários: RG, CPF, comprovante de residência e CNPJ (se MEI). Bancos recomendados: Nubank PJ, Inter PJ, Caixa, Bradesco.' },
  cnpj:         { titulo: 'CNPJ — Microempreendedor Individual', texto: 'Para trabalhar como MEI no salão, o profissional deve ter CNPJ ativo. Acesse gov.br/mei para abrir gratuitamente. O CNPJ MEI permite faturar até R$ 81.000/ano com menos impostos. Guarde o certificado e alvará de funcionamento.' },
  entrevista:   { titulo: 'Ficha para Entrevista', texto: 'Utilize o cadastro de profissional abaixo como guia de entrevista. Avalie: habilidades técnicas, apresentação pessoal, disponibilidade de horários, experiência anterior e referências. Faça perguntas sobre metas e sonhos profissionais.' },
  contratacao:  { titulo: 'Processo de Contratação', texto: 'Etapas: 1. Entrevista inicial → 2. Período de teste (7 dias) → 3. Avaliação técnica → 4. Negociação de comissão → 5. Assinatura de contrato → 6. Cadastro no sistema → 7. Integração com a equipe.' },
  materiais:    { titulo: 'Materiais para Trabalho', texto: 'Lista de materiais que o salão fornece e o que é responsabilidade do profissional. Geralmente o salão fornece: espaço, lavatório, secador base. O profissional traz: tesouras, pentes, produtos específicos de sua linha.' },
  perfil:       { titulo: 'Perfil Ideal de Profissional', texto: 'Buscamos profissionais: ✅ Pontuais e comprometidos ✅ Com cartela de clientes ✅ Que valorizam higiene e organização ✅ Comunicativos e empáticos ✅ Com CNPJ ativo ✅ Abertos a feedback e treinamento contínuo.' },
  horarios:     { titulo: 'Horários e Folgas', texto: 'Defina junto ao profissional: dias de trabalho por semana, horário de entrada e saída, dias fixos de folga, política de ausências e como comunicar faltas. Tudo deve estar no contrato assinado.' },
  distrato:     { titulo: 'Distrato', texto: 'O distrato é o documento que encerra a parceria de forma amigável. Deve conter: data de encerramento, acerto de comissões pendentes, devolução de materiais, cláusula de não-concorrência se aplicável, e assinatura de ambas as partes.' },
  contrato:     { titulo: 'Contrato de Trabalho', texto: 'O contrato de locação de espaço ou parceria deve conter: identificação das partes (salão e profissional), CNPJ de ambos, percentual de comissão, dias e horários de trabalho, responsabilidades, vigência e cláusulas de rescisão.' },
  certificados: { titulo: 'Certificados', texto: 'Solicite cópias dos certificados de cursos concluídos: colorimetria, corte, escova, tratamentos capilares, manicure, podologia, etc. Guarde digitalmente na ficha do profissional. Incentive atualização constante.' },
  carreira:     { titulo: 'Plano de Carreira', texto: 'Estruture crescimento por etapas: 🥉 Júnior (0-1 ano) → 🥈 Pleno (1-3 anos) → 🥇 Sênior (3+ anos) → 🏆 Referência. Defina metas de faturamento, satisfação de clientes e horas de capacitação para evolução em cada nível.' },
}

const FORM_INITIAL = {
  nome_completo: '', apelido: '', email: '', cpf: '', rg: '', cnpj: '', cargo: '',
  habilidades: '', endereco: '', data_aniversario: '', cor_favorita: '', comida_favorita: '',
  animal_favorito: '', hobbies: '', um_sonho: '', contato_responsavel: '', certificados: '', foto_url: '',
}

export default function ProfissionaisPage() {
  const router = useRouter()
  const [secao, setSecao] = useState('lista')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState({ ...FORM_INITIAL })
  const [editando, setEditando] = useState<Profissional | null>(null)
  const [saving, setSaving] = useState(false)
  const [fotoPreview, setFotoPreview] = useState<string>('')
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState(false)
  const [editandoCategoria, setEditandoCategoria] = useState<string | null>(null)
  const [editandoCategoriaValor, setEditandoCategoriaValor] = useState('')
  const [novaCatTexto, setNovaCatTexto] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const CATEGORIAS_PADRAO = ['Cabeleireiro', 'Manicure', 'Pedicure', 'Assistente', 'Massoterapeuta', 'Maquiador(a)', 'Colorista', 'Recepcionista', 'Auxiliar']

  // Categorias existentes dos profissionais cadastrados + padrão (sem duplicatas)
  const categorias = Array.from(new Set([
    ...CATEGORIAS_PADRAO,
    ...profissionais.map(p => p.cargo || '').filter(Boolean)
  ])).sort()

  async function editarCategoria(antiga: string, nova: string) {
    if (!nova.trim() || antiga === nova.trim()) { setEditandoCategoria(null); return }
    const afetados = profissionais.filter(p => p.cargo === antiga)
    await Promise.all(afetados.map(p =>
      fetch(`/api/profissionais/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cargo: nova.trim() }) })
    ))
    toast.success(`Categoria "${antiga}" renomeada para "${nova.trim()}"`)
    setEditandoCategoria(null)
    carregarProfissionais()
  }

  async function excluirCategoria(cat: string) {
    const afetados = profissionais.filter(p => p.cargo === cat)
    if (!confirm(`Remover a categoria "${cat}" de ${afetados.length} profissional(is)?`)) return
    await Promise.all(afetados.map(p =>
      fetch(`/api/profissionais/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cargo: '' }) })
    ))
    toast.success(`Categoria "${cat}" removida`)
    carregarProfissionais()
  }

  useEffect(() => { carregarProfissionais() }, [])

  async function carregarProfissionais() {
    setLoading(true)
    try {
      const res = await fetch('/api/profissionais')
      if (res.ok) setProfissionais(await res.json())
    } catch { } finally { setLoading(false) }
  }

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoPreview(URL.createObjectURL(file))
    setUploadingFoto(true)
    try {
      const fd = new FormData()
      fd.append('foto', file)
      const res = await fetch('/api/profissionais/upload-foto', { method: 'POST', body: fd })
      if (res.ok) {
        const { url } = await res.json()
        setForm(f => ({ ...f, foto_url: url }))
        toast.success('Foto enviada!')
      } else toast.error('Erro ao enviar foto')
    } finally { setUploadingFoto(false) }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    // Apenas nome_completo é obrigatório — todos os outros campos são opcionais
    if (!form.nome_completo.trim()) { toast.error('Informe pelo menos o nome completo'); return }
    setSaving(true)
    try {
      const url = editando ? `/api/profissionais/${editando.id}` : '/api/profissionais'
      const method = editando ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) {
        toast.success(editando ? 'Profissional atualizado!' : 'Profissional cadastrado!')
        setForm({ ...FORM_INITIAL })
        setEditando(null)
        setFotoPreview('')
        setSecao('lista')
        carregarProfissionais()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erro ao salvar')
      }
    } finally { setSaving(false) }
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir ${nome}?`)) return
    const res = await fetch(`/api/profissionais/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Excluído!'); carregarProfissionais() }
    else toast.error('Erro ao excluir')
  }

  function iniciarEdicao(p: Profissional) {
    setEditando(p)
    setForm({
      nome_completo: p.nome_completo || '', apelido: p.apelido || '', email: p.email || '',
      cpf: p.cpf || '', rg: p.rg || '', cnpj: p.cnpj || '', cargo: p.cargo || '',
      habilidades: p.habilidades || '', endereco: p.endereco || '',
      data_aniversario: p.data_aniversario?.split('T')[0] || '',
      cor_favorita: p.cor_favorita || '', comida_favorita: p.comida_favorita || '',
      animal_favorito: p.animal_favorito || '', hobbies: p.hobbies || '',
      um_sonho: p.um_sonho || '', contato_responsavel: p.contato_responsavel || '',
      certificados: p.certificados || '', foto_url: p.foto_url || '',
    })
    setFotoPreview(p.foto_url || '')
    setSecao('cadastrar')
  }

  const departamentos = profissionais.filter(p => p.is_departamento)
  const profFiltrados = profissionais.filter(p =>
    !p.is_departamento && (
      p.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
      (p.cargo || '').toLowerCase().includes(busca.toLowerCase())
    )
  )

  // Verifica se profissional tem qualquer pendência (checklist OU pendências abertas)
  function temPendencia(p: Profissional) {
    return (
      !p.tem_contrato ||
      !p.perfil_pessoal_completo ||
      !p.dados_pessoais_completo ||
      !p.dados_profissionais_completo ||
      (p.pendencias_abertas || 0) > 0
    )
  }

  const F = (label: string, key: keyof typeof FORM_INITIAL, opts?: { type?: string; placeholder?: string; full?: boolean }) => (
    <div className={opts?.full ? 'col-span-2' : ''}>
      <label style={{ display: 'block', fontSize: '11px', color: '#767069', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <input
        type={opts?.type || 'text'}
        placeholder={opts?.placeholder || label}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={{ width: '100%', background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none' }}
        onFocus={e => e.target.style.borderColor = '#5b4fcf'}
        onBlur={e => e.target.style.borderColor = '#e8e6e0'}
      />
    </div>
  )

  const TA = (label: string, key: keyof typeof FORM_INITIAL, rows = 3) => (
    <div className="col-span-2">
      <label style={{ display: 'block', fontSize: '11px', color: '#767069', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <textarea
        rows={rows}
        placeholder={label}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={{ width: '100%', background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none', resize: 'vertical' }}
        onFocus={e => e.target.style.borderColor = '#5b4fcf'}
        onBlur={e => e.target.style.borderColor = '#e8e6e0'}
      />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>

      {/* TOP BAR */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e8e6e0', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1 rounded" style={{ color: '#767069', background: 'none', border: 'none', cursor: 'pointer' }}>
          <Menu size={18} />
        </button>
        <a href="/salon" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#767069', textDecoration: 'none', fontSize: '13px' }}>
          <ArrowLeft size={15} /> Voltar
        </a>
        <span style={{ color: '#767069' }}>|</span>
        <span style={{ color: '#1a1a1a', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> Profissionais</span>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>

        {/* Overlay mobile */}
        {isMobile && sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSidebarOpen(false)} />}

        {/* SIDEBAR */}
        <aside style={{
          position: isMobile ? 'fixed' : 'relative',
          top: isMobile ? 49 : undefined,
          bottom: isMobile ? 0 : undefined,
          left: 0,
          zIndex: isMobile ? 50 : undefined,
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s ease',
          width: '230px', minWidth: '230px', background: '#ffffff', borderRight: '1px solid #e8e6e0', padding: '12px 8px', overflowY: 'auto', flexShrink: 0,
        }}>
          {SIDEBAR_ITEMS.map(item => {
            const Icon = item.icon
            const ativo = secao === item.id
            return (
              <button key={item.id} onClick={() => { setSecao(item.id); setSidebarOpen(false); if (item.id === 'cadastrar') { setEditando(null); setForm({ ...FORM_INITIAL }); setFotoPreview('') } }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                  padding: '9px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  marginBottom: '2px', textAlign: 'left', transition: 'all 0.15s',
                  background: ativo ? `${item.cor}18` : item.destaque ? `${item.cor}10` : 'transparent',
                  borderLeft: ativo ? `3px solid ${item.cor}` : item.destaque ? `3px solid ${item.cor}60` : '3px solid transparent',
                  color: ativo ? item.cor : item.destaque ? item.cor + 'cc' : '#767069',
                  fontWeight: item.destaque ? 700 : ativo ? 600 : 400,
                  fontSize: '12px',
                }}>
                <Icon size={14} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, lineHeight: 1.3 }}>{item.label}</span>
                {ativo && <ChevronRight size={12} />}
              </button>
            )
          })}
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main style={{ flex: 1, padding: isMobile ? '12px' : '24px', overflowY: 'auto' }}>

          {/* ── LISTA ── */}
          {secao === 'lista' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ color: '#1a1a1a', fontSize: '20px', fontWeight: 700, margin: 0 }}>Lista de Profissionais</h2>
                  <p style={{ color: '#767069', fontSize: '13px', margin: '4px 0 0' }}>{profissionais.filter(p => p.ativo).length} ativos</p>
                </div>
                <button onClick={() => { setSecao('cadastrar'); setEditando(null); setForm({ ...FORM_INITIAL }) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #5b4fcf, #f43f8e)', color: 'white', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={15} /> Cadastrar
                </button>
              </div>

              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b6860' }} />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar profissional..."
                  style={{ width: '100%', background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '9px 12px 9px 36px', fontSize: '13px', color: '#1a1a1a', outline: 'none' }} />
              </div>

              {/* ── DEPARTAMENTOS VIRTUAIS (fixos no topo) ── */}
              {!loading && departamentos.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '10px', color: '#6b6860', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '8px' }}>Departamentos</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                    {departamentos.map(d => {
                      const cor = d.departamento_cor || '#5b4fcf'
                      const icone = d.nome_completo === 'ADMINISTRATIVO' ? '🗂️' : d.nome_completo === 'FINANCEIRO' ? '💰' : d.nome_completo === 'RECEPÇÃO' ? '🛎️' : '🏢'
                      const temPend = (d.pendencias_abertas || 0) > 0
                      return (
                        <div key={d.id}
                          style={{ background: temPend ? '#fff0f0' : '#ffffff', border: `1px solid ${temPend ? '#7f1d1d' : cor + '40'}`, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}
                          onClick={() => { try { sessionStorage.setItem('nodri_prof_' + d.id, JSON.stringify(d)) } catch(_){} router.push(`/salon/profissionais/${d.id}`) }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = temPend ? '#ef4444' : cor; e.currentTarget.style.boxShadow = `0 0 0 2px ${temPend ? '#ef444420' : cor + '20'}` }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = temPend ? '#7f1d1d' : cor + '40'; e.currentTarget.style.boxShadow = 'none' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: cor + '20', border: `1px solid ${cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                            {icone}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: '#1a1a1a', fontWeight: 700, fontSize: '12px' }}>{d.nome_completo}</div>
                            {temPend
                              ? <div style={{ color: '#ef4444', fontSize: '10px', marginTop: '2px', fontWeight: 600 }}>⚠ {d.pendencias_abertas} pendência{d.pendencias_abertas! > 1 ? 's' : ''}</div>
                              : <div style={{ color: '#6b6860', fontSize: '10px', marginTop: '2px' }}>Sem pendências</div>
                            }
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ borderBottom: '1px solid #e8e6e0', margin: '16px 0 8px' }}/>
                  <p style={{ fontSize: '10px', color: '#6b6860', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '8px' }}>Profissionais</p>
                </div>
              )}

              {loading ? (
                <div style={{ textAlign: 'center', color: '#6b6860', padding: '60px' }}>Carregando...</div>
              ) : profFiltrados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b6860' }}>
                  <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                  <p style={{ margin: 0 }}>Nenhum profissional encontrado.</p>
                  <button onClick={() => setSecao('cadastrar')}
                    style={{ marginTop: '12px', background: 'linear-gradient(135deg, #5b4fcf, #f43f8e)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}>
                    Cadastrar primeiro
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {profFiltrados.map(p => (
                    <div key={p.id} style={{ background: temPendencia(p) ? '#fff0f0' : '#ffffff', border: `1px solid ${temPendencia(p) ? '#7f1d1d' : '#ffffff'}`, borderRadius: '12px', padding: '16px', transition: 'border-color 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
                      onClick={() => { try { sessionStorage.setItem('nodri_prof_' + p.id, JSON.stringify(p)) } catch(_){} router.push(`/salon/profissionais/${p.id}`) }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = temPendencia(p) ? '#ef444480' : '#5b4fcf80'; e.currentTarget.style.boxShadow = temPendencia(p) ? '0 0 0 2px #ef444420' : '0 0 0 2px #5b4fcf20' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = temPendencia(p) ? '#7f1d1d' : '#ffffff'; e.currentTarget.style.boxShadow = 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        {p.foto_url ? (
                          <img src={p.foto_url} alt={p.nome_completo} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #5b4fcf40' }} />
                        ) : (
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #5b4fcf, #f43f8e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '16px' }}>
                            {p.nome_completo[0].toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#1a1a1a', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nome_completo}</div>
                          <div style={{ color: '#5b4fcf', fontSize: '11px', marginTop: '2px' }}>{p.cargo || 'Profissional'}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '9px', padding: '3px 7px', borderRadius: '20px', background: p.ativo ? '#10b98120' : '#ef444420', color: p.ativo ? '#10b981' : '#ef4444', fontWeight: 700, border: `1px solid ${p.ativo ? '#10b98140' : '#ef444440'}` }}>
                            {p.ativo ? 'ATIVO' : 'INATIVO'}
                          </span>
                          {temPendencia(p) && (
                            <span style={{ fontSize: '9px', padding: '3px 7px', borderRadius: '20px', background: '#ef444420', color: '#ef4444', fontWeight: 700, border: '1px solid #ef444440', whiteSpace: 'nowrap' }}>
                              ⚠ PENDÊNCIAS
                            </span>
                          )}
                        </div>
                      </div>
                      {p.habilidades && <p style={{ color: '#6b6860', fontSize: '11px', margin: '0 0 8px', lineHeight: 1.5 }}>{p.habilidades.slice(0, 80)}{p.habilidades.length > 80 ? '...' : ''}</p>}
                      {p.email && <p style={{ color: '#6b6860', fontSize: '11px', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} /> {p.email}</p>}
                      {(() => {
                        const pends = [
                          !p.tem_contrato && 'Sem contrato',
                          !p.dados_pessoais_completo && 'Dados pessoais incompletos',
                          !p.perfil_pessoal_completo && 'Perfil pessoal incompleto',
                          !p.dados_profissionais_completo && 'Dados profissionais incompletos',
                          (p.pendencias_abertas || 0) > 0 && `${p.pendencias_abertas} pendência(s) no sistema`,
                        ].filter(Boolean) as string[]
                        return pends.length > 0 ? (
                          <div style={{ marginBottom: '8px', padding: '8px 10px', borderRadius: '8px', background: '#ef444410', border: '1px solid #ef444430' }}>
                            <p style={{ color: '#ef4444', fontSize: '10px', fontWeight: 700, margin: '0 0 4px' }}>⚠ Pendências:</p>
                            {pends.map(item => (
                              <p key={item} style={{ color: '#dc2626', fontSize: '10px', margin: '1px 0', display: 'flex', alignItems: 'center', gap: 4 }}>• {item}</p>
                            ))}
                          </div>
                        ) : null
                      })()}
                      <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => router.push(`/salon/profissionais/${p.id}`)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: '#ffffff', border: '1px solid #dedad4', borderRadius: '6px', padding: '6px', color: '#767069', fontSize: '11px', cursor: 'pointer' }}>
                          <Edit2 size={12} /> Editar
                        </button>
                        <button onClick={() => excluir(p.id, p.nome_completo)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid #dedad4', borderRadius: '6px', padding: '6px 8px', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── FORMULÁRIO DE CADASTRO ── */}
          {secao === 'cadastrar' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button onClick={() => { setSecao('lista'); setEditando(null); setForm({ ...FORM_INITIAL }); setFotoPreview('') }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#767069', cursor: 'pointer', fontSize: '13px' }}>
                  <ArrowLeft size={14} /> Voltar
                </button>
                <h2 style={{ color: '#1a1a1a', fontSize: '18px', fontWeight: 700, margin: 0 }}>
                  {editando ? `✏️ Editando: ${editando.nome_completo}` : '➕ Cadastrar Profissional'}
                </h2>
              </div>

              <form onSubmit={salvar}>
                {/* FOTO */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', padding: '20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e8e6e0' }}>
                  <div onClick={() => fileRef.current?.click()} style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px dashed #5b4fcf60', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                    {fotoPreview ? <img src={fotoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" /> : <Upload size={24} color="#5b4fcf80" />}
                    {uploadingFoto && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px' }}>...</div>}
                  </div>
                  <div>
                    <p style={{ color: '#1a1a1a', fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>Foto de Rosto</p>
                    <p style={{ color: '#767069', fontSize: '12px', margin: '0 0 8px' }}>JPG ou PNG, máximo 2MB</p>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      style={{ background: '#ffffff', border: '1px solid #dedad4', borderRadius: '6px', padding: '6px 12px', color: '#767069', fontSize: '12px', cursor: 'pointer' }}>
                      {fotoPreview ? 'Trocar foto' : 'Selecionar foto'}
                    </button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadFoto} />
                </div>

                {/* DADOS PESSOAIS */}
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e8e6e0', padding: '20px', marginBottom: '16px' }}>
                  <h3 style={{ color: '#5b4fcf', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>👤 Dados Pessoais</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {F('Nome Completo *', 'nome_completo', { full: true })}
                    {F('Apelido', 'apelido')}
                    {F('E-mail', 'email', { type: 'email' })}
                    {F('Data de Aniversário', 'data_aniversario', { type: 'date' })}
                    {F('CPF', 'cpf', { placeholder: '000.000.000-00' })}
                    {F('RG', 'rg')}
                    {F('CNPJ (MEI)', 'cnpj', { placeholder: '00.000.000/0001-00' })}
                    {/* Seletor de categoria inteligente */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#767069', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoria / Cargo</label>
                      {novaCategoria ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="text"
                            placeholder="Digite a nova categoria..."
                            value={form.cargo}
                            onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                            style={{ flex: 1, background: '#ffffff', border: '1px solid #5b4fcf', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none' }}
                            autoFocus
                          />
                          <button type="button" onClick={() => setNovaCategoria(false)}
                            style={{ background: '#ffffff', border: '1px solid #dedad4', borderRadius: '8px', padding: '9px 12px', color: '#767069', cursor: 'pointer', fontSize: '12px' }}>
                            ← Voltar
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <select
                            value={form.cargo}
                            onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                            style={{ flex: 1, background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: form.cargo ? '#1a1a1a' : '#767069', outline: 'none' }}>
                            <option value="">Selecione a categoria...</option>
                            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button type="button" onClick={() => { setNovaCategoria(true); setForm(f => ({ ...f, cargo: '' })) }}
                            title="Criar nova categoria"
                            style={{ background: '#5b4fcf20', border: '1px solid #5b4fcf40', borderRadius: '8px', padding: '9px 12px', color: '#5b4fcf', cursor: 'pointer', fontSize: '18px', fontWeight: 700 }}>
                            +
                          </button>
                        </div>
                      )}
                      <p style={{ color: '#767069', fontSize: '10px', margin: '4px 0 0' }}>
                        Selecione uma categoria existente ou clique em <strong style={{ color: '#5b4fcf' }}>+</strong> para criar nova
                      </p>
                    </div>
                    {F('Endereço', 'endereco', { full: true })}
                  </div>
                </div>

                {/* DADOS PROFISSIONAIS */}
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e8e6e0', padding: '20px', marginBottom: '16px' }}>
                  <h3 style={{ color: '#0891b2', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px' }}>💼 Dados Profissionais</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {TA('Habilidades (serviços que consegue fazer)', 'habilidades', 3)}
                    {TA('Certificados de Curso', 'certificados', 3)}
                    <div style={{ padding: '12px', background: '#f5f4f0', borderRadius: '8px', border: '1px solid #e8e6e0' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#767069', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nome e Telefone do Responsável / Parente</label>
                      <input value={form.contato_responsavel} onChange={e => setForm(f => ({ ...f, contato_responsavel: e.target.value }))}
                        placeholder="Nome, (00) 00000-0000"
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', color: '#1a1a1a', outline: 'none' }} />
                    </div>
                    <div />
                  </div>
                </div>

                {/* PERSONALIDADE */}
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e8e6e0', padding: '20px', marginBottom: '24px' }}>
                  <h3 style={{ color: '#f43f8e', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px' }}>✨ Personalidade</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {F('Cor Favorita', 'cor_favorita')}
                    {F('Comida Favorita', 'comida_favorita')}
                    {F('Animal Favorito', 'animal_favorito')}
                    <div />
                    {TA('Hobbies e Paixões', 'hobbies', 2)}
                    {TA('Um Sonho', 'um_sonho', 2)}
                  </div>
                </div>

                {/* BOTÕES */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" disabled={saving}
                    style={{ flex: 1, background: 'linear-gradient(135deg, #5b4fcf, #f43f8e)', color: 'white', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Salvando...' : editando ? '💾 Atualizar Profissional' : '✅ Cadastrar Profissional'}
                  </button>
                  <button type="button" onClick={() => { setSecao('lista'); setEditando(null); setForm({ ...FORM_INITIAL }); setFotoPreview('') }}
                    style={{ background: '#ffffff', border: '1px solid #dedad4', borderRadius: '10px', padding: '13px 20px', color: '#767069', fontSize: '14px', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── GERENCIAR CATEGORIAS ── */}
          {secao === 'categorias' && (
            <div style={{ maxWidth: 600 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ color: '#1a1a1a', fontSize: '20px', fontWeight: 700, margin: 0 }}>🏷️ Gerenciar Categorias</h2>
              </div>

              {/* Criar nova categoria */}
              <div style={{ background: '#ffffff', border: '1px solid #f59e0b40', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <p style={{ color: '#767069', fontSize: 12, margin: '0 0 10px', fontWeight: 600 }}>➕ CRIAR NOVA CATEGORIA</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={novaCatTexto} onChange={e => setNovaCatTexto(e.target.value)}
                    placeholder="Ex: Depiladora, Esteticista..."
                    onKeyDown={e => { if (e.key === 'Enter' && novaCatTexto.trim()) { toast.success(`Categoria "${novaCatTexto.trim()}" criada! Atribua a um profissional para salvar.`); setNovaCatTexto('') } }}
                    style={{ flex: 1, background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1a1a1a', outline: 'none' }} />
                  <button onClick={() => { if (novaCatTexto.trim()) { toast.success(`Categoria "${novaCatTexto.trim()}" disponível no formulário de cadastro!`); setNovaCatTexto('') } }}
                    style={{ background: '#f59e0b', border: 'none', borderRadius: 8, padding: '9px 16px', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    Criar
                  </button>
                </div>
              </div>

              {/* Lista de categorias existentes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categorias.map(cat => {
                  const qtd = profissionais.filter(p => p.cargo === cat).length
                  return (
                    <div key={cat} style={{ background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      {editandoCategoria === cat ? (
                        <>
                          <input value={editandoCategoriaValor} onChange={e => setEditandoCategoriaValor(e.target.value)} autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') editarCategoria(cat, editandoCategoriaValor); if (e.key === 'Escape') setEditandoCategoria(null) }}
                            style={{ flex: 1, background: '#f5f4f0', border: '1px solid #5b4fcf', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#1a1a1a', outline: 'none' }} />
                          <button onClick={() => editarCategoria(cat, editandoCategoriaValor)}
                            style={{ background: '#10b981', border: 'none', borderRadius: 6, padding: '6px 12px', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
                          <button onClick={() => setEditandoCategoria(null)}
                            style={{ background: '#ffffff', border: '1px solid #dedad4', borderRadius: 6, padding: '6px 10px', color: '#767069', fontSize: 12, cursor: 'pointer' }}>✕</button>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: 1 }}>
                            <span style={{ color: '#1a1a1a', fontWeight: 600, fontSize: 14 }}>{cat}</span>
                            <span style={{ color: '#6b6860', fontSize: 11, marginLeft: 10 }}>{qtd} profissional{qtd !== 1 ? 'is' : ''}</span>
                          </div>
                          <button onClick={() => { setEditandoCategoria(cat); setEditandoCategoriaValor(cat) }}
                            style={{ background: '#ffffff', border: '1px solid #dedad4', borderRadius: 6, padding: '5px 10px', color: '#767069', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            ✏️ Editar
                          </button>
                          {qtd === 0 && (
                            <button onClick={() => excluirCategoria(cat)}
                              style={{ background: '#ffffff', border: '1px solid #ef444440', borderRadius: 6, padding: '5px 10px', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                              🗑️ Excluir
                            </button>
                          )}
                          {qtd > 0 && (
                            <button onClick={() => excluirCategoria(cat)}
                              style={{ background: '#ffffff', border: '1px solid #ef444440', borderRadius: 6, padding: '5px 10px', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                              🗑️ Remover
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── SEÇÕES DE CONTEÚDO INFORMATIVO ── */}
          {CONTEUDO_INFO[secao] && (
            <div>
              <div style={{ background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: '16px', padding: '32px', maxWidth: '700px' }}>
                <h2 style={{ color: '#1a1a1a', fontSize: '22px', fontWeight: 700, margin: '0 0 20px' }}>
                  {SIDEBAR_ITEMS.find(s => s.id === secao)?.label}
                </h2>
                <p style={{ color: '#767069', fontSize: '15px', lineHeight: '1.8', whiteSpace: 'pre-line', margin: 0 }}>
                  {CONTEUDO_INFO[secao].texto}
                </p>
                <div style={{ marginTop: '24px', padding: '16px', background: '#f5f4f0', borderRadius: '10px', border: '1px solid #e8e6e0' }}>
                  <p style={{ color: '#767069', fontSize: '12px', margin: 0 }}>
                    💡 <strong style={{ color: '#767069' }}>Dica:</strong> Para personalizar este conteúdo com as informações do seu salão, entre em contato com o suporte Nodri.
                  </p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
