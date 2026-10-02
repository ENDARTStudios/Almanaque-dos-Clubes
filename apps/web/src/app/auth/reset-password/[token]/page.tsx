'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

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
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md border border-border/50">
        <h1 className="text-3xl font-heading font-bold mb-2 text-center text-foreground">{t('auth.resetPasswordTitle')}</h1>
        <p className="text-center text-foreground/60 mb-8 text-sm">{t('auth.resetPasswordSubtitle')}</p>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">{error}</div>}
        {done ? (
          <div className="space-y-4">
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-200">{t('auth.resetPasswordSuccess')}</div>
            <Link href="/auth/login" className="block w-full text-center bg-primary text-on-primary py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer">
              {t('auth.backToLogin')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth.resetPasswordNew')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" required minLength={8} />
              <p className="text-xs text-foreground/50 mt-1">{t('auth.passwordHelp')}</p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth.resetPasswordConfirm')}</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" required minLength={8} />
            </div>
            <button type="submit" className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer">
              {t('auth.resetPasswordSubmit')}
            </button>
          </form>
        )}
        <p className="text-sm text-center mt-6 text-foreground/60">
          <Link href="/auth/login" className="text-primary hover:underline cursor-pointer">{t('auth.backToLogin')}</Link>
        </p>
      </div>
    </div>
  );
}
