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

  // POP-REC-002 — Atendimento via WhatsApp (Primeiro Contato)
  'pop-rec-002': {
    secoes: [
      {
        titulo: 'Abordagem Inicial', pontos: 15, itens: [
          'Cumprimentou o cliente cordialmente',
          'Apresentou-se pelo nome',
          'Informou que é responsável pelo atendimento/agendamento',
          'Utilizou o nome do cliente durante a conversa',
          'Manteve linguagem educada e profissional',
        ],
      },
      {
        titulo: 'Cadastro do Cliente', pontos: 15, itens: [
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
        titulo: 'Recuperação de Agenda', pontos: 10, condicional: true,
        nota: 'Somente quando não houver a vaga solicitada.',
        itens: [
          'Ofereceu outro horário',
          'Ofereceu outra data',
          'Ofereceu outro profissional',
          'Inseriu em lista de espera',
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
        titulo: 'Reagendamento', pontos: 10, itens: [
          'Ofereceu próximo agendamento',
          'Explicou a importância de garantir vaga',
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
}
