-- ── Planos NODRI 50 / 100 / 150 / 300 ───────────────────────────────────────
--
-- RODAR ANTES DO DEPLOY. Hoje o módulo não bloqueia nada: o middleware nunca
-- consultou `salao_modulos` e o card só mostrava um cadeado visual. No deploy
-- que liga o gate, quem estiver sem módulo no banco perde a tela na hora.
-- Este script preenche o banco primeiro, para que ninguém perca acesso.
--
-- Foto do banco em 14/08/2026, antes de rodar:
--   Rouge (Oliveira e Schneider)  ativo    Premium       8 módulos
--   Send Beauty                   vencido  Profissional  8 módulos
--   123                           ativo    Premium       0 módulos
--   MODELO                        ativo    Premium       0 módulos
--
-- É idempotente: pode rodar de novo sem duplicar nada.

begin;

-- ── 1. Catálogo comercial: os 4 planos ─────────────────────────────────────
-- Os planos antigos (Básico / Profissional / Premium) NÃO são apagados. Os
-- salões atuais apontam para eles via `saloes.plano_id`, e apagar quebraria
-- a FK. Eles são só desativados para sumir da vitrine e do checkout.

insert into planos (nome, slug, preco, max_usuarios, descricao, ativo) values
  ('Inicial',   'inicial',   50,  3,  'A base do sistema com a gestão da equipe.',        true),
  ('Essencial', 'essencial', 100, 5,  'Some o controle financeiro do salão.',             true),
  ('Gestão',    'gestao',    150, 10, 'Importa seus atendimentos e liga os relatórios.',  true),
  ('Completo',  'completo',  300, 20, 'Tudo, mais o aplicativo de WhatsApp.',             true)
on conflict (slug) do update set
  nome = excluded.nome,
  preco = excluded.preco,
  descricao = excluded.descricao,
  ativo = true;

update planos set ativo = false
 where slug in ('basico', 'profissional', 'premium')
    or lower(nome) in ('básico', 'basico', 'profissional', 'premium');

-- ── 2. Preencher `salao_modulos` conforme o que cada salão paga ────────────

-- 123 — cliente pagante de R$ 300. Recebe os 5 módulos (8 linhas).
insert into salao_modulos (salao_id, modulo_id, ativo)
select s.id, m.id, true
  from saloes s cross join modulos m
 where s.nome = '123'
   and not exists (
     select 1 from salao_modulos sm where sm.salao_id = s.id and sm.modulo_id = m.id
   );

-- MODELO — não é cliente. É a fonte que alimenta salão novo, e o dono precisa
-- conseguir editar todas as áreas para manter o template. Sem os módulos, o
-- `modeloTabelas` passaria a copiar de um salão que ninguém consegue abrir.
insert into salao_modulos (salao_id, modulo_id, ativo)
select s.id, m.id, true
  from saloes s cross join modulos m
 where s.nome = 'MODELO'
   and not exists (
     select 1 from salao_modulos sm where sm.salao_id = s.id and sm.modulo_id = m.id
   );

-- Garante que nada ficou com ativo = false nesses dois.
update salao_modulos sm set ativo = true
  from saloes s
 where s.id = sm.salao_id and s.nome in ('123', 'MODELO');

-- Send Beauty — paga Profissional, que no desenho novo é o Gestão (R$ 150).
-- Estava com os 8, Suite inclusive, que é item do Completo (R$ 300). Sai a
-- Suite; ficam Profissionais, Academia, Calculadora e Relatórios.
-- Ele está VENCIDO: o middleware já o manda para /renovar-licenca, então esta
-- mudança não tira nada que ele use hoje.
delete from salao_modulos sm
 using saloes s, modulos m
 where sm.salao_id = s.id
   and sm.modulo_id = m.id
   and s.nome = 'Send Beauty'
   and m.nome in ('Confirmar Agendamento', 'Enviar Feedback', 'Enviar Lista', 'Enviar Lista c/ Arquivo');

-- Rouge — já está com os 8 e é Premium/Completo. Nenhuma linha o toca.

commit;

-- ── Conferência ────────────────────────────────────────────────────────────
-- Esperado depois de rodar:
--   123          8    MODELO       8
--   Rouge        8    Send Beauty  4
select s.nome, s.status, count(sm.id) filter (where sm.ativo) as modulos_ativos
  from saloes s
  left join salao_modulos sm on sm.salao_id = s.id
 group by s.nome, s.status
 order by s.nome;
