'use client'

// ── Painel do CRM ───────────────────────────────────────────────────────────
//
// Um CRM que não mede é uma caixa de entrada com nome bonito. Esta tela existe
// para responder o que o salão hoje não consegue responder: de cada dez que
// escreveram, quantas viraram horário; quando a gente perde, perde por quê; e
// o anúncio que eu pago traz gente que fecha ou só gente que pergunta.
//
// Nenhum número aqui é enfeite. Cada bloco termina numa decisão possível.

import { useEffect, useState } from 'react'
import { ArrowLeft, Clock, AlertTriangle } from 'lucide-react'
import { tempoCurto } from '@/lib/crm'

export default function PainelCrmPage() {
  const [dias, setDias] = useState(30)
  const [d, setD] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)
    fetch(`/api/crm/painel?dias=${dias}`)
      .then(r => r.ok ? r.json() : null)
      .then(setD).catch(() => {})
      .finally(() => setCarregando(false))
  }, [dias])

  return (
    <div className="min-h-screen" style={{ background: '#faf9f7' }}>
      <div className="border-b" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
        <div className="px-4 py-2.5 flex items-center gap-3" style={{ paddingRight: 340 }}>
          <a href="/salon/crm" className="p-1.5 rounded-lg" style={{ color: '#6b6860' }} title="Voltar ao CRM">
            <ArrowLeft size={17} />
          </a>
          <div>
            <h1 className="font-bold text-[14px] leading-tight" style={{ color: '#1a1a1a' }}>Painel do CRM</h1>
            <p className="text-[11px]" style={{ color: '#8f877f' }}>O que entrou, o que fechou e por que o resto não fechou</p>
          </div>
          <div className="flex-1" />
          <select value={dias} onChange={e => setDias(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold focus:outline-none"
            style={{ background: '#faf9f7', border: '1px solid #e8e6e0', color: '#1a1a1a' }}>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={365}>Último ano</option>
          </select>
        </div>
      </div>

      {carregando && <p className="p-8 text-[13px]" style={{ color: '#8f877f' }}>Calculando...</p>}

      {!carregando && d && (
        <div className="max-w-5xl mx-auto px-5 py-6 space-y-5">

          {/* ── Quem está esperando AGORA ── */}
          {d.resposta.esperando_agora > 0 && (
            <div className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: d.resposta.pior_espera_min >= 60 ? '#fbebe9' : '#fbf1df' }}>
              <AlertTriangle size={18} style={{ color: d.resposta.pior_espera_min >= 60 ? '#b4322a' : '#9a6b12' }} />
              <div>
                <p className="font-bold text-[13.5px]" style={{ color: d.resposta.pior_espera_min >= 60 ? '#b4322a' : '#9a6b12' }}>
                  {d.resposta.esperando_agora} {d.resposta.esperando_agora === 1 ? 'cliente esperando' : 'clientes esperando'} resposta agora
                </p>
                <p className="text-[12px]" style={{ color: '#6b6860' }}>
                  A que espera há mais tempo já está há {tempoCurto(d.resposta.pior_espera_min)} de expediente.
                </p>
              </div>
              <div className="flex-1" />
              <a href="/salon/crm" className="px-3 py-2 rounded-lg text-[12px] font-bold"
                style={{ background: '#5b4fcf', color: '#fff' }}>Ir para a fila</a>
            </div>
          )}

          {/* ── O funil ── */}
          <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
            <h2 className="font-bold text-[15px] mb-1" style={{ color: '#1a1a1a' }}>De cada dez que escreveram</h2>
            <p className="text-[12px] mb-4" style={{ color: '#8f877f' }}>
              A conversão é calculada sobre o que já foi decidido — agendou ou não fechou. Conversa
              ainda em andamento não derruba o número, porque ela ainda pode fechar.
            </p>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
              <Numero rotulo="Oportunidades" valor={d.geral.total} />
              <Numero rotulo="Agendaram" valor={d.geral.agendadas} cor="#2f6b4f" />
              <Numero rotulo="Não fecharam" valor={d.geral.perdidas} cor="#b4322a" />
              {d.geral.desmarcadas > 0 && (
                <Numero rotulo="Desmarcaram" valor={d.geral.desmarcadas} cor="#b4322a" />
              )}
              <Numero rotulo="Ainda abertas" valor={d.geral.abertas} cor="#9a6b12" />
              <Numero rotulo="Conversão" valor={d.geral.conversao === null ? '—' : `${d.geral.conversao}%`} cor="#5b4fcf" grande />
            </div>
            {d.importadas > 0 && (
              <p className="text-[11px] mt-3" style={{ color: '#8f877f' }}>
                {d.importadas} conversas vieram do histórico do celular e ficam fora desta conta:
                não foram oportunidades que o salão gerou no período.
              </p>
            )}
          </section>

          {/* ── Cliente nova x cliente da casa ── */}
          <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
            <h2 className="font-bold text-[15px] mb-1" style={{ color: '#1a1a1a' }}>Cliente nova e cliente da casa</h2>
            <p className="text-[12px] mb-4" style={{ color: '#8f877f' }}>
              São dois negócios diferentes. Perder uma cliente da casa custa uma visita; perder uma
              cliente nova custa todas as que ela faria.
            </p>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <Bloco titulo="Clientes novas" f={d.novas} cor="#0f766e" />
              <Bloco titulo="Já eram clientes" f={d.conhecidas} cor="#5b4fcf" />
            </div>
          </section>

          {/* ── Tempo de resposta ── */}
          <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
            <h2 className="font-bold text-[15px] mb-1" style={{ color: '#1a1a1a' }}>Quanto a cliente espera</h2>
            <p className="text-[12px] mb-4" style={{ color: '#8f877f' }}>
              Contado em minutos de expediente: mensagem que chega domingo à noite não vira doze
              horas de atraso. {d.resposta.amostra > 0
                ? `Base de ${d.resposta.amostra} respostas no período.`
                : 'Ainda sem respostas registradas no período — o número aparece quando a recepção começar a responder pelo CRM.'}
            </p>
            {d.resposta.amostra > 0 && (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <Numero rotulo="Espera típica" valor={tempoCurto(d.resposta.mediana_min || 0)} cor="#5b4fcf" grande />
                <Numero rotulo="Respondidas em até 15 min" valor={`${d.resposta.ate_15_min}%`}
                  cor={(d.resposta.ate_15_min ?? 0) >= 70 ? '#2f6b4f' : '#9a6b12'} />
              </div>
            )}
          </section>

          {/* ── Por que perdeu ── */}
          <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
            <h2 className="font-bold text-[15px] mb-1" style={{ color: '#1a1a1a' }}>Quando perde, perde por quê</h2>
            <p className="text-[12px] mb-4" style={{ color: '#8f877f' }}>
              Perder por preço e perder por falta de horário são dois problemas com soluções opostas.
            </p>
            {d.motivos.length === 0
              ? <p className="text-[12.5px]" style={{ color: '#8f877f' }}>Nenhuma conversa fechada sem conversão no período.</p>
              : <Barras itens={d.motivos.map((m: any) => ({ nome: m.nome, valor: m.total }))} cor="#b4322a" />}
          </section>

          {/* ── Por que desmarcou ── */}
          {d.desmarques?.length > 0 && (
            <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
              <h2 className="font-bold text-[15px] mb-1" style={{ color: '#1a1a1a' }}>Quando desmarca, desmarca por quê</h2>
              <p className="text-[12px] mb-4" style={{ color: '#8f877f' }}>
                Quem desmarca já tinha decidido vir — é um horário que existia e caiu. O motivo
                aqui é outro problema, com outra solução, que o "não fechou" não enxerga.
              </p>
              <Barras itens={d.desmarques.map((m: any) => ({ nome: m.nome, valor: m.total }))} cor="#c2603a" />
            </section>
          )}

          {/* ── Quem trabalhou ── */}
          {d.pessoas?.length > 0 && (
            <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
              <h2 className="font-bold text-[15px] mb-1" style={{ color: '#1a1a1a' }}>Quem trabalhou a fila</h2>
              <p className="text-[12px] mb-4" style={{ color: '#8f877f' }}>
                Não é para vigiar atendente: é para saber se um mês ruim foi falta de demanda ou
                falta de gente respondendo — dois problemas com soluções opostas. O Relógio aparece
                na lista como qualquer outro, porque parte do trabalho o sistema faz sozinho.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#8f877f' }}>
                      <th className="text-left font-bold py-1.5">Quem</th>
                      <th className="text-right font-bold py-1.5">Respondeu</th>
                      <th className="text-right font-bold py-1.5">Assumiu</th>
                      <th className="text-right font-bold py-1.5">Agendou</th>
                      <th className="text-right font-bold py-1.5">Fechou sem conversão</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {d.pessoas.map((p: any) => (
                      <tr key={p.nome} style={{ borderTop: '1px solid #f0ece7' }}>
                        <td className="py-1.5" style={{ color: '#1a1a1a' }}>
                          {p.nome}
                          {p.nome === 'Relógio' && (
                            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: '#f1eefc', color: '#5b4fcf' }}>automático</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right" style={{ color: '#6b6860' }}>{p.respondeu}</td>
                        <td className="py-1.5 text-right" style={{ color: '#6b6860' }}>{p.assumiu}</td>
                        <td className="py-1.5 text-right font-bold" style={{ color: '#2f6b4f' }}>{p.agendou}</td>
                        <td className="py-1.5 text-right" style={{ color: '#b4322a' }}>{p.fechou}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Origem ── */}
          <section className="rounded-2xl border p-5" style={{ background: '#fff', borderColor: '#e8e6e0' }}>
            <h2 className="font-bold text-[15px] mb-1" style={{ color: '#1a1a1a' }}>De onde vem quem fecha</h2>
            <p className="text-[12px] mb-4" style={{ color: '#8f877f' }}>
              Volume não é resultado: a origem que traz mais gente pode ser a que menos fecha.
              É por isso que a coluna que importa é a última.
            </p>
            {d.origens.length === 0 || (d.origens.length === 1 && d.origens[0].nome === 'Não informado')
              ? (
                <p className="text-[12.5px]" style={{ color: '#8f877f' }}>
                  Nenhuma conversa com origem marcada ainda. Na conversa, o campo <strong>Veio de</strong>
                  {' '}fica ao lado de Próxima ação — um clique por cliente e este quadro passa a existir.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px]" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: '#8f877f' }}>
                        <th className="text-left font-bold py-1.5">Origem</th>
                        <th className="text-right font-bold py-1.5">Conversas</th>
                        <th className="text-right font-bold py-1.5">Agendaram</th>
                        <th className="text-right font-bold py-1.5">Não fecharam</th>
                        <th className="text-right font-bold py-1.5">Conversão</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {d.origens.map((o: any) => (
                        <tr key={o.nome} style={{ borderTop: '1px solid #f0ece7' }}>
                          <td className="py-1.5" style={{ color: '#1a1a1a' }}>{o.nome}</td>
                          <td className="py-1.5 text-right" style={{ color: '#6b6860' }}>{o.total}</td>
                          <td className="py-1.5 text-right" style={{ color: '#2f6b4f' }}>{o.agendadas}</td>
                          <td className="py-1.5 text-right" style={{ color: '#b4322a' }}>{o.perdidas}</td>
                          <td className="py-1.5 text-right font-bold" style={{ color: '#1a1a1a' }}>
                            {o.conversao === null ? '—' : `${o.conversao}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </section>
        </div>
      )}
    </div>
  )
}

function Numero({ rotulo, valor, cor = '#1a1a1a', grande }: any) {
  return (
    <div className="rounded-xl p-3" style={{ background: '#fdfcfa', border: '1px solid #f0ece7' }}>
      <p className="text-[10.5px] font-bold mb-1" style={{ color: '#8f877f', letterSpacing: '0.02em' }}>
        {rotulo.toUpperCase()}
      </p>
      <p className={grande ? 'text-[26px] font-bold leading-none' : 'text-[20px] font-bold leading-none'}
        style={{ color: cor, fontVariantNumeric: 'tabular-nums' }}>{valor}</p>
    </div>
  )
}

function Bloco({ titulo, f, cor }: any) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#fdfcfa', border: '1px solid #f0ece7' }}>
      <p className="font-bold text-[12.5px] mb-2" style={{ color: cor }}>{titulo}</p>
      <p className="text-[28px] font-bold leading-none mb-2" style={{ color: cor, fontVariantNumeric: 'tabular-nums' }}>
        {f.conversao === null ? '—' : `${f.conversao}%`}
      </p>
      <p className="text-[11.5px]" style={{ color: '#6b6860' }}>
        {f.total} {f.total === 1 ? 'conversa' : 'conversas'} · {f.agendadas} agendaram ·
        {' '}{f.perdidas} não fecharam · {f.abertas} em aberto
      </p>
    </div>
  )
}

// Barra simples, sem biblioteca: o dado é pequeno e a comparação é entre
// poucas linhas. Gráfico de verdade aqui seria peso sem informação a mais.
function Barras({ itens, cor }: { itens: { nome: string; valor: number }[]; cor: string }) {
  const maior = Math.max(...itens.map(i => i.valor), 1)
  return (
    <div className="space-y-2">
      {itens.map(i => (
        <div key={i.nome}>
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-[12.5px]" style={{ color: '#1a1a1a' }}>{i.nome}</span>
            <div className="flex-1" />
            <span className="text-[12.5px] font-bold" style={{ color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>
              {i.valor}
            </span>
          </div>
          <div className="h-2 rounded-full" style={{ background: '#f0ece7' }}>
            <div className="h-2 rounded-full" style={{ width: `${(i.valor / maior) * 100}%`, background: cor }} />
          </div>
        </div>
      ))}
    </div>
  )
}
