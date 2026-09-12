import { ESTADOS, type DefEstado } from '@/lib/crm'

// ── Os botões que o salão cria ──────────────────────────────────────────────
//
// Os nove estados de fábrica (Agendou, Confirmou, Desmarcou…) continuam no
// código, e não por teimosia: é neles que o relógio mexe sozinho — pausa que
// vence, cliente que sumiu, atendimento que virou agendamento. Um botão que o
// salão inventa não pode herdar automação que ninguém escreveu.
//
// Então a regra é clara e vale a pena estar dita:
//
//   ESTADO DE FÁBRICA   o sistema move sozinho, e o salão pode esconder ou
//                       renomear -- mas não apagar o comportamento.
//   ESTADO DO SALÃO     pasta que só se mexe na mão. O relógio nunca entra,
//                       o painel conta como conversa em aberto.
//
// Guardado em `salao_config`, chave `crm_estados`, e não numa tabela nova:
// mudança de esquema neste banco exige SQL colado à mão no Supabase.

export const CHAVE_ESTADOS = 'crm_estados'

export interface AjusteEstado {
  /** chave do estado de fábrica que este ajuste altera */
  chave: string
  /** o texto do BOTÃO. A etiqueta da conversa continua a de fábrica. */
  rotulo?: string
  oculto?: boolean
  ordem?: number
}

export interface EstadoDoSalao {
  /** sempre começa com `extra_` -- é o que separa dos de fábrica */
  chave: string
  rotulo: string
  cor: string
  fundo: string
  ordem?: number
}

export interface ConfigEstados {
  ajustes: AjusteEstado[]
  extras: EstadoDoSalao[]
}

export const ESTADOS_VAZIO: ConfigEstados = { ajustes: [], extras: [] }

/** Cores oferecidas na tela. Todas da paleta do NODRI, para o botão novo não
 *  destoar dos que já estão do lado. */
export const CORES_ESTADO: { nome: string; cor: string; fundo: string }[] = [
  { nome: 'Verde',   cor: '#2F6B4F', fundo: '#E7F1E9' },
  { nome: 'Âmbar',   cor: '#9A6B12', fundo: '#FBF2E0' },
  { nome: 'Roxo',    cor: '#5B4FCF', fundo: '#F1EEFC' },
  { nome: 'Rosa',    cor: '#A33C5B', fundo: '#FAE8EE' },
  { nome: 'Telha',   cor: '#C2603A', fundo: '#FBEFE7' },
  { nome: 'Cinza',   cor: '#6B6860', fundo: '#F0ECE7' },
]

export function lerConfigEstados(bruto: any): ConfigEstados {
  return {
    ajustes: Array.isArray(bruto?.ajustes) ? bruto.ajustes.filter((a: any) => a?.chave) : [],
    extras: Array.isArray(bruto?.extras)
      ? bruto.extras
          .filter((e: any) => e?.chave && e?.rotulo)
          .map((e: any) => ({
            chave: String(e.chave),
            rotulo: String(e.rotulo).slice(0, 40),
            cor: String(e.cor || '#6B6860'),
            fundo: String(e.fundo || '#F0ECE7'),
            ordem: Number(e.ordem) || 0,
          }))
      : [],
  }
}

/** Chave nova para um botão do salão, a partir do nome que ele digitou. */
export function chaveDoExtra(rotulo: string): string {
  const base = String(rotulo || '').normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24)
  return 'extra_' + (base || Date.now().toString(36))
}

export const ehEstadoDoSalao = (chave: string) => String(chave || '').startsWith('extra_')

/**
 * A lista final de estados, na ordem em que a tela mostra: os de fábrica com
 * os ajustes aplicados, mais os do salão, sem os escondidos.
 */
export function estadosVisiveis(cfg: ConfigEstados): DefEstado[] {
  const porChave = new Map(cfg.ajustes.map(a => [a.chave, a]))
  const defabrica: (DefEstado & { ordem: number })[] = ESTADOS
    .filter(e => !porChave.get(e.chave)?.oculto)
    .map((e, i) => ({
      ...e,
      // O salão renomeia o BOTÃO; a etiqueta do estado continua a de fábrica,
      // senão a conversa antiga passaria a se chamar outra coisa.
      acao: porChave.get(e.chave)?.rotulo || e.acao || e.rotulo,
      ordem: porChave.get(e.chave)?.ordem ?? i,
    }))

  const doSalao: (DefEstado & { ordem: number })[] = cfg.extras.map((e, i) => ({
    chave: e.chave as any,
    rotulo: e.rotulo,
    cor: e.cor,
    fundo: e.fundo,
    // Pasta do salão não entra na fila de urgência nem no relógio de espera:
    // ninguém escreveu automação para ela, e fingir que existe seria pior.
    naFila: false,
    contaTempo: false,
    explica: 'Pasta criada pelo salão. O sistema não move ninguém para cá nem daqui sozinho.',
    ordem: 100 + (e.ordem ?? i),
  }))

  return [...defabrica, ...doSalao].sort((a, b) => a.ordem - b.ordem)
}

/** Acha um estado pela chave, inclusive os que o salão criou. */
export function estadoPorComExtras(chave: string, cfg: ConfigEstados): DefEstado {
  const todos = estadosVisiveis(cfg)
  return todos.find(e => e.chave === chave)
    || ESTADOS.find(e => e.chave === chave)
    // Estado que existia e foi escondido continua precisando de nome e cor:
    // a conversa antiga não some só porque o botão saiu da tela.
    || cfg.extras.filter(e => e.chave === chave).map(e => ({
      chave: e.chave as any, rotulo: e.rotulo, cor: e.cor, fundo: e.fundo,
      naFila: false, contaTempo: false, explica: 'Pasta criada pelo salão.',
    }))[0]
    || ESTADOS[0]
}
