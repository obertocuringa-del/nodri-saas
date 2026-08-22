'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Plus, Trash2, Pencil, X, Eye, EyeOff, Copy, KeyRound, Printer } from 'lucide-react'
import { getLogoSalao } from '@/lib/logoSalao'
import { cel, type Cell } from './GridEditavel'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

interface SenhaItem { id: string; descricao: string; informacao: string; senha: string }

const COR = '#5b4fcf'
const TITULO_TABELA = 'DADOS E SENHAS DO SALÃO'
const rid = () => Math.random().toString(36).slice(2, 9)
const MASCARA = '••••••••'

export default function SenhasLista({ chave = 'senhas' }: { chave?: string }) {
  const [items, setItems] = useState<SenhaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Senhas') // avisa "Deseja salvar?" antes de sair sem salvar
  const [modal, setModal] = useState<SenhaItem | null>(null)
  const [visiveis, setVisiveis] = useState<Set<string>>(new Set())

  const linhasParaItems = (linhas: Cell[][]): SenhaItem[] =>
    linhas.filter(l => l.some(c => (c?.t || '').trim())).map(l => ({
      id: rid(), descricao: l[0]?.t || '', informacao: l[1]?.t || '', senha: l[2]?.t || '',
    }))

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chave)}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.tabelas) && d.tabelas[0]) setItems(linhasParaItems(d.tabelas[0].linhas || []))
      else setItems([])
      setDirty(false)
    } catch { setItems([]); setDirty(false) }
    setLoading(false)
  }, [chave])
  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    setSalvando(true)
    try {
      const tabela = {
        titulo: TITULO_TABELA,
        cabecalho: [cel('Descrição'), cel('Informação'), cel('Senha')],
        linhas: items.map(it => [cel(it.descricao), cel(it.informacao), cel(it.senha)]),
      }
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, doc: { tabelas: [tabela] } }) })
      if (res.ok) { toast.success('Salvo!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function abrirNovo() { setModal({ id: rid(), descricao: '', informacao: '', senha: '' }) }
  function abrirEditar(it: SenhaItem) { setModal({ ...it }) }
  function salvarModal() {
    if (!modal) return
    if (!modal.descricao.trim()) { toast('Informe a descrição', { icon: '' }); return }
    setItems(prev => prev.some(x => x.id === modal.id) ? prev.map(x => x.id === modal.id ? modal : x) : [...prev, modal])
    setDirty(true); setModal(null)
  }
  function excluir(id: string) {
    if (!confirm('Remover este registro?')) return
    setItems(prev => prev.filter(x => x.id !== id)); setDirty(true)
    setVisiveis(prev => { const n = new Set(prev); n.delete(id); return n })
  }
  function toggleVisivel(id: string) { setVisiveis(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  async function copiar(texto: string) {
    if (!texto) return
    try { await navigator.clipboard.writeText(texto); toast.success('Copiado!') } catch { toast.error('Não foi possível copiar') }
  }

  async function imprimir() {
    const logoSalao = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
    const linhas = items.map(it => `<tr><td>${esc(it.descricao)}</td><td>${esc(it.informacao)}</td><td>${esc(it.senha)}</td></tr>`).join('')
    const cab = logoSalao ? `<img src="${logoSalao}" class="logo"/>` : `<div class="brand">NODRI</div>`
    const css = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px}.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${COR};padding-bottom:10px;margin-bottom:12px}.logo{max-height:56px;max-width:200px;object-fit:contain}.brand{font-size:22px;font-weight:900;color:${COR}}h1{text-align:center;font-size:16px;margin-bottom:14px;text-transform:uppercase}table{width:100%;border-collapse:collapse}th,td{border:1px solid #f0ede6;text-align:left;padding:7px 9px;vertical-align:top}th{background:#f6f4ff;color:${COR};border-bottom:2px solid ${COR};font-size:10px;text-transform:uppercase}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Senhas do Salão</title><style>${css}</style></head><body><div class="hd">${cab}<span style="font-size:10px;color:#777">${new Date().toLocaleDateString('pt-BR')}</span></div><h1>${esc(TITULO_TABELA)}</h1><table><thead><tr><th>Descrição</th><th>Informação</th><th>Senha</th></tr></thead><tbody>${linhas}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  return (
    <div>
      <style>{`
        .senha-row:hover { box-shadow:0 4px 14px rgba(0,0,0,.06); border-color:#d9d5f5; }
      `}</style>

      {/* ── Barra de controles ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '10px 12px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 800, color: '#1a1a1a' }}><KeyRound size={16} color={COR} /> Dados e Senhas do Salão</span>
        <div style={{ flex: 1 }} />
        {dirty && !salvando && <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Alterações não salvas</span>}
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir A4</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
        <button onClick={abrirNovo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Adicionar</button>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div> : (
        items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
            Nenhum dado salvo ainda. Clique em <strong style={{ color: COR }}>+ Adicionar</strong> para começar.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(it => {
              const visivel = visiveis.has(it.id)
              return (
                <div key={it.id} className="senha-row" style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', transition: 'box-shadow .15s, border-color .15s' }}>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#1a1a1a', marginBottom: 3 }}>{it.descricao}</div>
                    {it.informacao && <div style={{ fontSize: 12.5, color: '#6b6860', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{it.informacao}</div>}
                  </div>

                  {it.senha && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#faf9f7', border: '1px solid #eceae4', borderRadius: 10, padding: '7px 10px', flex: '0 0 auto' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#1a1a1a', letterSpacing: visivel ? 'normal' : 2, minWidth: 70, textAlign: 'center' }}>{visivel ? it.senha : MASCARA}</span>
                      <button onClick={() => toggleVisivel(it.id)} title={visivel ? 'Ocultar senha' : 'Ver senha'} style={iconBtn('#5b4fcf')}>{visivel ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                      <button onClick={() => copiar(it.senha)} title="Copiar senha" style={iconBtn('#6b6860')}><Copy size={14} /></button>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
                    <button onClick={() => abrirEditar(it)} title="Editar" style={iconBtn('#5b4fcf')}><Pencil size={14} /></button>
                    <button onClick={() => excluir(it.id)} title="Remover" style={iconBtn('#dc2626')}><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#1a1a1a' }}>{items.some(x => x.id === modal.id) ? 'Editar' : 'Adicionar'}</h3>
              <button onClick={() => setModal(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>

            <Campo label="Descrição">
              <input value={modal.descricao} onChange={e => setModal({ ...modal, descricao: e.target.value })} placeholder="Ex: Wi-Fi, E-mail do salão..." autoFocus style={inputSt} />
            </Campo>

            <Campo label="Informação">
              <textarea value={modal.informacao} onChange={e => setModal({ ...modal, informacao: e.target.value })} placeholder="Ex: login, rede, CNPJ..." rows={2} style={{ ...inputSt, resize: 'vertical', fontFamily: 'inherit' }} />
            </Campo>

            <Campo label="Senha">
              <input value={modal.senha} onChange={e => setModal({ ...modal, senha: e.target.value })} placeholder="Opcional" style={{ ...inputSt, fontFamily: 'monospace' }} />
            </Campo>

            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarModal} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b6860', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const inputSt: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 9, border: '1.5px solid #d0cdc7', fontSize: 13.5 }
function iconBtn(cor: string): React.CSSProperties { return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: cor, cursor: 'pointer' } }
