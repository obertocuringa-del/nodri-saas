import { ImageResponse } from 'next/og'

// Imagem do card quando o link /vagas é colado no WhatsApp, Instagram ou
// Facebook. Sem ela, valeria a do site (a que vende o NODRI para dono de salão),
// que não tem nada a ver com quem procura emprego.
export const runtime = 'edge'
export const alt = 'Trabalhe conosco: vagas em salões de beleza parceiros do NODRI'
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
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: 1200, height: 10, background: CIANO }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', width: 46, height: 46, borderRadius: 12, background: CIANO }} />
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, letterSpacing: 2 }}>NODRI</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Trabalhe conosco
          </div>
          <div style={{ display: 'flex', fontSize: 34, color: '#a9c4e4', lineHeight: 1.35, maxWidth: 960 }}>
            Vagas em salões de beleza parceiros: recepção, manicure, cabeleireira, serviços gerais e mais.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 26, color: '#7fa5cc' }}>
          <div style={{ display: 'flex', width: 60, height: 3, background: CIANO }} />
          <div style={{ display: 'flex' }}>nodri.com.br/vagas</div>
        </div>
      </div>
    ),
    size,
  )
}
