'use client'

import { useState } from 'react'

// ── "Mande a sua pergunta" ──────────────────────────────────────────────────
//
// A parte interativa do FAQ. Fica num componente próprio porque a página é
// server component — é isso que garante que as perguntas e respostas existam
// no HTML para o buscador ler, e só este pedaço precisa de JavaScript.
//
// O nome e o contato são opcionais de propósito: exigir identificação para
// tirar uma dúvida derruba quase todo mundo, e a pergunta anônima serve
// igual — ela vira conteúdo do FAQ do mesmo jeito.

const MARINHO = '#0d2a56'
const CIANO = '#00b5d8'

export default function Perguntar() {
  const [nome, setNome] = useState('')
  const [contato, setContato] = useState('')
  const [pergunta, setPergunta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const enviar = async () => {
    setErro('')
    setEnviando(true)
    try {
      const r = await fetch('/api/perguntas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, contato, pergunta }),
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

  if (enviado) {
    return (
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(19px,2.4vw,25px)', fontWeight: 900, color: MARINHO, marginBottom: 12, letterSpacing: '-.5px' }}>
          Pergunta recebida.
        </h2>
        <p style={{ color: '#4a5568', fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
          Se ela for útil para outros donos de salão, a resposta entra aqui nesta
          página. {contato ? 'E a gente avisa você no contato que deixou.' : ''}
        </p>
      </div>
    )
  }

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <div style={{ width: 40, height: 3, borderRadius: 3, background: CIANO, margin: '0 auto 18px' }} />
        <h2 style={{ fontSize: 'clamp(20px,2.4vw,26px)', fontWeight: 900, color: MARINHO, marginBottom: 12, letterSpacing: '-.5px' }}>
          Sua dúvida não estava aqui?
        </h2>
        <p style={{ color: '#4a5568', fontSize: 15, lineHeight: 1.7, maxWidth: 540, margin: '0 auto' }}>
          Pergunte. As dúvidas que chegam viram resposta nesta página, e todo
          mundo aproveita. Não precisa se identificar.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 10, maxWidth: 520, margin: '0 auto' }}>
        <textarea
          value={pergunta}
          onChange={e => setPergunta(e.target.value)}
          placeholder="Escreva a sua dúvida sobre gestão de salão..."
          rows={4}
          className="fq-campo"
        />
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <input value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Seu nome (opcional)" autoComplete="name" className="fq-campo" />
          <input value={contato} onChange={e => setContato(e.target.value)}
            placeholder="WhatsApp ou e-mail (opcional)" className="fq-campo" />
        </div>

        {erro && <p style={{ color: '#b42318', fontSize: 13, margin: 0 }}>{erro}</p>}

        <button
          onClick={enviar}
          disabled={enviando}
          style={{
            padding: '15px 24px', borderRadius: 11, border: 'none',
            background: MARINHO, color: '#fff', fontWeight: 800, fontSize: 15,
            cursor: enviando ? 'default' : 'pointer', opacity: enviando ? .65 : 1,
            fontFamily: 'inherit',
          }}
        >
          {enviando ? 'Enviando...' : 'Enviar pergunta'}
        </button>

        <p style={{ color: '#8aa0bb', fontSize: 11.5, lineHeight: 1.6, textAlign: 'center', margin: 0 }}>
          A pergunta não é publicada automaticamente: ela chega para a equipe da
          NODRI e só vira conteúdo depois de respondida.
        </p>
      </div>
    </>
  )
}
