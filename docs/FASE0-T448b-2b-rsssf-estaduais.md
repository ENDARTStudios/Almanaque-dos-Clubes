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

---

## 12. FASE 0.2 — Fechamento dos Gates 5–8

> Addendum docs-only (**zero código/parser/produção**). Fecha as lacunas 5–8 da leitura crítica do Thinker.
> **Correções de fato aplicadas ao rascunho recebido (R3 — medido, não assumido):**
> - Branch do #194 = **`docs/t448b-2b-fase0`** (não existe `feat/t448b-2b-fase0-docs`).
> - URL real da página MG = **`https://rsssfbrasil.com/tablesfq/mg2025.htm`** (o padrão `rsssf.org/tablesb/*` do rascunho dá **403**; medido).
> - **Schema (lido de `schema.prisma`):** `KnowledgeGraph` **não tem** `deletedAt`/`deletionReason` (só `metadata Json?`) e `AuditLog` **não tem** `trace_id`/`reason`/`before/after` (tem `entityType/entityId/action/userId?/changes/metadata`). Os Gates 7–8 abaixo foram reescritos para o schema **real**, sem migration.

### Gate 5 — Chave de Deduplicação Estável

**Definição final (arestas WON estaduais/municipais):**

```
dedupKey = sha256(
    competition.qid + '|' +
    seasonStartYear + '-' + seasonEndYear + '|' +
    championClubQid + '|' +
    sourcePageUrlHash
)
```

- `sourcePageUrlHash` = SHA-256 da URL canônica da página (ex.: `rsssfbrasil.com/tablesfq/mg2025.htm`).
- **Justificativa:** inclui o hash da URL-fonte porque o RSSSF publica correções/repostagens; evita colisão entre temporadas sobrepostas (ex.: 2023–24 atravessando anos civis) e mantém idempotência mesmo se o Wikidata ajustar um QID secundário.
- **MG é single-year:** no Campeonato Mineiro `seasonStartYear == seasonEndYear` (temporada Jan–Abr); o par `start-end` fica genérico para competições cross-year de outros estados.

**Ambiguidade estrutural (múltiplos campeões legítimos na mesma temporada):** cada campeão gera aresta distinta com sufixo `_co{index}` **no campo derivado internamente** (não altera o `championClubQid` original). **Declarado como limitação do piloto** (ver Refinamentos).

### Gate 6 — Mapa de Proveniência e Atribuição Campo-a-Campo

| Campo | Fonte RSSSF | Validação | Exemplo |
|---|---|---|---|
| `metadata.source` | Literal `'rsssf'` | Sempre presente | `'rsssf'` |
| `metadata.scopeTag` | Literal `'br-piloto-mg-2023-2025'` | Sempre presente (recorte do piloto) | `'br-piloto-mg-2023-2025'` |
| `metadata.sourceUrl` | URL exata da página parseada | **HTTP 200 verificado em dry-run** | `https://rsssfbrasil.com/tablesfq/mg2025.htm` |
| `metadata.retrievedAt` | Timestamp ISO-8601 UTC no fetch | Gerado pelo conector | `2026-09-24T14:30:00Z` |
| `metadata.authorCredit` | Autor extraído do bloco de crédito | Regex por layout; ausência → fila | `(C) Copyright Claudio Freati, RSSSF and RSSSF Brazil 2024-2025.` |
| `metadata.licenseText` | Texto **verbatim** da cláusula de uso | Copiado integral; nunca resumido | `You are free to copy this document in whole or part provided that proper acknowledgement is given to the author. All rights reserved.` |
| `externalId` | SHA-256 truncado (16 chars) de `linhaBruta + sourceUrl` | Rastreabilidade reversa à fonte | `a1b2c3d4e5f67890` |

**Regra inegociável:** se `authorCredit` ou `licenseText` estiverem ausentes/incompletos após o parsing, a linha vai para `pending_attribution_review` e **NÃO** vira aresta WON. **Gap declarado > aresta sem atribuição válida.**

> ⚠️ **Sub-fonte com licença própria (medido):** a página do CE credita `Gerson R. Magalhães | foothistory.com | futebolnacional.com.br` — ou seja, **autor + domínios externos**. A licença desses domínios **não foi lida** → tratar como **licença desconhecida** (não assumir CC0/domínio público). Ver Refinamentos.

### Gate 7 — Política de Exclusão e Reversão (Soft-Delete Apenas)

- **Nenhum hard delete** em nenhuma circunstância neste round.
- **`knowledge_graph` não tem coluna de soft-delete** → o recorte é **lógico, em `metadata` (JSONB)**, sem migration:
  `metadata.deletedAt = <ISO-8601>` + `metadata.deletionReason ∈ {'attribution_missing','duplicate_detected','source_correction'}`.
- **Filtro default:** endpoints/views de conhecimento **devem** filtrar `metadata->>'deletedAt' IS NULL` (ajuste de repository na FASE 3; precedente de soft-delete = `clubs.deletedAt` do T449EN/#186).
- **Merge de entidades duplicadas:** só em script administrativo **separado** (fora deste round); aqui, apenas soft-delete individual.
- **Auditoria:** toda exclusão registra em `audit_logs` com os campos **existentes**: `entityType='KnowledgeGraph'`, `entityId=<id>`, `action='delete'`, `userId=NULL` (sistema), `changes={metadata:{old,new}}` (snapshot minimizado), `metadata={reason, traceId}`.

### Gate 8 — Rollback Preliminar Documentado

Procedimento (executável manual; script futuro). **Sem migration → rollback puramente lógico/dado.**

1. **Identificar escopo:**
   ```sql
   SELECT id FROM knowledge_graph
   WHERE relation='WON'
     AND metadata->>'source'='rsssf'
     AND metadata->>'scopeTag'='br-piloto-mg-2023-2025'
     AND metadata->>'deletedAt' IS NULL;
   ```
2. **Backup lógico prévio:** dump versionado das linhas afetadas (`backup_rsssf_br_piloto_YYYYMMDD.sql.gz`), via `COPY (…) TO STDOUT` com o mesmo `WHERE`.
3. **Execução reversível (preferida):**
   ```sql
   UPDATE knowledge_graph
   SET metadata = metadata || jsonb_build_object(
         'deletedAt', to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
         'deletionReason', 'rollback_manual')
   WHERE relation='WON'
     AND metadata->>'source'='rsssf'
     AND metadata->>'scopeTag'='br-piloto-mg-2023-2025';
   ```
   *Alternativa destrutiva* (`DELETE …`) **só** com backup confirmado por hash/contagem.
4. **Verificação pós-rollback:** contagem ativa volta ao baseline pré-ingestão; spot-check de 5 arestas confirma ausência nas views públicas (que filtram `metadata->>'deletedAt' IS NULL`).
5. **Limpeza de cache:** `DEL` exato das chaves `champions`/galeria/metodologia relacionadas.
6. **Auditoria:** um `audit_logs` (`action='delete'`) por aresta afetada, com `metadata.traceId` do rollback.

### Refinamentos Solicitados pelo Thinker

#### (a) Validação de Atribuição por Página (FASE 1)

**Layouts medidos (≥2 distintos):**

| Layout | Exemplo | Crédito observado | Regex/heurística |
|---|---|---|---|
| **A — autor único inline** | MG (`mg2025`) | `Prepared and maintained by Claudio Freati for the … RSSSF Brazil` + `(C) Copyright Claudio Freati, RSSSF and RSSSF Brazil 2024-2025.` | `/(?:Prepared and maintained by|maintained by)\s+(.+?)\s+for the Rec\.Sport\.Soccer/` → `authorCredit` · `/(\(C\) Copyright[^\n]+)/` → `licenseText` |
| **B — autor + domínios externos** | CE (`ce2026`) | `Prepared and maintained by Gerson R. Magalhães \| foothistory.com \| futebolnacional.com.br for the …` | captura autor **e** `externalSubSources:[…]`; licença dos domínios **desconhecida** → fila |
| **C — crédito não capturado por A/B** | SP (`sp2025`) | (regex A não casou na amostra) | **sem match ⇒ `pending_attribution_review`** |

**Regra:** `authorCredit` **e** `licenseText` obrigatórios; se **um** faltar, **ou** houver `externalSubSources`, a linha **não** vira aresta WON e vai para `pending_attribution_review`. **Fallback seguro obrigatório** para qualquer layout novo/não reconhecido (nunca publicar sem atribuição).

#### (b) Suficiência da dedup key p/ co-campeões / fases independentes

- **Amostra MG 1985–2024:** **um único campeão por temporada** — **nenhum caso de co-campeão** observado. Não há exemplo concreto no histórico mineiro para exercitar o sufixo `_co{index}`.
- **Consequência:** o sufixo `_co{index}` permanece como **regra precautória**, porém **não validada por caso real** → registrado como **limitação do piloto**. Se um co-campeão surgir (MG 2023–2025 ou outra UF na FASE 1), o comportamento deve ser reavaliado **antes** de gravar (não inventar precedente).
- **Fases independentes** (ex.: Taça/Módulo separado) só entram no escopo se declaradas como **competições distintas** (QID próprio); não são tratadas como co-campeões.

#### (c) Família do marcador de campeão (correção da afirmação anterior de "regex único")

Medido em MG: o marcador é uma **família de frases**, não um padrão único. Variantes reais:
`****** ATLÉTICO are Minas Gerais 1985 champions ******` · `** … are Minas Gerais 1990 champions **` · `** … are 2015 Minas Gerais' champions **` · `** … are Minas Gerais' unveaten champions **` (sic) · `** … are Minas Gerais's champions of 2021 **` · `** … are Minas Gerais 1st Level champions of 2024 **` · fallback de tabela `1.<Clube> … Champions`.
→ a FASE 1 implementa uma **família de regex** (asteriscos variáveis, `1st Level` opcional, possessivo `'`/`'s`, ordem `champions of YYYY`/`YYYY champions`) + fallback de linha de tabela; linhas fora da família → fila de revisão.
