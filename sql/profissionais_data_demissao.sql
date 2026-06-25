-- Adiciona a coluna de Data de Demissão na ficha do profissional.
-- (A Data de Admissão já existe.) Usada para preencher automaticamente
-- a data no Distrato (demissão) e no Contrato (admissão).
-- Rode UMA VEZ no Supabase (SQL Editor). Idempotente.

ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS data_demissao date;
