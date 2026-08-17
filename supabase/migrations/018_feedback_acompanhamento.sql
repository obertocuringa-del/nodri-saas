-- ════════════════════════════════════════════════════════════════════════════
-- TERCEIRO TIPO DE FEEDBACK: ACOMPANHAMENTO
--
-- Positivo e negativo não davam conta de um caso real: a gestão conversa com
-- o profissional sobre produção ("você atendeu 0, a média é 1, quer que eu
-- ajuste sua agenda?"). Isso não é elogio nem ocorrência — é registro de que
-- o salão viu o número, procurou a pessoa e ofereceu ajuda.
--
-- Guardar como positivo inflava os elogios de quem precisa de atenção;
-- guardar como negativo transformava acolhimento em advertência. O tipo novo
-- não pesa para nenhum dos dois lados nas contagens.
-- ════════════════════════════════════════════════════════════════════════════

-- 'acompanhamento' tem 14 caracteres e a coluna aceitava só 10.
ALTER TABLE feedback_prof_respostas ALTER COLUMN tipo TYPE VARCHAR(20);

ALTER TABLE feedback_prof_respostas DROP CONSTRAINT IF EXISTS feedback_prof_respostas_tipo_check;
ALTER TABLE feedback_prof_respostas
  ADD CONSTRAINT feedback_prof_respostas_tipo_check
  CHECK (tipo IN ('positivo', 'negativo', 'acompanhamento'));
