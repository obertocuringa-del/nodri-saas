'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { MessageCircle, X, Send, Search } from 'lucide-react'
import GridEditavel, { cel, type Doc as GridDoc } from './GridEditavel'

interface Pessoa { nome: string; telefone: string }
const CHAVE = 'exame_admissional'
const linhasVazias = (q: number, c: number) => Array.from({ length: q }, () => Array.from({ length: c }, () => cel('')))

const DEFAULT_EXAME: GridDoc = {
  tabelas: [
    { titulo: 'DADOS DO CANDIDATO', cabecalho: [cel('Campo'), cel('Informação')], linhas: [
      [cel('Nome completo'), cel('')], [cel('CPF'), cel('')], [cel('Cargo / Função'), cel('')],
      [cel('Data do exame'), cel('')], [cel('Clínica / Médico'), cel('')], [cel('CRM'), cel('')],
    ], larguras: [220, 460] },
    { titulo: 'EXAME ADMISSIONAL', cabecalho: [cel('Exame'), cel('Resultado'), cel('Observação')], linhas: [
      [cel('Avaliação clínica'), cel(''), cel('')],
      [cel('Acuidade visual'), cel(''), cel('')],
      [cel('Audiometria'), cel(''), cel('')],
      [cel('Hemograma'), cel(''), cel('')],
      [cel('Aptidão para a função'), cel(''), cel('')],
      ...linhasVazias(4, 3),
    ], larguras: [240, 220, 360] },
  ],
}

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

export default function ExameAdmissional({ pessoas }: { pessoas: Pessoa[] }) {
  const [modal, setModal] = useState(false)
  const [busca, setBusca] = useState('')

  async function montarMensagem(): Promise<string> {
    let doc: GridDoc | null = null
    try { doc = await fetch(`/api/salon/grid?chave=${CHAVE}`).then(r => r.ok ? r.json() : null) } catch { /* */ }
    if (!doc || !Array.isArray(doc.tabelas)) doc = DEFAULT_EXAME
    let txt = '*🩺 EXAME ADMISSIONAL*\n'
    for (const t of doc.tabelas) {
      const linhas = t.linhas
        .filter(r => r.some(c => (c.t || '').trim()))
        .map(r => r.map((c, ci) => (c.t || '').trim() ? `${t.cabecalho[ci]?.t ? `*${t.cabecalho[ci].t}:* ` : ''}${c.t.trim()}` : '').filter(Boolean).join('  |  '))
      if (!linhas.length) continue
      txt += `\n*${t.titulo}*\n${linhas.map(l => `• ${l}`).join('\n')}\n`
    }
    txt += '\n_Enviado pelo NODRI 💛_'
    return txt
  }

  async function enviar(p: Pessoa) {
    const fone = String(p.telefone || '').replace(/\D/g, '')
    const texto = await montarMensagem()
    if (!fone) { toast.error(`${p.nome} está sem telefone no cadastro`); return }
    const numero = fone.startsWith('55') ? fone : '55' + fone
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank')
    setModal(false)
  }

  const filtradas = pessoas.filter(p => norm(p.nome).includes(norm(busca)))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>🩺 Exame Admissional</h2>
          <p style={{ fontSize: 13, color: '#6b6860', margin: 0 }}>Edite a tabela (mesclar, cores, negrito, imprimir). <strong>Salve</strong> antes de enviar pelo WhatsApp.</p>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><MessageCircle size={15} /> Enviar via WhatsApp</button>
      </div>

      <GridEditavel chave={CHAVE} defaultDoc={DEFAULT_EXAME} landscape corTema="#0ea5e9" />

      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f0eee8' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>📲 Enviar para quem?</h3>
              <button onClick={() => setModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ position: 'relative', marginBottom: 6 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#9ca3af' }} />
                <input value={busca} onChange={e => setBusca(e.target.value)} autoFocus placeholder="Buscar pessoa cadastrada…" style={{ width: '100%', padding: '9px 10px 9px 32px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: '0 10px 12px' }}>
              {filtradas.length === 0 ? <p style={{ padding: 16, fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>Ninguém encontrado.</p> :
                filtradas.map((p, i) => (
                  <button key={i} onClick={() => enviar(p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '11px 12px', border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 14 }} onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{p.nome}</span>
                    {p.telefone ? <span style={{ fontSize: 11, color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Send size={11} /> {p.telefone}</span> : <span style={{ fontSize: 10, color: '#f59e0b' }}>sem telefone</span>}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
