'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getApiBase } from '@/lib/api-base';
import { useI18n } from '@/i18n/Provider';

const API_BASE = getApiBase();

/**
 * Formulário de login. A lógica (endpoint, tratamento de erro, Google condicional) veio da
 * página `/auth/login` sem alteração — o que mudou foi só a marcação visual.
 *
 * Diferença deliberada em relação à referência de design: o "Remember me" da referência NÃO
 * foi reproduzido. Não existe suporte a "lembrar-me" na API (a sessão é controlada por
 * cookie `__Host-refresh_token` com validade fixa), e um checkbox que não faz nada é pior do
 * que não ter checkbox. A linha tem só o link de recuperação.
 */
export function LoginForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // Login social: o botão aparece só quando a API tem GOOGLE_* configuradas.
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<{ data: { google: boolean } }>('/auth/providers')
      .then((res) => {
        if (active && res.data?.google) setGoogleEnabled(true);
      })
      .catch(() => {
        /* sem providers — só formulário */
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/login', { email, password });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginErrorDefault'));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-card__form">
      {error && (
        <div role="alert" className="auth-card__error">
          {error}
        </div>
      )}

      <div className="auth-card__field">
        <label htmlFor="login-email" className="auth-card__label">
          {t('auth.email')}
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-card__input"
          required
        />
      </div>

      <div className="auth-card__field">
        <label htmlFor="login-password" className="auth-card__label">
          {t('auth.password')}
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-card__input"
          required
        />
      </div>

      <div className="auth-card__row">
        <Link href="/auth/forgot-password" className="auth-card__link auth-card__link--target">
          {t('auth.forgotPasswordLink')}
        </Link>
      </div>

      <button type="submit" className="auth-card__submit">
        {t('auth.loginSubmit')}
      </button>

      {googleEnabled && (
        <>
          <div className="auth-card__divider" aria-hidden="true">
            <span className="auth-card__divider-line" />
            <span className="auth-card__divider-text">{t('auth.or')}</span>
            <span className="auth-card__divider-line" />
          </div>
          {/* Top-level GET: a API seta os cookies __Host- do próprio domínio e redireciona
              de volta — mesmo mecanismo do /auth/login. */}
          <a
            href={`${API_BASE}/auth/google`}
            data-testid="login-google"
            className="auth-card__social"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.32z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.96l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z"
              />
            </svg>
            {t('auth.loginGoogle')}
          </a>
        </>
      )}

      {/* A navegação para o cadastro é o PRÓPRIO toggle do card (a pílula da metade de texto);
          manter um segundo link aqui dentro duplicaria o mesmo destino. */}
    </form>
  );
}

export default LoginForm;
