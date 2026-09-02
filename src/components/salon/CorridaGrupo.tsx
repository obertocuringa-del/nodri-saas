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
import { Gift, X, Undo2, Target, FlaskConical, RotateCcw } from 'lucide-react'
import type { CorridaInterna, LinhaRanking, DoacaoMeta, ResumoGrupo } from '@/lib/corridasInternas'
import { resumoGrupo, sobraDisponivel } from '@/lib/corridasInternas'

const COR_ABAIXO = '#94a3b8'   // ainda não bateu
const COR_BATEU = '#16a34a'    // bateu a própria meta
const COR_SOBRA = '#86efac'    // o que passou dos 100%
const COR_RECEBIDO = '#7c3aed' // veio de uma colega
const ALTURA = 210

const moeda = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Por que este bloco existe, e por que o layout NAO fica em style inline:
//
// O globals.css tem um pacote de regras de celular que casam pelo TEXTO do
// atributo style -- [style*="display:flex"] ganha flex-wrap:wrap !important,
// [style*="font-size: 10px"] vira 11px, e por aí. São regras boas para as telas
// do sistema, que sao formularios e cards. Aplicadas a um grafico elas
// desmontam a peça: as colunas embrulham, os rotulos incham e o eixo perde o
// alinhamento -- foi exatamente o que apareceu no portal no celular.
//
// Nao dá para brigar com !important (mesma especificidade, ganha quem vier
// depois, e a ordem entre globals.css e este bloco não é garantida). Entao a
// saida e nao dar o que casar: layout e tamanho de fonte moram aqui, em classe.
const CSS_GRUPO = [
  '.cg-plot { display:flex; align-items:flex-end; position:relative; flex:1 }',
  '.cg-nomes { display:flex; flex:1 }',
  '.cg-col { flex:1 0 auto; display:flex; flex-direction:column; justify-content:flex-end; position:relative; height:100% }',
  '.cg-rot { flex:1 0 auto; text-align:center; min-width:0 }',
  '.cg-nome { font-size:11px; font-weight:800; color:#1a1a1a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }',
  '.cg-sub { font-size:10px; color:#6b6860; white-space:nowrap; font-variant-numeric:tabular-nums }',
  '.cg-meta { font-size:9.5px; color:#9ca3af; white-space:nowrap; font-variant-numeric:tabular-nums }',
  '.cg-eixo { font-size:10px; font-weight:600 }',
  '.cg-topo { font-size:10.5px; font-weight:800; color:#57534e; white-space:nowrap; font-variant-numeric:tabular-nums }',
  '@media (max-width:640px){',
  // No celular o nome precisa de mais largura que os 64px do desktop: com menos
  // que isso "VALDIRENE" e "120% da meta" quebram em tres linhas e a coluna
  // vira uma tira. Prefiro rolar de lado a espremer.
  '  .cg-col, .cg-rot { flex-basis:78px !important; min-width:78px !important }',
  '  .cg-nome { font-size:10.5px }',
  '  .cg-sub { font-size:9.5px }',
  '}',
].join(' ')

export default function CorridaGrupo({ c, ranking, resumo: resumoProp, podeDoar, onDoacoes, onSimulacoes }: {
  c: CorridaInterna
  ranking: LinhaRanking[]
  /** Vem pronto do servidor. No portal chega sem os R$ — só a % e o placar. */
  resumo?: ResumoGrupo
  podeDoar?: boolean
  onDoacoes?: (doacoes: DoacaoMeta[]) => void
  /** Só o salão simula. Ausente = sem botão de teste. */
  onSimulacoes?: (simulacoes: Record<string, number>) => void
}) {
  const [doando, setDoando] = useState<string | null>(null)
  const [simulando, setSimulando] = useState(false)
  const simulacoes = c.simulacoes || {}
  const qtdSimulada = Object.keys(simulacoes).length

  // Recalcular aqui só serve para a tela do salão, que tem os valores todos. No
  // portal os R$ dos colegas nem chegam, e a soma daria um número errado.
  const resumo = useMemo(() => resumoProp || resumoGrupo(ranking), [resumoProp, ranking])
  const temValorDoGrupo = typeof resumo.metaTotal === 'number' && typeof resumo.produzido === 'number'

  // Teto do eixo. Nunca menos que 120% para sobrar céu acima da linha da meta —
  // sem isso, quem bate exatamente 100% encosta no topo e parece estourado.
  const teto = useMemo(() => {
    const maior = ranking.reduce((m, l) => Math.max(m, Number(l.pctMeta || 0)), 0)
    return Math.max(120, Math.ceil((maior + 10) / 10) * 10)
  }, [ranking])

  const y = (pct: number) => Math.max(0, Math.min(pct, teto)) / teto * ALTURA

  function registrar(de: string, para: string, valor: number) {
    if (!onDoacoes) return
    // Se a sobra de quem doa é simulada, a entrega também é teste.
    const teste = typeof simulacoes[de] === 'number'
    onDoacoes([...(c.doacoes || []), { de, para, valor, em: Date.now(), ...(teste ? { teste: true } : {}) }])
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
      <style dangerouslySetInnerHTML={{ __html: CSS_GRUPO }} />

      {/* ── O placar do conjunto ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: '#faf9f7', border: '1px solid #e8e6e0', borderRadius: 12, padding: 14 }}>
        <Rosca pct={resumo.pct} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#6b6860', letterSpacing: 0.4, textTransform: 'uppercase' }}>Meta do grupo</div>
          {temValorDoGrupo ? (
            <div style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>
              {moeda(resumo.produzido as number)}
              <span style={{ fontSize: 13, fontWeight: 700, color: '#6b6860' }}> de {moeda(resumo.metaTotal as number)}</span>
            </div>
          ) : (
            <div style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(resumo.pct)}%<span style={{ fontSize: 13, fontWeight: 700, color: '#6b6860' }}> da meta do grupo</span>
            </div>
          )}
          <div style={{ fontSize: 12.5, color: '#57534e', marginTop: 2 }}>
            {resumo.bateram} de {resumo.participantes} bateram a própria meta
            {temValorDoGrupo && (resumo.metaTotal as number) > (resumo.produzido as number) &&
              <> · faltam {moeda((resumo.metaTotal as number) - (resumo.produzido as number))}</>}
          </div>
        </div>
      </div>

      {/* ── Modo teste ───────────────────────────────────────────────────── */}
      {qtdSimulada > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 10, padding: '9px 12px' }}>
          <FlaskConical size={16} style={{ color: '#b45309', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: '#92400e' }}>
            <strong>Modo teste:</strong> {qtdSimulada} faturamento{qtdSimulada > 1 ? 's' : ''} simulado{qtdSimulada > 1 ? 's' : ''}.
            Vale só nesta tela — no portal das profissionais o número continua o real.
          </div>
          {onSimulacoes && (
            <button onClick={() => { onDoacoes?.((c.doacoes || []).filter(d => !d.teste)); onSimulacoes({}) }}
              title="Desfazer as simulações e as entregas que saíram delas"
              style={{ border: '1.5px solid #f59e0b', background: '#fff', color: '#b45309', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <RotateCcw size={13} /> Desfazer tudo
            </button>
          )}
        </div>
      )}

      {/* ── O gráfico ────────────────────────────────────────────────────── */}
      {/*
        Duas faixas empilhadas, e não uma coluna só por pessoa: a linha dos 100%
        é `position:absolute; bottom:...` e mede a partir do rodapé do pai. Com
        os nomes dentro do mesmo container, esse rodapé caía uns 50px abaixo da
        base das barras e a linha da meta aparecia atravessando o meio delas.
        A área do gráfico agora tem altura exata (ALTURA); os nomes vão fora.
      */}
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ minWidth: Math.max(ranking.length * 88 + 52, 300), paddingTop: 36 }}>
          <div style={{ display: 'flex', gap: 10 }}>

            {/* escala */}
            <div style={{ position: 'relative', width: 42, height: ALTURA, flexShrink: 0 }}>
              {[0, 50, 100].concat(teto > 130 ? [teto] : []).map(marca => (
                <div key={marca} className="cg-eixo" style={{ position: 'absolute', bottom: y(marca) - 7, right: 4, color: marca === 100 ? '#16a34a' : '#9ca3af', fontWeight: marca === 100 ? 800 : 600 }}>
                  {marca}%
                </div>
              ))}
            </div>

            {/* área das colunas — altura exata, para a linha da meta cair certa */}
            <div className="cg-plot" style={{ height: ALTURA, gap: 10 }}>
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: y(100), borderTop: '2px dashed #16a34a', opacity: 0.55, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderTop: '1px solid #d6d3cd', pointerEvents: 'none' }} />

              {ranking.map(l => {
                const pctPropria = Number(l.pctProprio || 0)
                const pctRecebido = Number(l.pctRecebidoMeta || 0)
                const pctDoado = Number(l.pctDoadoMeta || 0)
                const sobra = sobraDisponivel(l)
                const clicavel = !!podeDoar && sobra > 0
                const dentro = Math.min(pctPropria, 100)
                const acima = Math.max(pctPropria - 100, 0)

                return (
                  <div key={l.profId}
                    onClick={clicavel ? () => setDoando(doando === l.profId ? null : l.profId) : undefined}
                    title={clicavel ? `Entregar ${moeda(sobra)} para uma colega` : undefined}
                    className="cg-col"
                    style={{ cursor: clicavel ? 'pointer' : 'default' }}>
                    {/* rótulos acima da coluna */}
                    <div style={{ position: 'absolute', left: -6, right: -6, bottom: y(pctPropria + pctRecebido) + 4, textAlign: 'center', pointerEvents: 'none' }}>
                      {!l.valorOculto && Number(l.excedente || 0) > 0 && (
                        <div style={{ fontSize: 10.5, fontWeight: 900, color: '#15803d', whiteSpace: 'nowrap' }}>+{moeda(l.excedente || 0)}</div>
                      )}
                      {!l.valorOculto && Number(l.recebido || 0) > 0 && (
                        <div style={{ fontSize: 10, fontWeight: 800, color: COR_RECEBIDO, whiteSpace: 'nowrap' }}>+{moeda(l.recebido || 0)}</div>
                      )}
                      <div className="cg-topo">{l.pctMeta ?? 0}%</div>
                    </div>

                    {/* Recebido vai HACHURADO, e nao so noutra cor.
                        Quando a colega produziu pouco e recebeu muito, a parte
                        propria dela vira uma tira de 3px no pe da coluna e o
                        bloco de cor cheia passa a ler como "ela fez isso tudo".
                        A hachura diz, sem legenda, que aquela altura foi dada —
                        a mesma marca que a coluna de quem doou ja usava.
                        A borda branca embaixo separa o que e dela do que veio. */}
                    {pctRecebido > 0 && (
                      <div style={{
                        height: y(pctRecebido), background: COR_RECEBIDO, opacity: 0.9,
                        borderRadius: '5px 5px 0 0',
                        borderBottom: '2px solid #fff',
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,.55) 4px, rgba(255,255,255,.55) 8px)',
                      }} />
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
                      // Contorno âmbar tracejado: a coluna de teste não pode
                      // passar por real nem de relance.
                      outline: l.simulado ? '2px dashed #f59e0b' : undefined,
                      outlineOffset: l.simulado ? -2 : undefined,
                    }} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* nomes — fora da área do gráfico, com as mesmas larguras de coluna */}
          <div className="cg-plot" style={{ alignItems: 'flex-start', gap: 10, marginTop: 6 }}>
            <div style={{ width: 42, flexShrink: 0 }} />
            <div className="cg-nomes" style={{ gap: 10 }}>
              {ranking.map(l => {
                const sobra = sobraDisponivel(l)
                return (
                  <div key={l.profId} className="cg-rot">
                    <div className="cg-nome" title={l.nome}>{l.nome}</div>
                    {l.valorOculto ? (
                      <div className="cg-meta">{l.pctMeta ?? 0}% da meta</div>
                    ) : (
                      <>
                        <div className="cg-sub">{moeda(l.valor)}</div>
                        <div className="cg-meta">meta {moeda(Number(l.metaPessoal || 0))}</div>
                      </>
                    )}
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

      {onSimulacoes && (
        simulando ? (
          <PainelSimulacao
            linhas={ranking} simulacoes={simulacoes}
            onFechar={() => setSimulando(false)}
            onAplicar={(profId, valor) => onSimulacoes({ ...simulacoes, [profId]: valor })}
            onRemover={(profId) => {
              const copia = { ...simulacoes }
              delete copia[profId]
              onSimulacoes(copia)
            }}
          />
        ) : (
          <button onClick={() => setSimulando(true)}
            style={{ alignSelf: 'flex-start', border: '1.5px dashed #d6d3cd', background: '#fff', color: '#6b6860', borderRadius: 9, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FlaskConical size={13} /> Simular faturamento (teste)
          </button>
        )
      )}

      {/* legenda */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: '#6b6860' }}>
        <Chave cor={COR_ABAIXO} texto="Ainda não bateu" />
        <Chave cor={COR_BATEU} texto="Bateu a própria meta" />
        <Chave cor={COR_SOBRA} texto="Passou dos 100%" />
        <Chave cor={COR_RECEBIDO} hachura texto="Recebido de uma colega" />
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
                <Gift size={13} style={{ color: d.teste ? '#b45309' : COR_RECEBIDO, flexShrink: 0 }} />
                {d.teste && <span style={{ fontSize: 9.5, fontWeight: 900, color: '#b45309', background: '#fef3c7', borderRadius: 20, padding: '1px 7px', flexShrink: 0 }}>TESTE</span>}
                <span style={{ flex: 1, minWidth: 0 }}>
                  {/* Sem o valor quando quem olha é a profissional: o servidor
                      manda a doação zerada, e escrever "R$ 0,00" seria mentira. */}
                  <strong>{nomePor(d.de)}</strong> entregou{temValorDoGrupo && <> <strong style={{ color: COR_RECEBIDO }}>{moeda(d.valor)}</strong></>} para <strong>{nomePor(d.para)}</strong>
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

function Chave({ cor, texto, hachura }: { cor: string; texto: string; hachura?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 11, height: 11, borderRadius: 3, background: cor, flexShrink: 0,
        backgroundImage: hachura
          ? 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,.6) 2px, rgba(255,255,255,.6) 4px)'
          : undefined,
      }} />
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

// ── Simulação de faturamento (só o salão) ───────────────────────────────────
//
// Serve para o dono ver o gráfico responder antes de ter dado real do mês: pôr
// alguém acima da meta, conferir se a coluna sobe e se dá para entregar a sobra.
// O valor fica gravado na corrida como qualquer outro campo, e sai daqui pelo
// mesmo botão que o pôs.
function PainelSimulacao({ linhas, simulacoes, onFechar, onAplicar, onRemover }: {
  linhas: LinhaRanking[]
  simulacoes: Record<string, number>
  onFechar: () => void
  onAplicar: (profId: string, valor: number) => void
  onRemover: (profId: string) => void
}) {
  const [prof, setProf] = useState(linhas[0]?.profId || '')
  const [valor, setValor] = useState('')
  const alvo = linhas.find(l => l.profId === prof)
  const meta = Number(alvo?.metaPessoal || 0)
  const v = Number(valor.replace(',', '.')) || 0
  const nomePor = (id: string) => linhas.find(l => l.profId === id)?.nome || id

  return (
    <div style={{ border: '1.5px solid #f59e0b', background: '#fffbeb', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <FlaskConical size={15} style={{ color: '#b45309' }} />
        <strong style={{ fontSize: 13.5, color: '#1a1a1a', flex: 1 }}>Simular faturamento</strong>
        <button onClick={onFechar} title="Fechar" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b6860', display: 'flex' }}><X size={16} /></button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ flex: '1 1 170px', minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>Profissional</span>
          <select value={prof} onChange={e => { setProf(e.target.value); setValor('') }}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #fde68a', borderRadius: 8, fontSize: 13, background: '#fff' }}>
            {linhas.map(l => <option key={l.profId} value={l.profId}>{l.nome} — meta {moeda(Number(l.metaPessoal || 0))}</option>)}
          </select>
        </label>
        <label style={{ flex: '0 1 150px' }}>
          <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>Faturou</span>
          <input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal"
            placeholder={meta > 0 ? (meta * 1.2).toFixed(2).replace('.', ',') : '0,00'}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #fde68a', borderRadius: 8, fontSize: 13 }} />
        </label>
        <button onClick={() => prof && v > 0 && onAplicar(prof, v)} disabled={!prof || v <= 0}
          style={{
            padding: '9px 16px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800,
            background: (prof && v > 0) ? '#b45309' : '#d6d3cd', color: '#fff',
            cursor: (prof && v > 0) ? 'pointer' : 'not-allowed',
          }}>Aplicar</button>
      </div>
      <div style={{ fontSize: 11, color: '#92400e' }}>
        Sugestão: {meta > 0 ? moeda(meta * 1.2) : '—'} deixa {alvo?.nome} em 120%, com sobra para entregar.
      </div>

      {Object.keys(simulacoes).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, borderTop: '1px solid #fde68a', paddingTop: 9 }}>
          {Object.entries(simulacoes).map(([id, val]) => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#1a1a1a' }}>
              <span style={{ flex: 1, minWidth: 0 }}><strong>{nomePor(id)}</strong> simulado em {moeda(val)}</span>
              <button onClick={() => onRemover(id)} title="Desfazer esta simulação"
                style={{ border: '1px solid #fde68a', background: '#fff', borderRadius: 7, padding: '3px 6px', cursor: 'pointer', color: '#92400e', display: 'flex' }}>
                <Undo2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
