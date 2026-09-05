'use client'
import { useEffect, useState } from 'react'
import { Users, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'

// "Quem faz este serviço", dentro do próprio serviço.
//
// O caminho que existia é pelo avesso do trabalho real: para dizer quem faz um
// serviço novo era preciso abrir profissional por profissional e achar o
// serviço no meio de uma lista de 135. Com dez manicures, dez telas para uma
// decisão só — e por isso serviço novo ficava meses sem ninguém habilitado.
//
// A habilitação continua morando em `servicos_habilitados`, na profissional.
// Isto não é cadastro paralelo: é a mesma lista, escrita pelo outro lado.

export interface ProfDoServico { id: string; nome: string; cargo: string; habilitado: boolean }

export default function ProfissionaisDoServico({ servicoId, selecionados, aoMudar }: {
  /** Vazio em serviço novo: aí a lista abre desmarcada e grava depois de criar. */
  servicoId?: string
  selecionados: string[] | null
  aoMudar: (ids: string[]) => void
}) {
  const [profs, setProfs] = useState<ProfDoServico[]>([])
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    fetch(`/api/servicos/profissionais${servicoId ? `?servicoId=${encodeURIComponent(servicoId)}` : ''}`,
      { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!vivo) return
        const lista: ProfDoServico[] = Array.isArray(d?.profissionais) ? d.profissionais : []
        setProfs(lista)
        // Só semeia se a página ainda não tem escolha: senão, uma releitura
        // apagaria o que a pessoa acabou de marcar.
        if (selecionados === null) aoMudar(lista.filter(p => p.habilitado).map(p => p.id))
      })
      .catch(() => {})
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicoId])

  const marcados = selecionados || []
  const alternar = (id: string) =>
    aoMudar(marcados.includes(id) ? marcados.filter(x => x !== id) : [...marcados, id])

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-nodri-t3 py-2">
        <Loader2 size={12} className="animate-spin" /> carregando profissionais…
      </div>
    )
  }
  if (!profs.length) return null

  return (
    <div className="border border-nodri-border rounded-lg overflow-hidden">
      <button type="button" onClick={() => setAberto(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
        {aberto ? <ChevronDown size={14} className="text-nodri-t3" /> : <ChevronRight size={14} className="text-nodri-t3" />}
        <Users size={13} className="text-nodri-cyan" />
        <span className="text-[12px] font-medium text-nodri-t1">Quem faz este serviço</span>
        <span className="ml-auto text-[10.5px] text-nodri-t3 bg-nodri-border/40 px-2 py-0.5 rounded-full">
          {marcados.length} de {profs.length}
        </span>
      </button>

      {aberto && (
        <div className="border-t border-nodri-border p-3">
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            <button type="button" onClick={() => aoMudar(profs.map(p => p.id))}
              className="text-[10.5px] border border-nodri-border rounded-full px-2.5 py-1 text-nodri-t2">
              marcar todos
            </button>
            <button type="button" onClick={() => aoMudar([])}
              className="text-[10.5px] border border-nodri-border rounded-full px-2.5 py-1 text-nodri-t2">
              limpar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-64 overflow-y-auto">
            {profs.map(p => {
              const on = marcados.includes(p.id)
              return (
                <label key={p.id}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer border ${
                    on ? 'border-nodri-cyan/50 bg-nodri-cyan/10' : 'border-transparent hover:bg-nodri-border/20'}`}>
                  <input type="checkbox" checked={on} onChange={() => alternar(p.id)}
                    className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11.5px] text-nodri-t1 truncate">{p.nome}</span>
                  {p.cargo && <span className="text-[10px] text-nodri-t3 truncate ml-auto">{p.cargo}</span>}
                </label>
              )
            })}
          </div>

          <p className="text-[10.5px] text-nodri-t3 mt-2.5 leading-relaxed">
            Vale ao salvar o serviço. É a mesma habilitação que aparece no cadastro de
            cada profissional — muda aqui, muda lá.
          </p>
        </div>
      )}
    </div>
  )
}
