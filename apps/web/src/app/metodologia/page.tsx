import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { legalPagesEnabled } from '@/lib/flags';

export const metadata: Metadata = {
  title: 'Metodologia e fontes | Almanaque dos Clubes',
  description:
    'Fontes utilizadas pelo Almanaque dos Clubes (Wikidata CC0 e afins), critério de verificação, tratamento de divergências e limitações conhecidas.',
};

// T469 — "fontes verificadas" vira verdade-por-método-publicado: esta página
// documenta fontes, licenças, critério de verificação, divergências, correções
// e limitações conhecidas (R3: ancorada no estado real de produção).

export default function MetodologiaPage() {
  if (!legalPagesEnabled()) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-2">
        Metodologia e fontes
      </h1>
      <p className="text-sm text-foreground/50 mb-8">
        Última atualização: 22/09/2026 · END ART Studios
      </p>

      <div className="space-y-8 text-foreground/70 leading-relaxed">
        <section>
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">Fontes</h2>
          <p>
            O acervo é construído a partir de fontes abertas e licenciadas. A base de identidade
            (clubes, jogadores, competições) e as conquistas (títulos por edição) são importadas do{' '}
            <a
              href="https://www.wikidata.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Wikidata
            </a>{' '}
            sob licença <strong>CC0</strong> (domínio público). Conteúdos históricos complementares
            utilizam o arquivo RSSSF (Rekord-Kija), de acesso público.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            Critério de verificação
          </h2>
          <p>
            Cada registro importado carrega <strong>proveniência</strong>: o QID/URL da entidade na
            fonte, a data de importação e a licença. As conquistas apontam para a EDIÇÃO da
            competição (não apenas para a competição-mãe), permitindo auditoria registro a registro.
            A exportação pública em CSV/JSON carrega os mesmos campos de fonte.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            Divergências entre fontes
          </h2>
          <p>
            Quando duas fontes divergem (nome, ano, resultado), o pipeline{' '}
            <strong>não escolhe</strong>: o registro divergente não é gravado e segue para revisão
            manual com a fonte anotada. Nunca publicamos média, palpite ou preenchimento automático
            de lacuna.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            Limitações conhecidas
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Nem todo clube possui coordenada geográfica na fonte — o gap é medido e declarado, não
              preenchido por estimativa.
            </li>
            <li>
              Competições-mãe de algumas copas ainda não estão no acervo (gap medido e declarado);
              as edições correspondentes aguardam a semeadura das mães.
            </li>
            <li>
              Rankings por jogos reais dependem do histórico de partidas, ainda não importado. Não
              há inteligência artificial operacional na plataforma — quando houver, será marcada e
              documentada com fonte e citação.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">Correções</h2>
          <p>
            Encontrou um erro? A fonte de cada registro está a um clique (links &ldquo;fonte&rdquo;
            e &ldquo;Ver no Wikidata&rdquo; nas páginas do acervo). Correções na fonte são
            refletidas nas próximas importações; canais diretos: os indicados na{' '}
            <Link href="/privacidade" className="text-primary hover:underline">
              Política de Privacidade
            </Link>{' '}
            e nos{' '}
            <Link href="/termos" className="text-primary hover:underline">
              Termos de Uso
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
