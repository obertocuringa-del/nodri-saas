'use client'

// ── Cupons gerados: quem pegou e quantas trouxe ─────────────────────────────
//
// Pedido do dono (12/10/2026): ver do lado de dentro QUEM gerou cupom —
// "para eu saber se está dando certo ou não".
//
// Por isso a tela não mostra só a conta. Cem cupons que não trouxeram
// ninguém é uma campanha parada; dez que trouxeram trinta é uma campanha
// funcionando. O que responde a pergunta dele é a COLUNA DA DIREITA: quantas
// cada cliente indicou e quantas dessas já passaram pelo salão.
//
// Nome e telefone saem inteiros aqui: é tela de balcão, atrás de login. Na
// página pública o mesmo dado sai abreviado ("Maria S."), porque lá basta o
// telefone para entrar.

import { useState } from 'react'
import { Users, X, Loader2, Search } from 'lucide-react'

type Item = {
  id: string; codigo: string; nome: string; telefone: string
  criado_em: string; indicadas: number; atendidas: number
}
type Dados = {
  lista: Item[]; total: number; comIndicacao: number
  indicadasTotal: number; atendidasTotal: number
}

const dataBR = (s: string) => {
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
const foneBonito = (s: string) => {
  const n = String(s || '').replace(/\D/g, '').replace(/^55/, '')
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return s || '—'
}

export default function CuponsGerados() {
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [dados, setDados] = useState<Dados | null>(null)
  const [busca, setBusca] = useState('')

  async function abrir() {
    setAberto(true)
    if (dados) return               // já carregou nesta visita
    setCarregando(true)
    try {
      const r = await fetch('/api/salon/cupons?acao=gerados')
      if (r.ok) setDados(await r.json())
    } catch { /* a tela mostra o vazio */ }
    setCarregando(false)
  }

  if (!aberto) {
    return (
      <button onClick={abrir}
        className="nodri-card w-full p-3 mb-4 flex items-center gap-2.5 text-left hover:border-nodri-cyan transition">
        <Users size={17} className="text-nodri-cyan shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[13px]">Cupons gerados</p>
          <p className="text-[11.5px] text-nodri-t3">
            Quem já pegou o cupom e quantas clientes cada uma trouxe.
          </p>
        </div>
      </button>
    )
  }

  const lista = (dados?.lista || []).filter(i => {
    const q = busca.trim().toLowerCase()
    if (!q) return true
    return (i.nome || '').toLowerCase().includes(q)
      || (i.codigo || '').toLowerCase().includes(q)
      || String(i.telefone || '').includes(q.replace(/\D/g, ''))
  })

  return (
    <div className="nodri-card p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Users size={16} className="text-nodri-cyan shrink-0" />
        <h3 className="font-bold text-[13px] flex-1">Cupons gerados</h3>
        <button onClick={() => setAberto(false)} className="text-nodri-t3 hover:text-nodri-t1 p-1"><X size={15} /></button>
      </div>

      {carregando && (
        <div className="py-6 flex justify-center"><Loader2 size={18} className="animate-spin text-nodri-t3" /></div>
      )}

      {!carregando && dados && dados.total === 0 && (
        <p className="text-[12.5px] text-nodri-t3 py-2">
          Nenhuma cliente gerou cupom ainda. O link fica na aba Cupom de indicação da página pública.
        </p>
      )}

      {!carregando && dados && dados.total > 0 && (
        <>
          {/* Os quatro números que dizem se a campanha anda. "Trouxeram
              alguém" é o que separa cupom gerado de cupom usado. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {[
              ['Geraram cupom', dados.total],
              ['Trouxeram alguém', dados.comIndicacao],
              ['Indicadas', dados.indicadasTotal],
              ['Já atendidas', dados.atendidasTotal],
            ].map(([rot, val]) => (
              <div key={String(rot)} className="bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2">
                <p className="text-[10.5px] text-nodri-t3 uppercase tracking-wide">{rot}</p>
                <p className="font-bold text-[17px] leading-tight">{val}</p>
              </div>
            ))}
          </div>

          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nodri-t3" />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Procurar por nome, código ou telefone"
              className="w-full bg-nodri-surface border border-nodri-border rounded-lg pl-8 pr-3 py-2 text-[12.5px] outline-none focus:border-nodri-cyan" />
          </div>

          <div className="max-h-[420px] overflow-y-auto -mx-1 px-1">
            {lista.length === 0 && (
              <p className="text-[12.5px] text-nodri-t3 py-3">Nada com esse termo.</p>
            )}
            {lista.map(i => (
              <div key={i.id}
                className="flex items-center gap-3 py-2 border-b border-nodri-border last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[12.5px] truncate">{i.nome || 'Sem nome'}</p>
                  <p className="text-[11px] text-nodri-t3 truncate">
                    {foneBonito(i.telefone)} · {i.codigo} · {dataBR(i.criado_em)}
                  </p>
                </div>
                {/* Quem ainda não trouxe ninguém fica em cinza: a lista se
                    lê de relance e o que salta é quem está indicando. */}
                <div className="shrink-0 text-right">
                  {i.indicadas === 0 ? (
                    <span className="text-[11px] text-nodri-t3">ainda não indicou</span>
                  ) : (
                    <>
                      <p className="font-bold text-[12.5px] text-nodri-cyan leading-tight">
                        {i.indicadas} indicada{i.indicadas === 1 ? '' : 's'}
                      </p>
                      <p className="text-[10.5px] text-nodri-t3">{i.atendidas} já atendida{i.atendidas === 1 ? '' : 's'}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
