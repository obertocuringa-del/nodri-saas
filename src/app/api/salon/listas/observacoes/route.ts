import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

// Observações das listas (Realinhamento/Corte/Mechas/Pigmentação) → viram
// registros no Feedback do Profissional (feedback_prof_respostas), com
// tipo positivo/negativo e a descrição do ocorrido.
export async function POST(req: NextRequest) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || !payload.salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const salaoId = payload.salaoId

  const { lista_label, observacoes } = await req.json()
  if (!Array.isArray(observacoes) || observacoes.length === 0) {
    return NextResponse.json({ error: 'Sem observações para enviar' }, { status: 400 })
  }

  // vincula ao 1º formulário de feedback do salão, se existir (a exibição no
  // perfil do profissional busca por salao_id + nome, então null também serve)
  const { data: form } = await supabaseAdmin
    .from('feedback_prof_formularios')
    .select('id')
    .eq('salao_id', salaoId)
    .limit(1)
    .maybeSingle()

  // profissional_id da resposta referencia feedback_prof_profissionais (NÃO a
  // tabela profissionais das listas) — casa pelo nome; sem par, vai null
  const { data: profsFb } = await supabaseAdmin
    .from('feedback_prof_profissionais')
    .select('id, nome')
    .eq('salao_id', salaoId)
  const idPorNome = new Map((profsFb || []).map((p: any) => [String(p.nome).trim().toUpperCase(), p.id]))

  const rows = observacoes
    .filter((o: any) => o && String(o.profissional_nome || '').trim() && String(o.descricao || '').trim())
    .map((o: any) => {
      const nome = String(o.profissional_nome).trim().toUpperCase()
      return {
        formulario_id: form?.id || null,
        salao_id: salaoId,
        profissional_id: idPorNome.get(nome) || null,
        profissional_nome: nome,
        // 'acompanhamento' é o terceiro tipo: registro de que a gestão
        // conversou com a pessoa. Não é elogio nem ocorrência — não pesa em
        // nenhum dos dois lados na hora de avaliar.
        tipo: o.tipo === 'positivo' ? 'positivo' : o.tipo === 'acompanhamento' ? 'acompanhamento' : 'negativo',
        ocorrido_descricao: `LISTA DE ${String(lista_label || '').trim().toUpperCase()}`.trim(),
        descricao: String(o.descricao).trim(),
      }
    })

  if (rows.length === 0) return NextResponse.json({ error: 'Preencha profissional e descrição' }, { status: 400 })

  // devolve os ids criados (na mesma ordem) para permitir editar/excluir depois
  const { data: inseridas, error } = await supabaseAdmin.from('feedback_prof_respostas').insert(rows).select('id')
  if (error) {
    // banco pode exigir vínculo com formulário — orienta em vez de erro técnico
    if (!form && /formulario/i.test(error.message)) {
      return NextResponse.json({ error: 'Crie um formulário em Feedback Profissional primeiro (aba Feedback Profissional > Novo formulário).' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, enviadas: rows.length, ids: (inseridas || []).map((r: any) => r.id) })
}
