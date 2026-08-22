'use client'

// Lista mensal de um serviço (Realinhamento, Corte, Mechas, Pigmentação).
// Extraído do Salão Administrativo sem alteração de comportamento, para que a
// página do SETOR também possa abrir a mesma lista.

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Save, Plus, Minus, X, MessageCircle, Send, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { getLogoSalao } from '@/lib/logoSalao'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

export interface ProfSalao { id: string; nome: string; telefone: string }
interface Coluna { id: string; nome: string; telefone: string }
interface Obs { id: string; profissional_id: string; profissional_nome: string; tipo: 'positivo' | 'negativo'; texto: string; enviado?: boolean; criado_em?: string; feedback_id?: string; editando?: boolean; orig?: { profissional_id: string; profissional_nome: string; tipo: 'positivo' | 'negativo'; texto: string } }
interface Doc { colunas: Coluna[]; cells: Record<string, number>; obs?: Obs[] }

function mesAtual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function diasNoMes(mes: string) { const [y, m] = mes.split('-').map(Number); return new Date(y, m, 0).getDate() }

// onMensagem e opcional: no Salao Administrativo ele recarrega o historico de
// mensagens; dentro do setor esse historico nao existe, entao nao e passado.
export default function ListaServico({ servico, label, profsSalao, onMensagem }: { servico: string; label: string; profsSalao: ProfSalao[]; onMensagem?: () => void }) {
  const [mes, setMes] = useState(mesAtual())
  const [doc, setDoc] = useState<Doc>({ colunas: [], cells: {} })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Lista de serviços') // avisa "Deseja salvar?" antes de sair sem salvar
  const [addOpen, setAddOpen] = useState(false)
  const [msgProf, setMsgProf] = useState<Coluna | null>(null)
  const [msgTexto, setMsgTexto] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/listas?servico=${servico}&mes=${mes}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.colunas)) setDoc({ colunas: d.colunas, cells: d.cells || {}, obs: Array.isArray(d.obs) ? d.obs : [] })
      else setDoc({ colunas: [], cells: {}, obs: [] })
    } catch { setDoc({ colunas: [], cells: {}, obs: [] }) }
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

  // ── Observações → Feedback do Profissional ──
  const [salvandoObs, setSalvandoObs] = useState(false)
  const obsList = doc.obs || []
  function addObs() { mut(d => { if (!d.obs) d.obs = []; d.obs.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), profissional_id: '', profissional_nome: '', tipo: 'negativo', texto: '' }) }) }
  function updObs(id: string, patch: Partial<Obs>) { mut(d => { const o = (d.obs || []).find(x => x.id === id); if (o && (!o.enviado || o.editando)) Object.assign(o, patch) }) }
  function delObs(id: string) { mut(d => { d.obs = (d.obs || []).filter(x => x.id !== id) }) }

  function editarObs(id: string) {
    mut(d => {
      const o = (d.obs || []).find(x => x.id === id); if (!o) return
      o.orig = { profissional_id: o.profissional_id, profissional_nome: o.profissional_nome, tipo: o.tipo, texto: o.texto }
      o.editando = true
    })
  }
  function cancelarEdicaoObs(id: string) {
    mut(d => {
      const o = (d.obs || []).find(x => x.id === id); if (!o) return
      if (o.orig) { o.profissional_id = o.orig.profissional_id; o.profissional_nome = o.orig.profissional_nome; o.tipo = o.orig.tipo; o.texto = o.orig.texto }
      delete o.orig; o.editando = false
    })
  }

  async function salvarEdicaoObs(id: string) {
    const o = obsList.find(x => x.id === id)
    if (!o || !o.feedback_id) return
    if (!o.profissional_nome || !o.texto.trim()) { toast('Preencha o profissional e a descrição', { icon: '' }); return }
    setSalvandoObs(true)
    try {
      const res = await fetch('/api/feedback-prof/respostas', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: o.feedback_id, profissional_nome: o.profissional_nome, tipo: o.tipo, descricao: o.texto }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d?.error || 'Erro ao salvar alteração'); setSalvandoObs(false); return }
      const novoDoc: Doc = JSON.parse(JSON.stringify(doc))
      const alvo = (novoDoc.obs || []).find(x => x.id === id)
      if (alvo) { alvo.editando = false; delete alvo.orig }
      setDoc(novoDoc)
      await fetch('/api/salon/listas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servico, mes, doc: novoDoc }) })
      toast.success('Observação atualizada no Feedback do Profissional!')
    } catch { toast.error('Erro de conexão') }
    setSalvandoObs(false)
  }

  async function excluirObs(id: string) {
    const o = obsList.find(x => x.id === id)
    if (!o) return
    if (!confirm('Excluir esta observação? Ela também será removida do Feedback do Profissional.')) return
    try {
      if (o.feedback_id) {
        const res = await fetch('/api/feedback-prof/respostas', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: o.feedback_id }),
        })
        if (!res.ok) { const d = await res.json().catch(() => null); toast.error(d?.error || 'Erro ao excluir do feedback'); return }
      }
      const novoDoc: Doc = JSON.parse(JSON.stringify(doc))
      novoDoc.obs = (novoDoc.obs || []).filter(x => x.id !== id)
      setDoc(novoDoc)
      await fetch('/api/salon/listas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servico, mes, doc: novoDoc }) })
      toast.success('Observação excluída!')
    } catch { toast.error('Erro de conexão') }
  }

  async function salvarObs() {
    const pendentes = obsList.filter(o => !o.enviado && o.profissional_nome && o.texto.trim())
    if (pendentes.length === 0) { toast('Preencha o profissional e a descrição antes de salvar', { icon: '' }); return }
    setSalvandoObs(true)
    try {
      const res = await fetch('/api/salon/listas/observacoes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lista_label: label, observacoes: pendentes.map(o => ({ profissional_id: o.profissional_id, profissional_nome: o.profissional_nome, tipo: o.tipo, descricao: o.texto })) }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d?.error || 'Erro ao enviar'); setSalvandoObs(false); return }
      // marca como enviadas (guardando o id no feedback p/ editar/excluir) e persiste
      const idsFeedback: string[] = Array.isArray(d.ids) ? d.ids : []
      const posPorId = new Map(pendentes.map((o, i) => [o.id, i]))
      const novoDoc: Doc = JSON.parse(JSON.stringify(doc))
      novoDoc.obs = (novoDoc.obs || []).map(o => posPorId.has(o.id)
        ? { ...o, enviado: true, criado_em: new Date().toISOString(), feedback_id: idsFeedback[posPorId.get(o.id)!] }
        : o)
      setDoc(novoDoc)
      await fetch('/api/salon/listas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servico, mes, doc: novoDoc }) })
      toast.success(`${pendentes.length} observação(ões) enviada(s) para o Feedback do Profissional!`)
    } catch { toast.error('Erro de conexão') }
    setSalvandoObs(false)
  }

  /**
   * Telefone ATUAL do profissional, não o que ficou salvo na coluna.
   *
   * A coluna guarda uma cópia de quando o profissional entrou na lista. Quem
   * foi adicionado antes de ter telefone no cadastro ficava marcado como "sem
   * telefone" para sempre — a mensagem não saía nunca, mesmo com o número já
   * preenchido na ficha dele.
   */
  function telefoneDe(c: Coluna): string {
    const noCadastro = profsSalao.find(p => p.id === c.id)?.telefone
    return String(noCadastro || c.telefone || '').trim()
  }

  function abrirMsg(c: Coluna) {
    const total = totalDe(c.id)
    const diff = media - total
    const serv = label.toLowerCase()
    let txt: string
    if (diff > 0) txt = `Olá *${c.nome}*! \n\nNeste mês você atendeu *${total}* de ${serv}, enquanto a média do salão é *${media}*. Isso são *${diff}* a menos.\n\nSei que pode ser por conta da sua logística pessoal e de tempo. Quer que eu ajuste sua agenda, abrindo mais horários para clientes sem preferência de profissional? O que você acha que ajudaria?\n\nConte comigo!`
    else txt = `Olá *${c.nome}*! \n\nNeste mês você atendeu *${total}* de ${serv}, ${total > media ? 'acima da' : 'na'} média do salão (*${media}*). Parabéns pelo empenho, continue assim!`
    setMsgTexto(txt); setMsgProf(c)
  }
  async function enviarMsg() {
    if (!msgProf) return
    const fone = telefoneDe(msgProf).replace(/\D/g, '')
    if (fone) { const numero = fone.startsWith('55') ? fone : '55' + fone; window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msgTexto)}`, '_blank') }
    else toast('Sem telefone no cadastro — mensagem só será registrada.', { icon: '' })

    const total = totalDe(msgProf.id)
    try {
      await fetch('/api/salon/listas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem: { servico: label, mes, prof: msgProf.nome, total, media, texto: msgTexto } }) })

      // ── Vai também para o Feedback do Profissional ────────────────────────
      //
      // Conversa de produção é ato de gestão: fica registrado que o salão viu
      // o número, procurou a pessoa e ofereceu ajuda. Na avaliação (e num
      // eventual desligamento) isso vale mais do que a lembrança de alguém.
      //
      // Entra como ACOMPANHAMENTO: nem elogio nem ocorrência. Atender abaixo
      // da média não é falta cometida, e marcar como positivo inflaria os
      // elogios de quem justamente precisa de atenção. O texto gravado é
      // exatamente o que a pessoa recebeu no WhatsApp, para não existir uma
      // versão "de gaveta" diferente da que ela leu.
      await fetch('/api/salon/listas/observacoes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lista_label: label,
          observacoes: [{
            profissional_id: msgProf.id,
            profissional_nome: msgProf.nome,
            tipo: 'acompanhamento',
            descricao: msgTexto,
          }],
        }),
      }).catch(() => { /* o registro no relatório já foi feito */ })

      toast.success('Registrado no relatório e no Feedback do Profissional'); onMensagem?.()
    } catch { /* */ }
    setMsgProf(null)
  }

  async function imprimir() {
    const logoSalao = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const head = doc.colunas.map(c => `<th>${esc(c.nome)}</th>`).join('')
    let body = ''
    for (let d = 1; d <= dias; d++) body += `<tr><td class="dia">${d}</td>${doc.colunas.map(c => `<td>${doc.cells[`${d}-${c.id}`] || ''}</td>`).join('')}</tr>`
    const tot = doc.colunas.map((c, i) => `<td><b>${totais[i]}</b></td>`).join('')
    const cab = logoSalao ? `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #5b4fcf;padding-bottom:8px;margin-bottom:10px"><img src="${logoSalao}" style="max-height:54px;max-width:190px;object-fit:contain"/><span style="font-size:10px;color:#777">${new Date().toLocaleDateString('pt-BR')}</span></div>` : ''
    const css = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px}h1{text-align:center;font-size:15px;margin-bottom:8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #f0ede6;text-align:center;padding:4px 5px}th{background:#f6f4ff;color:#5b4fcf;border-bottom:2px solid #5b4fcf;font-size:10px;text-transform:uppercase;letter-spacing:.3px}.dia{background:#faf9f7;color:#6b6860;font-weight:700}tfoot td{background:#f6f4ff;color:#5b4fcf;font-weight:800;border-top:2px solid #5b4fcf}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(label)}</title><style>${css}</style></head><body>${cab}<h1>${esc(label.toUpperCase())} — ${esc(mes.split('-').reverse().join('/'))}</h1><table><thead><tr><th>DIA</th>${head}</tr></thead><tbody>${body}</tbody><tfoot><tr><td>TOT</td>${tot}</tr></tfoot></table><script>window.onload=function(){window.print()}</script></body></html>`
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
                disponiveis.map(p => <button key={p.id} onClick={() => addProf(p)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, borderRadius: 6 }} onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{p.nome}{!String(p.telefone || '').trim() && <span style={{ color: '#f59e0b', fontSize: 10 }}> (sem tel)</span>}</button>)}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>

      <div style={{ fontSize: 12, color: '#6b6860', marginBottom: 10 }}>
        Clique em <strong style={{ color: '#16a34a' }}>+</strong> para somar um atendimento. O <span style={{ color: '#ef4444', fontWeight: 800 }}>É A VEZ</span> aponta quem tem menos atendimentos (rodízio justo, da esquerda p/ direita). Média do salão: <strong>{media}</strong>.
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
                  <th style={{ ...thSt, width: 44, position: 'sticky', left: 0, background: '#faf9f7', zIndex: 2 }}>DIA</th>
                  {doc.colunas.map((c, i) => (
                    <th key={c.id} style={{ ...thSt, background: proximoIdx === i ? '#fef2f2' : '#faf9f7', borderTop: proximoIdx === i ? '3px solid #ef4444' : undefined }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        {proximoIdx === i && <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', background: '#ef4444', borderRadius: 10, padding: '1px 7px' }}>É A VEZ</span>}
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
                    <td style={{ ...tdSt, fontWeight: 700, background: '#faf9f7', color: '#6b6860', position: 'sticky', left: 0, zIndex: 1 }}>{d}</td>
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
                  <td style={{ ...tdSt, fontWeight: 800, background: '#f6f4ff', color: '#5b4fcf', borderTop: '2px solid #e8e6e0', position: 'sticky', left: 0 }}>TOT</td>
                  {doc.colunas.map((c, i) => <td key={c.id} style={{ ...tdSt, fontWeight: 900, fontSize: 15, background: '#f6f4ff', color: '#5b4fcf', borderTop: '2px solid #e8e6e0' }}>{totais[i]}</td>)}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

      {/* ── Observações no fim da lista → Feedback do Profissional ── */}
      {!loading && (
        <div style={{ marginTop: 18, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a' }}>Observações</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>— vão automaticamente para o Feedback do Profissional ao salvar</span>
          </div>
          <p style={{ fontSize: 11.5, color: '#6b6860', margin: '0 0 12px' }}>Escolha o profissional, descreva o ocorrido, marque Positivo ou Negativo e clique em salvar.</p>

          {obsList.map(o => {
            const travada = !!o.enviado && !o.editando
            return (
            <div key={o.id} style={{ border: o.enviado ? '1px solid #bbf7d0' : '1px solid #e8e6e0', background: o.editando ? '#fffbeb' : o.enviado ? '#f0fdf4' : '#faf9f7', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <select value={o.profissional_id} disabled={travada}
                  onChange={e => { const p = doc.colunas.find(x => x.id === e.target.value); updObs(o.id, { profissional_id: e.target.value, profissional_nome: p?.nome || '' }) }}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, fontWeight: 700, minWidth: 200, background: '#fff', cursor: travada ? 'default' : 'pointer' }}>
                  <option value="">Selecione o profissional...</option>
                  {/* dinâmico: só quem está NESTA lista (colunas acima) */}
                  {doc.colunas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  {/* se o selecionado saiu da lista, mantém visível para não perder o rascunho */}
                  {o.profissional_id && !doc.colunas.some(c => c.id === o.profissional_id) && <option value={o.profissional_id}>{o.profissional_nome}</option>}
                </select>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => updObs(o.id, { tipo: 'positivo' })} disabled={travada}
                    style={{ padding: '7px 12px', borderRadius: 8, border: o.tipo === 'positivo' ? 'none' : '1.5px solid #d0cdc7', background: o.tipo === 'positivo' ? '#16a34a' : '#fff', color: o.tipo === 'positivo' ? '#fff' : '#6b6860', fontSize: 12, fontWeight: 800, cursor: travada ? 'default' : 'pointer' }}>
                    Positivo
                  </button>
                  <button onClick={() => updObs(o.id, { tipo: 'negativo' })} disabled={travada}
                    style={{ padding: '7px 12px', borderRadius: 8, border: o.tipo === 'negativo' ? 'none' : '1.5px solid #d0cdc7', background: o.tipo === 'negativo' ? '#ef4444' : '#fff', color: o.tipo === 'negativo' ? '#fff' : '#6b6860', fontSize: 12, fontWeight: 800, cursor: travada ? 'default' : 'pointer' }}>
                    Negativo
                  </button>
                </div>
                <div style={{ flex: 1 }} />
                {!o.enviado && <button onClick={() => delObs(o.id)} title="Remover observação" style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: 4 }}><X size={15} /></button>}
                {travada && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a' }}>✓ Enviado {o.criado_em ? `· ${new Date(o.criado_em).toLocaleDateString('pt-BR')}` : ''}</span>
                    {o.feedback_id && (
                      <button onClick={() => editarObs(o.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                        Editar
                      </button>
                    )}
                    <button onClick={() => excluirObs(o.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                      Excluir
                    </button>
                  </span>
                )}
              </div>
              {travada
                ? <div style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '8px 10px', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 8 }}>{o.texto}</div>
                : <textarea value={o.texto} onChange={e => updObs(o.id, { texto: e.target.value })} rows={3} placeholder="Descreva o que aconteceu..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} />}
              {o.editando && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => salvarEdicaoObs(o.id)} disabled={salvandoObs} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
                    {salvandoObs ? '...' : <><Save size={13} /> Salvar alterações</>}
                  </button>
                  <button onClick={() => cancelarEdicaoObs(o.id)} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
            )
          })}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <button onClick={addObs} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 8, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
              <Plus size={14} /> Nova observação
            </button>
            {obsList.some(o => !o.enviado) && (
              <button onClick={salvarObs} disabled={salvandoObs} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                {salvandoObs ? '...' : <><Send size={14} /> Salvar e enviar ao feedback</>}
              </button>
            )}
          </div>
        </div>
      )}

      {msgProf && (
        <div onClick={() => setMsgProf(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Mensagem para {msgProf.nome}</h3>
              <button onClick={() => setMsgProf(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <textarea value={msgTexto} onChange={e => setMsgTexto(e.target.value)} rows={8} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #d0cdc7', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, marginBottom: 8 }} />
            {!telefoneDe(msgProf) && <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 8px' }}>Sem telefone — o WhatsApp não abre, mas o registro é feito do mesmo jeito.</p>}
            <p style={{ fontSize: 11, color: '#6b6860', margin: '0 0 8px' }}>
              Entra no <b>Feedback do Profissional</b> como <b>acompanhamento</b>, com este mesmo texto — fica documentado que a gestão orientou, sem contar como elogio nem como ocorrência.
            </p>
            <button onClick={enviarMsg} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Send size={16} /> Enviar e registrar</button>
          </div>
        </div>
      )}
    </div>
  )
}

const thSt: React.CSSProperties = { borderBottom: '2px solid #e8e6e0', padding: '8px 8px', fontSize: 11, fontWeight: 700, color: '#6b6860', textTransform: 'uppercase', letterSpacing: '.4px', background: '#faf9f7' }
const tdSt: React.CSSProperties = { borderBottom: '1px solid #f0eee8', padding: '4px 6px', textAlign: 'center' }
function miniBtn(cor: string): React.CSSProperties { return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, border: 'none', background: cor, color: '#fff', cursor: 'pointer', flexShrink: 0 } }
