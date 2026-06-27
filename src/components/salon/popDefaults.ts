// Conteúdos padrão dos POPs (editáveis depois pelo usuário)

const REF = `Referências:
• Lei nº 8080/90 – Institui o Sistema Único de Saúde – SUS
• Lei nº 9782/99 – Criou a Agência de Vigilância Sanitária – ANVISA
• Resolução ANVISA nº 79, de 28/08/2000 - estabelece a definição e classificação de produtos de higiene pessoal, cosmético, perfumes e outros
• Instrução Normativa DIVISA/SVS/SES-DF nº 06, de 29/12/2014
• Lei Distrital nº 5321, de 06/03/2014; e Lei nº 6437, de 20/08/1977`

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

const pop = (titulo: string, objetivo: string, areas: string, agentes: string, materiais: string[], proc: string[]): { titulo: string; corpo: string } => ({
  titulo,
  corpo: `OBJETIVO: ${objetivo}

Áreas Envolvidas: ${areas}
Agentes: ${agentes}

Materiais necessários:
${materiais.map(m => '• ' + m).join('\n')}

Procedimento:
${proc.map((p, i) => `${i + 1}. ${p}`).join('\n')}

${REF}`,
})

export const POP_SALAO_BLOCOS = [
  pop('POP: ESTERILIZAÇÃO DE EQUIPAMENTOS DE DESIGNER DE UNHAS',
    'Higienização e esterilização dos equipamentos de manicure e pedicura reutilizáveis (alicates de cutícula, alicates de corte e espátulas).',
    'Designer de unhas.', 'Responsável pela dosagem e designer de unhas.',
    ['Luvas', 'Sabão próprio', 'Escova', 'Álcool 70%', 'Papel toalha', 'Água deionizada', 'Papel de autoclave', 'Autoclave'],
    ['Higienização das mãos', 'Calçar as luvas para proteção durante a execução', 'Fazer a separação por tipo de equipamento a ser higienizado', 'Com mãos higienizadas e luvas estéreis, escovar todos os equipamentos com sabão apropriado em água corrente até retirar todo resíduo', 'Secar cada equipamento com papel toalha', 'Embalar individualmente em papel próprio para autoclave conforme a capacidade de cada bandeja/modelo', 'Após a autoclave, verificar a embalagem de cada equipamento e se o processo foi eficaz', 'Guardar os equipamentos esterilizados, cada um em sua gaveta apropriada']),
  pop('POP: ESTERILIZAÇÃO DE EQUIPAMENTOS DE ESCOVISTA E CABELEIREIRAS',
    'Higienização e esterilização dos equipamentos de escovistas e cabeleireiras (escovas, pentes, prendedor de cabelo, tesouras e máquina de corte).',
    'Escovista e Cabeleireiras.', 'Todos os profissionais que trabalham no salão.',
    ['Sabão próprio', 'Água corrente', 'Álcool 70%', 'Escova', 'Aparelho de desinfecção de escovas, pentes e acessórios'],
    ['Higienização das mãos', 'Calçar as luvas para proteção', 'Separar por tipo de equipamento', 'Escovar todos os equipamentos com sabão apropriado em água corrente', 'Borrifar álcool 70% nos equipamentos que podem receber o produto', 'Secar cada equipamento com papel toalha', 'Levar ao aparelho de desinfecção', 'Verificar se o processo foi eficaz e guardar cada um em sua gaveta']),
  pop('POP: LIMPEZA DA PIA DE ASSEPSIA',
    'Limpeza da pia de assepsia de equipamentos, materiais e acessórios de uso no salão.',
    'Pia de assepsia.', 'Auxiliar de limpeza e todos os profissionais do salão.',
    ['Luvas', 'Sabão', 'Água corrente', 'Álcool 70%', 'Bucha de limpeza', 'Papel toalha'],
    ['Higienização das mãos', 'Calçar as luvas', 'Escovar a pia com sabão apropriado em água corrente até retirar todo resíduo', 'Borrifar toda a pia com álcool 70% e deixar agir por 5 minutos', 'Após os 5 minutos, secar toda a pia com papel toalha']),
  pop('POP: LIMPEZA DA ÁREA DE ATENDIMENTO DO SALÃO',
    'Limpeza da área de atendimento do salão e dos equipamentos, materiais e acessórios.',
    'Área de atendimento do salão.', 'Auxiliar de limpeza e todos os profissionais do salão.',
    ['Luvas', 'Álcool em gel', 'Buchas', 'Água', 'Sabão', 'Álcool 70%', 'Pano para móveis', 'Desinfetante (Azulim)', 'Aspirador de pó', 'Vassoura', 'Rodo', 'Pano de chão'],
    ['Higienização das mãos', 'Calçar as luvas', 'Recolher cabelos e resíduos do piso com pá e descartar na lixeira', 'Lavar o piso com água, sabão e desinfetante; escovar e secar com rodo e pano limpo', 'Limpar mobiliário com pano umedecido em álcool', 'Higienizar as cadeiras com álcool 70% antes dos atendimentos']),
  pop('POP: LIMPEZA DA ÁREA DO BANHEIRO',
    'Limpeza do banheiro e depósito do salão.',
    'Banheiro e depósito.', 'Auxiliar de limpeza.',
    ['Luvas', 'Buchas', 'Água', 'Sabão', 'Pano para móveis', 'Desinfetante (Azulim)', 'Aspirador de pó', 'Vassoura', 'Rodo', 'Pano de chão', 'Álcool 70%'],
    ['Higienização das mãos', 'Calçar as luvas', 'Recolher resíduos do piso com pá', 'Lavar o piso com água, sabão e desinfetante; escovar e secar com rodo e pano limpo', 'Limpar mobiliário com pano umedecido em álcool e bucha com sabão']),
  pop('POP: ESTERILIZAÇÃO DE EQUIPAMENTOS DE DEPILAÇÃO',
    'Higienização e esterilização dos equipamentos de depilação (panela termocera, calcinha descartável, pano descartável).',
    'Depilação.', 'Depiladora.',
    ['Luvas', 'Sabão próprio', 'Água corrente', 'Álcool 70%', 'Escova'],
    ['Higienização das mãos', 'Calçar as luvas', 'Separar por tipo de equipamento', 'Escovar com sabão apropriado em água corrente', 'Borrifar álcool 70% nos equipamentos compatíveis', 'Secar com papel toalha', 'Levar ao aparelho de desinfecção', 'Verificar a eficácia e guardar cada um em sua gaveta']),
  pop('POP: ESTERILIZAÇÃO DE EQUIPAMENTOS DE MAQUIAGEM',
    'Higienização e esterilização dos equipamentos de maquiagem (pincéis e esponjas).',
    'Equipamento de maquiagem.', 'Maquiadora.',
    ['Luvas', 'Sabão próprio', 'Água corrente', 'Papel toalha'],
    ['Higienização das mãos', 'Calçar as luvas', 'Separar por tipo de equipamento', 'Higienizar pincéis e esponjas com sabão apropriado em água corrente', 'Secar com papel toalha', 'Guardar cada um em sua gaveta apropriada']),
  pop('POP: LIMPEZA DA COPA, DISPENSA E ESCRITÓRIO',
    'Limpeza da copa, dispensa, estoque e escritório do salão.',
    'Copa, dispensa, estoque e escritório.', 'Auxiliar de limpeza e todos os profissionais do salão.',
    ['Luvas', 'Água', 'Bucha', 'Sabão próprio', 'Pano para móveis', 'Álcool', 'Aspirador de pó', 'Vassoura', 'Rodo', 'Pano de chão'],
    ['Higienização das mãos', 'Calçar as luvas', 'Recolher resíduos do piso com pá', 'Lavar o piso com água, sabão e desinfetante; escovar e secar com rodo e pano limpo', 'Limpar mobiliário e lixeiras com pano umedecido em álcool e bucha com sabão']),
  pop('POP: LIMPEZA DA SALA DE DEPILAÇÃO',
    'Limpeza da sala de depilação e dos equipamentos, materiais e acessórios.',
    'Sala de depilação.', 'Auxiliar de limpeza e depiladora.',
    ['Luvas', 'Buchas', 'Água', 'Álcool 70%', 'Sabão', 'Pano para móveis', 'Vassoura', 'Rodo', 'Pano de chão'],
    ['Higienização das mãos', 'Calçar as luvas', 'Recolher resíduos do piso com pá', 'Lavar o piso com água, sabão e desinfetante; escovar e secar com rodo e pano limpo', 'Limpar mobiliário com pano umedecido em álcool e bucha com sabão']),
]
