'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, X, Printer, Coffee, Scissors, HandCoins, Wallet, Hand, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { quinzenaDeHoje, labelQuinzena, nomeQuinzena, dataNaQuinzena, parcelaNoPeriodo, type Quinzena } from '@/lib/quinzena'
import { valorParcelas } from '@/lib/kitsShared'

interface Prof { id: string; nome: string }

// Estruturas mínimas do que vem de cada fonte
interface DocBebidas { colunas: { id: string; nome: string; preco?: string }[]; cells: Record<string, string> }
interface Cel { t?: string }
interface DocServ { tabelas?: { linhas?: Cel[][] }[] }
interface DespItem { nome?: string; valor?: string; obs?: string; data?: string }
interface DadosCalc { despInd?: DespItem[]; extrasDespInd?: DespItem[] }
interface KitSol { profissionalNome?: string; valor?: number; status?: string; data?: string; parcelas?: number }

interface LinhaBebida { nome: string; valor: number }
interface LinhaDesconto { nome: string; bebidas: LinhaBebida[]; bebidasTot: number; serv: number; emp: number; kits: number; kitsNota: string[]; total: number }

const COR = '#5b4fcf'
function mesAtual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function parseValor(s: string): number {
  const n = Number(String(s || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}
function fmtBRL(n: number) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
// Detalhe copiável/impresso de um profissional: "Café R$ 6,00 / Capuccino R$ 16,00 / ..."
function partesDe(r: LinhaDesconto): string[] {
  const p: string[] = []
  r.bebidas.forEach(b => p.push(`${b.nome} R$ ${fmtBRL(b.valor)}`))
  if (r.serv > 0) p.push(`serviço interno R$ ${fmtBRL(r.serv)}`)
  if (r.kits > 0) p.push(`kit pé e mão R$ ${fmtBRL(r.kits)}${r.kitsNota.length ? ` (${r.kitsNota.join(', ')})` : ''}`)
  if (r.emp > 0) p.push(`empréstimo R$ ${fmtBRL(r.emp)}`)
  return p
}
const norm = (s: string) => (s || '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// É um empréstimo/adiantamento (dívida do profissional)? Vale-transporte/refeição NÃO conta.
const ehEmprestimo = (nome: string) => /(empr[eé]stimo|adiantament)/i.test(nome) || (/\bvale\b/i.test(nome) && !/(transp|refei|aliment)/i.test(nome))

// Descobre a qual profissional cadastrado a observação se refere (nome citado no texto)
function matchProf(obs: string, profs: Prof[]): string | null {
  const o = norm(obs); if (!o) return null
  let best: string | null = null
  for (const p of profs) {
    const pn = norm(p.nome)
    if (pn && pn.length >= 2 && new RegExp(`(^|[^a-z0-9])${escRe(pn)}([^a-z0-9]|$)`).test(o)) {
      if (!best || pn.length > norm(best).length) best = p.nome
    }
  }
  return best
}

const fetchGrid = (chave: string): Promise<any> => fetch(`/api/salon/grid?chave=${chave}`).then(r => r.ok ? r.json() : null).catch(() => null)

// Bebidas da quinzena escolhida. Mês inteiro (q=0) junta 1ª+2ª; a 1ª cai de
// volta na grade mensal antiga (bebidas_${mes}) quando ainda não migrou.
async function bebidasDoPeriodo(mes: string, q: Quinzena): Promise<DocBebidas | null> {
  const legado = () => fetchGrid(`bebidas_${mes}`)
  if (q === 1) return (await fetchGrid(`bebidas_${mes}_q1`)) || (await legado())
  if (q === 2) return await fetchGrid(`bebidas_${mes}_q2`)
  // mês inteiro: soma as duas quinzenas
  const [q1raw, q2] = await Promise.all([fetchGrid(`bebidas_${mes}_q1`), fetchGrid(`bebidas_${mes}_q2`)])
  const q1 = q1raw || (await legado())
  return mesclarBebidas(q1, q2)
}
function mesclarBebidas(a: DocBebidas | null, b: DocBebidas | null): DocBebidas | null {
  if (!a && !b) return null
  const colunas = [...(a?.colunas || [])]
  for (const c of (b?.colunas || [])) { const j = colunas.find(x => x.id === c.id); if (!j) colunas.push(c); else if (!j.preco && c.preco) j.preco = c.preco }
  const cells: Record<string, string> = {}
  for (const src of [a?.cells || {}, b?.cells || {}]) for (const [k, v] of Object.entries(src)) cells[k] = String((Number(cells[k]) || 0) + (Number(v) || 0))
  return { colunas, cells }
}

// embutido: renderiza direto na pagina (sem a moldura de janela), para abrir
// dentro do setor. Sem ele, segue como a janela que o Check List usa.
export default function ConsolidadoDescontos({ open, onClose, embutido = false }: { open: boolean; onClose: () => void; embutido?: boolean }) {
  const [mes, setMes] = useState(mesAtual())
  const [quinzena, setQuinzena] = useState<Quinzena>(quinzenaDeHoje())
  const [loading, setLoading] = useState(false)
  const [linhas, setLinhas] = useState<LinhaDesconto[]>([])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [ano, mesNum] = mes.split('-').map(Number)
      const [profsRaw, bebidas, serv, calc, kitsResp] = await Promise.all([
        fetch('/api/profissionais').then(r => r.ok ? r.json() : []).catch(() => []),
        bebidasDoPeriodo(mes, quinzena),
        fetchGrid(`servinterno_${mes}`) as Promise<DocServ | null>,
        fetch(`/api/salon/calculadora?ano=${ano}&mes=${mesNum}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/kits/solicitacoes?mes=${mes}`).then(r => r.ok ? r.json() : null).catch(() => null),
      ])
      // Setor mora na mesma tabela de profissionais e não tem desconto a lançar.
      const profs: Prof[] = (Array.isArray(profsRaw) ? profsRaw : []).filter((p: any) => !p.is_departamento).map((p: any) => ({ id: p.id, nome: p.apelido || p.nome_completo || '—' }))
      const nomePorId = new Map(profs.map(p => [p.id, p.nome]))

      const acc = new Map<string, LinhaDesconto>()
      const pega = (nome: string): LinhaDesconto => {
        const k = norm(nome)
        if (!acc.has(k)) acc.set(k, { nome, bebidas: [], bebidasTot: 0, serv: 0, emp: 0, kits: 0, kitsNota: [], total: 0 })
        return acc.get(k)!
      }

      // 1) BEBIDAS — quantidade × preço de cada bebida, por profissional
      if (bebidas && Array.isArray(bebidas.colunas)) {
        const cells = bebidas.cells || {}
        for (const col of bebidas.colunas) {
          const preco = parseValor(col.preco || '')
          if (preco <= 0) continue
          for (const [chave, qtdStr] of Object.entries(cells)) {
            if (!chave.endsWith(`::${col.id}`)) continue
            const profId = chave.slice(0, chave.length - col.id.length - 2)
            const qtd = Number(qtdStr) || 0
            if (qtd <= 0) continue
            const nome = nomePorId.get(profId); if (!nome) continue
            const r = pega(nome)
            const val = qtd * preco
            r.bebidas.push({ nome: col.nome, valor: val }); r.bebidasTot += val
          }
        }
      }

      // 2) SERVIÇOS INTERNOS — soma dos lançamentos da quinzena (pela data do item)
      const linhasServ = serv?.tabelas?.[0]?.linhas || []
      for (const l of linhasServ) {
        const profNome = (l[3]?.t || '').trim()
        const valor = parseValor(l[4]?.t || '')
        if (!profNome || valor <= 0) continue
        if (!dataNaQuinzena(l[0]?.t || '', mes, quinzena)) continue
        pega(profNome).serv += valor
      }

      // 3) EMPRÉSTIMOS — despesas indiretas com nome do profissional na observação.
      //    Filtra pela data do lançamento; sem data cai só no "mês inteiro".
      const dados: DadosCalc = calc?.dados || {}
      const itensCalc = [...(dados.despInd || []), ...(dados.extrasDespInd || [])]
      for (const it of itensCalc) {
        const valor = parseValor(it.valor || '')
        if (valor <= 0 || !ehEmprestimo(it.nome || '')) continue
        if (!dataNaQuinzena(it.data || '', mes, quinzena)) continue
        const profNome = matchProf(it.obs || '', profs)
        if (!profNome) continue
        pega(profNome).emp += valor
      }

      // 4) KITS PÉ E MÃO — só os já SEPARADOS pelo salão.
      //
      // PARCELADO desconta uma parcela POR QUINZENA, começando na quinzena do
      // pedido: pedido de 2× feito na 2ª quinzena de agosto cobra metade em
      // 16–31/08 e a outra metade em 01–15/09. Antes o valor inteiro caía na
      // quinzena do pedido e a segunda parcela não aparecia em lugar nenhum —
      // a manicure pagava tudo de uma vez sem ter combinado isso.
      const kitsList: KitSol[] = Array.isArray(kitsResp?.solicitacoes) ? kitsResp.solicitacoes : []
      for (const k of kitsList) {
        if (k.status !== 'separado') continue
        const valor = Number(k.valor) || 0
        const nome = (k.profissionalNome || '').trim()
        if (valor <= 0 || !nome) continue

        const nParc = Math.max(1, Math.floor(Number(k.parcelas) || 1))
        if (nParc === 1) {
          if (!dataNaQuinzena(k.data || '', mes, quinzena)) continue
          pega(nome).kits += valor
          continue
        }

        const qual = parcelaNoPeriodo(k.data || '', nParc, mes, quinzena)
        if (!qual) continue
        const valores = valorParcelas(valor, nParc)
        const linha = pega(nome)
        linha.kits += valores[qual.numero - 1] || 0
        linha.kitsNota.push(`parcela ${qual.numero}/${qual.total}`)
      }

      const lista = Array.from(acc.values())
        .map(r => ({ ...r, total: r.bebidasTot + r.serv + r.emp + r.kits }))
        .filter(r => r.total > 0)
        .sort((a, b) => b.total - a.total)
      setLinhas(lista)
    } catch { setLinhas([]) }
    setLoading(false)
  }, [mes, quinzena])

  useEffect(() => { if (open) carregar() }, [open, carregar])

  const totalGeral = linhas.reduce((s, r) => s + r.total, 0)

  async function copiar(r: LinhaDesconto) {
    const texto = partesDe(r).join(' / ')
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(texto)
      else { const ta = document.createElement('textarea'); ta.value = texto; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove() }
      toast.success('Copiado! É só colar')
    } catch { toast.error('Não consegui copiar') }
  }

  function imprimir() {
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const rows = linhas.map(r => {
      const partes: string[] = []
      r.bebidas.forEach(b => partes.push(`${esc(b.nome)} R$ ${fmtBRL(b.valor)}`))
      if (r.serv > 0) partes.push(`serviço interno R$ ${fmtBRL(r.serv)}`)
      if (r.kits > 0) partes.push(`kit pé e mão R$ ${fmtBRL(r.kits)}${r.kitsNota.length ? ` (${r.kitsNota.join(', ')})` : ''}`)
      if (r.emp > 0) partes.push(`empréstimo R$ ${fmtBRL(r.emp)}`)
      return `<tr><td class="nm">${esc(r.nome)}</td><td class="det">${partes.join('  ·  ') || '—'}</td><td class="tot">R$ ${fmtBRL(r.total)}</td></tr>`
    }).join('')
    const css = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px}h1{text-align:center;font-size:16px;color:${COR};margin-bottom:4px}.sub{text-align:center;font-size:11px;color:#777;margin-bottom:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #f0ede6;padding:7px 9px;text-align:left;vertical-align:top}th{background:#f6f4ff;color:${COR};border-bottom:2px solid ${COR};font-size:10px;text-transform:uppercase}.nm{font-weight:800;white-space:nowrap}.det{font-size:10.5px;color:#555}.tot{font-weight:800;color:#15803d;text-align:right;white-space:nowrap}tfoot td{background:#f0fdf4;color:#15803d;font-weight:900;border-top:2px solid ${COR}}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Desconto do mês</title><style>${css}</style></head><body><h1>DESCONTO DO MÊS — CONSOLIDADO</h1><div class="sub">${esc(nomeQuinzena(quinzena))} · ${esc(labelQuinzena(mes, quinzena))} · bebidas + serviços internos + kits pé e mão + empréstimos</div><table><thead><tr><th>Profissional</th><th>Descontos</th><th style="text-align:right">Total devido</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="2">TOTAL GERAL</td><td style="text-align:right">R$ ${fmtBRL(totalGeral)}</td></tr></tfoot></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  if (!open) return null

  return (
    <div onClick={embutido ? undefined : onClose} style={embutido ? undefined : { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 14, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={embutido
        ? { background: '#fff', borderRadius: 16, width: '100%', overflow: 'hidden', border: '1px solid #e8e6e0' }
        : { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, margin: '20px auto', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        {/* Cabeçalho */}
        <div style={{ background: 'linear-gradient(135deg,#7c3aed,#5b4fcf)', color: '#fff', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <HandCoins size={20} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 900 }}>Lançar Desconto — consolidado do mês</div>
              <div style={{ fontSize: 11.5, opacity: .9 }}>Tudo que cada profissional deve, numa lista só: bebidas + serviços internos + kits pé e mão + empréstimos</div>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: 'rgba(255,255,255,.2)', color: '#fff', cursor: 'pointer', borderRadius: 8, width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Mês:</label>
            <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '6px 9px', borderRadius: 8, border: 'none', fontSize: 13, color: '#1a1a1a' }} />
            <div style={{ display: 'inline-flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,.5)' }}>
              {([1, 2, 0] as const).map(q => (
                <button key={q} onClick={() => setQuinzena(q)}
                  style={{ padding: '6px 10px', border: 'none', background: quinzena === q ? '#fff' : 'rgba(255,255,255,.12)', color: quinzena === q ? COR : '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {q === 0 ? 'Mês inteiro' : `${q}ª quinzena`}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, background: 'rgba(255,255,255,.2)', borderRadius: 20, padding: '4px 10px', whiteSpace: 'nowrap' }}>{labelQuinzena(mes, quinzena)}</span>
            <div style={{ flex: 1 }} />
            <button onClick={imprimir} disabled={loading || linhas.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, border: 'none', background: '#fff', color: COR, fontSize: 12.5, fontWeight: 800, cursor: linhas.length ? 'pointer' : 'default', opacity: linhas.length ? 1 : .6 }}><Printer size={14} /> Imprimir</button>
          </div>
        </div>

        {/* Corpo */}
        <div style={{ padding: 16, maxHeight: '65vh', overflowY: 'auto', background: '#faf9f7' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={26} className="animate-spin" style={{ color: COR }} /></div>
          ) : linhas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 34, color: '#9ca3af', fontSize: 13.5, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
              Nenhum valor a descontar na {nomeQuinzena(quinzena).toLowerCase()} ({labelQuinzena(mes, quinzena)}).<br />
              <span style={{ fontSize: 12 }}>Cadastre o preço das bebidas, lance serviços internos, empréstimos (na calculadora, com o nome do profissional) e/ou separe kits pé e mão para que apareçam aqui.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {linhas.map(r => (
                <div key={r.nome} style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: '13px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <strong style={{ fontSize: 15, color: '#1a1a1a', flex: 1 }}>{r.nome}</strong>
                    <button onClick={() => copiar(r)} title="Copiar o detalhe (ex: Café R$ 6,00 / Capuccino R$ 16,00)"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #d8d4f0', background: '#f5f3ff', color: '#5b4fcf', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}><Copy size={13} /> Copiar</button>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#15803d', background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 20, padding: '4px 12px' }}>TOTAL R$ {fmtBRL(r.total)}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {r.bebidas.map((b, i) => <Chip key={'b' + i} icon={<Coffee size={12} />} cor="#b45309" bg="#fff7ed" bd="#fed7aa">{b.nome} R$ {fmtBRL(b.valor)}</Chip>)}
                    {r.serv > 0 && <Chip icon={<Scissors size={12} />} cor="#0e7490" bg="#ecfeff" bd="#a5f3fc">serviço interno R$ {fmtBRL(r.serv)}</Chip>}
                    {r.kits > 0 && (
                      <Chip icon={<Hand size={12} />} cor="#be185d" bg="#fdf2f8" bd="#fbcfe8">
                        kit pé e mão R$ {fmtBRL(r.kits)}
                        {r.kitsNota.length > 0 && ` · ${r.kitsNota.join(', ')}`}
                      </Chip>
                    )}
                    {r.emp > 0 && <Chip icon={<Wallet size={12} />} cor="#9333ea" bg="#faf5ff" bd="#e9d5ff">empréstimo R$ {fmtBRL(r.emp)}</Chip>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé com total geral */}
        {!loading && linhas.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderTop: '1px solid #e8e6e0', background: '#fff' }}>
            <span style={{ fontSize: 13, color: '#6b6860' }}>{linhas.length} profissional{linhas.length > 1 ? 'is' : ''} com desconto</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#6b6860' }}>TOTAL GERAL</span>
            <strong style={{ fontSize: 18, color: '#15803d' }}>R$ {fmtBRL(totalGeral)}</strong>
          </div>
        )}
      </div>
    </div>
  )
}

function Chip({ children, icon, cor, bg, bd }: { children: React.ReactNode; icon: React.ReactNode; cor: string; bg: string; bd: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: cor, background: bg, border: `1px solid ${bd}`, borderRadius: 8, padding: '5px 10px' }}>
      {icon}{children}
    </span>
  )
}
