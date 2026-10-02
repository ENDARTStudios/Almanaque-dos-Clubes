# T448b-2d — Bloqueio do piloto PR + Discovery read-only GO

> **Escopo:** registro de bloqueio do PR e **discovery read-only** de GO. **Nenhum parser, nenhum seed, nenhuma escrita, nenhuma produção, nenhuma migration.**
> **Data:** 2026-09-24 · **User-Agent:** `AlmanaqueDosClubes-Discovery/1.0 (+https://almanaquedosclubes.com; endart.studios@gmail.com)`

## 0. Higiene `/direitos-titular` (cache-bypass, fresh)
- `GET /direitos-titular` → **200** · **SHA-256** `6faa117edfff3af078fa0428f002f74793e2e18ee28bc5dd738d0ad9e7422358`.
- **`"resposta imediata"` AUSENTE** (também `"imediata"`/`"imediat"`, e as variações com "têm/tem"). Trecho de prazos ao vivo:
  > "…o recebimento é confirmado na hora; a resposta conclusiva sai em até 15 dias no Brasil (LGPD, art. 18, §3, prorrogável, com comunicação à ANPD) ou em até 1 mês no EEE/Reino Unido quando aplicável. Canal manual (sem conta): endart.studios@gmail.com."
- **Resultado A → T470c permanece no-op.**

## 1. Bloqueio do PR (T448b-2d PR) — registrado
`Campeonato Paranaense` (mãe `Q920397` existe), 2023–2025 (`tablesfq/pr{2023,2024,2025}.htm`, todas 200, autor **Moacir Dalpiaz de Souza**, licença presente):
- **2023** → **blocked**: sem declaração explícita de campeão (tabela não no formato esperado).
- **2024** → **pending_review**: apenas tabela final (1º = ATHLETICO) **sem declaração de campeão** (não assumir).
- **2025** → **blocked**: frase explícita (`*** Operário are Champions ***`), mas clube campeão **`Q2580083` Operário Ferroviário EC ausente** do acervo (não criar clube neste round).
- **Veredito:** **0 temporadas plenamente `ready`** → **< 2 válidas → T448b-2d PR BLOQUEADO.** Sem branch de parser PR.

## 2. Discovery read-only GO

### 2.1 Páginas (2023–2025)
| Temporada | URL | HTTP | Autor | Licença | Frase de campeão (verbatim) | Last updated |
|---|---|---:|---|---|---|---|
| 2023 | `tablesfq/go2023.htm` | 200 | Guillermo Alexander Rivera | presente | `*** ATLÉTICO are Goiás State 2023 champions ***` | 22 Oct 2023 |
| 2024 | `tablesfq/go2024.htm` | 200 | Guillermo Alexander Rivera | presente | `*** ATLÉTICO are Goiás State 2024 champions ***` | 05 May 2024 |
| 2025 | `tablesfq/go2025.htm` | 200 | Guillermo Alexander Rivera | presente | `*** VILA NOVA are Goiás State 2025 champions ***` | 05 Apr 2025 |

Licença verbatim (3 páginas): *"(C) Copyright Guillermo Alexander Rivera, RSSSF and RSSSF Brazil 20xx. You are free to copy this document in whole or part provided that proper acknowledgement is given to the author. All rights reserved."*

### 2.2 Competição-mãe (Wikidata ao vivo)
`Q931386` = pt `Campeonato Goiano de Futebol` / en `Campeonato Goiano` · **P31 = Q1478437** (association football competition) · **P17 = Q155** (Brasil). Sem P131 (não inventar estado).

### 2.3 Clubes campeões (Wikidata ao vivo + DB read-only)
| Clube (página) | QID validado | P31 | P17 | No DB? | Classificação |
|---|---|---|---|---|---|
| ATLÉTICO (2023/2024) | **Q198034** Atlético Clube Goianiense | Q476028 (clube de futebol) | Q155 | **presente ACTIVE** | `present_by_qid` |
| VILA NOVA (2025) | **Q1513287** Vila Nova Futebol Clube (Goiás) | Q476028 | Q155 | **ausente** | `missing_but_seedable_by_qid` |

⚠️ **Homônimo:** o acervo tem `Q10391045` (Vila Nova/RN) e `Q10391046` (Vila Nova/ES) — e `Q10391045` tem o **mesmo nome** "Vila Nova Futebol Clube". Logo, resolução do campeão GO **exclusivamente por QID `Q1513287`** (nunca por nome).

### 2.4 Query read-only (produção, só SELECT)
```
competitions Q931386 → 0 rows  (mãe AUSENTE → seed_required)
clubs Q198034 → Atlético Clube Goianiense | ACTIVE
clubs Q1513287 → (ausente)
clubs 'Vila Nova%' → Q10391046 (ES), Q10391045 (RN)  ← homônimos, NÃO GO
```

### 2.5 Tabela final GO
| Temporada | URL | HTTP | Autor | Licença | Frase campeão | Clube na página | Clube QID | QID Wikidata | Clube no DB | Mãe Q931386 no DB | Status |
|---|---|---:|---|---|---|---|---|---|---|---|---|
| 2023 | `go2023.htm` | 200 | G. A. Rivera | ✓ | `*** ATLÉTICO are Goiás State 2023 champions ***` | ATLÉTICO | Q198034 | ✓ | **presente** | ✗ (seed) | **seed_required** |
| 2024 | `go2024.htm` | 200 | G. A. Rivera | ✓ | `*** ATLÉTICO are Goiás State 2024 champions ***` | ATLÉTICO | Q198034 | ✓ | **presente** | ✗ (seed) | **seed_required** |
| 2025 | `go2025.htm` | 200 | G. A. Rivera | ✓ | `*** VILA NOVA are Goiás State 2025 champions ***` | VILA NOVA | Q1513287 | ✓ | **ausente** | ✗ (seed) | **seed_required** |

**Gate GO:** **3/3 temporadas** com frase explícita + licença/autor; **zero `blocked`**; `ambiguous_qid` **0** (Vila Nova resolvido por QID inequívoco); clube da 2025 `missing_but_seedable_by_qid`. → **GO PASSA (seedable).**

## 3. Recomendação
**GO seedable.** Próximo passo = **micro-round de seed de identidade GO** (PASSO 2), **condicionado à aprovação do Thinker**:
- semear mãe `Q931386` (Wikidata CC0, upsert por qid, `type=LEAGUE`, `country=BR`);
- semear clube `Q1513287` (Vila Nova/GO) — e **não** confundir com `Q10391045`/`Q10391046`;
- `Q198034` já presente (nada a fazer).

## 4. Confirmações
**Zero parser · zero seed · zero escrita · zero produção (só SELECT/GET) · zero migration · zero cache · zero hard delete.** Nenhuma branch de parser PR codada.
