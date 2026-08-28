import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { conferir } from '@/lib/conferenciaServicos'
import { conferirProfissionais } from '@/lib/conferenciaProfissionais'

// ── Alertas que fazem botão piscar no menu ──────────────────────────────────
// Um endpoint só pra todas as telas lerem o MESMO número — se cada menu
// calculasse do seu jeito, um piscaria e o outro não.
//
// kitsPendentes  → kits solicitados pelas profissionais que ninguém separou
//                  (olha o mês atual E o anterior: pedido do fim do mês não
//                  pode sumir do alerta na virada)
// esterPendentes → alicates que a profissional enviou e o salão ainda não
//                  recebeu (status 'enviado') — mesma ideia dos kits
// solicitacoes   → pedidos abertos que vieram do portal da profissional
// porFerramenta  → quantos avisos em CADA botão da barra do setor, pela chave
//                  do catálogo de ferramentas. O card do setor piscando dizia
//                  que HAVIA algo; para descobrir o quê era preciso abrir
//                  página por página
// porPagina      → o mesmo para página do menu principal (ex.: 'servicos')
// solicPorSetor  → quantos pedidos abertos em CADA setor, pra o card do setor
//                  piscar e ninguém ter que abrir um por um pra descobrir

const mesRef = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export async function GET() {
  const sess = await getSessao()
  if (!sess || sess.role === 'profissional') {
    return NextResponse.json({
      kitsPendentes: 0, esterPendentes: 0, solicitacoes: 0, solicPorSetor: {},
      servicosSemCadastro: 0, profsSemHabilitacao: 0, porFerramenta: {}, porPagina: {},
    })
  }

  const hoje = new Date()
  const meses = [mesRef(hoje), mesRef(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1))]

  let kitsPendentes = 0
  try {
    const { data } = await supabaseAdmin
      .from('salao_config').select('chave, valor')
      .eq('salao_id', sess.salaoId)
      .in('chave', meses.map(m => `kits_solicitacoes_${m}`))
    for (const row of (data || []) as any[]) {
      const lista = Array.isArray(row?.valor) ? row.valor : []
      kitsPendentes += lista.filter((s: any) => s?.status === 'pendente').length
    }
  } catch { /* sem kits configurados ainda */ }

  // Alicates entregues pela profissional que o salão ainda não conferiu
  let esterPendentes = 0
  try {
    const { data } = await supabaseAdmin
      .from('salao_config').select('valor')
      .eq('salao_id', sess.salaoId).eq('chave', 'esterilizacao_fluxo').maybeSingle()
    const lista = Array.isArray((data as any)?.valor) ? (data as any).valor : []
    esterPendentes = lista.filter((p: any) => p?.status === 'enviado').length
  } catch { /* sem fluxo de esterilização ainda */ }

  let solicitacoes = 0
  const solicPorSetor: Record<string, number> = {}
  try {
    const { data } = await supabaseAdmin
      .from('pendencias_profissionais')
      .select('profissional_id')
      .eq('salao_id', sess.salaoId)
      .eq('resolvido', false)
      .eq('origem', 'solicitacao')
    for (const p of (data || []) as any[]) {
      solicitacoes++
      const alvo = p?.profissional_id
      if (alvo) solicPorSetor[alvo] = (solicPorSetor[alvo] || 0) + 1
    }
  } catch { /* tabela pode não ter a coluna origem em bases antigas */ }

  // As duas conferências da planilha guardam o resultado presas à assinatura
  // dos atendimentos (ver conferenciaServicos/conferenciaProfissionais): aqui
  // só se lê um número, e a varredura pesada acontece uma vez por importação.
  let servicosSemCadastro = 0
  let profsSemHabilitacao = 0
  try {
    const [conf, pend] = await Promise.all([
      conferir(sess.salaoId),
      conferirProfissionais(sess.salaoId),
    ])
    servicosSemCadastro = conf.ausentes.length
    profsSemHabilitacao = pend.length
  } catch { /* salão sem planilha importada ainda */ }

  // Contagem por botão. As chaves são os ids do catálogo de ferramentas
  // (src/lib/ferramentasCatalogo.ts), que a barra do setor já usa — assim
  // ferramenta e contador não saem de sincronia por descuido.
  const porFerramenta: Record<string, number> = {}
  if (esterPendentes) porFerramenta.esterilizacao_fluxo = esterPendentes
  if (kitsPendentes) porFerramenta.kits = kitsPendentes
  if (profsSemHabilitacao) porFerramenta.pr_lista = profsSemHabilitacao

  const porPagina: Record<string, number> = {}
  if (servicosSemCadastro) porPagina.servicos = servicosSemCadastro
  if (profsSemHabilitacao) porPagina.profissionais = profsSemHabilitacao

  return NextResponse.json({
    kitsPendentes, esterPendentes, solicitacoes, solicPorSetor,
    servicosSemCadastro, profsSemHabilitacao, porFerramenta, porPagina,
  })
}
