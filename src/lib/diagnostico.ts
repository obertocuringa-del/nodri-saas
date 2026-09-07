// ── Diagnóstico do salão ────────────────────────────────────────────────────
//
// As dez perguntas saíram dos ganchos que já foram testados em conteúdo, e os
// ganchos saíram de dúvida real escrita em fórum de gestão de salão. Nenhuma
// delas é pauta inventada — é isso que faz a pessoa parar na primeira.
//
// O formato é de propósito: pergunta que se responde com um número. "Você
// controla o estoque?" todo mundo responde que sim. "Quanto de produto sai em
// um atendimento?" quase ninguém sabe — e é aí que o diagnóstico acontece.
//
// Cada pergunta carrega o porquê e o que fazer, porque um diagnóstico que só
// aponta o buraco irrita; o que diz como sair dele, ajuda.

export interface Pergunta {
  id: string
  area: string
  pergunta: string
  porque: string
  oQueFazer: string
}

export const PERGUNTAS: Pergunta[] = [
  {
    id: 'custo-produto',
    area: 'Custo',
    pergunta: 'Você sabe quanto de produto sai em um atendimento?',
    porque:
      'A embalagem rende vinte aplicações no papel e treze na prática, porque a dosagem é no olho. Essa diferença não aparece em lugar nenhum: ela sai do lucro, todo mês, caladinha.',
    oQueFazer:
      'Defina a gramagem por serviço e compare com a saída real do estoque. Sem esse número, "está saindo muito produto" é reclamação, não diagnóstico.',
  },
  {
    id: 'margem-servico',
    area: 'Preço',
    pergunta: 'Você sabe a margem de lucro de cada serviço da sua tabela?',
    porque:
      'A margem geral esconde o essencial. É comum um salão com 13% no total ter serviço com 35% e outro com 2% — e ninguém saber quais são quais.',
    oQueFazer:
      'Calcule a margem dos três serviços que mais aparecem na sua agenda. Se algum estiver abaixo de 10%, você achou o vazamento.',
  },
  {
    id: 'taxa-cartao',
    area: 'Preço',
    pergunta: 'A taxa do cartão está dentro do preço que você cobra?',
    porque:
      'Débito, crédito à vista e parcelado têm taxas diferentes; o seu preço é um só. Se a taxa ficou de fora, cada parcelamento em seis vezes é financiado pelo seu lucro — e não aparece, porque é descontada antes do dinheiro chegar.',
    oQueFazer:
      'Traga a taxa para dentro do custo do serviço, junto com produto e comissão.',
  },
  {
    id: 'comissao',
    area: 'Comissão',
    pergunta: 'A comissão que você paga cabe na sua margem?',
    porque:
      'É o erro mais caro da gestão de salão porque é o mais difícil de desfazer. Comissão acordada acima do que a margem comporta transforma cada atendimento em prejuízo — e reduzir depois gera conflito e saída de equipe.',
    oQueFazer:
      'O teto de comissão é uma conta: o que sobra depois do custo direto precisa pagar o custo operacional e ainda deixar lucro.',
  },
  {
    id: 'ponto-equilibrio',
    area: 'Financeiro',
    pergunta: 'Você sabe quanto o salão precisa faturar para não dar prejuízo?',
    porque:
      'Antes de falar em lucro existe um número anterior. Sem ele, meta é chute e promoção é aposta — você não sabe a partir de qual real do mês o salão trabalha para você, e não para as contas.',
    oQueFazer:
      'Divida o custo operacional mensal pela sua margem. Esse é o ponto de equilíbrio.',
  },
  {
    id: 'contas-separadas',
    area: 'Financeiro',
    pergunta: 'As contas do salão são separadas das suas contas pessoais?',
    porque:
      'Enquanto for a mesma conta, nenhum número do negócio é confiável. O salão parece dar lucro no mês em que você gastou pouco em casa, e prejuízo no mês da matrícula da escola.',
    oQueFazer:
      'Duas contas e um pró-labore fixo, com valor e data definidos antes do mês começar. É a mudança de maior efeito e menor esforço que existe.',
  },
  {
    id: 'reserva',
    area: 'Financeiro',
    pergunta: 'Se o movimento cair pela metade por três meses, o salão aguenta?',
    porque:
      'Reserva não é luxo, é o que separa um trimestre ruim de um fechamento. E ela some sem ninguém perceber quando está misturada com o capital de giro.',
    oQueFazer:
      'Separe as duas: giro é o dinheiro que faz o mês rodar, reserva é o que você não toca.',
  },
  {
    id: 'ocupacao',
    area: 'Agenda',
    pergunta: 'Você sabe a taxa de ocupação de cada cadeira do salão?',
    porque:
      'Cadeira parada consome custo operacional e não gera nada. Um salão com 50% de ocupação precisa de margem muito maior por atendimento para chegar no mesmo resultado.',
    oQueFazer:
      'Meça horas ocupadas sobre horas disponíveis, por profissional. É o número que diz se o problema é preço ou é volume.',
  },
  {
    id: 'clientes-sumidas',
    area: 'Cliente',
    pergunta: 'Você sabe quantas clientes não voltam há mais de 90 dias?',
    porque:
      'Cliente insatisfeita raramente reclama: ela só para de marcar. E você demora meses para perceber, porque a agenda continua parecendo cheia.',
    oQueFazer:
      'Puxe a lista de quem sumiu antes de investir em cliente nova. Recuperar quem já conhece o salão custa uma fração do que custa atrair.',
  },
  {
    id: 'depende-de-voce',
    area: 'Gestão',
    pergunta: 'Se você sumir por quinze dias, o salão continua funcionando?',
    porque:
      'Quando tudo passa por você — preço, exceção, compra, escala, caixa — o salão cresce até o limite da sua agenda e para ali. Não é falta de equipe: é falta de estrutura escrita.',
    oQueFazer:
      'Comece escrevendo a rotina de abertura. Uma folha. É por onde todo mundo começa.',
  },
]

export const OPCOES = [
  { valor: 2, rotulo: 'Sei de cabeça', desc: 'Consigo dizer o número agora' },
  { valor: 1, rotulo: 'Mais ou menos', desc: 'Tenho ideia, mas não confiro' },
  { valor: 0, rotulo: 'Não faço ideia', desc: 'Nunca calculei isso' },
]

export const PONTOS_MAXIMOS = PERGUNTAS.length * 2

export interface Faixa {
  min: number
  titulo: string
  texto: string
  cor: string
}

export const FAIXAS: Faixa[] = [
  {
    min: 16,
    titulo: 'Seu salão está sob controle',
    cor: '#0f9d58',
    texto:
      'Você conhece os seus números, e isso já coloca o seu salão à frente da maioria. O ganho agora não vem de descobrir o que está errado — vem de parar de refazer essas contas à mão todo mês.',
  },
  {
    min: 9,
    titulo: 'Meio caminho andado',
    cor: '#e8a33d',
    texto:
      'O salão funciona, e boa parte da gestão já está de pé. Mas existem pontos cegos suficientes para o resultado variar sem explicação — e é justamente por eles que o dinheiro escapa.',
  },
  {
    min: 0,
    titulo: 'As decisões estão sendo tomadas no escuro',
    cor: '#d94f4f',
    texto:
      'Isso não é descuido, e é mais comum do que parece: ninguém abre salão para virar contador. O problema é que, sem esses números, toda decisão de preço, comissão e promoção vira aposta.',
  },
]

export function faixaDe(pontos: number): Faixa {
  return FAIXAS.find(f => pontos >= f.min) || FAIXAS[FAIXAS.length - 1]
}
