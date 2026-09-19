'use client';
import { useState } from 'react';
import { useI18n } from '@/i18n/Provider';
import { api } from '@/lib/api';

// T445 — formulário público de notificações de direitos autorais (DMCA).
// Honeypot: campo `website` invisível para humanos; preenchido = bot → a API
// responde 201 idêntico e descarta (nenhum registro é criado).

interface CreateResult {
  data: { id: string; status: string };
}

export default function CopyrightClaimForm() {
  const { dict } = useI18n();
  const d = dict.copyrightForm;

  const [material, setMaterial] = useState('');
  const [location, setLocation] = useState('');
  const [fundament, setFundament] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — nunca renderizar visível
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [protocol, setProtocol] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<CreateResult>('/copyright-claims', {
        material,
        location,
        fundament,
        contactEmail,
        website: website || undefined,
      });
      setProtocol(res.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : d.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  if (protocol) {
    return (
      <div className="max-w-xl">
        <h2 className="text-xl font-heading font-semibold text-foreground mb-2">{d.successTitle}</h2>
        <p className="text-foreground/70 mb-4">{d.successBody}</p>
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-foreground/50 mb-1">{d.protocolLabel}</p>
          <code className="text-sm break-all text-primary">{protocol}</code>
        </div>
      </div>
    );
  }

  const inputCls =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground';

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <div>
        <label htmlFor="material" className="block text-sm text-foreground/70 mb-1">
          {d.materialLabel}
        </label>
        <textarea
          id="material"
          rows={3}
          required
          minLength={10}
          maxLength={2000}
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="location" className="block text-sm text-foreground/70 mb-1">
          {d.locationLabel}
        </label>
        <input
          id="location"
          type="url"
          required
          minLength={4}
          maxLength={500}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="fundament" className="block text-sm text-foreground/70 mb-1">
          {d.fundamentLabel}
        </label>
        <textarea
          id="fundament"
          rows={3}
          required
          minLength={10}
          maxLength={2000}
          value={fundament}
          onChange={(e) => setFundament(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="contactEmail" className="block text-sm text-foreground/70 mb-1">
          {d.emailLabel}
        </label>
        <input
          id="contactEmail"
          type="email"
          required
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className={inputCls}
        />
      </div>
      {/* Honeypot: invisível e fora da tabulação; bots preenchem, humanos não veem. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? d.submitting : d.submit}
      </button>
    </form>
  );
}
