import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

function getISOWeekRange() {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  return { start, end }
}

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function addDays(d: Date, days: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

export async function GET() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const salaoId = payload.salaoId
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { monday, sunday } = getISOWeekRange()
  const { start: mesInicio, end: mesFim } = getMonthRange()

  // 1. Busca profissionais cadastrados
  const { data: profissionais } = await supabaseAdmin
    .from('feedback_prof_profissionais')
    .select('id, nome, ativo')
    .eq('salao_id', salaoId)
    .order('nome')

  if (!profissionais || profissionais.length === 0)
    return NextResponse.json({ profissionais: [], periodo_semana: '', periodo_mes: '' })

  // 2. Busca bloqueios persistidos (ativos e expirados)
  const { data: bloqueiosSalvos } = await supabaseAdmin
    .from('feedback_prof_bloqueios')
    .select('*')
    .eq('salao_id', salaoId)

  const bloqueioMap: Record<string, { bloqueado_ate: string; dias_bloqueio: number; motivo: string; datas_atrasos: string[]; datas_faltas: string[] }> = {}
  for (const b of bloqueiosSalvos || []) {
    bloqueioMap[b.profissional_nome] = b
  }

  // 3. Busca TODAS as respostas negativas do mês atual (inclui semana)
  const { data: respostas } = await supabaseAdmin
    .from('feedback_prof_respostas')
    .select('profissional_nome, ocorrido_descricao, criado_em')
    .eq('salao_id', salaoId)
    .eq('tipo', 'negativo')
    .gte('criado_em', mesInicio.toISOString())
    .lte('criado_em', mesFim.toISOString())

  // 4. Conta atrasos da semana, faltas do mês e outras ocorrências do mês
  const contagem: Record<string, { atrasos: string[]; faltas: string[]; outras: Record<string, string[]> }> = {}
  for (const prof of profissionais) {
    contagem[prof.nome] = { atrasos: [], faltas: [], outras: {} }
  }
  for (const r of respostas || []) {
    if (!contagem[r.profissional_nome]) continue
    const data = new Date(r.criado_em)
    const desc = (r.ocorrido_descricao || '').toUpperCase()
    if (desc === 'ATRASO' && data >= monday && data <= sunday) {
      contagem[r.profissional_nome].atrasos.push(formatDate(data))
    } else if (desc === 'FALTA') {
      contagem[r.profissional_nome].faltas.push(formatDate(data))
    } else if (desc) {
      if (!contagem[r.profissional_nome].outras[r.ocorrido_descricao]) {
        contagem[r.profissional_nome].outras[r.ocorrido_descricao] = []
      }
      contagem[r.profissional_nome].outras[r.ocorrido_descricao].push(formatDate(data))
    }
  }

  // 5. Para cada profissional: detecta novos bloqueios e persiste se necessário
  const upserts: object[] = []

  for (const prof of profissionais) {
    const c = contagem[prof.nome]
    const novoBloqueioDias = c.faltas.length >= 2 ? 15 : c.atrasos.length >= 3 ? 7 : 0

    if (novoBloqueioDias > 0) {
      const existente = bloqueioMap[prof.nome]
      const novaDataFim = toDateStr(addDays(today, novoBloqueioDias))

      // só atualiza se o novo bloqueio for maior ou não existir ainda
      const deveAtualizar = !existente ||
        new Date(existente.bloqueado_ate) < today || // expirado
        novoBloqueioDias > existente.dias_bloqueio   // bloqueio maior

      if (deveAtualizar) {
        let motivo = ''
        if (c.atrasos.length >= 3) motivo += `${c.atrasos.length} atrasos na semana (${c.atrasos.join(', ')})`
        if (c.faltas.length >= 2) {
          if (motivo) motivo += ' | '
          motivo += `${c.faltas.length} faltas no mês (${c.faltas.join(', ')})`
        }

        upserts.push({
          salao_id: salaoId,
          profissional_nome: prof.nome,
          bloqueado_ate: novaDataFim,
          dias_bloqueio: novoBloqueioDias,
          motivo,
          datas_atrasos: c.atrasos,
          datas_faltas: c.faltas,
          updated_at: new Date().toISOString(),
        })

        // atualiza mapa local para retorno correto
        bloqueioMap[prof.nome] = {
          bloqueado_ate: novaDataFim,
          dias_bloqueio: novoBloqueioDias,
          motivo,
          datas_atrasos: c.atrasos,
          datas_faltas: c.faltas,
        }
      }
    }
  }

  // Persiste novos/atualizados bloqueios
  if (upserts.length > 0) {
    await supabaseAdmin
      .from('feedback_prof_bloqueios')
      .upsert(upserts, { onConflict: 'salao_id,profissional_nome' })
  }

  // 6. Monta resultado final
  const todayStr = toDateStr(today)
  const resultado = profissionais.map(prof => {
    const c = contagem[prof.nome]
    const b = bloqueioMap[prof.nome]
    const bloqueadoAtivo = b && b.bloqueado_ate >= todayStr

    // Dias restantes
    let dias_restantes = 0
    if (bloqueadoAtivo) {
      const fim = new Date(b.bloqueado_ate)
      dias_restantes = Math.ceil((fim.getTime() - today.getTime()) / 86400000)
    }

    const outras_ocorrencias = Object.entries(c.outras).map(([descricao, datas]) => ({ descricao, quantidade: datas.length, datas }))

    return {
      nome: prof.nome,
      ativo: prof.ativo,
      atrasos_semana: c.atrasos.length,
      faltas_mes: c.faltas.length,
      datas_atrasos: bloqueadoAtivo ? b.datas_atrasos : c.atrasos,
      datas_faltas: bloqueadoAtivo ? b.datas_faltas : c.faltas,
      outras_ocorrencias,
      bloqueado: !!bloqueadoAtivo,
      dias_bloqueio: bloqueadoAtivo ? b.dias_bloqueio : 0,
      dias_restantes,
      bloqueado_ate: bloqueadoAtivo ? b.bloqueado_ate : null,
      motivo: bloqueadoAtivo ? b.motivo : '',
    }
  })

  const periodoSemana = `${formatDate(monday)} a ${formatDate(sunday)}`
  const periodoMes = `${formatDate(mesInicio)} a ${formatDate(mesFim)}`

  return NextResponse.json({ profissionais: resultado, periodo_semana: periodoSemana, periodo_mes: periodoMes })
}

export async function DELETE(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { profissional_nome } = await req.json()
  await supabaseAdmin
    .from('feedback_prof_bloqueios')
    .delete()
    .eq('salao_id', payload.salaoId)
    .eq('profissional_nome', profissional_nome)

  return NextResponse.json({ ok: true })
}
