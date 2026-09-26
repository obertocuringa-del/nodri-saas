import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { carregarConfig, gravarConfig, gerarChave } from '@/lib/crmAutomacao'
import { CHAVE_ROBO, lerRobo, decifrar } from '@/lib/crmRoboAvec'

export const dynamic = 'force-dynamic'

// ── Porta do robô do Avec (servidor NODRI) ──────────────────────────────────
//
// Quem chama é o robô que roda no servidor (robo-avec/index.js), não um
// navegador: ele se apresenta com x-crm-chave, a mesma chave de serviço da
// ponte do WhatsApp. Devolve os salões com "rodar no servidor" ligado, cada
// um com o que o Chrome dele precisa: a chave da extensão (criada aqui se o
// salão ainda não tiver) e o login do Avec, decifrado só neste momento.
//
// Salão novo: o dono salva e-mail e senha do Avec e liga "rodar no servidor";
// na volta seguinte (até 1 min) o robô cria o Chrome dele, já configurado.

function autorizado(req: NextRequest): boolean {
  const esperada = process.env.CRM_PONTE_CHAVE || ''
  if (!esperada) return false
  return req.headers.get('x-crm-chave') === esperada
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data } = await supabaseAdmin.from('salao_config').select('salao_id, valor')
    .eq('chave', CHAVE_ROBO)
  const ligados = (data || [])
    .map((l: any) => ({ salao_id: l.salao_id as string, robo: lerRobo(l.valor) }))
    .filter(l => l.robo.no_servidor && l.robo.email && l.robo.senha_cifra)
  if (!ligados.length) return NextResponse.json({ saloes: [] })

  const { data: nomes } = await supabaseAdmin.from('saloes').select('id, nome')
    .in('id', ligados.map(l => l.salao_id))
  const nomeDe = new Map((nomes || []).map((s: any) => [s.id, s.nome]))

  const saloes = []
  for (const l of ligados) {
    let senha = ''
    try { senha = decifrar(l.robo.senha_cifra) } catch { continue }
    const cfg = await carregarConfig(l.salao_id)
    if (!cfg.chave) {
      cfg.chave = gerarChave()
      await gravarConfig(l.salao_id, cfg)
    }
    saloes.push({
      salao_id: l.salao_id,
      nome: nomeDe.get(l.salao_id) || l.salao_id,
      chave: cfg.chave,
      email: l.robo.email,
      senha,
    })
  }
  return NextResponse.json({ saloes })
}
