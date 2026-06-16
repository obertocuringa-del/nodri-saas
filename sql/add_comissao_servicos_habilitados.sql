-- Adiciona coluna de comissão na tabela de serviços
ALTER TABLE public.salao_servicos
  ADD COLUMN IF NOT EXISTS comissao_valor NUMERIC(10,2);

-- Adiciona coluna de serviços habilitados no profissional (array de UUIDs)
ALTER TABLE public.profissionais
  ADD COLUMN IF NOT EXISTS servicos_habilitados UUID[] DEFAULT '{}';
