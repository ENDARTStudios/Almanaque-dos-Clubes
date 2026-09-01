'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';

type Category = 'preferences' | 'analytics' | 'personalization' | 'marketing';
type Choice = Record<Category, boolean>;

const STORAGE_KEY = 'almanaque_cookie_consent';
const OPEN_EVENT = 'almanaque:open-cookie-consent';

function readChoice(): Choice | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        preferences: !!parsed.preferences,
        analytics: !!parsed.analytics,
        personalization: !!parsed.personalization,
        marketing: !!parsed.marketing,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeChoice(choice: Choice) {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify({ ...choice, ts: new Date().toISOString(), version: '1.0' });
  window.localStorage.setItem(STORAGE_KEY, payload);
  document.cookie = 'almanaque_consent=' + encodeURIComponent(payload) + ';path=/;max-age=31536000;samesite=lax';
}

export default function CookieConsentBanner() {
  const { dict, t } = useI18n();
  const b = dict.common.cookieBanner;
  const [open, setOpen] = useState<boolean>(() => !readChoice());
  const [managing, setManaging] = useState(false);
  const [choice, setChoice] = useState<Choice>({ preferences: false, analytics: false, personalization: false, marketing: false });

  useEffect(() => {
    const onOpen = () => setManaging(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  function apply(next: Choice) {
    setChoice(next);
    writeChoice(next);
    setOpen(false);
    setManaging(false);
  }

  if (!open && !managing) return null;
  if (!managing) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-[70] bg-foreground text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 text-sm text-white/80">
            <p className="font-semibold text-white mb-1">{b.title}</p>
            <p>{b.body} <Link href="/cookies" className="underline text-white/90">{t('legal.terms') === '' ? b.necessary : dict.footer.terms}</Link> · <Link href="/privacidade" className="underline text-white/90">{dict.footer.privacy}</Link></p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => apply({ preferences: true, analytics: true, personalization: true, marketing: true })} className="bg-primary text-on-primary px-3 py-2 rounded-lg text-sm font-semibold">{b.accept}</button>
            <button onClick={() => apply({ preferences: false, analytics: false, personalization: false, marketing: false })} className="border border-white/30 text-white px-3 py-2 rounded-lg text-sm font-semibold">{b.reject}</button>
            <button onClick={() => setManaging(true)} className="border border-white/30 text-white px-3 py-2 rounded-lg text-sm">{b.manage}</button>
          </div>
        </div>
      </div>
    );
  }

  const catOrder: { key: Category; label: string; always: boolean }[] = [
    { key: 'preferences', label: b.preferences, always: false },
    { key: 'analytics', label: b.analytics, always: false },
    { key: 'personalization', label: b.personalization, always: false },
    { key: 'marketing', label: b.marketing, always: false },
  ];

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 text-foreground">
        <h2 className="text-xl font-heading font-bold mb-3">{b.title}</h2>
        <p className="text-sm text-foreground/60 mb-2">{b.necessary}</p>
        <p className="text-xs text-foreground/50 mb-4">{b.necessaryAlways}</p>
        <div className="space-y-3 mb-5">
          {catOrder.map((c) => (
            <label key={c.key} className="flex items-center justify-between gap-3 text-sm text-foreground/80 cursor-pointer">
              <span>{c.label}</span>
              <input type="checkbox" checked={choice[c.key]} onChange={(e) => setChoice((prev) => ({ ...prev, [c.key]: e.target.checked }))} className="h-4 w-4 text-primary" />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => apply(choice)} className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold">{b.save}</button>
          <button onClick={() => apply({ preferences: false, analytics: false, personalization: false, marketing: false })} className="border border-border text-foreground px-4 py-2 rounded-lg text-sm">{b.reject}</button>
          <button onClick={() => setManaging(false)} className="border border-border text-foreground px-4 py-2 rounded-lg text-sm">{dict.footer.terms}</button>
        </div>
        <p className="mt-4 text-xs text-foreground/50">
          <Link href="/cookies" className="underline">{dict.footer.terms}</Link> · <Link href="/privacidade" className="underline">{dict.footer.privacy}</Link>
        </p>
      </div>
    </div>
  );
}

export function openCookieConsent() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_EVENT));
}
