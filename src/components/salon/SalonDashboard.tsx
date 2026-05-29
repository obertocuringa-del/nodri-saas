'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Bell, Settings, CheckCircle, X, Zap, Play, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import type { ModuloComStatus, Notificacao } from '@/types'

const ICON_MAP: Record<string, string> = {
  'calendar-check': '📅', 'lock': '🔒', 'message-circle': '💬', 'eye': '👁',
  'send': '📤', 'paperclip': '📎', 'chart-bar': '📊', 'coin': '💰',
  'music': '🎵', 'piggy-bank': '🐷', 'calculator': '🧮', 'star': '⭐',
  'armchair': '🪑', 'tag': '🏷',
}

const COR_MAP: Record<string, string> = {
  cyan:   'bg-nodri-cyan/10 text-nodri-cyan',
  purple: 'bg-nodri-purple/10 text-nodri-purple',
  pink:   'bg-nodri-pink/10 text-nodri-pink',
  blue:   'bg-nodri-blue/10 text-nodri-blue',
  amber:  'bg-nodri-amber/10 text-nodri-amber',
  green:  'bg-nodri-green/10 text-nodri-green',
  red:    'bg-nodri-red/10 text-nodri-red',
}

const CATEGORIAS = ['Todos os Módulos', 'Manual do Usuário', 'Dicas Nodri', 'Gestão de Pessoas', 'Gestão Financeira', 'Marketing']

interface Props {
  salaoNome: string
  plano: string
  modulos: ModuloComStatus[]
  notificacoes: Notificacao[]
  totalAtivos: number
  totalModulos: number
}

export default function SalonDashboard({ salaoNome, plano, modulos, notificacoes, totalAtivos, totalModulos }: Props) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'bloqueados'>('todos')
  const [notifDismissed, setNotifDismissed] = useState(false)
  const [busca, setBusca] = useState('')

  const primeiraNotif = notificacoes[0]

  const modulosFiltrados = modulos.filter(m => {
    if (filtro === 'ativos') return m.habilitado
    if (filtro === 'bloqueados') return !m.habilitado
    if (busca) return m.nome.toLowerCase().includes(busca.toLowerCase())
    return true
  })

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function handleAbrir(modulo: ModuloComStatus) {
    if (!modulo.habilitado) {
      toast('Entre em contato para ativar este módulo.', { icon: '🔒' })
      return
    }
    toast.success(`Abrindo ${modulo.nome}...`)
  }

  const planoLabel = plano === 'premium' ? 'Plano Premium' : plano === 'profissional' ? 'Plano Profissional' : 'Plano Básico'
  const initials = salaoNome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="min-h-screen bg-nodri-dark flex flex-col">

      {/* ── TOP NAVBAR ─────────────────────────────────────── */}
      <nav className="bg-nodri-surface border-b border-nodri-border px-5 py-2.5 flex items-center gap-3 sticky top-0 z-30">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-2 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-syne font-black text-sm text-black"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)' }}>
            N
          </div>
          <div>
            <div className="font-syne font-bold text-sm text-nodri-t1 leading-none">NODRI</div>
            <div className="text-[8px] text-nodri-pink tracking-[1.5px] uppercase leading-none mt-0.5">Estilo & Beleza</div>
          </div>
        </div>

        <div className="w-px h-5 bg-nodri-border shrink-0" />

        {/* Category tabs */}
        <div className="flex gap-0.5 bg-nodri-card border border-nodri-border rounded-lg p-0.5 overflow-x-auto">
          {CATEGORIAS.map(c => (
            <button key={c}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                c === 'Todos os Módulos'
                  ? 'bg-nodri-surface text-nodri-t1 border border-nodri-border'
                  : 'text-nodri-t2 hover:text-nodri-t1'
              }`}>
              {c}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-nodri-t3" />
            <input
              type="text"
              placeholder="Buscar módulo..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="bg-nodri-card border border-nodri-border rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-nodri-t1 placeholder-nodri-t3 outline-none focus:border-nodri-cyan/40 w-36"
            />
          </div>

          {/* Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-nodri-cyan/7 border border-nodri-cyan/17 rounded-lg text-[10.5px] text-nodri-cyan font-semibold">
            <CheckCircle size={12} />
            {totalAtivos}/{totalModulos} ativos
          </div>

          {/* Bell */}
          <button className="relative w-8 h-8 bg-nodri-card border border-nodri-border rounded-lg flex items-center justify-center text-nodri-t2 hover:text-nodri-cyan hover:border-nodri-cyan/40 transition-all">
            <Bell size={14} />
            {notificacoes.length > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-nodri-red rounded-full" />
            )}
          </button>

          {/* Settings */}
          <button className="w-8 h-8 bg-nodri-card border border-nodri-border rounded-lg flex items-center justify-center text-nodri-t2 hover:text-nodri-cyan hover:border-nodri-cyan/40 transition-all">
            <Settings size={14} />
          </button>

          {/* Salon chip */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-nodri-purple/8 border border-nodri-purple/20 rounded-lg">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c5cfc, #f43f8e)' }}>
              {initials}
            </div>
            <div className="hidden sm:block">
              <div className="text-[11px] font-medium text-nodri-t1 leading-none">{salaoNome}</div>
              <div className="text-[9px] text-nodri-purple leading-none mt-0.5">{planoLabel}</div>
            </div>
          </div>

          {/* Logout */}
          <button onClick={handleLogout}
            className="w-8 h-8 bg-nodri-card border border-nodri-border rounded-lg flex items-center justify-center text-nodri-t3 hover:text-nodri-red hover:border-nodri-red/30 transition-all"
            title="Sair">
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      {/* ── NOTIFICATION BANNER ─────────────────────────────── */}
      {primeiraNotif && !notifDismissed && (
        <div className="mx-5 mt-3 bg-nodri-cyan/7 border border-nodri-cyan/22 rounded-xl px-4 py-2.5 flex items-center gap-3 animate-slide-up">
          <Bell size={15} className="text-nodri-cyan shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-bold text-nodri-cyan uppercase tracking-wider mb-0.5">Aviso do Sistema</div>
            <div className="text-[11px] text-nodri-t1 truncate">{primeiraNotif.mensagem}</div>
          </div>
          <div className="text-[10px] text-nodri-t3 shrink-0">
            {new Date(primeiraNotif.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button onClick={() => setNotifDismissed(true)} className="text-nodri-t3 hover:text-nodri-t1 shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── FILTERS ROW ──────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-syne font-bold text-[13px] text-nodri-t1">Módulos do Sistema</h1>
          <span className="text-[11px] text-nodri-t2">
            <span className="text-nodri-cyan font-semibold">{totalAtivos}</span>/{totalModulos} módulos ativados
          </span>
        </div>
        <div className="flex gap-1.5">
          {(['todos', 'ativos', 'bloqueados'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-md text-[10.5px] capitalize border transition-all ${
                filtro === f
                  ? 'bg-nodri-cyan/9 border-nodri-cyan/25 text-nodri-cyan'
                  : 'border-nodri-border text-nodri-t2 hover:text-nodri-t1'
              }`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── MODULES GRID ─────────────────────────────────────── */}
      <div className="flex-1 px-5 py-3 pb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {modulosFiltrados.map(modulo => (
            <ModuloCard key={modulo.id} modulo={modulo} onAbrir={handleAbrir} />
          ))}
        </div>
        {modulosFiltrados.length === 0 && (
          <div className="text-center py-16 text-nodri-t3">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">Nenhum módulo encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ModuloCard({ modulo, onAbrir }: { modulo: ModuloComStatus; onAbrir: (m: ModuloComStatus) => void }) {
  const iconEmoji = ICON_MAP[modulo.icone] || '⚙️'
  const corClass  = COR_MAP[modulo.cor_classe] || COR_MAP.cyan

  return (
    <div className={`nodri-card p-4 flex flex-col cursor-pointer transition-all hover:-translate-y-0.5 relative overflow-hidden group
      ${modulo.habilitado ? 'border-nodri-cyan/35 bg-nodri-cyan/[0.03]' : 'opacity-60'}
    `}>
      {/* Top accent bar for active */}
      {modulo.habilitado && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-nodri-cyan" />
      )}

      {/* Header: icon + version */}
      <div className="flex items-start justify-between mb-2.5">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${corClass}`}>
          {iconEmoji}
        </div>
        <span className="text-[9px] text-nodri-t3 bg-nodri-surface px-1.5 py-0.5 rounded-full border border-nodri-border">
          v{modulo.versao}
        </span>
      </div>

      {/* Name & description */}
      <div className="font-syne font-bold text-[10.5px] uppercase tracking-wide text-nodri-t1 leading-snug mb-1.5">
        {modulo.nome}
      </div>
      <p className="text-[10px] text-nodri-t2 leading-relaxed mb-3 flex-1">
        {modulo.descricao}
      </p>

      {/* Footer: status + button */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-1.5 text-[9.5px] font-semibold">
          <span className={`w-1.5 h-1.5 rounded-full ${modulo.habilitado ? 'bg-nodri-green shadow-[0_0_6px_#22c55e]' : 'bg-nodri-red'}`} />
          <span className={modulo.habilitado ? 'text-nodri-green' : 'text-nodri-red'}>
            {modulo.habilitado ? 'Ativado' : 'Bloqueado'}
          </span>
        </div>
        <button
          onClick={() => onAbrir(modulo)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10.5px] font-bold transition-all ${
            modulo.habilitado
              ? 'bg-nodri-cyan text-black hover:brightness-110'
              : 'border border-nodri-pink text-nodri-pink hover:bg-nodri-pink/10'
          }`}
        >
          {modulo.habilitado
            ? <><Play size={9} fill="black" /> Abrir</>
            : <><Zap size={9} /> Ativar</>
          }
        </button>
      </div>
    </div>
  )
}
