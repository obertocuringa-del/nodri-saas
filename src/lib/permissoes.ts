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
      { chave: 'calendario', label: 'Calendário' },
      { chave: 'calendario_mkt', label: 'Calendário de Marketing' },
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
      { chave: 'adm_cadastrar_produto', label: 'Cadastrar Produto' },
      { chave: 'adm_desconto_profissional', label: 'Desconto Profissional' },
      { chave: 'adm_tabela_precos', label: 'Tabela de Preço Atualizada' },
      { chave: 'adm_arquivos_envio', label: 'Arquivos para Envio' },
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
      { chave: 'clt_exame', label: 'Exame Admissional (CLT)' },
      { chave: 'prof_faturamento', label: 'Faturamento do profissional' },
      { chave: 'prof_ocorrencias', label: 'Ocorrências do profissional' },
      { chave: 'prof_metas', label: 'Metas do profissional' },
    ]
  },
  {
    grupo: 'Relatórios — abas do topo', itens: [
      { chave: 'rel_aba_geral', label: 'Geral (faturamento, ticket, crescimentos…)' },
      { chave: 'rel_aba_metas', label: 'Metas' },
      { chave: 'rel_aba_metaprof', label: 'Meta Prof.' },
      { chave: 'rel_aba_redistribuicao', label: 'Redistribuição' },
      { chave: 'rel_aba_mais', label: 'Mais Relatórios (Em Risco, Perdidos…)' },
      { chave: 'rel_aba_unificado', label: 'Relatório Unificado Profissionais' },
    ]
  },
  {
    grupo: 'Relatórios — seções de "Mais Relatórios"', itens: [
      { chave: 'rel_risco', label: 'Em Risco' },
      { chave: 'rel_perdidos', label: 'Perdidos' },
      { chave: 'rel_vip', label: 'VIP' },
      { chave: 'rel_regular', label: 'Regular' },
      { chave: 'rel_novo', label: 'Novos' },
      { chave: 'rel_crosssell', label: 'Cross-sell' },
      { chave: 'rel_frequencia', label: 'Frequência' },
      { chave: 'rel_diasemana', label: 'Dia da Semana' },
      { chave: 'rel_recuperados', label: 'Clientes Recuperados' },
      { chave: 'rel_valores', label: 'Ver valores em R$ (LTV / dinheiro perdido)' },
    ]
  },
  {
    grupo: 'Calculadora de Custo — partes', itens: [
      { chave: 'calc_abas_extras', label: 'Abas extras (Ponto de Equilíbrio, Serviços, Catálogo, Aluguel, Gráficos)' },
      { chave: 'calc_passos', label: 'Cards de etapas (Passo 1 a 4)' },
      { chave: 'calc_config', label: 'Configuração (Faturamento / Investimento)' },
      { chave: 'calc_desp_fixas', label: 'Despesas Fixas (Indiretas) — lançar compras' },
      { chave: 'calc_desp_variaveis', label: 'Despesas Variáveis' },
      { chave: 'calc_provisao', label: 'Provisão Mensal (13º, férias, FGTS)' },
      { chave: 'calc_outras_despesas', label: 'Outras Despesas / Gasto de Capital' },
      { chave: 'calc_resultado', label: 'Resultado / Diagnóstico' },
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

// Gera a chave de permissão de um módulo a partir do nome (usada no dashboard e nas permissões)
export function chaveModulo(nome: string): string {
  const n = (nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (n.includes('profission')) return 'profissionais'
  if (n.includes('relator')) return 'relatorios'
  if (n.includes('calcul') || n.includes('custo')) return 'calculadora'
  if (n.includes('academ')) return 'academia'
  if (n.includes('check')) return 'checklist'
  if (n.includes('administrativ')) return 'administrativo'
  if (n.includes('espera')) return 'lista_espera'
  if (n.includes('aniversar')) return 'aniversariantes'
  if (n.includes('pendenc')) return 'pendencias'
  if (n.includes('feedback') && n.includes('profission')) return 'feedback_prof'
  if (n.includes('feedback')) return 'feedback_cliente'
  return 'modulo_' + n.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24)
}

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
  {
    nome: 'Lançador de Compras',
    permissoes: ['calculadora', 'calc_desp_fixas'],
  },
  {
    nome: 'Limpeza',
    permissoes: ['checklist'],
  },
  {
    nome: 'Caixa',
    permissoes: ['servicos', 'lista_espera', 'aniversariantes', 'pendencias', 'calculadora', 'calc_desp_fixas'],
  },
]
