'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { AREAS_PORTAL } from '@/lib/areasPortal'

const ROXO = '#5b4fcf'

// Painel do SALÃO PRINCIPAL: liga/desliga, para TODOS os profissionais de uma
// vez, cada área que eles veem no portal. É o padrão do salão — o ajuste
// individual de cada profissional (no cadastro dele) continua valendo por cima.
export default function AcessoGlobalProfissionais() {
  const [oculto, setOculto] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    fetch('/api/salon/acesso-global').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.oculto && typeof d.oculto === 'object') setOculto(d.oculto)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function toggle(chave: string) {
    setOculto(o => ({ ...o, [chave]: !o[chave] })); setDirty(true)
  }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/acesso-global', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oculto }),
      })
      if (res.ok) { toast.success('Padrão de acesso salvo para todos os profissionais!'); setDirty(false) }
      else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') } finally { setSalvando(false) }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 size={24} className="animate-spin" style={{ color: ROXO }} /></div>

  const qtdOcultas = AREAS_PORTAL.filter(a => oculto[a.chave]).length

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <ShieldCheck size={22} style={{ color: ROXO, flexShrink: 0, marginTop: 2 }} />
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Acesso dos Profissionais (geral)</h2>
          <p style={{ color: '#767069', fontSize: 13, margin: '4px 0 0' }}>
            Escolha o que <strong>todos os profissionais</strong> veem no portal. Vale para os já cadastrados e para os próximos.
            Cada profissional ainda pode ter ajustes próprios no cadastro dele — que continuam valendo por cima deste padrão.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: '#6b6860' }}>
          {qtdOcultas === 0 ? 'Todos veem tudo.' : `${qtdOcultas} área(s) oculta(s) para todos.`}
        </span>
        <button onClick={salvar} disabled={salvando || !dirty}
          style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: dirty ? 'pointer' : 'default' }}>
          {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar para todos
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {AREAS_PORTAL.map(a => {
          const esconde = !!oculto[a.chave]
          return (
            <button key={a.chave} onClick={() => toggle(a.chave)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer',
                padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${esconde ? '#fecaca' : '#d1fae5'}`,
                background: esconde ? '#fef2f2' : '#f0fdf4',
              }}>
              {esconde ? <EyeOff size={18} style={{ color: '#dc2626', flexShrink: 0 }} /> : <Eye size={18} style={{ color: '#16a34a', flexShrink: 0 }} />}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a1a' }}>{a.label}</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: esconde ? '#dc2626' : '#16a34a' }}>
                  {esconde ? 'Oculto para todos' : 'Todos podem ver'}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
