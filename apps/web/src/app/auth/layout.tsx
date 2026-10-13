'use client';

import { usePathname } from 'next/navigation';
import { AuthCard } from '@/components/auth/AuthCard';

/**
 * Layout do grupo de autenticação — e o motivo de o card viver AQUI e não na página.
 *
 * O design tem uma troca animada (`0.65s`) entre as metades de login e cadastro. Se o card
 * ficasse na página, o `router.push` de /auth/login para /auth/register DESMONTARIA e
 * remontaria o componente: a transição nunca apareceria (medido — `transform: none` a 300ms,
 * porque era uma árvore nova, não a mesma animando). Num layout, a árvore persiste entre as
 * duas rotas e a troca realmente anima, como na referência.
 *
 * As telas de recuperação/redefinição de senha não têm par para trocar, então continuam
 * renderizando o próprio painel (o card não é montado para elas).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCard = pathname === '/auth/login' || pathname === '/auth/register';

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-neutral-surface px-4 py-10">
      {isCard ? <AuthCard mode={pathname === '/auth/register' ? 'register' : 'login'} /> : children}
    </div>
  );
}
