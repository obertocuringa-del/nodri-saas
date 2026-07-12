import NavegacaoGlobal from '@/components/salon/NavegacaoGlobal'

// Layout que envolve todas as páginas de /salon — navegação global flutuante:
// Voltar (histórico), Início e Busca ultra inteligente (Ctrl+K)
export default function SalonLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <NavegacaoGlobal />
    </>
  )
}
