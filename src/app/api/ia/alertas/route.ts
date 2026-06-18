import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

// Gera alertas proativos automáticos com base nos dados do salão
export async function GET(req: NextRequest) {
  try {
    const token = cookies().get('nodri_token')?.value
    const payload = token ? await verifyJWT(token) : null
    const salaoId = payload?.salaoId
    if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const anoAtual = agora.getFullYear()
    const mesAtual = agora.getMonth() + 1
    const diaAtual = agora.getDate()
    const ultimoDiaMes = new Date(anoAtual, mesAtual, 0).getDate()
    const diasRestantes = ultimoDiaMes - diaAtual
    const pctMesDecorrido = diaAtual / ultimoDiaMes

    const [
      { data: metas },
      { data: periodos },
      { data: feedbacksProf },
      { data: pendencias },
    ] = await Promise.all([
      supabaseAdmin.from('ia_metas_salao').select('ano, mes, meta_valor, metas_profissionais').eq('salao_id', salaoId).eq('ano', anoAtual).eq('mes', mesAtual).maybeSingle(),
      supabaseAdmin.from('relatorio_periodos').select('ano, mes, resumo_mensal, prof_pagamentos').eq('salao_id', salaoId).order('ano', { ascending: false }).order('mes', { ascending: false }).limit(3),
      supabaseAdmin.from('feedback_prof_respostas').select('profissional_nome, tipo, criado_em').eq('salao_id', salaoId).eq('tipo', 'negativo').gte('criado_em', new Date(Date.now() - 30 * 86400000).toISOString()),
      supabaseAdmin.from('pendencias_profissionais').select('profissional_id, mensagem, data_limite').eq('salao_id', salaoId).eq('resolvido', false),
    ])

    const alertas: { tipo: 'critico' | 'atencao' | 'info'; titulo: string; mensagem: string; icone: string; pct?: number; diasRestantes?: number }[] = []

    // Alertas de meta por profissional
    if (metas?.metas_profissionais?.length) {
      for (const mp of metas.metas_profissionais) {
        const meta = Number(mp.meta_redistribuida || 0)
        const realizado = Number(mp.realizado || 0)
        if (meta <= 0) continue
        const pct = realizado / meta
        const projecao = pctMesDecorrido > 0 ? realizado / pctMesDecorrido : realizado
        const projecaoPct = projecao / meta

        if (pct >= 1) {
          alertas.push({ tipo: 'info', icone: '🏆', titulo: `${mp.nome} bateu a meta!`, mensagem: `Atingiu ${Math.round(pct * 100)}% (R$${realizado.toFixed(0)} de R$${meta.toFixed(0)}).`, pct: Math.round(pct * 100), diasRestantes })
        } else if (projecaoPct < 0.7 && diasRestantes <= 10) {
          alertas.push({ tipo: 'critico', icone: '🚨', titulo: `${mp.nome} não vai bater a meta`, mensagem: `Projeção: ${Math.round(projecaoPct * 100)}% da meta. Faltam ${diasRestantes} dias. Precisa de R$${(meta - realizado).toFixed(0)} ainda.`, pct: Math.round(pct * 100), diasRestantes })
        } else if (projecaoPct < 0.85) {
          alertas.push({ tipo: 'atencao', icone: '⚠️', titulo: `${mp.nome} em risco de não bater`, mensagem: `Atingiu ${Math.round(pct * 100)}% com ${diasRestantes} dias restantes. Precisa acelerar.`, pct: Math.round(pct * 100), diasRestantes })
        }
      }
    }

    // Alerta de faturamento do salão abaixo do esperado
    if (periodos && periodos.length >= 2) {
      const mesAtualDados = periodos.find(p => p.ano === anoAtual && p.mes === mesAtual)
      const mesAnterior = periodos.find(p => !(p.ano === anoAtual && p.mes === mesAtual))
      if (mesAtualDados && mesAnterior) {
        const fatAtual = Number(mesAtualDados.resumo_mensal?.total || 0)
        const fatAnterior = Number(mesAnterior.resumo_mensal?.total || 0)
        if (fatAnterior > 0) {
          const projecao = pctMesDecorrido > 0 ? fatAtual / pctMesDecorrido : fatAtual
          const variacaoPct = ((projecao - fatAnterior) / fatAnterior) * 100
          if (variacaoPct < -20) {
            alertas.push({ tipo: 'critico', icone: '📉', titulo: 'Faturamento em queda acentuada', mensagem: `Projeção do mês ${Math.round(variacaoPct)}% abaixo do mês anterior. Ação urgente necessária.` })
          } else if (variacaoPct < -10) {
            alertas.push({ tipo: 'atencao', icone: '📊', titulo: 'Faturamento abaixo do mês anterior', mensagem: `Projeção ${Math.abs(Math.round(variacaoPct))}% menor que o mês passado.` })
          }
        }
      }
    }

    // Alertas de ocorrências negativas recentes
    if (feedbacksProf && feedbacksProf.length > 0) {
      const contagem: Record<string, number> = {}
      feedbacksProf.forEach((f: any) => {
        contagem[f.profissional_nome] = (contagem[f.profissional_nome] || 0) + 1
      })
      const comMaisOcorrencias = Object.entries(contagem).filter(([, qtd]) => qtd >= 3)
      for (const [nome, qtd] of comMaisOcorrencias) {
        alertas.push({ tipo: 'atencao', icone: '🔴', titulo: `${nome} com ocorrências frequentes`, mensagem: `${qtd} ocorrências negativas nos últimos 30 dias.` })
      }
    }

    // Alertas de pendências vencidas
    if (pendencias && pendencias.length > 0) {
      const vencidas = pendencias.filter((p: any) => p.data_limite && new Date(p.data_limite) < agora)
      if (vencidas.length > 0) {
        alertas.push({ tipo: 'atencao', icone: '📋', titulo: `${vencidas.length} pendência(s) vencida(s)`, mensagem: `Há pendências com prazo expirado aguardando resolução.` })
      }
    }

    // Alerta positivo se tudo vai bem
    if (alertas.length === 0) {
      alertas.push({ tipo: 'info', icone: '✅', titulo: 'Tudo sob controle', mensagem: 'Nenhum alerta crítico identificado no momento.' })
    }

    return NextResponse.json({ alertas, gerado_em: agora.toISOString() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
