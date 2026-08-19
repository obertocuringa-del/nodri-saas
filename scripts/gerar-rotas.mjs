// ─────────────────────────────────────────────────────────────────────────────
// Varre src/app/salon e escreve src/lib/rotasDescobertas.ts.
//
// Por que existe: o catálogo da busca global (Ctrl+K) é escrito à mão, com
// sinônimos e permissão por página. Isso é bom para as páginas principais e
// péssimo para não esquecer nenhuma: cada página nova só aparecia na busca se
// alguém lembrasse de cadastrar — e ninguém lembra.
//
// Este script cuida só do "não esquecer". O catálogo escrito à mão continua
// mandando: quando a rota já está lá, a versão gerada é descartada.
//
// Roda no prebuild, mas o arquivo gerado é COMMITADO de propósito: se o script
// falhar no Vercel, o build usa o que está versionado em vez de quebrar.
// ─────────────────────────────────────────────────────────────────────────────

import { readdirSync, statSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const RAIZ = 'src/app/salon'
const SAIDA = 'src/lib/rotasDescobertas.ts'

function paginas(dir, achadas = []) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) paginas(caminho, achadas)
    else if (nome === 'page.tsx' || nome === 'page.ts') achadas.push(dir)
  }
  return achadas
}

// "lojistas/relatorio" → "LOJISTAS — RELATORIO"
function rotulo(rota) {
  const partes = rota.replace('/salon', '').split('/').filter(Boolean)
  if (!partes.length) return 'INÍCIO'
  return partes
    .map(p => p.replace(/-/g, ' ').toUpperCase())
    .join(' — ')
}

function gerar() {
  if (!existsSync(RAIZ)) return null
  const rotas = paginas(RAIZ)
    .map(d => '/' + relative('src/app', d).split(sep).join('/'))
    // Rota dinâmica (/[id]) não é um destino navegável sem um id concreto.
    .filter(r => !r.includes('['))
    .sort()

  const linhas = rotas.map(r => `  { rota: '${r}', label: ${JSON.stringify(rotulo(r))} },`).join('\n')
  return `// GERADO AUTOMATICAMENTE por scripts/gerar-rotas.mjs — não edite à mão.
// Para dar sinônimos, grupo ou permissão a uma página, cadastre-a no CATALOGO
// de src/components/salon/NavegacaoGlobal.tsx: o que está lá tem prioridade.

export interface RotaDescoberta { rota: string; label: string }

export const ROTAS_DESCOBERTAS: RotaDescoberta[] = [
${linhas}
]
`
}

try {
  const conteudo = gerar()
  if (!conteudo) {
    console.log('[gerar-rotas] pasta não encontrada — nada a fazer')
  } else {
    const atual = existsSync(SAIDA) ? readFileSync(SAIDA, 'utf8') : ''
    if (atual === conteudo) console.log('[gerar-rotas] sem mudanças')
    else { writeFileSync(SAIDA, conteudo, 'utf8'); console.log('[gerar-rotas] atualizado') }
  }
} catch (e) {
  // Nunca derrubar o build por causa disto: o arquivo versionado serve.
  console.warn('[gerar-rotas] falhou, seguindo com o arquivo existente:', e?.message || e)
}
