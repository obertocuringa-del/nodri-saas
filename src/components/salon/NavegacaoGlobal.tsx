'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Home, ArrowLeft, Search, Loader2, FileText, User, Layers, AlertTriangle } from 'lucide-react'
import { useIsMobile } from '@/lib/useIsMobile'
import { haNaoSalvo, nomesNaoSalvos } from '@/lib/guardaSalvar'

// ── Navegação global (todas as páginas do painel do salão) ──
// Canto inferior esquerdo: Voltar (histórico) · Início · Busca ultra inteligente.
// A busca junta o catálogo de páginas (local, instantâneo, com sinônimos e
// match por prefixo — não precisa digitar a palavra inteira) com a API
// /api/salon/busca (conteúdo salvo, serviços e profissionais).

interface PaginaCat { rota: string; label: string; grupo: string; chave: string | null; palavras: string }
interface ResultadoApi { tipo: string; titulo: string; trecho: string; rota: string }

const CATALOGO: PaginaCat[] = [
  { rota: '/salon', label: 'INÍCIO', grupo: 'Página', chave: null, palavras: 'home painel principal dashboard' },
  { rota: '/salon/profissionais', label: 'PROFISSIONAIS', grupo: 'Página', chave: 'profissionais', palavras: 'equipe funcionario colaborador cadastro time' },
  { rota: '/salon/profissionais?secao=carreira', label: 'PLANO DE CARREIRA', grupo: 'Profissionais', chave: 'profissionais', palavras: 'niveis crescimento promocao assistente junior pleno senior mestre' },
  { rota: '/salon/profissionais?secao=ranking', label: 'RANKING DE AVALIAÇÕES', grupo: 'Profissionais', chave: 'profissionais', palavras: 'avaliacao 360 notas classificacao' },
  { rota: '/salon/profissionais?secao=entrevista', label: 'FICHA PARA ENTREVISTA', grupo: 'Profissionais', chave: 'profissionais', palavras: 'contratar perguntas guia' },
  { rota: '/salon/profissionais?secao=clt', label: 'CLT', grupo: 'Profissionais', chave: 'profissionais', palavras: 'carteira assinada ferias exame admissional' },
  { rota: '/salon/profissionais?secao=cnpj', label: 'CNPJ', grupo: 'Profissionais', chave: 'profissionais', palavras: 'mei pj contrato chancela' },
  { rota: '/salon/servicos', label: 'SERVIÇOS DO SALÃO', grupo: 'Página', chave: 'servicos', palavras: 'preco valor corte mechas pacote habilitar' },
  { rota: '/salon/lista-espera', label: 'LISTA DE ESPERA', grupo: 'Página', chave: 'lista_espera', palavras: 'encaixe horario aguardando fila' },
  { rota: '/salon/aniversariantes', label: 'ANIVERSARIANTES DO MÊS', grupo: 'Página', chave: 'aniversariantes', palavras: 'aniversario bolo parabens datas' },
  { rota: '/salon/pendencias', label: 'PENDÊNCIAS', grupo: 'Página', chave: 'pendencias', palavras: 'tarefas pendente resolver cobranca' },
  { rota: '/salon/feedback', label: 'FEEDBACK DE CLIENTE', grupo: 'Página', chave: 'feedback_cliente', palavras: 'pesquisa satisfacao nps opiniao formulario' },
  { rota: '/salon/feedback-profissional', label: 'FEEDBACK PROFISSIONAL', grupo: 'Página', chave: 'feedback_prof', palavras: 'ocorrencia positivo negativo advertencia' },
  { rota: '/salon/relatorios', label: 'RELATÓRIOS', grupo: 'Página', chave: 'relatorios', palavras: 'faturamento graficos metas ticket medio kpi resultado' },
  { rota: '/salon/calculadora-custo', label: 'CALCULADORA DE CUSTO', grupo: 'Página', chave: 'calculadora', palavras: 'custo preco calculo margem lucro' },
  { rota: '/salon/academia', label: 'ACADEMIA', grupo: 'Página', chave: 'academia', palavras: 'cursos treinamento aulas videos capacitacao' },
  { rota: '/salon/checklist', label: 'CHECK LIST DIÁRIO', grupo: 'Página', chave: 'checklist', palavras: 'demandas tarefas gerente dosagem abertura fechamento coordenado' },
  { rota: '/salon/calendario', label: 'CALENDÁRIO', grupo: 'Página', chave: 'calendario', palavras: 'agenda datas eventos lembrete' },
  { rota: '/salon/calendario-mkt', label: 'CALENDÁRIO DE MARKETING', grupo: 'Página', chave: 'calendario_mkt', palavras: 'mkt posts redes sociais divulgacao' },
  { rota: '/salon/consultoria', label: 'CONSULTORIA IA', grupo: 'Página', chave: 'ia', palavras: 'inteligencia artificial chat assistente pergunta' },
  { rota: '/salon/lojistas', label: 'LOJISTAS (PARCERIAS)', grupo: 'Página', chave: 'lojistas', palavras: 'crm parceiros revenda cadastro loja' },
  { rota: '/salon/checkprocon', label: 'CHECK PROCON', grupo: 'Página', chave: 'checkprocon', palavras: 'consumidor codigo defesa direito lista' },
  { rota: '/salon/usuarios', label: 'USUÁRIOS E PERMISSÕES', grupo: 'Página', chave: 'usuarios', palavras: 'sub login acesso senha liberar ocultar' },
  { rota: '/salon/auditoria', label: 'LOG DE AUDITORIA', grupo: 'Página', chave: 'auditoria', palavras: 'historico quem alterou registro seguranca' },
  { rota: '/salon/perfil', label: 'MEU PERFIL', grupo: 'Página', chave: null, palavras: 'logo salao conta dados' },
  { rota: '/salon/notificacoes', label: 'NOTIFICAÇÕES', grupo: 'Página', chave: null, palavras: 'avisos alertas sino' },
  // ── Salão Administrativo (ferramentas) ──
  { rota: '/salon/administrativo?aba=listas&lista=realinhamento', label: 'LISTA DE REALINHAMENTO', grupo: 'Administrativo', chave: 'adm_listas', palavras: 'rodizio contagem progressiva' },
  { rota: '/salon/administrativo?aba=listas&lista=corte', label: 'LISTA DE CORTE', grupo: 'Administrativo', chave: 'adm_listas', palavras: 'rodizio contagem cabelo' },
  { rota: '/salon/administrativo?aba=listas&lista=mechas', label: 'LISTA DE MECHAS', grupo: 'Administrativo', chave: 'adm_listas', palavras: 'rodizio contagem luzes' },
  { rota: '/salon/administrativo?aba=listas&lista=pigmentacao', label: 'LISTA DE PIGMENTAÇÃO', grupo: 'Administrativo', chave: 'adm_listas', palavras: 'rodizio contagem cor' },
  { rota: '/salon/administrativo?aba=listas&lista=bebidas', label: 'BEBIDAS', grupo: 'Administrativo', chave: 'adm_listas', palavras: 'cafe agua capuccino consumo' },
  { rota: '/salon/administrativo?aba=listas&lista=produtos', label: 'CONSUMO DE PRODUTOS', grupo: 'Administrativo', chave: 'adm_listas', palavras: 'gasto uso produto' },
  { rota: '/salon/administrativo?aba=listas&lista=servinterno', label: 'SERVIÇOS INTERNOS', grupo: 'Administrativo', chave: 'adm_listas', palavras: 'interno lancamento' },
  { rota: '/salon/administrativo?aba=servicos_valores', label: 'SERVIÇOS INTERNOS (VALORES)', grupo: 'Administrativo', chave: 'adm_servicos_valores', palavras: 'preco tabela valores' },
  { rota: '/salon/administrativo?aba=tratamentos', label: 'TRATAMENTOS DOSAGEM', grupo: 'Administrativo', chave: 'adm_tratamentos', palavras: 'preco tinta quimica' },
  { rota: '/salon/administrativo?aba=pacotes', label: 'PREÇO DE PACOTES', grupo: 'Administrativo', chave: 'adm_pacotes', palavras: 'tabela valores sessoes' },
  { rota: '/salon/administrativo?aba=valores_pacotes', label: 'VALORES DE PACOTES', grupo: 'Administrativo', chave: 'adm_valores_pacotes', palavras: 'massagem terapia capilar sessoes pdf compartilhar' },
  { rota: '/salon/administrativo?aba=tabela_precos', label: 'TABELA DE PREÇO ATUALIZADA', grupo: 'Administrativo', chave: 'adm_tabela_precos', palavras: 'marcas arquivos anexo' },
  { rota: '/salon/administrativo?aba=esterilizacao', label: 'ESTERILIZAÇÃO', grupo: 'Administrativo', chave: 'adm_esterilizacao', palavras: 'alicates autoclave limpeza' },
  { rota: '/salon/administrativo?aba=kits', label: 'KITS PÉ E MÃO', grupo: 'Administrativo', chave: 'adm_kits', palavras: 'manicure pedicure separar' },
  { rota: '/salon/administrativo?aba=enxovais', label: 'CONTROLE DE ENXOVAIS', grupo: 'Administrativo', chave: 'adm_enxovais', palavras: 'toalhas lavanderia estoque visita' },
  { rota: '/salon/administrativo?aba=cadastrar_produto', label: 'CADASTRAR PRODUTO', grupo: 'Administrativo', chave: 'adm_cadastrar_produto', palavras: 'novo produto validade fornecedor' },
  { rota: '/salon/administrativo?aba=etiquetas', label: 'ETIQUETAS', grupo: 'Administrativo', chave: 'adm_etiquetas', palavras: 'imprimir identificacao' },
  { rota: '/salon/administrativo?aba=correios', label: 'CORREIOS', grupo: 'Administrativo', chave: 'adm_correios', palavras: 'encomenda rastreio carta sedex' },
  { rota: '/salon/administrativo?aba=escala', label: 'ESCALA DE TRABALHO', grupo: 'Administrativo', chave: 'adm_escala', palavras: 'domingo folga horario clt pj mensal' },
  { rota: '/salon/administrativo?aba=feriados', label: 'ESCALA DE FERIADOS', grupo: 'Administrativo', chave: 'adm_feriados', palavras: 'natal ano novo carnaval escalados' },
  { rota: '/salon/administrativo?aba=ata', label: 'ATA DE REUNIÃO', grupo: 'Administrativo', chave: 'adm_ata', palavras: 'reuniao registro decisoes' },
  { rota: '/salon/administrativo?aba=desconto_profissional', label: 'DESCONTO PROFISSIONAL', grupo: 'Administrativo', chave: 'adm_desconto_profissional', palavras: 'parcelas rateio desconto' },
  { rota: '/salon/administrativo?aba=corrida_interna', label: 'CORRIDA INTERNA', grupo: 'Administrativo', chave: 'adm_corrida_interna', palavras: 'meta competicao pontos' },
  { rota: '/salon/administrativo?aba=acoes_comerciais', label: 'AÇÕES COMERCIAIS', grupo: 'Administrativo', chave: 'adm_acoes_comerciais', palavras: 'campanha promocao venda' },
  { rota: '/salon/administrativo?aba=pop', label: 'POP (PROCEDIMENTOS)', grupo: 'Administrativo', chave: 'adm_pop', palavras: 'padrao operacao cafe manual' },
  { rota: '/salon/administrativo?aba=senhas', label: 'SENHAS', grupo: 'Administrativo', chave: 'adm_senhas', palavras: 'acesso login pix wifi conta' },
  { rota: '/salon/administrativo?aba=telefones', label: 'TELEFONES IMPORTANTES', grupo: 'Administrativo', chave: 'adm_telefones', palavras: 'contato numero whatsapp fornecedor' },
  { rota: '/salon/administrativo?aba=arquivos_envio', label: 'ARQUIVOS PARA ENVIO', grupo: 'Administrativo', chave: 'adm_arquivos_envio', palavras: 'anexo documento enviar' },
]

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Match inteligente: cada palavra digitada precisa "encaixar" no começo de
// alguma palavra do alvo OU aparecer dentro do texto. Pontua para ordenar.
function pontuar(q: string, alvo: string): number {
  const alvoN = norm(alvo)
  const palavrasAlvo = alvoN.split(/[\s()/-]+/).filter(Boolean)
  const tokens = norm(q).split(/\s+/).filter(Boolean)
  if (!tokens.length) return 0
  let score = 0
  for (const t of tokens) {
    if (alvoN.startsWith(t)) { score += 30; continue }
    if (palavrasAlvo.some(p => p.startsWith(t))) { score += 20; continue }
    if (alvoN.includes(t)) { score += 8; continue }
    return 0 // token não encontrado → não é resultado
  }
  return score
}

const ATALHOS = ['/salon', '/salon/profissionais', '/salon/checklist', '/salon/relatorios', '/salon/administrativo?aba=escala', '/salon/administrativo?aba=senhas']

export default function NavegacaoGlobal() {
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [role, setRole] = useState<string | null>(null)
  const [perms, setPerms] = useState<string[] | null>(null)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [q, setQ] = useState('')
  const [apiRes, setApiRes] = useState<ResultadoApi[]>([])
  const [apiLoading, setApiLoading] = useState(false)
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      setRole(d?.role || null)
      setPerms(d?.role === 'sub' && Array.isArray(d.permissoes) ? d.permissoes : null)
    }).catch(() => {})
  }, [])

  // Atalho de teclado: Ctrl+K (ou Cmd+K) abre a busca em qualquer página.
  // O evento 'nodri-abrir-busca' permite outros componentes abrirem a busca
  // (ex.: o campo da página inicial).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setBuscaAberta(true) }
      if (e.key === 'Escape') setBuscaAberta(false)
    }
    const abrir = () => setBuscaAberta(true)
    window.addEventListener('keydown', h)
    window.addEventListener('nodri-abrir-busca', abrir)
    return () => { window.removeEventListener('keydown', h); window.removeEventListener('nodri-abrir-busca', abrir) }
  }, [])

  useEffect(() => { if (buscaAberta) { setQ(''); setApiRes([]); setSel(0); setTimeout(() => inputRef.current?.focus(), 50) } }, [buscaAberta])

  const pode = useCallback((chave: string | null) => {
    if (chave === null) return true
    if (perms === null) return true
    return perms.includes(chave)
  }, [perms])

  // Páginas: filtro local instantâneo com pontuação
  const paginas = useMemo(() => {
    const visiveis = CATALOGO.filter(p => pode(p.chave))
    if (!q.trim()) return visiveis.filter(p => ATALHOS.includes(p.rota))
    return visiveis
      .map(p => ({ p, s: pontuar(q, `${p.label} ${p.palavras}`) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map(x => x.p)
  }, [q, pode])

  // Conteúdo: API com debounce
  useEffect(() => {
    if (!buscaAberta) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const termo = q.trim()
    if (termo.length < 2) { setApiRes([]); setApiLoading(false); return }
    setApiLoading(true)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/salon/busca?q=${encodeURIComponent(termo)}`)
        .then(r => r.ok ? r.json() : [])
        .then(d => { setApiRes(Array.isArray(d) ? d.slice(0, 12) : []); setApiLoading(false) })
        .catch(() => { setApiRes([]); setApiLoading(false) })
    }, 260)
  }, [q, buscaAberta])

  useEffect(() => { setSel(0) }, [q])

  const totalItens = paginas.length + apiRes.length

  // ── Guarda de salvamento: se há alterações não salvas, pergunta antes ──
  const [avisoSalvar, setAvisoSalvar] = useState<{ destino: () => void; onde: string[] } | null>(null)
  function navegarComGuarda(acao: () => void) {
    if (haNaoSalvo()) { setAvisoSalvar({ destino: acao, onde: nomesNaoSalvos() }); return }
    acao()
  }

  function irPara(rota: string) {
    setBuscaAberta(false)
    navegarComGuarda(() => {
      // Mesma página com outra aba (?aba=...): o Next não remonta o componente,
      // então recarrega de verdade para o link direto ser aplicado
      const alvoPath = rota.split('?')[0]
      if (alvoPath === pathname && rota.includes('?')) { window.location.href = rota; return }
      router.push(rota)
    })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, totalItens - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (sel < paginas.length) irPara(paginas[sel].rota)
      else if (apiRes[sel - paginas.length]) irPara(apiRes[sel - paginas.length].rota)
    }
  }

  // Portal do profissional não usa o painel do salão
  if (role === 'profissional') return null

  const naHome = pathname === '/salon'

  const pillSt: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
    padding: isMobile ? '6px 9px' : '6px 12px', borderRadius: 999,
    border: '1px solid #ddd9f2', background: '#fff', color: '#5b4fcf',
    fontSize: 12, fontWeight: 800, cursor: 'pointer',
    boxShadow: '0 1px 5px rgba(91,79,207,.12)', transition: 'background .12s',
  }

  return (
    <>
      {/* Conjunto global flutuante: fica NA MESMA LINHA da barra do topo de
          cada página (canto direito) — o CSS global reserva o espaço.
          Na página inicial não aparece (lá a busca fica no campo do painel). */}
      {!naHome && (
      <div style={{ position: 'fixed', top: 8, right: 10, zIndex: 45, display: 'flex', gap: 6 }}>
        <button onClick={() => navegarComGuarda(() => router.back())} aria-label="Voltar" title="Voltar à página anterior" style={pillSt}
          onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
          <ArrowLeft size={15} />
        </button>
        <button onClick={() => navegarComGuarda(() => router.push('/salon'))} aria-label="Ir para a página inicial" title="Início" style={pillSt}
          onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
          <Home size={15} />
        </button>
        <button onClick={() => setBuscaAberta(true)} aria-label="Buscar no sistema" title="Buscar em todo o sistema (Ctrl+K)"
          style={{ ...pillSt, color: '#8a859c', fontWeight: 600, minWidth: isMobile ? undefined : 210, justifyContent: 'flex-start' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f0eefb')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
          <Search size={15} color="#5b4fcf" />
          {!isMobile && <span style={{ flex: 1, textAlign: 'left' }}>Buscar no sistema...</span>}
          {!isMobile && <span style={{ fontSize: 10, color: '#b9b4d6', border: '1px solid #e5e1f5', borderRadius: 5, padding: '1px 6px' }}>Ctrl+K</span>}
        </button>
      </div>
      )}

      {/* Busca ultra inteligente (overlay) */}
      {buscaAberta && (
        <div onClick={() => setBuscaAberta(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,12,40,.55)', zIndex: 10000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '10vh 14px 14px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 620, boxShadow: '0 30px 80px rgba(0,0,0,.35)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #f0eee8' }}>
              <Search size={18} color="#5b4fcf" style={{ flexShrink: 0 }} />
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKeyDown}
                placeholder="Digite qualquer coisa: página, senha, telefone, escala, profissional..."
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15.5, fontWeight: 600, color: '#1a1a1a', background: 'transparent' }} />
              {apiLoading && <Loader2 size={16} className="animate-spin" style={{ color: '#9ca3af', flexShrink: 0 }} />}
              <span style={{ fontSize: 10.5, color: '#9ca3af', border: '1px solid #e8e6e0', borderRadius: 6, padding: '2px 7px', flexShrink: 0 }}>ESC fecha</span>
            </div>

            <div style={{ maxHeight: '58vh', overflowY: 'auto', padding: 8 }}>
              {paginas.length > 0 && (
                <>
                  <div style={{ fontSize: 10.5, fontWeight: 900, color: '#9ca3af', letterSpacing: '.6px', padding: '8px 12px 4px' }}>{q.trim() ? 'PÁGINAS E FERRAMENTAS' : 'ATALHOS RÁPIDOS'}</div>
                  {paginas.map((p, i) => (
                    <button key={p.rota} onClick={() => irPara(p.rota)} onMouseEnter={() => setSel(i)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderRadius: 10, background: sel === i ? '#f0eefb' : 'transparent', cursor: 'pointer' }}>
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: '#f0eefb', color: '#5b4fcf', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Layers size={14} /></span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: sel === i ? '#5b4fcf' : '#1a1a1a', letterSpacing: '.2px' }}>{p.label}</span>
                        <span style={{ display: 'block', fontSize: 11, color: '#9ca3af' }}>{p.grupo}</span>
                      </span>
                      <span style={{ fontSize: 10, color: '#c4c0f5', fontWeight: 800, flexShrink: 0 }}>ABRIR →</span>
                    </button>
                  ))}
                </>
              )}

              {apiRes.length > 0 && (
                <>
                  <div style={{ fontSize: 10.5, fontWeight: 900, color: '#9ca3af', letterSpacing: '.6px', padding: '10px 12px 4px' }}>ENCONTRADO NO CONTEÚDO</div>
                  {apiRes.map((r, i) => {
                    const idx = paginas.length + i
                    const Icone = r.tipo === 'Profissional' ? User : FileText
                    return (
                      <button key={i} onClick={() => irPara(r.rota)} onMouseEnter={() => setSel(idx)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', borderRadius: 10, background: sel === idx ? '#f0eefb' : 'transparent', cursor: 'pointer' }}>
                        <span style={{ width: 30, height: 30, borderRadius: 8, background: '#e1f5ee', color: '#0f6e56', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icone size={14} /></span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: sel === idx ? '#5b4fcf' : '#1a1a1a' }}>{r.titulo}</span>
                          <span style={{ display: 'block', fontSize: 11, color: '#6b6860', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.tipo}{r.trecho ? ` · ${r.trecho}` : ''}</span>
                        </span>
                      </button>
                    )
                  })}
                </>
              )}

              {q.trim().length >= 2 && !apiLoading && totalItens === 0 && (
                <div style={{ textAlign: 'center', padding: 26, color: '#9ca3af', fontSize: 13 }}>Nada encontrado para “{q}”. Tente outra palavra.</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 14, padding: '9px 18px', borderTop: '1px solid #f0eee8', fontSize: 10.5, color: '#9ca3af' }}>
              <span>↑↓ navegar</span><span>Enter abrir</span><span>Ctrl+K abre de qualquer página</span>
            </div>
          </div>
        </div>
      )}

      {/* Aviso "Deseja salvar?" — alterações não salvas antes de sair da página */}
      {avisoSalvar && (
        <div onClick={() => setAvisoSalvar(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,12,40,.55)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 430, padding: 22, boxShadow: '0 30px 80px rgba(0,0,0,.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: '#fff7ed', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><AlertTriangle size={19} /></span>
              <h3 style={{ fontSize: 15.5, fontWeight: 800, margin: 0, color: '#1a1a1a' }}>Você tem alterações não salvas!</h3>
            </div>
            <p style={{ fontSize: 13, color: '#6b6860', margin: '0 0 6px', lineHeight: 1.6 }}>
              {avisoSalvar.onde.length > 0 ? <>Em: <strong>{avisoSalvar.onde.join(', ')}</strong>. </> : null}
              Se sair agora, o que você mexeu será <strong style={{ color: '#dc2626' }}>perdido</strong>. Deseja salvar antes?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              <button onClick={() => setAvisoSalvar(null)}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                ✓ Sim — ficar na página e salvar
              </button>
              <button onClick={() => { const acao = avisoSalvar.destino; setAvisoSalvar(null); acao() }}
                style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1.5px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Não — sair sem salvar (perde as alterações)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
