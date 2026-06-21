'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Camera, Upload, Plus, X, CheckCircle, Loader2, FileText, User } from 'lucide-react'

const TIPOS_DOC = [
  { key: 'rg', label: 'RG' },
  { key: 'cpf', label: 'CPF' },
  { key: 'comprovante_residencia', label: 'Comprovante de Residência' },
  { key: 'comprovante_mei', label: 'Comprovante de MEI' },
  { key: 'certificado', label: 'Certificado' },
]

interface Documento {
  tipo: string
  label: string
  url: string
  nome: string
}

export default function CadastroPublicoPage() {
  const { token } = useParams<{ token: string }>()
  const [salaoNome, setSalaoNome] = useState('')
  const [invalido, setInvalido] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [fotoPreview, setFotoPreview] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [uploadandoFoto, setUploadandoFoto] = useState(false)
  const fotoRef = useRef<HTMLInputElement>(null)

  const [documentos, setDocumentos] = useState<Documento[]>(
    TIPOS_DOC.map(t => ({ tipo: t.key, label: t.label, url: '', nome: '' }))
  )
  const [uploadandoDoc, setUploadandoDoc] = useState<string | null>(null)
  const docRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const [form, setForm] = useState({
    nome_completo: '', apelido: '', email: '', cpf: '', rg: '', cnpj: '',
    cargo: '', habilidades: '', endereco: '', data_aniversario: '',
    contato_responsavel: '', certificados: '',
    cor_favorita: '', comida_favorita: '', animal_favorito: '', hobbies: '', um_sonho: '',
  })

  useEffect(() => {
    fetch(`/api/cadastro-publico/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setInvalido(true)
        else setSalaoNome(d.salao_nome)
      })
      .catch(() => setInvalido(true))
  }, [token])

  async function uploadFoto(file: File) {
    setUploadandoFoto(true)
    const fd = new FormData()
    fd.append('arquivo', file)
    fd.append('tipo', 'foto')
    const res = await fetch(`/api/cadastro-publico/${token}/upload`, { method: 'POST', body: fd })
    const d = await res.json()
    setUploadandoFoto(false)
    if (d.url) { setFotoUrl(d.url); setFotoPreview(d.url) }
  }

  async function uploadDoc(file: File, tipo: string, label: string) {
    setUploadandoDoc(tipo)
    const fd = new FormData()
    fd.append('arquivo', file)
    fd.append('tipo', tipo)
    const res = await fetch(`/api/cadastro-publico/${token}/upload`, { method: 'POST', body: fd })
    const d = await res.json()
    setUploadandoDoc(null)
    if (d.url) {
      setDocumentos(prev => prev.map(doc =>
        doc.tipo === tipo ? { ...doc, url: d.url, nome: file.name } : doc
      ))
    }
  }

  function adicionarDocExtra() {
    setDocumentos(prev => [...prev, { tipo: `extra_${Date.now()}`, label: 'Documento Adicional', url: '', nome: '' }])
  }

  async function handleSubmit() {
    if (!form.nome_completo.trim()) { alert('Nome completo é obrigatório.'); return }
    setSalvando(true)

    const docsPreenchidos = documentos.filter(d => d.url)
    const payload = {
      ...form,
      foto_url: fotoUrl || null,
      documentos: docsPreenchidos,
    }

    const res = await fetch(`/api/cadastro-publico/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSalvando(false)
    if (res.ok) setEnviado(true)
    else {
      const d = await res.json()
      alert(d.error || 'Erro ao enviar cadastro')
    }
  }

  if (invalido) return (
    <div style={{ minHeight: '100vh', background: '#f0eeea', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ color: '#1a1a1a', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Link inválido</h2>
        <p style={{ color: '#767069', fontSize: '14px' }}>Este link de cadastro não existe ou foi desativado. Solicite um novo link ao salão.</p>
      </div>
    </div>
  )

  if (enviado) return (
    <div style={{ minHeight: '100vh', background: '#f0eeea', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', textAlign: 'center', maxWidth: '400px' }}>
        <CheckCircle size={56} style={{ color: '#10b981', margin: '0 auto 16px', display: 'block' }} />
        <h2 style={{ color: '#1a1a1a', fontSize: '22px', fontWeight: 700, margin: '0 0 12px' }}>Cadastro enviado!</h2>
        <p style={{ color: '#767069', fontSize: '14px', lineHeight: 1.6 }}>
          Suas informações foram enviadas para <strong>{salaoNome}</strong>. A equipe irá analisar e ativar seu perfil em breve.
        </p>
      </div>
    </div>
  )

  const inp = (label: string, field: keyof typeof form, type = 'text', required = false) => (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#767069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        style={{ width: '100%', background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )

  const textarea = (label: string, field: keyof typeof form, placeholder = '') => (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#767069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>{label}</label>
      <textarea
        value={form[field]}
        onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder}
        rows={3}
        style={{ width: '100%', background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
      />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0eeea' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #5b4fcf, #f43f8e)', padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>✂️</div>
        <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: '0 0 6px' }}>{salaoNome || 'Salão'}</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', margin: 0 }}>Preencha seus dados para criar seu perfil profissional</p>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px 40px' }}>

        {/* FOTO */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#767069', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 14px' }}>Foto de Perfil</p>
          <div
            onClick={() => fotoRef.current?.click()}
            style={{ width: '100px', height: '100px', borderRadius: '50%', background: fotoPreview ? 'none' : '#f0eeea', border: `2px dashed ${fotoPreview ? '#5b4fcf' : '#d0cec8'}`, margin: '0 auto 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}
          >
            {fotoPreview
              ? <img src={fotoPreview} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : uploadandoFoto
              ? <Loader2 size={28} style={{ color: '#5b4fcf', animation: 'spin 1s linear infinite' }} />
              : <Camera size={28} style={{ color: '#a09890' }} />
            }
          </div>
          <button onClick={() => fotoRef.current?.click()} style={{ background: 'none', border: '1px solid #5b4fcf', borderRadius: '8px', color: '#5b4fcf', fontSize: '12px', fontWeight: 600, padding: '7px 16px', cursor: 'pointer' }}>
            {fotoPreview ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          <p style={{ color: '#a09890', fontSize: '11px', margin: '8px 0 0' }}>Pode tirar uma foto pelo celular ou escolher da galeria</p>
          <input ref={fotoRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setFotoPreview(URL.createObjectURL(f)); uploadFoto(f) } }} />
        </div>

        {/* DADOS PESSOAIS */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#5b4fcf', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}><User size={14} /> Dados Pessoais</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div style={{ gridColumn: '1 / -1' }}>{inp('Nome Completo', 'nome_completo', 'text', true)}</div>
            {inp('Apelido / Como quer ser chamado', 'apelido')}
            {inp('E-mail', 'email', 'email')}
            {inp('Data de Aniversário', 'data_aniversario', 'date')}
            {inp('CPF', 'cpf')}
            {inp('RG', 'rg')}
            {inp('CNPJ (MEI)', 'cnpj')}
            {inp('Telefone do Responsável / Parente', 'contato_responsavel')}
            <div style={{ gridColumn: '1 / -1' }}>{inp('Endereço', 'endereco')}</div>
          </div>
        </div>

        {/* DADOS PROFISSIONAIS */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#f43f8e', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>💼 Dados Profissionais</p>
          {inp('Categoria / Cargo', 'cargo')}
          {textarea('Habilidades (serviços que consegue fazer)', 'habilidades', 'Ex: Corte feminino, colorimetria, escova...')}
          {textarea('Certificados de Cursos', 'certificados', 'Liste os cursos e certificações que possui')}
        </div>

        {/* PERSONALIDADE */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>😊 Personalidade</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            {inp('Cor Favorita', 'cor_favorita')}
            {inp('Comida Favorita', 'comida_favorita')}
            {inp('Animal Favorito', 'animal_favorito')}
            <div style={{ gridColumn: '1 / -1' }}>{textarea('Hobbies e Paixões', 'hobbies')}</div>
            <div style={{ gridColumn: '1 / -1' }}>{textarea('Um Sonho', 'um_sonho', 'Conte um sonho que você tem...')}</div>
          </div>
        </div>

        {/* DOCUMENTOS */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> Documentos</p>
          <p style={{ color: '#a09890', fontSize: '11px', margin: '0 0 16px' }}>Você pode tirar foto com o celular ou anexar arquivos. Todos são opcionais.</p>

          {documentos.map((doc, i) => (
            <div key={doc.tipo} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < documentos.length - 1 ? '1px solid #f0eeea' : 'none' }}>
              <div style={{ flex: 1 }}>
                {doc.tipo.startsWith('extra_') ? (
                  <input
                    value={doc.label}
                    onChange={e => setDocumentos(prev => prev.map((d, j) => j === i ? { ...d, label: e.target.value } : d))}
                    placeholder="Nome do documento"
                    style={{ width: '100%', border: 'none', background: 'none', fontSize: '13px', color: '#1a1a1a', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                  />
                ) : (
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>{doc.label}</span>
                )}
                {doc.nome && <p style={{ fontSize: '11px', color: '#10b981', margin: '2px 0 0' }}>✓ {doc.nome}</p>}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {uploadandoDoc === doc.tipo
                  ? <Loader2 size={18} style={{ color: '#5b4fcf', animation: 'spin 1s linear infinite' }} />
                  : <>
                    <button
                      onClick={() => docRefs.current[doc.tipo]?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: doc.url ? '#f0fdf4' : '#f5f3ff', border: `1px solid ${doc.url ? '#10b981' : '#5b4fcf'}`, borderRadius: '8px', color: doc.url ? '#10b981' : '#5b4fcf', fontSize: '11px', fontWeight: 600, padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      <Upload size={12} /> {doc.url ? 'Trocaar' : 'Anexar'}
                    </button>
                    {doc.tipo.startsWith('extra_') && (
                      <button
                        onClick={() => setDocumentos(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </>
                }
                <input
                  ref={el => { docRefs.current[doc.tipo] = el }}
                  type="file"
                  accept="image/*,application/pdf,.jpg,.jpeg,.png,.pdf"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f, doc.tipo, doc.label) }}
                />
              </div>
            </div>
          ))}

          <button
            onClick={adicionarDocExtra}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed #d0cec8', borderRadius: '8px', color: '#767069', fontSize: '12px', fontWeight: 600, padding: '9px 14px', cursor: 'pointer', marginTop: '14px', width: '100%', justifyContent: 'center' }}
          >
            <Plus size={14} /> Adicionar mais documento
          </button>
        </div>

        {/* ENVIAR */}
        <button
          onClick={handleSubmit}
          disabled={salvando}
          style={{ width: '100%', background: salvando ? '#a09890' : 'linear-gradient(135deg, #5b4fcf, #f43f8e)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '16px', fontWeight: 700, padding: '16px', cursor: salvando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {salvando ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</> : '✅ Criar Cadastro'}
        </button>

      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
