import { escapeHtml } from './sanitize.js';

interface VerifyEmailData {
  name: string;
  email: string;
  verifyLink: string;
}

export function verifyEmailHtml(data: VerifyEmailData): string {
  const safeName = escapeHtml(data.name);
  const safeLink = escapeHtml(data.verifyLink);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f9f9f9;padding:40px 0">
  <div style="max-width:480px;margin:auto;background:white;border-radius:8px;padding:32px">
    <h1 style="color:#DC2626;margin:0 0 8px">Almanaque dos Clubes</h1>
    <p style="color:#333;line-height:1.6">Olá <strong>${safeName}</strong>,</p>
    <p style="color:#333;line-height:1.6">Confirme seu endereço de email para ativar sua conta.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${safeLink}" style="background:#DC2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Verificar Email</a>
    </div>
    <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:12px">Este link expira em 24 horas. Se você não criou esta conta, ignore este email.</p>
  </div>
</body></html>`;
}

export function verifyEmailText(data: VerifyEmailData): string {
  return `Olá ${data.name},

Confirme seu endereço de email para ativar sua conta.

Clique no link abaixo (válido por 24 horas):
${data.verifyLink}

Se você não criou esta conta, ignore este email.`;
}
