'use client'

// ── Envio automático (Mais Relatórios) ──────────────────────────────────────
//
// Configura os envios de recuperação/promoção por lista. Quem manda é o
// relógio do servidor (src/lib/crmDisparos.ts): uma mensagem por vez, no
// ritmo escolhido aqui, só um envio ligado por vez, e sempre esperando a
// confirmação/feedback terminarem de sair.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Play, Pause, Pencil, Trash2, RotateCcw, Send, Plus, X, Clock, Users, MessageCircle, CheckCircle2, Paperclip, CalendarDays } from 'lucide-react'
import { useGuardaSalvar } from '@/lib/guardaSalvar'
import { enviarArquivo } from '@/lib/enviarArquivo'

type Publico = { dias_min: number; dias_max: number; servicos: string[]; servicos_nao: string[]; segmento: 'todos' | 'vip' | 'regular' | 'novo'; ano_de: number; ano_ate: number }
type Anexo = { url: string; tipo: 'imagem' | 'video' | 'audio' | 'documento'; nome: string }
type Disparo = {
  id?: string; nome: string; ligado?: boolean; tipo: 'lista' | 'retorno'; categoria: Categoria; continuo: boolean
  segunda: { ligada: boolean; dias: number; mensagens: string[] }; ciclos: Record<string, number>; tolerancia_dias: number; publico: Publico; saudacoes: string[]; mensagens: string[]; anexo: Anexo | null
  inicio: string; fim: string
  janela_ini: string; janela_fim: string; dias_semana: number[]; intervalo_min: number; max_dia: number; trava_dias: number
  ciclo?: number
  estado?: { situacao?: string; ultimo_envio_em?: string | null; enviados_dia?: number; dia?: string; concluido_em?: string | null } | null
  resumo?: { segundas?: number; total: number; enviadas: number; faltam: number; sem_celular: number; repetidos?: number; sem_ciclo?: string[]; envios_total?: number; bloqueados: number; responderam: number; voltaram: number; por_dia: number }
}

const ROXO = '#5b4fcf'
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const INTERVALOS = [10, 15, 20, 30, 40, 45, 60, 90, 120, 180]

// Sem {servico}: sem serviço escolhido no filtro, o campo pega um serviço
// qualquer da cliente ("complemento keune"), e a frase sai estranha.
// A saudação vai sozinha, antes: é a mensagem curta que a cliente vê na
// notificação, e o texto chega logo depois (pedido do dono, 29/09/2026).
const OI = 'Oi *{cliente}*, tudo bem?'

type Categoria = '' | 'perdidas' | 'risco' | 'promocao' | 'vip' | 'novas' | 'cruzada' | 'retorno'
type Textos = { saudacoes: string[]; mensagens: string[]; segunda: string[] }

// Modelos prontos por objetivo, 3 versões cada (pedido do dono, 29/09/2026).
// Versões diferentes alternam entre as clientes: além de soar menos robô, o
// WhatsApp desconfia menos de texto que não é idêntico.
const SAUDACOES = ['Oi *{cliente}*, tudo bem?', 'Olá *{cliente}*, como você está?', 'Oi *{cliente}*! Tudo certo por aí?']
const SEGUNDA_PADRAO = [
  'Oi *{cliente}*, conseguiu ver minha mensagem? Se quiser, vejo um horário para você essa semana.',
  '*{cliente}*, passando de novo por aqui. Se preferir outro dia ou horário, me fala que eu encaixo.',
  'Oi *{cliente}*! Ainda dá tempo de garantir o seu horário. Quer que eu reserve um para você?',
]
const PRONTOS: Record<Exclude<Categoria, ''>, { rotulo: string } & Textos> = {
  perdidas: { rotulo: 'Recuperar perdidas', saudacoes: SAUDACOES, segunda: SEGUNDA_PADRAO, mensagens: [
    'Faz um tempinho que você não vem aqui no salão e sentimos sua falta. Que tal agendar um horário essa semana?\n\nSe quiser, é só me responder aqui que eu vejo um horário bom para você.',
    'Estava olhando a nossa agenda e lembrei de você. Faz tempo que não te vemos por aqui!\n\nSe teve algo que a gente possa melhorar, me conta. E se quiser voltar, separo um horário especial para você.',
    'Passando para saber como você está e dizer que as portas continuam abertas para você.\n\nQuer que eu veja um horário essa semana ou na próxima?',
  ] },
  risco: { rotulo: 'Clientes em risco', saudacoes: SAUDACOES, segunda: SEGUNDA_PADRAO, mensagens: [
    'Já faz {dias} dias desde a sua última visita. Que tal já deixar o próximo horário marcado?\n\nMe responde aqui que eu vejo o melhor dia para você.',
    'Sentimos sua falta por aqui! Está chegando a hora de cuidar do cabelo de novo.\n\nQuer que eu veja um horário essa semana?',
    'Tenho alguns horários bons essa semana e lembrei de você.\n\nPrefere de manhã ou à tarde?',
  ] },
  retorno: { rotulo: 'Lembrete de retorno', saudacoes: SAUDACOES, segunda: SEGUNDA_PADRAO, mensagens: [
    'Já está chegando a hora de refazer o seu {servico}: o último foi em {data_servico}.\n\nQuer que eu veja um horário bom para você?',
    'Pelo nosso controle, o seu {servico} feito em {data_servico} já está na hora de ser refeito.\n\nQuer que eu reserve um horário para você?',
    'Para o seu {servico} continuar sempre bonito, o ideal é refazer agora.\n\nQual dia fica melhor para você essa semana?',
  ] },
  promocao: { rotulo: 'Promoção', saudacoes: SAUDACOES, segunda: SEGUNDA_PADRAO, mensagens: [
    'Como você já faz {servico} com a gente, separei uma condição especial para você este mês.\n\nQuer que eu veja um horário?',
    'Preparamos uma condição especial para quem já é cliente da casa, válida só este mês.\n\nQuer que eu te explique e já veja um horário?',
    'Tenho uma novidade para você: uma condição especial por tempo limitado, só para clientes da casa.\n\nPosso reservar um horário?',
  ] },
  vip: { rotulo: 'VIP', saudacoes: SAUDACOES, segunda: SEGUNDA_PADRAO, mensagens: [
    'Você é uma das nossas clientes mais especiais e queremos te agradecer por isso.\n\nSeparei uma condição exclusiva para você este mês. Quer saber qual é?',
    'Clientes como você fazem o nosso salão ser o que é. Por isso, você tem prioridade na nossa agenda.\n\nQuer que eu já reserve o seu próximo horário?',
    'Preparamos um mimo exclusivo para as nossas clientes VIP, e você está na lista.\n\nMe responde aqui que eu te conto.',
  ] },
  novas: { rotulo: 'Clientes novas', saudacoes: SAUDACOES, segunda: SEGUNDA_PADRAO, mensagens: [
    'Queria saber: como ficou o seu cabelo depois da sua visita? Ficamos muito felizes em te atender.\n\nQue tal já deixar o próximo horário marcado?',
    'Foi um prazer te receber aqui no salão! Para manter o resultado bonito, o ideal é voltar em breve.\n\nQuer que eu veja um horário para você?',
    'Passando para agradecer a sua primeira visita. Gostou do atendimento? A sua opinião é muito importante para nós.\n\nE se quiser, já agendo o seu retorno.',
  ] },
  cruzada: { rotulo: 'Venda cruzada', saudacoes: SAUDACOES, segunda: SEGUNDA_PADRAO, mensagens: [
    'Como você já faz {servico} com a gente, queria te apresentar {oferta}: combina muito e deixa o resultado ainda mais bonito.\n\nQuer saber mais?',
    'Sabia que dá para deixar o seu {servico} ainda melhor? {oferta} combina perfeitamente, e muitas clientes amam.\n\nPosso te contar como funciona?',
    'Separei uma sugestão para você: {oferta}, que complementa o seu {servico} e cuida ainda mais do seu cabelo.\n\nQuer que eu veja um horário para experimentar?',
  ] },
}
const textosDe = (c: Exclude<Categoria, ''>) => ({
  saudacoes: [...PRONTOS[c].saudacoes], mensagens: [...PRONTOS[c].mensagens],
  segunda: { ligada: false, dias: 5, mensagens: [...PRONTOS[c].segunda] },
})

// "Perdidas" e "Em risco" com a MESMA régua das abas de Mais Relatórios
// (api/relatorios/analise-clientes: perdida > 90 dias, risco 46 a 90), para o
// número daqui bater com o de lá. O que ainda difere é só quem não tem
// celular ou divide o celular com outra ficha -- e isso aparece na tela.
const PUB = { servicos: [], servicos_nao: [], segmento: 'todos' as const, ano_de: 0, ano_ate: 0 }
const MODELOS: { rotulo: string; desc: string; d: Partial<Disparo> }[] = [
  { rotulo: 'Recuperar perdidas', desc: 'Mais de 90 dias sem vir (igual à aba Perdidos)', d: { nome: 'Recuperar perdidas', categoria: 'perdidas', tipo: 'lista', continuo: false, publico: { ...PUB, dias_min: 91, dias_max: 0 }, ...textosDe('perdidas') } },
  { rotulo: 'Clientes em risco', desc: '46 a 90 dias sem vir (igual à aba Em Risco)', d: { nome: 'Clientes em risco', categoria: 'risco', tipo: 'lista', continuo: false, publico: { ...PUB, dias_min: 46, dias_max: 90 }, ...textosDe('risco') } },
  { rotulo: 'Promoção por serviço', desc: 'Quem faz os serviços escolhidos', d: { nome: 'Promoção', categoria: 'promocao', tipo: 'lista', continuo: false, publico: { ...PUB, dias_min: 0, dias_max: 0 }, ...textosDe('promocao') } },
  { rotulo: 'VIP', desc: 'As clientes que mais gastam', d: { nome: 'VIP', categoria: 'vip', tipo: 'lista', continuo: false, publico: { ...PUB, dias_min: 0, dias_max: 0, segmento: 'vip' }, ...textosDe('vip') } },
  // Contínua: todo dia entra quem completou 20 dias da primeira visita sem
  // voltar. Sem teto de dias (dono, 29/09/2026: com 20 a 30 só apareciam 14,
  // e ele queria TODAS as novas do ano que não voltaram), limitada ao ano.
  { rotulo: 'Clientes novas', desc: 'Primeira visita este ano e não voltou em 20 dias: garantir a 2ª visita', d: { nome: 'Clientes novas (2ª visita)', categoria: 'novas', tipo: 'lista', continuo: true, publico: { ...PUB, dias_min: 20, dias_max: 0, segmento: 'novo', ano_de: new Date().getFullYear(), ano_ate: new Date().getFullYear() }, ...textosDe('novas') } },
  { rotulo: 'Venda cruzada', desc: 'Fez um serviço e nunca fez outro que combina', d: { nome: 'Venda cruzada', categoria: 'cruzada', tipo: 'lista', continuo: false, publico: { ...PUB, dias_min: 0, dias_max: 120 }, ...textosDe('cruzada') } },
]
const ROTULO_CAT: Record<string, string> = Object.fromEntries(Object.entries(PRONTOS).map(([k, v]) => [k, v.rotulo]))

const NOVO: Disparo = {
  nome: '', tipo: 'lista', categoria: '', continuo: false, ciclos: {}, tolerancia_dias: 30,
  publico: { ...PUB, dias_min: 91, dias_max: 0 }, ...textosDe('perdidas'), anexo: null,
  inicio: '', fim: '',
  janela_ini: '09:00', janela_fim: '21:00', dias_semana: [1, 2, 3, 4, 5, 6], intervalo_min: 30, max_dia: 20, trava_dias: 30,
}

const min = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** Todas as contas do ritmo, as mesmas do servidor. */
function contas(d: Disparo, faltam: number) {
  const janela = Math.max(0, min(d.janela_fim) - min(d.janela_ini))
  const cabem = Math.floor(janela / d.intervalo_min) + 1
  const porDia = Math.max(0, Math.min(d.max_dia, cabem))
  const terminaAs = hhmm(min(d.janela_ini) + Math.max(0, porDia - 1) * d.intervalo_min)
  const intervaloParaMax = d.max_dia > 1 ? Math.floor(janela / (d.max_dia - 1)) : janela
  const diasDeEnvio = porDia ? Math.ceil(faltam / porDia) : 0
  // Data de término: conta só os dias da semana marcados.
  let fim: Date | null = null
  if (porDia && d.dias_semana.length && faltam > 0) {
    const dt = new Date(); let n = 0
    const ini = d.inicio ? new Date(d.inicio + 'T12:00:00') : null
    if (ini && ini > dt) dt.setTime(ini.getTime())
    for (let i = 0; i < 3650 && n < diasDeEnvio; i++) {
      if (i > 0) dt.setDate(dt.getDate() + 1)
      if (d.dias_semana.includes(dt.getDay())) n++
    }
    fim = dt
  }
  // Com data final, a lista pode não caber: quantas ficam sem receber.
  let cabemNoPeriodo: number | null = null
  if (d.fim && porDia) {
    const dt = new Date(); const ini = d.inicio ? new Date(d.inicio + 'T12:00:00') : null
    if (ini && ini > dt) dt.setTime(ini.getTime())
    const ult = new Date(d.fim + 'T12:00:00'); let n = 0
    for (let i = 0; i < 3650 && dt <= ult; i++) { if (d.dias_semana.includes(dt.getDay())) n++; dt.setDate(dt.getDate() + 1) }
    cabemNoPeriodo = n * porDia
  }
  return { cabem, porDia, terminaAs, intervaloParaMax, diasDeEnvio, fim, cabemNoPeriodo }
}

// Lembrete de retorno (pedido do dono, 29/09/2026): quem fez o serviço e
// chegou a hora de voltar pelo ciclo da página Serviços.
const NOVO_RETORNO: Disparo = {
  ...NOVO, nome: 'Lembrete de retorno', tipo: 'retorno', categoria: 'retorno',
  publico: { ...PUB, dias_min: 0, dias_max: 0 }, ...textosDe('retorno'),
  intervalo_min: 20, max_dia: 30, trava_dias: 15,
}

const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const br = (iso: string) => iso ? iso.split('-').reverse().join('/') : ''
/** Envio salvo antes destes campos existirem vem sem eles. */
const completar = (d: any): Disparo => ({
  ...NOVO, ...d, saudacoes: d.saudacoes || [], anexo: d.anexo || null, inicio: d.inicio || '', fim: d.fim || '',
  tipo: d.tipo === 'retorno' ? 'retorno' : 'lista', ciclos: d.ciclos || {}, tolerancia_dias: d.tolerancia_dias || 30,
  categoria: d.categoria || (d.tipo === 'retorno' ? 'retorno' : ''), continuo: d.continuo === true,
  segunda: { ligada: false, dias: 5, mensagens: [...SEGUNDA_PADRAO], ...(d.segunda || {}) },
  publico: { ...NOVO.publico, ...(d.publico || {}), ano_de: d.publico?.ano_de || 0, ano_ate: d.publico?.ano_ate || 0, servicos_nao: d.publico?.servicos_nao || [] },
})

export default function EnvioAutomatico() {
  const [lista, setLista] = useState<Disparo[] | null>(null)
  const [servicos, setServicos] = useState<{ nome: string; clientes: number; ciclo?: number | null }[]>([])
  const [editando, setEditando] = useState<Disparo | null>(null)
  const [original, setOriginal] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState('')

  async function carregar() {
    const r = await fetch('/api/crm/disparos', { cache: 'no-store' })
    const d = r.ok ? await r.json() : { disparos: [], servicos: [] }
    setLista(d.disparos || []); setServicos(d.servicos || [])
  }
  useEffect(() => { carregar(); const t = setInterval(carregar, 60000); return () => clearInterval(t) }, [])

  const sujo = !!editando && JSON.stringify(editando) !== original
  useGuardaSalvar(sujo, 'Envio automático')

  function abrirEditor(d: Disparo) {
    const copia = completar(JSON.parse(JSON.stringify(d))); delete copia.estado; delete copia.resumo
    setEditando(copia); setOriginal(JSON.stringify(copia))
  }

  async function acao(corpo: any, ok?: string) {
    setOcupado(corpo.acao + (corpo.id || ''))
    const r = await fetch('/api/crm/disparos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
    const d = await r.json().catch(() => ({}))
    setOcupado('')
    if (!r.ok) { alert(d.error || 'Não consegui.'); return null }
    if (ok) { setAviso(ok); setTimeout(() => setAviso(''), 4000) }
    await carregar()
    return d
  }

  async function ligar(d: Disparo, on: boolean) {
    let ok = on ? 'Envio ligado.' : 'Envio pausado.'
    if (on) {
      const outros = (lista || []).filter(x => x.ligado && x.id !== d.id && x.tipo !== 'retorno')
      if (d.inicio && d.inicio > hojeISO()) ok = `Envio agendado: começa em ${br(d.inicio)}.`
      else if (d.tipo === 'retorno') ok = 'Lembrete ligado. Ele corre junto com as listas, sempre uma mensagem por vez.'
      else if (outros.length) ok = `Envio ligado. Ele manda depois de "${outros[0].nome}" terminar: só um envio manda por vez, na ordem da data de início.`
    }
    await acao({ acao: 'ligar', id: d.id, ligado: on }, ok)
  }

  if (editando) {
    return <Editor d={editando} setD={setEditando} servicos={servicos} sujo={sujo}
      onCancelar={() => { if (!sujo || confirm('Descartar as alterações?')) setEditando(null) }}
      onSalvar={async () => {
        const r = await acao({ acao: 'salvar', disparo: editando }, 'Envio salvo.')
        if (r) setEditando(null)
      }} />
  }

  return (
    <div>
      <div style={{ background: '#fff', border: '1.5px solid #e0ddd8', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a' }}>Envio automático pelo WhatsApp</div>
            <div style={{ fontSize: 12.5, color: '#6b6860', marginTop: 4, lineHeight: 1.5 }}>
              Escolha uma lista de clientes e a mensagem; o sistema manda uma por vez, no ritmo que você definir, da cliente
              que veio mais recente para a mais antiga. Quem já recebeu não recebe de novo e a conversa cai em Listas no CRM.
              Pode deixar vários envios ligados, cada um com sua data de início: eles se revezam sozinhos, um de cada vez,
              e sempre esperam a confirmação e o feedback terminarem de sair.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => abrirEditor({ ...NOVO_RETORNO })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: ROXO, border: `1.5px solid ${ROXO}`, borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <CalendarDays size={15} /> Lembrete de retorno
            </button>
            <button onClick={() => abrirEditor({ ...NOVO })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: ROXO, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={15} /> Novo envio
            </button>
          </div>
        </div>
        {aviso && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: '#2f6b4f' }}>{aviso}</div>}
      </div>

      {!lista && <div style={{ padding: 30, textAlign: 'center', color: '#6b6860' }}><Loader2 className="animate-spin" size={18} /> Carregando...</div>}
      {lista && !lista.length && (
        <div style={{ background: '#fff', border: '1.5px dashed #e0ddd8', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 10 }}>Comece por um modelo:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {[...MODELOS, { rotulo: 'Lembrete de retorno', desc: 'Quem fez o serviço e chegou a hora de voltar', d: NOVO_RETORNO }].map(m => (
              <button key={m.rotulo} onClick={() => abrirEditor({ ...NOVO, ...m.d } as Disparo)}
                style={{ textAlign: 'left', background: '#faf9f7', border: '1.5px solid #e0ddd8', borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: ROXO }}>{m.rotulo}</div>
                <div style={{ fontSize: 11.5, color: '#6b6860', marginTop: 2 }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {(lista || []).map(d => {
          const r = d.resumo
          const retorno = d.tipo === 'retorno'
          const pct = r && r.total ? Math.round(r.enviadas / r.total * 100) : 0
          const c = contas(d, r?.faltam || 0)
          const concluido = !!d.estado?.concluido_em && !d.ligado
          const agendado = !!d.ligado && !!d.inicio && d.inicio > hojeISO()
          return (
            <div key={d.id} style={{ background: '#fff', border: `1.5px solid ${d.ligado ? '#b9b2ee' : '#e0ddd8'}`, borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Chave ligada={!!d.ligado} ocupado={!!ocupado} onTrocar={() => ligar(d, !d.ligado)} />
                <div style={{ fontSize: 14.5, fontWeight: 800, color: '#1a1a1a' }}>{d.nome}</div>
                {!!ROTULO_CAT[d.categoria] && <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 999, background: '#eceaf9', color: ROXO }}>{ROTULO_CAT[d.categoria]}</span>}
                {d.continuo && <span style={{ fontSize: 11, color: '#8f877f' }}>contínuo</span>}
                {d.segunda?.ligada && <span style={{ fontSize: 11, color: '#8f877f' }}>com 2ª mensagem em {d.segunda.dias} dias</span>}
                <span className={d.ligado ? 'animate-pulse' : ''} style={{ fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 999,
                  background: agendado ? '#fdf3e1' : d.ligado ? '#e7f1e9' : concluido ? '#eceaf9' : '#f1efe8', color: agendado ? '#9a6b12' : d.ligado ? '#2f6b4f' : concluido ? ROXO : '#8f877f' }}>
                  {agendado ? 'Agendado' : d.ligado ? 'Ligado' : concluido ? 'Concluído' : 'Pausado'}
                </span>
                {(d.inicio || d.fim) && (
                  <span style={{ fontSize: 11.5, color: '#6b6860', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CalendarDays size={12} /> {d.inicio ? `de ${br(d.inicio)}` : 'já'}{d.fim ? ` até ${br(d.fim)}` : ' até a lista acabar'}
                  </span>
                )}
                {(d.ciclo || 1) > 1 && <span style={{ fontSize: 11, color: '#8f877f' }}>ciclo {d.ciclo}</span>}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => abrirEditor(d)} style={botao('#fff', '#1a1a1a', '#e0ddd8')}><Pencil size={13} /> Editar</button>
                  {!retorno && (concluido || (r && r.enviadas > 0)) && !d.ligado && (
                    <button onClick={() => { if (confirm('Reiniciar o ciclo? Todas as clientes da lista voltam a poder receber este envio.')) acao({ acao: 'reiniciar', id: d.id }, 'Ciclo reiniciado.') }}
                      style={botao('#fff', '#1a1a1a', '#e0ddd8')}><RotateCcw size={13} /> Reiniciar ciclo</button>
                  )}
                  {!d.ligado && (
                    <button onClick={() => { if (confirm(`Excluir "${d.nome}"?`)) acao({ acao: 'excluir', id: d.id }, 'Excluído.') }}
                      style={botao('#fff', '#b4322a', '#f0cfc9')}><Trash2 size={13} /></button>
                  )}
                </div>
              </div>

              {d.ligado && d.estado?.situacao && (
                <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: /Pausado|Limite|Encerrado/.test(d.estado.situacao) ? '#9a6b12' : '#2f6b4f', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} /> {d.estado.situacao}
                </div>
              )}

              {r && retorno && (
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: '#6b6860', marginTop: 10 }}>
                  <span><b style={{ color: '#1a1a1a' }}>{r.faltam}</b> na hora de voltar agora</span>
                  <span><b style={{ color: '#1a1a1a' }}>{r.envios_total || 0}</b> lembretes enviados</span>
                  <span><MessageCircle size={12} style={{ verticalAlign: -2 }} /> <b style={{ color: '#1a1a1a' }}>{r.responderam}</b> responderam</span>
                  <span><CheckCircle2 size={12} style={{ verticalAlign: -2 }} /> <b style={{ color: '#2f6b4f' }}>{r.voltaram}</b> voltaram ao salão</span>
                    {!!r.segundas && <span><b style={{ color: '#1a1a1a' }}>{r.segundas}</b> 2ª mensagem</span>}
                  <span><Users size={12} style={{ verticalAlign: -2 }} /> até {c.porDia} por dia</span>
                  {c.fim && r.faltam > 0 && <span>fila de hoje termina por volta de <b style={{ color: '#1a1a1a' }}>{c.fim.toLocaleDateString('pt-BR')}</b></span>}
                  {!!r.sem_ciclo?.length && <span style={{ color: '#b4322a' }}>Sem ciclo de retorno: {r.sem_ciclo.join(', ')}</span>}
                </div>
              )}
              {r && !retorno && (
                <>
                  <div style={{ height: 8, background: '#f1efe8', borderRadius: 99, margin: '12px 0 6px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: ROXO, borderRadius: 99 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: '#6b6860' }}>
                    <span><b style={{ color: '#1a1a1a' }}>{r.enviadas}</b> de {r.total} enviadas ({pct}%)</span>
                    <span><b style={{ color: '#1a1a1a' }}>{r.faltam}</b> faltam</span>
                    <span><MessageCircle size={12} style={{ verticalAlign: -2 }} /> <b style={{ color: '#1a1a1a' }}>{r.responderam}</b> responderam</span>
                    <span><CheckCircle2 size={12} style={{ verticalAlign: -2 }} /> <b style={{ color: '#2f6b4f' }}>{r.voltaram}</b> voltaram ao salão</span>
                    {!!r.segundas && <span><b style={{ color: '#1a1a1a' }}>{r.segundas}</b> 2ª mensagem</span>}
                    <span><Users size={12} style={{ verticalAlign: -2 }} /> {c.porDia} por dia</span>
                    {c.fim && r.faltam > 0 && <span>termina por volta de <b style={{ color: '#1a1a1a' }}>{c.fim.toLocaleDateString('pt-BR')}</b></span>}
                    {!!r.sem_celular && <span style={{ color: '#a09a90' }}>{r.sem_celular} sem celular (fora)</span>}
                    {!!r.repetidos && <span style={{ color: '#a09a90' }}>{r.repetidos} com celular repetido (recebem uma vez)</span>}
                    {!!r.bloqueados && <span style={{ color: '#a09a90' }}>{r.bloqueados} pediram para sair</span>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** A chavinha liga/desliga de cada envio (pedido do dono, 29/09/2026). */
function Chave({ ligada, ocupado, onTrocar }: { ligada: boolean; ocupado: boolean; onTrocar: () => void }) {
  return (
    <button onClick={onTrocar} disabled={ocupado} role="switch" aria-checked={ligada} title={ligada ? 'Ligado: clique para pausar' : 'Pausado: clique para ligar'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: ocupado ? 'wait' : 'pointer', padding: 0 }}>
      <span style={{ width: 38, height: 22, borderRadius: 999, background: ligada ? '#2f9e62' : '#cfcac2', position: 'relative', transition: 'background .15s' }}>
        <span style={{ position: 'absolute', top: 3, left: ligada ? 19 : 3, width: 16, height: 16, borderRadius: 999, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.25)', transition: 'left .15s' }} />
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 800, color: ligada ? '#2f6b4f' : '#8f877f' }}>{ligada ? 'Ligado' : 'Desligado'}</span>
    </button>
  )
}

function botao(fundo: string, cor: string, borda: string): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 5, background: fundo, color: cor, border: `1.5px solid ${borda}`, borderRadius: 8, padding: '6px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
}
const rotulo: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: '#6b6860', display: 'block', marginBottom: 5 }
const campo: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1.5px solid #e0ddd8', borderRadius: 8, fontSize: 13, color: '#1a1a1a', background: '#fff' }
const secao: React.CSSProperties = { background: '#fff', border: '1.5px solid #e0ddd8', borderRadius: 12, padding: '16px 18px', marginBottom: 12 }
const tituloSecao: React.CSSProperties = { fontSize: 13.5, fontWeight: 800, color: '#1a1a1a', marginBottom: 12 }

function Editor({ d, setD, servicos, sujo, onCancelar, onSalvar }: {
  d: Disparo; setD: (d: Disparo) => void; servicos: { nome: string; clientes: number; ciclo?: number | null }[]; sujo: boolean
  onCancelar: () => void; onSalvar: () => Promise<void>
}) {
  const [previa, setPrevia] = useState<any>(null)
  const [carregandoPrevia, setCarregandoPrevia] = useState(false)
  const [buscaServ, setBuscaServ] = useState('')
  const [buscaNao, setBuscaNao] = useState('')
  const [telTeste, setTelTeste] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [simulando, setSimulando] = useState(false)
  const [simulacao, setSimulacao] = useState<any>(null)
  const [subindo, setSubindo] = useState(false)
  const pub = d.publico
  const retorno = d.tipo === 'retorno'
  const set = (p: Partial<Disparo>) => setD({ ...d, ...p })
  const setPub = (p: Partial<Publico>) => setD({ ...d, publico: { ...pub, ...p } })

  // Prévia com meio segundo de folga depois da última mudança.
  const chave = JSON.stringify([pub, d.saudacoes, d.mensagens, d.ciclos, d.tolerancia_dias])
  // Também pelo botão "Buscar" (pedido do dono, 29/09/2026: sem ele, não dava
  // para ter certeza de que a lista já tinha mudado). O número de ordem
  // impede que uma resposta atrasada sobrescreva a mais nova.
  const timer = useRef<any>(null)
  const ordem = useRef(0)
  const [atualizadaEm, setAtualizadaEm] = useState('')
  async function buscar() {
    clearTimeout(timer.current)
    const minha = ++ordem.current
    setCarregandoPrevia(true)
    const r = await fetch('/api/crm/disparos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'previa', disparo: d }) }).catch(() => null)
    const j = r?.ok ? await r.json().catch(() => null) : null
    if (minha !== ordem.current) return
    if (j) { setPrevia(j); setAtualizadaEm(new Date().toLocaleTimeString('pt-BR')) }
    setCarregandoPrevia(false)
  }
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(buscar, 500)
    return () => clearTimeout(timer.current)
  }, [chave]) // eslint-disable-line react-hooks/exhaustive-deps

  const c = contas(d, previa?.total || 0)
  const servFiltrados = useMemo(() => {
    const q = buscaServ.trim().toLowerCase()
    return servicos.filter(s => !pub.servicos.includes(s.nome) && (!q || s.nome.toLowerCase().includes(q))).slice(0, 30)
  }, [servicos, buscaServ, pub.servicos])
  const naoFiltrados = useMemo(() => {
    const q = buscaNao.trim().toLowerCase()
    return servicos.filter(s => !pub.servicos_nao.includes(s.nome) && (!q || s.nome.toLowerCase().includes(q))).slice(0, 30)
  }, [servicos, buscaNao, pub.servicos_nao])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button onClick={onCancelar} style={botao('#fff', '#1a1a1a', '#e0ddd8')}><X size={13} /> Voltar</button>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{d.id ? 'Editar' : 'Novo'} {retorno ? 'lembrete de retorno' : 'envio'}</div>
      </div>

      {/* 1. Público */}
      <div style={secao}>
        <div style={tituloSecao}>1. {retorno ? 'Quais serviços lembrar' : 'Para quem enviar'}</div>
        {retorno && (
          <div style={{ fontSize: 12.5, color: '#1a1a1a', background: '#f5f3ff', border: '1px solid #dcd7fa', borderRadius: 8, padding: '9px 11px', marginBottom: 12, lineHeight: 1.55 }}>
            Recebe quem fez um dos serviços escolhidos e já passou da data de voltar (data do serviço + ciclo de retorno da página
            Serviços). <b>Não recebe</b> quem está numa lista de <b>risco ou perdidas</b>: já recebeu a mensagem de recuperação depois
            da última visita, ou está na fila de uma que está ligada. Promoção e VIP não impedem o lembrete.
          </div>
        )}
        {!d.id && !retorno && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {MODELOS.map(m => (
              <button key={m.rotulo} onClick={() => setD({ ...d, ...m.d } as Disparo)}
                style={{ ...botao('#faf9f7', ROXO, '#e0ddd8'), borderRadius: 999 }}>{m.rotulo}</button>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
          <label><span style={rotulo}>Nome do envio</span>
            <input value={d.nome} onChange={e => set({ nome: e.target.value })} placeholder="Ex.: Recuperar perdidas" style={campo} /></label>
          {retorno ? (
            <label><span style={rotulo}>Lembrar até quantos dias depois da data de voltar</span>
              <input type="number" min={1} max={365} value={d.tolerancia_dias} onChange={e => set({ tolerancia_dias: Number(e.target.value) || 1 })} style={campo} /></label>
          ) : (<>
          <label><span style={rotulo}>Sem vir há pelo menos (dias)</span>
            <input type="number" min={0} value={pub.dias_min} onChange={e => setPub({ dias_min: Number(e.target.value) || 0 })} style={campo} /></label>
          <label><span style={rotulo}>E no máximo (dias, 0 = sem limite)</span>
            <input type="number" min={0} value={pub.dias_max} onChange={e => setPub({ dias_max: Number(e.target.value) || 0 })} style={campo} /></label>
          </>)}
          <label><span style={rotulo}>Tipo de cliente</span>
            <select value={pub.segmento} onChange={e => setPub({ segmento: e.target.value as any })} style={campo}>
              <option value="todos">Todas</option><option value="vip">VIP</option><option value="regular">Regulares</option><option value="novo">Vieram 1 vez</option>
            </select></label>
        </div>
        {/* Período da última visita: os mesmos atalhos do filtro de Mais
            Relatórios, cada um com quantas entram. Somam-se aos dias acima:
            não apagam o "máximo de dias". */}
        <div style={{ marginTop: 12 }}>
          <span style={rotulo}>Última visita foi em</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(previa?.periodos || []).map((o: any) => {
              const ativo = pub.ano_de === o.ano_de && pub.ano_ate === o.ano_ate
              return (
                <button key={o.id} onClick={() => setPub({ ano_de: o.ano_de, ano_ate: o.ano_ate })}
                  style={{ ...botao(ativo ? ROXO : '#fff', ativo ? '#fff' : '#1a1a1a', ativo ? ROXO : '#e0ddd8'), borderRadius: 999 }}>
                  {o.rotulo} <span style={{ opacity: 0.7, fontWeight: 600 }}>{o.total}</span>
                </button>
              )
            })}
            <button onClick={buscar} disabled={carregandoPrevia} style={{ ...botao(ROXO, '#fff', ROXO), opacity: carregandoPrevia ? 0.7 : 1 }}>
              {carregandoPrevia ? <Loader2 size={13} className="animate-spin" /> : null} Buscar
            </button>
            {!!pub.dias_max && (
              <span style={{ fontSize: 11.5, color: '#6b6860', alignSelf: 'center' }}>Contando só quem está entre {pub.dias_min} e {pub.dias_max} dias sem vir.</span>
            )}
          </div>
        </div>
        {!retorno && pub.dias_min >= 90 && (!pub.dias_max || pub.dias_max > 540) && (
          <div style={{ fontSize: 11.5, color: '#9a6b12', marginTop: 8 }}>
            Cliente sumida há mais de 1 ano e meio quase nunca volta e é quem mais denuncia a mensagem como spam. Vale colocar um limite máximo.
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <span style={rotulo}>{retorno ? 'Serviços (escolha um ou mais)' : 'Fez algum destes serviços (vazio = qualquer serviço)'}</span>
          {retorno && pub.servicos.length > 0 && (
            <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
              {pub.servicos.map(s => {
                const doCatalogo = servicos.find(x => x.nome === s)?.ciclo || null
                const proprio = d.ciclos[s] || 0
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#faf9f7', border: '1px solid #e8e6e0', borderRadius: 8, padding: '6px 10px', fontSize: 12.5 }}>
                    <b style={{ minWidth: 160 }}>{s}</b>
                    <span style={{ color: '#6b6860' }}>volta em</span>
                    <input type="number" min={1} value={proprio || ''} placeholder={doCatalogo ? String(doCatalogo) : '?'}
                      onChange={e => { const v = Number(e.target.value) || 0; const c = { ...d.ciclos }; if (v) c[s] = v; else delete c[s]; set({ ciclos: c }) }}
                      style={{ ...campo, width: 80, padding: '5px 8px' }} />
                    <span style={{ color: '#6b6860' }}>dias</span>
                    {!proprio && doCatalogo && <span style={{ color: '#2f6b4f', fontSize: 11.5 }}>(da página Serviços)</span>}
                    {!proprio && !doCatalogo && <span style={{ color: '#b4322a', fontSize: 11.5, fontWeight: 700 }}>sem ciclo: cadastre em Serviços ou escreva aqui</span>}
                    <button onClick={() => { const c = { ...d.ciclos }; delete c[s]; setD({ ...d, ciclos: c, publico: { ...pub, servicos: pub.servicos.filter(x => x !== s) } }) }}
                      style={{ marginLeft: 'auto', color: '#b4322a', display: 'inline-flex' }}><X size={14} /></button>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{ display: retorno ? 'none' : 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {pub.servicos.map(s => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eceaf9', color: ROXO, fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 999 }}>
                {s} <button onClick={() => setPub({ servicos: pub.servicos.filter(x => x !== s) })} style={{ color: ROXO, display: 'inline-flex' }}><X size={12} /></button>
              </span>
            ))}
          </div>
          <input value={buscaServ} onChange={e => setBuscaServ(e.target.value)} placeholder="Procurar serviço (modelagem, mega...)" style={{ ...campo, maxWidth: 360 }} />
          {buscaServ.trim() && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
              {servFiltrados.length > 1 && (
                <button onClick={() => { setPub({ servicos: [...pub.servicos, ...servFiltrados.map(s => s.nome)].slice(0, 40) }); setBuscaServ('') }}
                  style={botao(ROXO, '#fff', ROXO)}><Plus size={12} /> Adicionar todos ({servFiltrados.length})</button>
              )}
              {servFiltrados.map(s => (
                <button key={s.nome} onClick={() => { setPub({ servicos: [...pub.servicos, s.nome] }); setBuscaServ('') }}
                  style={{ ...botao('#fff', '#1a1a1a', '#e0ddd8'), fontWeight: 600 }}>{s.nome} <span style={{ color: '#a09a90' }}>{s.clientes}</span></button>
              ))}
              {!servFiltrados.length && <span style={{ fontSize: 12, color: '#a09a90' }}>Nenhum serviço com esse nome.</span>}
            </div>
          )}
        </div>

        {d.categoria === 'novas' && (
          <div style={{ fontSize: 12, color: '#1a1a1a', background: '#f5f3ff', border: '1px solid #dcd7fa', borderRadius: 8, padding: '9px 11px', marginTop: 12, lineHeight: 1.55 }}>
            Aqui entra quem veio <b>pela primeira vez na vida</b> e <b>não voltou</b> depois de pelo menos {pub.dias_min} dias
            {pub.dias_max ? <> (e no máximo {pub.dias_max})</> : null}. A aba <b>Novo</b> com "Este ano" mostra um número maior porque
            conta quem veio <b>1 vez neste ano</b>, incluindo clientes antigas que vinham nos anos anteriores. Para essas, a mensagem
            certa é a de Recuperar perdidas ou Clientes em risco.
          </div>
        )}
        {d.categoria === 'cruzada' && (
          <div style={{ marginTop: 12 }}>
            <span style={rotulo}>E NUNCA fez nenhum destes (o serviço que você quer vender)</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {pub.servicos_nao.map(s => (
                <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fdf3e1', color: '#9a6b12', fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 999 }}>
                  {s} <button onClick={() => setPub({ servicos_nao: pub.servicos_nao.filter(x => x !== s) })} style={{ color: '#9a6b12', display: 'inline-flex' }}><X size={12} /></button>
                </span>
              ))}
            </div>
            <input value={buscaNao} onChange={e => setBuscaNao(e.target.value)} placeholder="Procurar o serviço a oferecer (hidratação, tratamento...)" style={{ ...campo, maxWidth: 360 }} />
            {buscaNao.trim() && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                {naoFiltrados.length > 1 && (
                  <button onClick={() => { setPub({ servicos_nao: [...pub.servicos_nao, ...naoFiltrados.map(s => s.nome)].slice(0, 40) }); setBuscaNao('') }}
                    style={botao('#9a6b12', '#fff', '#9a6b12')}><Plus size={12} /> Adicionar todos ({naoFiltrados.length})</button>
                )}
                {naoFiltrados.map(s => (
                  <button key={s.nome} onClick={() => { setPub({ servicos_nao: [...pub.servicos_nao, s.nome] }); setBuscaNao('') }}
                    style={{ ...botao('#fff', '#1a1a1a', '#e0ddd8'), fontWeight: 600 }}>{s.nome} <span style={{ color: '#a09a90' }}>{s.clientes}</span></button>
                ))}
                {!naoFiltrados.length && <span style={{ fontSize: 12, color: '#a09a90' }}>Nenhum serviço com esse nome.</span>}
              </div>
            )}
            <div style={{ fontSize: 11.5, color: '#6b6860', marginTop: 6 }}>
              Na mensagem, <code>{'{servico}'}</code> é o que ela já faz e <code>{'{oferta}'}</code> é o primeiro serviço desta lista.
            </div>
          </div>
        )}

        {!retorno && (
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, fontSize: 12.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={d.continuo} onChange={e => set({ continuo: e.target.checked })} style={{ marginTop: 3 }} />
            <span><b>Envio contínuo</b>: não termina. Todo dia entra quem passa a caber na regra (ex.: completou 20 dias da primeira visita).
              Roda junto com as outras listas, sempre uma mensagem por vez.</span>
          </label>
        )}

        <div style={{ marginTop: 12, background: '#faf9f7', borderRadius: 10, padding: '10px 12px', fontSize: 12.5 }}>
          {carregandoPrevia && !previa ? <span style={{ color: '#6b6860' }}><Loader2 size={13} className="animate-spin" /> Contando...</span> : previa && (
            <>
              {carregandoPrevia
                ? <div style={{ color: '#9a6b12', fontWeight: 700, marginBottom: 3 }}><Loader2 size={12} className="animate-spin" style={{ verticalAlign: -2 }} /> Atualizando a lista...</div>
                : atualizadaEm && <div style={{ color: '#2f6b4f', fontWeight: 700, fontSize: 11.5, marginBottom: 3 }}>Lista atualizada às {atualizadaEm}</div>}
              <b style={{ fontSize: 15, color: ROXO, opacity: carregandoPrevia ? 0.4 : 1 }}>{previa.total}</b> {retorno ? 'clientes na hora de voltar agora' : 'clientes nesta lista'}
              {retorno && !pub.servicos.length && <div style={{ color: '#b4322a', fontWeight: 700 }}>Escolha pelo menos um serviço.</div>}
              {retorno && !!previa.sem_ciclo?.length && <div style={{ color: '#b4322a', fontWeight: 700 }}>Sem ciclo de retorno (ficam de fora): {previa.sem_ciclo.join(', ')}</div>}
              {!!previa.sem_celular && <span style={{ color: '#a09a90' }}> · {previa.sem_celular} sem celular válido ficam de fora</span>}
              {!!previa.repetidos && <span style={{ color: '#a09a90' }}> · {previa.repetidos} com celular repetido recebem uma vez só</span>}
              {pub.servicos.length > 1 && (
                <div style={{ color: '#6b6860', marginTop: 3 }}>
                  Com vários serviços marcados, cada cliente entra <b>uma vez só</b>, mesmo que tenha feito mais de um deles.
                  Por isso o total é menor que a soma dos números ao lado de cada serviço.
                </div>
              )}
              <div style={{ color: '#6b6860', marginTop: 3 }}>{retorno
                ? 'Ordem de envio: de quem venceu há mais tempo para quem venceu agora. Todo dia entra quem chegou na data. As primeiras:'
                : 'Ordem de envio: da visita mais recente para a mais antiga. As primeiras:'}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {(previa.amostra || []).map((a: any) => (
                  <span key={a.cliente} style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 7, padding: '3px 8px', fontSize: 11.5 }}>
                    {a.cliente} <span style={{ color: '#a09a90' }}>· {a.servico ? `${a.servico} em ${a.feito_em}${a.atraso ? `, venceu há ${a.atraso}d` : ', vence hoje'}` : `${a.dias}d`}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Mensagem */}
      <div style={secao}>
        <div style={tituloSecao}>2. Mensagem</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6b6860' }}>Modelos prontos (3 versões cada):</span>
          {(Object.keys(PRONTOS) as (keyof typeof PRONTOS)[]).map(k => (
            <button key={k} onClick={() => {
              if (d.mensagens.some(m => m.trim()) && !confirm(`Trocar a saudação, a mensagem e a 2ª mensagem pelas do modelo "${PRONTOS[k].rotulo}"?`)) return
              const t = textosDe(k)
              set({ saudacoes: t.saudacoes, mensagens: t.mensagens, segunda: { ...d.segunda, mensagens: t.segunda.mensagens } })
            }} style={{ ...botao(d.categoria === k ? '#eceaf9' : '#fff', ROXO, '#dcd7fa'), borderRadius: 999 }}>{PRONTOS[k].rotulo}</button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#1a1a1a', background: '#f5f3ff', border: '1px solid #dcd7fa', borderRadius: 8, padding: '8px 10px', marginBottom: 10, lineHeight: 1.5 }}>
          A cliente recebe, nesta ordem e separadas: <b>1)</b> a saudação{d.saudacoes.some(x => x.trim()) ? '' : ' (vazia: não vai)'},
          {' '}<b>2)</b> a mensagem{d.anexo ? <>, <b>3)</b> o anexo</> : ' (sem anexo: só estas)'}.
        </div>
        <div style={{ fontSize: 12, color: '#6b6860', marginBottom: 10, lineHeight: 1.5 }}>
          Campos que se preenchem sozinhos: <code>{'{cliente}'}</code> primeiro nome, <code>{'{servico}'}</code> o serviço escolhido
          no filtro acima (use só quando escolher serviço),
          {' '}<code>{'{dias}'}</code> há quantos dias não vem, <code>{'{ultima_visita}'}</code> a data{retorno ? <>, <code>{'{data_servico}'}</code> quando fez o serviço do lembrete</> : null}{d.categoria === 'cruzada' ? <>, <code>{'{oferta}'}</code> o serviço a oferecer</> : null}. Escreva 2 ou 3 versões
          diferentes: o sistema alterna entre elas, e o WhatsApp desconfia menos de texto que não é idêntico.
        </div>
        <div style={{ ...rotulo, fontSize: 12.5, color: '#1a1a1a', marginTop: 4 }}>1ª mensagem: saudação (opcional)</div>
        {d.saudacoes.map((m, i) => (
          <div key={'s' + i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={rotulo}>Versão {i + 1}</span>
              <button onClick={() => set({ saudacoes: d.saudacoes.filter((_, j) => j !== i) })} style={{ fontSize: 11.5, color: '#b4322a', fontWeight: 700 }}>remover</button>
            </div>
            <input value={m} onChange={e => set({ saudacoes: d.saudacoes.map((x, j) => j === i ? e.target.value : x) })} style={campo} />
          </div>
        ))}
        {d.saudacoes.length < 3 && (
          <button onClick={() => set({ saudacoes: [...d.saudacoes, d.saudacoes.length ? '' : OI] })} style={{ ...botao('#fff', ROXO, '#e0ddd8'), marginBottom: 12 }}>
            <Plus size={13} /> {d.saudacoes.length ? 'Outra versão da saudação' : 'Pôr saudação'}
          </button>
        )}
        <div style={{ ...rotulo, fontSize: 12.5, color: '#1a1a1a', marginTop: 8 }}>2ª mensagem</div>
        {d.mensagens.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={rotulo}>Versão {i + 1}</span>
              {d.mensagens.length > 1 && <button onClick={() => set({ mensagens: d.mensagens.filter((_, j) => j !== i) })} style={{ fontSize: 11.5, color: '#b4322a', fontWeight: 700 }}>remover</button>}
            </div>
            <textarea value={m} rows={5} onChange={e => set({ mensagens: d.mensagens.map((x, j) => j === i ? e.target.value : x) })}
              style={{ ...campo, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
            {previa?.amostra?.[i] && m.trim() && (
              <div style={{ fontSize: 11.5, color: '#6b6860', background: '#e7f1e9', borderRadius: 8, padding: '8px 10px', marginTop: 4, whiteSpace: 'pre-wrap' }}>
                <b>Como chega para {previa.amostra[i].cliente.split(' ')[0]}:</b>{'\n'}{previa.amostra[i].saudacao ? previa.amostra[i].saudacao + '\n—\n' : ''}{previa.amostra[i].mensagem}{d.anexo ? '\n—\n[' + d.anexo.tipo + ': ' + d.anexo.nome + ']' : ''}
              </div>
            )}
          </div>
        ))}
        {d.mensagens.length < 3 && (
          <button onClick={() => set({ mensagens: [...d.mensagens, ''] })} style={botao('#fff', ROXO, '#e0ddd8')}><Plus size={13} /> Outra versão</button>
        )}

        <div style={{ ...rotulo, fontSize: 12.5, color: '#1a1a1a', marginTop: 16 }}>3ª: anexo (opcional) — foto, vídeo, áudio ou arquivo</div>
        {d.anexo ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#faf9f7', border: '1px solid #e8e6e0', borderRadius: 8, padding: '8px 10px' }}>
            {d.anexo.tipo === 'imagem' && <img src={d.anexo.url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }} />}
            {d.anexo.tipo === 'video' && <video src={d.anexo.url} style={{ width: 96, height: 56, borderRadius: 6, background: '#000' }} />}
            {d.anexo.tipo === 'audio' && <audio src={d.anexo.url} controls style={{ height: 34 }} />}
            <span style={{ fontSize: 12.5 }}><b>{d.anexo.nome}</b> <span style={{ color: '#a09a90' }}>({d.anexo.tipo})</span></span>
            <button onClick={() => set({ anexo: null })} style={{ marginLeft: 'auto', fontSize: 11.5, color: '#b4322a', fontWeight: 700 }}>remover</button>
          </div>
        ) : (
          <label style={{ ...botao('#fff', ROXO, '#dcd7fa'), display: 'inline-flex', opacity: subindo ? 0.6 : 1 }}>
            {subindo ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />} {subindo ? 'Enviando arquivo...' : 'Anexar arquivo'}
            <input type="file" accept="image/*,video/*,audio/*,application/pdf" style={{ display: 'none' }} disabled={subindo}
              onChange={async e => {
                const f = e.target.files?.[0]; e.target.value = ''
                if (!f) return
                if (f.size > 16 * 1024 * 1024) { alert('Arquivo grande demais para o WhatsApp mandar em lista (máximo 16 MB).'); return }
                setSubindo(true)
                try {
                  const { url, type } = await enviarArquivo(f)
                  const m = String(type || f.type || '')
                  const tipo = m.startsWith('image/') ? 'imagem' : m.startsWith('video/') ? 'video' : m.startsWith('audio/') ? 'audio' : 'documento'
                  set({ anexo: { url, tipo, nome: f.name } })
                } catch (err: any) { alert(err?.message || 'Não consegui enviar o arquivo.') }
                setSubindo(false)
              }} />
          </label>
        )}
      </div>

      {/* 3. Ritmo */}
      <div style={secao}>
        <div style={tituloSecao}>3. Ritmo (é isso que evita bloqueio)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
          <label><span style={rotulo}>Começa no dia (vazio = assim que ligar)</span>
            <input type="date" value={d.inicio} min={hojeISO()} onChange={e => set({ inicio: e.target.value })} style={campo} /></label>
          <label><span style={rotulo}>Último dia (vazio = até a lista acabar)</span>
            <input type="date" value={d.fim} min={d.inicio || hojeISO()} onChange={e => set({ fim: e.target.value })} style={campo} /></label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <label><span style={rotulo}>Começa às</span><input type="time" value={d.janela_ini} onChange={e => set({ janela_ini: e.target.value })} style={campo} /></label>
          <label><span style={rotulo}>Para às</span><input type="time" value={d.janela_fim} onChange={e => set({ janela_fim: e.target.value })} style={campo} /></label>
          <label><span style={rotulo}>Uma mensagem a cada</span>
            <select value={d.intervalo_min} onChange={e => set({ intervalo_min: Number(e.target.value) })} style={campo}>
              {[...new Set([...INTERVALOS, d.intervalo_min])].sort((a, b) => a - b).map(v => <option key={v} value={v}>{v < 60 ? `${v} min` : `${v / 60} h`.replace('.5', ',5')}</option>)}
            </select></label>
          <label><span style={rotulo}>Máximo por dia</span><input type="number" min={1} max={300} value={d.max_dia} onChange={e => set({ max_dia: Number(e.target.value) || 1 })} style={campo} /></label>
          <label><span style={rotulo}>Não mandar para quem recebeu algo nos últimos (dias)</span>
            <input type="number" min={0} max={180} value={d.trava_dias} onChange={e => set({ trava_dias: Number(e.target.value) || 0 })} style={campo} /></label>
        </div>
        <div style={{ marginTop: 10 }}>
          <span style={rotulo}>Dias da semana</span>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {DIAS.map((n, i) => {
              const on = d.dias_semana.includes(i)
              return <button key={n} onClick={() => set({ dias_semana: on ? d.dias_semana.filter(x => x !== i) : [...d.dias_semana, i].sort() })}
                style={{ ...botao(on ? ROXO : '#fff', on ? '#fff' : '#6b6860', on ? ROXO : '#e0ddd8'), minWidth: 48, justifyContent: 'center' }}>{n}</button>
            })}
          </div>
        </div>

        <div style={{ marginTop: 14, background: '#f5f3ff', border: '1px solid #dcd7fa', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, lineHeight: 1.7, color: '#1a1a1a' }}>
          <div>Das <b>{d.janela_ini}</b> às <b>{d.janela_fim}</b>, uma a cada <b>{d.intervalo_min} min</b>: cabem <b>{c.cabem}</b> por dia.</div>
          {d.max_dia > c.cabem ? (
            <div style={{ color: '#9a6b12', fontWeight: 700 }}>
              Você pediu {d.max_dia} por dia, mas nesse ritmo só cabem {c.cabem}. Para mandar {d.max_dia}, o intervalo precisa ser de no máximo {c.intervaloParaMax} min.
            </div>
          ) : (
            <div>Com o máximo de <b>{d.max_dia}</b> por dia, a última sai por volta das <b>{c.terminaAs}</b>.</div>
          )}
          {d.inicio && <div>Começa em <b>{br(d.inicio)}</b>{d.fim ? <> e vai até <b>{br(d.fim)}</b></> : null}.</div>}
          {/* A previsão vale para TODOS os tipos (pedido do dono, 29/09/2026):
              é por ela que se marca o início do envio seguinte. No lembrete e
              na lista contínua ela conta quem já está na fila hoje. */}
          {previa && previa.total > 0 && c.porDia > 0 && (
            <div>{retorno || d.continuo ? <>Quem já está na fila hoje (<b>{previa.total}</b> clientes)</> : <>A lista de <b>{previa.total}</b> clientes</>} leva uns <b>{c.diasDeEnvio}</b> dias de envio{c.fim ? <> e termina por volta de <b>{c.fim.toLocaleDateString('pt-BR')}</b></> : null}.
              {(retorno || d.continuo) && <> Depois disso ele continua ligado, mandando só para quem for chegando na regra, poucas por dia.</>}</div>
          )}
          {previa && previa.total === 0 && (retorno || d.continuo) && (
            <div>Ninguém na fila hoje. Ele fica ligado e manda conforme as clientes forem chegando na regra.</div>
          )}
          {c.fim && previa && previa.total > 0 && (
            <div style={{ color: '#6b6860' }}>Para o próximo envio começar depois deste, marque a data de início dele para depois de <b>{c.fim.toLocaleDateString('pt-BR')}</b>. Se outro envio estiver rodando no mesmo período, os dois dividem o dia e a data vai um pouco mais longe.</div>
          )}
          {previa && c.cabemNoPeriodo != null && c.cabemNoPeriodo < previa.total && (
            <div style={{ color: '#9a6b12', fontWeight: 700 }}>
              Até {br(d.fim)} só dá para mandar umas {c.cabemNoPeriodo}: as outras {previa.total - c.cabemNoPeriodo} ficam para um próximo envio (é só ligar de novo depois).
            </div>
          )}
          {d.max_dia > 50 && <div style={{ color: '#9a6b12' }}>Mais de 50 por dia aumenta o risco de bloqueio. Comece com 20 e suba aos poucos.</div>}
        </div>
      </div>

      {/* 5. 2ª mensagem (pedido do dono, 29/09/2026) */}
      <div style={secao}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          <div style={{ ...tituloSecao, marginBottom: 0 }}>Segunda mensagem para quem não respondeu</div>
          <Chave ligada={d.segunda.ligada} ocupado={false} onTrocar={() => set({ segunda: { ...d.segunda, ligada: !d.segunda.ligada } })} />
        </div>
        <div style={{ fontSize: 12, color: '#6b6860', lineHeight: 1.5, marginBottom: 10 }}>
          Sai uma vez só, uma mensagem curta, para quem recebeu a primeira e <b>não respondeu, não agendou e não voltou ao salão</b>.
          Conta no mesmo máximo por dia e respeita o mesmo horário. Muita cliente só responde na segunda tentativa.
        </div>
        {d.segunda.ligada && (
          <>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 10 }}>
              Mandar <input type="number" min={1} max={60} value={d.segunda.dias} onChange={e => set({ segunda: { ...d.segunda, dias: Number(e.target.value) || 1 } })} style={{ ...campo, width: 70, padding: '5px 8px' }} /> dias depois da primeira
            </label>
            {d.segunda.mensagens.map((m, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={rotulo}>Versão {i + 1}</span>
                  {d.segunda.mensagens.length > 1 && <button onClick={() => set({ segunda: { ...d.segunda, mensagens: d.segunda.mensagens.filter((_, j) => j !== i) } })} style={{ fontSize: 11.5, color: '#b4322a', fontWeight: 700 }}>remover</button>}
                </div>
                <textarea value={m} rows={2} onChange={e => set({ segunda: { ...d.segunda, mensagens: d.segunda.mensagens.map((x, j) => j === i ? e.target.value : x) } })}
                  style={{ ...campo, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
              </div>
            ))}
            {d.segunda.mensagens.length < 3 && (
              <button onClick={() => set({ segunda: { ...d.segunda, mensagens: [...d.segunda.mensagens, ''] } })} style={botao('#fff', ROXO, '#e0ddd8')}><Plus size={13} /> Outra versão</button>
            )}
          </>
        )}
      </div>

      {/* 4. Teste e salvar */}
      <div style={secao}>
        <div style={tituloSecao}>4. Testar antes de ligar</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={telTeste} onChange={e => setTelTeste(e.target.value)} placeholder="Seu celular com DDD" style={{ ...campo, maxWidth: 220 }} />
          <button disabled={testando || !telTeste.trim()} onClick={async () => {
            setTestando(true)
            const r = await fetch('/api/crm/disparos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'teste', disparo: d, telefone: telTeste }) })
            const j = await r.json().catch(() => ({}))
            setTestando(false)
            alert(r.ok ? `Teste enviado: ${j.enviadas} mensagem(ns), com os dados da primeira cliente da lista. Confira no seu WhatsApp.` : (j.error || 'Não consegui enviar o teste.'))
          }} style={botao('#fff', ROXO, '#dcd7fa')}>
            {testando ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Enviar teste
          </button>
          <span style={{ fontSize: 11.5, color: '#a09a90' }}>Manda saudação, mensagem e anexo (cada versão) para este número. Ninguém da lista recebe.</span>
        </div>
        <div style={{ marginTop: 12 }}>
          <button disabled={simulando} onClick={async () => {
            setSimulando(true)
            const r = await fetch('/api/crm/disparos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'simular', disparo: d }) })
            setSimulacao(r.ok ? await r.json() : { erro: true })
            setSimulando(false)
          }} style={botao('#fff', '#1a1a1a', '#e0ddd8')}>
            {simulando ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />} Simular: quem receberia agora?
          </button>
          {simulacao && !simulacao.erro && (
            <div style={{ marginTop: 8, fontSize: 12.5, background: '#faf9f7', borderRadius: 10, padding: '10px 12px', lineHeight: 1.6 }}>
              {simulacao.travas?.length ? <div style={{ color: '#9a6b12', fontWeight: 700 }}>Agora não sairia: {simulacao.travas.join('; ')}.</div>
                : <div style={{ color: '#2f6b4f', fontWeight: 700 }}>Se estivesse ligado, sairia agora.</div>}
              {simulacao.proxima
                ? <div>Próxima da fila: <b>{simulacao.proxima.cliente}</b> ({simulacao.proxima.dias} dias sem vir).</div>
                : <div>Ninguém disponível na lista agora.</div>}
              {!!simulacao.segundas_pendentes && <div>2ª mensagem esperando para sair: <b>{simulacao.segundas_pendentes}</b> cliente(s) que não responderam.</div>}
              {!!simulacao.puladas?.length && (
                <div style={{ color: '#6b6860' }}>Puladas antes dela: {simulacao.puladas.map((p: any) => `${p.cliente} (${p.motivo})`).join(', ')}.</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 30 }}>
        <button onClick={onCancelar} style={botao('#fff', '#1a1a1a', '#e0ddd8')}>Cancelar</button>
        <button disabled={salvando || !d.nome.trim() || !d.mensagens.some(m => m.trim())} onClick={async () => { setSalvando(true); await onSalvar(); setSalvando(false) }}
          style={{ ...botao(ROXO, '#fff', ROXO), padding: '9px 20px', fontSize: 13, opacity: (!d.nome.trim() || !d.mensagens.some(m => m.trim())) ? 0.5 : 1 }}>
          {salvando ? <Loader2 size={14} className="animate-spin" /> : null} {sujo ? 'Salvar' : 'Salvo'}
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: '#a09a90', textAlign: 'right', marginTop: -22, marginBottom: 30 }}>Depois de salvar, ligue o envio na lista.</div>
    </div>
  )
}
