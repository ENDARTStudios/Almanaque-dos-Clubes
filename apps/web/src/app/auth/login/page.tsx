'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { caminhoInternoSeguro } from '@/lib/redirect-safe';

/**
 * A marcação do card de login/cadastro vive no LAYOUT de `/auth` (para a troca animada persistir
 * entre as duas rotas). Esta página existe para manter a ROTA `/auth/login` funcionando — é ela
 * que o navbar, `ProtectedRoute`, `ClubOwnerButton` e o sitemap apontam.
 *
 * A guarda de sessão fica aqui, e não no card, para que o `/auth/register` não redirecione quem já
 * está logado (comportamento que só o login tinha, em T455).
 *
 * T567 — a guarda também honra `?next=`. Antes ela mandava para `/` mesmo com o parâmetro: um
 * Operador JÁ autenticado que abrisse o link de login do `/admin` era levado para a home em vez da
 * área restrita, e parecia que o login não funcionava. A validação é a mesma do formulário, porque
 * as duas portas precisam recusar open redirect.
 */
function GuardaDeSessao() {
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'authed') router.replace(caminhoInternoSeguro(params.get('next')));
  }, [status, router, params]);

  return null;
}

/**
 * `useSearchParams` exige fronteira de `Suspense` na renderização do servidor: sem ela, o Next
 * falha o build em vez de renderizar. A fronteira existe só por isso, e o fallback é `null`
 * porque esta página não desenha nada — o card vem do layout de `/auth`.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <GuardaDeSessao />
    </Suspense>
  );
}
