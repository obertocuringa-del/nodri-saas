'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Plus, Minus, X, MessageCircle, Send, Printer, ListChecks, History } from 'lucide-react'
import toast from 'react-hot-toast'
import GridEditavel, { cel, type Doc as GridDoc } from '@/components/salon/GridEditavel'
import ListaBebidas from '@/components/salon/ListaBebidas'
import ListaTelefones from '@/components/salon/ListaTelefones'

interface ProfSalao { id: string; nome: string; telefone: string }
interface Coluna { id: string; nome: string; telefone: string }
interface Doc { colunas: Coluna[]; cells: Record<string, number> }

const SERVICOS = [
  { key: 'realinhamento', label: 'Realinhamento' },
  { key: 'corte', label: 'Corte' },
  { key: 'mechas', label: 'Mechas' },
  { key: 'pigmentacao', label: 'Pigmentação' },
]

// Listas de preenchimento livre (sem contador)
const linhasVazias = (qtd: number, cols: number): GridDoc['tabelas'][0]['linhas'] => Array.from({ length: qtd }, () => Array.from({ length: cols }, () => cel('')))

const DEFAULT_ALICATES: GridDoc = { tabelas: [{ titulo: 'CONTROLE DE ALICATES', cabecalho: [cel('Data recebido'), cel('Responsável por receber'), cel('Profissional'), cel('Quantidade'), cel('Data da devolução'), cel('Assinatura')], linhas: linhasVazias(12, 6) }] }
const DEFAULT_PRODUTOS: GridDoc = { tabelas: [{ titulo: 'CONSUMO DE PRODUTOS', cabecalho: [cel('Profissional'), cel('Data'), cel('Cliente'), cel('Produto'), cel('Quantidade')], linhas: linhasVazias(12, 5) }] }
const DEFAULT_SERV_INT: GridDoc = { tabelas: [{ titulo: 'SERVIÇO INTERNO / PRODUTOS UTILIZADOS', cabecalho: [cel('Data'), cel('Produto'), cel('Quantidade'), cel('Profissional'), cel('Valor')], linhas: linhasVazias(14, 5) }] }

const GRIDS = [
  { key: 'alicates', label: 'Controle de Alicates', mensal: false, landscape: true, doc: DEFAULT_ALICATES },
  { key: 'produtos', label: 'Consumo de Produtos', mensal: false, landscape: true, doc: DEFAULT_PRODUTOS },
  { key: 'servinterno', label: 'Serviços Internos', mensal: false, landscape: false, doc: DEFAULT_SERV_INT },
]
const TAB_GRIDS = [{ key: 'bebidas', label: 'Bebidas' }, ...GRIDS.map(g => ({ key: g.key, label: g.label }))]

// ── Abas do topo (além de Listas) ──
const ABAS_TOPO = [
  { key: 'listas', label: 'Listas' },
  { key: 'telefones', label: 'Telefones Importantes' },
  { key: 'ata', label: 'Ata de Reunião' },
  { key: 'escala', label: 'Escala de Trabalho' },
  { key: 'feriados', label: 'Escala de Feriados' },
  { key: 'senhas', label: 'Senhas' },
]

const DEFAULT_ATA: GridDoc = { tabelas: [
  { titulo: 'PAUTA DA REUNIÃO', cabecalho: [cel('Nº'), cel('Ponto a apresentar'), cel('Responsável'), cel('Decisão / Encaminhamento')], linhas: Array.from({ length: 8 }, (_, i) => [cel(String(i + 1)), cel(''), cel(''), cel('')]) },
  { titulo: 'ASSINATURAS DOS PROFISSIONAIS', cabecalho: [cel('Profissional'), cel('Assinatura')], linhas: linhasVazias(12, 2) },
] }

const SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
function escalaDoMes(mes: string): GridDoc {
  const [y, m] = mes.split('-').map(Number)
  const dias = new Date(y, m, 0).getDate()
  const linhas = Array.from({ length: dias }, (_, i) => {
    const d = i + 1, wd = new Date(y, m - 1, d).getDay()
    const c0 = cel(`${String(d).padStart(2, '0')} - ${SEM[wd]}`); c0.b = true; if (wd === 0) c0.bg = '#fef08a'
    return [c0, cel(''), cel('')]
  })
  return { tabelas: [
    { titulo: 'ESCALA DE TRABALHO', cabecalho: [cel('Dia'), cel('Profissionais escalados'), cel('Obs')], linhas, larguras: [120, 560, 220] },
    { titulo: 'VALE TRANSPORTE E ALIMENTAÇÃO', cabecalho: [cel('Nome'), cel('Dias'), cel('Valor'), cel('PIX')], linhas: linhasVazias(8, 4), larguras: [220, 120, 140, 220] },
    { titulo: 'AJUDA DE CUSTO PARA PROFISSIONAIS', cabecalho: [cel('Nome'), cel('Cálculo'), cel('Valor'), cel('PIX')], linhas: linhasVazias(6, 4), larguras: [220, 180, 140, 220] },
  ] }
}

const FERIADOS_2026: [string, string, string][] = [
  ['Carnaval', '02, 03 e 04/03/2026', 'FECHADO'],
  ['Tira Dentes', '21/04/2026', '10:00 às 18:00'],
  ['Dia do Trabalhador', '01/05/2026', '10:00 às 18:00'],
  ['Sete de Setembro', '07/09/2026', '10:00 às 18:00'],
  ['Nossa Senhora', '12/10/2026', '10:00 às 18:00'],
  ['Finados', '02/11/2026', '10:00 às 18:00'],
  ['Proclamação da República', '15/11/2026', '10:00 às 18:00'],
  ['Consciência Negra', '20/11/2026', '10:00 às 18:00'],
  ['Natal', '24/12/2026', '10:00 às 18:00'],
  ['Ano Novo', '31/12/2026', '10:00 às 18:00'],
]
const DEFAULT_FERIADOS: GridDoc = { tabelas: [
  { titulo: 'ESCALA DE FERIADOS', cabecalho: [cel('Feriado'), cel('Data'), cel('Horário'), cel('Profissionais escalados (1 por linha ou separados por vírgula)'), cel('Obs')], linhas: FERIADOS_2026.map(([f, d, h]) => [cel(f), cel(d), cel(h), cel(''), cel('')]), larguras: [180, 150, 130, 640, 200] },
] }

const DEFAULT_SENHAS: GridDoc = { tabelas: [
  { titulo: 'DADOS E SENHAS DO SALÃO', cabecalho: [cel('Descrição'), cel('Informação')], linhas: [
    [cel('PIX Salão'), cel('CNPJ: 29.789.033/0001-44 — OLIVEIRA E SCHNEIDER INSTITUTO DE BELEZA LTDA')],
    [cel('Conta para transferência'), cel('Agência: 3426-6 · Conta corrente: 21949-5 · CNPJ: 29.789.033/0001-44')],
    [cel('E-mail Salão'), cel('ROUGEHAIR110@GMAIL.COM')],
    [cel('Senha do e-mail'), cel('')],
    [cel('Wi-Fi'), cel('')],
    [cel('Sistema NODRI'), cel('')],
  ] },
] }

function mesAtual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function diasNoMes(mes: string) { const [y, m] = mes.split('-').map(Number); return new Date(y, m, 0).getDate() }

export default function SalaoAdministrativoPage() {
  const router = useRouter()
  const [profsSalao, setProfsSalao] = useState<ProfSalao[]>([])
  const [servico, setServico] = useState('realinhamento')
  const [abaTopo, setAbaTopo] = useState('listas')
  const [historico, setHistorico] = useState<any[]>([])
  const [verHistorico, setVerHistorico] = useState(false)

  useEffect(() => {
    fetch('/api/profissionais').then(r => r.ok ? r.json() : []).then((arr: any[]) => {
      setProfsSalao((Array.isArray(arr) ? arr : []).map(p => {
        let tel = p.telefone || ''
        if (!tel) { try { tel = JSON.parse(p.contato_responsavel || '{}').tel || '' } catch { /* */ } }
        return { id: p.id, nome: p.apelido || p.nome_completo || '—', telefone: tel }
      }))
    }).catch(() => { })
    carregarHistorico()
  }, [])

  const carregarHistorico = useCallback(() => {
    fetch('/api/salon/listas?mensagens=1').then(r => r.ok ? r.json() : []).then(d => setHistorico(Array.isArray(d) ? d : [])).catch(() => { })
  }, [])

  return (
    <div className="nodri-salon-bg" style={{ minHeight: '100vh' }}>
      <nav style={{ background: '#faf9f7', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}>🗂️ Salão Administrativo</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => { setVerHistorico(true); carregarHistorico() }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid #d0cdc7', borderRadius: 8, padding: '6px 12px', color: '#6b6860', cursor: 'pointer', fontSize: 13 }}><History size={14} /> Mensagens</button>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
        {/* Abas do topo */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, borderBottom: '2px solid #ece9e2', paddingBottom: 12 }}>
          {ABAS_TOPO.map(a => (
            <button key={a.key} onClick={() => setAbaTopo(a.key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: abaTopo === a.key ? '#5b4fcf' : '#f0eefb', color: abaTopo === a.key ? '#fff' : '#5b4fcf', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>
              {a.key === 'listas' && <ListChecks size={15} />}{a.label}
            </button>
          ))}
        </div>

        {abaTopo === 'listas' && (<>
          {/* Sub-abas de serviços (com contador) */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {SERVICOS.map(s => (
              <button key={s.key} onClick={() => setServico(s.key)}
                style={{ padding: '9px 16px', borderRadius: 10, border: servico === s.key ? 'none' : '1.5px solid #e0ddd8', background: servico === s.key ? '#1a1a1a' : '#fff', color: servico === s.key ? '#fff' : '#6b6860', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
                Lista de {s.label}
              </button>
            ))}
          </div>
          {/* Sub-abas de preenchimento livre (sem contador) */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {TAB_GRIDS.map(g => (
              <button key={g.key} onClick={() => setServico(g.key)}
                style={{ padding: '9px 16px', borderRadius: 10, border: servico === g.key ? 'none' : '1.5px solid #e0ddd8', background: servico === g.key ? '#5b4fcf' : '#fff', color: servico === g.key ? '#fff' : '#6b6860', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
                {g.label}
              </button>
            ))}
          </div>

          {SERVICOS.some(s => s.key === servico)
            ? <ListaServico key={servico} servico={servico} label={SERVICOS.find(s => s.key === servico)?.label || ''} profsSalao={profsSalao} onMensagem={carregarHistorico} />
            : servico === 'bebidas'
              ? <ListaBebidas key="bebidas" profsSalao={profsSalao} />
              : (() => { const g = GRIDS.find(x => x.key === servico)!; return <GridEditavel key={servico} chave={g.key} defaultDoc={g.doc} mensal={g.mensal} landscape={g.landscape} /> })()}
        </>)}

        {abaTopo === 'telefones' && <ListaTelefones />}
        {abaTopo === 'ata' && <GridEditavel key="ata" chave="ata" defaultDoc={DEFAULT_ATA} />}
        {abaTopo === 'escala' && <GridEditavel key="escala" chave="escala" defaultDocFn={escalaDoMes} mensal landscape />}
        {abaTopo === 'feriados' && <GridEditavel key="feriados" chave="feriados" defaultDoc={DEFAULT_FERIADOS} landscape />}
        {abaTopo === 'senhas' && <GridEditavel key="senhas" chave="senhas" defaultDoc={DEFAULT_SENHAS} />}
      </div>

      {verHistorico && (
        <div onClick={() => setVerHistorico(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>📨 Mensagens enviadas (relatório)</h3>
              <button onClick={() => setVerHistorico(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            {historico.length === 0 ? <p style={{ color: '#9ca3af', fontSize: 13 }}>Nenhuma mensagem registrada ainda.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {historico.map((m, i) => (
                  <div key={i} style={{ border: '1px solid #e8e6e0', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#5b4fcf' }}>{m.prof} · {m.servico} · {m.mes}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 5 }}>{new Date(m.enviada_em).toLocaleString('pt-BR')}</div>
                    <div style={{ fontSize: 12.5, color: '#374151', whiteSpace: 'pre-wrap' }}>{m.texto}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ListaServico({ servico, label, profsSalao, onMensagem }: { servico: string; label: string; profsSalao: ProfSalao[]; onMensagem: () => void }) {
  const [mes, setMes] = useState(mesAtual())
  const [doc, setDoc] = useState<Doc>({ colunas: [], cells: {} })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [msgProf, setMsgProf] = useState<Coluna | null>(null)
  const [msgTexto, setMsgTexto] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/listas?servico=${servico}&mes=${mes}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.colunas)) setDoc({ colunas: d.colunas, cells: d.cells || {} })
      else setDoc({ colunas: [], cells: {} })
    } catch { setDoc({ colunas: [], cells: {} }) }
    setDirty(false); setLoading(false)
  }, [servico, mes])
  useEffect(() => { carregar() }, [carregar])

  const dias = diasNoMes(mes)
  const totalDe = (profId: string) => { let t = 0; for (let d = 1; d <= dias; d++) t += doc.cells[`${d}-${profId}`] || 0; return t }
  const totais = doc.colunas.map(c => totalDe(c.id))
  const somaGeral = totais.reduce((a, b) => a + b, 0)
  const media = doc.colunas.length ? Math.round(somaGeral / doc.colunas.length) : 0
  // próximo da vez = menor total; empate → mais à esquerda
  let proximoIdx = -1
  if (doc.colunas.length) { let min = Infinity; doc.colunas.forEach((_, i) => { if (totais[i] < min) { min = totais[i]; proximoIdx = i } }) }

  function mut(fn: (d: Doc) => void) { setDoc(prev => { const n: Doc = JSON.parse(JSON.stringify(prev)); fn(n); return n }); setDirty(true) }
  function inc(dia: number, profId: string, delta: number) { mut(d => { const k = `${dia}-${profId}`; d.cells[k] = Math.max(0, (d.cells[k] || 0) + delta) }) }
  function addProf(p: ProfSalao) { if (doc.colunas.some(c => c.id === p.id)) return; mut(d => { d.colunas.push({ id: p.id, nome: p.nome, telefone: p.telefone }) }); setAddOpen(false) }
  function delProf(id: string) { mut(d => { d.colunas = d.colunas.filter(c => c.id !== id); Object.keys(d.cells).forEach(k => { if (k.endsWith(`-${id}`)) delete d.cells[k] }) }) }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/listas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servico, mes, doc }) })
      if (res.ok) { toast.success('Lista salva!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function abrirMsg(c: Coluna) {
    const total = totalDe(c.id)
    const diff = media - total
    const serv = label.toLowerCase()
    let txt: string
    if (diff > 0) txt = `Olá *${c.nome}*! 👋\n\nNeste mês você atendeu *${total}* de ${serv}, enquanto a média do salão é *${media}*. Isso são *${diff}* a menos.\n\nSei que pode ser por conta da sua logística pessoal e de tempo. Quer que eu ajuste sua agenda, abrindo mais horários para clientes sem preferência de profissional? O que você acha que ajudaria?\n\nConte comigo! 💛`
    else txt = `Olá *${c.nome}*! 👏\n\nNeste mês você atendeu *${total}* de ${serv}, ${total > media ? 'acima da' : 'na'} média do salão (*${media}*). Parabéns pelo empenho, continue assim! 💛`
    setMsgTexto(txt); setMsgProf(c)
  }
  async function enviarMsg() {
    if (!msgProf) return
    const fone = String(msgProf.telefone || '').replace(/\D/g, '')
    if (fone) { const numero = fone.startsWith('55') ? fone : '55' + fone; window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msgTexto)}`, '_blank') }
    else toast('Sem telefone no cadastro — mensagem só será registrada.', { icon: '⚠️' })
    try {
      await fetch('/api/salon/listas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem: { servico: label, mes, prof: msgProf.nome, total: totalDe(msgProf.id), media, texto: msgTexto } }) })
      toast.success('Mensagem registrada no relatório'); onMensagem()
    } catch { /* */ }
    setMsgProf(null)
  }

  function imprimir() {
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const head = doc.colunas.map(c => `<th>${esc(c.nome)}</th>`).join('')
    let body = ''
    for (let d = 1; d <= dias; d++) body += `<tr><td class="dia">${d}</td>${doc.colunas.map(c => `<td>${doc.cells[`${d}-${c.id}`] || ''}</td>`).join('')}</tr>`
    const tot = doc.colunas.map((c, i) => `<td><b>${totais[i]}</b></td>`).join('')
    const css = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px}h1{text-align:center;font-size:15px;margin-bottom:8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;text-align:center;padding:3px 4px}th{background:#eee}.dia{background:#f7f6ff;font-weight:700}tfoot td{background:#fce7f3;font-weight:800}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(label)}</title><style>${css}</style></head><body><h1>${esc(label.toUpperCase())} — ${esc(mes.split('-').reverse().join('/'))}</h1><table><thead><tr><th>DIA</th>${head}</tr></thead><tbody>${body}</tbody><tfoot><tr><td>TOT</td>${tot}</tr></tfoot></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  const disponiveis = profsSalao.filter(p => !doc.colunas.some(c => c.id === p.id))

  return (
    <div>
      {/* Controles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: '#6b6860' }}>Mês:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />
        <div style={{ position: 'relative' }}>
          <button onClick={() => setAddOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Plus size={14} /> Adicionar profissional</button>
          {addOpen && (
            <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 30, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.15)', minWidth: 200, maxHeight: 260, overflowY: 'auto', padding: 6 }}>
              {disponiveis.length === 0 ? <div style={{ padding: 10, fontSize: 12, color: '#9ca3af' }}>Todos já adicionados.</div> :
                disponiveis.map(p => <button key={p.id} onClick={() => addProf(p)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, borderRadius: 6 }} onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{p.nome}{!p.telefone && <span style={{ color: '#f59e0b', fontSize: 10 }}> (sem tel)</span>}</button>)}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>

      <div style={{ fontSize: 12, color: '#6b6860', marginBottom: 10 }}>
        Clique em <strong style={{ color: '#16a34a' }}>+</strong> para somar um atendimento. O <span style={{ color: '#ef4444', fontWeight: 800 }}>🔴 É A VEZ</span> aponta quem tem menos atendimentos (rodízio justo, da esquerda p/ direita). Média do salão: <strong>{media}</strong>.
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> :
        doc.colunas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
            Adicione os profissionais desta lista no botão <strong>+ Adicionar profissional</strong> acima.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 8 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 120 + doc.colunas.length * 130 }}>
              <thead>
                <tr>
                  <th style={{ ...thSt, width: 44, position: 'sticky', left: 0, background: '#f3f0ff', zIndex: 2 }}>DIA</th>
                  {doc.colunas.map((c, i) => (
                    <th key={c.id} style={{ ...thSt, background: proximoIdx === i ? '#fef2f2' : '#f3f0ff', borderTop: proximoIdx === i ? '3px solid #ef4444' : thSt.border }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        {proximoIdx === i && <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', background: '#ef4444', borderRadius: 10, padding: '1px 7px' }}>🔴 É A VEZ</span>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontWeight: 800, fontSize: 13 }}>{c.nome}</span>
                          <button onClick={() => delProf(c.id)} title="Remover" style={{ border: 'none', background: 'transparent', color: '#cbb', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
                        </div>
                        <button onClick={() => abrirMsg(c)} title="Enviar WhatsApp" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, border: 'none', background: '#25D366', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}><MessageCircle size={11} /> WhatsApp</button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: dias }, (_, k) => k + 1).map(d => (
                  <tr key={d}>
                    <td style={{ ...tdSt, fontWeight: 700, background: '#f7f6ff', position: 'sticky', left: 0, zIndex: 1 }}>{d}</td>
                    {doc.colunas.map(c => {
                      const v = doc.cells[`${d}-${c.id}`] || 0
                      return (
                        <td key={c.id} style={tdSt}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {v > 0 && <button onClick={() => inc(d, c.id, -1)} style={miniBtn('#ef4444')}><Minus size={11} /></button>}
                            <span style={{ minWidth: 18, textAlign: 'center', fontWeight: v > 0 ? 800 : 400, color: v > 0 ? '#1a1a1a' : '#cbd5e1', fontSize: 14 }}>{v || ''}</span>
                            <button onClick={() => inc(d, c.id, 1)} title="Adicionar" style={miniBtn('#16a34a')}><Plus size={11} /></button>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ ...tdSt, fontWeight: 800, background: '#fce7f3', position: 'sticky', left: 0 }}>TOT</td>
                  {doc.colunas.map((c, i) => <td key={c.id} style={{ ...tdSt, fontWeight: 900, fontSize: 15, background: '#fce7f3', color: '#9d174d' }}>{totais[i]}</td>)}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

      {msgProf && (
        <div onClick={() => setMsgProf(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>💬 Mensagem para {msgProf.nome}</h3>
              <button onClick={() => setMsgProf(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <textarea value={msgTexto} onChange={e => setMsgTexto(e.target.value)} rows={8} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #d0cdc7', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, marginBottom: 8 }} />
            {!msgProf.telefone && <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 8px' }}>⚠️ Sem telefone — será só registrada no relatório.</p>}
            <button onClick={enviarMsg} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Send size={16} /> Enviar e registrar</button>
          </div>
        </div>
      )}
    </div>
  )
}

const thSt: React.CSSProperties = { border: '1px solid #d8d4cd', padding: '6px 8px', fontSize: 12, color: '#1a1a1a' }
const tdSt: React.CSSProperties = { border: '1px solid #ece9e2', padding: '3px 6px', textAlign: 'center' }
function miniBtn(cor: string): React.CSSProperties { return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, border: 'none', background: cor, color: '#fff', cursor: 'pointer', flexShrink: 0 } }
