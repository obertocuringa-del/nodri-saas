'use client'

import { useState } from 'react'
import { PERGUNTAS, OPCOES, PONTOS_MAXIMOS, faixaDe } from '@/lib/diagnostico'

// ── O quiz ──────────────────────────────────────────────────────────────────
//
// Uma pergunta por vez, e não as dez de uma vez. Dez perguntas numa tela só
// parecem um formulário, e formulário se abandona; uma por vez tem sempre o
// mesmo peso — responder uma coisa — e a barra andando dá o motivo de seguir.
//
// Clicar na resposta já avança. Botão de "próxima" seria um clique a mais para
// não fazer nada, e cada clique a mais custa gente no meio do caminho.
//
// O resultado é calculado aqui e aparece na hora, sem pedir nada. O contato
// vem DEPOIS: quem já viu os próprios pontos cegos está no pico de interesse,
// e quem preenche ali quer mesmo falar. Pedir antes de entregar aumentaria o
// cadastro e derrubaria a conclusão, que é onde este conteúdo convence.

const MARINHO = '#0d2a56'
const CIANO = '#00b5d8'

export default function Quiz() {
  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [i, setI] = useState(0)
  const [pronto, setPronto] = useState(false)

  const [nome, setNome] = useState('')
  const [celular, setCelular] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const total = PERGUNTAS.length
  const atual = PERGUNTAS[i]

  const responder = (valor: number) => {
    const novas = { ...respostas, [atual.id]: valor }
    setRespostas(novas)
    if (i + 1 < total) setI(i + 1)
    else setPronto(true)
  }

  const recomecar = () => {
    setRespostas({})
    setI(0)
    setPronto(false)
  }

  const pontos = Object.values(respostas).reduce((s, v) => s + v, 0)
  const faixa = faixaDe(pontos)
  const pendentes = PERGUNTAS.filter(p => (respostas[p.id] ?? 0) < 2)
  const dominados = total - pendentes.length

  // Máscara simples: só formata o que a pessoa digita, sem impedir de digitar.
  // Máscara que bloqueia tecla é a que mais irrita em celular.
  const mascarar = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return d
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }

  const enviar = async () => {
    setErro('')
    setEnviando(true)
    try {
      const r = await fetch('/api/diagnostico/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          celular,
          pontos: dominados,
          total,
          fracos: pendentes.map(p => p.area),
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível enviar.')
      setEnviado(true)
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (pronto) {
    return (
      <div className="dg-caixa">
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '1px', color: '#8aa0bb', textTransform: 'uppercase', marginBottom: 12 }}>
            Seu resultado
          </p>
          <div style={{ fontSize: 'clamp(38px,6vw,54px)', fontWeight: 900, color: faixa.cor, lineHeight: 1 }}>
            {dominados}<span style={{ fontSize: '0.5em', color: '#9aa8b8' }}> de {total}</span>
          </div>
          <p style={{ fontSize: 13, color: '#8aa0bb', marginTop: 6 }}>
            números do seu salão sob controle
          </p>

          <h2 style={{ fontSize: 'clamp(20px,2.6vw,27px)', fontWeight: 900, color: MARINHO, margin: '20px 0 10px', letterSpacing: '-0.5px' }}>
            {faixa.titulo}
          </h2>
          <p style={{ color: '#4a5568', fontSize: 15.5, lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
            {faixa.texto}
          </p>
        </div>

        {pendentes.length > 0 && (
          <>
            <h3 style={{
              fontSize: 12, fontWeight: 800, letterSpacing: '1px', color: '#046b85',
              textTransform: 'uppercase', margin: '30px 0 14px', textAlign: 'center',
            }}>
              Onde olhar primeiro
            </h3>

            <div style={{ display: 'grid', gap: 12 }}>
              {pendentes.map(p => (
                <div key={p.id} style={{
                  border: '1px solid #e3e8f0', borderRadius: 12, padding: '16px 18px',
                  borderLeft: `4px solid ${CIANO}`, background: '#fbfdfe',
                }}>
                  <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.8px', color: '#8aa0bb', textTransform: 'uppercase', marginBottom: 6 }}>
                    {p.area}
                  </p>
                  <p style={{ fontWeight: 700, color: MARINHO, fontSize: 15, lineHeight: 1.4, marginBottom: 8 }}>
                    {p.pergunta}
                  </p>
                  <p style={{ color: '#4a5568', fontSize: 13.5, lineHeight: 1.65, marginBottom: 8 }}>
                    {p.porque}
                  </p>
                  <p style={{ color: MARINHO, fontSize: 13.5, lineHeight: 1.65, fontWeight: 600 }}>
                    O que fazer: <span style={{ fontWeight: 400, color: '#4a5568' }}>{p.oQueFazer}</span>
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{
          marginTop: 30, padding: 'clamp(22px,3vw,32px)', borderRadius: 14,
          background: MARINHO, textAlign: 'center',
        }}>
          {enviado ? (
            <>
              <h3 style={{ color: '#fff', fontSize: 'clamp(17px,2.2vw,22px)', fontWeight: 900, marginBottom: 10, letterSpacing: '-0.3px' }}>
                Recebido, {nome.split(' ')[0]}.
              </h3>
              <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 14.5, lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
                Vamos chamar no seu WhatsApp com o resultado em mãos, para falar
                dos pontos que apareceram aqui. Se preferir adiantar, é só falar
                com a gente pelo botão do canto.
              </p>
            </>
          ) : (
            <>
              <h3 style={{ color: '#fff', fontSize: 'clamp(17px,2.2vw,22px)', fontWeight: 900, marginBottom: 10, letterSpacing: '-0.3px' }}>
                {pendentes.length > 0
                  ? 'Quer ajuda com os pontos que apareceram?'
                  : 'Você já sabe as contas. A NODRI faz elas sozinha.'}
              </h3>
              <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 14.5, lineHeight: 1.7, maxWidth: 500, margin: '0 auto 20px' }}>
                Deixe o nome e o WhatsApp que a gente chama para mostrar como a
                NODRI calcula esses números a partir do que você já lança no dia
                a dia.
              </p>

              <div style={{ display: 'grid', gap: 10, maxWidth: 380, margin: '0 auto' }}>
                <input
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome"
                  autoComplete="name"
                  className="dg-campo"
                />
                <input
                  value={celular}
                  onChange={e => setCelular(mascarar(e.target.value))}
                  placeholder="WhatsApp com DDD"
                  inputMode="tel"
                  autoComplete="tel"
                  className="dg-campo"
                />

                {erro && (
                  <p style={{ color: '#ffb4b4', fontSize: 13, margin: 0 }}>{erro}</p>
                )}

                <button
                  onClick={enviar}
                  disabled={enviando}
                  style={{
                    padding: '15px 24px', borderRadius: 11, border: 'none',
                    background: CIANO, color: '#04263a', fontWeight: 800, fontSize: 15,
                    cursor: enviando ? 'default' : 'pointer', opacity: enviando ? .65 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {enviando ? 'Enviando...' : 'Quero que a NODRI me chame'}
                </button>
              </div>

              <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 11.5, lineHeight: 1.6, maxWidth: 420, margin: '14px auto 0' }}>
                Ao enviar, você autoriza a NODRI a entrar em contato sobre a
                gestão do seu salão. Não repassamos os seus dados, e você pode
                pedir a exclusão quando quiser.
              </p>

              <p style={{ margin: '14px 0 0' }}>
                <a href="/#contato" style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, textDecoration: 'underline' }}>
                  Prefiro falar agora
                </a>
              </p>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <button onClick={recomecar} className="dg-refazer">Refazer o diagnóstico</button>
        </div>
      </div>
    )
  }

  return (
    <div className="dg-caixa">
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.9px', color: '#046b85', textTransform: 'uppercase' }}>
            {atual.area}
          </span>
          <span style={{ fontSize: 12.5, color: '#8aa0bb', fontWeight: 600 }}>
            {i + 1} de {total}
          </span>
        </div>
        <div style={{ height: 5, background: '#eaf0f6', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${(i / total) * 100}%`, background: CIANO,
            borderRadius: 4, transition: 'width .25s ease',
          }} />
        </div>
      </div>

      <h2 style={{
        fontSize: 'clamp(20px,2.8vw,28px)', fontWeight: 900, color: MARINHO,
        lineHeight: 1.3, letterSpacing: '-0.5px', marginBottom: 22,
      }}>
        {atual.pergunta}
      </h2>

      <div style={{ display: 'grid', gap: 10 }}>
        {OPCOES.map(o => (
          <button key={o.valor} onClick={() => responder(o.valor)} className="dg-opcao">
            <span className="dg-opcao-rot">{o.rotulo}</span>
            <span className="dg-opcao-desc">{o.desc}</span>
          </button>
        ))}
      </div>

      {i > 0 && (
        <div style={{ marginTop: 18 }}>
          <button onClick={() => setI(i - 1)} className="dg-refazer">Voltar uma pergunta</button>
        </div>
      )}
    </div>
  )
}
