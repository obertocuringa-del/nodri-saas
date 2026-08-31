import Link from 'next/link'
import type { Metadata } from 'next'

// ── Página 404 ───────────────────────────────────────────────────────────────
//
// Não existia: quem digitava errado um endereço público (ou abria um link
// antigo que já saiu do ar) via a tela cinza padrão do Next, sem marca, sem
// saída e em inglês. Para o Google, uma 404 sem conteúdo também é uma página
// morta a mais no índice.
//
// Ela usa as cores da landing porque é isso que a pessoa que cai aqui estava
// vendo — quem está dentro do painel não chega nesta tela: o middleware manda
// para o login antes.
const MARINHO = '#0d2a56'
const CIANO = '#00b5d8'

export const metadata: Metadata = {
  title: 'Página não encontrada | NODRI',
  description: 'O endereço que você abriu não existe ou saiu do ar.',
  robots: { index: false, follow: true },
}

export default function NaoEncontrada() {
  return (
    <main style={{
      minHeight: '100vh', background: '#f7fafc', color: MARINHO,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center', padding: '40px 22px', gap: 18,
    }}>
      <img src="/logo-nodri.png" alt="NODRI — Estilo e Beleza"
        width={528} height={328}
        style={{ width: 'auto', height: 64, marginBottom: 6 }} />

      <p style={{
        fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 13,
        letterSpacing: '.18em', textTransform: 'uppercase', color: '#6b7f9c', margin: 0,
      }}>
        Erro 404
      </p>

      <h1 style={{
        fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 900, letterSpacing: '-.5px',
        margin: 0, textWrap: 'balance', maxWidth: 620, lineHeight: 1.15,
      }}>
        Esta página não existe mais
      </h1>

      <p style={{ fontSize: 16, color: '#4b5563', margin: 0, maxWidth: 480, lineHeight: 1.6 }}>
        O endereço pode ter sido digitado errado, ou o link que você recebeu já
        saiu do ar. Nada foi perdido no seu salão.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
        <Link href="/" style={{
          padding: '13px 26px', borderRadius: 10, textDecoration: 'none',
          background: MARINHO, color: '#fff', fontWeight: 800, fontSize: 14.5,
        }}>
          Ir para a página inicial
        </Link>
        <Link href="/login" style={{
          padding: '13px 26px', borderRadius: 10, textDecoration: 'none',
          border: `2px solid ${MARINHO}`, color: MARINHO, fontWeight: 800, fontSize: 14.5,
        }}>
          Entrar no sistema
        </Link>
      </div>

      <p style={{ fontSize: 13, color: '#6b7f9c', marginTop: 16 }}>
        Se você chegou aqui por um link que o salão te mandou,{' '}
        <a href={`https://wa.me/5561982195214?text=${encodeURIComponent('Olá! Recebi um link do NODRI que não abre.')}`}
          target="_blank" rel="noopener noreferrer"
          style={{ color: CIANO, fontWeight: 700 }}>
          fale com a gente no WhatsApp
        </a>.
      </p>
    </main>
  )
}
