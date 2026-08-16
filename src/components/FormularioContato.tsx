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

// A pergunta mais útil da lista: dizer se a pessoa vem de papel, de planilha
// ou de um concorrente muda completamente o que você precisa mostrar a ela.
const SISTEMAS = [
  'Não uso nenhum sistema',
  'Caderno ou papel',
  'Planilha (Excel / Google)',
  'Agenda do celular / WhatsApp',
  'Uso outro sistema pago',
  'Outro',
]

const OBJETIVOS = [
  'Controlar o financeiro',
  'Acompanhar os profissionais',
  'Organizar a rotina do salão',
  'Entender meus números e metas',
  'Melhorar o atendimento ao cliente',
  'Ainda não sei, quero conhecer',
]

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const campo: React.CSSProperties = {
  width: '100%', padding: '13px 14px', borderRadius: 11,
  border: '1px solid #e0ddd8', fontSize: 14, color: '#1a1a1a',
  background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const rotulo: React.CSSProperties = {
  display: 'block', fontSize: 12.5, fontWeight: 700, color: '#3a3835', marginBottom: 6,
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
        <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
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
    <div style={{ background: '#fff', borderRadius: 20, padding: 'clamp(22px,4vw,34px)' }}>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,220px), 1fr))' }}>
        <div>
          <label style={rotulo}>Nome *</label>
          <input style={campo} value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Seu nome" />
        </div>
        <div>
          <label style={rotulo}>Sobrenome</label>
          <input style={campo} value={f.sobrenome} onChange={e => set('sobrenome', e.target.value)} placeholder="Seu sobrenome" />
        </div>
        <div>
          <label style={rotulo}>E-mail *</label>
          <input style={campo} type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" />
        </div>
        <div>
          <label style={rotulo}>Celular</label>
          <input style={campo} value={f.celular} onChange={e => set('celular', e.target.value)} placeholder="61999999999" />
        </div>
        <div>
          <label style={rotulo}>Estado</label>
          <select style={campo} value={f.estado} onChange={e => set('estado', e.target.value)}>
            <option value="">Selecione</option>
            {ESTADOS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label style={rotulo}>Cidade</label>
          <input style={campo} value={f.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Sua cidade" />
        </div>
        <div>
          <label style={rotulo}>Tipo de estabelecimento</label>
          <select style={campo} value={f.tipo_estabelecimento} onChange={e => set('tipo_estabelecimento', e.target.value)}>
            <option value="">Selecione</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={rotulo}>Qual sistema você usa hoje? *</label>
          <select style={campo} value={f.sistema_atual} onChange={e => set('sistema_atual', e.target.value)}>
            <option value="">Selecione</option>
            {SISTEMAS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={rotulo}>Como o NODRI pode te ajudar?</label>
        <select style={campo} value={f.objetivo} onChange={e => set('objetivo', e.target.value)}>
          <option value="">Selecione</option>
          {OBJETIVOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {erro && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 11, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13.5 }}>
          ⚠️ {erro}
        </div>
      )}

      <button onClick={enviar} disabled={enviando}
        style={{
          width: '100%', marginTop: 22, padding: '16px 0', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg,#5b4fcf,#f43f8e)', color: '#fff',
          fontSize: 16, fontWeight: 800, cursor: enviando ? 'wait' : 'pointer', opacity: enviando ? .7 : 1,
        }}>
        {enviando ? 'Enviando…' : 'Enviar mensagem'}
      </button>

      <p style={{ textAlign: 'center', color: '#8b8798', fontSize: 12, marginTop: 12 }}>
        Campos com * são obrigatórios.
      </p>
    </div>
  )
}
