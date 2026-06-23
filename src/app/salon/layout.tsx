import BotaoInicio from '@/components/salon/BotaoInicio'

// Layout que envolve todas as páginas de /salon — adiciona o botão "Início" flutuante
export default function SalonLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BotaoInicio />
    </>
  )
}
