'use client'

import { useEffect, useRef } from 'react'

// ── Salvamento automático (rede de segurança) ───────────────────────────────
// Salva sozinho alguns segundos depois que o usuário para de mexer, e também
// quando a aba perde o foco (trocar de aba, minimizar, bloquear o celular).
// O botão Salvar CONTINUA existindo: isto não substitui o salvamento manual,
// só evita perder trabalho por esquecimento.
//
// Regras que valem a pena manter:
// • silencioso — auto-save não pode encher a tela de aviso; erro aqui não
//   interrompe o usuário, e o botão Salvar segue mostrando o que houver.
// • sem sobreposição — se um salvamento ainda está indo, não dispara outro.
// • o GridEditavel já tem o seu próprio auto-save (2s); este hook é pros
//   editores que têm função de salvar própria (Calculadora, Check List).
export function useAutoSalvar(dirty: boolean, salvar: () => Promise<any> | any, delay = 2500) {
  const salvarRef = useRef(salvar)
  salvarRef.current = salvar
  const emCurso = useRef(false)
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  const disparar = useRef(async () => {
    if (emCurso.current || !dirtyRef.current) return
    emCurso.current = true
    try { await salvarRef.current() } catch { /* silencioso de propósito */ }
    emCurso.current = false
  })

  // Parou de mexer → salva
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => { disparar.current() }, delay)
    return () => clearTimeout(t)
  }, [dirty, delay])

  // Saiu da aba / minimizou / bloqueou a tela → salva o que estiver pendente
  useEffect(() => {
    if (!dirty) return
    const aoEsconder = () => { if (document.visibilityState === 'hidden') disparar.current() }
    const aoSair = () => { disparar.current() }
    document.addEventListener('visibilitychange', aoEsconder)
    window.addEventListener('pagehide', aoSair)
    return () => {
      document.removeEventListener('visibilitychange', aoEsconder)
      window.removeEventListener('pagehide', aoSair)
    }
  }, [dirty])
}
