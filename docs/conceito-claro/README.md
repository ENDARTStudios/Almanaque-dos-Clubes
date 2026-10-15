# Conceito visual — versão CLARA

> Prancha de conceito, gerada com o **FigCraft** a partir de um script versionado. **Isto é
> desenho, não código em produção.** Nada do site foi alterado para produzir estas imagens.

| Arquivo | O que mostra |
|---|---|
| [01---home.png](01---home.png) | A dobra em fundo claro: hierarquia, prova com fonte, faixa de números, prateleiras |
| [02---tabela.png](02---tabela.png) | Tabela densa: numeral tabular, pódio, procedência no rodapé |
| [03---busca.png](03---busca.png) | A busca como paleta de comando, com o acervo a uma tecla |
| [04---sistema.png](04---sistema.png) | A paleta com o contraste medido, tipografia e movimento |
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
- **O bronze `#7a5e2e` tem 5,28:1 sobre a faixa `#f2efea`**, que é o seu pior caso na prancha.
  Passa, mas com menos margem que o resto — se ele for usado sobre uma superfície mais escura
  que a faixa, precisa nova medição.
- **A dessaturação foi feita por matiz e saturação em HSL**, não em OKLCH. Ficou coerente a
  olho e mede bem, mas um ajuste perceptual fino (luminosidade constante entre as três cores)
  pediria OKLCH e não foi feito.
