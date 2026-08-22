'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { voltar } from '@/lib/historicoNav'
import { ArrowLeft, Loader2, Plus, Trash2, X, CalendarDays, ChevronLeft, ChevronRight, Bell, Printer, Palette, Pencil, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { getLogoSalao } from '@/lib/logoSalao'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

// ─────────────────────────────────────────────────────────────────────────────
// CALENDÁRIO — a página /salon/calendario e a aba embutida na ficha da
// profissional. O de marketing foi retirado em ago/2026; o componente segue
// parametrizado por chave/título/cor porque a aba embutida usa outro tema.
//
// O documento no salao_config guarda { eventos, legenda }. A legenda é o que
// dá sentido às cores: "azul = reunião de marketing" é escolha de cada salão,
// não pode estar chumbada no código. Doc antigo (só `eventos`) continua
// abrindo — a legenda nasce vazia.
// ─────────────────────────────────────────────────────────────────────────────

interface Evento { id: string; data: string; texto: string; responsavel?: string; cor?: string }
type Legenda = Record<string, string>

const rid = () => Math.random().toString(36).slice(2, 8)
const SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const SEM_LONGO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// Oito cores fechadas: com paleta livre cada pessoa escolhe um tom diferente e
// a impressão em preto e branco vira uma mancha só. Cada uma tem o tom forte
// (borda e texto) e o claro (fundo do dia).
const PALETA = [
  { id: 'vermelho', nome: 'Vermelho', hex: '#dc2626', fundo: '#fef2f2' },
  { id: 'azul', nome: 'Azul', hex: '#2563eb', fundo: '#eff6ff' },
  { id: 'verde', nome: 'Verde', hex: '#059669', fundo: '#ecfdf5' },
  { id: 'roxo', nome: 'Roxo', hex: '#7c3aed', fundo: '#f5f3ff' },
  { id: 'laranja', nome: 'Laranja', hex: '#ea580c', fundo: '#fff7ed' },
  { id: 'rosa', nome: 'Rosa', hex: '#db2777', fundo: '#fdf2f8' },
  { id: 'ciano', nome: 'Ciano', hex: '#0891b2', fundo: '#ecfeff' },
  { id: 'cinza', nome: 'Cinza', hex: '#475569', fundo: '#f8fafc' },
]
const corDe = (id?: string) => PALETA.find(p => p.id === id) || PALETA[0]

const hojeStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const diasAte = (data: string) => { const [y, m, d] = data.split('-').map(Number); const alvo = new Date(y, m - 1, d); const h = new Date(); h.setHours(0, 0, 0, 0); return Math.round((alvo.getTime() - h.getTime()) / 86400000) }
const brData = (d: string) => d.split('-').reverse().join('/')

// Matriz de semanas do mês, com null nos vazios. Usada na tela e na impressão —
// a folha precisa da MESMA grade, senão o papel nao confere com o que aparece.
function semanasDoMes(ano: number, mes: number): (number | null)[][] {
  const dias = new Date(ano, mes + 1, 0).getDate()
  const cels: (number | null)[] = [...Array(new Date(ano, mes, 1).getDay()).fill(null),
    ...Array.from({ length: dias }, (_, i) => i + 1)]
  while (cels.length % 7) cels.push(null)
  const out: (number | null)[][] = []
  for (let i = 0; i < cels.length; i += 7) out.push(cels.slice(i, i + 7))
  return out
}

export default function CalendarioEditavel({ chave, titulo, camposGrandes, corTema = '#5b4fcf', mostrarLembrete, embutido }: { chave: string; titulo: string; comResponsavel?: boolean; camposGrandes?: boolean; corTema?: string; mostrarLembrete?: boolean; embutido?: boolean }) {
  const router = useRouter()
  // Regra nova (jul/2026): liberou = pode ver E salvar. Quem chega nesta tela
  // já tem a permissão do calendário, então edita normalmente.
  const somenteLeitura = false
  const [eventos, setEventos] = useState<Evento[]>([])
  const [legenda, setLegenda] = useState<Legenda>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Calendário') // avisa "Deseja salvar?" antes de sair sem salvar
  const [ref, setRef] = useState(() => { const d = new Date(); return { ano: d.getFullYear(), mes: d.getMonth() } })
  const [selDia, setSelDia] = useState<string | null>(null)
  const [novoTexto, setNovoTexto] = useState('')
  const [novoResp, setNovoResp] = useState('')
  const [novaCor, setNovaCor] = useState(PALETA[0].id)
  // Edicao de um compromisso ja gravado. Antes so dava para apagar e digitar
  // de novo — e quem errava a data perdia o texto inteiro.
  const [editando, setEditando] = useState<string | null>(null)
  const [edTexto, setEdTexto] = useState('')
  const [edResp, setEdResp] = useState('')
  const [edCor, setEdCor] = useState(PALETA[0].id)
  const [edData, setEdData] = useState('')
  const [lembreteAberto, setLembreteAberto] = useState(true)
  const [legendaAberta, setLegendaAberta] = useState(false)
  // Tamanho do texto dentro do quadrado. Nada é cortado: quem tem dia cheio
  // diminui a fonte até caber, em vez de o sistema decidir o que esconder.
  // Fica por navegador (é preferência de quem olha, não dado do salão).
  const [fonte, setFonte] = useState(11)
  useEffect(() => {
    try { const v = Number(localStorage.getItem(`nodri_cal_fonte_${chave}`)); if (v >= 7 && v <= 18) setFonte(v) } catch { /* */ }
  }, [chave])
  const mudarFonte = (d: number) => setFonte(f => {
    const n = Math.min(18, Math.max(7, f + d))
    try { localStorage.setItem(`nodri_cal_fonte_${chave}`, String(n)) } catch { /* */ }
    return n
  })

  const carregar = useCallback(async () => {
    try {
      const d = await fetch(`/api/salon/grid?chave=${chave}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.eventos)) setEventos(d.eventos)
      if (d && d.legenda && typeof d.legenda === 'object') setLegenda(d.legenda)
    } catch { /* */ }
    setLoading(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  async function salvar(lista?: Evento[], leg?: Legenda) {
    const dados = lista || eventos
    const lg = leg || legenda
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, doc: { eventos: dados, legenda: lg } }) })
      if (res.ok) { toast.success('Salvo!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function eventosDoDia(data: string) { return eventos.filter(e => e.data === data) }
  function abrirDia(data: string) {
    setSelDia(data); setNovoTexto(''); setNovoResp(''); setNovaCor(PALETA[0].id); setEditando(null)
  }
  function addEvento() {
    if (!selDia || !novoTexto.trim()) { toast.error('Escreva o compromisso'); return }
    const novo: Evento = { id: rid(), data: selDia, texto: novoTexto.trim(), responsavel: novoResp.trim() || undefined, cor: novaCor }
    const lista = [...eventos, novo]
    setEventos(lista); setNovoTexto(''); setNovoResp(''); setDirty(true); salvar(lista)
  }
  function removerEvento(id: string) {
    const lista = eventos.filter(e => e.id !== id)
    setEventos(lista); setDirty(true); salvar(lista)
  }
  function iniciarEdicao(e: Evento) {
    setEditando(e.id); setEdTexto(e.texto); setEdResp(e.responsavel || '')
    setEdCor(e.cor || PALETA[0].id); setEdData(e.data)
  }
  function salvarEdicao() {
    if (!edTexto.trim()) { toast.error('Escreva o compromisso'); return }
    const lista = eventos.map(x => x.id === editando
      ? { ...x, data: edData || x.data, texto: edTexto.trim(), responsavel: edResp.trim() || undefined, cor: edCor }
      : x)
    setEditando(null); setEventos(lista); setDirty(true); salvar(lista)
  }
  function abrirParaEditar(e: Evento) {
    const [y, m] = e.data.split('-').map(Number)
    setRef({ ano: y, mes: m - 1 })
    setSelDia(e.data); setNovoTexto(''); setNovoResp(''); setNovaCor(PALETA[0].id)
    iniciarEdicao(e)
  }
  function trocarCor(id: string, cor: string) {
    const lista = eventos.map(e => e.id === id ? { ...e, cor } : e)
    setEventos(lista); setDirty(true); salvar(lista)
  }

  const mesStr = (d: number) => `${ref.ano}-${String(ref.mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const mudarMes = (delta: number) => { let m = ref.mes + delta, a = ref.ano; if (m < 0) { m = 11; a-- } if (m > 11) { m = 0; a++ } setRef({ ano: a, mes: m }); setSelDia(null) }
  const irParaHoje = () => { const d = new Date(); setRef({ ano: d.getFullYear(), mes: d.getMonth() }); setSelDia(null) }

  const semanas = semanasDoMes(ref.ano, ref.mes)
  const doMes = eventos.filter(e => e.data.startsWith(`${ref.ano}-${String(ref.mes + 1).padStart(2, '0')}`))
    .sort((a, b) => a.data.localeCompare(b.data))
  // Cores que aparecem no mês — a legenda mostra primeiro as que estao em uso.
  const coresUsadas = PALETA.filter(p => doMes.some(e => (e.cor || PALETA[0].id) === p.id))

  // Próximos compromissos (faltam até 2 dias)
  const proximos = eventos.filter(e => { const n = diasAte(e.data); return n >= 0 && n <= 2 }).sort((a, b) => a.data.localeCompare(b.data))

  async function imprimir() {
    const logoSalao = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const escBr = (v: any) => esc(v).replace(/\n/g, '<br>')
    const mesTitulo = `${MESES[ref.mes]} ${ref.ano}`
    // A4 deitado com 9mm de margem da 192mm de altura util. Tirando cabecalho,
    // legenda e rodape sobram ~147mm para as celas. Dividir por 5 ou 6 semanas
    // e o que faz o mes ocupar a folha inteira em vez de parar no meio dela.
    const celMm = (147 / semanas.length).toFixed(1)

    // ── Página 1: a grade, igual à da tela ────────────────────────────────
    const linhas = semanas.map(sem => `<tr>${sem.map(d => {
      if (!d) return '<td class="vazio"></td>'
      const data = mesStr(d)
      const evs = eventosDoDia(data)
      const chips = evs.map(e => {
        const c = corDe(e.cor)
        return `<div class="ev" style="border-left-color:${c.hex};background:${c.fundo}"><b>${esc(e.texto)}</b>${e.responsavel ? `<span class="rp">${esc(e.responsavel)}</span>` : ''}</div>`
      }).join('')
      // Mesma faixa da tela: as cores do dia lado a lado no topo da cela.
      const cores = Array.from(new Set(evs.map(e => corDe(e.cor).id)))
      const faixa = cores.length > 1
        ? `<div class="fx">${cores.map(c => `<i style="background:${corDe(c).hex}"></i>`).join('')}</div>` : ''
      return `<td${evs.length ? ' class="cheio"' : ''}>${faixa}<span class="dn">${d}</span>${chips}</td>`
    }).join('')}</tr>`).join('')

    const legendaHtml = coresUsadas.length
      ? `<div class="lg">${coresUsadas.map(p => `<span class="lgi"><i style="background:${p.hex}"></i>${esc(legenda[p.id] || p.nome)}</span>`).join('')}</div>`
      : ''

    // ── Página 2: a descrição de tudo ─────────────────────────────────────
    const corpo = doMes.map(e => {
      const c = corDe(e.cor)
      const [y, m, dd] = e.data.split('-').map(Number)
      const sem = SEM_LONGO[new Date(y, m - 1, dd).getDay()]
      return `<tr>
        <td class="dt"><b>${esc(brData(e.data))}</b><span>${esc(sem)}</span></td>
        <td class="cr"><i style="background:${c.hex}"></i>${esc(legenda[c.id] || c.nome)}</td>
        <td>${escBr(e.texto)}</td>
        <td class="rs">${esc(e.responsavel || '—')}</td>
      </tr>`
    }).join('')

    const css = `
@page{size:A4 landscape;margin:9mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2430;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid ${corTema};padding-bottom:7px;margin-bottom:10px}
.hd .brand{font-size:21px;font-weight:900;color:${corTema};letter-spacing:-.5px}
.hd .dir{text-align:right;line-height:1.45}
.hd .mes{font-size:17px;font-weight:800;color:#1f2430}
.hd .sub{font-size:10px;color:#8b95a5}
.cal{width:100%;border-collapse:collapse;table-layout:fixed}
.cal th{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#fff;background:${corTema};padding:5px 0;text-align:center;height:7mm}
.cal td{border:1px solid #dcd9d2;height:${celMm}mm;vertical-align:top;padding:4px 5px;overflow:hidden}
.cal td.vazio{background:#fafafa;border-color:#ececec}
.cal td.cheio{background:#fffdfa}
.dn{font-size:12.5px;font-weight:800;color:#454b57}
.fx{display:flex;height:2mm;border-radius:1mm;overflow:hidden;margin-bottom:2px}
.fx i{flex:1;display:block}
.ev{margin-top:3px;font-size:8.8px;line-height:1.32;padding:3px 5px;border-radius:3px;border-left:3px solid;word-break:break-word}
.ev b{font-weight:700;display:block}
.ev .rp{display:block;font-style:italic;color:#5b6c85;margin-top:1px}
.lg{margin-top:9px;display:flex;flex-wrap:wrap;gap:5px 16px;font-size:9.5px;color:#5b6c85}
.lgi{display:inline-flex;align-items:center;gap:5px}
.lgi i{width:9px;height:9px;border-radius:3px;display:inline-block}
.pg2{page-break-before:always;padding-top:2mm}
.lista{width:100%;border-collapse:collapse}
.lista th{font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:${corTema};background:#f6f5fb;border-bottom:2px solid ${corTema};padding:6px 8px;text-align:left}
.lista td{border-bottom:1px solid #eeecea;padding:7px 8px;vertical-align:top;font-size:10.5px;line-height:1.45}
.lista tr{break-inside:avoid}
.lista tbody tr:nth-child(even) td{background:#fbfaf8}
.dt{white-space:nowrap;width:30mm}
.dt b{display:block;font-size:11px}
.dt span{display:block;font-size:8.5px;color:#9ca3af;text-transform:capitalize}
.cr{white-space:nowrap;width:38mm;color:#5b6c85}
.cr i{width:9px;height:9px;border-radius:3px;display:inline-block;margin-right:5px}
.rs{white-space:nowrap;width:42mm;color:#5b6c85}
.vazio-msg{padding:16px;color:#9ca3af;font-size:11px}
.rod{margin-top:8px;font-size:8.5px;color:#b0b6c0;text-align:right}`

    const cab = (extra: string) => `<div class="hd">${logoSalao ? `<img src="${logoSalao}" style="max-height:52px;max-width:190px;object-fit:contain"/>` : `<div class="brand">NODRI</div>`}<div class="dir"><div class="mes">${esc(mesTitulo)}</div><div class="sub">${esc(titulo)}${extra}</div></div></div>`

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(titulo)} — ${esc(mesTitulo)}</title><style>${css}</style></head><body>
${cab('')}
<table class="cal"><thead><tr>${SEM.map(s => `<th>${s}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody></table>
${legendaHtml}
<div class="rod">Emitido em ${new Date().toLocaleDateString('pt-BR')}</div>
<div class="pg2">
${cab(' · descrição dos compromissos')}
${doMes.length
  ? `<table class="lista"><thead><tr><th>Data</th><th>Categoria</th><th>Compromisso</th><th>Responsável</th></tr></thead><tbody>${corpo}</tbody></table>`
  : '<div class="vazio-msg">Nenhum compromisso neste mês.</div>'}
<div class="rod">${doMes.length} compromisso${doMes.length === 1 ? '' : 's'} em ${esc(mesTitulo)}</div>
</div>
<script>window.onload=function(){window.print()}</script></body></html>`

    const w = window.open('', '_blank', 'width=1100,height=760'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  if (loading) return <div className={embutido ? '' : 'nodri-salon-bg'} style={{ minHeight: embutido ? 120 : '100vh', display: 'flex', justifyContent: 'center', paddingTop: embutido ? 30 : 80 }}><Loader2 size={26} className="animate-spin" style={{ color: corTema }} /></div>

  return (
    <div className={embutido ? '' : 'nodri-salon-bg'} style={embutido ? {} : { minHeight: '100vh' }}>
      {/* No computador o mês ocupa a largura da tela: era uma coluna de 820px
          com celas de 66px, e compromisso de duas palavras já saía cortado.
          No celular a grade encolhe para caber sem rolar de lado — o texto sai
          da cela e vira a lista do mês, logo abaixo. */}
      <style>{`
        /* A cela nao tem altura fixa: ela e o que sobra da tela dividido
           pelo numero de semanas do mes. Assim o mes inteiro cabe numa tela
           so — com altura fixa, fevereiro cabia e um mes de 6 semanas nao. */
        .ncal-dia { min-height: max(76px, calc((100vh - 250px) / ${semanas.length})); }
        .ncal-chip { font-size: ${fonte}px; }
        @media (max-width: 900px) { .ncal-dia { min-height: max(64px, calc((100vh - 300px) / ${semanas.length})); } }
        /* CELULAR — cela compacta com o texto dentro, cabendo na largura da
           tela sem rolar de lado. As bolinhas de cor saem: com o texto ali,
           elas so tiravam espaco. Responsavel e do 3o compromisso em diante
           ficam para a lista do mes, logo abaixo. */
        @media (max-width: 640px) {
          .ncal-grid { gap: 3px !important; }
          .ncal-dia { min-height: 70px !important; padding: 4px 4px !important; }
          .ncal-num { font-size: 11.5px !important; }
          .ncal-pontos { display: none !important; }
          .ncal-chip { display: flex !important; font-size: ${Math.max(7, fonte - 2)}px; margin-top: 3px !important; gap: 2px !important; }
          .ncal-chip > span { padding: 1px 3px !important; border-left-width: 2px !important; }
          .ncal-vazio { min-height: 70px !important; }
          .ncal-legenda-grid { grid-template-columns: 1fr !important; }
          .ncal-topo-mes { gap: 8px !important; }
        }
        .ncal-dia:hover { border-color: ${corTema} !important; }
      `}</style>

      {!embutido ? (
      <nav style={{ background: '#faf9f7', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => voltar(router, '/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}><CalendarDays size={15} style={{ display: 'inline', verticalAlign: -2, marginRight: 6, color: corTema }} />{titulo}</span>
        <div style={{ flex: 1 }} />
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
      </nav>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><Printer size={13} /> Imprimir</button>
        </div>
      )}

      <div style={{ maxWidth: embutido ? '100%' : 1500, margin: '0 auto', padding: embutido ? 0 : '16px clamp(10px,2vw,24px)' }}>
        {/* Lembrete (faltam até 2 dias) */}
        {mostrarLembrete && proximos.length > 0 && lembreteAberto && (
          <div style={{ background: 'linear-gradient(135deg,#ef4444,#db2777)', color: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 16, position: 'relative' }}>
            <button onClick={() => setLembreteAberto(false)} style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'rgba(255,255,255,.25)', color: '#fff', borderRadius: 8, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, marginBottom: 8 }}><Bell size={16} /> Compromissos chegando!</div>
            {proximos.map(e => { const n = diasAte(e.data); return (
              <div key={e.id} style={{ fontSize: 13, marginBottom: 3 }}><strong>{n === 0 ? 'HOJE' : n === 1 ? 'AMANHÃ' : `em ${n} dias`}</strong> — {e.texto}{e.responsavel ? ` (${e.responsavel})` : ''}</div>
            ) })}
          </div>
        )}

        {/* Cabeçalho do mês */}
        <div className="ncal-topo-mes" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
          <button onClick={() => mudarMes(-1)} style={navBtn} title="Mês anterior"><ChevronLeft size={18} /></button>
          <span style={{ fontWeight: 800, fontSize: 19, color: '#1a1a1a', minWidth: 190, textAlign: 'center' }}>{MESES[ref.mes]} {ref.ano}</span>
          <button onClick={() => mudarMes(1)} style={navBtn} title="Próximo mês"><ChevronRight size={18} /></button>
          <button onClick={irParaHoje} style={{ ...navBtn, width: 'auto', padding: '0 13px', fontSize: 12.5, fontWeight: 700 }}>Hoje</button>
          {doMes.length > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: corTema, background: `${corTema}15`, borderRadius: 20, padding: '5px 12px' }}>
              {doMes.length} compromisso{doMes.length === 1 ? '' : 's'} no mês
            </span>
          )}
          {/* Tamanho do texto dentro do quadrado — dia cheio nao esconde nada,
              e quem quiser ver tudo de uma vez so diminui a letra. */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, border: '1px solid #e0ddd8', borderRadius: 8, background: '#fff', overflow: 'hidden' }} title="Tamanho do texto dentro dos dias">
            <button onClick={() => mudarFonte(-1)} disabled={fonte <= 7} style={btnFonte}>A−</button>
            <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 26, textAlign: 'center' }}>{fonte}px</span>
            <button onClick={() => mudarFonte(1)} disabled={fonte >= 18} style={{ ...btnFonte, fontSize: 15 }}>A+</button>
          </span>
        </div>

        {/* Grade do mês */}
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 'clamp(6px,1vw,12px)' }}>
          <div className="ncal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 5 }}>
            {SEM.map((s, i) => <div key={s} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: i === 0 || i === 6 ? '#c0bab0' : '#9ca3af', padding: '5px 0', textTransform: 'uppercase', letterSpacing: '.6px' }}>{s}</div>)}
          </div>
          <div className="ncal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
            {semanas.flat().map((d, idx) => {
              if (!d) return <div key={'v' + idx} className="ncal-vazio" style={{ minHeight: 46, borderRadius: 9, background: '#fbfaf8' }} />
              const data = mesStr(d)
              const evs = eventosDoDia(data)
              const ehHoje = data === hojeStr()
              const sel = selDia === data
              // Cores distintas do dia: com compromissos de tipos diferentes,
              // pintar a cela com a cor do primeiro escondia os outros.
              const cores = Array.from(new Set(evs.map(e => corDe(e.cor).id)))
              const fundo = cores.length === 1 ? corDe(cores[0]).fundo : evs.length ? '#fffdf9' : '#fff'
              return (
                <button key={d} onClick={() => abrirDia(data)} className="ncal-dia"
                  style={{ borderRadius: 9, border: sel ? `2px solid ${corTema}` : '1px solid #ece9e2', background: fundo, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: '6px 7px', textAlign: 'left', transition: 'border-color .12s' }}>
                  {/* Faixa das cores do dia, lado a lado: tres compromissos de
                      cores diferentes aparecem como tres faixas. */}
                  {cores.length > 1 && (
                    <span style={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 4, flexShrink: 0 }}>
                      {cores.map(c => <i key={c} style={{ flex: 1, background: corDe(c).hex, display: 'block' }} />)}
                    </span>
                  )}
                  <span className="ncal-num" style={{ fontSize: 13, fontWeight: 800, color: ehHoje ? '#fff' : '#374151', alignSelf: 'flex-start', flexShrink: 0, ...(ehHoje ? { background: corTema, borderRadius: '50%', width: 23, height: 23, display: 'flex', alignItems: 'center', justifyContent: 'center' } : {}) }}>{d}</span>

                  {/* Celular: só bolinhas de cor — o texto nao cabe e virava
                      um borrão. A descrição fica na lista do mês, abaixo. */}
                  <span className="ncal-pontos" style={{ display: 'none', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                    {evs.slice(0, 4).map(e => <i key={e.id} style={{ width: 6, height: 6, borderRadius: '50%', background: corDe(e.cor).hex, display: 'block' }} />)}
                  </span>

                  <span className="ncal-chip" style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden' }}>
                    {evs.map(e => {
                      const c = corDe(e.cor)
                      return (
                        <span key={e.id} style={{ borderLeft: `3px solid ${c.hex}`, background: '#ffffffcc', borderRadius: 4, padding: '2px 5px', color: '#374151', fontWeight: 600, lineHeight: 1.25, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          {e.texto}
                          {e.responsavel && <em style={{ display: 'block', fontStyle: 'normal', color: '#8b95a5', fontWeight: 500 }}>{e.responsavel}</em>}
                        </span>
                      )
                    })}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Legenda de cores — o que cada cor significa neste salão */}
        <div style={{ marginTop: 12, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: '12px 16px' }}>
          <button onClick={() => setLegendaAberta(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            <Palette size={15} style={{ color: corTema }} />
            <span style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a1a' }}>Legenda de cores</span>
            <div style={{ flex: 1, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {coresUsadas.map(p => (
                <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#6b6860' }}>
                  <i style={{ width: 10, height: 10, borderRadius: 3, background: p.hex, display: 'block' }} />
                  {legenda[p.id] || p.nome}
                </span>
              ))}
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: corTema, whiteSpace: 'nowrap' }}>{legendaAberta ? 'fechar' : 'editar'}</span>
          </button>

          {legendaAberta && (
            <>
              <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '10px 0 8px' }}>
                Escreva o que cada cor representa. Ex.: <em>azul — reunião de marketing</em>. Vale para a tela e para a impressão.
              </p>
              <div className="ncal-legenda-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 8 }}>
                {PALETA.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: p.fundo, border: `1px solid ${p.hex}33`, borderRadius: 9, padding: '6px 9px' }}>
                    <i style={{ width: 14, height: 14, borderRadius: 4, background: p.hex, display: 'block', flexShrink: 0 }} />
                    <input value={legenda[p.id] ?? ''} placeholder={p.nome}
                      onChange={e => { setLegenda(l => ({ ...l, [p.id]: e.target.value })); setDirty(true) }}
                      onBlur={() => dirty && salvar(undefined, legenda)}
                      style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontSize: 12.5, color: '#1a1a1a', outline: 'none', fontWeight: 600 }} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Card do dia selecionado (modal — abre por cima, sem precisar rolar) */}
        {selDia && (
          <div onClick={() => setSelDia(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={ev => ev.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f0eee8', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: corTema, margin: 0 }}>{brData(selDia)}</h3>
                  <span style={{ fontSize: 11.5, color: '#9ca3af', textTransform: 'capitalize' }}>
                    {SEM_LONGO[new Date(Number(selDia.slice(0, 4)), Number(selDia.slice(5, 7)) - 1, Number(selDia.slice(8, 10))).getDay()]}
                  </span>
                </div>
                <button onClick={() => setSelDia(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
              </div>
              <div style={{ padding: 18 }}>
                {eventosDoDia(selDia).length === 0 && <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 10px' }}>Nenhum compromisso neste dia.</p>}
                {eventosDoDia(selDia).map(e => {
                  const c = corDe(e.cor)

                  // ── modo edicao: o proprio compromisso vira formulario ──
                  if (editando === e.id) return (
                    <div key={e.id} style={{ padding: 12, borderRadius: 9, background: '#fff', border: `2px solid ${corTema}`, marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: corTema, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Editando</div>

                      <label style={rotEd}>Data</label>
                      <input type="date" value={edData} onChange={ev => setEdData(ev.target.value)} style={campoEd} />

                      <label style={rotEd}>Responsavel</label>
                      <input value={edResp} onChange={ev => setEdResp(ev.target.value)} placeholder="Responsavel" style={campoEd} />

                      <label style={rotEd}>Compromisso</label>
                      {camposGrandes
                        ? <textarea value={edTexto} onChange={ev => setEdTexto(ev.target.value)} rows={4} style={{ ...campoEd, resize: 'vertical', fontFamily: 'inherit' }} />
                        : <input value={edTexto} onChange={ev => setEdTexto(ev.target.value)} style={campoEd} />}

                      <label style={rotEd}>Cor</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {PALETA.map(p => (
                          <button key={p.id} onClick={() => setEdCor(p.id)} title={legenda[p.id] || p.nome}
                            style={{ width: 22, height: 22, borderRadius: 6, background: p.hex, cursor: 'pointer', border: edCor === p.id ? '2.5px solid #1a1a1a' : '2.5px solid transparent' }} />
                        ))}
                        <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{legenda[edCor] || corDe(edCor).nome}</span>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button onClick={salvarEdicao} disabled={salvando} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 8, border: 'none', background: corTema, color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}><Check size={15} /> Salvar alteracoes</button>
                        <button onClick={() => setEditando(null)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                      </div>
                    </div>
                  )

                  return (
                    <div key={e.id} style={{ padding: '10px 12px', borderRadius: 9, background: c.fundo, borderLeft: `4px solid ${c.hex}`, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, color: '#1a1a1a', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{e.texto}</div>
                          {e.responsavel && <div style={{ fontSize: 11.5, color: corTema, fontWeight: 700, marginTop: 3, wordBreak: 'break-word' }}>{e.responsavel}</div>}
                          <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 3 }}>{legenda[c.id] || c.nome}</div>
                        </div>
                        {!somenteLeitura && (
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button onClick={() => iniciarEdicao(e)} title="Editar" style={{ border: 'none', background: 'transparent', color: corTema, cursor: 'pointer' }}><Pencil size={14} /></button>
                            <button onClick={() => removerEvento(e.id)} title="Remover" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                          </div>
                        )}
                      </div>
                      {!somenteLeitura && (
                        <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                          {PALETA.map(p => (
                            <button key={p.id} onClick={() => trocarCor(e.id, p.id)} title={legenda[p.id] || p.nome}
                              style={{ width: 18, height: 18, borderRadius: 5, background: p.hex, cursor: 'pointer', border: c.id === p.id ? '2px solid #1a1a1a' : '2px solid transparent' }} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Adicionar (oculto para usuário somente leitura) */}
                {!somenteLeitura && (
                  <div style={{ marginTop: 8, borderTop: '1px dashed #e8e6e0', paddingTop: 12 }}>
                    <input value={novoResp} onChange={e => setNovoResp(e.target.value)} placeholder="Responsável" style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, marginBottom: 8 }} />
                    {camposGrandes
                      ? <textarea value={novoTexto} onChange={e => setNovoTexto(e.target.value)} placeholder="Descreva a ação / compromisso..." rows={4} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
                      : <input value={novoTexto} onChange={e => setNovoTexto(e.target.value)} placeholder="Compromisso..." style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '10px 0 2px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6b6860' }}>Cor:</span>
                      {PALETA.map(p => (
                        <button key={p.id} onClick={() => setNovaCor(p.id)} title={legenda[p.id] || p.nome}
                          style={{ width: 22, height: 22, borderRadius: 6, background: p.hex, cursor: 'pointer', border: novaCor === p.id ? '2.5px solid #1a1a1a' : '2.5px solid transparent' }} />
                      ))}
                      <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{legenda[novaCor] || corDe(novaCor).nome}</span>
                    </div>

                    <button onClick={addEvento} disabled={salvando} style={{ marginTop: 10, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 16px', borderRadius: 8, border: 'none', background: corTema, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Adicionar e salvar</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Próximos compromissos (agenda, atravessa meses) */}
        {(() => {
          const futuros = eventos.filter(e => diasAte(e.data) >= 0).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 20)
          if (!futuros.length) return null
          return (
            <div style={{ marginTop: 14, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: corTema, margin: '0 0 10px' }}>Próximos compromissos</h3>
              {futuros.map(e => {
                const n = diasAte(e.data)
                const badge = n === 0 ? 'HOJE' : n === 1 ? 'AMANHÃ' : `${n} dias`
                const cor = n <= 2 ? '#dc2626' : '#0891b2'
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0eee8' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: cor, borderRadius: 20, padding: '3px 9px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>{badge}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{brData(e.data)}</div>
                      <div style={{ fontSize: 13, color: '#1a1a1a', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{e.texto}</div>
                      {e.responsavel && <div style={{ fontSize: 11, color: corTema, fontWeight: 700, marginTop: 2, wordBreak: 'break-word' }}>{e.responsavel}</div>}
                    </div>
                    {!somenteLeitura && (
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => abrirParaEditar(e)} title="Editar" style={{ border: 'none', background: 'transparent', color: corTema, cursor: 'pointer' }}><Pencil size={14} /></button>
                        <button onClick={() => removerEvento(e.id)} title="Remover" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Descrição de TUDO o que está marcado no mês aberto. Na grade o texto
            vem cortado; aqui vem inteiro, com responsável e categoria — é o que
            sai na segunda folha da impressão. */}
        <div style={{ marginTop: 14, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: corTema, margin: 0 }}>Compromissos de {MESES[ref.mes]} {ref.ano}</h3>
            <span style={{ fontSize: 11.5, color: '#9ca3af' }}>descrição completa · {doMes.length} no total</span>
          </div>
          {doMes.length === 0
            ? <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Nenhum compromisso marcado neste mês.</p>
            : doMes.map(e => {
              const c = corDe(e.cor)
              const [y, m, dd] = e.data.split('-').map(Number)
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 12px', borderRadius: 10, background: c.fundo, borderLeft: `4px solid ${c.hex}`, marginBottom: 8 }}>
                  <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 46 }}>
                    <div style={{ fontSize: 19, fontWeight: 800, color: c.hex, lineHeight: 1 }}>{String(dd).padStart(2, '0')}</div>
                    <div style={{ fontSize: 10, color: '#8b95a5', textTransform: 'capitalize' }}>{SEM[new Date(y, m - 1, dd).getDay()]}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: '#1a1a1a', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{e.texto}</div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                      <span style={{ fontSize: 11.5, color: corTema, fontWeight: 700 }}>{e.responsavel || 'sem responsável'}</span>
                      <span style={{ fontSize: 11.5, color: '#8b95a5' }}>{legenda[c.id] || c.nome}</span>
                    </div>
                  </div>
                  {!somenteLeitura && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => abrirParaEditar(e)} title="Editar" style={{ border: 'none', background: 'transparent', color: corTema, cursor: 'pointer' }}><Pencil size={14} /></button>
                      <button onClick={() => removerEvento(e.id)} title="Remover" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 14 }}>Clique numa data para adicionar, ver, editar () ou remover. A impressão sai em A4 deitado: a primeira folha é o mês, a segunda é a descrição. {salvando && '· salvando...'}</p>
      </div>
    </div>
  )
}

const rotEd: React.CSSProperties = { display: 'block', fontSize: 10.5, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.4px', margin: '9px 0 4px' }
const campoEd: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }
const btnFonte: React.CSSProperties = { border: 'none', background: 'transparent', color: '#6b6860', cursor: 'pointer', fontWeight: 800, fontSize: 12.5, padding: '6px 9px', lineHeight: 1 }
const navBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, border: '1px solid #e0ddd8', background: '#fff', color: '#6b6860', cursor: 'pointer' }
