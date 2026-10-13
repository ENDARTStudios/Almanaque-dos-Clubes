---
name: motion-review
description: Revisão formal de animação e movimento contra a régua de craft do Almanaque dos Clubes — dez padrões não negociáveis, gatilhos de escalação e veredito APROVADO/BLOQUEADO. Use ao fechar qualquer PR que toque interação, transição, hover, modal, drawer, toast, carrossel ou scroll-reveal; ou quando a tarefa pedir "revisar a animação", "está travando", "está esquisito", "checar o movimento".
---

# Revisão de movimento (Almanaque dos Clubes)

> **Origem:** adaptado de [`emilkowalski/skills`](https://github.com/emilkowalski/skills) —
> `review-animations` + `STANDARDS.md` (MIT). A valoração de excelência vem da filosofia de
> design engineering do autor; o **método** (padrões não negociáveis, escalação, hierarquia de
> remédio, veredito) foi adaptado para este repo. Antes de revisar, a régua completa está na
> skill `motion-craft`.

## Postura

Você é o revisor de movimento com olho brutal. Seu viés é **flaguear**, não absolver. Uma
transição que "funciona" mas chega lenta, nasce da origem errada, dispara demais ou perde
frames é **regressão**, não aprovação. Aprovar é conquistado.

Primeiro rode o portão objetivo; ele tira o trivial do caminho:

```powershell
node plugins/almanaque-design/tools/audit-motion.mjs
```

O que a varredura **não** pega — e é justamente onde entra o olho: se a animação devia existir,
se a curva escolhida combina com a personalidade do componente, se a origem física está certa,
se há stagger onde deveria haver, se o crossfade precisa de blur.

## Os dez padrões não negociáveis

1. **Movimento justificado** — cada animação responde "por que isto anima?" (consistência
   espacial, indicação de estado, feedback, explicação, evitar corte brusco). "É bonito" num
   elemento de alta frequência é bloqueio.
2. **Frequência adequada** — 100+/dia (atalho, `⌘K`, toggle de tema, navegação por seta no
   carrossel) **não anima**; dezenas/dia reduz; ocasional padrão; raro pode ter deleite.
3. **Curva responsiva** — entrada/saída com `ease-out` ou curva forte. `ease-in` em UI é
   bloqueio. Easing nativo do CSS é fraco; espere `cubic-bezier`.
4. **UI abaixo de 300 ms** — feedback de pressão 100–160 ms; tooltip 125–200 ms; dropdown
   150–250 ms; modal/drawer 200–500 ms. Acima disso, exija motivo escrito.
5. **Origem e física** — popover/dropdown/tooltip nascem do gatilho
   (`transform-origin: var(--transform-origin)`); modal é exceção (centrado). **Nunca
   `scale(0)`** — comece em `scale(0.9–0.97)` + `opacity: 0`.
6. **Interrompibilidade** — o que dispara rápido (toast, toggle, drag) usa transition ou
   spring que retargeta do estado atual, não keyframe que reinicia do zero.
7. **Só propriedades de GPU** — `transform` e `opacity`. Animar `width/height/margin/padding/
   top/left` (ou os shorthands `x`/`y`/`scale` do Motion sob carga) é achado de performance.
8. **Acessibilidade** — `prefers-reduced-motion` honrado **também no JS** (a regra de CSS não
   alcança GSAP/WAAPI); hover que move gated por `@media (hover: hover) and (pointer: fine)`.
9. **Entrada/saída assimétricas** — lento onde o usuário decide, rápido onde o sistema
   responde. Tempo simétrico em press-and-release é achado.
10. **Coesão** — o movimento combina com a personalidade do componente e do produto. Dashboard
    de acervo é crisp e rápido; não é playground. Na dúvida se o movimento "está certo", a
    jogada mais forte costuma ser **deletar**.

## Gatilhos de escalação (flagueie ao ver)

- `transition: all` / `transition-all`
- `scale(0)`, ou entrada de fade puro sem transform inicial
- `ease-in` em qualquer interação; easing nativo fraco em animação deliberada
- animação em atalho de teclado, `⌘K`, ou ação de 100+/dia
- duração de UI > 300 ms sem motivo
- `transform-origin: center` em popover/dropdown/tooltip ancorado
- keyframe em toast, toggle ou qualquer coisa adicionada rapidamente
- animar propriedade de layout
- shorthand `x`/`y`/`scale` do Motion em movimento que roda com a página ocupada
- variável CSS no pai dirigindo transform do filho (tempestade de recálculo)
- `prefers-reduced-motion` ausente no movimento feito por JS
- `:hover` que move sem gate de ponteiro
- entrada/saída na mesma velocidade
- tudo aparecendo de uma vez onde caberia stagger de 30–80 ms

## Hierarquia de remédio (prefira o de cima)

1. **Apagar** a animação (alta frequência, sem propósito, disparada por teclado).
2. **Reduzir** — menos duração, transform menor, menos propriedades.
3. **Corrigir a curva** — `ease-in` → `ease-out`/curva forte.
4. **Corrigir origem/física** — `transform-origin`; `scale(0)` → `scale(0.95)` + opacidade.
5. **Tornar interrompível** — keyframe → transition, ou spring para gesto.
6. **Mover para a GPU** — propriedade de layout → `transform`/`opacity`; shorthand → string
   completa de `transform`; WAAPI para animação programática.
7. **Assimetria** — lento na fase deliberada, snap na resposta.
8. **Polir** — blur para mascarar crossfade, stagger para grupo, `@starting-style` na entrada.
9. **Acessibilidade e coesão** — reduced-motion + gate de hover; ajustar à personalidade.

## Saída obrigatória (duas partes, nesta ordem)

**Parte 1 — tabela de achados.** Uma única tabela markdown, uma linha por defeito. Nunca
"Antes:" / "Depois:" em linhas separadas.

| Antes | Depois | Por quê |
| --- | --- | --- |
| `transition: all 300ms` | `transition: transform 200ms ease-out` | `all` anima propriedade não intencionada, fora da GPU |
| `transform: scale(0)` | `scale(0.95); opacity: 0` | nada aparece do nada |
| … | … | … |

**Parte 2 — veredito**, agrupado por impacto, do maior para o menor, omitindo grupo vazio:

1. Regressões que quebram a sensação (curva arrastada, vem-do-nada, dispara em alta frequência)
2. Simplificações perdidas (animação que devia sair ou encolher)
3. Performance (propriedade fora da GPU, risco de frame perdido, recálculo em cascata)
4. Interrupção e tempo (keyframe onde cabe transition; simetria que devia ser assimétrica)
5. Origem, física e coesão
6. Acessibilidade (reduced-motion, gate de hover)

Feche com a decisão explícita:

- **BLOQUEADO** — qualquer regressão de sensação, animação em ação de teclado/alta frequência,
  `scale(0)`/`ease-in` em UI, ou animação fora da GPU com correção barata.
- **APROVADO** — sem regressão de sensação, sem movimento que devesse ser apagado, duração e
  curva dentro da régua, interrupção tratada onde precisa, reduced-motion respeitado.

Cite `file:linha`. Quando precisar de um valor (curva, duração, spring), puxe da skill
`motion-craft` em vez de aproximar. Se a sensação não puder ser julgada sem movimento real,
diga **NÃO VERIFICADO — precisa de captura em câmera lenta / dispositivo real**.
