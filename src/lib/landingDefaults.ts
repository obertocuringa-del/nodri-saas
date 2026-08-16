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

  dores_titulo: 'Se você se reconhece aqui, a NODRI foi feita para o seu salão',
  dores: [
    { titulo: 'O mês fecha e você não sabe se sobrou', desc: 'O dinheiro entra e sai, mas ninguém consegue dizer quanto o salão deu de lucro de verdade — nem quanto custa manter a porta aberta.' },
    { titulo: 'Você não sabe qual profissional dá lucro', desc: 'Todo mundo parece ocupado. Mas quem realmente traz resultado, quem só ocupa cadeira e quem está caindo mês a mês? Sem número, é achismo.' },
    { titulo: 'Cliente some e ninguém percebe', desc: 'Aquela cliente que vinha todo mês parou de aparecer. Você só percebe quando ela já está em outro salão há meio ano.' },
    { titulo: 'Tudo depende de você estar presente', desc: 'Se você viaja ou adoece, a rotina desmonta. Nada está escrito, tudo está na sua cabeça e no caderno da recepção.' },
  ],

  beneficios_titulo: 'O primeiro sistema que cuida da sua equipe como uma empresa de verdade',
  beneficios: [
    { emoji: '', titulo: 'Você passa a saber seus números', desc: 'Custo operacional, ponto de equilíbrio, contas a pagar e preço certo por serviço — calculados com os dados do seu salão, não com estimativa.' },
    { emoji: '', titulo: 'Cada profissional tem uma ficha viva', desc: 'Metas, comissões, avaliações, faturamento e histórico. Você vê quem cresce, quem precisa de ajuda e quem está saindo antes de perder.' },
    { emoji: '', titulo: 'O sistema aponta o problema', desc: 'Clientes em risco de sumir, serviços que ninguém oferece, queda de faturamento. O relatório mostra onde está o dinheiro que você não viu.' },
    { emoji: '', titulo: 'A rotina anda sem você', desc: 'Check lists por período, escalas, processos escritos, feedback de cliente e pendências. O salão funciona mesmo quando você não está lá.' },
  ],

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

  footer_logo: 'NODRI',
  footer_texto: 'Gestão Inteligente para Salões de Beleza',
  footer_email: 'contato@nodri.com.br',
  footer_whatsapp: '5561982195214',
}

export type LandingConfig = typeof LANDING_PADRAO
