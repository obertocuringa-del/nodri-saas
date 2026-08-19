'use client'

// ─────────────────────────────────────────────────────────────────────────────
// TEXTO DA FUNCIONALIDADE
//
// O texto é escrito num campo comum e colado de outro lugar (Word, WhatsApp,
// bloco de notas). Antes ele era jogado num <p> só: as quebras de linha se
// perdiam e a página virava um bloco corrido de vinte linhas que ninguém lê.
//
// Aqui as quebras são respeitadas e o texto ganha hierarquia sozinho, sem
// exigir que quem escreve saiba formatar:
//   · linha curta em MAIÚSCULAS  → subtítulo da seção
//   · bloco de linhas sem ponto final → lista com marcador
//   · resto → parágrafo
//
// Texto simples de um parágrafo continua saindo como um parágrafo — quem já
// tinha funcionalidade cadastrada não vê diferença nenhuma.
// ─────────────────────────────────────────────────────────────────────────────

const MARINHO = '#0d2a56'
const CIANO = '#22b8d6'

const ehTitulo = (l: string) => {
  const letras = l.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (letras.length < 3 || l.length > 60) return false
  return letras === letras.toUpperCase()
}

export default function TextoFormatado({ texto, centralizado }: { texto: string; centralizado?: boolean }) {
  // Um bloco por linha em branco; dentro do bloco, cada linha é um item.
  const blocos = texto
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map(b => b.split('\n').map(l => l.trim()).filter(Boolean))
    .filter(b => b.length > 0)

  return (
    <div style={{ marginBottom: 26, textAlign: centralizado ? 'center' : 'left' }}>
      {blocos.map((linhas, i) => {
        if (linhas.length === 1 && ehTitulo(linhas[0])) {
          return (
            <h2 key={i} style={{
              fontSize: 'clamp(12px,1.3vw,13.5px)', fontWeight: 900, letterSpacing: '.8px',
              color: CIANO, textTransform: 'uppercase', margin: '26px 0 10px',
            }}>{linhas[0]}</h2>
          )
        }

        // Lista: mais de uma linha e nenhuma delas fecha em ponto — é o jeito
        // natural de escrever tópicos sem saber que existe marcador.
        const ehLista = linhas.length > 1 && linhas.every(l => !/[.!?]$/.test(l) && l.length < 140)
        if (ehLista) {
          return (
            <ul key={i} style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', display: 'grid', gap: 9 }}>
              {linhas.map((l, n) => (
                <li key={n} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  fontSize: 'clamp(14.5px,1.6vw,16.5px)', lineHeight: 1.6, color: '#4b5563',
                  textAlign: 'left',
                }}>
                  <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: 99, background: CIANO, marginTop: 9 }} />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          )
        }

        // Linha isolada em maiúsculas no meio de um bloco (a chamada) merece
        // peso — é a frase que o leitor tem de levar embora.
        if (linhas.length === 1 && linhas[0].length < 90 && /[A-ZÀ-Ý]{6,}/.test(linhas[0]) && !/[.]$/.test(linhas[0])) {
          return (
            <p key={i} style={{
              fontSize: 'clamp(16px,1.9vw,19px)', fontWeight: 900, color: MARINHO,
              lineHeight: 1.35, margin: '18px 0 14px',
            }}>{linhas[0]}</p>
          )
        }

        return (
          <p key={i} style={{
            fontSize: 'clamp(14.5px,1.6vw,16.5px)', lineHeight: 1.75, color: '#4b5563', margin: '0 0 14px',
          }}>{linhas.join(' ')}</p>
        )
      })}
    </div>
  )
}
