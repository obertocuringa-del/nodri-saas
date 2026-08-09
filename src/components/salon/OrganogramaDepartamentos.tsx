'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

// ─────────────────────────────────────────────────────────────────────────────
// ORGANOGRAMA DOS DEPARTAMENTOS (somente no computador — no celular a página
// segue mostrando os cards de sempre, que é o que cabe na tela).
//
// Cada caixa é o MESMO departamento que já existe: clicar abre o setor, a
// contagem de pendências e o alerta do portal continuam iguais. O que é novo
// aqui é só a APRESENTAÇÃO em hierarquia + o responsável e as linhas de
// descrição, que ficam editáveis e são salvos em salao_config (grid_organograma).
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
  contabilidade: { icone: '📑', linhas: ['Gestão Contábil, Fiscal e Tributária'] },
  gerencia:      { icone: '👔', linhas: ['Gestão Geral da Empresa', 'Planejamento e Resultados'] },
  administrativo:{ icone: '🗂️', linhas: ['Rotinas Administrativas', 'Documentos', 'Contratos e Licenças'] },
  financeiro:    { icone: '💰', linhas: ['Gestão Financeira', 'Contas a Pagar/Receber', 'Fluxo de Caixa', 'Comissões'] },
  comercial:     { icone: '🤝', linhas: ['Vendas e Metas', 'Conversão e Follow-up', 'Reativação de Clientes', 'Orçamentos'] },
  marketing:     { icone: '📣', linhas: ['Campanhas e Divulgação', 'Redes Sociais', 'Posicionamento da Marca', 'Conteúdo e Tráfego'] },
  rh:            { icone: '👥', linhas: ['Pessoas e Cultura', 'Recrutamento e Seleção', 'Treinamento e Desenvolvimento', 'Avaliação e Desempenho'] },
  compras:       { icone: '🛒', linhas: ['Compras e Fornecedores', 'Estoque e Inventário', 'Controle de Produtos', 'Entrada e Saída'] },
  qualidade:     { icone: '📋', linhas: ['POPs e Padronização', 'Checklists e Auditorias', 'Não Conformidades', 'Melhoria Contínua'] },
  tecnica:       { icone: '🛡️', linhas: ['Responsabilidade Técnica', 'Padrões e Procedimentos', 'Conformidade e Segurança'] },
  coordenador:   { icone: '⚙️', linhas: ['Gestão da Operação Diária', 'Organização e Execução', 'Cumprimento de Processos'] },
  recepcao:      { icone: '🛎️', linhas: ['Atendimento e Agendamentos', 'Confirmações', 'Experiência do Cliente', 'Organização da Agenda'] },
  profissionais: { icone: '✂️', linhas: ['Execução dos Serviços', 'Atendimento aos Clientes', 'Produtividade', 'Cumprimento de Padrões'] },
  gerais:        { icone: '🧹', linhas: ['Limpeza e Organização', 'Apoio Operacional', 'Ambientes e Estrutura', 'Suporte às Rotinas'] },
  manutencao:    { icone: '🔧', linhas: ['Manutenção Predial', 'Equipamentos e Instalações', 'Correções e Reparos', 'Manutenção Preventiva'] },
  dosagem:       { icone: '🧪', linhas: ['Preparação de Produtos', 'Dosagens e Fórmulas', 'Controle Técnico', 'Padrão de Misturas'] },
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

const CORES: Record<string, string> = {
  contabilidade: '#6d28d9', gerencia: '#b45309', administrativo: '#2563eb',
  financeiro: '#059669', comercial: '#ea580c', marketing: '#db2777',
  rh: '#0891b2', compras: '#ca8a04', qualidade: '#dc2626', tecnica: '#be123c',
  coordenador: '#1e40af', recepcao: '#0e7490', profissionais: '#4f46e5',
  gerais: '#475569', manutencao: '#57534e', dosagem: '#c026d3',
}

export default function OrganogramaDepartamentos({ departamentos, solicPorSetor, onAbrir, podeEditar = true }: Props) {
  const [doc, setDoc] = useState<DocOrg>({})
  const [editando, setEditando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [salvando, setSalvando] = useState(false)
  useGuardaSalvar(dirty, 'Organograma')

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
  function Caixa({ chave, dep, largura = 152 }: { chave: string; dep?: DepOrg; largura?: number }) {
    if (!dep) return null
    const info = doc[dep.id] || {}
    const padrao = PADRAO[chave] || { icone: '🏢', linhas: [] }
    const cor = corLegivel(dep.departamento_cor || CORES[chave] || '#5b4fcf')
    const linhas = info.linhas && info.linhas.length ? info.linhas : padrao.linhas
    const pend = dep.pendencias_abertas || 0
    const doPortal = solicPorSetor[dep.id] || 0

    return (
      <div
        onClick={() => { if (!editando) onAbrir(dep.id) }}
        className={`bg-white rounded-xl transition-all ${editando ? '' : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'} ${doPortal > 0 ? 'nodri-alerta-pisca' : ''}`}
        style={{
          width: largura, padding: '6px 8px',
          border: `1px solid ${doPortal > 0 ? '#dc2626' : pend > 0 ? '#fecaca' : '#e8e6e0'}`,
          borderLeft: `4px solid ${cor}`,
          boxShadow: '0 1px 3px rgba(0,0,0,.05)',
        }}>
        <div className="flex items-center gap-1 mb-0.5">
          <span style={{ fontSize: 11 }}>{padrao.icone}</span>
          <span className="font-bold leading-tight" style={{ fontSize: 8.8, color: cor, letterSpacing: '.1px' }}>
            {dep.nome_completo}
          </span>
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
              rows={4}
              placeholder="Uma atribuição por linha"
              className="w-full px-1.5 py-0.5 rounded border border-nodri-border resize-y"
              style={{ fontSize: 9, lineHeight: 1.5 }} />
          </>
        ) : (
          <>
            {info.responsavel && (
              <p className="font-semibold mb-0.5" style={{ fontSize: 8.5, color: '#3f3a35' }}>
                👤 {info.responsavel}
              </p>
            )}
            {linhas.map((l, i) => (
              <p key={i} style={{ fontSize: 8, color: '#6b6860', lineHeight: 1.4 }}>{l}</p>
            ))}
            {(pend > 0 || doPortal > 0) && (
              <p className="font-bold mt-1" style={{ fontSize: 8, color: '#b91c1c' }}>
                {doPortal > 0 ? `📥 ${doPortal} do portal` : `⚠ ${pend} pendência${pend > 1 ? 's' : ''}`}
              </p>
            )}
          </>
        )}
      </div>
    )
  }

  const L = ({ h = 12 }: { h?: number }) => <div style={{ width: 2, height: h, background: '#cbd5e1' }} />
  const { mapa, sobra } = porChave

  return (
    <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
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

      <div className="overflow-x-auto">
        <div className="flex flex-col items-center gap-0 min-w-[860px] pb-1">

          {/* Direção + Contabilidade ao lado */}
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="rounded-xl text-white text-center" style={{ background: '#1e293b', padding: '7px 14px', minWidth: 150 }}>
                <p className="font-bold" style={{ fontSize: 9.2 }}>DIREÇÃO / PROPRIETÁRIO</p>
                <p style={{ fontSize: 8, opacity: .75 }}>Decisões Estratégicas</p>
              </div>
            </div>
            {mapa.contabilidade && (
              <div className="mt-1.5">{Caixa({ chave: 'contabilidade', dep: mapa.contabilidade })}</div>
            )}
          </div>

          <L />
          {mapa.gerencia && Caixa({ chave: 'gerencia', dep: mapa.gerencia, largura: 176 })}
          <L />

          {/* Áreas de apoio */}
          <div className="w-full" style={{ borderTop: '2px solid #cbd5e1', maxWidth: 1180 }} />
          <div className="flex justify-center gap-2 flex-wrap pt-2">
            {(['administrativo', 'financeiro', 'comercial', 'marketing', 'rh', 'compras'] as const)
              .filter(k => mapa[k]).map(k => <Fragment key={k}>{Caixa({ chave: k, dep: mapa[k] })}</Fragment>)}
          </div>

          {/* Processo / Técnica */}
          {(mapa.qualidade || mapa.tecnica) && (<>
            <L h={14} />
            <div className="flex justify-center gap-2 items-start">
              {mapa.qualidade && Caixa({ chave: 'qualidade', dep: mapa.qualidade })}
              {mapa.tecnica && Caixa({ chave: 'tecnica', dep: mapa.tecnica })}
            </div>
          </>)}

          {/* Coordenação e operação */}
          {mapa.coordenador && (<>
            <L h={14} />
            {Caixa({ chave: 'coordenador', dep: mapa.coordenador, largura: 186 })}
          </>)}

          {(['recepcao', 'profissionais', 'gerais', 'manutencao', 'dosagem'] as const).some(k => mapa[k]) && (<>
            <L />
            <div className="w-full" style={{ borderTop: '2px solid #cbd5e1', maxWidth: 1000 }} />
            <div className="flex justify-center gap-2 flex-wrap pt-2">
              {(['recepcao', 'profissionais', 'gerais', 'manutencao', 'dosagem'] as const)
                .filter(k => mapa[k]).map(k => <Fragment key={k}>{Caixa({ chave: k, dep: mapa[k] })}</Fragment>)}
            </div>
          </>)}

          {/* Qualquer setor fora do modelo continua aparecendo aqui */}
          {sobra.length > 0 && (
            <div className="w-full pt-5" style={{ maxWidth: 1180 }}>
              <p className="text-[9.5px] text-nodri-t3 uppercase tracking-widest font-bold mb-2 text-center">Outros setores</p>
              <div className="flex justify-center gap-3 flex-wrap">
                {sobra.map(d => <Fragment key={d.id}>{Caixa({ chave: 'outro', dep: d })}</Fragment>)}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-[9.5px] text-nodri-t3 mt-3 text-center">
        ⭐ Integrar todas as áreas para entregar excelência no atendimento, qualidade nos serviços e resultados sustentáveis.
      </p>
    </div>
  )
}
