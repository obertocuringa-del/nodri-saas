// Cache compartilhado de GETs JSON para telas ficarem instantâneas.
// - Resposta imediata do cache (memória + sessionStorage) e atualização
//   em segundo plano (stale-while-revalidate).
// - Deduplica chamadas simultâneas ao mesmo endpoint (várias abas pedindo
//   a mesma API viram 1 requisição só).
const mem = new Map<string, any>()
const inflight = new Map<string, Promise<any>>()

function lerSessao(url: string): any {
  try { const s = sessionStorage.getItem('nodri_fc:' + url); return s ? JSON.parse(s) : null } catch { return null }
}

function gravar(url: string, data: any) {
  mem.set(url, data)
  try { sessionStorage.setItem('nodri_fc:' + url, JSON.stringify(data)) } catch { /* sessão cheia: segue só com memória */ }
}

// Busca direto do servidor (ignora cache na leitura) e atualiza o cache.
// Use após uma ação de escrita (POST) para refletir o estado novo.
export function buscarFresco(url: string): Promise<any> {
  const atual = inflight.get(url)
  if (atual) return atual
  const p = fetch(url)
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      inflight.delete(url)
      if (d !== null && d !== undefined) gravar(url, d)
      return d
    })
    .catch(() => { inflight.delete(url); return null })
  inflight.set(url, p)
  return p
}

// Entrega o cache na hora (se existir) e depois entrega o dado fresco.
// onData pode ser chamado 2x: (cache, fresco=false) e depois (novo, fresco=true).
export function buscarComCache(url: string, onData: (d: any, fresco: boolean) => void): Promise<void> {
  const cached = mem.get(url) ?? lerSessao(url)
  if (cached !== null && cached !== undefined) {
    mem.set(url, cached)
    onData(cached, false)
  }
  return buscarFresco(url).then(d => { if (d !== null && d !== undefined) onData(d, true) })
}
