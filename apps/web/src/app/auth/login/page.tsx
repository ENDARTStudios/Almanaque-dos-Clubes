'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

/**
 * A marcação do card de login/cadastro vive no LAYOUT de `/auth` (para a troca animada
 * persistir entre as duas rotas). Esta página existe para manter a ROTA `/auth/login`
 * funcionando — é ela que o navbar, `ProtectedRoute`, `ClubOwnerButton` e o sitemap apontam.
 *
 * A guarda de sessão fica aqui, e não no card, para que o `/auth/register` não redirecione
 * quem já está logado (comportamento que só o login tinha, em T455).
 */
export default function LoginPage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'authed') router.replace('/');
  }, [status, router]);

  return null;
}
