'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Copy, Trash2, Plus, ArrowUp, ArrowDown, Eye, EyeOff, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { LojistaServico } from '@/lib/lojistasServicosPadrao'

const COR = '#5b4fcf'

export default function LojistasConfigPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [linkPublico, setLinkPublico] = useState('')
  const [whatsappLink, setWhatsappLink] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [servicos, setServicos] = useState<LojistaServico[]>([])
  const [novoServico, setNovoServico] = useState('')
  const [salvandoServicos, setSalvandoServicos] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const cfg = await fetch('/api/salon/lojistas/config').then(r => r.json())
      setWhatsappLink(cfg.whatsapp_link || '')
      setMensagem(cfg.mensagem || '')
      setLinkPublico(cfg.link_publico || '')
    } catch { toast.error('Erro ao carregar configurações') }
    try {
      const s = await fetch('/api/salon/lojistas/servicos').then(r => r.json())
      setServicos(Array.isArray(s) ? s : [])
    } catch { toast.error('Erro ao carregar serviços') }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function salvarConfig() {
    setSalvandoConfig(true)
    try {
      const res = await fetch('/api/salon/lojistas/config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_link: whatsappLink, mensagem }),
      })
      if (res.ok) toast.success('Configurações salvas!')
      else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvandoConfig(false)
  }

  async function removerGrupo() {
    if (!confirm('Remover o link do grupo promocional? O botão de entrar no grupo deixará de aparecer para novos cadastros.')) return
    setWhatsappLink('')
    setSalvandoConfig(true)
    try {
      const res = await fetch('/api/salon/lojistas/config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_link: '', mensagem }),
      })
      if (res.ok) toast.success('Link do grupo removido')
      else toast.error('Erro ao remover')
    } catch { toast.error('Erro de conexão') }
    setSalvandoConfig(false)
  }

  function copiarLink() {
    const url = `${window.location.origin}${linkPublico}`
    navigator.clipboard.writeText(url).then(() => toast.success('Link copiado!'))
  }

  async function salvarServicosNoServidor(lista: LojistaServico[]) {
    setSalvandoServicos(true)
    try {
      const res = await fetch('/api/salon/lojistas/servicos', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lista),
      })
      if (!res.ok) toast.error('Erro ao salvar serviços')
    } catch { toast.error('Erro de conexão') }
    setSalvandoServicos(false)
  }

  function adicionarServico() {
    const nome = novoServico.trim()
    if (!nome) return
    if (servicos.some(s => s.nome.toLowerCase() === nome.toLowerCase())) { toast.error('Esse serviço já existe'); return }
    const atualizado = [...servicos, { id: `c${Date.now()}`, nome, ativo: true, ordem: servicos.length }]
    setServicos(atualizado)
    setNovoServico('')
    salvarServicosNoServidor(atualizado)
  }

  function excluirServico(id: string) {
    if (!confirm('Excluir este serviço da lista?')) return
    const atualizado = servicos.filter(s => s.id !== id)
    setServicos(atualizado)
    salvarServicosNoServidor(atualizado)
  }

  function alternarAtivo(id: string) {
    const atualizado = servicos.map(s => s.id === id ? { ...s, ativo: !s.ativo } : s)
    setServicos(atualizado)
    salvarServicosNoServidor(atualizado)
  }

  function mover(id: string, direcao: -1 | 1) {
    const ordenados = [...servicos].sort((a, b) => a.ordem - b.ordem)
    const idx = ordenados.findIndex(s => s.id === id)
    const alvo = idx + direcao
    if (alvo < 0 || alvo >= ordenados.length) return
    ;[ordenados[idx], ordenados[alvo]] = [ordenados[alvo], ordenados[idx]]
    const renumerado = ordenados.map((s, i) => ({ ...s, ordem: i }))
    setServicos(renumerado)
    salvarServicosNoServidor(renumerado)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Carregando...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7' }}>
      <nav style={{ background: '#faf9f7', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/salon/lojistas')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={16} color={COR} /> Configurações — Lojistas</span>
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* LINK PÚBLICO */}
        <div style={card}>
          <h2 style={cardTitulo}>Link de Cadastro (autocadastro do lojista)</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ flex: 1, minWidth: 200, background: '#f6f4ff', padding: '10px 12px', borderRadius: 8, fontSize: 13, color: '#5b4fcf', wordBreak: 'break-all' }}>{typeof window !== 'undefined' ? `${window.location.origin}${linkPublico}` : linkPublico}</code>
            <button onClick={copiarLink} style={btnGhost}><Copy size={14} /> Copiar</button>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Compartilhe esse link com os lojistas parceiros para que eles se cadastrem.</p>
        </div>

        {/* GRUPO PROMOCIONAL */}
        <div style={card}>
          <h2 style={cardTitulo}>Grupo Promocional</h2>
          <label style={lbl}>Link do Grupo WhatsApp</label>
          <input value={whatsappLink} onChange={e => setWhatsappLink(e.target.value)} placeholder="https://chat.whatsapp.com/..." style={inp} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={salvarConfig} disabled={salvandoConfig} style={btnPrimary}><Save size={14} /> Salvar</button>
            {whatsappLink && <button onClick={removerGrupo} style={btnDanger}><Trash2 size={14} /> Remover</button>}
          </div>
          {!whatsappLink && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Sem link configurado — o botão de entrar no grupo não aparece para os lojistas.</p>}
        </div>

        {/* MENSAGEM AUTOMÁTICA */}
        <div style={card}>
          <h2 style={cardTitulo}>Mensagem Automática</h2>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Texto exibido ao lojista na tela de confirmação, junto do convite ao grupo.</p>
          <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} rows={6} style={{ ...inp, resize: 'vertical' }} />
          <div style={{ marginTop: 10 }}>
            <button onClick={salvarConfig} disabled={salvandoConfig} style={btnPrimary}><Save size={14} /> Salvar mensagem</button>
          </div>
        </div>

        {/* SERVIÇOS */}
        <div style={card}>
          <h2 style={cardTitulo}>Serviços de Interesse</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input value={novoServico} onChange={e => setNovoServico(e.target.value)} placeholder="Novo serviço..." style={inp} onKeyDown={e => e.key === 'Enter' && adicionarServico()} />
            <button onClick={adicionarServico} style={btnPrimary}><Plus size={14} /> Adicionar</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto' }}>
            {[...servicos].sort((a, b) => a.ordem - b.ordem).map((s, i, arr) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: s.ativo ? '#fff' : '#f9fafb', border: '1px solid #ece9e2' }}>
                <span style={{ flex: 1, fontSize: 13, color: s.ativo ? '#1a1a1a' : '#9ca3af', fontWeight: 600 }}>{s.nome}</span>
                <button onClick={() => mover(s.id, -1)} disabled={i === 0} style={btnIcon} title="Subir"><ArrowUp size={13} /></button>
                <button onClick={() => mover(s.id, 1)} disabled={i === arr.length - 1} style={btnIcon} title="Descer"><ArrowDown size={13} /></button>
                <button onClick={() => alternarAtivo(s.id)} style={btnIcon} title={s.ativo ? 'Desativar' : 'Ativar'}>{s.ativo ? <Eye size={13} /> : <EyeOff size={13} />}</button>
                <button onClick={() => excluirServico(s.id)} style={{ ...btnIcon, color: '#dc2626' }} title="Excluir"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          {salvandoServicos && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Salvando...</p>}
        </div>
      </div>
    </div>
  )
}

const card: React.CSSProperties = { background: 'white', border: '1px solid #e8e6e0', borderRadius: 14, padding: 18 }
const cardTitulo: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: '#1a1a1a', marginBottom: 12 }
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, outline: 'none', fontFamily: 'inherit' }
const btnGhost: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid #d0cdc7', background: '#fff', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: COR, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnDanger: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnIcon: React.CSSProperties = { border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer', padding: 4 }
