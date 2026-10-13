---
name: ui-library-choices
description: Lista curada de bibliotecas de UI aceitas no Almanaque dos Clubes, com o que já está instalado, o que está liberado para entrar e o que é proibido — mais os descompassos que devem ser corrigidos. Use ao precisar de um componente que o repo não tem (toast, diálogo, popover, menu de comando, virtualização, drag and drop, contador animado, tema claro/escuro), ao avaliar uma dependência nova de UI, ou quando alguém propuser "instalar a lib X".
---

# Escolha de biblioteca de UI (Almanaque dos Clubes)

> **Origem:** adaptado de [`emilkowalski/skills`](https://github.com/emilkowalski/skills) —
> `pick-ui-library` (MIT). A lista abaixo foi **reconciliada com o `package.json` real** deste
> repo e com a regra do projeto de **não manter dois sistemas de design**.

## Regra zero

O app tem um design system próprio (tokens `@theme` em `globals.css`, Tailwind v4,
`lucide-react`). Biblioteca nova entra **atrás dos tokens**, nunca ao lado: nada de
`tailwind.config.js`, nada de paleta paralela, nada de segundo conjunto de componentes base.
Antes de instalar qualquer coisa, responda: **já existe componente no repo que faz isso?**
(`Navbar`, `Footer`, `HeroSection`, `ChampionsCarousel`, `RankingsTable`, `ClubCard`,
`CompareTable`, `GeoMapCanvas`, `DashboardStats`, `SearchBar`, `ReportModal`, `ProposalModal`…)

## Já instalado e em uso (não troque)

| Necessidade | O que usamos | Licença |
|---|---|---|
| Animação em timeline / scroll reveal | `gsap` 3.15 | Licença "no charge" da GSAP — grátis para este uso; ver nota abaixo |
| Springs, gestos, exit | `motion` 13 (importe de `motion/react`) | MIT |
| Gráficos e dashboards | `recharts` 3 | MIT |
| Mapa e coroplético | `leaflet` + GeoJSON em `public/geo` | BSD-2 |
| Ícones | `lucide-react` | ISC |
| Teste e2e / QA visual | `@playwright/test` 1.62 | Apache-2.0 |

**Nota de licença GSAP:** desde a aquisição pela Webflow, os plugins e o core são gratuitos
mesmo para uso comercial — a licença paga se aplica a produtos que **competem** com a GSAP.
Este acervo não compete; mantemos a atribuição no `package.json`. (`animejs` está instalado e
**não é usado em lugar nenhum** — é dívida, não convite a um quarto motor de animação.)

## Liberado para entrar (quando a necessidade aparecer)

| Necessidade | Biblioteca | Por quê esta |
|---|---|---|
| Toast / notificação | **Sonner** | é o padrão da lista curada; hoje o repo não tem toast |
| Diálogo, popover, menu, select sem estilo | **Base UI** | acessível, sem estilo imposto, encaixa sob os nossos tokens |
| Menu de comando (⌘K) | **cmdk** | a busca global (`GlobalSearch`) é o caso de uso |
| Contador/estatística animada | **NumberFlow** | transição de dígito feita certo; evitar `useGsapCounter` para números que mudam |
| Virtualização de lista grande | **Virtuoso** | antes de paginar por gambiarra (rankings e listas de clubes) |
| `className` condicional | **clsx** (+ **cva** se houver variantes reais) | hoje há ternário de template string espalhado |
| Tema claro/escuro sem flash | **next-themes** | **só** quando houver decisão de dark mode global (hoje não há) |

## Proibido / não instalar

- `framer-motion` — o pacote foi renomeado para `motion` e já está instalado. Importar
  `framer-motion` é erro: **use `motion/react`**.
- Qualquer coisa que exija `tailwind.config.js` (v3) ou um `components.json` de shadcn como
  pré-requisito: o projeto é Tailwind **v4** com configuração em CSS.
- Bibliotecas que trazem paleta/tokens próprios e sobrepõem os nossos.
- Um quinto motor de animação. Já temos três (CSS/WAAPI, Motion, GSAP) — basta.

## Descompassos que devem ser corrigidos quando aparecerem

| Sintoma no código | O que fazer |
|---|---|
| Toast/dropdown feitos à mão com `div` e foco manual | Base UI (ou Sonner, se for toast) |
| Lista de 1.000+ linhas renderizada direto | Virtuoso antes de paginar |
| Número animado re-renderizando texto | NumberFlow |
| Ternário de `className` com 3+ condições | `clsx` (ou `cva` se for variante) |
| Estado compartilhado por teia de props/`useState` | `zustand` |
| Animação de hover sem `@media (hover: hover)` | gate obrigatório |

## Como agir

1. Rode `grep`/`glob` no repo antes: o componente pode já existir.
2. Se for instalar, cheque a **peer range de React 19** (`pnpm info <pkg> peerDependencies`) —
   React 19 quebra lib que declarou `^16 || ^17 || ^18`.
3. Instale no workspace certo: `pnpm --filter web add <pkg>` (nunca na raiz).
4. Envolva o componente com os nossos tokens; não copie o CSS de exemplo da lib.
5. Registre a decisão em `docs/DECISOES.md` se for estrutural.
