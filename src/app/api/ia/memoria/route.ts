import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET — retorna memória atual do salão
export async function GET(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data } = await supabaseAdmin
      .from('ia_memoria_usuario')
      .select('memoria, atualizado_em')
      .eq('salao_id', salaoId)
      .maybeSingle()

    return NextResponse.json({ memoria: data?.memoria || null, atualizado_em: data?.atualizado_em || null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — atualiza memória com base em uma conversa
export async function POST(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { mensagens, conversa_id } = await req.json()
    if (!mensagens?.length) return NextResponse.json({ ok: true }) // nada a fazer

    // Busca config da IA
    const { data: configGlobal } = await supabaseAdmin
      .from('ia_config_global')
      .select('api_key, modelo, ativo')
      .limit(1)
      .maybeSingle()

    if (!configGlobal?.api_key || !configGlobal.ativo) {
      return NextResponse.json({ ok: true }) // silencioso — não bloqueia
    }

    // Busca memória atual
    const { data: memoriaAtual } = await supabaseAdmin
      .from('ia_memoria_usuario')
      .select('memoria')
      .eq('salao_id', salaoId)
      .maybeSingle()

    const modelo = configGlobal.modelo || 'gemini-2.5-flash'

    // Monta conversa para análise
    const conversaTexto = mensagens
      .filter((m: any) => !m.content.startsWith('[SISTEMA]'))
      .map((m: any) => `${m.role === 'user' ? 'GESTOR' : 'NODRI IA'}: ${m.content}`)
      .join('\n')

    const promptMemoria = `Você é um sistema de análise de comportamento e preferências do usuário.

MEMÓRIA ATUAL DO GESTOR:
${memoriaAtual?.memoria || 'Nenhuma memória registrada ainda.'}

NOVA CONVERSA:
${conversaTexto}

Com base na conversa acima, atualize o perfil de memória do gestor.

O perfil deve capturar:
• Estilo de comunicação preferido (direto, detalhado, informal, formal)
• Tópicos de maior interesse recorrentes
• Profissionais que mais aparecem nas conversas
• Decisões tomadas ou intenções manifestadas
• O que o gestor valoriza nas respostas (velocidade, profundidade, dados, estratégia)
• Frustrações ou críticas expressas
• Contexto do negócio que emergiu na conversa

REGRAS:
• Mantenha o perfil conciso (máximo 300 palavras)
• Preserve informações anteriores relevantes
• Adicione ou atualize com as novas observações
• Escreva em formato de texto corrido, como um briefing executivo
• Não invente informações — só registre o que foi observado

Retorne APENAS o perfil atualizado, sem introduções ou explicações.`

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${configGlobal.api_key}`
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptMemoria }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.3 }
      })
    })

    if (!geminiRes.ok) return NextResponse.json({ ok: true }) // silencioso

    const geminiData = await geminiRes.json()
    const novaMemoria = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (novaMemoria) {
      await supabaseAdmin
        .from('ia_memoria_usuario')
        .upsert({
          salao_id: salaoId,
          memoria: novaMemoria,
          atualizado_em: new Date().toISOString(),
        }, { onConflict: 'salao_id' })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: true }) // sempre silencioso — não interrompe o usuário
  }
}
