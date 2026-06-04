-- ============================================================
-- TABELA: profissionais
-- Execute no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS profissionais (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salao_id            UUID NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  nome_completo       TEXT NOT NULL,
  apelido             TEXT,
  email               TEXT,
  cpf                 TEXT,
  rg                  TEXT,
  cnpj                TEXT,
  cargo               TEXT DEFAULT 'Profissional',
  habilidades         TEXT,
  endereco            TEXT,
  data_aniversario    DATE,
  foto_url            TEXT,
  cor_favorita        TEXT,
  comida_favorita     TEXT,
  animal_favorito     TEXT,
  hobbies             TEXT,
  um_sonho            TEXT,
  contato_responsavel TEXT,
  certificados        TEXT,
  ativo               BOOLEAN DEFAULT true,
  criado_em           TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca por salão
CREATE INDEX IF NOT EXISTS idx_profissionais_salao_id ON profissionais(salao_id);
CREATE INDEX IF NOT EXISTS idx_profissionais_ativo ON profissionais(salao_id, ativo);

-- RLS
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;

-- Apenas service_role (backend) acessa — a API Next.js usa supabaseAdmin
CREATE POLICY "service_role_all" ON profissionais
  FOR ALL USING (true) WITH CHECK (true);
