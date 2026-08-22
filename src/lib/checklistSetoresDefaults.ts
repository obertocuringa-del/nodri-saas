// Listas-padrão dos setores que ainda não tinham check list de tarefas:
// RH, Comercial, Marketing, Responsável Técnica e Profissionais.
//
// Sem check list, o setor não conseguia receber nem enviar demanda dos
// outros — era o buraco que sobrou depois que o Financeiro ganhou o dele.
// (Compras ficou de fora a pedido do dono: o setor trabalha por pedido de
// compra, não por rotina marcável.)
//
// O conteúdo nasce das demandas que cada setor já tinha no organograma, agora
// como tarefa com período. Cada salão edita o que é dele.

export interface CatSetor { nome: string; itens: { texto: string; freq?: string }[] }

// ── RH / GESTÃO DE PESSOAS ────────────────────────────────────────────────
export const CHECKLIST_RH: CatSetor[] = [
  {
    nome: 'ADMISSÃO E DOCUMENTAÇÃO',
    itens: [
      { texto: 'Conferir a pasta individual de cada profissional admitido no mês', freq: 'Mensal' },
      { texto: 'Conferir documentos pendentes de quem entrou', freq: 'Semanal' },
      { texto: 'Conferir contrato de parceria assinado dos PJ', freq: 'Mensal' },
      { texto: 'Conferir CNPJ ativo e regularidade cadastral dos PJ', freq: 'Mensal' },
      { texto: 'Conferir certificados e qualificações vencendo', freq: 'Mensal' },
      { texto: 'Fazer o onboarding de quem entrou nesta semana', freq: 'Semanal' },
    ],
  },
  {
    nome: 'BENEFÍCIOS E FÉRIAS',
    itens: [
      { texto: 'Calcular VT e VA do mês', freq: 'Mensal' },
      { texto: 'Conferir os períodos aquisitivos de férias', freq: 'Mensal' },
      { texto: 'Avisar quem está com férias vencendo', freq: 'Mensal' },
      { texto: 'Programar as férias do trimestre com a coordenação', freq: 'Trimestral' },
      { texto: 'Conferir os benefícios lançados no fechamento', freq: 'Mensal' },
    ],
  },
  {
    nome: 'DESEMPENHO E DESENVOLVIMENTO',
    itens: [
      { texto: 'Ler as solicitações dos profissionais e responder', freq: 'Diário' },
      { texto: 'Acompanhar as avaliações lançadas pelos líderes', freq: 'Quinzenal' },
      { texto: 'Conversar com quem caiu de desempenho', freq: 'Mensal' },
      { texto: 'Montar o calendário de treinamentos do mês', freq: 'Mensal' },
      { texto: 'Conferir presença nos treinamentos realizados', freq: 'Mensal' },
      { texto: 'Revisar o plano de carreira da equipe', freq: 'Semestral' },
    ],
  },
  {
    nome: 'DESLIGAMENTO',
    itens: [
      { texto: 'Conferir se o distrato foi assinado e arquivado', freq: 'Mensal' },
      { texto: 'Conferir devolução de materiais e chaves', freq: 'Mensal' },
      { texto: 'Tirar o acesso do sistema de quem saiu', freq: 'Semanal' },
      { texto: 'Registrar o motivo da saída para acompanhar a rotatividade', freq: 'Mensal' },
    ],
  },
]

// ── COMERCIAL / VENDAS ────────────────────────────────────────────────────
export const CHECKLIST_COMERCIAL: CatSetor[] = [
  {
    nome: 'ACOMPANHAMENTO DIÁRIO',
    itens: [
      { texto: 'Conferir o faturamento do dia anterior', freq: 'Diário' },
      { texto: 'Conferir agenda vazia dos próximos dias', freq: 'Diário' },
      { texto: 'Fazer o follow-up dos orçamentos em aberto', freq: 'Diário' },
      { texto: 'Conferir clientes novos que ainda não voltaram', freq: 'Semanal' },
    ],
  },
  {
    nome: 'RECUPERAÇÃO E FIDELIZAÇÃO',
    itens: [
      { texto: 'Rodar a lista de clientes sumidos e disparar a recuperação', freq: 'Semanal' },
      { texto: 'Conferir quem respondeu e agendar', freq: 'Semanal' },
      { texto: 'Acompanhar a taxa de retorno da 2ª visita', freq: 'Mensal' },
      { texto: 'Conferir os clientes em risco do mês', freq: 'Mensal' },
      { texto: 'Falar com os clientes de alto ticket que não voltaram', freq: 'Mensal' },
    ],
  },
  {
    nome: 'METAS E RESULTADO',
    itens: [
      { texto: 'Conferir a meta do mês contra o realizado', freq: 'Semanal' },
      { texto: 'Conferir o ticket médio por profissional', freq: 'Quinzenal' },
      { texto: 'Conferir a conversão de orçamento em atendimento', freq: 'Mensal' },
      { texto: 'Definir a meta comercial do mês seguinte', freq: 'Mensal' },
      { texto: 'Levar o resultado comercial para a reunião da direção', freq: 'Mensal' },
      { texto: 'Revisar as estratégias de aumento de faturamento', freq: 'Trimestral' },
    ],
  },
]

// ── MARKETING ─────────────────────────────────────────────────────────────
export const CHECKLIST_MARKETING: CatSetor[] = [
  {
    nome: 'REDES SOCIAIS',
    itens: [
      { texto: 'Postar o conteúdo do dia', freq: 'Diário' },
      { texto: 'Responder comentários e mensagens diretas', freq: 'Diário' },
      { texto: 'Gravar material no salão para a semana', freq: 'Semanal' },
      { texto: 'Conferir o alcance e o engajamento da semana', freq: 'Semanal' },
      { texto: 'Montar o cronograma de conteúdo do mês', freq: 'Mensal' },
    ],
  },
  {
    nome: 'CAMPANHAS E PROMOÇÕES',
    itens: [
      { texto: 'Conferir as campanhas no ar e o resultado delas', freq: 'Semanal' },
      { texto: 'Comunicar à equipe a campanha da semana', freq: 'Semanal' },
      { texto: 'Preparar a campanha do mês seguinte', freq: 'Mensal' },
      { texto: 'Conferir se os materiais promocionais estão impressos e expostos', freq: 'Mensal' },
      { texto: 'Levantar as datas comemorativas do trimestre', freq: 'Trimestral' },
    ],
  },
  {
    nome: 'RELACIONAMENTO',
    itens: [
      { texto: 'Enviar as mensagens dos aniversariantes do dia', freq: 'Diário' },
      { texto: 'Conferir a lista de aniversariantes do mês', freq: 'Mensal' },
      { texto: 'Conferir as avaliações recebidas no Google', freq: 'Semanal' },
      { texto: 'Responder as avaliações, boas e ruins', freq: 'Semanal' },
      { texto: 'Acompanhar a nota da pesquisa de satisfação', freq: 'Mensal' },
      { texto: 'Planejar o evento ou ação de relacionamento do trimestre', freq: 'Trimestral' },
    ],
  },
]

// ── RESPONSÁVEL TÉCNICA ───────────────────────────────────────────────────
export const CHECKLIST_TECNICA: CatSetor[] = [
  {
    nome: 'PADRÃO TÉCNICO',
    itens: [
      { texto: 'Acompanhar a execução dos serviços na cadeira', freq: 'Diário' },
      { texto: 'Conferir se os POPs estão sendo seguidos', freq: 'Semanal' },
      { texto: 'Orientar tecnicamente quem apresentou falha', freq: 'Semanal' },
      { texto: 'Revisar os protocolos dos procedimentos', freq: 'Trimestral' },
      { texto: 'Atualizar os POPs que mudaram', freq: 'Trimestral' },
    ],
  },
  {
    nome: 'SEGURANÇA E NORMAS',
    itens: [
      { texto: 'Conferir uso de EPI pela equipe', freq: 'Diário' },
      { texto: 'Conferir a esterilização dos materiais', freq: 'Diário' },
      { texto: 'Conferir a dosagem e a diluição dos produtos', freq: 'Semanal' },
      { texto: 'Conferir validade dos produtos em uso', freq: 'Mensal' },
      { texto: 'Conferir descarte correto de resíduos', freq: 'Mensal' },
      { texto: 'Conferir as normas sanitárias vigentes', freq: 'Semestral' },
    ],
  },
  {
    nome: 'QUALIFICAÇÃO DA EQUIPE',
    itens: [
      { texto: 'Validar as qualificações técnicas de quem entrou', freq: 'Mensal' },
      { texto: 'Conferir certificados técnicos vencendo', freq: 'Trimestral' },
      { texto: 'Levantar a necessidade de treinamento técnico', freq: 'Trimestral' },
      { texto: 'Renovar a responsabilidade técnica no conselho', freq: 'Anual' },
    ],
  },
]

// ── PROFISSIONAIS (rotina de quem está na cadeira) ────────────────────────
export const CHECKLIST_PROFISSIONAIS: CatSetor[] = [
  {
    nome: 'ANTES DE ATENDER',
    itens: [
      { texto: 'Conferir a agenda do dia', freq: 'Diário' },
      { texto: 'Organizar a estação de trabalho', freq: 'Diário' },
      { texto: 'Conferir os materiais que vai usar', freq: 'Diário' },
      { texto: 'Conferir se o material esterilizado está separado', freq: 'Diário' },
      { texto: 'Estar de uniforme e dentro do padrão de apresentação', freq: 'Diário' },
    ],
  },
  {
    nome: 'DURANTE O ATENDIMENTO',
    itens: [
      { texto: 'Seguir o POP do serviço', freq: 'Diário' },
      { texto: 'Usar o EPI do procedimento', freq: 'Diário' },
      { texto: 'Usar a dosagem certa do produto', freq: 'Diário' },
      { texto: 'Registrar o serviço realizado na comanda', freq: 'Diário' },
      { texto: 'Oferecer os serviços complementares indicados', freq: 'Diário' },
    ],
  },
  {
    nome: 'DEPOIS DO ATENDIMENTO',
    itens: [
      { texto: 'Deixar a estação limpa para o próximo', freq: 'Diário' },
      { texto: 'Encaminhar o material para a esterilização', freq: 'Diário' },
      { texto: 'Agendar o retorno da cliente', freq: 'Diário' },
      { texto: 'Avisar a coordenação sobre material acabando', freq: 'Semanal' },
    ],
  },
  {
    nome: 'ACOMPANHAMENTO',
    itens: [
      { texto: 'Conferir a própria meta e a posição na corrida interna', freq: 'Semanal' },
      { texto: 'Ler o feedback recebido e responder', freq: 'Semanal' },
      { texto: 'Participar do treinamento marcado', freq: 'Mensal' },
      { texto: 'Conferir a própria avaliação com o líder', freq: 'Mensal' },
    ],
  },
]
