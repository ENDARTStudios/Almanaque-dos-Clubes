---
name: web-accessibility-wcag
description: Acessibilidade WCAG 2.2 AA para o Almanaque dos Clubes — contraste medido, foco, teclado, semântica, alvos de toque, movimento reduzido, i18n e RTL. Use ao criar ou revisar qualquer componente/tela, ao escolher cores de texto sobre fundo, ao adicionar ícone/botão/carrossel/modal, ou quando a tarefa citar acessibilidade, a11y, contraste, leitor de tela, teclado ou deficiência visual.
---

# Acessibilidade (WCAG 2.2 AA) — Almanaque dos Clubes

O projeto tem `docs/07-operations-marketing/ACCESSIBILITY.md` e testes em `apps/web/tests/e2e/`.
Esta skill é o procedimento de trabalho, não substitui aquele documento.

## Contraste: medir, nunca estimar

Texto normal exige **4,5:1**; texto grande (≥ 24 px, ou ≥ 18,66 px em negrito) e elementos de
UI/borda informativa exigem **3:1**. Meça com script, não "no olho":

```js
// .tmp/contrast.mjs — luminância relativa WCAG
const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lum = (h) => {
  const n = h.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
```

Cuidado com **opacidade**: `text-foreground/60` sobre fundo escuro não é "60% de contraste",
é uma cor nova — calcule a mistura antes. Valores já medidos da camada escura estão na skill
`design-system-almanaque`.

## Checklist por componente

- [ ] **Semântica** — `<nav>`, `<main>`, `<section>`, `<article>`, heading em ordem
      (`h1` → `h2` → `h3`, sem pular nível). Uma `h1` por página.
- [ ] **Nome acessível** — todo `<button>`/`<a>` com ícone tem `aria-label` ou texto; ícone
      decorativo leva `aria-hidden="true"`.
- [ ] **Teclado** — Tab alcança tudo na ordem visual; `Enter`/`Espaço` ativam; nada com
      `onClick` em `div`. Escape fecha modal.
- [ ] **Foco visível** — o `:focus-visible` global de `globals.css` não pode ser removido; em
      fundo escuro confirme que o anel (`--color-ring`) contrasta.
- [ ] **Lista rolável** (ex.: `ChampionsCarousel`) — `tabIndex={0}` + `role="group"` +
      `aria-label`; navegação por seta; **sem autoplay**.
- [ ] **Alvo de toque** — ≥ 24×24 px (WCAG 2.2 — 2.5.8); na prática ≥ 44 px de altura para
      botão primário.
- [ ] **Movimento** — respeita `prefers-reduced-motion` (já há regra global); nenhuma
      informação transmitida **só** por animação.
- [ ] **Cor não é o único sinal** — "campeão" não pode ser só vermelho; acrescente texto/ícone.
- [ ] **Formulário** — `<label>` ligado por `htmlFor`/`id`; erro em texto, não só borda.
- [ ] **Imagem** — `alt` descritivo ou `alt=""` se decorativa.
- [ ] **Zoom 200%** — sem scroll horizontal e sem texto cortado.

## i18n e leitor de tela

- `lang` correto: o `I18nProvider` já ajusta `document.documentElement.lang`.
- Nunca concatene frases por pedaço (`"Temporada" + ": " + ano`) se o idioma exigir outra
  ordem — use interpolação `{ano}` numa string única.
- Números/datas: não formate à mão onde já existe helper de locale.

## Auditoria rápida automatizável

```bash
pnpm --filter web test          # vitest (unit)
pnpm --filter web exec playwright test tests/e2e   # e2e, precisa do dev server
pnpm --filter web typecheck
```

Para varredura automática de regras, um check com `axe-core` via Playwright é aceitável como
**triagem** — jamais como prova de conformidade. O veredito final é manual + medido.

## Saída de uma auditoria

Tabela `tela · elemento · regra WCAG · severidade (bloqueia/atenção) · correção mínima`, com o
**valor medido** (ex.: 4,02:1) e não "está baixo". Se algo não for verificável sem dispositivo
(narrador real), declare como não verificado.
