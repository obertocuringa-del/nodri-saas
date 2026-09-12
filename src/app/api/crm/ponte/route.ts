import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizarTelefone, chaveTelefone, proximaAcaoPadrao } from '@/lib/crm'
import { baterRelogio } from '@/lib/crmRelogio'

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
async function acharOuCriarContato(
  salaoId: string, telefoneBruto: string, nomeAgenda?: string, lid?: string | null,
) {
  const telefone = normalizarTelefone(telefoneBruto)
  const lidLimpo = String(lid || '').trim() || null
  if (!telefone && !lidLimpo) return null

  const { data: existentes } = await supabaseAdmin
    .from('crm_contatos').select('*').eq('salao_id', salaoId)
  const lista = existentes || []

  // Compara pela chave sem o nono dígito: 61 9 9999 e 61 9999 são a mesma pessoa.
  const alvo = telefone ? chaveTelefone(telefone) : ''
  let achado = alvo ? lista.find((c: any) => c.telefone && chaveTelefone(c.telefone) === alvo) : null
  if (!achado && lidLimpo) achado = lista.find((c: any) => c.lid === lidLimpo)

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
      .from('crm_canais').select('id').eq('salao_id', salaoId).maybeSingle()
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
    const { data: jaVistos } = await supabaseAdmin
      .from('crm_lid_cache').select('telefone').eq('salao_id', salaoId).limit(10000)
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

    const { data: todos } = await supabaseAdmin
      .from('crm_contatos').select('id, telefone, lid, nome').eq('salao_id', salaoId)

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
    const { data: contatosExistentes } = await supabaseAdmin
      .from('crm_contatos').select('id, telefone, lid, nome').eq('salao_id', salaoId)

    const porChave = new Map<string, any>()
    // Chave: telefone normalizado quando existe, senão o lid. Uma só, para o
    // lote inteiro, em vez de dois caminhos de código para o mesmo assunto.
    const chaveDe = (x: any) => x?.telefone ? chaveTelefone(x.telefone) : (x?.lid ? 'lid:' + x.lid : '')
    for (const c of contatosExistentes || []) {
      const k = chaveDe(c)
      if (k) porChave.set(k, c)
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
      for (const n of novos || []) { const k = chaveDe(n); if (k) porChave.set(k, n) }
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

    const { data: abertasExistentes } = await supabaseAdmin
      .from('crm_conversas').select('id, contato_id, estado, ultima_em')
      .eq('salao_id', salaoId).in('contato_id', idsContato)
      .not('estado', 'in', '("agendado","sem_conversao")')

    const porContato = new Map<string, any>()
    for (const cv of abertasExistentes || []) {
      const anterior = porContato.get(cv.contato_id)
      if (!anterior || (cv.ultima_em || '') > (anterior.ultima_em || '')) {
        porContato.set(cv.contato_id, cv)
      }
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
        const estado = r.daCliente ? 'acao_necessaria' : 'aguardando'
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
      await supabaseAdmin.from('crm_conversas').update({
        ultima_em: r.quando,
        ultima_de: r.daCliente ? 'cliente' : 'salao',
        ultima_previa: String(r.ultima.texto || '').slice(0, 120),
        atualizado_em: agora,
      }).eq('id', conversa.id)
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
  if (!telefone && !body?.lid) {
    return NextResponse.json({ error: 'telefone ou lid é obrigatório' }, { status: 400 })
  }

  const contato = await acharOuCriarContato(salaoId, telefone, body?.nome, body?.lid)
  if (!contato) return NextResponse.json({ error: 'sem telefone e sem lid' }, { status: 400 })

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
    .not('estado', 'in', '("agendado","sem_conversao")')
    .order('ultima_em', { ascending: false }).limit(1)

  let conversa = (abertas || [])[0]

  // ── Disparo em massa ──────────────────────────────────────────────────────
  //
  // O caso que fazia o salão perder cliente: a pessoa pergunta um preço, e
  // pouco depois sai um disparo de lista para todo mundo. A mensagem do
  // disparo é do salão, então pela regra normal a conversa sairia de "Preciso
  // agir" — e a pergunta dela ficaria enterrada embaixo de um texto que não
  // era para ela.
  //
  // Um disparo é reconhecido de dois jeitos: pela marca de lista de
  // transmissão que o WhatsApp manda, e pelo texto idêntico saindo para mais
  // de uma pessoa em poucos minutos (que é como o salão de fato dispara,
  // copiando e colando). Quando é disparo, a mensagem é gravada e mostrada,
  // mas NÃO mexe no estado da conversa: quem estava esperando continua
  // esperando.
  const JANELA_DISPARO_MIN = 15
  let emMassa = !!body?.em_massa
  let irmas: any[] = []

  if (!daCliente && !emMassa && texto.trim().length > 0) {
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

    // Mesmo texto para outra pessoa: é disparo já na segunda.
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

    // Último recurso: volume. Ninguém responde seis pessoas diferentes em
    // quinze minutos digitando uma a uma no celular -- isso é lista. Fica
    // alto de propósito, para nunca pegar a recepção numa manhã movimentada.
    if (!emMassa) {
      const pessoas = new Set(outras.map((m: any) => m.conversa_id))
      if (pessoas.size >= 6) emMassa = true
    }
  }


  if (!conversa) {
    // Disparo para quem nunca falou com o salão não abre oportunidade: seria
    // inventar uma conversa que ninguém teve. E nasce em "Aguardando
    // promoção", não em "Aguardando cliente": cem disparos por dia caindo na
    // mesma pasta das conversas de verdade fazem a recepção parar de abrir a
    // pasta -- e aí a espera que importa se perde no meio do disparo.
    const estado = daCliente
      ? 'acao_necessaria'
      : (emMassa ? 'aguardando_promo' : 'aguardando')
    const { data: nova } = await supabaseAdmin.from('crm_conversas').insert({
      salao_id: salaoId,
      contato_id: contato.id,
      estado,
      importada: emMassa,
      proxima_acao: proximaAcaoPadrao(estado as any),
      aguardando_desde: daCliente ? agora : null,
      ultima_em: agora,
      ultima_de: daCliente ? 'cliente' : 'salao',
      ultima_previa: texto.slice(0, 120),
      nao_lidas: daCliente ? 1 : 0,
    }).select().maybeSingle()
    conversa = nova
  } else if (daCliente) {
    // A cliente respondeu: volta para a fila e o relógio recomeça. Só marca o
    // início da espera se ela ainda não estava esperando, senão um cliente que
    // manda cinco mensagens seguidas zeraria o próprio atraso a cada uma.
    await supabaseAdmin.from('crm_conversas').update({
      estado: 'acao_necessaria',
      proxima_acao: proximaAcaoPadrao('acao_necessaria'),
      aguardando_desde: conversa.aguardando_desde || agora,
      ultima_em: agora,
      ultima_de: 'cliente',
      ultima_previa: texto.slice(0, 120),
      nao_lidas: (conversa.nao_lidas || 0) + 1,
      atualizado_em: agora,
    }).eq('id', conversa.id)
  } else if (!emMassa) {
    // Resposta de verdade, digitada no celular: vale como resposta e a bola
    // passa para a cliente, exatamente como se tivesse sido escrita aqui.
    await supabaseAdmin.from('crm_conversas').update({
      estado: 'aguardando',
      proxima_acao: proximaAcaoPadrao('aguardando'),
      aguardando_desde: null,
      ultima_em: agora,
      ultima_de: 'salao',
      ultima_previa: texto.slice(0, 120),
      nao_lidas: 0,
      atualizado_em: agora,
    }).eq('id', conversa.id)
  } else if (conversa.estado === 'aguardando') {
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
    await supabaseAdmin.from('crm_conversas').update({
      estado: 'aguardando_promo',
      proxima_acao: proximaAcaoPadrao('aguardando_promo'),
      aguardando_desde: null,
      ultima_em: agora,
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
    enviado_em: daCliente ? null : agora,
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

  if (daCliente) {
    await supabaseAdmin.from('crm_eventos').insert({
      salao_id: salaoId, conversa_id: conversa.id, tipo: 'entrou',
      para_estado: 'acao_necessaria', autor_nome: contato.nome || 'Cliente',
    })
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

    const { data } = await supabaseAdmin
      .from('crm_canais').select('id, salao_id, situacao, ponte_dono, ponte_visto_em')
      .neq('situacao', 'desconectado')

    const meus: any[] = []
    for (const c of data || []) {
      const livre = !c.ponte_dono || c.ponte_dono === dono
        || !c.ponte_visto_em || c.ponte_visto_em < limite
      if (!dono) { meus.push({ salao_id: c.salao_id, situacao: c.situacao }); continue }
      if (!livre) continue
      await supabaseAdmin.from('crm_canais')
        .update({ ponte_dono: dono, ponte_visto_em: agora.toISOString() })
        .eq('id', c.id)
      meus.push({ salao_id: c.salao_id, situacao: c.situacao })
    }
    return NextResponse.json({ canais: meus })
  }

  const salaoId = params.get('salao') || ''
  if (!salaoId) return NextResponse.json({ error: 'salao é obrigatório' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('crm_mensagens')
    .select('id, texto, tipo, midia_url, responde_a, conversa:crm_conversas(contato:crm_contatos(telefone, lid))')
    .eq('salao_id', salaoId).eq('situacao', 'na_fila')
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
  }).filter(m => m.telefone)

  // Marca como 'enviando' para a ponte não pegar a mesma mensagem duas vezes
  // se demorar a confirmar.
  if (fila.length) {
    await supabaseAdmin.from('crm_mensagens')
      .update({ situacao: 'enviando' })
      .in('id', fila.map(m => m.id))
  }

  return NextResponse.json({ fila })
}
