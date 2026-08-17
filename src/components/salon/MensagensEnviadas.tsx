'use client'

// ─────────────────────────────────────────────────────────────────────────────
// MENSAGENS ENVIADAS (relatório das listas)
//
// Toda vez que a gestão manda a mensagem de produção de uma lista
// (Realinhamento, Corte, Mechas, Pigmentação), o texto fica guardado aqui —
// as últimas 300, com profissional, lista, mês e data.
//
// Existia só como botãozinho na página do Salão Administrativo; dentro do
// setor não havia caminho nenhum para chegar até ele, e quem procurava não
// achava. Agora é uma ferramenta, no mesmo lugar em que as listas vivem.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Inbox, Search } from 'lucide-react'

interface Msg {
  id?: string
  prof?: string
  servico?: string
  mes?: string
  total?: number
  media?: number
  texto?: string
  enviada_em?: string
}

export default function MensagensEnviadas() {
  const [lista, setLista] = useState<Msg[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  const carregar = useCallback(() => {
    setCarregando(true)
    fetch('/api/salon/listas?mensagens=1', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : []))
      .then(d => setLista(Array.isArray(d) ? d : []))
      .catch(() => setLista([]))
      .finally(() => setCarregando(false))
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return lista
    return lista.filter(m => `${m.prof} ${m.servico} ${m.mes} ${m.texto}`.toLowerCase().includes(q))
  }, [lista, busca])

  return (
    <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 style={{ fontSize: 15, fontWeight: 900, margin: 0, color: '#1a1a2e' }}>Mensagens enviadas</h3>
        <div style={{ flex: 1 }} />
        <button onClick={carregar} disabled={carregando}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #e0ddd8', background: '#fff', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, color: '#6b6860', cursor: 'pointer' }}>
          <RefreshCw size={13} className={carregando ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>
      <p style={{ fontSize: 12, color: '#8a8680', margin: '0 0 12px' }}>
        O que a gestão enviou pelas listas de serviço — o mesmo texto que o profissional recebeu no WhatsApp.
        Cada envio também vira um registro de <b>acompanhamento</b> na ficha dele.
      </p>

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#a8a49d' }} />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Procurar por profissional, lista ou texto…"
          style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 10, border: '1px solid #e0ddd8', fontSize: 13, outline: 'none' }} />
      </div>

      {carregando ? (
        <div style={{ textAlign: 'center', padding: 30 }}><Loader2 size={18} className="animate-spin" style={{ color: '#a8a49d' }} /></div>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '34px 16px', color: '#a8a49d' }}>
          <Inbox size={24} />
          <p style={{ fontSize: 13, fontWeight: 700, margin: '8px 0 0' }}>
            {lista.length === 0 ? 'Nenhuma mensagem enviada ainda.' : 'Nada encontrado com esse termo.'}
          </p>
          {lista.length === 0 && (
            <p style={{ fontSize: 12, margin: '4px 0 0' }}>
              Elas aparecem aqui quando você usa o botão WhatsApp nas listas de serviço.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxHeight: 460, overflowY: 'auto' }}>
          {filtradas.map((m, i) => (
            <div key={m.id || i} style={{ border: '1px solid #eceae4', borderRadius: 11, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 900, color: '#5b4fcf' }}>{m.prof || 'Profissional'}</span>
                <span style={{ fontSize: 11.5, color: '#6b6860' }}>{m.servico} · {m.mes}</span>
                {typeof m.total === 'number' && (
                  <span style={{ fontSize: 11, color: '#8a8680' }}>atendeu {m.total} · média {m.media}</span>
                )}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 10.5, color: '#a8a49d', whiteSpace: 'nowrap' }}>
                  {m.enviada_em ? new Date(m.enviada_em).toLocaleString('pt-BR') : ''}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: '#374151', whiteSpace: 'pre-wrap', marginTop: 6 }}>{m.texto}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
