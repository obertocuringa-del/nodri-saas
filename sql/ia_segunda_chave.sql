-- Segunda chave da IA: a do Google, separada da chave do provedor principal.
--
-- Por que duas. A memoria semantica da IA (o que ela lembra de conversas
-- antigas) e gerada por embedding do Google — sempre, mesmo quando quem
-- responde e o Claude. Com um campo so, trocar o modelo para Claude fazia o
-- sistema mandar a chave da Anthropic para o Google: a memoria parava de
-- funcionar e ninguem via, porque essa chamada vive dentro de um try/catch
-- que devolve null em silencio.
--
-- Rodar uma vez no SQL Editor do Supabase. E idempotente: rodar de novo nao
-- faz nada.

alter table ia_config_global
  add column if not exists api_key_gemini text;
