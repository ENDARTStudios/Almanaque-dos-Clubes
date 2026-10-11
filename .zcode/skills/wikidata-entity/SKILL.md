---
name: wikidata-entity
description: Derivar e validar identificadores do Wikidata (QIDs) para clubes, seleções, competições, estádios — e ler os datatypes corretos. Use antes de criar/gravar qualquer entidade do acervo, ao descobrir clubes/seleções ausentes, ao registrar competição, ou quando um QID/atributo for necessário (país, fundação, estádio, escudo, troféu).
---

# QID e dados do Wikidata

## Regra permanente: QID NUNCA vem da memória

`D-2026-10-09-qids-never-from-memory`. O QID é **derivado de uma fonte verificável** e **validado** antes de usar.

Evidência do custo: uma lista de 20 QIDs "conhecidos" foi validada e **19 estavam errados** — Q113013 era
"literatura pós-moderna", Q8776 era "Abraham de Moivre", Q19629 era o ano 1147, Q49724 era a banda Hoobastank,
Q19648 era o Fenerbahçe. E, ao derivar, um QID "candidato" para a Serie A era o filme *Inglourious Basterds*.

## Derivar QID do artigo (é assim que se faz)

```bash
# pt|en|es|it — lote de até 50 títulos por request, 1 req/s, 429 → backoff
curl -s -A "AlmanaqueDosClubes/0.1" \
  "https://<lang>.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item\
&titles=<T1|T2|...>&redirects=1&format=json&formatversion=2"
```

- `redirects=1` **e** `normalized` — os dois mapas existem; siga a cadeia `original → normalized → redirect`.
- Título com apóstrofo vem com **entidade HTML** (`l&#39;Ouest`): decodifique antes de consultar.
- **Rate limit**: ~1 req/s e User-Agent identificado. Tomou `429` → espere (20s) e repita o lote; não insista.

## Validar a entidade (classes estruturais, não rótulo)

| Alvo | Regra (validada em produção) |
|---|---|
| Clube de futebol | `P31 ∋ Q476028` **OU** (`P641 ∋ Q2736` **E** tem `P115` estádio) |
| Seleção nacional | `P641 ∋ Q2736` **E** NÃO clube **E** (`P17` país **OU** classe de seleção em `Q6979593/Q23759293/Q15944511/Q23905105`) |
| Competição | `P31 ∋ Q15991303` (liga) / classes de copa **OU** `P641 ∋ Q2736` |

`Q2736` = futebol de associação. **FC Barcelona, Boca e San Lorenzo NÃO têm `P31=Q476028`** (são "sports club") —
a regra com o `E`/`OU` é o que os aceita sem deixar passar país, federação, pessoa ou delegação olímpica.

## Datatypes que quebram o código se lidos errado

- **`P297` (ISO-3166-1 alfa-2) é STRING** → `datavalue.value` é `"ES"`, **não** `{id:"ES"}`. Ler com o helper de
  entidades devolve vazio e o país sai `null` em todas as linhas.
- **Qualificador é SNACK CRU**: dentro de `claim.qualifiers.P580[0]` **não existe o wrapper `mainsnak`**
  (a claim tem, o qualificador não) → `qualifiers.P580[0].datavalue.value.time`.
- **`P571` (fundação) costuma ter vários valores**: use o **mais antigo** (o 1º é ruído: Q145 traz 1921/1927, Q29
  começa em 1715).
- **`P18` é string** (nome do arquivo); **`P1083` (capacidade) é quantidade** (`{amount:"+99354"}`).
- **Estádio atual**: `P115` lista a HISTÓRIA → prefira rank `preferred` → senão o `P580` (início) mais recente →
  senão a maior capacidade. ("Maior capacidade" sozinho escolhe o Gasómetro ANTIGO do San Lorenzo.)

## Escrever sem duplicar

- **Dedup por QID** (chave canônica). Mesmo nome + sem QID → **ANEXAR o QID** ao registro existente (zero overwrite).
- Nome do clube/competição: **idioma do país** (`es` para Espanha, `en` para Inglaterra, `pt` para Sul-América) —
  é a convenção que o acervo já usa ("Real Madrid Club de Fútbol", "Manchester City F.C.").
- Proveniência obrigatória (`importedFrom`, `sourceUrl`) e **reversível por marcador**.
