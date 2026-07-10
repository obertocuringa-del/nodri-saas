// Utilidades e formato compartilhados entre a lista geral de Esterilização
// (Salão Administrativo) e o card por profissional (perfil individual) —
// os dois leem/gravam o MESMO documento (chave `esterilizacao_MES`), então
// precisam falar exatamente a mesma "língua" de campos e de casamento de nome.
import { cel, type Cell } from '@/components/salon/GridEditavel'

export interface EsterilizacaoItem { id: string; profissional: string; quantidade: string; data: string; dataDevolucao: string; observacao: string }

export const ESTERILIZACAO_TITULO = 'REGISTRO DE ESTERILIZAÇÃO'

export const ridEster = () => Math.random().toString(36).slice(2, 9)
export function mesAtualEster() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
export function hojeBR() { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` }
export function brToIso(s: string) { const m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : '' }
export function isoToBr(s: string) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : s }
export function normaliza(s: string) { return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim() }
export function mesmoProf(a: string, b: string) { const na = normaliza(a), nb = normaliza(b); if (!na || !nb) return false; return na === nb || na.includes(nb) || nb.includes(na) }

export function linhasParaEsterilizacaoItems(linhas: Cell[][]): EsterilizacaoItem[] {
  return linhas.filter(l => l.some(c => (c?.t || '').trim())).map(l => ({
    id: ridEster(), profissional: l[0]?.t || '', quantidade: l[1]?.t || '', data: l[2]?.t || '', dataDevolucao: l[3]?.t || '', observacao: l[4]?.t || '',
  }))
}

export function esterilizacaoItemsParaTabela(items: EsterilizacaoItem[]) {
  return {
    titulo: ESTERILIZACAO_TITULO,
    cabecalho: [cel('Profissional'), cel('Quantidade'), cel('Data'), cel('Data devolução'), cel('Observação')],
    linhas: items.map(it => [cel(it.profissional), cel(it.quantidade), cel(it.data), cel(it.dataDevolucao), cel(it.observacao)]),
  }
}
