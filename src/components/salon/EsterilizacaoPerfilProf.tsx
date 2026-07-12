'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Plus, Trash2, Pencil, X, Sparkles, ShieldCheck, ShieldAlert, RotateCcw, Scissors } from 'lucide-react'
import {
import { useGuardaSalvar } from '@/lib/guardaSalvar'
  type EsterilizacaoItem as Item, mesAtualEster as mesAtual, hojeBR, brToIso, isoToBr, mesmoProf, ridEster as rid,
  linhasParaEsterilizacaoItems, esterilizacaoItemsParaTabela,
} from '@/lib/esterilizacaoShared'

const COR = '#5b4fcf'

// Mesmo painel "Atendimentos x Esterilização" da aba Esterilização do
// Administrativo, só que filtrado pra UM profissional — pensado pro perfil
// individual dele. Lê/grava o MESMO documento mensal (chave
// `esterilizacao_MES`), preservando os registros dos outros profissionais
// ao salvar (só mexe nas linhas que pertencem a este aqui).
export default function EsterilizacaoPerfilProf({ chave = 'esterilizacao', nomeCompleto, apelido }: { chave?: string; nomeCompleto: string; apelido?: string }) {
  const [mes, setMes] = useState(mesAtual())
  const [todosItems, setTodosItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Esterilização') // avisa "Deseja salvar?" antes de sair sem salvar
  const [modal, setModal] = useState<Item | null>(null)
  const [atendimentos, setAtendimentos] = useState(0)
  const [servicos, setServicos] = useState<string[]>([])
  const [loadingAtend, setLoadingAtend] = useState(true)

  const chaveEfetiva = `${chave}_${mes}`
  const nomeExibicao = apelido || nomeCompleto

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/grid?chave=${encodeURIComponent(chaveEfetiva)}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.tabelas) && d.tabelas[0]) setTodosItems(linhasParaEsterilizacaoItems(d.tabelas[0].linhas || []))
      else setTodosItems([])
      setDirty(false)
    } catch { setTodosItems([]); setDirty(false) }
    setLoading(false)
  }, [chaveEfetiva])
  useEffect(() => { carregar() }, [carregar])

  const carregarAtendimentos = useCallback(async () => {
    setLoadingAtend(true)
    try {
      const [ano, mesNum] = mes.split('-').map(Number)
      const d = await fetch(`/api/relatorios/esterilizacao?ano=${ano}&mes=${mesNum}`).then(r => r.ok ? r.json() : null)
      const lista: any[] = Array.isArray(d?.profissionais) ? d.profissionais : []
      const match = lista.find(p => mesmoProf(p.profissional, nomeCompleto) || (apelido && mesmoProf(p.profissional, apelido)))
      setAtendimentos(match?.atendimentos || 0)
      setServicos(match ? Object.keys(match.servicos || {}) : [])
    } catch { setAtendimentos(0); setServicos([]) }
    setLoadingAtend(false)
  }, [mes, nomeCompleto, apelido])
  useEffect(() => { carregarAtendimentos() }, [carregarAtendimentos])

  // Só as linhas deste profissional (dentro do documento mensal compartilhado)
  const meusItems = todosItems.filter(it => mesmoProf(it.profissional, nomeCompleto) || (apelido && mesmoProf(it.profissional, apelido)))
  const esterilizacoes = meusItems.reduce((s, it) => s + (Number(String(it.quantidade).replace(',', '.')) || 0), 0)
  const critico = atendimentos > 0 && meusItems.length === 0
  const atencao = !critico && meusItems.length > 0 && esterilizacoes < atendimentos
  const cor = critico ? '#dc2626' : atencao ? '#b45309' : '#16a34a'
  const situacao = critico ? '🔴 Nunca registrou' : atencao ? '🟡 Abaixo do esperado' : '✓ Em dia'

  async function salvar() {
    setSalvando(true)
    try {
      const tabela = esterilizacaoItemsParaTabela(todosItems)
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: chaveEfetiva, doc: { tabelas: [tabela] } }) })
      if (res.ok) { toast.success('Registros salvos!'); setDirty(false) }
      else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function abrirNovo() { setModal({ id: rid(), profissional: nomeExibicao, quantidade: '1', data: hojeBR(), dataDevolucao: '', observacao: '' }) }
  function abrirEditar(it: Item) { setModal({ ...it }) }
  function salvarModal() {
    if (!modal) return
    if (!modal.profissional.trim()) { toast('Informe o profissional', { icon: '✍️' }); return }
    setTodosItems(prev => prev.some(x => x.id === modal.id) ? prev.map(x => x.id === modal.id ? modal : x) : [...prev, modal])
    setDirty(true); setModal(null)
  }
  function excluir(id: string) {
    if (!confirm('Remover este registro?')) return
    setTodosItems(prev => prev.filter(x => x.id !== id)); setDirty(true)
  }
  function marcarDevolvido(id: string) { setTodosItems(prev => prev.map(x => x.id === id ? { ...x, dataDevolucao: hojeBR() } : x)); setDirty(true) }
  function reabrir(id: string) { setTodosItems(prev => prev.map(x => x.id === id ? { ...x, dataDevolucao: '' } : x)); setDirty(true) }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#6b6860' }}>Mês:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 9px', borderRadius: 8, border: '1px solid #d0cdc7', fontSize: 13 }} />
        <div style={{ flex: 1 }} />
        {dirty && !salvando && <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>Alterações não salvas</span>}
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
        <button onClick={abrirNovo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}><Plus size={15} /> Registrar Esterilização</button>
      </div>

      {loading || loadingAtend ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: COR }} /></div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
            <StatCard icon={<Scissors size={16} />} label="Atendimentos c/ alicate" value={String(atendimentos)} sub="manicure, pedicure, sobrancelha" />
            <StatCard icon={<Sparkles size={16} />} label="Esterilizações registradas" value={String(esterilizacoes)} sub="itens de material" cor="#16a34a" />
            <StatCard icon={critico || atencao ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />} label="Situação" value={situacao} sub={`${mes.split('-').reverse().join('/')}`} cor={cor} />
          </div>

          {servicos.length > 0 && (
            <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '-10px 0 18px' }}>Serviços considerados: {servicos.join(', ')}</p>
          )}

          <h3 style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>🧽 Registros de esterilização do mês</h3>
          {meusItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13.5, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
              Nenhum registro ainda. Clique em <strong style={{ color: COR }}>+ Registrar Esterilização</strong> para começar.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {meusItems.map(it => {
                const pendente = !it.dataDevolucao.trim()
                return (
                  <div key={it.id} style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>Enviado em {it.data}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => abrirEditar(it)} style={iconBtn('#5b4fcf')}><Pencil size={13} /></button>
                        <button onClick={() => excluir(it.id)} style={iconBtn('#dc2626')}><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#374151' }}>Quantidade de material: <strong>{it.quantidade || '—'}</strong></div>
                    {it.observacao && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>{it.observacao}</div>}
                    <div style={{ marginTop: 10, padding: '8px 10px', background: pendente ? '#fef2f2' : '#f0fdf4', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: pendente ? '#dc2626' : '#16a34a' }}>{pendente ? '🔴 PENDENTE' : `✓ DEVOLVIDO ${it.dataDevolucao}`}</span>
                      {pendente
                        ? <button onClick={() => marcarDevolvido(it.id)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Marcar devolvido</button>
                        : <button onClick={() => reabrir(it.id)} title="Reabrir" style={iconBtn('#6b6860')}><RotateCcw size={13} /></button>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 20, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#1a1a1a' }}>{todosItems.some(x => x.id === modal.id) ? '✏️ Editar registro' : '🧽 Registrar esterilização'}</h3>
              <button onClick={() => setModal(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>

            <Campo label="Profissional">
              <input value={modal.profissional} onChange={e => setModal({ ...modal, profissional: e.target.value })} style={inputSt} />
            </Campo>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Campo label="Quantidade de material">
                <input value={modal.quantidade} onChange={e => setModal({ ...modal, quantidade: e.target.value })} placeholder="Ex: 3" style={inputSt} />
              </Campo>
              <Campo label="Enviado em">
                <input type="date" value={brToIso(modal.data)} onChange={e => setModal({ ...modal, data: isoToBr(e.target.value) })} style={inputSt} />
              </Campo>
            </div>

            <Campo label="Data da devolução (deixe vazio se ainda não voltou)">
              <input type="date" value={brToIso(modal.dataDevolucao)} onChange={e => setModal({ ...modal, dataDevolucao: isoToBr(e.target.value) })} style={inputSt} />
            </Campo>

            <Campo label="Observação">
              <input value={modal.observacao} onChange={e => setModal({ ...modal, observacao: e.target.value })} placeholder="Opcional" style={inputSt} />
            </Campo>

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvarModal} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub, cor = COR }: { icon: React.ReactNode; label: string; value: string; sub: string; cor?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, color: cor }}>{icon}<span style={{ fontSize: 11.5, fontWeight: 700, color: '#6b6860' }}>{label}</span></div>
      <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a1a', lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b6860', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const inputSt: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 9, border: '1.5px solid #d0cdc7', fontSize: 13.5, fontFamily: 'inherit' }
function iconBtn(cor: string): React.CSSProperties { return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: cor, cursor: 'pointer' } }
