'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { voltar } from '@/lib/historicoNav'
import { ArrowLeft, Save, Copy, Trash2, Plus, ArrowUp, ArrowDown, Eye, EyeOff, Settings, Link2, MessageCircle, ListChecks, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { LojistaServico } from '@/lib/lojistasServicosPadrao'
import { linkWhatsappSalao } from '@/lib/lojistaFormatters'

const COR = '#5b4fcf'
const COR2 = '#0f766e'

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
  const [segmentos, setSegmentos] = useState<string[]>([])
  const [novoSegmento, setNovoSegmento] = useState('')
  const [salvandoSegmentos, setSalvandoSegmentos] = useState(false)
  const [telefoneSalao, setTelefoneSalao] = useState('')

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
    try {
      const g = await fetch('/api/salon/lojistas/segmentos').then(r => r.json())
      setSegmentos(Array.isArray(g) ? g : [])
    } catch { toast.error('Erro ao carregar segmentos') }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  // O botão flutuante global é do suporte da NODRI — aqui o correto é o WhatsApp do próprio salão.
  useEffect(() => {
    const btn = document.getElementById('whatsapp-float-btn')
    if (btn) btn.style.display = 'none'
    fetch('/api/salon/perfil').then(r => r.ok ? r.json() : null).then(salao => { if (salao?.telefone) setTelefoneSalao(salao.telefone) }).catch(() => {})
    return () => { if (btn) btn.style.display = '' }
  }, [])

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
    navigator.clipboard.writeText(linkPublico).then(() => toast.success('Link copiado!'))
  }

  async function salvarServicosNoServidor(lista: LojistaServico[]) {
    setSalvandoServicos(true)
    try {
      const res = await fetch('/api/salon/lojistas/servicos', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lista),
      })
      if (!res.ok) toast.error('Erro ao salvar serviços')
      else toast.success('Serviços salvos', { id: 'serv' })
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

  async function salvarSegmentosNoServidor(lista: string[]) {
    setSalvandoSegmentos(true)
    try {
      const res = await fetch('/api/salon/lojistas/segmentos', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lista),
      })
      if (!res.ok) toast.error('Erro ao salvar segmentos')
      else toast.success('Segmentos salvos', { id: 'seg' })
    } catch { toast.error('Erro de conexão') }
    setSalvandoSegmentos(false)
  }

  function adicionarSegmento() {
    const nome = novoSegmento.trim()
    if (!nome) return
    if (nome.toLowerCase() === 'outro') { toast.error('"Outro" já está sempre disponível automaticamente'); return }
    if (segmentos.some(s => s.toLowerCase() === nome.toLowerCase())) { toast.error('Esse segmento já existe'); return }
    const atualizado = [...segmentos, nome]
    setSegmentos(atualizado)
    setNovoSegmento('')
    salvarSegmentosNoServidor(atualizado)
  }

  function excluirSegmento(nome: string) {
    if (!confirm(`Excluir o segmento "${nome}"?`)) return
    const atualizado = segmentos.filter(s => s !== nome)
    setSegmentos(atualizado)
    salvarSegmentosNoServidor(atualizado)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f4f3fa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Carregando...</div>

  const linkZapSalao = linkWhatsappSalao(telefoneSalao)

  return (
    <div style={{ minHeight: '100vh', background: '#f4f3fa' }}>
      <style>{`
        @keyframes ljcFadeUp { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        .ljc-card { animation: ljcFadeUp 0.35s ease both; }
        .ljc-input:focus { border-color: ${COR} !important; box-shadow: 0 0 0 3px ${COR}15; }
        .ljc-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .ljc-btn:hover:not(:disabled) { transform: translateY(-1px); }
      `}</style>
      {linkZapSalao && (
        <a href={linkZapSalao} target="_blank" rel="noopener noreferrer" title="Falar com o salão no WhatsApp"
          style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, width: 52, height: 52, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(37,211,102,0.5)' }}>
          <MessageCircle size={26} color="white" />
        </a>
      )}

      <nav style={{ background: 'white', borderBottom: '1px solid #ece9f7', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => voltar(router, '/salon/lojistas')} className="ljc-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 18, background: '#e0ddd8' }} />
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${COR}, ${COR2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Settings size={16} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a', lineHeight: 1.2 }}>Configurações — Lojistas</div>
          <div style={{ fontSize: 11.5, color: '#9ca3af' }}>Grupo, mensagem, serviços e segmentos</div>
        </div>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* LINK PÚBLICO */}
        <SecaoConfig titulo="Link de Cadastro" subtitulo="Autocadastro do lojista, sem login" icone={<Link2 size={16} color="white" />} cor={COR}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ flex: 1, minWidth: 200, background: '#f6f4ff', padding: '10px 12px', borderRadius: 8, fontSize: 13, color: COR, wordBreak: 'break-all' }}>{linkPublico}</code>
            <button onClick={copiarLink} className="ljc-btn" style={btnGhost}><Copy size={14} /> Copiar</button>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Compartilhe esse link com os lojistas parceiros para que eles se cadastrem.</p>
        </SecaoConfig>

        {/* GRUPO PROMOCIONAL */}
        <SecaoConfig titulo="Grupo Promocional" icone={<MessageCircle size={16} color="white" />} cor="#16a34a">
          <label style={lbl}>Link do Grupo WhatsApp</label>
          <input className="ljc-input" value={whatsappLink} onChange={e => setWhatsappLink(e.target.value)} placeholder="https://chat.whatsapp.com/..." style={inp} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={salvarConfig} disabled={salvandoConfig} className="ljc-btn" style={btnPrimary}><Save size={14} /> Salvar</button>
            {whatsappLink && <button onClick={removerGrupo} className="ljc-btn" style={btnDanger}><Trash2 size={14} /> Remover</button>}
          </div>
          {!whatsappLink && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Sem link configurado — o botão de entrar no grupo não aparece para os lojistas.</p>}
        </SecaoConfig>

        {/* MENSAGEM AUTOMÁTICA */}
        <SecaoConfig titulo="Mensagem Automática" icone={<MessageCircle size={16} color="white" />} cor={COR2}>
          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Texto exibido ao lojista na tela de confirmação, junto do convite ao grupo.</p>
          <textarea className="ljc-input" value={mensagem} onChange={e => setMensagem(e.target.value)} rows={6} style={{ ...inp, resize: 'vertical' }} />
          <div style={{ marginTop: 10 }}>
            <button onClick={salvarConfig} disabled={salvandoConfig} className="ljc-btn" style={btnPrimary}><Save size={14} /> Salvar mensagem</button>
          </div>
        </SecaoConfig>

        {/* SERVIÇOS */}
        <SecaoConfig titulo="Serviços de Interesse" subtitulo="Salva sozinho a cada inclusão, exclusão ou mudança de ordem — não há botão de salvar aqui" icone={<ListChecks size={16} color="white" />} cor={COR}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="ljc-input" value={novoServico} onChange={e => setNovoServico(e.target.value)} placeholder="Novo serviço..." style={inp} onKeyDown={e => e.key === 'Enter' && adicionarServico()} />
            <button onClick={adicionarServico} className="ljc-btn" style={btnPrimary}><Plus size={14} /> Adicionar</button>
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
        </SecaoConfig>

        {/* SEGMENTOS */}
        <SecaoConfig titulo="Segmentos da Loja" subtitulo={'Salva sozinho a cada inclusão ou exclusão — não há botão de salvar aqui. A opção "Outro" (com campo livre) aparece sempre por último'} icone={<Tag size={16} color="white" />} cor={COR2}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="ljc-input" value={novoSegmento} onChange={e => setNovoSegmento(e.target.value)} placeholder="Novo segmento..." style={inp} onKeyDown={e => e.key === 'Enter' && adicionarSegmento()} />
            <button onClick={adicionarSegmento} className="ljc-btn" style={btnPrimary}><Plus size={14} /> Adicionar</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {segmentos.map(s => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 20, background: '#f6f4ff', color: COR, fontSize: 13, fontWeight: 600 }}>
                {s}
                <button onClick={() => excluirSegmento(s)} style={{ border: 'none', background: 'transparent', color: COR, cursor: 'pointer', display: 'flex' }} title="Excluir"><Trash2 size={12} /></button>
              </span>
            ))}
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: 20, background: '#f3f4f6', color: '#9ca3af', fontSize: 13, fontWeight: 600 }}>Outro (fixo)</span>
          </div>
          {salvandoSegmentos && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Salvando...</p>}
        </SecaoConfig>
      </div>
    </div>
  )
}

function SecaoConfig({ titulo, subtitulo, icone, cor, children }: { titulo: string; subtitulo?: string; icone: React.ReactNode; cor: string; children: React.ReactNode }) {
  return (
    <div className="ljc-card" style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 14px rgba(30,20,60,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icone}</div>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: '#1a1a1a' }}>{titulo}</div>
          {subtitulo && <div style={{ fontSize: 11.5, color: '#9ca3af' }}>{subtitulo}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e2f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s ease, box-shadow 0.15s ease' }
const btnGhost: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid #d0cdc7', background: '#fff', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: COR, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnDanger: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnIcon: React.CSSProperties = { border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer', padding: 4 }
