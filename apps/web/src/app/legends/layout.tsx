import type { ReactNode } from 'react';

/**
 * O PANTEÃO é a única superfície escura do produto (conceito FICHA, quadro `lendas`).
 *
 * O escuro vive num LAYOUT de segmento, não só na página, porque a rota tem estados próprios:
 * `loading.tsx` e `error.tsx` são renderizados pelo Next no lugar do `page`, e sem este wrapper
 * eles apareceriam como cartões claros sobre a faixa preta — o "dois sites colados" que a
 * topbar escura também evita. A página continua dona da composição; o layout garante o fundo.
 */
export default function LegendsLayout({ children }: { children: ReactNode }) {
  return <div className="theme-dark bg-background text-foreground">{children}</div>;
}
