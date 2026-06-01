// Serviço de email usando Resend (gratuito até 3000 emails/mês)
// Ou fallback para SMTP Gmail quando configurado

const FROM_EMAIL = 'nodriestiloebeleza@gmail.com'
const FROM_NAME = 'NODRI Estilo & Beleza'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nodri-saas-jsx4.vercel.app'
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
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0d1117;color:#f0f2ff;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#00e5c8,#7c5cfc);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:28px;color:#000;font-weight:900">NODRI</h1>
          <p style="margin:8px 0 0;color:#000;font-size:13px">Estilo & Beleza</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#00e5c8;margin-top:0">Olá, ${nome}!</h2>
          <p style="color:#94a3b8;line-height:1.6">Recebemos uma solicitação para redefinir a senha da sua conta NODRI.</p>
          <p style="color:#94a3b8;line-height:1.6">Clique no botão abaixo para criar uma nova senha:</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${link}" style="background:linear-gradient(135deg,#00e5c8,#7c5cfc);color:#000;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;display:inline-block">
              🔐 Redefinir Senha
            </a>
          </div>
          <p style="color:#64748b;font-size:12px">Este link expira em <strong style="color:#f0f2ff">2 horas</strong>. Se você não solicitou a recuperação, ignore este email.</p>
          <hr style="border:none;border-top:1px solid #232840;margin:24px 0">
          <p style="color:#64748b;font-size:11px;text-align:center">NODRI Estilo & Beleza · Suporte: <a href="https://wa.me/${WHATSAPP}" style="color:#00e5c8">WhatsApp</a></p>
        </div>
      </div>
    `,
  })
}

// ── BEM-VINDO PÓS-COMPRA ──
export async function enviarEmailBoasVindas({
  email, nome, plano, linkAcesso, linkDownload,
}: { email: string; nome: string; plano: string; linkAcesso: string; linkDownload?: string }) {
  await sendEmail({
    to: email,
    subject: '🎉 Bem-vindo ao NODRI! Seu acesso está pronto',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0d1117;color:#f0f2ff;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#00e5c8,#7c5cfc);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:28px;color:#000;font-weight:900">NODRI</h1>
          <p style="margin:8px 0 0;color:#000;font-size:13px">Estilo & Beleza</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#00e5c8;margin-top:0">Bem-vindo, ${nome}! 🎉</h2>
          <p style="color:#94a3b8;line-height:1.6">Seu plano <strong style="color:#f0f2ff">${plano}</strong> foi ativado com sucesso! Agora você tem acesso completo ao sistema NODRI.</p>

          <div style="background:#161820;border:1px solid #232840;border-radius:10px;padding:20px;margin:24px 0">
            <h3 style="color:#00e5c8;margin-top:0;font-size:14px">📋 SEUS ACESSOS:</h3>
            <div style="margin:12px 0">
              <a href="${linkAcesso}" style="display:block;background:linear-gradient(135deg,#00e5c8,#7c5cfc);color:#000;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;font-size:14px;text-align:center;margin-bottom:10px">
                🌐 Acessar o Sistema NODRI
              </a>
              ${linkDownload ? `
              <a href="${linkDownload}" style="display:block;background:#232840;color:#f0f2ff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;font-size:14px;text-align:center;border:1px solid #00e5c8">
                ⬇️ Baixar o Programa
              </a>` : ''}
            </div>
          </div>

          <div style="background:#161820;border:1px solid #232840;border-radius:10px;padding:20px;margin:24px 0">
            <h3 style="color:#f0f2ff;margin-top:0;font-size:13px">🚀 PRÓXIMOS PASSOS:</h3>
            <ol style="color:#94a3b8;line-height:1.8;padding-left:20px;font-size:13px">
              <li>Acesse o sistema com seu email e senha</li>
              <li>Baixe e instale o programa no seu computador</li>
              <li>Explore os módulos disponíveis no seu plano</li>
              <li>Em caso de dúvida, acesse o Manual do Usuário</li>
            </ol>
          </div>

          <div style="text-align:center;margin-top:24px">
            <a href="https://wa.me/${WHATSAPP}" style="color:#00e5c8;font-size:13px">💬 Precisa de ajuda? Fale conosco no WhatsApp</a>
          </div>

          <hr style="border:none;border-top:1px solid #232840;margin:24px 0">
          <p style="color:#64748b;font-size:11px;text-align:center">NODRI Estilo & Beleza · ${linkAcesso}</p>
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
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0d1117;color:#f0f2ff;border-radius:12px;overflow:hidden">
        <div style="background:${config.cor};padding:24px;text-align:center">
          <h2 style="margin:0;color:#fff;font-size:20px">${config.emoji} ${config.titulo}</h2>
        </div>
        <div style="padding:32px">
          <p style="color:#94a3b8">Olá, <strong style="color:#f0f2ff">${nome}</strong>!</p>
          <p style="color:#94a3b8;line-height:1.6">${config.msg}</p>
          <div style="background:#161820;border:1px solid #232840;border-radius:10px;padding:16px;margin:20px 0">
            <p style="margin:4px 0;color:#94a3b8;font-size:13px">Plano: <strong style="color:#f0f2ff">${plano}</strong></p>
            <p style="margin:4px 0;color:#94a3b8;font-size:13px">Valor: <strong style="color:#00e5c8">R$ ${valor.toFixed(2)}</strong></p>
          </div>
          <div style="text-align:center">
            <a href="https://wa.me/${WHATSAPP}" style="color:#00e5c8;font-size:13px">💬 Dúvidas? Fale conosco no WhatsApp</a>
          </div>
        </div>
      </div>
    `,
  })
}
