'use client'

// ── Dado de um salão nunca aparece na tela de outro (28/09/2026) ─────────────
//
// Caso real: o dono abriu o Rouge e depois o salão "Luan" no MESMO navegador
// (pelo "acessar como cliente") e viu o faturamento do Rouge na tela do Luan.
// No banco o Luan estava vazio; o que vazou foi o CACHE DO NAVEGADOR: telas
// guardam dados em localStorage/sessionStorage com nome fixo (ex.:
// nodri_relatorios_v3), sem dizer de qual salão são, e mostram isso primeiro.
//
// Aqui: se o salão desta sessão não é o mesmo do último que usou este
// navegador, tudo que é dado de salão guardado aqui é apagado ANTES de
// qualquer tela ler (roda no render do layout, que vem antes das páginas;
// efeitos de página rodariam antes de um useEffect daqui).

const PREFERENCIAS = new Set([
  'nodri_crm_faixa_fixa', 'mp_dark', 'nodri_impersonando', 'nodri_cache_dono',
])
const ehPreferencia = (k: string) => PREFERENCIAS.has(k) || k.startsWith('nodri_cal_fonte_')

let conferido: string | null = null

export default function GuardaCacheDoSalao({ salaoId }: { salaoId: string | null }) {
  if (typeof window !== 'undefined' && salaoId && conferido !== salaoId) {
    conferido = salaoId
    try {
      const dono = localStorage.getItem('nodri_cache_dono')
      if (dono !== salaoId) {
        for (const k of Object.keys(localStorage)) {
          if ((k.startsWith('nodri') || k.startsWith('notif_')) && !ehPreferencia(k)) localStorage.removeItem(k)
        }
        for (const k of Object.keys(sessionStorage)) {
          if (k.startsWith('nodri')) sessionStorage.removeItem(k)
        }
        localStorage.setItem('nodri_cache_dono', salaoId)
      }
    } catch { /* navegador sem storage: não há o que vazar */ }
  }
  return null
}
