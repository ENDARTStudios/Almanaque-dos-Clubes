'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { AuthPanel } from '@/components/auth/AuthPanel';

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginErrorDefault'));
    }
  }

  return (
    <AuthPanel
      title={t('auth.forgotPasswordTitle')}
      subtitle={t('auth.forgotPasswordSubtitle')}
      footer={
        <Link href="/auth/login" className="auth-card__link">
          {t('auth.backToLogin')}
        </Link>
      }
    >
      {error && (
        <div role="alert" className="auth-card__error">
          {error}
        </div>
      )}
      {sent ? (
        <div role="status" className="auth-card__success">
          {t('auth.forgotPasswordSent')}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-card__form">
          <div className="auth-card__field">
            <label htmlFor="forgot-email" className="auth-card__label">
              {t('auth.email')}
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-card__input"
              required
            />
          </div>
          <button type="submit" className="auth-card__submit">
            {t('auth.forgotPasswordSubmit')}
          </button>
        </form>
      )}
    </AuthPanel>
  );
}
