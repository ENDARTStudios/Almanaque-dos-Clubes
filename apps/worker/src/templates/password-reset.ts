import { escapeHtml } from './sanitize.js';

interface PasswordResetEmailData {
  name: string;
  email: string;
  resetLink: string;
}

export function passwordResetEmailHtml(data: PasswordResetEmailData): string {
  const safeName = escapeHtml(data.name);
  const safeLink = escapeHtml(data.resetLink);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f9f9f9;padding:40px 0">
  <div style="max-width:480px;margin:auto;background:white;border-radius:8px;padding:32px">
    <h1 style="color:#DC2626;margin:0 0 8px">Almanaque dos Clubes</h1>
    <p style="color:#333;line-height:1.6">Olá <strong>${safeName}</strong>,</p>
    <p style="color:#333;line-height:1.6">Recebemos uma solicitação de redefinição de senha para sua conta.</p>
    <p style="color:#333;line-height:1.6">Clique no botão abaixo para criar uma nova senha. Este link expira em <strong>15 minutos</strong>.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${safeLink}" style="background:#DC2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Redefinir Senha</a>
    </div>
    <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:12px">Se você não solicitou a redefinição, ignore este email.</p>
  </div>
</body></html>`;
}

export function passwordResetEmailText(data: PasswordResetEmailData): string {
  return `Olá ${data.name},

Recebemos uma solicitação de redefinição de senha para sua conta.

Clique no link abaixo para criar uma nova senha (válido por 15 minutos):
${data.resetLink}

Se você não solicitou a redefinição, ignore este email.`;
}
