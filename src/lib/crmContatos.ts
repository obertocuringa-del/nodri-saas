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

  if (!achado && lidLimpo) {
    const { data } = await supabaseAdmin
      .from('crm_contatos').select('*')
      .eq('salao_id', salaoId).eq('lid', lidLimpo).limit(1)
    achado = (data || [])[0] || null
  }

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

