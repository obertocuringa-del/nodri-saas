'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Save, Trash2, X, UserPlus, Check, Lock, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { CATALOGO_PERMISSOES, TODAS_CHAVES, PAPEIS_SUGERIDOS, chaveModulo } from '@/lib/permissoes'

interface Usuario { id: string; nome?: string; usuario: string; papel?: string; permissoes: string[]; ativo: boolean }

export default function UsuariosPage() {
  const router = useRouter()
  const [lista, setLista] = useState<Usuario[]>([])
  const [modulos, setModulos] = useState<{ id: string; nome: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Usuario | 'novo' | null>(null)
  const [nome, setNome] = useState('')
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [papel, setPapel] = useState('')
  const [perms, setPerms] = useState<Set<string>>(new Set())
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    try { const d = await fetch('/api/salon/usuarios').then(r => r.ok ? r.json() : []); setLista(Array.isArray(d) ? d : []) } catch { /* */ }
    try { const m = await fetch('/api/salon/modulos').then(r => r.ok ? r.json() : []); setModulos(Array.isArray(m) ? m : []) } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  // chaves de todos os módulos (cards) — dedup
  const moduloItens = Array.from(new Map(modulos.map(m => [chaveModulo(m.nome), m.nome])).entries()).map(([chave, nome]) => ({ chave, label: nome }))
  const TODAS_COM_MODULOS = [...TODAS_CHAVES, ...moduloItens.map(i => i.chave)]

  function abrirNovo() { setEditando('novo'); setNome(''); setUsuario(''); setSenha(''); setPapel(''); setPerms(new Set()) }
  function abrirEdit(u: Usuario) { setEditando(u); setNome(u.nome || ''); setUsuario(u.usuario); setSenha(''); setPapel(u.papel || ''); setPerms(new Set(u.permissoes || [])) }
  function fechar() { setEditando(null) }
  function toggle(ch: string) { setPerms(p => { const n = new Set(p); n.has(ch) ? n.delete(ch) : n.add(ch); return n }) }

  // Exporta a configuração exata deste usuário (para virar padrão de papel no código)
  async function copiarConfig() {
    const chaves = Array.from(perms).filter(c => c !== 'modo_caixa').sort()
    const texto = JSON.stringify({ papel: papel || 'Recepção', modo_caixa: perms.has('modo_caixa'), permissoes: chaves }, null, 2)
    try {
      await navigator.clipboard.writeText(texto)
      toast.success(`Copiado! ${chaves.length} liberações${perms.has('modo_caixa') ? ' + Modo Caixa' : ''}. Cole no chat.`)
    } catch {
      // Fallback: mostra num prompt para copiar manualmente (celular / sem permissão de clipboard)
      window.prompt('Copie o texto abaixo (Ctrl+C / segurar e copiar) e cole no chat:', texto)
    }
  }
  function toggleGrupo(chaves: string[], ligar: boolean) { setPerms(p => { const n = new Set(p); chaves.forEach(c => ligar ? n.add(c) : n.delete(c)); return n }) }

  async function salvar() {
    if (!usuario.trim()) { toast.error('Defina o login do usuário'); return }
    if (editando === 'novo' && !senha) { toast.error('Defina uma senha'); return }
    setSalvando(true)
    const body: any = { nome, usuario, papel, permissoes: Array.from(perms) }
    if (senha) body.senha = senha
    try {
      let res
      if (editando === 'novo') res = await fetch('/api/salon/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      else res = await fetch('/api/salon/usuarios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: (editando as Usuario).id, ...body }) })
      if (res.ok) { toast.success('Salvo!'); setEditando(null); carregar() }
      else { const d = await res.json(); toast.error(d.error || 'Erro ao salvar') }
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  async function excluir(u: Usuario) {
    if (!confirm(`Excluir o usuário "${u.usuario}"?`)) return
    try { const res = await fetch(`/api/salon/usuarios?id=${u.id}`, { method: 'DELETE' }); if (res.ok) { toast.success('Excluído'); carregar() } else toast.error('Erro') } catch { toast.error('Erro') }
  }

  return (
    <div className="nodri-salon-bg" style={{ minHeight: '100vh' }}>
      <nav style={{ background: '#faf9f7', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}>🔐 Usuários & Acessos</span>
        <div style={{ flex: 1 }} />
        {!editando && <button onClick={abrirNovo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#5b4fcf)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}><UserPlus size={16} /> Novo usuário</button>}
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Loader2 size={26} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> : editando ? (
          <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>{editando === 'novo' ? 'Novo usuário' : `Editar: ${(editando as Usuario).usuario}`}</h2>
              <button onClick={fechar} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div><label style={lbl}>Nome</label><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da pessoa" style={inp} /></div>
              <div><label style={lbl}>Login (usuário)</label><input value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="ex: recepcao" style={inp} /></div>
              <div><label style={lbl}>Senha {editando !== 'novo' && <span style={{ color: '#9ca3af', fontWeight: 400 }}>(deixe vazio p/ manter)</span>}</label><input type="text" value={senha} onChange={e => setSenha(e.target.value)} placeholder="defina a senha" style={inp} /></div>
              <div><label style={lbl}>Papel (opcional)</label><input value={papel} onChange={e => setPapel(e.target.value)} placeholder="ex: Recepção" style={inp} /></div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10, padding: '10px 12px', background: '#f6f4ff', borderRadius: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#5b4fcf' }}>Papel pronto:</span>
              {PAPEIS_SUGERIDOS.map(p => <button key={p.nome} onClick={() => { setPerms(new Set(p.permissoes)); if (!papel) setPapel(p.nome) }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #c9c4f0', background: '#fff', color: '#5b4fcf', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{p.nome}</button>)}
              <span style={{ fontSize: 11, color: '#9ca3af' }}>(aplica uma sugestão; você ajusta depois)</span>
            </div>

            {/* 🧾 MODO CAIXA — só executa e adiciona; nunca edita nem exclui */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 12, background: perms.has('modo_caixa') ? '#fff7ed' : '#faf9f7', border: `1.5px solid ${perms.has('modo_caixa') ? '#f59e0b' : '#e0ddd8'}`, cursor: 'pointer', marginBottom: 14 }}>
              <input type="checkbox" checked={perms.has('modo_caixa')}
                onChange={e => setPerms(p => { const n = new Set(p); if (e.target.checked) n.add('modo_caixa'); else n.delete('modo_caixa'); return n })}
                style={{ width: 18, height: 18, accentColor: '#f59e0b', marginTop: 2, flexShrink: 0 }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: perms.has('modo_caixa') ? '#b45309' : '#374151' }}>🧾 Modo Caixa — só executa e adiciona</span>
                <span style={{ display: 'block', fontSize: 12, color: '#6b6860', marginTop: 2 }}>
                  Pode marcar tarefas do Check List como feitas, somar atendimentos nas listas, registrar esterilização/enxovais, adicionar pendências e lançar despesas na Calculadora (salvando o mês).
                  <strong> Não consegue editar nem excluir NADA</strong> que já existe — os botões somem e o servidor também recusa qualquer tentativa.
                </span>
              </span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#5b4fcf' }}>Liberações <span style={{ color: '#9ca3af', fontWeight: 600 }}>· {perms.size} de {TODAS_COM_MODULOS.length}</span></div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={copiarConfig} style={{ ...btnMini, borderColor: '#5b4fcf', color: '#5b4fcf' }}>📋 Copiar esta configuração</button>
                <button onClick={() => setPerms(new Set(TODAS_COM_MODULOS))} style={btnMini}>Liberar tudo</button>
                <button onClick={() => setPerms(new Set())} style={btnMini}>Bloquear tudo</button>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#6b6860', margin: '0 0 12px' }}>Tudo nasce <strong>bloqueado</strong>. Marque só o que este usuário pode ver/usar.</p>

            {CATALOGO_PERMISSOES.map(g => {
              const chaves = g.itens.map(i => i.chave)
              const todos = chaves.every(c => perms.has(c))
              return (
                <div key={g.grupo} style={{ border: '1px solid #ece9e2', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: .4 }}>{g.grupo}</span>
                    <button onClick={() => toggleGrupo(chaves, !todos)} style={{ ...btnMini, fontSize: 11 }}>{todos ? 'Bloquear grupo' : 'Liberar grupo'}</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
                    {g.itens.map(it => {
                      const on = perms.has(it.chave)
                      return (
                        <button key={it.chave} onClick={() => toggle(it.chave)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: `1px solid ${on ? '#16a34a' : '#e0ddd8'}`, background: on ? '#f0fdf4' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                          <span style={{ width: 18, height: 18, borderRadius: 5, background: on ? '#16a34a' : '#e5e7eb', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on ? <Check size={12} /> : <Lock size={10} />}</span>
                          <span style={{ fontSize: 12.5, color: on ? '#166534' : '#6b6860', fontWeight: on ? 700 : 500 }}>{it.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {moduloItens.length > 0 && (() => {
              const chaves = moduloItens.map(i => i.chave)
              const todos = chaves.every(c => perms.has(c))
              return (
                <div style={{ border: '1px solid #ece9e2', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: .4 }}>Módulos (cards da tela inicial)</span>
                    <button onClick={() => toggleGrupo(chaves, !todos)} style={{ ...btnMini, fontSize: 11 }}>{todos ? 'Bloquear grupo' : 'Liberar grupo'}</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
                    {moduloItens.map(it => {
                      const on = perms.has(it.chave)
                      return (
                        <button key={it.chave} onClick={() => toggle(it.chave)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: `1px solid ${on ? '#16a34a' : '#e0ddd8'}`, background: on ? '#f0fdf4' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                          <span style={{ width: 18, height: 18, borderRadius: 5, background: on ? '#16a34a' : '#e5e7eb', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on ? <Check size={12} /> : <Lock size={10} />}</span>
                          <span style={{ fontSize: 12.5, color: on ? '#166534' : '#6b6860', fontWeight: on ? 700 : 500 }}>{it.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={fechar} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={16} /> Salvar usuário</>}</button>
            </div>
          </div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 14 }}>
            Nenhum usuário ainda. Clique em <strong>Novo usuário</strong> para criar o primeiro login da sua equipe.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lista.map(u => (
              <div key={u.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#5b4fcf)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{(u.nome || u.usuario).charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontWeight: 800, color: '#1a1a1a', fontSize: 14 }}>{u.nome || u.usuario} {u.papel && <span style={{ fontSize: 11, fontWeight: 700, color: '#5b4fcf', background: '#f0eefb', borderRadius: 20, padding: '2px 8px', marginLeft: 4 }}>{u.papel}</span>}</div>
                  <div style={{ fontSize: 12, color: '#6b6860' }}>login: <strong>{u.usuario}</strong> · {u.permissoes?.length || 0} liberação(ões){!u.ativo && ' · inativo'}</div>
                </div>
                <button onClick={() => abrirEdit(u)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Pencil size={13} /> Editar</button>
                <button onClick={() => excluir(u)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 4 }
const inp: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, outline: 'none' }
const btnMini: React.CSSProperties = { padding: '5px 10px', borderRadius: 7, border: '1px solid #d0cdc7', background: '#fff', color: '#5b4fcf', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
