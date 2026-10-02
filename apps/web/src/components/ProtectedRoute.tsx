'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

// T455 — consome SOMENTE o AuthProvider (fonte única). O check próprio de
// /auth/me criava uma segunda verdade que divergia do navbar pós-login.
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'anon') router.push('/auth/login');
  }, [status, router]);

  if (status !== 'authed') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-foreground/60">
            {status === 'anon' ? 'Redirecionando...' : 'Verificando sessão...'}
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
