-- ─────────────────────────────────────────────────────────────────────────────
-- Perfis de clientes calculados DENTRO do banco.
--
-- Por que existe: a tela "Mais Relatórios" (Em Risco, Perdidos, VIP...) trazia
-- a tabela atendimentos_raw inteira para o servidor — 100 mil linhas em dezenas
-- de idas e voltas — e estourava o tempo limite. A tela então mostrava
-- "Nenhum dado de clientes encontrado", como se os dados tivessem sumido.
--
-- Aqui o Postgres agrupa por cliente e devolve só o resumo: ~2 mil linhas.
--
-- Seguro rodar quantas vezes quiser: só cria/substitui a função, não altera
-- nem apaga nenhum dado.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION perfis_clientes(
  p_salao   uuid,
  p_ano_de  int DEFAULT NULL,
  p_ano_ate int DEFAULT NULL
)
RETURNS TABLE (
  cliente_nome    text,
  celular         text,
  ltv_total       numeric,
  total_visitas   bigint,
  primeira_visita text,
  ultima_visita   text,
  servicos_feitos text[]
)
LANGUAGE sql
STABLE
AS $$
  WITH base AS (
    SELECT
      btrim(cliente)                                   AS nome,
      NULLIF(btrim(COALESCE(celular, '')), '')         AS celular,
      btrim(COALESCE(data_comanda, ''))                AS data_txt,
      -- data_comanda vem como DD/MM/YYYY (ou ISO); converte para date com
      -- segurança: linha com data inválida não derruba a consulta inteira.
      CASE
        WHEN data_comanda ~ '^\d{2}/\d{2}/\d{4}$' THEN to_date(data_comanda, 'DD/MM/YYYY')
        WHEN data_comanda ~ '^\d{4}-\d{2}-\d{2}'  THEN to_date(left(data_comanda, 10), 'YYYY-MM-DD')
        ELSE NULL
      END                                              AS dt,
      COALESCE(NULLIF(total, 0), valor, 0)             AS vlr,
      NULLIF(btrim(COALESCE(servico, '')), '')         AS servico
    FROM atendimentos_raw
    WHERE salao_id = p_salao
      AND btrim(COALESCE(cliente, '')) <> ''
      AND (p_ano_de  IS NULL OR ano >= p_ano_de)
      AND (p_ano_ate IS NULL OR ano <= p_ano_ate)
  )
  SELECT
    nome                                               AS cliente_nome,
    COALESCE(max(celular), '')                         AS celular,
    round(sum(vlr)::numeric, 2)                        AS ltv_total,
    -- uma "visita" = um dia distinto (várias comandas no mesmo dia contam 1)
    count(DISTINCT dt)                                 AS total_visitas,
    COALESCE(to_char(min(dt), 'DD/MM/YYYY'), '')       AS primeira_visita,
    COALESCE(to_char(max(dt), 'DD/MM/YYYY'), '')       AS ultima_visita,
    COALESCE(array_agg(DISTINCT servico) FILTER (WHERE servico IS NOT NULL), '{}') AS servicos_feitos
  FROM base
  GROUP BY nome
$$;

-- Índices que essa consulta usa (se já existirem, não faz nada)
CREATE INDEX IF NOT EXISTS idx_atend_raw_salao_ano ON atendimentos_raw (salao_id, ano);
