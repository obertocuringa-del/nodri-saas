import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyJWT } from '@/lib/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// ── Consumo da IA ───────────────────────────────────────────────────────────
//
// Responde as perguntas que antes só tinham palpite: quanto está sendo gasto,
// por quem, e se o cache está pegando.
//
// Só o master vê. Consumo cruzado entre salões é informação de dono do SaaS —
// um salão não tem por que saber quanto o vizinho usa.

const DIAS = 30

export async function GET(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (payload?.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const dias = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get('dias')) || DIAS))
  const desde = new Date(Date.now() - dias * 86400000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('ia_uso')
    .select('salao_id, provedor, modelo, tokens_entrada, tokens_saida, tokens_cache_leitura, tokens_cache_escrita, ferramentas, ms, reserva, erro, criado_em')
    .gte('criado_em', desde)
    .order('criado_em', { ascending: false })
    .limit(5000)

  // A tabela pode ainda não existir (o SQL não foi rodado). Isso não é falha
  // do painel: é um passo pendente, e a tela precisa dizer isso em vez de
  // mostrar erro vermelho como se algo tivesse quebrado.
  if (error) {
    return NextResponse.json({ pendente: true, mensagem: 'Rode sql/ia_monitoramento.sql no Supabase para ligar o monitoramento.' })
  }

  const linhas = data || []
  const hojeISO = new Date().toISOString().slice(0, 10)

  const zero = () => ({
    perguntas: 0, entrada: 0, saida: 0, cacheLeitura: 0, cacheEscrita: 0,
    ferramentas: 0, ms: 0, reservas: 0, erros: 0,
  })
  const total = zero()
  const hoje = zero()
  const porSalao: Record<string, ReturnType<typeof zero>> = {}
  const porModelo: Record<string, ReturnType<typeof zero>> = {}

  const somar = (alvo: ReturnType<typeof zero>, l: any) => {
    alvo.perguntas++
    alvo.entrada += Number(l.tokens_entrada) || 0
    alvo.saida += Number(l.tokens_saida) || 0
    alvo.cacheLeitura += Number(l.tokens_cache_leitura) || 0
    alvo.cacheEscrita += Number(l.tokens_cache_escrita) || 0
    alvo.ferramentas += Number(l.ferramentas) || 0
    alvo.ms += Number(l.ms) || 0
    if (l.reserva) alvo.reservas++
    if (l.erro) alvo.erros++
  }

  for (const l of linhas) {
    somar(total, l)
    if (String(l.criado_em || '').slice(0, 10) === hojeISO) somar(hoje, l)
    const s = l.salao_id || 'sem-salao'
    if (!porSalao[s]) porSalao[s] = zero()
    somar(porSalao[s], l)
    const m = l.modelo || '—'
    if (!porModelo[m]) porModelo[m] = zero()
    somar(porModelo[m], l)
  }

  // Nome do salão: o id sozinho não diz nada a quem lê o painel.
  const ids = Object.keys(porSalao).filter(x => x !== 'sem-salao')
  const nomes: Record<string, string> = {}
  if (ids.length) {
    const { data: sal } = await supabaseAdmin.from('saloes').select('id, nome').in('id', ids)
    for (const s of sal || []) nomes[s.id] = s.nome || s.id
  }

  const listaSaloes = Object.entries(porSalao)
    .map(([id, v]) => ({ salao_id: id, nome: nomes[id] || id, ...v }))
    .sort((a, b) => (b.entrada + b.saida) - (a.entrada + a.saida))
    .slice(0, 40)

  const listaModelos = Object.entries(porModelo)
    .map(([modelo, v]) => ({ modelo, ...v }))
    .sort((a, b) => b.perguntas - a.perguntas)

  return NextResponse.json({
    dias,
    amostra_truncada: linhas.length >= 5000,
    total,
    hoje,
    media_tokens_por_pergunta: total.perguntas
      ? Math.round((total.entrada + total.saida + total.cacheLeitura) / total.perguntas)
      : 0,
    media_segundos: total.perguntas ? Math.round(total.ms / total.perguntas / 100) / 10 : 0,
    saloes: listaSaloes,
    modelos: listaModelos,
    ultimos_erros: linhas.filter((l: any) => l.erro).slice(0, 10)
      .map((l: any) => ({ criado_em: l.criado_em, modelo: l.modelo, erro: l.erro })),
  })
}
