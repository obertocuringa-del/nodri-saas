'use client'

import { useState } from 'react'
import { PERGUNTAS, OPCOES, faixaDe } from '@/lib/diagnostico'

// ── O diagnóstico ───────────────────────────────────────────────────────────
//
// Três etapas: porta, perguntas e resultado.
//
// A PORTA vem antes das perguntas. Pedindo o contato só no fim, quem desiste no
// meio some sem deixar rastro; pedindo na entrada, o navegador preenche nome e
// telefone sozinho — é para isso que os campos usam os nomes padrão de
// autoComplete — e quem começa já vira contato.
//
// As PERGUNTAS aparecem uma por vez, e nenhuma delas fica listada na página
// antes de a pessoa responder. Quem lê as dez de antemão responde diferente:
// já sabe o que o teste mede, e o resultado deixa de dizer alguma coisa. As
// perguntas por extenso — com o porquê e o que fazer — aparecem no RESULTADO,
// que é onde elas ajudam.

const MARINHO = '#0d2a56'
const CIANO = '#00b5d8'

export default function Quiz() {
  const [etapa, setEtapa] = useState<'porta' | 'quiz' | 'fim'>('porta')

  const [nome, setNome] = useState('')
  const [celular, setCelular] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [i, setI] = useState(0)

  const total = PERGUNTAS.length
  const atual = PERGUNTAS[i]

  const faixa = faixaDe(Object.values(respostas).reduce((s, v) => s + v, 0))
  const pendentes = PERGUNTAS.filter(p => (respostas[p.id] ?? 0) < 2)
  const dominados = total - pendentes.length

  // Máscara que só formata, sem bloquear tecla: bloquear atrapalha justamente o
  // preenchimento automático do navegador, que é o motivo de pedir aqui.
  //
  // O 55 da frente precisa sair antes de formatar. O autopreenchimento entrega
  // o número com código do país (+55 61 98520-8123 = 13 dígitos); cortando os
  // 11 primeiros, o 55 virava DDD e o fim do número se perdia — dava
  // "(55) 61985-0812", que não é telefone de ninguém.
  const mascarar = (v: string) => {
    let d = v.replace(/\D/g, '')
    if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
    d = d.slice(0, 11)
    if (d.length <= 2) return d
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }

  const prosseguir = async () => {
    setErro('')
    if (nome.trim().length < 2) { setErro('Diga o seu nome.'); return }
    if (celular.replace(/\D/g, '').length < 10) { setErro('Informe um WhatsApp com DDD.'); return }
    setEnviando(true)
    try {
      const r = await fetch('/api/diagnostico/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, celular, etapa: 'inicio' }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.erro || 'Não foi possível continuar.')
      setEtapa('quiz')
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível continuar. Tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  const responder = (valor: number) => {
    const novas = { ...respostas, [atual.id]: valor }
    setRespostas(novas)
    if (i + 1 < total) { setI(i + 1); return }

    setEtapa('fim')
    // O placar sai de `novas`, e não do estado: o React ainda não aplicou a
    // última resposta quando esta linha roda.
    const pend = PERGUNTAS.filter(p => (novas[p.id] ?? 0) < 2)
    fetch('/api/diagnostico/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome, celular, etapa: 'fim',
        pontos: total - pend.length, total,
        fracos: pend.map(p => p.area),
      }),
    }).catch(() => {
      // Registro não pode atrapalhar quem já terminou de responder.
    })
  }

  const recomecar = () => {
    setRespostas({})
    setI(0)
    setEtapa('quiz')
  }

  // ── PORTA ─────────────────────────────────────────────────────────────────
  if (etapa === 'porta') {
    return (
      <div className="dg-caixa">
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: 'clamp(19px,2.5vw,25px)', fontWeight: 900, color: MARINHO, marginBottom: 10, letterSpacing: '-.5px' }}>
            Antes de começar
          </h2>
          <p style={{ color: '#4a5568', fontSize: 15, lineHeight: 1.7, maxWidth: 460, margin: '0 auto' }}>
            Diga como te chamar e o seu WhatsApp. O resultado aparece na hora,
            aqui mesmo — e a gente pode te ajudar com os pontos que aparecerem.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 10, maxWidth: 380, margin: '0 auto' }}>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Seu nome"
            name="name"
            autoComplete="name"
            className="dg-campo-claro"
          />
          <input
            value={celular}
            onChange={e => setCelular(mascarar(e.target.value))}
            placeholder="WhatsApp com DDD"
            name="tel"
            inputMode="tel"
            autoComplete="tel"
            className="dg-campo-claro"
            onKeyDown={e => { if (e.key === 'Enter') prosseguir() }}
          />

          {erro && <p style={{ color: '#b42318', fontSize: 13, margin: 0 }}>{erro}</p>}

          <button
            onClick={prosseguir}
            disabled={enviando}
            style={{
              padding: '15px 24px', borderRadius: 11, border: 'none',
              background: MARINHO, color: '#fff', fontWeight: 800, fontSize: 15.5,
              cursor: enviando ? 'default' : 'pointer', opacity: enviando ? .65 : 1,
              fontFamily: 'inherit',
            }}
          >
            {enviando ? 'Um instante...' : 'Prosseguir para o diagnóstico →'}
          </button>

          <p style={{ color: '#8aa0bb', fontSize: 11.5, lineHeight: 1.6, textAlign: 'center', margin: 0 }}>
            Ao continuar, você autoriza a NODRI a entrar em contato sobre a
            gestão do seu salão. Não repassamos os seus dados.
          </p>
        </div>
      </div>
    )
  }

  // ── RESULTADO ─────────────────────────────────────────────────────────────
  if (etapa === 'fim') {
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

        {/* O que a pessoa domina entra como confirmação: sem isso, quem foi bem
            no teste chega ao fim sem levar nada. */}
        {dominados > 0 && (
          <>
            <h3 style={{
              fontSize: 12, fontWeight: 800, letterSpacing: '1px', color: '#0f9d58',
              textTransform: 'uppercase', margin: '30px 0 12px', textAlign: 'center',
            }}>
              Você já tem sob controle
            </h3>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {PERGUNTAS.filter(p => (respostas[p.id] ?? 0) === 2).map(p => (
                <li key={p.id} style={{ color: '#4a5568', fontSize: 14, lineHeight: 1.7, marginBottom: 4 }}>
                  {p.pergunta}
                </li>
              ))}
            </ul>
          </>
        )}

        <div style={{
          marginTop: 30, padding: 'clamp(22px,3vw,32px)', borderRadius: 14,
          background: MARINHO, textAlign: 'center',
        }}>
          <h3 style={{ color: '#fff', fontSize: 'clamp(17px,2.2vw,22px)', fontWeight: 900, marginBottom: 10, letterSpacing: '-0.3px' }}>
            {pendentes.length > 0
              ? 'Esses números existem. Só ninguém tem tempo de calcular.'
              : 'Você já sabe as contas. A NODRI faz elas sozinha.'}
          </h3>
          <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 14.5, lineHeight: 1.7, maxWidth: 520, margin: '0 auto 20px' }}>
            {nome.trim() ? nome.trim().split(' ')[0] + ', a' : 'A'} NODRI calcula
            custo, margem, comissão e ocupação a partir do que você já lança no
            dia a dia — serviço por serviço, todo mês, sem planilha.
          </p>
          <a href="/#contato" style={{
            display: 'inline-block', padding: '15px 34px', borderRadius: 11,
            background: CIANO, color: '#04263a', fontWeight: 800, fontSize: 15,
            textDecoration: 'none',
          }}>Quero ver funcionando</a>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <button onClick={recomecar} className="dg-refazer">Refazer o diagnóstico</button>
        </div>
      </div>
    )
  }

  // ── PERGUNTAS ─────────────────────────────────────────────────────────────
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
