-- Monitoramento de consumo da IA.
--
-- Ate agora nao existia registro nenhum de quanto cada pergunta custa. Sem
-- isso nao da para responder as unicas perguntas que importam: o corte
-- funcionou? qual salao consome dez vezes mais que os outros? o cache esta
-- pegando? A conta chegava no fim do mes e nao dava para atribuir a ninguem.
--
-- Uma linha por resposta da IA. Nao guarda o texto da conversa — o conteudo ja
-- vive em ia_conversas, e repetir aqui so aumentaria a superficie de dado
-- sensivel sem responder nenhuma pergunta nova.
--
-- Rodar uma vez no SQL Editor do Supabase. E idempotente.

create table if not exists ia_uso (
  id uuid primary key default gen_random_uuid(),
  salao_id uuid not null,
  profissional_id uuid,
  provedor text not null,                 -- 'claude' ou 'gemini'
  modelo text not null,
  tokens_entrada int default 0,
  tokens_saida int default 0,
  tokens_cache_leitura int default 0,     -- cobrados a 10%: quanto o cache poupou
  tokens_cache_escrita int default 0,
  ferramentas int default 0,              -- quantas chamadas de ferramenta a pergunta gerou
  ms int default 0,                       -- tempo ate a resposta terminar
  reserva boolean default false,          -- true = o provedor principal caiu e a reserva atendeu
  erro text,
  criado_em timestamptz default now()
);

-- O indice segue a unica leitura que a tela faz: o consumo de um salao, do
-- mais recente para o mais antigo.
create index if not exists ia_uso_salao_data on ia_uso (salao_id, criado_em desc);
create index if not exists ia_uso_data on ia_uso (criado_em desc);

-- Contexto enxuto: liga e desliga o envio dos dados brutos do salao dentro do
-- prompt. Com as ferramentas buscando sob demanda, mandar tudo junto e pagar
-- duas vezes pela mesma informacao — mas a chave existe para poder voltar
-- atras sem deploy, caso alguma resposta piore.
alter table ia_config_global
  add column if not exists contexto_enxuto boolean default true;
