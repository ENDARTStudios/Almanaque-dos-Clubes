interface WelcomeEmailData {
  name: string;
  email: string;
}

export function welcomeEmailHtml(data: WelcomeEmailData): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f9f9f9;padding:40px 0">
  <div style="max-width:480px;margin:auto;background:white;border-radius:8px;padding:32px">
    <h1 style="color:#DC2626;margin:0 0 8px">Almanaque dos Clubes</h1>
    <p style="color:#333;line-height:1.6">Olá <strong>${data.name}</strong>,</p>
    <p style="color:#333;line-height:1.6">Seja bem-vindo ao Almanaque dos Clubes! Sua conta foi criada com sucesso.</p>
    <p style="color:#333;line-height:1.6">Agora você pode pesquisar clubes, jogadores, competições e rankings históricos do futebol mundial.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="https://almanaquedosclubes.com/dashboard" style="background:#DC2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Ir para o Dashboard</a>
    </div>
    <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:12px">Se você não criou esta conta, ignore este email.</p>
  </div>
</body></html>`;
}

export function welcomeEmailText(data: WelcomeEmailData): string {
  return `Olá ${data.name},

Bem-vindo ao Almanaque dos Clubes! Sua conta foi criada com sucesso.

Acesse: https://almanaquedosclubes.com/dashboard

Se você não criou esta conta, ignore este email.`;
}
