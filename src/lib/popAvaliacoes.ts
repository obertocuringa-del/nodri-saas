// Modelos de AVALIAÇÃO pontuada por POP (client-safe, sem imports de servidor).
// Chave = id do documento do POP (o mesmo id usado em conteudoDefaults.ts).
// Cada POP novo pode ter sua própria avaliação — basta adicionar aqui.
//
// Como a nota funciona:
// - Cada seção tem um peso (pontos). A nota da seção = (itens "Sim" ÷ total) × peso.
// - Seções "condicional: true" podem ser marcadas como "Não se aplica" e saem da conta.
// - Percentual = pontos obtidos ÷ pontos aplicáveis × 100 (sempre normaliza p/ 100%).
// - Faixa: ≥90 Excelente · ≥80 Bom · ≥70 Regular · ≥60 Necessita Treinamento · <60 Crítico

export interface SecaoAvaliacao {
  titulo: string
  pontos: number
  condicional?: boolean   // só conta quando o avaliador marcar que se aplica
  nota?: string           // observação opcional exibida abaixo do título
  itens: string[]
}
export interface ModeloAvaliacao {
  secoes: SecaoAvaliacao[]
  /** Critérios avaliados com nota de 1 a 5 (não entram na pontuação; geram uma média própria). */
  comportamental?: string[]
}

export function faixaResultado(pct: number): { label: string; emoji: string; cor: string } {
  if (pct >= 90) return { label: 'Excelente', emoji: '⭐', cor: '#059669' }
  if (pct >= 80) return { label: 'Bom', emoji: '✅', cor: '#10b981' }
  if (pct >= 70) return { label: 'Regular', emoji: '⚠️', cor: '#f59e0b' }
  if (pct >= 60) return { label: 'Necessita Treinamento', emoji: '🔶', cor: '#f97316' }
  return { label: 'Crítico', emoji: '❌', cor: '#dc2626' }
}

export const AVALIACOES_POP: Record<string, ModeloAvaliacao> = {
  // POP-REC-001 — Atendimento Presencial (Primeiro Contato) — 100 pontos
  'pop-rec-001': {
    secoes: [
      {
        titulo: 'Recepção e Acolhimento', pontos: 20, itens: [
          'Levantou-se para receber o cliente',
          'Cumprimentou o cliente imediatamente',
          'Apresentou-se pelo nome',
          'Informou o nome do salão',
          'Demonstrou simpatia e cordialidade',
          'Manteve contato visual',
          'Manteve postura profissional',
          'Demonstrou interesse em ajudar',
        ],
      },
      {
        titulo: 'Cadastro e Atualização Cadastral', pontos: 10, itens: [
          'Verificou se já possuía cadastro',
          'Atualizou informações quando necessário',
          'Confirmou telefone',
          'Confirmou data de nascimento',
          'Solicitou e-mail',
          'Perguntou como conheceu o salão',
        ],
      },
      {
        titulo: 'Identificação da Necessidade', pontos: 15, itens: [
          'Perguntou qual serviço deseja realizar',
          'Perguntou profissional de preferência',
          'Perguntou disponibilidade de dias',
          'Perguntou disponibilidade de horários',
          'Demonstrou interesse genuíno pela necessidade do cliente',
        ],
      },
      {
        titulo: 'Agendamento e Recuperação de Agenda', pontos: 15, itens: [
          'Consultou corretamente a agenda',
          'Confirmou disponibilidade antes de prometer horário',
          'Quando necessário, ofereceu outro horário',
          'Quando necessário, ofereceu outra data',
          'Quando necessário, ofereceu outro profissional',
          'Inseriu cliente na lista de espera',
          'Confirmou procedimento, profissional, data e horário',
        ],
      },
      {
        titulo: 'Vendas e Fidelização', pontos: 20, itens: [
          'Verificou procedimentos em atraso',
          'Sugeriu serviço complementar',
          'Ofereceu tratamento capilar',
          'Perguntou se desejava outro procedimento',
          'Apresentou campanha ou promoção vigente',
          'Identificou oportunidade de venda adicional',
          'Apresentou benefício de realizar mais de um serviço',
          'Demonstrou conhecimento dos serviços do salão',
        ],
      },
      {
        titulo: 'Reagendamento Preventivo', pontos: 10, itens: [
          'Ofereceu próximo agendamento',
          'Explicou o período ideal de retorno',
          'Destacou benefícios de garantir a vaga',
          'Tentou efetivamente realizar o reagendamento',
        ],
      },
      {
        titulo: 'Finalização do Atendimento', pontos: 10, itens: [
          'Agradeceu a preferência',
          'Confirmou todas as informações do agendamento',
          'Informou que enviaria confirmação pelo WhatsApp',
          'Despediu-se cordialmente',
          'Finalizou transmitindo segurança e confiança',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Organização',
      'Proatividade',
      'Capacidade de Venda',
      'Conhecimento dos Serviços',
      'Postura Profissional',
    ],
  },

  // POP-REC-002 — Atendimento via WhatsApp (Primeiro Contato) — 100 pontos
  'pop-rec-002': {
    secoes: [
      {
        titulo: 'Abordagem Inicial', pontos: 20, itens: [
          'Respondeu a mensagem com agilidade',
          'Cumprimentou o cliente cordialmente',
          'Apresentou-se pelo nome',
          'Informou que é responsável pelo atendimento/agendamento',
          'Utilizou o nome do cliente durante a conversa',
          'Manteve linguagem educada e profissional',
          'Escreveu de forma clara, sem abreviações ou erros',
        ],
      },
      {
        titulo: 'Cadastro do Cliente', pontos: 10, itens: [
          'Verificou se o cliente já possuía cadastro',
          'Atualizou os dados quando necessário',
          'Coletou nome completo',
          'Confirmou telefone',
          'Solicitou data de nascimento',
          'Solicitou e-mail (quando possível)',
          'Perguntou como conheceu o salão',
        ],
      },
      {
        titulo: 'Levantamento da Necessidade', pontos: 15, itens: [
          'Perguntou qual procedimento deseja realizar',
          'Perguntou profissional de preferência',
          'Perguntou disponibilidade de dias',
          'Perguntou disponibilidade de horários',
          'Demonstrou interesse em entender a necessidade da cliente',
        ],
      },
      {
        titulo: 'Consulta de Agenda e Recuperação', pontos: 15, itens: [
          'Consultou corretamente a agenda',
          'Confirmou disponibilidade antes de prometer o horário',
          'Quando necessário, ofereceu outro horário',
          'Quando necessário, ofereceu outra data',
          'Quando necessário, ofereceu outro profissional',
          'Inseriu o cliente na lista de espera',
        ],
      },
      {
        titulo: 'Vendas e Consultoria', pontos: 20, itens: [
          'Verificou procedimentos em atraso',
          'Ofereceu serviço complementar',
          'Fez sugestão adequada ao serviço principal',
          'Perguntou se desejava realizar outro procedimento',
          'Apresentou tratamentos capilares',
          'Divulgou campanha ou promoção vigente',
        ],
      },
      {
        titulo: 'Reagendamento Preventivo', pontos: 10, itens: [
          'Ofereceu o próximo agendamento',
          'Explicou o período ideal de retorno',
          'Explicou a importância de garantir a vaga',
        ],
      },
      {
        titulo: 'Finalização', pontos: 10, itens: [
          'Confirmou data',
          'Confirmou horário',
          'Confirmou serviço',
          'Confirmou profissional',
          'Perguntou se desejava agendar algo mais',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação Escrita',
      'Cordialidade',
      'Agilidade na Resposta',
      'Proatividade',
      'Capacidade de Venda',
      'Conhecimento dos Serviços',
      'Postura Profissional',
    ],
  },

  // POP-REC-003 — Atendimento Telefônico (Primeiro Contato) — 100 pontos
  'pop-rec-003': {
    secoes: [
      {
        titulo: 'Atendimento e Saudação', pontos: 15, itens: [
          'Atendeu a ligação até o terceiro toque',
          'Utilizou a saudação padrão completa',
          'Informou o nome do salão',
          'Apresentou-se pelo nome',
          'Perguntou como poderia ajudar',
          'Manteve tom de voz cordial, claro e audível',
        ],
      },
      {
        titulo: 'Cadastro do Cliente', pontos: 10, itens: [
          'Verificou se já possuía cadastro',
          'Atualizou as informações quando necessário',
          'Confirmou telefone',
          'Solicitou data de nascimento',
          'Solicitou e-mail',
          'Perguntou como conheceu o salão',
        ],
      },
      {
        titulo: 'Identificação da Necessidade', pontos: 15, itens: [
          'Perguntou qual procedimento deseja realizar',
          'Perguntou profissional de preferência',
          'Perguntou disponibilidade de dias',
          'Perguntou disponibilidade de horários',
          'Escutou o cliente sem interromper',
        ],
      },
      {
        titulo: 'Consulta de Agenda e Recuperação', pontos: 15, itens: [
          'Consultou corretamente a agenda',
          'Confirmou disponibilidade antes de prometer o horário',
          'Quando necessário, ofereceu outro horário',
          'Quando necessário, ofereceu outra data',
          'Quando necessário, ofereceu outro profissional',
          'Inseriu o cliente na lista de espera',
        ],
      },
      {
        titulo: 'Confirmação Final', pontos: 10, itens: [
          'Confirmou o procedimento',
          'Confirmou a data',
          'Confirmou o horário',
          'Confirmou o profissional',
        ],
      },
      {
        titulo: 'Vendas e Consultoria', pontos: 15, itens: [
          'Verificou procedimentos em atraso',
          'Ofereceu serviço complementar para o mesmo dia',
          'Apresentou os tratamentos capilares',
          'Divulgou campanha ou promoção vigente',
          'Demonstrou conhecimento dos serviços do salão',
        ],
      },
      {
        titulo: 'Reagendamento Preventivo', pontos: 10, itens: [
          'Ofereceu o próximo horário antes de encerrar',
          'Explicou o período ideal de retorno',
          'Destacou o benefício de garantir a vaga',
        ],
      },
      {
        titulo: 'Encerramento e Confirmação por WhatsApp', pontos: 10, itens: [
          'Encerrou a ligação com a frase padrão de despedida',
          'Agradeceu a preferência',
          'Enviou a confirmação por WhatsApp imediatamente após a ligação',
          'A mensagem continha data, horário, serviços e profissional',
          'Programou o lembrete de um dia antes',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação e Clareza Vocal',
      'Cordialidade',
      'Agilidade no Atendimento',
      'Proatividade',
      'Capacidade de Venda',
      'Conhecimento dos Serviços',
      'Postura Profissional',
    ],
  },

  // POP-REC-006 — Atendimento Presencial (Chegada do Cliente) — 100 pontos
  'pop-rec-006': {
    secoes: [
      {
        titulo: 'Recepção e Acolhimento', pontos: 20, itens: [
          'Levantou-se imediatamente para recepcionar o cliente',
          'Utilizou a saudação de boas-vindas padrão',
          'Informou o nome do salão',
          'Perguntou o nome do cliente',
          'Demonstrou simpatia e entusiasmo',
          'Manteve contato visual',
          'Manteve postura profissional',
        ],
      },
      {
        titulo: 'Identificação e Abertura da Comanda', pontos: 15, itens: [
          'Perguntou se o cliente tinha agendamento',
          'Localizou o agendamento no sistema',
          'Abriu a comanda do cliente (digital ou física)',
          'Verificou os serviços agendados',
          'Confirmou serviço e profissional com o cliente',
        ],
      },
      {
        titulo: 'Cliente sem Agendamento (Encaixe)', pontos: 10, condicional: true,
        nota: 'Somente quando o cliente chega sem agendamento.',
        itens: [
          'Verificou a disponibilidade na agenda',
          'Tentou encaixar o cliente',
          'Ofereceu outro horário, data ou profissional',
          'Inseriu na lista de espera quando não foi possível',
        ],
      },
      {
        titulo: 'Acomodação e Conforto', pontos: 15, itens: [
          'Conduziu o cliente à área de espera ou à estação',
          'Ofereceu bebidas (café, chá, água, capuccino)',
          'Entregou e apresentou o cardápio de bebidas',
          'Ofereceu algo diferenciado',
          'Garantiu assento disponível e ambiente confortável',
          'Informou o Wi-Fi quando necessário',
        ],
      },
      {
        titulo: 'Comunicação com o Profissional', pontos: 10, itens: [
          'Comunicou imediatamente a chegada do cliente',
          'Informou o nome do cliente',
          'Informou os procedimentos agendados',
          'Informou o local onde o cliente está acomodado',
        ],
      },
      {
        titulo: 'Vendas e Oportunidades Durante a Espera', pontos: 20, itens: [
          'Consultou o histórico do cliente no sistema',
          'Identificou procedimentos em atraso',
          'Ofereceu tratamento capilar ou hidratação',
          'Apresentou produtos ou a nova linha',
          'Divulgou campanha ou combo vigente',
          'Sugeriu serviço complementar ao agendado',
          'Demonstrou conhecimento dos serviços do salão',
        ],
      },
      {
        titulo: 'Registro e Acompanhamento', pontos: 10, itens: [
          'Registrou a chegada no sistema',
          'Marcou o cliente como "em atendimento"',
          'Informou a gerência sobre a oportunidade identificada',
          'Acompanhou discretamente o fluxo do atendimento',
          'Encerrou a chegada com frase de cortesia',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Organização',
      'Proatividade',
      'Atenção ao Conforto do Cliente',
      'Capacidade de Venda',
      'Postura Profissional',
    ],
  },

  // POP-REC-007 — Atendimento Presencial (Finalização do Procedimento) — 100 pontos
  'pop-rec-007': {
    secoes: [
      {
        titulo: 'Recepção no Caixa', pontos: 10, itens: [
          'Levantou-se (quando possível) para atender o cliente',
          'Cumprimentou o cliente cordialmente',
          'Perguntou o nome do cliente',
          'Manteve postura profissional e simpática',
        ],
      },
      {
        titulo: 'Conferência da Comanda', pontos: 15, itens: [
          'Localizou a comanda no sistema',
          'Verificou se todos os serviços foram lançados',
          'Verificou serviços adicionais realizados',
          'Verificou produtos lançados',
          'Verificou descontos ou cortesias aplicados',
          'Conferiu os procedimentos junto com o cliente',
          'Checou os lançamentos com o profissional quando houve dúvida',
        ],
      },
      {
        titulo: 'Apresentação do Valor e Pagamento', pontos: 15, itens: [
          'Apresentou o valor total com clareza',
          'Detalhou os valores quando o cliente demonstrou dúvida',
          'Perguntou a forma de pagamento',
          'Conduziu corretamente o pagamento (cartão, dinheiro ou Pix)',
          'Registrou o pagamento no sistema',
          'Entregou o comprovante quando solicitado',
        ],
      },
      {
        titulo: 'Perguntas Obrigatórias', pontos: 10, itens: [
          'Perguntou sobre a inclusão do CPF na nota fiscal',
          'Registrou o CPF no sistema quando solicitado',
          'Ofereceu o cupom de estacionamento (quando aplicável)',
        ],
      },
      {
        titulo: 'Vendas e Ticket Médio', pontos: 20, itens: [
          'Ofereceu produtos antes de finalizar a venda',
          'Relacionou o produto ao atendimento realizado',
          'Ofereceu serviço adicional para a próxima visita',
          'Apresentou combo ou oferta combinada',
          'Divulgou campanha vigente',
          'Demonstrou conhecimento dos produtos e serviços',
        ],
      },
      {
        titulo: 'Reagendamento Preventivo', pontos: 20, itens: [
          'Ofereceu o próximo agendamento antes de o cliente sair',
          'Informou o período ideal de retorno para o serviço realizado',
          'Destacou pelo menos um benefício de reagendar',
          'Efetivou o reagendamento no sistema',
          'Confirmou data, horário e profissional do próximo agendamento',
        ],
      },
      {
        titulo: 'Encerramento e Pós-Atendimento', pontos: 10, itens: [
          'Agradeceu a visita usando o nome do cliente',
          'Relembrou o próximo agendamento ou convidou o cliente a retornar',
          'Despediu-se cordialmente',
          'Enviou a mensagem de feedback no dia seguinte',
          'Informou o link de agendamento online (quando disponível)',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Organização e Precisão no Caixa',
      'Agilidade',
      'Capacidade de Venda',
      'Conhecimento dos Produtos e Serviços',
      'Postura Profissional',
    ],
  },

  // POP-MAN-001 — Atendimento de Manicure — 100 pontos
  'pop-man-001': {
    secoes: [
      {
        titulo: 'Biossegurança Antes do Atendimento', pontos: 20, itens: [
          'Higienizou corretamente as mãos',
          'Manteve o uniforme limpo e os cabelos presos',
          'Utilizou luvas descartáveis novas',
          'Utilizou máscara limpa',
          'Conferiu a limpeza da bancada',
          'Conferiu se todos os instrumentos estavam esterilizados',
          'Conferiu a validade da esterilização',
          'Organizou todos os materiais antes de iniciar',
        ],
      },
      {
        titulo: 'Apresentação e Script de Atendimento', pontos: 15, itens: [
          'Iniciou o atendimento de frente para a cliente',
          'Deu as boas-vindas usando o nome da cliente',
          'Apresentou-se pelo nome como responsável pelo atendimento',
          'Confirmou o serviço que seria realizado',
          'Perguntou o que a cliente pensou para o dia',
          'Perguntou sobre preferência ou foto de referência',
          'Escutou a cliente atentamente, sem interromper',
        ],
      },
      {
        titulo: 'Ponderações e Orientações Técnicas', pontos: 10, itens: [
          'Explicou o que era possível realizar',
          'Explicou o que não era recomendado',
          'Explicou as limitações técnicas do procedimento',
          'Orientou sobre os cuidados para preservar a saúde das unhas',
          'Só iniciou após a cliente compreender e concordar',
        ],
      },
      {
        titulo: 'Apresentação dos Materiais à Cliente', pontos: 10, itens: [
          'Colocou luvas descartáveis novas diante da cliente',
          'Colocou máscara limpa e nova',
          'Apresentou o kit descartável lacrado à cliente',
          'Apresentou os alicates esterilizados',
          'Organizou os materiais sobre a bancada',
        ],
      },
      {
        titulo: 'Execução do Procedimento (ordem correta)', pontos: 20, itens: [
          'Removeu completamente o esmalte anterior',
          'Lixou e cortou as unhas conforme necessidade e preferência',
          'Utilizou a luva ou botinha amolecedora quando necessário',
          'Realizou a cuticulagem',
          'Aplicou a base',
          'Realizou a esmaltação',
          'Limpou cuidadosamente todos os cantos',
          'Aplicou spray ou óleo secante',
          'Manteve a bancada organizada durante o atendimento',
          'Não utilizou celular nem consumiu alimentos durante o atendimento',
        ],
      },
      {
        titulo: 'Controle de Qualidade', pontos: 15, itens: [
          'Esmaltação uniforme e com cobertura completa',
          'Comprimento uniforme e formato correto',
          'Cutículas bem acabadas',
          'Cantos limpos, sem borrões nem bolhas',
          'Ausência de resíduos e secagem adequada',
          'Corrigiu os ajustes antes de apresentar o resultado',
        ],
      },
      {
        titulo: 'Validação, Reagendamento e Finalização', pontos: 10, itens: [
          'Perguntou se a cliente gostou do resultado',
          'Perguntou se havia algum detalhe a ajustar',
          'Realizou os ajustes solicitados imediatamente',
          'Ofereceu deixar o próximo atendimento já agendado',
          'Orientou sobre os cuidados para aumentar a durabilidade',
          'Despediu-se agradecendo a preferência',
          'Organizou a estação e encaminhou os instrumentos para esterilização',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Técnica e Acabamento',
      'Higiene e Biossegurança',
      'Organização da Estação',
      'Pontualidade',
      'Postura Profissional',
    ],
  },

  // POP-PRO-001 — Atendimento do Profissional (Execução e Finalização) — 100 pontos
  'pop-pro-001': {
    secoes: [
      {
        titulo: 'Biossegurança e Preparação', pontos: 15, itens: [
          'Higienizou corretamente as mãos',
          'Manteve o uniforme limpo e os cabelos presos',
          'Utilizou os EPIs (luvas, máscara, avental)',
          'Conferiu a limpeza da bancada / estação',
          'Conferiu os instrumentos esterilizados e a validade da esterilização',
          'Verificou se o kit descartável estava lacrado',
          'Organizou todos os materiais antes do atendimento',
        ],
      },
      {
        titulo: 'Início do Atendimento', pontos: 15, itens: [
          'Iniciou o atendimento de frente para o cliente, com simpatia',
          'Apresentou-se pelo nome',
          'Confirmou o serviço agendado',
          'Identificou a necessidade do cliente',
          'Perguntou sobre preferência ou referência',
          'Escutou o cliente sem interromper',
        ],
      },
      {
        titulo: 'Ponderações e Consentimento', pontos: 10, itens: [
          'Explicou o que era possível realizar',
          'Explicou o que não era recomendado',
          'Explicou as limitações técnicas',
          'Orientou sobre os cuidados necessários',
          'Só iniciou após o cliente compreender e concordar',
        ],
      },
      {
        titulo: 'Execução Técnica', pontos: 15, itens: [
          'Executou o serviço na ordem correta prevista no POP',
          'Manteve a bancada / estação organizada',
          'Não utilizou telefone celular durante o atendimento',
          'Não consumiu alimentos durante o atendimento',
          'Trocou as luvas sempre que necessário',
          'Evitou contaminação cruzada',
        ],
      },
      {
        titulo: 'Vendas Durante a Execução', pontos: 15, itens: [
          'Ofereceu serviço complementar durante o atendimento',
          'Fez sugestão adequada ao serviço em execução',
          'Ofereceu os produtos utilizados no atendimento',
          'Identificou procedimento em atraso',
          'Divulgou campanha ou promoção vigente',
        ],
      },
      {
        titulo: 'Controle de Qualidade e Validação', pontos: 10, itens: [
          'Verificou o resultado antes de apresentar ao cliente',
          'Corrigiu os ajustes antes da apresentação',
          'Perguntou se o cliente gostou do resultado',
          'Perguntou se havia algum detalhe a ajustar',
          'Realizou os ajustes imediatamente',
        ],
      },
      {
        titulo: 'Finalização e Lançamento no Sistema', pontos: 10, itens: [
          'Pediu 1 minuto ao cliente para realizar os lançamentos',
          'Registrou todos os serviços realizados',
          'Registrou os produtos utilizados e vendidos',
          'Verificou descontos ou cortesias',
          'Salvou o lançamento no sistema',
        ],
      },
      {
        titulo: 'Reagendamento, Vitrine e Despedida', pontos: 10, itens: [
          'Ofereceu o próximo atendimento antes de liberar o cliente da cadeira',
          'Informou o período ideal de retorno do serviço',
          'Destacou pelo menos um benefício de reagendar',
          'Levou o cliente até a vitrine e ofereceu produtos',
          'Acompanhou o cliente até a recepção',
          'Despediu-se reforçando os cuidados em casa',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Técnica e Acabamento',
      'Higiene e Biossegurança',
      'Organização da Estação',
      'Capacidade de Venda',
      'Postura Profissional',
    ],
  },

  // POP-PRO-003 — Atendimento de Higienização Capilar (Lavatório) — 100 pontos
  'pop-pro-003': {
    secoes: [
      {
        titulo: 'Biossegurança e Preparação do Lavatório', pontos: 10, itens: [
          'Higienizou corretamente as mãos',
          'Manteve o uniforme limpo e os cabelos presos',
          'Conferiu a limpeza do lavatório',
          'Organizou todos os produtos e materiais',
          'Verificou a validade dos produtos',
          'Preparou toalhas limpas',
        ],
      },
      {
        titulo: 'Apresentação e Identificação da Necessidade', pontos: 10, itens: [
          'Iniciou o atendimento de frente para a cliente',
          'Apresentou-se pelo nome como responsável pela higienização',
          'Confirmou o serviço a ser realizado',
          'Perguntou o que a cliente pensou para o dia',
          'Perguntou sobre preferência ou foto de referência',
          'Perguntou sobre produto ou cheiro preferido',
          'Escutou a cliente atentamente, sem interromper',
        ],
      },
      {
        titulo: 'Ponderações e Orientações', pontos: 10, itens: [
          'Explicou o que era possível realizar',
          'Explicou o que não era recomendado e o motivo',
          'Explicou as limitações técnicas do procedimento',
          'Orientou sobre os cuidados para preservar a saúde do cabelo',
          'Só iniciou após a cliente compreender e concordar',
        ],
      },
      {
        titulo: 'Avaliação Capilar', pontos: 20, itens: [
          'Conduziu e acomodou a cliente confortavelmente no lavatório',
          'Observou o estado geral do cabelo',
          'Verificou o tipo de cabelo (liso, ondulado, cacheado, crespo)',
          'Verificou a porosidade do cabelo',
          'Verificou ressecamento, danos ou pontas duplas',
          'Verificou a presença de química',
          'Avaliou o couro cabeludo (oleosidade, caspa)',
          'Perguntou sobre os cuidados atuais da cliente',
          'Informou à cliente as necessidades identificadas',
        ],
      },
      {
        titulo: 'Produtos e Experiência Sensorial', pontos: 10, itens: [
          'Informou todos os produtos que seriam utilizados e suas funções',
          'Explicou o benefício de cada produto para o cabelo da cliente',
          'Deixou a cliente sentir o cheiro dos produtos',
          'Ofereceu outras opções de aroma',
          'Soltou o cabelo da raiz e desembaraçou antes de iniciar',
        ],
      },
      {
        titulo: 'Execução da Higienização', pontos: 20, itens: [
          'Verificou a temperatura da água (morna e agradável)',
          'Posicionou a cliente corretamente e colocou a capa de proteção',
          'Aplicou o 1º shampoo em todo o cabelo e emulsionou bem',
          'Enxaguou completamente o 1º shampoo',
          'Aplicou o 2º shampoo específico para o tipo de cabelo',
          'Realizou a massagem no couro cabeludo por 3 minutos',
          'Aplicou o condicionador no comprimento e pontas, evitando a raiz',
          'Respeitou o tempo de pausa recomendado',
          'Aplicou a máscara de tratamento quando aceita pela cliente',
          'Enxaguou completamente, sem deixar resíduos',
          'Evitou respingos no rosto da cliente',
          'Não utilizou celular nem consumiu alimentos durante o atendimento',
        ],
      },
      {
        titulo: 'Vendas de Tratamentos e Produtos', pontos: 10, itens: [
          'Ofereceu tratamento de acordo com a necessidade identificada',
          'Explicou o benefício do tratamento sugerido',
          'Ofereceu os produtos utilizados para venda',
          'Explicou como o produto mantém o resultado em casa',
        ],
      },
      {
        titulo: 'Encaminhamento, Organização e Registro', pontos: 10, itens: [
          'Fez a touca com a toalha e conduziu a cliente até a cadeira',
          'Secou o excesso de água e preparou a cliente (capa, robe, penteado)',
          'Chamou o profissional principal informando nome, serviços, tratamentos e observações',
          'Higienizou e organizou o lavatório para a próxima cliente',
          'Registrou serviços, produtos e tratamentos no sistema',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Avaliação Capilar e Técnica',
      'Higiene e Biossegurança',
      'Cuidado com o Conforto da Cliente',
      'Capacidade de Venda',
      'Postura Profissional',
    ],
  },

  // POP-PRO-004 — Atendimento de Higienização Especial (Lavatório) — 100 pontos
  'pop-pro-004': {
    secoes: [
      {
        titulo: 'Biossegurança e Preparação do Lavatório', pontos: 10, itens: [
          'Higienizou corretamente as mãos',
          'Manteve o uniforme limpo e os cabelos presos',
          'Manteve as unhas curtas e sem asperezas',
          'Conferiu a limpeza do lavatório',
          'Organizou os produtos e verificou a validade',
          'Separou o cronômetro e as toalhas limpas',
        ],
      },
      {
        titulo: 'Apresentação e Identificação da Necessidade', pontos: 10, itens: [
          'Apresentou-se de frente para a cliente, pelo nome',
          'Confirmou que o serviço era a higienização especial',
          'Perguntou o que a cliente pensou para o dia',
          'Perguntou sobre preferência ou foto de referência',
          'Perguntou se a cliente trouxe produtos próprios',
          'Escutou a cliente atentamente, sem interromper',
        ],
      },
      {
        titulo: 'Ponderações e Orientações', pontos: 10, itens: [
          'Explicou o que era possível realizar',
          'Explicou o que não era recomendado e o motivo',
          'Explicou as limitações técnicas do procedimento',
          'Orientou sobre os cuidados para preservar a saúde do cabelo',
          'Só iniciou após a cliente compreender e concordar',
        ],
      },
      {
        titulo: 'Avaliação Capilar e Oferta de Tratamento', pontos: 15, itens: [
          'Conduziu e acomodou a cliente confortavelmente no lavatório',
          'Observou o estado geral do cabelo',
          'Verificou o tipo e a porosidade do cabelo',
          'Verificou ressecamento, danos ou pontas duplas',
          'Verificou a presença de química',
          'Avaliou o couro cabeludo (oleosidade, caspa, sensibilidade)',
          'Informou à cliente as necessidades identificadas',
          'Ofereceu tratamento de acordo com a necessidade identificada',
        ],
      },
      {
        titulo: 'Produtos e Experiência Sensorial', pontos: 10, itens: [
          'Selecionou produtos específicos conforme a avaliação',
          'Informou todos os produtos que seriam utilizados e suas funções',
          'Confirmou com a cliente o uso e a ordem dos produtos que ela trouxe',
          'Deixou a cliente sentir o cheiro dos produtos',
          'Ofereceu outras opções de aroma',
        ],
      },
      {
        titulo: 'Execução da Higienização Especial', pontos: 25, itens: [
          'Verificou a temperatura da água (morna e agradável)',
          'Soltou o cabelo da raiz e desembaraçou antes de iniciar',
          'Aplicou o 1º shampoo, emulsionou bem e enxaguou completamente',
          'Aplicou o 2º shampoo específico para o tipo de cabelo',
          'Realizou a massagem no couro cabeludo por 10 minutos cronometrados',
          'Usou movimentos circulares firmes, cobrindo todo o couro cabeludo',
          'Verificou com a cliente se a pressão estava agradável',
          'Aplicou o 3º shampoo quando o cabelo exigiu',
          'Respeitou o tempo de pausa recomendado pela marca',
          'Aplicou o condicionador ou a máscara conforme a necessidade',
          'Cumpriu o tempo de execução de 10 a 15 minutos, sem apressar',
          'Enxaguou completamente, sem deixar resíduos',
          'Evitou respingos no rosto da cliente',
          'Preservou o relaxamento (sem celular, alimentos ou conversa em excesso)',
        ],
      },
      {
        titulo: 'Finalização e Encaminhamento', pontos: 10, itens: [
          'Fez a touca com a toalha',
          'Conduziu a cliente até a cadeira e ajudou-a a se sentar',
          'Secou com a toalha, retirando o excesso de água',
          'Preparou a cliente (capa, robe, penteado)',
          'Penteou e alinhou o cabelo',
          'Chamou o profissional principal informando produtos, tratamentos e observações',
        ],
      },
      {
        titulo: 'Organização e Registro', pontos: 10, itens: [
          'Organizou e higienizou completamente o lavatório',
          'Descartou corretamente os resíduos',
          'Devolveu à cliente os produtos que ela trouxe',
          'Preparou o lavatório para a próxima cliente',
          'Registrou o serviço, os produtos e os tratamentos no sistema',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Técnica da Massagem',
      'Avaliação Capilar e Técnica',
      'Higiene e Biossegurança',
      'Cuidado com o Conforto da Cliente',
      'Postura Profissional',
    ],
  },

  // POP-PRO-005 — Shiatsu Capilar (Lavatório) — 100 pontos
  'pop-pro-005': {
    secoes: [
      {
        titulo: 'Biossegurança e Preparação do Lavatório', pontos: 10, itens: [
          'Higienizou corretamente as mãos',
          'Manteve o uniforme limpo e os cabelos presos',
          'Manteve as unhas curtas e sem asperezas',
          'Retirou anéis, pulseiras e relógio',
          'Conferiu a limpeza do lavatório',
          'Organizou os produtos e verificou a validade',
          'Separou o cronômetro, as toalhas e o apoio de pescoço',
        ],
      },
      {
        titulo: 'Apresentação e Identificação da Necessidade', pontos: 10, itens: [
          'Apresentou-se de frente para a cliente, pelo nome',
          'Confirmou que o serviço era o shiatsu capilar',
          'Perguntou o que a cliente pensou para o dia',
          'Perguntou sobre preferência ou foto de referência',
          'Perguntou se a cliente trouxe produtos próprios',
          'Escutou a cliente atentamente, sem interromper',
        ],
      },
      {
        titulo: 'Contraindicações, Ponderações e Orientações', pontos: 10, itens: [
          'Verificou lesões, feridas ou irritação no couro cabeludo',
          'Perguntou sobre dor cervical, tontura, enxaqueca ou gestação',
          'Perguntou sobre alergia a produtos',
          'Explicou o que era possível realizar e o que não era recomendado',
          'Orientou sobre os cuidados para preservar a saúde do cabelo',
          'Só iniciou após a cliente compreender e concordar',
        ],
      },
      {
        titulo: 'Avaliação Capilar e Oferta de Tratamento', pontos: 15, itens: [
          'Acomodou a cliente e ajustou o apoio do pescoço',
          'Confirmou com a cliente se a posição estava confortável',
          'Observou o estado geral do cabelo',
          'Verificou o tipo e a porosidade do cabelo',
          'Verificou ressecamento, danos ou química',
          'Avaliou o couro cabeludo (oleosidade, caspa, sensibilidade)',
          'Informou à cliente as necessidades identificadas',
          'Ofereceu tratamento de acordo com a necessidade identificada',
        ],
      },
      {
        titulo: 'Produtos e Experiência Sensorial', pontos: 10, itens: [
          'Selecionou produtos específicos conforme a avaliação',
          'Informou todos os produtos que seriam utilizados e suas funções',
          'Confirmou com a cliente o uso e a ordem dos produtos que ela trouxe',
          'Deixou a cliente sentir o cheiro dos produtos',
          'Ofereceu outras opções de aroma',
        ],
      },
      {
        titulo: 'Execução do Shiatsu Capilar', pontos: 25, itens: [
          'Verificou a temperatura da água (morna e agradável)',
          'Posicionou a cliente com a cervical apoiada',
          'Soltou o cabelo da raiz e desembaraçou antes de iniciar',
          'Aplicou o 1º shampoo, emulsionou bem e enxaguou completamente',
          'Aplicou o 2º shampoo específico para o tipo de cabelo',
          'Executou a massagem por 15 a 25 minutos cronometrados',
          'Aplicou pressão com as polpas dos dedos, sem usar as unhas',
          'Manteve pressão firme, constante e ritmada',
          'Percorreu todas as regiões (frontal, topo, têmporas, orelhas, nuca)',
          'Verificou com a cliente se a pressão estava agradável',
          'Manteve o silêncio e não interrompeu a massagem',
          'Aplicou o 3º shampoo quando o cabelo exigiu',
          'Respeitou o tempo de pausa recomendado pela marca',
          'Aplicou o condicionador ou a máscara conforme a necessidade',
          'Enxaguou completamente, sem deixar resíduos',
        ],
      },
      {
        titulo: 'Finalização e Encaminhamento', pontos: 10, itens: [
          'Avisou a cliente que a massagem terminou antes de movimentá-la',
          'Ergueu a cliente lentamente',
          'Fez a touca com a toalha',
          'Conduziu a cliente até a cadeira e secou o excesso de água',
          'Preparou a cliente (capa, robe, penteado) e alinhou o cabelo',
          'Chamou o profissional principal informando produtos, tratamentos e observações',
        ],
      },
      {
        titulo: 'Organização e Registro', pontos: 10, itens: [
          'Organizou e higienizou completamente o lavatório',
          'Descartou corretamente os resíduos',
          'Devolveu à cliente os produtos que ela trouxe',
          'Preparou o lavatório para a próxima cliente',
          'Registrou o serviço, os produtos e as observações no sistema',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Técnica do Shiatsu',
      'Avaliação Capilar e Técnica',
      'Higiene e Biossegurança',
      'Cuidado com o Conforto da Cliente',
      'Postura Profissional',
    ],
  },

  // POP-PRO-006 — Tratamentos Capilares (Lavatório) — 100 pontos
  'pop-pro-006': {
    secoes: [
      {
        titulo: 'Biossegurança e Preparação do Lavatório', pontos: 10, itens: [
          'Higienizou corretamente as mãos',
          'Manteve o uniforme limpo e os cabelos presos',
          'Conferiu a limpeza do lavatório',
          'Organizou os produtos e verificou a validade',
          'Conferiu o passo a passo da linha que seria utilizada',
          'Separou o cronômetro e as toalhas limpas',
        ],
      },
      {
        titulo: 'Apresentação e Identificação da Necessidade', pontos: 10, itens: [
          'Apresentou-se de frente para a cliente, pelo nome',
          'Confirmou que o serviço era um tratamento',
          'Perguntou o que a cliente pensou para o dia',
          'Perguntou sobre preferência ou foto de referência',
          'Escutou a cliente atentamente, sem interromper',
        ],
      },
      {
        titulo: 'Ponderações e Orientações', pontos: 10, itens: [
          'Explicou o que era possível realizar',
          'Explicou o que não era recomendado e o motivo',
          'Explicou as limitações técnicas do tratamento',
          'Informou o resultado esperado e em quantas sessões',
          'Orientou sobre os cuidados para preservar a saúde do cabelo',
          'Só iniciou após a cliente compreender e concordar',
        ],
      },
      {
        titulo: 'Avaliação Capilar, Terapia e Cronograma', pontos: 20, itens: [
          'Acomodou a cliente confortavelmente no lavatório',
          'Observou o estado geral do cabelo',
          'Verificou o tipo e a porosidade do cabelo',
          'Verificou a elasticidade e a resistência do fio',
          'Verificou ressecamento, opacidade ou pontas duplas',
          'Verificou a presença de química',
          'Avaliou o couro cabeludo (oleosidade, caspa, sensibilidade)',
          'Perguntou sobre os cuidados atuais e a frequência de tratamentos',
          'Informou à cliente as necessidades identificadas',
          'Indicou a terapia capilar adequada à necessidade',
          'Ofereceu o cronograma capilar quando indicado',
        ],
      },
      {
        titulo: 'Produtos e Experiência Sensorial', pontos: 5, itens: [
          'Informou todos os produtos que seriam utilizados e suas funções',
          'Explicou o benefício de cada produto para o cabelo da cliente',
          'Deixou a cliente sentir o cheiro dos produtos',
        ],
      },
      {
        titulo: 'Execução do Tratamento', pontos: 25, itens: [
          'Verificou a temperatura da água (morna e agradável)',
          'Soltou o cabelo da raiz e desembaraçou antes de iniciar',
          'Aplicou o 1º shampoo, emulsionou bem e enxaguou completamente',
          'Aplicou o 2º shampoo específico para o tipo de cabelo',
          'Realizou a massagem no couro cabeludo por 10 a 15 minutos cronometrados',
          'Verificou com a cliente se a pressão estava agradável',
          'Aplicou o 3º shampoo quando o cabelo exigiu',
          'Removeu o excesso de água antes de aplicar o tratamento',
          'Aplicou mecha a mecha, do comprimento às pontas',
          'Evitou a raiz, salvo indicação do produto',
          'Seguiu o passo a passo exato da linha utilizada',
          'Utilizou a touca térmica quando a linha indicou',
          'Respeitou todos os tempos de pausa, sem reduzir para acelerar',
          'Enxaguou completamente, sem deixar resíduos',
        ],
      },
      {
        titulo: 'Resultado, Manutenção e Fidelização', pontos: 10, itens: [
          'Mostrou à cliente a diferença no fio',
          'Explicou quanto tempo o resultado costuma durar',
          'Orientou sobre os cuidados em casa',
          'Informou a data ideal da próxima sessão do cronograma',
          'Ofereceu os produtos de manutenção para levar para casa',
        ],
      },
      {
        titulo: 'Finalização, Organização e Registro', pontos: 10, itens: [
          'Fez a touca e conduziu a cliente até a cadeira',
          'Secou o excesso de água e preparou a cliente (capa, robe, penteado)',
          'Chamou o profissional principal informando tratamento, produtos e cronograma',
          'Organizou e higienizou o lavatório, guardando os produtos corretamente',
          'Registrou o tratamento, o cronograma e o diagnóstico no sistema',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Avaliação Capilar e Diagnóstico',
      'Técnica de Aplicação',
      'Higiene e Biossegurança',
      'Capacidade de Venda',
      'Postura Profissional',
    ],
  },

  // POP-PRO-007 — Secagem — 100 pontos
  'pop-pro-007': {
    secoes: [
      {
        titulo: 'Apresentação e Identificação da Necessidade', pontos: 10, itens: [
          'Apresentou-se de frente para a cliente, pelo nome',
          'Confirmou que o serviço era a secagem',
          'Perguntou o que a cliente pensou para o dia',
          'Perguntou sobre preferência ou foto de referência',
          'Perguntou se a cliente já veio com o cabelo limpo',
          'Escutou a cliente atentamente, sem interromper',
        ],
      },
      {
        titulo: 'Ponderações e Orientações', pontos: 10, itens: [
          'Explicou o que era possível realizar',
          'Explicou o que não era recomendado e o motivo',
          'Explicou as limitações técnicas (tipo, comprimento e condição do fio)',
          'Informou quanto tempo o resultado tende a durar',
          'Orientou sobre os cuidados para preservar a saúde do cabelo',
          'Só iniciou após a cliente compreender e concordar',
        ],
      },
      {
        titulo: 'Higienização no Lavatório', pontos: 15, condicional: true,
        nota: 'Somente quando a cliente não chega com o cabelo limpo.',
        itens: [
          'Realizou a avaliação capilar e informou as necessidades',
          'Ofereceu tratamento de acordo com a necessidade',
          'Informou os produtos e deixou a cliente sentir o cheiro',
          'Verificou a temperatura da água e soltou o cabelo da raiz',
          'Aplicou o 1º shampoo, emulsionou bem e enxaguou',
          'Aplicou o 2º shampoo + massagem de 3 minutos',
          'Respeitou os tempos de pausa da marca',
          'Aplicou o condicionador e enxaguou completamente',
        ],
      },
      {
        titulo: 'Preparação e Produtos Finalizadores', pontos: 15, itens: [
          'Acomodou a cliente e colocou a capa e o robe',
          'Secou com a toalha pressionando, sem esfregar',
          'Desembaraçou com pente de dentes largos, das pontas para a raiz',
          'Aplicou o protetor térmico em todo o comprimento',
          'Aplicou leave-in ou finalizador conforme o tipo de cabelo',
          'Distribuiu bem o produto, mecha a mecha, sem excesso na raiz',
          'Penteou, alinhou e separou o cabelo em seções',
        ],
      },
      {
        titulo: 'Execução da Secagem', pontos: 25, itens: [
          'Utilizou o bico direcionador no secador',
          'Ajustou a temperatura à condição do fio',
          'Pré-secou o cabelo antes de iniciar a escova',
          'Manteve distância segura do couro cabeludo',
          'Não direcionou o ar quente para o rosto, olhos ou orelhas',
          'Perguntou à cliente se a temperatura estava agradável',
          'Trabalhou mecha a mecha, prendendo as demais seções',
          'Direcionou o fluxo de ar da raiz para as pontas',
          'Manteve o secador em movimento, sem concentrar o calor',
          'Secou cada mecha completamente antes de passar para a próxima',
          'Finalizou com ar frio para selar e fixar',
        ],
      },
      {
        titulo: 'Franja e Acabamento', pontos: 10, itens: [
          'Perguntou o caimento desejado da franja',
          'Utilizou temperatura mais baixa na franja',
          'Ajustou o caimento antes que a franja esfriasse',
          'Confirmou com a cliente se a franja ficou como ela gosta',
          'Verificou se não havia mechas úmidas',
          'Verificou frizz, simetria e caimento',
          'Ajustou a repartição conforme a preferência da cliente',
        ],
      },
      {
        titulo: 'Validação e Encaminhamento', pontos: 10, itens: [
          'Mostrou o resultado com o espelho de mão',
          'Perguntou se a cliente gostou do resultado',
          'Perguntou se havia algum detalhe a ajustar',
          'Realizou os ajustes imediatamente',
          'Orientou sobre a manutenção em casa',
          'Ofereceu os produtos utilizados e o reagendamento',
          'Encerrou ou chamou o profissional principal com as informações',
        ],
      },
      {
        titulo: 'Organização e Registro', pontos: 5, itens: [
          'Desligou e guardou o secador',
          'Limpou as escovas e os pentes',
          'Recolheu os cabelos do chão e higienizou a estação',
          'Registrou o serviço e os produtos no sistema',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Técnica de Secagem',
      'Acabamento e Alinhamento',
      'Higiene e Segurança',
      'Cuidado com o Conforto da Cliente',
      'Postura Profissional',
    ],
  },

  // POP-PRO-008 — Modelagem — 100 pontos
  'pop-pro-008': {
    secoes: [
      {
        titulo: 'Apresentação e Identificação da Necessidade', pontos: 10, itens: [
          'Apresentou-se de frente para a cliente, pelo nome',
          'Confirmou que o serviço era a modelagem',
          'Perguntou o que a cliente pensou para o dia',
          'Perguntou sobre preferência ou foto de referência',
          'Perguntou se a cliente já veio com o cabelo limpo',
          'Escutou a cliente atentamente, sem interromper',
        ],
      },
      {
        titulo: 'Ponderações e Orientações', pontos: 10, itens: [
          'Explicou o que era possível realizar',
          'Explicou o que não era recomendado e o motivo',
          'Explicou as limitações técnicas (tipo, comprimento e condição do fio)',
          'Apresentou alternativa quando a referência não era possível',
          'Informou quanto tempo a modelagem tende a durar',
          'Só iniciou após a cliente compreender e concordar',
        ],
      },
      {
        titulo: 'Higienização no Lavatório', pontos: 15, condicional: true,
        nota: 'Somente quando a cliente não chega com o cabelo limpo.',
        itens: [
          'Realizou a avaliação capilar e informou as necessidades',
          'Ofereceu tratamento de acordo com a necessidade',
          'Informou os produtos e deixou a cliente sentir o cheiro',
          'Verificou a temperatura da água e soltou o cabelo da raiz',
          'Aplicou o 1º shampoo, emulsionou bem e enxaguou',
          'Aplicou o 2º shampoo + massagem de 3 minutos',
          'Respeitou os tempos de pausa da marca',
          'Aplicou o condicionador sem pesar o fio e enxaguou completamente',
        ],
      },
      {
        titulo: 'Definição da Modelagem e Preparação', pontos: 15, itens: [
          'Secou com a toalha pressionando, sem esfregar',
          'Perguntou qual tipo de modelagem a cliente desejava',
          'Perguntou o volume desejado',
          'Perguntou o lado da repartição',
          'Perguntou se preferia o movimento solto ou marcado',
          'Confirmou em voz alta o que seria feito, antes de começar',
          'Desembaraçou com pente de dentes largos, das pontas para a raiz',
          'Aplicou o protetor térmico em todo o comprimento',
          'Aplicou o modelador na medida certa, sem exagerar',
          'Secou o cabelo completamente antes de usar a ferramenta térmica',
          'Penteou, definiu a repartição e separou em seções',
        ],
      },
      {
        titulo: 'Execução da Modelagem', pontos: 25, itens: [
          'Selecionou a ferramenta e o diâmetro conforme o combinado',
          'Ajustou a temperatura à condição do fio',
          'Aguardou o aquecimento completo antes de iniciar',
          'Trabalhou mecha a mecha, da nuca para cima',
          'Manteve as demais seções presas com presilhas',
          'Manteve a espessura das mechas uniforme',
          'Não encostou a ferramenta no couro cabeludo, rosto ou orelhas',
          'Não iniciou a ferramenta colada à raiz',
          'Respeitou o tempo de permanência da ferramenta na mecha',
          'Não repassou a ferramenta várias vezes na mesma mecha',
          'Seguiu o sentido combinado com a cliente',
          'Deixou as mechas esfriarem antes de mexer',
          'Conferiu a simetria entre os dois lados durante a execução',
          'Apoiou a ferramenta em base térmica, fora do alcance da cliente',
        ],
      },
      {
        titulo: 'Acabamento e Fixação', pontos: 10, itens: [
          'Abriu e definiu o movimento com os dedos',
          'Ajustou o volume da raiz e a repartição',
          'Verificou a simetria e o caimento',
          'Verificou se não havia mechas sem modelagem',
          'Aplicou óleo ou sérum nas pontas com moderação',
          'Aplicou o fixador à distância, sem encharcar',
        ],
      },
      {
        titulo: 'Validação e Encaminhamento', pontos: 10, itens: [
          'Mostrou o resultado com o espelho de mão',
          'Perguntou se a cliente gostou do resultado',
          'Perguntou se havia algum detalhe a ajustar',
          'Realizou os ajustes imediatamente',
          'Orientou sobre a manutenção e a durabilidade',
          'Ofereceu os produtos utilizados e o reagendamento',
          'Encerrou ou chamou o profissional principal com as informações',
        ],
      },
      {
        titulo: 'Organização e Registro', pontos: 5, itens: [
          'Desligou os equipamentos e aguardou o resfriamento',
          'Limpou as escovas, os pentes e as placas',
          'Recolheu os cabelos do chão e higienizou a estação',
          'Registrou o serviço e os produtos no sistema',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Técnica de Modelagem',
      'Acabamento e Simetria',
      'Higiene e Segurança',
      'Cuidado com o Conforto da Cliente',
      'Postura Profissional',
    ],
  },

  // POP-PRO-009 — Chapinha — 100 pontos
  'pop-pro-009': {
    secoes: [
      {
        titulo: 'Apresentação e Identificação da Necessidade', pontos: 10, itens: [
          'Apresentou-se de frente para a cliente, pelo nome',
          'Confirmou que o serviço era a chapinha',
          'Perguntou o que a cliente pensou para o dia',
          'Perguntou sobre preferência ou foto de referência',
          'Perguntou se a cliente já veio com o cabelo limpo',
          'Escutou a cliente atentamente, sem interromper',
        ],
      },
      {
        titulo: 'Ponderações e Avaliação da Viabilidade', pontos: 10, itens: [
          'Explicou o que era possível realizar',
          'Explicou o que não era recomendado e o motivo',
          'Avaliou se a condição do fio permitia o procedimento',
          'Propôs alternativa quando o fio estava comprometido',
          'Informou quanto tempo o liso tende a durar',
          'Só iniciou após a cliente compreender e concordar',
        ],
      },
      {
        titulo: 'Higienização no Lavatório', pontos: 15, condicional: true,
        nota: 'Somente quando a cliente não chega com o cabelo limpo.',
        itens: [
          'Realizou a avaliação capilar e informou as necessidades',
          'Ofereceu tratamento de acordo com a necessidade',
          'Informou os produtos e deixou a cliente sentir o cheiro',
          'Verificou a temperatura da água e soltou o cabelo da raiz',
          'Aplicou o 1º shampoo, emulsionou bem e enxaguou',
          'Aplicou o 2º shampoo + massagem de 3 minutos',
          'Respeitou os tempos de pausa da marca',
          'Aplicou o condicionador e enxaguou completamente',
        ],
      },
      {
        titulo: 'Definição do Resultado e Preparação', pontos: 15, itens: [
          'Secou com a toalha pressionando, sem esfregar',
          'Perguntou se preferia o liso reto ou com movimento nas pontas',
          'Perguntou o lado da repartição',
          'Confirmou em voz alta o que seria feito, antes de começar',
          'Desembaraçou com pente de dentes largos, das pontas para a raiz',
          'Aplicou o protetor térmico em todo o comprimento',
          'Aplicou o finalizador sem exagerar na quantidade',
          'Secou o cabelo completamente e modelou com a escova',
          'Conferiu se não restou nenhuma mecha úmida',
          'Penteou, definiu a repartição e separou em seções',
        ],
      },
      {
        titulo: 'Execução da Chapinha', pontos: 25, itens: [
          'Limpou as placas antes de iniciar',
          'Ajustou a temperatura à condição do fio',
          'Aguardou o aquecimento completo da prancha',
          'Testou em uma mecha da nuca antes das áreas visíveis',
          'Perguntou à cliente se a temperatura estava agradável',
          'Trabalhou mecha a mecha, da nuca para cima',
          'Manteve as demais seções presas com presilhas',
          'Utilizou mechas finas',
          'Penteou cada mecha antes de passar a placa',
          'Iniciou a placa a uma distância segura da raiz',
          'Deslizou a prancha em movimento contínuo, sem parar na mecha',
          'Fez no máximo 1 a 2 passadas por mecha',
          'Não encostou a placa no couro cabeludo, rosto ou orelhas',
          'Apoiou a prancha em base térmica, fora do alcance da cliente',
          'Conferiu a simetria entre os dois lados durante a execução',
        ],
      },
      {
        titulo: 'Acabamento e Finalização', pontos: 10, itens: [
          'Aguardou o cabelo esfriar antes de pentear',
          'Ajustou a repartição conforme combinado',
          'Verificou se não havia mechas sem alisar, principalmente na nuca',
          'Verificou se não havia marcas de placa no fio',
          'Verificou frizz, simetria e caimento',
          'Aplicou finalizador nas pontas com moderação, sem pesar a raiz',
        ],
      },
      {
        titulo: 'Validação e Encaminhamento', pontos: 10, itens: [
          'Mostrou o resultado com o espelho de mão',
          'Perguntou se a cliente gostou do resultado',
          'Perguntou se havia algum detalhe a ajustar',
          'Realizou os ajustes imediatamente',
          'Orientou sobre a manutenção e a frequência segura de uso',
          'Ofereceu os produtos utilizados e o reagendamento',
          'Encerrou ou chamou o profissional principal com as informações',
        ],
      },
      {
        titulo: 'Organização e Registro', pontos: 5, itens: [
          'Desligou a prancha e aguardou o resfriamento antes de guardar',
          'Limpou as placas, as escovas e os pentes',
          'Recolheu os cabelos do chão e higienizou a estação',
          'Registrou o serviço e as observações sobre o fio no sistema',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Técnica da Chapinha',
      'Cuidado com a Saúde do Fio',
      'Acabamento e Alinhamento',
      'Higiene e Segurança',
      'Postura Profissional',
    ],
  },

  // POP-PRO-010 — Babyliss — 100 pontos
  'pop-pro-010': {
    secoes: [
      {
        titulo: 'Apresentação e Identificação da Necessidade', pontos: 10, itens: [
          'Apresentou-se de frente para a cliente, pelo nome',
          'Confirmou que o serviço era o babyliss',
          'Perguntou o que a cliente pensou para o dia',
          'Perguntou sobre preferência ou foto de referência',
          'Perguntou se a cliente já veio com o cabelo limpo',
          'Escutou a cliente atentamente, sem interromper',
        ],
      },
      {
        titulo: 'Ponderações e Orientações', pontos: 10, itens: [
          'Explicou o que era possível realizar',
          'Explicou o que não era recomendado e o motivo',
          'Explicou as limitações técnicas (comprimento, densidade e condição do fio)',
          'Apresentou alternativa quando a referência não era possível',
          'Informou quanto tempo o cacho tende a durar',
          'Só iniciou após a cliente compreender e concordar',
        ],
      },
      {
        titulo: 'Higienização no Lavatório', pontos: 15, condicional: true,
        nota: 'Somente quando a cliente não chega com o cabelo limpo.',
        itens: [
          'Realizou a avaliação capilar e informou as necessidades',
          'Ofereceu tratamento de acordo com a necessidade',
          'Informou os produtos e deixou a cliente sentir o cheiro',
          'Verificou a temperatura da água e soltou o cabelo da raiz',
          'Aplicou o 1º shampoo, emulsionou bem e enxaguou',
          'Aplicou o 2º shampoo + massagem de 3 minutos',
          'Respeitou os tempos de pausa da marca',
          'Aplicou o condicionador sem pesar o fio e enxaguou completamente',
        ],
      },
      {
        titulo: 'Definição do Babyliss e Preparação', pontos: 15, itens: [
          'Secou com a toalha pressionando, sem esfregar',
          'Perguntou o tamanho do cacho desejado',
          'Perguntou se preferia o resultado mais solto ou mais definido',
          'Perguntou o lado da repartição e o volume desejado',
          'Confirmou em voz alta o que seria feito, antes de começar',
          'Desembaraçou com pente de dentes largos, das pontas para a raiz',
          'Aplicou o protetor térmico em todo o comprimento',
          'Aplicou o modelador na medida certa, sem exagerar',
          'Secou o cabelo completamente antes de usar a ferramenta',
          'Penteou, definiu a repartição e separou em seções',
        ],
      },
      {
        titulo: 'Execução do Babyliss', pontos: 25, itens: [
          'Selecionou o diâmetro da ponteira conforme o combinado',
          'Ajustou a temperatura à condição do fio',
          'Aguardou o aquecimento completo antes de iniciar',
          'Testou em uma mecha da nuca antes das áreas visíveis',
          'Perguntou à cliente se a temperatura estava agradável',
          'Trabalhou mecha a mecha, da nuca para cima',
          'Manteve a espessura das mechas uniforme',
          'Penteou cada mecha antes de enrolar',
          'Não iniciou a ponteira colada à raiz',
          'Enrolou no sentido combinado com a cliente',
          'Manteve o mesmo tempo de permanência em todas as mechas',
          'Prendeu os cachos com presilha para esfriarem',
          'Não encostou a ponteira no couro cabeludo, rosto, orelhas ou pescoço',
          'Apoiou o babyliss em base térmica, fora do alcance da cliente',
          'Conferiu a simetria entre os dois lados durante a execução',
        ],
      },
      {
        titulo: 'Abertura, Acabamento e Fixação', pontos: 10, itens: [
          'Aguardou os cachos esfriarem completamente antes de soltar',
          'Abriu e afrouxou os cachos com os dedos',
          'Ajustou o volume da raiz e a repartição',
          'Verificou a uniformidade dos cachos e a simetria',
          'Verificou se não havia mechas sem cacho',
          'Aplicou óleo ou sérum nas pontas com moderação',
          'Aplicou o fixador à distância, sem encharcar',
        ],
      },
      {
        titulo: 'Validação e Encaminhamento', pontos: 10, itens: [
          'Mostrou o resultado com o espelho de mão',
          'Perguntou se a cliente gostou do resultado',
          'Perguntou se havia algum detalhe a ajustar',
          'Realizou os ajustes imediatamente',
          'Orientou sobre a manutenção e a durabilidade',
          'Ofereceu os produtos utilizados e o reagendamento',
          'Encerrou ou chamou o profissional principal com as informações',
        ],
      },
      {
        titulo: 'Organização e Registro', pontos: 5, itens: [
          'Desligou o babyliss e aguardou o resfriamento antes de guardar',
          'Limpou a ponteira, as escovas e os pentes',
          'Recolheu os cabelos do chão e higienizou a estação',
          'Registrou o serviço e os produtos no sistema',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Técnica do Babyliss',
      'Uniformidade e Simetria dos Cachos',
      'Higiene e Segurança',
      'Cuidado com o Conforto da Cliente',
      'Postura Profissional',
    ],
  },

  // POP-PRO-011 — Penteado — 100 pontos
  'pop-pro-011': {
    secoes: [
      {
        titulo: 'Apresentação e Identificação da Necessidade', pontos: 10, itens: [
          'Apresentou-se de frente para a cliente, pelo nome',
          'Confirmou que o serviço era o penteado',
          'Perguntou o que a cliente pensou para o dia',
          'Perguntou sobre preferência ou foto de referência',
          'Perguntou a ocasião e por quantas horas precisa durar',
          'Perguntou sobre acessório, véu ou tiara',
          'Perguntou sobre o decote ou a gola da roupa',
          'Escutou a cliente atentamente, sem interromper',
        ],
      },
      {
        titulo: 'Ponderações e Orientações', pontos: 10, itens: [
          'Explicou o que era possível realizar',
          'Explicou o que não era recomendado e o motivo',
          'Explicou as limitações técnicas (comprimento, densidade e textura)',
          'Informou se seria necessário enchimento, aplique ou acessório',
          'Apresentou alternativa quando a referência não era possível',
          'Só iniciou após a cliente compreender e concordar',
        ],
      },
      {
        titulo: 'Orientação ao Assistente', pontos: 10, condicional: true,
        nota: 'Somente quando houver assistente na preparação.',
        itens: [
          'Informou ao assistente qual penteado seria executado',
          'Informou quais produtos utilizar no lavatório',
          'Informou se e onde aplicar o condicionador',
          'Informou os produtos finalizadores e a quantidade',
          'Informou como queria a preparação (secagem, modelagem ou babyliss)',
          'Informou o sentido, o volume e a repartição desejados',
          'Informou o que não deveria ser feito',
          'Confirmou se o assistente entendeu antes de liberar',
        ],
      },
      {
        titulo: 'Higienização no Lavatório', pontos: 10, itens: [
          'Realizou a avaliação capilar e informou as necessidades',
          'Ofereceu tratamento de acordo com a necessidade',
          'Informou os produtos e deixou a cliente sentir o cheiro',
          'Verificou a temperatura da água e soltou o cabelo da raiz',
          'Aplicou o 1º shampoo, emulsionou bem e enxaguou',
          'Aplicou o 2º shampoo + massagem de 3 minutos',
          'Respeitou os tempos de pausa da marca',
          'Aplicou o condicionador conforme orientado, sem pesar a raiz',
        ],
      },
      {
        titulo: 'Preparação da Base', pontos: 15, itens: [
          'Secou com a toalha pressionando, sem esfregar',
          'Desembaraçou com pente de dentes largos, das pontas para a raiz',
          'Aplicou o protetor térmico quando usou ferramenta térmica',
          'Aplicou os finalizadores orientados, na quantidade certa',
          'Penteou, alinhou e definiu a repartição',
          'Executou a secagem ou modelagem no sentido e volume orientados',
          'Executou o babyliss quando necessário',
          'Conferiu se o cabelo estava 100% seco',
          'Aguardou o cabelo esfriar completamente antes de montar',
        ],
      },
      {
        titulo: 'Execução do Penteado', pontos: 25, itens: [
          'Confirmou em voz alta o penteado que seria executado',
          'Definiu a repartição e o ponto de apoio do penteado',
          'Separou o cabelo em seções com presilhas',
          'Posicionou o enchimento ou a base quando necessário',
          'Posicionou o acessório ou véu antes de fechar a estrutura',
          'Texturizou as mechas quando o penteado exigia sustentação',
          'Montou por seções, fixando cada parte antes de prosseguir',
          'Utilizou grampos na quantidade necessária, sempre escondidos',
          'Testou a firmeza de cada seção antes de seguir',
          'Conferiu a simetria entre os dois lados durante a execução',
          'Verificou o resultado de todos os ângulos (frente, laterais e nuca)',
          'Perguntou à cliente se algum ponto estava apertando',
          'Mostrou o andamento à cliente antes de finalizar',
          'Não deixou grampos na boca durante a execução',
        ],
      },
      {
        titulo: 'Acabamento, Fixação e Validação', pontos: 15, itens: [
          'Ajustou os fios soltos conforme o resultado desejado',
          'Verificou se não havia grampo aparecendo',
          'Verificou falhas, simetria e caimento',
          'Ajustou o acessório ou o véu',
          'Aplicou o fixador em camadas, à distância, protegendo o rosto',
          'Mostrou o resultado com o espelho de mão',
          'Perguntou se a cliente gostou e se estava confortável',
          'Realizou os ajustes imediatamente',
        ],
      },
      {
        titulo: 'Acompanhamento e Encerramento', pontos: 5, itens: [
          'O assistente permaneceu no salão até a cliente ir embora',
          'Auxiliou a cliente em ajustes, roupa, véu ou acessório',
          'Entregou grampos extras e orientou sobre a manutenção',
          'Retirou a capa sem desmanchar o penteado e acompanhou até a recepção',
          'Organizou a estação e registrou o serviço no sistema',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Técnica do Penteado',
      'Acabamento e Simetria',
      'Orientação da Equipe',
      'Cuidado com o Conforto da Cliente',
      'Postura Profissional',
    ],
  },

  // POP-PRO-012 — Pigmentação — 100 pontos
  'pop-pro-012': {
    secoes: [
      {
        titulo: 'Apresentação e Identificação da Necessidade', pontos: 10, itens: [
          'Apresentou-se de frente para a cliente, pelo nome',
          'Confirmou que o serviço era a pigmentação',
          'Perguntou o que a cliente pensou para o dia',
          'Perguntou sobre preferência ou foto de referência',
          'Escutou a cliente atentamente, sem interromper',
        ],
      },
      {
        titulo: 'Anamnese, Ponderações e Testes de Segurança', pontos: 15, itens: [
          'Perguntou sobre reação alérgica anterior a tintura',
          'Perguntou sobre a última química realizada e há quanto tempo',
          'Perguntou sobre uso de henna ou produtos com metais',
          'Verificou ferida, irritação ou coceira no couro cabeludo',
          'Perguntou sobre gestação, amamentação e medicamentos',
          'Realizou o teste de sensibilidade quando indicado pelo fabricante',
          'Realizou o teste de mecha quando havia dúvida sobre o fio',
          'Explicou o que era possível e o que não era recomendado',
          'Informou quantas sessões seriam necessárias',
          'Conferiu a validade dos produtos',
          'Definiu a rota (lavar antes ou depois) conforme a marca',
        ],
      },
      {
        titulo: 'Orientação ao Assistente', pontos: 10, condicional: true,
        nota: 'Somente quando houver assistente na aplicação.',
        itens: [
          'Informou a fórmula e a proporção exatas',
          'Informou a volumagem do oxidante',
          'Informou por onde começar a aplicação e em qual sentido',
          'Informou a ordem entre raiz e comprimento',
          'Informou o tempo de pausa',
          'Informou os produtos do lavatório de remoção',
          'Informou o que não deveria ser feito',
          'Confirmou se o assistente entendeu antes de liberar',
        ],
      },
      {
        titulo: 'Higienização Prévia', pontos: 10, condicional: true,
        nota: 'Somente na Rota A — quando o protocolo exige lavar antes da aplicação.',
        itens: [
          'Realizou a avaliação do cabelo e informou as necessidades',
          'Informou os produtos e deixou a cliente sentir o cheiro',
          'Verificou a temperatura da água e soltou o cabelo da raiz',
          'Aplicou o 1º shampoo e enxaguou completamente',
          'Aplicou o 2º shampoo + massagem suave de 3 minutos',
          'Não esfregou nem arranhou o couro cabeludo',
          'Aplicou o condicionador e respeitou os tempos de pausa',
          'Secou o cabelo completamente antes da aplicação',
        ],
      },
      {
        titulo: 'Preparação e Aplicação da Pigmentação', pontos: 25, itens: [
          'Colocou o robe, a capa impermeável e a toalha escura',
          'Aplicou creme de barreira na linha do couro, testa, orelhas e nuca',
          'Penteou e dividiu o cabelo em seções com pente de ponta fina',
          'Mediu o produto e o oxidante na proporção exata da marca',
          'Utilizou tigela e pincel não metálicos',
          'Preparou a mistura somente no momento da aplicação',
          'Utilizou luvas durante todo o manuseio do produto',
          'Trabalhou em mechas finas e uniformes',
          'Aplicou o produto de forma homogênea, sem falhas',
          'Respeitou a ordem definida entre raiz e comprimento',
          'Não deixou produto acumulado nem escorrendo',
          'Limpou imediatamente os respingos na pele',
          'Conferiu a cobertura de todas as seções, inclusive nuca e laterais',
          'O profissional responsável conferiu a aplicação antes da contagem',
        ],
      },
      {
        titulo: 'Tempo de Pausa e Remoção', pontos: 15, itens: [
          'Cronometrou o tempo de pausa e registrou o horário de início',
          'Acompanhou a cliente durante a pausa',
          'Perguntou se estava sentindo ardência ou incômodo',
          'Não ultrapassou o tempo indicado pelo fabricante',
          'Ofereceu bebida e garantiu o conforto durante a espera',
          'Ofereceu terapia capilar ou cronograma no lavatório',
          'Emulsionou o produto com água antes de enxaguar',
          'Utilizou água morna, nunca quente',
          'Aplicou o shampoo pós-coloração',
          'Aplicou o 2º shampoo + massagem de 10 a 15 minutos',
          'Aplicou o condicionador, a máscara ou o passo a passo da linha',
          'Verificou e removeu manchas na pele, orelhas e nuca',
        ],
      },
      {
        titulo: 'Finalização e Validação', pontos: 10, itens: [
          'Secou com a toalha pressionando, sem esfregar',
          'Aplicou o protetor térmico e os finalizadores',
          'Penteou, alinhou e finalizou com secagem ou modelagem',
          'Mostrou o resultado com o espelho de mão',
          'Perguntou se a cliente gostou e se havia ajustes',
          'Realizou os ajustes imediatamente',
          'Orientou sobre a manutenção da cor e os cuidados em casa',
          'Ofereceu os produtos e o reagendamento da manutenção',
        ],
      },
      {
        titulo: 'Registro, Acompanhamento e Organização', pontos: 5, itens: [
          'Registrou a cor, a numeração, a volumagem e a proporção',
          'Registrou o tempo de pausa efetivo e o resultado obtido',
          'Registrou qualquer reação ou intercorrência',
          'O assistente deu suporte até a cliente ir embora',
          'Lavou a tigela e o pincel e higienizou a estação',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Técnica de Aplicação',
      'Precisão e Segurança Química',
      'Orientação da Equipe',
      'Cuidado com o Conforto da Cliente',
      'Postura Profissional',
    ],
  },

  // POP-PRO-014 — Henna Capilar — 100 pontos
  'pop-pro-014': {
    secoes: [
      {
        titulo: 'Apresentação e Identificação da Necessidade', pontos: 10, itens: [
          'Apresentou-se de frente para a cliente, pelo nome',
          'Confirmou que o serviço era a aplicação de henna',
          'Perguntou o que a cliente pensou para o dia',
          'Perguntou sobre preferência ou foto de referência',
          'Escutou a cliente atentamente, sem interromper',
        ],
      },
      {
        titulo: 'Anamnese, Ponderações e Testes de Segurança', pontos: 15, itens: [
          'Perguntou sobre reação alérgica anterior a henna ou tintura',
          'Perguntou sobre a última química realizada e há quanto tempo',
          'Perguntou se pretende fazer coloração, descoloração ou alisamento',
          'Verificou ferida, irritação ou coceira no couro cabeludo',
          'Perguntou sobre gestação e amamentação',
          'Realizou o teste de sensibilidade conforme o fabricante',
          'Realizou o teste de mecha antes da aplicação',
          'Avisou que a henna pode interferir em químicas futuras',
          'Explicou o que era possível e o que não era recomendado',
          'Conferiu a validade do produto',
          'Só iniciou após a cliente compreender e concordar',
        ],
      },
      {
        titulo: 'Avaliação Capilar e Oferta de Tratamento', pontos: 10, itens: [
          'Conduziu e acomodou a cliente confortavelmente no lavatório',
          'Observou o estado geral do cabelo',
          'Verificou o tipo e a porosidade do cabelo',
          'Verificou ressecamento, danos ou química anterior',
          'Avaliou o couro cabeludo (oleosidade, caspa, sensibilidade, lesões)',
          'Informou à cliente as necessidades identificadas',
          'Ofereceu tratamento de acordo com a necessidade identificada',
        ],
      },
      {
        titulo: 'Produtos e Experiência Sensorial', pontos: 10, itens: [
          'Informou todos os produtos que seriam utilizados e suas funções',
          'Explicou o benefício de cada produto para o cabelo da cliente',
          'Deixou a cliente sentir o cheiro dos produtos',
        ],
      },
      {
        titulo: 'Aplicação da Henna no Lavatório', pontos: 25, itens: [
          'Colocou a capa impermeável e a toalha escura',
          'Aplicou creme de barreira na linha do couro, testa, orelhas e nuca',
          'Desembaraçou e dividiu o cabelo em seções com pente de ponta fina',
          'Preparou a mistura na proporção da marca, somente no momento da aplicação',
          'Utilizou tigela e pincel não metálicos',
          'Utilizou luvas durante todo o manuseio do produto',
          'Trabalhou em mechas finas e uniformes',
          'Aplicou o produto de forma homogênea, sem falhas',
          'Respeitou a ordem definida entre raiz e comprimento',
          'Não deixou produto acumulado nem escorrendo',
          'Limpou imediatamente os respingos na pele',
          'Conferiu a cobertura de todas as seções, inclusive nuca e laterais',
          'Colocou a touca quando a marca indicou',
          'Cronometrou o tempo de pausa e registrou o horário de início',
          'Perguntou à cliente se estava sentindo ardência ou incômodo',
          'Não ultrapassou o tempo indicado pelo fabricante',
        ],
      },
      {
        titulo: 'Remoção e Higienização', pontos: 15, itens: [
          'Enxaguou com água morna, nunca quente, até a água sair limpa',
          'Aplicou o 1º shampoo, emulsionou bem e enxaguou completamente',
          'Aplicou o 2º shampoo + massagem no couro cabeludo por 10 minutos',
          'Enxaguou completamente',
          'Verificou se não restou resíduo de henna no cabelo e na pele',
          'Removeu as manchas da pele com o produto adequado',
          'Respeitou o tempo de pausa antes do condicionador ou máscara',
          'Aplicou o condicionador ou a máscara evitando a raiz',
          'Respeitou o tempo recomendado pela marca e enxaguou sem deixar resíduos',
        ],
      },
      {
        titulo: 'Finalização e Validação', pontos: 10, itens: [
          'Fez a touca e conduziu a cliente até a cadeira',
          'Secou com a toalha pressionando, sem esfregar',
          'Aplicou o protetor térmico e os finalizadores',
          'Penteou, alinhou e finalizou com secagem ou modelagem',
          'Mostrou o resultado com o espelho de mão',
          'Perguntou se a cliente gostou e se havia ajustes',
          'Realizou os ajustes imediatamente',
          'Orientou sobre a manutenção e ofereceu produtos e reagendamento',
        ],
      },
      {
        titulo: 'Registro e Organização', pontos: 5, itens: [
          'Registrou a marca e o tom da henna utilizada',
          'Registrou o tempo de pausa efetivo e o resultado obtido',
          'Registrou na ficha que a cliente usou henna, para químicas futuras',
          'Lavou a tigela e o pincel imediatamente',
          'Higienizou o lavatório e preparou para a próxima cliente',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Técnica de Aplicação',
      'Precisão e Segurança Química',
      'Higiene e Organização',
      'Cuidado com o Conforto da Cliente',
      'Postura Profissional',
    ],
  },

  // POP-PRO-015 — Mechas — 100 pontos
  'pop-pro-015': {
    secoes: [
      {
        titulo: 'Apresentação e Identificação da Necessidade', pontos: 10, itens: [
          'Apresentou-se de frente para a cliente, pelo nome',
          'Confirmou que o serviço eram as mechas',
          'Perguntou o que a cliente pensou para o dia',
          'Perguntou sobre preferência ou foto de referência',
          'Escutou a cliente atentamente, sem interromper',
        ],
      },
      {
        titulo: 'Anamnese, Ponderações e Teste de Mecha', pontos: 15, itens: [
          'Perguntou sobre a última química realizada e há quanto tempo',
          'Perguntou sobre uso de henna ou produtos com metais',
          'Perguntou sobre reação alérgica anterior a coloração ou descolorante',
          'Verificou ferida, irritação ou coceira no couro cabeludo',
          'Perguntou sobre quebra ou "borrachudo" em processos anteriores',
          'Explicou o que era possível e o que não era recomendado',
          'Informou quantas sessões seriam necessárias e a duração do atendimento',
          'Realizou o teste de mecha e avaliou o clareamento e a resistência do fio',
          'Definiu a volumagem, o tempo de ação e a viabilidade a partir do teste',
          'Só iniciou após a cliente compreender e concordar',
        ],
      },
      {
        titulo: 'Higienização de Preparação', pontos: 10, itens: [
          'Aplicou o 1º shampoo, emulsionou bem e enxaguou',
          'Aplicou o 2º shampoo + massagem de 10 minutos',
          'Respeitou os tempos de pausa da marca',
          'Aplicou o condicionador ou a máscara conforme a necessidade',
          'Fez a touca e conduziu a cliente até a cadeira',
          'Preparou a cliente (capa, robe, penteado)',
          'Secou o cabelo completamente antes da aplicação das mechas',
        ],
      },
      {
        titulo: 'Aplicação das Mechas', pontos: 25, itens: [
          'Aplicou creme de barreira na linha do couro, orelhas e nuca',
          'Dividiu o cabelo em seções com o pente de ponta fina',
          'Preparou a mistura (pó + oxidante) na proporção exata da marca',
          'Utilizou tigela e pincel não metálicos',
          'Utilizou luvas durante todo o manuseio do produto',
          'Selecionou as mechas conforme a técnica, com espessura uniforme',
          'Aplicou o produto de forma homogênea, sem falhas',
          'Respeitou a distância combinada da raiz',
          'Isolou cada mecha, evitando contato entre elas',
          'Limpou imediatamente os respingos na pele',
          'Conferiu a cobertura de todas as seções, inclusive nuca e laterais',
        ],
      },
      {
        titulo: 'Tempo de Ação e Reaplicação', pontos: 15, itens: [
          'Iniciou o cronômetro e registrou o horário de início',
          'Acompanhou a evolução do clareamento de perto, sem abandonar a cliente',
          'Reaplicou o produto nas áreas que precisaram',
          'Perguntou à cliente se estava sentindo ardência ou incômodo',
          'Não ultrapassou o tempo máximo indicado pelo fabricante',
          'Interromperia o processo diante de fragilidade excessiva do fio',
        ],
      },
      {
        titulo: 'Remoção, Higienização e Esfumar', pontos: 10, itens: [
          'Retirou o papel/filme e enxaguou com água morna até sair limpa',
          'Aplicou o 1º e o 2º shampoo + massagem de 10 minutos',
          'Aplicou o condicionador ou a máscara respeitando os tempos',
          'Desembaraçou com cuidado, respeitando a sensibilidade do fio',
          'Realizou o esfumar da raiz sem marcar linha',
          'Controlou o tempo de ação do esfumado',
        ],
      },
      {
        titulo: 'Tonalização e Finalização', pontos: 10, itens: [
          'Fez a avaliação e ofereceu tratamento no lavatório',
          'Aplicou o tonalizante respeitando o tempo do fabricante (quando indicado)',
          'Removeu as manchas da pele',
          'Secou com a toalha, aplicou protetor térmico e finalizadores',
          'Finalizou com secagem ou modelagem',
          'Mostrou o resultado com o espelho de mão e perguntou se a cliente gostou',
          'Orientou sobre a manutenção, o cronograma e o matizador de casa',
        ],
      },
      {
        titulo: 'Registro e Organização', pontos: 5, itens: [
          'Registrou a volumagem, a proporção e o pó utilizado',
          'Registrou o tom do tonalizante e o tempo de ação efetivo',
          'Registrou o resultado, as observações e qualquer intercorrência',
          'Lavou a tigela e o pincel imediatamente',
          'Higienizou a estação e o lavatório para a próxima cliente',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Técnica de Aplicação',
      'Precisão e Segurança Química',
      'Cuidado com a Saúde do Fio',
      'Higiene e Organização',
      'Postura Profissional',
    ],
  },

  // POP-PRO-002 — Atendimento de Pedicure — 100 pontos
  'pop-pro-002': {
    secoes: [
      {
        titulo: 'Biossegurança Antes do Atendimento', pontos: 15, itens: [
          'Higienizou corretamente as mãos',
          'Manteve o uniforme limpo e os cabelos presos',
          'Utilizou luvas descartáveis novas e máscara limpa',
          'Conferiu a limpeza da bancada',
          'Conferiu se os instrumentos estavam esterilizados e dentro da validade',
          'Organizou todos os materiais antes de iniciar',
        ],
      },
      {
        titulo: 'Apresentação e Identificação da Necessidade', pontos: 15, itens: [
          'Iniciou o atendimento de frente para a cliente',
          'Deu as boas-vindas usando o nome da cliente',
          'Apresentou-se pelo nome',
          'Confirmou o serviço agendado',
          'Perguntou o que a cliente pensou para o dia',
          'Perguntou sobre preferência ou foto de referência',
          'Escutou a cliente sem interromper',
        ],
      },
      {
        titulo: 'Ponderações e Orientações', pontos: 10, itens: [
          'Explicou o que era possível realizar',
          'Explicou o que não era recomendado',
          'Explicou as limitações técnicas do procedimento',
          'Orientou sobre os cuidados com os pés e as unhas',
          'Só iniciou após a cliente compreender e concordar',
        ],
      },
      {
        titulo: 'Apresentação dos Materiais à Cliente', pontos: 10, itens: [
          'Colocou luvas descartáveis novas diante da cliente',
          'Colocou máscara limpa e nova',
          'Apresentou o kit descartável lacrado',
          'Apresentou os alicates esterilizados',
          'Organizou os materiais sobre a bancada',
        ],
      },
      {
        titulo: 'Execução do Procedimento (ordem correta)', pontos: 20, itens: [
          'Removeu completamente o esmalte anterior',
          'Lixou e cortou as unhas no formato reto',
          'Lixou ou esfoliou os pés',
          'Utilizou a luva ou botinha amolecedora',
          'Realizou a cuticulagem',
          'Aplicou a base',
          'Pintou e limpou cuidadosamente os cantos',
          'Aplicou spray ou óleo secante',
          'Manteve a bancada organizada, sem celular e sem alimentos',
        ],
      },
      {
        titulo: 'Vendas Durante o Atendimento', pontos: 10, itens: [
          'Ofereceu serviço complementar (ex.: manicure, esfoliação)',
          'Ofereceu os produtos utilizados no atendimento',
          'Identificou oportunidade ou procedimento em atraso',
          'Divulgou campanha ou promoção vigente',
        ],
      },
      {
        titulo: 'Controle de Qualidade', pontos: 10, itens: [
          'Esmaltação uniforme e com cobertura completa',
          'Comprimento uniforme e formato reto, sem cantos arredondados',
          'Cutículas bem acabadas e cantos limpos',
          'Sem borrões, bolhas ou resíduos, com secagem adequada',
          'Pele dos pés macia e hidratada, sem calosidades ou peles soltas',
          'Corrigiu os ajustes antes de apresentar o resultado',
        ],
      },
      {
        titulo: 'Validação, Finalização e Reagendamento', pontos: 10, itens: [
          'Perguntou se a cliente gostou do resultado',
          'Perguntou se havia detalhe a ajustar e ajustou imediatamente',
          'Realizou os lançamentos no sistema',
          'Levou a cliente até a vitrine e ofereceu produtos',
          'Ofereceu o próximo atendimento já agendado',
          'Despediu-se agradecendo e orientando os cuidados',
          'Organizou a estação e encaminhou os instrumentos para esterilização',
        ],
      },
    ],
    comportamental: [
      'Simpatia',
      'Comunicação',
      'Cordialidade',
      'Técnica e Acabamento',
      'Higiene e Biossegurança',
      'Organização da Estação',
      'Capacidade de Venda',
      'Postura Profissional',
    ],
  },
}
