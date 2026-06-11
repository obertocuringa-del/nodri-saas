-- Adiciona coluna slug na tabela de formulários de feedback
ALTER TABLE feedback_formularios ADD COLUMN IF NOT EXISTS slug VARCHAR(120) UNIQUE;

-- Backfill formulários existentes com slug baseado no título + 4 primeiros chars do token
UPDATE feedback_formularios
SET slug = lower(
  regexp_replace(
    regexp_replace(titulo, '[^a-zA-Z0-9 ]', '', 'g'),
    '\s+', '-', 'g'
  )
) || '-' || substring(token, 1, 4)
WHERE slug IS NULL;

-- Índice para busca rápida por slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_formularios_slug ON feedback_formularios(slug);
