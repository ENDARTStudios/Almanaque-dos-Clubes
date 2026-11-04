'use client';
import { useI18n } from '@/i18n/Provider';
import LegalShell from '@/components/legal/LegalShell';
import LegalSections from '@/components/legal/LegalSections';
import { slugDaSecao } from '@/lib/legal-slug';

/** Política de Privacidade e Termos de Uso no shell legal do conceito FICHA. */
export default function LegalDocument({ kind }: { kind: 'terms' | 'privacy' }) {
  const { dict } = useI18n();
  const doc = dict.legal[kind];
  const sections = doc.sections.map((section) => ({
    id: slugDaSecao(section.title),
    label: section.title,
  }));

  return (
    <LegalShell
      active={kind === 'privacy' ? 'privacidade' : 'termos'}
      title={doc.title}
      updated={doc.updated}
      version={doc.version}
      sections={sections}
    >
      <LegalSections sections={doc.sections} />
    </LegalShell>
  );
}
