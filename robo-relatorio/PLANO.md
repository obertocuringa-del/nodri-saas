# Robô do relatório no servidor — plano combinado com o dono (28/09/2026)

Leia inteiro antes de mexer. Este arquivo é o combinado; a sessão na nuvem
continua daqui.

## O que já existe

- `relatorio_original_windows.py` — CÓPIA do robô que roda hoje no Windows do
  dono (original em `D:\SISTEMA NODRI\APLICATIVOS NODRI\GERAR  RELATORIO TODOS
  OS DIAS  - ROBO\relatorio.py`, 17 mil linhas, Selenium). NÃO editar esta
  cópia: ela é a referência. O executável do Windows continua existindo e
  funcionando igual (é com ele que o dono faz a COLETA HISTÓRICA de salão novo).
- Servidor: Hostinger `2.25.250.201` (ver `scripts/publicar-servidor.sh`).
  Lá roda `robo-avec/index.mjs` (pm2 `robo-avec`): um Chrome por salão, perfil
  próprio em `/home/nodri/robo/perfis/<salao_id>`, com a extensão
  `extensao-feedback-avec` já LOGADA no Avec. Login/senha/endereço do Avec
  vêm do NODRI: `salao_config` chave `crm_robo_avec` (senha cifrada,
  `src/lib/crmRoboAvec.ts`) + `crm_automacao_feedback.url_login`.
- A extensão já reloga com paciência quando o Avec cai (`chegarLogado` em
  `extensao-feedback-avec/background.js`). Reaproveitar a mesma lógica.

## O que o dono quer (palavras dele, resumidas)

1. O mesmo robô, **idêntico** em tempos, passos e conferências — só que
   automático no servidor, sem baixar planilha à mão e sem tela do exe.
2. **Outra aba no MESMO Chrome do salão** (o da extensão). Não fecha nada ao
   terminar; na próxima vez volta à mesma aba. Não faz login se já estiver
   logado; se deslogou, reloga com o cadastro do CRM.
3. Só **coleta do mês atual** no automático. Coleta histórica NÃO entra no
   automático (continua manual pelo exe do Windows quando entra salão novo).
4. Agenda por salão controlada no **painel administrador do NODRI**:
   - Tela 1 (primeira coisa que aparece): **grade de horários** do servidor,
     blocos de 15 min (cada coleta leva ~15 min), mostrando livre/ocupado e de
     qual salão — para escolher o horário do próximo salão.
   - Tela 2 (dentro de cada salão em Admin > Salões): liga/desliga, quantas
     vezes por dia (1, 2, 3...) e os horários; última execução e resultado.
   - Nunca duas coletas ao mesmo tempo além do limite do servidor (hoje 1).
     Atrasou? A próxima espera (fila).
5. **Não pode aplicar dado errado sem ele ver.** Hoje ele abre o Excel e
   confere antes de importar. No automático:
   - Cada execução guarda o **Excel gerado** (baixável no painel) e um
     **resumo de conferência**: nº de atendimentos, faturamento, dias do mês
     com dados, comparação com a coleta anterior.
   - Regras de trava (se qualquer uma falhar, NÃO importa: fica
     "aguardando aprovação" com o motivo, e ele aprova ou descarta no painel):
     zero linhas; menos linhas que a coleta anterior do mesmo mês (dado não
     some); dia do mês já passado sem nenhum atendimento quando antes tinha;
     faturamento caiu mais que 5% em relação à anterior; erro/timeout no meio.
   - Passou em tudo: importa sozinho e registra "aplicado".
6. Manter as funcionalidades do robô (atalhos, botões de coleta): o exe do
   Windows fica INTACTO. No painel, botão **"Rodar agora"** por salão.

## Como fazer (ordem)

0. **Backup antes de qualquer teste**: snapshot da VPS no hPanel da
   Hostinger (o dono clica) + conferir backup diário do Supabase (plano Pro) +
   exportar `atendimentos_raw`/`relatorio_periodos` do Rouge para uma tabela
   `bkp_relatorio_<data>`. Só então testar.
1. Extrair do `relatorio_original_windows.py` SÓ o motor de coleta do mês
   (`SistemaColetaNodri.coletar_mes_completo` + `BaseDadosNodri` + geração do
   Excel) para `robo-relatorio/coleta.py`, sem Tkinter, sem Agendador do
   Windows, sem login do NODRI. Tempos iguais aos do original.
2. Conectar o Selenium ao Chrome JÁ ABERTO do salão (o `robo-avec` sobe cada
   Chrome com `--remote-debugging-port` fixo por salão, gravado em
   `/home/nodri/robo/perfis/<id>/porta`) e usar uma aba própria "Relatório".
3. Entrega ao NODRI por API (não pela tela): rota nova
   `/api/robo/relatorio` com `x-crm-chave`, recebe o Excel + resumo, roda as
   travas do item 5 e chama a MESMA função de importação que a tela
   `/salon/relatorios/importar-excel` usa (não duplicar regra de importação).
4. Painel admin: tabela `robo_coletas` (salao_id, inicio, fim, situacao
   aplicado|aguardando|descartado|erro, motivo, linhas, faturamento,
   excel_url) + `salao_config` `robo_relatorio_agenda` (ligado, horarios[]).
   Telas: grade de horários + config por salão + histórico com Excel.
5. Agendador no servidor (pm2 `robo-relatorio`): a cada minuto olha a agenda,
   respeita a fila e o limite de simultâneas.
6. Testar só no Rouge, comparando a coleta automática com uma coleta manual
   do exe no mesmo dia (mesmos números = pronto). Só depois ligar para outros.

## Não fazer

- Não mexer no exe do Windows nem na cópia original.
- Não importar sem as travas.
- Não fazer login novo no Avec se a aba da extensão já está logada.
- Não guardar senha em arquivo do servidor: vem do NODRI, cifrada.
