'use client'

import { useEffect, useState } from 'react'
import { Bell, X, Loader2, Plus, Trash2, Send, Eye, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

// Botão "Notificar donos" (Relatórios). O dono escolhe o que a mensagem traz,
// para quais telefones vai, em que dias e a que horas. A mensagem sai pelo
// WhatsApp do salão e fica escondida da recepção. Ver src/lib/resumoDono.ts.

interface Item { id: string; titulo: string; descricao: string; padrao: boolean }
interface Destino { nome: string; telefone: string }
interface Config { ligado: boolean; itens: string[]; telefones: Destino[]; dias: number[]; hora: string; nome: string }
interface Estado { dia: string; enviado_em: string | null; situacao: string; para: number; motivo: string }

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const VAZIA: Config = { ligado: false, itens: [], telefones: [{ nome: '', telefone: '' }], dias: [0, 1, 2, 3, 4, 5, 6], hora: '23:00', nome: '' }

const campo = { width: '100%', background: '#faf9f7', border: '1px solid #e8e6e0', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#1a1a1a', outline: 'none' } as const
const rotulo = { fontSize: 12, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 6 } as const

function mascara(v: string) {
  const d = v.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export default function NotificarDonos() {
  const [aberto, setAberto] = useState(false)
  const [itens, setItens] = useState<Item[]>([])
  const [cfg, setCfg] = useState<Config>(VAZIA)
  const [estado, setEstado] = useState<Estado | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [ocupado, setOcupado] = useState<'' | 'salvar' | 'teste' | 'previa'>('')
  const [previa, setPrevia] = useState<string[]>([])

  useEffect(() => {
    if (!aberto) return
    let vivo = true
    setCarregando(true)
    setPrevia([])
    fetch('/api/relatorios/resumo-dono', { credentials: 'include', cache: 'no-store' })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Falha ao carregar'); return d })
      .then(d => {
        if (!vivo) return
        setItens(d.itens || [])
        const c: Config = d.config
        setCfg({
          ...c,
          // Primeira vez: já vem com o que recomendamos marcado.
          itens: c.itens.length || c.ligado ? c.itens : (d.itens as Item[]).filter(i => i.padrao).map(i => i.id),
          telefones: c.telefones.length ? c.telefones.map(t => ({ nome: t.nome, telefone: mascara(t.telefone) })) : [{ nome: '', telefone: '' }],
        })
        setEstado(d.estado)
      })
      .catch(e => { toast.error(e.message); setAberto(false) })
      .finally(() => vivo && setCarregando(false))
    return () => { vivo = false }
  }, [aberto])

  const todos = itens.length > 0 && itens.every(i => cfg.itens.includes(i.id))
  const set = (p: Partial<Config>) => { setCfg(c => ({ ...c, ...p })); setPrevia([]) }
  const alternar = (id: string) => set({ itens: cfg.itens.includes(id) ? cfg.itens.filter(x => x !== id) : [...cfg.itens, id] })
  const alternarDia = (d: number) => set({ dias: cfg.dias.includes(d) ? cfg.dias.filter(x => x !== d) : [...cfg.dias, d].sort() })
  const setTel = (i: number, p: Partial<Destino>) => set({ telefones: cfg.telefones.map((t, j) => j === i ? { ...t, ...p } : t) })

  // O servidor decide o que é telefone válido; aqui só mandamos os que têm DDD + número.
  const comNumero = cfg.telefones.filter(t => t.telefone.replace(/\D/g, '').length >= 10)
  const corpo = (extra: any) => JSON.stringify({ config: { ...cfg, telefones: comNumero }, ...extra })

  async function chamar(acao: 'salvar' | 'teste' | 'previa') {
    const r = await fetch('/api/relatorios/resumo-dono', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: corpo({ acao }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || 'Não deu certo')
    return d
  }

  async function salvar() {
    setOcupado('salvar')
    try { await chamar('salvar'); toast.success(cfg.ligado ? 'Salvo. O envio automático está ligado.' : 'Salvo. O envio automático está desligado.') }
    catch (e: any) { toast.error(e.message) } finally { setOcupado('') }
  }
  async function testar() {
    setOcupado('teste')
    try { const d = await chamar('teste'); toast.success(`Teste enviado para ${d.enviados} telefone${d.enviados === 1 ? '' : 's'}.`) }
    catch (e: any) { toast.error(e.message) } finally { setOcupado('') }
  }
  async function ver() {
    setOcupado('previa')
    try { setPrevia((await chamar('previa')).partes || []) }
    catch (e: any) { toast.error(e.message) } finally { setOcupado('') }
  }

  const quando = (iso: string | null) => iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <>
      <button onClick={() => setAberto(true)} title="Mandar o resumo do salão por WhatsApp para os donos"
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #5b4fcf', borderRadius: 6, padding: '6px 14px', color: '#5b4fcf', fontSize: 12.5, cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>
        <Bell size={14} /> Notificar donos
      </button>

      {aberto && (
        <div onClick={() => setAberto(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Notificar donos</h3>
              <button onClick={() => setAberto(false)} aria-label="Fechar" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12.5, color: '#6b6860', margin: '0 0 16px', lineHeight: 1.5 }}>
              O NODRI manda um resumo do salão por WhatsApp, no dia e na hora que você escolher.
            </p>

            {carregando ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6b6860' }}><Loader2 size={20} className="animate-spin" /></div>
            ) : (
              <>
                {/* Nome no título */}
                <span style={rotulo as any}>Nome do salão na mensagem</span>
                <input value={cfg.nome} onChange={e => set({ nome: e.target.value })} maxLength={60}
                  placeholder="Vazio: usa o nome do WhatsApp do salão" style={{ ...campo, marginBottom: 18 }} />

                {/* Itens */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={rotulo as any}>O que receber</span>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
                    <button onClick={() => set({ itens: itens.map(i => i.id) })} disabled={todos} style={{ border: 'none', background: 'none', color: '#5b4fcf', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: todos ? 0.4 : 1 }}>Marcar todos</button>
                    <button onClick={() => set({ itens: [] })} disabled={!cfg.itens.length} style={{ border: 'none', background: 'none', color: '#6b6860', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: cfg.itens.length ? 1 : 0.4 }}>Limpar</button>
                  </div>
                </div>
                <div style={{ border: '1px solid #e8e6e0', borderRadius: 10, marginBottom: 18 }}>
                  {itens.map((i, n) => (
                    <label key={i.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', cursor: 'pointer', borderTop: n ? '1px solid #f0eee9' : 'none', alignItems: 'flex-start' }}>
                      <input type="checkbox" checked={cfg.itens.includes(i.id)} onChange={() => alternar(i.id)} style={{ marginTop: 3, accentColor: '#5b4fcf' }} />
                      <span>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{i.titulo}</span>
                        <span style={{ display: 'block', fontSize: 12, color: '#6b6860', lineHeight: 1.4 }}>{i.descricao}</span>
                      </span>
                    </label>
                  ))}
                </div>

                {/* Telefones */}
                <span style={rotulo as any}>Quem recebe</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                  {cfg.telefones.map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8 }}>
                      <input value={t.nome} onChange={e => setTel(i, { nome: e.target.value })} placeholder="Nome (opcional)" style={{ ...campo, flex: 1 }} />
                      <input value={t.telefone} onChange={e => setTel(i, { telefone: mascara(e.target.value) })} placeholder="(61) 99999-9999" inputMode="tel" style={{ ...campo, flex: 1 }} />
                      <button onClick={() => set({ telefones: cfg.telefones.length > 1 ? cfg.telefones.filter((_, j) => j !== i) : [{ nome: '', telefone: '' }] })}
                        aria-label="Remover telefone" style={{ border: '1px solid #e8e6e0', background: '#fff', borderRadius: 8, padding: '0 10px', cursor: 'pointer', color: '#9ca3af' }}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => set({ telefones: [...cfg.telefones, { nome: '', telefone: '' }] })} disabled={cfg.telefones.length >= 10}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', color: '#5b4fcf', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 18 }}>
                  <Plus size={14} /> Adicionar telefone
                </button>

                {/* Quando */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={rotulo as any}>Dias e horário do envio</span>
                  <button onClick={() => set({ dias: cfg.dias.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6] })} style={{ border: 'none', background: 'none', color: '#5b4fcf', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 6 }}>
                    {cfg.dias.length === 7 ? 'Limpar dias' : 'Todos os dias'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                  {DIAS.map((d, n) => {
                    const on = cfg.dias.includes(n)
                    return (
                      <button key={d} onClick={() => alternarDia(n)} aria-pressed={on}
                        style={{ padding: '7px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', border: `1px solid ${on ? '#5b4fcf' : '#e8e6e0'}`, background: on ? '#5b4fcf' : '#fff', color: on ? '#fff' : '#6b6860' }}>{d}</button>
                    )
                  })}
                  <input type="time" value={cfg.hora} onChange={e => set({ hora: e.target.value || '23:00' })} aria-label="Horário do envio"
                    style={{ ...campo, width: 110, marginLeft: 8 }} />
                </div>
                <p style={{ fontSize: 11.5, color: '#767069', margin: '0 0 18px' }}>
                  Horário de Brasília. Se o WhatsApp do salão estiver fora do ar, o NODRI tenta de novo por até 2 horas.
                </p>

                {/* Liga/desliga */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #e8e6e0', borderRadius: 10, cursor: 'pointer', marginBottom: 14, background: cfg.ligado ? '#f1eefc' : '#fff' }}>
                  <input type="checkbox" checked={cfg.ligado} onChange={e => set({ ligado: e.target.checked })} style={{ accentColor: '#5b4fcf' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>Envio automático ligado</span>
                  <span style={{ fontSize: 12, color: '#6b6860' }}>{cfg.ligado ? 'vale depois de Salvar' : 'nada é enviado sozinho enquanto estiver desligado'}</span>
                </label>

                {estado && estado.situacao && (
                  <div style={{ fontSize: 12, color: estado.situacao === 'enviado' ? '#1B5E3F' : '#B4322A', background: estado.situacao === 'enviado' ? '#E7F1E9' : '#FBEAE6', borderRadius: 8, padding: '8px 10px', marginBottom: 14 }}>
                    {estado.situacao === 'enviado'
                      ? `Último envio: ${quando(estado.enviado_em)}, para ${estado.para} telefone${estado.para === 1 ? '' : 's'}.`
                      : `Último envio não saiu (${estado.dia.split('-').reverse().slice(0, 2).join('/')}): ${estado.motivo || 'erro desconhecido'}`}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#6b6860', background: '#faf9f7', border: '1px solid #e8e6e0', borderRadius: 8, padding: '8px 10px', marginBottom: 14, lineHeight: 1.45 }}>
                  <Lock size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>Sai pelo WhatsApp do salão, mas a conversa fica escondida: não aparece no CRM para a recepção. No celular do salão, o chat com o dono aparece no WhatsApp; ative as mensagens temporárias nele se quiser que apague sozinho.</span>
                </div>

                {previa.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11.5, color: '#6b6860', marginBottom: 6 }}>
                      O dono recebe {previa.length} mensagem{previa.length === 1 ? '' : 's'}, uma depois da outra:
                    </div>
                    {previa.map((p, i) => (
                      <pre key={i} style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12.5, lineHeight: 1.55, color: '#1a1a1a', background: '#E7F1E9', border: '1px solid #cfe3d4', borderRadius: 10, padding: 14, margin: '0 0 8px' }}>{p}</pre>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button onClick={ver} disabled={!!ocupado || !cfg.itens.length}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e8e6e0', background: '#fff', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700, color: '#1a1a1a', cursor: 'pointer', opacity: ocupado || !cfg.itens.length ? 0.5 : 1 }}>
                    {ocupado === 'previa' ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} Ver prévia
                  </button>
                  <button onClick={testar} disabled={!!ocupado || !comNumero.length || !cfg.itens.length}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #5b4fcf', background: '#fff', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700, color: '#5b4fcf', cursor: 'pointer', opacity: ocupado || !comNumero.length || !cfg.itens.length ? 0.5 : 1 }}>
                    {ocupado === 'teste' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar teste agora
                  </button>
                  <button onClick={salvar} disabled={!!ocupado}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: '#5b4fcf', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: ocupado ? 0.5 : 1 }}>
                    {ocupado === 'salvar' && <Loader2 size={14} className="animate-spin" />} Salvar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
