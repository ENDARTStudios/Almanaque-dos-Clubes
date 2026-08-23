import { Resend } from 'resend';
import { createWorker } from '../../api/src/services/queue.js';
import { welcomeEmailHtml, welcomeEmailText } from './templates/welcome.js';
import { passwordResetEmailHtml, passwordResetEmailText } from './templates/password-reset.js';
import { verifyEmailHtml, verifyEmailText } from './templates/verify-email.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM ?? 'noreply@almanaquedosclubes.com';
const APP_URL = process.env.APP_URL ?? 'https://almanaquedosclubes.com';

if (!RESEND_API_KEY) {
  console.warn(
    '[Email Worker] RESEND_API_KEY não definida — worker rodará em modo dry-run (logs apenas)',
  );
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (!resend) {
    console.log(`[Email DRY-RUN] Para: ${to} | Assunto: ${subject}`);
    return;
  }
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    text,
  });
  if (error) {
    console.error(`[Email Worker] Falha ao enviar email para ${to}:`, error);
    throw error;
  }
  console.log(`[Email Worker] Email enviado para ${to}: ${subject}`);
}

createWorker('email', async (job) => {
  const { type } = job.data as { type: string };

  switch (type) {
    case 'welcome': {
      const { name, email } = job.data as { name: string; email: string };
      await sendEmail(
        email,
        'Bem-vindo ao Almanaque dos Clubes',
        welcomeEmailHtml({ name, email }),
        welcomeEmailText({ name, email }),
      );
      break;
    }

    case 'password-reset': {
      const { name, email, token } = job.data as { name: string; email: string; token: string };
      const resetLink = `${APP_URL}/auth/reset-password/${token}`;
      await sendEmail(
        email,
        'Redefinição de Senha — Almanaque dos Clubes',
        passwordResetEmailHtml({ name, email, resetLink }),
        passwordResetEmailText({ name, email, resetLink }),
      );
      break;
    }

    case 'verify-email': {
      const { name, email, token } = job.data as { name: string; email: string; token: string };
      const verifyLink = `${APP_URL}/auth/verify-email/${token}`;
      await sendEmail(
        email,
        'Verifique seu email — Almanaque dos Clubes',
        verifyEmailHtml({ name, email, verifyLink }),
        verifyEmailText({ name, email, verifyLink }),
      );
      break;
    }

    default:
      console.warn(`[Email Worker] Tipo de email desconhecido: ${type}`);
  }
});

console.log('🚀 Worker Email iniciado (Resend). Aguardando jobs...');
