// Módulo "Ações Comerciais" — biblioteca de campanhas do salão (client-safe).
// Etapa 1: cadastro, galeria de imagens (leves), portal do profissional (só
// leitura), copiar/compartilhar texto e estatística de serviços vendidos por
// nome (a campanha tem o mesmo nome de um serviço; a contagem vem do relatório
// "Serviços mais vendidos" dentro do período da campanha).

export interface ArquivoCampanha {
  id: string
  tipo: 'imagem'           // vídeo/PDF entram na Etapa 2
  url: string              // base64 (imagens leves nesta etapa)
  nome: string
}

export interface Campanha {
  id: string
  titulo: string
  descricao: string        // resumo (aparece no card)
  comoFunciona: string     // texto rico simples (quebras de linha)
  categoria: string
  dataInicio?: string      // 'YYYY-MM-DD'
  dataFim?: string         // 'YYYY-MM-DD'
  ativa: boolean           // publicada (ligar/desligar)
  arquivos: ArquivoCampanha[]
  capaId?: string          // qual arquivo é a capa
  views: number
  shares: number
  criadoEm: number
}

export const CATEGORIAS_ACOES = [
  'Capilar', 'Coloração', 'Manicure', 'Pedicure', 'Estética',
  'Datas comemorativas', 'Pacotes', 'Combos', 'Vendas de produtos', 'Reativação de clientes',
]

export type StatusCampanha = 'ativa' | 'agendada' | 'encerrada' | 'inativa'

export const STATUS_INFO: Record<StatusCampanha, { label: string; bg: string; cor: string }> = {
  ativa:     { label: 'Ativa',     bg: '#ec489922', cor: '#db2777' },
  agendada:  { label: 'Agendada',  bg: '#8b5cf622', cor: '#7c3aed' },
  encerrada: { label: 'Encerrada', bg: '#6b728022', cor: '#4b5563' },
  inativa:   { label: 'Inativa',   bg: '#9ca3af22', cor: '#6b7280' },
}

// Status exibido = derivado do publicado + datas.
export function statusCampanha(c: Campanha, hoje = new Date()): StatusCampanha {
  if (!c.ativa) return 'inativa'
  const hojeStr = hoje.toISOString().slice(0, 10)
  if (c.dataInicio && c.dataInicio > hojeStr) return 'agendada'
  if (c.dataFim && c.dataFim < hojeStr) return 'encerrada'
  return 'ativa'
}

export function capaDaCampanha(c: Campanha): ArquivoCampanha | null {
  if (!c.arquivos?.length) return null
  return c.arquivos.find(a => a.id === c.capaId) || c.arquivos[0]
}

// Texto pronto para copiar / mandar no WhatsApp.
export function textoCampanha(c: Campanha): string {
  const linhas = [c.titulo]
  if (c.descricao?.trim()) linhas.push('', c.descricao.trim())
  if (c.comoFunciona?.trim()) linhas.push('', c.comoFunciona.trim())
  return linhas.join('\n')
}

export function normalizaServico(s: string): string {
  return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim()
}

export const rid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
