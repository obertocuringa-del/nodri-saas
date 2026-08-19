'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useGuardaSalvar } from '@/lib/guardaSalvar'

// ─────────────────────────────────────────────────────────────────────────────
// EMISSÃO EM LOTE DAS GUIAS DO MEI (DAS) — tela CNPJ dos Profissionais
//
// O NODRI não fala com a Receita. Ele monta a FILA (quem emitir, com que
// configuração) e entrega para a extensão do Chrome, que dirige o PGMEI na
// máquina do usuário, com a sessão dele. Se a extensão não estiver instalada,
// nada acontece além de um aviso — o botão "Emitir Guia do MEI" individual de
// cada card continua funcionando exatamente como antes.
//
// Comunicação: window.postMessage → content script da extensão → service worker.
// Não usa o id da extensão, então instalar/atualizar não exige mexer no código.
// ─────────────────────────────────────────────────────────────────────────────

export const URL_PGMEI_PADRAO =
  'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao'

const CHAVE_CFG = 'emissao_guias_mei'
const CHAVE_HIST = 'emissao_guias_mei_hist'

export interface ProfGuia {
  id: string
  nome_completo?: string
  apelido?: string
  cnpj?: string
  cnpj_status?: string
}

interface Config {
  url: string
  anos: number            // 1 = só o ano atual, 2 = atual + anterior, 3 = atual + 2 anteriores
  pagamentoModo: 'dia_fixo' | 'hoje'
  pagamentoDia: number
  guia: 'consolidada' | 'mensal'
  incluir: 'vencidos_e_mes' | 'so_vencidos' | 'todos'
  nomeArquivo: string
  pasta: string
  intervalo: number       // segundos entre um profissional e outro
  confirmar: boolean      // conferir os meses marcados antes de gerar
}

const CFG_PADRAO: Config = {
  url: URL_PGMEI_PADRAO,
  anos: 1,
  pagamentoModo: 'dia_fixo',
  pagamentoDia: 20,
  guia: 'consolidada',
  incluir: 'vencidos_e_mes',
  nomeArquivo: '{nome} - {mes}-{ano}.pdf',
  pasta: 'Guias MEI/{ano}-{mes}',
  intervalo: 3,
  confirmar: true,
}

// Só aceita endereço dentro do domínio da Receita. A extensão vai DIGITAR os
// CNPJs dos profissionais nessa página — deixar o campo totalmente livre viraria
// um caminho para vazar os dados caso alguém colasse um endereço falso aqui.
export function urlDaReceita(u: string): boolean {
  try {
    const x = new URL(u)
    return x.protocol === 'https:' && /(^|\.)receita\.fazenda\.gov\.br$/.test(x.hostname)
  } catch { return false }
}

type EtapaFila = 'espera' | 'andando' | 'captcha' | 'ok' | 'erro' | 'pulado'

interface ItemFila {
  id: string
  nome: string
  cnpj: string
  etapa: EtapaFila
  msg?: string
  periodos?: string[]
  valor?: string
  vencimento?: string
  arquivo?: string
}

function soDigitos(s: string) { return String(s || '').replace(/\D/g, '') }

export default function EmissaoGuiasMEI({ profissionais }: { profissionais: ProfGuia[] }) {
  const [ehDono, setEhDono] = useState(false)
  const [cfg, setCfg] = useState<Config>(CFG_PADRAO)
  const [cfgSalva, setCfgSalva] = useState<Config>(CFG_PADRAO)
  const [painel, setPainel] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [fila, setFila] = useState<ItemFila[]>([])
  const [filaAberta, setFilaAberta] = useState(false)
  const [rodando, setRodando] = useState(false)
  const [extStatus, setExtStatus] = useState<'checando' | 'ok' | 'ausente'>('checando')
  const [extVersao, setExtVersao] = useState('')
  const [linkExtensao, setLinkExtensao] = useState('')
  const filaRef = useRef<ItemFila[]>([])

  const dirty = JSON.stringify(cfg) !== JSON.stringify(cfgSalva)
  useGuardaSalvar(dirty && painel, 'Configuração da emissão de guias')

  // ── Quem entra na fila: status OK/Ativo e com CNPJ preenchido ──
  const elegiveis = profissionais.filter(p => {
    const st = p.cnpj_status ?? (p.cnpj ? 'ok' : 'pendente')
    return st === 'ok' && soDigitos(p.cnpj || '').length === 14
  })

  // Link do .zip da extensão, publicado pelo admin (Programa Complementar)
  useEffect(() => {
    fetch('/api/config/programa').then(r => r.ok ? r.json() : null)
      .then(d => setLinkExtensao(String(d?.link_extensao || '')))
      .catch(() => { })
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null)
      .then(d => setEhDono(d?.role === 'salon' || d?.user?.role === 'salon'))
      .catch(() => { })
  }, [])

  useEffect(() => {
    fetch(`/api/salon/grid?chave=${CHAVE_CFG}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && typeof d === 'object') {
          const c = { ...CFG_PADRAO, ...d } as Config
          if (!urlDaReceita(c.url)) c.url = URL_PGMEI_PADRAO
          setCfg(c); setCfgSalva(c)
        }
      })
      .catch(() => { })
  }, [])

  // ── Handshake com a extensão ──
  const pingar = useCallback(() => {
    setExtStatus('checando')
    let respondeu = false
    const ouvir = (ev: MessageEvent) => {
      if (ev.source !== window) return
      const d = ev.data
      if (d?.fonte === 'nodri-guias-ext' && d?.tipo === 'pong') {
        respondeu = true
        setExtVersao(String(d.versao || ''))
        setExtStatus('ok')
      }
    }
    window.addEventListener('message', ouvir)
    window.postMessage({ fonte: 'nodri-guias', tipo: 'ping' }, window.location.origin)
    setTimeout(() => {
      window.removeEventListener('message', ouvir)
      if (!respondeu) setExtStatus('ausente')
    }, 1200)
  }, [])

  useEffect(() => { pingar() }, [pingar])

  // ── Mensagens vindas da extensão durante a execução ──
  useEffect(() => {
    const ouvir = (ev: MessageEvent) => {
      if (ev.source !== window) return
      const d = ev.data
      if (d?.fonte !== 'nodri-guias-ext') return

      if (d.tipo === 'progresso') {
        setFila(prev => {
          const nova = prev.map(it => it.id === d.profId ? { ...it, etapa: (d.etapa || 'andando') as EtapaFila, msg: d.msg } : it)
          filaRef.current = nova
          return nova
        })
      }

      if (d.tipo === 'resultado') {
        setFila(prev => {
          const nova = prev.map(it => it.id === d.profId ? {
            ...it,
            etapa: (d.ok ? 'ok' : (d.pulado ? 'pulado' : 'erro')) as EtapaFila,
            msg: d.msg || d.erro || '',
            periodos: d.periodos, valor: d.valor, vencimento: d.vencimento, arquivo: d.arquivo,
          } : it)
          filaRef.current = nova
          return nova
        })
        if (d.ok) registrarHistorico(d)
      }

      if (d.tipo === 'fim') {
        setRodando(false)
        const okN = filaRef.current.filter(i => i.etapa === 'ok').length
        const erroN = filaRef.current.filter(i => i.etapa === 'erro').length
        if (erroN === 0) toast.success(`Emissão concluída — ${okN} guia(s) baixada(s).`)
        else toast(`Emissão concluída — ${okN} ok, ${erroN} com problema.`, { icon: '⚠️' })
      }
    }
    window.addEventListener('message', ouvir)
    return () => window.removeEventListener('message', ouvir)
  }, [])

  // Grava o que foi emitido. Tolerante: se falhar, a guia já está no computador,
  // então só avisa no console — não atrapalha a fila.
  async function registrarHistorico(d: any) {
    try {
      const atual = await fetch(`/api/salon/grid?chave=${CHAVE_HIST}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null).catch(() => null)
      const doc = (atual && typeof atual === 'object') ? atual : {}
      const lista = Array.isArray((doc as any).registros) ? (doc as any).registros : []
      lista.unshift({
        profId: d.profId, nome: d.nome, cnpj: d.cnpj,
        periodos: d.periodos || [], valor: d.valor || '', vencimento: d.vencimento || '',
        arquivo: d.arquivo || '', em: new Date().toISOString(),
      })
      await fetch('/api/salon/grid', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: CHAVE_HIST, doc: { registros: lista.slice(0, 400) } }),
      })
    } catch (e) { console.warn('[NODRI] histórico da guia não gravado:', e) }
  }

  async function salvarCfg() {
    if (!urlDaReceita(cfg.url)) {
      toast.error('O endereço precisa ser do domínio receita.fazenda.gov.br')
      return
    }
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: CHAVE_CFG, doc: cfg }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Falha ao salvar')
      setCfgSalva(cfg)
      toast.success('Configuração salva!')
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar')
    } finally { setSalvando(false) }
  }

  function abrirFila() {
    if (elegiveis.length === 0) {
      toast.error('Nenhum profissional com status OK/Ativo e CNPJ preenchido.')
      return
    }
    const nova: ItemFila[] = elegiveis.map(p => ({
      id: p.id,
      nome: p.nome_completo || p.apelido || '—',
      cnpj: p.cnpj || '',
      etapa: 'espera',
    }))
    setFila(nova); filaRef.current = nova
    setFilaAberta(true)
    pingar()
  }

  function iniciar() {
    if (extStatus !== 'ok') { toast.error('Extensão do Chrome não encontrada.'); return }
    if (dirty) { toast.error('Salve a configuração antes de emitir.'); return }
    setRodando(true)
    const zerada = filaRef.current.map(i => ({ ...i, etapa: 'espera' as EtapaFila, msg: '' }))
    setFila(zerada); filaRef.current = zerada
    window.postMessage({
      fonte: 'nodri-guias', tipo: 'iniciar',
      config: cfg,
      fila: zerada.map(i => ({ id: i.id, nome: i.nome, cnpj: soDigitos(i.cnpj) })),
    }, window.location.origin)
  }

  function cancelar() {
    window.postMessage({ fonte: 'nodri-guias', tipo: 'cancelar' }, window.location.origin)
    setRodando(false)
  }

  // ── estilos locais (mesma linguagem visual da tela) ──
  const btn = (bg: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
    border: 'none', background: bg, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  })
  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13,
  }
  const lbl: React.CSSProperties = { fontSize: 11, color: '#6b6860', display: 'block', marginBottom: 3, fontWeight: 600 }

  const corEtapa: Record<EtapaFila, string> = {
    espera: '#9ca3af', andando: '#5b4fcf', captcha: '#d97706', ok: '#16a34a', erro: '#dc2626', pulado: '#6b7280',
  }
  const rotuloEtapa: Record<EtapaFila, string> = {
    espera: 'Na fila', andando: 'Processando…', captcha: '⚠️ Resolva o captcha na aba do PGMEI',
    ok: '✅ Baixada', erro: '❌ Falhou', pulado: '— Sem valor em aberto',
  }

  return (
    <>
      <button onClick={() => setPainel(v => !v)} style={{ ...btn('#fff'), color: '#5b4fcf', border: '1px solid #d0cdc7' }}>
        ⚙️ Configurar emissão
      </button>
      <button onClick={abrirFila} style={btn('#0ea5e9')}>
        📄 Emitir todas as guias
      </button>
      {/* Sempre visível quando o admin cadastrou o link — mesmo lugar e mesmo
          papel do "Baixar Programa" da tela inicial. Muda de cor conforme o
          estado: âmbar chamando atenção quando falta instalar, discreto (o roxo
          do sistema) quando já está instalada e o botão é só para reinstalar
          noutra máquina ou pegar uma versão nova. */}
      {linkExtensao && (
        <a href={linkExtensao} target="_blank" rel="noopener noreferrer"
          title={extStatus === 'ausente'
            ? 'A emissão em lote precisa da extensão do Chrome instalada neste navegador'
            : 'Extensão já instalada — baixe se precisar instalar em outro computador ou atualizar'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
            ...(extStatus === 'ausente'
              ? { background: '#f59e0b', border: '1px solid #f59e0b', color: '#fff' }
              : { background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', color: '#5b4fcf' }),
          }}>
          ⬇️ Baixar extensão
        </a>
      )}

      {/* ── PAINEL DE CONFIGURAÇÃO ── */}
      {painel && (
        <div style={{ flexBasis: '100%', marginTop: 12, background: '#fff', border: '1px solid #e8e6e0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>Configuração da emissão em lote</div>
          <p style={{ fontSize: 12, color: '#6b6860', margin: '0 0 14px' }}>
            Vale para este salão. Entram na fila apenas os profissionais com status <strong>OK / Ativo</strong> e CNPJ preenchido
            — hoje são <strong>{elegiveis.length}</strong> de {profissionais.length}.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={lbl}>Data de pagamento do DAS</label>
              <select value={cfg.pagamentoModo} onChange={e => setCfg({ ...cfg, pagamentoModo: e.target.value as Config['pagamentoModo'] })} style={inp}>
                <option value="dia_fixo">Dia fixo do mês</option>
                <option value="hoje">Sempre a data de hoje</option>
              </select>
            </div>
            {cfg.pagamentoModo === 'dia_fixo' && (
              <div>
                <label style={lbl}>Dia do mês</label>
                <input type="number" min={1} max={31} value={cfg.pagamentoDia}
                  onChange={e => setCfg({ ...cfg, pagamentoDia: Math.min(31, Math.max(1, Number(e.target.value) || 20)) })} style={inp} />
              </div>
            )}
            <div>
              <label style={lbl}>Anos a verificar</label>
              <select value={cfg.anos} onChange={e => setCfg({ ...cfg, anos: Number(e.target.value) })} style={inp}>
                <option value={1}>Só o ano atual</option>
                <option value={2}>Ano atual + anterior</option>
                <option value={3}>Ano atual + 2 anteriores</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Quais meses emitir</label>
              <select value={cfg.incluir} onChange={e => setCfg({ ...cfg, incluir: e.target.value as Config['incluir'] })} style={inp}>
                <option value="vencidos_e_mes">Atrasados + o que vence neste mês (recomendado)</option>
                <option value="so_vencidos">Somente os já vencidos</option>
                <option value="todos">Todos em aberto, inclusive futuros (adianta o ano)</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Tipo de guia</label>
              <select value={cfg.guia} onChange={e => setCfg({ ...cfg, guia: e.target.value as Config['guia'] })} style={inp}>
                <option value="consolidada">Consolidada (1 PDF com os meses em aberto)</option>
                <option value="mensal">Uma guia por mês</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Nome do arquivo</label>
              <input value={cfg.nomeArquivo} onChange={e => setCfg({ ...cfg, nomeArquivo: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>Pasta (dentro de Downloads)</label>
              <input value={cfg.pasta} onChange={e => setCfg({ ...cfg, pasta: e.target.value })} style={inp} />
            </div>
            <div>
              <label style={lbl}>Intervalo entre profissionais (segundos)</label>
              <input type="number" min={0} max={60} value={cfg.intervalo}
                onChange={e => setCfg({ ...cfg, intervalo: Math.min(60, Math.max(0, Number(e.target.value) || 0)) })} style={inp} />
            </div>
          </div>

          <p style={{ fontSize: 11, color: '#9ca3af', margin: '8px 0 0' }}>
            Marcadores aceitos em nome e pasta: <code>{'{nome}'}</code> <code>{'{cnpj}'}</code> <code>{'{mes}'}</code> <code>{'{ano}'}</code>
          </p>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, padding: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={cfg.confirmar} onChange={e => setCfg({ ...cfg, confirmar: e.target.checked })} style={{ marginTop: 2 }} />
            <span style={{ fontSize: 12, color: '#92400e' }}>
              <strong>Conferir os meses marcados antes de gerar cada guia.</strong><br />
              Deixe ligado nas primeiras vezes: você vê na aba do PGMEI quais meses foram marcados e confirma.
              Depois de conferir que está marcando certo, desligue e a emissão fica 100% automática.
            </span>
          </label>

          {ehDono && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed #e0ddd8' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#6b6860', marginBottom: 6 }}>Avançado</div>
              <label style={lbl}>Endereço do PGMEI (se a Receita mudar o link, atualize aqui)</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input value={cfg.url} onChange={e => setCfg({ ...cfg, url: e.target.value })}
                  style={{ ...inp, flex: '1 1 320px', borderColor: urlDaReceita(cfg.url) ? '#d0cdc7' : '#fca5a5' }} />
                <button onClick={() => { if (urlDaReceita(cfg.url)) window.open(cfg.url, '_blank', 'noopener') ; else toast.error('Endereço inválido') }}
                  style={{ ...btn('#fff'), color: '#5b4fcf', border: '1px solid #d0cdc7' }}>Testar ↗</button>
                <button onClick={() => setCfg({ ...cfg, url: URL_PGMEI_PADRAO })}
                  style={{ ...btn('#fff'), color: '#6b6860', border: '1px solid #d0cdc7' }}>Restaurar padrão</button>
              </div>
              {!urlDaReceita(cfg.url) && (
                <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                  Só é aceito endereço https dentro de <strong>receita.fazenda.gov.br</strong>.
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
            {dirty && <span style={{ fontSize: 12, color: '#b45309' }}>Alterações não salvas</span>}
            <button onClick={() => { setCfg(cfgSalva); setPainel(false) }} style={{ ...btn('#fff'), color: '#6b6860', border: '1px solid #d0cdc7' }}>Fechar</button>
            <button onClick={salvarCfg} disabled={salvando || !dirty} style={{ ...btn('#5b4fcf'), opacity: (salvando || !dirty) ? 0.5 : 1 }}>
              {salvando ? 'Salvando…' : '💾 Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* ── FILA DE EMISSÃO ── */}
      {filaAberta && (
        <div onClick={() => { if (!rodando) setFilaAberta(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 780, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #ece9e2' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>Emitir guias do MEI</div>
              <div style={{ fontSize: 12, color: '#6b6860', marginTop: 2 }}>
                {fila.length} profissional(is) na fila · guias vão para <code>Downloads/{cfg.pasta}</code>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {extStatus === 'ausente' && (
              <div style={{ margin: '0 0 14px', padding: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 12, color: '#78350f' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e', marginBottom: 2 }}>
                  Falta instalar a extensão neste navegador
                </div>
                <p style={{ margin: '0 0 12px', lineHeight: 1.5 }}>
                  A emissão em lote precisa da extensão <strong>NODRI — Emissão de Guias do MEI</strong>.
                  É uma vez só, neste computador. Leva cerca de 1 minuto:
                </p>

                <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <li>
                    <strong>Baixe o arquivo da extensão.</strong>
                    <div style={{ marginTop: 5 }}>
                      {linkExtensao
                        ? <a href={linkExtensao} target="_blank" rel="noopener noreferrer" style={{ ...btn('#f59e0b'), textDecoration: 'none' }}>⬇️ Baixar extensão (.zip)</a>
                        : <span style={{ color: '#b45309' }}>O link ainda não foi cadastrado. Peça ao suporte do NODRI o arquivo <code>extensao-guias-mei.zip</code>.</span>}
                    </div>
                  </li>

                  <li>
                    <strong>Descompacte o .zip.</strong>
                    <div style={{ color: '#92400e', marginTop: 3, lineHeight: 1.5 }}>
                      Na pasta Downloads, clique com o botão direito no arquivo → <em>Extrair tudo</em> → <em>Extrair</em>.
                      Vai virar uma pasta chamada <code>extensao-guias-mei</code>.
                      <br /><strong>Não apague essa pasta depois</strong> — o Chrome lê a extensão dela o tempo todo.
                      Guarde num lugar fixo (ex.: <code>Documentos</code>).
                    </div>
                  </li>

                  <li>
                    <strong>Abra a página de extensões do Chrome.</strong>
                    <div style={{ color: '#92400e', marginTop: 3, lineHeight: 1.5 }}>
                      Por segurança o Chrome não deixa um site abrir essa página — copie o endereço abaixo,
                      cole numa aba nova e aperte Enter.
                    </div>
                    <div style={{ marginTop: 5, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <code style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 6, padding: '5px 10px', fontSize: 12 }}>chrome://extensions</code>
                      <button
                        onClick={() => {
                          try { navigator.clipboard.writeText('chrome://extensions') } catch { /* sem permissão de área de transferência */ }
                          toast.success('Endereço copiado! Cole numa aba nova.')
                        }}
                        style={{ ...btn('#fff'), color: '#92400e', border: '1px solid #fbbf24' }}>📋 Copiar</button>
                    </div>
                  </li>

                  <li>
                    <strong>Ligue o “Modo do desenvolvedor”.</strong>
                    <div style={{ color: '#92400e', marginTop: 3 }}>É a chavinha no canto <em>superior direito</em> dessa página.</div>
                  </li>

                  <li>
                    <strong>Clique em “Carregar sem compactação”.</strong>
                    <div style={{ color: '#92400e', marginTop: 3 }}>
                      O botão aparece no canto superior esquerdo depois que você liga o modo do desenvolvedor.
                      Escolha a pasta <code>extensao-guias-mei</code> que você descompactou no passo 2 e confirme.
                    </div>
                  </li>

                  <li>
                    <strong>Volte aqui e confira.</strong>
                    <div style={{ marginTop: 5 }}>
                      <button onClick={pingar} style={btn('#16a34a')}>🔄 Verificar de novo</button>
                    </div>
                  </li>
                </ol>

                <p style={{ margin: '12px 0 0', paddingTop: 10, borderTop: '1px dashed #fde68a', fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
                  A extensão só acessa o site da Receita e esta página do NODRI, e não envia nada para fora do seu computador.
                  Enquanto você não instalar, o botão <strong>Emitir Guia do MEI</strong> de cada profissional continua funcionando normalmente.
                </p>
              </div>
            )}
            {extStatus === 'ok' && (
              <div style={{ margin: '0 0 10px', fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                ✅ Extensão detectada{extVersao ? ` (v${extVersao})` : ''}
              </div>
            )}
              {fila.map((it, i) => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderBottom: '1px solid #f3f1ec' }}>
                  <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 26 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.nome}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>
                      {it.cnpj}
                      {it.periodos?.length ? ` · ${it.periodos.join(', ')}` : ''}
                      {it.valor ? ` · ${it.valor}` : ''}
                    </div>
                    {it.msg && <div style={{ fontSize: 11, color: corEtapa[it.etapa], marginTop: 2 }}>{it.msg}</div>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: corEtapa[it.etapa], textAlign: 'right', minWidth: 120 }}>
                    {rotuloEtapa[it.etapa]}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ padding: 14, borderTop: '1px solid #ece9e2', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {rodando
                ? <button onClick={cancelar} style={btn('#dc2626')}>Parar</button>
                : <>
                  <button onClick={() => setFilaAberta(false)} style={{ ...btn('#fff'), color: '#6b6860', border: '1px solid #d0cdc7' }}>Fechar</button>
                  <button onClick={iniciar} disabled={extStatus !== 'ok'} style={{ ...btn('#16a34a'), opacity: extStatus === 'ok' ? 1 : 0.5 }}>
                    ▶ Iniciar emissão
                  </button>
                </>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
