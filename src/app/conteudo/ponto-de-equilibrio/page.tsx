'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calculator, ClipboardList } from 'lucide-react'

export default function PontoEquilibrioPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    aluguel: '', energia: '', agua: '', internet: '', salarios: '', outros: '',
    ticketMedio: '', comissao: '',
  })
  const [resultado, setResultado] = useState<any>(null)

  function calcular() {
    const custoFixo = ['aluguel','energia','agua','internet','salarios','outros'].reduce((acc, k) => acc + (Number((form as any)[k]) || 0), 0)
    const ticket = Number(form.ticketMedio) || 0
    const comissao = Number(form.comissao) || 0
    if (!ticket) return
    const margemContrib = ticket * (1 - comissao / 100)
    const atendimentosMes = margemContrib > 0 ? Math.ceil(custoFixo / margemContrib) : 0
    const atendimentosDia = Math.ceil(atendimentosMes / 26)
    const faturamentoMes = atendimentosMes * ticket
    const faturamentoDia = atendimentosDia * ticket
    setResultado({ custoFixo, ticket, comissao, margemContrib, atendimentosMes, atendimentosDia, faturamentoMes, faturamentoDia })
  }

  const campos = [
    { key: 'aluguel', label: 'Aluguel (R$)' },
    { key: 'energia', label: 'Energia Elétrica (R$)' },
    { key: 'agua', label: 'Água (R$)' },
    { key: 'internet', label: 'Internet/Telefone (R$)' },
    { key: 'salarios', label: 'Salários Fixos (R$)' },
    { key: 'outros', label: 'Outros custos fixos (R$)' },
  ]

  return (
    <div className="min-h-screen bg-nodri-dark">
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-nodri-t2 hover:text-nodri-cyan transition-colors text-sm font-medium">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="w-px h-5 bg-nodri-border" />
        <h1 className="font-syne font-bold text-[15px] uppercase tracking-wide">Calculadora de Ponto de Equilíbrio</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        <div className="nodri-card p-2 text-center">
          <Calculator size={32} className="text-nodri-cyan mx-auto mb-2" />
          <p className="text-nodri-t2 text-sm leading-relaxed">Descubra quantos atendimentos e quanto precisa faturar por dia para o seu salão não ter prejuízo.</p>
        </div>

        <div className="nodri-card p-5">
          <h2 className="font-syne font-bold text-[13px] text-nodri-cyan mb-4 flex items-center gap-1.5"><ClipboardList size={13} /> Custos Fixos Mensais</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {campos.map(c => (
              <div key={c.key}>
                <label className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1 block">{c.label}</label>
                <input type="number" min="0" value={(form as any)[c.key]}
                  onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))}
                  placeholder="0" className="w-full bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5 pt-4 border-t border-nodri-border">
            <div>
              <label className="text-[11px] text-nodri-cyan uppercase tracking-wider mb-1 block font-bold">Ticket Médio por Atendimento (R$) *</label>
              <input type="number" min="0" value={form.ticketMedio}
                onChange={e => setForm(p => ({ ...p, ticketMedio: e.target.value }))}
                placeholder="Ex: 80" className="w-full bg-nodri-surface border border-nodri-cyan/30 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
            </div>
            <div>
              <label className="text-[11px] text-nodri-cyan uppercase tracking-wider mb-1 block font-bold">% Comissão dos Profissionais</label>
              <input type="number" min="0" max="100" value={form.comissao}
                onChange={e => setForm(p => ({ ...p, comissao: e.target.value }))}
                placeholder="Ex: 40" className="w-full bg-nodri-surface border border-nodri-cyan/30 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-nodri-cyan transition-colors" />
            </div>
          </div>
          <button onClick={calcular}
            className="w-full py-3 bg-nodri-cyan text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:brightness-110 text-[14px]">
            <Calculator size={16} /> Calcular Ponto de Equilíbrio
          </button>
        </div>

        {resultado && (
          <div className="space-y-3">
            <div className="bg-nodri-red/10 border border-nodri-red/30 rounded-xl p-4">
              <div className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1">Total de custos fixos mensais</div>
              <div className="font-syne font-black text-2xl text-nodri-red">R$ {resultado.custoFixo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="nodri-card p-4 text-center border-2 border-nodri-amber/30">
                <div className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1">Atendimentos/mês para equilibrar</div>
                <div className="font-syne font-black text-3xl text-nodri-amber">{resultado.atendimentosMes}</div>
                <div className="text-[11px] text-nodri-t3 mt-1">atendimentos</div>
              </div>
              <div className="nodri-card p-4 text-center border-2 border-nodri-amber/30">
                <div className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1">Atendimentos/dia (26 dias)</div>
                <div className="font-syne font-black text-3xl text-nodri-amber">{resultado.atendimentosDia}</div>
                <div className="text-[11px] text-nodri-t3 mt-1">atendimentos/dia</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="nodri-card p-4 text-center border-2 border-nodri-green/30">
                <div className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1">Faturamento mínimo/mês</div>
                <div className="font-syne font-black text-2xl text-nodri-green">R$ {resultado.faturamentoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="nodri-card p-4 text-center border-2 border-nodri-green/30">
                <div className="text-[11px] text-nodri-t3 uppercase tracking-wider mb-1">Faturamento mínimo/dia</div>
                <div className="font-syne font-black text-2xl text-nodri-green">R$ {resultado.faturamentoDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div className="bg-nodri-cyan/5 border border-nodri-cyan/20 rounded-xl p-4 text-[12px] text-nodri-t2 leading-relaxed">
              <strong className="text-nodri-cyan">Resumo:</strong> Com ticket médio de R${resultado.ticket} e {resultado.comissao}% de comissão, você precisa de <strong className="text-nodri-t1">{resultado.atendimentosDia} atendimentos por dia</strong> para cobrir todos os seus custos. Acima disso é lucro!
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
