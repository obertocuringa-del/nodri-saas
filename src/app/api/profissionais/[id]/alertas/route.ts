import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function getSalaoId() {
  const token = cookies().get('nodri_token')?.value
  if (!token) return null
  const payload = await verifyJWT(token)
  return payload?.salaoId || null
}

function parseDataBR(d: string): Date | null {
  if (!d) return null
  const p = d.split('/')
  if (p.length !== 3) return null
  const dt = new Date(`${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`)
  return isNaN(dt.getTime()) ? null : dt
}

function normNome(n: string) {
  return (n || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function isProfissional(nomeLinha: string, nomeCompleto: string, apelido: string): boolean {
  const nl = normNome(nomeLinha)
  const nc = normNome(nomeCompleto)
  const ap = normNome(apelido)
  if (!nl) return false
  if (nl === nc) return true
  if (ap && (nl === ap || nl.startsWith(ap) || ap.startsWith(nl))) return true
  const tokens = nc.split(' ').filter(t => t.length > 2)
  const matchCount = tokens.filter(t => nl.includes(t)).length
  return matchCount >= Math.min(2, tokens.length)
}

// GET — retorna alertas ativos (não arquivados) + histórico arquivados
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: prof } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_completo, apelido')
    .eq('id', params.id)
    .eq('salao_id', salaoId)
    .single()

  if (!prof) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  // Busca alertas já arquivados para este profissional
  const { data: arquivados } = await supabaseAdmin
    .from('alertas_profissional')
    .select('id, cliente_nome, celular, dias_ausente, ultimo_servico, data_alerta, arquivado_em')
    .eq('salao_id', salaoId)
    .eq('profissional_id', params.id)
    .not('arquivado_em', 'is', null)
    .order('arquivado_em', { ascending: false })
    .limit(50)

  // Clientes arquivados recentemente (últimos 60 dias) — não re-alertar
  const agora = new Date()
  const arquivadosRecentes = new Set(
    (arquivados || [])
      .filter(a => {
        const d = new Date(a.arquivado_em)
        return (agora.getTime() - d.getTime()) / 86400000 < 60
      })
      .map(a => a.cliente_nome.toUpperCase())
  )

  // Busca atendimentos deste profissional para detectar clientes ausentes
  let rows: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabaseAdmin
      .from('atendimentos_raw')
      .select('cliente, celular, profissional, data_comanda, servico')
      .eq('salao_id', salaoId)
      .range(from, from + 999)
    if (!data || data.length === 0) break
    rows = rows.concat(data)
    if (data.length < 1000) break
    from += 1000
  }

  // Por cliente: última visita com este prof e última visita geral
  const clienteComProf: Record<string, { ultimaData: Date; servico: string; celular: string }> = {}
  const clienteGeral: Record<string, { ultimaData: Date }> = {}

  for (const r of rows) {
    const cli = (r.cliente || '').trim().toUpperCase()
    if (!cli || cli === 'NAN') continue
    const data = parseDataBR(r.data_comanda)
    if (!data) continue

    if (!clienteGeral[cli] || data > clienteGeral[cli].ultimaData) {
      clienteGeral[cli] = { ultimaData: data }
    }

    if (isProfissional(r.profissional || '', prof.nome_completo, prof.apelido || '')) {
      if (!clienteComProf[cli] || data > clienteComProf[cli].ultimaData) {
        clienteComProf[cli] = {
          ultimaData: data,
          servico: (r.servico || '').trim(),
          celular: r.celular || '',
        }
      }
    }
  }

  // Gera alertas: clientes do profissional ausentes do salão há 60+ dias
  const LIMITE_DIAS = 60
  const ativos: Array<{
    cliente_nome: string; celular: string; dias_ausente: number; ultimo_servico: string
  }> = []

  for (const [cli, hist] of Object.entries(clienteComProf)) {
    if (arquivadosRecentes.has(cli)) continue

    const geral = clienteGeral[cli]
    if (!geral) continue

    // Só alerta se a última visita geral foi com o profissional (não foi ao salão depois)
    // e essa última visita foi há 60+ dias
    const diasAusente = Math.floor((agora.getTime() - geral.ultimaData.getTime()) / 86400000)
    const ultimaGeralMs = geral.ultimaData.getTime()
    const ultimaComProfMs = hist.ultimaData.getTime()

    // Cliente ainda vai ao salão com outros → não é alerta aqui (cobre aba clientes perdidos)
    // Aqui alertamos quando o cliente sumiu do salão inteiro
    if (ultimaGeralMs > ultimaComProfMs) continue
    if (diasAusente < LIMITE_DIAS) continue

    ativos.push({
      cliente_nome: cli,
      celular: hist.celular,
      dias_ausente: diasAusente,
      ultimo_servico: hist.servico,
    })
  }

  // Ordena por dias ausente (mais crítico primeiro)
  ativos.sort((a, b) => b.dias_ausente - a.dias_ausente)

  return NextResponse.json({
    ativos: ativos.slice(0, 20),
    total_ativos: ativos.length,
    historico: arquivados || [],
  })
}

// POST — arquiva um alerta (dismissar com X)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const salaoId = await getSalaoId()
  if (!salaoId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { cliente_nome, celular, dias_ausente, ultimo_servico } = body

  if (!cliente_nome) return NextResponse.json({ error: 'cliente_nome obrigatório' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('alertas_profissional')
    .insert({
      salao_id: salaoId,
      profissional_id: params.id,
      cliente_nome,
      celular: celular || null,
      dias_ausente,
      ultimo_servico: ultimo_servico || null,
      data_alerta: new Date().toISOString().split('T')[0],
      arquivado_em: new Date().toISOString(),
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
