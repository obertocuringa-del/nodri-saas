'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Bell, Plus, Shield, Building, CreditCard, Puzzle, Users, BarChart3, Settings, RefreshCw, X, Send, Edit, Lock, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Salao, Modulo, Notificacao, Plano } from '@/types'

interface Props {
  saloes: Salao[]
  modulos: Modulo[]
  notificacoes: Notificacao[]
  planos: Plano[]
}

const TIPO_COLOR: Record<string, string> = {
  info: 'bg-nodri-blue', success: 'bg-nodri-green', warning: 'bg-nodri-amber', danger: 'bg-nodri-red',
}
const STATUS_CLASS: Record<string, string> = {
  ativo: 'bg-nodri-green/10 text-nodri-green', bloqueado: 'bg-nodri-red/10 text-nodri-red',
  vencido: 'bg-nodri-amber/10 text-nodri-amber', trial: 'bg-nodri-blue/10 text-nodri-blue',
}
const PLANO_CLASS: Record<string, string> = {
  basico: 'bg-nodri-t3/20 text-nodri-t2', profissional: 'bg-nodri-blue/10 text-nodri-blue', premium: 'bg-nodri-cyan/10 text-nodri-cyan',
}

export default function AdminDashboard({ saloes: initialSaloes, modulos, notificacoes, planos }: Props) {
  const router = useRouter()
  const [saloes, setSaloes] = useState(initialSaloes)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [modCtrlSalao, setModCtrlSalao] = useState<Salao | null>(null)
  const [modulosAtivos, setModulosAtivos] = useState<Set<string>>(new Set())
  const [notifMsg, setNotifMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [localNotifs, setLocalNotifs] = useState(notificacoes)
  const [showNovoSalao, setShowNovoSalao] = useState(false)
  const [savingMods, setSavingMods] = useState(false)
  const [formSalao, setFormSalao] = useState({
    nome: '', responsavel: '', email: '', telefone: '',
    plano_id: '', licenca_vencimento: '', senha_acesso: '', observacoes: ''
  })
  const [savingSalao, setSavingSalao] = useState(false)

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    window.location.href = '/login'
  }

  async function openModCtrl(salao: Salao) {
    setModCtrlSalao(salao)
    const res = await fetch(`/api/salons/${salao.id}/modules`)
    const data = await res.json()
    setModulosAtivos(new Set(data.habilitados || []))
  }

  async function toggleModulo(moduloId: string) {
    const newSet = new Set(modulosAtivos)
    if (newSet.has(moduloId)) newSet.delete(moduloId)
    else newSet.add(moduloId)
    setModulosAtivos(newSet)
  }

  async function saveModulos() {
    if (!modCtrlSalao) return
    setSavingMods(true)
    const res = await fetch(`/api/salons/${modCtrlSalao.id}/modules`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habilitados: Array.from(modulosAtivos) }),
    })
    setSavingMods(false)
    if (res.ok) { toast.success('Módulos atualizados!'); setModCtrlSalao(null) }
    else toast.error('Erro ao salvar módulos')
  }

  async function sendNotification() {
    if (!notifMsg.trim()) return
    setSending(true)
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem: notifMsg, para_todos: true, tipo: 'info' }),
    })
    if (res.ok) {
      const nova = await res.json()
      setLocalNotifs(prev => [nova, ...prev])
      setNotifMsg('')
      toast.success('Notificação enviada!')
    } else toast.error('Erro ao enviar notificação')
    setSending(false)
  }

  async function handleCadastrarSalao(e: React.FormEvent) {
    e.preventDefault()
    if (!formSalao.nome || !formSalao.email || !formSalao.senha_acesso) {
      toast.error('Nome, email e senha são obrigatórios')
      return
    }
    setSavingSalao(true)
    const res = await fetch('/api/salons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formSalao),
    })
    const data = await res.json()
    setSavingSalao(false)
    if (res.ok) {
      toast.success('Salão cadastrado com sucesso!')
      setSaloes(prev => [data, ...prev])
      setShowNovoSalao(false)
      setFormSalao({ nome: '', responsavel: '', email: '', telefone: '', plano_id: '', licenca_vencimento: '', senha_acesso: '', observacoes: '' })
    } else {
      toast.error(data.error || 'Erro ao cadastrar salão')
    }
  }

  const navItems = [
    { id: 'dashboard', icon: <Shield size={14} />, label: 'Dashboard' },
    { id: 'saloes', icon: <Building size={14} />, label: 'Salões', badge: saloes.length },
    { id: 'licencas', icon: <CreditCard size={14} />, label: 'Licenças' },
    { id: 'modulos', icon: <Puzzle size={14} />, label: 'Módulos' },
    { id: 'usuarios', icon: <Users size={14} />, label: 'Usuários' },
    { id: 'notifs', icon: <Bell size={14} />, label: 'Notificações', badge: localNotifs.filter(n => !n.lida).length, badgeRed: true },
    { id: 'updates', icon: <RefreshCw size={14} />, label: 'Atualizações' },
    { id: 'relatorios', icon: <BarChart3 size={14} />, label: 'Relatórios' },
    { id: 'config', icon: <Settings size={14} />, label: 'Configurações' },
  ]

  return (
    <div className="flex h-screen bg-nodri-dark overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-[200px] min-w-[200px] bg-nodri-surface border-r border-nodri-border flex flex-col">
        <div className="px-4 py-4 border-b border-nodri-border flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-syne font-black text-sm text-black"
            style={{ background: 'linear-gradient(135deg, #00e5c8, #7c5cfc)' }}>N</div>
          <div><div className="font-syne font-bold text-[13px]">NODRI</div><div className="text-[8px] text-nodri-cyan tracking-wider uppercase">Admin</div></div>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto space-y-0.5">
          <p className="text-[9px] text-nodri-t3 uppercase tracking-widest px-2.5 py-1.5 font-medium mt-1">Painel</p>
          {navItems.slice(0, 5).map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11.5px] border transition-all ${activeSection === item.id ? 'bg-nodri-cyan/9 text-nodri-cyan border-nodri-cyan/17' : 'text-nodri-t2 border-transparent hover:bg-white/4 hover:text-nodri-t1'}`}>
              {item.icon}<span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeRed ? 'bg-nodri-red text-white' : 'bg-nodri-cyan text-black'}`}>{item.badge}</span>
              )}
            </button>
          ))}
          <p className="text-[9px] text-nodri-t3 uppercase tracking-widest px-2.5 py-1.5 font-medium mt-2">Sistema</p>
          {navItems.slice(5).map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11.5px] border transition-all ${activeSection === item.id ? 'bg-nodri-cyan/9 text-nodri-cyan border-nodri-cyan/17' : 'text-nodri-t2 border-transparent hover:bg-white/4 hover:text-nodri-t1'}`}>
              {item.icon}<span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeRed ? 'bg-nodri-red text-white' : 'bg-nodri-amber text-black'}`}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-nodri-border">
          <div className="flex items-center gap-2 p-2 bg-white/3 rounded-lg border border-nodri-border">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-black" style={{ background: 'linear-gradient(135deg, #00e5c8, #7c5cfc)' }}>AD</div>
            <div className="flex-1 min-w-0"><div className="text-[11px] font-medium truncate">Admin Master</div><div className="text-[9px] text-nodri-cyan">Acesso Total</div></div>
            <button onClick={handleLogout} title="Sair" className="text-nodri-t3 hover:text-nodri-red transition-colors"><LogOut size={13} /></button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="px-5 py-3 border-b border-nodri-border bg-nodri-surface flex items-center gap-3 sticky top-0 z-20">
          <div><div className="font-syne font-bold text-[15px]">Painel Admin Master</div><div className="text-[11px] text-nodri-t2">Controle total de salões, licenças e módulos</div></div>
          <div className="ml-auto flex gap-2">
            <button className="relative w-8 h-8 bg-nodri-card border border-nodri-border rounded-lg flex items-center justify-center text-nodri-t2 hover:text-nodri-cyan transition-all">
              <Bell size={14} />
              {localNotifs.filter(n => !n.lida).length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-nodri-red rounded-full" />}
            </button>
            <button onClick={() => setShowNovoSalao(true)}
              className="flex items-center gap-1.5 bg-nodri-cyan text-black text-[11.5px] font-bold px-3 py-1.5 rounded-lg hover:brightness-110 transition-all">
              <Plus size={13} /> Novo Salão
            </button>
          </div>
        </div>

        <div className="p-5 flex-1">
          {/* STATS */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Salões cadastrados', value: saloes.length, change: 'total', warn: false },
              { label: 'Licenças ativas', value: saloes.filter(s => s.status === 'ativo').length, change: 'ativas agora', warn: false },
              { label: 'Receita mensal', value: `R$${(saloes.length * 197).toLocaleString('pt-BR')}`, change: 'estimado', warn: false },
              { label: 'Total de módulos', value: modulos.length, change: 'disponíveis', warn: false },
            ].map(s => (
              <div key={s.label} className="nodri-card p-3">
                <div className="text-[9.5px] text-nodri-t3 uppercase tracking-widest mb-1">{s.label}</div>
                <div className="font-syne font-bold text-lg">{s.value}</div>
                <div className={`text-[10px] mt-1 ${s.warn ? 'text-nodri-amber' : 'text-nodri-green'}`}>{s.change}</div>
              </div>
            ))}
          </div>

          {/* NOTIFICATIONS */}
          <div className="nodri-card p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-syne font-bold text-[12px]">
                <Bell size={14} className="text-nodri-cyan" /> Central de Notificações
                {localNotifs.filter(n => !n.lida).length > 0 && (
                  <span className="bg-nodri-red text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{localNotifs.filter(n => !n.lida).length}</span>
                )}
              </div>
            </div>
            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
              {localNotifs.length === 0 && <p className="text-[11px] text-nodri-t3 text-center py-2">Nenhuma notificação</p>}
              {localNotifs.slice(0, 5).map(n => (
                <div key={n.id} className="flex items-start gap-2.5 p-2.5 bg-nodri-surface rounded-lg border border-nodri-border">
                  <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${TIPO_COLOR[n.tipo]}`} />
                  <div className="text-[11px] flex-1 leading-relaxed">{n.mensagem}</div>
                  <div className="text-[10px] text-nodri-t3 shrink-0">{new Date(n.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={notifMsg} onChange={e => setNotifMsg(e.target.value)}
                placeholder="Enviar notificação para todos os salões..."
                className="nodri-input flex-1 text-[11px]"
                onKeyDown={e => e.key === 'Enter' && sendNotification()} />
              <button onClick={sendNotification} disabled={sending}
                className="flex items-center gap-1.5 bg-nodri-cyan text-black text-[11px] font-bold px-3 py-1.5 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all">
                {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Enviar
              </button>
            </div>
          </div>

          {/* SALÕES TABLE */}
          <div>
            <h2 className="font-syne font-bold text-[12.5px] mb-3">Salões Cadastrados</h2>
            <div className="nodri-card overflow-hidden">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-nodri-border">
                    {['Salão', 'Plano', 'Status', 'Vencimento', 'Módulos', 'Ações'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[10px] text-nodri-t3 uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {saloes.map(salao => (
                    <tr key={salao.id} className="border-b border-nodri-border/50 hover:bg-white/[0.01] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)' }}>{salao.nome[0]}</div>
                          <div><div className="font-medium text-nodri-t1">{salao.nome}</div><div className="text-[10px] text-nodri-t2">{salao.email}</div></div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PLANO_CLASS[(salao as any).plano?.slug || 'basico']}`}>{(salao as any).plano?.nome || 'Básico'}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_CLASS[salao.status]}`}>{salao.status}</span></td>
                      <td className="px-4 py-3 text-nodri-t2 text-[11px]">{salao.licenca_vencimento ? new Date(salao.licenca_vencimento).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-4 py-3 text-nodri-t2">—/{modulos.length}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button className="p-1.5 rounded-md border border-nodri-purple/40 text-nodri-purple bg-nodri-purple/7 hover:bg-nodri-purple/15 transition-all"><Edit size={11} /></button>
                          <button onClick={() => openModCtrl(salao)} className="flex items-center gap-1 px-2 py-1 rounded-md border border-nodri-cyan/35 text-nodri-cyan bg-nodri-cyan/7 text-[10px] font-semibold hover:bg-nodri-cyan/15 transition-all"><Puzzle size={10} /> Módulos</button>
                          <button className="p-1.5 rounded-md border border-nodri-red/35 text-nodri-red bg-nodri-red/7 hover:bg-nodri-red/15 transition-all"><Lock size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {saloes.length === 0 && <div className="text-center py-12 text-nodri-t3 text-sm">Nenhum salão cadastrado ainda — clique em "+ Novo Salão"</div>}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL NOVO SALÃO */}
      {showNovoSalao && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" style={{minHeight:'400px'}}>
          <div className="nodri-card w-full max-w-lg p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div className="font-syne font-bold text-[14px] flex items-center gap-2"><Building size={16} className="text-nodri-cyan" /> Cadastrar Novo Salão</div>
              <button onClick={() => setShowNovoSalao(false)} className="text-nodri-t3 hover:text-nodri-t1 transition-colors"><X size={16} /></button>
            </div>
            <form onSubmit={handleCadastrarSalao} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="nodri-label block mb-1">Nome do Salão *</label>
                  <input className="nodri-input" placeholder="Ex: Salão Bella" value={formSalao.nome} onChange={e => setFormSalao(p => ({...p, nome: e.target.value}))} />
                </div>
                <div>
                  <label className="nodri-label block mb-1">Responsável</label>
                  <input className="nodri-input" placeholder="Nome do dono" value={formSalao.responsavel} onChange={e => setFormSalao(p => ({...p, responsavel: e.target.value}))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="nodri-label block mb-1">Email *</label>
                  <input type="email" className="nodri-input" placeholder="email@salao.com" value={formSalao.email} onChange={e => setFormSalao(p => ({...p, email: e.target.value}))} />
                </div>
                <div>
                  <label className="nodri-label block mb-1">Telefone</label>
                  <input className="nodri-input" placeholder="(11) 99999-9999" value={formSalao.telefone} onChange={e => setFormSalao(p => ({...p, telefone: e.target.value}))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="nodri-label block mb-1">Plano</label>
                  <select className="nodri-input" value={formSalao.plano_id} onChange={e => setFormSalao(p => ({...p, plano_id: e.target.value}))}>
                    <option value="">Selecionar plano</option>
                    {planos.map(p => <option key={p.id} value={p.id}>{p.nome} — R${p.preco}/mês</option>)}
                  </select>
                </div>
                <div>
                  <label className="nodri-label block mb-1">Vencimento da Licença</label>
                  <input type="date" className="nodri-input" value={formSalao.licenca_vencimento} onChange={e => setFormSalao(p => ({...p, licenca_vencimento: e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="nodri-label block mb-1">Senha de Acesso do Cliente *</label>
                <input type="password" className="nodri-input" placeholder="Senha que o cliente usará para entrar" value={formSalao.senha_acesso} onChange={e => setFormSalao(p => ({...p, senha_acesso: e.target.value}))} />
              </div>
              <div>
                <label className="nodri-label block mb-1">Observações</label>
                <textarea className="nodri-input resize-none h-16" placeholder="Notas internas..." value={formSalao.observacoes} onChange={e => setFormSalao(p => ({...p, observacoes: e.target.value}))} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNovoSalao(false)} className="nodri-btn-ghost text-[12px]">Cancelar</button>
                <button type="submit" disabled={savingSalao} className="nodri-btn-primary text-[12px] flex items-center gap-2">
                  {savingSalao ? <><Loader2 size={13} className="animate-spin" /> Salvando...</> : <><Plus size={13} /> Cadastrar Salão</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MÓDULOS */}
      {modCtrlSalao && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" style={{minHeight:'400px'}}>
          <div className="nodri-card w-full max-w-2xl p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div><div className="font-syne font-bold text-[13px] flex items-center gap-2"><Puzzle size={14} className="text-nodri-cyan" /> Controle de Módulos</div><div className="text-[10px] text-nodri-cyan mt-0.5">{modCtrlSalao.nome}</div></div>
              <button onClick={() => setModCtrlSalao(null)} className="text-nodri-t3 hover:text-nodri-t1 transition-colors"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {modulos.map(m => {
                const on = modulosAtivos.has(m.id)
                return (
                  <div key={m.id} onClick={() => toggleModulo(m.id)}
                    className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${on ? 'border-nodri-cyan/30 bg-nodri-cyan/5' : 'border-nodri-border bg-nodri-surface hover:border-nodri-cyan/20'}`}>
                    <div className="text-base mb-1">⚙️</div>
                    <div className="text-[8.5px] font-bold uppercase leading-tight text-nodri-t1 mb-1.5">{m.nome.split(' ').slice(0,2).join(' ')}</div>
                    <div className={`w-6 h-3 rounded-full mx-auto relative transition-colors ${on ? 'bg-nodri-cyan' : 'bg-nodri-border'}`}>
                      <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${on ? 'left-3.5' : 'left-0.5'}`} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-nodri-t2">{modulosAtivos.size} módulos selecionados</span>
              <div className="flex gap-2">
                <button onClick={() => setModCtrlSalao(null)} className="nodri-btn-ghost text-[11px]">Cancelar</button>
                <button onClick={saveModulos} disabled={savingMods} className="nodri-btn-primary text-[11px] flex items-center gap-1.5">
                  {savingMods ? <><Loader2 size={12} className="animate-spin" /> Salvando...</> : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
