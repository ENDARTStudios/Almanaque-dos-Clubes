# Toolkit de UI/UX — curadoria e veredito das 25 ferramentas

Cada linha foi **verificada em fonte primária** (LICENSE, `package.json`, registry JSON, docs do
próprio projeto ou GitHub API em 2026-10-12) — não por reputação. O veredito é para **este**
projeto: Next.js 16 · React 19 · Tailwind v4 · design system próprio (tokens `@theme` + Barlow) ·
sem segundo sistema de design.

Legenda do veredito:

| Veredito | Significa |
|---|---|
| **ADOTADO** | está no repo e em uso, com fonte canônica no plugin `almanaque-design` |
| **INSTALADO** | já era dependência do projeto (`package.json`) |
| **OPCIONAL** | vale usar como passo externo; não vira dependência nem código |
| **REGISTRY** | só o que for copiado, atrás dos nossos tokens, com licença que permite |
| **REFERÊNCIA** | olhar para ideias; **não** copiar (licença proprietária ou de terceiros) |
| **NÃO USAR** | problema de licença, de stack ou de risco |

---

## 1. Skills e tooling de agente

| Ferramenta | O que é | Licença | Veredito | Como usamos |
|---|---|---|---|---|
| **[emilkowalski/skills](https://github.com/emilkowalski/skills)** (Emil Kowalski) | 17 skills de design engineering (Markdown) para agentes: animação, performance, review, escolha de biblioteca, polish mobile | **MIT** (GitHub API, `spdx_id: MIT`) | **ADOTADO** | Vendorizamos e adaptamos **4** como fonte canônica do plugin: `motion-craft`, `motion-review`, `ui-library-choices` (+ o papel `motion-critic`). É a maior aquisição de qualidade desta rodada — a régua de animação do repo passou a existir. |
| **[pbakaus/impeccable](https://github.com/pbakaus/impeccable)** (Paul Bakaus) | Skill + CLI com **detector determinístico de 59 regras** ("anti-slop"): contraste no DOM renderizado, `icon-tile-stack`, `hero-eyebrow-chip`, `pulsing-dot`, `dark-glow`, `overused-font`, `ai-color-palette`… Também extensão VS Code e distribuição oficial para **DeepSeek Harness** | **Apache-2.0** (GitHub API) | **OPCIONAL + USADO** | Rodamos `npx impeccable@latest detect <url>` como passo externo de auditoria. **Exige rede** (baixa o engine na primeira execução) e tem telemetria com opt-out (`DO_NOT_TRACK=1`). Foi ele que achou os 26 defeitos na produção. **Não** entrou como dependência. |
| **[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)** | Coleção de Agent Skills com "dials" de variância/intensidade/densidade e uma `redesign-skill` (auditar → corrigir hierarquia/espaço) | **MIT** | **REFERÊNCIA** | Método útil de hierarquia e espaço, mas tenta impor linguagem visual própria (proíbe caractere, prescreve biblioteca). O `design-critic` já cobre o mesmo terreno sem o conflito. |
| **[ui-ux-pro-max-skill](https://ui-ux-pro-max-skill.nextlevelbuilder.io/)** (NextLevelBuilder) | Skill + base CSV pesquisável (`style`, `typography`, `color`, `chart`, `ux`, `icons`) + scripts Python que geram "design system" com anti-padrões e checklist | **MIT** (tier Premium pago à parte) | **REFERÊNCIA** | O checklist de pré-entrega é bom; o gerador de design system é redundante (já temos o nosso). Não vale mais uma dependência de Python no repo. |
| **[FigmaToCode](https://github.com/bernaferrari/FigmaToCode)** | **Plugin do Figma** que transpila nós de design para Tailwind/HTML/Flutter/SwiftUI | **GPL-3.0** | **NÃO USAR** | Não avalia design (gera código) e é copyleft: copiar código do plugin para o produto tem implicação. O status do *output* gerado não está documentado com clareza — **NÃO VERIFICADO**. Handoff de Figma não é o gargalo do projeto. |

## 2. Bibliotecas de animação

| Ferramenta | Licença | Veredito | Situação no repo |
|---|---|---|---|
| **[GSAP](https://gsap.com/)** | Licença "no charge" (core e plugins gratuitos mesmo para uso comercial); o tier pago só se aplica a produto que **compete** com a GSAP | **INSTALADO** | `gsap@3.15.0`, dono dos reveals da home (`useGsap.ts`). Não compete ⇒ uso liberado, com atribuição no `package.json`. |
| **[Motion](https://motion.dev/)** (ex-Framer Motion) | **MIT** | **INSTALADO** | `motion@13.1.0`. **Importe de `motion/react`** — `framer-motion` não está instalado e importar dele é bloqueio. É o motor de spring/gesto/exit. |
| **[Anime.js](https://animejs.com/)** | **MIT** | **INSTALADO, sem uso** | `animejs@4.5.0` está no `package.json` e **não é importado em nenhum arquivo**. É dívida: três motores bastam (CSS/WAAPI, Motion, GSAP). Decidir: remover ou justificar. |

## 3. Teste e QA

| Ferramenta | Licença | Veredito | Como usamos |
|---|---|---|---|
| **[Playwright](https://github.com/microsoft/playwright)** | **Apache-2.0** | **INSTALADO + ADOTADO** | Já era dependência com `playwright.config.ts` e `tests/e2e/`. Estendemos: 4 utilitários versionados em `plugins/almanaque-design/tools/` (`shot`, `audit`, `contrast`, `locales`) + o portão `audit-motion.mjs`. O `contrast` mede o **pixel renderizado** (composição em canvas, cobre alfa e `oklab`). |
| **[Replit](https://replit.com/)** | Plataforma freemium (Starter grátis, Core US$20/mês, Pro US$100/mês; Agent cobrado por créditos). Licença do **output** não verificada | **NÃO USAR** | Ambiente de prototipagem em nuvem. O gargalo do projeto é conteúdo e curadoria de dados, não velocidade de protótipo; e o `apps/web` já roda local. Sem ganho que pague mais uma superfície. |

## 4. Registries de componentes (modelo shadcn: copiar código, não instalar pacote)

Todos os quatro exigem `components.json` (config do shadcn) — que este repo **não tem** — e o
código entra no seu repositório, atrás dos seus tokens.

| Ferramenta | Licença | Veredito | Por quê |
|---|---|---|---|
| **[ObsidianUI](https://temp.obsidianui.dev/)** | **MIT** (GitHub API) | **REGISTRY — 1º da fila** | É o mais alinhado dos quatro: **Next 16 + React 19 + Tailwind v4 + Motion** declarados. Registry público, `llms.txt`, MCP local. |
| **[KokonutUI](https://kokonutui.com/)** | **MIT** | **REGISTRY — 2º** | 100+ componentes, usa `motion/react` e `useReducedMotion()`. Alguns itens dependem de Radix e do `button` do shadcn ⇒ exigem adaptação. |
| **[Bklit UI](https://bklit.com/)** | **MIT** | **REGISTRY — só data-viz** | Charts de verdade (choropleth, séries com brush), tema por CSS vars, a11y com `aria-live`. Custo: puxa `@base-ui/react` + `@visx/*` + `d3-*` por gráfico. Só vale se o Recharts não der conta. |
| **[React Bits](https://reactbits.dev/)** | **MIT + Commons Clause** (não pode revender/redistribuir os componentes) | **REGISTRY — só o subconjunto GSAP** | Uso no produto é permitido; muitos itens puxam three.js/ogl/rapier (peso que não queremos). Só as animações baseadas em GSAP, que já temos. |
| **[Aceternity UI](https://ui.aceternity.com/)** | **LICENÇA NÃO ENCONTRADA** nos componentes gratuitos (só o CLI npm é MIT) | **REFERÊNCIA** | Sem licença clara não entra em produto comercial. A doc da API ainda declara "Framer Motion" e o registry lista `motion` — ambíguo. Ideias de timeline e slider sim; código não. |
| **[Componentry](https://componentry.dev/)** | **MIT** | **REFERÊNCIA** | MIT, mas importa `framer-motion` direto (pacote que não usamos) e é quase todo efeito WebGL decorativo. |
| **[21st.dev](https://21st.dev/)** | **Proprietária** — "sole and exclusive property of their respective authors and 21st Labs Inc."; proíbe scraping, treino de IA e redistribuição | **NÃO USAR** | Risco jurídico real num produto que já publica política de direitos autorais. Serviria no máximo como vitrine visual. |

## 5. Referência visual e micro-interações

| Ferramenta | O que é | Licença | Veredito |
|---|---|---|---|
| **[Refero](https://refero.design/)** | Galeria de screenshots de produtos reais + flows; tem plugin Figma, MCP e skill própria | Screenshots e marcas **permanecem dos donos** | **REFERÊNCIA PURA** — research-first. A própria skill do produto diz "sintetizar sem copiar". |
| **[metal.jakubantalik.com](https://metal.jakubantalik.com/)** | Shader WebGL "liquid metal" para botões React | **MIT** (`Jakubantalik/metal-fx`) | **REFERÊNCIA** — conceito interessante para um CTA, mas é WebGL: custo alto para o ganho. |
| **[loading.daniasyrofi.com](https://loading.daniasyrofi.com/)** | Coleção de loaders React/HTML copiáveis, com playground e respeito a reduced motion | **MIT** (cabeçalho do `indicator.js`) | **REGISTRY** — bom lugar para o estado de carregamento (rankings, mapa), atrás dos nossos tokens. |
| **[bencho.dev](https://bencho.dev/)** | 48 micro-interações React + aba "Finds" | Blocks **MIT** (declarado no `llms.txt`; página `/license` não é legível sem JS — **NÃO VERIFICADO**); *Finds* são de terceiros | **REGISTRY** (blocks apenas) |
| **[kobra.systems](https://kobra.systems/)** | 100+ componentes via shadcn CLI | **Comercial**: 10 grátis "personal use only"; Individual US$199 / Teams US$599; proíbe redistribuir e treinar modelo | **NÃO USAR agora** — exige `KOBRA_TOKEN` e licença paga para uso comercial. Se um dia fizer sentido, é decisão de compra do Operador. |

---

## O que desta rodada virou código ou decisão

1. **Skills vendorizadas** (`plugins/almanaque-design/skills/`): `motion-craft`,
   `motion-review`, `ui-library-choices` + o papel `motion-critic` — adaptadas de
   emilkowalski/skills (MIT) para a realidade do repo (`motion/react`, GSAP como dono dos
   reveals, `prefers-reduced-motion` que a regra de CSS não alcança).
2. **Portão automático** `plugins/almanaque-design/tools/audit-motion.mjs` — transforma a régua
   em verificação: `transition-all`, `scale(0)`, `ease-in`, animação de layout, import de
   `framer-motion`, `will-change` amplo, hover sem gate, duração > 300 ms, GSAP sem
   reduced-motion e alfa de texto abaixo do piso de contraste. `--ci` falha o build.
3. **Auditoria externa** com `impeccable detect` — passou a ser um passo recomendado no fecho
   de qualquer tela (skill `visual-qa-playwright`).
4. **Correções aplicadas** (todas medidas, não estimadas):
   - `transition-all` → propriedade nomeada: **38 ocorrências** em 18 arquivos (o portão agora
     acusa 0 bloqueios).
   - Tema claro: `--color-foreground` de `#7f1d1d` para `#340808` — a antiga cor dava
     **9,16:1 sólida mas desabava na escala de alfa** que o app usa (`/60` = 3,46:1,
     `/50` = 2,72:1, `/40` = 2,17:1). Com a nova, `/60` = 4,72:1 e `/70` = 6,61:1.
   - Piso de alfa de texto: `/30`, `/40`, `/50` → `/70` em 46 arquivos.
   - Rodapé: `text-white/40|50|60` → `/70|80|90` (era 2,78:1; agora 8,92–14,37:1) e a marca
     saiu de `text-primary` (2,1:1 sobre o fundo escuro) para branco.
   - Placeholder de busca: cor explícita + `placeholder:opacity-100` (o navegador aplicava
     opacidade própria e derrubava para 3,5:1).
   - Anel de foco na camada escura: dourado sobre o CTA vermelho dava **1,66:1**; agora a folga
     de 1 px na cor do fundo separa o anel (7,84:1).
   - Removidos dois tells de "UI gerada por IA": o **tile de ícone 48 px acima do h3** nos seis
     feature cards (virou ícone em linha com o título) e o **chip minúsculo em caixa alta acima
     do H1** (a informação virou a primeira frase da promessa). Também saiu o ponto pulsante
     decorativo.
   - `useGsap.ts`: passou a respeitar `prefers-reduced-motion` (a regra de CSS não alcança GSAP)
     e o hover por GSAP ficou gated por `(hover: hover)`.
5. **Resultado medido na home local:** `impeccable detect` de **26 achados → 0** (exit 0);
   `/clubs` de 6 → 0; contraste renderizado do hero: **0 reprovações** em 17 pares.

## Como repetir a verificação

```powershell
# 1. portão offline (sem rede, roda em CI)
node plugins/almanaque-design/tools/audit-motion.mjs --ci

# 2. contraste do pixel renderizado + screenshots + medições
node plugins/almanaque-design/tools/run.mjs contrast http://localhost:3210/
node plugins/almanaque-design/tools/run.mjs shot     http://localhost:3210/ after
node plugins/almanaque-design/tools/run.mjs audit    http://localhost:3210/

# 3. auditoria externa de 59 regras sobre o DOM (exige rede; telemetria desligada)
$env:DO_NOT_TRACK="1"
npx --yes impeccable@latest detect https://almanaquedosclubes.com/ --no-advisory
```

## Ainda em aberto (honesto)

- **Resolvido nesta rodada:** `--color-primary` como texto. Em vez de escurecer a marca, o
  **papel** foi separado: `--color-primary-ink: #b91c1c` é o token de texto e `--color-primary:
  #dc2626` continua sendo o de preenchimento. Ver `D-2026-10-12-t534-primary-ink`.
- **Resolvido nesta rodada:** `animejs` **removido** (dependência, lockfile e `node_modules`).
  Sobraram os dois motores que têm dono declarado: GSAP e `motion/react`.
- `line-length` nas páginas de texto corrido: tratado com `.measure-readable` (68ch) em
  `LegalDocument`, `ContentDocument`, `/metodologia`, `/direitos-titular`, `/direitos-autorais`.
  Resta **1 ocorrência de ~89 caracteres** em `/direitos-titular` (texto dentro do painel de
  formulário) — cosmético, não é falha de contraste.
- Componentes de registry (ObsidianUI primeiro) só entram quando houver necessidade concreta e
  `components.json` configurado para o nosso Tailwind v4.
- Licenças não verificadas: output gerado pelo Replit, texto completo de `/license` do
  bencho.dev, itens Pro/All-Access dos registries pagos.
