'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PROCEDIMENTOS DO SETOR
//
// Nem tudo que veio nos manuais dos setores é conferência. Boa parte é
// "COMO LIDAR COM A DEMANDA" — o passo a passo de uma situação (cliente não
// gostou do procedimento, análise de causa raiz, escala de correção…).
// Isso não cabe num check list: não se marca "feito" todo mês, se CONSULTA na
// hora em que a situação acontece.
//
// Então essas categorias saem do check list e viram PÁGINA aqui, listadas como
// sub-itens da sidebar do setor. Nada foi excluído: as duas listas nascem do
// mesmo arquivo de origem (checklist*Defaults.ts), separadas por `tipo`.
// ─────────────────────────────────────────────────────────────────────────────

import { Printer, ListChecks } from 'lucide-react'
import { MANUAIS_COORDENACAO } from '@/lib/checklistCoordenacaoDefaults'
import { MANUAIS_PROCESSOS } from '@/lib/checklistProcessosDefaults'

export interface PaginaManual { titulo: string; blocos: { subtitulo?: string; itens: string[] }[] }

// chave usada na sidebar (ferramenta.conteudoSlug = `manual:<chave>`)
const REGISTRO: Record<string, PaginaManual[]> = {
  coordenacao: MANUAIS_COORDENACAO,
  processos: MANUAIS_PROCESSOS,
}

/** Páginas de procedimento de um setor — usada pela sidebar para os sub-itens. */
export function listarManuais(chave: string): { id: string; titulo: string }[] {
  return (REGISTRO[chave] || []).map((p, i) => ({ id: String(i), titulo: p.titulo }))
}

const COR = '#5b4fcf'

export default function ManualSetorPainel({ chave, indice }: { chave: string; indice: string }) {
  const pagina = (REGISTRO[chave] || [])[Number(indice) || 0]
  if (!pagina) return <div style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>Procedimento não encontrado.</div>

  const totalPassos = pagina.blocos.reduce((s, b) => s + b.itens.length, 0)

  function imprimir() {
    const esc = (v: string) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const corpo = pagina.blocos.map(b => `
      ${b.subtitulo ? `<h2>${esc(b.subtitulo)}</h2>` : ''}
      <ol>${b.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ol>`).join('')
    const css = `@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11.5px;line-height:1.5}
h1{font-size:17px;font-weight:900;text-transform:uppercase;border-bottom:3px solid ${COR};padding-bottom:8px;margin-bottom:14px;color:${COR}}
h2{font-size:12px;font-weight:800;color:#374151;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.4px}
ol{padding-left:22px}li{margin-bottom:4px;break-inside:avoid}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(pagina.titulo)}</title><style>${css}</style></head><body>
<h1>${esc(pagina.titulo)}</h1>${corpo}
<script>window.onload=function(){window.print()}<\/script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 900, color: COR, background: '#f0eefb', borderRadius: 20, padding: '5px 12px', letterSpacing: '.4px' }}>
          <ListChecks size={13} /> PROCEDIMENTO
        </span>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{totalPassos} passos · consulte quando a situação acontecer</span>
        <div style={{ flex: 1 }} />
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Printer size={14} /> Imprimir A4
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,.08)', border: '1px solid #eceae4' }}>
        <div style={{ height: 6, background: `linear-gradient(90deg,${COR},#7c6fe0)` }} />
        <div style={{ padding: '26px 30px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', margin: '0 0 4px', lineHeight: 1.25 }}>{pagina.titulo}</h2>
          <p style={{ fontSize: 12.5, color: '#9ca3af', margin: '0 0 20px' }}>
            Este é um procedimento — o passo a passo de como lidar com a demanda. Não se marca &quot;feito&quot;: serve de referência no momento da situação.
          </p>

          {pagina.blocos.map((b, bi) => (
            <div key={bi} style={{ marginBottom: 22 }}>
              {b.subtitulo && (
                <h3 style={{ fontSize: 13, fontWeight: 900, color: COR, textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 10px', paddingBottom: 6, borderBottom: '1.5px solid #f0eefb' }}>
                  {b.subtitulo}
                </h3>
              )}
              <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {b.itens.map((it, ii) => (
                  <li key={ii} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 12px', borderRadius: 10, background: '#faf9f7', border: '1px solid #f0eee8' }}>
                    <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 7, background: '#f0eefb', color: COR, fontSize: 11.5, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{ii + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: '#1f2937', lineHeight: 1.45 }}>{it}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
