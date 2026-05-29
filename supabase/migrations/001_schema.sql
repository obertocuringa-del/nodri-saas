-- ============================================
-- NODRI SAAS — Schema completo do banco de dados
-- Execute no Supabase SQL Editor
-- ============================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABELA: planos
-- ============================================
CREATE TABLE planos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(50) NOT NULL,
  slug VARCHAR(20) NOT NULL UNIQUE,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_usuarios INTEGER NOT NULL DEFAULT 1,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO planos (nome, slug, preco, max_usuarios, descricao) VALUES
  ('Básico',        'basico',        97.00,  1, 'Acesso aos módulos essenciais'),
  ('Profissional',  'profissional',  197.00, 3, 'Acesso aos módulos avançados'),
  ('Premium',       'premium',       297.00, 5, 'Acesso completo a todos os módulos');

-- ============================================
-- TABELA: saloes
-- ============================================
CREATE TABLE saloes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  responsavel VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  telefone VARCHAR(20),
  plano_id UUID REFERENCES planos(id),
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'bloqueado', 'vencido', 'trial')),
  licenca_vencimento DATE,
  observacoes TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA: usuarios
-- ============================================
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salao_id UUID REFERENCES saloes(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'salon' CHECK (role IN ('master', 'salon')),
  ativo BOOLEAN DEFAULT true,
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA: modulos
-- ============================================
CREATE TABLE modulos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  descricao TEXT,
  versao VARCHAR(20) DEFAULT '1.0.0',
  icone VARCHAR(50),
  cor_classe VARCHAR(20),
  categoria VARCHAR(50) DEFAULT 'geral',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO modulos (nome, slug, descricao, versao, icone, cor_classe, categoria, ordem) VALUES
  ('Confirmar Agendamento',      'confirmar-agendamento',      'Confirme agendamentos rapidamente via WhatsApp',       '2.0.0', 'calendar-check',  'cyan',   'gestao',     1),
  ('Bloqueio Sem Preferência',   'bloqueio-sem-preferencia',   'Bloqueie sem restrições com segurança',                '1.5.0', 'lock',            'amber',  'gestao',     2),
  ('Enviar Feedback',            'enviar-feedback',            'Envie feedbacks personalizados para seus clientes',    '3.1.0', 'message-circle',  'purple', 'marketing',  3),
  ('Ver Feedback Cliente',       'ver-feedback-cliente',       'Visualize feedbacks dos clientes em tempo real',       '2.2.0', 'eye',             'blue',   'marketing',  4),
  ('Enviar Lista',               'enviar-lista',               'Envie listas promocionais em massa para clientes',     '1.8.0', 'send',            'pink',   'marketing',  5),
  ('Enviar Lista c/ Arquivo',    'enviar-lista-arquivo',       'Envie listas com anexos e arquivos aos clientes',      '2.0.0', 'paperclip',       'amber',  'marketing',  6),
  ('Relatório Profissional',     'relatorio-profissional',     'Gere relatórios completos de desempenho do salão',     '3.0.0', 'chart-bar',       'green',  'relatorios', 7),
  ('Faturamento Diário',         'faturamento-diario',         'Acompanhe o faturamento diário do seu salão',          '2.5.0', 'coin',            'amber',  'financeiro', 8),
  ('Baixar Música YouTube',      'baixar-musica-youtube',      'Baixe músicas do YouTube para o ambiente do salão',    '1.3.0', 'music',           'pink',   'extras',     9),
  ('Calcular Reserva Financeira','calcular-reserva-financeira','Calcule e planeje sua reserva de emergência',           '1.0.0', 'piggy-bank',      'cyan',   'financeiro', 10),
  ('Calculadora Depreciação',    'calculadora-depreciacao',    'Calcule a depreciação dos ativos do seu negócio',       '1.0.0', 'calculator',      'purple', 'financeiro', 11),
  ('Avaliar Profissional',       'avaliar-profissional',       'Avalie o desempenho dos profissionais da equipe',       '1.0.0', 'star',            'amber',  'pessoas',    12),
  ('Aluguel de Cadeira',         'aluguel-de-cadeira',         'Calcule e gerencie o aluguel de cadeiras do salão',    '1.0.0', 'armchair',        'blue',   'financeiro', 13),
  ('Precificar Serviços',        'precificar-servicos',        'Precifique corretamente todos os serviços do salão',   '1.0.0', 'tag',             'red',    'financeiro', 14);

-- ============================================
-- TABELA: salao_modulos (módulos por salão)
-- ============================================
CREATE TABLE salao_modulos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salao_id UUID NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  modulo_id UUID NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  habilitado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  habilitado_por UUID REFERENCES usuarios(id),
  UNIQUE(salao_id, modulo_id)
);

-- ============================================
-- TABELA: notificacoes
-- ============================================
CREATE TABLE notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salao_id UUID REFERENCES saloes(id) ON DELETE CASCADE,
  titulo VARCHAR(200),
  mensagem TEXT NOT NULL,
  tipo VARCHAR(20) DEFAULT 'info' CHECK (tipo IN ('info', 'success', 'warning', 'danger')),
  para_todos BOOLEAN DEFAULT false,
  lida BOOLEAN DEFAULT false,
  criado_por UUID REFERENCES usuarios(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA: logs
-- ============================================
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id),
  salao_id UUID REFERENCES saloes(id),
  acao VARCHAR(100) NOT NULL,
  detalhes JSONB,
  ip VARCHAR(45),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA: pagamentos
-- ============================================
CREATE TABLE pagamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salao_id UUID NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  plano_id UUID REFERENCES planos(id),
  valor DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  observacoes TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FUNÇÕES E TRIGGERS
-- ============================================

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saloes_updated_at
  BEFORE UPDATE ON saloes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Bloqueia salão automaticamente quando licença vence
CREATE OR REPLACE FUNCTION check_licenca_vencimento()
RETURNS void AS $$
BEGIN
  UPDATE saloes
  SET status = 'vencido'
  WHERE licenca_vencimento < CURRENT_DATE
    AND status = 'ativo';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE saloes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE salao_modulos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos          ENABLE ROW LEVEL SECURITY;

-- Policies abertas para service_role (backend)
CREATE POLICY "service_role_all" ON saloes          FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON usuarios        FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON salao_modulos   FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON notificacoes    FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON modulos         FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON planos          FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON logs            FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all" ON pagamentos      FOR ALL TO service_role USING (true);

-- ============================================
-- ADMIN MASTER INICIAL
-- Senha: NodriAdmin@2024
-- Troque imediatamente após o primeiro login!
-- ============================================
INSERT INTO usuarios (nome, email, senha_hash, role, ativo)
VALUES (
  'Admin Master',
  'admin@nodri.com.br',
  crypt('NodriAdmin@2024', gen_salt('bf', 12)),
  'master',
  true
);
