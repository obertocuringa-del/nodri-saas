-- ============================================================
-- SINCRONIZAÇÃO: profissionais ↔ feedback_prof_profissionais
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Adiciona coluna de vínculo na tabela de feedback
ALTER TABLE feedback_prof_profissionais
  ADD COLUMN IF NOT EXISTS profissional_id UUID REFERENCES profissionais(id) ON DELETE CASCADE;

-- 2. Índice único para garantir 1 registro por profissional
CREATE UNIQUE INDEX IF NOT EXISTS idx_fpf_profissional_id
  ON feedback_prof_profissionais(profissional_id)
  WHERE profissional_id IS NOT NULL;

-- 3. Sincroniza profissionais já cadastrados → feedback_prof_profissionais
--    Usa apelido como nome (ou nome_completo em maiúsculo se não tiver apelido)
INSERT INTO feedback_prof_profissionais (salao_id, nome, ativo, profissional_id)
SELECT
  salao_id,
  UPPER(TRIM(COALESCE(NULLIF(TRIM(apelido), ''), nome_completo))),
  ativo,
  id
FROM profissionais
ON CONFLICT (profissional_id) DO UPDATE
  SET nome  = UPPER(TRIM(COALESCE(NULLIF(TRIM(EXCLUDED.nome), ''), ''))),
      ativo = EXCLUDED.ativo;

-- 4. TRIGGER: ao CRIAR ou ATUALIZAR profissional → sincroniza automaticamente
CREATE OR REPLACE FUNCTION fn_sync_prof_para_feedback()
RETURNS TRIGGER AS $$
DECLARE
  v_nome TEXT;
BEGIN
  v_nome := UPPER(TRIM(COALESCE(NULLIF(TRIM(NEW.apelido), ''), NEW.nome_completo)));

  INSERT INTO feedback_prof_profissionais (salao_id, nome, ativo, profissional_id)
  VALUES (NEW.salao_id, v_nome, NEW.ativo, NEW.id)
  ON CONFLICT (profissional_id) DO UPDATE
    SET nome  = EXCLUDED.nome,
        ativo = EXCLUDED.ativo;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_prof_para_feedback ON profissionais;
CREATE TRIGGER trg_sync_prof_para_feedback
  AFTER INSERT OR UPDATE ON profissionais
  FOR EACH ROW EXECUTE FUNCTION fn_sync_prof_para_feedback();

-- 5. TRIGGER: ao DELETAR profissional → remove do feedback automaticamente
--    (ON DELETE CASCADE na FK já cuida disso, mas deixamos explícito)
CREATE OR REPLACE FUNCTION fn_deletar_prof_do_feedback()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM feedback_prof_profissionais WHERE profissional_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deletar_prof_do_feedback ON profissionais;
CREATE TRIGGER trg_deletar_prof_do_feedback
  BEFORE DELETE ON profissionais
  FOR EACH ROW EXECUTE FUNCTION fn_deletar_prof_do_feedback();

-- 6. Verifica resultado
SELECT
  p.nome_completo,
  p.apelido,
  fpf.nome AS nome_no_feedback,
  fpf.ativo
FROM profissionais p
LEFT JOIN feedback_prof_profissionais fpf ON fpf.profissional_id = p.id
ORDER BY p.nome_completo;
