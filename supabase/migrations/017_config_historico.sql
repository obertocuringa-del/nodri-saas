-- ════════════════════════════════════════════════════════════════════════════
-- LIXEIRA DAS PÁGINAS — o que havia antes de uma atualização substituir
--
-- Em 17/08/2026 a aplicação de uma atualização do modelo gravou páginas por
-- cima do conteúdo de um salão, e não havia como voltar: o plano gratuito do
-- Supabase não guarda backup e `salao_config` não guarda versão anterior.
--
-- Daqui para frente, toda página que for SUBSTITUÍDA por uma atualização é
-- copiada para cá antes. Assim "atualizar" deixa de ser uma decisão sem volta:
-- o salão aplica, olha o resultado e desfaz se não gostou.
--
-- Não guarda tudo o que o salão digita no dia a dia — só o instante anterior a
-- uma substituição feita pelo sistema.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS salao_config_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id UUID NOT NULL,
  chave TEXT NOT NULL,
  valor JSONB,
  -- Todas as linhas gravadas na mesma aplicação compartilham este carimbo:
  -- é ele que permite desfazer a atualização inteira de uma vez.
  lote TEXT NOT NULL,
  motivo TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_hist_salao ON salao_config_historico (salao_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_config_hist_lote ON salao_config_historico (lote);

ALTER TABLE salao_config_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS salao_config_hist_service ON salao_config_historico;
CREATE POLICY salao_config_hist_service ON salao_config_historico
  FOR ALL TO service_role USING (true) WITH CHECK (true);
