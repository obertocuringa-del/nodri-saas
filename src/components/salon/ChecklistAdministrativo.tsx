'use client'

// Check list do setor Administrativo — 10 roteiros, cada um com sua
// periodicidade. Cada item tem "feito", data e observação; dá para acrescentar
// e excluir item e bloco inteiro. Salvo em salao_config na chave
// demanda_checklist_administrativo.

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Loader2, Save, Plus, Trash2, ChevronDown, Printer, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { getLogoSalao } from '@/lib/logoSalao'

const rid = () => Math.random().toString(36).slice(2, 9)
const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

interface Item { id: string; texto: string; feito?: boolean; data?: string; obs?: string }
interface Bloco { id: string; titulo: string; freq: string; itens: Item[] }

/** Cor de cada periodicidade — ajuda a bater o olho e saber o ritmo. */
const CORES_FREQ: Record<string, string> = {
  'Diário': '#dc2626', 'Diário/Semanal': '#ea580c', 'Semanal': '#f59e0b',
  'Semanal/Mensal': '#ca8a04', 'Mensal': '#0891b2', 'Mensal/Trimestral': '#2563eb',
  'Mensal/Anual': '#7c3aed', 'Conforme necessidade': '#6b7280',
}
const corFreq = (f: string) => CORES_FREQ[f] || '#5b4fcf'

const b = (titulo: string, freq: string, itens: string[]): Bloco =>
  ({ id: rid(), titulo, freq, itens: itens.map(t => ({ id: rid(), texto: t })) })

const PADRAO = (): Bloco[] => [
  b('1. Documentação da empresa e unidade', 'Mensal', [
    'Pegar a pasta física ou digital da empresa',
    'Abrir o arquivo "Documentos Societários"',
    'Conferir se o nome empresarial no contrato social bate com o cartão CNPJ',
    'Conferir se o CNPJ no contrato social bate com o cartão CNPJ',
    'Conferir se o endereço no contrato social bate com o local atual',
    'Conferir se a atividade econômica (CNAE) está compatível com o que o salão faz',
    'Conferir se os sócios listados estão atualizados (nenhum saiu sem alteração)',
    'Conferir se os representantes legais estão atualizados',
    'Verificar se a última alteração contratual está arquivada e assinada',
    'Verificar se todas as alterações anteriores estão na pasta (histórico completo)',
    'Se for MEI, verificar se o certificado MEI está válido',
    'Conferir o comprovante de endereço do estabelecimento (luz/água no nome da empresa ou sócio)',
    'Conferir se o contrato de locação está vigente e assinado',
    'Verificar se há aditivos de locação e se estão anexados',
    'Anotar na planilha de controle a próxima renovação de locação',
  ]),
  b('2. Licenças, alvarás e autorizações', 'Semanal/Mensal', [
    'Abrir a Matriz de Licenças (planilha)',
    'Alvará de Funcionamento visível no salão e digitalizado',
    'Licença Sanitária válida (se aplicável)',
    'Certificado do Corpo de Bombeiros (AVCB/CLC) válido',
    'Licença Ambiental (se aplicável, ex.: resíduos químicos)',
    'Cadastro Municipal (ISS) ativo',
    'Cadastro Estadual (ICMS) ativo, se aplicável',
    'Para cada licença: anotar número do documento',
    'Para cada licença: anotar órgão emissor',
    'Para cada licença: programar alerta 30 dias antes do vencimento',
    'Verificar protocolos de solicitação em andamento junto aos órgãos públicos',
    'Verificar comunicações recebidas de órgãos públicos não abertas ou pendentes',
  ]),
  b('3. Contratos e vencimentos', 'Semanal', [
    'Abrir a Pasta Central de Contratos (física ou drive)',
    'Locação — vigente? vence em?',
    'Prestação de serviços (contabilidade, assessoria)',
    'Manutenção (ar-condicionado, máquinas, elevador)',
    'Limpeza terceirizada',
    'Segurança (se houver)',
    'Telefonia e internet',
    'Software / sistema de gestão',
    'Máquinas e equipamentos (leasing ou aluguel)',
    'Publicidade e marketing',
    'Consultorias',
    'Parcerias',
    'Para cada contrato: verificar se há aditivos anexados',
    'Para cada contrato: verificar anexos (escopos, tabelas de preço)',
    'Para cada contrato: anotar o responsável interno (quem gerencia)',
    'Para cada contrato: verificar índice de reajuste (se aplicável)',
    'Programar revisão de cada contrato 60 dias antes do término',
  ]),
  b('4. Procurações e representações', 'Mensal', [
    'Verificar se há procuração vigente para representantes legais',
    'Procuração assinada e reconhecida em cartório (se necessário)',
    'Procuração arquivada (físico + digital)',
    'Procuração para contador ou advogado agir em nome da empresa',
    'Representante comercial: verificar procuração ou contrato',
    'Anotar a data de validade da procuração',
    'Programar renovação 30 dias antes do vencimento',
  ]),
  b('5. Arquivo físico e digital', 'Diário/Semanal', [
    'Todos os documentos recebidos no dia foram digitalizados',
    'Documentos digitalizados nomeados corretamente (ex.: Contrato_Locacao_2026_ASSINADO.pdf)',
    'Documentos salvos em pasta organizada (1_Societarios / 2_Licencas / 3_Contratos)',
    'Backup em nuvem (Google Drive, OneDrive…)',
    'Backup local (HD externo ou servidor)',
    'Documentos físicos em pastas etiquetadas e organizadas',
    'Nenhum documento solto na mesa ou gaveta sem arquivamento',
    'Registrar no índice o local físico de cada documento',
  ]),
  b('6. Prazos e pendências administrativas', 'Diário', [
    'Abrir a planilha de prazos e pendências',
    'Listar todas as pendências abertas',
    'Verificar se há prazo vencido hoje',
    'Verificar se há prazo vencendo em 5 dias',
    'Verificar documento pendente de assinatura (sócios, direção)',
    'Verificar solicitação de órgão público sem resposta',
    'Verificar notificação recebida não tratada',
    'Atualizar o status de cada pendência (aberta / em andamento / concluída)',
    'Definir a próxima ação para cada pendência',
  ]),
  b('7. Processos, POPs, políticas e formulários', 'Mensal/Trimestral', [
    'Abrir a pasta "POPs e Políticas"',
    'POP de Arquivo e Documentos atualizado',
    'POP de Controle de Licenças atualizado',
    'POP de Controle de Contratos atualizado',
    'POP de Recebimento e Envio de Documentos atualizado',
    'Política de Conservação de Documentos (prazos de guarda) definida',
    'Formulários padronizados disponíveis (solicitação de compra, requisição)',
    'Nenhum formulário desatualizado em uso',
    'Registrar a data da próxima revisão dos POPs',
  ]),
  b('8. Atas, reuniões e decisões da direção', 'Conforme necessidade', [
    'Ata da última reunião redigida',
    'Ata assinada pelos participantes',
    'Ata arquivada (físico + digital)',
    'Decisões tomadas registradas e com responsável',
    'Decisões sendo executadas (checklist de acompanhamento)',
    'Decisão que exija alteração contratual: processo iniciado',
    'Decisão que exija nova licença: processo iniciado',
  ]),
  b('9. Patrimônio administrativo', 'Mensal/Anual', [
    'Abrir a planilha de patrimônio',
    'Todos os equipamentos listados (móveis, computadores, máquinas)',
    'Cada item com nota fiscal anexada',
    'Cada item com número de patrimônio etiquetado',
    'Itens sem localização (emprestados, perdidos)',
    'Itens danificados que precisam de baixa ou reparo',
    'Seguro para bens de alto valor',
    'Inventário físico (conferir item por item)',
  ]),
  b('10. Auditoria e relatório administrativo', 'Mensal/Trimestral', [
    'Revisar todos os checklists acima e marcar pendências',
    'Gerar relatório de pendências administrativas para a direção',
    'Gerar relatório de contratos vencendo nos próximos 90 dias',
    'Gerar relatório de licenças vencendo nos próximos 90 dias',
    'Gerar indicadores administrativos (% digitalizado, % de prazos cumpridos)',
    'Identificar não conformidades (documento faltando, prazo perdido)',
    'Registrar ações corretivas para cada não conformidade',
    'Entregar o relatório consolidado para a direção',
    'Arquivar o relatório na pasta "Auditoria e Relatórios"',
  ]),
]

export default function ChecklistAdministrativo() {
  const [blocos, setBlocos] = useState<Bloco[]>([])
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  useGuardaSalvar(dirty, 'Check list administrativo')

  useEffect(() => {
    fetch('/api/salon/grid?chave=demanda_checklist_administrativo', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setBlocos(d && Array.isArray(d.blocos) && d.blocos.length ? d.blocos : PADRAO()))
      .catch(() => setBlocos(PADRAO()))
      .finally(() => setCarregando(false))
  }, [])

  const salvar = useCallback(async () => {
    setSalvando(true)
    try {
      const r = await fetch('/api/salon/grid', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'demanda_checklist_administrativo', doc: { blocos } }),
      })
      if (r.ok) { setDirty(false); toast.success('Salvo!') } else toast.error('Não foi possível salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }, [blocos])

  const total = useMemo(() => blocos.reduce((s, x) => s + x.itens.length, 0), [blocos])
  const feitos = useMemo(() => blocos.reduce((s, x) => s + x.itens.filter(i => i.feito).length, 0), [blocos])
  const pct = total ? Math.round(feitos / total * 100) : 0

  const mapBloco = (id: string, fn: (x: Bloco) => Bloco) => { setBlocos(l => l.map(x => x.id === id ? fn(x) : x)); setDirty(true) }
  const toggleAberto = (id: string) => setAbertos(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function imprimir() {
    const logo = await getLogoSalao()
    const corpo = blocos.map(bl => {
      const f = bl.itens.filter(i => i.feito).length
      return `<div class="bloco"><h2>${esc(bl.titulo)} <span class="freq">${esc(bl.freq)}</span> <span class="cont">${f}/${bl.itens.length}</span></h2>
      <table><thead><tr><th style="width:26px"></th><th>Ação</th><th style="width:80px">Data</th><th style="width:150px">Observação</th></tr></thead>
      <tbody>${bl.itens.map(i => `<tr><td class="c">${i.feito ? '☑' : '☐'}</td><td${i.feito ? ' class="ok"' : ''}>${esc(i.texto)}</td><td class="c">${esc(i.data ? i.data.split('-').reverse().join('/') : '')}</td><td>${esc(i.obs || '')}</td></tr>`).join('')}</tbody></table></div>`
    }).join('')
    const css = `@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:10.5px;color:#1a1a2e}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #5b4fcf;padding-bottom:8px;margin-bottom:12px}
.brand{font-size:21px;font-weight:900;color:#5b4fcf}.logo{max-height:52px;max-width:190px;object-fit:contain}
.tt{text-align:right;font-size:10px;color:#666}.tt strong{font-size:14px;color:#1a1a2e;display:block}
.geral{background:#f0eefb;border-radius:9px;padding:9px 13px;margin-bottom:13px;font-size:11px;font-weight:700}
.bloco{margin-bottom:12px;break-inside:avoid}
h2{font-size:11.5px;color:#5b4fcf;border-bottom:1px solid #e5e3de;padding-bottom:4px;margin-bottom:5px;display:flex;align-items:center;gap:7px}
.freq{font-size:8.5px;background:#5b4fcf;color:#fff;border-radius:20px;padding:2px 8px;font-weight:700}
.cont{margin-left:auto;font-size:9.5px;color:#888;font-weight:600}
table{width:100%;border-collapse:collapse;font-size:9.5px}
th{background:#faf9ff;text-align:left;padding:4px 7px;font-size:8.5px;color:#666;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid #e5e3de}
td{padding:4px 7px;border-bottom:1px solid #f2f0ec;vertical-align:top}
.c{text-align:center}.ok{color:#15803d;font-weight:600}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Check list administrativo</title><style>${css}</style></head><body>
<div class="hd">${logo ? `<img src="${logo}" class="logo"/>` : `<div class="brand">NODRI</div>`}<div class="tt"><strong>Check list — Administrativo</strong>${new Date().toLocaleDateString('pt-BR')}</div></div>
<div class="geral">Progresso geral: ${feitos} de ${total} itens concluídos (${pct}%)</div>
${corpo}<script>window.onload=function(){window.print()}<\/script></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700'); if (!w) return
    w.document.write(html); w.document.close(); w.focus()
  }

  if (carregando) return (
    <div style={{ padding: 46, textAlign: 'center', color: '#9ca3af' }}>
      <Loader2 size={21} className="animate-spin" style={{ display: 'inline' }} /> Carregando…
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, flexWrap: 'wrap', marginBottom: 13 }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h2 style={{ fontSize: 19, fontWeight: 900, color: '#1a1a2e', margin: 0, letterSpacing: '-.3px' }}>Check list — Administrativo</h2>
          <p style={{ fontSize: 12.5, color: '#8a8680', margin: '3px 0 0' }}>10 roteiros de conferência. Clique no bloco para abrir e marcar.</p>
        </div>
        <button onClick={imprimir}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 15px', borderRadius: 11, border: '1.5px solid #e0ddd8', background: '#fff', color: '#4b5563', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>
          <Printer size={14} /> Imprimir
        </button>
        <button onClick={salvar} disabled={salvando || !dirty}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 11, border: 'none', background: dirty ? '#16a34a' : '#d7d5cf', color: '#fff', fontSize: 13, fontWeight: 800, cursor: dirty ? 'pointer' : 'default' }}>
          <Save size={14} /> {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {/* Progresso geral */}
      <div style={{ background: '#fff', border: '1px solid #eceae4', borderRadius: 14, padding: '13px 16px', marginBottom: 13 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: pct === 100 ? '#16a34a' : '#5b4fcf', letterSpacing: '-1px' }}>{pct}%</span>
          <span style={{ fontSize: 12.5, color: '#8a8680', fontWeight: 700 }}>{feitos} de {total} itens conferidos</span>
        </div>
        <div style={{ height: 9, borderRadius: 99, background: '#f0eee8', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#16a34a' : '#5b4fcf', borderRadius: 99, transition: 'width .3s' }} />
        </div>
      </div>

      {blocos.map(bl => {
        const f = bl.itens.filter(i => i.feito).length
        const completo = bl.itens.length > 0 && f === bl.itens.length
        const aberto = abertos.has(bl.id)
        const cor = corFreq(bl.freq)
        return (
          <div key={bl.id} style={{ background: '#fff', border: `1px solid ${completo ? '#bbf7d0' : '#eceae4'}`, borderRadius: 14, marginBottom: 9, overflow: 'hidden' }}>
            <button onClick={() => toggleAberto(bl.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', border: 'none', background: completo ? '#f0fdf4' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 900, color: completo ? '#15803d' : '#1a1a2e' }}>{bl.titulo}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#fff', background: cor, borderRadius: 99, padding: '2px 9px', whiteSpace: 'nowrap' }}>{bl.freq}</span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: '#f0eee8', overflow: 'hidden', marginTop: 7 }}>
                  <div style={{ width: `${bl.itens.length ? (f / bl.itens.length) * 100 : 0}%`, height: '100%', background: completo ? '#16a34a' : cor, borderRadius: 99 }} />
                </div>
              </div>
              {completo
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#16a34a', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 9px', borderRadius: 99, flexShrink: 0 }}><Check size={11} /> OK</span>
                : <span style={{ fontSize: 11.5, fontWeight: 800, color: '#8a8680', flexShrink: 0 }}>{f}/{bl.itens.length}</span>}
              <ChevronDown size={16} style={{ color: '#a8a49d', transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
            </button>

            {aberto && (
              <div style={{ padding: '4px 15px 14px', borderTop: '1px solid #f2f0ec' }}>
                {bl.itens.map(it => (
                  <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #f7f6f3', flexWrap: 'wrap' }}>
                    <input type="checkbox" checked={!!it.feito}
                      onChange={e => mapBloco(bl.id, x => ({ ...x, itens: x.itens.map(y => y.id === it.id ? { ...y, feito: e.target.checked, data: e.target.checked && !y.data ? new Date().toLocaleDateString('en-CA') : y.data } : y) }))}
                      style={{ width: 16, height: 16, accentColor: '#16a34a', cursor: 'pointer', flexShrink: 0 }} />
                    <input value={it.texto}
                      onChange={e => mapBloco(bl.id, x => ({ ...x, itens: x.itens.map(y => y.id === it.id ? { ...y, texto: e.target.value } : y) }))}
                      style={{ flex: '3 1 220px', minWidth: 160, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: it.feito ? '#15803d' : '#374151', fontWeight: it.feito ? 700 : 500, textDecoration: it.feito ? 'line-through' : 'none' }} />
                    <input type="date" value={it.data || ''}
                      onChange={e => mapBloco(bl.id, x => ({ ...x, itens: x.itens.map(y => y.id === it.id ? { ...y, data: e.target.value } : y) }))}
                      style={{ ...campo, flex: '0 0 128px' }} />
                    <input value={it.obs || ''} placeholder="Observação"
                      onChange={e => mapBloco(bl.id, x => ({ ...x, itens: x.itens.map(y => y.id === it.id ? { ...y, obs: e.target.value } : y) }))}
                      style={{ ...campo, flex: '1 1 140px' }} />
                    <button onClick={() => mapBloco(bl.id, x => ({ ...x, itens: x.itens.filter(y => y.id !== it.id) }))}
                      style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: 2, flexShrink: 0 }}><Trash2 size={12} /></button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => mapBloco(bl.id, x => ({ ...x, itens: [...x.itens, { id: rid(), texto: '' }] }))}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px dashed #5b4fcf', background: '#f0eefb', color: '#5b4fcf', fontSize: 11.5, fontWeight: 800, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>
                    <Plus size={11} /> Acrescentar ação
                  </button>
                  <button onClick={() => { if (confirm('Excluir este bloco inteiro?')) { setBlocos(l => l.filter(x => x.id !== bl.id)); setDirty(true) } }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 11.5, fontWeight: 800, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>
                    <Trash2 size={11} /> Excluir bloco
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button onClick={() => { setBlocos(l => [...l, b('NOVO BLOCO', 'Mensal', [])]); setDirty(true) }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px dashed #9ca3af', background: '#fff', color: '#4b5563', fontSize: 12.5, fontWeight: 800, padding: '9px 15px', borderRadius: 10, cursor: 'pointer' }}>
        <Plus size={13} /> Acrescentar bloco
      </button>
    </div>
  )
}

const campo: CSSProperties = { padding: '5px 8px', borderRadius: 7, border: '1.5px solid #e0ddd8', fontSize: 11.5, background: '#fff' }
