'use client'

import { useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// PAINEL DO CLIENTE — abre dentro dos relatórios Em Risco / Perdidos
//
// Os relatórios mostram o perfil resumido e uma lista de serviços cortada em
// três nomes numa linha só, sem dizer quem atendeu. Para decidir se vale
// chamar a cliente de volta, e por quem, falta justamente isso.
//
// Aqui vem o mesmo conteúdo que o profissional vê ao abrir uma cliente no
// agendamento: quem já atendeu, o histórico de serviços com a contagem e o que
// foi feito na última visita.
//
// Mora em arquivo próprio de propósito: a página de relatórios tem quase três
// mil linhas, e enfiar mais um bloco de JSX no meio dela é onde se quebra a
// tela sem querer.
// ─────────────────────────────────────────────────────────────────────────────

interface Detalhe {
  encontrado: boolean
  total_visitas: number
  primeira_visita?: string | null
  ultima_visita?: string | null
  faturamento_acumulado?: number
  ticket_medio?: number
  freq_media_dias?: number | null
  cliente_fiel?: boolean
  servicos: { nome: string; vezes: number }[]
  profissionais_atendidos: string[]
  servicos_ultima: string[]
  profissionais_ultima: string[]
}

const moeda = (v: number) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

export default function DetalheClienteRelatorio(
  { cliente, celular, mostrarValores = true }:
  { cliente: string; celular?: string; mostrarValores?: boolean },
) {
  const [d, setD] = useState<Detalhe | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    setD(null); setErro('')
    fetch(`/api/relatorios/cliente-detalhe?cliente=${encodeURIComponent(cliente)}&celular=${encodeURIComponent(celular || '')}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('falhou')))
      .then(j => { if (vivo) setD(j) })
      .catch(() => { if (vivo) setErro('Não foi possível carregar o histórico desta cliente.') })
    return () => { vivo = false }
  }, [cliente, celular])

  const cx: React.CSSProperties = { background: '#faf9f7', borderTop: '1px solid #e8e6e0', padding: '14px 18px' }

  if (erro) return <div style={{ ...cx, fontSize: 12, color: '#b91c1c' }}>{erro}</div>
  if (!d) return <div style={{ ...cx, fontSize: 12, color: '#767069' }}>Carregando histórico…</div>
  if (!d.encontrado) {
    return <div style={{ ...cx, fontSize: 12, color: '#767069' }}>
      Sem atendimentos detalhados desta cliente na base importada.
    </div>
  }

  const selo = (texto: string, cor: string, fundo: string): React.ReactNode => (
    <span style={{ fontSize: 11, fontWeight: 800, color: cor, background: fundo, border: `1px solid ${cor}33`, borderRadius: 99, padding: '3px 11px' }}>{texto}</span>
  )
  const card = (titulo: string, valor: string) => (
    <div style={{ flex: '1 1 140px', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 11, padding: '11px 13px' }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a' }}>{valor}</div>
      <div style={{ fontSize: 10, color: '#767069', textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 2 }}>{titulo}</div>
    </div>
  )

  return (
    <div style={cx}>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 11 }}>
        {d.total_visitas >= 10 && selo('💎 Cliente VIP (10+ visitas)', '#7c3aed', '#f5f3ff')}
        {d.cliente_fiel && selo('❤️ Cliente Fiel', '#dc2626', '#fef2f2')}
        {mostrarValores && (d.ticket_medio || 0) >= 100 && selo('💰 Cliente de alto ticket', '#059669', '#ecfdf5')}
        {d.freq_media_dias ? selo(`🔁 Voltava a cada ${d.freq_media_dias} dias`, '#0ea5e9', '#f0f9ff') : null}
        {d.primeira_visita ? selo(`📌 1ª visita: ${d.primeira_visita}`, '#6b6860', '#f5f4f0') : null}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        {card('Total de visitas', `${d.total_visitas}`)}
        {card('Última visita', d.ultima_visita || '—')}
        {mostrarValores && card('Ticket médio', moeda(d.ticket_medio || 0))}
        {mostrarValores && card('Faturamento acumulado', moeda(d.faturamento_acumulado || 0))}
      </div>

      {/* O que faltava nos relatórios: QUEM atendeu esta cliente. */}
      {d.profissionais_atendidos.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 11, padding: '10px 13px', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#5b4fcf', textTransform: 'uppercase', letterSpacing: '.4px' }}>✂️ Já atendida por</span>
          <div style={{ fontSize: 12.5, color: '#1a1a1a', marginTop: 4, lineHeight: 1.6 }}>
            {d.profissionais_atendidos.join(', ')}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Serviços completos, um por linha e com a contagem — no relatório eles
            vinham cortados em três nomes emendados numa linha só. */}
        <div style={{ flex: '1 1 260px', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 11, padding: '10px 13px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 7 }}>
            Histórico de serviços ({d.servicos.length})
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {d.servicos.map(s => (
              <div key={s.nome} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '5px 0', borderBottom: '1px solid #f4f2ee', fontSize: 12 }}>
                <span style={{ color: '#1a1a1a' }}>{s.nome}</span>
                <span style={{ color: '#5b4fcf', fontWeight: 800, whiteSpace: 'nowrap' }}>{s.vezes}x</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: '1 1 220px', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 11, padding: '10px 13px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 7 }}>
            Última visita {d.ultima_visita ? `— ${d.ultima_visita}` : ''}
          </div>
          {d.servicos_ultima.length === 0
            ? <div style={{ fontSize: 12, color: '#9ca3af' }}>—</div>
            : d.servicos_ultima.map(s => (
              <div key={s} style={{ fontSize: 12, color: '#1a1a1a', padding: '4px 0' }}>• {s}</div>
            ))}
          {d.profissionais_ultima.length > 0 && (
            <div style={{ fontSize: 11, color: '#767069', marginTop: 7, borderTop: '1px solid #f4f2ee', paddingTop: 7 }}>
              Por: {d.profissionais_ultima.join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
