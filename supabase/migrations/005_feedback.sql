-- ============================================================
-- 005_feedback.sql - Sistema de Feedback de Clientes
-- ============================================================

-- Formulários de feedback por salão
CREATE TABLE IF NOT EXISTS feedback_formularios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id UUID NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL DEFAULT 'Avaliação do Atendimento',
  descricao TEXT DEFAULT 'Sua opinião é muito importante para nós!',
  token VARCHAR(100) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  cor_primaria VARCHAR(20) DEFAULT '#e11d48',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Perguntas do formulário
CREATE TABLE IF NOT EXISTS feedback_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES feedback_formularios(id) ON DELETE CASCADE,
  titulo VARCHAR(500) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('escala', 'multipla_escolha', 'texto', 'sim_nao', 'grid')),
  opcoes JSONB DEFAULT '[]',
  obrigatoria BOOLEAN DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Respostas dos clientes
CREATE TABLE IF NOT EXISTS feedback_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES feedback_formularios(id) ON DELETE CASCADE,
  salao_id UUID NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  dados JSONB NOT NULL DEFAULT '{}',
  ip VARCHAR(50),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- RLS - apenas service_role acessa (backend)
ALTER TABLE feedback_formularios ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_respostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_formularios" ON feedback_formularios;
DROP POLICY IF EXISTS "service_role_all_perguntas" ON feedback_perguntas;
DROP POLICY IF EXISTS "service_role_all_respostas" ON feedback_respostas;

CREATE POLICY "service_role_all_formularios" ON feedback_formularios FOR ALL USING (true);
CREATE POLICY "service_role_all_perguntas" ON feedback_perguntas FOR ALL USING (true);
CREATE POLICY "service_role_all_respostas" ON feedback_respostas FOR ALL USING (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_feedback_formularios_salao ON feedback_formularios(salao_id);
CREATE INDEX IF NOT EXISTS idx_feedback_perguntas_formulario ON feedback_perguntas(formulario_id);
CREATE INDEX IF NOT EXISTS idx_feedback_respostas_formulario ON feedback_respostas(formulario_id);
CREATE INDEX IF NOT EXISTS idx_feedback_respostas_salao ON feedback_respostas(salao_id);
CREATE INDEX IF NOT EXISTS idx_feedback_respostas_criado ON feedback_respostas(criado_em);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_formularios_token ON feedback_formularios(token);
