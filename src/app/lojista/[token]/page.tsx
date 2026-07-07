'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, ChevronRight, Store, User as UserIcon, MessageCircle } from 'lucide-react'
import { SEGMENTOS_LOJISTA } from '@/lib/lojistasServicosPadrao'
import MultiSelectBusca, { Opcao } from '@/components/lojistas/MultiSelectBusca'

interface DadosPublicos {
  salao_nome: string
  whatsapp_link: string
  mensagem: string
  servicos: Opcao[]
}

const COR = '#5b4fcf'

const FORM_VAZIO = {
  nome: '', celular: '', data_aniversario: '', email: '', instagram: '',
  nome_loja: '', segmento: '', segmento_outro: '', bloco: '', numero_loja: '',
  observacoes: '',
}

export default function LojistaPublicoPage() {
  const params = useParams()
  const token = params?.token as string
  const draftKey = `lojista_draft_${token}`

  const [dados, setDados] = useState<DadosPublicos | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(FORM_VAZIO)
  const [servicosIds, setServicosIds] = useState<string[]>([])
  const [servicosCatalogo, setServicosCatalogo] = useState<Opcao[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')
  const [resultado, setResultado] = useState<{ whatsapp_link: string; id: string } | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/lojistas/public/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return }
        setDados(data)
        setServicosCatalogo(data.servicos || [])
        if (data.salao_nome) document.title = `Parceria - ${data.salao_nome}`
        try {
          const rascunho = localStorage.getItem(draftKey)
          if (rascunho) {
            const parsed = JSON.parse(rascunho)
            setForm(parsed.form || FORM_VAZIO)
            setServicosIds(parsed.servicosIds || [])
          }
        } catch { /* ignora rascunho inválido */ }
        setLoading(false)
      })
      .catch(() => { setError('Erro ao carregar o link de cadastro.'); setLoading(false) })
  }, [token, draftKey])

  const set = useCallback((campo: keyof typeof FORM_VAZIO, valor: string) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }, [])

  function salvarRascunho() {
    try { localStorage.setItem(draftKey, JSON.stringify({ form, servicosIds })) } catch { /* storage indisponível */ }
  }

  function cancelar() {
    if (!confirm('Limpar todos os campos preenchidos?')) return
    setForm(FORM_VAZIO)
    setServicosIds([])
    try { localStorage.removeItem(draftKey) } catch { /* */ }
  }

  async function adicionarServicoNovo(nome: string): Promise<Opcao | null> {
    try {
      const res = await fetch(`/api/lojistas/public/${token}/servicos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }),
      })
      if (!res.ok) return null
      const criado = await res.json()
      setServicosCatalogo(prev => prev.some(s => s.id === criado.id) ? prev : [...prev, { id: criado.id, nome: criado.nome }])
      return { id: criado.id, nome: criado.nome }
    } catch { return null }
  }

  async function enviar() {
    if (!form.nome.trim()) { setErroEnvio('Informe seu nome completo.'); return }
    if (!form.celular.trim()) { setErroEnvio('Informe o celular com DDD.'); return }
    if (!form.nome_loja.trim()) { setErroEnvio('Informe o nome da loja.'); return }
    setErroEnvio('')
    setEnviando(true)
    const segmentoFinal = form.segmento === 'Outro' && form.segmento_outro.trim() ? form.segmento_outro.trim() : form.segmento
    try {
      const res = await fetch(`/api/lojistas/public/${token}/cadastrar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, segmento: segmentoFinal, servicos_interesse: servicosIds }),
      })
      const data = await res.json()
      if (res.ok) {
        setResultado({ whatsapp_link: data.whatsapp_link || '', id: data.id })
        try { localStorage.removeItem(draftKey) } catch { /* */ }
      } else {
        setErroEnvio(data.error || 'Erro ao enviar cadastro.')
      }
    } catch {
      setErroEnvio('Erro de conexão. Tente novamente.')
    }
    setEnviando(false)
  }

  async function entrarNoGrupo() {
    if (!resultado) return
    try {
      await fetch(`/api/lojistas/public/${token}/grupo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: resultado.id }),
      })
    } catch { /* não bloqueia a abertura do link */ }
    window.open(resultado.whatsapp_link, '_blank')
  }

  const fundo = { minHeight: '100vh', background: 'linear-gradient(160deg, #f5f3ff 0%, #eef2ff 40%, #eff6ff 70%, #f0f9ff 100%)' }

  if (loading) {
    return (
      <div style={{ ...fundo, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: `3px solid ${COR}30`, borderTop: `3px solid ${COR}`, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ ...fundo, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <h1 style={{ color: '#1a1a1a', fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Link indisponível</h1>
          <p style={{ color: '#6b7280', fontSize: 15 }}>{error}</p>
        </div>
      </div>
    )
  }

  if (resultado) {
    return (
      <div style={{ ...fundo, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: `linear-gradient(135deg, ${COR}, ${COR}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: `0 20px 60px ${COR}40` }}>
            <CheckCircle size={44} color="white" />
          </div>
          <h1 style={{ color: '#1a1a1a', fontWeight: 800, fontSize: 26, marginBottom: 12 }}>Cadastro realizado com sucesso!</h1>
          <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
            Obrigado por fazer parte das parcerias{dados?.salao_nome ? ` de ${dados.salao_nome}` : ''}.
          </p>
          {resultado.whatsapp_link && (
            <button onClick={entrarNoGrupo} style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 28px', borderRadius: 16,
              border: 'none', cursor: 'pointer', background: '#25D366', color: 'white', fontWeight: 700, fontSize: 15,
              boxShadow: '0 8px 30px #25D36650',
            }}>
              <MessageCircle size={20} /> Entrar no Grupo Promocional do WhatsApp
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!dados) return null

  return (
    <div style={fundo}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${COR}, ${COR}80, #a855f7, #60a5fa)` }} />

      <div style={{ background: 'white', borderBottom: '1px solid #ede9fe', padding: '24px 20px', textAlign: 'center', boxShadow: '0 1px 20px rgba(0,0,0,0.04)' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${COR}, ${COR}80)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Store size={26} color="white" />
        </div>
        {dados.salao_nome && (
          <p style={{ fontSize: 13, fontWeight: 600, color: COR, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{dados.salao_nome}</p>
        )}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', marginBottom: 6 }}>Cadastro de Parceria — Lojista</h1>
        <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 480, margin: '0 auto' }}>
          Cadastre sua loja e receba promoções exclusivas de parceria.
        </p>
        <p style={{ fontSize: 12, color: '#ef4444', marginTop: 10 }}>* Campos obrigatórios</p>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px 60px' }}>

        <Secao titulo="Dados Pessoais" icone={<UserIcon size={18} color={COR} />}>
          <Campo label="Nome Completo *"><input style={inputStyle} value={form.nome} onChange={e => set('nome', e.target.value)} /></Campo>
          <Campo label="Celular com DDD *"><input style={inputStyle} value={form.celular} onChange={e => set('celular', e.target.value)} placeholder="(11) 91234-5678" /></Campo>
          <Campo label="Data de Aniversário"><input type="date" style={inputStyle} value={form.data_aniversario} onChange={e => set('data_aniversario', e.target.value)} /></Campo>
          <Campo label="E-mail"><input type="email" style={inputStyle} value={form.email} onChange={e => set('email', e.target.value)} /></Campo>
          <Campo label="Instagram"><input style={inputStyle} value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@sualoja" /></Campo>
        </Secao>

        <Secao titulo="Dados da Loja" icone={<Store size={18} color={COR} />}>
          <Campo label="Nome da Loja *"><input style={inputStyle} value={form.nome_loja} onChange={e => set('nome_loja', e.target.value)} /></Campo>
          <Campo label="Segmento">
            <select style={inputStyle} value={form.segmento} onChange={e => set('segmento', e.target.value)}>
              <option value="">Selecione...</option>
              {SEGMENTOS_LOJISTA.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Campo>
          {form.segmento === 'Outro' && (
            <Campo label="Qual segmento?"><input style={inputStyle} value={form.segmento_outro} onChange={e => set('segmento_outro', e.target.value)} /></Campo>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Campo label="Bloco"><input style={inputStyle} value={form.bloco} onChange={e => set('bloco', e.target.value)} /></Campo>
            <Campo label="Número da Loja"><input style={inputStyle} value={form.numero_loja} onChange={e => set('numero_loja', e.target.value)} /></Campo>
          </div>
        </Secao>

        <Secao titulo="Serviços de Interesse" icone={<CheckCircle size={18} color={COR} />}>
          <MultiSelectBusca opcoes={servicosCatalogo} selecionados={servicosIds} onChange={setServicosIds} onAdicionarNovo={adicionarServicoNovo} corPrimaria={COR} />
        </Secao>

        <Secao titulo="Observações">
          <textarea style={{ ...inputStyle, resize: 'none' }} rows={4} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Alguma observação adicional..." />
        </Secao>

        {erroEnvio && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '14px 18px', marginBottom: 16, fontSize: 14, color: '#dc2626' }}>
            {erroEnvio}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={cancelar} style={{ padding: '14px 24px', borderRadius: 14, border: '1.5px solid #d1d5db', background: 'white', color: '#6b7280', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={salvarRascunho} style={{ padding: '14px 24px', borderRadius: 14, border: `1.5px solid ${COR}`, background: 'white', color: COR, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Salvar</button>
          <button onClick={enviar} disabled={enviando} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${COR}, ${COR}cc)`, color: 'white', fontWeight: 700, fontSize: 14, opacity: enviando ? 0.7 : 1 }}>
            {enviando ? 'Enviando...' : <>Enviar <ChevronRight size={16} /></>}
          </button>
        </div>

        <div style={{ textAlign: 'center', paddingTop: 32 }}>
          <p style={{ fontSize: 12, color: '#6b6860' }}>Cadastro feito com <span style={{ fontWeight: 700 }}>NODRI</span> · Gestão de Salões de Beleza</p>
        </div>
      </div>
    </div>
  )
}

function Secao({ titulo, icone, children }: { titulo: string; icone?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: 20, padding: '24px 24px', marginBottom: 16, boxShadow: '0 2px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(255,255,255,0.8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {icone}
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{titulo}</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '2px solid #f3f4f6', borderRadius: 12, padding: '11px 14px',
  fontSize: 14, color: '#1a1a1a', background: '#f9fafb', fontFamily: 'inherit', outline: 'none',
}
