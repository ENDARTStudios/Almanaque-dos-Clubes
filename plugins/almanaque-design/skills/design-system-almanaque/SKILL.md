---
name: design-system-almanaque
description: Fonte da verdade do UI/UX do Almanaque dos Clubes — tokens de cor/tipografia/espaço, camada escura editorial, componentes existentes e regras de honestidade visual. Use SEMPRE antes de escrever ou revisar qualquer tela (hero, listagens, detalhe, ranking, mapa, dashboard), ao criar um componente novo, ao escolher cor/raio/sombra, ou quando a tarefa mencionar "design", "visual", "UI", "estilo", "tema", "Tailwind" ou "globals.css".
---

# Design system do Almanaque dos Clubes

## Regra zero — não invente um segundo sistema

O app tem **um** sistema de design: os tokens `@theme` em
`apps/web/src/app/globals.css` + Tailwind v4 + `lucide-react`. Qualquer tela nova usa esses
tokens. Não introduza biblioteca de UI, CSS-in-JS, paleta paralela nem "dark mode" global sem
decisão registrada em `docs/DECISOES.md`.

Antes de editar, consulte o grafo (regra do repo):

```bash
graft ask "estilo do hero" ; graft grep heroTitle ; graft skeleton
```

## Tokens (fonte canônica: `globals.css` > `@theme`)

**O tema padrão do site é ESCURO editorial.** A inversão aconteceu depois da home: enquanto o
claro era o padrão, cada página nova precisava *lembrar* de pedir o escuro; invertendo, o site
inteiro herda a linguagem por construção e a exceção fica explícita (`.theme-light`).

| Token | Escuro (padrão) | Claro (`.theme-light`) | Papel |
|---|---|---|---|
| `--color-primary` | `#e8412f` | `#dc2626` | **preenchimento**: botão, mapa, gráfico, borda |
| `--color-primary-ink` | `#ff6a55` | `#b91c1c` | **texto e link** |
| `--color-on-primary` | `#1a0e0b` | `#ffffff` | texto **sobre** `primary` |
| `--color-secondary` | `#c9a227` | `#ef4444` | acento secundário (dourado no escuro) |
| `--color-background` | `#12100f` | `#fef2f2` | fundo de página |
| `--color-foreground` | `#f7f3ea` | `#340808` | texto — **piso de alfa `/60`** |
| `--color-muted` | `#241f1d` | `#f0edf1` | superfície elevada (cartão, rodapé) |
| `--color-border` | `#6b625a` | `#fecaca` | bordas |
| `--color-danger-ink` | `#f87171` | `#dc2626` | texto de erro/perigo |
| `--color-success-ink` | `#6ee7a8` | `#15803d` | texto de sucesso |
| `--color-warn-ink` | `#fbbf24` | `#b45309` | texto de aviso |
| `--color-info-ink` | `#7dd3fc` | `#0369a1` | texto informativo |
| `--color-*-surface` | varia | varia | fundo dos estados (badge/chip) |
| `--color-ring` | `#c9a227` | `#dc2626` | foco (`:focus-visible`) |
| `--font-heading` | Barlow Condensed | — | títulos (h1–h5, peso 700, letter-spacing .02em) |
| `--font-body` | Barlow | — | corpo |

**Em `muted` no escuro, mais CLARO = elevado.** `#1c1917` (que existia antes) é *mais escuro* que o
fundo e lê como rebaixo, não como cartão. É por isso que `--color-muted` é `#241f1d`.

### NÃO use cor crua do Tailwind

`text-red-600`, `bg-green-100`, `bg-slate-100`, `text-amber-700`… foram **removidos do repo**
(eram 16 arquivos). Todos esses pares assumem fundo claro e reprovam no escuro — `text-red-600`
sobre `#12100f` dá **3,98:1**. Use os tokens semânticos: `text-danger-ink`, `bg-success-surface`,
`text-warn-ink`, `text-info-ink`, `bg-neutral-surface`. O portão `pnpm run ui:audit:ci` não cobre
isso, então é disciplina de revisão — e a varredura `run.mjs contrast` pega se escapar.

### A escala de alfa do texto é medida, não estética

O `--color-foreground` é `#340808` **porque** o app usa `text-foreground/N` em toda parte. Com o
valor antigo (`#7f1d1d`) o sólido até passava, mas a escala reprovava em AA. Números medidos sobre
`#fef2f2` (pior caso entre `#fef2f2` e `#ffffff`):

| alfa | com `#340808` (atual) | com `#7f1d1d` (antigo) |
|---|---|---|
| sólido | 16,21:1 | 9,16:1 |
| `/70` | 6,61:1 | 4,44:1 |
| **`/60`** | **4,72:1 ✅ piso** | 3,46:1 ❌ |
| `/55` | 4,19:1 ❌ | 3,12:1 ❌ |
| `/50` | 3,32:1 ❌ | 2,72:1 ❌ |
| `/40` | 2,50:1 ❌ | 2,17:1 ❌ |

**Regra:** `/60` é o piso para texto. Abaixo disso, só elemento decorativo. O portão
`pnpm run ui:audit:ci` acusa `text-foreground/1x`–`/5x`.

### `text-primary` é para ícone e preenchimento — para TEXTO use `text-primary-ink`

O vermelho de marca `#dc2626` **passa** em branco (4,83:1) mas **reprova nas nossas superfícies**,
porque nenhuma delas é branca puro:

| superfície | `#dc2626` | `#b91c1c` (ink) |
|---|---|---|
| branco (`bg-white`) | 4,83:1 ✅ | 6,47:1 ✅ |
| `background` `#fef2f2` | **4,41:1 ❌** | 5,91:1 ✅ |
| `primary/10` `#fbdede` (chips) | **3,80:1 ❌** | 5,10:1 ✅ |

Por isso existe o token de papel: **`text-primary-ink`** para link, número, protocolo e rótulo;
`bg-primary` / `border-primary` / `text-primary/70` (ícone decorativo, ≥3:1) seguem na marca viva.
Não "conserte" isso escurecendo `--color-primary` — isso apagaria o vermelho dos botões, do mapa
e dos gráficos. `text-primary` como **texto** é o defeito; use `text-primary-ink`.

### Leitura: `max-w-3xl` não é medida de linha

`max-w-3xl` é 48rem = 768px: em Barlow 16px isso rende **~99 caracteres por linha** e o olho perde
o lugar na volta. Para texto corrido use **`.measure-readable`** (68ch) — `ch` acompanha o tamanho
da fonte, `rem` não.

Utilitários: `bg-background`, `text-foreground`, `text-foreground/60`, `bg-primary/10`,
`border-border/50`, `font-heading`… e `text-balance` (`@layer utilities`).

### A EXCEÇÃO CLARA (`.theme-light`) — e por que ela existe

O escuro é o padrão do site. **Uma** exceção é declarada e escopada: os **mapas**. Os tiles do
OpenStreetMap e o GeoJSON do Natural Earth são base cartográfica **clara**; texto claro sobre eles
seria ilegível, e "escurecer o mapa" exigiria trocar de provedor de tiles — decisão de produto, não
de CSS. Então o mapa fica claro em um site escuro:

```html
<div class="theme-light h-[55vh] ...">   <!-- WorldMap, GeoChoropleth, GeoMapCanvas -->
```

Em `.theme-light` os tokens voltam aos valores claros (inclusive `--color-ring: #dc2626`). **Use
essa classe só para superfície de terceiro que impõe fundo claro** — nunca para "deixar uma seção
clara porque ficou bonito", que quebra a coerência do site.

Os utilitários decorativos da marca (`theme-dark-grid`, `theme-dark-glow`, `theme-dark-grain`)
mantêm o nome por compatibilidade, mas **funcionam em qualquer superfície**: são SVG/gradiente com
opacidade baixa. Hoje são usados pela hero.

#### A armadilha de opacidade da Tailwind v4.3.3 (já custou um bug)

Utilitário com modificador de opacidade emite **duas** declarações: um literal resolvido no build
(com o valor do `@theme`, não do escopo) e um `color-mix(var(--color-…))` dentro de
`@supports (color: color-mix(in lab, red, red))`. O literal **não** segue o escopo:

```css
.bg-muted\/30 { background-color: #f0edf14d; }   /* literal claro — ignora o escopo ✗ */
```

Isso já produziu uma **barra de navegação cinza-clara** sobre o corpo claro enquanto o resto da
página estava escuro. Se precisar de translucidez que siga o token, seja explícito:

```html
class="bg-[color-mix(in_oklab,var(--color-foreground)_6%,transparent)]"
```

Ou, melhor: **evite translucidez** e use `bg-muted` (superfície elevada) — foi o que resolveu a
barra. Sem modificador de opacidade, `bg-background`, `bg-primary` e `text-foreground` funcionam
normalmente porque referenciam a variável.


também usa o literal) a variável funciona normalmente.

## Escala e ritmo

- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (o navbar usa `max-w-[1400px]`).
- Seções: `py-12` (faixa), `py-16 sm:py-24` (seção narrativa).
- Título de herói: `text-4xl sm:text-5xl lg:text-6xl` (Barlow Condensed aguenta 6xl).
- Título de seção: `text-3xl sm:text-4xl`; card: `text-lg`.
- Corpo de leitura: `text-base`/`text-lg`; apoio: `text-sm text-foreground/70`;
  nota auxiliar: `text-xs text-foreground/70`.
- **Piso de alfa de texto: `/60`.** `/50`, `/40` e `/30` reprovam em AA no tema claro
  (`/50` = 3,32:1) e só servem para elemento decorativo. O portão acusa.
- Leitura longa (legais, metodologia, sobre): `.measure-readable` (68ch) — `max-w-3xl` é medida
  em `rem` e rende ~99 caracteres por linha, acima dos ~80 em que o olho perde o lugar.
- Raios: `rounded-lg` (controle), `rounded-xl` (card), `rounded-full` (chip).
- Sombra: no escuro prefira **borda** (`border-border`) a sombra para elevação; `shadow-md`/`lg`
  continuam valendo, mas sombra escura sobre fundo escuro é quase invisível.

## Componentes existentes (reutilize antes de criar)

`Navbar`, `Footer`, `HeroSection`, `ChampionsCarousel`, `ClubCard`, `RankingsTable`,
`TitleBars`, `CompareRadar`, `GeoMapCanvas`/`WorldChoropleth`, `DashboardStats`,
`PageHeading`, `ComingSoon`, `CookieConsentBanner`, `SearchBar`/`GlobalSearch`.

Padrão de card do acervo: `rounded-xl border border-border bg-muted p-5` +
`hover:border-primary/60 transition-colors duration-200` (elevação por borda, não por sombra).

**Gráficos (Recharts): use `@/lib/chart-theme`.** O Recharts não lê o nosso tema: `Tooltip` e
`Legend` trazem fundo branco inline (vira um retângulo branco no meio do gráfico escuro) e as
grades eram `#00000018` fixo. `CHART_TOOLTIP_STYLE`, `CHART_LEGEND_STYLE`, `CHART_GRID_PROPS` e
`CHART_SERIES_A/B` resolvem — e as duas séries são matizes da marca (vermelho × dourado), não azul
fora do design system.

## Regras invioláveis

1. **Toda interatividade é `<Link>`, `<button>` ou `<a>`** — nunca `div` clicável com `onClick`.
2. **Estado de foco visível** — não remova o `:focus-visible` global.
3. **Empty-honesto** — dado ausente vira lacuna declarada, nunca número/nome inventado
   (ver `conversion-copy` e `docs/DECISOES.md`). Placebo visual (contador falso, badge "novo"
   sem dado) é defeito, não estilo.
4. **i18n** — nenhum texto literal na tela: toda string visível passa por dicionário ou
   módulo aditivo `apps/web/src/i18n/wsC*.ts` (ver skill `web-accessibility-wcag`, seção i18n).
5. **`prefers-reduced-motion`** — animação é enfeite: o conteúdo precisa existir sem ela.
6. **Sem `mix-blend-mode`, `filter: blur()` grande ou gradiente animado** em texto: degrada
   contraste e custa GPU em mobile.

## Como validar

```bash
pnpm --filter web typecheck && pnpm --filter web lint
node apps/web/tmp-shot.mjs http://localhost:3210/ <nome>   # se o utilitário existir
```

Depois olhe o PNG: hierarquia, contraste, corte em 390 px e em 1440 px. Skill
`visual-qa-playwright` traz o procedimento completo.
