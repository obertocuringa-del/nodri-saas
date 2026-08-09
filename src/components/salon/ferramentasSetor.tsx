'use client'

// ─────────────────────────────────────────────────────────────────────────────
// FERRAMENTAS DOS SETORES
//
// Catálogo único das ferramentas que hoje vivem no Salão Administrativo, para
// que cada SETOR (departamento) possa mostrar as suas na própria sidebar.
// O conteúdo renderizado é EXATAMENTE o mesmo componente já usado no
// Administrativo — nada foi reescrito, só reunido aqui para os dois lugares
// usarem a mesma fonte.
// ─────────────────────────────────────────────────────────────────────────────

import GridEditavel, { cel, type Doc as GridDoc } from '@/components/salon/GridEditavel'
import ServicoInternoLista from '@/components/salon/ServicoInternoLista'
import EsterilizacaoPainel from '@/components/salon/EsterilizacaoPainel'
import KitsAdminLista from '@/components/salon/KitsAdminLista'
import EnxovaisLista from '@/components/salon/EnxovaisLista'
import SenhasLista from '@/components/salon/SenhasLista'
import AtaReuniaoLista from '@/components/salon/AtaReuniaoLista'
import EscalaTrabalhoLista from '@/components/salon/EscalaTrabalhoLista'
import EscalaFeriadosLista from '@/components/salon/EscalaFeriadosLista'
import ListaBebidas from '@/components/salon/ListaBebidas'
import ListaTelefones from '@/components/salon/ListaTelefones'
import ListaPrecoServicos from '@/components/salon/ListaPrecoServicos'
import ValoresPacotesLista from '@/components/salon/ValoresPacotesLista'
import DocEditavel from '@/components/salon/DocEditavel'
import AnexosLista from '@/components/salon/AnexosLista'
import Etiquetas from '@/components/salon/Etiquetas'
import ListaServico from '@/components/salon/ListaServico'
import CheckProconPainel from '@/components/salon/CheckProconPainel'
import { CAFE_BLOCOS, POP_SALAO_BLOCOS } from '@/components/salon/popDefaults'

export interface ProfSalao { id: string; nome: string; telefone: string }

const linhasVazias = (qtd: number, cols: number): GridDoc['tabelas'][0]['linhas'] =>
  Array.from({ length: qtd }, () => Array.from({ length: cols }, () => cel('')))

const D_PRODUTOS: GridDoc = { tabelas: [{ titulo: 'CONSUMO DE PRODUTOS', cabecalho: [cel('Profissional'), cel('Data'), cel('Cliente'), cel('Produto'), cel('Quantidade')], linhas: linhasVazias(12, 5) }] }
const D_SERV_INT: GridDoc = { tabelas: [{ titulo: 'SERVIÇO INTERNO / PRODUTOS UTILIZADOS', cabecalho: [cel('Data'), cel('Produto'), cel('Quantidade'), cel('Profissional'), cel('Valor')], linhas: linhasVazias(14, 5) }] }
const D_CAD_PRODUTO: GridDoc = { tabelas: [{ titulo: 'CADASTRO DE PRODUTOS', cabecalho: [cel('Produto'), cel('Marca'), cel('Categoria'), cel('Quantidade'), cel('Validade'), cel('Fornecedor'), cel('Custo'), cel('Preço de venda')], linhas: linhasVazias(14, 8), larguras: [220, 150, 150, 110, 120, 180, 110, 130] }] }
const D_DESC_PROF: GridDoc = { tabelas: [{ titulo: 'DESCONTO PROFISSIONAL', cabecalho: [cel('Profissional'), cel('Data'), cel('Motivo'), cel('Valor do desconto'), cel('Parcelas'), cel('Observação')], linhas: linhasVazias(14, 6), larguras: [200, 120, 280, 150, 110, 260] }] }
const D_CORRIDA: GridDoc = { tabelas: [{ titulo: 'CORRIDA INTERNA', cabecalho: [cel('Profissional'), cel('Meta'), cel('Realizado'), cel('Pontos'), cel('Posição'), cel('Observação')], linhas: linhasVazias(14, 6), larguras: [200, 140, 140, 100, 90, 240] }] }

export interface Ferramenta {
  id: string
  label: string
  perm: string          // chave de permissão (mesma usada no Administrativo)
  rota?: string         // quando a ferramenta é uma página separada
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
  escala:              { id: 'escala',              label: 'ESCALA DE TRABALHO',     perm: 'adm_escala' },
  feriados:            { id: 'feriados',            label: 'ESCALA DE FERIADOS',     perm: 'adm_feriados' },
  ata:                 { id: 'ata',                 label: 'ATA DE REUNIÃO',         perm: 'adm_ata' },
  senhas:              { id: 'senhas',              label: 'SENHAS',                 perm: 'adm_senhas' },
  telefones:           { id: 'telefones',           label: 'TELEFONES IMPORTANTES',  perm: 'adm_telefones' },
  desconto_profissional: { id: 'desconto_profissional', label: 'DESCONTO PROFISSIONAL', perm: 'adm_desconto_profissional' },
  corrida_interna:     { id: 'corrida_interna',     label: 'CORRIDA INTERNA',        perm: 'adm_corrida_interna' },
  pop:                 { id: 'pop',                 label: 'POP (PROCEDIMENTOS)',    perm: 'adm_pop' },
  correios:            { id: 'correios',            label: 'CORREIOS',               perm: 'adm_correios' },
  // Páginas separadas — a sidebar navega em vez de abrir aqui dentro
  calendario:      { id: 'calendario',      label: 'CALENDÁRIO',              perm: 'calendario',      rota: '/salon/calendario' },
  calendario_mkt:  { id: 'calendario_mkt',  label: 'CALENDÁRIO DE MARKETING', perm: 'calendario_mkt',  rota: '/salon/calendario-mkt' },
  auditoria:       { id: 'auditoria',       label: 'LOG DE AUDITORIA',        perm: 'cfg_auditoria',   rota: '/salon/auditoria' },
  lojistas:        { id: 'lojistas',        label: 'LOJISTAS (PARCERIAS)',    perm: 'lojistas',        rota: '/salon/lojistas' },
  checkprocon:     { id: 'checkprocon',     label: 'CHECK PROCON',            perm: 'checkprocon' },
  // POPs de atendimento (paginas de conteudo) — saíram do menu principal
  pop_recepcao:    { id: 'pop_recepcao',    label: 'PROCESSOS DA RECEPÇÃO',   perm: 'adm_pop', rota: '/conteudo/recepcao' },
  pop_manicure:    { id: 'pop_manicure',    label: 'PROCESSOS — MANICURE',    perm: 'adm_pop', rota: '/conteudo/manicure' },
  pop_cabelereiro: { id: 'pop_cabelereiro', label: 'PROCESSOS — CABELEIREIRO', perm: 'adm_pop', rota: '/conteudo/cabelereiro' },
}

// Quais ferramentas pertencem a cada setor. A chave é o nome do setor
// normalizado (sem acento/maiúsculas) — casamos por "contém".
export const FERRAMENTAS_POR_SETOR: { chave: string[]; itens: string[] }[] = [
  { chave: ['RECEPCAO'], itens: ['lista_realinhamento', 'lista_corte', 'lista_mechas', 'lista_pigmentacao', 'bebidas', 'valores_pacotes', 'arquivos_envio'] },
  { chave: ['DOSAGEM'], itens: ['produtos', 'servinterno', 'servicos_valores', 'tratamentos', 'esterilizacao_fluxo', 'kits', 'enxovais'] },
  { chave: ['COMPRAS', 'ESTOQUE'], itens: ['tabela_precos', 'cadastrar_produto'] },
  { chave: ['ADMINISTRATIVO'], itens: ['etiquetas', 'escala', 'feriados', 'ata', 'senhas', 'telefones', 'calendario', 'auditoria'] },
  { chave: ['FINANCEIRO'], itens: ['desconto_profissional', 'correios'] },
  { chave: ['GERENCIA', 'GERENTE'], itens: ['corrida_interna'] },
  { chave: ['PROCESSO', 'QUALIDADE'], itens: ['pop', 'checkprocon', 'pop_recepcao', 'pop_manicure', 'pop_cabelereiro'] },
  { chave: ['MARKETING'], itens: ['calendario_mkt'] },
  { chave: ['COMERCIAL', 'VENDAS'], itens: ['lojistas'] },
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

/** Renderiza o conteúdo de uma ferramenta — o mesmo componente do Administrativo. */
export function ConteudoFerramenta({ id, profsSalao, abaPop = 'cafe' }: { id: string; profsSalao: ProfSalao[]; abaPop?: string }) {
  switch (id) {
    case 'lista_realinhamento': return <ListaServico key="realinhamento" servico="realinhamento" label="Realinhamento" profsSalao={profsSalao} />
    case 'lista_corte':         return <ListaServico key="corte" servico="corte" label="Corte" profsSalao={profsSalao} />
    case 'lista_mechas':        return <ListaServico key="mechas" servico="mechas" label="Mechas" profsSalao={profsSalao} />
    case 'lista_pigmentacao':   return <ListaServico key="pigmentacao" servico="pigmentacao" label="Pigmentação" profsSalao={profsSalao} />
    case 'bebidas':             return <ListaBebidas key="bebidas" profsSalao={profsSalao} />
    case 'servinterno':         return <ServicoInternoLista key="servinterno" chave="servinterno" profsSalao={profsSalao} />
    case 'produtos':            return <GridEditavel key="produtos" chave="produtos" defaultDoc={D_PRODUTOS} mensal landscape />
    case 'servicos_valores':    return <ListaPrecoServicos key="precos" />
    case 'tratamentos':         return <ListaPrecoServicos key="trat" chave="tratamentos_dosagem" titulo="Tratamentos — Dosagem" comLogo />
    case 'valores_pacotes':     return <ValoresPacotesLista key="valores_pacotes" />
    case 'tabela_precos':       return <AnexosLista key="tabprecos" chave="tabela_precos_arquivos" titulo="Tabela de Preço Atualizada" campoNome="Marca" comData />
    case 'arquivos_envio':      return <AnexosLista key="arqenvio" chave="arquivos_envio_lista" titulo="Arquivos para Envio" campoNome="Nome do arquivo" comData />
    case 'esterilizacao_fluxo': return <EsterilizacaoPainel key="ester_painel" profsSalao={profsSalao} />
    case 'kits':                return <KitsAdminLista key="kits" />
    case 'enxovais':            return <EnxovaisLista key="enxovais" />
    case 'cadastrar_produto':   return <GridEditavel key="cadprod" chave="cadastrar_produto" defaultDoc={D_CAD_PRODUTO} landscape />
    case 'etiquetas':           return <Etiquetas key="etiquetas" />
    case 'escala':              return <EscalaTrabalhoLista key="escala" chave="escala" />
    case 'feriados':            return <EscalaFeriadosLista key="feriados" chave="feriados" />
    case 'ata':                 return <AtaReuniaoLista key="ata" chave="ata" profsSalao={profsSalao} />
    case 'senhas':              return <SenhasLista key="senhas" chave="senhas" />
    case 'telefones':           return <ListaTelefones key="telefones" />
    case 'desconto_profissional': return <GridEditavel key="descprof" chave="desconto_profissional" defaultDoc={D_DESC_PROF} landscape />
    case 'corrida_interna':     return <GridEditavel key="corrida" chave="corrida_interna" defaultDoc={D_CORRIDA} landscape />
    case 'checkprocon':         return <CheckProconPainel key="checkprocon" />
    case 'pop':
      return abaPop === 'salao'
        ? <DocEditavel key="pop_salao" chave="pop_salao" tituloPadrao="POP — PROCEDIMENTO DE OPERAÇÃO PADRÃO" blocosPadrao={POP_SALAO_BLOCOS} comData />
        : <DocEditavel key="pop_cafe" chave="pop_cafe" tituloPadrao="PREPARO DE SERVIÇOS — CAFÉ" blocosPadrao={CAFE_BLOCOS} />
    default: return null
  }
}
