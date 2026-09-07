// ── Cor dos setores ─────────────────────────────────────────────────────────
//
// A cor de um setor não é enfeite: ela diz de que RAMO da estrutura a caixa é.
// Administrativo e Financeiro dividem a mesma cor porque um está debaixo do
// outro; Marketing e Comercial idem. Bate o olho e se sabe a área.
//
// Isso já valia no organograma do computador. No celular, onde a árvore não
// cabe e a página mostra cards, cada card estava pegando `departamento_cor` —
// uma cor individual, salva por setor — e o resultado era uma tela com um
// tom diferente em cada quadrado, sem nenhum significado.
//
// Trazer o mapa para cá é o que permite às duas telas falarem a mesma língua.

// Palavras que identificam cada setor. A ordem importa: o primeiro que casar
// leva. Setor que não casa com nada continua tendo cor — a dele própria.
export const CHAVES_SETOR: Record<string, string[]> = {
  contabilidade: ['CONTABIL'],
  gerencia:      ['GERENCIA', 'GERENTE'],
  administrativo:['ADMINISTRATIVO'],
  financeiro:    ['FINANCEIRO'],
  comercial:     ['COMERCIAL', 'VENDAS'],
  marketing:     ['MARKETING'],
  rh:            ['RH', 'GESTAO DE PESSOAS', 'RECURSOS HUMANOS'],
  compras:       ['COMPRAS', 'ESTOQUE'],
  qualidade:     ['PROCESSO', 'QUALIDADE'],
  tecnica:       ['RESPONSAVEL TECNICA', 'TECNICA'],
  coordenador:   ['COORDENADOR', 'COORDENACAO'],
  recepcao:      ['RECEPCAO'],
  profissionais: ['PROFISSIONAIS'],
  gerais:        ['SERVICOS GERAIS', 'LIMPEZA'],
  manutencao:    ['MANUTENCAO'],
  dosagem:       ['DOSAGEM'],
  cafe:          ['CAFE', 'COPA', 'CAFETERIA'],
}

// Cor por posição na hierarquia: o ramo inteiro compartilha a mesma cor.
export const CORES_SETOR: Record<string, string> = {
  contabilidade: '#6b7280', qualidade: '#6b7280', tecnica: '#6b7280',
  gerencia: '#5b4fcf',
  administrativo: '#0891b2', financeiro: '#0891b2', compras: '#0891b2',
  rh: '#7c3aed',
  marketing: '#db2777', comercial: '#db2777',
  coordenador: '#ea580c', recepcao: '#ea580c', profissionais: '#ea580c',
  dosagem: '#ea580c', gerais: '#ea580c', manutencao: '#ea580c', cafe: '#ea580c',
}

const normalizar = (s: string) =>
  (s || '').toUpperCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')

export function chaveDoSetor(nomeCompleto: string): string | null {
  const nome = normalizar(nomeCompleto)
  for (const [chave, palavras] of Object.entries(CHAVES_SETOR)) {
    if (palavras.some(p => nome.includes(p))) return chave
  }
  return null
}

// Setor reconhecido usa a cor do ramo. Setor que o salão criou por conta
// própria mantém a cor escolhida por ele — tirar isso seria apagar uma
// decisão de quem usa.
export function corDoSetor(nomeCompleto: string, corPropria?: string): string {
  const chave = chaveDoSetor(nomeCompleto)
  return (chave && CORES_SETOR[chave]) || corPropria || '#5b4fcf'
}
