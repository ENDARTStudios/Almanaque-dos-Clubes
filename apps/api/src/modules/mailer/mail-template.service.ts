/**
 * Templates de email transacional (verificação e reset de senha).
 *
 * Segurança (T342):
 * - Toda variável interpolada em HTML passa por escapeHtml (anti-XSS).
 * - Email e link são validados antes da renderização.
 * - Nome é sanitizado (controle chars) e truncado em 100 chars.
 * - Nenhum log é emitido neste módulo (token/corpo nunca são logados).
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\/\S+$/;
const NAME_MAX_LENGTH = 100;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizePlainText(value: string): string {
  return value
    .split('')
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 || code === 9;
    })
    .join('');
}

function validateEmail(email: string): void {
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('Email inválido para template de email');
  }
}

function validateLink(link: string): void {
  if (!URL_PATTERN.test(link)) {
    throw new Error('Link inválido para template de email');
  }
}

function normalizeName(name: string): string {
  const clean = sanitizePlainText(name).trim().slice(0, NAME_MAX_LENGTH);
  if (!clean) {
    throw new Error('Nome inválido para template de email');
  }
  return clean;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function htmlPage(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f9f9f9;padding:40px 0">
  <div style="max-width:480px;margin:auto;background:white;border-radius:8px;padding:32px">
    <h1 style="color:#DC2626;margin:0 0 8px">${title}</h1>
${bodyHtml}
  </div>
</body></html>`;
}

/**
 * Email de verificação de email (link single-use com TTL).
 */
export function renderVerificationEmail(input: {
  name: string;
  email: string;
  verifyLink: string;
}): RenderedEmail {
  validateEmail(input.email);
  validateLink(input.verifyLink);
  const name = normalizeName(input.name);
  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(input.verifyLink);

  return {
    subject: 'Verifique seu email — Almanaque dos Clubes',
    html: htmlPage(
      'Almanaque dos Clubes',
      `    <p style="color:#333;line-height:1.6">Olá <strong>${safeName}</strong>,</p>
    <p style="color:#333;line-height:1.6">Confirme seu endereço de email para ativar sua conta.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${safeLink}" style="background:#DC2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Verificar Email</a>
    </div>
    <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:12px">Este link expira em 24 horas. Se você não criou esta conta, ignore este email.</p>`,
    ),
    text: `Olá ${name},

Confirme seu endereço de email para ativar sua conta.

Clique no link abaixo (válido por 24 horas):
${input.verifyLink}

Se você não criou esta conta, ignore este email.`,
  };
}

/**
 * Email de redefinição de senha (link single-use com TTL de 15min).
 */
export function renderPasswordResetEmail(input: {
  name: string;
  email: string;
  resetLink: string;
}): RenderedEmail {
  validateEmail(input.email);
  validateLink(input.resetLink);
  const name = normalizeName(input.name);
  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(input.resetLink);

  return {
    subject: 'Redefinição de Senha — Almanaque dos Clubes',
    html: htmlPage(
      'Almanaque dos Clubes',
      `    <p style="color:#333;line-height:1.6">Olá <strong>${safeName}</strong>,</p>
    <p style="color:#333;line-height:1.6">Recebemos uma solicitação de redefinição de senha para sua conta.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${safeLink}" style="background:#DC2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Redefinir Senha</a>
    </div>
    <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:12px">Este link expira em 15 minutos. Se você não solicitou a redefinição, ignore este email.</p>`,
    ),
    text: `Olá ${name},

Recebemos uma solicitação de redefinição de senha para sua conta.

Clique no link abaixo para criar uma nova senha (válido por 15 minutos):
${input.resetLink}

Se você não solicitou a redefinição, ignore este email.`,
  };
}
