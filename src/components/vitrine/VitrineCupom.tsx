'use client'

import { useState } from 'react'
import { Loader2, Check, Copy, Ticket, Share2, ImageDown } from 'lucide-react'
import { desenharCupom } from '@/lib/cupomArte'

// ── A cliente pega o cupom dela ─────────────────────────────────────────────
//
// Um campo só na primeira tela: o telefone. É ele que identifica — nome
// repete, e duas clientes com o mesmo nome receberiam cupons trocados.
//
// O nome só é pedido de quem o salão ainda não conhece, e só depois do
// telefone. Pedir tudo de uma vez faria a cliente antiga preencher dado que o
// salão já tem.

interface Props {
  slug: string
  percentual: number
  validoAte: string | null
  /** Identidade de QUEM compartilha a arte — do salão, nunca do sistema. */
  nomeSalao: string
  logo: string | null
}

type Tela = 'telefone' | 'nome' | 'pronto'

function mascara(v: string): string {
  const d = v.replace(/\D+/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function dataCurta(iso: string | null): string {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export default function VitrineCupom({ slug, percentual, validoAte, nomeSalao, logo }: Props) {
  const [tela, setTela] = useState<Tela>('telefone')
  const [telefone, setTelefone] = useState('')
  const [nome, setNome] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [montandoArte, setMontandoArte] = useState(false)
  const [cupom, setCupom] = useState<{
    codigo: string; nome: string; indicadas: number; compareceram: number
  } | null>(null)

  async function buscar(comNome?: string) {
    setCarregando(true); setErro('')
    try {
      const r = await fetch(`/api/promocoes/${slug}/cupom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone, nome: comNome || undefined }),
      })
      const j = await r.json()
      if (!r.ok) { setErro(j?.error || 'Não deu certo. Tente de novo.'); return }

      if (j.situacao === 'precisa_nome') { setTela('nome'); return }
      setCupom({ codigo: j.codigo, nome: j.nome, indicadas: j.indicadas || 0, compareceram: j.compareceram || 0 })
      setTela('pronto')
    } catch {
      setErro('Sem conexão. Tente de novo.')
    } finally {
      setCarregando(false)
    }
  }

  async function copiar() {
    if (!cupom) return
    try {
      await navigator.clipboard.writeText(cupom.codigo)
      setCopiado(true); setTimeout(() => setCopiado(false), 2200)
    } catch {
      // Em navegador que bloqueia a área de transferência o código continua
      // na tela, grande, para a cliente ler e digitar. Nada se perde.
      setErro('Não deu para copiar aqui. Anote o código acima.')
    }
  }

  function textoDoConvite(codigo: string) {
    return `Use meu cupom ${codigo} e ganhe ${percentual}% de desconto na sua primeira visita no ${nomeSalao}!`
  }

  /**
   * Compartilhar levando a ARTE junto.
   *
   * Texto solto some no meio da conversa; a imagem a pessoa olha e às vezes
   * reposta -- que é o que faz a indicação circular. A arte é desenhada aqui
   * no aparelho, então não custa nada ao servidor.
   *
   * Três caminhos, nessa ordem, porque nem todo navegador faz o primeiro:
   * compartilhar com arquivo, compartilhar só o texto, abrir o WhatsApp Web.
   * Em todos eles o código continua grande na tela -- nada se perde.
   */
  async function compartilhar() {
    if (!cupom) return
    const texto = textoDoConvite(cupom.codigo)
    setMontandoArte(true)
    try {
      const blob = await desenharCupom({
        codigo: cupom.codigo, nomeSalao, logo, percentual, validoAte,
      })
      if (blob && navigator.canShare) {
        const arquivo = new File([blob], `cupom-${cupom.codigo}.png`, { type: 'image/png' })
        if (navigator.canShare({ files: [arquivo] })) {
          await navigator.share({ files: [arquivo], text: texto })
          return
        }
      }
      if (navigator.share) { await navigator.share({ text: texto }); return }
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
    } catch {
      // Cancelar o compartilhamento cai aqui e não é erro: a pessoa desistiu.
    } finally {
      setMontandoArte(false)
    }
  }

  /** No computador o compartilhar do sistema quase nunca existe. Baixar a
   *  arte resolve: ela anexa no WhatsApp Web como faria com qualquer foto. */
  async function baixarArte() {
    if (!cupom) return
    setMontandoArte(true)
    try {
      const blob = await desenharCupom({
        codigo: cupom.codigo, nomeSalao, logo, percentual, validoAte,
      })
      if (!blob) { setErro('Não deu para montar a imagem neste aparelho.'); return }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `cupom-${cupom.codigo}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } finally {
      setMontandoArte(false)
    }
  }

  const botao = 'w-full py-3.5 rounded-xl font-semibold text-[15px] text-white bg-[var(--vt-cor)] disabled:opacity-50 transition'
  const campo = 'w-full px-4 py-3.5 rounded-xl border border-gray-300 text-[16px] outline-none focus:border-[var(--vt-cor)] transition'

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-7">

        {tela !== 'pronto' && (
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[var(--vt-cor)]/10 flex items-center justify-center mx-auto mb-3">
              <Ticket size={26} className="text-[var(--vt-cor)]" />
            </div>
            <h2 className="font-bold text-[19px] text-gray-900">Seu cupom de indicação</h2>
            <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">
              Indique quem você quiser. Quem usar o seu cupom ganha {percentual}% na
              primeira visita — e você ganha {percentual}% por cada uma que vier.
            </p>
          </div>
        )}

        {tela === 'telefone' && (
          <form onSubmit={e => { e.preventDefault(); buscar() }}>
            <label className="block text-[13px] font-semibold text-gray-700 mb-2">Seu celular</label>
            <input
              value={mascara(telefone)}
              onChange={e => setTelefone(e.target.value)}
              placeholder="(61) 99999-9999"
              inputMode="tel"
              autoFocus
              className={campo}
            />
            <p className="text-[12px] text-gray-400 mt-2 mb-4">
              Se você já tem cupom, ele aparece aqui — é sempre o mesmo código.
            </p>
            {erro && <p className="text-[13px] text-red-600 mb-3">{erro}</p>}
            <button type="submit" disabled={carregando || telefone.replace(/\D+/g, '').length < 10} className={botao}>
              {carregando ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Continuar'}
            </button>
          </form>
        )}

        {tela === 'nome' && (
          <form onSubmit={e => { e.preventDefault(); buscar(nome) }}>
            <p className="text-[13px] text-gray-600 mb-4 bg-gray-50 rounded-lg px-3 py-2.5">
              É a sua primeira vez por aqui. Só falta o seu nome.
            </p>
            <label className="block text-[13px] font-semibold text-gray-700 mb-2">Nome completo</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Maria Silva"
              autoFocus
              className={campo}
            />
            {erro && <p className="text-[13px] text-red-600 mt-3">{erro}</p>}
            <button type="submit" disabled={carregando || nome.trim().length < 3} className={botao + ' mt-4'}>
              {carregando ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Gerar cupom'}
            </button>
            <button type="button" onClick={() => { setTela('telefone'); setErro('') }}
              className="w-full text-[13px] text-gray-400 mt-3 py-1">
              Voltar
            </button>
          </form>
        )}

        {tela === 'pronto' && cupom && (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <Check size={24} className="text-green-600" />
            </div>
            <p className="text-[13px] text-gray-500">Cupom de</p>
            <p className="font-bold text-[16px] text-gray-900 mb-5">{cupom.nome}</p>

            {/* O código é o que ela vai ditar no WhatsApp: grande, espaçado e
                em fonte de largura fixa, para não confundir caractere. */}
            <div className="bg-[var(--vt-cor)]/5 border-2 border-dashed border-[var(--vt-cor)]/30 rounded-xl py-5 px-3 mb-4">
              <p className="font-mono font-bold text-[30px] sm:text-[34px] tracking-[0.12em] text-[var(--vt-cor)] break-all">
                {cupom.codigo}
              </p>
            </div>

            <div className="flex gap-2 mb-2">
              <button onClick={copiar}
                className="flex-1 py-3 rounded-xl border border-gray-300 font-semibold text-[14px] text-gray-700 flex items-center justify-center gap-2">
                {copiado ? <><Check size={16} className="text-green-600" /> Copiado</> : <><Copy size={16} /> Copiar</>}
              </button>
              <button onClick={compartilhar} disabled={montandoArte}
                className="flex-1 py-3 rounded-xl font-semibold text-[14px] text-white bg-[var(--vt-cor)] flex items-center justify-center gap-2 disabled:opacity-60">
                {montandoArte
                  ? <Loader2 size={16} className="animate-spin" />
                  : <><Share2 size={16} /> Enviar</>}
              </button>
            </div>
            <button onClick={baixarArte} disabled={montandoArte}
              className="w-full py-2.5 mb-5 text-[13px] text-gray-500 flex items-center justify-center gap-1.5 disabled:opacity-50">
              <ImageDown size={15} /> Baixar a arte do cupom
            </button>

            {cupom.indicadas > 0 && (
              <div className="border-t border-gray-100 pt-4 text-[13px] text-gray-600">
                Você já indicou <b>{cupom.indicadas}</b>
                {cupom.compareceram > 0 && <> · <b>{cupom.compareceram}</b> já {cupom.compareceram === 1 ? 'veio' : 'vieram'}</>}
                <p className="text-[12px] text-gray-400 mt-1">
                  Peça o seu desconto na recepção, na sua próxima visita.
                </p>
              </div>
            )}

            {erro && <p className="text-[13px] text-amber-600 mt-3">{erro}</p>}

            <button onClick={() => { setTela('telefone'); setCupom(null); setTelefone(''); setNome(''); setErro('') }}
              className="text-[13px] text-gray-400 mt-4 py-1">
              Consultar outro número
            </button>
          </div>
        )}
      </div>

      <p className="text-[11.5px] text-gray-400 text-center mt-4 leading-relaxed px-4">
        O desconto vale uma vez por pessoa indicada, na primeira visita dela.
        {validoAte && <> Válido até {dataCurta(validoAte)}.</>}
      </p>
    </div>
  )
}
