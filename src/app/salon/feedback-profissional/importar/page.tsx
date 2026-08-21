'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, CheckCircle, AlertTriangle, ExternalLink, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

interface Formulario { id: string; titulo: string; token: string; ativo: boolean }
interface ImportResult {
  ok: boolean; importados: number; ignorados: number
  erros: string[]; novosProfissionais: string[]; novosOcorridos: string[]; total_linhas: number
}

export default function ImportarPage() {
  const router = useRouter()
  const [formularios, setFormularios] = useState<Formulario[]>([])
  const [formularioId, setFormularioId] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')
  const [csvTexto, setCsvTexto] = useState('')
  const [modo, setModo] = useState<'url' | 'csv'>('url')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetch('/api/feedback-prof/formularios').then(r => r.json()).then(data => {
      setFormularios(data)
      if (data.length > 0) setFormularioId(data[0].id)
    })
  }, [])

  async function importar() {
    if (!formularioId) { toast.error('Selecione um formulário'); return }
    if (modo === 'url' && !sheetUrl) { toast.error('Informe o link da planilha'); return }
    if (modo === 'csv' && !csvTexto) { toast.error('Cole o conteúdo CSV'); return }

    setLoading(true); setResult(null); setErro('')

    const res = await fetch('/api/feedback-prof/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formulario_id: formularioId,
        sheet_url: modo === 'url' ? sheetUrl : undefined,
        csv_texto: modo === 'csv' ? csvTexto : undefined,
      }),
    })

    const data = await res.json()
    if (!res.ok || data.error) { setErro(data.error || 'Erro ao importar'); setLoading(false); return }
    setResult(data)
    setLoading(false)
    toast.success(`${data.importados} registros importados!`)
  }

  return (
    <div className="nodri-salon-bg min-h-screen">
      <nav className="bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3 sticky top-0 z-40 nodri-topo-pagina">
        <button onClick={() => router.push('/salon/feedback-profissional')} className="flex items-center gap-1.5 text-nodri-t2 hover:text-nodri-t1 text-sm">
          <ArrowLeft size={15} /> Feedback Profissional
        </button>
        <div className="w-px h-4 bg-nodri-border" />
        <div className="flex items-center gap-2">
          <Upload size={15} className="text-nodri-cyan" />
          <div>
            <div className="font-syne font-bold text-sm text-nodri-t1">Importar Histórico</div>
            <div className="text-[10px] text-nodri-t3">Google Sheets ou CSV</div>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto p-5 space-y-4">

        {/* INSTRUÇÃO */}
        <div className="p-4 rounded-2xl border" style={{ background: 'rgba(6,182,212,.06)', borderColor: 'rgba(6,182,212,.2)' }}>
          <div className="text-[11px] font-bold text-nodri-cyan mb-2"> Como funciona</div>
          <ul className="text-[11px] text-nodri-t2 space-y-1.5">
            <li>• O sistema lê as colunas: <strong className="text-nodri-t1">PROFISSIONAL, POSITIVO/NEGATIVO, O QUE HOUVE, DESCRIÇÃO</strong></li>
            <li>• Profissionais e ocorridos novos são criados automaticamente</li>
            <li>• A data/hora original da planilha é preservada</li>
            <li>• Pode importar várias vezes sem duplicar (mas não remove duplicatas)</li>
          </ul>
        </div>

        {/* FORMULÁRIO */}
        <div className="p-5 rounded-2xl border" style={{ background: '#ffffff', borderColor: 'rgba(0,0,0,.07)' }}>
          <div className="space-y-4">

            {/* Selecionar formulário */}
            <div>
              <label className="text-[10px] text-nodri-t3 mb-1.5 block uppercase tracking-wider">Formulário de destino</label>
              <select value={formularioId} onChange={e => setFormularioId(e.target.value)}
                className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2.5 text-[12px] text-nodri-t1 outline-none">
                {formularios.map(f => <option key={f.id} value={f.id}>{f.titulo}</option>)}
              </select>
            </div>

            {/* Modo */}
            <div>
              <label className="text-[10px] text-nodri-t3 mb-1.5 block uppercase tracking-wider">Modo de importação</label>
              <div className="flex gap-2">
                <button onClick={() => setModo('url')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold border transition-all ${modo === 'url' ? 'bg-nodri-cyan/10 text-nodri-cyan border-nodri-cyan/30' : 'text-nodri-t2 border-nodri-border hover:text-nodri-t1'}`}>
                  <ExternalLink size={13} /> Link do Google Sheets
                </button>
                <button onClick={() => setModo('csv')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold border transition-all ${modo === 'csv' ? 'bg-nodri-cyan/10 text-nodri-cyan border-nodri-cyan/30' : 'text-nodri-t2 border-nodri-border hover:text-nodri-t1'}`}>
                  <FileText size={13} /> Colar CSV
                </button>
              </div>
            </div>

            {/* Input URL */}
            {modo === 'url' && (
              <div>
                <label className="text-[10px] text-nodri-t3 mb-1.5 block uppercase tracking-wider">Link da planilha Google Sheets</label>
                <input value={sheetUrl} onChange={e => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2.5 text-[12px] text-nodri-t1 placeholder-nodri-t3 outline-none focus:border-nodri-cyan/40" />
                <div className="mt-2 p-3 rounded-xl" style={{ background: 'rgba(250,204,21,.06)', border: '1px solid rgba(250,204,21,.2)' }}>
                  <p className="text-[10px] text-yellow-400 font-bold mb-1">️ A planilha precisa estar pública para importar:</p>
                  <ol className="text-[10px] text-nodri-t2 space-y-0.5 list-decimal pl-4">
                    <li>Abra a planilha no Google Sheets</li>
                    <li>Clique em <strong>Arquivo → Compartilhar → Publicar na Web</strong></li>
                    <li>Selecione a aba → formato <strong>CSV</strong> → Publicar</li>
                    <li>Copie o link gerado e cole aqui</li>
                    <li><strong>OU:</strong> Compartilhar → Qualquer pessoa com o link → Leitor, e cole o link normal</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Input CSV */}
            {modo === 'csv' && (
              <div>
                <label className="text-[10px] text-nodri-t3 mb-1.5 block uppercase tracking-wider">Conteúdo CSV (cole aqui)</label>
                <p className="text-[10px] text-nodri-t3 mb-2">
                  No Google Sheets: <strong className="text-nodri-t1">Arquivo → Fazer download → CSV</strong>. Depois abra o arquivo e cole o conteúdo abaixo.
                </p>
                <textarea value={csvTexto} onChange={e => setCsvTexto(e.target.value)}
                  placeholder={'Carimbo de data/hora,PROFISSIONAL,POSITIVO OU NEGATIVO ?,O QUE HOUVE ?,DESCREVA O OCORRIDO!!\n09/01/2025 18:30:30,LUDSON,POSITIVO,FALTA,TESTE\n12/01/2025 10:40:37,CELIA,NEGATIVO,ATRASO,...'}
                  rows={10}
                  className="w-full bg-nodri-card border border-nodri-border rounded-lg px-3 py-2.5 text-[11px] text-nodri-t1 placeholder-nodri-t3 outline-none focus:border-nodri-cyan/40 resize-none font-mono" />
              </div>
            )}

            {/* Botão importar */}
            <button onClick={importar} disabled={loading || !formularioId}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg,#5b4fcf,#06b6d4)', color: 'white', boxShadow: '0 8px 30px rgba(124,92,252,.3)' }}>
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importando...</>
              ) : (
                <><Upload size={16} /> Importar Dados</>
              )}
            </button>
          </div>
        </div>

        {/* ERRO */}
        {erro && (
          <div className="p-4 rounded-2xl border flex items-start gap-3" style={{ background: 'rgba(239,68,68,.08)', borderColor: 'rgba(239,68,68,.3)' }}>
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-400 text-sm mb-1">Erro na importação</div>
              <p className="text-[12px] text-nodri-t2">{erro}</p>
            </div>
          </div>
        )}

        {/* RESULTADO */}
        {result && (
          <div className="p-5 rounded-2xl border space-y-4" style={{ background: '#f0fff4', borderColor: 'rgba(34,197,94,.25)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-400" />
              <span className="font-bold text-green-400 text-sm">Importação concluída!</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Importados', val: result.importados, cor: '#4ade80' },
                { label: 'Ignorados', val: result.ignorados, cor: '#767069' },
                { label: 'Total lidos', val: result.total_linhas, cor: '#60a5fa' },
              ].map(({ label, val, cor }) => (
                <div key={label} className="p-3 rounded-xl text-center border" style={{ borderColor: `${cor}20`, background: `${cor}08` }}>
                  <div className="text-2xl font-black" style={{ color: cor }}>{val}</div>
                  <div className="text-[10px] text-nodri-t3">{label}</div>
                </div>
              ))}
            </div>

            {result.novosProfissionais.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-green-400 mb-1.5"> Novos profissionais criados ({result.novosProfissionais.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.novosProfissionais.map(p => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(34,197,94,.12)', color: '#15803d', border: '1px solid rgba(34,197,94,.25)' }}>{p}</span>
                  ))}
                </div>
              </div>
            )}

            {result.novosOcorridos.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-cyan-400 mb-1.5"> Novos ocorridos criados ({result.novosOcorridos.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.novosOcorridos.map(o => (
                    <span key={o} className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(6,182,212,.12)', color: '#0891b2', border: '1px solid rgba(6,182,212,.25)' }}>{o}</span>
                  ))}
                </div>
              </div>
            )}

            {result.erros.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-yellow-400 mb-1.5">️ Linhas com problema</div>
                <ul className="space-y-0.5">
                  {result.erros.map((e, i) => <li key={i} className="text-[10px] text-nodri-t2">• {e}</li>)}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={() => router.push('/salon/feedback-profissional')}
                className="flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-all text-nodri-t1 border-nodri-border hover:bg-nodri-surface">
                ← Voltar ao Gerenciamento
              </button>
              <button onClick={() => { setResult(null); setSheetUrl(''); setCsvTexto('') }}
                className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all"
                style={{ background: 'rgba(34,197,94,.12)', color: '#15803d', border: '1px solid rgba(34,197,94,.25)' }}>
                Importar mais dados
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
