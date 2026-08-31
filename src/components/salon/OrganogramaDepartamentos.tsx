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
  cafe:          ['CAFE', 'COPA', 'CAFETERIA'],
}

// Descrições genéricas de cada função (só sugestão inicial — o salão edita).
const PADRAO: Record<string, { icone: string; linhas: string[] }> = {
  contabilidade: { icone: '', linhas: ['Assessoria externa', 'Fiscal e tributário'] },
  gerencia:      { icone: '', linhas: ['Metas e resultado', 'Gestão do time'] },
  administrativo:{ icone: '', linhas: ['Documentos e contratos', 'Rotinas administrativas'] },
  financeiro:    { icone: '', linhas: ['Contas e caixa', 'Comissões'] },
  comercial:     { icone: '', linhas: ['Conversão e follow-up', 'Reativação de clientes'] },
  marketing:     { icone: '', linhas: ['Marca e conteúdo', 'Tráfego e campanhas'] },
  rh:            { icone: '', linhas: ['Recrutar e treinar', 'Avaliar desempenho'] },
  compras:       { icone: '', linhas: ['Fornecedores', 'Estoque e inventário'] },
  qualidade:     { icone: '', linhas: ['POPs e auditoria', 'Conformidade — audita todos'] },
  tecnica:       { icone: '', linhas: ['Exigência legal', 'Padrão técnico e segurança'] },
  coordenador:   { icone: '', linhas: ['Operação diária', 'Cumprimento de processos'] },
  recepcao:      { icone: '', linhas: ['Agenda e acolhida', 'Caixa do dia'] },
  profissionais: { icone: '', linhas: ['Execução do serviço', 'Padrão de atendimento'] },
  gerais:        { icone: '', linhas: ['Limpeza e apoio', 'Ambientes e estrutura'] },
  manutencao:    { icone: '', linhas: ['Predial e equipamentos', 'Preventiva e reparos'] },
  dosagem:       { icone: '', linhas: ['Fórmulas e mistura', 'Controle técnico'] },
  cafe:          { icone: '', linhas: ['Copa e cortesias', 'Bebidas e lanches'] },
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
  dosagem: '#ea580c', gerais: '#ea580c', manutencao: '#ea580c', cafe: '#ea580c',
}

// Os quatro ramos do nível 2, na ordem em que aparecem. Sair da marcação
// solta para uma lista é o que permite ao desenho saber qual é o PRIMEIRO e
// qual é o ÚLTIMO ramo — sem isso não dá para o barramento parar no centro
// deles.
const RAMOS: { chave: string; filhos: string[] }[] = [
  { chave: 'administrativo', filhos: ['financeiro', 'compras'] },
  { chave: 'rh',             filhos: [] },
  { chave: 'marketing',      filhos: ['comercial'] },
  { chave: 'coordenador',    filhos: ['recepcao', 'profissionais', 'dosagem', 'gerais', 'manutencao', 'cafe'] },
]

const LINHA = '#b8b2a6'   // era #cbd5e1: sumia no branco e a árvore ficava sem linhas

export default function OrganogramaDepartamentos({ departamentos, solicPorSetor, onAbrir, podeEditar = true, onExcluir }: Props) {
  const [doc, setDoc] = useState<DocOrg>({})
  const [editando, setEditando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [salvando, setSalvando] = useState(false)
  useGuardaSalvar(dirty, 'Organograma')

  // ── Ocupar a tela inteira ────────────────────────────────────────────────
  // O desenho tem uma largura natural (a soma dos ramos). O card escapa da
  // coluna da página e vai de ponta a ponta, e o desenho é redimensionado para
  // preencher essa largura — aumentando quando sobra espaço e diminuindo
  // quando falta. Como é transform, o layout interno não muda em nada.
  const wrapRef = useRef<HTMLDivElement>(null)
  const contRef = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)
  const [altura, setAltura] = useState<number | undefined>(undefined)
  const [larguraTela, setLarguraTela] = useState<number | undefined>(undefined)

  useEffect(() => {
    const calc = () => {
      // clientWidth do <html> já desconta a barra de rolagem — usar 100vw
      // criaria uma rolagem horizontal na página inteira.
      setLarguraTela(document.documentElement.clientWidth)
      const disp = wrapRef.current?.clientWidth || 0
      const c = contRef.current
      if (!disp || !c) return
      const larg = c.scrollWidth
      // Teto de 1.8x para as caixas não virarem cartazes numa tela muito larga.
      const e = larg > 0 ? Math.min(1.8, disp / larg) : 1
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
  // Selo de assessoria: diz POR QUE a caixa está fora da cadeia de comando.
  // Sem isso o tracejado é só um estilo diferente; com isso ele é informação.
  const SELO_STAFF: Record<string, string> = {
    contabilidade: 'Externo', qualidade: 'Audita', tecnica: 'Legal',
  }

  function Caixa({ chave, dep, largura = 150, variante = 'branca' }: {
    chave: string; dep?: DepOrg; largura?: number; variante?: 'solida' | 'staff' | 'branca'
  }) {
    if (!dep) return null
    const info = doc[dep.id] || {}
    const padrao = PADRAO[chave] || { icone: '', linhas: [] }
    const cor = CORES[chave] || corLegivel(dep.departamento_cor || '#5b4fcf')
    const linhas = info.linhas && info.linhas.length ? info.linhas : padrao.linhas
    const pend = dep.pendencias_abertas || 0
    const doPortal = solicPorSetor[dep.id] || 0
    const staff = variante === 'staff'
    const area = variante === 'solida'      // nível 2: um degrau acima dos filhos

    // ── Escala do selo de pendências ────────────────────────────────────────
    // Antes QUALQUER pendência acendia borda vermelha e ligava o pisca. Como
    // quase todo setor tem pendência, a tela inteira piscava em vermelho o dia
    // inteiro — alerta que está em tudo não avisa nada, só cansa.
    // Agora a contagem é um selo com escala (em dia · 1 a 5 · 6 ou mais) e o
    // pisca fica reservado ao pedido do portal, que é o único que está de fato
    // esperando alguém responder hoje.
    const selo = doPortal > 0
      ? { texto: `${doPortal} do portal`, fundo: '#fdeae8', tinta: '#a3211a', pisca: true }
      : pend === 0
        ? { texto: 'em dia', fundo: '#eef1ee', tinta: '#5c6b5e', pisca: false }
        : pend <= 5
          ? { texto: `${pend} pendência${pend > 1 ? 's' : ''}`, fundo: '#fdf2dc', tinta: '#8a4c05', pisca: false }
          : { texto: `${pend} pendências`, fundo: '#fdeae8', tinta: '#a3211a', pisca: false }

    return (
      <div
        onClick={() => { if (!editando) onAbrir(dep.id) }}
        className={`rounded-xl transition ${editando ? '' : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'}`}
        style={{
          // Largura fixa por nível: ter seis filhos embaixo não pode fazer a
          // caixa parecer mais importante que a do lado.
          width: largura, padding: area ? '9px 11px 10px' : '8px 10px 9px',
          // Nenhuma caixa é preenchida de cor: a cor do ramo vira a faixa de
          // 3px no topo. Assim a DIREÇÃO (a única sólida, escura) volta a ser
          // o elemento mais pesado e a leitura desce de cima para baixo.
          background: staff ? '#fbfaf7' : '#fff',
          border: `1px ${staff ? 'dashed' : 'solid'} ${staff ? '#c3bcae' : '#ddd8cd'}`,
          borderTop: `3px ${staff ? 'dashed' : 'solid'} ${staff ? '#8a8377' : cor}`,
          boxShadow: '0 1px 2px rgba(0,0,0,.05)',
          position: 'relative',
        }}>

        {staff && SELO_STAFF[chave] && (
          <span style={{
            position: 'absolute', top: -8, right: 9, background: '#efece4', border: '1px solid #ddd7c9',
            color: '#6d675d', fontSize: 8, fontWeight: 700, letterSpacing: '.08em',
            textTransform: 'uppercase', padding: '1px 6px', borderRadius: 99,
          }}>{SELO_STAFF[chave]}</span>
        )}

        <div className="flex items-start gap-1" style={{ marginBottom: 3 }}>
          <span className="font-bold" style={{
            fontSize: area ? 10 : 9.4,
            color: staff ? '#5f594e' : cor,
            letterSpacing: '.05em', textTransform: 'uppercase', lineHeight: 1.25, flex: 1,
          }}>
            {dep.nome_completo}
          </span>
          {editando && onExcluir && (
            <button onClick={e => { e.stopPropagation(); onExcluir(dep.id, dep.nome_completo) }}
              title="Excluir setor" aria-label={`Excluir o setor ${dep.nome_completo}`}
              style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0 }}>
              &times;
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
              aria-label={`Responsável por ${dep.nome_completo}`}
              className="w-full mb-1 px-1.5 py-0.5 rounded border border-nodri-border"
              style={{ fontSize: 9.5 }} />
            <textarea
              value={linhas.join('\n')}
              onChange={e => editarLinhas(dep.id, e.target.value)}
              onClick={e => e.stopPropagation()}
              rows={3}
              placeholder="Uma atribuição por linha"
              aria-label={`Atribuições de ${dep.nome_completo}`}
              className="w-full px-1.5 py-0.5 rounded border border-nodri-border resize-y"
              style={{ fontSize: 9, lineHeight: 1.5 }} />
          </>
        ) : (
          <>
            {info.responsavel && (
              <p className="font-bold" style={{ fontSize: area ? 11 : 10.4, color: '#26231f', lineHeight: 1.3, marginBottom: 3 }}>
                {info.responsavel}
              </p>
            )}
            {linhas.map((l, i) => (
              <p key={i} style={{ fontSize: area ? 9.8 : 9.4, color: '#6d675d', lineHeight: 1.45 }}>{l}</p>
            ))}
            <span
              className={selo.pisca ? 'nodri-pisca-card' : undefined}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7,
                fontSize: 9.4, fontWeight: 700, padding: '2px 8px 2px 6px', borderRadius: 99,
                background: selo.fundo, color: selo.tinta, fontVariantNumeric: 'tabular-nums',
              }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
              {selo.texto}
            </span>
          </>
        )}
      </div>
    )
  }

  const { mapa, sobra } = porChave
  const ramosVisiveis = RAMOS.filter(r => mapa[r.chave] || r.filhos.some(f => mapa[f]))

  // Conectores — as linhas de comando são só bordas
  // Altura dos conectores. Era 14/12 e as fileiras ficavam quase encostadas;
  // com mais respiro dá para ler cada nível como um andar do organograma.
  // O padrão (48) vale para os degraus de cima — Direção › Gerência › áreas —,
  // que são os que mais precisam de ar por causa das caixas de assessoria ao
  // lado. Os ramos de baixo usam 26, passado na chamada.
  // `flexShrink: 0` NÃO é detalhe: dentro de um flex column, o conector é um
  // item flexível e o navegador o espremia até 0 para o desenho caber na
  // altura do quadro. Aumentar a altura aqui não surtia efeito nenhum — as
  // fileiras continuavam encostadas.
  const V = ({ h = 48 }: { h?: number }) => <div style={{ width: 2, height: h, background: LINHA, flexShrink: 0 }} />
  const Tracejo = ({ w = 30 }: { w?: number }) => <div style={{ width: w, borderTop: `2px dashed ${LINHA}` }} />

  /** Um ramo: a área do nível 2 e, abaixo, os setores que respondem a ela.
   *  Também chamado como função — ver o motivo em Caixa. */
  function Ramo({ areaChave, filhos, larguraArea = 168 }: { areaChave: string; filhos: string[]; larguraArea?: number }) {
    // Filho sempre com a MESMA largura (150). Antes cada ramo escolhia a sua e
    // a largura acabava lida como importância.
    const LARG_FILHO = 150
    const area = mapa[areaChave]
    const comFilhos = filhos.filter(f => mapa[f])
    if (!area && !comFilhos.length) return null
    return (
      <div className="flex flex-col items-center">
        {area && Caixa({ chave: areaChave, dep: area, largura: larguraArea, variante: 'solida' })}
        {comFilhos.length > 0 && (<>
          <V h={26} />
          <div className="flex items-start gap-2" style={{ position: 'relative' }}>
            {/* barra ligando os centros dos filhos das pontas */}
            {comFilhos.length > 1 && (
              <div style={{ position: 'absolute', top: 0, left: LARG_FILHO / 2, right: LARG_FILHO / 2, height: 2, background: LINHA }} />
            )}
            {comFilhos.map(f => (
              <div key={f} className="flex flex-col items-center">
                <V h={26} />
                {Caixa({ chave: f, dep: mapa[f], largura: LARG_FILHO })}
              </div>
            ))}
          </div>
        </>)}
      </div>
    )
  }

  return (
    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-4 mb-4"
      style={larguraTela ? {
        // "Full bleed": sai da coluna da página e ocupa a janela toda, sem
        // depender de onde o card está encaixado no layout.
        width: larguraTela - 16, position: 'relative', left: '50%', marginLeft: -(larguraTela - 16) / 2,
      } : undefined}>
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
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            )}
            <button onClick={cancelar}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-nodri-border">
              {editando ? 'Cancelar' : 'Editar textos'}
            </button>
          </div>
        )}
      </div>

      <div ref={wrapRef} style={{ height: altura, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
        <div ref={contRef} className="flex flex-col items-center pb-1"
          style={{ width: 'max-content', flex: '0 0 auto', transform: `scale(${escala})`, transformOrigin: 'top center' }}>

          {/* ── NÍVEL 0 — Direção, com a Contabilidade como assessoria externa ── */}
          <div className="flex items-center">
            {/* Peso invisível: mesma largura do conjunto da direita (tracejo 34
                + caixa 150), para a DIREÇÃO ficar no eixo do desenho. */}
            {mapa.contabilidade && <div style={{ width: 184, flexShrink: 0 }} />}
            <div className="rounded-xl text-white text-center" style={{
              background: 'linear-gradient(135deg,#24243f,#101021)', padding: '12px 22px', minWidth: 230,
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
              {Caixa({ chave: 'qualidade', dep: mapa.qualidade, largura: 168, variante: 'staff' })}
              <Tracejo w={34} />
            </>)}
            {mapa.gerencia
              ? Caixa({ chave: 'gerencia', dep: mapa.gerencia, largura: 196, variante: 'solida' })
              : (
                <div className="rounded-xl text-white text-center" style={{
                  background: 'linear-gradient(135deg,#6d5fe0,#4b3fbb)', padding: '10px 20px', minWidth: 200,
                }}>
                  <p className="font-bold" style={{ fontSize: 10.4, letterSpacing: '.9px' }}>GERÊNCIA GERAL</p>
                </div>
              )}
            {mapa.tecnica && (<>
              <Tracejo w={34} />
              {Caixa({ chave: 'tecnica', dep: mapa.tecnica, largura: 168, variante: 'staff' })}
            </>)}
          </div>

          <V h={30} />

          {/* ── NÍVEL 2 e 3 — áreas e os setores que respondem a cada uma ──
              Cada ramo desenha a SUA METADE do barramento: o primeiro começa
              no próprio centro e o último termina nele. É o que faz a barra
              fechar certo mesmo com um ramo de seis filhos ao lado de um sem
              filho nenhum — com uma barra única de ponta a ponta ela sobrava
              para fora dos dois extremos. */}
          <div className="flex items-start justify-center gap-6" style={{ paddingTop: 26 }}>
            {ramosVisiveis.map((r, i) => (
              <div key={r.chave} style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: -26, height: 2, background: LINHA,
                  left: i === 0 ? 'calc(50% - 1px)' : -12,
                  right: i === ramosVisiveis.length - 1 ? 'calc(50% - 1px)' : -12,
                }} />
                <div style={{ position: 'absolute', top: -26, left: 'calc(50% - 1px)', width: 2, height: 26, background: LINHA }} />
                {Ramo({ areaChave: r.chave, filhos: r.filhos })}
              </div>
            ))}
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
        Integrar todas as áreas para entregar excelência no atendimento, qualidade nos serviços e resultados sustentáveis.
      </p>
    </div>
  )
}
