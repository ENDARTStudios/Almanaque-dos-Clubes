'use client';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useConsent } from '@/hooks/useConsent';

/**
 * Auditoria 08-10 (P3) — telemetria de Core Web Vitals (Vercel Speed Insights).
 * GATEADA na categoria "analytics" do consentimento (regra T436: analytics
 * nunca carrega sem consentimento). Não usa cookies nem identificadores
 * próprios — só beacons first-party de métricas de performance.
 */
export default function SpeedInsightsGate() {
  const { consent, loaded } = useConsent();
  if (!loaded || !consent?.choice.analytics) return null;
  return <SpeedInsights />;
}
