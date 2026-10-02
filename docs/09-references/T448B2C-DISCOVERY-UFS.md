# T448b-2c — Discovery read-only: expansão estadual (RSSSF Brasil)

> **Escopo:** round de **descoberta read-only**. **Nenhum parser, nenhum writer, nenhuma escrita, nenhuma migration.**
> **Data:** 2026-09-24 · **Coleta:** `GET` com `User-Agent: AlmanaqueDosClubes-Discovery/1.0 (+https://almanaquedosclubes.com; endart.studios@gmail.com)`, delay educado, sem brute-force, sem contornar 403.
> **Objetivo:** medir 5 UFs candidatas, escolher 1–2 para o próximo parser e **declarar o gap** das demais.

## 0. Higiene jurídica (gate antes do discovery)

### 0.1 `/direitos-titular` (cache-bypass)
`GET /direitos-titular` (200) com `Cache-Control: no-cache`. **`"resposta imediata"` AUSENTE** (também `imedit*` ausente). Trecho ao vivo que substitui qualquer promessa de conclusão imediata:

> "Exerça seus direitos com protocolo rastreável. O recebimento é confirmado na hora; a resposta conclusiva sai em **até 15 dias** no Brasil (LGPD, art. 18, §3, prorrogável, com comunicação à ANPD) **ou em até 1 mês no EEE/Reino Unido** quando aplicável. Canal manual (sem conta): **endart.studios@gmail.com**."

**Resultado A → no-op (sem T470c).** Coerente com T470: protocolo + prazo BR 15 dias / EEE-UK "1 mês" (=30 dias) prorrogável + canal manual. *(Observação menor: a página não rotula "DPO/Encarregado" — hoje o canal único é o e-mail oficial. Follow-up opcional WS-L, não bloqueante.)* Sem promoção a "imediat" em nenhuma variação.

### 0.2 `/fontes`
`GET /fontes` → **404**. Busca por `/fontes` no repo (`apps/web`) → **0 referências públicas**. **Resultado A → no-op** (não há link quebrado; eventual `/fontes` como índice é opcional futuro).

## 1. Universo RSSSF Brasil (medido)
Índice único: `https://rsssfbrasil.com/current.htm` (200). As raízes `tables*/current.htm` dão **404**.
- **85 URLs estaduais**, **24 códigos** (3 prefixos: `tablesae`/`tablesfq`/`tablessz`).
- **Presentes (candidatas):** SP (6), CE (4), PR (4), SC (5), GO (3).
- **AUSENTES do índice 2026:** **RJ, RS, RO, RR** (0 cada).

## 2. Tabela das 5 candidatas (2023–2025)

| Campo | **GO** | **PR** | **SC** | **SP** | **CE** |
|---|---|---|---|---|---|
| Competição | Campeonato Goiano | Campeonato Paranaense | Campeonato Catarinense | Campeonato Paulista | Campeonato Cearense |
| Módulo | elite (Série A) | 1ª Divisão | Divisão Principal | Série A1 | Série A |
| Temporadas 200 | 2023/2024/2025 | 2023/2024/2025 | 2023/2024/2025 | 2023/2024/2025 | 2023/2024 (**2025=404**) |
| Prefixo | `tablesfq/go` | `tablesfq/pr` | `tablessz/sc` | `tablessz/sp` | `tablesae/ce` |
| Author | Guillermo Alexander Rivera | Moacir Dalpiaz de Souza | Moacir Dalpiaz de Souza | G. R. Magalhães (2023), Décio C. Vital (2024/25) | Nirez Azevedo |
| Copyright | presente (…RSSSF and RSSSF Brazil 20xx) | presente | 2025 presente; **2023 sem autor**; 2024 copy ausente | presente | presente |
| Attribution required | **true** | **true** | true (com ressalva 2023/24) | true | true |
| Layout family | grupos + semifinal + final (semelhante MG) | mata-mata + tabela | mata-mata + final | grupos + semi | grupos + semi |
| Champion evidence | **frase explícita nos 3 anos** (`*** ATLÉTICO/VILA NOVA are … champions ***`) + linha de tabela | frase (2025 `*** Operário are Champions ***`) + "List of 1st Division Champions" | frase (`*** Avaí are champions ***`) | **"list of champions"** (índice) — sem frase inline | **"list of champions"** (índice) |
| Mother QID (validado) | **Q931386** | **Q920397** | **Q2317199** | **Q1348155** | **Q2469206** |
| Mother no nosso DB? | **NÃO (gap)** | **SIM** (`Q920397`) | **NÃO (gap)** | **SIM** (`Q1348155`) | **SIM** (`Q2469206`) |
| Champion club (amostra) | Atlético Goianiense / Vila Nova | Operário / (lista) | Avaí | (lista) | (lista) |
| Champion existe no DB? | `Q198034 Atlético Clube Goianiense` **ACTIVE ✓**; **Vila Nova ambíguo** | **Operário ambíguo** (`Q671621` ≠ Operário Ferroviário/Ponta Grossa) | não verificado a fundo | não verificado | não verificado |
| Women's page? | não encontrada | não encontrada | não encontrada | **`sp*` (feminino)** pode existir — não parseado | **`Q9678436`** (Cearense Feminino) — não parseado |
| Blockers | mãe ausente (seed) + homônimo "Vila Nova" | homônimo "Operário" (2025) | **licença/autor ausente em 2023/2024** + mãe ausente | campeão **não inline** (índice) + autor varia por ano | **2025 = 404** (só 2 temporadas) |
| Proposed pilot scope | Módulo I, 2023–2025, só campeão masculino | Módulo I, 2023–2025, só campeão masculino | — | — | — |
| Complexity | medium | **low–medium** | medium | medium–high | n/a (2 temporadas) |

## 3. Investigação RJ / RS / RO / RR
- **Não estão no índice 2026** (`current.htm`) nem no `historical.htm`.
- **Probe direto 404** em todos os prefixos (`tablessz`/`tablesfq`/`tablesae`) para `rj2024/2025`, `rs2024/2025`, `ro2024/2025`, `rr2024/2025`.
- Busca por **nome** no current+historical: `carioca`=false · `gaúcho/gaucho`=false · `fluminense`=false · `grêmio`=false. (`rio de janeiro`/`rio grande do sul`/`flamengo`/`internacional`=true, mas em contexto **nacional** `br*`, não estadual.)
- **Conclusão (medida):** a fonte RSSSF Brasil **não publica** páginas estaduais para RJ/RS/RO/RR (ao menos não descobríveis). **RJ/RS = gap real de fonte** (não é faltar no índice). Alternativa futura para RJ/RS exigiria **outra fonte** (fora do escopo).

## 4. QIDs das competições-mãe (validados ao vivo no Wikidata)

| UF | QID | pt label | P31 | P17 |
|---|---|---|---|---|
| SP | Q1348155 | Campeonato Paulista de Futebol | Q15991303 (football league) | **Q155** (Brasil) |
| CE | Q2469206 | Campeonato Cearense de Futebol | Q15991303 | **Q155** |
| PR | Q920397 | Campeonato Paranaense de Futebol | Q15991303 | **Q155** |
| SC | Q2317199 | Campeonato Catarinense de Futebol | Q1478437 (association football competition) | **Q155** |
| GO | Q931386 | Campeonato Goiano de Futebol | Q1478437 | **Q155** |

P131 (estado) **ausente** em todas — distinguir elite de Série A2/feminino exige **outra via** (nome + edição), não o QID da mãe.

## 5. Consulta read-only ao banco (produção, só SELECT)
- `competitions` por QID: **SP/CE/PR existem** (`LEAGUE`, BR); **SC/GO NÃO existem** (gap).
- `clubs` (campeões amostrados): `Q198034 Atlético Clube Goianiense` **ACTIVE**; **homônimos confirmados** — `Q10391045 Vila Nova Futebol Clube` vs `Q10391046 Vila Nova FC (ES)`; `Q671621 Operário Futebol Clube` (≠ Operário Ferroviário EC, Ponta Grossa).
- Base BR: **1.563 competitions**, **618 clubes BR ativos**.

## 6. Riscos de normalização (documentados)
- **Homônimos entre estados:** "Vila Nova" (GO vs ES), "Operário" (FC/MS vs Ferroviário/Ponta Grossa), "Atlético" (genérico).
- **Sufixos legais / SAF / maiúsculas / acentos** variam por autor da página.
- **Campeão não inline** em SP/CE (índice "list of champions") → exige parsing de tabela/índice, não frase.
- **Autor/licença ausentes** em SC 2023/2024 → bloqueio de atribuição (regra R4).

## 7. Recomendação (para o próximo parser — T448b-2d)
1. **PR (Campeonato Paranaense)** — **primária**: 3 temporadas 200; autor+licença presentes; campeão com frase explícita; **mãe `Q920397` JÁ existe no acervo** (sem seed). **Risco:** homônimo "Operário" (2025) → resolver o **QID exato** (Operário Ferroviário EC, Ponta Grossa) ao vivo antes de escrever.
2. **GO (Campeonato Goiano)** — **secundária**: 3 temporadas 200; **frase de campeão em todos os anos** (melhor evidência); autor+licença presentes. **Risco:** mãe `Q931386` **ausente** (precisa seed, como no MG) + homônimo "Vila Nova".

**Evidência verbatim (recomendadas):**
- PR (`tablesfq/pr2025.htm`): `(C) Copyright Moacir Dalpiaz de Souza, RSSSF and RSSSF Brazil 2025.` · `*** Operário are Champions ***`.
- GO (`tablesfq/go2024.htm`): `(C) Copyright Guillermo Alexander Rivera, RSSSF and RSSSF Brazil 2024.` · `*** ATLÉTICO are Goiás State 2024 champions ***`.

## 8. Gap declarado
- **SP, CE, SC**: não recomendadas agora (CE sem 2025; SP/CE com campeão não-inline; SC com licença/autor incompletos em 2023/2024). **Gap declarado.**
- **RJ, RS, RO, RR**: **sem fonte RSSSF Brasil** → gap de fonte (exigiria outra fonte; fora do escopo).
- **Estaduais do Brasil: cobertura = apenas MG (piloto).** Nenhuma promessa de cobertura completa.
- **Feminino:** existência registrada (ex.: Cearense Feminino `Q9678436`), **não parseado**.

## 9. Decisão explícita
**Nenhum parser iniciado.** Nenhum writer. Nenhuma escrita em produção. Nenhuma migration. Próximo passo (**T448b-2d**) condicionado à **aprovação do Thinker** sobre UF, temporadas, escopo e licença/atribuição.
