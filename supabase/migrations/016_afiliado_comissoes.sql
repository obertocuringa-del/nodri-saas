-- ════════════════════════════════════════════════════════════════════════════
-- PROGRAMA DE AFILIADOS — comissão por cobrança e controle de pagamento
--
-- Até aqui o afiliado tinha só três números somados na própria linha
-- (total_vendas, valor_acumulado, valor_pago). Isso não responde às perguntas
-- que aparecem na hora de pagar: qual venda gerou qual comissão, o que já foi
-- pago, e o que está pendente deste mês. Cada cobrança paga passa a virar uma
-- linha aqui, e o pagamento marca essa linha — não um total solto.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS afiliado_comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id UUID NOT NULL REFERENCES afiliados(id) ON DELETE CASCADE,
  salao_id UUID,
  salao_nome VARCHAR(150),

  -- Id da cobrança no Asaas. É ÚNICO de propósito: o Asaas reenvia webhook, e
  -- sem isto o mesmo pagamento viraria duas comissões.
  cobranca_id VARCHAR(60) UNIQUE,
  assinatura_id VARCHAR(60),

  plano VARCHAR(60),
  valor_venda NUMERIC(10,2) NOT NULL DEFAULT 0,   -- o que o cliente pagou
  percentual NUMERIC(5,2) NOT NULL DEFAULT 40,    -- % do afiliado na hora da venda
  valor_comissao NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- pendente = a pagar | pago = já enviado o Pix | cancelado = estorno/chargeback
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  pago_em TIMESTAMPTZ,
  pago_obs TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comissoes_afiliado ON afiliado_comissoes (afiliado_id, status);
CREATE INDEX IF NOT EXISTS idx_comissoes_criado ON afiliado_comissoes (criado_em DESC);

ALTER TABLE afiliado_comissoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON afiliado_comissoes;
CREATE POLICY "service_role_all" ON afiliado_comissoes FOR ALL TO service_role USING (true);

-- ── A compra guarda de quem foi a indicação ─────────────────────────────────
-- Sem isto o webhook não tem como saber, na hora que o dinheiro entra, qual
-- afiliado indicou aquele cliente.
ALTER TABLE compras ADD COLUMN IF NOT EXISTS afiliado_id UUID;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS desconto_percentual NUMERIC(5,2) DEFAULT 0;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS desconto_apenas_primeira BOOLEAN DEFAULT false;

-- ── O salão lembra quem o indicou ───────────────────────────────────────────
-- A comissão é sobre a assinatura, não só sobre a primeira cobrança: enquanto
-- o cliente indicado continuar pagando, o afiliado continua ganhando.
ALTER TABLE saloes ADD COLUMN IF NOT EXISTS afiliado_id UUID;
ALTER TABLE saloes ADD COLUMN IF NOT EXISTS afiliado_cupom VARCHAR(30);

-- ── Rastro do e-mail de boas-vindas do afiliado ─────────────────────────────
-- O envio pode falhar (chave do Resend ausente, domínio não verificado). Sem
-- registro, ninguém sabe quem ficou sem receber o cupom.
ALTER TABLE afiliados ADD COLUMN IF NOT EXISTS email_enviado_em TIMESTAMPTZ;
ALTER TABLE afiliados ADD COLUMN IF NOT EXISTS email_erro TEXT;
