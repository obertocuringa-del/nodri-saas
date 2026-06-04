-- ============================================================
-- CADASTRO DOS PROFISSIONAIS — Execute no Supabase SQL Editor
-- Pega automaticamente o salao_id do primeiro salão cadastrado
-- ============================================================

DO $$
DECLARE
  v_salao_id UUID;
BEGIN
  -- Pega o ID do salão automaticamente
  SELECT id INTO v_salao_id FROM saloes LIMIT 1;

  IF v_salao_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum salão encontrado no banco de dados.';
  END IF;

  INSERT INTO profissionais (salao_id, nome_completo, apelido, ativo)
  VALUES
    (v_salao_id, 'Cíntia Terumi Fujita Barros',    'CINTIA',    true),
    (v_salao_id, 'Adilson',                          'ADILSON',   true),
    (v_salao_id, 'Celia Silva Barros',               'CELIA',     true),
    (v_salao_id, 'Cleide Campelo de Miranda',        'CLEIDE',    true),
    (v_salao_id, 'Daiane Alves de Castro',           'DAIANE',    true),
    (v_salao_id, 'Daniel da Rocha dos Santos',       'DANIEL',    true),
    (v_salao_id, 'Emanuel Sousa Matos',              'EMANUEL',   true),
    (v_salao_id, 'Ildete Rodrigues Gonçalves',       'ILDETE',    true),
    (v_salao_id, 'Janaina Cristina Silva Carvalho',  'JANAINA',   true),
    (v_salao_id, 'Kaleane Borges Branco',            'KALEANE',   true),
    (v_salao_id, 'Katarina Sena',                    'KATARINA',  true),
    (v_salao_id, 'Kimberly Rodrigues Silva',         'BELA',      true),
    (v_salao_id, 'Lubna Maria de Araujo',            'LUBNA',     true),
    (v_salao_id, 'Patrick Rodrigues Silva',          'PATRICK',   true),
    (v_salao_id, 'Paula Rodrigues',                  'PAULA',     true),
    (v_salao_id, 'Suelen Ribeiro',                   'SUELEN',    true),
    (v_salao_id, 'Teldy Joaquim Dutra Rodrigues',    'TELDY',     true),
    (v_salao_id, 'Valdirene Soares Brandão',         'VALDIRENE', true),
    (v_salao_id, 'Vanessa Soares Machado',           'VANESSA',   true),
    (v_salao_id, 'Vera Oliveira',                    'VERA',      true)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Profissionais cadastrados com sucesso para o salão: %', v_salao_id;
END $$;
