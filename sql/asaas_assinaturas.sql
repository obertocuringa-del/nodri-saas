-- ── Assinatura recorrente (Asaas) ───────────────────────────────────────────
--
-- Hoje a licença é contada pelo NODRI: cada pagamento soma 30 dias em
-- `licenca_vencimento`. Com assinatura, quem manda no ciclo é o Asaas — ele
-- cobra sozinho todo mês e avisa o resultado. O sistema para de contar dias e
-- passa a obedecer ao que o gateway diz.
--
-- Estas colunas são a ligação entre um salão e a assinatura dele lá.
-- Todas nascem nulas: salão sem assinatura continua funcionando como sempre,
-- pelo `licenca_vencimento`. A migração é salão a salão, sem virada de chave.

alter table saloes
  -- Cliente no Asaas. Um por salão, criado na primeira assinatura e reusado
  -- depois — sem isso, trocar de plano criaria um cliente duplicado a cada vez.
  add column if not exists asaas_customer_id text,

  -- A assinatura em si. É por ela que o webhook descobre de quem é o evento.
  add column if not exists asaas_subscription_id text,

  -- Situação vinda do Asaas (ACTIVE, OVERDUE, CANCELED…). Guardada crua de
  -- propósito: quando algo não bate, dá para comparar com o painel deles sem
  -- traduzir nada.
  add column if not exists asaas_status text,

  -- Quando o Asaas cobra de novo. Serve para você responder "até quando ele
  -- está pago" sem abrir o painel do gateway.
  add column if not exists asaas_proxima_cobranca date;

-- Busca do webhook: ele chega com o id da assinatura e precisa achar o salão.
create index if not exists idx_saloes_asaas_subscription
  on saloes (asaas_subscription_id);

-- ── Histórico de eventos ────────────────────────────────────────────────────
-- Toda notificação do Asaas fica registrada, inclusive as que não mudaram
-- nada. Sem isso, uma cobrança que falhou some sem deixar rastro e a única
-- forma de investigar é pedir para o suporte deles.
create table if not exists asaas_eventos (
  id             uuid primary key default gen_random_uuid(),
  salao_id       uuid references saloes(id) on delete set null,
  evento         text not null,          -- PAYMENT_RECEIVED, PAYMENT_OVERDUE…
  assinatura_id  text,
  cobranca_id    text,
  valor          numeric,
  payload        jsonb,                  -- o corpo inteiro, como chegou
  criado_em      timestamptz default now()
);

create index if not exists idx_asaas_eventos_salao on asaas_eventos (salao_id, criado_em desc);

-- Idempotência: o Asaas reenvia a notificação quando não recebe 200, e sem
-- isto um reenvio somaria mês em cima de mês.
create unique index if not exists idx_asaas_eventos_unico
  on asaas_eventos (evento, cobranca_id) where cobranca_id is not null;
