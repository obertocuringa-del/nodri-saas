-- ── Funcionalidades da vitrine ──────────────────────────────────────────────
--
-- Cada linha é uma funcionalidade do NODRI que ganha página própria e entra no
-- menu do topo, agrupada por categoria.
--
-- `video_url` e `imagem_url` convivem: nem toda funcionalidade vai ter vídeo
-- pronto, e página esperando vídeo que não existe fica com um buraco no meio.
-- Quando os dois estiverem preenchidos, o vídeo ganha — ele mostra o sistema
-- funcionando, que é a vantagem contra quem só tem foto de banco de imagens.

create table if not exists funcionalidades (
  id          uuid primary key default gen_random_uuid(),
  categoria   text not null,
  nome        text not null,          -- como aparece no menu
  slug        text unique not null,   -- /funcionalidade/<slug>
  etiqueta    text,                   -- pílula acima do título
  titulo      text not null,          -- título grande da página
  descricao   text,
  destaques   jsonb default '[]'::jsonb,  -- [{titulo}] — os cards pequenos
  video_url   text,                   -- link do YouTube
  imagem_url  text,
  botao_texto text default 'Abrir',
  ordem_categoria int default 0,      -- ordem da categoria no menu
  ordem       int default 0,          -- ordem dentro da categoria
  ativo       boolean default true,
  criado_em   timestamptz default now()
);

create index if not exists idx_func_slug on funcionalidades (slug);
create index if not exists idx_func_ordem on funcionalidades (ordem_categoria, ordem);

-- ── Carrossel (adicionado depois) ───────────────────────────────────────────
-- `midias` substitui video_url/imagem_url por uma LISTA: [{url}] na ordem em
-- que aparecem. Os campos antigos continuam funcionando como um item só, para
-- quem já cadastrou não perder o que tinha posto.
alter table funcionalidades
  add column if not exists midias jsonb default '[]'::jsonb,
  add column if not exists intervalo int default 5;
