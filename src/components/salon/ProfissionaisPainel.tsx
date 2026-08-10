'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Search, UserCheck, UserX, Edit2, Trash2, Upload, X, ChevronRight, Users, FileText, Briefcase, Clock, Award, BookOpen, FileSignature, AlertCircle, TrendingUp, Building2, Menu, Mail, Send, ScrollText, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import MateriaisTrabalho from '@/components/salon/MateriaisTrabalho'
import ProcessoContratacao from '@/components/salon/ProcessoContratacao'
import { PJ_CONTRATACAO, PJ_DESLIGAMENTO } from '@/components/salon/processoDefaults'
import EditorAvaliacao from '@/components/salon/EditorAvaliacao'
import DescricaoCargo from '@/components/salon/DescricaoCargo'
import PlanoCarreiraPJ from '@/components/salon/PlanoCarreiraPJ'
import NormaConduta from '@/components/salon/NormaConduta'
import AcessoGlobalProfissionais from '@/components/salon/AcessoGlobalProfissionais'
import { confirmarSaidaSemSalvar } from '@/lib/guardaSalvar'
import { urlPublica } from '@/lib/urlPublica'

// Aviso de demanda nos cards de setor: vermelho sobre o rosa claro do card.
// (Ja foi marrom escuro; pesou demais nesta tela e voltou ao discreto.)
const AVISO_DEMANDA: React.CSSProperties = {
  color: '#ef4444', fontSize: 10, marginTop: 2, fontWeight: 600,
}

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
  chave_pix?: string
  criado_em: string
}

const SIDEBAR_ITEMS = [
  { id: 'cadastrar',    label: 'Cadastrar Profissional',          icon: Plus,           cor: '#5b4fcf', destaque: true },
  { id: 'lista',        label: 'Lista de Profissionais',          icon: Users,          cor: '#06b6d4' },
  { id: 'solicitacao',  label: 'Solicitação',                     icon: Send,           cor: '#8b5cf6' },
  { id: 'acesso_global', label: 'Acesso dos Profissionais',        icon: KeyRound,       cor: '#5b4fcf' },
  { id: 'ranking',      label: 'Ranking de Avaliações',           icon: TrendingUp,     cor: '#f59e0b' },
  { id: 'categorias',   label: 'Gerenciar Categorias',            icon: Award,          cor: '#f59e0b' },
  { id: 'abertura',     label: 'Abertura de Conta Bancária',      icon: Building2,      cor: '#10b981' },
  { id: 'cnpj',         label: 'CNPJ',                            icon: FileText,       cor: '#f59e0b' },
  { id: 'clt',          label: 'CLT',                             icon: Briefcase,      cor: '#0ea5e9' },
  { id: 'entrevista',   label: 'Ficha para Entrevista',           icon: Briefcase,      cor: '#3b82f6' },
  { id: 'contratacao',  label: 'Processo de Contratação',         icon: FileSignature,  cor: '#8b5cf6' },
  { id: 'materiais',    label: 'Materiais para Trabalho',         icon: BookOpen,       cor: '#ec4899' },
  { id: 'perfil',       label: 'Perfil Ideal de Profissional',    icon: UserCheck,      cor: '#14b8a6' },
  { id: 'horarios',     label: 'Horários e Folgas',               icon: Clock,          cor: '#f97316' },
  { id: 'distrato',     label: 'Distrato',                        icon: AlertCircle,    cor: '#ef4444' },
  { id: 'contrato',     label: 'Contrato de Trabalho',            icon: FileText,       cor: '#6366f1' },
  { id: 'conduta',      label: 'Norma de Conduta',                icon: ScrollText,     cor: '#e11d48' },
  { id: 'certificados', label: 'Certificados',                    icon: Award,          cor: '#d946ef' },
  { id: 'carreira',     label: 'Plano de Carreira',               icon: TrendingUp,     cor: '#22c55e' },
  { id: 'descricao_cargo', label: 'Descrição de Cargo',           icon: FileText,       cor: '#0891b2' },
]

// Normaliza texto: maiúsculo, sem acento, sem espaço extra (para comparar categorias)
function norm(s: string): string {
  return (s || '').toUpperCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const lblFer: React.CSSProperties = { fontSize: 10, color: '#6b6860', display: 'block', marginBottom: 2 }
const inpFer: React.CSSProperties = { width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #cdd9e3', fontSize: 12 }

const CONTEUDO_INFO: Record<string, { titulo: string; texto: string }> = {
  abertura:     { titulo: 'Abertura de Conta Bancária', texto: 'Oriente o profissional a abrir uma conta PJ no banco de sua preferência. Documentos necessários: RG, CPF, comprovante de residência e CNPJ (se MEI). Bancos recomendados: Nubank PJ, Inter PJ, Caixa, Bradesco.' },
  contratacao:  { titulo: 'Processo de Contratação', texto: 'Etapas: 1. Entrevista inicial → 2. Período de teste (7 dias) → 3. Avaliação técnica → 4. Negociação de comissão → 5. Assinatura de contrato → 6. Cadastro no sistema → 7. Integração com a equipe.' },
  perfil:       { titulo: 'Perfil Ideal de Profissional', texto: 'Buscamos profissionais: ✅ Pontuais e comprometidos ✅ Com cartela de clientes ✅ Que valorizam higiene e organização ✅ Comunicativos e empáticos ✅ Com CNPJ ativo ✅ Abertos a feedback e treinamento contínuo.' },
  certificados: { titulo: 'Certificados', texto: 'Solicite cópias dos certificados de cursos concluídos: colorimetria, corte, escova, tratamentos capilares, manicure, podologia, etc. Guarde digitalmente na ficha do profissional. Incentive atualização constante.' },
}

// Guia para entrevistas com novos profissionais (modelo fiel ao PDF)
const GUIA_ENTREVISTA = {
  antes: [
    'Caso a entrevista seja agendada, atenda no horário. Seja acolhedor e simpático.',
    'Trate o entrevistado como você trataria um cliente. Crie um clima de confiança.',
    'Leve um copo de água para você e um para a pessoa entrevistada.',
  ],
  blocos: [
    {
      titulo: 'Bloco 1 — Histórico', perguntas: [
        'Conte-me como você iniciou na profissão. Lugares que já trabalhou.',
        'Desses lugares, qual você mais gostou e qual menos gostou (qual o motivo)?',
        'Com relação ao último lugar que você trabalhou, o que você mais gostava lá, e o que gostaria que fosse diferente?',
        'Se eu ligar para a última empresa que você trabalhou, o que acha que falarão de você?',
        'Ouvindo sua história, me chama atenção... Por que isso aconteceu?',
      ]
    },
    {
      titulo: 'Bloco 2 — Comportamento e atitudes', perguntas: [
        'Na sua opinião, quais são as qualidades de um profissional com AGENDA CHEIA?',
        'Você se considera um profissional de sucesso?',
        'Do que você mais se orgulha em sua vida profissional?',
        'O que o motiva a querer dar o seu melhor todos os dias?',
        'Com relação aos colegas de trabalho/lideranças, o que mais lhe incomoda?',
        'Conte uma situação dentro do salão que não foi positiva (com clientes ou equipe).',
        'O que você aprendeu com essa situação?',
        'Diga-me dois pontos que você deseja melhorar profissionalmente.',
        'Hoje precisamos trabalhar com metas, buscar melhores resultados. Como você lida com essa pressão no dia a dia?',
      ]
    },
    {
      titulo: 'Bloco 3 — Misto entre vida pessoal e profissional', perguntas: [
        'Fale-me um pouco da sua vida pessoal. Casado(a), filhos, o que gosta de fazer no tempo livre?',
        'Como foi sua formação na profissão (cursos)?',
        'Posso ver seus trabalhos em alguma rede social? Quais?',
        'Em quais serviços você se realiza mais?',
        'Tem algum serviço que você presta, mas que não gosta muito? Qual?',
        'Como se atualiza? Qual foi a última especialização que você fez?',
        'Como você se mantém atualizado sobre novas tendências?',
        'Quais profissionais/pessoas o inspiram na profissão? Você segue alguém (ou algum canal)? Quais?',
      ]
    },
    {
      titulo: 'Bloco 4 — A empresa', perguntas: [
        'O que você sabe sobre a nossa empresa?',
        'Como ficou sabendo da vaga?',
        'O que você gostaria de saber sobre nós ou sobre a vaga?',
        'Tenho alguns candidatos para essa vaga, por que devo contratar você?',
        'Você tem disponibilidade para fazer um teste?',
        'Se eu contratar você hoje, poderia começar amanhã (ou na próxima segunda)?',
      ]
    },
    {
      titulo: 'Bloco 5 — Objetivos', perguntas: [
        'Com relação ao seu rateio/comissão, qual o valor mínimo que você precisa fazer nos três primeiros meses?',
        'Você tem reserva financeira para pagar suas despesas (aluguel, transporte, alimentação) nos primeiros meses?',
        'Qual a sua meta de rateio/comissão para daqui a 12 meses?',
        'O que você pretende fazer para atrair clientes?',
      ]
    },
    {
      titulo: 'Bloco 6 — Documentação e outros (se estiver certo da contratação)', perguntas: [
        'Fale sobre a forma de pagamento (comissões e datas de pagamento).',
        'Existe algum desconto? Quais?',
        'Apresente a tabela de preços.',
        'Qual documentação o profissional precisa entregar?',
        'Materiais necessários para a vaga.',
        'Horário desejável de atendimento.',
        'Vestimenta indicada.',
        'Dia e horário para começar.',
      ]
    },
  ],
  nota: 'Deixe para falar sobre as regras, os valores, a história da empresa e o conhecimento sobre o sistema de informação no primeiro dia de trabalho, quando o profissional já estiver contratado.',
}

const FORM_INITIAL = {
  nome_completo: '', apelido: '', email: '', cpf: '', rg: '', cnpj: '', cargo: '',
  habilidades: '{}', endereco: '', data_aniversario: '', cor_favorita: '', comida_favorita: '',
  animal_favorito: '', hobbies: '', um_sonho: '', contato_responsavel: '{}', certificados: '',
  foto_url: '', conta_bancaria: '', chave_pix: '',
}

// secaoFixa: abre direto numa secao (usado dentro do setor).
// embutido: sem a moldura de pagina (topo + sidebar), para caber no setor.
export default function ProfissionaisPainel({ secaoFixa = '', embutido = false }: { secaoFixa?: string; embutido?: boolean } = {}) {
  const router = useRouter()
  const [secao, setSecao] = useState(secaoFixa || 'lista')
  // Link direto (busca global): /salon/profissionais?secao=carreira
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('secao')
    if (s && SIDEBAR_ITEMS.some(i => i.id === s)) setSecao(s)
  }, [])
  const [cltSub, setCltSub] = useState<'clt' | 'exame' | 'processo'>('clt')
  const [cnpjSub, setCnpjSub] = useState<'cnpj' | 'contratacao' | 'desligamento'>('cnpj')
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
  const [catsCustom, setCatsCustom] = useState<string[]>([])
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
  const [dSalaoNacionalidade, setDSalaoNacionalidade] = useState('brasileira')
  const [dSalaoEstadoCivil, setDSalaoEstadoCivil] = useState('casada')
  const [dSalaoProfissao, setDSalaoProfissao] = useState('empresária')
  const [dSalaoOrgaoRG, setDSalaoOrgaoRG] = useState('SSP/RS')
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

  // ── CONTRATO DE TRABALHO (parceria) ──
  const [contratoProf, setContratoProf] = useState<Profissional | null>(null)
  const [contratoEditando, setContratoEditando] = useState(false)
  const [contratoPendencias, setContratoPendencias] = useState<string[]>([])
  const [distratoPendencias, setDistratoPendencias] = useState<string[]>([])
  // Painel de CNPJ (status + observação por profissional)
  const [cnpjEdits, setCnpjEdits] = useState<Record<string, { status?: string; obs?: string }>>({})
  const [cnpjSalvando, setCnpjSalvando] = useState<string | null>(null)
  const [aprovandoId, setAprovandoId] = useState<string | null>(null)
  const [souDono, setSouDono] = useState(false)   // só o salão principal cria/exclui departamento
  // Boletos vencidos — vira aviso vermelho no card do setor FINANCEIRO
  const [boletosVencidos, setBoletosVencidos] = useState(0)

  // Criar departamento
  const [novoDep, setNovoDep] = useState(false)
  const [novoDepNome, setNovoDepNome] = useState('')
  const [novoDepCor, setNovoDepCor] = useState('#5b4fcf')
  const [criandoDep, setCriandoDep] = useState(false)
  async function criarDepartamento() {
    const nome = novoDepNome.trim().toUpperCase()
    if (!nome) { toast.error('Dê um nome ao departamento'); return }
    setCriandoDep(true)
    try {
      const res = await fetch('/api/profissionais', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome_completo: nome, is_departamento: true, departamento_cor: novoDepCor, ativo: true }) })
      if (res.ok) { toast.success('Departamento criado!'); setNovoDep(false); setNovoDepNome(''); setNovoDepCor('#5b4fcf'); carregarProfissionais() }
      else toast.error('Erro ao criar')
    } catch { toast.error('Erro de conexão') }
    setCriandoDep(false)
  }
  async function excluirDepartamento(dep: Profissional) {
    if (!confirm(`Excluir o departamento "${dep.nome_completo}"? As demandas dele serão perdidas.`)) return
    try {
      const res = await fetch(`/api/profissionais/${dep.id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Departamento excluído'); carregarProfissionais() } else toast.error('Erro ao excluir')
    } catch { toast.error('Erro de conexão') }
  }

  // Enviar solicitação (dono escolhe o remetente)
  const [solDep, setSolDep] = useState('')
  const [solRemetente, setSolRemetente] = useState('')
  const [solMsg, setSolMsg] = useState('')
  const [solPrio, setSolPrio] = useState('normal')
  const [enviandoSol, setEnviandoSol] = useState(false)
  async function enviarSolicitacao() {
    if (!solDep || !solRemetente || !solMsg.trim()) { toast.error('Preencha departamento, remetente e a solicitação'); return }
    setEnviandoSol(true)
    try {
      const res = await fetch('/api/solicitacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ departamento_id: solDep, solicitante_id: solRemetente, mensagem: solMsg.trim(), prioridade: solPrio }) })
      if (res.ok) { toast.success('Solicitação enviada ao departamento!'); setSolMsg(''); setSolPrio('normal'); carregarProfissionais() }
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Erro ao enviar') }
    } catch { toast.error('Erro de conexão') }
    setEnviandoSol(false)
  }

  // Aprovar autocadastro público: marca como aprovado E ativa em uma tacada só.
  async function aprovarCadastro(prof: Profissional) {
    setAprovandoId(prof.id)
    try {
      const res = await fetch(`/api/profissionais/${prof.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status_cadastro: 'aprovado', ativo: true }) })
      if (res.ok) { toast.success('Cadastro aprovado e ativado!'); carregarProfissionais() } else toast.error('Erro ao aprovar')
    } catch { toast.error('Erro de conexão') }
    setAprovandoId(null)
  }

  // Recusar autocadastro: mantém inativo e tira da fila (status "recusado").
  async function recusarCadastro(prof: Profissional) {
    if (!window.confirm(`Recusar o cadastro de ${prof.nome_completo || prof.apelido || 'este profissional'}? Ele ficará inativo e sairá da fila de aprovação.`)) return
    setAprovandoId(prof.id)
    try {
      const res = await fetch(`/api/profissionais/${prof.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status_cadastro: 'recusado', ativo: false }) })
      if (res.ok) { toast.success('Cadastro recusado.'); carregarProfissionais() } else toast.error('Erro ao recusar')
    } catch { toast.error('Erro de conexão') }
    setAprovandoId(null)
  }

  async function salvarCnpj(prof: Profissional) {
    const e = cnpjEdits[prof.id] || {}
    const status = e.status ?? (prof as any).cnpj_status ?? (prof.cnpj ? 'ok' : 'pendente')
    const obs = e.obs ?? (prof as any).cnpj_observacao ?? ''
    setCnpjSalvando(prof.id)
    try {
      const res = await fetch(`/api/profissionais/${prof.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cnpj_status: status, cnpj_observacao: obs }) })
      if (res.ok) { toast.success('Salvo!'); setCnpjEdits(p => { const n = { ...p }; delete n[prof.id]; return n }); carregarProfissionais() } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setCnpjSalvando(null)
  }

  // Painel CLT (observação por profissional)
  const [cltEdits, setCltEdits] = useState<Record<string, { obs?: string }>>({})
  const [cltFerias, setCltFerias] = useState<Record<string, any>>({})
  const [cltSalvando, setCltSalvando] = useState<string | null>(null)
  const getFerias = (p: Profissional) => {
    if (cltFerias[p.id]) return cltFerias[p.id]
    const raw = (p as any).ferias
    if (!raw) return {}
    if (typeof raw === 'object') return raw // coluna jsonb já vem como objeto
    try { return JSON.parse(raw) || {} } catch { return {} }
  }
  const setFeriasCampo = (id: string, campo: string, val: string) => setCltFerias(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), [campo]: val } }))
  // Calcula situação das férias (período aquisitivo de 12 meses)
  function feriasInfo(p: Profissional, fer: any) {
    if (fer?.fut1_ini) return { tipo: 'agendada', texto: 'Férias agendada', cor: '#16a34a' }
    const base = fer?.ult_fim || (p as any).data_admissao
    if (!base) return { tipo: 'sem', texto: 'Sem referência (defina admissão ou última férias)', cor: '#9ca3af' }
    const due = new Date(base + 'T00:00:00'); due.setFullYear(due.getFullYear() + 1)
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const dias = Math.round((due.getTime() - hoje.getTime()) / 86400000)
    if (dias < 0) return { tipo: 'vencida', texto: `Vencida há ${Math.abs(Math.round(dias / 30))} mês(es)`, cor: '#dc2626' }
    const meses = Math.floor(dias / 30)
    return { tipo: 'ok', texto: `Faltam ${meses} mês(es) e ${dias % 30} dia(s)`, cor: dias < 60 ? '#ea580c' : '#0891b2' }
  }
  // Categorias administrativas que NÃO são profissionais reais (só buckets de ocorrência)
  const CATS_ADMIN = ['ADMINISTRATIVO', 'FINANCEIRO', 'GERENCIA']
  // Exclui do painel CNPJ: admin, recepção (é CLT) e quem é CLT
  const excluiCnpj = (p: Profissional) => {
    const cg = norm(p.cargo || ''), nm = norm(p.nome_completo || '')
    return CATS_ADMIN.includes(cg) || CATS_ADMIN.includes(nm) || cg.startsWith('RECEP') || nm.startsWith('RECEP') || norm((p as any).vinculo || '') === 'CLT'
  }
  // CLT = somente quem tem vínculo CLT, EXCETO as categorias administrativas
  const ehClt = (p: Profissional) => {
    const cg = norm(p.cargo || ''), nm = norm(p.nome_completo || '')
    if (CATS_ADMIN.includes(cg) || CATS_ADMIN.includes(nm)) return false
    return norm((p as any).vinculo || '') === 'CLT'
  }

  async function salvarClt(prof: Profissional) {
    const obs = (cltEdits[prof.id]?.obs) ?? (prof as any).clt_observacao ?? ''
    const fer = getFerias(prof)
    setCltSalvando(prof.id)
    try {
      const res = await fetch(`/api/profissionais/${prof.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clt_observacao: obs, ferias: fer }) })
      if (res.ok) { toast.success('Salvo!'); setCltEdits(p => { const n = { ...p }; delete n[prof.id]; return n }); setCltFerias(p => { const n = { ...p }; delete n[prof.id]; return n }); carregarProfissionais() } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setCltSalvando(null)
  }
  // Confirma que as férias futuras foram tiradas → vira "último período" e zera o agendamento
  function concluirFerias(prof: Profissional) {
    const fer = getFerias(prof)
    const novo = { ult_ini: fer.fut1_ini, ult_fim: fer.fut2_fim || fer.fut1_fim, ult_obs: fer.ult_obs || '', fut1_ini: '', fut1_fim: '', fut2_ini: '', fut2_fim: '' }
    setCltFerias(prev => ({ ...prev, [prof.id]: novo }))
  }

  // ── Imprimir (A4) e Exportar Excel (reutilizável) ──
  const fmtData = (s: any) => s ? String(s).slice(0, 10).split('-').reverse().join('/') : ''
  function imprimirTabela(titulo: string, colunas: string[], linhas: (string | number)[][]) {
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const css = `@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a2e}.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #5b4fcf;padding-bottom:8px;margin-bottom:14px}.brand{font-size:20px;font-weight:900;color:#5b4fcf}h1{font-size:15px;color:#1a1a2e}.meta{font-size:10px;color:#666;text-align:right}table{width:100%;border-collapse:collapse;font-size:10px}thead{display:table-header-group}th{background:#5b4fcf;color:#fff;text-align:left;padding:7px 9px;font-size:10px}td{padding:6px 9px;border-bottom:1px solid #eee;vertical-align:top}tr:nth-child(even) td{background:#f7f6ff}tr{break-inside:avoid}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const head = colunas.map(c => `<th>${esc(c)}</th>`).join('')
    const body = linhas.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(titulo)}</title><style>${css}</style></head><body><div class="hd"><div class="brand">NODRI</div><div class="meta"><strong>${esc(titulo)}</strong><br>${new Date().toLocaleDateString('pt-BR')} · ${linhas.length} registros</div></div><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }
  async function exportarExcel(nomeArq: string, colunas: string[], linhas: (string | number)[][]) {
    try {
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.aoa_to_sheet([colunas, ...linhas])
      ws['!cols'] = colunas.map(() => ({ wch: 22 }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Dados')
      XLSX.writeFile(wb, nomeArq + '.xlsx')
    } catch { toast.error('Erro ao gerar Excel') }
  }
  function imprimirGuiaEntrevista() {
    let n = 0
    const blocosHtml = GUIA_ENTREVISTA.blocos.map(b => `<div class="bloco"><h2>${b.titulo}</h2>${b.perguntas.map(q => { n++; return `<div class="q"><div class="qn">${n}. ${q}</div><div class="ln"></div><div class="ln"></div></div>` }).join('')}</div>`).join('')
    const css = `@page{size:A4 portrait;margin:13mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px}.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #5b4fcf;padding-bottom:8px;margin-bottom:10px}.brand{font-size:22px;font-weight:900;color:#5b4fcf}.cand{font-size:10px;color:#444;margin:0 0 12px;display:flex;gap:24px}.cand span{border-bottom:1px solid #999;flex:1;padding-bottom:2px}.antes{background:#f0eefb;border-radius:8px;padding:8px 12px;font-size:10px;margin-bottom:12px}.bloco{margin-bottom:10px;break-inside:avoid}h2{font-size:12px;color:#5b4fcf;border-bottom:1px solid #ddd;padding-bottom:3px;margin-bottom:6px}.q{margin-bottom:7px;break-inside:avoid}.qn{font-weight:600;margin-bottom:3px}.ln{border-bottom:1px dotted #aaa;height:13px}.nota{font-size:9px;color:#666;font-style:italic;margin-top:10px;border-top:1px solid #eee;padding-top:6px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ficha de Entrevista</title><style>${css}</style></head><body><div class="hd"><div class="brand">NODRI</div><div style="text-align:right;font-size:10px"><strong>Guia de Entrevista com Novos Profissionais</strong><br>${new Date().toLocaleDateString('pt-BR')}</div></div><div class="cand"><span>Candidato(a):</span><span style="max-width:130px;flex:0 0 130px">Data:</span></div><div class="antes"><strong>Antes da entrevista:</strong> ${GUIA_ENTREVISTA.antes.join(' ')}</div>${blocosHtml}<div class="nota">${GUIA_ENTREVISTA.nota}</div><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }
  const [cProfNome, setCProfNome] = useState('')
  const [cProfCPF, setCProfCPF] = useState('')
  const [cProfCNPJ, setCProfCNPJ] = useState('')
  const [cProfEndereco, setCProfEndereco] = useState('')
  const [cProfRG, setCProfRG] = useState('')
  const [cProfRepresentante, setCProfRepresentante] = useState('')
  const [cDataContrato, setCDataContrato] = useState(() => {
    const h = new Date(); return `${String(h.getDate()).padStart(2, '0')}/${String(h.getMonth() + 1).padStart(2, '0')}/${h.getFullYear()}`
  })
  const [cLocalContrato, setCLocalContrato] = useState('Brasília (DF)')

  function preencherContrato(prof: Profissional) {
    setContratoProf(prof)
    setCProfNome((prof.nome_completo || '').toUpperCase())
    setCProfCPF(prof.cpf || '')
    setCProfCNPJ(prof.cnpj || '')
    setCProfEndereco(prof.endereco || '')
    setCProfRG((prof as any).rg || '')
    if ((prof as any).data_admissao) setCDataContrato(String((prof as any).data_admissao).slice(0, 10).split('-').reverse().join('/'))
    // Documentos obrigatórios para o Contrato
    const faltas: string[] = []
    if (!prof.cpf) faltas.push('CPF')
    if (!prof.cnpj) faltas.push('CNPJ')
    if (!(prof as any).rg) faltas.push('RG')
    if (!prof.endereco) faltas.push('Endereço')
    if (!(prof as any).data_admissao) faltas.push('Data de Admissão')
    setContratoPendencias(faltas)
    try {
      const cr = prof.contato_responsavel ? JSON.parse(prof.contato_responsavel) : {}
      setCProfRepresentante(cr.nome || prof.nome_completo || '')
    } catch { setCProfRepresentante(prof.nome_completo || '') }
  }

  // Corpo do CONTRATO DE PARCERIA (texto integral do contrato), com as partes preenchidas.
  function montarContratoHTML(comFinal = true): string {
    const salao = (dSalaoNome || '[NOME DO SALÃO]').toUpperCase()
    const salaoCnpj = dSalaoCNPJ || '___'
    const salaoResp = dSalaoResponsavel || '___'
    const quals = [dSalaoNacionalidade, dSalaoEstadoCivil, dSalaoProfissao].map(s => (s || '').trim()).filter(Boolean).join(', ')
    const qualifTxt = quals ? `, ${quals}` : ''
    const salaoRG = dSalaoRG ? `, carteira de identidade número ${dSalaoRG}${dSalaoOrgaoRG ? ' ' + dSalaoOrgaoRG : ''}` : ''
    const sede = dSalaoEndereco ? `nesta Capital, ${dSalaoEndereco}` : 'nesta Capital'
    const profNome = (cProfNome || '[NOME DO PROFISSIONAL]').toUpperCase()
    const profEnd = cProfEndereco || '___'
    const profCnpj = cProfCNPJ || '___'
    const profRep = cProfRepresentante || cProfNome || '___'
    const profRGtxt = cProfRG ? ` portador(a) da Carteira de Identidade ${cProfRG},` : ''
    const profCPF = cProfCPF || '___'
    const P = (t: string, extra = '') => `<p style="text-align:justify;margin:0 0 10pt;${extra}">${t}</p>`
    const H = (t: string) => `<p style="text-align:justify;margin:16pt 0 8pt;font-weight:bold">${t}</p>`
    const S = (t: string) => `<p style="margin:8pt 0 4pt;font-weight:bold">${t}</p>`
    return [
      P(`Pelo presente instrumento contratual, de um lado, <strong>${salao}</strong>, pessoa jurídica de direito privado, com sua sede ${sede}, inscrita no C.N.P.J./M.F. sob o n.º ${salaoCnpj}, neste ato representada por seu sócio ${salaoResp}${qualifTxt}${salaoRG}, doravante denominado simplesmente <strong>SALÃO-PARCEIRO</strong>, e, de outro lado, <strong>${profNome}</strong>, pessoa jurídica de direito privado, situada ${profEnd}, inscrita no C.N.P.J./M.F. sob o nº ${profCnpj}, nesse ato representada por ${profRep}${profRGtxt} e do CPF ${profCPF} residente em ${profEnd}, doravante denominada simplesmente <strong>PROFISSIONAL-PARCEIRO</strong>, celebram o presente <strong>CONTRATO DE PARCERIA</strong>, na forma da Lei 13.352/16 e das cláusulas abaixo estabelecidas:`),
      H('CLÁUSULA PRIMEIRA – DO OBJETO:'),
      P('O SALÃO-PARCEIRO, empresa destinada à prestação de serviços de salão de beleza e afins, proprietária e/ou possuidora de bens móveis e de instalação para barbeiros, cabeleireiros, manicuras, pedicuras, esteticistas, massagistas, maquiadores, escovistas, calistas, depiladores e demais profissões afins, sendo proprietária e possuidora de espaço, equipamentos e móveis apropriados à atividade desses profissionais, estabelece parceria com o PROFISSIONAL-PARCEIRO, pelo que a ele dá, em locação e/ou uso, móveis, aparelhos, utensílios e produtos de sua propriedade e/ou posse, para fins de exploração específica da atividade de cabeleireira e outras que porventura sejam praticadas exclusivamente dentro da abrangência da Lei 13.352, de 27 de outubro de 2016, em serviços de beleza, dentro do seu objeto social, não podendo o PROFISSIONAL-PARCEIRO usar os objetos dados em locação para quaisquer outros fins. Além dos bens dados em locação, o SALÃO-PARCEIRO também concede, ao PROFISSIONAL-PARCEIRO, serviços de gestão, de apoio administrativo e de escritório, tais como, exemplificativamente, cobrança e recebimento de valores pagos pelos clientes atendidos por ele.'),
      S('Parágrafo Primeiro:'),
      P('O presente contrato regula exclusivamente o rateio dos serviços objeto deste contrato e se referem a corte, modelagem, pigmentação, coloração, bem como outros serviços que envolvam terapia e embelezamento capilar. Para outros serviços, como maquiagem, sobrancelha, massagem, manicure, etc., onde existem outros parâmetros de rateio, deve ser formalizado o respectivo ADITIVO CONTRATUAL.'),
      S('Parágrafo Segundo:'),
      P('A parceria firmada pelo presente instrumento não exclui a possibilidade de estabelecerem-se outras parcerias, entre o SALÃO-PARCEIRO e terceiros, ainda que para os mesmos fins e no mesmo âmbito de atividade do PROFISSIONAL-PARCEIRO. Este também poderá firmar outras parcerias, desde que respeitada o previsto na Cláusula Nona do presente instrumento.'),
      S('Parágrafo Terceiro:'),
      P('A parceria firmada entre as partes, no presente instrumento, não envolve a utilização total dos móveis, objetos e utensílios de propriedade e/ou posse do SALÃO-PARCEIRO, sendo que o acesso às suas instalações e a circulação nas suas dependências, pelo PROFISSIONAL-PARCEIRO, será restrito ao necessário para a manutenção da parceria e aos objetos dados em locação quando destinados à realização do objeto da presente parceria.'),
      S('Parágrafo Quarto:'),
      P('Serão fornecidos, pelo SALÃO-PARCEIRO ao PROFISSIONAL-PARCEIRO, para o exercício de sua atividade profissional, móveis, água, luz, telefone, serviços de recepção, serviços de telefonia, serviços de cobrança, a marca do estabelecimento comercial, além de cadeira de uso da clientela, toalhas, capas para uso em química, bancada de atendimento ao cliente, com espelho e lavatórios para cabelo.'),
      S('Parágrafo Quinto:'),
      P('Serão de propriedade e posse do PROFISSIONAL-PARCEIRO os seguintes materiais e insumos necessários ao exercício de sua profissão, pelo que deve ele providenciar a compra dos mesmos, zelando pela utilização de produtos de inquestionável qualidade, mantendo-os em perfeitas condições, assumindo todos os custos da sua higienização e esterilização: tesouras, pentes, escovas de cabelo, máquinas de corte de cabelo, navalha desfiadora, luvas, secadores de cabelo, gel, mousse, aparelho chapinha para alisamento, spray de cabelo, grampos, papel alumínio, papel filme, produtos finalizadores, carrinho, plásticos descartáveis, prendedores de cabelo, potes misturadores e tigelas para manuseio de tintas.'),
      S('Parágrafo Sexto:'),
      P('O desgaste natural dos bens, utensílios, aparelhos, objetos e produtos de propriedade e/ou posse do PROFISSIONAL-PARCEIRO não implica a responsabilidade do SALÃO-PARCEIRO, no que se refere à reposição ou troca de qualquer um deles, assim como o desgaste natural dos móveis, equipamentos, objetos e utensílios dados em locação e/ou uso não implica a responsabilidade do PROFISSIONAL-PARCEIRO, quanto a sua troca e/ou manutenção. Entretanto, o uso inadequado do objeto locado, por parte deste, que cause estrago, mau-funcionamento ou perda de sua funcionalidade, obriga-o a indenizar o SALÃO-PARCEIRO, quanto aos gastos realizados para o reparo ou troca do mesmo, o que deverá ser feito imediatamente após a realização da despesa respectiva e apresentação, ao PROFISSIONAL-PARCEIRO, dos custos empregados, pelo SALÃO-PARCEIRO.'),
      S('Parágrafo Sétimo:'),
      P('A relação de bens e produtos contida nos parágrafos terceiro e quarto, da presente cláusula, não é exaustiva, podendo sofrer acréscimo e diminuição, sem que com isto fique descaracterizado o presente contrato de parceria.'),
      S('Parágrafo Oitavo:'),
      P('As partes assumem reciprocamente a responsabilidade pelo custeio da atividade econômica que será exercida por cada qual, assumindo a responsabilidade na administração de sua pessoa jurídica e não assumindo nenhuma delas a responsabilidade pela administração da outra, de qualquer ordem, respeitados os termos da Lei 13.352 de 27 de outubro de 2016.'),
      S('Parágrafo Nono:'),
      P('Poderão incluir-se entre os serviços fornecidos, pelo SALÃO-PARCEIRO ao PROFISSIONAL-PARCEIRO, aqueles que englobem gestão do negócio, tais como serviços de recepção, cobrança e recebimento, serviços administrativos, serviços de apoio, assim como fornecimento possível de outros serviços que se fizerem necessários para o bom atendimento do consumidor final, se necessários, cujos termos e condições serão estabelecidos entre as partes, ainda que não expressamente discriminados no presente instrumento.'),
      S('Parágrafo Décimo:'),
      P('A contratação de assistentes ou auxiliares, necessários à realização dos serviços objeto do presente contrato de parceria, poderá ser providenciada diretamente pelo PROFISSIONAL-PARCEIRO, desde que haja comunicação ao SALÃO-PARCEIRO da contratação direta de pessoas e da avaliação, por este, da capacidade técnica das pessoas contratadas e desde que corram por conta e risco do profissional contratante os direitos e deveres que ele guardará em relação aos seus contratados diretos, inclusive de ordem trabalhista, fiscal, previdenciária e outros. Caso seja ou venha a ser, o SALÃO-PARCEIRO, responsabilizado ou imputado, em qualquer nível, administrativamente ou judicialmente, por danos causados, às partes aqui contratantes e/ou a terceiros, pelos assistentes e/ou auxiliares contratados diretamente pelo PROFISSIONAL-PARCEIRO, terá direito de regresso assegurado pelo presente instrumento, podendo exigir deste que regularize a situação que gerou ou que possa gerar o dano, além de indenização, perdas e danos e lucros cessantes.'),
      S('Parágrafo Décimo Primeiro:'),
      P('O PROFISSIONAL-PARCEIRO não assumirá as responsabilidades e obrigações decorrentes da administração do SALÃO-PARCEIRO, de ordem contábil, fiscal, trabalhista e previdenciária e que porventura decorram do exercício da atividade deste, de acordo com seu objeto social.'),
      S('Parágrafo Décimo Segundo:'),
      P('As partes declaram ter ciência de que o SALÃO-PARCEIRO poderá ter mais de uma unidade de atendimento, bem como, poderá, ainda, trabalhar em parceria com salões de outras razões sociais, mas que poderão estar sob a mesma administração, de forma que o PROFISSIONAL-PARCEIRO compromete-se a prestar atendimento à clientela, prestando-lhe serviços em quaisquer dos estabelecimentos comerciais, o que não alterará em nada as cláusulas neste estabelecidas.'),
      H('CLÁUSULA SEGUNDA – DO PREÇO:'),
      P('O rateio dos valores recebidos dos clientes, decorrentes dos SERVIÇOS executados pelo PROFISSIONAL-PARCEIRO, ocorrerá de acordo com o estipulado no artigo 1º A, §10º, inciso primeiro, da Lei, nº 13.352 / 2016 e na cláusula décima quinta, parágrafo décimo, da Convenção Coletiva de Trabalho.'),
      S('Parágrafo Primeiro:'),
      P('Será deduzido do valor pago pelo cliente a título de insumos e produtos necessários à execução dos serviços 30% (trinta por cento), assim entendido, insumos como shampoo, condicionador, toalha, robe, capa, excluindo-se ainda, produtos adicionais vendidos pelo SALÃO-PARCEIRO, que serão vendidos e cobrados separadamente do cliente, bem como, será deduzido do valor pago pelo cliente a título de custo operacional 15% (quinze por cento) referente a taxas administrativas, taxas de cartão de crédito, tributos vigentes e custos operacionais.'),
      S('Parágrafo Segundo:'),
      P('Após as deduções acima, previstas no parágrafo primeiro desta Cláusula Segunda e observados os parâmetros constantes dos parágrafos seguintes, se pagará ao SALÃO-PARCEIRO, em face da presente parceria, 42% (quarenta e dois por cento) e ao PROFISSIONAL-PARCEIRO caberá os 58% (cinquenta e oito por cento) restantes.'),
      S('Parágrafo Terceiro:'),
      P('Poderá o PROFISSIONAL-PARCEIRO trabalhar em conjunto com outro PROFISSIONAL-PARCEIRO para o atendimento do mesmo cliente e, nesse caso, deverá autorizar o SALÃO-PARCEIRO, a repassar parte de seus ganhos diretamente a esse outro PROFISSIONAL-PARCEIRO. A autorização considerada válida sempre que o PROFISSIONAL-PARCEIRO realizar o lançamento no sistema de pagamento, indicando que o trabalho foi realizado em cooperação entre os PROFISSIONAIS-PARCEIROS. Esse lançamento no sistema de pagamento valerá como autorização para o fracionamento e repasses da cota-parte ideal para cada PROFISSIONAL-PARCEIRO envolvido.'),
      S('Parágrafo Quarto:'),
      P('Nos casos onde for necessário o uso de produtos adicionais para a realização de terapia capilar, pigmentação, reflexo, realinhamento capilar e qualquer outro procedimento que exija a utilização de produtos diferenciados ou ainda produtos mais caros por escolha do cliente, o SALÃO-PARCEIRO poderá fazer a VENDA DO PRODUTO ao cliente, sem que esse valor entre na composição do rateio de SERVIÇOS.'),
      S('Parágrafo Quinto:'),
      P('Caberá ao SALÃO-PARCEIRO o recebimento de valores pagos, pela clientela, decorrentes da prestação de serviços de beleza, por ele realizada, o que se fará mediante a centralização dos pagamentos realizados, em caixa central do estabelecimento.'),
      S('Parágrafo Sexto:'),
      P('O SALÃO-PARCEIRO providenciará, uma vez recebidas as importâncias pagas ao PROFISSIONAL-PARCEIRO, em caixa centralizado, a retenção de sua cota-parte percentual, na forma prevista no presente instrumento, bem como dos valores alusivos aos tributos, contribuições sociais e previdenciárias, incidentes sobre a cota-parte destinada ao PROFISSIONAL-PARCEIRO.'),
      S('Parágrafo Sétimo:'),
      P('A cota-parte destinada ao PROFISSIONAL-PARCEIRO não será considerada como parte integrante da receita bruta auferida pelo SALÃO-PARCEIRO, ainda que se tenha adotado o sistema de emissão de Nota Fiscal única e centralizada, destinada ao consumidor dos serviços.'),
      S('Parágrafo Oitavo:'),
      P('Para os efeitos desta cláusula, considerar-se-á como pagamento do preço o rateio, entre as partes, dos valores recebidos da clientela, por cada serviço prestado pelo PROFISSIONAL-PARCEIRO, nos limites percentuais estabelecidos no caput da presente cláusula.'),
      S('Parágrafo Nono:'),
      P('O acerto financeiro objeto da presente parceria ocorrerá mensalmente, podendo haver antecipações quinzenais, pelo rateio previsto na presente cláusula, destinando-se a cada uma das partes a expressão financeira dos percentuais ajustados no presente instrumento, podendo haver, entre elas, contudo, a fixação de outra periodicidade para o acerto, mediante a aferição da produção do PROFISSIONAL-PARCEIRO, em período inferior, o que se fará mediante consenso com o SALÃO-PARCEIRO.'),
      S('Parágrafo Décimo:'),
      P('Além do que estabelecido na presente cláusula, ao PROFISSIONAL-PARCEIRO não poderão ser atribuídos quaisquer outros custos com manutenção das instalações, infraestrutura e equipamentos, salvo se decorrentes de mau uso, seja por culpa ou dolo, hipótese em que arcará com os custos pertinentes ao conserto ou reposição dos bens danificados, inclusive se praticados por assistentes e auxiliares por ele contratados diretamente.'),
      S('Parágrafo Décimo Primeiro:'),
      P('Os preços constantes da tabela de serviços prestados, pelas partes à clientela, serão fixados de comum acordo entre o SALÃO-PARCEIRO e o PROFISSIONAL-PARCEIRO, de forma a que haja uniformidade quanto a valores praticados pelo estabelecimento. Caso não haja consenso quanto ao preço a ser praticado pelas partes, em relação à clientela, será do SALÃO-PARCEIRO a decisão final sobre a importância a ser fixada.'),
      H('CLÁUSULA TERCEIRA – DA TRANSMISSÃO A TERCEIROS DOS DIREITOS E OBRIGAÇÕES:'),
      P('Este contrato produz efeitos apenas entre os contratantes, ficando expressamente vedada a transferência a terceiros, ainda que parcialmente, dos direitos e obrigações aqui estabelecidas.'),
      S('Parágrafo Único:'),
      P('O PROFISSIONAL-PARCEIRO poderá fazer-se substituir por terceiro, na prestação de serviços à clientela, desde que haja comunicação prévia dessa necessidade ao SALÃO-PARCEIRO, para que se proceda à autorização quanto ao acesso de estranhos às dependências do salão. A substituição de que se trata no presente parágrafo, contudo, será eventual e temporária, para atendimento à clientela, não resultando ou implicando a transferência de direitos e obrigações previstos no presente contrato.'),
      H('CLÁUSULA QUARTA – DAS OBRIGAÇÕES DO SALÃO-PARCEIRO:'),
      P('São obrigações do SALÃO-PARCEIRO:'),
      P('Exigir e manter o presente Contrato de Parceria, firmado por escrito com o PROFISSIONAL-PARCEIRO, bem como providenciar a homologação do mesmo junto ao Sindicato da categoria profissional;'),
      P('Centralizar os pagamentos e recebimentos de valores pagos pela clientela, decorrentes da atividade de prestação de serviços de beleza realizada pelo PROFISSIONAL-PARCEIRO, em caixa central, zelando para o controle e guarda das importâncias auferidas por este, no exercício de sua atividade ou cumprimento do seu objeto social;'),
      P('Promover, entre as partes, o rateio (prestação de contas) das importâncias pagas pela clientela atendida pelo PROFISSIONAL-PARCEIRO, nos termos e condições estabelecidas pelo presente instrumento, observando rigorosamente a periodicidade fixada para este fim, no presente instrumento, ou outra que venha a ser praticada por consenso entre as partes;'),
      P('Promover a retenção de valores devidos pelo PROFISSIONAL-PARCEIRO, a título de tributos e contribuições sociais e previdenciárias, para o repasse deles aos respectivos destinatários finais, dentro do prazo de lei;'),
      P('Assumir integralmente as obrigações alusivas à administração da pessoa jurídica do SALÃO-PARCEIRO, de natureza contábil, fiscal, trabalhista e previdenciária, além de outras decorrentes do desenvolvimento do negócio;'),
      P('Manter suas instalações e bens, locados e dados em uso, na forma do presente contrato de parceria, em perfeitas condições de uso, higiene e limpeza, zelando para a consecução dos objetivos comuns às partes, assim como para o desenvolvimento do negócio, possibilitando, ainda, o cumprimento das normas de saúde e segurança;'),
      P('Conhecer as normas e determinações do serviço de saúde pública, comprometendo-se a zelar pelo cumprimento delas.'),
      H('CLÁUSULA QUINTA – DAS OBRIGAÇÕES DO PROFISSIONAL-PARCEIRO:'),
      P('São obrigações do PROFISSIONAL-PARCEIRO:'),
      P('Exigir e manter o presente Contrato de Parceria, firmado por escrito com o SALÃO-PARCEIRO, bem como providenciar a homologação do mesmo pelo Sindicato da categoria profissional;'),
      P('Agir com probidade, lisura e compromisso para com a sua clientela e demais PROFISSIONAIS-PARCEIROS, assim como zelar para o desenvolvimento da parceria, segundo os mais altos padrões de qualidade, higiene e segurança daqueles que frequentam o estabelecimento;'),
      P('Manter pessoalmente o controle dos atendimentos realizados a sua clientela, para a aferição posterior da regularidade dos valores retidos pelo SALÃO-PARCEIRO e rateados entre as partes;'),
      P('Observar rigorosamente os agendamentos autorizados e providenciados em relação ao atendimento à clientela, comunicando previamente sobre impedimentos que exijam o redirecionamento do atendimento a outro PROFISSIONAL-PARCEIRO ou mesmo novo agendamento a ser providenciado pelos serviços de recepção;'),
      P('Estabelecer junto ao SALÃO-PARCEIRO os dias e horários em que haverá o atendimento a sua clientela, autorizando a abertura e fechamento de sua agenda, de forma antecipada, junto aos serviços de recepção, segundo sua conveniência, sem que se prejudique o atendimento à clientela;'),
      P('Não interferir na gestão e administração do negócio do SALÃO-PARCEIRO, garantindo-se o ambiente necessário ao desenvolvimento das suas atividades;'),
      P('Assumir integralmente as obrigações inerentes à gestão de sua pessoa jurídica, se estiver ou vier a estar constituído como tal, em qualquer modalidade permitida em lei, observando exigências de natureza contábil, fiscal, trabalhista e previdenciária, além de outras decorrentes do desenvolvimento do negócio;'),
      P('Manter sua inscrição no órgão previdenciário e perante as autoridades fazendárias, na forma exigida por lei, bem como manter em dia o cumprimento de suas obrigações de ordem fiscal e previdenciária, inclusive no que diz respeito a sua cota-parte auferida no rateio de valores pagos pela clientela e nos termos do presente instrumento;'),
      P('Zelar e responsabilizar-se, inclusive financeiramente, pela conservação, manutenção, higiene, esterilização e reposição dos materiais e insumos de sua propriedade, necessários ao exercício da sua atividade profissional, observando as regras de qualidade, higiene, saúde e segurança impostas por lei e fixadas pelo SALÃO-PARCEIRO.'),
      P('Assumir integral e unilateralmente eventuais prejuízos que possa sofrer em relação à perda, avaria e desaparecimento de materiais e utilitários de sua propriedade e/ou posse, mantendo os mesmos sob sua guarda e vigilância constantes;'),
      P('Comunicar ao SALÃO-PARCEIRO sobre a eventual contratação direta de assistentes ou auxiliares, assumindo toda e qualquer responsabilidade, de qualquer natureza, em relação à pessoa contratada, devendo providenciar a anotação e registro do mesmo em CTPS e cumprir com todas as obrigações inerentes ao vínculo de emprego que firmará com a pessoa contratada, assegurando que o contrato também cumpra as regras e padrões estabelecidos no presente contrato;'),
      P('Atender à sua clientela obedecendo ao horário comercial de funcionamento do SALÃO-PARCEIRO, cuja definição é exclusivamente deste;'),
      P('Atender aos seus clientes próprios, como igualmente a outros que lhe sejam direcionados pelo SALÃO-PARCEIRO, se assim o desejar e se tal estiver dentro do escopo do presente contrato;'),
      P('Conhecer as normas e determinações do serviço de saúde pública, comprometendo-se a zelar pelo cumprimento delas.'),
      P('Portar vestimentas compatíveis com o ambiente da prestação de serviços, além de aderir a padrões de vestuário que sejam estabelecidas entre as partes, no sentido de valorização da marca e da imagem do estabelecimento comercial.'),
      H('CLÁUSULA SEXTA – DA INEXISTÊNCIA DE RELAÇÃO DE EMPREGO:'),
      P('Não haverá, entre o SALÃO-PARCEIRO e o PROFISSIONAL-PARCEIRO, relação de emprego, nos termos dos artigos 2º e 3º, da CLT, inserindo-se o presente contrato no âmbito do direito obrigacional, na forma do que estabelecido no presente instrumento.'),
      S('Parágrafo Único:'),
      P('A assinatura do presente instrumento implica o reconhecimento de que o mesmo foi celebrado com amplo conhecimento de todos os seus termos, pelas partes, com liberdade absoluta quanto à manifestação volitiva, pelo que ambas declaram que não existe, entre elas, subordinação técnica, jurídica, hierárquica ou de qualquer outra espécie, uma vez que a parceria ora estabelecida se faz no sentido da reunião de forças em prol do desenvolvimento da atividade profissional e/ou do objeto social das partes.'),
      H('CLÁUSULA SÉTIMA – DA RESCISÃO:'),
      P('As partes poderão rescindir, unilateralmente e a qualquer tempo, o presente contrato, devendo comunicar a outra, contudo, sobre sua intenção, com antecedência de no mínimo 30 (trinta) dias, sob pena de multa correspondente a 10% (dez por cento) do salário mínimo, salvo se a ruptura da parceria estiver baseada em justo motivo de que decorra a quebra de confiança, entendida esta como aquela advinda da prática, por qualquer das partes, de concorrência desleal, descumprimento do raio de exclusividade fixada neste contrato, prática de ato de improbidade, incontinência de conduta ou mau procedimento, desídia profissional, violação de segredos do SALÃO PARCEIRO e conflitos entre os representantes do SALÃO PARCEIRO e o PROFISSIONAL PARCEIRO que inviabilize a convivência.'),
      S('Parágrafo Primeiro:'),
      P('Havendo rescisão do contrato, por qualquer motivo, o PROFISSIONAL-PARCEIRO obriga-se a devolver, ao SALÃO-PARCEIRO, todos os objetos dados em locação, em perfeitas condições de uso, higiene e limpeza, sob pena de responder por indenização, perdas e danos e lucros cessantes.'),
      S('Parágrafo Segundo:'),
      P('O não comparecimento do PROFISSIONAL-PARCEIRO às dependências do SALÃO-PARCEIRO, por mais de 5 (cinco) dias, sem comunicação providenciada por qualquer meio possível, implicará o reconhecimento de abandono da parceria estabelecida no presente instrumento, bem como dos móveis, objetos, utensílios e produtos etc. dados em locação e uso, como igualmente resultará na inexecução do contrato, o que será suficiente a que se considere desfeita automaticamente a parceria, independente de aviso ou interpelação judicial, podendo o SALÃO-PARCEIRO dispor dos bens dados em locação como bem entender, inclusive utilizando-os em outras parcerias a serem firmadas com terceiros. Os gastos e despesas que a ausência do PROFISSIONAL-PARCEIRO porventura constituir serão de sua inteira responsabilidade e deverão ser por ele suportados, ficando autorizada a retenção, por parte do SALÃO-PARCEIRO, se houver saldo de rateio alusivo à parceria, da importância alusiva aos prejuízos apurados, assim como a utilização dos demais meios legítimos e legais inerentes à responsabilização.'),
      H('CLÁUSULA OITAVA – DO DIREITO DE REGRESSO:'),
      P('Fica assegurado, ao SALÃO-PARCEIRO, o direito de regresso, via ação regressiva, em face do PROFISSIONAL-PARCEIRO, caso venha a sofrer prejuízos de qualquer natureza, por atos praticados por este, seja por culpa ou dolo, em face de terceiros, inclusive por erros técnicos por este praticados.'),
      H('CLÁUSULA NONA – DO RAIO DE ATUAÇÃO COM EXCLUSIVIDADE:'),
      P('O PROFISSIONAL PARCEIRO se obriga a prestar serviços dentro de sua área de atuação exclusivamente ao SALÃO PARCEIRO, dentro do Distrito Federal – DF, não podendo fazê-lo a terceiros, dentro desta área territorial. O descumprimento do que estabelecido na presente cláusula implicará o justo motivo para a ruptura do contrato, na forma da Cláusula Sétima.'),
      H('CLÁUSULA DÉCIMA – DA VIGÊNCIA:'),
      P('O prazo de locação é de um ano, iniciando-se na data da assinatura deste instrumento, e ficará automaticamente prorrogado, por prazo indeterminado, se não houver qualquer manifestação das partes.'),
      H('CLÁUSULA DÉCIMA PRIMEIRA – DA RATIFICAÇÃO:'),
      P('As partes declaram, de comum acordo, que a relação entre elas será na modalidade de parceria, na forma descrita no presente instrumento e concordam que os termos aqui estabelecidos são aqueles que permeiam a relação existente entre as partes, nos termos da Lei 13.352/2016.'),
      H('CLÁUSULA DÉCIMA SEGUNDA – DO FORO:'),
      P('Fica eleito o foro de Brasília, com renúncia de qualquer outro, por mais privilegiado que seja, para dirimir eventuais conflitos porventura decorrentes da interpretação ou execução do presente contrato.'),
      P('E, por estarem de comum acordo, as partes assinam o presente instrumento, em 2 (duas) vias, juntamente com duas testemunhas.', 'margin-top:14pt'),
      ...(comFinal ? [
        `<p style="text-align:center;margin:24pt 0 36pt">${cLocalContrato || 'Brasília (DF)'}, ${cDataContrato || '___'}</p>`,
        `<div style="margin-top:8pt"><p style="margin:0 0 2pt">_______________________________________________________</p><p style="margin:0 0 28pt">${salao}</p><p style="margin:0 0 2pt">_______________________________________________________</p><p style="margin:0 0 24pt">${profNome}</p></div>`,
      ] : []),
    ].join('')
  }

  function imprimirContrato() {
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Contrato de Parceria — ${cProfNome}</title>
<style>
  @page { size: A4 portrait; margin: 2cm 2cm 1.5cm 3cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; line-height: 1.45; background: #fff; }
  h1 { font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 16pt; letter-spacing: 1px; }
  p { text-align: justify; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<h1>Contrato de Parceria</h1>
${montarContratoHTML()}
<script>window.onload=function(){window.print()}</script>
</body></html>`
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(html); win.document.close(); win.focus()
  }

  const CATEGORIAS_PADRAO = ['Cabeleireiro', 'Manicure', 'Pedicure', 'Assistente', 'Massoterapeuta', 'Maquiador(a)', 'Colorista', 'Auxiliar']
  const iStyle: React.CSSProperties = { display: 'block', width: '100%', marginTop: '3px', padding: '6px 10px', border: '1px solid #d6d3ce', borderRadius: '6px', fontSize: '12px', background: '#fafaf8', color: '#1a1a1a', fontFamily: 'inherit' }

  // Categorias = padrão + criadas pelo dono (salvas) + as já usadas nos cadastros (sem duplicatas)
  const categorias = Array.from(new Set([
    ...CATEGORIAS_PADRAO,
    ...catsCustom,
    ...profissionais.map(p => p.cargo || '').filter(Boolean)
  ])).sort()

  // Persiste a lista de categorias criadas pelo dono (para aparecer no perfil mesmo antes de atribuir)
  async function salvarCatsCustom(lista: string[]) {
    setCatsCustom(lista)
    try { await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'prof_categorias', doc: { lista } }) }) } catch { /* */ }
  }
  async function criarCategoria(nome: string) {
    const n = nome.trim()
    if (!n) return
    if (categorias.some(c => norm(c) === norm(n))) { toast.error('Essa categoria já existe'); setNovaCatTexto(''); return }
    await salvarCatsCustom(Array.from(new Set([...catsCustom, n])))
    toast.success(`Categoria "${n}" criada! Já aparece no cadastro do profissional.`)
    setNovaCatTexto('')
  }

  async function editarCategoria(antiga: string, nova: string) {
    if (!nova.trim() || antiga === nova.trim()) { setEditandoCategoria(null); return }
    const afetados = profissionais.filter(p => p.cargo === antiga)
    await Promise.all(afetados.map(p =>
      fetch(`/api/profissionais/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cargo: nova.trim() }) })
    ))
    // Mantém a lista salva em sincronia ao renomear
    if (catsCustom.some(c => c === antiga)) await salvarCatsCustom(catsCustom.map(c => c === antiga ? nova.trim() : c))
    toast.success(`Categoria "${antiga}" renomeada para "${nova.trim()}"`)
    setEditandoCategoria(null)
    carregarProfissionais()
  }

  async function excluirCategoria(cat: string) {
    const afetados = profissionais.filter(p => p.cargo === cat)
    if (afetados.length && !confirm(`Remover a categoria "${cat}" de ${afetados.length} profissional(is)?`)) return
    if (afetados.length) await Promise.all(afetados.map(p =>
      fetch(`/api/profissionais/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cargo: '' }) })
    ))
    if (catsCustom.some(c => c === cat)) await salvarCatsCustom(catsCustom.filter(c => c !== cat))
    toast.success(`Categoria "${cat}" removida`)
    carregarProfissionais()
  }

  useEffect(() => { carregarProfissionais(); buscarLinkCadastro(); carregarServicos(); carregarSalao(); fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => setSouDono(d?.role === 'salon')).catch(() => { }); fetch('/api/salon/grid?chave=prof_categorias').then(r => r.ok ? r.json() : null).then(d => { if (d && Array.isArray(d.lista)) setCatsCustom(d.lista) }).catch(() => { }); fetch('/api/salon/boletos?resumo=1').then(r => r.ok ? r.json() : null).then(d => { if (d && typeof d.vencidos === 'number') setBoletosVencidos(d.vencidos) }).catch(() => { }) }, [])

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
    if ((prof as any).data_demissao) setDDataDistrato(String((prof as any).data_demissao).slice(0, 10).split('-').reverse().join('/'))
    if ((prof as any).data_admissao) setDDataContrato(String((prof as any).data_admissao).slice(0, 10).split('-').reverse().join('/'))
    // Documentos obrigatórios para o Distrato
    const faltasD: string[] = []
    if (!prof.cpf) faltasD.push('CPF')
    if (!prof.cnpj) faltasD.push('CNPJ')
    if (!prof.endereco) faltasD.push('Endereço')
    if (!(prof as any).data_demissao) faltasD.push('Data de Demissão')
    setDistratoPendencias(faltasD)
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
        setLinkCadastro(urlPublica(`/cadastro/${d.token}`))
      }
    } catch {}
  }

  async function regenerarLink() {
    if (!confirm('Isso vai invalidar o link atual. Quem tiver o link antigo não conseguirá mais acessar. Continuar?')) return
    setGerandoLink(true)
    const res = await fetch('/api/profissionais/link-cadastro', { method: 'POST' })
    if (res.ok) {
      const d = await res.json()
      setLinkCadastro(urlPublica(`/cadastro/${d.token}`))
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
    // Mostra do cache na hora (sem espera) e atualiza em segundo plano
    try { const c = localStorage.getItem('nodri_profissionais'); if (c) { setProfissionais(JSON.parse(c)); setLoading(false) } } catch { /* */ }
    setLoading(true)
    try {
      const res = await fetch('/api/profissionais')
      if (res.ok) { const d = await res.json(); setProfissionais(d); try { localStorage.setItem('nodri_profissionais', JSON.stringify(d)) } catch { /* */ } }
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
      chave_pix: (p as any).chave_pix || '',
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
    <div style={embutido ? undefined : { minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column' }}>

      {/* TOP BAR */}
      {!embutido && (
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
      )}

      <div style={{ display: 'flex', flex: 1 }}>

        {/* Overlay mobile */}
        {isMobile && sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSidebarOpen(false)} />}

        {/* SIDEBAR — escondida quando embutido no setor */}
        {!embutido && (
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
              <button key={item.id} onClick={() => { if (!confirmarSaidaSemSalvar()) return; setSecao(item.id); setSidebarOpen(false); if (item.id === 'cadastrar') { setEditando(null); setForm({ ...FORM_INITIAL }); setFotoPreview('') } }}
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
        )}

        {/* CONTEÚDO PRINCIPAL */}
        <main style={{ flex: 1, padding: isMobile ? '12px' : '24px', overflowY: 'auto', background: '#f0eeea' }}>

          {/* ── LISTA ── */}
          {secao === 'lista' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ color: '#1a1a1a', fontSize: '20px', fontWeight: 700, margin: 0 }}>Lista de Profissionais</h2>
                  <p style={{ color: '#767069', fontSize: '13px', margin: '4px 0 0' }}>{profissionais.filter(p => p.ativo && !p.is_departamento).length} ativos</p>
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

              {/* ── CARD SOLICITAÇÃO (só no celular) ── */}
              {isMobile && (
                <button onClick={() => setSecao('solicitacao')}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,#7c3aed,#5b4fcf)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 16px', marginBottom: '16px', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Send size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>Solicitação</div>
                    <div style={{ fontSize: 11.5, opacity: .9 }}>Enviar um pedido a um departamento</div>
                  </div>
                  <ChevronRight size={18} style={{ opacity: .8 }} />
                </button>
              )}

              {/* ── DEPARTAMENTOS (setores internos, não são profissionais) ── */}
              {!loading && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ fontSize: '10px', color: '#6b6860', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: 0 }}>Departamentos</p>
                    {souDono && (
                      <button onClick={() => setNovoDep(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0eefb', color: '#5b4fcf', border: '1px solid #d9d3f5', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        <Plus size={12} /> Novo departamento
                      </button>
                    )}
                  </div>

                  {novoDep && (
                    <div style={{ background: '#faf9ff', border: '1px solid #d9d3f5', borderRadius: 10, padding: 12, marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input value={novoDepNome} onChange={e => setNovoDepNome(e.target.value)} placeholder="Nome do setor (ex: MARKETING)" autoFocus
                        style={{ flex: 1, minWidth: 180, border: '1px solid #e0ddd8', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none' }} />
                      <input type="color" value={novoDepCor} onChange={e => setNovoDepCor(e.target.value)} title="Cor do setor"
                        style={{ width: 38, height: 34, border: '1px solid #e0ddd8', borderRadius: 8, padding: 2, cursor: 'pointer' }} />
                      <button disabled={criandoDep} onClick={criarDepartamento} style={{ background: '#5b4fcf', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: criandoDep ? 0.6 : 1 }}>{criandoDep ? 'Criando...' : 'Criar'}</button>
                      <button onClick={() => setNovoDep(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                    </div>
                  )}

                  {departamentos.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                      {departamentos.map(d => {
                        const cor = d.departamento_cor || '#5b4fcf'
                        const icone = d.nome_completo === 'ADMINISTRATIVO' ? '🗂️' : d.nome_completo === 'FINANCEIRO' ? '💰' : d.nome_completo === 'RECEPÇÃO' ? '🛎️' : d.nome_completo === 'GERÊNCIA' ? '🏢' : '🏢'
                        const ehFin = d.nome_completo.trim().toUpperCase().includes('FINANCEIRO')
                        const boletosAqui = ehFin ? boletosVencidos : 0
                        const temPend = (d.pendencias_abertas || 0) > 0 || boletosAqui > 0
                        return (
                          <div key={d.id}
                            style={{ background: temPend ? '#fff0f0' : '#ffffff', border: `1px solid ${temPend ? '#7f1d1d' : cor + '40'}`, borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', position: 'relative' }}
                            onClick={() => router.push(`/salon/departamentos/${d.id}`)}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = temPend ? '#ef4444' : cor; e.currentTarget.style.boxShadow = `0 0 0 2px ${temPend ? '#ef444420' : cor + '20'}` }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = temPend ? '#7f1d1d' : cor + '40'; e.currentTarget.style.boxShadow = 'none' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: cor + '20', border: `1px solid ${cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                              {icone}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: '#1a1a1a', fontWeight: 700, fontSize: '12px' }}>{d.nome_completo}</div>
                              {(d.pendencias_abertas || 0) > 0 && (
                                <div style={AVISO_DEMANDA}>⚠ {d.pendencias_abertas} pendência{d.pendencias_abertas! > 1 ? 's' : ''}</div>
                              )}
                              {boletosAqui > 0 && (
                                <div style={AVISO_DEMANDA}>📄 {boletosAqui} boleto{boletosAqui > 1 ? 's' : ''} vencido{boletosAqui > 1 ? 's' : ''}</div>
                              )}
                              {!temPend && <div style={{ color: '#6b6860', fontSize: '10px', marginTop: '2px' }}>Sem pendências</div>}
                            </div>
                            {souDono && (
                              <button onClick={e => { e.stopPropagation(); excluirDepartamento(d) }} title="Excluir setor" style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 2 }}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div style={{ borderBottom: '1px solid #e8e6e0', margin: '16px 0 8px' }}/>
                  <p style={{ fontSize: '10px', color: '#6b6860', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '8px' }}>Profissionais</p>
                </div>
              )}

              {/* Pendentes de auto-cadastro */}
              {!loading && profissionais.filter(p => (p as any).status_cadastro === 'pendente').length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: '18px' }}>⏳</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#92400e', fontWeight: 700, fontSize: '12px', margin: 0 }}>
                        {profissionais.filter(p => (p as any).status_cadastro === 'pendente').length} cadastro(s) aguardando aprovação
                      </p>
                      <p style={{ color: '#b45309', fontSize: '11px', margin: '2px 0 0' }}>Clique em Aprovar para liberar, ou no nome para revisar antes.</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {profissionais.filter(p => (p as any).status_cadastro === 'pendente').map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 10px', flexWrap: 'wrap' }}>
                        <span style={{ flex: 1, minWidth: 140, fontSize: '13px', fontWeight: 600, color: '#1a1a1a', cursor: 'pointer' }} onClick={() => { try { sessionStorage.setItem('nodri_prof_' + p.id, JSON.stringify(p)) } catch(_){} router.push(`/salon/profissionais/${p.id}`) }}>
                          {p.nome_completo || p.apelido || '(sem nome)'}
                        </span>
                        <button disabled={aprovandoId === p.id} onClick={() => aprovarCadastro(p)}
                          style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: aprovandoId === p.id ? 'default' : 'pointer', opacity: aprovandoId === p.id ? 0.6 : 1 }}>
                          {aprovandoId === p.id ? 'Aprovando...' : '✓ Aprovar'}
                        </button>
                        <button disabled={aprovandoId === p.id} onClick={() => recusarCadastro(p)}
                          style={{ background: '#fff', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                          Recusar
                        </button>
                      </div>
                    ))}
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

          {/* ── SOLICITAÇÃO (dono envia em nome de um profissional) ── */}
          {secao === 'solicitacao' && (
            <div>
              <button onClick={() => setSecao('lista')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: '#6b6860', fontSize: 13, cursor: 'pointer', marginBottom: 10, padding: 0 }}>
                <ArrowLeft size={15} /> Voltar para a lista
              </button>
              <h2 style={{ color: '#1a1a1a', fontSize: '20px', fontWeight: 700, margin: 0 }}>Solicitação a um departamento</h2>
              <p style={{ color: '#767069', fontSize: '13px', margin: '4px 0 20px' }}>Envie um pedido para um setor. Ele entra como demanda com o nome do solicitante e, ao ser resolvido, o solicitante recebe a notificação.</p>

              {departamentos.length === 0 ? (
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: 16, color: '#92400e', fontSize: 13 }}>
                  Você ainda não tem departamentos. Crie um em <strong>Lista de Profissionais → Novo departamento</strong> primeiro.
                </div>
              ) : (
                <div style={{ maxWidth: 560, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#6b6860', fontWeight: 700, display: 'block', marginBottom: 4 }}>Departamento *</label>
                    <select value={solDep} onChange={e => setSolDep(e.target.value)} style={{ width: '100%', border: '1px solid #e0ddd8', borderRadius: 8, padding: '9px 10px', fontSize: 13 }}>
                      <option value="">Selecione o setor...</option>
                      {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome_completo}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#6b6860', fontWeight: 700, display: 'block', marginBottom: 4 }}>Solicitante (quem está pedindo) *</label>
                    <select value={solRemetente} onChange={e => setSolRemetente(e.target.value)} style={{ width: '100%', border: '1px solid #e0ddd8', borderRadius: 8, padding: '9px 10px', fontSize: 13 }}>
                      <option value="">Selecione o profissional...</option>
                      {profissionais.filter(p => p.ativo && !p.is_departamento).map(p => <option key={p.id} value={p.id}>{p.apelido || p.nome_completo}{p.cargo ? ` — ${p.cargo}` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#6b6860', fontWeight: 700, display: 'block', marginBottom: 4 }}>Solicitação *</label>
                    <textarea value={solMsg} onChange={e => setSolMsg(e.target.value)} rows={3} placeholder="Descreva o que está sendo solicitado..." style={{ width: '100%', border: '1px solid #e0ddd8', borderRadius: 8, padding: '9px 10px', fontSize: 13, outline: 'none', resize: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="radio" checked={solPrio === 'normal'} onChange={() => setSolPrio('normal')} /> Normal
                    </label>
                    <label style={{ fontSize: 12, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700 }}>
                      <input type="radio" checked={solPrio === 'urgente'} onChange={() => setSolPrio('urgente')} /> Urgente
                    </label>
                    <button disabled={enviandoSol} onClick={enviarSolicitacao} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#7c3aed,#5b4fcf)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: enviandoSol ? 0.6 : 1 }}>
                      <Send size={14} /> {enviandoSol ? 'Enviando...' : 'Enviar solicitação'}
                    </button>
                  </div>
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
                          <div className="stack-mobile" style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 60px', gap: '8px', alignItems: 'end' }}>
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
                    {F('Chave PIX', 'chave_pix', { placeholder: 'CPF, telefone, e-mail ou chave aleatória' })}
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
                    onKeyDown={e => { if (e.key === 'Enter') criarCategoria(novaCatTexto) }}
                    style={{ flex: 1, background: '#f5f4f0', border: '1px solid #e8e6e0', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1a1a1a', outline: 'none' }} />
                  <button onClick={() => criarCategoria(novaCatTexto)}
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

              {distratoProf && distratoPendencias.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px' }}>
                  <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: '14px', marginBottom: '6px' }}>⚠️ Documentos pendentes — {distratoProf.nome_completo}</div>
                  <p style={{ fontSize: '13px', color: '#7f1d1d', margin: '0 0 8px' }}>Este profissional ainda não tem no cadastro: <strong>{distratoPendencias.join(', ')}</strong>.</p>
                  <p style={{ fontSize: '12px', color: '#991b1b', margin: 0 }}>Preencha na <strong>ficha do profissional → Cadastro</strong> antes de gerar o distrato.</p>
                </div>
              )}

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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#5b4fcf', margin: 0, fontFamily: 'sans-serif' }}>✏️ DADOS DO SALÃO (DISTRATANTE)</p>
                      <button onClick={async () => {
                        const res = await fetch('/api/salon/perfil', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: dSalaoNome, responsavel: dSalaoResponsavel, cnpj: dSalaoCNPJ, endereco: dSalaoEndereco, cidade: dSalaoCidade, rg_responsavel: dSalaoRG }) })
                        if (res.ok) toast.success('Dados do salão salvos no perfil!')
                        else toast.error('Erro ao salvar')
                      }} style={{ fontSize: '11px', fontWeight: 600, background: '#5b4fcf', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                        💾 Salvar dados do salão
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Nome do Salão<input style={iStyle} value={dSalaoNome} onChange={e => setDSalaoNome(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Cidade/Estado<input style={iStyle} value={dSalaoCidade} onChange={e => setDSalaoCidade(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Endereço do Salão<input style={iStyle} value={dSalaoEndereco} onChange={e => setDSalaoEndereco(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>CNPJ do Salão<input style={iStyle} value={dSalaoCNPJ} onChange={e => setDSalaoCNPJ(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Responsável do Salão<input style={iStyle} value={dSalaoResponsavel} onChange={e => setDSalaoResponsavel(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>RG do Responsável<input style={iStyle} value={dSalaoRG} onChange={e => setDSalaoRG(e.target.value)} /></label>
                    </div>
                    <p style={{ fontSize: '11px', color: '#767069', margin: '0 0 14px', fontFamily: 'sans-serif', fontStyle: 'italic', background: '#fff', border: '1px dashed #d6d3ce', borderRadius: '8px', padding: '8px 10px' }}>
                      📋 Os dados do profissional (nome, CPF, CNPJ, endereço) são puxados automaticamente do <strong>cadastro do profissional</strong> selecionado acima. Para alterar, edite a ficha dele.
                    </p>
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

                {/* ── Local e data — texto normal (a data vem da Data de Demissão do cadastro) ── */}
                <p style={{ marginBottom: '48pt', fontFamily: 'inherit', textAlign: 'center' }}>
                  {dLocalDistrato || 'Brasília'}, {dDataDistrato || '___/___/______'}
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

          {/* ── CONTRATO DE TRABALHO (PARCERIA) ── */}
          {secao === 'contrato' && (
            <div style={{ maxWidth: '860px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Contrato de Parceria</h2>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  <button onClick={() => setContratoEditando(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: contratoEditando ? '#5b4fcf' : '#f0eeea', color: contratoEditando ? '#fff' : '#444', border: '1px solid #d6d3ce', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    <Edit2 size={14} /> {contratoEditando ? 'Concluir Edição' : 'Editar Arquivo por Completo'}
                  </button>
                  <button onClick={imprimirContrato} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#5b4fcf,#f43f8e)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    🖨️ Imprimir
                  </button>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#444', display: 'block', marginBottom: '8px' }}>Selecionar Profissional (Parceiro)</label>
                <select
                  value={contratoProf?.id || ''}
                  onChange={e => { const p = profissionais.find(x => x.id === e.target.value); if (p) preencherContrato(p) }}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d6d3ce', borderRadius: '8px', fontSize: '14px', background: '#fafaf8', color: '#1a1a1a' }}
                >
                  <option value=''>— Selecione o profissional —</option>
                  {profissionais.filter(p => p.ativo || p.status_cadastro === 'pendente').map(p => (
                    <option key={p.id} value={p.id}>{p.nome_completo}{p.cargo ? ` — ${p.cargo}` : ''}</option>
                  ))}
                </select>
              </div>

              {contratoProf && contratoPendencias.length > 0 && (
                <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px' }}>
                  <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: '14px', marginBottom: '6px' }}>⚠️ Documentos pendentes — {contratoProf.nome_completo}</div>
                  <p style={{ fontSize: '13px', color: '#7f1d1d', margin: '0 0 8px' }}>Este profissional ainda não tem no cadastro: <strong>{contratoPendencias.join(', ')}</strong>.</p>
                  <p style={{ fontSize: '12px', color: '#991b1b', margin: 0 }}>Preencha na <strong>ficha do profissional → Cadastro</strong> antes de gerar o contrato, para ele sair completo.</p>
                </div>
              )}

              <div style={{ background: '#fff', border: '1px solid #d6d3ce', borderRadius: '12px', padding: '48px', fontFamily: "'Times New Roman', Times, serif", fontSize: '12pt', lineHeight: 1.6, color: '#000' }}>
                <h1 style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '28px' }}>Contrato de Parceria</h1>

                {(!dSalaoCNPJ || !dSalaoEndereco) && (
                  <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: '#92400e', fontFamily: 'sans-serif' }}>
                    ⚠️ Preencha CNPJ, endereço e cidade do salão em <strong>Meu Perfil</strong> (ou no botão Editar abaixo) para o contrato ficar completo.
                  </div>
                )}

                {contratoEditando && (
                  <div style={{ background: '#f5f4f0', border: '1px solid #d6d3ce', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#5b4fcf', margin: 0, fontFamily: 'sans-serif' }}>✏️ DADOS DO SALÃO (SALÃO-PARCEIRO)</p>
                      <button onClick={async () => {
                        const res = await fetch('/api/salon/perfil', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: dSalaoNome, responsavel: dSalaoResponsavel, cnpj: dSalaoCNPJ, endereco: dSalaoEndereco, cidade: dSalaoCidade, rg_responsavel: dSalaoRG }) })
                        if (res.ok) toast.success('Dados do salão salvos no perfil!'); else toast.error('Erro ao salvar')
                      }} style={{ fontSize: '11px', fontWeight: 600, background: '#5b4fcf', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                        💾 Salvar dados do salão
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Nome/Razão social<input style={iStyle} value={dSalaoNome} onChange={e => setDSalaoNome(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Endereço/Sede<input style={iStyle} value={dSalaoEndereco} onChange={e => setDSalaoEndereco(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>CNPJ<input style={iStyle} value={dSalaoCNPJ} onChange={e => setDSalaoCNPJ(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Sócio/Responsável (nome)<input style={iStyle} value={dSalaoResponsavel} onChange={e => setDSalaoResponsavel(e.target.value)} placeholder="Ex: BRUNA GEHRKE SCHNEIDER" /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Nacionalidade<input style={iStyle} value={dSalaoNacionalidade} onChange={e => setDSalaoNacionalidade(e.target.value)} placeholder="Ex: brasileira" /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Estado civil<input style={iStyle} value={dSalaoEstadoCivil} onChange={e => setDSalaoEstadoCivil(e.target.value)} placeholder="Ex: casada" /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Profissão<input style={iStyle} value={dSalaoProfissao} onChange={e => setDSalaoProfissao(e.target.value)} placeholder="Ex: empresária" /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>RG do responsável (número)<input style={iStyle} value={dSalaoRG} onChange={e => setDSalaoRG(e.target.value)} placeholder="Ex: 4108029721" /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Órgão emissor do RG<input style={iStyle} value={dSalaoOrgaoRG} onChange={e => setDSalaoOrgaoRG(e.target.value)} placeholder="Ex: SSP/RS" /></label>
                    </div>
                    <p style={{ fontSize: '11px', color: '#767069', margin: '0 0 14px', fontFamily: 'sans-serif', fontStyle: 'italic', background: '#fff', border: '1px dashed #d6d3ce', borderRadius: '8px', padding: '8px 10px' }}>
                      📋 Os dados do profissional (nome, CPF, CNPJ, RG, endereço) são puxados automaticamente do <strong>cadastro do profissional</strong> selecionado acima. Para alterar, edite a ficha dele.
                    </p>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#444', margin: '0 0 12px', fontFamily: 'sans-serif' }}>✏️ LOCAL E DATA</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Local<input style={iStyle} value={cLocalContrato} onChange={e => setCLocalContrato(e.target.value)} /></label>
                      <label style={{ fontSize: '11px', color: '#555', fontFamily: 'sans-serif' }}>Data<input style={iStyle} value={cDataContrato} onChange={e => setCDataContrato(e.target.value)} placeholder="dd/mm/aaaa" /></label>
                    </div>
                  </div>
                )}

                <div dangerouslySetInnerHTML={{ __html: montarContratoHTML(false) }} />

                {/* Local e data — texto normal (a data vem da Data de Admissão do cadastro) */}
                <p style={{ textAlign: 'center', margin: '24pt 0 36pt' }}>
                  {cLocalContrato || 'Brasília (DF)'}, {cDataContrato || '___/___/______'}
                </p>
                <div style={{ marginTop: '8pt' }}>
                  <p style={{ margin: '0 0 2pt' }}>_______________________________________________________</p>
                  <p style={{ margin: '0 0 28pt' }}>{(dSalaoNome || '[NOME DO SALÃO]').toUpperCase()}</p>
                  <p style={{ margin: '0 0 2pt' }}>_______________________________________________________</p>
                  <p style={{ margin: '0 0 24pt' }}>{(cProfNome || '[NOME DO PROFISSIONAL]').toUpperCase()}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── HORÁRIOS E FOLGAS DE TODOS OS PROFISSIONAIS ── */}
          {secao === 'horarios' && (
            <div style={{ maxWidth: '1000px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>Horários e Folgas</h2>
                <p style={{ fontSize: '13px', color: '#6b6860', margin: 0 }}>Horário de trabalho e dias de folga de cada profissional, por categoria. Para alterar, edite a ficha do profissional (aba Cadastro).</p>
              </div>
              {profissionais.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14 }}>Nenhum profissional cadastrado.</div>
              ) : (
                Array.from(new Set(profissionais.map(p => p.cargo || 'Sem categoria'))).sort().map(cat => {
                  const profsCat = profissionais.filter(p => (p.cargo || 'Sem categoria') === cat)
                  return (
                    <div key={cat} style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#5b4fcf', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{cat} <span style={{ color: '#9ca3af', fontWeight: 600 }}>· {profsCat.length}</span></div>
                      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', overflow: 'hidden' }}>
                        {profsCat.map((p, i) => {
                          let sched: any = {}; try { sched = JSON.parse((p as any).habilidades || '{}') } catch { /* */ }
                          const horario = (sched.h_inicio || sched.h_fim) ? `${sched.h_inicio || '?'} às ${sched.h_fim || '?'}` : ''
                          const folgas: string[] = Array.isArray(sched.dias_folga) ? sched.dias_folga : []
                          return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderTop: i > 0 ? '1px solid #f0eee8' : 'none', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, color: '#1a1a1a', fontSize: '14px', flex: '1 1 150px', minWidth: 0 }}>{p.nome_completo}</span>
                              <div style={{ fontSize: '12px', color: '#374151', flex: '1 1 140px' }}>
                                🕐 {horario ? <strong>{horario}</strong> : <span style={{ color: '#b45309' }}>horário não definido</span>}
                              </div>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: '1 1 200px' }}>
                                {folgas.length > 0
                                  ? folgas.map(d => <span key={d} style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', background: '#fef2f2', borderRadius: '20px', padding: '3px 9px' }}>{d}</span>)
                                  : <span style={{ fontSize: '11px', color: '#9ca3af' }}>sem folga definida</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ── PAINEL DE CNPJ DOS PROFISSIONAIS ── */}
          {secao === 'cnpj' && (
            <div style={{ maxWidth: '1000px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', borderBottom: '1px solid #ece9e2', paddingBottom: 12 }}>
                {([['cnpj', 'CNPJ'], ['contratacao', '📝 Processo de Contratação'], ['desligamento', '🚪 Processo de Desligamento']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setCnpjSub(k)} style={{ padding: '8px 16px', borderRadius: 8, border: cnpjSub === k ? '1px solid #5b4fcf' : '1px solid #e0ddd8', background: cnpjSub === k ? '#5b4fcf' : '#fff', color: cnpjSub === k ? '#fff' : '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{l}</button>
                ))}
              </div>
              {cnpjSub === 'contratacao' ? (
                <ProcessoContratacao chave="processo_contratacao_pj" modelo={PJ_CONTRATACAO} titulo="📝 Processo de Contratação (PJ/MEI)" pessoas={profissionais.map(p => ({ nome: p.apelido || p.nome_completo || '—', telefone: (p as any).telefone || (() => { try { return JSON.parse((p as any).contato_responsavel || '{}').tel || '' } catch { return '' } })() }))} />
              ) : cnpjSub === 'desligamento' ? (
                <ProcessoContratacao chave="processo_desligamento_pj" modelo={PJ_DESLIGAMENTO} titulo="🚪 Processo de Desligamento (PJ/MEI)" comCarta={false} pessoas={profissionais.map(p => ({ nome: p.apelido || p.nome_completo || '—', telefone: (p as any).telefone || (() => { try { return JSON.parse((p as any).contato_responsavel || '{}').tel || '' } catch { return '' } })() }))} />
              ) : (<div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>CNPJ dos Profissionais</h2>
                  <p style={{ fontSize: '13px', color: '#6b6860', margin: 0 }}>Veja o CNPJ, a categoria, a data de admissão. Marque o status e anote observações (ex: tem CNPJ mas não está emitindo guia).</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }} className="no-mobile">
                  {(() => {
                    const cols = ['Nome', 'Categoria', 'CNPJ', 'Admissão', 'Status', 'Observação']
                    const rows = () => profissionais.filter(p => !excluiCnpj(p)).sort((a, b) => (a.cargo || '').localeCompare(b.cargo || '')).map(p => [p.nome_completo || '', p.cargo || '', p.cnpj || 'PENDENTE DE CRIAÇÃO', fmtData((p as any).data_admissao), ((p as any).cnpj_status === 'pendente' || !p.cnpj) ? 'Pendente' : 'OK', (p as any).cnpj_observacao || ''])
                    return (<>
                      <button onClick={() => imprimirTabela('CNPJ dos Profissionais', cols, rows())} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🖨️ Imprimir</button>
                      <button onClick={() => exportarExcel('CNPJ_profissionais', cols, rows())} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📊 Excel</button>
                    </>)
                  })()}
                </div>
              </div>
              {profissionais.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14 }}>Nenhum profissional cadastrado.</div>
              ) : (
                Array.from(new Set(profissionais.filter(p => !excluiCnpj(p)).map(p => p.cargo || 'Sem categoria'))).sort().map(cat => {
                  const profsCat = profissionais.filter(p => (p.cargo || 'Sem categoria') === cat && !excluiCnpj(p))
                  return (
                    <div key={cat} style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#5b4fcf', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{cat} <span style={{ color: '#9ca3af', fontWeight: 600 }}>· {profsCat.length}</span></div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {profsCat.map(p => {
                          const edit = cnpjEdits[p.id] || {}
                          const status = edit.status ?? (p as any).cnpj_status ?? (p.cnpj ? 'ok' : 'pendente')
                          const obs = edit.obs ?? (p as any).cnpj_observacao ?? ''
                          const semCnpj = !p.cnpj
                          const adm = (p as any).data_admissao ? String((p as any).data_admissao).slice(0, 10).split('-').reverse().join('/') : '—'
                          return (
                            <div key={p.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                <span style={{ fontWeight: 800, fontSize: '15px', color: '#1a1a1a' }}>{p.nome_completo}</span>
                                {semCnpj
                                  ? <span style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '20px', padding: '3px 10px' }}>⚠️ CNPJ pendente de criação</span>
                                  : <>
                                      <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>CNPJ: {p.cnpj}</span>
                                      <button onClick={() => { try { navigator.clipboard.writeText(p.cnpj || '') } catch { /* */ } toast.success('CNPJ copiado!') }}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid #d0cdc7', background: '#fff', color: '#5b4fcf', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>📋 Copiar</button>
                                    </>}
                                <a href="https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao" target="_blank" rel="noopener noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>🧾 Emitir Guia do MEI ↗</a>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'end' }}>
                                <div>
                                  <label style={{ fontSize: '11px', color: '#6b6860', display: 'block', marginBottom: '3px' }}>Data de admissão</label>
                                  <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{adm}</div>
                                </div>
                                <div>
                                  <label style={{ fontSize: '11px', color: '#6b6860', display: 'block', marginBottom: '3px' }}>Status do CNPJ</label>
                                  <select value={status} onChange={e => setCnpjEdits(prev => ({ ...prev, [p.id]: { ...prev[p.id], status: e.target.value } }))}
                                    style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #d0cdc7', fontSize: '13px', background: status === 'ok' ? '#f0fdf4' : '#fffbeb', color: status === 'ok' ? '#16a34a' : '#b45309', fontWeight: 700 }}>
                                    <option value="ok">✅ OK / Ativo</option>
                                    <option value="pendente">⏳ Pendente</option>
                                  </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <label style={{ fontSize: '11px', color: '#6b6860', display: 'block', marginBottom: '3px' }}>Observação (ex: tem CNPJ mas não emite guia)</label>
                                  <input value={obs} onChange={e => setCnpjEdits(prev => ({ ...prev, [p.id]: { ...prev[p.id], obs: e.target.value } }))}
                                    placeholder="—" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #d0cdc7', fontSize: '13px' }} />
                                </div>
                              </div>
                              {cnpjEdits[p.id] && (
                                <div style={{ marginTop: '10px', textAlign: 'right' }}>
                                  <button onClick={() => salvarCnpj(p)} disabled={cnpjSalvando === p.id}
                                    style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: '#5b4fcf', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                                    {cnpjSalvando === p.id ? 'Salvando...' : '💾 Salvar'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
              </div>)}
            </div>
          )}

          {/* ── PROFISSIONAIS CLT ── */}
          {secao === 'clt' && (
            <div style={{ maxWidth: '1000px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', borderBottom: '1px solid #ece9e2', paddingBottom: 12 }}>
                <button onClick={() => setCltSub('clt')} style={{ padding: '8px 16px', borderRadius: 8, border: cltSub === 'clt' ? '1px solid #0ea5e9' : '1px solid #e0ddd8', background: cltSub === 'clt' ? '#0ea5e9' : '#fff', color: cltSub === 'clt' ? '#fff' : '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Profissionais CLT</button>
                <button onClick={() => setCltSub('processo')} style={{ padding: '8px 16px', borderRadius: 8, border: cltSub === 'processo' ? '1px solid #0ea5e9' : '1px solid #e0ddd8', background: cltSub === 'processo' ? '#0ea5e9' : '#fff', color: cltSub === 'processo' ? '#fff' : '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📝 Processo de Contratação</button>
              </div>
              {cltSub === 'processo' ? (
                <ProcessoContratacao pessoas={profissionais.map(p => ({ nome: p.apelido || p.nome_completo || '—', telefone: (p as any).telefone || (() => { try { return JSON.parse((p as any).contato_responsavel || '{}').tel || '' } catch { return '' } })() }))} />
              ) : (<div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>Profissionais CLT</h2>
                  <p style={{ fontSize: '13px', color: '#6b6860', margin: 0 }}>Profissionais com vínculo CLT (e categorias administrativas). Para marcar alguém como CLT, defina o <strong>Vínculo Trabalhista</strong> na ficha → Cadastro.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }} className="no-mobile">
                  {(() => {
                    const cols = ['Nome', 'Categoria', 'Admissão', 'Horário', 'Folgas', 'Observação']
                    const rows = () => profissionais.filter(ehClt).sort((a, b) => (a.cargo || '').localeCompare(b.cargo || '')).map(p => {
                      let sched: any = {}; try { sched = JSON.parse((p as any).habilidades || '{}') } catch { /* */ }
                      const horario = (sched.h_inicio || sched.h_fim) ? `${sched.h_inicio || '?'} às ${sched.h_fim || '?'}` : ''
                      const folgas = Array.isArray(sched.dias_folga) ? sched.dias_folga.join(', ') : ''
                      return [p.nome_completo || '', p.cargo || '', fmtData((p as any).data_admissao), horario, folgas, (p as any).clt_observacao || '']
                    })
                    return (<>
                      <button onClick={() => imprimirTabela('Profissionais CLT', cols, rows())} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🖨️ Imprimir</button>
                      <button onClick={() => exportarExcel('Profissionais_CLT', cols, rows())} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📊 Excel</button>
                    </>)
                  })()}
                </div>
              </div>
              {(() => {
                const clts = profissionais.filter(ehClt)
                if (clts.length === 0) return <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14 }}>Nenhum profissional CLT. Defina o vínculo &quot;CLT&quot; na ficha de quem é CLT.</div>
                return Array.from(new Set(clts.map(p => p.cargo || 'Sem categoria'))).sort().map(cat => {
                  const profsCat = clts.filter(p => (p.cargo || 'Sem categoria') === cat)
                  return (
                    <div key={cat} style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{cat} <span style={{ color: '#9ca3af', fontWeight: 600 }}>· {profsCat.length}</span></div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {profsCat.map(p => {
                          const obs = (cltEdits[p.id]?.obs) ?? (p as any).clt_observacao ?? ''
                          const fer = getFerias(p)
                          const finfo = feriasInfo(p, fer)
                          const adm = (p as any).data_admissao ? String((p as any).data_admissao).slice(0, 10).split('-').reverse().join('/') : '—'
                          let sched: any = {}; try { sched = JSON.parse((p as any).habilidades || '{}') } catch { /* */ }
                          const horario = (sched.h_inicio || sched.h_fim) ? `${sched.h_inicio || '?'} às ${sched.h_fim || '?'}` : '—'
                          const folgas = Array.isArray(sched.dias_folga) && sched.dias_folga.length ? sched.dias_folga.join(', ') : '—'
                          return (
                            <div key={p.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 800, fontSize: '15px', color: '#1a1a1a' }}>{p.nome_completo}</span>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', background: '#e0f2fe', borderRadius: '20px', padding: '3px 10px' }}>CLT</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', fontSize: '12px', color: '#374151' }}>
                                <div><span style={{ color: '#6b6860' }}>Admissão:</span> <strong>{adm}</strong></div>
                                <div><span style={{ color: '#6b6860' }}>Horário:</span> <strong>{horario}</strong></div>
                                <div><span style={{ color: '#6b6860' }}>Folgas:</span> <strong>{folgas}</strong></div>
                              </div>
                              <div style={{ marginTop: '10px' }}>
                                <label style={{ fontSize: '11px', color: '#6b6860', display: 'block', marginBottom: '3px' }}>Observação</label>
                                <input value={obs} onChange={e => setCltEdits(prev => ({ ...prev, [p.id]: { obs: e.target.value } }))}
                                  placeholder="—" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #d0cdc7', fontSize: '13px' }} />
                              </div>

                              {/* ── FÉRIAS ── */}
                              <div style={{ marginTop: '12px', background: '#f7fbff', border: '1px solid #dcefff', borderRadius: '10px', padding: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0369a1' }}>🏖️ Férias</span>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: finfo.cor, borderRadius: 20, padding: '3px 10px' }}>Próxima: {finfo.texto}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 8 }}>
                                  <div><label style={lblFer}>Última férias — início</label><input type="date" value={fer.ult_ini || ''} onChange={e => setFeriasCampo(p.id, 'ult_ini', e.target.value)} style={inpFer} /></div>
                                  <div><label style={lblFer}>Última férias — fim</label><input type="date" value={fer.ult_fim || ''} onChange={e => setFeriasCampo(p.id, 'ult_fim', e.target.value)} style={inpFer} /></div>
                                  <div style={{ gridColumn: '1 / -1' }}><label style={lblFer}>Observação das férias</label><input value={fer.ult_obs || ''} onChange={e => setFeriasCampo(p.id, 'ult_obs', e.target.value)} placeholder="—" style={inpFer} /></div>
                                </div>
                                <div style={{ borderTop: '1px dashed #cde7f7', paddingTop: 8 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', marginBottom: 6 }}>Marcar próxima férias {fer.fut1_ini && <span style={{ color: '#16a34a' }}>· agendada (contador zerado)</span>}</div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                                    <div><label style={lblFer}>1º período — início</label><input type="date" value={fer.fut1_ini || ''} onChange={e => setFeriasCampo(p.id, 'fut1_ini', e.target.value)} style={inpFer} /></div>
                                    <div><label style={lblFer}>1º período — fim</label><input type="date" value={fer.fut1_fim || ''} onChange={e => setFeriasCampo(p.id, 'fut1_fim', e.target.value)} style={inpFer} /></div>
                                    <div><label style={lblFer}>2º período (dividir) — início</label><input type="date" value={fer.fut2_ini || ''} onChange={e => setFeriasCampo(p.id, 'fut2_ini', e.target.value)} style={inpFer} /></div>
                                    <div><label style={lblFer}>2º período — fim</label><input type="date" value={fer.fut2_fim || ''} onChange={e => setFeriasCampo(p.id, 'fut2_fim', e.target.value)} style={inpFer} /></div>
                                  </div>
                                  {fer.fut1_ini && <button onClick={() => concluirFerias(p)} style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid #16a34a', background: '#fff', color: '#16a34a', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Concluí estas férias (vira a última e reinicia o contador)</button>}
                                </div>
                              </div>

                              {(cltEdits[p.id] || cltFerias[p.id]) && (
                                <div style={{ marginTop: '10px', textAlign: 'right' }}>
                                  <button onClick={() => salvarClt(p)} disabled={cltSalvando === p.id} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: '#0ea5e9', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                                    {cltSalvando === p.id ? 'Salvando...' : '💾 Salvar'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              })()}
              </div>)}
            </div>
          )}

          {/* ── MATERIAIS PARA TRABALHO (planilha editável) ── */}
          {secao === 'materiais' && (
            <div style={{ maxWidth: '1000px' }}>
              <div style={{ marginBottom: 14 }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>Materiais para Trabalho</h2>
              </div>
              <MateriaisTrabalho />
            </div>
          )}

          {/* ── GUIA DE ENTREVISTA ── */}
          {secao === 'entrevista' && (
            <div style={{ maxWidth: '820px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>Guia de Entrevista</h2>
                  <p style={{ fontSize: '13px', color: '#6b6860', margin: 0 }}>Roteiro completo para entrevistar novos profissionais. Imprima em A4 com espaço para anotar as respostas.</p>
                </div>
                <button onClick={imprimirGuiaEntrevista} className="no-mobile" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>🖨️ Imprimir Ficha (A4)</button>
              </div>
              <div style={{ background: '#f0eefb', border: '1px solid #ddd6fb', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontWeight: 800, color: '#5b4fcf', fontSize: 13, marginBottom: 6 }}>Antes da entrevista</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                  {GUIA_ENTREVISTA.antes.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
              {(() => { let n = 0; return GUIA_ENTREVISTA.blocos.map((b, bi) => (
                <div key={bi} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '16px', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, color: '#5b4fcf', fontSize: 14, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #f0eee8' }}>{b.titulo}</div>
                  <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {b.perguntas.map((q, qi) => { n++; return <li key={qi} style={{ display: 'flex', gap: 8, fontSize: 14, color: '#1a1a1a', lineHeight: 1.5 }}><span style={{ fontWeight: 800, color: '#5b4fcf', flexShrink: 0 }}>{n}.</span><span>{q}</span></li> })}
                  </ol>
                </div>
              )) })()}
              <div style={{ fontSize: 12, color: '#6b6860', fontStyle: 'italic', background: '#faf9f7', borderRadius: 10, padding: '12px 14px' }}>💡 {GUIA_ENTREVISTA.nota}</div>
            </div>
          )}

          {/* ── RANKING DE AVALIAÇÕES (quem cresce / quem cai) ── */}
          {secao === 'ranking' && (() => {
            const ov = (resp: any) => { const v = Object.values(resp || {}) as number[]; return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length / 5 * 100) : null }
            const parse = (a: any) => { try { return Array.isArray(a) ? a : (a ? JSON.parse(a) : []) } catch { return [] } }
            const linhas = profissionais.filter(p => p.ativo !== false && !(p as any).is_departamento).map(p => {
              const avs = parse((p as any).avaliacoes).sort((a: any, b: any) => (b.data || '').localeCompare(a.data || ''))
              const atual = avs[0] ? ov(avs[0].respostas) : null
              const ant = avs[1] ? ov(avs[1].respostas) : null
              const delta = (atual != null && ant != null) ? atual - ant : null
              return { nome: p.apelido || p.nome_completo || '—', cargo: p.cargo || '', atual, delta, qtd: avs.length, data: avs[0]?.data || '' }
            }).sort((a, b) => (b.atual ?? -1) - (a.atual ?? -1))
            const corPct = (v: number | null) => v == null ? '#9ca3af' : v >= 80 ? '#16a34a' : v >= 60 ? '#f59e0b' : '#ef4444'
            const medalha = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`
            return (
              <div style={{ maxWidth: 900 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>🏆 Ranking de Avaliações</h2>
                <p style={{ fontSize: 13, color: '#6b6860', margin: '0 0 16px' }}>Classificação pela <strong>última avaliação</strong> de cada profissional, com a variação (Δ) em relação à anterior. As notas vêm da aba <strong>Avaliar</strong>.</p>
                {linhas.length === 0 ? <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>Nenhum profissional ativo.</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {linhas.map((l, i) => (
                      <div key={i} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 18, fontWeight: 900, width: 34, textAlign: 'center', flexShrink: 0 }}>{medalha(i)}</span>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: '#1a1a1a' }}>{l.nome}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{l.cargo}{l.qtd ? ` · ${l.qtd} avaliação${l.qtd !== 1 ? 'ões' : ''}` : ' · sem avaliação'}</div>
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 900, color: corPct(l.atual), width: 60, textAlign: 'right' }}>{l.atual == null ? '—' : l.atual + '%'}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, width: 64, textAlign: 'right', color: l.delta == null ? '#9ca3af' : l.delta > 0 ? '#16a34a' : l.delta < 0 ? '#dc2626' : '#9ca3af' }}>{l.delta == null ? '–' : `${l.delta > 0 ? '↑' : l.delta < 0 ? '↓' : '→'} ${Math.abs(l.delta)}%`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── DESCRIÇÃO DE CARGO (lista de cargos → descrição editável) ── */}
          {secao === 'descricao_cargo' && (
            <DescricaoCargo categorias={categorias} />
          )}

          {/* ── PERFIL IDEAL / MODELO DE AVALIAÇÃO (fonte única — alimenta a aba Avaliar) ── */}
          {secao === 'perfil' && (
            <div style={{ maxWidth: 1000 }}>
              <EditorAvaliacao />
            </div>
          )}

          {/* ── PLANO DE CARREIRA PJ (trilha de níveis editável) ── */}
          {secao === 'carreira' && <PlanoCarreiraPJ />}

          {/* ── ACESSO GLOBAL (o que todos os profissionais veem no portal) ── */}
          {secao === 'acesso_global' && <AcessoGlobalProfissionais />}

          {/* ── NORMA DE CONDUTA (manual completo, editável por salão) ── */}
          {secao === 'conduta' && (
            <div style={{ maxWidth: 1000 }}>
              <h2 style={{ color: '#1a1a1a', fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>Norma de Conduta</h2>
              <p style={{ color: '#767069', fontSize: 13, margin: '0 0 18px' }}>
                Manual de conduta do salão. Clique em <strong>Editar</strong> para adaptar o texto à sua realidade — tudo é salvo automaticamente. Use <strong>Imprimir</strong> para gerar o documento em A4 com a logo do salão para assinatura.
              </p>
              <NormaConduta />
            </div>
          )}

          {/* ── SEÇÕES DE CONTEÚDO INFORMATIVO ── */}
          {CONTEUDO_INFO[secao] && secao !== 'perfil' && (
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
