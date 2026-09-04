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
import { Loader2, ShieldCheck, HelpCircle, RefreshCw, Printer, SlidersHorizontal, Plus, Trash2, Save, Wallet, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { getLogoSalao } from '@/lib/logoSalao'
import type { Achado, RegraComposicao } from '@/lib/conferenciaDia'

// ── Os alvos de uma regra, como a tela os manipula ──────────────────────────
// O primeiro alvo vive em `exige` e os demais em `alternativas`. Essa divisão
// existe para não invalidar nenhuma regra já salva: as antigas têm só `exige`.
const alvos = (r: RegraComposicao): string[] => [r.exige ?? '', ...(r.alternativas || [])]

function porAlvo(r: RegraComposicao, i: number, valor: string): RegraComposicao {
  const lista = alvos(r)
  lista[i] = valor
  return { ...r, exige: lista[0] || '', alternativas: lista.slice(1) }
}

function semAlvo(r: RegraComposicao, i: number): RegraComposicao {
  const lista = alvos(r).filter((_, k) => k !== i)
  return { ...r, exige: lista[0] || '', alternativas: lista.slice(1) }
}

function maisUmAlvo(r: RegraComposicao): RegraComposicao {
  return { ...r, alternativas: [...(r.alternativas || []), ''] }
}

// ── As exceções ─────────────────────────────────────────────────────────────
// O gatilho costuma ser uma CATEGORIA, que é o que faz uma linha cobrir o
// salão inteiro. Mas categoria quase sempre tem uma ovelha fora do padrão, e
// sem poder tirá-la a saída seria abandonar a categoria e listar serviço por
// serviço — regra que dá trabalho de manter é regra que envelhece errada.
const excecoes = (r: RegraComposicao): string[] => r.exceto || []

function porExcecao(r: RegraComposicao, i: number, valor: string): RegraComposicao {
  const lista = [...excecoes(r)]
  lista[i] = valor
  return { ...r, exceto: lista }
}

const semExcecao = (r: RegraComposicao, i: number): RegraComposicao =>
  ({ ...r, exceto: excecoes(r).filter((_, k) => k !== i) })

const maisUmaExcecao = (r: RegraComposicao): RegraComposicao =>
  ({ ...r, exceto: [...excecoes(r), ''] })

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
  produtosNoDia?: number
  /** As comandas do dia, para a conferência do papel. */
  comandasDoDia?: ComandaDoDia[]
  /** O que já foi digitado do papel, comanda → valor. */
  papel?: Record<string, number>
}

interface ComandaDoDia {
  comanda: string
  cliente: string
  profissional: string
  servicos: number
  produtos: number
  total: number
  recebido: number | null
  caixa: string | null
}

/** Rótulo do filtro para o achado sem caixa identificado. */
const SEM_CAIXA = 'Sem caixa'

// Estilo desta tela. Fica numa constante, e não em `style` inline, porque
// :hover e :active não existem em estilo inline — e era exatamente o que
// faltava: os filtros de caixa não davam sinal nenhum de que eram clicáveis.
//
// A lista é junta com espaço, e não com quebra de linha, de propósito: crase
// dentro de <style> fecha a string, e barra invertida some em algumas
// ferramentas. Uma linha só não tem como quebrar.
const CSS_CONF = [
  '.conf-chip { transition: transform .12s ease, box-shadow .12s ease, filter .12s ease }',
  '.conf-chip:hover { transform: translateY(-1px); filter: brightness(1.04); box-shadow: 0 3px 10px rgba(91,79,207,.22) }',
  '.conf-chip:active { transform: translateY(0); box-shadow: none }',
  '.conf-titulo { transition: opacity .12s ease }',
  '.conf-titulo:hover { opacity: .68 }',
].join(' ')

const CORES = {
  problema:      { bg: '#fef2f2', borda: '#fca5a5', texto: '#b91c1c', rotulo: 'PROBLEMA' },
  atencao:       { bg: '#fffbeb', borda: '#fcd34d', texto: '#b45309', rotulo: 'ATENÇÃO' },
  nao_conferido: { bg: '#f8fafc', borda: '#cbd5e1', texto: '#475569', rotulo: 'NÃO CONFERIDO' },
} as const

export default function ConferenciaAutomatica({ data }: { data: string }) {
  const [r, setR] = useState<Resultado | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  // Abas, e não tudo empilhado: a tela juntava resumo, caixas, regras e
  // apontamentos numa coluna só, e virava um muro de dado. Cada aba responde a
  // uma pergunta diferente, e só uma de cada vez.
  const [aba, setAba] = useState<'achados' | 'papel' | 'regras'>('achados')
  const [regras, setRegras] = useState<RegraComposicao[]>([])
  const [salvandoRegras, setSalvandoRegras] = useState(false)
  // Cada recepcionista responde pelo caixa dela. Ver tudo junto é o padrão
  // (o dono quer o dia inteiro), mas conferir de verdade é um caixa por vez.
  const [caixaSel, setCaixaSel] = useState<string>('')
  const [buscandoCaixa, setBuscandoCaixa] = useState(false)
  const [temExtensao, setTemExtensao] = useState<boolean | null>(null)
  const [avecUrl, setAvecUrl] = useState('')
  // Os valores digitados da comanda de PAPEL, por comanda.
  const [papel, setPapel] = useState<Record<string, string>>({})
  const [salvandoPapel, setSalvandoPapel] = useState(false)
  // Seções que abrem e fecham no clique do título.
  //
  // PROBLEMA nasce aberto de propósito: é o que exige ação, e uma tela que
  // esconde o que precisa ser resolvido devolve para a pessoa o trabalho de
  // procurar. O resto nasce fechado, que é o que tira o muro de dado.
  const [aberto, setAberto] = useState<Record<string, boolean>>({ problema: true })
  const alternar = (k: string) => setAberto(a => ({ ...a, [k]: !a[k] }))

  const conferir = useCallback(async () => {
    if (!data) return
    setCarregando(true); setErro('')
    try {
      const res = await fetch(`/api/salon/conferencia-dia?data=${encodeURIComponent(data)}`, { credentials: 'include' })
      const d = await res.json()
      if (!res.ok) { setErro(d?.error || 'Não foi possível conferir'); setR(null) }
      else {
        setR(d)
        setRegras(Array.isArray(d.regras) ? d.regras : [])
        setAvecUrl(d.avecUrl || '')
        // O que já foi digitado antes volta como texto, para a pessoa poder
        // corrigir em vez de digitar tudo de novo.
        const vindos: Record<string, string> = {}
        for (const [k, v] of Object.entries(d.papel || {})) {
          vindos[k] = String(Number(v).toFixed(2)).replace('.', ',')
        }
        setPapel(vindos)
      }
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
      <style>{CSS_CONF}</style>
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
        {r && !r.semDados && (
          <button onClick={() => imprimirConferencia(r, data, caixaSel, daSelecao)} className="no-mobile"
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
      {aba === 'regras' && (
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
                <div style={{ flex: '1 1 190px', minWidth: 150, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <input list="conf-servicos" value={rg.quando} placeholder="COLORAÇÃO"
                    onChange={e => setRegras(rs => rs.map((x, j) => j === i ? { ...x, quando: e.target.value } : x))}
                    style={{ padding: '7px 9px', border: '1.5px solid #e0ddd8', borderRadius: 8, fontSize: 12.5 }} />

                </div>
                <select value={rg.tipo || 'exige'}
                  onChange={e => setRegras(rs => rs.map((x, j) => j === i ? { ...x, tipo: e.target.value as RegraComposicao['tipo'] } : x))}
                  style={{ padding: '7px 6px', border: '1.5px solid #e0ddd8', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#fff', color: '#6b6860' }}>
                  <option value="exige">exige</option>
                  <option value="um_so">exige só um de</option>
                  <option value="proibe">não pode ter</option>
                </select>

                {/* Os alvos. O primeiro mora em `exige` (é o que as regras
                    antigas gravaram) e os demais em `alternativas` — assim
                    nenhuma regra já salva precisa ser refeita. */}
                <div style={{ flex: '1 1 260px', minWidth: 200, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {alvos(rg).map((alvo, k) => (
                    <div key={k} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      {k > 0 && <span style={{ fontSize: 11.5, fontWeight: 800, color: '#5b4fcf', minWidth: 18 }}>ou</span>}
                      <input list="conf-servicos" value={alvo} placeholder={k === 0 ? 'SHAMPOO' : 'TRATAMENTO'}
                        onChange={e => setRegras(rs => rs.map((x, j) => j === i ? porAlvo(x, k, e.target.value) : x))}
                        style={{ flex: 1, minWidth: 110, padding: '7px 9px', border: '1.5px solid #e0ddd8', borderRadius: 8, fontSize: 12.5 }} />
                      {alvos(rg).length > 1 && (
                        <button onClick={() => setRegras(rs => rs.map((x, j) => j === i ? semAlvo(x, k) : x))}
                          title="Tirar esta opção"
                          style={{ border: '1px solid #e8e6e0', background: '#fff', borderRadius: 7, padding: '4px 6px', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setRegras(rs => rs.map((x, j) => j === i ? maisUmAlvo(x) : x))}
                    style={{ alignSelf: 'flex-start', border: '1px dashed #c7d2fe', background: '#eef2ff', color: '#4338ca', borderRadius: 7, padding: '4px 9px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>
                    + ou…
                  </button>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b6860', cursor: 'pointer' }}>
                  <input type="checkbox" checked={rg.ativa}
                    onChange={e => setRegras(rs => rs.map((x, j) => j === i ? { ...x, ativa: e.target.checked } : x))} />
                  ligada
                </label>
                <button onClick={() => setRegras(rs => rs.filter((_, j) => j !== i))} title="Excluir regra"
                  style={{ border: '1px solid #e8e6e0', background: '#fff', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', color: '#dc2626', display: 'flex' }}>
                  <Trash2 size={13} />
                </button>

                {/* ── A exceção, no FIM da frase ───────────────────────────
                    Ela filtra o GATILHO (quais colorações estão livres), e por
                    isso morava junto dele. Mas a regra é lida da esquerda para
                    a direita — "Coloração exige Complemento, exceto Pigmentação
                    de Sobrancelhas" — e no meio da frase ela travava a leitura.
                    O rótulo diz "quando o serviço for" justamente para não
                    parecer que a exceção é sobre o Complemento. */}
                <div style={{ flexBasis: '100%', display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
                  {excecoes(rg).map((ex, k) => (
                    <div key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: '#b45309' }}>
                        exceto quando o serviço for
                      </span>
                      <input list="conf-servicos" value={ex} placeholder="PIGMENTAÇÃO SOBRANCELHAS"
                        onChange={e => setRegras(rs => rs.map((x, j) => j === i ? porExcecao(x, k, e.target.value) : x))}
                        style={{ flex: '1 1 200px', minWidth: 140, padding: '6px 9px', border: '1.5px solid #fcd34d', background: '#fffbeb', borderRadius: 8, fontSize: 12.5 }} />
                      <button onClick={() => setRegras(rs => rs.map((x, j) => j === i ? semExcecao(x, k) : x))}
                        title="Tirar esta exceção"
                        style={{ border: '1px solid #e8e6e0', background: '#fff', borderRadius: 7, padding: '4px 6px', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setRegras(rs => rs.map((x, j) => j === i ? maisUmaExcecao(x) : x))}
                    style={{ alignSelf: 'flex-start', border: '1px dashed #fcd34d', background: '#fffbeb', color: '#b45309', borderRadius: 7, padding: '4px 10px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>
                    + exceto…
                  </button>
                </div>
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
                // Alternativa em branco é ruído: some no salvamento. Regra sem
                // gatilho ou sem nenhum alvo nunca dispara — some também, em
                // vez de ficar na lista dando impressão de que está valendo.
                const limpas = regras
                  .map(x => {
                    const lista = alvos(x).map(a => a.trim()).filter(Boolean)
                    const fora = excecoes(x).map(a => a.trim()).filter(Boolean)
                    return { ...x, exige: lista[0] || '', alternativas: lista.slice(1), exceto: fora }
                  })
                  .filter(x => x.quando.trim() && x.exige)
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
            <b>+ exceto…</b> tira um serviço da regra sem abrir mão da categoria.
            A regra se lê inteira, da esquerda para a direita: <i>quando tiver
            Coloração, exige Complemento — exceto quando o serviço for Pigmentação
            de Sobrancelhas</i>. A exceção vale só para aquele serviço — se a mesma
            comanda tiver uma coloração comum, ela continua sendo cobrada.
          </p>
          <p style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 6, marginBottom: 0 }}>
            Use <b>+ ou…</b> para dar alternativas: <i>Coloração exige Shampoo ou Tratamento
            ou Terapia</i> é <b>uma</b> regra, e basta ter um deles. Com <b>exige só um de</b>,
            ter dois também vira apontamento.
          </p>
          <p style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 6, marginBottom: 0 }}>
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

          {/* ── Abas ────────────────────────────────────────────────────────
              Três perguntas diferentes, uma de cada vez: o que o sistema achou,
              o que o papel diz, e como as regras estão configuradas. */}
          <div className="no-print" style={{ display: 'flex', gap: 6, borderBottom: '1.5px solid #e8e6e0', marginBottom: 14, flexWrap: 'wrap' }}>
            {([
              ['achados', `Apontamentos${daSelecao.length ? ` · ${daSelecao.length}` : ''}`],
              ['papel', 'Conferir o papel'],
              ['regras', 'Regras'],
            ] as const).map(([id, rotulo]) => (
              <button key={id} onClick={() => setAba(id)}
                style={{
                  border: 'none', borderBottom: `2.5px solid ${aba === id ? '#5b4fcf' : 'transparent'}`,
                  background: 'transparent', padding: '8px 12px', marginBottom: -1.5,
                  fontSize: 13, fontWeight: aba === id ? 900 : 700,
                  color: aba === id ? '#5b4fcf' : '#6b6860', cursor: 'pointer',
                }}>
                {rotulo}
              </button>
            ))}
          </div>

          {/* ── Os caixas do dia ────────────────────────────────────────────
              Quatro recepcionistas são quatro caixas, e juntar tudo num monte
              só é justamente o que impede achar de quem é a diferença. */}
          {caixas.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <Wallet size={14} style={{ color: '#6b6860' }} />
                <button onClick={() => alternar('caixas')} className="conf-titulo"
                  style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 900, color: '#6b6860', letterSpacing: 0.5 }}>
                  <ChevronRight size={13} style={{ transform: aberto.caixas ? 'rotate(90deg)' : 'none', transition: 'transform .15s ease' }} />
                  CAIXAS DO DIA · {caixas.length}
                </button>
                <button className="conf-chip" onClick={() => setCaixaSel('')}
                  style={chip(!caixaSel)}>Todos</button>
                {caixas.map(c => (
                  <button key={c.responsavel} className="conf-chip" onClick={() => setCaixaSel(c.responsavel)}
                    style={chip(caixaSel === c.responsavel)}>{c.responsavel}</button>
                ))}
                {(r.achados || []).some(a => !a.caixa) && (
                  <button className="conf-chip" onClick={() => setCaixaSel(SEM_CAIXA)} style={chip(caixaSel === SEM_CAIXA)}>{SEM_CAIXA}</button>
                )}
              </div>
              <div className={aberto.caixas ? '' : 'no-print'} style={{ display: aberto.caixas ? 'flex' : 'none', gap: 10, flexWrap: 'wrap' }}>
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
          {aba === 'achados' && !r.precosNaTabela && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, color: '#92400e', marginBottom: 12 }}>
              Sem a tabela de preços do salão. O preço está sendo conferido pelo
              que é <b>habitual no histórico</b>, não pelo que <b>deveria</b> ser
              cobrado. A tabela chega junto com a importação da planilha do robô.
            </div>
          )}

          {aba === 'achados' && limpo && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#15803d' }}>
              <b>Nada a apontar.</b> {r.comandas} comanda(s) e {r.itens} item(ns) conferidos, sem divergência.
            </div>
          )}

          {aba === 'papel' && <ConferirPapel r={r} data={data} papel={papel} setPapel={setPapel}
            salvando={salvandoPapel} setSalvando={setSalvandoPapel} aoSalvar={conferir}
            caixaSel={caixaSel} />}

          {/* A leitura passou a ser por GRAVIDADE e, dentro dela, por COMANDA.
              Antes cada achado era um cartão solto, e uma comanda com quatro
              problemas virava quatro cartões repetindo o mesmo cabeçalho — o
              olho lia quatro casos onde havia um. */}
          {aba === 'achados' && [['problema', problemas], ['atencao', atencoes], ['nao_conferido', naoConferidos]]
            .filter(([, lista]) => (lista as Achado[]).length > 0)
            .map(([g, lista]) => {
              const c = CORES[g as keyof typeof CORES]
              return (
                <div key={String(g)} style={{ marginBottom: 12 }}>
                  <button onClick={() => alternar(String(g))} className="conf-titulo"
                    style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap', width: '100%', textAlign: 'left' }}>
                    <ChevronRight size={13} style={{ color: c.texto, transform: aberto[String(g)] ? 'rotate(90deg)' : 'none', transition: 'transform .15s ease', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 900, color: c.texto, letterSpacing: 0.6 }}>
                      {c.rotulo} · {(lista as Achado[]).length}
                    </span>
                    {(() => {
                      const soma = (lista as Achado[]).reduce((s, a) => s + (a.valorEmRisco || 0), 0)
                      return soma > 0 ? (
                        <span style={{ fontSize: 11.5, fontWeight: 800, color: c.texto, opacity: .8, fontVariantNumeric: 'tabular-nums' }}>
                          {moeda(soma)} em jogo
                        </span>
                      ) : null
                    })()}
                  </button>
                  <div className="conf-corpo" style={{ display: aberto[String(g)] ? 'flex' : 'none', flexDirection: 'column', gap: 8 }}>
                    {agruparPorComanda(lista as Achado[]).map(g => (
                      <div key={g.comanda} style={{ background: c.bg, border: `1px solid ${c.borda}`, borderRadius: 10, padding: '10px 12px' }}>
                        {/* Cabeçalho: uma vez por comanda, não uma por achado */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: g.itens.length > 1 ? 6 : 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 900, color: c.texto }}>
                            {g.comanda === '—' ? 'Geral' : `Comanda ${g.comanda}`}
                          </span>
                          {g.cliente !== '—' && (
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a1a' }}>{g.cliente}</span>
                          )}
                          {g.risco > 0 && (
                            <span style={{ fontSize: 12.5, fontWeight: 900, color: c.texto, fontVariantNumeric: 'tabular-nums' }}>
                              {moeda(g.risco)}
                            </span>
                          )}
                          {g.caixa && (
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#6b6860', background: '#fff', border: '1px solid #e0ddd8', borderRadius: 6, padding: '1px 6px' }}>
                              caixa {g.caixa}
                            </span>
                          )}
                          {g.itens.length > 1 && (
                            <span style={{ fontSize: 11, fontWeight: 800, color: c.texto, opacity: .75 }}>
                              {g.itens.length} apontamentos
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {g.itens.map(a => (
                            <div key={a.id} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                              {g.itens.length > 1 && (
                                <span style={{ color: c.texto, fontWeight: 900, lineHeight: 1.45, flexShrink: 0 }}>·</span>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, color: '#3f3a34', lineHeight: 1.45 }}>
                                  {a.servico && a.servico !== '—' && (
                                    <b style={{ color: '#1a1a1a' }}>{a.servico} — </b>
                                  )}
                                  {a.texto}
                                </div>
                                {a.profissional && a.profissional !== '—' && (
                                  <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 1 }}>{a.profissional}</div>
                                )}
                                {!!a.detalhes?.length && <Detalhes itens={a.detalhes} cor={c.texto} />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

          {aba === 'achados' && naoConferidos.length > 0 && (
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

/**
 * A conferência da comanda de PAPEL.
 *
 * A pessoa NÃO digita o número da comanda: o sistema já sabe quais são as do
 * dia. Ela digita só o valor do papel — metade do trabalho, e some uma classe
 * inteira de erro (digitar o número errado e comparar duas coisas sem relação).
 *
 * Enter pula para a linha seguinte, e o campo pinta de verde quando bate e de
 * vermelho quando não bate, enquanto se digita. O objetivo do vermelho na hora
 * é a pessoa corrigir o próprio erro de digitação no ato, em vez de gerar um
 * apontamento falso que alguém vai investigar amanhã.
 *
 * Campo em branco NÃO vira zero: quem não digitou disse "não conferi", não
 * disse "foi zero". Essa diferença é o que mantém a gaveta NÃO CONFERIDO
 * honesta.
 */
function ConferirPapel({ r, data, papel, setPapel, salvando, setSalvando, aoSalvar, caixaSel }: {
  r: Resultado
  data: string
  papel: Record<string, string>
  setPapel: React.Dispatch<React.SetStateAction<Record<string, string>>>
  salvando: boolean
  setSalvando: (v: boolean) => void
  aoSalvar: () => void
  caixaSel: string
}) {
  // ── O filtro de caixa vale aqui também ──────────────────────────────────
  //
  // Conferir papel é trabalho de uma recepcionista por vez: ela tem na mão as
  // comandas DELA. Mostrar as 41 do dia quando ela só responde por 24 é
  // obrigá-la a procurar — e procurar é onde se erra de linha.
  const todas = r.comandasDoDia || []
  const lista = caixaSel
    ? todas.filter(c => (c.caixa || SEM_CAIXA) === caixaSel)
    : todas

  // ── Conferidas sobem; pendentes ficam embaixo ───────────────────────────
  //
  // "Assentada" é diferente de "tem número digitado": a linha só muda de lugar
  // quando o campo é CONFIRMADO (Enter ou saída do campo). Reordenar a cada
  // tecla faria a linha fugir de debaixo do dedo no meio da digitação.
  const [assentadas, setAssentadas] = useState<Set<string>>(new Set())

  const comoNumero = (t: string): number | null => {
    const limpo = String(t ?? '').trim()
    if (!limpo) return null
    const n = Number(limpo.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }

  // O que já estava salvo nasce no bloco das conferidas.
  //
  // Sem isto, ao reabrir o dia tudo apareceria como "faltando" — inclusive o
  // que a pessoa digitou ontem — e ela reconferiria trabalho já feito.
  // Depende só de `data`: dentro do mesmo dia quem manda é o que ela confirma
  // na tela, não o que chegou do servidor.
  useEffect(() => {
    setAssentadas(new Set(
      Object.keys(papel).filter(k => comoNumero(papel[k]) !== null)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const assentar = (comanda: string, texto: string) => {
    setAssentadas(a => {
      const nova = new Set(a)
      if (comoNumero(texto) !== null) nova.add(comanda)
      else nova.delete(comanda)
      return nova
    })
  }

  // Conferidas primeiro, pendentes depois; dentro de cada bloco, por número.
  const porNumero = (a: ComandaDoDia, b: ComandaDoDia) =>
    (Number(a.comanda) || 0) - (Number(b.comanda) || 0)
  const feitas = lista.filter(c => assentadas.has(c.comanda)).sort(porNumero)
  const faltando = lista.filter(c => !assentadas.has(c.comanda)).sort(porNumero)
  const ordenada = [...feitas, ...faltando]

  const digitadas = lista.filter(c => comoNumero(papel[c.comanda] || '') !== null).length
  const divergentes = lista.filter(c => {
    const v = comoNumero(papel[c.comanda] || '')
    return v !== null && Math.abs(v - c.total) > 0.02
  })

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/conferencia-papel', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, valores: papel }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Falha ao salvar')
      toast.success(`${d.conferidas} comanda(s) conferidas pelo papel.`)
      aoSalvar()
    } catch (e: any) {
      toast.error(e?.message || 'Não consegui salvar a conferência do papel.')
    }
    setSalvando(false)
  }

  if (!lista.length) {
    return (
      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#475569' }}>
        Não há comandas neste dia para conferir.
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: 12.5, color: '#6b6860', margin: '0 0 4px' }}>
        Digite o valor que está escrito na <b>comanda de papel</b>. O número da
        comanda já vem preenchido — você só confere o valor.
      </p>
      <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 12px' }}>
        <b>Enter</b> pula para a próxima. Não precisa preencher todas: o que ficar
        em branco aparece como <b>não conferido</b>, nunca como zero.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <Selo titulo="Comandas" valor={String(lista.length)} />
        <Selo titulo="Conferidas" valor={`${digitadas}`} />
        {divergentes.length > 0 && <Selo titulo="Divergentes" valor={String(divergentes.length)} destaque />}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 460, overflowY: 'auto', marginBottom: 12 }}>
        {ordenada.map((c, i) => {
          // Faixa que separa o que já foi conferido do que falta.
          const cabecalho = (i === 0 && feitas.length > 0)
            ? `CONFERIDAS · ${feitas.length}`
            : (i === feitas.length && faltando.length > 0 && feitas.length > 0)
              ? `FALTANDO · ${faltando.length}`
              : ''
          const txt = papel[c.comanda] ?? ''
          const v = comoNumero(txt)
          const bate = v !== null && Math.abs(v - c.total) <= 0.02
          const erra = v !== null && !bate
          return (
            <div key={c.comanda}>
            {cabecalho && (
              <div style={{ fontSize: 10.5, fontWeight: 900, letterSpacing: 0.6,
                color: cabecalho.startsWith('CONFERIDAS') ? '#15803d' : '#b45309',
                margin: i === 0 ? '0 0 5px' : '11px 0 5px' }}>
                {cabecalho}
              </div>
            )}
            <div className="cp-linha"
              style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
                background: erra ? '#fef2f2' : bate ? '#f0fdf4' : '#fff',
                border: `1px solid ${erra ? '#fca5a5' : bate ? '#86efac' : '#e8e6e0'}`,
                borderRadius: 9, padding: '7px 10px' }}>
              <span style={{ fontSize: 12.5, fontWeight: 900, color: '#1a1a1a', minWidth: 88 }}>
                Comanda {c.comanda}
              </span>
              <span style={{ flex: '1 1 150px', minWidth: 110, fontSize: 12.5, color: '#57534e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.cliente}
              </span>
              <span style={{ fontSize: 12, color: '#9ca3af', minWidth: 108, fontVariantNumeric: 'tabular-nums' }}>
                sistema {moeda(c.total)}
              </span>
              <input
                value={txt}
                onChange={e => setPapel(p => ({ ...p, [c.comanda]: e.target.value }))}
                onBlur={e => assentar(c.comanda, e.target.value)}
                onKeyDown={e => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  const alvo = e.target as HTMLInputElement
                  assentar(c.comanda, alvo.value)
                  // Pula para o próximo campo AINDA VAZIO, não para o de baixo:
                  // com a lista se reorganizando, "o de baixo" muda de dono, e
                  // a pessoa acabaria digitando na linha errada.
                  const vazios = Array.from(document.querySelectorAll<HTMLInputElement>('.cp-valor'))
                    .filter(x => x !== alvo && !x.value.trim())
                  if (vazios.length) vazios[0].focus()
                  else alvo.blur()
                }}
                className="cp-valor"
                inputMode="decimal" placeholder="valor do papel"
                style={{ width: 128, padding: '7px 9px', fontSize: 13, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums', textAlign: 'right',
                  border: `1.5px solid ${erra ? '#dc2626' : bate ? '#16a34a' : '#e0ddd8'}`,
                  borderRadius: 8, outline: 'none',
                  background: '#fff', color: erra ? '#b91c1c' : bate ? '#15803d' : '#1a1a1a' }} />
              {erra && (
                <span style={{ fontSize: 11.5, fontWeight: 800, color: '#b91c1c', minWidth: 92, fontVariantNumeric: 'tabular-nums' }}>
                  {v! > c.total ? '+' : '−'}{moeda(Math.abs(v! - c.total)).replace('R$', '').trim()}
                </span>
              )}
            </div>
            </div>
          )
        })}
      </div>

      <button onClick={salvar} disabled={salvando}
        style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 800, cursor: salvando ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Fazer a última conferência
      </button>
      <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '8px 0 0' }}>
        As divergências entram no diagnóstico junto das outras, na aba
        <b> Apontamentos</b>.
      </p>
    </div>
  )
}


/**
 * O documento de conferência, para imprimir e entregar.
 *
 * Não é a tela impressa: é uma folha A4 própria, com a logo do salão, feita
 * para ir à mão do responsável pelo caixa. A diferença importa — a pessoa que
 * recebe uma folha com cara de documento trata o assunto como assunto; uma
 * captura de tela ela deixa em cima do balcão.
 *
 * Cada apontamento vem com duas linhas em branco, "o que houve" e "como foi
 * resolvido". São as duas perguntas que fecham um caso: a primeira registra o
 * fato, a segunda encerra. Uma sem a outra vira anotação solta.
 */
async function imprimirConferencia(
  r: Resultado, data: string, caixaSel: string, achados: Achado[],
) {
  const logo = await getLogoSalao()
  const esc = (v: any) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const COR = '#5b4fcf'
  const caixasMostrados = (r.caixas || []).filter(c => !caixaSel || c.responsavel === caixaSel)
  const totalCaixa = caixasMostrados.reduce((s, c) => s + c.total, 0)
  const comandasCaixa = caixasMostrados.reduce((s, c) => s + c.comandas, 0)

  /** Duas pautas em branco, para escrever à mão. */
  const pauta = () => `
    <div class="pauta"><span class="rot">O que houve</span><span class="linha"></span></div>
    <div class="pauta"><span class="rot">Como foi resolvido</span><span class="linha"></span></div>`

  const secao = (titulo: string, cor: string, lista: Achado[]) => {
    if (!lista.length) return ''
    const soma = lista.reduce((s, a) => s + (a.valorEmRisco || 0), 0)
    const grupos = agruparPorComanda(lista)
    const corpo = grupos.map(g => `
      <div class="caso">
        <div class="caso-cab">
          <b>${g.comanda === '—' ? 'Geral' : `Comanda ${esc(g.comanda)}`}</b>
          ${g.cliente !== '—' ? `<span class="cli">${esc(g.cliente)}</span>` : ''}
          ${g.caixa ? `<span class="tag">caixa ${esc(g.caixa)}</span>` : ''}
          ${g.risco > 0 ? `<span class="risco">${esc(moeda(g.risco))}</span>` : ''}
        </div>
        ${g.itens.map(a => `<div class="item">${
          a.servico && a.servico !== '—' ? `<b>${esc(a.servico)}</b> — ` : ''
        }${esc(a.texto)}</div>`).join('')}
        ${pauta()}
      </div>`).join('')
    return `<h2 style="color:${cor};border-color:${cor}">${titulo} · ${lista.length}${
      soma > 0 ? ` <span class="soma">${esc(moeda(soma))} em jogo</span>` : ''
    }</h2>${corpo}`
  }

  const porGrav = (g: string) => achados.filter(a => a.gravidade === g)

  const linhasLivres = (n: number) =>
    Array.from({ length: n }, () => '<div class="pauta"><span class="linha"></span></div>').join('')

  const css = `
    @page { size: A4 portrait; margin: 14mm }
    * { box-sizing: border-box; margin: 0; padding: 0 }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; font-size: 11.5px; line-height: 1.5 }
    .hd { display: flex; justify-content: space-between; align-items: center;
          border-bottom: 3px solid ${COR}; padding-bottom: 10px; margin-bottom: 16px }
    .logo { max-height: 58px; max-width: 210px; object-fit: contain }
    .brand { font-size: 22px; font-weight: 900; color: ${COR}; letter-spacing: .5px }
    .hd-dir { text-align: right; font-size: 10px; color: #777 }
    h1 { font-size: 18px; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 3px }
    .sub { font-size: 12px; color: #666; margin-bottom: 16px }
    .sub b { color: #1a1a2e }
    .resumo { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap }
    .selo { border: 1.5px solid #e4e1ee; border-radius: 8px; padding: 8px 14px; min-width: 110px }
    .selo .t { font-size: 8.5px; font-weight: 800; color: #777; text-transform: uppercase; letter-spacing: .5px }
    .selo .v { font-size: 15px; font-weight: 900 }
    .selo.risco { border-color: #fca5a5; background: #fef4f4 }
    .selo.risco .t, .selo.risco .v { color: #b91c1c }
    h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .5px;
         margin: 20px 0 9px; padding-bottom: 4px; border-bottom: 1.5px solid }
    h2 .soma { font-size: 10.5px; font-weight: 700; opacity: .8 }
    .caso { border: 1px solid #e4e1ee; border-radius: 8px; padding: 9px 11px;
            margin-bottom: 9px; page-break-inside: avoid }
    .caso-cab { margin-bottom: 3px }
    .caso-cab b { font-size: 12.5px }
    .cli { font-size: 11.5px; color: #444; margin-left: 7px }
    .tag { font-size: 9px; border: 1px solid #ddd; border-radius: 5px;
           padding: 1px 5px; margin-left: 7px; color: #666 }
    .risco { font-size: 12px; font-weight: 900; color: #b91c1c; margin-left: 7px }
    .item { font-size: 11px; color: #333; margin-top: 2px }
    .pauta { display: flex; align-items: flex-end; gap: 6px; margin-top: 10px }
    .pauta .rot { font-size: 8.5px; font-weight: 700; color: #888; white-space: nowrap }
    .pauta .linha { flex: 1; border-bottom: 1px solid #b9b4ad; height: 14px }
    .obs { border: 1px solid #e4e1ee; border-radius: 8px; padding: 11px 13px; margin-top: 6px }
    .assin { display: flex; gap: 40px; margin-top: 34px; page-break-inside: avoid }
    .assin div { flex: 1; text-align: center }
    .assin .risca { border-top: 1px solid #1a1a2e; margin-bottom: 5px; height: 34px }
    .assin span { font-size: 10px; color: #555 }
    .rodape { margin-top: 22px; border-top: 1px solid #eee; padding-top: 7px;
              font-size: 8.5px; color: #999; text-align: center }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact } }
  `

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Conferência de caixa — ${esc(data)}</title><style>${css}</style></head><body>
  <div class="hd">
    ${logo ? `<img src="${logo}" class="logo"/>` : `<div class="brand">NODRI</div>`}
    <div class="hd-dir">Emitido em ${esc(new Date().toLocaleDateString('pt-BR'))}</div>
  </div>

  <h1>Conferência de caixa</h1>
  <div class="sub">
    Dia <b>${esc(data)}</b> ·
    ${caixaSel ? `Caixa <b>${esc(caixaSel)}</b>` : `<b>Todos os caixas</b>`}
  </div>

  <div class="resumo">
    <div class="selo"><div class="t">Comandas</div><div class="v">${caixaSel ? comandasCaixa : r.comandas}</div></div>
    <div class="selo"><div class="t">Faturado</div><div class="v">${esc(moeda(r.faturado))}</div></div>
    ${caixasMostrados.length ? `<div class="selo"><div class="t">Total no caixa</div><div class="v">${esc(moeda(totalCaixa))}</div></div>` : ''}
    ${r.emRisco > 0 ? `<div class="selo risco"><div class="t">Em risco</div><div class="v">${esc(moeda(r.emRisco))}</div></div>` : ''}
  </div>

  ${caixasMostrados.length ? `<h2 style="color:${COR};border-color:${COR}">Caixas</h2>
    ${caixasMostrados.map(c => `<div class="caso">
      <div class="caso-cab"><b>${esc(c.responsavel)}</b>
        <span class="cli">${c.comandas} comanda(s) · ${esc(moeda(c.total))}</span>
        ${c.abertura || c.fechamento ? `<span class="tag">${esc(c.abertura || '?')} – ${esc(c.fechamento || '?')}</span>` : ''}
      </div>
      <div class="pauta"><span class="rot">Observação do caixa</span><span class="linha"></span></div>
      <div class="pauta"><span class="linha"></span></div>
    </div>`).join('')}` : ''}

  ${secao('Problemas', '#b91c1c', porGrav('problema'))}
  ${secao('Atenção', '#b45309', porGrav('atencao'))}
  ${secao('Não conferido', '#475569', porGrav('nao_conferido'))}

  <h2 style="color:${COR};border-color:${COR}">Observações gerais</h2>
  <div class="obs">${linhasLivres(6)}</div>

  <div class="assin">
    <div><div class="risca"></div><span>Responsável pelo caixa</span></div>
    <div><div class="risca"></div><span>Conferido por</span></div>
  </div>

  <div class="rodape">
    &quot;Não conferido&quot; não é erro: é o que o sistema não teve como julgar sozinho.
  </div>

  <script>window.onload=function(){window.print()}</script>
</body></html>`

  const w = window.open('', '_blank', 'width=1000,height=760')
  if (!w) { toast.error('O navegador bloqueou a janela de impressão.'); return }
  w.document.write(html); w.document.close(); w.focus()
}

/**
 * A lista de comandas por trás de um apontamento que fala de várias.
 *
 * Nasce fechada: aberta, ela empurraria os outros apontamentos para baixo toda
 * vez que a tela carrega. Fechada, o número continua sendo o resumo — e quem
 * precisa agir clica e vê quais são.
 */
function Detalhes({ itens, cor }: {
  itens: Array<{ comanda: string; cliente: string; profissional: string; valor?: number }>
  cor: string
}) {
  const [aberto, setAberto] = useState(false)
  return (
    <div style={{ marginTop: 5 }}>
      <button onClick={() => setAberto(v => !v)} className="conf-titulo"
        style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11.5, fontWeight: 800, color: cor }}>
        <ChevronRight size={12} style={{ transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform .15s ease' }} />
        {aberto ? 'esconder' : `ver quais (${itens.length})`}
      </button>

      {aberto && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6,
          borderLeft: `2px solid ${cor}33`, paddingLeft: 9 }}>
          {itens.map(d => (
            <div key={d.comanda} style={{ fontSize: 12, color: '#3f3a34', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <b style={{ color: '#1a1a1a', minWidth: 84 }}>Comanda {d.comanda}</b>
              <span style={{ flex: '1 1 140px', minWidth: 110 }}>{d.cliente}</span>
              <span style={{ color: d.profissional === 'Sem profissional lançado' ? '#b45309' : '#9ca3af',
                fontWeight: d.profissional === 'Sem profissional lançado' ? 700 : 400 }}>
                {d.profissional}
              </span>
              {typeof d.valor === 'number' && (
                <span style={{ marginLeft: 'auto', fontWeight: 800, color: '#1a1a1a',
                  fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {moeda(d.valor)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Junta os achados da mesma comanda num cartão só.
 *
 * Uma comanda com quatro problemas virava quatro cartões repetindo o mesmo
 * cabeçalho — o olho lia quatro casos onde havia um, e a lista parecia o dobro
 * do tamanho. O valor em risco é somado, porque é assim que ele é resolvido:
 * de uma vez, naquela comanda.
 */
function agruparPorComanda(lista: Achado[]) {
  const grupos = new Map<string, { comanda: string; cliente: string; caixa?: string; risco: number; itens: Achado[] }>()
  for (const a of lista) {
    const k = String(a.comanda)
    if (!grupos.has(k)) {
      grupos.set(k, { comanda: k, cliente: a.cliente || '—', caixa: a.caixa, risco: 0, itens: [] })
    }
    const g = grupos.get(k)!
    if (g.cliente === '—' && a.cliente && a.cliente !== '—') g.cliente = a.cliente
    if (!g.caixa && a.caixa) g.caixa = a.caixa
    g.risco += a.valorEmRisco || 0
    g.itens.push(a)
  }
  // Maior prejuízo primeiro: é por onde se começa a resolver.
  return Array.from(grupos.values()).sort((a, b) => b.risco - a.risco)
}

/**
 * Chip de filtro por caixa.
 *
 * Eram cinza-claro sobre branco, com 11,5px — davam para ler, não davam para
 * VER. Um filtro que não se enxerga é um filtro que ninguém usa, e a divisão
 * por caixa é metade do valor desta tela. Agora têm contraste, altura de alvo
 * de verdade e reagem ao mouse (a animação vive na classe .conf-chip).
 */
function chip(ativo: boolean): React.CSSProperties {
  return {
    border: `1.5px solid ${ativo ? '#5b4fcf' : '#d6d2ea'}`,
    background: ativo ? '#5b4fcf' : '#f6f5fc',
    color: ativo ? '#fff' : '#4a4560',
    borderRadius: 999, padding: '6px 15px', fontSize: 12.5, fontWeight: 800,
    cursor: 'pointer', lineHeight: 1.3,
    boxShadow: ativo ? '0 2px 8px rgba(91,79,207,.28)' : 'none',
  }
}

/**
 * Selo do resumo.
 *
 * `destaque` é vermelho e existe para UMA coisa só: o dinheiro em risco. Se
 * tudo chamasse atenção, nada chamaria — e o número que precisa ser visto
 * primeiro é sempre o mesmo.
 */
function Selo({ titulo, valor, destaque }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <div style={{
      border: `1.5px solid ${destaque ? '#fca5a5' : '#e8e6e0'}`,
      background: destaque ? '#fef2f2' : '#faf9f7',
      borderRadius: 10, padding: '9px 15px', minWidth: 96,
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: destaque ? '#b91c1c' : '#6b6860', textTransform: 'uppercase', letterSpacing: 0.5 }}>{titulo}</div>
      <div style={{ fontSize: destaque ? 18 : 16, fontWeight: 900, color: destaque ? '#b91c1c' : '#1a1a1a', fontVariantNumeric: 'tabular-nums', lineHeight: 1.25 }}>{valor}</div>
    </div>
  )
}
