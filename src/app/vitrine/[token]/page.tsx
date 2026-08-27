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
  { id: 'sugestao', label: 'Sugerir', icone: ThumbsUp },
  { id: 'precos', label: 'Preços', icone: Tag },
  { id: 'agendar', label: 'Agendar', icone: CalendarPlus },
]

export default function VitrinePage({ params }: { params: { token: string } }) {
  const [dados, setDados] = useState<DadosVitrine | null>(null)
  const [erro, setErro] = useState(false)
  const [aba, setAba] = useState<Aba>('acoes')

  useEffect(() => {
    fetch(`/api/vitrine/${params.token}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setDados)
      .catch(() => setErro(true))
  }, [params.token])

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
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-5 text-center">
          {salao.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={salao.logo} alt={salao.nome} className="h-14 mx-auto object-contain" />
          ) : (
            <h1 className="font-bold text-[20px] text-gray-900">{salao.nome}</h1>
          )}
        </div>

        <nav className="max-w-3xl mx-auto px-2 flex">
          {ABAS.map(({ id, label, icone: Icone }) => (
            <button key={id} onClick={() => setAba(id)}
              className={'flex-1 flex flex-col items-center gap-1 py-2.5 border-b-2 transition-all '
                + (aba === id
                  ? 'border-[var(--vt-cor)] text-[var(--vt-cor)]'
                  : 'border-transparent text-gray-400')}>
              <Icone size={18} />
              <span className="text-[11px] font-semibold">{label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5">
        {aba === 'acoes' && (
          <VitrineAcoes acoes={dados.acoes} salao={salao.nome} whatsapp={salao.whatsapp} />
        )}
        {aba === 'sugestao' && (
          <VitrineVotacao servicos={dados.servicos} token={params.token} />
        )}
        {aba === 'precos' && (
          <VitrinePrecos servicos={dados.servicos} />
        )}
        {aba === 'agendar' && (
          <VitrineAgendar
            servicos={dados.servicos}
            profissionais={dados.profissionais}
            acoes={dados.acoes}
            salao={salao.nome}
            whatsapp={salao.whatsapp}
          />
        )}
      </main>

      <footer className="max-w-3xl mx-auto px-4 pb-8 pt-2 text-center">
        <p className="text-[11px] text-gray-400">{salao.nome}</p>
      </footer>
    </div>
  )
}
