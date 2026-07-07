'use client'

import { useState, useMemo } from 'react'
import { X, Search, Plus } from 'lucide-react'

export interface Opcao { id: string; nome: string }

interface Props {
  opcoes: Opcao[]
  selecionados: string[]
  onChange: (ids: string[]) => void
  onAdicionarNovo?: (nome: string) => Promise<Opcao | null>
  placeholder?: string
  corPrimaria?: string
}

export default function MultiSelectBusca({ opcoes, selecionados, onChange, onAdicionarNovo, placeholder, corPrimaria }: Props) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const [mostrarModalNovo, setMostrarModalNovo] = useState(false)
  const [nomeNovo, setNomeNovo] = useState('')
  const [salvandoNovo, setSalvandoNovo] = useState(false)
  const cor = corPrimaria || '#5b4fcf'

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return opcoes
    return opcoes.filter(o => o.nome.toLowerCase().includes(termo))
  }, [opcoes, busca])

  function toggle(id: string) {
    onChange(selecionados.includes(id) ? selecionados.filter(x => x !== id) : [...selecionados, id])
  }

  function remover(id: string) {
    onChange(selecionados.filter(x => x !== id))
  }

  async function salvarNovo() {
    if (!nomeNovo.trim() || !onAdicionarNovo) return
    setSalvandoNovo(true)
    const criado = await onAdicionarNovo(nomeNovo.trim())
    setSalvandoNovo(false)
    if (criado) {
      onChange([...selecionados, criado.id])
      setNomeNovo('')
      setMostrarModalNovo(false)
    }
  }

  const selecionadasObjs = opcoes.filter(o => selecionados.includes(o.id))

  return (
    <div>
      {selecionadasObjs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selecionadasObjs.map(o => (
            <span key={o.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 20, background: `${cor}15`, color: cor, fontSize: 12, fontWeight: 700 }}>
              {o.nome}
              <button type="button" onClick={() => remover(o.id)} style={{ border: 'none', background: 'transparent', color: cor, cursor: 'pointer', display: 'flex' }}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '2px solid #f3f4f6', borderRadius: 12, padding: '10px 14px', background: '#f9fafb' }}>
          <Search size={16} color="#9ca3af" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onFocus={() => setAberto(true)}
            placeholder={placeholder || 'Buscar serviço...'}
            style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, fontSize: 14 }}
          />
        </div>

        {aberto && (
          <>
            <div onClick={() => setAberto(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', maxHeight: 260, overflowY: 'auto', zIndex: 20 }}>
              {filtradas.length === 0 ? (
                <div style={{ padding: 14, fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>Nenhum serviço encontrado.</div>
              ) : filtradas.map(o => {
                const sel = selecionados.includes(o.id)
                return (
                  <button type="button" key={o.id} onClick={() => toggle(o.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: sel ? `${cor}10` : 'transparent', cursor: 'pointer', fontSize: 13.5, color: sel ? cor : '#374151', fontWeight: sel ? 700 : 500 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${sel ? cor : '#d1d5db'}`, background: sel ? cor : 'white', flexShrink: 0 }} />
                    {o.nome}
                  </button>
                )
              })}
              {onAdicionarNovo && (
                <button type="button" onClick={() => { setMostrarModalNovo(true); setAberto(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderTop: '1px solid #f3f4f6', background: 'transparent', cursor: 'pointer', fontSize: 13.5, color: cor, fontWeight: 700 }}>
                  <Plus size={14} /> Adicionar Serviço
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {mostrarModalNovo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, color: '#1a1a1a' }}>Adicionar Serviço</h3>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>Nome do Serviço</label>
            <input value={nomeNovo} onChange={e => setNomeNovo(e.target.value)} autoFocus
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #d1d5db', fontSize: 14, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setMostrarModalNovo(false); setNomeNovo('') }}
                style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #d1d5db', background: 'white', color: '#6b7280', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button type="button" onClick={salvarNovo} disabled={salvandoNovo || !nomeNovo.trim()}
                style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: cor, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: salvandoNovo || !nomeNovo.trim() ? 0.6 : 1 }}>
                {salvandoNovo ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
