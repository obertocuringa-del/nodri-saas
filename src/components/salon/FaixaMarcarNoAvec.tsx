'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck, Loader2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

// Faixa no cabeçalho da conversa (CRM). Aparece quando a conversa está como
// "Confirmou" só porque alguém clicou no CRM: o Avec pode continuar em
// "Agendado" (não azul) e a cliente sem o "Combinado". O botão põe o pedido na
// fila da automação, que marca o Avec. Ver src/app/api/crm/marcar-avec.

export default function FaixaMarcarNoAvec({ conversaId, estado }: { conversaId: string; estado: string }) {
  const [info, setInfo] = useState<{ so_crm: boolean; na_fila: boolean } | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    setInfo(null)
    if (estado !== 'confirmado') return
    let vivo = true
    const ler = () => fetch(`/api/crm/marcar-avec?conversa=${encodeURIComponent(conversaId)}`, { credentials: 'include', cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null)).then(d => { if (vivo && d) setInfo(d) }).catch(() => {})
    ler()
    // Depois de pedir, a extensão leva alguns minutos: a faixa se atualiza sozinha.
    const t = setInterval(ler, 20000)
    return () => { vivo = false; clearInterval(t) }
  }, [conversaId, estado])

  if (estado !== 'confirmado' || !info || (!info.so_crm && !info.na_fila)) return null

  async function marcar() {
    if (!window.confirm('Marcar este agendamento como Confirmado no Avec?\n\nA extensão procura a cliente no Avec e marca. Se a cliente ainda não recebeu resposta depois do "Sim" dela, o sistema também manda o "Combinado".')) return
    setEnviando(true)
    try {
      const r = await fetch('/api/crm/marcar-avec', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversa_id: conversaId }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Não deu certo')
      setInfo({ so_crm: true, na_fila: true })
      toast.success(d.ja_na_fila ? 'O pedido já estava na fila.' : 'Pedido enviado. A extensão marca no Avec em instantes.')
    } catch (e: any) { toast.error(e.message) } finally { setEnviando(false) }
  }

  const naFila = info.na_fila
  return (
    <div className="mt-3 flex items-center gap-3 flex-wrap rounded-xl px-3 py-2.5"
      style={{ background: naFila ? '#eef4fb' : '#fbf2e0', border: `1px solid ${naFila ? '#cfe0f3' : '#ecd9ae'}` }}>
      {naFila ? <Loader2 size={15} className="animate-spin flex-shrink-0" style={{ color: '#3b6ea5' }} />
        : <AlertTriangle size={15} className="flex-shrink-0" style={{ color: '#9a6b12' }} />}
      <p className="text-[12px] flex-1 min-w-0" style={{ color: naFila ? '#2f5788' : '#7a5410' }}>
        {naFila
          ? <><strong>Pedido enviado.</strong> A extensão está marcando no Avec; isto some quando terminar.</>
          : <><strong>Confirmado só no CRM.</strong> O clique muda a etiqueta, mas não marca o Avec. Confira se o agendamento está azul lá.</>}
      </p>
      {!naFila && (
        <button onClick={marcar} disabled={enviando}
          className="px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5 flex-shrink-0 transition duration-100 hover:brightness-95 active:scale-[.98] disabled:opacity-60"
          style={{ background: '#a8624f', color: '#fff' }}>
          {enviando ? <Loader2 size={13} className="animate-spin" /> : <CalendarCheck size={13} />} Marcar no Avec agora
        </button>
      )}
    </div>
  )
}
