-- Memoria da IA separada por profissional.
--
-- A tabela ia_memoria_semantica so tinha salao_id. Isso significa que a
-- memoria era um balde unico do salao: o que a IA aprendeu conversando com o
-- dono sobre a Vera podia voltar como "memoria" dentro do chat da Celia.
--
-- Nao e um risco teorico: o resumo guardado e um pedaco literal da conversa
-- anterior. Todo o cuidado de isolamento que existe nas ferramentas (quatro
-- delas bloqueadas no servidor no modo profissional) era contornado por aqui,
-- sem ninguem perceber, porque a memoria entra no prompt sem passar por
-- ferramenta nenhuma.
--
-- Com a coluna, cada lado le so a sua:
--   profissional_id preenchido -> memoria daquele profissional
--   profissional_id nulo       -> memoria do salao (chat do gestor)
--
-- As linhas que ja existem ficam com nulo, ou seja, continuam sendo do
-- gestor — que e de onde a maioria delas saiu.
--
-- Rodar uma vez no SQL Editor do Supabase. E idempotente.

alter table ia_memoria_semantica
  add column if not exists profissional_id uuid;

create index if not exists ia_memoria_salao_prof
  on ia_memoria_semantica (salao_id, profissional_id);
