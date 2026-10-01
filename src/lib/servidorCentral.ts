import { supabaseAdmin } from './supabase'

// ── O servidor contando como está, e os botões de reiniciar ─────────────────
//
// O vigia (scripts/vigia-servidor.sh) roda a cada minuto no servidor e manda
// para cá: quando o servidor ligou, memória, disco e os processos do pm2
// (nome, situação, reinícios -- SEM as variáveis de ambiente, que têm chaves).
// Na resposta ele recebe o que deve religar: o que o vigia achou parado
// (lib/saudeSistema) e o que o dono pediu pelo botão na Central do servidor.
//
// Tudo numa tabela só (servidor_estado), fechada: só o servidor do NODRI lê
// e escreve.

export type Alvo = 'robo' | 'ponte' | 'nodri' | 'relatorio' | 'servidor'
export const ALVOS: Record<Alvo, string> = {
  robo: 'Robô do Avec (extensão)',
  ponte: 'Ponte do WhatsApp',
  nodri: 'Site NODRI',
  relatorio: 'Robô do relatório (coleta)',
  servidor: 'Servidor inteiro',
}

export interface Processo {
  nome: string
  usuario: string
  status: string
  reinicios: number
  desde: number | null
  mem: number
  cpu: number
}

export interface EstadoServidor {
  vigia_em: string | null
  boot: string | null
  carga: number | null
  mem_total: number | null
  mem_usada: number | null
  disco_total: number | null
  disco_usado: number | null
  processos: Processo[]
  historico: { alvo: Alvo; em: string; origem: 'vigia' | 'botao'; motivo: string }[]
}

async function ler<T>(id: string, padrao: T): Promise<T> {
  const { data } = await supabaseAdmin.from('servidor_estado').select('valor').eq('id', id).maybeSingle()
  return ((data as any)?.valor as T) || padrao
}
async function gravar(id: string, valor: any) {
  await supabaseAdmin.from('servidor_estado').upsert({ id, valor, atualizado_em: new Date().toISOString() }, { onConflict: 'id' })
}

export const estadoVazio = (): EstadoServidor => ({
  vigia_em: null, boot: null, carga: null, mem_total: null, mem_usada: null,
  disco_total: null, disco_usado: null, processos: [], historico: [],
})

export const lerServidor = () => ler<EstadoServidor>('servidor', estadoVazio())

const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : null)

/** O vigia passou: guarda o retrato do servidor. */
export async function registrarServidor(info: any) {
  const atual = await lerServidor()
  const processos: Processo[] = (Array.isArray(info?.processos) ? info.processos : []).slice(0, 30).map((p: any) => ({
    nome: String(p?.nome || '').slice(0, 60),
    usuario: String(p?.usuario || '').slice(0, 20),
    status: String(p?.status || '').slice(0, 20),
    reinicios: Number(p?.reinicios) || 0,
    desde: num(p?.desde),
    mem: Number(p?.mem) || 0,
    cpu: Number(p?.cpu) || 0,
  }))
  await gravar('servidor', {
    ...atual,
    vigia_em: new Date().toISOString(),
    boot: info?.boot ? String(info.boot).slice(0, 40) : atual.boot,
    carga: num(info?.carga),
    mem_total: num(info?.mem_total), mem_usada: num(info?.mem_usada),
    disco_total: num(info?.disco_total), disco_usado: num(info?.disco_usado),
    processos,
  } satisfies EstadoServidor)
}

/** Anota no histórico o que vai ser religado (pelo vigia ou pelo botão). */
export async function anotarReinicio(itens: { alvo: Alvo; origem: 'vigia' | 'botao'; motivo: string }[]) {
  if (!itens.length) return
  const atual = await lerServidor()
  const agora = new Date().toISOString()
  atual.historico = [...(atual.historico || []), ...itens.map(i => ({ ...i, em: agora }))].slice(-60)
  await gravar('servidor', atual)
}

/** Botão da Central: entra na fila; o vigia leva no próximo minuto. */
export async function pedirReinicio(alvo: Alvo, por: string) {
  const fila = await ler<{ fila: { alvo: Alvo; em: string; por: string }[] }>('pedidos', { fila: [] })
  if (fila.fila.some(p => p.alvo === alvo)) return
  fila.fila.push({ alvo, em: new Date().toISOString(), por })
  await gravar('pedidos', fila)
}

export async function pedidosPendentes() {
  return (await ler<{ fila: { alvo: Alvo; em: string; por: string }[] }>('pedidos', { fila: [] })).fila
}

/** O vigia passou: tira os pedidos da fila e devolve. */
export async function consumirPedidos(): Promise<Alvo[]> {
  const fila = await pedidosPendentes()
  if (!fila.length) return []
  await gravar('pedidos', { fila: [] })
  await anotarReinicio(fila.map(p => ({ alvo: p.alvo, origem: 'botao' as const, motivo: `pedido por ${p.por}` })))
  return [...new Set(fila.map(p => p.alvo))]
}
