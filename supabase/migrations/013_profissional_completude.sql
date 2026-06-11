-- Adiciona campos de completude do perfil profissional
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS perfil_pessoal_completo BOOLEAN DEFAULT false;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS dados_pessoais_completo BOOLEAN DEFAULT false;
