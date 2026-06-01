-- Adiciona campo de desconto para o cliente no cupom do afiliado
ALTER TABLE afiliados ADD COLUMN IF NOT EXISTS desconto_cliente INTEGER NOT NULL DEFAULT 10;

-- Configuração global de desconto padrão para cupons de afiliado
INSERT INTO configuracoes (chave, valor)
VALUES ('afiliado_desconto_cliente', '{"percentual": 10}')
ON CONFLICT (chave) DO NOTHING;
