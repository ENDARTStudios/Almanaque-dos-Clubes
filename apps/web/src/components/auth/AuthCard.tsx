'use client';

import { Suspense, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

/**
 * Shell das telas de autenticação — card de duas metades com TROCA (login ⇄ cadastro).
 *
 * Estrutura (a mesma da referência de design que o Operador pediu):
 *   <div class="auth-card">
 *     <input type="checkbox" class="auth-card__toggle" hidden>
 *     <div class="auth-card__pane --hero --login">       texto do login
 *     <div class="auth-card__pane --hero --register">    texto do cadastro
 *     <div class="auth-card__pane --login">              formulário de login
 *     <div class="auth-card__pane --register">           formulário de cadastro
 *   </div>
 *
 * Por que os QUATRO painéis ficam no DOM e são irmãos diretos do checkbox: a troca é CSS puro
 * (`~` + `:checked`), sem estado de animação em JS — animar em JS reintroduziria o problema de
 * "estado intermediário congelado" que já custou caro neste projeto. A metade que não
 * corresponde à rota atual recebe `inert` (tira do tab order e da árvore de acessibilidade) e a
 * classe `--hidden` (tira do ponteiro, com atraso igual ao da transição). Sem essas duas, o
 * usuário tabularia para dentro de um formulário invisível.
 *
 * O checkbox marcado significa "modo cadastro", então o estado vem da ROTA (`mode`) e não de um
 * `useState`: navegar direto para /auth/register já deixa o card no estado certo, sem flash e
 * sem duas fontes de verdade. O `onChange` só navega.
 */
export function AuthCard({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const toggleId = useId();
  const isLogin = mode === 'login';

  const handleToggle = useCallback(() => {
    router.push(isLogin ? '/auth/register' : '/auth/login');
  }, [isLogin, router]);

  const paneClass = (pMode: 'login' | 'register', isHero: boolean) =>
    ['auth-card__pane', isHero && 'auth-card__pane--hero', `auth-card__pane--${pMode}`]
      .filter(Boolean)
      .join(' ');

  const hero = (pMode: 'login' | 'register', title: string, text: string, cta: string) => {
    const active = pMode === mode;
    return (
      <div className={paneClass(pMode, true)} inert={!active}>
        <div className="auth-card__mark" aria-hidden="true" />
        <div className="auth-card__hero-content">
          <h2 className="auth-card__hero-title">{title}</h2>
          <p className="auth-card__hero-text">{text}</p>
          <label htmlFor={toggleId} className="auth-card__switch">
            {cta}
          </label>
        </div>
      </div>
    );
  };

  const form = (
    pMode: 'login' | 'register',
    title: string,
    subtitle: string,
    children: ReactNode,
  ) => {
    const active = pMode === mode;
    return (
      <div className={paneClass(pMode, false)} inert={!active}>
        {/* T554 — só o painel ATIVO expõe `<h1>`: os dois formulários coexistem no DOM
            (a troca é animada, então `display:none` não serve), e dois `<h1>` na mesma
            página quebram 1.3.1/2.4.6 e o heading-order. O painel inativo usa `<p>` com a
            MESMA classe — `.auth-card__title` define margem e tamanho, e o preflight
            zera o peso do heading, então o desenho não muda. */}
        {active ? (
          <h1 className="auth-card__title">{title}</h1>
        ) : (
          <p className="auth-card__title">{title}</p>
        )}
        <p className="auth-card__subtitle">{subtitle}</p>
        {children}
      </div>
    );
  };

  return (
    <div className={`auth-card auth-card--${mode}`}>
      <input
        id={toggleId}
        type="checkbox"
        className="auth-card__toggle"
        checked={!isLogin}
        onChange={handleToggle}
        readOnly
        aria-label={isLogin ? 'Ir para o cadastro' : 'Ir para o login'}
      />

      {hero(
        'login',
        'O futebol é eterno',
        'Sua conta guarda o que você acompanha: favoritos, comparações e histórico.',
        'Criar conta',
      )}
      {hero(
        'register',
        'Comece pelo que te trouxe aqui',
        'A conta é gratuita e leva menos de um minuto. Sem cartão.',
        'Entrar',
      )}

      {/* T567 — `LoginForm` usa `useSearchParams` (para honrar `?next=`), e o Next exige fronteira
          de `Suspense` em quem lê search params: sem ela, a página que PRERENDERIZA este card
          falha o build. O `RegisterForm` não lê, então fica fora — a fronteira é do que precisa,
          não do bloco inteiro. */}
      {form(
        'login',
        'Entrar',
        'Acesse sua conta no Almanaque dos Clubes',
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>,
      )}
      {form(
        'register',
        'Criar conta',
        'Cadastre-se gratuitamente no Almanaque dos Clubes',
        <RegisterForm />,
      )}
    </div>
  );
}

export default AuthCard;
