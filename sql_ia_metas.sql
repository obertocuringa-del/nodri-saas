-- Tabela para armazenar metas do salão e por profissional (acessível pela IA)
CREATE TABLE IF NOT EXISTS ia_metas_salao (
  salao_id    uuid NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  ano         int  NOT NULL,
  mes         int  NOT NULL,
  meta_tipo   text NOT NULL DEFAULT 'valor',   -- 'valor' | 'pct'
  meta_valor  numeric NOT NULL DEFAULT 0,       -- meta bruta total do salão
  meta_pct    numeric NOT NULL DEFAULT 0,       -- percentual (se tipo = 'pct')
  meta_em_comissoes numeric NOT NULL DEFAULT 0, -- meta convertida em comissões
  metas_profissionais jsonb NOT NULL DEFAULT '[]', -- array com meta de cada profissional
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (salao_id, ano, mes)
);

-- RLS
ALTER TABLE ia_metas_salao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salão acessa apenas suas metas"
  ON ia_metas_salao FOR ALL
  USING (salao_id = current_setting('app.salao_id', true)::uuid);
