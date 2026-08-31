'use client'

import { useState } from 'react'

// ── Formulário de contato da vitrine ────────────────────────────────────────
//
// É a porta de entrada de cliente novo. Os preços não estão mais na página
// pública: quem preenche aqui vira um contato no seu painel, você conversa, e
// só então libera o link dos planos.
//
// Campos pedidos com moderação. Cada campo a mais derruba a taxa de
// preenchimento, então só entra o que muda a conversa de venda.

const TIPOS = [
  'Salão de beleza', 'Barbearia', 'Clínica de estética', 'Esmalteria',
  'Studio de sobrancelha/cílios', 'Spa', 'Salão infantil', 'Outro',
]

// Campo aberto de propósito. Numa lista, todo mundo marca a opção mais
// próxima e a resposta vira genérica; escrevendo, a pessoa diz o NOME do
// concorrente — e saber com quem você está competindo vale mais que saber
// que ela "usa um sistema pago".

const OBJETIVOS = [
  'Ganhar mais dinheiro',
  'Controlar o financeiro',
  'Acompanhar os profissionais',
  'Organizar a rotina do salão',
  'Entender meus números e metas',
  'Melhorar o atendimento ao cliente',
  'Ainda não sei, quero conhecer',
]

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const campo: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid #e0ddd8', fontSize: 13.5, color: '#1a1a1a',
  background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const rotulo: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, color: '#3a3835', marginBottom: 4,
}

export default function FormularioContato() {
  const [f, setF] = useState({
    nome: '', sobrenome: '', email: '', celular: '',
    estado: '', cidade: '', tipo_estabelecimento: '', sistema_atual: '', objetivo: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [erro, setErro] = useState('')

  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

  async function enviar() {
    setErro('')
    if (!f.nome.trim() || !f.email.trim() || !f.sistema_atual) {
      setErro('Preencha nome, e-mail e qual sistema você usa hoje.')
      return
    }
    setEnviando(true)
    try {
      const r = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const d = await r.json()
      if (r.ok) setPronto(true)
      else setErro(d?.erro || 'Não foi possível enviar. Tente novamente.')
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    }
    setEnviando(false)
  }

  if (pronto) {
    return (
      <div style={{ background: '#fff', borderRadius: 20, padding: '48px 32px', textAlign: 'center' }}>

        <h3 style={{ fontSize: 21, fontWeight: 900, color: '#1a1a1a', marginBottom: 10 }}>
          Recebemos seu contato, {f.nome.split(' ')[0]}!
        </h3>
        <p style={{ color: '#6b6860', fontSize: 14.5, lineHeight: 1.65, maxWidth: 420, margin: '0 auto' }}>
          Vamos analisar o perfil do seu salão e retornar com o plano que faz sentido para o seu tamanho.
          Se preferir adiantar, chame no WhatsApp.
        </p>
        <a href="https://wa.me/5561982195214?text=Oi! Acabei de preencher o formulário no site do NODRI."
          target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-block', marginTop: 22, padding: '13px 28px', borderRadius: 12,
            background: '#25D366', color: '#fff', fontWeight: 800, fontSize: 14.5, textDecoration: 'none',
          }}>Falar no WhatsApp</a>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 'clamp(16px,2.4vw,24px)' }}>
      <div style={{ display: 'grid', gap: 11, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,220px), 1fr))' }}>
        <div>
          <label htmlFor="ct-nome" style={rotulo}>Nome *</label>
          <input id="ct-nome" autoComplete="given-name" autoCapitalize="words" style={campo} value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Seu nome" />
        </div>
        <div>
          <label htmlFor="ct-sobrenome" style={rotulo}>Sobrenome</label>
          <input id="ct-sobrenome" autoComplete="family-name" autoCapitalize="words" style={campo} value={f.sobrenome} onChange={e => set('sobrenome', e.target.value)} placeholder="Seu sobrenome" />
        </div>
        <div>
          <label htmlFor="ct-email" style={rotulo}>E-mail *</label>
          <input id="ct-email" style={campo} type="email" inputMode="email" autoComplete="email" spellCheck={false} autoCapitalize="none" value={f.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" />
        </div>
        <div>
          <label htmlFor="ct-celular" style={rotulo}>Celular</label>
          <input id="ct-celular" style={campo} type="tel" inputMode="tel" autoComplete="tel" value={f.celular} onChange={e => set('celular', e.target.value)} placeholder="61999999999" />
        </div>
        <div>
          <label htmlFor="ct-estado" style={rotulo}>Estado</label>
          <select id="ct-estado" autoComplete="address-level1" style={campo} value={f.estado} onChange={e => set('estado', e.target.value)}>
            <option value="">Selecione</option>
            {ESTADOS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ct-cidade" style={rotulo}>Cidade</label>
          <input id="ct-cidade" autoComplete="address-level2" autoCapitalize="words" style={campo} value={f.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Sua cidade" />
        </div>
        <div>
          <label htmlFor="ct-tipo" style={rotulo}>Tipo de estabelecimento</label>
          <select id="ct-tipo" style={campo} value={f.tipo_estabelecimento} onChange={e => set('tipo_estabelecimento', e.target.value)}>
            <option value="">Selecione</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ct-sistema" style={rotulo}>Qual sistema você usa hoje? *</label>
          <input id="ct-sistema" autoComplete="off" style={campo} value={f.sistema_atual} onChange={e => set('sistema_atual', e.target.value)}
            placeholder="Ex.: caderno, planilha, ou o nome do sistema" />
        </div>
      </div>

      <div style={{ marginTop: 11 }}>
        <label htmlFor="ct-objetivo" style={rotulo}>Como o NODRI pode te ajudar?</label>
        <select id="ct-objetivo" style={campo} value={f.objetivo} onChange={e => set('objetivo', e.target.value)}>
          <option value="">Selecione</option>
          {OBJETIVOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {erro && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 11, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13.5 }}>
          {erro}
        </div>
      )}

      <button onClick={enviar} disabled={enviando}
        style={{
          width: '100%', marginTop: 15, padding: '13px 0', borderRadius: 12, border: 'none',
          background: '#0d2a56', color: '#fff',
          fontSize: 15, fontWeight: 800, cursor: enviando ? 'wait' : 'pointer', opacity: enviando ? .7 : 1,
        }}>
        {enviando ? 'Enviando…' : 'Enviar mensagem'}
      </button>

      <p style={{ textAlign: 'center', color: '#8b8798', fontSize: 11.5, marginTop: 8 }}>
        Campos com * são obrigatórios.
      </p>
    </div>
  )
}
