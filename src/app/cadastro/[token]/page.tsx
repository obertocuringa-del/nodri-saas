'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Camera, Upload, Plus, X, CheckCircle, Loader2, FileText } from 'lucide-react'

const TIPOS_DOC = [
  { key: 'rg', label: 'RG' },
  { key: 'cpf', label: 'CPF' },
  { key: 'comprovante_residencia', label: 'Comprovante de Residência' },
  { key: 'comprovante_mei', label: 'Comprovante de MEI' },
  { key: 'certificado', label: 'Certificado' },
]

interface Documento { tipo: string; label: string; url: string; nome: string }

const HORAS = Array.from({ length: 18 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`)
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const CATEGORIAS = ['Cabeleireiro', 'Manicure', 'Pedicure', 'Assistente', 'Massoterapeuta', 'Maquiador(a)', 'Colorista', 'Recepcionista']

export default function CadastroPublicoPage() {
  const { token } = useParams<{ token: string }>()
  const [salaoNome, setSalaoNome] = useState('')
  const [invalido, setInvalido] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [servicosSalao, setServicosSalao] = useState<any[]>([])
  const [categoriasSalao, setCategoriasSalao] = useState<string[]>([])
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([])
  const [servicosAberto, setServicosAberto] = useState(false)

  const [fotoPreview, setFotoPreview] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [uploadandoFoto, setUploadandoFoto] = useState(false)
  const fotoRef = useRef<HTMLInputElement>(null)

  const [documentos, setDocumentos] = useState<Documento[]>(
    TIPOS_DOC.map(t => ({ tipo: t.key, label: t.label, url: '', nome: '' }))
  )
  const [uploadandoDoc, setUploadandoDoc] = useState<string | null>(null)
  const docRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Dados pessoais
  const [nome, setNome] = useState('')
  const [apelido, setApelido] = useState('')
  const [cargo, setCargo] = useState('')
  const [cpf, setCpf] = useState('')
  const [rg, setRg] = useState('')
  const [dataNasc, setDataNasc] = useState('')
  const [email, setEmail] = useState('')
  const [endereco, setEndereco] = useState('')
  const [nomeResp, setNomeResp] = useState('')
  const [telResp, setTelResp] = useState('')

  // Horários
  const [diasFolga, setDiasFolga] = useState<string[]>([])
  const [hInicio, setHInicio] = useState('')
  const [hFim, setHFim] = useState('')
  const [hObs, setHObs] = useState('')

  // Perfil pessoal
  const [corFav, setCorFav] = useState('')
  const [comidaFav, setComidaFav] = useState('')
  const [animalFav, setAnimalFav] = useState('')
  const [hobbies, setHobbies] = useState('')
  const [sonho, setSonho] = useState('')

  // Dados profissionais
  const [cnpj, setCnpj] = useState('')
  const [banco, setBanco] = useState('')
  const [certificados, setCertificados] = useState('')

  useEffect(() => {
    fetch(`/api/cadastro-publico/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setInvalido(true); return }
        setSalaoNome(d.salao_nome)
        // Carrega serviços e categorias do salão via token
        fetch(`/api/cadastro-publico/${token}/servicos`)
          .then(r => r.json())
          .then(d => {
            if (d.servicos) setServicosSalao(d.servicos)
            if (d.categorias) setCategoriasSalao(d.categorias)
          })
          .catch(() => {})
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
      setDocumentos(prev => prev.map(doc => doc.tipo === tipo ? { ...doc, url: d.url, nome: file.name } : doc))
    }
  }

  async function handleSubmit() {
    if (!nome.trim()) { alert('Nome completo é obrigatório.'); return }
    setSalvando(true)

    const payload = {
      nome_completo: nome,
      apelido,
      cargo,
      cpf,
      rg,
      data_aniversario: dataNasc || null,
      email,
      endereco,
      contato_responsavel: JSON.stringify({ nome: nomeResp, tel: telResp }),
      habilidades: JSON.stringify({ dias_folga: diasFolga, h_inicio: hInicio, h_fim: hFim, h_obs: hObs }),
      cor_favorita: corFav,
      comida_favorita: comidaFav,
      animal_favorito: animalFav,
      hobbies,
      um_sonho: sonho,
      cnpj,
      conta_bancaria: banco,
      certificados,
      foto_url: fotoUrl || null,
      servicos_habilitados: servicosSelecionados,
      documentos: documentos.filter(d => d.url),
    }

    const res = await fetch(`/api/cadastro-publico/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSalvando(false)
    if (res.ok) setEnviado(true)
    else { const d = await res.json(); alert(d.error || 'Erro ao enviar') }
  }

  const inp = (label: string, val: string, set: (v: string) => void, opts?: { type?: string; placeholder?: string; full?: boolean }) => (
    <div style={opts?.full ? { gridColumn: '1 / -1' } : {}}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#767069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>{label}</label>
      <input type={opts?.type || 'text'} value={val} onChange={e => set(e.target.value)} placeholder={opts?.placeholder || label}
        style={{ width: '100%', background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  )

  const ta = (label: string, val: string, set: (v: string) => void, placeholder = '') => (
    <div style={{ gridColumn: '1 / -1' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#767069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>{label}</label>
      <textarea value={val} onChange={e => set(e.target.value)} placeholder={placeholder} rows={3}
        style={{ width: '100%', background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
    </div>
  )

  const card = (title: string, color: string, children: React.ReactNode) => (
    <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
      <p style={{ fontSize: '12px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>{title}</p>
      {children}
    </div>
  )

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
          <div onClick={() => fotoRef.current?.click()}
            style={{ width: '100px', height: '100px', borderRadius: '50%', background: fotoPreview ? 'none' : '#f0eeea', border: `2px dashed ${fotoPreview ? '#5b4fcf' : '#d0cec8'}`, margin: '0 auto 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {fotoPreview ? <img src={fotoPreview} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : uploadandoFoto ? <Loader2 size={28} style={{ color: '#5b4fcf', animation: 'spin 1s linear infinite' }} />
              : <Camera size={28} style={{ color: '#a09890' }} />}
          </div>
          <button onClick={() => fotoRef.current?.click()} style={{ background: 'none', border: '1px solid #5b4fcf', borderRadius: '8px', color: '#5b4fcf', fontSize: '12px', fontWeight: 600, padding: '7px 16px', cursor: 'pointer' }}>
            {fotoPreview ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          <p style={{ color: '#a09890', fontSize: '11px', margin: '8px 0 0' }}>Pode tirar uma foto pelo celular ou escolher da galeria</p>
          <input ref={fotoRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) { setFotoPreview(URL.createObjectURL(f)); uploadFoto(f) } }} />
        </div>

        {/* DADOS PESSOAIS */}
        {card('👤 Dados Pessoais', '#5b4fcf',
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {inp('Nome Completo *', nome, setNome, { full: true })}
            {inp('Apelido', apelido, setApelido)}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#767069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>Cargo / Categoria</label>
              <select value={cargo} onChange={e => setCargo(e.target.value)}
                style={{ width: '100%', background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: cargo ? '#1a1a1a' : '#a09890', outline: 'none', boxSizing: 'border-box' }}>
                <option value="">Selecione...</option>
                {(categoriasSalao.length > 0 ? categoriasSalao : CATEGORIAS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {inp('CPF', cpf, setCpf, { placeholder: '000.000.000-00' })}
            {inp('RG', rg, setRg)}
            {inp('Data de Aniversário', dataNasc, setDataNasc, { type: 'date' })}
            {inp('E-mail', email, setEmail, { type: 'email' })}
            {inp('Endereço', endereco, setEndereco, { full: true })}
            {inp('Nome do Responsável', nomeResp, setNomeResp)}
            {inp('Telefone do Responsável', telResp, setTelResp, { placeholder: '(00) 00000-0000' })}

            {/* Dias de Folga */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#767069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Dias de Folga</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {DIAS.map(d => {
                  const on = diasFolga.includes(d)
                  return (
                    <button key={d} type="button" onClick={() => setDiasFolga(prev => on ? prev.filter(x => x !== d) : [...prev, d])}
                      style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, border: `1px solid ${on ? '#06b6d4' : '#e8e6e0'}`, background: on ? '#06b6d420' : '#fff', color: on ? '#0891b2' : '#767069', cursor: 'pointer' }}>
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Horário de Trabalho */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#767069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Horário de Trabalho</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#a09890', marginBottom: '4px' }}>De</label>
                  <select value={hInicio} onChange={e => setHInicio(e.target.value)}
                    style={{ width: '100%', background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="">Selecione</option>
                    {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#a09890', marginBottom: '4px' }}>Até</label>
                  <select value={hFim} onChange={e => setHFim(e.target.value)}
                    style={{ width: '100%', background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="">Selecione</option>
                    {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '10px', color: '#a09890', marginBottom: '4px' }}>Observação de Horário</label>
                  <input value={hObs} onChange={e => setHObs(e.target.value)} placeholder="Ex: Nas terças-feiras entra às 14:00"
                    style={{ width: '100%', background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            {/* Serviços */}
            {servicosSalao.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#767069', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Serviços que Realiza</label>
                <div style={{ position: 'relative' }}>
                  <button type="button" onClick={() => setServicosAberto(o => !o)}
                    style={{ width: '100%', background: '#fff', border: '1px solid #e8e6e0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: servicosSelecionados.length ? '#1a1a1a' : '#a09890', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                    <span>{servicosSelecionados.length ? `${servicosSelecionados.length} serviço(s) selecionado(s)` : 'Clique para selecionar...'}</span>
                    <span style={{ fontSize: '10px' }}>▼</span>
                  </button>
                  {servicosAberto && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #e8e6e0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '240px', overflowY: 'auto', marginTop: '4px' }}>
                      {servicosSalao.map((s: any) => {
                        const sel = servicosSelecionados.includes(s.id)
                        return (
                          <button key={s.id} type="button" onClick={() => setServicosSelecionados(prev => sel ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: sel ? '#f5f3ff' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f0eeea' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${sel ? '#5b4fcf' : '#d0cec8'}`, background: sel ? '#5b4fcf' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {sel && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', color: '#1a1a1a', fontWeight: sel ? 600 : 400 }}>{s.nome}</div>
                              {s.categoria && <div style={{ fontSize: '10px', color: '#a09890' }}>{s.categoria}</div>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PERFIL PESSOAL */}
        {card('😊 Perfil Pessoal', '#f43f8e',
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {inp('Cor Favorita', corFav, setCorFav)}
            {inp('Comida Favorita', comidaFav, setComidaFav)}
            {inp('Animal Favorito', animalFav, setAnimalFav)}
            <div />
            {ta('Hobbies e Paixões', hobbies, setHobbies)}
            {ta('Um Sonho', sonho, setSonho, 'Conte um sonho que você tem...')}
          </div>
        )}

        {/* DADOS PROFISSIONAIS */}
        {card('💼 Dados Profissionais', '#0891b2',
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {inp('CNPJ (MEI)', cnpj, setCnpj, { placeholder: '00.000.000/0001-00' })}
            {inp('Dados Bancários (Banco / Ag / Conta)', banco, setBanco, { placeholder: 'Banco / Ag / Conta' })}
            {ta('Certificados de Curso', certificados, setCertificados, 'Liste os cursos e certificações que possui')}
          </div>
        )}

        {/* DOCUMENTOS */}
        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> Documentos</p>
          <p style={{ color: '#a09890', fontSize: '11px', margin: '0 0 16px' }}>Pode tirar foto com o celular ou anexar arquivos. Todos são opcionais.</p>

          {documentos.map((doc, i) => (
            <div key={doc.tipo} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < documentos.length - 1 ? '1px solid #f0eeea' : 'none' }}>
              <div style={{ flex: 1 }}>
                {doc.tipo.startsWith('extra_') ? (
                  <input value={doc.label} onChange={e => setDocumentos(prev => prev.map((d, j) => j === i ? { ...d, label: e.target.value } : d))}
                    placeholder="Nome do documento"
                    style={{ width: '100%', border: 'none', background: 'none', fontSize: '13px', color: '#1a1a1a', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }} />
                ) : (
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>{doc.label}</span>
                )}
                {doc.nome && <p style={{ fontSize: '11px', color: '#10b981', margin: '2px 0 0' }}>✓ {doc.nome}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {uploadandoDoc === doc.tipo
                  ? <Loader2 size={18} style={{ color: '#5b4fcf', animation: 'spin 1s linear infinite' }} />
                  : <>
                    <button onClick={() => docRefs.current[doc.tipo]?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: doc.url ? '#f0fdf4' : '#f5f3ff', border: `1px solid ${doc.url ? '#10b981' : '#5b4fcf'}`, borderRadius: '8px', color: doc.url ? '#10b981' : '#5b4fcf', fontSize: '11px', fontWeight: 600, padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <Upload size={12} /> {doc.url ? 'Trocar' : 'Anexar'}
                    </button>
                    {doc.tipo.startsWith('extra_') && (
                      <button onClick={() => setDocumentos(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}>
                        <X size={14} />
                      </button>
                    )}
                  </>
                }
                <input ref={el => { docRefs.current[doc.tipo] = el }} type="file" accept="image/*,application/pdf" capture="environment" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f, doc.tipo, doc.label) }} />
              </div>
            </div>
          ))}

          <button onClick={() => setDocumentos(prev => [...prev, { tipo: `extra_${Date.now()}`, label: 'Documento Adicional', url: '', nome: '' }])}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed #d0cec8', borderRadius: '8px', color: '#767069', fontSize: '12px', fontWeight: 600, padding: '9px 14px', cursor: 'pointer', marginTop: '14px', width: '100%', justifyContent: 'center' }}>
            <Plus size={14} /> Adicionar mais documento
          </button>
        </div>

        {/* ENVIAR */}
        <button onClick={handleSubmit} disabled={salvando}
          style={{ width: '100%', background: salvando ? '#a09890' : 'linear-gradient(135deg, #5b4fcf, #f43f8e)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '16px', fontWeight: 700, padding: '16px', cursor: salvando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {salvando ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</> : '✅ Criar Cadastro'}
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
