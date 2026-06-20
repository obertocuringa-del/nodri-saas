import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import WhatsAppButton from '@/components/WhatsAppButton'
import './globals.css'

export const metadata: Metadata = {
  title: 'NODRI — Sistema de Gestão de Salões',
  description: 'Plataforma SaaS para gerenciamento de salões de beleza',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <WhatsAppButton />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#1a1a1a',
              border: '1px solid #e8e6e0',
              borderRadius: '10px',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#ffffff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
          }}
        />
      </body>
    </html>
  )
}
