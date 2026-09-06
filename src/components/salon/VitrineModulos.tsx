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
        gridTemplateColumns: 'repeat(auto-fit, minmax(238px, 1fr))',
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

              {/* ── O que este plano acrescenta, por extenso ──────────────
                  Antes cada plano listava os NOMES dos seus módulos, com
                  cadeado. "Relatórios 🔒" não diz a ninguém que ali dentro
                  está quem sumiu, quanto cada cliente vale e a corrida da
                  equipe — e ninguém compra o que não sabe que existe.

                  Do segundo plano em diante, só o que ele ACRESCENTA aparece
                  aberto. Repetir a lista inteira quatro vezes faria a diferença
                  de preço desaparecer no meio da repetição, que é exatamente o
                  que a pessoa está tentando enxergar ao comparar. */}
              {anterior && (
                <div style={{
                  fontSize: 11, fontWeight: 800, color: '#16a34a',
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 7, padding: '5px 9px', marginBottom: 10,
                }}>
                  Tudo do {anterior.nome}, mais:
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {(anterior ? novos : plano.modulos).map(chave => {
                  const m = moduloPorChave(chave)
                  if (!m) return null
                  const ativo = tem(chave)
                  return (
                    <div key={chave}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 12, fontWeight: 800,
                        color: ativo ? '#16a34a' : '#3f3a5c', marginBottom: 4,
                      }}>
                        {ativo ? <Check size={12} /> : <Lock size={11} />}
                        <span>{m.rotulo}</span>
                      </div>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none',
                        display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {m.destaques.map(d => (
                          <li key={d} style={{
                            display: 'flex', gap: 6, fontSize: 11,
                            color: ativo ? '#4b7a5a' : '#6b6860', lineHeight: 1.45,
                          }}>
                            <span style={{ color: '#c4bfd8', flexShrink: 0 }}>—</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* A base não é rodapé: é argumento.
          De 28 telas do sistema, 24 vêm em qualquer plano. Escondida em letra
          cinza, essa informação parecia ressalva; ela é o motivo de o plano de
          R$ 50 já valer a pena. */}
      <div style={{
        marginTop: 18, background: '#faf9ff', border: '1px solid #e8e5f5',
        borderRadius: 12, padding: '12px 16px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: '#3f3a5c', marginBottom: 4 }}>
          Em todos os planos, sem cobrança à parte
        </div>
        <div style={{ fontSize: 11, color: '#6b6860', lineHeight: 1.6 }}>
          Check list por setor, organograma, calendários, feedback de cliente e da equipe,
          currículos, lista de espera, mural de recados, auditoria e sub-logins por permissão.
        </div>
      </div>
    </div>
  )
}
