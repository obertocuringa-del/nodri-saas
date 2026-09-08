'use client'

import { useEffect, useState } from 'react'
import { Activity, Loader2, RefreshCw, AlertTriangle } from 'lucide-react'

// ── Consumo da IA ───────────────────────────────────────────────────────────
//
// Existe porque, até agora, a única forma de saber se um ajuste na IA
// funcionou era esperar a fatura. Aqui o efeito aparece no mesmo dia, e o
// salão que consome fora da curva aparece pelo nome.
//
// O número que mais importa não é o total: é a MÉDIA POR PERGUNTA. O total
// sobe quando o sistema é mais usado, o que é bom. A média por pergunta só
// sobe quando algo está desperdiçando.

const nf = (n: number) => (Number(n) || 0).toLocaleString('pt-BR')

function milhares(n: number): string {
  const v = Number(n) || 0
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.', ',') + ' mi'
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace('.', ',') + ' mil'
  return String(v)
}

export default function PainelConsumoIA() {
  const [dados, setDados] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [dias, setDias] = useState(30)

  const carregar = async (d: number) => {
    setCarregando(true)
    try {
      const r = await fetch(`/api/admin/ia-uso?dias=${d}`)
      setDados(r.ok ? await r.json() : null)
    } catch { setDados(null) }
    setCarregando(false)
  }

  useEffect(() => { carregar(dias) }, [dias])

  const Card = ({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) => (
    <div className="bg-nodri-bg2 rounded-lg px-3 py-2.5 flex-1 min-w-[130px]">
      <div className="text-[9.5px] text-nodri-t3 uppercase tracking-wider font-bold mb-1">{rotulo}</div>
      <div className="text-[17px] font-bold text-nodri-t1 leading-none">{valor}</div>
      {nota && <div className="text-[9.5px] text-nodri-t3 mt-1">{nota}</div>}
    </div>
  )

  return (
    <div className="nodri-card p-5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="font-syne font-bold text-[13px] text-nodri-cyan flex items-center gap-1.5">
          <Activity size={14} /> Consumo da IA
        </div>
        <div className="flex items-center gap-1.5">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDias(d)}
              className={`text-[10px] font-bold rounded-full px-2.5 py-1 border ${dias === d ? 'bg-nodri-cyan text-black border-nodri-cyan' : 'text-nodri-t3 border-nodri-border'}`}>
              {d}d
            </button>
          ))}
          <button onClick={() => carregar(dias)} title="Atualizar"
            className="text-nodri-t3 hover:text-nodri-t1 p-1">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>
      <p className="text-[10px] text-nodri-t3 mb-4">
        Uma linha por resposta da IA. O número que importa é a média por pergunta: o total sobe quando o sistema é mais usado, mas a média só sobe quando algo está desperdiçando.
      </p>

      {carregando && !dados ? (
        <div className="flex items-center justify-center py-8"><Loader2 size={18} className="animate-spin text-nodri-cyan" /></div>
      ) : !dados ? (
        <p className="text-[11px] text-nodri-t3">Não foi possível carregar o consumo.</p>
      ) : dados.pendente ? (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-900 leading-relaxed">{dados.mensagem}</p>
        </div>
      ) : dados.total?.perguntas === 0 ? (
        <p className="text-[11px] text-nodri-t3">
          Nenhuma pergunta registrada nos últimos {dados.dias} dias. As próximas conversas já entram aqui.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Card rotulo="Perguntas" valor={nf(dados.total.perguntas)} nota={`${nf(dados.hoje.perguntas)} hoje`} />
            <Card rotulo="Média por pergunta" valor={milhares(dados.media_tokens_por_pergunta)} nota="tokens" />
            <Card rotulo="Tokens de entrada" valor={milhares(dados.total.entrada)} />
            <Card rotulo="Tokens de saída" valor={milhares(dados.total.saida)} />
            <Card
              rotulo="Veio do cache"
              valor={milhares(dados.total.cacheLeitura)}
              nota={dados.total.cacheLeitura > 0 ? 'cobrado a 10%' : 'só no Claude'}
            />
            <Card rotulo="Tempo médio" valor={`${dados.media_segundos}s`} />
          </div>

          {(dados.total.reservas > 0 || dados.total.erros > 0) && (
            <div className="flex flex-wrap gap-2">
              {dados.total.reservas > 0 && (
                <div className="text-[10.5px] bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">
                  <strong>{nf(dados.total.reservas)}</strong> resposta(s) foram atendidas pela reserva — o provedor principal caiu e o outro cobriu.
                </div>
              )}
              {dados.total.erros > 0 && (
                <div className="text-[10.5px] bg-red-50 border border-red-200 text-red-900 rounded-lg px-3 py-2">
                  <strong>{nf(dados.total.erros)}</strong> falha(s) registrada(s).
                </div>
              )}
            </div>
          )}

          {dados.modelos?.length > 0 && (
            <div>
              <div className="text-[10px] text-nodri-t3 uppercase tracking-wider font-bold mb-2">Por modelo</div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]" style={{ minWidth: 420 }}>
                  <thead>
                    <tr className="text-nodri-t3 text-[9.5px] uppercase">
                      <th className="text-left font-bold pb-1.5">Modelo</th>
                      <th className="text-right font-bold pb-1.5">Perguntas</th>
                      <th className="text-right font-bold pb-1.5">Tokens</th>
                      <th className="text-right font-bold pb-1.5">Média</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.modelos.map((m: any) => (
                      <tr key={m.modelo} className="border-t border-nodri-border">
                        <td className="py-1.5 font-semibold text-nodri-t1">{m.modelo}</td>
                        <td className="py-1.5 text-right tabular-nums">{nf(m.perguntas)}</td>
                        <td className="py-1.5 text-right tabular-nums">{milhares(m.entrada + m.saida + m.cacheLeitura)}</td>
                        <td className="py-1.5 text-right tabular-nums font-bold">
                          {milhares(Math.round((m.entrada + m.saida + m.cacheLeitura) / (m.perguntas || 1)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {dados.saloes?.length > 0 && (
            <div>
              <div className="text-[10px] text-nodri-t3 uppercase tracking-wider font-bold mb-2">
                Salões que mais consomem
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]" style={{ minWidth: 460 }}>
                  <thead>
                    <tr className="text-nodri-t3 text-[9.5px] uppercase">
                      <th className="text-left font-bold pb-1.5">Salão</th>
                      <th className="text-right font-bold pb-1.5">Perguntas</th>
                      <th className="text-right font-bold pb-1.5">Tokens</th>
                      <th className="text-right font-bold pb-1.5">Média</th>
                      <th className="text-right font-bold pb-1.5">Ferram.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.saloes.map((s: any) => (
                      <tr key={s.salao_id} className="border-t border-nodri-border">
                        <td className="py-1.5 font-semibold text-nodri-t1">{s.nome}</td>
                        <td className="py-1.5 text-right tabular-nums">{nf(s.perguntas)}</td>
                        <td className="py-1.5 text-right tabular-nums">{milhares(s.entrada + s.saida + s.cacheLeitura)}</td>
                        <td className="py-1.5 text-right tabular-nums font-bold">
                          {milhares(Math.round((s.entrada + s.saida + s.cacheLeitura) / (s.perguntas || 1)))}
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-nodri-t3">{nf(s.ferramentas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {dados.ultimos_erros?.length > 0 && (
            <div>
              <div className="text-[10px] text-nodri-t3 uppercase tracking-wider font-bold mb-2">Últimas falhas</div>
              <div className="space-y-1">
                {dados.ultimos_erros.map((e: any, i: number) => (
                  <div key={i} className="text-[10px] text-nodri-t2 bg-nodri-bg2 rounded px-2.5 py-1.5">
                    <span className="text-nodri-t3">{new Date(e.criado_em).toLocaleString('pt-BR')}</span>
                    {' · '}<span className="font-semibold">{e.modelo}</span>
                    {' · '}{e.erro}
                  </div>
                ))}
              </div>
            </div>
          )}

          {dados.amostra_truncada && (
            <p className="text-[9.5px] text-nodri-t3 italic">
              Amostra limitada às 5.000 respostas mais recentes do período.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
