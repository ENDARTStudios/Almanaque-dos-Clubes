# T450 Wave 3 — Matriz de fontes (futebol feminino brasileiro)

> Despacho: após a descoberta estrutural da wave 2 (Wikidata não cobre clubes BR
> femininos — ligas P118 são stubs), o Operador aprovou fontes abertas
> alternativas. Esta matriz registra o levantamento read-only (10-08) que
> antecede o connector `wikipedia-women-br` e o script
> `seed-brazilian-women-football-v2.ts`.
>
> Critério de corte: fonte com risco de ToS ou sem dados estruturados
> confiáveis = DESCARTADA. Prioridade: maior cobertura + menor risco jurídico.

## Matriz

| Fonte                                    | URL                                                                                                           | Licença/ToS                                                                                                                                                                 | Cobertura estimada                                                                                                                                                                   | Método de acesso                                                                                        | Veredito                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Wikipedia PT — categorias                | `https://pt.wikipedia.org/wiki/Categoria:Clubes_de_futebol_feminino_do_Brasil` + subcats (CE, SP, MS, MG)     | Texto CC BY-SA 4.0; fatos (nomes, cidades) não são protegidos; atribuição via `sourceUrl`; `robots.txt` NÃO bloqueia `/w/api.php` para `User-agent: *` (só `Special:` etc.) | 44 artigos na raiz + 23 em subcategorias ≈ **66 clubes** com nome canônico e estado (nas subcats)                                                                                    | MediaWiki API `list=categorymembers` (ns=0, paginado)                                                   | ✅ **APROVADA** — fonte primária de identidade                                                                                   |
| Wikipedia PT — tabelas de temporada 2026 | `Campeonato Brasileiro de Futebol Feminino de 2026` (A1, 18 clubes), `… - Série A2` (16), `… - Série A3` (32) | idem                                                                                                                                                                        | **~66 participantes** (com sobreposição) com cidade (A1) + UF (`{{BR-XX}}`) + template `{{Futebol …}}` resolvido ao artigo canônico; vínculo clube↔competição (Série A1/A2/A3)       | `action=parse&prop=wikitext` + parser de tabela + resolução de predefinições (`Predefinição:Futebol X`) | ✅ **APROVADA** — fonte primária de city/state e vínculos de competição                                                          |
| Wikidata (re-check)                      | WDQS `?item wdt:P31/wdt:P279* wd:Q28140340 ; wdt:P17 wd:Q155`                                                 | CC0                                                                                                                                                                         | **16 clubes BR femininos com QID** (populou desde a wave 2: CEPE-Caxias Q2931266, Iranduba Q5399104, Moreninhas Q4810210, Vitória das Tabocas Q4810192…); P571/P625 quando existirem | SPARQL (1 requisição; falha tolerada — segue sem WD)                                                    | ✅ **APROVADA** — QIDs p/ dedup + founded/coords quando houver                                                                   |
| CBF (federação)                          | `https://www.cbf.com.br`                                                                                      | `robots.txt` INEXISTENTE (retorna SPA Next.js); sem API pública documentada; dados de clubes renderizados client-side                                                       | Tabelas por competição existem mas exigem scraping de SPA JS                                                                                                                         | —                                                                                                       | ❌ **DESCARTADA** — sem dados estruturados em página estável + extração exigiria scraping agressivo de SPA (risco ToS, Escopo 1) |
| TheSportsDB                              | `https://www.thesportsdb.com/api/v1/json/3/...`                                                               | Chave gratuita `3` é para desenvolvimento; **uso comercial exige plano pago** — o projeto tem M3 monetizado (Stripe live) → incompatível                                    | Sondagem: `searchteams.php?t=Corinthians feminino` → **0 resultados**; `t=Kindermann` → "Avaí Women" com liga `_No League Soccer` (sem estrutura)                                    | REST v1                                                                                                 | ❌ **DESCARTADA** — cobertura marginal E licença incompatível com produto monetizado                                             |
| Wikimedia Commons                        | `https://commons.wikimedia.org`                                                                               | Mídia variável (CC0/CC BY/PD, por ficheiro)                                                                                                                                 | Escudos de clubes BR femininos (parcial)                                                                                                                                             | —                                                                                                       | ⏸️ **NÃO USADA nesta onda** — o despacho a reserva para assets (escudos), não dados cadastrais; backlogged para onda de mídia    |

## Decisões de desenho derivadas da matriz

1. **Fontes processadas**: apenas `wikipedia-pt` e `wikidata` (allowlist no
   connector — guard de ToS: fonte fora da allowlist NUNCA é buscada; teste
   unitário prova que `cbf-public`/`thesportsdb` não geram fetch).
2. **Identidade/dedup**: QID quando houver (WD), senão `slug(name+UF)`. O sufixo
   `(futebol feminino)` do título faz parte do slug — time feminino de clube
   homônimo NUNCA colide com o clube masculino do acervo. Se o nome resolvido
   colidir com clube existente (qualquer gênero) após remover o sufixo, o seed
   aplica o sufixo (convenção da própria Wikipedia) em vez de pular/engolir.
3. **Zero overwrite**: match por QID ou slug → `skip_existing`; nada de clube
   existente é alterado.
4. **Vínculos de competição**: aresta `PARTICIPATED_IN` (clube→competição,
   metadata `{season, gender:'women', wave:3}`) — relação nova e inerte (nada a
   consome hoje; rankings NÃO são tocados). Competições Série A1/A2/A3
   (feminino) são find-or-create por slug+país+gênero, level 1/2/3.
5. **Gaps declarados**: `foundedYear`/coords só entram via Wikidata (16 QIDs);
   clubes só-Wikipedia nascem sem os dois. Campeonatos estaduais femininos
   (Paulista/Carioca/etc.) ficam para onda futura — os artigos os citam, mas
   parsear todos é escopo extra sem necessidade de gate.
6. **Rate limit**: 1 req/s entre chamadas HTTP + backoff exponencial em
   429/5xx (3 tentativas) + User-Agent identificado.

## Proveniência obrigatória (todo registro criado)

- `importedFrom`: `'wikipedia-pt'` | `'wikidata'` (fonte da identidade;
  `metadata.crossSource` registra contribuições da outra).
- `sourceUrl`: URL do artigo/categoria/item de origem.
- `metadata`: `{ gender: 'women', wave: 3, ... }`.

## DECISÃO 10-07 (revisada pelo Operador) — ORDEM DE FONTES

1. **Wikidata** — fonte PADRÃO (primária). Sempre consultada primeiro.
2. **Wikipedia REGIONAL** — segunda fonte quando o Wikidata for insuficiente.
   Regra de regionalidade: usar a Wikipedia do idioma/país do clube
   (pt.wikipedia para BR/PT, en.wikipedia para EN/US/IE/AU, es.wikipedia para
   LatAm/ES, de.wikipedia para DE/AT/CH, etc.) — dados mais coesos e precisos
   para times globais.
3. **Outras fontes verificáveis** — site oficial do clube, sites regionais,
   federações (scraping autorizado; proveniência por registro obrigatória:
   sourceUrl + fonte + method).

NUNCA se limitar a uma única fonte; o acervo é multi-fonte por construção e
cada registro carrega sua proveniência. Zero-overwrite mantido: fontes
seguintes só preenchem o que as anteriores deixaram vazio.
