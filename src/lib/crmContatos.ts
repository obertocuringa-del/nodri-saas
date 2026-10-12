// ── Contato do CRM: achar pelo celular, em qualquer grafia ──────────────────
//
// Vivia dentro da rota da ponte. Saiu de lá porque a automação de feedback
// (relatório do Avec → mensagem) precisa achar ou criar o mesmo contato pelo
// mesmo critério -- e route.ts do Next só pode exportar handler HTTP.

import { supabaseAdmin } from '@/lib/supabase'
import { normalizarTelefone, chaveTelefone } from '@/lib/crm'

/**
 * As formas em que o mesmo celular pode estar gravado: com 55 e sem, com o
 * nono dígito e sem. Procurar uma só é procurar errado -- e o banco não sabe
 * comparar "ignorando o nono dígito" sozinho.
 */
export function grafiasDoTelefone(telefone: string): string[] {
  const d = String(telefone || '').replace(/\D+/g, '')
  if (d.length < 10) return [telefone]
  const sem55 = d.startsWith('55') ? d.slice(2) : d
  const fora = new Set<string>([sem55, '55' + sem55, telefone])
  if (sem55.length === 11 && sem55[2] === '9') {
    const curto = sem55.slice(0, 2) + sem55.slice(3)
    fora.add(curto); fora.add('55' + curto)
  }
  if (sem55.length === 10) {
    const longo = sem55.slice(0, 2) + '9' + sem55.slice(2)
    fora.add(longo); fora.add('55' + longo)
  }
  return [...fora]
}

/**
 * Acha o contato, ou cria. É aqui que a cliente deixa de duplicar.
 *
 * Identidade pode vir de dois jeitos: o TELEFONE, quando o WhatsApp entrega, e
 * o LID -- o id anônimo que as contas novas usam e que vem SEM telefone no
 * histórico. Exigir telefone significaria não importar nada nessas contas, que
 * são a maioria dos salões novos.
 *
 * Quando os dois chegam juntos, o telefone preenche o contato que existia só
 * com o LID -- é assim que a cliente que veio do histórico se liga ao número
 * assim que manda a primeira mensagem ao vivo.
 */
export async function acharOuCriarContato(
  salaoId: string, telefoneBruto: string, nomeAgenda?: string, lid?: string | null,
) {
  const telefone = normalizarTelefone(telefoneBruto)
  const lidLimpo = String(lid || '').trim() || null
  if (!telefone && !lidLimpo) return null

  // ── Procurar no BANCO, não na memória ─────────────────────────────────────
  //
  // Aqui havia um `.select('*')` sem limite, trazendo a agenda inteira para
  // comparar em JavaScript. O PostgREST corta em 1000 linhas e não avisa: do
  // contato 1001 em diante, ninguém era encontrado. A ponte então tentava
  // CRIAR quem já existia e o banco respondia
  // `duplicate key ... idx_crm_contato_lid` -- e a leva inteira de 20 conversas
  // do histórico morria junto. Medido em 12/09/2026, na reconexão: lote após
  // lote com "0 novas".
  //
  // Agora a busca é direta, por índice, e não tem teto.
  let achado: any = null

  if (telefone) {
    // O mesmo celular está gravado de várias formas -- com 55, sem 55, com e
    // sem o nono dígito. Procurar uma só é procurar errado.
    const { data } = await supabaseAdmin
      .from('crm_contatos').select('*')
      .eq('salao_id', salaoId).in('telefone', grafiasDoTelefone(telefone)).limit(10)
    const alvo = chaveTelefone(telefone)
    achado = (data || []).find((c: any) => c.telefone && chaveTelefone(c.telefone) === alvo) || null
  }

  // ── A mesma pessoa em duas fichas ─────────────────────────────────────────
  //
  // Acontece assim: a cliente veio do histórico só com o LID (uma ficha), a
  // campanha de confirmação a encontrou pelo telefone do relatório e criou
  // outra (segunda ficha). Quando ela escreve ao vivo, a mensagem traz os dois
  // -- telefone e LID -- e é a única hora em que dá para saber que são a
  // mesma pessoa. Então as duas viram uma: as conversas da ficha do LID vão
  // para a ficha do telefone, o que faltava numa é copiado da outra, e a
  // ficha do LID some. Sem isto a recepção via duas "Maria" na lista, cada
  // uma com metade da conversa.
  let pelaLid: any = null
  if (lidLimpo) {
    const { data } = await supabaseAdmin
      .from('crm_contatos').select('*')
      .eq('salao_id', salaoId).eq('lid', lidLimpo).limit(1)
    pelaLid = (data || [])[0] || null
  }
  if (achado && pelaLid && pelaLid.id !== achado.id) {
    await fundirContatos(salaoId, achado, pelaLid)
    pelaLid = null
  }
  if (!achado && pelaLid) achado = pelaLid

  if (achado) {
    // Completa o que faltava, sem sobrescrever o que já estava certo.
    const patch: any = {}
    if (telefone && !achado.telefone) {
      patch.telefone = telefone
      patch.telefone_bruto = telefoneBruto
      // O telefone chegou DEPOIS. O relógio já tinha conferido este contato
      // sem número nenhum, não achou nada e marcou "cliente nova" -- e não
      // voltaria a olhar por doze horas. Zerar a conferência manda ele
      // reavaliar na próxima volta, agora com o número na mão.
      //
      // Era o caso do Marcos: o número dele está no histórico do salão desde
      // sempre, mas quando o relógio passou o contato ainda era só um id.
      patch.conferido_em = null
    }
    if (lidLimpo && !achado.lid) patch.lid = lidLimpo
    if (nomeAgenda && !achado.nome) { patch.nome = nomeAgenda; patch.nome_agenda = nomeAgenda }
    if (Object.keys(patch).length) {
      await supabaseAdmin.from('crm_contatos').update(patch).eq('id', achado.id)
      Object.assign(achado, patch)
    }
    return achado
  }

  const { data: novo } = await supabaseAdmin.from('crm_contatos').insert({
    salao_id: salaoId,
    telefone: telefone || null,
    telefone_bruto: telefone ? telefoneBruto : null,
    lid: lidLimpo,
    nome: nomeAgenda || null,
    nome_agenda: nomeAgenda || null,
  }).select().maybeSingle()
  return novo
}


/**
 * Funde a ficha `apagar` na ficha `manter`. Conversas mudam de dono; nome,
 * observação, etiquetas e vínculo com o sistema são copiados quando `manter`
 * não tem; a ficha `apagar` é excluída. Nunca perde mensagem: mensagem
 * pertence à conversa, e a conversa só troca de ficha.
 */
/**
 * Uma conversa ABERTA por contato, e só uma.
 *
 * Junta as abertas que sobraram num contato: as mensagens e os eventos vão
 * para a que fica, e a casca vazia é apagada. Nada se perde — mensagem e
 * evento são CASCATA, então mover vem SEMPRE antes de apagar.
 *
 * Quem fica, na ordem (regra do dono, 12/10/2026):
 *   1. a que está numa pasta de PROFISSIONAIS, que segura a conversa;
 *   2. senão, a de atividade mais recente.
 * A conversa anda de pasta em pasta; ela não se duplica para mudar de lugar.
 *
 * CONVERSA DECIDIDA NÃO ENTRA. Agendada, Confirmada, Desmarcou e Não fechou
 * são oportunidades fechadas, e é o acúmulo delas que faz a conta de
 * conversão parar de pé. Cliente que volta a cada 15 dias tem dezenas, e
 * isso é certo — não é duplicidade.
 */
export async function juntarConversasAbertas(salaoId: string, contatoId: string) {
  const DECIDIDAS = ['agendado', 'confirmado', 'sem_conversao', 'desmarcou']
  const { data: abertas } = await supabaseAdmin
    .from('crm_conversas').select('id, estado, ultima_em, nao_lidas')
    .eq('salao_id', salaoId).eq('contato_id', contatoId)
    .not('estado', 'in', `(${DECIDIDAS.map(e => `"${e}"`).join(',')})`)
  if (!abertas || abertas.length < 2) return

  const ehProf = (e: string) => /^extra_profissiona/.test(String(e || ''))
  const ordenadas = [...abertas].sort((a: any, b: any) => {
    const pa = ehProf(a.estado) ? 0 : 1, pb = ehProf(b.estado) ? 0 : 1
    if (pa !== pb) return pa - pb
    return String(b.ultima_em || '').localeCompare(String(a.ultima_em || ''))
  })
  const fica = ordenadas[0]
  const saem = ordenadas.slice(1).map((c: any) => c.id)

  // Mover ANTES de apagar: as duas tabelas apagam em cascata.
  await supabaseAdmin.from('crm_mensagens').update({ conversa_id: fica.id })
    .eq('salao_id', salaoId).in('conversa_id', saem)
  await supabaseAdmin.from('crm_eventos').update({ conversa_id: fica.id })
    .eq('salao_id', salaoId).in('conversa_id', saem)

  // O aviso de "não lida" das que entraram não pode sumir junto.
  const naoLidas = abertas.reduce((s: number, c: any) => s + (c.nao_lidas || 0), 0)
  const { data: ult } = await supabaseAdmin
    .from('crm_mensagens').select('criado_em, direcao, texto')
    .eq('conversa_id', fica.id).order('criado_em', { ascending: false }).limit(1)
  const u: any = ult?.[0]
  await supabaseAdmin.from('crm_conversas').update({
    nao_lidas: naoLidas,
    ...(u ? {
      ultima_em: u.criado_em,
      ultima_de: u.direcao === 'entrada' ? 'cliente' : 'salao',
      ultima_previa: String(u.texto || '').slice(0, 120),
    } : {}),
    atualizado_em: new Date().toISOString(),
  }).eq('id', fica.id)

  await supabaseAdmin.from('crm_conversas').delete().eq('salao_id', salaoId).in('id', saem)
}

export async function fundirContatos(salaoId: string, manter: any, apagar: any) {
  if (!manter?.id || !apagar?.id || manter.id === apagar.id) return
  const patch: any = {}
  if (!manter.lid && apagar.lid) patch.lid = apagar.lid
  if (!manter.nome && apagar.nome) patch.nome = apagar.nome
  if (!manter.nome_agenda && apagar.nome_agenda) patch.nome_agenda = apagar.nome_agenda
  if (!manter.cliente_nome && apagar.cliente_nome) patch.cliente_nome = apagar.cliente_nome
  if (!manter.observacao && apagar.observacao) patch.observacao = apagar.observacao
  if ((!Array.isArray(manter.etiquetas) || !manter.etiquetas.length)
      && Array.isArray(apagar.etiquetas) && apagar.etiquetas.length) patch.etiquetas = apagar.etiquetas

  await supabaseAdmin.from('crm_conversas')
    .update({ contato_id: manter.id }).eq('salao_id', salaoId).eq('contato_id', apagar.id)
  // Mover nao basta: a ficha que fica termina com a conversa DELA mais a da
  // ficha que saiu, e a cliente aparece duas vezes na fila. Era esta a
  // fabrica de duplicidade -- em 12/10/2026 o Rouge tinha 14 contatos com
  // duas conversas ABERTAS, e 5 deles vinham exatamente daqui.
  await juntarConversasAbertas(salaoId, manter.id)
  // O LID tem índice único: sai da ficha velha antes de entrar na nova.
  await supabaseAdmin.from('crm_contatos').delete().eq('id', apagar.id).eq('salao_id', salaoId)
  if (Object.keys(patch).length) {
    await supabaseAdmin.from('crm_contatos').update(patch).eq('id', manter.id)
    Object.assign(manter, patch)
  }
}
