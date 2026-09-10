import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// ── Instalação das tabelas do CRM ───────────────────────────────────────────
//
// Mesmo caminho que /api/relatorios/setup-clientes já usa: a função exec_sql
// do Supabase. Existir aqui evita depender de alguém abrir o painel do
// Supabase e colar SQL à mão — passo manual não acontece, e quando acontece
// acontece errado.
//
// O SQL é FIXO, escrito neste arquivo. A rota não aceita SQL de fora: uma
// porta que executa o que mandarem, ainda que só para o dono, é uma porta
// que um dia executa o que não devia.
//
// Tudo é CREATE ... IF NOT EXISTS. Rodar de novo não apaga nada e não
// duplica nada — pode ser chamada quantas vezes for preciso.

const COMANDOS: string[] = [
  `CREATE TABLE IF NOT EXISTS crm_canais (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salao_id uuid NOT NULL,
    numero text, nome_exibicao text,
    situacao text NOT NULL DEFAULT 'desconectado',
    qr text, qr_expira_em timestamptz, sessao jsonb,
    visto_em timestamptz, erro text,
    criado_em timestamptz DEFAULT now(), atualizado_em timestamptz DEFAULT now())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_canal_salao ON crm_canais(salao_id)`,

  `CREATE TABLE IF NOT EXISTS crm_contatos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salao_id uuid NOT NULL,
    telefone text NOT NULL, telefone_bruto text,
    nome text, nome_agenda text, cliente_nome text,
    etiquetas text[] DEFAULT '{}', observacao text,
    criado_em timestamptz DEFAULT now(), atualizado_em timestamptz DEFAULT now())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contato_tel ON crm_contatos(salao_id, telefone)`,

  `CREATE TABLE IF NOT EXISTS crm_conversas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salao_id uuid NOT NULL,
    contato_id uuid NOT NULL REFERENCES crm_contatos(id) ON DELETE CASCADE,
    estado text NOT NULL DEFAULT 'acao_necessaria',
    assunto text, proxima_acao text, prazo timestamptz,
    dono_id uuid, dono_nome text, dono_ate timestamptz,
    aguardando_desde timestamptz,
    ultima_em timestamptz, ultima_de text, ultima_previa text,
    nao_lidas int NOT NULL DEFAULT 0,
    motivo_perda text, valor_estimado numeric, fechada_em timestamptz,
    criado_em timestamptz DEFAULT now(), atualizado_em timestamptz DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS idx_crm_conv_fila ON crm_conversas(salao_id, estado, aguardando_desde)`,
  `CREATE INDEX IF NOT EXISTS idx_crm_conv_contato ON crm_conversas(salao_id, contato_id)`,
  `CREATE INDEX IF NOT EXISTS idx_crm_conv_prazo ON crm_conversas(salao_id, prazo)`,

  `CREATE TABLE IF NOT EXISTS crm_mensagens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salao_id uuid NOT NULL,
    conversa_id uuid NOT NULL REFERENCES crm_conversas(id) ON DELETE CASCADE,
    direcao text NOT NULL, texto text, tipo text DEFAULT 'texto', midia_url text,
    situacao text NOT NULL DEFAULT 'enviada',
    tentativas int NOT NULL DEFAULT 0, erro text, id_whatsapp text,
    autor_id uuid, autor_nome text,
    criado_em timestamptz DEFAULT now(), enviado_em timestamptz)`,
  `CREATE INDEX IF NOT EXISTS idx_crm_msg_conversa ON crm_mensagens(conversa_id, criado_em)`,
  `CREATE INDEX IF NOT EXISTS idx_crm_msg_fila ON crm_mensagens(salao_id, situacao) WHERE situacao = 'na_fila'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_msg_wpp ON crm_mensagens(salao_id, id_whatsapp) WHERE id_whatsapp IS NOT NULL`,

  `CREATE TABLE IF NOT EXISTS crm_eventos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salao_id uuid NOT NULL,
    conversa_id uuid NOT NULL REFERENCES crm_conversas(id) ON DELETE CASCADE,
    tipo text NOT NULL, de_estado text, para_estado text,
    autor_id uuid, autor_nome text, detalhe text,
    criado_em timestamptz DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS idx_crm_ev_conversa ON crm_eventos(conversa_id, criado_em)`,
  `CREATE INDEX IF NOT EXISTS idx_crm_ev_salao ON crm_eventos(salao_id, criado_em)`,

  `CREATE TABLE IF NOT EXISTS crm_modelos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salao_id uuid NOT NULL, nome text NOT NULL, texto text NOT NULL,
    atalho text, ordem int DEFAULT 0, ativo boolean DEFAULT true,
    criado_em timestamptz DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS idx_crm_modelos_salao ON crm_modelos(salao_id, ordem)`,

  `CREATE TABLE IF NOT EXISTS crm_motivos_perda (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salao_id uuid NOT NULL, nome text NOT NULL,
    ordem int DEFAULT 0, ativo boolean DEFAULT true,
    criado_em timestamptz DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS idx_crm_motivos_salao ON crm_motivos_perda(salao_id, ordem)`,
]

export async function POST() {
  const sess = await getSessao()
  if (!sess) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if (sess.role !== 'salon' && sess.role !== 'master') {
    return NextResponse.json({ error: 'Só o dono do salão pode instalar.' }, { status: 403 })
  }

  const erros: string[] = []
  let feitos = 0
  for (const sql of COMANDOS) {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql })
      if (error && !String(error.message || '').includes('already exists')) {
        erros.push(String(error.message).slice(0, 200))
      } else feitos++
    } catch (e: any) {
      erros.push(String(e?.message || e).slice(0, 200))
    }
  }

  // Confere de verdade: rodar o comando sem erro não prova que a tabela existe
  // — a função pode ter engolido a falha. Uma leitura em cada tabela prova.
  const tabelas = ['crm_canais', 'crm_contatos', 'crm_conversas', 'crm_mensagens',
                   'crm_eventos', 'crm_modelos', 'crm_motivos_perda']
  const conferencia: Record<string, boolean> = {}
  for (const t of tabelas) {
    const { error } = await supabaseAdmin.from(t).select('id', { count: 'exact', head: true }).limit(1)
    conferencia[t] = !error
  }
  const faltando = tabelas.filter(t => !conferencia[t])

  return NextResponse.json({
    ok: faltando.length === 0,
    comandos_executados: feitos,
    tabelas: conferencia,
    faltando: faltando.length ? faltando : undefined,
    erros: erros.length ? erros : undefined,
  })
}
