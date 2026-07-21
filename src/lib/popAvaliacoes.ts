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
}

export function faixaResultado(pct: number): { label: string; emoji: string; cor: string } {
  if (pct >= 90) return { label: 'Excelente', emoji: '⭐', cor: '#059669' }
  if (pct >= 80) return { label: 'Bom', emoji: '✅', cor: '#10b981' }
  if (pct >= 70) return { label: 'Regular', emoji: '⚠️', cor: '#f59e0b' }
  if (pct >= 60) return { label: 'Necessita Treinamento', emoji: '🔶', cor: '#f97316' }
  return { label: 'Crítico', emoji: '❌', cor: '#dc2626' }
}

export const AVALIACOES_POP: Record<string, ModeloAvaliacao> = {
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
