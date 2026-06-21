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
  status_cadastro?: string
  servicos_habilitados?: string[]
  conta_bancaria?: string
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
  contrato:     { titulo: 'Contrato de Trabalho', texto: 'O contrato de locação de espaço ou parceria deve conter: identificação das partes (salão e profissional), CNPJ de ambos, percentual de comissão, dias e horários de trabalho, responsabilidades, vigência e cláusulas de rescisão.' },
  certificados: { titulo: 'Certificados', texto: 'Solicite cópias dos certificados de cursos concluídos: colorimetria, corte, escova, tratamentos capilares, manicure, podologia, etc. Guarde digitalmente na ficha do profissional. Incentive atualização constante.' },
  carreira:     { titulo: 'Plano de Carreira', texto: 'Estruture crescimento por etapas: 🥉 Júnior (0-1 ano) → 🥈 Pleno (1-3 anos) → 🥇 Sênior (3+ anos) → 🏆 Referência. Defina metas de faturamento, satisfação de clientes e horas de capacitação para evolução em cada nível.' },
}

const FORM_INITIAL = {
  nome_completo: '', apelido: '', email: '', cpf: '', rg: '', cnpj: '', cargo: '',
  habilidades: '{}', endereco: '', data_aniversario: '', cor_favorita: '', comida_favorita: '',
  animal_favorito: '', hobbies: '', um_sonho: '', contato_responsavel: '{}', certificados: '',
  foto_url: '', conta_bancaria: '',
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
  const [linkCadastro, setLinkCadastro] = useState('')
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [gerandoLink, setGerandoLink] = useState(false)
  const [servicosSalao, setServicosSalao] = useState<any[]>([])
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([])
  const [servicosAberto, setServicosAberto] = useState(false)

  // ── ENDEREÇO ESTRUTURADO ──
  const [formCep, setFormCep] = useState('')
  const [formBairro, setFormBairro] = useState('')
  const [formCidade, setFormCidade] = useState('')
  const [formUf, setFormUf] = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)

  // ── DISTRATO ──
  const [distratoProf, setDistratoProf] = useState<Profissional | null>(null)
  const [distratoEditando, setDistratoEditando] = useState(false)
  const [salaoData, setSalaoData] = useState<any>(null)
  // campos editáveis do distrato
  const [dSalaoNome, setDSalaoNome] = useState('')
  const [dSalaoCidade, setDSalaoCidade] = useState('BRASÍLIA, DF')
  const [dSalaoEndereco, setDSalaoEndereco] = useState('')
  const [dSalaoCNPJ, setDSalaoCNPJ] = useState('')
  const [dSalaoResponsavel, setDSalaoResponsavel] = useState('')
  const [dSalaoRG, setDSalaoRG] = useState('')
  const [dProfNome, setDProfNome] = useState('')
  const [dProfCPF, setDProfCPF] = useState('')
  const [dProfCNPJ, setDProfCNPJ] = useState('')
  const [dProfEndereco, setDProfEndereco] = useState('')
  const [dProfRepresentante, setDProfRepresentante] = useState('')
  const [dDataContrato, setDDataContrato] = useState('')
  const [dDataDistrato, setDDataDistrato] = useState(() => {
    const h = new Date(); return `${String(h.getDate()).padStart(2,'0')}/${String(h.getMonth()+1).padStart(2,'0')}/${h.getFullYear()}`
  })
  const [dLocalDistrato, setDLocalDistrato] = useState('Brasília')

  const CATEGORIAS_PADRAO = ['Cabeleireiro', 'Manicure', 'Pedicure', 'Assistente', 'Massoterapeuta', 'Maquiador(a)', 'Colorista', 'Recepcionista', 'Auxiliar']
  const iStyle: React.CSSProperties = { display: 'block', width: '100%', marginTop: '3px', padding: '6px 10px', border: '1px solid #d6d3ce', borderRadius: '6px', fontSize: '12px', background: '#fafaf8', color: '#1a1a1a', fontFamily: 'inherit' }

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

  useEffect(() => { carregarProfissionais(); buscarLinkCadastro(); carregarServicos(); carregarSalao() }, [])

  async function carregarSalao() {
    try {
      const res = await fetch('/api/salon/perfil')
      if (res.ok) {
        const d = await res.json()
        setSalaoData(d)
        setDSalaoNome(d.nome || '')
        setDSalaoResponsavel(d.responsavel || '')
        setDSalaoCNPJ(d.cnpj || '')
        setDSalaoEndereco(d.endereco || '')
        setDSalaoCidade(d.cidade || 'BRASÍLIA, DF')
        setDSalaoRG(d.rg_responsavel || '')
      }
    } catch {}
  }

  function preencherDistrato(prof: Profissional) {
    setDistratoProf(prof)
    setDProfNome((prof.nome_completo || '').toUpperCase())
    setDProfCPF(prof.cpf || '')
    setDProfCNPJ(prof.cnpj || '')
    setDProfEndereco(prof.endereco || '')
    try {
      const cr = prof.contato_responsavel ? JSON.parse(prof.contato_responsavel) : {}
      setDProfRepresentante(cr.nome || prof.nome_completo || '')
    } catch { setDProfRepresentante(prof.nome_completo || '') }
  }

  function imprimirDistrato() {
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Distrato — ${dProfNome}</title>
<style>
  @page { size: A4 portrait; margin: 2cm 2cm 1.5cm 3cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; line-height: 1.4; background: #fff; }
  h1 { font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 14pt; letter-spacing: 1px; }
  p { text-align: justify; margin-bottom: 8pt; }
  .rodape { margin-top: 16pt; page-break-inside: avoid; }
  .data { text-align: center; margin-bottom: 14pt; }
  .assinaturas { display: flex; justify-content: space-between; margin-bottom: 12pt; }
  .ass-bloco { width: 45%; }
  .test { font-size: 9pt; }
  .test p { margin-bottom: 3pt; }
  .test-linha { margin-bottom: 8pt; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<h1>Distrato de Contrato de Parceria</h1>

<p><strong>${dSalaoNome.toUpperCase()}</strong>, com sede na cidade de ${dSalaoCidade}${dSalaoEndereco ? ', ' + dSalaoEndereco : ''}, inscrita no CNPJ sob o n° ${dSalaoCNPJ || '___'}, neste ato representada por ${dSalaoResponsavel || '___'}${dSalaoRG ? ', RG ' + dSalaoRG : ''}, doravante denominada simplesmente <strong>DISTRATANTE</strong>, <strong>${dProfNome.toUpperCase()}</strong>${dProfCPF ? ' ' + dProfCPF : ''}, com sede na cidade de ${dProfEndereco || '___'}${dProfCNPJ ? ' inscrita no CNPJ sob o n° ' + dProfCNPJ : ''}, neste ato representada ${dProfNome || '___'} doravante denominada simplesmente <strong>DISTRATADA</strong>, têm entre os mesmos, de maneira justa e acordada, o presente <strong>DISTRATO DE CONTRATO DE PARCERIA</strong>, ficando desde já aceito, pelas cláusulas abaixo descritas:</p>

<p><strong>1)&nbsp;&nbsp;&nbsp;&nbsp; Do Objeto e Considerações do Contrato:</strong></p>

<p>O presente tem como OBJETO o contrato de parceria celebrado entre as partes neste mencionadas, o qual teve como fundamento, o seguinte: O SALÃO-PARCEIRO, empresa destinada à prestação de serviços de salão de beleza e afins, proprietária e/ou possuidora de bens móveis e de instalação para barbeiros, cabeleireiros, manicuras, pedicuras, esteticistas, massagistas, maquiadores, escovistas, calistas, depiladores e demais profissões afins, sendo proprietária e possuidora de espaço, equipamentos e móveis apropriados à atividade desses profissionais, estabelece parceria com o PROFISSIONAL-PARCEIRO, pelo que a ele dá, em locação e/ou uso, móveis, aparelhos, utensílios e produtos de sua propriedade e/ou posse, para fins de exploração específica da atividade de cabeleireira e outras que porventura sejam praticadas exclusivamente dentro da abrangência da Lei 13.352, de 27 de outubro de 2016, em serviços de beleza, dentro do seu objeto social, não podendo o PROFISSIONAL-PARCEIRO usar os objetos dados em locação para quaisquer outros fins. Além dos bens dados em locação, o SALÃO-PARCEIRO também concede, ao PROFISSIONAL-PARCEIRO, serviços de gestão, de apoio administrativo e de escritório, tais como, exemplificativamente, cobrança e recebimento de valores pagos pelos clientes atendidos por ela, datado do dia ${dDataContrato || '___/___/______'}.</p>

<p><strong>1.1)</strong> As partes resolvem, nesta data, em comum acordo, que, considerando que não existem pendências de ambas as partes, fica consumado o distrato.</p>

<div class="rodape">
  <p class="data">${dLocalDistrato}, ${dDataDistrato}</p>
  <div class="assinaturas">
    <div class="ass-bloco">
      <p>________________________</p>
      <p>DISTRATANTE</p>
    </div>
    <div class="ass-bloco">
      <p>____________________</p>
      <p>DISTRATADO</p>
    </div>
  </div>
  <div class="test">
    <p>Testemunhas:</p>
    <div class="test-linha">
      <p>1ª) Ass. _________________________</p>
      <p>Nome:</p>
      <p>RG:</p>
    </div>
    <div class="test-linha">
      <p>2ª) Ass. _________________________</p>
      <p>Nome:</p>
      <p>RG:</p>
    </div>
  </div>
</div>
</body>
</html>`
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none'
    document.body.appendChild(iframe)
    iframe.contentDocument!.open()
    iframe.contentDocument!.write(html)
    iframe.contentDocument!.close()
    setTimeout(() => { iframe.contentWindow!.print(); setTimeout(() => document.body.removeChild(iframe), 2000) }, 400)
  }

  async function buscarLinkCadastro() {
    try {
      const res = await fetch('/api/profissionais/link-cadastro')
      if (res.ok) {
        const d = await res.json()
        setLinkCadastro(`${window.location.origin}/cadastro/${d.token}`)
      }
    } catch {}
  }

  async function regenerarLink() {
    if (!confirm('Isso vai invalidar o link atual. Quem tiver o link antigo não conseguirá mais acessar. Continuar?')) return
    setGerandoLink(true)
    const res = await fetch('/api/profissionais/link-cadastro', { method: 'POST' })
    if (res.ok) {
      const d = await res.json()
      setLinkCadastro(`${window.location.origin}/cadastro/${d.token}`)
      toast.success('Novo link gerado!')
    }
    setGerandoLink(false)
  }

  function copiarLink() {
    navigator.clipboard.writeText(linkCadastro)
    setLinkCopiado(true)
    toast.success('Link copiado!')
    setTimeout(() => setLinkCopiado(false), 3000)
  }

  async function buscarCep(cep: string) {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const d = await res.json()
      if (!d.erro) {
        setFormBairro(d.bairro || '')
        setFormCidade(d.localidade || '')
        setFormUf(d.uf || '')
      } else {
        toast.error('CEP não encontrado')
      }
    } catch { toast.error('Erro ao buscar CEP') } finally { setBuscandoCep(false) }
  }

  function enderecoParaCampos(endereco: string) {
    // Tenta extrair CEP do formato "BAIRRO, CIDADE-UF, CEP: XXXXX" ou "XXXXX-XXX"
    const cepMatch = endereco.match(/CEP[:\s]+(\d{5}-?\d{3})/i)
    const cepRaw = cepMatch ? cepMatch[1].replace('-','') : ''
    // Tenta extrair cidade-UF
    const partes = endereco.split(',').map(s => s.trim())
    return { cep: cepRaw, bairro: partes[0] || '', cidade: partes[1] || '', uf: partes[2]?.replace(/CEP.*/i,'').trim() || '' }
  }

  async function carregarServicos() {
    try {
      const res = await fetch('/api/servicos')
      if (res.ok) setServicosSalao(await res.json())
    } catch {}
  }

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
      const enderecoFull = [formBairro, formCidade && formUf ? `${formCidade}-${formUf}` : formCidade || formUf, formCep ? `CEP: ${formCep}` : ''].filter(Boolean).join(', ')
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, endereco: enderecoFull || form.endereco, servicos_habilitados: servicosSelecionados }) })
      if (res.ok) {
        toast.success(editando ? 'Profissional atualizado!' : 'Profissional cadastrado!')
        setForm({ ...FORM_INITIAL })
        setServicosSelecionados([])
        setEditando(null)
        setFotoPreview('')
        setFormCep(''); setFormBairro(''); setFormCidade(''); setFormUf('')
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
      habilidades: (p as any).habilidades || '{}',
      endereco: p.endereco || '',
      data_aniversario: p.data_aniversario?.split('T')[0] || '',
      cor_favorita: p.cor_favorita || '', comida_favorita: p.comida_favorita || '',
      animal_favorito: p.animal_favorito || '', hobbies: p.hobbies || '',
      um_sonho: p.um_sonho || '',
      contato_responsavel: (p as any).contato_responsavel || '{}',
      certificados: p.certificados || '', foto_url: p.foto_url || '',
      conta_bancaria: (p as any).conta_bancaria || '',
    })
    setServicosSelecionados(Array.isArray(p.servicos_habilitados) ? p.servicos_habilitados : [])
    setFotoPreview(p.foto_url || '')
    // Popula campos de endereço estruturado
    if (p.endereco) {
      const parsed = enderecoParaCampos(p.endereco)
      setFormCep(parsed.cep); setFormBairro(parsed.bairro); setFormCidade(parsed.cidade); setFormUf(parsed.uf)
    } else { setFormCep(''); setFormBairro(''); setFormCidade(''); setFormUf('') }
    setSecao('cadastrar')
  }

  const departamentos = profissionais.filter(p => p.is_departamento)
  const profFiltrados = profissionais.filter(p =>
    !p.is_departamento && (
      p.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
      (p.cargo || '').toLowerCase().includes(busca.toLowerCase())
    )
  ).sort((a, b) => {
    // Pendentes primeiro
    const aPend = (a as any).status_cadastro === 'pendente' ? 0 : 1
    const bPend = (b as any).status_cadastro === 'pendente' ? 0 : 1
    return aPend - bPend
  })

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
        <main style={{ flex: 1, padding: isMobile ? '12px' : '24px', overflowY: 'auto', background: '#f0eeea' }}>

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

              {/* Pendentes de auto-cadastro */}
              {!loading && profissionais.filter(p => (p as any).status_cadastro === 'pendente').length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '18px' }}>⏳</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#92400e', fontWeight: 700, fontSize: '12px', margin: 0 }}>
                      {profissionais.filter(p => (p as any).status_cadastro === 'pendente').length} cadastro(s) aguardando aprovação
                    </p>
                    <p style={{ color: '#b45309', fontSize: '11px', margin: '2px 0 0' }}>Clique no profissional para revisar e ativar</p>
                  </div>
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
                      {p.habilidades && !p.habilidades.trim().startsWith('{') && <p style={{ color: '#6b6860', fontSize: '11px', margin: '0 0 8px', lineHeight: 1.5 }}>{p.habilidades.slice(0, 80)}{p.habilidades.length > 80 ? '...' : ''}</p>}
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

              {/* LINK DE AUTO-CADASTRO */}
              {!editando && (
                <div style={{ background: 'linear-gradient(135deg, #f5f3ff, #fdf2f8)', border: '1px solid #c4b5fd', borderRadius: '14px', padding: '18px 20px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '10px' }}>
                    <span style={{ fontSize: '18px' }}>🔗</span>
                    <div>
                      <p style={{ color: '#5b4fcf', fontWeight: 700, fontSize: '13px', margin: 0 }}>Link de Auto-Cadastro</p>
                      <p style={{ color: '#767069', fontSize: '11px', margin: '2px 0 0' }}>Envie este link para o profissional preencher os dados pelo celular</p>
                    </div>
                  </div>
                  {linkCadastro ? (
                    <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', color: '#1a1a1a', wordBreak: 'break-all', marginBottom: '10px', fontFamily: 'monospace' }}>
                      {linkCadastro}
                    </div>
                  ) : (
                    <div style={{ background: '#f0eeea', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', color: '#a09890', marginBottom: '10px' }}>Carregando link...</div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={copiarLink}
                      disabled={!linkCadastro}
                      style={{ flex: 1, background: linkCopiado ? '#10b981' : '#5b4fcf', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 700, padding: '9px', cursor: 'pointer' }}
                    >
                      {linkCopiado ? '✓ Copiado!' : '📋 Copiar Link'}
                    </button>
                    <button
                      type="button"
                      onClick={regenerarLink}
                      disabled={gerandoLink}
                      style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', color: '#767069', fontSize: '12px', padding: '9px 14px', cursor: 'pointer' }}
                    >
                      {gerandoLink ? '...' : '🔄 Novo link'}
                    </button>
                  </div>
                </div>
              )}

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
                {(() => {
                  const sched = (() => { try { return JSON.parse(form.habilidades || '{}') } catch { return {} } })() as any
                  const resp = (() => { try { return JSON.parse(form.contato_responsavel || '{}') } catch { return { nome: form.contato_responsavel || '', tel: '' } } })() as any
                  const horas = Array.from({ length: 18 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`)
                  const dias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
                  const folgas: string[] = sched.dias_folga || []
                  const inp2 = (label: string, val: string, onChange: (v: string) => void, opts?: { type?: string; placeholder?: string; full?: boolean }) => (
                    <div className={opts?.full ? 'col-span-2' : ''}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#767069', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
                      <input type={opts?.type || 'text'} value={val} onChange={e => onChange(e.target.value)} placeholder={opts?.placeholder || label}
                        style={{ width: '100%', background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none' }} />
                    </div>
                  )
                  return (
                    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e8e6e0', padding: '20px', marginBottom: '16px' }}>
                      <h3 style={{ color: '#5b4fcf', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px' }}>👤 Dados Pessoais</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {inp2('Nome Completo *', form.nome_completo, v => setForm(f => ({ ...f, nome_completo: v })), { full: true })}
                        {inp2('Apelido', form.apelido, v => setForm(f => ({ ...f, apelido: v })))}
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#767069', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cargo / Categoria</label>
                          {novaCategoria ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input type="text" placeholder="Nova categoria..." value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                                style={{ flex: 1, background: '#ffffff', border: '1px solid #5b4fcf', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none' }} autoFocus />
                              <button type="button" onClick={() => setNovaCategoria(false)} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '9px 12px', color: '#767069', cursor: 'pointer', fontSize: '12px' }}>← Voltar</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <select value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                                style={{ flex: 1, background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: form.cargo ? '#1a1a1a' : '#767069', outline: 'none' }}>
                                <option value="">Selecione...</option>
                                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <button type="button" onClick={() => { setNovaCategoria(true); setForm(f => ({ ...f, cargo: '' })) }}
                                style={{ background: '#5b4fcf20', border: '1px solid #5b4fcf40', borderRadius: '8px', padding: '9px 12px', color: '#5b4fcf', cursor: 'pointer', fontSize: '18px', fontWeight: 700 }}>+</button>
                            </div>
                          )}
                        </div>
                        {inp2('CPF', form.cpf, v => setForm(f => ({ ...f, cpf: v })), { placeholder: '000.000.000-00' })}
                        {inp2('RG', form.rg, v => setForm(f => ({ ...f, rg: v })))}
                        {inp2('Data de Aniversário', form.data_aniversario, v => setForm(f => ({ ...f, data_aniversario: v })), { type: 'date' })}
                        {inp2('E-mail', form.email, v => setForm(f => ({ ...f, email: v })), { type: 'email' })}
                        {/* ── ENDEREÇO ESTRUTURADO ── */}
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 60px', gap: '8px', alignItems: 'end' }}>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#767069', display: 'block', marginBottom: '4px' }}>CEP</label>
                              <div style={{ position: 'relative' }}>
                                <input value={formCep} onChange={e => { const v = e.target.value.replace(/\D/g,'').slice(0,8); setFormCep(v); if (v.length === 8) buscarCep(v) }}
                                  placeholder="00000000" maxLength={8}
                                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #dedad4', borderRadius: '8px', fontSize: '13px', background: '#fafaf8', color: '#1a1a1a', outline: 'none', paddingRight: buscandoCep ? '32px' : '12px' }} />
                                {buscandoCep && <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#5b4fcf' }}>⏳</span>}
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#767069', display: 'block', marginBottom: '4px' }}>Bairro</label>
                              <input value={formBairro} onChange={e => setFormBairro(e.target.value)} placeholder="Bairro"
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #dedad4', borderRadius: '8px', fontSize: '13px', background: '#fafaf8', color: '#1a1a1a', outline: 'none' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#767069', display: 'block', marginBottom: '4px' }}>Cidade</label>
                              <input value={formCidade} onChange={e => setFormCidade(e.target.value)} placeholder="Cidade"
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #dedad4', borderRadius: '8px', fontSize: '13px', background: '#fafaf8', color: '#1a1a1a', outline: 'none' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 600, color: '#767069', display: 'block', marginBottom: '4px' }}>UF</label>
                              <input value={formUf} onChange={e => setFormUf(e.target.value.toUpperCase().slice(0,2))} placeholder="UF" maxLength={2}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #dedad4', borderRadius: '8px', fontSize: '13px', background: '#fafaf8', color: '#1a1a1a', outline: 'none', textAlign: 'center' }} />
                            </div>
                          </div>
                          {(formBairro || formCidade) && <p style={{ fontSize: '10px', color: '#a09890', marginTop: '4px' }}>📍 {[formBairro, formCidade && formUf ? `${formCidade}-${formUf}` : formCidade, formCep ? `CEP: ${formCep}` : ''].filter(Boolean).join(', ')}</p>}
                        </div>
                        {inp2('Nome do Responsável', resp.nome || '', v => { const c = (() => { try { return JSON.parse(form.contato_responsavel || '{}') } catch { return {} } })(); setForm(f => ({ ...f, contato_responsavel: JSON.stringify({ ...c, nome: v }) })) })}
                        {inp2('Telefone do Responsável', resp.tel || '', v => { const c = (() => { try { return JSON.parse(form.contato_responsavel || '{}') } catch { return {} } })(); setForm(f => ({ ...f, contato_responsavel: JSON.stringify({ ...c, tel: v }) })) }, { placeholder: '(00) 00000-0000' })}
                      </div>

                      {/* Dias de Folga */}
                      <div style={{ marginTop: '16px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#767069', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dias de Folga</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {dias.map(d => {
                            const on = folgas.includes(d)
                            return (
                              <button key={d} type="button" onClick={() => {
                                const novo = on ? folgas.filter(x => x !== d) : [...folgas, d]
                                setForm(f => ({ ...f, habilidades: JSON.stringify({ ...sched, dias_folga: novo }) }))
                              }}
                                style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, border: `1px solid ${on ? '#06b6d4' : '#e8e6e0'}`, background: on ? '#06b6d420' : '#ffffff', color: on ? '#0891b2' : '#767069', cursor: 'pointer' }}>
                                {d}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Horário de Trabalho */}
                      <div style={{ marginTop: '16px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#767069', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Horário de Trabalho</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#a09890', marginBottom: '4px' }}>De</label>
                            <select value={sched.h_inicio || ''} onChange={e => setForm(f => ({ ...f, habilidades: JSON.stringify({ ...sched, h_inicio: e.target.value }) }))}
                              style={{ width: '100%', background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none' }}>
                              <option value="">Selecione</option>
                              {horas.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#a09890', marginBottom: '4px' }}>Até</label>
                            <select value={sched.h_fim || ''} onChange={e => setForm(f => ({ ...f, habilidades: JSON.stringify({ ...sched, h_fim: e.target.value }) }))}
                              style={{ width: '100%', background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none' }}>
                              <option value="">Selecione</option>
                              {horas.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: '#a09890', marginBottom: '4px' }}>Observação de Horário</label>
                            <input value={sched.h_obs || ''} onChange={e => setForm(f => ({ ...f, habilidades: JSON.stringify({ ...sched, h_obs: e.target.value }) }))}
                              placeholder="Ex: Nas terças-feiras entra às 14:00"
                              style={{ width: '100%', background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none' }} />
                          </div>
                        </div>
                      </div>

                      {/* Serviços que Realiza */}
                      <div style={{ marginTop: '16px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#767069', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Serviços que Realiza</label>
                        <div style={{ position: 'relative' }}>
                          <button type="button" onClick={() => setServicosAberto(o => !o)}
                            style={{ width: '100%', background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: servicosSelecionados.length ? '#1a1a1a' : '#a09890', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{servicosSelecionados.length ? `${servicosSelecionados.length} serviço(s) selecionado(s)` : 'Clique para selecionar serviços...'}</span>
                            <span style={{ fontSize: '10px' }}>▼</span>
                          </button>
                          {servicosAberto && servicosSalao.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#ffffff', border: '1px solid #e8e6e0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '260px', overflowY: 'auto', marginTop: '4px' }}>
                              {servicosSalao.filter((s: any) => s.ativo !== false).map((s: any) => {
                                const sel = servicosSelecionados.includes(s.id)
                                return (
                                  <button key={s.id} type="button" onClick={() => setServicosSelecionados(prev => sel ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: sel ? '#f5f3ff' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f0eeea' }}>
                                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${sel ? '#5b4fcf' : '#d0cec8'}`, background: sel ? '#5b4fcf' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {sel && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '12px', color: '#1a1a1a', fontWeight: sel ? 600 : 400 }}>{s.nome}</div>
                                      {s.categoria && <div style={{ fontSize: '10px', color: '#a09890' }}>{s.categoria}</div>}
                                    </div>
                                    {s.comissao_valor && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#5b4fcf', fontWeight: 600 }}>R${Number(s.comissao_valor).toFixed(0)}</span>}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                        {servicosSelecionados.length > 0 && (
                          <p style={{ fontSize: '10px', color: '#5b4fcf', marginTop: '4px' }}>
                            → {servicosSalao.filter(s => servicosSelecionados.includes(s.id)).map(s => s.nome).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* PERFIL PESSOAL */}
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e8e6e0', padding: '20px', marginBottom: '16px' }}>
                  <h3 style={{ color: '#f43f8e', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px' }}>✨ Perfil Pessoal</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {F('Cor Favorita', 'cor_favorita')}
                    {F('Comida Favorita', 'comida_favorita')}
                    {F('Animal Favorito', 'animal_favorito')}
                    <div />
                    {TA('Hobbies e Paixões', 'hobbies', 2)}
                    {TA('Um Sonho', 'um_sonho', 2)}
                  </div>
                </div>

                {/* DADOS PROFISSIONAIS */}
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e8e6e0', padding: '20px', marginBottom: '24px' }}>
                  <h3 style={{ color: '#0891b2', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 16px' }}>💼 Dados Profissionais</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {F('CNPJ (MEI)', 'cnpj', { placeholder: '00.000.000/0001-00' })}
                    {F('Dados Bancários (Banco / Ag / Conta)', 'conta_bancaria', { placeholder: 'Banco / Ag / Conta' })}
                    {TA('Certificados de Curso', 'certificados', 3)}
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

          {/* ── DISTRATO ── */}
          {secao === 'distrato' && (
            <div style={{ maxWidth: '860px' }}>
              {/* Cabeçalho toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Distrato de Contrato de Parceria</h2>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button onClick={() => setDistratoEditando(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: distratoEditando ? '#5b4fcf' : '#f0eeea', color: distratoEditando ? '#fff' : '#444', border: '1px solid #d6d3ce', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    <Edit2 size={14} /> {distratoEditando ? 'Concluir Edição' : 'Editar Arquivo por Completo'}
                  </button>
                  <button onClick={imprimirDistrato} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#5b4fcf,#f43f8e)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    🖨️ Imprimir
                  </button>
                </div>
              </div>

              {/* Seletor de profissional */}
              <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#444', display: 'block', marginBottom: '8px' }}>Selecionar Profissional (Distratado)</label>
                <select
                  value={distratoProf?.id || ''}
                  onChange={e => { const p = profissionais.find(x => x.id === e.target.value); if (p) preencherDistrato(p) }}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d6d3ce', borderRadius: '8px', fontSize: '14px', background: '#fafaf8', color: '#1a1a1a' }}
                >
                  <option value=''>— Selecione o profissional —</option>
                  {profissionais.filter(p => p.ativo || p.status_cadastro === 'pendente').map(p => (
                    <option key={p.id} value={p.id}>{p.nome_completo}{p.cargo ? ` — ${p.cargo}` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Documento */}
              <div style={{ background: '#fff', border: '1px solid #d6d3ce', borderRadius: '12px', padding: '48px', fontFamily: "'Times New Roman', Times, serif", fontSize: '12pt', lineHeight: 1.6, color: '#000' }}>
                {/* Título */}
                <h1 style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '32px' }}>
                  Distrato de Contrato de Parceria
                </h1>

                {/* Aviso se faltar dados do salão */}
                {(!dSalaoCNPJ || !dSalaoEndereco) && (
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: '#92400e', fontFamily: 'sans-serif' }}>
                    ⚠️ Preencha CNPJ, endereço e cidade do salão em <strong>Meu Perfil</strong> para o distrato ficar completo.
                  </div>
                )}

                {/* Painel de edição completa */}
                {distratoEditando && (
                  <div style={{ background: '#f5f4f0', border: '1px solid #d6d3ce', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#5b4fcf', margin: '0 0 12px', fontFamily: 'sans-serif' }}>✏️ DADOS DO SALÃO (DISTRATANTE)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Nome do Salão<input style={iStyle} value={dSalaoNome} onChange={e => setDSalaoNome(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Cidade/Estado<input style={iStyle} value={dSalaoCidade} onChange={e => setDSalaoCidade(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Endereço do Salão<input style={iStyle} value={dSalaoEndereco} onChange={e => setDSalaoEndereco(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>CNPJ do Salão<input style={iStyle} value={dSalaoCNPJ} onChange={e => setDSalaoCNPJ(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Responsável do Salão<input style={iStyle} value={dSalaoResponsavel} onChange={e => setDSalaoResponsavel(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>RG do Responsável<input style={iStyle} value={dSalaoRG} onChange={e => setDSalaoRG(e.target.value)} /></label>
                    </div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', margin: '0 0 12px', fontFamily: 'sans-serif' }}>✏️ DADOS DO PROFISSIONAL (DISTRATADO)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Nome do Profissional<input style={iStyle} value={dProfNome} onChange={e => setDProfNome(e.target.value.toUpperCase())} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>CPF do Profissional<input style={iStyle} value={dProfCPF} onChange={e => setDProfCPF(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>CNPJ do Profissional<input style={iStyle} value={dProfCNPJ} onChange={e => setDProfCNPJ(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Endereço do Profissional<input style={iStyle} value={dProfEndereco} onChange={e => setDProfEndereco(e.target.value)} /></label>
                    </div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#444', margin: '0 0 12px', fontFamily: 'sans-serif' }}>✏️ DATAS</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Data início do contrato<input style={iStyle} value={dDataContrato} onChange={e => setDDataContrato(e.target.value)} placeholder="dd/mm/aaaa" /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Local do distrato<input style={iStyle} value={dLocalDistrato} onChange={e => setDLocalDistrato(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Data do distrato<input style={iStyle} value={dDataDistrato} onChange={e => setDDataDistrato(e.target.value)} placeholder="dd/mm/aaaa" /></label>
                    </div>
                  </div>
                )}

                {/* ── PARÁGRAFO DAS PARTES (igual ao Word: um só bloco) ── */}
                <p style={{ textAlign: 'justify', marginBottom: '14pt', fontFamily: 'inherit' }}>
                  <strong>{dSalaoNome.toUpperCase() || '[NOME DO SALÃO]'}</strong>, com sede na cidade de {dSalaoCidade}{dSalaoEndereco ? `, ${dSalaoEndereco}` : ''}, inscrita no CNPJ sob o n°{' '}
                  {dSalaoCNPJ || '[CNPJ]'}, neste ato representada por {dSalaoResponsavel || '[RESPONSÁVEL]'}{dSalaoRG ? `, RG ${dSalaoRG}` : ''}, doravante denominada simplesmente{' '}
                  <strong>DISTRATANTE</strong>, <strong>{dProfNome.toUpperCase() || '[NOME DO PROFISSIONAL]'}</strong>{dProfCPF ? ` ${dProfCPF}` : ''}, com sede na cidade de {dProfEndereco || '___________________________'}{dProfCNPJ ? ` inscrita no CNPJ sob o n° ${dProfCNPJ}` : ''}, neste ato representada{' '}
                  {dProfNome || '[NOME DO PROFISSIONAL]'} doravante denominada simplesmente <strong>DISTRATADA</strong>, têm entre os mesmos, de maneira justa e acordada, o presente{' '}
                  <strong>DISTRATO DE CONTRATO DE PARCERIA</strong>, ficando desde já aceito, pelas cláusulas abaixo descritas:
                </p>

                {/* ── CLÁUSULA 1 ── */}
                <p style={{ textAlign: 'justify', marginBottom: '10pt', fontFamily: 'inherit' }}>
                  <strong>1)&nbsp;&nbsp;&nbsp;&nbsp; Do Objeto e Considerações do Contrato:</strong>
                </p>
                <p style={{ textAlign: 'justify', marginBottom: '14pt', fontFamily: 'inherit' }}>
                  O presente tem como OBJETO o contrato de parceria celebrado entre as partes neste mencionadas, o qual teve como fundamento, o seguinte: O SALÃO-PARCEIRO, empresa destinada à prestação de serviços de salão de beleza e afins, proprietária e/ou possuidora de bens móveis e de instalação para barbeiros, cabeleireiros, manicuras, pedicuras, esteticistas, massagistas, maquiadores, escovistas, calistas, depiladores e demais profissões afins, sendo proprietária e possuidora de espaço, equipamentos e móveis apropriados à atividade desses profissionais, estabelece parceria com o PROFISSIONAL-PARCEIRO, pelo que a ele dá, em locação e/ou uso, móveis, aparelhos, utensílios e produtos de sua propriedade e/ou posse, para fins de exploração específica da atividade de cabeleireira e outras que porventura sejam praticadas exclusivamente dentro da abrangência da Lei 13.352, de 27 de outubro de 2016, em serviços de beleza, dentro do seu objeto social, não podendo o PROFISSIONAL-PARCEIRO usar os objetos dados em locação para quaisquer outros fins. Além dos bens dados em locação, o SALÃO-PARCEIRO também concede, ao PROFISSIONAL-PARCEIRO, serviços de gestão, de apoio administrativo e de escritório, tais como, exemplificativamente, cobrança e recebimento de valores pagos pelos clientes atendidos por ela, datado do dia{' '}
                  <input value={dDataContrato} onChange={e => setDDataContrato(e.target.value)} placeholder="dd/mm/aaaa"
                    style={{ border: 'none', borderBottom: '2px solid #ef4444', background: 'transparent', fontFamily: 'inherit', fontSize: 'inherit', width: '110px', outline: 'none', textAlign: 'center', color: dDataContrato ? 'inherit' : '#ef4444', fontWeight: dDataContrato ? 'inherit' : 600 }} />.
                </p>

                {/* ── CLÁUSULA 1.1 ── */}
                <p style={{ textAlign: 'justify', marginBottom: '32pt', fontFamily: 'inherit' }}>
                  <strong>1.1)</strong> As partes resolvem, nesta data, em comum acordo, que, considerando que não existem pendências de ambas as partes, fica consumado o distrato.
                </p>

                {/* ── Local e data ── */}
                <p style={{ marginBottom: '48pt', fontFamily: 'inherit', textAlign: 'center' }}>
                  <input value={dLocalDistrato} onChange={e => setDLocalDistrato(e.target.value)}
                    style={{ border: 'none', borderBottom: '2px solid #ef4444', background: 'transparent', fontFamily: 'inherit', fontSize: 'inherit', width: '120px', outline: 'none', textAlign: 'center', color: dLocalDistrato ? 'inherit' : '#ef4444' }} />,{' '}
                  <input value={dDataDistrato} onChange={e => setDDataDistrato(e.target.value)}
                    style={{ border: 'none', borderBottom: '2px solid #ef4444', background: 'transparent', fontFamily: 'inherit', fontSize: 'inherit', width: '120px', outline: 'none', textAlign: 'center', color: '#ef4444', fontWeight: 600 }} />
                </p>

                {/* ── Assinaturas (igual ao Word: linhas __ com label abaixo) ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32pt' }}>
                  <div style={{ width: '42%' }}>
                    <div>________________________</div>
                    <div>DISTRATANTE</div>
                  </div>
                  <div style={{ width: '42%' }}>
                    <div>____________________</div>
                    <div>DISTRATADO</div>
                  </div>
                </div>

                {/* ── Testemunhas (igual ao Word: cada campo em linha separada) ── */}
                <p style={{ marginBottom: '8pt', fontFamily: 'inherit' }}>Testemunhas:</p>
                <p style={{ marginBottom: '4pt', fontFamily: 'inherit' }}>1ª) Ass. _________________________</p>
                <p style={{ marginBottom: '4pt', fontFamily: 'inherit' }}>Nome:</p>
                <p style={{ marginBottom: '20pt', fontFamily: 'inherit' }}>RG:</p>
                <p style={{ marginBottom: '4pt', fontFamily: 'inherit' }}>2ª) Ass. _________________________</p>
                <p style={{ marginBottom: '4pt', fontFamily: 'inherit' }}>Nome:</p>
                <p style={{ fontFamily: 'inherit' }}>RG:</p>
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
