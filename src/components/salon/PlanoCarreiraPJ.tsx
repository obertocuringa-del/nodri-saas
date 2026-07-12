'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Save, Printer, ChevronDown, CheckCircle2, Pencil, Sparkles, Users, X } from 'lucide-react'
import { getLogoSalao } from '@/lib/logoSalao'
import PlanoCarreiraProgresso from '@/components/salon/PlanoCarreiraProgresso'

interface Nivel {
  id: string
  emoji: string
  titulo: string
  cor: string
  perfil: string
  atividades: string
  certificados: string
  indicadores: string
  comissionamento: string
  beneficios: string
  meta: string
}
interface Doc { intro: string; niveis: Nivel[] }

const CHAVE = 'plano_carreira_pj'
const linhas = (s: string) => (s || '').split('\n').map(l => l.trim()).filter(Boolean)

const DEFAULT_DOC: Doc = {
  intro: 'Este é o caminho de crescimento dentro do salão. A cada degrau que você sobe, ganha mais reconhecimento, mais autonomia na agenda e principalmente mais dinheiro no bolso. Aqui embaixo você vê exatamente o que precisa fazer para subir de nível — e o que ganha em cada etapa. O seu crescimento é o nosso crescimento! 🚀',
  niveis: [
    {
      id: 'n1', emoji: '1️⃣', titulo: 'Assistente de Cabeleireiro', cor: '#16a34a',
      perfil: 'Profissional iniciante que auxilia os cabeleireiros, com experiência mínima de 6 meses.',
      atividades: 'Lavar e preparar os cabelos.\nAplicar tonalizantes e tratamentos sob supervisão.\nAuxiliar na organização do salão.',
      certificados: 'Curso de lavatório ou de tratamentos das marcas parceiras.',
      indicadores: 'Tempo de experiência no salão: no mínimo 1 ano.\nAvaliação técnica (Vera) e comportamental (Avaliação 360º) acima de 80%. Se não atingir, pode refazer a avaliação após 3 meses.\nFaturamento Bruto Médio Anual: a partir de R$ 7.300 (habilidade: modelagem e tratamentos).\nFaturamento Líquido: a partir de R$ 3.320.\nTicket médio: R$ 115.\nNPS: média nota 8.\n*1 curso: realinhamento, tricologia, coloração ou modelagem avançada (Curso de Realinhamento Capilar, Curso de Tricologia, Curso de Coloração ou Curso de Modelagem Avançada).\n*Habilidade: 20 colorações realizadas (criar tabela com quantidades x habilidades).\nParticipação em reuniões e treinamentos internos a partir de 80% de frequência.',
      comissionamento: '8,5% a 37,5% sobre serviços auxiliares (ex.: tratamento, escova, aplicação de produto).',
      beneficios: '',
      meta: 'Se desenvolver tecnicamente para assumir pequenos serviços.',
    },
    {
      id: 'n2', emoji: '2️⃣', titulo: 'Cabeleireiro Júnior', cor: '#0891b2',
      perfil: 'Profissional recém-promovido ou com até 2 anos de experiência no mercado.',
      atividades: 'Realinhamento / Maquiagem / Corte / Mechas.\nTricologia, coloração global, retoques e esfumado.\nModelagem avançada e babyliss.',
      certificados: 'Curso de modelagem/preparação de penteado e coloração básica.',
      indicadores: 'Tempo de experiência no salão e na função: de 1 a 2 anos.\nAvaliação técnica (Vera) e comportamental (Avaliação 360º) acima de 80%. Se não atingir, pode refazer a avaliação após 3 meses.\nFaturamento Bruto Médio: R$ 17.000.\nFaturamento Líquido: a partir de R$ 6.000.\nTicket médio: a partir de R$ 230.\nTaxa de retorno de clientes: a partir de 34%.\nNPS: média nota 9.\n*2 cursos: corte, mechas, realinhamento, coloração global ou maquiagem.\n*Habilidade: a definir com a Bruna/Vera.\nEngajamento com redes sociais para captação de novos clientes, com cronograma de produção.\nParticipação em reuniões e treinamentos internos a partir de 80% de frequência.',
      comissionamento: '30% a 37,5% sobre serviços realizados.',
      beneficios: 'R$ 250 em curso de capacitação por semestre (não acumulativo) e parcelamento do curso no rateio.',
      meta: 'Desenvolvimento técnico e aumento da carteira de clientes.',
    },
    {
      id: 'n3', emoji: '3️⃣', titulo: 'Cabeleireiro Pleno', cor: '#7c3aed',
      perfil: 'Profissional com experiência a partir de 3 anos e carteira própria de clientes.',
      atividades: 'Corte avançado e acabamento.\nMechas e design de cor.',
      certificados: '5 workshops nos últimos 3 anos nas habilidades que possui, com atendimento consultivo.',
      indicadores: 'Tempo de experiência no salão e na função: de 1 a 2 anos.\nAvaliação técnica (Vera) e comportamental (Avaliação 360º) acima de 80%. Se não atingir, pode refazer a avaliação após 3 meses.\nFaturamento médio: R$ 22.300.\nFaturamento Líquido: a partir de R$ 8.700.\nTicket médio: a partir de R$ 250.\nTaxa de retorno de clientes: a partir de 39%.\nNPS: média nota 9.\n*2 cursos: consultoria de imagem ou visagismo.\n*Habilidade: a definir com a Bruna/Vera.\nEngajamento com redes sociais para captação de novos clientes, com cronograma de produção.\nParticipação em reuniões e treinamentos internos a partir de 80% de frequência.',
      comissionamento: '30% a 45% sobre serviços realizados.',
      beneficios: 'Percentual em curso de capacitação, prioridade na agenda e visibilidade na comunicação do salão.',
      meta: '10% em curso de capacitação por semestre (não acumulativo) e parcelamento do curso no rateio.',
    },
    {
      id: 'n4', emoji: '4️⃣', titulo: 'Cabeleireiro Sênior / Especialista', cor: '#c2410c',
      perfil: 'Referência profissional no salão, com agenda cheia e autoridade técnica (colorista, mechas, corte ou maquiagem).',
      atividades: 'Técnicas avançadas e personalizadas (conforme a especialidade) e correção de cor.\nEnsino e mentoria da equipe.\nVisagismo, coaching (PSC) e didática em andragogia (ensino para adultos).',
      certificados: 'Criação de tendências dentro do salão.',
      indicadores: 'Tempo de experiência no salão e na função: de 1 a 2 anos.\nAvaliação técnica e comportamental (olhar de dono, espírito de equipe, organização, humildade).\nFaturamento médio: R$ 42.000.\nFaturamento Líquido: a partir de R$ 16.000.\nTicket médio: a partir de R$ 280.\nTaxa de retorno de clientes: 50% ou mais (ter ao menos uma assistente fixa).\nNPS: média nota 9.\nCompetências: saber ensinar, saber escutar, saber lapidar comportamentos e técnicas.\nParticipação em reuniões e treinamentos internos a partir de 80% de frequência.\n*Formar os assistentes do salão e direcionar o trabalho dos cabeleireiros Júnior e Pleno.\nProdução de conteúdo ou participação em eventos.',
      comissionamento: '30% a 45% sobre serviços realizados.',
      beneficios: 'Prioridade na agenda, visibilidade na comunicação do salão + 0,5% no rateio dele.',
      meta: '15% em curso de capacitação por semestre (não acumulativo) e parcelamento do curso no rateio.',
    },
    {
      id: 'n5', emoji: '5️⃣', titulo: 'Mestre Cabeleireiro / Embaixador da Marca', cor: '#a16207',
      perfil: 'Profissional de elite, mentor e formador de novos talentos — a maior referência do salão.',
      atividades: 'Atendimento VIP e serviços exclusivos.\nRepresentação do salão em eventos e redes sociais.\nOferece cursos para fora do salão.\nDesenvolvimento de novas técnicas, treinamentos internos e criação de tendências.',
      certificados: 'Reconhecimento externo consolidado (prêmios, convites para eventos, participação como referência técnica).',
      indicadores: 'Taxa de retorno de clientes: 60% ou mais.\nTicket médio: acima de R$ 350.\nFaturamento médio: R$ 60.000 a R$ 80.000.\nFaturamento Líquido: a partir de R$ 25.000.\nVisibilidade no mercado: reconhecimento externo e grande influência nas redes sociais e eventos da indústria da beleza.',
      comissionamento: '30% a 45% sobre serviços realizados.',
      beneficios: 'Marketing exclusivo e participação de 1% a 5% nos lucros do salão.\nPossibilidade de comissão sobre vendas de cursos ou workshops externos.\nAcesso a eventos e oportunidades exclusivas para representar o salão.',
      meta: 'Fortalecer a marca do salão no mercado e expandir a rede de clientes VIP, além de aumentar cursos e workshops para ampliar o reconhecimento no setor.',
    },
  ],
}

export default function PlanoCarreiraPJ() {
  const [abaTopo, setAbaTopo] = useState<'plano' | 'equipe'>('plano')
  const [doc, setDoc] = useState<Doc>(DEFAULT_DOC)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [aberto, setAberto] = useState<string | null>('n1')
  const [editando, setEditando] = useState<string | null>(null)
  const [rascunho, setRascunho] = useState<Nivel | null>(null)
  const [editandoIntro, setEditandoIntro] = useState(false)
  const [introRascunho, setIntroRascunho] = useState('')

  const carregar = useCallback(async () => {
    try {
      const d = await fetch(`/api/salon/grid?chave=${CHAVE}`).then(r => r.ok ? r.json() : null)
      if (d && Array.isArray(d.niveis) && d.niveis.length) setDoc(d)
    } catch { /* mantém o padrão */ }
    setLoading(false)
  }, [])
  useEffect(() => { carregar() }, [carregar])

  async function persistir(novo: Doc) {
    setSalvando(true)
    try {
      const res = await fetch('/api/salon/grid', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: CHAVE, doc: novo }) })
      if (res.ok) { toast.success('Salvo!'); setDoc(novo) } else toast.error('Erro ao salvar')
    } catch { toast.error('Erro de conexão') }
    setSalvando(false)
  }

  function abrirEdicao(n: Nivel) { setRascunho({ ...n }); setEditando(n.id) }
  function salvarEdicao() {
    if (!rascunho) return
    const novo: Doc = { ...doc, niveis: doc.niveis.map(n => n.id === rascunho.id ? rascunho : n) }
    persistir(novo)
    setEditando(null); setRascunho(null)
  }
  function salvarIntro() { persistir({ ...doc, intro: introRascunho }); setEditandoIntro(false) }

  async function imprimir() {
    const logo = await getLogoSalao()
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const cab = logo ? `<img src="${logo}" class="logo"/>` : `<div class="brand">NODRI</div>`
    const blocoNivel = (n: Nivel) => `
      <div class="nivel" style="border-top-color:${n.cor}">
        <h2 style="color:${n.cor}">${n.emoji} ${esc(n.titulo)}</h2>
        <p class="perfil">${esc(n.perfil)}</p>
        <div class="col2">
          <div>
            <h3>Atividades</h3>
            <ul>${linhas(n.atividades).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
            <h3>Certificados</h3>
            <p>${esc(n.certificados)}</p>
          </div>
          <div>
            <h3>Requisitos para evoluir</h3>
            <ul>${linhas(n.indicadores).map(l => `<li class="${l.startsWith('*') ? 'obrig' : ''}">${esc(l.replace(/^\*/, ''))}</li>`).join('')}</ul>
          </div>
        </div>
        <div class="rodape">
          <div><b>Comissionamento:</b> ${esc(n.comissionamento)}</div>
          ${n.beneficios ? `<div><b>Benefícios:</b> ${esc(n.beneficios)}</div>` : ''}
          <div><b>Meta:</b> ${esc(n.meta)}</div>
        </div>
      </div>`
    const css = `
@page{size:A4 portrait;margin:12mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hd{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #5b4fcf;padding-bottom:8px;margin-bottom:10px}
.logo{max-height:54px;max-width:190px;object-fit:contain}
.brand{font-size:22px;font-weight:900;color:#5b4fcf}
h1{text-align:center;font-size:17px;margin:6px 0 4px;color:#1a1a2e}
.intro{text-align:center;font-size:10.5px;color:#666;margin-bottom:14px;font-style:italic}
.nivel{border:1px solid #e5e2db;border-top:4px solid #5b4fcf;border-radius:10px;padding:10px 12px;margin-bottom:10px;break-inside:avoid}
.nivel h2{font-size:13px;margin-bottom:4px}
.perfil{font-size:10.5px;color:#555;margin-bottom:8px}
.col2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px}
h3{font-size:9.5px;text-transform:uppercase;letter-spacing:.4px;color:#888;margin-bottom:3px}
ul{margin:0 0 8px 14px;padding:0}
li{font-size:10px;margin-bottom:2px}
li.obrig{font-weight:800;color:#b45309}
.rodape{border-top:1px solid #eee;padding-top:6px;font-size:10px;display:flex;flex-direction:column;gap:2px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Plano de Carreira PJ</title><style>${css}</style></head><body>
<div class="hd">${cab}<div style="font-size:10px;color:#777">${new Date().toLocaleDateString('pt-BR')}</div></div>
<h1>🏆 PLANO DE CARREIRA — PROFISSIONAIS PJ</h1>
<div class="intro">${esc(doc.intro)}</div>
${doc.niveis.map(blocoNivel).join('')}
<script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=1000,height=700'); if (!w) return; w.document.write(html); w.document.close(); w.focus()
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>🏆 Plano de Carreira — Profissionais PJ</h2>
        {abaTopo === 'plano' && <button onClick={imprimir} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#5b4fcf', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}><Printer size={14} /> Imprimir plano completo</button>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button onClick={() => setAbaTopo('plano')} style={{ padding: '8px 16px', borderRadius: 10, border: abaTopo === 'plano' ? 'none' : '1.5px solid #e0ddd8', background: abaTopo === 'plano' ? '#1a1a1a' : '#fff', color: abaTopo === 'plano' ? '#fff' : '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📋 Plano</button>
        <button onClick={() => setAbaTopo('equipe')} style={{ padding: '8px 16px', borderRadius: 10, border: abaTopo === 'equipe' ? 'none' : '1.5px solid #e0ddd8', background: abaTopo === 'equipe' ? '#1a1a1a' : '#fff', color: abaTopo === 'equipe' ? '#fff' : '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Users size={14} /> Acompanhamento da Equipe</button>
      </div>

      {abaTopo === 'equipe' && <AcompanhamentoEquipe />}

      {abaTopo === 'plano' && (<>
      {/* Intro motivacional */}
      <div style={{ background: 'linear-gradient(135deg,#7c3aed,#5b4fcf)', borderRadius: 14, padding: '16px 20px', color: '#fff', marginBottom: 18, position: 'relative' }}>
        {editandoIntro ? (
          <>
            <textarea value={introRascunho} onChange={e => setIntroRascunho(e.target.value)} rows={4}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', fontSize: 13.5, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', color: '#1a1a1a' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={salvarIntro} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12.5, fontWeight: 800, cursor: 'pointer' }}>Salvar</button>
              <button onClick={() => setEditandoIntro(false)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.5)', background: 'transparent', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Sparkles size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>{doc.intro}</p>
            </div>
            <button onClick={() => { setIntroRascunho(doc.intro); setEditandoIntro(true) }} title="Editar mensagem"
              style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'rgba(255,255,255,.18)', color: '#fff', borderRadius: 6, padding: 6, cursor: 'pointer' }}><Pencil size={13} /></button>
          </>
        )}
      </div>

      <p style={{ fontSize: 13, color: '#6b6860', margin: '0 0 16px' }}>Clique em cada nível para ver todos os detalhes: o que fazer, o que é exigido para subir e o que você ganha em cada etapa.</p>

      {/* Trilha de níveis */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {doc.niveis.map((n, i) => {
          const open = aberto === n.id
          const edit = editando === n.id
          return (
            <div key={n.id} style={{ background: '#fff', border: '1px solid #e8e6e0', borderLeft: `5px solid ${n.cor}`, borderRadius: 14, overflow: 'hidden' }}>
              <button onClick={() => setAberto(open ? null : n.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: 22 }}>{n.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a1a' }}>{n.titulo}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{n.perfil}</div>
                </div>
                <ChevronDown size={18} color="#9ca3af" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
              </button>

              {open && (
                <div style={{ padding: '0 16px 16px' }}>
                  {edit && rascunho ? (
                    <NivelEditor n={rascunho} onChange={setRascunho} onSalvar={salvarEdicao} onCancelar={() => { setEditando(null); setRascunho(null) }} salvando={salvando} />
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                        <button onClick={() => abrirEdicao(n)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid #d0cdc7', background: '#fff', color: '#374151', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}><Pencil size={12} /> Editar</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                        <div>
                          <SecaoTitulo>🛠️ Atividades</SecaoTitulo>
                          <ul style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: 13.5, color: '#374151', lineHeight: 1.7 }}>
                            {linhas(n.atividades).map((l, li) => <li key={li}>{l}</li>)}
                          </ul>
                          <SecaoTitulo>📜 Certificados exigidos</SecaoTitulo>
                          <p style={{ margin: 0, fontSize: 13.5, color: '#374151', lineHeight: 1.6 }}>{n.certificados}</p>
                        </div>
                        <div>
                          <SecaoTitulo>📈 Requisitos para evoluir de nível</SecaoTitulo>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {linhas(n.indicadores).map((l, li) => {
                              const obrig = l.startsWith('*')
                              const txt = l.replace(/^\*/, '')
                              return (
                                <div key={li} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: obrig ? '6px 9px' : 0, background: obrig ? '#fff7ed' : 'transparent', border: obrig ? '1px solid #fed7aa' : 'none', borderRadius: 8 }}>
                                  <CheckCircle2 size={15} color={obrig ? '#c2410c' : '#16a34a'} style={{ flexShrink: 0, marginTop: 1 }} />
                                  <span style={{ fontSize: 13, color: obrig ? '#9a3412' : '#374151', fontWeight: obrig ? 700 : 400, lineHeight: 1.5 }}>{txt}{obrig && <span style={{ fontSize: 10, fontWeight: 800, color: '#c2410c', marginLeft: 6 }}>· OBRIGATÓRIO</span>}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ flex: '1 1 200px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px' }}>
                          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>💰 Comissionamento</div>
                          <div style={{ fontSize: 13.5, color: '#15803d', fontWeight: 700 }}>{n.comissionamento}</div>
                        </div>
                        {n.beneficios && (
                          <div style={{ flex: '1 1 200px', background: '#f0eefb', border: '1px solid #ddd6fb', borderRadius: 10, padding: '10px 14px' }}>
                            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#5b4fcf', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>🎁 Benefícios</div>
                            <div style={{ fontSize: 13, color: '#4c3fa8', lineHeight: 1.5 }}>{linhas(n.beneficios).map((l, li) => <div key={li}>{l}</div>)}</div>
                          </div>
                        )}
                        <div style={{ flex: '1 1 200px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px' }}>
                          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#a16207', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 3 }}>🏆 Meta {i < doc.niveis.length - 1 ? 'para o próximo nível' : 'de crescimento'}</div>
                          <div style={{ fontSize: 13, color: '#854d0e', lineHeight: 1.5 }}>{n.meta}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      </>)}
    </div>
  )
}

interface ProfLeve { id: string; nome_completo: string; apelido?: string; ativo: boolean; is_departamento?: boolean; cargo?: string }
interface ProgressoLeve { nivelId?: string; historico?: { data: string; aprovado: boolean }[] }

function AcompanhamentoEquipe() {
  const [profs, setProfs] = useState<ProfLeve[]>([])
  const [niveis, setNiveis] = useState<Nivel[]>([])
  const [progressos, setProgressos] = useState<Record<string, ProgressoLeve>>({})
  const [loading, setLoading] = useState(true)
  const [selecionado, setSelecionado] = useState<ProfLeve | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const [lista, planoDoc] = await Promise.all([
          fetch('/api/profissionais?ativo=true&leve=1').then(r => r.ok ? r.json() : []),
          fetch('/api/salon/grid?chave=plano_carreira_pj').then(r => r.ok ? r.json() : null),
        ])
        const ativos = (Array.isArray(lista) ? lista : []).filter((p: ProfLeve) => !p.is_departamento)
        setProfs(ativos)
        if (planoDoc?.niveis) setNiveis(planoDoc.niveis)
        const entradas = await Promise.all(ativos.map(async (p: ProfLeve) => {
          const d = await fetch(`/api/salon/grid?chave=plano_carreira_prof_${p.id}`).then(r => r.ok ? r.json() : null)
          return [p.id, d || {}] as const
        }))
        setProgressos(Object.fromEntries(entradas))
      } catch { /* */ }
      setLoading(false)
    })()
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={22} className="animate-spin" style={{ color: '#5b4fcf' }} /></div>

  return (
    <div>
      <p style={{ fontSize: 13, color: '#6b6860', margin: '0 0 14px' }}>Nível atual de cada profissional e última revisão registrada. Clique em alguém para ver o progresso completo e registrar uma revisão.</p>
      {profs.length === 0 ? <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>Nenhum profissional ativo.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {profs.map(p => {
            const prog = progressos[p.id] || {}
            const nivel = niveis.find(n => n.id === prog.nivelId) || niveis[0]
            const ultimaRevisao = prog.historico?.[0]
            return (
              <button key={p.id} onClick={() => setSelecionado(p)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid #e8e6e0', background: '#fff', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,.08)')} onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#1a1a1a' }}>{p.apelido || p.nome_completo}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.cargo || '—'}</div>
                </div>
                {nivel && <span style={{ fontSize: 12, fontWeight: 700, color: nivel.cor, background: `${nivel.cor}18`, borderRadius: 8, padding: '5px 10px', flexShrink: 0 }}>{nivel.emoji} {nivel.titulo}</span>}
                <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, minWidth: 90, textAlign: 'right' }}>{ultimaRevisao ? `Revisado em ${new Date(ultimaRevisao.data).toLocaleDateString('pt-BR')}` : 'Sem revisão ainda'}</span>
              </button>
            )
          })}
        </div>
      )}

      {selecionado && (
        <div onClick={() => setSelecionado(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14, overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#faf9f7', borderRadius: 16, width: '100%', maxWidth: 800, maxHeight: '88vh', overflowY: 'auto', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{selecionado.apelido || selecionado.nome_completo}</h3>
              <button onClick={() => setSelecionado(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
            </div>
            <PlanoCarreiraProgresso profissionalId={selecionado.id} />
          </div>
        </div>
      )}
    </div>
  )
}

function SecaoTitulo({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>{children}</div>
}

function NivelEditor({ n, onChange, onSalvar, onCancelar, salvando }: { n: Nivel; onChange: (n: Nivel) => void; onSalvar: () => void; onCancelar: () => void; salvando: boolean }) {
  const campo = (label: string, key: keyof Nivel, rows = 2, dica?: string) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#6b6860', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>{label}</label>
      {dica && <p style={{ margin: '0 0 4px', fontSize: 11, color: '#9ca3af' }}>{dica}</p>}
      <textarea value={n[key] as string} onChange={e => onChange({ ...n, [key]: e.target.value })} rows={rows}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0cdc7', fontSize: 13, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit' }} />
    </div>
  )
  return (
    <div>
      {campo('Perfil', 'perfil', 2)}
      {campo('Atividades (uma por linha)', 'atividades', 4)}
      {campo('Certificados exigidos', 'certificados', 2)}
      {campo('Requisitos para evoluir (uma por linha — comece com * para marcar como obrigatório)', 'indicadores', 8, 'Ex.: *2 cursos: corte, mechas ou coloração global')}
      {campo('Comissionamento', 'comissionamento', 2)}
      {campo('Benefícios (uma por linha, opcional)', 'beneficios', 2)}
      {campo('Meta para a próxima etapa', 'meta', 2)}
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button onClick={onSalvar} disabled={salvando} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{salvando ? '...' : <><Save size={14} /> Salvar nível</>}</button>
        <button onClick={onCancelar} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #d0cdc7', background: '#fff', color: '#6b6860', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
      </div>
    </div>
  )
}
