// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE FUNCIONALIDADES DA VITRINE
//
// Cada item aqui vira uma página em /funcionalidade/<slug>, criada de uma vez
// pelo botão "Criar as funcionalidades recomendadas" em Admin > Funcionalidades.
//
// Por que o catálogo mora no CÓDIGO e as páginas no BANCO: depois de criadas,
// elas são suas — dá para editar título, texto, destaques, imagem e vídeo pelo
// painel, e o que você escrever nunca é sobrescrito. Este arquivo é só a carga
// inicial, para a vitrine não nascer vazia.
//
// ── Como o texto foi escrito ────────────────────────────────────────────────
// Quem abre uma dessas páginas está decidindo se compra. Então cada uma segue
// a mesma ordem:
//   1. A ETIQUETA diz de que assunto se trata.
//   2. O TÍTULO é a PERGUNTA que o dono não sabe responder, ou a dor no nome
//      dela. Título que descreve recurso ("Módulo de metas") não vende, porque
//      quem não sabe que precisa não clica.
//   3. A DESCRIÇÃO mostra o custo de continuar sem aquilo, e só então o que o
//      sistema faz. Dor antes de solução: sem dor, a solução é só mais uma.
//   4. Os DESTAQUES são o que a pessoa passa a conseguir fazer — não a lista
//      de campos da tela.
// Nada de emoji, e nada de promessa que o sistema não cumpre.
// ─────────────────────────────────────────────────────────────────────────────

export interface FuncCatalogo {
  categoria: string
  nome: string
  slug: string
  etiqueta: string
  titulo: string
  descricao: string
  destaques: { titulo: string; desc: string }[]
  /** Cor da categoria — usada na arte gerada em public/func/<slug>.svg */
  cor: string
  /** O que a arte mostra: rótulo grande, valor grande e três linhas de apoio. */
  arte: { rotulo: string; valor: string; linhas: [string, string][] }
}

const FIN = '#0f766e'
const EQU = '#5b4fcf'
const CLI = '#be123c'
const ROT = '#b45309'
const RES = '#0d6efd'
const OPE = '#475569'

export const FUNCIONALIDADES_CATALOGO: FuncCatalogo[] = [

  // ── FINANCEIRO ────────────────────────────────────────────────────────────
  {
    categoria: 'Financeiro', nome: 'Ponto de Equilíbrio', slug: 'ponto-de-equilibrio',
    etiqueta: 'Ponto de equilíbrio', cor: FIN,
    titulo: 'Quanto o seu salão precisa faturar para não ter prejuízo?',
    descricao: 'Quase nenhum dono sabe responder. E é o número mais importante do mês: abaixo dele, o salão trabalha para pagar contas; acima, começa a sobrar. Sem ele, o mês fecha e ninguém sabe dizer se deu lucro — só se teve movimento.\n\nO NODRI calcula esse valor a partir das suas despesas reais, incluindo o que quase todo mundo esquece: 13º, férias, FGTS rescisório e impostos. E mostra, todo dia, quanto já foi faturado e quanto falta.',
    destaques: [
      { titulo: 'O número que decide o mês', desc: 'Quanto faturar para não ter prejuízo, calculado do seu custo real' },
      { titulo: 'Acompanhamento diário', desc: 'Quanto já entrou, quanto falta e se o mês está no azul' },
      { titulo: 'As provisões que somem', desc: '13º, férias e rescisão entram na conta antes de virarem susto' },
    ],
    arte: { rotulo: 'Ponto de equilíbrio do mês', valor: 'R$ 84.300', linhas: [['Faturado', 'R$ 128.750'], ['Situação', 'já superado'], ['Lucro real', 'R$ 44.450']] },
  },
  {
    categoria: 'Financeiro', nome: 'Preço por Custo Real', slug: 'preco-por-custo-real',
    etiqueta: 'Precificação', cor: FIN,
    titulo: 'Qual dos seus serviços dá prejuízo?',
    descricao: 'Quase todo salão tem pelo menos um. E costuma ser o mais vendido, porque é o mais barato — então quanto mais o salão trabalha, mais ele perde. Isso não aparece no extrato: aparece no fim do ano, quando não sobrou nada.\n\nO NODRI monta o preço a partir do custo de verdade: produto usado, tempo de cadeira, comissão e a fatia da despesa fixa que aquele serviço tem que pagar. Você vê a margem de cada um, lado a lado.',
    destaques: [
      { titulo: 'Custo real, não chute', desc: 'Produto, tempo, comissão e rateio da despesa fixa em cada serviço' },
      { titulo: 'A margem exposta', desc: 'Qual serviço sustenta o salão e qual está consumindo o caixa' },
      { titulo: 'Reajuste com argumento', desc: 'Você sabe exatamente quanto precisa subir, e por quê' },
    ],
    arte: { rotulo: 'Margem por serviço', valor: '3 no vermelho', linhas: [['Escova', '-4% de margem'], ['Corte', '+38% de margem'], ['Mechas', '+52% de margem']] },
  },
  {
    categoria: 'Financeiro', nome: 'Aluguel de Cadeira', slug: 'aluguel-de-cadeira',
    etiqueta: 'Aluguel de cadeira', cor: FIN,
    titulo: 'Você está alugando cadeira abaixo do custo?',
    descricao: 'É o que costuma acontecer. Quem calcula o aluguel pensa no espaço e esquece dois custos que não perdoam: a depreciação do que está ali dentro e a cadeira vazia — os dias em que ninguém usou e o aluguel foi pago do mesmo jeito.\n\nO NODRI calcula o valor por hora, por diária e por mês já com depreciação e vacância embutidas. Você para de descobrir no fim do ano que o aluguel não pagava nem a conta de luz daquele espaço.',
    destaques: [
      { titulo: 'A cadeira vazia entra na conta', desc: 'A vacância é prevista, em vez de virar prejuízo silencioso' },
      { titulo: 'Hora, diária e mês', desc: 'Três formatos calculados da mesma base de custo' },
      { titulo: 'Depreciação incluída', desc: 'O equipamento que se gasta é cobrado de quem usa' },
    ],
    arte: { rotulo: 'Valor sugerido da cadeira', valor: 'R$ 1.480/mês', linhas: [['Por hora', 'R$ 12,40'], ['Diária', 'R$ 99,00'], ['Vacância prevista', '30%']] },
  },
  {
    categoria: 'Financeiro', nome: 'Contas e Boletos', slug: 'contas-e-boletos',
    etiqueta: 'Contas a pagar', cor: FIN,
    titulo: 'Quanto você já pagou de juros por esquecimento?',
    descricao: 'Boleto vencido não avisa. Ele aparece depois, com multa e juros, num mês em que o caixa já estava apertado. E some no meio da papelada porque não existe um lugar único onde as contas do salão morem.\n\nNo NODRI, toda despesa com vencimento vira uma fila no setor Financeiro. O que está para vencer aparece na tela inicial, com o valor total a pagar — e some de lá quando é quitado.',
    destaques: [
      { titulo: 'Aviso antes do vencimento', desc: 'A tela inicial mostra quanto está a pagar, sem você procurar' },
      { titulo: 'Leitor de código de barras', desc: 'O boleto entra pela câmera, sem digitar linha' },
      { titulo: 'Histórico do que foi pago', desc: 'Fim da dúvida sobre se aquela conta já foi quitada' },
    ],
    arte: { rotulo: 'A vencer nos próximos 7 dias', valor: 'R$ 6.240', linhas: [['Boletos abertos', '4'], ['Vencidos', '1'], ['Pagos no mês', '11']] },
  },
  {
    categoria: 'Financeiro', nome: 'DRE e Fluxo de Caixa', slug: 'dre-e-fluxo-de-caixa',
    etiqueta: 'Resultado do mês', cor: FIN,
    titulo: 'O mês fechou. Sobrou quanto?',
    descricao: 'A pergunta parece simples e quase nunca tem resposta. O extrato mostra movimento, não resultado: entra o dinheiro do cliente, sai a comissão, sai o produto, sai o aluguel — e no fim ninguém sabe o que era lucro e o que era dinheiro de passagem.\n\nO DRE do NODRI monta esse resultado com o que já está no sistema, e cada linha tem uma barra proporcional ao faturamento. Dá para ver o peso de cada custo sem comparar números.',
    destaques: [
      { titulo: 'Resultado, não movimento', desc: 'O que sobrou depois de tudo, mês a mês' },
      { titulo: 'O peso de cada custo', desc: 'Barra proporcional mostra onde o dinheiro está indo' },
      { titulo: 'Projeção do ano', desc: 'Previsão de despesas para não ser pego de surpresa' },
    ],
    arte: { rotulo: 'Resultado do mês', valor: 'R$ 44.450', linhas: [['Faturamento', 'R$ 128.750'], ['Comissões', '38% do total'], ['Despesa fixa', '27% do total']] },
  },
  {
    categoria: 'Financeiro', nome: 'Comissões e Descontos', slug: 'comissoes-e-descontos',
    etiqueta: 'Fechamento da equipe', cor: FIN,
    titulo: 'Quanto tempo você perde fechando comissão?',
    descricao: 'Todo mês a mesma cena: juntar o que cada profissional fez, somar o que ela consumiu, lembrar do empréstimo que ela pediu, conferir na calculadora e torcer para não errar. Erro de comissão é conversa difícil e desgasta com quem trabalha bem.\n\nO NODRI fecha por quinzena ou por mês e junta tudo que é descontado de cada uma — bebidas, serviços internos, kits e parcelas de empréstimo — numa lista só.',
    destaques: [
      { titulo: 'Fechamento por quinzena', desc: 'O ciclo que a maioria dos salões usa de verdade' },
      { titulo: 'Descontos consolidados', desc: 'Bebida, kit, serviço interno e empréstimo somados por pessoa' },
      { titulo: 'Empréstimo parcelado', desc: 'A parcela cai sozinha no mês certo, sem ninguém lembrar' },
    ],
    arte: { rotulo: 'Fechamento da quinzena', valor: '9 profissionais', linhas: [['Comissões', 'R$ 21.380'], ['Descontos', 'R$ 1.940'], ['Empréstimos', '3 em curso']] },
  },

  // ── EQUIPE ────────────────────────────────────────────────────────────────
  {
    categoria: 'Equipe', nome: 'Ficha do Profissional', slug: 'ficha-do-profissional',
    etiqueta: 'Ficha completa', cor: EQU,
    titulo: 'O que você sabe sobre quem trabalha com você?',
    descricao: 'Na maioria dos salões, o que se sabe está espalhado: o contrato numa pasta, o certificado no WhatsApp, o horário na cabeça da recepção e o desempenho na memória de quem observou. Quando alguém sai, some tudo junto.\n\nNo NODRI cada pessoa tem uma ficha viva, com cadastro, documentos, atribuições, avaliações e histórico. É de lá que sai contrato, distrato e plano de carreira — sem procurar em lugar nenhum.',
    destaques: [
      { titulo: 'Tudo num lugar só', desc: 'Cadastro, documentos, horários, folgas e histórico da pessoa' },
      { titulo: 'Documento gerado na hora', desc: 'Contrato, distrato, norma de conduta e ficha de entrevista' },
      { titulo: 'CLT e PJ no mesmo lugar', desc: 'Cada vínculo com o que ele exige, sem misturar' },
    ],
    arte: { rotulo: 'Ficha da profissional', valor: '19 abas', linhas: [['Documentos', 'contrato e distrato'], ['Carreira', 'nível e progresso'], ['Avaliação', 'nota e histórico']] },
  },
  {
    categoria: 'Equipe', nome: 'Contratação e Documentos', slug: 'contratacao-e-documentos',
    etiqueta: 'Contratar e desligar', cor: EQU,
    titulo: 'Contratar alguém no seu salão leva quanto tempo?',
    descricao: 'Entre achar um modelo de contrato, adaptar, imprimir, colher dados e organizar a papelada, a contratação vira um dia de trabalho — e o desligamento, quando vem, costuma vir sem nada escrito, que é onde mora o risco.\n\nO NODRI traz o processo pronto: ficha de entrevista, perfil ideal, contrato, chancela, exame admissional, carta de abertura de conta e distrato. A pessoa contratada ainda preenche o próprio cadastro por um link, antes de ter login.',
    destaques: [
      { titulo: 'Processo escrito', desc: 'Contratação e desligamento com os passos definidos' },
      { titulo: 'A pessoa se cadastra', desc: 'Link para o contratado preencher os próprios dados' },
      { titulo: 'Documento em minutos', desc: 'Contrato e distrato saem prontos, com os dados do salão' },
    ],
    arte: { rotulo: 'Processo de contratação', valor: '8 documentos', linhas: [['Ficha de entrevista', 'pronta'], ['Contrato e chancela', 'pronto'], ['Distrato', 'pronto']] },
  },
  {
    categoria: 'Equipe', nome: 'Plano de Carreira', slug: 'plano-de-carreira',
    etiqueta: 'Carreira', cor: EQU,
    titulo: 'Por que a boa profissional vai embora?',
    descricao: 'Quase nunca é só dinheiro. É não enxergar para onde está indo. Sem níveis, sem critério e sem conversa, o crescimento vira sensação — e quando aparece um convite de fora, não há o que segurar.\n\nO NODRI põe o plano de carreira por escrito: níveis, o que cada um exige e onde cada profissional está. Ela abre o próprio portal e vê o quanto falta para o próximo degrau.',
    destaques: [
      { titulo: 'Níveis com critério', desc: 'O que é preciso para subir, escrito e igual para todas' },
      { titulo: 'Ela acompanha sozinha', desc: 'O progresso aparece no portal da própria profissional' },
      { titulo: 'Conversa com base', desc: 'A avaliação deixa de ser opinião e passa a ser histórico' },
    ],
    arte: { rotulo: 'Plano de carreira', valor: '5 níveis', linhas: [['Juliana', 'Sênior — 82%'], ['Fernanda', 'Pleno — 47%'], ['Camila', 'Júnior — 63%']] },
  },
  {
    categoria: 'Equipe', nome: 'Avaliação de Desempenho', slug: 'avaliacao-de-desempenho',
    etiqueta: 'Avaliação', cor: EQU,
    titulo: '"Ela sempre chega atrasada" dá para provar?',
    descricao: 'Sem registro, não dá. E aí a conversa vira a sua palavra contra a dela, todo mundo sai magoado e nada muda. Pior: se um dia for preciso desligar, não há nada escrito que sustente a decisão.\n\nO NODRI registra ocorrências positivas e negativas com data, e a avaliação tem 100 pontos técnicos mais itens de comportamento. O que era impressão vira histórico.',
    destaques: [
      { titulo: 'Ocorrência com data', desc: 'O que aconteceu, quando e quem registrou' },
      { titulo: 'Avaliação com critério', desc: '100 pontos técnicos e itens comportamentais de 1 a 5' },
      { titulo: 'Ranking da equipe', desc: 'Todo mundo medido pela mesma régua' },
    ],
    arte: { rotulo: 'Avaliação da equipe', valor: 'nota 8,7', linhas: [['Ocorrências no mês', '12 registradas'], ['Positivas', '9'], ['A tratar', '3']] },
  },
  {
    categoria: 'Equipe', nome: 'Portal do Profissional', slug: 'portal-do-profissional',
    etiqueta: 'Portal', cor: EQU,
    titulo: 'Sua equipe sabe como está indo, sem perguntar a você?',
    descricao: 'Quando a única fonte de informação é o dono, tudo vira interrupção: "quanto eu fiz?", "bati a meta?", "quando sai minha comissão?". E o que não é perguntado vira boato no corredor.\n\nNo NODRI cada profissional entra com login próprio e vê o que é dela: meta, posição na corrida, demandas, recados e POPs. E não vê o dinheiro de ninguém — nem o das colegas, nem os valores em reais do próprio faturamento. Só percentual e posição.',
    destaques: [
      { titulo: 'Ela se acompanha sozinha', desc: 'Meta, demandas e recados no login dela' },
      { titulo: 'Transparência sem exposição', desc: 'Percentual e posição, nunca o valor das colegas' },
      { titulo: 'Pedidos pelo portal', desc: 'Ela solicita e o setor responde, com registro' },
    ],
    arte: { rotulo: 'O que a profissional vê', valor: '92% da meta', linhas: [['Posição na corrida', '2º lugar'], ['Demandas abertas', '3'], ['Valores de colegas', 'ocultos']] },
  },

  // ── CLIENTES ──────────────────────────────────────────────────────────────
  {
    categoria: 'Clientes', nome: 'Clientes que Sumiram', slug: 'clientes-que-sumiram',
    etiqueta: 'Recuperação', cor: CLI,
    titulo: 'Quantas clientes você perdeu nos últimos 90 dias?',
    descricao: 'Ninguém sabe responder, e é o número mais caro do salão. Cliente não avisa que foi embora: ela simplesmente não volta, e você não percebe porque a agenda continua cheia com as outras. Quando nota, já foram dezenas — e cada uma dessas você já pagou para conquistar.\n\nO NODRI lê os seus atendimentos e entrega a lista: quem sumiu, quem está prestes a sumir e quem voltou depois do contato. Com nome, telefone e há quantos dias.',
    destaques: [
      { titulo: 'A lista com nome e telefone', desc: 'Quem parou de voltar e há quantos dias está sem vir' },
      { titulo: 'Aviso antes de perder', desc: 'Quem está em risco, enquanto ainda dá para chamar' },
      { titulo: 'A prova de que funcionou', desc: 'Quem voltou depois do contato aparece separado' },
    ],
    arte: { rotulo: 'Dinheiro parado na sua carteira', valor: 'R$ 96.400', linhas: [['Clientes sumidos', '187'], ['Em risco', '43'], ['Recuperados no mês', '21']] },
  },
  {
    categoria: 'Clientes', nome: 'Pesquisa de Satisfação', slug: 'pesquisa-de-satisfacao',
    etiqueta: 'Satisfação', cor: CLI,
    titulo: 'Você sabe por que a cliente não voltou?',
    descricao: 'Quase ninguém reclama. A cliente insatisfeita não discute: ela agradece, paga, sorri e não marca de novo. O problema real quase nunca chega ao dono — chega só o resultado dele, meses depois.\n\nO NODRI monta a pesquisa com as perguntas que você quiser, manda por link, e devolve os resultados com gráficos e uma leitura escrita por inteligência artificial sobre o que as respostas dizem juntas.',
    destaques: [
      { titulo: 'Perguntas suas', desc: 'Nota, múltipla escolha, sim ou não e texto livre' },
      { titulo: 'Chega por link', desc: 'A cliente responde pelo celular, sem instalar nada' },
      { titulo: 'Leitura automática', desc: 'A IA lê todas as respostas e diz o que elas apontam' },
    ],
    arte: { rotulo: 'Satisfação do cliente', valor: 'NPS 85', linhas: [['Nota média', '9,6 / 10'], ['Taxa de retorno', '98%'], ['Serviço crítico', 'Maquiagem 4,3']] },
  },
  {
    categoria: 'Clientes', nome: 'Convite para o Google', slug: 'convite-para-o-google',
    etiqueta: 'Reputação', cor: CLI,
    titulo: 'Como conseguir nota alta no Google sem correr risco?',
    descricao: 'Pedir avaliação para todo mundo é uma aposta: a cliente que saiu insatisfeita também recebe o convite, e uma estrela pesa mais que dez cincos. Por isso muito salão simplesmente não pede — e fica com três avaliações de 2019.\n\nNo NODRI o convite só vai para quem respondeu que saiu satisfeita. Quem não saiu é levada para uma conversa com você, não para o Google.',
    destaques: [
      { titulo: 'Convite filtrado', desc: 'Só quem se declarou satisfeita recebe o link do Google' },
      { titulo: 'O insatisfeito fala com você', desc: 'A reclamação chega antes de virar avaliação pública' },
      { titulo: 'Critério que você define', desc: 'Você escolhe a pergunta que decide quem é convidado' },
    ],
    arte: { rotulo: 'Convites enviados no mês', valor: '64 clientes', linhas: [['Satisfeitos', '58 convidados'], ['Insatisfeitos', '6 tratados'], ['Nota no Google', 'subiu 0,4']] },
  },
  {
    categoria: 'Clientes', nome: 'Vitrine do Salão', slug: 'vitrine-do-salao',
    etiqueta: 'Vitrine', cor: CLI,
    titulo: 'O que a cliente vê quando procura o seu salão?',
    descricao: 'Na maioria das vezes, um perfil de rede social sem preço, sem serviço listado e com a última promoção de três meses atrás. Quem está decidindo onde marcar precisa perguntar tudo no direct — e muita gente não pergunta: escolhe quem já respondeu.\n\nA vitrine do NODRI é uma página própria do seu salão, aberta por link: preços, promoções, sugestão de serviço e agendamento que cai no seu WhatsApp. Cabe no link da bio.',
    destaques: [
      { titulo: 'Preço à vista de todos', desc: 'A tabela do salão, sempre igual à que está no sistema' },
      { titulo: 'Agendamento pelo WhatsApp', desc: 'A cliente escolhe e o pedido chega pronto para você' },
      { titulo: 'Com a sua marca', desc: 'A logo do salão no lugar da nossa' },
    ],
    arte: { rotulo: 'Página pública do salão', valor: 'link próprio', linhas: [['Preços', 'sempre atualizados'], ['Promoções', 'as que você ativar'], ['Agendar', 'cai no seu WhatsApp']] },
  },

  // ── ROTINA ────────────────────────────────────────────────────────────────
  {
    categoria: 'Rotina', nome: 'Check List por Turno', slug: 'check-list-por-turno',
    etiqueta: 'Rotina diária', cor: ROT,
    titulo: 'O salão abre certo mesmo quando você não está?',
    descricao: 'Enquanto a rotina mora na cabeça de uma pessoa, ela sai de férias e o salão sente. As coisas passam a ser feitas "do jeito que der", e o padrão só volta quando alguém reclama — o que geralmente é a cliente.\n\nO NODRI tem check list por período: abertura, intermediário, fechamento e mais treze áreas. Cada período vira sozinho pela data, sem ninguém zerar nada, e o que ficou para trás acende na tela inicial.',
    destaques: [
      { titulo: 'Dezesseis listas prontas', desc: 'Por área, já vêm escritas — você ajusta o que quiser' },
      { titulo: 'O período vira sozinho', desc: 'Sem ninguém precisar reiniciar a lista todo dia' },
      { titulo: 'O que não foi feito aparece', desc: 'A tela inicial acende quando há tarefa do dia parada' },
    ],
    arte: { rotulo: 'Check list de hoje', valor: '18 de 21', linhas: [['Abertura', 'concluída'], ['Intermediário', 'em andamento'], ['Fechamento', 'a fazer']] },
  },
  {
    categoria: 'Rotina', nome: 'Organograma e Setores', slug: 'organograma-e-setores',
    etiqueta: 'Estrutura', cor: ROT,
    titulo: 'Quem é o responsável por isso no seu salão?',
    descricao: 'Se a resposta é "eu", o salão não tem estrutura — tem uma pessoa fazendo tudo. E enquanto for assim, crescer significa trabalhar mais, não faturar mais.\n\nO NODRI desenha a estrutura da sua empresa com dezesseis setores, cada um já com as responsabilidades escritas: o Financeiro nasce com DRE, contas a pagar e comissões; o Comercial com metas, reativação e ticket médio. Você não precisa inventar nada.',
    destaques: [
      { titulo: 'Dezesseis setores prontos', desc: 'Cada um com as atribuições já escritas' },
      { titulo: 'Cada caixa abre o setor', desc: 'Com as ferramentas e as demandas daquela área' },
      { titulo: 'Assessoria separada', desc: 'Quem audita não manda em quem executa' },
    ],
    arte: { rotulo: 'Estrutura do salão', valor: '16 setores', linhas: [['Ferramentas', '82 distribuídas'], ['Demandas', 'já escritas'], ['Assessoria', 'fora da cadeia']] },
  },
  {
    categoria: 'Rotina', nome: 'Escala de Trabalho', slug: 'escala-de-trabalho',
    etiqueta: 'Escala', cor: ROT,
    titulo: 'Quem trabalha no feriado?',
    descricao: 'A escala de papel na parede resolve até o dia em que alguém troca com alguém e ninguém avisa. Aí o salão abre com gente demais numa terça e gente de menos no sábado — e o feriado vira discussão todo ano.\n\nO NODRI guarda a escala de trabalho e a de feriados, com CLT e PJ, e ela fica visível para quem precisa. Sem foto de papel em grupo de WhatsApp.',
    destaques: [
      { titulo: 'Mês inteiro numa tela', desc: 'Quem trabalha em qual dia, com folgas marcadas' },
      { titulo: 'Feriados à parte', desc: 'Natal, ano novo e carnaval definidos antes da discussão' },
      { titulo: 'CLT e PJ juntos', desc: 'A escala inteira, sem separar planilha' },
    ],
    arte: { rotulo: 'Escala do mês', valor: '9 pessoas', linhas: [['Sábado', '7 escaladas'], ['Terça', '3 escaladas'], ['Feriados', 'já definidos']] },
  },
  {
    categoria: 'Rotina', nome: 'Pendências e Recados', slug: 'pendencias-e-recados',
    etiqueta: 'Comunicação', cor: ROT,
    titulo: 'Quantos recados importantes somem no grupo do WhatsApp?',
    descricao: 'O aviso que você mandou às nove da manhã está, ao meio-dia, embaixo de quarenta mensagens de bom-dia e figurinha. Ninguém leu, ninguém confirmou, e a tarefa não foi feita — mas todo mundo "viu no grupo".\n\nNo NODRI a tarefa tem dono e prazo, e o recado vai para quem precisa ler. O que está pendente aparece na tela inicial até alguém resolver.',
    destaques: [
      { titulo: 'Tarefa com dono e prazo', desc: 'Pendente, resolvida ou vencida — sem depender de memória' },
      { titulo: 'Recado que chega', desc: 'Para toda a equipe ou para uma pessoa, com histórico' },
      { titulo: 'O que ficou parado acende', desc: 'A tela inicial cobra o que ninguém resolveu' },
    ],
    arte: { rotulo: 'Pendências abertas', valor: '27 tarefas', linhas: [['Vencidas', '4'], ['Do portal', '3 esperando'], ['Resolvidas no mês', '61']] },
  },

  // ── RESULTADO ─────────────────────────────────────────────────────────────
  {
    categoria: 'Resultado', nome: 'Metas do Salão e da Equipe', slug: 'metas-do-salao-e-da-equipe',
    etiqueta: 'Metas', cor: RES,
    titulo: 'Quanto o seu salão precisa faturar hoje?',
    descricao: 'A meta do mês, sozinha, não ajuda ninguém: no dia 20 já é tarde para reagir. O que muda o resultado é saber, todo dia, quanto deveria ter entrado até aqui — e quanto falta correr.\n\nO NODRI distribui a meta pelos dias considerando o potencial de cada dia da semana, porque segunda não fatura como sábado. E recalcula sozinho quando um dia fica abaixo.',
    destaques: [
      { titulo: 'Meta do dia, não só do mês', desc: 'Quanto faturar hoje, ajustado ao dia da semana' },
      { titulo: 'Recalcula quando cai', desc: 'Ficou abaixo? Ele redistribui o que falta nos dias restantes' },
      { titulo: 'Meta por profissional', desc: 'Cada uma com a sua, sem você calcular nada' },
    ],
    arte: { rotulo: 'Meta do salão', valor: '92% batida', linhas: [['Meta do mês', 'R$ 140.000'], ['Faturado', 'R$ 128.750'], ['Falta por dia', 'R$ 1.607']] },
  },
  {
    categoria: 'Resultado', nome: 'Relatórios do Salão', slug: 'relatorios-do-salao',
    etiqueta: 'Relatórios', cor: RES,
    titulo: 'Qual é o melhor dia do seu salão?',
    descricao: 'A resposta parece óbvia — sábado — e quase sempre está errada quando se olha o ticket médio em vez do movimento. Sem esse número, promoção e escala são feitas por palpite, e terça vazia custa o mesmo aluguel que sábado cheio.\n\nOs relatórios do NODRI nascem da sua planilha de atendimentos: faturamento por período, ticket médio, clientes novos e recorrentes, frequência de retorno, LTV e desempenho por dia da semana.',
    destaques: [
      { titulo: 'Onde o dinheiro está', desc: 'Faturamento, ticket médio e desempenho por dia da semana' },
      { titulo: 'Quem vale mais', desc: 'LTV por cliente e os maiores do salão' },
      { titulo: 'Exporta e imprime', desc: 'Para levar à reunião, ao contador ou ao sócio' },
    ],
    arte: { rotulo: 'Desempenho por dia', valor: 'quinta lidera', linhas: [['Ticket de quinta', 'R$ 312,40'], ['Ticket de sábado', 'R$ 198,10'], ['Dia mais fraco', 'terça']] },
  },
  {
    categoria: 'Resultado', nome: 'Corridas Internas', slug: 'corridas-internas',
    etiqueta: 'Competição', cor: RES,
    titulo: 'Como motivar a equipe sem premiar sempre a mesma pessoa?',
    descricao: 'Toda campanha de salão trava no mesmo ponto: quem faz química ganha de quem faz unha, e o resto da equipe desiste na primeira semana. A competição vira desmotivação para a maioria.\n\nO NODRI tem onze métricas para escolher, e uma delas resolve exatamente isso: percentual da meta batida. Cada uma corre contra a própria meta, e a manicure disputa de igual para igual com a cabeleireira.',
    destaques: [
      { titulo: 'Onze métricas', desc: 'De faturamento a "quem menos teve ocorrência" no período' },
      { titulo: 'Disputa justa', desc: 'Percentual da meta faz todo mundo competir de igual para igual' },
      { titulo: 'Ranking automático', desc: 'Sai dos atendimentos, sem ninguém somar nada' },
    ],
    arte: { rotulo: 'Corrida do mês', valor: '9 participantes', linhas: [['Líder', 'Juliana — 92%'], ['Métrica', '% da meta batida'], ['Prêmio', 'definido por você']] },
  },
  {
    categoria: 'Resultado', nome: 'Consultoria por IA', slug: 'consultoria-por-ia',
    etiqueta: 'Inteligência artificial', cor: RES,
    titulo: 'E se alguém lesse os seus números por você?',
    descricao: 'Relatório não resolve sozinho. Ele mostra o número e deixa a interpretação para quem, na maior parte das vezes, nunca teve formação em gestão e está entre um atendimento e outro.\n\nA consultoria do NODRI lê os dados do seu próprio salão e responde em português: onde está o problema, o que fazer primeiro e por quê. Não é um chat genérico — é sobre os seus números.',
    destaques: [
      { titulo: 'Sobre o seu salão', desc: 'A análise usa os seus dados, não conselho de internet' },
      { titulo: 'Estratégia para bater a meta', desc: 'Plano por profissional, a partir dos indicadores dela' },
      { titulo: 'Ideias de conteúdo', desc: 'Sugestões de post para o marketing do salão' },
    ],
    arte: { rotulo: 'Consultoria NODRI IA', valor: 'lê o seu salão', linhas: [['Analisa', 'faturamento e equipe'], ['Aponta', 'o gargalo do mês'], ['Sugere', 'o que fazer primeiro']] },
  },

  // ── OPERAÇÃO ──────────────────────────────────────────────────────────────
  {
    categoria: 'Operação', nome: 'Esterilização e Kits', slug: 'esterilizacao-e-kits',
    etiqueta: 'Biossegurança', cor: OPE,
    titulo: 'Onde está o alicate que foi para a esterilização?',
    descricao: 'Some, atrasa, volta trocado — e quando a fiscalização pergunta, não há registro de nada. Além do risco sanitário, é a manicure parada esperando material enquanto a cliente já está na cadeira.\n\nO NODRI controla o fluxo: quem entregou, quando, quando voltou. E o kit pé e mão pedido e não separado acende na tela inicial, para ninguém ficar esperando em silêncio.',
    destaques: [
      { titulo: 'O alicate rastreado', desc: 'Quem entregou, quando saiu e quando voltou' },
      { titulo: 'Kit pedido avisa', desc: 'O pedido parado acende na tela de quem separa' },
      { titulo: 'Registro para a fiscalização', desc: 'O histórico existe quando alguém perguntar' },
    ],
    arte: { rotulo: 'Esterilização', valor: '12 em ciclo', linhas: [['Entregues hoje', '5'], ['Aguardando retirada', '3'], ['Kits a separar', '2']] },
  },
  {
    categoria: 'Operação', nome: 'Enxovais e Estoque', slug: 'enxovais-e-estoque',
    etiqueta: 'Materiais', cor: OPE,
    titulo: 'Quantas toalhas o seu salão perdeu esse ano?',
    descricao: 'Ninguém conta. Elas vão para a lavanderia, voltam menos, e a diferença só aparece quando falta toalha num sábado cheio. O mesmo vale para o produto que vence na prateleira: dinheiro parado que vira lixo.\n\nO NODRI controla o enxoval que saiu e voltou, e mostra os produtos parados com validade vencendo, por marca.',
    destaques: [
      { titulo: 'O que saiu e o que voltou', desc: 'A diferença aparece antes de virar falta' },
      { titulo: 'Produto vencendo', desc: 'O que está parado na prateleira, com validade e marca' },
      { titulo: 'Cadastro com custo', desc: 'Produto, fornecedor e preço para alimentar o financeiro' },
    ],
    arte: { rotulo: 'Enxoval do mês', valor: '18 a menos', linhas: [['Enviadas', '340'], ['Retornadas', '322'], ['Produtos vencendo', '7 itens']] },
  },
  {
    categoria: 'Operação', nome: 'Pontos de Ebulição', slug: 'pontos-de-ebulicao',
    etiqueta: 'Gestão de crise', cor: OPE,
    titulo: 'A cliente não quer pagar. E agora?',
    descricao: 'Na hora do problema ninguém pensa direito. Briga entre profissionais, cliente exaltada na recepção, energia que cai no meio de uma química, sistema fora do ar — é sempre com a recepcionista sozinha, num sábado, sem ninguém para perguntar.\n\nO NODRI traz cerca de sessenta casos com o passo a passo de como resolver cada um. É o manual que separa contorno de escândalo na recepção.',
    destaques: [
      { titulo: 'Sessenta casos escritos', desc: 'Do cliente que não paga à queda de energia' },
      { titulo: 'Passo a passo', desc: 'O que fazer, na ordem, sem improvisar no susto' },
      { titulo: 'Você edita', desc: 'Adapte cada caso ao jeito do seu salão' },
    ],
    arte: { rotulo: 'Manual de crise', valor: '60 casos', linhas: [['Cliente que não paga', 'passo a passo'], ['Conflito na equipe', 'passo a passo'], ['Queda de energia', 'passo a passo']] },
  },
]
