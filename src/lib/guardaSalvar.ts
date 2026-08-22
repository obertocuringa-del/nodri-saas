'use client'

import { useEffect, useRef } from 'react'

// ── Guarda de salvamento (todo o sistema) ──
// Cada componente com botão "Salvar" registra aqui se tem alterações não
// salvas (dirty). Com isso o sistema consegue avisar "Deseja salvar?" antes
// de o usuário perder trabalho: ao fechar/recarregar a aba (aviso nativo do
// navegador), ao usar Voltar/Início/Busca da barra global (modal), e ao
// trocar de aba interna nas páginas-hub (confirmação).

interface Entrada { dirty: boolean; nome: string }
const registro = new Map<string, Entrada>()

export function haNaoSalvo(): boolean {
  return Array.from(registro.values()).some(e => e.dirty)
}
export function nomesNaoSalvos(): string[] {
  return Array.from(registro.values()).filter(e => e.dirty).map(e => e.nome).filter(Boolean)
}

// Confirmação padrão para trocas internas de aba/página-hub.
// Retorna true se PODE prosseguir (nada pendente ou usuário aceitou perder).
export function confirmarSaidaSemSalvar(): boolean {
  if (!haNaoSalvo()) return true
  const onde = nomesNaoSalvos().join(', ')
  return confirm(`Você tem alterações NÃO SALVAS${onde ? ` em: ${onde}` : ''}.\n\nClique em CANCELAR para voltar e salvar, ou em OK para sair sem salvar (as alterações serão perdidas).`)
}

let seq = 0

// Use nos componentes: useGuardaSalvar(dirty, 'Nome da tela')
export function useGuardaSalvar(dirty: boolean, nome = '') {
  const idRef = useRef('')
  if (!idRef.current) idRef.current = 'gs' + (++seq)

  useEffect(() => {
    registro.set(idRef.current, { dirty, nome })
    // Avisa a barra global (botão Salvar do topo fixo do celular) que o estado mudou
    window.dispatchEvent(new Event('nodri-dirty-change'))
    return () => { registro.delete(idRef.current); window.dispatchEvent(new Event('nodri-dirty-change')) }
  }, [dirty, nome])

  // Fechar/recarregar a aba com alteração pendente → aviso nativo do navegador
  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])
}
