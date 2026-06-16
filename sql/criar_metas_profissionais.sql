-- Tabela de metas mensais por profissional (auto = vem da redistribuição, manual = override do gestor)
CREATE TABLE IF NOT EXISTS public.metas_profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id UUID NOT NULL REFERENCES public.saloes(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  meta_redistribuida NUMERIC(12,2) DEFAULT 0,
  meta_manual NUMERIC(12,2),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profissional_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS idx_metas_profissionais_prof ON public.metas_profissionais (profissional_id);
CREATE INDEX IF NOT EXISTS idx_metas_profissionais_salao ON public.metas_profissionais (salao_id);

ALTER TABLE public.metas_profissionais ENABLE ROW LEVEL SECURITY;

-- Tabela de planejamentos estratégicos gerados pela IA para bater a meta
CREATE TABLE IF NOT EXISTS public.planejamentos_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id UUID NOT NULL REFERENCES public.saloes(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  meta_referencia NUMERIC(12,2) DEFAULT 0,
  plano_texto TEXT,
  plano_json JSONB,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE (profissional_id, ano, mes)
);

CREATE INDEX IF NOT EXISTS idx_planejamentos_metas_prof ON public.planejamentos_metas (profissional_id);
CREATE INDEX IF NOT EXISTS idx_planejamentos_metas_salao ON public.planejamentos_metas (salao_id);

ALTER TABLE public.planejamentos_metas ENABLE ROW LEVEL SECURITY;
