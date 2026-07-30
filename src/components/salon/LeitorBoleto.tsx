'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Camera, Barcode, ClipboardPaste } from 'lucide-react'
import { lerCodigoBoleto, formatarLinha, BoletoLido } from '@/lib/boleto'

// ─── Leitor de boleto ───────────────────────────────────────────────────────
// No celular: usa o BarcodeDetector que já vem no Chrome do Android — aponta a
// câmera pro código de barras e pronto, sem biblioteca nenhuma.
// No computador (onde a API não existe): campo pra COLAR a linha digitável.
// Em qualquer um dos dois, os campos de valor e data seguem editáveis depois.

export default function LeitorBoleto({ aberto, onFechar, onLido, titulo }: {
  aberto: boolean
  onFechar: () => void
  onLido: (b: BoletoLido) => void
  titulo?: string
}) {
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [temCamera, setTemCamera] = useState(false)
  const [camAtiva, setCamAtiva] = useState(false)
  const [previa, setPrevia] = useState<BoletoLido | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pararRef = useRef(false)

  // Detecta suporte só depois de montar (evita divergência com o servidor)
  useEffect(() => {
    setTemCamera(typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia)
  }, [])

  function pararCamera() {
    pararRef.current = true
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamAtiva(false)
  }
  useEffect(() => { if (!aberto) { pararCamera(); setTexto(''); setErro(''); setPrevia(null) } }, [aberto])
  useEffect(() => () => pararCamera(), [])

  async function abrirCamera() {
    setErro('')
    try {
      const Det = (window as any).BarcodeDetector
      let formatos = ['itf', 'code_128', 'qr_code']
      try {
        const sup: string[] = await Det.getSupportedFormats()
        const f = formatos.filter(x => sup.includes(x))
        if (f.length) formatos = f
      } catch { /* usa a lista padrão */ }

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      streamRef.current = stream
      pararRef.current = false
      setCamAtiva(true)

      // espera o <video> existir na tela
      setTimeout(async () => {
        if (!videoRef.current) return
        videoRef.current.srcObject = stream
        try { await videoRef.current.play() } catch { /* autoplay */ }
        const det = new Det({ formats: formatos })
        const tick = async () => {
          if (pararRef.current || !videoRef.current) return
          try {
            const achados = await det.detect(videoRef.current)
            for (const c of achados) {
              const lido = lerCodigoBoleto(String((c as any).rawValue || ''))
              if (lido.ok) { pararCamera(); aceitar(lido); return }
            }
          } catch { /* quadro ruim — tenta o próximo */ }
          setTimeout(tick, 250)
        }
        tick()
      }, 80)
    } catch {
      setErro('Não consegui abrir a câmera. Use o campo abaixo pra colar a linha digitável.')
      setCamAtiva(false)
    }
  }

  function aceitar(lido: BoletoLido) {
    // Mostra o que foi lido antes de aplicar, pra dar tempo de conferir
    setPrevia(lido)
  }

  function confirmarTexto() {
    const lido = lerCodigoBoleto(texto)
    if (!lido.ok) { setErro(lido.erro || 'Código fora do padrão.'); return }
    setErro('')
    aceitar(lido)
  }

  if (!aberto) return null

  const fmtR = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const brDe = (iso: string) => { const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}
      onClick={() => { pararCamera(); onFechar() }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}
        onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Barcode size={18} style={{ color: '#b45309' }} />
          <h3 style={{ fontSize: 15.5, fontWeight: 800, margin: 0, color: '#1a1a1a' }}>{titulo || 'Ler código do boleto'}</h3>
          <button onClick={() => { pararCamera(); onFechar() }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#767069' }}><X size={18} /></button>
        </div>

        {previa ? (
          <>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: '#15803d', marginBottom: 6 }}>
                {previa.tipo === 'banco' ? 'BOLETO BANCÁRIO' : previa.tipo === 'arrecadacao' ? 'CONTA DE CONSUMO / TRIBUTO' : 'PIX'}
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: '#6b6860' }}>Valor</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: previa.valor == null ? '#9ca3af' : '#15803d' }}>
                    {previa.valor == null ? 'não vem no código' : `R$ ${fmtR(previa.valor)}`}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: '#6b6860' }}>Vencimento</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: previa.venc ? '#15803d' : '#9ca3af' }}>
                    {previa.venc ? brDe(previa.venc) : 'não vem no código'}
                  </div>
                </div>
              </div>
              <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11.5, color: '#374151', wordBreak: 'break-all', background: '#fff', borderRadius: 8, padding: '7px 9px' }}>
                {formatarLinha(previa.linha)}
              </div>
              {previa.tipo !== 'banco' && (
                <p style={{ fontSize: 11, color: '#b45309', margin: '8px 0 0' }}>
                  Esse padrão não guarda a data de vencimento — preencha a data na mão depois.
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setPrevia(null); setTexto('') }} style={{ background: 'transparent', border: 'none', color: '#767069', fontSize: 12.5, cursor: 'pointer', padding: '9px 12px' }}>Ler outro</button>
              <button onClick={() => { const p = previa; setPrevia(null); onLido(p!) }}
                style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>
                Usar estes dados
              </button>
            </div>
          </>
        ) : (
          <>
            {temCamera && (
              camAtiva ? (
                <div>
                  <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                    <video ref={videoRef} playsInline muted style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', left: '6%', right: '6%', top: '42%', height: 2, background: '#ef4444', opacity: .85 }} />
                  </div>
                  <p style={{ fontSize: 11.5, color: '#6b6860', margin: '8px 0 0', textAlign: 'center' }}>
                    Aponte a linha vermelha em cima do código de barras. Boleto esticado e boa luz ajudam.
                  </p>
                  <button onClick={pararCamera} style={{ marginTop: 8, width: '100%', background: '#fff', border: '1px solid #e0ddd8', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: '#6b6860', cursor: 'pointer' }}>
                    Fechar câmera
                  </button>
                </div>
              ) : (
                <button onClick={abrirCamera}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 16px', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                  <Camera size={17} /> Escanear com a câmera
                </button>
              )
            )}

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: '#78350f', marginBottom: 5 }}>
                <ClipboardPaste size={13} /> {temCamera ? 'Ou cole a linha digitável' : 'Cole a linha digitável do boleto'}
              </label>
              <textarea value={texto} onChange={e => { setTexto(e.target.value); setErro('') }} rows={3} autoFocus={!temCamera}
                placeholder="Ex: 34191.79001 01043.510047 91020.150008 8 10460000047697"
                style={{ width: '100%', border: '1.5px solid #e8e6e0', borderRadius: 10, padding: '9px 11px', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'ui-monospace,monospace' }} />
              <p style={{ fontSize: 10.5, color: '#9ca3af', margin: '4px 0 0' }}>
                Serve o número impresso no boleto (47 ou 48 dígitos), os 44 do código de barras ou o Pix copia-e-cola. Pontos e espaços não importam.
              </p>
            </div>

            {erro && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>{erro}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { pararCamera(); onFechar() }} style={{ background: 'transparent', border: 'none', color: '#767069', fontSize: 12.5, cursor: 'pointer', padding: '9px 12px' }}>Cancelar</button>
              <button onClick={confirmarTexto} disabled={!texto.trim()}
                style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', opacity: texto.trim() ? 1 : .5 }}>
                Ler código
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
