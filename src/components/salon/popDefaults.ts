// Conteúdos padrão dos POPs (editáveis depois pelo usuário)

const REF = `Referências:
Lei nº 8080/90 – Institui o Sistema de Único de Saúde – SUS
Lei nº 9782/99 – Criou a Agência de Vigilância Sanitária – ANVISA
Resolução ANVISA nº 79, de 28/08/2000 - estabelece a definição e classificação de produtos de higiene pessoal, cosmético, perfumes e outros com abrangência neste contexto;
Introdução Normativa DIVISA/SVS/SES-DF nº 06, de 29/12/2014
Lei Distrital nº 5321, de 06/03/2014; e Lei nº6437, de 20/08/1977`

export const CAFE_BLOCOS = [
  {
    titulo: 'INFORMAÇÕES GERAIS', corpo:
      `FORMA DE LANÇAMENTO: PRODUTO
COMO ACHAR O NOME DO PRODUTO? Todos os códigos de lançamento iniciam com o nome CAFÉ.
HIGIENE PARA PREPAROS: Sempre utilizar máscaras descartável e luva descartável, disponível no café.`
  },
  {
    titulo: 'BISCOITO DE QUEIJO', corpo:
      `TIPO DE VENDA: 3 e 6 porções

PREPARO:
• Aquecer o forno por 15 min. a 180°
• Levar os biscoitos na bandeja específica por 20 min a 180°

SERVIR:
• Colocar os biscoitos na cumbuca de madeira grande
• Guardanapo – dobrar em triângulo
• Colocar tudo na bandeja de madeira pequena e servir
• Depois devolver a bandeja grande para o café`
  },
  {
    titulo: 'KOMBUCHAS', corpo:
      `SABORES: Mate com limão / Gengibre com limão / Hibisco com uva e zimbro / Maracujá

SERVIR:
• Guardanapo – dobrar em triângulo
• Copo de água vazia
• Escolher a kombucha
• Levar fechada até o cliente com abridor de garrafa
• Colocar tudo na bandeja de madeira pequena e servir
• Colocar tudo na bandeja de madeira grande e servir
• Depois devolver a bandeja grande para o café`
  },
  {
    titulo: 'VINHOS', corpo:
      `SABORES: Tinto ou Branco

SERVIR:
• Guardanapo – dobrar em triângulo
• Escolher o vinho
• Taça de vinho
• Levar fechado até o cliente
• Colocar tudo na bandeja de madeira grande e servir
• Depois devolver a bandeja grande para o café`
  },
  {
    titulo: 'CERVEJA', corpo:
      `SABORES: Stella Artois

SERVIR:
• Guardanapo – dobrar em triângulo
• Taça de cerveja
• Escolher a cerveja
• Levar fechada até o cliente com abridor de garrafa
• Colocar tudo na bandeja de madeira grande e servir
• Depois devolver a bandeja grande para o café`
  },
  {
    titulo: 'CAFÉ', corpo:
      `TIPO DE VENDA: 3 tipos de café — Ristreto / Supremo / Equilibrado

SERVIR:
• O café será colocado em um copo específico
• Colocar biscoito que estará no recipiente transparente no armário (6 uni.)
• Açúcar / Adoçante / Guardanapo / Mexedor
• O café e os biscoitos serão servidos na bandeja de madeira pequena
• Colocar tudo na bandeja de madeira grande e servir
• Depois devolver a bandeja grande para o café`
  },
  {
    titulo: 'MIX DE CASTANHAS', corpo:
      `TIPO DE VENDA: Frio e Aquecido

FRIO:
• Colocar as castanhas na cumbuca pequena
• Guardanapo – dobrar em triângulo
• As castanhas serão servidas na bandeja de madeira pequena
• Colocar tudo na bandeja de madeira grande e servir
• Depois devolver a bandeja grande para o café

AQUECIDA:
• Aquecer no ramequim de cerâmica no forno (o suficiente para aquecer)
• Colocar as castanhas na cumbuca pequena
• Guardanapo – dobrar em triângulo
• As castanhas serão servidas na bandeja de madeira pequena
• Colocar tudo na bandeja de madeira grande e servir
• Depois devolver a bandeja grande para o café`
  },
]

// POP SALÃO — texto fiel ao arquivo "POP - PROCEDIMENTO DE OPERAÇÃO ROUGE HAIR.docx"
export const POP_SALAO_BLOCOS = [
  {
    titulo: 'PROCEDIMENTO DE OPERAÇÃO PADRÃO – POP: ESTERILIZAÇÃO DE EQUIPAMENTOS DE DESIGNER DE UNHAS', corpo:
      `OBJETIVO: Higienização e esterilização dos equipamentos de manicure e pedicura reutilizáveis (alicates de cutícula, alicates de corte e espátulas);
Áreas Envolvidas Designer de unhas.
Agentes:  Responsável pela dosagem e designer de unhas;

Materiais necessários:
Luvas;
Sabão próprio;
Escova;
Álcool 70%;
Papel toalha;
Água Deionizada
Papel de autoclave; e
Autoclave

Procedimento:
Higienização das mãos;
Calças as luvas para proteção durante a execução da higienização dos equipamentos;
Fazer a separação por tipo de equipamento a ser higienizado;
Com as mãos higienizadas, calçadas com luvas estéril e descartáveis, utilizando-se de escova própria disponibilizada para limpeza, a qual com sabão ou detergente apropriado, fazer a escovação de todos os equipamentos, em água corrente, até a retirada de todo resíduo;
Cada equipamento higienizado secar com papel toalha;
Após a higienização e secado, embalá-los individualmente em papel próprio para autoclave e levar o número adequado para capacidade de cada bandeja e modelo de autoclave;
Após o processo da autoclave, verificar embalagem de cada equipamento esterilizado, se o processo foi eficaz;
Tendo o processo de esterilização no autoclave sido feito com sucesso, promover a guarda dos equipamentos e materiais embalados, cada um em sua gaveta apropriada para armazenagem.

${REF}`
  },
  {
    titulo: 'PROCEDIMENTO DE OPERAÇÃO PADRÃO – POP: ESTERELIZAÇÃO DE EQUIPAMENTOS DE ESCOVISTA E CABELEIREIRAS', corpo:
      `OBJETIVO: Higienização e esterilização dos equipamentos de escovistas e cabeleireiras (escovas, pentes, prendedor de cabelo, tesouras e máquina de corte);
Áreas Envolvidas: Escovista e Cabelereiras:
Agentes: Todos os profissionais que trabalham no salão de embelezamento;

Materiais necessários:
Sabão próprio;
Água corrente;
Álcool 70%;
Escova; e
Aparelho de desinfecção de escovas, pentes e acessórios.

Procedimento:
Higienização das mãos;
Calças as luvas para proteção durante a execução da higienização dos equipamentos;
Fazer a separação por tipo de equipamento a ser higienizado;
Com as mãos higienizadas, calçadas com luvas estéril e descartáveis, utilizando-se de escova própria disponibilizada para limpeza, a qual com sabão ou detergente apropriado, fazer a escovação de todos os equipamentos, em água corrente, até a retirada de todo resíduo;
Borrifar com álcool 70%, nos equipamentos, os pentes e acessórios que podem receber a ação do produto;
Cada equipamento higienizado secar com papel toalha;
Após a higienização e secagem, os equipamentos devem ser levados ao aparelho de desinfecção;
Após o processo desinfecção, verificar cada equipamento esterilizado, se o processo foi eficaz;
Tendo o processo de desinfecção sido feito com sucesso, promover a guarda dos equipamentos e materiais embalados, cada um em sua gaveta apropriada para armazenagem.

${REF}`
  },
  {
    titulo: 'PROCEDIMENTO DE OPERAÇÃO PADRÃO – POP: LIMPEZA DA PIA DE ASSEPSIA', corpo:
      `OBJETIVO: Limpeza da Pia de Assepsia de equipamentos, materiais e acessórios de uso no salão de beleza;
Áreas Envolvidas: Pia de assepsia;
Agentes: Auxiliar de limpeza e todos os profissionais que trabalham no salão de beleza;

Materiais necessários:
Luvas;
Sabão;
Água corrente;
Álcool 70%;
Bucha de limpeza; e
Aparelho de toalha.

Procedimento:
Higienização das mãos;
Calças as luvas para proteção durante a execução da higienização da pia;
Com as mãos higienizadas, calçadas com luvas estéril e descartáveis, utilizando-se de escova própria disponibilizada para limpeza, a qual com sabão ou detergente apropriado, fazer a escovação de todos os equipamentos, em água corrente, até a retirada de todo resíduo;
Borrifar toda pia com álcool 70% e deixar por 5 (cinco) minutos;
Após os 5 (cinco) minutos de ação de álcool 70%, secar toda pia com papel toalha.

${REF}`
  },
  {
    titulo: 'PROCEDIMENTO DE OPERAÇÃO PADRÃO – POP: LIMPEZA DA ÁREA DE ATENDIMENTO DO SALÃO', corpo:
      `OBJETIVO: Limpeza da área de atendimento do salão e dos equipamentos, materiais e acessórios de uso no salão de embelezamento;
Áreas Envolvidas: Área de atendimento do salão
Agentes: Auxiliar de limpeza e todos os profissionais que trabalham no salão de beleza;

Materiais necessários:
Luvas;
Álcool em Gel;
Buchas;
Água;
Sabão;
Álcool 70%;
Pano de limpeza para móveis;
Desinfetante (germicida, bactericida e fungicida), produto usado, o Azulim
Aspirador de pó;
Vassoura;
Rodo de limpeza e secagem;
Pano de chão;

Procedimento:
Higienização das mãos;
Calças as luvas para proteção durante a execução da higienização da área de atendimento;
Passar o recolhedor de cabelos e resíduos mais grosso do piso, recolhendo-os com pá e despejar na lixeira apropriada;
Efetuar a limpeza do piso, com água misturada com sabão e desinfetante, fazendo a escovação de todo o piso, seguida efetuar a limpeza do produto no ambiente com rodo e pano de chão limpo;
Com as mãos calçadas com luvas de limpeza, utilizar pano próprio para limpeza de mobiliário, umedecendo em álcool para essa limpeza de móveis, assim como o uso de bucha com sabão para limpeza de resíduos
Higienização das cadeiras com álcool 70% antes dos atendimento.

${REF}`
  },
  {
    titulo: 'PROCEDIMENTO DE OPERAÇÃO PADRÃO – POP: LIMPEZA DA ÁREA DO BANHEIRO', corpo:
      `OBJETIVO: Limpeza do banheiro e deposito no salão de embelezamento;
Áreas Envolvidas: Banheiro e deposito:
Agentes: Auxiliar de limpeza;

Materiais necessários:
Luvas;
Buchas;
Água;
Sabão;
Pano de limpeza para móveis;
Desinfetante (germicida, bactericida e fungicida), produto usado, o Azulim;
Aspirador de pó;
Vassoura;
Rodo de limpeza e secagem;
Pano de chão;
Álcool 70%;

Procedimento:
Higienização das mãos;
Calças as luvas para proteção durante a execução da higienização da área de atendimento;
Passar o recolhedor de cabelos e resíduos mais grosso do piso, recolhendo-os com pá e despejar na lixeira apropriada;
Efetuar a limpeza do piso, com água misturada com sabão e desinfetante, fazendo a escovação de todo o piso, seguida efetuar a limpeza do produto no ambiente com rodo e pano de chão limpo;
Com as mãos calçadas com luvas de limpeza, utilizar pano próprio para limpeza de mobiliário, umedecendo em álcool para essa limpeza de móveis, assim como o uso de bucha com sabão para limpeza de resíduos

${REF}`
  },
  {
    titulo: 'PROCEDIMENTO DE OPERAÇÃO PADRÃO – POP: ESTERILIZAÇÃO DE EQUIPAMENTOS DE DEPILAÇÃO', corpo:
      `OBJETIVO: Higienização e esterilização dos equipamentos de depilação (Panela termocera, calcinha descartável, pano descartável);
Áreas Envolvidas: Depilação:
Agentes: Depiladora;

Materiais necessários:
Luvas;
Sabão próprio;
Água corrente;
Álcool 70%;
Escova; e

Procedimento:
Higienização das mãos;
Calças as luvas para proteção durante a execução da higienização dos equipamentos;
Fazer a separação por tipo de equipamento a ser higienizado;
Com as mãos higienizadas, calçadas com luvas estéril e descartáveis, utilizando-se de escova própria disponibilizada para limpeza, a qual com sabão ou detergente apropriado, fazer a escovação de todos os equipamentos, em água corrente, até a retirada de todo resíduo;
Borrifar com álcool 70%, nos equipamentos, os pentes e acessórios que podem receber a ação do produto;
Cada equipamento higienizado secar com papel toalha;
Após a higienização e secagem, os equipamentos devem ser levados ao aparelho de desinfecção;
Após o processo desinfecção, verificar embalagem de cada equipamento esterilizado, se o processo foi eficaz;
Tendo o processo de desinfecção sido feito com sucesso, promover a guarda dos equipamentos e materiais embalados, cada um em sua gaveta apropriada para armazenagem.

${REF}`
  },
  {
    titulo: 'PROCEDIMENTO DE OPERAÇÃO PADRÃO – POP: ESTERILIZAÇÃO DE EQUIPAMENTOS DE MAQUIAGEM', corpo:
      `OBJETIVO: Higienização e esterilização dos equipamentos de maquiagem (Pinceis e Esponjas);
Áreas Envolvidas: Equipamento de Maquiagem:
Agentes: Maquiadora;

Materiais necessários:
Luvas;
Sabão próprio;
Água corrente;
Papel toalha.

Procedimento:
Higienização das mãos;
Calças as luvas para proteção durante a execução da higienização dos equipamentos;
Fazer a separação por tipo de equipamento a ser higienizado;
Com as mãos higienizadas, calçadas com luvas estéril e descartáveis, utilizando-se de sabão ou detergente apropriado, fazer a higienização de todos os pinceis e esponjas, em água corrente, até a retirada de todo resíduo;
Cada equipamento higienizado secar com papel toalha;
Tendo o processo de higienização sido feito com sucesso, promover a guarda dos equipamentos e materiais embalados, cada um em sua gaveta apropriada para armazenagem.

${REF}`
  },
  {
    titulo: 'PROCEDIMENTO DE OPERAÇÃO PADRÃO – POP: LIMPEZA DA COPA, DISPENSA E ESCRITÓRIO.', corpo:
      `OBJETIVO: Limpeza do copa, dispensa, estoque e escritório do salão de beleza;
Áreas Envolvidas: Copa, Dispensa, Estoque e Escritório:
Agentes: Auxiliar de limpeza e todos os profissionais que trabalham no salão de beleza;

Materiais necessários:
Luvas;
Água;
Bucha;
Sabão próprio;
Pano de limpeza para móveis;
Álcool;
Aspirador de pó;
Vassoura;
Rodo de limpeza e secagem;
Pano de chão;

Procedimento:
Higienização das mãos;
Calças as luvas para proteção durante a execução da higienização da área de atendimento;
Passar o recolhedor de cabelos e resíduos mais grosso do piso, recolhendo-os com pá e despejar na lixeira apropriada;
Efetuar a limpeza do piso, com água misturada com sabão e desinfetante, fazendo a escovação de todo o piso, seguida efetuar a limpeza do produto no ambiente com rodo e pano de chão limpo;
Com as mãos calçadas com luvas de limpeza, utilizar pano próprio para limpeza de mobiliário, umedecendo em álcool para essa limpeza de móveis, assim como o uso de bucha com sabão para limpeza de resíduos e lixeiras.

${REF}`
  },
  {
    titulo: 'PROCEDIMENTO DE OPERAÇÃO PADRÃO – POP: LIMPEZA DA SALA DE DEPILAÇÃO', corpo:
      `OBJETIVO: Limpeza da sala de depilação e dos equipamentos, materiais e acessórios;
Áreas Envolvidas: Sala de depilação:
Agentes: Auxiliar de limpeza e depiladora;

Materiais necessários:
Luvas;
Buchas;
Água;
Álcool 70%;
Sabão;
Pano de limpeza para móveis;
Vassoura;
Rodo de limpeza e secagem;
Pano de chão;

Procedimento:
Higienização das mãos;
Calças as luvas para proteção durante a execução da higienização da área de atendimento;
Passar o recolhedor de cabelos e resíduos mais grosso do piso, recolhendo-os com pá e despejar na lixeira apropriada;
Efetuar a limpeza do piso, com água misturada com sabão e desinfetante, fazendo a escovação de todo o piso, seguida efetuar a limpeza do produto no ambiente com rodo e pano de chão limpo;
Com as mãos calçadas com luvas de limpeza, utilizar pano próprio para limpeza de mobiliário, umedecendo em álcool para essa limpeza de móveis, assim como o uso de bucha com sabão para limpeza de resíduos

${REF}`
  },
]
