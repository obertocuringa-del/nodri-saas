-- ─────────────────────────────────────────────────────────────────────────────
-- SALÃO MODELO
--
-- Marca um salão como MODELO. Ele é a fonte da estrutura que os outros
-- salões recebem (salão novo nasce com ela; salão existente recebe aviso
-- e decide se aplica).
--
-- Rodar uma vez no SQL Editor do Supabase.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Quem é o modelo
ALTER TABLE saloes ADD COLUMN IF NOT EXISTS is_modelo boolean NOT NULL DEFAULT false;

-- 2) Qual versão do modelo este salão já aplicou (NULL = nunca aplicou)
ALTER TABLE saloes ADD COLUMN IF NOT EXISTS modelo_versao text;

-- 3) Quando aplicou pela última vez
ALTER TABLE saloes ADD COLUMN IF NOT EXISTS modelo_aplicado_em timestamptz;

-- 4) Só pode existir UM salão modelo por vez
CREATE UNIQUE INDEX IF NOT EXISTS saloes_um_modelo_apenas
  ON saloes ((is_modelo)) WHERE is_modelo = true;

-- Conferência:
-- SELECT id, nome, is_modelo, modelo_versao, modelo_aplicado_em FROM saloes ORDER BY nome;
