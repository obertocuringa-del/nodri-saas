-- ============================================================
-- 007_profissionais_metricas.sql
-- Adiciona checklist de onboarding + tabela de métricas mensais
-- Execute no Supabase SQL Editor
-- ============================================================

-- Adicionar colunas de checklist na tabela profissionais existente
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS ficha_entrevista      BOOLEAN DEFAULT false;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS processo_contratacao  BOOLEAN DEFAULT false;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS materiais_trabalho    BOOLEAN DEFAULT false;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS perfil_ideal          BOOLEAN DEFAULT false;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS horarios_folgas       BOOLEAN DEFAULT false;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS distrato              BOOLEAN DEFAULT false;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS contrato_trabalho     BOOLEAN DEFAULT false;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS tem_certificados      BOOLEAN DEFAULT false;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS plano_carreira        BOOLEAN DEFAULT false;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS conta_bancaria        TEXT;

-- Tabela de métricas mensais por profissional
CREATE TABLE IF NOT EXISTS prof_metricas_mensais (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id                 UUID NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  profissional_id          UUID NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
  ano                      INTEGER NOT NULL,
  mes                      INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  faturamento              DECIMAL(12,2) DEFAULT 0,
  ticket_medio             DECIMAL(10,2) DEFAULT 0,
  clientes_preferencia     INTEGER DEFAULT 0,
  clientes_sem_preferencia INTEGER DEFAULT 0,
  dias_trabalhados         DECIMAL(5,1) DEFAULT 0,
  taxa_ocupacao            DECIMAL(5,2) DEFAULT 0,
  total_servicos           INTEGER DEFAULT 0,
  total_produtos           INTEGER DEFAULT 0,
  servicos_detalhados      JSONB DEFAULT '[]',
  criado_em                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profissional_id, ano, mes)
);

-- RLS
ALTER TABLE prof_metricas_mensais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "srall_prof_met" ON prof_metricas_mensais;
CREATE POLICY "srall_prof_met" ON prof_metricas_mensais FOR ALL USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_prof_met_prof    ON prof_metricas_mensais(profissional_id);
CREATE INDEX IF NOT EXISTS idx_prof_met_periodo ON prof_metricas_mensais(salao_id, ano, mes);
