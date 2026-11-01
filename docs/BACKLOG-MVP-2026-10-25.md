# Backlog MVP — mapeamento contra o acervo (2026-10-25)

O backlog externo (épicos DQ/DATA/MATCH/FAN/GLOB/LAUNCH) mapeado contra o que o
acervo JÁ tem. MVP: Brasileirão Série A, Premier League e Libertadores.

Regra da leitura: **FEITO** = existe e está em produção; **PARCIAL** = base existe,
falta o recorte do ticket; **GAP** = não existe. Issues abertas só para GAP/PARCIAL.

## Épico 1 — Confiança e qualidade dos dados

| ID | Estado | Realidade no acervo | Ação restante |
|---|---|---|---|
| DQ-01 | GAP | Não há matriz de cobertura por competição×temporada×tipo. | Issue: relatório (CLI/API) de cobertura — `matches` por competição/temporada, rankings, fonte (`importedFrom`/`sourceUrl`) e `updatedAt`. |
| DQ-02 | PARCIAL com defeito EM PRODUÇÃO | Evidência colhida (ver issue): "Major League Soccer 2011/2012" como título "nacional" do Real Madrid — causa raiz: item Wikidata do *World Football Challenge* (amistoso) resolvido para a competição-pai errada; e "Copa de la Queens" (rótulo vandalizado no Wikidata para a Copa de la Liga 1985) exibido sem validação. | Issue com evidência + correção + teste de regressão. |
| DQ-03 | FEITO em grande parte | `dedupKey` estável em `matches` (competição\|temporada\|dataISO\|mandante\|visitante), QID único por entidade, `importedFrom`/`sourceUrl`/`license` por linha, homônimos por QID (nunca por nome). | Residual: tabela de correspondência para IDs externos (football-data/thesportsdb) quando a fonte ao vivo for aprovada — entra junto com MATCH-04. |
| DQ-04 | PARCIAL | `integrity-check` semanal (READ-ONLY): QID ausente/duplicado, WON sem proveniência, points fora de 0-100. | Issue: validar placares/datas de partidas e identidades ambíguas + fila de revisão HUMANA (não existe). |
| DQ-05 | PARCIAL | `SourceNote` (fonte abaixo do dado, regra do Operador), `sourceUrl` em títulos/arestas/partidas. | Issue: exibir "última atualização + cobertura" nas páginas de partida/rankings; dados parciais declarados (a matriz do DQ-01 alimenta isto). |

## Épico 2 — Dados e atualização

| ID | Estado | Realidade | Ação restante |
|---|---|---|---|
| DATA-01 | PARCIAL | Fontes de fato em uso: Wikidata (licença CC0), RSSSF (uso livre com crédito), Commons (por arquivo). Nenhuma decisão DOCUMENTADA por competição-piloto. | Issue: documento de decisão de fontes/direitos por competição (Série A, PL, Libertadores), incluindo a porta do MATCH-04 (placar ao vivo). |
| DATA-02 | PARCIAL | Ingestão existe e é idempotente (17.265 partidas: BR 15-24, PL 15-25, LIB 15-24 etc.); `dedupKey` impede duplicata; sem correspondência = não publica por aproximação (padrão T522 de identidade). | Issue: fechar as lacunas documentadas dos recortes do piloto (a matriz do DQ-01 dirige o trabalho). |
| DATA-03 | PARCIAL | `data-refresh` scheduler + `job-health-persist` + `alerts.yml` (falha de cron alerta). | Issue: sinal de FRESHNESS por competição (dados mais velhos que o acordo → sinalizar), hoje o health é por job, não por recorte. |
| DATA-04 | P1 GAP | Sem doc de API/modelo. | Issue (P1): documentação de entidades, paginação, cobertura e limitações. |

## Épico 3 — Central de partidas

| ID | Estado | Realidade | Ação restante |
|---|---|---|---|
| MATCH-01 | PARCIAL | `/matches` existe (T541) com filtro por competição e janela de data, escalação/escudos/placar. | Issue: estado da partida visível + fuso do usuário + guia por competição/temporada (o filtro existe na query, falta a navegação por calendário). |
| MATCH-02 | GAP | NÃO há página individual de partida (`/matches/[id]` não existe; só a listagem). | Issue: página da partida com fonte, última atualização e campos ausentes declarados. |
| MATCH-03 | FEITO em grande parte | Rankings por temporada (70 rankings), tabela histórica de pontos corridos (T591), competição → temporada explícitos na UI. | Verificação pontual no piloto junto com DQ-01 (sem issue própria). |
| MATCH-04 | GAP condicional | Sem fonte licenciada de ao vivo — a DEPENDÊNCIA declarada no backlog. | Issue: decisão/bloqueio documentado; MVP lança calendário+resultados sem fingir ao vivo. |

## Épico 4 — Personalização

| ID | Estado | Realidade |
|---|---|---|
| FAN-01 | FEITO | Favoritos (clubes/jogadores/competições) + Time do Coração, persistidos, com feed de conquistas e WS. Nada a fazer. |
| FAN-02 | PARCIAL | Notificações existem para novos títulos dos favoritos (WS-C-8). Alertas de PARTIDA (início/gol) dependem do MATCH-04 (fonte ao vivo). | 
| FAN-03 | PARCIAL | Meu Almanaque integrado (T597) já prioriza o acervo seguido; homepage pública personalizada é P1 e depende de LAUNCH-01 (consentimento). |

## Épico 5 — Internacional

| ID | Estado | Realidade |
|---|---|---|
| GLOB-01 | QUASE FEITO | i18n pt/en/es em toda a UI; busca por rótulos; alias de competição (T035). Residual: aliases de clube por transliteração — revisar cobertura no piloto. |
| GLOB-02 | QUASE FEITO | Auditorias WCAG recorrentes; fuso local é o do navegador (verificar nos cartões de partida). |
| GLOB-03 | PARCIAL | Sitemap e metadados existem (WS-C-3); estender para partidas quando MATCH-02 existir. |

## Épico 6 — Beta

| ID | Estado | Ação |
|---|---|---|
| LAUNCH-01 | PARCIAL | `UserActivity` PREPARADO mas DESATIVADO até WS-L (cookies). Issue: ativar com consentimento + painel admin (admin/metricas já existe). |
| LAUNCH-02 | Processo | Issue: roteiro do beta (recrutamento, registro de problemas, correção ou decisão explícita). |
| LAUNCH-03 | Processo | Issue: porta de saída = matriz DQ-01 sem divergência crítica + freshness no acordo. |
| LAUNCH-04 | P1 | Decisão posterior ao beta. |

## Observação sobre a origem do backlog

O texto original termina pedindo um "link do editor do Replit" — não se aplica:
o código-fonte é este repositório Git (monorepo pnpm: `apps/api`, `apps/web`,
`apps/worker`), e a execução é feita por aqui (PRs → CI → deploy Railway/Vercel).
