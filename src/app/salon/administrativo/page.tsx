'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save, Plus, Minus, X, MessageCircle, Send, Printer, ListChecks, History } from 'lucide-react'
import toast from 'react-hot-toast'
import GridEditavel, { cel, type Doc as GridDoc } from '@/components/salon/GridEditavel'
import ServicoInternoLista from '@/components/salon/ServicoInternoLista'
import EsterilizacaoLista from '@/components/salon/EsterilizacaoLista'
import KitsAdminLista from '@/components/salon/KitsAdminLista'
import EnxovaisLista from '@/components/salon/EnxovaisLista'
import ListaBebidas from '@/components/salon/ListaBebidas'
import ListaTelefones from '@/components/salon/ListaTelefones'
import ListaPrecoServicos from '@/components/salon/ListaPrecoServicos'
import DocEditavel from '@/components/salon/DocEditavel'
import AnexosLista from '@/components/salon/AnexosLista'
import Etiquetas from '@/components/salon/Etiquetas'
import { CAFE_BLOCOS, POP_SALAO_BLOCOS } from '@/components/salon/popDefaults'
import { usePermissoes } from '@/lib/usePermissoes'
import { getLogoSalao } from '@/lib/logoSalao'

// Mapeia cada aba do topo para a chave de permissão
const ABA_CHAVE: Record<string, string> = {
  listas: 'adm_listas', servicos_valores: 'adm_servicos_valores', tratamentos: 'adm_tratamentos',
  pacotes: 'adm_pacotes', telefones: 'adm_telefones', ata: 'adm_ata', escala: 'adm_escala',
  feriados: 'adm_feriados', pop: 'adm_pop', senhas: 'adm_senhas', cadastrar_produto: 'adm_cadastrar_produto',
  desconto_profissional: 'adm_desconto_profissional', tabela_precos: 'adm_tabela_precos', arquivos_envio: 'adm_arquivos_envio',
  corrida_interna: 'adm_corrida_interna', acoes_comerciais: 'adm_acoes_comerciais', correios: 'adm_correios',
  etiquetas: 'adm_etiquetas', agendamentos_grandes: 'adm_agendamentos_grandes', esterilizacao: 'adm_esterilizacao',
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

const DEFAULT_PACOTES: GridDoc = { tabelas: [{ titulo: 'PREÇO DE PACOTES', cabecalho: [cel('Pacote'), cel('O que inclui'), cel('Valor'), cel('Observação')], linhas: linhasVazias(10, 4), larguras: [220, 420, 140, 240] }] }

// ── Abas do topo (além de Listas) ──
const ABAS_TOPO = [
  { key: 'listas', label: 'Listas' },
  { key: 'servicos_valores', label: 'Serviços Internos (Valores)' },
  { key: 'esterilizacao', label: 'Esterilização' },
  { key: 'kits', label: 'Kits Pé e Mão' },
  { key: 'enxovais', label: 'Controle de Enxovais' },
  { key: 'tratamentos', label: 'Tratamentos Dosagem' },
  { key: 'pacotes', label: 'Preço de Pacotes' },
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
  { key: 'acoes_comerciais', label: 'Ações Comerciais' },
  { key: 'correios', label: 'Correios' },
  { key: 'etiquetas', label: 'Etiquetas' },
  { key: 'agendamentos_grandes', label: 'Agendamentos Grandes' },
]

const DEFAULT_CAD_PRODUTO: GridDoc = { tabelas: [{ titulo: 'CADASTRO DE PRODUTOS', cabecalho: [cel('Produto'), cel('Marca'), cel('Categoria'), cel('Quantidade'), cel('Validade'), cel('Fornecedor'), cel('Custo'), cel('Preço de venda')], linhas: linhasVazias(14, 8), larguras: [220, 150, 150, 110, 120, 180, 110, 130] }] }
const DEFAULT_DESC_PROF: GridDoc = { tabelas: [{ titulo: 'DESCONTO PROFISSIONAL', cabecalho: [cel('Profissional'), cel('Data'), cel('Motivo'), cel('Valor do desconto'), cel('Parcelas'), cel('Observação')], linhas: linhasVazias(14, 6), larguras: [200, 120, 280, 150, 110, 260] }] }
const DEFAULT_CORRIDA: GridDoc = { tabelas: [{ titulo: 'CORRIDA INTERNA', cabecalho: [cel('Profissional'), cel('Meta'), cel('Realizado'), cel('Pontos'), cel('Posição'), cel('Observação')], linhas: linhasVazias(14, 6), larguras: [200, 140, 140, 100, 90, 240] }] }
const DEFAULT_ACOES: GridDoc = { tabelas: [{ titulo: 'AÇÕES COMERCIAIS', cabecalho: [cel('Ação / Campanha'), cel('Período'), cel('Responsável'), cel('Meta'), cel('Resultado'), cel('Observação')], linhas: linhasVazias(12, 6), larguras: [240, 150, 160, 140, 160, 240] }] }
const DEFAULT_CORREIOS: GridDoc = { tabelas: [{ titulo: 'CORREIOS', cabecalho: [cel('Data'), cel('Tipo (carta/encomenda)'), cel('Remetente'), cel('Destinatário'), cel('Código de rastreio'), cel('Status'), cel('Observação')], linhas: linhasVazias(14, 7), larguras: [110, 170, 180, 180, 180, 130, 220] }] }
const DEFAULT_AGENDA_GRANDE: GridDoc = { tabelas: [{ titulo: 'AGENDAMENTOS GRANDES', cabecalho: [cel('Data'), cel('Cliente'), cel('Serviço'), cel('Profissional'), cel('Valor'), cel('Observação')], linhas: linhasVazias(14, 6), larguras: [110, 200, 200, 180, 120, 240] }] }

const DEFAULT_ATA: GridDoc = { tabelas: [
  { titulo: 'PAUTA DA REUNIÃO', cabecalho: [cel('Nº'), cel('Ponto a apresentar'), cel('Responsável'), cel('Decisão / Encaminhamento')], linhas: Array.from({ length: 8 }, (_, i) => [cel(String(i + 1)), cel(''), cel(''), cel('')]) },
  { titulo: 'ASSINATURAS DOS PROFISSIONAIS', cabecalho: [cel('Profissional'), cel('Assinatura')], linhas: linhasVazias(12, 2) },
] }

const SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
function escalaDoMes(mes: string): GridDoc {
  const [y, m] = mes.split('-').map(Number)
  const dias = new Date(y, m, 0).getDate()
  const linhas = Array.from({ length: dias }, (_, i) => {
    const d = i + 1, wd = new Date(y, m - 1, d).getDay()
    const c0 = cel(`${String(d).padStart(2, '0')} - ${SEM[wd]}`); c0.b = true; if (wd === 0) c0.bg = '#fef08a'
    return [c0, cel(''), cel('')]
  })
  return { tabelas: [
    { titulo: 'ESCALA DE TRABALHO', cabecalho: [cel('Dia'), cel('Profissionais escalados'), cel('Obs')], linhas, larguras: [120, 560, 220] },
    { titulo: 'VALE TRANSPORTE E ALIMENTAÇÃO', cabecalho: [cel('Nome'), cel('Dias'), cel('Valor'), cel('PIX')], linhas: linhasVazias(8, 4), larguras: [220, 120, 140, 220] },
    { titulo: 'AJUDA DE CUSTO PARA PROFISSIONAIS', cabecalho: [cel('Nome'), cel('Cálculo'), cel('Valor'), cel('PIX')], linhas: linhasVazias(6, 4), larguras: [220, 180, 140, 220] },
  ] }
}

const FERIADOS_2026: [string, string, string][] = [
  ['Carnaval', '02, 03 e 04/03/2026', 'FECHADO'],
  ['Tira Dentes', '21/04/2026', '10:00 às 18:00'],
  ['Dia do Trabalhador', '01/05/2026', '10:00 às 18:00'],
  ['Sete de Setembro', '07/09/2026', '10:00 às 18:00'],
  ['Nossa Senhora', '12/10/2026', '10:00 às 18:00'],
  ['Finados', '02/11/2026', '10:00 às 18:00'],
  ['Proclamação da República', '15/11/2026', '10:00 às 18:00'],
  ['Consciência Negra', '20/11/2026', '10:00 às 18:00'],
  ['Natal', '24/12/2026', '10:00 às 18:00'],
  ['Ano Novo', '31/12/2026', '10:00 às 18:00'],
]
const DEFAULT_FERIADOS: GridDoc = { tabelas: [
  { titulo: 'ESCALA DE FERIADOS', cabecalho: [cel('Feriado'), cel('Data'), cel('Horário'), cel('Profissionais escalados (1 por linha ou separados por vírgula)'), cel('Obs')], linhas: FERIADOS_2026.map(([f, d, h]) => [cel(f), cel(d), cel(h), cel(''), cel('')]), larguras: [180, 150, 130, 640, 200] },
] }

const DEFAULT_SENHAS: GridDoc = { tabelas: [
  { titulo: 'DADOS E SENHAS DO SALÃO', cabecalho: [cel('Descrição'), cel('Informação')], linhas: [
    [cel('PIX Salão'), cel('CNPJ: 29.789.033/0001-44 — OLIVEIRA E SCHNEIDER INSTITUTO DE BELEZA LTDA')],
    [cel('Conta para transferência'), cel('Agência: 3426-6 · Conta corrente: 21949-5 · CNPJ: 29.789.033/0001-44')],
    [cel('E-mail Salão'), cel('ROUGEHAIR110@GMAIL.COM')],
    [cel('Senha do e-mail'), cel('')],
    [cel('Wi-Fi'), cel('')],
    [cel('Sistema NODRI'), cel('')],
  ] },
] }

function mesAtual() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function diasNoMes(mes: string) { const [y, m] = mes.split('-').map(Number); return new Date(y, m, 0).getDate() }

export default function SalaoAdministrativoPage() {
  const router = useRouter()
  const [profsSalao, setProfsSalao] = useState<ProfSalao[]>([])
  const [servico, setServico] = useState('realinhamento')
  const [abaTopo, setAbaTopo] = useState('listas')
  const [abasMenuOpen, setAbasMenuOpen] = useState(false)
  const [abaPop, setAbaPop] = useState('cafe')
  const [historico, setHistorico] = useState<any[]>([])
  const [verHistorico, setVerHistorico] = useState(false)
  const { pode: podeP, carregado: permCarregado } = usePermissoes()
  const abasVisiveis = ABAS_TOPO.filter(a => podeP(ABA_CHAVE[a.key] || a.key))
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

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
        {/* Lista suspensa de ferramentas (PC e celular): mostra a aba atual; ao clicar, abre todas */}
        <div style={{ position: 'relative', maxWidth: 420, marginBottom: 18 }}>
          {abasMenuOpen && <div onClick={() => setAbasMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />}
          <button onClick={() => setAbasMenuOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 16px', borderRadius: 12, border: '1.5px solid #5b4fcf', background: '#f0eefb', color: '#1a1a1a', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}><ListChecks size={16} color="#5b4fcf" /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{abasVisiveis.find(a => a.key === abaTopo)?.label || 'Ferramentas'}</span></span>
            <span style={{ color: '#5b4fcf', fontSize: 13, transition: 'transform .15s', transform: abasMenuOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
          </button>
          {abasMenuOpen && (
            <div style={{ position: 'absolute', top: '108%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 12, boxShadow: '0 14px 36px rgba(0,0,0,.16)', maxHeight: 380, overflowY: 'auto', padding: 6 }}>
              {abasVisiveis.map(a => (
                <button key={a.key} onClick={() => { setAbaTopo(a.key); setAbasMenuOpen(false) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 12px', border: 'none', borderRadius: 8, background: abaTopo === a.key ? '#f0eefb' : 'transparent', color: abaTopo === a.key ? '#5b4fcf' : '#374151', fontSize: 14, fontWeight: abaTopo === a.key ? 800 : 600, cursor: 'pointer' }}
                  onMouseEnter={e => { if (abaTopo !== a.key) e.currentTarget.style.background = '#faf9f7' }} onMouseLeave={e => { if (abaTopo !== a.key) e.currentTarget.style.background = 'transparent' }}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {abaTopo === 'listas' && (<>
          {/* Seletor de lista (dropdown organizado) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#6b6860' }}>Escolha a lista:</label>
            <select value={servico} onChange={e => setServico(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #5b4fcf', background: '#f0eefb', color: '#1a1a1a', fontSize: 14, fontWeight: 700, cursor: 'pointer', minWidth: 260 }}>
              <optgroup label="Contagem de serviços (com rodízio)">
                {SERVICOS.map(s => <option key={s.key} value={s.key}>Lista de {s.label}</option>)}
              </optgroup>
              <optgroup label="Preenchimento livre">
                {TAB_GRIDS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
              </optgroup>
            </select>
          </div>

          {SERVICOS.some(s => s.key === servico)
            ? <ListaServico key={servico} servico={servico} label={SERVICOS.find(s => s.key === servico)?.label || ''} profsSalao={profsSalao} onMensagem={carregarHistorico} />
            : servico === 'bebidas'
              ? <ListaBebidas key="bebidas" profsSalao={profsSalao} />
              : servico === 'servinterno'
                ? <ServicoInternoLista key="servinterno" chave="servinterno" profsSalao={profsSalao} />
                : (() => { const g = GRIDS.find(x => x.key === servico)!; return <GridEditavel key={servico} chave={g.key} defaultDoc={g.doc} mensal={g.mensal} landscape={g.landscape} /> })()}
        </>)}

        {abaTopo === 'esterilizacao' && <EsterilizacaoLista key="esterilizacao" chave="esterilizacao" profsSalao={profsSalao} />}
        {abaTopo === 'kits' && <KitsAdminLista key="kits" />}
        {abaTopo === 'enxovais' && <EnxovaisLista key="enxovais" />}
        {abaTopo === 'servicos_valores' && <ListaPrecoServicos key="precos" />}
        {abaTopo === 'tratamentos' && <ListaPrecoServicos key="trat" chave="tratamentos_dosagem" titulo="Tratamentos — Dosagem" comLogo />}
        {abaTopo === 'pacotes' && <GridEditavel key="pacotes" chave="pacotes" defaultDoc={DEFAULT_PACOTES} landscape />}
        {abaTopo === 'telefones' && <ListaTelefones />}
        {abaTopo === 'ata' && <GridEditavel key="ata" chave="ata" defaultDoc={DEFAULT_ATA} />}
        {abaTopo === 'escala' && <GridEditavel key="escala" chave="escala" defaultDocFn={escalaDoMes} mensal landscape />}
        {abaTopo === 'feriados' && <GridEditavel key="feriados" chave="feriados" defaultDoc={DEFAULT_FERIADOS} landscape />}
        {abaTopo === 'senhas' && <GridEditavel key="senhas" chave="senhas" defaultDoc={DEFAULT_SENHAS} />}
        {abaTopo === 'cadastrar_produto' && <GridEditavel key="cadprod" chave="cadastrar_produto" defaultDoc={DEFAULT_CAD_PRODUTO} landscape />}
        {abaTopo === 'desconto_profissional' && <GridEditavel key="descprof" chave="desconto_profissional" defaultDoc={DEFAULT_DESC_PROF} landscape />}
        {abaTopo === 'tabela_precos' && <AnexosLista key="tabprecos" chave="tabela_precos_arquivos" titulo="Tabela de Preço Atualizada" campoNome="Marca" comData />}
        {abaTopo === 'arquivos_envio' && <AnexosLista key="arqenvio" chave="arquivos_envio_lista" titulo="Arquivos para Envio" campoNome="Nome do arquivo" comData />}
        {abaTopo === 'corrida_interna' && <GridEditavel key="corrida" chave="corrida_interna" defaultDoc={DEFAULT_CORRIDA} landscape />}
        {abaTopo === 'acoes_comerciais' && <GridEditavel key="acoes" chave="acoes_comerciais" defaultDoc={DEFAULT_ACOES} landscape />}
        {abaTopo === 'correios' && <GridEditavel key="correios" chave="correios" defaultDoc={DEFAULT_CORREIOS} landscape />}
        {abaTopo === 'agendamentos_grandes' && <GridEditavel key="aggrande" chave="agendamentos_grandes" defaultDoc={DEFAULT_AGENDA_GRANDE} landscape />}
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

function ListaServico({ servico, label, profsSalao, onMensagem }: { servico: string; label: string; profsSalao: ProfSalao[]; onMensagem: () => void }) {
  const [mes, setMes] = useState(mesAtual())
  const [doc, setDoc] = useState<Doc>({ colunas: [], cells: {} })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [msgProf, setMsgProf] = useState<Coluna | null>(null)
  const [msgTexto, setMsgTexto] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch(`/api/salon/listas?servico=${servico}&mes=${mes}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.colunas)) setDoc({ colunas: d.colunas, cells: d.cells || {}, obs: Array.isArray(d.obs) ? d.obs : [] })
      else setDoc({ colunas: [], cells: {}, obs: [] })
    } catch { setDoc({ colunas: [], cells: {}, obs: [] }) }
    setDirty(false); setLoading(false)
  }, [servico, mes])
  useEffect(() => { carregar() }, [carregar])

  const dias = diasNoMes(mes)
  const totalDe = (profId: string) => { let t = 0; for (let d = 1; d <= dias; d++) t += doc.cells[`${d}-${profId}`] || 0; return t }
  const totais = doc.colunas.map(c => totalDe(c.id))
  const somaGeral = totais.reduce((a, b) => a + b, 0)
  const media = doc.colunas.length ? Math.round(somaGeral / doc.colunas.length) : 0
  // próximo da vez = menor total; empate → mais à esquerda
  let proximoIdx = -1
  if (doc.colunas.length) { let min = Infinity; doc.colunas.forEach((_, i) => { if (totais[i] < min) { min = totais[i]; proximoIdx = i } }) }

  function mut(fn: (d: Doc) => void) { setDoc(prev => { const n: Doc = JSON.parse(JSON.stringify(prev)); fn(n); return n }); setDirty(true) }
  function inc(dia: number, profId: string, delta: number) { mut(d => { const k = `${dia}-${profId}`; d.cells[k] = Math.max(0, (d.cells[k] || 0) + delta) }) }
  function addProf(p: ProfSalao) { if (doc.colunas.some(c => c.id === p.id)) return; mut(d => { d.colunas.push({ id: p.id, nome: p.nome, telefone: p.telefone }) }); setAddOpen(false) }
  function delProf(id: string) { mut(d => { d.colunas = d.colunas.filter(c => c.id !== id); Object.keys(d.cells).forEach(k => { if (k.endsWith(`-${id}`)) delete d.cells[k] }) }) }

  async function salvar() {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/listas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servico, mes, doc }) })
      if (res.ok) { toast.success('Lista salva!'); setDirty(false) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  // ── Observações → Feedback do Profissional ──
  const [salvandoObs, setSalvandoObs] = useState(false)
  const obsList = doc.obs || []
  function addObs() { mut(d => { if (!d.obs) d.obs = []; d.obs.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), profissional_id: '', profissional_nome: '', tipo: 'negativo', texto: '' }) }) }
  function updObs(id: string, patch: Partial<Obs>) { mut(d => { const o = (d.obs || []).find(x => x.id === id); if (o && (!o.enviado || o.editando)) Object.assign(o, patch) }) }
  function delObs(id: string) { mut(d => { d.obs = (d.obs || []).filter(x => x.id !== id) }) }

  function editarObs(id: string) {
    mut(d => {
      const o = (d.obs || []).find(x => x.id === id); if (!o) return
      o.orig = { profissional_id: o.profissional_id, profissional_nome: o.profissional_nome, tipo: o.tipo, texto: o.texto }
      o.editando = true
    })
  }
  function cancelarEdicaoObs(id: string) {
    mut(d => {
      const o = (d.obs || []).find(x => x.id === id); if (!o) return
      if (o.orig) { o.profissional_id = o.orig.profissional_id; o.profissional_nome = o.orig.profissional_nome; o.tipo = o.orig.tipo; o.texto = o.orig.texto }
      delete o.orig; o.editando = false
    })
  }

  async function salvarEdicaoObs(id: string) {
    const o = obsList.find(x => x.id === id)
    if (!o || !o.feedback_id) return
    if (!o.profissional_nome || !o.texto.trim()) { toast('Preencha o profissional e a descrição', { icon: '✍️' }); return }
    setSalvandoObs(true)
    try {
      const res = await fetch('/api/feedback-prof/respostas', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: o.feedback_id, profissional_nome: o.profissional_nome, tipo: o.tipo, descricao: o.texto }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d?.error || 'Erro ao salvar alteração'); setSalvandoObs(false); return }
      const novoDoc: Doc = JSON.parse(JSON.stringify(doc))
      const alvo = (novoDoc.obs || []).find(x => x.id === id)
      if (alvo) { alvo.editando = false; delete alvo.orig }
      setDoc(novoDoc)
      await fetch('/api/salon/listas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servico, mes, doc: novoDoc }) })
      toast.success('Observação atualizada no Feedback do Profissional! ✅')
    } catch { toast.error('Erro de conexão') }
    setSalvandoObs(false)
  }

  async function excluirObs(id: string) {
    const o = obsList.find(x => x.id === id)
    if (!o) return
    if (!confirm('Excluir esta observação? Ela também será removida do Feedback do Profissional.')) return
    try {
      if (o.feedback_id) {
        const res = await fetch('/api/feedback-prof/respostas', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: o.feedback_id }),
        })
        if (!res.ok) { const d = await res.json().catch(() => null); toast.error(d?.error || 'Erro ao excluir do feedback'); return }
      }
      const novoDoc: Doc = JSON.parse(JSON.stringify(doc))
      novoDoc.obs = (novoDoc.obs || []).filter(x => x.id !== id)
      setDoc(novoDoc)
      await fetch('/api/salon/listas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servico, mes, doc: novoDoc }) })
      toast.success('Observação excluída!')
    } catch { toast.error('Erro de conexão') }
  }

  async function salvarObs() {
    const pendentes = obsList.filter(o => !o.enviado && o.profissional_nome && o.texto.trim())
    if (pendentes.length === 0) { toast('Preencha o profissional e a descrição antes de salvar', { icon: '✍️' }); return }
    setSalvandoObs(true)
    try {
      const res = await fetch('/api/salon/listas/observacoes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lista_label: label, observacoes: pendentes.map(o => ({ profissional_id: o.profissional_id, profissional_nome: o.profissional_nome, tipo: o.tipo, descricao: o.texto })) }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d?.error || 'Erro ao enviar'); setSalvandoObs(false); return }
      // marca como enviadas (guardando o id no feedback p/ editar/excluir) e persiste
      const idsFeedback: string[] = Array.isArray(d.ids) ? d.ids : []
      const posPorId = new Map(pendentes.map((o, i) => [o.id, i]))
      const novoDoc: Doc = JSON.parse(JSON.stringify(doc))
      novoDoc.obs = (novoDoc.obs || []).map(o => posPorId.has(o.id)
        ? { ...o, enviado: true, criado_em: new Date().toISOString(), feedback_id: idsFeedback[posPorId.get(o.id)!] }
        : o)
      setDoc(novoDoc)
      await fetch('/api/salon/listas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ servico, mes, doc: novoDoc }) })
      toast.success(`${pendentes.length} observação(ões) enviada(s) para o Feedback do Profissional! ✅`)
    } catch { toast.error('Erro de conexão') }
    setSalvandoObs(false)
  }

  function abrirMsg(c: Coluna) {
    const total = totalDe(c.id)
    const diff = media - total
    const serv = label.toLowerCase()
    let txt: string
    if (diff > 0) txt = `Olá *${c.nome}*! 👋\n\nNeste mês você atendeu *${total}* de ${serv}, enquanto a média do salão é *${media}*. Isso são *${diff}* a menos.\n\nSei que pode ser por conta da sua logística pessoal e de tempo. Quer que eu ajuste sua agenda, abrindo mais horários para clientes sem preferência de profissional? O que você acha que ajudaria?\n\nConte comigo! 💛`
    else txt = `Olá *${c.nome}*! 👏\n\nNeste mês você atendeu *${total}* de ${serv}, ${total > media ? 'acima da' : 'na'} média do salão (*${media}*). Parabéns pelo empenho, continue assim! 💛`
    setMsgTexto(txt); setMsgProf(c)
  }
  async function enviarMsg() {
    if (!msgProf) return
    const fone = String(msgProf.telefone || '').replace(/\D/g, '')
    if (fone) { const numero = fone.startsWith('55') ? fone : '55' + fone; window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msgTexto)}`, '_blank') }
    else toast('Sem telefone no cadastro — mensagem só será registrada.', { icon: '⚠️' })
    try {
      await fetch('/api/salon/listas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem: { servico: label, mes, prof: msgProf.nome, total: totalDe(msgProf.id), media, texto: msgTexto } }) })
      toast.success('Mensagem registrada no relatório'); onMensagem()
    } catch { /* */ }
    setMsgProf(null)
  }

  async function imprimir() {
    const logoSalao = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const head = doc.colunas.map(c => `<th>${esc(c.nome)}</th>`).join('')
    let body = ''
    for (let d = 1; d <= dias; d++) body += `<tr><td class="dia">${d}</td>${doc.colunas.map(c => `<td>${doc.cells[`${d}-${c.id}`] || ''}</td>`).join('')}</tr>`
    const tot = doc.colunas.map((c, i) => `<td><b>${totais[i]}</b></td>`).join('')
    const cab = logoSalao ? `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #5b4fcf;padding-bottom:8px;margin-bottom:10px"><img src="${logoSalao}" style="max-height:54px;max-width:190px;object-fit:contain"/><span style="font-size:10px;color:#777">${new Date().toLocaleDateString('pt-BR')}</span></div>` : ''
    const css = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px}h1{text-align:center;font-size:15px;margin-bottom:8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #f0ede6;text-align:center;padding:4px 5px}th{background:#f6f4ff;color:#5b4fcf;border-bottom:2px solid #5b4fcf;font-size:10px;text-transform:uppercase;letter-spacing:.3px}.dia{background:#faf9f7;color:#6b6860;font-weight:700}tfoot td{background:#f6f4ff;color:#5b4fcf;font-weight:800;border-top:2px solid #5b4fcf}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${esc(label)}</title><style>${css}</style></head><body>${cab}<h1>${esc(label.toUpperCase())} — ${esc(mes.split('-').reverse().join('/'))}</h1><table><thead><tr><th>DIA</th>${head}</tr></thead><tbody>${body}</tbody><tfoot><tr><td>TOT</td>${tot}</tr></tfoot></table><script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  const disponiveis = profsSalao.filter(p => !doc.colunas.some(c => c.id === p.id))

  return (
    <div>
      {/* Controles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: '#6b6860' }}>Mês:</label>
        <input type="month" value={mes} onChange={e => setMes(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13 }} />
        <div style={{ position: 'relative' }}>
          <button onClick={() => setAddOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Plus size={14} /> Adicionar profissional</button>
          {addOpen && (
            <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 30, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.15)', minWidth: 200, maxHeight: 260, overflowY: 'auto', padding: 6 }}>
              {disponiveis.length === 0 ? <div style={{ padding: 10, fontSize: 12, color: '#9ca3af' }}>Todos já adicionados.</div> :
                disponiveis.map(p => <button key={p.id} onClick={() => addProf(p)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, borderRadius: 6 }} onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{p.nome}{!p.telefone && <span style={{ color: '#f59e0b', fontSize: 10 }}> (sem tel)</span>}</button>)}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir</button>
        <button onClick={salvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: dirty ? '#16a34a' : '#a3b3a3', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar</>}</button>
      </div>

      <div style={{ fontSize: 12, color: '#6b6860', marginBottom: 10 }}>
        Clique em <strong style={{ color: '#16a34a' }}>+</strong> para somar um atendimento. O <span style={{ color: '#ef4444', fontWeight: 800 }}>🔴 É A VEZ</span> aponta quem tem menos atendimentos (rodízio justo, da esquerda p/ direita). Média do salão: <strong>{media}</strong>.
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div> :
        doc.colunas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14, background: '#fff', border: '1px dashed #d0cdc7', borderRadius: 12 }}>
            Adicione os profissionais desta lista no botão <strong>+ Adicionar profissional</strong> acima.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 8 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 120 + doc.colunas.length * 130 }}>
              <thead>
                <tr>
                  <th style={{ ...thSt, width: 44, position: 'sticky', left: 0, background: '#faf9f7', zIndex: 2 }}>DIA</th>
                  {doc.colunas.map((c, i) => (
                    <th key={c.id} style={{ ...thSt, background: proximoIdx === i ? '#fef2f2' : '#faf9f7', borderTop: proximoIdx === i ? '3px solid #ef4444' : undefined }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        {proximoIdx === i && <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', background: '#ef4444', borderRadius: 10, padding: '1px 7px' }}>🔴 É A VEZ</span>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontWeight: 800, fontSize: 13 }}>{c.nome}</span>
                          <button onClick={() => delProf(c.id)} title="Remover" style={{ border: 'none', background: 'transparent', color: '#cbb', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
                        </div>
                        <button onClick={() => abrirMsg(c)} title="Enviar WhatsApp" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, border: 'none', background: '#25D366', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}><MessageCircle size={11} /> WhatsApp</button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: dias }, (_, k) => k + 1).map(d => (
                  <tr key={d}>
                    <td style={{ ...tdSt, fontWeight: 700, background: '#faf9f7', color: '#6b6860', position: 'sticky', left: 0, zIndex: 1 }}>{d}</td>
                    {doc.colunas.map(c => {
                      const v = doc.cells[`${d}-${c.id}`] || 0
                      return (
                        <td key={c.id} style={tdSt}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {v > 0 && <button onClick={() => inc(d, c.id, -1)} style={miniBtn('#ef4444')}><Minus size={11} /></button>}
                            <span style={{ minWidth: 18, textAlign: 'center', fontWeight: v > 0 ? 800 : 400, color: v > 0 ? '#1a1a1a' : '#cbd5e1', fontSize: 14 }}>{v || ''}</span>
                            <button onClick={() => inc(d, c.id, 1)} title="Adicionar" style={miniBtn('#16a34a')}><Plus size={11} /></button>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ ...tdSt, fontWeight: 800, background: '#f6f4ff', color: '#5b4fcf', borderTop: '2px solid #e8e6e0', position: 'sticky', left: 0 }}>TOT</td>
                  {doc.colunas.map((c, i) => <td key={c.id} style={{ ...tdSt, fontWeight: 900, fontSize: 15, background: '#f6f4ff', color: '#5b4fcf', borderTop: '2px solid #e8e6e0' }}>{totais[i]}</td>)}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

      {/* ── Observações no fim da lista → Feedback do Profissional ── */}
      {!loading && (
        <div style={{ marginTop: 18, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a' }}>📝 Observações</span>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>— vão automaticamente para o Feedback do Profissional ao salvar</span>
          </div>
          <p style={{ fontSize: 11.5, color: '#6b6860', margin: '0 0 12px' }}>Escolha o profissional, descreva o ocorrido, marque Positivo ou Negativo e clique em salvar.</p>

          {obsList.map(o => {
            const travada = !!o.enviado && !o.editando
            return (
            <div key={o.id} style={{ border: o.enviado ? '1px solid #bbf7d0' : '1px solid #e8e6e0', background: o.editando ? '#fffbeb' : o.enviado ? '#f0fdf4' : '#faf9f7', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <select value={o.profissional_id} disabled={travada}
                  onChange={e => { const p = doc.colunas.find(x => x.id === e.target.value); updObs(o.id, { profissional_id: e.target.value, profissional_nome: p?.nome || '' }) }}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, fontWeight: 700, minWidth: 200, background: '#fff', cursor: travada ? 'default' : 'pointer' }}>
                  <option value="">Selecione o profissional...</option>
                  {/* dinâmico: só quem está NESTA lista (colunas acima) */}
                  {doc.colunas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  {/* se o selecionado saiu da lista, mantém visível para não perder o rascunho */}
                  {o.profissional_id && !doc.colunas.some(c => c.id === o.profissional_id) && <option value={o.profissional_id}>{o.profissional_nome}</option>}
                </select>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => updObs(o.id, { tipo: 'positivo' })} disabled={travada}
                    style={{ padding: '7px 12px', borderRadius: 8, border: o.tipo === 'positivo' ? 'none' : '1.5px solid #d0cdc7', background: o.tipo === 'positivo' ? '#16a34a' : '#fff', color: o.tipo === 'positivo' ? '#fff' : '#6b6860', fontSize: 12, fontWeight: 800, cursor: travada ? 'default' : 'pointer' }}>
                    👍 Positivo
                  </button>
                  <button onClick={() => updObs(o.id, { tipo: 'negativo' })} disabled={travada}
                    style={{ padding: '7px 12px', borderRadius: 8, border: o.tipo === 'negativo' ? 'none' : '1.5px solid #d0cdc7', background: o.tipo === 'negativo' ? '#ef4444' : '#fff', color: o.tipo === 'negativo' ? '#fff' : '#6b6860', fontSize: 12, fontWeight: 800, cursor: travada ? 'default' : 'pointer' }}>
                    👎 Negativo
                  </button>
                </div>
                <div style={{ flex: 1 }} />
                {!o.enviado && <button onClick={() => delObs(o.id)} title="Remover observação" style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: 4 }}><X size={15} /></button>}
                {travada && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a' }}>✓ Enviado {o.criado_em ? `· ${new Date(o.criado_em).toLocaleDateString('pt-BR')}` : ''}</span>
                    {o.feedback_id && (
                      <button onClick={() => editarObs(o.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                        ✏️ Editar
                      </button>
                    )}
                    <button onClick={() => excluirObs(o.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                      🗑️ Excluir
                    </button>
                  </span>
                )}
              </div>
              {travada
                ? <div style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '8px 10px', background: '#fff', border: '1px solid #e8e6e0', borderRadius: 8 }}>{o.texto}</div>
                : <textarea value={o.texto} onChange={e => updObs(o.id, { texto: e.target.value })} rows={3} placeholder="Descreva o que aconteceu..."
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} />}
              {o.editando && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => salvarEdicaoObs(o.id)} disabled={salvandoObs} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
                    {salvandoObs ? '...' : <><Save size={13} /> Salvar alterações</>}
                  </button>
                  <button onClick={() => cancelarEdicaoObs(o.id)} style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>
            )
          })}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <button onClick={addObs} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 8, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
              <Plus size={14} /> Nova observação
            </button>
            {obsList.some(o => !o.enviado) && (
              <button onClick={salvarObs} disabled={salvandoObs} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                {salvandoObs ? '...' : <><Send size={14} /> Salvar e enviar ao feedback</>}
              </button>
            )}
          </div>
        </div>
      )}

      {msgProf && (
        <div onClick={() => setMsgProf(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>💬 Mensagem para {msgProf.nome}</h3>
              <button onClick={() => setMsgProf(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <textarea value={msgTexto} onChange={e => setMsgTexto(e.target.value)} rows={8} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #d0cdc7', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, marginBottom: 8 }} />
            {!msgProf.telefone && <p style={{ fontSize: 11, color: '#ef4444', margin: '0 0 8px' }}>⚠️ Sem telefone — será só registrada no relatório.</p>}
            <button onClick={enviarMsg} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Send size={16} /> Enviar e registrar</button>
          </div>
        </div>
      )}
    </div>
  )
}

const thSt: React.CSSProperties = { borderBottom: '2px solid #e8e6e0', padding: '8px 8px', fontSize: 11, fontWeight: 700, color: '#6b6860', textTransform: 'uppercase', letterSpacing: '.4px', background: '#faf9f7' }
const tdSt: React.CSSProperties = { borderBottom: '1px solid #f0eee8', padding: '4px 6px', textAlign: 'center' }
function miniBtn(cor: string): React.CSSProperties { return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, border: 'none', background: cor, color: '#fff', cursor: 'pointer', flexShrink: 0 } }
