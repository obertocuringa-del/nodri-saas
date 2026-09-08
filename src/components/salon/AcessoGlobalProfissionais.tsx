'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { AREAS_PORTAL } from '@/lib/areasPortal'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

const ROXO = '#5b4fcf'

// Painel do SALÃO PRINCIPAL: liga/desliga, para TODOS os profissionais de uma
// vez, cada área que eles veem no portal. É o padrão do salão — o ajuste
// individual de cada profissional (no cadastro dele) continua valendo por cima.
export default function AcessoGlobalProfissionais() {
  const [oculto, setOculto] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  // O que foi mexido e ainda nao foi gravado. Serve para marcar o card: sem
  // isso, um card clicado e um card salvo sao visualmente identicos.
  const [mexidas, setMexidas] = useState<Set<string>>(new Set())
  // Sair daqui com alteracao pendente passa a avisar. Era exatamente o que
  // faltava: clicar no card pinta de verde na hora, e a pessoa sai com a
  // impressao de ter ligado a area — sem nunca ter gravado nada.
  useGuardaSalvar(dirty, 'Acesso dos Profissionais')

  useEffect(() => {
    fetch('/api/salon/acesso-global').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.oculto && typeof d.oculto === 'object') setOculto(d.oculto)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function toggle(chave: string) {
    setOculto(o => ({ ...o, [chave]: !o[chave] }))
    setMexidas(m => { const n = new Set(m); n.add(chave); return n })
    setDirty(true)
  }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/acesso-global', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oculto }),
      })
      if (res.ok) { toast.success('Padrão de acesso salvo para todos os profissionais!'); setDirty(false); setMexidas(new Set()) }
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

      {/* Barra grudada no topo.
          Antes o botão Salvar ficava aqui em cima e a grade descia por 22
          cards. Quem rolava até o card lá embaixo, clicava e via ele ficar
          verde não tinha como saber que aquilo era só a tela — o botão que
          grava estava fora do campo de visão. Grudando a barra, a pendência
          acompanha a rolagem e o Salvar está sempre a um toque. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', flexWrap: 'wrap',
        position: 'sticky', top: 0, zIndex: 5, padding: '10px 12px', borderRadius: 12,
        background: dirty ? '#fffbeb' : '#faf9f7',
        border: `1.5px solid ${dirty ? '#fcd34d' : '#e8e6e0'}`,
      }}>
        <span style={{ fontSize: 12.5, color: dirty ? '#92400e' : '#6b6860', fontWeight: dirty ? 700 : 400 }}>
          {dirty
            ? `${mexidas.size} alteração(ões) ainda NÃO salva(s) — clique em Salvar para valer no portal.`
            : (qtdOcultas === 0 ? 'Todos veem tudo.' : `${qtdOcultas} área(s) oculta(s) para todos.`)}
        </span>
        <button onClick={salvar} disabled={salvando || !dirty}
          style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: dirty ? 'pointer' : 'default' }}>
          {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar para todos
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {AREAS_PORTAL.map(a => {
          const esconde = !!oculto[a.chave]
          const naoSalvo = mexidas.has(a.chave)
          return (
            <button key={a.chave} onClick={() => toggle(a.chave)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer',
                padding: '12px 14px', borderRadius: 12, position: 'relative',
                border: naoSalvo ? '2px dashed #d97706' : `1.5px solid ${esconde ? '#fecaca' : '#d1fae5'}`,
                background: esconde ? '#fef2f2' : '#f0fdf4',
              }}>
              {esconde ? <EyeOff size={18} style={{ color: '#dc2626', flexShrink: 0 }} /> : <Eye size={18} style={{ color: '#16a34a', flexShrink: 0 }} />}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a1a' }}>{a.label}</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: esconde ? '#dc2626' : '#16a34a' }}>
                  {esconde ? 'Oculto para todos' : 'Todos podem ver'}
                </div>
              </div>
              {/* Contorno tracejado + etiqueta: o card mexido tem que parecer
                  diferente do card gravado. Cor sozinha não bastava — verde é
                  verde tanto no clique quanto depois de salvo. */}
              {naoSalvo && (
                <span style={{ position: 'absolute', top: -8, right: 8, background: '#d97706', color: '#fff', fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                  não salvo
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
