'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Settings, Download, Eye, Pencil, Trash2, X, Save, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { SEGMENTOS_LOJISTA } from '@/lib/lojistasServicosPadrao'
import MultiSelectBusca, { Opcao } from '@/components/lojistas/MultiSelectBusca'

interface Lojista {
  id: string; nome: string; celular: string; data_aniversario: string | null; email: string | null; instagram: string | null
  nome_loja: string; segmento: string | null; bloco: string | null; numero_loja: string | null
  servicos_interesse: string[]; observacoes: string | null; entrou_grupo: boolean; situacao: 'ativo' | 'inativo'
  criado_em: string
}

const COR = '#5b4fcf'

export default function LojistasPage() {
  const router = useRouter()
  const [lista, setLista] = useState<Lojista[]>([])
  const [loading, setLoading] = useState(true)
  const [servicosCatalogo, setServicosCatalogo] = useState<Opcao[]>([])
  const [editando, setEditando] = useState<Lojista | null>(null)
  const [somenteVisualizar, setSomenteVisualizar] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [filtros, setFiltros] = useState({
    nome: '', loja: '', segmento: '', servico: '', data_de: '', data_ate: '',
    grupo: '', aniversariantes: '', situacao: '',
  })

  const carregar = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)))
    try {
      const d = await fetch(`/api/salon/lojistas?${qs.toString()}`).then(r => r.ok ? r.json() : [])
      setLista(Array.isArray(d) ? d : [])
    } catch { toast.error('Erro ao carregar lojistas') }
    setLoading(false)
  }, [filtros])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    fetch('/api/salon/lojistas/servicos').then(r => r.ok ? r.json() : []).then(d => setServicosCatalogo(Array.isArray(d) ? d.map((s: any) => ({ id: s.id, nome: s.nome })) : []))
  }, [])

  function abrirVisualizar(l: Lojista) { setEditando(l); setSomenteVisualizar(true) }
  function abrirEditar(l: Lojista) { setEditando(l); setSomenteVisualizar(false) }
  function fechar() { setEditando(null) }

  async function excluir(l: Lojista) {
    if (!confirm(`Excluir o lojista "${l.nome}" (${l.nome_loja})?`)) return
    try {
      const res = await fetch(`/api/salon/lojistas/${l.id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Excluído'); carregar() } else toast.error('Erro ao excluir')
    } catch { toast.error('Erro de conexão') }
  }

  async function salvarEdicao(patch: Partial<Lojista>) {
    if (!editando) return
    setSalvando(true)
    try {
      const res = await fetch(`/api/salon/lojistas/${editando.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      })
      if (res.ok) { toast.success('Salvo!'); setEditando(null); carregar() }
      else { const d = await res.json(); toast.error(d.error || 'Erro ao salvar') }
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function linhasExportacao() {
    const cab = ['Nome', 'Loja', 'Segmento', 'Telefone', 'Data Cadastro', 'Aniversário', 'Serviços', 'Participa do Grupo', 'Situação']
    const linhas = lista.map(l => [
      l.nome, l.nome_loja, l.segmento || '', l.celular,
      new Date(l.criado_em).toLocaleDateString('pt-BR'),
      l.data_aniversario ? new Date(`${l.data_aniversario}T00:00:00`).toLocaleDateString('pt-BR') : '',
      (l.servicos_interesse || []).join(', '),
      l.entrou_grupo ? 'Sim' : 'Não',
      l.situacao === 'ativo' ? 'Ativo' : 'Inativo',
    ])
    return [cab, ...linhas]
  }

  function exportarCSV() {
    const linhas = linhasExportacao()
    const csv = linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'lojistas.csv'
    link.click()
  }

  function exportarXLSX() {
    const ws = XLSX.utils.aoa_to_sheet(linhasExportacao())
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Lojistas')
    XLSX.writeFile(wb, 'lojistas.xlsx')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7' }}>
      <nav style={{ background: '#faf9f7', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40, flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 6 }}><Users size={16} color={COR} /> Lojistas</span>
        <div style={{ flex: 1 }} />
        <button onClick={exportarCSV} style={btnGhost}><Download size={14} /> CSV</button>
        <button onClick={exportarXLSX} style={btnGhost}><Download size={14} /> Excel</button>
        <button onClick={() => router.push('/salon/lojistas/configuracoes')} style={btnGhost}><Settings size={14} /> Configurações</button>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>

        {/* FILTROS */}
        <div style={{ background: 'white', border: '1px solid #e8e6e0', borderRadius: 14, padding: 14, marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <input placeholder="Nome" value={filtros.nome} onChange={e => setFiltros(f => ({ ...f, nome: e.target.value }))} style={inp} />
          <input placeholder="Loja" value={filtros.loja} onChange={e => setFiltros(f => ({ ...f, loja: e.target.value }))} style={inp} />
          <select value={filtros.segmento} onChange={e => setFiltros(f => ({ ...f, segmento: e.target.value }))} style={inp}>
            <option value="">Segmento (todos)</option>
            {SEGMENTOS_LOJISTA.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder="Serviço" value={filtros.servico} onChange={e => setFiltros(f => ({ ...f, servico: e.target.value }))} style={inp} />
          <input type="date" title="Cadastrado de" value={filtros.data_de} onChange={e => setFiltros(f => ({ ...f, data_de: e.target.value }))} style={inp} />
          <input type="date" title="Cadastrado até" value={filtros.data_ate} onChange={e => setFiltros(f => ({ ...f, data_ate: e.target.value }))} style={inp} />
          <select value={filtros.grupo} onChange={e => setFiltros(f => ({ ...f, grupo: e.target.value }))} style={inp}>
            <option value="">Participa do grupo (todos)</option>
            <option value="sim">Entrou no grupo</option>
            <option value="nao">Não entrou</option>
          </select>
          <select value={filtros.aniversariantes} onChange={e => setFiltros(f => ({ ...f, aniversariantes: e.target.value }))} style={inp}>
            <option value="">Aniversariantes (todos)</option>
            <option value="hoje">Hoje</option>
            <option value="semana">Nos próximos 7 dias</option>
            <option value="mes">Neste mês</option>
          </select>
          <select value={filtros.situacao} onChange={e => setFiltros(f => ({ ...f, situacao: e.target.value }))} style={inp}>
            <option value="">Situação (todas)</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#9ca3af' }}>Carregando...</div>
        ) : lista.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 50, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 14 }}>
            Nenhum lojista cadastrado ainda com esses filtros.
          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid #e8e6e0', borderRadius: 14, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f6f4ff', textAlign: 'left' }}>
                  {['Nome', 'Loja', 'Segmento', 'Telefone', 'Cadastro', 'Aniversário', 'Serviços', 'Grupo', 'Situação', ''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', fontWeight: 800, color: '#5b4fcf', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map((l, i) => (
                  <tr key={l.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', borderTop: '1px solid #f0eee9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1a1a1a' }}>{l.nome}</td>
                    <td style={{ padding: '10px 12px' }}>{l.nome_loja}</td>
                    <td style={{ padding: '10px 12px' }}>{l.segmento || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{l.celular}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{new Date(l.criado_em).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{l.data_aniversario ? new Date(`${l.data_aniversario}T00:00:00`).toLocaleDateString('pt-BR') : '—'}</td>
                    <td style={{ padding: '10px 12px', maxWidth: 200 }}>{(l.servicos_interesse || []).join(', ') || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: l.entrou_grupo ? '#dcfce7' : '#f3f4f6', color: l.entrou_grupo ? '#16a34a' : '#6b7280' }}>{l.entrou_grupo ? 'Entrou' : 'Não entrou'}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: l.situacao === 'ativo' ? '#dcfce7' : '#fee2e2', color: l.situacao === 'ativo' ? '#16a34a' : '#dc2626' }}>{l.situacao === 'ativo' ? 'Ativo' : 'Inativo'}</span>
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => abrirVisualizar(l)} title="Visualizar" style={btnIcon}><Eye size={14} /></button>
                      <button onClick={() => abrirEditar(l)} title="Editar" style={btnIcon}><Pencil size={14} /></button>
                      <button onClick={() => excluir(l)} title="Excluir" style={{ ...btnIcon, color: '#dc2626' }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editando && (
        <ModalLojista
          lojista={editando}
          somenteVisualizar={somenteVisualizar}
          servicosCatalogo={servicosCatalogo}
          salvando={salvando}
          onFechar={fechar}
          onSalvar={salvarEdicao}
        />
      )}
    </div>
  )
}

function ModalLojista({ lojista, somenteVisualizar, servicosCatalogo, salvando, onFechar, onSalvar }: {
  lojista: Lojista; somenteVisualizar: boolean; servicosCatalogo: Opcao[]; salvando: boolean
  onFechar: () => void; onSalvar: (patch: Partial<Lojista>) => void
}) {
  const [nome, setNome] = useState(lojista.nome)
  const [celular, setCelular] = useState(lojista.celular)
  const [email, setEmail] = useState(lojista.email || '')
  const [instagram, setInstagram] = useState(lojista.instagram || '')
  const [dataAniversario, setDataAniversario] = useState(lojista.data_aniversario || '')
  const [nomeLoja, setNomeLoja] = useState(lojista.nome_loja)
  const [segmento, setSegmento] = useState(lojista.segmento || '')
  const [bloco, setBloco] = useState(lojista.bloco || '')
  const [numeroLoja, setNumeroLoja] = useState(lojista.numero_loja || '')
  const [observacoes, setObservacoes] = useState(lojista.observacoes || '')
  const [situacao, setSituacao] = useState(lojista.situacao)

  // Junta o catálogo atual com os nomes já salvos (que podem ter sido removidos/renomeados do catálogo).
  const catalogoCompleto = useMemo(() => {
    const extras = (lojista.servicos_interesse || [])
      .filter(nomeServ => !servicosCatalogo.some(c => c.nome === nomeServ))
      .map(nomeServ => ({ id: `extra_${nomeServ}`, nome: nomeServ }))
    return [...servicosCatalogo, ...extras]
  }, [servicosCatalogo, lojista.servicos_interesse])

  const [servicosIds, setServicosIds] = useState<string[]>(() =>
    (lojista.servicos_interesse || []).map(nomeServ => catalogoCompleto.find(c => c.nome === nomeServ)?.id || `extra_${nomeServ}`)
  )

  function salvar() {
    const servicos_interesse = catalogoCompleto.filter(c => servicosIds.includes(c.id)).map(c => c.nome)
    onSalvar({
      nome, celular, email: email || null, instagram: instagram || null,
      data_aniversario: dataAniversario || null, nome_loja: nomeLoja, segmento: segmento || null,
      bloco: bloco || null, numero_loja: numeroLoja || null, observacoes: observacoes || null,
      servicos_interesse, situacao,
    })
  }

  const dis = somenteVisualizar

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={onFechar}>
      <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a' }}>{somenteVisualizar ? 'Visualizar Lojista' : 'Editar Lojista'}</h2>
          <button onClick={onFechar} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
          <Campo label="Nome"><input disabled={dis} style={inp} value={nome} onChange={e => setNome(e.target.value)} /></Campo>
          <Campo label="Celular"><input disabled={dis} style={inp} value={celular} onChange={e => setCelular(e.target.value)} /></Campo>
          <Campo label="Data de Aniversário"><input disabled={dis} type="date" style={inp} value={dataAniversario} onChange={e => setDataAniversario(e.target.value)} /></Campo>
          <Campo label="E-mail"><input disabled={dis} style={inp} value={email} onChange={e => setEmail(e.target.value)} /></Campo>
          <Campo label="Instagram"><input disabled={dis} style={inp} value={instagram} onChange={e => setInstagram(e.target.value)} /></Campo>
          <Campo label="Nome da Loja"><input disabled={dis} style={inp} value={nomeLoja} onChange={e => setNomeLoja(e.target.value)} /></Campo>
          <Campo label="Segmento">
            <select disabled={dis} style={inp} value={segmento} onChange={e => setSegmento(e.target.value)}>
              <option value="">—</option>
              {SEGMENTOS_LOJISTA.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Campo>
          <Campo label="Bloco"><input disabled={dis} style={inp} value={bloco} onChange={e => setBloco(e.target.value)} /></Campo>
          <Campo label="Número da Loja"><input disabled={dis} style={inp} value={numeroLoja} onChange={e => setNumeroLoja(e.target.value)} /></Campo>
          <Campo label="Situação">
            <select disabled={dis} style={inp} value={situacao} onChange={e => setSituacao(e.target.value as 'ativo' | 'inativo')}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </Campo>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>Serviços de Interesse</label>
          {dis ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(lojista.servicos_interesse || []).map(s => (
                <span key={s} style={{ padding: '5px 10px', borderRadius: 20, background: `${COR}15`, color: COR, fontSize: 12, fontWeight: 700 }}>{s}</span>
              ))}
              {(lojista.servicos_interesse || []).length === 0 && <span style={{ color: '#9ca3af', fontSize: 13 }}>Nenhum</span>}
            </div>
          ) : (
            <MultiSelectBusca opcoes={catalogoCompleto} selecionados={servicosIds} onChange={setServicosIds} corPrimaria={COR} />
          )}
        </div>

        <Campo label="Observações">
          <textarea disabled={dis} style={{ ...inp, resize: 'none' }} rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)} />
        </Campo>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={onFechar} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{somenteVisualizar ? 'Fechar' : 'Cancelar'}</button>
          {!somenteVisualizar && (
            <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
              {salvando ? '...' : <><Save size={16} /> Salvar</>}
            </button>
          )}
        </div>
      </div>
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

const inp: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, outline: 'none' }
const btnGhost: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid #d0cdc7', background: '#fff', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const btnIcon: React.CSSProperties = { border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer', padding: 6 }
