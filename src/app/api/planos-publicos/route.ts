import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { PLANOS_NODRI, moduloPorChave } from '@/lib/planosModulos'

// Rota pública: não lê cookie, então sem isto o Next serviria a primeira
// resposta para sempre e o preço mudado no admin nunca chegaria ao visitante.
// Foi exatamente o que aconteceu com o formulário de avaliação.
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ── Planos da landing ───────────────────────────────────────────────────────
//
// A landing tinha os três planos antigos escritos à mão dentro do arquivo
// (Básico 100, Profissional 200, Premium 300). Eles não existiam mais em lugar
// nenhum do sistema: quem chegasse pelo Google via preço que não dava para
// comprar.
//
// Agora o PREÇO e o NOME vêm da tabela `planos` — o que você edita no admin é
// o que o visitante vê. Já a LISTA DE MÓDULOS vem de `planosModulos.ts`, a
// mesma fonte que o gate usa para liberar tela. Assim a landing não tem como
// prometer um módulo que o plano não entrega: é literalmente a mesma lista.
export async function GET() {
  const { data } = await supabaseAdmin
    .from('planos')
    .select('nome, slug, preco, descricao')
    .eq('ativo', true)
    .order('preco')

  const doBanco = (data || []) as { nome: string; slug: string; preco: number; descricao?: string }[]

  const planos = PLANOS_NODRI.map((p, i) => {
    const row = doBanco.find(d => d.slug === p.slug)
    return {
      nome: row?.nome || p.nome,
      slug: p.slug,
      // Sem linha no banco, o preço do código serve de rede — melhor um preço
      // certo do que um card vazio na vitrine.
      preco: typeof row?.preco === 'number' ? row.preco : p.preco,
      resumo: row?.descricao || p.resumo,
      // Só o que ESTE plano acrescenta ao anterior. Repetir a lista inteira em
      // todo card faz os quatro parecerem iguais e some com a diferença.
      novidades: p.modulos
        .filter(c => i === 0 || !PLANOS_NODRI[i - 1].modulos.includes(c))
        .map(c => moduloPorChave(c)?.rotulo)
        .filter(Boolean) as string[],
      herda: i > 0 ? PLANOS_NODRI[i - 1].nome : null,
      destaque: p.slug === 'gestao',
    }
  })

  return NextResponse.json(planos)
}
