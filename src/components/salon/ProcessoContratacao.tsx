'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Plus, Trash2, X, MessageCircle, Search, Pencil, Eye, Send, Printer } from 'lucide-react'

interface Passo { id: string; titulo: string; texto: string }
interface Secao { id: string; titulo: string; cor: string; passos: Passo[] }
interface Doc { secoes: Secao[] }
interface Pessoa { nome: string; telefone: string }

const rid = () => Math.random().toString(36).slice(2, 8)
const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
const CHAVE = 'processo_contratacao_clt'

const DEFAULT: Doc = {
  secoes: [
    {
      id: rid(), titulo: 'CONTRATAÇÃO CLT', cor: '#16a34a', passos: [
        { id: rid(), titulo: 'Passo 1', texto: 'Entrevista com gerente / Bruna / Vera.' },
        { id: rid(), titulo: 'Passo 2', texto: 'Data de início / apresentação para o salão / documentação: Carteira de Trabalho, CPF, Título de Eleitor, Comprovante de Residência e PIS.' },
        { id: rid(), titulo: 'Passo 3', texto: 'Enviar documentação para a contabilidade solicitando a contratação. Pagar alimentação e transporte até o primeiro dia útil do mês seguinte (até a data de contratação caso inicie no meio do mês).' },
        { id: rid(), titulo: 'Passo 4', texto: 'Solicitar uniforme para a Bruna.' },
        { id: rid(), titulo: 'Passo 5', texto: 'Carta para abertura da conta (Bradesco) — pedir para o profissional ir abrir.' },
        { id: rid(), titulo: 'Passo 6', texto: 'Fazer exame admissional (clínica em frente ao Pátio Brasil). O salão paga o exame.' },
        { id: rid(), titulo: 'Passo 7', texto: 'Luan cadastrar o login e o ponto eletrônico.' },
        { id: rid(), titulo: 'Passo 8', texto: 'Ficar com a Carteira de Trabalho até o 3º mês de experiência.' },
      ],
    },
    {
      id: rid(), titulo: 'DESLIGAMENTO CLT (Parte Administrativa)', cor: '#dc2626', passos: [
        { id: rid(), titulo: 'Desligamento', texto: 'Verificar se o profissional irá cumprir o aviso prévio. Solicitar para a contabilidade o desligamento e o motivo — a contabilidade enviará a documentação. Explicar o processo de saída para o caixa.' },
      ],
    },
  ],
}

export default function ProcessoContratacao({ pessoas }: { pessoas: Pessoa[] }) {
  const [doc, setDoc] = useState<Doc>({ secoes: [] })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [editando, setEditando] = useState(false)
  const [detalhe, setDetalhe] = useState<{ secao: string; cor: string; passo: Passo } | null>(null)
  const [enviar, setEnviar] = useState<{ secao: string; passo: Passo } | null>(null)
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    try {
      const d = await fetch(`/api/salon/grid?chave=${CHAVE}`).then(r => r.ok ? r.json() : null)
      setDoc(d && Array.isArray(d.secoes) ? d : DEFAULT)
    } catch { setDoc(DEFAULT) }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  function mut(fn: (d: Doc) => void) { setDoc(prev => { const n: Doc = JSON.parse(JSON.stringify(prev)); fn(n); return n }); setDirty(true) }
  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: CHAVE, doc }) })
      if (res.ok) { toast.success('Processo salvo!'); setDirty(false); setEditando(false) } else { const e = await res.json().catch(() => ({})); toast.error(e?.error || 'Erro ao salvar') }
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function addPasso(si: number) { mut(d => { d.secoes[si].passos.push({ id: rid(), titulo: `Passo ${d.secoes[si].passos.length + 1}`, texto: '' }) }) }
  function delPasso(si: number, pi: number) { mut(d => { d.secoes[si].passos.splice(pi, 1) }) }
  function setPasso(si: number, pi: number, campo: 'titulo' | 'texto', v: string) { mut(d => { (d.secoes[si].passos[pi] as any)[campo] = v }) }
  function setSecao(si: number, campo: 'titulo' | 'cor', v: string) { mut(d => { (d.secoes[si] as any)[campo] = v }) }
  function addSecao() { mut(d => { d.secoes.push({ id: rid(), titulo: 'NOVA ETAPA', cor: '#5b4fcf', passos: [{ id: rid(), titulo: 'Passo 1', texto: '' }] }) }) }
  function delSecao(si: number) { if (!confirm('Excluir esta etapa inteira?')) return; mut(d => { d.secoes.splice(si, 1) }) }

  function mensagem(secao: string, p: Passo) {
    return `*${secao} — ${p.titulo}*\n\n${p.texto}\n\n_Enviado pelo NODRI 💛_`
  }
  function enviarWhats(pessoa: Pessoa) {
    if (!enviar) return
    const fone = String(pessoa.telefone || '').replace(/\D/g, '')
    if (!fone) { toast.error(`${pessoa.nome} está sem telefone no cadastro`); return }
    const numero = fone.startsWith('55') ? fone : '55' + fone
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem(enviar.secao, enviar.passo))}`, '_blank')
    setEnviar(null); setBusca('')
  }

  function imprimir() {
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
    const body = doc.secoes.map(s => `<div class="sec" style="border-color:${s.cor}"><div class="hd" style="background:${s.cor}">${esc(s.titulo)}</div>${s.passos.map((p, i) => `<div class="passo"><b>${esc(p.titulo)}</b><div>${esc(p.texto)}</div></div>`).join('')}</div>`).join('')
    const css = `@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:12px}.brand{font-size:22px;font-weight:900;color:#5b4fcf;margin-bottom:12px}.sec{border:2px solid;border-radius:10px;overflow:hidden;margin-bottom:14px;break-inside:avoid}.hd{color:#fff;font-weight:800;padding:8px 12px;font-size:13px}.passo{padding:9px 12px;border-bottom:1px solid #eee}.passo b{color:#444}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Processo de Contratação</title><style>${css}</style></head><body><div class="brand">NODRI — Processo de Contratação</div>${body}<script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={26} className="animate-spin" style={{ color: '#0ea5e9' }} /></div>

  const filtradas = pessoas.filter(p => norm(p.nome).includes(norm(busca)))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' }}>📝 Processo de Contratação</h2>
          <p style={{ fontSize: 13, color: '#6b6860', margin: 0 }}>Clique em cada passo para ver os detalhes e enviar por WhatsApp. {editando ? 'Modo edição ligado.' : 'Use “Editar” para mudar/acrescentar.'}</p>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={imprimir} style={btnSec}><Printer size={14} /> Imprimir</button>
        {editando
          ? <button onClick={salvar} disabled={salvando} style={{ ...btnPrim, background: dirty ? '#16a34a' : '#a3b3a3' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
          : <button onClick={() => setEditando(true)} style={btnPrim}><Pencil size={14} /> Editar</button>}
      </div>

      {doc.secoes.map((s, si) => (
        <div key={s.id} style={{ marginBottom: 22 }}>
          {/* Cabeçalho da etapa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {editando ? (
              <>
                <input type="color" value={s.cor} onChange={e => setSecao(si, 'cor', e.target.value)} style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                <input value={s.titulo} onChange={e => setSecao(si, 'titulo', e.target.value)} style={{ flex: 1, fontSize: 15, fontWeight: 800, color: '#fff', background: s.cor, border: 'none', borderRadius: 8, padding: '9px 14px', outline: 'none' }} />
                <button onClick={() => delSecao(si)} title="Excluir etapa" style={{ ...btnSec, color: '#dc2626', borderColor: '#fca5a5' }}><Trash2 size={14} /></button>
              </>
            ) : (
              <div style={{ flex: 1, background: s.cor, color: '#fff', fontWeight: 800, fontSize: 15, padding: '11px 16px', borderRadius: 10, letterSpacing: .3 }}>{s.titulo}</div>
            )}
          </div>

          {/* Timeline de passos */}
          <div style={{ position: 'relative', marginTop: 12, paddingLeft: 30 }}>
            <div style={{ position: 'absolute', left: 13, top: 6, bottom: 6, width: 2, background: s.cor + '40' }} />
            {s.passos.map((p, pi) => (
              <div key={p.id} style={{ position: 'relative', marginBottom: 12 }}>
                <div style={{ position: 'absolute', left: -30, top: 8, width: 26, height: 26, borderRadius: '50%', background: s.cor, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.15)' }}>{pi + 1}</div>
                {editando ? (
                  <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, padding: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <input value={p.titulo} onChange={e => setPasso(si, pi, 'titulo', e.target.value)} placeholder="Título do passo" style={{ flex: 1, fontWeight: 800, fontSize: 14, color: s.cor, border: '1px solid #eee', borderRadius: 6, padding: '6px 8px', outline: 'none' }} />
                      <button onClick={() => delPasso(si, pi)} title="Excluir passo" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={15} /></button>
                    </div>
                    <textarea value={p.texto} onChange={e => setPasso(si, pi, 'texto', e.target.value)} placeholder="O que precisa neste passo…" rows={3} style={{ width: '100%', border: '1px solid #d0cdc7', borderRadius: 6, padding: '8px 10px', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
                  </div>
                ) : (
                  <button onClick={() => setDetalhe({ secao: s.titulo, cor: s.cor, passo: p })} style={{ width: '100%', textAlign: 'left', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all .15s' }} onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.08)')} onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: s.cor, marginBottom: 2 }}>{p.titulo}</div>
                    <div style={{ fontSize: 13, color: '#374151', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.texto || 'Clique para ver os detalhes'}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Eye size={12} /> Ver detalhes · <MessageCircle size={12} color="#25D366" /> enviar no WhatsApp</div>
                  </button>
                )}
              </div>
            ))}
            {editando && <button onClick={() => addPasso(si)} style={{ ...btnDashed, marginLeft: -30 }}><Plus size={14} /> Adicionar passo</button>}
          </div>
        </div>
      ))}

      {editando && <button onClick={addSecao} style={{ ...btnDashed }}><Plus size={15} /> Adicionar etapa</button>}

      {/* Modal de detalhe do passo */}
      {detalhe && (
        <div onClick={() => setDetalhe(null)} style={overlay}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, maxWidth: 480 }}>
            <div style={{ background: detalhe.cor, color: '#fff', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{detalhe.passo.titulo}</span>
              <button onClick={() => setDetalhe(null)} style={btnX}><X size={18} /></button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6 }}>{detalhe.secao}</div>
              <p style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.55, whiteSpace: 'pre-wrap', margin: '0 0 16px' }}>{detalhe.passo.texto || 'Sem detalhes ainda.'}</p>
              <button onClick={() => { setEnviar({ secao: detalhe.secao, passo: detalhe.passo }); setDetalhe(null) }} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><MessageCircle size={16} /> Enviar via WhatsApp</button>
            </div>
          </div>
        </div>
      )}

      {/* Picker de funcionário p/ WhatsApp */}
      {enviar && (
        <div onClick={() => setEnviar(null)} style={overlay}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, maxWidth: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f0eee8' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>📲 Enviar “{enviar.passo.titulo}” para:</h3>
              <button onClick={() => setEnviar(null)} style={{ ...btnX, color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#9ca3af' }} />
                <input value={busca} onChange={e => setBusca(e.target.value)} autoFocus placeholder="Buscar funcionário…" style={{ width: '100%', padding: '9px 10px 9px 32px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: '0 10px 12px' }}>
              {filtradas.length === 0 ? <p style={{ padding: 16, fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>Ninguém encontrado.</p> :
                filtradas.map((p, i) => (
                  <button key={i} onClick={() => enviarWhats(p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '11px 12px', border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 14 }} onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{p.nome}</span>
                    {p.telefone ? <span style={{ fontSize: 11, color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Send size={11} /> {p.telefone}</span> : <span style={{ fontSize: 10, color: '#f59e0b' }}>sem telefone</span>}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const btnPrim: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 16px', borderRadius: 10, border: 'none', background: '#0ea5e9', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
const btnSec: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 10, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnDashed: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px dashed #5b4fcf', background: '#f6f4ff', color: '#5b4fcf', fontSize: 13, fontWeight: 800, cursor: 'pointer', marginTop: 4 }
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
const card: React.CSSProperties = { background: '#fff', borderRadius: 16, width: '100%', overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,.35)' }
const btnX: React.CSSProperties = { border: 'none', background: 'rgba(255,255,255,.25)', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
