'use client'

// Miolo do Check Procon, sem a moldura de pagina — assim ele abre tanto na
// pagina /salon/checkprocon quanto DENTRO do setor Processo/Qualidade.

import { useState, useEffect, useCallback, useRef } from 'react'
import { ShieldCheck, Printer, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { ITENS_PROCON } from '@/lib/proconItens'

const COR = '#5b4fcf'

interface EstadoItem { conforme?: boolean; observacao?: string }
type Estado = Record<string, EstadoItem>

const esc = (v: string) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function CheckProconPainel() {
  const [estado, setEstado] = useState<Estado>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/salon/checkprocon').then(r => r.ok ? r.json() : null).then(d => setEstado(d || {})).finally(() => setLoading(false))
  }, [])

  const salvar = useCallback((novoEstado: Estado) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSalvando(true)
      try {
        const res = await fetch('/api/salon/checkprocon', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoEstado) })
        if (!res.ok) toast.error('Erro ao salvar')
      } catch { toast.error('Erro de conexão') }
      setSalvando(false)
    }, 700)
  }, [])

  function alternarConforme(id: string, valor: boolean | undefined) {
    setEstado(prev => {
      const novo = { ...prev, [id]: { ...prev[id], conforme: valor } }
      salvar(novo)
      return novo
    })
  }

  function mudarObservacao(id: string, texto: string) {
    setEstado(prev => {
      const novo = { ...prev, [id]: { ...prev[id], observacao: texto } }
      salvar(novo)
      return novo
    })
  }

  function imprimir() {
    const linhas = ITENS_PROCON.map(item => {
      const st = estado[item.id] || {}
      const subitem = item.id.includes('.')
      const statusTexto = st.conforme === true ? 'CONFORME' : st.conforme === false ? 'NÃO CONFORME' : ''
      const statusCor = st.conforme === true ? '#16a34a' : st.conforme === false ? '#dc2626' : '#9ca3af'
      const obsHtml = st.observacao
        ? `<p class="obs">Obs.: ${esc(st.observacao)}</p>`
        : `<div class="obslinha"></div>`
      return `<div class="item${subitem ? ' sub' : ''}">
        <span class="id">${esc(item.id)}</span>
        <div class="corpo">
          <p class="txt">${esc(item.texto)}</p>
          ${obsHtml}
        </div>
        <span class="status" style="color:${statusCor}">${statusTexto}</span>
      </div>`
    }).join('')

    const css = `@page{size:A4 portrait;margin:14mm}
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11.5px;line-height:1.5}
      .hd{border-bottom:3px solid ${COR};padding-bottom:10px;margin-bottom:16px}
      .brand{font-size:20px;font-weight:900;color:${COR}}
      h1{font-size:15px;margin-top:4px;color:#1a1a2e}
      .subtitulo{font-size:11px;color:#6b7280;margin-top:4px}
      .item{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #eee;break-inside:avoid}
      .item.sub{margin-left:22px}
      .id{font-weight:800;color:${COR};min-width:32px;flex-shrink:0}
      .corpo{flex:1}
      .txt{font-size:11px}
      .obs{font-size:10px;color:#555;margin-top:3px;font-style:italic}
      .obslinha{border-bottom:1px solid #ccc;height:14px;margin-top:5px;max-width:260px}
      .status{font-weight:800;font-size:9.5px;min-width:78px;text-align:right;flex-shrink:0}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Check Procon</title><style>${css}</style></head><body>
      <div class="hd">
        <div class="brand">Check Procon</div>
        <h1>Checklist de conformidade PROCON/DF</h1>
        <div class="subtitulo">Lei nº 8.078/1990 (Código de Defesa do Consumidor) · Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
      </div>
      ${linhas}
      <script>window.onload = function() { window.print() }</script>
    </body></html>`

    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) { toast.error('Permita pop-ups para imprimir'); return }
    w.document.write(html)
    w.document.close()
    w.focus()
  }

  const totalConforme = Object.values(estado).filter(e => e.conforme === true).length
  const totalNaoConforme = Object.values(estado).filter(e => e.conforme === false).length

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: `
/* CSS cru de proposito: escrito como filho de texto, o React escapa
   aspas e ">" ao renderizar no servidor — a regra vira letra morta e a
   hidratacao quebra, fazendo o React descartar a pagina do servidor.
   Conteudo constante deste arquivo, sem dado de usuario. */
.cp-item input[type="text"]:focus { border-color: ${COR} !important; }` }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: COR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={16} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a', lineHeight: 1.2 }}>Check Procon</div>
          <div style={{ fontSize: 11.5, color: '#9ca3af' }}>{salvando ? 'Salvando...' : 'Salvo automaticamente'}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: COR, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Printer size={14} /> Imprimir
        </button>
      </div>

      <div>

        <div style={{ background: 'white', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 2px 14px rgba(30,20,60,0.05)' }}>
          <h1 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', marginBottom: 6 }}>Checklist de conformidade PROCON/DF</h1>
          <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 12 }}>
            Itens conferidos em fiscalizações do PROCON/DF (Lei nº 8.078/1990 — Código de Defesa do Consumidor). Marque cada item como conforme ou não conforme e anote observações para se preparar antes de uma fiscalização.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: 20 }}>{totalConforme} conforme(s)</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '4px 10px', borderRadius: 20 }}>{totalNaoConforme} não conforme(s)</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', background: '#f3f4f6', padding: '4px 10px', borderRadius: 20 }}>{ITENS_PROCON.length - totalConforme - totalNaoConforme} sem marcar</span>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: '8px 20px', boxShadow: '0 2px 14px rgba(30,20,60,0.05)' }}>
          {ITENS_PROCON.map(item => {
            const subitem = item.id.includes('.')
            const st = estado[item.id] || {}
            const statusTexto = st.conforme === true ? 'CONFORME' : st.conforme === false ? 'NÃO CONFORME' : ''
            const statusCor = st.conforme === true ? '#16a34a' : st.conforme === false ? '#dc2626' : '#9ca3af'
            return (
              <div key={item.id} className="cp-item" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #f0eef9', marginLeft: subitem ? 22 : 0 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: COR, minWidth: 34, marginTop: 2 }}>{item.id}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.5 }}>{item.texto}</p>
                  <input
                    type="text"
                    placeholder="Observação (opcional)"
                    value={st.observacao || ''}
                    onChange={e => mudarObservacao(item.id, e.target.value)}
                    style={{ width: '100%', border: '1px solid #e5e2f0', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, outline: 'none', marginTop: 6 }}
                  />
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: statusCor, minWidth: 78, marginTop: 8, textAlign: 'right' }}>{statusTexto}</span>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => alternarConforme(item.id, st.conforme === true ? undefined : true)}
                    title="Marcar conforme"
                    style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${st.conforme === true ? '#16a34a' : '#e5e2f0'}`, background: st.conforme === true ? '#16a34a' : 'white', color: st.conforme === true ? 'white' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => alternarConforme(item.id, st.conforme === false ? undefined : false)}
                    title="Marcar não conforme"
                    style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${st.conforme === false ? '#dc2626' : '#e5e2f0'}`, background: st.conforme === false ? '#dc2626' : 'white', color: st.conforme === false ? 'white' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
