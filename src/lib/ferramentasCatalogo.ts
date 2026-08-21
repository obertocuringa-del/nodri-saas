// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DAS FERRAMENTAS DOS SETORES — só dados.
//
// Vive separado de ferramentasSetor.tsx (que desenha as telas e importa umas
// quarenta componentes) por um motivo prático: a busca global precisa desta
// lista, e não pode arrastar meio sistema junto para tê-la.
//
// Com a lista aqui, quem monta a sidebar do setor e quem monta a busca leem a
// MESMA fonte — ferramenta nova aparece nos dois lugares sozinha, sem ninguém
// lembrar de cadastrar em segundo lugar. Era exatamente o que fazia a busca
// envelhecer: ela mantinha uma cópia.
// ─────────────────────────────────────────────────────────────────────────────

import { AREAS_COMPRAS } from '@/lib/comprasEstoque'

export interface Ferramenta {
  id: string
  label: string
  perm: string            // chave de permissão (mesma usada no Administrativo)
  rota?: string           // quando a ferramenta é uma página separada
  conteudoSlug?: string   // abre a lista de POPs daquele conteúdo como sub-itens
  grupo?: string          // agrupa na sidebar (ex.: 'CLT', 'CNPJ') — abre/fecha
}

// Catálogo: id → rótulo + permissão. Os ids batem com as abas do Administrativo.
export const CATALOGO: Record<string, Ferramenta> = {
  lista_realinhamento: { id: 'lista_realinhamento', label: 'LISTA DE REALINHAMENTO', perm: 'adm_listas' },
  lista_corte:         { id: 'lista_corte',         label: 'LISTA DE CORTE',         perm: 'adm_listas' },
  lista_mechas:        { id: 'lista_mechas',        label: 'LISTA DE MECHAS',        perm: 'adm_listas' },
  lista_pigmentacao:   { id: 'lista_pigmentacao',   label: 'LISTA DE PIGMENTAÇÃO',   perm: 'adm_listas' },
  bebidas:             { id: 'bebidas',             label: 'BEBIDAS',                perm: 'adm_listas' },
  produtos:            { id: 'produtos',            label: 'CONSUMO DE PRODUTOS',    perm: 'adm_listas' },
  servinterno:         { id: 'servinterno',         label: 'SERVIÇOS INTERNOS',      perm: 'adm_listas' },
  servicos_valores:    { id: 'servicos_valores',    label: 'SERVIÇOS INTERNOS (VALORES)', perm: 'adm_servicos_valores' },
  tratamentos:         { id: 'tratamentos',         label: 'TRATAMENTOS DOSAGEM',    perm: 'adm_tratamentos' },
  valores_pacotes:     { id: 'valores_pacotes',     label: 'VALORES DE PACOTES',     perm: 'adm_valores_pacotes' },
  tabela_precos:       { id: 'tabela_precos',       label: 'TABELA DE PREÇO ATUALIZADA', perm: 'adm_tabela_precos' },
  arquivos_envio:      { id: 'arquivos_envio',      label: 'ARQUIVOS PARA ENVIO',    perm: 'adm_arquivos_envio' },
  esterilizacao_fluxo: { id: 'esterilizacao_fluxo', label: 'ESTERILIZAÇÃO',          perm: 'adm_esterilizacao' },
  kits:                { id: 'kits',                label: 'KITS PÉ E MÃO',          perm: 'adm_kits' },
  enxovais:            { id: 'enxovais',            label: 'CONTROLE DE ENXOVAIS',   perm: 'adm_enxovais' },
  cadastrar_produto:   { id: 'cadastrar_produto',   label: 'CADASTRAR PRODUTO',      perm: 'adm_cadastrar_produto' },
  etiquetas:           { id: 'etiquetas',           label: 'ETIQUETAS',              perm: 'adm_etiquetas' },
  // Licenças e Contratos Administrativos viraram uma página só, em cards
  ck_administrativo:   { id: 'ck_administrativo',   label: 'CHECK LIST — ADMINISTRATIVO', perm: 'checklist' },
  pedidos_compra:      { id: 'pedidos_compra',      label: 'PEDIDOS DE COMPRA',      perm: 'pendencias' },
  // Uma entrada por área de compra — a página é a mesma, muda a área
  ...Object.fromEntries(AREAS_COMPRAS.map(a => [`compras_${a.id}`, {
    id: `compras_${a.id}`, label: a.titulo.toUpperCase(), perm: 'adm_listas',
  }])),
  licencas_contratos:  { id: 'licencas_contratos',  label: 'LICENÇAS E CONTRATOS ADMINISTRATIVOS', perm: 'adm_listas' },
  escala:              { id: 'escala',              label: 'ESCALA DE TRABALHO',     perm: 'adm_escala' },
  // Mesma tela e MESMOS dados da Escala, mostrando só os blocos de VA/VT — que
  // saíram da Escala e passaram a ser tratados no Financeiro.
  pagamento_va_vt:     { id: 'pagamento_va_vt',     label: 'PAGAMENTO VA E VT',      perm: 'adm_escala' },
  feriados:            { id: 'feriados',            label: 'ESCALA DE FERIADOS',     perm: 'adm_feriados' },
  ata:                 { id: 'ata',                 label: 'ATA DE REUNIÃO',         perm: 'adm_ata' },
  senhas:              { id: 'senhas',              label: 'SENHAS',                 perm: 'adm_senhas' },
  telefones:           { id: 'telefones',           label: 'TELEFONES IMPORTANTES',  perm: 'adm_telefones' },
  desconto_profissional: { id: 'desconto_profissional', label: 'DESCONTO PROFISSIONAL', perm: 'adm_desconto_profissional' },
  corrida_interna:     { id: 'corrida_interna',     label: 'CORRIDA INTERNA',        perm: 'adm_corrida_interna' },
  pop_cafe:            { id: 'pop_cafe',            label: 'PREPARO DE CAFÉ',        perm: 'adm_pop' },
  pop_salao:           { id: 'pop_salao',           label: 'POP SALÃO',              perm: 'adm_pop' },
  correios:            { id: 'correios',            label: 'CORREIOS',               perm: 'adm_correios' },
  // Páginas separadas — a sidebar navega em vez de abrir aqui dentro
  calendario:      { id: 'calendario',      label: 'CALENDÁRIO',              perm: 'calendario',      rota: '/salon/calendario' },
  auditoria:       { id: 'auditoria',       label: 'LOG DE AUDITORIA',        perm: 'cfg_auditoria',   rota: '/salon/auditoria' },
  lojistas:        { id: 'lojistas',        label: 'LOJISTAS (PARCERIAS)',    perm: 'lojistas',        rota: '/salon/lojistas' },
  checkprocon:     { id: 'checkprocon',     label: 'CHECK PROCON',            perm: 'checkprocon' },
  // POPs de atendimento (paginas de conteudo) — saíram do menu principal
  pop_recepcao:    { id: 'pop_recepcao',    label: 'PROCESSOS DA RECEPÇÃO',    perm: 'adm_pop', conteudoSlug: 'recepcao' },
  pop_manicure:    { id: 'pop_manicure',    label: 'PROCESSOS — MANICURE',     perm: 'adm_pop', conteudoSlug: 'manicure' },
  pop_cabelereiro: { id: 'pop_cabelereiro', label: 'PROCESSOS — CABELEIREIRO', perm: 'adm_pop', conteudoSlug: 'cabelereiro' },
  // Check List — cada categoria abre a lista já na aba certa
  ck_abertura:     { id: 'ck_abertura',     label: 'CHECK LIST — ABERTURA',       perm: 'checklist' },
  ck_intermediario:{ id: 'ck_intermediario',label: 'CHECK LIST — INTERMEDIÁRIO',  perm: 'checklist' },
  ck_fechamento:   { id: 'ck_fechamento',   label: 'CHECK LIST — FECHAMENTO',     perm: 'checklist' },
  ck_manutencao:   { id: 'ck_manutencao',   label: 'CHECK LIST — MANUTENÇÃO / LIMPEZA', perm: 'checklist' },
  ck_dosagem:      { id: 'ck_dosagem',      label: 'CHECK LIST — DOSAGEM',        perm: 'checklist' },
  ck_manut_predial:{ id: 'ck_manut_predial',label: 'CHECK LIST — MANUTENÇÃO PREDIAL', perm: 'checklist' },
  ck_coordenacao:  { id: 'ck_coordenacao',  label: 'CHECK LIST — COORDENAÇÃO',     perm: 'checklist' },
  ck_processos:    { id: 'ck_processos',    label: 'CHECK LIST — PROCESSOS & QUALIDADE', perm: 'checklist' },
  ck_cafe:         { id: 'ck_cafe',         label: 'CHECK LIST — CAFÉ',           perm: 'checklist' },
  msgs_listas:     { id: 'msgs_listas',     label: 'MENSAGENS ENVIADAS',          perm: 'profissionais' },
  pontos_ebulicao: { id: 'pontos_ebulicao', label: 'PONTOS DE EBULIÇÃO',          perm: 'checklist' },
  // Procedimentos (como lidar com a demanda): abrem como sub-itens na sidebar
  man_coordenacao: { id: 'man_coordenacao', label: 'PROCEDIMENTOS — COORDENAÇÃO', perm: 'checklist', conteudoSlug: 'manual:coordenacao' },
  man_processos:   { id: 'man_processos',   label: 'PROCEDIMENTOS — PROCESSOS & QUALIDADE', perm: 'checklist', conteudoSlug: 'manual:processos' },
  ck_gerente:      { id: 'ck_gerente',      label: 'CHECK LIST — GERENTE',        perm: 'checklist' },
  ck_coordenado:   { id: 'ck_coordenado',   label: 'CHECK LIST — COORDENADO',     perm: 'checklist' },
  ck_padrao:       { id: 'ck_padrao',       label: 'CHECK LIST — PADRÃO DE ATENDIMENTO', perm: 'checklist' },
  // Profissionais — cada secao abre dentro do setor
  pr_cadastrar:     { id: 'pr_cadastrar', label: 'CADASTRAR PROFISSIONAL', perm: 'profissionais' },
  pr_lista:         { id: 'pr_lista', label: 'LISTA DE PROFISSIONAIS', perm: 'profissionais' },
  pr_acesso:        { id: 'pr_acesso', label: 'ACESSO DOS PROFISSIONAIS', perm: 'profissionais' },
  pr_ranking:       { id: 'pr_ranking', label: 'RANKING DE AVALIAÇÕES', perm: 'profissionais' },
  pr_categorias:    { id: 'pr_categorias', label: 'GERENCIAR CATEGORIAS', perm: 'profissionais' },
  pr_abertura:      { id: 'pr_abertura', label: 'CONTAS BANCÁRIAS E PIX', perm: 'profissionais' },
  pr_entrevista:    { id: 'pr_entrevista', label: 'FICHA PARA ENTREVISTA', perm: 'profissionais', grupo: 'CNPJ' },
  pr_materiais:     { id: 'pr_materiais', label: 'MATERIAIS PARA TRABALHO', perm: 'profissionais', grupo: 'CNPJ' },
  pr_perfil:        { id: 'pr_perfil', label: 'PERFIL IDEAL DE PROFISSIONAL', perm: 'profissionais', grupo: 'CNPJ' },
  pr_horarios:      { id: 'pr_horarios', label: 'HORÁRIOS E FOLGAS', perm: 'profissionais' },
  pr_distrato:      { id: 'pr_distrato', label: 'DISTRATO', perm: 'profissionais', grupo: 'CNPJ' },
  pr_contrato:      { id: 'pr_contrato', label: 'CONTRATO DE TRABALHO', perm: 'profissionais', grupo: 'CNPJ' },
  pr_conduta:       { id: 'pr_conduta', label: 'NORMA DE CONDUTA', perm: 'profissionais', grupo: 'CNPJ' },
  pr_certificados:  { id: 'pr_certificados', label: 'CERTIFICADOS', perm: 'profissionais', grupo: 'CNPJ' },
  pr_carreira:      { id: 'pr_carreira', label: 'PLANO DE CARREIRA', perm: 'profissionais', grupo: 'CNPJ' },
  // PJ e CLT separados, para não misturar os dois regimes
  pj_cnpj:         { id: 'pj_cnpj',         label: 'PJ · CNPJ DOS PROFISSIONAIS',   perm: 'profissionais', grupo: 'CNPJ' },
  pj_contratacao:  { id: 'pj_contratacao',  label: 'PJ · PROCESSO DE CONTRATAÇÃO',  perm: 'profissionais', grupo: 'CNPJ' },
  pj_desligamento: { id: 'pj_desligamento', label: 'PJ · PROCESSO DE DESLIGAMENTO', perm: 'profissionais', grupo: 'CNPJ' },
  clt_profs:       { id: 'clt_profs',       label: 'CLT · PROFISSIONAIS (FÉRIAS)',  perm: 'profissionais', grupo: 'CLT' },
  clt_contratacao: { id: 'clt_contratacao', label: 'CLT · PROCESSO DE CONTRATAÇÃO', perm: 'profissionais', grupo: 'CLT' },
}

// Quais ferramentas pertencem a cada setor. A chave é o nome do setor
// normalizado (sem acento/maiúsculas) — casamos por "contém".
export const FERRAMENTAS_POR_SETOR: { chave: string[]; itens: string[] }[] = [
  // "Arquivos para Envio" saiu da sidebar da Recepção. Segue no catálogo/banco.
  { chave: ['RECEPCAO'], itens: ['ck_abertura', 'ck_intermediario', 'ck_fechamento', 'lista_realinhamento', 'lista_corte', 'lista_mechas', 'lista_pigmentacao', 'pontos_ebulicao', 'msgs_listas', 'bebidas', 'valores_pacotes'] },
  { chave: ['DOSAGEM'], itens: ['ck_dosagem', 'produtos', 'servinterno', 'servicos_valores', 'tratamentos', 'esterilizacao_fluxo', 'kits', 'enxovais'] },
  // Uma página por área de compra (lista de reposição + pedidos ao Financeiro)
  { chave: ['COMPRAS', 'ESTOQUE'], itens: AREAS_COMPRAS.map(a => `compras_${a.id}`) },
  // Etiquetas saiu daqui: virou sub-botão de "Organização das pastas" (SUBDEMANDAS).
  { chave: ['ADMINISTRATIVO'], itens: ['ck_administrativo', 'licencas_contratos', 'escala', 'feriados', 'ata', 'senhas', 'telefones', 'calendario', 'pontos_ebulicao', 'msgs_listas', 'auditoria'] },
  { chave: ['FINANCEIRO'], itens: ['pr_abertura', 'desconto_profissional', 'pagamento_va_vt', 'pedidos_compra'] },
  { chave: ['GERENCIA', 'GERENTE'], itens: ['ck_gerente', 'corrida_interna', 'pontos_ebulicao', 'msgs_listas'] },
  { chave: ['PROCESSO', 'QUALIDADE'], itens: ['ck_processos', 'man_processos', 'pr_ranking', 'ck_padrao', 'pop_cafe', 'pop_salao', 'checkprocon', 'pop_recepcao', 'pop_manicure', 'pop_cabelereiro'] },
  { chave: ['COMERCIAL', 'VENDAS'], itens: ['lojistas'] },
  { chave: ['RH', 'GESTAO DE PESSOAS', 'RECURSOS HUMANOS'], itens: ['pr_lista', 'pr_cadastrar', 'pj_cnpj', 'pj_contratacao', 'pj_desligamento', 'clt_profs', 'clt_contratacao', 'pr_acesso', 'pr_categorias', 'pr_entrevista', 'pr_perfil', 'pr_materiais', 'pr_distrato', 'pr_contrato', 'pr_conduta', 'pr_certificados', 'pr_carreira'] },
  { chave: ['SERVICOS GERAIS', 'LIMPEZA'], itens: ['ck_manutencao'] },
  { chave: ['MANUTENCAO'], itens: ['ck_manut_predial'] },
  { chave: ['CAFE', 'COPA'], itens: ['ck_cafe', 'compras_cafe'] },
  // O CHECK LIST — COORDENADO saiu da sidebar: quem cobre a rotina agora é o
  // CHECK LIST — COORDENAÇÃO (52 categorias). A categoria antiga segue no banco.
  { chave: ['COORDENADOR', 'COORDENACAO'], itens: ['pr_horarios', 'ck_coordenacao', 'man_coordenacao'] },
]

const norm = (s: string) => (s || '').toUpperCase().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')

/** Ferramentas do setor pelo nome dele. Setor sem ferramentas devolve lista vazia. */
export function ferramentasDoSetor(nomeSetor: string): Ferramenta[] {
  const n = norm(nomeSetor)
  const grupo = FERRAMENTAS_POR_SETOR.find(g => g.chave.some(k => n.includes(k)))
  if (!grupo) return []
  return grupo.itens.map(id => CATALOGO[id]).filter(Boolean)
}
