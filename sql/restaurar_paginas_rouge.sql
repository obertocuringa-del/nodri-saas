-- ════════════════════════════════════════════════════════════════════════════
-- RESTAURAR AS PÁGINAS DO ROUGE QUE FORAM GRAVADAS EM BRANCO
--
-- Contexto: em 17/08/2026, às 05:29, a aplicação da atualização do modelo
-- gravou 13 páginas do salão OLIVEIRA E SCHNEIDER (Rouge) com o conteúdo
-- vazio do modelo por cima do conteúdo real. A causa já está corrigida no
-- sistema; isto aqui é só para trazer o conteúdo de volta.
--
-- COMO USAR — são 3 passos, e os dois primeiros rodam no BACKUP:
--
--   1. No Supabase, restaure o backup de 16/08 (ou de 17/08 ANTES das 05:29)
--      em um PROJETO NOVO. Não restaure por cima do projeto atual: você
--      perderia tudo o que foi feito depois, em todos os salões.
--   2. Rode o PASSO 1 no projeto do backup para conferir o que há para
--      recuperar, e o PASSO 2 para gerar o comando de restauração.
--   3. Copie o texto que o PASSO 2 devolveu e rode no projeto ATUAL.
--
-- Nada aqui apaga: o PASSO 3 grava apenas nessas 13 chaves, e só neste salão.
-- ════════════════════════════════════════════════════════════════════════════

-- ── PASSO 1 — no BACKUP: o que existe para recuperar? ───────────────────────
-- Confira a coluna `tamanho`: chave que voltar vazia aqui já estava vazia
-- antes do estrago, e não adianta restaurar.

SELECT
  chave,
  atualizado_em,
  pg_column_size(valor)                        AS tamanho,
  left(valor::text, 120)                       AS comeco_do_conteudo
FROM salao_config
WHERE salao_id = 'b0902527-1199-4b4c-ba3b-eecb51bc61c6'
  AND chave IN (
    'acoes_comerciais',
    'grid_acoes_comerciais',
    'curriculos',
    'curriculos_visto',
    'materiais_trabalho',
    'esterilizacao_fluxo',
    'grid_cadastrar_produto',
    'grid_tratamentos_dosagem',
    'listas_mensagens',
    'grid_tabela_precos_arquivos',
    'grid_carta_abertura_conta',
    'grid_logo_salao',
    'notificacoes_prof'
  )
ORDER BY tamanho DESC;


-- ── PASSO 2 — no BACKUP: gera o comando de restauração ──────────────────────
-- O resultado é UM texto. Copie ele inteiro (clique na célula → copiar) e
-- leve para o projeto atual.
--
-- O filtro `valor::text NOT IN (…)` evita gerar comando para chave que já
-- estava vazia: restaurar vazio por cima de vazio só sujaria a data.

SELECT string_agg(
  format(
    'INSERT INTO salao_config (salao_id, chave, valor, atualizado_em) VALUES (%L, %L, %L::jsonb, now()) ON CONFLICT (salao_id, chave) DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = now();',
    salao_id::text, chave, valor::text
  ),
  E'\n'
) AS rode_isto_no_projeto_atual
FROM salao_config
WHERE salao_id = 'b0902527-1199-4b4c-ba3b-eecb51bc61c6'
  AND chave IN (
    'acoes_comerciais',
    'grid_acoes_comerciais',
    'curriculos',
    'curriculos_visto',
    'materiais_trabalho',
    'esterilizacao_fluxo',
    'grid_cadastrar_produto',
    'grid_tratamentos_dosagem',
    'listas_mensagens',
    'grid_tabela_precos_arquivos',
    'grid_carta_abertura_conta',
    'grid_logo_salao',
    'notificacoes_prof'
  )
  AND valor IS NOT NULL
  AND valor::text NOT IN ('{}', '[]', 'null', '""');


-- ── PASSO 3 — no projeto ATUAL: confira depois de rodar ─────────────────────
-- Rode DEPOIS de colar o comando do passo 2. `itens_no_json` mostra o tamanho
-- do conteúdo que voltou.

SELECT
  chave,
  atualizado_em,
  pg_column_size(valor) AS tamanho,
  left(valor::text, 120) AS comeco_do_conteudo
FROM salao_config
WHERE salao_id = 'b0902527-1199-4b4c-ba3b-eecb51bc61c6'
  AND chave IN (
    'acoes_comerciais',
    'grid_acoes_comerciais',
    'curriculos',
    'curriculos_visto',
    'materiais_trabalho',
    'esterilizacao_fluxo',
    'grid_cadastrar_produto',
    'grid_tratamentos_dosagem',
    'listas_mensagens',
    'grid_tabela_precos_arquivos',
    'grid_carta_abertura_conta',
    'grid_logo_salao',
    'notificacoes_prof'
  )
ORDER BY tamanho DESC;


-- ════════════════════════════════════════════════════════════════════════════
-- SE VOCÊ QUISER CONFERIR OUTRAS PÁGINAS ALÉM DESSAS 13
--
-- Rode no BACKUP e no ATUAL a mesma consulta abaixo e compare os tamanhos: o
-- que tiver encolhido de um lado para o outro é candidato a ter sido perdido.
-- ════════════════════════════════════════════════════════════════════════════

-- SELECT chave, pg_column_size(valor) AS tamanho, atualizado_em
-- FROM salao_config
-- WHERE salao_id = 'b0902527-1199-4b4c-ba3b-eecb51bc61c6'
-- ORDER BY chave;
