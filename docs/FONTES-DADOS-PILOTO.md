# FONTES-DADOS-PILOTO — decisão de fontes e direitos (DATA-01)

> Issue: [#757](https://github.com/ENDARTStudios/Almanaque-dos-Clubes/issues/757).
> Escopo do MVP: **Campeonato Brasileiro Série A (Q206813)**, **Premier League
> (Q9448)** e **Copa Libertadores (Q184795)**. Decisão registrada em 2026-10-25,
> com base na matriz de cobertura real (`GET /coverage?pilot=1`, DQ-01/#754).

## 1. Fontes por tipo de dado (o que já opera no acervo)

| Tipo de dado | Fonte | Licença / uso | Atribuição exigida | Onde está no código |
|---|---|---|---|---|
| Edições, vencedores, elencos, escudos (P18) | **Wikidata** | CC0 (domínio público) | Não exigida (reconhecimento bem-vindo) | `ingest-won-edges-wikidata`, bots de mídia (T502/T519/T593/T596) |
| Resultados e tabelas históricas | **RSSSF** | Uso livre **com crédito** | "Source: RSSSF" + crédito ao compilador (o acervo grava `importedFrom='rsssf'` + `sourceUrl` por linha) | ingestões T519/T527/T538/T549 |
| Mídia (escudos, bandeiras, fotos) | **Wikimedia Commons** | Licença por arquivo, lida e gravada (NC/ND recusados) | Conforme o arquivo (`attribution` em `club_crests`) | `harvest-flags`, `enrich-club-crests*`, `enrich-*-media` |
| Dados complementares (fase de avaliação) | **TheSportsDB** | Conector existe; **uso NÃO aprovado para produção** até a licença/redistribuição ser confirmada | — | `apps/worker/src/jobs/thesportsdb-connector.ts` |

## 2. Cobertura assumida no MVP (medida, não prometida)

Da matriz de cobertura de 2026-10-25 (recortes com placar / total):

- **Brasileirão Série A**: 2015–2024 — **completa** (380/380 por ano; 2020 = 268,
  temporada COVID; 2016 = 379). Fonte: RSSSF. Atualizada em 2026-10-12/13.
- **Premier League**: 2021–2025 — **completa** (361–412 por ano). Fonte: RSSSF.
- **Libertadores**: 2020–2024 — **completa** (76–97 por ano). Fonte: RSSSF.

As lacunas conhecidas fora desses recortes ficam declaradas na matriz — o
produto NUNCA apresenta cobertura parcial como completa (DQ-05).

## 3. Frequência de atualização (DATA-03)

- **Modo atual: batch por ingestão** (sem atualização contínua durante partidas).
  Execuções registradas por job (`job-health-persist`); falha de cron alerta
  (`alerts.yml`).
- **Acordo de frescor**: recorte com `updatedAt` mais velho que **45 dias**
  (`FRESHNESS_SLA_DAYS`) é sinalizado `stale` na matriz de cobertura — é o
  gatilho para a equipe rodar ingestão, não um erro automático.
- Partidas futuras (SCHEDULED) entram na mesma ingestão quando a fonte publica
  a tabela de datas; a página de partidas mostra o estado real do dado
  (`matches.status`), nunca cache velho como se fosse atual.

## 4. Redistribuição

- Wikidata/Commons: redistribuição livre (CC0 / licenças livres verificadas).
- RSSSF: o acervo **não republica o dump da fonte** — expõe os dados
  estruturados com atribuição por linha (`sourceUrl` aponta para o documento
  original). Isso é a postura conservadora correta enquanto não houver acordo
  expresso de redistribuição em massa.
- Qualquer nova fonte com restrição de redistribuição entra SOMENTE após
  decisão registrada aqui.

## 5. Placar ao vivo (gate do MATCH-04, issue #762)

**BLOQUEADO até** uma fonte com (a) direito de uso confirmado para exibição em
tempo quase real, (b) contrato de frequência e rate limit compatível, e (c)
atribuição acordada. Candidatos a avaliar: TheSportsDB (licença pendente),
football-data.org (tier gratuito tem restrições), provedores pagos (custo —
decisão do Operador). Enquanto o gate não abrir, o MVP lança **calendário e
resultados**, e as rotas/páginas não exibem nada "ao vivo" que não venha de
fonte confirmada. Decisão técnica de integração (fallback, cache curto, estado
da partida por `matches.status`) fica registrada no issue #762 quando aprovada.

## 6. O que muda esta decisão

Mudança de fonte, de frequência ou de escopo de redistribuição = nova entrada
neste documento com data e motivo (mesmo protocolo do `DECISOES.md`).
