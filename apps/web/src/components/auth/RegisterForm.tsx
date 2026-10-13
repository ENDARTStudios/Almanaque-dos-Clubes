'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

/**
 * Formulário de cadastro. A lógica veio de `/auth/register` sem alteração: os dois aceites
 * obrigatórios (Termos + Privacidade) continuam bloqueando o envio, e a data de nascimento
 * continua opcional.
 *
 * Este é o formulário que define a ALTURA do card: são nome + email + senha + 2 aceites +
 * data + botão, mais alto que os 520px da referência de design. Por isso a altura vem de
 * `min-height` no CSS, com o card crescendo — a alternativa (forçar 520px) cortaria campos.
 */
export function RegisterForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [birthDate, setBirthDate] = useState('');
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
    <form onSubmit={handleSubmit} className="auth-card__form">
      {error && (
        <div role="alert" className="auth-card__error">
          {error}
        </div>
      )}

      <div className="auth-card__field">
        <label htmlFor="register-name" className="auth-card__label">
          {t('auth.name')}
        </label>
        <input
          id="register-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="auth-card__input"
        />
      </div>

      <div className="auth-card__field">
        <label htmlFor="register-email" className="auth-card__label">
          {t('auth.email')}
        </label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-card__input"
          required
        />
      </div>

      <div className="auth-card__field">
        <label htmlFor="register-password" className="auth-card__label">
          {t('auth.password')}
        </label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-card__input"
          required
          minLength={8}
          aria-describedby="register-password-help"
        />
        <p id="register-password-help" className="auth-card__help">
          {t('auth.passwordHelp')}
        </p>
      </div>

      <div className="auth-card__consents">
        <label className="auth-card__consent">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="auth-card__checkbox mt-0.5 h-4 w-4"
          />
          <span>
            {t('auth.acceptTerms')}{' '}
            <Link href="/termos" className="auth-card__link">
              {t('footer.terms')}
            </Link>
          </span>
        </label>
        <label className="auth-card__consent">
          <input
            type="checkbox"
            checked={acceptPrivacy}
            onChange={(e) => setAcceptPrivacy(e.target.checked)}
            className="auth-card__checkbox mt-0.5 h-4 w-4"
          />
          <span>
            {t('auth.acceptPrivacy')}{' '}
            <Link href="/privacidade" className="auth-card__link">
              {t('footer.privacy')}
            </Link>
          </span>
        </label>
      </div>

      <div className="auth-card__field">
        <label htmlFor="register-birthdate" className="auth-card__label">
          Data de aniversário (opcional)
        </label>
        <input
          id="register-birthdate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="auth-card__input"
          aria-describedby="register-birthdate-help"
        />
        <p id="register-birthdate-help" className="auth-card__help">
          No seu aniversário você ganha 1 mês de Elite 🎁
        </p>
      </div>

      <button type="submit" className="auth-card__submit">
        {t('auth.registerSubmit')}
      </button>
    </form>
  );
}

export default RegisterForm;
