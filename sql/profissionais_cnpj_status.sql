-- Painel de CNPJ dos profissionais: status (ok/pendente) e observação.
-- Ex.: profissional tem CNPJ mas não está emitindo guia → status pendente + observação.
-- Rode UMA VEZ no Supabase (SQL Editor). Idempotente.

ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS cnpj_status text;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS cnpj_observacao text;
