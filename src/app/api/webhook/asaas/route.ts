import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { nomesDeBancoDoPlano } from '@/lib/planosModulos'
import { hashPassword } from '@/lib/auth'
import { enviarEmailBoasVindas } from '@/lib/email'
import { buscarAssinatura, atualizarAssinatura } from '@/lib/asaas'
import { registrarComissao, assinaturaJaPagouComissao } from '@/lib/afiliados'
import { sendEmailComissao } from '@/lib/email'
import { randomBytes } from 'crypto'
import { ehChaveDoModelo, sanitizar, versaoDoModelo, marcarOrigem } from '@/lib/modeloSalao'
import { copiarMoldesDeTabelas } from '@/lib/modeloTabelas'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── Webhook do Asaas ────────────────────────────────────────────────────────
//
// Com assinatura, quem manda no ciclo é o Asaas: ele cobra sozinho todo mês e
// avisa aqui o resultado. O NODRI para de contar dias e passa a obedecer.
//
// Regras que este arquivo segue, e o porquê de cada uma:
//
// • SEMPRE responder 200, mesmo em erro nosso. O Asaas reenvia a notificação
//   quando não recebe 200, e uma falha nossa viraria uma fila de reenvios que
//   trava as notificações seguintes do mesmo cliente.
//
// • Registrar o evento ANTES de decidir o que fazer. Se a decisão der errado,
//   ainda dá para saber o que chegou. Sem isso, cobrança que falhou some sem
//   deixar rastro.
//
// • Idempotência pelo par (evento, cobrança). Reenvio é normal no Asaas, e sem
//   isso um reenvio de PAYMENT_RECEIVED somaria mês em cima de mês.

// Quem pode chamar. O Asaas manda o token que VOCÊ cadastrou no painel dele,
// no cabeçalho asaas-access-token. Sem conferir isso, qualquer um que
// descobrisse a URL poderia ativar salão de graça.
function autorizado(req: NextRequest): boolean {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN || ''
  if (!esperado) return true // ainda não configurado: não bloqueia o teste inicial
  return req.headers.get('asaas-access-token') === esperado
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }

  let corpo: any = null
  try { corpo = await req.json() } catch { return NextResponse.json({ ok: true }) }

  const evento: string = corpo?.event || ''
  const pagamento = corpo?.payment || {}
  const assinaturaId: string | null = pagamento?.subscription || null
  const cobrancaId: string | null = pagamento?.id || null

  try {
    // Salão dono da assinatura.
    let salao: any = null
    if (assinaturaId) {
      const { data } = await supabase
        .from('saloes').select('id, nome').eq('asaas_subscription_id', assinaturaId).maybeSingle()
      salao = data
    }

    // Registra o que chegou. O índice único descarta reenvio silenciosamente.
    const { error: erroEvento } = await supabase.from('asaas_eventos').insert({
      salao_id: salao?.id || null,
      evento,
      assinatura_id: assinaturaId,
      cobranca_id: cobrancaId,
      valor: typeof pagamento?.value === 'number' ? pagamento.value : null,
      payload: corpo,
    })
    // Violação de unicidade = já processamos este evento. Sair aqui é o que
    // impede o reenvio de somar mês de novo.
    if (erroEvento && String(erroEvento.code) === '23505') {
      return NextResponse.json({ ok: true, repetido: true })
    }

    // ── Primeira cobrança de um cadastro novo: o salão ainda não existe ───
    //
    // Sem isto o cliente pagava e não recebia nada. O webhook procurava o
    // salão pelo id da assinatura, não achava (porque o cadastro só tinha
    // gravado a intenção em `compras`) e ia embora em silêncio — sem acesso
    // para ele e sem aviso para o dono do NODRI.
    //
    // O salão nasce AQUI, e não no cadastro, de propósito: cadastro sem
    // pagamento viraria salão fantasma ocupando a lista e a contagem de
    // clientes.
    if (!salao && (evento === 'PAYMENT_RECEIVED' || evento === 'PAYMENT_CONFIRMED') && assinaturaId) {
      salao = await criarSalaoDaCompra(assinaturaId)
      if (!salao) return NextResponse.json({ ok: true, semCompra: true })
    }

    if (!salao) return NextResponse.json({ ok: true, semSalao: true })

    // ── Pagamento entrou ──────────────────────────────────────────────────
    if (evento === 'PAYMENT_RECEIVED' || evento === 'PAYMENT_CONFIRMED') {
      // ── Até quando ele está pago ──────────────────────────────────────
      //
      // TEM que ser a PRÓXIMA cobrança da assinatura, não a data da cobrança
      // que acabou de ser paga. `payment.dueDate` é a data DESTA cobrança —
      // hoje, ou antes. Gravar isso em `licenca_vencimento` fazia o cron
      // check-licencas (que bloqueia todo salão com vencimento anterior a
      // hoje) derrubar, no dia seguinte, exatamente quem tinha acabado de
      // pagar.
      //
      // Quem sabe a próxima data é o Asaas: ela já considera atraso e
      // proporcional de troca de plano. Se a consulta falhar, somamos um mês
      // à cobrança paga — errar para MAIS mantém o cliente dentro, e um dia a
      // mais de acesso é infinitamente mais barato que bloquear quem pagou.
      const assinatura = assinaturaId ? await buscarAssinatura(assinaturaId) : null
      let proxima: string | null = assinatura?.nextDueDate || null
      if (!proxima && pagamento?.dueDate) {
        const d = new Date(`${pagamento.dueDate}T12:00:00`)
        d.setMonth(d.getMonth() + 1)
        proxima = d.toISOString().split('T')[0]
      }

      await supabase.from('saloes').update({
        status: 'ativo',
        asaas_status: 'ACTIVE',
        asaas_proxima_cobranca: proxima,
        // Mantém o campo antigo em dia: o resto do sistema (crons de aviso,
        // tela de licença) ainda lê daqui.
        licenca_vencimento: proxima,
      }).eq('id', salao.id)

      await ligarModulosDoPlano(salao.id)

      // Dinheiro que entrou pode ser de cliente indicado: gera a comissão e,
      // se o desconto valia só na primeira cobrança, devolve o valor cheio.
      await tratarAfiliado({
        salaoId: salao.id,
        salaoNome: salao.nome,
        assinaturaId,
        cobrancaId,
        valorPago: typeof pagamento?.value === 'number' ? pagamento.value : 0,
      })

      return NextResponse.json({ ok: true })
    }

    // ── Atrasou ───────────────────────────────────────────────────────────
    // NÃO bloqueia na hora. O cartão pode falhar por limite momentâneo e o
    // Asaas tenta de novo sozinho; derrubar o acesso de um cliente adimplente
    // por causa da primeira tentativa é pior do que esperar. Quem bloqueia é
    // o cron de licença, quando a data realmente vence.
    if (evento === 'PAYMENT_OVERDUE') {
      await supabase.from('saloes').update({ asaas_status: 'OVERDUE' }).eq('id', salao.id)
      return NextResponse.json({ ok: true })
    }

    // ── Assinatura encerrada ou dinheiro devolvido ────────────────────────
    if (evento === 'PAYMENT_DELETED' || evento === 'PAYMENT_REFUNDED' || evento === 'SUBSCRIPTION_DELETED') {
      await supabase.from('saloes').update({
        asaas_status: 'CANCELED',
        status: 'vencido',
      }).eq('id', salao.id)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true, ignorado: evento })
  } catch (e: any) {
    // 200 de propósito, com o erro registrado: ver a nota no topo.
    await supabase.from('asaas_eventos').insert({
      evento: `ERRO:${evento}`, assinatura_id: assinaturaId, cobranca_id: null,
      payload: { erro: String(e?.message || e), corpo },
    }).select()
    return NextResponse.json({ ok: true, erroRegistrado: true })
  }
}

/**
 * Comissão do afiliado e fim do desconto de estreia.
 *
 * A comissão sai UMA VEZ, na mensalidade de estreia. Não é recorrente de
 * propósito: com desconto e comissão altos (60% e 60%, por exemplo) o primeiro
 * mês praticamente não deixa nada para a NODRI — o que paga a conta são os
 * meses seguintes, inteiros. Repetir a comissão todo mês inverteria isso.
 *
 * Duas travas, e cada uma pega um caso: o id da cobrança (único na tabela)
 * barra o reenvio do mesmo webhook; a checagem por assinatura barra a
 * mensalidade do mês seguinte, que é outra cobrança.
 *
 * Quem paga o afiliado é a NODRI, por Pix — o Asaas só recebe do cliente.
 * Por isso a comissão nasce como "pendente" e vira "pago" quando você marcar
 * no painel, depois de fazer o Pix.
 */
async function tratarAfiliado(dados: {
  salaoId: string; salaoNome: string
  assinaturaId: string | null; cobrancaId: string | null; valorPago: number
}) {
  if (!dados.valorPago) return

  // De quem foi a indicação: o salão guarda, e na primeira cobrança ainda não
  // guardava — aí vem da compra que originou a assinatura.
  const { data: salao } = await supabase
    .from('saloes').select('afiliado_id, plano_id, planos(nome)').eq('id', dados.salaoId).maybeSingle()

  let afiliadoId: string | null = (salao as any)?.afiliado_id || null
  let compra: any = null

  if (dados.assinaturaId) {
    const { data } = await supabase
      .from('compras')
      .select('afiliado_id, cupom, plano, preco_original, desconto_apenas_primeira, desconto_percentual')
      .eq('payment_id', dados.assinaturaId).maybeSingle()
    compra = data
    if (!afiliadoId && compra?.afiliado_id) {
      afiliadoId = compra.afiliado_id
      // Grava no salão para as próximas cobranças não dependerem da compra.
      await supabase.from('saloes')
        .update({ afiliado_id: afiliadoId, afiliado_cupom: compra.cupom || null })
        .eq('id', dados.salaoId)
    }
  }

  // ── Desconto só na estreia ────────────────────────────────────────────────
  // O Asaas aplica o valor da assinatura em todas as cobranças, então "só a
  // primeira" se faz assim: a assinatura nasce com o valor com desconto e,
  // paga a primeira, volta ao preço de tabela. `updatePendingPayments` dentro
  // de atualizarAssinatura faz a próxima cobrança já sair pelo valor novo.
  if (compra?.desconto_apenas_primeira && dados.assinaturaId && Number(compra.preco_original) > 0) {
    const jaVoltou = Math.abs(Number(compra.preco_original) - dados.valorPago) < 0.01
    if (!jaVoltou) {
      try {
        await atualizarAssinatura(dados.assinaturaId, {
          valor: Number(compra.preco_original),
          descricao: `NODRI ${compra.plano || ''}`.trim(),
        })
      } catch (e) {
        console.error('Não deu para voltar o valor cheio da assinatura:', e)
      }
    }
  }

  if (!afiliadoId) return

  // Mensalidade seguinte do mesmo cliente: já rendeu comissão na estreia.
  if (await assinaturaJaPagouComissao(dados.assinaturaId)) return

  const { data: afiliado } = await supabase
    .from('afiliados').select('id, nome, email, cupom, comissao_percentual, ativo').eq('id', afiliadoId).maybeSingle()
  if (!afiliado || !afiliado.ativo) return

  const percentual = Number(afiliado.comissao_percentual) || 40
  const planoNome = compra?.plano
    || (Array.isArray((salao as any)?.planos) ? (salao as any).planos[0]?.nome : (salao as any)?.planos?.nome)
    || ''

  const comissao = await registrarComissao({
    afiliadoId: afiliado.id,
    cobrancaId: dados.cobrancaId,
    assinaturaId: dados.assinaturaId,
    salaoId: dados.salaoId,
    salaoNome: dados.salaoNome,
    plano: planoNome,
    valorPago: dados.valorPago,
    percentual,
  })

  // null = webhook repetido, já contabilizado. Nada a avisar.
  if (!comissao) return

  try {
    await sendEmailComissao({
      nome: afiliado.nome, email: afiliado.email, cupom: afiliado.cupom,
      valorCompra: dados.valorPago, valorComissao: Number(comissao.valor_comissao), plano: planoNome,
    })
  } catch (e) {
    console.error('Email de comissão não saiu:', e)
  }

  await supabase.from('notificacoes').insert({
    titulo: 'Comissão de afiliado a pagar',
    mensagem: `${afiliado.nome} (${afiliado.cupom}) tem R$ ${Number(comissao.valor_comissao).toFixed(2)} a receber pela venda de ${dados.salaoNome}.`,
    tipo: 'info', para_todos: false, lida: false, salao_id: null,
    metadata: { tipo: 'comissao_afiliado', afiliado_id: afiliado.id, comissao_id: comissao.id },
  })
}

/** Liga os módulos do plano contratado, do mesmo jeito que o Mercado Pago já fazia. */
async function ligarModulosDoPlano(salaoId: string) {
  const { data: salao } = await supabase
    .from('saloes').select('plano_id, planos(nome)').eq('id', salaoId).maybeSingle()

  const plano = (salao as any)?.planos
  const nomePlano = Array.isArray(plano) ? plano[0]?.nome : plano?.nome
  if (!nomePlano) return

  const nomes = nomesDeBancoDoPlano(nomePlano)
  if (!nomes.length) return

  const { data: modulos } = await supabase.from('modulos').select('id').in('nome', nomes)
  if (!modulos?.length) return

  await supabase.from('salao_modulos').delete().eq('salao_id', salaoId)
  await supabase.from('salao_modulos').insert(
    modulos.map((m: any) => ({ salao_id: salaoId, modulo_id: m.id, ativo: true })),
  )
}

/**
 * Cria o salão a partir da compra que gerou esta assinatura.
 *
 * Devolve null quando não há compra correspondente — pode ser uma assinatura
 * criada direto no painel do Asaas, e nesse caso não há dados de cadastro
 * para montar salão nenhum.
 */
async function criarSalaoDaCompra(assinaturaId: string): Promise<{ id: string; nome: string } | null> {
  const { data: compra } = await supabase
    .from('compras').select('*').eq('payment_id', assinaturaId).maybeSingle()
  if (!compra?.email) return null

  const email = String(compra.email).toLowerCase()

  // Já existe salão com este e-mail? Então é renovação de quem já é cliente:
  // liga a assinatura ao salão existente em vez de criar um segundo.
  const { data: existente } = await supabase
    .from('saloes').select('id, nome').eq('email', email).maybeSingle()
  if (existente) {
    await supabase.from('saloes').update({ asaas_subscription_id: assinaturaId }).eq('id', existente.id)
    return existente
  }

  const { data: planoRow } = await supabase
    .from('planos').select('id').ilike('nome', compra.plano || '').maybeSingle()

  const { data: salao, error: erroSalao } = await supabase
    .from('saloes')
    .insert({
      nome: compra.nome_salao,
      responsavel: compra.responsavel || compra.nome_salao,
      email,
      telefone: compra.telefone || null,
      plano_id: planoRow?.id || null,
      status: 'ativo',
      asaas_subscription_id: assinaturaId,
    })
    .select('id, nome').single()
  if (erroSalao || !salao) return null

  // Senha sorteada e enviada por e-mail. Ninguém escolhe senha no cadastro
  // porque, no momento em que ele preenche, ainda não pagou — e senha
  // guardada de quem não virou cliente é dado sensível sem motivo.
  const senha = randomBytes(6).toString('base64url').slice(0, 10)
  const { error: erroUsuario } = await supabase.from('usuarios').insert({
    salao_id: salao.id,
    nome: compra.responsavel || compra.nome_salao,
    email,
    senha_hash: await hashPassword(senha),
    role: 'salon',
    ativo: true,
  })
  if (erroUsuario) {
    // Salão sem login não serve para nada e ainda ocupa o e-mail, impedindo
    // uma segunda tentativa. Melhor desfazer.
    await supabase.from('saloes').delete().eq('id', salao.id)
    return null
  }

  // Salão novo nasce com a estrutura do modelo — check lists, POPs,
  // organograma, catálogos e os formulários de feedback. Sem isto ele abriria
  // todas as telas em branco e o cliente pensaria que comprou uma casca.
  await semearDoModelo(salao.id, salao.nome)

  await supabase.from('compras').update({ status: 'aprovado' }).eq('payment_id', assinaturaId)

  // Aviso no painel master: mesmo com tudo automático, você quer saber que
  // entrou cliente novo sem depender de olhar a lista.
  await supabase.from('notificacoes').insert({
    titulo: 'Novo cliente assinou',
    mensagem: `${salao.nome} (${email}) assinou o plano ${compra.plano}.`,
    tipo: 'success',
    para_todos: false,
    lida: false,
  })

  try {
    await enviarEmailBoasVindas({
      email,
      nome: compra.responsavel || compra.nome_salao,
      plano: compra.plano || '',
      linkAcesso: 'https://www.nodri.com.br/login',
      senha,
    })
  } catch {
    // Falha de e-mail NÃO desfaz nada: a assinatura foi paga e o salão existe.
    // Mas sem a senha o cliente não entra, então o aviso vai para o painel
    // master com a senha — é o que permite você socorrer sem ter de resetar.
    await supabase.from('notificacoes').insert({
      titulo: 'Cliente pagou e NÃO recebeu a senha',
      mensagem: `${compra.nome_salao} assinou o plano ${compra.plano}, mas o e-mail não saiu. `
        + `Login: ${email} · Senha provisória: ${senha}. Repasse pelo WhatsApp (${compra.telefone || 'sem telefone'}).`,
      tipo: 'danger',
      para_todos: false,
      lida: false,
    })
  }

  return salao
}

/**
 * Estrutura do salão modelo. É a mesma semeadura que o admin faz ao criar um
 * salão na mão — só estrutura viaja, o preenchimento de cada salão fica onde
 * está (ver lib/modeloSalao).
 *
 * Nunca derruba a criação: salão sem estrutura ainda é um salão que pagou e
 * precisa entrar. A próxima atualização do modelo traz o que faltou.
 */
async function semearDoModelo(salaoId: string, nomeSalao: string): Promise<void> {
  try {
    const { data: mod } = await supabase
      .from('saloes').select('id').eq('is_modelo', true).maybeSingle()
    if (!mod) return

    const { data: cfg } = await supabase
      .from('salao_config').select('chave, valor, atualizado_em').eq('salao_id', (mod as any).id)
    const linhasModelo = (cfg || []) as { chave: string; valor: any; atualizado_em?: string | null }[]

    const agora = new Date().toISOString()
    const linhas = linhasModelo
      .filter(c => ehChaveDoModelo(c.chave))
      .map(c => ({ salao_id: salaoId, chave: c.chave, valor: marcarOrigem(sanitizar(c.chave, c.valor)), atualizado_em: agora }))

    if (linhas.length) {
      await supabase.from('salao_config').upsert(linhas, { onConflict: 'salao_id,chave' })
      await supabase.from('saloes')
        .update({ modelo_versao: versaoDoModelo(linhasModelo), modelo_aplicado_em: agora })
        .eq('id', salaoId)
    }

    // Formulários de feedback e demais moldes que vivem em tabelas próprias.
    await copiarMoldesDeTabelas((mod as any).id, salaoId, nomeSalao)
  } catch { /* semear é um plus, nunca um bloqueio */ }
}
