'use client'

import { useState, useEffect } from 'react'
import { KeyRound, Eye, EyeOff, Loader2, Check } from 'lucide-react'
import toast from 'react-hot-toast'

// Itens que o salão pode OCULTAR da visão do próprio profissional (portal somente leitura)
export const ITENS_OCULTAVEIS: { chave: string; label: string }[] = [
  { chave: 'fat_acumulado', label: 'Faturamento Acumulado' },
  { chave: 'ticket_medio', label: 'Ticket Médio' },
  { chave: 'dependencia', label: 'Faturamento Gerado (aba Dependência)' },
  { chave: 'oportunidades', label: 'Oportunidades' },
  { chave: 'avaliar', label: 'Avaliações' },
  { chave: 'metas', label: 'Metas' },
]

export default function AcessoProfissional({ profId, prof, onSaved }: { profId: string; prof: any; onSaved?: (d: any) => void }) {
  const [ehDono, setEhDono] = useState(false)
  const [carregado, setCarregado] = useState(false)
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [liberado, setLiberado] = useState(false)
  const [temSenha, setTemSenha] = useState(false)
  const [oculto, setOculto] = useState<Record<string, boolean>>({})
  const [salvando, setSalvando] = useState(false)

  // Só o salão principal (role 'salon') gerencia acessos
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      setEhDono(d?.user?.role === 'salon' || d?.role === 'salon')
      setCarregado(true)
    }).catch(() => setCarregado(true))
  }, [])

  // Preenche com os dados atuais do profissional
  useEffect(() => {
    if (!prof) return
    setLogin(prof.acesso_login || '')
    setLiberado(!!prof.acesso_liberado)
    setTemSenha(!!prof.acesso_tem_senha)
    const o = prof.acesso_oculto && typeof prof.acesso_oculto === 'object' ? prof.acesso_oculto : {}
    setOculto(o)
  }, [prof])

  if (!carregado || !ehDono) return null

  async function salvar() {
    const loginLimpo = login.trim().toLowerCase()
    if (liberado && !loginLimpo) { toast.error('Defina um login para liberar o acesso'); return }
    if (liberado && !temSenha && !senha.trim()) { toast.error('Defina uma senha para liberar o acesso'); return }
    setSalvando(true)
    try {
      const body: any = { acesso_login: loginLimpo || null, acesso_liberado: liberado, acesso_oculto: oculto }
      if (senha.trim()) body.acesso_senha = senha.trim()
      const res = await fetch(`/api/profissionais/${profId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        const d = await res.json()
        toast.success('Acesso salvo!')
        setSenha(''); setTemSenha(!!d?.acesso_tem_senha || temSenha || !!senha.trim())
        onSaved?.(d)
      } else {
        const e = await res.json().catch(() => ({}))
        toast.error(e?.error?.includes('duplicate') || e?.error?.includes('unique') ? 'Esse login já está em uso por outro profissional' : (e?.error || 'Erro ao salvar'))
      }
    } catch { toast.error('Erro ao salvar') } finally { setSalvando(false) }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 14 }
  const nomeProf = prof?.apelido || prof?.nome_completo || 'profissional'

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e0ddd8', borderRadius: 14, padding: 18, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <KeyRound size={18} color="#5b4fcf" />
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>Acesso do Profissional</h3>
      </div>
      <p style={{ fontSize: 12.5, color: '#6b6860', margin: '0 0 14px' }}>
        Dê a {nomeProf} um login e senha para que veja <strong>apenas o próprio perfil</strong>, em modo <strong>somente leitura</strong>.
        Ele entra na tela de login normal do sistema. Você pode ligar/desligar este acesso quando quiser.
      </p>

      {/* Liga/desliga o acesso */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: liberado ? '#eafaf0' : '#faf9f7', border: `1.5px solid ${liberado ? '#16a34a' : '#e0ddd8'}`, cursor: 'pointer', marginBottom: 14 }}>
        <input type="checkbox" checked={liberado} onChange={e => setLiberado(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#16a34a' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: liberado ? '#15803d' : '#6b6860' }}>
          {liberado ? '✅ Acesso LIBERADO — o profissional consegue entrar' : '🔒 Acesso DESLIGADO — o profissional não entra'}
        </span>
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 5 }}>Login (usuário)</label>
          <input value={login} onChange={e => setLogin(e.target.value)} placeholder="ex: adilson" autoComplete="off" style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 5 }}>
            Senha {temSenha && <span style={{ color: '#16a34a', fontWeight: 600 }}>(já definida — deixe em branco para manter)</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <input value={senha} onChange={e => setSenha(e.target.value)} type={verSenha ? 'text' : 'password'} placeholder={temSenha ? '••••••••' : 'definir senha'} autoComplete="new-password" style={{ ...inp, paddingRight: 40 }} />
            <button type="button" onClick={() => setVerSenha(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              {verSenha ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* O que ocultar da visão do profissional */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' }}>O que o profissional NÃO pode ver:</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
          {ITENS_OCULTAVEIS.map(it => (
            <label key={it.chave} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: oculto[it.chave] ? '#fef2f2' : '#faf9f7', border: `1px solid ${oculto[it.chave] ? '#fca5a5' : '#e8e6e0'}`, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!oculto[it.chave]} onChange={e => setOculto(o => ({ ...o, [it.chave]: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#dc2626' }} />
              <span style={{ fontSize: 13, color: oculto[it.chave] ? '#b91c1c' : '#374151', fontWeight: oculto[it.chave] ? 700 : 500 }}>Ocultar {it.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 22px', borderRadius: 10, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 14, fontWeight: 800, cursor: salvando ? 'wait' : 'pointer' }}>
        {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Salvar acesso
      </button>
    </div>
  )
}
