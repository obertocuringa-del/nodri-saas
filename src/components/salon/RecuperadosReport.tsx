'use client'

import { useEffect, useState } from 'react'
import { Loader2, Trophy, TrendingUp, Users, DollarSign } from 'lucide-react'
import RecepcionistasCarteira from './RecepcionistasCarteira'
import SalaDeJogos from './SalaDeJogos'
import DesafioMatch from './DesafioMatch'

const moeda = (v: number) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function RecuperadosReport() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'recuperados' | 'carteira' | 'jogo' | 'desafios'>('recuperados')

  useEffect(() => {
    setLoading(true)
    fetch('/api/relatorios/recuperacao?tipo=recuperados')
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null))
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
        {([['recuperados', '💚 Recuperados'], ['carteira', '💰 Carteira & Pagamentos'], ['jogo', '🎡 Sala de Recompensas'], ['desafios', '⚔️ Desafio 1×1']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setVista(v)}
            style={{ padding: '7px 14px', borderRadius: 8, border: vista === v ? '2px solid #5b4fcf' : '1.5px solid #e0ddd8', background: vista === v ? '#f0eefb' : '#fff', color: vista === v ? '#5b4fcf' : '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {l}
          </button>
        ))}
      </div>

      {vista === 'carteira' && <RecepcionistasCarteira />}
      {vista === 'jogo' && <SalaDeJogos />}
      {vista === 'desafios' && <DesafioMatch />}

      {vista === 'recuperados' && (
        loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>
        : !data ? <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Não foi possível carregar.</div>
        : (
        <>
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
        <h3 style={{ color: '#15803d', fontSize: 14, fontWeight: 700, margin: 0 }}>💚 Clientes Recuperados</h3>
        <p style={{ color: '#166534', fontSize: 12, margin: '4px 0 0' }}>
          Clientes que voltaram em até {data.janela_dias} dias após o contato. Bônus = {data.bonus_pct}% do valor pago na visita de volta.
        </p>
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
