'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MARINHO = '#0d2a56'

// `inteira`: a midia aparece completa, sem corte. Foto de salao fica bem
// preenchendo o quadro (o padrao), mas ARTE nao: preencher come as bordas,
// e numa peca desenhada a borda e onde ficam o titulo e o rodape.
export interface Midia { tipo?: 'imagem' | 'video'; url: string; inteira?: boolean }

/** Link do Drive vira endereço direto: o que ele compartilha é uma página. */
export function urlDeImagem(url: string): string {
  const u = String(url || '').trim()
  const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?[^]*id=)([A-Za-z0-9_-]{10,})/)
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : u
}

/** Aceita youtu.be, watch?v=, /embed/ e /shorts/ — o dono cola o que tiver. */
export function idDoYoutube(url: string): string | null {
  const m = String(url || '').match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{6,})/)
  return m ? m[1] : null
}

function ehVideo(m: Midia): boolean {
  return m.tipo === 'video' || !!idDoYoutube(m.url)
}

// ── Carrossel de imagens e vídeos ───────────────────────────────────────────
//
// Troca sozinho no intervalo configurado, com setas para quem quiser adiantar.
//
// Duas decisões que evitam irritar quem está olhando:
//
// • VÍDEO NÃO TROCA SOZINHO. Se o item atual é vídeo, o relógio para — trocar
//   a mídia no meio de um vídeo que a pessoa começou a assistir é a forma mais
//   rápida de perder a visita.
//
// • Passar o mouse em cima também pausa. Quem parou para olhar está olhando.
export default function Carrossel({ midias, intervalo = 5, alturaMax, preencher, recuo = 0, className }: {
  midias: Midia[]; intervalo?: number
  /** Teto de altura (ex.: '58vh'). Sem isso a midia cresce com a largura da
      coluna e empurra o botao para fora da tela — quem chega precisa rolar
      para descobrir que existe um botao. */
  alturaMax?: string
  /** A midia ocupa o retangulo do texto ao lado em vez de seguir a proporcao
      16/10: nasce na linha da etiqueta e termina onde o texto termina. Foto
      preenche esse retangulo; video mantem o 16/9 dele, so alinhado no topo
      (esticar o quadro do YouTube corta a imagem). */
  preencher?: boolean
  /** Distancia entre o topo da coluna e a primeira linha do texto ao lado.
      Medida na pagina: depende da altura da tela e do tamanho do texto. */
  recuo?: number
  /** Para a pagina ordenar e ajustar a midia no celular. */
  className?: string
}) {
  const lista = (midias || []).filter(m => m?.url?.trim())
  const [i, setI] = useState(0)
  const [parado, setParado] = useState(false)

  useEffect(() => { if (i >= lista.length) setI(0) }, [lista.length, i])

  useEffect(() => {
    if (lista.length < 2 || parado) return
    if (ehVideo(lista[i] || {} as Midia)) return
    const seg = Math.max(2, Number(intervalo) || 5)
    const t = setTimeout(() => setI(v => (v + 1) % lista.length), seg * 1000)
    return () => clearTimeout(t)
  }, [i, lista, intervalo, parado])

  if (!lista.length) return null

  const atual = lista[Math.min(i, lista.length - 1)]
  const yt = ehVideo(atual) ? idDoYoutube(atual.url) : null
  const varios = lista.length > 1

  const seta: React.CSSProperties = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: 38, height: 38, borderRadius: 99, border: 'none', cursor: 'pointer',
    background: 'rgba(255,255,255,.94)', color: MARINHO,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(13,42,86,.22)', zIndex: 3,
  }

  return (
    <div
      className={[className, preencher ? 'nodri-midia-cheia' : ''].filter(Boolean).join(' ')}
      onMouseEnter={() => setParado(true)}
      onMouseLeave={() => setParado(false)}
      style={{
        position: 'relative',
        ...(preencher ? {
          display: 'flex', flexDirection: 'column',
          marginTop: recuo, marginBottom: recuo,
          height: `calc(100% - ${2 * recuo}px)`,
        } : null),
      }}>

      {yt ? (
        <div style={{
          position: 'relative', borderRadius: 18, overflow: 'hidden',
          border: '1px solid #e3e8f0', background: '#000',
          boxShadow: '0 18px 50px rgba(13,42,86,.14)',
          aspectRatio: '16 / 9',
          maxHeight: alturaMax, margin: '0 auto', width: '100%',
          // Sem isto o flex espremia o quadro quando a coluna era mais baixa
          // que os 16/9 do video.
          flexShrink: 0,
        }}>
          <iframe
            src={`https://www.youtube.com/embed/${yt}`}
            title="Vídeo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>
      ) : (
        <img src={urlDeImagem(atual.url)} alt=""
          style={{
            width: '100%', display: 'block', borderRadius: 18,
            border: '1px solid #e3e8f0', boxShadow: '0 18px 50px rgba(13,42,86,.12)',
            objectFit: atual.inteira ? 'contain' : 'cover',
            maxHeight: alturaMax, margin: '0 auto',
            // Preenchendo, quem manda na altura e a coluna; senao volta a
            // proporcao de sempre.
            // Fora do fluxo de proposito: solta, a altura natural da foto
            // esticava a linha do grid e a abertura passava do fim da tela.
            // Assim quem manda na altura e a coluna do texto ao lado.
            // Marcada como inteira, ela volta ao fluxo e a altura fica
            // automatica: ajusta-se a largura da coluna sozinha e nao corta
            // em tela nenhuma. Preenchendo, quem manda na altura e a coluna.
            ...(atual.inteira
              ? { height: 'auto' as const }
              : preencher
                ? { position: 'absolute' as const, inset: 0, height: '100%' }
                : { aspectRatio: '16 / 10' }),
          }} />
      )}

      {varios && (
        <>
          <button aria-label="Anterior" style={{ ...seta, left: 10 }}
            onClick={() => setI(v => (v - 1 + lista.length) % lista.length)}>
            <ChevronLeft size={20} />
          </button>
          <button aria-label="Próxima" style={{ ...seta, right: 10 }}
            onClick={() => setI(v => (v + 1) % lista.length)}>
            <ChevronRight size={20} />
          </button>

          {/* Bolinhas: dizem quantas existem e onde você está. Sem elas o
              visitante não sabe se já viu tudo. */}
          {/* Preenchendo a coluna nao ha espaco embaixo da foto: as bolinhas
              passam a flutuar sobre ela. */}
          <div style={{
            display: 'flex', gap: 7, justifyContent: 'center', marginTop: 14,
            ...(preencher ? { position: 'absolute', left: 0, right: 0, bottom: 12, marginTop: 0 } : null),
          }}>
            {lista.map((_, j) => (
              <button key={j} aria-label={`Ir para ${j + 1}`} onClick={() => setI(j)}
                style={{
                  width: j === i ? 22 : 8, height: 8, borderRadius: 99, border: 'none',
                  cursor: 'pointer', transition: 'width .2s',
                  background: j === i ? MARINHO : (preencher ? 'rgba(255,255,255,.75)' : '#c9d3e0'),
                }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
