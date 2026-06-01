-- Política de leitura pública para o bucket "Páginas"
-- Permite que qualquer pessoa leia os arquivos (imagens, PDFs, Excel)
-- mas apenas o service role pode fazer upload (controlado pela API)

insert into storage.buckets (id, name, public)
values ('paginas', 'paginas', true)
on conflict (id) do update set public = true;

-- Política: leitura pública
create policy if not exists "Leitura publica paginas"
on storage.objects for select
using ( bucket_id = 'paginas' );

-- Política: upload apenas autenticado (service role)
create policy if not exists "Upload autenticado paginas"
on storage.objects for insert
with check ( bucket_id = 'paginas' );
