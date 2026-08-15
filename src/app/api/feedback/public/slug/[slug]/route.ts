import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// SEM ISTO O FORMULARIO SERVE UMA FOTO CONGELADA.
//
// Esta rota nao le cookie nem nada da requisicao, entao o Next.js a trata
// como estatica e guarda a primeira resposta para sempre. O efeito foi
// exatamente o que parecia um bug de gravacao: o salao configurava a regra do
// convite, o banco gravava certo, a tela do salao mostrava tudo salvo - e o
// formulario publico continuava respondendo com a versao de antes, sem
// criterio nenhum e sem link do Google.
//
// A rota do salao (/api/feedback/formularios/[id]) nunca teve o problema
// porque le a sessao pelo cookie, e isso ja a torna dinamica. Era so essa a
// diferenca entre as duas.
//
// Vale para qualquer edicao do formulario, nao so para o convite: pergunta
// nova, texto corrigido ou opcao removida tambem so apareceriam no proximo
// deploy.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_: NextRequest, { params }: { params: { slug: string } }) {
  const { data: form, error } = await supabaseAdmin
    .from('feedback_formularios')
    .select('id, token, titulo, descricao, cor_primaria, ativo, salao_id, saloes(nome)')
    .eq('slug', params.slug)
    .single()

  if (error || !form) return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 })
  if (!form.ativo) return NextResponse.json({ error: 'Este formulário não está mais ativo' }, { status: 410 })

  // `criterio` é coluna nova (sql/feedback_google.sql). Se o banco ainda não
  // tiver recebido o ALTER TABLE, o PostgREST recusa o select inteiro — e o
  // formulário público, que é o link que circula com os clientes, deixaria de
  // abrir. Por isso a leitura recua para o formato antigo em vez de quebrar:
  // sem a coluna o convite do Google simplesmente não aparece, e a avaliação
  // segue funcionando como sempre funcionou.
  let perguntas: any[] | null = null
  const comCriterio = await supabaseAdmin
    .from('feedback_perguntas')
    .select('id, titulo, tipo, opcoes, obrigatoria, ordem, criterio')
    .eq('formulario_id', form.id)
    .order('ordem')

  // Guarda o motivo da queda. O recuo protege o cliente, mas esconder por que
  // ele aconteceu transforma "o convite não aparece" num mistério: a tela do
  // salão mostra tudo configurado e o formulário age como se não houvesse
  // nada. Sem este campo não dá para saber se falta a coluna, se falta
  // permissão, ou se o critério realmente não foi salvo.
  let criterioIndisponivel: string | null = null
  if (comCriterio.error) {
    criterioIndisponivel = comCriterio.error.message || 'erro desconhecido'
    const semCriterio = await supabaseAdmin
      .from('feedback_perguntas')
      .select('id, titulo, tipo, opcoes, obrigatoria, ordem')
      .eq('formulario_id', form.id)
      .order('ordem')
    perguntas = semCriterio.data
  } else {
    perguntas = comCriterio.data
  }

  const salao = form.saloes as unknown as { nome: string } | null

  // Convite do Google do salão dono do formulário. Vai junto para a página
  // não precisar de uma segunda chamada no meio do clique do cliente.
  const { data: cfgGoogle } = await supabaseAdmin
    .from('salao_config')
    .select('valor')
    .eq('salao_id', form.salao_id)
    .eq('chave', 'feedback_google')
    .maybeSingle()
  const g = (cfgGoogle as any)?.valor

  return NextResponse.json({
    id: form.id,
    token: form.token,
    titulo: form.titulo,
    descricao: form.descricao,
    cor_primaria: form.cor_primaria,
    salao_nome: salao?.nome || '',
    perguntas: perguntas || [],
    google_link: typeof g?.link === 'string' ? g.link : '',
    google_mensagem: typeof g?.mensagem === 'string' ? g.mensagem : '',
    // Diagnostico: por que o criterio nao veio, e se o salao chegou a gravar
    // o convite. Nao expoe nada do cliente nem do salao alem disso.
    criterio_indisponivel: criterioIndisponivel,
    google_configurado: !!g,
  })
}
