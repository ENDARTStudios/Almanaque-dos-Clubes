# Camada de interação — o que os 11 sites ensinaram

> Este documento é o que muda no conceito depois de estudar as 11 referências. O conceito é de
> **design**, não de código: aqui se desenham **estados**, e o movimento fica escrito como
> contrato. Nenhuma regra de "imagem real por página" foi aplicada — ela vale na interface,
> como você disse.

---

## 1. O que cada site entregou

| Site | O que é | O que aproveitei |
|---|---|---|
| **21st.dev** | 12.000 componentes; maior acervo | **Wireframe Dotted Globe** (o herói), **Spotlight Card**, **Limelight Nav**, CardStack |
| **Aceternity UI** | 200+ componentes React + Motion | **3D Card Effect**, **Bento Grid**, **3D Marquee**, Text Flipping Board |
| **Kokonut UI** | 102 componentes "que parecem certos" | **Apple Activity Card** (anel), Detent Dial, Slide to Confirm |
| **Bklit UI** | **211 gráficos** desenhados, visualização de dados | anel, centelha, barra empilhada — a régua de gráfico para um acervo de números |
| **React Bits** | componentes animados + micro-interações | a camada de feedback: o que o dedo sente no toque |
| **Motion** | layout animation, gesto, scroll, mola, saída | o motor: `layoutId` para a luz da nav, `useSpring` para a inclinação |
| **GSAP** | ScrollTrigger, timelines | o que anima com a rolagem (o globo, a entrada de seção) |
| **Anime.js** | animação curta e leve | micro-estado: o pulso do número, o underline |
| **UI UX Pro Max** | 57 estilos, 24 tipos de gráfico, 29 padrões | checklist de qualidade: ícone SVG, feedback de hover, contraste no escuro |
| **Refero** | galeria de referência | linguagem e composição, não componente |
| **Componentry** | componentes de base | o estado de repouso, que é o que o FigCraft desenha |

**A descoberta que mais mudou:** o 21st.dev tem um **"Wireframe Dotted Globe"** — eu havia
desenhado o mesmo conceito à mão, com meridianos. A diferença é que o deles usa **campo de
pontos** com densidade por profundidade, que lê como esfera girando de forma muito mais
convincente do que linhas. Adotei os pontos.

---

## 2. O que foi construído

### 2.1 `globo-animado.svg` — o único artefato que o FigCraft não faz

**45 KB de SVG com animação real**, gerado por `globo_animado.py`:

- meridianos com semi-eixo `r·cos λ`, paralelos e **campo de pontos** projetados;
- pentágonos da bola na superfície, com escala e opacidade por profundidade;
- rotação em **SMIL/CSS**: dois grupos girando em velocidades e sentidos opostos (28s e 52s);
- `prefers-reduced-motion` desliga a rotação e **mantém o desenho**.

**Verificação honesta:** rasterizei o quadro 0 pelo FigCraft (`convert`) e conferi a composição
— está em `globo-animado.png`. A **animação em si roda no navegador**; eu não a vi rodar dentro
do FigCraft e não afirmo que vi.

### 2.2 Página `08 · Interação` no FigCraft — 250 camadas

Sete padrões, cada um desenhado nos seus **estados** (é assim que um conceito mostra interação
sem rodar animação):

| Padrão | Origem | Estados desenhados |
|---|---|---|
| **Limelight Nav** | 21st.dev | repouso · foco · hover, com a luz sob o item ativo |
| **Spotlight Card** | 21st.dev | repouso · luz no canto · luz no centro |
| **Bento Grid** | Aceternity | células de 640/320/320×96 — o tamanho é o argumento |
| **3D Card Effect** | Aceternity | repouso · 6° · 12° (perspectiva em vetor) |
| **Marquee** | Aceternity / React Bits | faixa escura com campeões, separador em ocre |
| **Anel de progresso** | Kokonut UI | três anéis: clubes 72%, jogadores 48%, partidas 31% |
| **Centelha + barra empilhada** | Bklit | tendência de partidas e distribuição por alcance |

### 2.3 Contrato de movimento — a tabela que governa tudo

Na mesma página, em tabela. A regra é a do **Emil Kowalski: frequência decide**.

| Elemento | Frequência | Anima? | Duração | Curva | Alternativa |
|---|---|---|---|---|---|
| Atalho, paleta de comando | 100+/dia | **nunca** | — | — | estado instantâneo |
| Hover em item de lista | dezenas/dia | mínimo | 80ms | ease-out | só cor de fundo |
| Botão pressionado | dezenas/dia | sim | 120ms | ease-out | `scale(0.97)` |
| Dropdown, select | ocasional | sim | 180ms | ease-out | origem no gatilho |
| Modal, gaveta | ocasional | sim | 320ms | ease-drawer | foco preso |
| Toast | ocasional | sim | 240ms | ease | empilha sem reanimar |
| Herói (1ª visita) | raro | deleite | 900ms | ease-in-out | CSS puro, sem JS |

---

## 3. Como cada conceito se aplica ao produto

Não é decoração: cada padrão resolve um problema do acervo.

| Problema do almanaque | Padrão aplicado |
|---|---|
| A primeira dobra precisa dizer "isto é o mundo do futebol" sem foto | **globo pontilhado animado** |
| 17 telas, 8 seções: onde estou? | **limelight nav** na barra superior |
| Destaques de competição pareciam iguais | **spotlight card** — a luz dá foco sem mudar o tamanho |
| Home com 6 cartões idênticos (violação do Taste Skill) | **bento grid** — tamanhos diferentes carregam hierarquia |
| Perfil de clube e de jogador precisam de ficha tocável | **3D card effect** com inclinação de 6° |
| Faixa de campeões que não cabe em uma linha | **marquee**, que pausa no hover e no foco |
| Cobertura do acervo é parcial (23% com estado) | **anel de progresso** — a lacuna vira informação |
| Tendência de partidas por temporada | **centelha** (Bklit) |
| Distribuição por alcance | **barra empilhada** com legenda |

---

## 4. O que NÃO foi feito, e por quê

- **Nenhuma imagem real.** Você disse que isto é conceito de design, não a interface. A regra
  do Taste Skill (≥4 imagens reais) vale na implementação — está registrada como pendência para
  quando houver código.
- **Nenhuma animação rodando dentro do FigCraft.** O FigCraft não anima por script; a única
  animação real do pacote é o SVG do globo, e ela roda no navegador.
- **VectorCraft não foi usado.** Testei: é um editor vetorial estático (tipo Illustrator, com
  templates `.ait`) e exporta SVG. Para animação ele não acrescenta nada que o gerador em Python
  já não faça, e para desenho estático o FigCraft com 629 comandos é mais direto. **Não usei uma
  ferramenta só para poder dizer que usei.**
- **`draw.mjs` e `inspect.mjs` do Taste Skill não rodaram.** Exigem uma página HTML servida; o
  entregável é `.figcraft`.

---

## 5. Estado

| | |
|---|---|
| Páginas no FigCraft | **9** |
| Frames | **18** |
| Camadas | **~2.850** |
| Capturas | **25** em `design/concept/app/` |
| Artefato animado | `globo-animado.svg` (45 KB) + `.png` de verificação |

A nova página é a **08 · Interação**. As outras oito seguem como estavam — esta rodada
acrescentou a camada que faltava, não refez o sistema.
