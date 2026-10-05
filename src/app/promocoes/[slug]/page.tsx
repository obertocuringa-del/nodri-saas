'use client'
import { useState, useEffect } from 'react'
import { Loader2, Megaphone, Tag, CalendarPlus, Ticket } from 'lucide-react'
import type { DadosVitrine } from '@/lib/vitrineCliente'
import VitrineAcoes from '@/components/vitrine/VitrineAcoes'
import VitrinePrecos from '@/components/vitrine/VitrinePrecos'
import VitrineAgendar from '@/components/vitrine/VitrineAgendar'
import VitrineCupom from '@/components/vitrine/VitrineCupom'
import BoasVindasCupom from '@/components/vitrine/BoasVindasCupom'

// Página pública do salão, aberta por link. Quem chega aqui é cliente, não
// usuário do sistema: nada de menu, sidebar ou termo interno. Fundo claro e
// alvos grandes porque ela é aberta no celular, com uma mão, quase sempre a
// partir de um link no WhatsApp.

type Aba = 'acoes' | 'cupom' | 'precos' | 'agendar'

const ABAS: Array<{ id: Aba; label: string; curto: string; icone: any }> = [
  { id: 'acoes', label: 'Promoções', curto: 'Promoções', icone: Megaphone },
  { id: 'cupom', label: 'Cupom de indicação', curto: 'Cupom', icone: Ticket },
  { id: 'precos', label: 'Tabela de preços', curto: 'Preços', icone: Tag },
  { id: 'agendar', label: 'Agendar procedimento', curto: 'Agendar', icone: CalendarPlus },
  // "Sugerir ação comercial" saiu da barra por decisão do dono: no celular,
  // cinco abas dividindo 375px deixavam os nomes em três linhas, e essa era
  // a que menos gente usava. A enquete continua inteira no sistema, só não
  // ocupa mais espaço na barra de quem chega pelo WhatsApp.
]

export default function PromocoesPage({ params }: { params: { slug: string } }) {
  const [dados, setDados] = useState<DadosVitrine | null>(null)
  const [erro, setErro] = useState(false)
  const [aba, setAba] = useState<Aba>('acoes')

  useEffect(() => {
    fetch(`/api/promocoes/${params.slug}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setDados)
      .catch(() => setErro(true))
  }, [params.slug])

  useEffect(() => {
    if (dados?.salao?.nome) document.title = dados.salao.nome
  }, [dados])

  if (erro) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <p className="font-bold text-[16px] text-gray-900 mb-1">Link indisponível</p>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            Esta página não está no ar. Peça o link atualizado ao salão.
          </p>
        </div>
      </div>
    )
  }

  if (!dados) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center">
        <Loader2 size={26} className="animate-spin text-gray-400" />
      </div>
    )
  }

  const { salao } = dados

  return (
    // A cor da marca fica numa variável para os quatro blocos usarem a mesma.
    <div className="min-h-screen bg-[#f7f7f8]" style={{ ['--vt-cor' as any]: '#5b4fcf' }}>
      {/* A logo é a identidade que a cliente reconhece — a razão social não diz
          nada para ela. Por isso a logo vem primeiro e o nome só aparece
          quando não há logo cadastrada. */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:py-5 text-center">
          {salao.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={salao.logo} alt={salao.nome}
              className="h-11 sm:h-16 mx-auto object-contain" />
          ) : (
            <h1 className="font-bold text-[17px] sm:text-[21px] text-gray-900">{salao.nome}</h1>
          )}
        </div>

        {/* Quatro abas cabem em 375px sem quebrar linha, desde que o rótulo
            encolha: no celular vai o nome curto, no computador o inteiro. */}
        <nav className="max-w-5xl mx-auto px-1 sm:px-2 flex" aria-label="Seções">
          {ABAS.map(({ id, label, curto, icone: Icone }) => (
            <button key={id} onClick={() => setAba(id)}
              aria-current={aba === id ? 'page' : undefined}
              className={'flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center '
                + 'gap-0.5 sm:gap-2 py-2.5 sm:py-3 border-b-2 transition '
                + (aba === id
                  ? 'border-[var(--vt-cor)] text-[var(--vt-cor)]'
                  : 'border-transparent text-gray-400 hover:text-gray-600')}>
              <Icone size={18} className="shrink-0" />
              <span className="text-[11px] sm:text-[13px] font-semibold leading-tight">
                <span className="sm:hidden">{curto}</span>
                <span className="hidden sm:inline">{label}</span>
              </span>
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 sm:py-7">
        {aba === 'acoes' && (
          <VitrineAcoes acoes={dados.acoes} servicos={dados.servicos}
            profissionais={dados.profissionais} whatsapp={salao.whatsapp} horario={dados.horario} />
        )}
        {aba === 'cupom' && dados.cupons?.ativo && (
          <VitrineCupom slug={params.slug}
            percentual={dados.cupons.percentual} validoAte={dados.cupons.validoAte}
            nomeSalao={salao.nome} logo={salao.logo}
            destaques={dados.cupons.destaques} endereco={dados.cupons.endereco} />
        )}
        {aba === 'precos' && (
          <VitrinePrecos servicos={dados.servicos} />
        )}
        {aba === 'agendar' && (
          <VitrineAgendar
            horario={dados.horario}
            servicos={dados.servicos}
            profissionais={dados.profissionais}
            acoes={dados.acoes}
            whatsapp={salao.whatsapp}
          />
        )}
      </main>

      {/* Só quando o salão ligou os cupons: anunciar algo que a pessoa não
          encontra na tela seria pior do que não anunciar. */}
      {dados.cupons?.ativo && (
        <BoasVindasCupom
          percentual={dados.cupons.percentual}
          nomeSalao={salao.nome}
          onAbrirCupom={() => setAba('cupom')} />
      )}

      <footer className="max-w-5xl mx-auto px-4 pb-8 pt-2 text-center">
        <p className="text-[11px] text-gray-400">{salao.nome}</p>
      </footer>
    </div>
  )
}
