# Conceito FICHA × site entregue — mapa de telas

> **Conceito:** design/concept (18 quadros, capturas em design/concept/app/*.png).
> **Entregue:** https://almanaquedosclubes.com/.
>
> A regra desta migração: **o conceito manda na composição; o dado real manda no conteúdo.** Onde o
> desenho usa número ilustrativo, a tela usa o dado da API ou uma **lacuna declarada** — nunca um
> número inventado para "ficar igual ao PNG". A explicação de cada adaptação está abaixo.

## 1. O diagnóstico que originou esta rodada

O sistema FICHA existia nos tokens e nos componentes, e a home já estava no conceito — mas as
**páginas de dado** continuavam com composições anteriores: cabeçalho sem âncora formatada, filtros
em select, fichas em cartões genéricos, nenhuma tabela densa. O Operador comparou o conceito com o
site e a diferença era de **composição de tela**, não de cor/fonte.

## 2. Telas nesta entrega

| Tela          | Quadro do conceito    | Estado                     | Adaptação honesta (desenho → dado real)                                                                                                                                                                                                               |
| ------------- | --------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| /             | app/home.png          | entregue (rodada anterior) | 5 totais reais; "Lendas" sem contador (a API não publica); pódio/troféu com o dado do acervo                                                                                                                                                          |
| /competitions | app/competicoes.png   | **entregue**               | chips de país/tipo/gênero; 4 destaques com troféu na cor do alcance; pódio real da última Copa (campeão e vice; **3º não registrado = lacuna**); índice com 3 colunas — edições/última edição não existem no endpoint de lista                        |
| /rankings     | app/rankings.png      | **entregue**               | colunas Var./Últ. 5 não existem em /rankings/entries → Títulos (baseTitles) e Base auditável (baseMatches); pesos do desenho (3·2·1) → régua publicada do acervo                                                                                      |
| /legends      | app/lendas.png        | **entregue**               | única superfície escura; 5 métricas reais; lista densa de líderes e cartões de campeões; gráfico de títulos por clube (Bars). **Sem** "maiores jogadores" nem gráficos de carreira/público: o payload não publica isso                                |
| /clubs/[id]   | app/clube-migrado.png | **entregue**               | identidade+escudo/licença, 4 pilares, sobre+fonte, estatística por competição, rivais, parede de honrarias, elenco, uniformes, flâmulas, hino (só quando há dado), procedência. Jogos/gols por jogador não existem na API → colunas omitidas com nota |

**Sistema (global, vale para todas as telas):**

- FichaHead: título 68 px, âncora 76 px, subtítulo 15 px (escala do quadro); o número-âncora é
  sempre formatado no idioma e rotulado. "0" nunca vira manchete.
- SectionHeading: 12,5 px sem caixa alta/tracking (o "kicker" do conceito, como cabeçalho real).
- Navbar: fio de 2 px carmim sob o item ativo; **em /legends a topbar inteira vira escura** com o
  logo de fundo escuro (a página escura não começa embaixo de uma barra clara).
- Trophy aceita a cor do degrau (--color-tier-*) — o troféu diz o alcance sem legenda.
- /legends tem layout de segmento escuro, então loading/error também nascem escuros.

## 3. Telas ainda fora do conceito

Ainda com a composição anterior, na fila de migração (mesmo ciclo: conceito → dado real → teste →
screenshot):

/map, /search, /players/[id], /temporadas, /temporadas/[id], /estadios, /estadios/[id], /matches,
/compare, /rankings/[id], /competitions/[id], /dashboard, /admin, /metodologia, 404 e páginas
legais/sobre.

O conceito também tem quadros de **sistema** (fundamentos, interacao) que são documentação de
design, não rotas.

## 4. Verificação desta entrega

    pnpm --filter web typecheck        # 0
    pnpm --filter web test             # 388 testes / 49 arquivos
    pnpm --filter web build            # OK
    pnpm run ui:audit:ci               # 0 bloqueios
    pnpm run ficha:check               # 0 (13/13 componentes em uso e testados)

Screenshots de verificação em 1440 e 390; auditoria run.mjs audit sem overflow horizontal; os
números de contraste das telas novas estão nos testes dos componentes e no run.mjs contrast da
home.

## 5. Regra para a próxima tela

1. **Ler o quadro** (read_image) e o gerador em design/concept/ficha*.py.
2. **Mapear bloco → dado real** antes de desenhar; se o dado não existe, declarar a lacuna.
3. Extrair componentes testáveis; testar; plugar.
4. Rodar os portões e **olhar** screenshot em 1440 e 390.
5. Registrar a adaptação neste arquivo (o que entrou e o que ficou de fora, com o motivo).
