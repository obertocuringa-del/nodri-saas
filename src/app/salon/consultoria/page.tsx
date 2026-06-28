'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Loader2, Printer, RefreshCw } from 'lucide-react'

const PROMPT_RESUMO = `Aja como a Diretora Executiva do salão. Faça uma CONSULTORIA DO MÊS ATUAL usando os dados reais do sistema, em 3 blocos curtos e objetivos (sem inventar números):

1) 📊 RESUMO DO MÊS — faturamento, ticket médio, clientes atendidos e comparação com o mês anterior (use os dados que tiver disponíveis).
2) ⚠️ PONTOS DE ATENÇÃO — o que está caindo ou preocupa (profissionais com queda, pendências em aberto, feedback negativo, custos altos).
3) 🎯 PLANO DE AÇÃO — de 3 a 5 ações práticas e priorizadas para o próximo mês, do mais urgente ao menos.

Seja direta e objetiva. Se faltar algum dado, diga claramente em vez de supor.`

const PROMPT_MKT = `Aja como especialista de marketing do salão. Gere 5 ideias de POSTS para redes sociais (Instagram) para este mês, considerando o perfil do salão e a época do ano. Para cada post traga: 🎯 objetivo, ✍️ legenda pronta (com emojis e chamada para ação) e # hashtags. Seja criativo e direto.`

export default function ConsultoriaIAPage() {
  const router = useRouter()
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [modo, setModo] = useState<'resumo' | 'mkt'>('resumo')

  async function gerar(qual: 'resumo' | 'mkt') {
    setModo(qual); setTexto(''); setErro(''); setLoading(true)
    try {
      const res = await fetch('/api/ia/chat', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: [{ role: 'user', content: qual === 'resumo' ? PROMPT_RESUMO : PROMPT_MKT }], modo: 'gestor' }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); setErro(e?.error || 'Não foi possível gerar agora.'); setLoading(false); return }
      const reader = res.body!.getReader()
      const dec = new TextDecoder('utf-8', { fatal: false })
      let buf = '', acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          try { const d = JSON.parse(line.slice(5).trim()); if (d.token) { acc += d.token; setTexto(acc) } } catch { /* */ }
        }
      }
      if (!acc) setErro('A IA não retornou conteúdo. Verifique se a IA está ativada para o seu salão.')
    } catch { setErro('Erro de conexão.') }
    setLoading(false)
  }

  function imprimir() {
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
    const css = `@page{size:A4 portrait;margin:16mm}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:13px;line-height:1.6}.brand{font-size:22px;font-weight:900;color:#5b4fcf;border-bottom:3px solid #5b4fcf;padding-bottom:8px;margin-bottom:14px}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Consultoria NODRI IA</title><style>${css}</style></head><body><div class="brand">NODRI IA — Consultoria</div><div>${esc(texto)}</div><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div className="nodri-salon-bg" style={{ minHeight: '100vh' }}>
      <nav style={{ background: '#faf9f7', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}><Sparkles size={15} style={{ display: 'inline', verticalAlign: -2, marginRight: 6, color: '#5b4fcf' }} />Consultoria IA</span>
        {texto && !loading && <button onClick={imprimir} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>}
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
        <div style={{ background: 'linear-gradient(135deg,#7c3aed,#5b4fcf)', borderRadius: 16, padding: '20px', color: '#fff', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>🤖 Sua consultora do salão</div>
          <div style={{ fontSize: 13, opacity: .92 }}>A NODRI IA lê os dados do seu salão e te entrega um diagnóstico com plano de ação. É gerado na hora, sob demanda.</div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <button onClick={() => gerar('resumo')} disabled={loading} style={btn('#5b4fcf', loading)}>{loading && modo === 'resumo' ? <><Loader2 size={16} className="animate-spin" /> Analisando…</> : <><Sparkles size={16} /> Resumo do mês + plano de ação</>}</button>
          <button onClick={() => gerar('mkt')} disabled={loading} style={btn('#db2777', loading)}>{loading && modo === 'mkt' ? <><Loader2 size={16} className="animate-spin" /> Criando…</> : <>📣 Ideias de posts (marketing)</>}</button>
          {texto && !loading && <button onClick={() => gerar(modo)} style={{ ...btn('#6b6860', false), background: '#fff', color: '#6b6860', border: '1px solid #d0cdc7' }}><RefreshCw size={15} /> Gerar de novo</button>}
        </div>

        {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 14, color: '#dc2626', fontSize: 13, marginBottom: 14 }}>⚠️ {erro}{erro.includes('ativada') || erro.includes('API') ? ' (peça ao administrador do NODRI para ativar a IA do seu salão.)' : ''}</div>}

        {(texto || loading) && (
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 18, fontSize: 14, lineHeight: 1.65, color: '#1a1a1a', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {texto || <span style={{ color: '#9ca3af' }}>Lendo seus dados e montando a análise…</span>}
            {loading && texto && <span style={{ color: '#5b4fcf' }}>▋</span>}
          </div>
        )}

        {!texto && !loading && !erro && <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 10 }}>Clique num botão acima para gerar. Cada geração consulta os dados atuais do salão.</p>}
      </div>
    </div>
  )
}

function btn(cor: string, loading: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '12px 18px', borderRadius: 12, border: 'none', background: cor, color: '#fff', fontSize: 14, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', opacity: loading ? .85 : 1 }
}
