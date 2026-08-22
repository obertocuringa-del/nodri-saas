// Modelos padrão dos processos (PJ/MEI) e do perfil/avaliação.
// Estrutura compatível com ProcessoContratacao (ProcDoc).
import type { ProcDoc } from './ProcessoContratacao'

let _i = 0
const id = () => 'd' + (++_i)

export const PJ_CONTRATACAO: ProcDoc = {
  secoes: [
    {
      id: id(), titulo: 'CONTRATAÇÃO DE PROFISSIONAL PARCEIRO (PJ/MEI)', cor: '#16a34a', passos: [
        { id: id(), titulo: 'Etapa 1 — Entrevista e Aprovação', texto: 'Realizar entrevista com: gerente da unidade e proprietário(a).\n\nObjetivos:\n• Avaliar competências técnicas.\n• Avaliar perfil comportamental.\n• Verificar alinhamento com a cultura da empresa.\n• Definir percentual de comissão, horários e regras da parceria.\n\nApós a entrevista, registrar no sistema: Aprovado ou Reprovado.' },
        { id: id(), titulo: 'Etapa 2 — Definição das Condições da Parceria', texto: 'Definir e registrar:\n• Percentual de comissão.\n• Horário de trabalho.\n• Dias de trabalho.\n• Regras da parceria.\n• Data prevista para início das atividades.' },
        { id: id(), titulo: 'Etapa 3 — Recebimento e Conferência da Documentação', texto: 'DOCUMENTAÇÃO PESSOAL: RG, CPF, Título de Eleitor, comprovante de residência atualizado.\n\nDOCUMENTAÇÃO EMPRESARIAL: Cartão CNPJ, CCMEI (quando MEI), Contrato Social (quando não for MEI), Inscrição Municipal (quando aplicável), dados bancários da pessoa jurídica.\n\nDOCUMENTAÇÃO TÉCNICA: certificados profissionais, diplomas e cursos complementares.' },
        { id: id(), titulo: 'Etapa 4 — Análise Contábil e Jurídica', texto: 'Encaminhar a documentação para a contabilidade para:\n• Conferência da documentação.\n• Verificar se o CNPJ está ATIVO.\n• Verificar se o CNAE é compatível com os serviços prestados.\n• Verificar a regularidade fiscal.\n• Validar a emissão de notas fiscais.\n\nSomente após a aprovação da contabilidade a contratação poderá prosseguir.' },
        { id: id(), titulo: 'Etapa 5 — Elaboração e Assinatura do Contrato', texto: 'A administração elabora o Contrato de Parceria Profissional (2 vias). O profissional lê e assina as duas vias.\n\nAlém do contrato, assinar: Termo de Confidencialidade, Termo de Uso de Imagem, Termo de Ciência das Normas Internas e Termo de Responsabilidade sobre Senhas e Acessos.' },
        { id: id(), titulo: 'Etapa 6 — Chancela Sindical', texto: 'Após a assinatura, encaminhar para:\n• Sindicato Patronal.\n• Sindicato Laboral.\n\nApós a chancela: arquivar uma via na empresa e entregar uma via ao profissional.' },
        { id: id(), titulo: 'Etapa 7 — Rateio das Despesas Sindicais', texto: 'Após a chancela:\n• Lançar os valores das taxas sindicais no sistema.\n• Realizar o rateio das despesas conforme regras internas, dividido em 12 parcelas.' },
        { id: id(), titulo: 'Etapa 8 — Cadastros e Acessos', texto: 'Cadastrar o profissional em: sistema interno, agenda online, sistema financeiro e sistema de comissões.\nCriar: login, senha e permissões de acesso.' },
        { id: id(), titulo: 'Etapa 9 — Emissão de Notas Fiscais', texto: 'Solicitar à contabilidade a criação do acesso para emissão de Nota Fiscal Eletrônica e a orientação ao profissional quanto à emissão.\nRegistrar login e senha em local seguro.' },
        { id: id(), titulo: 'Etapa 10 — Atualização dos Controles Internos', texto: 'Atualizar: lista de café, horário de trabalho, escala de folgas, lista de aniversariantes, cadastro de endereço, cadastro do CNPJ, dados bancários, lista telefônica interna e grupo de comunicação interna.' },
        { id: id(), titulo: 'Etapa 11 — Preparação para Início', texto: 'Antes do primeiro dia, verificar: uniforme disponível, armário disponível, materiais de trabalho disponíveis, cadastro concluído em todos os sistemas, acessos liberados e equipe comunicada.' },
        { id: id(), titulo: 'Etapa 12 — Integração e Início das Atividades', texto: 'No primeiro dia:\n• Apresentar a empresa, missão, visão e valores.\n• Apresentar a equipe e as regras internas.\n• Treinar sobre os sistemas utilizados.\n• Explicar regras financeiras, comissões e procedimentos operacionais.\n• Realizar tour pelas dependências do salão.' },
        { id: id(), titulo: 'Etapa 13 — Dados Bancários', texto: 'Quando necessário:\n• Emitir carta para abertura de conta no Banco Bradesco (use o botão “ Carta de Abertura de Conta” no topo).\n• Registrar os dados bancários do profissional.' },
        { id: id(), titulo: 'Etapa 14 — Acompanhamento Inicial', texto: 'Acompanhar o profissional após 30 e 90 dias.\nAvaliar: qualidade técnica, relacionamento com clientes, relacionamento com a equipe, cumprimento das regras internas e resultados financeiros.' },
      ],
    },
    {
      id: id(), titulo: 'INDICADORES DE GESTÃO', cor: '#5b4fcf', passos: [
        { id: id(), titulo: 'Acompanhar mensalmente', texto: '• Tempo médio de contratação\n• Taxa de aprovação\n• Taxa de desligamento\n• Tempo médio de permanência\n• Faturamento médio por profissional\n• Índice de faltas\n• Índice de satisfação dos clientes\n• Avaliação do profissional após 30 e 90 dias\n• Percentual de ocupação da agenda' },
      ],
    },
  ],
}

export const PJ_DESLIGAMENTO: ProcDoc = {
  secoes: [
    {
      id: id(), titulo: 'DESLIGAMENTO DE PROFISSIONAL PARCEIRO (PJ/MEI)', cor: '#dc2626', passos: [
        { id: id(), titulo: 'Etapa 1 — Comunicação do Desligamento', texto: 'Registrar formalmente: pedido do profissional ou decisão da empresa.\nDefinir a data final da parceria.' },
        { id: id(), titulo: 'Etapa 2 — Levantamento Financeiro', texto: 'Verificar: adiantamentos pendentes, débitos internos, materiais não devolvidos, taxas sindicais pendentes, rateios pendentes e comissões pendentes.' },
        { id: id(), titulo: 'Etapa 3 — Fechamento Financeiro', texto: 'Lançar todos os créditos e débitos na quinzena do desligamento.\nEmitir o demonstrativo financeiro final.' },
        { id: id(), titulo: 'Etapa 4 — Elaboração do Distrato', texto: 'A administração elabora o Distrato de Parceria. O profissional confere e assina.\nA empresa arquiva uma via e entrega uma via ao profissional.' },
        { id: id(), titulo: 'Etapa 5 — Cancelamento de Acessos', texto: 'Cancelar imediatamente: login do sistema, agenda online, senhas, acessos financeiros e grupos internos.' },
        { id: id(), titulo: 'Etapa 6 — Devolução de Materiais', texto: 'Receber e registrar a devolução de: chaves, uniformes, equipamentos e materiais pertencentes à empresa.' },
        { id: id(), titulo: 'Etapa 7 — Arquivamento', texto: 'Arquivar: contrato de parceria, distrato, demonstrativo financeiro final e comprovantes de entrega e devolução.\nManter os documentos arquivados conforme orientação contábil e jurídica.' },
      ],
    },
  ],
}

export const PERFIL_AVALIACAO: ProcDoc = {
  secoes: [
    {
      id: id(), titulo: 'PERFIL E AVALIAÇÃO DE DESEMPENHO DO PROFISSIONAL', cor: '#5b4fcf', passos: [
        { id: id(), titulo: '1. Comprometimento e Responsabilidade', texto: 'Avalia o comprometimento com a empresa, clientes e equipe.\n\nCritérios: pontualidade e cumprimento de horários; presença e disponibilidade no salão; frequência de faltas e atrasos (independente de justificativa); comprometimento com a agenda e clientes agendados; recusa/cancelamento sem justificativa plausível; cumprimento das normas internas; responsabilidade com materiais, equipamentos e patrimônio.\n\nPerguntas: Cumpre seus horários? Tem histórico de faltas/atrasos? Demonstra comprometimento? Assume responsabilidades e resolve problemas?' },
        { id: id(), titulo: '2. Relacionamento Interpessoal e Cultura Organizacional', texto: 'Avalia convivência, trabalho em equipe e alinhamento aos valores.\n\nCritérios: relacionamento saudável com colegas e gestores; ausência de fofocas e conflitos; respeito à equipe e clientes; honestidade e transparência; humildade para reconhecer erros e receber feedbacks; sigilo sobre assuntos internos; participação em ações, campanhas e eventos; espírito de equipe.\n\nPerguntas: Contribui para um ambiente saudável? Demonstra respeito pela equipe? Participa das ações internas? Recebe feedbacks de forma positiva?' },
        { id: id(), titulo: '3. Desenvolvimento Profissional e Inovação', texto: 'Avalia o investimento contínuo em conhecimento e atualização.\n\nCritérios: participação em cursos e treinamentos; nº de cursos nos últimos 6 meses; busca por atualização técnica; qualidade dos materiais usados; participação obrigatória nos treinamentos; conhecimento das tendências; aplicação prática.\n\nMarketing Pessoal e Redes Sociais: frequência e qualidade das postagens; uso estratégico das redes para fortalecer a marca; produção de conteúdo relevante.\n\nPerguntas: Quantos cursos fez nos últimos 6 meses? Está atualizado sobre tendências? Participa dos treinamentos internos? Usa as redes de forma estratégica?' },
        { id: id(), titulo: '4. Qualidade no Atendimento e Experiência do Cliente', texto: 'Avalia a excelência técnica e a experiência do cliente.\n\nCritérios: escuta ativa; excelência técnica e qualidade dos serviços; respeito ao tempo de cada procedimento; experiência diferenciada; priorização da saúde de cabelos/unhas/pele; clareza nos serviços e valores; resolução de conflitos; pós-atendimento e acompanhamento.\n\nPerguntas: Oferece atendimento diferenciado? Demonstra preocupação genuína? Resolve conflitos adequadamente? Mantém alto padrão técnico?' },
        { id: id(), titulo: '5. Fidelização e Relacionamento com Clientes', texto: 'Avalia a capacidade de manter clientes ativos e satisfeitos.\n\nIndicadores: taxa de fidelização ≥ 55%; taxa de retorno; frequência média dos retornos; índice de satisfação; nº de reclamações.\n\nImportante: faturar bem não significa fidelizar. O crescimento sustentável acontece quando os clientes retornam e indicam novos clientes.' },
        { id: id(), titulo: '6. Resultados e Crescimento Financeiro', texto: 'Avalia o desempenho financeiro do profissional.\n\nIndicadores: crescimento mínimo de 8% no faturamento mensal; ticket médio; quantidade de clientes atendidos; taxa de ocupação da agenda; venda de produtos e serviços complementares; evolução do faturamento.\n\nImportante: o faturamento deve ser analisado junto com fidelização, qualidade e satisfação.' },
      ],
    },
    {
      id: id(), titulo: 'CLASSIFICAÇÃO FINAL', cor: '#0891b2', passos: [
        { id: id(), titulo: 'Pontuação de cada critério (1 a 5)', texto: '1 — Muito abaixo do esperado\n2 — Abaixo do esperado\n3 — Dentro do esperado\n4 — Acima do esperado\n5 — Excelente' },
        { id: id(), titulo: 'Resultado geral', texto: '• 90% a 100%: Profissional Destaque\n• 80% a 89%: Excelente desempenho\n• 70% a 79%: Bom desempenho\n• 60% a 69%: Necessita desenvolvimento\n• Abaixo de 60%: Plano de ação imediato' },
      ],
    },
  ],
}
