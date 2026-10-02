'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

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
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md border border-border/50">
        <h1 className="text-3xl font-heading font-bold mb-2 text-center text-foreground">{t('auth.forgotPasswordTitle')}</h1>
        <p className="text-center text-foreground/60 mb-8 text-sm">{t('auth.forgotPasswordSubtitle')}</p>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">{error}</div>}
        {sent ? (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm border border-green-200">{t('auth.forgotPasswordSent')}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth.email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border rounded-lg px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" required />
            </div>
            <button type="submit" className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer">
              {t('auth.forgotPasswordSubmit')}
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
