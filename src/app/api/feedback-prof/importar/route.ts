import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// Converte URL do Google Sheets para URL de exportação CSV
function toCSVUrl(url: string): string {
  // https://docs.google.com/spreadsheets/d/{ID}/edit#gid=0
  // https://docs.google.com/spreadsheets/d/{ID}/pub?...
  const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return url
  const id = match[1]
  const gidMatch = url.match(/[?&]gid=(\d+)/)
  const gid = gidMatch ? gidMatch[1] : '0'
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
}

// Normaliza tipo positivo/negativo
function normalizaTipo(val: string): 'positivo' | 'negativo' | null {
  const v = val.toLowerCase().trim()
  if (v.includes('positivo') || v === 'pos' || v === 'p') return 'positivo'
  if (v.includes('negativo') || v === 'neg' || v === 'n') return 'negativo'
  return null
}

// Parse CSV simples (suporta campos com aspas e quebras de linha)
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

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'salon' || !payload.salaoId)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { formulario_id, sheet_url, csv_texto } = body

  // Verifica que o formulário pertence ao salão
  const { data: form } = await supabaseAdmin
    .from('feedback_prof_formularios')
    .select('id')
    .eq('id', formulario_id)
    .eq('salao_id', payload.salaoId)
    .single()
  if (!form) return NextResponse.json({ error: 'Formulário não encontrado' }, { status: 404 })

  let csvText = csv_texto || ''

  // Busca CSV do Google Sheets se URL fornecida
  if (!csvText && sheet_url) {
    const csvUrl = toCSVUrl(sheet_url)
    try {
      const res = await fetch(csvUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        redirect: 'follow',
      })
      if (!res.ok) return NextResponse.json({ error: `Não foi possível acessar a planilha. Verifique se ela está pública (Compartilhar → Qualquer pessoa com o link → Leitor). Status: ${res.status}` }, { status: 400 })
      csvText = await res.text()
    } catch (e) {
      return NextResponse.json({ error: 'Erro ao acessar a planilha. Verifique se o link está correto e se está pública.' }, { status: 400 })
    }
  }

  if (!csvText) return NextResponse.json({ error: 'Forneça a URL da planilha ou cole o CSV.' }, { status: 400 })

  const rows = parseCSV(csvText)
  if (rows.length < 2) return NextResponse.json({ error: 'Planilha vazia ou sem dados.' }, { status: 400 })

  // Detecta colunas pelo cabeçalho
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
  const colTipo = findCol('positivo', 'tipo', 'classificac', 'pos', 'neg')
  const colOcorr = findCol('houve', 'ocorr', 'ocorrencia', 'o que')
  const colDesc = findCol('descreva', 'descri', 'observ', 'detalhe', 'relato')
  const colData = findCol('data', 'carimbo', 'timestamp', 'hora')

  if (colProf < 0) return NextResponse.json({ error: 'Coluna PROFISSIONAL não encontrada. Verifique o cabeçalho da planilha.' }, { status: 400 })
  if (colTipo < 0) return NextResponse.json({ error: 'Coluna POSITIVO/NEGATIVO não encontrada.' }, { status: 400 })
  if (colOcorr < 0) return NextResponse.json({ error: 'Coluna de ocorrência (O QUE HOUVE) não encontrada.' }, { status: 400 })

  // Busca profissionais e ocorridos já existentes
  const { data: profsExist } = await supabaseAdmin.from('feedback_prof_profissionais').select('id, nome').eq('salao_id', payload.salaoId)
  const { data: ocorrExist } = await supabaseAdmin.from('feedback_prof_ocorridos').select('id, descricao').eq('salao_id', payload.salaoId)

  const profMap: Record<string, string> = {}
  const ocorrMap: Record<string, string> = {}
  ;(profsExist || []).forEach(p => { profMap[p.nome.toUpperCase()] = p.id })
  ;(ocorrExist || []).forEach(o => { ocorrMap[o.descricao.toUpperCase()] = o.id })

  let importados = 0
  let ignorados = 0
  const erros: string[] = []
  const novosProfissionais: string[] = []
  const novosOcorridos: string[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const profNome = (row[colProf] || '').trim().toUpperCase()
    const tipoRaw = (row[colTipo] || '').trim()
    const ocorrDesc = (row[colOcorr] || '').trim().toUpperCase()
    const descricao = colDesc >= 0 ? (row[colDesc] || '').trim() : ''
    const dataHora = colData >= 0 ? (row[colData] || '').trim() : ''

    if (!profNome || !ocorrDesc) { ignorados++; continue }
    const tipo = normalizaTipo(tipoRaw)
    if (!tipo) { erros.push(`Linha ${i + 2}: tipo "${tipoRaw}" inválido (use POSITIVO ou NEGATIVO)`); ignorados++; continue }

    // Cria profissional se não existe
    if (!profMap[profNome]) {
      const { data: newProf } = await supabaseAdmin.from('feedback_prof_profissionais')
        .insert({ salao_id: payload.salaoId, nome: profNome }).select('id').single()
      if (newProf) { profMap[profNome] = newProf.id; novosProfissionais.push(profNome) }
    }

    // Cria ocorrido se não existe
    if (!ocorrMap[ocorrDesc]) {
      const { data: newOcorr } = await supabaseAdmin.from('feedback_prof_ocorridos')
        .insert({ salao_id: payload.salaoId, descricao: ocorrDesc }).select('id').single()
      if (newOcorr) { ocorrMap[ocorrDesc] = newOcorr.id; novosOcorridos.push(ocorrDesc) }
    }

    // Parse da data (formato brasileiro: DD/MM/YYYY HH:MM:SS)
    let criadoEm: string | undefined
    if (dataHora) {
      const m = dataHora.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/)
      if (m) {
        criadoEm = `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6] || '00'}`
      }
    }

    const insert: Record<string, unknown> = {
      formulario_id: form.id,
      salao_id: payload.salaoId,
      profissional_id: profMap[profNome] || null,
      profissional_nome: profNome,
      tipo,
      ocorrido_id: ocorrMap[ocorrDesc] || null,
      ocorrido_descricao: ocorrDesc,
      descricao: descricao || null,
    }
    if (criadoEm) insert.criado_em = criadoEm

    const { error } = await supabaseAdmin.from('feedback_prof_respostas').insert(insert)
    if (error) { erros.push(`Linha ${i + 2}: ${error.message}`); ignorados++ }
    else importados++
  }

  return NextResponse.json({
    ok: true,
    importados,
    ignorados,
    erros: erros.slice(0, 10),
    novosProfissionais,
    novosOcorridos,
    total_linhas: dataRows.length,
  })
}
