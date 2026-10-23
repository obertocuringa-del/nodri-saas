'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck, Loader2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

// Faixa no cabeçalho da conversa (CRM). Aparece quando a conversa está como
// "Confirmou" só porque alguém clicou no CRM: a confirmação no sistema pode
// continuar pendente e a cliente sem o "Combinado". O botão põe o pedido na
// fila da confirmação automática. Ver src/app/api/crm/confirmacao-pendente.
//
// Os textos daqui são lidos pela recepção: ficam genéricos de propósito, sem
// dizer por onde a confirmação passa (decisão do dono, 23/10/2026).

export default function FaixaConfirmacaoPendente({ conversaId, estado }: { conversaId: string; estado: string }) {
  const [info, setInfo] = useState<{ so_crm: boolean; na_fila: boolean } | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    setInfo(null)
    if (estado !== 'confirmado') return
    let vivo = true
    const ler = () => fetch(`/api/crm/confirmacao-pendente?conversa=${encodeURIComponent(conversaId)}`, { credentials: 'include', cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null)).then(d => { if (vivo && d) setInfo(d) }).catch(() => {})
    ler()
    // Depois de pedir, leva alguns minutos: a faixa se atualiza sozinha.
    const t = setInterval(ler, 20000)
    return () => { vivo = false; clearInterval(t) }
  }, [conversaId, estado])

  if (estado !== 'confirmado' || !info || (!info.so_crm && !info.na_fila)) return null

  async function confirmar() {
    if (!window.confirm('Confirmar este agendamento no sistema agora?\n\nSe a cliente ainda não recebeu resposta depois do "Sim" dela, o sistema também manda o "Combinado".')) return
    setEnviando(true)
    try {
      const r = await fetch('/api/crm/confirmacao-pendente', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversa_id: conversaId }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Não deu certo')
      setInfo({ so_crm: true, na_fila: true })
      toast.success(d.ja_na_fila ? 'Esta confirmação já está em andamento.' : 'Pedido enviado. A confirmação está sendo feita.')
    } catch (e: any) { toast.error(e.message) } finally { setEnviando(false) }
  }

  const andamento = info.na_fila
  return (
    <div className="mt-3 flex items-center gap-3 flex-wrap rounded-xl px-3 py-2.5"
      style={{ background: andamento ? '#eef4fb' : '#fbf2e0', border: `1px solid ${andamento ? '#cfe0f3' : '#ecd9ae'}` }}>
      {andamento ? <Loader2 size={15} className="animate-spin flex-shrink-0" style={{ color: '#3b6ea5' }} />
        : <AlertTriangle size={15} className="flex-shrink-0" style={{ color: '#9a6b12' }} />}
      <p className="text-[12px] flex-1 min-w-0" style={{ color: andamento ? '#2f5788' : '#7a5410' }}>
        {andamento
          ? <><strong>Confirmação em andamento.</strong> Este aviso some quando terminar.</>
          : <><strong>Confirmado só no CRM.</strong> O clique muda a etiqueta, mas a confirmação no sistema pode estar pendente. Confira se o agendamento está confirmado lá.</>}
      </p>
      {!andamento && (
        <button onClick={confirmar} disabled={enviando}
          className="px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5 flex-shrink-0 transition duration-100 hover:brightness-95 active:scale-[.98] disabled:opacity-60"
          style={{ background: '#a8624f', color: '#fff' }}>
          {enviando ? <Loader2 size={13} className="animate-spin" /> : <CalendarCheck size={13} />} Confirmar no sistema agora
        </button>
      )}
    </div>
  )
}
