import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { proximaAcaoPadrao } from '@/lib/crm'
import { nomeNaMensagem } from '@/lib/crmNomes'
import { paginar } from '@/lib/paginar'

export const dynamic = 'force-dynamic'

// ── Arrumar o que ficou para trás ───────────────────────────────────────────
//
// Toda regra nova vale da hora em que entrou no ar para a frente. O que já
// estava gravado continua como estava, e o salão fica olhando para uma tela
// que diz uma coisa enquanto o sistema já pensa outra. Esta rota acerta o
// passado, uma vez, com a pessoa olhando.
//
// Duas arrumações, as duas medidas em 12/09/2026:
//
//   PASTA  -- disparo que caiu em "Aguardando cliente" antes de a regra de
//             ritmo existir. Eram 205 conversas, e é o que fazia a recepção
//             parar de abrir a pasta.
//   NOME   -- 276 de 300 conversas apareciam como "Contato 315487". O nome
//             está escrito na mensagem que o próprio salão mandou.
//
// Nada aqui é automático: roda quando alguém pede, e sem `aplicar=1` só conta
// o que faria. Mexer em centenas de linhas por conta própria, calado, é o
// tipo de ajuda que ninguém pediu.

export async function POST(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Só o dono do salão.' }, { status: 403 })

  const aplicar = new URL(req.url).searchParams.get('aplicar') === '1'
  const salaoId = sess.salaoId

  // ── 1. Disparo que ficou em "Aguardando cliente" ─────────────────────────
  //
  // O critério é o mesmo do ao vivo, só que olhando para trás: mensagem do
  // salão que saiu para VÁRIAS pessoas no mesmo minuto. Só mexe em conversa
  // que está em 'aguardando' -- Preciso agir, Follow-up, Pausadas, Agendadas
  // e Confirmou não se tocam, pela mesma razão de sempre.
  // Em páginas: o `.limit(4000)` daqui devolvia 1000, e a recuperação de nomes
  // só olhava as mil mensagens mais recentes. Ver src/lib/paginar.ts.
  const { dados: saidas } = await paginar<any>((de, ate) => supabaseAdmin
    .from('crm_mensagens')
    .select('conversa_id, texto, criado_em')
    .eq('salao_id', salaoId).eq('direcao', 'saida')
    .order('criado_em', { ascending: false })
    .range(de, ate), 40000)

  // Agrupa por minuto: disparo sai em rajada, resposta de gente não.
  const porMinuto = new Map<string, Set<string>>()
  const minutoDaMensagem = new Map<string, string>()
  for (const m of saidas || []) {
    if (!m.conversa_id) continue
    const minuto = String(m.criado_em).slice(0, 16)   // AAAA-MM-DDTHH:MM
    if (!porMinuto.has(minuto)) porMinuto.set(minuto, new Set())
    porMinuto.get(minuto)!.add(m.conversa_id)
    // A última (mais recente) de cada conversa manda, e a lista já vem
    // ordenada do mais novo para o mais velho.
    if (!minutoDaMensagem.has(m.conversa_id)) minutoDaMensagem.set(m.conversa_id, minuto)
  }

  const deRajada = new Set<string>()
  for (const [conversaId, minuto] of minutoDaMensagem) {
    const juntas = porMinuto.get(minuto)
    if (juntas && juntas.size >= 3) deRajada.add(conversaId)
  }

  const { data: emAguardando } = await supabaseAdmin
    .from('crm_conversas').select('id')
    .eq('salao_id', salaoId).eq('estado', 'aguardando')
    .limit(1000)

  const paraPromo = (emAguardando || []).map(c => c.id).filter(id => deRajada.has(id))

  // ── 2. Histórico varrido para dentro do Follow-up ────────────────────────
  //
  // O relógio levava conversa importada para o Follow-up junto com as de
  // verdade. Resultado medido: 475 de 476 eram importadas e UMA era do salão.
  // O relógio já foi corrigido; estas aqui ficaram e voltam para "Aguardando",
  // que é de onde nunca deviam ter saído.
  const { data: fuImportadas } = await supabaseAdmin
    .from('crm_conversas').select('id')
    .eq('salao_id', salaoId).eq('estado', 'follow_up').eq('importada', true)
    .limit(3000)
  const paraAguardando = (fuImportadas || []).map(c => c.id)

  // ── 3. Contato sem nome ──────────────────────────────────────────────────
  const { data: semNome } = await supabaseAdmin
    .from('crm_contatos').select('id')
    .eq('salao_id', salaoId).is('nome', null)
    .limit(2000)

  const idsSemNome = new Set((semNome || []).map(c => c.id))
  const nomesAchados = new Map<string, string>()

  if (idsSemNome.size) {
    // De qual contato é cada conversa -- a mensagem guarda a conversa, não o
    // contato.
    const { data: conversas } = await supabaseAdmin
      .from('crm_conversas').select('id, contato_id')
      .eq('salao_id', salaoId).limit(3000)
    const contatoDaConversa = new Map<string, string>()
    for (const c of conversas || []) contatoDaConversa.set(c.id, c.contato_id)

    // Da mais nova para a mais velha: o nome mais recente é o que vale.
    for (const m of saidas || []) {
      const contatoId = m.conversa_id ? contatoDaConversa.get(m.conversa_id) : null
      if (!contatoId || !idsSemNome.has(contatoId) || nomesAchados.has(contatoId)) continue
      const nome = nomeNaMensagem(m.texto || '')
      if (nome) nomesAchados.set(contatoId, nome)
    }
  }

  if (!aplicar) {
    return NextResponse.json({
      simulacao: true,
      conversas_para_promocao: paraPromo.length,
      follow_up_que_volta_para_aguardando: paraAguardando.length,
      contatos_que_ganham_nome: nomesAchados.size,
      exemplos_de_nome: [...nomesAchados.values()].slice(0, 12),
    })
  }

  const agora = new Date().toISOString()
  let mudadas = 0
  // Em lotes de 100: um `in` com mil ids estoura o tamanho da URL do PostgREST.
  for (let i = 0; i < paraPromo.length; i += 100) {
    const lote = paraPromo.slice(i, i + 100)
    const { error } = await supabaseAdmin.from('crm_conversas').update({
      estado: 'aguardando_promo',
      proxima_acao: proximaAcaoPadrao('aguardando_promo'),
      atualizado_em: agora,
    }).in('id', lote)
    if (!error) mudadas += lote.length
  }

  // Histórico de volta para Aguardando.
  let devolvidas = 0
  for (let i = 0; i < paraAguardando.length; i += 100) {
    const lote = paraAguardando.slice(i, i + 100)
    const { error } = await supabaseAdmin.from('crm_conversas').update({
      estado: 'aguardando',
      proxima_acao: proximaAcaoPadrao('aguardando'),
      atualizado_em: agora,
    }).in('id', lote)
    if (!error) devolvidas += lote.length
  }

  let nomeados = 0
  for (const [contatoId, nome] of nomesAchados) {
    const { error } = await supabaseAdmin.from('crm_contatos')
      .update({ nome }).eq('id', contatoId)
    if (!error) nomeados++
  }

  return NextResponse.json({
    ok: true,
    conversas_para_promocao: mudadas,
    follow_up_que_voltou_para_aguardando: devolvidas,
    contatos_que_ganharam_nome: nomeados,
  })
}
