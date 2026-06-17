-- ============================================================
-- NODRI — Migração: Tabelas de Inteligência de Clientes
-- Rodar no Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Atendimentos Raw (dados transacionais completos do relatório 0031)
CREATE TABLE IF NOT EXISTS atendimentos_raw (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salao_id uuid NOT NULL,
  ano int NOT NULL,
  mes int NOT NULL,
  profissional text,
  data_comanda text,
  dia_semana text,
  num_comanda text,
  servico text,
  categoria text,
  cliente text,
  cpf text,
  telefone text,
  celular text,
  qtd numeric DEFAULT 0,
  valor numeric DEFAULT 0,
  desconto numeric DEFAULT 0,
  total numeric DEFAULT 0,
  pacote text,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atendimentos_salao_ano_mes ON atendimentos_raw(salao_id, ano, mes);
CREATE INDEX IF NOT EXISTS idx_atendimentos_cliente ON atendimentos_raw(salao_id, cliente);
CREATE INDEX IF NOT EXISTS idx_atendimentos_profissional ON atendimentos_raw(salao_id, profissional);

-- 2. Perfil Lifetime do Cliente (atualizado a cada import)
CREATE TABLE IF NOT EXISTS clientes_perfil (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salao_id uuid NOT NULL,
  cliente_nome text NOT NULL,
  ltv_total numeric DEFAULT 0,
  total_visitas int DEFAULT 0,
  primeira_visita text,
  ultima_visita text,
  intervalo_medio_dias int DEFAULT 0,
  servicos_feitos jsonb DEFAULT '[]',
  score_rfm text DEFAULT 'novo',
  status text DEFAULT 'ativo',
  dias_desde_ultima_visita int DEFAULT 0,
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE(salao_id, cliente_nome)
);

CREATE INDEX IF NOT EXISTS idx_clientes_perfil_salao ON clientes_perfil(salao_id);
CREATE INDEX IF NOT EXISTS idx_clientes_perfil_status ON clientes_perfil(salao_id, status);

-- 3. Resumo Mensal por Cliente (histórico permanente, leve)
CREATE TABLE IF NOT EXISTS clientes_resumo_mensal (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  salao_id uuid NOT NULL,
  cliente_nome text NOT NULL,
  ano int NOT NULL,
  mes int NOT NULL,
  visitas int DEFAULT 0,
  gasto_total numeric DEFAULT 0,
  servicos jsonb DEFAULT '[]',
  UNIQUE(salao_id, cliente_nome, ano, mes)
);

CREATE INDEX IF NOT EXISTS idx_clientes_resumo_salao ON clientes_resumo_mensal(salao_id, ano, mes);

-- RLS (habilitar segurança por linha se necessário)
ALTER TABLE atendimentos_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_resumo_mensal ENABLE ROW LEVEL SECURITY;
