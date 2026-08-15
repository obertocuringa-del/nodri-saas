'use client'

import { Check, Lock } from 'lucide-react'
import { PLANOS_NODRI, MODULOS_NODRI, moduloPorChave, type ChaveModulo } from '@/lib/planosModulos'

interface Props {
  /** Módulos que o salão JÁ tem — aparecem marcados, não vendidos de novo. */
  ativos: ChaveModulo[]
}

// Vitrine dos módulos contratáveis. Ocupa o lugar do "Nenhum módulo
// encontrado", que era o pior texto possível para quem acabou de assinar: a
// tela dizia que não havia nada, quando na verdade havia tudo — só não estava
// contratado. Quem chega aqui é justamente quem pode comprar.
export default function VitrineModulos({ ativos }: Props) {
  const tem = (c: ChaveModulo) => ativos.includes(c)
  const faltam = MODULOS_NODRI.filter(m => !tem(m.chave))

  return (
    <div style={{ padding: '28px 4px 8px' }}>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#3f3a5c', marginBottom: 6 }}>
          {faltam.length === 0
            ? 'Você já tem todos os módulos'
            : 'Amplie o seu NODRI'}
        </div>
        <div style={{ fontSize: 12.5, color: '#6b6860', maxWidth: 520, margin: '0 auto', lineHeight: 1.55 }}>
          {faltam.length === 0
            ? 'Todos os módulos estão ativos no seu salão.'
            : 'O sistema inteiro já está aqui. Cada plano liga uma parte a mais — o resto continua funcionando do mesmo jeito.'}
        </div>
      </div>

      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
      }}>
        {PLANOS_NODRI.map(plano => {
          // O que ESTE plano acrescenta em relação ao anterior — é o que faz
          // a diferença de preço fazer sentido lado a lado.
          const anterior = PLANOS_NODRI[PLANOS_NODRI.indexOf(plano) - 1]
          const novos = plano.modulos.filter(c => !anterior || !anterior.modulos.includes(c))
          const completo = plano.modulos.every(tem)

          return (
            <div key={plano.slug} style={{
              borderRadius: 14, padding: 16,
              background: completo ? '#f4fbf6' : '#ffffff',
              border: completo ? '1px solid #86efac' : '1px solid #e8e5f5',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#3f3a5c' }}>{plano.nome}</span>
                {completo && (
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#16a34a' }}>SEU PLANO</span>
                )}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#5b4fcf', marginBottom: 8 }}>
                R$ {plano.preco}
                <span style={{ fontSize: 11, fontWeight: 600, color: '#8b8798' }}>/mês</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#6b6860', marginBottom: 12, lineHeight: 1.5 }}>
                {plano.resumo}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plano.modulos.map(chave => {
                  const m = moduloPorChave(chave)
                  if (!m) return null
                  const ativo = tem(chave)
                  const novo = novos.includes(chave)
                  return (
                    <div key={chave} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 11.5,
                      fontWeight: novo ? 700 : 500,
                      color: ativo ? '#16a34a' : novo ? '#3f3a5c' : '#a8a4b8',
                    }}>
                      {ativo ? <Check size={12} /> : <Lock size={11} />}
                      <span>{m.rotulo}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', fontSize: 11.5, color: '#8b8798', marginTop: 18, lineHeight: 1.6 }}>
        Check list, calendários, setores, feedback, lojistas, currículos e ações comerciais
        <br />estão em todos os planos, sem cobrança à parte.
      </div>
    </div>
  )
}
