import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { salaoIdSe } from '@/lib/apiAuth'

export async function GET(req: NextRequest) {
  const salaoId = await salaoIdSe('lojistas')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('lojistas')
    .select('*')
    .eq('salao_id', salaoId)
    .order('criado_em', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const url = new URL(req.url)
  const nome = url.searchParams.get('nome')?.toLowerCase().trim() || ''
  const loja = url.searchParams.get('loja')?.toLowerCase().trim() || ''
  const segmento = url.searchParams.get('segmento') || ''
  const servico = url.searchParams.get('servico')?.toLowerCase().trim() || ''
  const dataDe = url.searchParams.get('data_de') || ''
  const dataAte = url.searchParams.get('data_ate') || ''
  const grupo = url.searchParams.get('grupo') || '' // 'sim' | 'nao'
  const aniversariantes = url.searchParams.get('aniversariantes') || '' // 'hoje' | 'semana' | 'mes'
  const situacao = url.searchParams.get('situacao') || ''

  const hoje = new Date()
  let itens = data || []

  if (nome) itens = itens.filter(l => (l.nome || '').toLowerCase().includes(nome))
  if (loja) itens = itens.filter(l => (l.nome_loja || '').toLowerCase().includes(loja))
  if (segmento) itens = itens.filter(l => l.segmento === segmento)
  if (servico) itens = itens.filter(l => (l.servicos_interesse || []).some((s: string) => s.toLowerCase().includes(servico)))
  if (dataDe) itens = itens.filter(l => (l.criado_em || '').slice(0, 10) >= dataDe)
  if (dataAte) itens = itens.filter(l => (l.criado_em || '').slice(0, 10) <= dataAte)
  if (grupo === 'sim') itens = itens.filter(l => l.entrou_grupo === true)
  if (grupo === 'nao') itens = itens.filter(l => l.entrou_grupo !== true)
  if (situacao) itens = itens.filter(l => l.situacao === situacao)
  if (aniversariantes) {
    itens = itens.filter(l => {
      if (!l.data_aniversario) return false
      const d = new Date(`${l.data_aniversario}T00:00:00`)
      const mm = d.getMonth()
      const dd = d.getDate()
      if (aniversariantes === 'mes') return mm === hoje.getMonth()
      if (aniversariantes === 'hoje') return mm === hoje.getMonth() && dd === hoje.getDate()
      if (aniversariantes === 'semana') {
        const proximos7 = new Date(hoje)
        for (let i = 0; i < 7; i++) {
          if (proximos7.getMonth() === mm && proximos7.getDate() === dd) return true
          proximos7.setDate(proximos7.getDate() + 1)
        }
        return false
      }
      return true
    })
  }

  return NextResponse.json(itens)
}
