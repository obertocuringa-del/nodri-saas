-- ============================================================
-- 008_relatorio_periodos_prof_metricas.sql
-- Adiciona colunas de métricas por profissional na tabela relatorio_periodos
-- Execute no Supabase SQL Editor
-- ============================================================

ALTER TABLE relatorio_periodos ADD COLUMN IF NOT EXISTS prof_ticket      JSONB DEFAULT '[]';
ALTER TABLE relatorio_periodos ADD COLUMN IF NOT EXISTS prof_preferencia JSONB DEFAULT '[]';
ALTER TABLE relatorio_periodos ADD COLUMN IF NOT EXISTS prof_ocupacao    JSONB DEFAULT '[]';
ALTER TABLE relatorio_periodos ADD COLUMN IF NOT EXISTS prof_servicos    JSONB DEFAULT '[]';
ALTER TABLE relatorio_periodos ADD COLUMN IF NOT EXISTS prof_produtos    JSONB DEFAULT '[]';

-- Índice para buscas por período
CREATE INDEX IF NOT EXISTS idx_rel_per_salao_ano_mes ON relatorio_periodos(salao_id, ano, mes);
