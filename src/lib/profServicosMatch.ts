// Casamento de nome + agregação de serviços por profissional a partir de
// relatorio_periodos.prof_servicos — a FONTE OFICIAL de atendimentos do
// salão (vem do Excel importado). Não usa atendimentos_raw: essa tabela é
// uma importação separada e incompleta ("comandas diferentes", ver
// src/app/api/relatorios/reconstruir-do-raw/route.ts), então contar por ela
// sozinha subestima o real. Mesmo padrão de casamento de nome usado em
// src/app/api/relatorios/ranking/route.ts e .../metricas/route.ts.
import { supabaseAdmin } from './supabase'

const STOPWORDS = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])
function tokensNome(nome: string) {
  return (nome || '').toLowerCase().split(/\s+/).filter(t => t && !STOPWORDS.has(t)).slice(0, 2)
}
function matchNome(profissionalTexto: string, nomeCompleto: string, tokens: string[], apelido: string): boolean {
  const n = (profissionalTexto || '').toLowerCase().trim()
  if (!n) return false
  if (nomeCompleto && n === nomeCompleto.toLowerCase().trim()) return true
  const ap = (apelido || '').toLowerCase().trim()
  if (ap && (n === ap || n.includes(ap) || ap.includes(n))) return true
  const nTok = n.split(/\s+/).filter(t => t && !STOPWORDS.has(t))
  if (tokens.length === 0 || nTok.length === 0) return false
  const matchCount = tokens.filter(t => nTok.some(nt => nt.startsWith(t) || t.startsWith(nt))).length
  return matchCount >= Math.min(tokens.length, 2)
}

export interface ProfissionalServicos {
  profissionalId: string
  nome: string
  apelido: string
  servicos: Record<string, number> // servico -> quantidade somada no mês
}

export async function servicosPorProfissional(salaoId: string, ano: number, mes: number): Promise<ProfissionalServicos[]> {
  const [{ data: profsRaw }, { data: periodos }] = await Promise.all([
    supabaseAdmin.from('profissionais').select('id, nome_completo, apelido').eq('salao_id', salaoId).eq('ativo', true),
    supabaseAdmin.from('relatorio_periodos').select('prof_servicos').eq('salao_id', salaoId).eq('ano', ano).eq('mes', mes),
  ])
  const itens = (periodos || []).flatMap((r: any) => Array.isArray(r.prof_servicos) ? r.prof_servicos : [])

  return (profsRaw || []).map((p: any) => {
    const nome = p.nome_completo || '', apelido = p.apelido || ''
    const tokens = tokensNome(nome)
    const acc: Record<string, number> = {}
    for (const it of itens) {
      const texto = it.profissional || it.profissional_original || ''
      if (!matchNome(texto, nome, tokens, apelido)) continue
      const s = String(it.servico || '').trim()
      if (!s) continue
      acc[s] = (acc[s] || 0) + Number(it.quantidade || 0)
    }
    return { profissionalId: p.id, nome, apelido, servicos: acc }
  })
}
