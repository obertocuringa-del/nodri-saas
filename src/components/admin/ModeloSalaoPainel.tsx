'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PAINEL DO SALÃO MODELO (master)
//
// Define qual salão é o MODELO e alimenta ele a partir de um salão maduro.
// A cópia traz SÓ estrutura — o preenchimento de cada salão nunca viaja
// (ver lib/modeloSalao). Importar nunca sobrescreve o que já está no modelo:
// só acrescenta o que falta.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Star, Download, ShieldCheck, ShieldAlert, RefreshCw, Check, Wand2 } from 'lucide-react'

interface SalaoLinha { id: string; nome: string; is_modelo: boolean; modelo_versao?: string | null; modelo_aplicado_em?: string | null }
interface Dados {
  modelo: { id: string; nome: string } | null
  versao: string
  chavesDoModelo: string[]
  saloes: SalaoLinha[]
  faltando: { chave: string; rotulo: string }[]
  ignorado: string[]
  sugestao: { modelo: { id: string; nome: string; itens: number }; origem: { id: string; nome: string; itens: number }; jaEhModelo: boolean } | null
  regras: { chave: string; rotulo: string }[]
  nuncaCopia: string[]
}

const COR = '#5b4fcf'

export default function ModeloSalaoPainel() {
  const [d, setD] = useState<Dados | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [origem, setOrigem] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async (comOrigem = origem) => {
    setCarregando(true); setErro('')
    try {
      const url = '/api/admin/modelo' + (comOrigem ? `?origem=${encodeURIComponent(comOrigem)}` : '')
      const r = await fetch(url)
      if (!r.ok) { const e = await r.json().catch(() => null); setErro(e?.error || 'Erro ao carregar'); setD(null) }
      else setD(await r.json())
    } catch { setErro('Erro de conexão') }
    setCarregando(false)
  }, [origem])
  useEffect(() => { carregar('') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function acao(corpo: any, msg: string) {
    setOcupado(true)
    try {
      const r = await fetch('/api/admin/modelo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      const j = await r.json().catch(() => null)
      if (r.ok) { toast.success(typeof msg === 'string' ? msg : 'Pronto!'); await carregar() }
      else toast.error(j?.error || 'Erro')
    } catch { toast.error('Erro de conexão') }
    setOcupado(false)
  }

  if (carregando) return <div style={{ padding: 50, textAlign: 'center', color: '#9ca3af' }}><Loader2 size={22} className="animate-spin" style={{ display: 'inline' }} /> Carregando…</div>

  if (erro) return (
    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 18, color: '#991b1b' }}>
      <strong>{erro}</strong>
      <p style={{ fontSize: 13, marginTop: 8 }}>
        Se a mensagem fala em coluna inexistente, falta rodar o <code>sql_salao_modelo.sql</code> no Supabase.
      </p>
    </div>
  )
  if (!d) return null

  const outros = d.saloes.filter(s => !s.is_modelo)
  const sug = d.sugestao

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* CONFIGURAÇÃO EM UM PASSO — some quando o modelo já tem estrutura */}
      {sug && d.chavesDoModelo.length === 0 && (
        <div style={{ background: 'linear-gradient(135deg,#5b4fcf,#7c3aed)', color: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 10px 26px rgba(91,79,207,.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Wand2 size={19} />
            <h3 style={{ fontSize: 16.5, fontWeight: 900, margin: 0 }}>Configurar de uma vez</h3>
          </div>
          <p style={{ fontSize: 13.5, margin: '0 0 4px', opacity: .97 }}>
            Vou marcar <strong>{sug.modelo.nome}</strong> como modelo e trazer a estrutura de <strong>{sug.origem.nome}</strong>
            {' '}({sug.origem.itens} item(ns) de estrutura lá).
          </p>
          <p style={{ fontSize: 12.5, margin: '0 0 14px', opacity: .9 }}>
            Só estrutura viaja: os check lists chegam <strong>sem as marcações</strong>, e valores, clientes e profissionais
            do {sug.origem.nome} <strong>não saem de lá</strong>. Nada é apagado em nenhum dos dois.
          </p>
          <button
            onClick={() => {
              if (!confirm(`Confirmar?\n\n• ${sug.modelo.nome} vira o salão modelo\n• A estrutura de ${sug.origem.nome} é copiada para ele\n\nNenhum dado é apagado.`)) return
              acao({ acao: 'configurar', modeloId: sug.modelo.id, origemId: sug.origem.id }, 'Pronto! Modelo configurado.')
            }}
            disabled={ocupado} style={{ ...btn('#fff', '#5b4fcf', 'none'), fontSize: 14, padding: '11px 22px' }}>
            {ocupado ? <Loader2 size={15} className="animate-spin" /> : <><Wand2 size={15} /> Fazer isso agora</>}
          </button>
        </div>
      )}

      {/* Quem é o modelo */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Star size={18} color={COR} fill={d.modelo ? COR : 'none'} />
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Salão modelo</h3>
        </div>
        {d.modelo ? (
          <p style={{ fontSize: 13.5, color: '#374151', margin: '0 0 12px' }}>
            Hoje é <strong style={{ color: COR }}>{d.modelo.nome}</strong> — {d.chavesDoModelo.length} item(ns) de estrutura ·
            versão <code style={{ fontSize: 12 }}>{d.versao || '—'}</code>
          </p>
        ) : (
          <p style={{ fontSize: 13.5, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '9px 12px', margin: '0 0 12px' }}>
            Nenhum salão é o modelo ainda. Enquanto não houver, salão novo nasce vazio (como era antes) e ninguém recebe aviso.
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={d.modelo?.id || ''} onChange={e => e.target.value && acao({ acao: 'definir', salaoId: e.target.value }, 'Modelo definido!')}
            disabled={ocupado} style={inp}>
            <option value="">Escolher o salão modelo…</option>
            {d.saloes.map(s => <option key={s.id} value={s.id}>{s.nome}{s.is_modelo ? '  ★' : ''}</option>)}
          </select>
          <button onClick={() => carregar()} disabled={ocupado} style={btn('#fff', '#6b6860', '1px solid #d0cdc7')}><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Importar de um salão maduro */}
      {d.modelo && (
        <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Download size={17} color={COR} />
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Completar o modelo a partir de outro salão</h3>
          </div>
          <p style={{ fontSize: 12.5, color: '#6b6860', margin: '0 0 12px' }}>
            Traz só o que o modelo <strong>ainda não tem</strong> — nunca sobrescreve o que já está lá.
            E só vem <strong>estrutura</strong>: check lists chegam sem as marcações, e nada de valores, clientes ou profissionais.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <select value={origem} onChange={e => { setOrigem(e.target.value); carregar(e.target.value) }} disabled={ocupado} style={inp}>
              <option value="">Escolher o salão de origem…</option>
              {outros.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            {/* O botão NÃO pode depender só de `faltando`: essa lista conta as
                chaves de salao_config, mas a importação também traz os
                catálogos que moram em tabelas próprias (setores, serviços,
                módulos, feedback). Com `faltando` em 0 e catálogos pendentes,
                o botão travava e não havia como copiá-los pela tela. */}
            {origem && (
              <button onClick={() => acao({ acao: 'importar', origemId: origem }, 'Importado para o modelo!')}
                disabled={ocupado} style={btn('#16a34a', '#fff', 'none')}>
                {ocupado ? '...' : <><Download size={14} /> {d.faltando.length > 0 ? `Importar ${d.faltando.length} item(ns)` : 'Importar catálogos e setores'}</>}
              </button>
            )}
          </div>

          {origem && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              <div style={cx('#f0fdf4', '#bbf7d0')}>
                <div style={cabecalho('#15803d')}><ShieldCheck size={14} /> Vai ser copiado ({d.faltando.length})</div>
                {d.faltando.length === 0
                  ? <p style={vazio}>O modelo já tem tudo que este salão tem de estrutura.</p>
                  : d.faltando.map(f => <div key={f.chave} style={linha}><strong>{f.rotulo}</strong><span style={{ color: '#9ca3af' }}>{f.chave}</span></div>)}
              </div>
              <div style={cx('#faf9f7', '#e8e6e0')}>
                <div style={cabecalho('#6b6860')}><ShieldAlert size={14} /> Fica no salão ({d.ignorado.length})</div>
                <p style={vazio}>Preenchimento — não viaja por regra.</p>
                <div style={{ maxHeight: 190, overflowY: 'auto' }}>
                  {d.ignorado.map(k => <div key={k} style={{ ...linha, color: '#9ca3af' }}>{k}</div>)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Situação dos salões */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 18 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px' }}>Situação dos salões</h3>
        <p style={{ fontSize: 12.5, color: '#6b6860', margin: '0 0 12px' }}>
          Quem está atrás da versão atual recebe o aviso dentro do sistema e decide se aplica. Ninguém é atualizado sozinho.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {d.saloes.map(s => {
            const emDia = s.is_modelo || s.modelo_versao === d.versao
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '9px 12px', borderRadius: 9, background: s.is_modelo ? '#f0eefb' : '#faf9f7' }}>
                <strong style={{ fontSize: 13.5, minWidth: 160 }}>{s.nome}</strong>
                {s.is_modelo && <span style={selo(COR, '#fff')}>★ MODELO</span>}
                <div style={{ flex: 1 }} />
                {!s.is_modelo && (emDia
                  ? <span style={selo('#dcfce7', '#15803d')}><Check size={11} /> em dia</span>
                  : <span style={selo('#fef3c7', '#b45309')}>vai receber aviso</span>)}
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  {s.modelo_aplicado_em ? new Date(s.modelo_aplicado_em).toLocaleDateString('pt-BR') : 'nunca aplicou'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* A regra, à vista */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 18 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 10px' }}>O que o modelo distribui</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          <div>
            <div style={cabecalho('#15803d')}><ShieldCheck size={14} /> Estrutura — viaja</div>
            {d.regras.map(r => <div key={r.chave} style={linha}><strong>{r.rotulo}</strong><span style={{ color: '#9ca3af' }}>{r.chave}</span></div>)}
          </div>
          <div>
            <div style={cabecalho('#b45309')}><ShieldAlert size={14} /> Preenchimento — nunca sai do salão</div>
            {d.nuncaCopia.map((n, i) => <div key={i} style={{ ...linha, color: '#6b6860' }}>{n}</div>)}
          </div>
        </div>
        <PaginasComDados />
      </div>
    </div>
  )
}

// ── Quais páginas viajam COM o conteúdo ─────────────────────────────────────
//
// Por padrão o modelo manda a página montada e VAZIA — é o que impede o
// conteúdo de um salão de aparecer no outro. Aqui o dono do sistema marca as
// exceções: páginas em que o conteúdo É o produto (lista de materiais,
// catálogo de referência) e que devem chegar preenchidas.
function PaginasComDados() {
  const [dados, setDados] = useState<{ paginas: any[] } | null>(null)
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')

  const carregar = useCallback(() => {
    fetch('/api/admin/modelo/paginas')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        setDados(d)
        setMarcadas(new Set(d.paginas.filter((p: any) => p.marcada).map((p: any) => p.chave)))
      })
      .catch(() => { /* a seção some */ })
  }, [])
  useEffect(() => { carregar() }, [carregar])

  if (!dados) return null

  const lista = dados.paginas.filter((p: any) =>
    !busca.trim() || (p.rotulo + ' ' + p.chave).toLowerCase().includes(busca.toLowerCase()))

  async function salvar() {
    setSalvando(true)
    const r = await fetch('/api/admin/modelo/paginas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chaves: [...marcadas] }),
    })
    setSalvando(false)
    if (r.ok) { toast.success('Escolha salva — vale nas próximas atualizações'); carregar() }
    else toast.error('Não deu para salvar')
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Check size={17} color={COR} />
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Páginas que chegam PREENCHIDAS nos salões</h3>
      </div>
      <p style={{ fontSize: 12.5, color: '#6b6860', margin: '0 0 12px' }}>
        Por padrão a página vai montada e <strong>vazia</strong> — assim o conteúdo de um salão nunca aparece no outro.
        Marque aqui as que devem levar o conteúdo junto (lista de materiais, catálogos de referência).
        Quem já tem a página <strong>recebe só o que falta</strong>: nada é apagado.
      </p>

      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Procurar página…"
        style={{ ...inp, minWidth: 220, marginBottom: 10 }} />

      <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #f0eee8', borderRadius: 10 }}>
        {lista.map((p: any) => (
          <label key={p.chave} style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '7px 11px',
            borderBottom: '1px solid #f7f6f3', fontSize: 12.5, cursor: p.sempreVaiCheia ? 'default' : 'pointer',
            opacity: p.sempreVaiCheia ? .6 : 1,
          }}>
            <input type="checkbox" disabled={p.sempreVaiCheia}
              checked={p.sempreVaiCheia || marcadas.has(p.chave)}
              onChange={() => setMarcadas(m => {
                const n = new Set(m); n.has(p.chave) ? n.delete(p.chave) : n.add(p.chave); return n
              })} />
            {/* A chave vai junto: várias páginas compartilham o mesmo rótulo
                (as listas de compra, uma por setor) e sem ela não dá para
                saber qual é qual na hora de marcar. */}
            <span style={{ flex: 1, minWidth: 0 }}>
              {p.rotulo}
              <span style={{ color: '#b8b4ad', marginLeft: 6, fontSize: 11 }}>{p.chave}</span>
            </span>
            <span style={{ fontSize: 10.5, color: '#9ca3af', whiteSpace: 'nowrap' }}>
              {p.textos > 0 ? `${p.textos} textos` : 'vazia'}{p.sempreVaiCheia ? ' · sempre cheia' : ''}
            </span>
          </label>
        ))}
      </div>

      <button onClick={salvar} disabled={salvando} style={{ ...btn(COR, '#fff', 'none'), marginTop: 12 }}>
        {salvando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar escolha ({marcadas.size})
      </button>
    </div>
  )
}

const inp: React.CSSProperties = { padding: '9px 12px', borderRadius: 9, border: '1.5px solid #d0cdc7', fontSize: 13.5, minWidth: 240, background: '#fff' }
function btn(bg: string, cor: string, border: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border, background: bg, color: cor, fontSize: 13, fontWeight: 800, cursor: 'pointer' }
}
function cx(bg: string, bd: string): React.CSSProperties {
  return { background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: 12 }
}
function cabecalho(cor: string): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 900, color: cor, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }
}
const linha: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, padding: '4px 0', borderBottom: '1px solid #f0eee8' }
const vazio: React.CSSProperties = { fontSize: 12, color: '#9ca3af', margin: '0 0 6px' }
function selo(bg: string, cor: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 900, background: bg, color: cor, borderRadius: 20, padding: '3px 10px' }
}
