-- ── Contato vindo do diagnóstico ────────────────────────────────────────────
--
-- O diagnóstico público pede só NOME e WHATSAPP. É de propósito: a pessoa
-- acabou de terminar um teste de dez perguntas, e cada campo a mais na última
-- tela é gente que fecha a aba justamente no momento de maior interesse.
--
-- A tabela `leads` nasceu para o formulário da vitrine, que pede mais coisas —
-- e por isso exige e-mail e sistema atual. Estes dois ALTER liberam o contato
-- mais curto do diagnóstico.
--
-- Enquanto este SQL não roda, nada quebra: o contato continua chegando no
-- painel master como notificação. Rodando, ele passa a entrar TAMBÉM na lista
-- de leads, com o token do fluxo de planos.

alter table leads alter column email drop not null;
alter table leads alter column sistema_atual drop not null;
