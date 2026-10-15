# Conceito visual — Almanaque dos Clubes

> Proposta de redesign. **Não é código de produção**: é a prancha de conceito, gerada com o
> **FigCraft** (CLI headless) a partir de um script versionado, com os tokens reais do design
> system. Cada decisão abaixo tem um motivo, e o que não foi validado está declarado no fim.

## Índice

| Arquivo | O que mostra |
|---|---|
| [01-home.png](01-home.png) | A dobra: hierarquia, prova com fonte, faixa de números, camada de exploração |
| [02-busca.png](02-busca.png) | A busca como **paleta de comando** — o acervo inteiro a uma tecla |
| [03-dados.png](03-dados.png) | Tabela densa: numeral tabular, pódio, procedência no rodapé |
| [04-sistema.png](04-sistema.png) | Tokens, escala tipográfica e os três motores de movimento |
| `almanaque-conceito.figcraft` | Arquivo nativo (abre no FigCraft) |

Reproduzir: `node plugins/almanaque-design/tools/concept-board.mjs .tmp/fig/concept.json`
e depois `figcraft-cli run .tmp/fig/concept.json --out concept.figcraft`.

---

## 1. Diagnóstico: por que a versão atual lê como básica

Não é falta de cor. Medindo a home em produção contra o acervo que ela representa:

| Sintoma | Evidência | Causa |
|---|---|---|
| O acervo **não se sente** | A hero mostra **1** campeão e **3** números para um acervo de **12.003 clubes · 1.932 competições · 70 rankings** | A dobra trata dado como enfeite, não como produto |
| Não há **por onde entrar** | Texto + carrossel + 6 feature cards. Nenhuma superfície que leve a um clube, era ou país | Falta a camada de exploração |
| Dado denso **espalhado** | Ranking, mapa e comparador vivem em páginas isoladas | Não há linguagem de dado compartilhada |
| Movimento **decorativo** | Reveals de entrada e um carrossel | O movimento não comunica estado nem relação |

O conceito ataca os quatro. A identidade — escuro editorial, Barlow, vermelho de sinal,
dourado de verificação — **não muda**: o que muda é a **ambição** dela.

## 2. As três ideias

### A. O acervo é a interface

A busca deixa de ser campo secundário na barra e passa a ser **o elemento mais largo da tela**,
com o tamanho declarado dentro dela (`Buscar 12.003 clubes, 1.932 competições, 70 rankings…`).
Ao focar, ela abre uma **paleta de comando** com resultados agrupados (clubes → competições),
cada linha com metadado e — sempre — o número **rotulado**: `36 / TÍTULOS`, nunca um `36` solto.

Dirigível por teclado (`↑↓ navegar · ⏎ abrir · ⌥K comparar · esc fechar`), o que torna "intuitivo"
uma propriedade verificável e não uma intenção.

### B. Procedência é estética, não rodapé

O cartão de prova mostra o campeão vigente **real** (Real Madrid · FIFA Club World Cup ·
Temporada 2023) e, na mesma altura dos olhos, a **fonte** (`FONTE · knowledge_graph · Wikidata ↗`).
A faixa de números dá a procedência de cada contagem (`WIKIDATA`, `RSSSF`, `PUBLICADOS`,
`AUDITADOS`). É o diferencial editorial do Almanaque virando elemento visual — e é o que
nenhum concorrente consegue copiar sem fazer o trabalho.

### C. Dado com hierarquia de placar

A tabela usa **numeral tabular** (`tnum`) para que as colunas não dancem entre linhas, pódio em
dourado, zebra sutil e a **posição como maior elemento da linha**. Rodapé com
`Fonte: tabelas finais RSSSF · fórmula cbf-2023-raw · publicado 13/10/2026` — a fórmula faz parte
da interface, não de uma página separada de metodologia.

## 3. Sistema visual

### Cor — cada token com papel declarado

| Token | Valor | Papel |
|---|---|---|
| `--color-background` | `#12100f` | fundo |
| `--color-surface` | `#1a1715` | superfície elevada (**novo**) |
| `--color-foreground` | `#f7f3ea` | texto |
| `--color-primary` | `#e8412f` | **sinal vivo**: CTA, filtro ativo, estado |
| `--color-secondary` | `#c9a227` | **verificado** e pódio |
| `--color-border` | `#6b625a` | hairline |

O vermelho aparece **poucas vezes e sempre no mesmo significado**. O dourado é reservado para
procedência e pódio — é o que impede os dois de virarem decoração.

### Tipografia — escala com função

| Papel | Fonte | Especificação |
|---|---|---|
| Display / número-herói | Barlow Condensed Bold | 96 / −1,4 tracking |
| Título de seção | Barlow Condensed Bold | 52 / −1 |
| Número em card | Barlow Condensed Bold | 38 · `tnum` |
| Corpo | Barlow Regular | 17 / 26 |
| Apoio | Barlow Regular | 13 / 20 |
| Rótulo-selo | Barlow | 10,5 caixa alta · tracking 1,6 |

### Profundidade — sem os tells proibidos

A camada quente de fundo é um gradiente **amplo e de opacidade 0,03–0,05**, não um halo.
Isso é deliberado: `radial-spotlight-glow` e `dark-glow` estão na lista de anti-padrões que o
`impeccable detect` reprova, e a decisão já registrada no repo é que esses tells não entram.

### Movimento — três motores, um dono cada

| Motor | Papel | Especificação |
|---|---|---|
| **GSAP** | revela na dobra | `power4.out` · 0,6s |
| **motion/react** | spring de gesto e saída | stiffness 320 · damping 30 |
| **CSS** | estado, hover, foco | 0,2s `ease-out` |

Nunca `ease-in` nem `transition-all` (o portão `ui:audit:ci` bloqueia), sempre com
`prefers-reduced-motion` em JS — a regra do CSS **não** alcança GSAP nem WAAPI.

## 4. O que cada ferramenta das 25 contribuiu

O conceito não é "inspirado em 25 links": cada uma entrou com um papel específico, e as que
**não** entraram também estão declaradas.

| Ferramenta | Como entrou no conceito |
|---|---|
| **emilkowalski/skills** (MIT, adotado) | `motion-craft`: as durações, curvas e o dono de cada motor. `motion-review`: os dez padrões não negociáveis que a prancha respeita |
| **pbakaus/impeccable** (Apache-2.0, usado) | O que **não** fazer. A remoção dos halos radiais e o cuidado com `tiny-text` vêm das 59 regras dele |
| **Playwright** (adotado) | Ferramenta de medição: foi ela que mediu o alfa de texto, o overflow e as colisões do próprio conceito |
| **GSAP** + **motion/react** (instalados) | Os dois primeiros motores da tabela de movimento |
| **ObsidianUI** (MIT, registry nº 1) | Referência de composição para palette e tabela — mesma stack (Next 16 + React 19 + Tailwind v4) |
| **Bklit UI** (MIT, registry data-viz) | Referência de chart sério, caso o Recharts não dê conta na fase de implementação |
| **loading.daniasyrofi.com** (MIT) | Onde buscar o estado de carregamento das rotas de dado, atrás dos nossos tokens |
| **React Bits** (MIT + Commons Clause) | Só o subconjunto GSAP, que já temos — nada de three.js/ogl |
| **Refero** (referência pura) | Método "sintetizar sem copiar" aplicado ao desenho da paleta de comando |
| **ui-ux-pro-max-skill** (MIT) | O checklist de pré-entrega |
| **FigmaToCode** (GPL-3.0) · **21st.dev** (proprietária) · **Kobra** (paga) · **Replit** | **Não usadas** — licença incompatível, termos restritivos ou sem ganho que pague a superfície. Mesmo veredito já registrado em `docs/UI-UX-TOOLKIT.md` |
| **FigCraft** | A ferramenta desta prancha: CLI headless, 1.104 comandos, exporta SVG/PNG/nativo. Não estava nas 25 — entrou por pedido do Operador |

## 5. Como implementar (quando aprovado)

1. **Tokens primeiro**: criar `--color-surface` e a escala `fg70`/`fg55` como tokens (hoje são
   `color-mix` repetidos), porque metade do conceito depende deles.
2. **Primitivos**: `NumberHero` (condensed + `tnum`), `SourceLine` (rótulo + valor + link),
   `DataTable` (colunas com largura declarada), `CommandPalette`.
3. **Uma tela por vez**, com o gate a cada fecho: `pnpm run ui:audit:ci`,
   `run.mjs contrast`, `impeccable detect`.
4. **Motion por último** — e sempre atrás de `prefers-reduced-motion` em JS.

## 6. O que foi medido — e o que não foi

### Medido (calculado, não estimado)

Geometria da prancha: **0 colisões e 0 estouro de quadro** nos quatro quadros, verificado pelo
`measure-concept.mjs` (lê a caixa real de cada texto pelo `node.get` do FigCraft). Foram
**197 colisões** no primeiro render — o número caiu a zero só porque a geometria passou a vir de
medição em vez de estimativa.

Contraste das tintas usadas no quadro de sistema:

| Combinação | Razão | Piso AA (4,5) |
|---|---|---|
| `#f7f3ea` sobre `#12100f` (fundo) | **17,13:1** | passa |
| `#f7f3ea` sobre `#1a1715` (superfície) | **16,11:1** | passa |
| `#1a0e0b` sobre `#e8412f` (sinal vivo) | **4,70:1** | passa |
| `#1a0e0b` sobre `#c9a227` (verificado) | **7,81:1** | passa |
| `#f7f3ea` sobre `#6b625a` (hairline) | **5,39:1** | passa |

**Correção de um erro meu:** o primeiro rascunho usava preto puro como tinta de todas as
amostras. Calculei depois de escrever: preto sobre o vermelho dá **5,23:1** e sobre o dourado
**8,68:1** — os dois **passavam**. Quem reprovava era o hairline, com **3,52:1**. A troca para o
token `onPrimary` continua correta, mas o motivo era outro do que eu havia declarado.

### Não validado — declarado

- **Isto é uma prancha estática.** Não há hierarquia de foco, leitor de tela nem alvo de toque
  medidos; isso se valida na implementação, com Playwright.
- **Contraste só foi medido nas tintas do quadro de sistema.** As combinações novas das outras
  telas (`fg55` sobre `surface`, dourado sobre superfície) ainda **não** foram medidas no
  navegador — os tokens são verificados, as combinações novas não.
- **A Barlow do FigCraft não é a mesma da web.** Medi: `O futebol é eterno.` a 96px ocupa **641px**
  no FigCraft. Na web a fonte vem do Google Fonts, com métricas próprias — as larguras da prancha
  são referência, não contrato.
- **Sem interação real**: a paleta de comando, a tabela e os cards são estados desenhados, não
  componentes funcionando. Nada foi clicado.
- **Responsivo não está na prancha.** Os quatro quadros são 1440px. As quebras de 390 e 768
  precisam ser desenhadas e medidas antes de implementar.
- **`prefers-reduced-motion` não se aplica aqui** — a prancha é estática. A especificação de
  movimento está no quadro de sistema, mas quem a valida é o portão `ui:audit:ci` na implementação.
