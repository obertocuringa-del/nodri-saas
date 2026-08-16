// ── Cliente do Asaas ────────────────────────────────────────────────────────
//
// Assinatura recorrente no cartão: o Asaas cobra sozinho todo mês e avisa o
// resultado pelo webhook. O NODRI deixa de contar dias.
//
// O CARTÃO NUNCA PASSA POR AQUI. Quem coleta os dados é o checkout hospedado
// do Asaas; o sistema recebe de volta apenas a URL para onde mandar o cliente
// e, depois, o aviso de que a assinatura nasceu. Guardar número de cartão
// exigiria certificação PCI — responsabilidade que não vale a pena carregar
// para um ganho de UX pequeno.
//
// Enquanto ASAAS_API_KEY não existir, `asaasAtivo()` responde false e nada é
// cobrado. É o que permite este arquivo estar no ar antes da conta ficar
// pronta, sem risco.

const BASE_PROD = 'https://api.asaas.com/v3'
const BASE_SANDBOX = 'https://api-sandbox.asaas.com/v3'

function chave(): string {
  return process.env.ASAAS_API_KEY || ''
}

/** Sandbox por padrão: só cobra de verdade quando você disser explicitamente. */
function base(): string {
  return process.env.ASAAS_AMBIENTE === 'producao' ? BASE_PROD : BASE_SANDBOX
}

export function asaasAtivo(): boolean {
  return !!chave()
}

export function asaasEmProducao(): boolean {
  return process.env.ASAAS_AMBIENTE === 'producao'
}

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T> {
  if (!asaasAtivo()) throw new Error('ASAAS_API_KEY não configurada')

  const r = await fetch(`${base()}${caminho}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: chave(),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })

  const texto = await r.text()
  let corpo: any = null
  try { corpo = texto ? JSON.parse(texto) : null } catch { /* resposta não-JSON */ }

  if (!r.ok) {
    // O Asaas devolve os motivos em errors[].description — é o que o suporte
    // dele pede quando você abre chamado, então vale propagar inteiro.
    const motivo = corpo?.errors?.map((e: any) => e.description).join('; ')
    throw new Error(motivo || `Asaas respondeu ${r.status}`)
  }
  return corpo as T
}

export interface ClienteAsaas { id: string; name: string; email: string }

/**
 * Cliente no Asaas — um por salão, reusado sempre.
 * Criar um novo a cada assinatura encheria o painel de duplicados e quebraria
 * o histórico de cobrança de quem troca de plano.
 */
export async function criarOuAcharCliente(dados: {
  nome: string; email: string; telefone?: string; cpfCnpj?: string
}): Promise<ClienteAsaas> {
  const achados = await chamar<{ data: ClienteAsaas[] }>(
    `/customers?email=${encodeURIComponent(dados.email)}`,
  )
  if (achados?.data?.length) return achados.data[0]

  return chamar<ClienteAsaas>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: dados.nome,
      email: dados.email,
      mobilePhone: (dados.telefone || '').replace(/\D/g, '') || undefined,
      cpfCnpj: (dados.cpfCnpj || '').replace(/\D/g, '') || undefined,
    }),
  })
}

export interface AssinaturaAsaas {
  id: string
  status: string
  nextDueDate: string
  value: number
}

/**
 * Assinatura mensal no cartão.
 *
 * `nextDueDate` é a PRIMEIRA cobrança. Uso amanhã em vez de hoje porque o
 * Asaas recusa data no passado, e "hoje" vira passado no fuso dele assim que
 * passa da meia-noite — um cadastro tarde da noite falharia sem explicação.
 */
export async function criarAssinatura(dados: {
  clienteId: string
  valor: number
  descricao: string
  diaVencimento?: number
}): Promise<AssinaturaAsaas> {
  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const proxima = amanha.toISOString().split('T')[0]

  return chamar<AssinaturaAsaas>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: dados.clienteId,
      billingType: 'CREDIT_CARD',
      cycle: 'MONTHLY',
      value: dados.valor,
      nextDueDate: proxima,
      description: dados.descricao,
    }),
  })
}

/** Link do checkout hospedado da primeira cobrança — é para onde o cliente vai. */
export async function linkDePagamento(assinaturaId: string): Promise<string | null> {
  const cobrancas = await chamar<{ data: { invoiceUrl?: string }[] }>(
    `/subscriptions/${assinaturaId}/payments`,
  )
  return cobrancas?.data?.[0]?.invoiceUrl || null
}

/**
 * Troca de plano SEM pedir o cartão de novo.
 *
 * O caminho óbvio — cancelar e criar outra — quebra justamente o que faz a
 * recorrência valer a pena: a assinatura nova nasce sem cartão, e o cliente
 * teria de digitar tudo outra vez só para mudar de plano. O Asaas guarda o
 * cartão na assinatura, então atualizar o valor preserva a cobrança
 * automática.
 *
 * `updatePendingPayments` faz a cobrança já gerada e ainda não paga assumir o
 * valor novo. Sem isso, quem sobe de plano hoje ainda pagaria o valor antigo
 * neste mês — e quem desce pagaria o caro.
 */
export async function atualizarAssinatura(assinaturaId: string, dados: {
  valor: number; descricao: string
}): Promise<AssinaturaAsaas> {
  return chamar<AssinaturaAsaas>(`/subscriptions/${assinaturaId}`, {
    method: 'POST',
    body: JSON.stringify({
      value: dados.valor,
      description: dados.descricao,
      updatePendingPayments: true,
    }),
  })
}

export async function cancelarAssinatura(assinaturaId: string): Promise<void> {
  await chamar(`/subscriptions/${assinaturaId}`, { method: 'DELETE' })
}
