'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'

// Botão WhatsApp por pendência: abre lista suspensa dos profissionais
// cadastrados (com telefone) e envia o texto da pendência via wa.me.
// Usado no perfil do profissional (painel lateral + aba) e na página geral
// de Pendências — vale para todos os perfis, atuais e futuros.
export default function WhatsPendencia({ mensagem }: { mensagem: string }) {
  const [open, setOpen] = useState(false)
  const [contatos, setContatos] = useState<{ id: string; nome: string; telefone: string }[]>([])
  const [carregado, setCarregado] = useState(false)

  async function abrir() {
    setOpen(o => !o)
    if (carregado) return
    setCarregado(true)
    try {
      const arr = await fetch('/api/profissionais').then(r => r.ok ? r.json() : [])
      const lista = (Array.isArray(arr) ? arr : []).filter((p: any) => !p.is_departamento).map((p: any) => {
        let tel = p.telefone || ''
        if (!tel) { try { tel = JSON.parse(p.contato_responsavel || '{}').tel || '' } catch { /* */ } }
        return { id: p.id, nome: p.apelido || p.nome_completo || '—', telefone: tel }
      }).filter((c: any) => c.telefone)
      setContatos(lista)
    } catch { /* */ }
  }

  function enviar(c: { nome: string; telefone: string }) {
    const fone = String(c.telefone).replace(/\D/g, '')
    const numero = fone.startsWith('55') ? fone : '55' + fone
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(`📋 *Pendência do salão:*\n\n${mensagem}`)}`, '_blank')
    setOpen(false)
  }

  return (
    <div className="relative shrink-0">
      <button onClick={abrir} title="Enviar por WhatsApp"
        style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <MessageCircle size={14} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 50, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.18)', minWidth: 220, maxHeight: 260, overflowY: 'auto', padding: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.4px', padding: '4px 8px' }}>Enviar para...</div>
            {!carregado || contatos.length === 0
              ? <div style={{ padding: 10, fontSize: 12, color: '#9ca3af' }}>{carregado ? 'Nenhum profissional com telefone cadastrado.' : 'Carregando...'}</div>
              : contatos.map(c => (
                <button key={c.id} onClick={() => enviar(c)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12.5, borderRadius: 6, color: '#1a1a1a' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {c.nome} <span style={{ color: '#9ca3af', fontSize: 11 }}>· {c.telefone}</span>
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  )
}
