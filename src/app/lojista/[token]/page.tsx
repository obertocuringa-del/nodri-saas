'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, ChevronRight, Store, User as UserIcon, MessageCircle, AtSign, Cake, Phone, MapPin, Tag, ClipboardList, Users, TrendingUp, Award, Settings, Plus } from 'lucide-react'
import { capitalizarNome, maskCelular, formatInstagram, formatBloco } from '@/lib/lojistaFormatters'
import MultiSelectBusca, { Opcao } from '@/components/lojistas/MultiSelectBusca'
import SeletorDataNascimento from '@/components/lojistas/SeletorDataNascimento'

interface DadosPublicos {
  salao_nome: string
  whatsapp_link: string
  mensagem: string
  servicos: Opcao[]
  segmentos: string[]
  dono_logado: boolean
}

const COR = '#5b4fcf'
const COR2 = '#0f766e'

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
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
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

  const fundo = { minHeight: '100vh', background: '#f4f3fa' }

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
      .lj-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: start; }
      @media (max-width: 900px) {
        .lj-grid3 { grid-template-columns: 1fr; }
      }
      @media (max-width: 560px) {
        .lj-header { padding: 24px 16px !important; }
        .lj-header h1 { font-size: 20px !important; }
        .lj-card-body { padding: 18px 16px !important; }
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
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: `linear-gradient(135deg, ${COR}, ${COR2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: `0 20px 60px ${COR}40` }}>
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

  const nomeIniciais = dados.salao_nome ? dados.salao_nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'S'

  if (!mostrarFormulario) {
    return (
      <div style={{ ...fundo, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        {estilosGlobais}
        <div style={{ position: 'relative', background: 'white', borderRadius: 24, padding: '36px 32px', maxWidth: 900, width: '100%', boxShadow: '0 20px 60px rgba(30,20,60,0.12)' }}>
          {dados.dono_logado && (
            <a href="/salon/lojistas/configuracoes" style={{ position: 'absolute', top: 20, right: 20, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 20, border: '1px solid #e5e7eb', color: '#6b7280', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              <Settings size={13} /> Configurações
            </a>
          )}

          <div className="lj-capa-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${COR}12`, padding: '6px 14px', borderRadius: 20, marginBottom: 18 }}>
                <Store size={14} color={COR} />
                <span style={{ fontSize: 12, fontWeight: 800, color: COR, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Lojista Parceiro</span>
              </div>
              <h1 style={{ fontSize: 34, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.15, marginBottom: 4 }}>Cadastro de</h1>
              <h1 style={{ fontSize: 34, fontWeight: 800, color: COR, lineHeight: 1.15, marginBottom: 16 }}>Lojista Parceiro</h1>
              <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, marginBottom: 22, maxWidth: 420 }}>
                Conecte sua loja ao sistema e receba clientes indicados{dados.salao_nome ? ` pelo ${dados.salao_nome}` : ''}.
              </p>
              <div style={{ height: 1, background: '#eee', marginBottom: 22 }} />

              <div className="lj-capa-beneficios" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 26 }}>
                <Beneficio icone={<Users size={16} color={COR} />} titulo="Mais clientes" texto="Receba indicações qualificadas" />
                <Beneficio icone={<TrendingUp size={16} color={COR2} />} titulo="Acompanhe tudo" texto="Fique de olho nas novidades" />
                <Beneficio icone={<Award size={16} color={COR} />} titulo="Parceria de valor" texto={`Cresça junto com${dados.salao_nome ? ' o ' + dados.salao_nome : ' a gente'}`} />
              </div>

              <button onClick={() => setMostrarFormulario(true)} className="lj-btn" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14,
                border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${COR}, ${COR2})`, color: 'white',
                fontWeight: 700, fontSize: 15, boxShadow: `0 8px 26px ${COR}40`,
              }}>
                <Plus size={18} /> Novo Cadastro
              </button>
            </div>

            <div className="lj-capa-ilustracao" style={{ position: 'relative', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: `linear-gradient(135deg, ${COR}12, ${COR2}12)` }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 88, height: 88, borderRadius: 22, background: `linear-gradient(135deg, ${COR}, ${COR}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 14px 34px ${COR}40`, marginRight: -14, zIndex: 2 }}>
                  <Store size={38} color="white" />
                </div>
                <div style={{ width: 88, height: 88, borderRadius: 22, background: `linear-gradient(135deg, ${COR2}, ${COR2}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 14px 34px ${COR2}40` }}>
                  <Users size={38} color="white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 700px) {
            .lj-capa-grid { grid-template-columns: 1fr !important; }
            .lj-capa-ilustracao { height: 140px !important; order: -1; }
            .lj-capa-beneficios { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={fundo}>
      {estilosGlobais}

      <div className="lj-header" style={{ background: `linear-gradient(115deg, ${COR} 0%, ${COR} 45%, ${COR2} 100%)`, padding: '28px 20px 34px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 20, marginBottom: 16 }}>
          <div style={{ width: 22, height: 22, borderRadius: 7, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: COR }}>{nomeIniciais}</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'white', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{dados.salao_nome || 'NODRI'}</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 8, letterSpacing: '-0.3px' }}>Seja um Lojista Parceiro</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
          Cadastre sua loja e receba promoções exclusivas de parceria.
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 12, fontWeight: 600 }}>* Campos obrigatórios</p>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px 60px' }}>

        <div className="lj-grid3">
          <Cartao titulo="Dados Pessoais" icone={<UserIcon size={16} color="white" />} cor={COR}>
            <Campo label="Nome Completo *">
              <InputComIcone icone={<UserIcon size={15} />}>
                <input className="lj-input" style={inputComIcone} value={form.nome}
                  onChange={e => set('nome', e.target.value)}
                  onBlur={e => set('nome', capitalizarNome(e.target.value))} />
              </InputComIcone>
            </Campo>
            <Campo label="Celular com DDD *">
              <InputComIcone icone={<Phone size={15} />}>
                <input className="lj-input" style={inputComIcone} value={form.celular} inputMode="numeric"
                  onChange={e => set('celular', maskCelular(e.target.value))} placeholder="(11) 91234-5678" />
              </InputComIcone>
            </Campo>
            <Campo label={<><Cake size={13} /> Data de Aniversário</>}>
              <SeletorDataNascimento value={form.data_aniversario} onChange={v => set('data_aniversario', v)} />
            </Campo>
            <Campo label="Instagram">
              <InputComIcone icone={<AtSign size={15} />}>
                <input className="lj-input" style={inputComIcone} value={form.instagram}
                  onChange={e => set('instagram', e.target.value)}
                  onBlur={e => set('instagram', formatInstagram(e.target.value))} placeholder="@sualoja" />
              </InputComIcone>
            </Campo>
          </Cartao>

          <Cartao titulo="Dados da Loja" icone={<Store size={16} color="white" />} cor={COR2}>
            <Campo label="Nome da Loja *">
              <InputComIcone icone={<Store size={15} />}>
                <input className="lj-input" style={inputComIcone} value={form.nome_loja}
                  onChange={e => set('nome_loja', e.target.value)}
                  onBlur={e => set('nome_loja', capitalizarNome(e.target.value))} />
              </InputComIcone>
            </Campo>
            <Campo label="Segmento">
              <InputComIcone icone={<Tag size={15} />}>
                <select className="lj-input lj-select" style={{ ...inputComIcone, paddingRight: 34 }} value={form.segmento} onChange={e => set('segmento', e.target.value)}>
                  <option value="">Selecione...</option>
                  {dados.segmentos.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </InputComIcone>
            </Campo>
            {form.segmento === 'Outro' && (
              <Campo label="Qual segmento?"><input className="lj-input" style={inputStyle} value={form.segmento_outro} onChange={e => set('segmento_outro', e.target.value)} /></Campo>
            )}
            <div className="lj-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Campo label="Bloco">
                <InputComIcone icone={<MapPin size={15} />}>
                  <input className="lj-input" style={inputComIcone} value={form.bloco} onChange={e => set('bloco', formatBloco(e.target.value))} />
                </InputComIcone>
              </Campo>
              <Campo label="Número da Loja"><input className="lj-input" style={inputStyle} value={form.numero_loja} onChange={e => set('numero_loja', e.target.value)} /></Campo>
            </div>
          </Cartao>

          <Cartao titulo="Serviços & Observações" icone={<ClipboardList size={16} color="white" />} cor={COR}>
            <Campo label="Serviços de Interesse">
              <MultiSelectBusca opcoes={servicosCatalogo} selecionados={servicosIds} onChange={setServicosIds} onAdicionarNovo={adicionarServicoNovo} corPrimaria={COR} />
            </Campo>
            <Campo label="Observações">
              <textarea className="lj-input" style={{ ...inputStyle, resize: 'none' }} rows={4} value={form.observacoes} onChange={e => set('observacoes', e.target.value)} placeholder="Alguma observação adicional..." />
            </Campo>
          </Cartao>
        </div>

        {erroEnvio && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '14px 18px', margin: '16px 0', fontSize: 14, color: '#dc2626', fontWeight: 600 }}>
            {erroEnvio}
          </div>
        )}

        <div className="lj-botoes" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 20 }}>
          <button onClick={cancelar} className="lj-btn" style={{ padding: '14px 24px', borderRadius: 14, border: '1.5px solid #d1d5db', background: 'white', color: '#6b7280', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={salvarRascunho} className="lj-btn" style={{ padding: '14px 24px', borderRadius: 14, border: `1.5px solid ${COR}`, background: 'white', color: COR, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Salvar</button>
          <button onClick={enviar} disabled={enviando} className="lj-btn lj-btn-enviar" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 32px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${COR}, ${COR2})`, color: 'white', fontWeight: 700, fontSize: 14, boxShadow: `0 8px 26px ${COR}40`, opacity: enviando ? 0.7 : 1 }}>
            {enviando ? 'Enviando...' : <>Enviar Cadastro <ChevronRight size={16} /></>}
          </button>
        </div>

        <div style={{ textAlign: 'center', paddingTop: 32 }}>
          <p style={{ fontSize: 12, color: '#6b6860' }}>Cadastro feito com <span style={{ fontWeight: 700 }}>NODRI</span> · Gestão de Salões de Beleza</p>
        </div>
      </div>
    </div>
  )
}

function Beneficio({ icone, titulo, texto }: { icone: React.ReactNode; titulo: string; texto: string }) {
  return (
    <div>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: '#f4f3fa', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>{icone}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', marginBottom: 2 }}>{titulo}</div>
      <div style={{ fontSize: 11.5, color: '#6b7280', lineHeight: 1.4 }}>{texto}</div>
    </div>
  )
}

function Cartao({ titulo, icone, cor, children }: { titulo: string; icone: React.ReactNode; cor: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 30px rgba(30,20,60,0.1)' }}>
      <div style={{ background: cor, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {icone}
        <h2 style={{ fontSize: 13, fontWeight: 800, color: 'white', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{titulo}</h2>
      </div>
      <div className="lj-card-body" style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
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

function InputComIcone({ icone, children }: { icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', pointerEvents: 'none' }}>{icone}</span>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '2px solid #f3f4f6', borderRadius: 12, padding: '12px 14px',
  fontSize: 14.5, color: '#1a1a1a', background: '#f9fafb', fontFamily: 'inherit', outline: 'none',
}

const inputComIcone: React.CSSProperties = { ...inputStyle, paddingLeft: 38 }
