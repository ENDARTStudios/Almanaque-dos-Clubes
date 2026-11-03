# Biblioteca de referência — buscada sob demanda, não versionada

A skill vem **completa em lógica** (SKILL.md, 14 referências, 9 scripts, templates) e **sem a
biblioteca de SVGs**. Isso é deliberado.

## Por que a biblioteca não está aqui

São **1.432 arquivos SVG (~10 MB)** que são **marcas registradas de seus donos**. O próprio
`TRADEMARKS.md` da skill diz que eles estão incluídos "for reference and education only" e que
**não são cobertos pela licença MIT** — só o texto, os scripts e os dados de catálogo são.

Versionar 10 MB de marcas de terceiros no repositório de um produto seria:
- ruído permanente em todo clone e em todo diff;
- uma afirmação de redistribuição que a licença original não faz.

A skill sem a biblioteca tem **291 KB** e continua servindo para tudo o que importa: princípios,
processo, tipos de marca, construção de SVG, correções óticas, cor, tipografia, testes e crítica.

## Como obter quando precisar

```bash
# clone raso, fora do versionamento
git clone --depth 1 https://github.com/kaankiziltug/logo-design-skill.git .vendor/logo-design-skill

# a biblioteca fica em:
#   .vendor/logo-design-skill/skills/logo-design/assets/library/
```

O `.gitignore` já cobre `.vendor/`.

## O que deixa de funcionar sem ela

| Recurso | Sem a biblioteca |
|---|---|
| `search_library.py` | não consulta (o `catalog.json` vem junto da biblioteca) |
| `preview_sheet.py --refs-industry` | não compara com o acervo de referência |
| `svg_audit.py` | **funciona** — a comparação de complexidade usa a mediana do catálogo e, sem ele, o script segue auditando estrutura, cor, ângulos e detalhes |
| `concept_sheet.py` · `render_png.py` · `export_variants.py` · `presentation_board.py` | **funcionam** |

Ou seja: perde-se a **comparação com o acervo de 1.400 marcas**; não se perde a produção nem a
auditoria.
