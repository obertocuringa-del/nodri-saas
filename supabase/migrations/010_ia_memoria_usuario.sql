-- Memória evolutiva da IA por salão
CREATE TABLE IF NOT EXISTS ia_memoria_usuario (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id      UUID NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  memoria       TEXT NOT NULL DEFAULT '',
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salao_id)
);
ALTER TABLE ia_memoria_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srall_ia_memoria" ON ia_memoria_usuario FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_ia_memoria_salao ON ia_memoria_usuario(salao_id);
