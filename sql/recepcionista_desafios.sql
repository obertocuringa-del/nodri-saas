-- ============================================================
-- DESAFIOS 1×1 entre recepcionistas (Sala de Recompensas)
-- ------------------------------------------------------------
-- Uma desafia a outra com uma aposta; o pote (2× a aposta) vai
-- para a vencedora. Os débitos/créditos do saldo são registrados
-- em recepcionista_movimentos (tipos desafio_aposta/desafio_premio/
-- desafio_estorno). Esta tabela guarda o histórico dos duelos.
--
-- Rode UMA VEZ no Supabase (SQL Editor). Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS recepcionista_desafios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salao_id uuid NOT NULL,
  desafiante text NOT NULL,
  desafiado text NOT NULL,
  aposta numeric NOT NULL,
  status text NOT NULL DEFAULT 'pendente',   -- pendente | concluido | recusado
  vencedor text,
  resultado jsonb,
  criado_em timestamptz DEFAULT now(),
  resolvido_em timestamptz
);

CREATE INDEX IF NOT EXISTS idx_recep_desafios_salao ON recepcionista_desafios (salao_id, criado_em DESC);

ALTER TABLE recepcionista_desafios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON recepcionista_desafios;
CREATE POLICY "service_role_all" ON recepcionista_desafios FOR ALL TO service_role USING (true) WITH CHECK (true);
