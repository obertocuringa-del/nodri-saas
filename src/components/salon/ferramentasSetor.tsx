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
import ProdutosVencidos from '@/components/salon/ProdutosVencidos'
import EscalaTrabalhoLista from '@/components/salon/EscalaTrabalhoLista'
import EscalaFeriadosLista from '@/components/salon/EscalaFeriadosLista'
import ListaBebidas from '@/components/salon/ListaBebidas'
import ListaTelefones from '@/components/salon/ListaTelefones'
import ListaPrecoServicos from '@/components/salon/ListaPrecoServicos'
import ValoresPacotesLista from '@/components/salon/ValoresPacotesLista'
import DocEditavel from '@/components/salon/DocEditavel'
import AnexosLista from '@/components/salon/AnexosLista'
import Etiquetas from '@/components/salon/Etiquetas'
import ChecklistAdministrativo from '@/components/salon/ChecklistAdministrativo'
import DocumentosCards from '@/components/salon/DocumentosCards'
import ListaCompras from '@/components/salon/ListaCompras'
import PedidosCompraFinanceiro from '@/components/salon/PedidosCompraFinanceiro'
import { AREAS_COMPRAS } from '@/lib/comprasEstoque'
import ListaServico from '@/components/salon/ListaServico'
import MensagensEnviadas from '@/components/salon/MensagensEnviadas'
import PontosEbulicao from '@/components/salon/PontosEbulicao'
import CheckProconPainel from '@/components/salon/CheckProconPainel'
import ConteudoPopPainel from '@/components/salon/ConteudoPopPainel'
import ChecklistPainel from '@/components/salon/ChecklistPainel'
import ConsolidadoDescontos from '@/components/salon/ConsolidadoDescontos'
import ConsumoProdutosDosagem from '@/components/salon/ConsumoProdutosDosagem'
import { CHECKLIST_MANUTENCAO } from '@/lib/checklistManutencaoDefaults'
import { CHECKLIST_COORDENACAO } from '@/lib/checklistCoordenacaoDefaults'
import { CHECKLIST_PROCESSOS } from '@/lib/checklistProcessosDefaults'
import { CHECKLIST_FINANCEIRO } from '@/lib/checklistFinanceiroDefaults'
import { CHECKLIST_RH, CHECKLIST_COMERCIAL, CHECKLIST_MARKETING, CHECKLIST_TECNICA, CHECKLIST_PROFISSIONAIS } from '@/lib/checklistSetoresDefaults'
import ManualSetorPainel from '@/components/salon/ManualSetorPainel'
import ContasBancariasLista from '@/components/salon/ContasBancariasLista'
import ProfissionaisPainel from '@/components/salon/ProfissionaisPainel'
import { CAFE_BLOCOS, POP_SALAO_BLOCOS } from '@/components/salon/popDefaults'

export interface ProfSalao { id: string; nome: string; telefone: string }

const linhasVazias = (qtd: number, cols: number): GridDoc['tabelas'][0]['linhas'] =>
  Array.from({ length: qtd }, () => Array.from({ length: cols }, () => cel('')))

const D_PRODUTOS: GridDoc = { tabelas: [{ titulo: 'CONSUMO DE PRODUTOS', cabecalho: [cel('Profissional'), cel('Data'), cel('Cliente'), cel('Produto'), cel('Quantidade')], linhas: linhasVazias(12, 5) }] }
const D_SERV_INT: GridDoc = { tabelas: [{ titulo: 'SERVIÇO INTERNO / PRODUTOS UTILIZADOS', cabecalho: [cel('Data'), cel('Produto'), cel('Quantidade'), cel('Profissional'), cel('Valor')], linhas: linhasVazias(14, 5) }] }
const D_CAD_PRODUTO: GridDoc = { tabelas: [{ titulo: 'CADASTRO DE PRODUTOS', cabecalho: [cel('Produto'), cel('Marca'), cel('Categoria'), cel('Quantidade'), cel('Validade'), cel('Fornecedor'), cel('Custo'), cel('Preço de venda')], linhas: linhasVazias(14, 8), larguras: [220, 150, 150, 110, 120, 180, 110, 130] }] }
const D_DESC_PROF: GridDoc = { tabelas: [{ titulo: 'DESCONTO PROFISSIONAL', cabecalho: [cel('Profissional'), cel('Data'), cel('Motivo'), cel('Valor do desconto'), cel('Parcelas'), cel('Observação')], linhas: linhasVazias(14, 6), larguras: [200, 120, 280, 150, 110, 260] }] }
const D_CORREIOS: GridDoc = { tabelas: [{ titulo: 'CORREIOS', cabecalho: [cel('Data'), cel('Tipo (carta/encomenda)'), cel('Remetente'), cel('Destinatário'), cel('Código de rastreio'), cel('Status'), cel('Observação')], linhas: linhasVazias(14, 7), larguras: [110, 170, 180, 180, 180, 130, 220] }] }
const D_CORRIDA: GridDoc = { tabelas: [{ titulo: 'CORRIDA INTERNA', cabecalho: [cel('Profissional'), cel('Meta'), cel('Realizado'), cel('Pontos'), cel('Posição'), cel('Observação')], linhas: linhasVazias(14, 6), larguras: [200, 140, 140, 100, 90, 240] }] }

// Os dados do catálogo moram em @/lib/ferramentasCatalogo — arquivo sem
// componentes, para a busca global poder lê-los sem arrastar as telas junto.
// Reexportados aqui para que quem já importava daqui continue funcionando.
export type { Ferramenta } from '@/lib/ferramentasCatalogo'
export { CATALOGO, FERRAMENTAS_POR_SETOR, ferramentasDoSetor } from '@/lib/ferramentasCatalogo'

/** Renderiza o conteúdo de uma ferramenta — o mesmo componente do Administrativo. */
export function ConteudoFerramenta({ id, profsSalao, abaPop = 'cafe' }: { id: string; profsSalao: ProfSalao[]; abaPop?: string }) {
  // Áreas de compra: mesma página para todas, muda só a área (por isso fica
  // fora do switch, que precisaria de uma linha para cada).
  if (id.startsWith('compras_')) {
    const area = AREAS_COMPRAS.find(a => `compras_${a.id}` === id)
    if (area) return <ListaCompras key={id} area={area.id} titulo={area.titulo} />
  }
  switch (id) {
    case 'lista_realinhamento': return <ListaServico key="realinhamento" servico="realinhamento" label="Realinhamento" profsSalao={profsSalao} />
    case 'lista_corte':         return <ListaServico key="corte" servico="corte" label="Corte" profsSalao={profsSalao} />
    case 'lista_mechas':        return <ListaServico key="mechas" servico="mechas" label="Mechas" profsSalao={profsSalao} />
    case 'lista_pigmentacao':   return <ListaServico key="pigmentacao" servico="pigmentacao" label="Pigmentação" profsSalao={profsSalao} />
    case 'bebidas':             return <ListaBebidas key="bebidas" profsSalao={profsSalao} />
    case 'servinterno':         return <ServicoInternoLista key="servinterno" chave="servinterno" profsSalao={profsSalao} />
    case 'produtos':            return <ConsumoProdutosDosagem key="produtos" />
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
    case 'ck_administrativo':   return <ChecklistAdministrativo key="ck_adm" />
    case 'pedidos_compra':      return <PedidosCompraFinanceiro key="pedidos_compra" />
    case 'licencas_contratos':  return <DocumentosCards key="lic_contr" chave="licencas_contratos"
      titulo="Licenças e Contratos Administrativos"
      subtitulo="Alvarás, licenças, contratos e aditivos. Anexe o arquivo e compartilhe por WhatsApp ou e-mail." />
    case 'escala':              return <EscalaTrabalhoLista key="escala" chave="escala" blocos="escala" />
    case 'pagamento_va_vt':     return <EscalaTrabalhoLista key="va_vt" chave="escala" blocos="vavt" />
    case 'feriados':            return <EscalaFeriadosLista key="feriados" chave="feriados" />
    case 'ata':                 return <AtaReuniaoLista key="ata" chave="ata" profsSalao={profsSalao} />
    case 'produtos_vencidos':   return <ProdutosVencidos key="prod_venc" chave="produtos_vencidos" />
    case 'senhas':              return <SenhasLista key="senhas" chave="senhas" />
    case 'telefones':           return <ListaTelefones key="telefones" />
    case 'desconto_profissional': return <ConsolidadoDescontos key="descprof" open embutido onClose={() => { }} />
    case 'corrida_interna':     return <GridEditavel key="corrida" chave="corrida_interna" defaultDoc={D_CORRIDA} landscape />
    case 'correios':            return <GridEditavel key="correios" chave="correios" defaultDoc={D_CORREIOS} landscape />
    case 'checkprocon':         return <CheckProconPainel key="checkprocon" />
    case 'ck_abertura':         return <ChecklistPainel key="ck_abertura" categoriaFixa="Abertura" embutido />
    case 'ck_intermediario':    return <ChecklistPainel key="ck_intermediario" categoriaFixa="Intermediário" embutido />
    case 'ck_fechamento':       return <ChecklistPainel key="ck_fechamento" categoriaFixa="Fechamento" embutido />
    case 'ck_manutencao':       return <ChecklistPainel key="ck_manutencao" categoriaFixa="Manutenção / Limpeza" embutido />
    case 'ck_dosagem':          return <ChecklistPainel key="ck_dosagem" categoriaFixa="Dosagem" embutido />
    case 'ck_manut_predial':    return <ChecklistPainel key="ck_manut_predial" chave="checklist_manutencao" defaultCategorias={CHECKLIST_MANUTENCAO} semGerencia embutido />
    case 'ck_coordenacao':      return <ChecklistPainel key="ck_coordenacao" chave="checklist_coordenacao" defaultCategorias={CHECKLIST_COORDENACAO} semGerencia embutido />
    case 'ck_processos':        return <ChecklistPainel key="ck_processos" chave="checklist_processos" defaultCategorias={CHECKLIST_PROCESSOS} semGerencia embutido />
    case 'ck_financeiro':       return <ChecklistPainel key="ck_financeiro" chave="checklist_financeiro" defaultCategorias={CHECKLIST_FINANCEIRO} semGerencia embutido />
    case 'ck_rh':                  return <ChecklistPainel key="ck_rh" chave="checklist_rh" defaultCategorias={CHECKLIST_RH} semGerencia embutido />
    case 'ck_comercial':           return <ChecklistPainel key="ck_comercial" chave="checklist_comercial" defaultCategorias={CHECKLIST_COMERCIAL} semGerencia embutido />
    case 'ck_marketing':           return <ChecklistPainel key="ck_marketing" chave="checklist_marketing" defaultCategorias={CHECKLIST_MARKETING} semGerencia embutido />
    case 'ck_tecnica':             return <ChecklistPainel key="ck_tecnica" chave="checklist_tecnica" defaultCategorias={CHECKLIST_TECNICA} semGerencia embutido />
    case 'ck_profissionais':       return <ChecklistPainel key="ck_profissionais" chave="checklist_profissionais" defaultCategorias={CHECKLIST_PROFISSIONAIS} semGerencia embutido />
    // Nasce sem demanda nenhuma de propósito: a rotina da copa muda de salão
    // para salão, e lista pronta de outro lugar viraria trabalho de apagar.
    case 'ck_cafe':             return <ChecklistPainel key="ck_cafe" chave="checklist_cafe" defaultCategorias={[]} semGerencia embutido />
    case 'msgs_listas':         return <MensagensEnviadas key="msgs_listas" />
    case 'pontos_ebulicao':     return <PontosEbulicao key="pontos_ebulicao" />
    case 'ck_gerente':          return <ChecklistPainel key="ck_gerente" categoriaFixa="Gerente" embutido />
    case 'ck_coordenado':       return <ChecklistPainel key="ck_coordenado" categoriaFixa="Coordenado" embutido />
    case 'ck_padrao':           return <ChecklistPainel key="ck_padrao" categoriaFixa="Padrão de Atendimento" embutido />
    case 'pr_cadastrar':          return <ProfissionaisPainel key="pr_cadastrar" secaoFixa="cadastrar" embutido />
    case 'pr_lista':              return <ProfissionaisPainel key="pr_lista" secaoFixa="lista" embutido />
    case 'pr_acesso':             return <ProfissionaisPainel key="pr_acesso" secaoFixa="acesso_global" embutido />
    case 'pr_ranking':            return <ProfissionaisPainel key="pr_ranking" secaoFixa="ranking" embutido />
    case 'pr_categorias':         return <ProfissionaisPainel key="pr_categorias" secaoFixa="categorias" embutido />
    case 'pr_abertura':           return <ContasBancariasLista key="pr_abertura" />
    case 'pj_cnpj':               return <ProfissionaisPainel key="pj_cnpj" secaoFixa="cnpj" subFixa="cnpj" embutido />
    case 'pj_contratacao':        return <ProfissionaisPainel key="pj_contratacao" secaoFixa="cnpj" subFixa="contratacao" embutido />
    case 'pj_desligamento':       return <ProfissionaisPainel key="pj_desligamento" secaoFixa="cnpj" subFixa="desligamento" embutido />
    case 'clt_profs':             return <ProfissionaisPainel key="clt_profs" secaoFixa="clt" subFixa="clt" embutido />
    case 'clt_contratacao':       return <ProfissionaisPainel key="clt_contratacao" secaoFixa="clt" subFixa="processo" embutido />
    case 'pr_entrevista':         return <ProfissionaisPainel key="pr_entrevista" secaoFixa="entrevista" embutido />
    case 'pr_materiais':          return <ProfissionaisPainel key="pr_materiais" secaoFixa="materiais" embutido />
    case 'pr_perfil':             return <ProfissionaisPainel key="pr_perfil" secaoFixa="perfil" embutido />
    case 'pr_horarios':           return <ProfissionaisPainel key="pr_horarios" secaoFixa="horarios" embutido />
    case 'pr_distrato':           return <ProfissionaisPainel key="pr_distrato" secaoFixa="distrato" embutido />
    case 'pr_contrato':           return <ProfissionaisPainel key="pr_contrato" secaoFixa="contrato" embutido />
    case 'pr_conduta':            return <ProfissionaisPainel key="pr_conduta" secaoFixa="conduta" embutido />
    case 'pr_certificados':       return <ProfissionaisPainel key="pr_certificados" secaoFixa="certificados" embutido />
    case 'pr_carreira':           return <ProfissionaisPainel key="pr_carreira" secaoFixa="carreira" embutido />
    case 'pop_cafe':            return <DocEditavel key="pop_cafe" chave="pop_cafe" tituloPadrao="PREPARO DE SERVIÇOS — CAFÉ" blocosPadrao={CAFE_BLOCOS} />
    case 'pop_salao':           return <DocEditavel key="pop_salao" chave="pop_salao" tituloPadrao="POP — PROCEDIMENTO DE OPERAÇÃO PADRÃO" blocosPadrao={POP_SALAO_BLOCOS} comData />
    default:
      // Página de PROCEDIMENTO escolhida na sidebar: "conteudo:manual:<setor>:<i>"
      if (id.startsWith('conteudo:manual:')) {
        const [, , chaveManual, indice] = id.split(':')
        return <ManualSetorPainel key={id} chave={chaveManual} indice={indice || '0'} />
      }
      // POP de conteúdo escolhido na sidebar: "conteudo:<slug>:<docId>"
      if (id.startsWith('conteudo:')) {
        const [, slug, docId] = id.split(':')
        return <ConteudoPopPainel key={id} slug={slug} docId={docId || ''} />
      }
      return null
  }
}
