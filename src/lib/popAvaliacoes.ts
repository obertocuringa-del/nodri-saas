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
}
