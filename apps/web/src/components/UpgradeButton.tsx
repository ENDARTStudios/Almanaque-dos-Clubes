'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

// T463 D-B — "Fazer upgrade" dispara POST /billing/checkout e redireciona
// para o Stripe Checkout. Nunca inerte em caminho de dinheiro.
export default function UpgradeButton({ plan, label }: { plan: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setBusy(true);
    setError('');
    try {
      const r = await api.post<{ data: { url: string } }>('/billing/checkout', {
        plan,
        interval: 'month',
      });
      window.location.href = r.data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar checkout.');
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleClick}
        disabled={busy}
        className="w-full bg-primary text-on-primary py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer disabled:opacity-50"
      >
        {busy ? '...' : label}
      </button>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
