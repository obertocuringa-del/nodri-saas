-- Garante que a coluna apelido existe (já existe pela sql_profissionais.sql)
-- Cria índice para busca rápida por apelido
CREATE INDEX IF NOT EXISTS idx_prof_apelido ON profissionais(salao_id, UPPER(apelido));
CREATE INDEX IF NOT EXISTS idx_prof_nome    ON profissionais(salao_id, UPPER(nome_completo));

-- View auxiliar: retorna profissional_id para qualquer variação de nome/apelido
CREATE OR REPLACE VIEW profissionais_lookup AS
SELECT
  id,
  salao_id,
  nome_completo,
  apelido,
  cargo,
  ativo,
  UPPER(TRIM(nome_completo)) AS nome_upper,
  UPPER(TRIM(apelido))       AS apelido_upper
FROM profissionais;
