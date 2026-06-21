'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2, TrendingUp, TrendingDown, BarChart2,
  MessageSquare, CheckSquare, Square, AlertTriangle } from 'lucide-react'
import ChatWidget from '@/components/salon/ChatWidget'
import toast from 'react-hot-toast'

// Converte o markdown gerado pela IA num HTML estilizado (títulos, negrito real,
// tabelas, listas e badges de status) — reaproveitado no chat e na Estratégia de Meta.
function imprimirEstrategia(planoTexto: string, nomeProf: string) {
  const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const hoje = new Date()
  const dataStr = `${hoje.getDate()} de ${MESES_PT[hoje.getMonth()]} de ${hoje.getFullYear()}`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Planejamento Estratégico — ${nomeProf}</title>
<style>
  @page { size: A4; margin: 18mm 16mm 20mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #1a1a2e; line-height: 1.55; background: #fff; }

  /* Cabeçalho */
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #5b4fcf; padding-bottom: 10px; margin-bottom: 16px; }
  .header-brand { font-size: 18pt; font-weight: 900; color: #5b4fcf; letter-spacing: -0.5px; }
  .header-brand span { color: #5b4fcf; }
  .header-meta { text-align: right; font-size: 8.5pt; color: #555; line-height: 1.4; }
  .header-meta strong { display: block; font-size: 10pt; color: #1a1a2e; }

  /* Seções */
  .section { margin-bottom: 14px; break-inside: avoid; }
  h1, h2, h3 { font-weight: 800; color: #1a1a2e; }
  h1 { font-size: 13pt; border-bottom: 2px solid #5b4fcf; padding-bottom: 5px; margin-bottom: 10px; color: #5b4fcf; }
  h2 { font-size: 11pt; background: linear-gradient(90deg,#f3f0ff,transparent); padding: 4px 8px; border-left: 4px solid #5b4fcf; margin: 12px 0 6px; color: #3d2070; }
  h3 { font-size: 10pt; color: #3d2070; margin: 8px 0 4px; }

  /* Tabelas */
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 6px 0 10px; }
  th { background: #5b4fcf; color: #fff; padding: 5px 8px; text-align: left; font-weight: 700; font-size: 9pt; }
  td { padding: 4px 8px; border-bottom: 1px solid #e8e8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8f7ff; }
  tr:last-child td { border-bottom: none; }

  /* Bullets e listas */
  ul, ol { padding-left: 18px; margin: 4px 0 8px; }
  li { margin-bottom: 3px; }
  .bullet-cyan::before { content: "●"; color: #5b4fcf; margin-right: 6px; font-size: 8pt; }
  .bullet-red::before { content: "🔴"; margin-right: 4px; }
  .bullet-check::before { content: "□"; margin-right: 6px; font-size: 11pt; color: #555; }

  /* Negrito e destaques */
  strong { font-weight: 700; color: #1a1a2e; }
  .highlight-box { background: #f3f0ff; border: 1px solid #c4b5fd; border-radius: 6px; padding: 8px 12px; margin: 6px 0; }
  .alert-box { background: #fff5f5; border-left: 4px solid #ef4444; padding: 6px 10px; margin: 4px 0; border-radius: 0 4px 4px 0; }
  .success-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 6px 10px; margin: 4px 0; border-radius: 0 4px 4px 0; }
  .insight-box { background: linear-gradient(135deg,#f3f0ff,#e0f7f4); border: 2px solid #5b4fcf; border-radius: 8px; padding: 10px 14px; margin: 12px 0; font-style: italic; font-weight: 600; color: #3d2070; font-size: 10.5pt; }

  /* Rodapé e assinatura */
  .footer { margin-top: 28px; border-top: 2px solid #e8e8f0; padding-top: 18px; }
  .signature-area { display: flex; gap: 32px; margin-top: 10px; }
  .signature-block { flex: 1; }
  .signature-line { border-bottom: 1.5px solid #555; margin-bottom: 5px; height: 32px; }
  .signature-label { font-size: 8.5pt; color: #555; text-align: center; }
  .footer-note { font-size: 7.5pt; color: #999; text-align: center; margin-top: 14px; }

  /* Emoji-títulos inline */
  .emoji-title { font-weight: 700; font-size: 10pt; color: #3d2070; margin: 8px 0 4px; display: block; }
  .pos-tag { display: inline-block; background: #dcfce7; color: #166534; border-radius: 4px; padding: 1px 6px; font-size: 8pt; font-weight: 700; margin-left: 4px; }
  .neg-tag { display: inline-block; background: #fee2e2; color: #991b1b; border-radius: 4px; padding: 1px 6px; font-size: 8pt; font-weight: 700; margin-left: 4px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-brand">NOD<span>RI</span></div>
  <div class="header-meta">
    <strong>Planejamento Estratégico de Meta</strong>
    ${nomeProf}<br>
    Emitido em ${dataStr}<br>
    <span style="color:#5b4fcf;font-weight:700">NODRI IA — Documento Confidencial</span>
  </div>
</div>

<div id="conteudo">
${renderParaImpressao(planoTexto)}
</div>

<div class="footer">
  <div class="signature-area">
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-label">Assinatura do Profissional<br><strong>${nomeProf}</strong></div>
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-label">Assinatura do Gestor / Responsável<br>&nbsp;</div>
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <div class="signature-label">Data de Ciência<br>${dataStr}</div>
    </div>
  </div>
  <div class="footer-note">Este documento foi gerado automaticamente pela NODRI IA com base nos dados operacionais do salão. Os valores de comissão são estimativas baseadas no histórico registrado no sistema.</div>
</div>

<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`

  // Usa iframe oculto para evitar bloqueio de popup do navegador
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px;top:-9999px;'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) { document.body.removeChild(iframe); return }
  doc.open(); doc.write(html); doc.close()
  setTimeout(() => {
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }, 400)
}

// Versão de renderização específica para impressão (HTML mais semântico, sem cores neon)
function renderParaImpressao(texto: string): string {
  const linhas = texto.split('\n')
  const out: string[] = []
  let dentroTabela = false
  let linhasTabela: string[] = []

  const flushTabela = () => {
    if (linhasTabela.length === 0) return
    const validas = linhasTabela.filter(l => !/^\s*\|?\s*-{2,}/.test(l.replace(/\|/g, '')))
    const rows = validas.map(l => l.split('|').map(c => c.trim()).filter((_, i, arr) => !(i === 0 && arr[0] === '') && !(i === arr.length - 1 && arr[arr.length - 1] === '')))
    if (rows.length > 0) {
      const [head, ...body] = rows
      out.push('<table>')
      out.push('<thead><tr>' + head.map(c => `<th>${c}</th>`).join('') + '</tr></thead>')
      out.push('<tbody>' + body.map(r => '<tr>' + r.map(c => `<td>${applyInline(c)}</td>`).join('') + '</tr>').join('') + '</tbody>')
      out.push('</table>')
    }
    linhasTabela = []; dentroTabela = false
  }

  const applyInline = (t: string) => t
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  for (const raw of linhas) {
    const linha = raw.trimEnd()
    if (/^\s*\|.*\|\s*$/.test(linha)) { dentroTabela = true; linhasTabela.push(linha); continue }
    if (dentroTabela) flushTabela()
    if (!linha.trim()) { out.push('<div style="margin:5px 0"></div>'); continue }

    // Títulos com #
    const hMatch = linha.match(/^(#{1,3})\s+(.+)$/)
    if (hMatch) {
      const nivel = hMatch[1].length
      const txt = applyInline(hMatch[2])
      out.push(`<h${nivel} class="section">${txt}</h${nivel}>`)
      continue
    }

    // Checklist □
    if (/^□\s/.test(linha)) {
      out.push(`<div style="margin:3px 0"><span class="bullet-check"></span>${applyInline(linha.replace(/^□\s/, ''))}</div>`)
      continue
    }

    // Bullets 🔴
    if (/^🔴/.test(linha)) {
      out.push(`<div class="alert-box">${applyInline(linha.replace(/^🔴\s*/, ''))}</div>`)
      continue
    }

    // ✅
    if (/^✅/.test(linha)) {
      out.push(`<div class="success-box">${applyInline(linha.replace(/^✅\s*/, ''))}</div>`)
      continue
    }

    // Insight NODRI
    if (/^🤖/.test(linha)) {
      out.push(`<div class="insight-box">${applyInline(linha)}</div>`)
      continue
    }

    // Bullets •, -, *
    if (/^[•\-\*]\s+/.test(linha) || /^\d+\.\s/.test(linha)) {
      const isNum = /^\d+\./.test(linha)
      const content = applyInline(linha.replace(/^[•\-\*\d\.]\s+/, ''))
      out.push(`<div style="display:flex;gap:6px;margin:2px 0 2px 8px"><span style="color:#5b4fcf;flex-shrink:0">${isNum ? linha.match(/^(\d+)/)?.[1]+'.' : '•'}</span><span>${content}</span></div>`)
      continue
    }

    // Linha emoji-título curta (⚠️, 📍, etc.)
    if (/^(⚠️|📍|📌|📊|📅|💰|💎|🧠|⚡|🔮|🛒|👥|❤️|✂️|🎯|🏆|👔|💸|❤|📋|📱|🚀)/.test(linha) && linha.length < 80) {
      out.push(`<span class="emoji-title">${applyInline(linha)}</span>`)
      continue
    }

    out.push(`<div style="margin:2px 0">${applyInline(linha)}</div>`)
  }
  if (dentroTabela) flushTabela()
  return out.join('\n')
}

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
      out.push('<thead><tr>' + head.map(c => `<th style="text-align:left;padding:6px 8px;color:#5b4fcf;border-bottom:1px solid rgba(0,229,200,0.25)">${c}</th>`).join('') + '</tr></thead>')
      out.push('<tbody>' + body.map(r => '<tr>' + r.map(c => `<td style="padding:6px 8px;border-bottom:1px solid #f5f4f0">${c}</td>`).join('') + '</tr>').join('') + '</tbody>')
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
      .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#3a3835">$1</strong>')
      .replace(/^[•\-]\s+(.+)$/, '$1')

    // Títulos ## / ###
    const tituloMatch = linha.match(/^(#{1,3})\s+(.+)$/)
    if (tituloMatch) {
      const nivel = tituloMatch[1].length
      const texto2 = tituloMatch[2].replace(/\*\*([^*]+)\*\*/g, '$1')
      if (nivel === 1) {
        out.push(`<div style="font-weight:800;font-size:15px;color:#fff;margin:14px 0 8px;padding-bottom:6px;border-bottom:2px solid rgba(0,229,200,0.35)">${texto2}</div>`)
      } else {
        out.push(`<div style="font-weight:700;font-size:13px;color:#5b4fcf;margin:12px 0 6px">${texto2}</div>`)
      }
      continue
    }

    // Linhas com status (✅ / ⚠️ / 🔴 / 🟢) tratadas como mini-título
    if (/^(✅|⚠️|🔴|🟢|🟡|🔵|🏆|💎|🧠|⚡|🔮|🚨|📌|📊|📅|📍|👔|🤖)\s*[A-ZÀ-Ú]/.test(linha) && linha.length < 60) {
      out.push(`<div style="font-weight:700;font-size:12px;color:#1a1a1a;margin:8px 0 4px">${l}</div>`)
      continue
    }

    // Linhas numeradas
    const numMatch = linha.match(/^(\d+)[️⃣.]\s*(.+)$/) || linha.match(/^(\d+)\.\s+(.+)$/)
    if (numMatch) {
      out.push(`<div style="display:flex;gap:6px;margin:3px 0"><span style="color:#5b4fcf;font-weight:700;flex-shrink:0">${numMatch[1]}.</span><span>${numMatch[2].replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#3a3835">$1</strong>')}</span></div>`)
      continue
    }

    // Bullets
    if (/^[•\-\*]\s+/.test(linha)) {
      out.push(`<div style="display:flex;gap:6px;margin:2px 0"><span style="color:#5b4fcf;flex-shrink:0">•</span><span>${l}</span></div>`)
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
        <div className="px-5 py-3 flex items-center justify-between" style={{background:'#e0ddf5'}}>
          <h3 className="font-syne font-bold text-[13px] text-white">
             SERVIÇOS REALIZADOS{nomeProfissional ? ` POR ${nomeProfissional.toUpperCase()}` : ''}
          </h3>
          <span className="text-[11px] text-white/70">{sorted.length} serviços</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{background:'#f0eeff'}}>
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
                    <td className="py-2.5 px-4 text-center font-bold" style={{color: q2>0?'#1a1a1a':'#767069'}}>{q2||'–'}</td>
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
  const corGeral = !scoreGeral ? '#767069' : scoreGeral>=70?'#22c55e':scoreGeral>=45?'#f59e0b':'#ef4444'
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
      <div className="rounded-2xl p-6 border" style={{background:'#ffffff', borderColor:`${corGeral}88`}}>
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
            {[{l:'Positivas',v:ocPos,c:'#22c55e'},{l:'Negativas',v:ocNeg,c:'#ef4444'},{l:'Total',v:metricas.feedbacks.length,c:'#5b4fcf'}].map(item=>(
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

//  Gráfico anual igual ao do salão — com seletor de anos, tendência e banda de desvio padrão
const CORES_GRAF = ['#5b4fcf','#f43f8e','#f59e0b','#10b981','#3b82f6','#a855f7']
const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function GraficoFaturamento({ historico }: { historico: HistoricoItem[] }) {
  const [anosAtivos, setAnosAtivos] = useState<number[]>([])
  if (!historico.length) return null

  const anosDisp = Array.from(new Set(historico.map(h => h.ano))).sort((a,b) => b-a)
  const anosGraf = anosAtivos.length ? anosAtivos : anosDisp.slice(0,2)

  const fatMes = (ano:number, mes:number) => {
    const h = historico.find(x => x.ano===ano && x.mes===mes)
    return h?.faturamento || 0
  }

  const series = anosGraf.map((ano,ci) => ({
    ano, cor: CORES_GRAF[ci % CORES_GRAF.length],
    pts: Array.from({length:12},(_,i) => ({ mes:i+1, fat: fatMes(ano,i+1) }))
  }))

  const allVals = series.flatMap(s => s.pts.map(p => p.fat)).filter(v => v>0)
  if (!allVals.length) return null

  const W=760, H=260, PL=60, PR=24, PT=28, PB=44
  const cW = (W-PL-PR)/12
  const nS = series.length
  const bW = Math.min(20, (cW*0.85)/nS)
  const maxF = Math.max(...allVals) * 1.1
  const yOf = (f:number) => PT + (1 - f/maxF) * (H-PT-PB)
  const xMes = (mes:number) => PL + ((mes-1)+0.5)*cW

  function linReg(pts: {mes:number;fat:number}[]) {
    const v = pts.filter(p=>p.fat>0)
    if (v.length<2) return null
    const n=v.length, sx=v.reduce((a,p)=>a+p.mes,0), sy=v.reduce((a,p)=>a+p.fat,0)
    const sxy=v.reduce((a,p)=>a+p.mes*p.fat,0), sx2=v.reduce((a,p)=>a+p.mes*p.mes,0)
    const m=(n*sxy-sx*sy)/(n*sx2-sx*sx), b=(sy-m*sx)/n
    return (x:number)=>m*x+b
  }

  const media = allVals.reduce((a,v)=>a+v,0)/allVals.length
  const dp = Math.sqrt(allVals.reduce((a,v)=>a+(v-media)**2,0)/allVals.length)
  const bandTop = yOf(Math.min(media+dp, maxF))
  const bandBot = yOf(Math.max(media-dp, 0))
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth()+1
  const fmt$ = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

  return (
    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="font-syne font-bold text-[13px] text-nodri-t1 mb-1">Faturamento por Mês — Comparativo Anual</h3>
          <div className="flex flex-wrap gap-3 text-[9px] text-nodri-t3">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-1 rounded" style={{background:'#5b4fcf'}}/> Barras = faturamento real</span>
            <span className="flex items-center gap-1"><svg width="14" height="8"><line x1="0" y1="4" x2="14" y2="4" stroke="#5b4fcf" strokeWidth="1.5" strokeDasharray="4 2"/></svg> Tendência</span>
            <span className="flex items-center gap-1"><svg width="14" height="8"><line x1="0" y1="4" x2="14" y2="4" stroke="#767069" strokeWidth="1" strokeDasharray="3 2"/></svg> Média geral (μ)</span>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {anosDisp.map(ano => {
            const ativo = anosGraf.includes(ano)
            const ci = anosGraf.indexOf(ano)
            const cor = CORES_GRAF[ci%CORES_GRAF.length]
            return (
              <button key={ano} type="button"
                onClick={() => setAnosAtivos(ativo ? anosGraf.filter(a=>a!==ano) : [...anosGraf,ano].slice(-4))}
                style={{padding:'3px 10px',borderRadius:6,border:`1px solid ${ativo?cor:'#e0ddd8'}`,fontSize:11,fontWeight:700,cursor:'pointer',background:ativo?cor+'22':'#f5f4f0',color:ativo?cor:'#6b6860',transition:'all .15s'}}>
                {ano}{ano===anoAtual?' (atual)':''}
              </button>
            )
          })}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',minWidth:480,display:'block'}}>
          <defs>
            {series.map(s=>(
              <linearGradient key={s.ano} id={`gfp${s.ano}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.cor} stopOpacity="0.9"/>
                <stop offset="100%" stopColor={s.cor} stopOpacity="0.35"/>
              </linearGradient>
            ))}
          </defs>
          {/* grade */}
          {[0,0.25,0.5,0.75,1].map(t=>{
            const y=PT+t*(H-PT-PB), v=maxF*(1-t)
            return <g key={t}>
              <line x1={PL} y1={y} x2={W-PR} y2={y} stroke="#e8e6e0" strokeWidth={1}/>
              <text x={PL-5} y={y+4} textAnchor="end" fill="#767069" fontSize={9}>{v>=1000?(v/1000).toFixed(0)+'k':v.toFixed(0)}</text>
            </g>
          })}
          {/* banda DP */}
          <rect x={PL} y={bandTop} width={W-PL-PR} height={Math.max(0,bandBot-bandTop)} fill="#e8e6e0" fillOpacity={0.4} rx={2}/>
          {/* linha média */}
          <line x1={PL} y1={yOf(media)} x2={W-PR} y2={yOf(media)} stroke="#767069" strokeWidth={1} strokeDasharray="4 3" opacity={0.6}/>
          <text x={W-PR+2} y={yOf(media)+4} fill="#767069" fontSize={8}>μ {(media/1000).toFixed(0)}k</text>
          {/* meses */}
          {Array.from({length:12},(_,i)=>{
            const mes=i+1, x=xMes(mes)
            const isDest=mes===mesAtual
            return <g key={mes}>
              {isDest&&<rect x={x-cW/2} y={PT} width={cW} height={H-PT-PB} fill="#5b4fcf" fillOpacity={0.04} rx={2}/>}
              <text x={x} y={H-PB+14} textAnchor="middle" fill={isDest?'#1a1a1a':'#767069'} fontSize={9} fontWeight={isDest?700:400}>{MESES_ABREV[mes-1]}</text>
            </g>
          })}
          {/* séries */}
          {series.map((s,si)=>{
            const reg=linReg(s.pts)
            const validPts=s.pts.filter(p=>p.fat>0)
            const trendPts=reg&&validPts.length>=2?validPts.map(p=>({mes:p.mes,y:yOf(Math.max(0,reg(p.mes)))})):null
            return <g key={s.ano}>
              {s.pts.map(p=>{
                if(!p.fat) return null
                const cx=xMes(p.mes)
                const offset=(si-(nS-1)/2)*(bW+2)
                const bx=cx+offset-bW/2
                const by=yOf(p.fat), bh=H-PB-by
                const isAtual=p.mes===mesAtual&&s.ano===anoAtual
                const anoComp=series.find(x=>x.ano!==s.ano)
                const fatComp=anoComp?.pts.find(x=>x.mes===p.mes)?.fat||0
                const pct=fatComp>0?((p.fat-fatComp)/fatComp)*100:null
                return <g key={p.mes}>
                  <rect x={bx} y={by} width={bW} height={bh} fill={`url(#gfp${s.ano})`} rx={3}/>
                  {bh>16&&<text x={bx+bW/2} y={by-3} textAnchor="middle" fill={s.cor} fontSize={8} fontWeight={600} opacity={0.9}>{(p.fat/1000).toFixed(0)}k</text>}
                  {isAtual&&<rect x={bx-1} y={by-1} width={bW+2} height={bh+1} fill="none" stroke={s.cor} strokeWidth={1.5} rx={3}/>}
                  {isAtual&&pct!==null&&<text x={bx+bW/2} y={by-(bh>16?18:6)} textAnchor="middle" fill={pct>=0?'#10b981':'#ef4444'} fontSize={8} fontWeight={700}>{pct>=0?'+':''}{pct.toFixed(0)}%</text>}
                </g>
              })}
              {trendPts&&trendPts.length>=2&&(
                <polyline points={trendPts.map(p=>`${xMes(p.mes)},${p.y}`).join(' ')} fill="none" stroke={s.cor} strokeWidth={1.5} strokeDasharray="6 3" opacity={0.75} strokeLinejoin="round" strokeLinecap="round"/>
              )}
            </g>
          })}
        </svg>
      </div>

      {/* Stats por ano */}
      <div className="flex flex-wrap gap-3 mt-4">
        {series.map(s=>{
          const vals=s.pts.filter(p=>p.fat>0).map(p=>p.fat)
          const total=vals.reduce((a,v)=>a+v,0)
          const med=vals.length?total/vals.length:0
          return (
            <div key={s.ano} className="rounded-xl p-3" style={{background:'#f8f7f5',border:`1px solid ${s.cor}30`,minWidth:150}}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{background:s.cor}}/>
                <span className="text-[12px] font-bold" style={{color:s.cor}}>{s.ano}{s.ano===anoAtual?' (atual)':''}</span>
              </div>
              <div className="text-[9px] text-nodri-t3 space-y-0.5">
                <div>Total: <span className="text-nodri-t1 font-semibold">{fmt$(total)}</span></div>
                <div>Média/mês: <span className="text-nodri-t1">{fmt$(med)}</span></div>
                <div>Meses c/ dados: <span className="text-nodri-t1">{vals.length}/12</span></div>
              </div>
            </div>
          )
        })}
        <div className="rounded-xl p-3" style={{background:'#f8f7f5',border:'1px solid #e8e6e0',minWidth:150}}>
          <div className="text-[9px] font-bold text-nodri-t3 uppercase mb-2">Todos os Anos</div>
          <div className="text-[9px] text-nodri-t3 space-y-0.5">
            <div>Média global: <span className="text-nodri-t1 font-semibold">{fmt$(media)}</span></div>
            <div>DP: <span style={{color:'#b45309'}}>{fmt$(dp)}</span></div>
            <div style={{fontSize:'8px'}}>Faixa normal: {fmt$(Math.max(0,media-dp))} – {fmt$(media+dp)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Gráfico SVG comparativo anual para aba Dependência
function GraficoDependencia({ historico, onAnosChange }: { historico: Array<{ano:number;mes:number;fat_prof:number;fat_total:number;pct:number}>; onAnosChange?: (anos: number[]) => void }) {
  const [anosAtivos, setAnosAtivos] = useState<number[]>([])
  function toggleAno(ano: number, atual: number[]) {
    const next = atual.includes(ano) ? atual.filter(a=>a!==ano) : [...atual, ano].slice(-4)
    setAnosAtivos(next)
    onAnosChange?.(next)
  }
  if (!historico?.length) return null

  const anosDisp = Array.from(new Set(historico.map(h => h.ano))).sort((a,b) => b-a)
  const anosGraf = anosAtivos.length ? anosAtivos : anosDisp.slice(0,2)

  const getVal = (ano:number, mes:number) => historico.find(x => x.ano===ano && x.mes===mes)?.fat_prof || 0

  const series = anosGraf.map((ano,ci) => ({
    ano, cor: CORES_GRAF[ci % CORES_GRAF.length],
    pts: Array.from({length:12},(_,i) => ({ mes:i+1, fat: getVal(ano,i+1) }))
  }))

  const allVals = series.flatMap(s => s.pts.map(p => p.fat)).filter(v => v>0)
  if (!allVals.length) return null

  const W=760, H=260, PL=60, PR=24, PT=28, PB=44
  const cW = (W-PL-PR)/12
  const nS = series.length
  const bW = Math.min(20, (cW*0.85)/nS)
  const maxF = Math.max(...allVals) * 1.1
  const yOf = (f:number) => PT + (1 - f/maxF) * (H-PT-PB)
  const xMes = (mes:number) => PL + ((mes-1)+0.5)*cW

  function linReg(pts: {mes:number;fat:number}[]) {
    const v = pts.filter(p=>p.fat>0)
    if (v.length<2) return null
    const n=v.length, sx=v.reduce((a,p)=>a+p.mes,0), sy=v.reduce((a,p)=>a+p.fat,0)
    const sxy=v.reduce((a,p)=>a+p.mes*p.fat,0), sx2=v.reduce((a,p)=>a+p.mes*p.mes,0)
    const m=(n*sxy-sx*sy)/(n*sx2-sx*sx), b=(sy-m*sx)/n
    return (x:number)=>m*x+b
  }

  const media = allVals.reduce((a,v)=>a+v,0)/allVals.length
  const dp = Math.sqrt(allVals.reduce((a,v)=>a+(v-media)**2,0)/allVals.length)
  const bandTop = yOf(Math.min(media+dp, maxF))
  const bandBot = yOf(Math.max(media-dp, 0))
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth()+1
  const fmt$ = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v)

  return (
    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="font-syne font-bold text-[13px] text-nodri-t1 mb-1">Faturamento do Profissional — Comparativo Anual</h3>
          <div className="flex flex-wrap gap-3 text-[9px] text-nodri-t3">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-1 rounded" style={{background:'#5b4fcf'}}/> Barras = faturamento real</span>
            <span className="flex items-center gap-1"><svg width="14" height="8"><line x1="0" y1="4" x2="14" y2="4" stroke="#5b4fcf" strokeWidth="1.5" strokeDasharray="4 2"/></svg> Tendência</span>
            <span className="flex items-center gap-1"><svg width="14" height="8"><line x1="0" y1="4" x2="14" y2="4" stroke="#767069" strokeWidth="1" strokeDasharray="3 2"/></svg> Média (μ)</span>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {anosDisp.map(ano => {
            const ativo = anosGraf.includes(ano)
            const ci = anosGraf.indexOf(ano)
            const cor = CORES_GRAF[ci%CORES_GRAF.length]
            return (
              <button key={ano} type="button"
                onClick={() => toggleAno(ano, anosGraf)}
                style={{padding:'3px 10px',borderRadius:6,border:`1px solid ${ativo?cor:'#e0ddd8'}`,fontSize:11,fontWeight:700,cursor:'pointer',background:ativo?cor+'22':'#f5f4f0',color:ativo?cor:'#6b6860',transition:'all .15s'}}>
                {ano}{ano===anoAtual?' (atual)':''}
              </button>
            )
          })}
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',minWidth:480,display:'block'}}>
          <defs>
            {series.map(s=>(
              <linearGradient key={s.ano} id={`gdp${s.ano}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.cor} stopOpacity="0.9"/>
                <stop offset="100%" stopColor={s.cor} stopOpacity="0.35"/>
              </linearGradient>
            ))}
          </defs>
          {[0,0.25,0.5,0.75,1].map(t=>{
            const y=PT+t*(H-PT-PB), v=maxF*(1-t)
            return <g key={t}>
              <line x1={PL} y1={y} x2={W-PR} y2={y} stroke="#e8e6e0" strokeWidth={1}/>
              <text x={PL-5} y={y+4} textAnchor="end" fill="#767069" fontSize={9}>{v>=1000?(v/1000).toFixed(0)+'k':v.toFixed(0)}</text>
            </g>
          })}
          <rect x={PL} y={bandTop} width={W-PL-PR} height={Math.max(0,bandBot-bandTop)} fill="#e8e6e0" fillOpacity={0.4} rx={2}/>
          <line x1={PL} y1={yOf(media)} x2={W-PR} y2={yOf(media)} stroke="#767069" strokeWidth={1} strokeDasharray="4 3" opacity={0.6}/>
          <text x={W-PR+2} y={yOf(media)+4} fill="#767069" fontSize={8}>μ {(media/1000).toFixed(0)}k</text>
          {Array.from({length:12},(_,i)=>{
            const mes=i+1, x=xMes(mes)
            const isDest=mes===mesAtual
            return <g key={mes}>
              {isDest&&<rect x={x-cW/2} y={PT} width={cW} height={H-PT-PB} fill="#5b4fcf" fillOpacity={0.04} rx={2}/>}
              <text x={x} y={H-PB+14} textAnchor="middle" fill={isDest?'#1a1a1a':'#767069'} fontSize={9} fontWeight={isDest?700:400}>{MESES_ABREV[mes-1]}</text>
            </g>
          })}
          {series.map((s,si)=>{
            const reg=linReg(s.pts)
            const validPts=s.pts.filter(p=>p.fat>0)
            const trendPts=reg&&validPts.length>=2?validPts.map(p=>({mes:p.mes,y:yOf(Math.max(0,reg(p.mes)))})):null
            return <g key={s.ano}>
              {s.pts.map(p=>{
                if(!p.fat) return null
                const cx=xMes(p.mes)
                const offset=(si-(nS-1)/2)*(bW+2)
                const bx=cx+offset-bW/2
                const by=yOf(p.fat), bh=H-PB-by
                const isAtual=p.mes===mesAtual&&s.ano===anoAtual
                const anoComp=series.find(x=>x.ano!==s.ano)
                const fatComp=anoComp?.pts.find(x=>x.mes===p.mes)?.fat||0
                const pct=fatComp>0?((p.fat-fatComp)/fatComp)*100:null
                return <g key={p.mes}>
                  <rect x={bx} y={by} width={bW} height={bh} fill={`url(#gdp${s.ano})`} rx={3}/>
                  {bh>16&&<text x={bx+bW/2} y={by-3} textAnchor="middle" fill={s.cor} fontSize={8} fontWeight={600} opacity={0.9}>{(p.fat/1000).toFixed(0)}k</text>}
                  {isAtual&&<rect x={bx-1} y={by-1} width={bW+2} height={bh+1} fill="none" stroke={s.cor} strokeWidth={1.5} rx={3}/>}
                  {isAtual&&pct!==null&&<text x={bx+bW/2} y={by-(bh>16?18:6)} textAnchor="middle" fill={pct>=0?'#10b981':'#ef4444'} fontSize={8} fontWeight={700}>{pct>=0?'+':''}{pct.toFixed(0)}%</text>}
                </g>
              })}
              {trendPts&&trendPts.length>=2&&(
                <polyline points={trendPts.map(p=>`${xMes(p.mes)},${p.y}`).join(' ')} fill="none" stroke={s.cor} strokeWidth={1.5} strokeDasharray="6 3" opacity={0.75} strokeLinejoin="round" strokeLinecap="round"/>
              )}
            </g>
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-3 mt-4">
        {series.map(s=>{
          const vals=s.pts.filter(p=>p.fat>0).map(p=>p.fat)
          const total=vals.reduce((a,v)=>a+v,0)
          const med=vals.length?total/vals.length:0
          return (
            <div key={s.ano} className="rounded-xl p-3" style={{background:'#f8f7f5',border:`1px solid ${s.cor}30`,minWidth:150}}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{background:s.cor}}/>
                <span className="text-[12px] font-bold" style={{color:s.cor}}>{s.ano}{s.ano===anoAtual?' (atual)':''}</span>
              </div>
              <div className="text-[9px] text-nodri-t3 space-y-0.5">
                <div>Total: <span className="text-nodri-t1 font-semibold">{fmt$(total)}</span></div>
                <div>Média/mês: <span className="text-nodri-t1">{fmt$(med)}</span></div>
                <div>Meses c/ dados: <span className="text-nodri-t1">{vals.length}/12</span></div>
              </div>
            </div>
          )
        })}
        <div className="rounded-xl p-3" style={{background:'#f8f7f5',border:'1px solid #e8e6e0',minWidth:150}}>
          <div className="text-[9px] font-bold text-nodri-t3 uppercase mb-2">Todos os Anos</div>
          <div className="text-[9px] text-nodri-t3 space-y-0.5">
            <div>Média global: <span className="text-nodri-t1 font-semibold">{fmt$(media)}</span></div>
            <div>DP: <span style={{color:'#b45309'}}>{fmt$(dp)}</span></div>
            <div style={{fontSize:'8px'}}>Faixa normal: {fmt$(Math.max(0,media-dp))} – {fmt$(media+dp)}</div>
          </div>
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
  const cores = ['#5b4fcf','#5b4fcf','#f43f8e','#f59e0b','#22c55e','#06b6d4','#a855f7','#ef4444','#84cc16','#fb923c']
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
                <span style={{fontSize:'8px',color:'#767069'}}>{MESES[h.mes-1]}/{String(h.ano).slice(2)}</span>
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
  const cor = p.tendencia==='alta'?'#22c55e':p.tendencia==='baixa'?'#ef4444':'#5b4fcf'
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
          <span style={{color:'#15803d',fontWeight:700}}> {MESES[melhor.mes-1]} ({fmt$(melhor.media)})</span>
          <span style={{color:'#ef4444',fontWeight:700}}>️ {MESES[pior.mes-1]} ({fmt$(pior.media)})</span>
        </div>
      </div>
      <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
        {s.map(item=>{
          const h = item.count>0?(item.media/max)*100:0
          const isMelhor = item.mes===melhor.mes
          const isPior   = item.mes===pior.mes
          const cor = isMelhor?'#22c55e':isPior?'#ef4444':'linear-gradient(to top,#5b4fcf,#5b4fcf)'
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
              <span style={{fontSize:'8px',color:'#767069',fontWeight:600}}>{MESES[item.mes-1]}</span>
              {item.count>0&&<span style={{fontSize:'7px',color:'#6b6860'}}>{item.count}x</span>}
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
  const corGeral = !scoreGeral ? '#767069' : scoreGeral>=70?'#22c55e':scoreGeral>=45?'#f59e0b':'#ef4444'
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

  const fmt$loc = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
  const fmtN = (v: number) => (v||0).toLocaleString('pt-BR',{maximumFractionDigits:1})
  const fmtP = (v: number) => (v||0).toFixed(1)+'%'
  const delta = (atual: number, ant: number, inv=false) => {
    if (!ant) return null
    const d = ((atual-ant)/ant)*100
    const up = inv ? d<=0 : d>=0
    return { d, up, label: `${d>=0?'+':''}${d.toFixed(1)}%` }
  }

  const metricas8 = [
    { l:' Faturamento',      a:p2?.faturamento||0,              b:p1?.faturamento||0,              f:fmt$loc },
    { l:'️ Ticket Médio',     a:p2?.ticket_medio||0,             b:p1?.ticket_medio||0,             f:fmt$loc },
    { l:' Preferência',      a:p2?.clientes_preferencia||0,     b:p1?.clientes_preferencia||0,     f:fmtN },
    { l:' Sem Pref.',        a:p2?.clientes_sem_preferencia||0, b:p1?.clientes_sem_preferencia||0, f:fmtN, inv:true },
    { l:' Dias Trabalhados', a:p2?.dias_trabalhados||0,         b:p1?.dias_trabalhados||0,         f:fmtN },
    { l:'️ Ocupação',         a:p2?.taxa_ocupacao||0,            b:p1?.taxa_ocupacao||0,            f:fmtP },
    { l:'️ Serviços',         a:p2?.total_servicos||0,           b:p1?.total_servicos||0,           f:fmtN },
    { l:' Produtos',         a:p2?.total_produtos||0,           b:p1?.total_produtos||0,           f:fmtN },
  ]

  return (
    <div className="space-y-5">
      {/* Comparativo por métrica */}
      <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
        <h3 className="font-syne font-bold text-[13px] mb-4"> Comparativo por Métrica</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metricas8.map(item => {
            const d = delta(item.a, item.b, item.inv)
            return (
              <div key={item.l} className="bg-nodri-card border border-nodri-border rounded-xl p-3">
                <div className="text-[9px] text-nodri-t3 uppercase tracking-wider mb-1">{item.l}</div>
                <div className="font-syne font-bold text-[17px] text-nodri-t1">{item.f(item.a)}</div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[9px] text-nodri-t3">Ant: {item.f(item.b)}</span>
                  {d && (
                    <span className="text-[10px] font-bold flex items-center gap-0.5" style={{color: d.up?'#22c55e':'#ef4444'}}>
                      {d.up ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                      {d.label}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
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
      style={{ background:'#ffffff', borderColor:'#e0ddd8' }}>
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
              style={{ background:'#ffffff', borderColor:'#e0ddd8' }}>
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
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
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
                    .replace(/^#{1,3}\s+(.+)$/gm, '<div style="font-weight:700;font-size:13px;color:#5b4fcf;margin:12px 0 6px;border-bottom:1px solid rgba(0,229,200,0.2);padding-bottom:4px">$1</div>')
                    // Linhas separadoras
                    .replace(/^={3,}.*={3,}$/gm, '<hr style="border-color:#e0ddd8;margin:10px 0"/>')
                    .replace(/^---+$/gm, '<hr style="border-color:#e0ddd8;margin:10px 0"/>')
                    // Tabelas markdown simples
                    .replace(/\|(.+)\|/g, (match) => {
                      if (match.includes('---')) return ''
                      const cols = match.split('|').filter(c => c.trim())
                      return '<div style="display:flex;gap:8px;margin:2px 0">' + cols.map(c => `<span style="flex:1;padding:3px 6px;background:#f5f4f0;border-radius:4px;font-size:11px">${c.trim()}</span>`).join('') + '</div>'
                    })
                    // Listas com bullets
                    .replace(/^[•\-\*]\s+(.+)$/gm, '<div style="display:flex;gap:6px;margin:2px 0"><span style="color:#5b4fcf;flex-shrink:0">•</span><span>$1</span></div>')
                    // Listas numeradas
                    .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display:flex;gap:6px;margin:3px 0"><span style="color:#5b4fcf;font-weight:700;flex-shrink:0">$1.</span><span>$2</span></div>')
                    // Emojis de seção como títulos
                    .replace(/^(||||||||||||)\s*(.+)$/gm, '<div style="font-weight:700;font-size:12px;color:#1a1a1a;margin:10px 0 4px">$1 $2</div>')
                    // Quebras de linha
                    .replace(/\n\n/g, '<div style="margin:6px 0"></div>')
                    .replace(/\n/g, '<br/>')
                }}/>
              ) : (
                m.content
              )}
            </div>
            {m.role === 'assistant' && m.content && !enviando && (
              <button
                onClick={() => imprimirEstrategia(m.content, nomeProfissional || 'Profissional')}
                className="mt-1 flex items-center gap-1 px-2 py-1 rounded-lg text-nodri-t3 hover:text-nodri-cyan text-[10px] hover:bg-nodri-cyan/5 transition-colors"
              >
                🖨️ Imprimir
              </button>
            )}
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
  const [tab, setTab] = useState<'cadastro'|'desempenho'|'faturamento'|'metas'|'ia'|'dependencia'|'oportunidades'|'bundle'|'clientes-perdidos'>('cadastro')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [anosDepAtivos, setAnosDepAtivos] = useState<number[]>([])
  const [depCardAberto, setDepCardAberto] = useState<string|null>(null)
  const [analiseData, setAnaliseData] = useState<{dependencia:any;oportunidades:any;bundle:any}>({dependencia:null,oportunidades:null,bundle:null})
  const [loadAnalise, setLoadAnalise] = useState<{dependencia:boolean;oportunidades:boolean;bundle:boolean}>({dependencia:false,oportunidades:false,bundle:false})
  const anoAtual = new Date().getFullYear()
  const [clientesPerdidos, setClientesPerdidos] = useState<any>(null)
  const [loadClientesPerdidos, setLoadClientesPerdidos] = useState(false)
  const [perdidosDataInicio, setPerdidosDataInicio] = useState(`01/01/${anoAtual - 1}`)
  const [perdidosDataFim, setPerdidosDataFim] = useState(`31/12/${anoAtual}`)
  const [subTabPerdidos, setSubTabPerdidos] = useState<'outro-servico'|'saiu-salao'|'outra-categoria'>('outra-categoria')
  const [sortKeyPerdidos, setSortKeyPerdidos] = useState<'ultima_visita_com_prof'|'ultima_visita_salao'|'dias_ausente'|'cliente'>('ultima_visita_com_prof')
  const [sortAscPerdidos, setSortAscPerdidos] = useState(false)
  const [alertasAtivos, setAlertasAtivos] = useState<any[]>([])
  const [alertasHistorico, setAlertasHistorico] = useState<any[]>([])
  const [loadAlertas, setLoadAlertas] = useState(false)
  const [mostrarHistoricoAlertas, setMostrarHistoricoAlertas] = useState(false)
  const [servicosSalao, setServicosSalao] = useState<{id:string;categoria:string;nome:string;preco_fixo:number|null;preco_min:number|null;comissao_valor:number|null}[]>([])
  const [selectorAberto, setSelectorAberto] = useState(false)
  const selectorRef = useRef<HTMLDivElement>(null)
  const refCadastro    = useRef<HTMLDivElement>(null)
  const refFaturamento = useRef<HTMLDivElement>(null)
  const refOcorrencias = useRef<HTMLDivElement>(null)

  // ── Utilidade compartilhada de impressão ──────────────────────────────────
  function abrirImpressao(html: string) {
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) { document.body.removeChild(iframe); return }
    doc.open(); doc.write(html); doc.close()
    setTimeout(() => { iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 2000) }, 600)
  }

  function printBase(titulo: string) {
    const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    const agora = new Date()
    const nomeProf = prof?.apelido || prof?.nome_completo || 'Profissional'
    const dataStr = `${agora.getDate()} de ${MESES_PT[agora.getMonth()]} de ${agora.getFullYear()}`
    const css = `@page{size:A4;margin:14mm 13mm 16mm 13mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;font-size:9.5pt;color:#1a1a2e;background:#fff;line-height:1.5}.hd{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #5b4fcf;padding-bottom:8px;margin-bottom:16px}.brand{font-size:18pt;font-weight:900;color:#5b4fcf}.meta{text-align:right;font-size:8pt;color:#555}.sec{margin-bottom:16px;break-inside:avoid}.sec-title{background:#5b4fcf;color:#fff;padding:5px 10px;border-radius:5px 5px 0 0;font-weight:700;font-size:9.5pt}.tbl{width:100%;border-collapse:collapse;border:1px solid #ddd;border-top:none}.tbl td,.tbl th{padding:5px 9px;border-bottom:1px solid #eee;font-size:9pt}.tbl th{background:#f5f4f0;font-weight:700;color:#555}.tbl tr:nth-child(even) td{background:#f9f9ff}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}.card{border:1px solid #ddd;border-radius:6px;padding:8px 10px;break-inside:avoid}.card-lbl{font-size:7.5pt;color:#767069;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px}.card-val{font-size:14pt;font-weight:800;color:#1a1a2e}.card-sub{font-size:8pt;color:#555;margin-top:2px}.footer{position:fixed;bottom:0;left:0;right:0;border-top:1px solid #ddd;padding:4px 13mm;display:flex;justify-content:space-between;font-size:7pt;color:#999;background:#fff}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    return { nomeProf, dataStr, css, MESES_PT,
      wrap: (corpo: string) => `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${titulo} — ${nomeProf}</title><style>${css}</style></head><body><div class="hd"><div class="brand">NODRI</div><div class="meta"><strong>${titulo} — ${nomeProf}</strong><br>Cargo: ${prof?.cargo||'—'} · Gerado em: ${dataStr}</div></div>${corpo}<div class="footer"><span>NODRI — Sistema de Gestão de Salão</span><span>${nomeProf} · ${dataStr}</span></div></body></html>`
    }
  }

  // ── Impressão Faturamento ──────────────────────────────────────────────────
  function imprimirFaturamento() {
    if (!metricas) return
    const { MESES_PT, wrap } = printBase('Faturamento')
    const f$ = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
    const fN = (v:number) => (v||0).toLocaleString('pt-BR',{maximumFractionDigits:1})
    const fP = (v:number) => (v||0).toFixed(1)+'%'
    const periodo = `P1: ${p1i} → ${p1f}   |   P2: ${p2i} → ${p2f}`

    const cardRow = (lbl:string, vAtual:string, vAnt:string, delta:number|null, cor='#1a1a2e') =>
      `<div class="card"><div class="card-lbl">${lbl}</div><div class="card-val" style="color:${cor};font-size:13pt">${vAtual}</div><div class="card-sub">Ant: ${vAnt}${delta!==null?` &nbsp;<span style="color:${delta>=0?'#166534':'#991b1b'};font-weight:700">${delta>=0?'+':''}${delta.toFixed(1)}%</span>`:''}</div></div>`

    const pct = (a:number,b:number) => b>0?((a-b)/b)*100:null
    const fat2=p2?.faturamento||0,fat1=p1?.faturamento||0
    const tk2=p2?.ticket_medio||0,tk1=p1?.ticket_medio||0
    const pr2=p2?.clientes_preferencia||0,pr1=p1?.clientes_preferencia||0
    const sp2=p2?.clientes_sem_preferencia||0,sp1=p1?.clientes_sem_preferencia||0
    const di2=p2?.dias_trabalhados||0,di1=p1?.dias_trabalhados||0
    const oc2=p2?.taxa_ocupacao||0,oc1=p1?.taxa_ocupacao||0
    const sv2=p2?.total_servicos||0,sv1=p1?.total_servicos||0
    const pd2=p2?.total_produtos||0,pd1=p1?.total_produtos||0

    const cardsHtml = `<div style="margin-bottom:8px;font-size:8pt;color:#767069">${periodo}</div><div class="cards">
      ${cardRow('Faturamento',f$(fat2),f$(fat1),pct(fat2,fat1),'#5b4fcf')}
      ${cardRow('Ticket Médio',f$(tk2),f$(tk1),pct(tk2,tk1),'#5b4fcf')}
      ${cardRow('Preferência',fN(pr2),fN(pr1),pct(pr2,pr1))}
      ${cardRow('Sem Pref.',fN(sp2),fN(sp1),pct(sp2,sp1))}
      ${cardRow('Dias Trab.',fN(di2),fN(di1),pct(di2,di1))}
      ${cardRow('Ocupação',fP(oc2),fP(oc1),pct(oc2,oc1))}
      ${cardRow('Serviços',fN(sv2),fN(sv1),pct(sv2,sv1))}
      ${cardRow('Produtos',fN(pd2),fN(pd1),pct(pd2,pd1))}
    </div>`

    // Fidelização
    let fidelHtml = ''
    if (fidel) {
      fidelHtml = `<div class="sec"><div class="sec-title">Análise de Fidelização</div><table class="tbl">
        <tr><td style="width:50%">Total de novos clientes</td><td><strong>${fidel.total_novos}</strong></td></tr>
        <tr><td>Fidelizados (voltaram)</td><td><strong style="color:#166534">${fidel.fidelizados}</strong></td></tr>
        <tr><td>Perdidos (não voltaram)</td><td><strong style="color:#991b1b">${fidel.perdidos}</strong></td></tr>
        <tr><td>Taxa de fidelização</td><td><strong>${fidel.taxa_fidelizacao}%</strong></td></tr>
        <tr><td>Taxa de perda</td><td><strong style="color:${fidel.taxa_perda>50?'#991b1b':'#1a1a2e'}">${fidel.taxa_perda}%</strong></td></tr>
        <tr><td>Valor perdido estimado</td><td><strong style="color:#991b1b">${f$(fidel.valor_perdido)}</strong></td></tr>
      </table></div>`
    }

    // Comparativo categoria
    let catHtml = ''
    if (categoriaMedia?.media && categoriaMedia.atual) {
      const m=categoriaMedia.media, a=categoriaMedia.atual
      catHtml = `<div class="sec"><div class="sec-title">vs Média da Categoria — ${categoriaMedia.cargo} (${categoriaMedia.prof_com_dados} prof. com dados)</div><table class="tbl">
        <tr><th>Métrica</th><th>Este Profissional</th><th>Média da Categoria</th><th>Diferença</th></tr>
        ${[['Faturamento',f$(a.faturamento||0),f$(m.faturamento||0),m.faturamento>0?(((a.faturamento||0)-(m.faturamento||0))/(m.faturamento||1)*100).toFixed(1)+'%':'—'],
           ['Ticket Médio',f$(a.ticket_medio||0),f$(m.ticket_medio||0),m.ticket_medio>0?(((a.ticket_medio||0)-(m.ticket_medio||0))/(m.ticket_medio||1)*100).toFixed(1)+'%':'—'],
           ['Ocupação',fP(a.taxa_ocupacao||0),fP(m.taxa_ocupacao||0),m.taxa_ocupacao>0?(((a.taxa_ocupacao||0)-(m.taxa_ocupacao||0))/(m.taxa_ocupacao||1)*100).toFixed(1)+'%':'—'],
           ['Serviços',fN(a.total_servicos||0),fN(m.total_servicos||0),m.total_servicos>0?(((a.total_servicos||0)-(m.total_servicos||0))/(m.total_servicos||1)*100).toFixed(1)+'%':'—'],
        ].map(([l,v1,v2,d])=>`<tr><td>${l}</td><td><strong>${v1}</strong></td><td>${v2}</td><td style="color:${d.startsWith('-')?'#991b1b':'#166534'};font-weight:700">${d}</td></tr>`).join('')}
      </table></div>`
    }

    // Mix de receita
    let mixHtml = ''
    if (metricas.mix_receita?.length) {
      mixHtml = `<div class="sec"><div class="sec-title">Mix de Receita — Top Serviços</div><table class="tbl">
        <tr><th>Serviço</th><th>Qtd</th><th>Valor</th><th>%</th></tr>
        ${metricas.mix_receita.map(s=>`<tr><td>${s.servico}</td><td>${s.quantidade}</td><td>${f$(s.valor)}</td><td>${s.pct}%</td></tr>`).join('')}
      </table></div>`
    }

    // Sazonalidade
    let sazonHtml = ''
    if (metricas.sazonalidade?.filter((s:any)=>s.count>0).length) {
      sazonHtml = `<div class="sec"><div class="sec-title">Sazonalidade — Médias Históricas por Mês</div><table class="tbl">
        <tr><th>Mês</th><th>Média</th><th>Máximo</th><th>Mínimo</th><th>Anos</th></tr>
        ${metricas.sazonalidade.filter((s:any)=>s.count>0).map((s:any)=>`<tr><td>${MESES_PT[s.mes-1]}</td><td><strong>${f$(s.media)}</strong></td><td>${f$(s.max)}</td><td>${f$(s.min)}</td><td>${s.count}x</td></tr>`).join('')}
      </table></div>`
    }

    // Histórico
    let histHtml = ''
    if (metricas.historico_completo?.length) {
      histHtml = `<div class="sec"><div class="sec-title">Histórico Mensal de Faturamento</div><table class="tbl">
        <tr><th>Mês/Ano</th><th>Faturamento</th><th>Serviços</th><th>Dias Trab.</th></tr>
        ${metricas.historico_completo.slice(-24).map((h:any)=>`<tr><td>${MESES_PT[h.mes-1]}/${h.ano}</td><td><strong>${f$(h.faturamento)}</strong></td><td>${h.total_servicos}</td><td>${h.dias_trabalhados}</td></tr>`).join('')}
      </table></div>`
    }

    abrirImpressao(wrap(cardsHtml + fidelHtml + catHtml + mixHtml + sazonHtml + histHtml))
  }

  // ── Impressão Ocorrências ─────────────────────────────────────────────────
  function imprimirOcorrencias() {
    if (!metricas) return
    const { wrap } = printBase('Ocorrências')
    const f$ = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
    const periodo = `P1: ${p1i} → ${p1f}   |   P2: ${p2i} → ${p2f}`

    const resumoHtml = `<div style="margin-bottom:8px;font-size:8pt;color:#767069">${periodo}</div>
    <div class="cards" style="grid-template-columns:repeat(3,1fr)">
      <div class="card"><div class="card-lbl">Ocorrências P1</div><div class="card-val" style="color:#5b4fcf">${metricas.feedbacks_p1_total||0}</div></div>
      <div class="card"><div class="card-lbl">Ocorrências P2</div><div class="card-val" style="color:#5b4fcf">${metricas.feedbacks_p2_total||0}</div></div>
      <div class="card"><div class="card-lbl">Variação</div><div class="card-val" style="color:${(metricas.feedbacks_p2_total||0)<=(metricas.feedbacks_p1_total||0)?'#166534':'#991b1b'}">${metricas.feedbacks_p1_total>0?(((metricas.feedbacks_p2_total-metricas.feedbacks_p1_total)/metricas.feedbacks_p1_total)*100).toFixed(1)+'%':'—'}</div></div>
    </div>`

    let compHtml = ''
    if (metricas.ocorrencias_comparativo?.length) {
      compHtml = `<div class="sec"><div class="sec-title">Comparativo de Ocorrências — P1 vs P2</div><table class="tbl">
        <tr><th>Ocorrência</th><th style="text-align:center">P1 Qtd</th><th style="text-align:center">P2 Qtd</th><th style="text-align:center">Variação</th><th style="text-align:center">P1 %</th><th style="text-align:center">P2 %</th></tr>
        ${metricas.ocorrencias_comparativo.map((o:any)=>{
          const t1=metricas.feedbacks_p1_total||1,t2=metricas.feedbacks_p2_total||1
          const v=o.variacao!==null?`${o.variacao>=0?'+':''}${o.variacao}%`:(o.p1===0&&o.p2>0?'NOVO':'—')
          const cor=o.variacao!==null?(o.variacao<=0?'#166534':'#991b1b'):'#1a1a2e'
          return `<tr><td><strong>${o.tipo}</strong></td><td style="text-align:center">${o.p1||'–'}</td><td style="text-align:center;font-weight:700">${o.p2||'–'}</td><td style="text-align:center;color:${cor};font-weight:700">${v}</td><td style="text-align:center;color:#767069">${t1>0?((o.p1/t1)*100).toFixed(1):0}%</td><td style="text-align:center;color:#767069">${t2>0?((o.p2/t2)*100).toFixed(1):0}%</td></tr>`
        }).join('')}
      </table></div>`
    }

    let listaHtml = ''
    if (metricas.feedbacks?.length) {
      listaHtml = `<div class="sec"><div class="sec-title">Registro de Ocorrências (P2)</div><table class="tbl">
        <tr><th>Data</th><th>Tipo</th><th>O que Houve</th><th>Comentário</th></tr>
        ${metricas.feedbacks.filter((f:any)=>f.tipo!=='positivo').slice(0,40).map((f:any)=>`<tr><td style="white-space:nowrap">${f.data_feedback||f.criado_em?.slice(0,10)||'—'}</td><td>${f.tipo||'—'}</td><td>${f.oque_houve||f.ocorrido_descricao||'—'}</td><td style="font-size:8pt;color:#555">${f.comentario||f.descricao||''}</td></tr>`).join('')}
      </table></div>`
    }

    abrirImpressao(wrap(resumoHtml + compHtml + listaHtml))
  }

  // ── Impressão Metas ───────────────────────────────────────────────────────
  function imprimirMetas() {
    if (!metaInfo) return
    const { MESES_PT, wrap } = printBase('Metas')
    const f$ = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
    const pct = metaInfo.meta_final>0?Math.min((metaInfo.realizado/metaInfo.meta_final)*100,100):0
    const barW = Math.round(pct)

    const progressBar = `<div style="margin:10px 0 4px;background:#e8e6e0;border-radius:4px;height:14px;overflow:hidden"><div style="height:14px;width:${barW}%;background:${pct>=100?'#22c55e':'#5b4fcf'};border-radius:4px"></div></div><div style="font-size:8pt;color:#767069;margin-bottom:12px">${pct.toFixed(1)}% da meta atingida</div>`

    const resumo = `<div class="sec"><div class="sec-title">Meta de ${MESES_PT[metaInfo.mes-1]}/${metaInfo.ano}</div><table class="tbl">
      <tr><td style="width:55%">Meta Mensal</td><td><strong style="color:#5b4fcf;font-size:12pt">${f$(metaInfo.meta_final)}</strong></td></tr>
      <tr><td>Realizado</td><td><strong style="color:#166534;font-size:12pt">${f$(metaInfo.realizado)}</strong></td></tr>
      <tr><td>Progresso</td><td>${progressBar}</td></tr>
      <tr><td>Faltam</td><td><strong style="color:${metaInfo.faltam>0?'#b45309':'#166534'}">${f$(metaInfo.faltam)}</strong></td></tr>
      <tr><td>Dias Restantes</td><td><strong>${metaInfo.dias_restantes}</strong></td></tr>
      <tr><td>Necessário por Dia</td><td><strong style="color:#be185d">${f$(metaInfo.necessario_por_dia)}</strong></td></tr>
      <tr><td>Meta redistribuída (automática)</td><td>${f$(metaInfo.meta_redistribuida)}</td></tr>
      <tr><td>Meta manual</td><td>${metaInfo.meta_manual!=null?f$(metaInfo.meta_manual):'Não definida'}</td></tr>
      <tr><td>Tipo</td><td>${metaInfo.meta_manual!=null?'Manual':'Automática (redistribuição)'}</td></tr>
    </table></div>`

    const alcance = `<div class="sec"><div class="sec-title">Meta Alcançável?</div><table class="tbl">
      <tr><td style="width:55%">Probabilidade</td><td><strong style="color:#5b4fcf;font-size:13pt">${metaInfo.alcancabilidade.probabilidade!==null?metaInfo.alcancabilidade.probabilidade+'%':'—'}</strong></td></tr>
      <tr><td>Diagnóstico</td><td><strong>${metaInfo.alcancabilidade.label}</strong></td></tr>
      <tr><td>Maior faturamento histórico</td><td><strong>${f$(metaInfo.alcancabilidade.maior_historico)}</strong>${metaInfo.alcancabilidade.maior_historico_mes&&metaInfo.alcancabilidade.maior_historico_ano?' ('+MESES_PT[metaInfo.alcancabilidade.maior_historico_mes-1]+'/'+metaInfo.alcancabilidade.maior_historico_ano+')':''}</td></tr>
      ${metaInfo.principal_gargalo&&metaInfo.principal_gargalo!=='nenhum gargalo crítico identificado'?`<tr><td>Principal gargalo</td><td style="color:#991b1b;font-weight:700">${metaInfo.principal_gargalo}</td></tr>`:''}
    </table></div>`

    const habilitados = servicosSalao.filter(s=>(prof?.servicos_habilitados||[]).includes(s.id)&&(s.comissao_valor||0)>0).sort((a,b)=>(b.comissao_valor||0)-(a.comissao_valor||0))
    let guiaHtml = ''
    if (metaInfo.faltam>0 && habilitados.length) {
      const top5 = habilitados.slice(0,5).map(s=>({nome:s.nome,comissao:s.comissao_valor||0,qtd:Math.ceil(metaInfo.faltam/(s.comissao_valor||1))}))
      guiaHtml = `<div class="sec"><div class="sec-title">Como Bater a Meta — Faltam ${f$(metaInfo.faltam)}</div><table class="tbl">
        <tr><th>Serviço</th><th style="text-align:center">Comissão/un.</th><th style="text-align:center">Qtd necessária</th></tr>
        ${top5.map(s=>`<tr><td><strong>${s.nome}</strong></td><td style="text-align:center">${f$(s.comissao)}</td><td style="text-align:center;color:#5b4fcf;font-weight:800;font-size:12pt">${s.qtd}×</td></tr>`).join('')}
      </table></div>`
    }

    abrirImpressao(wrap(resumo + alcance + guiaHtml))
  }

  // ── imprimirAba legado (mantido para outros usos) ──────────────────────────
  function imprimirAba(ref: React.RefObject<HTMLDivElement | null>, titulo: string) {
    if (!ref.current) return
    const { wrap } = printBase(titulo)
    abrirImpressao(wrap(`<div style="font-size:9pt;color:#1a1a2e">${ref.current.innerHTML}</div>`))
  }

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

  const [categoriaMedia, setCategoriaMedia] = useState<{
    cargo: string; total_prof_categoria: number; prof_com_dados: number; media: Record<string,number> | null; atual: Record<string,number> | null
  } | null>(null)

  const buscarMetricas = useCallback(async () => {
    setLoadMet(true)
    const qs = new URLSearchParams({ p1_inicio: p1i, p1_fim: p1f, p2_inicio: p2i, p2_fim: p2f })
    const [resM, resCat] = await Promise.all([
      fetch(`/api/profissionais/${id}/metricas?${qs}`),
      fetch(`/api/profissionais/${id}/categoria-media?p2_inicio=${p2i}&p2_fim=${p2f}`),
    ])
    if (resM.ok) setMetricas(await resM.json())
    else toast.error('Erro ao buscar métricas')
    if (resCat.ok) setCategoriaMedia(await resCat.json())
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

  useEffect(() => {
    const analises: Array<'dependencia'|'oportunidades'|'bundle'> = ['dependencia','oportunidades','bundle']
    if (!analises.includes(tab as any)) return
    const tipo = tab as 'dependencia'|'oportunidades'|'bundle'
    if (analiseData[tipo]) return
    setLoadAnalise(prev => ({...prev,[tipo]:true}))
    fetch(`/api/profissionais/${id}/analises?tipo=${tipo}`)
      .then(r => r.json())
      .then(d => setAnaliseData(prev => ({...prev,[tipo]:d})))
      .catch(() => {})
      .finally(() => setLoadAnalise(prev => ({...prev,[tipo]:false})))
  }, [tab, id])

  function buscarClientesPerdidos(inicio: string, fim: string) {
    setLoadClientesPerdidos(true)
    setClientesPerdidos(null)
    const params = new URLSearchParams({ dataInicio: inicio, dataFim: fim })
    fetch(`/api/profissionais/${id}/clientes-perdidos?${params}`)
      .then(r => r.json())
      .then(d => { setClientesPerdidos(d); setLoadClientesPerdidos(false) })
      .catch(() => setLoadClientesPerdidos(false))
  }

  useEffect(() => {
    if (tab !== 'clientes-perdidos') return
    if (clientesPerdidos) return
    buscarClientesPerdidos(perdidosDataInicio, perdidosDataFim)
  }, [tab, id])

  useEffect(() => {
    if (!id) return
    setLoadAlertas(true)
    fetch(`/api/profissionais/${id}/alertas`)
      .then(r => r.json())
      .then(d => {
        setAlertasAtivos(d.ativos || [])
        setAlertasHistorico(d.historico || [])
      })
      .catch(() => {})
      .finally(() => setLoadAlertas(false))
  }, [id])

  async function arquivarAlerta(alerta: any) {
    setAlertasAtivos(prev => prev.filter(a => a.cliente_nome !== alerta.cliente_nome))
    try {
      await fetch(`/api/profissionais/${id}/alertas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alerta),
      })
      setAlertasHistorico(prev => [{
        ...alerta,
        arquivado_em: new Date().toISOString(),
        data_alerta: new Date().toISOString().split('T')[0],
      }, ...prev])
    } catch (_) {}
  }

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
    return '#5b4fcf'
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
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#5b4fcf] to-[#f43f8e] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
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

      {/* Alertas — card compacto pulsando + dropdown */}
      {!loadAlertas && alertasAtivos.length > 0 && (
        <div className="relative border-b border-nodri-border bg-nodri-surface px-5 py-2 flex items-center gap-3">
          <button onClick={() => setMostrarHistoricoAlertas(v => !v)}
            className="flex items-center gap-2 bg-orange-900/40 border border-orange-700/50 rounded-xl px-3 py-1.5 hover:bg-orange-900/60 transition-all">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"/>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"/>
            </span>
            <span className="text-[11px] font-bold text-orange-300">
              ⚠️ Alertas do dia ({alertasAtivos.length})
            </span>
          </button>

          {/* Dropdown */}
          {mostrarHistoricoAlertas && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 max-w-[480px] max-h-80 overflow-y-auto bg-nodri-surface border border-nodri-border rounded-2xl shadow-xl">
              <div className="flex items-center justify-between px-4 py-2 border-b border-nodri-border">
                <span className="text-[11px] font-bold text-orange-400">{alertasAtivos.length} clientes ausentes há 60+ dias</span>
                <button onClick={() => setMostrarHistoricoAlertas(false)} className="text-nodri-t3 hover:text-nodri-t1 text-[14px]">✕</button>
              </div>
              <div className="divide-y divide-nodri-border">
                {alertasAtivos.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 hover:bg-nodri-bg/30">
                    <div>
                      <span className="text-[11px] font-semibold text-nodri-t1">{a.cliente_nome}</span>
                      <span className="text-[10px] text-orange-400 ml-2">{a.dias_ausente}d ausente</span>
                      {a.ultimo_servico && <span className="text-[10px] text-nodri-t3 ml-1">· {a.ultimo_servico}</span>}
                    </div>
                    <button onClick={() => arquivarAlerta(a)} title="Arquivar"
                      className="text-nodri-t3 hover:text-red-400 ml-3 text-[13px] shrink-0">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      {(() => {
        const TABS = [
          ['cadastro','Cadastro'],
          ['faturamento','Faturamento'],
          ['desempenho','Ocorrências'],
          ['metas','Metas'],
          ['dependencia','👑 Depend.'],
          ['oportunidades','Oport.'],
          ['bundle','Bundles'],
          ['clientes-perdidos','⚠️ Perdidos'],
          ['ia','IA'],
        ] as const
        const labelAtivo = TABS.find(([t])=>t===tab)?.[1] ?? 'Menu'
        return (
          <>
            {/* Mobile: dropdown */}
            <div className="sm:hidden bg-nodri-surface border-b border-nodri-border relative">
              <button
                onClick={()=>setMobileMenuOpen(o=>!o)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-nodri-cyan"
              >
                <span>{labelAtivo}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`transition-transform ${mobileMenuOpen?'rotate-180':''}`}>
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {mobileMenuOpen && (
                <div className="absolute top-full left-0 right-0 z-50 bg-nodri-surface border-b border-nodri-border shadow-lg">
                  {TABS.map(([t,l])=>(
                    <button key={t} onClick={()=>{setTab(t);setMobileMenuOpen(false)}}
                      className={`w-full text-left px-5 py-3 text-sm font-semibold border-l-2 transition-all
                        ${tab===t ? 'border-nodri-cyan text-nodri-cyan bg-nodri-cyan/5' : 'border-transparent text-nodri-t2 hover:text-nodri-cyan hover:bg-nodri-cyan/5'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Desktop: horizontal scroll */}
            <div className="hidden sm:block bg-nodri-surface border-b border-nodri-border overflow-x-auto">
              <div className="flex px-2 min-w-max">
              {TABS.map(([t,l])=>(
                <button key={t} onClick={()=>setTab(t)}
                  className={`px-3 py-3 text-[11px] font-semibold border-b-2 transition-all whitespace-nowrap
                    ${tab===t ? 'border-nodri-cyan text-nodri-cyan' : 'border-transparent text-nodri-t3 hover:text-nodri-t2'}`}>
                  {l}
                </button>
              ))}
              </div>
            </div>
          </>
        )
      })()}

      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-4 sm:py-6">

        {/*  CADASTRO  */}
        {tab === 'cadastro' && (
          <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => {
              const sched = (() => { try { return JSON.parse(form.habilidades||'{}') } catch { return {} } })() as any
              const resp  = (() => { try { return JSON.parse(form.contato_responsavel||'{}') } catch { return { nome: form.contato_responsavel||'', tel: '' } } })() as any
              const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
              const agora = new Date()
              const dataStr = `${agora.getDate()} de ${MESES_PT[agora.getMonth()]} de ${agora.getFullYear()}`
              const nomeProf = prof?.apelido || prof?.nome_completo || 'Profissional'
              const CHECKLIST_ITEMS = [
                {key:'dados_pessoais_completo',label:'Dados Pessoais completo?'},
                {key:'perfil_pessoal_completo',label:'Perfil Pessoal completo?'},
                {key:'dados_profissionais_completo',label:'Dados Profissionais completo?'},
                {key:'contrato_trabalho',label:'Profissional possui contrato?'},
                {key:'ficha_entrevista',label:'Ficha para Entrevista?'},
                {key:'processo_contratacao',label:'Processo de Contratação?'},
                {key:'materiais_trabalho',label:'Materiais para Trabalho?'},
                {key:'perfil_ideal',label:'Perfil Ideal?'},
                {key:'horarios_folgas',label:'Horários e Folgas?'},
                {key:'distrato',label:'Distrato?'},
                {key:'tem_certificados',label:'Certificados?'},
                {key:'plano_carreira',label:'Plano de Carreira?'},
              ]
              const row = (l:string, v:string) => `<tr><td style="width:40%;font-weight:600;color:#555;padding:6px 10px;border-bottom:1px solid #eee">${l}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;color:#1a1a2e">${v||'—'}</td></tr>`
              const section = (title:string, content:string) => `<div style="margin-bottom:18px;break-inside:avoid"><div style="background:#5b4fcf;color:#fff;padding:6px 12px;border-radius:6px 6px 0 0;font-weight:700;font-size:10pt">${title}</div><table style="width:100%;border-collapse:collapse;border:1px solid #ddd;border-top:none">${content}</table></div>`
              const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Dados Cadastrais — ${nomeProf}</title>
<style>@page{size:A4;margin:16mm 14mm 16mm 14mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;font-size:10pt;color:#1a1a2e;background:#fff;line-height:1.5}.header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #5b4fcf;padding-bottom:10px;margin-bottom:20px}.brand{font-size:20pt;font-weight:900;color:#5b4fcf}.meta{text-align:right;font-size:8.5pt;color:#555}.meta strong{display:block;font-size:10pt;color:#1a1a2e}table tr:nth-child(even) td{background:#f9f9ff}td{font-size:9.5pt}.footer{position:fixed;bottom:0;left:0;right:0;border-top:1px solid #ddd;padding:5px 14mm;display:flex;justify-content:space-between;font-size:7.5pt;color:#999;background:#fff}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
</head><body>
<div class="header"><div class="brand">NODRI</div><div class="meta"><strong>Dados Cadastrais — ${nomeProf}</strong>Cargo: ${form.cargo||'—'}<br>Gerado em: ${dataStr}</div></div>
${section('Dados Pessoais',
  row('Nome Completo', form.nome_completo||'')+
  row('Apelido', form.apelido||'')+
  row('Cargo / Categoria', form.cargo||'')+
  row('CPF', form.cpf||'')+
  row('RG', form.rg||'')+
  row('Data de Aniversário', form.data_aniversario ? new Date(form.data_aniversario+'T00:00:00').toLocaleDateString('pt-BR') : '')+
  row('Email', form.email||'')+
  row('Endereço', form.endereco||'')
)}
${section('Contato do Responsável',
  row('Nome do Responsável', resp.nome||'')+
  row('Telefone do Responsável', resp.tel||'')
)}
${section('Horários e Disponibilidade',
  row('Dias de Folga', (sched.dias_folga||[]).join(', ')||'Não informado')+
  row('Horário de Trabalho', sched.h_inicio && sched.h_fim ? `${sched.h_inicio} às ${sched.h_fim}` : 'Não informado')+
  row('Observação de Horário', sched.h_obs||'')
)}
${section('Perfil Pessoal',
  row('Cor Favorita', form.cor_favorita||'')+
  row('Comida Favorita', form.comida_favorita||'')+
  row('Animal Favorito', form.animal_favorito||'')+
  row('Hobbies', form.hobbies||'')+
  row('Um Sonho', form.um_sonho||'')
)}
${section('Dados Profissionais',
  row('CNPJ', form.cnpj||'')+
  row('Dados Bancários', form.conta_bancaria||'')
)}
${section('Checklist de Onboarding',
  CHECKLIST_ITEMS.map(c=>{
    const v = (form as any)[c.key]
    const sim = v===true||v==='true'
    return `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;width:70%;font-size:9.5pt">${c.label}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;font-weight:700;color:${sim?'#166534':'#991b1b'};font-size:9.5pt">${sim?'SIM':'NÃO'}</td></tr>`
  }).join('')
)}
${section('Status',row('Status do Profissional',form.ativo!==false?'Profissional Ativo':'Inativo'))}
<div class="footer"><span>NODRI — Sistema de Gestão de Salão</span><span>${nomeProf} · ${dataStr}</span></div>
</body></html>`
              const iframe = document.createElement('iframe')
              iframe.style.cssText='position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;'
              document.body.appendChild(iframe)
              const doc=iframe.contentDocument||iframe.contentWindow?.document
              if(!doc){document.body.removeChild(iframe);return}
              doc.open();doc.write(html);doc.close()
              setTimeout(()=>{iframe.contentWindow?.print();setTimeout(()=>document.body.removeChild(iframe),2000)},600)
            }}
              className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-nodri-border text-nodri-t2 hover:border-nodri-cyan hover:text-nodri-cyan transition-colors">
              🖨️ Imprimir
            </button>
          </div>
          <div ref={refCadastro} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {/* Banner de departamento */}
              {form.is_departamento && (
                <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: (form.departamento_cor || '#5b4fcf') + '15', border: `1px solid ${form.departamento_cor || '#5b4fcf'}40` }}>
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
                    {/* Contato do Responsável — nome e telefone separados */}
                    <div><label className={labelCls}>Nome do Responsável</label>
                      <input value={(() => { try { return JSON.parse(form.contato_responsavel||'{}').nome||'' } catch { return form.contato_responsavel||'' } })()}
                        onChange={e => { const cur = (() => { try { return JSON.parse(form.contato_responsavel||'{}') } catch { return {} } })(); set('contato_responsavel', JSON.stringify({...cur, nome: e.target.value})) }}
                        placeholder="Nome do responsável" className={inputCls}/>
                    </div>
                    <div><label className={labelCls}>Telefone do Responsável</label>
                      <input value={(() => { try { return JSON.parse(form.contato_responsavel||'{}').tel||'' } catch { return '' } })()}
                        onChange={e => { const cur = (() => { try { return JSON.parse(form.contato_responsavel||'{}') } catch { return {} } })(); set('contato_responsavel', JSON.stringify({...cur, tel: e.target.value})) }}
                        placeholder="(00) 00000-0000" className={inputCls}/>
                    </div>
                  </div>

                  {/* Dias de Folga */}
                  <div className="mt-3">
                    <label className={labelCls}>Dias de Folga</label>
                    {(() => {
                      const sched = (() => { try { return JSON.parse(form.habilidades||'{}') } catch { return {} } })() as any
                      const folgas: string[] = sched.dias_folga || []
                      const dias = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
                      return (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {dias.map(d => {
                            const on = folgas.includes(d)
                            return (
                              <button key={d} type="button"
                                onClick={() => {
                                  const novo = on ? folgas.filter(x=>x!==d) : [...folgas, d]
                                  set('habilidades', JSON.stringify({...sched, dias_folga: novo}))
                                }}
                                className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${on ? 'bg-nodri-cyan text-nodri-dark border-nodri-cyan' : 'bg-nodri-card text-nodri-t2 border-nodri-border hover:border-nodri-cyan'}`}>
                                {d}
                              </button>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Horário de Trabalho */}
                  <div className="mt-3">
                    <label className={labelCls}>Horário de Trabalho</label>
                    {(() => {
                      const sched = (() => { try { return JSON.parse(form.habilidades||'{}') } catch { return {} } })() as any
                      const horas = Array.from({length:18},(_,i)=>`${String(i+6).padStart(2,'0')}:00`)
                      return (
                        <div className="grid grid-cols-2 gap-3 mt-1">
                          <div>
                            <label className={labelCls}>De</label>
                            <select value={sched.h_inicio||''} onChange={e=>set('habilidades',JSON.stringify({...sched,h_inicio:e.target.value}))} className={inputCls}>
                              <option value="">Selecione</option>
                              {horas.map(h=><option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Até</label>
                            <select value={sched.h_fim||''} onChange={e=>set('habilidades',JSON.stringify({...sched,h_fim:e.target.value}))} className={inputCls}>
                              <option value="">Selecione</option>
                              {horas.map(h=><option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className={labelCls}>Observação de Horário</label>
                            <input value={sched.h_obs||''} onChange={e=>set('habilidades',JSON.stringify({...sched,h_obs:e.target.value}))} placeholder="Ex: Nas terças-feiras entra às 14:00" className={inputCls}/>
                          </div>
                        </div>
                      )
                    })()}
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

                    {/* Lista suspensa dos selecionados */}
                    {(form.servicos_habilitados?.length ?? 0) > 0 && !selectorAberto && (
                      <details className="mt-1">
                        <summary className="text-[10px] text-nodri-cyan cursor-pointer select-none list-none flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          ver {form.servicos_habilitados?.length ?? 0} serviço(s) selecionado(s)
                        </summary>
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
                      </details>
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
          </div>
        )}

        {/*  FATURAMENTO  */}
        {tab === 'faturamento' && (
          <div>
          <div className="flex justify-end mb-4">
            <button onClick={imprimirFaturamento}
              className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-nodri-border text-nodri-t2 hover:border-nodri-cyan hover:text-nodri-cyan transition-colors">
              🖨️ Imprimir
            </button>
          </div>
          <div ref={refFaturamento} className="space-y-6">
            <FiltroComparacao {...{modoFiltro,setModoFiltro,p1i,setP1i,p1f,setP1f,p2i,setP2i,p2f,setP2f,onAplicar:buscarMetricas,loading:loadMet}}/>
            {loadMet && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan"/></div>}
            {metricas && !loadMet && <>
              {(p1 || p2) ? <>
                {/* Comparativo com média da categoria — topo */}
                {categoriaMedia?.media && categoriaMedia.atual && (() => {
                  const m = categoriaMedia.media
                  const a = categoriaMedia.atual
                  const fmt$ = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)
                  const fmtN = (v:number) => (v||0).toLocaleString('pt-BR',{maximumFractionDigits:1})
                  const fmtP = (v:number) => (v||0).toFixed(1)+'%'
                  const deltaCat = (atual:number, med:number) => {
                    if(!med) return null
                    const d=((atual-med)/med)*100
                    return { d, up:d>=0, label:`${d>=0?'+':''}${d.toFixed(1)}%` }
                  }
                  const itens = [
                    {l:' Faturamento',      a:a.faturamento||0,              med:m.faturamento||0,              f:fmt$},
                    {l:'️ Ticket Médio',     a:a.ticket_medio||0,             med:m.ticket_medio||0,             f:fmt$},
                    {l:' Preferência',      a:a.clientes_preferencia||0,     med:m.clientes_preferencia||0,     f:fmtN},
                    {l:' Sem Pref.',        a:a.clientes_sem_preferencia||0, med:m.clientes_sem_preferencia||0, f:fmtN},
                    {l:' Dias Trabalhados', a:a.dias_trabalhados||0,         med:m.dias_trabalhados||0,         f:fmtN},
                    {l:'️ Ocupação',         a:a.taxa_ocupacao||0,            med:m.taxa_ocupacao||0,            f:fmtP},
                    {l:'️ Serviços',         a:a.total_servicos||0,           med:m.total_servicos||0,           f:fmtN},
                    {l:' Produtos',         a:a.total_produtos||0,           med:m.total_produtos||0,           f:fmtN},
                  ]
                  return (
                    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <h3 className="font-syne font-bold text-[13px]"> vs Média da Categoria — {categoriaMedia.cargo}</h3>
                        <span className="text-[9px] text-nodri-t3 bg-nodri-card border border-nodri-border rounded-lg px-2 py-1">
                          {categoriaMedia.prof_com_dados} de {categoriaMedia.total_prof_categoria} profissional(is) com dados
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {itens.map(item => {
                          const d = deltaCat(item.a, item.med)
                          const acimaDaMed = d ? d.up : false
                          return (
                            <div key={item.l} className="bg-nodri-card border border-nodri-border rounded-xl p-3">
                              <div className="text-[9px] text-nodri-t3 uppercase tracking-wider mb-1">{item.l}</div>
                              <div className="font-syne font-bold text-[17px] text-nodri-t1">{item.f(item.a)}</div>
                              <div className="text-[9px] text-nodri-t3 mt-1">Categoria: {item.f(item.med)}</div>
                              {d && (
                                <div className="flex items-center gap-1 mt-1">
                                  {acimaDaMed ? <TrendingUp size={10} color="#22c55e"/> : <TrendingDown size={10} color="#ef4444"/>}
                                  <span className="text-[10px] font-bold" style={{color:acimaDaMed?'#22c55e':'#ef4444'}}>{d.label}</span>
                                  <span className="text-[8px] text-nodri-t3">{acimaDaMed?'acima':'abaixo'} da média</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
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
          </div>
        )}

        {/*  PENDÊNCIAS  */}
        {/*  IA  */}
        {tab === 'ia' && (
          <div className="-mx-3 sm:-mx-5 -mt-4 sm:-mt-6">
            <ChatWidget profissionalId={id} modoEmbarcado={true} />
          </div>
        )}

        {/*  METAS  */}
        {tab === 'metas' && (
          <div className="space-y-6 max-w-3xl">
            <div className="flex justify-end">
              <button onClick={imprimirMetas}
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-nodri-border text-nodri-t2 hover:border-nodri-cyan hover:text-nodri-cyan transition-colors">
                🖨️ Imprimir
              </button>
            </div>
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
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? '#22c55e' : 'linear-gradient(135deg, #5b4fcf, #5b4fcf)' }} />
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
                      { l: 'Meta Mensal', v: fmt$(metaInfo.meta_final), cor: '#5b4fcf' },
                      { l: 'Realizado', v: fmt$(metaInfo.realizado), cor: '#22c55e' },
                      { l: 'Faltam', v: fmt$(metaInfo.faltam), cor: metaInfo.faltam > 0 ? '#f59e0b' : '#22c55e' },
                      { l: 'Dias Restantes', v: String(metaInfo.dias_restantes), cor: '#5b4fcf' },
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

                  {/* Breakdown de serviços para bater a meta */}
                  {metaInfo.faltam > 0 && (() => {
                    const habilitados = servicosSalao
                      .filter(s => (prof.servicos_habilitados||[]).includes(s.id) && (s.comissao_valor||0) > 0)
                      .sort((a, b) => (b.comissao_valor||0) - (a.comissao_valor||0))
                    if (!habilitados.length) return null
                    const faltam = metaInfo.faltam
                    const sugestoes = habilitados.slice(0, 5).map(s => ({
                      nome: s.nome,
                      comissao: s.comissao_valor || 0,
                      qtd: Math.ceil(faltam / (s.comissao_valor || 1)),
                    }))
                    // Mix equilibrado: distribui faltam entre top 3 serviços
                    const top3 = habilitados.slice(0, 3)
                    const totalComissao = top3.reduce((s, x) => s + (x.comissao_valor||0), 0)
                    const mixQtds = top3.map(s => ({
                      nome: s.nome,
                      comissao: s.comissao_valor || 0,
                      qtd: totalComissao > 0 ? Math.ceil((faltam * (s.comissao_valor||0) / totalComissao) / (s.comissao_valor||1)) : 0,
                    }))
                    return (
                      <div className="bg-nodri-surface border border-nodri-cyan/25 rounded-2xl p-5">
                        <h3 className="font-syne font-bold text-[12px] text-nodri-cyan mb-1"> Como bater a meta — Guia de Serviços</h3>
                        <p className="text-[10px] text-nodri-t3 mb-4">Faltam {fmt$(faltam)} · Quantidade baseada na comissão recebida, não no valor bruto</p>
                        <div className="space-y-3 mb-4">
                          <div className="text-[10px] text-nodri-t3 font-semibold uppercase tracking-wider">Mix equilibrado (top 3)</div>
                          {mixQtds.map(item => (
                            <div key={item.nome} className="flex items-center justify-between p-3 bg-nodri-card rounded-xl border border-nodri-border">
                              <div>
                                <span className="text-[12px] text-nodri-t1 font-semibold">{item.nome}</span>
                                <span className="ml-2 text-[10px] text-nodri-t3">{fmt$(item.comissao)}/comissão</span>
                              </div>
                              <span className="font-syne font-bold text-[18px] text-nodri-cyan">{item.qtd}×</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-nodri-border pt-3">
                          <div className="text-[10px] text-nodri-t3 font-semibold uppercase tracking-wider mb-2">Alternativas (somente um serviço)</div>
                          <div className="grid grid-cols-2 gap-2">
                            {sugestoes.map(item => (
                              <div key={item.nome} className="p-2.5 bg-nodri-card rounded-lg border border-nodri-border text-center">
                                <div className="text-[10px] text-nodri-t3 truncate">{item.nome}</div>
                                <div className="font-bold text-[16px] text-nodri-cyan">{item.qtd}×</div>
                                <div className="text-[9px] text-nodri-t3">{fmt$(item.comissao)}/comissão</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  <div className="flex items-center gap-2">
                    <button onClick={gerarEstrategia} disabled={gerandoEstrategia}
                      style={{ background: 'linear-gradient(135deg, #5b4fcf, #f43f8e)' }}
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
                        <div className="flex gap-2">
                          <button onClick={() => imprimirEstrategia(rascunhoEstrategia.plano_texto, prof?.nome_completo || '')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-nodri-cyan/40 text-nodri-cyan text-[11px] font-bold hover:bg-nodri-cyan/10">
                            🖨️ Imprimir
                          </button>
                          <button onClick={salvarEstrategia} disabled={salvandoEstrategia}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nodri-cyan text-nodri-dark text-[11px] font-bold hover:brightness-110 disabled:opacity-50">
                            {salvandoEstrategia ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>}
                            💾 Salvar
                          </button>
                        </div>
                      </div>
                      <div className="text-[12px] text-nodri-t2 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderPlanoHtml(rascunhoEstrategia.plano_texto) }}/>
                    </div>
                  )}

                  {/* Plano salvo (oficial) */}
                  {!rascunhoEstrategia && metaInfo.plano?.plano_texto && (
                    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-syne font-bold text-[12px] text-nodri-cyan">Planejamento Estratégico (salvo)</h3>
                        <button onClick={() => imprimirEstrategia(metaInfo.plano!.plano_texto, prof?.nome_completo || '')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-nodri-cyan/40 text-nodri-cyan text-[11px] font-bold hover:bg-nodri-cyan/10">
                          🖨️ Imprimir
                        </button>
                      </div>
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
          <div>
          <div className="flex justify-end mb-4">
            <button onClick={imprimirOcorrencias}
              className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-nodri-border text-nodri-t2 hover:border-nodri-cyan hover:text-nodri-cyan transition-colors">
              🖨️ Imprimir
            </button>
          </div>
          <div ref={refOcorrencias} className="space-y-6">
            <FiltroComparacao {...{modoFiltro,setModoFiltro,p1i,setP1i,p1f,setP1f,p2i,setP2i,p2f,setP2f,onAplicar:buscarMetricas,loading:loadMet}}/>
            {loadMet && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan"/></div>}
            {metricas && !loadMet && <>

              {/* Impacto Financeiro — Faltas e Atrasos */}
              {(() => {
                const fatDia = (metricas.fat_p2?.faturamento||0) / Math.max(metricas.fat_p2?.dias_trabalhados||1, 1)
                // Conta apenas faltas ao trabalho — exclui "treinamento", "reunião", "curso" etc.
                const EXCLUIR_FALTA = ['treinamento', 'reunião', 'reuniao', 'curso', 'capacitação', 'capacitacao', 'palestra', 'evento']
                const faltas = metricas.ocorrencias
                  ?.filter(o => {
                    const t = o.tipo?.toLowerCase() || ''
                    return t.includes('falta') && !EXCLUIR_FALTA.some(ex => t.includes(ex))
                  })
                  .reduce((s, o) => s + o.total, 0) || 0
                const atrasos = metricas.ocorrencias?.find(o => o.tipo?.toLowerCase().includes('atraso'))?.total || 0
                // Média ponderada real: comissão de cada serviço × quantas vezes foi feito
                const mix = metricas.mix_receita || []
                let totalQtdMix = 0, totalComissaoPonderada = 0
                for (const item of mix) {
                  const serv = servicosSalao.find(s => s.nome.toUpperCase() === item.servico.toUpperCase())
                  if (serv?.comissao_valor) {
                    totalQtdMix += item.quantidade
                    totalComissaoPonderada += serv.comissao_valor * item.quantidade
                  }
                }
                // Fallback: média simples dos habilitados se não houver histórico
                const habilitados = servicosSalao.filter(s => (prof.servicos_habilitados||[]).includes(s.id))
                const comissaoMedia = totalQtdMix > 0
                  ? totalComissaoPonderada / totalQtdMix
                  : habilitados.length > 0
                    ? habilitados.reduce((sum, s) => sum + (s.comissao_valor||0), 0) / habilitados.length
                    : 0
                const perdaFaltas = fatDia * faltas
                const perdaAtrasos = comissaoMedia * atrasos
                if (faltas === 0 && atrasos === 0) return null
                return (
                  <div className="bg-nodri-surface border border-red-500/20 rounded-2xl p-5">
                    <h3 className="font-syne font-bold text-[13px] mb-4 text-red-400"> Impacto Financeiro das Ocorrências</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-nodri-card border border-red-500/15 rounded-xl p-4">
                        <div className="text-[9px] text-nodri-t3 uppercase tracking-wider mb-1"> Dinheiro perdido por faltas</div>
                        <div className="font-syne font-bold text-[22px] text-red-400">{fmt$(perdaFaltas)}</div>
                        <p className="text-[10px] text-nodri-t3 mt-1">{faltas} falta(s) × {fmt$(fatDia)}/dia</p>
                        <p className="text-[9px] text-nodri-t3/60 mt-0.5">Média diária do período atual</p>
                      </div>
                      <div className="bg-nodri-card border border-orange-500/15 rounded-xl p-4">
                        <div className="text-[9px] text-nodri-t3 uppercase tracking-wider mb-1"> Dinheiro perdido por atrasos</div>
                        <div className="font-syne font-bold text-[22px] text-orange-400">{fmt$(perdaAtrasos)}</div>
                        <p className="text-[10px] text-nodri-t3 mt-1">{atrasos} atraso(s) × {fmt$(comissaoMedia)} comissão</p>
                        <p className="text-[9px] text-nodri-t3/60 mt-0.5">Cada atraso = 1 cliente perdido</p>
                      </div>
                    </div>
                    {(perdaFaltas + perdaAtrasos) > 0 && (
                      <div className="mt-3 p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                        <span className="text-[11px] text-red-400 font-bold"> Total estimado: {fmt$(perdaFaltas + perdaAtrasos)}</span>
                        <span className="text-[10px] text-nodri-t3 ml-2">de receita não gerada no período</span>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Resumo de feedbacks no período */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: 'Total P1', v: metricas.feedbacks_p1_total, cor: '#5b4fcf' },
                  { l: 'Total P2', v: metricas.feedbacks_p2_total, cor: '#5b4fcf' },
                  { l: 'Variação', v: null, cor: metricas.feedbacks_p2_total <= metricas.feedbacks_p1_total ? '#22c55e' : '#ef4444',
                    txt: metricas.feedbacks_p1_total > 0
                      ? (((metricas.feedbacks_p2_total-metricas.feedbacks_p1_total)/metricas.feedbacks_p1_total)*100).toFixed(1)+'%'
                      : '—' },
                ].map(item=>(
                  <div key={item.l} className="bg-nodri-card border border-nodri-border rounded-xl p-2.5">
                    <div className="text-[9px] text-nodri-t3 uppercase tracking-wider mb-0.5">{item.l}</div>
                    <div className="font-syne font-bold text-[16px]" style={{color:item.cor}}>
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
          </div>
        )}

        {/* 👑 DEPENDÊNCIA */}
        {tab === 'dependencia' && (
          <div className="space-y-5 max-w-3xl">
            <div className="flex justify-end">
              <button onClick={() => {
                const d = analiseData.dependencia
                if (!d) return
                const { MESES_PT, wrap } = printBase('Dependência')
                const cor = d.cor_risco || '#10b981'
                const nivelLabel = d.nivel_risco==='critico'?'CRÍTICO':d.nivel_risco==='alto'?'ALTO':d.nivel_risco==='medio'?'MODERADO':'BAIXO'
                const histRows = (d.historico_completo||[]).map((h:any)=>`<tr><td>${MESES_PT[h.mes-1]} ${h.ano}</td><td>${h.pct}%</td><td>R$ ${(h.fat_prof||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td><td>R$ ${(h.fat_total||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td></tr>`).join('')
                const fieisRows = (d.detalhes_fieis||[]).map((f:any)=>`<tr><td>${f.cliente}</td><td>${f.total}</td><td>${f.comProf}</td><td>${f.pct}%</td><td>${f.ultimaVisita||'-'}</td></tr>`).join('')
                const corpo = `<div class="sec"><div class="sec-title">Resumo de Risco</div>
<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px">
  <div style="flex:1;min-width:120px;background:${cor}18;border:1.5px solid ${cor}55;border-radius:8px;padding:12px;text-align:center">
    <div style="font-size:32pt;font-weight:900;color:${cor}">${d.pct_faturamento}%</div>
    <div style="font-size:9pt;font-weight:700;color:${cor};text-transform:uppercase">${nivelLabel}</div>
    <div style="font-size:8pt;color:#555;margin-top:4px">${d.mensagem}</div>
  </div>
  <div style="flex:3;display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div class="card"><div class="card-lbl">Faturamento Gerado (total histórico)</div><div class="card-val" style="color:#5b4fcf">R$ ${(d.fat_prof||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
    <div class="card"><div class="card-lbl">Clientes Fiéis ❤️</div><div class="card-val" style="color:#f59e0b">${d.clientes_fieis||0}</div><div class="card-sub">≥4 visitas, ≥80% com este prof, últimos 90 dias</div></div>
    <div class="card"><div class="card-lbl">Média Mensal (histórico)</div><div class="card-val" style="color:#f43f8e">R$ ${(d.impacto_mensal||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
    <div class="card"><div class="card-lbl">Faturamento Total Salão</div><div class="card-val">R$ ${(d.fat_total||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>
  </div>
</div></div>
${histRows?`<div class="sec"><div class="sec-title">Histórico Completo por Mês</div><table class="tbl"><thead><tr><th>Mês</th><th>% Fat.</th><th>Fat. Prof.</th><th>Fat. Salão</th></tr></thead><tbody>${histRows}</tbody></table></div>`:''}
${fieisRows?`<div class="sec"><div class="sec-title">Clientes Fiéis ❤️ (${d.clientes_fieis||0} clientes)</div><table class="tbl"><thead><tr><th>Cliente</th><th>Total Visitas</th><th>Com este Prof.</th><th>%</th><th>Última Visita</th></tr></thead><tbody>${fieisRows}</tbody></table></div>`:''}
<div class="sec"><div class="sec-title">Recomendação</div><p style="font-size:10pt;line-height:1.6;padding:10px 0">${
  d.nivel_risco==='critico'?'⚠️ Risco CRÍTICO. Recomenda-se redistribuir clientes, treinar substituto e criar estratégia de retenção imediata.':
  d.nivel_risco==='alto'?'🔶 Risco ALTO. Considere desenvolver outro profissional com habilidades similares e registrar os clientes preferenciais.':
  d.nivel_risco==='medio'?'🟡 Risco MODERADO. Monitore a satisfação deste profissional e garanta que os clientes conheçam outros profissionais.':
  '✅ Baixo risco. O salão está bem distribuído — parabéns!'
}</p></div>`
                abrirImpressao(wrap(corpo))
              }}
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-nodri-border text-nodri-t2 hover:border-nodri-cyan hover:text-nodri-cyan transition-colors">
                🖨️ Imprimir
              </button>
            </div>
            {loadAnalise.dependencia && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan"/></div>}
            {!loadAnalise.dependencia && analiseData.dependencia && (() => {
              const d = analiseData.dependencia
              const cor = d.cor_risco || '#10b981'
              return (
                <>
                  <div className="px-1">
                    <h2 className="font-syne font-black text-[18px] text-nodri-t1">👑 Relatório de Dependência</h2>
                    <p className="text-[11px] text-nodri-t3 mt-1">Selecione os anos no gráfico para ver o impacto real no período</p>
                  </div>

                  {(() => {
                    const hist = d.historico_completo || []
                    const anosDisp2 = Array.from(new Set(hist.map((h:any)=>h.ano))).sort((a:any,b:any)=>b-a) as number[]
                    const anosFiltro = anosDepAtivos.length ? anosDepAtivos : anosDisp2.slice(0,2)
                    const histFiltrado = hist.filter((h:any) => anosFiltro.includes(h.ano))
                    const fatProfFilt = histFiltrado.reduce((s:number,h:any)=>s+h.fat_prof,0)
                    const fatTotalFilt = histFiltrado.reduce((s:number,h:any)=>s+h.fat_total,0)
                    const pctFilt = fatTotalFilt > 0 ? Math.round(fatProfFilt/fatTotalFilt*1000)/10 : d.pct_faturamento
                    const corFilt = pctFilt >= 30 ? '#ef4444' : pctFilt >= 20 ? '#f97316' : pctFilt >= 10 ? '#f59e0b' : '#10b981'
                    const mesesFiltComDados = histFiltrado.filter((h:any)=>h.fat_prof>0).length
                    const mediaMensalFilt = mesesFiltComDados > 0 ? Math.round(fatProfFilt/mesesFiltComDados*100)/100 : 0
                    const labelAnos = anosFiltro.join(' + ')

                    // Filtra clientes fiéis pela última visita dentro dos anos selecionados
                    // data_comanda pode ser DD/MM/YYYY ou YYYY-MM-DD
                    const extrairAno = (dt: string) => {
                      if (!dt) return 0
                      if (dt.includes('/')) return parseInt(dt.split('/')[2]) // DD/MM/YYYY → ano
                      return parseInt(dt.slice(0,4)) // YYYY-MM-DD → ano
                    }
                    const fieisFiltr = (d.detalhes_fieis||[]).filter((f:any) => {
                      return anosFiltro.includes(extrairAno(f.ultimaVisita))
                    })
                    const clientesFieisFilt = fieisFiltr.length

                    const cards = [
                      { id:'pct',   l:'% do Faturamento', v:`${pctFilt}%`,            c:corFilt    },
                      { id:'fat',   l:'Faturamento Gerado',v:fmt$(fatProfFilt),         c:'#5b4fcf'  },
                      { id:'fieis', l:'❤️ Clientes Fiéis', v:String(clientesFieisFilt), c:'#f59e0b'  },
                      { id:'media', l:'Média Mensal',      v:fmt$(mediaMensalFilt),     c:'#f43f8e'  },
                    ]

                    return (
                      <>
                        <p className="text-[10px] text-nodri-t3">Período: {labelAnos} — clique em cada card para ver os detalhes</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {cards.map(item=>(
                            <button key={item.id} onClick={()=>setDepCardAberto(depCardAberto===item.id?null:item.id)}
                              className={`bg-nodri-card border rounded-xl p-3 text-left transition-all cursor-pointer ${depCardAberto===item.id?'border-nodri-cyan':'border-nodri-border hover:border-nodri-cyan'}`}>
                              <div className="text-[9px] text-nodri-t3 uppercase tracking-wider mb-1">{item.l}</div>
                              <div className="font-syne font-bold text-[16px]" style={{color:item.c}}>{item.v}</div>
                              <div className="text-[8px] text-nodri-t3 mt-1">{depCardAberto===item.id?'▲ fechar':'▼ ver detalhes'}</div>
                            </button>
                          ))}
                        </div>

                        {/* Painel % do Faturamento */}
                        {depCardAberto==='pct' && (
                          <div className="bg-nodri-surface border border-nodri-cyan/40 rounded-2xl p-4">
                            <h4 className="font-syne font-bold text-[12px] mb-3 text-nodri-cyan">% do Faturamento — como chegamos em {pctFilt}%</h4>
                            <p className="text-[10px] text-nodri-t3 mb-3">Fórmula: Fat. Prof. ÷ Fat. Salão × 100 — mês a mês no período {labelAnos}</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px]">
                                <thead><tr className="border-b border-nodri-border text-nodri-t3 text-[9px] uppercase">
                                  <th className="text-left pb-2">Mês</th><th className="text-right pb-2">Fat. Prof.</th><th className="text-right pb-2">Fat. Salão</th><th className="text-right pb-2">%</th>
                                </tr></thead>
                                <tbody>
                                  {histFiltrado.map((h:any)=>(
                                    <tr key={`pct-${h.ano}-${h.mes}`} className="border-b border-nodri-border/40">
                                      <td className="py-1.5 text-nodri-t2">{MESES[h.mes-1]} {h.ano}</td>
                                      <td className="text-right text-nodri-cyan font-semibold">{fmt$(h.fat_prof)}</td>
                                      <td className="text-right text-nodri-t3">{fmt$(h.fat_total)}</td>
                                      <td className="text-right font-bold" style={{color:corFilt}}>{h.pct}%</td>
                                    </tr>
                                  ))}
                                  <tr className="border-t-2 border-nodri-border font-bold">
                                    <td className="py-2">TOTAL</td>
                                    <td className="text-right text-nodri-cyan">{fmt$(fatProfFilt)}</td>
                                    <td className="text-right text-nodri-t2">{fmt$(fatTotalFilt)}</td>
                                    <td className="text-right" style={{color:corFilt}}>{pctFilt}%</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Painel Faturamento Gerado */}
                        {depCardAberto==='fat' && (
                          <div className="bg-nodri-surface border border-nodri-cyan/40 rounded-2xl p-4">
                            <h4 className="font-syne font-bold text-[12px] mb-3 text-nodri-cyan">Faturamento Gerado — {fmt$(fatProfFilt)}</h4>
                            <p className="text-[10px] text-nodri-t3 mb-3">Fonte: soma de <strong>atendimentos_raw.total</strong> para este profissional no período {labelAnos}</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px]">
                                <thead><tr className="border-b border-nodri-border text-nodri-t3 text-[9px] uppercase">
                                  <th className="text-left pb-2">Mês</th><th className="text-right pb-2">Fat. Prof. (RAW)</th><th className="text-right pb-2">Fat. Salão</th><th className="text-right pb-2">%</th>
                                </tr></thead>
                                <tbody>
                                  {histFiltrado.map((h:any)=>(
                                    <tr key={`fat-${h.ano}-${h.mes}`} className="border-b border-nodri-border/40">
                                      <td className="py-1.5 text-nodri-t2">{MESES[h.mes-1]} {h.ano}</td>
                                      <td className="text-right text-[#5b4fcf] font-semibold">{fmt$(h.fat_prof)}</td>
                                      <td className="text-right text-nodri-t3">{fmt$(h.fat_total)}</td>
                                      <td className="text-right text-nodri-t2">{h.pct}%</td>
                                    </tr>
                                  ))}
                                  <tr className="border-t-2 border-nodri-border font-bold">
                                    <td className="py-2">TOTAL</td>
                                    <td className="text-right text-[#5b4fcf]">{fmt$(fatProfFilt)}</td>
                                    <td className="text-right text-nodri-t2">{fmt$(fatTotalFilt)}</td>
                                    <td className="text-right text-nodri-t2">{pctFilt}%</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Painel Clientes Fiéis */}
                        {depCardAberto==='fieis' && (
                          <div className="bg-nodri-surface border border-nodri-cyan/40 rounded-2xl p-4">
                            <h4 className="font-syne font-bold text-[12px] mb-1 text-nodri-cyan">❤️ Clientes Fiéis — {clientesFieisFilt} clientes</h4>
                            <p className="text-[10px] text-nodri-t3 mb-3">≥4 visitas no salão · ≥80% com este prof. · última visita em {labelAnos}</p>
                            {fieisFiltr.length>0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-[11px]">
                                  <thead><tr className="border-b border-nodri-border text-nodri-t3 text-[9px] uppercase">
                                    <th className="text-left pb-2">Cliente</th><th className="text-right pb-2">Visitas</th><th className="text-right pb-2">c/ Prof.</th><th className="text-right pb-2">%</th><th className="text-right pb-2">Última</th>
                                  </tr></thead>
                                  <tbody>
                                    {fieisFiltr.map((f:any)=>(
                                      <tr key={`fiel-${f.cliente}`} className="border-b border-nodri-border/40">
                                        <td className="py-1.5 font-semibold text-nodri-t1">{f.cliente}</td>
                                        <td className="text-right text-nodri-t2">{f.total}</td>
                                        <td className="text-right text-nodri-t2">{f.comProf}</td>
                                        <td className="text-right font-bold text-amber-500">{f.pct}%</td>
                                        <td className="text-right text-nodri-t3">{f.ultimaVisita||'-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : <p className="text-[11px] text-nodri-t3">Nenhum cliente fiel com última visita em {labelAnos}.</p>}
                          </div>
                        )}

                        {/* Painel Média Mensal */}
                        {depCardAberto==='media' && (
                          <div className="bg-nodri-surface border border-nodri-cyan/40 rounded-2xl p-4">
                            <h4 className="font-syne font-bold text-[12px] mb-3 text-nodri-cyan">Média Mensal — {fmt$(mediaMensalFilt)}</h4>
                            <p className="text-[10px] text-nodri-t3 mb-3">
                              Fórmula: {fmt$(fatProfFilt)} ÷ {mesesFiltComDados} meses com dados = <strong>{fmt$(mediaMensalFilt)}/mês</strong>
                            </p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px]">
                                <thead><tr className="border-b border-nodri-border text-nodri-t3 text-[9px] uppercase">
                                  <th className="text-left pb-2">Mês</th><th className="text-right pb-2">Fat. Prof.</th><th className="text-right pb-2">vs Média</th>
                                </tr></thead>
                                <tbody>
                                  {histFiltrado.filter((h:any)=>h.fat_prof>0).map((h:any)=>{
                                    const diff = h.fat_prof - mediaMensalFilt
                                    return (
                                      <tr key={`med-${h.ano}-${h.mes}`} className="border-b border-nodri-border/40">
                                        <td className="py-1.5 text-nodri-t2">{MESES[h.mes-1]} {h.ano}</td>
                                        <td className="text-right text-[#f43f8e] font-semibold">{fmt$(h.fat_prof)}</td>
                                        <td className={`text-right font-semibold ${diff>=0?'text-green-500':'text-red-400'}`}>{diff>=0?'+':''}{fmt$(diff)}</td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}

                  {/* Gráfico SVG comparativo anual — clique no card do título expande tabela */}
                  {d.historico_completo?.length > 0 && (
                    <GraficoDependencia historico={d.historico_completo} onAnosChange={setAnosDepAtivos}/>
                  )}


                  {/* Glossário / O que fazer */}
                  <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5 space-y-3">
                    <h3 className="font-syne font-bold text-[13px]">📖 Glossário e Parâmetros</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      {[
                        {label:'% de Dependência',       bom:'< 10%',  ok:'10–20%', ruim:'> 20%', critico:'> 30%', desc:'Quanto do faturamento bruto do salão vem deste profissional.'},
                        {label:'Faturamento Gerado',     bom:'—',      ok:'—',      ruim:'—',     critico:'—',     desc:'Soma do campo "total" dos atendimentos brutos (atendimentos_raw) deste profissional no período.'},
                        {label:'Clientes Fiéis ❤️',     bom:'> 20',   ok:'10–20',  ruim:'5–10',  critico:'< 5',   desc:'Clientes com ≥4 visitas no salão, ≥80% dos atendimentos com este prof. e que voltaram nos últimos 90 dias.'},
                        {label:'Média Mensal',           bom:'—',      ok:'—',      ruim:'—',     critico:'—',     desc:'Faturamento gerado total ÷ meses com pelo menos 1 atendimento.'},
                      ].map(g=>(
                        <div key={g.label} className="bg-nodri-card border border-nodri-border rounded-xl p-3">
                          <div className="font-semibold text-nodri-t1 mb-1">{g.label}</div>
                          <div className="text-nodri-t3 text-[10px] mb-2 leading-relaxed">{g.desc}</div>
                          {g.bom!=='—' && (
                            <div className="flex gap-1 flex-wrap text-[9px] font-bold">
                              <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">✅ Bom: {g.bom}</span>
                              <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600">⚠️ Ok: {g.ok}</span>
                              <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">🔶 Alto: {g.ruim}</span>
                              <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600">🚨 Crítico: {g.critico}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 p-3 rounded-xl border" style={{borderColor:`${d.cor_risco||'#10b981'}40`, background:`${d.cor_risco||'#10b981'}08`}}>
                      <p className="text-[11px] font-semibold" style={{color:d.cor_risco||'#10b981'}}>
                        {d.nivel_risco==='critico' && '🚨 Risco CRÍTICO: Redistribua clientes urgentemente, treine substituto e crie estratégia de retenção imediata.'}
                        {d.nivel_risco==='alto'    && '🔶 Risco ALTO: Desenvolva outro profissional com habilidades similares e registre os clientes preferenciais.'}
                        {d.nivel_risco==='medio'   && '⚠️ Risco MODERADO: Monitore a satisfação e garanta que clientes conheçam outros profissionais do salão.'}
                        {d.nivel_risco==='baixo'   && '✅ Baixo risco: O salão está bem distribuído. Mantenha o equilíbrio e continue monitorando mensalmente.'}
                      </p>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/*  OPORTUNIDADES */}
        {tab === 'oportunidades' && (
          <div className="space-y-5 max-w-3xl">
            <div className="flex justify-end">
              <button onClick={() => {
                const d = analiseData.oportunidades
                if (!d) return
                const { wrap } = printBase('Oportunidades')
                const fmtV = (v:number) => `R$ ${(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
                const maisVendeRows = (d.mais_vende||[]).map((item:any,i:number)=>`<tr><td>${i+1}º</td><td><strong>${item.servico}</strong></td><td>${item.quantidade}</td><td>${item.pct}%</td><td>${fmtV(item.valor)}</td></tr>`).join('')
                const deveriaRows = (d.deveria_vender||[]).map((item:any)=>`<tr><td><strong>${item.servico}</strong></td><td>${item.motivo}</td><td>${item.comissao>0?fmtV(item.comissao):'-'}</td></tr>`).join('')
                const nuncaRows = (d.nunca_oferece||[]).map((item:any)=>`<tr><td><strong>${item.servico}</strong></td><td>${item.comissao>0?fmtV(item.comissao):'-'}</td></tr>`).join('')
                const corpo = `${maisVendeRows?`<div class="sec"><div class="sec-title">🏆 Serviços que Mais Vende</div><table class="tbl"><thead><tr><th>#</th><th>Serviço</th><th>Qtd</th><th>%</th><th>Valor</th></tr></thead><tbody>${maisVendeRows}</tbody></table></div>`:''}
${deveriaRows?`<div class="sec"><div class="sec-title">🎯 Serviços que Deveria Vender</div><table class="tbl"><thead><tr><th>Serviço</th><th>Motivo</th><th>Comissão</th></tr></thead><tbody>${deveriaRows}</tbody></table></div>`:''}
${nuncaRows?`<div class="sec"><div class="sec-title">🔴 Serviços que Nunca Oferece</div><table class="tbl"><thead><tr><th>Serviço</th><th>Comissão potencial</th></tr></thead><tbody>${nuncaRows}</tbody></table></div>`:''}`
                abrirImpressao(wrap(corpo))
              }}
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-nodri-border text-nodri-t2 hover:border-nodri-cyan hover:text-nodri-cyan transition-colors">
                🖨️ Imprimir
              </button>
            </div>
            {loadAnalise.oportunidades && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan"/></div>}
            {!loadAnalise.oportunidades && analiseData.oportunidades && (() => {
              const d = analiseData.oportunidades
              return (
                <>
                  {d.mais_vende?.length > 0 && (
                    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
                      <h3 className="font-syne font-bold text-[13px] mb-4"> Serviços que Mais Vende</h3>
                      <div className="space-y-2">
                        {d.mais_vende.map((item:any,i:number) => (
                          <div key={item.servico} className="flex items-center gap-3 p-3 bg-nodri-card rounded-xl border border-nodri-border">
                            <span className="font-syne font-black text-[20px] text-nodri-cyan w-7 text-center">{i+1}</span>
                            <div className="flex-1">
                              <div className="text-[12px] text-nodri-t1 font-semibold">{item.servico}</div>
                              <div className="text-[10px] text-nodri-t3">{item.quantidade} realizações · {item.pct}% do total</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[12px] font-bold text-nodri-green">{fmt$(item.valor)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {d.deveria_vender?.length > 0 && (
                    <div className="bg-nodri-surface border border-amber-500/20 rounded-2xl p-5">
                      <h3 className="font-syne font-bold text-[13px] mb-1 text-amber-400"> Serviços que Deveria Vender</h3>
                      <p className="text-[10px] text-nodri-t3 mb-4">Habilitado mas faz raramente ou nunca oferece</p>
                      <div className="space-y-2">
                        {d.deveria_vender.map((item:any) => (
                          <div key={item.servico} className="flex items-center gap-3 p-3 bg-nodri-card rounded-xl border border-amber-500/15">
                            <span className="text-[18px]">{item.qtd_historico === 0 ? '' : '️'}</span>
                            <div className="flex-1">
                              <div className="text-[12px] text-nodri-t1 font-semibold">{item.servico}</div>
                              <div className="text-[10px] text-nodri-t3">{item.motivo}</div>
                            </div>
                            {item.comissao > 0 && (
                              <div className="text-[11px] font-bold text-amber-400">{fmt$(item.comissao)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {d.nunca_oferece?.length > 0 && (
                    <div className="bg-nodri-surface border border-red-500/15 rounded-2xl p-5">
                      <h3 className="font-syne font-bold text-[13px] mb-1 text-red-400"> Serviços que Nunca Oferece</h3>
                      <p className="text-[10px] text-nodri-t3 mb-4">Habilitado mas sem nenhum registro histórico</p>
                      <div className="grid grid-cols-2 gap-2">
                        {d.nunca_oferece.map((item:any) => (
                          <div key={item.servico} className="p-3 bg-nodri-card rounded-xl border border-red-500/10">
                            <div className="text-[11px] text-nodri-t1 font-semibold">{item.servico}</div>
                            {item.comissao > 0 && <div className="text-[10px] text-red-400 mt-0.5">{fmt$(item.comissao)}/comissão</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!d.mais_vende?.length && !d.deveria_vender?.length && !d.nunca_oferece?.length && (
                    <div className="text-center py-16 text-nodri-t3">
                      <span className="text-4xl"></span>
                      <p className="text-[13px] mt-3">Nenhum dado disponível. Verifique os serviços habilitados.</p>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {/*  BUNDLE */}
        {tab === 'bundle' && (
          <div className="space-y-5 max-w-3xl">
            <div className="flex justify-end">
              <button onClick={() => {
                const d = analiseData.bundle
                if (!d) return
                const { wrap } = printBase('Bundles')
                const paresRows = (d.pares||[]).map((par:any,i:number)=>`<tr><td>${i+1}º</td><td><strong>${par.servico_a}</strong></td><td><strong>${par.servico_b}</strong></td><td style="font-weight:700;color:${par.pct>=70?'#22c55e':par.pct>=40?'#f59e0b':'#5b4fcf'}">${par.pct}%</td><td>${par.count} clientes</td></tr>`).join('')
                const corpo = `<div class="sec"><div class="sec-title">🔗 Pares de Serviços com Alta Co-ocorrência</div>
<p style="font-size:9pt;color:#666;margin-bottom:10px">Análise de ${d.total_comandas||0} comandas · Pares com ≥20% de co-ocorrência</p>
${paresRows?`<table class="tbl"><thead><tr><th>#</th><th>Serviço A</th><th>Serviço B</th><th>Co-ocorrência</th><th>Clientes</th></tr></thead><tbody>${paresRows}</tbody></table>
<p style="font-size:9pt;color:#5b4fcf;font-weight:600;margin-top:12px">💡 Estratégia: Ofereça o Serviço B para clientes que vieram para o Serviço A</p>`:'<p style="color:#888">Dados insuficientes para análise de bundles.</p>'}
</div>`
                abrirImpressao(wrap(corpo))
              }}
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-nodri-border text-nodri-t2 hover:border-nodri-cyan hover:text-nodri-cyan transition-colors">
                🖨️ Imprimir
              </button>
            </div>
            {loadAnalise.bundle && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-nodri-cyan"/></div>}
            {!loadAnalise.bundle && analiseData.bundle && (() => {
              const d = analiseData.bundle
              if (!d.pares?.length) return (
                <div className="text-center py-16 text-nodri-t3">
                  <span className="text-4xl"></span>
                  <p className="text-[13px] mt-3">Dados insuficientes para análise de bundles.</p>
                  {d.total_comandas > 0 && <p className="text-[11px] mt-2">{d.total_comandas} comandas analisadas</p>}
                </div>
              )
              return (
                <>
                  <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-4">
                    <p className="text-[11px] text-nodri-t3"> Análise de {d.total_comandas} comandas · Pares com ≥20% de co-ocorrência</p>
                  </div>
                  <div className="space-y-3">
                    {d.pares.map((par:any,i:number) => (
                      <div key={i} className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[12px] text-nodri-cyan font-bold">{par.servico_a}</span>
                              <span className="text-nodri-t3">+</span>
                              <span className="text-[12px] text-nodri-pink font-bold">{par.servico_b}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-syne font-black text-[24px]" style={{color: par.pct>=70?'#22c55e':par.pct>=40?'#f59e0b':'#5b4fcf'}}>{par.pct}%</div>
                            <div className="text-[9px] text-nodri-t3">co-ocorrência</div>
                          </div>
                        </div>
                        <div className="w-full bg-nodri-border rounded-full h-2 overflow-hidden mb-2">
                          <div className="h-2 rounded-full" style={{width:`${par.pct}%`,background:`linear-gradient(90deg,#5b4fcf,#5b4fcf)`}}/>
                        </div>
                        <p className="text-[10px] text-nodri-t3">
                          {par.count} clientes fazem os dois serviços juntos
                        </p>
                        <p className="text-[10px] text-nodri-cyan mt-1 font-semibold"> Ofereça <strong>{par.servico_b}</strong> para quem veio para <strong>{par.servico_a}</strong></p>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/*  CLIENTES PERDIDOS */}
        {tab === 'clientes-perdidos' && (
          <div className="space-y-5">

            {/* Filtro de período */}
            <div className="rounded-xl p-4 flex flex-wrap items-end gap-3" style={{ background: '#ffffff', border: '1.5px solid #e0ddd8' }}>
              <div>
                <div className="text-[10px] font-bold uppercase mb-1" style={{ color: '#767069' }}>De</div>
                <input type="date"
                  value={perdidosDataInicio.split('/').reverse().join('-')}
                  onChange={e => { const [y,m,d] = e.target.value.split('-'); setPerdidosDataInicio(`${d}/${m}/${y}`) }}
                  className="rounded-lg px-3 py-1.5 text-[12px] outline-none"
                  style={{ border: '1.5px solid #e0ddd8', background: '#f8f7f5', color: '#1a1a1a' }} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase mb-1" style={{ color: '#767069' }}>Até</div>
                <input type="date"
                  value={perdidosDataFim.split('/').reverse().join('-')}
                  onChange={e => { const [y,m,d] = e.target.value.split('-'); setPerdidosDataFim(`${d}/${m}/${y}`) }}
                  className="rounded-lg px-3 py-1.5 text-[12px] outline-none"
                  style={{ border: '1.5px solid #e0ddd8', background: '#f8f7f5', color: '#1a1a1a' }} />
              </div>
              <button onClick={() => buscarClientesPerdidos(perdidosDataInicio, perdidosDataFim)}
                className="px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:brightness-110"
                style={{ background: '#5b4fcf', color: '#ffffff' }}>
                Buscar
              </button>
              <div className="flex gap-2 ml-auto flex-wrap">
                {[
                  { label: 'Este ano', de: `01/01/${anoAtual}`, ate: `31/12/${anoAtual}` },
                  { label: 'Ano passado', de: `01/01/${anoAtual - 1}`, ate: `31/12/${anoAtual - 1}` },
                  { label: '2 anos', de: `01/01/${anoAtual - 1}`, ate: `31/12/${anoAtual}` },
                  { label: 'Tudo', de: `01/01/2019`, ate: `31/12/${anoAtual}` },
                ].map(op => (
                  <button key={op.label} onClick={() => { setPerdidosDataInicio(op.de); setPerdidosDataFim(op.ate); buscarClientesPerdidos(op.de, op.ate) }}
                    className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
                    style={{ background: perdidosDataInicio === op.de && perdidosDataFim === op.ate ? '#5b4fcf' : '#f0eefb', color: perdidosDataInicio === op.de && perdidosDataFim === op.ate ? '#ffffff' : '#5b4fcf' }}>
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            {loadClientesPerdidos && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={28} className="animate-spin" style={{ color: '#5b4fcf' }}/>
                <p className="text-[12px]" style={{ color: '#767069' }}>Analisando clientes de <strong>{perdidosDataInicio}</strong> até <strong>{perdidosDataFim}</strong>...</p>
              </div>
            )}
            {!loadClientesPerdidos && clientesPerdidos && (() => {
              const cp = clientesPerdidos
              const cargo = prof?.cargo || 'profissional'
              const ticketMedio = cp.ticket_medio || 0
              const ticketVisita = cp.ticket_visita || ticketMedio
              const comissaoMedia = cp.comissao_media || 0
              const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

              function exportarExcel(lista: any[], filename: string) {
                const linhas = ['sep=;\nCliente;Celular']
                for (const r of lista) linhas.push(`${r.cliente};${r.celular || ''}`)
                const blob = new Blob([linhas.join('\n')], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
                URL.revokeObjectURL(url)
              }

              const subTabs = [
                { id: 'outra-categoria' as const, label: `🚨 Outra ${cargo}`, count: cp.outra_manicure?.length || 0, cor: '#ef4444' },
                { id: 'outro-servico' as const, label: '↔️ Outro serviço', count: cp.outro_servico?.length || 0, cor: '#f59e0b' },
                { id: 'saiu-salao' as const, label: '👻 Saíram do salão', count: cp.saiu_salao?.length || 0, cor: '#6b7280' },
              ]

              const listaBase = subTabPerdidos === 'outra-categoria'
                ? (cp.outra_manicure || [])
                : subTabPerdidos === 'outro-servico'
                ? (cp.outro_servico || [])
                : (cp.saiu_salao || [])

              // Ordenação
              type SortKey = 'ultima_visita_com_prof' | 'ultima_visita_salao' | 'dias_ausente' | 'cliente'
              const sortKey = sortKeyPerdidos
              const sortAsc = sortAscPerdidos

              function toggleSort(key: SortKey) {
                if (sortKeyPerdidos === key) setSortAscPerdidos(a => !a)
                else { setSortKeyPerdidos(key); setSortAscPerdidos(false) }
              }

              function parseBR(d: string): number {
                if (!d || d === '—') return 0
                const p = d.split('/')
                if (p.length !== 3) return 0
                return new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime()
              }

              const listaAtual = [...listaBase].sort((a: any, b: any) => {
                let cmp = 0
                if (sortKey === 'ultima_visita_com_prof') cmp = parseBR(a.ultima_visita_com_prof) - parseBR(b.ultima_visita_com_prof)
                else if (sortKey === 'ultima_visita_salao') cmp = parseBR(a.ultima_visita_salao) - parseBR(b.ultima_visita_salao)
                else if (sortKey === 'dias_ausente') cmp = (a.dias_ausente || 0) - (b.dias_ausente || 0)
                else cmp = a.cliente.localeCompare(b.cliente)
                return sortAsc ? cmp : -cmp
              })

              function ThSort({ label, col }: { label: string; col: SortKey }) {
                const active = sortKey === col
                return (
                  <th onClick={() => toggleSort(col)}
                    className="text-left px-4 py-2 text-nodri-t3 font-semibold cursor-pointer select-none hover:text-nodri-t2 whitespace-nowrap">
                    {label} {active ? (sortAsc ? '↑' : '↓') : <span className="opacity-30">↕</span>}
                  </th>
                )
              }

              const qtdOutraCategoria = cp.outra_manicure?.length || 0
              const qtdOutroServico = cp.outro_servico?.length || 0
              const qtdSaiuSalao = cp.saiu_salao?.length || 0
              const perdaTotalSalao = (qtdOutroServico + qtdSaiuSalao) * ticketVisita
              const perdaTotalProf = (qtdOutraCategoria + qtdSaiuSalao) * comissaoMedia

              return (
                <>
                  {/* 4 cards sempre em 2×2 */}
                  <div className="grid grid-cols-2 gap-3">
                    {subTabs.map(st => {
                      const qtd = st.count
                      const isOutraCategoria = st.id === 'outra-categoria'
                      const isOutroServico = st.id === 'outro-servico'
                      const isSaiuSalao = st.id === 'saiu-salao'
                      return (
                        <button key={st.id} onClick={() => setSubTabPerdidos(st.id)}
                          className={`rounded-xl p-3 text-left transition-all border-2 ${subTabPerdidos===st.id?'border-nodri-cyan bg-nodri-surface':'border-nodri-border bg-nodri-surface hover:border-nodri-t3'}`}>
                          <div className="text-[10px] text-nodri-t3 mb-0.5 leading-tight">{st.label}</div>
                          <div className="font-syne font-black text-[22px] leading-none" style={{color: st.cor}}>{qtd}</div>
                          <div className="text-[9px] text-nodri-t3 mb-2">clientes</div>
                          {isOutraCategoria && comissaoMedia > 0 && (
                            <div className="border-t border-nodri-border pt-1.5 space-y-0.5">
                              <div className="flex justify-between text-[9px]">
                                <span className="text-nodri-t3">💔 Perda sua</span>
                                <span className="text-red-400 font-bold">{fmt(qtd * comissaoMedia)}</span>
                              </div>
                              <div className="text-[8px] text-nodri-t3">comissão {fmt(comissaoMedia)}</div>
                            </div>
                          )}
                          {isOutroServico && ticketVisita > 0 && (
                            <div className="border-t border-nodri-border pt-1.5 space-y-0.5">
                              <div className="flex justify-between text-[9px]">
                                <span className="text-nodri-t3">💸 Perda do salão</span>
                                <span className="text-orange-400 font-bold">{fmt(qtd * ticketVisita)}</span>
                              </div>
                              <div className="text-[8px] text-nodri-t3">ticket {fmt(ticketVisita)}</div>
                            </div>
                          )}
                          {isSaiuSalao && ticketVisita > 0 && (
                            <div className="border-t border-nodri-border pt-1.5 space-y-0.5">
                              <div className="flex justify-between text-[9px]">
                                <span className="text-nodri-t3">💸 Perda do salão</span>
                                <span className="text-orange-400 font-bold">{fmt(qtd * ticketVisita)}</span>
                              </div>
                              {comissaoMedia > 0 && (
                                <div className="flex justify-between text-[9px]">
                                  <span className="text-nodri-t3">💔 Perda sua</span>
                                  <span className="text-red-400 font-bold">{fmt(qtd * comissaoMedia)}</span>
                                </div>
                              )}
                              <div className="text-[8px] text-nodri-t3">visita {fmt(ticketVisita)}</div>
                            </div>
                          )}
                        </button>
                      )
                    })}

                    {/* 4º card: totalizador — ocupa a célula restante */}
                    {(perdaTotalSalao > 0 || perdaTotalProf > 0) && (
                      <div className="rounded-xl p-3 border-2 border-nodri-border bg-nodri-surface">
                        <div className="text-[10px] text-nodri-t3 mb-0.5">📊 Impacto total</div>
                        <div className="font-syne font-black text-[22px] leading-none text-white">{cp.total}</div>
                        <div className="text-[9px] text-nodri-t3 mb-2">clientes perdidos</div>
                        <div className="border-t border-nodri-border pt-1.5 space-y-0.5">
                          {perdaTotalSalao > 0 && (
                            <div className="flex justify-between text-[9px]">
                              <span className="text-nodri-t3">💸 Perda salão</span>
                              <span className="text-orange-400 font-bold">{fmt(perdaTotalSalao)}</span>
                            </div>
                          )}
                          {perdaTotalProf > 0 && (
                            <div className="flex justify-between text-[9px]">
                              <span className="text-nodri-t3">💔 Perda sua</span>
                              <span className="text-red-400 font-bold">{fmt(perdaTotalProf)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sub-tabs nav */}
                  <div className="overflow-x-auto border-b border-nodri-border">
                    <div className="flex min-w-max">
                    {subTabs.map(st => (
                      <button key={st.id} onClick={() => setSubTabPerdidos(st.id)}
                        className={`px-4 py-2 text-[11px] font-semibold border-b-2 transition-all whitespace-nowrap ${subTabPerdidos===st.id?'border-nodri-cyan text-nodri-cyan':'border-transparent text-nodri-t3 hover:text-nodri-t2'}`}>
                        {st.label} ({st.count})
                      </button>
                    ))}
                    </div>
                  </div>

                  {/* Tabela */}
                  {listaAtual.length === 0 ? (
                    <div className="text-center py-14 text-nodri-t3">
                      <span className="text-4xl">✅</span>
                      <p className="text-[13px] mt-3">Nenhum cliente nesta categoria.</p>
                    </div>
                  ) : (
                    <div className="bg-nodri-surface border border-nodri-border rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-nodri-border">
                        <span className="text-[12px] font-semibold text-nodri-t2">{listaAtual.length} clientes</span>
                        <button onClick={() => exportarExcel(listaAtual, `clientes-perdidos-${subTabPerdidos}.csv`)}
                          className="text-[11px] bg-nodri-cyan text-nodri-bg px-3 py-1 rounded-lg font-semibold hover:opacity-80">
                          Exportar Excel
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="border-b border-nodri-border">
                              <ThSort label="Cliente" col="cliente" />
                              <th className="text-left px-4 py-2 text-nodri-t3 font-semibold">Último serviço aqui</th>
                              <ThSort label="Última vez com você" col="ultima_visita_com_prof" />
                              <ThSort label="Última no salão" col="ultima_visita_salao" />
                              {subTabPerdidos === 'outra-categoria' && <th className="text-left px-4 py-2 text-nodri-t3 font-semibold">Migrou para</th>}
                              {subTabPerdidos === 'outro-servico' && <th className="text-left px-4 py-2 text-nodri-t3 font-semibold">Vai agora com</th>}
                              {subTabPerdidos === 'saiu-salao' && <ThSort label="Dias ausente" col="dias_ausente" />}
                              <th className="text-left px-4 py-2 text-nodri-t3 font-semibold">Faz agora</th>
                              <th className="text-left px-4 py-2 text-nodri-t3 font-semibold">Celular</th>
                            </tr>
                          </thead>
                          <tbody>
                            {listaAtual.map((r: any, i: number) => (
                              <tr key={i} className={`border-b border-nodri-border last:border-0 ${i%2===0?'bg-transparent':'bg-nodri-bg/30'}`}>
                                <td className="px-4 py-2 font-semibold text-nodri-t2">{r.cliente}</td>
                                <td className="px-4 py-2 text-nodri-t3">{r.ultimo_servico_com_prof || '—'}</td>
                                <td className="px-4 py-2 text-nodri-t3 whitespace-nowrap">{r.ultima_visita_com_prof}</td>
                                <td className="px-4 py-2 text-nodri-cyan whitespace-nowrap font-semibold">{r.ultima_visita_salao || '—'}</td>
                                {subTabPerdidos === 'outra-categoria' && (
                                  <td className="px-4 py-2 text-red-400 font-semibold">{r.migrou_para || '—'}</td>
                                )}
                                {subTabPerdidos === 'outro-servico' && (
                                  <td className="px-4 py-2 text-nodri-t2">{r.vai_agora_com || '—'}</td>
                                )}
                                {subTabPerdidos === 'saiu-salao' && (
                                  <td className="px-4 py-2">
                                    <span className={`font-bold ${r.dias_ausente>180?'text-red-400':r.dias_ausente>120?'text-orange-400':'text-yellow-400'}`}>
                                      {r.dias_ausente}d
                                    </span>
                                  </td>
                                )}
                                <td className="px-4 py-2 text-nodri-t3">{r.faz_agora || '—'}</td>
                                <td className="px-4 py-2 text-nodri-t3">{r.celular || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

      </div>
    </div>
  )
}
