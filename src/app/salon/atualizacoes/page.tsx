'use client'

// ─────────────────────────────────────────────────────────────────────────────
// ATUALIZAÇÕES DO SISTEMA (dentro do salão)
//
// O aviso roxo do topo some quando o dono clica no X — e é fácil clicar sem
// querer, ou dispensar hoje e mudar de ideia amanhã. Esta página é o lugar
// fixo: ela mostra o que o modelo tem de diferente do salão AGORA, tenha o
// aviso sido dispensado ou não (`?tudo=1`), e aplica quando ele quiser.
//
// A regra continua a mesma do aviso: o modelo PROPÕE, o salão DECIDE. Nada é
// aplicado sozinho, e o que ele já personalizou só muda se marcar.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Sparkles, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'

interface Item { chave: string; rotulo: string }
interface Info {
  temAtualizacao: boolean
  jaVista?: boolean
  aplicadoEm?: string | null
  novos?: Item[]
  alterados?: Item[]
}

export default function AtualizacoesPage() {
  const [info, setInfo] = useState<Info | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [tambemAlterados, setTambemAlterados] = useState(false)

  const carregar = useCallback(() => {
    setCarregando(true)
    fetch('/api/salon/modelo-atualizacao?tudo=1', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setInfo(d))
      .catch(() => setInfo(null))
      .finally(() => setCarregando(false))
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const novos = info?.novos || []
  const alterados = info?.alterados || []
  const nada = !novos.length && !alterados.length

  async function aplicar() {
    setOcupado(true)
    try {
      const chaves = novos.map(n => n.chave).concat(tambemAlterados ? alterados.map(a => a.chave) : [])
      const r = await fetch('/api/salon/modelo-atualizacao', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chaves }),
      })
      const j = await r.json().catch(() => null)
      if (r.ok) { toast.success('Atualização aplicada'); carregar() }
      else toast.error(j?.error || 'Não foi possível aplicar')
    } catch { toast.error('Erro de conexão') }
    setOcupado(false)
  }

  return (
    <div style={{ padding: '18px 20px 60px', maxWidth: 880, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Sparkles size={18} style={{ color: '#5b4fcf' }} />
        <h1 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e', margin: 0 }}>Atualizações do sistema</h1>
        <div style={{ flex: 1 }} />
        <button onClick={carregar} disabled={carregando}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #e0ddd8', background: '#fff', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, color: '#6b6860', cursor: 'pointer' }}>
          <RefreshCw size={13} className={carregando ? 'animate-spin' : ''} /> Conferir de novo
        </button>
      </div>
      <p style={{ fontSize: 12.5, color: '#8a8680', margin: '0 0 16px' }}>
        Melhorias e páginas novas ficam disponíveis aqui. Você decide o que aplicar — nada muda sozinho.
        {info?.aplicadoEm && ` Última vez que aplicou: ${new Date(info.aplicadoEm).toLocaleDateString('pt-BR')}.`}
      </p>

      {carregando ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={20} className="animate-spin" style={{ color: '#a8a49d' }} /></div>
      ) : nada ? (
        <div style={{ textAlign: 'center', padding: '46px 20px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14 }}>
          <CheckCircle2 size={26} style={{ color: '#16a34a', display: 'inline' }} />
          <p style={{ color: '#15803d', fontSize: 14, fontWeight: 800, margin: '8px 0 0' }}>Seu salão está em dia.</p>
          <p style={{ color: '#6b7280', fontSize: 12.5, margin: '4px 0 0' }}>Quando sair novidade, ela aparece aqui.</p>
        </div>
      ) : (
        <>
          {info?.jaVista && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 11, padding: '10px 13px', marginBottom: 12, fontSize: 12.5, color: '#92400e' }}>
              Esta atualização já tinha sido dispensada — ela continua disponível e pode ser aplicada agora.
            </div>
          )}

          {novos.length > 0 && (
            <div style={bloco}>
              <div style={rotulo}>NOVIDADES — {novos.length} {novos.length === 1 ? 'item' : 'itens'}</div>
              <p style={{ fontSize: 11.5, color: '#8a8680', margin: '0 0 8px' }}>Entram sem mexer no que você já tem.</p>
              {novos.map(n => <div key={n.chave} style={linha}>• {n.rotulo}</div>)}
            </div>
          )}

          {alterados.length > 0 && (
            <div style={bloco}>
              <div style={rotulo}>JÁ EXISTEM AQUI — {alterados.length} {alterados.length === 1 ? 'item' : 'itens'}</div>
              <p style={{ fontSize: 11.5, color: '#8a8680', margin: '0 0 8px' }}>
                Você já tem estes, com o seu preenchimento. Só mudam se marcar abaixo.
              </p>
              {alterados.map(a => <div key={a.chave} style={linha}>• {a.rotulo}</div>)}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12.5, cursor: 'pointer', color: '#3f3a35' }}>
                <input type="checkbox" checked={tambemAlterados} onChange={e => setTambemAlterados(e.target.checked)} />
                Atualizar também estes — <strong>substitui a sua versão atual deles</strong>
              </label>
            </div>
          )}

          <button onClick={aplicar} disabled={ocupado}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#5b4fcf', color: '#fff', border: 'none', borderRadius: 11, padding: '12px 26px', fontSize: 13.5, fontWeight: 900, cursor: 'pointer', marginTop: 4 }}>
            {ocupado ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Aplicar {tambemAlterados ? 'tudo' : 'as novidades'}
          </button>
        </>
      )}
    </div>
  )
}

const bloco: React.CSSProperties = { background: '#fff', border: '1px solid #eceae4', borderRadius: 13, padding: '13px 16px', marginBottom: 12 }
const rotulo: React.CSSProperties = { fontSize: 11, fontWeight: 900, letterSpacing: '.5px', color: '#5b4fcf', marginBottom: 2 }
const linha: React.CSSProperties = { fontSize: 12.5, padding: '3px 0', color: '#3f3a35', borderBottom: '1px solid #f7f6f3' }
