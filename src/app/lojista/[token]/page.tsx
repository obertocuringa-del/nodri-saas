'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, ChevronRight, Store, User as UserIcon, MessageCircle, AtSign, Cake } from 'lucide-react'
import { SEGMENTOS_LOJISTA } from '@/lib/lojistasServicosPadrao'
import { capitalizarNome, maskCelular, formatInstagram, formatBloco } from '@/lib/lojistaFormatters'
import MultiSelectBusca, { Opcao } from '@/components/lojistas/MultiSelectBusca'
import SeletorDataNascimento from '@/components/lojistas/SeletorDataNascimento'

interface DadosPublicos {
  salao_nome: string
  whatsapp_link: string
  mensagem: string
  servicos: Opcao[]
}

const COR = '#5b4fcf'

const FORM_VAZIO = {
  nome: '', celular: '', data_aniversario: '', instagram: '',
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
            setForm({ ...FORM_VAZIO, ...(parsed.form || {}) })
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

  const estilosGlobais = (
    <style>{`
      .lj-input, .lj-select { transition: border-color 0.18s ease, box-shadow 0.18s ease; }
      .lj-input:focus, .lj-select:focus { border-color: ${COR} !important; box-shadow: 0 0 0 4px ${COR}18; }
      .lj-select { appearance: none; -webkit-appearance: none;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'><polyline points='6 9 12 15 18 9'/></svg>");
        background-repeat: no-repeat; background-position: right 12px center; padding-right: 34px !important;
      }
      .lj-btn { transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease; }
      .lj-btn:hover:not(:disabled) { transform: translateY(-1px); }
      .lj-btn-enviar:hover:not(:disabled) { box-shadow: 0 12px 34px ${COR}55 !important; }
      @media (max-width: 560px) {
        .lj-header { padding: 20px 16px !important; }
        .lj-header h1 { font-size: 19px !important; }
        .lj-card { padding: 18px 16px !important; border-radius: 16px !important; }
        .lj-botoes { flex-direction: column-reverse !important; }
        .lj-botoes button { width: 100%; justify-content: center; }
        .lj-grid-2 { grid-template-columns: 1fr !important; }
      }
    `}</style>
  )

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
            <button onClick={entrarNoGrupo} className="lj-btn" style={{
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
      {estilosGlobais}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${COR}, ${COR}80, #a855f7, #60a5fa)` }} />

      <div className="lj-header" style={{ background: 'white', borderBottom: '1px solid #ede9fe', padding: '32px 20px', textAlign: 'center', boxShadow: '0 1px 20px rgba(0,0,0,0.04)' }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: `linear-gradient(135deg, ${COR}, ${COR}80)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: `0 10px 28px ${COR}40` }}>
          <Store size={28} color="white" />
        </div>
        {dados.salao_nome && (
          <p style={{ fontSize: 13, fontWeight: 700, color: COR, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{dados.salao_nome}</p>
        )}
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a', marginBottom: 8, letterSpacing: '-0.3px' }}>Cadastro de Parceria — Lojista</h1>
        <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
          Cadastre sua loja e receba promoções exclusivas de parceria.
        </p>
        <p style={{ fontSize: 12, color: '#ef4444', marginTop: 12, fontWeight: 600 }}>* Campos obrigatórios</p>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 16px 60px' }}>

        <Secao titulo="Dados Pessoais" icone={<UserIcon size={17} color={COR} />}>
          <Campo label="Nome Completo *">
            <input className="lj-input" style={inputStyle} value={form.nome}
              onChange={e => set('nome', e.target.value)}
              onBlur={e => set('nome', capitalizarNome(e.target.value))} />
          </Campo>
          <Campo label="Celular com DDD *">
            <input className="lj-input" style={inputStyle} value={form.celular} inputMode="numeric"
              onChange={e => set('celular', maskCelular(e.target.value))} placeholder="(11) 91234-5678" />
          </Campo>
          <Campo label={<><Cake size={13} /> Data de Aniversário</>}>
            <SeletorDataNascimento value={form.data_aniversario} onChange={v => set('data_aniversario', v)} />
          </Campo>
          <Campo label={<><AtSign size={13} /> Instagram</>}>
            <input className="lj-input" style={inputStyle} value={form.instagram}
              onChange={e => set('instagram', e.target.value)}
              onBlur={e => set('instagram', formatInstagram(e.target.value))} placeholder="@sualoja" />
          </Campo>
        </Secao>

        <Secao titulo="Dados da Loja" icone={<Store size={17} color={COR} />}>
          <Campo label="Nome da Loja *">
            <input className="lj-input" style={inputStyle} value={form.nome_loja}
              onChange={e => set('nome_loja', e.target.value)}
              onBlur={e => set('nome_loja', capitalizarNome(e.target.value))} />
          </Campo>
          <Campo label="Segmento">
            <select className="lj-input lj-select" style={inputStyle} value={form.segmento} onChange={e => set('segmento', e.target.value)}>
              <option value="">Selecione...</option>
              {SEGMENTOS_LOJISTA.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Campo>
          {form.segmento === 'Outro' && (
            <Campo label="Qual segmento?"><input className="lj-input" style={inputStyle} value={form.segmento_outro} onChange={e => set('segmento_outro', e.target.value)} /></Campo>
          )}
          <div className="lj-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Campo label="Bloco">
              <input className="lj-input" style={inputStyle} value={form.bloco} onChange={e => set('bloco', formatBloco(e.target.value))} />
            </Campo>
            <Campo label="Número da Loja"><input className="lj-input" style={inputStyle} value={form.numero_loja} onChange={e => set('numero_loja', e.target.value)} /></Campo>
          </div>
        </Secao>

        <Secao titulo="Serviços de Interesse" icone={<CheckCircle size={17} color={COR} />}>
          <MultiSelectBusca opcoes={servicosCatalogo} selecionados={servicosIds} onChange={setServicosIds} onAdicionarNovo={adicionarServicoNovo} corPrimaria={COR} />
        </Secao>

        <Secao titulo="Observações">
          <textarea className="lj-input" style={{ ...inputStyle, resize: 'none' }} rows={4} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Alguma observação adicional..." />
        </Secao>

        {erroEnvio && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '14px 18px', marginBottom: 16, fontSize: 14, color: '#dc2626', fontWeight: 600 }}>
            {erroEnvio}
          </div>
        )}

        <div className="lj-botoes" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={cancelar} className="lj-btn" style={{ padding: '14px 24px', borderRadius: 14, border: '1.5px solid #d1d5db', background: 'white', color: '#6b7280', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={salvarRascunho} className="lj-btn" style={{ padding: '14px 24px', borderRadius: 14, border: `1.5px solid ${COR}`, background: 'white', color: COR, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Salvar</button>
          <button onClick={enviar} disabled={enviando} className="lj-btn lj-btn-enviar" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${COR}, ${COR}cc)`, color: 'white', fontWeight: 700, fontSize: 14, boxShadow: `0 8px 26px ${COR}40`, opacity: enviando ? 0.7 : 1 }}>
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
    <div className="lj-card" style={{ background: 'white', borderRadius: 20, padding: '26px 24px', marginBottom: 16, boxShadow: '0 2px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(255,255,255,0.8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        {icone && (
          <div style={{ width: 30, height: 30, borderRadius: 9, background: `${COR}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icone}
          </div>
        )}
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a' }}>{titulo}</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  )
}

function Campo({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '2px solid #f3f4f6', borderRadius: 12, padding: '12px 14px',
  fontSize: 14.5, color: '#1a1a1a', background: '#f9fafb', fontFamily: 'inherit', outline: 'none',
}
