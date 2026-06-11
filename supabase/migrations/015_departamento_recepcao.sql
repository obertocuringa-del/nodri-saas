-- Adiciona departamento RECEPÇÃO para todos os salões existentes
INSERT INTO profissionais (salao_id, nome_completo, apelido, cargo, ativo, is_departamento, departamento_cor)
SELECT id, 'RECEPÇÃO', 'RECEPÇÃO', 'Recepção', true, true, '#f43f8e'
FROM saloes
WHERE NOT EXISTS (
  SELECT 1 FROM profissionais p WHERE p.salao_id = saloes.id AND p.nome_completo = 'RECEPÇÃO' AND p.is_departamento = true
);

-- Atualiza trigger para incluir RECEPÇÃO nos novos salões
CREATE OR REPLACE FUNCTION fn_criar_departamentos_salao()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profissionais (salao_id, nome_completo, apelido, cargo, ativo, is_departamento, departamento_cor)
  VALUES
    (NEW.id, 'ADMINISTRATIVO', 'ADMINISTRATIVO', 'Administrativo', true, true, '#06b6d4'),
    (NEW.id, 'FINANCEIRO',     'FINANCEIRO',     'Financeiro',     true, true, '#10b981'),
    (NEW.id, 'GERÊNCIA',       'GERÊNCIA',       'Gerência',       true, true, '#f59e0b'),
    (NEW.id, 'RECEPÇÃO',       'RECEPÇÃO',       'Recepção',       true, true, '#f43f8e');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
