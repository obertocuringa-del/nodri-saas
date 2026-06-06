-- Adiciona data de admissão nos profissionais
ALTER TABLE profissionais
  ADD COLUMN IF NOT EXISTS data_admissao DATE;
