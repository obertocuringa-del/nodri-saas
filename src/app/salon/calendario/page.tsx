'use client'
import CalendarioEditavel from '@/components/salon/CalendarioEditavel'

export default function CalendarioPage() {
  return <CalendarioEditavel chave="calendario" titulo="Calendário" corTema="#5b4fcf" camposGrandes mostrarLembrete={false} />
}
