// ── Textos da vitrine — FONTE ÚNICA ─────────────────────────────────────────
//
// Estes textos existiam em TRÊS cópias: na página, na API de configuração e no
// editor do admin. Elas desencontraram, e o resultado apareceu no ar: a página
// mostrava o título novo, a API devolvia o antigo por cima, e o site voltava a
// dizer "Sistema de Gestão para Salões de Beleza / Automatize confirmações no
// WhatsApp" — texto de duas versões atrás.
//
// Agora é um arquivo só. A API entrega o que estiver salvo no banco; se não
// houver nada salvo, valem estes.

export const LANDING_PADRAO = {
  hero_logo: 'NODRI',

  // Começa pela DOR, não pelo produto. "Sistema de gestão" não desperta nada
  // em quem não sabe que precisa; a pergunta que ele não consegue responder,
  // sim. E a segunda frase promete resultado, não funcionalidade.
  hero_titulo: 'Seu salão funciona quando você não está lá?',
  hero_subtitulo: 'A NODRI transforma sua base de clientes em dinheiro. Mais organização, mais relacionamento e mais faturamento — de forma orgânica, aproveitando quem já conhece e confia na sua empresa.',
  hero_botao: 'Quero conhecer a NODRI',
  hero_cor_botao: '#00b5d8',

  // Três destaques logo abaixo do título, no topo.
  destaques: [
    { titulo: 'Financeiro real', desc: 'Custo, lucro e preço certo por serviço' },
    { titulo: 'Equipe medida', desc: 'Metas, comissões e desempenho de cada um' },
    { titulo: 'Alertas que importam', desc: 'Cliente sumindo e queda de faturamento' },
  ],
  hero_botao2: 'Ver como funciona',
  hero_rodape: 'Feito dentro de um salão em operação, não numa mesa de escritório.',
  hero_etiqueta: 'Gestão para salões de beleza',

  // Fotos/vídeos do topo. Vazio = mostra a ilustração do painel; com itens,
  // vira carrossel. Assim a página nunca fica com um buraco esperando foto.
  hero_midias: [] as { tipo?: 'imagem' | 'video'; url: string }[],
  hero_intervalo: 5,

  dores_titulo: 'Se você se reconhece aqui, a NODRI foi feita para o seu salão',
  dores_subtitulo: 'Nenhuma dessas coisas aparece de repente. Elas custam dinheiro em silêncio, todo mês.',
  dores: [
    { titulo: 'O mês fecha e você não sabe se sobrou', desc: 'O dinheiro entra e sai, mas ninguém consegue dizer quanto o salão deu de lucro de verdade — nem quanto custa manter a porta aberta.' },
    { titulo: 'Você não sabe qual profissional dá lucro', desc: 'Todo mundo parece ocupado. Mas quem realmente traz resultado, quem só ocupa cadeira e quem está caindo mês a mês? Sem número, é achismo.' },
    { titulo: 'Cliente some e ninguém percebe', desc: 'Aquela cliente que vinha todo mês parou de aparecer. Você só percebe quando ela já está em outro salão há meio ano.' },
    { titulo: 'Tudo depende de você estar presente', desc: 'Se você viaja ou adoece, a rotina desmonta. Nada está escrito, tudo está na sua cabeça e no caderno da recepção.' },
  ],

  // Comparação com o concorrente.
  comparacao_titulo: 'Os outros sistemas organizam a sua agenda.|A NODRI organiza a sua equipe.',
  comparacao_subtitulo: 'Agenda e comanda quase todo sistema tem. O que quase nenhum tem é o que faz o salão andar quando o dono não está.',
  comparacao_col1_titulo: 'O que todo sistema faz',
  comparacao_col1: [
    'Agenda e horários', 'Cadastro de clientes', 'Comanda e caixa', 'Relatório de faturamento',
  ],
  comparacao_col2_titulo: 'O que só a NODRI faz',
  comparacao_col2: [
    'Ficha completa: contratação, CLT, PJ, contrato e distrato',
    'Plano de carreira e avaliação de cada profissional',
    'Meta individual, comissão e acompanhamento mensal',
    'Portal onde a profissional vê o próprio desempenho',
    'Check lists e processos por período, com cobrança',
    'Setores internos com solicitações e demandas',
    'Corrida interna com ranking automático',
    'Consultoria por IA sobre os números do seu salão',
  ],

  beneficios_titulo: 'O primeiro sistema que cuida da sua equipe como uma empresa de verdade',
  beneficios: [
    { emoji: '', titulo: 'Você passa a saber seus números', desc: 'Custo operacional, ponto de equilíbrio, contas a pagar e preço certo por serviço — calculados com os dados do seu salão, não com estimativa.' },
    { emoji: '', titulo: 'Cada profissional tem uma ficha viva', desc: 'Metas, comissões, avaliações, faturamento e histórico. Você vê quem cresce, quem precisa de ajuda e quem está saindo antes de perder.' },
    { emoji: '', titulo: 'O sistema aponta o problema', desc: 'Clientes em risco de sumir, serviços que ninguém oferece, queda de faturamento. O relatório mostra onde está o dinheiro que você não viu.' },
    { emoji: '', titulo: 'A rotina anda sem você', desc: 'Check lists por período, escalas, processos escritos, feedback de cliente e pendências. O salão funciona mesmo quando você não está lá.' },
  ],

  contato_titulo: 'Vamos conhecer o seu salão',
  contato_subtitulo: 'Conte como o seu salão funciona hoje e a gente mostra o que a NODRI muda na sua rotina. Preencha o formulário e retornamos com o plano certo para o seu tamanho.',

  // Blocos que VOCÊ cria no admin, sem precisar de código. Cada um vira uma
  // seção nova na página, na ordem em que estiverem aqui.
  blocos_extras: [] as {
    titulo: string
    subtitulo?: string
    cards?: { titulo: string; desc: string }[]
    botao_texto?: string
    botao_link?: string
    fundo?: 'claro' | 'branco' | 'marinho'
  }[],

  afiliados_titulo: 'Indique a NODRI e ganhe',
  afiliados_subtitulo: 'Indique a NODRI para outros salões e ganhe 40% de comissão em cada venda realizada com seu cupom exclusivo.',
  afiliados_comissao: 40,
  afiliados_botao: 'Quero indicar →',
  afiliados_chips: [
    { emoji: '', texto: 'Cupom exclusivo' },
    { emoji: '', texto: 'Link personalizado' },
    { emoji: '', texto: '40% por venda' },
    { emoji: '', texto: 'Pix direto' },
  ],

  // ── Página /trabalhe-conosco (cadastro de afiliado) ──────────────────────
  // Tudo o que aparece lá se edita no admin. O que estiver entre **asteriscos**
  // sai destacado na cor da marca.
  afiliado_pg_titulo: 'Trabalhe Conosco',
  afiliado_pg_subtitulo: 'Indique o NODRI e ganhe **40% de comissão** em cada venda realizada com o seu cupom exclusivo.',
  afiliado_pg_cards: [
    { titulo: '40% de Comissão', desc: 'Em cada venda que você indicar' },
    { titulo: 'Link Exclusivo', desc: 'Seu link personalizado para divulgar' },
    { titulo: 'Pagamento via Pix', desc: 'Receba diretamente na sua conta' },
  ],
  afiliado_pg_form_titulo: 'Cadastre-se gratuitamente',
  afiliado_pg_rot_nome: 'Nome completo *',
  afiliado_pg_rot_cpf: 'CPF *',
  afiliado_pg_rot_telefone: 'Telefone',
  afiliado_pg_rot_email: 'Email *',
  afiliado_pg_rot_pix: 'Chave Pix *',
  afiliado_pg_dica_pix: 'Suas comissões serão enviadas para esta chave Pix',
  afiliado_pg_botao: 'Quero ser Afiliado!',
  afiliado_pg_sucesso_titulo: 'Cadastro realizado!',
  afiliado_pg_sucesso_texto: 'Seu cupom e link exclusivos foram gerados. Enviamos também por email com todas as instruções.',
  afiliado_pg_sucesso_cupom: 'Seu cupom exclusivo',
  afiliado_pg_sucesso_link: 'Seu link de divulgação',
  afiliado_pg_como_usar_titulo: 'Como usar:',
  afiliado_pg_como_usar: [
    'Compartilhe o link ou cupom com seus contatos',
    'Quando comprarem usando seu cupom, você ganha **40%**',
    'O pagamento é feito via Pix automaticamente',
  ],

  footer_logo: 'NODRI',
  footer_texto: 'Gestão Inteligente para Salões de Beleza',
  footer_email: 'contato@nodri.com.br',
  footer_whatsapp: '5561982195214',
}

export type LandingConfig = typeof LANDING_PADRAO
