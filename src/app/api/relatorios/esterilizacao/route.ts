import { NextRequest, NextResponse } from 'next/server'
import { salaoIdSe } from '@/lib/apiAuth'
import { servicosPorProfissional } from '@/lib/profServicosMatch'

// Só esses serviços contam pra esterilização (nada de correspondência ampla
// por palavra-chave — evita pegar troca de esmalte, cílios, henna etc).
const SERVICOS_ALICATE = ['manicure', 'pedicure', 'sobrancelhas', 'pedicure e cuidados especiais dos pes']
function normaliza(s: string) {
  return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim()
}
function usaAlicatePinca(servico: string) { return SERVICOS_ALICATE.includes(normaliza(servico)) }

// Quantidade de atendimentos com uso de alicate/pinça por profissional, no
// mês — vem de relatorio_periodos (fonte OFICIAL, a mesma da tela "Serviços
// Realizados" do perfil do profissional), casando o nome com o mesmo critério
// usado no resto do sistema. Não soma mão+pé como "1 visita": cada serviço
// conta separado, igual ao relatório oficial (o dado bruto por comanda não é
// confiável o suficiente pra fazer esse tipo de dedução).
export async function GET(req: NextRequest) {
  const salaoId = await salaoIdSe('adm_esterilizacao')
  if (!salaoId) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 })

  const url = new URL(req.url)
  const ano = parseInt(url.searchParams.get('ano') || '0')
  const mes = parseInt(url.searchParams.get('mes') || '0')
  if (!ano || !mes) return NextResponse.json({ error: 'ano e mes obrigatórios' }, { status: 400 })

  const lista = await servicosPorProfissional(salaoId, ano, mes)

  const profissionais = lista.map(p => {
    const servicosFiltrados = Object.entries(p.servicos).filter(([s]) => usaAlicatePinca(s))
    const atendimentos = servicosFiltrados.reduce((s, [, qtd]) => s + qtd, 0)
    return { profissional: p.apelido || p.nome, atendimentos, servicos: Object.fromEntries(servicosFiltrados) }
  }).filter(p => p.atendimentos > 0).sort((a, b) => b.atendimentos - a.atendimentos)

  return NextResponse.json({ ano, mes, profissionais })
}
