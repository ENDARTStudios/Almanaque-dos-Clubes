# FASE 0 — T448b-2b: fonte RSSSF BR (estaduais) → títulos

> **Round:** T448b-2b (parser RSSSF BR estadual). **Modo:** FASE 0 = descoberta/medição.
> **Escrita em produção:** NENHUMA (só GETs de leitura; nenhum INSERT/UPDATE).
> **Data:** 2026-09-23 · **Método:** queries ao vivo contra a fonte (R3 — sem memória).
> **User-Agent:** `AlmanaqueDosClubes/0.1` (identificado).

## 1. Disponibilidade da fonte (medido)

| URL | Resultado |
|---|---|
| `https://rsssf.org/tablesb/` (domínio antigo) | **403 Forbidden** |
| `https://www.rsssfbrasil.com/` | 200 · 18.111 bytes · 130 links |
| `https://rsssfbrasil.com/current.htm` | 200 · 14.410 bytes |
| `https://rsssfbrasil.com/historical.htm` | 200 · 80.829 bytes · 1.126 links |

- **Subpáginas resolvem em `rsssfbrasil.com` SEM `www`** (wrapper com `www` devolveu 404 em uma amostra). O conector deve usar o host sem `www`.
- **CONTRA o note anterior:** a fonte **TEM URL sistemática**, sim — o `current.htm` enumera 85 URLs estaduais sob esquema `tables{ae|fq|sz}/<uf><ano>[sufixo].htm` (**24 UFs** + nacional/regional + copas). O "sem URL canônica" era imprecisão; o difícil é a **variedade de layout de conteúdo**, não o endereço.

## 2. Formato das páginas estaduais (medido)

- **`<pre>` texto puro** (`<table>`=0, `<pre>`=1 — igual ao padrão Inglaterra), **mas**:
  - **NÃO contém `Final Table:`** e **NÃO usa** o layout `N.Clube ...` → **o parser `parseEnglandFinalTables` NÃO se aplica** (confirmado: `FinalTable=-`, `linhasNum=0`).
  - É **resultado jogo-a-jogo** por rodada, ex.: `Maracanã 0-1 Ferroviário`, datas `[Jan 06]`, gols entre colchetes `[Kiuan 81]`, blocos `Round N` / `First Stage`.
- **Campeão é legível de forma determinística** em páginas concluídas:
  - `tablesfq/mg2025.htm` (200, 8.809 bytes): `** ATLÉTICO are Minas Gerais champions of 2025 **`
  - `tablessz/sp2025.htm` (200, 13.556 bytes): "list of champions" (índice de campeões)
  - Núcleo p/ o escopo "só títulos" = **extrair a linha de campeão**, não ranquear a tabela.

## 3. Encoding (defeito crítico, medido)

- O `<meta>` **declara `charset=utf-8`**, mas os bytes **não são UTF-8** → leitura produz mojibake:
  `SǸrie A` (Série), `Cearǭ` (Ceará), `Ferroviǭrio` (Ferroviário), `ATL�TICO` (ATLÉTICO), `Sǜo Paulo` (São Paulo).
- **Consequência:** `normalizeClubName` sobre texto mojibake **falha** o casamento com o acervo.
- **Ação obrigatória no conector:** decodificar como **latin1/cp1252** (ou detectar) e **não confiar** no charset declarado. Sem isso, títulos estaduais não casam.

## 4. Escala e cobertura (medido)

- **Vigentes (2026):** 85 URLs estaduais em `current.htm`; 24 UFs; 3 prefixos (`tablesae` 24 · `tablesfq` 39 · `tablessz` 17 na extração de 80).
- **Histórico:** `historical.htm` indexa ~1.005 páginas `/tablesae|fq|sz/` (dominadas por **nacional** `br<ano>` e copas `cbr<ano>`, além de regionais ne/n/sse).
- **Cobertura NÃO é uniforme:** `tablesae/ce2025.htm` → **404**; `mg2025`/`sp2025` → 200. Nem todo estado/ano existe.
- **Clubes estaduais pequenos** provavelmente ausentes do acervo → casamento nome→QID é o **maior risco de gap residual** (ainda **não medido** — exige query ao banco; ver §7).

## 5. Licença — **BLOQUEIO** (medido em doc interno, não na fonte)

- `docs/AUDITORIA_LICENCA_FONTES.md`: RSSSF = **⚠️ CONTATO NECESSÁRIO** · copyright "(C) … All rights reserved" · "**uso comercial NÃO é explícito**" · status **BLOQUEADO** · contato `karel.rsssf@gmail.com`.
- Correção já registrada (D-2026-09-22-rsssf-atribuicao): RSSSF **não é domínio público** — exige **atribuição**.
- **Tensão em aberto:** o T449a já publicou (Inglaterra) com atribuição; mas ingerir **estaduais em escala** num produto comercial agrava a exposição e depende de decisão do Operador (email de permissão **ou** fallback Wikidata).
- **Fallback:** Wikidata (CC0) cobre títulos estaduais? — **a medir** (P1346/instância de competição estadual). Se cobrir, reduz a dependência do RSSSF.

## 6. Divergências de documentação (drift — corrigir na reconciliação)

Ainda dizem "RSSSF = domínio público", **contradizendo** a decisão corrigida:
- `docs/RESEARCH.md:25` e `:33` · `docs/INTEGRATIONS.md:12` · `docs/CHOOSE_TECH_STACK.md:21`.
(+ `docs/DATA-INGESTION.md:133` cita o domínio antigo `rsssf.org/tablesb` como mudança — correto, mas sem o host novo canônico.)

## 7. Medições que faltam (antes de escrever código de ingestão)

1. **Casamento de clube:** quantos clubes BR existem no acervo; taxa de resolução de nomes estaduais (requer query read-only ao Postgres de produção).
2. **Cobertura do marcador de campeão:** % das páginas estaduais concluídas com a linha `** … champions of YYYY **` (amostra ≥ 20).
3. **Wikidata cobre títulos estaduais?** (CC0, alternativa ao bloqueio RSSSF).
4. **Mães estaduais:** quantas `competitions` estaduais já existem no acervo vs. quantas seriam semeadas.

## 8. Plano proposto (faseado, gated)

- **FASE 0.5 (medição):** itens do §7 (read-only).
- **FASE 1 (parser puro + testes):** `decodeLegacy()` + `extractStateChampion()` (padrão `** X are <State> champions of YYYY **`), Zod, unit tests. **Piloto = 1 UF** (sugestão: MG, por ter marcador confirmado).
- **FASE 2 (mães):** semear `competitions` estaduais (GRUPO-LIGA/`type`, **QID-only, sem fuzzy**, anti-órfão) — padrão `seed-competitions-cups` (T448b-1).
- **FASE 3 (títulos):** `ingest-rsssf-br-state-champions` → arestas **WON** (proveniência `sourceUrl`+`retrievedAt`+atribuição; idempotente; anti-duplicata).
- **Fora de escopo:** partidas, pinos de mapa, ranking por estadual, >1 UF sem arbitragem.

## 9. Arbitragem do Operador (2026-09-23)

1. **Licença:** seguir com **RSSSF mediante atribuição** (como no T449a), registrando o risco — não bloquear.
2. **UF piloto:** **MG (Minas Gerais)** — marcador de campeão já confirmado.
3. **Próximo passo:** autorizada a **FASE 0.5** (medições read-only) + PR docs-only com este relatório.

## 10. FASE 0.5 — resultados (medidos, read-only)

**10.1 Base de clubes do acervo (produção):** **618** clubes `country='BR'` ativos (`deletedAt IS NULL`); nenhum soft-deleted. **74** com acento no nome (relevante p/ casamento).

**10.2 Casamento dos participantes — Campeonato Mineiro 2025, Módulo I** (12 clubes distintos × 618 BR, via `normalizeClubName` replicada fielmente):

| Resultado | Nº | Clubes |
|---|---|---|
| **Exato** | 1 | Cruzeiro |
| **Contenção (correto)** | 5 | América→América Futebol Clube · Atlético→Atlético-MG · Aymorés→Sport Aymorés · Pouso Alegre→Pouso Alegre FC · Villa Nova→Villa Nova Atlético Clube |
| **Contenção FALSO-POSITIVO** | 1 | Athletic → **Athletico Cornélio Procópio (PR)** ⚠️ clubes diferentes |
| **Ausentes do acervo** | 5 | Betim · Democrata · Itabirito · Tombense · Uberlândia |

- **Taxa de casamento correto ≈ 6/12 (50%)**; **5/12 (42%) ausentes**; **1 falso-positivo**.
- **Conclusão dura:** o acervo **não cobre** boa parte dos clubes de estadual. Ingestão de títulos estaduais hoje → **órfãos** (regra anti-órfão manda rejeitar) **ou** falsos-positivos.
- **Confirma a regra "sem fuzzy/contains match":** a contenção gerou o falso-positivo Athletic↔Athletico. Casamento de clube **tem de ser por QID**, não por nome.

**10.3 Cobertura do marcador de campeão (MG, 18 páginas, 1980–2024):** **18/18 = 200**; **16/18 (89%)** com marcador detectável. Sem marcador: 1996, 2014 (fraseado distinto — tratar como gap declarado, não erro).

**10.4 Encoding:** confirmado — `mg2025`/`ce2026` só ficam legíveis decodificando **cp1252** (meta UTF-8 mente).

## 11. Implicações para o escopo (só títulos + mães)

1. **Bloqueio real não é o parser — é a base de clubes.** Sem crescer o acervo (clubes estaduais via Wikidata CC0 / outra fonte), os títulos estaduais ficam majoritariamente **órfãos** (42% só no Módulo I do MG; pior em UFs menores).
2. **Ordem sugerida (revisada):**
   - **FASE 1 (parser puro, sem ingestão):** `decodeLegacy()` (cp1252) + `extractStateChampion()` (16/18 MG) + Zod + unit tests. **Entregável não depende de licença/base.**
   - **FASE 2a (mães):** semear `competitions` estaduais (GRUPO-LIGA, QID-only, anti-órfão) — padrão `seed-competitions-cups`.
   - **FASE 2b (base de clubes, NOVO gate):** medir/expandir clubes de MG via Wikidata (CC0); **sem isso a FASE 3 rende pouco**.
   - **FASE 3 (títulos WON):** só clubes resolvidos por **QID**; resto → fila de revisão (nunca órfão/fuzzy).
3. **Escopo honesto do 1º round executável:** FASE 1 + FASE 2a (mães) + relatório de cobertura. **Títulos em massa dependem de 2b (base).**
