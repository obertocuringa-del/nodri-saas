// Modelo de avaliação COMPARTILHADO (fonte única).
// Editado em "Perfil e Avaliação de Desempenho" e usado na aba AVALIAR de cada profissional.
// Chave no salao_config: avaliacao_modelo

export interface CritItem { id: string; texto: string }
export interface CatAval { id: string; titulo: string; cor: string; criterios: CritItem[] }
export interface ModeloAval { categorias: CatAval[] }

let _i = 0
const cid = () => 'a' + (++_i)
const cat = (titulo: string, cor: string, crits: string[]): CatAval => ({ id: cid(), titulo, cor, criterios: crits.map(t => ({ id: cid(), texto: t })) })

export const MODELO_AVAL_DEFAULT: ModeloAval = {
  categorias: [
    cat('Comprometimento e Responsabilidade', '#5b4fcf', [
      'Pontualidade e cumprimento dos horários', 'Presença e disponibilidade no salão', 'Baixa frequência de faltas e atrasos',
      'Comprometimento com a agenda e clientes agendados', 'Não recusa/cancela atendimentos sem justificativa',
      'Cumprimento das normas internas', 'Responsabilidade com materiais e patrimônio',
    ]),
    cat('Relacionamento Interpessoal e Cultura', '#0891b2', [
      'Relacionamento saudável com colegas e gestores', 'Ausência de fofocas e conflitos internos', 'Respeito à equipe e aos clientes',
      'Honestidade e transparência', 'Humildade para reconhecer erros e receber feedback', 'Sigilo sobre assuntos internos',
      'Participação em ações, campanhas e eventos', 'Espírito de equipe e colaboração',
    ]),
    cat('Desenvolvimento Profissional e Inovação', '#db2777', [
      'Participação em cursos e treinamentos', 'Busca constante por atualização técnica', 'Qualidade dos materiais utilizados',
      'Conhecimento das tendências do mercado', 'Aplicação prática dos conhecimentos', 'Marketing pessoal e uso estratégico das redes',
      'Qualidade e frequência das publicações',
    ]),
    cat('Qualidade no Atendimento e Experiência', '#16a34a', [
      'Escuta ativa durante o atendimento', 'Excelência técnica e qualidade dos serviços', 'Respeito ao tempo de cada procedimento',
      'Experiência diferenciada ao cliente', 'Priorização da saúde de cabelos/unhas/pele', 'Clareza na apresentação de serviços e valores',
      'Resolução de conflitos e insatisfações', 'Pós-atendimento e acompanhamento',
    ]),
    cat('Fidelização e Relacionamento com Clientes', '#ea580c', [
      'Taxa de fidelização (meta ≥ 55%)', 'Taxa de retorno dos clientes', 'Frequência média dos retornos',
      'Índice de satisfação dos clientes', 'Baixo número de reclamações',
    ]),
    cat('Resultados e Crescimento Financeiro', '#0d9488', [
      'Crescimento do faturamento (meta mín. 8%/mês)', 'Ticket médio', 'Quantidade de clientes atendidos',
      'Taxa de ocupação da agenda', 'Venda de produtos e serviços complementares', 'Evolução do faturamento ao longo do tempo',
    ]),
  ],
}

export const CLASSIF_AVAL = [
  { min: 90, txt: 'Profissional Destaque', cor: '#16a34a', emoji: '🏆' },
  { min: 80, txt: 'Excelente desempenho', cor: '#0891b2', emoji: '⭐' },
  { min: 70, txt: 'Bom desempenho', cor: '#65a30d', emoji: '👍' },
  { min: 60, txt: 'Necessita desenvolvimento', cor: '#f59e0b', emoji: '⚠️' },
  { min: 0, txt: 'Plano de ação imediato', cor: '#ef4444', emoji: '🚨' },
]
export function classificarAval(pct: number) { return CLASSIF_AVAL.find(c => pct >= c.min) || CLASSIF_AVAL[CLASSIF_AVAL.length - 1] }
