'use client'
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Check, RotateCcw, FileText, ExternalLink, Copy, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatarLinha, ehPix } from '@/lib/boleto'

// ── Fila de boletos / contas a pagar ────────────────────────────────────────
// Só LÊ o que já foi lançado nas Despesas Indiretas da Calculadora (qualquer mês)
// com o campo Vencimento preenchido. Marcar como pago grava apenas o selo de
// status — nenhum valor da calculadora é alterado.

interface Boleto {
  key: string; ano: number; mes: number; lista: 'fix' | 'extra'; idx: number
  nome: string; valor: number; venc: string; parcela: string; obs: string
  cod: string; grupo: string; pix: string; pago: boolean; pagoEm: string
}

// Um CARD é o que aparece na tela. Lançamento parcelado com o mesmo vencimento
// (é o caso do empréstimo aprovado) vira UM card com o valor somado: o
// Financeiro paga tudo de uma vez. Na Calculadora as parcelas continuam
// separadas por mês — juntar lá bagunçaria o total de cada mês.
interface Card {
  id: string; keys: string[]; qtd: number; meses: string
  nome: string; valor: number; venc: string; parcela: string; obs: string
  cod: string; pix: string; pago: boolean; pagoEm: string
}

const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const fmtR = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const isoBR = (iso: string) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso }
function dias(venc: string): number {
  const m = String(venc || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return 0
  const alvo = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const hj = new Date(); hj.setHours(0, 0, 0, 0)
  return Math.round((alvo.getTime() - hj.getTime()) / 86400000)
}

type Aba = 'vencidos' | 'hoje' | 'avencer' | 'pagos'

export default function BoletosFinanceiro({ cor = '#16a34a' }: { cor?: string }) {
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [podeBaixa, setPodeBaixa] = useState(false)
  const [loading, setLoading] = useState(true)
  const [semAcesso, setSemAcesso] = useState(false)
  // Começa FECHADO: a tela abre enxuta e você escolhe o que quer ver.
  // aba null = tudo recolhido (clicar de novo no card fecha)
  const [aba, setAba] = useState<Aba | null>(null)
  const [salvando, setSalvando] = useState<string | null>(null)

  async function carregar() {
    try {
      const r = await fetch('/api/salon/boletos', { credentials: 'include' })
      if (!r.ok) { setSemAcesso(true); setBoletos([]); setLoading(false); return }
      const d = await r.json()
      setBoletos(Array.isArray(d?.boletos) ? d.boletos : [])
      setPodeBaixa(!!d?.podeDarBaixa)
    } catch { /* silencioso — o bloco só não aparece */ }
    setLoading(false)
  }
  useEffect(() => { carregar() }, [])

  // Junta as parcelas do mesmo lançamento que vencem no mesmo dia
  const cards = useMemo<Card[]>(() => {
    const porGrupo = new Map<string, Card>()
    const soltos: Card[] = []
    for (const b of boletos) {
      const mes = `${MESES[b.mes] || b.mes}/${b.ano}`
      const novo: Card = {
        id: b.key, keys: [b.key], qtd: 1, meses: mes,
        nome: b.nome, valor: b.valor, venc: b.venc, parcela: b.parcela,
        obs: b.obs, cod: b.cod, pix: b.pix || '', pago: b.pago, pagoEm: b.pagoEm,
      }
      if (!b.grupo) { soltos.push(novo); continue }
      const gk = `${b.grupo}|${b.venc}|${b.pago ? 1 : 0}`
      const atual = porGrupo.get(gk)
      if (!atual) { porGrupo.set(gk, { ...novo, id: gk }); continue }
      atual.keys.push(b.key)
      atual.valor += b.valor
      atual.qtd += 1
      atual.parcela = ''                                  // deixa de ser "1/2"
      if (!atual.meses.split(' · ').includes(mes)) atual.meses += ` · ${mes}`
      if (!atual.cod && b.cod) atual.cod = b.cod
    }
    return [...soltos, ...Array.from(porGrupo.values())]
  }, [boletos])

  const grupos = useMemo(() => {
    const abertos = cards.filter(b => !b.pago)
    return {
      // vencidos: do vencimento mais próximo de hoje para o mais antigo
      vencidos: abertos.filter(b => dias(b.venc) < 0).sort((a, b) => b.venc < a.venc ? -1 : 1),
      hoje: abertos.filter(b => dias(b.venc) === 0),
      // a vencer: o próximo primeiro
      avencer: abertos.filter(b => dias(b.venc) > 0).sort((a, b) => a.venc < b.venc ? -1 : 1),
      // pagos: o pagamento mais recente primeiro
      pagos: cards.filter(b => b.pago).sort((a, b) => (b.pagoEm || '') < (a.pagoEm || '') ? -1 : 1),
    }
  }, [cards])

  // Dá baixa em TODAS as parcelas do card (o pagamento é um só)
  async function baixa(c: Card, pago: boolean) {
    setSalvando(c.id)
    try {
      let pagoEm = ''
      for (const key of c.keys) {
        const r = await fetch('/api/salon/boletos', {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, pago }),
        })
        if (!r.ok) {
          const e = await r.json().catch(() => ({}))
          toast.error(e.error || 'Não foi possível registrar')
          setSalvando(null)
          return
        }
        const d = await r.json()
        pagoEm = d?.pagoEm || pagoEm
      }
      const doCard = new Set(c.keys)
      setBoletos(prev => prev.map(x => doCard.has(x.key) ? { ...x, pago, pagoEm } : x))
      toast.success(pago ? `${c.nome} — pago` : `${c.nome} volta pra fila`)
    } catch { toast.error('Erro de conexão') }
    setSalvando(null)
  }

  // Código de barras: copiar pro app do banco e mostrar/esconder na tela
  const [codAberto, setCodAberto] = useState<Set<string>>(new Set())
  const toggleCod = (k: string) => setCodAberto(p => { const s = new Set(p); s.has(k) ? s.delete(k) : s.add(k); return s })
  async function copiarCod(b: Card) {
    const limpo = ehPix(b.cod) ? b.cod.trim() : b.cod.replace(/\D/g, '')
    try {
      await navigator.clipboard.writeText(limpo)
      toast.success(ehPix(b.cod) ? 'Pix copia-e-cola copiado' : 'Código copiado — cole no app do banco')
    } catch {
      // Navegador sem permissão de área de transferência: abre o código pra copiar na mão
      setCodAberto(p => new Set(p).add(b.id))
      toast.error('Não consegui copiar automático. O código está aí embaixo pra copiar na mão.')
    }
  }

  // PIX da profissional (empréstimo): copia a chave pro app do banco.
  // A chave já fica visível no card, então o erro só precisa avisar.
  async function copiarPix(b: Card) {
    try {
      await navigator.clipboard.writeText(b.pix.trim())
      toast.success('Chave PIX copiada')
    } catch {
      toast.error('Não consegui copiar automático — a chave está aí do lado, dá pra selecionar.')
    }
  }

  const soma = (arr: Card[]) => arr.reduce((s, b) => s + b.valor, 0)

  // ── Filtro por ano/mês do VENCIMENTO ────────────────────────────────────
  // Pensado pra quando houver milhares de lançamentos. O padrão de cada aba
  // respeita o que ela serve: PAGOS abre no mês atual (é o arquivo morto, que
  // cresce pra sempre); VENCIDOS abre em TODOS, senão conta atrasada some no
  // mês que ninguém foi olhar.
  const [fAno, setFAno] = useState('')     // '' = todos
  const [fMes, setFMes] = useState('')
  useEffect(() => {
    if (aba === 'pagos') {
      const h = new Date()
      setFAno(String(h.getFullYear())); setFMes(String(h.getMonth() + 1))
    } else { setFAno(''); setFMes('') }
  }, [aba])

  const daAba = aba ? grupos[aba] : []
  // Só oferece períodos que EXISTEM nesta aba — nada de escolher mês vazio
  const anosDisp = Array.from(new Set(daAba.map(b => b.venc.slice(0, 4)))).sort().reverse()
  const mesesDisp = Array.from(new Set(
    daAba.filter(b => !fAno || b.venc.slice(0, 4) === fAno).map(b => String(Number(b.venc.slice(5, 7))))
  )).sort((a, b) => Number(a) - Number(b))

  const lista = daAba.filter(b =>
    (!fAno || b.venc.slice(0, 4) === fAno) &&
    (!fMes || Number(b.venc.slice(5, 7)) === Number(fMes))
  )
  const filtrando = !!(fAno || fMes)

  const ABAS: { id: Aba; label: string; cor: string; bg: string; bd: string }[] = [
    { id: 'vencidos', label: 'Vencidos', cor: '#b91c1c', bg: '#fef2f2', bd: '#fecaca' },
    { id: 'hoje', label: 'Vencem hoje', cor: '#b45309', bg: '#fffbeb', bd: '#fde68a' },
    { id: 'avencer', label: 'A vencer', cor: '#1d4ed8', bg: '#eff6ff', bd: '#bfdbfe' },
    { id: 'pagos', label: 'Pagos', cor: '#047857', bg: '#ecfdf5', bd: '#a7f3d0' },
  ]

  // Sem permissão da Calculadora (ex.: sub-usuário) → o bloco simplesmente não existe
  if (semAcesso) return null

  if (loading) return (
    <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 20, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', fontSize: 13 }}>
      <Loader2 size={15} className="animate-spin" /> Carregando boletos…
    </div>
  )

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <FileText size={17} style={{ color: cor }} />
        <span style={{ fontWeight: 800, fontSize: 14.5, color: '#1a1a1a' }}>Contas &amp; Boletos</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>de todos os meses da Calculadora</span>
        <a href="/salon/calculadora-custo" style={{ marginLeft: 'auto', fontSize: 11.5, color: '#5b4fcf', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Lançar despesa <ExternalLink size={12} />
        </a>
      </div>

      {/* Abas com contagem e total */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {ABAS.map(a => {
          const arr = grupos[a.id]
          const ativo = aba === a.id
          return (
            <button key={a.id} onClick={() => setAba(atual => atual === a.id ? null : a.id)}
              title={ativo ? 'Clique para recolher' : 'Clique para ver a lista'}
              style={{
                background: ativo ? a.bg : '#fff', border: `1px solid ${ativo ? a.bd : '#e8e6e0'}`,
                borderRadius: 10, padding: '7px 12px', cursor: 'pointer', textAlign: 'left',
                boxShadow: ativo ? `inset 0 0 0 1px ${a.bd}` : 'none',
              }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: ativo ? a.cor : '#6b6860' }}>
                {a.label} <span style={{ fontSize: 13 }}>{arr.length}</span>
              </div>
              <div style={{ fontSize: 10.5, color: ativo ? a.cor : '#9ca3af', marginTop: 1 }}>R$ {fmtR(soma(arr))}</div>
            </button>
          )
        })}
      </div>

      {/* Filtro de período — só quando a aba está aberta e há mais de um item */}
      {aba && aba !== 'hoje' && daAba.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', background: '#faf9f7', border: '1px solid #e8e6e0', borderRadius: 10, padding: '8px 10px', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#6b6860' }}>Período (vencimento):</span>
          <select value={fAno} onChange={e => { setFAno(e.target.value); setFMes('') }}
            style={{ border: '1px solid #dedad4', borderRadius: 8, padding: '5px 8px', fontSize: 12, background: '#fff', cursor: 'pointer', fontWeight: 700, color: '#3a3835' }}>
            <option value="">Todos os anos</option>
            {anosDisp.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={fMes} onChange={e => setFMes(e.target.value)}
            style={{ border: '1px solid #dedad4', borderRadius: 8, padding: '5px 8px', fontSize: 12, background: '#fff', cursor: 'pointer', fontWeight: 700, color: '#3a3835' }}>
            <option value="">Todos os meses</option>
            {mesesDisp.map(m => <option key={m} value={m}>{MESES[Number(m)]}</option>)}
          </select>
          {filtrando && (
            <button onClick={() => { setFAno(''); setFMes('') }}
              style={{ background: '#fff', border: '1px solid #e0ddd8', borderRadius: 8, padding: '5px 10px', fontSize: 11.5, color: '#6b6860', cursor: 'pointer' }}>
              Ver todos
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#6b6860' }}>
            {lista.length} de {daAba.length} · <strong style={{ color: '#15803d' }}>R$ {fmtR(soma(lista))}</strong>
          </span>
        </div>
      )}

      {!aba ? (
        <div style={{ textAlign: 'center', padding: '4px 10px 2px', color: '#9ca3af', fontSize: 11.5 }}>
          Toque num dos cards acima para ver a lista.
        </div>
      ) : lista.length === 0 && filtrando ? (
        <div style={{ textAlign: 'center', padding: '18px 10px', color: '#9ca3af', fontSize: 12.5 }}>
          Nada nesse período. Escolha outro mês ou clique em <strong>Ver todos</strong>.
        </div>
      ) : lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '22px 10px', color: '#9ca3af', fontSize: 12.5 }}>
          {aba === 'vencidos' ? 'Nenhum boleto vencido. Tudo em dia.'
            : aba === 'hoje' ? 'Nada vencendo hoje.'
            : aba === 'avencer' ? 'Nenhuma conta futura com vencimento lançado.'
            : 'Nenhum boleto marcado como pago ainda.'}
          <div style={{ fontSize: 11, marginTop: 6 }}>
            A conta entra aqui quando você preenche o <strong>Vencimento</strong> na Calculadora (Despesas Indiretas).
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lista.map(b => {
            const d = dias(b.venc)
            const c = b.pago ? { cor: '#047857', bg: '#ecfdf5', bd: '#a7f3d0', barra: '#22c55e' }
              : d < 0 ? { cor: '#b91c1c', bg: '#fef2f2', bd: '#fecaca', barra: '#ef4444' }
              : d === 0 ? { cor: '#b45309', bg: '#fffbeb', bd: '#fde68a', barra: '#f59e0b' }
              : { cor: '#6b6860', bg: '#fff', bd: '#e8e6e0', barra: '#cbd5e1' }
            return (
              <div key={b.id} style={{ background: '#fff', border: `1px solid ${c.bd}`, borderLeft: `4px solid ${c.barra}`, borderRadius: 12, padding: '11px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                  {b.pago
                    ? <span style={{ fontSize: 10, fontWeight: 800, color: c.cor, background: c.bg, padding: '2px 8px', borderRadius: 999 }}>PAGO {b.pagoEm ? `em ${isoBR(b.pagoEm)}` : ''}</span>
                    : d < 0 ? <span style={{ fontSize: 10, fontWeight: 800, color: c.cor, background: c.bg, padding: '2px 8px', borderRadius: 999 }}>VENCIDO {Math.abs(d)} dia{Math.abs(d) > 1 ? 's' : ''}</span>
                    : d === 0 ? <span style={{ fontSize: 10, fontWeight: 800, color: c.cor, background: c.bg, padding: '2px 8px', borderRadius: 999 }}>VENCE HOJE</span>
                    : <span style={{ fontSize: 10, fontWeight: 700, color: '#6b6860' }}>em {d} dia{d > 1 ? 's' : ''}</span>}
                  <span style={{ fontSize: 10, color: '#6b6860', background: '#f5f4f0', padding: '2px 8px', borderRadius: 999 }}>lançado em {b.meses}</span>
                  {b.parcela && <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: 999 }}>parcela {b.parcela}</span>}
                  {/* Card juntou várias parcelas do mesmo lançamento: paga tudo de uma vez */}
                  {b.qtd > 1 && <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: 999 }}>{b.qtd} parcelas juntas</span>}
                  <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#6b6860' }}>venc. <strong style={{ color: c.cor }}>{isoBR(b.venc)}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', textDecoration: b.pago ? 'line-through' : 'none' }}>{b.nome}</span>
                  {/* Empréstimo aprovado não é boleto de banco: é dinheiro pra entregar */}
                  {/EMPR[ÉE]STIMO/i.test(b.nome) && !b.pago && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#6b21a8', background: '#f5f3ff', padding: '2px 8px', borderRadius: 999 }}>entregar à profissional</span>
                  )}
                  <span style={{ marginLeft: 'auto', fontSize: 17, fontWeight: 900, color: b.pago ? '#9ca3af' : '#15803d' }}>R$ {fmtR(b.valor)}</span>
                </div>
                {b.obs && <p style={{ fontSize: 11.5, color: '#6b6860', margin: '4px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{b.obs}</p>}

                {/* Código de barras (quando foi escaneado/colado no lançamento) */}
                {b.cod && codAberto.has(b.id) && (
                  <div style={{ marginTop: 8, background: '#f5f4f0', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: '#6b6860', marginBottom: 3 }}>
                      {ehPix(b.cod) ? 'PIX COPIA E COLA' : 'LINHA DIGITÁVEL'}
                    </div>
                    <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11.5, color: '#1a1a1a', wordBreak: 'break-all', lineHeight: 1.5, userSelect: 'all' }}>
                      {formatarLinha(b.cod)}
                    </div>
                  </div>
                )}

                {/* PIX de quem vai receber — empréstimo aprovado */}
                {b.pix && (
                  <div style={{ marginTop: 8, background: '#f5f3ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: '#6b21a8', marginBottom: 3 }}>CHAVE PIX PARA PAGAR</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 12, color: '#1a1a1a', wordBreak: 'break-all', flex: '1 1 160px', userSelect: 'all' }}>{b.pix}</span>
                      <button onClick={() => copiarPix(b)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        <Copy size={12} /> Copiar PIX
                      </button>
                    </div>
                  </div>
                )}
                {/* Empréstimo sem chave cadastrada: avisa onde resolver */}
                {!b.pix && !b.pago && /EMPR[ÉE]STIMO/i.test(b.nome) && (
                  <p style={{ fontSize: 11, color: '#b45309', margin: '6px 0 0' }}>
                    Sem chave PIX no cadastro dela — preencha em Profissionais › Dados Profissionais › Chave PIX.
                  </p>
                )}

                {b.cod && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
                      <button onClick={() => copiarCod(b)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', color: '#5b4fcf', border: '1px solid #c9c4f0', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        <Copy size={12} /> Copiar código de barras
                      </button>
                      <button onClick={() => toggleCod(b.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', color: '#6b6860', border: '1px solid #e0ddd8', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {codAberto.has(b.id) ? <><EyeOff size={12} /> Esconder</> : <><Eye size={12} /> Ver código</>}
                      </button>
                  </div>
                )}

                {podeBaixa && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
                    {b.pago ? (
                      <button disabled={salvando === b.id} onClick={() => baixa(b, false)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fff', color: '#6b6860', border: '1px solid #e0ddd8', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: salvando === b.id ? .6 : 1 }}>
                        <RotateCcw size={12} /> Desfazer
                      </button>
                    ) : (
                      <button disabled={salvando === b.id} onClick={() => baixa(b, true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: salvando === b.id ? .6 : 1 }}>
                        <Check size={13} /> {salvando === b.id ? 'Salvando…' : 'Marcar como pago'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
