// ── Trilhas da Academia ─────────────────────────────────────────────────────
//
// A Academia responde bem quando a pergunta já existe ("aquilo de comissão").
// Ela não responde a quem chega sem pergunta formada — e é a maioria. Setenta
// artigos soltos, para essa pessoa, é o mesmo que nenhum.
//
// A trilha resolve isso dando ORDEM. Cada uma resolve um problema inteiro, e
// os artigos vêm na sequência em que um usa o resultado do anterior: não dá
// para precificar antes de saber o custo, nem definir comissão antes de saber
// a margem.
//
// Casamento por TÍTULO, e não por id: id muda de banco para banco (cada
// ambiente insere o seu), título é o mesmo em todos. Título que não existir é
// simplesmente ignorado na montagem — trilha nunca quebra a tela por causa de
// um artigo ausente.

export interface Trilha {
  slug: string
  nome: string
  resumo: string
  para: string          // para quem é, em uma linha
  cor: string           // gradiente Tailwind
  borda: string
  texto: string
  artigos: string[]     // títulos, na ordem
}

export const TRILHAS: Trilha[] = [
  {
    slug: 'primeiros-30-dias',
    nome: 'Primeiros 30 dias',
    resumo: 'O mínimo para sair do escuro: onde está o dinheiro e o que está errado.',
    para: 'Para quem nunca organizou a gestão e não sabe por onde começar.',
    cor: 'from-slate-500 to-slate-700', borda: 'border-slate-200', texto: 'text-slate-700',
    artigos: [
      'Gestão de salão: por onde começar',
      'Como separar as finanças do salão das suas',
      'Fluxo de caixa do salão: o passo a passo que funciona',
      'Como calcular o ponto de equilíbrio do seu salão',
      'Os 7 erros de gestão que quebram um salão',
    ],
  },
  {
    slug: 'dinheiro-no-lugar',
    nome: 'O dinheiro no lugar',
    resumo: 'Do caixa diário à reserva: saber quanto entra, quanto sai e quanto sobra.',
    para: 'Para quem fatura bem e não vê o dinheiro no fim do mês.',
    cor: 'from-emerald-500 to-emerald-700', borda: 'border-emerald-200', texto: 'text-emerald-700',
    artigos: [
      'Fluxo de caixa do salão: o passo a passo que funciona',
      'Como separar as finanças do salão das suas',
      'Capital de Giro, Reserva Financeira e Depreciação',
      'Margem de lucro real: quanto o salão de fato ganha',
      'Antecipação de recebíveis: quanto custa de verdade',
      'Inadimplência, fiado e pacote não pago',
    ],
  },
  {
    slug: 'preco-certo',
    nome: 'O preço certo',
    resumo: 'Custo, margem e preço — serviço por serviço, com conta e não com chute.',
    para: 'Para quem desconfia que tem serviço dando prejuízo e não sabe qual.',
    cor: 'from-teal-500 to-teal-700', borda: 'border-teal-200', texto: 'text-teal-700',
    artigos: [
      'Como calcular o ponto de equilíbrio do seu salão',
      'Como precificar serviços corretamente',
      'Quanto custa de energia cada serviço',
      'Margem de lucro real: quanto o salão de fato ganha',
      'Precificação de noiva e evento',
      'Serviço novo: como decidir se entra na sua tabela',
    ],
  },
  {
    slug: 'equipe-que-funciona',
    nome: 'Equipe que funciona',
    resumo: 'Contratar, integrar, remunerar e conduzir — sem herdar acordo que não fecha.',
    para: 'Para quem vive apagando incêndio de equipe.',
    cor: 'from-blue-500 to-blue-700', borda: 'border-blue-200', texto: 'text-blue-700',
    artigos: [
      'Como contratar: divulgação de vagas e seleção',
      'Manual de Integração do Novo Profissional',
      'Como estruturar comissionamento que funciona',
      'Comissão ou aluguel de cadeira: qual dá mais lucro',
      'Passo a passo para dar feedback individual',
      'Como resolver conflitos na equipe',
      'Como motivar a equipe sem aumentar salário',
      'Organograma do salão: quem responde pelo quê',
    ],
  },
  {
    slug: 'agenda-cheia',
    nome: 'Agenda cheia',
    resumo: 'Encher horário na ordem que custa menos: quem já veio, quem está vindo, quem é novo.',
    para: 'Para quem está com buraco na agenda e pensando em anunciar.',
    cor: 'from-violet-500 to-violet-700', borda: 'border-violet-200', texto: 'text-violet-700',
    artigos: [
      'Agenda vazia: o que fazer nos próximos 30 dias',
      'Como reativar clientes inativos sem dar desconto',
      'Como a recepção enche a agenda',
      'Como reduzir no-show e cancelamentos em cima da hora',
      'Como montar uma grade de horários eficiente',
      '6 estratégias para atrair clientes todos os meses',
    ],
  },
  {
    slug: 'recepcao-do-zero',
    nome: 'Recepção do zero',
    resumo: 'Montar a recepção inteira: rotina, fala, agenda, meta e treinamento.',
    para: 'Para quem vai contratar recepcionista ou quer profissionalizar o balcão.',
    cor: 'from-rose-500 to-rose-700', borda: 'border-rose-200', texto: 'text-rose-700',
    artigos: [
      'A rotina da recepção: o que fazer em cada hora do dia',
      'O que a recepção fala: respostas para as situações do dia',
      'Como a recepção enche a agenda',
      'Meta e bonificação da recepção',
      'Como treinar uma recepcionista nova em 30 dias',
    ],
  },
  {
    slug: 'sair-da-cadeira',
    nome: 'Sair da cadeira',
    resumo: 'Transformar o que só existe na sua cabeça em processo que roda sem você.',
    para: 'Para quem atende o dia inteiro e administra nas sobras.',
    cor: 'from-amber-500 to-amber-700', borda: 'border-amber-200', texto: 'text-amber-700',
    artigos: [
      'Como sair da cadeira sem o salão parar',
      'Como escrever o POP do seu salão',
      'Organograma do salão: quem responde pelo quê',
      'O papel do gerente: o que ele decide e o que sobe',
      'A rotina do gestor: o que olhar por dia, semana e mês',
      'Reunião de equipe: as pautas do ano inteiro',
    ],
  },
  {
    slug: 'proteger-o-negocio',
    nome: 'Proteger o negócio',
    resumo: 'O que pode virar processo, multa ou prejuízo — e o documento que evita cada um.',
    para: 'Para quem já organizou a operação e quer dormir tranquilo.',
    cor: 'from-cyan-600 to-cyan-800', borda: 'border-cyan-200', texto: 'text-cyan-700',
    artigos: [
      'LGPD no salão: o que fazer com os dados da cliente',
      'Direito de imagem: o antes e depois que dá problema',
      'Ficha de anamnese: o que perguntar e por quê',
      'Vigilância sanitária: a lista do que precisa estar em ordem',
      'PGR e PCMSO: as obrigações que quase ninguém tem',
      'Nota fiscal do profissional parceiro',
    ],
  },
]
