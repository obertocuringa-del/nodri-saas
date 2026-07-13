import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { escritaBloqueadaSub } from '@/lib/apiAuth'

function toCSVUrl(url: string): string {
  const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return url
  const id = match[1]
  const gidMatch = url.match(/[?&#]gid=(\d+)/)
  const gid = gidMatch ? gidMatch[1] : '0'
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
}

function normalizaTipo(val: string): 'positivo' | 'negativo' | null {
  const v = val.toLowerCase().trim()
  if (v.includes('positivo') || v === 'pos' || v === 'p') return 'positivo'
  if (v.includes('negativo') || v === 'neg' || v === 'n') return 'negativo'
  return null
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { cell += '"'; i += 2; continue }
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      row.push(cell.trim()); cell = ''
    } else if ((ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) && !inQuotes) {
      if (ch === '\r') i++
      row.push(cell.trim()); cell = ''
      if (row.some(c => c.length > 0)) rows.push(row)
      row = []
    } else {
      cell += ch
    }
    i++
  }
  if (cell.trim() || row.length > 0) { row.push(cell.trim()); if (row.some(c => c.length > 0)) rows.push(row) }
  return rows
}

function parseDataHora(val: string): string | undefined {
  const m = val.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6] || '00'}`
  return undefined
}

export async function POST(req: NextRequest) {
    if (await escritaBloqueadaSub()) return NextResponse.json({ error: 'Somente leitura' }, { status: 403 })
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || !['salon','sub'].includes(payload.role) || !payload.salaoId)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { formulario_id, sheet_url, csv_texto } = body

  const { data: form } = await supabaseAdmin
    .from('feedback_prof_formularios')
    .select('id')
    .eq('id', formulario_id)
    .eq('salao_id', payload.salaoId)
    .single()
  if (!form) return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 })

  let csvText = csv_texto || ''

  if (!csvText && sheet_url) {
    const csvUrl = toCSVUrl(sheet_url)
    try {
      const res = await fetch(csvUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' })
      if (!res.ok) return NextResponse.json({ error: `Planilha inacessível (${res.status}). Verifique se está pública.` }, { status: 400 })
      csvText = await res.text()
    } catch {
      return NextResponse.json({ error: 'Erro ao acessar a planilha.' }, { status: 400 })
    }
  }

  if (!csvText) return NextResponse.json({ error: 'Forneça a URL ou o CSV.' }, { status: 400 })

  const rows = parseCSV(csvText)
  if (rows.length < 2) return NextResponse.json({ error: 'Planilha vazia.' }, { status: 400 })

  const header = rows[0].map(h => h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim())
  const dataRows = rows.slice(1)

  function findCol(...keywords: string[]): number {
    for (const kw of keywords) {
      const idx = header.findIndex(h => h.includes(kw))
      if (idx >= 0) return idx
    }
    return -1
  }

  const colProf = findCol('profissional', 'prof', 'nome')
  const colTipo = findCol('positivo', 'tipo', 'classificac')
  const colOcorr = findCol('houve', 'ocorr', 'o que')
  const colDesc = findCol('descreva', 'descri', 'observ', 'detalhe')
  const colData = findCol('data', 'carimbo', 'timestamp', 'hora')

  if (colProf < 0) return NextResponse.json({ error: 'Coluna PROFISSIONAL não encontrada.' }, { status: 400 })
  if (colTipo < 0) return NextResponse.json({ error: 'Coluna POSITIVO/NEGATIVO não encontrada.' }, { status: 400 })
  if (colOcorr < 0) return NextResponse.json({ error: 'Coluna O QUE HOUVE não encontrada.' }, { status: 400 })

  // ── PASSO 1: Coleta nomes únicos de profissionais e ocorridos ──
  const nomesProf = new Set<string>()
  const nomesOcorr = new Set<string>()
  const linhasValidas: { profNome: string; tipo: 'positivo' | 'negativo'; ocorrDesc: string; descricao: string; dataHora?: string }[] = []
  const erros: string[] = []
  let ignorados = 0

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const profNome = (row[colProf] || '').trim().toUpperCase()
    const tipoRaw = (row[colTipo] || '').trim()
    const ocorrDesc = (row[colOcorr] || '').trim().toUpperCase()
    const descricao = colDesc >= 0 ? (row[colDesc] || '').trim() : ''
    const dataHora = colData >= 0 ? (row[colData] || '').trim() : ''

    if (!profNome || !ocorrDesc) { ignorados++; continue }
    const tipo = normalizaTipo(tipoRaw)
    if (!tipo) {
      if (erros.length < 10) erros.push(`Linha ${i + 2}: tipo "${tipoRaw}" inválido`)
      ignorados++; continue
    }

    nomesProf.add(profNome)
    nomesOcorr.add(ocorrDesc)
    linhasValidas.push({ profNome, tipo, ocorrDesc, descricao, dataHora: parseDataHora(dataHora) })
  }

  // ── PASSO 2: Busca existentes e cria novos em lote ──
  const { data: profsExist } = await supabaseAdmin.from('feedback_prof_profissionais').select('id, nome').eq('salao_id', payload.salaoId)
  const { data: ocorrExist } = await supabaseAdmin.from('feedback_prof_ocorridos').select('id, descricao').eq('salao_id', payload.salaoId)

  const profMap: Record<string, string> = {}
  const ocorrMap: Record<string, string> = {}
  ;(profsExist || []).forEach(p => { profMap[p.nome.toUpperCase()] = p.id })
  ;(ocorrExist || []).forEach(o => { ocorrMap[o.descricao.toUpperCase()] = o.id })

  // Cria profissionais novos em lote
  const novosProfNomes = Array.from(nomesProf).filter(n => !profMap[n])
  const novosOcorrNomes = Array.from(nomesOcorr).filter(n => !ocorrMap[n])
  const novosProfissionais: string[] = []
  const novosOcorridos: string[] = []

  if (novosProfNomes.length > 0) {
    const { data: criados } = await supabaseAdmin
      .from('feedback_prof_profissionais')
      .insert(novosProfNomes.map(nome => ({ salao_id: payload.salaoId, nome })))
      .select('id, nome')
    ;(criados || []).forEach(p => { profMap[p.nome.toUpperCase()] = p.id; novosProfissionais.push(p.nome) })
  }

  if (novosOcorrNomes.length > 0) {
    const { data: criados } = await supabaseAdmin
      .from('feedback_prof_ocorridos')
      .insert(novosOcorrNomes.map(descricao => ({ salao_id: payload.salaoId, descricao })))
      .select('id, descricao')
    ;(criados || []).forEach(o => { ocorrMap[o.descricao.toUpperCase()] = o.id; novosOcorridos.push(o.descricao) })
  }

  // ── PASSO 3: Monta e insere todos os registros em lotes de 500 ──
  const inserts = linhasValidas.map(linha => {
    const obj: Record<string, unknown> = {
      formulario_id: form.id,
      salao_id: payload.salaoId,
      profissional_id: profMap[linha.profNome] || null,
      profissional_nome: linha.profNome,
      tipo: linha.tipo,
      ocorrido_id: ocorrMap[linha.ocorrDesc] || null,
      ocorrido_descricao: linha.ocorrDesc,
      descricao: linha.descricao || null,
    }
    if (linha.dataHora) obj.criado_em = linha.dataHora
    return obj
  })

  let importados = 0
  const BATCH = 500
  for (let i = 0; i < inserts.length; i += BATCH) {
    const batch = inserts.slice(i, i + BATCH)
    const { error } = await supabaseAdmin.from('feedback_prof_respostas').insert(batch)
    if (error) {
      if (erros.length < 10) erros.push(`Lote ${Math.floor(i / BATCH) + 1}: ${error.message}`)
    } else {
      importados += batch.length
    }
  }

  return NextResponse.json({
    ok: true,
    importados,
    ignorados,
    erros,
    novosProfissionais,
    novosOcorridos,
    total_linhas: dataRows.length,
  })
}
