import type { ReactNode } from 'react';

/**
 * Painel de autenticação de METADE ÚNICA — para as telas que não têm par de troca
 * (`/auth/forgot-password` e `/auth/reset-password/[token]`).
 *
 * Reaproveita as classes internas do `AuthCard` (título, campos, botão), então as quatro telas
 * de auth usam exatamente a mesma linguagem visual. O que este componente NÃO tem: o toggle,
 * a metade de texto e o gradiente — não há o que trocar nessas telas, e um card com metade
 * decorativa vazia seria só peso.
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
    <div className="auth-single">
      <div className="auth-card auth-single__card">
        <div className="auth-single__inner">
          <h1 className="auth-card__title">{title}</h1>
          {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
          {children}
          {footer && <div className="auth-single__footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export default AuthPanel;
