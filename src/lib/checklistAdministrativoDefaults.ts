// Lista-padrao do CHECK LIST - ADMINISTRATIVO.
//
// Morava dentro de ChecklistAdministrativo.tsx. Saiu para ca quando o envio
// de demandas entre setores passou a precisar semear este check list: um
// setor que recebe item sem nunca ter aberto a tela dele nao pode perder a
// lista-padrao, e importar a tela inteira so para ler os dados nao se faz.

export interface ItemAdm { id: string; texto: string; feito?: boolean; data?: string; obs?: string }
export interface BlocoAdm { id: string; titulo: string; freq: string; itens: ItemAdm[] }

const rid = () => Math.random().toString(36).slice(2, 9)

/** Monta um bloco novo — usado aqui e no botao "Acrescentar bloco" da tela. */
export const b = (titulo: string, freq: string, itens: string[]): BlocoAdm =>
  ({ id: rid(), titulo, freq, itens: itens.map(t => ({ id: rid(), texto: t })) })

export const CHECKLIST_ADMINISTRATIVO = (): BlocoAdm[] => [
  b('1. Documentação da empresa e unidade', 'Mensal', [
    'Pegar a pasta física ou digital da empresa',
    'Abrir o arquivo "Documentos Societários"',
    'Conferir se o nome empresarial no contrato social bate com o cartão CNPJ',
    'Conferir se o CNPJ no contrato social bate com o cartão CNPJ',
    'Conferir se o endereço no contrato social bate com o local atual',
    'Conferir se a atividade econômica (CNAE) está compatível com o que o salão faz',
    'Conferir se os sócios listados estão atualizados (nenhum saiu sem alteração)',
    'Conferir se os representantes legais estão atualizados',
    'Verificar se a última alteração contratual está arquivada e assinada',
    'Verificar se todas as alterações anteriores estão na pasta (histórico completo)',
    'Se for MEI, verificar se o certificado MEI está válido',
    'Conferir o comprovante de endereço do estabelecimento (luz/água no nome da empresa ou sócio)',
    'Conferir se o contrato de locação está vigente e assinado',
    'Verificar se há aditivos de locação e se estão anexados',
    'Anotar na planilha de controle a próxima renovação de locação',
  ]),
  b('2. Licenças, alvarás e autorizações', 'Semanal/Mensal', [
    'Abrir a Matriz de Licenças (planilha)',
    'Alvará de Funcionamento visível no salão e digitalizado',
    'Licença Sanitária válida (se aplicável)',
    'Certificado do Corpo de Bombeiros (AVCB/CLC) válido',
    'Licença Ambiental (se aplicável, ex.: resíduos químicos)',
    'Cadastro Municipal (ISS) ativo',
    'Cadastro Estadual (ICMS) ativo, se aplicável',
    'Para cada licença: anotar número do documento',
    'Para cada licença: anotar órgão emissor',
    'Para cada licença: programar alerta 30 dias antes do vencimento',
    'Verificar protocolos de solicitação em andamento junto aos órgãos públicos',
    'Verificar comunicações recebidas de órgãos públicos não abertas ou pendentes',
  ]),
  b('3. Contratos e vencimentos', 'Semanal', [
    'Abrir a Pasta Central de Contratos (física ou drive)',
    'Locação — vigente? vence em?',
    'Prestação de serviços (contabilidade, assessoria)',
    'Manutenção (ar-condicionado, máquinas, elevador)',
    'Limpeza terceirizada',
    'Segurança (se houver)',
    'Telefonia e internet',
    'Software / sistema de gestão',
    'Máquinas e equipamentos (leasing ou aluguel)',
    'Publicidade e marketing',
    'Consultorias',
    'Parcerias',
    'Para cada contrato: verificar se há aditivos anexados',
    'Para cada contrato: verificar anexos (escopos, tabelas de preço)',
    'Para cada contrato: anotar o responsável interno (quem gerencia)',
    'Para cada contrato: verificar índice de reajuste (se aplicável)',
    'Programar revisão de cada contrato 60 dias antes do término',
  ]),
  b('4. Procurações e representações', 'Mensal', [
    'Verificar se há procuração vigente para representantes legais',
    'Procuração assinada e reconhecida em cartório (se necessário)',
    'Procuração arquivada (físico + digital)',
    'Procuração para contador ou advogado agir em nome da empresa',
    'Representante comercial: verificar procuração ou contrato',
    'Anotar a data de validade da procuração',
    'Programar renovação 30 dias antes do vencimento',
  ]),
  b('5. Arquivo físico e digital', 'Diário/Semanal', [
    'Todos os documentos recebidos no dia foram digitalizados',
    'Documentos digitalizados nomeados corretamente (ex.: Contrato_Locacao_2026_ASSINADO.pdf)',
    'Documentos salvos em pasta organizada (1_Societarios / 2_Licencas / 3_Contratos)',
    'Backup em nuvem (Google Drive, OneDrive…)',
    'Backup local (HD externo ou servidor)',
    'Documentos físicos em pastas etiquetadas e organizadas',
    'Nenhum documento solto na mesa ou gaveta sem arquivamento',
    'Registrar no índice o local físico de cada documento',
  ]),
  b('6. Prazos e pendências administrativas', 'Diário', [
    'Abrir a planilha de prazos e pendências',
    'Listar todas as pendências abertas',
    'Verificar se há prazo vencido hoje',
    'Verificar se há prazo vencendo em 5 dias',
    'Verificar documento pendente de assinatura (sócios, direção)',
    'Verificar solicitação de órgão público sem resposta',
    'Verificar notificação recebida não tratada',
    'Atualizar o status de cada pendência (aberta / em andamento / concluída)',
    'Definir a próxima ação para cada pendência',
  ]),
  b('7. Processos, POPs, políticas e formulários', 'Mensal/Trimestral', [
    'Abrir a pasta "POPs e Políticas"',
    'POP de Arquivo e Documentos atualizado',
    'POP de Controle de Licenças atualizado',
    'POP de Controle de Contratos atualizado',
    'POP de Recebimento e Envio de Documentos atualizado',
    'Política de Conservação de Documentos (prazos de guarda) definida',
    'Formulários padronizados disponíveis (solicitação de compra, requisição)',
    'Nenhum formulário desatualizado em uso',
    'Registrar a data da próxima revisão dos POPs',
  ]),
  b('8. Atas, reuniões e decisões da direção', 'Conforme necessidade', [
    'Ata da última reunião redigida',
    'Ata assinada pelos participantes',
    'Ata arquivada (físico + digital)',
    'Decisões tomadas registradas e com responsável',
    'Decisões sendo executadas (checklist de acompanhamento)',
    'Decisão que exija alteração contratual: processo iniciado',
    'Decisão que exija nova licença: processo iniciado',
  ]),
  b('9. Patrimônio administrativo', 'Mensal/Anual', [
    'Abrir a planilha de patrimônio',
    'Todos os equipamentos listados (móveis, computadores, máquinas)',
    'Cada item com nota fiscal anexada',
    'Cada item com número de patrimônio etiquetado',
    'Itens sem localização (emprestados, perdidos)',
    'Itens danificados que precisam de baixa ou reparo',
    'Seguro para bens de alto valor',
    'Inventário físico (conferir item por item)',
  ]),
  b('10. Auditoria e relatório administrativo', 'Mensal/Trimestral', [
    'Revisar todos os checklists acima e marcar pendências',
    'Gerar relatório de pendências administrativas para a direção',
    'Gerar relatório de contratos vencendo nos próximos 90 dias',
    'Gerar relatório de licenças vencendo nos próximos 90 dias',
    'Gerar indicadores administrativos (% digitalizado, % de prazos cumpridos)',
    'Identificar não conformidades (documento faltando, prazo perdido)',
    'Registrar ações corretivas para cada não conformidade',
    'Entregar o relatório consolidado para a direção',
    'Arquivar o relatório na pasta "Auditoria e Relatórios"',
  ]),
]
