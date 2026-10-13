---
name: visual-qa-playwright
description: QA visual do apps/web com Playwright — subir o dev server certo, capturar screenshots em 1440/768/390 px, medir contraste e overflow, e provar antes/depois de qualquer mudança visual. Use sempre que a tarefa mexer em layout, estilo, hero, componente ou CSS, ou quando for preciso "provar que ficou melhor" ou reproduzir um defeito visual.
---

# QA visual com Playwright

## Armadilha nº 1: qual porta está servindo o app

**Há outros projetos Next rodando nesta máquina.** Já aconteceu de `localhost:3000` servir outro
app e o screenshot "antes/depois" ficar errado. Antes de capturar:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 3000,3001,3100,3210 -ErrorAction SilentlyContinue |
  Select-Object LocalPort,OwningProcess
Get-Process -Id <pid> | Select-Object Id,ProcessName,Path
# prova que É o nosso app:
(Invoke-WebRequest http://localhost:<porta>/ -UseBasicParsing).Content -match 'ALMANAQUE'
```

Se a porta estiver ocupada por outro projeto, inicie o nosso em porta livre:

```powershell
pnpm --filter web dev --port 3210     # rode como job em background
```

A primeira requisição compila a rota (pode levar > 20 s) — faça um probe com timeout generoso
antes de capturar.

## Utilitários versionados (use estes, não recrie)

O plugin traz quatro ferramentas prontas, com um runner que resolve `@playwright/test` a
partir de `apps/web/` e grava a saída em `<repo>/.tmp/shots` (fora do git):

```powershell
node plugins/almanaque-design/tools/run.mjs shot     http://localhost:3210/ before
node plugins/almanaque-design/tools/run.mjs shot     http://localhost:3210/ after
node plugins/almanaque-design/tools/run.mjs audit    http://localhost:3210/
node plugins/almanaque-design/tools/run.mjs contrast http://localhost:3210/
node plugins/almanaque-design/tools/run.mjs locales  http://localhost:3210/
```

| Ferramenta | O que devolve |
|---|---|
| `shot` | PNG em 1440×900, 768×1024, 390×844 + full page (`<nome>-desktop/tablet/mobile/full.png`) |
| `audit` | overflow-x por viewport, alvos de toque < 24 px, ordem de headings, contagem de `h1`, erros de console e HTTP ≥ 400 |
| `contrast` | contraste WCAG do texto **realmente renderizado** (composição em canvas, cobre alfa e `oklab`) + veredito por par |
| `locales` | renderiza pt-BR/en-US/es-ES (cookie `almanaque_locale`) e confere `lang`, H1, CTA e overflow |

`contrast` é a ferramenta que fecha a discussão de acessibilidade: ela mede o pixel final,
não a intenção do CSS.

## Medições que valem mais que a imagem

Rode no mesmo Playwright e reporte números, não impressões:

```js
// overflow horizontal (defeito mais comum em 390 px)
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
// alvos de toque pequenos
const small = await page.evaluate(() => [...document.querySelectorAll('a,button')]
  .map((el) => { const r = el.getBoundingClientRect();
    return r.width && r.height && (r.height < 24) ? `${el.tagName}:${(el.textContent||'').trim().slice(0,24)}` : null; })
  .filter(Boolean));
// ordem de headings
const headings = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3')]
  .map((h) => `${h.tagName} ${h.textContent.trim().slice(0,40)}`));
// console errors / 404 de asset
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
page.on('response', (r) => r.status() >= 400 && console.log('HTTP', r.status(), r.url()));
```

## Rotina antes/depois (obrigatória para mudança visual)

1. Capturar `before-*` **na mesma porta e viewport** que o `after`.
2. Fazer a mudança.
3. `pnpm --filter web typecheck && pnpm --filter web lint` (e `test` se tocou lógica).
4. Capturar `after-*`, abrir os PNGs e comparar lado a lado.
5. Reportar: o que melhorou, o que piorou, o que **não** foi verificado.

## O que a imagem prova e o que não prova

- Prova: hierarquia, corte, sobreposição, alinhamento, contraste aparente, estado vazio.
- **Não** prova: leitor de tela, ordem real de foco, hover/focus (capture com `page.hover()` e
  `page.keyboard.press('Tab')` se for o caso), dark/light, dados de produção.
- Dado de produção não aparece em dev se a API local não responde: o estado vazio/fallback
  também precisa ser capturado e aprovado.
