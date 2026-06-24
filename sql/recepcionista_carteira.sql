-- ============================================================
-- CARTEIRA DAS RECEPCIONISTAS (bônus, pagamentos e jogos)
-- ------------------------------------------------------------
-- Razão (ledger) de tudo que mexe no saldo de cada recepcionista:
--   • bonus        (+) crédito do bônus conquistado na recuperação
--   • pagamento    (-) pagamento total
--   • adiantamento (-) pagamento parcial
--   • jogo_aposta  (-) valor apostado na Sala de Recompensas
--   • jogo_premio  (+) prêmio ganho no jogo
--   • ajuste       (+/-) ajuste manual
--
-- Saldo de uma recepcionista = SOMA(valor) dos movimentos dela.
--
-- Rode UMA VEZ no Supabase (SQL Editor). Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS recepcionista_movimentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salao_id uuid NOT NULL,
  recepcionista_nome text NOT NULL,
  tipo text NOT NULL,             -- bonus | pagamento | adiantamento | jogo_aposta | jogo_premio | ajuste
  valor numeric NOT NULL,         -- positivo credita, negativo debita
  jogo text,                      -- nome do jogo (ex: roda_sorte), quando aplicável
  descricao text,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recep_mov_salao ON recepcionista_movimentos (salao_id, recepcionista_nome);
CREATE INDEX IF NOT EXISTS idx_recep_mov_criado ON recepcionista_movimentos (salao_id, criado_em DESC);

ALTER TABLE recepcionista_movimentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON recepcionista_movimentos;
CREATE POLICY "service_role_all" ON recepcionista_movimentos FOR ALL TO service_role USING (true) WITH CHECK (true);
