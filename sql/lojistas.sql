-- ============================================================
-- Módulo Lojistas (CRM de parcerias comerciais)
-- ------------------------------------------------------------
-- Cadastro de lojistas parceiros vindo do link público de
-- autocadastro (/lojista/[token]). Configurações do módulo
-- (link do grupo WhatsApp, mensagem automática, lista de
-- serviços) ficam em salao_config (chaves 'lojistas_config' e
-- 'lojistas_servicos') — não precisam de tabela própria.
--
-- Rode UMA VEZ no Supabase (SQL Editor). É idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS lojistas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salao_id uuid NOT NULL,
  nome text NOT NULL,
  celular text NOT NULL,
  data_aniversario date,
  email text,
  instagram text,
  nome_loja text NOT NULL,
  segmento text,
  bloco text,
  numero_loja text,
  servicos_interesse jsonb DEFAULT '[]'::jsonb,
  observacoes text,
  entrou_grupo boolean DEFAULT false,
  grupo_clicado_em timestamptz,
  situacao text NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'inativo')),
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE (salao_id, celular)
);

CREATE INDEX IF NOT EXISTS idx_lojistas_salao ON lojistas (salao_id, criado_em DESC);

ALTER TABLE lojistas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON lojistas;
CREATE POLICY "service_role_all" ON lojistas FOR ALL TO service_role USING (true) WITH CHECK (true);
