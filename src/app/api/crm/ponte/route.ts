import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizarTelefone, chaveTelefone, proximaAcaoPadrao, tipoDaMensagemDoSalao, ESTADO_DO_TIPO, PASSIVAS_DO_DISPARO, ESTADOS_DECIDIDOS, estadoPelaUltimaMensagem, ehSoAgradecimento, estadoPor } from '@/lib/crm'
import { baterRelogio } from '@/lib/crmRelogio'
import { nomeNaMensagem } from '@/lib/crmNomes'
import { paginar } from '@/lib/paginar'
import { ehEstadoDoSalao } from '@/lib/crmEstados'
import { carregarConfig as cfgConfirmacao, ehConfirmacao, enfileirar } from '@/lib/crmConfirmacao'
import { datasDoSalao } from '@/lib/crmCampanhas'
import { acharOuCriarContato } from '@/lib/crmContatos'
import { boasVindasSePrimeiroContato } from '@/lib/crmBoasVindas'

export const dynamic = 'force-dynamic'

// ════════════════════════════════════════════════════════════════════════════
// A PONTE — a única porta entre o WhatsApp e o NODRI
//
// O NODRI roda na Vercel, que trabalha por função efêmera: o código acorda,
// responde e morre. Isso é ótimo para uma tela e impossível para uma sessão de
// WhatsApp, que precisa de uma conexão viva 24 horas esperando mensagem.
//
// Por isso a sessão mora num serviço à parte, sempre ligado — a ponte. Ela
// não tem tela nem regra de negócio: só carrega mensagem de um lado para o
// outro. Toda a inteligência (estado, dono, prazo, SLA) fica aqui, no NODRI,
// onde pode ser corrigida sem mexer em servidor.
//
// Autenticação: cabeçalho `x-crm-chave`, comparado com CRM_PONTE_CHAVE do
// ambiente. Não usa cookie porque quem chama é serviço, não navegador.
//
// Verbos:
//   POST ?acao=entrada     mensagem que chegou da cliente
//   POST ?acao=situacao    a ponte informa conexão, QR, queda
//   POST ?acao=confirmar   a ponte avisa que enviou (ou que falhou)
//   GET  ?salao=<id>       a ponte busca o que está na fila para enviar
// ════════════════════════════════════════════════════════════════════════════

/**
 * O molde da mensagem: o que sobra depois de tirar o que muda de pessoa para
 * pessoa.
 *
 * O salão não dispara texto igual -- ele dispara o MESMO texto com o nome
 * trocado: "Olá *LUCIANA*, tudo bem?", "Olá *Thatiana*, tudo bem?". Comparar
 * letra por letra deixava a campanha inteira passar como conversa de verdade,
 * e foi o que encheu "Aguardando cliente" de disparo.
 *
 * Some daqui: o que está entre asteriscos (é assim que o salão marca o nome),
 * qualquer palavra TODA EM MAIÚSCULAS, e número. Sobra o esqueleto da frase.
 */
function moldeDaMensagem(t: string): string {
  return String(t || '')
    .replace(/\*[^*]{1,40}\*/g, ' ')
    .replace(/\b[A-ZÀ-ÜÇ]{3,}\b/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function autorizado(req: NextRequest): boolean {
  const esperada = process.env.CRM_PONTE_CHAVE || ''
  if (!esperada) return false          // sem chave configurada, a porta fica fechada
  return req.headers.get('x-crm-chave') === esperada
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const acao = new URL(req.url).searchParams.get('acao') || 'entrada'
  const body = await req.json().catch(() => ({}))

  // ── O relógio ─────────────────────────────────────────────────────────────
  // Vem sem salão: a ponte bate o relógio de todo mundo de uma vez. Roda aqui
  // porque a ponte é o único pedaço que fica ligado o tempo todo — a Vercel
  // acorda, responde e morre, e um relógio que só anda quando alguém abre a
  // tela não é relógio.
  if (acao === 'relogio') {
    const { data: canais } = await supabaseAdmin
      .from('crm_canais').select('salao_id').neq('situacao', 'desconectado')
    const feito: Record<string, any> = {}
    for (const c of canais || []) {
      try { feito[c.salao_id] = await baterRelogio(c.salao_id) }
      catch (e: any) { feito[c.salao_id] = { erro: String(e?.message || e).slice(0, 200) } }
    }
    return NextResponse.json({ ok: true, saloes: feito })
  }

  const salaoId = String(body?.salao_id || '')
  if (!salaoId) return NextResponse.json({ error: 'salao_id é obrigatório' }, { status: 400 })

  // ── Onde a ponte guarda a foto que a cliente mandou ───────────────────────
  //
  // O NODRI devolve uma URL assinada e a ponte sobe o arquivo DIRETO para o
  // storage. Dois motivos, os dois importantes:
  //
  // 1. a Vercel corta requisicao acima de ~4,5 MB antes de o codigo rodar, e
  //    video de cliente estoura isso sem esforco;
  // 2. a ponte roda no computador do salao. Ela nunca recebe a chave de
  //    servico do banco -- so uma autorizacao pontual, para um caminho, que
  //    vence sozinha.
  if (acao === 'midia-url') {
    const bruto = String(body?.nome || 'arquivo')
    const safe = bruto.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-80)
    const caminho = `crm/${salaoId}/${Date.now()}_${safe}`

    const assinar = () => supabaseAdmin.storage.from('uploads').createSignedUploadUrl(caminho)
    let { data, error } = await assinar()
    if (error && /bucket not found/i.test(error.message || '')) {
      await supabaseAdmin.storage.createBucket('uploads', { public: true, fileSizeLimit: 52428800 }).catch(() => {})
      ;({ data, error } = await assinar())
    }
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Falhou' }, { status: 500 })
    }
    const { data: { publicUrl } } = supabaseAdmin.storage.from('uploads').getPublicUrl(caminho)
    return NextResponse.json({ signedUrl: data.signedUrl, publicUrl })
  }

  const agora = new Date().toISOString()

  // ── A ponte informa como está a conexão ───────────────────────────────────
  if (acao === 'situacao') {
    const patch: any = { visto_em: agora, atualizado_em: agora }
    if (body?.situacao) patch.situacao = String(body.situacao)
    if (body?.qr !== undefined) {
      patch.qr = body.qr || null
      // QR do WhatsApp vira em torno de um minuto; guardar o prazo evita a
      // tela mostrar um código morto e a pessoa achar que a leitura falhou.
      patch.qr_expira_em = body.qr ? new Date(Date.now() + 60000).toISOString() : null
    }
    if (body?.numero !== undefined) patch.numero = body.numero || null
    if (body?.nome_exibicao !== undefined) patch.nome_exibicao = body.nome_exibicao || null
    if (body?.erro !== undefined) patch.erro = body.erro || null
    if (body?.sessao !== undefined) patch.sessao = body.sessao || null

    const { data: existe } = await supabaseAdmin
      .from('crm_canais').select('id, situacao, visto_em').eq('salao_id', salaoId).maybeSingle()

    // ── O buraco que ninguém via ─────────────────────────────────────────────
    //
    // Em 12/09/2026 o WhatsApp derrubou a sessão às 09:17 e só voltou às
    // 13:15. Quatro horas em que toda mensagem de cliente foi só para o
    // celular -- e a tela não disse nada. O salão olhava a fila, via tudo
    // normal, e não tinha como saber que existia um buraco.
    //
    // O CRM não consegue buscar essas mensagens depois: para o WhatsApp, um
    // aparelho desconectado deixou de existir, e ao escanear de novo ele é um
    // aparelho novo. O que dá para fazer é PARAR DE FICAR CALADO.
    //
    // Vai para salao_config e não para uma coluna nova de propósito: mudança
    // de esquema neste banco exige SQL colado na mão no Supabase, e um aviso
    // útil não pode ficar esperando por isso.
    const JANELA_MINIMA_MIN = 10
    if (existe && patch.situacao === 'conectado' && existe.situacao !== 'conectado' && existe.visto_em) {
      const de = new Date(existe.visto_em)
      const minutos = Math.round((Date.now() - de.getTime()) / 60000)
      if (minutos >= JANELA_MINIMA_MIN) {
        await supabaseAdmin.from('salao_config').upsert({
          salao_id: salaoId,
          chave: 'crm_fora_do_ar',
          valor: { de: existe.visto_em, ate: agora, minutos, visto: false },
          atualizado_em: agora,
        }, { onConflict: 'salao_id,chave' }).then(() => {}, () => {})
      }
    }

    if (existe) await supabaseAdmin.from('crm_canais').update(patch).eq('id', existe.id)
    else await supabaseAdmin.from('crm_canais').insert({ salao_id: salaoId, ...patch })

    return NextResponse.json({ ok: true })
  }

  // ── Cruzar por TELEFONE, que é único ──────────────────────────────────────
  //
  // O WhatsApp não diz o telefone por trás de um id anônimo -- perguntei e ele
  // recusou 60 vezes seguidas. Mas ele responde o CONTRÁRIO: dado um telefone,
  // devolve o id. Então o caminho é ir pelo outro lado -- perguntar pelos
  // números que o salão já tem no histórico de atendimento e guardar o par.
  //
  // Cruzar por nome seria mais fácil e é pior: "Marcos Damião | Personal
  // Trainer" não é "MARCOS DAMIAO", e nome erra de um jeito silencioso --
  // junta duas clientes diferentes e ninguém percebe. Telefone é único.
  if (acao === 'resolver-lids') {
    // Quem já perguntamos alguma vez não volta para a fila, nem quando a
    // resposta foi "não tem WhatsApp": perguntar de novo em massa é o
    // comportamento que faz o WhatsApp bloquear o número do salão.
    //
    // E em PÁGINAS: o `.limit(10000)` daqui devolvia 1000. Do telefone 1001 em
    // diante, o cache não era encontrado e o número voltava para a fila --
    // exatamente a pergunta repetida que este bloco existe para impedir, e
    // exatamente o que faz o WhatsApp bloquear o número do salão.
    const { dados: jaVistos } = await paginar<any>((de, ate) => supabaseAdmin
      .from('crm_lid_cache').select('telefone')
      .eq('salao_id', salaoId).order('telefone').range(de, ate), 60000)
    const vistos = new Set((jaVistos || []).map((x: any) => x.telefone))

    // ── Varredura em páginas ────────────────────────────────────────────────
    //
    // `atendimentos_raw` tem 129 mil linhas e o banco devolve no máximo MIL
    // por consulta -- eu tinha pedido 20 mil e recebido mil sem aviso, o que
    // fez o contador dizer "faltam 0" depois de trinta telefones.
    //
    // Então a varredura anda de mil em mil e guarda onde parou. Uma volta
    // completa leva pouco mais de duas horas, e depois disso só entram
    // clientes novos.
    const PAGINA = 1000
    const { data: canalV } = await supabaseAdmin
      .from('crm_canais').select('id, lid_varredura').eq('salao_id', salaoId).maybeSingle()
    const inicio = Number(canalV?.lid_varredura || 0)

    const { data: atends } = await supabaseAdmin
      .from('atendimentos_raw').select('celular')
      .eq('salao_id', salaoId).not('celular', 'is', null)
      .range(inicio, inicio + PAGINA - 1)

    const linhas = atends || []
    const dedup = new Set<string>()
    for (const a of linhas) {
      const tel = normalizarTelefone(String(a.celular || ''))
      if (!tel || tel.length < 12 || vistos.has(tel)) continue
      dedup.add(tel)
    }

    const POR_VEZ = 40
    const leva = [...dedup].slice(0, POR_VEZ)

    // A página só avança quando foi esvaziada. Antes eu avançava sempre, e
    // como cada página de mil linhas traz umas oitenta clientes distintas e eu
    // levava vinte, sessenta ficavam para trás a cada volta -- a maioria nunca
    // seria conferida.
    //
    // E ao chegar ao fim da tabela volta ao começo, senão a varredura
    // terminaria e cliente que entrar amanhã nunca mais seria conferida.
    const acabouAPagina = dedup.size <= POR_VEZ
    const proximo = !acabouAPagina ? inicio
      : linhas.length < PAGINA ? 0
      : inicio + PAGINA
    if (canalV?.id && proximo !== inicio) {
      await supabaseAdmin.from('crm_canais')
        .update({ lid_varredura: proximo }).eq('id', canalV.id)
    }

    return NextResponse.json({
      telefones: leva,
      nesta_pagina: dedup.size,
      ja_conferidos: vistos.size,
      posicao: inicio,
    })
  }

  // ── O que o WhatsApp respondeu sobre esses telefones ──────────────────────
  if (acao === 'guardar-lids') {
    const pares = Array.isArray(body?.pares) ? body.pares : []
    if (!pares.length) return NextResponse.json({ ok: true, ligados: 0 })

    const linhas = pares
      .map((p: any) => ({
        salao_id: salaoId,
        telefone: normalizarTelefone(String(p?.telefone || '')),
        lid: String(p?.lid || '').trim() || null,
      }))
      .filter((p: any) => p.telefone)
    if (linhas.length) {
      await supabaseAdmin.from('crm_lid_cache')
        .upsert(linhas, { onConflict: 'salao_id,telefone' })
    }

    // Agora o pulo do gato: o contato que só tinha id anônimo ganha o número.
    const comLid = linhas.filter((p: any) => p.lid)
    let ligados = 0
    if (comLid.length) {
      const { data: contatos } = await supabaseAdmin
        .from('crm_contatos').select('id, lid, telefone')
        .eq('salao_id', salaoId)
        .in('lid', comLid.map((p: any) => p.lid))
      for (const ct of contatos || []) {
        if (ct.telefone) continue
        const par = comLid.find((p: any) => p.lid === ct.lid)
        if (!par) continue
        await supabaseAdmin.from('crm_contatos').update({
          telefone: par.telefone,
          telefone_bruto: par.telefone,
          // Número novo pede reavaliação do relógio.
          conferido_em: null,
        }).eq('id', ct.id)
        ligados++
      }

      // ── E o caminho inverso: o contato que só tinha telefone ganha o LID ──
      //
      // DANIEL, 19/09/2026: cadastro com telefone, conta do WhatsApp por LID.
      // A ponte descobriu o LID na hora de enviar; guardando aqui, a próxima
      // mensagem já sai pelo LID sem perguntar de novo. Só quando nenhum
      // outro contato tem esse LID -- se tem, é caso de fusão, não daqui.
      const jaComLid = new Set((contatos || []).map((c: any) => c.lid))
      for (const par of comLid) {
        if (jaComLid.has(par.lid)) continue
        await supabaseAdmin.from('crm_contatos')
          .update({ lid: par.lid })
          .eq('salao_id', salaoId).eq('telefone', par.telefone).is('lid', null)
      }
    }
    return NextResponse.json({ ok: true, ligados })
  }

  // ── Quais contatos ainda estão sem telefone ───────────────────────────────
  // A ponte pergunta, para ir atrás do número no WhatsApp. Devolve só os ids,
  // nada de conversa nem mensagem.
  if (acao === 'sem-telefone') {
    const { data } = await supabaseAdmin
      .from('crm_contatos').select('lid')
      .eq('salao_id', salaoId).is('telefone', null).not('lid', 'is', null)
      .limit(60)
    return NextResponse.json({ lids: (data || []).map((c: any) => c.lid) })
  }

  // ── Nomes que o WhatsApp manda por fora das mensagens ─────────────────────
  //
  // Em conversa endereçada por LID a mensagem que o salão envia não carrega
  // nome nenhum do destinatário, e a lista fica com "Sem nome" repetido -- o
  // que impede a recepção de escolher uma conversa. Estes nomes vêm dos
  // eventos de contato do WhatsApp e são a única fonte deles nesses casos.
  //
  // Nunca sobrescreve nome que alguém do salão digitou à mão: `nome_agenda`
  // guarda o que o WhatsApp diz, `nome` só é preenchido se estiver vazio.
  if (acao === 'nomes') {
    const lista = Array.isArray(body?.contatos) ? body.contatos : []
    if (!lista.length) return NextResponse.json({ ok: true, atualizados: 0 })

    // Em páginas: acima de mil contatos o banco cortava a lista calado e o
    // nome que chegava para o contato 1001 se perdia.
    const { dados: todos } = await paginar<any>((de, ate) => supabaseAdmin
      .from('crm_contatos').select('id, telefone, lid, nome')
      .eq('salao_id', salaoId).order('id').range(de, ate), 60000)

    let atualizados = 0
    for (const c of lista) {
      const tel = normalizarTelefone(String(c?.telefone || ''))
      const lid = String(c?.lid || '').trim() || null
      const nome = String(c?.nome || '').trim()
      // Item só com telefone e lid também vale: é como a ponte devolve o
      // número que descobriu perguntando ao WhatsApp.
      if (!tel && !lid) continue
      if (!nome && !tel) continue

      const alvoChave = tel ? chaveTelefone(tel) : ''
      const achado = (todos || []).find((x: any) =>
        (lid && x.lid === lid) || (alvoChave && x.telefone && chaveTelefone(x.telefone) === alvoChave))
      if (!achado) continue

      const patch: any = {}
      if (nome) {
        patch.nome_agenda = nome
        if (!achado.nome) patch.nome = nome
      }
      // Mesmo motivo: número novo pede reavaliação do relógio.
      if (tel && !achado.telefone) {
        patch.telefone = tel
        patch.telefone_bruto = tel
        patch.conferido_em = null
      }
      if (!Object.keys(patch).length) continue
      await supabaseAdmin.from('crm_contatos').update(patch).eq('id', achado.id)
      atualizados++
    }
    return NextResponse.json({ ok: true, atualizados })
  }

  // ── O que aconteceu com o que saiu: chegou? foi lido? ─────────────────────
  //
  // "enviada" era o fim da história para o CRM, e não é: em 15/09/2026 saíram
  // 62 mensagens com um tique e boa parte nunca abriu no aparelho da cliente
  // ("Aguardando mensagem"). O WhatsApp conta o resto -- dois tiques, azul --
  // e a ponte repassa para cá. Só sobe: enviada -> entregue -> lida, nunca
  // volta, porque um aviso atrasado de "entregue" não pode apagar um "lida".
  if (acao === 'status') {
    const itens = Array.isArray(body?.itens) ? body.itens : []
    const ids = (s: string) => itens
      .filter((i: any) => i?.situacao === s && i?.id_whatsapp)
      .map((i: any) => String(i.id_whatsapp))
    const lidas = ids('lida')
    const entregues = ids('entregue')
    let mexidas = 0
    if (lidas.length) {
      const { count } = await supabaseAdmin.from('crm_mensagens')
        .update({ situacao: 'lida' }, { count: 'exact' })
        .eq('salao_id', salaoId).eq('direcao', 'saida')
        .in('id_whatsapp', lidas).in('situacao', ['enviada', 'entregue'])
      mexidas += count || 0
    }
    if (entregues.length) {
      const { count } = await supabaseAdmin.from('crm_mensagens')
        .update({ situacao: 'entregue' }, { count: 'exact' })
        .eq('salao_id', salaoId).eq('direcao', 'saida')
        .in('id_whatsapp', entregues).eq('situacao', 'enviada')
      mexidas += count || 0
    }
    return NextResponse.json({ ok: true, mexidas })
  }

  // ── Mensagem editada ──────────────────────────────────────────────────────
  //
  // A cliente manda, corrige e manda de novo. O CRM ficava com o texto velho
  // para sempre (18/09/2026): a recepção lia "amanhã às 14" quando ela já
  // tinha corrigido para 15. Troca o texto na mensagem e, se era a última, a
  // prévia da conversa também.
  if (acao === 'edicao') {
    const id = String(body?.id_whatsapp || '')
    const texto = String(body?.texto || '').trim()
    if (!id || !texto) return NextResponse.json({ ok: false })
    const { data: msg } = await supabaseAdmin
      .from('crm_mensagens').select('id, conversa_id, texto')
      .eq('salao_id', salaoId).eq('id_whatsapp', id).maybeSingle()
    if (!msg) return NextResponse.json({ ok: false, motivo: 'mensagem não encontrada' })
    await supabaseAdmin.from('crm_mensagens').update({ texto }).eq('id', msg.id)
    const { data: cv } = await supabaseAdmin
      .from('crm_conversas').select('id, ultima_previa').eq('id', msg.conversa_id).maybeSingle()
    if (cv && String(cv.ultima_previa || '') === String(msg.texto || '').slice(0, 120)) {
      await supabaseAdmin.from('crm_conversas')
        .update({ ultima_previa: texto.slice(0, 120), atualizado_em: agora }).eq('id', cv.id)
    }
    return NextResponse.json({ ok: true })
  }

  // ── A curtida (reação) ────────────────────────────────────────────────────
  //
  // No dia a dia a cliente não escreve "ok": põe um joinha na mensagem. Um
  // joinha em cima de um pedido de confirmação É a confirmação (pedido do
  // dono, 18/09/2026); em cima de qualquer outra coisa é um "vi", que não
  // precisa de ninguém. A reação entra como mensagem dela, citando a que foi
  // curtida, para a recepção ver o que ela curtiu -- mas NÃO puxa a conversa
  // para "Preciso agir": joinha não é pergunta.
  if (acao === 'reacao') {
    const alvoId = String(body?.alvo_id_whatsapp || '')
    const emoji = String(body?.emoji || '').trim()
    const idReacao = String(body?.id_whatsapp || '') || null
    if (!alvoId) return NextResponse.json({ ok: false })

    const { data: alvo } = await supabaseAdmin
      .from('crm_mensagens').select('id, conversa_id, texto, direcao, criado_em')
      .eq('salao_id', salaoId).eq('id_whatsapp', alvoId).maybeSingle()
    if (!alvo) return NextResponse.json({ ok: false, motivo: 'mensagem curtida não encontrada' })

    // ── O coração do salão em cima da mensagem da cliente = tratada ────────
    //
    // Conferência de 19/09/2026: em 12 das 17 conversas de "Preciso agir" a
    // recepção já tinha respondido -- com um ❤️ no celular, em cima do
    // "obrigada" da cliente. O CRM não via a reação do salão e a conversa
    // ficava presa na fila. Agora vale como resposta digitada no celular: a
    // bola passa para a cliente ("Aguardando"). Só quando a curtida é na
    // ÚLTIMA fala dela -- coração numa mensagem antiga não apaga o pedido
    // que veio depois. Tirar a curtida não mexe em nada.
    if (body?.direcao === 'saida') {
      if (!emoji || alvo.direcao !== 'entrada') return NextResponse.json({ ok: true, ignorada: 'do salão' })
      const { data: cv } = await supabaseAdmin
        .from('crm_conversas').select('id, estado, aguardando_desde').eq('id', alvo.conversa_id).maybeSingle()
      if (!cv || cv.estado !== 'acao_necessaria') return NextResponse.json({ ok: true, ignorada: 'do salão' })
      const { data: depois } = await supabaseAdmin
        .from('crm_mensagens').select('id')
        .eq('conversa_id', cv.id).eq('direcao', 'entrada').gt('criado_em', alvo.criado_em).limit(1)
      if (depois?.length) return NextResponse.json({ ok: true, ignorada: 'curtiu mensagem antiga' })
      await supabaseAdmin.from('crm_conversas').update({
        estado: 'aguardando',
        proxima_acao: proximaAcaoPadrao('aguardando'),
        aguardando_desde: null,
        nao_lidas: 0,
        atualizado_em: agora,
      }).eq('id', cv.id)
      await supabaseAdmin.from('crm_eventos').insert({
        salao_id: salaoId, conversa_id: cv.id, tipo: 'mudou_estado',
        de_estado: 'acao_necessaria', para_estado: 'aguardando',
        autor_nome: 'Salão (pelo celular)',
        detalhe: `Reagiu com ${emoji} à última mensagem da cliente`,
      })
      return NextResponse.json({ ok: true, tratada: true })
    }

    // Tirou a curtida: some a linha que a registrava.
    if (!emoji) {
      if (idReacao) await supabaseAdmin.from('crm_mensagens').delete()
        .eq('salao_id', salaoId).eq('id_whatsapp', idReacao)
      return NextResponse.json({ ok: true, removida: true })
    }

    // Reação repetida (a ponte reentregando) não vira linha nova.
    if (idReacao) {
      const { data: jaTem } = await supabaseAdmin
        .from('crm_mensagens').select('id').eq('salao_id', salaoId).eq('id_whatsapp', idReacao).limit(1)
      if (jaTem?.length) return NextResponse.json({ ok: true, repetida: true })
    }

    const { data: cv } = await supabaseAdmin
      .from('crm_conversas').select('*').eq('id', alvo.conversa_id).maybeSingle()
    if (!cv) return NextResponse.json({ ok: false })

    await supabaseAdmin.from('crm_mensagens').insert({
      salao_id: salaoId, conversa_id: cv.id,
      direcao: 'entrada', texto: emoji, tipo: 'reacao',
      situacao: 'entregue', em_massa: false,
      id_whatsapp: idReacao, responde_a: alvo.id,
    })
    await supabaseAdmin.from('crm_conversas').update({
      ultima_em: agora, ultima_de: 'cliente',
      ultima_previa: `Reagiu com ${emoji}`, atualizado_em: agora,
    }).eq('id', cv.id)

    // Joinha em cima de um pedido de confirmação = confirmou.
    const POSITIVA = /[\u{1F44D}\u{2705}\u{2611}\u{2714}\u{2764}\u{1F9E1}\u{1F49B}\u{1F49A}\u{1F499}\u{1F49C}\u{1F5A4}\u{1F90D}\u{1F90E}\u{1F496}\u{1F497}\u{1F493}\u{1F49E}\u{1F495}\u{1F64F}\u{1F44C}\u{1F60A}\u{1F60D}\u{1F970}\u{1F618}\u{1F917}\u{1F44F}\u{1F4AF}\u{1FAF6}\u{1F64C}\u{1F601}\u{1F600}\u{1F603}\u{1F604}\u{1F929}\u{263A}\u{1F337}\u{1F339}\u{1F338}\u{2728}]/u
    let confirmou = false
    if (alvo.direcao === 'saida' && POSITIVA.test(emoji)
        && tipoDaMensagemDoSalao(alvo.texto) === 'confirmacao') {
      try {
        const conf = await cfgConfirmacao(salaoId)
        if (conf.ligada) {
          const { data: ct } = await supabaseAdmin
            .from('crm_contatos').select('id, telefone, nome, cliente_nome').eq('id', cv.contato_id).maybeSingle()
          const achou = /(\d{2})\/(\d{2})\/(\d{4})/.exec(String(alvo.texto || ''))
          confirmou = await enfileirar(salaoId, {
            conversa_id: cv.id,
            contato_id: cv.contato_id,
            telefone: ct?.telefone || String(body?.telefone || ''),
            nome: ct?.cliente_nome || ct?.nome || '',
            data: achou ? `${achou[1]}/${achou[2]}/${achou[3]}` : datasDoSalao().amanha.br,
          })
        }
      } catch { /* a reação já está registrada; a confirmação é bônus */ }
    }
    return NextResponse.json({ ok: true, confirmou })
  }

  // ── A ponte confirma o envio (ou avisa que falhou) ────────────────────────
  if (acao === 'confirmar') {
    const id = String(body?.mensagem_id || '')
    if (!id) return NextResponse.json({ error: 'mensagem_id é obrigatório' }, { status: 400 })
    const ok = body?.enviada !== false
    await supabaseAdmin.from('crm_mensagens').update({
      situacao: ok ? 'enviada' : 'falhou',
      id_whatsapp: body?.id_whatsapp || null,
      erro: ok ? null : String(body?.erro || 'falha no envio'),
      enviado_em: ok ? agora : null,
    }).eq('id', id).eq('salao_id', salaoId)

    // ── Editar / apagar / reagir: a ponte fez, o CRM aplica ─────────────────
    //
    // A linha da ação aponta (responde_a) para a mensagem original. Deu
    // certo: editar troca o texto da original; apagar vira "(mensagem
    // apagada)"; reagir vira uma reação do salão, visível. A linha da ação
    // some nos dois primeiros casos -- ela existiu só para a ponte.
    const { data: linha } = await supabaseAdmin
      .from('crm_mensagens').select('id, tipo, texto, responde_a, conversa_id')
      .eq('id', id).eq('salao_id', salaoId).maybeSingle()
    if (ok && linha && String(linha.tipo || '').startsWith('acao_') && linha.responde_a) {
      if (linha.tipo === 'acao_editar') {
        const { data: orig } = await supabaseAdmin
          .from('crm_mensagens').select('id, texto').eq('id', linha.responde_a).maybeSingle()
        await supabaseAdmin.from('crm_mensagens').update({ texto: linha.texto }).eq('id', linha.responde_a)
        const { data: cv } = await supabaseAdmin
          .from('crm_conversas').select('id, ultima_previa').eq('id', linha.conversa_id).maybeSingle()
        if (cv && orig && String(cv.ultima_previa || '') === String(orig.texto || '').slice(0, 120)) {
          await supabaseAdmin.from('crm_conversas')
            .update({ ultima_previa: String(linha.texto || '').slice(0, 120) }).eq('id', cv.id)
        }
        await supabaseAdmin.from('crm_mensagens').delete().eq('id', linha.id)
      } else if (linha.tipo === 'acao_apagar') {
        await supabaseAdmin.from('crm_mensagens')
          .update({ texto: '(mensagem apagada)', tipo: 'apagada', midia_url: null }).eq('id', linha.responde_a)
        await supabaseAdmin.from('crm_mensagens').delete().eq('id', linha.id)
      } else if (linha.tipo === 'acao_reagir') {
        await supabaseAdmin.from('crm_mensagens').update({ tipo: 'reacao' }).eq('id', linha.id)
      }
    }
    return NextResponse.json({ ok: true })
  }

  // ── O histórico que já existia no WhatsApp do salão ───────────────────────
  //
  // Vem logo depois do pareamento. Duas decisões importantes moram aqui:
  //
  // 1. Conversa importada NÃO entra na fila de trabalho por padrão. Despejar
  //    dois anos de conversa em "Ação necessária" enterraria o que de fato
  //    precisa de resposta hoje — a fila deixaria de valer no primeiro dia.
  //    Só o que a cliente escreveu nos últimos dias e ficou sem resposta
  //    entra na fila; o resto entra como "Aguardando cliente".
  //
  // 2. `importada` marca a origem. Sem isso, a taxa de conversão do CRM
  //    contaria como oportunidade tudo que já estava no celular, e o número
  //    nasceria mentindo.
  if (acao === 'historico') {
    // Carimba de qual numero este historico veio. E o que permite a tela
    // avisar, depois de uma troca de WhatsApp, que as conversas na frente da
    // pessoa sao de outro aparelho.
    const { data: canalAtual } = await supabaseAdmin
      .from('crm_canais').select('id, numero').eq('salao_id', salaoId).maybeSingle()
    if (canalAtual?.numero) {
      await supabaseAdmin.from('crm_canais')
        .update({ numero_dados: canalAtual.numero }).eq('id', canalAtual.id)
    }
    // Normaliza o lote antes de tocar no banco. Mensagem vazia não vira linha.
    //
    // Telefone OU lid: contas novas do WhatsApp só mandam o lid, e exigir
    // telefone aqui -- na PRIMEIRA linha do processamento -- descartava o
    // histórico inteiro delas antes de qualquer outra coisa acontecer.
    const lote = (Array.isArray(body?.conversas) ? body.conversas : [])
      .map((c: any) => ({
        telefone: normalizarTelefone(String(c?.telefone || '')),
        lid: String(c?.lid || '').trim() || null,
        nome: c?.nome ? String(c.nome).slice(0, 120) : null,
        mensagens: (Array.isArray(c?.mensagens) ? c.mensagens : [])
          .filter((m: any) => m && String(m.texto || '').trim())
          .sort((a: any, b: any) => Number(a.em || 0) - Number(b.em || 0)),
      }))
      .filter((c: any) => c.telefone || c.lid)
    if (!lote.length) return NextResponse.json({ ok: true, criadas: 0, mensagens: 0, motivo: 'lote vazio' })

    // ── Contatos ────────────────────────────────────────────────────────────
    // Uma leitura só. A versão anterior relia a tabela inteira de contatos a
    // cada conversa do lote — com o WhatsApp de um salão de verdade isso é
    // centenas de idas ao banco numa requisição só, e a função morre no
    // tempo limite antes de gravar qualquer coisa.
    // Em páginas: o salão passou de 950 contatos e o banco entrega mil por
    // pedido, calado. Do contato 1001 em diante a busca não achava, tentava
    // criar quem já existia e o índice único derrubava o lote inteiro.
    const { dados: contatosExistentes } = await paginar<any>((de, ate) => supabaseAdmin
      .from('crm_contatos').select('id, telefone, lid, nome')
      .eq('salao_id', salaoId).order('id').range(de, ate), 60000)

    // ── A mesma pessoa tem DUAS chaves, e as duas valem ───────────────────
    //
    // Quem veio do histórico de uma conta nova entrou só com o LID. Quando o
    // WhatsApp entrega o par LID -> telefone (no pareamento seguinte, ou ao
    // vivo), a conversa chega com os dois. Casar só por telefone criava a
    // pessoa de novo -- uma com LID, outra com número -- e a recepção via
    // duas "Maria" na lista, cada uma com metade da conversa.
    //
    // Então: procura pelo telefone; não achou, procura pelo LID. Achou pelo
    // LID e agora tem telefone? O contato ganha o número. É assim que as 802
    // conversas sem número do Rouge vão ganhar número no próximo pareamento.
    const porTelefone = new Map<string, any>()
    const porLid = new Map<string, any>()
    const chaveDe = (x: any) => x?.telefone ? chaveTelefone(x.telefone) : (x?.lid ? 'lid:' + x.lid : '')
    const guardar = (c: any) => {
      if (c?.telefone) porTelefone.set(chaveTelefone(c.telefone), c)
      if (c?.lid) porLid.set(c.lid, c)
    }
    const achar = (x: any) =>
      (x?.telefone && porTelefone.get(chaveTelefone(x.telefone)))
      || (x?.lid && porLid.get(x.lid))
      || null
    for (const c of contatosExistentes || []) guardar(c)
    // porChave é o que o resto do bloco usa: conversa -> contato.
    const porChave = new Map<string, any>()
    for (const c of lote) { const a = achar(c); if (a) porChave.set(chaveDe(c), a) }

    // Contato que existia só com LID e agora veio com telefone: liga os dois.
    // `conferido_em` volta a nulo para o relógio cruzar com o histórico do
    // salão na próxima volta -- é o número que faz a lateral aparecer.
    const ganharamNumero: { id: string; telefone: string }[] = []
    for (const c of lote) {
      const a = porChave.get(chaveDe(c))
      if (!a || !c.telefone || a.telefone) continue
      if (ganharamNumero.some(g => g.id === a.id)) continue
      ganharamNumero.push({ id: a.id, telefone: c.telefone })
      a.telefone = c.telefone
      porTelefone.set(chaveTelefone(c.telefone), a)
    }
    for (const g of ganharamNumero) {
      await supabaseAdmin.from('crm_contatos')
        .update({ telefone: g.telefone, telefone_bruto: g.telefone, conferido_em: null })
        .eq('id', g.id)
    }
    // O contrário também: contato com número que ainda não tinha LID.
    for (const c of lote) {
      const a = porChave.get(chaveDe(c))
      if (!a || !c.lid || a.lid) continue
      a.lid = c.lid
      porLid.set(c.lid, a)
      await supabaseAdmin.from('crm_contatos').update({ lid: c.lid }).eq('id', a.id)
    }

    const criarContatos = lote
      .filter((c: any) => !porChave.has(chaveDe(c)))
      // A mesma pessoa pode vir duas vezes no lote (grafia diferente); o
      // índice único barraria o insert inteiro, então dedup antes.
      .filter((c: any, i: number, arr: any[]) =>
        arr.findIndex((o: any) => chaveDe(o) === chaveDe(c)) === i)
      .map((c: any) => ({
        salao_id: salaoId,
        telefone: c.telefone || null,
        telefone_bruto: c.telefone || null,
        lid: c.lid,
        nome: c.nome, nome_agenda: c.nome,
      }))

    // O erro do insert era ENGOLIDO aqui. O lote chegava com 44 conversas, saia
    // com 0 gravadas, e nao havia nada em lugar nenhum dizendo por que. Erro
    // silencioso em caminho de importacao e a pior combinacao que existe: tudo
    // parece funcionar e nada acontece.
    let erroContatos: string | null = null
    if (criarContatos.length) {
      const { data: novos, error } = await supabaseAdmin
        .from('crm_contatos').insert(criarContatos).select('id, telefone, lid, nome')
      if (error) erroContatos = String(error.message || error).slice(0, 300)
      for (const n of novos || []) {
        guardar(n)
        for (const c of lote) if (!porChave.has(chaveDe(c)) && achar(c) === n) porChave.set(chaveDe(c), n)
      }
    }

    // Nome de agenda que chegou depois preenche o que estava vazio, mas nunca
    // sobrescreve o nome que alguém do salão digitou à mão.
    for (const c of lote) {
      const ct = porChave.get(chaveDe(c))
      if (ct && c.nome && !ct.nome) {
        await supabaseAdmin.from('crm_contatos')
          .update({ nome: c.nome, nome_agenda: c.nome }).eq('id', ct.id)
        ct.nome = c.nome
      }
    }

    // ── Conversas ───────────────────────────────────────────────────────────
    const idsContato = lote
      .map((c: any) => porChave.get(chaveDe(c))?.id)
      .filter(Boolean)
    if (!idsContato.length) {
      return NextResponse.json({ ok: true, criadas: 0, mensagens: 0, erro: erroContatos })
    }

    // ── Conversa DECIDIDA também conta ────────────────────────────────────
    //
    // Esta consulta escondia 'agendado' e 'sem_conversao'. Resultado: a cliente
    // que escrevia "obrigada" depois de a recepção clicar em "Agendou" não
    // achava a conversa dela e ganhava uma NOVA -- dois Yuri na fila, um com o
    // histórico inteiro e outro com uma palavra. O caminho ao vivo já
    // reaproveitava a conversa decidida há menos de 7 dias; o histórico não, e
    // é por ele que quase tudo entra quando a conexão oscila.
    const { data: todasDoContato } = await supabaseAdmin
      .from('crm_conversas').select('id, contato_id, estado, ultima_em, fechada_em, nao_lidas, aguardando_desde')
      .eq('salao_id', salaoId).in('contato_id', idsContato)

    const DIAS_REABRIR = 7
    const limiteReabrir = new Date(Date.now() - DIAS_REABRIR * 864e5).toISOString()
    const DECIDIDA = (e: string) => ESTADOS_DECIDIDOS.includes(e as any) && e !== 'pausada'

    const porContato = new Map<string, any>()
    for (const cv of todasDoContato || []) {
      if (DECIDIDA(cv.estado)) {
        // Decidida e antiga não reabre: quem volta meses depois é oportunidade
        // nova, e é isso que faz a conta de conversão parar de pé.
        const quando = cv.fechada_em || cv.ultima_em
        if (!quando || quando < limiteReabrir) continue
      }
      const anterior = porContato.get(cv.contato_id)
      const melhor = !anterior
        // Conversa em aberto ganha de conversa decidida.
        || (DECIDIDA(anterior.estado) && !DECIDIDA(cv.estado))
        || (DECIDIDA(anterior.estado) === DECIDIDA(cv.estado)
            && (cv.ultima_em || '') > (anterior.ultima_em || ''))
      if (melhor) porContato.set(cv.contato_id, cv)
    }

    const resumo = lote.map((c: any) => {
      const contato = porChave.get(chaveDe(c))
      const ultima = c.mensagens[c.mensagens.length - 1]
      const quando = ultima?.em ? new Date(Number(ultima.em) * 1000).toISOString() : agora
      const daCliente = ultima?.direcao === 'entrada'
      return { c, contato, ultima, quando, daCliente }
    }).filter((r: any) => r.contato)

    // Conversa sem NENHUMA mensagem nao e oportunidade: e um contato que
    // existe na agenda do celular. O contato fica gravado (para reconhecer
    // quem escrever amanha), a conversa nao nasce -- senao a fila de trabalho
    // enche de linhas em que nao ha nada para ler nem para responder.
    const criarConversas = resumo
      .filter((r: any) => r.c.mensagens.length > 0)
      .filter((r: any) => !porContato.has(r.contato.id))
      .map((r: any) => {
        // Quem falou por ultimo foi a cliente => alguem precisa responder.
        // A idade da conversa NAO muda isso: "aguardando cliente" numa
        // conversa em que a cliente perguntou e ninguem respondeu e mentira,
        // e e a mentira mais cara que existe aqui. Quem separa o de hoje do
        // que ficou para tras e a tela, com a aba "Sem resposta".
        // Mesma conta do caminho ao vivo: a frase da última mensagem decide
        // a pasta (Feedback, Confirmação, Listas), em vez de todo salão-por-
        // último cair em "Aguardando" -- que era o que o histórico fazia.
        const estado = estadoPelaUltimaMensagem(r.daCliente, r.ultima?.texto)
        return {
          salao_id: salaoId,
          contato_id: r.contato.id,
          estado,
          importada: true,
          proxima_acao: proximaAcaoPadrao(estado as any),
          aguardando_desde: estado === 'acao_necessaria' ? r.quando : null,
          ultima_em: r.quando,
          ultima_de: r.daCliente ? 'cliente' : 'salao',
          ultima_previa: String(r.ultima?.texto || '').slice(0, 120),
          nao_lidas: 0,
        }
      })

    let criadas = 0
    if (criarConversas.length) {
      const { data: novas } = await supabaseAdmin
        .from('crm_conversas').insert(criarConversas).select('id, contato_id, ultima_em')
      for (const n of novas || []) porContato.set(n.contato_id, n)
      criadas = (novas || []).length
    }

    // ── Mensagens ───────────────────────────────────────────────────────────
    // Reimportar não pode duplicar a conversa da cliente na tela: o que já
    // está gravado é filtrado pelo id do WhatsApp antes de inserir.
    const todosIds = lote.flatMap((c: any) => c.mensagens.map((m: any) => m.id_whatsapp)).filter(Boolean)
    const conhecidos = new Set<string>()
    for (let i = 0; i < todosIds.length; i += 200) {
      const { data: velhas } = await supabaseAdmin
        .from('crm_mensagens').select('id_whatsapp')
        .eq('salao_id', salaoId).in('id_whatsapp', todosIds.slice(i, i + 200))
      for (const v of velhas || []) if (v.id_whatsapp) conhecidos.add(v.id_whatsapp)
    }

    const inserir: any[] = []
    for (const r of resumo) {
      const conversa = porContato.get(r.contato.id)
      if (!conversa) continue
      for (const m of r.c.mensagens) {
        if (m.id_whatsapp && conhecidos.has(m.id_whatsapp)) continue
        if (m.id_whatsapp) conhecidos.add(m.id_whatsapp)   // repetida dentro do próprio lote
        const em = m.em ? new Date(Number(m.em) * 1000).toISOString() : agora
        const saida = m.direcao === 'saida'
        inserir.push({
          salao_id: salaoId,
          conversa_id: conversa.id,
          direcao: saida ? 'saida' : 'entrada',
          texto: String(m.texto || ''),
          tipo: m.tipo || 'texto',
          situacao: saida ? 'enviada' : 'entregue',
          id_whatsapp: m.id_whatsapp || null,
          criado_em: em,
          enviado_em: saida ? em : null,
        })
      }
    }

    let novasMensagens = 0
    for (let i = 0; i < inserir.length; i += 200) {
      const fatia = inserir.slice(i, i + 200)
      const { error } = await supabaseAdmin.from('crm_mensagens').insert(fatia)
      if (!error) novasMensagens += fatia.length
    }

    // A conversa que já existia continua com o estado que o salão deu; só a
    // prévia acompanha, para a lista não mostrar uma frase velha.
    for (const r of resumo) {
      const conversa = porContato.get(r.contato.id)
      if (!conversa || !r.ultima) continue
      if (r.quando <= (conversa.ultima_em || '')) continue
      const patch: any = {
        ultima_em: r.quando,
        ultima_de: r.daCliente ? 'cliente' : 'salao',
        ultima_previa: String(r.ultima.texto || '').slice(0, 120),
        atualizado_em: agora,
      }
      // ── A CORREÇÃO ─────────────────────────────────────────────────────────
      // Antes o histórico atualizava só a última mensagem e DEIXAVA A PASTA como
      // estava. Com a conexão caindo a cada minuto quase tudo chega pelo
      // histórico -- então a cliente respondia, o salão respondia, e a conversa
      // ficava congelada na pasta antiga (um "ta joia" preso em Listas, um
      // feedback preso em Aguardando). Agora a pasta é recalculada da última
      // mensagem, igual ao vivo. Menos os estados que a recepção decidiu à mão:
      // esses o histórico não desfaz.
      // A cliente falou: sobe a bolinha de não lida mesmo na conversa já
      // decidida -- a decisão ("Agendou") fica, mas a fala dela não se perde.
      if (r.daCliente) patch.nao_lidas = Math.max(1, Number(conversa.nao_lidas || 0))
      // Pasta decidida à mão, e pasta que o salão criou, o histórico não mexe.
      if (!ESTADOS_DECIDIDOS.includes(conversa.estado) && !ehEstadoDoSalao(conversa.estado)) {
        const novo = estadoPelaUltimaMensagem(r.daCliente, r.ultima.texto)
        patch.estado = novo
        patch.proxima_acao = proximaAcaoPadrao(novo)
        patch.aguardando_desde = r.daCliente ? (conversa.aguardando_desde || r.quando) : null
      }
      await supabaseAdmin.from('crm_conversas').update(patch).eq('id', conversa.id)
      conversa.ultima_em = r.quando
    }

    return NextResponse.json({ ok: true, criadas, mensagens: novasMensagens, erro: erroContatos })
  }

  // ── Mensagem que passou pelo WhatsApp ─────────────────────────────────────
  //
  // Pode ser da cliente (`entrada`) ou do próprio salão respondendo pelo
  // celular (`saida`). As duas entram: mostrar só metade da conversa faz quem
  // abre a tela não saber se alguém já falou com aquela pessoa.
  const telefone = String(body?.telefone || '')
  const texto = String(body?.texto || '')
  const daCliente = body?.direcao !== 'saida'
  // ── A hora da mensagem é a do WhatsApp, não a da chegada ─────────────────
  //
  // Depois de uma queda a ponte entrega centenas de mensagens de uma vez
  // (772 em 18/09/2026 às 09:19). Todas ficavam com a hora da chegada: a
  // ordem embaralhava, a prévia da conversa mostrava a mensagem errada e o
  // volume de "saída em quinze minutos" marcava tudo como disparo. A ponte
  // manda `em` (segundos, hora do aparelho); sem ele, vale agora.
  const emOriginal = Number(body?.em || 0) > 0 ? new Date(Number(body.em) * 1000) : null
  const quando = (emOriginal && emOriginal.getTime() < Date.now() + 120e3) ? emOriginal.toISOString() : agora
  // Mensagem com mais de meia hora é reentrega de histórico: as regras de
  // disparo olham o ritmo de AGORA e não têm o que dizer sobre ela.
  const replay = Date.now() - Date.parse(quando) > 30 * 60e3
  if (!telefone && !body?.lid) {
    return NextResponse.json({ error: 'telefone ou lid é obrigatório' }, { status: 400 })
  }

  const contato = await acharOuCriarContato(salaoId, telefone, body?.nome, body?.lid)
  if (!contato) return NextResponse.json({ error: 'sem telefone e sem lid' }, { status: 400 })

  // ── O nome estava escrito na mensagem o tempo todo ────────────────────────
  //
  // 276 das 300 conversas apareciam na fila como "Contato 315487", porque a
  // agenda do WhatsApp quase não veio -- e a recepção não sabe com quem está
  // falando. Só que o salão escreve o nome da cliente em toda mensagem que
  // manda: "Olá KATARINA,", "TELMA, boa tarde!".
  //
  // Então o nome sai de lá. Vale só quando o contato não tem nome nenhum:
  // nada aqui sobrescreve o que já está certo, e um palpite só é melhor que
  // um número quando não há nada melhor.
  if (!daCliente && !contato.nome) {
    const achado = nomeNaMensagem(texto)
    if (achado) {
      await supabaseAdmin.from('crm_contatos')
        .update({ nome: achado }).eq('id', contato.id)
      contato.nome = achado
    }
  }

  const idWpp = body?.id_whatsapp || null

  // Mensagem repetida não vira linha nova. Duas fontes de repetição: a ponte
  // reenviando o mesmo evento, e o eco do que o próprio CRM acabou de mandar
  // (sai pela ponte, volta como mensagem do salão segundos depois).
  if (idWpp) {
    const { data: jaTem } = await supabaseAdmin
      .from('crm_mensagens').select('id')
      .eq('salao_id', salaoId).eq('id_whatsapp', idWpp).limit(1)
    if (jaTem?.length) return NextResponse.json({ ok: true, repetida: true })
  }

  // Uma conversa ABERTA por contato. Conversa fechada (agendada ou perdida)
  // não é reaberta: a cliente que volta depois inicia uma oportunidade nova,
  // e é isso que faz a conta de conversão parar de pé.
  const { data: abertas } = await supabaseAdmin
    .from('crm_conversas').select('*')
    .eq('salao_id', salaoId).eq('contato_id', contato.id)
    .not('estado', 'in', '("agendado","confirmado","sem_conversao","desmarcou")')
    .order('ultima_em', { ascending: false }).limit(1)

  let conversa = (abertas || [])[0]

  // ── "Ok, obrigada" não é oportunidade nova ────────────────────────────────
  //
  // Caso real, Maria José, 12/09/2026: a recepção agendou, clicou em "Agendou"
  // e trinta segundos depois chegou o "Ok.Obrigada" dela. Conversa fechada não
  // reabre, então nasceu uma SEGUNDA conversa -- duas Maria José na lista, uma
  // com o histórico inteiro e outra só com o obrigada.
  //
  // O que fecha a conta de conversão é a cliente que volta DEPOIS: semanas
  // mais tarde, querendo outro horário. Quem escreve na mesma semana ainda
  // está na mesma conversa -- agradecendo, confirmando o horário quando o
  // lembrete chega, ou pedindo para acrescentar um corte. Nos três casos a
  // mensagem vai para a conversa que já existe, e a decisão ("Agendou", "Não
  // fechou") fica como está. O que muda é que ela sobe com a bolinha de não
  // lida: a tela mostra conversa fechada com mensagem nova em "Preciso agir"
  // até alguém abrir.
  //
  // Sete dias, e não 48h, por causa do lembrete: o salão agenda na segunda e
  // manda "confirma seu horário?" na quinta. Com 48h o "Sim" dela abria uma
  // conversa nova, e a mesma cliente virava duas vitórias no painel -- uma
  // "Agendou" e uma "Confirmou". Medido em 12/09/2026: 14 conversas assim.
  const DIAS_MESMA_CONVERSA = 7
  let fechadaHaPouco = false
  let reaberta = false
  if (!conversa) {
    const limite = new Date(Date.now() - DIAS_MESMA_CONVERSA * 864e5).toISOString()
    const { data: fechadas } = await supabaseAdmin
      .from('crm_conversas').select('*')
      .eq('salao_id', salaoId).eq('contato_id', contato.id)
      .in('estado', ['agendado', 'confirmado', 'sem_conversao', 'desmarcou'])
      .order('ultima_em', { ascending: false }).limit(1)
    const f = (fechadas || [])[0]
    const quando = f?.fechada_em || f?.ultima_em
    if (f && quando && quando >= limite) { conversa = f; fechadaHaPouco = true }
  }

  // ── Disparo em massa ──────────────────────────────────────────────────────
  //
  // O caso que fazia o salão perder cliente: a pessoa pergunta um preço, e
  // pouco depois sai um disparo de lista para todo mundo. A mensagem do
  // disparo é do salão, então pela regra normal a conversa sairia de "Preciso
  // agir" — e a pergunta dela ficaria enterrada embaixo de um texto que não
  // era para ela.
  //
  // ── O QUE SEPARA OS DOIS NÃO É O TEXTO ────────────────────────────────────
  //
  // Passei o dia tentando distinguir pelo texto -- igual, mesmo molde, ritmo --
  // e cada regra errou de um jeito. A frase do dono resolveu:
  //
  //   "a mensagem padrão está lá dentro. Se eu mandar a mensagem padrão para
  //    cinco pessoas em doze minutos ele já vai cair como lista. Não dá."
  //
  // Ele tem razão e o erro era meu na raiz: as mensagens prontas existem PARA
  // serem repetidas. Cinco "Boas-vindas" em dez minutos é a recepção
  // trabalhando, não campanha. Texto nunca ia separar isso.
  //
  // O que separa é OUTRA COISA, e é simples: a cliente falou aqui há pouco?
  //
  //   FALOU   -> o que o salão mandou é RESPOSTA. Sempre. Mesmo que a frase
  //              seja idêntica à de outras dez conversas.
  //   NÃO FALOU -> o salão está iniciando. Aí sim vale olhar se o mesmo texto
  //              está saindo para muita gente ao mesmo tempo.
  //
  // Campanha vai para quem não pediu nada -- é o que campanha é. E resposta
  // vai para quem perguntou. O sinal estava na conversa, não na frase.
  const JANELA_DISPARO_MIN = 15
  const HORAS_FALOU_RECENTE = 48
  let emMassa = !!body?.em_massa
  let irmas: any[] = []

  // A cliente falou nesta conversa nas últimas 48h? Então tudo que o salão
  // mandar aqui é resposta, e nenhuma regra de texto se aplica.
  let falouRecente = false
  if (!daCliente && conversa?.id) {
    const desdeFala = new Date(Date.now() - HORAS_FALOU_RECENTE * 3600e3).toISOString()
    const { count } = await supabaseAdmin
      .from('crm_mensagens').select('id', { count: 'exact', head: true })
      .eq('conversa_id', conversa.id).eq('direcao', 'entrada')
      .gte('criado_em', desdeFala)
    falouRecente = (count || 0) > 0
  }

  if (!daCliente && !emMassa && !falouRecente && !replay && texto.trim().length > 0) {
    const desde = new Date(Date.now() - JANELA_DISPARO_MIN * 60000).toISOString()
    // Traz TUDO que saiu na janela, não só o texto igual: o disparo do salão é
    // personalizado ("Olá *LUCIANA*, tudo bem?" / "Olá *Thatiana*, tudo bem?")
    // e nenhuma das duas frases é igual à outra. Procurar igualdade exata
    // deixava a campanha inteira passar como se fosse conversa de verdade --
    // foi o que encheu "Aguardando cliente" com 204 conversas.
    const { data: recentes } = await supabaseAdmin
      .from('crm_mensagens').select('id, conversa_id, texto')
      .eq('salao_id', salaoId).eq('direcao', 'saida')
      .gte('criado_em', desde).limit(200)

    const outras = (recentes || []).filter((m: any) => m.conversa_id && m.conversa_id !== conversa?.id)
    irmas = outras.filter((m: any) => m.texto === texto)

    // ── Quem está esperando resposta exige prova mais forte ────────────────
    //
    // Caso real, PAULA, 12/09/2026: ela perguntou por horário e a recepção
    // respondeu "Tenho apenas esse horário com as duas". Resposta legítima --
    // mas a mesma frase saiu para outra cliente na mesma hora, porque é o tipo
    // de coisa que se repete naturalmente num dia de agenda apertada. Marcada
    // como disparo, ela ficou presa em "Preciso agir" mesmo depois de
    // respondida.
    //
    // Duas pessoas recebendo a mesma frase é coincidência de expediente.
    // Quatro é campanha. Então, para conversa em "Preciso agir", o mínimo sobe
    // -- e fora dela o antigo continua, que é onde ele acerta.
    // Duas pessoas já bastam: aqui dentro ninguém falou com o salão nas
    // últimas 48h, então texto repetido não é coincidência de expediente.
    if (irmas.length >= 1) emMassa = true

    // Personalizado: tira o nome e compara o molde. O nome da cliente é o que
    // o salão troca a cada envio -- vem entre asteriscos, ou é a primeira
    // palavra em maiúsculas da frase.
    if (!emMassa) {
      const molde = moldeDaMensagem(texto)
      if (molde.length >= 8) {
        const mesmoMolde = outras.filter((m: any) => moldeDaMensagem(m.texto || '') === molde)
        if (mesmoMolde.length >= 1) { emMassa = true; irmas = mesmoMolde }
      }
    }

    // ── Volume: a peneira que de fato pega ────────────────────────────────
    //
    // Medido no disparo real de 12/09/2026: "Olá Adriane," e "Olá DANIELA,".
    // Mesmo molde para um humano, moldes diferentes para o código -- um nome
    // está em maiúsculas e o outro não, e o que sobra é curto demais para
    // comparar. Texto não resolve este caso. Ritmo resolve: saíram a cada
    // quinze segundos, para pessoas diferentes.
    //
    // Quatro conversas diferentes em quinze minutos. Parece pouco, mas quem
    // de fato estava esperando resposta está em "Preciso agir", e de lá o
    // disparo não tira ninguém. O pior caso que sobra é uma conversa de
    // verdade ir para "Aguardando promoção" em vez de "Aguardando cliente" --
    // duas pastas sem urgência, e um clique desfaz.
    //
    // MAS não contra quem está esperando resposta. Caso real de 12/09/2026, a
    // MARCIA: ela escreveu "Confirmado" às 15:13, às 15:14 recebeu o disparo de
    // lembrete (esse é disparo mesmo) e às 15:15 recebeu uma resposta de
    // verdade, escrita para ela -- "Sou Raissa responsável por finalizar seu
    // atendimento... 1.Duas manicures". A campanha estava correndo, então o
    // ritmo marcou as DUAS como disparo, e a conversa ficou parada em "Preciso
    // agir" mesmo depois de alguém ter respondido.
    //
    // Ritmo é indício fraco demais para contrariar "tem gente esperando". Para
    // quem está em Preciso agir, só o TEXTO decide: mesma frase ou mesmo molde
    // saindo para outras pessoas é disparo; qualquer outra coisa é resposta, e
    // resposta tira a conversa da fila.
    //
    // ── Mas só para texto de molde ─────────────────────────────────────────
    //
    // Caso real, 19/09/2026 16:42: a recepção digitou "podemos agendar para
    // amanhã ?" para uma cliente que tinha escrito "Oi" cinco dias antes. Na
    // mesma tarde saíam avisos "seu cliente chegou" para quatro profissionais
    // e respostas para outras clientes -- quatro conversas em quinze minutos
    // é qualquer tarde de salão. A frase foi marcada como disparo e a cliente
    // foi parar em "Listas". Campanha é texto de molde, longo; frase curta
    // digitada na hora nunca é campanha só por causa do movimento da tarde.
    // Texto repetido (as duas regras acima) continua valendo em qualquer
    // tamanho.
    const TAMANHO_DE_MOLDE = 80
    if (!emMassa && texto.trim().length >= TAMANHO_DE_MOLDE) {
      const pessoas = new Set(outras.map((m: any) => m.conversa_id))
      if (pessoas.size >= 4) emMassa = true
    }
  }

  // ── Feedback, confirmação ou lista: a frase diz o que é ──────────────────
  //
  // Ritmo e texto repetido continuam valendo para a promoção improvisada. Mas
  // os três disparos de todo dia têm frase própria, e a frase é prova mais
  // forte que o ritmo: o primeiro feedback do dia já cai na pasta certa, sem
  // esperar o segundo sair para provar que era disparo.
  const tipo = daCliente ? null : tipoDaMensagemDoSalao(texto)
  const disparo = emMassa || !!tipo
  const destino = tipo ? ESTADO_DO_TIPO[tipo] : 'aguardando_promo'

  if (!conversa) {
    // Disparo para quem nunca falou com o salão não abre oportunidade: seria
    // inventar uma conversa que ninguém teve. E nasce em "Aguardando
    // promoção", não em "Aguardando cliente": cem disparos por dia caindo na
    // mesma pasta das conversas de verdade fazem a recepção parar de abrir a
    // pasta -- e aí a espera que importa se perde no meio do disparo.
    const estado = daCliente
      ? 'acao_necessaria'
      : (disparo ? destino : 'aguardando')
    const { data: nova } = await supabaseAdmin.from('crm_conversas').insert({
      salao_id: salaoId,
      contato_id: contato.id,
      estado,
      importada: disparo,
      proxima_acao: proximaAcaoPadrao(estado as any),
      aguardando_desde: daCliente ? quando : null,
      ultima_em: quando,
      ultima_de: daCliente ? 'cliente' : 'salao',
      ultima_previa: texto.slice(0, 120),
      nao_lidas: daCliente ? 1 : 0,
    }).select().maybeSingle()
    conversa = nova
  } else if (fechadaHaPouco && daCliente && !(String(body?.tipo || 'texto') === 'texto' && ehSoAgradecimento(texto))) {
    // ── Assunto novo numa conversa decidida: volta para a fila ─────────────
    //
    // Caso real, Camila, 19/09/2026: agendada, e no dia seguinte escreveu
    // "queria acrescentar a mão também". A conversa continuava em "Agendadas"
    // e só aparecia na fila até alguém abrir -- abriu sem responder, sumiu.
    // Agora: se o que ela escreveu tem assunto (qualquer palavra fora da
    // cortesia, áudio, foto, documento), a conversa volta para "Preciso agir"
    // com o relógio ligado, como qualquer pedido. "Ok, obrigada, até terça"
    // continua sem reabrir (bloco abaixo).
    reaberta = true
    await supabaseAdmin.from('crm_conversas').update({
      estado: 'acao_necessaria',
      proxima_acao: `Responder: ela escreveu depois de "${estadoPor(conversa.estado).rotulo}"`,
      aguardando_desde: quando,
      ultima_em: quando,
      ultima_de: 'cliente',
      ultima_previa: texto.slice(0, 120),
      nao_lidas: (conversa.nao_lidas || 0) + 1,
      atualizado_em: agora,
    }).eq('id', conversa.id)
  } else if (fechadaHaPouco) {
    // Conversa decidida há menos de 48h: a mensagem entra nela e a decisão
    // fica. Da cliente, sobe com não lida (a tela põe em "Preciso agir" até
    // alguém abrir). Do salão, só atualiza a prévia -- e disparo não mexe em
    // nada, como em qualquer outra pasta fechada.
    if (daCliente || !disparo) {
      await supabaseAdmin.from('crm_conversas').update({
        ultima_em: quando,
        ultima_de: daCliente ? 'cliente' : 'salao',
        ultima_previa: texto.slice(0, 120),
        nao_lidas: daCliente ? (conversa.nao_lidas || 0) + 1 : 0,
        atualizado_em: agora,
      }).eq('id', conversa.id)
    }
  } else if (daCliente) {
    // A cliente respondeu: volta para a fila e o relógio recomeça. Só marca o
    // início da espera se ela ainda não estava esperando, senão um cliente que
    // manda cinco mensagens seguidas zeraria o próprio atraso a cada uma.
    await supabaseAdmin.from('crm_conversas').update({
      estado: 'acao_necessaria',
      proxima_acao: proximaAcaoPadrao('acao_necessaria'),
      aguardando_desde: conversa.aguardando_desde || quando,
      ultima_em: quando,
      ultima_de: 'cliente',
      ultima_previa: texto.slice(0, 120),
      nao_lidas: (conversa.nao_lidas || 0) + 1,
      atualizado_em: agora,
    }).eq('id', conversa.id)
  } else if (!disparo) {
    // Resposta de verdade, digitada no celular: vale como resposta e a bola
    // passa para a cliente, exatamente como se tivesse sido escrita aqui.
    await supabaseAdmin.from('crm_conversas').update({
      estado: 'aguardando',
      proxima_acao: proximaAcaoPadrao('aguardando'),
      aguardando_desde: null,
      ultima_em: quando,
      ultima_de: 'salao',
      ultima_previa: texto.slice(0, 120),
      nao_lidas: 0,
      atualizado_em: agora,
    }).eq('id', conversa.id)
  } else if (PASSIVAS_DO_DISPARO.includes(conversa.estado)) {
    // ── Disparo em conversa onde NINGUÉM estava esperando ───────────────────
    //
    // Só daqui o disparo tem permissão de mexer. "Aguardando cliente" tem de
    // significar "eu falei com essa pessoa e estou esperando a resposta DELA";
    // com cem disparos por dia caindo ali dentro, deixa de significar isso.
    //
    // As outras pastas ficam intocadas de propósito:
    //
    // - "Preciso agir" é o caso que este bloco inteiro existe para proteger.
    //   A cliente perguntou um preço, o disparo saiu para a lista montada pelo
    //   relatório -- sem olhar quem estava na fila -- e pegou ela junto. Se o
    //   disparo a tirasse daqui, a pergunta dela ficaria enterrada embaixo de
    //   um texto que não era para ela. Ela continua em Preciso agir.
    // - Follow-up e Pausadas são filas de trabalho: se o disparo esvaziasse
    //   elas, o salão perderia a lista de quem precisa retomar, e perderia
    //   sem perceber, num dia em que só mandou promoção.
    // - Agendadas e Confirmou já estão decididas.
    // A pasta de destino é a do tipo da frase (Feedback, Confirmação, Listas);
    // sem frase conhecida, é Listas -- o disparo genérico.
    await supabaseAdmin.from('crm_conversas').update({
      estado: destino,
      proxima_acao: proximaAcaoPadrao(destino),
      aguardando_desde: null,
      ultima_em: quando,
      ultima_de: 'salao',
      ultima_previa: texto.slice(0, 120),
      atualizado_em: agora,
    }).eq('id', conversa.id)
  }
  // Disparo em qualquer outra pasta: nada muda. É o ponto inteiro disto.

  if (!conversa) return NextResponse.json({ error: 'falha ao abrir a conversa' }, { status: 500 })

  const { error: erroMsg } = await supabaseAdmin.from('crm_mensagens').insert({
    salao_id: salaoId,
    conversa_id: conversa.id,
    direcao: daCliente ? 'entrada' : 'saida',
    texto,
    tipo: body?.tipo || 'texto',
    midia_url: body?.midia_url || null,
    situacao: daCliente ? 'entregue' : 'enviada',
    em_massa: emMassa,
    autor_nome: daCliente ? null : 'Celular do salão',
    id_whatsapp: idWpp,
    enviado_em: daCliente ? null : quando,
    criado_em: quando,
  })
  if (erroMsg && !String(erroMsg.message).includes('duplicate')) {
    return NextResponse.json({ error: erroMsg.message }, { status: 500 })
  }

  // Descoberto tarde: a primeira pessoa do disparo já tinha sido tratada como
  // resposta normal. Desfaz — marca a mensagem dela como disparo e devolve a
  // conversa para a fila, com o relógio contando da última fala da cliente.
  if (emMassa && irmas.length) {
    const aCorrigir = irmas.filter((m: any) => !m.em_massa)
    if (aCorrigir.length) {
      await supabaseAdmin.from('crm_mensagens')
        .update({ em_massa: true }).in('id', aCorrigir.map((m: any) => m.id))

      for (const m of aCorrigir) {
        const { data: ultimaDela } = await supabaseAdmin
          .from('crm_mensagens').select('criado_em, texto')
          .eq('conversa_id', m.conversa_id).eq('direcao', 'entrada')
          .order('criado_em', { ascending: false }).limit(1)
        const dela = (ultimaDela || [])[0]
        if (!dela) continue

        const { data: cv } = await supabaseAdmin
          .from('crm_conversas').select('estado').eq('id', m.conversa_id).maybeSingle()
        // Só desfaz o que o disparo fez. Se alguém do salão já respondeu de
        // verdade ou fechou a conversa depois, a decisão da pessoa vale.
        if (!cv || cv.estado !== 'aguardando') continue

        await supabaseAdmin.from('crm_conversas').update({
          estado: 'acao_necessaria',
          proxima_acao: proximaAcaoPadrao('acao_necessaria'),
          aguardando_desde: dela.criado_em,
          ultima_em: dela.criado_em,
          ultima_de: 'cliente',
          ultima_previa: String(dela.texto || '').slice(0, 120),
          atualizado_em: agora,
        }).eq('id', m.conversa_id)
      }
    }
  }

  // ── "Confirmo" da cliente vira pedido de marcação no Avec ─────────────────
  //
  // Só conta na pasta CONFIRMAÇÃO: é lá que a última coisa que o salão mandou
  // foi mesmo um pedido de confirmação. Fora dali, "ok" não quer dizer nada e
  // a mensagem segue o caminho normal, para gente responder.
  //
  // ── A pasta não decide; a ÚLTIMA MENSAGEM do salão decide ────────────────
  //
  // Caso real, MANOELA e VANESSA EID, 18/09/2026 17:35-17:58: as duas estavam
  // em "Preciso agir" desde a manhã (escreveram e ninguém respondeu). A
  // confirmação das 17:30 chegou, mas disparo não tira ninguém de Preciso
  // agir -- então a conversa não estava na pasta Confirmação, o "Sim" delas
  // não contou, nenhuma recebeu o "Combinado" e o Avec ficou sem marcar.
  //
  // O que importa é: a última coisa que o salão mandou foi um pedido de
  // confirmação? Então "sim" é resposta a ele, esteja a conversa na pasta
  // que estiver. A trava contra o "ok" solto continua: fora de um pedido de
  // confirmação, nada aqui acontece.
  let ultimaDoSalaoEhConfirmacao = false
  if (daCliente && conversa?.id && texto.trim() && conversa.estado !== 'confirmacao') {
    const { data: ultSaida } = await supabaseAdmin
      .from('crm_mensagens').select('texto')
      .eq('conversa_id', conversa.id).eq('direcao', 'saida')
      .order('criado_em', { ascending: false }).limit(1)
    ultimaDoSalaoEhConfirmacao = tipoDaMensagemDoSalao((ultSaida || [])[0]?.texto) === 'confirmacao'
  }
  if (daCliente && (conversa?.estado === 'confirmacao' || ultimaDoSalaoEhConfirmacao) && texto.trim()) {
    try {
      const conf = await cfgConfirmacao(salaoId)
      if (conf.ligada && ehConfirmacao(texto, conf.palavras)) {
        // ── A data é a que está na mensagem de confirmação ─────────────────
        //
        // "Sou da recepção... *Data:* 19/09/2026 *Horário:* 17:00" -- a data
        // que a cliente está confirmando está escrita na última mensagem que o
        // salão mandou. Antes o sistema chutava "amanhã": a confirmação que a
        // recepção manda à mão para o MESMO dia caía em "não achei o
        // agendamento dela em 19/09". Pedido do dono (18/09/2026): "se estou
        // mandando a confirmação de uma data, ele tem que entender que é nessa
        // data". Sem data na mensagem, amanhã continua sendo o padrão.
        let dataConfirmada = datasDoSalao().amanha.br
        const { data: ultimasDoSalao } = await supabaseAdmin
          .from('crm_mensagens').select('texto')
          .eq('conversa_id', conversa.id).eq('direcao', 'saida')
          .order('criado_em', { ascending: false }).limit(3)
        for (const m of ultimasDoSalao || []) {
          const achou = /(\d{2})\/(\d{2})\/(\d{4})/.exec(String(m.texto || ''))
          if (achou) { dataConfirmada = `${achou[1]}/${achou[2]}/${achou[3]}`; break }
        }
        await enfileirar(salaoId, {
          conversa_id: conversa.id,
          contato_id: contato.id,
          telefone: contato.telefone || telefone,
          nome: contato.cliente_nome || contato.nome || '',
          data: dataConfirmada,
        })
      }
    } catch { /* falha aqui não pode derrubar a entrada da mensagem */ }
  }

  if (daCliente) {
    // Na conversa fechada o estado não mudou; o evento registra que ela
    // escreveu depois da decisão, sem fingir que voltou para a fila.
    await supabaseAdmin.from('crm_eventos').insert({
      salao_id: salaoId, conversa_id: conversa.id, tipo: 'entrou',
      de_estado: reaberta ? conversa.estado : null,
      para_estado: (fechadaHaPouco && !reaberta) ? conversa.estado : 'acao_necessaria',
      autor_nome: contato.nome || 'Cliente',
      detalhe: reaberta ? 'Escreveu com assunto numa conversa já decidida: voltou para a fila' : null,
    })
  }

  // ── Boas-vindas com o link de agendamento ─────────────────────────────────
  // Só para quem ENTRA em contato (12 h de silêncio ou contato novo), e sem
  // mexer no estado: a conversa fica em "Preciso agir" para a recepção.
  if (daCliente && !replay) {
    try {
      const { data: sal } = await supabaseAdmin.from('saloes').select('nome').eq('id', salaoId).maybeSingle()
      await boasVindasSePrimeiroContato({
        salaoId, conversaId: conversa.id, estado: String(conversa.estado || ''),
        texto, tipo: String(body?.tipo || 'texto'), quando, nomeSalao: String((sal as any)?.nome || ''),
      })
    } catch { /* boas-vindas é bônus; a entrada da mensagem já está feita */ }
  }

  return NextResponse.json({ ok: true, conversa_id: conversa.id, em_massa: emMassa })
}

// ── A ponte pergunta o que fazer, e busca o que precisa sair ────────────────
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const params = new URL(req.url).searchParams

  // Quais salões querem estar conectados. A ponte não tem lista fixa: ela
  // pergunta ao NODRI a cada volta, e por isso um salão novo que clica em
  // "Gerar o QR code" é atendido sem ninguém reiniciar serviço nenhum.
  if (params.get('acao') === 'canais') {
    // ── Uma ponte por salao, mesmo com varios computadores ──────────────────
    //
    // A sessao de WhatsApp e de UM aparelho conectado. Duas pontes abrindo a
    // mesma sessao brigam entre si e derrubam a conexao -- o salao perde o
    // WhatsApp e ninguem entende por que. O .bat ja impede duas copias no
    // MESMO computador; isto impede em computadores diferentes, que e o caso
    // que vai acontecer quando a recepcao instalar em duas maquinas.
    //
    // Funciona por posse com validade: a ponte se apresenta com um id, o
    // primeiro a chegar fica dono, e so perde a posse se passar dois minutos
    // sem dar sinal -- prazo que cobre reinicio de computador sem deixar um
    // salao mudo por engano.
    const dono = String(params.get('ponte') || '').slice(0, 60)
    const agora = new Date()
    const limite = new Date(agora.getTime() - 120000).toISOString()

    // Com erro do banco a resposta é ERRO, não lista vazia. Lista vazia a
    // ponte lia como "todos os salões se desconectaram" -- e em 14/09/2026
    // ela apagou as credenciais dos dois salões por causa de uma volta assim.
    const { data, error } = await supabaseAdmin
      .from('crm_canais').select('id, salao_id, situacao, ponte_dono, ponte_visto_em')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // O NOME do salão vai junto. O log da ponte falava só em UUID, e um log que
    // diz "96de3e30-65a3-... gerou QR" não responde a pergunta que importa --
    // QUAL salão é esse? Em 15/09/2026 isso me fez ler o log errado e quase dar
    // um alarme falso de que o Rouge tinha caído.
    const nomes = new Map<string, string>()
    const ids = (data || []).map(c => c.salao_id).filter(Boolean)
    if (ids.length) {
      const { data: ss } = await supabaseAdmin.from('saloes').select('id, nome').in('id', ids)
      for (const s of ss || []) nomes.set(s.id, String(s.nome || '').trim())
    }

    const meus: any[] = []
    for (const c of data || []) {
      // 'desconectado' vai na lista, com o nome, para a ponte que segurava a
      // sessão fazer o logout de verdade. Sem dono, ninguém precisa saber.
      if (c.situacao === 'desconectado') {
        if (dono && c.ponte_dono === dono) meus.push({ salao_id: c.salao_id, nome: nomes.get(c.salao_id) || '', situacao: 'desconectado' })
        continue
      }
      const livre = !c.ponte_dono || c.ponte_dono === dono
        || !c.ponte_visto_em || c.ponte_visto_em < limite
      if (!dono) { meus.push({ salao_id: c.salao_id, nome: nomes.get(c.salao_id) || '', situacao: c.situacao }); continue }
      if (!livre) continue
      await supabaseAdmin.from('crm_canais')
        .update({ ponte_dono: dono, ponte_visto_em: agora.toISOString() })
        .eq('id', c.id)
      meus.push({ salao_id: c.salao_id, nome: nomes.get(c.salao_id) || '', situacao: c.situacao })
    }
    return NextResponse.json({ canais: meus })
  }

  const salaoId = params.get('salao') || ''
  if (!salaoId) return NextResponse.json({ error: 'salao é obrigatório' }, { status: 400 })

  // ── A hora marcada de cada mensagem ───────────────────────────────────────
  //
  // `criado_em` no futuro quer dizer "só manda a partir daí". É assim que o
  // espaçamento das campanhas funciona de verdade: sem este filtro, a ponte
  // pegava as 60 confirmações de uma vez e mandava a 50 por minuto -- que é
  // exatamente o que o espaçamento existe para evitar.
  const { data } = await supabaseAdmin
    .from('crm_mensagens')
    .select('id, texto, tipo, midia_url, responde_a, conversa:crm_conversas(contato:crm_contatos(telefone, lid))')
    .eq('salao_id', salaoId).eq('situacao', 'na_fila')
    .lte('criado_em', new Date().toISOString())
    .order('criado_em', { ascending: true }).limit(20)

  // A mensagem citada vai junto. A ponte precisa do id do WhatsApp e de quem
  // falou para montar a citacao; ela nao guarda historico nenhum.
  const citadas = new Map<string, any>()
  const idsCitados = (data || []).map((m: any) => m.responde_a).filter(Boolean)
  if (idsCitados.length) {
    const { data: orig } = await supabaseAdmin
      .from('crm_mensagens').select('id, id_whatsapp, texto, direcao')
      .in('id', idsCitados)
    for (const o of orig || []) citadas.set(o.id, o)
  }

  const fila = (data || []).map((m: any) => {
    const cit = m.responde_a ? citadas.get(m.responde_a) : null
    return {
      id: m.id,
      texto: m.texto,
      tipo: m.tipo || 'texto',
      midia_url: m.midia_url || null,
      telefone: m.conversa?.contato?.telefone || null,
      // Sem telefone, o LID e o endereco: e assim que se responde a cliente
      // que veio do historico de uma conta nova.
      lid: m.conversa?.contato?.lid || null,
      citada: cit?.id_whatsapp
        ? { id_whatsapp: cit.id_whatsapp, texto: cit.texto || '', minha: cit.direcao === 'saida' }
        : null,
    }
  // Telefone OU lid: a cliente que veio do histórico só com o id anônimo
  // também recebe resposta -- a ponte fala com ela pelo lid.
  }).filter(m => m.telefone || m.lid)

  // Marca como 'enviando' para a ponte não pegar a mesma mensagem duas vezes
  // se demorar a confirmar.
  if (fila.length) {
    await supabaseAdmin.from('crm_mensagens')
      .update({ situacao: 'enviando' })
      .in('id', fila.map(m => m.id))
  }

  return NextResponse.json({ fila })
}
