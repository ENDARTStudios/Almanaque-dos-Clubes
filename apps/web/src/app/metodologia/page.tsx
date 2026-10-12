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
        Última atualização: 25/09/2026 · END ART Studios
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
          <p className="mt-2">
            Coordenadas geográficas são derivadas do Wikidata (CC0) e, quando ausentes, de
            geocodificação aproximada via{' '}
            <a
              href="https://www.openstreetmap.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              OpenStreetMap
            </a>{' '}
            (Nominatim). Coordenadas de geocodificação são <strong>aproximadas</strong> (nível
            município) e marcadas como tal.{' '}
            <strong>
              Geocodificação: © OpenStreetMap contributors, disponibilizada sob a Open Database
              License (ODbL).
            </strong>
          </p>
        </section>

        <section id="ranking-piloto-inglaterra" className="scroll-mt-20">
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            Ranking 0-100 (por competição e por ano)
          </h2>
          <p>
            <strong>Status:</strong> em produção desde 2026-10-11 com base em{' '}
            <em>partidas individuais</em> e <em>títulos</em>. Publicado para o Campeonato Brasileiro
            Série A (2021-2024), a Premier League (2023-24 e 2024-25) e a Copa Libertadores (2023 e
            2024), mais o <strong>agregado anual</strong> — todos os clubes do ano — de 2021 a 2025.
            O piloto inglês de 2022/23 por divisão (5 divisões) segue publicado e auditável.
          </p>
          <p className="mt-2">
            <strong>{'Fórmula (por clube, dentro do escopo):'}</strong>{' '}
            <span>
              {'Pontos brutos = Vitórias × 3 × peso + Empates × 1 × peso + Títulos × 50 × peso'}
            </span>
            . Os títulos vêm do grafo de conquistas (arestas WON, Wikidata CC0) e as partidas da
            RSSSF (com atribuição); o peso vem da hierarquia da competição (mundial &gt; continental
            &gt; nacional).
          </p>
          <p className="mt-2">
            <strong>Peso:</strong> hierarquia da competição (mundial 5.0 · continental 4.0 ·
            nacional 3.0), a mesma resolução usada pelo comparador de clubes.
          </p>
          <p className="mt-2">
            <strong>Normalização:</strong> MinMax <em>dentro de cada escopo</em> (competição +
            temporada, ou o ano no agregado) e <strong>isolada por gênero</strong> — 1º lugar do
            escopo = 100, último = 0, demais proporcionais (arredondamento determinístico). Escopos
            diferentes <strong>não</strong> são comparáveis entre si: o 100 do Brasileirão não é o
            100 da Premier League (ver &ldquo;Agregado cross-division&rdquo; abaixo).{' '}
            <strong>Amostra mínima:</strong> o clube-ano só é ranqueado com ≥ 1 título ou ≥ 5
            partidas; abaixo disso ele aparece <em>sem posição</em> com o motivo &ldquo;dados
            insuficientes&rdquo; — e um escopo sem nenhum clube ranqueado não é publicado.
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
            <strong>Limitações conhecidas:</strong> (i) a cobertura por <em>partidas</em> ainda é
            parcial — Brasileirão 2021-2024, Premier League 2023-24/2024-25 e Libertadores 2023/2024
            (as edições de 2025 dessas competições não existem na fonte); (ii) o ranking de jogador
            segue sem dados (não há tabela de estatísticas por partida); (iii) os rankings ingleses
            de 2022/23 por divisão e o piloto da pirâmide vêm de <em>tabelas finais</em> do pacote
            RSSSF e carregam um defeito conhecido — o clube &ldquo;A.F.C. Liverpool&rdquo; aparece
            no lugar do &ldquo;Liverpool F.C.&rdquo; (corrigido nos rankings novos deste ano,
            pendente nos antigos, que não são recomputáveis sem as partidas daquela temporada); (iv){' '}
            <strong>duas escalas convivem</strong> no acervo: os rankings 0-100 normalizados e dois
            rankings históricos em escala BRUTA (&ldquo;Ranking CBF 2023&rdquo;, 2190-2848, e
            &ldquo;Ranking CONMEBOL 2023&rdquo;, 1600-2800), que <strong>não</strong> são
            comparáveis aos 0-100 e ficam identificados pelo próprio nome; (v) dados históricos
            podem conter lacunas e divergências entre fontes.
          </p>
          <p className="mt-2">
            <strong>{'Nota de consistência (2026-09-27)'}:</strong> a versão anterior desta seção
            listava um termo &ldquo;Gols Pró × 0.2&rdquo; e uma sequência de desempate mais extensa
            do que o código implementado. O texto acima agora reflete o código real em produção.
            Regras de agregado cross-division permanecem em fase de desenho e não estão ativas.
          </p>
          <p className="mt-2">
            <strong>Atualização e correções:</strong> última atualização em 11/10/2026. Encontrou um
            erro? Escreva para <strong>endart.studios+contato@gmail.com</strong>.
          </p>
        </section>

        <section id="ranking-jogadores" className="scroll-mt-20">
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            Ranking 0-100 de Jogadores (artilheiros)
          </h2>
          <p>
            <strong>Status:</strong> publicado em 2026-10-12 para o Campeonato Brasileiro Série A de
            2023, <em>rodadas 1 a 11</em> — a única janela em que a fonte publica os autores dos
            gols. São 68 jogadores ranqueados, com pontos entre 0 e 100.
          </p>
          <p className="mt-2">
            <strong>Fórmula:</strong>{' '}
            <span>{'Pontos brutos = Gols × 4 + Assistências × 2 + Vitórias × 1'}</span> — a mesma
            prevista no algoritmo desde a primeira versão.{' '}
            <strong>Na prática só os gols entram</strong>: a fonte não publica assistências nem
            vitórias por jogador, e não inventamos o que não existe (a pontuação bruta efetiva é{' '}
            <code>gols × 4</code>).
          </p>
          <p className="mt-2">
            <strong>Normalização:</strong> MinMax dentro do escopo (competição + temporada), igual à
            do ranking de clubes — o maior pontuador vira 100 e o menor, 0. Empate de pontos brutos
            é desempatado por gols e, depois, por nome (posição determinística).
          </p>
          <p className="mt-2">
            <strong>Base auditável:</strong> cada entrada informa em quantas{' '}
            <em>partidas o jogador marcou</em> — este é o dado que a fonte dá. Não são
            &ldquo;aparições&rdquo; (a fonte não as publica) e o ranking não afirma o contrário.
          </p>
          <p className="mt-2">
            <strong>Identidade do jogador:</strong> o nome impresso pela fonte é casado com o
            cadastro do acervo por <em>igualdade de nome</em> (sem fuzzy) e passa por um filtro de
            plausibilidade — não é goleiro e nasceu a partir de 1980. Nome com mais de um candidato
            plausível <strong>não é ranqueado</strong>: preferimos o vazio ao chute. Um pequeno mapa
            curado cobre os casos em que o acervo usa outro nome (ex.: &ldquo;Gabriel Barbosa&rdquo;
            → &ldquo;Gabigol&rdquo;).
          </p>
          <p className="mt-2">
            <strong>Limitações conhecidas:</strong> (i) cobre apenas o Brasileirão 2023 rodadas 1-11
            — as demais competições do acervo (Premier League, Libertadores, Brasileirão
            2021/2022/2024)
            <strong>não têm autores de gol na fonte</strong>; (ii) gols contra (<code>og</code>) não
            são creditados ao autor; (iii) jogadores que não estão no cadastro do acervo ficam de
            fora (entre eles Flaco López, Raniele, Lelê e John Kennedy) — o gap é declarado, não
            preenchido; (iv) a fonte publica os autores de gol de 102 dos 110 jogos da janela
            (92,7%).
          </p>
          <p className="mt-2">
            <strong>Fonte e atribuição:</strong> autores de gol e placares da{' '}
            <a
              href="https://www.rsssf.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              RSSSF
            </a>
            . <strong>Uso condicionado à atribuição adequada.</strong> Identidade dos jogadores
            conferida no cadastro do acervo (Wikidata, CC0).
          </p>
          <p className="mt-2">
            <strong>Correções:</strong> encontrou um erro? Escreva para{' '}
            <strong>endart.studios+contato@gmail.com</strong> — cada entrada linka o perfil do
            jogador e a partida tem a URL da fonte.
          </p>
        </section>

        <section id="agregado-cross-division-inglaterra" className="scroll-mt-20">
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            Agregado cross-division — Piloto Inglaterra 2022/23 (publicado em 2026-09-27)
          </h2>
          <p>
            <strong>Status:</strong> <strong>publicado</strong> — disponível via API (
            <code>/rankings?scope=country_pyramid</code>). Os rankings por divisão continuam ativos
            e auditáveis.
          </p>
          <p className="mt-2">
            <strong>Fórmula:</strong> aplica um <strong>fator de divisão linear</strong>{' '}
            <code>{'L1=1.00, L2=0.85, L3=0.70, L4=0.55, L5=0.40'}</code> sobre a{' '}
            <em>nota 0-100 intra-divisão</em> já existente e, em seguida, normaliza (MinMax) dentro
            do país/temporada/gênero. A ordem intra-divisão é preservada.
          </p>
          <p className="mt-2">
            <strong>Fonte e atribuição:</strong> derivado das mesmas tabelas finais da RSSSF do
            piloto por divisão (Inglaterra 2022/23). Uso condicionado à atribuição adequada (não é
            domínio público).
          </p>
          <p className="mt-2">
            <strong>Limitações:</strong> é uma{' '}
            <strong>{'estimativa metodológica, não confronto oficial'}</strong> — não representa
            resultados de partidas entre divisões; baseia-se em tabelas finais (não em partidas
            individuais); sem títulos; concentra-se na pirâmide masculina da Inglaterra 2022/23.
          </p>
          <p className="mt-2">
            <strong>Correções:</strong> encontrou um erro? Escreva para{' '}
            <strong>endart.studios+contato@gmail.com</strong>. Versão informativa; as condições de
            uso da fonte prevalecem no idioma original.
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
            provided that proper acknowledgement is given to the author. All rights reserved.&rdquo;
          </p>
          <p className="mt-2">
            <strong>Limitação:</strong> esta seção cobre apenas o piloto do Campeonato Mineiro
            Módulo I para as temporadas 2023, 2024 e 2025. Não representa cobertura completa de
            campeonatos estaduais, municipais ou nacionais do Brasil.
          </p>
        </section>

        <section id="conquistas-estaduais-piloto-go" className="scroll-mt-20">
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            Conquistas estaduais — Piloto Campeonato Goiano (2023–2025)
          </h2>
          <p>
            Os títulos do piloto do Campeonato Goiano 2023–2025 foram obtidos a partir de tabelas
            históricas publicadas pela{' '}
            <a
              href="https://rsssfbrasil.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              RSSSF / RSSSF Brasil
            </a>
            , nas páginas mantidas por <strong>Guillermo Alexander Rivera</strong>.
          </p>
          <p className="mt-2">
            <strong>Fontes:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Campeonato Goiano 2023 —{' '}
              <a
                href="https://rsssfbrasil.com/tablesfq/go2023.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                rsssfbrasil.com/tablesfq/go2023.htm
              </a>
            </li>
            <li>
              Campeonato Goiano 2024 —{' '}
              <a
                href="https://rsssfbrasil.com/tablesfq/go2024.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                rsssfbrasil.com/tablesfq/go2024.htm
              </a>
            </li>
            <li>
              Campeonato Goiano 2025 —{' '}
              <a
                href="https://rsssfbrasil.com/tablesfq/go2025.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                rsssfbrasil.com/tablesfq/go2025.htm
              </a>
            </li>
          </ul>
          <p className="mt-2">
            <strong>Licença/atribuição:</strong> o material da RSSSF é de uso condicionado à
            atribuição adequada ao autor. Conforme as páginas-fonte: &ldquo;(C) Copyright Guillermo
            Alexander Rivera, RSSSF and RSSSF Brazil. You are free to copy this document in whole or
            part provided that proper acknowledgement is given to the author. All rights
            reserved.&rdquo; O uso destes dados exige atribuição adequada{' '}
            <strong>ao autor da página</strong>, não apenas à RSSSF/RSSSF Brasil. (Não é domínio
            público.)
          </p>
          <p className="mt-2">
            <strong>Limitação:</strong> este piloto cobre o Campeonato Goiano{' '}
            <strong>2023, 2024 e 2025</strong> (elite masculina). O campeão de 2025 (Vila Nova
            Futebol Clube / Q1513287) foi vinculado por Wikidata QID, sem vínculo por nome (evitando
            homônimos nacionais). Não representa cobertura completa de campeonatos estaduais,
            municipais ou nacionais do Brasil.
          </p>
          <p className="mt-2">
            <strong>Correções:</strong> encontrou um erro? Escreva para{' '}
            <strong>endart.studios+contato@gmail.com</strong>. Versão informativa; as condições de
            uso da fonte prevalecem no idioma original.
          </p>
        </section>

        <section id="campeonato-paranaense-2025" className="scroll-mt-20">
          <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
            Conquistas estaduais — Piloto Campeonato Paranaense (2025)
          </h2>
          <p>
            Os títulos do piloto do Campeonato Paranaense 2025 foram obtidos a partir de tabelas
            históricas publicadas pela{' '}
            <a
              href="https://rsssfbrasil.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              RSSSF / RSSSF Brasil
            </a>
            , na página mantida por <strong>Moacir Dalpiaz de Souza</strong>.
          </p>
          <p className="mt-2">
            <strong>Fontes:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Campeonato Paranaense 2025 —{' '}
              <a
                href="https://rsssfbrasil.com/tablesfq/pr2025.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                rsssfbrasil.com/tablesfq/pr2025.htm
              </a>
            </li>
          </ul>
          <p className="mt-2">
            <strong>Licença/atribuição:</strong> o material da RSSSF é de uso condicionado à
            atribuição adequada ao autor. Conforme a página-fonte: &ldquo;(C) Copyright Moacir
            Dalpiaz de Souza, RSSSF and RSSSF Brazil 2025. You are free to copy this document in
            whole or part provided that proper acknowledgement is given to the author. All rights
            reserved.&rdquo; O uso destes dados exige atribuição adequada{' '}
            <strong>ao autor da página</strong>, não apenas à RSSSF/RSSSF Brasil. (Não é domínio
            público.)
          </p>
          <p className="mt-2">
            <strong>Limitação:</strong> esta seção cobre exclusivamente a temporada{' '}
            <strong>2025</strong> da elite masculina do Campeonato Paranaense. Não representa
            cobertura completa de todas as divisões, temporadas anteriores ou futuras, nem
            competições femininas ou juvenis. A identidade dos clubes foi resolvida estritamente por
            Wikidata QID (Operário Ferroviário Esporte Clube / Q2580083), para evitar ambiguidades
            homônimas nacionais.
          </p>
          <p className="mt-2">
            <strong>Correções:</strong> encontrou um erro? Escreva para{' '}
            <strong>endart.studios+contato@gmail.com</strong>. Versão informativa; as condições de
            uso da fonte prevalecem no idioma original.
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
              O ranking <strong>0-100</strong> é calculado a partir de <em>partidas individuais</em>
              (RSSSF, com atribuição) e de <em>títulos</em> (grafo de conquistas, Wikidata CC0) para
              o Brasileirão Série A 2021-2024, a Premier League 2023-24/2024-25, a Copa Libertadores
              2023/2024 e o agregado anual de 2021 a 2025, com normalização MinMax isolada por
              escopo e por gênero. Rankings de jogadores/técnicos aguardam estatísticas por partida.
              Não há inteligência artificial operacional na plataforma — quando houver, será marcada
              e documentada com fonte e citação.
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
