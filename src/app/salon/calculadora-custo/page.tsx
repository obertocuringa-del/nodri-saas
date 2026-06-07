'use client'

import { useState } from 'react'
import { ArrowLeft, Plus, Trash2, Calculator, Loader2, ChevronDown, ChevronUp, Armchair, Grid3x3 } from 'lucide-react'

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
  const [aba, setAba] = useState<'custo' | 'cadeira' | 'metro'>('custo')
  const [faturamento, setFaturamento] = useState('')
  const [ticketMedio, setTicketMedio] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [analiseIA, setAnaliseIA] = useState('')
  const [erroIA, setErroIA] = useState('')
  const [itens, setItens] = useState<Item[]>(ITENS_PADRAO.map((i, idx) => ({ ...i, id: idx + 1 })))
  // Aluguel de cadeira
  const [numCadeiras, setNumCadeiras] = useState('')
  const [custoOperacionalCadeira, setCustoOperacionalCadeira] = useState('')
  // Metro quadrado
  const [metragemTotal, setMetragemTotal] = useState('')
  const [faturamentoMinimoM2, setFaturamentoMinimoM2] = useState('')
  const [metragemSala, setMetragemSala] = useState('')
  const [proximo, setProximo] = useState(ITENS_PADRAO.length + 1)
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [dicaAberta, setDicaAberta] = useState<number | null>(null)

  const fat = parseFloat(faturamento.replace(',', '.')) || 0
  const ticket = parseFloat(ticketMedio.replace(',', '.')) || 0
  const totalCustos = itens.reduce((s, i) => s + (parseFloat(i.valor.replace(',', '.')) || 0), 0)
  const lucro = fat - totalCustos
  const margem = fat > 0 ? (lucro / fat) * 100 : 0
  // Ponto de Equilíbrio
  const atendimentosPE = ticket > 0 ? Math.ceil(totalCustos / ticket) : 0
  const faturamentoPE = atendimentosPE * ticket
  const diasUteis = 26
  const atendimentosPorDia = atendimentosPE > 0 ? (atendimentosPE / diasUteis).toFixed(1) : '0'
  const atendimentosAtuais = fat > 0 && ticket > 0 ? Math.round(fat / ticket) : 0
  const folga = atendimentosAtuais - atendimentosPE
  const folgaReais = fat - faturamentoPE

  // Aluguel de cadeira — usa totalCustos da calculadora principal se não preenchido
  const custoOpCad = parseFloat(custoOperacionalCadeira.replace(',', '.')) || (totalCustos > 0 ? totalCustos : 0)
  const nCadeiras = parseInt(numCadeiras) || 0
  const custoPorCadeira = nCadeiras > 0 ? custoOpCad / nCadeiras : 0
  const aluguelSugerido = custoPorCadeira * 1.5

  // Metro quadrado — usa faturamentoPE da calculadora principal se não preenchido
  const fatMinimoM2 = parseFloat(faturamentoMinimoM2.replace(',', '.')) || (faturamentoPE > 0 ? faturamentoPE : 0)
  const mTotal = parseFloat(metragemTotal.replace(',', '.')) || 0
  const fatPorM2 = mTotal > 0 ? fatMinimoM2 / mTotal : 0
  const fatSugeridoPorM2 = fatPorM2 * 1.5
  const mSala = parseFloat(metragemSala.replace(',', '.')) || 0
  const fatSugeridoSala = mSala > 0 ? fatSugeridoPorM2 * mSala : 0

  // Interliga: quando totalCustos muda, preenche campo de custo operacional da cadeira se vazio
  // E faturamentoPE preenche campo de faturamento mínimo do m²

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

  // Calcular — instantâneo, sem IA
  function calcular() {
    if (!fat) { alert('Informe o faturamento mensal.'); return }
    const itensPreenchidos = itens.filter(i => parseFloat(i.valor.replace(',', '.')) > 0)
    setAnaliseIA('')
    setErroIA('')
    setResultado({
      faturamento: fat,
      totalCustos,
      lucro,
      margem,
      analise: '',
      itens: itensPreenchidos,
      ticket,
      atendimentosPE,
      atendimentosPorDia,
      atendimentosAtuais,
      folga,
    })
  }

  // Analisar com IA — separado, opcional
  async function analisarComIA() {
    if (!resultado) return
    setLoadingIA(true)
    setErroIA('')
    setAnaliseIA('')
    try {
      const detalhe = resultado.itens.map((i: any) => `- ${i.nome}: ${fmtR(parseFloat(i.valor.replace(',', '.')) || 0)}`).join('\n')
      const prompt = `Você é a NODRI IA, especialista em gestão financeira de salões de beleza.

DADOS DO GESTOR:
- Faturamento Mensal: ${fmtR(resultado.faturamento)}
- Total de Custos: ${fmtR(resultado.totalCustos)}
- Lucro Líquido: ${fmtR(resultado.lucro)}
- Margem de Lucro: ${resultado.margem.toFixed(1)}%
${resultado.ticket > 0 ? `- Ticket Médio: ${fmtR(resultado.ticket)}
- PE: ${resultado.atendimentosPE} atendimentos/mês
- Situação: ${resultado.folga >= 0 ? `✅ ${resultado.folga} acima do PE` : `🚨 ${Math.abs(resultado.folga)} abaixo do PE`}` : ''}

CUSTOS DETALHADOS:
${detalhe}

Faça análise financeira prática com:
1. 🔍 DIAGNÓSTICO (margem saudável: >20%, atenção: 10-20%, crítica: <10%)
2. ⚡ TOP 3 CUSTOS PARA REDUZIR (com % do faturamento e ação específica)
3. 📊 BENCHMARKS DO SETOR (aluguel máx 10%, salários 35-45%, produtos 8-12%, marketing 3-5%)
4. 💡 3 AÇÕES PRÁTICAS (com impacto estimado em R$)
5. 🎯 META: faturamento ideal para margem de 25%

Seja direto e use números reais.`

      const res = await fetch('/api/ia/chat', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: [{ role: 'user', content: prompt }], modo: 'calculadora' })
      })
      if (!res.ok) { setErroIA('Servidor sobrecarregado. Tente novamente em alguns segundos.'); return }

      const reader = res.body!.getReader()
      const dec = new TextDecoder('utf-8', { fatal: false })
      let buf = '', texto = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          try {
            const d = JSON.parse(line.slice(5).trim())
            if (d.token) { texto += d.token; setAnaliseIA(texto) }
          } catch {}
        }
      }
    } catch { setErroIA('Erro de conexão. Tente novamente.') }
    finally { setLoadingIA(false) }
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

          {/* Ponto de Equilíbrio no resultado */}
          {resultado.ticket > 0 && (
            <div className="rounded-2xl p-5 border mb-4" style={{ background: '#0d1525', borderColor: '#10b98140' }}>
              <h3 className="font-bold text-sm mb-3" style={{ color: '#10b981' }}>⚖️ Ponto de Equilíbrio</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>PE necessário</p>
                  <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{resultado.atendimentosPE}</p>
                  <p className="text-xs" style={{ color: '#475569' }}>atend/mês</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>Atendimentos atuais</p>
                  <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{resultado.atendimentosAtuais}</p>
                  <p className="text-xs" style={{ color: '#475569' }}>atend/mês</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>Situação</p>
                  <p className="text-xl font-bold" style={{ color: resultado.folga >= 0 ? '#10b981' : '#ef4444' }}>
                    {resultado.folga >= 0 ? `+${resultado.folga}` : resultado.folga}
                  </p>
                  <p className="text-xs" style={{ color: resultado.folga >= 0 ? '#10b981' : '#ef4444' }}>
                    {resultado.folga >= 0 ? 'zona de lucro ✅' : 'zona de risco 🚨'}
                  </p>
                </div>
              </div>
            </div>
          )}

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

          {/* Análise IA — opcional */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#7c5cfc40' }}>
            {!analiseIA && !loadingIA && !erroIA && (
              <button onClick={analisarComIA}
                className="w-full py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #7c5cfc20, #a78bfa20)', color: '#a78bfa', border: 'none' }}>
                🤖 Quero a análise da NODRI IA
                <span className="text-xs font-normal" style={{ color: '#64748b' }}>— opcional, pode demorar alguns segundos</span>
              </button>
            )}
            {loadingIA && (
              <div className="p-5 flex items-center gap-3" style={{ background: '#111827' }}>
                <Loader2 size={18} className="animate-spin" style={{ color: '#7c5cfc' }} />
                <span className="text-sm" style={{ color: '#94a3b8' }}>NODRI IA analisando seus dados...</span>
              </div>
            )}
            {erroIA && (
              <div className="p-5 flex items-center justify-between gap-3" style={{ background: '#111827' }}>
                <span className="text-sm" style={{ color: '#ef4444' }}>⚠️ {erroIA}</span>
                <button onClick={analisarComIA} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: '#7c5cfc', color: 'white' }}>
                  Tentar novamente
                </button>
              </div>
            )}
            {analiseIA && (
              <div className="p-6" style={{ background: '#111827' }}>
                <h3 className="font-bold text-sm mb-4" style={{ color: '#7c5cfc' }}>🤖 Análise da NODRI IA</h3>
                <div className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}
                  dangerouslySetInnerHTML={{
                    __html: analiseIA
                      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
              </div>
            )}
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
        <div className="flex items-center gap-3 mb-6">
          <a href="/salon" className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#94a3b8' }}>
            <ArrowLeft size={18} />
          </a>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Calculator size={22} style={{ color: '#7c5cfc' }} />
              Calculadoras do Salão
            </h1>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
              Os dados são compartilhados entre as calculadoras automaticamente
            </p>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{ background: '#111827' }}>
          {([
            { id: 'custo', label: 'Custo Operacional', icon: '💰' },
            { id: 'cadeira', label: 'Aluguel de Cadeira', icon: '💺' },
            { id: 'metro', label: 'Faturamento por M²', icon: '📐' },
          ] as const).map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              className="flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all"
              style={{ background: aba === a.id ? '#7c5cfc' : 'transparent', color: aba === a.id ? 'white' : '#64748b' }}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>

        {/* ── ABA ALUGUEL DE CADEIRA ── */}
        {aba === 'cadeira' && (
          <div className="space-y-4">
            {totalCustos > 0 && (
              <div className="rounded-xl p-3 text-xs flex items-center gap-2" style={{ background: '#7c5cfc15', border: '1px solid #7c5cfc30', color: '#a78bfa' }}>
                ✨ Custo operacional da calculadora principal: <strong>{fmtR(totalCustos)}</strong> — preenchido automaticamente
              </div>
            )}
            <div className="rounded-2xl p-6 border" style={{ background: '#111827', borderColor: '#1e293b' }}>
              <h2 className="font-bold text-base mb-1" style={{ color: '#f59e0b' }}>💺 Aluguel de Cadeira</h2>
              <p className="text-xs mb-5" style={{ color: '#64748b' }}>Quanto cobrar de aluguel por cadeira para cobrir custos e ter lucro.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#94a3b8' }}>Custo Operacional Mensal Total (R$)</label>
                  <p className="text-xs mb-2" style={{ color: '#475569' }}>Todos os gastos fixos do salão. {totalCustos > 0 ? 'Preenchido automaticamente — pode editar.' : ''}</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94a3b8' }}>R$</span>
                    <input type="number"
                      value={custoOperacionalCadeira || (totalCustos > 0 && !custoOperacionalCadeira ? String(Math.round(totalCustos)) : '')}
                      onChange={e => setCustoOperacionalCadeira(e.target.value)}
                      placeholder={totalCustos > 0 ? totalCustos.toFixed(2) : '0,00'}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-white focus:outline-none"
                      style={{ background: '#0a0f1a', border: '1px solid #f59e0b60' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#94a3b8' }}>Número de Cadeiras / Postos</label>
                  <p className="text-xs mb-2" style={{ color: '#475569' }}>Quantas cadeiras ou postos de atendimento tem o salão?</p>
                  <input type="number" value={numCadeiras} onChange={e => setNumCadeiras(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none"
                    style={{ background: '#0a0f1a', border: '1px solid #1e293b' }} />
                </div>
              </div>
              {custoPorCadeira > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="rounded-xl p-4 border" style={{ background: '#0a0f1a', borderColor: '#f59e0b40' }}>
                    <p className="text-xs mb-1" style={{ color: '#64748b' }}>📊 Custo por Cadeira (ponto de equilíbrio)</p>
                    <p className="text-3xl font-bold" style={{ color: '#f59e0b' }}>{fmtR(custoPorCadeira)}</p>
                    <p className="text-xs mt-1" style={{ color: '#475569' }}>Valor que cada cadeira precisa gerar para cobrir os custos</p>
                  </div>
                  <div className="rounded-xl p-4 border" style={{ background: '#0a0f1a', borderColor: '#10b98140' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>⭐</span>
                      <p className="text-xs font-bold" style={{ color: '#10b981' }}>Aluguel Sugerido por Cadeira</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#10b98120', color: '#10b981' }}>+50% lucro</span>
                    </div>
                    <p className="text-3xl font-bold" style={{ color: '#10b981' }}>{fmtR(aluguelSugerido)}</p>
                    <p className="text-xs mt-1" style={{ color: '#475569' }}>Valor recomendado com margem de lucro de 50%</p>
                  </div>
                  <div className="rounded-xl p-4 text-xs space-y-1" style={{ background: '#7c5cfc10', border: '1px solid #7c5cfc30', color: '#a78bfa' }}>
                    <p><strong>💡 Resumo:</strong></p>
                    <p>• {nCadeiras} cadeiras × {fmtR(aluguelSugerido)} = <strong>{fmtR(aluguelSugerido * nCadeiras)}/mês arrecadado</strong></p>
                    <p>• Lucro estimado: <strong style={{ color: '#10b981' }}>{fmtR(aluguelSugerido * nCadeiras - custoOpCad)}/mês</strong></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ABA M² ── */}
        {aba === 'metro' && (
          <div className="space-y-4">
            {faturamentoPE > 0 && (
              <div className="rounded-xl p-3 text-xs flex items-center gap-2" style={{ background: '#7c5cfc15', border: '1px solid #7c5cfc30', color: '#a78bfa' }}>
                ✨ Faturamento mínimo da calculadora principal: <strong>{fmtR(faturamentoPE)}</strong> — preenchido automaticamente
              </div>
            )}
            <div className="rounded-2xl p-6 border" style={{ background: '#111827', borderColor: '#1e293b' }}>
              <h2 className="font-bold text-base mb-1" style={{ color: '#06b6d4' }}>📐 Faturamento por M²</h2>
              <p className="text-xs mb-5" style={{ color: '#64748b' }}>Quanto cada metro quadrado do salão precisa gerar para ser rentável.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#94a3b8' }}>Faturamento Mínimo Necessário (R$)</label>
                  <p className="text-xs mb-2" style={{ color: '#475569' }}>Valor para cobrir todas as despesas. {faturamentoPE > 0 ? 'Calculado automaticamente — pode editar.' : ''}</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94a3b8' }}>R$</span>
                    <input type="number"
                      value={faturamentoMinimoM2 || (faturamentoPE > 0 && !faturamentoMinimoM2 ? String(Math.round(faturamentoPE)) : '')}
                      onChange={e => setFaturamentoMinimoM2(e.target.value)}
                      placeholder={faturamentoPE > 0 ? faturamentoPE.toFixed(2) : '0,00'}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-white focus:outline-none"
                      style={{ background: '#0a0f1a', border: '1px solid #06b6d460' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#94a3b8' }}>Metragem Total do Salão (m²)</label>
                  <p className="text-xs mb-2" style={{ color: '#475569' }}>Área total do salão em metros quadrados.</p>
                  <input type="number" value={metragemTotal} onChange={e => setMetragemTotal(e.target.value)}
                    placeholder="Ex: 80"
                    className="w-full px-4 py-3 rounded-xl text-white focus:outline-none"
                    style={{ background: '#0a0f1a', border: '1px solid #1e293b' }} />
                </div>
              </div>
              {fatPorM2 > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="rounded-xl p-4 border" style={{ background: '#0a0f1a', borderColor: '#06b6d440' }}>
                    <p className="text-xs mb-1" style={{ color: '#64748b' }}>📊 Faturamento por M² (ponto de equilíbrio)</p>
                    <p className="text-3xl font-bold" style={{ color: '#06b6d4' }}>{fmtR(fatPorM2)}/m²</p>
                    <p className="text-xs mt-1" style={{ color: '#475569' }}>Meta mínima que cada m² precisa gerar</p>
                  </div>
                  <div className="rounded-xl p-4 border" style={{ background: '#0a0f1a', borderColor: '#10b98140' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>⭐</span>
                      <p className="text-xs font-bold" style={{ color: '#10b981' }}>Faturamento Sugerido por M²</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#10b98120', color: '#10b981' }}>+50% margem</span>
                    </div>
                    <p className="text-3xl font-bold" style={{ color: '#10b981' }}>{fmtR(fatSugeridoPorM2)}/m²</p>
                    <p className="text-xs mt-1" style={{ color: '#475569' }}>Valor recomendado com margem de lucro de 50%</p>
                  </div>
                  <div className="rounded-xl p-4 border" style={{ background: '#0a0f1a', borderColor: '#1e293b' }}>
                    <p className="text-xs font-bold mb-3" style={{ color: '#94a3b8' }}>📏 Calcular para um espaço específico:</p>
                    <div className="flex gap-2 items-center">
                      <input type="number" value={metragemSala} onChange={e => setMetragemSala(e.target.value)}
                        placeholder="Ex: 15 m²"
                        className="flex-1 px-4 py-2.5 rounded-lg text-white text-sm focus:outline-none"
                        style={{ background: '#111827', border: '1px solid #334155' }} />
                      <span className="text-sm" style={{ color: '#64748b' }}>m²</span>
                    </div>
                    {fatSugeridoSala > 0 && (
                      <div className="mt-3 p-3 rounded-lg" style={{ background: '#10b98115', border: '1px solid #10b98130' }}>
                        <p className="text-xs" style={{ color: '#64748b' }}>Faturamento sugerido para {mSala} m²:</p>
                        <p className="text-2xl font-bold mt-1" style={{ color: '#10b981' }}>{fmtR(fatSugeridoSala)}/mês</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conteúdo da aba Custo Operacional só aparece quando aba === 'custo' */}
        {aba !== 'custo' ? null :
        <>{/* Faturamento */}
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
                  style={{ background: '#0a0f1a', border: '1px solid #f59e0b60' }}
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

        {/* Ticket Médio */}
        <div className="rounded-2xl p-6 border mb-4" style={{ background: '#111827', borderColor: '#7c5cfc40' }}>
          <label className="block font-bold text-base mb-1" style={{ color: '#7c5cfc' }}>
            🎟️ Ticket Médio por Atendimento
          </label>
          <p className="text-xs mb-3" style={{ color: '#64748b' }}>
            Valor médio que cada cliente gasta por visita. Usado para calcular o Ponto de Equilíbrio.
          </p>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#94a3b8' }}>R$</span>
            <input
              type="number"
              value={ticketMedio}
              onChange={e => setTicketMedio(e.target.value)}
              placeholder="0,00"
              className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-lg font-bold focus:outline-none transition-all"
              style={{ background: '#0a0f1a', border: '1px solid #7c5cfc60' }}
            />
          </div>
        </div>

        {/* Ponto de Equilíbrio */}
        {ticket > 0 && totalCustos > 0 && (
          <div className="rounded-2xl p-6 border mb-4" style={{ background: '#0d1525', borderColor: '#10b98140' }}>
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: '#10b981' }}>
              ⚖️ Ponto de Equilíbrio
              <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: '#10b98120', color: '#10b981' }}>
                Quantos atendimentos cobrem seus custos
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="rounded-xl p-4 border" style={{ background: '#111827', borderColor: '#1e293b' }}>
                <p className="text-xs mb-1" style={{ color: '#64748b' }}>Atendimentos necessários/mês</p>
                <p className="text-3xl font-bold" style={{ color: '#10b981' }}>{atendimentosPE}</p>
                <p className="text-xs mt-1" style={{ color: '#475569' }}>≈ {atendimentosPorDia} por dia útil</p>
              </div>
              <div className="rounded-xl p-4 border" style={{ background: '#111827', borderColor: '#1e293b' }}>
                <p className="text-xs mb-1" style={{ color: '#64748b' }}>Atendimentos atuais/mês</p>
                <p className="text-3xl font-bold" style={{ color: fat > 0 ? '#f59e0b' : '#475569' }}>
                  {atendimentosAtuais > 0 ? atendimentosAtuais : '—'}
                </p>
                {atendimentosAtuais > 0 && (
                  <p className="text-xs mt-1" style={{ color: folga >= 0 ? '#10b981' : '#ef4444' }}>
                    {folga >= 0 ? `✅ +${folga} acima do PE` : `🚨 ${Math.abs(folga)} abaixo do PE`}
                  </p>
                )}
              </div>
            </div>

            {/* Faturamento mínimo */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="rounded-xl p-4 border" style={{ background: '#111827', borderColor: '#10b98130' }}>
                <p className="text-xs mb-1" style={{ color: '#64748b' }}>💰 Faturamento mínimo necessário</p>
                <p className="text-2xl font-bold" style={{ color: '#10b981' }}>{fmtR(faturamentoPE)}</p>
                <p className="text-xs mt-1" style={{ color: '#475569' }}>Para cobrir 100% dos custos</p>
              </div>
              {fat > 0 && (
                <div className="rounded-xl p-4 border" style={{ background: '#111827', borderColor: folgaReais >= 0 ? '#10b98130' : '#ef444430' }}>
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>
                    {folgaReais >= 0 ? '✅ Folga financeira' : '🚨 Déficit financeiro'}
                  </p>
                  <p className="text-2xl font-bold" style={{ color: folgaReais >= 0 ? '#10b981' : '#ef4444' }}>
                    {fmtR(Math.abs(folgaReais))}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#475569' }}>
                    {folgaReais >= 0
                      ? `Você fatura ${fmtR(folgaReais)} acima do mínimo`
                      : `Falta ${fmtR(Math.abs(folgaReais))} para cobrir os custos`}
                  </p>
                </div>
              )}
            </div>
            {/* Barra visual */}
            {atendimentosAtuais > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: '#64748b' }}>
                  <span>0</span>
                  <span style={{ color: '#10b981' }}>PE: {atendimentosPE}</span>
                  <span>{Math.max(atendimentosAtuais, atendimentosPE) + 10}</span>
                </div>
                <div className="relative h-4 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                  {/* Barra PE */}
                  <div className="absolute top-0 left-0 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((atendimentosPE / (Math.max(atendimentosAtuais, atendimentosPE) + 10)) * 100, 100)}%`,
                      background: '#ef444440'
                    }} />
                  {/* Barra atual */}
                  <div className="absolute top-0 left-0 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((atendimentosAtuais / (Math.max(atendimentosAtuais, atendimentosPE) + 10)) * 100, 100)}%`,
                      background: folga >= 0 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#ef4444,#f87171)'
                    }} />
                </div>
                <p className="text-xs mt-2 text-center" style={{ color: '#64748b' }}>
                  {folga >= 0
                    ? `Seu salão está ${folga} atendimentos acima do ponto de equilíbrio — zona de lucro ✅`
                    : `Seu salão precisa de mais ${Math.abs(folga)} atendimentos para cobrir os custos 🚨`
                  }
                </p>
              </div>
            )}
            <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: '#10b98110', color: '#10b981', border: '1px solid #10b98120' }}>
              💡 <strong>Como usar:</strong> Se o seu ticket médio é R${ticket.toFixed(0)}, você precisa de pelo menos <strong>{atendimentosPE} atendimentos/mês</strong> para não ter prejuízo. Abaixo disso = prejuízo. Acima disso = lucro.
            </div>
          </div>
        )}

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
                        style={{ background: '#0a0f1a', border: '1px solid #1e293b' }}
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
          disabled={!fat}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', color: 'white' }}>
          <Calculator size={20} />
          Ver Resultado
        </button>

        <p className="text-center text-xs mt-3" style={{ color: '#334155' }}>
          Resultado instantâneo — análise IA disponível na próxima tela
        </p>
        </>}
      </div>
    </div>
  )
}
