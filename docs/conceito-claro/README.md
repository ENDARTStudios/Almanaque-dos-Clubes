# Conceito visual — versão CLARA (paleta vinho)

> Prancha de conceito, gerada com o **FigCraft** a partir de scripts versionados.
>
> **Estado:** a paleta vinho **foi implementada** no `apps/web` (ver o PR do tema claro). O que
> continua sendo desenho, e não código, são os quadros de busca e de sistema: a paleta de
> comando do quadro 03 **não** foi construída.

| Arquivo | O que mostra |
|---|---|
| [01---home.png](01---home.png) | A dobra em fundo claro: hierarquia, prova com fonte, faixa de números, prateleiras |
| [02---tabela.png](02---tabela.png) | Tabela densa: numeral tabular, pódio, procedência no rodapé |
| [03---busca.png](03---busca.png) | A busca como paleta de comando, com o acervo a uma tecla — **não implementada** |
| [04---sistema.png](04---sistema.png) | A paleta com o contraste medido, tipografia e movimento |
| [comparador-de-paletas.png](comparador-de-paletas.png) | Os seis esquemas que originaram a escolha do vinho |
| [estados-comparador.png](estados-comparador.png) | As duas famílias de cor de estado (fria e quente) |
| [estados-02---em-contexto.png](estados-02---em-contexto.png) | Os estados num painel real: tabela, alerta e barra de progresso |
| `almanaque-conceito-claro.figcraft` | Arquivo nativo (abre no FigCraft) |

Reproduzir:
`node plugins/almanaque-design/tools/concept-board-light.mjs .tmp/fig/light.json`
e depois `figcraft-cli run .tmp/fig/light.json --out light.figcraft`.

---

## O que muda em relação à versão escura

A versão clara **não é a escura com outras cores**. Três coisas mudam de estrutura:

| | Versão escura | Versão clara |
|---|---|---|
| **Elevação** | O cartão se separa do fundo por **borda** — a diferença de fundo é 1,06:1 e não se vê | Separa-se por **branco + sombra suave**. Borda aqui deixaria a tela com cara de planilha |
| **Fundo da dobra** | Gradiente quente (glow) atrás do texto | **Faixa tonal discreta**. Em fundo claro, gradiente vira mancha suja |
| **Tinta de destaque** | O vermelho da marca serve para texto e preenchimento | A cor quente vive **só no preenchimento** (botão, chip, barra); texto e link usam o par terracota escuro |

## O ponto que decide a paleta

O vermelho vivo da marca (`#e8412f`) **não serve como texto em fundo claro** — foi medido
antes de desenhar:

| Combinação | Razão | Veredito |
|---|---|---|
| `#e8412f` sobre branco | **4,02:1** | **REPROVA** como texto |
| `#e8412f` sobre papel `#faf8f5` | **3,79:1** | **REPROVA** |

**A consequência para o desenho:** o vermelho vivo é claro demais para *ser* texto em fundo
claro. Ele continua vivo — no botão, no chip ativo, na barra de acento, no número de destaque —
exatamente onde ele **preenche** em vez de escrever.

## As três cores foram dessaturadas

A primeira versão desta prancha usava `#e8412f` (saturação **80%**), `#b91c1c` (**74%**) e
`#a16207` (**92%**). As três **gritavam** na tela, e essa foi a crítica recebida. Agora ficam em
42–45%, no mesmo matiz quente — terracota e bronze no lugar de vermelho e ouro:

| Papel | Antes | Agora | Saturação |
|---|---|---|---|
| Preenchimento (botão, chip, barra) | `#e8412f` | **`#ae5c47`** terracota | 80% → **42%** |
| Texto e link | `#b91c1c` | **`#8d4435`** terracota escuro | 74% → **45%** |
| Verificado / pódio | `#a16207` | **`#7a5e2e`** bronze | 92% → **45%** |

### A consequência não óbvia: a tinta dentro do botão inverte

Dessaturar **não é só "deixar mais fraco"** — muda qual tinta cabe dentro do preenchimento:

| Tinta dentro do botão | Sobre `#e8412f` (vivo) | Sobre `#ae5c47` (terracota) |
|---|---|---|
| Quase-preto `#1a0e0b` | 4,70:1 aprovado | **3,98:1 REPROVA** |
| Branco `#ffffff` | 4,02:1 REPROVA | **4,75:1 aprovado** |

Ou seja: a troca de saturação **inverteu** qual texto é legível no botão. Nesta paleta o texto
do botão é **branco** — o oposto da versão anterior.

## Paleta

| Token | Valor | Papel | Contraste medido |
|---|---|---|---|
| `background` | `#faf8f5` | papel quente | — |
| `surface` | `#ffffff` | cartão (elevação por branco) | — |
| `surface-2` | `#f2efea` | cabeçalho de tabela, selo | — |
| `foreground` | `#111111` | texto forte | **17,81:1** |
| `ink-2` | `#57534e` | secundária | **7,20:1** |
| `ink-3` | `#6b6560` | terciária (rótulo 11px) | **5,42:1** · 5,01 na faixa |
| `primary` | `#ae5c47` | **preenchimento**: botão, chip, barra | — |
| `on-primary` | `#ffffff` | texto **dentro** do preenchimento | **4,75:1** |
| `primary-ink` | `#8d4435` | **texto e link** | **6,58:1** no papel · 6,08 na faixa |
| `secondary` | `#7a5e2e` | **verificado** e pódio | **5,71:1** no papel · 5,28 na faixa |
| `border` | `#e0dad3` | hairline | — |

Todas as tintas passam em AA **nas superfícies em que aparecem** — inclusive sobre a faixa
`#f2efea`, que é mais escura que o papel e por isso é onde o contraste costuma cair. Verificado
por cálculo, não por olho.

## O que NÃO muda

Barlow Condensed para título e número, Barlow para corpo e apoio. Numeral **tabular** em toda
coluna de dado. O número sempre com rótulo. A procedência ao lado do dado. Os três motores de
movimento (GSAP nos reveals, `motion/react` no gesto, CSS no estado). A estrutura de
informação: as prateleiras, a faixa de números, a tabela com colunas declaradas.

## O que isto custa para virar realidade

O `globals.css` já tem a paleta clara escrita em `.theme-light` (hoje usado só pelos tiles do
OpenStreetMap). Então virar o site para claro **não é começar de zero**: é

1. transformar a paleta clara atual na paleta desta prancha (a de hoje usa vermelhos mais
   claros, sem a escala `ink-2`/`ink-3` calibrada e sem as cores dessaturadas);
2. trocar o padrão: claro passa a ser o tema base e o escuro vira a exceção declarada;
3. revisar elevação e sombra nos componentes que hoje usam borda para se separar;
4. remover o glow da dobra, que em fundo claro vira mancha;
5. **inverter a tinta dentro de todo botão e chip preenchido** — nesta paleta ela é branca, e
   não quase-preta;
6. rodar os portões (contraste medido no pixel, `ui:audit:ci`, `impeccable detect`).

O item 3 é o que dá mais trabalho: são os mesmos componentes, mas a **regra de elevação é
outra** — e é isso que faz a versão clara parecer desenhada em vez de invertida. O item 5 é o
mais fácil de esquecer e o mais visível se esquecido.

## Não validado

- **É uma prancha estática.** Sem foco, leitor de tela, alvo de toque ou comportamento real.
- **Responsivo não está desenhado**: os quatro quadros são 1440px.
- **A sombra não foi medida** — ela não afeta contraste de texto, mas afeta a percepção de
  profundidade, e isso só se avalia em tela de verdade.
- **O ouro `#94600a` tem 4,65:1 sobre a faixa `#f2efea`**, o seu pior caso na prancha. Passa,
  mas com menos margem que o resto — é o valor que mais perto do piso chegou em toda a paleta,
  e por isso o rótulo de 11px do cartão de prova usa vinho e não ouro.
- **A dessaturação intermediária foi feita em HSL**, não em OKLCH. A paleta final (vinho) veio
  de valores escolhidos no comparador e medidos um a um, então isso deixou de ser um limite
  dela — mas um ajuste perceptual fino de luminosidade entre as três cores ainda pediria OKLCH.

---

# Estados semânticos

Ramo próprio da prancha, porque as cores de **estado** (sucesso, aviso, perigo, informação)
foram recalibradas **por cálculo** na inversão para o claro e nunca tinham sido vistas
renderizadas — o ponto que ficou declarado como o mais frágil.

Os arquivos: [estados-comparador.png](estados-comparador.png) (as duas famílias lado a lado) e
[estados-02---em-contexto.png](estados-02---em-contexto.png) (num painel real, com tabela,
alerta de topo e barra de progresso). Reproduzir:
`node plugins/almanaque-design/tools/state-board.mjs .tmp/fig/estados.json`.

## O que a medição mostrou

As quatro cores passam em AA com folga, nas duas superfícies:

| Papel | Badge (tinta sobre superfície) | Tinta no papel |
|---|---|---|
| Sucesso | 5,63:1 | 5,84:1 |
| Aviso | 5,33:1 | 5,77:1 |
| Perigo | 5,30:1 | 6,10:1 |
| Informação | 5,49:1 | 6,32:1 |

## A pergunta que sobrou não era de contraste

Ao **ver** a prancha apareceu outro problema: o verde, o azul e o vermelho de convenção são
**frios**, e o site inteiro é quente (papel quente, vinho, ouro). Na mesma tela eles parecem
**enxertados**, de outro design system.

É o **mesmo tipo de defeito do painel de auth quase-preto**: o detector de contraste não vê,
porque não é problema de leitura. É de coerência. Por isso as duas famílias foram desenhadas e
comparadas:

| | O que é | Custo |
|---|---|---|
| **A · Fria — ESCOLHIDA** | Verde, âmbar, vermelho e azul de convenção | Coesão com o papel quente |
| B · Quente | Oliva, âmbar, telha e petróleo — mesma família do vinho | Curva de aprendizado: verde e vermelho continuam ali, mas com outro tom |

**Decisão do Operador: família A.** O critério foi o risco cognitivo: as cores de estado
aparecem em **badge pequeno** e **painel de admin**, e convenção forte em alerta vale mais que
coesão de matiz. A família B fica documentada como alternativa **avaliada e recusada** — não
como pendência.

## O que esta rodada corrigiu no código

**`--color-info-surface` não existia.** O tema claro tinha `--color-info-ink: #1d4ed8` **sem** a
superfície correspondente, então `bg-info-surface` simplesmente não existia. A falta era
silenciosa porque nenhum componente usa o par de informação ainda — mas é um par **incompleto**
numa escala que declara ter quatro estados, e o primeiro componente que precisasse dele
escreveria um hex solto. Criado com `#dbeafe` (5,49:1 sobre a tinta de informação).

## Uma correção ao que eu havia afirmado

Eu tinha dito que `bg-foreground/5 text-foreground/70` (o badge neutro) **reprovava** em AA.
**Medi o composto real e está errado**: o `/70` cai sobre o fundo **já composto** pelo `/5`, não
sobre o papel. O par rende **6,54:1** e passa.

Os cinco `color-mix(foreground 70%)` que troquei por `ink-2` continuam trocados, mas o motivo
**não** era reprovação — é que `ink-2` é token explícito e não depende de qual superfície está
embaixo. A afirmação anterior era conservadora demais, e fica retificada aqui.
