-- Academia NODRI — tabela de artigos
CREATE TABLE IF NOT EXISTS academia_artigos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL,
  titulo TEXT NOT NULL,
  resumo TEXT,
  conteudo TEXT NOT NULL,
  emoji TEXT DEFAULT '📄',
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE academia_artigos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_academia" ON academia_artigos FOR SELECT USING (true);
CREATE POLICY "admin_academia" ON academia_artigos FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_academia_categoria ON academia_artigos(categoria);
CREATE INDEX IF NOT EXISTS idx_academia_ativo ON academia_artigos(ativo);
