'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Camera, Barcode, ClipboardPaste, Image as ImageIcon, Zap } from 'lucide-react'
import { lerCodigoBoleto, formatarLinha, BoletoLido } from '@/lib/boleto'

// ─── Leitor de boleto ───────────────────────────────────────────────────────
// Três caminhos, do mais fácil pro mais garantido:
//  1) FOTO do código — a imagem parada tem resolução muito maior que o vídeo,
//     é o que mais acerta em código de boleto (que é largo e fininho).
//  2) CÂMERA ao vivo — usa o BarcodeDetector que já vem no Chrome do Android.
//  3) COLAR o número impresso — sempre funciona, em qualquer aparelho.
//
// Regra que aprendi na marra: nunca engolir erro aqui. Se a leitura falhar, a
// tela TEM que dizer o que aconteceu, senão vira "abre a câmera e não acha nada".

const FORMATOS_DESEJADOS = ['itf', 'code_128', 'qr_code', 'data_matrix', 'code_39']

export default function LeitorBoleto({ aberto, onFechar, onLido, titulo }: {
  aberto: boolean
  onFechar: () => void
  onLido: (b: BoletoLido) => void
  titulo?: string
}) {
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [status, setStatus] = useState('')          // feedback ao vivo da leitura
  const [formatos, setFormatos] = useState<string[]>([])
  const [suporte, setSuporte] = useState<'checando' | 'ok' | 'nao'>('checando')
  const [camAtiva, setCamAtiva] = useState(false)
  const [temTorch, setTemTorch] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [previa, setPrevia] = useState<BoletoLido | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const pararRef = useRef(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // Suporte de verdade: não basta a API existir — ela precisa aceitar algum
  // formato de código de barras. Em alguns navegadores ela existe e vem vazia.
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const temApi = typeof window !== 'undefined' && 'BarcodeDetector' in window
      if (!temApi) { if (vivo) setSuporte('nao'); return }
      try {
        const sup: string[] = await (window as any).BarcodeDetector.getSupportedFormats()
        const uteis = FORMATOS_DESEJADOS.filter(f => Array.isArray(sup) && sup.includes(f))
        if (!vivo) return
        setFormatos(uteis)
        setSuporte(uteis.length ? 'ok' : 'nao')
      } catch { if (vivo) setSuporte('nao') }
    })()
    return () => { vivo = false }
  }, [])

  const temCameraAoVivo = suporte === 'ok' && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  // ITF é o formato do código de barras do boleto. Sem ele, o navegador só
  // enxerga QR Code — e o boleto nunca seria achado, sem nenhum aviso.
  const temItf = formatos.includes('itf')

  function pararCamera() {
    pararRef.current = true
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    trackRef.current = null
    setCamAtiva(false); setTorchOn(false); setTemTorch(false)
  }
  useEffect(() => { if (!aberto) { pararCamera(); setTexto(''); setErro(''); setStatus(''); setPrevia(null) } }, [aberto])
  useEffect(() => () => pararCamera(), [])

  function novoDetector() {
    const Det = (window as any).BarcodeDetector
    try { return new Det({ formats: formatos }) } catch { return new Det() }  // formato recusado → usa o padrão
  }

  // Avalia um código bruto; devolve true quando serviu
  function tentarCodigo(raw: string, formato?: string): boolean {
    const lido = lerCodigoBoleto(raw)
    if (lido.ok) { setPrevia(lido); return true }
    const qtd = String(raw || '').replace(/\D/g, '').length
    setStatus(`Achei um código de ${qtd} dígito(s)${formato ? ` (${formato})` : ''}, mas boleto tem 44, 47 ou 48. Enquadre o código INTEIRO, de ponta a ponta.`)
    return false
  }

  // ── 1) Foto do código (funciona no celular e no PC com arquivo salvo) ──
  async function lerDaFoto(file: File | undefined) {
    if (!file) return
    setErro(''); setStatus('Analisando a foto…')
    if (suporte !== 'ok') { setErro('Este navegador não sabe ler código de barras. Use o campo de colar o número.'); setStatus(''); return }
    try {
      const bmp = await createImageBitmap(file)
      const det = novoDetector()
      const achados = await det.detect(bmp)
      if (!achados?.length) {
        setStatus('Não encontrei código nessa foto. Tente de novo com o boleto esticado, bem iluminado, o código ocupando toda a largura da foto e a câmera reta (sem inclinar).')
        return
      }
      for (const c of achados) if (tentarCodigo(String(c.rawValue || ''), c.format)) return
    } catch (e: any) {
      setErro(`Não consegui analisar a foto (${e?.name || 'erro'}). Dá pra colar o número do boleto no campo abaixo.`)
      setStatus('')
    }
  }

  // ── 2) Câmera ao vivo ──
  async function abrirCamera() {
    setErro(''); setStatus('Abrindo a câmera…')
    let stream: MediaStream
    try {
      // Resolução alta ajuda muito: o código do boleto é largo e as barras finas
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
    } catch {
      try { stream = await navigator.mediaDevices.getUserMedia({ video: true }) }
      catch (e: any) {
        setErro(e?.name === 'NotAllowedError'
          ? 'Você bloqueou a câmera pra este site. Libere na permissão do navegador, ou use "Foto do código" / colar o número.'
          : 'Não consegui abrir a câmera. Use "Foto do código" ou cole o número.')
        setStatus(''); return
      }
    }

    streamRef.current = stream
    trackRef.current = stream.getVideoTracks()[0] || null
    try { setTemTorch(!!(trackRef.current?.getCapabilities?.() as any)?.torch) } catch { /* sem info */ }
    pararRef.current = false
    setCamAtiva(true)
    setStatus('Procurando o código…')

    // Espera o <video> aparecer na tela — com tentativas. (Antes eu desistia
    // depois de 80ms e a câmera ficava ligada sem ninguém lendo nada.)
    let esperas = 0
    const iniciar = async () => {
      if (pararRef.current) return
      if (!videoRef.current) {
        if (esperas++ > 40) { setErro('A câmera abriu mas o vídeo não montou na tela. Use "Foto do código".'); return }
        setTimeout(iniciar, 50); return
      }
      videoRef.current.srcObject = stream
      try { await videoRef.current.play() } catch { /* autoplay */ }

      let det: any
      try { det = novoDetector() } catch (e: any) {
        setErro(`O leitor de código deste navegador não inicializou (${e?.name || 'erro'}). Use "Foto do código" ou cole o número.`)
        pararCamera(); return
      }

      let voltas = 0, falhas = 0
      const tick = async () => {
        if (pararRef.current || !videoRef.current) return
        const v = videoRef.current
        if (!v.videoWidth) { setTimeout(tick, 200); return }   // quadro ainda não veio
        try {
          const achados = await det.detect(v)
          voltas++
          if (achados?.length) {
            for (const c of achados) if (tentarCodigo(String(c.rawValue || ''), c.format)) { pararCamera(); return }
          } else if (voltas === 12) {
            setStatus('Ainda procurando. Encoste mais perto até o código ocupar a largura da tela, boleto bem esticado e câmera reta. Se o boleto tiver QR Code do Pix, aponte nele — a leitura é bem mais fácil.')
          } else if (voltas === 40) {
            setStatus('Este tipo de código é difícil pela câmera ao vivo. Tente "Foto do código" (a foto tem muito mais resolução) ou cole o número impresso.')
          }
        } catch (e: any) {
          if (++falhas === 3) {
            setErro(`O leitor deste navegador falhou na leitura (${e?.name || 'erro'}). Use "Foto do código" ou cole o número.`)
            pararCamera(); return
          }
        }
        setTimeout(tick, 200)
      }
      tick()
    }
    iniciar()
  }

  async function alternarTorch() {
    const t = trackRef.current
    if (!t) return
    try { await t.applyConstraints({ advanced: [{ torch: !torchOn }] } as any); setTorchOn(!torchOn) }
    catch { setTemTorch(false) }
  }

  function confirmarTexto() {
    const lido = lerCodigoBoleto(texto)
    if (!lido.ok) { setErro(lido.erro || 'Código fora do padrão.'); return }
    setErro(''); setPrevia(lido)
  }

  if (!aberto) return null

  const fmtR = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const brDe = (iso: string) => { const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : '' }
  const btnGrande = (bg: string, cor: string, borda?: string): React.CSSProperties => ({
    flex: '1 1 150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    background: bg, color: cor, border: borda || 'none', borderRadius: 10, padding: '12px 14px',
    fontSize: 13.5, fontWeight: 800, cursor: 'pointer',
  })

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
              <button onClick={() => { setPrevia(null); setTexto(''); setStatus('') }} style={{ background: 'transparent', border: 'none', color: '#767069', fontSize: 12.5, cursor: 'pointer', padding: '9px 12px' }}>Ler outro</button>
              <button onClick={() => { const p = previa; setPrevia(null); onLido(p!) }}
                style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>
                Usar estes dados
              </button>
            </div>
          </>
        ) : (
          <>
            {camAtiva && (
              <div>
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                  <video ref={videoRef} playsInline muted style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', left: '3%', right: '3%', top: '30%', bottom: '30%', border: '2px solid #ef4444', borderRadius: 6, pointerEvents: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {temTorch && (
                    <button onClick={alternarTorch} style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 5, background: torchOn ? '#fef3c7' : '#fff', border: '1px solid #e0ddd8', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: '#b45309', cursor: 'pointer' }}>
                      <Zap size={14} /> {torchOn ? 'Lanterna ligada' : 'Lanterna'}
                    </button>
                  )}
                  <button onClick={pararCamera} style={{ flex: 1, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: '#6b6860', cursor: 'pointer' }}>
                    Fechar câmera
                  </button>
                </div>
              </div>
            )}

            {!camAtiva && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {suporte === 'ok' && (
                  <button onClick={() => fileRef.current?.click()} style={btnGrande('#f59e0b', '#fff')}>
                    <ImageIcon size={17} /> Foto do código
                  </button>
                )}
                {temCameraAoVivo && (
                  <button onClick={abrirCamera} style={btnGrande('#fff', '#b45309', '1.5px solid #f59e0b')}>
                    <Camera size={17} /> Câmera ao vivo
                  </button>
                )}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => { lerDaFoto(e.target.files?.[0]); e.currentTarget.value = '' }} />

            {suporte === 'ok' && !camAtiva && (
              <p style={{ fontSize: 11, color: '#6b6860', margin: 0 }}>
                A <strong>foto</strong> acerta mais que a câmera ao vivo (tem muito mais resolução). Enquadre o código de barras inteiro, de ponta a ponta, com o boleto esticado.
              </p>
            )}
            {suporte === 'nao' && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '9px 11px', fontSize: 11.5, color: '#92400e' }}>
                Este navegador não tem leitor de código de barras (é o caso do Chrome no Windows). No <strong>celular</strong> os botões de foto/câmera aparecem. Aqui, cole o número impresso — dá no mesmo.
              </div>
            )}
            {suporte === 'ok' && !temItf && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '9px 11px', fontSize: 11.5, color: '#92400e' }}>
                Atenção: este navegador lê <strong>QR Code</strong>, mas não lê o código de barras do boleto (formato ITF) — ele nunca vai achar as barras. Aponte no <strong>QR Code do Pix</strong> do boleto, se tiver, ou cole o número impresso.
              </div>
            )}
            {suporte === 'ok' && (
              <p style={{ fontSize: 10, color: '#c4c0b8', margin: 0 }}>Leitor do navegador: {formatos.join(', ') || 'nenhum'}</p>
            )}

            {status && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '9px 11px', fontSize: 11.5, color: '#1d4ed8' }}>{status}</div>
            )}

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: '#78350f', marginBottom: 5 }}>
                <ClipboardPaste size={13} /> {suporte === 'ok' ? 'Ou cole a linha digitável' : 'Cole a linha digitável do boleto'}
              </label>
              <textarea value={texto} onChange={e => { setTexto(e.target.value); setErro('') }} rows={3} autoFocus={suporte !== 'ok'}
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
