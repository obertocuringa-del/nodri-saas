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
  comoLancar?: string      // passo a passo de como lançar no sistema (expansível no card)
  categoria: string
  // Preço da campanha. Antes o valor ia dentro do título ("ENVELOPAMENTO 2x de
  // R$ 110,45") porque não havia onde pôr — e título não tem como destacar
  // desconto nem riscar o valor cheio.
  precoDe?: string         // valor cheio, sai riscado (opcional)
  precoPor?: string        // valor final, o que se destaca
  parcelas?: string        // em quantas vezes (opcional); a parcela é calculada
  dataInicio?: string      // 'YYYY-MM-DD'
  dataFim?: string         // 'YYYY-MM-DD'
  ativa: boolean           // publicada (ligar/desligar)
  arquivos: ArquivoCampanha[]
  capaId?: string          // qual arquivo é a capa
  views: number
  shares: number
  // Quem compartilhou e quantas vezes (profissionais, sub-usuários e o salão).
  // chave = `prof:<id>` | `sub:<id>` | `salon`
  sharesPor?: Record<string, { nome: string; papel: string; n: number }>
  criadoEm: number
}

export const CATEGORIAS_ACOES = [
  'Capilar', 'Coloração', 'Manicure', 'Pedicure', 'Estética',
  'Datas comemorativas', 'Pacotes', 'Combos', 'Vendas de produtos', 'Reativação de clientes',
]

/** Number a partir do que a pessoa digitou: aceita '110,45' e '110.45'. */
function num(v: any): number {
  const n = Number(String(v ?? '').replace(/[^0-9,.-]/g, '').replace(',', '.'))
  return isFinite(n) ? n : 0
}

const reais = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export interface PrecoExibido {
  de: string | null          // valor cheio, para riscar
  por: string                // valor final
  parcela: string | null     // '2x de R$ 110,45'
  descontoPct: number | null // calculado, nunca digitado — conta não discorda de si mesma
}

/**
 * Como o preço da campanha aparece. `null` quando não há preço — campanha de
 * brinde ou de condição segue sem número, como sempre foi.
 */
export function precoDaCampanha(c: Pick<Campanha, 'precoDe' | 'precoPor' | 'parcelas'>): PrecoExibido | null {
  const por = num(c.precoPor)
  if (por <= 0) return null
  const de = num(c.precoDe)
  const vezes = Math.floor(num(c.parcelas))

  // Só risca quando o cheio é MAIOR: 'de' menor que 'por' seria digitação
  // trocada, e mostrar assim anuncia um aumento no lugar do desconto.
  const temDesconto = de > por
  return {
    de: temDesconto ? reais(de) : null,
    por: reais(por),
    parcela: vezes > 1 ? `${vezes}x de ${reais(por / vezes)}` : null,
    descontoPct: temDesconto ? Math.round(((de - por) / de) * 100) : null,
  }
}

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

// Texto de VÁRIAS campanhas juntas (compartilhar seleção para o mesmo cliente).
export function textoCampanhas(cs: Campanha[]): string {
  return cs.map(textoCampanha).join('\n\n———\n\n')
}

export function normalizaServico(s: string): string {
  return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim()
}

export const rid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
