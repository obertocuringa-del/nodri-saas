'use client'

// Modal de avaliação de um POP — usado em dois lugares:
//  • na página avulsa do POP (/conteudo/[categoria]), escolhendo o profissional;
//  • na aba POPS do perfil do profissional, com o profissional já fixado.
//
// profFixo: quando vem preenchido, avalia direto aquele profissional (sem
// escolher numa lista). Salvo em salao_config na chave avaliacao_pop_<profId>.

import { useMemo, useState } from 'react'
import { Loader2, CheckCircle, X } from 'lucide-react'
import { AVALIACOES_POP, faixaResultado, type ModeloAvaliacao } from '@/lib/popAvaliacoes'

interface ProfOpcao { id: string; nome: string; cargo: string }

export default function ModalAvaliarPop({ doc, profs = [], profFixo, onClose, onSalvo }: {
  doc: any
  profs?: ProfOpcao[]
  profFixo?: { id: string; nome: string; cargo?: string }
  onClose: () => void
  onSalvo?: () => void
}) {
  const [profId, setProfId] = useState(profFixo?.id || '')
  const modelo: ModeloAvaliacao | undefined = AVALIACOES_POP[doc?.id]
  const [respostas, setRespostas] = useState<Record<string, 'sim' | 'nao'>>({})
  const [naoAplica, setNaoAplica] = useState<Record<number, boolean>>({})
  const [comp, setComp] = useState<Record<number, number>>({})
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const chave = (si: number, ii: number) => `${si}-${ii}`

  const calc = useMemo(() => {
    if (!modelo) return { secoes: [] as any[], obtido: 0, possivel: 0, pct: 0 }
    let obtido = 0, possivel = 0
    const secoes = modelo.secoes.map((s, si) => {
      const aplica = !(s.condicional && naoAplica[si])
      const total = s.itens.length
      const sim = s.itens.reduce((a, _it, ii) => a + (respostas[chave(si, ii)] === 'sim' ? 1 : 0), 0)
      const nota = aplica && total ? (sim / total) * s.pontos : 0
      if (aplica) { obtido += nota; possivel += s.pontos }
      return { titulo: s.titulo, pontos: s.pontos, aplica, sim, total, nota: Math.round(nota * 10) / 10 }
    })
    const pct = possivel > 0 ? Math.round((obtido / possivel) * 100) : 0
    return { secoes, obtido: Math.round(obtido * 10) / 10, possivel, pct }
  }, [modelo, respostas, naoAplica])

  const faixa = faixaResultado(calc.pct)

  const mediaComp = useMemo(() => {
    const notas = (modelo?.comportamental || []).map((_c, i) => comp[i]).filter(n => !!n) as number[]
    if (!notas.length) return 0
    return Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10
  }, [modelo, comp])

  async function salvar() {
    if (!profId) { setMsg('Selecione um profissional.'); return }
    if (!modelo) return
    setSalvando(true); setMsg('')
    const respDetalhe: { secao: string; item: string; ok: boolean }[] = []
    modelo.secoes.forEach((s, si) => {
      if (s.condicional && naoAplica[si]) return
      s.itens.forEach((item, ii) => respDetalhe.push({ secao: s.titulo, item, ok: respostas[chave(si, ii)] === 'sim' }))
    })
    const nova = {
      id: Date.now(),
      popId: doc.id, popTitulo: doc.titulo, categoria: '',
      data: new Date().toISOString(),
      pct: calc.pct, obtido: calc.obtido, possivel: calc.possivel,
      faixa: faixa.label,
      secoes: calc.secoes.map(s => ({ titulo: s.titulo, pontos: s.pontos, nota: s.nota, sim: s.sim, total: s.total, aplica: s.aplica })),
      respostas: respDetalhe,
      comportamental: (modelo.comportamental || []).map((criterio, i) => ({ criterio, nota: comp[i] || 0 })),
      mediaComportamental: mediaComp,
    }
    try {
      const atualRes = await fetch(`/api/salon/grid?chave=avaliacao_pop_${profId}`, { credentials: 'include' })
      const atual = atualRes.ok ? await atualRes.json() : null
      const lista = Array.isArray(atual?.avaliacoes) ? atual.avaliacoes : []
      const res = await fetch('/api/salon/grid', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: `avaliacao_pop_${profId}`, doc: { avaliacoes: [...lista, nova] } }),
      })
      if (!res.ok) { setMsg('Erro ao salvar. Tente novamente.'); setSalvando(false); return }
      setMsg('✅ Avaliação salva! Veja em POPs → Avaliação POP.')
      onSalvo?.()
      setTimeout(onClose, 1500)
    } catch { setMsg('Erro de conexão.'); setSalvando(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.6)' }} onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl overflow-hidden flex flex-col" style={{ background: '#faf9f7', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#e8e6e0', background: '#fff' }}>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#5b4fcf' }}>Avaliar processo</p>
            <p className="text-sm font-bold text-[#1a1a1a] truncate">{doc.titulo}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: '#767069' }}><X size={18} /></button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {profFixo ? (
            <div className="mb-4 rounded-xl px-3 py-2.5" style={{ background: '#f0eefb', border: '1.5px solid #5b4fcf40' }}>
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#767069' }}>Avaliando</p>
              <p className="text-sm font-bold" style={{ color: '#5b4fcf' }}>{profFixo.nome}{profFixo.cargo ? ` · ${profFixo.cargo}` : ''}</p>
            </div>
          ) : (<>
            <label className="text-xs font-bold block mb-1" style={{ color: '#767069' }}>Profissional</label>
            {profs.length === 0 ? (
              <p className="text-xs mb-3 rounded-lg p-3" style={{ background: '#f59e0b15', color: '#92400e' }}>Nenhum profissional desta categoria encontrado. Verifique o cargo dos profissionais.</p>
            ) : (
              <select value={profId} onChange={e => setProfId(e.target.value)}
                className="w-full mb-4 px-3 py-2.5 rounded-xl text-sm text-[#1a1a1a] focus:outline-none" style={{ background: '#fff', border: '1.5px solid #5b4fcf40' }}>
                <option value="">— Selecione —</option>
                {profs.map(p => <option key={p.id} value={p.id}>{p.nome}{p.cargo ? ` (${p.cargo})` : ''}</option>)}
              </select>
            )}
          </>)}

          {!modelo ? (
            <p className="text-xs rounded-lg p-3" style={{ background: '#f59e0b15', color: '#92400e' }}>
              A avaliação deste POP ainda não foi cadastrada. Envie o modelo de avaliação (seções e itens) para este POP e ele aparece aqui.
            </p>
          ) : (
            <div className="space-y-3">
              {modelo.secoes.map((s, si) => {
                const c = calc.secoes[si]
                const desativada = s.condicional && naoAplica[si]
                return (
                  <div key={si} className="rounded-xl overflow-hidden border" style={{ borderColor: '#e8e6e0', background: '#fff', opacity: desativada ? .55 : 1 }}>
                    <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: '#f7f6fb' }}>
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold" style={{ color: '#5b4fcf' }}>{si + 1}. {s.titulo} <span style={{ color: '#767069', fontWeight: 500 }}>({s.pontos} pts)</span></p>
                        {s.nota && <p className="text-[10px]" style={{ color: '#8a8699' }}>{s.nota}</p>}
                      </div>
                      <span className="text-[12px] font-bold shrink-0" style={{ color: desativada ? '#a8a6b4' : (c.nota >= s.pontos * 0.8 ? '#059669' : c.nota >= s.pontos * 0.6 ? '#b45309' : '#b91c1c') }}>
                        {desativada ? 'N/A' : `${c.nota} / ${s.pontos}`}
                      </span>
                    </div>
                    {s.condicional && (
                      <label className="flex items-center gap-2 px-3 py-1.5 text-[11px] cursor-pointer" style={{ color: '#767069', borderBottom: '1px solid #f0eef7' }}>
                        <input type="checkbox" checked={!!naoAplica[si]} onChange={() => setNaoAplica(m => ({ ...m, [si]: !m[si] }))} className="accent-purple-600" />
                        Não se aplica nesta avaliação (não conta pontos)
                      </label>
                    )}
                    {!desativada && (
                      <div className="divide-y" style={{ borderColor: '#f2f0f7' }}>
                        {s.itens.map((item, ii) => {
                          const val = respostas[chave(si, ii)]
                          return (
                            <div key={ii} className="flex items-center justify-between gap-2 px-3 py-2">
                              <span className="text-[12.5px] flex-1" style={{ color: '#3a3835' }}>{item}</span>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => setRespostas(r => ({ ...r, [chave(si, ii)]: 'sim' }))}
                                  className="w-11 py-1 rounded-lg text-[11px] font-bold" style={{ background: val === 'sim' ? '#10b981' : '#f0f0f2', color: val === 'sim' ? '#fff' : '#767069' }}>Sim</button>
                                <button onClick={() => setRespostas(r => ({ ...r, [chave(si, ii)]: 'nao' }))}
                                  className="w-11 py-1 rounded-lg text-[11px] font-bold" style={{ background: val === 'nao' ? '#ef4444' : '#f0f0f2', color: val === 'nao' ? '#fff' : '#767069' }}>Não</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {!!modelo.comportamental?.length && (
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#e8e6e0', background: '#fff' }}>
                  <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: '#f7f6fb' }}>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold" style={{ color: '#5b4fcf' }}>Avaliação Comportamental</p>
                      <p className="text-[10px]" style={{ color: '#8a8699' }}>Nota de 1 a 5 · não entra nos 100 pontos</p>
                    </div>
                    <span className="text-[12px] font-bold shrink-0" style={{ color: mediaComp >= 4 ? '#059669' : mediaComp >= 3 ? '#b45309' : mediaComp ? '#b91c1c' : '#a8a6b4' }}>
                      Média {mediaComp || '—'}
                    </span>
                  </div>
                  <div className="divide-y" style={{ borderColor: '#f2f0f7' }}>
                    {modelo.comportamental.map((criterio, ci) => (
                      <div key={ci} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="text-[12.5px] flex-1" style={{ color: '#3a3835' }}>{criterio}</span>
                        <div className="flex gap-1 shrink-0">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button key={n} onClick={() => setComp(c => ({ ...c, [ci]: n }))}
                              className="w-7 py-1 rounded-lg text-[11px] font-bold"
                              style={{ background: comp[ci] === n ? '#5b4fcf' : '#f0f0f2', color: comp[ci] === n ? '#fff' : '#767069' }}>{n}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {modelo && (
          <div className="px-5 py-3 border-t" style={{ borderColor: '#e8e6e0', background: '#fff' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold" style={{ color: faixa.cor }}>{calc.pct}%</span>
                <span className="text-[12px] font-bold px-2 py-1 rounded-full" style={{ background: faixa.cor + '20', color: faixa.cor }}>{faixa.emoji} {faixa.label}</span>
              </div>
              <span className="text-[11px] text-right" style={{ color: '#767069' }}>
                {calc.obtido} de {calc.possivel} pts
                {!!modelo.comportamental?.length && <><br />Comportamental: <b>{mediaComp || '—'}</b> / 5</>}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px]" style={{ color: msg.startsWith('✅') ? '#059669' : '#b91c1c' }}>{msg}</span>
              <button onClick={salvar} disabled={salvando || !profId}
                className="flex items-center gap-2 text-sm font-bold px-5 py-2 rounded-xl transition-all"
                style={{ background: '#5b4fcf', color: '#fff', opacity: (salvando || !profId) ? .5 : 1 }}>
                {salvando ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />} Salvar avaliação
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
