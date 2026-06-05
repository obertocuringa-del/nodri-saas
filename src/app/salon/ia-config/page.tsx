'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function IAConfigPage() {
  const [iaAtiva, setIaAtiva] = useState<boolean | null>(null)
  const [contexto, setContexto] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Verificar status da IA no salão
        const resStatus = await fetch('/api/ia/status')
        if (resStatus.ok) {
          const dataStatus = await resStatus.json()
          setIaAtiva(dataStatus.ia_ativa ?? false)
        }

        // Buscar contexto adicional do salão
        const resConfig = await fetch('/api/ia/config')
        if (resConfig.ok) {
          const dataConfig = await resConfig.json()
          setContexto(dataConfig.contexto_adicional || '')
        }
      } catch {
        // silencioso
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/ia/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contexto_adicional: contexto }),
      })
      if (res.ok) {
        toast.success('Configurações salvas!')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-nodri-dark flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-nodri-cyan" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-nodri-dark">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3">
        <h1 className="font-syne font-bold text-[16px] text-nodri-t1">🤖 IA NODRI</h1>
        <p className="text-[11px] text-nodri-t3 mt-0.5">Assistente inteligente para gestão do seu salão</p>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">

        {/* Status da IA */}
        {iaAtiva ? (
          <div className="rounded-xl p-4 border border-green-500/30 bg-green-500/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-[24px]">🤖</div>
            <div>
              <div className="font-syne font-bold text-[14px] text-green-400">IA NODRI Ativada</div>
              <div className="text-[11px] text-nodri-t2 mt-0.5">A IA está disponível para este salão. A chave e o modelo são gerenciados pelo administrador NODRI.</div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl p-4 border border-nodri-border bg-nodri-surface/50 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-nodri-border/30 flex items-center justify-center text-[24px] grayscale opacity-50">🤖</div>
            <div>
              <div className="font-syne font-bold text-[14px] text-nodri-t2">IA não disponível</div>
              <div className="text-[11px] text-nodri-t3 mt-0.5">Entre em contato com o suporte NODRI para ativar a IA para o seu salão.</div>
            </div>
          </div>
        )}

        {/* Instruções adicionais do salão — só exibe se IA estiver ativa */}
        {iaAtiva && (
          <form onSubmit={salvar} className="bg-nodri-surface border border-nodri-border rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="font-syne font-bold text-[13px]">📝 Instruções adicionais do salão</h2>
              <p className="text-[11px] text-nodri-t2 mt-1">
                Dê um contexto específico sobre o seu salão para personalizar as respostas da IA: especialidades, foco, estilo de atendimento, etc.
              </p>
            </div>
            <textarea
              className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-nodri-cyan/40 transition-colors text-nodri-t1 resize-none h-32"
              placeholder="Ex: Nosso salão é especializado em coloração. Foco em clientes premium. Não atendemos crianças. Horário de pico é sábado de manhã..."
              value={contexto}
              onChange={e => setContexto(e.target.value)}
            />
            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nodri-cyan text-nodri-dark text-[12px] font-bold hover:brightness-110 disabled:opacity-50">
                {saving ? <><Loader2 size={13} className="animate-spin" /> Salvando...</> : <><Save size={13} /> Salvar Instruções</>}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
