# RESEARCH.md — Pesquisa e validações de fonte

> Registro das pesquisas que fundamentaram decisões — cada uma com o método e a evidência que a
> validou (R3: pesquisa sem query não vira decisão).

## Wikidata como fonte primária (T448/T448b-1 — validado ao vivo)

- **Classe de competição de futebol**: `Q1478437` (association football competition) — verificada
  com contagem de instâncias (18.827) e amostra (FA Cup).
- **Classes de COPA** (descobertas pela P31 das mães REAIS do gap, não de memória):
  `Q8463186` national cup · `Q1824674` league cup · `Q34262807` super cup · `Q34542757`
  international clubs cup · `Q123856943` club world championship.
- **Limitação modelada**: parte do gap usa classes genéricas ("sports competition") — fallback por
  rótulo obrigatório (Coppa Italia, Libertadores).
- **Comportamento do endpoint** (medido): label service em query janelada → 504; VALUES em GET
  com URL > ~4k chars → 431 (chunk 200 seguro); classe-pesada 30-60s (timeout 90s + janelas de
  5 anos); grafo VIVO (claims novas entre rodadas — idempotência com skip + update-sem-duplicar).
- **Anomalias de dado**: temporadas cross-year voltam 2× na UNION de P585/P580/P582 (colapso
  "uma edição = um ano", ano inicial); bots pré-atribuem vencedores de edições futuras (guarda
  T448d); "champions league" no nome de liga nacional (VFF) congela hierarquia errada na escrita
  (auditoria R3 pendente → T448b-2).

## RSSSF (planejado — T448b-2/T449)

Domínio público; HTML variável por década/país → parser dedicado é sub-projeto (fatiado do T448
por isso). Antes de codar: mesma FASE 0 de costume (amostra real das páginas-alvo).

## Licenças (auditoria: docs/AUDITORIA_LICENCA_FONTES.md)

| Fonte | Licença | Uso |
|---|---|---|
| Wikidata | CC0 | identidade + conquistas (+ geo T466) |
| RSSSF | domínio público | estaduais/partidas (futuro) |
| FBref/StatsBomb/Transfermarkt | fechada | **PROIBIDAS** sem Operador/contrato |
| Natural Earth (fronteiras, T467) | domínio público | ok |
| OpenStreetMap | ODbL | atenção: compartilhamento obrigatório (verificar no T467) |

## TypeSafe/julgamentos calibrados (instalado, não aplicado)

Skill disponível (`~/.zcode/skills/typesafe-ai`): julgamentos de IA tipados. Candidato futuro:
substituir heurísticas de keyword (resolveHierarchy/resolveGender) por julgamento calibrado —
exige gate de custo/provider ([INTEGRATIONS.md](./INTEGRATIONS.md)) antes de qualquer uso.

## Auditoria jurídica externa (22/09)

Estruturalmente valiosa; cometeu o erro R3 (leu snapshot "dados 1%"). Caso-estudo registrado no
DECISOES: review externo também precisa de query. Roteamento dos 21 achados: T469/T470/T471/T472
+ Operador ([COMPLIANCE.md](./COMPLIANCE.md)).
