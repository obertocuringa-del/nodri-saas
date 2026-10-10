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

  // ── As quatro contas vão JUNTAS ─────────────────────────────────────────
  //
  // Elas não dependem uma da outra, mas estavam em `await` na fila: quatro
  // idas ao banco, uma esperando a anterior. O banco responde em menos de um
  // milissegundo; o que custa é a distância -- o servidor está em Boston e o
  // Supabase em São Paulo, ~100 ms por ida e volta. Em fila isso vira ~2 s,
  // e esta rota era a mais lenta da tela de Pendências (medido 1974 ms em
  // 10/10/2026), segurando o organograma inteiro.
  //
  // Cada uma mantém o seu próprio try: uma base sem kits configurados não
  // pode derrubar a contagem de solicitações, como já era antes.
  const [kitsPendentes, esterPendentes, dadosSolic, conferencias] = await Promise.all([
    (async () => {
      try {
        const { data } = await supabaseAdmin
          .from('salao_config').select('chave, valor')
          .eq('salao_id', sess.salaoId)
          .in('chave', meses.map(m => `kits_solicitacoes_${m}`))
        let n = 0
        for (const row of (data || []) as any[]) {
          const lista = Array.isArray(row?.valor) ? row.valor : []
          n += lista.filter((s: any) => s?.status === 'pendente').length
        }
        return n
      } catch { return 0 }   // sem kits configurados ainda
    })(),

    // Alicates entregues pela profissional que o salão ainda não conferiu
    (async () => {
      try {
        const { data } = await supabaseAdmin
          .from('salao_config').select('valor')
          .eq('salao_id', sess.salaoId).eq('chave', 'esterilizacao_fluxo').maybeSingle()
        const lista = Array.isArray((data as any)?.valor) ? (data as any).valor : []
        return lista.filter((p: any) => p?.status === 'enviado').length
      } catch { return 0 }   // sem fluxo de esterilização ainda
    })(),

    (async () => {
      const porSetor: Record<string, number> = {}
      let total = 0
      try {
        const { data } = await supabaseAdmin
          .from('pendencias_profissionais')
          .select('profissional_id')
          .eq('salao_id', sess.salaoId)
          .eq('resolvido', false)
          .eq('origem', 'solicitacao')
        for (const p of (data || []) as any[]) {
          total++
          const alvo = p?.profissional_id
          if (alvo) porSetor[alvo] = (porSetor[alvo] || 0) + 1
        }
      } catch { /* base antiga pode não ter a coluna origem */ }
      return { total, porSetor }
    })(),

    // As duas conferências da planilha guardam o resultado presas à assinatura
    // dos atendimentos (ver conferenciaServicos/conferenciaProfissionais): aqui
    // só se lê um número, e a varredura pesada acontece uma vez por importação.
    (async () => {
      try {
        const [conf, pend] = await Promise.all([
          conferir(sess.salaoId),
          conferirProfissionais(sess.salaoId),
        ])
        return { servicosSemCadastro: conf.ausentes.length, profsSemHabilitacao: pend.length }
      } catch { return { servicosSemCadastro: 0, profsSemHabilitacao: 0 } }
    })(),
  ])

  const solicitacoes = dadosSolic.total
  const solicPorSetor = dadosSolic.porSetor
  const { servicosSemCadastro, profsSemHabilitacao } = conferencias

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
