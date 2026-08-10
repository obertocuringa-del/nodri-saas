'use client'

// Contas bancárias e PIX de todos os profissionais, numa lista só.
// Puxa direto do cadastro de cada um — nada é digitado duas vezes. Quem está
// sem os dois dados aparece marcado como PENDENTE, para saber quem cobrar.

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Copy, Check, Search } from 'lucide-react'
import toast from 'react-hot-toast'

interface Prof {
  id: string
  nome_completo: string
  apelido?: string
  cargo?: string
  ativo?: boolean
  is_departamento?: boolean
  conta_bancaria?: string
  chave_pix?: string
}

export default function ContasBancariasLista() {
  const [profs, setProfs] = useState<Prof[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [copiado, setCopiado] = useState('')

  useEffect(() => {
    fetch('/api/profissionais', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(arr => setProfs(Array.isArray(arr) ? arr.filter((p: Prof) => !p.is_departamento && p.ativo !== false) : []))
      .catch(() => setProfs([]))
      .finally(() => setCarregando(false))
  }, [])

  function copiar(texto: string, marca: string) {
    navigator.clipboard.writeText(texto)
    setCopiado(marca)
    toast.success('Copiado!')
    setTimeout(() => setCopiado(c => (c === marca ? '' : c)), 1500)
  }

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase()
    const arr = b ? profs.filter(p => (p.apelido || p.nome_completo || '').toLowerCase().includes(b)) : profs
    return [...arr].sort((a, b2) => (a.apelido || a.nome_completo || '').localeCompare(b2.apelido || b2.nome_completo || ''))
  }, [profs, busca])

  const pendentes = lista.filter(p => !p.conta_bancaria?.trim() || !p.chave_pix?.trim()).length

  if (carregando) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={20} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  const Dado = ({ rotulo, valor, marca }: { rotulo: string; valor?: string; marca: string }) => (
    <div style={{ flex: 1, minWidth: 190 }}>
      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>{rotulo}</div>
      {valor?.trim() ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12.5, color: '#374151', wordBreak: 'break-all' }}>{valor}</span>
          <button onClick={() => copiar(valor, marca)} title={`Copiar ${rotulo.toLowerCase()}`}
            style={{ border: 'none', background: 'transparent', color: copiado === marca ? '#16a34a' : '#9ca3af', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
            {copiado === marca ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#c4c0b8' }}>— não informado</div>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Contas bancárias e PIX</h2>
          <p style={{ fontSize: 12, color: '#6b6860', margin: '2px 0 0' }}>
            Vem do cadastro de cada profissional. {pendentes > 0 ? `${pendentes} com dado faltando.` : 'Todos com os dados completos.'}
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: 9, color: '#9ca3af' }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar profissional..."
            style={{ padding: '7px 10px 7px 27px', borderRadius: 9, border: '1px solid #e0ddd8', fontSize: 12.5, minWidth: 200 }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lista.map(p => {
          const semConta = !p.conta_bancaria?.trim()
          const semPix = !p.chave_pix?.trim()
          const pendente = semConta || semPix
          return (
            <div key={p.id} style={{ background: '#fff', border: `1px solid ${pendente ? '#fecaca' : '#e8e6e0'}`, borderRadius: 12, padding: '11px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: 13.5, color: '#1a1a1a' }}>{p.apelido || p.nome_completo}</span>
                {p.cargo && <span style={{ fontSize: 11, color: '#9ca3af' }}>{p.cargo}</span>}
                <div style={{ flex: 1 }} />
                {pendente && (
                  <span style={{ background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 10px', borderRadius: 99, letterSpacing: '.4px' }}>
                    PENDENTE{semConta && semPix ? '' : semConta ? ' · CONTA' : ' · PIX'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Dado rotulo="Conta bancária" valor={p.conta_bancaria} marca={`c-${p.id}`} />
                <Dado rotulo="Chave PIX" valor={p.chave_pix} marca={`p-${p.id}`} />
              </div>
            </div>
          )
        })}
        {lista.length === 0 && (
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 30 }}>Nenhum profissional encontrado.</p>
        )}
      </div>
    </div>
  )
}
