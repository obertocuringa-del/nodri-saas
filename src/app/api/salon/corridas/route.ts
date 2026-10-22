import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'
import { registrarAuditoria } from '@/lib/audit'
import type { CorridaInterna, LinhaRanking, MetricaCorrida, ResumoGrupo } from '@/lib/corridasInternas'
import { metricaInfo, resumoGrupo } from '@/lib/corridasInternas'
import { calcularRankings } from '@/lib/corridasCalculo'

const CHAVE = 'corridas_internas'

async function ler(salaoId: string): Promise<CorridaInterna[]> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor').eq('salao_id', salaoId).eq('chave', CHAVE).maybeSingle()
  const v = (data as any)?.valor
  return Array.isArray(v) ? v : []
}
async function gravar(salaoId: string, lista: CorridaInterna[]) {
  return supabaseAdmin.from('salao_config').upsert(
    { salao_id: salaoId, chave: CHAVE, valor: lista, atualizado_em: new Date().toISOString() },
    { onConflict: 'salao_id,chave' },
  )
}


// GET — dono/sub veem todas; profissional só as ativas em que participa.
// Sempre devolve o ranking calculado de cada corrida.
export async function GET() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const todas = await ler(sess.salaoId)
  const ehProf = sess.role === 'profissional'
  const voceId = ehProf ? (sess.profissionalId || '') : ''

  // Corridas visíveis para este usuário
  let visiveis = todas
  if (ehProf) {
    visiveis = todas.filter(c => c.ativa &&
      (!c.participantes || c.participantes.length === 0 || (voceId && c.participantes.includes(voceId))))
  }

  // O quadro de medalhas conta TODAS as corridas publicadas, e não só as que
  // esta pessoa vê. Senão cada profissional veria um quadro diferente, e o
  // que motiva é justamente comparar com a colega — um quadro que muda
  // conforme quem olha não serve para isso.
  const publicadas = todas.filter(c => c.ativa)
  const paraCalcular = [...visiveis]
  for (const c of publicadas) if (!paraCalcular.some(v => v.id === c.id)) paraCalcular.push(c)

  const ehDono = sess.role === 'salon'
  const { rankings, profs } = await calcularRankings(sess.salaoId, paraCalcular, ehDono)


  // ── Medalhas ────────────────────────────────────────────────────────────
  //
  // Uma medalha por corrida publicada em que a pessoa bateu a meta. Não há
  // tabela nem gravação: a medalha é a leitura do próprio ranking. Guardar
  // exigiria decidir a hora exata de premiar e manter em dia depois de cada
  // importação — e um número guardado que ninguém recalcula envelhece calado.
  //
  // Corrida sem meta não dá medalha: sem alvo não há o que bater.
  const porProf = new Map<string, { profId: string; nome: string; corridas: { id: string; titulo: string }[] }>()
  for (const p of profs) porProf.set(p.id, { profId: p.id, nome: p.apelido || p.nome_completo || 'Profissional', corridas: [] })
  for (const c of publicadas) {
    // Corrida inversa premia com teto zero ("nenhuma falta"); nas demais, meta
    // zero significa que ninguém definiu alvo, e sem alvo não há o que bater.
    // Na corrida em grupo o alvo não é `c.meta` (não existe um só): cada uma tem
    // o seu, vindo do perfil. Quem bateu o próprio alvo leva medalha igual.
    const limiteVale = c.modo === 'grupo' ? true
      // Meta individual tem alvo sim — um por pessoa. Sem esta linha a corrida
      // que o dono criou justamente para premiar meta individual seria a unica
      // que nao da medalha.
      : (c.metaIndividual && c.metrica === 'faturamento') ? true
      : metricaInfo(c.metrica).inversa
      ? (typeof c.meta === 'number' && c.meta >= 0)
      : (typeof c.meta === 'number' && c.meta > 0)
    if (!limiteVale) continue
    for (const l of (rankings[c.id] || [])) {
      if (!l.bateuMeta) continue
      porProf.get(l.profId)?.corridas.push({ id: c.id, titulo: c.titulo })
    }
  }
  const medalhas = [...porProf.values()]
    .map(m => ({ ...m, total: m.corridas.length }))
    .filter(m => m.total > 0)
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'))

  // Só vai para a tela o ranking do que a pessoa pode ver.
  //
  // Passei a calcular corridas além das visíveis para montar o quadro de
  // medalhas; mandar todas na resposta entregaria ao navegador do profissional
  // os valores dos colegas em disputas das quais ele nem participa. Não basta a
  // tela não desenhar — o dado não pode sair daqui.
  const rankingsVisiveis: Record<string, LinhaRanking[]> = {}
  for (const c of visiveis) if (rankings[c.id]) rankingsVisiveis[c.id] = rankings[c.id]

  // ── Placar do grupo, e o que dele o profissional pode ver ────────────────
  //
  // O profissional vê o gráfico inteiro — nomes, colunas, quem bateu — mas
  // nenhum real que não seja o dele. Não é preciosismo: com "+R$ 1.000" escrito
  // em cima de uma coluna de 120%, qualquer um divide e descobre que a meta da
  // colega é R$ 5.000. Por isso a poda é AQUI, e não na tela: o dado não pode
  // sair do servidor. A tela sozinha esconderia só de quem não abre o DevTools.
  const resumosGrupo: Record<string, ResumoGrupo> = {}
  for (const c of visiveis) {
    if (c.modo !== 'grupo') continue
    const linhas = rankingsVisiveis[c.id] || []
    const r = resumoGrupo(linhas)
    if (ehDono) {
      resumosGrupo[c.id] = r
    } else {
      // Fica só a rosca (o %) e o placar de quantas bateram. O "R$ X de R$ Y" e
      // o "faltam R$ Z" saem inteiros — os dois revelam o dinheiro do grupo.
      resumosGrupo[c.id] = { pct: r.pct, bateram: r.bateram, participantes: r.participantes }
      rankingsVisiveis[c.id] = linhas.map(l => l.profId === voceId ? l : ({
        profId: l.profId, nome: l.nome, pos: l.pos, valor: 0, valorOculto: true,
        pctMeta: l.pctMeta, bateuMeta: l.bateuMeta,
        pctProprio: l.pctProprio, pctRecebidoMeta: l.pctRecebidoMeta, pctDoadoMeta: l.pctDoadoMeta,
      }))
    }
  }

  // ── Meta individual: a lista fica, o dinheiro da colega não ──────────────
  //
  // A lista inteira é o que faz a corrida existir — ver a colega na frente é o
  // que move. O que não pode viajar é o alvo dela: `metaPessoal` é o salário que
  // o salão combinou com outra pessoa.
  //
  // O R$ da colega também sai, mesmo quando o dono deixou os valores à mostra.
  // Aqui a % anda junto do valor, e as duas coisas na mesma linha entregam a
  // meta por divisão: R$ 892,50 em 16% dá R$ 5.578. A % sozinha não entrega
  // nada, e é ela que monta o ranking. A linha DELA vai inteira.
  if (!ehDono) {
    for (const c of visiveis) {
      if (c.modo === 'grupo' || !c.metaIndividual || c.metrica !== 'faturamento') continue
      const linhas = rankingsVisiveis[c.id]
      if (!linhas) continue
      rankingsVisiveis[c.id] = linhas.map(l => l.profId === voceId ? l : ({
        profId: l.profId, nome: l.nome, pos: l.pos, valor: 0, valorOculto: true,
        pctMeta: l.pctMeta, bateuMeta: l.bateuMeta,
      }))
    }
  }

  // A própria corrida também carrega dinheiro: `doacoes` traz "entregou R$ X" e
  // `simulacoes` traz os valores de teste. Com a coluna da colega em 120% na
  // tela, um "R$ 1.000" de doação entrega a meta dela por divisão — a mesma
  // fresta que a poda do ranking fecha. Então o objeto também vai podado.
  // Corrida em grupo só aparece para quem está NELA de verdade.
  //
  // O filtro de participantes lá em cima já barra quem não foi escolhido, mas
  // deixa passar um caso: com "todos os profissionais" marcado, quem ainda não
  // tem meta no período fica de fora do gráfico (não há alvo para medir) e
  // mesmo assim via a corrida — um card em que ela não existe. Aqui ela sai.
  if (!ehDono) {
    visiveis = visiveis.filter(c => c.modo !== 'grupo'
      || (rankingsVisiveis[c.id] || []).some(l => l.profId === voceId))
  }

  const corridasVisiveis = ehDono ? visiveis : visiveis.map(c => {
    // A observação interna some para qualquer corrida, de qualquer tipo.
    // `diasTrabalho` é o mapa da escala de todo mundo: a profissional só
    // precisa do número dela, que já viaja na linha do ranking.
    const { observacaoInterna, diasTrabalho, ...semNota } = c
    if (semNota.modo !== 'grupo') return semNota
    return {
      ...semNota,
      simulacoes: undefined,
      doacoes: (c.doacoes || []).filter(d => !d.teste).map(d => ({ de: d.de, para: d.para, em: d.em, valor: 0 })),
    }
  })

  return NextResponse.json({ corridas: corridasVisiveis, rankings: rankingsVisiveis, voceId, medalhas, resumosGrupo })
}

// PUT — só o dono grava a lista inteira (criar/editar/excluir/reordenar).
export async function PUT(req: NextRequest) {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon') return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })
  const body = await req.json().catch(() => null)
  if (!Array.isArray(body?.corridas)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const { error } = await gravar(sess.salaoId, body.corridas)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  registrarAuditoria('Editou', 'Corridas Internas', `${body.corridas.length} corrida(s)`)
  return NextResponse.json({ ok: true })
}
