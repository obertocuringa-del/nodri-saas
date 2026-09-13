import { NextRequest, NextResponse } from 'next/server'
import {
  salaoPelaChave, carregarConfig, carregarEstado, gravarEstado, processarRelatorio, hojeNoFuso,
  type LinhaRelatorio,
} from '@/lib/crmAutomacao'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── A porta da extensão ─────────────────────────────────────────────────────
//
// A extensão do Chrome se apresenta com a chave do salão (cabeçalho
// x-nodri-chave). GET diz o que fazer -- ligada?, de quanto em quanto tempo,
// que endereço abrir, que dia é hoje. POST entrega as linhas do relatório e
// recebe de volta o que foi enfileirado.

async function salaoDaRequisicao(req: NextRequest) {
  return salaoPelaChave(req.headers.get('x-nodri-chave') || '')
}

export async function GET(req: NextRequest) {
  const salaoId = await salaoDaRequisicao(req)
  if (!salaoId) return NextResponse.json({ error: 'Chave inválida' }, { status: 401 })
  const cfg = await carregarConfig(salaoId)
  const est = await carregarEstado(salaoId)
  // "Vista há X" na tela do dono: é o único jeito de saber que a extensão
  // continua viva no computador da recepção.
  est.visto_em = new Date().toISOString()
  await gravarEstado(salaoId, est)
  return NextResponse.json({
    ligada: cfg.ligada,
    intervalo_seg: cfg.intervalo_seg,
    url_relatorio: cfg.url_relatorio,
    url_login: cfg.url_login,
    statuses: cfg.statuses,
    hoje: hojeNoFuso(cfg.fuso).br,
  })
}

export async function POST(req: NextRequest) {
  const salaoId = await salaoDaRequisicao(req)
  if (!salaoId) return NextResponse.json({ error: 'Chave inválida' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const linhas: LinhaRelatorio[] = Array.isArray(body?.linhas) ? body.linhas
    .map((l: any) => ({
      data: String(l?.data || '').trim(),
      hora: String(l?.hora || '').trim(),
      cliente: String(l?.cliente || '').trim(),
      celular: String(l?.celular || '').trim(),
      status: String(l?.status || '').trim(),
      numero: String(l?.numero || '').trim(),
    }))
    .slice(0, 2000) : []
  const r = await processarRelatorio(salaoId, linhas, body?.erro ? String(body.erro).slice(0, 300) : null)
  return NextResponse.json({ ok: true, ...r })
}
