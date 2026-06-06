-- Adiciona suporte a múltiplas keys Tavily para busca na internet
ALTER TABLE ia_config_global
  ADD COLUMN IF NOT EXISTS tavily_keys TEXT[] DEFAULT '{}';

-- Insere a primeira key (se a tabela já tiver registro)
UPDATE ia_config_global
SET tavily_keys = ARRAY['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']
WHERE tavily_keys = '{}' OR tavily_keys IS NULL;
