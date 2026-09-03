'use client'

/**
 * Conferência automática do dia — o que o sistema confere sozinho.
 *
 * Fica ao lado da conferência manual, não no lugar dela: o sistema aponta, a
 * pessoa decide. Por isso o painel nunca escreve nada no documento da
 * conferência; ele só mostra.
 *
 * As três gavetas existem para o relatório não perder a confiança:
 *   PROBLEMA       — certeza. É o que o dono precisa ver primeiro.
 *   ATENÇÃO        — estranho, pode ter explicação (cortesia combinada).
 *   NÃO CONFERIDO  — falta dado para julgar. Fica SEPARADO e visível, porque
 *                    esconder o que não foi conferido é pior do que não
 *                    conferir: dá ao dono a sensação de que está tudo coberto.
 */

import { useCallback, useEffect, useState } from 'react'
import { Loader2, ShieldCheck, HelpCircle, RefreshCw, Printer, SlidersHorizontal, Plus, Trash2, Save, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Achado, RegraComposicao } from '@/lib/conferenciaDia'

// ── Conversa com a extensão de conferência de caixa ─────────────────────────
//
// A página não conhece o id da extensão de propósito: assim atualizar ou
// reinstalar a extensão não obriga a mexer aqui. Fala-se por postMessage e
// quem repassa é a ponte que a extensão injeta nesta página.
const DA_PAGINA = 'nodri-caixa'
const DA_EXT = 'nodri-caixa-ext'

const moeda = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface ResumoCaixa {
  responsavel: string
  abertura: string | null
  fechamento: string | null
  comandas: number
  total: number
  formas: Record<string, number>
}

interface Resultado {
  data: string
  itens: number
  comandas: number
  faturado: number
  achados: Achado[]
  emRisco: number
  semDados: boolean
  totalNoBanco?: number
  totalNoMes?: number
  diasComDado?: string[]
  amostraDatas?: string[]
  regras?: RegraComposicao[]
  servicosConhecidos?: string[]
  categoriasConhecidas?: string[]
  caixas?: ResumoCaixa[]
  temCaixa?: boolean
  precosNaTabela?: number
  avecUrl?: string
}

/** Rótulo do filtro para o achado sem caixa identificado. */
const SEM_CAIXA = 'Sem caixa'

const CORES = {
  problema:      { bg: '#fef2f2', borda: '#fca5a5', texto: '#b91c1c', rotulo: 'PROBLEMA' },
  atencao:       { bg: '#fffbeb', borda: '#fcd34d', texto: '#b45309', rotulo: 'ATENÇÃO' },
  nao_conferido: { bg: '#f8fafc', borda: '#cbd5e1', texto: '#475569', rotulo: 'NÃO CONFERIDO' },
} as const

export default function ConferenciaAutomatica({ data }: { data: string }) {
  const [r, setR] = useState<Resultado | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [abrindoRegras, setAbrindoRegras] = useState(false)
  const [regras, setRegras] = useState<RegraComposicao[]>([])
  const [salvandoRegras, setSalvandoRegras] = useState(false)
  // Cada recepcionista responde pelo caixa dela. Ver tudo junto é o padrão
  // (o dono quer o dia inteiro), mas conferir de verdade é um caixa por vez.
  const [caixaSel, setCaixaSel] = useState<string>('')
  const [buscandoCaixa, setBuscandoCaixa] = useState(false)
  const [temExtensao, setTemExtensao] = useState<boolean | null>(null)
  const [avecUrl, setAvecUrl] = useState('')

  const conferir = useCallback(async () => {
    if (!data) return
    setCarregando(true); setErro('')
    try {
      const res = await fetch(`/api/salon/conferencia-dia?data=${encodeURIComponent(data)}`, { credentials: 'include' })
      const d = await res.json()
      if (!res.ok) { setErro(d?.error || 'Não foi possível conferir'); setR(null) }
      else { setR(d); setRegras(Array.isArray(d.regras) ? d.regras : []); setAvecUrl(d.avecUrl || '') }
    } catch {
      setErro('Não foi possível conferir')
      setR(null)
    }
    setCarregando(false)
  }, [data])

  useEffect(() => { conferir() }, [conferir])

  // Existe extensão instalada? Pergunta uma vez e aceita o silêncio como não.
  // Sem isso o botão apareceria sempre e só falharia quando clicado.
  useEffect(() => {
    let vivo = true
    const ouvir = (ev: MessageEvent) => {
      if (ev.source !== window || ev.data?.fonte !== DA_EXT) return
      if (ev.data.tipo === 'pong' && vivo) setTemExtensao(true)
    }
    window.addEventListener('message', ouvir)
    window.postMessage({ fonte: DA_PAGINA, tipo: 'ping' }, window.location.origin)
    const t = setTimeout(() => { if (vivo) setTemExtensao(v => v === null ? false : v) }, 1200)
    return () => { vivo = false; clearTimeout(t); window.removeEventListener('message', ouvir); }
  }, [])

  /**
   * Pede o movimento de caixa à extensão e guarda no NODRI.
   *
   * Nunca fica pendurado: há um prazo, e vencido o prazo a tela diz o que
   * aconteceu. Uma conferência que trava esperando é pior que uma que assume
   * o que não sabe — as duas mentem, essa ainda prende a pessoa.
   */
  const buscarCaixas = useCallback(async () => {
    setBuscandoCaixa(true)
    const resposta = await new Promise<any>(resolve => {
      const prazo = setTimeout(() => { fim(); resolve({ erro: 'A extensão não respondeu em 45 segundos.' }) }, 45000)
      const ouvir = (ev: MessageEvent) => {
        if (ev.source !== window || ev.data?.fonte !== DA_EXT) return
        if (ev.data.tipo === 'status') { toast.loading(ev.data.texto, { id: 'caixa' }); return }
        if (ev.data.tipo === 'fim') { fim(); resolve(ev.data) }
      }
      const fim = () => { clearTimeout(prazo); window.removeEventListener('message', ouvir); toast.dismiss('caixa') }
      window.addEventListener('message', ouvir)
      // O endereço vai junto: a extensão não guarda URL nenhuma, para uma
      // mudança no Avec se resolver aqui e valer em todas as máquinas.
      window.postMessage({ fonte: DA_PAGINA, tipo: 'coletar', data, url: avecUrl }, window.location.origin)
    })

    if (resposta?.erro || !Array.isArray(resposta?.caixas)) {
      setBuscandoCaixa(false)
      toast.error(resposta?.erro || 'Não consegui ler o caixa no Avec.', { duration: 8000 })
      return
    }

    try {
      const res = await fetch('/api/salon/caixas-dia', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, caixas: resposta.caixas }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Falha ao guardar')
      toast.success(`${d.caixas} caixa(s), ${d.comandas} comanda(s), ${moeda(d.total)}.`)
      await conferir()
    } catch (e: any) {
      toast.error(e?.message || 'Não consegui guardar o caixa.')
    }
    setBuscandoCaixa(false)
  }, [data, conferir, avecUrl])

  if (!data) return null

  const caixas = r?.caixas || []
  const daSelecao = (r?.achados || []).filter(a =>
    !caixaSel || (caixaSel === SEM_CAIXA ? !a.caixa : a.caixa === caixaSel))
  const porGravidade = (g: keyof typeof CORES) => daSelecao.filter(a => a.gravidade === g)
  const problemas = porGravidade('problema')
  const atencoes = porGravidade('atencao')
  const naoConferidos = porGravidade('nao_conferido')
  const limpo = r && !r.semDados && daSelecao.length === 0

  return (
    <div style={{ border: '1.5px solid #e8e6e0', borderRadius: 14, background: '#fff', padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <ShieldCheck size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#1a1a1a' }}>Conferência automática</h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b6860' }}>
            O sistema confere os lançamentos do dia. Você decide o que fazer.
          </p>
        </div>
        <button onClick={conferir} disabled={carregando}
          style={{ border: '1px solid #e0ddd8', background: '#fff', borderRadius: 9, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, color: '#6b6860', cursor: carregando ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          {carregando ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Conferir de novo
        </button>
        {temExtensao && (
          <button onClick={buscarCaixas} disabled={buscandoCaixa}
            style={{ border: '1px solid #c7d2fe', background: '#eef2ff', borderRadius: 9, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, color: '#4338ca', cursor: buscandoCaixa ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {buscandoCaixa ? <Loader2 size={13} className="animate-spin" /> : <Wallet size={13} />} Buscar caixas no Avec
          </button>
        )}
        <button onClick={() => setAbrindoRegras(v => !v)}
          style={{ border: '1px solid #e0ddd8', background: abrindoRegras ? '#f0eefb' : '#fff', borderRadius: 9, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, color: abrindoRegras ? '#5b4fcf' : '#6b6860', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <SlidersHorizontal size={13} /> Regras
        </button>
        {r && !r.semDados && (
          <button onClick={() => window.print()} className="no-mobile"
            style={{ border: '1px solid #e0ddd8', background: '#fff', borderRadius: 9, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, color: '#6b6860', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={13} /> Imprimir
          </button>
        )}
      </div>

      {/* ── Regras da conferência ─────────────────────────────────────────
          Ficam no banco, não no código: o dono acrescenta uma exigência sem
          precisar de deploy. A escolha é por lista dos serviços que existem de
          verdade nos lançamentos — digitar de cabeça erraria por um acento e a
          regra nunca dispararia, sem ninguém entender por quê. */}
      {abrindoRegras && (
        <div style={{ background: '#faf9f7', border: '1px solid #e8e6e0', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', marginBottom: 3 }}>Exigências entre serviços</div>
          <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 4px' }}>
            <b>exige</b> — toda comanda com <b>A</b> precisa ter <b>B</b> junto (corte exige higienização).<br />
            <b>não pode ter</b> — <b>A</b> e <b>B</b> nunca vão na mesma comanda (ou é higienização ou é tratamento).
          </p>
          <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 12px' }}>
            Nos dois campos você pode pôr <b>uma categoria</b> — e aí vale para todos os serviços
            dela, inclusive os que ainda forem criados — <b>ou um serviço específico</b>.
          </p>

          {/* Categorias primeiro na lista: é a escolha que cobre mais com menos
              regra, e a que o dono quer na maioria das vezes. */}
          <datalist id="conf-servicos">
            {(r?.categoriasConhecidas || []).map(c => (
              <option key={'c-' + c} value={c}>categoria — pega todos os serviços</option>
            ))}
            {(r?.servicosConhecidos || []).map(sv => (
              <option key={'s-' + sv} value={sv}>serviço</option>
            ))}
          </datalist>

          {regras.length === 0 && (
            <div style={{ fontSize: 12.5, color: '#9ca3af', padding: '8px 0 12px' }}>
              Nenhuma exigência cadastrada. A conferência segue rodando as outras verificações.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {regras.map((rg, i) => (
              <div key={rg.id} style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, padding: '9px 10px' }}>
                <span style={{ fontSize: 12, color: '#6b6860', fontWeight: 700 }}>quando tiver</span>
                <input list="conf-servicos" value={rg.quando} placeholder="COLORAÇÃO"
                  onChange={e => setRegras(rs => rs.map((x, j) => j === i ? { ...x, quando: e.target.value } : x))}
                  style={{ flex: '1 1 170px', minWidth: 130, padding: '7px 9px', border: '1.5px solid #e0ddd8', borderRadius: 8, fontSize: 12.5 }} />
                <select value={rg.tipo || 'exige'}
                  onChange={e => setRegras(rs => rs.map((x, j) => j === i ? { ...x, tipo: e.target.value as 'exige' | 'proibe' } : x))}
                  style={{ padding: '7px 6px', border: '1.5px solid #e0ddd8', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#fff', color: '#6b6860' }}>
                  <option value="exige">exige</option>
                  <option value="proibe">não pode ter</option>
                </select>
                <input list="conf-servicos" value={rg.exige} placeholder="HIGIENIZAÇÃO"
                  onChange={e => setRegras(rs => rs.map((x, j) => j === i ? { ...x, exige: e.target.value } : x))}
                  style={{ flex: '1 1 170px', minWidth: 130, padding: '7px 9px', border: '1.5px solid #e0ddd8', borderRadius: 8, fontSize: 12.5 }} />
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b6860', cursor: 'pointer' }}>
                  <input type="checkbox" checked={rg.ativa}
                    onChange={e => setRegras(rs => rs.map((x, j) => j === i ? { ...x, ativa: e.target.checked } : x))} />
                  ligada
                </label>
                <button onClick={() => setRegras(rs => rs.filter((_, j) => j !== i))} title="Excluir regra"
                  style={{ border: '1px solid #e8e6e0', background: '#fff', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', color: '#dc2626', display: 'flex' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setRegras(rs => [...rs, { id: Math.random().toString(36).slice(2, 9), tipo: 'exige' as const, quando: '', exige: '', ativa: true }])}
              style={{ border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', borderRadius: 9, padding: '8px 14px', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={13} /> Nova regra
            </button>
            <button
              onClick={async () => {
                // Regra sem os dois lados nunca dispara; some no salvamento em
                // vez de ficar na lista dando a impressão de que está valendo.
                const limpas = regras.filter(x => x.quando.trim() && x.exige.trim())
                setSalvandoRegras(true)
                const res = await fetch('/api/salon/conferencia-dia', {
                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ regras: limpas, avecUrl }),
                })
                setSalvandoRegras(false)
                if (!res.ok) { toast.error('Não foi possível salvar as regras'); return }
                setRegras(limpas)
                toast.success('Regras salvas')
                conferir()          // reconfere o dia já com as regras novas
              }}
              disabled={salvandoRegras}
              style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: 9, padding: '8px 16px', fontSize: 12.5, fontWeight: 800, cursor: salvandoRegras ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {salvandoRegras ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar e conferir
            </button>
          </div>

          <p style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 10, marginBottom: 0 }}>
            A comparação é por <b>palavra inteira</b>: a regra &quot;COLORAÇÃO&quot; não pega
            &quot;DESCOLORAÇÃO&quot;, que é outro serviço.
          </p>

          {/* ── Endereço da tela do Avec ────────────────────────────────────
              Fica aqui, e não dentro da extensão, para o dia em que o Avec
              mudar o endereço: corrige-se num lugar e vale em todas as
              máquinas, sem reinstalar extensão em nenhuma. */}
          <div style={{ borderTop: '1px solid #e8e6e0', marginTop: 14, paddingTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', marginBottom: 3 }}>
              Endereço das Comandas Finalizadas no Avec
            </div>
            <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 8px' }}>
              É a tela que a extensão abre para buscar os caixas. Só mexa aqui se o
              Avec mudar o endereço dela.
            </p>
            <input value={avecUrl} onChange={e => setAvecUrl(e.target.value)}
              placeholder="https://admin.avec.beauty/admin/financeiro/comanda/historico"
              type="url" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false}
              onBlur={e => setAvecUrl(e.target.value.trim())}
              style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #e0ddd8', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '6px 0 0' }}>
              Salvo junto com as regras, no botão acima. Só aceita endereço do
              próprio Avec.
            </p>
          </div>
        </div>
      )}

      {carregando && !r && (
        <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>
          <Loader2 size={18} className="animate-spin" style={{ margin: '0 auto 6px' }} />
          Conferindo…
        </div>
      )}

      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: '#b91c1c' }}>
          {erro}
        </div>
      )}

      {r && r.semDados && (
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: '#475569', lineHeight: 1.5 }}>
          <b>Nenhum atendimento importado neste dia.</b> Não há o que conferir — o que é diferente de
          &quot;conferido e sem problema&quot;.
          {/* Sem estas pistas o dono fica no escuro: não sabe se esqueceu de
              importar, se importou outro mês, ou se a data está gravada de
              outro jeito. Dizer o que EXISTE resolve os três de uma vez. */}
          {typeof r.totalNoBanco === 'number' && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0', fontSize: 12 }}>
              {r.totalNoBanco === 0 ? (
                <>Não há <b>nenhum</b> atendimento importado neste período. Importe o relatório em <b>Relatórios</b>.</>
              ) : r.totalNoMes === 0 ? (
                <>Há {r.totalNoBanco} atendimento(s) importado(s), mas <b>nenhum neste mês</b>.
                  {!!r.amostraDatas?.length && <> Datas gravadas: {r.amostraDatas.join(', ')}.</>}</>
              ) : (
                <>Este mês tem {r.totalNoMes} atendimento(s), nos dias:{' '}
                  <b>{(r.diasComDado || []).map(d => d.slice(0, 2)).join(', ')}</b>.</>
              )}
            </div>
          )}
        </div>
      )}

      {r && !r.semDados && (
        <>
          {/* Veredito: o resumo do dia numa linha */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <Selo titulo="Comandas" valor={String(r.comandas)} />
            <Selo titulo="Itens" valor={String(r.itens)} />
            <Selo titulo="Faturado" valor={moeda(r.faturado)} />
            {r.emRisco > 0 && <Selo titulo="Em risco" valor={moeda(r.emRisco)} destaque />}
          </div>

          {/* ── Os caixas do dia ────────────────────────────────────────────
              Quatro recepcionistas são quatro caixas, e juntar tudo num monte
              só é justamente o que impede achar de quem é a diferença. */}
          {caixas.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <Wallet size={14} style={{ color: '#6b6860' }} />
                <span style={{ fontSize: 11, fontWeight: 900, color: '#6b6860', letterSpacing: 0.5 }}>
                  CAIXAS DO DIA · {caixas.length}
                </span>
                <button onClick={() => setCaixaSel('')}
                  style={chip(!caixaSel)}>Todos</button>
                {caixas.map(c => (
                  <button key={c.responsavel} onClick={() => setCaixaSel(c.responsavel)}
                    style={chip(caixaSel === c.responsavel)}>{c.responsavel}</button>
                ))}
                {(r.achados || []).some(a => !a.caixa) && (
                  <button onClick={() => setCaixaSel(SEM_CAIXA)} style={chip(caixaSel === SEM_CAIXA)}>{SEM_CAIXA}</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {caixas
                  .filter(c => !caixaSel || caixaSel === c.responsavel)
                  .map(c => (
                  <div key={c.responsavel} style={{ border: '1px solid #e8e6e0', background: '#faf9f7', borderRadius: 10, padding: '9px 13px', minWidth: 170 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 900, color: '#1a1a1a' }}>{c.responsavel}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{moeda(c.total)}</div>
                    <div style={{ fontSize: 11.5, color: '#6b6860', marginTop: 2 }}>
                      {c.comandas} comanda(s)
                      {c.abertura || c.fechamento ? ` · ${c.abertura || '?'}–${c.fechamento || '?'}` : ''}
                    </div>
                    {Object.keys(c.formas || {}).length > 0 && (
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, lineHeight: 1.5 }}>
                        {Object.entries(c.formas).map(([f, v]) => `${f}: ${moeda(v)}`).join(' · ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Qual régua foi usada no preço. Sem a tabela oficial a conferência
              só sabe o preço "de costume", e o dono precisa saber a diferença
              antes de cobrar alguém por um apontamento. */}
          {!r.precosNaTabela && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, color: '#92400e', marginBottom: 12 }}>
              Sem a tabela de preços do salão. O preço está sendo conferido pelo
              que é <b>habitual no histórico</b>, não pelo que <b>deveria</b> ser
              cobrado. A tabela chega junto com a importação da planilha do robô.
            </div>
          )}

          {limpo && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#15803d' }}>
              <b>Nada a apontar.</b> {r.comandas} comanda(s) e {r.itens} item(ns) conferidos, sem divergência.
            </div>
          )}

          {[['problema', problemas], ['atencao', atencoes], ['nao_conferido', naoConferidos]]
            .filter(([, lista]) => (lista as Achado[]).length > 0)
            .map(([g, lista]) => {
              const c = CORES[g as keyof typeof CORES]
              return (
                <div key={String(g)} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: c.texto, letterSpacing: 0.6, marginBottom: 6 }}>
                    {c.rotulo} · {(lista as Achado[]).length}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {(lista as Achado[]).map(a => (
                      <div key={a.id} style={{ background: c.bg, border: `1px solid ${c.borda}`, borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12.5, fontWeight: 900, color: c.texto }}>Comanda {a.comanda}</span>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a1a' }}>{a.servico}</span>
                          {a.valorEmRisco > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 900, color: c.texto }}>{moeda(a.valorEmRisco)}</span>
                          )}
                          {a.caixa && (
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#6b6860', background: '#fff', border: '1px solid #e0ddd8', borderRadius: 6, padding: '1px 6px' }}>
                              caixa {a.caixa}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12.5, color: '#57534e', marginTop: 3 }}>{a.texto}</div>
                        <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 3 }}>
                          {a.cliente} · {a.profissional}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

          {naoConferidos.length > 0 && (
            <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 11.5, color: '#6b6860', marginTop: 4 }}>
              <HelpCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                &quot;Não conferido&quot; não é erro: é o que o sistema não teve como julgar sozinho.
                Aparece separado de propósito, para você não achar que está tudo coberto.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** Chip de filtro por caixa. */
function chip(ativo: boolean): React.CSSProperties {
  return {
    border: `1px solid ${ativo ? '#5b4fcf' : '#e0ddd8'}`,
    background: ativo ? '#f0eefb' : '#fff',
    color: ativo ? '#5b4fcf' : '#6b6860',
    borderRadius: 999, padding: '3px 11px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
  }
}

function Selo({ titulo, valor, destaque }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <div style={{
      border: `1px solid ${destaque ? '#fca5a5' : '#e8e6e0'}`,
      background: destaque ? '#fef2f2' : '#faf9f7',
      borderRadius: 10, padding: '8px 14px', minWidth: 92,
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: 0.4 }}>{titulo}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: destaque ? '#b91c1c' : '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{valor}</div>
    </div>
  )
}
