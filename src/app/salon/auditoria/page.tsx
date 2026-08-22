'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { voltar } from '@/lib/historicoNav'
import { ArrowLeft, Loader2, ShieldCheck, RefreshCw } from 'lucide-react'

interface Log { usuario: string; acao: string; entidade: string; detalhe: string; criado_em: string }
const corAcao = (a: string) => /exclu/i.test(a) ? '#dc2626' : /cri|adicion/i.test(a) ? '#16a34a' : '#5b4fcf'

export default function AuditoriaPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [semTabela, setSemTabela] = useState(false)
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch('/api/salon/auditoria').then(r => r.ok ? r.json() : null)
      if (d) { setLogs(d.logs || []); setSemTabela(!!d.semTabela) }
    } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const filtrados = logs.filter(l => {
    if (!busca.trim()) return true
    const q = busca.toLowerCase()
    return (l.usuario + l.acao + l.entidade + l.detalhe).toLowerCase().includes(q)
  })

  return (
    <div className="nodri-salon-bg" style={{ minHeight: '100vh' }}>
      <nav style={{ background: '#faf9f7', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => voltar(router, '/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}><ShieldCheck size={15} style={{ display: 'inline', verticalAlign: -2, marginRight: 6, color: '#5b4fcf' }} />Log de Auditoria</span>
        <button onClick={carregar} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#6b6860', cursor: 'pointer', fontSize: 13 }}><RefreshCw size={14} /> Atualizar</button>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
        <p style={{ fontSize: 13, color: '#6b6860', margin: '0 0 12px' }}>Registro de quem alterou, criou ou excluiu informações no sistema (últimos 300 eventos).</p>
        {semTabela && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 14, color: '#92400e', fontSize: 13, marginBottom: 14 }}>
            O log ainda não está ativo. Rode o <strong>SQL</strong> que o suporte te passou no Supabase para criar a tabela <code>audit_log</code>. Depois disso, as ações passam a ser registradas aqui automaticamente.
          </div>
        )}
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Filtrar por usuário, ação ou item…" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, marginBottom: 14 }} />

        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 size={26} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> :
          filtrados.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14 }}>{semTabela ? 'Ative o log para começar a registrar.' : 'Nenhum evento registrado ainda.'}</div> : (
            <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, overflow: 'hidden' }}>
              {filtrados.map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < filtrados.length - 1 ? '1px solid #f0eee8' : 'none', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: corAcao(l.acao), borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>{l.acao}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{l.entidade}</span>
                  {l.detalhe && <span style={{ fontSize: 12, color: '#6b6860', flex: 1, minWidth: 100 }}>{l.detalhe}</span>}
                  <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{l.usuario} · {new Date(l.criado_em).toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}
