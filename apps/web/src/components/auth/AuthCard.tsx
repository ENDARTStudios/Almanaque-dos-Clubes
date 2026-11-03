'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

/**
 * Shell das telas de autenticação — COLUNA ÚNICA.
 *
 * ── O QUE ESTAVA ERRADO ANTES ─────────────────────────────────────────────────────────────
 * Era um card de duas metades: à esquerda um painel que vendia ("O futebol é eterno") e à
 * direita o formulário, com troca animada por `<input type=checkbox>` + seletor `~`, 660px de
 * largura e `min-height: 720px`. O screenshot da tela em execução mostrou três problemas
 * concretos, nenhum deles de gosto:
 *
 *   1. VAZIO. A altura era dimensionada pelo CADASTRO. No login sobravam ~240px de retângulo
 *      vazio abaixo do botão — o formulário boiava no topo de um card grande demais para ele.
 *   2. CAIXA ALTA. O CTA era `text-transform: uppercase` + `letter-spacing: 1px`: "ENTRAR".
 *      A regra do sistema é caixa baixa em título e ação.
 *   3. LANDING. Metade da tela vendia ao lado de um formulário. Login é TAREFA — quem chega ali
 *      já decidiu entrar. O espaço rende mais dando lugar ao campo.
 *
 * ── O QUE ESTE COMPONENTE DEIXOU DE FAZER, E POR QUE ISSO É MELHOR ────────────────────────
 * Os QUATRO painéis coexistiam no DOM e a metade inativa levava `inert`, porque a troca era
 * animada em CSS e `display:none` mataria a transição. Isso exigia uma regra especial: só o
 * painel ativo recebia `<h1>`, senão a página teria dois (T554).
 *
 * Agora só o formulário da rota atual é renderizado. A página tem **um** `<h1>` por construção,
 * não por condicional; não há `inert`, não há checkbox de estado, não há duas fontes de verdade
 * para o modo (a rota continua sendo a única). A troca é navegação — e navegação não precisa de
 * animação para ser entendida.
 */
export function AuthCard({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login';

  return (
    <div className="auth-card">
      <h1 className="auth-card__title">{isLogin ? 'Entrar' : 'Criar conta'}</h1>
      <p className="auth-card__subtitle">
        {isLogin
          ? 'Acesse sua conta no Almanaque dos Clubes'
          : 'Cadastre-se gratuitamente no Almanaque dos Clubes'}
      </p>

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

      {/* Saída para a outra tela. Era um `<label>` que acionava o checkbox: não navegava, não
          aparecia na lista de links do leitor de tela e não tinha foco próprio. Agora é um
          link de verdade. */}
      <p className="auth-card__alternate">
        {isLogin ? 'Ainda não tem conta? ' : 'Já tem conta? '}
        <Link
          href={isLogin ? '/auth/register' : '/auth/login'}
          className="auth-card__link auth-card__link--target"
        >
          {isLogin ? 'Criar conta' : 'Entrar'}
        </Link>
      </p>
    </div>
  );
}

export default AuthCard;
