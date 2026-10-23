// Vigia da confirmação que ficou só no CRM.
//
// "Definir status > Confirmou" muda a etiqueta e mais nada: não marca o
// agendamento no sistema de agenda. Quando a automação falha (22/10/2026: 42
// falhas num dia) a recepção clica "Confirmou" para limpar a fila, e a agenda
// do dia seguinte fica sem nenhuma marcação de confirmado.
//
// Este vigia roda dentro do /api/cron/saude (de minuto em minuto, via script do
// servidor) e faz sozinho o que o botão "Confirmar no sistema agora" faz à mão:
// põe o pedido na MESMA fila da automação. Com cuidados, porque age sem ninguém:
//   - nunca manda mensagem à cliente (`sem_combinado`): só a marcação;
//   - só conversa em "Confirmou" cuja confirmação mais recente foi de GENTE;
//   - só agendamento de hoje em diante, que ainda esteja "Agendado" no último
//     relatório, e com horário que ainda não passou;
//   - só das 08:00 às 20:30, no máximo 3 por rodada e nunca com a fila cheia;
//   - cada conversa só é pedida de novo depois de 6 h.
// Falhou 3 vezes, a automação já devolve a conversa para "Preciso agir".
import { supabaseAdmin } from '@/lib/supabase'
import { carregarConfig, carregarFila, enfileirar, dataNoTexto } from '@/lib/crmConfirmacao'
import { datasDoSalao, horaAgora } from '@/lib/crmCampanhas'

const AUTOMATICO = 'Confirmação automática'
const AUTOR = 'Vigia'
const POR_RODADA = 3
const FILA_MAXIMA = 5

const ultimos8 = (s: any) => String(s || '').replace(/\D+/g, '').slice(-8)
const brParaIso = (br: string) => br.split('/').reverse().join('-')

export async function confirmarPendentesDoCrm(salaoId: string): Promise<number> {
  const hora = horaAgora()
  if (hora < '08:00' || hora > '20:30') return 0
  const conf = await carregarConfig(salaoId)
  if (!conf.ligada) return 0
  const fila = await carregarFila(salaoId)
  if (fila.length >= FILA_MAXIMA) return 0

  const agoraMs = Date.now()
  const { hoje } = datasDoSalao()
  const desde48 = new Date(agoraMs - 48 * 3600e3).toISOString()

  const { data: convs } = await supabaseAdmin.from('crm_conversas').select('id, contato_id')
    .eq('salao_id', salaoId).eq('estado', 'confirmado').or('origem.is.null,origem.neq.resumo_dono')
    .gte('atualizado_em', desde48).order('atualizado_em', { ascending: false }).limit(80)
  if (!convs?.length) return 0
  const ids = convs.map((c: any) => c.id)

  // A confirmação mais recente de cada conversa, e os pedidos que este vigia já fez.
  const { data: eventos } = await supabaseAdmin.from('crm_eventos')
    .select('conversa_id, autor_nome, criado_em, tipo, para_estado')
    .in('conversa_id', ids).gte('criado_em', desde48).order('criado_em', { ascending: false }).limit(1500)
  const ultima = new Map<string, { autor: string; em: number }>()
  const pedidoEm = new Map<string, number>()
  for (const e of eventos || []) {
    const em = new Date((e as any).criado_em).getTime()
    if ((e as any).autor_nome === AUTOR && !pedidoEm.has((e as any).conversa_id)) pedidoEm.set((e as any).conversa_id, em)
    if ((e as any).para_estado === 'confirmado' && ['fechou', 'mudou_estado'].includes((e as any).tipo) && !ultima.has((e as any).conversa_id)) {
      ultima.set((e as any).conversa_id, { autor: String((e as any).autor_nome || ''), em })
    }
  }
  // Candidatas: a última confirmação foi de gente (nem da automação, nem deste vigia há menos de 6 h).
  const candidatas = convs.filter((c: any) => {
    const u = ultima.get(c.id)
    if (!u || u.autor === AUTOMATICO) return false
    const p = pedidoEm.get(c.id)
    return !(p && agoraMs - p < 6 * 3600e3)
  })
  if (!candidatas.length) return 0

  const jaNaFila = new Set(fila.map(p => p.conversa_id))
  const idsC = candidatas.map((c: any) => c.id)
  const [{ data: msgs }, { data: contatos }] = await Promise.all([
    supabaseAdmin.from('crm_mensagens').select('conversa_id, texto, criado_em')
      .in('conversa_id', idsC).eq('direcao', 'saida').order('criado_em', { ascending: false }).limit(600),
    supabaseAdmin.from('crm_contatos').select('id, telefone, nome, cliente_nome').in('id', candidatas.map((c: any) => c.contato_id)),
  ])
  const textoDaData = new Map<string, string>()
  for (const m of msgs || []) {
    const id = (m as any).conversa_id
    if (!textoDaData.has(id) && dataNoTexto(String((m as any).texto || ''))) textoDaData.set(id, String((m as any).texto))
  }
  const contatoPor = new Map((contatos || []).map((t: any) => [t.id, t]))

  // O que o último relatório diz de cada dia (um mês de cada vez).
  const datas = [...new Set(candidatas.map((c: any) => dataNoTexto(textoDaData.get(c.id) || '')).filter(d => d && brParaIso(d) >= hoje.iso))]
  if (!datas.length) return 0
  const meses = [...new Set(datas.map(d => d.slice(3)))]            // 'mm/aaaa'
  const linhas: any[] = []
  for (const mm of meses) {
    const [mes, ano] = mm.split('/').map(Number)
    const { data } = await supabaseAdmin.from('agendamentos_raw').select('data_reserva, hora, celular, status')
      .eq('salao_id', salaoId).eq('ano', ano).eq('mes', mes).in('data_reserva', datas.filter(d => d.slice(3) === mm)).limit(3000)
    linhas.push(...(data || []))
  }

  let pedidas = 0
  for (const c of candidatas) {
    if (pedidas >= POR_RODADA || fila.length + pedidas >= FILA_MAXIMA) break
    if (jaNaFila.has(c.id)) continue
    const texto = textoDaData.get(c.id) || ''
    const data = dataNoTexto(texto)
    const ct: any = contatoPor.get(c.contato_id)
    if (!data || brParaIso(data) < hoje.iso || !ct?.telefone) continue
    // Ainda "Agendado" no relatório, e com horário que não passou.
    const f8 = ultimos8(ct.telefone)
    const aindaAgendado = linhas.some(l => l.data_reserva === data && ultimos8(l.celular) === f8 && String(l.status).toUpperCase() === 'AGENDADO'
      && (data !== hoje.br || String(l.hora || '') > horaMaisMinutos(10)))
    if (!aindaAgendado) continue
    const entrou = await enfileirar(salaoId, {
      conversa_id: c.id, contato_id: c.contato_id, telefone: ct.telefone,
      nome: ct.cliente_nome || ct.nome || '', data, sem_combinado: true,
    })
    if (!entrou) continue
    await supabaseAdmin.from('crm_eventos').insert({
      salao_id: salaoId, conversa_id: c.id, tipo: 'mudou_estado', de_estado: 'confirmado', para_estado: 'confirmado',
      autor_nome: AUTOR, detalhe: 'Confirmação no sistema pedida automaticamente (só havia o clique no CRM)',
    })
    pedidas++
  }
  return pedidas
}

/** 'HH:MM' daqui a N minutos, no fuso do salão. */
function horaMaisMinutos(n: number): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(new Date(Date.now() + n * 60_000))
}

/** Roda o vigia em cada salão que tem a automação no servidor. A cada 3 minutos basta. */
export async function varrerConfirmacoesPendentes(): Promise<number> {
  if (new Date().getMinutes() % 3 !== 0) return 0
  const { data } = await supabaseAdmin.from('salao_config').select('salao_id, valor').eq('chave', 'crm_robo_avec')
  let total = 0
  for (const r of data || []) {
    if (!(r.valor as any)?.no_servidor) continue
    try { total += await confirmarPendentesDoCrm(r.salao_id) } catch { /* o vigia nunca derruba o relógio */ }
  }
  return total
}
