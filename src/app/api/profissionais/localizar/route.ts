import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// LOCALIZAR CADASTRO — diagnóstico de "o profissional sumiu da tela"
//
// As telas escondem cadastro por motivos legítimos (é setor, não bate com a
// busca, é CLT, é categoria administrativa). Quando alguém some, não dá para
// saber pela interface se o registro foi apagado ou se está ali, escondido por
// uma regra — e é uma diferença enorme: uma exige restaurar backup, a outra é
// destravar um campo.
//
// Esta rota olha a TABELA CRUA, sem nenhum filtro de tela, e diz em que estado
// o registro está. Só leitura, só o dono, e só dentro do próprio salão.
//
// Uso: /api/profissionais/localizar?q=vanessa
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const p = token ? await verifyJWT(token) : null
  if (!p?.salaoId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  // Diagnóstico expõe estado interno de cadastro: só o dono do salão.
  if (p.role !== 'salon' && p.role !== 'master') {
    return NextResponse.json({ error: 'Apenas o dono do salão' }, { status: 403 })
  }

  const q = (new URL(req.url).searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json({ error: 'Informe ao menos 2 letras em ?q=' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_completo, apelido, cargo, cnpj, ativo, is_departamento, vinculo, status_cadastro, criado_em')
    .eq('salao_id', p.salaoId)
    .or(`nome_completo.ilike.%${q}%,apelido.ilike.%${q}%`)
    .order('nome_completo')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const achados = (data || []).map((r: any) => {
    // Traduz o estado bruto para o motivo pelo qual a tela esconde (ou não).
    const motivos: string[] = []
    if (r.is_departamento) motivos.push('Marcado como SETOR: some da lista de profissionais e da aba CNPJ.')
    if (r.ativo === false) motivos.push('Inativo (continua aparecendo na lista, mas some de partes que só olham ativos).')
    if (String(r.vinculo || '').toUpperCase() === 'CLT') motivos.push('Vínculo CLT: sai da aba CNPJ e aparece na aba CLT.')
    if (!r.cnpj) motivos.push('Sem CNPJ preenchido: entra na aba CNPJ como "pendente de criação" e fica fora da fila de guias.')
    return { ...r, diagnostico: motivos.length ? motivos : ['Cadastro normal — deveria aparecer nas telas.'] }
  })

  // Exclusões recentes. O log guarda o ID no detalhe, não o nome: se o registro
  // foi apagado, o nome não existe mais em lugar nenhum para cruzar. Por isso
  // vem a lista das últimas exclusões, para conferir data e autor.
  let exclusoes: any[] = []
  try {
    const { data: log } = await supabaseAdmin
      .from('audit_log')
      .select('usuario, acao, entidade, detalhe, criado_em')
      .eq('salao_id', p.salaoId)
      .eq('entidade', 'Profissional')
      .order('criado_em', { ascending: false })
      .limit(20)
    exclusoes = log || []
  } catch { /* audit_log pode não existir ainda */ }

  return NextResponse.json({
    procurado: q,
    encontrados: achados.length,
    achados,
    ultimas_acoes_em_profissionais: exclusoes,
    dica: achados.length === 0
      ? 'Nenhum registro com esse nome na tabela. Ou o nome está grafado diferente, ou o cadastro foi excluído — confira as ações abaixo.'
      : 'O cadastro EXISTE no banco. Veja o campo diagnostico de cada um para saber por que a tela esconde.',
  })
}
