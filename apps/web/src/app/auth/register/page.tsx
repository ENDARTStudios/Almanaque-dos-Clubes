'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!acceptTerms || !acceptPrivacy) {
      setError(t('auth.acceptRequired'));
      return;
    }
    try {
      await api.post('/auth/register', {
        email,
        password,
        name: name || undefined,
        acceptedTerms: acceptTerms,
        acceptedPrivacy: acceptPrivacy,
      });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registerErrorDefault'));
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md border border-border/50"
      >
        <h1 className="text-3xl font-heading font-bold mb-2 text-center text-foreground">
          {t('auth.registerTitle')}
        </h1>
        <p className="text-center text-foreground/60 mb-8 text-sm">{t('auth.registerSubtitle')}</p>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t('auth.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-border rounded-lg px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t('auth.email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border rounded-lg px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t('auth.password')}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border rounded-lg px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            required
            minLength={8}
          />
          <p className="text-xs text-foreground/50 mt-1">{t('auth.passwordHelp')}</p>
        </div>

        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-2.5 text-sm text-foreground/70 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
            />
            <span>
              {t('auth.acceptTerms')}{' '}
              <Link href="/termos" className="text-primary hover:underline">
                {t('footer.terms')}
              </Link>
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-sm text-foreground/70 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptPrivacy}
              onChange={(e) => setAcceptPrivacy(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
            />
            <span>
              {t('auth.acceptPrivacy')}{' '}
              <Link href="/privacidade" className="text-primary hover:underline">
                {t('footer.privacy')}
              </Link>
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer"
        >
          {t('auth.registerSubmit')}
        </button>
        <p className="text-sm text-center mt-4 text-foreground/60">
          <Link href="/auth/login" className="text-primary hover:underline cursor-pointer">
            {t('auth.haveAccount')} {t('auth.registerLink')}
          </Link>
        </p>
      </form>
    </div>
  );
}
