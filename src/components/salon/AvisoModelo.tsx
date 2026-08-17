'use client'

// ─────────────────────────────────────────────────────────────────────────────
// AVISO DE ATUALIZAÇÃO DO MODELO (dentro do salão)
//
// O modelo PROPÕE, o salão DECIDE — item a item. Nada é aplicado sozinho e
// nada entra "no pacote": cada novidade tem a sua caixinha, porque o salão
// pode querer o check list novo e não querer a lista de compra.
//
// O que ele já preencheu nunca é substituído sem que ele marque, e páginas
// que ele já usa nem aparecem como atualização (ver compararComModelo).
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
  const [sumiu, setSumiu] = useState(false)
  // Marcadas = o que vai ser aplicado. As novidades começam marcadas (é o que
  // o salão costuma querer); o que ele já tem começa DESmarcado, porque
  // aplicar ali substitui a versão dele.
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/salon/modelo-atualizacao')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.temAtualizacao) {
          setInfo(d)
          setMarcadas(new Set((d.novos || []).map((n: Item) => n.chave)))
        } else setInfo(null)
      })
      .catch(() => setInfo(null))
  }, [])

  if (!info || sumiu) return null
  const novos = info.novos || []
  const alterados = info.alterados || []

  const alterna = (chave: string) => setMarcadas(m => {
    const n = new Set(m)
    n.has(chave) ? n.delete(chave) : n.add(chave)
    return n
  })

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
            {' — abra e escolha uma por uma. Nada muda sem o seu OK.'}
            <br />
            <a href="/salon/atualizacoes" style={{ color: '#fff', textDecoration: 'underline', fontWeight: 700 }}>
              Dispensou sem querer? Fica guardado em Atualizações do sistema.
            </a>
          </span>
        </div>
        <button onClick={() => setAberto(a => !a)} style={btnClaro}>
          {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Escolher o que atualizar
        </button>
        <button onClick={() => enviar({ chaves: [...marcadas] }, 'Aplicado!')}
          disabled={ocupado || marcadas.size === 0} style={{ ...btnBranco, opacity: marcadas.size === 0 ? .6 : 1 }}>
          {ocupado ? <Loader2 size={14} className="animate-spin" /> : <>Quero atualizar ({marcadas.size})</>}
        </button>
        <button onClick={() => enviar({ acao: 'ignorar' }, 'Ok — você acha isto depois em Atualizações do sistema.')} title="Agora não"
          disabled={ocupado} style={{ ...btnClaro, padding: '8px 10px' }}><X size={14} /></button>
      </div>

      {aberto && (
        <div style={{ marginTop: 12, background: 'rgba(255,255,255,.14)', borderRadius: 10, padding: 12 }}>
          {novos.length > 0 && (
            <>
              <div style={rotuloBloco}>NOVIDADES — entram sem mexer no que você já tem</div>
              {novos.map(n => (
                <label key={n.chave} style={linhaEscolha}>
                  <input type="checkbox" checked={marcadas.has(n.chave)} onChange={() => alterna(n.chave)} />
                  <span>{n.rotulo}</span>
                </label>
              ))}
            </>
          )}
          {alterados.length > 0 && (
            <>
              <div style={{ ...rotuloBloco, marginTop: novos.length ? 12 : 0 }}>
                JÁ EXISTEM AQUI — entra o que falta, o seu conteúdo fica
              </div>
              {alterados.map(a => (
                <label key={a.chave} style={linhaEscolha}>
                  <input type="checkbox" checked={marcadas.has(a.chave)} onChange={() => alterna(a.chave)} />
                  <span>{a.rotulo}</span>
                </label>
              ))}
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
const linhaEscolha: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '3px 0', cursor: 'pointer' }
