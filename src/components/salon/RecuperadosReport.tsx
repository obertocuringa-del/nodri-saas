'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trophy, TrendingUp, Users, DollarSign, Settings, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import RecepcionistasCarteira from './RecepcionistasCarteira'
import SalaDeJogos from './SalaDeJogos'
import DesafioMatch from './DesafioMatch'
import ArenaNodri from './ArenaNodri'
import { buscarComCache } from '@/lib/fetchCache'

const moeda = (v: number) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function RecuperadosReport() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'recuperados' | 'carteira' | 'jogo' | 'desafios' | 'arena'>('recuperados')
  // Bônus e janela são do salão, não do sistema: a campanha muda e o prêmio
  // da recepção muda junto.
  const [cfgAberta, setCfgAberta] = useState(false)
  const [cfgBonus, setCfgBonus] = useState('')
  const [cfgJanela, setCfgJanela] = useState('')
  const [salvandoCfg, setSalvandoCfg] = useState(false)

  async function salvarCfg() {
    setSalvandoCfg(true)
    try {
      const r = await fetch('/api/relatorios/recuperacao', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bonus_pct: Number(cfgBonus), janela_dias: Number(cfgJanela) }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { toast.error(d?.error || 'Não foi possível salvar'); return }
      toast.success('Regra atualizada')
      setCfgAberta(false)
      // recarrega os números com a regra nova
      const novo = await fetch('/api/relatorios/recuperacao?tipo=recuperados').then(x => x.json())
      setData(novo)
    } catch { toast.error('Erro de conexão') }
    setSalvandoCfg(false)
  }

  useEffect(() => {
    // cache aparece na hora; dado fresco atualiza em seguida
    buscarComCache('/api/relatorios/recuperacao?tipo=recuperados', d => { setData(d); setLoading(false) })
      .finally(() => setLoading(false))
  }, [])

  const card = (icon: any, label: string, valor: string, cor: string) => (
    <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '14px 16px', flex: '1 1 160px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6b6860', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>{icon}{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor }}>{valor}</div>
    </div>
  )

  return (
    <div>
      {/* Sub-abas */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {([['recuperados', '💚 Recuperados'], ['carteira', '💰 Carteira & Pagamentos'], ['jogo', '🎡 Sala de Recompensas'], ['desafios', '⚔️ Desafio 1×1'], ['arena', '🏟️ Arena NODRI']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setVista(v)}
            style={{ padding: '7px 14px', borderRadius: 8, border: vista === v ? '2px solid #5b4fcf' : '1.5px solid #e0ddd8', background: vista === v ? '#f0eefb' : '#fff', color: vista === v ? '#5b4fcf' : '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Abas sempre montadas (display:none) — cada uma carrega 1x e a troca é instantânea */}
      <div style={{ display: vista === 'carteira' ? undefined : 'none' }}><RecepcionistasCarteira /></div>
      <div style={{ display: vista === 'jogo' ? undefined : 'none' }}><SalaDeJogos /></div>
      <div style={{ display: vista === 'desafios' ? undefined : 'none' }}><DesafioMatch /></div>
      <div style={{ display: vista === 'arena' ? undefined : 'none' }}><ArenaNodri /></div>

      {vista === 'recuperados' && (
        loading && !data ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>
        : !data ? <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Não foi possível carregar.</div>
        : (
        <>
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h3 style={{ color: '#15803d', fontSize: 14, fontWeight: 700, margin: 0 }}>💚 Clientes Recuperados</h3>
            <p style={{ color: '#166534', fontSize: 12, margin: '4px 0 0' }}>
              Clientes que voltaram em até {data.janela_dias} dias após o contato. Bônus = {data.bonus_pct}% do valor pago na visita de volta.
            </p>
          </div>
          <button onClick={() => { setCfgBonus(String(data.bonus_pct)); setCfgJanela(String(data.janela_dias)); setCfgAberta(a => !a) }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #86efac', color: '#15803d', borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            <Settings size={13} /> Ajustar regra
          </button>
        </div>

        {cfgAberta && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #bbf7d0', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 }}>Bônus da recepção (%)</label>
              <input type="number" value={cfgBonus} onChange={e => setCfgBonus(e.target.value)} min={0} max={50} step="0.5"
                style={{ width: 120, border: '1px solid #86efac', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontWeight: 700, color: '#14532d' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 4 }}>Janela de retorno (dias)</label>
              <input type="number" value={cfgJanela} onChange={e => setCfgJanela(e.target.value)} min={1} max={90}
                style={{ width: 140, border: '1px solid #86efac', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontWeight: 700, color: '#14532d' }} />
            </div>
            <button onClick={salvarCfg} disabled={salvandoCfg}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', opacity: salvandoCfg ? .6 : 1 }}>
              {salvandoCfg ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Salvar
            </button>
            <button onClick={() => setCfgAberta(false)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', padding: '9px 6px' }}>
              <X size={13} /> Cancelar
            </button>
            <p style={{ width: '100%', margin: 0, fontSize: 11, color: '#166534' }}>
              Vale para o cálculo daqui pra frente e recalcula o histórico com a regra nova. Bônus de 0 a 50%, janela de 1 a 90 dias.
            </p>
          </div>
        )}
      </div>

      {/* Métricas + ROI */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        {card(<Users size={14} />, 'Recuperados', String(data.total_recuperados), '#16a34a')}
        {card(<TrendingUp size={14} />, 'Taxa de conversão', `${data.taxa_conversao}%`, '#5b4fcf')}
        {card(<DollarSign size={14} />, 'Faturam. recuperado', moeda(data.faturamento_recuperado), '#059669')}
        {card(<DollarSign size={14} />, 'Bônus total', moeda(data.total_bonus), '#d97706')}
        {card(<TrendingUp size={14} />, 'ROI (recuperado ÷ bônus)', `${data.roi}x`, '#0891b2')}
      </div>

      {/* Funil */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16, marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>Funil de recuperação</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 10, padding: '10px 18px', fontWeight: 700 }}>{data.total_contatos} contatadas</div>
          <span style={{ color: '#9ca3af' }}>→</span>
          <div style={{ background: '#dcfce7', color: '#15803d', borderRadius: 10, padding: '10px 18px', fontWeight: 700 }}>{data.total_recuperados} voltaram ({data.taxa_conversao}%)</div>
        </div>
      </div>

      {/* Ranking recepção */}
      {data.ranking?.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}><Trophy size={15} color="#d97706" /> Taxa de recuperação por recepcionista</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: '#faf9f7' }}>
              {['#', 'Recepcionista', 'Clientes Contatados', 'Clientes Recuperados', 'Taxa', 'Bônus'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Recepcionista' ? 'left' : 'right', fontSize: 11, color: '#6b6860', fontWeight: 600 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {data.ranking.map((r: any, i: number) => (
                <tr key={i} style={{ borderTop: '1px solid #f0eee8' }}>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#9ca3af' }}>{i + 1}º</td>
                  <td style={{ padding: '8px 10px', color: '#1a1a1a', fontWeight: 600 }}>{r.nome}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#767069' }}>{r.contatos}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{r.recuperados}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#5b4fcf', fontWeight: 600 }}>{r.taxa}%</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#d97706', fontWeight: 700 }}>{moeda(r.bonus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lista de recuperados */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>{data.recuperados?.length || 0} clientes recuperados</div>
        {(!data.recuperados || data.recuperados.length === 0) ? (
          <p style={{ fontSize: 12, color: '#9ca3af' }}>Nenhuma cliente recuperada ainda. Assim que uma cliente contatada voltar (e você reimportar os atendimentos), ela aparece aqui.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#faf9f7' }}>
                {['Cliente', 'Ficou ausente', 'Voltou em', 'Valor da volta', 'Recepção', 'Bônus'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: '#6b6860', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {data.recuperados.map((r: any, i: number) => (
                  <tr key={i} style={{ borderTop: '1px solid #f0eee8' }}>
                    <td style={{ padding: '8px 10px', color: '#1a1a1a', fontWeight: 600 }}>{r.cliente_nome}</td>
                    <td style={{ padding: '8px 10px', color: '#f97316', fontWeight: 700 }}>{r.dias_ausente != null ? `${r.dias_ausente} dias` : '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#16a34a', fontWeight: 600 }}>{r.data_retorno}</td>
                    <td style={{ padding: '8px 10px', color: '#059669', fontWeight: 700 }}>{moeda(r.valor_retorno)}</td>
                    <td style={{ padding: '8px 10px', color: '#5b4fcf' }}>{r.recepcionista_nome}</td>
                    <td style={{ padding: '8px 10px', color: '#d97706', fontWeight: 700 }}>{moeda(r.bonus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
        )
      )}
    </div>
  )
}
