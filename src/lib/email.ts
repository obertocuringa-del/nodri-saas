// Serviço de email usando Resend (gratuito até 3000 emails/mês)
// Ou fallback para SMTP Gmail quando configurado

const FROM_EMAIL = 'nodriestiloebeleza@gmail.com'
const FROM_NAME = 'NODRI Estilo & Beleza'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nodri.com.br'
const WHATSAPP = '5561982195214'

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  // Usa Resend se a chave estiver configurada
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <onboarding@resend.dev>`,
        to,
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Erro ao enviar email')
    }
    return true
  }
  // Se não tiver Resend, loga no console (desenvolvimento)
  console.log(`[EMAIL] Para: ${to} | Assunto: ${subject}`)
  return true
}

// ── RECUPERAÇÃO DE SENHA ──
export async function enviarEmailRecuperacaoSenha(email: string, nome: string, token: string) {
  const link = `${SITE_URL}/recuperar-senha?token=${token}`
  await sendEmail({
    to: email,
    subject: '🔐 Recuperação de senha — NODRI',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;color:#1a1a1a;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#5b4fcf,#5b4fcf);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:28px;color:#000;font-weight:900">NODRI</h1>
          <p style="margin:8px 0 0;color:#000;font-size:13px">Estilo & Beleza</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#5b4fcf;margin-top:0">Olá, ${nome}!</h2>
          <p style="color:#767069;line-height:1.6">Recebemos uma solicitação para redefinir a senha da sua conta NODRI.</p>
          <p style="color:#767069;line-height:1.6">Clique no botão abaixo para criar uma nova senha:</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${link}" style="background:linear-gradient(135deg,#5b4fcf,#5b4fcf);color:#000;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;display:inline-block">
              🔐 Redefinir Senha
            </a>
          </div>
          <p style="color:#767069;font-size:12px">Este link expira em <strong style="color:#1a1a1a">2 horas</strong>. Se você não solicitou a recuperação, ignore este email.</p>
          <hr style="border:none;border-top:1px solid #e8e6e0;margin:24px 0">
          <p style="color:#767069;font-size:11px;text-align:center">NODRI Estilo & Beleza · Suporte: <a href="https://wa.me/${WHATSAPP}" style="color:#5b4fcf">WhatsApp</a></p>
        </div>
      </div>
    `,
  })
}

// ── BEM-VINDO PÓS-COMPRA ──
// `senha` é opcional de propósito: no cadastro feito pelo admin, quem escolhe
// a senha é você e o cliente já a conhece. Na assinatura automática ela é
// sorteada pelo sistema, e sem mandá-la aqui o cliente recebe um e-mail de
// boas-vindas para uma conta na qual não consegue entrar.
export async function enviarEmailBoasVindas({
  email, nome, plano, linkAcesso, linkDownload, senha,
}: { email: string; nome: string; plano: string; linkAcesso: string; linkDownload?: string; senha?: string }) {
  await sendEmail({
    to: email,
    subject: '🎉 Bem-vindo ao NODRI! Seu acesso está pronto',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;color:#1a1a1a;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#5b4fcf,#5b4fcf);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:28px;color:#000;font-weight:900">NODRI</h1>
          <p style="margin:8px 0 0;color:#000;font-size:13px">Estilo & Beleza</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#5b4fcf;margin-top:0">Bem-vindo, ${nome}! 🎉</h2>
          <p style="color:#767069;line-height:1.6">Seu plano <strong style="color:#1a1a1a">${plano}</strong> foi ativado com sucesso! Agora você tem acesso completo ao sistema NODRI.</p>

          ${senha ? `
          <div style="background:#f7f5ff;border:2px solid #5b4fcf;border-radius:10px;padding:20px;margin:24px 0">
            <h3 style="color:#5b4fcf;margin-top:0;font-size:14px">🔑 SEUS DADOS DE ACESSO</h3>
            <p style="color:#1a1a1a;font-size:13px;margin:10px 0 4px">E-mail:</p>
            <p style="font-family:monospace;font-size:15px;font-weight:700;color:#1a1a1a;margin:0 0 12px;word-break:break-all">${email}</p>
            <p style="color:#1a1a1a;font-size:13px;margin:0 0 4px">Senha provisória:</p>
            <p style="font-family:monospace;font-size:20px;font-weight:900;color:#5b4fcf;letter-spacing:1px;margin:0">${senha}</p>
            <p style="color:#767069;font-size:12px;line-height:1.5;margin:14px 0 0">
              Troque esta senha no primeiro acesso, em <strong>Configurações do salão</strong>.
              Guarde este e-mail até fazer isso.
            </p>
          </div>` : ''}

          <div style="background:#161820;border:1px solid #e8e6e0;border-radius:10px;padding:20px;margin:24px 0">
            <h3 style="color:#5b4fcf;margin-top:0;font-size:14px">📋 SEUS ACESSOS:</h3>
            <div style="margin:12px 0">
              <a href="${linkAcesso}" style="display:block;background:linear-gradient(135deg,#5b4fcf,#5b4fcf);color:#000;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;font-size:14px;text-align:center;margin-bottom:10px">
                🌐 Acessar o Sistema NODRI
              </a>
              ${linkDownload ? `
              <a href="${linkDownload}" style="display:block;background:#e8e6e0;color:#1a1a1a;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;font-size:14px;text-align:center;border:1px solid #5b4fcf">
                ⬇️ Baixar o Programa
              </a>` : ''}
            </div>
          </div>

          <div style="background:#161820;border:1px solid #e8e6e0;border-radius:10px;padding:20px;margin:24px 0">
            <h3 style="color:#1a1a1a;margin-top:0;font-size:13px">🚀 PRÓXIMOS PASSOS:</h3>
            <ol style="color:#767069;line-height:1.8;padding-left:20px;font-size:13px">
              <li>Acesse o sistema com o e-mail e a senha acima</li>
              <li>Troque a senha provisória em Configurações</li>
              <li>Baixe e instale o programa no seu computador</li>
              <li>Explore os módulos disponíveis no seu plano</li>
              <li>Em caso de dúvida, acesse o Manual do Usuário</li>
            </ol>
          </div>

          <div style="text-align:center;margin-top:24px">
            <a href="https://wa.me/${WHATSAPP}" style="color:#5b4fcf;font-size:13px">💬 Precisa de ajuda? Fale conosco no WhatsApp</a>
          </div>

          <hr style="border:none;border-top:1px solid #e8e6e0;margin:24px 0">
          <p style="color:#767069;font-size:11px;text-align:center">NODRI Estilo & Beleza · ${linkAcesso}</p>
        </div>
      </div>
    `,
  })
}

// ── NOTIFICAÇÃO DE PAGAMENTO ──
export async function enviarEmailPagamento({
  email, nome, status, valor, plano,
}: { email: string; nome: string; status: 'aprovado' | 'recusado' | 'pendente'; valor: number; plano: string }) {
  const config = {
    aprovado: { emoji: '✅', cor: '#22c55e', titulo: 'Pagamento Aprovado!', msg: 'Seu pagamento foi confirmado e seu acesso está ativo.' },
    recusado: { emoji: '❌', cor: '#ef4444', titulo: 'Pagamento Recusado', msg: 'Não conseguimos processar seu pagamento. Tente novamente ou entre em contato.' },
    pendente: { emoji: '⏳', cor: '#f59e0b', titulo: 'Pagamento Pendente', msg: 'Seu pagamento está sendo processado. Em breve confirmaremos.' },
  }[status]

  await sendEmail({
    to: email,
    subject: `${config.emoji} ${config.titulo} — NODRI`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;color:#1a1a1a;border-radius:12px;overflow:hidden">
        <div style="background:${config.cor};padding:24px;text-align:center">
          <h2 style="margin:0;color:#fff;font-size:20px">${config.emoji} ${config.titulo}</h2>
        </div>
        <div style="padding:32px">
          <p style="color:#767069">Olá, <strong style="color:#1a1a1a">${nome}</strong>!</p>
          <p style="color:#767069;line-height:1.6">${config.msg}</p>
          <div style="background:#161820;border:1px solid #e8e6e0;border-radius:10px;padding:16px;margin:20px 0">
            <p style="margin:4px 0;color:#767069;font-size:13px">Plano: <strong style="color:#1a1a1a">${plano}</strong></p>
            <p style="margin:4px 0;color:#767069;font-size:13px">Valor: <strong style="color:#5b4fcf">R$ ${valor.toFixed(2)}</strong></p>
          </div>
          <div style="text-align:center">
            <a href="https://wa.me/${WHATSAPP}" style="color:#5b4fcf;font-size:13px">💬 Dúvidas? Fale conosco no WhatsApp</a>
          </div>
        </div>
      </div>
    `,
  })
}

// ── EMAIL AFILIADO ──
export async function sendEmailAfiliado({ nome, email, cupom, link }: {
  nome: string; email: string; cupom: string; link: string
}) {
  await sendEmail({
    to: email,
    subject: '🤝 Bem-vindo ao Programa de Afiliados NODRI!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;color:#1a1a1a;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#5b4fcf,#5b4fcf);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:28px;color:#000;font-weight:900">NODRI</h1>
          <p style="margin:8px 0 0;color:#000;font-size:13px">Programa de Afiliados</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#5b4fcf;margin-top:0">Parabéns, ${nome}!</h2>
          <p style="color:#767069;line-height:1.6">Você foi cadastrado no <strong style="color:#1a1a1a">Programa de Afiliados NODRI</strong>. Agora você pode indicar nosso sistema e ganhar comissão em cada venda!</p>
          <div style="background:#161820;border:1px solid #e8e6e0;border-radius:10px;padding:20px;margin:24px 0">
            <h3 style="color:#5b4fcf;margin-top:0;font-size:14px">🎫 SEU CUPOM EXCLUSIVO:</h3>
            <div style="background:#ffffff;border:2px dashed #5b4fcf;border-radius:8px;padding:16px;text-align:center;margin:12px 0">
              <span style="font-family:monospace;font-size:22px;font-weight:900;color:#5b4fcf;letter-spacing:3px">${cupom}</span>
            </div>
            <h3 style="color:#5b4fcf;margin-top:16px;font-size:14px">🔗 SEU LINK DE DIVULGAÇÃO:</h3>
            <div style="background:#ffffff;border:1px solid #e8e6e0;border-radius:8px;padding:12px">
              <a href="${link}" style="color:#5b4fcf;font-size:12px;font-family:monospace;word-break:break-all">${link}</a>
            </div>
          </div>
          <div style="background:#161820;border:1px solid #e8e6e0;border-radius:10px;padding:20px;margin:24px 0">
            <h3 style="color:#1a1a1a;margin-top:0;font-size:13px">💰 COMO FUNCIONA:</h3>
            <ol style="color:#767069;line-height:1.8;padding-left:20px;font-size:13px">
              <li>Compartilhe seu cupom ou link com seus contatos</li>
              <li>Quando alguém comprar usando seu cupom, você ganha <strong style="color:#5b4fcf">40% do valor</strong></li>
              <li>O pagamento é feito via Pix diretamente para você</li>
            </ol>
          </div>
          <div style="text-align:center">
            <a href="https://wa.me/${WHATSAPP}" style="color:#5b4fcf;font-size:13px">💬 Dúvidas? Fale conosco no WhatsApp</a>
          </div>
        </div>
      </div>
    `,
  })
}

// ── EMAIL COMISSÃO GERADA ──
export async function sendEmailComissao({ nome, email, cupom, valorCompra, valorComissao, plano }: {
  nome: string; email: string; cupom: string; valorCompra: number; valorComissao: number; plano: string
}) {
  await sendEmail({
    to: email,
    subject: '💰 Nova comissão gerada — NODRI',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;color:#1a1a1a;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:24px;text-align:center">
          <h2 style="margin:0;color:#fff;font-size:20px">💰 Nova Comissão Gerada!</h2>
        </div>
        <div style="padding:32px">
          <p style="color:#767069">Oi, <strong style="color:#1a1a1a">${nome}</strong>!</p>
          <p style="color:#767069">Alguém usou seu cupom <strong style="color:#5b4fcf">${cupom}</strong> e comprou o plano <strong style="color:#1a1a1a">${plano}</strong>!</p>
          <div style="background:#161820;border:1px solid #22c55e;border-radius:10px;padding:20px;margin:20px 0;text-align:center">
            <p style="color:#767069;margin:0;font-size:12px">Sua comissão</p>
            <p style="color:#15803d;font-size:32px;font-weight:900;margin:8px 0">R$ ${valorComissao.toFixed(2)}</p>
            <p style="color:#767069;font-size:11px;margin:0">sobre R$ ${valorCompra.toFixed(2)} da venda</p>
          </div>
          <p style="color:#767069;font-size:12px;text-align:center">O pagamento será processado pelo administrador via Pix.</p>
        </div>
      </div>
    `,
  })
}
