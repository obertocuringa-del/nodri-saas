// v2 - editor completo com todas secoes
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const DEFAULT_CONFIG = {
  // HERO
  hero_logo: 'NODRI',
  hero_titulo: 'Sistema de Gestão para Salões de Beleza',
  hero_subtitulo: 'Automatize confirmações, envio de mensagens, relatórios e muito mais. Tudo integrado diretamente ao seu WhatsApp.',
  hero_botao: 'Ver Planos',
  hero_cor_botao: '#7c5cfc',

  // BENEFÍCIOS
  beneficios_titulo: 'Por que escolher o NODRI?',
  beneficios: [
    { emoji: '⚡', titulo: 'Abre com 1 clique', desc: 'Clique em Abrir no site e o programa abre instantaneamente no seu computador.' },
    { emoji: '💬', titulo: 'Integrado ao WhatsApp', desc: 'Envie confirmações, feedbacks e listas direto pelo WhatsApp sem copiar e colar.' },
    { emoji: '📊', titulo: 'Relatórios completos', desc: 'Acompanhe faturamento, desempenho de profissionais e reservas financeiras.' },
    { emoji: '🔄', titulo: 'Atualizações automáticas', desc: 'Receba novas versões dos programas sem precisar reinstalar tudo.' },
  ],

  // PLANOS
  planos_titulo: 'Escolha seu Plano',
  planos_subtitulo: 'Pagamento único mensal via PIX ou cartão',
  landing_planos: [
    { nome: 'Básico', preco: 100, cor: '#3498db', destaque: false, modulos: ['Confirmar Agendamento', 'Enviar Feedback', 'Enviar Lista c/ Foto', 'Enviar Lista s/ Foto', 'Baixar Música YouTube'] },
    { nome: 'Profissional', preco: 200, cor: '#9b59b6', destaque: true, modulos: ['Todos do Básico', 'Bloqueio Sem Preferência', 'Ver Feedback Cliente', 'Relatório Profissional', 'Faturamento Diário', 'Calcular Reserva Financeira'] },
    { nome: 'Premium', preco: 300, cor: '#f39c12', destaque: false, modulos: ['Todos do Profissional', 'Calculadora Depreciação', 'Avaliar Profissional', 'Aluguel de Cadeira', 'Precificar Serviços'] },
  ],

  // TRABALHE CONOSCO
  afiliados_titulo: 'Trabalhe Conosco',
  afiliados_subtitulo: 'Indique o NODRI para outros salões e ganhe 40% de comissão em cada venda realizada com seu cupom exclusivo.',
  afiliados_comissao: 40,
  afiliados_botao: 'Quero ser Afiliado →',
  afiliados_chips: [
    { emoji: '🎫', texto: 'Cupom exclusivo' },
    { emoji: '🔗', texto: 'Link personalizado' },
    { emoji: '💰', texto: '40% por venda' },
    { emoji: '📱', texto: 'Pix direto' },
  ],

  // FOOTER
  footer_logo: 'NODRI',
  footer_texto: 'Sistema de Gestão para Salões de Beleza',
  footer_email: 'contato@nodri.com.br',
  footer_whatsapp: '5561982195214',
}

export async function GET() {
  const { data } = await supabaseAdmin
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'landing_config')
    .single()

  return NextResponse.json(data?.valor || DEFAULT_CONFIG)
}

export async function POST(req: NextRequest) {
  const token = cookies().get('nodri_token')?.value
  const payload = token ? await verifyJWT(token) : null
  if (!payload || payload.role !== 'master') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()

  await supabaseAdmin
    .from('configuracoes')
    .upsert({ chave: 'landing_config', valor: body }, { onConflict: 'chave' })

  return NextResponse.json({ ok: true })
}
