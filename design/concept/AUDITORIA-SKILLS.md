# Auditoria pelas cinco skills externas

> Busquei as skills de verdade (README + SKILL.md), não o que eu supunha que elas diziam. O
> resultado foi pior para o conceito do que a auditoria anterior: as regras do **Taste Skill v2**
> derrubam a premissa do sistema.

---

## 1. O que cada skill entregou

| Skill | O que consegui aplicar | O que não se aplica |
|---|---|---|
| **Taste Skill v2** (`design-taste-frontend`) | **as 22 regras de "house rules"**, que são objetivas | `draw.mjs`/`inspect.mjs` — exigem página em HTML, não `.figcraft` |
| **Emil Kowalski** (`emil-design-eng`) | o **formato de revisão obrigatório** e o **contrato de movimento** | as regras de animação valem para código; o conceito é estático |
| **Impeccable** | os princípios do detector (fonte superusada, gradiente, texto minúsculo, padding apertado) | o CLI `npx impeccable detect` roda em JSX/CSS, não no FigCraft |
| **FigmaToCode** | conceito: o arquivo de design é a fonte e o código é gerado a partir dele | não é uma skill de auditoria; não instala nada |
| **Playwright** | já instalada no projeto (`visual-qa-playwright`) | não roda em `.figcraft` — precisa de página renderizada |

---

## 2. As violações — no formato exigido pela skill do Emil

| Antes (meu conceito) | Depois | Por quê |
|---|---|---|
| `kicker()` em caixa alta, 10px, tracking +2,2, **acima do título de toda página** | cabeçalho de seção em caixa baixa, 12,5px, peso 600, tracking 0 | "No eyebrows — no small label above a heading" + "no tiny uppercase letter-spaced labels" |
| Fio de 2px atravessando a página para separar **todas** as seções | sem fio; separação por espaço, cabeçalho e escala | "No thin rules — no hairline dividers". Fio **de tabela** continua (tabela real é exceção declarada) |
| Rótulo do número-âncora em caixa alta, 10px, tracking +2,0 | caixa baixa, 11px, sem tracking | mesma regra dos tiny tracked caps |
| "1 · Liga", "2 · Copa", "3 · Torneio", "4 · Supercopa" | "Liga", "Copa", "Torneio", "Supercopa" | "No index numbering — no 01 / 02 / 03" |
| "1 · Fontes" … "10 · Versionamento" na Metodologia | "Fontes" … "Versionamento" | idem |
| Home com **6 cartões idênticos** em grade 3×2 | *(pendente — ver §4)* | "No rows of identical cards" |
| Clube 2100px de altura com conteúdo até 1600 | *(pendente — ver §4)* | "No blank stretches taller than about half a screen" |

### Números da correção

Rodando o normalizador nas 22 telas (**2.992 camadas**):

| Correção | Aplicações |
|---|---|
| cor de texto (`#be123c` → `#9f1239`) | **104** |
| tamanho abaixo do piso (→ 10px) | **241** |
| medida de linha (→ 68ch) | **155** |
| tracking em texto ≤ 11px (→ 0) | **157** |
| eyebrows restantes | **0** |
| fios de seção restantes | **0** |

---

## 3. O que a skill me obrigou a admitir

**A premissa do "FICHA" era a violação.** Eu escrevi, em documento, que *"o fio de 1px é a única
profundidade do sistema"*. O Taste Skill bane exatamente isso: *"No thin rules — no hairline
dividers... Space. A step in background tone."* E o kicker acima do título, que eu chamava de
"o que dá ritmo de impresso", é o **eyebrow** que a mesma skill proíbe pelo nome.

Ou seja: os dois dispositivos que eu apresentei como identidade do sistema são os dois
primeiros itens da lista de proibições. A unidade que eu buscava agora vem do **cabeçalho de
seção + escala tipográfica**, não de ornamento.

### A exceção de paleta, declarada

O Taste Skill bane *"yellow-cream ground with terracotta or rust"* como **paleta de assistente**.
A nossa é `#faf8f5` (papel quente) + `#94600a` (ocre) — que é literalmente essa descrição.

Ela não é paleta de assistente: é a marca do projeto, medida e documentada em `globals.css`, e a
própria skill manda preservar marca existente (`--keep palette,type`). **Mantenho, e declaro a
exceção** — que é o que a skill pede, em vez de trocar a identidade do produto para agradar um
detector.

---

## 4. O que ainda não está corrigido

Sendo explícito, porque a lista acima parece mais limpa do que é:

| Violação | Estado | Por que ficou |
|---|---|---|
| **Fileiras de cartões idênticos** | Home (6), Competições (4), Clube (5 troféus) | exige recompor as seções, não ajustar propriedade |
| **Trechos vazios** em Clube, Lendas, Admin | parcial (Competições corrigida: 1300 → 1160) | idem |
| **Sem "the one live thing"** | ausente | a skill pede uma coisa viva por página; nenhuma tela tem |
| **Sem movimento** | ausente por decisão | ver §5 |
| **Sem imagens reais** | ausente | a skill exige ≥4 imagens reais por página; o conceito usa desenho de vetor |

**O ponto mais desconfortável:** a skill diz *"At least four real pictures on the page... SVG
drawings do not count toward the floor"*. Meu conceito é **todo em vetor**. Pela régua dela, as
16 telas falham no piso de imagem — e isso não é ajuste de propriedade, é outra natureza de
arquivo.

---

## 5. O contrato de movimento (Emil Kowalski)

O conceito é estático, então as regras do Emil valem como **especificação para a implementação**.
Não as apliquei — não há o que animar num `.figcraft` — e não vou afirmar que apliquei.

O que fica escrito para quem implementar:

| Elemento | Duração | Curva | Por quê |
|---|---|---|---|
| Feedback de botão (`:active`) | 100–160ms | `--ease-out` | `scale(0.97)`; a interface confirma que ouviu |
| Tooltip, popover pequeno | 125–200ms | `--ease-out` | `transform-origin` no gatilho |
| Dropdown, select | 150–250ms | `--ease-out` | nada acima de 300ms em UI |
| Modal, drawer | 200–500ms | `--ease-drawer` | modal mantém origem central |
| Hero (raro, primeira visita) | pode ser longo | `--ease-in-out` | só onde é raro |

Curvas:

```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

Proibições que entram no código como teste:
- `transition: all` — sempre a propriedade exata
- `ease-in` em UI — nunca; começa devagar e o usuário olha o primeiro quadro
- `transform: scale(0)` — nada aparece do nada; começa em `scale(0.95)` com `opacity: 0`
- animação em ação de teclado (atalho, paleta de comando) — nenhuma
- `hover` sem `@media (hover: hover) and (pointer: fine)`
- keyframes em elemento disparado em rajada — usar `transition` (interrompível)
- `prefers-reduced-motion` — reduz movimento, mantém opacidade e cor

E o par de tema que combina com este conceito: **entrada mais lenta que a saída** (o sistema
responde rápido quando o usuário decide devagar).

---

## 6. Estado

| | |
|---|---|
| Páginas no FigCraft | **8** |
| Frames | **17** |
| Camadas | **~2.600** |
| Capturas | **23** em `design/concept/app/` |

Correções aplicadas nesta rodada: **104 cores · 241 tamanhos · 155 medidas · 157 trackings ·
0 eyebrows · 0 fios de seção · numeração removida**.

O que falta é estrutural, não cosmético: fileiras de cartões, vazios, uma coisa viva por página e
imagens reais.
