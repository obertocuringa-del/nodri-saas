// ── Robô do Avec no servidor ─────────────────────────────────────────────────
//
// 26/09/2026, decisão do dono: a extensão do Avec deixa de depender do Chrome
// do computador do salão. No servidor NODRI roda um Chrome por salão, com a
// MESMA extensão (uma pasta só -- atualizar é trocar a pasta uma vez).
//
// O que mora aqui, por salão (salao_config, chave CHAVE_ROBO):
//   no_servidor  -- a chave da virada. Ligada: o servidor lê o Avec e a
//                   extensão do computador do salão fica parada (a rota da
//                   extensão responde "nada a fazer" para ela). Desligada:
//                   volta tudo para o salão. Nunca os dois ao mesmo tempo.
//   email        -- o login do Avec que o robô usa.
//   senha_cifra  -- a senha, CIFRADA (AES-256-GCM). A tela nunca a devolve;
//                   só o robô do servidor, pela porta de serviço, recebe.
//
// A chave da cifra sai da service role do Supabase, que só existe no
// servidor do NODRI: quem ler o banco sozinho não abre a senha.

import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

export const CHAVE_ROBO = 'crm_robo_avec'

export interface RoboAvec {
  no_servidor: boolean
  email: string
  senha_cifra: string
  atualizado_em: string | null
}

function chaveCifra(): Buffer {
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!base) throw new Error('Sem chave para cifrar')
  return crypto.createHash('sha256').update('nodri-robo-avec-v1:' + base).digest()
}

export function cifrar(texto: string): string {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', chaveCifra(), iv)
  const dados = Buffer.concat([c.update(texto, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), dados].map(b => b.toString('base64')).join('.')
}

export function decifrar(cifra: string): string {
  const [iv, tag, dados] = String(cifra || '').split('.').map(p => Buffer.from(p, 'base64'))
  if (!iv?.length || !tag?.length || !dados) throw new Error('Senha guardada ilegível')
  const d = crypto.createDecipheriv('aes-256-gcm', chaveCifra(), iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(dados), d.final()]).toString('utf8')
}

export function lerRobo(v: any): RoboAvec {
  return {
    no_servidor: v?.no_servidor === true,
    email: String(v?.email || '').trim(),
    senha_cifra: String(v?.senha_cifra || ''),
    atualizado_em: v?.atualizado_em || null,
  }
}

export async function carregarRobo(salaoId: string): Promise<RoboAvec> {
  const { data } = await supabaseAdmin.from('salao_config').select('valor')
    .eq('salao_id', salaoId).eq('chave', CHAVE_ROBO).maybeSingle()
  return lerRobo(data?.valor)
}

export async function gravarRobo(salaoId: string, robo: RoboAvec) {
  const agora = new Date().toISOString()
  await supabaseAdmin.from('salao_config').upsert({
    salao_id: salaoId, chave: CHAVE_ROBO,
    valor: { ...robo, atualizado_em: agora }, atualizado_em: agora,
  }, { onConflict: 'salao_id,chave' })
}

/** O que a tela pode ver: nunca a senha, só se ela existe. */
export function roboParaTela(r: RoboAvec) {
  return { no_servidor: r.no_servidor, email: r.email, tem_senha: !!r.senha_cifra }
}
