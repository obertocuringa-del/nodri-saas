// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE FUNCIONALIDADES — segunda parte
//
// A primeira leva cobriu os assuntos que mais vendem. Esta completa o resto do
// que o sistema tem, item por item, conferido contra o inventário: financeiro
// miúdo, papelada do salão, os relatórios que nascem da planilha, conformidade
// e o que sustenta o sistema por baixo.
//
// Arquivo separado do primeiro de propósito: um catálogo de mais de cinquenta
// entradas num arquivo só vira aquilo que ninguém abre. As regras de escrita
// são as mesmas — ver o cabeçalho de funcionalidadesCatalogo.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { FuncCatalogo } from './funcionalidadesCatalogo'

const FIN = '#0f766e'
const EQU = '#5b4fcf'
const CLI = '#be123c'
const ROT = '#b45309'
const RES = '#0d6efd'
const OPE = '#475569'

export const FUNCIONALIDADES_CATALOGO_2: FuncCatalogo[] = [

  // ── FINANCEIRO ────────────────────────────────────────────────────────────
  {
    categoria: 'Financeiro', nome: 'Custo de Produto', slug: 'custo-de-produto',
    etiqueta: 'Custo de produto', cor: FIN,
    titulo: 'Quanto de produto vai embora em cada aplicação?',
    descricao: 'A embalagem custa um valor, mas o que entra no serviço é uma porção — e é essa porção que precisa estar no preço. Sem essa conta, o salão cobra pelo serviço e paga o produto do próprio bolso, centavo a centavo, todo dia.\n\nO NODRI cadastra o produto com o custo da embalagem e calcula quanto sai em cada uso. Esse número alimenta o preço do serviço automaticamente.',
    destaques: [
      { titulo: 'Porção, não embalagem', desc: 'O custo do que realmente foi usado no atendimento' },
      { titulo: 'Alimenta o preço', desc: 'Entra sozinho na conta do serviço, sem redigitar' },
      { titulo: 'Catálogo com fornecedor', desc: 'Marca, custo e onde comprar, num lugar só' },
    ],
    arte: { rotulo: 'Custo por aplicação', valor: 'R$ 12,80', linhas: [['Embalagem', 'R$ 128,00'], ['Rende', '10 aplicações'], ['No preço do serviço', 'automático']] },
  },
  {
    categoria: 'Financeiro', nome: 'Faturamento por m²', slug: 'faturamento-por-m2',
    etiqueta: 'Espaço', cor: FIN,
    titulo: 'Seu ponto é grande demais para o seu movimento?',
    descricao: 'Aluguel é quase sempre a segunda maior despesa do salão, e é paga por metro quadrado — inclusive pelos metros que não geram nada. Aquela sala que quase não é usada custa o mesmo por mês que a cadeira mais movimentada.\n\nO NODRI mostra quanto cada metro quadrado gera de receita. É o número que diz se compensa manter o espaço, subalugar ou mudar de ponto.',
    destaques: [
      { titulo: 'Receita por metro', desc: 'Quanto cada metro quadrado do salão devolve por mês' },
      { titulo: 'A sala parada aparece', desc: 'O espaço que não gera receita para de passar despercebido' },
      { titulo: 'Argumento para negociar', desc: 'Número na mão na hora de renovar o aluguel' },
    ],
    arte: { rotulo: 'Faturamento por metro quadrado', valor: 'R$ 1.145/m²', linhas: [['Área total', '112 m²'], ['Área ociosa', '18 m²'], ['Custo do ocioso', 'R$ 640/mês']] },
  },
  {
    categoria: 'Financeiro', nome: 'Referência de Mercado', slug: 'referencia-de-mercado',
    etiqueta: 'Comparação', cor: FIN,
    titulo: 'Você gasta demais com quê?',
    descricao: 'Olhar a despesa sozinha não responde nada: R$ 4.000 de aluguel é caro ou barato? Depende do faturamento — e é essa comparação que ninguém faz, porque exige saber quanto o mercado costuma gastar em cada linha.\n\nOs gráficos do NODRI comparam cada despesa sua com a referência do setor: aluguel 10%, salários 40%, pró-labore 10%, marketing 5%. O que está fora da curva salta na tela.',
    destaques: [
      { titulo: 'Cada gasto contra a referência', desc: 'Dez linhas de despesa comparadas com o padrão do setor' },
      { titulo: 'O exagero salta', desc: 'Você vê onde está gastando acima do que o mercado gasta' },
      { titulo: 'Sem consultoria', desc: 'A comparação que um consultor cobraria para fazer' },
    ],
    arte: { rotulo: 'Despesas contra a referência', valor: '2 fora da curva', linhas: [['Aluguel', '14% — ref. 10%'], ['Salários', '38% — ref. 40%'], ['Marketing', '9% — ref. 5%']] },
  },
  {
    categoria: 'Financeiro', nome: 'Conferência de Caixas', slug: 'conferencia-de-caixas',
    etiqueta: 'Caixa', cor: FIN,
    titulo: 'O caixa fechou certo ontem?',
    descricao: 'Quando a conferência é feita de cabeça, a diferença só aparece dias depois — e aí ninguém lembra o que houve naquele dia. O assunto vira desconfiança, que é o pior clima possível numa equipe pequena.\n\nNo NODRI a conferência é por dia, com responsável e resultado. Deu diferença, abre o campo do que aconteceu e vira pendência no topo — que só sai depois de alguém escrever a resolução.',
    destaques: [
      { titulo: 'Dia a dia, com responsável', desc: 'Quem conferiu, quando e qual foi o resultado' },
      { titulo: 'Diferença vira pendência', desc: 'Não some da tela enquanto não for explicada por escrito' },
      { titulo: 'Histórico que protege', desc: 'A conversa deixa de ser memória contra memória' },
    ],
    arte: { rotulo: 'Conferência do mês', valor: '28 de 30 dias', linhas: [['Conferidos', '28'], ['Com diferença', '2'], ['Pendentes', '1']] },
  },
  {
    categoria: 'Financeiro', nome: 'Empréstimo ao Profissional', slug: 'emprestimo-ao-profissional',
    etiqueta: 'Adiantamento', cor: FIN,
    titulo: 'Quanto o salão já emprestou e não voltou?',
    descricao: 'É o buraco mais silencioso do caixa de salão. O pedido vem no corredor, o dono ajuda, e o desconto fica combinado de boca — até o mês em que ninguém lembra quanto era, ou quantas parcelas faltam.\n\nNo NODRI a profissional pede pelo portal, com valor e motivo. O Financeiro vê o comportamento dela nos últimos dois meses antes de decidir, aceita e parcela. A partir daí a parcela cai sozinha na calculadora, no mês certo.',
    destaques: [
      { titulo: 'O pedido fica registrado', desc: 'Valor, motivo, data e quem aprovou' },
      { titulo: 'Decisão com histórico', desc: 'O comportamento dela aparece antes de você responder' },
      { titulo: 'Desconto automático', desc: 'A parcela entra na calculadora sem ninguém lembrar' },
    ],
    arte: { rotulo: 'Empréstimos em curso', valor: 'R$ 3.400', linhas: [['Profissionais', '3'], ['Parcelas restantes', '7'], ['A descontar no mês', 'R$ 820']] },
  },
  {
    categoria: 'Financeiro', nome: 'Guias do MEI em Lote', slug: 'guias-do-mei-em-lote',
    etiqueta: 'MEI e PJ', cor: FIN,
    titulo: 'Quantas horas por mês você gasta emitindo guia de MEI?',
    descricao: 'Salão com equipe PJ vive isso: entrar no portal, digitar CNPJ, escolher o mês, baixar, renomear, repetir — para cada profissional, todo mês. É trabalho de duas horas que ninguém quer fazer, e por isso atrasa.\n\nO NODRI monta a fila de quem precisa de guia e uma extensão do navegador percorre o portal do governo com a sua sessão. As guias saem em lote, já renomeadas.',
    destaques: [
      { titulo: 'Em lote, não uma a uma', desc: 'A fila inteira de CNPJs num processo só' },
      { titulo: 'Já renomeadas', desc: 'Cada arquivo sai identificado, pronto para enviar' },
      { titulo: 'Com a sua sessão', desc: 'O NODRI não guarda senha do portal do governo' },
    ],
    arte: { rotulo: 'Guias emitidas no mês', valor: '14 de uma vez', linhas: [['Profissionais PJ', '14'], ['Tempo antes', '~2 horas'], ['Arquivos', 'já renomeados']] },
  },

  // ── EQUIPE ────────────────────────────────────────────────────────────────
  {
    categoria: 'Equipe', nome: 'POPs por Função', slug: 'pops-por-funcao',
    etiqueta: 'Padrão de execução', cor: EQU,
    titulo: 'Duas profissionais fazem o mesmo serviço do mesmo jeito?',
    descricao: 'Quase nunca. E a cliente percebe: ela volta esperando o que teve da última vez e recebe outra coisa. Isso não é falta de talento, é falta de padrão escrito — cada uma aprendeu de um jeito e ninguém nunca definiu qual é o do salão.\n\nO NODRI traz POPs por função: recepção, cabeleireiro, manicure, dosagem. Cada passo escrito, editável, e ligado à profissional que precisa segui-lo.',
    destaques: [
      { titulo: 'O jeito do salão, escrito', desc: 'Procedimento por função, do seu jeito, não do genérico' },
      { titulo: 'Ligado a quem executa', desc: 'A profissional vê o POP dela no próprio portal' },
      { titulo: 'Treinar fica rápido', desc: 'Quem entra aprende lendo, não olhando por cima do ombro' },
    ],
    arte: { rotulo: 'Procedimentos escritos', valor: '4 funções', linhas: [['Recepção', 'padrão definido'], ['Cabeleireiro', 'padrão definido'], ['Manicure', 'padrão definido']] },
  },
  {
    categoria: 'Equipe', nome: 'Registro de Ocorrências', slug: 'registro-de-ocorrencias',
    etiqueta: 'Ocorrências', cor: EQU,
    titulo: 'O que acontece fica registrado ou vira fofoca?',
    descricao: 'Sem registro, o problema circula pelo corredor e chega ao dono deformado. E o que foi bom — a profissional que ficou até tarde, a que salvou um atendimento — também some, porque ninguém anota o que dá certo.\n\nO NODRI registra ocorrência positiva e negativa, com data e autor. Dá para receber registro por link, inclusive de quem não tem login.',
    destaques: [
      { titulo: 'O bom também é registrado', desc: 'Reconhecimento com data, não só o que deu errado' },
      { titulo: 'Chega por link', desc: 'Quem viu registra, mesmo sem acesso ao sistema' },
      { titulo: 'Vira histórico', desc: 'A conversa de desempenho passa a ter base' },
    ],
    arte: { rotulo: 'Ocorrências no mês', valor: '23 registros', linhas: [['Positivas', '15'], ['A tratar', '8'], ['Com link externo', '6']] },
  },
  {
    categoria: 'Equipe', nome: 'Arena e Sala de Jogos', slug: 'arena-e-sala-de-jogos',
    etiqueta: 'Engajamento', cor: EQU,
    titulo: 'Como fazer a equipe olhar o próprio desempenho sem cobrança?',
    descricao: 'Ninguém abre relatório por vontade própria. Meta vira assunto chato, e quando o dono cobra, a conversa começa errada — parece fiscalização, não parceria.\n\nA Arena do NODRI transforma isso em jogo: cada profissional tem saldo próprio, pode desafiar uma colega para um duelo e apostar. É a mesma informação de desempenho, mas com um motivo para ela ser olhada todo dia.',
    destaques: [
      { titulo: 'Duelo entre profissionais', desc: 'Uma desafia a outra, cada uma aposta o próprio saldo' },
      { titulo: 'Roda da sorte e prêmios', desc: 'Com limite de jogadas por dia, para não virar bagunça' },
      { titulo: 'Ela olha sem ser cobrada', desc: 'O desempenho vira assunto de interesse dela' },
    ],
    arte: { rotulo: 'Arena NODRI', valor: '9 jogando', linhas: [['Duelos no mês', '34'], ['Saldo em disputa', 'por profissional'], ['Limite diário', 'definido por você']] },
  },
  {
    categoria: 'Equipe', nome: 'Planejamento Estratégico', slug: 'planejamento-estrategico',
    etiqueta: 'Planejamento', cor: EQU,
    titulo: 'Onde o seu salão quer chegar esse ano?',
    descricao: 'Quase todo dono tem a resposta na cabeça e nenhum lugar onde ela viva. Sem estar escrito, o objetivo do ano some na correria de fevereiro e ninguém cobra ninguém — nem o dono cobra a si mesmo.\n\nNo NODRI a estrutura do planejamento é fixa e editável, e o preenchimento é por mês, com prazo em cada item. O que foi decidido em janeiro continua visível em agosto.',
    destaques: [
      { titulo: 'Objetivo com prazo', desc: 'Cada item com responsável e data, não só intenção' },
      { titulo: 'Estrutura sua', desc: 'Os cards e itens são editáveis, e valem para todos os meses' },
      { titulo: 'Mês a mês', desc: 'O preenchimento muda, a estrutura fica' },
    ],
    arte: { rotulo: 'Planejamento do ano', valor: '6 objetivos', linhas: [['Com prazo definido', '6'], ['Concluídos', '2'], ['Em andamento', '3']] },
  },

  // ── CLIENTES ──────────────────────────────────────────────────────────────
  {
    categoria: 'Clientes', nome: 'Lista de Espera', slug: 'lista-de-espera',
    etiqueta: 'Encaixe', cor: CLI,
    titulo: 'Quantas clientes ligaram e não conseguiram horário?',
    descricao: 'Essa é a venda que se perde em silêncio. A cliente liga, não tem vaga, agradece e desliga — e ninguém anota. Quando abre um buraco na agenda por um cancelamento, não há a quem oferecer.\n\nO NODRI guarda a fila de espera com nome, WhatsApp, serviço desejado e data. E colore por tempo de espera, para você ver quem está aguardando há tempo demais.',
    destaques: [
      { titulo: 'A vaga que abre tem dono', desc: 'Cancelou? A fila mostra quem chamar primeiro' },
      { titulo: 'Cor por urgência', desc: 'Quem está esperando há mais tempo salta na tela' },
      { titulo: 'Com o serviço que ela quer', desc: 'Você chama a pessoa certa para o horário certo' },
    ],
    arte: { rotulo: 'Fila de espera', valor: '11 aguardando', linhas: [['Há mais de 7 dias', '3'], ['Para esta semana', '5'], ['Serviço mais pedido', 'Mechas']] },
  },
  {
    categoria: 'Clientes', nome: 'Ações Comerciais', slug: 'acoes-comerciais',
    etiqueta: 'Campanhas', cor: CLI,
    titulo: 'A sua equipe sabe qual promoção está no ar?',
    descricao: 'A promoção nasce na cabeça do dono, é combinada numa reunião e morre ali. Quem atende não lembra o valor, não tem o material para mandar, e a cliente vai embora sem ouvir sobre ela.\n\nNo NODRI a campanha tem valor cheio, valor promocional, descrição e arquivo. Ela aparece para a profissional na ficha dela e na vitrine do salão, com botão de compartilhar pronto.',
    destaques: [
      { titulo: 'Chega em quem atende', desc: 'A campanha aparece para a profissional, não só para você' },
      { titulo: 'Material pronto', desc: 'Texto e arquivo para compartilhar com um toque' },
      { titulo: 'Também na vitrine', desc: 'A cliente vê a promoção sem precisar perguntar' },
    ],
    arte: { rotulo: 'Campanhas ativas', valor: '4 no ar', linhas: [['Compartilhamentos', '96'], ['De R$ 320', 'por R$ 249'], ['Aparece', 'equipe e vitrine']] },
  },
  {
    categoria: 'Clientes', nome: 'Aniversariantes e Postagem', slug: 'aniversariantes-e-postagem',
    etiqueta: 'Relacionamento', cor: CLI,
    titulo: 'Você lembrou do aniversário da sua equipe esse mês?',
    descricao: 'É a data que o dono esquece e o funcionário nunca esquece. E quando lembra, falta o que postar: monta no celular, na correria, e sai uma arte diferente da anterior.\n\nO NODRI lista os aniversários do mês, manda a mensagem pelo WhatsApp e gera a arte pronta: escolhe a pessoa, sobe a foto, enquadra, escolhe entre cinco temas e baixa dois arquivos — um para Stories e um para o feed.',
    destaques: [
      { titulo: 'A data chega até você', desc: 'Os aniversários do mês na tela inicial' },
      { titulo: 'Arte pronta em minutos', desc: 'Com a foto dela, a sua logo e cinco temas de cor' },
      { titulo: 'Dois formatos', desc: 'Stories e feed, cada um no seu tamanho, sem cortar' },
    ],
    arte: { rotulo: 'Aniversariantes do mês', valor: '3 pessoas', linhas: [['Arte gerada', 'Stories e feed'], ['Temas de cor', '5'], ['Mensagem', 'escrita pela IA']] },
  },
  {
    categoria: 'Clientes', nome: 'Calendário do Salão', slug: 'calendario-do-salao',
    etiqueta: 'Compromissos', cor: CLI,
    titulo: 'O que o salão tem marcado para esta semana?',
    descricao: 'Visita de representante, entrega de material, reunião de equipe, manutenção — cada compromisso mora num lugar: um no papel, outro no celular de alguém, outro na memória. E aí dois caem no mesmo dia.\n\nO calendário do NODRI guarda tudo com categoria, cor e responsável, e avisa o que vence nos próximos dias na tela inicial.',
    destaques: [
      { titulo: 'Avisa antes', desc: 'O que vence em até dois dias aparece ao abrir o sistema' },
      { titulo: 'Cor por categoria', desc: 'Bate o olho e sabe do que se trata' },
      { titulo: 'Copia para o WhatsApp', desc: 'Manda a agenda da semana para a equipe em um toque' },
    ],
    arte: { rotulo: 'Próximos compromissos', valor: '5 esta semana', linhas: [['Vencendo em 2 dias', '2'], ['Com responsável', 'todos'], ['Imprime', 'A4 deitado']] },
  },
  {
    categoria: 'Clientes', nome: 'Lojistas Parceiros', slug: 'lojistas-parceiros',
    etiqueta: 'Parcerias', cor: CLI,
    titulo: 'Quantas lojas ao redor do seu salão mandam cliente para você?',
    descricao: 'A parceria com o comércio vizinho é a captação mais barata que existe — e quase sempre vive numa lista de contatos sem controle. Ninguém sabe quem já foi procurado, quem topou e quem nunca mandou ninguém.\n\nO NODRI tem um cadastro próprio de lojistas, com link de autocadastro, segmento, grupo de WhatsApp e relatório de quem participa de verdade.',
    destaques: [
      { titulo: 'A loja se cadastra sozinha', desc: 'Você manda o link e ela preenche' },
      { titulo: 'Quem participa de verdade', desc: 'Relatório mostra quem entrou no grupo e quem só cadastrou' },
      { titulo: 'Por segmento', desc: 'Filtra quem tem público parecido com o seu' },
    ],
    arte: { rotulo: 'Rede de parceiros', valor: '38 lojas', linhas: [['No grupo', '29'], ['Cadastro no mês', '6'], ['Segmento maior', 'Moda']] },
  },

  // ── ROTINA ────────────────────────────────────────────────────────────────
  {
    categoria: 'Rotina', nome: 'Salão Administrativo', slug: 'salao-administrativo',
    etiqueta: 'Papelada', cor: ROT,
    titulo: 'Onde fica a senha do wi-fi? E a ata da última reunião?',
    descricao: 'Num salão, essas respostas moram em lugares diferentes e sempre com a mesma pessoa. Quando ela falta, tudo trava — e quando ela sai, some.\n\nO Salão Administrativo do NODRI é o arquivo do salão em vinte abas: senhas, telefones importantes, atas, escalas, tabelas de preço das marcas, correios, etiquetas, cadastro de produto e mais.',
    destaques: [
      { titulo: 'Vinte abas de papelada', desc: 'O que hoje está em caderno, parede e cabeça' },
      { titulo: 'Some da cabeça de um só', desc: 'Quem precisa acessa, sem depender de uma pessoa' },
      { titulo: 'Tudo editável', desc: 'Cada quadro é seu, com as colunas que você quiser' },
    ],
    arte: { rotulo: 'Arquivo do salão', valor: '20 quadros', linhas: [['Senhas e telefones', 'organizados'], ['Atas e escalas', 'com data'], ['Tabelas das marcas', 'anexadas']] },
  },
  {
    categoria: 'Rotina', nome: 'Listas de Rodízio', slug: 'listas-de-rodizio',
    etiqueta: 'Rodízio', cor: ROT,
    titulo: 'A distribuição de clientes é justa no seu salão?',
    descricao: 'Quando a recepção decide de cabeça quem atende o próximo, sempre sobra a sensação de favorecimento — e ela azeda a equipe mais rápido que qualquer outra coisa. Ninguém reclama na hora, mas todo mundo conta.\n\nO NODRI tem listas de rodízio por serviço: realinhamento, corte, mechas, pigmentação. A contagem é visível para todos, e a ordem deixa de ser discussão.',
    destaques: [
      { titulo: 'A ordem à vista de todos', desc: 'A contagem é pública, não decisão de bastidor' },
      { titulo: 'Uma lista por serviço', desc: 'Quem faz mechas não disputa a fila de corte' },
      { titulo: 'Fim do favorecimento', desc: 'A conversa deixa de ser sobre quem indicou quem' },
    ],
    arte: { rotulo: 'Rodízio de atendimento', valor: '4 listas', linhas: [['Corte', 'próxima: Camila'], ['Mechas', 'próxima: Juliana'], ['Contagem', 'visível a todos']] },
  },
  {
    categoria: 'Rotina', nome: 'Dosagem e Pacotes', slug: 'dosagem-e-pacotes',
    etiqueta: 'Química e pacotes', cor: ROT,
    titulo: 'Cada química sai com a mesma dosagem?',
    descricao: 'Se a mistura muda de profissional para profissional, o resultado muda junto — e o custo também. É onde o produto some sem explicação: um pouco a mais aqui, um pouco a mais ali, todo dia.\n\nO NODRI guarda a dosagem de cada tratamento e a tabela de pacotes com valor por sessão, com PDF pronto para mandar à cliente.',
    destaques: [
      { titulo: 'Dosagem escrita', desc: 'A mesma mistura, independentemente de quem faz' },
      { titulo: 'Produto para de sumir', desc: 'O consumo por procedimento fica previsível' },
      { titulo: 'Pacote em PDF', desc: 'Tabela de sessões pronta para enviar' },
    ],
    arte: { rotulo: 'Tratamentos padronizados', valor: '16 fórmulas', linhas: [['Dosagem por serviço', 'definida'], ['Pacotes', 'com valor por sessão'], ['PDF', 'pronto para enviar']] },
  },

  // ── RESULTADO ─────────────────────────────────────────────────────────────
  {
    categoria: 'Resultado', nome: 'Importação dos Atendimentos', slug: 'importacao-dos-atendimentos',
    etiqueta: 'Seus dados', cor: RES,
    titulo: 'E os anos de histórico que você já tem?',
    descricao: 'Trocar de sistema costuma significar começar do zero — e é por isso que muito dono desiste antes de tentar. O histórico de atendimento é o ativo mais valioso do salão: é dele que sai quem sumiu, quem gasta mais e o que vende junto.\n\nO NODRI importa a sua planilha de atendimentos e todos os relatórios nascem dela. Você não recomeça: continua.',
    destaques: [
      { titulo: 'Seu histórico entra', desc: 'A base que você já tem vira relatório no primeiro dia' },
      { titulo: 'Por período', desc: 'Importa o intervalo que quiser, quantas vezes quiser' },
      { titulo: 'Conferência automática', desc: 'Avisa serviço sem cadastro e profissional sem habilitação' },
    ],
    arte: { rotulo: 'Importação de dados', valor: 'anos de base', linhas: [['Formato', 'planilha Excel'], ['Vira', 'todos os relatórios'], ['Confere', 'serviços e equipe']] },
  },
  {
    categoria: 'Resultado', nome: 'Melhor Dia do Salão', slug: 'melhor-dia-do-salao',
    etiqueta: 'Dia da semana', cor: RES,
    titulo: 'Sábado é mesmo o seu melhor dia?',
    descricao: 'Quase todo dono responde que sim, e quase sempre está olhando movimento em vez de ticket. É comum o sábado ter mais gente e a quinta ter mais dinheiro — e essa diferença muda onde colocar promoção, quem escalar e quando fechar.\n\nO NODRI mostra faturamento e ticket médio por dia da semana, com os melhores e os mais fracos.',
    destaques: [
      { titulo: 'Movimento não é faturamento', desc: 'O dia cheio nem sempre é o dia que rende' },
      { titulo: 'Onde colocar promoção', desc: 'O dia fraco aparece, e ele custa o mesmo aluguel' },
      { titulo: 'Escala com base', desc: 'Quem escalar em cada dia deixa de ser palpite' },
    ],
    arte: { rotulo: 'Desempenho por dia', valor: 'quinta lidera', linhas: [['Ticket de quinta', 'R$ 312,40'], ['Ticket de sábado', 'R$ 198,10'], ['Dia mais fraco', 'terça']] },
  },
  {
    categoria: 'Resultado', nome: 'Clientes VIP e Novos', slug: 'clientes-vip-e-novos',
    etiqueta: 'Sua base', cor: RES,
    titulo: 'Quem são as dez clientes que mais deixam dinheiro no seu salão?',
    descricao: 'Se a resposta é um palpite, o salão está tratando todo mundo igual — e quem gasta cinco vezes mais recebe a mesma atenção de quem veio uma vez. Perder uma dessas dói como perder dez das outras.\n\nO NODRI separa a base por comportamento: VIP com dez visitas ou mais, alto ticket, regulares e novas. E mostra o LTV de cada uma, que é quanto ela já deixou no salão.',
    destaques: [
      { titulo: 'As suas VIPs, com nome', desc: 'Quem tem dez visitas ou mais e quem gasta acima da média' },
      { titulo: 'LTV por cliente', desc: 'Quanto cada uma já deixou no salão desde a primeira visita' },
      { titulo: 'Clientes novas separadas', desc: 'Quem chegou este mês, para encantar na primeira visita' },
    ],
    arte: { rotulo: 'Sua base de clientes', valor: '522 ativas', linhas: [['VIP (10+ visitas)', '48'], ['Novas no mês', '63'], ['Maior LTV', 'R$ 14.280']] },
  },
  {
    categoria: 'Resultado', nome: 'Oportunidades de Cross-sell', slug: 'oportunidades-de-cross-sell',
    etiqueta: 'Cross-sell', cor: RES,
    titulo: 'Quem já é sua cliente e poderia comprar mais?',
    descricao: 'A cliente que só faz unha há dois anos provavelmente faz cabelo em outro lugar. Ela já confia no salão, já está na cadeira, e ninguém nunca ofereceu — porque ninguém sabe quem são essas pessoas.\n\nO NODRI cruza o que cada cliente consome e aponta quem tem perfil para outro serviço, além dos combos que mais saem juntos no seu salão.',
    destaques: [
      { titulo: 'A lista de quem pode comprar mais', desc: 'Cliente com perfil para um serviço que ela não faz aí' },
      { titulo: 'Combos que vendem', desc: 'Quais serviços saem juntos, por profissional' },
      { titulo: 'Venda sem gastar', desc: 'Faturar mais com quem já está dentro do salão' },
    ],
    arte: { rotulo: 'Oportunidades identificadas', valor: '94 clientes', linhas: [['Só um serviço', '61'], ['Combo mais comum', 'Corte + Escova'], ['Potencial no mês', 'R$ 18.400']] },
  },
  {
    categoria: 'Resultado', nome: 'Frequência de Retorno', slug: 'frequencia-de-retorno',
    etiqueta: 'Retorno', cor: RES,
    titulo: 'De quanto em quanto tempo a sua cliente volta?',
    descricao: 'Sem esse número, não existe hora certa de chamar: o salão manda mensagem cedo demais e incomoda, ou tarde demais e ela já foi. E o cliente que veio uma vez só nunca é notado.\n\nO NODRI calcula o intervalo médio de retorno por cliente e por serviço, e separa quem veio apenas uma vez.',
    destaques: [
      { titulo: 'A hora certa de chamar', desc: 'O intervalo em que ela costuma voltar, por serviço' },
      { titulo: 'Quem veio uma vez só', desc: 'A lista de quem experimentou e não voltou' },
      { titulo: 'Ciclo por serviço', desc: 'Cada procedimento tem o seu tempo de retorno' },
    ],
    arte: { rotulo: 'Intervalo de retorno', valor: '34 dias', linhas: [['Corte', 'a cada 28 dias'], ['Mechas', 'a cada 62 dias'], ['Vieram só 1 vez', '87 clientes']] },
  },
  {
    categoria: 'Resultado', nome: 'Redistribuição de Metas', slug: 'redistribuicao-de-metas',
    etiqueta: 'Metas justas', cor: RES,
    titulo: 'A meta continua a mesma quando alguém entra de férias?',
    descricao: 'Se continua, ela vira ficção: a equipe sabe que não vai bater e para de tentar na primeira semana. Se você simplesmente baixa a meta do salão, o mês fecha abaixo do que precisava fechar.\n\nO NODRI redistribui: quem está acima absorve parte da meta de quem está impedido, e o total do salão não muda. A conta fecha sem punir quem faltou nem afrouxar o resultado.',
    destaques: [
      { titulo: 'Doadores e receptores', desc: 'Quem está sobrando absorve a meta de quem está impedido' },
      { titulo: 'O total não muda', desc: 'O salão continua perseguindo o mesmo número' },
      { titulo: 'Super meta', desc: 'Um degrau acima para campanha e premiação' },
    ],
    arte: { rotulo: 'Metas ajustadas', valor: '9 profissionais', linhas: [['Meta original', 'R$ 140.000'], ['Redistribuído', 'R$ 12.400'], ['Total do salão', 'inalterado']] },
  },
  {
    categoria: 'Resultado', nome: 'Comparativo Anual', slug: 'comparativo-anual',
    etiqueta: 'Histórico', cor: RES,
    titulo: 'Este mês foi melhor que o mesmo mês do ano passado?',
    descricao: 'Comparar com o mês anterior engana: dezembro sempre ganha de novembro, e fevereiro sempre parece um desastre. A comparação que diz a verdade é com o mesmo mês do ano anterior — e quase ninguém tem esse dado à mão.\n\nO NODRI mostra o ano inteiro mês a mês contra o anterior, com média e faixa de variação.',
    destaques: [
      { titulo: 'Mesmo mês, outro ano', desc: 'A única comparação que não é enganada pela sazonalidade' },
      { titulo: 'O ano inteiro numa tela', desc: 'Onde cresceu, onde caiu e em quanto' },
      { titulo: 'Acumulado', desc: 'Como o ano está indo contra o anterior, somando tudo' },
    ],
    arte: { rotulo: 'Contra o ano passado', valor: '+18%', linhas: [['Melhor mês', 'dezembro'], ['Mês mais fraco', 'fevereiro'], ['Acumulado', '+R$ 214 mil']] },
  },

  // ── OPERAÇÃO E SISTEMA ────────────────────────────────────────────────────
  {
    categoria: 'Operação', nome: 'Produtos Vencidos', slug: 'produtos-vencidos',
    etiqueta: 'Estoque', cor: OPE,
    titulo: 'Quanto dinheiro está vencendo na sua prateleira?',
    descricao: 'Tinta e produto parados são dinheiro que já saiu do caixa e ainda pode virar lixo. Ninguém percebe porque não há lista: percebe-se na hora de usar, quando já venceu.\n\nO NODRI mostra o que está parado com validade próxima, por marca e por tipo — em tempo de usar, promover ou trocar com o fornecedor.',
    destaques: [
      { titulo: 'Vence antes de virar perda', desc: 'O aviso chega enquanto ainda dá para usar' },
      { titulo: 'Por marca', desc: 'Que é como a dosadora procura de verdade' },
      { titulo: 'Tinta e produto juntos', desc: 'Uma lista só, sem decidir onde lançar antes de lançar' },
    ],
    arte: { rotulo: 'Vencendo em 60 dias', valor: '7 itens', linhas: [['Valor parado', 'R$ 1.240'], ['Marca com mais', 'em estoque'], ['Já vencidos', '2']] },
  },
  {
    categoria: 'Operação', nome: 'Check Procon', slug: 'check-procon',
    etiqueta: 'Conformidade', cor: OPE,
    titulo: 'Seu salão passaria numa fiscalização hoje?',
    descricao: 'Multa de Procon em salão quase nunca vem de coisa grave: vem de preço não exposto, informação obrigatória ausente, detalhe que ninguém sabia que era exigido. E chega sem aviso.\n\nO NODRI traz o checklist de conformidade com o código de defesa do consumidor, item por item, para você conferir antes de alguém conferir por você.',
    destaques: [
      { titulo: 'Item por item', desc: 'O que a lei exige que esteja exposto e informado' },
      { titulo: 'Antes da visita', desc: 'Você confere no seu tempo, não no do fiscal' },
      { titulo: 'Fica registrado', desc: 'O que já foi ajustado e o que falta' },
    ],
    arte: { rotulo: 'Conformidade', valor: '18 de 22', linhas: [['Em conformidade', '18'], ['A ajustar', '4'], ['Risco de multa', 'identificado']] },
  },
  {
    categoria: 'Operação', nome: 'Usuários e Permissões', slug: 'usuarios-e-permissoes',
    etiqueta: 'Acessos', cor: OPE,
    titulo: 'A recepcionista precisa ver quanto cada profissional ganha?',
    descricao: 'Quase sempre a resposta é não — mas quando existe uma senha só, todo mundo vê tudo. E aí o dono evita usar o sistema na frente da equipe, o que anula metade da utilidade dele.\n\nNo NODRI cada pessoa tem o próprio login, com liberação por página. E existe o Modo Caixa: quem está nele executa e acrescenta, mas não apaga nada.',
    destaques: [
      { titulo: 'Login por pessoa', desc: 'Cada uma com o seu, com liberação por tela' },
      { titulo: 'Modo Caixa', desc: 'Lança e acrescenta, sem poder apagar registro' },
      { titulo: 'Copia a configuração', desc: 'Contratou outra recepcionista? Duplica o perfil' },
    ],
    arte: { rotulo: 'Acessos do salão', valor: '6 usuários', linhas: [['Modo Caixa', '2 pessoas'], ['Acesso total', 'só o dono'], ['Por página', 'liberação fina']] },
  },
  {
    categoria: 'Operação', nome: 'Log de Auditoria', slug: 'log-de-auditoria',
    etiqueta: 'Rastreabilidade', cor: OPE,
    titulo: 'Quem apagou aquele lançamento?',
    descricao: 'Sem registro, a resposta é sempre "não fui eu" — e o assunto morre com todo mundo desconfiado. Em salão, onde a equipe é pequena e convive o dia inteiro, essa dúvida estraga mais que o erro em si.\n\nO NODRI registra quem alterou o quê e quando. O log é visível só para o dono.',
    destaques: [
      { titulo: 'Quem, o quê e quando', desc: 'Cada alteração com autor e horário' },
      { titulo: 'Só o dono vê', desc: 'A informação existe sem virar vigilância pública' },
      { titulo: 'Encerra a discussão', desc: 'A dúvida deixa de circular pelo corredor' },
    ],
    arte: { rotulo: 'Registro de alterações', valor: 'tudo rastreado', linhas: [['Por usuário', 'identificado'], ['Com data e hora', 'sempre'], ['Visível para', 'o dono']] },
  },
  {
    categoria: 'Operação', nome: 'Currículos e Vagas', slug: 'curriculos-e-vagas',
    etiqueta: 'Recrutamento', cor: OPE,
    titulo: 'Onde está o currículo daquela manicure que apareceu mês passado?',
    descricao: 'No WhatsApp de alguém, provavelmente. Currículo de salão chega por foto, por indicação, por conversa — e some. Quando abre uma vaga, começa tudo de novo, na pressa.\n\nO NODRI tem um link de Trabalhe Conosco: o candidato preenche, escolhe a vaga e entra num banco com filtros. Quando chega alguém novo, a tela inicial avisa.',
    destaques: [
      { titulo: 'Banco de candidatos', desc: 'Todo mundo que já se ofereceu, com filtro por vaga' },
      { titulo: 'Link para divulgar', desc: 'Publica no Instagram e recebe organizado' },
      { titulo: 'Avisa quando chega', desc: 'Currículo novo acende na tela inicial' },
    ],
    arte: { rotulo: 'Banco de candidatos', valor: '42 currículos', linhas: [['Novos no mês', '7'], ['Por vaga', 'filtrado'], ['Aviso', 'na tela inicial']] },
  },
  {
    categoria: 'Operação', nome: 'Suite NODRI no WhatsApp', slug: 'suite-nodri-no-whatsapp',
    etiqueta: 'WhatsApp em escala', cor: OPE,
    titulo: 'Quantos horários furaram no seu salão semana passada?',
    descricao: 'Horário vago não se recupera. O sábado que furou às dez não volta na segunda: aquela hora simplesmente deixou de existir, e o aluguel foi pago por ela do mesmo jeito. Confirmar um a um pelo WhatsApp é meia manhã da recepção.\n\nA Suite NODRI é um aplicativo que roda no computador do salão e opera o WhatsApp em lote: confirma agendamento, envia pesquisa de satisfação e manda listas, com ou sem arquivo.',
    destaques: [
      { titulo: 'Confirmação em lote', desc: 'A agenda do dia inteira, não uma cliente por vez' },
      { titulo: 'Menos falta', desc: 'Confirmar derruba a taxa de furo, que é perda pura' },
      { titulo: 'Listas e arquivos', desc: 'Envio de material para grupos de clientes' },
    ],
    arte: { rotulo: 'Confirmações do dia', valor: '48 clientes', linhas: [['Tempo antes', 'meia manhã'], ['Agora', 'um processo só'], ['Também envia', 'feedback e listas']] },
  },
  {
    categoria: 'Operação', nome: 'Academia NODRI', slug: 'academia-nodri',
    etiqueta: 'Formação', cor: OPE,
    titulo: 'Quem te ensinou a administrar um salão?',
    descricao: 'Quase ninguém teve essa aula. O dono de salão costuma vir da cadeira: aprendeu o ofício, foi bom nele, abriu o próprio negócio — e descobriu que gerir é outra profissão, que ninguém ensinou.\n\nA Academia NODRI é a biblioteca de gestão dentro do sistema: material sobre preço, equipe, processo e cliente, do jeito que se aplica em salão.',
    destaques: [
      { titulo: 'Gestão aplicada a salão', desc: 'Não teoria de empresa grande, adaptada às pressas' },
      { titulo: 'Dentro do sistema', desc: 'Ao lado da tela onde você aplica o que leu' },
      { titulo: 'Com busca', desc: 'Procura pelo assunto na hora em que a dúvida aparece' },
    ],
    arte: { rotulo: 'Biblioteca de gestão', valor: 'no sistema', linhas: [['Assuntos', 'preço, equipe, cliente'], ['Formato', 'material aplicado'], ['Busca', 'por assunto']] },
  },
  {
    categoria: 'Operação', nome: 'Salão Modelo', slug: 'salao-modelo',
    etiqueta: 'Começar pronto', cor: OPE,
    titulo: 'Você vai receber um sistema vazio para preencher?',
    descricao: 'É o que costuma acontecer, e é onde a maioria desiste: contrata animado, abre e encontra telas em branco esperando meses de digitação. O sistema vira mais uma tarefa em vez de resolver alguma.\n\nO NODRI não. Salão novo nasce com a estrutura pronta, copiada de um salão em operação: menus, check lists, POPs, listas, setores e responsabilidades já escritas.',
    destaques: [
      { titulo: 'Chega montado', desc: 'Setores, check lists e POPs já escritos no primeiro dia' },
      { titulo: 'Você ajusta, não cria', desc: 'Muda o que for diferente no seu salão e segue' },
      { titulo: 'De um salão real', desc: 'A estrutura veio de quem opera, não de um modelo teórico' },
    ],
    arte: { rotulo: 'Seu salão no primeiro dia', valor: 'já montado', linhas: [['Setores', '16 prontos'], ['Check lists', '16 escritos'], ['O que você faz', 'só ajustar']] },
  },
]
