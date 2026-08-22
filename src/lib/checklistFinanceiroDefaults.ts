// Categorias-padrão do CHECK LIST — FINANCEIRO.
//
// O Financeiro era o único setor sem check list de tarefas: tinha as
// ferramentas (DRE, fluxo de caixa, contas a pagar, guias do MEI) mas nenhuma
// rotina marcável — e, sem check list, não tinha como receber nem enviar
// demanda para os outros setores.
//
// A lista abaixo é o esqueleto da rotina financeira de um salão, montada em
// cima do que o próprio NODRI já faz. Nasce para ser editada: cada salão
// muda período, apaga o que não usa e acrescenta o que é dele.
//
// Vive na chave 'checklist_financeiro', separada do check list do salão.

export interface CatFinanceiro { nome: string; itens: { texto: string; freq?: string }[] }

export const CHECKLIST_FINANCEIRO: CatFinanceiro[] = [
  {
    nome: 'CAIXA DO DIA',
    itens: [
      { texto: 'Conferir o fechamento de caixa de ontem (dinheiro, cartão e Pix)', freq: 'Diário' },
      { texto: 'Conferir se a sangria do dia anterior foi depositada', freq: 'Diário' },
      { texto: 'Lançar as entradas do dia no fluxo de caixa', freq: 'Diário' },
      { texto: 'Conferir divergências apontadas na Conferência de Caixas', freq: 'Diário' },
      { texto: 'Cobrar a recepção sobre caixa não fechado', freq: 'Diário' },
    ],
  },
  {
    nome: 'RECEBIMENTOS E CONCILIAÇÃO',
    itens: [
      { texto: 'Conferir o extrato bancário do dia', freq: 'Diário' },
      { texto: 'Conciliar recebimentos de cartão com as vendas do dia', freq: 'Diário' },
      { texto: 'Conferir Pix recebidos e identificar o pagador', freq: 'Diário' },
      { texto: 'Conferir taxas de maquininha cobradas na semana', freq: 'Semanal' },
      { texto: 'Verificar recebíveis antecipados e o custo da antecipação', freq: 'Semanal' },
      { texto: 'Conferir estornos e chargebacks do período', freq: 'Semanal' },
    ],
  },
  {
    nome: 'CONTAS A PAGAR',
    itens: [
      { texto: 'Conferir os boletos que vencem hoje', freq: 'Diário' },
      { texto: 'Marcar como pago o que já foi quitado', freq: 'Diário' },
      { texto: 'Conferir contas a vencer nos próximos 7 dias', freq: 'Semanal' },
      { texto: 'Programar pagamentos da semana no banco', freq: 'Semanal' },
      { texto: 'Conferir aluguel, condomínio e IPTU', freq: 'Mensal' },
      { texto: 'Conferir água, luz, internet e telefone', freq: 'Mensal' },
      { texto: 'Revisar assinaturas e mensalidades de sistemas', freq: 'Mensal' },
      { texto: 'Renegociar contas fora do padrão do mês', freq: 'Mensal' },
    ],
  },
  {
    nome: 'PEDIDOS DE COMPRA',
    itens: [
      { texto: 'Analisar os pedidos de compra recebidos dos setores', freq: 'Semanal' },
      { texto: 'Aprovar, ajustar ou devolver cada pedido com justificativa', freq: 'Semanal' },
      { texto: 'Conferir se o que foi comprado chegou e bate com a nota', freq: 'Semanal' },
      { texto: 'Comparar preço de fornecedor dos itens de maior gasto', freq: 'Mensal' },
    ],
  },
  {
    nome: 'PROFISSIONAIS E COMISSÕES',
    itens: [
      { texto: 'Conferir o faturamento lançado por profissional', freq: 'Semanal' },
      { texto: 'Fechar as comissões do período', freq: 'Quinzenal' },
      { texto: 'Lançar os descontos (bebidas, serviços internos, kits, empréstimos)', freq: 'Quinzenal' },
      { texto: 'Conferir os empréstimos liberados e as parcelas do mês', freq: 'Mensal' },
      { texto: 'Pagar as comissões e enviar o comprovante', freq: 'Quinzenal' },
      { texto: 'Conferir VA e VT do mês', freq: 'Mensal' },
      { texto: 'Emitir as guias do MEI da equipe', freq: 'Mensal' },
      { texto: 'Conferir se todas as guias do MEI foram pagas', freq: 'Mensal' },
    ],
  },
  {
    nome: 'IMPOSTOS E OBRIGAÇÕES',
    itens: [
      { texto: 'Conferir e pagar o Simples Nacional / DAS da empresa', freq: 'Mensal' },
      { texto: 'Conferir o FGTS e as guias trabalhistas', freq: 'Mensal' },
      { texto: 'Conferir notas fiscais emitidas, canceladas e estornadas', freq: 'Mensal' },
      { texto: 'Conferir vencimento de alvará, licenças e certidões', freq: 'Trimestral' },
      { texto: 'Conferir o enquadramento tributário com a contabilidade', freq: 'Semestral' },
    ],
  },
  {
    nome: 'ENVIO PARA A CONTABILIDADE',
    itens: [
      { texto: 'Separar notas fiscais de serviço e de compra do mês', freq: 'Mensal' },
      { texto: 'Separar os extratos bancários do mês', freq: 'Mensal' },
      { texto: 'Enviar o faturamento por profissional', freq: 'Mensal' },
      { texto: 'Enviar a folha, o pró-labore e os comprovantes', freq: 'Mensal' },
      { texto: 'Confirmar com a contabilidade que chegou tudo', freq: 'Mensal' },
      { texto: 'Guardar o balancete devolvido pela contabilidade', freq: 'Mensal' },
    ],
  },
  {
    nome: 'ANÁLISE E FECHAMENTO DO MÊS',
    itens: [
      { texto: 'Fechar o DRE do mês', freq: 'Mensal' },
      { texto: 'Atualizar o ponto de equilíbrio com os custos do mês', freq: 'Mensal' },
      { texto: 'Comparar faturamento do mês com o mês anterior e com o ano passado', freq: 'Mensal' },
      { texto: 'Conferir a margem por serviço e apontar o que dá prejuízo', freq: 'Mensal' },
      { texto: 'Revisar a previsão de despesas do mês seguinte', freq: 'Mensal' },
      { texto: 'Conferir o saldo em caixa e a reserva financeira', freq: 'Mensal' },
      { texto: 'Levar os números para a reunião com a direção', freq: 'Mensal' },
      { texto: 'Revisar a tabela de preços com base no custo', freq: 'Semestral' },
      { texto: 'Fechar o ano e conferir com o contador antes do IR', freq: 'Anual' },
    ],
  },
]
