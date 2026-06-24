-- ============================================================
-- Tabela de CONTATOS de recuperação (botão WhatsApp em Em Risco / Perdidos)
-- ------------------------------------------------------------
-- Cada clique em "registrar" grava aqui. É o que alimenta:
--   • a trava do botão (servidor, além do localStorage)
--   • a aba "Recuperadas" (contatados, recuperados, bônus da recepção)
--   • a contagem de quantas vezes cada cliente já foi contatado (1x, 2x...)
--
-- Rode UMA VEZ no Supabase (SQL Editor). É idempotente (IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS clientes_contatos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salao_id uuid NOT NULL,
  cliente_nome text NOT NULL,
  celular text,
  origem text,
  recepcionista_id uuid,
  recepcionista_nome text,
  mensagem text,
  contato_em timestamptz DEFAULT now(),
  criado_em timestamptz DEFAULT now()
);

-- Índices para as consultas por salão e por cliente
CREATE INDEX IF NOT EXISTS idx_clientes_contatos_salao ON clientes_contatos (salao_id, contato_em DESC);
CREATE INDEX IF NOT EXISTS idx_clientes_contatos_cliente ON clientes_contatos (salao_id, cliente_nome);

-- Acesso pelo backend (service_role)
ALTER TABLE clientes_contatos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON clientes_contatos;
CREATE POLICY "service_role_all" ON clientes_contatos FOR ALL TO service_role USING (true) WITH CHECK (true);
