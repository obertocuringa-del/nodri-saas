-- ─────────────────────────────────────────────────────────────────────────────
-- SEGURANÇA — tabela de tentativas de acesso (SEC-004)
--
-- O login não tinha limite de tentativas: dava para testar senha à vontade.
-- Em serverless o contador precisa ser compartilhado (cada requisição pode
-- cair numa instância diferente), por isso vive no banco.
--
-- Rodar uma vez no SQL Editor do Supabase.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tentativas_acesso (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao          text        NOT NULL,   -- 'login', 'login_ip', 'recuperar_senha'...
  identificador text        NOT NULL,   -- hash do e-mail/IP: nunca o valor em claro
  ip            text,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- A consulta é sempre "quantas tentativas desta ação, deste identificador,
-- depois de tal instante" — o índice cobre exatamente isso.
CREATE INDEX IF NOT EXISTS tentativas_acesso_busca
  ON tentativas_acesso (acao, identificador, criado_em DESC);

-- Limpeza: nada aqui serve depois de algumas horas. Sem isso a tabela cresce
-- para sempre. Rode de vez em quando, ou agende no pg_cron se estiver ativo.
DELETE FROM tentativas_acesso WHERE criado_em < now() - interval '24 hours';

-- Conferência:
-- SELECT acao, count(*) FROM tentativas_acesso GROUP BY acao;
