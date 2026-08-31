import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { iaGerar } from '@/lib/iaClient'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// ── Mensagem de aniversário do profissional ──────────────────────────────────
//
// Monta a frase que vai na arte do post. A IA lê o cadastro para saber QUEM é
// a pessoa — o que ela faz, há quanto tempo está na casa, no que é boa — e
// escreve um elogio curto com a cara dela, em vez do "feliz aniversário" que
// serve para qualquer um.
//
// O que NUNCA entra: número. Nada de meta batida, nota de avaliação, ranking
// ou comissão. Isto vai para o Instagram, à vista de cliente, de concorrente e
// da equipe inteira — e desempenho de profissional é assunto de dentro do
// salão. A IA recebe os números? Não recebe: eles nem saem do banco aqui.

function tempoDeCasa(dataAdmissao?: string | null): string {
  if (!dataAdmissao) return ''
  const inicio = new Date(String(dataAdmissao).slice(0, 10))
  if (isNaN(inicio.getTime())) return ''
  const meses = Math.floor((Date.now() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  if (meses < 11) return meses <= 1 ? 'chegou há pouco' : `está há ${meses} meses na casa`
  const anos = Math.floor(meses / 12)
  return anos === 1 ? 'está há 1 ano na casa' : `está há ${anos} anos na casa`
}

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { profissional_id } = await req.json().catch(() => ({}))
  if (!profissional_id) return NextResponse.json({ error: 'Informe o profissional' }, { status: 400 })

  const { data: prof } = await supabaseAdmin
    .from('profissionais')
    .select('*')
    .eq('id', profissional_id)
    .eq('salao_id', payload.salaoId)
    .single()

  if (!prof) return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })

  const primeiro = String(prof.apelido || prof.nome_completo || '').trim().split(/\s+/)[0]

  // Só o que descreve a pessoa. Repare que nenhum campo de valor, meta ou nota
  // é lido — não é filtro no prompt, é ausência no dado que sai do banco.
  const retrato = [
    `Nome pelo qual é chamada: ${primeiro}`,
    prof.cargo ? `Função: ${prof.cargo}` : '',
    tempoDeCasa(prof.data_admissao) ? `Tempo de casa: ${tempoDeCasa(prof.data_admissao)}` : '',
    Array.isArray(prof.servicos_habilitados) && prof.servicos_habilitados.length
      ? `Serviços que domina: ${prof.servicos_habilitados.slice(0, 8).join(', ')}`
      : '',
  ].filter(Boolean).join('\n')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Sem chave o botão continua funcionando: entrega um texto decente e a
    // pessoa edita. Melhor que travar a tela inteira por causa da IA.
    return NextResponse.json({
      mensagem: `Que a felicidade acompanhe cada passo seu e que seu sucesso seja cada vez maior. Feliz aniversário, ${primeiro}!`,
      gerado_por_ia: false,
    })
  }

  const prompt = `Escreva a mensagem de aniversário que vai numa arte de Instagram de um salão de beleza, homenageando alguém da própria equipe.

QUEM É A PESSOA
${retrato}

REGRAS
- Duas frases, no máximo 30 palavras no total.
- Fale COM ela (você), não sobre ela.
- Puxe algo do que ela faz ou de quanto tempo está na casa, para a mensagem não servir para qualquer pessoa.
- Se o cadastro não disser quase nada sobre ela, NÃO invente qualidade que você não sabe se existe: escreva uma frase bonita sobre a data e sobre o ano que começa para ela. Bonita de verdade, com imagem e ritmo — não o "muitos anos de vida e muitas felicidades" de cartão de banca.
- Sem emoji, sem hashtag, sem aspas, sem o nome do salão.
- Não cite número, meta, nota, ranking, comissão ou faturamento.
- Português do Brasil, tom caloroso e profissional, nada meloso.
- Responda APENAS com a mensagem, sem introdução.`

  try {
    const texto = await iaGerar(apiKey, 'claude-haiku-4-5-20251001', prompt, { maxTokens: 300 })
    const limpo = String(texto || '').trim().replace(/^["']|["']$/g, '')
    if (!limpo) throw new Error('vazio')
    return NextResponse.json({ mensagem: limpo, gerado_por_ia: true })
  } catch {
    return NextResponse.json({
      mensagem: `Que a felicidade acompanhe cada passo seu e que seu sucesso seja cada vez maior. Feliz aniversário, ${primeiro}!`,
      gerado_por_ia: false,
    })
  }
}
