-- Usuários (logins) por salão, com permissões granulares.
-- O dono cria os usuários e libera só o que cada um pode ver.
-- Rode UMA VEZ no Supabase (SQL Editor). Idempotente.

CREATE TABLE IF NOT EXISTS salao_usuarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salao_id uuid NOT NULL,
  nome text,
  usuario text NOT NULL,
  senha_hash text NOT NULL,
  papel text,
  permissoes jsonb DEFAULT '[]'::jsonb,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  UNIQUE (salao_id, usuario)
);

ALTER TABLE salao_usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS salao_usuarios_service ON salao_usuarios;
CREATE POLICY salao_usuarios_service ON salao_usuarios
  FOR ALL TO service_role USING (true) WITH CHECK (true);
