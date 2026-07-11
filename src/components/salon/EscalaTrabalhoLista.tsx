'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, Wallet, Briefcase, CalendarDays, Plus, Trash2, Settings, X, PartyPopper } from 'lucide-react'
import { getLogoSalao } from '@/lib/logoSalao'
import { parseBRLNumber } from '@/lib/kitsShared'

interface DomingoRow { dia: number; data: string; fechado: boolean; motivo: string; cabeleireiro: string; assistente: string; manicure: string; recepcao: string }
interface CltRow { id: string; nome: string; qtdDias: string; passagem: string; pix: string; manual?: boolean }
interface PjRow { id: string; nome: string; qtdDias: string; passagem: string; pix: string; dataAdmissao: string; manual?: boolean }
interface Profissional { id: string; nome_completo: string; apelido: string; vinculo?: string; ativo?: boolean; data_admissao?: string; conta_bancaria?: string; habilidades?: string }
interface ConfigDias { ativo: boolean; domingoSemEscala: boolean; folgaSemanal: boolean; feriados: boolean; folgaCompensatoriaCltDomingo: boolean }
interface FeriadoRow { nome: string; data: string; horario: string; profissionais: string; fechado: boolean }

const COR = '#5b4fcf'
const CONFIG_PADRAO: ConfigDias = { ativo: true, domingoSemEscala: true, folgaSemanal: true, feriados: true, folgaCompensatoriaCltDomingo: true }
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] // índice = Date.getDay()
const rid = () => Math.random().toString(36).slice(2, 9)
function mesAtual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function fmtBRL(n: number) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
const nomeDe = (p: Profissional) => p.apelido || p.nome_completo || '—'
const normaliza = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
const mesmoNome = (a: string, b: string) => normaliza(a) === normaliza(b)
function parseFolgas(habilidades?: string): string[] {
  try { return JSON.parse(habilidades || '{}').dias_folga || [] } catch { return [] }
}
// Um nome "está" numa lista de escalados (texto livre, nomes separados por / ou vírgula)
// se aparecer como um dos pedaços — evita falso positivo tipo "ANA" casar com "MARIANA".
function nomeNaLista(nome: string, lista: string): boolean {
  const alvo = normaliza(nome)
  if (!alvo) return false
  return lista.split(/[/,]/).map(normaliza).some(n => n === alvo)
}
// Todas as datas dd/mm/aaaa dentro de um texto livre (ex: "02, 03 e 04/03/2026") caem no mesmo mês/ano do último bloco.
function feriadoNoMes(dataTexto: string, mes: string): boolean {
  const [anoSel, mesSel] = mes.split('-').map(Number)
  const re = /(\d{2})\/(\d{2})\/(\d{4})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(dataTexto || ''))) {
    if (Number(m[2]) === mesSel && Number(m[3]) === anoSel) return true
  }
  return false
}
// Sugestão de dias trabalhados no mês: total de dias - folga semanal fixa (exceto domingo,
// tratado à parte pela escala) - domingos em que ele não está escalado - feriados fechados
// ou em que ele não consta na lista de escalados. Pra CLT, quando ele TRABALHA no domingo
// também desconta 1 dia — ele folga durante a semana pra compensar (folga compensatória),
// então aquele domingo não soma um dia trabalhado a mais no mês.
function diasSugeridosMes(nome: string, folgas: string[], mes: string, domingos: DomingoRow[], feriadosDoMes: FeriadoRow[], config: ConfigDias, compensarDomingoTrabalhado: boolean): number {
  const [ano, m] = mes.split('-').map(Number)
  const totalDias = new Date(ano, m, 0).getDate()
  let dias = totalDias
  const folgaIdx = new Set(folgas.map(f => DIAS_SEMANA.indexOf(f)).filter(i => i >= 0))

  if (config.folgaSemanal) {
    for (let d = 1; d <= totalDias; d++) {
      const dow = new Date(ano, m - 1, d).getDay()
      if (dow !== 0 && folgaIdx.has(dow)) dias--
    }
  }

  if (config.domingoSemEscala) {
    domingos.forEach(dm => {
      if (dm.fechado) { dias--; return }
      const escalados = [dm.cabeleireiro, dm.assistente, dm.manicure, dm.recepcao].join('/')
      const trabalhou = nomeNaLista(nome, escalados)
      if (!trabalhou) dias--
      else if (compensarDomingoTrabalhado) dias--
    })
  } else if (config.folgaSemanal && folgaIdx.has(0)) {
    domingos.forEach(() => { dias-- })
  }

  if (config.feriados) {
    feriadosDoMes.forEach(f => {
      if (f.fechado) { dias--; return }
      if (f.profissionais && !nomeNaLista(nome, f.profissionais)) dias--
    })
  }

  return Math.max(0, dias)
}

function domingosDoMes(mes: string): { dia: number; data: string }[] {
  const [ano, m] = mes.split('-').map(Number)
  const totalDias = new Date(ano, m, 0).getDate()
  const out: { dia: number; data: string }[] = []
  for (let d = 1; d <= totalDias; d++) {
    if (new Date(ano, m - 1, d).getDay() === 0) out.push({ dia: d, data: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${ano}` })
  }
  return out
}

// Quantos meses (0, 1 ou 2...) se passaram entre a admissão e o mês selecionado.
function mesesDesdeAdmissao(dataAdmissao: string, mesSelecionado: string): number | null {
  if (!dataAdmissao) return null
  const m = String(dataAdmissao).match(/^(\d{4})-(\d{2})/)
  if (!m) return null
  const [anoSel, mesSel] = mesSelecionado.split('-').map(Number)
  const anoAdm = Number(m[1]), mesAdm = Number(m[2])
  return (anoSel - anoAdm) * 12 + (mesSel - mesAdm)
}

// Data exata em que os 3 meses de ajuda de custo acabam (admissão + 3 meses).
// Se o dia não existir no mês de destino (ex: admissão dia 31 e o mês seguinte
// só tem 30), usa o último dia daquele mês em vez de estourar pro mês seguinte.
function dataLimitePJ(dataAdmissao: string): Date | null {
  const m = String(dataAdmissao || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const ano = Number(m[1]), mes0 = Number(m[2]) - 1, dia = Number(m[3])
  const alvo = new Date(ano, mes0 + 3, 1)
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  alvo.setDate(Math.min(dia, ultimoDia))
  return alvo
}
function fmtDataBR(d: Date) { return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}` }

// Lê o formato antigo (GridEditavel — tabelas/linhas) só na 1ª vez que abrir
// este mês, pra não perder dados já preenchidos antes da página mudar. Só
// migra cada bloco se as colunas baterem com o layout que o salão vinha
// usando (nome, dias, valores, pix) — se for outro formato (ex: mês nunca
// customizado, ainda no modelo padrão antigo), ignora e começa em branco
// pra não embaralhar dado incompatível.
function migrarFormatoAntigo(doc: any): { domingos: DomingoRow[]; clt: CltRow[]; pj: PjRow[]; alimentacaoPorDia: number } | null {
  if (!doc || !Array.isArray(doc.tabelas)) return null
  const [tDomingos, tClt, tPj] = doc.tabelas

  const domingos: DomingoRow[] = (tDomingos?.cabecalho?.length >= 4) ? (tDomingos?.linhas || []).map((l: any[]) => {
    const dia = parseInt(l[0]?.t || '') || 0
    const c1 = l[1]
    const fechado = !!c1 && ((c1.cs || 1) > 1 || /fechado/i.test(c1.t || ''))
    return {
      dia, data: '', fechado, motivo: fechado ? (c1?.t || '') : '',
      cabeleireiro: fechado ? '' : (l[1]?.t || ''), assistente: fechado ? '' : (l[2]?.t || ''),
      manicure: fechado ? '' : (l[3]?.t || ''), recepcao: fechado ? '' : (l[4]?.t || ''),
    }
  }).filter((r: DomingoRow) => r.dia > 0) : []

  const cltOk = (tClt?.cabecalho?.length || 0) >= 6
  const clt: CltRow[] = cltOk ? (tClt?.linhas || []).filter((l: any[]) => (l[0]?.t || '').trim()).map((l: any[]) => ({
    id: rid(), nome: l[0]?.t || '', qtdDias: (l[1]?.t || '').trim(), passagem: String(parseBRLNumber(l[3]?.t || '') || ''), pix: l[6]?.t || '',
  })) : []
  const alimentacaoPorDia = cltOk ? parseBRLNumber(tClt?.linhas?.[0]?.[2]?.t || '') : 0

  const pjOk = (tPj?.cabecalho?.length || 0) >= 5
  const pj: PjRow[] = pjOk ? (tPj?.linhas || []).filter((l: any[]) => (l[0]?.t || '').trim()).map((l: any[]) => ({
    id: rid(), nome: l[0]?.t || '', qtdDias: (l[1]?.t || '').trim(), passagem: String(parseBRLNumber(l[2]?.t || '') || ''), pix: l[4]?.t || '', dataAdmissao: '',
  })) : []

  return { domingos, clt, pj, alimentacaoPorDia }
}

// Célula com chips dos nomes escalados + botão "+" que abre uma lista suspensa
// do cadastro pra escolher, em vez de digitar o nome na mão. O valor continua
// sendo salvo como texto "Nome / Nome" pra manter compatibilidade com o que
// já existia (mesmo formato que a impressão e o formato antigo usam).
function SeletorNomes({ value, onChange, opcoes }: { value: string; onChange: (v: string) => void; opcoes: string[] }) {
  const [aberto, setAberto] = useState(false)
  const nomes = value ? value.split('/').map(s => s.trim()).filter(Boolean) : []
  function add(nome: string) {
    onChange([...nomes, nome].join(' / '))
    setAberto(false)
  }
  function remover(nome: string) {
    onChange(nomes.filter(n => n !== nome).join(' / '))
  }
  const disponiveis = opcoes.filter(o => !nomes.some(n => mesmoNome(n, o)))
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', minHeight: 26 }}>
        {nomes.map(n => (
          <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#f0eefb', color: COR, fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 20, whiteSpace: 'nowrap' }}>
            {n}
            <button type="button" onClick={() => remover(n)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: COR, fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
          </span>
        ))}
        <button type="button" onClick={() => setAberto(v => !v)} title="Adicionar profissional" style={{ border: '1px dashed #d0cdc7', background: 'transparent', borderRadius: 20, width: 20, height: 20, cursor: 'pointer', fontSize: 13, color: '#9ca3af', lineHeight: 1, flexShrink: 0 }}>+</button>
      </div>
      {aberto && (
        <>
          <div onClick={() => setAberto(false)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />
          <div style={{ position: 'absolute', zIndex: 30, top: '100%', left: 0, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.15)', minWidth: 170, maxHeight: 220, overflowY: 'auto', marginTop: 3 }}>
            {disponiveis.length === 0 ? <div style={{ padding: 8, fontSize: 12, color: '#9ca3af' }}>Sem opções</div> : disponiveis.map(o => (
              <div key={o} onClick={() => add(o)} style={{ padding: '7px 10px', fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' }} onMouseEnter={e => (e.currentTarget.style.background = '#f8f7ff')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{o}</div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function EscalaTrabalhoLista({ chave = 'escala' }: { chave?: string }) {
  const [mes, setMes] = useState(mesAtual())
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [domingos, setDomingos] = useState<DomingoRow[]>([])
  const [alimentacaoStr, setAlimentacaoStr] = useState('')
  const [cltRows, setCltRows] = useState<CltRow[]>([])
  const [pjRows, setPjRows] = useState<PjRow[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [feriadosDoc, setFeriadosDoc] = useState<any>(null)
  const [config, setConfig] = useState<ConfigDias>(CONFIG_PADRAO)
  const [configAberta, setConfigAberta] = useState(false)
  const [salvandoConfig, setSalvandoConfig] = useState(false)

  const chaveMes = `${chave}_${mes}`

  useEffect(() => {
    fetch('/api/profissionais').then(r => r.ok ? r.json() : []).then((arr: any[]) => setProfissionais(Array.isArray(arr) ? arr : [])).catch(() => {})
    fetch('/api/salon/grid?chave=feriados').then(r => r.ok ? r.json() : null).then(setFeriadosDoc).catch(() => {})
    fetch('/api/salon/grid?chave=escala_config').then(r => r.ok ? r.json() : null).then(d => { if (d && typeof d.ativo === 'boolean') setConfig({ ...CONFIG_PADRAO, ...d }) }).catch(() => {})
  }, [])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chaveMes)}`).then(r => r.ok ? r.json() : null)
      const migrado = d && !d.domingos && d.tabelas ? migrarFormatoAntigo(d) : null
      const salvoDomingos: DomingoRow[] = d?.domingos || migrado?.domingos || []
      const salvoClt: CltRow[] = d?.clt?.linhas || migrado?.clt || []
      const salvoPj: PjRow[] = d?.pj?.linhas || migrado?.pj || []
      const alimSalva = d?.clt?.alimentacaoPorDia ?? migrado?.alimentacaoPorDia ?? 0

      // Domingos: sempre os do mês selecionado, preservando o que já tinha preenchido
      const base = domingosDoMes(mes)
      setDomingos(base.map(b => {
        const ex = salvoDomingos.find(r => r.dia === b.dia)
        return ex ? { ...ex, data: b.data } : { dia: b.dia, data: b.data, fechado: false, motivo: '', cabeleireiro: '', assistente: '', manicure: '', recepcao: '' }
      }))
      setAlimentacaoStr(alimSalva ? String(alimSalva).replace('.', ',') : '')

      // CLT: todo profissional com vínculo CLT e ativo, + linhas adicionadas manualmente
      // (rede de segurança pra quem tem cadastro incompleto, ex: sem "Vínculo Trabalhista" preenchido)
      const cltProfs = profissionais.filter(p => p.vinculo === 'CLT' && p.ativo !== false)
      const cltAuto = cltProfs.map(p => {
        const nome = nomeDe(p)
        const ex = salvoClt.find(r => mesmoNome(r.nome, nome))
        return ex ? { ...ex, nome, manual: false } : { id: rid(), nome, qtdDias: '', passagem: '', pix: p.conta_bancaria || '' }
      })
      const cltManual = salvoClt.filter(r => r.manual && !cltProfs.some(p => mesmoNome(nomeDe(p), r.nome)))
      setCltRows([...cltAuto, ...cltManual])

      // PJ: vínculo MEI, ativo, dentro dos 3 primeiros meses de contrato (0, 1 ou 2), + manuais
      const pjProfs = profissionais.filter(p => {
        if (p.vinculo !== 'MEI' || p.ativo === false) return false
        const meses = mesesDesdeAdmissao(p.data_admissao || '', mes)
        return meses !== null && meses >= 0 && meses < 3
      })
      const pjAuto = pjProfs.map(p => {
        const nome = nomeDe(p)
        const ex = salvoPj.find(r => mesmoNome(r.nome, nome))
        return ex ? { ...ex, nome, dataAdmissao: p.data_admissao || '', manual: false } : { id: rid(), nome, qtdDias: '', passagem: '', pix: p.conta_bancaria || '', dataAdmissao: p.data_admissao || '' }
      })
      const pjManual = salvoPj.filter(r => r.manual && !pjProfs.some(p => mesmoNome(nomeDe(p), r.nome)))
      setPjRows([...pjAuto, ...pjManual])

      setDirty(false)
    } catch { /* mantém o que já tinha */ }
    setLoading(false)
  }, [chaveMes, mes, profissionais])
  useEffect(() => { carregar() }, [carregar])

  function editDomingo(dia: number, patch: Partial<DomingoRow>) {
    setDomingos(prev => prev.map(r => r.dia === dia ? { ...r, ...patch } : r)); setDirty(true)
  }
  function editClt(id: string, patch: Partial<CltRow>) {
    setCltRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r)); setDirty(true)
  }
  function editPj(id: string, patch: Partial<PjRow>) {
    setPjRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r)); setDirty(true)
  }
  function adicionarCltManual() {
    setCltRows(prev => [...prev, { id: rid(), nome: '', qtdDias: '', passagem: '', pix: '', manual: true }]); setDirty(true)
  }
  function removerClt(id: string) {
    setCltRows(prev => prev.filter(r => r.id !== id)); setDirty(true)
  }
  function adicionarPjManual() {
    setPjRows(prev => [...prev, { id: rid(), nome: '', qtdDias: '', passagem: '', pix: '', dataAdmissao: '', manual: true }]); setDirty(true)
  }
  function removerPj(id: string) {
    setPjRows(prev => prev.filter(r => r.id !== id)); setDirty(true)
  }
  async function salvarConfig(novo: ConfigDias) {
    setConfig(novo)
    setSalvandoConfig(true)
    try {
      await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: 'escala_config', doc: novo }) })
    } catch { /* mantém local mesmo se falhar salvar */ }
    setSalvandoConfig(false)
  }

  const nomesProfissionais = profissionais.filter(p => p.ativo !== false).map(nomeDe)
  const feriadosDoMes: FeriadoRow[] = (feriadosDoc?.tabelas?.[0]?.linhas || []).filter((l: any[]) => feriadoNoMes(l[1]?.t || '', mes)).map((l: any[]) => ({
    nome: l[0]?.t || '', data: l[1]?.t || '', horario: l[2]?.t || '', profissionais: l[3]?.t || '',
    fechado: /fechado/i.test(l[2]?.t || '') || /fechado/i.test(l[4]?.t || ''),
  }))

  const alimentacaoPorDia = parseBRLNumber(alimentacaoStr)
  const cltCalc = cltRows.map(r => {
    const dias = Number(r.qtdDias) || 0, passagem = parseBRLNumber(r.passagem)
    const porDia = alimentacaoPorDia + passagem
    const prof = profissionais.find(p => mesmoNome(nomeDe(p), r.nome))
    const sugestao = config.ativo && prof ? diasSugeridosMes(r.nome, parseFolgas(prof.habilidades), mes, domingos, feriadosDoMes, config, config.folgaCompensatoriaCltDomingo) : null
    return { ...r, porDia, total: porDia * dias, sugestao }
  })
  const pjCalc = pjRows.map(r => {
    const dias = Number(r.qtdDias) || 0, passagem = parseBRLNumber(r.passagem)
    const meses = mesesDesdeAdmissao(r.dataAdmissao, mes)
    const limite = dataLimitePJ(r.dataAdmissao)
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const diasRestantes = limite ? Math.round((limite.getTime() - hoje.getTime()) / 86400000) : null
    const prof = profissionais.find(p => mesmoNome(nomeDe(p), r.nome))
    const sugestao = config.ativo && prof ? diasSugeridosMes(r.nome, parseFolgas(prof.habilidades), mes, domingos, feriadosDoMes, config, false) : null
    return { ...r, total: passagem * dias, mesElegibilidade: meses === null ? null : meses + 1, limite, diasRestantes, sugestao }
  })
  const totalClt = cltCalc.reduce((s, r) => s + r.total, 0)
  const totalPj = pjCalc.reduce((s, r) => s + r.total, 0)

  async function salvar() {
    setSalvando(true)
    try {
      const doc = {
        domingos,
        clt: { alimentacaoPorDia, linhas: cltRows },
        pj: { linhas: pjRows },
      }
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: chaveMes, doc }) })
      if (res.ok) { toast.success('Escala salva!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  async function imprimir() {
    const logoSalao = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const periodo = mes.split('-').reverse().join('/')
    const linhasDom = domingos.map(d => d.fechado
      ? `<tr><td>${esc(d.data)}</td><td colspan="4" class="fechado">${esc(d.motivo || 'FECHADO')}</td></tr>`
      : `<tr><td>${esc(d.data)}</td><td>${esc(d.cabeleireiro)}</td><td>${esc(d.assistente)}</td><td>${esc(d.manicure)}</td><td>${esc(d.recepcao)}</td></tr>`
    ).join('')
    const linhasClt = cltCalc.map(r => `<tr><td>${esc(r.nome)}</td><td class="c">${r.qtdDias || 0}</td><td class="c">R$ ${fmtBRL(alimentacaoPorDia)}</td><td class="c">R$ ${fmtBRL(parseBRLNumber(r.passagem))}</td><td class="c">R$ ${fmtBRL(r.porDia)}</td><td class="c">R$ ${fmtBRL(r.total)}</td><td>${esc(r.pix)}</td></tr>`).join('')
    const linhasPj = pjCalc.map(r => `<tr><td>${esc(r.nome)}</td><td class="c">${r.qtdDias || 0}</td><td class="c">R$ ${fmtBRL(parseBRLNumber(r.passagem))}</td><td class="c">R$ ${fmtBRL(r.total)}</td><td class="c">${r.limite ? (r.diasRestantes !== null && r.diasRestantes < 0 ? `venceu ${esc(fmtDataBR(r.limite))}` : `${esc(fmtDataBR(r.limite))} (${r.diasRestantes}d)`) : '—'}</td><td>${esc(r.pix)}</td></tr>`).join('')
    const cab = logoSalao ? `<img src="${logoSalao}" class="logo"/>` : `<div class="brand">NODRI</div>`
    const css = `@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px}.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${COR};padding-bottom:10px;margin-bottom:10px}.logo{max-height:56px;max-width:200px;object-fit:contain}.brand{font-size:22px;font-weight:900;color:${COR}}h1{font-size:16px;margin-bottom:12px;text-transform:uppercase}h2{font-size:12.5px;color:${COR};margin:16px 0 6px;text-transform:uppercase;border-bottom:1.5px solid ${COR};padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-bottom:6px}th,td{border:1px solid #f0ede6;padding:6px 8px;text-align:left}th{background:#f6f4ff;color:${COR};border-bottom:2px solid ${COR};font-size:9.5px;text-transform:uppercase}td.c,th.c{text-align:center}td.fechado{text-align:center;font-weight:800;color:#0891b2;background:#ecfeff}tfoot td{background:#f6f4ff;color:${COR};font-weight:800;border-top:2px solid ${COR}}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Escala — ${esc(periodo)}</title><style>${css}</style></head><body><div class="hd">${cab}<span style="font-size:10px;color:#777">${new Date().toLocaleDateString('pt-BR')}</span></div><h1>Escala de Trabalho — ${esc(periodo)}</h1><h2>Domingos</h2><table><thead><tr><th>Data</th><th>Cabeleireiro</th><th>Assistente</th><th>Manicure</th><th>Recepção</th></tr></thead><tbody>${linhasDom}</tbody></table><h2>Vale Transporte e Alimentação — CLT</h2><table><thead><tr><th>Nome</th><th class="c">Dias</th><th class="c">Alimentação</th><th class="c">Passagem</th><th class="c">Alim.+Pass.</th><th class="c">Total</th><th>PIX</th></tr></thead><tbody>${linhasClt}</tbody><tfoot><tr><td colspan="5">TOTAL</td><td class="c">R$ ${fmtBRL(totalClt)}</td><td></td></tr></tfoot></table><h2>Ajuda de Custo — PJ (3 primeiros meses)</h2><table><thead><tr><th>Nome</th><th class="c">Dias</th><th class="c">Passagem</th><th class="c">Total</th><th class="c">Vence em</th><th>PIX</th></tr></thead><tbody>${linhasPj}</tbody><tfoot><tr><td colspan="3">TOTAL</td><td class="c">R$ ${fmtBRL(totalPj)}</td><td></td><td></td></tr></tfoot></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=1100,height=750'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div>
      <style>{`
        .esc-table { width:100%; border-collapse:collapse; min-width:680px; }
        .esc-table th { text-align:left; font-size:11px; font-weight:800; color:#6b6860; text-transform:uppercase; letter-spacing:.3px; padding:10px 12px; background:#faf9f7; border-bottom:1px solid #e8e6e0; }
        .esc-table td { padding:8px 10px; border-bottom:1px solid #f0eee8; vertical-align:middle; }
        .esc-table tbody tr:nth-child(even) { background:#fbfbfa; }
        .esc-input { width:100%; border:1px solid transparent; background:transparent; outline:none; font-family:inherit; padding:6px 7px; border-radius:6px; font-size:13px; }
        .esc-input:focus, .esc-input:hover { border-color:#d0cdc7; background:#fff; }
      `}</style>

      {/* ── Mês + ações ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '10px 12px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860' }}>Mês:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 9px', borderRadius: 8, border: '1px solid #d0cdc7', fontSize: 13 }} />
        <div style={{ flex: 1 }} />
        {dirty && !salvando && <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Alterações não salvas</span>}
        <button onClick={() => setConfigAberta(true)} title="Configurações de cálculo automático" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 10px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Settings size={14} /></button>
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir A4</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>

      {configAberta && (
        <div onClick={() => setConfigAberta(false)} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 20, maxWidth: 440, width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}><Settings size={16} color={COR} /> Configurações — Dias trabalhados</h3>
              <button onClick={() => setConfigAberta(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 16px' }}>Calcula uma sugestão de dias trabalhados no mês pra cada profissional, com base no cadastro. Você sempre pode editar o número manualmente depois.</p>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>
              <input type="checkbox" checked={config.ativo} onChange={e => salvarConfig({ ...config, ativo: e.target.checked })} style={{ width: 16, height: 16 }} />
              Sugerir dias automaticamente
            </label>

            <div style={{ marginLeft: 4, opacity: config.ativo ? 1 : 0.4, pointerEvents: config.ativo ? 'auto' : 'none' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', cursor: 'pointer', fontSize: 12.5, color: '#374151' }}>
                <input type="checkbox" checked={config.folgaSemanal} onChange={e => salvarConfig({ ...config, folgaSemanal: e.target.checked })} style={{ width: 15, height: 15, marginTop: 2 }} />
                <span>Descontar o dia de folga semanal fixo (configurado no cadastro do profissional)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', cursor: 'pointer', fontSize: 12.5, color: '#374151' }}>
                <input type="checkbox" checked={config.domingoSemEscala} onChange={e => salvarConfig({ ...config, domingoSemEscala: e.target.checked })} style={{ width: 15, height: 15, marginTop: 2 }} />
                <span>Descontar domingos em que ele não está escalado (tabela acima) ou que estão marcados como fechado</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', cursor: 'pointer', fontSize: 12.5, color: '#374151' }}>
                <input type="checkbox" checked={config.folgaCompensatoriaCltDomingo} onChange={e => salvarConfig({ ...config, folgaCompensatoriaCltDomingo: e.target.checked })} style={{ width: 15, height: 15, marginTop: 2 }} />
                <span>CLT: também descontar 1 dia quando ele trabalha no domingo (folga compensatória durante a semana)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', cursor: 'pointer', fontSize: 12.5, color: '#374151' }}>
                <input type="checkbox" checked={config.feriados} onChange={e => salvarConfig({ ...config, feriados: e.target.checked })} style={{ width: 15, height: 15, marginTop: 2 }} />
                <span>Descontar feriados fechados ou em que ele não consta escalado (Escala de Feriados)</span>
              </label>
            </div>
            {salvandoConfig && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Salvando...</p>}
          </div>
        </div>
      )}

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div> : (
        <>
          {/* ── Domingos ── */}
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}><CalendarDays size={16} color={COR} /> Domingos de trabalho — {mes.split('-').reverse().join('/')}</h3>
            <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '0 0 12px' }}>Os domingos do mês são gerados automaticamente. Marque "Fechado" pra feriado/evento sem expediente.</p>
            {domingos.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>Nenhum domingo neste mês.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="esc-table">
                  <thead><tr><th style={{ width: 120 }}>Data</th><th style={{ width: 90 }}>Fechado?</th><th>Cabeleireiro</th><th>Assistente</th><th>Manicure</th><th>Recepção</th></tr></thead>
                  <tbody>
                    {domingos.map(d => (
                      <tr key={d.dia}>
                        <td style={{ fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap' }}>{d.data}</td>
                        <td><input type="checkbox" checked={d.fechado} onChange={e => editDomingo(d.dia, { fechado: e.target.checked })} style={{ width: 18, height: 18, cursor: 'pointer' }} /></td>
                        {d.fechado ? (
                          <td colSpan={4}>
                            <input value={d.motivo} onChange={e => editDomingo(d.dia, { motivo: e.target.value })} placeholder="Motivo (ex: Fechado — Jogo)" className="esc-input" style={{ fontWeight: 700, color: '#0891b2', textAlign: 'center' }} />
                          </td>
                        ) : (
                          <>
                            <td><SeletorNomes value={d.cabeleireiro} onChange={v => editDomingo(d.dia, { cabeleireiro: v })} opcoes={nomesProfissionais} /></td>
                            <td><SeletorNomes value={d.assistente} onChange={v => editDomingo(d.dia, { assistente: v })} opcoes={nomesProfissionais} /></td>
                            <td><SeletorNomes value={d.manicure} onChange={v => editDomingo(d.dia, { manicure: v })} opcoes={nomesProfissionais} /></td>
                            <td><SeletorNomes value={d.recepcao} onChange={v => editDomingo(d.dia, { recepcao: v })} opcoes={nomesProfissionais} /></td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Feriados (puxado direto da Escala de Feriados) ── */}
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}><PartyPopper size={16} color={COR} /> Feriados — {mes.split('-').reverse().join('/')}</h3>
            <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '0 0 12px' }}>Puxado automaticamente da aba "Escala de Feriados". Pra editar, ajuste por lá.</p>
            {feriadosDoMes.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>Nenhum feriado cadastrado neste mês.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="esc-table">
                  <thead><tr><th>Feriado</th><th style={{ width: 140 }}>Data</th><th style={{ width: 140 }}>Horário</th><th>Profissionais escalados</th></tr></thead>
                  <tbody>
                    {feriadosDoMes.map((f, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700, color: '#1a1a1a' }}>{f.nome}</td>
                        <td>{f.data}</td>
                        <td>{f.fechado ? <span style={{ color: '#dc2626', fontWeight: 800 }}>FECHADO</span> : f.horario}</td>
                        <td style={{ color: '#6b6860' }}>{f.profissionais || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── CLT ── */}
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}><Wallet size={16} color={COR} /> Vale Transporte e Alimentação — CLT</h3>
            <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '0 0 10px' }}>Nomes puxados automaticamente de quem tem vínculo CLT ativo. Preencha os dias trabalhados e o valor da passagem — o resto calcula sozinho.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: '#6b6860' }}>Alimentação por dia (R$):</label>
              <input value={alimentacaoStr} onChange={e => { setAlimentacaoStr(e.target.value); setDirty(true) }} inputMode="decimal" placeholder="0,00" style={{ width: 100, padding: '7px 9px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />
            </div>
            {cltRows.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>Nenhum profissional com vínculo CLT ativo cadastrado.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="esc-table">
                  <thead><tr><th>Nome</th><th className="c" style={{ width: 80 }}>Dias</th><th style={{ width: 90 }}>Alimentação</th><th style={{ width: 110 }}>Passagem/dia</th><th style={{ width: 110 }}>Alim.+Pass.</th><th style={{ width: 120 }}>Total a pagar</th><th style={{ width: 200 }}>PIX</th><th style={{ width: 36 }} /></tr></thead>
                  <tbody>
                    {cltCalc.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700, color: '#1a1a1a' }}>
                          {r.manual ? <input value={r.nome} onChange={e => editClt(r.id, { nome: e.target.value })} className="esc-input" placeholder="Nome do profissional" style={{ fontWeight: 700 }} /> : r.nome}
                        </td>
                        <td>
                          <input value={r.qtdDias} onChange={e => editClt(r.id, { qtdDias: e.target.value })} className="esc-input" style={{ textAlign: 'center' }} placeholder="0" />
                          {r.sugestao !== null && (
                            <div style={{ fontSize: 9.5, color: '#9ca3af', textAlign: 'center', marginTop: -2 }}>
                              sugestão {r.sugestao}{String(r.sugestao) !== r.qtdDias.trim() && <button type="button" onClick={() => editClt(r.id, { qtdDias: String(r.sugestao) })} style={{ marginLeft: 4, border: 'none', background: 'transparent', color: COR, fontWeight: 700, cursor: 'pointer', fontSize: 9.5, textDecoration: 'underline', padding: 0 }}>usar</button>}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', color: '#6b6860' }}>R$ {fmtBRL(alimentacaoPorDia)}</td>
                        <td><input value={r.passagem} onChange={e => editClt(r.id, { passagem: e.target.value })} className="esc-input" style={{ textAlign: 'center' }} placeholder="0,00" /></td>
                        <td style={{ textAlign: 'center', color: '#6b6860' }}>R$ {fmtBRL(r.porDia)}</td>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>R$ {fmtBRL(r.total)}</td>
                        <td><textarea value={r.pix} onChange={e => editClt(r.id, { pix: e.target.value })} className="esc-input" rows={2} style={{ resize: 'vertical', fontFamily: 'inherit', display: 'block' }} placeholder="Chave / dados PIX" /></td>
                        <td style={{ textAlign: 'center' }}>{r.manual && <button onClick={() => removerClt(r.id)} title="Remover" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626', padding: 4 }}><Trash2 size={15} /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={5} style={{ padding: '10px 12px', fontWeight: 800, color: COR, textAlign: 'right' }}>TOTAL</td><td style={{ padding: '10px 12px', fontWeight: 900, color: '#16a34a', textAlign: 'center' }}>R$ {fmtBRL(totalClt)}</td><td /><td /></tr></tfoot>
                </table>
              </div>
            )}
            <button onClick={adicionarCltManual} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '7px 12px', borderRadius: 8, border: `1.5px dashed ${COR}`, background: '#f8f7ff', color: COR, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}><Plus size={14} /> Adicionar manualmente</button>
          </div>

          {/* ── PJ ── */}
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}><Briefcase size={16} color={COR} /> Ajuda de Custo — Profissionais PJ</h3>
            <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '0 0 12px' }}>Só entram aqui automaticamente os PJ (MEI/CNPJ) dentro dos 3 primeiros meses de contrato, com base na data de admissão do cadastro.</p>
            {pjRows.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>Nenhum profissional PJ dentro dos 3 primeiros meses neste período.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="esc-table">
                  <thead><tr><th>Nome</th><th style={{ width: 90 }}>Mês</th><th className="c" style={{ width: 80 }}>Dias</th><th style={{ width: 110 }}>Passagem/dia</th><th style={{ width: 120 }}>Total a pagar</th><th style={{ width: 200 }}>PIX</th><th style={{ width: 36 }} /></tr></thead>
                  <tbody>
                    {pjCalc.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700, color: '#1a1a1a' }}>
                          {r.manual ? <input value={r.nome} onChange={e => editPj(r.id, { nome: e.target.value })} className="esc-input" placeholder="Nome do profissional" style={{ fontWeight: 700 }} /> : r.nome}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {r.mesElegibilidade ? <span style={{ fontSize: 11, fontWeight: 800, color: COR, background: '#f0eefb', padding: '3px 9px', borderRadius: 20 }}>{r.mesElegibilidade}/3</span> : '—'}
                          {r.limite && (
                            <div style={{ fontSize: 10, marginTop: 4, fontWeight: 700, whiteSpace: 'nowrap', color: r.diasRestantes !== null && r.diasRestantes < 0 ? '#dc2626' : r.diasRestantes !== null && r.diasRestantes <= 7 ? '#b45309' : '#9ca3af' }}>
                              {r.diasRestantes !== null && r.diasRestantes < 0 ? `venceu ${fmtDataBR(r.limite)}` : `vence ${fmtDataBR(r.limite)} (${r.diasRestantes}d)`}
                            </div>
                          )}
                        </td>
                        <td>
                          <input value={r.qtdDias} onChange={e => editPj(r.id, { qtdDias: e.target.value })} className="esc-input" style={{ textAlign: 'center' }} placeholder="0" />
                          {r.sugestao !== null && (
                            <div style={{ fontSize: 9.5, color: '#9ca3af', textAlign: 'center', marginTop: -2 }}>
                              sugestão {r.sugestao}{String(r.sugestao) !== r.qtdDias.trim() && <button type="button" onClick={() => editPj(r.id, { qtdDias: String(r.sugestao) })} style={{ marginLeft: 4, border: 'none', background: 'transparent', color: COR, fontWeight: 700, cursor: 'pointer', fontSize: 9.5, textDecoration: 'underline', padding: 0 }}>usar</button>}
                            </div>
                          )}
                        </td>
                        <td><input value={r.passagem} onChange={e => editPj(r.id, { passagem: e.target.value })} className="esc-input" style={{ textAlign: 'center' }} placeholder="0,00" /></td>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>R$ {fmtBRL(r.total)}</td>
                        <td><textarea value={r.pix} onChange={e => editPj(r.id, { pix: e.target.value })} className="esc-input" rows={2} style={{ resize: 'vertical', fontFamily: 'inherit', display: 'block' }} placeholder="Chave / dados PIX" /></td>
                        <td style={{ textAlign: 'center' }}>{r.manual && <button onClick={() => removerPj(r.id)} title="Remover" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626', padding: 4 }}><Trash2 size={15} /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={4} style={{ padding: '10px 12px', fontWeight: 800, color: COR, textAlign: 'right' }}>TOTAL</td><td style={{ padding: '10px 12px', fontWeight: 900, color: '#16a34a', textAlign: 'center' }}>R$ {fmtBRL(totalPj)}</td><td /><td /></tr></tfoot>
                </table>
              </div>
            )}
            <button onClick={adicionarPjManual} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '7px 12px', borderRadius: 8, border: `1.5px dashed ${COR}`, background: '#f8f7ff', color: COR, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}><Plus size={14} /> Adicionar manualmente</button>
          </div>
        </>
      )}
    </div>
  )
}
