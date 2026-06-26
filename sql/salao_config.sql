-- Armazenamento genérico de configurações/documentos por salão (chave-valor JSON).
-- Usado pela página "Materiais para Trabalho" (planilha editável) e reutilizável para outros.
-- Rode UMA VEZ no Supabase (SQL Editor). Idempotente.

CREATE TABLE IF NOT EXISTS salao_config (
  salao_id uuid NOT NULL,
  chave text NOT NULL,
  valor jsonb,
  atualizado_em timestamptz DEFAULT now(),
  PRIMARY KEY (salao_id, chave)
);

ALTER TABLE salao_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS salao_config_service ON salao_config;
CREATE POLICY salao_config_service ON salao_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);
