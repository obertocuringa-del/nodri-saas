'use client'
import { useState, useEffect } from 'react'
import { UserCheck, Check, Loader2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

// Quem fez o serviço na planilha e não está habilitado nele aqui.
//
// Não é detalhe de cadastro: o profissional some da lista de "quem faz" no
// agendamento da página do cliente, e a comissão dele naquele serviço não
// entra na conta. A planilha prova que ele fez — o cadastro é que atrasou.
//
// Habilita daqui mesmo, sem entrar no perfil de cada um: eram três telas por
// pessoa, e por isso ninguém arrumava.

interface ServicoPendente { servicoId: string; nome: string; atendimentos: number }
interface Pendente { profissionalId: string; nome: string; servicos: ServicoPendente[] }

export default function ConferenciaProfissionais() {
  const [pendentes, setPendentes] = useState<Pendente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profissionais/conferencia')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setPendentes(Array.isArray(d?.pendentes) ? d.pendentes : []))
      .catch(() => { /* sem planilha: o cartão não aparece */ })
      .finally(() => setCarregando(false))
  }, [])

  async function habilitar(p: Pendente, servicoIds: string[], rotulo: string) {
    setOcupado(p.profissionalId + servicoIds.join())
    try {
      const r = await fetch('/api/profissionais/conferencia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profissionalId: p.profissionalId, servicoIds }),
      })
      if (!r.ok) { toast.error('Não consegui habilitar'); return }
      const d = await r.json()
      setPendentes(d.pendentes || [])
      toast.success(`${p.nome} habilitado em ${rotulo}.`)
    } catch { toast.error('Erro de conexão') }
    finally { setOcupado(null) }
  }

  // Enquanto carrega, DIZ que está carregando. Desenhar nada fazia a página
  // parecer sem o aviso — e a pergunta virava "cadê o botão de habilitar?".
  // A conta lê a planilha inteira na primeira vez depois de cada importação.
  if (carregando) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e8e6e0', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: '#767069', fontSize: 12 }}>
        <Loader2 size={14} className="animate-spin" />
        Conferindo a planilha para ver quem fez serviço sem estar habilitado…
      </div>
    )
  }
  if (!pendentes.length) return null

  const totalServicos = pendentes.reduce((s, p) => s + p.servicos.length, 0)

  return (
    <div style={{ background: '#eef6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <UserCheck size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>
            {pendentes.length === 1
              ? `1 profissional fez serviço em que não está habilitado`
              : `${pendentes.length} profissionais fizeram serviços em que não estão habilitados`}
            {totalServicos > pendentes.length ? ` (${totalServicos} no total)` : ''}
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#1e40af', opacity: .8, lineHeight: 1.5 }}>
            Está na planilha que fizeram. Sem habilitar, eles não aparecem para a
            cliente escolher no agendamento e a comissão do serviço não entra na conta.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pendentes.map(p => {
          const todos = p.servicos.map(s => s.servicoId)
          const chaveTodos = p.profissionalId + todos.join()
          const expandido = aberto === p.profissionalId
          return (
            <div key={p.profissionalId}
              style={{ background: '#fff', border: '1px solid #dbeafe', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
                <button onClick={() => setAberto(a => (a === p.profissionalId ? null : p.profissionalId))}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                  <ChevronDown size={14}
                    style={{ color: '#94a3b8', flexShrink: 0, transform: expandido ? '' : 'rotate(-90deg)', transition: 'transform .15s' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.nome}
                  </span>
                  <span style={{ fontSize: 10.5, color: '#767069', flexShrink: 0 }}>
                    {p.servicos.length} serviço{p.servicos.length === 1 ? '' : 's'}
                  </span>
                </button>

                <button onClick={() => habilitar(p, todos, `${p.servicos.length} serviço${p.servicos.length === 1 ? '' : 's'}`)}
                  disabled={ocupado === chaveTodos}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: ocupado === chaveTodos ? .5 : 1 }}>
                  {ocupado === chaveTodos ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Habilitar {p.servicos.length === 1 ? '' : 'todos'}
                </button>
              </div>

              {/* Um a um, para o caso de o profissional ter feito um serviço
                  cobrindo alguém e não dever ficar habilitado nele. */}
              {expandido && (
                <div style={{ borderTop: '1px solid #eff6ff' }}>
                  {p.servicos.map(s => {
                    const chave = p.profissionalId + s.servicoId
                    return (
                      <div key={s.servicoId}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 34px', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 11.5, color: '#1a1a1a' }}>{s.nome}</p>
                          <p style={{ margin: 0, fontSize: 10, color: '#767069' }}>
                            {s.atendimentos} atendimento{s.atendimentos === 1 ? '' : 's'} na planilha
                          </p>
                        </div>
                        <button onClick={() => habilitar(p, [s.servicoId], s.nome)}
                          disabled={ocupado === chave}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 9px', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0, opacity: ocupado === chave ? .5 : 1 }}>
                          {ocupado === chave ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                          Habilitar
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
