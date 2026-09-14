'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { useConsent } from '@/hooks/useConsent';
import { choiceAllOptional, type ConsentChoice } from '@/lib/consent';

const OPEN_EVENT = 'almanaque:open-cookie-consent';

// Botões com MESMO destaque visual (sem dark pattern): as 3 ações do banner —
// aceitar, rejeitar e gerenciar — compartilham classes idênticas. O teste E2E
// de same-visual-weight (tests/e2e/consent.spec.ts) compara os estilos
// computados e falha se qualquer botão se destacar dos demais.
const BUTTON_CLASS =
  'bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity';

type Category = Exclude<keyof ConsentChoice, 'necessary'>;

export default function CookieConsentBanner() {
  const { dict } = useI18n();
  const b = dict.common.cookieBanner;
  const { hasConsent, save } = useConsent();
  const [mounted, setMounted] = useState(false);
  const [managing, setManaging] = useState(false);
  const [choice, setChoice] = useState<ConsentChoice>(choiceAllOptional(false));

  // Hidratação segura: a leitura da preferência (localStorage/cookie) acontece
  // no hook, após o mount — o servidor não tem storage, então só renderizamos
  // o banner depois de saber se há consentimento (evita mismatch/flash).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const onOpen = () => setManaging(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  if (!mounted || hasConsent) return null;

  if (!managing) {
    return (
      <div
        data-testid="cookie-banner"
        className="fixed bottom-0 inset-x-0 z-[70] bg-foreground text-white shadow-lg"
        role="dialog"
        aria-label={b.title}
      >
        <div className="max-w-4xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 text-sm text-white/80">
            <p className="font-semibold text-white mb-1">{b.title}</p>
            <p>
              {b.body}{' '}
              <Link href="/cookies" className="underline text-white/90">
                {dict.footer.cookies}
              </Link>{' '}
              ·{' '}
              <Link href="/privacidade" className="underline text-white/90">
                {dict.footer.privacy}
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              data-testid="cookie-accept"
              onClick={() => save(choiceAllOptional(true), 'banner')}
              className={BUTTON_CLASS}
            >
              {b.accept}
            </button>
            <button
              data-testid="cookie-reject"
              onClick={() => save(choiceAllOptional(false), 'banner')}
              className={BUTTON_CLASS}
            >
              {b.reject}
            </button>
            <button
              data-testid="cookie-manage"
              onClick={() => setManaging(true)}
              className={BUTTON_CLASS}
            >
              {b.manage}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const catOrder: { key: Category; label: string; locked: boolean }[] = [
    { key: 'preferences', label: b.preferences, locked: false },
    { key: 'analytics', label: b.analytics, locked: false },
    { key: 'personalization', label: b.personalization, locked: false },
    { key: 'marketing', label: b.marketing, locked: false },
  ];

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-label={b.title}
    >
      <div
        data-testid="cookie-preferences"
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 text-foreground"
      >
        <h2 className="text-xl font-heading font-bold mb-3">{b.title}</h2>
        <p className="text-sm text-foreground/60 mb-2">{b.necessary}</p>
        <p className="text-xs text-foreground/50 mb-4">{b.necessaryAlways}</p>
        <div className="space-y-3 mb-5">
          {catOrder.map((c) => (
            <label
              key={c.key}
              className="flex items-center justify-between gap-3 text-sm text-foreground/80 cursor-pointer"
            >
              <span>{c.label}</span>
              <input
                type="checkbox"
                data-testid={`cookie-cat-${c.key}`}
                checked={choice[c.key]}
                onChange={(e) => setChoice((prev) => ({ ...prev, [c.key]: e.target.checked }))}
                className="h-4 w-4 text-primary"
              />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            data-testid="cookie-save"
            onClick={() => save(choice, 'preferences')}
            className={BUTTON_CLASS}
          >
            {b.save}
          </button>
          <button
            data-testid="cookie-prefs-reject"
            onClick={() => save(choiceAllOptional(false), 'preferences')}
            className={BUTTON_CLASS}
          >
            {b.reject}
          </button>
          <button
            onClick={() => setManaging(false)}
            className="px-4 py-2 rounded-lg text-sm underline text-foreground/60"
          >
            {dict.common.back}
          </button>
        </div>
        <p className="mt-4 text-xs text-foreground/50">
          <Link href="/cookies" className="underline">
            {dict.footer.cookies}
          </Link>{' '}
          ·{' '}
          <Link href="/privacidade" className="underline">
            {dict.footer.privacy}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function openCookieConsent() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_EVENT));
}
