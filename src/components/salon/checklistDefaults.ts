// Categorias e demandas PADRÃO do Check List — modelo GENÉRICO usado apenas
// quando um salão ainda não tem check list salvo. Cada salão personaliza o
// seu a partir daqui. NUNCA colocar neste arquivo tarefas/nomes de um salão
// específico: isso faria os dados de um cliente aparecerem para os demais.
export const CHECKLIST_DEFAULT: { nome: string; demandas: string[] }[] = [
  {
    nome: 'Abertura', demandas: [
      'Ligar equipamentos, luzes e ar-condicionado',
      'Conferir a agenda e os agendamentos do dia',
      'Organizar o salão (cadeiras, bancadas, carrinhos)',
      'Responder as mensagens de clientes',
    ]
  },
  {
    nome: 'Intermediário', demandas: [
      'Confirmar os agendamentos do dia seguinte',
      'Dar entrada nos produtos que chegaram',
      'Verificar comandas em aberto no sistema',
    ]
  },
  {
    nome: 'Fechamento', demandas: [
      'Fechar o caixa',
      'Emitir as notas fiscais pendentes',
      'Desligar equipamentos e luzes',
      'Deixar o salão organizado para o dia seguinte',
    ]
  },
]

export const FREQUENCIAS = ['Diário', 'Semanal', 'Quinzenal', 'Mensal', 'Trimestral', 'Semestral', 'Anual']
