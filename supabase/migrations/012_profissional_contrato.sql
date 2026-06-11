-- Adiciona campo de controle de contrato no profissional
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS tem_contrato BOOLEAN DEFAULT false;
