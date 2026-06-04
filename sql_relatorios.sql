-- ============================================================
-- TABELAS DE RELATÓRIOS — Execute no Supabase SQL Editor
-- ============================================================

-- Dados por período (mês/ano) por salão
CREATE TABLE IF NOT EXISTS relatorio_periodos (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salao_id      UUID NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  ano           INTEGER NOT NULL,
  mes           INTEGER NOT NULL,
  data_inicio   TEXT,
  data_fim      TEXT,
  resumo_mensal     JSONB DEFAULT '[]',
  faturamento_diario JSONB DEFAULT '[]',
  servicos          JSONB DEFAULT '[]',
  produtos          JSONB DEFAULT '[]',
  prof_pagamentos   JSONB DEFAULT '[]',
  metas             JSONB DEFAULT '[]',
  importado_em  TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salao_id, ano, mes)
);

-- Feedbacks (histórico acumulado, sem duplicatas)
CREATE TABLE IF NOT EXISTS relatorio_feedbacks (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salao_id     UUID NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  ano          INTEGER,
  mes          INTEGER,
  profissional TEXT,
  tipo         TEXT,
  oque_houve   TEXT,
  comentario   TEXT,
  data_feedback TEXT,
  importado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salao_id, profissional, data_feedback, tipo, oque_houve)
);

CREATE INDEX IF NOT EXISTS idx_rel_periodos_salao ON relatorio_periodos(salao_id, ano, mes);
CREATE INDEX IF NOT EXISTS idx_rel_feedbacks_salao ON relatorio_feedbacks(salao_id);

ALTER TABLE relatorio_periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorio_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON relatorio_periodos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON relatorio_feedbacks FOR ALL USING (true) WITH CHECK (true);
