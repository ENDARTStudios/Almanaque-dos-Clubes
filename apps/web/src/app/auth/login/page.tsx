'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getApiBase } from '@/lib/api-base';
import { useAuth } from '@/components/AuthProvider';
import { useI18n } from '@/i18n/Provider';

const API_BASE = getApiBase();

export default function LoginPage() {
  const router = useRouter();
  const { status } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // Login social (10-05): botão aparece só quando a API tem GOOGLE_* configuradas.
  const [googleEnabled, setGoogleEnabled] = useState(false);

  // T455 — usuário já logado não vê o formulário (a "segunda verdade" do
  // screenshot: navbar logado + form renderizado).
  useEffect(() => {
    if (status === 'authed') router.replace('/');
  }, [status, router]);

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

  // enquanto o estado é indeterminado, não renderiza o form (evita flash)
  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/login', { email, password });
      // T455 — o AuthProvider re-verifica na navegação (router.push abaixo).
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginErrorDefault'));
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4 py-10">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md border border-border/50">
        <h1 className="text-3xl font-heading font-bold mb-2 text-center text-foreground">{t('auth.loginTitle')}</h1>
        <p className="text-center text-foreground/60 mb-8 text-sm">{t('auth.loginSubtitle')}</p>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">{error}</div>}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth.email')}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border rounded-lg px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" required />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-1.5">{t('auth.password')}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border rounded-lg px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" required />
        </div>
        <div className="flex justify-end mb-4 -mt-2">
          <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline cursor-pointer">{t('auth.forgotPasswordLink')}</Link>
        </div>
        <button type="submit" className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer">
          {t('auth.loginSubmit')}
        </button>
        {googleEnabled && (
          <>
            <div className="flex items-center gap-3 my-4" aria-hidden="true">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-foreground/40">ou</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            {/* Top-level GET: a API seta os cookies __Host- do próprio domínio
                e redireciona de volta — mesmo mecanismo do /auth/login. */}
            <a
              href={`${API_BASE}/auth/google`}
              data-testid="login-google"
              className="w-full flex items-center justify-center gap-2 border border-border py-2.5 rounded-lg font-medium text-sm hover:bg-foreground/5 transition-all duration-200"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.32z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.96l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z" />
              </svg>
              {t('auth.loginGoogle')}
            </a>
          </>
        )}
        <p className="text-sm text-center mt-4 text-foreground/60">
          <Link href="/auth/register" className="text-primary hover:underline cursor-pointer">
            {t('auth.noAccount')} {t('auth.loginLink')}
          </Link>
        </p>
      </form>
    </div>
  );
}
