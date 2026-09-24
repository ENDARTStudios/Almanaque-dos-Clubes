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
        Última atualização: 23/09/2026 · END ART Studios
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
            são obtidos da{' '}
            <a
              href="https://www.rsssf.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              RSSSF
            </a>{' '}
            (Rec.Sport.Soccer Statistics Foundation).{' '}
            <strong>
              Dados históricos fornecidos pela RSSSF. Uso condicionado à atribuição adequada.
            </strong>{' '}
            (Não é domínio público.)
          </p>
        </section>

        <section id="ranking-piloto-inglaterra" className="scroll-mt-20">
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            Ranking 0-100 (Piloto Inglaterra)
          </h2>
          <p>
            <strong>Status:</strong> piloto em produção. Cobre as 5 divisões inglesas da temporada
            2022/23 (Premier League, Championship, League One, League Two e National League).
          </p>
          <p className="mt-2">
            <strong>Fórmula (pontos brutos):</strong> Vitórias×3 + Empates×1 + Gols Pró×0.2. Nesta
            fase <strong>títulos = 0</strong> (sem integração com o grafo de conquistas) — limitação
            declarada.
          </p>
          <p className="mt-2">
            <strong>Peso:</strong> hierarquia <em>nacional</em> (3.0) para todas as divisões do
            piloto.
          </p>
          <p className="mt-2">
            <strong>Normalização:</strong> MinMax <em>por competição/temporada/divisão</em> (maior
            pontuação bruta = 100; menor = 0; demais proporcionais, arredondamento determinístico;
            desempate por gols contra, saldo, gols pró, nome, id). As divisões são normalizadas{' '}
            <strong>isoladamente</strong> — não há ranking único cross-division.
          </p>
          <p className="mt-2">
            <strong>Fonte e atribuição:</strong> baseado nas tabelas finais de classificação das
            ligas inglesas fornecidas pela{' '}
            <a
              href="https://www.rsssf.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              RSSSF
            </a>
            . <strong>Uso condicionado à atribuição adequada.</strong>
          </p>
          <p className="mt-2">
            <strong>Limitações conhecidas:</strong> (i) restrito à Inglaterra 2022/23; (ii) baseado
            apenas em <em>tabelas finais de classificação</em> (não em partidas individuais); (iii)
            sem integração com o grafo de títulos (títulos=0); (iv) sem ranking cross-division; (v)
            dados históricos podem conter lacunas e divergências entre fontes.
          </p>
          <p className="mt-2">
            <strong>Atualização e correções:</strong> última atualização em 23/09/2026. Encontrou um
            erro? Escreva para <strong>endart.studios@gmail.com</strong>.
          </p>
        </section>

        <section id="conquistas-estaduais-piloto-mg" className="scroll-mt-20">
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            Conquistas estaduais — Piloto Minas Gerais (2023-2025)
          </h2>
          <p>
            Os títulos estaduais do piloto Minas Gerais 2023-2025 foram obtidos a partir de tabelas
            históricas publicadas pela{' '}
            <a
              href="https://rsssfbrasil.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              RSSSF / RSSSF Brasil
            </a>{' '}
            (Rec.Sport.Soccer Statistics Foundation), nas páginas mantidas por{' '}
            <strong>Claudio Freati</strong>.
          </p>
          <p className="mt-2">
            <strong>Fontes:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Campeonato Mineiro 2023 —{' '}
              <a
                href="https://rsssfbrasil.com/tablesfq/mg2023.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                rsssfbrasil.com/tablesfq/mg2023.htm
              </a>
            </li>
            <li>
              Campeonato Mineiro 2024 —{' '}
              <a
                href="https://rsssfbrasil.com/tablesfq/mg2024.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                rsssfbrasil.com/tablesfq/mg2024.htm
              </a>
            </li>
            <li>
              Campeonato Mineiro 2025 —{' '}
              <a
                href="https://rsssfbrasil.com/tablesfq/mg2025.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                rsssfbrasil.com/tablesfq/mg2025.htm
              </a>
            </li>
          </ul>
          <p className="mt-2">
            <strong>Licença/atribuição:</strong> o material da RSSSF é de uso condicionado à
            atribuição adequada ao autor. Conforme as páginas-fonte: &ldquo;(C) Copyright Claudio
            Freati, RSSSF and RSSSF Brazil. You are free to copy this document in whole or part
            provided that proper acknowledgement is given to the author. All rights
            reserved.&rdquo;
          </p>
          <p className="mt-2">
            <strong>Limitação:</strong> esta seção cobre apenas o piloto do Campeonato Mineiro
            Módulo I para as temporadas 2023, 2024 e 2025. Não representa cobertura completa de
            campeonatos estaduais, municipais ou nacionais do Brasil.
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
              O ranking <strong>0-100 é um piloto (Inglaterra/RSSSF)</strong>, calculado a partir de
              tabelas finais de classificação — não de partidas individuais — e sem títulos. Rankings
              por jogos reais e para jogadores/técnicos aguardam ingestão granular. Não há
              inteligência artificial operacional na plataforma — quando houver, será marcada e
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
