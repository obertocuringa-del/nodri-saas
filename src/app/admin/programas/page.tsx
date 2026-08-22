'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Loader2, RotateCcw, Wrench, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

// ============================================================================
// Configuração remota dos PROGRAMAS DESKTOP (Suite NODRI)
// Campo vazio = programa usa o padrão de fábrica (mostrado como placeholder).
// Campo preenchido = vale para TODOS os clientes na próxima abertura do app.
// ============================================================================

type Secao = { chave: string; titulo: string; emoji: string; descricao: string; campos: { chave: string; label: string; tipo?: 'numero' }[] }

const SECOES: Secao[] = [
  {
    chave: 'listas_foto', emoji: '', titulo: 'Lista com Foto (WhatsApp)',
    descricao: 'XPaths do WhatsApp e os tempos de espera do envio (em segundos).',
    campos: [
      { chave: 'xpath_anexo', label: 'XPath do botão anexar (clipe)' },
      { chave: 'xpath_imagem', label: 'XPath da opção "Fotos e vídeos"' },
      { chave: 'espera_whatsapp', label: 'Espera do WhatsApp abrir — máximo (segundos)', tipo: 'numero' },
      { chave: 'abrir_conversa', label: 'Após abrir a conversa (segundos)', tipo: 'numero' },
      { chave: 'apos_enter', label: 'Após enviar o texto (segundos)', tipo: 'numero' },
      { chave: 'confirma_texto', label: 'Confirmar o texto (segundos)', tipo: 'numero' },
      { chave: 'apos_anexo', label: 'Após clicar no clipe (segundos)', tipo: 'numero' },
      { chave: 'apos_fotos', label: 'Após clicar em Fotos (segundos)', tipo: 'numero' },
      { chave: 'apos_colar', label: 'Após colar a imagem (segundos)', tipo: 'numero' },
      { chave: 'apos_enter_foto1', label: '1º Enter para enviar a foto (segundos)', tipo: 'numero' },
      { chave: 'apos_enter_foto2', label: '2º Enter para enviar a foto (segundos)', tipo: 'numero' },
      { chave: 'entre_contatos', label: 'Pausa entre um contato e outro (segundos)', tipo: 'numero' },
    ],
  },
  {
    chave: 'listas_sem_foto', emoji: '', titulo: 'Lista sem Foto (WhatsApp)',
    descricao: 'Tempos de espera do envio de mensagens sem imagem (em segundos).',
    campos: [
      { chave: 'espera_whatsapp', label: 'Espera do WhatsApp abrir — máximo (segundos)', tipo: 'numero' },
      { chave: 'carregar_conversa', label: 'Carregar a conversa do contato (segundos)', tipo: 'numero' },
      { chave: 'apos_envio', label: 'Após enviar a mensagem (segundos)', tipo: 'numero' },
    ],
  },
  {
    chave: 'confirmacao_feedback', emoji: '', titulo: 'Confirmação de Agendamento + Mensagem de Feedback',
    descricao: 'Os dois programas usam o mesmo caminho no painel Avec (relatório 0051).',
    campos: [
      { chave: 'relatorio_url', label: 'Link do relatório de agendamentos (0051)' },
      { chave: 'xpath_login_email', label: 'XPath do campo e-mail (login Avec)' },
      { chave: 'xpath_login_senha', label: 'XPath do campo senha (login Avec)' },
      { chave: 'xpath_login_botao', label: 'XPath do botão Acessar (login Avec)' },
      { chave: 'xpath_data_inicio', label: 'XPath do campo data início' },
      { chave: 'xpath_data_fim', label: 'XPath do campo data fim' },
      { chave: 'xpath_btn_buscar', label: 'XPath do botão Buscar' },
      { chave: 'xpath_btn_excel', label: 'XPath do botão exportar Excel' },
      { chave: 'tempo_pagina', label: 'Tempo após abrir a página (segundos)', tipo: 'numero' },
      { chave: 'tempo_apos_senha', label: 'Tempo após digitar a senha (segundos)', tipo: 'numero' },
      { chave: 'tempo_apos_login', label: 'Tempo após clicar em Acessar (segundos)', tipo: 'numero' },
      { chave: 'tempo_apos_relatorio', label: 'Tempo após abrir o relatório (segundos)', tipo: 'numero' },
      { chave: 'tempo_apos_busca', label: 'Tempo após clicar em Buscar (segundos)', tipo: 'numero' },
      { chave: 'tempo_apos_exportar', label: 'Tempo após exportar (segundos)', tipo: 'numero' },
      { chave: 'whatsapp_espera', label: 'Espera do WhatsApp abrir — máximo (segundos)', tipo: 'numero' },
      { chave: 'whatsapp_por_contato', label: 'Tempo por contato no WhatsApp (segundos)', tipo: 'numero' },
    ],
  },
  {
    chave: 'relatorio', emoji: '', titulo: 'Relatório de Profissionais (NODRI v4.0)',
    descricao: 'Tempos, XPaths e os 12 links de relatórios do Avec usados na coleta.',
    campos: [
      { chave: 'timeout_login', label: 'Timeout do login (segundos)', tipo: 'numero' },
      { chave: 'timeout_pagina', label: 'Timeout de página (segundos)', tipo: 'numero' },
      { chave: 'timeout_elemento', label: 'Timeout de elemento (segundos)', tipo: 'numero' },
      { chave: 'timeout_download', label: 'Timeout de download (segundos)', tipo: 'numero' },
      { chave: 'timeout_pausa_buscar', label: 'Pausa entre cliques de Buscar (segundos)', tipo: 'numero' },
      { chave: 'xpath_login_email', label: 'XPath do campo e-mail (login)' },
      { chave: 'xpath_login_senha', label: 'XPath do campo senha (login)' },
      { chave: 'xpath_login_botao', label: 'XPath do botão Acessar (login)' },
      { chave: 'xpath_data_inicio', label: 'XPath do campo data início' },
      { chave: 'xpath_data_fim', label: 'XPath do campo data fim' },
      { chave: 'xpath_btn_buscar', label: 'XPath do botão Buscar' },
      { chave: 'xpath_btn_buscar_0021', label: 'XPath do Buscar (relatório 0021)' },
      { chave: 'xpath_btn_buscar_0126', label: 'XPath do Buscar (relatório 0126)' },
      { chave: 'xpath_btn_excel', label: 'XPath do exportar Excel' },
      { chave: 'xpath_btn_excel_0021', label: 'XPath do Excel (relatório 0021)' },
      { chave: 'xpath_btn_excel_0126', label: 'XPath do Excel (relatório 0126)' },
      { chave: 'url_0083', label: 'Link 0083 — Faturamento' },
      { chave: 'url_0017', label: 'Link 0017 — Clientes Novos' },
      { chave: 'url_0032', label: 'Link 0032 — Serviços' },
      { chave: 'url_0042', label: 'Link 0042 — Produtos' },
      { chave: 'url_0088', label: 'Link 0088 — Faturamento Diário' },
      { chave: 'url_0123', label: 'Link 0123 — Pagamentos' },
      { chave: 'url_0021', label: 'Link 0021 — Ticket Médio' },
      { chave: 'url_0326', label: 'Link 0326 — Preferência' },
      { chave: 'url_0126', label: 'Link 0126 — Ocupação' },
      { chave: 'url_0031', label: 'Link 0031 — Serviços por Profissional' },
      { chave: 'url_0041', label: 'Link 0041 — Produtos por Profissional' },
      { chave: 'url_0051', label: 'Link 0051 — Agendamentos' },
    ],
  },
]

export default function ProgramasConfigPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [defaults, setDefaults] = useState<Record<string, Record<string, any>>>({})
  const [config, setConfig] = useState<Record<string, Record<string, any>>>({})
  const [aberta, setAberta] = useState<string>('listas_foto')

  useEffect(() => {
    fetch('/api/config/programas')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setDefaults(d.defaults || {}); setConfig(d.config || {}) } })
      .catch(() => toast.error('Erro ao carregar configurações'))
      .finally(() => setLoading(false))
  }, [])

  const valor = (sec: string, campo: string): string => {
    const v = config?.[sec]?.[campo]
    return v === undefined || v === null ? '' : String(v)
  }
  const padrao = (sec: string, campo: string): string => {
    const v = defaults?.[sec]?.[campo]
    return v === undefined || v === null ? '' : String(v)
  }
  const personalizado = (sec: string, campo: string) => valor(sec, campo).trim() !== ''

  function setCampo(sec: string, campo: string, v: string) {
    setConfig(prev => {
      const n = { ...prev, [sec]: { ...(prev[sec] || {}) } }
      if (v.trim() === '') delete n[sec][campo]
      else n[sec][campo] = v
      if (Object.keys(n[sec]).length === 0) delete n[sec]
      return n
    })
  }

  function restaurarSecao(sec: string) {
    if (!confirm('Restaurar TODOS os campos desta seção ao padrão de fábrica?')) return
    setConfig(prev => { const n = { ...prev }; delete n[sec]; return n })
    toast.success('Seção restaurada ao padrão — clique em Salvar para valer.')
  }

  async function salvar() {
    setSaving(true)
    try {
      // números: converte texto → número antes de salvar
      const limpo: Record<string, Record<string, any>> = {}
      for (const sec of SECOES) {
        const dados = config[sec.chave]
        if (!dados) continue
        for (const campo of sec.campos) {
          const bruto = dados[campo.chave]
          if (bruto === undefined || String(bruto).trim() === '') continue
          let v: any = String(bruto).trim()
          if (campo.tipo === 'numero') {
            const n = Number(String(v).replace(',', '.'))
            if (!isFinite(n) || n <= 0) { toast.error(`Valor inválido em "${campo.label}"`); setSaving(false); return }
            v = n
          }
          if (!limpo[sec.chave]) limpo[sec.chave] = {}
          limpo[sec.chave][campo.chave] = v
        }
      }
      const res = await fetch('/api/config/programas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: limpo }) })
      if (res.ok) toast.success('Salvo! Os programas pegam os valores novos na próxima abertura.')
      else { const d = await res.json().catch(() => null); toast.error(d?.error || 'Erro ao salvar') }
    } catch { toast.error('Erro de conexão') }
    setSaving(false)
  }

  const totalPersonalizados = SECOES.reduce((acc, s) => acc + s.campos.filter(c => personalizado(s.chave, c.chave)).length, 0)

  return (
    <div className="min-h-screen bg-nodri-dark">
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/admin')} className="flex items-center gap-2 text-nodri-t2 hover:text-nodri-cyan transition-colors text-sm">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="w-px h-5 bg-nodri-border" />
        <h1 className="font-syne font-bold text-[15px] flex items-center gap-2"><Wrench size={16} className="text-nodri-cyan" /> Programas — Configuração Remota</h1>
        <div className="flex-1" />
        {totalPersonalizados > 0 && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">{totalPersonalizados} personalizado{totalPersonalizados > 1 ? 's' : ''}</span>}
        <button onClick={salvar} disabled={saving || loading}
          className="flex items-center gap-1.5 bg-nodri-cyan text-black text-[12px] font-bold px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-50 transition-all">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6">
        <div className="rounded-xl border border-nodri-cyan/25 bg-nodri-cyan/5 p-4 mb-5">
          <p className="text-[12px] text-nodri-t2 leading-relaxed">
            <strong className="text-nodri-t1">Como funciona:</strong> os programas da Suite (em TODOS os clientes) consultam esta página ao abrir.
            Campo <strong className="text-nodri-t1">vazio</strong> = padrão de fábrica (mostrado dentro do campo).
            Campo <strong className="text-amber-400">preenchido</strong> = vale para todos na próxima abertura — sem reinstalar nada.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-nodri-cyan" /></div>
        ) : (
          <div className="space-y-3">
            {SECOES.map(sec => {
              const abertaEsta = aberta === sec.chave
              const nPers = sec.campos.filter(c => personalizado(sec.chave, c.chave)).length
              return (
                <div key={sec.chave} className="rounded-2xl border border-nodri-border bg-nodri-card overflow-hidden">
                  <button onClick={() => setAberta(abertaEsta ? '' : sec.chave)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/3 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-syne font-bold text-[13px] text-nodri-t1">{sec.titulo}</div>
                      <div className="text-[11px] text-nodri-t3">{sec.descricao}</div>
                    </div>
                    {nPers > 0 && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">{nPers} personalizado{nPers > 1 ? 's' : ''}</span>}
                    <ChevronDown size={16} className={`text-nodri-t3 transition-transform shrink-0 ${abertaEsta ? 'rotate-180' : ''}`} />
                  </button>

                  {abertaEsta && (
                    <div className="px-4 pb-4 space-y-3 border-t border-nodri-border pt-4">
                      {sec.campos.map(campo => {
                        const pers = personalizado(sec.chave, campo.chave)
                        return (
                          <div key={campo.chave}>
                            <label className="flex items-center gap-2 text-[11px] text-nodri-t2 mb-1">
                              {campo.label}
                              {pers && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">PERSONALIZADO</span>}
                            </label>
                            <input value={valor(sec.chave, campo.chave)}
                              onChange={e => setCampo(sec.chave, campo.chave, e.target.value)}
                              placeholder={padrao(sec.chave, campo.chave)}
                              className={`w-full bg-nodri-surface border rounded-lg px-3 py-2 text-[11.5px] outline-none transition-colors font-mono ${pers ? 'border-amber-500/40 text-amber-200 focus:border-amber-400' : 'border-nodri-border text-nodri-t1 focus:border-nodri-cyan/40'}`} />
                          </div>
                        )
                      })}
                      <button onClick={() => restaurarSecao(sec.chave)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-nodri-t3 hover:text-nodri-red transition-colors mt-1">
                        <RotateCcw size={12} /> Restaurar padrão desta seção
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
