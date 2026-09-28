import { cookies } from 'next/headers'
import NavegacaoGlobal from '@/components/salon/NavegacaoGlobal'
import GuardaCacheDoSalao from '@/components/salon/GuardaCacheDoSalao'
import { verifyJWT } from '@/lib/auth'

// Layout que envolve todas as páginas de /salon — barra global no TOPO:
// Voltar (histórico), Início e Busca ultra inteligente (Ctrl+K)
export default async function SalonLayout({ children }: { children: React.ReactNode }) {
  // De qual salão é esta sessão: a guarda apaga o cache do navegador quando
  // o salão muda, para dado de um nunca aparecer na tela de outro.
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  return (
    <>
      <GuardaCacheDoSalao salaoId={payload?.salaoId || null} />
      <NavegacaoGlobal />
      {children}
    </>
  )
}
