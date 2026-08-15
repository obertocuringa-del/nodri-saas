'use client'

import { Lock } from 'lucide-react'
import { moduloPorChave, planoMinimoPara, type ChaveModulo } from '@/lib/planosModulos'

interface Props {
  /** Módulo que alimenta esta seção. */
  modulo: ChaveModulo
  /** O que deixa de aparecer, na voz do salão: "o ranking da corrida". */
  oQue: string
  /** Deixa o aviso discreto, para usar dentro de um card já existente. */
  compacto?: boolean
}

// Aviso que ocupa o lugar de uma seção da VERSÃO BASE alimentada por dado de
// módulo. Existe por uma regra: nenhuma tela pode abrir vazia por falta de
// dado de outro módulo.
//
// A Corrida Interna é da base, mas o ranking sai de `relatorio_periodos`, que
// só existe com a importação dos Relatórios. Sem este aviso, quem paga o
// plano Inicial abriria a corrida e veria uma lista vazia, sem entender se
// está quebrado, se ninguém pontuou ainda, ou se falta contratar algo.
export default function AvisoPlano({ modulo, oQue, compacto }: Props) {
  const info = moduloPorChave(modulo)
  const plano = planoMinimoPara(modulo)
  if (!info || !plano) return null

  const texto = `${oQue} vem do módulo ${info.rotulo}, disponível a partir do plano ${plano.nome} (R$ ${plano.preco}/mês).`

  if (compacto) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px', borderRadius: 10,
        background: '#f7f5ff', border: '1px solid #ddd6fe',
        color: '#5b4fcf', fontSize: 12, fontWeight: 600,
      }}>
        <Lock size={14} style={{ flexShrink: 0 }} />
        <span>{texto}</span>
      </div>
    )
  }

  return (
    <div style={{
      textAlign: 'center', padding: '40px 24px', borderRadius: 14,
      background: '#f7f5ff', border: '1px dashed #c4b5fd',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, margin: '0 auto 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#ede9fe', color: '#5b4fcf',
      }}>
        <Lock size={20} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#3f3a5c', marginBottom: 6 }}>
        {info.rotulo} não está no seu plano
      </div>
      <div style={{ fontSize: 12.5, color: '#6b6860', maxWidth: 460, margin: '0 auto', lineHeight: 1.55 }}>
        {texto} {info.descricao}
      </div>
      <div style={{ fontSize: 11.5, color: '#8b8798', marginTop: 12 }}>
        Fale com a NODRI para ativar.
      </div>
    </div>
  )
}
