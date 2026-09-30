import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, crmBloqueado } from '@/lib/apiAuth'
import { acharOuCriarContato } from '@/lib/crmContatos'
import { normalizarTelefone } from '@/lib/crm'
import {
  carregarDisparos, gravarDisparos, carregarEstadosDisparo, lerDisparo, resumoDoDisparo,
  servicosDoSalao, perfisDoSalao, alvosDoDisparo, foraPorRecuperacao, dividirDia, textoPara, saudacaoPara, pacotePara, segundaPara, periodosDe, conversaDoContato, cabemPorDia, AUTOR_DISPARO, simularProximo,
  type Disparo,
} from '@/lib/crmDisparos'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Tela "Envio automático" (Mais Relatórios). A máquina que manda mora em
// src/lib/crmDisparos.ts e roda pelo cron do servidor; aqui só se configura,
// liga/desliga, vê os números e testa.

async function sessao() {
  const s = await getSessao()
  if (!s || s.role === 'profissional') return null
  return s
}

// A lista abre na hora; os números de cada envio vêm numa segunda chamada
// (?resumos=1), calculados em paralelo (dono, 30/09/2026: a página levava
// dezenas de segundos para abrir porque calculava envio por envio antes).
export async function GET(req: NextRequest) {
  const s = await sessao()
  if (!s) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (new URL(req.url).searchParams.get('resumos') === '1') {
    const disparos = await carregarDisparos(s.salaoId)
    const resumos: Record<string, any> = {}
    await Promise.all(disparos.map(async d => { resumos[d.id] = await resumoDoDisparo(s.salaoId, d).catch(() => null) }))
    return NextResponse.json({ resumos })
  }
  const [disparos, estados, servicos] = await Promise.all([
    carregarDisparos(s.salaoId), carregarEstadosDisparo(s.salaoId), servicosDoSalao(s.salaoId),
  ])
  return NextResponse.json({ disparos: disparos.map(d => ({ ...d, estado: estados[d.id] || null })), servicos })
}

export async function POST(req: NextRequest) {
  const s = await sessao()
  if (!s) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (await crmBloqueado()) return NextResponse.json({ error: 'Este acesso não tem o CRM liberado.' }, { status: 403 })
  const b = await req.json().catch(() => ({} as any))
  const salaoId = s.salaoId
  const disparos = await carregarDisparos(salaoId)

  // Prévia: quantas entram, quem são as primeiras e como a mensagem fica.
  if (b.acao === 'previa') {
    const d = lerDisparo({ ...b.disparo, id: b.disparo?.id || 'previa' })
    if (!d) return NextResponse.json({ error: 'Envio inválido' }, { status: 400 })
    const perfis = await perfisDoSalao(salaoId)
    const alvos = await alvosDoDisparo(salaoId, d, perfis)
    // Quem está numa recuperação (risco/perdidas) não entra nos outros envios.
    const recuperando = await foraPorRecuperacao(salaoId, d, perfis)
    const lista = alvos.lista.filter(x => !recuperando.has(x.chave))
    return NextResponse.json({
      total: lista.length, sem_celular: alvos.semCelular, repetidos: alvos.repetidos, sem_ciclo: alvos.sem_ciclo,
      na_recuperacao: alvos.lista.length - lista.length, agendadas: alvos.agendadas, por_dia: cabemPorDia(d),
      // Cada atalho de período com a MESMA conta do total (inclusive lembrete
      // de retorno e quem sai por estar na recuperação), para os números baterem.
      periodos: await Promise.all(periodosDe(perfis, d.publico).map(async o => {
        const r = await alvosDoDisparo(salaoId, { ...d, publico: { ...d.publico, ano_de: o.ano_de, ano_ate: o.ano_ate } }, perfis)
        return { ...o, total: r.lista.filter(x => !recuperando.has(x.chave)).length }
      })),
      amostra: lista.slice(0, 8).map((x, i) => ({
        cliente: x.cliente_nome, dias: x.dias, ultima_visita: x.ultima_visita,
        servico: x.servico_alvo || null, feito_em: x.feito_em || null, atraso: x.atraso ?? null,
        saudacao: saudacaoPara(d, x, i), mensagem: textoPara(d, x, i),
      })),
    })
  }

  // Simulação: o caminho inteiro de uma volta, sem mandar nada.
  if (b.acao === 'simular') {
    const d = lerDisparo({ ...b.disparo, id: b.disparo?.id || 'simulacao' })
    if (!d) return NextResponse.json({ error: 'Envio inválido' }, { status: 400 })
    return NextResponse.json(await simularProximo(salaoId, d))
  }

  // Teste: manda a mensagem (com os dados da 1ª cliente da lista) para um
  // número escolhido -- o do dono. Não marca ninguém como enviada.
  if (b.acao === 'teste') {
    const d = lerDisparo({ ...b.disparo, id: b.disparo?.id || 'teste' })
    const tel = normalizarTelefone(b.telefone)
    if (!d || !d.mensagens.length) return NextResponse.json({ error: 'Escreva a mensagem primeiro.' }, { status: 400 })
    if (tel.length < 12) return NextResponse.json({ error: 'Telefone inválido.' }, { status: 400 })
    const { lista } = await alvosDoDisparo(salaoId, d, await perfisDoSalao(salaoId))
    const modelo = lista[0] || { cliente_nome: 'Maria', dias: 120, ultima_visita: '', servicos: [] } as any
    const contato = await acharOuCriarContato(salaoId, tel)
    if (!contato) return NextResponse.json({ error: 'Não consegui criar o contato.' }, { status: 500 })
    const { conversa } = await conversaDoContato(salaoId, contato.id, 'aguardando')
    if (!conversa) return NextResponse.json({ error: 'Não consegui abrir a conversa.' }, { status: 500 })
    // Uma rodada por versão, na ordem que a cliente recebe: saudação,
    // mensagem, anexo (o anexo só na primeira, para não lotar o celular).
    const itens = [
      ...d.mensagens.flatMap((_, i) => pacotePara(d, modelo, i).filter(p => i === 0 || !p.midia_url)),
      ...(d.segunda.ligada ? d.segunda.mensagens.flatMap((_, i) => segundaPara(d, modelo, i)) : []),
    ]
    const agora = Date.now()
    await supabaseAdmin.from('crm_mensagens').insert(itens.map((p, i) => ({
      salao_id: salaoId, conversa_id: conversa.id, direcao: 'saida', texto: p.texto, tipo: p.tipo, midia_url: p.midia_url,
      situacao: 'na_fila', autor_nome: AUTOR_DISPARO + ' (teste)', em_massa: false,
      criado_em: new Date(agora + i * 5000).toISOString(),
    })))
    return NextResponse.json({ ok: true, enviadas: itens.length })
  }

  if (b.acao === 'salvar') {
    const novo = lerDisparo({ ...b.disparo, id: b.disparo?.id || `env_${Date.now().toString(36)}` })
    if (!novo) return NextResponse.json({ error: 'Envio inválido' }, { status: 400 })
    const i = disparos.findIndex(x => x.id === novo.id)
    // Ciclo, criação e ligado não vêm da tela de edição.
    if (i >= 0) { novo.ciclo = disparos[i].ciclo; novo.criado_em = disparos[i].criado_em; novo.ligado = disparos[i].ligado; disparos[i] = novo }
    else { novo.ligado = false; novo.ciclo = 1; novo.criado_em = new Date().toISOString(); disparos.push(novo) }
    await gravarDisparos(salaoId, disparos)
    return NextResponse.json({ ok: true, disparo: novo })
  }

  // "Limitar mensagens diárias": liga só os escolhidos, na ordem da tela, e
  // divide o total e o horário entre eles (dividirDia em crmDisparos.ts).
  if (b.acao === 'distribuir') {
    const ids: string[] = (Array.isArray(b.ids) ? b.ids : []).map(String).filter((id: string) => disparos.some(x => x.id === id))
    const semTexto = disparos.filter(x => ids.includes(x.id) && !x.mensagens.length).map(x => x.nome)
    if (semTexto.length) return NextResponse.json({ error: `Escreva a mensagem antes de ligar: ${semTexto.join(', ')}` }, { status: 400 })
    const total = Math.max(1, Math.min(500, Math.round(Number(b.total) || 0)))
    const ini = /^\d{2}:\d{2}$/.test(b.janela_ini) ? b.janela_ini : '09:00'
    const fim = /^\d{2}:\d{2}$/.test(b.janela_fim) ? b.janela_fim : '21:00'
    const fatias = dividirDia(ids, total, ini, fim)
    if (ids.length && !fatias.length) return NextResponse.json({ error: 'Horário inválido.' }, { status: 400 })
    for (const x of disparos) {
      const f = fatias.find(y => y.id === x.id)
      x.ligado = !!f
      if (f) Object.assign(x, { max_dia: f.max_dia, janela_ini: f.janela_ini, janela_fim: f.janela_fim, intervalo_min: f.intervalo_min })
    }
    await gravarDisparos(salaoId, disparos)
    return NextResponse.json({ ok: true, fatias })
  }

  const d = disparos.find(x => x.id === String(b.id || ''))
  if (!d) return NextResponse.json({ error: 'Envio não encontrado' }, { status: 404 })

  // Lista completa para conferir no Avec, cliente por cliente (dono,
  // 29/09/2026: "não pode ter erro de cálculo"). Mesma conta do envio.
  if (b.acao === 'exportar') {
    const perfis = await perfisDoSalao(salaoId)
    const alvos = await alvosDoDisparo(salaoId, d, perfis)
    const recuperando = await foraPorRecuperacao(salaoId, d, perfis)
    const { data: env } = await supabaseAdmin.from('crm_disparo_envios').select('chave, enviado_em')
      .eq('salao_id', salaoId).eq('disparo_id', d.id).eq('ciclo', d.ciclo).limit(20000)
    const enviado = new Map((env || []).map((r: any) => [r.chave, r.enviado_em]))
    return NextResponse.json({
      linhas: alvos.lista.map((x, i) => ({
        ordem: i + 1, cliente: x.cliente_nome, celular: x.celular, ultima_visita: x.ultima_visita, dias_sem_vir: x.dias,
        visitas: x.total_visitas, tipo: x.segmento, servico: x.servico_alvo || '', servico_feito_em: x.feito_em || '',
        venceu_ha_dias: x.atraso ?? '', ja_recebeu: enviado.get(x.envio_chave!) ? new Date(enviado.get(x.envio_chave!)).toLocaleDateString('pt-BR') : '',
        situacao: recuperando.has(x.chave) ? 'fora: está em risco/perdidas' : 'na fila',
      })),
    })
  }

  if (b.acao === 'ligar') {
    const ligar = b.ligado === true
    if (ligar && !d.mensagens.length) return NextResponse.json({ error: 'Escreva a mensagem antes de ligar.' }, { status: 400 })
    // Vários podem ficar ligados, cada um com seu período: o relógio manda um
    // por vez, na ordem da data de início (escolherDaVez em crmDisparos.ts).
    d.ligado = ligar
    await gravarDisparos(salaoId, disparos)
    if (ligar) {
      const estados = await carregarEstadosDisparo(salaoId)
      if (estados[d.id]) {
        estados[d.id] = { ...estados[d.id], concluido_em: null, situacao: 'Ligado agora' }
        await supabaseAdmin.from('salao_config').upsert({
          salao_id: salaoId, chave: 'crm_disparos_estado', valor: estados, atualizado_em: new Date().toISOString(),
        }, { onConflict: 'salao_id,chave' })
      }
    }
    return NextResponse.json({ ok: true })
  }

  if (b.acao === 'reiniciar') {
    // Novo ciclo: todas voltam a poder receber este envio. A memória do ciclo
    // anterior continua gravada (para os números), só não bloqueia mais.
    d.ciclo += 1
    d.ligado = false
    await gravarDisparos(salaoId, disparos)
    return NextResponse.json({ ok: true, ciclo: d.ciclo })
  }

  if (b.acao === 'excluir') {
    if (d.ligado) return NextResponse.json({ error: 'Pause o envio antes de excluir.' }, { status: 400 })
    await gravarDisparos(salaoId, disparos.filter(x => x.id !== d.id) as Disparo[])
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 })
}
