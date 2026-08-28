'use client'
import { useState, useEffect } from 'react'

// Os números que fazem o menu avisar — lidos uma vez e compartilhados.
//
// /api/salon/alertas já era o lugar onde todas as telas leem o MESMO número.
// O que faltava era chegar ao botão: o card do setor piscando dizia que havia
// algo, e para descobrir o quê era preciso abrir página por página.
//
// A promessa fica guardada no módulo porque a barra do setor, o menu e o
// painel montam juntos: sem isso seriam três chamadas iguais a cada navegação.

export interface Alertas {
  kitsPendentes: number
  esterPendentes: number
  solicitacoes: number
  solicPorSetor: Record<string, number>
  servicosSemCadastro: number
  profsSemHabilitacao: number
  /** contagem por id do catálogo de ferramentas (ex.: 'kits', 'pr_lista') */
  porFerramenta: Record<string, number>
  /** contagem por página do menu principal (ex.: 'servicos') */
  porPagina: Record<string, number>
}

const VAZIO: Alertas = {
  kitsPendentes: 0, esterPendentes: 0, solicitacoes: 0, solicPorSetor: {},
  servicosSemCadastro: 0, profsSemHabilitacao: 0, porFerramenta: {}, porPagina: {},
}

let emVoo: Promise<Alertas> | null = null
let quando = 0
const VALIDADE_MS = 60 * 1000

function buscar(): Promise<Alertas> {
  if (emVoo && Date.now() - quando < VALIDADE_MS) return emVoo
  quando = Date.now()
  emVoo = fetch('/api/salon/alertas')
    .then(r => (r.ok ? r.json() : null))
    .then(d => ({ ...VAZIO, ...(d || {}) }))
    .catch(() => VAZIO)
  return emVoo
}

/** Força a próxima leitura a ir ao servidor (depois de resolver algo). */
export function recarregarAlertas() {
  emVoo = null
  quando = 0
}

export function useAlertas(): Alertas {
  const [dados, setDados] = useState<Alertas>(VAZIO)
  useEffect(() => {
    let vivo = true
    buscar().then(d => { if (vivo) setDados(d) })
    return () => { vivo = false }
  }, [])
  return dados
}
