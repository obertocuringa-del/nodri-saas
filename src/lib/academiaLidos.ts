// ── Marcação de lido ────────────────────────────────────────────────────────
//
// Fica no navegador, de propósito. As duas alternativas tinham custo maior que
// o benefício: tabela nova exigiria migração no Supabase antes de a trilha
// funcionar, e salao_config passaria cada clique de "lido" pelo log de
// auditoria — barulho permanente para registrar uma conveniência de leitura.
//
// O preço disso é honesto e pequeno: o progresso é por navegador. Quem abrir a
// Academia em outro aparelho começa a marcação do zero. O conteúdo e a ordem
// das trilhas, que é o que importa, são os mesmos em qualquer lugar.
//
// Guardado por TÍTULO e não por id, pelo mesmo motivo das trilhas: id muda de
// ambiente para ambiente, título não.

const CHAVE = 'nodri_academia_lidos'

export function lerLidos(): string[] {
  try {
    const cru = localStorage.getItem(CHAVE)
    const lista = cru ? JSON.parse(cru) : []
    return Array.isArray(lista) ? lista.filter(x => typeof x === 'string') : []
  } catch {
    // Navegador anônimo, storage bloqueado ou JSON corrompido: sem progresso,
    // e a tela segue funcionando.
    return []
  }
}

function gravar(lista: string[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista))
  } catch {
    // Sem espaço ou sem permissão. Marcar lido nunca pode quebrar a leitura.
  }
}

export function marcarLido(titulo: string): string[] {
  const atual = lerLidos()
  if (atual.includes(titulo)) return atual
  const novo = [...atual, titulo]
  gravar(novo)
  return novo
}

export function alternarLido(titulo: string): string[] {
  const atual = lerLidos()
  const novo = atual.includes(titulo)
    ? atual.filter(t => t !== titulo)
    : [...atual, titulo]
  gravar(novo)
  return novo
}
