'use client'

import { useEffect } from 'react'

// Põe o nome do salão no título da aba: "Rouge Hair — NODRI".
//
// Toda aba do painel mostrava "NODRI — Sistema de Gestão de Salões", igual
// para todo mundo. Com dois ou três salões abertos ao mesmo tempo — coisa que
// acontece direto aqui — não dava para saber qual aba era qual sem clicar em
// cada uma. O favorito também salvava sempre com o mesmo nome.
//
// Só o título muda. O endereço continua /salon para todos: quem identifica o
// salão é o cookie do login, e trocar isso exigiria reescrever a navegação
// inteira do sistema.
export default function TituloDaAba({ nome }: { nome?: string | null }) {
  useEffect(() => {
    let vivo = true
    const aplicar = (n: string) => {
      const limpo = (n || '').trim()
      if (vivo && limpo) document.title = `${limpo} — NODRI`
    }

    if (nome) { aplicar(nome); return }

    // Nas telas internas o nome não vem por prop. Buscar é barato e acontece
    // uma vez por página; sem isso só a tela inicial teria o nome na aba.
    fetch('/api/salon/perfil')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.nome) aplicar(d.nome) })
      .catch(() => { /* fica o título padrão */ })

    return () => { vivo = false }
  }, [nome])

  return null
}
