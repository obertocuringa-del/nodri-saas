// Catálogo COMPLETO de permissões/ocultações do sistema.
// Padrão: usuário novo nasce SEM nada liberado; o dono libera o que quiser.
// Para adicionar uma nova área no futuro, basta incluir um item aqui.

export interface PermItem { chave: string; label: string }
export interface PermGrupo { grupo: string; itens: PermItem[] }

export const CATALOGO_PERMISSOES: PermGrupo[] = [
  {
    grupo: 'Páginas principais', itens: [
      { chave: 'profissionais', label: 'Profissionais' },
      { chave: 'servicos', label: 'Serviços do Salão' },
      { chave: 'lista_espera', label: 'Lista de Espera' },
      { chave: 'aniversariantes', label: 'Aniversariantes do Mês' },
      { chave: 'pendencias', label: 'Pendências' },
      { chave: 'feedback_cliente', label: 'Feedback de Cliente' },
      { chave: 'feedback_prof', label: 'Feedback Profissional' },
      { chave: 'relatorios', label: 'Relatórios' },
      { chave: 'calculadora', label: 'Calculadora de Custo' },
      { chave: 'academia', label: 'Academia' },
      { chave: 'checklist', label: 'Check List' },
      { chave: 'administrativo', label: 'Salão Administrativo' },
      { chave: 'ia', label: 'Assistente / IA' },
    ]
  },
  {
    grupo: 'Salão Administrativo — abas', itens: [
      { chave: 'adm_listas', label: 'Listas (rodízio de serviços)' },
      { chave: 'adm_servicos_valores', label: 'Serviços Internos (Valores)' },
      { chave: 'adm_tratamentos', label: 'Tratamentos Dosagem' },
      { chave: 'adm_pacotes', label: 'Preço de Pacotes' },
      { chave: 'adm_telefones', label: 'Telefones Importantes' },
      { chave: 'adm_ata', label: 'Ata de Reunião' },
      { chave: 'adm_escala', label: 'Escala de Trabalho' },
      { chave: 'adm_feriados', label: 'Escala de Feriados' },
      { chave: 'adm_pop', label: 'POP (Procedimentos)' },
      { chave: 'adm_senhas', label: 'Senhas' },
    ]
  },
  {
    grupo: 'Profissionais — áreas', itens: [
      { chave: 'prof_cadastrar', label: 'Cadastrar / editar profissional' },
      { chave: 'prof_lista', label: 'Lista de profissionais' },
      { chave: 'prof_categorias', label: 'Gerenciar categorias' },
      { chave: 'prof_abertura', label: 'Abertura de conta bancária' },
      { chave: 'prof_cnpj', label: 'CNPJ' },
      { chave: 'prof_clt', label: 'CLT (e férias)' },
      { chave: 'prof_entrevista', label: 'Ficha para entrevista' },
      { chave: 'prof_contratacao', label: 'Processo de contratação' },
      { chave: 'prof_materiais', label: 'Materiais para trabalho' },
      { chave: 'prof_perfil_ideal', label: 'Perfil ideal de profissional' },
      { chave: 'prof_horarios', label: 'Horários e folgas' },
      { chave: 'prof_distrato', label: 'Distrato' },
      { chave: 'prof_contrato', label: 'Contrato de trabalho' },
      { chave: 'prof_certificados', label: 'Certificados' },
      { chave: 'prof_carreira', label: 'Plano de carreira' },
      { chave: 'prof_avaliar', label: 'Avaliar profissional' },
      { chave: 'prof_faturamento', label: 'Faturamento do profissional' },
      { chave: 'prof_ocorrencias', label: 'Ocorrências do profissional' },
      { chave: 'prof_metas', label: 'Metas do profissional' },
    ]
  },
  {
    grupo: 'Dados sensíveis (ocultar informação)', itens: [
      { chave: 'dado_financeiro', label: 'Valores e faturamento' },
      { chave: 'dado_comissoes', label: 'Comissões / rateio / vales' },
      { chave: 'dado_documentos', label: 'Documentos (CPF, RG, CNPJ)' },
      { chave: 'dado_bancario', label: 'Dados bancários' },
      { chave: 'dado_contratos', label: 'Contratos e distratos' },
      { chave: 'dado_avaliacoes', label: 'Avaliações e feedbacks' },
      { chave: 'dado_senhas', label: 'Senhas do salão' },
    ]
  },
  {
    grupo: 'Configurações', itens: [
      { chave: 'cfg_salao', label: 'Perfil / configurações do salão' },
      { chave: 'cfg_usuarios', label: 'Usuários & Acessos (gerenciar logins)' },
      { chave: 'cfg_ia', label: 'Configuração da IA' },
    ]
  },
]

export const TODAS_CHAVES = CATALOGO_PERMISSOES.flatMap(g => g.itens.map(i => i.chave))

// Papéis prontos (sugestões) — o dono aplica e ajusta como quiser
export const PAPEIS_SUGERIDOS: { nome: string; permissoes: string[] }[] = [
  {
    nome: 'Recepção',
    permissoes: ['lista_espera', 'aniversariantes', 'checklist', 'servicos', 'pendencias', 'feedback_cliente', 'prof_horarios'],
  },
  {
    nome: 'Gerente',
    // tudo, menos gerenciar usuários e as senhas do salão
    permissoes: TODAS_CHAVES.filter(c => !['cfg_usuarios', 'adm_senhas', 'dado_senhas'].includes(c)),
  },
  {
    nome: 'Dosadora',
    permissoes: ['administrativo', 'adm_listas', 'adm_servicos_valores', 'adm_tratamentos', 'adm_pacotes', 'prof_materiais', 'checklist'],
  },
]
