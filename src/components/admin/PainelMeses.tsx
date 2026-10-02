'use client'

import { useState } from 'react'

// ── Meses do relatório ──────────────────────────────────────────────────────
//
// Pedido do dono (02/10/2026). O robô só coleta o mês de HOJE: se a coleta do
// último dia do mês falhar e ninguém perceber antes da meia-noite, aquele dia
// fica pela metade para sempre -- a partir do dia 01 o robô já só enxerga o
// mês novo. Aconteceu em 31/08/2026 e de novo em 30/09/2026, quando a última
// coleta de setembro saiu às 20:00 e o salão fechou às 22:00.
//
// Aqui ele vê quais meses estão incompletos, aprova a coleta que a conferência
// segurou, e manda recoletar um mês escolhido -- agora ou num horário.

const CORES_SIT: Record<string, { fundo: string; borda: string; texto: string; rotulo: string }> = {
  ok:         { fundo: '#eef6f0', borda: '#cfe4d6', texto: '#2f6b4f', rotulo: 'completo' },
  furado:     { fundo: '#fdeeec', borda: '#f3cfc9', texto: '#b4322a', rotulo: 'incompleto' },
  sem_coleta: { fundo: '#fdeeec', borda: '#f3cfc9', texto: '#b4322a', rotulo: 'sem dado' },
  // Mes que existe e esta cheio, mas sem registro de coleta (importado a mao
  // ou antes do robo do servidor): nao da para conferir, e isso nao e defeito.
  sem_registro: { fundo: '#f3f1ee', borda: '#e0ddd8', texto: '#6b6860', rotulo: 'sem registro' },
  corrente:   { fundo: '#f3f1ee', borda: '#e0ddd8', texto: '#6b6860', rotulo: 'mês em curso' },
}

const chaveMes = (m: { mes: number; ano: number }) => `${String(m.mes).padStart(2, '0')}/${m.ano}`

export default function PainelMeses({ dados, recarregar, avisar, errar }: {
  dados: any
  recarregar: () => void
  avisar: (s: string) => void
  errar: (s: string) => void
}) {
  const [escolha, setEscolha] = useState<Record<string, string>>({})
  const [hora, setHora] = useState<Record<string, string>>({})
  const [ocupado, setOcupado] = useState('')

  if (!dados) return <p style={{ fontSize: 12.5, color: '#8f877f', margin: 0 }}>Lendo os meses...</p>
  const saloes: any[] = dados.saloes || []
  if (!saloes.length) return <p style={{ fontSize: 12.5, color: '#8f877f', margin: 0 }}>Nenhum salão com coleta configurada.</p>

  async function pedir(salaoId: string, nome: string, mes: string, rotulo: string, as: string) {
    const quando = as ? `às ${as}` : 'agora'
    const texto = `Recoletar ${rotulo} de ${nome}, ${quando}?`
      + '\n\nA coleta leva uns 25 minutos e o robô faz um salão por vez: pedindo mais de um, eles entram na fila.'
      + '\n\nSe o resultado vier pior do que o que já existe, o sistema NÃO aplica — fica esperando a sua aprovação.'
    if (!window.confirm(texto)) return
    setOcupado(salaoId)
    try {
      const r = await fetch('/api/admin/coleta-mes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salao_id: salaoId, mes, as: as || undefined }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { errar(j.error || 'Não consegui pedir a coleta.'); return }
      avisar(`Coleta de ${rotulo} pedida para ${nome}${as ? `, às ${as}` : ''}.`)
      errar('')
      recarregar()
    } catch {
      errar('Sem conexão com o NODRI.')
    } finally { setOcupado('') }
  }

  async function aprovar(id: string, rotulo: string, nome: string) {
    const texto = `Aprovar a coleta de ${rotulo} de ${nome}?`
      + '\n\nO sistema segurou esta coleta porque ela veio pior do que o que já está salvo.'
      + ' Aprovando, o mês inteiro é substituído pelo que ela trouxe.'
    if (!window.confirm(texto)) return
    setOcupado(id)
    try {
      const r = await fetch('/api/admin/robo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'aprovar', id }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { errar(j.error || 'Não consegui aprovar.'); return }
      avisar('Coleta aprovada e aplicada.')
      errar('')
      recarregar()
    } catch {
      errar('Sem conexão com o NODRI.')
    } finally { setOcupado('') }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p style={{ fontSize: 12, color: '#6b6860', margin: 0, lineHeight: 1.45 }}>
        O robô coleta sempre o <b>mês de hoje</b>. Quando a coleta do último dia do mês não vai até o fim do
        expediente, o que fechou depois dela não entra — e a partir do dia 1º não entra mais sozinho.
        A conta abaixo é a hora da <b>última coleta</b> de cada mês comparada ao último horário do robô.
      </p>

      {saloes.map(s => {
        const problemas = (s.meses || []).filter((m: any) => m.situacao === 'furado' || m.situacao === 'sem_coleta')
        const padrao = problemas[0] ? chaveMes(problemas[0]) : ''
        const mesEscolhido = escolha[s.salao_id] ?? padrao
        return (
          <div key={s.salao_id} style={{ border: '1px solid #e8e6e0', borderRadius: 10, padding: 12, background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>{s.nome}</strong>
              {s.ultimo_horario && <span style={{ fontSize: 11.5, color: '#8f877f' }}>robô vai até as {s.ultimo_horario}</span>}
              {s.pedido && (
                <span style={{ fontSize: 11.5, fontWeight: 800, color: '#5b4fcf' }}>
                  na fila: {s.pedido}{s.pedido_as ? ` (às ${s.pedido_as})` : ''}
                </span>
              )}
            </div>

            {(s.aprovar || []).map((c: any) => (
              <div key={c.id} style={{ background: '#fdf5e9', border: '1px solid #f0dfc0', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#8a6a24', marginBottom: 3 }}>
                  {c.rotulo}: coleta de {c.quando} esperando a sua decisão
                </div>
                <div style={{ fontSize: 12, color: '#4a4540', marginBottom: 6, lineHeight: 1.4 }}>
                  {c.motivo || 'A conferência não aprovou automaticamente.'}
                  {c.antes != null && <> Trouxe <b>{c.linhas}</b> atendimentos; o sistema tem <b>{c.antes}</b>.</>}
                </div>
                <button onClick={() => aprovar(c.id, c.rotulo, s.nome)} disabled={ocupado === c.id}
                  style={{
                    fontSize: 12, fontWeight: 800, padding: '6px 11px', borderRadius: 7, border: 'none',
                    cursor: ocupado === c.id ? 'default' : 'pointer', background: '#8a6a24', color: '#fff',
                  }}>
                  {ocupado === c.id ? 'Aprovando...' : 'Aprovar e aplicar'}
                </button>
              </div>
            ))}

            <div style={{ display: 'grid', gap: 5, marginBottom: 10 }}>
              {(s.meses || []).map((m: any) => {
                const c = CORES_SIT[m.situacao] || CORES_SIT.corrente
                return (
                  <div key={`${m.ano}-${m.mes}`} style={{
                    display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap',
                    background: c.fundo, border: `1px solid ${c.borda}`, borderRadius: 7, padding: '6px 9px',
                  }}>
                    <strong style={{ fontSize: 12.5, minWidth: 108 }}>{m.rotulo}</strong>
                    <span style={{ fontSize: 11, fontWeight: 800, color: c.texto, textTransform: 'uppercase' }}>{c.rotulo}</span>
                    <span style={{ fontSize: 11.5, color: '#4a4540' }}>{m.linhas} atendimento(s)</span>
                    {m.ultima_coleta && <span style={{ fontSize: 11.5, color: '#8f877f' }}>última coleta {m.ultima_coleta}</span>}
                    {m.aviso && <span style={{ fontSize: 11.5, color: c.texto, flexBasis: '100%', lineHeight: 1.35 }}>{m.aviso}</span>}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#4a4540' }}>Recoletar</span>
              <select value={mesEscolhido}
                onChange={e => setEscolha(v => ({ ...v, [s.salao_id]: e.target.value }))}
                style={{ fontSize: 12, padding: '5px 7px', borderRadius: 7, border: '1px solid #ddd9d2' }}>
                <option value="">escolha o mês</option>
                {(s.meses || []).map((m: any) => (
                  <option key={`${m.ano}-${m.mes}`} value={chaveMes(m)}>{m.rotulo}</option>
                ))}
              </select>
              <span style={{ fontSize: 12, color: '#4a4540' }}>às</span>
              <input type="time" value={hora[s.salao_id] || ''}
                onChange={e => setHora(v => ({ ...v, [s.salao_id]: e.target.value }))}
                style={{ fontSize: 12, padding: '4px 7px', borderRadius: 7, border: '1px solid #ddd9d2' }} />
              <span style={{ fontSize: 11.5, color: '#8f877f' }}>(em branco = agora)</span>
              <button
                onClick={() => {
                  if (!mesEscolhido) { errar('Escolha o mês.'); return }
                  const rot = (s.meses || []).find((x: any) => chaveMes(x) === mesEscolhido)?.rotulo || mesEscolhido
                  pedir(s.salao_id, s.nome, mesEscolhido, rot, hora[s.salao_id] || '')
                }}
                disabled={!!s.pedido || ocupado === s.salao_id}
                style={{
                  fontSize: 12, fontWeight: 800, padding: '6px 12px', borderRadius: 7, border: 'none',
                  cursor: s.pedido || ocupado === s.salao_id ? 'default' : 'pointer',
                  background: s.pedido ? '#cfcac2' : '#5b4fcf', color: '#fff',
                }}>
                {s.pedido ? 'já pedido' : ocupado === s.salao_id ? 'pedindo...' : 'Rodar'}
              </button>
            </div>
          </div>
        )
      })}

      <p style={{ fontSize: 11.5, color: '#8f877f', margin: 0, lineHeight: 1.45 }}>
        O robô faz <b>um salão por vez</b> — pedindo vários, eles entram na fila sozinhos e rodam em sequência.
        Esta máquina tem um núcleo só: duas coletas ao mesmo tempo não ficam mais rápidas, ficam mais lentas,
        e levam o site junto. O horário serve para jogar uma recoleta pesada para a madrugada, não para evitar
        conflito — disso a fila já cuida.
      </p>
    </div>
  )
}
