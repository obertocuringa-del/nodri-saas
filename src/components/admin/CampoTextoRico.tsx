'use client'

// ─────────────────────────────────────────────────────────────────────────────
// CAMPO DE TEXTO DA FUNCIONALIDADE
//
// Escrever aqui e só descobrir como ficou depois de salvar e abrir a página é
// o caminho para o texto sair torto. Este campo mostra o resultado do lado, do
// mesmo jeito que o visitante vai ver, e tem botões para as três coisas que a
// página entende: subtítulo, lista e destaque.
//
// Não existe código escondido — o que dá formato é a maneira de escrever:
// linha em MAIÚSCULAS vira subtítulo, linhas soltas seguidas viram lista.
// Os botões só escrevem isso para quem não quer decorar a regra.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from 'react'
import { Type, List, Megaphone, Eye, EyeOff } from 'lucide-react'
import TextoFormatado from '@/components/site/TextoFormatado'

const inp = 'w-full px-3 py-2 rounded-lg bg-nodri-surface border border-nodri-border text-[12px] text-nodri-t1 outline-none focus:border-nodri-cyan'

export default function CampoTextoRico({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [verPreview, setVerPreview] = useState(true)

  /** Insere um trecho no lugar do cursor, cercado das linhas em branco certas. */
  function inserir(trecho: string) {
    const el = ref.current
    const texto = valor || ''
    const pos = el ? el.selectionStart : texto.length
    const antes = texto.slice(0, pos).replace(/\n*$/, '')
    const depois = texto.slice(pos).replace(/^\n*/, '')

    const novo = [antes, trecho, depois].filter(Boolean).join('\n\n')
    onChange(novo)

    // devolve o cursor para dentro do que acabou de ser inserido
    setTimeout(() => {
      if (!el) return
      const alvo = (antes ? antes.length + 2 : 0) + trecho.length
      el.focus()
      el.setSelectionRange(alvo, alvo)
    }, 0)
  }

  const botao = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-nodri-border text-[10.5px] font-bold text-nodri-t2 hover:border-nodri-cyan hover:text-nodri-cyan'

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
        <button type="button" className={botao} onClick={() => inserir('TÍTULO DA SEÇÃO')}>
          <Type size={12} /> Subtítulo
        </button>
        <button type="button" className={botao} onClick={() => inserir('Primeiro item\nSegundo item\nTerceiro item')}>
          <List size={12} /> Lista
        </button>
        <button type="button" className={botao} onClick={() => inserir('FRASE DE DESTAQUE')}>
          <Megaphone size={12} /> Destaque
        </button>
        <div className="flex-1" />
        <button type="button" className={botao} onClick={() => setVerPreview(v => !v)}>
          {verPreview ? <><EyeOff size={12} /> Esconder resultado</> : <><Eye size={12} /> Ver resultado</>}
        </button>
      </div>

      <div className={verPreview ? 'grid gap-2 md:grid-cols-2' : ''}>
        <textarea ref={ref} className={inp + ' resize-y'} rows={verPreview ? 16 : 6} value={valor}
          placeholder={'Escreva aqui.\n\nDeixe uma linha em branco entre os parágrafos.\nUma linha em MAIÚSCULAS vira subtítulo.\nVárias linhas curtas seguidas viram uma lista.'}
          onChange={e => onChange(e.target.value)} />

        {verPreview && (
          <div className="rounded-lg border border-nodri-border bg-white p-3 overflow-y-auto" style={{ maxHeight: 420 }}>
            <div className="text-[9.5px] font-bold uppercase tracking-wider text-nodri-t3 mb-2">Como vai aparecer na página</div>
            {valor?.trim()
              ? <TextoFormatado texto={valor} />
              : <p className="text-[11px] text-nodri-t3">O resultado aparece aqui conforme você escreve.</p>}
          </div>
        )}
      </div>

      <p className="text-[10px] text-nodri-t3 mt-1.5 leading-relaxed">
        Linha em MAIÚSCULAS vira <b>subtítulo</b>. Linhas curtas seguidas, sem ponto no fim, viram <b>lista</b>.
        Uma linha em branco separa os <b>parágrafos</b>.
      </p>
    </div>
  )
}
