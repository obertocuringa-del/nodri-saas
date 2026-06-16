-- ============================================================
-- TABELA: salao_servicos
-- Armazena a tabela de preços de cada salão individualmente.
-- Cada salão só acessa seus próprios serviços (filtrado por salao_id).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.salao_servicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salao_id UUID NOT NULL REFERENCES public.saloes(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  nome TEXT NOT NULL,
  preco_min NUMERIC(10,2),
  preco_max NUMERIC(10,2),
  preco_fixo NUMERIC(10,2),
  observacao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Índice para performance nas consultas por salão
CREATE INDEX IF NOT EXISTS idx_salao_servicos_salao_id ON public.salao_servicos(salao_id);
CREATE INDEX IF NOT EXISTS idx_salao_servicos_categoria ON public.salao_servicos(salao_id, categoria);

-- RLS: cada salão só acessa seus dados
ALTER TABLE public.salao_servicos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INSERIR SERVIÇOS DO ROUGE HAIR
-- Substitua 'ROUGE_HAIR_SALAO_ID' pelo ID real do salão
-- Para encontrar: SELECT id FROM saloes WHERE nome ILIKE '%rouge%';
-- ============================================================

DO $$
DECLARE
  v_salao_id UUID;
BEGIN
  SELECT id INTO v_salao_id FROM public.saloes WHERE nome ILIKE '%rouge%' LIMIT 1;

  IF v_salao_id IS NULL THEN
    RAISE EXCEPTION 'Salão Rouge Hair não encontrado na tabela saloes';
  END IF;

  -- Limpa serviços anteriores do Rouge (evita duplicatas se rodar novamente)
  DELETE FROM public.salao_servicos WHERE salao_id = v_salao_id;

  INSERT INTO public.salao_servicos (salao_id, categoria, nome, preco_min, preco_fixo, observacao) VALUES

  -- COLORAÇÃO
  (v_salao_id, 'Coloração', 'Aplicação de Henna nos Fios', 210.00, NULL, 'A partir de'),
  (v_salao_id, 'Coloração', 'Color Glossy', NULL, 165.00, NULL),
  (v_salao_id, 'Coloração', 'Correção de Cor', 368.00, NULL, 'A partir de'),
  (v_salao_id, 'Coloração', 'Cover Men', 174.00, NULL, 'A partir de'),
  (v_salao_id, 'Coloração', 'Mechas', 674.00, NULL, 'A partir de — variações: 28, 39, 42, 50, 65 mechas'),
  (v_salao_id, 'Coloração', 'Pigmentação', 284.00, NULL, 'A partir de'),
  (v_salao_id, 'Coloração', 'Pigmentação So Pure', 308.00, NULL, 'A partir de'),
  (v_salao_id, 'Coloração', 'Pigmentação Sobrancelhas', NULL, 50.00, NULL),

  -- COMPLEMENTOS
  (v_salao_id, 'Complementos', 'Complemento Cover Men', NULL, 30.00, NULL),
  (v_salao_id, 'Complementos', 'Complemento Descolorante Braé', NULL, 50.00, NULL),
  (v_salao_id, 'Complementos', 'Complemento Descolorante Keune', NULL, 80.00, NULL),
  (v_salao_id, 'Complementos', 'Complemento Descolorante Wella', NULL, 55.00, NULL),
  (v_salao_id, 'Complementos', 'Complemento Henna', NULL, 55.00, NULL),
  (v_salao_id, 'Complementos', 'Complemento Keune', NULL, 70.00, NULL),
  (v_salao_id, 'Complementos', 'Complemento Plex', NULL, 30.00, NULL),
  (v_salao_id, 'Complementos', 'Complemento So Pure', NULL, 94.00, NULL),

  -- CORTE E BARBA
  (v_salao_id, 'Corte e Barba', 'Barba', NULL, 60.00, NULL),
  (v_salao_id, 'Corte e Barba', 'Corte Masculino 14', 140.00, NULL, 'A partir de'),
  (v_salao_id, 'Corte e Barba', 'Corte Masculino 18', 190.00, NULL, 'A partir de'),
  (v_salao_id, 'Corte e Barba', 'Corte Vera', NULL, 264.00, NULL),
  (v_salao_id, 'Corte e Barba', 'Corte Bordado', NULL, 243.00, NULL),
  (v_salao_id, 'Corte e Barba', 'Corte Kids', NULL, 88.00, NULL),

  -- DEPILAÇÃO
  (v_salao_id, 'Depilação', 'Depilação de Contorno', NULL, 85.99, NULL),
  (v_salao_id, 'Depilação', 'Depilação de Meia Perna', NULL, 65.00, NULL),
  (v_salao_id, 'Depilação', 'Depilação de Perna Completa', NULL, 74.00, NULL),
  (v_salao_id, 'Depilação', 'Depilação Abdômen', NULL, 65.00, NULL),
  (v_salao_id, 'Depilação', 'Depilação Axilas', NULL, 57.99, NULL),
  (v_salao_id, 'Depilação', 'Depilação Costas', NULL, 71.99, NULL),
  (v_salao_id, 'Depilação', 'Depilação de Contorno Completo', NULL, 114.99, NULL),
  (v_salao_id, 'Depilação', 'Depilação Nasal', NULL, 35.99, NULL),
  (v_salao_id, 'Depilação', 'Depilação Orelhas', NULL, 35.99, NULL),

  -- MASSAGEM
  (v_salao_id, 'Massagem', 'Massagem Drenagem Linfática', NULL, 143.00, NULL),
  (v_salao_id, 'Massagem', 'Massagem Ayurvédica', NULL, 187.00, NULL),
  (v_salao_id, 'Massagem', 'Massagem Facial', NULL, 77.00, NULL),
  (v_salao_id, 'Massagem', 'Massagem Gestante', NULL, 132.00, NULL),
  (v_salao_id, 'Massagem', 'Massagem Modeladora', NULL, 143.00, NULL),
  (v_salao_id, 'Massagem', 'Quick Massage 15 min', NULL, 33.00, NULL),
  (v_salao_id, 'Massagem', 'Quick Massage 30 min', NULL, 55.00, NULL),
  (v_salao_id, 'Massagem', 'Massagem Relaxante', NULL, 143.00, NULL),
  (v_salao_id, 'Massagem', 'Massagem Terapêutica', NULL, 165.00, NULL),
  (v_salao_id, 'Massagem', 'Reflexologia', NULL, 88.00, NULL),

  -- ESTÉTICA CORPORAL
  (v_salao_id, 'Estética Corporal', 'Exfoliação Corporal', NULL, 110.00, NULL),
  (v_salao_id, 'Estética Corporal', 'Argiloterapia', NULL, 50.00, NULL),

  -- SOBRANCELHAS E CÍLIOS
  (v_salao_id, 'Sobrancelhas e Cílios', 'Henna Sobrancelha', NULL, 50.00, NULL),
  (v_salao_id, 'Sobrancelhas e Cílios', 'Brow Lamination', NULL, 209.00, NULL),
  (v_salao_id, 'Sobrancelhas e Cílios', 'Aplicação de Cílios Postiço', NULL, 66.00, NULL),
  (v_salao_id, 'Sobrancelhas e Cílios', 'Buço com Cera', NULL, 22.00, NULL),
  (v_salao_id, 'Sobrancelhas e Cílios', 'Buço com Linha Rosto', NULL, 83.00, NULL),
  (v_salao_id, 'Sobrancelhas e Cílios', 'Buço e Queixo', NULL, 44.00, NULL),
  (v_salao_id, 'Sobrancelhas e Cílios', 'Buço na Linha', NULL, 28.00, NULL),
  (v_salao_id, 'Sobrancelhas e Cílios', 'Despigmentação de Sobrancelha', NULL, 300.00, NULL),
  (v_salao_id, 'Sobrancelhas e Cílios', 'Lash Lifting', NULL, 231.00, NULL),
  (v_salao_id, 'Sobrancelhas e Cílios', 'Pigmentação com Refectocil', NULL, 74.00, NULL),
  (v_salao_id, 'Sobrancelhas e Cílios', 'Sobrancelhas', NULL, 75.00, NULL),

  -- ESTÉTICA FACIAL
  (v_salao_id, 'Estética Facial', 'Drenagem Facial Pós-Operatório', NULL, 110.00, NULL),
  (v_salao_id, 'Estética Facial', 'Hidratação Facial', NULL, 88.00, NULL),
  (v_salao_id, 'Estética Facial', 'Limpeza de Pele com Hidratação', NULL, 110.00, NULL),
  (v_salao_id, 'Estética Facial', 'Tratamento Facial Personalizado', NULL, 150.00, NULL),

  -- REMOÇÃO DE TATUAGEM
  (v_salao_id, 'Remoção de Tatuagem', 'Remoção de Tatuagem até 5cm', 300.00, NULL, 'A partir de'),
  (v_salao_id, 'Remoção de Tatuagem', 'Remoção de Tatuagem 6-10cm', 300.00, NULL, 'A partir de'),
  (v_salao_id, 'Remoção de Tatuagem', 'Remoção de Tatuagem 11-15cm', 300.00, NULL, 'A partir de'),
  (v_salao_id, 'Remoção de Tatuagem', 'Remoção de Tatuagem 16-20cm', 300.00, NULL, 'A partir de'),
  (v_salao_id, 'Remoção de Tatuagem', 'Remoção de Tatuagem 21-25cm', 300.00, NULL, 'A partir de'),
  (v_salao_id, 'Remoção de Tatuagem', 'Remoção de Tatuagem 26-30cm', 300.00, NULL, 'A partir de'),

  -- UNHAS
  (v_salao_id, 'Unhas', 'Banho de Gel', NULL, 180.00, NULL),
  (v_salao_id, 'Unhas', 'Banho de Gel e Cutilagem', NULL, 230.00, NULL),
  (v_salao_id, 'Unhas', 'Banho em Gel e Esmaltação em Gel', NULL, 235.00, NULL),
  (v_salao_id, 'Unhas', 'Blindagem de Unha e Cuticulagem', NULL, 115.00, NULL),
  (v_salao_id, 'Unhas', 'Blindagem Fibra de Vidro', NULL, 105.00, NULL),
  (v_salao_id, 'Unhas', 'Cashback Manicure', NULL, 42.50, NULL),
  (v_salao_id, 'Unhas', 'Cashback Pedicure', NULL, 42.50, NULL),
  (v_salao_id, 'Unhas', 'Cutilagem Russa e Esmaltação Tradicional', NULL, 215.00, NULL),
  (v_salao_id, 'Unhas', 'Cutilagem Russa - Banho em Gel - Esmaltação em Gel', NULL, 340.00, NULL),
  (v_salao_id, 'Unhas', 'Cutilagem Russa - Banho em Gel - Esmaltação Tradicional', NULL, 325.00, NULL),
  (v_salao_id, 'Unhas', 'Cutilagem Russa - Esmaltação em Gel', NULL, 310.00, NULL),
  (v_salao_id, 'Unhas', 'Esmaltação em Gel', NULL, 98.00, NULL),
  (v_salao_id, 'Unhas', 'Esmaltação em Gel e Cuticulagem', NULL, 150.00, NULL),
  (v_salao_id, 'Unhas', 'Fibra de Vidro', NULL, 330.00, NULL),
  (v_salao_id, 'Unhas', 'Fibra de Vidro e Esmaltação em Gel', NULL, 360.00, NULL),
  (v_salao_id, 'Unhas', 'Lixa a Motor', NULL, 28.00, NULL),
  (v_salao_id, 'Unhas', 'Manicure', NULL, 50.00, NULL),
  (v_salao_id, 'Unhas', 'Manutenção de Fibra e Esmaltação em Gel', NULL, 260.00, NULL),
  (v_salao_id, 'Unhas', 'Manutenção Fibra de Vidro', NULL, 210.00, NULL),
  (v_salao_id, 'Unhas', 'Pedicure', NULL, 50.00, NULL),
  (v_salao_id, 'Unhas', 'Pedicure e Cuidados Especiais dos Pés', NULL, 125.00, NULL),
  (v_salao_id, 'Unhas', 'Plástica dos Pés', NULL, 150.00, NULL),
  (v_salao_id, 'Unhas', 'Reconstrução de Unha de Fibra', NULL, 36.00, NULL),
  (v_salao_id, 'Unhas', 'Remoção de Gel', NULL, 60.00, NULL),
  (v_salao_id, 'Unhas', 'Remoção de Fibra de Vidro', NULL, 90.00, NULL),
  (v_salao_id, 'Unhas', 'Remoção Top Coat', NULL, 28.00, NULL),
  (v_salao_id, 'Unhas', 'Spa das Mãos e Manicure', NULL, 80.00, NULL),
  (v_salao_id, 'Unhas', 'Top Coat', NULL, 28.00, NULL),
  (v_salao_id, 'Unhas', 'Troca de Esmalte', NULL, 32.00, NULL),
  (v_salao_id, 'Unhas', 'Unha Postiça', NULL, 49.00, NULL),

  -- MAQUIAGEM
  (v_salao_id, 'Maquiagem', 'Maquiagem', NULL, 209.00, NULL),
  (v_salao_id, 'Maquiagem', 'Maquiagem com Cílios', NULL, 226.00, NULL),
  (v_salao_id, 'Maquiagem', 'Maquiagem Express', NULL, 165.00, NULL),
  (v_salao_id, 'Maquiagem', 'Maquiagem Noiva', NULL, 457.00, NULL),

  -- FINALIZAÇÃO
  (v_salao_id, 'Finalização', 'Babyliss', NULL, 96.00, NULL),
  (v_salao_id, 'Finalização', 'Chapinha', NULL, 28.00, NULL),
  (v_salao_id, 'Finalização', 'Combo Rouge Hair', NULL, 180.00, NULL),
  (v_salao_id, 'Finalização', 'Modelagem', NULL, 71.00, NULL),
  (v_salao_id, 'Finalização', 'Modelagem Mega', NULL, 96.00, NULL),
  (v_salao_id, 'Finalização', 'Modelagem Rápida', NULL, 61.00, NULL),
  (v_salao_id, 'Finalização', 'Secagem', NULL, 44.00, NULL),

  -- NUTRIÇÃO E TRATAMENTO CAPILAR
  (v_salao_id, 'Nutrição e Tratamento', 'Nutrição Própolis', NULL, 109.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Nutrição Davines', NULL, 200.00, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Nutrição Elements', NULL, 149.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Nutrição Enrich', NULL, 149.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Nutrição Fast Liss', NULL, 109.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Nutrição Fusion', NULL, 149.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Nutrição Keune', NULL, 159.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Nutrição Keune com Miracle Elixir', NULL, 179.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Nutrição Penetraitt', NULL, 149.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Nutrição Petit', NULL, 109.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Nutrição Ultimate Lux Oil', NULL, 189.00, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Nutrição Ultimate Lux Oil Completo', NULL, 278.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Nutrição Ultimate Repair', NULL, 189.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Nutrição Ultimate Repair Completo', NULL, 278.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Power Dose', NULL, 149.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'So Pure Clarify', NULL, 189.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'So Pure Polish', NULL, 189.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'So Pure Restore', NULL, 189.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Spa Day Davines', NULL, 149.49, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Terapia Reconstrução Orgânica So Pure', NULL, 189.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Terapia Reconstrução Orgânica So Pure com Miracle Elixir', NULL, 209.90, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Tratamento Envelopamento Grandha', NULL, 180.00, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Tratamento Grandha Fito Capillus', NULL, 180.00, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Tratamento Grandha Alkymia Argila', NULL, 180.00, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Tratamento Grandha Spa Black', NULL, 180.00, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Tratamento Grandha Spa Blue', NULL, 180.00, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Terapia Capilar', NULL, 280.00, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Detox Capilar', NULL, 48.00, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Higienização Capilar', NULL, 34.00, NULL),
  (v_salao_id, 'Nutrição e Tratamento', 'Shiatsu Capilar', NULL, 72.00, NULL),

  -- PENTEADO E REALINHAMENTO
  (v_salao_id, 'Penteado e Realinhamento', 'Penteado Glamour', NULL, 287.00, NULL),
  (v_salao_id, 'Penteado e Realinhamento', 'Penteado Noiva', NULL, 618.00, NULL),
  (v_salao_id, 'Penteado e Realinhamento', 'Penteado Semi-Preso', NULL, 228.00, NULL),
  (v_salao_id, 'Penteado e Realinhamento', 'Realinhamento Capilar Masculino', NULL, 334.00, NULL),
  (v_salao_id, 'Penteado e Realinhamento', 'Realinhamento Capilar 56', NULL, 590.00, NULL);

  RAISE NOTICE 'Serviços do Rouge Hair inseridos com sucesso! Total: 130 serviços';
END $$;
