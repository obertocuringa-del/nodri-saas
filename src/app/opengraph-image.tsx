import { ImageResponse } from 'next/og'

// ── Imagem do link compartilhado ─────────────────────────────────────────────
//
// O metadata já declarava openGraph e twitter:card = summary_large_image, mas
// nenhuma IMAGEM. Resultado: link do NODRI colado no WhatsApp, no Instagram ou
// no Facebook aparecia como uma tira de texto sem nada — justamente onde o
// sistema mais é divulgado. "summary_large_image" sem imagem é o pior dos dois
// mundos: o app reserva o espaço grande e não tem o que pôr nele.
//
// A imagem é desenhada aqui e gerada no build (não é arquivo solto que alguém
// precisa lembrar de trocar quando o texto do site mudar).
export const runtime = 'edge'
export const alt = 'NODRI — Gestão inteligente para salões de beleza'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const MARINHO = '#0d2a56'
const CIANO = '#00b5d8'

export default async function Imagem() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', background: MARINHO, padding: 72,
        fontFamily: 'sans-serif', color: '#ffffff',
      }}>
        {/* faixa de cor no topo, do mesmo tom da marca */}
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: 1200, height: 10, background: CIANO }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', width: 46, height: 46, borderRadius: 12, background: CIANO }} />
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, letterSpacing: 2 }}>NODRI</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ display: 'flex', fontSize: 68, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5, maxWidth: 940 }}>
            Seu salão funciona quando você não está lá?
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: '#a9c4e4', lineHeight: 1.35, maxWidth: 900 }}>
            Agenda, equipe, financeiro, metas e indicadores — o salão inteiro em um lugar só.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 26, color: '#7fa5cc' }}>
          <div style={{ display: 'flex', width: 60, height: 3, background: CIANO }} />
          <div style={{ display: 'flex' }}>nodri.com.br</div>
        </div>
      </div>
    ),
    size,
  )
}
