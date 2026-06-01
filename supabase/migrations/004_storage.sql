-- Cria bucket público para uploads de conteúdo (imagens, PDFs, Excel)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nodri-conteudo',
  'nodri-conteudo',
  true,
  52428800, -- 50MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Policy: qualquer um pode ler
CREATE POLICY "Leitura pública do conteúdo"
ON storage.objects FOR SELECT
USING (bucket_id = 'nodri-conteudo');

-- Policy: só admin pode fazer upload
CREATE POLICY "Upload apenas autenticado"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'nodri-conteudo');
