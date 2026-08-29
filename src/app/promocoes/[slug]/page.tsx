'use client'
import { useState, useEffect } from 'react'
import { Loader2, Megaphone, ThumbsUp, Tag, CalendarPlus } from 'lucide-react'
import type { DadosVitrine } from '@/lib/vitrineCliente'
import VitrineAcoes from '@/components/vitrine/VitrineAcoes'
import VitrinePrecos from '@/components/vitrine/VitrinePrecos'
import VitrineVotacao from '@/components/vitrine/VitrineVotacao'
import VitrineAgendar from '@/components/vitrine/VitrineAgendar'

// Página pública do salão, aberta por link. Quem chega aqui é cliente, não
// usuário do sistema: nada de menu, sidebar ou termo interno. Fundo claro e
// alvos grandes porque ela é aberta no celular, com uma mão, quase sempre a
// partir de um link no WhatsApp.

type Aba = 'acoes' | 'sugestao' | 'precos' | 'agendar'

const ABAS: Array<{ id: Aba; label: string; icone: any }> = [
  { id: 'acoes', label: 'Promoções', icone: Megaphone },
  { id: 'sugestao', label: 'Sugerir ação comercial', icone: ThumbsUp },
  { id: 'precos', label: 'Tabela de preços', icone: Tag },
  { id: 'agendar', label: 'Agendar procedimento', icone: CalendarPlus },
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

        <nav className="max-w-5xl mx-auto px-2 flex">
          {ABAS.map(({ id, label, icone: Icone }) => (
            <button key={id} onClick={() => setAba(id)}
              className={'flex-1 min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 border-b-2 transition-all '
                + (aba === id
                  ? 'border-[var(--vt-cor)] text-[var(--vt-cor)]'
                  : 'border-transparent text-gray-400 hover:text-gray-600')}>
              <Icone size={18} />
              {/* Os nomes por extenso não cabem numa linha no celular, com
                  quatro abas dividindo a largura. Quebram em duas e ficam um
                  ponto menores; cortar com reticências esconderia justamente a
                  palavra que diferencia ("ação comercial", "procedimento"). */}
              <span className="text-[9.5px] sm:text-[13px] font-semibold text-center leading-tight px-0.5">{label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 sm:py-7">
        {aba === 'acoes' && (
          <VitrineAcoes acoes={dados.acoes} servicos={dados.servicos}
            profissionais={dados.profissionais} whatsapp={salao.whatsapp} horario={dados.horario} />
        )}
        {aba === 'sugestao' && (
          <VitrineVotacao servicos={dados.servicos} token={params.slug} />
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

      <footer className="max-w-5xl mx-auto px-4 pb-8 pt-2 text-center">
        <p className="text-[11px] text-gray-400">{salao.nome}</p>
      </footer>
    </div>
  )
}
