import { supabaseAdmin } from '@/lib/supabase'

// ── O WhatsApp está em pé para receber mensagem nova? ───────────────────────
//
// Nasceu em 03/10/2026, do bloqueio do número do Rouge.
//
// O envio automático (as listas) já se protegia: `saudeDoWhatsapp` em
// crmDisparos.ts pausa quando o canal está desconectado. O comentário de lá
// dizia, em 30/09, que "confirmação e feedback continuam por conta deles" --
// só que eles não tinham conta nenhuma. Enfileiravam no vazio.
//
// O que isso custou: o WhatsApp foi bloqueado em 02/10 às 17:10 e, nas 24 h
// seguintes, feedback, confirmação e aviso ao profissional continuaram
// empilhando mensagens que ninguém podia entregar. Chegaram a 243. Se a ponte
// reconectasse, elas sairiam em poucos minutos -- a ponte pede a fila a cada
// segundo e leva 20 por vez --, repetindo em rajada exatamente o disparo que
// causou o bloqueio, e com conteúdo vencido: confirmação de um dia que já
// passou, feedback de dois dias atrás, aviso de cliente que já foi embora.
//
// Mensagem de automação só faz sentido se puder sair AGORA. Não saindo, o
// certo é não criar: quando o número voltar, o que importa é o que acontecer
// dali para a frente.
//
// Isto NÃO vale para mensagem que a recepção escreve à mão: essa é decisão de
// gente, fica na fila e sai quando der.

/** Minutos sem sinal da ponte para considerar o canal fora do ar. */
const SEM_SINAL_MIN = 5

/**
 * `null` quando dá para enfileirar; o motivo (texto curto) quando não dá.
 * O motivo vai para a tela, então é escrito para o dono ler.
 */
export async function canalPronto(salaoId: string): Promise<string | null> {
  const { data: canal } = await supabaseAdmin
    .from('crm_canais').select('situacao, visto_em').eq('salao_id', salaoId).maybeSingle()

  // Salão sem canal nenhum não usa WhatsApp: não é problema, e também não há
  // o que enfileirar.
  if (!canal) return 'O salão não tem WhatsApp ligado no CRM'
  if (canal.situacao !== 'conectado') return 'O WhatsApp do salão está desconectado'
  if (!canal.visto_em || Date.now() - new Date(canal.visto_em).getTime() > SEM_SINAL_MIN * 60_000) {
    return `A ponte do WhatsApp não dá sinal há mais de ${SEM_SINAL_MIN} minutos`
  }
  return null
}
