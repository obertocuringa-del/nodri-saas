'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Mail, Link as LinkIcon, Check, X, Loader2, Phone } from 'lucide-react'

// ── Contatos da vitrine ─────────────────────────────────────────────────────
//
// Quem preenche o formulário do site cai aqui. Você conversa e, quando fizer
// sentido, libera o link que abre a página de planos para aquela pessoa.
//
// Enquanto não liberar, ela não vê preço nenhum: a página de planos exige o
// convite. Liberar não gera nada novo — o link já existe desde o primeiro
// contato, só passa a valer.

interface Lead {
  id: string; nome: string; sobrenome?: string; email: string; celular?: string
  estado?: string; cidade?: string; tipo_estabelecimento?: string
  sistema_atual: string; objetivo?: string
  token: string; liberado_em?: string | null; criado_em: string
}

export default function Contatos() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState<string | null>(null)

  async function carregar() {
    try {
      const d = await fetch('/api/leads').then(r => r.ok ? r.json() : [])
      setLeads(Array.isArray(d) ? d : [])
    } catch { /* lista vazia */ }
    setCarregando(false)
  }
  useEffect(() => { carregar() }, [])

  async function alternar(lead: Lead) {
    setOcupado(lead.id)
    const r = await fetch('/api/leads', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, liberar: !lead.liberado_em }),
    })
    const d = await r.json()
    setOcupado(null)
    if (!r.ok) { toast.error(d?.erro || 'Não foi possível'); return }

    setLeads(prev => prev.map(l => l.id === lead.id
      ? { ...l, liberado_em: d.liberado ? new Date().toISOString() : null } : l))

    if (d.url) {
      await navigator.clipboard.writeText(d.url).catch(() => {})
      toast.success('Link liberado e copiado — mande para o cliente')
    } else {
      toast.success('Acesso revogado')
    }
  }

  function copiarLink(lead: Lead) {
    const url = `https://www.nodri.com.br/planos?c=${lead.token}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado')
  }

  function whats(lead: Lead) {
    const url = `https://www.nodri.com.br/planos?c=${lead.token}`
    const texto = `Oi ${lead.nome.split(' ')[0]}! Aqui é do NODRI. Segue o link com os planos: ${url}`
    window.open(`https://wa.me/55${(lead.celular || '').replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`, '_blank')
  }

  if (carregando) {
    return <div className="nodri-card p-6 text-center text-nodri-t3 text-sm">Carregando contatos…</div>
  }

  if (!leads.length) {
    return (
      <div className="nodri-card p-8 text-center">
        <Mail size={30} className="mx-auto mb-3 text-nodri-t3" />
        <p className="text-nodri-t1 text-sm font-semibold">Nenhum contato ainda</p>
        <p className="text-nodri-t3 text-[12px] mt-1">
          Quem preencher o formulário em nodri.com.br aparece aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {leads.map(l => {
        const liberado = !!l.liberado_em
        return (
          <div key={l.id} className={`nodri-card p-4 border-l-4 ${liberado ? 'border-l-nodri-green' : 'border-l-nodri-amber'}`}>
            <div className="flex items-start gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-bold text-nodri-t1">{l.nome} {l.sobrenome || ''}</span>
                  <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold ${liberado ? 'bg-nodri-green/12 text-nodri-green' : 'bg-nodri-amber/12 text-nodri-amber'}`}>
                    {liberado ? 'ACESSO LIBERADO' : 'AGUARDANDO VOCÊ'}
                  </span>
                </div>

                <div className="text-[11.5px] text-nodri-t2 mt-1">
                  {l.email}{l.celular ? ` · ${l.celular}` : ''}
                  {l.cidade ? ` · ${l.cidade}${l.estado ? '/' + l.estado : ''}` : ''}
                </div>

                {/* O que muda a conversa de venda fica em destaque. */}
                <div className="flex gap-2 flex-wrap mt-2">
                  <span className="text-[10px] px-2 py-1 rounded bg-nodri-cyan/10 text-nodri-cyan font-semibold">
                    Usa hoje: {l.sistema_atual}
                  </span>
                  {l.tipo_estabelecimento && (
                    <span className="text-[10px] px-2 py-1 rounded bg-nodri-surface text-nodri-t2">{l.tipo_estabelecimento}</span>
                  )}
                  {l.objetivo && (
                    <span className="text-[10px] px-2 py-1 rounded bg-nodri-surface text-nodri-t2">Quer: {l.objetivo}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => alternar(l)} disabled={ocupado === l.id}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50 ${liberado ? 'border border-nodri-border text-nodri-t2' : 'bg-nodri-green text-white'}`}>
                  {ocupado === l.id ? <Loader2 size={11} className="animate-spin" />
                    : liberado ? <X size={11} /> : <Check size={11} />}
                  {liberado ? 'Revogar' : 'Liberar planos'}
                </button>

                {liberado && (
                  <>
                    <button onClick={() => copiarLink(l)}
                      className="px-2.5 py-1.5 rounded-lg border border-nodri-border text-nodri-t2 text-[11px] font-bold flex items-center gap-1.5">
                      <LinkIcon size={11} /> Copiar link
                    </button>
                    {l.celular && (
                      <button onClick={() => whats(l)}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 text-white"
                        style={{ background: '#25D366' }}>
                        <Phone size={11} /> WhatsApp
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
