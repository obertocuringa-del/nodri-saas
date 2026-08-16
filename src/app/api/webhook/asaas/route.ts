import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { nomesDeBancoDoPlano } from '@/lib/planosModulos'
import { hashPassword } from '@/lib/auth'
import { enviarEmailBoasVindas } from '@/lib/email'
import { randomBytes } from 'crypto'
import { ehChaveDoModelo, sanitizar, versaoDoModelo } from '@/lib/modeloSalao'
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
      // A data de vencimento vem do Asaas, não é calculada aqui: ele é quem
      // sabe quando vai cobrar de novo, inclusive quando houve atraso ou
      // proporcional na troca de plano.
      const proxima = pagamento?.dueDate || null

      await supabase.from('saloes').update({
        status: 'ativo',
        asaas_status: 'ACTIVE',
        asaas_proxima_cobranca: proxima,
        // Mantém o campo antigo em dia: o resto do sistema (crons de aviso,
        // tela de licença) ainda lê daqui.
        licenca_vencimento: proxima,
      }).eq('id', salao.id)

      await ligarModulosDoPlano(salao.id)
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
      titulo: '⚠️ Cliente pagou e NÃO recebeu a senha',
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
      .map(c => ({ salao_id: salaoId, chave: c.chave, valor: sanitizar(c.chave, c.valor), atualizado_em: agora }))

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
