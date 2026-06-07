'use client'

import { useState } from 'react'
import { ArrowLeft, Plus, Trash2, Calculator, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

const fmtR = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct = (v: number, t: number) => t > 0 ? ((v / t) * 100).toFixed(1) : '0.0'

interface Item { id: number; nome: string; valor: string; dica: string; editavel: boolean }

const ITENS_PADRAO: Omit<Item, 'id'>[] = [
  { nome: 'Água', valor: '', dica: 'Inclua consumo da empresa, limpeza, banheiros, cozinha. Se não tiver, deixe R$ 0.', editavel: false },
  { nome: 'Aluguel', valor: '', dica: 'Se for imóvel próprio, considere o valor que pagaria de aluguel. Inclua condomínio.', editavel: false },
  { nome: 'Contabilidade', valor: '', dica: 'Honorários do contador, declarações, folha de pagamento, consultoria fiscal.', editavel: false },
  { nome: 'Decoração / Manutenção', valor: '', dica: 'Pintura, móveis, reparos, reformas, plantas, decoração sazonal.', editavel: false },
  { nome: 'Despesas Bancárias', valor: '', dica: 'TEF, DOC, TED, manutenção de conta, cartões, maquininhas. Negocie sempre!', editavel: false },
  { nome: 'Energia Elétrica', valor: '', dica: 'Equipamentos, iluminação, ar condicionado. LED pode reduzir muito este custo.', editavel: false },
  { nome: 'Internet / Telefone', valor: '', dica: 'Internet comercial, telefone fixo, celulares corporativos. Conexão rápida é investimento!', editavel: false },
  { nome: 'Software e Licenças', valor: '', dica: 'Office, antivírus, sistema de gestão, Spotify, apps especializados.', editavel: false },
  { nome: 'Produtos de Limpeza', valor: '', dica: 'Detergentes, desinfetantes, papel higiênico, álcool gel, sabonetes.', editavel: false },
  { nome: 'Marketing / Publicidade', valor: '', dica: 'Facebook Ads, Google Ads, panfletos, redes sociais, influencers.', editavel: false },
  { nome: 'Material de Escritório', valor: '', dica: 'Papel A4, canetas, grampeadores, pastas, impressões, toners.', editavel: false },
  { nome: 'Mimos para Clientes', valor: '', dica: 'Cafezinho, água, balas, lembrancinhas, brindes. Cliente mimado sempre volta!', editavel: false },
  { nome: 'Mimos para Profissionais', valor: '', dica: 'Confraternizações, pizzas, presentes de aniversário, incentivos de equipe.', editavel: false },
  { nome: 'Salários e Encargos', valor: '', dica: 'Salários + INSS + FGTS + 13º + férias + vale alimentação + vale transporte.', editavel: false },
  { nome: 'Estacionamento', valor: '', dica: 'Aluguel de vagas, manobrista, estacionamento para funcionários.', editavel: false },
  { nome: 'Pró-labore', valor: '', dica: 'Sua remuneração como sócio/proprietário. Entre 1 a 2 salários mínimos como base.', editavel: false },
  { nome: 'Impostos / Simples Nacional', valor: '', dica: 'Valor mensal recolhido de impostos. Consulte seu contador para o percentual exato.', editavel: false },
  { nome: 'Produtos / Insumos', valor: '', dica: 'Tintas, produtos químicos, esmaltes, materiais de consumo para os serviços.', editavel: false },
]

export default function CalculadoraCustoPage() {
  const [faturamento, setFaturamento] = useState('')
  const [itens, setItens] = useState<Item[]>(ITENS_PADRAO.map((i, idx) => ({ ...i, id: idx + 1 })))
  const [proximo, setProximo] = useState(ITENS_PADRAO.length + 1)
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [dicaAberta, setDicaAberta] = useState<number | null>(null)

  const fat = parseFloat(faturamento.replace(',', '.')) || 0
  const totalCustos = itens.reduce((s, i) => s + (parseFloat(i.valor.replace(',', '.')) || 0), 0)
  const lucro = fat - totalCustos
  const margem = fat > 0 ? (lucro / fat) * 100 : 0

  function adicionarItem() {
    setItens(prev => [...prev, { id: proximo, nome: '', valor: '', dica: '', editavel: true }])
    setProximo(p => p + 1)
  }

  function removerItem(id: number) {
    setItens(prev => prev.filter(i => i.id !== id))
  }

  function atualizarItem(id: number, campo: 'nome' | 'valor', val: string) {
    setItens(prev => prev.map(i => i.id === id ? { ...i, [campo]: val } : i))
  }

  async function calcular() {
    if (!fat) { alert('Informe o faturamento mensal.'); return }
    setLoading(true)
    setResultado(null)
    try {
      const itensPreenchidos = itens.filter(i => parseFloat(i.valor.replace(',', '.')) > 0)
      const detalhe = itensPreenchidos.map(i => `- ${i.nome}: ${fmtR(parseFloat(i.valor.replace(',', '.')) || 0)}`).join('\n')

      const prompt = `Você é a NODRI IA, especialista em gestão financeira de salões de beleza.

O gestor preencheu a calculadora de custos operacionais com os seguintes dados:

FATURAMENTO MENSAL: ${fmtR(fat)}

CUSTOS DETALHADOS:
${detalhe}

TOTAIS CALCULADOS:
- Total de Custos: ${fmtR(totalCustos)}
- Lucro Líquido: ${fmtR(lucro)}
- Margem de Lucro: ${margem.toFixed(1)}%
- Custos representam: ${pct(totalCustos, fat)}% do faturamento

Faça uma análise financeira completa e prática com:

1. 🔍 DIAGNÓSTICO DA SITUAÇÃO FINANCEIRA
   - Avalie se a margem está saudável (boa: acima de 20%, atenção: 10-20%, crítica: abaixo de 10%)
   - Identifique os maiores custos e se estão dentro do padrão do setor de beleza
   - Aponte inconsistências (ex: custo muito alto ou muito baixo para o faturamento)

2. ⚡ CUSTOS QUE MERECEM ATENÇÃO
   - Liste os 3 maiores custos com % do faturamento
   - Sugira ações específicas para reduzir cada um

3. 📊 BENCHMARKS DO SETOR DE BELEZA
   - Compare com os percentuais ideais para salões:
     • Aluguel: máx 10% do faturamento
     • Salários/Comissões: 35-45%
     • Produtos/Insumos: 8-12%
     • Marketing: 3-5%
     • Custos fixos totais: máx 30%

4. 💡 RECOMENDAÇÕES PRÁTICAS
   - 3 ações concretas para melhorar a margem
   - Quanto cada ação pode impactar no lucro

5. 🎯 META FINANCEIRA SUGERIDA
   - Faturamento ideal para ter margem de 25%
   - Quanto precisaria reduzir custos ou aumentar faturamento

Seja direto, use números reais, evite respostas genéricas.`

      const res = await fetch('/api/ia/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagens: [{ role: 'user', content: prompt }],
          modo: 'calculadora'
        })
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Erro ao processar. Tente novamente.')
        return
      }

      let texto = ''
      const reader = res.body!.getReader()
      const dec = new TextDecoder('utf-8', { fatal: false })
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          try {
            const d = JSON.parse(line.slice(5).trim())
            if (d.token) texto += d.token
          } catch {}
        }
      }

      setResultado({
        faturamento: fat,
        totalCustos,
        lucro,
        margem,
        analise: texto,
        itens: itensPreenchidos,
      })
    } catch (e) {
      alert('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const corMargem = margem >= 20 ? '#10b981' : margem >= 10 ? '#f59e0b' : '#ef4444'

  if (resultado) {
    return (
      <div className="min-h-screen" style={{ background: '#0a0f1a', color: '#e2e8f0' }}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <button onClick={() => setResultado(null)}
            className="flex items-center gap-2 text-sm mb-6 hover:text-white transition-colors"
            style={{ color: '#94a3b8' }}>
            <ArrowLeft size={16} /> Refazer cálculo
          </button>

          <div className="text-center mb-8">
            <div className="text-4xl mb-2">🎉</div>
            <h1 className="text-2xl font-bold text-white">Análise Concluída!</h1>
            <p style={{ color: '#94a3b8' }} className="text-sm mt-1">Sua análise completa de custos operacionais</p>
          </div>

          {/* Cards de resultado */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: '💰 Faturamento', valor: fmtR(resultado.faturamento), cor: '#f59e0b' },
              { label: '📊 Total de Custos', valor: fmtR(resultado.totalCustos), cor: '#ef4444' },
              { label: '📈 Margem de Lucro', valor: `${resultado.margem.toFixed(1)}%`, cor: corMargem },
              { label: '💵 Lucro Líquido', valor: fmtR(resultado.lucro), cor: resultado.lucro >= 0 ? '#10b981' : '#ef4444' },
            ].map((c, i) => (
              <div key={i} className="rounded-2xl p-5 border" style={{ background: '#111827', borderColor: '#1e293b' }}>
                <p className="text-xs mb-1" style={{ color: '#94a3b8' }}>{c.label}</p>
                <p className="text-2xl font-bold" style={{ color: c.cor }}>{c.valor}</p>
              </div>
            ))}
          </div>

          {/* Breakdown de custos */}
          <div className="rounded-2xl p-5 border mb-6" style={{ background: '#111827', borderColor: '#1e293b' }}>
            <h3 className="font-bold text-sm mb-3" style={{ color: '#7c5cfc' }}>📋 Detalhamento dos Custos</h3>
            <div className="space-y-2">
              {resultado.itens.map((item: any, i: number) => {
                const v = parseFloat(item.valor.replace(',', '.')) || 0
                const p = resultado.faturamento > 0 ? (v / resultado.faturamento * 100).toFixed(1) : '0'
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span style={{ color: '#94a3b8' }}>{item.nome}</span>
                    <div className="flex items-center gap-3">
                      <span style={{ color: '#64748b', fontSize: 11 }}>{p}% do fat.</span>
                      <span className="font-medium text-white">{fmtR(v)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Análise IA */}
          <div className="rounded-2xl p-6 border" style={{ background: '#111827', borderColor: '#7c5cfc40' }}>
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#7c5cfc' }}>
              🤖 Análise da NODRI IA
            </h3>
            <div className="text-sm leading-relaxed space-y-1" style={{ color: '#cbd5e1' }}
              dangerouslySetInnerHTML={{
                __html: resultado.analise
                  .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/\n/g, '<br/>')
              }}
            />
          </div>

          <button onClick={() => setResultado(null)}
            className="w-full mt-6 py-3 rounded-xl font-bold text-sm transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', color: 'white' }}>
            🔄 Nova Análise
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0f1a', color: '#e2e8f0' }}>
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <a href="/salon" className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#94a3b8' }}>
            <ArrowLeft size={18} />
          </a>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Calculator size={22} style={{ color: '#7c5cfc' }} />
              Calculadora de Custo Operacional
            </h1>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
              Preencha os valores e a NODRI IA gera um diagnóstico completo do seu negócio
            </p>
          </div>
        </div>

        {/* Faturamento */}
        <div className="rounded-2xl p-6 border mb-4" style={{ background: '#111827', borderColor: '#f59e0b40' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <label className="block font-bold text-base mb-1" style={{ color: '#f59e0b' }}>
                💰 Faturamento Mensal
              </label>
              <p className="text-xs mb-3" style={{ color: '#64748b' }}>
                Qual é a média do seu faturamento mensal? Some os últimos 12 meses e divida por 12.
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#94a3b8' }}>R$</span>
                <input
                  type="number"
                  value={faturamento}
                  onChange={e => setFaturamento(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-lg font-bold focus:outline-none focus:ring-2 transition-all"
                  style={{ background: '#0a0f1a', border: '1px solid #f59e0b60', focusRingColor: '#f59e0b' }}
                />
              </div>
            </div>
            {fat > 0 && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs" style={{ color: '#64748b' }}>Custo atual</p>
                <p className="font-bold text-sm" style={{ color: totalCustos > fat ? '#ef4444' : '#10b981' }}>
                  {pct(totalCustos, fat)}% do fat.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mini resumo flutuante */}
        {fat > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { l: 'Total Custos', v: fmtR(totalCustos), c: '#ef4444' },
              { l: 'Lucro Líquido', v: fmtR(lucro), c: lucro >= 0 ? '#10b981' : '#ef4444' },
              { l: 'Margem', v: `${margem.toFixed(1)}%`, c: corMargem },
            ].map((c, i) => (
              <div key={i} className="rounded-xl p-3 border text-center" style={{ background: '#111827', borderColor: '#1e293b' }}>
                <p className="text-[10px] mb-1" style={{ color: '#64748b' }}>{c.l}</p>
                <p className="font-bold text-sm" style={{ color: c.c }}>{c.v}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabela de custos */}
        <div className="rounded-2xl border overflow-hidden mb-4" style={{ background: '#111827', borderColor: '#1e293b' }}>
          {/* Header da tabela */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-bold uppercase tracking-wider border-b" style={{ background: '#0d1525', borderColor: '#1e293b', color: '#64748b' }}>
            <div className="col-span-5">Item de Custo</div>
            <div className="col-span-3">Valor Mensal (R$)</div>
            <div className="col-span-3">% do Faturamento</div>
            <div className="col-span-1"></div>
          </div>

          {/* Itens */}
          <div className="divide-y" style={{ borderColor: '#1e293b15' }}>
            {itens.map((item) => {
              const v = parseFloat(item.valor.replace(',', '.')) || 0
              const p = fat > 0 ? (v / fat * 100) : 0
              const corP = p > 20 ? '#ef4444' : p > 10 ? '#f59e0b' : '#10b981'

              return (
                <div key={item.id} className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-white/2 transition-colors">
                  {/* Nome */}
                  <div className="col-span-5">
                    {item.editavel ? (
                      <input
                        type="text"
                        value={item.nome}
                        onChange={e => atualizarItem(item.id, 'nome', e.target.value)}
                        placeholder="Nome do gasto"
                        className="w-full px-3 py-1.5 rounded-lg text-sm text-white focus:outline-none focus:ring-1"
                        style={{ background: '#0a0f1a', border: '1px solid #1e293b', focusRingColor: '#7c5cfc' }}
                      />
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: '#cbd5e1' }}>{item.nome}</span>
                          {item.dica && (
                            <button
                              onClick={() => setDicaAberta(dicaAberta === item.id ? null : item.id)}
                              className="text-xs px-1.5 py-0.5 rounded transition-colors"
                              style={{ color: '#64748b', background: '#1e293b' }}>
                              {dicaAberta === item.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </button>
                          )}
                        </div>
                        {dicaAberta === item.id && item.dica && (
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: '#64748b' }}>
                            💡 {item.dica}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Valor */}
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#64748b' }}>R$</span>
                      <input
                        type="number"
                        value={item.valor}
                        onChange={e => atualizarItem(item.id, 'valor', e.target.value)}
                        placeholder="0"
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm text-white focus:outline-none focus:ring-1 transition-all"
                        style={{ background: '#0a0f1a', border: `1px solid ${v > 0 ? '#7c5cfc40' : '#1e293b'}` }}
                      />
                    </div>
                  </div>

                  {/* % */}
                  <div className="col-span-3">
                    {v > 0 && fat > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: '#1e293b' }}>
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(p, 100)}%`, background: corP }} />
                        </div>
                        <span className="text-xs font-medium w-10 text-right" style={{ color: corP }}>
                          {p.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: '#334155' }}>—</span>
                    )}
                  </div>

                  {/* Remover */}
                  <div className="col-span-1 flex justify-end">
                    {item.editavel && (
                      <button onClick={() => removerItem(item.id)}
                        className="p-1 rounded hover:bg-red-500/20 transition-colors"
                        style={{ color: '#ef4444' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Botão adicionar */}
          <div className="px-5 py-3 border-t" style={{ borderColor: '#1e293b' }}>
            <button onClick={adicionarItem}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all hover:brightness-110"
              style={{ background: '#7c5cfc20', color: '#7c5cfc', border: '1px dashed #7c5cfc40' }}>
              <Plus size={15} />
              Adicionar outro gasto
            </button>
          </div>
        </div>

        {/* Botão calcular */}
        <button
          onClick={calcular}
          disabled={loading || !fat}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', color: 'white' }}>
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              NODRI IA analisando seus dados...
            </>
          ) : (
            <>
              <Calculator size={20} />
              Calcular e Analisar com IA
            </>
          )}
        </button>

        <p className="text-center text-xs mt-3" style={{ color: '#334155' }}>
          A NODRI IA vai comparar seus custos com os benchmarks do setor de beleza
        </p>
      </div>
    </div>
  )
}
