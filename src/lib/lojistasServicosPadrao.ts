// Lista padrão de serviços de interesse do módulo Lojistas.
// Usada para semear salao_config (chave 'lojistas_servicos') na
// primeira leitura, se o salão ainda não tiver nenhuma lista salva.

export interface LojistaServico { id: string; nome: string; ativo: boolean; ordem: number }

const NOMES_PADRAO = [
  'BROW LAMINATION', 'DEPILAÇÃO', 'APLICAÇÃO DE CÍLIOS POSTIÇO', 'APLICAÇÃO DE HENNA NOS FIOS',
  'BABYLISS', 'BANHO DE GEL', 'BARBA', 'BLINDAGEM DE UNHA', 'BUÇO', 'CHAPINHA', 'COLOR GLOSSY',
  'CORREÇÃO DE COR', 'CORTE', 'CORTE BORDADO', 'CORTE KIDS', 'CORTE VISAGISMO', 'COVER MEN',
  'CUTILAGEM RUSSA', 'DESCOLORAÇÃO DE SOBRANCELHA', 'DESPIGMENTAÇÃO DE SOBRANCELHA',
  'DETOX CAPILAR', 'DRENAGEM FACIAL', 'ENVELOPAMENTO DOS FIOS', 'ESMALTAÇÃO EM GEL',
  'EXFOLIAÇÃO CORPORAL', 'EXTENSÃO DE CÍLIOS', 'FIBRA DE VIDRO', 'FITAGEM',
  'HENNA SOBRANCELHA', 'HIDRATAÇÃO FACIAL', 'HIGIENIZAÇÃO CAPILAR', 'HIGIENIZAÇÃO ESPECIAL',
  'LASH LIFTING', 'LIMPEZA DE PELE', 'LIXA A MOTOR', 'MANICURE', 'MANUTENÇÃO DE FIBRA',
  'MAQUIAGEM', 'MASSAGEM', 'MECHAS', 'MODELAGEM', 'NANO BLAND', 'NUTRIÇÃO', 'PEDICURE',
  'PENTEADO', 'PIGMENTAÇÃO', 'PLÁSTICA DOS PÉS', 'REALINHAMENTO CAPILAR',
  'RECONSTRUÇÃO DE UNHA DE FIBRA', 'REFLEXOLOGIA', 'REMOÇÃO DE GEL', 'REMOÇÃO DE ESMALTE EM GEL',
  'REMOÇÃO DE FIBRA DE VIDRO', 'REMOÇÃO DE TATUAGEM', 'SECAGEM', 'SHIATSU CAPILAR', 'SO PURE',
  'SOBRANCELHAS', 'SPA DAS MÃOS', 'TERAPIA CAPILAR', 'TOP COAT', 'TRATAMENTO',
  'TROCA DE ESMALTE', 'UNHA POSTIÇA',
]

export const SEGMENTOS_LOJISTA = [
  'Moda Feminina', 'Moda Masculina', 'Infantil', 'Calçados', 'Cosméticos', 'Academia',
  'Restaurante', 'Clínica', 'Farmácia', 'Joalheria', 'Ótica', 'Papelaria', 'Outro',
]

export function servicosLojistaPadrao(): LojistaServico[] {
  return NOMES_PADRAO.map((nome, i) => ({ id: `s${i + 1}`, nome, ativo: true, ordem: i }))
}
