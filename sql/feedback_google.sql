-- ── Convite para avaliar no Google ──────────────────────────────────────────
--
-- RODAR ANTES DO DEPLOY. Sem a coluna `criterio` a tela de configuração salva
-- e o valor se perde, e o formulário público nunca libera o convite.
--
-- Guarda, em cada pergunta, o que caracteriza um cliente satisfeito. Fica na
-- pergunta e não numa lista fixa no código porque cada salão edita o próprio
-- formulário: regra por posição ou por título pararia de funcionar em
-- silêncio no dia em que alguém renomeasse uma pergunta.
--
-- Formatos aceitos (ver src/lib/feedbackCriterio.ts):
--   {"modo":"escala_min","min":9}
--   {"modo":"opcoes_ok","aceitas":["Com certeza voltarei"]}
--   {"modo":"grid_min","min":4}
--   {"modo":"sim_obrigatorio","itens":["Me atenderam bem"]}
--
-- NULL = a pergunta não participa da regra (nem libera, nem bloqueia).

alter table feedback_perguntas
  add column if not exists criterio jsonb;

-- O link do Google fica em salao_config, na chave 'feedback_google'. É um por
-- salão (o perfil do Google é do salão, não de cada formulário) e não precisa
-- de coluna nova — a tela grava sozinha no primeiro salvamento.
