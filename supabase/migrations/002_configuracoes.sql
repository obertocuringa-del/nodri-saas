-- ============================================
-- TABELA: configuracoes (chave-valor global)
-- ============================================
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave VARCHAR(100) NOT NULL UNIQUE,
  valor JSONB NOT NULL DEFAULT '{}',
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE POLICY "service_role_all" ON configuracoes FOR ALL TO service_role USING (true);
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER configuracoes_updated_at
  BEFORE UPDATE ON configuracoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TABELA: afiliados
-- ============================================
CREATE TABLE IF NOT EXISTS afiliados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  telefone VARCHAR(20),
  chave_pix VARCHAR(100) NOT NULL,
  cupom VARCHAR(30) NOT NULL UNIQUE,
  link VARCHAR(200) NOT NULL,
  comissao_percentual INTEGER NOT NULL DEFAULT 40,
  total_vendas INTEGER DEFAULT 0,
  total_cliques INTEGER DEFAULT 0,
  valor_acumulado DECIMAL(10,2) DEFAULT 0,
  valor_pago DECIMAL(10,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE afiliados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON afiliados FOR ALL TO service_role USING (true);

-- ============================================
-- TABELA: tokens_senha (recuperação de senha)
-- ============================================
CREATE TABLE IF NOT EXISTS tokens_senha (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token VARCHAR(100) NOT NULL UNIQUE,
  expira_em TIMESTAMP WITH TIME ZONE NOT NULL,
  usado BOOLEAN DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tokens_senha ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON tokens_senha FOR ALL TO service_role USING (true);

-- ============================================
-- TABELA: conteudo_submenus
-- ============================================
CREATE TABLE IF NOT EXISTS conteudo_submenus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  titulo VARCHAR(200) NOT NULL,
  video_url TEXT,
  conteudo JSONB DEFAULT '{}',
  categoria VARCHAR(50),
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE conteudo_submenus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON conteudo_submenus FOR ALL TO service_role USING (true);
