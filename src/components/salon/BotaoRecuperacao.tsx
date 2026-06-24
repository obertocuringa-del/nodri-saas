'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MessageCircle, Lock, Sparkles, X } from 'lucide-react'

// Caches em nível de módulo: só 1 fetch mesmo com centenas de linhas
let _recepCache: Promise<any[]> | null = null
function getRecepcionistas(): Promise<any[]> {
  if (!_recepCache) _recepCache = fetch('/api/relatorios/recuperacao?tipo=recepcionistas').then(r => r.ok ? r.json() : []).catch(() => [])
  return _recepCache
}
let _statusCache: Promise<any> | null = null
function getStatus(): Promise<any> {
  if (!_statusCache) _statusCache = fetch('/api/relatorios/recuperacao?tipo=status').then(r => r.ok ? r.json() : { travados: {}, janela_dias: 10 }).catch(() => ({ travados: {}, janela_dias: 10 }))
  return _statusCache
}

export default function BotaoRecuperacao({ cliente, origem }: { cliente: any; origem: string }) {
  const [travadoAte, setTravadoAte] = useState<number | null>(null)
  const [recep, setRecep] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [recepSel, setRecepSel] = useState('')
  const [msg, setMsg] = useState('')
  const [oferta, setOferta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [loadIA, setLoadIA] = useState(false)
  const [envios, setEnvios] = useState(0) // quantas vezes já foi contatada (observação 1x/2x...)
  const janela = useRef(10)

  const lockKey = 'nodri_recup_lock_' + (cliente.cliente_nome || '')

  useEffect(() => {
    // Trava persistida localmente: sobrevive ao refresh e destrava sozinha
    // quando os dias passam (não some ao atualizar a página).
    try {
      const ls = localStorage.getItem(lockKey)
      if (ls) { const t = Number(ls); if (t > Date.now()) setTravadoAte(t); else localStorage.removeItem(lockKey) }
    } catch {}
    getStatus().then(s => {
      janela.current = s.janela_dias || 10
      setEnvios(s.contagem?.[cliente.cliente_nome] || 0)
      const t = s.travados?.[cliente.cliente_nome]
      if (t) {
        const serverAte = new Date(t.contato_em).getTime() + (s.janela_dias || 10) * 86400000
        setTravadoAte(prev => (prev && prev > serverAte ? prev : serverAte))
      }
    })
    getRecepcionistas().then(setRecep)
  }, [cliente.cliente_nome, lockKey])

  const travado = travadoAte != null && travadoAte > Date.now()
  const diasRest = travado ? Math.ceil((travadoAte! - Date.now()) / 86400000) : 0

  const perdida = origem === 'perdido' || origem === 'perdidos'

  function abrir() {
    const primeiro = (cliente.cliente_nome || '').split(' ')[0]
    const servs = (cliente.servicos_feitos || []).slice(0, 2).filter(Boolean)
    const servTxt = servs.length ? ` sua ${servs.join(' e ')}` : ' seu horário'
    // Padrão: nome em negrito (*nome* no WhatsApp), parágrafos separados,
    // acolhe, abre espaço para feedback E oferece o serviço que ela faz
    setMsg(perdida
      ? `Oi *${primeiro}*!\n\nFaz um tempinho que não te vejo aqui no salão \u{1F49B} Tá tudo bem?\nAdoraríamos muito te receber de novo — que tal agendarmos${servTxt}?\n\nSe teve algo que a gente possa melhorar, me conta também!`
      : `Oi *${primeiro}*!\n\nSenti sua falta por aqui \u{1F49B} Vamos agendar${servTxt}?\nConsigo um horário ótimo pra você amanhã — que horas fica melhor?`)
    setRecepSel(recep[0]?.nome || '')
    setOpen(true)
  }

  async function gerarIA() {
    setLoadIA(true)
    const tom = perdida
      ? 'Ela está sem vir há bastante tempo. Seja cuidadosa e acolhedora, SEM cobrar nem pressionar. ABRA espaço para ela dar feedback (pergunte gentilmente se está tudo bem ou se teve algo a melhorar).'
      : 'Ela só atrasou um pouco a próxima visita. Seja DIRETA e propositiva: já proponha agendar para um dia próximo (ex: amanhã ou essa semana), sugerindo horário, sem deixar muito em aberto. Tom leve e amigável, mas com um chamado claro para marcar.'
    const ofertaTxt = oferta.trim() ? `Inclua de forma natural esta oferta especial de retorno: "${oferta.trim()}".` : ''
    const prompt = `Crie uma mensagem curta e calorosa de WhatsApp para reconquistar a cliente ${cliente.cliente_nome} de um salão de beleza. Ela está há ${cliente.dias_desde_ultima_visita || '?'} dias sem vir. Serviços que costuma fazer: ${(cliente.servicos_feitos || []).slice(0, 3).join(', ') || 'diversos'}. ${tom} ${ofertaTxt} SEMPRE convide-a gentilmente para AGENDAR um dos serviços que ela costuma fazer (cite o serviço pelo nome). Use o primeiro nome dela, 1 emoji, e faça um CONVITE GENTIL (não uma cobrança). FORMATAÇÃO PARA WHATSAPP: coloque o primeiro nome da cliente em NEGRITO usando asteriscos (ex: *Rosangela*), e separe a mensagem em 2-3 parágrafos curtos com uma linha em branco entre eles. Responda APENAS o texto da mensagem, sem aspas e sem explicações.`
    try {
      const res = await fetch('/api/ia/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagens: [{ role: 'user', content: prompt }], modo: 'gestor' }) })
      if (res.ok && res.body) {
        const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''; let texto = ''
        while (true) {
          const { done, value } = await reader.read(); if (done) break
          buf += dec.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop() || ''
          for (const l of lines) { if (!l.startsWith('data:')) continue; const j = l.slice(5).trim(); if (!j) continue; try { const p = JSON.parse(j); if (p.token) texto += p.token } catch {} }
        }
        if (texto.trim()) setMsg(texto.trim())
      }
    } catch {}
    setLoadIA(false)
  }

  async function enviar() {
    if (!recepSel) return
    setEnviando(true)
    const recepObj = recep.find(r => r.nome === recepSel)

    // 1) Registra o contato no banco — agora conferindo o resultado de verdade
    let okReg = false, erroReg = ''
    try {
      const res = await fetch('/api/relatorios/recuperacao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_nome: cliente.cliente_nome, celular: cliente.celular, origem, recepcionista_id: recepObj?.id, recepcionista_nome: recepSel, mensagem: msg }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d?.ok) okReg = true
      else erroReg = d?.error || ('HTTP ' + res.status)
    } catch { erroReg = 'falha de conexão' }

    // 2) Abre o WhatsApp de qualquer jeito (a mensagem precisa sair)
    const fone = String(cliente.celular || '').replace(/\D/g, '')
    const numero = fone.startsWith('55') ? fone : '55' + fone
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank')

    setEnviando(false)

    if (okReg) {
      // só trava e conta quando gravou de verdade
      const until = Date.now() + janela.current * 86400000
      try { localStorage.setItem(lockKey, String(until)) } catch {}
      setTravadoAte(until)
      setEnvios(e => e + 1)
      _statusCache = null
      setOpen(false)
    } else {
      // NÃO trava: deixa tentar de novo e mostra o motivo real
      alert('⚠️ O WhatsApp foi aberto, mas NÃO consegui registrar o contato no sistema' +
        (erroReg ? ':\n\n' + erroReg : '.') +
        '\n\nÉ por isso que aparece 0 em "Contatadas". Tente clicar em enviar de novo. Se o erro continuar, me mande esta mensagem.')
    }
  }

  // Observação de quantas vezes já foi enviado (visível mesmo destravada)
  const selo = envios > 0 ? (
    <span title={`Já enviado ${envios} vez(es)`}
      style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 20, background: envios >= 2 ? '#fee2e2' : '#ede9fe', color: envios >= 2 ? '#b91c1c' : '#5b21b6', fontSize: 10, fontWeight: 800 }}>
      {envios}x
    </span>
  ) : null

  return (
    <>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {travado ? (
        <span title={`Já contatada — destrava em ${diasRest} dia(s)`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: '#f1efe8', color: '#9ca3af', fontSize: 11, fontWeight: 600 }}>
          <Lock size={12} /> {diasRest}d
        </span>
      ) : (
        <button onClick={abrir}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: 'none', background: '#25D366', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          <MessageCircle size={13} /> WhatsApp
        </button>
      )}
      {selo}
      </span>

      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Recuperar {cliente.cliente_nome}</h3>
              <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6860', display: 'block', marginBottom: 5 }}>Quem está contatando?</label>
            {recep.length === 0 ? (
              <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px', marginBottom: 12 }}>
                Nenhuma recepcionista cadastrada. Cadastre um profissional com cargo "Recepção".
              </div>
            ) : (
              <select value={recepSel} onChange={e => setRecepSel(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, color: '#1a1a1a', marginBottom: 12 }}>
                {recep.map(r => <option key={r.id} value={r.nome}>{r.nome}</option>)}
              </select>
            )}

            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6860', display: 'block', marginBottom: 5 }}>Oferta de retorno <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span></label>
            <input value={oferta} onChange={e => setOferta(e.target.value)} placeholder="ex: 10% off, hidratação grátis..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, color: '#1a1a1a', marginBottom: 12 }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6860' }}>Mensagem (edite à vontade)</label>
              <button onClick={gerarIA} disabled={loadIA}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', color: '#5b4fcf', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {loadIA ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Gerar com IA
              </button>
            </div>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, color: '#1a1a1a', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />

            <p style={{ fontSize: 10, color: '#9ca3af', margin: '8px 0 14px' }}>
              Ao enviar, o WhatsApp abre com a mensagem já escrita. O botão trava por {janela.current} dias e o retorno dela é atribuído a quem contatou.
            </p>

            <button onClick={enviar} disabled={enviando || !recepSel || recep.length === 0}
              style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (enviando || !recepSel) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />} Abrir WhatsApp e registrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
