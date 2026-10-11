---
name: wiki-table-parser
description: Estender ou depurar o parser de tabelas da Wikipédia do acervo (apps/api/src/lib/wikipedia/standings-parser.ts) — classificação multi-idioma, fase de grupos/fase de liga, artilheiro, campeão/vice, final em dois jogos. Use ao adicionar uma competição/idioma novo, quando uma tabela não parseia, quando colunas saem trocadas/nulas, ou antes de escrever qualquer regex nova de tabela.
---

# Parser de tabelas da Wikipédia

## Disciplina: FIXTURE primeiro, regex depois

1. **Baixe o HTML renderizado** — a Wikipédia monta as tabelas por **módulos Lua** (`#invoke:sports results`), então o
   wikitext NÃO as contém. Use `action=parse&prop=text` (o wikitext só tem a transclusão).
2. **Imprima os cabeçalhos e a 1ª linha de dados** de cada tabela candidata (script de inspeção, não código de produção).
   Só então escreva o padrão.
3. **Grave um RECORTE real** como fixture (`apps/api/tests/fixtures/wikipedia-standings-<x>.html`) e um teste que
   afirme **fatos externos** (o campeão real, o artilheiro real) — nunca "o que o meu parser devolve".
4. Faça um script de trim para a fixture (prefixo com o infobox + a tabela + a seção de artilharia) — o artigo inteiro
   passa de 1 MB.

## Regras do parser (não regredir)

- **Léxico POR IDIOMA.** Um léxico único casa a coluna errada: `G` = *jogos* (it) e *ganados* (es); `D` = *derrotas*
  (pt) e *drawn* (en); `P` = *perdidos* (it/es) e *pontos* (Série B). O idioma é detectado por rótulo distintivo
  (Equipe→pt, Team→en, Equipo→es, Squadra→it, Verein/tore→de, rang/équipe→fr, ptn/wed→nl) e **a ordem importa**:
  `nl`/`de` antes de `en` (os dois usam "team"); `fr` antes de `pt`.
- **Âncora por CABEÇALHO**, não por índice de tabela (`Pos + Equipe + J + Pts`).
- **Copa tem dois formatos**: tabela combinada com coluna `Grp` (Libertadores) e **fase de liga de N times sem grupo**
  (UCL/UEL desde 2024-25). Tente a forma com grupo e caia na plana com `minRows` alto; nos anos com grupos de 4, o
  `minRows` **recusa** as tabelas de grupo — melhor sem classificação que com um grupo só.
- **`minRows` como discriminador**: a MLS tem conferências (14-15) ANTES da tabela geral (29-30) → `minRows=20`.
- **Melhor `null` que errado.** Sem cabeçalho reconhecível, devolva `null` — a heurística antiga ("maior número da
  última coluna") gravou artilheiro = clube.

## Armadilhas REAIS já encontradas (checar antes de acusar o dado)

| Sintoma | Causa | Correção |
|---|---|---|
| Todas as posições iguais; "2002" na posição | entidade numérica `&#x2002;` não decodificada → `num()` lê o **código** da entidade | decodificar `&#x..;` e `&#..;` |
| Gols "099:320" | `<span style="visibility:hidden">0</span>` (chave de ordenação) | remover spans invisíveis |
| Cabeçalho `teamvte` / `equipevde` | legenda visual colada (o `<style>` entre `team` e `vte`) | **remover bloco → ESPAÇO**, não vazio |
| Colunas trocadas (empates→`null`, derrotas lendo empates) | idioma caiu em `unknown` (por causa do `teamvte`) | idem acima + ancorar o léxico |
| Linha de clube perdida ("17 de 18") | nome com letras ISOLADAS ("N.E.C.") reprovado por exigir 3 letras **consecutivas** | contar LETRAS no total (≥3) |
| "clube" = `Predefinição:Futebol B-SAD` | link de **namespace** virou clube | ignorar `Predefinição/Template/Categoria/Anexo/…` e `File:` |
| "clube" = bandeira/federação (`French Football Federation`) | o **1º** link da célula é o flagicon | escolher o link de **maior texto de exibição** |
| `title` com `&#39;` | entidade HTML no atributo | decodificar (mesmo stripTags) |
| Artilheiro = clube da tabela "Tore" | a tabela de gols **por clube** casa o padrão de gols | exigir **coluna de jogador** (spieler/speler/torschützen/jogador…) E célula **inteira limpa** (`/^\d+$/`) |
| Artilheiro = "Ricardo Pepi" (NL) | a única tabela com `goals` era a de **hat-tricks** (minutos) | idem acima; sem rótulo confiável → `null` |
| Campeão = árbitro / federação (Recopa) | times em **texto puro** (sem link) e linha `AFA | CBF` entre times e agregado | ancorar no **agregado** (dois inteiros) e pegar os times **2 linhas acima** |
| Campeão = "Real Madrid" ausente | infobox en usa **plurais** (`Champions`/`Runners-up`) | incluir as formas plurais |

## Campeão/vice: de onde vem

- Infobox rotulado (`Campeão`, `Champion(s)`, `Campeón`, `Campione`) — o normal.
- Rótulo próprio: MLS → **`MLS Cup`** (`--champion-label`).
- **Dois torneios na mesma célula** (Liga MX): `parseSplitChampions` (`--dual-tournament`).
- **Final em dois jogos** (Recopa): `parseTwoLegFinal` (`--two-leg-final`) — o agregado decide.
- Copa sem rótulo e sem agregado → `null` (honesto); nunca deduza pelo líder da tabela.
