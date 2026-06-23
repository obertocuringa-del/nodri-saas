-- ============================================================
-- Índice opcional p/ a verificação de frescor do cache
-- ------------------------------------------------------------
-- O cache de atendimentos confere o "último registro inserido"
-- por salão (ORDER BY criado_em DESC LIMIT 1). Este índice deixa
-- essa checagem instantânea. Seguro: só adiciona velocidade.
--
-- OBS: os índices principais de atendimentos_raw
-- (salao_id+ano+mes, salao_id+cliente, salao_id+profissional)
-- JÁ EXISTEM (ver supabase_clientes_migration.sql) — não precisa recriar.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_atendimentos_salao_criado
  ON atendimentos_raw (salao_id, criado_em DESC);
