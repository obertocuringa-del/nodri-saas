'use client'
import { useState } from 'react'
import { X, Send } from 'lucide-react'
import SeletorQuando from './SeletorQuando'
import { mensagemInteresseAcao, linkWhatsapp } from '@/lib/vitrineCliente'

// "Quero agendar" de uma promoção: mesmo caminho do agendamento normal —
// dia, hora e preferência de profissional — antes de abrir o WhatsApp.
//
// A diferença é a preferência: a promoção não tem serviço vinculado, então não
// existe lista de quem está habilitado. Aqui o cliente digita o nome, e a
// recepção confere na hora de confirmar.

export default function ModalAgendarAcao({ titulos, descricao, whatsapp, onFechar }: {
  titulos: string[]
  descricao?: string
  whatsapp: string | null
  onFechar: () => void
}) {
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [temPreferencia, setTemPreferencia] = useState<boolean | null>(null)
  const [profissional, setProfissional] = useState('')

  // Só libera o envio quando a resposta sobre profissional foi dada — e, se
  // foi "sim", quando o nome está escrito. Sem isso a mensagem sairia dizendo
  // "com " e um espaço em branco.
  const respondeu = temPreferencia === false || (temPreferencia === true && profissional.trim().length > 0)
  const podeEnviar = !!data && !!hora && respondeu

  function enviar() {
    if (!podeEnviar) return
    const texto = mensagemInteresseAcao({
      titulos,
      descricao,
      data,
      hora,
      profissional: temPreferencia ? profissional.trim() : null,
    })
    window.open(linkWhatsapp(whatsapp, texto), '_blank')
    onFechar()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onFechar}>
      <div className="bg-[#f7f7f8] w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-start gap-2">
          <div className="flex-1">
            <p className="font-bold text-[14px] text-gray-900">Quero agendar</p>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {titulos.length > 1 ? `${titulos.length} promoções` : titulos[0]}
            </p>
          </div>
          <button onClick={onFechar} className="text-gray-400 shrink-0"><X size={19} /></button>
        </div>

        <div className="p-4">
          <SeletorQuando data={data} hora={hora} onData={setData} onHora={setHora} />

          {data && hora && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-3">
              <p className="font-bold text-[13px] text-gray-900 mb-3">Tem preferência por profissional?</p>

              <div className="flex gap-2 mb-3">
                <button onClick={() => { setTemPreferencia(false); setProfissional('') }}
                  className={'flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all '
                    + (temPreferencia === false
                      ? 'bg-[var(--vt-cor)] text-white border-transparent'
                      : 'border-gray-200 text-gray-600')}>
                  Não
                </button>
                <button onClick={() => setTemPreferencia(true)}
                  className={'flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all '
                    + (temPreferencia === true
                      ? 'bg-[var(--vt-cor)] text-white border-transparent'
                      : 'border-gray-200 text-gray-600')}>
                  Sim
                </button>
              </div>

              {temPreferencia === true && (
                <input value={profissional} onChange={e => setProfissional(e.target.value)}
                  placeholder="Nome do profissional" autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[var(--vt-cor)]" />
              )}
            </div>
          )}

          <button onClick={enviar} disabled={!podeEnviar}
            className="w-full flex items-center justify-center gap-2 bg-[var(--vt-cor)] text-white py-3 rounded-xl text-[14px] font-semibold disabled:opacity-40">
            <Send size={16} /> Enviar pedido
          </button>
        </div>
      </div>
    </div>
  )
}
