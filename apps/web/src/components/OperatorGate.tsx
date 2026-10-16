'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { adminStrings } from '@/components/admin/strings';

/**
 * T565 — PORTÃO DE OPERADOR (cliente).
 *
 * O QUE ESTE COMPONENTE É E O QUE ELE NÃO É — leia antes de confiar nele.
 *
 * Ele **não** é o mecanismo de segurança. Segurança de verdade vive no servidor: as rotas
 * internas exigem `authenticate + requireRole('admin') + requireOperator`, e é a API que recusa
 * (401 sem identidade, 403 para quem não é o Operador). Nenhuma checagem feita no navegador
 * protege coisa alguma, porque quem controla o navegador pode pular o JavaScript inteiro e
 * chamar a API direto.
 *
 * O que ele É: a EXPERIÊNCIA. Sem ele, um usuário não autenticado abria `/admin`, via a moldura
 * da página, e depois um erro seco da API — parecia página quebrada, em vez de "faça login". O
 * Operador pediu "deve conter login e senha"; é isto que o gate entrega, com a decisão delegada à
 * API em vez de duplicada aqui.
 *
 * COMO ELE DESCOBRE SE PODE ENTRAR: perguntando. Faz uma chamada real a um endpoint protegido e
 * interpreta a RESPOSTA — 200 passa, 401 pede login, 403 recusa. Assim não há uma segunda fonte de
 * verdade sobre quem é o operador: se a allowlist mudar no servidor, este componente acompanha sem
 * ser tocado.
 */
type Estado = 'checando' | 'ok' | 'precisa-login' | 'sem-permissao' | 'indisponivel';

export default function OperatorGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const { locale } = useI18n();
  /* T571 — as strings vem do modulo do ADMIN, nao do dicionario geral.
     O defeito que isto corrige: eu havia posto as chaves em `admin.*` no dicionario e chamado
     `t('pages.admin.*')` aqui — caminho que NAO EXISTE. O `t()` devolve a PROPRIA CHAVE quando
     nao encontra, entao a tela de login mostrava literalmente "pages.admin.title" no lugar de
     "Administracao". Visto pelo Operador na tela, e nao por teste.

     A fonte certa e a mesma das outras paginas de admin (`adminStrings`), que ja existia quando
     eu escrevi isto — eu nao a encontrei porque procurei no dicionario.
  /**
   * O estado da CHAMADA, sem os casos que já se sabe pela sessão.
   *
   * `null` = ainda não perguntei. O lint do projeto acusa `setState` síncrono no corpo do efeito
   * (com razão: dispara render em cascata), então os casos "sessão carregando" e "anônimo" são
   * DERIVADOS de `status` lá embaixo, em vez de escritos no estado aqui dentro. Só o resultado da
   * requisição — que chega de forma assíncrona e é informação nova — vira estado.
   */
  const [resultado, setResultado] = useState<Exclude<Estado, 'checando'> | null>(null);
  const s = adminStrings[locale] ?? adminStrings['pt-br'];

  useEffect(() => {
    // Sem sessão autenticada não há o que perguntar: a resposta seria 401 de qualquer forma.
    if (status !== 'authed') return;

    let vivo = true;
    api
      .get<{ data?: unknown }>('/admin/users')
      .then(() => {
        if (vivo) setResultado('ok');
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        const codigo = (e as { status?: number }).status;
        if (codigo === 401) setResultado('precisa-login');
        else if (codigo === 403) setResultado('sem-permissao');
        // 500 ou rede: NÃO é permissão. Dizer "sem permissão" aqui seria uma afirmação falsa
        // sobre o usuário, e ele iria procurar um problema de acesso que não existe.
        else setResultado('indisponivel');
      });
    return () => {
      vivo = false;
    };
  }, [status]);

  /* ESTADO EFETIVO — a sessão decide dois casos sem requisição, e a resposta decide o resto.
     Ordem: sessão primeiro (é mais barata e mais autoritativa sobre "quem é você"), depois o
     veredito do servidor. */
  const estado: Estado =
    status === 'loading'
      ? 'checando'
      : status === 'anon'
        ? 'precisa-login'
        : (resultado ?? 'checando');

  if (estado === 'ok') return <>{children}</>;

  if (estado === 'checando') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-ink-2">{s.index.checking}</p>
      </div>
    );
  }

  /* LOGIN: o caminho que o Operador pediu. `next` preserva o destino para não obrigar a navegar
     de novo depois de entrar. */
  if (estado === 'precisa-login') {
    const destino = typeof window !== 'undefined' ? window.location.pathname : '/admin';
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
          {s.index.loginTitle}
        </h1>
        <p className="text-sm text-ink-2 mb-6">{s.index.loginRequired}</p>
        <Link
          href={`/auth/login?next=${encodeURIComponent(destino)}`}
          className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors duration-200"
          data-testid="operator-login-link"
        >
          {s.index.login}
        </Link>
      </div>
    );
  }

  /* SEM PERMISSÃO: a recusa é declarada sem dizer quem pode entrar. Entregar o e-mail do
     Operador aqui daria a um atacante o alvo exato. */
  const mensagem = estado === 'sem-permissao' ? s.index.forbidden : s.index.unavailable;

  return (
    <div className="max-w-md mx-auto px-4 py-16" data-testid={`operator-gate-${estado}`}>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">{s.index.loginTitle}</h1>
      <p className="text-sm text-ink-2">{mensagem}</p>
      <Link
        href="/"
        className="mt-6 inline-block text-sm text-primary-ink underline decoration-dotted underline-offset-2"
      >
        {s.nav.back}
      </Link>
    </div>
  );
}
