'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Plus, Minus, X, MessageCircle, Send, Printer, ListChecks, History } from 'lucide-react'
import toast from 'react-hot-toast'
import GridEditavel, { cel, type Doc as GridDoc } from '@/components/salon/GridEditavel'
import ServicoInternoLista from '@/components/salon/ServicoInternoLista'
import EsterilizacaoPainel from '@/components/salon/EsterilizacaoPainel'
import KitsAdminLista from '@/components/salon/KitsAdminLista'
import EnxovaisLista from '@/components/salon/EnxovaisLista'
import SenhasLista from '@/components/salon/SenhasLista'
import AtaReuniaoLista from '@/components/salon/AtaReuniaoLista'
import EscalaTrabalhoLista from '@/components/salon/EscalaTrabalhoLista'
import EscalaFeriadosLista from '@/components/salon/EscalaFeriadosLista'
import ListaBebidas from '@/components/salon/ListaBebidas'
import ListaTelefones from '@/components/salon/ListaTelefones'
import ListaPrecoServicos from '@/components/salon/ListaPrecoServicos'
import ValoresPacotesLista from '@/components/salon/ValoresPacotesLista'
import DocEditavel from '@/components/salon/DocEditavel'
import AnexosLista from '@/components/salon/AnexosLista'
import Etiquetas from '@/components/salon/Etiquetas'
import ListaServico from '@/components/salon/ListaServico'
import { CAFE_BLOCOS, POP_SALAO_BLOCOS } from '@/components/salon/popDefaults'
import { usePermissoes } from '@/lib/usePermissoes'
import { useIsMobile } from '@/lib/useIsMobile'
import { confirmarSaidaSemSalvar } from '@/lib/guardaSalvar'
import { getLogoSalao } from '@/lib/logoSalao'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

// Mapeia cada aba do topo para a chave de permissão
const ABA_CHAVE: Record<string, string> = {
  listas: 'adm_listas', servicos_valores: 'adm_servicos_valores', tratamentos: 'adm_tratamentos',
  valores_pacotes: 'adm_valores_pacotes', telefones: 'adm_telefones', ata: 'adm_ata', escala: 'adm_escala',
  feriados: 'adm_feriados', pop: 'adm_pop', senhas: 'adm_senhas', cadastrar_produto: 'adm_cadastrar_produto',
  desconto_profissional: 'adm_desconto_profissional', tabela_precos: 'adm_tabela_precos', arquivos_envio: 'adm_arquivos_envio',
  corrida_interna: 'adm_corrida_interna', correios: 'adm_correios',
  etiquetas: 'adm_etiquetas', esterilizacao: 'adm_esterilizacao', esterilizacao_fluxo: 'adm_esterilizacao',
  kits: 'adm_kits', enxovais: 'adm_enxovais',
}

interface ProfSalao { id: string; nome: string; telefone: string }
interface Coluna { id: string; nome: string; telefone: string }
interface Obs { id: string; profissional_id: string; profissional_nome: string; tipo: 'positivo' | 'negativo'; texto: string; enviado?: boolean; criado_em?: string; feedback_id?: string; editando?: boolean; orig?: { profissional_id: string; profissional_nome: string; tipo: 'positivo' | 'negativo'; texto: string } }
interface Doc { colunas: Coluna[]; cells: Record<string, number>; obs?: Obs[] }

const SERVICOS = [
  { key: 'realinhamento', label: 'Realinhamento' },
  { key: 'corte', label: 'Corte' },
  { key: 'mechas', label: 'Mechas' },
  { key: 'pigmentacao', label: 'Pigmentação' },
]

// Listas de preenchimento livre (sem contador)
const linhasVazias = (qtd: number, cols: number): GridDoc['tabelas'][0]['linhas'] => Array.from({ length: qtd }, () => Array.from({ length: cols }, () => cel('')))

const DEFAULT_PRODUTOS: GridDoc = { tabelas: [{ titulo: 'CONSUMO DE PRODUTOS', cabecalho: [cel('Profissional'), cel('Data'), cel('Cliente'), cel('Produto'), cel('Quantidade')], linhas: linhasVazias(12, 5) }] }
const DEFAULT_SERV_INT: GridDoc = { tabelas: [{ titulo: 'SERVIÇO INTERNO / PRODUTOS UTILIZADOS', cabecalho: [cel('Data'), cel('Produto'), cel('Quantidade'), cel('Profissional'), cel('Valor')], linhas: linhasVazias(14, 5) }] }

const GRIDS = [
  { key: 'produtos', label: 'Consumo de Produtos', mensal: true, landscape: true, doc: DEFAULT_PRODUTOS },
  { key: 'servinterno', label: 'Serviços Internos', mensal: true, landscape: false, doc: DEFAULT_SERV_INT },
]
const TAB_GRIDS = [{ key: 'bebidas', label: 'Bebidas' }, ...GRIDS.map(g => ({ key: g.key, label: g.label }))]


// ── Abas do topo (além de Listas) ──
const ABAS_TOPO = [
  { key: 'listas', label: 'Listas' },
  { key: 'servicos_valores', label: 'Serviços Internos (Valores)' },
  { key: 'esterilizacao', label: 'Esterilização' },
  { key: 'kits', label: 'Kits Pé e Mão' },
  { key: 'enxovais', label: 'Controle de Enxovais' },
  { key: 'tratamentos', label: 'Tratamentos Dosagem' },
  { key: 'valores_pacotes', label: 'Valores de Pacotes' },
  { key: 'telefones', label: 'Telefones Importantes' },
  { key: 'ata', label: 'Ata de Reunião' },
  { key: 'escala', label: 'Escala de Trabalho' },
  { key: 'feriados', label: 'Escala de Feriados' },
  { key: 'pop', label: 'POP' },
  { key: 'senhas', label: 'Senhas' },
  { key: 'cadastrar_produto', label: 'Cadastrar Produto' },
  { key: 'desconto_profissional', label: 'Desconto Profissional' },
  { key: 'tabela_precos', label: 'Tabela de Preço Atualizada' },
  { key: 'arquivos_envio', label: 'Arquivos para Envio' },
  { key: 'corrida_interna', label: 'Corrida Interna' },
  { key: 'correios', label: 'Correios' },
  { key: 'etiquetas', label: 'Etiquetas' },
]

// ── Sidebar (desktop): tudo visível, por categoria, em MAIÚSCULAS ──
// item.servico = abre a aba Listas já na lista certa; item.rota = navega para
// outra página (Calendário, Lojistas...) em vez de trocar a aba interna.
interface SidebarItem { aba?: string; servico?: string; label: string; rota?: string; perm?: string }
const SIDEBAR_CATS: { cat: string; itens: SidebarItem[] }[] = [
  {
    cat: 'LISTAS DO DIA A DIA', itens: [
      { aba: 'listas', servico: 'realinhamento', label: 'LISTA DE REALINHAMENTO' },
      { aba: 'listas', servico: 'corte', label: 'LISTA DE CORTE' },
      { aba: 'listas', servico: 'mechas', label: 'LISTA DE MECHAS' },
      { aba: 'listas', servico: 'pigmentacao', label: 'LISTA DE PIGMENTAÇÃO' },
      { aba: 'listas', servico: 'bebidas', label: 'BEBIDAS' },
      { aba: 'listas', servico: 'produtos', label: 'CONSUMO DE PRODUTOS' },
      { aba: 'listas', servico: 'servinterno', label: 'SERVIÇOS INTERNOS' },
    ]
  },
  {
    cat: 'PREÇOS E VALORES', itens: [
      { aba: 'servicos_valores', label: 'SERVIÇOS INTERNOS (VALORES)' },
      { aba: 'tratamentos', label: 'TRATAMENTOS DOSAGEM' },
      { aba: 'valores_pacotes', label: 'VALORES DE PACOTES' },
      { aba: 'tabela_precos', label: 'TABELA DE PREÇO ATUALIZADA' },
    ]
  },
  {
    cat: 'CONTROLE E ESTOQUE', itens: [
      { aba: 'esterilizacao_fluxo', label: 'ESTERILIZAÇÃO' },
      { aba: 'kits', label: 'KITS PÉ E MÃO' },
      { aba: 'enxovais', label: 'CONTROLE DE ENXOVAIS' },
      { aba: 'cadastrar_produto', label: 'CADASTRAR PRODUTO' },
      { aba: 'etiquetas', label: 'ETIQUETAS' },
      { aba: 'correios', label: 'CORREIOS' },
    ]
  },
  {
    cat: 'EQUIPE', itens: [
      { aba: 'escala', label: 'ESCALA DE TRABALHO' },
      { aba: 'feriados', label: 'ESCALA DE FERIADOS' },
      { aba: 'ata', label: 'ATA DE REUNIÃO' },
      { aba: 'desconto_profissional', label: 'DESCONTO PROFISSIONAL' },
      { aba: 'corrida_interna', label: 'CORRIDA INTERNA' },
    ]
  },
  {
    cat: 'DOCUMENTOS E ACESSOS', itens: [
      { aba: 'pop', label: 'POP (PROCEDIMENTOS)' },
      { aba: 'senhas', label: 'SENHAS' },
      { aba: 'telefones', label: 'TELEFONES IMPORTANTES' },
      { aba: 'arquivos_envio', label: 'ARQUIVOS PARA ENVIO' },
    ]
  },
  {
    cat: 'AGENDA', itens: [
      { rota: '/salon/calendario', perm: 'calendario', label: 'CALENDÁRIO' },
      { rota: '/salon/calendario-mkt', perm: 'calendario_mkt', label: 'CALENDÁRIO DE MARKETING' },
    ]
  },
  {
    cat: 'GESTÃO E PARCERIAS', itens: [
      { rota: '/salon/lojistas', perm: 'lojistas', label: 'LOJISTAS (PARCERIAS)' },
      { rota: '/salon/checkprocon', perm: 'checkprocon', label: 'CHECK PROCON' },
      { rota: '/salon/auditoria', perm: 'cfg_auditoria', label: 'LOG DE AUDITORIA' },
    ]
  },
]

const DEFAULT_CAD_PRODUTO: GridDoc = { tabelas: [{ titulo: 'CADASTRO DE PRODUTOS', cabecalho: [cel('Produto'), cel('Marca'), cel('Categoria'), cel('Quantidade'), cel('Validade'), cel('Fornecedor'), cel('Custo'), cel('Preço de venda')], linhas: linhasVazias(14, 8), larguras: [220, 150, 150, 110, 120, 180, 110, 130] }] }
const DEFAULT_DESC_PROF: GridDoc = { tabelas: [{ titulo: 'DESCONTO PROFISSIONAL', cabecalho: [cel('Profissional'), cel('Data'), cel('Motivo'), cel('Valor do desconto'), cel('Parcelas'), cel('Observação')], linhas: linhasVazias(14, 6), larguras: [200, 120, 280, 150, 110, 260] }] }
const DEFAULT_CORRIDA: GridDoc = { tabelas: [{ titulo: 'CORRIDA INTERNA', cabecalho: [cel('Profissional'), cel('Meta'), cel('Realizado'), cel('Pontos'), cel('Posição'), cel('Observação')], linhas: linhasVazias(14, 6), larguras: [200, 140, 140, 100, 90, 240] }] }
const DEFAULT_CORREIOS: GridDoc = { tabelas: [{ titulo: 'CORREIOS', cabecalho: [cel('Data'), cel('Tipo (carta/encomenda)'), cel('Remetente'), cel('Destinatário'), cel('Código de rastreio'), cel('Status'), cel('Observação')], linhas: linhasVazias(14, 7), larguras: [110, 170, 180, 180, 180, 130, 220] }] }

function mesAtual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function diasNoMes(mes: string) { const [y, m] = mes.split('-').map(Number); return new Date(y, m, 0).getDate() }

export default function SalaoAdministrativoPage() {
  const router = useRouter()
  const [profsSalao, setProfsSalao] = useState<ProfSalao[]>([])
  const [servico, setServico] = useState('realinhamento')
  const [abaTopo, setAbaTopo] = useState('listas')
  const [abasMenuOpen, setAbasMenuOpen] = useState(false)
  // Kits pedidos e ainda nao separados: fazem o item KITS PE E MAO piscar
  const [kitsPendentes, setKitsPendentes] = useState(0)
  const [esterPendentes, setEsterPendentes] = useState(0)
  useEffect(() => {
    const buscar = () => fetch('/api/salon/alertas', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setKitsPendentes(Number(d.kitsPendentes) || 0); setEsterPendentes(Number(d.esterPendentes) || 0) } })
      .catch(() => {})
    buscar()
    const t = setInterval(buscar, 60000)
    return () => clearInterval(t)
  }, [])
  const [abaPop, setAbaPop] = useState('cafe')
  const [historico, setHistorico] = useState<any[]>([])
  const [verHistorico, setVerHistorico] = useState(false)
  const { pode: podeP, carregado: permCarregado } = usePermissoes()
  const isMobile = useIsMobile(900) // sidebar precisa de espaço; abaixo disso volta o menu suspenso
  const abasVisiveis = ABAS_TOPO.filter(a => podeP(ABA_CHAVE[a.key] || a.key))

  // Link direto (busca global): /salon/administrativo?aba=senhas ou ?aba=listas&lista=corte
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const aba = sp.get('aba'); const lista = sp.get('lista')
    if (aba && ABAS_TOPO.some(a => a.key === aba)) setAbaTopo(aba)
    if (lista && [...SERVICOS.map(s => s.key), ...TAB_GRIDS.map(g => g.key)].includes(lista)) setServico(lista)
  }, [])
  // se a aba atual não está liberada, vai pra primeira liberada
  useEffect(() => {
    if (permCarregado && abasVisiveis.length && !abasVisiveis.some(a => a.key === abaTopo)) setAbaTopo(abasVisiveis[0].key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permCarregado])

  useEffect(() => {
    fetch('/api/profissionais').then(r => r.ok ? r.json() : []).then((arr: any[]) => {
      setProfsSalao((Array.isArray(arr) ? arr : []).map(p => {
        let tel = p.telefone || ''
        if (!tel) { try { tel = JSON.parse(p.contato_responsavel || '{}').tel || '' } catch { /* */ } }
        return { id: p.id, nome: p.apelido || p.nome_completo || '—', telefone: tel }
      }))
    }).catch(() => { })
    carregarHistorico()
  }, [])

  const carregarHistorico = useCallback(() => {
    fetch('/api/salon/listas?mensagens=1').then(r => r.ok ? r.json() : []).then(d => setHistorico(Array.isArray(d) ? d : [])).catch(() => { })
  }, [])

  return (
    <div className="nodri-salon-bg" style={{ minHeight: '100vh' }}>
      <nav style={{ background: '#faf9f7', borderBottom: '1px solid #e8e6e0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.push('/salon')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: '#6b6860', cursor: 'pointer', fontSize: 14 }}><ArrowLeft size={16} /> Voltar</button>
        <span style={{ width: 1, height: 16, background: '#e0ddd8' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1a1a1a' }}>🗂️ Salão Administrativo</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => { setVerHistorico(true); carregarHistorico() }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid #d0cdc7', borderRadius: 8, padding: '6px 12px', color: '#6b6860', cursor: 'pointer', fontSize: 13 }}><History size={14} /> Mensagens</button>
      </nav>

      <div style={{ maxWidth: isMobile ? 1100 : 1380, margin: '0 auto', padding: 16, display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        {/* Sidebar (desktop): tudo visível, por categoria */}
        {!isMobile && (
          <aside style={{ width: 252, flexShrink: 0, position: 'sticky', top: 74, maxHeight: 'calc(100vh - 92px)', overflowY: 'auto', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: '10px 8px' }}>
            {SIDEBAR_CATS.map(grupo => {
              const itens = grupo.itens.filter(it => podeP(it.perm || ABA_CHAVE[it.aba || ''] || it.aba || ''))
              if (!itens.length) return null
              return (
                <div key={grupo.cat} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 900, color: '#9ca3af', letterSpacing: '.6px', padding: '6px 10px 4px' }}>{grupo.cat}</div>
                  {itens.map(it => {
                    const ativo = !it.rota && abaTopo === it.aba && (!it.servico || servico === it.servico)
                    const irPara = () => { if (!confirmarSaidaSemSalvar()) return; if (it.rota) { router.push(it.rota) } else { setAbaTopo(it.aba!); if (it.servico) setServico(it.servico) } }
                    return (
                      <button key={(it.aba || it.rota || '') + (it.servico || '')} onClick={irPara}
                        className={(it.aba === 'kits' && kitsPendentes > 0) || (it.aba === 'esterilizacao_fluxo' && esterPendentes > 0) ? 'nodri-alerta-pisca' : ''}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', borderRadius: 8, background: ativo ? '#f0eefb' : 'transparent', color: ativo ? '#5b4fcf' : '#4b5563', fontSize: 11.5, fontWeight: ativo ? 900 : 700, letterSpacing: '.3px', cursor: 'pointer', borderLeft: ativo ? '3px solid #5b4fcf' : '3px solid transparent' }}
                        onMouseEnter={e => { if (!ativo) e.currentTarget.style.background = '#faf9f7' }} onMouseLeave={e => { if (!ativo) e.currentTarget.style.background = 'transparent' }}>
                        <span style={{ flex: 1, minWidth: 0 }}>{it.label}{it.rota ? ' →' : ''}</span>
                        {it.aba === 'esterilizacao_fluxo' && esterPendentes > 0 && (
                          <span style={{ background: '#dc2626', color: '#fff', fontSize: 9.5, fontWeight: 900, borderRadius: 99, padding: '2px 7px', whiteSpace: 'nowrap' }}>{esterPendentes}</span>
                        )}
                        {it.aba === 'kits' && kitsPendentes > 0 && (
                          <span style={{ background: '#dc2626', color: '#fff', fontSize: 9.5, fontWeight: 900, borderRadius: 99, padding: '2px 7px', whiteSpace: 'nowrap' }}>{kitsPendentes}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </aside>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
        {/* Lista suspensa de ferramentas (celular): mesma estrutura da sidebar —
            tudo por categoria, em MAIÚSCULAS, incluindo as 7 listas */}
        {isMobile && (
        <div style={{ position: 'relative', maxWidth: 420, marginBottom: 18 }}>
          {abasMenuOpen && <div onClick={() => setAbasMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />}
          <button onClick={() => setAbasMenuOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 16px', borderRadius: 12, border: '1.5px solid #5b4fcf', background: '#f0eefb', color: '#1a1a1a', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}><ListChecks size={16} color="#5b4fcf" /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {SIDEBAR_CATS.flatMap(g => g.itens).find(it => !it.rota && abaTopo === it.aba && (!it.servico || servico === it.servico))?.label || abasVisiveis.find(a => a.key === abaTopo)?.label || 'FERRAMENTAS'}
            </span></span>
            <span style={{ color: '#5b4fcf', fontSize: 13, transition: 'transform .15s', transform: abasMenuOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
          </button>
          {abasMenuOpen && (
            <div style={{ position: 'absolute', top: '108%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 12, boxShadow: '0 14px 36px rgba(0,0,0,.16)', maxHeight: 420, overflowY: 'auto', padding: 6 }}>
              {SIDEBAR_CATS.map(grupo => {
                const itens = grupo.itens.filter(it => podeP(it.perm || ABA_CHAVE[it.aba || ''] || it.aba || ''))
                if (!itens.length) return null
                return (
                  <div key={grupo.cat} style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 900, color: '#9ca3af', letterSpacing: '.6px', padding: '8px 12px 4px' }}>{grupo.cat}</div>
                    {itens.map(it => {
                      const ativo = !it.rota && abaTopo === it.aba && (!it.servico || servico === it.servico)
                      const irPara = () => { if (!confirmarSaidaSemSalvar()) return; if (it.rota) { router.push(it.rota) } else { setAbaTopo(it.aba!); if (it.servico) setServico(it.servico); setAbasMenuOpen(false) } }
                      return (
                        <button key={(it.aba || it.rota || '') + (it.servico || '')} onClick={irPara}
                          className={(it.aba === 'kits' && kitsPendentes > 0) || (it.aba === 'esterilizacao_fluxo' && esterPendentes > 0) ? 'nodri-alerta-pisca' : ''}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderRadius: 8, background: ativo ? '#f0eefb' : 'transparent', color: ativo ? '#5b4fcf' : '#374151', fontSize: 12.5, fontWeight: ativo ? 900 : 700, letterSpacing: '.3px', cursor: 'pointer', borderLeft: ativo ? '3px solid #5b4fcf' : '3px solid transparent' }}>
                          <span style={{ flex: 1, minWidth: 0 }}>{it.label}{it.rota ? ' →' : ''}</span>
                          {it.aba === 'esterilizacao_fluxo' && esterPendentes > 0 && (
                            <span style={{ background: '#dc2626', color: '#fff', fontSize: 9.5, fontWeight: 900, borderRadius: 99, padding: '2px 7px', whiteSpace: 'nowrap' }}>{esterPendentes}</span>
                          )}
                          {it.aba === 'kits' && kitsPendentes > 0 && (
                            <span style={{ background: '#dc2626', color: '#fff', fontSize: 9.5, fontWeight: 900, borderRadius: 99, padding: '2px 7px', whiteSpace: 'nowrap' }}>{kitsPendentes}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        )}

        {abaTopo === 'listas' && (<>

          {SERVICOS.some(s => s.key === servico)
            ? <ListaServico key={servico} servico={servico} label={SERVICOS.find(s => s.key === servico)?.label || ''} profsSalao={profsSalao} onMensagem={carregarHistorico} />
            : servico === 'bebidas'
              ? <ListaBebidas key="bebidas" profsSalao={profsSalao} />
              : servico === 'servinterno'
                ? <ServicoInternoLista key="servinterno" chave="servinterno" profsSalao={profsSalao} />
                : (() => { const g = GRIDS.find(x => x.key === servico)!; return <GridEditavel key={servico} chave={g.key} defaultDoc={g.doc} mensal={g.mensal} landscape={g.landscape} /> })()}
        </>)}

        {abaTopo === 'esterilizacao_fluxo' && <EsterilizacaoPainel key="ester_painel" profsSalao={profsSalao} />}
        {abaTopo === 'kits' && <KitsAdminLista key="kits" />}
        {abaTopo === 'enxovais' && <EnxovaisLista key="enxovais" />}
        {abaTopo === 'servicos_valores' && <ListaPrecoServicos key="precos" />}
        {abaTopo === 'tratamentos' && <ListaPrecoServicos key="trat" chave="tratamentos_dosagem" titulo="Tratamentos — Dosagem" comLogo />}
        {abaTopo === 'valores_pacotes' && <ValoresPacotesLista key="valores_pacotes" />}
        {abaTopo === 'telefones' && <ListaTelefones />}
        {abaTopo === 'ata' && <AtaReuniaoLista key="ata" chave="ata" profsSalao={profsSalao} />}
        {abaTopo === 'escala' && <EscalaTrabalhoLista key="escala" chave="escala" />}
        {abaTopo === 'feriados' && <EscalaFeriadosLista key="feriados" chave="feriados" />}
        {abaTopo === 'senhas' && <SenhasLista key="senhas" chave="senhas" />}
        {abaTopo === 'cadastrar_produto' && <GridEditavel key="cadprod" chave="cadastrar_produto" defaultDoc={DEFAULT_CAD_PRODUTO} landscape />}
        {abaTopo === 'desconto_profissional' && <GridEditavel key="descprof" chave="desconto_profissional" defaultDoc={DEFAULT_DESC_PROF} landscape />}
        {abaTopo === 'tabela_precos' && <AnexosLista key="tabprecos" chave="tabela_precos_arquivos" titulo="Tabela de Preço Atualizada" campoNome="Marca" comData />}
        {abaTopo === 'arquivos_envio' && <AnexosLista key="arqenvio" chave="arquivos_envio_lista" titulo="Arquivos para Envio" campoNome="Nome do arquivo" comData />}
        {abaTopo === 'corrida_interna' && <GridEditavel key="corrida" chave="corrida_interna" defaultDoc={DEFAULT_CORRIDA} landscape />}
        {abaTopo === 'correios' && <GridEditavel key="correios" chave="correios" defaultDoc={DEFAULT_CORREIOS} landscape />}
        {abaTopo === 'etiquetas' && <Etiquetas key="etiquetas" />}

        {abaTopo === 'pop' && (<>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {[{ key: 'cafe', label: 'Preparo de Café' }, { key: 'salao', label: 'POP Salão' }].map(p => (
              <button key={p.key} onClick={() => setAbaPop(p.key)}
                style={{ padding: '9px 16px', borderRadius: 10, border: abaPop === p.key ? 'none' : '1.5px solid #e0ddd8', background: abaPop === p.key ? '#1a1a1a' : '#fff', color: abaPop === p.key ? '#fff' : '#6b6860', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
                {p.label}
              </button>
            ))}
          </div>
          {abaPop === 'cafe' && <DocEditavel key="pop_cafe" chave="pop_cafe" tituloPadrao="PREPARO DE SERVIÇOS — CAFÉ" blocosPadrao={CAFE_BLOCOS} />}
          {abaPop === 'salao' && <DocEditavel key="pop_salao" chave="pop_salao" tituloPadrao="POP — PROCEDIMENTO DE OPERAÇÃO PADRÃO" blocosPadrao={POP_SALAO_BLOCOS} comData />}
        </>)}
        </div>
      </div>

      {verHistorico && (
        <div onClick={() => setVerHistorico(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>📨 Mensagens enviadas (relatório)</h3>
              <button onClick={() => setVerHistorico(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            {historico.length === 0 ? <p style={{ color: '#9ca3af', fontSize: 13 }}>Nenhuma mensagem registrada ainda.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {historico.map((m, i) => (
                  <div key={i} style={{ border: '1px solid #e8e6e0', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#5b4fcf' }}>{m.prof} · {m.servico} · {m.mes}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 5 }}>{new Date(m.enviada_em).toLocaleString('pt-BR')}</div>
                    <div style={{ fontSize: 12.5, color: '#374151', whiteSpace: 'pre-wrap' }}>{m.texto}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
