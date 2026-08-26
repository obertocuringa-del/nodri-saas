import { supabaseAdmin } from '@/lib/supabase'
import { chavesDoPlano, chaveDoModulo } from '@/lib/planosModulos'
import { atualizarAssinatura } from '@/lib/asaas'

// ── Troca de plano ──────────────────────────────────────────────────────────
//
// Uma troca de plano toca em TRÊS lugares, e é fácil mexer em um e esquecer os
// outros — o que já acontecia: a tela de editar salão mudava `plano_id` e não
// falava com o Asaas (o cliente subia de plano e seguia pagando o valor
// antigo), e a aba Assinatura mudava o valor no Asaas mas não ligava os
// módulos (o cliente pagava mais e não recebia acesso).
//
// Por isso todo caminho de troca — cliente, painel master, aba Assinatura —
// passa por aqui.
//
// Quando o acesso muda, por decisão de negócio:
//
// SUBIU de plano  → libera na hora. O cliente aproveita o resto do mês sem
//                   pagar diferença; o valor novo entra na próxima fatura.
// DESCEU de plano → o acesso continua o do plano maior até o fim do mês que
//                   ele já pagou. Não é preciso agendar nada: o webhook liga
//                   os módulos do plano vigente quando o próximo pagamento
//                   confirma, e a essa altura `plano_id` já é o novo.

export interface ResultadoTroca {
  ok: boolean
  erro?: string
  planoNome?: string
  valor?: number
  /** 'subiu' | 'desceu' | 'igual' — decide se o acesso muda agora. */
  direcao?: 'subiu' | 'desceu' | 'igual'
  /** Já vale para o cliente ver, ou só na virada do mês. */
  acessoLiberadoAgora?: boolean
  mensagem?: string
}

/**
 * Liga os módulos do plano que o salão tem AGORA no banco.
 *
 * O casamento e por CHAVE do modulo, nao por nome exato. Antes era
 * `.in('nome', [...])`, e o modulo estava cadastrado como
 * `'CALCULADORA / FINANCEIRA '` — com um espaço no fim. O nome nunca batia,
 * entao quem assinava Essencial ou mais pagava pela Calculadora e nao recebia,
 * sem erro nenhum aparecer. `chaveDoModulo()` normaliza (corta espaço, tira
 * acento) e ainda reconhece os nomes antigos do cadastro.
 */
export async function ligarModulosDoPlano(salaoId: string): Promise<void> {
  const { data: salao } = await supabaseAdmin
    .from('saloes').select('plano_id, planos(nome)').eq('id', salaoId).maybeSingle()

  const plano = (salao as any)?.planos
  const nomePlano = Array.isArray(plano) ? plano[0]?.nome : plano?.nome
  if (!nomePlano) return

  const chaves = chavesDoPlano(nomePlano)
  if (!chaves.length) return

  const { data: todos } = await supabaseAdmin.from('modulos').select('id, nome')
  const doPlano = (todos || []).filter((m: any) => {
    const c = chaveDoModulo(m.nome)
    return c !== null && chaves.includes(c)
  })
  if (!doPlano.length) return

  await supabaseAdmin.from('salao_modulos').delete().eq('salao_id', salaoId)
  await supabaseAdmin.from('salao_modulos').insert(
    doPlano.map((m: any) => ({ salao_id: salaoId, modulo_id: m.id, ativo: true })),
  )
}

/**
 * Troca o plano de um salão: valor no Asaas, plano no banco e, quando é
 * subida, o acesso na hora.
 *
 * O preço vem SEMPRE da tabela `planos`. Quem chama manda só o identificador
 * do plano — nunca o valor —, porque um dos caminhos é a tela do próprio
 * cliente e aceitar valor de fora deixaria qualquer um assinar o Completo
 * por um real.
 */
export async function trocarPlanoDoSalao(
  salaoId: string,
  planoSlugOuId: string,
): Promise<ResultadoTroca> {
  const { data: salao } = await supabaseAdmin
    .from('saloes')
    .select('id, nome, plano_id, asaas_subscription_id, planos(nome, preco)')
    .eq('id', salaoId).maybeSingle()

  if (!salao) return { ok: false, erro: 'Salão não encontrado' }

  const { data: planos } = await supabaseAdmin
    .from('planos').select('id, nome, slug, preco').eq('ativo', true)

  const novo = (planos || []).find(
    (p: any) => p.slug === planoSlugOuId || p.id === planoSlugOuId,
  )
  if (!novo || typeof novo.preco !== 'number') return { ok: false, erro: 'Plano inválido' }

  if (novo.id === salao.plano_id) {
    return { ok: false, erro: 'Este já é o plano atual.' }
  }

  const atual = (salao as any).planos
  const precoAtual = Array.isArray(atual) ? atual[0]?.preco : atual?.preco
  const direcao: 'subiu' | 'desceu' | 'igual' =
    typeof precoAtual !== 'number' || novo.preco === precoAtual ? 'igual'
      : novo.preco > precoAtual ? 'subiu' : 'desceu'

  // O Asaas só entra quando existe assinatura. Salão sem assinatura (cortesia,
  // cadastro manual, migração antiga) troca de plano no banco e pronto — não
  // há cobrança para atualizar.
  if (salao.asaas_subscription_id) {
    try {
      await atualizarAssinatura(salao.asaas_subscription_id, {
        valor: novo.preco,
        descricao: `NODRI ${novo.nome}`,
      })
    } catch (e: any) {
      // Sem mexer no banco: deixar o plano mudar aqui e não no Asaas é
      // exatamente a divergência que esta função existe para impedir.
      return { ok: false, erro: `Não foi possível atualizar a cobrança: ${String(e?.message || e).slice(0, 200)}` }
    }
  }

  const { error } = await supabaseAdmin
    .from('saloes').update({ plano_id: novo.id }).eq('id', salaoId)
  if (error) return { ok: false, erro: error.message }

  // Subida sempre aplica agora. Descida espera o fim do mês pago — mas só
  // faz sentido esperar quando existe uma fatura para chegar: em salão sem
  // assinatura no Asaas (cortesia, cadastro manual, teste) nenhum pagamento
  // vai confirmar nunca, e o acesso do plano antigo ficaria para sempre.
  const esperaAFatura = direcao === 'desceu' && !!salao.asaas_subscription_id
  const aplicaAgora = !esperaAFatura
  if (aplicaAgora) await ligarModulosDoPlano(salaoId)

  const mensagem = !salao.asaas_subscription_id
    ? `Plano alterado para ${novo.nome}. O acesso já vale agora. Este salão não tem assinatura no Asaas, então não há cobrança a atualizar.`
    : aplicaAgora
      ? `Plano alterado para ${novo.nome} (R$ ${novo.preco}/mês). O acesso novo já está liberado e o valor entra na próxima fatura — o cartão continua o mesmo.`
      : `Plano alterado para ${novo.nome} (R$ ${novo.preco}/mês). O acesso maior continua até o fim do mês já pago; na próxima fatura entram juntos o valor menor e o acesso do novo plano.`

  return {
    ok: true,
    planoNome: novo.nome,
    valor: novo.preco,
    direcao,
    acessoLiberadoAgora: aplicaAgora,
    mensagem,
  }
}
