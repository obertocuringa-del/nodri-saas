// Modelo de avaliação COMPARTILHADO (fonte única).
// Editado em "Perfil e Avaliação de Desempenho" e na própria aba AVALIAR de
// cada profissional. Chave no salao_config: avaliacao_modelo

export interface CritItem { id: string; texto: string }
export interface CatAval {
  id: string
  titulo: string
  cor: string
  criterios: CritItem[]
  /**
   * A quem esta seção se aplica, pelo CARGO do profissional.
   *
   * Vazio ou ausente = TODO MUNDO, que é como as seções nasceram e continua
   * sendo o padrão. Preenchido, a seção some para quem tem outro cargo.
   *
   * Existe por causa das perguntas técnicas: cutilagem e nail art não dizem
   * nada sobre a cabeleireira, e babyliss e coloração não dizem nada sobre a
   * manicure (pedido do dono, 12/10/2026). Sem isso, ou a ficha fica genérica
   * demais para avaliar técnica, ou obriga cada um a responder a técnica dos
   * outros -- e o formulário exige responder tudo antes de salvar.
   *
   * A comparação é pelo nome do cargo, sem acento e sem caixa (ver `ehDoCargo`).
   */
  cargos?: string[]
}
export interface Faixa { min: number; txt: string; cor: string; emoji: string }
export interface ModeloAval { categorias: CatAval[]; classificacao?: Faixa[] }

let _i = 0
const cid = () => 'a' + (++_i)
const cat = (titulo: string, cor: string, crits: string[], cargos?: string[]): CatAval => ({
  id: cid(), titulo, cor, criterios: crits.map(t => ({ id: cid(), texto: t })), ...(cargos ? { cargos } : {}),
})

/** Cargo como se compara: sem acento, sem caixa, sem espaço sobrando. */
export const chaveCargo = (s?: string | null) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()

/**
 * Esta seção vale para este profissional?
 *
 * Seção sem `cargos` vale para todos -- é o padrão e o que mantém as seções
 * antigas funcionando sem precisar mexer nelas.
 */
export function ehDoCargo(c: CatAval, cargo?: string | null): boolean {
  if (!c.cargos || !c.cargos.length) return true
  const alvo = chaveCargo(cargo)
  if (!alvo) return false          // sem cargo cadastrado, só as seções gerais
  return c.cargos.some(x => chaveCargo(x) === alvo)
}

export const MODELO_AVAL_DEFAULT: ModeloAval = {
  categorias: [
    cat('Comprometimento e Responsabilidade', '#5b4fcf', [
      'Pontualidade e cumprimento dos horários', 'Presença e disponibilidade no salão', 'Baixa frequência de faltas e atrasos',
      'Comprometimento com a agenda e clientes agendados', 'Não recusa/cancela atendimentos sem justificativa',
      'Cumprimento das normas internas', 'Responsabilidade com materiais e patrimônio',
      // Acrescentados em 12/10/2026, das listas que o dono usa no salão.
      'Chega de 10 a 15 minutos antes para organizar o material',
      'Tem as ferramentas e os materiais necessários para executar os serviços',
      'Eficiência na gestão do estoque de produtos e materiais',
      'Reporta preocupações e reclamações à gestão',
    ]),
    cat('Relacionamento Interpessoal e Cultura', '#0891b2', [
      'Relacionamento saudável com colegas e gestores', 'Ausência de fofocas e conflitos internos', 'Respeito à equipe e aos clientes',
      'Honestidade e transparência', 'Humildade para reconhecer erros e receber feedback', 'Sigilo sobre assuntos internos',
      'Participação em ações, campanhas e eventos', 'Espírito de equipe e colaboração',
    ]),
    cat('Desenvolvimento Profissional e Inovação', '#db2777', [
      'Participação em cursos e treinamentos', 'Busca constante por atualização técnica', 'Qualidade dos materiais utilizados',
      'Conhecimento das tendências do mercado', 'Aplicação prática dos conhecimentos', 'Marketing pessoal e uso estratégico das redes',
      'Qualidade e frequência das publicações',
      'Participa das reuniões de acompanhamento (PDI) e executa o que foi combinado',
      'Compartilha com a equipe o que aprendeu ao voltar de um curso',
    ]),
    cat('Qualidade no Atendimento e Experiência', '#16a34a', [
      'Escuta ativa durante o atendimento', 'Excelência técnica e qualidade dos serviços', 'Respeito ao tempo de cada procedimento',
      'Experiência diferenciada ao cliente', 'Priorização da saúde de cabelos/unhas/pele', 'Clareza na apresentação de serviços e valores',
      'Resolução de conflitos e insatisfações', 'Pós-atendimento e acompanhamento',
      'Chama o cliente pelo nome e faz a saudação de boas-vindas',
      'Oferece água, café, chá e o cardápio',
      'Discrição: é cordial sem entrar na intimidade do cliente',
      'Lança o serviço no sistema antes de liberar o cliente',
      'Leva o cliente à vitrine, mostra o que foi usado e sugere o que levar para casa',
      'Acompanha o cliente até a recepção e se despede',
    ]),
    // ── Tema que a ficha não cobria de jeito nenhum ──────────────────────────
    // Num salão, EPI, esterilização de alicate e limpeza entre atendimentos
    // não são detalhe: é o que separa o salão sério do que pega infecção.
    cat('Higiene, Segurança e Apresentação', '#0d9488', [
      'Uso dos EPIs exigidos pela função (máscara, luvas, sapato fechado)',
      'Esterilização dos instrumentos e limpeza dos utensílios entre atendimentos',
      'Estação de trabalho limpa, organizada e bem equipada',
      'Limpeza do ambiente depois de usar',
      'Apresentação pessoal: uniforme, cabelo e maquiagem alinhados',
    ]),
    cat('Fidelização e Relacionamento com Clientes', '#ea580c', [
      'Taxa de fidelização (meta ≥ 55%)', 'Taxa de retorno dos clientes', 'Frequência média dos retornos',
      'Índice de satisfação dos clientes', 'Baixo número de reclamações',
    ]),
    cat('Resultados e Crescimento Financeiro', '#0369a1', [
      'Crescimento do faturamento (meta mín. 8%/mês)', 'Ticket médio', 'Quantidade de clientes atendidos',
      'Taxa de ocupação da agenda', 'Venda de produtos e serviços complementares', 'Evolução do faturamento ao longo do tempo',
    ]),
    cat('Sustentabilidade', '#65a30d', [
      'Desliga a torneira enquanto lava o cabelo do cliente',
      'Tira da tomada os equipamentos que não estão em uso',
      'Explica ao cliente as práticas e os produtos sustentáveis do salão',
    ]),

    // ── Blocos TÉCNICOS: cada um só aparece para o cargo dele ────────────────
    //
    // Os nomes de cargo saem do cadastro de profissionais. Cargo que não bate
    // com nenhum bloco responde só as seções gerais -- é o caso da recepção,
    // do administrativo e dos serviços gerais, que não têm técnica de bancada.
    // Para criar um bloco novo, basta acrescentar a seção no editor e marcar
    // o cargo; nada aqui precisa mudar.
    cat('Técnica — Cabeleireiro', '#7c3aed', [
      'Domínio de corte, coloração, penteados e tratamentos capilares',
      'Tem as ferramentas do serviço (secador, chapinha, babyliss, escovas, pentes, clips, papéis)',
      'Usa as ferramentas e os produtos de forma eficaz',
      'Precisão e consistência na execução dos serviços',
      'Agilidade na execução dos serviços',
      'Faz as perguntas certas ao cliente e escuta com atenção',
      'Aconselha o cliente sobre serviços e cuidados capilares conforme a necessidade',
    ], ['Cabeleireiro']),
    cat('Técnica — Manicure e Pedicure', '#be185d', [
      'Cutilagem na técnica correta, sem machucar o cliente',
      'Lixa as unhas com precisão, no formato combinado com o cliente',
      'Aplicação de esmalte e técnicas de decoração (nail art, francesinha)',
      'Acabamento: limpeza, óleo ou spray e hidratação das mãos',
      'Carrinho abastecido e variado (esmaltes, removedores, cremes e óleos)',
      'Respeita os limites do protocolo de manicure e pedicure',
    ], ['Manicure']),
    cat('Técnica — Assistente', '#0e7490', [
      'Domínio de modelagem, lavatório e tratamentos capilares',
      'Tem as ferramentas do serviço e as usa de forma eficaz',
      'Precisão e consistência na execução dos serviços',
      'Agilidade na execução dos serviços',
    ], ['Assistente']),
  ],
}

export const CLASSIF_AVAL: Faixa[] = [
  { min: 90, txt: 'Profissional Destaque', cor: '#16a34a', emoji: '' },
  { min: 80, txt: 'Excelente desempenho', cor: '#0891b2', emoji: '' },
  { min: 70, txt: 'Bom desempenho', cor: '#65a30d', emoji: '' },
  { min: 60, txt: 'Necessita desenvolvimento', cor: '#f59e0b', emoji: '' },
  { min: 0, txt: 'Plano de ação imediato', cor: '#ef4444', emoji: '' },
]
export function classificarAval(pct: number, faixas: Faixa[] = CLASSIF_AVAL): Faixa {
  const f = [...(faixas && faixas.length ? faixas : CLASSIF_AVAL)].sort((a, b) => b.min - a.min)
  return f.find(c => pct >= c.min) || f[f.length - 1]
}
