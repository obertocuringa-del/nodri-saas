'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, MessageSquarePlus, X, Lock } from 'lucide-react'
import {
  porSecao, TIPOS_AVALIADOR, NOTA_MAX,
  type FichaAval, type TipoAvaliador,
} from '@/lib/avaliacaoCargoModelo'

// ── Avaliação 360: a tela de quem responde ─────────────────────────────────
//
// Quem avalia pode não ter conta no NODRI -- uma colega de equipe, alguém
// que só passa pelo salão. Então esta página não pede login, não mostra o
// que os outros responderam e cabe num celular.
//
// Duas decisões que mudam a qualidade do que volta:
//
//  - "Não sei avaliar" ao lado da régua. Sem essa saída, quem não convive
//    com aquele dever chuta um 7 e o 7 chutado entra na média como se fosse
//    uma observação.
//  - a observação é opcional e fica escondida até se clicar. Campo de texto
//    aberto em quarenta pontos faz a pessoa desistir no quinto.

const COR = '#7c3aed'

interface Dados {
  cargo: string
  titulo: string
  avaliado: string | null
  aberta: boolean
  salao_nome: string
  salao_logo?: string | null
  ficha: FichaAval
}

export default function AvaliarPublico() {
  const params = useParams()
  const token = params?.token as string

  const [dados, setDados] = useState<Dados | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')

  const [tipo, setTipo] = useState<TipoAvaliador | ''>('')
  const [avaliador, setAvaliador] = useState('')
  const [notas, setNotas] = useState<Record<string, number | 'nao_sei'>>({})
  const [obs, setObs] = useState<Record<string, string>>({})
  const [abertos, setAbertos] = useState<Record<string, boolean>>({})
  const [comentario, setComentario] = useState('')

  useEffect(() => {
    fetch(`/api/avaliacao-cargo/public/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErro(d.error); setCarregando(false); return }
        setDados(d)
        // `?como=equipe` no link ja deixa o papel escolhido -- serve para
        // mandar um link direto para a pessoa certa. Lido do endereco, e nao
        // por useSearchParams, que exigiria Suspense no build.
        const como = new URLSearchParams(window.location.search).get('como')
        if (como && TIPOS_AVALIADOR.some(t => t.tipo === como)) setTipo(como as TipoAvaliador)
        setCarregando(false)
      })
      .catch(() => { setErro('Não deu para abrir o formulário.'); setCarregando(false) })
  }, [token])

  const secoes = useMemo(
    () => (dados && tipo ? porSecao(dados.ficha, tipo) : []),
    [dados, tipo],
  )
  const total = secoes.reduce((s, g) => s + g.criterios.length, 0)
  const respondidos = secoes.reduce(
    (s, g) => s + g.criterios.filter(c => notas[c.id] !== undefined).length, 0)

  async function enviar() {
    const comNota = Object.entries(notas)
      .filter(([, v]) => typeof v === 'number') as [string, number][]
    if (!comNota.length) { setErroEnvio('Dê ao menos uma nota antes de enviar.'); return }
    setErroEnvio(''); setEnviando(true)
    try {
      const r = await fetch(`/api/avaliacao-cargo/public/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo, avaliador: avaliador.trim() || null,
          notas: Object.fromEntries(comNota),
          observacoes: obs, comentario: comentario.trim() || null,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setErroEnvio(d.error || 'Não deu para enviar.'); return }
      setEnviado(true)
    } catch {
      setErroEnvio('Sem conexão. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  const fundo = 'linear-gradient(160deg,#f5f3ff 0%,#ede9fe 40%,#faf5ff 70%,#f0fdf4 100%)'

  if (carregando) return (
    <div style={{ minHeight: '100vh', background: fundo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${COR}30`, borderTop: `3px solid ${COR}`, animation: 'girar .8s linear infinite' }} />
      <style>{'@keyframes girar{to{transform:rotate(360deg)}}'}</style>
    </div>
  )

  if (erro) return (
    <Aviso titulo="Formulário indisponível" texto={erro} />
  )

  if (dados && !dados.aberta) return (
    <Aviso titulo="Avaliação encerrada"
      texto="Esta avaliação já foi fechada e não aceita mais respostas." icone="lock" />
  )

  if (enviado) return (
    <div style={{ minHeight: '100vh', background: fundo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', background: `linear-gradient(135deg,${COR},${COR}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: `0 20px 60px ${COR}40` }}>
          <CheckCircle size={42} color="white" />
        </div>
        <h1 style={{ color: '#1a1a1a', fontWeight: 800, fontSize: 26, marginBottom: 10 }}>Avaliação enviada</h1>
        <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.7 }}>
          Obrigado pelo tempo. As respostas vão para a média do grupo — ninguém
          vê a sua separada.
        </p>
      </div>
    </div>
  )

  if (!dados) return null

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
        @keyframes girar{to{transform:rotate(360deg)}}
        @keyframes subir{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .cartao{animation:subir .3s ease both}
        textarea:focus,input:focus{outline:none;border-color:${COR}}
        .regua{display:grid;grid-template-columns:repeat(11,1fr);gap:4px}
        .nota{aspect-ratio:1;border-radius:9px;border:1.5px solid #e9e7f3;background:#fbfaff;
              font-size:13px;font-weight:700;color:#6b7280;cursor:pointer;font-family:inherit;
              display:flex;align-items:center;justify-content:center;transition:.12s}
        .nota:hover{border-color:${COR}80}
        .nota.on{background:${COR};border-color:${COR};color:#fff;transform:scale(1.06)}
        @media (max-width:420px){.regua{gap:3px}.nota{font-size:11.5px;border-radius:7px}}
      `}</style>

      <div style={{ minHeight: '100vh', background: fundo, paddingBottom: 40 }}>
        <div style={{ height: 4, background: `linear-gradient(90deg,${COR},#a855f7,#06b6d4)` }} />

        <div style={{ background: 'white', borderBottom: '1px solid #f3e8ff', padding: '22px 20px', textAlign: 'center' }}>
          {/* A logo do salão manda; sem logo, o nome escrito. */}
          {dados.salao_logo ? (
            <img src={dados.salao_logo} alt={dados.salao_nome}
              style={{ maxHeight: 54, maxWidth: 190, objectFit: 'contain', margin: '0 auto 11px', display: 'block' }} />
          ) : dados.salao_nome ? (
            <p style={{ fontSize: 11.5, fontWeight: 700, color: COR, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 7 }}>
              {dados.salao_nome}
            </p>
          ) : null}
          <h1 style={{ fontSize: 21, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.25 }}>
            {dados.cargo || 'Avaliação de cargo'}
          </h1>
          {dados.titulo && <p style={{ fontSize: 13.5, color: '#6b7280', marginTop: 5 }}>{dados.titulo}</p>}
          {dados.avaliado && (
            <p style={{ fontSize: 13.5, color: '#1a1a1a', marginTop: 9, fontWeight: 600 }}>
              Pessoa avaliada: {dados.avaliado}
            </p>
          )}
        </div>

        <div style={{ maxWidth: 620, margin: '0 auto', padding: '18px 14px 0' }}>

          {/* ── De onde você avalia ──
              Um 360 só vale se as três vozes ficarem separadas: a média da
              equipe e a do gerente dizem coisas diferentes. */}
          <div className="cartao" style={cartao}>
            <p style={rotulo}>De onde você está avaliando?</p>
            <div style={{ display: 'grid', gap: 9 }}>
              {TIPOS_AVALIADOR.map(t => (
                <button key={t.tipo} onClick={() => setTipo(t.tipo)}
                  style={{
                    textAlign: 'left', padding: '13px 15px', borderRadius: 13, cursor: 'pointer',
                    fontFamily: 'inherit', background: tipo === t.tipo ? `${COR}0e` : '#fbfaff',
                    border: `2px solid ${tipo === t.tipo ? COR : '#f0eef9'}`,
                  }}>
                  <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: '#1a1a1a' }}>{t.rotulo}</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{t.descricao}</span>
                </button>
              ))}
            </div>

            <p style={{ ...rotulo, marginTop: 20 }}>
              Seu nome <span style={{ fontWeight: 500, color: '#9ca3af' }}>(opcional)</span>
            </p>
            <input value={avaliador} onChange={e => setAvaliador(e.target.value)}
              placeholder="Pode deixar em branco"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid #f0eef9', fontSize: 14, fontFamily: 'inherit', background: '#fbfaff' }} />
            <p style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 7, lineHeight: 1.6 }}>
              Sem o nome a resposta continua valendo. O resultado é sempre
              mostrado por média do grupo.
            </p>
          </div>

          {!tipo ? (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', padding: '10px 0 24px' }}>
              Escolha acima para ver os pontos a avaliar.
            </p>
          ) : (
            <>
              {dados.ficha.apresentacao && (
                <div className="cartao" style={{ ...cartao, background: `${COR}08`, border: `1px solid ${COR}25` }}>
                  <p style={{ fontSize: 13.5, color: '#3f3a52', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {dados.ficha.apresentacao}
                  </p>
                </div>
              )}

              <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'rgba(250,248,255,.93)', backdropFilter: 'blur(6px)', padding: '9px 2px', marginBottom: 6, borderRadius: 10 }}>
                <div style={{ height: 6, background: '#ece9f8', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${total ? (respondidos / total) * 100 : 0}%`, background: `linear-gradient(90deg,${COR},#a855f7)`, transition: 'width .2s' }} />
                </div>
                <p style={{ fontSize: 11.5, color: '#6b7280', marginTop: 5, textAlign: 'center' }}>
                  {respondidos} de {total} pontos
                </p>
              </div>

              {secoes.map(g => (
                <div key={g.secao} className="cartao" style={cartao}>
                  <p style={{ fontSize: 11.5, fontWeight: 800, color: COR, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                    {g.secao}
                  </p>

                  {g.criterios.map((c, i) => {
                    const v = notas[c.id]
                    return (
                      <div key={c.id} style={{ paddingTop: i ? 17 : 0, marginTop: i ? 17 : 0, borderTop: i ? '1px solid #f4f2fb' : 'none' }}>
                        <p style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.55, marginBottom: 11 }}>{c.texto}</p>

                        <div className="regua">
                          {Array.from({ length: NOTA_MAX + 1 }, (_, n) => (
                            <button key={n} type="button"
                              className={'nota' + (v === n ? ' on' : '')}
                              onClick={() => setNotas(s => ({ ...s, [c.id]: s[c.id] === n ? undefined as any : n }))}>
                              {n}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#b0abc2', marginTop: 4 }}>
                          <span>não atende</span><span>atende plenamente</span>
                        </div>

                        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 9, flexWrap: 'wrap' }}>
                          <button type="button"
                            onClick={() => setNotas(s => ({ ...s, [c.id]: s[c.id] === 'nao_sei' ? undefined as any : 'nao_sei' }))}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                              fontSize: 12, padding: 0,
                              color: v === 'nao_sei' ? COR : '#9ca3af',
                              fontWeight: v === 'nao_sei' ? 700 : 500,
                              textDecoration: v === 'nao_sei' ? 'none' : 'underline',
                            }}>
                            {v === 'nao_sei' ? '✓ Não sei avaliar' : 'Não sei avaliar'}
                          </button>

                          <button type="button"
                            onClick={() => setAbertos(s => ({ ...s, [c.id]: !s[c.id] }))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                            {abertos[c.id]
                              ? <><X size={12} /> fechar observação</>
                              : <><MessageSquarePlus size={12} /> escrever observação</>}
                          </button>
                        </div>

                        {abertos[c.id] && (
                          <textarea value={obs[c.id] || ''} rows={3}
                            onChange={e => setObs(s => ({ ...s, [c.id]: e.target.value }))}
                            placeholder="Um exemplo concreto ajuda muito mais que a nota sozinha."
                            style={{ width: '100%', marginTop: 9, padding: '11px 13px', borderRadius: 11, border: '2px solid #f0eef9', fontSize: 13.5, fontFamily: 'inherit', background: '#fbfaff', resize: 'vertical', lineHeight: 1.6 }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}

              <div className="cartao" style={cartao}>
                <p style={rotulo}>Quer acrescentar alguma coisa?</p>
                <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={4}
                  placeholder="O que você diria se tivesse cinco minutos com essa pessoa. Opcional."
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid #f0eef9', fontSize: 14, fontFamily: 'inherit', background: '#fbfaff', resize: 'vertical', lineHeight: 1.65 }} />
              </div>

              {erroEnvio && (
                <p style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 12, padding: '11px 14px', fontSize: 13, marginBottom: 12 }}>
                  {erroEnvio}
                </p>
              )}

              <button onClick={enviar} disabled={enviando}
                style={{
                  width: '100%', padding: '15px', borderRadius: 14, border: 'none',
                  cursor: enviando ? 'default' : 'pointer', fontFamily: 'inherit',
                  background: enviando ? '#c4b5fd' : `linear-gradient(135deg,${COR},#a855f7)`,
                  color: 'white', fontWeight: 800, fontSize: 15,
                  boxShadow: `0 10px 30px ${COR}35`,
                }}>
                {enviando ? 'Enviando…' : 'Enviar avaliação'}
              </button>

              <p style={{ textAlign: 'center', fontSize: 11.5, color: '#9ca3af', marginTop: 12, lineHeight: 1.6 }}>
                Depois de enviar não dá para mudar. Confira antes.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}

const cartao: React.CSSProperties = {
  background: 'white', borderRadius: 18, padding: 22, marginBottom: 13,
  boxShadow: '0 2px 18px rgba(0,0,0,.055)',
}
const rotulo: React.CSSProperties = {
  fontSize: 14.5, fontWeight: 700, color: '#1a1a1a', marginBottom: 12,
}

function Aviso({ titulo, texto, icone }: { titulo: string; texto: string; icone?: 'lock' }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        {icone === 'lock' && (
          <div style={{ width: 66, height: 66, borderRadius: '50%', background: '#ece9f8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Lock size={26} color="#7c3aed" />
          </div>
        )}
        <h1 style={{ color: '#1a1a1a', fontWeight: 800, fontSize: 21 }}>{titulo}</h1>
        <p style={{ color: '#6b7280', marginTop: 9, fontSize: 14.5, lineHeight: 1.65 }}>{texto}</p>
      </div>
    </div>
  )
}
