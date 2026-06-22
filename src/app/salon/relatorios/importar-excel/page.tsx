'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

function sheetToJson(wb: XLSX.WorkBook, name: string): any[] {
  const ws = wb.Sheets[name]
  if (!ws) return []
  return XLSX.utils.sheet_to_json(ws, { defval: null })
}

export default function ImportarExcelPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [resultado, setResultado] = useState<any>(null)
  const [arrastando, setArrastando] = useState(false)
  const [resetando, setResetando] = useState(false)
  const [reconstruindo, setReconstruindo] = useState(false)
  const [resultadoReconstrucao, setResultadoReconstrucao] = useState<any>(null)

  async function reconstruirDoRaw() {
    if (!confirm('Reconstruir faturamento, clientes e serviços a partir dos atendimentos brutos?')) return
    setReconstruindo(true)
    setResultadoReconstrucao(null)
    try {
      const res = await fetch('/api/relatorios/reconstruir-do-raw', { method: 'POST' })
      const data = await res.json()
      setResultadoReconstrucao(data)
      if (data.ok) toast.success(`${data.meses_reconstruidos} meses reconstruídos com sucesso!`)
      else toast.error('Erro: ' + data.error)
    } catch {
      toast.error('Erro de conexão')
    }
    setReconstruindo(false)
  }

  async function resetarTudo() {
    if (!confirm('Apagar TODOS os dados de relatório do banco? Você precisará reimportar tudo.')) return
    setResetando(true)
    const res = await fetch('/api/relatorios/reset', { method: 'DELETE' })
    const data = await res.json()
    localStorage.removeItem('nodri_relatorios_v2')
    setResetando(false)
    if (data.ok) {
      const d = data.deletados || {}
      toast.success(
        `Banco limpo! Removidos: ${d.relatorio_periodos ?? 0} períodos · ${d.atendimentos_raw ?? 0} atendimentos · ${d.agendamentos_raw ?? 0} agendamentos · ${(d.clientes_perfil ?? 0) + (d.clientes_resumo_mensal ?? 0)} perfis de clientes`
      )
      if (data.erros) {
        toast.error('Algumas tabelas não foram limpas: ' + Object.entries(data.erros).map(([t, m]) => `${t} (${m})`).join(' · '), { duration: 8000 })
      }
    } else toast.error('Erro ao resetar: ' + data.error)
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
    setProgresso('Lendo arquivo Excel...')

    try {
      // ── 1. Parsear Excel no browser ──────────────────────────────────────
      const buffer = await arquivo.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', cellDates: false, raw: true })

      setProgresso('Extraindo dados das abas...')

      const periodos        = sheetToJson(wb, 'PERIODOS')
      const resumo          = sheetToJson(wb, 'RESUMO_MENSAL')
      const fatDiario       = sheetToJson(wb, 'FATURAMENTO_DIARIO')
      const servicos        = sheetToJson(wb, 'SERVICOS')
      const produtos        = sheetToJson(wb, 'PRODUTOS')
      const profPag         = sheetToJson(wb, 'PROF_PAGAMENTOS')
      const profTicket      = sheetToJson(wb, 'PROF_TICKET')
      const profPref        = sheetToJson(wb, 'PROF_PREFERENCIA')
      const profOcup        = sheetToJson(wb, 'PROF_OCUPACAO')
      const profServicos    = sheetToJson(wb, 'PROF_SERVICOS')
      const profProdutos    = sheetToJson(wb, 'PROF_PRODUTOS')
      const metas           = sheetToJson(wb, 'METAS')
      const feedbacks       = sheetToJson(wb, 'FEEDBACK')
      const atendimentosRaw = sheetToJson(wb, 'ATENDIMENTOS_RAW')
      const agendamentosRaw = sheetToJson(wb, 'AGENDAMENTOS_RAW')

      // ── 2. Enviar dados agregados (rápido) ───────────────────────────────
      setProgresso(`Salvando ${periodos.length} períodos no banco...`)

      const res1 = await fetch('/api/relatorios/importar-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodos, resumo, fatDiario, servicos, produtos, profPag, profTicket, profPref, profOcup, profServicos, profProdutos, metas, feedbacks }),
      })
      const data1 = await res1.json()
      if (!data1.ok) {
        setResultado(data1)
        setCarregando(false)
        return
      }

      // ── 3. Enviar atendimentos_raw em lotes ──────────────────────────────
      let rawSalvos = 0
      if (atendimentosRaw.length > 0) {
        const CHUNK = 500
        const totalChunks = Math.ceil(atendimentosRaw.length / CHUNK)

        // Determina períodos a limpar (primeiro chunk faz o delete)
        const periodosParaLimpar = Array.from(
          new Set(atendimentosRaw.map((r: any) => `${Number(r.ano)}-${Number(r.mes)}`))
        ).map(k => { const [ano, mes] = (k as string).split('-'); return { ano: Number(ano), mes: Number(mes) } })

        for (let i = 0; i < totalChunks; i++) {
          const chunk = atendimentosRaw.slice(i * CHUNK, (i + 1) * CHUNK)
          setProgresso(`Salvando atendimentos: ${Math.min((i+1)*CHUNK, atendimentosRaw.length)} de ${atendimentosRaw.length}...`)

          const res2 = await fetch('/api/relatorios/importar-atendimentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rows: chunk,
              periodos_para_limpar: i === 0 ? periodosParaLimpar : [],
              ultimo_chunk: i === totalChunks - 1,
            }),
          })
          const data2 = await res2.json()
          if (!data2.ok) {
            toast.error('Erro ao salvar atendimentos: ' + data2.error)
            break
          }
          rawSalvos += data2.salvos || 0
        }

        // ── 4. NÃO reconstruir do raw aqui ────────────────────────────────
        // A planilha já traz RESUMO_MENSAL, FATURAMENTO_DIARIO, SERVICOS e
        // PROF_SERVICOS completos (com produtos). O reconstruir-do-raw recalcula
        // tudo a partir do 0031 (só serviços) e SUBCONTAVA o faturamento total,
        // ticket, clientes e fat. serviços. Os dados oficiais do Excel ficam intactos.
      }

      // ── 5. Enviar agendamentos_raw em lotes ─────────────────────────────
      let agendSalvos = 0
      if (agendamentosRaw.length > 0) {
        const CHUNK = 500
        const totalChunks = Math.ceil(agendamentosRaw.length / CHUNK)
        const periodosParaLimpar = Array.from(
          new Set(agendamentosRaw.map((r: any) => `${Number(r.ano)}-${Number(r.mes)}`))
        ).map(k => { const [ano, mes] = (k as string).split('-'); return { ano: Number(ano), mes: Number(mes) } })

        for (let i = 0; i < totalChunks; i++) {
          const chunk = agendamentosRaw.slice(i * CHUNK, (i + 1) * CHUNK)
          setProgresso(`Salvando agendamentos: ${Math.min((i+1)*CHUNK, agendamentosRaw.length)} de ${agendamentosRaw.length}...`)
          const resA = await fetch('/api/relatorios/importar-agendamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rows: chunk,
              periodos_para_limpar: i === 0 ? periodosParaLimpar : [],
            }),
          })
          const dataA = await resA.json()
          if (!dataA.ok) { toast.error('Erro ao salvar agendamentos: ' + dataA.error); break }
          agendSalvos += dataA.salvos || 0
        }
      }

      localStorage.removeItem('nodri_relatorios_v2')
      setProgresso('')
      setResultado({ ...data1, atendimentos_raw_salvos: rawSalvos, agendamentos_salvos: agendSalvos })
      toast.success(`${data1.periodos_salvos} períodos importados!`)

    } catch (e: any) {
      toast.error('Erro: ' + (e?.message || 'conexão'))
      setProgresso('')
    }
    setCarregando(false)
  }

  return (
    <div className="min-h-screen" style={{ background: '#f5f4f0' }}>
      {/* Header */}
      <div className="sticky top-0 z-20 border-b px-5 py-3 flex items-center gap-3"
        style={{ background: '#ffffff', borderColor: '#e0ddd8' }}>
        <button onClick={() => router.push('/salon')}
          className="flex items-center gap-1.5 transition-colors text-sm"
          style={{ color: '#6b6860' }}>
          <ArrowLeft size={15} /> Voltar
        </button>
        <div className="w-px h-5" style={{ background: '#e0ddd8' }} />
        <FileSpreadsheet size={15} style={{ color: '#16a34a' }} />
        <h1 className="font-syne font-bold text-[15px]" style={{ color: '#1a1a1a' }}>Importar Excel de Dados</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-10">
        {/* Info */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: '#f0eefb', border: '1.5px solid #c4bef0' }}>
          <h2 className="font-syne font-bold text-[13px] mb-2" style={{ color: '#5b4fcf' }}>O que será importado</h2>
          <div className="grid grid-cols-2 gap-2 text-[11px]" style={{ color: '#6b6860' }}>
            {['Faturamento por profissional','Ticket Médio','Clientes Preferência','Ocupação e Dias Trabalhados',
              'Serviços detalhados','Produtos','Feedbacks históricos','Resumo mensal'].map(item => (
              <div key={item}>✓ {item}</div>
            ))}
          </div>
          <p className="text-[10px] mt-3" style={{ color: '#767069' }}>
            Arquivo: <strong style={{ color: '#3a3835' }}>base_dados_nodri.xlsx</strong> — dados serão substituídos por período
          </p>
        </div>

        {/* Dropzone */}
        <div
          className="border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer"
          style={{
            borderColor: arrastando ? '#5b4fcf' : arquivo ? '#16a34a' : '#d0cdc7',
            background: arrastando ? '#f0eefb' : arquivo ? '#f0fdf4' : '#ffffff',
          }}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setArrastando(true) }}
          onDragLeave={() => setArrastando(false)}
          onDrop={e => { e.preventDefault(); setArrastando(false); const f = e.dataTransfer.files[0]; if (f) selecionarArquivo(f) }}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { if (e.target.files?.[0]) selecionarArquivo(e.target.files[0]) }} />

          {arquivo ? (
            <div>
              <CheckCircle size={40} className="mx-auto mb-3" style={{ color: '#16a34a' }} />
              <p className="font-syne font-bold text-[14px]" style={{ color: '#1a1a1a' }}>{arquivo.name}</p>
              <p className="text-[11px] mt-1" style={{ color: '#6b6860' }}>{(arquivo.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          ) : (
            <div>
              <Upload size={40} className="mx-auto mb-3" style={{ color: '#9e9b94' }} />
              <p className="font-syne font-bold text-[14px]" style={{ color: '#1a1a1a' }}>Arraste o arquivo aqui</p>
              <p className="text-[11px] mt-1" style={{ color: '#6b6860' }}>ou clique para selecionar o <strong>base_dados_nodri.xlsx</strong></p>
            </div>
          )}
        </div>

        {/* Botão Reconstruir do Raw */}
        <button onClick={reconstruirDoRaw} disabled={reconstruindo}
          className="w-full mt-4 py-3 rounded-xl text-[13px] font-syne font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', color: '#b45309' }}>
          {reconstruindo ? <><Loader2 size={16} className="animate-spin" /> Reconstruindo dados...</> : '🔧 Reconstruir dados a partir dos atendimentos brutos'}
        </button>

        {resultadoReconstrucao && (
          <div className="mt-3 p-4 rounded-xl border text-[12px]"
            style={{ background: resultadoReconstrucao.ok ? '#fef3c7' : '#fef2f2', borderColor: resultadoReconstrucao.ok ? '#f59e0b' : '#fca5a5' }}>
            {resultadoReconstrucao.ok ? (
              <div>
                <div className="font-bold mb-2" style={{ color: '#b45309' }}>✅ {resultadoReconstrucao.meses_reconstruidos} meses reconstruídos!</div>
                {resultadoReconstrucao.detalhes?.map((d: any) => (
                  <div key={d.chave} className="text-[11px]" style={{ color: '#6b6860' }}>
                    {d.erro ? `❌ ${d.chave}: ${d.erro}` : `✓ ${d.chave} — ${d.atendimentos} atend. | R$ ${d.faturamento?.toLocaleString('pt-BR')} | ${d.clientes} clientes`}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#dc2626' }}>{resultadoReconstrucao.error}</div>
            )}
          </div>
        )}

        {/* Botão Reset */}
        <button onClick={resetarTudo} disabled={resetando}
          className="w-full mt-4 py-2 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ border: '1.5px solid #fca5a5', color: '#dc2626', background: '#fff5f5' }}>
          {resetando ? <><Loader2 size={14} className="animate-spin" /> Limpando banco...</> : '🗑 Limpar todos os dados antes de reimportar'}
        </button>

        {/* Botão Importar */}
        <button onClick={enviar} disabled={!arquivo || carregando}
          className="w-full mt-4 py-4 rounded-xl font-syne font-bold text-[15px] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: carregando ? '#8b80e8' : '#5b4fcf', color: '#ffffff' }}>
          {carregando ? (
            <><Loader2 size={18} className="animate-spin" /> {progresso || 'Importando...'}</>
          ) : (
            <><Upload size={18} /> Importar Dados para o Sistema</>
          )}
        </button>

        {carregando && progresso && (
          <div className="mt-3 text-center text-[12px]" style={{ color: '#6b6860' }}>
            {progresso}
          </div>
        )}

        {/* Resultado */}
        {resultado && (
          <div className="mt-5 p-5 rounded-2xl border"
            style={{ background: resultado.ok ? '#f0fdf4' : '#fef2f2', borderColor: resultado.ok ? '#86efac' : '#fca5a5' }}>
            {resultado.ok ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={18} style={{ color: '#16a34a' }} />
                  <span className="font-syne font-bold text-[14px]" style={{ color: '#15803d' }}>Importação concluída!</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[12px]">
                  <div className="rounded-xl p-3" style={{ background: '#ffffff', border: '1px solid #e0ddd8' }}>
                    <div className="text-[9px] uppercase mb-1" style={{ color: '#767069' }}>Períodos salvos</div>
                    <div className="font-syne font-bold text-[22px]" style={{ color: '#5b4fcf' }}>{resultado.periodos_salvos}</div>
                    <div className="text-[9px]" style={{ color: '#767069' }}>de {resultado.total_periodos} total</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: '#ffffff', border: '1px solid #e0ddd8' }}>
                    <div className="text-[9px] uppercase mb-1" style={{ color: '#767069' }}>Feedbacks salvos</div>
                    <div className="font-syne font-bold text-[22px]" style={{ color: '#16a34a' }}>{resultado.feedbacks_salvos}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: '#ffffff', border: '1px solid #e0ddd8' }}>
                    <div className="text-[9px] uppercase mb-1" style={{ color: '#767069' }}>Atendimentos</div>
                    <div className="font-syne font-bold text-[22px]" style={{ color: '#0891b2' }}>{resultado.atendimentos_raw_salvos || 0}</div>
                  </div>
                </div>
                {resultado.erros?.length > 0 && (
                  <div className="mt-3 text-[11px]" style={{ color: '#b45309' }}>
                    <strong>⚠ {resultado.erros.length} erros:</strong>
                    {resultado.erros.slice(0,3).map((e: string) => <div key={e}>• {e}</div>)}
                  </div>
                )}
                <p className="text-[11px] mt-3" style={{ color: '#6b6860' }}>
                  ✓ Acesse o perfil de qualquer profissional → aba Faturamento para ver os dados!
                </p>
              </>
            ) : (
              <div className="flex items-start gap-2">
                <AlertCircle size={16} style={{ color: '#dc2626' }} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[13px]" style={{ color: '#dc2626' }}>Erro na importação</p>
                  <p className="text-[11px] mt-1" style={{ color: '#6b6860' }}>{resultado.error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
