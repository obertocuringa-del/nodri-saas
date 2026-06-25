-- ============================================================
-- LISTA DE ESPERA INTELIGENTE (NODRI)
-- ------------------------------------------------------------
-- Clientes aguardando horário. Cores por tempo de fila, receita
-- em fila, WhatsApp e auto-baixa quando a cliente é atendida
-- (cruzando com atendimentos_raw na reimportação).
--
-- Rode UMA VEZ no Supabase (SQL Editor). Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS lista_espera (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salao_id uuid NOT NULL,
  cliente_nome text NOT NULL,
  telefone text,
  servicos jsonb DEFAULT '[]'::jsonb,           -- [{ "nome": "...", "preco": 80 }]
  data_desejada date,
  horario_desejado text,
  categoria text NOT NULL DEFAULT 'espera',     -- espera | nao_agendada
  status text NOT NULL DEFAULT 'aguardando',    -- aguardando | contatada | remarcada | atendida | perdida
  observacao text,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  atendida_em timestamptz                       -- preenchido quando baixada (manual ou automática)
);

CREATE INDEX IF NOT EXISTS idx_lista_espera_salao ON lista_espera (salao_id, status, criado_em DESC);

ALTER TABLE lista_espera ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON lista_espera;
CREATE POLICY "service_role_all" ON lista_espera FOR ALL TO service_role USING (true) WITH CHECK (true);
