'use client'
import { useState, useEffect } from 'react'
import { Loader2, Eye, EyeOff, Save, ExternalLink, Send } from 'lucide-react'
import toast from 'react-hot-toast'

const inputCls = "w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-nodri-cyan/40 transition-colors text-nodri-t1"
const labelCls = "text-[10px] text-nodri-t3 uppercase tracking-wider mb-1 block"

const MODELOS = [
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — Rápido e econômico' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5 — Balanceado' },
  { value: 'claude-opus-4-5', label: 'Claude Opus 4.5 — Mais poderoso' },
]

export default function IAConfigPage() {
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [temApiKey, setTemApiKey] = useState(false)
  const [respostaTeste, setRespostaTeste] = useState('')

  const [apiKey, setApiKey] = useState('')
  const [modelo, setModelo] = useState('claude-haiku-4-5')
  const [instrucoesBase, setInstrucoesBase] = useState('')
  const [contextoAdicional, setContextoAdicional] = useState('')

  useEffect(() => {
    fetch('/api/ia/config')
      .then(r => r.json())
      .then(d => {
        setTemApiKey(!!d.tem_api_key)
        setModelo(d.modelo || 'claude-haiku-4-5')
        setInstrucoesBase(d.instrucoes_base || '')
        setContextoAdicional(d.contexto_adicional || '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function salvar() {
    setSalvando(true)
    const body: any = { modelo, instrucoes_base: instrucoesBase, contexto_adicional: contextoAdicional }
    if (apiKey.trim()) body.api_key = apiKey.trim()

    const res = await fetch('/api/ia/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      toast.success('✅ Configuração salva!')
      if (apiKey.trim()) { setTemApiKey(true); setApiKey('') }
    } else {
      const d = await res.json()
      toast.error(d.error || 'Erro ao salvar')
    }
    setSalvando(false)
  }

  async function testar() {
    setTestando(true)
    setRespostaTeste('')
    const res = await fetch('/api/ia/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensagens: [{ role: 'user', content: 'Olá! Faça uma breve apresentação sua em 2 frases.' }],
      }),
    })
    const d = await res.json()
    if (res.ok) {
      setRespostaTeste(d.resposta)
      toast.success('Teste realizado com sucesso!')
    } else {
      toast.error(d.error || 'Erro no teste')
    }
    setTestando(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-nodri-dark flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-nodri-cyan"/>
    </div>
  )

  return (
    <div className="min-h-screen bg-nodri-dark">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3">
        <h1 className="font-syne font-bold text-[16px] text-nodri-t1">🤖 Configuração da IA NODRI</h1>
        <p className="text-[11px] text-nodri-t3 mt-0.5">Configure a inteligência artificial para análise do seu salão</p>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">

        {/* Status */}
        <div className={`rounded-xl p-3 border flex items-center gap-3 ${temApiKey ? 'bg-green-500/5 border-green-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
          <span className="text-[18px]">{temApiKey ? '✅' : '⚠️'}</span>
          <div>
            <p className="text-[12px] font-semibold text-nodri-t1">
              {temApiKey ? 'IA configurada e pronta para uso' : 'API Key não configurada'}
            </p>
            <p className="text-[10px] text-nodri-t3">
              {temApiKey ? 'Você pode usar o chat da IA nas páginas dos profissionais' : 'Adicione sua chave da Anthropic para ativar a IA'}
            </p>
          </div>
        </div>

        {/* Card principal */}
        <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5 space-y-4">
          <h2 className="font-syne font-bold text-[13px]">⚙️ Configurações</h2>

          {/* API Key */}
          <div>
            <label className={labelCls}>API Key Anthropic {temApiKey && <span className="text-green-400 normal-case">(já configurada)</span>}</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={temApiKey ? 'Nova chave (deixe vazio para manter a atual)' : 'sk-ant-...'}
                className={inputCls + ' pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-nodri-t3 hover:text-nodri-t1">
                {showKey ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </div>

          {/* Modelo */}
          <div>
            <label className={labelCls}>Modelo</label>
            <select value={modelo} onChange={e => setModelo(e.target.value)} className={inputCls}>
              {MODELOS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Instruções base */}
          <div>
            <label className={labelCls}>Instruções Personalizadas (opcional)</label>
            <textarea
              value={instrucoesBase}
              onChange={e => setInstrucoesBase(e.target.value)}
              rows={4}
              placeholder="Ex: Seja mais formal nas respostas. Priorize análise financeira."
              className={inputCls + ' resize-none'}
            />
          </div>

          {/* Contexto adicional */}
          <div>
            <label className={labelCls}>Contexto Adicional (opcional)</label>
            <textarea
              value={contextoAdicional}
              onChange={e => setContextoAdicional(e.target.value)}
              rows={4}
              placeholder="Ex: Nosso salão tem foco em coloração. Trabalhamos com sistema de comissão 50/50."
              className={inputCls + ' resize-none'}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nodri-cyan text-nodri-dark text-[12px] font-bold hover:brightness-110 disabled:opacity-50">
              {salvando ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>}
              Salvar Configuração
            </button>

            {temApiKey && (
              <button
                onClick={testar}
                disabled={testando}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nodri-purple/20 text-nodri-purple border border-nodri-purple/30 text-[12px] font-bold hover:bg-nodri-purple/30 disabled:opacity-50">
                {testando ? <Loader2 size={13} className="animate-spin"/> : <Send size={13}/>}
                Testar IA
              </button>
            )}
          </div>

          {respostaTeste && (
            <div className="rounded-xl p-4 border bg-nodri-card border-nodri-border">
              <p className="text-[10px] text-nodri-t3 uppercase tracking-wider mb-2">Resposta do teste:</p>
              <p className="text-[12px] text-nodri-t1 leading-relaxed">{respostaTeste}</p>
            </div>
          )}
        </div>

        {/* Card de instruções */}
        <div className="bg-nodri-surface border border-nodri-border rounded-2xl p-5">
          <h2 className="font-syne font-bold text-[13px] mb-3">📖 Como obter sua chave de API</h2>
          <div className="space-y-2 text-[12px] text-nodri-t2">
            <p>1. Acesse o Console da Anthropic</p>
            <p>2. Navegue até <strong className="text-nodri-t1">API Keys</strong></p>
            <p>3. Clique em <strong className="text-nodri-t1">Create Key</strong></p>
            <p>4. Copie a chave gerada e cole no campo acima</p>
          </div>
          <a
            href="https://console.anthropic.com/account/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-nodri-cyan/30 text-nodri-cyan text-[12px] font-semibold hover:bg-nodri-cyan/10 transition-colors w-fit">
            <ExternalLink size={13}/>
            Acessar console.anthropic.com
          </a>
          <p className="text-[10px] text-nodri-t3 mt-3">
            💡 A chave fica salva com segurança no banco de dados do seu salão e nunca é exibida em tela.
          </p>
        </div>

      </div>
    </div>
  )
}
