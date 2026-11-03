'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/ficha/AuthShell';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

/**
 * Telas de entrada — login e cadastro, sobre a casca do sistema.
 *
 * ── O QUE MUDOU NESTA RODADA ─────────────────────────────────────────────────────────────
 * A casca do card passou a ser `components/ficha/AuthShell`. Antes, o card era `auth-card__*`
 * em CSS próprio: o desenho estava certo, mas morava fora do sistema — nenhuma rota de auth
 * importava `@/components/ficha/`, então as quatro telas eram uma ilha. Ilha que ninguém reusa
 * e ninguém testa é dívida, mesmo quando é bonita.
 *
 * ── O QUE ESTE COMPONENTE NÃO FAZ MAIS ────────────────────────────────────────────────────
 * A versão anterior era um card de DUAS metades, com os quatro painéis coexistindo no DOM e a
 * metade inativa levando `inert`, porque a troca era animada em CSS e `display:none` mataria a
 * transição. Isso exigia uma regra especial (T554): só o painel ATIVO recebia `<h1>`.
 *
 * Agora só o formulário da rota atual é renderizado: **um `<h1>` por construção, não por
 * condicional**. Sem `inert`, sem checkbox de estado, sem duas fontes de verdade para o modo —
 * a rota continua sendo a única.
 *
 * A saída para a outra tela era um `<label>` que acionava o checkbox: não navegava, não recebia
 * foco e não aparecia na lista de links do leitor de tela. É um `<Link>` de verdade.
 */
export function AuthCard({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login';

  return (
    <AuthShell
      title={isLogin ? 'Entrar' : 'Criar conta'}
      subtitle={
        isLogin
          ? 'Acesse sua conta no Almanaque dos Clubes'
          : 'Cadastre-se gratuitamente no Almanaque dos Clubes'
      }
      footer={
        <>
          {isLogin ? 'Ainda não tem conta? ' : 'Já tem conta? '}
          <Link
            href={isLogin ? '/auth/register' : '/auth/login'}
            className="auth-card__link auth-card__link--target"
          >
            {isLogin ? 'Criar conta' : 'Entrar'}
          </Link>
        </>
      }
    >
      {/* T567 — `LoginForm` usa `useSearchParams` (para honrar `?next=`), e o Next exige
          fronteira de `Suspense` em quem lê search params: sem ela, a página que prerenderiza
          este card falha o build. O `RegisterForm` não lê, então fica fora — a fronteira é do
          que precisa, não do bloco inteiro. */}
      {isLogin ? (
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      ) : (
        <RegisterForm />
      )}
    </AuthShell>
  );
}

export default AuthCard;
