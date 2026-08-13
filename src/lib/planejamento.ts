// Catálogo do Planejamento Estratégico Geral da Empresa.
//
// A ESTRUTURA (os 16 cards e os itens de cada um) é fixa e vive aqui. O que o
// salão preenche mês a mês — a estratégia de cada item, os prazos e o "feito" —
// fica em salao_config, uma chave por mês (planejamento_estrategico_AAAA-M).
// Assim a estrutura não é digitada de novo a cada mês e cada mês é independente.

// conteudo: texto fixo do salão (missão, visão, valores) que aparece já pronto
// como referência — o que não muda de um mês para o outro.
export interface ItemPlano { id: string; nome: string; desc: string; conteudo?: string }
export interface CardPlano {
  id: string
  icone: string
  titulo: string
  responsavel: string
  oque: string
  itens: ItemPlano[]
}

const it = (id: string, nome: string, desc: string, conteudo?: string): ItemPlano => ({ id, nome, desc, conteudo })

// Identidade do salão — texto oficial, mostrado já pronto nos itens.
const VENDEMOS = 'Beleza e autoestima — através de serviços e produtos de alta qualidade para o cabelo, a pele e o corpo.'
const MISSAO = 'Receber cada cliente de forma personalizada para elevar a autoestima.'
const VISAO = 'Ser uma casa de beleza conceito em sustentabilidade e excelência.'
const VALORES = `1º Segurança — Priorizamos a segurança em todas as nossas ações, garantindo domínio técnico, transparência e integridade, para oferecer um atendimento que preserva a saúde e a satisfação de nossos clientes.

2º Empatia — Somos dedicados a reconhecer e valorizar a singularidade de cada indivíduo, promovendo um ambiente de trabalho leve, amigável e respeitoso, comprometidos em ouvir as necessidades dos clientes com transparência e empenho, cultivando relações de lealdade e confiança.

3º Qualidade — Somos comprometidos em superar as expectativas do cliente através de um processo de melhoria contínua, baseado em ouvir atentamente os feedbacks e assumir responsabilidades em todos os níveis.

4º Educação — Investimos na educação da nossa equipe para oferecer um serviço de excelência; essa é a chave para a realização dos nossos sonhos.

5º Sustentabilidade — Adotamos medidas que minimizam o impacto ambiental, promovemos o bem-estar social e econômico, e respeitamos os recursos naturais e humanos.

6º Humildade — Reconhecemos nosso valor e o dos outros, admitimos e aprendemos com os erros, servimos com empatia, perdoamos, somos gratos e deixamos nossas realizações falarem por si.`

export const CARDS_PLANEJAMENTO: CardPlano[] = [
  {
    id: 'estrategico', icone: '🏢', titulo: 'Planejamento Estratégico Geral', responsavel: 'Direção / Proprietário',
    oque: 'O planejamento "macro" do salão: para onde a empresa vai, que resultados quer e como os setores chegam lá.',
    itens: [
      it('vendemos', 'O que vendemos?', 'A essência do que o salão entrega', VENDEMOS),
      it('missao', 'Missão', 'O propósito do salão — por que ele existe', MISSAO),
      it('visao', 'Visão', 'Onde o salão quer estar', VISAO),
      it('valores', 'Valores', 'Os princípios que guiam decisões e comportamentos', VALORES),
      it('posicionamento', 'Posicionamento', 'Como o salão quer ser percebido no mercado'),
      it('publico', 'Público-alvo', 'Quem é o cliente ideal do salão'),
      it('diferenciais', 'Diferenciais', 'O que faz o salão ser único e melhor que a concorrência'),
      it('obj_empresa', 'Objetivos da empresa', 'O que a empresa quer alcançar no período'),
      it('obj_anuais', 'Objetivos anuais', 'Metas específicas para o ano'),
      it('meta_fat', 'Metas de faturamento', 'Valor total a ser faturado'),
      it('crescimento', 'Crescimento', 'Percentual de crescimento esperado'),
      it('rentabilidade', 'Rentabilidade', 'Margem de lucro desejada'),
      it('num_clientes', 'Número de clientes', 'Meta de clientes ativos na carteira'),
      it('ticket', 'Ticket médio', 'Valor médio gasto por cliente'),
      it('retencao', 'Retenção', 'Percentual de clientes que voltam'),
      it('ocupacao', 'Ocupação da agenda', 'Percentual de ocupação desejado'),
      it('vendas_prod', 'Vendas de produtos', 'Meta de faturamento com produtos'),
      it('metas_horizonte', 'Metas anuais, mensais e trimestrais', 'Metas em diferentes horizontes de tempo'),
      it('expansao', 'Expansão', 'Planos de crescimento físico ou de serviços'),
      it('investimentos', 'Investimentos', 'Onde a empresa vai aplicar recursos'),
      it('prioridades', 'Prioridades estratégicas', 'O que é mais importante focar'),
      it('projetos', 'Grandes projetos', 'Reformas, novos serviços, parcerias, sistemas, equipamentos'),
      it('metas_deptos', 'Metas gerais dos departamentos', 'Diretrizes macro para cada setor'),
      it('plano_deptos', 'Planejamento por departamento', 'Como cada setor contribui para a estratégia'),
    ],
  },
  {
    id: 'gerencial', icone: '📊', titulo: 'Planejamento Gerencial', responsavel: 'Gerência',
    oque: 'Transforma a estratégia da Direção em metas e planos de execução para o dia a dia.',
    itens: [
      it('meta_mensal', 'Meta mensal', 'Desdobramento da meta anual em metas mensais'),
      it('meta_depto', 'Meta por departamento', 'O que cada setor precisa entregar'),
      it('meta_prof', 'Meta por profissional', 'Meta individual de cada profissional'),
      it('indicadores', 'Indicadores', 'KPIs para medir desempenho'),
      it('plano_acao', 'Plano de ação', 'O que fazer para alcançar as metas'),
      it('prazos', 'Prazos', 'Datas e prazos para cada ação'),
      it('acompanhamento', 'Acompanhamento', 'Rituais de monitoramento (reuniões, relatórios)'),
      it('correcoes', 'Correções', 'Plano de contingência para desvios'),
      it('indicadores_gerais', 'Indicadores gerais da empresa', 'Faturamento, lucro, ticket, clientes, retenção, ocupação, NPS, desempenho'),
    ],
  },
  {
    id: 'qualidade', icone: '📋', titulo: 'Planejamento de Processos e Qualidade', responsavel: 'Processo / Qualidade',
    oque: 'Planeja como os processos serão estruturados e controlados para a estratégia ser executada corretamente.',
    itens: [
      it('mapeamento', 'Mapeamento de processos', 'Todos os fluxos do salão documentados'),
      it('pops', 'POPs necessários', 'Procedimentos operacionais padrão'),
      it('padronizacao', 'Padronização', 'Garantir que todos executem do mesmo jeito'),
      it('auditorias', 'Auditorias', 'Verificação periódica da execução'),
      it('nao_conf', 'Não conformidades', 'Registro e tratamento de desvios'),
      it('melhorias', 'Melhorias', 'Plano de melhoria contínua'),
      it('ind_qualidade', 'Indicadores de qualidade', 'Métricas de qualidade dos serviços'),
      it('plano_correcao', 'Plano de correção', 'Ações corretivas para desvios'),
      it('revisao', 'Revisão de processos', 'Atualização periódica dos processos'),
      it('reclamacoes', 'Reclamações', 'Tratamento e análise de reclamações'),
      it('nps', 'NPS / Satisfação', 'Medição e plano de ação para melhoria'),
    ],
  },
  {
    id: 'tecnico', icone: '🛡️', titulo: 'Planejamento Técnico', responsavel: 'Responsável Técnica',
    oque: 'Garante a excelência e a segurança técnica dos serviços prestados.',
    itens: [
      it('padroes_tec', 'Padrões técnicos', 'Níveis de qualidade esperados em cada serviço'),
      it('seguranca', 'Segurança', 'Protocolos de segurança no atendimento'),
      it('proc_tec', 'Procedimentos técnicos', 'Passo a passo técnico de cada serviço'),
      it('conformidade', 'Conformidade técnica', 'Atendimento às normas do setor'),
      it('treino_tec', 'Treinamentos técnicos obrigatórios', 'Capacitações necessárias'),
      it('riscos', 'Controle de riscos técnicos', 'Identificação e mitigação de riscos'),
      it('atencao_tec', 'Produtos/procedimentos de atenção técnica', 'Alertas especiais'),
      it('aud_tec', 'Auditorias técnicas', 'Verificação periódica da execução técnica'),
      it('adequacoes', 'Adequações necessárias', 'Correções e atualizações técnicas'),
    ],
  },
  {
    id: 'administrativo', icone: '🗂️', titulo: 'Planejamento Administrativo', responsavel: 'Administrativo',
    oque: 'Gestão documental, contratual e institucional da empresa — a coluna vertebral burocrática.',
    itens: [
      it('documentacao', 'Documentação', 'Todos os documentos da empresa organizados'),
      it('contratos', 'Contratos', 'Prazos, renovações, revisões'),
      it('licencas', 'Licenças', 'Alvarás, vigilância sanitária, corpo de bombeiros'),
      it('prazos_adm', 'Prazos', 'Calendário de vencimentos e renovações'),
      it('arquivos', 'Arquivos', 'Organização e guarda de documentos'),
      it('procuracoes', 'Procurações', 'Registro e controle'),
      it('protocolos', 'Protocolos', 'Registros junto a órgãos públicos'),
      it('patrimonio', 'Patrimônio', 'Inventário e controle de bens'),
      it('proc_adm', 'Processos administrativos', 'Fluxos internos administrativos'),
      it('pendencias', 'Pendências', 'Controle de tudo que está em aberto'),
      it('reunioes', 'Reuniões', 'Pautas, atas, convocações'),
      it('doc_direcao', 'Documentos da direção', 'Controle de documentos societários'),
      it('institucional', 'Controle institucional', 'Certidões negativas, regularidade fiscal'),
      it('ti', 'TI / Sistemas', 'Sistema de gestão, agendamento online, backups, segurança digital'),
    ],
  },
  {
    id: 'financeiro', icone: '💰', titulo: 'Planejamento Financeiro', responsavel: 'Financeiro + Direção',
    oque: 'Toda a gestão financeira do salão — planejada separadamente.',
    itens: [
      it('orcamento', 'Orçamento', 'Planejamento de receitas e despesas'),
      it('receita', 'Receita', 'Projeção de faturamento'),
      it('despesas', 'Despesas', 'Todos os gastos fixos e variáveis'),
      it('custos', 'Custos', 'Custo dos serviços e produtos'),
      it('margem', 'Margem', 'Margem de contribuição e lucro'),
      it('fluxo', 'Fluxo de caixa', 'Projeção de entradas e saídas'),
      it('contas_pagar', 'Contas a pagar', 'Cronograma de pagamentos'),
      it('contas_receber', 'Contas a receber', 'Controle de recebimentos'),
      it('comissoes', 'Comissões', 'Cálculo e provisão de comissões'),
      it('investimentos_fin', 'Investimentos', 'Planejamento de CAPEX'),
      it('reserva', 'Reserva financeira', 'Fundo de emergência'),
      it('projecao', 'Projeção financeira', 'Cenários futuros'),
      it('ponto_eq', 'Ponto de equilíbrio', 'Cálculo do ponto de equilíbrio operacional'),
    ],
  },
  {
    id: 'compras', icone: '🛒', titulo: 'Planejamento de Compras e Estoque', responsavel: 'Compras / Estoque',
    oque: 'Aquisição e disponibilidade de produtos e materiais.',
    itens: [
      it('necessidades', 'Necessidades de compra', 'O que precisa ser comprado'),
      it('estoque_min', 'Estoque mínimo', 'Quantidade mínima para não faltar'),
      it('estoque_max', 'Estoque máximo', 'Quantidade máxima para não encalhar'),
      it('inventarios', 'Inventários', 'Controle periódico de estoque'),
      it('fornecedores', 'Fornecedores', 'Gestão de fornecedores e negociações'),
      it('criticos', 'Produtos críticos', 'Itens que não podem faltar'),
      it('consumo', 'Consumo', 'Histórico e projeção de consumo'),
      it('perdas', 'Perdas', 'Controle de vencimentos, danos, extravios'),
      it('validade', 'Validade', 'Controle de produtos com prazo'),
      it('negociacao', 'Negociação', 'Compras com melhores condições'),
      it('calendario_compras', 'Planejamento de compras', 'Calendário de compras'),
      it('demanda_futura', 'Necessidade futura', 'Projeção de demanda futura'),
    ],
  },
  {
    id: 'rh', icone: '👥', titulo: 'Planejamento de RH / Gestão de Pessoas', responsavel: 'RH',
    oque: 'Gestão completa de pessoas no salão.',
    itens: [
      it('pessoas', 'Pessoas', 'Mapeamento da equipe atual'),
      it('quadro', 'Quadro ideal', 'Quantas pessoas e com quais perfis a empresa precisa'),
      it('contratacao', 'Necessidade de contratação', 'Vagas a serem abertas'),
      it('desligamentos', 'Desligamentos', 'Planejamento de substituições'),
      it('substituicoes', 'Substituições', 'Backups para cada função'),
      it('dimensionamento', 'Dimensionamento da equipe', 'Número ideal de profissionais'),
      it('desenvolvimento', 'Desenvolvimento', 'Planos de carreira e crescimento'),
      it('treinamentos', 'Treinamentos', 'Capacitações técnicas e comportamentais'),
      it('avaliacoes', 'Avaliações', 'Processo de avaliação de desempenho'),
      it('pdi', 'Plano de desenvolvimento', 'PDI — Plano de Desenvolvimento Individual'),
      it('feedbacks', 'Feedbacks', 'Cultura de feedback contínuo'),
      it('desempenho', 'Desempenho', 'Métricas de desempenho'),
      it('metas_rh', 'Metas', 'Metas individuais e em equipe'),
      it('produtividade', 'Produtividade', 'Métricas de produtividade'),
      it('absenteismo', 'Absenteísmo', 'Controle de faltas e atrasos'),
      it('pontualidade', 'Pontualidade', 'Política e controle de pontualidade'),
      it('clima', 'Clima', 'Pesquisa de clima organizacional'),
      it('engajamento', 'Engajamento', 'Ações para aumentar engajamento'),
      it('comunicacao', 'Comunicação', 'Plano de comunicação interna'),
      it('retencao_rh', 'Retenção', 'Estratégias para reter talentos'),
      it('cultura', 'Cultura', 'Fortalecimento da cultura empresarial'),
      it('remuneracao', 'Remuneração e incentivos', 'Plano de remuneração, bônus e incentivos'),
    ],
  },
  {
    id: 'marketing', icone: '📣', titulo: 'Planejamento de Marketing', responsavel: 'Marketing',
    oque: 'Comunicação, posicionamento, atração e relacionamento com clientes.',
    itens: [
      it('anual_mkt', 'Anual', 'Planejamento estratégico anual de marketing'),
      it('posicionamento_mkt', 'Posicionamento', 'Como a marca se comunica'),
      it('marca', 'Marca', 'Gestão da identidade da marca'),
      it('estrategia_com', 'Estratégia de comunicação', 'Onde e como se comunicar'),
      it('publico_mkt', 'Público', 'Definição do público-alvo de comunicação'),
      it('canais', 'Canais', 'Instagram, TikTok, Google, WhatsApp'),
      it('mensal_mkt', 'Mensal', 'Planejamento mensal de ações'),
      it('campanhas', 'Campanhas', 'Campanhas específicas por objetivo'),
      it('conteudo', 'Conteúdo', 'Calendário de conteúdo'),
      it('datas', 'Datas comemorativas', 'Ações para datas especiais'),
      it('ofertas', 'Ofertas', 'Promoções e ofertas especiais'),
      it('trafego', 'Tráfego', 'Investimento em tráfego pago'),
      it('redes', 'Redes sociais', 'Gestão de redes sociais'),
      it('cal_comercial', 'Calendário comercial', 'Planejamento anual de ações comerciais'),
      it('aquisicao', 'Aquisição', 'Estratégias para captar novos clientes'),
      it('relacionamento', 'Relacionamento', 'Estratégias para manter e fidelizar'),
      it('objetivo_mkt', 'Objetivo', 'Objetivo claro de cada campanha'),
      it('investimento_mkt', 'Investimento', 'Orçamento de marketing'),
      it('periodo_mkt', 'Período', 'Datas e prazos'),
      it('meta_mkt', 'Meta', 'Metas de cada ação'),
      it('resultado_mkt', 'Resultado', 'Mensuração de resultados'),
    ],
  },
  {
    id: 'comercial', icone: '🤝', titulo: 'Planejamento Comercial / Vendas', responsavel: 'Comercial',
    oque: 'Vendas, conversão e faturamento. Marketing gera oportunidade; Comercial vira venda.',
    itens: [
      it('meta_vendas', 'Meta de vendas', 'Meta de volume de vendas'),
      it('meta_fat_com', 'Meta de faturamento', 'Meta financeira de vendas'),
      it('conversao', 'Conversão', 'Taxa de conversão de leads em clientes'),
      it('ticket_com', 'Ticket médio', 'Valor médio por venda'),
      it('followup', 'Follow-up', 'Acompanhamento pós-atendimento'),
      it('reativacao', 'Reativação', 'Reativar clientes inativos'),
      it('perdidos', 'Clientes perdidos', 'Análise e recuperação'),
      it('inativos', 'Clientes inativos', 'Plano de reativação'),
      it('venda_serv', 'Venda de serviços', 'Estratégias de venda de serviços'),
      it('venda_prod_com', 'Venda de produtos', 'Estratégias de venda de produtos'),
      it('camp_com', 'Campanhas comerciais', 'Campanhas específicas de vendas'),
      it('meta_recep', 'Metas da recepção', 'Metas para a equipe de recepção'),
      it('ind_com', 'Indicadores comerciais', 'KPIs de vendas'),
      it('aumentar_fat', 'Aumentar faturamento', 'Planos de crescimento de receita'),
      it('captacao', 'Captação', 'Captar novos clientes'),
      it('fidelizacao', 'Fidelização', 'Fidelizar clientes'),
    ],
  },
  {
    id: 'operacional', icone: '⚙️', titulo: 'Planejamento Operacional', responsavel: 'Coordenador Operacional + Gerência',
    oque: 'A operação diária do salão — serviços entregues com qualidade, eficiência e boa experiência.',
    itens: [
      it('capacidade', 'Capacidade de atendimento', 'Quantos atendimentos o salão consegue realizar'),
      it('horarios', 'Horários', 'Horários de funcionamento e atendimento'),
      it('escalas', 'Escalas', 'Escalas de trabalho dos profissionais'),
      it('fluxo_atend', 'Fluxo de atendimento', 'Do cliente na chegada até a saída'),
      it('org_operacao', 'Organização da operação', 'Como a operação é estruturada no dia a dia'),
      it('ocupacao_op', 'Ocupação das agendas', 'Percentual de ocupação esperado'),
      it('cumpr_pops', 'Cumprimento dos POPs', 'Garantia de execução dos procedimentos'),
      it('exp_cliente', 'Experiência do cliente', 'Jornada e pontos de contato'),
      it('gargalos', 'Gargalos', 'Identificação e eliminação de gargalos'),
      it('produtividade_op', 'Produtividade', 'Métricas de produtividade operacional'),
      it('org_setores', 'Organização dos setores', 'Estruturação física e funcional'),
      it('problemas', 'Problemas recorrentes', 'Identificação e solução de problemas frequentes'),
    ],
  },
  {
    id: 'recepcao', icone: '🛎️', titulo: 'Planejamento da Recepção', responsavel: 'Recepção (dentro do Operacional + Comercial)',
    oque: 'A Recepção tem duas funções que devem ser planejadas: operacional e comercial. Mantida dentro do Operacional + Comercial.',
    itens: [
      it('agenda', 'Agenda (operacional)', 'Organização e gestão da agenda'),
      it('acolhimento', 'Acolhimento (operacional)', 'Recepção e boas-vindas aos clientes'),
      it('org_atend', 'Organização do atendimento (operacional)', 'Fluxo de atendimento na recepção'),
      it('comunicacao_recep', 'Comunicação (operacional)', 'Comunicação com clientes e equipe'),
      it('conversao_recep', 'Conversão (comercial)', 'Transformar leads em clientes'),
      it('followup_recep', 'Follow-up (comercial)', 'Acompanhamento pós-atendimento'),
      it('reagendamento', 'Reagendamento (comercial)', 'Garantir novos agendamentos'),
      it('reativacao_recep', 'Reativação (comercial)', 'Contato com clientes inativos'),
      it('venda_recep', 'Venda (comercial)', 'Venda de serviços e produtos'),
    ],
  },
  {
    id: 'profissionais', icone: '✂️', titulo: 'Planejamento dos Profissionais', responsavel: 'Cada profissional + Gerência',
    oque: 'Planejamento individual de cada profissional — cada um deve ter o seu.',
    itens: [
      it('plano_ind', 'Plano mensal individual', 'Plano personalizado para o mês'),
      it('meta_fat_prof', 'Meta de faturamento', 'Quanto deve faturar no mês'),
      it('meta_diaria', 'Meta diária', 'Quanto deve faturar por dia'),
      it('ticket_prof', 'Ticket médio', 'Valor médio por atendimento'),
      it('serv_prior', 'Serviços prioritários', 'Quais serviços deve priorizar'),
      it('qtd_serv', 'Quantidade de serviços', 'Número de atendimentos esperados'),
      it('novos_prof', 'Clientes novos', 'Quantos deve captar'),
      it('reativacao_prof', 'Reativação', 'Quantos inativos deve reativar'),
      it('venda_prod_prof', 'Venda de produtos', 'Meta de venda de produtos'),
      it('ocupacao_prof', 'Ocupação', 'Percentual de ocupação da agenda'),
      it('comportamento', 'Comportamento', 'Comportamentos esperados'),
      it('pontualidade_prof', 'Pontualidade', 'Controle de pontualidade'),
      it('treino_prof', 'Treinamento', 'Plano de treinamento individual'),
      it('pdi_prof', 'Desenvolvimento', 'Plano de desenvolvimento individual (PDI)'),
      it('plano_acao_prof', 'Plano de ação', 'Ações específicas para alcançar as metas'),
    ],
  },
  {
    id: 'dosagem', icone: '🧪', titulo: 'Planejamento de Dosagem', responsavel: 'Dosagem (dentro do Operacional + Técnico)',
    oque: 'Controle, padronização e segurança da dosagem de produtos químicos. Mantido dentro do Operacional + Técnico.',
    itens: [
      it('formulas', 'Controle de fórmulas', 'Registro e padronização de fórmulas'),
      it('padron_dos', 'Padronização', 'Todos seguindo as mesmas fórmulas'),
      it('consumo_dos', 'Consumo', 'Controle de consumo de produtos'),
      it('erros', 'Erros', 'Registro e prevenção de erros'),
      it('desperdicio', 'Desperdício', 'Controle e redução de desperdício'),
      it('org_dos', 'Organização', 'Organização do espaço de dosagem'),
      it('seg_dos', 'Segurança', 'Protocolos de segurança na dosagem'),
      it('treino_dos', 'Treinamento', 'Treinamento em dosagem'),
      it('aud_dos', 'Auditoria', 'Auditoria periódica da dosagem'),
      it('ind_dos', 'Indicadores', 'Métricas de desempenho da dosagem'),
    ],
  },
  {
    id: 'gerais', icone: '🧹', titulo: 'Planejamento de Serviços Gerais', responsavel: 'Serviços Gerais (dentro do Operacional / Infraestrutura)',
    oque: 'Limpeza, higienização e organização dos ambientes. Mantido dentro do Operacional / Infraestrutura.',
    itens: [
      it('limpeza', 'Limpeza', 'Plano de limpeza dos ambientes'),
      it('higienizacao', 'Higienização', 'Protocolos de higienização'),
      it('rotinas', 'Rotinas', 'Rotinas diárias, semanais e mensais'),
      it('frequencia', 'Frequência', 'Frequência de cada atividade'),
      it('checklists_ger', 'Checklists', 'Listas de verificação'),
      it('materiais', 'Materiais necessários', 'Produtos e materiais de limpeza'),
      it('inspecoes', 'Inspeções', 'Verificações periódicas'),
      it('nao_conf_ger', 'Não conformidades', 'Registro de desvios'),
      it('org_amb', 'Organização dos ambientes', 'Padrão de organização'),
    ],
  },
  {
    id: 'manutencao', icone: '🔧', titulo: 'Planejamento de Manutenção', responsavel: 'Manutenção',
    oque: 'Manutenção preventiva e corretiva de equipamentos e instalações.',
    itens: [
      it('plano_anual', 'Plano anual de manutenção', 'Cronograma anual de manutenções'),
      it('equipamentos', 'Equipamentos', 'Todos os equipamentos do salão'),
      it('ar', 'Ar-condicionado', 'Manutenção de climatização'),
      it('eletrica', 'Instalações elétricas', 'Manutenção elétrica'),
      it('hidraulica', 'Hidráulica', 'Manutenção hidráulica'),
      it('mobiliario', 'Mobiliário', 'Manutenção de móveis'),
      it('equip_tec', 'Equipamentos técnicos', 'Equipamentos específicos do salão'),
      it('preventivas', 'Manutenções preventivas', 'Manutenções agendadas'),
      it('corretivas', 'Manutenções corretivas', 'Manutenções emergenciais'),
      it('vida_util', 'Vida útil', 'Planejamento de substituição de equipamentos'),
      it('garantias', 'Garantias', 'Controle de garantias'),
      it('contratos_man', 'Contratos de manutenção', 'Gestão de contratos externos'),
      it('cronograma_man', 'Cronograma', 'Calendário de manutenções'),
      it('novos_equip', 'Novos equipamentos', 'Planejamento de aquisição quando necessário'),
    ],
  },
]

export const TOTAL_ITENS = CARDS_PLANEJAMENTO.reduce((s, c) => s + c.itens.length, 0)
export const chavePlano = (ano: number, mes: number) => `planejamento_estrategico_${ano}-${mes}`
