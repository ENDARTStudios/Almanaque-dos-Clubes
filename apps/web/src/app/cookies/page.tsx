import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { legalAlternates } from '@/lib/legal-hreflang';
import { legalPagesEnabled } from '@/lib/flags';
import { getDictionary } from '@/i18n/getDictionary';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import LegalShell from '@/components/legal/LegalShell';
import LegalSections from '@/components/legal/LegalSections';
import { slugDaSecao } from '@/lib/legal-slug';

export const metadata: Metadata = {
  alternates: legalAlternates('/cookies'),
  title: 'Política de Cookies | Almanaque dos Clubes',
  description: 'Política de Cookies do Almanaque dos Clubes, operado por END ART Studios.',
};

/**
 * /cookies no shell legal do conceito FICHA. O documento continua o do dicionário
 * (texto real, com inventário verificado em produção); o que muda é a composição:
 * cabeçalho Legal + abas + "Em uma frase" + "Nesta página" + tabela de inventário densa.
 */
export default async function CookiesPage() {
  if (!legalPagesEnabled()) notFound();
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);
  const doc = dict.pages.cookiePolicy;
  const inventario = 'inventory' in doc && doc.inventory ? doc.inventory : [];
  const inventarioTitulo =
    'inventoryTitle' in doc && doc.inventoryTitle ? doc.inventoryTitle : 'Cookies';
  const inventarioId = slugDaSecao(inventarioTitulo);
  const sections = [
    ...doc.sections.map((s) => ({ id: slugDaSecao(s.title), label: s.title })),
    ...(inventario.length > 0 ? [{ id: inventarioId, label: inventarioTitulo }] : []),
  ];
  const headers =
    'inventoryHeaders' in doc && doc.inventoryHeaders
      ? doc.inventoryHeaders
      : ['Cookie', 'Finalidade', 'Categoria', 'Duração', 'Forma'];

  return (
    <LegalShell active="cookies" title={doc.title} sections={sections}>
      <LegalSections sections={doc.sections} />

      {inventario.length > 0 ? (
        <section id={inventarioId} className="mt-8 scroll-mt-20">
          <h2 className="border-t border-border pt-4 text-[16px] font-semibold leading-tight text-foreground">
            {inventarioTitulo}
          </h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-border text-[10px] tracking-[0.08em] text-ink-3 uppercase">
                  {headers.map((h) => (
                    <th key={h} scope="col" className="py-1.5 pr-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventario.map((row) => (
                  <tr key={row.name} className="border-b border-border">
                    <td className="py-2 pr-3 font-mono text-[11px] text-foreground">{row.name}</td>
                    <td className="py-2 pr-3 text-ink-2">{row.purpose}</td>
                    <td className="py-2 pr-3 text-ink-2">{row.category}</td>
                    <td className="py-2 pr-3 text-ink-2">{row.duration}</td>
                    <td className="py-2 text-ink-2">{row.form}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {'note' in doc && doc.note ? (
        <p className="mt-6 border-t border-border pt-3 text-[11px] leading-snug text-ink-3">
          {doc.note}
        </p>
      ) : null}
    </LegalShell>
  );
}
