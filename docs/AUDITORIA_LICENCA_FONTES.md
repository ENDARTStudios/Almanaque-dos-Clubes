# Auditoria de Licença — Fontes de Dados
**Projeto:** Almanaque dos Clubes  
**Data:** 2026-08-14  
**Versão:** 1.0  
**Conclusão:** GO para 4 de 6 fontes; 2 precisam de contato direto com o detentor

---

## Resultados por fonte

### Wikidata — ✅ GO
| Campo | Valor |
|---|---|
| Licença | **CC0** (Creative Commons Zero — domínio público) |
| Uso comercial | Liberado sem restrições |
| Atribuição | Não obrigatória (recomendada) |
| Scraping/API | SPARQL endpoint público, sem rate limit documentado |
| Risco legal | **Nenhum** |
| Fonte canônica (QID) | Sim — ideal para entity resolution |

### TheSportsDB — ✅ GO (com restrição)
| Campo | Valor |
|---|---|
| Licença | Free tier: uso **não-comercial**. Patreon $9/mês: **comercial** |
| Uso comercial | Requer plano pago ($9/mês) |
| Atribuição | Recomendada |
| Rate limit | 30 req/min (free), 60 req/min (Patreon) |
| Risco legal | **Baixo** — licenciamento explícito, custo irrisório |
| Cobertura | 617 ligas de futebol |

### Football-Data.org — ✅ GO (com restrição)
| Campo | Valor |
|---|---|
| Licença | Free tier: 10 req/min. Uso comercial em planos pagos |
| Uso comercial | Planos pagos a partir de €12/mês |
| Rate limit | 10 req/min (free) |
| Risco legal | **Baixo** — API oficial com termos claros |
| Cobertura | Ligas europeias principais (Premier League, La Liga, Bundesliga, etc.) |

### OpenStreetMap — ✅ GO
| Campo | Valor |
|---|---|
| Licença | **ODbL** (Open Database License) |
| Uso comercial | Permitido com atribuição |
| Atribuição | Obrigatória: "© OpenStreetMap contributors" |
| Rate limit | Overpass API: uso justo (sem hard limit, mas recomenda-se caching) |
| Risco legal | **Nenhum** |

### Wikimedia Commons — ✅ GO (com restrição por arquivo)
| Campo | Valor |
|---|---|
| Licença | Varia por arquivo (CC-BY, CC-BY-SA, domínio público, etc.) |
| Uso comercial | Depende da licença individual do arquivo |
| Atribuição | Obrigatória conforme licença específica |
| Risco legal | **Baixo** — desde que respeite a licença de cada imagem |

### RSSSF — ⚠️ CONTATO NECESSÁRIO
| Campo | Valor |
|---|---|
| Copyright | "(C) Copyright RSSSF 1999/2026. All rights reserved." |
| Permissão | "You are free to copy this document in whole or part provided that proper acknowledgement is given to the RSSSF." |
| Uso comercial | **NÃO** é explícito. Charter diz "não é o objetivo da RSSSF obter lucro" |
| Risco legal | **Médio-Alto** — copyright explícito, uso comercial ambíguo |
| Contato | `karel.rsssf@gmail.com` — enviar pedido de permissão |

### FBref / Sports Reference — ⚠️ CONTATO NECESSÁRIO
| Campo | Valor |
|---|---|
| Termos de Uso | Permite reuso de dados individuais, inclusive comercial, COM atribuição |
| Scraping | **PROIBIDO** — "Please do not attempt to aggressively spider data" |
| Uso comercial | Permitido em teoria, mas proibido na prática (sem scraping) |
| Risco legal | **Alto** — contradição entre permissão de uso e proibição de coleta |
| Contato | Formulário em sports-reference.com — solicitar API/licenciamento |

---

## Matriz de decisão

| Fonte | GO? | Uso imediato | Ação necessária |
|---|---|---|---|
| **Wikidata** | ✅ | Principal (QID canônico) | Nenhuma |
| **TheSportsDB** | ✅ | Complemento (elencos, imagens) | Plano Patreon $9/mês antes do lançamento |
| **Football-Data.org** | ✅ | Premier League (matches, tabelas) | Plano pago antes de escala |
| **OpenStreetMap** | ✅ | Estádios (geolocalização) | Incluir atribuição no footer |
| **Wikimedia Commons** | ✅ | Imagens (escudos, fotos) | Exibir licença por imagem |
| **RSSSF** | ⚠️ | Bloqueado | Enviar email solicitando permissão |
| **FBref** | ⚠️ | Bloqueado | Contatar Sports Reference para API/licenciamento |

---

## Estratégia de dados por liga

### Brasileirão Série A
| Entidade | Fonte primária | Fonte secundária |
|---|---|---|
| Clubes | Wikidata SPARQL | TheSportsDB |
| Jogadores | Wikidata SPARQL | TheSportsDB |
| Competições | Wikidata SPARQL | — |
| Estádios | Wikidata + OpenStreetMap | — |
| Imagens | Wikimedia Commons | — |
| Histórico títulos | ⚠️ Wikidata (limitado) | RSSSF (se aprovado) |

### Premier League
| Entidade | Fonte primária | Fonte secundária |
|---|---|---|
| Clubes | Wikidata SPARQL | Football-Data.org |
| Jogadores | Wikidata SPARQL | Football-Data.org |
| Competições | Wikidata SPARQL | Football-Data.org |
| Partidas/Tabela | Football-Data.org | — |
| Estádios | Wikidata + OpenStreetMap | — |
| Imagens | Wikimedia Commons | — |

---

## Recomendações

1. **Imediato:** Prosseguir com Wikidata + TheSportsDB + OpenStreetMap (todas GO)
2. **Esta semana:** Operador enviar email para RSSSF (`karel.rsssf@gmail.com`) solicitando permissão de uso comercial com atribuição
3. **Esta semana:** Operador preencher formulário de contato do Sports Reference solicitando termos de licenciamento
4. **Antes do lançamento:** Assinar TheSportsDB Patreon ($9/mês) + Football-Data.org plano pago se necessário
5. **Fallback:** Se RSSSF e FBref negarem, Wikidata cobre ~70% das necessidades de dados históricos
