-- ============================================================
-- 006_feedback_profissional.sql - Sistema de Feedback Profissional
-- ============================================================

CREATE TABLE IF NOT EXISTS feedback_prof_formularios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id UUID NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL DEFAULT 'Feedback Diário Profissional',
  token VARCHAR(100) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_prof_profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id UUID NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_prof_ocorridos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id UUID NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  descricao VARCHAR(200) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_prof_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES feedback_prof_formularios(id) ON DELETE CASCADE,
  salao_id UUID NOT NULL REFERENCES saloes(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES feedback_prof_profissionais(id) ON DELETE SET NULL,
  profissional_nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('positivo', 'negativo')),
  ocorrido_id UUID REFERENCES feedback_prof_ocorridos(id) ON DELETE SET NULL,
  ocorrido_descricao VARCHAR(200) NOT NULL,
  descricao TEXT,
  ip VARCHAR(50),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE feedback_prof_formularios ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_prof_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_prof_ocorridos ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_prof_respostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "srall_fpf" ON feedback_prof_formularios;
DROP POLICY IF EXISTS "srall_fpp" ON feedback_prof_profissionais;
DROP POLICY IF EXISTS "srall_fpo" ON feedback_prof_ocorridos;
DROP POLICY IF EXISTS "srall_fpr" ON feedback_prof_respostas;

CREATE POLICY "srall_fpf" ON feedback_prof_formularios FOR ALL USING (true);
CREATE POLICY "srall_fpp" ON feedback_prof_profissionais FOR ALL USING (true);
CREATE POLICY "srall_fpo" ON feedback_prof_ocorridos FOR ALL USING (true);
CREATE POLICY "srall_fpr" ON feedback_prof_respostas FOR ALL USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_fpf_salao ON feedback_prof_formularios(salao_id);
CREATE INDEX IF NOT EXISTS idx_fpp_salao ON feedback_prof_profissionais(salao_id);
CREATE INDEX IF NOT EXISTS idx_fpo_salao ON feedback_prof_ocorridos(salao_id);
CREATE INDEX IF NOT EXISTS idx_fpr_formulario ON feedback_prof_respostas(formulario_id);
CREATE INDEX IF NOT EXISTS idx_fpr_salao ON feedback_prof_respostas(salao_id);
CREATE INDEX IF NOT EXISTS idx_fpr_profissional ON feedback_prof_respostas(profissional_id);
CREATE INDEX IF NOT EXISTS idx_fpr_criado ON feedback_prof_respostas(criado_em);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fpf_token ON feedback_prof_formularios(token);
