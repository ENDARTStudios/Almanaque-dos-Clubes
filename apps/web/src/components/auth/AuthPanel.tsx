import type { ReactNode } from 'react';
import AuthShell from '@/components/ficha/AuthShell';

/**
 * Telas de auth SEM par de troca — recuperar e redefinir senha.
 *
 * ── POR QUE ELE AINDA EXISTE, SE O `AuthShell` FAZ O TRABALHO ─────────────────────────────
 * As quatro telas de auth compartilham a MESMA casca (`AuthShell`); o que muda é o rodapé. No
 * login/cadastro o rodapé leva à outra tela do par; aqui ele leva de volta ao login. Este
 * componente existe para que as duas páginas de senha não repitam o mesmo `<AuthShell
 * footer={…}>` — e para que, se o rodapé dessas telas mudar, mude em um lugar.
 *
 * Antes ele montava a própria casca com `auth-single*` e `auth-card__title` em CSS próprio.
 * Agora delega ao componente do sistema: a mesma peça, um desenho só.
 */
export function AuthPanel({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <AuthShell title={title} subtitle={subtitle} footer={footer}>
      {children}
    </AuthShell>
  );
}

export default AuthPanel;
