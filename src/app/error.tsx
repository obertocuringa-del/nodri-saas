'use client'

import { useEffect } from 'react'

// ── Quando uma tela quebra ───────────────────────────────────────────────────
//
// Não existia nada disso. Se um componente estourasse um erro, a pessoa via a
// tela crua do Next — em produção, um "Application error" branco, sem marca,
// sem explicação e sem saída. Quem estava no meio de um lançamento não sabia
// se tinha perdido o que digitou nem para onde ir.
//
// Esta tela aparece no lugar SÓ do trecho que quebrou: a barra de navegação e
// o resto do painel continuam de pé. "Tentar de novo" remonta o trecho sem
// recarregar a página inteira, o que na maioria das falhas de rede resolve.
//
// O código do erro (digest) aparece de propósito: é o único jeito de a pessoa
// dizer no WhatsApp QUAL erro aconteceu, em vez de "deu erro".
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Fica no console do navegador para quem for investigar.
    console.error('[NODRI] Erro na tela:', error)
  }, [error])

  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center', padding: '40px 22px', gap: 14,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: '#1a1a1a',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: '#fdeae8', color: '#a3211a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, fontWeight: 800, lineHeight: 1,
      }}>!</div>

      <h1 style={{ fontSize: 21, fontWeight: 900, margin: 0, textWrap: 'balance', maxWidth: 460 }}>
        Esta parte da tela não conseguiu carregar
      </h1>

      <p style={{ fontSize: 14.5, color: '#6b6860', margin: 0, maxWidth: 430, lineHeight: 1.6 }}>
        Nada foi apagado. Costuma ser queda de conexão por um instante — tentar
        de novo resolve na maioria das vezes.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        <button onClick={reset} style={{
          padding: '12px 24px', borderRadius: 10, border: 'none', background: '#5b4fcf',
          color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
        }}>
          Tentar de novo
        </button>
        <a href="/salon" style={{
          padding: '12px 24px', borderRadius: 10, textDecoration: 'none',
          border: '1.5px solid #ddd8cd', color: '#3f3a35', fontSize: 14, fontWeight: 800,
        }}>
          Voltar ao início
        </a>
      </div>

      {error.digest ? (
        <p style={{ fontSize: 11.5, color: '#9a948a', marginTop: 14, fontVariantNumeric: 'tabular-nums' }}>
          Se acontecer de novo, mande este código para o suporte: <b>{error.digest}</b>
        </p>
      ) : null}
    </div>
  )
}
