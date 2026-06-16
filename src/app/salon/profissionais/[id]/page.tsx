'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2, TrendingUp, TrendingDown, BarChart2,
  MessageSquare, CheckSquare, Square, AlertTriangle } from 'lucide-react'
import ChatWidget from '@/components/salon/ChatWidget'
import toast from 'react-hot-toast'

// Converte o markdown gerado pela IA num HTML estilizado (títulos, negrito real,
// tabelas, listas e badges de status) — reaproveitado no chat e na Estratégia de Meta.
function renderPlanoHtml(texto: string): string {
  const linhas = texto.split('\n')
  const out: string[] = []
  let dentroTabela = false
  let linhasTabela: string[] = []

  const flushTabela = () => {
    if (linhasTabela.length === 0) return
    const linhasValidas = linhasTabela.filter(l => !/^\s*\|?\s*-{2,}/.test(l.replace(/\|/g, '')))
    const rows = linhasValidas.map(l => l.split('|').map(c => c.trim()).filter((_, i, arr) => !(i === 0 && arr[0] === '') && !(i === arr.length - 1 && arr[arr.length - 1] === '')))
    if (rows.length > 0) {
      const [head, ...body] = rows
      out.push('<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:11px">')
      out.push('<thead><tr>' + head.map(c => `<th style="text-align:left;padding:6px 8px;color:#00e5c8;border-bottom:1px solid rgba(0,229,200,0.25)">${c}</th>`).join('') + '</tr></thead>')
      out.push('<tbody>' + body.map(r => '<tr>' + r.map(c => `<td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.06)">${c}</td>`).join('') + '</tr>').join('') + '</tbody>')
      out.push('</table>')
    }
    linhasTabela = []
    dentroTabela = false
  }

  for (const linhaRaw of linhas) {
    const linha = linhaRaw.trimEnd()

    if (/^\s*\|.*\|\s*$/.test(linha)) {
      dentroTabela = true
      linhasTabela.push(linha)
      continue
    }
    if (dentroTabela) flushTabela()

    if (!linha.trim()) { out.push('<div style="margin:6px 0"></div>'); continue }

    let l = linha
      .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#f1f5f9">$1</strong>')
      .replace(/^[•\-]\s+(.+)$/, '$1')

    // Títulos ## / ###
    const tituloMatch = linha.match(/^(#{1,3})\s+(.+)$/)
    if (tituloMatch) {
      const nivel = tituloMatch[1].length
      const texto2 = tituloMatch[2].replace(/\*\*([^*]+)\*\*/g, '$1')
      if (nivel === 1) {
        out.push(`<div style="font-weight:800;font-size:15px;color:#fff;margin:14px 0 8px;padding-bottom:6px;border-bottom:2px solid rgba(0,229,200,0.35)">${texto2}</div>`)
      } else {
        out.push(`<div style="font-weight:700;font-size:13px;color:#00e5c8;margin:12px 0 6px">${texto2}</div>`)
      }
      continue
    }

    // Linhas com status (✅ / ⚠️ / 🔴 / 🟢) tratadas como mini-título
    if (/^(✅|⚠️|🔴|🟢|🟡|🔵|🏆|💎|🧠|⚡|🔮|🚨|📌|📊|📅|📍|👔|🤖)\s*[A-ZÀ-Ú]/.test(linha) && linha.length < 60) {
      out.push(`<div style="font-weight:700;font-size:12px;color:#e2e8f0;margin:8px 0 4px">${l}</div>`)
      continue
    }

    // Linhas numeradas
    const numMatch = linha.match(/^(\d+)[️⃣.]\s*(.+)$/) || linha.match(/^(\d+)\.\s+(.+)$/)
    if (numMatch) {
      out.push(`<div style="display:flex;gap:6px;margin:3px 0"><span style="color:#7c5cfc;font-weight:700;flex-shrink:0">${numMatch[1]}.</span><span>${numMatch[2].replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#f1f5f9">$1</strong>')}</span></div>`)
      continue
    }

    // Bullets
    if (/^[•\-\*]\s+/.test(linha)) {
      out.push(`<div style="display:flex;gap:6px;margin:2px 0"><span style="color:#00e5c8;flex-shrink:0">•</span><span>${l}</span></div>`)
      continue
    }

    out.push(`<div style="margin:2px 0">${l}</div>`)
  }
  if (dentroTabela) flushTabela()

  return out.join('')
}

interface Profissional {
  id: string; nome_completo: string; apelido: string; cargo: string; ativo: boolean
  cpf: string; rg: string; data_aniversario: string; email: string; endereco: string
  cnpj: string; conta_bancaria: string; habilidades: string; foto_url: string
  servicos_habilitados: string[]
  contato_responsavel: string; cor_favorita: string; comida_favorita: string
  animal_favorito: string; hobbies: string; um_sonho: string; certificados: string
  ficha_entrevista: boolean; processo_contratacao: boolean; materiais_trabalho: boolean
  perfil_ideal: boolean; horarios_folgas: boolean; distrato: boolean
  contrato_trabalho: boolean; tem_certificados: boolean; plano_carreira: boolean
  tem_contrato: boolean
  perfil_pessoal_completo: boolean
  dados_pessoais_completo: boolean
  dados_profissionais_completo: boolean
  is_departamento?: boolean
  departamento_cor?: string
}

interface MetricaBloco {
  faturamento: number; ticket_medio: number; clientes_preferencia: number
  clientes_sem_preferencia: number; dias_trabalhados: number; taxa_ocupacao: number
  total_servicos: number; total_produtos: number
  servicos: Array<{ servico: string; quantidade: number; valor: number }>
}

interface Fidelizacao {
  total_novos: number; fidelizados: number; perdidos: number
  taxa_perda: number; taxa_fidelizacao: number; nivel: string
  novos_p1: number; novos_p2: number; ticket_medio: number; valor_perdido: number
}

interface HistoricoItem { ano: number; mes: number; faturamento: number; clientes_preferencia: number; clientes_sem_preferencia: number; dias_trabalhados: number; total_servicos: number }
interface MixItem { servico: string; quantidade: number; valor: number; pct: number }
interface SazonalidadeItem { mes: number; media: number; max: number; min: number; count: number }
interface ProjecaoData { taxa_media: number; valor_projetado: number; baseado_em: number; proximo_mes: number; proximo_ano: number; tendencia: 'alta'|'baixa'|'estavel' }

interface DadosMetricas {
  p1: MetricaBloco | null; p2: MetricaBloco | null; fidelizacao: Fidelizacao | null
  fat_p1: MetricaBloco | null; fat_p2: MetricaBloco | null; fidelizacao_fat: Fidelizacao | null
  historico_fat: Array<{ ano: number; mes: number; faturamento: number }>
  feedbacks: Array<{ id: string; tipo: string; ocorrido_descricao: string; descricao: string; criado_em: string }>
  feedbacks_p1_total: number; feedbacks_p2_total: number
  ocorrencias: Array<{ tipo: string; total: number }>
  ocorrencias_comparativo: Array<{ tipo: string; p1: number; p2: number; variacao: number | null }>
  historico: Array<{ ano: number; mes: number; faturamento: number; total_servicos: number; ticket_medio: number; taxa_ocupacao: number }>
  historico_completo: HistoricoItem[]
  mix_receita: MixItem[]
  sazonalidade: SazonalidadeItem[]
  projecao: ProjecaoData | null
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const fmt$  = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
function pct(a: number, b: number) { return b ? ((a - b) / b) * 100 : null }

function DeltaBadge({ atual, anterior, inverso = false }: { atual: number; anterior: number; inverso?: boolean }) {
  const d = pct(atual, anterior)
  if (d === null) return null
  const up = inverso ? d <= 0 : d >= 0
  const color = up ? '#22c55e' : '#ef4444'
  return (
    <span style={{color}} className="text-[10px] font-bold flex items-center gap-0.5">
      {d >= 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
      {(d >= 0 ? '+' : '') + d.toFixed(1) + '%'}
    </span>
  )
}

function MetCard({ label, atual, anterior, fmt='n', inverso=false }:
  { label: string; atual: number; anterior: number; fmt?: 'm'|'n'|'p'; inverso?: boolean }) {
  const f = (v: number) => fmt==='m' ? fmt$(v) : fmt==='p' ? (v||0).toFixed(1)+'%' : (v||0).toLocaleString('pt-BR',{maximumFractionDigits:1})
  return (
    <div className="bg-nodri-card border border-nodri-border rounded-xl p-3">
      <div className="text-[9px] text-nodri-t3 uppercase tracking-wider mb-1">{label}</div>
      <div className="font-syne font-bold text-[17px] text-nodri-t1">{f(atual)}</div>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-[9px] text-nodri-t3">Ant: {f(anterior)}</span>
        <DeltaBadge atual={atual} anterior={anterior} inverso={inverso}/>
      </div>
    </div>
  )
}

function BlocoFidelizacao({ f }: { f: Fidelizacao }) {
  const isCrit = f.nivel === 'critico'
  return (
    <div className="rounded-2xl p-5 border" style={{
      background: isCrit ? 'rgba(239,68,68,0.05)' : 'rgba(34,197,94,0.05)',
      borderColor: isCrit ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'
    }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-syne font-bold text-[13px]"> Análise de Fidelização</h3>
        <span className={`text-[10px] px-3 py-1 rounded-full font-bold border ${
          isCrit ? 'text-red-400 border-red-400/30 bg-red-400/10' :
          f.nivel==='alto' ? 'text-nodri-amber border-nodri-amber/30 bg-nodri-amber/10' :
          'text-nodri-green border-nodri-green/30 bg-nodri-green/10'
        }`}>{isCrit ? ' CRÍTICO' : f.nivel==='alto' ? ' ATENÇÃO' : ' BOM'}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { l:'Total Novos', v: f.total_novos, sub: `${f.novos_p1} (P1) + ${f.novos_p2} (P2)` },
          { l:'Fidelizados', v: f.fidelizados, sub: `${f.taxa_fidelizacao}% de fidelização` },
          { l:'Perdidos',    v: f.perdidos,    sub: `Taxa de perda: ${f.taxa_perda}%` },
          { l:'Valor Perdido', v: -1,          sub: fmt$(f.valor_perdido) },
        ].map(item=>(
          <div key={item.l} className="bg-nodri-card border border-nodri-border rounded-xl p-3">
            <div className="text-[9px] text-nodri-t3 uppercase tracking-wider mb-1">{item.l}</div>
            {item.v >= 0
              ? <div className="font-syne font-bold text-[20px] text-nodri-t1">{item.v}</div>
              : <div className="font-syne font-bold text-[15px] text-nodri-red">{item.sub}</div>
            }
            {item.v >= 0 && <div className="text-[9px] text-nodri-t3 mt-1">{item.sub}</div>}
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-nodri-t3">
          <span>Fidelização {f.taxa_fidelizacao}%</span><span>Perda {f.taxa_perda}%</span>
        </div>
        <div className="w-full bg-nodri-border rounded-full h-2 overflow-hidden">
          <div className="h-2 bg-nodri-green rounded-full transition-all"
            style={{width:`${Math.min(Math.max(f.taxa_fidelizacao,0),100)}%`}}/>
        </div>
        <p className="text-[10px] text-nodri-t3">
          De cada 100 novos, <strong className="text-nodri-t1">{Math.abs(Math.round(f.taxa_fidelizacao))}</strong> viram fiéis.
          {isCrit && ' ️ Crie estratégia de pós-venda imediato!'}
        </p>
      </div>
    </div>
  )
}

function TabelaServicos({ p1, p2, nomeProfissional }: { p1: MetricaBloco | null; p2: MetricaBloco | null; nomeProfissional?: string }) {
  if (!p1?.servicos?.length && !p2?.servicos?.length) return null

  const todos = new Set([...(p1?.servicos||[]).map(s=>s.servico),...(p2?.servicos||[]).map(s=>s.servico)])
  const m1 = Object.fromEntries((p1?.servicos||[]).map(s=>[s.servico,s]))
  const m2 = Object.fromEntries((p2?.servicos||[]).map(s=>[s.servico,s]))
  const sorted = Array.from(todos).sort((a,b)=>(m2[b]?.quantidade||0)-(m2[a]?.quantidade||0))

  // Contadores de crescimento/queda
  let subiu = 0, caiu = 0, igual = 0, novo = 0
  for (const s of sorted) {
    const q1 = m1[s]?.quantidade||0; const q2 = m2[s]?.quantidade||0
    if (q1===0 && q2>0) novo++
    else if (q2===0 && q1>0) caiu++
    else if (q2>q1) subiu++
    else if (q2<q1) caiu++
    else igual++
  }

  // Top 3
  const top3 = sorted.filter(s=>(m2[s]?.quantidade||0)>0).slice(0,3).map(s=>({ servico: s, quantidade: m2[s]?.quantidade||0 }))

  // Variedade (tipos diferentes realizados)
  const varAtual = (p2?.servicos||[]).filter(s=>s.quantidade>0).length
  const varAnt   = (p1?.servicos||[]).filter(s=>s.quantidade>0).length
  const varDelta = varAtual - varAnt

  // Totais
  const totalAtual = p2?.total_servicos || sorted.reduce((s,k)=>s+(m2[k]?.quantidade||0),0)
  const totalAnt   = p1?.total_servicos || sorted.reduce((s,k)=>s+(m1[k]?.quantidade||0),0)
  const pctTotal   = totalAnt > 0 ? ((totalAtual-totalAnt)/totalAnt)*100 : null

  return (
    <div className="space-y-4">
      {/* Tabela de serviços */}
      <div className="bg-nodri-surface border border-nodri-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between" style={{background:'#0f3460'}}>
          <h3 className="font-syne font-bold text-[13px] text-white">
             SERVIÇOS REALIZADOS{nomeProfissional ? ` POR ${nomeProfissional.toUpperCase()}` : ''}
          </h3>
          <span className="text-[11px] text-white/70">{sorted.length} serviços</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{background:'#1e2d3d'}}>
                <th className="py-2.5 px-4 text-left text-white font-semibold text-[11px] uppercase tracking-wide">SERVIÇO</th>
                <th className="py-2.5 px-4 text-center text-white font-semibold text-[11px] uppercase tracking-wide">QTD ATUAL</th>
                <th className="py-2.5 px-4 text-center text-white font-semibold text-[11px] uppercase tracking-wide">QTD ANT.</th>
                <th className="py-2.5 px-4 text-center text-white font-semibold text-[11px] uppercase tracking-wide">CRESC.</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(s=>{
                const q1=m1[s]?.quantidade||0; const q2=m2[s]?.quantidade||0
                const d = q1>0 ? ((q2-q1)/q1)*100 : null
                const isNovo = q1===0 && q2>0
                const isCaiu100 = q2===0 && q1>0
                const rowBg = q2 > q1 ? 'rgba(34,197,94,0.03)' : q2 < q1 ? 'rgba(239,68,68,0.03)' : undefined
                return (
                  <tr key={s} className="border-b border-nodri-border/30 hover:bg-nodri-card/40 transition-colors" style={{background:rowBg}}>
                    <td className="py-2.5 px-4 text-nodri-t1 font-medium">{s}</td>
                    <td className="py-2.5 px-4 text-center font-bold" style={{color: q2>0?'#e2e8f0':'#64748b'}}>{q2||'–'}</td>
                    <td className="py-2.5 px-4 text-center text-nodri-t3">{q1||'–'}</td>
                    <td className="py-2.5 px-4 text-center">
                      {isNovo    && <span className="text-nodri-green font-bold"> 100%</span>}
                      {isCaiu100 && <span className="text-nodri-red font-bold"> 100%</span>}
                      {!isNovo && !isCaiu100 && d!==null && (
                        <span className={`font-bold ${d>0?'text-nodri-green':d<0?'text-nodri-red':'text-nodri-t3'}`}>
                          {d>0?'':d<0?'':'•'} {d===0?'0':Math.abs(d).toFixed(1)}%
                        </span>
                      )}
                      {!isNovo && !isCaiu100 && d===null && <span className="text-nodri-t3">• 0%</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Legenda de contadores */}
        <div className="px-5 py-2.5 border-t border-nodri-border flex gap-5 text-[10px] flex-wrap">
          <span className="text-nodri-green font-bold">↑: {subiu}</span>
          <span className="text-nodri-red font-bold">↓: {caiu}</span>
          <span className="text-nodri-t3 font-bold">=: {igual}</span>
          <span className="text-nodri-cyan font-bold">+: {novo}</span>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Total Serviços */}
        <div className="bg-nodri-card border border-nodri-border rounded-2xl p-4">
          <div className="text-[9px] text-nodri-t3 uppercase tracking-widest mb-2 font-semibold">TOTAL SERVIÇOS</div>
          <div className="flex items-end gap-3 mb-2">
            <div>
              <div className="text-[9px] text-nodri-t3 mb-0.5">ATUAL</div>
              <div className="font-syne font-black text-[28px] text-nodri-t1 leading-none">{totalAtual}</div>
            </div>
            <div className="pb-1">
              <div className="text-[9px] text-nodri-t3 mb-0.5">ANT.</div>
              <div className="font-syne font-semibold text-[16px] text-nodri-t3 leading-none">{totalAnt}</div>
            </div>
          </div>
          {pctTotal !== null && (
            <span className={`text-[11px] font-bold flex items-center gap-0.5 ${pctTotal>=0?'text-nodri-green':'text-nodri-red'}`}>
              {pctTotal>=0?<TrendingUp size={11}/>:<TrendingDown size={11}/>}
              {pctTotal>=0?'+':''}{pctTotal.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Variedade */}
        <div className="bg-nodri-card border border-nodri-border rounded-2xl p-4">
          <div className="text-[9px] text-nodri-t3 uppercase tracking-widest mb-2 font-semibold">VARIEDADE</div>
          <div className="flex items-end gap-3 mb-2">
            <div>
              <div className="text-[9px] text-nodri-t3 mb-0.5">ATUAL</div>
              <div className="font-syne font-black text-[28px] text-nodri-t1 leading-none">{varAtual}</div>
            </div>
            <div className="pb-1">
              <div className="text-[9px] text-nodri-t3 mb-0.5">ANT.</div>
              <div className="font-syne font-semibold text-[16px] text-nodri-t3 leading-none">{varAnt}</div>
            </div>
          </div>
          <span className={`text-[11px] font-bold flex items-center gap-0.5 ${varDelta>0?'text-nodri-green':varDelta<0?'text-nodri-red':'text-nodri-amber'}`}>
            {varDelta>0?<TrendingUp size={11}/>:varDelta<0?<TrendingDown size={11}/>:null}
            {varDelta===0?'• 0':varDelta>0?`+${varDelta}`:varDelta}
          </span>
        </div>

        {/* Top 3 Serviços */}
        <div className="bg-nodri-card border border-nodri-border rounded-2xl p-4">
          <div className="text-[9px] text-nodri-t3 uppercase tracking-widest mb-3 font-semibold">TOP 3 SERVIÇOS</div>
          {top3.length === 0 && <span className="text-[10px] text-nodri-t3">Sem dados</span>}
          {top3.map((item,i)=>(
            <div key={item.servico} className="mb-2 last:mb-0">
              <div className="font-bold text-[11px] text-nodri-cyan">{item.servico}</div>
              <div className="text-[9px] text-nodri-t3">{item.quantidade} unidades</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

//  Gerador de narrativa personalizada 
function gerarNarrativa(
  nome: string, p1: MetricaBloco|null, p2: MetricaBloco|null,
  fidel: Fidelizacao|null, mix: MixItem[], form: Partial<Profissional>,
  projecao: ProjecaoData|null, ocNeg: number, ocPos: number
): string {
  if (!p1 || !p2) return ''
  const fn = nome.split(' ')[0]
  const fmtR = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)
  const pctFat   = p1.faturamento>0   ? ((p2.faturamento-p1.faturamento)/p1.faturamento)*100   : null
  const pctServ  = p1.total_servicos>0? ((p2.total_servicos-p1.total_servicos)/p1.total_servicos)*100 : null
  const pctTick  = p1.ticket_medio>0  ? ((p2.ticket_medio-p1.ticket_medio)/p1.ticket_medio)*100 : null
  const diffTick = p2.ticket_medio - p1.ticket_medio
  const top3     = mix.slice(0,3).map(s=>s.servico)
  const altoValor= mix.filter(s=>s.quantidade>0&&(s.valor/s.quantidade)>(p2.ticket_medio||0)*1.2).slice(0,2).map(s=>s.servico)
  const checkObrig = [
    {key:'ficha_entrevista',label:'Ficha para Entrevista',obrig:false},
    {key:'processo_contratacao',label:'Processo de Contratação',obrig:false},
    {key:'materiais_trabalho',label:'Materiais para Trabalho',obrig:false},
    {key:'perfil_ideal',label:'Perfil Ideal',obrig:false},
    {key:'horarios_folgas',label:'Horários e Folgas',obrig:false},
    {key:'distrato',label:'Distrato',obrig:false},
    {key:'contrato_trabalho',label:'Contrato de Trabalho',obrig:true},
    {key:'tem_certificados',label:'Certificados',obrig:false},
    {key:'plano_carreira',label:'Plano de Carreira',obrig:false},
  ].filter(c=>c.obrig&&!(form as any)[c.key])

  const partes: string[] = []

  // 1. Abertura — performance geral
  if (pctFat!==null && pctServ!==null) {
    if (pctServ>5 && pctFat>5)
      partes.push(`${fn}, você teve um ótimo período: atendeu ${pctServ.toFixed(1)}% mais clientes e seu faturamento cresceu ${pctFat.toFixed(1)}%.`)
    else if (pctServ>5 && pctFat<=0)
      partes.push(`${fn}, você atendeu mais clientes (+${pctServ.toFixed(1)}% serviços) — mas seu faturamento caiu ${Math.abs(pctFat).toFixed(1)}%.`)
    else if (pctServ>5 && pctFat>0 && pctFat<=5)
      partes.push(`${fn}, você atendeu mais clientes (+${pctServ.toFixed(1)}% serviços) — ótimo! — e seu faturamento cresceu ${pctFat.toFixed(1)}%.`)
    else if (pctServ<=0 && pctFat>5)
      partes.push(`${fn}, você atendeu menos clientes (${pctServ.toFixed(1)}%), mas seu faturamento cresceu ${pctFat.toFixed(1)}% — sinal de que está cobrando melhor.`)
    else if (pctServ<0 && pctFat<0)
      partes.push(`${fn}, este período foi desafiador: menos clientes (${pctServ.toFixed(1)}%) e faturamento menor (${pctFat.toFixed(1)}%).`)
    else
      partes.push(`${fn}, seu faturamento ${pctFat>=0?'cresceu':'caiu'} ${Math.abs(pctFat).toFixed(1)}% em relação ao período anterior.`)
  } else if (pctFat!==null) {
    partes.push(`${fn}, seu faturamento ${pctFat>=0?'cresceu':'caiu'} ${Math.abs(pctFat).toFixed(1)}% neste período.`)
  }

  // 2. Ticket médio
  if (pctTick!==null && Math.abs(pctTick)>3) {
    if (diffTick<0 && pctServ!==null && pctServ>0)
      partes.push(`Porém está cobrando menos por atendimento (ticket caiu ${fmtR(Math.abs(diffTick))}). Isso significa que você trabalhou mais para ganhar proporcionalmente menos.`)
    else if (diffTick<0)
      partes.push(`Seu ticket médio caiu ${fmtR(Math.abs(diffTick))} — você está cobrando menos por atendimento.`)
    else
      partes.push(`Seu ticket médio subiu ${fmtR(diffTick)} — você está cobrando mais por atendimento, o que é excelente!`)
    if (diffTick<0) {
      if (altoValor.length>0) partes.push(`Reveja seus preços ou foque em serviços de maior valor como ${altoValor.join(' e ')}.`)
      else if (top3.length>0) partes.push(`Considere oferecer serviços complementares aos seus principais: ${top3.slice(0,2).join(' e ')}.`)
    }
  }

  // 3. Ocupação
  if (p2.taxa_ocupacao<30)
    partes.push(`Sua ocupação de ${p2.taxa_ocupacao.toFixed(1)}% está baixa — há muito espaço para crescer. Confirme agendamentos com antecedência e reduza os horários vazios.`)
  else if (p2.taxa_ocupacao<50)
    partes.push(`Sua ocupação é de ${p2.taxa_ocupacao.toFixed(1)}% — ainda há espaço para preencher mais horários.`)
  else if (p2.taxa_ocupacao>=75)
    partes.push(`Sua agenda está muito bem preenchida (${p2.taxa_ocupacao.toFixed(1)}% de ocupação) — parabéns!`)

  // 4. Fidelização
  if (fidel) {
    if (fidel.perdidos>3)
      partes.push(`${fidel.perdidos} clientes novos não voltaram (perda estimada de ${fmtR(fidel.valor_perdido)}). Uma mensagem personalizada pode reconquistar parte deles.`)
    else if (fidel.taxa_fidelizacao>=70)
      partes.push(`Sua taxa de fidelização está excelente: ${fidel.taxa_fidelizacao}% dos novos clientes voltaram!`)
    else if (fidel.taxa_fidelizacao>=50)
      partes.push(`${fidel.taxa_fidelizacao}% dos novos clientes voltaram — bom, mas ainda dá para melhorar o pós-atendimento.`)
  }

  // 5. Serviços destaque
  if (top3.length>0 && (pctServ===null || pctServ>=0))
    partes.push(`Seus serviços mais realizados foram: ${top3.join(', ')}.`)

  // 6. Ocorrências
  if (ocNeg>=3)
    partes.push(`Atenção: ${ocNeg} ocorrências negativas registradas no período — isso precisa ser endereçado com urgência.`)
  else if (ocNeg>0)
    partes.push(`Houve ${ocNeg} ocorrência(s) negativa(s) no período — fique atento.`)
  else if (ocPos>2)
    partes.push(`Ótimo: ${ocPos} feedbacks positivos registrados — seu trabalho está sendo reconhecido!`)

  // 7. Checklist
  if (checkObrig.length>0)
    partes.push(`️ Atenção: há item obrigatório pendente no checklist (${checkObrig.map((c:any)=>c.label).join(', ')}) — regularize o quanto antes.`)

  // 8. Projeção
  if (projecao) {
    if (projecao.tendencia==='alta')
      partes.push(`Com base na tendência dos últimos meses, a projeção para ${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][projecao.proximo_mes-1]} é positiva: ${fmtR(projecao.valor_projetado)} estimados.`)
    else if (projecao.tendencia==='baixa')
      partes.push(`A tendência dos últimos meses indica queda para o próximo período — planeje ações de recuperação.`)
  }

  return partes.join(' ')
}

//  Diagnóstico Automático 
function BlocoDiagnostico({ prof, form, metricas, p1, p2, fidel }: {
  prof: Profissional; form: Partial<Profissional>
  metricas: DadosMetricas | null; p1: MetricaBloco | null; p2: MetricaBloco | null; fidel: Fidelizacao | null
}) {
  const fmt$ = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)

  function semaforo(v: number, [bom, ok, ruim]: [number,number,number]) {
    if (v >= bom) return {cor:'#22c55e', label:'BOM', score:10}
    if (v >= ok)  return {cor:'#f59e0b', label:'ATENÇÃO', score:6}
    if (v >= ruim)return {cor:'#ef4444', label:'CRÍTICO', score:3}
    return {cor:'#ef4444', label:'CRÍTICO', score:1}
  }

  const pctFat    = p1?.faturamento && p2?.faturamento ? ((p2.faturamento-p1.faturamento)/p1.faturamento)*100 : null
  const pctTicket = p1?.ticket_medio && p2?.ticket_medio ? ((p2.ticket_medio-p1.ticket_medio)/p1.ticket_medio)*100 : null

  const sFat    = pctFat    !== null ? semaforo(pctFat,    [10, 0, -10])   : null
  const sTicket = pctTicket !== null ? semaforo(pctTicket, [5, -5, -15])   : null
  const sOcup   = p2?.taxa_ocupacao  !== undefined ? semaforo(p2.taxa_ocupacao, [60, 35, 20]) : null
  const sFidel  = fidel ? semaforo(fidel.taxa_fidelizacao, [70, 50, 30])   : null

  const CHECKLIST_LOCAL: { key: keyof Profissional; label: string; obrig: boolean }[] = [
    {key:'ficha_entrevista',label:'Ficha para Entrevista',obrig:false},
    {key:'processo_contratacao',label:'Processo de Contratação',obrig:false},
    {key:'materiais_trabalho',label:'Materiais para Trabalho',obrig:false},
    {key:'perfil_ideal',label:'Perfil Ideal',obrig:false},
    {key:'horarios_folgas',label:'Horários e Folgas',obrig:false},
    {key:'distrato',label:'Distrato',obrig:false},
    {key:'contrato_trabalho',label:'Contrato de Trabalho',obrig:true},
    {key:'tem_certificados',label:'Certificados',obrig:false},
    {key:'plano_carreira',label:'Plano de Carreira',obrig:false},
  ]
  const checkOk = CHECKLIST_LOCAL.filter(c=>form[c.key]).length
  const checkTotal = CHECKLIST_LOCAL.length
  const checkPend = CHECKLIST_LOCAL.filter(c=>!form[c.key])
  const checkObrig = checkPend.filter(c=>c.obrig)
  const sCheck = checkObrig.length > 0
    ? {cor:'#ef4444', label:'CRÍTICO', score:1}
    : semaforo((checkOk/checkTotal)*100, [80, 55, 30])

  const ocNeg = (metricas?.feedbacks||[]).filter(f=>f.tipo!=='positivo').length
  const ocPos = (metricas?.feedbacks||[]).filter(f=>f.tipo==='positivo').length
  const sOc   = semaforo(ocNeg===0?100:(ocPos/(ocNeg+ocPos||1))*100, [80, 50, 20])

  const allScores = [sFat, sTicket, sOcup, sFidel, sCheck, sOc].filter(Boolean) as {score:number}[]
  const scoreGeral = allScores.length ? Math.round(allScores.reduce((s,v)=>s+v.score,0)/allScores.length*10) : null
  const corGeral = !scoreGeral ? '#64748b' : scoreGeral>=70?'#22c55e':scoreGeral>=45?'#f59e0b':'#ef4444'
  const labelGeral = !scoreGeral ? '—' : scoreGeral>=70?'BOM':scoreGeral>=45?'ATENÇÃO':'CRÍTICO'

  // Diagnóstico textual
  const textos: string[] = []
  if (pctFat!==null) textos.push(pctFat>=10 ? ` Faturamento cresceu ${pctFat.toFixed(1)}% — excelente desempenho no período.` : pctFat>=0 ? `️ Faturamento cresceu apenas ${pctFat.toFixed(1)}% — há espaço para melhorar.` : ` Faturamento caiu ${Math.abs(pctFat).toFixed(1)}% — ação imediata necessária.`)
  if (pctTicket!==null) textos.push(pctTicket>=5 ? ` Ticket médio subiu ${pctTicket.toFixed(1)}% — você está agregando mais valor por atendimento.` : pctTicket>=-5 ? `️ Ticket médio praticamente estável (${pctTicket.toFixed(1)}%) — considere serviços complementares.` : ` Ticket médio caiu ${Math.abs(pctTicket).toFixed(1)}% — você trabalhou mais e ganhou menos por atendimento. Revise preços ou ofereça serviços de maior valor.`)
  if (p2?.taxa_ocupacao!==undefined) textos.push(p2.taxa_ocupacao>=60 ? ` Ocupação em ${p2.taxa_ocupacao.toFixed(1)}% — agenda bem preenchida.` : p2.taxa_ocupacao>=35 ? `️ Ocupação em ${p2.taxa_ocupacao.toFixed(1)}% — tente preencher mais horários disponíveis.` : ` Ocupação de apenas ${p2.taxa_ocupacao.toFixed(1)}% — agenda muito vazia. Invista em confirmação de agendamentos e divulgação.`)
  if (fidel) textos.push(fidel.taxa_fidelizacao>=70 ? ` ${fidel.taxa_fidelizacao}% dos novos clientes voltaram — ótima fidelização!` : fidel.taxa_fidelizacao>=50 ? `️ Apenas ${fidel.taxa_fidelizacao}% dos novos voltaram. ${fidel.perdidos} clientes não retornaram.` : ` Fidelização crítica: ${fidel.taxa_fidelizacao}%. ${fidel.perdidos} clientes novos não voltaram (prejuízo estimado: ${fmt$(fidel.valor_perdido)}).`)
  if (checkObrig.length>0) textos.push(` ${checkObrig.length} item(s) obrigatório(s) do checklist pendente(s): ${checkObrig.map(c=>c.label).join(', ')}.`)
  if (!prof.cnpj) textos.push(' CNPJ não cadastrado — regularize a situação do profissional.')
  if (ocNeg>0) textos.push(`️ ${ocNeg} ocorrência(s) negativa(s) registrada(s). ${ocPos>0?`${ocPos} positiva(s) compensam parcialmente.`:''}`)
  if (metricas?.projecao?.tendencia==='alta') textos.push(` Tendência de crescimento projetada para o próximo mês.`)
  if (metricas?.projecao?.tendencia==='baixa') textos.push(` Tendência de queda projetada — planeje ações de recuperação.`)

  // Plano de ação
  const acoes: {p:'alta'|'media'|'baixa', t:string}[] = []
  if (checkObrig.length>0) acoes.push({p:'alta', t:`Regularizar documentação obrigatória: ${checkObrig.map(c=>c.label).join(', ')}`})
  if (!prof.cnpj) acoes.push({p:'alta', t:'Cadastrar CNPJ do profissional'})
  if (pctTicket!==null && pctTicket<-5) acoes.push({p:'alta', t:`Ticket caindo ${Math.abs(pctTicket).toFixed(1)}% — revisar tabela de preços ou oferecer serviços complementares (ex: hidratação + corte)`})
  if (p2?.taxa_ocupacao!==undefined && p2.taxa_ocupacao<35) acoes.push({p:'alta', t:`Ocupação em ${p2.taxa_ocupacao.toFixed(0)}% — implementar confirmação de agendamentos e criar lista de espera`})
  if (fidel && fidel.perdidos>3) acoes.push({p:'media', t:`${fidel.perdidos} clientes não voltaram — ligar ou enviar mensagem para os que estão há mais de 45 dias sem retornar`})
  if (pctFat!==null && pctFat<0) acoes.push({p:'media', t:'Faturamento em queda — criar promoção ou ação especial para o próximo mês'})
  if (ocNeg>=2) acoes.push({p:'media', t:`${ocNeg} ocorrências negativas — conversar sobre pontualidade e compromissos`})
  if (metricas?.projecao?.tendencia==='baixa') acoes.push({p:'media', t:'Tendência de queda — planejar ações de recuperação imediatamente'})
  if (checkPend.length>0 && checkObrig.length===0) acoes.push({p:'baixa', t:`Completar checklist: ${checkOk}/${checkTotal} itens concluídos`})

  const corP = {alta:'#ef4444',media:'#f59e0b',baixa:'#22c55e'}
  const icoP = {alta:'',media:'',baixa:''}
  const txtP = {alta:'URGENTE',media:'ESTA SEMANA',baixa:'ESTE MÊS'}

  const semDados = !p1 && !p2 && !metricas

  return (
    <div className="space-y-5">
      {/* Score Geral */}
      <div className="rounded-2xl p-6 border" style={{background:'rgba(255,255,255,0.02)', borderColor:`${corGeral}44`}}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-syne font-black text-[18px] text-nodri-t1"> Diagnóstico Geral</h2>
            <p className="text-[11px] text-nodri-t3 mt-1">Análise automática cruzando cadastro, faturamento e ocorrências</p>
            {semDados && <p className="text-[11px] text-nodri-amber mt-2">️ Aplique um filtro na aba Faturamento para análise completa.</p>}
          </div>
          <div className="text-right shrink-0 ml-4">
            <div className="font-syne font-black text-[48px] leading-none" style={{color:corGeral}}>{scoreGeral ?? '—'}</div>
            <div className="text-[12px] font-bold mt-1" style={{color:corGeral}}>{labelGeral}</div>
          </div>
        </div>
        {scoreGeral !== null && (
          <div className="w-full bg-nodri-border rounded-full h-3 overflow-hidden">
            <div className="h-3 rounded-full transition-all" style={{width:`${scoreGeral}%`, background:`linear-gradient(90deg,${corGeral},${corGeral}88)`}}/>
          </div>
        )}
      </div>

      {/* Semáforo por área */}
      <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
        <h3 className="font-syne font-bold text-[13px] mb-4"> Status por Área</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {([
            {l:' Faturamento',  s:sFat,    v: pctFat!==null?`${pctFat>=0?'+':''}${pctFat.toFixed(1)}%`:'Sem dados'},
            {l:'️ Ticket Médio', s:sTicket, v: pctTicket!==null?`${pctTicket>=0?'+':''}${pctTicket.toFixed(1)}%`:'Sem dados'},
            {l:'️ Ocupação',     s:sOcup,   v: p2?.taxa_ocupacao!==undefined?`${p2.taxa_ocupacao.toFixed(1)}%`:'Sem dados'},
            {l:' Fidelização',  s:sFidel,  v: fidel?`${fidel.taxa_fidelizacao}%`:'Sem dados'},
            {l:' Checklist',    s:sCheck,  v:`${checkOk}/${checkTotal} itens`},
            {l:'️ Ocorrências',  s:sOc,    v: ocNeg===0?'Nenhuma negativa':`${ocNeg} negativa(s)`},
          ]).map(item=>(
            <div key={item.l} className="bg-nodri-card border border-nodri-border rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] text-nodri-t3 mb-0.5">{item.l}</div>
                <div className="text-[11px] font-semibold text-nodri-t1 truncate">{item.v}</div>
              </div>
              {item.s && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{color:item.s.cor, background:`${item.s.cor}22`, border:`1px solid ${item.s.cor}44`}}>
                  {item.s.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Narrativa personalizada */}
      {(() => {
        const narrativa = gerarNarrativa(
          prof.apelido||prof.nome_completo, p1, p2, fidel,
          metricas?.mix_receita||[], form, metricas?.projecao||null, ocNeg, ocPos
        )
        if (!narrativa) return null
        return (
          <div className="rounded-2xl p-5 border" style={{background:'rgba(99,102,241,0.04)', borderColor:'rgba(99,102,241,0.25)'}}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[18px]"></span>
              <h3 className="font-syne font-bold text-[13px]">Análise Personalizada</h3>
            </div>
            <p className="text-[13px] text-nodri-t1 leading-[1.8] font-medium">{narrativa}</p>
          </div>
        )
      })()}

      {/* Bullets de apoio */}
      {textos.length > 0 && (
        <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
          <h3 className="font-syne font-bold text-[13px] mb-4"> Pontos de Atenção</h3>
          <div className="space-y-2">
            {textos.map((t,i)=>(
              <p key={i} className="text-[12px] text-nodri-t2 leading-relaxed p-3 bg-nodri-card rounded-xl border border-nodri-border/50">{t}</p>
            ))}
          </div>
        </div>
      )}

      {/* Checklist pendências */}
      {checkPend.length > 0 && (
        <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
          <h3 className="font-syne font-bold text-[13px] mb-4"> Checklist — Itens Pendentes <span className="text-[10px] text-nodri-t3 font-normal">{checkOk}/{checkTotal} concluídos</span></h3>
          <div className="space-y-2">
            {checkPend.map(c=>(
              <div key={c.key} className="flex items-center gap-3 p-2.5 rounded-xl border"
                style={{background:c.obrig?'rgba(239,68,68,0.05)':'rgba(245,158,11,0.05)', borderColor:c.obrig?'rgba(239,68,68,0.2)':'rgba(245,158,11,0.2)'}}>
                <span>{c.obrig?'':''}</span>
                <span className="text-[11px] text-nodri-t1 flex-1">{c.label}</span>
                {c.obrig && <span className="text-[9px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">OBRIGATÓRIO</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ocorrências */}
      {metricas?.feedbacks && metricas.feedbacks.length > 0 && (
        <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
          <h3 className="font-syne font-bold text-[13px] mb-4">️ Ocorrências no Período <span className="text-[10px] text-nodri-t3 font-normal">{metricas.feedbacks.length} registros</span></h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {[{l:'Positivas',v:ocPos,c:'#22c55e'},{l:'Negativas',v:ocNeg,c:'#ef4444'},{l:'Total',v:metricas.feedbacks.length,c:'#7c5cfc'}].map(item=>(
              <div key={item.l} className="bg-nodri-card border border-nodri-border rounded-xl p-3 text-center">
                <div className="text-[9px] text-nodri-t3 uppercase mb-1">{item.l}</div>
                <div className="font-syne font-bold text-[22px]" style={{color:item.c}}>{item.v}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {metricas.feedbacks.slice(0,6).map(fb=>{
              const pos = fb.tipo==='positivo'
              return (
                <div key={fb.id} className="p-2.5 rounded-xl border text-[11px]"
                  style={{background:pos?'rgba(34,197,94,0.05)':'rgba(239,68,68,0.05)', borderColor:pos?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)'}}>
                  <span style={{color:pos?'#22c55e':'#ef4444',fontWeight:700}}>{pos?'':''} {fb.ocorrido_descricao}</span>
                  {fb.descricao && <p className="text-nodri-t3 mt-0.5 italic text-[10px]">"{fb.descricao}"</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Plano de Ação */}
      {acoes.length > 0 && (
        <div className="rounded-2xl p-5 border" style={{background:'rgba(99,102,241,0.04)', borderColor:'rgba(99,102,241,0.2)'}}>
          <h3 className="font-syne font-bold text-[13px] mb-4"> Plano de Ação — Prioridades</h3>
          <div className="space-y-3">
            {acoes.slice(0,6).map((a,i)=>(
              <div key={i} className="flex gap-3 p-3 rounded-xl border bg-nodri-card" style={{borderColor:`${corP[a.p]}33`}}>
                <span className="text-[18px] shrink-0">{icoP[a.p]}</span>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{color:corP[a.p]}}>{txtP[a.p]}</span>
                  <p className="text-[12px] text-nodri-t1 leading-relaxed mt-0.5">{a.t}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {acoes.length===0 && textos.length===0 && !semDados && (
        <div className="text-center py-10 text-nodri-t3">
          <span className="text-4xl"></span>
          <p className="text-[13px] mt-3">Nenhuma ação necessária — tudo dentro do esperado!</p>
        </div>
      )}
    </div>
  )
}

const CHECKLIST: { key: keyof Profissional; label: string; obrig: boolean }[] = [
  { key: 'ficha_entrevista',     label: 'Ficha para Entrevista',        obrig: false },
  { key: 'processo_contratacao', label: 'Processo de Contratação',      obrig: false },
  { key: 'materiais_trabalho',   label: 'Materiais para Trabalho',      obrig: false },
  { key: 'perfil_ideal',         label: 'Perfil Ideal de Profissional', obrig: false },
  { key: 'horarios_folgas',      label: 'Horários e Folgas',            obrig: false },
  { key: 'distrato',             label: 'Distrato',                     obrig: false },
  { key: 'contrato_trabalho',    label: 'Contrato de Trabalho',         obrig: true  },
  { key: 'tem_certificados',     label: 'Certificados',                 obrig: false },
  { key: 'plano_carreira',       label: 'Plano de Carreira',            obrig: false },
]

const inputCls = "w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-nodri-cyan/40 transition-colors text-nodri-t1"
const labelCls = "text-[10px] text-nodri-t3 uppercase tracking-wider mb-1 block"

//  Filtros compartilhados 
function FiltroComparacao({ modoFiltro, setModoFiltro, p1i, setP1i, p1f, setP1f, p2i, setP2i, p2f, setP2f, onAplicar, loading }: any) {
  // Fix: ao trocar para "Mês a Mês", reseta as datas fim para igualar ao início
  function handleModo(m: 'simples'|'range') {
    setModoFiltro(m)
    if (m === 'simples') { setP1f(p1i); setP2f(p2i) }
  }
  return (
    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <BarChart2 size={14} className="text-nodri-cyan"/>
        <h2 className="font-syne font-bold text-[13px]">Filtro de Comparação</h2>
        <div className="ml-auto flex gap-1">
          {(['simples','range'] as const).map(m=>(
            <button key={m} onClick={()=>handleModo(m)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all
                ${modoFiltro===m ? 'bg-nodri-cyan/10 text-nodri-cyan border-nodri-cyan/30' : 'text-nodri-t3 border-nodri-border'}`}>
              {m==='simples' ? 'Mês a Mês' : 'Intervalo'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: modoFiltro==='simples' ? ' Período Anterior (P1)' : ' Período 1', ini: p1i, fim: p1f, setIni: setP1i, setFim: setP1f },
          { label: modoFiltro==='simples' ? ' Período Atual (P2)'    : ' Período 2', ini: p2i, fim: p2f, setIni: setP2i, setFim: setP2f },
        ].map((col,ci)=>(
          <div key={ci} className="bg-nodri-card/50 rounded-xl p-3 border border-nodri-border">
            <div className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-2">{col.label}</div>
            <input type="month" value={col.ini} onChange={e=>{col.setIni(e.target.value); if(modoFiltro==='simples') col.setFim(e.target.value)}}
              className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-nodri-cyan/40 text-nodri-t1"/>
            {modoFiltro==='range' && <>
              <div className="text-[9px] text-nodri-t3 mt-2 mb-1">Até</div>
              <input type="month" value={col.fim} onChange={e=>col.setFim(e.target.value)}
                className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-nodri-cyan/40 text-nodri-t1"/>
            </>}
          </div>
        ))}
      </div>
      <button onClick={onAplicar} disabled={loading}
        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-nodri-cyan text-nodri-dark text-[12px] font-bold hover:brightness-110 disabled:opacity-50">
        {loading ? <Loader2 size={13} className="animate-spin"/> : <BarChart2 size={13}/>} Aplicar
      </button>
    </div>
  )
}

//  Gráfico de barras verticais com comparativo ano anterior 
function GraficoFaturamento({ historico }: { historico: HistoricoItem[] }) {
  if (!historico.length) return null
  const recente = historico.slice(-12)
  // mapa de todos os dados para buscar ano anterior
  const hMap: Record<string, number> = {}
  historico.forEach(h => { hMap[`${h.ano}-${h.mes}`] = h.faturamento })
  const max = Math.max(...recente.map(h => {
    const prev = hMap[`${h.ano-1}-${h.mes}`]||0
    return Math.max(h.faturamento, prev)
  }), 1)

  return (
    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
      <h3 className="font-syne font-bold text-[13px] mb-1"> Faturamento Mensal</h3>
      <div className="flex gap-4 mb-4 text-[9px] text-nodri-t3">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{background:'linear-gradient(to top,#00e5c8,#7c5cfc)'}}/> Atual</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm opacity-40 bg-purple-400"/> Ano ant.</span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex items-end gap-1.5 pb-1" style={{minWidth: `${recente.length * 60}px`, height:'180px'}}>
          {recente.map(h => {
            const prevFat = hMap[`${h.ano-1}-${h.mes}`]||0
            const pctGrowth = prevFat > 0 ? ((h.faturamento-prevFat)/prevFat)*100 : null
            const barH = Math.max((h.faturamento/max)*100, h.faturamento>0?3:0)
            const prevH = Math.max((prevFat/max)*100, prevFat>0?3:0)
            const diff = h.faturamento - prevFat
            return (
              <div key={`${h.ano}-${h.mes}`} className="flex flex-col items-center gap-0.5 flex-1 min-w-[50px]">
                {/* % e diferença */}
                <div className="flex flex-col items-center" style={{height:'32px',justifyContent:'flex-end'}}>
                  {pctGrowth !== null && (
                    <span style={{color: pctGrowth>=0?'#22c55e':'#ef4444', fontSize:'9px', fontWeight:700, lineHeight:1.2}}>
                      {pctGrowth>=0?'+':''}{pctGrowth.toFixed(0)}%
                    </span>
                  )}
                  {diff !== 0 && prevFat > 0 && (
                    <span style={{color:'#94a3b8', fontSize:'8px', lineHeight:1.2}}>
                      {diff>0?'+':''}{(diff/1000).toFixed(1)}k
                    </span>
                  )}
                </div>
                {/* Barras */}
                <div className="flex items-end gap-0.5 flex-1 w-full">
                  {prevFat > 0 && (
                    <div className="flex-1 rounded-t-sm opacity-40" style={{height:`${prevH}%`, background:'#7c5cfc', minHeight:'3px'}}
                      title={`Ano ant: R$ ${prevFat.toLocaleString('pt-BR',{minimumFractionDigits:2})}`}/>
                  )}
                  <div className="flex-1 rounded-t-sm" style={{height:`${barH}%`, background:'linear-gradient(to top,#00e5c8,#7c5cfc)', minHeight: h.faturamento>0?'3px':'0'}}
                    title={`R$ ${h.faturamento.toLocaleString('pt-BR',{minimumFractionDigits:2})}`}/>
                </div>
                {/* Valor */}
                <span style={{fontSize:'8px', color:'#e2e8f0', fontWeight:600, textAlign:'center', lineHeight:1.2}}>
                  {(h.faturamento/1000).toFixed(1)}k
                </span>
                {/* Mês */}
                <span style={{fontSize:'8px', color:'#64748b'}}>{MESES[h.mes-1]}/{String(h.ano).slice(2)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

//  Eficiência 
function BlocoEficiencia({ p1, p2 }: { p1: MetricaBloco; p2: MetricaBloco }) {
  const fmt$ = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
  const f = (v:number) => v.toLocaleString('pt-BR',{maximumFractionDigits:1})
  const fatDia1 = p1.dias_trabalhados>0 ? p1.faturamento/p1.dias_trabalhados : 0
  const fatDia2 = p2.dias_trabalhados>0 ? p2.faturamento/p2.dias_trabalhados : 0
  const sDia1   = p1.dias_trabalhados>0 ? p1.total_servicos/p1.dias_trabalhados : 0
  const sDia2   = p2.dias_trabalhados>0 ? p2.total_servicos/p2.dias_trabalhados : 0
  const ticketS1 = p1.total_servicos>0 ? p1.faturamento/p1.total_servicos : 0
  const ticketS2 = p2.total_servicos>0 ? p2.faturamento/p2.total_servicos : 0
  return (
    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
      <h3 className="font-syne font-bold text-[13px] mb-4"> Eficiência por Dia Trabalhado</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {l:' Faturamento / Dia', a:fatDia2, b:fatDia1, f:(v:number)=>fmt$(v)},
          {l:'️ Serviços / Dia',    a:sDia2,   b:sDia1,   f:(v:number)=>f(v)},
          {l:'️ Ticket / Serviço',  a:ticketS2, b:ticketS1, f:(v:number)=>fmt$(v)},
        ].map(item=>(
          <div key={item.l} className="bg-nodri-card border border-nodri-border rounded-xl p-3">
            <div className="text-[9px] text-nodri-t3 uppercase tracking-wider mb-1">{item.l}</div>
            <div className="font-syne font-bold text-[18px] text-nodri-t1">{item.f(item.a)}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] text-nodri-t3">Ant: {item.f(item.b)}</span>
              <DeltaBadge atual={item.a} anterior={item.b}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

//  Mix de Receita 
function BlocoMixReceita({ mix }: { mix: MixItem[] }) {
  const fmt$ = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
  if (!mix.length) return null
  const cores = ['#00e5c8','#7c5cfc','#f43f8e','#f59e0b','#22c55e','#06b6d4','#a855f7','#ef4444','#84cc16','#fb923c']
  const maxPct = Math.max(...mix.map(m=>m.pct), 1)
  return (
    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
      <h3 className="font-syne font-bold text-[13px] mb-4"> Mix de Receita — Top Serviços (histórico completo)</h3>
      <div className="space-y-2">
        {mix.map((item,i)=>(
          <div key={item.servico} className="flex items-center gap-3">
            <span className="text-[10px] text-nodri-t1 shrink-0" style={{width:'140px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={item.servico}>{item.servico}</span>
            <div className="flex-1 h-4 bg-nodri-border rounded-full overflow-hidden">
              <div className="h-4 rounded-full" style={{width:`${(item.pct/maxPct)*100}%`, background: cores[i%cores.length]}}/>
            </div>
            <span className="text-[10px] font-bold text-nodri-t1 w-10 text-right shrink-0">{item.pct.toFixed(1)}%</span>
            <span className="text-[9px] text-nodri-t3 w-20 text-right shrink-0">{fmt$(item.valor)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

//  Clientes Novos vs Fiéis 
function BlocoClientesFidelizacao({ historico }: { historico: HistoricoItem[] }) {
  const recent = historico.filter(h=>h.clientes_preferencia>0||h.clientes_sem_preferencia>0).slice(-12)
  if (!recent.length) return null
  const max = Math.max(...recent.map(h=>h.clientes_preferencia+h.clientes_sem_preferencia), 1)
  return (
    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
      <h3 className="font-syne font-bold text-[13px] mb-4"> Clientes Fiéis vs Novos — Evolução Mensal</h3>
      <div className="flex gap-4 mb-3 text-[9px] text-nodri-t3">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{background:'#22c55e'}}/> Fiéis (preferência)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{background:'#06b6d4'}}/> Novos (sem pref.)</span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex items-end gap-2 pb-1" style={{minWidth:`${recent.length*50}px`, height:'130px'}}>
          {recent.map(h=>{
            const prefH = max>0?(h.clientes_preferencia/max)*100:0
            const novH  = max>0?(h.clientes_sem_preferencia/max)*100:0
            return (
              <div key={`${h.ano}-${h.mes}`} className="flex flex-col items-center gap-0.5 flex-1 min-w-[40px]">
                <div className="flex items-end gap-0.5 flex-1 w-full">
                  <div className="flex-1 rounded-t-sm" style={{height:`${Math.max(prefH,prefH>0?3:0)}%`, background:'#22c55e'}} title={`Fiéis: ${h.clientes_preferencia}`}/>
                  <div className="flex-1 rounded-t-sm" style={{height:`${Math.max(novH,novH>0?3:0)}%`, background:'#06b6d4'}} title={`Novos: ${h.clientes_sem_preferencia}`}/>
                </div>
                <span style={{fontSize:'8px',color:'#64748b'}}>{MESES[h.mes-1]}/{String(h.ano).slice(2)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

//  Projeção 
function BlocoProjecao({ p }: { p: ProjecaoData }) {
  const fmt$ = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
  const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const cor = p.tendencia==='alta'?'#22c55e':p.tendencia==='baixa'?'#ef4444':'#a5b4fc'
  const bg  = p.tendencia==='alta'?'rgba(34,197,94,0.05)':p.tendencia==='baixa'?'rgba(239,68,68,0.05)':'rgba(99,102,241,0.05)'
  const bd  = p.tendencia==='alta'?'rgba(34,197,94,0.25)':p.tendencia==='baixa'?'rgba(239,68,68,0.25)':'rgba(99,102,241,0.25)'
  return (
    <div className="rounded-2xl p-5 border" style={{background:bg,borderColor:bd}}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-syne font-bold text-[13px]"> Projeção de Faturamento</h3>
        <span className="text-[10px] px-3 py-1 rounded-full font-bold border" style={{color:cor,borderColor:bd,background:bg}}>
          {p.tendencia==='alta'?' CRESCENDO':p.tendencia==='baixa'?' QUEDA':'️ ESTÁVEL'}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-nodri-card border border-nodri-border rounded-xl p-3">
          <div className="text-[9px] text-nodri-t3 uppercase mb-1">Próximo Mês</div>
          <div className="font-syne font-bold text-[13px] text-nodri-t1">{MESES_NOMES[p.proximo_mes-1]} {p.proximo_ano}</div>
        </div>
        <div className="bg-nodri-card border border-nodri-border rounded-xl p-3">
          <div className="text-[9px] text-nodri-t3 uppercase mb-1">Valor Projetado</div>
          <div className="font-syne font-bold text-[16px]" style={{color:cor}}>{fmt$(p.valor_projetado)}</div>
        </div>
        <div className="bg-nodri-card border border-nodri-border rounded-xl p-3">
          <div className="text-[9px] text-nodri-t3 uppercase mb-1">Taxa Média</div>
          <div className="font-syne font-bold text-[16px]" style={{color:cor}}>
            {p.taxa_media>=0?'+':''}{p.taxa_media}%
          </div>
        </div>
      </div>
      <p className="text-[10px] text-nodri-t3 mt-3"> Baseado na tendência dos últimos {p.baseado_em} meses registrados</p>
    </div>
  )
}

//  Sazonalidade 
function BlocoSazonalidade({ s }: { s: SazonalidadeItem[] }) {
  const fmt$ = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
  const comDados = s.filter(m=>m.count>0)
  if (!comDados.length) return null
  const max = Math.max(...comDados.map(m=>m.media), 1)
  const melhor = comDados.reduce((a,b)=>a.media>b.media?a:b)
  const pior   = comDados.reduce((a,b)=>a.media<b.media?a:b)
  return (
    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="font-syne font-bold text-[13px]"> Sazonalidade — Médias Históricas por Mês</h3>
        <div className="flex gap-3 text-[10px]">
          <span style={{color:'#22c55e',fontWeight:700}}> {MESES[melhor.mes-1]} ({fmt$(melhor.media)})</span>
          <span style={{color:'#ef4444',fontWeight:700}}>️ {MESES[pior.mes-1]} ({fmt$(pior.media)})</span>
        </div>
      </div>
      <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
        {s.map(item=>{
          const h = item.count>0?(item.media/max)*100:0
          const isMelhor = item.mes===melhor.mes
          const isPior   = item.mes===pior.mes
          const cor = isMelhor?'#22c55e':isPior?'#ef4444':'linear-gradient(to top,#00e5c8,#7c5cfc)'
          return (
            <div key={item.mes} className="flex flex-col items-center gap-1" title={item.count>0?`Média: ${fmt$(item.media)}\nMáx: ${fmt$(item.max)}\nMín: ${fmt$(item.min)}\n${item.count} anos`:'Sem dados'}>
              <div className="w-full flex items-end justify-center" style={{height:'64px'}}>
                <div className="w-full rounded-t" style={{
                  height:`${Math.max(h, item.count>0?4:0)}%`,
                  background: cor,
                  opacity: item.count===0?0.15:1,
                  transition:'height 0.3s'
                }}/>
              </div>
              <span style={{fontSize:'8px',color:'#64748b',fontWeight:600}}>{MESES[item.mes-1]}</span>
              {item.count>0&&<span style={{fontSize:'7px',color:'#475569'}}>{item.count}x</span>}
            </div>
          )
        })}
      </div>
      <p className="text-[9px] text-nodri-t3 mt-3"> Melhor mês ·  Pior mês · Número = quantidade de anos com dados</p>
    </div>
  )
}

//  BlocoDiagnosticoResumido — Score + Semáforo + Narrativa + Plano de Ação (sem checklist/ocorrências) 
function BlocoDiagnosticoResumido({ prof, form, metricas, p1, p2, fidel }: {
  prof: Profissional; form: Partial<Profissional>
  metricas: DadosMetricas | null; p1: MetricaBloco | null; p2: MetricaBloco | null; fidel: Fidelizacao | null
}) {
  const fmt$ = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)

  function semaforo(v: number, [bom, ok, ruim]: [number,number,number]) {
    if (v >= bom) return {cor:'#22c55e', label:'BOM', score:10}
    if (v >= ok)  return {cor:'#f59e0b', label:'ATENÇÃO', score:6}
    if (v >= ruim)return {cor:'#ef4444', label:'CRÍTICO', score:3}
    return {cor:'#ef4444', label:'CRÍTICO', score:1}
  }

  const pctFat    = p1?.faturamento && p2?.faturamento ? ((p2.faturamento-p1.faturamento)/p1.faturamento)*100 : null
  const pctTicket = p1?.ticket_medio && p2?.ticket_medio ? ((p2.ticket_medio-p1.ticket_medio)/p1.ticket_medio)*100 : null

  const sFat    = pctFat    !== null ? semaforo(pctFat,    [10, 0, -10])   : null
  const sTicket = pctTicket !== null ? semaforo(pctTicket, [5, -5, -15])   : null
  const sOcup   = p2?.taxa_ocupacao  !== undefined ? semaforo(p2.taxa_ocupacao, [60, 35, 20]) : null
  const sFidel  = fidel ? semaforo(fidel.taxa_fidelizacao, [70, 50, 30])   : null

  const CHECKLIST_R: { key: keyof Profissional; label: string; obrig: boolean }[] = [
    {key:'ficha_entrevista',label:'Ficha para Entrevista',obrig:false},
    {key:'processo_contratacao',label:'Processo de Contratação',obrig:false},
    {key:'materiais_trabalho',label:'Materiais para Trabalho',obrig:false},
    {key:'perfil_ideal',label:'Perfil Ideal',obrig:false},
    {key:'horarios_folgas',label:'Horários e Folgas',obrig:false},
    {key:'distrato',label:'Distrato',obrig:false},
    {key:'contrato_trabalho',label:'Contrato de Trabalho',obrig:true},
    {key:'tem_certificados',label:'Certificados',obrig:false},
    {key:'plano_carreira',label:'Plano de Carreira',obrig:false},
  ]
  const checkOk = CHECKLIST_R.filter(c=>form[c.key]).length
  const checkTotal = CHECKLIST_R.length
  const checkPend = CHECKLIST_R.filter(c=>!form[c.key])
  const checkObrig = checkPend.filter(c=>c.obrig)
  const sCheck = checkObrig.length > 0
    ? {cor:'#ef4444', label:'CRÍTICO', score:1}
    : semaforo((checkOk/checkTotal)*100, [80, 55, 30])

  const ocNeg = (metricas?.feedbacks||[]).filter(f=>f.tipo!=='positivo').length
  const ocPos = (metricas?.feedbacks||[]).filter(f=>f.tipo==='positivo').length
  const sOc   = semaforo(ocNeg===0?100:(ocPos/(ocNeg+ocPos||1))*100, [80, 50, 20])

  const allScores = [sFat, sTicket, sOcup, sFidel, sCheck, sOc].filter(Boolean) as {score:number}[]
  const scoreGeral = allScores.length ? Math.round(allScores.reduce((s,v)=>s+v.score,0)/allScores.length*10) : null
  const corGeral = !scoreGeral ? '#64748b' : scoreGeral>=70?'#22c55e':scoreGeral>=45?'#f59e0b':'#ef4444'
  const labelGeral = !scoreGeral ? '—' : scoreGeral>=70?'BOM':scoreGeral>=45?'ATENÇÃO':'CRÍTICO'

  const narrativa = gerarNarrativa(
    prof.apelido||prof.nome_completo, p1, p2, fidel,
    metricas?.mix_receita||[], form, metricas?.projecao||null, ocNeg, ocPos
  )

  // Plano de ação
  const acoes: {p:'alta'|'media'|'baixa', t:string}[] = []
  if (checkObrig.length>0) acoes.push({p:'alta', t:`Regularizar documentação obrigatória: ${checkObrig.map(c=>c.label).join(', ')}`})
  if (!prof.cnpj) acoes.push({p:'alta', t:'Cadastrar CNPJ do profissional'})
  if (pctTicket!==null && pctTicket<-5) acoes.push({p:'alta', t:`Ticket caindo ${Math.abs(pctTicket).toFixed(1)}% — revisar tabela de preços`})
  if (p2?.taxa_ocupacao!==undefined && p2.taxa_ocupacao<35) acoes.push({p:'alta', t:`Ocupação em ${p2.taxa_ocupacao.toFixed(0)}% — aumentar agendamentos`})
  if (fidel && fidel.perdidos>3) acoes.push({p:'media', t:`${fidel.perdidos} clientes não voltaram — criar ação de retenção`})
  if (pctFat!==null && pctFat<0) acoes.push({p:'media', t:'Faturamento em queda — criar promoção especial'})
  if (metricas?.projecao?.tendencia==='baixa') acoes.push({p:'media', t:'Tendência de queda — planejar ações de recuperação'})

  const corP = {alta:'#ef4444',media:'#f59e0b',baixa:'#22c55e'}
  const icoP = {alta:'',media:'',baixa:''}
  const txtP = {alta:'URGENTE',media:'ESTA SEMANA',baixa:'ESTE MÊS'}

  return (
    <div className="space-y-5">
      {/* Score Geral */}
      <div className="rounded-2xl p-6 border" style={{background:'rgba(255,255,255,0.02)', borderColor:`${corGeral}44`}}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-syne font-black text-[18px] text-nodri-t1"> Diagnóstico Rápido</h2>
            <p className="text-[11px] text-nodri-t3 mt-1">Score baseado nos dados do período selecionado</p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <div className="font-syne font-black text-[48px] leading-none" style={{color:corGeral}}>{scoreGeral ?? '—'}</div>
            <div className="text-[12px] font-bold mt-1" style={{color:corGeral}}>{labelGeral}</div>
          </div>
        </div>
        {scoreGeral !== null && (
          <div className="w-full bg-nodri-border rounded-full h-3 overflow-hidden">
            <div className="h-3 rounded-full transition-all" style={{width:`${scoreGeral}%`, background:`linear-gradient(90deg,${corGeral},${corGeral}88)`}}/>
          </div>
        )}
      </div>

      {/* Semáforo por área */}
      <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
        <h3 className="font-syne font-bold text-[13px] mb-4"> Status por Área</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {([
            {l:' Faturamento',  s:sFat,    v: pctFat!==null?`${pctFat>=0?'+':''}${pctFat.toFixed(1)}%`:'Sem dados'},
            {l:'️ Ticket Médio', s:sTicket, v: pctTicket!==null?`${pctTicket>=0?'+':''}${pctTicket.toFixed(1)}%`:'Sem dados'},
            {l:'️ Ocupação',     s:sOcup,   v: p2?.taxa_ocupacao!==undefined?`${p2.taxa_ocupacao.toFixed(1)}%`:'Sem dados'},
            {l:' Fidelização',  s:sFidel,  v: fidel?`${fidel.taxa_fidelizacao}%`:'Sem dados'},
            {l:' Checklist',    s:sCheck,  v:`${checkOk}/${checkTotal} itens`},
            {l:'️ Ocorrências',  s:sOc,    v: ocNeg===0?'Nenhuma negativa':`${ocNeg} negativa(s)`},
          ]).map(item=>(
            <div key={item.l} className="bg-nodri-card border border-nodri-border rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] text-nodri-t3 mb-0.5">{item.l}</div>
                <div className="text-[11px] font-semibold text-nodri-t1 truncate">{item.v}</div>
              </div>
              {item.s && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{color:item.s.cor, background:`${item.s.cor}22`, border:`1px solid ${item.s.cor}44`}}>
                  {item.s.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Narrativa personalizada */}
      {narrativa && (
        <div className="rounded-2xl p-5 border" style={{background:'rgba(99,102,241,0.04)', borderColor:'rgba(99,102,241,0.25)'}}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[18px]"></span>
            <h3 className="font-syne font-bold text-[13px]">Análise Personalizada</h3>
          </div>
          <p className="text-[13px] text-nodri-t1 leading-[1.8] font-medium">{narrativa}</p>
        </div>
      )}

      {/* Plano de Ação */}
      {acoes.length > 0 && (
        <div className="rounded-2xl p-5 border" style={{background:'rgba(99,102,241,0.04)', borderColor:'rgba(99,102,241,0.2)'}}>
          <h3 className="font-syne font-bold text-[13px] mb-4"> Plano de Ação</h3>
          <div className="space-y-3">
            {acoes.slice(0,5).map((a,i)=>(
              <div key={i} className="flex gap-3 p-3 rounded-xl border bg-nodri-card" style={{borderColor:`${corP[a.p]}33`}}>
                <span className="text-[18px] shrink-0">{icoP[a.p]}</span>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{color:corP[a.p]}}>{txtP[a.p]}</span>
                  <p className="text-[12px] text-nodri-t1 leading-relaxed mt-0.5">{a.t}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

//  PendenciasLateral — painel compacto para a aba Dados Cadastrais 
function PendenciasLateral({ profissionalId }: { profissionalId: string }) {
  const [pendencias, setPendencias] = useState<Array<{
    id: string; mensagem: string; data_limite: string | null
    resolvido: boolean; resolvido_em: string | null
  }>>([])
  const [loading, setLoading] = useState(true)
  const [historicoAberto, setHistoricoAberto] = useState(false)

  useEffect(() => {
    fetch(`/api/pendencias?profissional_id=${profissionalId}`)
      .then(r => r.json())
      .then(d => { setPendencias(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [profissionalId])

  async function marcarFeito(itemId: string) {
    const res = await fetch(`/api/pendencias/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolvido: true, resolvido_em: new Date().toISOString() }),
    })
    if (res.ok) {
      setPendencias(prev => prev.map(p =>
        p.id === itemId ? { ...p, resolvido: true, resolvido_em: new Date().toISOString() } : p
      ))
    }
  }

  const abertas = pendencias.filter(p => !p.resolvido)
  const resolvidas = pendencias.filter(p => p.resolvido)

  return (
    <div className="rounded-2xl border sticky top-20 space-y-3 p-4"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between">
        <h2 className="font-syne font-bold text-[12px] text-nodri-cyan"> Pendências</h2>
        {abertas.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            {abertas.length}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 size={18} className="animate-spin text-nodri-cyan"/>
        </div>
      )}

      {!loading && abertas.length === 0 && (
        <p className="text-[11px] text-nodri-t3 py-2">Nenhuma pendência ativa</p>
      )}

      {!loading && abertas.length > 0 && (
        <div className="space-y-2">
          {abertas.map(p => (
            <div key={p.id} className="rounded-xl p-3 border space-y-1.5"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-[11px] text-nodri-t1 leading-snug">{p.mensagem}</p>
              <div className="flex items-center justify-between gap-2">
                {p.data_limite && (
                  <span className="text-[9px] text-nodri-t3">
                    Limite: {new Date(p.data_limite + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                )}
                <button
                  onClick={() => marcarFeito(p.id)}
                  className="ml-auto text-[10px] px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors font-semibold">
                   Feito
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && resolvidas.length > 0 && (
        <div>
          <button
            onClick={() => setHistoricoAberto(v => !v)}
            className="flex items-center gap-1 text-[10px] text-nodri-t3 hover:text-nodri-t1 transition-colors font-semibold py-1">
            {historicoAberto ? '' : ''} Histórico ({resolvidas.length})
          </button>
          {historicoAberto && (
            <div className="space-y-1.5 mt-2">
              {resolvidas.map(p => (
                <div key={p.id} className="rounded-xl p-2.5 border"
                  style={{ background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.12)' }}>
                  <p className="text-[10px] text-nodri-t3 line-through">{p.mensagem}</p>
                  {p.resolvido_em && (
                    <p className="text-[9px] text-nodri-t3/60 mt-0.5">
                      {new Date(p.resolvido_em).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

//  AbaPendencias 
function AbaPendencias({ profissionalId }: { profissionalId: string }) {
  const [pendencias, setPendencias] = useState<Array<{
    id: string; profissional_id: string; mensagem: string
    data_limite: string | null; resolvido: boolean; resolvido_em: string | null; criado_em: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [novaMensagem, setNovaMensagem] = useState('')
  const [novaDataLimite, setNovaDataLimite] = useState('')
  const [criando, setCriando] = useState(false)
  const [editandoData, setEditandoData] = useState<string | null>(null)
  const [novaData, setNovaData] = useState('')

  useEffect(() => {
    fetch(`/api/pendencias?profissional_id=${profissionalId}`)
      .then(r => r.json())
      .then(d => { setPendencias(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [profissionalId])

  async function criar() {
    if (!novaMensagem.trim()) return
    setCriando(true)
    const res = await fetch('/api/pendencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profissional_id: profissionalId, mensagem: novaMensagem.trim(), data_limite: novaDataLimite || null }),
    })
    if (res.ok) {
      const nova = await res.json()
      setPendencias(prev => [nova, ...prev])
      setNovaMensagem('')
      setNovaDataLimite('')
      toast.success('Pendência adicionada!')
    } else {
      toast.error('Erro ao adicionar pendência')
    }
    setCriando(false)
  }

  async function marcarResolvida(id: string) {
    const res = await fetch(`/api/pendencias/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolvido: true }),
    })
    if (res.ok) {
      const atualizada = await res.json()
      setPendencias(prev => prev.map(p => p.id === id ? { ...p, ...atualizada } : p))
      toast.success(' Marcada como feita!')
    }
  }

  async function salvarData(id: string) {
    const res = await fetch(`/api/pendencias/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data_limite: novaData || null }),
    })
    if (res.ok) {
      const atualizada = await res.json()
      setPendencias(prev => prev.map(p => p.id === id ? { ...p, ...atualizada } : p))
      setEditandoData(null)
      toast.success('Data atualizada!')
    } else {
      toast.error('Erro ao atualizar data')
    }
  }

  const hoje = new Date()
  const abertas = pendencias.filter(p => !p.resolvido)
  const resolvidas = pendencias.filter(p => p.resolvido)

  function isVencida(p: { data_limite: string | null; resolvido: boolean }) {
    return !p.resolvido && p.data_limite && new Date(p.data_limite + 'T23:59:59') < hoje
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan"/></div>

  return (
    <div className="space-y-4">
      {/* Formulário de nova pendência */}
      <div className="rounded-xl border border-nodri-border bg-nodri-card p-4 space-y-3">
        <h3 className="font-syne font-bold text-[12px] text-nodri-t1">+ Nova Pendência</h3>
        <textarea
          value={novaMensagem}
          onChange={e => setNovaMensagem(e.target.value)}
          rows={2}
          placeholder="Descreva a pendência ou tarefa..."
          className="w-full bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-nodri-t1 outline-none focus:border-nodri-cyan/40 resize-none"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={novaDataLimite}
            onChange={e => setNovaDataLimite(e.target.value)}
            className="bg-nodri-surface border border-nodri-border rounded-lg px-3 py-1.5 text-[11px] text-nodri-t1 outline-none focus:border-nodri-cyan/40"
            style={{ colorScheme: 'dark' }}
          />
          <button
            onClick={criar}
            disabled={criando || !novaMensagem.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-nodri-cyan text-nodri-dark text-[11px] font-bold disabled:opacity-50 hover:brightness-110 transition-all">
            {criando ? <Loader2 size={12} className="animate-spin"/> : '+'} Adicionar
          </button>
        </div>
      </div>

      {abertas.length === 0 && (
        <div className="text-center py-8 text-nodri-t3">
          <span className="text-3xl"></span>
          <p className="text-[12px] mt-2">Nenhuma pendência em aberto.</p>
        </div>
      )}

      {abertas.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-syne font-bold text-[12px] text-nodri-t2">Em Aberto ({abertas.length})</h3>
          {abertas.map(p => (
            <div key={p.id} className={`rounded-xl p-4 border space-y-2 ${isVencida(p) ? 'bg-red-500/5 border-red-500/20' : 'bg-nodri-card border-nodri-border'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {isVencida(p) && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">VENCIDO</span>}
                    {p.data_limite && <span className="text-[9px] text-nodri-t3">Limite: {new Date(p.data_limite + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                  </div>
                  <p className="text-[12px] text-nodri-t1">{p.mensagem}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setEditandoData(p.id); setNovaData(p.data_limite || '') }}
                    className="text-[10px] px-2 py-1 rounded-lg bg-nodri-surface border border-nodri-border text-nodri-t3 hover:text-nodri-t1 transition-colors">
                    
                  </button>
                  <button
                    onClick={() => marcarResolvida(p.id)}
                    className="text-[10px] px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors font-semibold">
                     Feito
                  </button>
                </div>
              </div>
              {editandoData === p.id && (
                <div className="flex items-center gap-2 pt-1 border-t border-nodri-border">
                  <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)}
                    className="bg-nodri-surface border border-nodri-cyan/40 rounded-lg px-2 py-1 text-[11px] text-nodri-t1 outline-none"
                    style={{ colorScheme: 'dark' }} />
                  <button onClick={() => salvarData(p.id)} className="text-[10px] px-3 py-1 rounded-lg bg-nodri-cyan text-nodri-dark font-bold">Salvar</button>
                  <button onClick={() => setEditandoData(null)} className="text-[10px] text-nodri-t3 hover:text-nodri-t1">Cancelar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {resolvidas.length > 0 && (
        <div>
          <button
            onClick={() => setHistoricoAberto(v => !v)}
            className="flex items-center gap-2 text-[11px] text-nodri-t3 hover:text-nodri-t1 transition-colors font-semibold py-2">
            {historicoAberto ? '' : ''} Histórico de resolvidas ({resolvidas.length})
          </button>
          {historicoAberto && (
            <div className="space-y-2 mt-2">
              {resolvidas.map(p => (
                <div key={p.id} className="rounded-xl p-3 border bg-green-500/5 border-green-500/15">
                  <p className="text-[11px] text-nodri-t2 line-through">{p.mensagem}</p>
                  {p.resolvido_em && <p className="text-[9px] text-nodri-t3 mt-0.5">Resolvida em {new Date(p.resolvido_em).toLocaleDateString('pt-BR')}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

//  AbaIA 
function AbaIA({ profissionalId, nomeProfissional }: { profissionalId: string; nomeProfissional: string }) {
  const [temApiKey, setTemApiKey] = useState<boolean | null>(null)
  const [mensagens, setMensagens] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [input, setInput] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [conversaId, setConversaId] = useState<string | undefined>(undefined)
  const [carregando, setCarregando] = useState(true)
  const [statusAnalise, setStatusAnalise] = useState<'carregando'|'pronta'|'gerando'|null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const primeiroNome = nomeProfissional.split(' ')[0]

  useEffect(() => {
    async function init() {
      try {
        const [configRes, conversaRes, analiseRes] = await Promise.all([
          fetch('/api/ia/config').then(r => r.json()),
          fetch(`/api/ia/conversa?profissional_id=${profissionalId}`).then(r => r.json()),
          fetch(`/api/ia/analise?profissional_id=${profissionalId}`).then(r => r.json()),
        ])
        setTemApiKey(!!configRes.tem_api_key)

        if (configRes.tem_api_key) {
          if (analiseRes.analise) {
            // Análise já salva — carrega instantaneamente, não precisa gerar
            setStatusAnalise('pronta')
          } else {
            // Sem análise — gera agora em background (silenciosamente)
            setStatusAnalise('gerando')
            gerarAnalise()
          }

          if (conversaRes.conversa?.mensagens?.length > 0) {
            setMensagens(conversaRes.conversa.mensagens)
            setConversaId(conversaRes.conversa.id)
          } else {
            await boasVindas()
          }
        }
      } catch {
        setTemApiKey(false)
      } finally {
        setCarregando(false)
      }
    }
    init()
  }, [profissionalId])

  async function gerarAnalise() {
    setStatusAnalise('gerando')
    try {
      const res = await fetch('/api/ia/analise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profissional_id: profissionalId }),
      })
      if (!res.ok || !res.body) { setStatusAnalise(null); return }
      // Consome o stream silenciosamente — só para salvar no banco
      const reader = res.body.getReader()
      while (true) {
        const { done } = await reader.read()
        if (done) break
      }
    } catch {}
    setStatusAnalise('pronta')
  }

  async function boasVindas() {
    setEnviando(true)
    setMensagens([{ role: 'assistant', content: '' }])
    const msgBV = [{ role: 'user' as const, content: `[SISTEMA] Apresente-se para ${primeiroNome} com uma saudação personalizada e breve. Mencione o nome dela, diga que você já tem acesso aos dados dela no sistema e pergunte como pode ajudar. Máximo 3 linhas. Não repita esse prompt.` }]
    try {
      const res = await fetch('/api/ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: msgBV, profissional_id: profissionalId }),
      })
      if (!res.ok || !res.body) { setEnviando(false); return }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += dec.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const json = line.slice(5).trim()
          if (!json) continue
          try {
            const parsed = JSON.parse(json)
            if (parsed.token) setMensagens(prev => {
              const last = prev[prev.length - 1]
              return [...prev.slice(0, -1), { ...last, content: last.content + parsed.token }]
            })
            if (parsed.done && parsed.conversa_id) setConversaId(parsed.conversa_id)
          } catch {}
        }
      }
    } catch {}
    setEnviando(false)
  }

  async function novaConversa() {
    if (!confirm('Iniciar nova conversa? A IA vai recarregar todos os dados atualizados.')) return
    // Apaga conversa e análise salva → vai regenerar tudo
    await Promise.all([
      fetch(`/api/ia/conversa?profissional_id=${profissionalId}`, { method: 'DELETE' }),
      fetch(`/api/ia/analise?profissional_id=${profissionalId}`, { method: 'DELETE' }),
    ])
    setMensagens([])
    setConversaId(undefined)
    setStatusAnalise('gerando')
    // Gera nova análise em background e inicia boas-vindas ao mesmo tempo
    gerarAnalise()
    await boasVindas()
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [mensagens])

  async function enviar() {
    const texto = input.trim()
    if (!texto || enviando) return

    const novasMensagens = [...mensagens, { role: 'user' as const, content: texto }]
    setMensagens(novasMensagens)
    setInput('')
    setEnviando(true)

    // Adiciona mensagem vazia da IA para streaming
    setMensagens(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: novasMensagens, profissional_id: profissionalId, conversa_id: conversaId }),
      })

      if (!res.ok || !res.body) {
        const d = await res.json()
        setMensagens(prev => [...prev.slice(0, -1), { role: 'assistant', content: ` Erro: ${d.error}` }])
        setEnviando(false)
        return
      }

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += dec.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const json = line.slice(5).trim()
          if (!json) continue
          try {
            const parsed = JSON.parse(json)
            if (parsed.token) {
              setMensagens(prev => {
                const last = prev[prev.length - 1]
                return [...prev.slice(0, -1), { ...last, content: last.content + parsed.token }]
              })
            }
            if (parsed.done && parsed.conversa_id) {
              setConversaId(parsed.conversa_id)
            }
          } catch {}
        }
      }
    } catch (e) {
      setMensagens(prev => [...prev.slice(0, -1), { role: 'assistant', content: ' Erro de conexão.' }])
    }

    setEnviando(false)
  }

  if (temApiKey === null || carregando) return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan"/></div>

  if (!temApiKey) return (
    <div className="text-center py-12">
      <span className="text-4xl"></span>
      <h3 className="font-syne font-bold text-[14px] mt-3 mb-2 text-nodri-t1">IA NODRI não configurada</h3>
      <p className="text-[12px] text-nodri-t3 mb-4">Configure sua API key da Anthropic para usar o chat de IA.</p>
      <a href="/salon/ia-config"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-nodri-cyan text-nodri-dark text-[12px] font-bold hover:brightness-110">
        ️ Configurar IA
      </a>
    </div>
  )

  return (
    <div className="flex flex-col h-[600px] bg-nodri-surface border border-nodri-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-nodri-border bg-nodri-card flex items-center gap-2">
        <span className="text-[14px]"></span>
        <span className="font-syne font-bold text-[12px] text-nodri-t1">IA NODRI</span>
        {statusAnalise === 'gerando' && (
          <span className="text-[9px] text-purple-400 animate-pulse flex items-center gap-1">
            <Loader2 size={9} className="animate-spin"/> Carregando dados...
          </span>
        )}
        {statusAnalise === 'pronta' && (
          <span className="text-[9px] text-green-400"> Dados carregados</span>
        )}
        <button
          onClick={novaConversa}
          className="ml-auto text-[10px] px-2.5 py-1 rounded-lg border border-nodri-border text-nodri-t3 hover:text-nodri-red hover:border-red-500/30 transition-colors"
          title="Nova conversa — recarrega dados atualizados">
          ️ Nova conversa
        </button>
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {mensagens.length === 0 && (
          <div className="text-center py-8 text-nodri-t3">
            <p className="text-[12px]">Olá! Pergunte sobre o desempenho deste profissional, feedbacks, metas ou qualquer dado do salão.</p>
          </div>
        )}
        {mensagens.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`rounded-2xl px-4 py-3 text-[12px] leading-relaxed ${
              m.role === 'user'
                ? 'max-w-[75%] bg-nodri-cyan text-nodri-dark font-medium rounded-br-md'
                : 'max-w-[92%] bg-nodri-card border border-nodri-border text-nodri-t1 rounded-bl-md'
            }`}>
              {m.role === 'assistant' ? (
                <div className="prose-ia" dangerouslySetInnerHTML={{ __html:
                  m.content
                    // Títulos com emoji
                    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                    .replace(/^#{1,3}\s+(.+)$/gm, '<div style="font-weight:700;font-size:13px;color:#00e5c8;margin:12px 0 6px;border-bottom:1px solid rgba(0,229,200,0.2);padding-bottom:4px">$1</div>')
                    // Linhas separadoras
                    .replace(/^={3,}.*={3,}$/gm, '<hr style="border-color:rgba(255,255,255,0.08);margin:10px 0"/>')
                    .replace(/^---+$/gm, '<hr style="border-color:rgba(255,255,255,0.08);margin:10px 0"/>')
                    // Tabelas markdown simples
                    .replace(/\|(.+)\|/g, (match) => {
                      if (match.includes('---')) return ''
                      const cols = match.split('|').filter(c => c.trim())
                      return '<div style="display:flex;gap:8px;margin:2px 0">' + cols.map(c => `<span style="flex:1;padding:3px 6px;background:rgba(255,255,255,0.04);border-radius:4px;font-size:11px">${c.trim()}</span>`).join('') + '</div>'
                    })
                    // Listas com bullets
                    .replace(/^[•\-\*]\s+(.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span style="color:#00e5c8;flex-shrink:0">•</span><span>$1</span></div>')
                    // Listas numeradas
                    .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display:flex;gap:6px;margin:3px 0"><span style="color:#7c5cfc;font-weight:700;flex-shrink:0">$1.</span><span>$2</span></div>')
                    // Emojis de seção como títulos
                    .replace(/^(||||||||||||)\s*(.+)$/gm, '<div style="font-weight:700;font-size:12px;color:#e2e8f0;margin:10px 0 4px">$1 $2</div>')
                    // Quebras de linha
                    .replace(/\n\n/g, '<div style="margin:6px 0"></div>')
                    .replace(/\n/g, '<br/>')
                }}/>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {enviando && (
          <div className="flex justify-start">
            <div className="bg-nodri-card border border-nodri-border rounded-2xl rounded-bl-md px-4 py-2.5">
              <Loader2 size={14} className="animate-spin text-nodri-t3"/>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-nodri-border bg-nodri-card flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
          placeholder="Digite sua pergunta..."
          className="flex-1 bg-nodri-surface border border-nodri-border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-nodri-cyan/40 text-nodri-t1"
        />
        <button
          onClick={enviar}
          disabled={enviando || !input.trim()}
          className="px-3 py-2 rounded-lg bg-nodri-cyan text-nodri-dark font-bold text-[12px] hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5">
          {enviando ? <Loader2 size={13} className="animate-spin"/> : ''}
        </button>
      </div>
    </div>
  )
}

export default function PerfilProfissionalPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }

  const [prof, setProf] = useState<Profissional | null>(null)
  const [form, setForm] = useState<Partial<Profissional>>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [tab, setTab] = useState<'cadastro'|'desempenho'|'faturamento'|'metas'|'ia'>('cadastro')
  const [servicosSalao, setServicosSalao] = useState<{id:string;categoria:string;nome:string;preco_fixo:number|null;preco_min:number|null;comissao_valor:number|null}[]>([])
  const [selectorAberto, setSelectorAberto] = useState(false)
  const selectorRef = useRef<HTMLDivElement>(null)

  const hoje = new Date()
  const mesAtual    = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`
  const mesAnterior = (() => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth()-1, 1)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })()

  const [modoFiltro, setModoFiltro] = useState<'simples'|'range'>('simples')
  const [p1i, setP1i] = useState(mesAnterior)
  const [p1f, setP1f] = useState(mesAnterior)
  const [p2i, setP2i] = useState(mesAtual)
  const [p2f, setP2f] = useState(mesAtual)
  const [metricas, setMetricas] = useState<DadosMetricas|null>(null)
  const [loadMet, setLoadMet] = useState(false)

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('nodri_prof_' + id)
      if (cached) {
        const d = JSON.parse(cached)
        setProf(d); setForm(d); setLoading(false)
      }
    } catch(_) {}
    // Sempre busca dados frescos do servidor, mesmo havendo cache (cache pode estar
    // desatualizado em relação a campos salvos depois, ex: servicos_habilitados)
    fetch(`/api/profissionais/${id}`)
      .then(r => r.json())
      .then(d => { if (d?.id) { setProf(d); setForm(d) }; setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetch('/api/servicos').then(r => r.json()).then(d => { if (Array.isArray(d)) setServicosSalao(d.filter((s:any) => s.ativo)) })
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) setSelectorAberto(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const buscarMetricas = useCallback(async () => {
    setLoadMet(true)
    const qs = new URLSearchParams({ p1_inicio: p1i, p1_fim: p1f, p2_inicio: p2i, p2_fim: p2f })
    const res = await fetch(`/api/profissionais/${id}/metricas?${qs}`)
    if (res.ok) setMetricas(await res.json())
    else toast.error('Erro ao buscar métricas')
    setLoadMet(false)
  }, [id, p1i, p1f, p2i, p2f])

  useEffect(() => {
    if (tab === 'desempenho' || tab === 'faturamento') buscarMetricas()
  }, [tab])

  // ── Metas ──
  const [metaInfo, setMetaInfo] = useState<{
    ano:number; mes:number; meta_redistribuida:number; meta_manual:number|null; meta_final:number
    realizado:number; faltam:number; dias_restantes:number; necessario_por_dia:number
    ticket_atual:number; ocupacao_atual:number; ticket_medio_historico:number; ocupacao_media_historico:number
    taxa_media_crescimento:number|null; principal_gargalo:string
    alcancabilidade: { probabilidade:number|null; label:string; cor:string; maior_historico:number; maior_historico_mes?:number|null; maior_historico_ano?:number|null }
    plano:any
  } | null>(null)
  const [loadMeta, setLoadMeta] = useState(false)
  const [metaManualInput, setMetaManualInput] = useState('')
  const [salvandoMeta, setSalvandoMeta] = useState(false)
  const [gerandoEstrategia, setGerandoEstrategia] = useState(false)
  const [salvandoEstrategia, setSalvandoEstrategia] = useState(false)
  const [rascunhoEstrategia, setRascunhoEstrategia] = useState<{ plano_texto:string; meta_referencia:number } | null>(null)

  const buscarMeta = useCallback(async () => {
    setLoadMeta(true)
    try {
      const res = await fetch(`/api/profissionais/${id}/metas`)
      if (res.ok) {
        const d = await res.json()
        setMetaInfo(d)
        setMetaManualInput(d.meta_manual != null ? String(d.meta_manual) : '')
      }
    } catch(_) {}
    setLoadMeta(false)
  }, [id])

  useEffect(() => {
    if (tab === 'metas') buscarMeta()
  }, [tab])

  async function salvarMetaManual() {
    if (!metaInfo) return
    setSalvandoMeta(true)
    try {
      const res = await fetch(`/api/profissionais/${id}/metas`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano: metaInfo.ano, mes: metaInfo.mes, meta_manual: metaManualInput })
      })
      if (res.ok) { toast.success('Meta atualizada!'); await buscarMeta() }
      else toast.error('Erro ao salvar meta')
    } catch { toast.error('Erro ao salvar meta') }
    setSalvandoMeta(false)
  }

  async function gerarEstrategia() {
    if (!metaInfo) return
    setGerandoEstrategia(true)
    setRascunhoEstrategia(null)
    try {
      const res = await fetch(`/api/profissionais/${id}/estrategia-meta`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano: metaInfo.ano, mes: metaInfo.mes })
      })
      const d = await res.json()
      if (res.ok) {
        setRascunhoEstrategia({ plano_texto: d.plano_texto, meta_referencia: d.meta_referencia })
        toast.success('Estratégia gerada! Revise e salve.')
      } else toast.error(d?.error || 'Erro ao gerar estratégia')
    } catch { toast.error('Erro ao gerar estratégia') }
    setGerandoEstrategia(false)
  }

  async function salvarEstrategia() {
    if (!metaInfo || !rascunhoEstrategia) return
    setSalvandoEstrategia(true)
    try {
      const res = await fetch(`/api/profissionais/${id}/estrategia-meta`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ano: metaInfo.ano, mes: metaInfo.mes, ...rascunhoEstrategia })
      })
      if (res.ok) {
        setRascunhoEstrategia(null)
        await buscarMeta()
        toast.success('Estratégia salva!')
      } else toast.error('Erro ao salvar estratégia')
    } catch { toast.error('Erro ao salvar estratégia') }
    setSalvandoEstrategia(false)
  }

  async function salvar() {
    setSalvando(true)
    const cleaned = Object.fromEntries(Object.entries(form).map(([k,v])=>[k, v==='' ? null : v]))
    const res = await fetch(`/api/profissionais/${id}`, {
      method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(cleaned)
    })
    setSalvando(false)
    if (res.ok) { const d = await res.json(); setProf(d); setForm(d); toast.success(' Salvo!') }
    else { const e = await res.json().catch(()=>({})); toast.error('Erro: ' + (e?.error || 'Falha ao salvar')) }
  }

  function set(key: keyof Profissional, value: any) { setForm(p=>({...p,[key]:value})) }

  if (loading) return <div className="min-h-screen bg-nodri-dark flex items-center justify-center"><Loader2 size={28} className="animate-spin text-nodri-cyan"/></div>
  if (!prof) return <div className="min-h-screen bg-nodri-dark flex items-center justify-center text-nodri-t3">Profissional não encontrado</div>

  const faltando = CHECKLIST.filter(c => c.obrig && !form[c.key])
  const checkOk  = CHECKLIST.filter(c => form[c.key]).length

  // Cor das ocorrências
  function corOcorrencia(tipo: string) {
    const t = tipo.toLowerCase()
    if (t.includes('atraso')) return '#ef4444'
    if (t.includes('falta')) return '#f59e0b'
    if (t.includes('positivo') || t.includes('gerente') || t.includes('feedback gerente')) return '#22c55e'
    if (t.includes('negou') || t.includes('reclamação')) return '#f43f8e'
    return '#7c5cfc'
  }

  // Usa dados do relatorio_periodos se disponíveis, senão usa prof_metricas_mensais
  const usarFat = (metricas?.fat_p1 || metricas?.fat_p2)
  const p1 = usarFat ? metricas?.fat_p1 : metricas?.p1
  const p2 = usarFat ? metricas?.fat_p2 : metricas?.p2
  const fidel = usarFat ? metricas?.fidelizacao_fat : metricas?.fidelizacao

  return (
    <div className="min-h-screen bg-nodri-dark">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3">
        <button onClick={()=>router.push('/salon/profissionais')}
          className="flex items-center gap-1.5 text-nodri-t2 hover:text-nodri-cyan transition-colors text-sm">
          <ArrowLeft size={15}/> Profissionais
        </button>
        <div className="w-px h-5 bg-nodri-border"/>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7c5cfc] to-[#f43f8e] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {(prof.apelido||prof.nome_completo).split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
        </div>
        <div>
          <h1 className="font-syne font-bold text-[13px] leading-tight">{prof.nome_completo}</h1>
          <p className="text-[10px] text-nodri-t3">{prof.cargo}</p>
        </div>
        {faltando.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-400">
            <AlertTriangle size={10}/> {faltando.length} campo(s) obrigatório(s)
          </div>
        )}
        {tab === 'cadastro' && !form.is_departamento && (
          <button onClick={salvar} disabled={salvando}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nodri-cyan text-nodri-dark text-[11px] font-bold hover:brightness-110 disabled:opacity-50">
            {salvando ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Salvar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-nodri-surface border-b border-nodri-border px-5 flex">
        {([
          ['cadastro',' Dados Cadastrais'],
          ['faturamento',' Faturamento'],
          ['desempenho',' Ocorrências'],
          ['metas',' Metas'],
          ['ia',' IA'],
        ] as const).map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-3 text-[12px] font-semibold border-b-2 transition-all
              ${tab===t ? 'border-nodri-cyan text-nodri-cyan' : 'border-transparent text-nodri-t3 hover:text-nodri-t2'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-5 py-6">

        {/*  CADASTRO  */}
        {tab === 'cadastro' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {/* Banner de departamento */}
              {form.is_departamento && (
                <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: (form.departamento_cor || '#7c5cfc') + '15', border: `1px solid ${form.departamento_cor || '#7c5cfc'}40` }}>
                  <div className="text-4xl">{form.nome_completo === 'ADMINISTRATIVO' ? '🗂️' : form.nome_completo === 'FINANCEIRO' ? '💰' : form.nome_completo === 'RECEPÇÃO' ? '🛎️' : '🏢'}</div>
                  <div>
                    <p className="font-syne font-bold text-[14px] text-nodri-t1">{form.nome_completo}</p>
                    <p className="text-[11px] text-nodri-t3 mt-0.5">Departamento virtual — gerencie pendências pela aba Pendências ao lado</p>
                  </div>
                </div>
              )}
              {!form.is_departamento && <>
                <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5 space-y-4">
                  <h2 className="font-syne font-bold text-[12px] text-nodri-cyan"> Dados Pessoais</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className={labelCls}>Nome Completo *</label><input value={form.nome_completo||''} onChange={e=>set('nome_completo',e.target.value)} className={inputCls}/></div>
                    <div><label className={labelCls}>Apelido</label><input value={form.apelido||''} onChange={e=>set('apelido',e.target.value)} className={inputCls}/></div>
                    <div><label className={labelCls}>Cargo / Categoria</label>
                      <select value={form.cargo||''} onChange={e=>set('cargo',e.target.value)} className={inputCls}>
                        {['Cabeleireiro','Manicure','Pedicure','Assistente','Massoterapeuta','Colorista','Maquiador(a)','Recepcionista'].map(c=>(
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div><label className={labelCls}>CPF</label><input value={form.cpf||''} onChange={e=>set('cpf',e.target.value)} placeholder="000.000.000-00" className={inputCls}/></div>
                    <div><label className={labelCls}>RG</label><input value={form.rg||''} onChange={e=>set('rg',e.target.value)} className={inputCls}/></div>
                    <div><label className={labelCls}>Data de Aniversário</label><input type="date" value={form.data_aniversario||''} onChange={e=>set('data_aniversario',e.target.value)} className={inputCls}/></div>
                    <div><label className={labelCls}>Email</label><input type="email" value={form.email||''} onChange={e=>set('email',e.target.value)} className={inputCls}/></div>
                    <div className="col-span-2"><label className={labelCls}>Endereço</label><input value={form.endereco||''} onChange={e=>set('endereco',e.target.value)} className={inputCls}/></div>
                    <div><label className={labelCls}>Contato do Responsável</label><input value={form.contato_responsavel||''} onChange={e=>set('contato_responsavel',e.target.value)} className={inputCls}/></div>
                    <div><label className={labelCls}>Habilidades (texto livre)</label><input value={form.habilidades||''} onChange={e=>set('habilidades',e.target.value)} className={inputCls}/></div>
                  </div>

                  {/* Seletor de Serviços Habilitados */}
                  <div className="mt-3">
                    <label className={labelCls}>Serviços que Realiza</label>
                    <div className="relative" ref={selectorRef}>
                      <button
                        type="button"
                        onClick={() => setSelectorAberto(o => !o)}
                        className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] text-left flex items-center justify-between outline-none focus:border-nodri-cyan/40 transition-colors text-nodri-t1"
                      >
                        <span className={form.servicos_habilitados?.length ? 'text-nodri-t1' : 'text-nodri-t3'}>
                          {form.servicos_habilitados?.length
                            ? `${form.servicos_habilitados.length} serviço(s) selecionado(s)`
                            : 'Clique para selecionar serviços...'}
                        </span>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${selectorAberto ? 'rotate-180' : ''}`}><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>

                      {selectorAberto && (
                        <div className="absolute z-50 mt-1 w-full bg-nodri-surface border border-nodri-border rounded-xl shadow-xl max-h-72 overflow-y-auto">
                          {(() => {
                            const cats = [...new Set(servicosSalao.map(s => s.categoria))].sort()
                            const selecionados = form.servicos_habilitados || []
                            return cats.map(cat => (
                              <div key={cat}>
                                <div className="px-3 py-1.5 text-[10px] font-bold text-nodri-t3 uppercase tracking-wider bg-nodri-bg/60 sticky top-0">{cat}</div>
                                {servicosSalao.filter(s => s.categoria === cat).map(s => {
                                  const marcado = selecionados.includes(s.id)
                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => {
                                        const novo = marcado
                                          ? selecionados.filter(x => x !== s.id)
                                          : [...selecionados, s.id]
                                        set('servicos_habilitados', novo as any)
                                      }}
                                      className={`w-full flex items-center justify-between px-3 py-2 text-[11px] hover:bg-nodri-card transition-colors ${marcado ? 'text-nodri-cyan' : 'text-nodri-t1'}`}
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${marcado ? 'bg-nodri-cyan border-nodri-cyan' : 'border-nodri-border'}`}>
                                          {marcado && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                                        </span>
                                        {s.nome}
                                      </span>
                                      {s.comissao_valor && (
                                        <span className="text-[10px] text-green-400 ml-2">R$ {Number(s.comissao_valor).toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            ))
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Tags dos selecionados */}
                    {(form.servicos_habilitados?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(form.servicos_habilitados || []).map(sid => {
                          const s = servicosSalao.find(x => x.id === sid)
                          if (!s) return null
                          return (
                            <span key={sid} className="flex items-center gap-1 bg-nodri-cyan/10 border border-nodri-cyan/30 text-nodri-cyan text-[10px] px-2 py-0.5 rounded-full">
                              {s.nome}
                              <button type="button" onClick={() => set('servicos_habilitados', (form.servicos_habilitados||[]).filter(x=>x!==sid) as any)} className="hover:text-white">×</button>
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5 space-y-3">
                  <h2 className="font-syne font-bold text-[12px] text-nodri-pink"> Perfil Pessoal</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[['cor_favorita','Cor Favorita'],['comida_favorita','Comida Favorita'],['animal_favorito','Animal Favorito'],['hobbies','Hobbies'],['um_sonho','Um Sonho']].map(([k,l])=>(
                      <div key={k} className={k==='hobbies'||k==='um_sonho'?'col-span-2':''}>
                        <label className={labelCls}>{l}</label>
                        <input value={(form as any)[k]||''} onChange={e=>set(k as any,e.target.value)} className={inputCls}/>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5 space-y-3">
                  <h2 className="font-syne font-bold text-[12px] text-nodri-amber"> Dados Profissionais</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>CNPJ *</label><input value={form.cnpj||''} onChange={e=>set('cnpj',e.target.value)} placeholder="00.000.000/0000-00" className={inputCls}/></div>
                    <div><label className={labelCls}>Dados Bancários</label><input value={form.conta_bancaria||''} onChange={e=>set('conta_bancaria',e.target.value)} placeholder="Banco / Ag / Conta" className={inputCls}/></div>
                  </div>
                </div>
              </>}
              {/* ── CHECKLIST DE ONBOARDING (só para não-departamentos) ── */}
              {!form.is_departamento && <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5 space-y-3">
                <h2 className="font-syne font-bold text-[12px] text-nodri-cyan"> Checklist de Onboarding</h2>
                {([
                  ['dados_pessoais_completo',      'Dados Pessoais completo?',       'dados completos',          'pendência de dados pessoais'],
                  ['perfil_pessoal_completo',       'Perfil Pessoal completo?',        'perfil completo',          'pendência de perfil pessoal'],
                  ['dados_profissionais_completo',  'Dados Profissionais completo?',   'dados completos',          'pendência de dados profissionais'],
                  ['tem_contrato',                  'Profissional possui contrato?',   'contrato assinado',        'pendência de contrato'],
                ] as [keyof typeof form, string, string, string][]).map(([key, label, okMsg, nokMsg]) => (
                  <div key={key} className={`rounded-xl p-3 flex items-center justify-between ${form[key] ? 'bg-green-900/20 border border-green-800/40' : 'bg-red-900/20 border border-red-800/40'}`}>
                    <div>
                      <p className="text-[12px] font-semibold text-nodri-t1">{label}</p>
                      <p className={`text-[11px] mt-0.5 ${form[key] ? 'text-green-400' : 'text-red-400'}`}>
                        {form[key] ? `Sim — ${okMsg}` : `Não — ${nokMsg}`}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer" onClick={()=>set(key, !form[key])}>
                      <div className={`w-10 h-5 rounded-full relative transition-all ${form[key] ? 'bg-green-500' : 'bg-red-700'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${form[key] ? 'left-5' : 'left-0.5'}`}/>
                      </div>
                      <span className={`text-[12px] font-bold ${form[key] ? 'text-green-400' : 'text-red-400'}`}>{form[key] ? 'SIM' : 'NÃO'}</span>
                    </label>
                  </div>
                ))}
              </div>}
              {!form.is_departamento && <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
                <h2 className="font-syne font-bold text-[12px] text-nodri-purple mb-3">️ Status</h2>
                <label className="flex items-center gap-3 cursor-pointer" onClick={()=>set('ativo',!form.ativo)}>
                  <div className={`w-10 h-5 rounded-full relative transition-all ${form.ativo?'bg-nodri-green':'bg-nodri-border'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${form.ativo?'left-5':'left-0.5'}`}/>
                  </div>
                  <span className="text-[12px] text-nodri-t1">{form.ativo?'Profissional Ativo':'Profissional Inativo'}</span>
                </label>
              </div>}
            </div>
            <div>
              <PendenciasLateral profissionalId={id}/>
            </div>
          </div>
        )}

        {/*  FATURAMENTO  */}
        {tab === 'faturamento' && (
          <div className="space-y-6">
            <FiltroComparacao {...{modoFiltro,setModoFiltro,p1i,setP1i,p1f,setP1f,p2i,setP2i,p2f,setP2f,onAplicar:buscarMetricas,loading:loadMet}}/>
            {loadMet && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan"/></div>}
            {metricas && !loadMet && <>
              {(p1 || p2) ? <>
                <div>
                  <p className="text-[11px] text-nodri-t3 uppercase tracking-widest mb-3 font-semibold">Comparativo P1 vs P2</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetCard label=" Faturamento"      atual={p2?.faturamento||0}              anterior={p1?.faturamento||0}              fmt="m"/>
                    <MetCard label="️ Ticket Médio"     atual={p2?.ticket_medio||0}             anterior={p1?.ticket_medio||0}             fmt="m"/>
                    <MetCard label=" Preferência"      atual={p2?.clientes_preferencia||0}     anterior={p1?.clientes_preferencia||0}/>
                    <MetCard label=" Sem Pref."        atual={p2?.clientes_sem_preferencia||0} anterior={p1?.clientes_sem_preferencia||0}/>
                    <MetCard label=" Dias Trabalhados" atual={p2?.dias_trabalhados||0}         anterior={p1?.dias_trabalhados||0}/>
                    <MetCard label=" Ocupação"         atual={p2?.taxa_ocupacao||0}            anterior={p1?.taxa_ocupacao||0}            fmt="p"/>
                    <MetCard label="️ Serviços"         atual={p2?.total_servicos||0}           anterior={p1?.total_servicos||0}/>
                    <MetCard label=" Produtos"         atual={p2?.total_produtos||0}           anterior={p1?.total_produtos||0}/>
                  </div>
                </div>
                {fidel && <BlocoFidelizacao f={fidel}/>}
                {/* Gráfico vertical com comparativo */}
                {metricas.historico_completo?.length > 0 && (
                  <GraficoFaturamento historico={metricas.historico_completo}/>
                )}
                <TabelaServicos p1={p1||null} p2={p2||null} nomeProfissional={prof?.apelido||prof?.nome_completo}/>
                {/* Eficiência */}
                {p1 && p2 && p2.dias_trabalhados > 0 && (
                  <BlocoEficiencia p1={p1} p2={p2}/>
                )}
                {/* Mix de Receita */}
                {metricas.mix_receita?.length > 0 && (
                  <BlocoMixReceita mix={metricas.mix_receita}/>
                )}
                {/* Clientes Novos vs Fiéis */}
                {metricas.historico_completo?.length > 0 && (
                  <BlocoClientesFidelizacao historico={metricas.historico_completo}/>
                )}
                {/* Projeção */}
                {metricas.projecao && (
                  <BlocoProjecao p={metricas.projecao}/>
                )}
                {/* Sazonalidade */}
                {metricas.sazonalidade?.length > 0 && (
                  <BlocoSazonalidade s={metricas.sazonalidade}/>
                )}
                {/* Score + Semáforo + Narrativa — no final do faturamento */}
                {metricas && !loadMet && (p1 || p2) && (
                  <BlocoDiagnosticoResumido prof={prof} form={form} metricas={metricas} p1={p1||null} p2={p2||null} fidel={fidel||null}/>
                )}
              </> : (
                <div className="text-center py-16 text-nodri-t3">
                  <BarChart2 size={40} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-[13px]">Nenhum dado de faturamento encontrado para este período.</p>
                  <p className="text-[11px] mt-1 opacity-60">Os dados vêm do módulo de Relatórios importado pelo programa complementar.</p>
                </div>
              )}
            </>}
          </div>
        )}

        {/*  PENDÊNCIAS  */}
        {/*  IA  */}
        {tab === 'ia' && (
          <ChatWidget profissionalId={id} modoEmbarcado={true} />
        )}

        {/*  METAS  */}
        {tab === 'metas' && (
          <div className="space-y-6 max-w-3xl">
            {loadMeta && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan"/></div>}
            {!loadMeta && metaInfo && (() => {
              const pct = metaInfo.meta_final > 0 ? Math.min((metaInfo.realizado / metaInfo.meta_final) * 100, 100) : 0
              return (
                <>
                  <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-syne font-bold text-[13px] text-nodri-cyan">Meta de {MESES[metaInfo.mes-1]}/{metaInfo.ano}</h2>
                      <span className="text-[11px] text-nodri-t3">{metaInfo.meta_manual != null ? 'Meta manual ativa' : 'Meta automática (redistribuição)'}</span>
                    </div>

                    <div>
                      <div className="flex items-end justify-between mb-1">
                        <span className="text-[20px] font-bold text-nodri-t1">{fmt$(metaInfo.realizado)}</span>
                        <span className="text-[12px] text-nodri-t3">meta: {fmt$(metaInfo.meta_final)}</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-nodri-border/40 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? '#22c55e' : 'linear-gradient(135deg, #7c5cfc, #00e5c8)' }} />
                      </div>
                      <p className="text-[11px] text-nodri-t3 mt-1">{pct.toFixed(0)}% da meta atingida</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-nodri-border/50">
                      <div>
                        <label className={labelCls}>Meta redistribuída (automática)</label>
                        <p className="text-[13px] text-nodri-t2 mt-1">{fmt$(metaInfo.meta_redistribuida)}</p>
                      </div>
                      <div>
                        <label className={labelCls}>Meta manual (opcional)</label>
                        <div className="flex gap-2 mt-1">
                          <input type="number" value={metaManualInput} onChange={e=>setMetaManualInput(e.target.value)}
                            placeholder="Deixe vazio para usar a automática" className={inputCls} />
                          <button onClick={salvarMetaManual} disabled={salvandoMeta}
                            className="px-3 py-2 rounded-lg bg-nodri-cyan text-nodri-dark text-[11px] font-bold hover:brightness-110 disabled:opacity-50 whitespace-nowrap">
                            {salvandoMeta ? <Loader2 size={12} className="animate-spin"/> : 'Salvar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Indicadores */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { l: 'Meta Mensal', v: fmt$(metaInfo.meta_final), cor: '#7c5cfc' },
                      { l: 'Realizado', v: fmt$(metaInfo.realizado), cor: '#22c55e' },
                      { l: 'Faltam', v: fmt$(metaInfo.faltam), cor: metaInfo.faltam > 0 ? '#f59e0b' : '#22c55e' },
                      { l: 'Dias Restantes', v: String(metaInfo.dias_restantes), cor: '#00e5c8' },
                      { l: 'Necessário/Dia', v: fmt$(metaInfo.necessario_por_dia), cor: '#f43f8e' },
                    ].map(item => (
                      <div key={item.l} className="bg-nodri-card border border-nodri-border rounded-xl p-3">
                        <div className="text-[9px] text-nodri-t3 uppercase tracking-wider mb-1">{item.l}</div>
                        <div className="font-syne font-bold text-[15px]" style={{ color: item.cor }}>{item.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Índice de alcançabilidade */}
                  <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
                    <h3 className="font-syne font-bold text-[12px] text-nodri-cyan mb-2">Meta Alcançável?</h3>
                    {metaInfo.alcancabilidade.probabilidade === null ? (
                      <p className="text-[12px] text-nodri-t3">{metaInfo.alcancabilidade.label}</p>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-semibold" style={{ color: metaInfo.alcancabilidade.cor }}>{metaInfo.alcancabilidade.label}</p>
                          <p className="text-[11px] text-nodri-t3 mt-0.5">
                            Maior faturamento histórico: {fmt$(metaInfo.alcancabilidade.maior_historico)}
                            {metaInfo.alcancabilidade.maior_historico_mes && metaInfo.alcancabilidade.maior_historico_ano && (
                              <span> ({MESES[metaInfo.alcancabilidade.maior_historico_mes - 1]}/{metaInfo.alcancabilidade.maior_historico_ano})</span>
                            )}
                          </p>
                        </div>
                        <div className="text-[22px] font-syne font-bold" style={{ color: metaInfo.alcancabilidade.cor }}>
                          {metaInfo.alcancabilidade.probabilidade}%
                        </div>
                      </div>
                    )}
                    {metaInfo.principal_gargalo && metaInfo.principal_gargalo !== 'nenhum gargalo crítico identificado' && (
                      <p className="text-[11px] text-nodri-t3 mt-3 pt-3 border-t border-nodri-border">
                        ⚠️ Principal gargalo: <span className="text-nodri-t2">{metaInfo.principal_gargalo}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={gerarEstrategia} disabled={gerandoEstrategia}
                      style={{ background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)' }}
                      className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-[12px] font-bold disabled:opacity-50">
                      {gerandoEstrategia ? <Loader2 size={14} className="animate-spin"/> : null}
                      {metaInfo.plano ? '🔄 Recalcular Estratégia' : '🚀 Criar Estratégia para Bater a Meta'}
                    </button>
                  </div>

                  {/* Rascunho recém-gerado, aguardando confirmação */}
                  {rascunhoEstrategia && (
                    <div className="bg-nodri-surface border border-nodri-cyan/40 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-syne font-bold text-[12px] text-nodri-cyan">Novo Planejamento (rascunho)</h3>
                        <button onClick={salvarEstrategia} disabled={salvandoEstrategia}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nodri-cyan text-nodri-dark text-[11px] font-bold hover:brightness-110 disabled:opacity-50">
                          {salvandoEstrategia ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
                          💾 Salvar Estratégia
                        </button>
                      </div>
                      <div className="text-[12px] text-nodri-t2 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderPlanoHtml(rascunhoEstrategia.plano_texto) }}/>
                    </div>
                  )}

                  {/* Plano salvo (oficial) */}
                  {!rascunhoEstrategia && metaInfo.plano?.plano_texto && (
                    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
                      <h3 className="font-syne font-bold text-[12px] text-nodri-cyan mb-3">Planejamento Estratégico (salvo)</h3>
                      <div className="text-[12px] text-nodri-t2 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderPlanoHtml(metaInfo.plano.plano_texto) }}/>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {/*  OCORRÊNCIAS (antigo Desempenho)  */}
        {tab === 'desempenho' && (
          <div className="space-y-6">
            <FiltroComparacao {...{modoFiltro,setModoFiltro,p1i,setP1i,p1f,setP1f,p2i,setP2i,p2f,setP2f,onAplicar:buscarMetricas,loading:loadMet}}/>
            {loadMet && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan"/></div>}
            {metricas && !loadMet && <>

              {/* Resumo de feedbacks no período */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { l: 'Total P1', v: metricas.feedbacks_p1_total, cor: '#7c5cfc' },
                  { l: 'Total P2', v: metricas.feedbacks_p2_total, cor: '#00e5c8' },
                  { l: 'Variação', v: null, cor: metricas.feedbacks_p2_total <= metricas.feedbacks_p1_total ? '#22c55e' : '#ef4444',
                    txt: metricas.feedbacks_p1_total > 0
                      ? (((metricas.feedbacks_p2_total-metricas.feedbacks_p1_total)/metricas.feedbacks_p1_total)*100).toFixed(1)+'%'
                      : '—' },
                ].map(item=>(
                  <div key={item.l} className="bg-nodri-card border border-nodri-border rounded-xl p-4">
                    <div className="text-[9px] text-nodri-t3 uppercase tracking-wider mb-1">{item.l}</div>
                    <div className="font-syne font-bold text-[22px]" style={{color:item.cor}}>
                      {item.v !== null ? item.v : item.txt}
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparativo de ocorrências P1 vs P2 */}
              {metricas.ocorrencias_comparativo.length > 0 && (
                <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
                  <h3 className="font-syne font-bold text-[13px] mb-4">
                     Comparativo de Ocorrências — P1 vs P2
                    <span className="ml-2 text-[10px] text-nodri-t3 font-normal">por período selecionado</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-nodri-border">
                          <th className="py-2 text-left text-nodri-t3 font-semibold">Ocorrência</th>
                          <th className="py-2 text-center text-nodri-t3 font-semibold">P1 Qtd</th>
                          <th className="py-2 text-center text-nodri-t3 font-semibold">P2 Qtd</th>
                          <th className="py-2 text-center text-nodri-t3 font-semibold">Variação</th>
                          <th className="py-2 text-center text-nodri-t3 font-semibold">P1 %</th>
                          <th className="py-2 text-center text-nodri-t3 font-semibold">P2 %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricas.ocorrencias_comparativo.map(o => {
                          const cor = corOcorrencia(o.tipo)
                          const totalP1 = metricas.feedbacks_p1_total || 1
                          const totalP2 = metricas.feedbacks_p2_total || 1
                          const pctP1 = totalP1 > 0 ? ((o.p1/totalP1)*100).toFixed(1) : '0.0'
                          const pctP2 = totalP2 > 0 ? ((o.p2/totalP2)*100).toFixed(1) : '0.0'
                          const melhorou = o.variacao !== null && o.variacao <= 0
                          return (
                            <tr key={o.tipo} className="border-b border-nodri-border/40 hover:bg-nodri-card/30">
                              <td className="py-2 font-medium" style={{color:cor}}>
                                <span className="inline-block w-2 h-2 rounded-full mr-2" style={{background:cor}}/>
                                {o.tipo}
                              </td>
                              <td className="py-2 text-center text-nodri-t2 font-semibold">{o.p1||'–'}</td>
                              <td className="py-2 text-center text-nodri-t1 font-bold">{o.p2||'–'}</td>
                              <td className="py-2 text-center">
                                {o.variacao !== null ? (
                                  <span className={`font-bold flex items-center justify-center gap-0.5 ${melhorou?'text-nodri-green':'text-nodri-red'}`}>
                                    {o.variacao >= 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                                    {(o.variacao >= 0 ? '+' : '') + o.variacao}%
                                  </span>
                                ) : (o.p1===0&&o.p2>0 ? <span className="text-nodri-red font-bold">NOVO</span> : '—')}
                              </td>
                              <td className="py-2 text-center text-nodri-t3">{pctP1}%</td>
                              <td className="py-2 text-center text-nodri-t3">{pctP2}%</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Feed de feedbacks filtrado */}
              {metricas.feedbacks.length > 0 && (
                <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
                  <h3 className="font-syne font-bold text-[13px] mb-4">
                    <MessageSquare size={13} className="inline mr-2 text-nodri-purple"/>
                    Feedbacks no Período
                    <span className="ml-2 text-[10px] text-nodri-t3 font-normal">{metricas.feedbacks.length} registros</span>
                  </h3>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {metricas.feedbacks.map(fb=>{
                      const pos = fb.tipo==='positivo'
                      return (
                        <div key={fb.id} className="rounded-xl p-3 border" style={{
                          background: pos?'rgba(34,197,94,0.06)':'rgba(239,68,68,0.06)',
                          borderColor: pos?'rgba(34,197,94,0.2)':'rgba(239,68,68,0.2)'
                        }}>
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pos?'text-nodri-green bg-nodri-green/10':'text-nodri-red bg-nodri-red/10'}`}>
                              {pos?' POSITIVO':' NEGATIVO'}
                            </span>
                            <span className="text-[10px] text-nodri-amber font-semibold"> {fb.ocorrido_descricao}</span>
                            <span className="ml-auto text-[9px] text-nodri-t3">
                              {new Date(fb.criado_em).toLocaleDateString('pt-BR')} {new Date(fb.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                            </span>
                          </div>
                          {fb.descricao && <p className="text-[11px] text-nodri-t2 italic leading-relaxed">"{fb.descricao}"</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {metricas.feedbacks.length === 0 && (
                <div className="text-center py-16 text-nodri-t3">
                  <MessageSquare size={40} className="mx-auto mb-3 opacity-30"/>
                  <p className="text-[13px]">Nenhuma ocorrência registrada nos períodos selecionados.</p>
                </div>
              )}
            </>}
          </div>
        )}
      </div>
    </div>
  )
}
