// Logo do salão (configurada em Meu Perfil) — usada nas impressões no lugar
// da marca NODRI. Fica em salao_config, chave 'logo_salao'.
export async function getLogoSalao(): Promise<string> {
  try {
    const d = await fetch('/api/salon/grid?chave=logo_salao').then(r => (r.ok ? r.json() : null))
    return d && typeof d.logo === 'string' ? d.logo : ''
  } catch {
    return ''
  }
}
