'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()
  
  useEffect(() => {
    async function performLogout() {
      try {
        // Chamar API de logout para limpar o cookie no servidor
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        // Limpar qualquer cookie no cliente também (fallback)
        document.cookie = 'nodri_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
        document.cookie = 'nodri_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=' + window.location.hostname + ';'
        
        // Limpar localStorage e sessionStorage se existirem dados
        try {
          localStorage.removeItem('user')
          localStorage.removeItem('nodri_token')
          sessionStorage.clear()
        } catch (e) {
          // Ignora erros de storage
        }
        
        // Pequeno delay para garantir que os cookies foram limpos
        setTimeout(() => {
          router.push('/login')
          router.refresh() // Força refresh dos dados do servidor
        }, 100)
        
      } catch (error) {
        console.error('Erro no logout:', error)
        // Fallback: redireciona mesmo com erro
        setTimeout(() => {
          router.push('/login')
          router.refresh()
        }, 100)
      }
    }
    
    performLogout()
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-nodri-dark">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-nodri-cyan mx-auto"></div>
        <p className="mt-4 text-nodri-t2 text-sm">Saindo do sistema...</p>
      </div>
    </div>
  )
}
