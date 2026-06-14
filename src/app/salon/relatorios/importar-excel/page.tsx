'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ImportarExcelPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [arrastando, setArrastando] = useState(false)
  const [resetando, setResetando] = useState(false)

  async function resetarTudo() {
    if (!confirm('Apagar TODOS os dados de relatório do banco? Você precisará reimportar tudo.')) return
    setResetando(true)
    const res = await fetch('/api/relatorios/reset', { method: 'DELETE' })
    const data = await res.json()
    setResetando(false)
    if (data.ok) toast.success(`Banco limpo! ${data.deletados} períodos removidos. Agora reimporte os arquivos.`)
    else toast.error('Erro ao resetar: ' + data.error)
  }

  function selecionarArquivo(f: File) {
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      toast.error('Selecione um arquivo Excel (.xlsx)')
      return
    }
    setArquivo(f)
    setResultado(null)
  }

  async function enviar() {
    if (!arquivo) { toast.error('Selecione o arquivo primeiro'); return }
    setCarregando(true)
    setResultado(null)

    const form = new FormData()
    form.append('arquivo', arquivo)

    try {
      const res = await fetch('/api/relatorios/importar-excel', { method: 'POST', body: form })
      const data = await res.json()
      setResultado(data)
      if (data.ok) toast.success(` ${data.periodos_salvos} períodos importados!`)
      else toast.error('Erro na importação')
    } catch (e) {
      toast.error('Erro de conexão')
    }
    setCarregando(false)
  }

  return (
    <div className="min-h-screen bg-nodri-dark">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-nodri-surface border-b border-nodri-border px-5 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/salon')}
          className="flex items-center gap-1.5 text-nodri-t2 hover:text-nodri-cyan transition-colors text-sm">
          <ArrowLeft size={15} /> Voltar
        </button>
        <div className="w-px h-5 bg-nodri-border" />
        <FileSpreadsheet size={15} className="text-nodri-green" />
        <h1 className="font-syne font-bold text-[15px]">Importar Excel de Dados</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-10">
        {/* Info */}
        <div className="bg-nodri-cyan/8 border border-nodri-cyan/20 rounded-2xl p-5 mb-6">
          <h2 className="font-syne font-bold text-[13px] text-nodri-cyan mb-2"> O que será importado</h2>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-nodri-t2">
            {[' Faturamento por profissional',' Ticket Médio',' Clientes Preferência',' Ocupação e Dias Trabalhados',
              ' Serviços detalhados',' Produtos',' Feedbacks históricos',' Resumo mensal'].map(item => (
              <div key={item}>{item}</div>
            ))}
          </div>
          <p className="text-[10px] text-nodri-t3 mt-3">
            Arquivo: <strong className="text-nodri-t2">base_dados_nodri.xlsx</strong> — dados serão substituídos por período
          </p>
        </div>

        {/* Dropzone */}
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer
            ${arrastando ? 'border-nodri-cyan bg-nodri-cyan/8' : 'border-nodri-border hover:border-nodri-cyan/50'}
            ${arquivo ? 'bg-nodri-green/5 border-nodri-green/40' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setArrastando(true) }}
          onDragLeave={() => setArrastando(false)}
          onDrop={e => { e.preventDefault(); setArrastando(false); const f = e.dataTransfer.files[0]; if (f) selecionarArquivo(f) }}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { if (e.target.files?.[0]) selecionarArquivo(e.target.files[0]) }} />

          {arquivo ? (
            <div>
              <CheckCircle size={40} className="mx-auto mb-3 text-nodri-green" />
              <p className="font-syne font-bold text-[14px] text-nodri-t1">{arquivo.name}</p>
              <p className="text-[11px] text-nodri-t3 mt-1">{(arquivo.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          ) : (
            <div>
              <Upload size={40} className="mx-auto mb-3 text-nodri-t3" />
              <p className="font-syne font-bold text-[14px] text-nodri-t1">Arraste o arquivo aqui</p>
              <p className="text-[11px] text-nodri-t3 mt-1">ou clique para selecionar o <strong>base_dados_nodri.xlsx</strong></p>
            </div>
          )}
        </div>

        {/* Botão Reset */}
        <button onClick={resetarTudo} disabled={resetando}
          className="w-full mt-4 py-2 rounded-xl border border-nodri-red/40 text-nodri-red text-[12px] font-semibold
            hover:bg-nodri-red/10 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
          {resetando ? <><Loader2 size={14} className="animate-spin" /> Limpando banco...</> : '🗑 Limpar todos os dados antes de reimportar'}
        </button>

        {/* Botão */}
        <button onClick={enviar} disabled={!arquivo || carregando}
          className="w-full mt-4 py-3 rounded-xl bg-nodri-cyan text-nodri-dark font-syne font-bold text-[14px]
            hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
          {carregando ? (
            <><Loader2 size={18} className="animate-spin" /> Importando... aguarde</>
          ) : (
            <><Upload size={18} /> Importar Dados para o Sistema</>
          )}
        </button>

        {/* Resultado */}
        {resultado && (
          <div className={`mt-5 p-5 rounded-2xl border ${resultado.ok
            ? 'bg-nodri-green/8 border-nodri-green/25' : 'bg-nodri-red/8 border-nodri-red/25'}`}>
            {resultado.ok ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={18} className="text-nodri-green" />
                  <span className="font-syne font-bold text-[14px] text-nodri-green">Importação concluída!</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div className="bg-nodri-card border border-nodri-border rounded-xl p-3">
                    <div className="text-[9px] text-nodri-t3 uppercase mb-1">Períodos salvos</div>
                    <div className="font-syne font-bold text-[22px] text-nodri-cyan">{resultado.periodos_salvos}</div>
                    <div className="text-[9px] text-nodri-t3">de {resultado.total_periodos} total</div>
                  </div>
                  <div className="bg-nodri-card border border-nodri-border rounded-xl p-3">
                    <div className="text-[9px] text-nodri-t3 uppercase mb-1">Feedbacks salvos</div>
                    <div className="font-syne font-bold text-[22px] text-nodri-green">{resultado.feedbacks_salvos}</div>
                  </div>
                </div>
                {resultado.erros?.length > 0 && (
                  <div className="mt-3 text-[11px] text-nodri-amber">
                    <strong> {resultado.erros.length} erros:</strong>
                    {resultado.erros.slice(0,3).map((e: string) => <div key={e}>• {e}</div>)}
                  </div>
                )}
                <p className="text-[11px] text-nodri-t3 mt-3">
                   Agora acesse o perfil de qualquer profissional → aba Faturamento para ver os dados!
                </p>
              </>
            ) : (
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-nodri-red shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[13px] text-nodri-red">Erro na importação</p>
                  <p className="text-[11px] text-nodri-t2 mt-1">{resultado.error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
