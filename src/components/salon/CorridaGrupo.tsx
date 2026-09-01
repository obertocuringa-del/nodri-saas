'use client'

/**
 * Corrida em grupo — o placar do conjunto.
 *
 * Ao contrário da corrida normal, aqui não há primeiro lugar: cada profissional
 * corre contra a PRÓPRIA meta (a mesma que está no perfil dela) e o que importa
 * é o grupo fechar junto.
 *
 * Por que o eixo é em % e não em R$: cada uma tem uma meta diferente. Numa
 * escala de dinheiro, quem tem meta de 20 mil ocupa a tela inteira e quem tem
 * 3 mil vira um risco no chão — e as duas podem estar exatamente no mesmo ponto
 * da própria corrida. Em % da própria meta, a linha dos 100% é uma só e
 * atravessa todas as colunas, que é o que se quer comparar. O valor em R$
 * continua escrito em cada coluna, porque é o número que o dono precisa ler.
 */

import { useMemo, useState } from 'react'
import { Gift, X, Undo2, Target } from 'lucide-react'
import type { CorridaInterna, LinhaRanking, DoacaoMeta } from '@/lib/corridasInternas'
import { resumoGrupo, sobraDisponivel } from '@/lib/corridasInternas'

const COR_ABAIXO = '#94a3b8'   // ainda não bateu
const COR_BATEU = '#16a34a'    // bateu a própria meta
const COR_SOBRA = '#86efac'    // o que passou dos 100%
const COR_RECEBIDO = '#7c3aed' // veio de uma colega
const ALTURA = 210

const moeda = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function CorridaGrupo({ c, ranking, podeDoar, onDoacoes }: {
  c: CorridaInterna
  ranking: LinhaRanking[]
  podeDoar?: boolean
  onDoacoes?: (doacoes: DoacaoMeta[]) => void
}) {
  const [doando, setDoando] = useState<string | null>(null)

  const resumo = useMemo(() => resumoGrupo(ranking), [ranking])

  // Teto do eixo. Nunca menos que 120% para sobrar céu acima da linha da meta —
  // sem isso, quem bate exatamente 100% encosta no topo e parece estourado.
  const teto = useMemo(() => {
    const maior = ranking.reduce((m, l) => Math.max(m, Number(l.pctMeta || 0)), 0)
    return Math.max(120, Math.ceil((maior + 10) / 10) * 10)
  }, [ranking])

  const y = (pct: number) => Math.max(0, Math.min(pct, teto)) / teto * ALTURA

  function registrar(de: string, para: string, valor: number) {
    if (!onDoacoes) return
    onDoacoes([...(c.doacoes || []), { de, para, valor, em: Date.now() }])
    setDoando(null)
  }
  function desfazer(i: number) {
    if (!onDoacoes) return
    onDoacoes((c.doacoes || []).filter((_, idx) => idx !== i))
  }

  if (!ranking.length) {
    return (
      <div style={{ fontSize: 12.5, color: '#9ca3af', textAlign: 'center', padding: '18px 8px', background: '#faf9f7', borderRadius: 8 }}>
        Nenhuma participante com meta definida no período. Defina a meta delas no perfil,
        ou rode a redistribuição em Relatórios.
      </div>
    )
  }

  const nomePor = (id: string) => ranking.find(l => l.profId === id)?.nome || 'Profissional'
  const emFoco = doando ? ranking.find(l => l.profId === doando) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── O placar do conjunto ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: '#faf9f7', border: '1px solid #e8e6e0', borderRadius: 12, padding: 14 }}>
        <Rosca pct={resumo.pct} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#6b6860', letterSpacing: 0.4, textTransform: 'uppercase' }}>Meta do grupo</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>
            {moeda(resumo.produzido)}
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6b6860' }}> de {moeda(resumo.metaTotal)}</span>
          </div>
          <div style={{ fontSize: 12.5, color: '#57534e', marginTop: 2 }}>
            {resumo.bateram} de {resumo.participantes} bateram a própria meta
            {resumo.metaTotal > resumo.produzido && <> · faltam {moeda(resumo.metaTotal - resumo.produzido)}</>}
          </div>
        </div>
      </div>

      {/* ── O gráfico ────────────────────────────────────────────────────── */}
      {/*
        Duas faixas empilhadas, e não uma coluna só por pessoa: a linha dos 100%
        é `position:absolute; bottom:...` e mede a partir do rodapé do pai. Com
        os nomes dentro do mesmo container, esse rodapé caía uns 50px abaixo da
        base das barras e a linha da meta aparecia atravessando o meio delas.
        A área do gráfico agora tem altura exata (ALTURA); os nomes vão fora.
      */}
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ minWidth: Math.max(ranking.length * 74 + 52, 300), paddingTop: 36 }}>
          <div style={{ display: 'flex', gap: 10 }}>

            {/* escala */}
            <div style={{ position: 'relative', width: 42, height: ALTURA, flexShrink: 0 }}>
              {[0, 50, 100].concat(teto > 130 ? [teto] : []).map(marca => (
                <div key={marca} style={{ position: 'absolute', bottom: y(marca) - 7, right: 4, fontSize: 10, color: marca === 100 ? '#16a34a' : '#9ca3af', fontWeight: marca === 100 ? 800 : 600 }}>
                  {marca}%
                </div>
              ))}
            </div>

            {/* área das colunas — altura exata, para a linha da meta cair certa */}
            <div style={{ position: 'relative', flex: 1, height: ALTURA, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: y(100), borderTop: '2px dashed #16a34a', opacity: 0.55, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderTop: '1px solid #d6d3cd', pointerEvents: 'none' }} />

              {ranking.map(l => {
                const meta = Number(l.metaPessoal || 0)
                const pctPropria = meta > 0 ? (l.valor / meta) * 100 : 0
                const pctRecebido = meta > 0 ? (Number(l.recebido || 0) / meta) * 100 : 0
                const pctDoado = meta > 0 ? (Number(l.doado || 0) / meta) * 100 : 0
                const sobra = sobraDisponivel(l)
                const clicavel = !!podeDoar && sobra > 0
                const dentro = Math.min(pctPropria, 100)
                const acima = Math.max(pctPropria - 100, 0)

                return (
                  <div key={l.profId}
                    onClick={clicavel ? () => setDoando(doando === l.profId ? null : l.profId) : undefined}
                    title={clicavel ? `Entregar ${moeda(sobra)} para uma colega` : undefined}
                    style={{
                      position: 'relative', flex: '1 0 64px', minWidth: 64, height: '100%',
                      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                      cursor: clicavel ? 'pointer' : 'default',
                    }}>
                    {/* rótulos acima da coluna */}
                    <div style={{ position: 'absolute', left: -6, right: -6, bottom: y(pctPropria + pctRecebido) + 4, textAlign: 'center', pointerEvents: 'none' }}>
                      {Number(l.excedente || 0) > 0 && (
                        <div style={{ fontSize: 10.5, fontWeight: 900, color: '#15803d', whiteSpace: 'nowrap' }}>+{moeda(l.excedente || 0)}</div>
                      )}
                      {Number(l.recebido || 0) > 0 && (
                        <div style={{ fontSize: 10, fontWeight: 800, color: COR_RECEBIDO, whiteSpace: 'nowrap' }}>+{moeda(l.recebido || 0)}</div>
                      )}
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: '#57534e', fontVariantNumeric: 'tabular-nums' }}>{l.pctMeta ?? 0}%</div>
                    </div>

                    {pctRecebido > 0 && (
                      <div style={{ height: y(pctRecebido), background: COR_RECEBIDO, opacity: 0.85, borderRadius: '5px 5px 0 0' }} />
                    )}
                    {acima > 0 && (
                      <div style={{
                        height: y(acima), background: COR_SOBRA,
                        borderRadius: pctRecebido > 0 ? 0 : '5px 5px 0 0',
                        backgroundImage: pctDoado > 0
                          ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,.85) 4px, rgba(255,255,255,.85) 8px)'
                          : undefined,
                      }} />
                    )}
                    {/* Piso de 3px: sem ele quem produziu zero fica sem coluna
                        nenhuma, e a pessoa some do gráfico justo quando o grupo
                        mais precisa vê-la. */}
                    <div style={{
                      height: Math.max(y(dentro), 3),
                      background: l.bateuMeta ? COR_BATEU : COR_ABAIXO,
                      borderRadius: (acima > 0 || pctRecebido > 0) ? '0 0 3px 3px' : '5px 5px 3px 3px',
                    }} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* nomes — fora da área do gráfico, com as mesmas larguras de coluna */}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <div style={{ width: 42, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', gap: 10 }}>
              {ranking.map(l => {
                const sobra = sobraDisponivel(l)
                return (
                  <div key={l.profId} style={{ flex: '1 0 64px', minWidth: 64, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.nome}>{l.nome}</div>
                    <div style={{ fontSize: 10, color: '#6b6860', fontVariantNumeric: 'tabular-nums' }}>{moeda(l.valor)}</div>
                    <div style={{ fontSize: 9.5, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>meta {moeda(Number(l.metaPessoal || 0))}</div>
                    {!!podeDoar && sobra > 0 && (
                      <div style={{ fontSize: 9.5, fontWeight: 800, color: '#b45309', marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Gift size={10} /> {moeda(sobra)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* legenda */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: '#6b6860' }}>
        <Chave cor={COR_ABAIXO} texto="Ainda não bateu" />
        <Chave cor={COR_BATEU} texto="Bateu a própria meta" />
        <Chave cor={COR_SOBRA} texto="Passou dos 100%" />
        <Chave cor={COR_RECEBIDO} texto="Recebido de uma colega" />
      </div>

      {/* ── Entregar a sobra ─────────────────────────────────────────────── */}
      {emFoco && (
        <PainelDoacao
          origem={emFoco}
          candidatas={ranking.filter(l => l.profId !== emFoco.profId && !l.bateuMeta)}
          onFechar={() => setDoando(null)}
          onEnviar={(para, valor) => registrar(emFoco.profId, para, valor)}
        />
      )}

      {/* ── O que já foi entregue ────────────────────────────────────────── */}
      {(c.doacoes || []).length > 0 && (
        <div style={{ background: '#faf9f7', border: '1px solid #e8e6e0', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#6b6860', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>Entregas do grupo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(c.doacoes || []).map((d, i) => (
              <div key={`${d.de}-${d.para}-${d.em}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#1a1a1a' }}>
                <Gift size={13} style={{ color: COR_RECEBIDO, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{nomePor(d.de)}</strong> entregou <strong style={{ color: COR_RECEBIDO }}>{moeda(d.valor)}</strong> para <strong>{nomePor(d.para)}</strong>
                </span>
                {podeDoar && (
                  <button onClick={() => desfazer(i)} title="Desfazer esta entrega"
                    style={{ border: '1px solid #e8e6e0', background: '#fff', borderRadius: 7, padding: '3px 6px', cursor: 'pointer', color: '#6b6860', display: 'flex', alignItems: 'center' }}>
                    <Undo2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 8 }}>
            A entrega vale só aqui no placar: não altera faturamento, comissão nem pagamento de ninguém.
          </div>
        </div>
      )}
    </div>
  )
}

// ── Rosca do grupo ──────────────────────────────────────────────────────────
function Rosca({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(pct, 100))
  const r = 34, circ = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
      <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`${Math.round(pct)}% da meta do grupo`}>
        <circle cx="44" cy="44" r={r} fill="none" stroke="#e8e6e0" strokeWidth="11" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={p >= 100 ? COR_BATEU : '#22c55e'} strokeWidth="11"
          strokeDasharray={`${circ * p / 100} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 44 44)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 17, fontWeight: 900, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>{Math.round(pct)}%</span>
      </div>
    </div>
  )
}

function Chave({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 11, height: 11, borderRadius: 3, background: cor, flexShrink: 0 }} />
      {texto}
    </span>
  )
}

// ── Painel de entrega ───────────────────────────────────────────────────────
function PainelDoacao({ origem, candidatas, onFechar, onEnviar }: {
  origem: LinhaRanking
  candidatas: LinhaRanking[]
  onFechar: () => void
  onEnviar: (para: string, valor: number) => void
}) {
  const sobra = sobraDisponivel(origem)
  const [para, setPara] = useState<string>(candidatas[0]?.profId || '')
  const alvo = candidatas.find(l => l.profId === para)
  // Sugere exatamente o que falta para a colega fechar — o número que resolve.
  const falta = alvo ? Math.max(Number(alvo.metaPessoal || 0) - alvo.valor - Number(alvo.recebido || 0), 0) : 0
  const [valor, setValor] = useState<string>('')

  const sugerido = Math.min(sobra, falta)
  const v = valor.trim() === '' ? sugerido : Number(valor.replace(',', '.')) || 0
  const valido = v > 0 && v <= sobra + 0.005

  return (
    <div style={{ border: '1.5px solid #7c3aed', background: '#faf5ff', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Target size={15} style={{ color: COR_RECEBIDO }} />
        <strong style={{ fontSize: 13.5, color: '#1a1a1a', flex: 1 }}>
          {origem.nome} tem {moeda(sobra)} acima da meta
        </strong>
        <button onClick={onFechar} title="Fechar" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b6860', display: 'flex' }}><X size={16} /></button>
      </div>

      {candidatas.length === 0 ? (
        <div style={{ fontSize: 12.5, color: '#57534e' }}>Todas as colegas já bateram a meta — não há para quem entregar.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ flex: '1 1 180px', minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>Entregar para</span>
              <select value={para} onChange={e => { setPara(e.target.value); setValor('') }}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e8e6e0', borderRadius: 8, fontSize: 13, background: '#fff' }}>
                {candidatas.map(l => (
                  <option key={l.profId} value={l.profId}>
                    {l.nome} — faltam {moeda(Math.max(Number(l.metaPessoal || 0) - l.valor - Number(l.recebido || 0), 0))}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ flex: '0 1 150px' }}>
              <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>Valor</span>
              <input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal"
                placeholder={sugerido > 0 ? sugerido.toFixed(2).replace('.', ',') : '0,00'}
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e8e6e0', borderRadius: 8, fontSize: 13 }} />
            </label>
            <button onClick={() => valido && onEnviar(para, v)} disabled={!valido}
              style={{
                padding: '9px 16px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800,
                background: valido ? COR_RECEBIDO : '#d6d3cd', color: '#fff',
                cursor: valido ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <Gift size={14} /> Entregar
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#6b6860' }}>
            Sugerido: {moeda(sugerido)} — exatamente o que falta para {alvo?.nome} fechar.
            {v > sobra && <span style={{ color: '#dc2626', fontWeight: 700 }}> Acima da sobra disponível.</span>}
          </div>
        </>
      )}
    </div>
  )
}
