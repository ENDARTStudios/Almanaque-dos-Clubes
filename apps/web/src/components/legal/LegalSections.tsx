'use client';

/**
 * Corpo do documento legal no conceito FICHA: seções com fio de 1px, títulos de 16px e corpo
 * 13/20. Recebe os títulos/parágrafos já localizados (dicionário) — não reescreve texto legal.
 */
import { slugDaSecao } from '@/lib/legal-slug';

export default function LegalSections({
  sections,
}: {
  sections: Array<{ title: string; body: string[] }>;
}) {
  return (
    <div className="space-y-8">
      {sections.map((section) => {
        const id = slugDaSecao(section.title);
        return (
          <section key={section.title} id={id} className="scroll-mt-20">
            <h2 className="border-t border-border pt-4 text-[16px] font-semibold leading-tight text-foreground">
              {section.title}
            </h2>
            {section.body.map((para, i) => (
              <p key={i} className="mt-2 text-[13px] leading-[20px] text-ink-2">
                {para}
              </p>
            ))}
          </section>
        );
      })}
    </div>
  );
}
