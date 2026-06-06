-- Tabela de análise pré-computada por profissional
CREATE TABLE IF NOT EXISTS ia_analise_profissional (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id        UUID NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
  analise         TEXT NOT NULL,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salao_id, profissional_id)
);

ALTER TABLE ia_analise_profissional ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srall_ia_analise" ON ia_analise_profissional FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_ia_analise_prof ON ia_analise_profissional(salao_id, profissional_id);
