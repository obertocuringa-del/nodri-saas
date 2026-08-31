'use client'

// Rede de segurança do último andar: só entra em cena quando o erro acontece
// no próprio layout raiz, antes de existir qualquer parte do app para segurar.
// Por isso ela precisa desenhar <html> e <body> por conta própria — não há
// layout nenhum em volta neste ponto.
export default function ErroGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{
        margin: 0, minHeight: '100vh', background: '#f7fafc', color: '#0d2a56',
        fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '40px 22px', gap: 16,
      }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, maxWidth: 520 }}>
          O sistema não conseguiu abrir
        </h1>
        <p style={{ fontSize: 15, color: '#4b5563', margin: 0, maxWidth: 440, lineHeight: 1.6 }}>
          Seus dados estão salvos. Recarregue a página; se continuar, avise o
          suporte com o código abaixo.
        </p>
        <button onClick={reset} style={{
          padding: '13px 26px', borderRadius: 10, border: 'none', background: '#0d2a56',
          color: '#fff', fontSize: 14.5, fontWeight: 800, cursor: 'pointer', marginTop: 6,
        }}>
          Recarregar
        </button>
        {error.digest ? (
          <p style={{ fontSize: 12, color: '#6b7f9c', marginTop: 10 }}>Código: <b>{error.digest}</b></p>
        ) : null}
      </body>
    </html>
  )
}
