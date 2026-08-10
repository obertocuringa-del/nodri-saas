'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

// ─────────────────────────────────────────────────────────────────────────────
// ORGANOGRAMA DOS DEPARTAMENTOS (somente no computador — no celular a página
// segue mostrando os cards de sempre, que é o que cabe na tela).
//
// Cada caixa é o MESMO departamento que já existe: clicar abre o setor, a
// contagem de pendências e o alerta do portal continuam iguais. O que é novo
// aqui é só a APRESENTAÇÃO em hierarquia + o responsável e as linhas de
// descrição, que ficam editáveis e são salvos em salao_config (grid_organograma).
//
// A hierarquia segue duas regras:
//   1. cada caixa tem um único chefe (linha cheia);
//   2. quem audita não manda em quem executa — Qualidade, Responsável Técnica e
//      Contabilidade são assessoria (linha tracejada), fora da cadeia de comando.
// ─────────────────────────────────────────────────────────────────────────────

export interface DepOrg {
  id: string
  nome_completo: string
  departamento_cor?: string
  pendencias_abertas?: number
}

interface InfoSetor { responsavel?: string; linhas?: string[] }
type DocOrg = Record<string, InfoSetor>

interface Props {
  departamentos: DepOrg[]
  solicPorSetor: Record<string, number>
  onAbrir: (id: string) => void
  podeEditar?: boolean
  onExcluir?: (id: string, nome: string) => void   // aparece no modo edição
}

// Normaliza pra comparar nome de setor sem depender de acento/caixa
const norm = (s: string) => (s || '').toUpperCase().trim()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')

// Palavras-chave que identificam cada setor na hierarquia. A ordem importa:
// o primeiro que casar leva. Setor que não casar com nada vai para "Outros",
// então nenhum departamento some do organograma.
const CHAVES: Record<string, string[]> = {
  contabilidade: ['CONTABIL'],
  gerencia:      ['GERENCIA', 'GERENTE'],
  administrativo:['ADMINISTRATIVO'],
  financeiro:    ['FINANCEIRO'],
  comercial:     ['COMERCIAL', 'VENDAS'],
  marketing:     ['MARKETING'],
  rh:            ['RH', 'GESTAO DE PESSOAS', 'RECURSOS HUMANOS'],
  compras:       ['COMPRAS', 'ESTOQUE'],
  qualidade:     ['PROCESSO', 'QUALIDADE'],
  tecnica:       ['RESPONSAVEL TECNICA', 'TECNICA'],
  coordenador:   ['COORDENADOR', 'COORDENACAO'],
  recepcao:      ['RECEPCAO'],
  profissionais: ['PROFISSIONAIS'],
  gerais:        ['SERVICOS GERAIS', 'LIMPEZA'],
  manutencao:    ['MANUTENCAO'],
  dosagem:       ['DOSAGEM'],
}

// Descrições genéricas de cada função (só sugestão inicial — o salão edita).
const PADRAO: Record<string, { icone: string; linhas: string[] }> = {
  contabilidade: { icone: '📑', linhas: ['Assessoria externa', 'Fiscal e tributário'] },
  gerencia:      { icone: '👔', linhas: ['Metas e resultado', 'Gestão do time'] },
  administrativo:{ icone: '🗂️', linhas: ['Documentos e contratos', 'Rotinas administrativas'] },
  financeiro:    { icone: '💰', linhas: ['Contas e caixa', 'Comissões'] },
  comercial:     { icone: '🤝', linhas: ['Conversão e follow-up', 'Reativação de clientes'] },
  marketing:     { icone: '📣', linhas: ['Marca e conteúdo', 'Tráfego e campanhas'] },
  rh:            { icone: '👥', linhas: ['Recrutar e treinar', 'Avaliar desempenho'] },
  compras:       { icone: '🛒', linhas: ['Fornecedores', 'Estoque e inventário'] },
  qualidade:     { icone: '📋', linhas: ['POPs e auditoria', 'Conformidade — audita todos'] },
  tecnica:       { icone: '🛡️', linhas: ['Exigência legal', 'Padrão técnico e segurança'] },
  coordenador:   { icone: '⚙️', linhas: ['Operação diária', 'Cumprimento de processos'] },
  recepcao:      { icone: '🛎️', linhas: ['Agenda e acolhida', 'Caixa do dia'] },
  profissionais: { icone: '✂️', linhas: ['Execução do serviço', 'Padrão de atendimento'] },
  gerais:        { icone: '🧹', linhas: ['Limpeza e apoio', 'Ambientes e estrutura'] },
  manutencao:    { icone: '🔧', linhas: ['Predial e equipamentos', 'Preventiva e reparos'] },
  dosagem:       { icone: '🧪', linhas: ['Fórmulas e mistura', 'Controle técnico'] },
}

// Alguns setores foram cadastrados com cor bem clara (ex.: um lilás quase
// branco). Sobre o fundo branco da caixa, o título ficaria ilegível — então,
// só para desenhar, escurecemos a cor mantendo o mesmo tom. A cor cadastrada
// do departamento não é alterada em lugar nenhum.
function corLegivel(cor: string): string {
  let h = (cor || '').trim().replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return cor
  let r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  if (lum <= 0.55) return cor            // já tem contraste suficiente
  const f = 0.45 / lum                   // escurece proporcionalmente
  const q = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)))
  return `rgb(${q(r)}, ${q(g)}, ${q(b)})`
}

// Cor por posição na hierarquia: o ramo inteiro compartilha a mesma cor, então
// bate o olho e se sabe de que área é a caixa.
const CORES: Record<string, string> = {
  contabilidade: '#6b7280', qualidade: '#6b7280', tecnica: '#6b7280',
  gerencia: '#5b4fcf',
  administrativo: '#0891b2', financeiro: '#0891b2', compras: '#0891b2',
  rh: '#7c3aed',
  marketing: '#db2777', comercial: '#db2777',
  coordenador: '#ea580c', recepcao: '#ea580c', profissionais: '#ea580c',
  dosagem: '#ea580c', gerais: '#ea580c', manutencao: '#ea580c',
}

const LINHA = '#cbd5e1'

export default function OrganogramaDepartamentos({ departamentos, solicPorSetor, onAbrir, podeEditar = true, onExcluir }: Props) {
  const [doc, setDoc] = useState<DocOrg>({})
  const [editando, setEditando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [salvando, setSalvando] = useState(false)
  useGuardaSalvar(dirty, 'Organograma')

  // ── Caber inteiro na tela ────────────────────────────────────────────────
  // O desenho tem uma largura natural (a soma dos ramos). Em vez de cortar e
  // deixar barra de rolagem, ele é reduzido proporcionalmente até caber. Como
  // é transform, o layout interno não muda — só o tamanho na tela.
  const wrapRef = useRef<HTMLDivElement>(null)
  const contRef = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)
  const [altura, setAltura] = useState<number | undefined>(undefined)

  useEffect(() => {
    const calc = () => {
      const disp = wrapRef.current?.clientWidth || 0
      const c = contRef.current
      if (!disp || !c) return
      const larg = c.scrollWidth
      const e = larg > 0 ? Math.min(1, disp / larg) : 1
      setEscala(e)
      setAltura(c.scrollHeight * e)
    }
    calc()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(calc) : null
    if (ro && wrapRef.current) ro.observe(wrapRef.current)
    if (ro && contRef.current) ro.observe(contRef.current)
    window.addEventListener('resize', calc)
    return () => { ro?.disconnect(); window.removeEventListener('resize', calc) }
  }, [departamentos, editando, doc])

  useEffect(() => {
    fetch('/api/salon/grid?chave=organograma')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && typeof d === 'object') setDoc(d as DocOrg) })
      .catch(() => { })
  }, [])

  // Descobre a que "posição" da hierarquia cada departamento pertence
  const porChave = useMemo(() => {
    const mapa: Record<string, DepOrg> = {}
    const usados = new Set<string>()
    for (const [chave, palavras] of Object.entries(CHAVES)) {
      const achado = departamentos.find(d => !usados.has(d.id) && palavras.some(p => norm(d.nome_completo).includes(p)))
      if (achado) { mapa[chave] = achado; usados.add(achado.id) }
    }
    const sobra = departamentos.filter(d => !usados.has(d.id))
    return { mapa, sobra }
  }, [departamentos])

  async function salvar() {
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'organograma', doc }),
      })
      if (r.ok) { setDirty(false); setEditando(false) }
      else alert('Não foi possível salvar. Tente de novo.')
    } catch { alert('Não foi possível salvar. Verifique a conexão.') }
    finally { setSalvando(false) }
  }

  // Cancelar volta ao que está salvo e limpa o "não salvo" — senão o aviso de
  // sair sem salvar continuaria aparecendo mesmo depois de desistir da edição.
  function cancelar() {
    if (!editando) { setEditando(true); return }
    fetch('/api/salon/grid?chave=organograma')
      .then(r => r.ok ? r.json() : null)
      .then(d => setDoc(d && typeof d === 'object' ? d as DocOrg : {}))
      .catch(() => { })
      .finally(() => { setDirty(false); setEditando(false) })
  }

  function editarResponsavel(id: string, valor: string) {
    setDoc(d => ({ ...d, [id]: { ...(d[id] || {}), responsavel: valor } }))
    setDirty(true)
  }

  function editarLinhas(id: string, texto: string) {
    setDoc(d => ({ ...d, [id]: { ...(d[id] || {}), linhas: texto.split('\n') } }))
    setDirty(true)
  }

  // ── Caixa de um setor ────────────────────────────────────────────────────
  // CHAMADA COMO FUNÇÃO (ver uso: {Caixa({...})}), nunca como <Caixa/>: um
  // componente declarado aqui dentro ganha identidade nova a cada tecla e o
  // React remontaria os campos, fazendo perder o foco ao digitar.
  //
  // variante: 'solida' = área do nível 2 (fundo colorido, como no desenho),
  //           'staff'  = assessoria (borda tracejada, fora da linha de comando),
  //           'branca' = setor de execução.
  function Caixa({ chave, dep, largura = 132, variante = 'branca' }: {
    chave: string; dep?: DepOrg; largura?: number; variante?: 'solida' | 'staff' | 'branca'
  }) {
    if (!dep) return null
    const info = doc[dep.id] || {}
    const padrao = PADRAO[chave] || { icone: '🏢', linhas: [] }
    const cor = CORES[chave] || corLegivel(dep.departamento_cor || '#5b4fcf')
    const linhas = info.linhas && info.linhas.length ? info.linhas : padrao.linhas
    const pend = dep.pendencias_abertas || 0
    const doPortal = solicPorSetor[dep.id] || 0
    const solida = variante === 'solida'
    const staff = variante === 'staff'
    // Pisca com QUALQUER pendência aberta, não só com solicitação do portal:
    // era o caso de o setor ter tarefa esperando e o card ficar parado.
    const alerta = doPortal > 0 || pend > 0

    return (
      <div
        onClick={() => { if (!editando) onAbrir(dep.id) }}
        className={`rounded-xl transition-all ${editando ? '' : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'} ${alerta ? 'nodri-pisca-card' : ''}`}
        style={{
          width: largura, padding: solida ? '8px 10px' : '7px 9px',
          background: solida ? cor : '#fff',
          border: solida ? (alerta ? '1.5px solid #dc2626' : 'none')
            : `1.5px ${staff ? 'dashed' : 'solid'} ${alerta ? '#dc2626' : staff ? '#c9c5be' : cor}`,
          borderTop: solida || staff ? undefined : `3px solid ${cor}`,
          // Com pendência o halo vermelho da animação assume o box-shadow
          boxShadow: alerta ? undefined : solida ? `0 3px 10px ${cor}44` : '0 1px 3px rgba(0,0,0,.05)',
        }}>
        <div className="flex items-start gap-1" style={{ marginBottom: 2 }}>
          <span style={{ fontSize: 10, lineHeight: 1.3 }}>{padrao.icone}</span>
          <span className="font-bold leading-tight" style={{
            fontSize: solida ? 9.4 : 8.8,
            color: solida ? '#fff' : staff ? '#4b5563' : cor,
            letterSpacing: '.3px', flex: 1,
          }}>
            {dep.nome_completo}
          </span>
          {editando && onExcluir && (
            <button onClick={e => { e.stopPropagation(); onExcluir(dep.id, dep.nome_completo) }}
              title="Excluir setor"
              style={{ border: 'none', background: 'transparent', color: solida ? '#fff' : '#dc2626', cursor: 'pointer', fontSize: 10, lineHeight: 1, padding: 0 }}>
              🗑
            </button>
          )}
        </div>

        {editando ? (
          <>
            <input
              value={info.responsavel || ''}
              onChange={e => editarResponsavel(dep.id, e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="Responsável"
              className="w-full mb-1 px-1.5 py-0.5 rounded border border-nodri-border"
              style={{ fontSize: 9.5 }} />
            <textarea
              value={linhas.join('\n')}
              onChange={e => editarLinhas(dep.id, e.target.value)}
              onClick={e => e.stopPropagation()}
              rows={3}
              placeholder="Uma atribuição por linha"
              className="w-full px-1.5 py-0.5 rounded border border-nodri-border resize-y"
              style={{ fontSize: 9, lineHeight: 1.5 }} />
          </>
        ) : (
          <>
            {info.responsavel && (
              <p className="font-semibold" style={{ fontSize: 8.4, color: solida ? '#ffffffdd' : '#3f3a35', marginBottom: 1 }}>
                👤 {info.responsavel}
              </p>
            )}
            {linhas.map((l, i) => (
              <p key={i} style={{ fontSize: 7.8, color: solida ? '#ffffffc4' : '#6b6860', lineHeight: 1.42 }}>{l}</p>
            ))}
            {(pend > 0 || doPortal > 0) && (
              <p className="font-bold" style={{ fontSize: 7.8, color: solida ? '#fff' : '#b91c1c', marginTop: 3 }}>
                {doPortal > 0 ? `📥 ${doPortal} do portal` : `⚠ ${pend} pendência${pend > 1 ? 's' : ''}`}
              </p>
            )}
          </>
        )}
      </div>
    )
  }

  const { mapa, sobra } = porChave

  // Conectores — as linhas de comando são só bordas
  const V = ({ h = 14 }: { h?: number }) => <div style={{ width: 2, height: h, background: LINHA }} />
  const Tracejo = ({ w = 30 }: { w?: number }) => <div style={{ width: w, borderTop: `2px dashed ${LINHA}` }} />

  /** Um ramo: a área do nível 2 e, abaixo, os setores que respondem a ela.
   *  Também chamado como função — ver o motivo em Caixa. */
  function Ramo({ areaChave, filhos, larguraArea = 168 }: { areaChave: string; filhos: string[]; larguraArea?: number }) {
    const area = mapa[areaChave]
    const comFilhos = filhos.filter(f => mapa[f])
    if (!area && !comFilhos.length) return null
    return (
      <div className="flex flex-col items-center">
        {area && Caixa({ chave: areaChave, dep: area, largura: larguraArea, variante: 'solida' })}
        {comFilhos.length > 0 && (<>
          <V h={12} />
          <div className="flex items-start gap-2" style={{ position: 'relative' }}>
            {/* barra ligando os centros dos filhos das pontas */}
            {comFilhos.length > 1 && (
              <div style={{ position: 'absolute', top: 0, left: 66, right: 66, height: 2, background: LINHA }} />
            )}
            {comFilhos.map(f => (
              <div key={f} className="flex flex-col items-center">
                <V h={12} />
                {Caixa({ chave: f, dep: mapa[f] })}
              </div>
            ))}
          </div>
        </>)}
      </div>
    )
  }

  return (
    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-syne font-bold text-[13px]">Organograma</p>
          <p className="text-[10px] text-nodri-t3">Estrutura organizacional — clique em um setor para abrir</p>
        </div>
        {podeEditar && (
          <div className="flex items-center gap-2">
            {editando && (
              <button onClick={salvar} disabled={salvando}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white disabled:opacity-60"
                style={{ background: '#16a34a' }}>
                {salvando ? 'Salvando…' : '💾 Salvar'}
              </button>
            )}
            <button onClick={cancelar}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-nodri-border">
              {editando ? 'Cancelar' : '✏️ Editar textos'}
            </button>
          </div>
        )}
      </div>

      <div ref={wrapRef} style={{ height: altura, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
        <div ref={contRef} className="flex flex-col items-center pb-1"
          style={{ width: 'max-content', flex: '0 0 auto', transform: `scale(${escala})`, transformOrigin: 'top center' }}>

          {/* ── NÍVEL 0 — Direção, com a Contabilidade como assessoria externa ── */}
          <div className="flex items-center">
            <div className="rounded-xl text-white text-center" style={{
              background: 'linear-gradient(135deg,#24243f,#101021)', padding: '9px 18px', minWidth: 190,
            }}>
              <p className="font-bold" style={{ fontSize: 9.6, letterSpacing: '1px' }}>DIREÇÃO / PROPRIETÁRIO</p>
              <p style={{ fontSize: 8, opacity: .7 }}>Estratégia · investimento · decisão final</p>
            </div>
            {mapa.contabilidade && (<>
              <Tracejo w={34} />
              {Caixa({ chave: 'contabilidade', dep: mapa.contabilidade, largura: 150, variante: 'staff' })}
            </>)}
          </div>

          <V />

          {/* ── NÍVEL 1 — Gerência, com Qualidade e Técnica assessorando ── */}
          <div className="flex items-center">
            {mapa.qualidade && (<>
              {Caixa({ chave: 'qualidade', dep: mapa.qualidade, largura: 160, variante: 'staff' })}
              <Tracejo w={34} />
            </>)}
            {mapa.gerencia
              ? Caixa({ chave: 'gerencia', dep: mapa.gerencia, largura: 210, variante: 'solida' })
              : (
                <div className="rounded-xl text-white text-center" style={{
                  background: 'linear-gradient(135deg,#6d5fe0,#4b3fbb)', padding: '10px 20px', minWidth: 200,
                }}>
                  <p className="font-bold" style={{ fontSize: 10.4, letterSpacing: '.9px' }}>GERÊNCIA GERAL</p>
                </div>
              )}
            {mapa.tecnica && (<>
              <Tracejo w={34} />
              {Caixa({ chave: 'tecnica', dep: mapa.tecnica, largura: 160, variante: 'staff' })}
            </>)}
          </div>

          <V />
          <div style={{ height: 2, background: LINHA, width: '100%' }} />

          {/* ── NÍVEL 2 e 3 — áreas e os setores que respondem a cada uma ── */}
          <div className="flex items-start justify-center gap-6" style={{ paddingTop: 12 }}>
            <Fragment key="r-adm">{Ramo({ areaChave: 'administrativo', filhos: ['financeiro', 'compras'], larguraArea: 280 })}</Fragment>
            <Fragment key="r-rh">{Ramo({ areaChave: 'rh', filhos: [], larguraArea: 168 })}</Fragment>
            <Fragment key="r-mkt">{Ramo({ areaChave: 'marketing', filhos: ['comercial'], larguraArea: 180 })}</Fragment>
            <Fragment key="r-op">{Ramo({ areaChave: 'coordenador', filhos: ['recepcao', 'profissionais', 'dosagem', 'gerais', 'manutencao'], larguraArea: 400 })}</Fragment>
          </div>

          {/* Qualquer setor fora do modelo continua aparecendo aqui */}
          {sobra.length > 0 && (
            <div className="w-full pt-6">
              <p className="text-[9.5px] text-nodri-t3 uppercase tracking-widest font-bold mb-2 text-center">Outros setores</p>
              <div className="flex justify-center gap-3 flex-wrap">
                {sobra.map(d => <Fragment key={d.id}>{Caixa({ chave: 'outro', dep: d })}</Fragment>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legenda: o que cada tipo de linha significa */}
      <div className="flex items-center justify-center gap-6 flex-wrap mt-4 pt-3" style={{ borderTop: '1px solid #eae8e3' }}>
        <span className="flex items-center gap-2 text-[9.5px] font-bold" style={{ color: '#4b5563' }}>
          <span style={{ width: 28, height: 2, background: LINHA, display: 'inline-block' }} />
          Subordinação — responde a, recebe meta e é cobrado por
        </span>
        <span className="flex items-center gap-2 text-[9.5px] font-bold" style={{ color: '#4b5563' }}>
          <span style={{ width: 28, borderTop: `2px dashed ${LINHA}`, display: 'inline-block' }} />
          Assessoria — orienta e audita, mas não dá ordem à operação
        </span>
      </div>

      <p className="text-[9.5px] text-nodri-t3 mt-2 text-center">
        ⭐ Integrar todas as áreas para entregar excelência no atendimento, qualidade nos serviços e resultados sustentáveis.
      </p>
    </div>
  )
}
