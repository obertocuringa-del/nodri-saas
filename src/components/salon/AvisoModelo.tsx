'use client'

// ─────────────────────────────────────────────────────────────────────────────
// AVISO DE ATUALIZAÇÃO DO MODELO (dentro do salão)
//
// O modelo PROPÕE, o salão DECIDE. Nada é aplicado sozinho.
// Por padrão o botão traz só o que é NOVO — o que o salão já personalizou
// fica como está, a menos que ele marque para atualizar também.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Sparkles, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Item { chave: string; rotulo: string }
interface Info { temAtualizacao: boolean; novos?: Item[]; alterados?: Item[] }

export default function AvisoModelo() {
  const [info, setInfo] = useState<Info | null>(null)
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [tambemAlterados, setTambemAlterados] = useState(false)
  const [sumiu, setSumiu] = useState(false)

  useEffect(() => {
    fetch('/api/salon/modelo-atualizacao')
      .then(r => r.ok ? r.json() : null)
      .then(d => setInfo(d && d.temAtualizacao ? d : null))
      .catch(() => setInfo(null))
  }, [])

  if (!info || sumiu) return null
  const novos = info.novos || []
  const alterados = info.alterados || []

  async function enviar(corpo: any, msg: string) {
    setOcupado(true)
    try {
      const r = await fetch('/api/salon/modelo-atualizacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      const j = await r.json().catch(() => null)
      if (r.ok) { toast.success(msg); setSumiu(true) }
      else toast.error(j?.error || 'Erro')
    } catch { toast.error('Erro de conexão') }
    setOcupado(false)
  }

  return (
    <div style={{ background: 'linear-gradient(135deg,#5b4fcf,#7c3aed)', color: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 16, boxShadow: '0 8px 22px rgba(91,79,207,.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Sparkles size={20} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <strong style={{ display: 'block', fontSize: 14.5, fontWeight: 900 }}>Há novidades no sistema para o seu salão</strong>
          <span style={{ fontSize: 12.5, opacity: .95 }}>
            {novos.length > 0 && `${novos.length} novidade(s)`}
            {novos.length > 0 && alterados.length > 0 && ' · '}
            {alterados.length > 0 && `${alterados.length} atualização(ões) do que já existe`}
            {' — você decide o que aplicar. Nada muda sem o seu OK.'}
          </span>
        </div>
        <button onClick={() => setAberto(a => !a)} style={btnClaro}>
          {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Ver o que é
        </button>
        <button onClick={() => enviar({ chaves: novos.map(n => n.chave).concat(tambemAlterados ? alterados.map(a => a.chave) : []) }, 'Aplicado!')}
          disabled={ocupado} style={btnBranco}>
          {ocupado ? <Loader2 size={14} className="animate-spin" /> : <>Aplicar</>}
        </button>
        <button onClick={() => enviar({ acao: 'ignorar' }, 'Ok, não mostramos mais esta versão.')} title="Agora não"
          disabled={ocupado} style={{ ...btnClaro, padding: '8px 10px' }}><X size={14} /></button>
      </div>

      {aberto && (
        <div style={{ marginTop: 12, background: 'rgba(255,255,255,.14)', borderRadius: 10, padding: 12 }}>
          {novos.length > 0 && (
            <>
              <div style={rotuloBloco}>NOVIDADES — entram sem mexer no que você já tem</div>
              {novos.map(n => <div key={n.chave} style={linha}>• {n.rotulo}</div>)}
            </>
          )}
          {alterados.length > 0 && (
            <>
              <div style={{ ...rotuloBloco, marginTop: novos.length ? 12 : 0 }}>JÁ EXISTEM AQUI — só mudam se você marcar</div>
              {alterados.map(a => <div key={a.chave} style={linha}>• {a.rotulo}</div>)}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12.5, cursor: 'pointer' }}>
                <input type="checkbox" checked={tambemAlterados} onChange={e => setTambemAlterados(e.target.checked)} />
                Atualizar também estes — <strong>substitui a sua versão atual deles</strong>
              </label>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const btnClaro: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 9, border: '1px solid rgba(255,255,255,.5)', background: 'rgba(255,255,255,.16)', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }
const btnBranco: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 18px', borderRadius: 9, border: 'none', background: '#fff', color: '#5b4fcf', fontSize: 13, fontWeight: 900, cursor: 'pointer', flexShrink: 0 }
const rotuloBloco: React.CSSProperties = { fontSize: 10.5, fontWeight: 900, letterSpacing: '.5px', opacity: .9, marginBottom: 6 }
const linha: React.CSSProperties = { fontSize: 12.5, padding: '2px 0' }
