'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  readStoredConsent,
  writeStoredConsent,
  syncConsentToServer,
  type StoredConsent,
} from '@/lib/consent-storage';
import { loadConsentScripts, type ConsentChoice } from '@/lib/consent';

/**
 * T436 — Fonte única de verdade do consentimento no cliente.
 * `save` persiste localmente (localStorage + cookie `consent_v`), dispara o
 * script loader (gate por categoria) e envia a prova ao backend (POST /consent).
 */
export function useConsent() {
  const [stored, setStored] = useState<StoredConsent | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Hidratação segura: localStorage só existe no cliente — ler após o mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setStored(readStoredConsent());
    setLoaded(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const save = useCallback((choice: ConsentChoice, source: 'banner' | 'preferences' = 'banner') => {
    const next = writeStoredConsent(choice);
    setStored(next);
    loadConsentScripts(choice);
    syncConsentToServer(choice, source);
  }, []);

  return {
    consent: stored,
    loaded,
    hasConsent: loaded && stored !== null,
    save,
  };
}
