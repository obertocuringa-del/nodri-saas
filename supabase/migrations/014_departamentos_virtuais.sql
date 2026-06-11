-- Adiciona flag de departamento virtual nos profissionais
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS is_departamento BOOLEAN DEFAULT false;
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS departamento_cor TEXT;

-- Cria os 3 departamentos para todos os salões existentes
INSERT INTO profissionais (salao_id, nome_completo, apelido, cargo, ativo, is_departamento, departamento_cor)
SELECT id, 'ADMINISTRATIVO', 'ADMINISTRATIVO', 'Administrativo', true, true, '#06b6d4'
FROM saloes
WHERE NOT EXISTS (
  SELECT 1 FROM profissionais p WHERE p.salao_id = saloes.id AND p.nome_completo = 'ADMINISTRATIVO' AND p.is_departamento = true
);

INSERT INTO profissionais (salao_id, nome_completo, apelido, cargo, ativo, is_departamento, departamento_cor)
SELECT id, 'FINANCEIRO', 'FINANCEIRO', 'Financeiro', true, true, '#10b981'
FROM saloes
WHERE NOT EXISTS (
  SELECT 1 FROM profissionais p WHERE p.salao_id = saloes.id AND p.nome_completo = 'FINANCEIRO' AND p.is_departamento = true
);

INSERT INTO profissionais (salao_id, nome_completo, apelido, cargo, ativo, is_departamento, departamento_cor)
SELECT id, 'GERÊNCIA', 'GERÊNCIA', 'Gerência', true, true, '#f59e0b'
FROM saloes
WHERE NOT EXISTS (
  SELECT 1 FROM profissionais p WHERE p.salao_id = saloes.id AND p.nome_completo = 'GERÊNCIA' AND p.is_departamento = true
);

-- Trigger: cria automaticamente os 3 departamentos para novos salões
CREATE OR REPLACE FUNCTION fn_criar_departamentos_salao()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profissionais (salao_id, nome_completo, apelido, cargo, ativo, is_departamento, departamento_cor)
  VALUES
    (NEW.id, 'ADMINISTRATIVO', 'ADMINISTRATIVO', 'Administrativo', true, true, '#06b6d4'),
    (NEW.id, 'FINANCEIRO',     'FINANCEIRO',     'Financeiro',     true, true, '#10b981'),
    (NEW.id, 'GERÊNCIA',       'GERÊNCIA',       'Gerência',       true, true, '#f59e0b');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_criar_departamentos_salao ON saloes;
CREATE TRIGGER trg_criar_departamentos_salao
  AFTER INSERT ON saloes
  FOR EACH ROW EXECUTE FUNCTION fn_criar_departamentos_salao();
