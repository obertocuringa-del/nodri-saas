import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { lerAgenda, carregarAgenda, gravarAgenda, CHAVE_AGENDA } from '@/lib/roboRelatorio'

export const dynamic = 'force-dynamic'

// ── Coleta de um mês escolhido (painel master > Robô do relatório) ──────────
//
// O robô sempre coletou "o mês de hoje". Isso tem um buraco no ÚLTIMO DIA do
// mês: se as últimas coletas do dia não acontecerem e ninguém perceber antes
// da meia-noite, aquele dia fica pela metade para sempre -- a partir do dia 01
// o robô já só enxerga o mês novo.
//
// Não é hipótese. Em 30/09/2026 a última coleta de setembro foi às 20:00 e o
// salão fechou às 22:00: as comandas dessas duas horas não existem no NODRI.
// Em 31/08/2026 foi igual.
//
//   GET  -> para cada salão, os últimos meses e o que a hora da última coleta
//           diz sobre eles. Só leitura, não mexe em nada.
//   POST -> pede a coleta de um mês ('MM/AAAA'). O robô tem fila própria: se
//           vários salões forem pedidos, eles rodam um atrás do outro.
//
// O risco de recoletar um mês fechado é trocar um mês bom por um pior, e isso
// já tem guarda em roboRelatorio.conferir(): coleta que vem com MENOS
// atendimentos do que o sistema já tem, com faturamento 5% abaixo, ou com dias
// que tinham movimento vindo vazios, NÃO é aplicada -- fica em "aguardando" a
// aprovação do dono. Mês que já passou não encolhe.

async function master() {
  const token = cookies().get('nodri_token')?.value
  const p = token ? await verifyJWT(token) : null
  return p && p.role === 'master' ? p : null
}

const SP = 'America/Sao_Paulo'
const agoraSP = () => new Date(new Date().toLocaleString('en-US', { timeZone: SP }))
const hhmm = (iso: string) => new Intl.DateTimeFormat('pt-BR', {
  timeZone: SP, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(iso))
const ddmm = (iso: string) => new Intl.DateTimeFormat('pt-BR', {
  timeZone: SP, day: '2-digit', month: '2-digit',
}).format(new Date(iso))
/** Dia do mês (1-31) de um instante, no fuso do salão. */
const diaDoMes = (iso: string) => Number(new Intl.DateTimeFormat('en-CA', {
  timeZone: SP, day: '2-digit',
}).format(new Date(iso)))
/** 'AAAA-MM-DD' de um instante, no fuso do salão -- dá para comparar como texto. */
const diaISO = (iso: string) => new Intl.DateTimeFormat('en-CA', {
  timeZone: SP, year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(iso))

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export interface MesDoSalao {
  ano: number
  mes: number
  rotulo: string            // 'setembro/2026'
  linhas: number            // o que existe hoje no NODRI
  ultima_coleta: string | null   // '30/09 às 20:00'
  /** 'ok' | 'furado' | 'sem_coleta' | 'corrente' */
  situacao: string
  aviso: string | null
}

/**
 * O que a hora da última coleta diz sobre um mês FECHADO.
 *
 * O sinal é honesto e não depende de adivinhar se "veio pouca coisa": se a
 * última coleta do mês aconteceu antes do fim do expediente do último dia,
 * então as comandas fechadas depois dela não entraram. É aritmética, não
 * estimativa.
 *
 * O "fim do expediente" é o maior horário que o próprio dono configurou para o
 * robô naquele salão -- é ele quem sabe a que horas o salão fecha.
 */
function avaliar(
  ano: number, mes: number, ehCorrente: boolean,
  ultima: { inicio: string } | null, ultimoHorario: string | null, linhas: number,
): { situacao: string; aviso: string | null } {
  if (ehCorrente) return { situacao: 'corrente', aviso: null }
  if (!ultima) {
    // ── Sem registro não é o mesmo que sem dado ────────────────────────────
    //
    // O robô do servidor só começou a registrar coletas em 26/09/2026, e
    // agosto foi consertado à mão pela tela de importar. Esses meses existem,
    // estão cheios, e não têm linha nenhuma em `robo_coletas` -- pintar de
    // vermelho seria alarme falso, e vermelho que não é problema deixa de ser
    // aviso. Vazio de verdade é outra coisa: aí sim falta tudo.
    return linhas > 0
      ? { situacao: 'sem_registro', aviso: 'Importado à mão ou antes do robô do servidor: daqui não dá para conferir se está completo.' }
      : { situacao: 'sem_coleta', aviso: 'Não há nenhum atendimento deste mês no sistema.' }
  }

  const ultimoDia = new Date(ano, mes, 0).getDate()
  const fimDoMes = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

  // ── Coleta DEPOIS do mês fechado é o melhor caso, não o pior ─────────────
  //
  // A primeira versão só perguntava "a última coleta foi no último dia?". Uma
  // recoleta feita no mês seguinte (que é exatamente o que este painel manda
  // fazer) caía no "não foi no último dia" e era marcada como incompleta --
  // logo depois de ter sido consertada. Foi o que a tela mostrou em 02/10,
  // minutos depois de setembro voltar ao normal.
  //
  // Quem coleta com o mês já encerrado pega o mês inteiro: não há mais nada
  // para entrar depois.
  if (diaISO(ultima.inicio) > fimDoMes) return { situacao: 'ok', aviso: null }

  if (diaDoMes(ultima.inicio) !== ultimoDia) {
    return {
      situacao: 'furado',
      aviso: `A última coleta foi em ${ddmm(ultima.inicio)}, antes do fim do mês (dia ${ultimoDia}).`,
    }
  }
  if (ultimoHorario && hhmm(ultima.inicio) < ultimoHorario) {
    return {
      situacao: 'furado',
      aviso: `A última coleta foi às ${hhmm(ultima.inicio)} do dia ${ultimoDia}, e o robô ia até as ${ultimoHorario}: o que fechou depois disso não entrou.`,
    }
  }
  return { situacao: 'ok', aviso: null }
}

export async function GET() {
  if (!(await master())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const hoje = agoraSP()
  // Seis meses para trás, que é o quanto vale olhar: mais velho que isso o
  // Avec já não é fonte confiável e ninguém vai recoletar mesmo.
  const janela: { ano: number; mes: number }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    janela.push({ ano: d.getFullYear(), mes: d.getMonth() + 1 })
  }
  const maisAntigo = janela[janela.length - 1]

  const [{ data: saloes }, { data: agendas }, { data: coletas }, { data: esperando }] = await Promise.all([
    supabaseAdmin.from('saloes').select('id, nome, is_modelo'),
    supabaseAdmin.from('salao_config').select('salao_id, valor').eq('chave', CHAVE_AGENDA),
    supabaseAdmin.from('robo_coletas').select('salao_id, ano, mes, inicio, situacao')
      .eq('situacao', 'aplicado')
      .gte('inicio', new Date(maisAntigo.ano, maisAntigo.mes - 1, 1).toISOString())
      .order('inicio', { ascending: true }),
    // Coleta que a conferência segurou: veio pior do que o que já existe, e o
    // sistema não aplicou. É a que o dono aprova ou descarta.
    supabaseAdmin.from('robo_coletas').select('id, salao_id, ano, mes, inicio, linhas, faturamento, anterior, motivo')
      .eq('situacao', 'aguardando').order('inicio', { ascending: false }).limit(50),
  ])

  // A última coleta aplicada de cada salão+mês.
  const ultimaDe = new Map<string, { inicio: string }>()
  for (const c of coletas || []) ultimaDe.set(`${c.salao_id}|${c.ano}|${c.mes}`, { inicio: c.inicio as string })

  const agendaDe = new Map((agendas || []).map((a: any) => [a.salao_id, lerAgenda(a.valor)]))
  const comRobo = (saloes || []).filter((s: any) => !s.is_modelo && agendaDe.has(s.id))

  // ── Quantos atendimentos cada mês tem, contados NO BANCO ──────────────────
  //
  // A primeira versão disto trazia `atendimentos_raw` inteira e contava aqui.
  // A tabela tem 131 mil linhas e o PostgREST entrega no máximo MIL, calado:
  // a tela mostrou "0 atendimento(s)" em todo mês recente, porque as mil que
  // vieram eram de meses antigos. Nenhum erro, nenhum aviso -- é a armadilha
  // de sempre do Supabase.
  //
  // `head: true` conta no banco e não traz linha nenhuma. São poucos salões
  // vezes seis meses, tudo em paralelo e por índice.
  const linhasDe = new Map<string, number>()
  await Promise.all(comRobo.flatMap((s: any) => janela.map(async ({ ano, mes }) => {
    const { count } = await supabaseAdmin.from('atendimentos_raw')
      .select('id', { count: 'exact', head: true })
      .eq('salao_id', s.id).eq('ano', ano).eq('mes', mes)
    linhasDe.set(`${s.id}|${ano}|${mes}`, count || 0)
  })))
  const lista = comRobo
    .map((s: any) => {
      const ag = agendaDe.get(s.id)!
      const ultimoHorario = ag.horarios.length ? ag.horarios[ag.horarios.length - 1] : null
      const meses: MesDoSalao[] = janela.map(({ ano, mes }) => {
        const k = `${s.id}|${ano}|${mes}`
        const u = ultimaDe.get(k) || null
        const ehCorrente = ano === hoje.getFullYear() && mes === hoje.getMonth() + 1
        const linhas = linhasDe.get(k) || 0
        const { situacao, aviso } = avaliar(ano, mes, ehCorrente, u, ultimoHorario, linhas)
        return {
          ano, mes, rotulo: `${MESES[mes - 1]}/${ano}`,
          linhas,
          ultima_coleta: u ? `${ddmm(u.inicio)} às ${hhmm(u.inicio)}` : null,
          situacao, aviso,
        }
      })
      return {
        salao_id: s.id, nome: s.nome,
        ultimo_horario: ultimoHorario,
        // Já pedido e ainda não começou: a tela mostra "na fila" em vez de
        // oferecer o botão de novo.
        pedido: ag.rodar_agora_em ? (ag.rodar_mes || 'mês atual') : null,
        pedido_as: ag.rodar_agora_em ? (ag.rodar_as || null) : null,
        // As que a conferência segurou, para o dono aprovar ou mandar de novo.
        aprovar: (esperando || [])
          .filter((c: any) => c.salao_id === s.id)
          .map((c: any) => ({
            id: c.id, ano: c.ano, mes: c.mes, rotulo: `${MESES[(c.mes || 1) - 1]}/${c.ano}`,
            quando: `${ddmm(c.inicio)} às ${hhmm(c.inicio)}`,
            linhas: c.linhas, antes: (c.anterior as any)?.linhas ?? null,
            motivo: String(c.motivo || '').slice(0, 400),
          })),
        meses,
      }
    })

  const comProblema = lista.filter(s =>
    s.aprovar.length || s.meses.some(m => m.situacao === 'furado' || m.situacao === 'sem_coleta'))

  return NextResponse.json({
    saloes: lista,
    // O que o cartão da Central precisa para ficar vermelho sem ter opinião
    // própria sobre o assunto.
    resumo: {
      saloes_com_problema: comProblema.length,
      esperando_aprovacao: (esperando || []).length,
      nomes: comProblema.map(s => s.nome).slice(0, 6),
    },
  })
}

export async function POST(req: NextRequest) {
  if (!(await master())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const salaoId = String(b?.salao_id || '')
  const mes = String(b?.mes || '').trim()   // 'MM/AAAA'
  const as = String(b?.as || '').trim()     // 'HH:MM' ou vazio (= agora)
  if (!salaoId) return NextResponse.json({ error: 'Salão não informado' }, { status: 400 })
  if (!/^\d{2}\/\d{4}$/.test(mes)) return NextResponse.json({ error: 'Mês inválido (use MM/AAAA)' }, { status: 400 })
  if (as && !/^\d{2}:\d{2}$/.test(as)) return NextResponse.json({ error: 'Horário inválido (use HH:MM)' }, { status: 400 })

  const [mm, aaaa] = mes.split('/').map(Number)
  if (mm < 1 || mm > 12) return NextResponse.json({ error: 'Mês inválido' }, { status: 400 })
  const hoje = agoraSP()
  const futuro = aaaa > hoje.getFullYear() || (aaaa === hoje.getFullYear() && mm > hoje.getMonth() + 1)
  if (futuro) return NextResponse.json({ error: 'Esse mês ainda não aconteceu' }, { status: 400 })

  // Um pedido por salão de cada vez. O robô tem fila própria (um salão por
  // vez), então vários salões pedidos juntos rodam em sequência sozinhos --
  // mas o mesmo salão não pode ter dois pedidos brigando pelo mesmo Chrome.
  const ag = await carregarAgenda(salaoId)
  if (ag.rodar_agora_em) {
    return NextResponse.json({ error: 'Este salão já tem uma coleta pedida; espere ela começar.' }, { status: 409 })
  }
  await gravarAgenda(salaoId, { ...ag, rodar_agora_em: new Date().toISOString(), rodar_mes: mes, rodar_as: as || null })
  return NextResponse.json({ ok: true, mes, as: as || null })
}
