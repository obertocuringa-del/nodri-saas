import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET — retorna análise salva (se existir)
export async function GET(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const profissionalId = searchParams.get('profissional_id')
    if (!profissionalId) return NextResponse.json({ error: 'profissional_id obrigatório' }, { status: 400 })

    const { data } = await supabaseAdmin
      .from('ia_analise_profissional')
      .select('analise, atualizado_em')
      .eq('salao_id', salaoId)
      .eq('profissional_id', profissionalId)
      .maybeSingle()

    return NextResponse.json({ analise: data?.analise || null, atualizado_em: data?.atualizado_em || null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — apaga análise salva (para forçar regeneração)
export async function DELETE(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const profissionalId = searchParams.get('profissional_id')
    if (!profissionalId) return NextResponse.json({ error: 'profissional_id obrigatório' }, { status: 400 })

    await supabaseAdmin
      .from('ia_analise_profissional')
      .delete()
      .eq('salao_id', salaoId)
      .eq('profissional_id', profissionalId)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — gera e salva análise completa do profissional (streaming)
export async function POST(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { profissional_id } = await req.json()
    if (!profissional_id) return NextResponse.json({ error: 'profissional_id obrigatório' }, { status: 400 })

    // Busca config da IA
    const { data: configGlobal } = await supabaseAdmin
      .from('ia_config_global')
      .select('api_key, modelo, instrucoes_base, ativo')
      .limit(1)
      .maybeSingle()

    if (!configGlobal?.api_key || !configGlobal.ativo) {
      return NextResponse.json({ error: 'IA não configurada' }, { status: 422 })
    }

    const modelo = configGlobal.modelo || 'gemini-2.5-flash'
    const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const fmtR = (v: number) => `R$${(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    const anoInicio = new Date().getFullYear() - 2

    // Busca todos os dados do profissional
    const [
      { data: prof },
      { data: periodos },
      { data: ocorrencias },
      { data: pendencias },
      { data: configSalao },
    ] = await Promise.all([
      supabaseAdmin.from('profissionais').select('*').eq('id', profissional_id).maybeSingle(),
      supabaseAdmin.from('relatorio_periodos').select('ano, mes, prof_pagamentos, prof_servicos, prof_ticket, prof_preferencia, prof_ocupacao').eq('salao_id', salaoId).gte('ano', anoInicio).order('ano').order('mes'),
      supabaseAdmin.from('feedback_prof_respostas').select('profissional_nome, tipo, ocorrido_descricao, descricao, criado_em').eq('salao_id', salaoId).order('criado_em', { ascending: false }).limit(200),
      supabaseAdmin.from('pendencias_profissionais').select('mensagem, data_limite, resolvido').eq('salao_id', salaoId).eq('profissional_id', profissional_id),
      supabaseAdmin.from('ia_configuracao').select('contexto_adicional').eq('salao_id', salaoId).maybeSingle(),
    ])

    if (!prof) return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })

    const nomeProf = prof.nome_completo
    const apelido = prof.apelido || nomeProf.split(' ')[0]

    // Monta dados financeiros do profissional
    const linhas: string[] = []
    linhas.push(`PROFISSIONAL: ${nomeProf} (${prof.cargo})`)
    linhas.push(`Apelido: ${apelido}`)
    linhas.push(`CNPJ: ${prof.cnpj || 'não cadastrado'}`)
    linhas.push(`Status: ${prof.ativo ? 'Ativo' : 'Inativo'}`)
    linhas.push('')

    // Faturamento mensal
    linhas.push('## HISTÓRICO FINANCEIRO')
    for (const per of (periodos || [])) {
      const chave = `${MESES[per.mes-1]}/${String(per.ano).slice(2)}`
      const fat = (per.prof_pagamentos || []).find((p: any) => {
        const n = (p.profissional || '').toLowerCase()
        return n.includes(apelido.toLowerCase()) || apelido.toLowerCase().includes(n.split(' ')[0])
      })
      const serv = (per.prof_servicos || []).find((p: any) => {
        const n = (p.profissional || '').toLowerCase()
        return n.includes(apelido.toLowerCase()) || apelido.toLowerCase().includes(n.split(' ')[0])
      })
      const tick = (per.prof_ticket || []).find((p: any) => {
        const n = (p.profissional || '').toLowerCase()
        return n.includes(apelido.toLowerCase()) || apelido.toLowerCase().includes(n.split(' ')[0])
      })
      const ocup = (per.prof_ocupacao || []).find((p: any) => {
        const n = (p.profissional || '').toLowerCase()
        return n.includes(apelido.toLowerCase()) || apelido.toLowerCase().includes(n.split(' ')[0])
      })
      if (fat || serv) {
        const fatVal = fat ? (Number(fat.valor_a_pagar||0) + Number(fat.desconto||0)) : 0
        const servVal = serv ? Number(serv.quantidade||0) : 0
        const tickVal = tick ? Number(tick.ticket_medio||0) : 0
        const ocupVal = ocup ? Number(ocup.ocupacao||0) : null
        linhas.push(`  ${chave}: Faturamento ${fmtR(fatVal)}, ${servVal} serviços, Ticket ${fmtR(tickVal)}${ocupVal !== null ? `, Ocupação ${ocupVal}%` : ''}`)
      }
    }
    linhas.push('')

    // Ocorrências do profissional
    const ocorrProf = (ocorrencias || []).filter((f: any) => {
      const n = (f.profissional_nome || '').toLowerCase()
      return n.includes(apelido.toLowerCase()) || apelido.toLowerCase().includes(n.split(' ')[0])
    })
    if (ocorrProf.length > 0) {
      linhas.push('## OCORRÊNCIAS')
      const contagem: Record<string, number> = {}
      ocorrProf.forEach((f: any) => {
        contagem[f.ocorrido_descricao || f.tipo] = (contagem[f.ocorrido_descricao || f.tipo] || 0) + 1
      })
      Object.entries(contagem).sort((a,b) => b[1]-a[1]).forEach(([tipo, qtd]) => {
        linhas.push(`  ${tipo}: ${qtd}x`)
      })
      ocorrProf.slice(0, 10).forEach((f: any) => {
        const data = f.criado_em ? new Date(f.criado_em).toLocaleDateString('pt-BR') : ''
        linhas.push(`  [${f.tipo === 'negativo' ? '🚨' : '✅'}] ${data} — ${f.ocorrido_descricao || ''}${f.descricao ? ': ' + f.descricao : ''}`)
      })
      linhas.push('')
    }

    // Pendências
    const pendAbertas = (pendencias || []).filter((p: any) => !p.resolvido)
    if (pendAbertas.length > 0) {
      linhas.push('## PENDÊNCIAS EM ABERTO')
      pendAbertas.forEach((p: any) => {
        linhas.push(`  - ${p.mensagem}${p.data_limite ? ` [Vence: ${p.data_limite}]` : ''}`)
      })
      linhas.push('')
    }

    const dadosFormatados = linhas.join('\n')
    const contexto = configSalao?.contexto_adicional || ''
    const instrucoes = configGlobal.instrucoes_base || ''

    const promptAnalise = `Você é a NODRI IA — consultora premium especializada em salões de beleza.

${instrucoes ? `INSTRUÇÕES DO PROPRIETÁRIO:\n${instrucoes}\n` : ''}
${contexto ? `CONTEXTO DO SALÃO:\n${contexto}\n` : ''}

Com base nos dados abaixo, gere um DIAGNÓSTICO COMPLETO e DEFINITIVO deste profissional.

Este diagnóstico será armazenado como seu CONHECIMENTO BASE sobre ${nomeProf}. Toda vez que alguém perguntar algo sobre ela, você já saberá a resposta sem precisar recalcular.

Seja extremamente analítico. Use todos os dados disponíveis. Calcule tendências, médias, variações. Identifique padrões de comportamento, sazonalidade, riscos e oportunidades.

${dadosFormatados}

Gere o diagnóstico no seguinte formato:

📊 SITUAÇÃO ATUAL
[faturamento atual, ticket médio, ocupação, tendência]

📈 HISTÓRICO E TENDÊNCIA
[evolução mês a mês, picos, quedas, sazonalidade]

🚨 GARGALOS
[problemas identificados com impacto financeiro]

💰 OPORTUNIDADES
[onde está o dinheiro não aproveitado]

👥 PERFIL COMPORTAMENTAL
[pontualidade, disciplina, ocorrências, padrões]

📋 PENDÊNCIAS
[o que está em aberto]

🎯 METAS REALISTAS
[metas para próximos 30/60/90 dias baseadas no histórico]

🤖 INSIGHT EXCLUSIVO
[algo que normalmente passaria despercebido]`

    // Gerar análise com streaming
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:streamGenerateContent?alt=sse&key=${configGlobal.api_key}`
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptAnalise }] }],
        generationConfig: { maxOutputTokens: 3000, temperature: 0.5 }
      })
    })

    if (!geminiRes.ok || !geminiRes.body) {
      return NextResponse.json({ error: 'Erro ao gerar análise' }, { status: 500 })
    }

    const encoder = new TextEncoder()
    let analiseCompleta = ''

    const readable = new ReadableStream({
      async start(controller) {
        const reader = geminiRes.body!.getReader()
        const dec = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += dec.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            const json = line.slice(5).trim()
            if (!json || json === '[DONE]') continue
            try {
              const parsed = JSON.parse(json)
              const token = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
              if (token) {
                analiseCompleta += token
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
              }
            } catch {}
          }
        }

        // Salva análise no banco
        await supabaseAdmin
          .from('ia_analise_profissional')
          .upsert({
            salao_id: salaoId,
            profissional_id,
            analise: analiseCompleta,
            atualizado_em: new Date().toISOString(),
          }, { onConflict: 'salao_id,profissional_id' })

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
        controller.close()
      }
    })

    return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
