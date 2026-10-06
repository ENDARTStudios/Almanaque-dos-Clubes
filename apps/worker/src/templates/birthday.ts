/**
 * WS-C-15 — email de parabéns + 1 mês de Elite (Resend via fila `email`).
 */
export interface BirthdayEmailInput {
  name: string;
  expiresAt: string; // ISO
}

const APP_URL = 'https://almanaquedosclubes.com';

export function birthdayEmailHtml({ name, expiresAt }: BirthdayEmailInput): string {
  const data = new Date(expiresAt).toLocaleDateString('pt-BR');
  return `<!doctype html>
<html lang="pt-BR">
  <body style="font-family:Arial,Helvetica,sans-serif;background:#faf7f5;padding:24px">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <h1 style="color:#7c2d12;margin:0 0 16px">🎂 Feliz aniversário, ${name}!</h1>
      <p style="color:#44403c;font-size:15px;line-height:1.6">
        A equipe do <strong>Almanaque dos Clubes</strong> preparou um presente:
        você ganhou <strong>1 mês do plano Elite</strong> — acesso livre a todo o
        acervo histórico, rankings 0-100 e comparações.
      </p>
      <p style="color:#44403c;font-size:15px;line-height:1.6">
        O benefício fica ativo até <strong>${data}</strong>, sem cobrança.
      </p>
      <p style="margin:24px 0">
        <a href="${APP_URL}/dashboard"
           style="background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block">
          Abrir o painel
        </a>
      </p>
      <p style="color:#a8a29e;font-size:12px;margin-top:24px">
        Você recebeu este email porque tem uma conta no Almanaque dos Clubes.
      </p>
    </div>
  </body>
</html>`;
}

export function birthdayEmailText({ name, expiresAt }: BirthdayEmailInput): string {
  const data = new Date(expiresAt).toLocaleDateString('pt-BR');
  return `Feliz aniversário, ${name}!

Você ganhou 1 mês do plano Elite do Almanaque dos Clubes — acesso livre
a todo o acervo histórico, rankings 0-100 e comparações. O benefício fica
ativo até ${data}, sem cobrança.

Abrir o painel: ${APP_URL}/dashboard`;
}
