'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X, Upload, Loader2, Download, Sparkles, ZoomIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { getLogoSalao } from '@/lib/logoSalao'
import {
  TEMAS, FORMATOS, desenharArte, prepararLogo, raioDoCirculo,
  type Tema, type FormatoId, type Enquadre,
} from '@/lib/arteAniversario'

// ── Editor da postagem de aniversário ────────────────────────────────────────
//
// Uma tela só, não um passo a passo. A pessoa escolhe o profissional, sobe a
// foto, arrasta para enquadrar e troca a cor vendo o resultado mudar ao lado —
// num assistente de várias etapas ela só descobriria o resultado no fim, e
// voltaria toda vez que não gostasse.
//
// A foto NÃO sobe para o servidor: fica no navegador, vira imagem no canvas e
// morre quando a janela fecha. Guardar foto de gente no storage para só
// desenhar uma arte seria custo e responsabilidade à toa.

interface Prof { id: string; nome_completo?: string; apelido?: string; cargo?: string; ativo?: boolean; is_departamento?: boolean }

export default function PostagemAniversario({ aoFechar }: { aoFechar: () => void }) {
  const [profs, setProfs] = useState<Prof[]>([])
  const [profId, setProfId] = useState('')
  const [sexo, setSexo] = useState<'feminino' | 'masculino'>('feminino')
  const [temaId, setTemaId] = useState('rose')
  const [mensagem, setMensagem] = useState('Que a felicidade acompanhe cada passo seu e que seu sucesso seja cada vez maior. Feliz aniversário!')
  const [gerando, setGerando] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const [formato, setFormato] = useState<FormatoId>('stories')
  const [enquadre, setEnquadre] = useState<Enquadre>({ x: 0, y: 0, zoom: 1 })

  const [foto, setFoto] = useState<HTMLImageElement | null>(null)
  const [logo, setLogo] = useState<HTMLImageElement | null>(null)
  const [logoLum, setLogoLum] = useState(0.5)
  const [nomeSalao, setNomeSalao] = useState('')

  const telaRef = useRef<HTMLCanvasElement>(null)
  const arrastando = useRef<{ x: number; y: number } | null>(null)

  const tema: Tema = useMemo(() => TEMAS.find(t => t.id === temaId) || TEMAS[0], [temaId])
  const prof = useMemo(() => profs.find(p => p.id === profId), [profs, profId])

  // O nome que vai no banner é o APELIDO do cadastro: é como a pessoa é
  // chamada no salão e como os clientes a conhecem. Nome completo só entra
  // quando não há apelido.
  const nomeBanner = (prof?.apelido || prof?.nome_completo || '').trim()

  // ── carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/profissionais?leve=1')
      .then(r => (r.ok ? r.json() : []))
      .then(d => {
        const lista = (Array.isArray(d) ? d : [])
          .filter((p: Prof) => !p.is_departamento && p.ativo !== false)
          .sort((a: Prof, b: Prof) => (a.apelido || a.nome_completo || '').localeCompare(b.apelido || b.nome_completo || ''))
        setProfs(lista)
      })
      .catch(() => setProfs([]))

    getLogoSalao().then(url => {
      if (!url) return
      const img = new Image()
      img.onload = async () => {
        // O fundo branco é tirado UMA vez, aqui, e não a cada redesenho: varrer
        // a imagem inteira a cada tecla digitada na mensagem travaria a prévia.
        const pronta = await prepararLogo(img)
        if (pronta) { setLogo(pronta.imagem); setLogoLum(pronta.luminancia) }
        else setLogo(img)
      }
      img.onerror = () => { /* fica o nome do salão */ }
      // Sem crossOrigin de propósito: a logo é guardada como data URL no
      // próprio banco, então é mesma origem. Pedir CORS aqui faria a imagem
      // falhar ao carregar em vez de aparecer.
      img.src = url
    })

    fetch('/api/salon/perfil')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setNomeSalao(d?.nome || d?.nome_salao || ''))
      .catch(() => {})
  }, [])

  // Trocar o sexo troca o tema para o primeiro daquela família — mas os cinco
  // continuam clicáveis, porque a regra é da pessoa, não do sistema.
  useEffect(() => {
    const primeiro = TEMAS.find(t => t.familia === sexo)
    if (primeiro) setTemaId(primeiro.id)
  }, [sexo])

  // ── mensagem da IA ao escolher o profissional ──────────────────────────────
  const gerarMensagem = useCallback(async (id: string) => {
    if (!id) return
    setGerando(true)
    try {
      const r = await fetch('/api/salon/postagem-aniversario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profissional_id: id }),
      })
      const d = await r.json()
      if (d?.mensagem) setMensagem(d.mensagem)
      if (d && d.gerado_por_ia === false) toast('Texto padrão — a IA não respondeu. Pode editar à vontade.')
    } catch {
      toast.error('Não consegui gerar o texto. Escreva o seu abaixo.')
    }
    setGerando(false)
  }, [])

  function escolherProf(id: string) {
    setProfId(id)
    gerarMensagem(id)
  }

  // ── foto ───────────────────────────────────────────────────────────────────
  function carregarFoto(arquivo: File) {
    if (!arquivo.type.startsWith('image/')) { toast.error('Escolha um arquivo de imagem.'); return }
    const leitor = new FileReader()
    leitor.onload = () => {
      const img = new Image()
      img.onload = () => { setFoto(img); setEnquadre({ x: 0, y: 0, zoom: 1 }) }
      img.onerror = () => toast.error('Não consegui abrir esta imagem.')
      img.src = String(leitor.result)
    }
    leitor.readAsDataURL(arquivo)
  }

  // ── desenho da prévia ──────────────────────────────────────────────────────
  const redesenhar = useCallback(async () => {
    const tela = telaRef.current
    if (!tela) return
    const { w, h } = FORMATOS[formato]
    // A prévia é desenhada no tamanho REAL e exibida menor por CSS: assim o que
    // aparece na tela é exatamente o arquivo que vai ser baixado, sem surpresa.
    tela.width = w
    tela.height = h
    const ctx = tela.getContext('2d')
    if (!ctx) return
    try { await document.fonts.ready } catch { /* fonte cai no fallback */ }
    desenharArte(ctx, w, h, {
      tema, foto, enquadre,
      titulo: 'Parabéns',
      nome: nomeBanner || 'Nome',
      mensagem,
      logo,
      logoLuminancia: logoLum,
      assinatura: nomeSalao,
    })
  }, [formato, tema, foto, enquadre, nomeBanner, mensagem, logo, logoLum, nomeSalao])

  useEffect(() => { redesenhar() }, [redesenhar])

  // ── arrastar a foto dentro do círculo ──────────────────────────────────────
  function aoPressionar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!foto) return
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
    arrastando.current = { x: e.clientX, y: e.clientY }
  }
  function aoMover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!arrastando.current || !foto || !telaRef.current) return
    const caixa = telaRef.current.getBoundingClientRect()
    // O deslocamento é guardado em MÚLTIPLOS DO RAIO do círculo, e não em
    // pixels: assim o mesmo enquadramento vale para os dois formatos, que têm
    // círculos de tamanhos diferentes.
    const { w, h } = FORMATOS[formato]
    const raioNaTela = raioDoCirculo(w, h) * (caixa.width / w)
    const dx = (e.clientX - arrastando.current.x) / raioNaTela
    const dy = (e.clientY - arrastando.current.y) / raioNaTela
    arrastando.current = { x: e.clientX, y: e.clientY }
    setEnquadre(a => ({ ...a, x: a.x + dx, y: a.y + dy }))
  }
  function aoSoltar() { arrastando.current = null }

  // ── baixar os dois arquivos ────────────────────────────────────────────────
  async function aplicar() {
    if (!profId) { toast.error('Escolha o profissional.'); return }
    setBaixando(true)
    try {
      try { await document.fonts.ready } catch { /* fallback */ }
      const base = 'aniversario-' + (nomeBanner || 'profissional')
        .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      for (const id of ['stories', 'feed'] as FormatoId[]) {
        const { w, h, sufixo } = FORMATOS[id]
        const fora = document.createElement('canvas')
        fora.width = w
        fora.height = h
        const ctx = fora.getContext('2d')
        if (!ctx) continue
        desenharArte(ctx, w, h, {
          tema, foto, enquadre,
          titulo: 'Parabéns',
          nome: nomeBanner || 'Nome',
          mensagem,
          logo,
          logoLuminancia: logoLum,
          assinatura: nomeSalao,
        })
        const blob: Blob | null = await new Promise(res => fora.toBlob(res, 'image/png'))
        if (!blob) continue
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${base}-${sufixo}.png`
        document.body.appendChild(a)
        a.click()
        a.remove()
        // Sem o intervalo os dois downloads disparam juntos e o navegador
        // engole o segundo.
        await new Promise(r => setTimeout(r, 450))
        URL.revokeObjectURL(url)
      }
      toast.success('Baixei os dois: um para Stories e um para o feed.')
    } catch {
      toast.error('Não consegui gerar os arquivos.')
    }
    setBaixando(false)
  }

  const rotulo: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase',
    color: '#8b8578', marginBottom: 6, display: 'block',
  }
  const campo: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13.5,
    border: '1.5px solid #e4e0d8', background: '#fff', color: '#1a1a1a',
  }

  return (
    <div
      onClick={aoFechar}
      className="nodri-modal-overlay"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,12,40,.6)', zIndex: 10000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 16, overflowY: 'auto',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Gerar postagem de aniversário"
        style={{
          background: '#faf9f7', borderRadius: 18, width: '100%', maxWidth: 940,
          boxShadow: '0 30px 80px rgba(0,0,0,.35)', overflow: 'hidden', margin: '2vh 0',
        }}>

        {/* cabeçalho */}
        <div className="nodri-modal-head" style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
          borderBottom: '1px solid #eae6dd', background: '#fff',
        }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>Postagem de aniversário</span>
            <span style={{ display: 'block', fontSize: 11.5, color: '#8b8578' }}>
              Sai um arquivo para Stories e outro para o feed, cada um no seu tamanho
            </span>
          </span>
          <button onClick={aoFechar} aria-label="Fechar" style={{
            border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b6860', padding: 4,
          }}><X size={20} /></button>
        </div>

        <div className="nodri-modal-2col" style={{
          display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18, padding: 18,
        }}>

          {/* ── prévia ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div className="nodri-linha-1" style={{ display: 'flex', gap: 6, alignSelf: 'stretch' }}>
              {(Object.keys(FORMATOS) as FormatoId[]).map(id => (
                <button key={id} onClick={() => setFormato(id)} style={{
                  flex: 1, padding: '8px 6px', borderRadius: 9, fontSize: 12, fontWeight: 800,
                  cursor: 'pointer', border: '1.5px solid ' + (formato === id ? '#5b4fcf' : '#e4e0d8'),
                  background: formato === id ? '#efedfb' : '#fff',
                  color: formato === id ? '#5b4fcf' : '#6b6860',
                }}>
                  {FORMATOS[id].rotulo} · {FORMATOS[id].w}×{FORMATOS[id].h}
                </button>
              ))}
            </div>

            <canvas
              ref={telaRef}
              onPointerDown={aoPressionar}
              onPointerMove={aoMover}
              onPointerUp={aoSoltar}
              onPointerCancel={aoSoltar}
              style={{
                width: '100%', maxWidth: formato === 'stories' ? 270 : 340, height: 'auto',
                borderRadius: 12, border: '1px solid #e4e0d8', touchAction: 'none',
                cursor: foto ? 'grab' : 'default', background: '#fff',
                boxShadow: '0 4px 18px rgba(0,0,0,.10)',
              }} />

            {foto ? (
              <span style={{ fontSize: 11, color: '#8b8578', textAlign: 'center' }}>
                Arraste a foto para enquadrar dentro do círculo
              </span>
            ) : null}
          </div>

          {/* ── controles ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div>
              <label style={rotulo} htmlFor="pa-sexo">Modelo</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['feminino', 'masculino'] as const).map(s => (
                  <button key={s} onClick={() => setSexo(s)} style={{
                    flex: 1, padding: '9px 6px', borderRadius: 9, fontSize: 12.5, fontWeight: 800,
                    cursor: 'pointer', textTransform: 'capitalize',
                    border: '1.5px solid ' + (sexo === s ? '#5b4fcf' : '#e4e0d8'),
                    background: sexo === s ? '#efedfb' : '#fff',
                    color: sexo === s ? '#5b4fcf' : '#6b6860',
                  }}>{s}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={rotulo} htmlFor="pa-prof">Profissional</label>
              <select id="pa-prof" style={{ ...campo, cursor: 'pointer' }} value={profId}
                onChange={e => escolherProf(e.target.value)}>
                <option value="">Escolha quem faz aniversário…</option>
                {profs.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.apelido || p.nome_completo}{p.cargo ? ` — ${p.cargo}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={rotulo}>Foto</label>
              <label style={{
                ...campo, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, cursor: 'pointer', borderStyle: 'dashed', color: '#6b6860', fontWeight: 700,
              }}>
                <Upload size={15} />
                {foto ? 'Trocar a foto' : 'Escolher a foto'}
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) carregarFoto(f) }} />
              </label>
              {foto ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 9 }}>
                  <ZoomIn size={14} color="#8b8578" />
                  <input type="range" min={1} max={3} step={0.02} value={enquadre.zoom}
                    aria-label="Aproximar a foto"
                    onChange={e => setEnquadre(a => ({ ...a, zoom: Number(e.target.value) }))}
                    style={{ flex: 1 }} />
                  <button onClick={() => setEnquadre({ x: 0, y: 0, zoom: 1 })} style={{
                    border: 'none', background: 'transparent', color: '#5b4fcf',
                    fontSize: 11, fontWeight: 800, cursor: 'pointer',
                  }}>centralizar</button>
                </div>
              ) : null}
            </div>

            <div>
              <label style={rotulo}>Cores</label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {TEMAS.map(t => (
                  <button key={t.id} onClick={() => setTemaId(t.id)} title={t.nome}
                    aria-label={`Tema ${t.nome}`}
                    style={{
                      width: 46, height: 46, borderRadius: 10, cursor: 'pointer', padding: 0,
                      border: '2.5px solid ' + (temaId === t.id ? '#5b4fcf' : 'transparent'),
                      background: `linear-gradient(150deg, ${t.faixaTopo} 0 52%, ${t.fita} 52% 100%)`,
                      boxShadow: '0 1px 4px rgba(0,0,0,.14)',
                    }} />
                ))}
              </div>
              <span style={{ fontSize: 10.5, color: '#8b8578', display: 'block', marginTop: 5 }}>
                {tema.nome}
              </span>
            </div>

            <div>
              <label style={rotulo} htmlFor="pa-msg">
                Mensagem {gerando ? '· escrevendo…' : ''}
              </label>
              <textarea id="pa-msg" rows={5} value={mensagem}
                onChange={e => setMensagem(e.target.value)}
                style={{ ...campo, resize: 'vertical', lineHeight: 1.5 }} />
              <button onClick={() => gerarMensagem(profId)} disabled={!profId || gerando}
                style={{
                  marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 6,
                  border: 'none', background: 'transparent', color: profId ? '#5b4fcf' : '#b9b4a8',
                  fontSize: 11.5, fontWeight: 800, cursor: profId ? 'pointer' : 'default', padding: 0,
                }}>
                {gerando ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Gerar outra mensagem
              </button>
            </div>

            <button onClick={aplicar} disabled={baixando || !profId}
              className="nodri-btn-lancar"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 18px', borderRadius: 11, border: 'none',
                background: profId ? '#16a34a' : '#c9c5be', color: '#fff',
                fontSize: 14.5, fontWeight: 900, cursor: profId ? 'pointer' : 'default',
              }}>
              {baixando ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
              {baixando ? 'Gerando…' : 'Aplicar e baixar os dois'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
