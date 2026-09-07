import type { FuncCatalogo } from './funcionalidadesCatalogo'

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DA VITRINE — PARTE 3
//
// A vitrine mostrava 58 funcionalidades. O sistema tem 92 áreas de permissão
// e dezenas de abas dentro delas: o que estava exposto era menos da metade do
// que existe, e faltava justamente o que o dono só descobre quando precisa —
// distrato, provisão de 13º, exame admissional, senha do salão.
//
// A regra de escrita é a mesma das outras duas partes: o título é a PERGUNTA
// que o dono não sabe responder ou a dor no nome dela; a descrição mostra o
// custo de continuar sem aquilo antes de dizer o que o sistema faz; e os
// destaques são o que a pessoa passa a conseguir fazer.
// ─────────────────────────────────────────────────────────────────────────────

const FIN = '#0f766e'
const EQU = '#5b4fcf'
const CLI = '#be123c'
const ROT = '#b45309'
const RES = '#0d6efd'
const OPE = '#475569'

export const FUNCIONALIDADES_CATALOGO_3: FuncCatalogo[] = [

  // ── FINANCEIRO ────────────────────────────────────────────────────────────
  {
    categoria: 'Financeiro', nome: 'Despesas Fixas e Variáveis', slug: 'despesas-fixas-e-variaveis',
    etiqueta: 'Despesas', cor: FIN,
    titulo: 'Você sabe em que o dinheiro do salão foi gasto?',
    descricao: 'Saber quanto saiu é fácil: é olhar o extrato. Saber EM QUE saiu é outra conversa — e é ela que permite decidir onde cortar. Sem categoria definida antes, cada lançamento entra com o nome que deu na cabeça naquele dia, e no fim do mês existe uma pilha de "diversos" que não responde nada.\n\nO NODRI separa o que é custo direto do que é custo operacional, aceita o lançamento da compra com vencimento e mostra a despesa por categoria, mês a mês.',
    destaques: [
      { titulo: 'Cada gasto no seu lugar', desc: 'Produto, estrutura, equipe e retirada deixam de ser um bolo só' },
      { titulo: 'Compra com vencimento', desc: 'O que foi comprado a prazo já entra na fila de contas a pagar' },
      { titulo: 'Comparação mês a mês', desc: 'A categoria que subiu aparece antes de virar problema' },
    ],
    arte: { rotulo: 'Despesa do mês por categoria', valor: 'R$ 31.480', linhas: [['Produto', 'R$ 9.240'], ['Estrutura', 'R$ 12.100'], ['Equipe fixa', 'R$ 10.140']] },
  },
  {
    categoria: 'Financeiro', nome: 'Provisão de 13º, Férias e FGTS', slug: 'provisao-13-ferias-fgts',
    etiqueta: 'Provisão', cor: FIN,
    titulo: 'Em dezembro o 13º vira susto ou vira conta paga?',
    descricao: 'O 13º não aparece em dezembro: ele nasce em janeiro, um doze avos por mês. Quem não guarda essa parte todo mês não economizou nada — só empurrou o gasto para o mês em que o caixa já está mais apertado do ano.\n\nO NODRI calcula a provisão de 13º, férias e FGTS junto com a folha e joga o valor dentro do custo operacional. O preço dos seus serviços passa a considerar isso antes de a conta chegar.',
    destaques: [
      { titulo: 'A conta certa todo mês', desc: 'A parte de 13º, férias e FGTS provisionada junto com a folha' },
      { titulo: 'Dentro do custo', desc: 'Entra no cálculo do preço, e não como surpresa no fim do ano' },
      { titulo: 'Rescisão sem pânico', desc: 'Você sabe quanto já está guardado por profissional' },
    ],
    arte: { rotulo: 'Provisão acumulada', valor: 'R$ 18.920', linhas: [['13º salário', 'R$ 9.400'], ['Férias + 1/3', 'R$ 7.180'], ['FGTS', 'R$ 2.340']] },
  },
  {
    categoria: 'Financeiro', nome: 'Vales e Descontos do Profissional', slug: 'vales-e-descontos',
    etiqueta: 'Vales', cor: FIN,
    titulo: 'Quanto cada profissional já pegou de vale este mês?',
    descricao: 'Vale combinado no WhatsApp e lembrado de cabeça é a origem mais comum de discussão no dia do acerto. Some a isso o serviço interno, a bebida, o produto levado e o empréstimo parcelado: no fechamento, ninguém tem a lista inteira.\n\nO NODRI consolida tudo por profissional e desconta sozinho na comissão. Cada linha com data e motivo, para a conversa ser sobre o registro e não sobre memória.',
    destaques: [
      { titulo: 'Tudo em uma lista', desc: 'Vale, serviço interno, bebida, kit e empréstimo por profissional' },
      { titulo: 'Desconto automático', desc: 'Entra na comissão do fechamento sem ninguém somar à mão' },
      { titulo: 'Sem discussão', desc: 'Data, valor e motivo registrados no momento em que aconteceu' },
    ],
    arte: { rotulo: 'Descontos do mês', valor: 'R$ 2.870', linhas: [['Vales', 'R$ 1.400'], ['Serviço interno', 'R$ 980'], ['Empréstimo', 'R$ 490']] },
  },
  {
    categoria: 'Financeiro', nome: 'Faturamento por Profissional', slug: 'faturamento-por-profissional',
    etiqueta: 'Produção', cor: FIN,
    titulo: 'Quem realmente traz resultado, e quem só ocupa a cadeira?',
    descricao: 'Todo mundo parece ocupado. Mas ocupação não é produção: dá para passar o dia atendendo serviço de ticket baixo e fechar o mês abaixo do que a cadeira custa. E o contrário também acontece — quem atende menos pode estar sustentando a casa.\n\nO NODRI mostra o faturamento de cada profissional, o ticket médio dela, quanto ela custa e quanto sobra. Sem achismo e sem constrangimento: é número.',
    destaques: [
      { titulo: 'Produção por pessoa', desc: 'Faturamento, ticket médio e número de atendimentos de cada uma' },
      { titulo: 'O que sobra de fato', desc: 'Depois de comissão, produto e a fatia do custo fixo da cadeira' },
      { titulo: 'Tendência', desc: 'Quem está subindo e quem está caindo mês a mês' },
    ],
    arte: { rotulo: 'Produção do mês', valor: '6 profissionais', linhas: [['Maior ticket', 'R$ 214'], ['Menor ocupação', '41%'], ['Em queda', '1 profissional']] },
  },
  {
    categoria: 'Financeiro', nome: 'LTV e Dinheiro Perdido', slug: 'ltv-e-dinheiro-perdido',
    etiqueta: 'Valor do cliente', cor: FIN,
    titulo: 'Quanto vale uma cliente que você perdeu?',
    descricao: 'Perder uma cliente não custa o valor de um atendimento: custa tudo o que ela gastaria nos próximos anos. Uma cliente de escova quinzenal some silenciosamente e leva junto milhares de reais que nunca aparecem em relatório nenhum.\n\nO NODRI calcula quanto cada cliente já deixou, quanto ela deixaria por ano, e soma o que foi embora com quem parou de voltar. É o número que faz a recuperação de cliente virar prioridade.',
    destaques: [
      { titulo: 'O valor de cada cliente', desc: 'Quanto ela já deixou e quanto deixa por ano de recorrência' },
      { titulo: 'O que já foi embora', desc: 'A soma do que as clientes perdidas deixariam de gastar' },
      { titulo: 'Prioridade clara', desc: 'Quem recuperar primeiro, pela ordem do que vale mais' },
    ],
    arte: { rotulo: 'Perdido nos últimos 12 meses', valor: 'R$ 46.300', linhas: [['Clientes perdidas', '38'], ['LTV médio', 'R$ 1.218'], ['Recuperáveis', '21']] },
  },

  // ── EQUIPE ────────────────────────────────────────────────────────────────
  {
    categoria: 'Equipe', nome: 'Contrato e Distrato', slug: 'contrato-e-distrato',
    etiqueta: 'Documentos', cor: EQU,
    titulo: 'A profissional saiu ontem. O distrato está pronto?',
    descricao: 'Quase nunca está. E é justamente o documento que fecha o assunto: sem ele, uma parceria encerrada continua aberta para discussão meses depois, com o salão tendo que provar o que foi combinado.\n\nO NODRI guarda contrato, regras do espaço e distrato por profissional, prontos para preencher e assinar. O que foi acordado fica escrito no dia em que foi acordado, e não no dia em que virou problema.',
    destaques: [
      { titulo: 'Contrato pronto', desc: 'Modelo de parceria e regras do espaço para assinar na entrada' },
      { titulo: 'Distrato na hora', desc: 'Encerramento formalizado no dia da saída, sem correria' },
      { titulo: 'Tudo por pessoa', desc: 'Cada documento guardado na ficha de quem assinou' },
    ],
    arte: { rotulo: 'Documentos da equipe', valor: '2 pendentes', linhas: [['Contrato assinado', '7 de 9'], ['Regras assinadas', '9 de 9'], ['Distratos no ano', '3']] },
  },
  {
    categoria: 'Equipe', nome: 'CLT, Férias e Admissional', slug: 'clt-ferias-admissional',
    etiqueta: 'CLT', cor: EQU,
    titulo: 'Quando vence a próxima férias da sua equipe?',
    descricao: 'Férias vencida gera pagamento em dobro, e o prazo passa sem aviso. O mesmo vale para o exame admissional e o periódico: são obrigações simples que só aparecem quando a fiscalização pergunta ou quando o problema já aconteceu.\n\nO NODRI acompanha período aquisitivo, vencimento de férias e exames de cada pessoa em CLT, com a data na frente antes de virar risco.',
    destaques: [
      { titulo: 'Férias com prazo à vista', desc: 'Período aquisitivo e vencimento de cada pessoa, sem planilha' },
      { titulo: 'Exames em dia', desc: 'Admissional, periódico e demissional com data e registro' },
      { titulo: 'Documentação junta', desc: 'Cada comprovante na ficha da profissional' },
    ],
    arte: { rotulo: 'Vencimentos próximos', valor: '3 em 60 dias', linhas: [['Férias a vencer', '2'], ['Exame periódico', '1'], ['Em dia', '6 pessoas']] },
  },
  {
    categoria: 'Equipe', nome: 'Abertura de Conta e CNPJ', slug: 'abertura-de-conta-e-cnpj',
    etiqueta: 'Regularização', cor: EQU,
    titulo: 'A sua parceira está com o CNPJ irregular?',
    descricao: 'MEI com guia atrasada não emite nota, e pode ser desenquadrado. Quando isso acontece, a parceria fica sem base documental — e quem responde numa discussão trabalhista é o salão, não ela.\n\nO NODRI acompanha a situação do CNPJ de cada profissional, guarda os dados bancários para o repasse e traz o passo a passo de abertura de conta e de regularização, para resolver antes de virar risco.',
    destaques: [
      { titulo: 'Situação de cada CNPJ', desc: 'Quem está regular, quem está com guia atrasada' },
      { titulo: 'Dados para o repasse', desc: 'Conta e chave guardadas com o cadastro, não no WhatsApp' },
      { titulo: 'Passo a passo pronto', desc: 'Abertura de conta e regularização explicadas para entregar a ela' },
    ],
    arte: { rotulo: 'Regularidade da equipe', valor: '8 de 9 em dia', linhas: [['CNPJ irregular', '1'], ['Nota em atraso', '2'], ['Conta cadastrada', '9']] },
  },
  {
    categoria: 'Equipe', nome: 'Horários, Folgas e Feriados', slug: 'horarios-folgas-e-feriados',
    etiqueta: 'Escala', cor: EQU,
    titulo: 'Quem está no salão no feriado que vem?',
    descricao: 'A escala combinada de boca sempre desmonta no pior dia: no sábado cheio, na véspera de feriado, no dia em que duas pessoas marcaram a mesma folga. E a recepção descobre quando a cliente já está na porta.\n\nO NODRI mantém a escala de trabalho e a de feriados escritas e visíveis para todo mundo, com folga combinada com antecedência e o dia coberto antes de chegar.',
    destaques: [
      { titulo: 'Escala escrita', desc: 'Quem trabalha em cada dia, visível para a equipe inteira' },
      { titulo: 'Feriados com antecedência', desc: 'Quem cobre cada data definido antes, não na véspera' },
      { titulo: 'Folga sem conflito', desc: 'Duas pessoas não marcam o mesmo dia sem alguém ver' },
    ],
    arte: { rotulo: 'Próximo feriado', valor: '4 de 9 na escala', linhas: [['Cobertura', 'completa'], ['Folgas marcadas', '5'], ['Conflitos', 'nenhum']] },
  },
  {
    categoria: 'Equipe', nome: 'Certificados e Formação', slug: 'certificados-e-formacao',
    etiqueta: 'Formação', cor: EQU,
    titulo: 'Você sabe o que cada profissional está habilitada a fazer?',
    descricao: 'Serviço executado por quem não tem a formação exigida é risco jurídico e é risco de resultado. E a informação costuma estar na memória de alguém: "acho que ela fez o curso de mechas ano passado".\n\nO NODRI guarda certificado e formação por profissional e cruza com os serviços que ela está habilitada a executar — a agenda deixa de oferecer o que ela não faz.',
    destaques: [
      { titulo: 'Certificado guardado', desc: 'Formação de cada pessoa com data e comprovante' },
      { titulo: 'Habilitação por serviço', desc: 'Quem pode executar o quê, definido e visível' },
      { titulo: 'Agenda coerente', desc: 'O sistema não oferece o serviço a quem não faz' },
    ],
    arte: { rotulo: 'Habilitações', valor: '34 serviços', linhas: [['Com certificado', '27'], ['Sem comprovante', '7'], ['Vencendo', '2']] },
  },

  // ── CLIENTES ──────────────────────────────────────────────────────────────
  {
    categoria: 'Clientes', nome: 'Clientes em Risco', slug: 'clientes-em-risco',
    etiqueta: 'Alerta', cor: CLI,
    titulo: 'Dá para saber que a cliente vai sumir antes de ela sumir?',
    descricao: 'Dá. Ela avisa pelo intervalo: quem vinha a cada três semanas passa a vir a cada seis, depois a cada dez. Quando ela finalmente para, já faz meses que o sinal estava lá — e recuperar nesse ponto é muito mais caro.\n\nO NODRI compara a frequência de cada cliente com o histórico dela e aponta quem está esticando o intervalo, enquanto ainda dá para agir.',
    destaques: [
      { titulo: 'O sinal antes da perda', desc: 'Quem está esticando o intervalo em relação ao próprio hábito' },
      { titulo: 'Lista para agir', desc: 'Nome, último serviço e há quanto tempo, pronto para a recepção' },
      { titulo: 'Prioridade por valor', desc: 'Quem vale mais recuperar aparece primeiro' },
    ],
    arte: { rotulo: 'Clientes em risco', valor: '24 hoje', linhas: [['Intervalo dobrado', '11'], ['Valor em risco', 'R$ 18.400'], ['Contatadas', '9']] },
  },
  {
    categoria: 'Clientes', nome: 'Clientes Recuperados', slug: 'clientes-recuperados',
    etiqueta: 'Recuperação', cor: CLI,
    titulo: 'A campanha de reativação deu resultado mesmo?',
    descricao: 'Mandar mensagem para quem sumiu é fácil. Saber quantas voltaram, quanto gastaram e se valeu o desconto que você deu é o que quase ninguém mede — e sem isso a próxima campanha é feita no escuro de novo.\n\nO NODRI marca quem voltou depois de ter sumido, quanto essa volta rendeu e qual ação trouxe cada uma.',
    destaques: [
      { titulo: 'Quem voltou', desc: 'Cliente que estava parada e voltou a agendar, com a data' },
      { titulo: 'Quanto rendeu', desc: 'O faturamento que veio da recuperação, separado do resto' },
      { titulo: 'O que funcionou', desc: 'Qual ação trouxe mais gente de volta, para repetir a certa' },
    ],
    arte: { rotulo: 'Recuperadas no mês', valor: '17 clientes', linhas: [['Faturamento', 'R$ 6.940'], ['Taxa de retorno', '31%'], ['Melhor ação', 'mensagem direta']] },
  },
  {
    categoria: 'Clientes', nome: 'Feedback do Profissional', slug: 'feedback-do-profissional',
    etiqueta: 'Avaliação', cor: CLI,
    titulo: 'A cliente saiu satisfeita — com o salão ou com a profissional?',
    descricao: 'São coisas diferentes, e a diferença importa: cliente fiel à pessoa vai embora junto quando ela sai; cliente fiel ao salão fica. Sem medir separado, você só descobre qual é qual no dia da saída.\n\nO NODRI coleta a avaliação por profissional, mostra a nota de cada uma ao longo do tempo e separa o elogio à pessoa do elogio à casa.',
    destaques: [
      { titulo: 'Nota por profissional', desc: 'Avaliação individual, com histórico e tendência' },
      { titulo: 'Onde está a fidelidade', desc: 'Se a cliente volta pelo salão ou por uma pessoa só' },
      { titulo: 'Conversa com base', desc: 'Feedback individual apoiado em número, não em impressão' },
    ],
    arte: { rotulo: 'Média da equipe', valor: '9,1 de 10', linhas: [['Melhor avaliada', '9,8'], ['Abaixo da média', '1 pessoa'], ['Respostas no mês', '84']] },
  },

  // ── ROTINA ────────────────────────────────────────────────────────────────
  {
    categoria: 'Rotina', nome: 'Ata de Reunião', slug: 'ata-de-reuniao',
    etiqueta: 'Reunião', cor: ROT,
    titulo: 'O que foi combinado na última reunião aconteceu?',
    descricao: 'Sem registro, ninguém sabe — e é por isso que a mesma pauta volta todo mês. Reunião sem ata é conversa: alguém reclama, alguém se defende, todo mundo sai cansado e nada muda.\n\nO NODRI guarda a ata de cada reunião com os combinados, o responsável e o prazo. Na reunião seguinte, o primeiro item é conferir o que ficou — e é isso que faz a equipe levar a sério.',
    destaques: [
      { titulo: 'Combinado escrito', desc: 'O que, quem e até quando, registrado na frente de todos' },
      { titulo: 'Cobrança sem atrito', desc: 'A reunião seguinte começa conferindo o que ficou pendente' },
      { titulo: 'Histórico do ano', desc: 'Todas as atas guardadas, para ver o que evoluiu' },
    ],
    arte: { rotulo: 'Última reunião', valor: '7 combinados', linhas: [['Concluídos', '5'], ['Em andamento', '1'], ['Não iniciados', '1']] },
  },
  {
    categoria: 'Rotina', nome: 'Senhas e Telefones do Salão', slug: 'senhas-e-telefones',
    etiqueta: 'Acessos', cor: ROT,
    titulo: 'Se a recepcionista sair amanhã, você entra nos sistemas?',
    descricao: 'Senha de sistema, do e-mail, da operadora de cartão, do banco, do provedor de internet. Numa casa organizada isso está em um lugar com acesso controlado; na maioria, está na cabeça de uma pessoa ou num papel na gaveta.\n\nO NODRI guarda senhas e telefones importantes com permissão por usuário — quem precisa acessa, quem não precisa nem vê que existe.',
    destaques: [
      { titulo: 'Tudo em um lugar', desc: 'Senhas e contatos críticos fora da cabeça de uma pessoa só' },
      { titulo: 'Acesso controlado', desc: 'Quem enxerga é definido por você, item a item' },
      { titulo: 'Saída sem crise', desc: 'Ninguém sai levando o acesso ao seu próprio negócio' },
    ],
    arte: { rotulo: 'Acessos cadastrados', valor: '23 registros', linhas: [['Com acesso restrito', '14'], ['Telefones críticos', '9'], ['Revisado em', 'este mês']] },
  },

  // ── RESULTADO ─────────────────────────────────────────────────────────────
  {
    categoria: 'Resultado', nome: 'Metas do Profissional', slug: 'metas-do-profissional',
    etiqueta: 'Metas', cor: RES,
    titulo: 'Cada profissional sabe quanto falta para bater a meta dela?',
    descricao: 'Meta que só o dono conhece não muda comportamento nenhum. E meta comunicada no dia 1 e cobrada no dia 30 também não: quando ela vê o resultado, já não dá mais para reagir.\n\nO NODRI distribui a meta do salão por profissional considerando os dias que cada uma trabalha, e mostra a ela — no portal dela — quanto falta, quantos dias restam e quanto precisa por dia.',
    destaques: [
      { titulo: 'Meta por pessoa', desc: 'Distribuída pelos dias trabalhados de cada uma, não dividida igual' },
      { titulo: 'Ela acompanha sozinha', desc: 'Quanto falta e quanto por dia, no portal da profissional' },
      { titulo: 'Redistribuição', desc: 'Quem está acima puxa a meta de quem entrou no meio do mês' },
    ],
    arte: { rotulo: 'Meta da equipe', valor: '72% do mês', linhas: [['Acima da meta', '3 pessoas'], ['Faltam', '9 dias'], ['Precisa por dia', 'R$ 1.180']] },
  },
  {
    categoria: 'Resultado', nome: 'Gráficos e Evolução', slug: 'graficos-e-evolucao',
    etiqueta: 'Evolução', cor: RES,
    titulo: 'O salão está crescendo ou só teve um mês bom?',
    descricao: 'Um mês isolado não diz nada: dezembro sempre parece ótimo e fevereiro sempre parece ruim. O que responde é a linha ao longo do tempo, comparada com o mesmo mês do ano anterior.\n\nO NODRI desenha a evolução de faturamento, ticket médio, ocupação e margem, com o comparativo anual lado a lado. Tendência, não fotografia.',
    destaques: [
      { titulo: 'A linha, não o ponto', desc: 'Faturamento, ticket, ocupação e margem ao longo dos meses' },
      { titulo: 'Comparativo anual', desc: 'Este agosto contra o agosto passado, que é a comparação justa' },
      { titulo: 'Sinal de virada', desc: 'A queda aparece na curva antes de aparecer no caixa' },
    ],
    arte: { rotulo: 'Crescimento no ano', valor: '+18,4%', linhas: [['Ticket médio', '+11%'], ['Ocupação', '+6 pontos'], ['Margem', '+3,2 pontos']] },
  },

  // ── OPERAÇÃO ──────────────────────────────────────────────────────────────
  {
    categoria: 'Operação', nome: 'Pedidos de Compra', slug: 'pedidos-de-compra',
    etiqueta: 'Compras', cor: OPE,
    titulo: 'Quem pediu, quem autorizou e quanto custou?',
    descricao: 'Compra pedida no grupo do WhatsApp não tem responsável nem teto. O produto chega, a nota aparece no fim do mês e ninguém lembra quem autorizou — nem se o preço era esse.\n\nO NODRI organiza o pedido de compra por área, com quem pediu, o que foi aprovado e o valor. O que entra no estoque tem origem, e o que sai do caixa tem dono.',
    destaques: [
      { titulo: 'Pedido com responsável', desc: 'Quem pediu, o que pediu e para qual área' },
      { titulo: 'Aprovação registrada', desc: 'A autorização fica escrita, com valor e data' },
      { titulo: 'Ligado ao estoque', desc: 'O que foi comprado entra na conta do produto' },
    ],
    arte: { rotulo: 'Pedidos do mês', valor: '14 pedidos', linhas: [['Aguardando aprovação', '3'], ['Aprovados', '11'], ['Valor total', 'R$ 7.310']] },
  },
  {
    categoria: 'Operação', nome: 'Etiquetas e Correios', slug: 'etiquetas-e-correios',
    etiqueta: 'Envios', cor: OPE,
    titulo: 'Enviar um produto para a cliente vira meia hora de trabalho?',
    descricao: 'Escrever endereço à mão, conferir CEP, montar etiqueta, anotar o rastreio num caderno. Cada envio parece pequeno e some no dia; somados no mês, viram horas de recepção que poderiam estar preenchendo agenda.\n\nO NODRI gera a etiqueta com os dados que já estão no cadastro da cliente e guarda o registro do envio.',
    destaques: [
      { titulo: 'Etiqueta pronta', desc: 'Gerada do cadastro, sem redigitar endereço' },
      { titulo: 'Registro do envio', desc: 'O que foi enviado, para quem e quando' },
      { titulo: 'Tempo de volta', desc: 'A recepção deixa de perder a manhã em envio manual' },
    ],
    arte: { rotulo: 'Envios no mês', valor: '38 etiquetas', linhas: [['Tempo por envio', '2 minutos'], ['Antes', '15 minutos'], ['Horas devolvidas', '8h']] },
  },
  {
    categoria: 'Operação', nome: 'Cadastro de Produtos', slug: 'cadastro-de-produtos',
    etiqueta: 'Produtos', cor: OPE,
    titulo: 'Quanto custa, de verdade, o produto que você usa?',
    descricao: 'O preço da embalagem não é o custo do atendimento. O que importa é quanto sai por aplicação — e isso depende do rendimento real, não do que está escrito no rótulo. Sem esse número, o preço do serviço nasce errado.\n\nO NODRI cadastra o produto com embalagem, rendimento e custo por grama, e leva esse valor direto para dentro do preço de cada serviço.',
    destaques: [
      { titulo: 'Custo por aplicação', desc: 'Não o preço do pote: o que sai em cada atendimento' },
      { titulo: 'Ligado ao serviço', desc: 'O custo entra no preço automaticamente quando o produto muda' },
      { titulo: 'Reajuste do fornecedor', desc: 'Subiu o produto, o sistema mostra quais serviços ficaram apertados' },
    ],
    arte: { rotulo: 'Produtos cadastrados', valor: '146 itens', linhas: [['Custo médio/aplicação', 'R$ 4,30'], ['Reajustes no mês', '9'], ['Serviços afetados', '23']] },
  },
]
