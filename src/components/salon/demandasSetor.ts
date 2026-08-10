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

const MAPA: { chave: string[]; demandas: string[] }[] = [
  {
    chave: ['GERENCIA', 'GERENTE'], demandas: [
      'Planejamento geral da empresa', 'Acompanhamento de resultados',
      'Cobrança dos responsáveis de cada setor', 'Acompanhamento das metas',
      'Análise dos relatórios', 'Aprovação operacional de demandas',
      'Reuniões de alinhamento', 'Acompanhamento do desempenho dos setores',
      'Apresentação dos resultados à Direção', 'Definição dos responsáveis e prazos',
      'Metas de crescimento do salão',
    ]
  },
  {
    chave: ['ADMINISTRATIVO'], demandas: [
      'Organização de documentos da empresa', 'CNPJ da empresa', 'Licenças',
      'Contratos administrativos', 'Arquivamento', 'Organização das pastas',
      'Controle de documentos', 'Calendário de obrigações',
      'Apoio documental à Gerência', 'Apoio documental à Direção',
      'Interface administrativa com terceiros',
      'Organização de compromissos e documentos da sócia', 'Apoio à sócia',
      'Chancela dos contratos', 'Planilhas de gestão', 'Cadastros no sistema',
      'Coffee breaks e encontros internos',
    ]
  },
  {
    chave: ['FINANCEIRO'], demandas: [
      'Contas a pagar', 'Previsão de despesas',
      'Impostos e guias', 'Guias MEI', 'Faturamento dos profissionais parceiros',
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
    chave: ['COMPRAS', 'ESTOQUE'], demandas: [
      'Compras', 'Fornecedores', 'Cotação', 'Materiais', 'Controle de estoque',
      'Entrada de produtos', 'Saída de produtos', 'Inventário',
      'Materiais de uso dos profissionais', 'Controle de consumo', 'Reposição',
      'Organização do estoque', 'Controle de produtos utilizados nos procedimentos',
    ]
  },
  {
    chave: ['PROCESSO', 'QUALIDADE'], demandas: [
      'POPs', 'Padronização', 'Checklists', 'Auditorias', 'Não conformidades',
      'Melhoria contínua', 'Avaliação dos processos', 'Controle de qualidade',
      'Experiência do cliente', 'Indicadores de qualidade',
      'Conferência das listas de controle', 'Auditoria das rotinas',
      'Acompanhamento de cumprimento dos processos',
    ]
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
    chave: ['COORDENADOR', 'COORDENACAO'], demandas: [
      'Escalas', 'Folgas', 'Domingos', 'Feriados', 'Ausências', 'Substituições',
      'Organização das agendas', 'Fluxo operacional', 'Cumprimento dos processos',
      'Organização da equipe', 'Acompanhamento da recepção',
      'Acompanhamento dos profissionais', 'Acompanhamento dos Serviços Gerais',
      'Acompanhamento da manutenção', 'Cronograma de produção',
      'Conferência da execução das rotinas', 'Comunicação de problemas à Gerência',
    ]
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
    chave: ['RECEPCAO'], demandas: [
      'Atendimento ao cliente', 'Agendamento', 'Confirmações', 'Organização da agenda',
      'Cadastro de clientes', 'Recepção', 'Check-in', 'Check-out',
      'Comunicação com profissionais', 'Organização do fluxo de atendimento',
      'Follow-up', 'Reagendamento', 'Controle da agenda', 'Comunicação de atrasos',
      'Organização das listas de clientes',
    ]
  },
  {
    chave: ['SERVICOS GERAIS', 'LIMPEZA'], demandas: [
      'Limpeza', 'Higienização', 'Organização dos ambientes', 'Banheiros',
      'Áreas comuns', 'Apoio operacional', 'Reposição de materiais de limpeza',
      'Organização das áreas de trabalho', 'Apoio às rotinas do salão',
    ]
  },
  {
    chave: ['MANUTENCAO'], demandas: [
      'Manutenção preventiva', 'Manutenção corretiva', 'Equipamentos', 'Instalações',
      'Reparos', 'Chamados técnicos', 'Acompanhamento de prestadores',
      'Controle de manutenção', 'Prevenção de falhas', 'Conservação da estrutura física',
    ]
  },
  {
    chave: ['DOSAGEM'], demandas: [
      'Preparação de produtos', 'Dosagens', 'Fórmulas', 'Padrões de mistura',
      'Controle técnico das misturas', 'Registro de utilização',
      'Padronização das formulações', 'Controle de desperdício',
      'Controle de consumo de produtos',
      'Cumprimento dos protocolos definidos pela Responsável Técnica',
    ]
  },
]

/** Demandas do setor, já SEM as que existem como ferramenta dele (não duplica). */
export function demandasDoSetor(nomeSetor: string, rotulosJaNaSidebar: string[] = []): string[] {
  const n = norm(nomeSetor)
  const grupo = MAPA.find(g => g.chave.some(k => n.includes(k)))
  if (!grupo) return []
  const jaTem = new Set(rotulosJaNaSidebar.map(r => norm(r.replace(/^(PJ|CLT)\s*/, ''))))
  return grupo.demandas.filter(d => !jaTem.has(norm(d)))
}

/** Identificador estável da demanda (vira a chave onde a folha é salva). */
export function slugDemanda(nome: string): string {
  return norm(nome).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60)
}
