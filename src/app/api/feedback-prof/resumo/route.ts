import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getPayload() {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || !['salon','sub'].includes(payload.role) || !payload.salaoId) return null
  return payload
}

const norm = (s: string) => (s || '').trim().toUpperCase().replace(/\s+/g, ' ')

// ============================================================
// RESUMO DE FEEDBACKS POR CATEGORIA (cargo)
// ------------------------------------------------------------
// Agrupa as ocorrências por categoria (cargo do profissional,
// cruzado pelo nome) → por profissional → contagem de cada
// ocorrência, com resumo (total/positivos/negativos) por
// profissional e por categoria. Aceita filtro de meses e de
// ocorrência. Lê TODOS os registros (não paginado).
// ============================================================
export async function GET(req: NextRequest) {
  const p = await getPayload()
  if (!p) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const formulario_id = searchParams.get('formulario_id')
  if (!formulario_id) return NextResponse.json({ error: 'formulario_id obrigatório' }, { status: 400 })

  // meses no formato "YYYY-MM" separados por vírgula; ocorrido = categoria de ocorrência
  const mesesSet = new Set((searchParams.get('meses') || '').split(',').map(s => s.trim()).filter(Boolean))
  const ocorridoFiltro = norm(searchParams.get('ocorrido') || '')

  // valida que o formulário é do salão
  const { data: form } = await supabaseAdmin
    .from('feedback_prof_formularios')
    .select('id')
    .eq('id', formulario_id)
    .eq('salao_id', p.salaoId)
    .single()
  if (!form) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  // Lê TODOS os registros do formulário (paginado p/ passar do limite de 1000)
  let rows: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabaseAdmin
      .from('feedback_prof_respostas')
      .select('profissional_nome, tipo, ocorrido_descricao, criado_em')
      .eq('formulario_id', formulario_id)
      .range(from, from + 999)
    if (!data || data.length === 0) break
    rows = rows.concat(data)
    if (data.length < 1000) break
    from += 1000
  }

  // Mapa nome (normalizado) → cargo, a partir da tabela de profissionais
  const { data: profs } = await supabaseAdmin
    .from('profissionais')
    .select('nome_completo, apelido, cargo')
    .eq('salao_id', p.salaoId)
  const nomeToCargo: Record<string, string> = {}
  for (const pr of (profs || [])) {
    const cargo = (pr.cargo || '').trim() || 'Sem categoria'
    const nc = norm(pr.nome_completo || '')
    const ap = norm(pr.apelido || '')
    if (ap) nomeToCargo[ap] = cargo
    if (nc) { nomeToCargo[nc] = cargo; const primeiro = nc.split(' ')[0]; if (primeiro && !nomeToCargo[primeiro]) nomeToCargo[primeiro] = cargo }
  }

  // Estrutura: categoria → profissional → ocorrência → contagem
  type Prof = { nome: string; total: number; positivos: number; negativos: number; ocorrencias: Record<string, number> }
  type Cat = { categoria: string; total: number; positivos: number; negativos: number; profissionais: Record<string, Prof>; ocorrenciasCat: Record<string, number> }
  const cats: Record<string, Cat> = {}

  for (const r of rows) {
    const dt = r.criado_em ? new Date(r.criado_em) : null
    if (mesesSet.size) {
      if (!dt) continue
      const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      if (!mesesSet.has(ym)) continue
    }
    const ocorr = norm(r.ocorrido_descricao || '')
    if (ocorridoFiltro && ocorr !== ocorridoFiltro) continue

    const nome = norm(r.profissional_nome || 'SEM NOME')
    const cargo = nomeToCargo[nome] || nomeToCargo[nome.split(' ')[0]] || 'Sem categoria'
    const ehPos = r.tipo === 'positivo'

    if (!cats[cargo]) cats[cargo] = { categoria: cargo, total: 0, positivos: 0, negativos: 0, profissionais: {}, ocorrenciasCat: {} }
    const cat = cats[cargo]
    cat.total++; if (ehPos) cat.positivos++; else if (r.tipo === 'negativo') cat.negativos++
    cat.ocorrenciasCat[ocorr || '—'] = (cat.ocorrenciasCat[ocorr || '—'] || 0) + 1

    if (!cat.profissionais[nome]) cat.profissionais[nome] = { nome, total: 0, positivos: 0, negativos: 0, ocorrencias: {} }
    const pf = cat.profissionais[nome]
    pf.total++; if (ehPos) pf.positivos++; else if (r.tipo === 'negativo') pf.negativos++
    pf.ocorrencias[ocorr || '—'] = (pf.ocorrencias[ocorr || '—'] || 0) + 1
  }

  // Serializa ordenado: categorias por total desc, profissionais por total desc, ocorrências por contagem desc
  const categorias = Object.values(cats)
    .sort((a, b) => b.total - a.total)
    .map(cat => ({
      categoria: cat.categoria,
      total: cat.total,
      positivos: cat.positivos,
      negativos: cat.negativos,
      resumo_ocorrencias: Object.entries(cat.ocorrenciasCat).map(([ocorrencia, qtd]) => ({ ocorrencia, qtd })).sort((a, b) => b.qtd - a.qtd),
      profissionais: Object.values(cat.profissionais)
        .sort((a, b) => b.total - a.total)
        .map(pf => ({
          nome: pf.nome,
          total: pf.total,
          positivos: pf.positivos,
          negativos: pf.negativos,
          ocorrencias: Object.entries(pf.ocorrencias).map(([ocorrencia, qtd]) => ({ ocorrencia, qtd })).sort((a, b) => b.qtd - a.qtd),
        })),
    }))

  return NextResponse.json({ total: rows.length, categorias })
}
