-- ════════════════════════════════════════════════════════════════════════════
-- CRM NODRI — as tabelas
--
-- O CRM não é uma tela que mostra o WhatsApp. É um sistema de ESTADOS: cada
-- conversa sabe de quem é a vez, quem é o dono, qual a próxima ação e até
-- quando. Foi por isso que o desenho separa `crm_conversas` (o estado) de
-- `crm_mensagens` (o texto): a fila de trabalho da recepção se responde
-- lendo só a primeira, que é pequena e tem índice.
--
-- Nada aqui repete o que o NODRI já tem. O histórico da cliente continua
-- morando em atendimentos_raw e em relatorio_periodos; o CRM só guarda o
-- telefone normalizado para reconhecer quem está escrevendo.
--
-- Rodar uma vez no Supabase (SQL Editor).
-- ════════════════════════════════════════════════════════════════════════════

-- ── O canal: o WhatsApp conectado ───────────────────────────────────────────
-- IDENTIDADE DO SALÃO. Nunca é copiado do salão modelo: se viajasse, salão
-- novo nasceria apontando para o WhatsApp de outro — o mesmo defeito que já
-- aconteceu com o link da vitrine.
CREATE TABLE IF NOT EXISTS crm_canais (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id      uuid NOT NULL,
  numero        text,                       -- o número conectado, como o WhatsApp devolve
  nome_exibicao text,
  -- desconectado | aguardando_qr | conectando | conectado | caiu
  situacao      text NOT NULL DEFAULT 'desconectado',
  qr            text,                       -- QR corrente, quando aguardando leitura
  qr_expira_em  timestamptz,
  sessao        jsonb,                      -- credenciais da sessão, gravadas pela ponte
  visto_em      timestamptz,                -- último sinal de vida da ponte
  erro          text,
  criado_em     timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_canal_salao ON crm_canais(salao_id);

-- ── Contato: quem está do outro lado ────────────────────────────────────────
-- `telefone` é o número NORMALIZADO (só dígitos, com 55, sem o nono dígito
-- variável). É ele que evita a mesma cliente virar duas pessoas e duas
-- estatísticas por causa de grafia.
CREATE TABLE IF NOT EXISTS crm_contatos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id      uuid NOT NULL,
  telefone      text NOT NULL,
  telefone_bruto text,
  nome          text,
  nome_agenda   text,                       -- como veio do WhatsApp
  cliente_nome  text,                       -- nome com que aparece em atendimentos_raw
  etiquetas     text[] DEFAULT '{}',        -- noiva, alérgica, só sábado...
  observacao    text,
  criado_em     timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);
-- Quando o relogio conferiu este contato no historico do salao pela ultima
-- vez. Sem isso ele reconferiria a base inteira a cada minuto.
ALTER TABLE crm_contatos ADD COLUMN IF NOT EXISTS conferido_em timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contato_tel ON crm_contatos(salao_id, telefone);

-- ── Conversa: o estado, que é o coração do CRM ──────────────────────────────
-- estado:
--   acao_necessaria  a cliente falou por último. O relógio corre.
--   aguardando       o salão respondeu. O relógio para.
--   follow_up        a cliente não respondeu no prazo. Virou tarefa com data.
--   pausada          a cliente pediu para falar depois. Volta sozinha na data.
--   agendado         virou horário. Oportunidade ganha.
--   sem_conversao    fechada perdida, com motivo obrigatório.
CREATE TABLE IF NOT EXISTS crm_conversas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id        uuid NOT NULL,
  contato_id      uuid NOT NULL REFERENCES crm_contatos(id) ON DELETE CASCADE,
  estado          text NOT NULL DEFAULT 'acao_necessaria',
  assunto         text,                     -- mechas, corte, orçamento...
  proxima_acao    text,                     -- o que precisa acontecer agora
  prazo           timestamptz,              -- quando o follow-up ou a pausa vence
  dono_id         uuid,                     -- quem está cuidando (salao_usuarios)
  dono_nome       text,
  dono_ate        timestamptz,              -- trava temporária, evita dois respondendo
  -- Relógio: quando a cliente falou por último sem resposta. Base do SLA.
  aguardando_desde timestamptz,
  ultima_em       timestamptz,
  ultima_de       text,                     -- cliente | salao
  ultima_previa   text,                     -- primeiras palavras, para a lista
  nao_lidas       int NOT NULL DEFAULT 0,
  motivo_perda    text,
  valor_estimado  numeric,
  fechada_em      timestamptz,
  criado_em       timestamptz DEFAULT now(),
  atualizado_em   timestamptz DEFAULT now()
);
-- Conversa que veio do historico do celular, nao de uma cliente que chegou
-- agora. Sem essa marca a taxa de conversao contaria como oportunidade
-- tudo que ja estava no WhatsApp, e o numero nasceria mentindo.
ALTER TABLE crm_conversas ADD COLUMN IF NOT EXISTS importada boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_crm_conv_fila    ON crm_conversas(salao_id, estado, aguardando_desde);
CREATE INDEX IF NOT EXISTS idx_crm_conv_contato ON crm_conversas(salao_id, contato_id);
CREATE INDEX IF NOT EXISTS idx_crm_conv_prazo   ON crm_conversas(salao_id, prazo);

-- ── Mensagem ────────────────────────────────────────────────────────────────
-- `situacao` cobre o caminho de saída: fica em `na_fila` até a ponte pegar,
-- e nunca some se a conexão cair no meio.
CREATE TABLE IF NOT EXISTS crm_mensagens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id      uuid NOT NULL,
  conversa_id   uuid NOT NULL REFERENCES crm_conversas(id) ON DELETE CASCADE,
  direcao       text NOT NULL,              -- entrada | saida
  texto         text,
  tipo          text DEFAULT 'texto',       -- texto | imagem | audio | documento
  midia_url     text,
  -- na_fila | enviando | enviada | entregue | lida | falhou
  situacao      text NOT NULL DEFAULT 'enviada',
  tentativas    int NOT NULL DEFAULT 0,
  erro          text,
  id_whatsapp   text,                       -- id da mensagem no WhatsApp
  autor_id      uuid,                       -- quem digitou, quando é saída
  autor_nome    text,
  criado_em     timestamptz DEFAULT now(),
  enviado_em    timestamptz
);
-- Disparo de lista. Mensagem do salao que NAO e resposta para aquela
-- pessoa: gravada e mostrada, mas nao tira ninguem da fila.
ALTER TABLE crm_mensagens ADD COLUMN IF NOT EXISTS em_massa boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_crm_msg_disparo ON crm_mensagens(salao_id, direcao, criado_em);
CREATE INDEX IF NOT EXISTS idx_crm_msg_conversa ON crm_mensagens(conversa_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_crm_msg_fila     ON crm_mensagens(salao_id, situacao) WHERE situacao = 'na_fila';
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_msg_wpp ON crm_mensagens(salao_id, id_whatsapp) WHERE id_whatsapp IS NOT NULL;

-- ── Evento: toda mudança de estado, com quem e quando ───────────────────────
-- É daqui que sai tempo de resposta e a auditoria. Sem isso, medir conversão
-- vira chute e ninguém sabe quem fez o quê.
CREATE TABLE IF NOT EXISTS crm_eventos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id      uuid NOT NULL,
  conversa_id   uuid NOT NULL REFERENCES crm_conversas(id) ON DELETE CASCADE,
  tipo          text NOT NULL,              -- entrou | respondeu | mudou_estado | assumiu | fechou
  de_estado     text,
  para_estado   text,
  autor_id      uuid,
  autor_nome    text,
  detalhe       text,
  criado_em     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_ev_conversa ON crm_eventos(conversa_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_crm_ev_salao    ON crm_eventos(salao_id, criado_em);

-- ── Mensagens prontas ───────────────────────────────────────────────────────
-- CATÁLOGO: viaja do salão modelo para os salões novos.
CREATE TABLE IF NOT EXISTS crm_modelos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id      uuid NOT NULL,
  nome          text NOT NULL,
  texto         text NOT NULL,
  atalho        text,
  ordem         int DEFAULT 0,
  ativo         boolean DEFAULT true,
  criado_em     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_modelos_salao ON crm_modelos(salao_id, ordem);

-- ── Motivos de não conversão ────────────────────────────────────────────────
-- CATÁLOGO: viaja do salão modelo. É o que transforma "perdemos 40" em
-- "perdemos 22 por preço e 11 por falta de horário no sábado".
CREATE TABLE IF NOT EXISTS crm_motivos_perda (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id      uuid NOT NULL,
  nome          text NOT NULL,
  ordem         int DEFAULT 0,
  ativo         boolean DEFAULT true,
  criado_em     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_motivos_salao ON crm_motivos_perda(salao_id, ordem);

-- ── Origem da conversa ──────────────────────────────────────────────────────
-- De onde a pessoa veio: trafego pago, indicacao, Google, passou em frente.
-- Sem isso o salao sabe quanto gastou em anuncio e nao sabe o que voltou.
ALTER TABLE crm_conversas ADD COLUMN IF NOT EXISTS origem text;
CREATE INDEX IF NOT EXISTS idx_crm_conv_origem ON crm_conversas(salao_id, origem);

-- CATALOGO: viaja do salao modelo para os saloes novos.
CREATE TABLE IF NOT EXISTS crm_origens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salao_id      uuid NOT NULL,
  nome          text NOT NULL,
  ordem         int DEFAULT 0,
  ativo         boolean DEFAULT true,
  criado_em     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_origens_salao ON crm_origens(salao_id, ordem);

-- ── Responder citando ───────────────────────────────────────────────────────
-- Numa conversa de salao a cliente manda cinco perguntas seguidas. Responder
-- "pode sim" sem dizer a qual delas e o jeito mais rapido de combinar coisa
-- errada. Aponta para a mensagem citada.
ALTER TABLE crm_mensagens ADD COLUMN IF NOT EXISTS responde_a uuid;

-- ── De qual numero sao os dados ─────────────────────────────────────────────
-- O salao pode trocar o WhatsApp (do celular pessoal para o da recepcao, por
-- exemplo). As conversas do numero anterior continuam nas tabelas e passam a
-- mentir: a tela mostra o numero novo no topo e as conversas do antigo
-- embaixo. Guardar de qual numero o historico veio e o que permite a tela
-- dizer isso em voz alta em vez de deixar a pessoa descobrir sozinha.
ALTER TABLE crm_canais ADD COLUMN IF NOT EXISTS numero_dados text;

-- ── Uma ponte por salao ─────────────────────────────────────────────────────
-- Duas pontes abrindo a mesma sessao de WhatsApp brigam e derrubam a conexao.
-- Posse com validade: quem chega primeiro fica dono e so perde depois de dois
-- minutos sem sinal.
ALTER TABLE crm_canais ADD COLUMN IF NOT EXISTS ponte_dono text;
ALTER TABLE crm_canais ADD COLUMN IF NOT EXISTS ponte_visto_em timestamptz;
