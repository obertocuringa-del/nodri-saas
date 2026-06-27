import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSessao, permDaGrade } from '@/lib/apiAuth'

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Coleta todos os textos (strings) de um JSON aninhado
function coletarTextos(v: any, acc: string[]) {
  if (v == null) return
  if (typeof v === 'string') { if (v.trim()) acc.push(v) }
  else if (Array.isArray(v)) v.forEach(x => coletarTextos(x, acc))
  else if (typeof v === 'object') Object.values(v).forEach(x => coletarTextos(x, acc))
}

// Mapeia a chave do salao_config para um rótulo e rota amigáveis
function mapaChave(chave: string): { label: string; rota: string } {
  const c = chave.replace(/^grid_/, '')
  if (c === 'checklist') return { label: 'Check List', rota: '/salon/checklist' }
  if (c === 'materiais_trabalho') return { label: 'Materiais para Trabalho', rota: '/salon/profissionais' }
  if (c === 'pop_cafe') return { label: 'POP · Preparo de Café', rota: '/salon/administrativo' }
  if (c === 'pop_salao') return { label: 'POP · Salão', rota: '/salon/administrativo' }
  if (c === 'senhas') return { label: 'Senhas', rota: '/salon/administrativo' }
  if (c === 'pacotes') return { label: 'Preço de Pacotes', rota: '/salon/administrativo' }
  if (c === 'ata') return { label: 'Ata de Reunião', rota: '/salon/administrativo' }
  if (c === 'feriados') return { label: 'Escala de Feriados', rota: '/salon/administrativo' }
  if (c.startsWith('escala')) return { label: 'Escala de Trabalho', rota: '/salon/administrativo' }
  if (c.startsWith('bebidas')) return { label: 'Bebidas', rota: '/salon/administrativo' }
  if (c === 'alicates') return { label: 'Controle de Alicates', rota: '/salon/administrativo' }
  if (c === 'produtos') return { label: 'Consumo de Produtos', rota: '/salon/administrativo' }
  if (c === 'servinterno') return { label: 'Serviços Internos', rota: '/salon/administrativo' }
  if (c === 'precos_servicos') return { label: 'Serviços Internos (Valores)', rota: '/salon/administrativo' }
  if (c === 'tratamentos_dosagem') return { label: 'Tratamentos Dosagem', rota: '/salon/administrativo' }
  if (c === 'telefones') return { label: 'Telefones Importantes', rota: '/salon/administrativo' }
  if (c.startsWith('lista_')) return { label: 'Listas (Salão Administrativo)', rota: '/salon/administrativo' }
  if (c === 'listas_mensagens') return { label: 'Mensagens (Salão Administrativo)', rota: '/salon/administrativo' }
  return { label: 'Salão Administrativo', rota: '/salon/administrativo' }
}

function trecho(textos: string[], q: string): string {
  const full = textos.join('  ·  ')
  const i = norm(full).indexOf(q)
  if (i < 0) return full.slice(0, 90)
  const ini = Math.max(0, i - 35)
  return (ini > 0 ? '…' : '') + full.slice(ini, ini + 110) + '…'
}

export async function GET(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const salaoId = sessao.salaoId
  const pode = (c: string) => sessao.permissoes === null || sessao.permissoes.includes(c)
  const q = norm(new URL(req.url).searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json([])

  const resultados: { tipo: string; titulo: string; trecho: string; rota: string }[] = []

  // 1) Conteúdo salvo (salao_config)
  try {
    const { data } = await supabaseAdmin.from('salao_config').select('chave, valor').eq('salao_id', salaoId)
    for (const row of (data || [])) {
      const textos: string[] = []
      coletarTextos(row.valor, textos)
      if (textos.some(t => norm(t).includes(q)) && pode(permDaGrade(row.chave))) {
        const m = mapaChave(row.chave)
        resultados.push({ tipo: m.label, titulo: m.label, trecho: trecho(textos.filter(t => norm(t).includes(q)).concat(textos), q), rota: m.rota })
      }
    }
  } catch { /* */ }

  // 2) Serviços
  if (pode('servicos')) try {
    const { data } = await supabaseAdmin.from('servicos').select('nome, categoria, preco').eq('salao_id', salaoId)
    for (const s of (data || [])) {
      if (norm(`${s.nome} ${s.categoria || ''}`).includes(q)) {
        resultados.push({ tipo: 'Serviço', titulo: s.nome, trecho: `${s.categoria || ''}${s.preco ? ' · R$ ' + s.preco : ''}`, rota: '/salon/servicos' })
      }
    }
  } catch { /* */ }

  // 3) Profissionais
  if (pode('profissionais')) try {
    const { data } = await supabaseAdmin.from('profissionais').select('id, nome_completo, apelido, cargo').eq('salao_id', salaoId)
    for (const p of (data || [])) {
      if (norm(`${p.nome_completo || ''} ${p.apelido || ''} ${p.cargo || ''}`).includes(q)) {
        resultados.push({ tipo: 'Profissional', titulo: p.apelido || p.nome_completo || '—', trecho: p.cargo || '', rota: `/salon/profissionais/${p.id}` })
      }
    }
  } catch { /* */ }

  return NextResponse.json(resultados.slice(0, 60))
}
