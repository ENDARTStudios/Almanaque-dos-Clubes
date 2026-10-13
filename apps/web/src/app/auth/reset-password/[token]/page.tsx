'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { AuthPanel } from '@/components/auth/AuthPanel';

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const params = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    try {
      await api.post('/auth/reset-password', { token: params.token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registerErrorDefault'));
    }
  }

  return (
    <AuthPanel
      title={t('auth.resetPasswordTitle')}
      subtitle={t('auth.resetPasswordSubtitle')}
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
      {done ? (
        <div className="auth-card__form">
          <div role="status" className="auth-card__success">
            {t('auth.resetPasswordSuccess')}
          </div>
          <Link href="/auth/login" className="auth-card__submit">
            {t('auth.backToLogin')}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-card__form">
          <div className="auth-card__field">
            <label htmlFor="reset-password" className="auth-card__label">
              {t('auth.resetPasswordNew')}
            </label>
            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-card__input"
              required
              minLength={8}
              aria-describedby="reset-password-help"
            />
            <p id="reset-password-help" className="auth-card__help">
              {t('auth.passwordHelp')}
            </p>
          </div>
          <div className="auth-card__field">
            <label htmlFor="reset-confirm" className="auth-card__label">
              {t('auth.resetPasswordConfirm')}
            </label>
            <input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="auth-card__input"
              required
              minLength={8}
            />
          </div>
          <button type="submit" className="auth-card__submit">
            {t('auth.resetPasswordSubmit')}
          </button>
        </form>
      )}
    </AuthPanel>
  );
}
