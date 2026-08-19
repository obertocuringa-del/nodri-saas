// ─────────────────────────────────────────────────────────────────────────────
// DEMANDAS DE CADA SETOR
//
// É a lista do que cada setor é responsável por fazer. Aparece na sidebar do
// setor, dentro do grupo "DEMANDAS DO SETOR".
//
// Regra: o que já existe como FERRAMENTA do setor não se repete aqui — a
// filtragem é automática (ver demandasDoSetor), comparando os nomes sem acento
// e sem maiúsculas. Assim nada fica duplicado nem some.
// ─────────────────────────────────────────────────────────────────────────────

const norm = (s: string) => (s || '').toUpperCase().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[.·]/g, '').replace(/\s+/g, ' ')

// Exportado para a busca global poder indexar as demandas: elas aparecem na
// sidebar do setor, mas não têm rota própria, então sem esta lista a busca não
// as enxerga — foi o caso da "Chancela dos Contratos", que é demanda e não
// ferramenta.
export const DEMANDAS_POR_SETOR: { chave: string[]; demandas: string[] }[] = [
  {
    chave: ['GERENCIA', 'GERENTE'], demandas: [
      'Planejamento estratégico geral da empresa',
      'Apresentação dos resultados à Direção',
    ]
  },
  {
    chave: ['ADMINISTRATIVO'], demandas: [
      'Organização das pastas', 'Apoio à sócia',
      'Chancela dos contratos', 'Coffee breaks e encontros internos',
    ]
  },
  {
    chave: ['FINANCEIRO'], demandas: [
      'DRE', 'Ponto de equilíbrio', 'Fluxo de caixa',
      'Contas a pagar', 'Previsão de despesas',
      'Guias MEI',
      'Comissões', 'Conferência de caixas',
      'Encaminhamento de informações para a Contabilidade',
    ]
  },
  {
    chave: ['CONTABIL'], demandas: [
      'Escrituração contábil', 'Apuração tributária', 'Orientação fiscal',
      'Orientação sobre folha', 'Orientação sobre encargos', 'DRE', 'Plano de contas',
      'Apuração dos impostos', 'Recebimento das informações do Financeiro',
      'Conferência das informações enviadas', 'Obrigações contábeis',
      'Orientação sobre profissionais PJ/MEI',
    ]
  },
  {
    chave: ['RH', 'GESTAO DE PESSOAS', 'RECURSOS HUMANOS'], demandas: [
      'Documentação', 'Pastas individuais', 'Admissão', 'Desligamento',
      'Acompanhamento de desempenho', 'Solicitações dos profissionais',
      'Controle de benefícios', 'Férias', 'VT', 'VA', 'Apoio à consultoria de RH',
      'Treinamentos', 'Onboarding', 'Desenvolvimento da equipe',
      'Cálculo de VT e VA', 'Períodos aquisitivos e férias',
      'Cadastro dos profissionais PJ', 'Contrato de parceria',
      'Categorias dos profissionais PJ', 'Documentação dos profissionais PJ',
      'Regularidade cadastral',
    ]
  },
  {
    chave: ['COMERCIAL', 'VENDAS'], demandas: [
      'Metas comerciais', 'Conversão', 'Follow-up', 'Reativação de clientes',
      'Novos clientes', 'Ticket médio', 'Taxa de retorno', 'Fidelização',
      'Orçamentos', 'Acompanhamento das vendas',
      'Acompanhamento de desempenho comercial', 'Estratégias para aumentar faturamento',
    ]
  },
  {
    chave: ['MARKETING'], demandas: [
      'Campanhas', 'Promoções', 'Aniversariantes', 'Listas de clientes', 'Divulgação',
      'Redes sociais', 'Comunicação das campanhas', 'Materiais promocionais',
      'Ações de relacionamento', 'Eventos', 'Cronograma de campanhas',
      'Operacionalização das ações aprovadas pela gestão',
    ]
  },
  {
    // As áreas de compra viraram ferramentas (uma página com lista + pedidos
    // para cada), então o setor não tem mais demandas soltas.
    chave: ['COMPRAS', 'ESTOQUE'], demandas: []
  },
  {
    // Demandas soltas removidas — o setor trabalha pelas ferramentas
    // (Ranking, Check List, POPs por área, Check Procon…).
    chave: ['PROCESSO', 'QUALIDADE'], demandas: []
  },
  {
    chave: ['RESPONSAVEL TECNICA', 'TECNICA'], demandas: [
      'Responsabilidade técnica', 'Padrões técnicos', 'Procedimentos técnicos',
      'Segurança', 'Normas técnicas', 'Certificados técnicos',
      'Validação de qualificações técnicas', 'Protocolos de procedimentos',
      'Controle técnico', 'Orientação técnica aos profissionais',
      'Controle dos padrões de execução',
    ]
  },
  {
    // Demandas soltas removidas da sidebar — todas elas viraram categorias do
    // Check List — Coordenação. O conteúdo já salvo segue no banco.
    chave: ['COORDENADOR', 'COORDENACAO'], demandas: []
  },
  {
    chave: ['PROFISSIONAIS'], demandas: [
      'Execução dos serviços', 'Atendimento ao cliente', 'Cumprimento dos padrões',
      'Cumprimento dos POPs', 'Organização da estação', 'Uso correto dos materiais',
      'Cumprimento das normas técnicas', 'Cumprimento das normas de conduta',
      'Participação em treinamentos', 'Manutenção da qualidade do serviço',
      'Registro correto dos serviços realizados',
      'Comunicação de necessidades ao Coordenador',
    ]
  },
  {
    // Demandas soltas removidas da sidebar — o setor trabalha pelas ferramentas
    // (Check List, listas, bebidas, pacotes). O conteúdo já salvo segue no banco.
    chave: ['RECEPCAO'], demandas: []
  },
  {
    // Demandas soltas removidas da sidebar — o setor trabalha pelo Check List.
    // O conteúdo já salvo segue no banco.
    chave: ['SERVICOS GERAIS', 'LIMPEZA'], demandas: []
  },
  {
    // Demandas soltas removidas da sidebar — o setor trabalha pelo
    // Check List — Manutenção Predial. O conteúdo já salvo segue no banco.
    chave: ['MANUTENCAO'], demandas: []
  },
  {
    // Demandas soltas removidas da sidebar — o setor trabalha pelas ferramentas
    // (Check List, Consumo de Produtos, Serviços Internos, Tratamentos,
    // Esterilização, Kits, Enxovais). O conteúdo já salvo segue no banco.
    chave: ['DOSAGEM'], demandas: []
  },
]

/** Demandas do setor, já SEM as que existem como ferramenta dele (não duplica). */
export function demandasDoSetor(nomeSetor: string, rotulosJaNaSidebar: string[] = []): string[] {
  const n = norm(nomeSetor)
  const grupo = DEMANDAS_POR_SETOR.find(g => g.chave.some(k => n.includes(k)))
  if (!grupo) return []
  const jaTem = new Set(rotulosJaNaSidebar.map(r => norm(r.replace(/^(PJ|CLT)\s*/, ''))))
  return grupo.demandas.filter(d => !jaTem.has(norm(d)))
}

/** Identificador estável da demanda (vira a chave onde a folha é salva). */
export function slugDemanda(nome: string): string {
  return norm(nome).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60)
}

/** Demandas que abrem sub-botões ao serem clicadas (slug da demanda → itens). */
export const SUBDEMANDAS: Record<string, { id: string; label: string }[]> = {
  encaminhamento_de_informacoes_para_a_contabilidade: [
    { id: 'faturamento_profissionais', label: 'FATURAMENTO DOS PROFISSIONAIS' },
    { id: 'checklist_contabilidade', label: 'CHECK LIST' },
  ],
  // Etiquetas é o passo seguinte de organizar as pastas — vive como sub-botão
  // dela em vez de ocupar uma linha própria na sidebar.
  organizacao_das_pastas: [
    { id: 'etiquetas', label: 'ETIQUETAS' },
  ],
}
