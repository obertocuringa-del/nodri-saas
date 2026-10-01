'use client'

import { useEffect, useState } from 'react'

// ── Central do servidor ─────────────────────────────────────────────────────
// Pedido do dono (01/10/2026): seis botões -- coleta, extensão, CRM, ponte,
// servidor, vigias -- verde quando tudo está certo em TODOS os salões,
// vermelho quando algum salão tem problema. Clicar abre o salão e o motivo.
// Atualiza sozinha a cada 30 segundos.

type Cor = 'verde' | 'amarelo' | 'vermelho' | 'cinza'
interface Item {
  salao?: string; cor: Cor; texto: string; detalhe?: string
  // Vem da API para a tela saber em que salão agir (ligar/desligar o CRM,
  // fechar aba). Ver src/app/api/admin/central/route.ts.
  salao_id?: string
  crm_ligado?: boolean
}
interface Bloco { cor: Cor; resumo: string; itens: Item[]; extra?: any }

const CORES: Record<Cor, { fundo: string; borda: string; texto: string; ponto: string; rotulo: string }> = {
  verde:    { fundo: '#e7f1e9', borda: '#bfd9c8', texto: '#2f6b4f', ponto: '#2f9e5b', rotulo: 'Tudo certo' },
  amarelo:  { fundo: '#fbf2e0', borda: '#e8d9b0', texto: '#9a6b12', ponto: '#d39a1f', rotulo: 'Atenção' },
  vermelho: { fundo: '#fbeae6', borda: '#e8c5be', texto: '#b4322a', ponto: '#d23b2f', rotulo: 'Com problema' },
  cinza:    { fundo: '#f3f1ee', borda: '#e0ddd8', texto: '#6b6860', ponto: '#a8a29a', rotulo: 'Sem dados' },
}

const BOTOES: { id: string; titulo: string; reiniciar?: { alvo: string; texto: string } }[] = [
  { id: 'coleta', titulo: 'Relatório — coleta de dados completa', reiniciar: { alvo: 'relatorio', texto: 'Reiniciar o robô do relatório' } },
  { id: 'extensao', titulo: 'Extensão', reiniciar: { alvo: 'robo', texto: 'Reiniciar o robô do Avec (extensão)' } },
  { id: 'crm', titulo: 'CRM' },
  { id: 'ponte', titulo: 'Ponte', reiniciar: { alvo: 'ponte', texto: 'Reiniciar a ponte do WhatsApp' } },
  // Pedido do dono (01/10/2026): duas abas por salao -- a da coleta e a do
  // relatorio 0051. Mais que isso come o servidor; daqui da para fechar as
  // que estao sobrando sem encostar nas que estao trabalhando.
  { id: 'abas', titulo: 'Abas do Chrome' },
  { id: 'servidor', titulo: 'Servidor' },
  { id: 'vigias', titulo: 'Vigias' },
]

const mb = (v: number | null | undefined) => (v == null ? '—' : v >= 1024 ? `${(v / 1024).toFixed(1).replace('.', ',')} GB` : `${v} MB`)

export default function CentralServidor() {
  const [dados, setDados] = useState<any>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')

  async function carregar() {
    try {
      const r = await fetch('/api/admin/central', { cache: 'no-store' })
      if (!r.ok) { setErro('Não consegui ler a situação do servidor.'); return }
      setDados(await r.json()); setErro('')
    } catch { setErro('Sem conexão com o NODRI.') }
  }
  useEffect(() => { carregar(); const t = setInterval(carregar, 30000); return () => clearInterval(t) }, [])

  async function reiniciar(alvo: string, texto: string) {
    const extra = alvo === 'servidor' ? '\n\nO site, o CRM e o WhatsApp ficam fora do ar por uns 3 a 5 minutos.' : ''
    if (!window.confirm(`${texto}?${extra}`)) return
    const r = await fetch('/api/admin/central', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'reiniciar', alvo }) })
    setAviso(r.ok ? `Pedido feito: ${texto.toLowerCase()}. O servidor executa em até 1 minuto.` : 'Não consegui fazer o pedido.')
    carregar()
    setTimeout(() => setAviso(''), 10000)
  }

  async function mandar(corpo: any, confirmar?: string) {
    if (confirmar && !confirm(confirmar)) return
    setAviso('')
    try {
      const r = await fetch('/api/admin/central', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
      })
      const j = await r.json().catch(() => ({}))
      setAviso(j.texto || (r.ok ? 'Feito.' : 'Não consegui fazer isso.'))
      await carregar()
    } catch { setAviso('Não consegui falar com o servidor.') }
  }

  if (!dados) return <div style={{ fontSize: 13, color: '#8f877f', padding: 12 }}>{erro || 'Lendo a situação do servidor...'}</div>
  const b: Record<string, Bloco> = dados.blocos
  const atual = aberto ? b[aberto] : null
  const botao = BOTOES.find(x => x.id === aberto)

  return (
    <section style={{ background: '#fff', border: '1px solid #e8e6e0', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>Saúde do servidor</h2>
        <span style={{ fontSize: 11.5, color: '#8f877f' }}>atualiza sozinha a cada 30 s · conferido {dados.agora}</span>
        <div style={{ flex: 1 }} />
        <button onClick={carregar} style={{ fontSize: 12, fontWeight: 700, color: '#5b4fcf', background: 'none', border: 'none', cursor: 'pointer' }}>Atualizar agora</button>
      </div>
      {aviso && <div style={{ fontSize: 12.5, color: '#2f6b4f', fontWeight: 700, marginBottom: 10 }}>{aviso}</div>}
      {erro && <div style={{ fontSize: 12.5, color: '#b4322a', fontWeight: 700, marginBottom: 10 }}>{erro}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 8 }}>
        {BOTOES.map(bt => {
          const x = b[bt.id]; const c = CORES[x?.cor || 'cinza']; const ativo = aberto === bt.id
          return (
            <button key={bt.id} onClick={() => setAberto(ativo ? null : bt.id)}
              style={{ textAlign: 'left', borderRadius: 12, padding: '12px 12px 10px', cursor: 'pointer',
                background: c.fundo, border: `2px solid ${ativo ? c.texto : c.borda}`, minHeight: 92 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <span style={{ width: 11, height: 11, borderRadius: 99, background: c.ponto, flexShrink: 0,
                  boxShadow: x?.cor === 'vermelho' ? `0 0 0 4px ${c.borda}` : undefined }} />
                <strong style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.2 }}>{bt.titulo}</strong>
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: c.texto, textTransform: 'uppercase', letterSpacing: '.03em' }}>{c.rotulo}</div>
              <div style={{ fontSize: 11.5, color: '#4a4540', marginTop: 2, lineHeight: 1.35 }}>{x?.resumo}</div>
            </button>
          )
        })}
      </div>

      {atual && botao && (
        <div style={{ marginTop: 12, border: `1px solid ${CORES[atual.cor].borda}`, borderRadius: 12, padding: 14, background: '#fdfcfa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>{botao.titulo}</strong>
            <span style={{ fontSize: 12, color: CORES[atual.cor].texto, fontWeight: 700 }}>{atual.resumo}</span>
            <div style={{ flex: 1 }} />
            {botao.reiniciar && (
              <button onClick={() => reiniciar(botao.reiniciar!.alvo, botao.reiniciar!.texto)}
                style={{ fontSize: 12, fontWeight: 800, padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#5b4fcf', color: '#fff' }}>
                {botao.reiniciar.texto}
              </button>
            )}
          </div>

          {aberto === 'servidor' ? <PainelServidor x={atual.extra} reiniciar={reiniciar} /> : null}
          {aberto === 'ponte' && atual.extra && (
            <p style={{ fontSize: 12.5, color: '#4a4540', margin: '0 0 10px' }}>
              Programa da ponte: <b>{atual.extra.status}</b>{atual.extra.ha ? ` · no ar há ${atual.extra.ha}` : ''} · reiniciado {atual.extra.reinicios ?? 0} vez(es)
            </p>
          )}

          {atual.itens.length === 0 && aberto !== 'servidor' && <p style={{ fontSize: 12.5, color: '#8f877f', margin: 0 }}>Nada para mostrar.</p>}
          <div style={{ display: 'grid', gap: 6 }}>
            {[...atual.itens].sort((a, z) => ['vermelho', 'amarelo', 'verde', 'cinza'].indexOf(a.cor) - ['vermelho', 'amarelo', 'verde', 'cinza'].indexOf(z.cor)).map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 9, background: CORES[it.cor].fundo }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: CORES[it.cor].ponto, marginTop: 5, flexShrink: 0 }} />
                <div style={{ fontSize: 12.5, color: '#1a1a2e', lineHeight: 1.45, flex: 1 }}>
                  {it.salao && <b>{it.salao}: </b>}{it.texto}
                  {it.detalhe && <div style={{ fontSize: 11.5, color: '#6b6860', wordBreak: 'break-word' }}>{it.detalhe}</div>}

                  {aberto === 'crm' && it.salao_id && (
                    <button
                      onClick={() => mandar(
                        { acao: it.crm_ligado ? 'crm_desligar' : 'crm_ligar', salao_id: it.salao_id },
                        it.crm_ligado
                          ? `Desligar o CRM de ${it.salao}?

A ponte para de gerar QR Code para este salão. As conversas não são apagadas.`
                          : `Ligar o CRM de ${it.salao}?

O QR Code volta a aparecer no CRM deste salão.`,
                      )}
                      style={{ marginTop: 7, fontSize: 11.5, fontWeight: 800, padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                        background: it.crm_ligado ? '#b4322a' : '#2f6b4f', color: '#fff' }}>
                      {it.crm_ligado ? 'Desligar o CRM deste salão' : 'Ligar o CRM deste salão'}
                    </button>
                  )}

                  {aberto === 'abas' && it.salao_id && <PainelAbas salaoId={it.salao_id} dados={atual.extra} mandar={mandar} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function PainelServidor({ x, reiniciar }: { x: any; reiniciar: (alvo: string, texto: string) => void }) {
  if (!x) return null
  const linha = (rot: string, val: any) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '4px 0', borderBottom: '1px solid #f0ece7' }}>
      <span style={{ color: '#6b6860' }}>{rot}</span><b style={{ color: '#1a1a2e', textAlign: 'right' }}>{val ?? '—'}</b>
    </div>
  )
  const pct = (u: number | null, t: number | null) => (u != null && t ? ` (${Math.round((u / t) * 100)}%)` : '')
  return (
    <div style={{ display: 'grid', gap: 14, marginBottom: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        <div>
          {linha('Ligado desde', x.boot ? `${x.boot.slice(8, 10)}/${x.boot.slice(5, 7)} ${x.boot.slice(11, 16)}` : null)}
          {linha('Ligado há', x.ligado_ha)}
          {linha('Carga do processador', x.carga != null ? String(x.carga).replace('.', ',') : null)}
          {linha('Memória', `${mb(x.mem_usada)} de ${mb(x.mem_total)}${pct(x.mem_usada, x.mem_total)}`)}
          {linha('Disco', `${mb(x.disco_usado)} de ${mb(x.disco_total)}${pct(x.disco_usado, x.disco_total)}`)}
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: '#6b6860', marginBottom: 4 }}>PROGRAMAS NO SERVIDOR</div>
          {(x.processos || []).length === 0 && <div style={{ fontSize: 12, color: '#8f877f' }}>Sem dados ainda.</div>}
          {(x.processos || []).map((p: any) => (
            <div key={p.usuario + p.nome} style={{ display: 'flex', gap: 8, fontSize: 12.5, padding: '4px 0', borderBottom: '1px solid #f0ece7', alignItems: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: p.status === 'online' ? '#2f9e5b' : '#d23b2f' }} />
              <b style={{ flex: 1 }}>{p.nome}</b>
              <span style={{ color: '#6b6860' }}>{p.status === 'online' ? `no ar há ${p.ha || '?'}` : p.status}</span>
              <span style={{ color: '#a8a29a' }}>↺ {p.reinicios}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: '#6b6860', marginBottom: 6 }}>REINICIAR</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['nodri', 'Reiniciar o site NODRI'], ['ponte', 'Reiniciar a ponte do WhatsApp'], ['robo', 'Reiniciar o robô do Avec'], ['relatorio', 'Reiniciar o robô do relatório']].map(([a, t]) => (
            <button key={a} onClick={() => reiniciar(a, t)}
              style={{ fontSize: 12, fontWeight: 700, padding: '7px 11px', borderRadius: 8, border: '1px solid #d7d2f3', background: '#f3f1fd', color: '#5b4fcf', cursor: 'pointer' }}>{t}</button>
          ))}
          <button onClick={() => reiniciar('servidor', 'Reiniciar o servidor inteiro')}
            style={{ fontSize: 12, fontWeight: 800, padding: '7px 11px', borderRadius: 8, border: 'none', background: '#b4322a', color: '#fff', cursor: 'pointer' }}>Reiniciar o servidor inteiro</button>
          <a href={x.hostinger} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, fontWeight: 700, padding: '7px 11px', borderRadius: 8, border: '1px solid #e0ddd8', background: '#fff', color: '#1a1a2e', textDecoration: 'none' }}>
            Abrir o console da Hostinger ↗
          </a>
        </div>
        <p style={{ fontSize: 11.5, color: '#8f877f', margin: '6px 0 0' }}>
          O pedido entra na fila e o vigia executa em até 1 minuto. Se o vigia não estiver rodando (servidor sem notícia), use o console da Hostinger.
        </p>
        {(x.pedidos || []).length > 0 && (
          <p style={{ fontSize: 12, color: '#9a6b12', margin: '6px 0 0', fontWeight: 700 }}>
            Na fila: {x.pedidos.map((p: any) => `${p.nome} (${p.quando})`).join(', ')}
          </p>
        )}
      </div>

      <div>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: '#6b6860', marginBottom: 4 }}>ÚLTIMOS REINÍCIOS</div>
        {(x.historico || []).length === 0 && <div style={{ fontSize: 12, color: '#8f877f' }}>Nenhum registrado.</div>}
        {(x.historico || []).map((r: any, i: number) => (
          <div key={i} style={{ fontSize: 12, padding: '3px 0', color: '#4a4540' }}>
            <b>{r.quando}</b> · {r.nome} · {r.origem === 'botao' ? 'pelo botão' : 'pelo vigia'} — {r.motivo}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── As abas de um salão, uma a uma ──────────────────────────────────────────
//
// Mostra para que serve cada aba e só oferece o botão de fechar nas que estão
// sobrando. A da coleta (o robô do relatório pode estar lendo agora) e a da
// automação (o 0051 da extensão) aparecem marcadas e sem botão -- fechar uma
// delas no meio do serviço estraga a coleta do dia.
function PainelAbas({ salaoId, dados, mandar }: { salaoId: string; dados: any; mandar: (c: any, p?: string) => void }) {
  const r = dados?.porSalao?.[salaoId]
  if (!r || r.erro) return null
  const sobrando = (r.abas || []).filter((a: any) => a.pode_fechar)

  return (
    <div style={{ marginTop: 9, display: 'grid', gap: 5 }}>
      {(r.abas || []).map((a: any) => (
        <div key={a.id} style={{
          display: 'flex', gap: 8, alignItems: 'center', fontSize: 11.5,
          padding: '5px 8px', borderRadius: 7,
          background: a.pode_fechar ? '#fdf2f1' : '#eef6f1',
        }}>
          <b style={{ flexShrink: 0, color: a.papel === 'automacao' ? '#2f6b4f' : a.papel === 'coleta' ? '#5b4fcf' : '#b4322a' }}>
            {a.papel === 'automacao' ? 'AUTOMAÇÃO' : a.papel === 'coleta' ? 'COLETA' : 'SOBRANDO'}
          </b>
          <span style={{ flex: 1, color: '#4a4540', wordBreak: 'break-all' }}>
            {a.url || 'aba em branco'}
            <span style={{ color: '#8f877f' }}> — {a.porque}</span>
          </span>
          {a.pode_fechar && (
            <button onClick={() => mandar({ acao: 'abas_fechar', salao_id: salaoId, aba_id: a.id }, 'Fechar esta aba?')}
              style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, padding: '4px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#b4322a', color: '#fff' }}>
              Fechar
            </button>
          )}
        </div>
      ))}
      {sobrando.length > 1 && (
        <button onClick={() => mandar({ acao: 'abas_limpar', salao_id: salaoId }, `Fechar as ${sobrando.length} abas que estão sobrando?`)}
          style={{ justifySelf: 'start', marginTop: 3, fontSize: 11.5, fontWeight: 800, padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: '#b4322a', color: '#fff' }}>
          Fechar as {sobrando.length} que estão sobrando
        </button>
      )}
    </div>
  )
}
