'use client'
import { useEffect, useRef, useState } from 'react'
import { X, Camera, Barcode, ClipboardPaste, Image as ImageIcon, Zap } from 'lucide-react'
import { lerCodigoBoleto, formatarLinha, BoletoLido } from '@/lib/boleto'
import { decodificarCanvas, paraCanvas, prepararLeitor, nativoLeBoleto } from '@/lib/leitorCodigo'

// ─── Leitor de boleto ───────────────────────────────────────────────────────
// Quatro caminhos, e todos ficam disponíveis ao mesmo tempo:
//  1) LEITOR DE MÃO (USB) — o do balcão. Se comporta como teclado, então
//     escutamos a janela toda: aponta, atira, pronto. Precisa ser leitor LASER
//     ou de fenda; leitor CCD de produto (tipo BR-400) não alcança a largura
//     do código do boleto.
//  2) FOTO do código — imagem parada tem muito mais resolução que o vídeo, é o
//     que mais acerta pela câmera.
//  3) CÂMERA ao vivo.
//  4) COLAR o número impresso — funciona em qualquer aparelho.
//
// A decodificação usa o leitor nativo do navegador quando existe e cai pro
// ZXing (carregado sob demanda) quando não — por isso câmera e foto funcionam
// também no iPhone e na webcam do PC.

export default function LeitorBoleto({ aberto, onFechar, onLido, titulo }: {
  aberto: boolean
  onFechar: () => void
  onLido: (b: BoletoLido) => void
  titulo?: string
}) {
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [status, setStatus] = useState('')
  const [camAtiva, setCamAtiva] = useState(false)
  const [temCamera, setTemCamera] = useState(false)
  const [temTorch, setTemTorch] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [analisando, setAnalisando] = useState(false)
  const [previa, setPrevia] = useState<BoletoLido | null>(null)
  const [capturado, setCapturado] = useState('')      // dígitos do leitor de mão
  const [dicaLeitor, setDicaLeitor] = useState(false) // leitor mandou código curto
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const pararRef = useRef(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setTemCamera(typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia)
  }, [])

  // Baixa o decodificador enquanto o usuário ainda está se organizando
  useEffect(() => { if (aberto) prepararLeitor() }, [aberto])

  function pararCamera() {
    pararRef.current = true
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    trackRef.current = null
    setCamAtiva(false); setTorchOn(false); setTemTorch(false)
  }
  useEffect(() => {
    if (!aberto) {
      pararCamera(); setTexto(''); setErro(''); setStatus('')
      setPrevia(null); setCapturado(''); setDicaLeitor(false); setAnalisando(false)
    }
  }, [aberto])
  useEffect(() => () => pararCamera(), [])

  // ── LEITOR DE MÃO (USB/HID): se comporta como teclado ─────────────────────
  useEffect(() => {
    if (!aberto || previa) return
    let buf = ''
    let timer: any
    let t0 = 0
    // Leitor dispara ~10ms por dígito; gente digitando passa de 100ms. Serve
    // pra não acusar "leitor lendo pela metade" quando é só digitação lenta.
    const foiLeitor = () => buf.length > 1 && (Date.now() - t0) / buf.length < 60

    const processar = (digitos: string, doLeitor: boolean) => {
      const lido = lerCodigoBoleto(digitos)
      if (lido.ok) { setErro(''); setStatus(''); setCapturado(''); setTexto(''); setDicaLeitor(false); setPrevia(lido); return }
      if (!doLeitor) return   // digitação à mão: quem avisa é o botão "Ler código"
      if (digitos.length < 20) setDicaLeitor(true)
      setStatus(digitos.length < 20
        ? `O leitor mandou só ${digitos.length} dígito(s). Boleto tem 44 — está lendo o código pela metade. Veja a dica logo abaixo.`
        : `Recebi ${digitos.length} dígitos, mas boleto tem 44, 47 ou 48. Dispare de novo, com o leitor reto e bem em cima do código.`)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (buf.length >= 10) { e.preventDefault(); const b = buf, lr = foiLeitor(); buf = ''; setCapturado(''); processar(b, lr) }
        return
      }
      if (!/^[0-9]$/.test(e.key)) return
      if (!buf) t0 = Date.now()
      buf += e.key
      clearTimeout(timer)
      const doLeitor = foiLeitor()
      if (doLeitor) setCapturado(buf)
      if (buf.length === 44 || buf.length === 47 || buf.length === 48) {
        const b = buf; buf = ''; setCapturado('')
        processar(b, doLeitor)
        return
      }
      timer = setTimeout(() => {
        if (buf.length >= 10) { const b = buf, lr = foiLeitor(); buf = ''; setCapturado(''); processar(b, lr) }
        else { buf = ''; setCapturado('') }
      }, 400)
    }

    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(timer) }
  }, [aberto, previa])

  // Avalia códigos brutos; devolve true quando um serviu
  function tentarCodigos(brutos: string[]): boolean {
    for (const raw of brutos) {
      const lido = lerCodigoBoleto(raw)
      if (lido.ok) { setStatus(''); setErro(''); setPrevia(lido); return true }
    }
    if (brutos.length) {
      const qtd = String(brutos[0]).replace(/\D/g, '').length
      setStatus(`Achei um código de ${qtd} dígito(s), mas boleto tem 44, 47 ou 48. Enquadre o código INTEIRO, de ponta a ponta.`)
    }
    return false
  }

  // ── FOTO do código ────────────────────────────────────────────────────────
  async function lerDaFoto(file: File | undefined) {
    if (!file) return
    setErro(''); setStatus('Analisando a foto…'); setAnalisando(true)
    try {
      const bmp = await createImageBitmap(file)
      // Resolução alta ajuda o ITF (barras finas), mas acima de ~2000px o ganho
      // vira só tempo de processamento.
      const canvas = paraCanvas(bmp, 2000)
      if (!canvas) { setErro('Não consegui abrir essa imagem.'); return }
      const achados = await decodificarCanvas(canvas)
      if (!achados.length) {
        setStatus('Não encontrei código nessa foto. Tente com o boleto esticado, boa luz, o código ocupando toda a largura da foto e a câmera reta (sem inclinar).')
        return
      }
      tentarCodigos(achados)
    } catch (e: any) {
      setErro(`Não consegui analisar a foto (${e?.name || 'erro'}). Dá pra colar o número do boleto no campo abaixo.`)
      setStatus('')
    } finally { setAnalisando(false) }
  }

  // ── CÂMERA ao vivo ────────────────────────────────────────────────────────
  async function abrirCamera() {
    setErro(''); setStatus('Abrindo a câmera…')
    let stream: MediaStream
    try {
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

    // Espera o <video> montar — com tentativas, senão a câmera fica ligada
    // sem ninguém lendo nada.
    let esperas = 0
    const iniciar = async () => {
      if (pararRef.current) return
      if (!videoRef.current) {
        if (esperas++ > 40) { setErro('A câmera abriu mas o vídeo não montou na tela. Use "Foto do código".'); return }
        setTimeout(iniciar, 50); return
      }
      videoRef.current.srcObject = stream
      try { await videoRef.current.play() } catch { /* autoplay */ }

      // Se o navegador lê ITF sozinho, os primeiros segundos usam só ele — assim
      // o decodificador extra nem chega a ser baixado quando não é necessário.
      const nativoBom = await nativoLeBoleto()
      let voltas = 0
      const tick = async () => {
        if (pararRef.current || !videoRef.current) return
        const v = videoRef.current
        if (!v.videoWidth) { setTimeout(tick, 200); return }
        try {
          const canvas = paraCanvas(v, 1280)
          if (canvas) {
            const achados = await decodificarCanvas(canvas, !nativoBom || voltas >= 14)
            if (achados.length && tentarCodigos(achados)) { pararCamera(); return }
          }
          voltas++
          if (voltas === 15) setStatus('Ainda procurando. Encoste até o código ocupar a largura da tela, boleto esticado e câmera reta. Se o boleto tiver QR Code do Pix, aponte nele — é bem mais fácil de ler.')
          else if (voltas === 45) setStatus('Pela câmera ao vivo esse código é difícil. Tente "Foto do código" (bem mais resolução) ou cole o número impresso.')
        } catch { /* quadro ruim — segue */ }
        setTimeout(tick, 220)
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
              <button onClick={() => { setPrevia(null); setTexto(''); setStatus(''); setDicaLeitor(false) }} style={{ background: 'transparent', border: 'none', color: '#767069', fontSize: 12.5, cursor: 'pointer', padding: '9px 12px' }}>Ler outro</button>
              <button onClick={() => { const p = previa; setPrevia(null); onLido(p!) }}
                style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>
                Usar estes dados
              </button>
            </div>
          </>
        ) : (
          <>
            {camAtiva ? (
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
            ) : (
              <>
                {/* Leitor de mão: ativo enquanto o modal estiver aberto */}
                <div style={{ background: capturado ? '#ecfdf5' : '#f5f3ff', border: `1.5px dashed ${capturado ? '#6ee7b7' : '#c4b5fd'}`, borderRadius: 12, padding: '13px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: capturado ? '#047857' : '#6b21a8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <Barcode size={16} /> {capturado ? `Recebendo… ${capturado.length} dígitos` : 'Leitor de mão pronto — aponte e dispare'}
                  </div>
                  {capturado
                    ? <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11, color: '#374151', marginTop: 5, wordBreak: 'break-all' }}>{capturado}</div>
                    : <div style={{ fontSize: 11, color: '#7c6fa8', marginTop: 4 }}>Não precisa clicar em campo nenhum. Dispare no código do boleto que ele preenche sozinho.</div>}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => fileRef.current?.click()} disabled={analisando} style={{ ...btnGrande('#f59e0b', '#fff'), opacity: analisando ? .6 : 1 }}>
                    <ImageIcon size={17} /> {analisando ? 'Analisando…' : 'Foto do código'}
                  </button>
                  {temCamera && (
                    <button onClick={abrirCamera} style={btnGrande('#fff', '#b45309', '1.5px solid #f59e0b')}>
                      <Camera size={17} /> Câmera ao vivo
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 11, color: '#6b6860', margin: 0 }}>
                  A <strong>foto</strong> acerta mais que a câmera ao vivo (tem muito mais resolução). Enquadre o código de barras inteiro, de ponta a ponta, com o boleto esticado.
                </p>
              </>
            )}

            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => { lerDaFoto(e.target.files?.[0]); e.currentTarget.value = '' }} />

            {dicaLeitor && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', fontSize: 11.5, color: '#92400e', lineHeight: 1.65 }}>
                <strong>Seu leitor está lendo o código pela metade.</strong> Duas causas possíveis: o formato <strong>ITF</strong> está limitado a códigos curtos (configura no manual do leitor, habilitando comprimento variável), ou o leitor é <strong>CCD de produto</strong> — esse tipo não alcança a largura do código do boleto, só resolve com leitor laser ou de fenda.
              </div>
            )}

            {status && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '9px 11px', fontSize: 11.5, color: '#1d4ed8' }}>{status}</div>
            )}

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: '#78350f', marginBottom: 5 }}>
                <ClipboardPaste size={13} /> Ou cole a linha digitável
              </label>
              <textarea value={texto} onChange={e => { setTexto(e.target.value); setErro('') }} rows={3}
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
