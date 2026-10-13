---
name: motion-craft
description: Como decidir, escrever e revisar animação de UI no Almanaque dos Clubes — quando animar, qual curva, qual duração, qual física, qual driver (CSS vs WAAPI vs Motion vs GSAP). Use SEMPRE que a tarefa envolver interação, transição, hover, modal, drawer, toast, carrossel, stagger, contador, scroll-reveal, "deixar mais vivo", "animar", "transição", "motion" ou qualquer efeito de movimento; também ao revisar uma tela já animada.
---

# Motion craft (Almanaque dos Clubes)

> **Origem:** adaptado de [`emilkowalski/skills`](https://github.com/emilkowalski/skills) —
> `emil-design-eng` (MIT). Adaptações para este repo: `framer-motion` → **`motion/react`** (o
> pacote instalado é `motion@13`, não `framer-motion`), gates do `prefers-reduced-motion` já
> existentes em `globals.css`, e o driver escolhido entre **GSAP / Motion / CSS** conforme o que
> o projeto já tem. O texto de origem é a fonte; isto é a tradução operacional.

## O framework de decisão (responda nesta ordem)

### 1. Deve animar?

| Frequência de uso | Decisão |
|---|---|
| 100+/dia (atalho de teclado, abrir/fechar busca, toggle de tema) | **Nunca anime.** |
| Dezenas/dia (hover, navegação de lista) | Remova ou reduza drasticamente |
| Ocasional (modal, drawer, toast) | Animação padrão |
| Raro/primeira vez (onboarding, celebração, 1ª visita) | Pode ter deleite |

**Ação iniciada por teclado não anima.** No Almanaque isso vale para: `Cmd/Ctrl+K` da busca
global, navegação por seta no carrossel de campeões (`ChampionsCarousel`), troca de locale e
qualquer atalho. Animação ali faz o app parecer lento porque a ação se repete centenas de vezes.

### 2. Qual o propósito?

Válidos: consistência espacial (entra e sai do mesmo lado), indicação de estado, explicação
(mostrar como um recurso funciona), feedback (botão cede ao ser pressionado), evitar mudança
brusca. **"É bonito"** num elemento de alta frequência **não é propósito** e é bloqueio de PR.

### 3. Qual curva?

```
entrando ou saindo?      -> ease-out
movendo/morphando?       -> ease-in-out
hover ou mudança de cor? -> ease
movimento constante?     -> linear (marquee, barra de progresso)
padrão                   -> ease-out
```

**`ease-in` em UI é bloqueio** — ele atrasa exatamente o instante em que o usuário está olhando.
Os easings nativos do CSS são fracos; use curvas fortes:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

### A mesma curva em cada motor (medido, não aproximado)

`cubic-bezier()` é sintaxe de **CSS**. Cada motor tem a sua — e passar a string de CSS para o
GSAP **falha em silêncio** (`gsap.parseEase('cubic-bezier(…)')` devolve `undefined` e ele cai no
padrão `power1.out`, que é fraco). Medido neste repo com `gsap@3.15.0`:

| Motor | Como escrever a curva forte de entrada |
|---|---|
| CSS / WAAPI | `cubic-bezier(0.23, 1, 0.32, 1)` |
| **GSAP** | `ease: 'power4.out'` — progresso em .25/.50/.75 = **0,763 / 0,969 / 0,999** contra 0,775 / 0,966 / 0,997 da curva CSS (é a mais próxima; `power3.out` fica em 0,684/0,938/0,996, visivelmente mais fraca) |
| **Motion** | array de Bézier: `ease: [0.23, 1, 0.32, 1]` |

Nunca copie a string de CSS para o GSAP nem o nome `power4.out` para o CSS.

### 4. Quanto tempo?

| Elemento | Duração |
|---|---|
| Feedback de pressão de botão | 100–160 ms |
| Tooltip, popover pequeno | 125–200 ms |
| Dropdown, select | 150–250 ms |
| Modal, drawer | 200–500 ms |
| Marketing/explicativo | pode ser maior |
| **Qualquer UI** | **< 300 ms** |

Espinner mais rápido faz o carregamento *parecer* mais rápido com o mesmo tempo real — vale para
os skeletons do `ChampionsCarousel` e do dashboard.

## Física e origem

- **Nunca `scale(0)`.** Comece em `scale(0.9–0.97)` + `opacity: 0` — nada no mundo real aparece
  do nada.
- **Popover/dropdown/tooltip nascem do gatilho**, não do centro:
  `transform-origin: var(--transform-origin)`. **Modal é exceção** — fica centrado.
- **Pressão de botão:** `transform: scale(0.97)` no `:active`, `transition: transform 160ms
  ease-out`. Vale para qualquer elemento pressionável (os CTAs da hero inclusive).

## Driver: qual biblioteca usar aqui

O projeto tem **três** motores instalados. Escolha por natureza do movimento, não por hábito:

| Situação | Use | Por quê |
|---|---|---|
| Hover, fade, pressão, entrada simples, qualquer coisa que roda enquanto a página carrega | **CSS transition** (+ `@starting-style`) | roda fora da main thread; não piora sob carga |
| Movimento programático com controle de JS mas performance de CSS (reveal, clip-path) | **WAAPI** (`element.animate()`) | acelerado e interrompível, sem dependência |
| Springs, gesto interrompível, animação de entrada/saída de componente desmontado, valor de arrasto | **`motion/react`** (`motion@13`) | só ele tem física real e `AnimatePresence` |
| Timeline sequenciada, `scrollTrigger`, morph de SVG, contador com snap | **GSAP** (já usado em `useGsap.ts`) | timeline madura; hoje é o motor dos reveals da home |

**Regras de convivência (para não virar dois sistemas):**
1. Reveal de scroll da home continua em **GSAP** (`apps/web/src/hooks/useGsap.ts`). Não migre
   por gosto.
2. Componente novo que precise de spring/gesto/exit usa **`motion/react`** — importe de
   `motion/react`, **nunca** de `framer-motion` (não está instalado e não deve entrar).
3. Não use as duas coisas no mesmo elemento. Um dono por animação.
4. `animejs` está instalado e **não é usado em nenhum lugar**: trate como dívida. Não introduza
   um quarto motor; se for usar, justifique no PR.

## Performance (o que faz a animação cair para 30fps)

- **Só `transform` e `opacity`** por padrão. `width/height/padding/margin/top/left` disparam
  layout; `box-shadow` e `border-radius` repintam a cada frame (troque por
  `filter: drop-shadow()`).
- **Não dirija `transform` de filho por variável CSS no pai** — recalcula estilo de toda a
  descendência a cada frame. Escreva `transform` direto no elemento.
- **Não anime através de state do React** (`setState` por frame = um re-render a cada 16,7 ms).
  Escreva em `ref.current.style` ou use motion value.
- **Shorthand do Motion não é acelerado:** `animate={{ x: 100 }}` roda na main thread. Sob carga
  use a string completa: `animate={{ transform: 'translateX(100px)' }}`.
- **`will-change` é o último passo**, não o primeiro: só depois de ver o shift de 1 px ou frames
  perdidos medidos. E no elemento que anima, nunca em `*` nem em container grande.
- **Blur animado < 20px** (2–5px já resolve crossfade; acima disso pesa, principalmente no Safari).

## Acessibilidade (o repo já tem a base)

`globals.css` já zera `animation-duration`/`transition-duration` sob
`prefers-reduced-motion: reduce`. Isso **não** cobre GSAP nem WAAPI, que animam por JS:

```js
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce) { gsap.set(targets, { opacity: 1, y: 0 }); return; }   // pula o movimento
```

Movimento reduzido significa **menos e mais gentil**, não zero: mantenha opacidade e cor, remova
deslocamento e posição. E gate todo hover que move algo:

```css
@media (hover: hover) and (pointer: fine) { .card:hover { transform: translateY(-2px); } }
```

Sem esse gate, o toque dispara hover falso em tablet/celular.

## Interrupção e assimetria

- **Transition, não keyframe**, em tudo que dispara rápido (toast, toggle, itens de lista):
  transition retargeta do estado atual, keyframe reinicia do zero.
- **Entrada e saída assimétricas:** lento onde o usuário decide, rápido onde o sistema responde
  (segurar para apagar: 2 s linear na pressão; soltar: 200 ms ease-out).
- **Stagger de 30–80 ms** entre itens de um grupo. Maior que isso parece lento; e stagger é
  enfeite — nunca bloqueie a interação enquanto ele roda.

## Checklist de review (tabela obrigatória)

Ao revisar, entregue **uma tabela** `| Antes | Depois | Por quê |` — nunca "Antes:" / "Depois:"
em linhas separadas.

| Antes | Depois | Por quê |
|---|---|---|
| `transition: all 300ms` | `transition: transform 200ms ease-out` | `all` anima o que ninguém pediu, fora da GPU |
| `transform: scale(0)` | `scale(0.95); opacity: 0` | nada aparece do nada |
| `ease-in` em dropdown | `ease-out` + curva forte | `ease-in` atrasa o momento mais observado |
| `transform-origin: center` em popover | `var(--transform-origin)` | popover nasce do gatilho (modal é exceção) |
| animação em atalho de teclado | remover | ação de 100+/dia não anima |
| duração > 300 ms em UI | 150–250 ms | UI < 300 ms |
| hover que move sem media query | `@media (hover: hover) and (pointer: fine)` | toque dispara hover falso |
| keyframe em elemento que dispara rápido | transition | interrompível |
| `x`/`y` do Motion sob carga | `transform: "translateX(…)"` | shorthand não é acelerado |
| entrada e saída na mesma velocidade | saída mais rápida | assimetria: decidir é lento, responder é rápido |
| tudo aparece de uma vez | stagger 30–80 ms | cascata parece natural |

Para o veredito formal use o subagente `motion-critic` (skill `design-subagents`) ou rode
`node plugins/almanaque-design/tools/audit-motion.mjs`, que aplica estas regras por varredura.
