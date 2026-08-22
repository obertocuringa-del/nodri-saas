import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

// POST — gera resumo semanal e envia por email
export async function POST(req: NextRequest) {
  try {
    // Suporte a chamada via cron (header secret) ou via usuário autenticado
    const cronSecret = req.headers.get('x-cron-secret')
    // SEC-002 — sem fallback: a senha do cron estava no código, e quem a
    // conhecesse disparava a rotina de IA de fora (custo e abuso). Se
    // CRON_SECRET não estiver configurado, nenhuma chamada passa como cron.
    const segredoCron = process.env.CRON_SECRET
    const isCron = !!segredoCron && cronSecret === segredoCron

    let salaoId: string | null = null
    let emailDestino: string | null = null

    if (isCron) {
      // Modo cron: processa todos os salões com IA ativa
      const { data: saloes } = await supabaseAdmin
        .from('ia_config_global')
        .select('salao_id, api_key, modelo')
        .eq('ativo', true)

      if (!saloes?.length) return NextResponse.json({ ok: true, processados: 0 })

      let processados = 0
      for (const salao of saloes) {
        await gerarEEnviarResumo(salao.salao_id, salao.api_key, salao.modelo)
        processados++
      }
      return NextResponse.json({ ok: true, processados })
    } else {
      // Modo manual: usuário logado
      const token = cookies().get('nodri_token')?.value
      const payload = token ? await verifyJWT(token) : null
      salaoId = payload?.salaoId || null
      if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

      const { data: config } = await supabaseAdmin.from('ia_config_global').select('api_key, modelo').eq('ativo', true).limit(1).maybeSingle()
      if (!config?.api_key) return NextResponse.json({ error: 'IA não configurada' }, { status: 422 })

      const resumo = await gerarEEnviarResumo(salaoId, config.api_key, config.modelo)
      return NextResponse.json({ ok: true, resumo })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function gerarEEnviarResumo(salaoId: string, apiKey: string, modelo: string) {
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const anoAtual = agora.getFullYear()
  const mesAtual = agora.getMonth() + 1
  const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const fmtR = (v: number) => `R$${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  const [
    { data: periodos },
    { data: metas },
    { data: profissionais },
    { data: configSalao },
    { data: feedbacksRecentes },
  ] = await Promise.all([
    supabaseAdmin.from('relatorio_periodos').select('ano, mes, resumo_mensal, prof_pagamentos, prof_ocupacao').eq('salao_id', salaoId).order('ano', { ascending: false }).order('mes', { ascending: false }).limit(2),
    supabaseAdmin.from('ia_metas_salao').select('ano, mes, meta_valor, metas_profissionais').eq('salao_id', salaoId).eq('ano', anoAtual).eq('mes', mesAtual).maybeSingle(),
    supabaseAdmin.from('profissionais').select('nome_completo, cargo, email').eq('salao_id', salaoId).eq('ativo', true),
    supabaseAdmin.from('ia_configuracao').select('email_resumo, contexto_adicional').eq('salao_id', salaoId).maybeSingle(),
    supabaseAdmin.from('feedback_prof_respostas').select('profissional_nome, tipo, ocorrido_descricao').eq('salao_id', salaoId).gte('criado_em', new Date(Date.now() - 7 * 86400000).toISOString()),
  ])

  // Monta contexto para a IA gerar o resumo
  const linhas: string[] = []
  linhas.push(`SALÃO — RESUMO DA SEMANA (${agora.toLocaleDateString('pt-BR')})`)
  linhas.push('')

  const mesAtualDados = periodos?.find(p => p.ano === anoAtual && p.mes === mesAtual)
  if (mesAtualDados?.resumo_mensal) {
    const r = mesAtualDados.resumo_mensal
    linhas.push(`FATURAMENTO ${MESES[mesAtual]}/${anoAtual} (parcial): ${fmtR(Number(r.total || 0))}`)
    linhas.push(`Atendimentos: ${r.total_atendimentos || 0} | Ticket médio: ${fmtR(Number(r.ticket_medio || 0))}`)
    linhas.push('')
  }

  if (metas?.metas_profissionais?.length) {
    linhas.push('METAS DO MÊS:')
    for (const mp of metas.metas_profissionais) {
      const meta = Number(mp.meta_redistribuida || 0)
      const real = Number(mp.realizado || 0)
      const pct = meta > 0 ? Math.round(real / meta * 100) : 0
      linhas.push(`  ${mp.nome}: ${pct}% (${fmtR(real)} de ${fmtR(meta)})`)
    }
    linhas.push('')
  }

  if (feedbacksRecentes?.length) {
    const negativos = feedbacksRecentes.filter((f: any) => f.tipo === 'negativo')
    const positivos = feedbacksRecentes.filter((f: any) => f.tipo === 'positivo')
    linhas.push(`OCORRÊNCIAS DA SEMANA: ${positivos.length} positivas, ${negativos.length} negativas`)
    linhas.push('')
  }

  const contexto = linhas.join('\n')

  const prompt = `Você é a NODRI IA. Gere um RESUMO SEMANAL executivo do salão para o gestor.

${contexto}

Formato do resumo (markdown, máximo 400 palavras):

## Resumo da Semana — ${agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}

** Destaques positivos**
[2-3 pontos]

** Pontos de atenção**
[2-3 pontos]

** Foco para a próxima semana**
[3 ações concretas com impacto estimado]

** Insight da semana**
[Uma observação que o gestor provavelmente não percebeu]

Seja direto, use números reais, sem enrolação.`

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelo || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`
  const geminiRes = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.4 }
    })
  })

  const geminiData = await geminiRes.json()
  const resumoTexto = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Salva o resumo no banco
  await supabaseAdmin.from('ia_resumos_semanais').upsert({
    salao_id: salaoId,
    semana: agora.toISOString().slice(0, 10),
    resumo: resumoTexto,
    criado_em: agora.toISOString(),
  }, { onConflict: 'salao_id,semana' })

  // Envia por email se configurado (via Resend ou similar — precisa de RESEND_API_KEY)
  const emailDestino = configSalao?.email_resumo
  if (emailDestino && process.env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'NODRI IA <noreply@nodri.com.br>',
        to: emailDestino,
        subject: `Resumo Semanal NODRI — ${agora.toLocaleDateString('pt-BR')}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#b45309">NODRI IA — Resumo Semanal</h2>
          <div style="white-space:pre-wrap;line-height:1.7;color:#e8e6e0">${resumoTexto.replace(/\n/g, '<br>')}</div>
          <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
          <p style="color:#999;font-size:12px">Gerado automaticamente pela NODRI IA • nodri.com.br</p>
        </div>`
      })
    })
  }

  return resumoTexto
}

// GET — busca último resumo salvo
export async function GET(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data } = await supabaseAdmin
      .from('ia_resumos_semanais')
      .select('semana, resumo, criado_em')
      .eq('salao_id', salaoId)
      .order('criado_em', { ascending: false })
      .limit(4)

    return NextResponse.json({ resumos: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
