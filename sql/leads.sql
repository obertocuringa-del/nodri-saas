-- ── Contatos da vitrine (leads) ─────────────────────────────────────────────
--
-- O site deixa de vender sozinho. Quem chega em nodri.com.br vê a
-- apresentação e um formulário de contato; os PREÇOS não ficam expostos.
-- Você recebe o contato, conversa, e só então libera o link que dá acesso à
-- página de planos.
--
-- `token` é esse link. Nasce junto com o contato mas só vale depois de
-- `liberado_em` ser preenchido — assim ninguém entra na página de planos
-- adivinhando endereço, e você não precisa gerar nada na hora de liberar.

create table if not exists leads (
  id                    uuid primary key default gen_random_uuid(),
  nome                  text not null,
  sobrenome             text,
  email                 text not null,
  celular               text,
  estado                text,
  cidade                text,
  tipo_estabelecimento  text,
  -- Qual sistema ele usa hoje. É a pergunta mais útil da lista: diz se você
  -- está falando com alguém que nunca organizou nada ou com alguém que já
  -- paga a um concorrente — e a conversa de venda muda por completo.
  sistema_atual         text not null,
  objetivo              text,
  observacoes           text,

  token                 text unique not null,
  liberado_em           timestamptz,
  liberado_por          uuid,
  -- Preenchido quando o contato vira cliente de fato.
  virou_salao_id        uuid references saloes(id) on delete set null,

  criado_em             timestamptz default now()
);

create index if not exists idx_leads_token on leads (token);
create index if not exists idx_leads_criado on leads (criado_em desc);
